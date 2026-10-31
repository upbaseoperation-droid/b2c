'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  ExternalLink,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Layers,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShoppingBag,
  Sparkles,
  Trash2,
  Unlock,
  Video,
} from 'lucide-react';
import type {
  BookingDealItem,
  DealContractAppendixStatus,
  DealRightsTermItem,
  InputPlanBreakdownState,
  KocItem,
  StorePortfolioItem,
  UserProfile,
  UserRole,
} from '../../lib/types';
import { INITIAL_MONTHLY_PLANS } from '../../lib/monthlyPlanData';
import { filterScopedStores } from '../../lib/rbacScope';
import {
  formatDate,
  formatNumber,
  formatVnd,
  formatVndShort,
  getVietnamDateYmd,
  maskSensitivePii,
  parseThousandNumberInput,
} from '../../lib/format';
import {
  APPROVED_BOOKING_LIST_UPDATED_EVENT,
  DATA_LOCKED_APPROVED_FIELDS,
  LOAI_TAI_KHOAN_THANH_TOAN_OPTIONS,
  autoMapVideoAcceptanceByKocChannel,
  buildBookingDealFromApprovedItem,
  buildDefaultAddonServicesForDeal,
  computeAirSlaStatus,
  computeDealSowJobSubtotal,
  computeLivestreamDurationEvaluation,
  computeWeekLabelFromDate,
  downloadApprovedBookingListCsv,
  ensureDealJobsForApprovedItem,
  evaluateVideoEffectivenessLabel,
  extractTikTokChannelAndVideoFromInput,
  formatApprovedBookingListToTsv,
  formatLivestreamConfirmationSheet,
  generateBookingOrderCode,
  generateDealAppendixCode,
  generateMasterContractCode,
  isApprovedDealDataLocked,
  isLivestreamBookingItem,
  isValidLivestreamProofUrl,
  loadApprovedBookingList,
  recalculateApprovedBookingItem,
  saveApprovedBookingList,
  syncApprovedItemsBackToStaffBrandSheets,
  transferBrandApprovedRowsToBookingList,
  type ApprovedBookingListItem,
  type ApprovedBookingPaymentStatus,
  type DealSowJobItem,
  type VideoAcceptanceMappingInput,
} from '../../lib/approvedBookingList';
import {
  loadStaffSheetCollection,
  normalizeTikTokId,
} from '../../lib/staffBrandListingSheet';
import { resolveBrandBookingSheetUrl } from '../../lib/bookingList';
import {
  BOOKING_REPORT_COLUMNS,
  buildReportSheetRowFromApprovedItem,
} from '../../lib/bookingReportSheet';
import type { TikTokVideoInspectionResult } from '../../lib/tiktokVideoInspector';
import type { ContractRecord } from '../../lib/contracts/types';
import { extractSowPaymentScheduleAndAdvance } from '../../lib/contracts/contractRules';
import { documentOfTemplate } from '../../lib/planDealLink';
import { contractApi, getCachedContractBootstrap, type ContractBootstrap } from '../contracts/api';
import { TikTokVideoInspectorModal } from '../koc/TikTokVideoInspectorModal';
import { LarkPaymentRequestModal } from '../booking/LarkPaymentRequestModal';
import { DealDetailDrawer } from '../booking/DealDetailDrawer';
import { DraftBbntPreviewModal } from '../contracts/DraftBbntPreviewModal';
import { KocQuickViewModal } from '../shortlist/KocQuickViewModal';
import {
  MONTH_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  computeApprovedBookingBudgetSummary,
  mergeContractsIntoApprovedBookingItems,
  type ParsedAcceptanceDraftRow,
  type SheetSyncComparisonReportState,
  type SheetSyncDiffRow,
} from '../booking/ApprovedBookingHelpers';
import { ApprovedBookingModals } from '../booking/ApprovedBookingModals';
import { ApprovedBookingLarkGrid } from '../booking/ApprovedBookingLarkGrid';
import { resolveStoreBookingLeader, type LarkPaymentRequestSlip } from '../../lib/larkPaymentRequestEngine';
import {
  ActionMenu,
  Button,
  Chips,
  DataTable,
  EmptyState,
  Field,
  FilterBar,
  Input,
  Modal,
  PageActions,
  Pagination,
  Panel,
  Person,
  Segmented,
  Select,
  Status,
  Textarea,
  type Column,
} from '../ui';

export interface ApprovedBookingListViewProps {
  kocs: KocItem[];
  stores: StorePortfolioItem[];
  deals: BookingDealItem[];
  monthlyPlans?: InputPlanBreakdownState[];
  currentUser?: UserProfile | null;
  currentRole?: UserRole;
  currentUserName: string;
  canViewFullPii?: boolean;
  bookingScope?: 'ALL' | 'TIKTOK_VIDEO' | 'LIVESTREAM';
  initialStoreName?: string;
  initialMonthKey?: string;
  focusDeal?: { code: string; nonce: number } | null;
  onCreateOrUpdateDeals?: (newOrUpdatedDeals: BookingDealItem[]) => void;
  onOpenContractForDeal?: (deal: BookingDealItem, document?: 'HDNT' | 'SOW' | 'BBNT') => void;
  onNavigateTab?: (tab: 'koc-listing' | 'booking', context?: { storeName?: string; monthKey?: string }) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const ApprovedBookingListView: React.FC<ApprovedBookingListViewProps> = ({
  kocs,
  stores,
  deals,
  monthlyPlans: rawMonthlyPlans = INITIAL_MONTHLY_PLANS,
  currentUser,
  currentRole,
  currentUserName,
  canViewFullPii = false,
  bookingScope = 'ALL',
  initialStoreName,
  initialMonthKey,
  focusDeal,
  onCreateOrUpdateDeals,
  onOpenContractForDeal,
  onNavigateTab,
  onNotify,
}) => {
  const isReadOnlyPartnerRole =
    currentRole === 'BRAND_PARTNER' || currentRole === 'BRAND_MEMBER';

  const b2cStores = useMemo(() => {
    const base = stores.filter((s) => s.isB2cManaged !== false && s.storeName);
    if (currentUser) {
      const scoped = filterScopedStores(base, currentUser);
      if (
        scoped.length > 0 ||
        (currentRole &&
          currentRole !== 'ADMIN' &&
          currentRole !== 'MANAGER' &&
          currentRole !== 'FINANCE' &&
          currentRole !== 'LEGAL')
      ) {
        return scoped;
      }
    }
    return base;
  }, [stores, currentUser, currentRole]);
  const b2cStoreNameSet = useMemo(
    () => new Set(b2cStores.map((s) => s.storeName)),
    [b2cStores]
  );

  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonthKey || '2026/10');
  const [selectedStore, setSelectedStore] = useState<string>(initialStoreName || 'ALL');
  const [filterAssigneeScope, setFilterAssigneeScope] = useState<string>('ALL');
  const [filterPipeline, setFilterPipeline] = useState<string>('ALL');
  const [filterAcceptance, setFilterAcceptance] = useState<string>('ALL');
  const [stageChip, setStageChip] = useState<'ALL' | 'PENDING_DEAL' | 'PENDING_SOW' | 'PENDING_ACCEPTANCE' | 'PENDING_ADDONS' | 'ACCEPTED' | 'SETTLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewColumnMode, setViewColumnMode] = useState<'ALL_32' | 'BOOKING_FOCUS' | 'ACCEPTANCE_FOCUS'>('ALL_32');
  const [viewLayout, setViewLayout] = useState<'LIST_DRAWER' | 'LARK_GRID'>('LIST_DRAWER');
  const [selectedDrawerItemId, setSelectedDrawerItemId] = useState<string | null>(null);
  const [drawerInitialTab, setDrawerInitialTab] = useState<'OVERVIEW' | 'CONTRACT' | 'ACCEPTANCE'>('OVERVIEW');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [contractRecords, setContractRecords] = useState<ContractRecord[]>(
    () => getCachedContractBootstrap()?.records || []
  );

  const [rawItems, setItems] = useState<ApprovedBookingListItem[]>(() =>
    loadApprovedBookingList(kocs, stores, deals, currentUserName)
  );

  // Đồng bộ tự động khi deals hoặc kocs từ phân hệ khác (Hợp đồng, PlanDealBoard, Danh bạ KOC) thay đổi
  const prevSyncDepsRef = useRef<{ deals: BookingDealItem[]; kocs: KocItem[] }>({
    deals,
    kocs,
  });
  useEffect(() => {
    if (prevSyncDepsRef.current.deals !== deals || prevSyncDepsRef.current.kocs !== kocs) {
      prevSyncDepsRef.current = { deals, kocs };
      setItems(loadApprovedBookingList(kocs, stores, deals, currentUserName));
    }
  }, [deals, kocs, stores, currentUserName]);

  // Tải danh sách hồ sơ Hợp đồng / SOW / BBNT thực tế từ /api/contracts (có fallback an toàn)
  useEffect(() => {
    let cancelled = false;
    contractApi<ContractBootstrap>('/api/contracts')
      .then((res) => {
        if (!cancelled && Array.isArray(res?.records)) {
          setContractRecords(res.records);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [deals]);

  const mergeContractsIntoItems = React.useCallback(
    (sourceItems: ApprovedBookingListItem[], records: ContractRecord[]) =>
      mergeContractsIntoApprovedBookingItems(sourceItems, records),
    []
  );

  // RULE-SYNC-01 & RULE-PERF-01: Đồng bộ O(1) trạng thái ký HĐNT / Phụ lục SOW / BBNT & các đường link từ /api/contracts vào danh sách
  const allMergedItems = useMemo(
    () => mergeContractsIntoItems(rawItems, contractRecords).mergedItems,
    [rawItems, contractRecords, mergeContractsIntoItems]
  );

  const items = useMemo(() => {
    if (bookingScope === 'LIVESTREAM') {
      return allMergedItems.filter((it) => isLivestreamBookingItem(it));
    }
    if (bookingScope === 'TIKTOK_VIDEO') {
      return allMergedItems.filter((it) => !isLivestreamBookingItem(it));
    }
    return allMergedItems;
  }, [allMergedItems, bookingScope]);

  const [isPullingContractLinks, setIsPullingContractLinks] = useState(false);

  const handlePullContractInfoAndLinks = async () => {
    setIsPullingContractLinks(true);
    try {
      const res = await contractApi<ContractBootstrap>('/api/contracts');
      const latestRecords = Array.isArray(res?.records) ? res.records : contractRecords;
      setContractRecords(latestRecords);
      const { mergedItems, matchedDealsCount } = mergeContractsIntoItems(rawItems, latestRecords);
      const nowIso = new Date().toISOString();
      const stampedItems = mergedItems.map((it) => ({ ...it, contractSyncedAt: nowIso }));
      setItems(stampedItems);
      saveApprovedBookingList(stampedItems, true);
      if (onCreateOrUpdateDeals) {
        onCreateOrUpdateDeals(stampedItems.map((it) => buildBookingDealFromApprovedItem(it)));
      }
      onNotify?.(
        `Đã kéo thông tin HĐNT, Phụ lục SOW, BBNT & các đường link (Google Docs / Bản đã ký) cho ${matchedDealsCount} Deal từ contract-system.`,
        'success'
      );
    } catch (err) {
      onNotify?.((err as Error).message || 'Không thể kéo thông tin hợp đồng lúc này.', 'error');
    } finally {
      setIsPullingContractLinks(false);
    }
  };

  const [prevInitKey, setPrevInitKey] = useState(`${initialStoreName || ''}|${initialMonthKey || ''}`);
  const currentInitKey = `${initialStoreName || ''}|${initialMonthKey || ''}`;
  if (prevInitKey !== currentInitKey) {
    setPrevInitKey(currentInitKey);
    if (initialStoreName) setSelectedStore(initialStoreName);
    if (initialMonthKey) setSelectedMonth(initialMonthKey);
  }

  useEffect(() => {
    const refresh = () => {
      setItems(loadApprovedBookingList(kocs, stores, deals, currentUserName));
    };
    window.addEventListener(APPROVED_BOOKING_LIST_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(APPROVED_BOOKING_LIST_UPDATED_EVENT, refresh);
  }, [kocs, stores, deals, currentUserName]);

  const updateItemsAndSync = (
    updater: (prev: ApprovedBookingListItem[]) => ApprovedBookingListItem[],
    changedItemsForSheetSync?: ApprovedBookingListItem[]
  ) => {
    const next = updater(items);
    setItems(next);
    saveApprovedBookingList(next, false);
    if (changedItemsForSheetSync && changedItemsForSheetSync.length > 0) {
      syncApprovedItemsBackToStaffBrandSheets(
        changedItemsForSheetSync,
        kocs,
        stores,
        deals
      );
    }
  };

  // Lọc danh sách hiển thị
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [quickViewApprovedItem, setQuickViewApprovedItem] = useState<ApprovedBookingListItem | null>(null);
  const sheetSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeDrawerItem = useMemo(() => {
    if (!selectedDrawerItemId) return null;
    return items.find((i) => i.id === selectedDrawerItemId) || null;
  }, [items, selectedDrawerItemId]);

  const openDrawerForItem = (
    item: ApprovedBookingListItem,
    initialTab: 'OVERVIEW' | 'CONTRACT' | 'ACCEPTANCE' = 'OVERVIEW'
  ) => {
    setSelectedDrawerItemId(item.id);
    setDrawerInitialTab(initialTab);
    setIsDrawerOpen(true);
  };

  const handledFocusNonceRef = useRef<number | null>(null);
  useEffect(() => {
    const code = (focusDeal?.code || '').trim().toUpperCase();
    if (!code || !focusDeal || handledFocusNonceRef.current === focusDeal.nonce) return;
    const matched = items.find((it) => it.maBooking.trim().toUpperCase() === code);
    if (matched) {
      handledFocusNonceRef.current = focusDeal.nonce;
      queueMicrotask(() => {
        if (matched.storeName) setSelectedStore(matched.storeName);
        if (matched.thangPlan) setSelectedMonth(matched.thangPlan);
        setSearchQuery(matched.maBooking);
        setSelectedDrawerItemId(matched.id);
        setDrawerInitialTab('ACCEPTANCE');
        setIsDrawerOpen(true);
      });
    }
  }, [focusDeal, items]);

  useEffect(() => {
    const handleNavigateEvent = (evt: Event) => {
      const detail = (evt as CustomEvent).detail as
        | { tab?: string; storeName?: string; monthKey?: string; dealCode?: string }
        | undefined;
      if (!detail) return;
      const isMatchingScope =
        (bookingScope === 'LIVESTREAM' && detail.tab === 'livestream-booking') ||
        (bookingScope !== 'LIVESTREAM' &&
          (detail.tab === 'approved-booking-list' || detail.tab === 'koc-listing'));
      if (!isMatchingScope) return;
      if (detail.storeName) setSelectedStore(detail.storeName);
      if (detail.monthKey) setSelectedMonth(detail.monthKey);
      if (detail.dealCode) {
        const cleanCode = detail.dealCode.trim().toUpperCase();
        setSearchQuery(detail.dealCode.trim());
        const matched = items.find((it) => it.maBooking.trim().toUpperCase() === cleanCode);
        if (matched) {
          handledFocusNonceRef.current = Date.now();
          setSelectedDrawerItemId(matched.id);
          setDrawerInitialTab('ACCEPTANCE');
          setIsDrawerOpen(true);
        }
      }
    };
    window.addEventListener('upbase-navigate-tab', handleNavigateEvent);
    return () => window.removeEventListener('upbase-navigate-tab', handleNavigateEvent);
  }, [bookingScope, items]);

  const { monthTotalItemCount, storeItemCountsForMonth, sortedB2cStoresForMonth } = useMemo(() => {
    const counts = new Map<string, number>();
    let total = 0;
    for (const it of items) {
      if (b2cStoreNameSet.size > 0 && !b2cStoreNameSet.has(it.storeName)) continue;
      if (selectedMonth === 'ALL' || it.thangPlan === selectedMonth) {
        total += 1;
        counts.set(it.storeName, (counts.get(it.storeName) || 0) + 1);
      }
    }
    const sorted = [...b2cStores].sort((a, b) => {
      const ca = counts.get(a.storeName) || 0;
      const cb = counts.get(b.storeName) || 0;
      if (ca > 0 && cb === 0) return -1;
      if (ca === 0 && cb > 0) return 1;
      if (ca !== cb) return cb - ca;
      return (a.brandName || a.storeName).localeCompare(b.brandName || b.storeName, 'vi');
    });
    return {
      monthTotalItemCount: total,
      storeItemCountsForMonth: counts,
      sortedB2cStoresForMonth: sorted,
    };
  }, [items, selectedMonth, b2cStores, b2cStoreNameSet]);

  const availablePicNames = useMemo(() => {
    const picSet = new Set<string>();
    for (const it of items) {
      if (b2cStoreNameSet.size > 0 && !b2cStoreNameSet.has(it.storeName)) continue;
      if (selectedMonth !== 'ALL' && it.thangPlan !== selectedMonth) continue;
      const pic = (it.nguoiPhuTrach || '').trim();
      if (pic && pic !== '—') picSet.add(pic);
    }
    return Array.from(picSet).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [items, b2cStoreNameSet, selectedMonth]);

  // Danh sách sau khi lọc theo Tháng + Gian hàng + Nhóm phụ trách + Từ khóa (dùng để tính số lượng trên Chips)
  const scopedItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((it) => {
      if (b2cStoreNameSet.size > 0 && !b2cStoreNameSet.has(it.storeName)) return false;
      if (selectedMonth !== 'ALL' && it.thangPlan !== selectedMonth) return false;
      if (selectedStore !== 'ALL' && it.storeName !== selectedStore) return false;
      if (filterAssigneeScope !== 'ALL' && it.id !== editingRowId) {
        const hasNgocTamLeader = Boolean(resolveStoreBookingLeader(it.storeName || it.brandName));
        if (filterAssigneeScope === 'LEADER_NGOC_TAM' && !hasNgocTamLeader) return false;
        if (filterAssigneeScope === 'DIRECT_YEN_NHI' && hasNgocTamLeader) return false;
        if (filterAssigneeScope.startsWith('PIC:')) {
          const targetPic = filterAssigneeScope.slice(4);
          if ((it.nguoiPhuTrach || '').trim() !== targetPic) return false;
        }
      }
      if (it.id !== editingRowId) {
        if (filterPipeline !== 'ALL' && it.pipelineStatus !== filterPipeline) return false;
        if (filterAcceptance !== 'ALL' && it.acceptanceStatus !== filterAcceptance) return false;
      }
      if (q && it.id !== editingRowId) {
        const hit =
          it.idKenh.toLowerCase().includes(q) ||
          it.tenKenh.toLowerCase().includes(q) ||
          it.maBooking.toLowerCase().includes(q) ||
          (it.contractAppendixCode || '').toLowerCase().includes(q) ||
          it.storeName.toLowerCase().includes(q) ||
          it.brandName.toLowerCase().includes(q) ||
          it.sanPham.toLowerCase().includes(q) ||
          it.nguoiPhuTrach.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [items, b2cStoreNameSet, selectedMonth, selectedStore, filterAssigneeScope, filterPipeline, filterAcceptance, searchQuery, editingRowId]);

  const chipCounts = useMemo(() => {
    let pendingDeal = 0;
    let pendingSow = 0;
    let pendingAcceptance = 0;
    let pendingAddons = 0;
    let accepted = 0;
    let settled = 0;
    for (const it of scopedItems) {
      const hasBo = it.bookingOrderCreated && Boolean(it.maBooking);
      const isSowSigned = it.contractAppendixStatus === 'ĐÃ_KÝ';
      const isAccepted = it.acceptanceStatus === 'DA_NGHIEM_THU';
      const isSettled =
        it.trangThaiPhieuThanhToan === 'Đã lập ĐNTT' ||
        it.trangThaiPhieuThanhToan === 'Đã thanh toán';
      const isAwaitingAddons =
        isAccepted && it.sequentialAcceptanceStage === '2_DA_NGHIEM_THU_VIDEO_CHO_PHAN_KHAC';
      const isFullyAccepted =
        it.sequentialAcceptanceStage === '3_DA_NGHIEM_THU_TOAN_DEAL' ||
        (isAccepted && !it.sequentialAcceptanceStage);

      if (!hasBo) pendingDeal++;
      else if (!isSowSigned) pendingSow++;
      if (hasBo && !isAccepted) pendingAcceptance++;
      if (isAwaitingAddons) pendingAddons++;
      if (isFullyAccepted) accepted++;
      if (isSettled) settled++;
    }
    return {
      all: scopedItems.length,
      pendingDeal,
      pendingSow,
      pendingAcceptance,
      pendingAddons,
      accepted,
      settled,
    };
  }, [scopedItems]);

  const filteredItems = useMemo(() => {
    if (stageChip === 'ALL') return scopedItems;
    return scopedItems.filter((it) => {
      if (it.id === editingRowId) return true;
      const hasBo = it.bookingOrderCreated && Boolean(it.maBooking);
      const isSowSigned = it.contractAppendixStatus === 'ĐÃ_KÝ';
      const isAccepted = it.acceptanceStatus === 'DA_NGHIEM_THU';
      const isSettled =
        it.trangThaiPhieuThanhToan === 'Đã lập ĐNTT' ||
        it.trangThaiPhieuThanhToan === 'Đã thanh toán';
      if (stageChip === 'PENDING_DEAL') return !hasBo;
      if (stageChip === 'PENDING_SOW') return hasBo && !isSowSigned;
      if (stageChip === 'PENDING_ACCEPTANCE') return hasBo && !isAccepted;
      if (stageChip === 'PENDING_ADDONS')
        return isAccepted && it.sequentialAcceptanceStage === '2_DA_NGHIEM_THU_VIDEO_CHO_PHAN_KHAC';
      if (stageChip === 'ACCEPTED')
        return (
          it.sequentialAcceptanceStage === '3_DA_NGHIEM_THU_TOAN_DEAL' ||
          (isAccepted && it.sequentialAcceptanceStage !== '2_DA_NGHIEM_THU_VIDEO_CHO_PHAN_KHAC')
        );
      if (stageChip === 'SETTLED') return isSettled;
      return true;
    });
  }, [scopedItems, stageChip, editingRowId]);

  const paginatedListItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  // Index O(1) theo handle kênh chuẩn hóa (RULE-PERF-01)
  const itemsByHandleMap = useMemo(() => {
    const map = new Map<string, ApprovedBookingListItem[]>();
    for (const it of items) {
      const h = normalizeTikTokId(it.idKenh).toLowerCase();
      if (!h) continue;
      const list = map.get(h);
      if (list) list.push(it);
      else map.set(h, [it]);
    }
    return map;
  }, [items]);

  // Thống kê tổng hợp trên List Duyệt Book (RULE-PERF-01: 1-pass loop)
  const stats = useMemo(() => {
    const total = filteredItems.length;
    let boCreatedCount = 0;
    let sowSignedCount = 0;
    let acceptedCount = 0;
    let totalFinalNet = 0;
    let totalGross = 0;
    let totalGmv30d = 0;
    for (const i of filteredItems) {
      if (i.bookingOrderCreated && i.maBooking) boCreatedCount += 1;
      if (i.contractAppendixStatus === 'ĐÃ_KÝ') sowSignedCount += 1;
      if (i.acceptanceStatus === 'DA_NGHIEM_THU') acceptedCount += 1;
      totalFinalNet += Number(i.chiPhiBookingNetCuoi) || 0;
      totalGross += Number(i.chiPhiGrossKemThue) || 0;
      totalGmv30d += Number(i.gmv30d) || 0;
    }
    const avgRoi = totalFinalNet > 0 ? Number((totalGmv30d / totalFinalNet).toFixed(2)) : 0;
    return {
      total,
      boCreatedCount,
      sowSignedCount,
      pendingBoCount: total - boCreatedCount,
      acceptedCount,
      totalFinalNet,
      totalGross,
      totalGmv30d,
      avgRoi,
    };
  }, [filteredItems]);

  // Đối chiếu trần hạn mức ngân sách Net theo Kế hoạch tháng (Overbudget / Unbudgeted Spend)
  const budgetSummary = useMemo(
    () =>
      computeApprovedBookingBudgetSummary({
        rawMonthlyPlans,
        selectedMonth,
        selectedStore,
        filterAssigneeScope,
        totalFinalNet: stats.totalFinalNet,
      }),
    [rawMonthlyPlans, selectedMonth, selectedStore, filterAssigneeScope, stats.totalFinalNet]
  );

  // Các trường thuộc điều khoản hợp đồng SOW bị khóa sau khi Phụ lục SOW đã ký hoàn tất (ĐÃ_KÝ)
  const SOW_LOCKED_FIELDS = useMemo(
    () =>
      new Set<keyof ApprovedBookingListItem>([
        'idKenh',
        'sanPham',
        'plannedAirDate',
        'chiPhiBookingNetCuoi',
        'soTienTamUngTruoc',
        'loaiTaiKhoanThanhToan',
      ]),
    []
  );

  // Chỉnh sửa trực tiếp trên từng dòng (Ngày air chốt, Giá cuối cùng, Tạm ứng, Sản phẩm, Ghi chú...)
  const handleFieldChange = <K extends keyof ApprovedBookingListItem>(
    id: string,
    field: K,
    value: ApprovedBookingListItem[K]
  ) => {
    if (isReadOnlyPartnerRole) {
      onNotify?.(
        'Đại diện Nhãn hàng chỉ xem tiến độ Deal & Nghiệm thu trên bảng này.',
        'warning'
      );
      return;
    }
    const targetRow = items.find((i) => i.id === id);
    if (
      targetRow &&
      targetRow.contractAppendixStatus === 'ĐÃ_KÝ' &&
      SOW_LOCKED_FIELDS.has(field)
    ) {
      onNotify?.(
        `Phụ lục SOW (${
          targetRow.contractAppendixCode || `PL-${targetRow.maBooking}-01`
        }) đã ký hoàn tất — điều khoản hợp đồng đã khóa. Để điều chỉnh, vui lòng mở cấu hình Deal và chọn "Lập Phụ lục bổ sung".`,
        'warning'
      );
      return;
    }

    const canApproveDataUnlock =
      currentRole === 'ADMIN' ||
      currentRole === 'FINANCE' ||
      currentRole === 'MANAGER' ||
      currentRole === 'LEADER';
    if (
      targetRow &&
      isApprovedDealDataLocked(targetRow) &&
      DATA_LOCKED_APPROVED_FIELDS.has(field)
    ) {
      if (targetRow.daDiTien) {
        onNotify?.(
          `Deal ${targetRow.maBooking || targetRow.idKenh} đã giải ngân thanh toán (Đã đi tiền UNC). Không thể chỉnh sửa thông tin nghiệm thu và chi phí.`,
          'warning'
        );
        return;
      }
      if (!canApproveDataUnlock) {
        onNotify?.(
          `Deal ${targetRow.maBooking || targetRow.idKenh} đã khóa sổ nghiệm thu tháng (Chốt data). Vui lòng mở chi tiết Deal để gửi yêu cầu mở khóa sửa S40 lên Kế toán.`,
          'warning'
        );
        return;
      }
    }

    setEditingRowId(id);
    let updatedRowRef: ApprovedBookingListItem | null = null;
    updateItemsAndSync((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const recalculated = recalculateApprovedBookingItem({
          ...item,
          [field]: value,
        });
        updatedRowRef = recalculated;
        return recalculated;
      })
    );
    if (updatedRowRef) {
      const rowToSync: ApprovedBookingListItem = updatedRowRef;
      if (sheetSyncTimerRef.current) clearTimeout(sheetSyncTimerRef.current);
      sheetSyncTimerRef.current = setTimeout(() => {
        syncApprovedItemsBackToStaffBrandSheets([rowToSync], kocs, stores, deals);
        if (rowToSync.bookingOrderCreated && rowToSync.maBooking && onCreateOrUpdateDeals) {
          onCreateOrUpdateDeals([buildBookingDealFromApprovedItem(rowToSync)]);
        }
      }, 350);
    }
  };

  // ============================================================================
  // BỘ ĐỐI SOÁT 3 BƯỚC: ĐỌC → SO SÁNH → BÁO CÁO (CHO MỌI THAO TÁC KÉO / ĐẨY SHEET)
  // ============================================================================
  const [syncComparisonReport, setSyncComparisonReport] =
    useState<SheetSyncComparisonReportState | null>(null);
  const [syncDiffFilter, setSyncDiffFilter] = useState<
    'ALL' | 'CHANGED' | 'ADDED' | 'UPDATED' | 'UNCHANGED' | 'EXTRA'
  >('ALL');
  const [pendingPullReportMap, setPendingPullReportMap] = useState<
    Map<
      string,
      Array<{
        dealCode: string;
        idKenh: string;
        tenKoc?: string;
        sanPham?: string;
        ngayAirReal: string;
        linkVideo: string;
        videoId?: string;
        sparkAds: string;
        views14d?: number;
        gmv14d?: number;
        views30d: number;
        orders30d: number;
        gmv30d: number;
        gpm30d?: number;
        roi30d: number;
        danhGia?: string;
        rowId: string;
      }>
    >
  >(new Map());

  // 1. KÉO TỪ SHEET 2 (LISTING BRAND): ĐỌC → SO SÁNH → BÁO CÁO → XÁC NHẬN
  const handlePullBrandApprovedFromSheets = () => {
    const collection = loadStaffSheetCollection(kocs, stores, deals, currentUserName);
    const diffRows: SheetSyncDiffRow[] = [];
    let addedCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;
    const storeSet = new Set<string>();

    const bySourceRowId = new Map<string, ApprovedBookingListItem>();
    const byCompositeKey = new Map<string, ApprovedBookingListItem>();
    for (const it of items) {
      if (it.sourceSheetRowId) bySourceRowId.set(it.sourceSheetRowId, it);
      const key = `${it.storeName || ''}::${normalizeTikTokId(it.idKenh).toLowerCase()}::${it.thangPlan || ''}`;
      if (!byCompositeKey.has(key)) byCompositeKey.set(key, it);
    }

    Object.entries(collection.sheets).forEach(([sheetKey, rows]) => {
      const approvedRows = rows.filter(
        (r) =>
          r.brandChon === 'Yes' &&
          r.trangThai !== 'Từ chối' &&
          r.trangThai !== 'Không phản hồi' &&
          (b2cStoreNameSet.size === 0 || b2cStoreNameSet.has(r.store))
      );
      if (approvedRows.length === 0) return;

      approvedRows.forEach((r, idx) => {
        storeSet.add(r.store || 'Chưa rõ gian');
        const cleanHandle = normalizeTikTokId(r.idKenh).toLowerCase();
        const existing =
          (r.id ? bySourceRowId.get(r.id) : undefined) ||
          byCompositeKey.get(`${r.store || ''}::${cleanHandle}::${r.thang || ''}`);

        const netPrice = Number(r.giaChotCuoi || r.giaNetVideo || 0);
        if (!existing) {
          addedCount += 1;
          diffRows.push({
            id: `listing-add-${sheetKey}-${r.id || idx}`,
            dealCode: 'Cấp mới khi tạo BO',
            store: r.store || '—',
            idKenh: r.idKenh || '—',
            tenKoc: r.tenKenh || r.idKenh || '—',
            sanPham: r.sanPham || '—',
            status: 'ADDED',
            fieldDiffs: [
              {
                field: 'KOC được Brand chọn = Yes',
                oldVal: 'Chưa có trong Quản lý Deal',
                newVal: `${r.tenKenh || r.idKenh} · Net: ${formatVnd(netPrice)}`,
              },
            ],
          });
        } else {
          const fieldDiffs: Array<{ field: string; oldVal: string; newVal: string }> = [];
          const plannedAir = r.ngayAirChot || r.ngayAirPlan || '';
          const airUrl = r.linkAirNghiemThu || '';
          if (r.sanPham && r.sanPham !== existing.sanPham) {
            fieldDiffs.push({
              field: 'Sản phẩm',
              oldVal: existing.sanPham || '—',
              newVal: r.sanPham,
            });
          }
          if (netPrice > 0 && netPrice !== existing.chiPhiBookingNetCuoi) {
            fieldDiffs.push({
              field: 'Giá Booking Net',
              oldVal: formatVnd(existing.chiPhiBookingNetCuoi || 0),
              newVal: formatVnd(netPrice),
            });
          }
          if (plannedAir && plannedAir !== existing.plannedAirDate) {
            fieldDiffs.push({
              field: 'Ngày Air dự kiến',
              oldVal: existing.plannedAirDate || '—',
              newVal: plannedAir,
            });
          }
          if (airUrl && airUrl !== existing.linkAir) {
            fieldDiffs.push({
              field: 'Link video Air',
              oldVal: existing.linkAir || '—',
              newVal: airUrl,
            });
          }

          if (fieldDiffs.length > 0) {
            updatedCount += 1;
            diffRows.push({
              id: `listing-upd-${sheetKey}-${r.id || idx}`,
              dealCode: existing.maBooking || 'Chưa cấp BO',
              store: r.store || existing.storeName || '—',
              idKenh: r.idKenh || existing.idKenh || '—',
              tenKoc: r.tenKenh || existing.tenKenh || '—',
              sanPham: r.sanPham || existing.sanPham || '—',
              status: 'UPDATED',
              fieldDiffs,
            });
          } else {
            unchangedCount += 1;
            diffRows.push({
              id: `listing-same-${sheetKey}-${r.id || idx}`,
              dealCode: existing.maBooking || 'Chưa cấp BO',
              store: r.store || existing.storeName || '—',
              idKenh: r.idKenh || existing.idKenh || '—',
              tenKoc: r.tenKenh || existing.tenKenh || '—',
              sanPham: r.sanPham || existing.sanPham || '—',
              status: 'UNCHANGED',
              fieldDiffs: [],
              preservedMetricsNote: 'Đã khớp 100% giữa Sheet Listing & Bảng Deal',
            });
          }
        }
      });
    });

    setSyncDiffFilter(addedCount + updatedCount > 0 ? 'CHANGED' : 'ALL');
    setSyncComparisonReport({
      mode: 'PULL_LISTING_SHEET',
      stage: 'PREVIEW',
      title: 'Báo cáo Đối soát Kéo KOC từ Sheet 2 (Listing Brand)',
      targetStoresLabel:
        storeSet.size > 0 ? `${storeSet.size} gian hàng có KOC duyệt` : 'Tất cả gian hàng',
      addedCount,
      updatedCount,
      unchangedCount,
      extraCount: 0,
      extraLabel: 'Dòng ngoại lệ',
      diffRows,
    });
  };

  const confirmExecutePullListingSheets = () => {
    const collection = loadStaffSheetCollection(kocs, stores, deals, currentUserName);
    let totalAdded = 0;
    let totalUpdated = 0;

    Object.entries(collection.sheets).forEach(([sheetKey, rows]) => {
      const approvedRows = rows.filter(
        (r) =>
          r.brandChon === 'Yes' &&
          r.trangThai !== 'Từ chối' &&
          r.trangThai !== 'Không phản hồi' &&
          (b2cStoreNameSet.size === 0 || b2cStoreNameSet.has(r.store))
      );
      if (approvedRows.length === 0) return;
      const storeObj = stores.find((s) => s.storeName === approvedRows[0]?.store);
      const res = transferBrandApprovedRowsToBookingList({
        rowsToTransfer: approvedRows,
        sheetKey,
        store: storeObj,
        allKocs: kocs,
        allStores: stores,
        allDeals: deals,
      });
      totalAdded += res.addedCount;
      totalUpdated += res.updatedCount;
    });

    setItems(loadApprovedBookingList(kocs, stores, deals, currentUserName));
    setSyncComparisonReport((prev) => (prev ? { ...prev, stage: 'COMPLETED' } : null));
    onNotify?.(
      `Đã hoàn tất đồng bộ từ Sheet Listing Brand: thêm mới ${totalAdded} dòng, cập nhật ${totalUpdated} dòng.`,
      'success'
    );
  };

  // ============================================================================
  // ĐỒNG BỘ 2 CHIỀU VỚI SHEET 3 — KẾT QUẢ / REPORT TRÊN GOOGLE SHEET (reportSheetTab)
  // NGUYÊN TẮC BẮT BUỘC: ĐỌC → SO SÁNH (DIFF) → BÁO CÁO ĐỐI SOÁT → XÁC NHẬN THỰC THI
  // ============================================================================
  const [isSyncingReportSheet, setIsSyncingReportSheet] = useState(false);
  const [isReportSchemaModalOpen, setIsReportSchemaModalOpen] = useState(false);
  const [reportSchemaGroupFilter, setReportSchemaGroupFilter] = useState<string>('ALL');

  const resolveStoreReportSheetConfig = (storeName: string) => {
    const st = stores.find((s) => s.storeName === storeName);
    let ov: Partial<StorePortfolioItem> = {};
    if (typeof window !== 'undefined' && st?.id) {
      try {
        const raw = window.localStorage.getItem('upbase_store_overrides_v1');
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, Partial<StorePortfolioItem>>;
          ov = parsed[st.id] || {};
        }
      } catch {
        ov = {};
      }
    }
    const sheetUrl = (
      ov.bookingSheetUrl ||
      st?.bookingSheetUrl ||
      (st ? resolveBrandBookingSheetUrl(st.brandName, st.storeName, st) : '') ||
      ''
    ).trim();
    const reportTab = (ov.reportSheetTab || st?.reportSheetTab || 'Báo cáo & Nghiệm thu').trim() || 'Báo cáo & Nghiệm thu';
    return { store: st, sheetUrl, reportTab };
  };

  const selectedStoreSheetMeta = useMemo(() => {
    if (selectedStore === 'ALL') return null;
    return resolveStoreReportSheetConfig(selectedStore);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore, stores]);

  const buildDealsPayloadForStore = (storeRows: ApprovedBookingListItem[]) =>
    storeRows.map((r) => {
      const reportRow = buildReportSheetRowFromApprovedItem(r);
      return {
        thang: r.thangPlan || '',
        store: r.storeName || '',
        brand: r.brandName || '',
        dot: r.dot || '',
        dealCode: r.maBooking || '',
        pic: r.nguoiPhuTrach || '',
        kocTier: r.klGrade || '',
        hinhThucHopTac: r.hinhThucHopTac || 'New',
        idKenh: r.idKenh || '',
        tenKoc: r.tenKenh || '',
        sanPham: r.sanPham || '',
        contentAngle: r.contentAngle || '',
        contentPillar: r.pillarContent || '',
        giaNet: r.chiPhiBookingNetCuoi || 0,
        giaGross: r.chiPhiGrossKemThue || 0,
        ngayAirPlan: r.plannedAirDate || '',
        ngayAirReal: r.actualAirDate || '',
        tienDoAir: r.trangThaiSlaAir || '',
        linkVideo: r.linkAir || '',
        videoId: r.videoId || reportRow.videoId || '',
        sparkAds: r.sparkAdsCode || '',
        sparkExpiry: '',
        views14d: r.views14d || 0,
        gmv14d: r.gmv14d || 0,
        views30d: r.views30d || 0,
        orders30d: r.orders30d || 0,
        gmv30d: r.gmv30d || 0,
        gpm30d: r.gpm30d || 0,
        roi30d: Number((r.roi30d || 0).toFixed(2)),
        danhGia: r.danhGiaHieuQuaVideo || '',
        rowId: r.id,
        reportRow,
      };
    });

  // 2A. BƯỚC 1 ĐẨY SHEET 3: ĐỌC SHEET HIỆN TẠI, SO SÁNH TỪNG DÒNG & MỞ BÁO CÁO ĐỐI SOÁT (dryRun = true)
  const handlePushReportSheetToGoogle = async () => {
    const targetRows =
      selectedIds.length > 0
        ? filteredItems.filter((i) => selectedIds.includes(i.id))
        : filteredItems;
    if (targetRows.length === 0) {
      onNotify?.('Chưa có dòng Deal nào trong danh sách hiện tại để đẩy lên Sheet Kết quả.', 'warning');
      return;
    }

    const byStore = new Map<string, ApprovedBookingListItem[]>();
    for (const r of targetRows) {
      const list = byStore.get(r.storeName) || [];
      list.push(r);
      byStore.set(r.storeName, list);
    }

    setIsSyncingReportSheet(true);
    let totalAdded = 0;
    let totalUpdated = 0;
    let totalUnchanged = 0;
    let totalPreserved = 0;
    const allDiffRows: SheetSyncDiffRow[] = [];
    const missingSheetStores: string[] = [];
    const validStoreNames: string[] = [];

    try {
      for (const [storeName, storeRows] of byStore.entries()) {
        const { sheetUrl, reportTab } = resolveStoreReportSheetConfig(storeName);
        if (!sheetUrl) {
          missingSheetStores.push(storeName);
          continue;
        }
        validStoreNames.push(`${storeName} (${reportTab})`);
        const dealsPayload = buildDealsPayloadForStore(storeRows);

        const res = await fetch('/api/booking-report/sync-sheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sheetUrl,
            tabName: reportTab,
            deals: dealsPayload,
            formatTemplate: true,
            dryRun: true,
          }),
        });
        const data = (await res.json().catch(() => null)) as {
          success?: boolean;
          addedCount?: number;
          updatedCount?: number;
          unchangedCount?: number;
          preservedSheetOnlyCount?: number;
          diffItems?: Array<{
            dealCode: string;
            store: string;
            idKenh: string;
            tenKoc: string;
            sanPham: string;
            status: 'ADDED' | 'UPDATED' | 'UNCHANGED' | 'PRESERVED_SHEET';
            fieldDiffs: Array<{ field: string; oldVal: string; newVal: string }>;
            preservedMetricsNote?: string;
          }>;
          error?: string;
        } | null;

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || `Không đọc đối soát được Sheet Kết quả cho gian ${storeName}`);
        }

        totalAdded += data.addedCount || 0;
        totalUpdated += data.updatedCount || 0;
        totalUnchanged += data.unchangedCount || 0;
        totalPreserved += data.preservedSheetOnlyCount || 0;

        (data.diffItems || []).forEach((d, idx) => {
          allDiffRows.push({
            id: `push-diff-${storeName}-${d.dealCode || idx}`,
            dealCode: d.dealCode || '—',
            store: d.store || storeName,
            idKenh: d.idKenh || '—',
            tenKoc: d.tenKoc || '—',
            sanPham: d.sanPham || '—',
            status: d.status,
            fieldDiffs: d.fieldDiffs || [],
            preservedMetricsNote: d.preservedMetricsNote,
          });
        });
      }

      if (validStoreNames.length === 0) {
        onNotify?.(
          'Gian hàng đang chọn chưa gắn Link Google Sheet. Vui lòng gắn link tại Hồ sơ gian hàng hoặc mục Thiết lập.',
          'warning'
        );
        return;
      }

      setSyncDiffFilter(totalAdded + totalUpdated > 0 ? 'CHANGED' : 'ALL');
      setSyncComparisonReport({
        mode: 'PUSH_REPORT_SHEET',
        stage: 'PREVIEW',
        title: 'Báo cáo Đối soát trước khi Đẩy lên Sheet 3 (Kết quả — 28 cột)',
        targetStoresLabel: validStoreNames.join(', '),
        addedCount: totalAdded,
        updatedCount: totalUpdated,
        unchangedCount: totalUnchanged,
        extraCount: totalPreserved,
        extraLabel: 'Dòng sẵn có trên Sheet (Bảo toàn)',
        diffRows: allDiffRows,
        missingSheetStores,
      });
    } catch (err) {
      onNotify?.(
        err instanceof Error ? err.message : 'Lỗi khi đọc & đối soát Sheet Kết quả.',
        'error'
      );
    } finally {
      setIsSyncingReportSheet(false);
    }
  };

  // 2B. BƯỚC 2 ĐẨY SHEET 3: XÁC NHẬN GHI THẬT LÊN GOOGLE SHEET & HIỂN THỊ BÁO CÁO KẾT QUẢ
  const confirmExecutePushReportSheet = async () => {
    const targetRows =
      selectedIds.length > 0
        ? filteredItems.filter((i) => selectedIds.includes(i.id))
        : filteredItems;
    const byStore = new Map<string, ApprovedBookingListItem[]>();
    for (const r of targetRows) {
      const list = byStore.get(r.storeName) || [];
      list.push(r);
      byStore.set(r.storeName, list);
    }

    setIsSyncingReportSheet(true);
    let pushedStoresCount = 0;
    let pushedRowsCount = 0;

    try {
      for (const [storeName, storeRows] of byStore.entries()) {
        const { sheetUrl, reportTab } = resolveStoreReportSheetConfig(storeName);
        if (!sheetUrl) continue;
        const dealsPayload = buildDealsPayloadForStore(storeRows);

        const res = await fetch('/api/booking-report/sync-sheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sheetUrl,
            tabName: reportTab,
            deals: dealsPayload,
            formatTemplate: true,
            dryRun: false,
          }),
        });
        const data = (await res.json().catch(() => null)) as {
          success?: boolean;
          syncedRows?: number;
          error?: string;
        } | null;
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || `Không đẩy được Sheet Kết quả cho gian ${storeName}`);
        }
        pushedStoresCount += 1;
        pushedRowsCount += data.syncedRows || dealsPayload.length;
      }

      setSyncComparisonReport((prev) => (prev ? { ...prev, stage: 'COMPLETED' } : null));
      onNotify?.(
        `Đã đối soát & đẩy thành công ${pushedRowsCount} dòng (28 cột) lên Sheet Kết quả của ${pushedStoresCount} gian hàng.`,
        'success'
      );
    } catch (err) {
      onNotify?.(
        err instanceof Error ? err.message : 'Lỗi khi ghi dữ liệu lên Sheet Kết quả.',
        'error'
      );
    } finally {
      setIsSyncingReportSheet(false);
    }
  };

  // 3A. BƯỚC 1 ĐỌC KQ TỪ SHEET 3: ĐỌC DỮ LIỆU TRÊN SHEET, SO SÁNH VỚI WEB & MỞ BÁO CÁO ĐỐI SOÁT
  const handlePullReportSheetFromGoogle = async () => {
    const targetStoreNames =
      selectedStore !== 'ALL'
        ? [selectedStore]
        : Array.from(new Set(filteredItems.map((i) => i.storeName).filter(Boolean)));
    if (targetStoreNames.length === 0) {
      onNotify?.('Vui lòng chọn gian hàng để kéo dữ liệu từ Sheet Kết quả.', 'warning');
      return;
    }

    setIsSyncingReportSheet(true);
    try {
      const pulledByStore = new Map<
        string,
        Array<{
          dealCode: string;
          idKenh: string;
          tenKoc?: string;
          sanPham?: string;
          ngayAirReal: string;
          linkVideo: string;
          videoId?: string;
          sparkAds: string;
          views14d?: number;
          gmv14d?: number;
          views30d: number;
          orders30d: number;
          gmv30d: number;
          gpm30d?: number;
          roi30d: number;
          danhGia?: string;
          rowId: string;
        }>
      >();
      const validStoreLabels: string[] = [];

      for (const stName of targetStoreNames) {
        const { sheetUrl, reportTab } = resolveStoreReportSheetConfig(stName);
        if (!sheetUrl) continue;
        const res = await fetch(
          `/api/booking-report/sync-sheet?sheetUrl=${encodeURIComponent(sheetUrl)}&tab=${encodeURIComponent(reportTab)}`
        );
        const data = (await res.json().catch(() => null)) as {
          exists?: boolean;
          deals?: Array<{
            dealCode: string;
            idKenh: string;
            tenKoc?: string;
            sanPham?: string;
            ngayAirReal: string;
            linkVideo: string;
            videoId?: string;
            sparkAds: string;
            views14d?: number;
            gmv14d?: number;
            views30d: number;
            orders30d: number;
            gmv30d: number;
            gpm30d?: number;
            roi30d: number;
            danhGia?: string;
            rowId: string;
          }>;
          error?: string;
        } | null;
        if (res.ok && data?.exists && Array.isArray(data.deals)) {
          pulledByStore.set(stName, data.deals);
          validStoreLabels.push(`${stName} (${reportTab})`);
        }
      }

      if (pulledByStore.size === 0) {
        onNotify?.('Chưa tìm thấy dữ liệu trên Sheet Kết quả của gian hàng đang chọn.', 'info');
        return;
      }

      // So sánh từng dòng trên Sheet 3 với danh sách Deal trên Web
      let updatedCount = 0;
      let unchangedCount = 0;
      let unmatchedSheetCount = 0;
      const diffRows: SheetSyncDiffRow[] = [];

      for (const [stName, sheetDeals] of pulledByStore.entries()) {
        const storeWebItems = items.filter((i) => i.storeName === stName);

        sheetDeals.forEach((sd, idx) => {
          const normSheetHandle = normalizeTikTokId(sd.idKenh).toLowerCase();
          const matchedWeb = storeWebItems.find(
            (item) =>
              (sd.rowId && sd.rowId === item.id) ||
              (sd.dealCode &&
                item.maBooking &&
                sd.dealCode.toUpperCase() === item.maBooking.toUpperCase()) ||
              (normSheetHandle &&
                normalizeTikTokId(item.idKenh).toLowerCase() === normSheetHandle)
          );

          if (!matchedWeb) {
            unmatchedSheetCount += 1;
            diffRows.push({
              id: `pull-unmatched-${stName}-${sd.dealCode || idx}`,
              dealCode: sd.dealCode || 'Chưa rõ mã BO',
              store: stName,
              idKenh: sd.idKenh || '—',
              tenKoc: sd.tenKoc || sd.idKenh || '—',
              sanPham: sd.sanPham || '—',
              status: 'UNMATCHED_SHEET',
              fieldDiffs: [
                {
                  field: 'Chưa khớp Deal trên Web',
                  oldVal: 'Không tìm thấy Mã Booking / ID kênh trên bảng Web',
                  newVal: `Sheet có Views: ${formatNumber(sd.views30d || 0)} · GMV: ${formatVnd(sd.gmv30d || 0)}`,
                },
              ],
            });
            return;
          }

          const fieldDiffs: Array<{ field: string; oldVal: string; newVal: string }> = [];
          if (sd.ngayAirReal && sd.ngayAirReal !== (matchedWeb.actualAirDate || '')) {
            fieldDiffs.push({
              field: 'Ngày Air thực tế',
              oldVal: matchedWeb.actualAirDate || '—',
              newVal: sd.ngayAirReal,
            });
          }
          if (sd.linkVideo && sd.linkVideo !== (matchedWeb.linkAir || '')) {
            fieldDiffs.push({
              field: 'Link video Air',
              oldVal: matchedWeb.linkAir || 'Chưa có link',
              newVal: sd.linkVideo,
            });
          }
          if (sd.videoId && sd.videoId !== (matchedWeb.videoId || '')) {
            fieldDiffs.push({
              field: 'ID video',
              oldVal: matchedWeb.videoId || '—',
              newVal: sd.videoId,
            });
          }
          if (sd.sparkAds && sd.sparkAds !== (matchedWeb.sparkAdsCode || '')) {
            fieldDiffs.push({
              field: 'Mã Spark Ads',
              oldVal: matchedWeb.sparkAdsCode || '—',
              newVal: sd.sparkAds,
            });
          }
          if (sd.views30d > 0 && sd.views30d !== (matchedWeb.views30d || 0)) {
            fieldDiffs.push({
              field: 'Views',
              oldVal: formatNumber(matchedWeb.views30d || 0),
              newVal: formatNumber(sd.views30d),
            });
          }
          if (sd.orders30d > 0 && sd.orders30d !== (matchedWeb.orders30d || 0)) {
            fieldDiffs.push({
              field: 'Đơn hàng',
              oldVal: formatNumber(matchedWeb.orders30d || 0),
              newVal: formatNumber(sd.orders30d),
            });
          }
          if (sd.gmv30d > 0 && sd.gmv30d !== (matchedWeb.gmv30d || 0)) {
            fieldDiffs.push({
              field: 'GMV video',
              oldVal: formatVnd(matchedWeb.gmv30d || 0),
              newVal: formatVnd(sd.gmv30d),
            });
          }
          if ((sd.gpm30d || 0) > 0 && sd.gpm30d !== (matchedWeb.gpm30d || 0)) {
            fieldDiffs.push({
              field: 'GPM',
              oldVal: formatVnd(matchedWeb.gpm30d || 0),
              newVal: formatVnd(sd.gpm30d || 0),
            });
          }

          if (fieldDiffs.length > 0) {
            updatedCount += 1;
            diffRows.push({
              id: `pull-upd-${stName}-${matchedWeb.id}`,
              dealCode: matchedWeb.maBooking || sd.dealCode || '—',
              store: stName,
              idKenh: matchedWeb.idKenh || sd.idKenh || '—',
              tenKoc: matchedWeb.tenKenh || sd.tenKoc || '—',
              sanPham: matchedWeb.sanPham || sd.sanPham || '—',
              status: 'UPDATED',
              fieldDiffs,
              preservedMetricsNote: sd.danhGia ? `Đánh giá: ${sd.danhGia} (ROI ${sd.roi30d}x)` : undefined,
            });
          } else {
            unchangedCount += 1;
            diffRows.push({
              id: `pull-same-${stName}-${matchedWeb.id}`,
              dealCode: matchedWeb.maBooking || sd.dealCode || '—',
              store: stName,
              idKenh: matchedWeb.idKenh || sd.idKenh || '—',
              tenKoc: matchedWeb.tenKenh || sd.tenKoc || '—',
              sanPham: matchedWeb.sanPham || sd.sanPham || '—',
              status: 'UNCHANGED',
              fieldDiffs: [],
              preservedMetricsNote: `Đã khớp (Views: ${formatNumber(sd.views30d || 0)} · GMV: ${formatVnd(sd.gmv30d || 0)})`,
            });
          }
        });
      }

      setPendingPullReportMap(pulledByStore);
      setSyncDiffFilter(updatedCount + unmatchedSheetCount > 0 ? 'CHANGED' : 'ALL');
      setSyncComparisonReport({
        mode: 'PULL_REPORT_SHEET',
        stage: 'PREVIEW',
        title: 'Báo cáo Đối soát Đọc kết quả từ Sheet 3 (Google Sheet → Web)',
        targetStoresLabel: validStoreLabels.join(', '),
        addedCount: 0,
        updatedCount,
        unchangedCount,
        extraCount: unmatchedSheetCount,
        extraLabel: 'Dòng Sheet chưa khớp mã trên Web',
        diffRows,
      });
    } catch (err) {
      onNotify?.(
        err instanceof Error ? err.message : 'Lỗi khi đọc & đối soát dữ liệu từ Sheet Kết quả.',
        'error'
      );
    } finally {
      setIsSyncingReportSheet(false);
    }
  };

  // 3B. BƯỚC 2 ĐỌC KQ TỪ SHEET 3: XÁC NHẬN CẬP NHẬT VÀO BẢNG DEAL TRÊN WEB
  const confirmExecutePullReportSheet = () => {
    if (pendingPullReportMap.size === 0) return;
    let updatedCount = 0;

    updateItemsAndSync((prev) =>
      prev.map((item) => {
        const storeDeals = pendingPullReportMap.get(item.storeName);
        if (!storeDeals || storeDeals.length === 0) return item;
        const normHandle = normalizeTikTokId(item.idKenh).toLowerCase();
        const matched = storeDeals.find(
          (d) =>
            (d.rowId && d.rowId === item.id) ||
            (d.dealCode && item.maBooking && d.dealCode.toUpperCase() === item.maBooking.toUpperCase()) ||
            (d.idKenh && normalizeTikTokId(d.idKenh).toLowerCase() === normHandle)
        );
        if (!matched) return item;
        const locked = isApprovedDealDataLocked(item);
        const hasChange =
          (!locked && matched.linkVideo && matched.linkVideo !== item.linkAir) ||
          (!locked && matched.videoId && matched.videoId !== item.videoId) ||
          (!locked && matched.ngayAirReal && matched.ngayAirReal !== item.actualAirDate) ||
          (!locked && matched.sparkAds && matched.sparkAds !== item.sparkAdsCode) ||
          ((matched.views14d || 0) > 0 && matched.views14d !== item.views14d) ||
          ((matched.gmv14d || 0) > 0 && matched.gmv14d !== item.gmv14d) ||
          (matched.views30d > 0 && matched.views30d !== item.views30d) ||
          (matched.orders30d > 0 && matched.orders30d !== item.orders30d) ||
          (matched.gmv30d > 0 && matched.gmv30d !== item.gmv30d) ||
          ((matched.gpm30d || 0) > 0 && matched.gpm30d !== item.gpm30d);
        if (!hasChange) return item;
        updatedCount += 1;
        const nextLinkAir = locked ? item.linkAir : matched.linkVideo || item.linkAir;
        return recalculateApprovedBookingItem({
          ...item,
          linkAir: nextLinkAir,
          videoId: locked ? item.videoId : matched.videoId || item.videoId,
          actualAirDate: locked ? item.actualAirDate : matched.ngayAirReal || item.actualAirDate,
          sparkAdsCode: locked ? item.sparkAdsCode : matched.sparkAds || item.sparkAdsCode,
          views14d: (matched.views14d || 0) > 0 ? matched.views14d! : item.views14d,
          gmv14d: (matched.gmv14d || 0) > 0 ? matched.gmv14d! : item.gmv14d,
          views30d: matched.views30d > 0 ? matched.views30d : item.views30d,
          orders30d: matched.orders30d > 0 ? matched.orders30d : item.orders30d,
          gmv30d: matched.gmv30d > 0 ? matched.gmv30d : item.gmv30d,
          gpm30d: (matched.gpm30d || 0) > 0 ? matched.gpm30d! : item.gpm30d,
          acceptanceStatus: nextLinkAir ? 'DA_NGHIEM_THU' : item.acceptanceStatus,
        });
      })
    );

    setSyncComparisonReport((prev) => (prev ? { ...prev, stage: 'COMPLETED' } : null));
    onNotify?.(
      updatedCount > 0
        ? `Đã xác nhận & cập nhật số liệu nghiệm thu (28 cột) cho ${updatedCount} Deal từ Sheet Kết quả.`
        : 'Dữ liệu trên bảng đã khớp hoàn toàn với Sheet Kết quả.',
      updatedCount > 0 ? 'success' : 'info'
    );
  };

  const openDealBuilderModal = (item: ApprovedBookingListItem) => {
    openDrawerForItem(item, 'OVERVIEW');
  };

  // Tạo Deal (mã BO...) & Phụ lục cho 1 dòng hoặc nhiều dòng đã chọn
  const handleCreateBookingOrders = (targetItemIds?: string[]) => {
    if (isReadOnlyPartnerRole) {
      onNotify?.('Chỉ nhân sự Booking / Leader mới có quyền tạo Deal & Phụ lục.', 'warning');
      return;
    }
    if (targetItemIds && targetItemIds.length === 1) {
      const singleTarget = items.find((i) => i.id === targetItemIds[0]);
      if (singleTarget) {
        openDealBuilderModal(singleTarget);
        return;
      }
    }
    const idsToProcess =
      targetItemIds && targetItemIds.length > 0
        ? targetItemIds
        : selectedIds.length > 0
        ? selectedIds
        : filteredItems.filter((i) => !i.bookingOrderCreated).map((i) => i.id);

    if (idsToProcess.length === 0) {
      if (filteredItems.length > 0) {
        openDealBuilderModal(filteredItems[0]);
        return;
      }
      onNotify?.('Tất cả các dòng hiển thị đã được tạo Deal & Phụ lục.', 'info');
      return;
    }

    if (idsToProcess.length === 1) {
      const singleTarget = items.find((i) => i.id === idsToProcess[0]);
      if (singleTarget) {
        openDealBuilderModal(singleTarget);
        return;
      }
    }

    const idSet = new Set(idsToProcess);
    let autoFilledAirCount = 0;

    const createdDeals: BookingDealItem[] = [];
    const syncedApprovedItems: ApprovedBookingListItem[] = [];

    updateItemsAndSync((prev) =>
      prev.map((item, idx) => {
        if (!idSet.has(item.id)) return item;
        const maBo =
          item.maBooking || generateBookingOrderCode(item.thangPlan, idx + 201);
        const resolvedPlannedAirDate =
          item.plannedAirDate?.trim() ||
          `${(item.thangPlan || '2026/10').replace('/', '-')}-20`;
        if (!item.plannedAirDate?.trim()) {
          autoFilledAirCount += 1;
        }
        const defaultAddons =
          item.addonServices && item.addonServices.length > 0
            ? item.addonServices
            : buildDefaultAddonServicesForDeal({
                maBooking: maBo,
                totalNet: item.chiPhiBookingNetCuoi,
                sparkAdsCode: item.sparkAdsCode,
                actualAirDate: item.actualAirDate,
                includeDefaultAddons: true,
              });
        const updated = recalculateApprovedBookingItem({
          ...item,
          maBooking: maBo,
          plannedAirDate: resolvedPlannedAirDate,
          bookingOrderCreated: true,
          bookingOrderCreatedAt: new Date().toISOString(),
          linkedDealId: maBo,
          addonServices: defaultAddons,
          masterContractCode:
            item.masterContractCode ||
            generateMasterContractCode(item.idKenh, item.kocId),
          contractAppendixCode:
            item.contractAppendixCode || generateDealAppendixCode(maBo, 1),
          contractAppendixStatus: item.contractAppendixStatus || 'CHỜ_KÝ',
        });
        syncedApprovedItems.push(updated);
        createdDeals.push(buildBookingDealFromApprovedItem(updated));
        return updated;
      })
    );

    if (syncedApprovedItems.length > 0) {
      syncApprovedItemsBackToStaffBrandSheets(
        syncedApprovedItems,
        kocs,
        stores,
        deals
      );
    }

    if (createdDeals.length > 0 && onCreateOrUpdateDeals) {
      onCreateOrUpdateDeals(createdDeals);
    }

    setSelectedIds([]);
    onNotify?.(
      `Đã tạo thành công ${createdDeals.length} Deal kèm Phụ lục (${createdDeals
        .slice(0, 3)
        .map((d) => d.id)
        .join(', ')}${createdDeals.length > 3 ? '...' : ''})${
        autoFilledAirCount > 0
          ? ` — Đã gán lịch air dự kiến mặc định (ngày 20) cho ${autoFilledAirCount} dòng chưa chốt lịch`
          : ''
      }.`,
      'success'
    );
  };

  // Xóa các dòng đã chọn khỏi List Duyệt Book
  const handleDeleteSelected = () => {
    if (isReadOnlyPartnerRole) {
      onNotify?.('Không có quyền xóa dòng trong Bảng Deal.', 'warning');
      return;
    }
    if (selectedIds.length === 0) return;
    const delSet = new Set(selectedIds);
    updateItemsAndSync((prev) => prev.filter((i) => !delSet.has(i.id)));
    setSelectedIds([]);
    onNotify?.(`Đã xóa ${delSet.size} dòng khỏi List duyệt book.`, 'info');
  };

  // Thêm 1 dòng trực tiếp vào List Duyệt Book (hoặc Phiên Livestream mới khi ở chế độ LIVESTREAM)
  const handleAddDirectApprovedRow = () => {
    if (isReadOnlyPartnerRole) {
      onNotify?.('Không có quyền thêm dòng trực tiếp vào Bảng Deal.', 'warning');
      return;
    }
    const defaultStoreObj =
      b2cStores.find((s) => s.storeName === selectedStore) || b2cStores[0];
    const targetMonth = selectedMonth === 'ALL' ? '2026/10' : selectedMonth;
    const nowIso = new Date().toISOString();
    const isLiveScope = bookingScope === 'LIVESTREAM';
    const compactMonth = targetMonth.replace('/', '').slice(2);
    const liveSeq = String(items.length + 1).padStart(3, '0');
    const newItem = recalculateApprovedBookingItem({
      id: isLiveScope ? `ABL-LIVE-${Date.now()}` : `ABL-${Date.now()}`,
      createdAt: nowIso,
      updatedAt: nowIso,
      maBooking: isLiveScope ? `LIVE-${compactMonth}-${liveSeq}` : '',
      bookingOrderCreated: isLiveScope,
      bookingOrderCreatedAt: isLiveScope ? nowIso : undefined,
      thangPlan: targetMonth,
      dot: 'Đợt 1',
      storeName: defaultStoreObj?.storeName || 'Clubclio_TikTok_E2E-O',
      brandName: defaultStoreObj?.brandName || 'ClubClio',
      nguoiPhuTrach: currentUserName,
      leaderName: defaultStoreObj?.bookingLeader || 'Đặng Thị Yến Nhi',
      idKenh: '',
      tenKenh: '',
      linkKenh: '',
      tepKenh: isLiveScope ? 'Beauty / Livestream' : 'Review Nữ',
      follower: 0,
      sanPham: defaultStoreObj?.mainProducts?.[0] || '',
      pillarContent: isLiveScope ? 'Livestream Affiliate' : 'Review trực tiếp',
      contentAngle: '',
      phanLoaiVideo: isLiveScope ? 'Livestream' : 'Affiliate KOC',
      dinhDangNghiemThu: isLiveScope ? 'Phiên Livestream' : 'Booking Video KOC',
      hinhThucHopTac: 'New',
      giaDeXuatNet: 0,
      chiPhiBookingNetCuoi: 0,
      chiPhiGrossKemThue: 0,
      klGrade: 'TAP UpAffiliate',
      plannedAirDate: `${targetMonth.replace('/', '-')}-22`,
      plannedSendSampleDate: '',
      plannedScriptDate: '',
      plannedDemoDate: '',
      soTienTamUngTruoc: 0,
      loaiTaiKhoanThanhToan: '(Thuế TNCN 10%) Tài khoản cá nhân',
      ghiChu: '',
      pipelineStatus: isLiveScope ? 'Đang thực thi (Đã tạo BO)' : 'Sẵn sàng tạo BO',
      acceptanceStatus: 'CHUA_NGHIEM_THU',
      linkAir: '',
      videoId: '',
      actualAirDate: '',
      ngayDienLinkAir: '',
      tuanReal: '',
      thangAirReal: '',
      trangThaiSlaAir: 'Chưa lên sóng',
      diffDaysAir: 0,
      sparkAdsCode: '',
      views14d: 0,
      orders14d: 0,
      gmv14d: 0,
      gpm14d: 0,
      roi14d: 0,
      views30d: 0,
      orders30d: 0,
      gmv30d: 0,
      gpm30d: 0,
      roi30d: 0,
      danhGiaHieuQuaVideo: 'Chờ lên sóng',
      soTienCanThanhToan: 0,
      soTienDaThanhToan: 0,
      trangThaiPhieuThanhToan: 'Chờ nghiệm thu',
      noiDungChuyenKhoan: '',
      nguoiNhanHang: '',
      sdtNhanHang: '',
      diaChiNhanHang: '',
      tenTaiKhoanNganHang: '',
      soTaiKhoan: '',
      nganHang: '',
      soCccd: '',
      liveStartTime: isLiveScope ? '20:00' : undefined,
      liveEndTime: isLiveScope ? '22:00' : undefined,
      liveCommittedMinutes: isLiveScope ? 120 : undefined,
      liveActualMinutes: isLiveScope ? 0 : undefined,
      liveSessionsCount: isLiveScope ? 1 : undefined,
      liveCommissionPct: isLiveScope ? 15 : undefined,
      liveKpiType: isLiveScope ? 'Tham chiếu' : undefined,
      loaiThanhToanLark: isLiveScope ? 'Thanh toán Booking Livestream' : undefined,
    });

    updateItemsAndSync((prev) => [newItem, ...prev]);
    if (isLiveScope) {
      openDrawerForItem(newItem, 'OVERVIEW');
      onNotify?.(
        `Đã tạo Phiên Livestream ${newItem.maBooking}. Vui lòng điền thông số Phiên Live & Phiếu xác nhận hợp tác.`,
        'success'
      );
    } else {
      onNotify?.('Đã thêm 1 dòng mới vào List duyệt book.', 'info');
    }
  };

  // ============================================================================
  // HỘP THOẠI NGHIỆM THU VIDEO — TỰ ĐỘNG TÌM KÊNH KOC & CHO PHÉP CHỌN MÃ BO
  // ============================================================================
  const [isAcceptanceModalOpen, setIsAcceptanceModalOpen] = useState(false);
  const [acceptanceBulkText, setAcceptanceBulkText] = useState('');
  const [defaultAcceptanceAirDate, setDefaultAcceptanceAirDate] = useState(
    () => getVietnamDateYmd()
  );
  const [selectedTargetBoItemId, setSelectedTargetBoItemId] = useState<string>('AUTO');
  const [rowManualBoMap, setRowManualBoMap] = useState<Record<number, string>>({});
  const [rowFieldOverrides, setRowFieldOverrides] = useState<
    Record<
      number,
      Partial<
        Pick<
          ParsedAcceptanceDraftRow,
          'actualAirDate' | 'sparkAdsCode' | 'views30d' | 'gmv30d' | 'orders30d'
        >
      >
    >
  >({});
  const [inspectedVideosMap, setInspectedVideosMap] = useState<
    Record<string, TikTokVideoInspectionResult>
  >({});
  const [isInspectingTikTokLinks, setIsInspectingTikTokLinks] = useState(false);
  // Lưu chỉnh sửa Nghiệm thu Bước 2 (Dịch vụ gia tăng & Quyền lợi theo Deal / từng Job) theo id dòng
  const [stage2AddonEdits, setStage2AddonEdits] = useState<
    Record<string, DealRightsTermItem[]>
  >({});
  const [stage2DealJobsEdits, setStage2DealJobsEdits] = useState<
    Record<string, DealSowJobItem[]>
  >({});
  const [stage2ActiveJobIdxMap, setStage2ActiveJobIdxMap] = useState<
    Record<string, number>
  >({});
  const [draftBbntPreviewDeal, setDraftBbntPreviewDeal] =
    useState<BookingDealItem | null>(null);

  // Hộp thoại đối soát sâu Kịch bản & Giỏ hàng TikTok Shop (TikTokVideoInspectorModal)
  const [inspectorTargetItem, setInspectorTargetItem] =
    useState<ApprovedBookingListItem | null>(null);
  const [inspectorInitialUrl, setInspectorInitialUrl] = useState<string>('');
  const [isVideoInspectorOpen, setIsVideoInspectorOpen] = useState(false);

  const openDeepVideoInspector = (
    item?: ApprovedBookingListItem,
    overrideUrl?: string
  ) => {
    setInspectorTargetItem(item || null);
    setInspectorInitialUrl(overrideUrl || item?.linkAir || '');
    setIsVideoInspectorOpen(true);
  };

  const handleAcceptVideoFromDeepInspector = (
    dealCode: string,
    inspection: TikTokVideoInspectionResult
  ) => {
    const cleanHandle = normalizeTikTokId(inspection.authorHandle);
    const targetItem =
      inspectorTargetItem ||
      items.find(
        (it) =>
          (dealCode && it.maBooking === dealCode) ||
          (cleanHandle &&
            normalizeTikTokId(it.idKenh).toLowerCase() ===
              cleanHandle.toLowerCase())
      );

    const publishedDate =
      inspection.publishedDate && /^\d{4}-\d{2}-\d{2}$/.test(inspection.publishedDate)
        ? inspection.publishedDate
        : defaultAcceptanceAirDate;

    const result = autoMapVideoAcceptanceByKocChannel({
      acceptances: [
        {
          channelHandle: cleanHandle || targetItem?.idKenh || '',
          linkAir: inspection.resolvedUrl,
          videoId: inspection.videoId,
          actualAirDate: publishedDate,
          sparkAdsCode:
            inspection.sparkAdsVerification?.sparkAdsCode ||
            targetItem?.sparkAdsCode ||
            '',
          views30d:
            inspection.viewsCount > 0
              ? inspection.viewsCount
              : targetItem?.views30d || 0,
          gmv30d:
            targetItem?.gmv30d && targetItem.gmv30d > 0
              ? targetItem.gmv30d
              : 0,
          orders30d:
            targetItem?.orders30d && targetItem.orders30d > 0
              ? targetItem.orders30d
              : 0,
          storeNameFilter: selectedStore,
          thangPlanFilter: selectedMonth,
          targetItemId: targetItem?.id,
          targetBookingCode: targetItem?.maBooking || dealCode || undefined,
        },
      ],
      allKocs: kocs,
      allStores: stores,
      allDeals: deals,
    });

    setItems(result.updatedList);
    if (result.updatedApprovedItems.length > 0 && onCreateOrUpdateDeals) {
      onCreateOrUpdateDeals(
        result.updatedApprovedItems.map((it) => buildBookingDealFromApprovedItem(it))
      );
    }
    setInspectedVideosMap((prev) => ({
      ...prev,
      [inspection.videoId || cleanHandle.toLowerCase()]: inspection,
    }));
    onNotify?.(
      `Đã duyệt nghiệm thu video @${inspection.authorHandle} (${inspection.verdictSummary}) và đồng bộ vào bảng.`,
      'success'
    );
  };

  const buildSampleLineForItem = (u: ApprovedBookingListItem, _idx = 0) => {
    if (!u.linkAir?.trim()) return '';
    const sampleUrl = u.linkAir.trim();
    const sampleSpark = u.sparkAdsCode || '';
    const sampleViews = u.views30d > 0 ? u.views30d : 0;
    const sampleGmv = u.gmv30d > 0 ? u.gmv30d : 0;
    const sampleOrders = u.orders30d > 0 ? u.orders30d : 0;
    const sampleDate = u.actualAirDate || u.plannedAirDate || defaultAcceptanceAirDate;
    return `${sampleUrl} | ${sampleSpark} | ${sampleViews} | ${sampleGmv} | ${sampleOrders} | ${sampleDate}`;
  };

  // ============================================================================
  // HỘP THOẠI NGHIỆM THU PHIÊN LIVESTREAM (BẢNG 3.2 — 3 KHỐI BR-LIVE-01..08)
  // ============================================================================
  const [isLiveAcceptanceModalOpen, setIsLiveAcceptanceModalOpen] = useState(false);
  const [liveAccTargetId, setLiveAccTargetId] = useState<string>('');
  const [liveAccProofUrl, setLiveAccProofUrl] = useState<string>('');
  const [liveAccActualDate, setLiveAccActualDate] = useState<string>(() => getVietnamDateYmd());
  const [liveAccStartTime, setLiveAccStartTime] = useState<string>('20:00');
  const [liveAccEndTime, setLiveAccEndTime] = useState<string>('22:00');
  const [liveAccSessionsCount, setLiveAccSessionsCount] = useState<number>(1);
  const [liveAccCommittedMinutes, setLiveAccCommittedMinutes] = useState<number>(120);
  const [liveAccActualMinutes, setLiveAccActualMinutes] = useState<number>(120);
  const [liveAccActualGmv, setLiveAccActualGmv] = useState<number>(0);
  const [liveAccActualOrders, setLiveAccActualOrders] = useState<number>(0);
  const [liveAccActualViews, setLiveAccActualViews] = useState<number>(0);
  const [liveAccBonusAmount, setLiveAccBonusAmount] = useState<number>(0);
  const [liveAccCustomPenalty, setLiveAccCustomPenalty] = useState<string>('');
  const [liveAccNote, setLiveAccNote] = useState<string>('');

  const populateLiveAcceptanceFromItem = (target: ApprovedBookingListItem) => {
    setLiveAccTargetId(target.id);
    setLiveAccProofUrl(target.linkAir || '');
    setLiveAccActualDate(
      target.actualAirDate || target.plannedAirDate || getVietnamDateYmd()
    );
    setLiveAccStartTime(target.liveStartTime || '20:00');
    setLiveAccEndTime(target.liveEndTime || '22:00');
    setLiveAccSessionsCount(Math.max(1, Number(target.liveSessionsCount) || 1));
    setLiveAccCommittedMinutes(Math.max(30, Number(target.liveCommittedMinutes) || 120));
    setLiveAccActualMinutes(
      target.liveActualMinutes && target.liveActualMinutes > 0
        ? target.liveActualMinutes
        : Math.max(30, Number(target.liveCommittedMinutes) || 120)
    );
    setLiveAccActualGmv(Math.max(0, Number(target.gmv30d) || 0));
    setLiveAccActualOrders(Math.max(0, Number(target.orders30d) || 0));
    setLiveAccActualViews(Math.max(0, Number(target.views30d) || 0));
    setLiveAccBonusAmount(Math.max(0, Number(target.liveBonusAmount) || 0));
    setLiveAccCustomPenalty(
      target.livePenaltyDeduction !== undefined && target.livePenaltyDeduction > 0
        ? String(target.livePenaltyDeduction)
        : ''
    );
    setLiveAccNote(target.ghiChu || '');
  };

  const handleSaveLivestreamAcceptance = (openLarkModalAfter = false) => {
    const targetItem = items.find((i) => i.id === liveAccTargetId);
    if (!targetItem) {
      onNotify?.('Vui lòng chọn Phiên Livestream cần nghiệm thu.', 'warning');
      return;
    }
    const cleanUrl = liveAccProofUrl.trim();
    if (!isValidLivestreamProofUrl(cleanUrl)) {
      onNotify?.(
        'Vui lòng nhập Link Folder Bằng chứng hợp lệ (Google Drive Folder, Lark Drive Folder, Google Sheets hoặc Link Replay TikTok/Shopee).',
        'warning'
      );
      return;
    }
    if (!liveAccActualDate) {
      onNotify?.('Vui lòng chọn Ngày phát sóng thực tế của phiên Live.', 'warning');
      return;
    }
    const durationEval = computeLivestreamDurationEvaluation(
      liveAccCommittedMinutes,
      liveAccActualMinutes,
      targetItem.chiPhiBookingNetCuoi
    );
    if (openLarkModalAfter && durationEval.status === 'FAIL_HOLD') {
      onNotify?.(
        `Phiên Live chỉ đạt ${liveAccActualMinutes}/${liveAccCommittedMinutes} phút (< 50% cam kết — BR-LIVE-02). Hệ thống giữ thanh toán chờ lịch Live bù hoặc phê duyệt ngoại lệ từ Giám đốc Marketing.`,
        'warning'
      );
      return;
    }

    const effectivePenalty =
      liveAccCustomPenalty.trim() !== ''
        ? Math.max(0, Number(liveAccCustomPenalty.replace(/\D/g, '')) || 0)
        : durationEval.autoDeductionVnd;

    let savedItem: ApprovedBookingListItem | null = null;
    updateItemsAndSync((prev) =>
      prev.map((it) => {
        if (it.id !== targetItem.id) return it;
        const updated = recalculateApprovedBookingItem({
          ...it,
          linkAir: cleanUrl,
          actualAirDate: liveAccActualDate,
          ngayDienLinkAir: getVietnamDateYmd(),
          liveStartTime: liveAccStartTime,
          liveEndTime: liveAccEndTime,
          liveSessionsCount: Math.max(1, Number(liveAccSessionsCount) || 1),
          liveCommittedMinutes: Math.max(15, Number(liveAccCommittedMinutes) || 120),
          liveActualMinutes: Math.max(0, Number(liveAccActualMinutes) || 0),
          gmv30d: Math.max(0, Number(liveAccActualGmv) || 0),
          orders30d: Math.max(0, Number(liveAccActualOrders) || 0),
          views30d: Math.max(0, Number(liveAccActualViews) || 0),
          gmv14d: Math.max(0, Number(liveAccActualGmv) || 0),
          orders14d: Math.max(0, Number(liveAccActualOrders) || 0),
          views14d: Math.max(0, Number(liveAccActualViews) || 0),
          liveBonusAmount: Math.max(0, Number(liveAccBonusAmount) || 0),
          livePenaltyDeduction: effectivePenalty,
          ghiChu: liveAccNote || it.ghiChu,
          acceptanceStatus: 'DA_NGHIEM_THU',
          trangThaiPhieuThanhToan:
            it.trangThaiPhieuThanhToan === 'Chờ nghiệm thu'
              ? 'Đủ điều kiện ĐNTT'
              : it.trangThaiPhieuThanhToan,
        });
        savedItem = updated;
        return updated;
      })
    );

    if (savedItem && onCreateOrUpdateDeals) {
      onCreateOrUpdateDeals([buildBookingDealFromApprovedItem(savedItem)]);
    }

    setIsLiveAcceptanceModalOpen(false);
    onNotify?.(
      `Đã nghiệm thu Phiên Live ${targetItem.maBooking} (@${targetItem.idKenh}) · Thời lượng ${liveAccActualMinutes}/${liveAccCommittedMinutes}p · GMV ${formatVnd(liveAccActualGmv)}.`,
      'success'
    );

    if (openLarkModalAfter && savedItem) {
      openLarkPaymentModalForItem(savedItem, 'SETTLEMENT');
    }
  };

  // Mở hộp thoại nghiệm thu (có thể truyền sẵn 1 dòng BO cụ thể hoặc mở trống để dán nhiều link)
  const openAcceptanceModalForRow = (row?: ApprovedBookingListItem) => {
    if (bookingScope === 'LIVESTREAM' || (row && isLivestreamBookingItem(row))) {
      const targetLive =
        row ||
        filteredItems.find((i) => isLivestreamBookingItem(i)) ||
        filteredItems[0];
      if (targetLive) {
        populateLiveAcceptanceFromItem(targetLive);
      }
      setIsLiveAcceptanceModalOpen(true);
      return;
    }
    setRowManualBoMap({});
    setRowFieldOverrides({});
    setStage2AddonEdits({});
    setStage2DealJobsEdits({});
    setStage2ActiveJobIdxMap({});
    if (row) {
      setSelectedTargetBoItemId(row.id);
      setAcceptanceBulkText(buildSampleLineForItem(row, 0));
      if (row.actualAirDate) {
        setDefaultAcceptanceAirDate(row.actualAirDate);
      } else if (row.plannedAirDate) {
        setDefaultAcceptanceAirDate(row.plannedAirDate);
      }
    } else {
      setSelectedTargetBoItemId('AUTO');
      setAcceptanceBulkText('');
    }
    setIsAcceptanceModalOpen(true);
  };

  // Khi nhân viên chọn 1 Mã BO cụ thể từ dropdown trên đầu hộp thoại Nghiệm thu
  const handleSelectTargetBoInModal = (nextBoItemId: string) => {
    setSelectedTargetBoItemId(nextBoItemId);
    setRowFieldOverrides({});
    if (nextBoItemId === 'AUTO') {
      setRowManualBoMap({});
      return;
    }
    const targetItem = items.find((i) => i.id === nextBoItemId);
    if (!targetItem) return;
    setRowManualBoMap({ 0: targetItem.id });
    const currentLines = acceptanceBulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (currentLines.length <= 1) {
      setAcceptanceBulkText(buildSampleLineForItem(targetItem, 0));
      if (targetItem.actualAirDate) {
        setDefaultAcceptanceAirDate(targetItem.actualAirDate);
      } else if (targetItem.plannedAirDate) {
        setDefaultAcceptanceAirDate(targetItem.plannedAirDate);
      }
    }
  };

  const updateDraftRowField = <
    K extends 'actualAirDate' | 'sparkAdsCode' | 'views30d' | 'gmv30d' | 'orders30d'
  >(
    rowIdx: number,
    field: K,
    value: ParsedAcceptanceDraftRow[K]
  ) => {
    setRowFieldOverrides((prev) => ({
      ...prev,
      [rowIdx]: {
        ...(prev[rowIdx] || {}),
        [field]: value,
      },
    }));
  };

  // Phân tích từng dòng người dùng dán vào và tự động tìm kênh KOC hoặc khớp theo Mã BO đã chọn
  const parsedAcceptanceRows: ParsedAcceptanceDraftRow[] = useMemo(() => {
    const lines = acceptanceBulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    return lines.map((line, idx) => {
      // Hỗ trợ định dạng: [Mã_BO |] Link_TikTok | Mã_Spark_Ads | Views | GMV | Đơn_hàng | Ngày_Air
      const rawParts = line.split(/[|\t]/).map((p) => p.trim());
      const boMatchInLine = line.match(/\b(BO\d{4,12}[A-Za-z0-9_-]*)\b/i);
      const explicitBoCode = boMatchInLine ? boMatchInLine[1].toUpperCase() : undefined;

      // Nếu cột đầu tiên là mã BO (VD: BO26100101 | https://...), dịch các cột sau sang
      const parts =
        rawParts[0] && /^BO\d+/i.test(rawParts[0]) && rawParts.length > 1
          ? rawParts.slice(1)
          : rawParts;

      const extracted = extractTikTokChannelAndVideoFromInput(parts[0] || line);
      const cleanHandle = extracted.channelHandle.toLowerCase();

      const manualBoItemId =
        rowManualBoMap[idx] ||
        (selectedTargetBoItemId !== 'AUTO' && lines.length === 1
          ? selectedTargetBoItemId
          : undefined);

      const matchedItem =
        (manualBoItemId
          ? items.find((it) => it.id === manualBoItemId)
          : undefined) ||
        (explicitBoCode
          ? items.find(
              (it) => (it.maBooking || '').trim().toUpperCase() === explicitBoCode
            )
          : undefined) ||
        items.find(
          (it) =>
            cleanHandle &&
            normalizeTikTokId(it.idKenh).toLowerCase() === cleanHandle &&
            (selectedStore === 'ALL' || it.storeName === selectedStore) &&
            (selectedMonth === 'ALL' || it.thangPlan === selectedMonth) &&
            it.acceptanceStatus === 'CHUA_NGHIEM_THU'
        ) ||
        items.find(
          (it) =>
            cleanHandle &&
            normalizeTikTokId(it.idKenh).toLowerCase() === cleanHandle &&
            (selectedStore === 'ALL' || it.storeName === selectedStore) &&
            (selectedMonth === 'ALL' || it.thangPlan === selectedMonth)
        ) ||
        items.find(
          (it) =>
            cleanHandle &&
            normalizeTikTokId(it.idKenh).toLowerCase() === cleanHandle
        );

      const effectiveHandle =
        extracted.channelHandle || matchedItem?.idKenh || '';

      const override = rowFieldOverrides[idx] || {};

      const sparkAdsCode =
        override.sparkAdsCode !== undefined
          ? override.sparkAdsCode
          : parts[1] || matchedItem?.sparkAdsCode || '';
      const views30d =
        override.views30d !== undefined
          ? override.views30d
          : Number((parts[2] || '').replace(/[^0-9]/g, '')) ||
            matchedItem?.views30d ||
            0;
      const gmv30d =
        override.gmv30d !== undefined
          ? override.gmv30d
          : Number((parts[3] || '').replace(/[^0-9]/g, '')) ||
            matchedItem?.gmv30d ||
            0;
      const orders30d =
        override.orders30d !== undefined
          ? override.orders30d
          : Number((parts[4] || '').replace(/[^0-9]/g, '')) ||
            matchedItem?.orders30d ||
            0;
      const actualAirDate =
        override.actualAirDate !== undefined
          ? override.actualAirDate
          : parts[5] && /^\d{4}-\d{2}-\d{2}$/.test(parts[5])
          ? parts[5]
          : matchedItem?.actualAirDate ||
            matchedItem?.plannedAirDate ||
            defaultAcceptanceAirDate;

      return {
        rawLine: line,
        channelHandle: effectiveHandle,
        explicitBoCode,
        linkAir: extracted.cleanUrl,
        videoId: extracted.videoId,
        actualAirDate,
        sparkAdsCode,
        views30d,
        gmv30d,
        orders30d,
        matchedItem,
      };
    });
  }, [
    acceptanceBulkText,
    items,
    selectedStore,
    selectedMonth,
    defaultAcceptanceAirDate,
    rowManualBoMap,
    rowFieldOverrides,
    selectedTargetBoItemId,
  ]);

  // Thống kê tổng hợp trong hộp thoại Nghiệm thu Video
  const acceptanceModalStats = useMemo(() => {
    const total = parsedAcceptanceRows.length;
    const matchedCount = parsedAcceptanceRows.filter((r) => Boolean(r.matchedItem)).length;
    let onTimeCount = 0;
    let totalCost = 0;
    let totalGmv = 0;
    let winnerCount = 0;

    parsedAcceptanceRows.forEach((r) => {
      const cost = r.matchedItem?.chiPhiBookingNetCuoi || 0;
      totalCost += cost;
      totalGmv += r.gmv30d;
      const sla = computeAirSlaStatus(r.matchedItem?.plannedAirDate || '', r.actualAirDate);
      if (sla.statusText === 'Đúng hạn' || sla.statusText.startsWith('Sớm')) {
        onTimeCount += 1;
      }
      const roi = cost > 0 ? r.gmv30d / cost : 0;
      if (roi >= 3 || (cost === 0 && r.gmv30d > 0)) {
        winnerCount += 1;
      }
    });

    const avgRoi = totalCost > 0 ? Number((totalGmv / totalCost).toFixed(2)) : 0;
    return {
      total,
      matchedCount,
      onTimeCount,
      totalCost,
      totalGmv,
      avgRoi,
      winnerCount,
    };
  }, [parsedAcceptanceRows]);

  // Quét thông tin thật từ TikTok cho các link đã dán (bắt @handle, views thật, ngày đăng thật, giỏ hàng, kịch bản)
  const handleInspectRealTikTokVideos = async () => {
    if (parsedAcceptanceRows.length === 0) return;
    const validUrls = parsedAcceptanceRows
      .map((r) => r.linkAir)
      .filter((u) => u.startsWith('http'));
    if (validUrls.length === 0) {
      onNotify?.('Vui lòng dán ít nhất 1 đường link video TikTok hợp lệ (https://...).', 'warning');
      return;
    }

    setIsInspectingTikTokLinks(true);
    try {
      const firstMatched = parsedAcceptanceRows.find((r) => r.matchedItem)?.matchedItem;
      const res = await fetch('/api/integrations/tiktok-koc/inspect-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: validUrls,
          dealCode: firstMatched?.maBooking || undefined,
          expectedHandle: firstMatched?.idKenh || undefined,
          expectedDeadline: firstMatched?.plannedAirDate || undefined,
          brandName: firstMatched?.brandName || undefined,
        }),
      });

      if (!res.ok) {
        onNotify?.('Không thể quét dữ liệu từ link TikTok lúc này.', 'warning');
        return;
      }

      const json = await res.json();
      const fetchedResults: TikTokVideoInspectionResult[] = Array.isArray(json?.data)
        ? json.data
        : [];

      if (fetchedResults.length === 0) {
        onNotify?.('Không tìm thấy dữ liệu video từ đường link đã dán.', 'warning');
        return;
      }

      const nextInspectedMap: Record<string, TikTokVideoInspectionResult> = {
        ...inspectedVideosMap,
      };
      fetchedResults.forEach((insp) => {
        if (insp.videoId) nextInspectedMap[insp.videoId] = insp;
        if (insp.authorHandle) {
          nextInspectedMap[normalizeTikTokId(insp.authorHandle).toLowerCase()] = insp;
        }
      });
      setInspectedVideosMap(nextInspectedMap);

      const updatedLines = parsedAcceptanceRows.map((row) => {
        const insp =
          (row.videoId ? nextInspectedMap[row.videoId] : undefined) ||
          (row.channelHandle
            ? nextInspectedMap[normalizeTikTokId(row.channelHandle).toLowerCase()]
            : undefined) ||
          fetchedResults.find((f) => f.inputUrl === row.linkAir);

        if (!insp) return row.rawLine;

        const handle = normalizeTikTokId(insp.authorHandle || row.channelHandle);
        const canonicalUrl =
          handle && insp.videoId
            ? `https://www.tiktok.com/@${handle}/video/${insp.videoId}`
            : insp.resolvedUrl || row.linkAir;
        const views = insp.viewsCount > 0 ? insp.viewsCount : row.views30d;
        const spark =
          insp.sparkAdsVerification?.sparkAdsCode || row.sparkAdsCode;
        const airDate =
          insp.publishedDate && /^\d{4}-\d{2}-\d{2}$/.test(insp.publishedDate)
            ? insp.publishedDate
            : row.actualAirDate;

        return `${canonicalUrl} | ${spark} | ${views} | ${row.gmv30d} | ${row.orders30d} | ${airDate}`;
      });

      setRowFieldOverrides({});
      setAcceptanceBulkText(updatedLines.join('\n'));
      onNotify?.(
        `Đã quét ${fetchedResults.length} video TikTok: cập nhật @id_kênh, lượt xem, ngày đăng, giỏ hàng & đối soát kịch bản.`,
        'success'
      );
    } catch {
      onNotify?.('Lỗi kết nối khi quét thông tin video TikTok.', 'error');
    } finally {
      setIsInspectingTikTokLinks(false);
    }
  };

  // Xác nhận nghiệm thu & tự động điền vào Bảng List Duyệt Book + Sheet Listing Brand + Quản lý Booking
  const handleConfirmVideoAcceptanceMapping = () => {
    const validInputs: VideoAcceptanceMappingInput[] = parsedAcceptanceRows
      .filter((r) => r.channelHandle || r.matchedItem)
      .map((r) => ({
        channelHandle: r.channelHandle || r.matchedItem?.idKenh || '',
        linkAir: r.linkAir,
        videoId: r.videoId,
        actualAirDate: r.actualAirDate,
        sparkAdsCode: r.sparkAdsCode,
        views30d: r.views30d,
        gmv30d: r.gmv30d,
        orders30d: r.orders30d,
        storeNameFilter: selectedStore,
        thangPlanFilter: selectedMonth,
        targetItemId: r.matchedItem?.id,
        targetBookingCode: r.explicitBoCode || r.matchedItem?.maBooking || undefined,
      }));

    if (validInputs.length === 0) {
      onNotify?.(
        'Vui lòng chọn Mã Booking Order (BO) hoặc dán link video TikTok có @id_kênh hợp lệ.',
        'warning'
      );
      return;
    }

    const result = autoMapVideoAcceptanceByKocChannel({
      acceptances: validInputs,
      allKocs: kocs,
      allStores: stores,
      allDeals: deals,
    });

    // Áp dụng cập nhật Nghiệm thu Bước 2 (theo từng Bảng công việc Job & Dịch vụ gia tăng) sau khi Bước 1 Video đã nghiệm thu
    let finalUpdatedList = result.updatedList;
    let finalUpdatedApprovedItems = result.updatedApprovedItems;

    if (
      Object.keys(stage2AddonEdits).length > 0 ||
      Object.keys(stage2DealJobsEdits).length > 0
    ) {
      const modifiedItems: ApprovedBookingListItem[] = [];
      finalUpdatedList = finalUpdatedList.map((it) => {
        const editedJobs = stage2DealJobsEdits[it.id];
        const editedAddons = stage2AddonEdits[it.id];
        if (!editedJobs && !editedAddons) return it;
        const nextJobs = editedJobs
          ? editedJobs.map((j, jIdx) =>
              jIdx === 0
                ? {
                    ...j,
                    linkAir: j.linkAir || it.linkAir,
                    actualAirDate: j.actualAirDate || it.actualAirDate,
                    sparkAdsCode: j.sparkAdsCode || it.sparkAdsCode,
                  }
                : j
            )
          : it.dealJobs;
        const primaryAddons =
          editedJobs && editedJobs.length > 0
            ? editedJobs.flatMap((j) => j.addonServices || [])
            : editedAddons || it.addonServices;
        const recalc = recalculateApprovedBookingItem({
          ...it,
          dealJobs: nextJobs,
          addonServices: primaryAddons,
        });
        modifiedItems.push(recalc);
        return recalc;
      });
      saveApprovedBookingList(finalUpdatedList, true);
      if (modifiedItems.length > 0) {
        syncApprovedItemsBackToStaffBrandSheets(modifiedItems, kocs, stores, deals);
        const modMap = new Map(modifiedItems.map((m) => [m.id, m]));
        finalUpdatedApprovedItems = finalUpdatedApprovedItems.map(
          (u) => modMap.get(u.id) || u
        );
        modifiedItems.forEach((m) => {
          if (!finalUpdatedApprovedItems.some((u) => u.id === m.id)) {
            finalUpdatedApprovedItems.push(m);
          }
        });
      }
    }

    setItems(finalUpdatedList);

    if (finalUpdatedApprovedItems.length > 0 && onCreateOrUpdateDeals) {
      const dealsToSync = finalUpdatedApprovedItems.map((it) =>
        buildBookingDealFromApprovedItem(it)
      );
      onCreateOrUpdateDeals(dealsToSync);
    }

    // Tự động đăng ký hàng loạt các videoId vừa nghiệm thu vào Kho lịch sử Video Ads & KOC tuần (/api/koc-video-history) trong 1 request
    const videosToRegister = result.updatedApprovedItems
      .filter((it) => Boolean(it.videoId || it.linkAir))
      .map((it) => ({
        videoId: it.videoId,
        linkAir: it.linkAir,
        dealCode: it.maBooking,
        kocChannelId: it.idKenh,
        kocStageName: it.tenKenh,
        brandName: it.brandName,
        storeName: it.storeName,
        productName: it.sanPham,
        airDate: it.actualAirDate,
        weekKey: it.tuanReal ? `2026-${it.tuanReal}` : '2026-W42',
        pic: it.nguoiPhuTrach,
        klGrade: it.klGrade,
        bookingCostNet: it.chiPhiBookingNetCuoi,
        sparkAdsCode: it.sparkAdsCode,
        initialGmv: it.gmv30d,
        initialOrders: it.orders30d,
        initialViews: it.views30d,
        source: 'SYSTEM_BOOKING',
      }));
    if (videosToRegister.length > 0) {
      void fetch('/api/koc-video-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REGISTER_VIDEOS_BATCH',
          compactResponse: true,
          videos: videosToRegister,
        }),
      }).catch(() => {});
    }

    setIsAcceptanceModalOpen(false);
    onNotify?.(
      `Đã tự động khớp kênh KOC và điền nghiệm thu cho ${result.matchedCount} video (đồng bộ cả List duyệt book, Sheet Brand & Quản lý Booking).${
        result.unmatchedHandles.length > 0
          ? ` Chưa tìm thấy kênh: ${result.unmatchedHandles.join(', ')}`
          : ''
      }`,
      result.matchedCount > 0 ? 'success' : 'warning'
    );
  };

  // ============================================================================
  // ĐỐI SOÁT THANH TOÁN THEO DEAL & TẠO LUỒNG PHÊ DUYỆT LARK APPROVAL
  // ============================================================================
  const [isLarkPaymentModalOpen, setIsLarkPaymentModalOpen] = useState<boolean>(false);
  const [larkPaymentInitialItem, setLarkPaymentInitialItem] =
    useState<ApprovedBookingListItem | null>(null);
  const [larkPaymentInitialItems, setLarkPaymentInitialItems] =
    useState<ApprovedBookingListItem[]>([]);
  const [larkPaymentRequestType, setLarkPaymentRequestType] = useState<
    'ADVANCE' | 'SETTLEMENT' | undefined
  >(undefined);

  const dealsForLarkModal = useMemo(() => {
    const dealMap = new Map<string, BookingDealItem>();
    deals.forEach((d) => {
      dealMap.set(d.id, d);
    });
    items.forEach((it) => {
      const built = buildBookingDealFromApprovedItem(it);
      dealMap.set(built.id, built);
    });
    return Array.from(dealMap.values());
  }, [deals, items]);

  const openLarkPaymentModalForItem = (
    item?: ApprovedBookingListItem,
    reqType?: 'ADVANCE' | 'SETTLEMENT'
  ) => {
    setLarkPaymentRequestType(reqType);
    if (item) {
      setLarkPaymentInitialItem(item);
      setLarkPaymentInitialItems([item]);
      setIsLarkPaymentModalOpen(true);
      return;
    }
    const checkedRows =
      selectedIds.length > 0
        ? filteredItems.filter((i) => selectedIds.includes(i.id))
        : [];
    const candidate =
      checkedRows[0] ||
      filteredItems.find(
        (i) => i.sequentialAcceptanceStage === '3_DA_NGHIEM_THU_TOAN_DEAL'
      ) ||
      filteredItems.find((i) => i.bookingOrderCreated) ||
      filteredItems[0] ||
      null;
    // Nếu người dùng tích chọn nhiều dòng của cùng 1 KOC thì gom sẵn vào 1 phiếu ĐNTT
    const bundledRows =
      checkedRows.length > 1 && candidate
        ? checkedRows.filter(
            (r) =>
              normalizeTikTokId(r.idKenh).toLowerCase() ===
                normalizeTikTokId(candidate.idKenh).toLowerCase() ||
              (r.kocId && r.kocId === candidate.kocId)
          )
        : candidate
        ? [candidate]
        : [];
    setLarkPaymentInitialItem(candidate);
    setLarkPaymentInitialItems(bundledRows);
    setIsLarkPaymentModalOpen(true);
  };

  const handleSaveAcceptanceAndOpenLarkApproval = () => {
    const firstMatched =
      parsedAcceptanceRows.find((r) => r.matchedItem)?.matchedItem || null;
    handleConfirmVideoAcceptanceMapping();
    const refreshedList = loadApprovedBookingList(kocs, stores, deals, currentUserName);
    const updatedTarget = firstMatched
      ? refreshedList.find((x) => x.id === firstMatched.id) || firstMatched
      : refreshedList.find(
          (x) => x.sequentialAcceptanceStage === '3_DA_NGHIEM_THU_TOAN_DEAL'
        ) || null;
    setLarkPaymentInitialItem(updatedTarget);
    setIsLarkPaymentModalOpen(true);
  };

  const handleLarkPaymentSuccess = (
    updatedDeals: BookingDealItem[],
    createdSlip: LarkPaymentRequestSlip
  ) => {
    const dealCodesInSlip = new Set(
      createdSlip.lineItems.map((l) => l.dealCode.toUpperCase())
    );
    const dealIdsInSlip = new Set(createdSlip.lineItems.map((l) => l.dealId));

    const changedRows: ApprovedBookingListItem[] = [];
    updateItemsAndSync((prev) =>
      prev.map((it) => {
        const matchCode =
          it.maBooking && dealCodesInSlip.has(it.maBooking.toUpperCase());
        const matchId =
          dealIdsInSlip.has(`deal-from-32-${it.id}`) ||
          (it.linkedDealId ? dealIdsInSlip.has(it.linkedDealId) : false);
        if (!matchCode && !matchId) return it;

        const slipLine = createdSlip.lineItems.find(
          (l) =>
            (it.maBooking && l.dealCode.toUpperCase() === it.maBooking.toUpperCase()) ||
            l.dealId === `deal-from-32-${it.id}` ||
            (it.linkedDealId ? l.dealId === it.linkedDealId : false)
        );

        const isAdvanceSlip = createdSlip.requestType === 'ADVANCE';
        const approvalStatus = createdSlip.larkSync.approvalStatus;

        if (isAdvanceSlip) {
          const advanceAmt = slipLine
            ? slipLine.netTransferAmount
            : createdSlip.totals.netTransferTotal;
          const nextAdvStatus =
            approvalStatus === 'PAID'
              ? 'ĐÃ_CHI_TẠM_ỨNG'
              : approvalStatus === 'APPROVED'
              ? 'ĐÃ_DUYỆT_TẠM_ỨNG'
              : approvalStatus === 'REJECTED'
              ? 'TỪ_CHỐI_TẠM_ỨNG'
              : 'CHỜ_DUYỆT_TẠM_ỨNG';
          const recalc = recalculateApprovedBookingItem({
            ...it,
            nganHang: createdSlip.payee.bankName || it.nganHang,
            soTaiKhoan: createdSlip.payee.bankAccount || it.soTaiKhoan,
            tenTaiKhoanNganHang:
              createdSlip.payee.bankHolder || it.tenTaiKhoanNganHang,
            soCccd: createdSlip.payee.legalId || it.soCccd,
            soTienTamUngTruoc:
              approvalStatus === 'REJECTED' ? it.soTienTamUngTruoc : advanceAmt,
            larkAdvanceSlipCode: createdSlip.slipCode,
            larkAdvanceInstanceCode: createdSlip.larkSync.approvalInstanceCode,
            larkAdvanceStatus: nextAdvStatus,
            loaiThanhToanLark: createdSlip.larkPaymentCategory,
            isBrandBudgetAdvance: Boolean(createdSlip.isBrandBudgetAdvance),
            larkApprovalRouteSummary: createdSlip.approvalRoute.routeSummary,
            larkSyncedAt: createdSlip.larkSync.syncedAt,
          });
          changedRows.push(recalc);
          return recalc;
        }

        const nextPaymentStatus: ApprovedBookingPaymentStatus =
          approvalStatus === 'PAID'
            ? 'Đã thanh toán'
            : approvalStatus === 'REJECTED'
            ? 'Đủ điều kiện ĐNTT'
            : 'Đã lập ĐNTT';
        const recalc = recalculateApprovedBookingItem({
          ...it,
          nganHang: createdSlip.payee.bankName || it.nganHang,
          soTaiKhoan: createdSlip.payee.bankAccount || it.soTaiKhoan,
          tenTaiKhoanNganHang:
            createdSlip.payee.bankHolder || it.tenTaiKhoanNganHang,
          soCccd: createdSlip.payee.legalId || it.soCccd,
          trangThaiPhieuThanhToan: nextPaymentStatus,
          soTienDaThanhToan:
            approvalStatus === 'PAID' && slipLine
              ? slipLine.netTransferAmount
              : it.soTienDaThanhToan,
          loaiThanhToanLark: createdSlip.larkPaymentCategory,
          isBrandBudgetAdvance: Boolean(createdSlip.isBrandBudgetAdvance),
          daDiTien: Boolean(createdSlip.larkSync.daDiTien || approvalStatus === 'PAID'),
          uncBillCode: createdSlip.larkSync.uncBillCode || it.uncBillCode,
          uncSentToKocAt: createdSlip.larkSync.uncSentToKocAt || it.uncSentToKocAt,
          larkApprovalInstanceCode: createdSlip.larkSync.approvalInstanceCode,
          larkSlipCode: createdSlip.slipCode,
          larkApprovalStatus: approvalStatus,
          larkApprovalRouteSummary: createdSlip.approvalRoute.routeSummary,
          larkSyncedAt: createdSlip.larkSync.syncedAt,
        });
        changedRows.push(recalc);
        return recalc;
      })
    );

    if (changedRows.length > 0) {
      syncApprovedItemsBackToStaffBrandSheets(changedRows, kocs, stores, deals);
    }
    if (onCreateOrUpdateDeals) {
      onCreateOrUpdateDeals(updatedDeals);
    }
    onNotify?.(
      `Đã đồng bộ Lark Approval (${createdSlip.larkPaymentCategory}): ${createdSlip.larkSync.approvalInstanceCode} (${createdSlip.slipCode}) — trạng thái ${createdSlip.larkSync.approvalStatus}.`,
      createdSlip.larkSync.approvalStatus === 'REJECTED' ? 'warning' : 'success'
    );
  };

  const handleCopyTsv = async (includeHeaders = true) => {
    const target =
      selectedIds.length > 0
        ? filteredItems.filter((i) => selectedIds.includes(i.id))
        : filteredItems;
    if (target.length === 0) {
      onNotify?.('Chưa có dòng dữ liệu nào để copy.', 'warning');
      return;
    }
    try {
      const tsv = formatApprovedBookingListToTsv(target, includeHeaders, canViewFullPii);
      await navigator.clipboard.writeText(tsv);
      onNotify?.(
        `Đã copy ${target.length} dòng chuẩn File 3.2 List duyệt book (${
          includeHeaders ? 'kèm tiêu đề cột' : 'chỉ dữ liệu'
        }) — bấm Ctrl+V vào Google Sheet / Excel.`,
        'success'
      );
    } catch {
      onNotify?.('Không thể truy cập Clipboard trình duyệt.', 'error');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((i) => i.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const listColumns = useMemo<Column<ApprovedBookingListItem>[]>(
    () => [
      {
        key: 'koc',
        header:
          bookingScope === 'LIVESTREAM'
            ? 'Host / KOC Livestream'
            : 'KOC & Kênh phát sóng',
        width: 210,
        render: (item) => (
          <Person
            name={item.tenKenh || item.idKenh}
            sub={
              bookingScope === 'LIVESTREAM'
                ? `@${item.idKenh.replace(/^@/, '')} · ${item.klGrade || 'KL5'} · ${item.liveSessionsCount || 1} phiên`
                : `@${item.idKenh.replace(/^@/, '')} · ${item.klGrade || 'KL3'}`
            }
            size={28}
          />
        ),
      },
      {
        key: 'deal',
        header:
          bookingScope === 'LIVESTREAM'
            ? 'Mã Phiên Live · Xác nhận 3 bên & HĐ'
            : 'Mã Deal · HĐ / PL / BBNT & Link',
        width: 255,
        render: (item) => {
          const jobs = ensureDealJobsForApprovedItem(item);
          const isLive = bookingScope === 'LIVESTREAM' || isLivestreamBookingItem(item);
          return (
            <div className="leading-tight space-y-1" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-code font-semibold text-ink">
                    {item.maBooking || (isLive ? 'Chưa cấp mã LIVE' : 'Chưa cấp mã BO')}
                  </span>
                  {isLive ? (
                    <span className="px-2 py-0.2 rounded text-2xs font-code font-semibold bg-accent-soft text-accent">
                      {item.liveStartTime || '20:00'}–{item.liveEndTime || '22:00'} ({item.liveCommittedMinutes || 120}p)
                    </span>
                  ) : (
                    <span
                      className={`px-2 py-0.2 rounded text-2xs font-code font-semibold ${
                        jobs.length > 1
                          ? 'bg-accent/15 text-accent border border-accent/30'
                          : 'bg-sunken text-ink-3'
                      }`}
                      title={jobs
                        .map(
                          (j, i) =>
                            `#${i + 1} (${j.jobCode}): ${j.productName} — Net ${formatVndShort(
                              j.videoAssetNetCost
                            )}`
                        )
                        .join('\n')}
                    >
                      {jobs.length} {jobs.length > 1 ? 'Jobs' : 'Job'}
                    </span>
                  )}
                </div>
                {item.contractAppendixStatus === 'ĐÃ_KÝ' ? (
                  <span className="text-2xs px-2 py-0.5 rounded bg-positive-soft text-positive font-medium">
                    {isLive ? 'HĐ Live đã ký' : 'PL đã ký'}
                  </span>
                ) : null}
              </div>

              {isLive ? (
                <div className="flex items-center gap-1.5 flex-wrap text-2xs">
                  <span
                    className={`px-1.5 py-0.2 rounded font-medium ${
                      item.liveKocConfirmed
                        ? 'bg-positive-soft text-positive'
                        : 'bg-sunken text-ink-3'
                    }`}
                  >
                    KOC {item.liveKocConfirmed ? '✓' : '—'}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded font-medium ${
                      item.liveBrandConfirmed
                        ? 'bg-positive-soft text-positive'
                        : 'bg-sunken text-ink-3'
                    }`}
                  >
                    Brand {item.liveBrandConfirmed ? '✓' : '—'}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded font-medium ${
                      item.liveLeaderConfirmed
                        ? 'bg-positive-soft text-positive'
                        : 'bg-sunken text-ink-3'
                    }`}
                  >
                    Leader {item.liveLeaderConfirmed ? '✓' : '—'}
                  </span>
                </div>
              ) : (
                jobs.length > 1 && (
                  <div
                    className="text-2xs font-code text-accent truncate max-w-[235px]"
                    title={jobs.map((j) => `${j.jobCode}: ${j.productName}`).join(' · ')}
                  >
                    {jobs.map((j) => `${j.jobCode.replace(/^.*-J/, 'J')}: ${j.productName}`).join(' · ')}
                  </div>
                )
              )}

              {/* 1. HĐNT */}
              <div className="flex items-center justify-between gap-1 text-2xs">
                <span className="font-code text-ink-2 truncate max-w-[140px]" title={item.masterContractCode}>
                  HĐ: {item.masterContractCode || 'Chưa gắn'}
                </span>
                <span className="inline-flex items-center gap-2 shrink-0">
                  {item.masterContractGoogleDocsUrl && (
                    <a
                      href={item.masterContractGoogleDocsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:underline font-medium"
                      title="Mở Google Docs HĐNT"
                    >
                      GDocs↗
                    </a>
                  )}
                  {item.masterContractSignedUrl && (
                    <a
                      href={item.masterContractSignedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-positive hover:underline font-medium"
                      title="Mở bản HĐNT đã ký"
                    >
                      Bản ký↗
                    </a>
                  )}
                </span>
              </div>

              {/* 2. Phụ lục SOW (PL) */}
              <div className="flex items-center justify-between gap-1 text-2xs">
                <span className="font-code text-ink-2 truncate max-w-[140px]" title={item.contractAppendixCode}>
                  PL: {item.contractAppendixCode || (item.maBooking ? `PL-${item.maBooking}-01` : 'Chưa lập')}
                </span>
                <span className="inline-flex items-center gap-2 shrink-0">
                  {item.contractAppendixGoogleDocsUrl && (
                    <a
                      href={item.contractAppendixGoogleDocsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:underline font-medium"
                      title="Mở Google Docs Phụ lục SOW"
                    >
                      GDocs↗
                    </a>
                  )}
                  {item.contractAppendixSignedUrl && (
                    <a
                      href={item.contractAppendixSignedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-positive hover:underline font-medium"
                      title="Mở bản Phụ lục SOW đã ký"
                    >
                      Bản ký↗
                    </a>
                  )}
                </span>
              </div>

              {/* 3. BBNT */}
              <div className="flex items-center justify-between gap-1 text-2xs">
                <span className="font-code text-ink-3 truncate max-w-[140px]" title={item.bbntCode}>
                  BBNT: {item.bbntCode || (item.acceptanceStatus === 'DA_NGHIEM_THU' && item.maBooking ? `BBNT-${item.maBooking}` : '—')}
                </span>
                <span className="inline-flex items-center gap-2 shrink-0">
                  {item.bbntGoogleDocsUrl && (
                    <a
                      href={item.bbntGoogleDocsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:underline font-medium"
                      title="Mở Google Docs BBNT"
                    >
                      GDocs↗
                    </a>
                  )}
                  {item.bbntSignedUrl && (
                    <a
                      href={item.bbntSignedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-positive hover:underline font-medium"
                      title="Mở bản BBNT đã ký"
                    >
                      Bản ký↗
                    </a>
                  )}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        key: 'store',
        header:
          bookingScope === 'LIVESTREAM'
            ? 'Gian hàng · Rổ hàng & Voucher Live'
            : 'Gian hàng & Sản phẩm',
        width: 215,
        render: (item) => (
          <div className="leading-tight space-y-0.5">
            <div className="font-medium text-ink truncate max-w-[205px]">
              {item.storeName}
            </div>
            <div
              className="text-2xs text-ink-2 truncate max-w-[205px]"
              title={item.sanPham}
            >
              {item.sanPham || item.brandName} · {item.thangPlan}
            </div>
            {bookingScope === 'LIVESTREAM' && (item.liveDealPriceInfo || item.liveVoucherInfo) && (
              <div
                className="text-2xs text-ink-3 truncate max-w-[205px]"
                title={`${item.liveDealPriceInfo || ''} · ${item.liveVoucherInfo || ''}`}
              >
                {item.liveDealPriceInfo || item.liveVoucherInfo}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'cost',
        header:
          bookingScope === 'LIVESTREAM'
            ? 'Cát-xê Net · Hoa hồng & Ads'
            : 'Chi phí Net / Gross',
        align: 'right',
        width: 165,
        render: (item) => {
          const jobs = ensureDealJobsForApprovedItem(item);
          return (
            <div className="leading-tight space-y-0.5 tabular-nums">
              <div className="font-semibold text-ink">
                {formatVnd(item.chiPhiBookingNetCuoi)}
              </div>
              <div className="text-2xs text-ink-3">
                Gross {formatVndShort(item.chiPhiGrossKemThue)}
                {item.soTienTamUngTruoc > 0
                  ? ` · Ứng ${formatVndShort(item.soTienTamUngTruoc)}`
                  : ''}
              </div>
              {bookingScope === 'LIVESTREAM' ? (
                <div className="text-2xs font-code text-accent">
                  HH {item.liveCommissionPct ?? 15}%
                  {item.liveAdsBudget ? ` · Ads ${formatVndShort(item.liveAdsBudget)}` : ''}
                </div>
              ) : (
                jobs.length > 1 && (
                  <div
                    className="text-2xs text-ink-3 font-code truncate max-w-[150px]"
                    title={jobs
                      .map((j) => `${j.jobCode}: ${formatVndShort(j.videoAssetNetCost)}`)
                      .join(' + ')}
                  >
                    {jobs
                      .map((j) => `${j.jobCode.replace(/^.*-J/, 'J')}: ${formatVndShort(j.videoAssetNetCost)}`)
                      .join(' + ')}
                  </div>
                )
              )}
            </div>
          );
        },
      },
      {
        key: 'air',
        header:
          bookingScope === 'LIVESTREAM'
            ? 'Lịch Live · Thời lượng & KPI GMV'
            : 'Lịch Air & Hiệu quả 30d',
        width: 195,
        render: (item) => {
          if (bookingScope === 'LIVESTREAM') {
            const targetGmv = item.liveTargetGmv || 0;
            const actualGmv = item.gmv30d || 0;
            const kpiPct = targetGmv > 0 ? Math.round((actualGmv / targetGmv) * 100) : 0;
            return (
              <div className="leading-tight space-y-0.5 tabular-nums">
                <div className="font-code text-xs text-ink">
                  {item.actualAirDate
                    ? `${formatDate(item.actualAirDate)} · ${item.liveStartTime || '20:00'}–${item.liveEndTime || '22:00'}`
                    : item.plannedAirDate
                    ? `Dự kiến ${formatDate(item.plannedAirDate)} (${item.liveStartTime || '20:00'})`
                    : 'Chưa chốt lịch Live'}
                </div>
                <div className="text-2xs text-ink-2">
                  {item.liveActualMinutes
                    ? `Đã live ${item.liveActualMinutes}/${item.liveCommittedMinutes || 120} phút`
                    : `Cam kết ${item.liveCommittedMinutes || 120} phút (${item.liveKpiType === 'Cam kết' ? 'KPI Cam kết' : 'Tham chiếu'})`}
                </div>
                <div className="text-2xs text-ink-3 truncate max-w-[185px]">
                  {actualGmv > 0
                    ? `GMV ${formatVndShort(actualGmv)} / ${formatVndShort(targetGmv)} (${kpiPct}%) · ${item.orders30d || 0} đơn`
                    : targetGmv > 0
                    ? `KPI GMV: ${formatVndShort(targetGmv)} (${item.liveTargetOrders || 0} đơn)`
                    : item.trangThaiSlaAir}
                </div>
              </div>
            );
          }
          const jobs = ensureDealJobsForApprovedItem(item);
          const hasMultipleJobs = jobs.length > 1;
          const airedJobsCount = jobs.filter((j) =>
            Boolean(j.linkAir?.trim() || j.actualAirDate?.trim())
          ).length;

          return (
            <div className="leading-tight space-y-0.5 tabular-nums">
              {hasMultipleJobs ? (
                <>
                  <div
                    className="font-code text-xs text-ink truncate max-w-[175px]"
                    title={jobs
                      .map(
                        (j) =>
                          `${j.jobCode}: ${
                            j.actualAirDate
                              ? `Đã air ${formatDate(j.actualAirDate)}`
                              : `Dự kiến ${j.plannedAirDate ? formatDate(j.plannedAirDate) : '—'}`
                          }`
                      )
                      .join('\n')}
                  >
                    {jobs
                      .map(
                        (j) =>
                          `${j.jobCode.replace(/^.*-J/, 'J')}: ${
                            j.actualAirDate
                              ? '✓'
                              : j.plannedAirDate
                              ? formatDate(j.plannedAirDate).slice(0, 5)
                              : '—'
                          }`
                      )
                      .join(' · ')}
                  </div>
                  <div className="text-2xs text-ink-3 truncate max-w-[175px]">
                    {airedJobsCount}/{jobs.length} Job đã air
                    {item.gmv30d > 0 ? ` · GMV ${formatVndShort(item.gmv30d)}` : ''}
                  </div>
                </>
              ) : (
                <>
                  <div
                    className="font-code text-ink"
                    onClick={(e) => {
                      if (!item.actualAirDate && !isReadOnlyPartnerRole && item.contractAppendixStatus !== 'ĐÃ_KÝ') {
                        e.stopPropagation();
                      }
                    }}
                  >
                    {item.actualAirDate ? (
                      formatDate(item.actualAirDate)
                    ) : !isReadOnlyPartnerRole && item.contractAppendixStatus !== 'ĐÃ_KÝ' ? (
                      <input
                        type="date"
                        value={item.plannedAirDate || ''}
                        aria-label={`Chọn ngày air dự kiến cho ${item.idKenh}`}
                        onChange={(e) =>
                          handleFieldChange(item.id, 'plannedAirDate', e.target.value)
                        }
                        className="h-6 px-1.5 rounded border border-line bg-surface font-code text-2xs text-ink focus:outline-none focus:border-ink"
                      />
                    ) : item.plannedAirDate ? (
                      `Dự kiến ${formatDate(item.plannedAirDate)}`
                    ) : (
                      'Chưa chốt lịch'
                    )}
                  </div>
                  <div className="text-2xs text-ink-3 truncate max-w-[175px]">
                    {item.linkAir
                      ? `GMV ${formatVndShort(item.gmv30d)} · ROI ${item.roi30d.toFixed(2)}x`
                      : item.trangThaiSlaAir}
                  </div>
                </>
              )}
            </div>
          );
        },
      },
      {
        key: 'status',
        header: 'Trạng thái',
        width: 155,
        render: (item) => {
          const hasBo = item.bookingOrderCreated && Boolean(item.maBooking);
          const isSowSigned = item.contractAppendixStatus === 'ĐÃ_KÝ';
          const isAccepted = item.acceptanceStatus === 'DA_NGHIEM_THU';
          const isPaid = item.trangThaiPhieuThanhToan === 'Đã thanh toán';
          const isAwaitingAddons =
            isAccepted && item.sequentialAcceptanceStage === '2_DA_NGHIEM_THU_VIDEO_CHO_PHAN_KHAC';
          const pendingAddonsCount = (item.addonServices || []).filter(
            (a) => a.acceptanceStatus === 'PENDING_ACCEPTANCE'
          ).length;

          const statusObj = isPaid
            ? { label: 'Đã thanh toán', tone: 'positive' as const, sub: item.larkSlipCode || 'Hoàn tất' }
            : isAwaitingAddons
            ? {
                label: 'Chờ asset',
                tone: 'warning' as const,
                sub: `Đã air · Chờ ${pendingAddonsCount} asset`,
              }
            : isAccepted
            ? { label: 'Đã nghiệm thu', tone: 'positive' as const, sub: item.trangThaiPhieuThanhToan }
            : isSowSigned
            ? {
                label: bookingScope === 'LIVESTREAM' ? 'Chờ lên sóng Live' : 'Đang thực thi',
                tone: 'info' as const,
                sub: bookingScope === 'LIVESTREAM' ? 'Đã ký HĐ Live · Chờ phát sóng' : 'Đã ký SOW · Chờ air',
              }
            : hasBo
            ? {
                label: bookingScope === 'LIVESTREAM' ? 'Chờ ký HĐ Live' : 'Chờ ký SOW',
                tone: 'warning' as const,
                sub: bookingScope === 'LIVESTREAM' ? 'Chốt Phiếu xác nhận 3 bên' : 'Đã cấp mã Deal',
              }
            : { label: 'Chờ tạo deal', tone: 'warning' as const, sub: 'Chốt giá & ngày air' };
          const steps = [hasBo, isSowSigned, isAccepted, isPaid];
          return (
            <div className="leading-tight space-y-1">
              <div className="flex items-center gap-2">
                <Status tone={statusObj.tone}>{statusObj.label}</Status>
                <span
                  className="inline-flex items-center gap-1"
                  title="Tiến trình 4 chặng: Tạo Deal → Ký SOW → Nghiệm thu → Thanh toán"
                >
                  {steps.map((done, idx) => (
                    <span
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full ${
                        done ? 'bg-positive' : 'bg-line-strong'
                      }`}
                    />
                  ))}
                </span>
              </div>
              <div className="text-2xs text-ink-3 truncate max-w-[145px]">
                {statusObj.sub}
              </div>
            </div>
          );
        },
      },
      {
        key: 'actions',
        header: 'Thao tác',
        align: 'right',
        width: 155,
        render: (item) => {
          const hasBo = item.bookingOrderCreated && Boolean(item.maBooking);
          const isSowSigned = item.contractAppendixStatus === 'ĐÃ_KÝ';
          const isAccepted = item.acceptanceStatus === 'DA_NGHIEM_THU';
          const mappedDeal = buildBookingDealFromApprovedItem(item);

          return (
            <div
              className="inline-flex items-center justify-end gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {bookingScope === 'LIVESTREAM' ? (
                !isSowSigned ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openDrawerForItem(item, 'OVERVIEW')}
                  >
                    Phiếu xác nhận
                  </Button>
                ) : !isAccepted ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openAcceptanceModalForRow(item)}
                  >
                    Nghiệm thu Live
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openLarkPaymentModalForItem(item)}
                  >
                    Lập ĐNTT
                  </Button>
                )
              ) : !hasBo ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openDealBuilderModal(item)}
                >
                  Tạo deal
                </Button>
              ) : !isSowSigned && onOpenContractForDeal ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onOpenContractForDeal(mappedDeal, 'SOW')}
                >
                  Ký SOW
                </Button>
              ) : !isAccepted ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openAcceptanceModalForRow(item)}
                >
                  Nghiệm thu
                </Button>
              ) : item.sequentialAcceptanceStage === '2_DA_NGHIEM_THU_VIDEO_CHO_PHAN_KHAC' ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openDrawerForItem(item, 'ACCEPTANCE')}
                >
                  Nghiệm thu Asset
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openLarkPaymentModalForItem(item)}
                >
                  Lập ĐNTT
                </Button>
              )}

              <ActionMenu
                items={[
                  {
                    label:
                      bookingScope === 'LIVESTREAM'
                        ? 'Mở Phiếu xác nhận & Thông số Phiên Live (30 trường)'
                        : 'Xem hồ sơ Deal & SOW',
                    icon: Eye,
                    onSelect: () => openDrawerForItem(item, 'OVERVIEW'),
                  },
                  ...(bookingScope === 'LIVESTREAM'
                    ? [
                        {
                          label: 'Sao chép Phiếu xác nhận gửi Zalo / Brand',
                          icon: Copy,
                          onSelect: () => {
                            const txt = formatLivestreamConfirmationSheet(item);
                            void navigator.clipboard.writeText(txt);
                            onNotify?.(
                              `Đã sao chép Phiếu xác nhận hợp tác Livestream Affiliate (${item.maBooking}).`,
                              'success'
                            );
                          },
                        },
                      ]
                    : []),
                  {
                    label:
                      bookingScope === 'LIVESTREAM'
                        ? 'Nghiệm thu Phiên Live & Thời lượng'
                        : 'Nghiệm thu Video & Asset đi kèm',
                    icon: Video,
                    onSelect: () => openDrawerForItem(item, 'ACCEPTANCE'),
                  },
                  {
                    label: `Quản lý ${ensureDealJobsForApprovedItem(item).length} Job trong Deal`,
                    icon: Layers,
                    onSelect: () => openDealBuilderModal(item),
                  },
                  {
                    label: 'Cấu hình điều khoản SOW',
                    icon: FileCheck,
                    onSelect: () => openDealBuilderModal(item),
                  },
                  ...(onOpenContractForDeal
                    ? [
                        {
                          label: 'Hợp đồng nguyên tắc (HĐNT)',
                          icon: FileText,
                          onSelect: () => onOpenContractForDeal(mappedDeal, 'HDNT'),
                        },
                        {
                          label: isSowSigned ? 'Xem Phụ lục SOW' : 'Soạn & Ký Phụ lục SOW',
                          icon: FileText,
                          onSelect: () => onOpenContractForDeal(mappedDeal, 'SOW'),
                        },
                        {
                          label: 'Biên bản nghiệm thu (BBNT)',
                          icon: FileText,
                          onSelect: () => onOpenContractForDeal(mappedDeal, 'BBNT'),
                        },
                      ]
                    : []),
                  {
                    label: 'Xem nháp BBNT',
                    icon: FileText,
                    onSelect: () => setDraftBbntPreviewDeal(mappedDeal),
                  },
                  {
                    label: 'Nghiệm thu video & chỉ số',
                    icon: Video,
                    onSelect: () => openAcceptanceModalForRow(item),
                  },
                  {
                    label: 'Lập phiếu thanh toán Lark',
                    icon: Send,
                    onSelect: () => openLarkPaymentModalForItem(item),
                  },
                  {
                    label: 'Xem nhanh hồ sơ KOC',
                    icon: Eye,
                    onSelect: () => setQuickViewApprovedItem(item),
                  },
                  ...(item.linkAir
                    ? [
                        {
                          label: 'Đối soát kịch bản & giỏ hàng',
                          icon: Eye,
                          onSelect: () => openDeepVideoInspector(item),
                        },
                      ]
                    : []),
                ]}
              />
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onOpenContractForDeal, bookingScope]
  );

  return (
    <div className="space-y-4">
      {!(isDrawerOpen && activeDrawerItem) && (
        <>
          <PageActions>
            {bookingScope !== 'LIVESTREAM' && onNavigateTab && (
              <Button
                variant="ghost"
                size="sm"
                icon={ArrowLeft}
                onClick={() =>
                  onNavigateTab('koc-listing', {
                    storeName: selectedStore !== 'ALL' ? selectedStore : undefined,
                    monthKey: selectedMonth !== 'ALL' ? selectedMonth : undefined,
                  })
                }
              >
                Về Listing
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              disabled={isSyncingReportSheet}
              onClick={() => void handlePullReportSheetFromGoogle()}
            >
              Kéo Sheet Kết quả
            </Button>
            {!isReadOnlyPartnerRole && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={FileSpreadsheet}
                  disabled={isSyncingReportSheet}
                  onClick={() => void handlePushReportSheetToGoogle()}
                >
                  {isSyncingReportSheet ? 'Đang đồng bộ…' : 'Đẩy Sheet Kết quả'}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={bookingScope === 'LIVESTREAM' ? Plus : FileCheck}
                  onClick={() =>
                    bookingScope === 'LIVESTREAM'
                      ? handleAddDirectApprovedRow()
                      : handleCreateBookingOrders()
                  }
                >
                  {bookingScope === 'LIVESTREAM'
                    ? 'Tạo Phiên Live mới'
                    : `Tạo Deal & SOW (${selectedIds.length > 0 ? selectedIds.length : stats.pendingBoCount})`}
                </Button>
              </>
            )}
            <ActionMenu
              label="Tác vụ khác"
              items={[
                {
                  label: 'Kéo KOC duyệt từ Sheet Listing',
                  icon: RefreshCw,
                  onSelect: handlePullBrandApprovedFromSheets,
                },
                {
                  label: 'Kéo thông tin HĐ · PL SOW · BBNT',
                  icon: FileText,
                  disabled: isPullingContractLinks,
                  onSelect: () => void handlePullContractInfoAndLinks(),
                },
                {
                  label: 'Nghiệm thu video & chỉ số',
                  icon: Video,
                  onSelect: () => openAcceptanceModalForRow(),
                },
                {
                  label: 'Lập phiếu thanh toán Lark',
                  icon: Send,
                  onSelect: () => openLarkPaymentModalForItem(),
                },
                {
                  label: 'Xem cấu trúc Sheet Kết quả (28 cột)',
                  icon: Eye,
                  onSelect: () => setIsReportSchemaModalOpen(true),
                },
                {
                  label: 'Thêm dòng trực tiếp',
                  icon: Plus,
                  onSelect: handleAddDirectApprovedRow,
                },
                {
                  label: 'Sao chép bảng (Kèm tiêu đề)',
                  icon: Copy,
                  onSelect: () => void handleCopyTsv(true),
                },
                {
                  label: 'Xuất file CSV',
                  icon: Download,
                  onSelect: () =>
                    downloadApprovedBookingListCsv(
                      filteredItems,
                      selectedMonth,
                      selectedStore,
                      canViewFullPii
                    ),
                },
              ]}
            />
          </PageActions>

      {/* Khung bảng chính chuẩn Panel flush + FilterBar + Chips + DataTable + Pagination */}
      <Panel flush>
        <div className="p-4 sm:p-4 border-b border-line bg-surface">
          <FilterBar
            search={{
              value: searchQuery,
              onChange: (v) => {
                setSearchQuery(v);
                setPage(1);
              },
              placeholder: 'Tìm mã BO, mã SOW, @id_kênh, tên KOC, sản phẩm...',
            }}
            resultCount={filteredItems.length}
            filters={
              <>
                <Select
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Chọn tháng"
                  className="w-auto min-w-[130px]"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m === 'ALL' ? 'Tất cả tháng' : `Tháng ${m}`}
                    </option>
                  ))}
                </Select>

                <Select
                  value={selectedStore}
                  onChange={(e) => {
                    setSelectedStore(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Chọn Gian hàng"
                  className="w-auto min-w-[200px] max-w-[260px]"
                >
                  <option value="ALL">
                    Tất cả gian hàng ({monthTotalItemCount})
                  </option>
                  {sortedB2cStoresForMonth.map((st) => {
                    const count = storeItemCountsForMonth.get(st.storeName) || 0;
                    return (
                      <option key={st.id} value={st.storeName}>
                        {st.brandName} — {st.storeName} ({count})
                      </option>
                    );
                  })}
                </Select>

                <Select
                  value={filterAssigneeScope}
                  onChange={(e) => {
                    setFilterAssigneeScope(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Lọc theo Nhóm duyệt hoặc PIC phụ trách"
                  className="w-auto min-w-[180px] max-w-[240px]"
                >
                  <option value="ALL">Tất cả PIC &amp; Nhóm duyệt</option>
                  <option value="LEADER_NGOC_TAM">
                    8 gian trọng điểm (Leader: Nguyễn Thị Ngọc Tâm)
                  </option>
                  <option value="DIRECT_YEN_NHI">
                    Gian hàng trình thẳng GĐ MKT (Đặng Thị Yến Nhi)
                  </option>
                  {availablePicNames.length > 0 && (
                    <optgroup label="Chuyên viên thực thi (PIC)">
                      {availablePicNames.map((pic) => (
                        <option key={pic} value={`PIC:${pic}`}>
                          PIC: {pic}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </Select>

                <Segmented
                  value={viewLayout}
                  onChange={(val) => setViewLayout(val as 'LIST_DRAWER' | 'LARK_GRID')}
                  items={[
                    { key: 'LIST_DRAWER', label: 'Danh sách' },
                    { key: 'LARK_GRID', label: 'Bảng tính Lark' },
                  ]}
                />

                {viewLayout === 'LARK_GRID' && (
                  <Segmented
                    value={viewColumnMode}
                    onChange={setViewColumnMode}
                    items={[
                      { key: 'ALL_32', label: 'Đầy đủ cột' },
                      { key: 'BOOKING_FOCUS', label: 'Chốt Deal & SOW' },
                      { key: 'ACCEPTANCE_FOCUS', label: 'Nghiệm thu' },
                    ]}
                  />
                )}

                {selectedIds.length > 0 && !isReadOnlyPartnerRole && (
                  <Button
                    variant="danger"
                    size="sm"
                    icon={Trash2}
                    onClick={handleDeleteSelected}
                  >
                    Xóa ({selectedIds.length})
                  </Button>
                )}
              </>
            }
            chips={
              <Chips
                label="Trạng thái"
                value={stageChip}
                onChange={(val) => {
                  setStageChip(val);
                  setPage(1);
                }}
                items={[
                  { key: 'ALL', label: 'Tất cả', count: chipCounts.all },
                  { key: 'PENDING_DEAL', label: 'Chờ tạo deal', count: chipCounts.pendingDeal },
                  { key: 'PENDING_SOW', label: 'Chờ ký SOW', count: chipCounts.pendingSow },
                  { key: 'PENDING_ACCEPTANCE', label: 'Chờ video', count: chipCounts.pendingAcceptance },
                  { key: 'PENDING_ADDONS', label: 'Chờ asset đi kèm', count: chipCounts.pendingAddons },
                  { key: 'ACCEPTED', label: 'Đã nghiệm thu đủ', count: chipCounts.accepted },
                  { key: 'SETTLED', label: 'Đã lập ĐNTT', count: chipCounts.settled },
                ]}
              />
            }
          />
          {selectedStoreSheetMeta && (
            <div className="mt-3 pt-3 border-t border-line flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 font-medium text-ink">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span>Sheet 3:</span>
                  <code className="rounded bg-sunken border border-line px-2 py-0.5 font-mono text-ink">
                    {selectedStoreSheetMeta.reportTab}
                  </code>
                </span>
                {selectedStoreSheetMeta.sheetUrl ? (
                  <a
                    href={selectedStoreSheetMeta.sheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-accent font-medium hover:underline"
                  >
                    <span>Mở Google Sheet</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                ) : (
                  <span className="text-warning font-medium">Chưa gắn Link Google Sheet</span>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                icon={Eye}
                onClick={() => setIsReportSchemaModalOpen(true)}
              >
                Cấu trúc 28 cột (A → AB)
              </Button>
            </div>
          )}
        </div>

        {viewLayout === 'LIST_DRAWER' ? (
          <>
            <DataTable
              columns={listColumns}
              rows={paginatedListItems}
              rowKey={(r) => r.id}
              stickyLast
              onRowClick={(row) => openDrawerForItem(row)}
              rowClassName={(row) =>
                activeDrawerItem?.id === row.id && isDrawerOpen
                  ? 'bg-accent-soft/40'
                  : undefined
              }
              empty={
                <EmptyState
                  title="Chưa có Deal nào khớp bộ lọc"
                  description="Thử chuyển sang Tất cả trạng thái hoặc đồng bộ các dòng Brand đã duyệt từ Sheet Listing."
                  action={
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={RefreshCw}
                      onClick={handlePullBrandApprovedFromSheets}
                    >
                      Đồng bộ từ Sheet Listing
                    </Button>
                  }
                />
              }
            />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={filteredItems.length}
              onPageChange={setPage}
              onPageSizeChange={(n) => {
                setPageSize(n);
                setPage(1);
              }}
            />
          </>
        ) : (
          <ApprovedBookingLarkGrid
            filteredItems={filteredItems}
            paginatedListItems={paginatedListItems}
            selectedIds={selectedIds}
            toggleSelectAll={toggleSelectAll}
            toggleSelectOne={toggleSelectOne}
            viewColumnMode={viewColumnMode}
            canViewFullPii={canViewFullPii}
            page={page}
            pageSize={pageSize}
            setPage={setPage}
            setPageSize={setPageSize}
            setEditingRowId={setEditingRowId}
            handleFieldChange={handleFieldChange}
            handlePullBrandApprovedFromSheets={handlePullBrandApprovedFromSheets}
            handleAddDirectApprovedRow={handleAddDirectApprovedRow}
            openDealBuilderModal={openDealBuilderModal}
            openDrawerForItem={openDrawerForItem}
            openAcceptanceModalForRow={openAcceptanceModalForRow}
            openLarkPaymentModalForItem={openLarkPaymentModalForItem}
            openDeepVideoInspector={openDeepVideoInspector}
            setQuickViewApprovedItem={setQuickViewApprovedItem}
            setDraftBbntPreviewDeal={setDraftBbntPreviewDeal}
            onOpenContractForDeal={onOpenContractForDeal}
          />
        )}
      </Panel>
        </>
      )}

      <ApprovedBookingModals
        bookingScope={bookingScope}
        items={items}
        filteredItems={filteredItems}
        itemsByHandleMap={itemsByHandleMap}
        isAcceptanceModalOpen={isAcceptanceModalOpen}
        setIsAcceptanceModalOpen={setIsAcceptanceModalOpen}
        isInspectingTikTokLinks={isInspectingTikTokLinks}
        parsedAcceptanceRows={parsedAcceptanceRows}
        handleInspectRealTikTokVideos={handleInspectRealTikTokVideos}
        handleConfirmVideoAcceptanceMapping={handleConfirmVideoAcceptanceMapping}
        handleSaveAcceptanceAndOpenLarkApproval={handleSaveAcceptanceAndOpenLarkApproval}
        selectedTargetBoItemId={selectedTargetBoItemId}
        handleSelectTargetBoInModal={handleSelectTargetBoInModal}
        defaultAcceptanceAirDate={defaultAcceptanceAirDate}
        setDefaultAcceptanceAirDate={setDefaultAcceptanceAirDate}
        acceptanceModalStats={acceptanceModalStats}
        acceptanceBulkText={acceptanceBulkText}
        setAcceptanceBulkText={setAcceptanceBulkText}
        setRowFieldOverrides={setRowFieldOverrides}
        setRowManualBoMap={setRowManualBoMap}
        updateDraftRowField={updateDraftRowField}
        inspectedVideosMap={inspectedVideosMap}
        openDeepVideoInspector={openDeepVideoInspector}
        stage2AddonEdits={stage2AddonEdits}
        stage2DealJobsEdits={stage2DealJobsEdits}
        setStage2DealJobsEdits={setStage2DealJobsEdits}
        stage2ActiveJobIdxMap={stage2ActiveJobIdxMap}
        setStage2ActiveJobIdxMap={setStage2ActiveJobIdxMap}
        setDraftBbntPreviewDeal={setDraftBbntPreviewDeal}
        isLiveAcceptanceModalOpen={isLiveAcceptanceModalOpen}
        setIsLiveAcceptanceModalOpen={setIsLiveAcceptanceModalOpen}
        liveAccTargetId={liveAccTargetId}
        liveAccProofUrl={liveAccProofUrl}
        setLiveAccProofUrl={setLiveAccProofUrl}
        liveAccActualDate={liveAccActualDate}
        setLiveAccActualDate={setLiveAccActualDate}
        liveAccStartTime={liveAccStartTime}
        setLiveAccStartTime={setLiveAccStartTime}
        liveAccEndTime={liveAccEndTime}
        setLiveAccEndTime={setLiveAccEndTime}
        liveAccSessionsCount={liveAccSessionsCount}
        setLiveAccSessionsCount={setLiveAccSessionsCount}
        liveAccCommittedMinutes={liveAccCommittedMinutes}
        setLiveAccCommittedMinutes={setLiveAccCommittedMinutes}
        liveAccActualMinutes={liveAccActualMinutes}
        setLiveAccActualMinutes={setLiveAccActualMinutes}
        liveAccActualGmv={liveAccActualGmv}
        setLiveAccActualGmv={setLiveAccActualGmv}
        liveAccActualOrders={liveAccActualOrders}
        setLiveAccActualOrders={setLiveAccActualOrders}
        liveAccActualViews={liveAccActualViews}
        setLiveAccActualViews={setLiveAccActualViews}
        liveAccBonusAmount={liveAccBonusAmount}
        setLiveAccBonusAmount={setLiveAccBonusAmount}
        liveAccCustomPenalty={liveAccCustomPenalty}
        setLiveAccCustomPenalty={setLiveAccCustomPenalty}
        liveAccNote={liveAccNote}
        setLiveAccNote={setLiveAccNote}
        populateLiveAcceptanceFromItem={populateLiveAcceptanceFromItem}
        handleSaveLivestreamAcceptance={handleSaveLivestreamAcceptance}
        isReportSchemaModalOpen={isReportSchemaModalOpen}
        setIsReportSchemaModalOpen={setIsReportSchemaModalOpen}
        reportSchemaGroupFilter={reportSchemaGroupFilter}
        setReportSchemaGroupFilter={setReportSchemaGroupFilter}
        isSyncingReportSheet={isSyncingReportSheet}
        handlePushReportSheetToGoogle={handlePushReportSheetToGoogle}
        syncComparisonReport={syncComparisonReport}
        setSyncComparisonReport={setSyncComparisonReport}
        syncDiffFilter={syncDiffFilter}
        setSyncDiffFilter={setSyncDiffFilter}
        confirmExecutePushReportSheet={confirmExecutePushReportSheet}
        confirmExecutePullReportSheet={confirmExecutePullReportSheet}
        confirmExecutePullListingSheets={confirmExecutePullListingSheets}
      />

      <TikTokVideoInspectorModal
        isOpen={isVideoInspectorOpen}
        onClose={() => setIsVideoInspectorOpen(false)}
        deals={deals}
        initialDeal={
          inspectorTargetItem
            ? buildBookingDealFromApprovedItem(inspectorTargetItem)
            : null
        }
        initialUrl={inspectorInitialUrl}
        onAcceptVideoForDeal={handleAcceptVideoFromDeepInspector}
      />

      <LarkPaymentRequestModal
        open={isLarkPaymentModalOpen}
        onClose={() => setIsLarkPaymentModalOpen(false)}
        initialRequestType={larkPaymentRequestType}
        initialDeal={
          larkPaymentInitialItem
            ? buildBookingDealFromApprovedItem(larkPaymentInitialItem)
            : null
        }
        initialDeals={
          larkPaymentInitialItems.length > 0
            ? larkPaymentInitialItems.map((it) => buildBookingDealFromApprovedItem(it))
            : undefined
        }
        allDeals={dealsForLarkModal}
        kocs={kocs}
        currentUserName={currentUserName}
        currentRole={currentRole}
        onSuccessUpdateDeals={handleLarkPaymentSuccess}
      />

      <DraftBbntPreviewModal
        open={Boolean(draftBbntPreviewDeal)}
        onClose={() => setDraftBbntPreviewDeal(null)}
        deal={draftBbntPreviewDeal}
        koc={
          draftBbntPreviewDeal
            ? kocs.find(
                (k) =>
                  k.id === draftBbntPreviewDeal.kocId ||
                  normalizeTikTokId(k.channelId).toLowerCase() ===
                    normalizeTikTokId(draftBbntPreviewDeal.kocChannelId || '').toLowerCase()
              )
            : undefined
        }
        onSavedRecord={(rec) => {
          setContractRecords((prev) => {
            const exists = prev.some((x) => x.id === rec.id);
            return exists ? prev.map((x) => (x.id === rec.id ? rec : x)) : [rec, ...prev];
          });
          onNotify?.(
            `Đã lưu Biên bản nghiệm thu (${rec.contractSystem?.contractCode || rec.title}) & đồng bộ đường link về Deal.`,
            'success'
          );
        }}
      />

      <KocQuickViewModal
        open={Boolean(quickViewApprovedItem)}
        onClose={() => setQuickViewApprovedItem(null)}
        approvedItem={quickViewApprovedItem}
        kocs={kocs}
        stores={stores}
        deals={deals}
        onNotify={onNotify}
      />

      <DealDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        deal={activeDrawerItem}
        initialTab={drawerInitialTab}
        allDeals={filteredItems}
        kocs={kocs}
        contractRecords={contractRecords}
        onSelectDeal={(d) => setSelectedDrawerItemId(d.id)}
        onOpenContractForDeal={onOpenContractForDeal}
        onOpenDraftBbntPreview={(d) => setDraftBbntPreviewDeal(d)}
        onOpenAcceptanceModal={openAcceptanceModalForRow}
        onOpenLarkPaymentModal={openLarkPaymentModalForItem}
        onOpenDealBuilderModal={openDealBuilderModal}
        onOpenTikTokInspector={openDeepVideoInspector}
        onOpenKocProfile={(it) => setQuickViewApprovedItem(it)}
        onUpdateDealFields={(dealId, patch) => {
          let updatedRow: ApprovedBookingListItem | null = null;
          updateItemsAndSync((prev) =>
            prev.map((it) => {
              if (it.id !== dealId) return it;
              const recalc = recalculateApprovedBookingItem({ ...it, ...patch });
              updatedRow = recalc;
              return recalc;
            })
          );
          if (updatedRow) {
            const rowToSync: ApprovedBookingListItem = updatedRow;
            syncApprovedItemsBackToStaffBrandSheets([rowToSync], kocs, stores, deals);
            if (rowToSync.bookingOrderCreated && rowToSync.maBooking && onCreateOrUpdateDeals) {
              onCreateOrUpdateDeals([buildBookingDealFromApprovedItem(rowToSync)]);
            }
          }
        }}
        onPullContractLinks={handlePullContractInfoAndLinks}
        isPullingContractLinks={isPullingContractLinks}
        canViewFullPii={canViewFullPii}
        currentUser={currentUser}
        currentRole={currentRole}
        onNotify={onNotify}
      />
    </div>
  );
};
