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
  KocItem,
  StorePortfolioItem,
} from '../../lib/types';
import { formatDate, formatNumber, formatVnd, formatVndShort, getVietnamDateYmd, maskSensitivePii } from '../../lib/format';

const parseThousandNumberInput = (raw: string): number => {
  const digits = String(raw || '').replace(/[^\d]/g, '');
  return digits ? Number(digits) || 0 : 0;
};
import {
  APPROVED_BOOKING_LIST_UPDATED_EVENT,
  LOAI_TAI_KHOAN_THANH_TOAN_OPTIONS,
  autoMapVideoAcceptanceByKocChannel,
  buildBookingDealFromApprovedItem,
  buildDefaultAddonServicesForDeal,
  computeAirSlaStatus,
  computeDealSowJobSubtotal,
  computeWeekLabelFromDate,
  downloadApprovedBookingListCsv,
  ensureDealJobsForApprovedItem,
  evaluateVideoEffectivenessLabel,
  extractTikTokChannelAndVideoFromInput,
  formatApprovedBookingListToTsv,
  generateBookingOrderCode,
  generateDealAppendixCode,
  generateMasterContractCode,
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
import { contractApi, type ContractBootstrap } from '../contracts/api';
import { TikTokVideoInspectorModal } from '../koc/TikTokVideoInspectorModal';
import { LarkPaymentRequestModal } from '../booking/LarkPaymentRequestModal';
import { DealDetailDrawer } from '../booking/DealDetailDrawer';
import { DraftBbntPreviewModal } from '../contracts/DraftBbntPreviewModal';
import { KocQuickViewModal } from '../shortlist/KocQuickViewModal';
import type { LarkPaymentRequestSlip } from '../../lib/larkPaymentRequestEngine';
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
  Stat,
  StatRow,
  Status,
  Textarea,
  type Column,
} from '../ui';

export interface ApprovedBookingListViewProps {
  kocs: KocItem[];
  stores: StorePortfolioItem[];
  deals: BookingDealItem[];
  currentUserName: string;
  canViewFullPii?: boolean;
  initialStoreName?: string;
  initialMonthKey?: string;
  onCreateOrUpdateDeals?: (newOrUpdatedDeals: BookingDealItem[]) => void;
  onOpenContractForDeal?: (deal: BookingDealItem, document?: 'HDNT' | 'SOW' | 'BBNT') => void;
  onNavigateTab?: (tab: 'koc-listing' | 'booking', context?: { storeName?: string; monthKey?: string }) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

const MONTH_OPTIONS = ['ALL', '2026/11', '2026/10', '2026/09', '2026/08'];

const PAYMENT_STATUS_OPTIONS: ApprovedBookingPaymentStatus[] = [
  'Chờ nghiệm thu',
  'Đủ điều kiện ĐNTT',
  'Đã lập ĐNTT',
  'Đã thanh toán',
];

interface ParsedAcceptanceDraftRow {
  rawLine: string;
  channelHandle: string;
  explicitBoCode?: string;
  linkAir: string;
  videoId: string;
  actualAirDate: string;
  sparkAdsCode: string;
  views30d: number;
  gmv30d: number;
  orders30d: number;
  matchedItem?: ApprovedBookingListItem;
}

export const ApprovedBookingListView: React.FC<ApprovedBookingListViewProps> = ({
  kocs,
  stores,
  deals,
  currentUserName,
  canViewFullPii = false,
  initialStoreName,
  initialMonthKey,
  onCreateOrUpdateDeals,
  onOpenContractForDeal,
  onNavigateTab,
  onNotify,
}) => {
  const b2cStores = useMemo(
    () => stores.filter((s) => s.isB2cManaged !== false && s.storeName),
    [stores]
  );
  const b2cStoreNameSet = useMemo(
    () => new Set(b2cStores.map((s) => s.storeName)),
    [b2cStores]
  );

  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonthKey || '2026/10');
  const [selectedStore, setSelectedStore] = useState<string>(initialStoreName || 'ALL');
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
  const [contractRecords, setContractRecords] = useState<ContractRecord[]>([]);

  const [rawItems, setItems] = useState<ApprovedBookingListItem[]>(() =>
    loadApprovedBookingList(kocs, stores, deals, currentUserName)
  );

  // Đồng bộ tự động khi deals hoặc kocs từ phân hệ khác (Hợp đồng, PlanDealBoard, Danh bạ KOC) thay đổi
  const [prevSyncDeps, setPrevSyncDeps] = useState<{ deals: BookingDealItem[]; kocs: KocItem[] }>({
    deals,
    kocs,
  });
  if (prevSyncDeps.deals !== deals || prevSyncDeps.kocs !== kocs) {
    setPrevSyncDeps({ deals, kocs });
    setItems(loadApprovedBookingList(kocs, stores, deals, currentUserName));
  }

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
    (sourceItems: ApprovedBookingListItem[], records: ContractRecord[]) => {
      if (records.length === 0) return { mergedItems: sourceItems, matchedDealsCount: 0 };
      const sowByDeal = new Map<string, ContractRecord>();
      const bbntByDeal = new Map<string, ContractRecord>();
      const hdntByKoc = new Map<string, ContractRecord>();
      const hdntByPartner = new Map<string, ContractRecord>();

      for (const r of records) {
        const docKind = documentOfTemplate(r.templateId);
        const idKey = (r.dealId || '').trim().toUpperCase();
        const codeKey = (r.dealCode || '').trim().toUpperCase();
        if (docKind === 'SOW') {
          if (idKey && !sowByDeal.has(idKey)) sowByDeal.set(idKey, r);
          if (codeKey && !sowByDeal.has(codeKey)) sowByDeal.set(codeKey, r);
        } else if (docKind === 'BBNT') {
          if (idKey && !bbntByDeal.has(idKey)) bbntByDeal.set(idKey, r);
          if (codeKey && !bbntByDeal.has(codeKey)) bbntByDeal.set(codeKey, r);
        } else if (docKind === 'HDNT') {
          if (r.kocId && !hdntByKoc.has(r.kocId)) hdntByKoc.set(r.kocId, r);
          const partnerKey = normalizeTikTokId(r.partner || '').toLowerCase();
          if (partnerKey && !hdntByPartner.has(partnerKey)) hdntByPartner.set(partnerKey, r);
        }
      }

      let matchedDealsCount = 0;
      const mergedItems = sourceItems.map((it) => {
        const codeKey = (it.maBooking || '').trim().toUpperCase();
        const dealIdKey = (it.linkedDealId || `deal-from-32-${it.id}`).trim().toUpperCase();
        const handleKey = normalizeTikTokId(it.idKenh || '').toLowerCase();
        const nameKey = normalizeTikTokId(it.tenKenh || '').toLowerCase();

        const matchedSow = (codeKey ? sowByDeal.get(codeKey) : undefined) || sowByDeal.get(dealIdKey);
        let matchedBbnt = (codeKey ? bbntByDeal.get(codeKey) : undefined) || bbntByDeal.get(dealIdKey);
        if (!matchedBbnt && matchedSow) {
          matchedBbnt = records.find(
            (r) => documentOfTemplate(r.templateId) === 'BBNT' && r.parentId === matchedSow.id
          );
        }
        const matchedHdnt =
          (it.kocId ? hdntByKoc.get(it.kocId) : undefined) ||
          (handleKey ? hdntByPartner.get(handleKey) : undefined) ||
          (nameKey ? hdntByPartner.get(nameKey) : undefined) ||
          (matchedSow?.parentId ? records.find((r) => r.id === matchedSow.parentId) : undefined);

        if (!matchedSow && !matchedHdnt && !matchedBbnt) return it;
        matchedDealsCount++;

        const isHdntSigned = matchedHdnt?.signing.at(-1)?.status === 'COMPLETED';
        const isSowSigned = matchedSow?.signing.at(-1)?.status === 'COMPLETED';
        const isBbntSigned = matchedBbnt?.signing.at(-1)?.status === 'COMPLETED';

        const hdntSignedUrl =
          matchedHdnt?.signing.at(-1)?.signedFileUrl ||
          matchedHdnt?.contractSystem?.signedFileUrl ||
          (isHdntSigned && matchedHdnt ? `/api/contracts/${matchedHdnt.id}/document?version=${matchedHdnt.version}` : undefined);
        const sowSignedUrl =
          matchedSow?.signing.at(-1)?.signedFileUrl ||
          matchedSow?.contractSystem?.signedFileUrl ||
          (isSowSigned && matchedSow ? `/api/contracts/${matchedSow.id}/document?version=${matchedSow.version}` : undefined);
        const bbntSignedUrl =
          matchedBbnt?.signing.at(-1)?.signedFileUrl ||
          matchedBbnt?.contractSystem?.signedFileUrl ||
          (isBbntSigned && matchedBbnt ? `/api/contracts/${matchedBbnt.id}/document?version=${matchedBbnt.version}` : undefined);

        const sowPay = matchedSow
          ? extractSowPaymentScheduleAndAdvance(matchedSow.values, matchedSow.templateId)
          : undefined;
        const isAdvAlreadyProcessed =
          it.larkAdvanceStatus === 'ĐÃ_CHI_TẠM_ỨNG' ||
          it.larkAdvanceStatus === 'ĐÃ_DUYỆT_TẠM_ỨNG' ||
          it.larkAdvanceStatus === 'CHỜ_DUYỆT_TẠM_ỨNG';
        const syncedTamUng =
          sowPay?.paymentScheduleOption === 'ONE_TIME' && !isAdvAlreadyProcessed
            ? 0
            : sowPay?.paymentScheduleOption === 'TWO_TIMES' && sowPay.advanceAmount > 0
            ? sowPay.advanceAmount
            : it.soTienTamUngTruoc;

        return {
          ...it,
          paymentScheduleOption: sowPay?.paymentScheduleOption || it.paymentScheduleOption,
          soTienTamUngTruoc: syncedTamUng,
          soTienCanThanhToan: Math.max(
            0,
            (Number(it.chiPhiBookingNetCuoi) || 0) -
              (Number(it.khauTruHangMucHuy) || 0) -
              syncedTamUng
          ),
          masterContractCode:
            matchedHdnt?.contractSystem?.contractCode || matchedHdnt?.title || it.masterContractCode,
          masterContractStatus: isHdntSigned
            ? ('ĐÃ_KÝ' as const)
            : matchedHdnt
            ? ('CHỜ_KÝ' as const)
            : it.masterContractStatus,
          masterContractGoogleDocsUrl:
            matchedHdnt?.contractSystem?.googleDocsUrl || it.masterContractGoogleDocsUrl,
          masterContractSignedUrl: hdntSignedUrl || it.masterContractSignedUrl,

          contractAppendixCode:
            matchedSow?.contractSystem?.contractCode || matchedSow?.title || it.contractAppendixCode,
          contractAppendixStatus: isSowSigned
            ? ('ĐÃ_KÝ' as const)
            : matchedSow
            ? ('CHỜ_KÝ' as const)
            : it.contractAppendixStatus,
          contractAppendixGoogleDocsUrl:
            matchedSow?.contractSystem?.googleDocsUrl || it.contractAppendixGoogleDocsUrl,
          contractAppendixSignedUrl: sowSignedUrl || it.contractAppendixSignedUrl,

          bbntCode:
            matchedBbnt?.contractSystem?.contractCode || matchedBbnt?.title || it.bbntCode,
          bbntStatus: isBbntSigned
            ? ('ĐÃ_KÝ' as const)
            : matchedBbnt
            ? ('CHỜ_KÝ' as const)
            : it.bbntStatus,
          bbntGoogleDocsUrl:
            matchedBbnt?.contractSystem?.googleDocsUrl || it.bbntGoogleDocsUrl,
          bbntSignedUrl: bbntSignedUrl || it.bbntSignedUrl,
        };
      });

      return { mergedItems, matchedDealsCount };
    },
    []
  );

  // RULE-SYNC-01 & RULE-PERF-01: Đồng bộ O(1) trạng thái ký HĐNT / Phụ lục SOW / BBNT & các đường link từ /api/contracts vào danh sách
  const items = useMemo(
    () => mergeContractsIntoItems(rawItems, contractRecords).mergedItems,
    [rawItems, contractRecords, mergeContractsIntoItems]
  );

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
    setItems((prev) => {
      const next = updater(prev);
      saveApprovedBookingList(next, false);
      if (changedItemsForSheetSync && changedItemsForSheetSync.length > 0) {
        syncApprovedItemsBackToStaffBrandSheets(
          changedItemsForSheetSync,
          kocs,
          stores,
          deals
        );
      }
      return next;
    });
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

  // Danh sách sau khi lọc theo Tháng + Gian hàng + Từ khóa (dùng để tính số lượng trên Chips)
  const scopedItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((it) => {
      if (b2cStoreNameSet.size > 0 && !b2cStoreNameSet.has(it.storeName)) return false;
      if (selectedMonth !== 'ALL' && it.thangPlan !== selectedMonth) return false;
      if (selectedStore !== 'ALL' && it.storeName !== selectedStore) return false;
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
  }, [items, b2cStoreNameSet, selectedMonth, selectedStore, filterPipeline, filterAcceptance, searchQuery, editingRowId]);

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

  // Thống kê tổng hợp trên List Duyệt Book
  const stats = useMemo(() => {
    const total = filteredItems.length;
    const boCreatedCount = filteredItems.filter((i) => i.bookingOrderCreated && i.maBooking).length;
    const sowSignedCount = filteredItems.filter((i) => i.contractAppendixStatus === 'ĐÃ_KÝ').length;
    const acceptedCount = filteredItems.filter((i) => i.acceptanceStatus === 'DA_NGHIEM_THU').length;
    const totalFinalNet = filteredItems.reduce((s, i) => s + (Number(i.chiPhiBookingNetCuoi) || 0), 0);
    const totalGross = filteredItems.reduce((s, i) => s + (Number(i.chiPhiGrossKemThue) || 0), 0);
    const totalGmv30d = filteredItems.reduce((s, i) => s + (Number(i.gmv30d) || 0), 0);
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
  interface SheetSyncDiffRow {
    id: string;
    dealCode: string;
    store: string;
    idKenh: string;
    tenKoc: string;
    sanPham: string;
    status: 'ADDED' | 'UPDATED' | 'UNCHANGED' | 'PRESERVED_SHEET' | 'UNMATCHED_SHEET';
    fieldDiffs: Array<{ field: string; oldVal: string; newVal: string }>;
    preservedMetricsNote?: string;
  }

  interface SheetSyncComparisonReportState {
    mode: 'PUSH_REPORT_SHEET' | 'PULL_REPORT_SHEET' | 'PULL_LISTING_SHEET';
    stage: 'PREVIEW' | 'COMPLETED';
    title: string;
    targetStoresLabel: string;
    addedCount: number;
    updatedCount: number;
    unchangedCount: number;
    extraCount: number;
    extraLabel: string;
    diffRows: SheetSyncDiffRow[];
    missingSheetStores?: string[];
  }

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
        const existing = items.find(
          (it) =>
            it.sourceSheetRowId === r.id ||
            (it.storeName === r.store &&
              normalizeTikTokId(it.idKenh).toLowerCase() === cleanHandle &&
              (it.thangPlan || '') === (r.thang || ''))
        );

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
        const hasChange =
          (matched.linkVideo && matched.linkVideo !== item.linkAir) ||
          (matched.videoId && matched.videoId !== item.videoId) ||
          (matched.ngayAirReal && matched.ngayAirReal !== item.actualAirDate) ||
          (matched.sparkAds && matched.sparkAds !== item.sparkAdsCode) ||
          ((matched.views14d || 0) > 0 && matched.views14d !== item.views14d) ||
          ((matched.gmv14d || 0) > 0 && matched.gmv14d !== item.gmv14d) ||
          (matched.views30d > 0 && matched.views30d !== item.views30d) ||
          (matched.orders30d > 0 && matched.orders30d !== item.orders30d) ||
          (matched.gmv30d > 0 && matched.gmv30d !== item.gmv30d) ||
          ((matched.gpm30d || 0) > 0 && matched.gpm30d !== item.gpm30d);
        if (!hasChange) return item;
        updatedCount += 1;
        const nextLinkAir = matched.linkVideo || item.linkAir;
        return recalculateApprovedBookingItem({
          ...item,
          linkAir: nextLinkAir,
          videoId: matched.videoId || item.videoId,
          actualAirDate: matched.ngayAirReal || item.actualAirDate,
          sparkAdsCode: matched.sparkAds || item.sparkAdsCode,
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

  // ============================================================================
  // HỘP THOẠI TẠO DEAL (1 VIDEO ASSET + DỊCH VỤ GIA TĂNG) & LẬP PHỤ LỤC HỢP ĐỒNG
  // ============================================================================
  const [dealBuilderTargetId, setDealBuilderTargetId] = useState<string | null>(null);
  const [dealDraftCode, setDealDraftCode] = useState<string>('');
  const [dealDraftMasterContract, setDealDraftMasterContract] = useState<string>('');
  const [dealDraftAppendixCode, setDealDraftAppendixCode] = useState<string>('');
  const [dealDraftAppendixStatus, setDealDraftAppendixStatus] =
    useState<DealContractAppendixStatus>('CHỜ_KÝ');
  const [dealDraftPlannedAirDate, setDealDraftPlannedAirDate] = useState<string>('');
  const [dealDraftVideoNetCost, setDealDraftVideoNetCost] = useState<number>(0);
  const [dealDraftAdvanceAmount, setDealDraftAdvanceAmount] = useState<number>(0);
  const [dealDraftAddons, setDealDraftAddons] = useState<DealRightsTermItem[]>([]);
  const [dealDraftJobs, setDealDraftJobs] = useState<DealSowJobItem[]>([]);
  const [activeDealDraftJobIdx, setActiveDealDraftJobIdx] = useState<number>(0);

  const dealBuilderItem = useMemo(
    () => items.find((i) => i.id === dealBuilderTargetId) || null,
    [items, dealBuilderTargetId]
  );

  const isDealBuilderSowLocked = dealDraftAppendixStatus === 'ĐÃ_KÝ';

  const nextAmendmentAppendixCode = useMemo(() => {
    const baseCode = dealDraftCode || dealBuilderItem?.maBooking || 'BO2610-201';
    const currentPl = dealDraftAppendixCode || '';
    const matchSeq = currentPl.match(/-(\d+)$/);
    const nextSeq = matchSeq ? Number(matchSeq[1]) + 1 : 2;
    return generateDealAppendixCode(baseCode, nextSeq);
  }, [dealDraftCode, dealDraftAppendixCode, dealBuilderItem]);

  const handleUnlockForAmendmentAppendix = () => {
    const nextCode = nextAmendmentAppendixCode;
    setDealDraftAppendixCode(nextCode);
    setDealDraftAppendixStatus('CHỜ_KÝ');
    onNotify?.(
      `Đã mở khóa cấu hình Deal để lập Phụ lục bổ sung / điều chỉnh ${nextCode} (Trạng thái: Chờ ký).`,
      'info'
    );
  };

  const openDealBuilderModal = (item: ApprovedBookingListItem) => {
    openDrawerForItem(item, 'OVERVIEW');
  };

  const updateActiveDealDraftJob = (
    updater: (job: DealSowJobItem) => DealSowJobItem,
    targetIdx = activeDealDraftJobIdx
  ) => {
    setDealDraftJobs((prev) => {
      const safeIdx = Math.max(0, Math.min(targetIdx, prev.length - 1));
      return prev.map((j, idx) => (idx === safeIdx ? updater(j) : j));
    });
  };

  const handleAddJobToDealBuilder = () => {
    if (!dealBuilderItem) return;
    const nextIdx = dealDraftJobs.length;
    const baseBo = dealDraftCode || dealBuilderItem.maBooking || 'BO2610';
    const nextJobCode = `${baseBo}-J${String(nextIdx + 1).padStart(2, '0')}`;
    const defaultAddons = buildDefaultAddonServicesForDeal({
      maBooking: nextJobCode,
      totalNet: dealDraftVideoNetCost || 2000000,
      includeDefaultAddons: true,
    });
    const newJob: DealSowJobItem = {
      id: `${nextJobCode}-${Date.now()}`,
      jobCode: nextJobCode,
      jobTitle: `Bảng công việc #${nextIdx + 1} (${nextJobCode})`,
      productName: `${dealBuilderItem.sanPham || dealBuilderItem.brandName} (Job #${nextIdx + 1})`,
      mediaChannel: 'TikTok',
      affiliateChannel: dealBuilderItem.storeName.toLowerCase().includes('shopee')
        ? 'Shopee'
        : 'TikTok Shop',
      plannedAirDate:
        dealDraftPlannedAirDate ||
        dealBuilderItem.plannedAirDate ||
        `${dealBuilderItem.thangPlan.replace('/', '-')}-20`,
      videoAssetNetCost: dealDraftVideoNetCost || 2000000,
      quantity: 1,
      addonServices: defaultAddons,
      acceptanceStatus: 'CHUA_NGHIEM_THU',
    };
    const nextJobs = [...dealDraftJobs, newJob];
    setDealDraftJobs(nextJobs);
    setActiveDealDraftJobIdx(nextIdx);
    setDealDraftPlannedAirDate(newJob.plannedAirDate);
    setDealDraftVideoNetCost(newJob.videoAssetNetCost);
    setDealDraftAddons(newJob.addonServices);
  };

  const handleSelectDealDraftJob = (idx: number) => {
    const target = dealDraftJobs[idx];
    if (!target) return;
    setActiveDealDraftJobIdx(idx);
    setDealDraftPlannedAirDate(target.plannedAirDate || '');
    setDealDraftVideoNetCost(target.videoAssetNetCost || 0);
    setDealDraftAddons(target.addonServices || []);
  };

  const handleDeleteDealDraftJob = (idx: number) => {
    if (dealDraftJobs.length <= 1) return;
    const remaining = dealDraftJobs.filter((_, i) => i !== idx);
    const nextActive = Math.max(0, Math.min(activeDealDraftJobIdx, remaining.length - 1));
    setDealDraftJobs(remaining);
    setActiveDealDraftJobIdx(nextActive);
    const activeJob = remaining[nextActive];
    if (activeJob) {
      setDealDraftPlannedAirDate(activeJob.plannedAirDate || '');
      setDealDraftVideoNetCost(activeJob.videoAssetNetCost || 0);
      setDealDraftAddons(activeJob.addonServices || []);
    }
  };

  const handleTogglePresetAddonInBuilder = (
    termType: DealRightsTermItem['termType'],
    defaultLabel: string,
    anchorType: 'ACCEPTANCE_DATE' | 'AIR_DATE',
    defaultDays: number
  ) => {
    const activeJob = dealDraftJobs[activeDealDraftJobIdx];
    const currentAddons = activeJob ? activeJob.addonServices : dealDraftAddons;
    const exists = currentAddons.some((a) => a.termType === termType);
    const nextAddons = exists
      ? currentAddons.filter((a) => a.termType !== termType)
      : [
          ...currentAddons,
          {
            id: `${activeJob?.jobCode || dealDraftCode || 'DEAL'}-ADDON-${termType}-${currentAddons.length + 1}`,
            termType,
            termLabel: defaultLabel,
            scopeType: 'ASSET' as const,
            targetDeliverableId: activeJob?.jobCode,
            anchorType,
            durationDays: defaultDays,
            allocatedWeightPct: 10,
            allocatedCostVnd: 0,
            status: 'PENDING_ANCHOR' as const,
            acceptanceStatus: 'LOCKED_BY_VIDEO' as const,
            evidenceCodeOrUrl: '',
          },
        ];
    setDealDraftAddons(nextAddons);
    updateActiveDealDraftJob((job) => ({
      ...job,
      addonServices: nextAddons,
    }));
  };

  const handleSaveDealBuilderModal = (openSowAfterSave?: boolean) => {
    if (!dealBuilderItem) return;
    const normalizedJobs: DealSowJobItem[] =
      dealDraftJobs.length > 0
        ? dealDraftJobs
        : [
            {
              id: `${dealDraftCode || 'BO'}-J01`,
              jobCode: `${dealDraftCode || 'BO'}-J01`,
              jobTitle: `Bảng công việc #1 (${dealDraftCode || 'BO'}-J01)`,
              productName: dealBuilderItem.sanPham || dealBuilderItem.brandName,
              mediaChannel: 'TikTok',
              plannedAirDate: dealDraftPlannedAirDate,
              videoAssetNetCost: Math.max(0, dealDraftVideoNetCost),
              quantity: 1,
              addonServices: dealDraftAddons,
            },
          ];

    const missingAirJob = normalizedJobs.find((j) => !j.plannedAirDate?.trim());
    if (missingAirJob) {
      onNotify?.(
        `Vui lòng chọn Ngày air dự kiến cho ${missingAirJob.jobCode} của kênh @${dealBuilderItem.idKenh}.`,
        'warning'
      );
      return;
    }

    const jobSubtotals = normalizedJobs.map((j) => computeDealSowJobSubtotal(j));
    const totalVideoNet = jobSubtotals.reduce((s, t) => s + t.videoNet, 0);
    const addonsTotal = jobSubtotals.reduce((s, t) => s + t.addonsNet, 0);
    const totalDealNet = totalVideoNet + addonsTotal;
    const allAddons = normalizedJobs.flatMap((j) => j.addonServices || []);
    const primaryAirDate = normalizedJobs[0]?.plannedAirDate || dealDraftPlannedAirDate;
    const combinedProducts =
      normalizedJobs.length > 1
        ? Array.from(new Set(normalizedJobs.map((j) => j.productName?.trim()).filter(Boolean))).join(' + ')
        : normalizedJobs[0]?.productName || dealBuilderItem.sanPham;

    const finalDealCode =
      dealDraftCode.trim() || generateBookingOrderCode(dealBuilderItem.thangPlan, 205);
    const finalAppendixCode =
      dealDraftAppendixCode.trim() || generateDealAppendixCode(finalDealCode, 1);

    let savedRow: ApprovedBookingListItem | null = null;
    updateItemsAndSync((prev) =>
      prev.map((it) => {
        if (it.id !== dealBuilderItem.id) return it;
        const nextRow = recalculateApprovedBookingItem({
          ...it,
          maBooking: finalDealCode,
          bookingOrderCreated: true,
          bookingOrderCreatedAt: it.bookingOrderCreatedAt || new Date().toISOString(),
          linkedDealId: finalDealCode,
          sanPham: combinedProducts || it.sanPham,
          plannedAirDate: primaryAirDate,
          chiPhiBookingNetCuoi: totalDealNet,
          videoAssetNetCost: totalVideoNet,
          addonServicesNetCost: addonsTotal,
          soTienTamUngTruoc: Math.max(0, dealDraftAdvanceAmount),
          addonServices: allAddons,
          dealJobs: normalizedJobs,
          masterContractCode:
            dealDraftMasterContract.trim() ||
            generateMasterContractCode(it.idKenh, it.kocId),
          contractAppendixCode: finalAppendixCode,
          contractAppendixStatus: dealDraftAppendixStatus,
        });
        savedRow = nextRow;
        return nextRow;
      })
    );

    let mappedDeal: BookingDealItem | null = null;
    if (savedRow) {
      const syncedRow: ApprovedBookingListItem = savedRow;
      syncApprovedItemsBackToStaffBrandSheets([syncedRow], kocs, stores, deals);
      mappedDeal = buildBookingDealFromApprovedItem(syncedRow);
      if (onCreateOrUpdateDeals) {
        onCreateOrUpdateDeals([mappedDeal]);
      }
    }

    setDealBuilderTargetId(null);
    onNotify?.(
      `Đã lưu Deal ${finalDealCode} gồm ${normalizedJobs.length} Job (${normalizedJobs.length} Bảng công việc trong Phụ lục ${finalAppendixCode}) · Tổng Net: ${formatVnd(totalDealNet)}.`,
      'success'
    );
    if (openSowAfterSave && mappedDeal && onOpenContractForDeal) {
      onOpenContractForDeal(mappedDeal, 'SOW');
    }
  };

  // Tạo Deal (mã BO...) & Phụ lục cho 1 dòng hoặc nhiều dòng đã chọn
  const handleCreateBookingOrders = (targetItemIds?: string[]) => {
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
    const missingAirDate = items.filter(
      (i) => idSet.has(i.id) && !i.plannedAirDate?.trim()
    );
    if (missingAirDate.length > 0) {
      onNotify?.(
        `Vui lòng điền "P.Ngày air (Ngày air chốt)" cho kênh @${missingAirDate[0].idKenh} trước khi tạo Deal.`,
        'warning'
      );
      return;
    }

    const createdDeals: BookingDealItem[] = [];
    const syncedApprovedItems: ApprovedBookingListItem[] = [];

    updateItemsAndSync((prev) =>
      prev.map((item, idx) => {
        if (!idSet.has(item.id)) return item;
        const maBo =
          item.maBooking || generateBookingOrderCode(item.thangPlan, idx + 201);
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
        .join(', ')}${createdDeals.length > 3 ? '...' : ''}) và đồng bộ sang Quản lý Booking & Sheet Brand.`,
      'success'
    );
  };

  // Xóa các dòng đã chọn khỏi List Duyệt Book
  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    const delSet = new Set(selectedIds);
    updateItemsAndSync((prev) => prev.filter((i) => !delSet.has(i.id)));
    setSelectedIds([]);
    onNotify?.(`Đã xóa ${delSet.size} dòng khỏi List duyệt book.`, 'info');
  };

  // Thêm 1 dòng trực tiếp vào List Duyệt Book
  const handleAddDirectApprovedRow = () => {
    const defaultStoreObj =
      b2cStores.find((s) => s.storeName === selectedStore) || b2cStores[0];
    const targetMonth = selectedMonth === 'ALL' ? '2026/10' : selectedMonth;
    const nowIso = new Date().toISOString();
    const newItem = recalculateApprovedBookingItem({
      id: `ABL-${Date.now()}`,
      createdAt: nowIso,
      updatedAt: nowIso,
      maBooking: '',
      bookingOrderCreated: false,
      thangPlan: targetMonth,
      dot: 'Đợt 1',
      storeName: defaultStoreObj?.storeName || '4PM_Shopee_E2E-S',
      brandName: defaultStoreObj?.brandName || '4PM',
      nguoiPhuTrach: currentUserName,
      leaderName: defaultStoreObj?.bookingLeader || 'Đặng Thị Yến Nhi',
      idKenh: '',
      tenKenh: '',
      linkKenh: '',
      tepKenh: 'Review Nữ',
      follower: 0,
      sanPham: defaultStoreObj?.mainProducts?.[0] || '',
      pillarContent: 'Review trực tiếp',
      contentAngle: '',
      phanLoaiVideo: 'Affiliate KOC',
      dinhDangNghiemThu: 'Booking Video KOC',
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
      pipelineStatus: 'Sẵn sàng tạo BO',
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
    });

    updateItemsAndSync((prev) => [newItem, ...prev]);
    onNotify?.('Đã thêm 1 dòng mới vào List duyệt book.', 'info');
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

  // Mở hộp thoại nghiệm thu (có thể truyền sẵn 1 dòng BO cụ thể hoặc mở trống để dán nhiều link)
  const openAcceptanceModalForRow = (row?: ApprovedBookingListItem) => {
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

    // Tự động đăng ký các videoId vừa nghiệm thu vào Kho lịch sử Video Ads & KOC tuần (/api/koc-video-history)
    result.updatedApprovedItems.forEach((it) => {
      if (!it.videoId && !it.linkAir) return;
      void fetch('/api/koc-video-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REGISTER_NEW_VIDEO',
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
        }),
      }).catch(() => {});
    });

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
        header: 'KOC & Kênh phát sóng',
        width: 210,
        render: (item) => (
          <Person
            name={item.tenKenh || item.idKenh}
            sub={`@${item.idKenh.replace(/^@/, '')} · ${item.klGrade || 'KL3'}`}
            size={28}
          />
        ),
      },
      {
        key: 'deal',
        header: 'Mã Deal · HĐ / PL / BBNT & Link',
        width: 255,
        render: (item) => {
          const jobs = ensureDealJobsForApprovedItem(item);
          return (
            <div className="leading-tight space-y-1" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-code font-semibold text-ink">
                    {item.maBooking || 'Chưa cấp mã BO'}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-2xs font-code font-semibold ${
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
                </div>
                {item.contractAppendixStatus === 'ĐÃ_KÝ' ? (
                  <span className="text-2xs px-1.5 py-0.5 rounded bg-positive-soft text-positive font-medium">
                    PL đã ký
                  </span>
                ) : null}
              </div>

              {jobs.length > 1 && (
                <div
                  className="text-2xs font-code text-accent truncate max-w-[235px]"
                  title={jobs.map((j) => `${j.jobCode}: ${j.productName}`).join(' · ')}
                >
                  {jobs.map((j) => `${j.jobCode.replace(/^.*-J/, 'J')}: ${j.productName}`).join(' · ')}
                </div>
              )}

              {/* 1. HĐNT */}
              <div className="flex items-center justify-between gap-1 text-2xs">
                <span className="font-code text-ink-2 truncate max-w-[140px]" title={item.masterContractCode}>
                  HĐ: {item.masterContractCode || 'Chưa gắn'}
                </span>
                <span className="inline-flex items-center gap-1.5 shrink-0">
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
                <span className="inline-flex items-center gap-1.5 shrink-0">
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
                <span className="inline-flex items-center gap-1.5 shrink-0">
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
        header: 'Gian hàng & Sản phẩm',
        width: 205,
        render: (item) => (
          <div className="leading-tight space-y-0.5">
            <div className="font-medium text-ink truncate max-w-[195px]">
              {item.storeName}
            </div>
            <div
              className="text-2xs text-ink-3 truncate max-w-[195px]"
              title={item.sanPham}
            >
              {item.sanPham || item.brandName} · {item.thangPlan}
            </div>
          </div>
        ),
      },
      {
        key: 'cost',
        header: 'Chi phí Net / Gross',
        align: 'right',
        width: 155,
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
              {jobs.length > 1 && (
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
              )}
            </div>
          );
        },
      },
      {
        key: 'air',
        header: 'Lịch Air & Hiệu quả 30d',
        width: 185,
        render: (item) => {
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
                  <div className="font-code text-ink">
                    {item.actualAirDate
                      ? formatDate(item.actualAirDate)
                      : item.plannedAirDate
                      ? `Dự kiến ${formatDate(item.plannedAirDate)}`
                      : 'Chưa chốt lịch'}
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
            ? { label: 'Đang thực thi', tone: 'info' as const, sub: 'Đã ký SOW · Chờ air' }
            : hasBo
            ? { label: 'Chờ ký SOW', tone: 'warning' as const, sub: 'Đã cấp mã Deal' }
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
        width: 150,
        render: (item) => {
          const hasBo = item.bookingOrderCreated && Boolean(item.maBooking);
          const isSowSigned = item.contractAppendixStatus === 'ĐÃ_KÝ';
          const isAccepted = item.acceptanceStatus === 'DA_NGHIEM_THU';
          const mappedDeal = buildBookingDealFromApprovedItem(item);

          return (
            <div
              className="inline-flex items-center justify-end gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              {!hasBo ? (
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
                    label: 'Xem hồ sơ Deal & SOW',
                    icon: Eye,
                    onSelect: () => openDrawerForItem(item),
                  },
                  {
                    label: 'Nghiệm thu Video & Asset đi kèm',
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
    [onOpenContractForDeal]
  );

  return (
    <div className="space-y-4">
      {!(isDrawerOpen && activeDrawerItem) && (
        <>
          <PageActions>
            {onNavigateTab && (
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
              icon={FileCheck}
              onClick={() => handleCreateBookingOrders()}
            >
              Tạo Deal &amp; SOW ({selectedIds.length > 0 ? selectedIds.length : stats.pendingBoCount})
            </Button>
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

          <StatRow size="sm">
            <Stat
              label="Tổng deal duyệt"
              value={stats.total}
              numeric={stats.total}
            />
            <Stat
              label="Ngân sách Net chốt"
              value={formatVnd(stats.totalFinalNet)}
              numeric={stats.totalFinalNet}
            />
            <Stat
              label="Đã nghiệm thu / Tổng deal"
              value={`${stats.acceptedCount} / ${stats.total}`}
              progress={{ value: stats.acceptedCount, max: Math.max(1, stats.total) }}
            />
            <Stat
              label="Doanh số GMV 30 ngày"
              value={formatVnd(stats.totalGmv30d)}
              numeric={stats.totalGmv30d}
              tone={stats.avgRoi >= 2 ? 'positive' : undefined}
            />
          </StatRow>

      {/* Khung bảng chính chuẩn Panel flush + FilterBar + Chips + DataTable + Pagination */}
      <Panel flush>
        <div className="p-3.5 sm:p-4 border-b border-line bg-surface">
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

                {selectedIds.length > 0 && (
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
            <div className="mt-2.5 pt-2.5 border-t border-line flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 font-medium text-ink">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span>Sheet 3:</span>
                  <code className="rounded bg-sunken border border-line px-1.5 py-0.5 font-mono text-ink">
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
                    <ExternalLink className="w-3 h-3 shrink-0" />
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
          /* Chế độ Bảng tính Lark (Lark Grid View) */
          <div className="overflow-x-auto max-h-[75vh]">
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 z-20 bg-sunken border-b border-line">
                <tr>
                  <th className="sticky left-0 z-30 bg-sunken px-2 py-1.5 border-r border-line w-[38px] min-w-[38px] max-w-[38px] text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredItems.length > 0 &&
                        selectedIds.length === filteredItems.length
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-line"
                    />
                  </th>
                  <th className="sticky left-[38px] z-30 bg-sunken px-2.5 py-1.5 border-r border-line w-[142px] min-w-[142px] max-w-[142px] text-left">
                    <div className="font-semibold text-ink truncate">Mã Deal &amp; Phụ lục SOW</div>
                  </th>
                  <th className="sticky left-[180px] z-30 bg-sunken px-2.5 py-1.5 border-r border-line w-[168px] min-w-[168px] max-w-[168px] text-left shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]">
                    <div className="font-semibold text-ink truncate">Kênh KOC &amp; Link</div>
                  </th>
                  <th className="px-2.5 py-1.5 border-r border-line min-w-[175px] text-left">
                    <div className="font-semibold text-ink">Gian hàng &amp; Đợt</div>
                  </th>
                  <th className="px-2.5 py-1.5 border-r border-line min-w-[170px] text-left">
                    <div className="font-semibold text-ink">Sản phẩm &amp; Pillar</div>
                  </th>

                  {/* Nhóm cột nhân viên điền: Ngày air chốt, Giá cuối cùng, Tạm ứng, Tạo BO */}
                  <th className="px-2.5 py-1.5 border-r border-line min-w-[140px] text-left">
                    <div className="font-semibold text-ink">Ngày air chốt</div>
                  </th>
                  {viewColumnMode !== 'ACCEPTANCE_FOCUS' && (
                    <th className="px-2.5 py-1.5 border-r border-line min-w-[115px] text-right">
                      <div className="font-semibold text-ink">Giá đề xuất Net</div>
                    </th>
                  )}
                  <th className="px-2.5 py-1.5 border-r border-line min-w-[145px] text-right">
                    <div className="font-semibold text-ink">Giá chốt cuối (Net)</div>
                  </th>
                  <th className="px-2.5 py-1.5 border-r border-line min-w-[130px] text-right">
                    <div className="font-semibold text-ink">Gross &amp; Bậc KL</div>
                  </th>
                  <th className="px-2.5 py-1.5 border-r border-line min-w-[135px] text-right">
                    <div className="font-semibold text-ink">Tạm ứng &amp; Còn lại</div>
                  </th>

                  {viewColumnMode !== 'ACCEPTANCE_FOCUS' && (
                    <th className="px-2.5 py-1.5 border-r border-line min-w-[180px] text-left">
                      <div className="font-semibold text-ink">Loại TK thuế &amp; Hợp tác</div>
                    </th>
                  )}

                  {/* Nhóm cột Kéo thông tin & Đường link HĐNT, Phụ lục SOW (PL), BBNT */}
                  <th className="px-2.5 py-1.5 border-r border-line min-w-[220px] text-left">
                    <div className="font-semibold text-ink">1. Hợp đồng (HĐNT) &amp; Link</div>
                  </th>
                  <th className="px-2.5 py-1.5 border-r border-line min-w-[220px] text-left">
                    <div className="font-semibold text-ink">2. Phụ lục (PL SOW) &amp; Link</div>
                  </th>
                  <th className="px-2.5 py-1.5 border-r border-line min-w-[220px] text-left">
                    <div className="font-semibold text-ink">3. Biên bản (BBNT) &amp; Link</div>
                  </th>

                  {/* Nhóm cột Nghiệm thu Video */}
                  {viewColumnMode !== 'BOOKING_FOCUS' && (
                    <>
                      <th className="px-2.5 py-1.5 border-r border-line min-w-[235px] text-left">
                        <div className="font-semibold text-ink">Link video nghiệm thu</div>
                      </th>
                      <th className="px-2.5 py-1.5 border-r border-line min-w-[140px] text-left">
                        <div className="font-semibold text-ink">Ngày air thực tế</div>
                      </th>
                      <th className="px-2.5 py-1.5 border-r border-line min-w-[120px] text-left">
                        <div className="font-semibold text-ink">SLA Tiến độ</div>
                      </th>
                      <th className="px-2.5 py-1.5 border-r border-line min-w-[155px] text-left">
                        <div className="font-semibold text-ink">Mã Spark Ads</div>
                      </th>
                      <th className="px-2.5 py-1.5 border-r border-line min-w-[205px] text-right">
                        <div className="font-semibold text-ink">Views · Đơn · GMV 30d</div>
                      </th>
                      <th className="px-2.5 py-1.5 border-r border-line min-w-[150px] text-right">
                        <div className="font-semibold text-ink">ROI &amp; Đánh giá</div>
                      </th>
                      <th className="px-2.5 py-1.5 border-r border-line min-w-[165px] text-left">
                        <div className="font-semibold text-ink">Thanh toán &amp; Luồng Lark</div>
                      </th>
                      <th className="px-2.5 py-1.5 border-r border-line min-w-[175px] text-left">
                        <div className="font-semibold text-ink">Ngân hàng &amp; CCCD</div>
                      </th>
                    </>
                  )}

                  <th className="px-2.5 py-1.5 text-right min-w-[135px]">
                    <div className="font-semibold text-ink">Thao tác</div>
                  </th>
                </tr>
              </thead>

            <tbody className="divide-y divide-line">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={19} className="py-12 text-center text-ink-3">
                    <div className="flex flex-col items-center gap-2">
                      <FileSpreadsheet className="w-7 h-7 text-ink-3" />
                      <div className="font-medium text-ink">
                        Chưa có dòng KOC nào trong List duyệt book theo bộ lọc hiện tại
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Button
                          variant="primary"
                          size="sm"
                          icon={RefreshCw}
                          onClick={handlePullBrandApprovedFromSheets}
                        >
                          Đồng bộ dòng Brand duyệt từ Sheet
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Plus}
                          onClick={handleAddDirectApprovedRow}
                        >
                          Thêm dòng
                        </Button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  const isAccepted = item.acceptanceStatus === 'DA_NGHIEM_THU';
                  const stickyCellBg = isSelected
                    ? 'bg-accent-soft'
                    : 'bg-surface group-hover:bg-sunken';
                  return (
                    <tr
                      key={item.id}
                      onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                          setEditingRowId((prev) => (prev === item.id ? null : prev));
                        }
                      }}
                      className={`group ${
                        isSelected ? 'bg-accent-soft/30' : 'hover:bg-sunken/40'
                      } transition-colors`}
                    >
                      <td
                        className={`sticky left-0 z-10 ${stickyCellBg} px-2 py-2 border-r border-line w-[38px] min-w-[38px] max-w-[38px] text-center`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(item.id)}
                          className="rounded border-line"
                        />
                      </td>

                      {/* Cột 1: Mã Deal (BO...) & Phụ lục Hợp đồng + Cấu trúc Asset Video + DV gia tăng */}
                      <td
                        className={`sticky left-[38px] z-10 ${stickyCellBg} px-2.5 py-2 border-r border-line w-[142px] min-w-[142px] max-w-[142px] align-middle`}
                      >
                        {item.bookingOrderCreated && item.maBooking ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-positive-soft text-positive font-code text-xs font-semibold">
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                              <span className="truncate">{item.maBooking}</span>
                            </span>
                            <div className="text-2xs font-code text-ink-2 truncate" title={`HĐNT: ${item.masterContractCode || '—'} · Phụ lục Deal: ${item.contractAppendixCode || '—'}`}>
                              {item.contractAppendixCode || `PL-${item.maBooking}-01`} ({item.contractAppendixStatus || 'CHỜ_KÝ'})
                            </div>
                            <div className="flex items-center justify-between gap-1 text-2xs text-ink-3">
                              <span className="truncate" title="Số Job (Bảng công việc) và Dịch vụ đi kèm trong Phụ lục SOW">
                                {ensureDealJobsForApprovedItem(item).length} Job ({ensureDealJobsForApprovedItem(item).length} Bảng CV) + {(item.addonServices || []).length} DV
                              </span>
                              <button
                                type="button"
                                onClick={() => openDealBuilderModal(item)}
                                className="font-semibold text-accent hover:underline shrink-0"
                              >
                                Sửa Deal
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <Status tone="warning">Chờ tạo deal</Status>
                            <div>
                              <button
                                type="button"
                                onClick={() => openDealBuilderModal(item)}
                                className="text-2xs font-semibold text-accent hover:underline"
                              >
                                + Tạo Deal &amp; Phụ lục
                              </button>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Cột 2: ID kênh & Link kênh + Xem nhanh Hồ sơ / Hiệu suất / Lịch sử KOC */}
                      <td
                        className={`sticky left-[180px] z-10 ${stickyCellBg} px-2.5 py-2 border-r border-line w-[168px] min-w-[168px] max-w-[168px] align-middle shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={item.idKenh}
                              onChange={(e) =>
                                handleFieldChange(item.id, 'idKenh', e.target.value)
                              }
                              onDoubleClick={() => {
                                if (item.idKenh || item.kocId) {
                                  setQuickViewApprovedItem(item);
                                }
                              }}
                              placeholder="Nhập @id_kênh..."
                              className="w-full min-w-0 h-7 px-2 rounded border border-line bg-surface font-semibold text-xs text-ink"
                            />
                            <button
                              type="button"
                              onClick={() => setQuickViewApprovedItem(item)}
                              disabled={!item.idKenh && !item.kocId}
                              title={`Xem nhanh thông tin KOC, hiệu suất kênh & lịch sử hợp tác (@${item.idKenh})`}
                              className="h-7 w-7 rounded border border-line bg-surface text-accent hover:bg-sunken inline-flex items-center justify-center shrink-0 disabled:opacity-40"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between gap-1 text-2xs text-ink-3">
                            <button
                              type="button"
                              onClick={() => setQuickViewApprovedItem(item)}
                              className="truncate max-w-[100px] text-left text-accent hover:underline font-medium"
                              title={`Xem hồ sơ & lịch sử KOC: ${item.tenKenh || item.idKenh}`}
                            >
                              {item.tenKenh || item.tepKenh || 'Xem KOC'}
                            </button>
                            {item.linkKenh && (
                              <a
                                href={item.linkKenh}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-ink-2 hover:text-accent hover:underline shrink-0"
                              >
                                Kênh ↗
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Cột 3 & 4: Store / Brand / Đợt / PIC */}
                      <td className="px-2.5 py-2 border-r border-line align-middle">
                        <div className="font-semibold text-ink truncate max-w-[175px]" title={item.storeName}>
                          {item.storeName}
                        </div>
                        <div className="text-2xs text-ink-3">
                          {item.brandName} · {item.thangPlan} · {item.dot}
                        </div>
                        <div className="text-2xs text-ink-3">
                          PIC: {item.nguoiPhuTrach}
                        </div>
                      </td>

                      {/* Cột 31 & 89: Sản phẩm & Pillar */}
                      <td className="px-2.5 py-2 border-r border-line align-middle space-y-1">
                        <input
                          type="text"
                          value={item.sanPham}
                          onChange={(e) =>
                            handleFieldChange(item.id, 'sanPham', e.target.value)
                          }
                          placeholder="Sản phẩm..."
                          className="w-full h-7 px-2 rounded border border-line bg-surface text-xs text-ink"
                        />
                        <div className="text-2xs text-ink-3 truncate" title={item.pillarContent}>
                          Pillar: {item.pillarContent}
                        </div>
                      </td>

                      {/* Cột 61: Nhân viên điền P.Ngày air (Ngày air chốt) */}
                      <td className="px-2.5 py-2 border-r border-line align-middle">
                        <input
                          type="date"
                          value={item.plannedAirDate}
                          onChange={(e) =>
                            handleFieldChange(item.id, 'plannedAirDate', e.target.value)
                          }
                          className="w-full h-7 px-2 rounded border border-line bg-surface font-code text-xs text-ink focus:outline-none focus:border-ink"
                        />
                        <div className="text-2xs text-ink-3 mt-0.5">
                          Tuần KH: {computeWeekLabelFromDate(item.plannedAirDate) || '—'}
                        </div>
                      </td>

                      {/* Giá đề xuất ban đầu trên Sheet Listing */}
                      {viewColumnMode !== 'ACCEPTANCE_FOCUS' && (
                        <td className="px-2.5 py-2 border-r border-line align-middle text-right font-code text-xs text-ink-3 tabular-nums">
                          {formatVnd(item.giaDeXuatNet)}
                        </td>
                      )}

                      {/* Cột 18: Nhân viên điền Giá cuối cùng của Deal (Video Asset + Dịch vụ gia tăng) */}
                      <td className="px-2.5 py-2 border-r border-line align-middle">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatNumber(Number(item.chiPhiBookingNetCuoi) || 0)}
                          onChange={(e) =>
                            handleFieldChange(
                              item.id,
                              'chiPhiBookingNetCuoi',
                              parseThousandNumberInput(e.target.value)
                            )
                          }
                          className="w-full h-7 px-2 rounded border border-line bg-surface text-right font-code font-semibold text-xs text-ink tabular-nums focus:outline-none focus:border-ink"
                        />
                        <div className="text-2xs text-right font-code text-ink-3 mt-0.5">
                          Video: {formatVndShort(item.videoAssetNetCost ?? item.chiPhiBookingNetCuoi)}
                          {(item.addonServicesNetCost || 0) > 0
                            ? ` · DV: +${formatVndShort(item.addonServicesNetCost || 0)}`
                            : ' · DV: Gộp gói'}
                        </div>
                        {(item.khauTruHangMucHuy || 0) > 0 && (
                          <div className="text-2xs text-right font-code text-critical font-semibold">
                            Khấu trừ phần hủy: -{formatVndShort(item.khauTruHangMucHuy || 0)}
                          </div>
                        )}
                      </td>

                      {/* Gross kèm thuế TNCN & Bậc KL */}
                      <td className="px-2.5 py-2 border-r border-line align-middle text-right">
                        <div className="font-code font-semibold text-xs text-ink tabular-nums">
                          {formatVnd(item.chiPhiGrossKemThue)}
                        </div>
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-sunken border border-line font-code text-2xs font-semibold text-ink-2 mt-0.5">
                          {item.klGrade}
                        </span>
                      </td>

                      {/* Cột 40 & 42: Số tiền tạm ứng & Còn phải thanh toán */}
                      <td className="px-2.5 py-2 border-r border-line align-middle text-right space-y-1">
                        <div className="flex items-center justify-between gap-1 h-6 px-1.5 rounded border border-line bg-surface">
                          <span className="text-2xs text-ink-3 shrink-0">Cọc</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formatNumber(Number(item.soTienTamUngTruoc) || 0)}
                            onChange={(e) =>
                              handleFieldChange(
                                item.id,
                                'soTienTamUngTruoc',
                                parseThousandNumberInput(e.target.value)
                              )
                            }
                            placeholder="0"
                            className="w-full bg-transparent text-right font-code text-xs text-ink tabular-nums focus:outline-none"
                          />
                        </div>
                        <div className="text-2xs font-code font-semibold text-ink tabular-nums">
                          Còn trả: {formatVnd(item.soTienCanThanhToan)}
                        </div>
                      </td>

                      {viewColumnMode !== 'ACCEPTANCE_FOCUS' && (
                        /* Cột 17 & 20: Loại TK thanh toán & Hình thức hợp tác */
                        <td className="px-2.5 py-2 border-r border-line align-middle space-y-1">
                          <select
                            value={item.loaiTaiKhoanThanhToan}
                            onChange={(e) =>
                              handleFieldChange(
                                item.id,
                                'loaiTaiKhoanThanhToan',
                                e.target.value
                              )
                            }
                            className="w-full h-7 px-1.5 rounded border border-line bg-surface text-xs text-ink"
                          >
                            {LOAI_TAI_KHOAN_THANH_TOAN_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                          <div className="flex items-center gap-1 text-2xs text-ink-3">
                            <span>Hợp tác: {item.hinhThucHopTac}</span>
                            <span>·</span>
                            <span>{item.dinhDangNghiemThu}</span>
                          </div>
                        </td>
                      )}

                      {/* Cột HĐNT & Link */}
                      <td className="px-2.5 py-2 border-r border-line align-middle space-y-1 min-w-[220px]">
                        <input
                          type="text"
                          value={item.masterContractCode || ''}
                          onChange={(e) =>
                            handleFieldChange(item.id, 'masterContractCode', e.target.value)
                          }
                          placeholder="Mã HĐNT (VD: 291026/HDNT/...)"
                          className="w-full h-6 px-2 rounded border border-line bg-surface font-code text-2xs text-ink"
                        />
                        <input
                          type="text"
                          value={item.masterContractGoogleDocsUrl || ''}
                          onChange={(e) =>
                            handleFieldChange(item.id, 'masterContractGoogleDocsUrl', e.target.value)
                          }
                          placeholder="Link Google Docs HĐNT..."
                          className="w-full h-6 px-2 rounded border border-line bg-surface font-code text-2xs text-ink-2"
                        />
                        <div className="flex items-center justify-between gap-1 text-2xs">
                          <input
                            type="text"
                            value={item.masterContractSignedUrl || ''}
                            onChange={(e) =>
                              handleFieldChange(item.id, 'masterContractSignedUrl', e.target.value)
                            }
                            placeholder="Link HĐNT đã ký..."
                            className="w-full h-6 px-2 rounded border border-line bg-surface font-code text-2xs text-ink-2"
                          />
                          {item.masterContractGoogleDocsUrl && (
                            <a
                              href={item.masterContractGoogleDocsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-accent hover:underline font-medium shrink-0"
                            >
                              GDocs↗
                            </a>
                          )}
                          {item.masterContractSignedUrl && (
                            <a
                              href={item.masterContractSignedUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-positive hover:underline font-medium shrink-0"
                            >
                              Ký↗
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Cột Phụ lục SOW (PL) & Link */}
                      <td className="px-2.5 py-2 border-r border-line align-middle space-y-1 min-w-[220px]">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={item.contractAppendixCode || ''}
                            onChange={(e) =>
                              handleFieldChange(item.id, 'contractAppendixCode', e.target.value)
                            }
                            placeholder="Mã Phụ lục SOW..."
                            className="w-full h-6 px-2 rounded border border-line bg-surface font-code text-2xs text-ink"
                          />
                          <select
                            value={item.contractAppendixStatus || 'CHỜ_KÝ'}
                            onChange={(e) =>
                              handleFieldChange(
                                item.id,
                                'contractAppendixStatus',
                                e.target.value as DealContractAppendixStatus
                              )
                            }
                            className="h-6 px-1 rounded border border-line bg-surface text-2xs text-ink shrink-0"
                          >
                            <option value="CHƯA_LẬP">Chưa lập</option>
                            <option value="CHỜ_KÝ">Chờ ký</option>
                            <option value="ĐÃ_KÝ">Đã ký</option>
                          </select>
                        </div>
                        <input
                          type="text"
                          value={item.contractAppendixGoogleDocsUrl || ''}
                          onChange={(e) =>
                            handleFieldChange(item.id, 'contractAppendixGoogleDocsUrl', e.target.value)
                          }
                          placeholder="Link Google Docs PL SOW..."
                          className="w-full h-6 px-2 rounded border border-line bg-surface font-code text-2xs text-ink-2"
                        />
                        <div className="flex items-center justify-between gap-1 text-2xs">
                          <input
                            type="text"
                            value={item.contractAppendixSignedUrl || ''}
                            onChange={(e) =>
                              handleFieldChange(item.id, 'contractAppendixSignedUrl', e.target.value)
                            }
                            placeholder="Link PL SOW đã ký..."
                            className="w-full h-6 px-2 rounded border border-line bg-surface font-code text-2xs text-ink-2"
                          />
                          {item.contractAppendixGoogleDocsUrl && (
                            <a
                              href={item.contractAppendixGoogleDocsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-accent hover:underline font-medium shrink-0"
                            >
                              GDocs↗
                            </a>
                          )}
                          {item.contractAppendixSignedUrl && (
                            <a
                              href={item.contractAppendixSignedUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-positive hover:underline font-medium shrink-0"
                            >
                              Ký↗
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Cột Biên bản nghiệm thu (BBNT) & Link */}
                      <td className="px-2.5 py-2 border-r border-line align-middle space-y-1 min-w-[220px]">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={item.bbntCode || ''}
                            onChange={(e) =>
                              handleFieldChange(item.id, 'bbntCode', e.target.value)
                            }
                            placeholder="Mã BBNT..."
                            className="w-full h-6 px-2 rounded border border-line bg-surface font-code text-2xs text-ink"
                          />
                          <select
                            value={item.bbntStatus || 'CHƯA_LẬP'}
                            onChange={(e) =>
                              handleFieldChange(
                                item.id,
                                'bbntStatus',
                                e.target.value as DealContractAppendixStatus
                              )
                            }
                            className="h-6 px-1 rounded border border-line bg-surface text-2xs text-ink shrink-0"
                          >
                            <option value="CHƯA_LẬP">Chưa lập</option>
                            <option value="CHỜ_KÝ">Chờ ký</option>
                            <option value="ĐÃ_KÝ">Đã ký</option>
                          </select>
                        </div>
                        <input
                          type="text"
                          value={item.bbntGoogleDocsUrl || ''}
                          onChange={(e) =>
                            handleFieldChange(item.id, 'bbntGoogleDocsUrl', e.target.value)
                          }
                          placeholder="Link Google Docs BBNT..."
                          className="w-full h-6 px-2 rounded border border-line bg-surface font-code text-2xs text-ink-2"
                        />
                        <div className="flex items-center justify-between gap-1 text-2xs">
                          <input
                            type="text"
                            value={item.bbntSignedUrl || ''}
                            onChange={(e) =>
                              handleFieldChange(item.id, 'bbntSignedUrl', e.target.value)
                            }
                            placeholder="Link BBNT đã ký..."
                            className="w-full h-6 px-2 rounded border border-line bg-surface font-code text-2xs text-ink-2"
                          />
                          {item.bbntGoogleDocsUrl && (
                            <a
                              href={item.bbntGoogleDocsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-accent hover:underline font-medium shrink-0"
                            >
                              GDocs↗
                            </a>
                          )}
                          {item.bbntSignedUrl && (
                            <a
                              href={item.bbntSignedUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-positive hover:underline font-medium shrink-0"
                            >
                              Ký↗
                            </a>
                          )}
                        </div>
                      </td>

                      {viewColumnMode !== 'BOOKING_FOCUS' && (
                        <>
                          {/* Cột 9: Nghiệm thu Bước 1 (Video Asset) -> Bước 2 (Dịch vụ gia tăng) */}
                          <td className="px-2.5 py-2 border-r border-line align-middle">
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={item.linkAir}
                                onChange={(e) =>
                                  handleFieldChange(item.id, 'linkAir', e.target.value)
                                }
                                placeholder="Dán link video TikTok nghiệm thu..."
                                className="w-full h-7 px-2 rounded border border-line bg-surface text-xs text-ink"
                              />
                              {item.linkAir ? (
                                <div className="space-y-0.5">
                                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                                    <div className="flex items-center gap-1.5">
                                      <a
                                        href={item.linkAir}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-2xs font-semibold text-positive hover:underline"
                                      >
                                        Mở video ↗
                                      </a>
                                      <button
                                        type="button"
                                        onClick={() => openDeepVideoInspector(item)}
                                        className="text-2xs font-semibold text-accent hover:underline"
                                        title="Kiểm tra 5 tiêu chí Brief, Hook 3s & Giỏ hàng TikTok Shop"
                                      >
                                        · Đối soát Brief &amp; Giỏ
                                      </button>
                                    </div>
                                    <span className="px-1.5 py-0.2 rounded bg-positive-soft text-positive text-2xs font-semibold">
                                      B1: Đã nghiệm thu Video
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between gap-1 text-2xs">
                                    <span
                                      className={
                                        item.sequentialAcceptanceStage === '3_DA_NGHIEM_THU_TOAN_DEAL'
                                          ? 'text-positive font-semibold'
                                          : 'text-warning font-semibold'
                                      }
                                    >
                                      {item.sequentialAcceptanceStage === '3_DA_NGHIEM_THU_TOAN_DEAL'
                                        ? `B2: Đã nghiệm thu đủ (${(item.addonServices || []).filter((a) => a.acceptanceStatus === 'VERIFIED').length} DV)`
                                        : `B2: Chờ nghiệm thu phần khác (${(item.addonServices || []).filter((a) => a.acceptanceStatus === 'PENDING_ACCEPTANCE').length} DV)`}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => openDrawerForItem(item, 'ACCEPTANCE')}
                                      className="font-semibold text-accent hover:underline"
                                    >
                                      Nghiệm thu Asset →
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between gap-1 text-2xs text-ink-3">
                                  <span>B1: Chưa có Video · B2: Đang khóa</span>
                                  <button
                                    type="button"
                                    onClick={() => openAcceptanceModalForRow(item)}
                                    className="font-semibold text-accent hover:underline"
                                  >
                                    + Nghiệm thu
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Cột 6 & 7: Ngày air thực tế & Tuần real */}
                          <td className="px-2.5 py-2 border-r border-line align-middle">
                            <input
                              type="date"
                              value={item.actualAirDate}
                              onChange={(e) =>
                                handleFieldChange(
                                  item.id,
                                  'actualAirDate',
                                  e.target.value
                                )
                              }
                              className="w-full h-7 px-2 rounded border border-line bg-surface font-code text-xs text-ink"
                            />
                            <div className="text-2xs font-code text-ink-3 mt-0.5">
                              Tuần real:{' '}
                              <span className="font-semibold text-ink">
                                {item.tuanReal || '—'}
                              </span>{' '}
                              · Tháng: {item.thangAirReal || '—'}
                            </div>
                          </td>

                          {/* Cột 39: Trễ / Đúng hạn điền link air */}
                          <td className="px-2.5 py-2 border-r border-line align-middle">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                item.trangThaiSlaAir.startsWith('Trễ')
                                  ? 'bg-critical-soft text-critical'
                                  : item.trangThaiSlaAir === 'Đúng hạn' ||
                                    item.trangThaiSlaAir.startsWith('Sớm')
                                  ? 'bg-positive-soft text-positive'
                                  : 'bg-sunken text-ink-3 border border-line'
                              }`}
                            >
                              {item.trangThaiSlaAir}
                            </span>
                          </td>

                          {/* Cột 45: Mã ủy quyền Spark Ads */}
                          <td className="px-2.5 py-2 border-r border-line align-middle">
                            <input
                              type="text"
                              value={item.sparkAdsCode}
                              onChange={(e) =>
                                handleFieldChange(
                                  item.id,
                                  'sparkAdsCode',
                                  e.target.value
                                )
                              }
                              placeholder="Mã Spark Ads..."
                              className="w-full h-7 px-2 rounded border border-line bg-surface font-code text-xs text-ink"
                            />
                          </td>

                          {/* Cột 68-70: Views 30d, Đơn hàng 30d, GMV 30d */}
                          <td className="px-2.5 py-2 border-r border-line align-middle text-right space-y-1">
                            <div className="grid grid-cols-2 gap-1">
                              <div className="flex items-center justify-between gap-1 h-6 px-1.5 rounded border border-line bg-surface">
                                <span className="text-2xs text-ink-3 shrink-0">View</span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={formatNumber(Number(item.views30d) || 0)}
                                  onChange={(e) =>
                                    handleFieldChange(
                                      item.id,
                                      'views30d',
                                      parseThousandNumberInput(e.target.value)
                                    )
                                  }
                                  title="Views 30 ngày"
                                  className="w-full min-w-0 bg-transparent text-right font-code text-2xs text-ink tabular-nums focus:outline-none"
                                />
                              </div>
                              <div className="flex items-center justify-between gap-1 h-6 px-1.5 rounded border border-line bg-surface">
                                <span className="text-2xs text-ink-3 shrink-0">Đơn</span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={formatNumber(Number(item.orders30d) || 0)}
                                  onChange={(e) =>
                                    handleFieldChange(
                                      item.id,
                                      'orders30d',
                                      parseThousandNumberInput(e.target.value)
                                    )
                                  }
                                  title="Số đơn hàng 30 ngày"
                                  className="w-full min-w-0 bg-transparent text-right font-code text-2xs text-ink tabular-nums focus:outline-none"
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-1 h-6 px-1.5 rounded border border-line bg-surface">
                              <span className="text-2xs font-medium text-positive shrink-0">
                                GMV
                              </span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={formatNumber(Number(item.gmv30d) || 0)}
                                onChange={(e) =>
                                  handleFieldChange(
                                    item.id,
                                    'gmv30d',
                                    parseThousandNumberInput(e.target.value)
                                  )
                                }
                                title="GMV 30 ngày (VNĐ)"
                                className="w-full min-w-0 bg-transparent text-right font-code font-semibold text-xs text-positive tabular-nums focus:outline-none"
                              />
                            </div>
                          </td>

                          {/* Cột 71-76: GPM, ROI 30d & Đánh giá hiệu quả video */}
                          <td className="px-2.5 py-2 border-r border-line align-middle text-right space-y-0.5">
                            <div className="font-code font-semibold text-xs text-ink tabular-nums">
                              ROI: {item.roi30d.toFixed(2)}x
                            </div>
                            <div className="text-2xs font-code text-ink-3 tabular-nums">
                              GPM: {formatVnd(item.gpm30d)}
                            </div>
                            <span
                              className={`inline-block px-1.5 py-0.2 rounded text-2xs font-semibold truncate max-w-[140px] ${
                                item.danhGiaHieuQuaVideo.startsWith('Winner')
                                  ? 'bg-positive-soft text-positive'
                                  : item.danhGiaHieuQuaVideo.startsWith('Đạt KPI') ||
                                    item.danhGiaHieuQuaVideo.startsWith('FOC Hiệu quả')
                                  ? 'bg-accent-soft text-accent'
                                  : item.danhGiaHieuQuaVideo.startsWith('Cần tối ưu')
                                  ? 'bg-critical-soft text-critical'
                                  : 'bg-sunken text-ink-3'
                              }`}
                              title={item.danhGiaHieuQuaVideo}
                            >
                              {item.danhGiaHieuQuaVideo}
                            </span>
                          </td>

                          {/* Cột 22 & 30: Kế toán Thanh toán theo Deal & Nội dung chuyển khoản */}
                          <td className="px-2.5 py-2 border-r border-line align-middle space-y-1">
                            <select
                              value={item.trangThaiPhieuThanhToan}
                              onChange={(e) =>
                                handleFieldChange(
                                  item.id,
                                  'trangThaiPhieuThanhToan',
                                  e.target.value as ApprovedBookingPaymentStatus
                                )
                              }
                              className={`w-full h-7 px-1.5 rounded border text-xs font-semibold ${
                                item.trangThaiPhieuThanhToan === 'Đã thanh toán'
                                  ? 'bg-positive-soft text-positive border-line'
                                  : item.trangThaiPhieuThanhToan === 'Đủ điều kiện ĐNTT' ||
                                    item.trangThaiPhieuThanhToan === 'Đã lập ĐNTT'
                                  ? 'bg-accent-soft text-accent border-line'
                                  : 'bg-surface text-ink border-line'
                              }`}
                            >
                              {PAYMENT_STATUS_OPTIONS.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                            <div className="text-2xs font-code text-ink-2 truncate">
                              TT theo Deal:{' '}
                              <span className="font-semibold text-ink">
                                {formatVnd(item.soTienCanThanhToan)}
                              </span>
                            </div>
                            {item.larkApprovalInstanceCode ? (
                              <div className="flex items-center justify-between gap-1 text-2xs">
                                <span
                                  className="px-1.5 py-0.2 rounded bg-accent-soft text-accent font-code font-semibold truncate"
                                  title={item.larkApprovalRouteSummary || item.larkApprovalInstanceCode}
                                >
                                  {item.larkSlipCode || item.larkApprovalInstanceCode}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => openLarkPaymentModalForItem(item)}
                                  className="font-semibold text-accent hover:underline shrink-0"
                                >
                                  Luồng Lark
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-1 text-2xs">
                                <span
                                  className="font-code text-ink-3 truncate max-w-[115px]"
                                  title={item.noiDungChuyenKhoan}
                                >
                                  {item.noiDungChuyenKhoan}
                                </span>
                                {item.bookingOrderCreated && (
                                  <button
                                    type="button"
                                    onClick={() => openLarkPaymentModalForItem(item)}
                                    className="font-semibold text-accent hover:underline shrink-0"
                                  >
                                    + Lark Approval
                                  </button>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Cột 23-26: Ngân hàng, STK, CCCD (Che mờ 4 số cuối theo GEMINI.md §3 trừ Kế toán/Pháp chế) */}
                          <td className="px-2.5 py-2 border-r border-line align-middle text-2xs">
                            <div className="font-medium text-ink truncate max-w-[170px]">
                              {item.tenTaiKhoanNganHang || '—'}
                            </div>
                            <div className="font-code text-ink-2">
                              {maskSensitivePii(item.soTaiKhoan, canViewFullPii)} · {item.nganHang || '—'}
                            </div>
                            <div className="font-code text-2xs text-ink-3">
                              CCCD: {maskSensitivePii(item.soCccd, canViewFullPii)}
                            </div>
                          </td>
                        </>
                      )}

                      {/* Thao tác trên dòng: 1 Nút chính duy nhất theo tiến trình + ActionMenu phụ */}
                      <td className="px-2.5 py-2 align-middle text-right">
                        <div
                          className="inline-flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {!item.bookingOrderCreated ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => openDealBuilderModal(item)}
                            >
                              Tạo Deal
                            </Button>
                          ) : item.contractAppendixStatus !== 'ĐÃ_KÝ' && onOpenContractForDeal ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() =>
                                onOpenContractForDeal(
                                  buildBookingDealFromApprovedItem(item),
                                  'SOW'
                                )
                              }
                            >
                              Ký SOW
                            </Button>
                          ) : item.acceptanceStatus !== 'DA_NGHIEM_THU' ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => openAcceptanceModalForRow(item)}
                            >
                              Nghiệm thu
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => openLarkPaymentModalForItem(item)}
                            >
                              Lập ĐNTT
                            </Button>
                          )}

                          <ActionMenu
                            items={[
                              {
                                label: 'Xem hồ sơ Deal & SOW',
                                icon: Eye,
                                onSelect: () => openDrawerForItem(item),
                              },
                              {
                                label: 'Sửa cấu hình Deal & SOW',
                                icon: FileCheck,
                                onSelect: () => openDealBuilderModal(item),
                              },
                              ...(onOpenContractForDeal
                                ? [
                                    {
                                      label: 'Hợp đồng nguyên tắc (HĐNT)',
                                      icon: FileText,
                                      onSelect: () =>
                                        onOpenContractForDeal(
                                          buildBookingDealFromApprovedItem(item),
                                          'HDNT'
                                        ),
                                    },
                                    {
                                      label: 'Phụ lục SOW',
                                      icon: FileText,
                                      onSelect: () =>
                                        onOpenContractForDeal(
                                          buildBookingDealFromApprovedItem(item),
                                          'SOW'
                                        ),
                                    },
                                    {
                                      label: 'Biên bản nghiệm thu (BBNT)',
                                      icon: FileText,
                                      onSelect: () =>
                                        onOpenContractForDeal(
                                          buildBookingDealFromApprovedItem(item),
                                          'BBNT'
                                        ),
                                    },
                                  ]
                                : []),
                              {
                                label: 'Xem nháp BBNT',
                                icon: FileText,
                                onSelect: () =>
                                  setDraftBbntPreviewDeal(
                                    buildBookingDealFromApprovedItem(item)
                                  ),
                              },
                              {
                                label: 'Nghiệm thu video & quyền lợi',
                                icon: Video,
                                onSelect: () => openAcceptanceModalForRow(item),
                              },
                              {
                                label: 'Luồng duyệt thanh toán Lark',
                                icon: Send,
                                onSelect: () => openLarkPaymentModalForItem(item),
                              },
                              {
                                label: 'Xem hồ sơ KOC',
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
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
      </Panel>
        </>
      )}

      {/* Hộp thoại Nghiệm thu video & quyền lợi */}
      <Modal
        open={isAcceptanceModalOpen}
        onClose={() => setIsAcceptanceModalOpen(false)}
        title="Nghiệm thu video & quyền lợi"
        size="2xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsAcceptanceModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="secondary"
              icon={isInspectingTikTokLinks ? Loader2 : Sparkles}
              disabled={isInspectingTikTokLinks || parsedAcceptanceRows.length === 0}
              onClick={() => void handleInspectRealTikTokVideos()}
            >
              {isInspectingTikTokLinks
                ? 'Đang quét TikTok...'
                : 'Quét số liệu TikTok'}
            </Button>
            <Button
              variant="secondary"
              icon={Check}
              disabled={parsedAcceptanceRows.length === 0}
              onClick={handleConfirmVideoAcceptanceMapping}
            >
              Lưu nghiệm thu ({parsedAcceptanceRows.length})
            </Button>
            <Button
              variant="primary"
              icon={Send}
              disabled={parsedAcceptanceRows.length === 0}
              onClick={handleSaveAcceptanceAndOpenLarkApproval}
            >
              Lưu &amp; Lập ĐNTT Lark
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          {/* Tầng 1: Chọn BO mục tiêu + Ngày air mặc định + Dải KPI tóm tắt đợt nghiệm thu */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 rounded-lg bg-sunken border border-line items-end">
            <div className="lg:col-span-5">
              <Field label="Chọn Deal & Phụ lục SOW cần nghiệm thu (Hoặc tự động tìm theo @id_kênh)">
                <Select
                  value={selectedTargetBoItemId}
                  onChange={(e) => handleSelectTargetBoInModal(e.target.value)}
                >
                  <option value="AUTO">
                    Tự động tìm Deal & Phụ lục SOW theo @id_kênh KOC trong link video TikTok
                  </option>
                  {filteredItems.map((boItem) => (
                    <option key={boItem.id} value={boItem.id}>
                      {boItem.maBooking ? `[${boItem.maBooking}]` : '[Chưa tạo Deal]'} @
                      {boItem.idKenh} — {boItem.storeName} · {boItem.sanPham} (
                      {formatVnd(boItem.chiPhiBookingNetCuoi)})
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="lg:col-span-2">
              <Field label="Ngày air thực tế mặc định">
                <Input
                  type="date"
                  value={defaultAcceptanceAirDate}
                  onChange={(e) => setDefaultAcceptanceAirDate(e.target.value)}
                />
              </Field>
            </div>
            <div className="lg:col-span-5 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <div className="px-2.5 py-1.5 rounded border border-line bg-surface">
                <div className="text-2xs text-ink-3">Khớp Deal</div>
                <div className="text-xs font-semibold text-ink tabular-nums">
                  {acceptanceModalStats.matchedCount}/{acceptanceModalStats.total} video
                </div>
              </div>
              <div className="px-2.5 py-1.5 rounded border border-line bg-surface">
                <div className="text-2xs text-ink-3">Đúng hạn SLA</div>
                <div className="text-xs font-semibold text-positive tabular-nums">
                  {acceptanceModalStats.onTimeCount}/{acceptanceModalStats.total}
                </div>
              </div>
              <div className="px-2.5 py-1.5 rounded border border-line bg-surface">
                <div className="text-2xs text-ink-3">Tổng GMV 30d</div>
                <div className="text-xs font-semibold text-positive tabular-nums">
                  {formatVndShort(acceptanceModalStats.totalGmv)}
                </div>
              </div>
              <div className="px-2.5 py-1.5 rounded border border-line bg-surface">
                <div className="text-2xs text-ink-3">ROI bình quân</div>
                <div className="text-xs font-semibold text-ink tabular-nums">
                  {acceptanceModalStats.avgRoi}x ({acceptanceModalStats.winnerCount} Win)
                </div>
              </div>
            </div>
          </div>

          {/* Tầng 2: Ô dán nhanh danh sách link TikTok (hỗ trợ dán 1 hoặc nhiều link) */}
          <Field label="Dán Link Video TikTok cần nghiệm thu (Mỗi dòng 1 video: Link_TikTok | Mã_Spark_Ads | Views_30d | GMV_30d | Đơn_30d | Ngày_Air)">
            <Textarea
              rows={3}
              value={acceptanceBulkText}
              onChange={(e) => {
                setRowFieldOverrides({});
                setAcceptanceBulkText(e.target.value);
              }}
              placeholder="https://www.tiktok.com/@katthy.review/video/7425819201928371 | #SPARK-KATTHY | 32000 | 18500000 | 64 | 2026-10-25"
              className="font-code text-xs"
            />
          </Field>

          {/* Tầng 3: Bảng đối soát & chỉnh sửa trực tiếp các trường nghiệm thu cho từng dòng */}
          <div className="border border-line rounded-lg overflow-hidden bg-surface">
            <div className="px-3 py-2 bg-sunken border-b border-line flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-ink">
                Bảng đối soát nghiệm thu ({acceptanceModalStats.matchedCount}/{acceptanceModalStats.total} dòng đã gắn Deal &amp; SOW)
              </span>
            </div>
            <div className="max-h-80 overflow-x-auto overflow-y-auto">
              <table className="w-full text-xs border-collapse min-w-[1020px]">
                <thead className="sticky top-0 z-10 bg-sunken border-b border-line text-left">
                  <tr>
                    <th className="px-2.5 py-1.5 border-r border-line w-[180px]">
                      Kênh KOC &amp; Link Video
                    </th>
                    <th className="px-2.5 py-1.5 border-r border-line min-w-[250px]">
                      Chọn Deal & Phụ lục SOW (Hạng mục Video + DV gia tăng)
                    </th>
                    <th className="px-2.5 py-1.5 border-r border-line w-[160px]">
                      Ngày air thực tế &amp; SLA
                    </th>
                    <th className="px-2.5 py-1.5 border-r border-line w-[145px]">
                      Mã Spark Ads
                    </th>
                    <th className="px-2.5 py-1.5 border-r border-line w-[195px] text-right">
                      Views · Đơn · GMV 30d
                    </th>
                    <th className="px-2.5 py-1.5 text-right w-[165px]">
                      ROI · Đánh giá · ĐNTT
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {parsedAcceptanceRows.map((row, idx) => {
                    const m = row.matchedItem;
                    const finalCost = m?.chiPhiBookingNetCuoi || 0;
                    const remainPay = Math.max(
                      0,
                      finalCost - (m?.soTienTamUngTruoc || 0)
                    );
                    const roi =
                      finalCost > 0
                        ? Number((row.gmv30d / finalCost).toFixed(2))
                        : 0;
                    const gpm =
                      row.views30d > 0
                        ? Math.round((row.gmv30d / row.views30d) * 1000)
                        : 0;
                    const effectivenessLabel = evaluateVideoEffectivenessLabel(
                      roi,
                      row.views30d,
                      finalCost
                    );
                    const sla = computeAirSlaStatus(
                      m?.plannedAirDate || '',
                      row.actualAirDate
                    );
                    const cleanHandle = normalizeTikTokId(row.channelHandle).toLowerCase();
                    const sameChannelBoList = items.filter(
                      (it) =>
                        cleanHandle &&
                        normalizeTikTokId(it.idKenh).toLowerCase() === cleanHandle
                    );
                    const otherBoList = filteredItems.filter(
                      (it) => !sameChannelBoList.some((sc) => sc.id === it.id)
                    );
                    const insp =
                      (row.videoId ? inspectedVideosMap[row.videoId] : undefined) ||
                      (cleanHandle ? inspectedVideosMap[cleanHandle] : undefined);

                    return (
                      <tr key={idx} className="hover:bg-sunken/30 align-top">
                        {/* Cột 1: Kênh KOC & Link Video + Kết quả quét thực tế */}
                        <td className="px-2.5 py-2 border-r border-line space-y-1">
                          <div className="font-code font-semibold text-ink">
                            @{row.channelHandle || m?.idKenh || 'Chưa rõ'}
                          </div>
                          {row.videoId && (
                            <div className="font-code text-2xs text-ink-3">
                              ID: {row.videoId}
                            </div>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            {row.linkAir && (
                              <a
                                href={row.linkAir}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-2xs font-semibold text-positive hover:underline"
                              >
                                Mở video ↗
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => openDeepVideoInspector(m, row.linkAir)}
                              className="text-2xs font-semibold text-accent hover:underline"
                            >
                              Soi kịch bản &amp; giỏ
                            </button>
                          </div>
                          {insp && (
                            <div className="pt-1 border-t border-line space-y-0.5 text-2xs">
                              <div className="flex items-center gap-1 flex-wrap">
                                <span
                                  className={`px-1.5 py-0.2 rounded font-semibold ${
                                    insp.verdict === 'ĐẠT_CHUẨN'
                                      ? 'bg-positive-soft text-positive'
                                      : insp.verdict === 'CẦN_KIỂM_TRA'
                                      ? 'bg-warning-soft text-warning'
                                      : 'bg-critical-soft text-critical'
                                  }`}
                                >
                                  {insp.verdict === 'ĐẠT_CHUẨN'
                                    ? 'Đạt Brief'
                                    : insp.verdict === 'CẦN_KIỂM_TRA'
                                    ? 'Cần kiểm tra'
                                    : 'Lệch Brief'}
                                </span>
                                <span className="inline-flex items-center gap-0.5 text-ink-2">
                                  <ShoppingBag className="w-2.5 h-2.5 text-accent" />
                                  {insp.contentCheck.hasCartAnchor
                                    ? 'Có giỏ'
                                    : 'Không giỏ'}
                                </span>
                              </div>
                              {insp.contentCheck.hookFirst3Seconds && (
                                <div
                                  className="text-ink-3 truncate max-w-[165px]"
                                  title={insp.contentCheck.hookFirst3Seconds}
                                >
                                  Hook: &ldquo;{insp.contentCheck.hookFirst3Seconds}&rdquo;
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Cột 2: Chọn Booking Order (BO) */}
                        <td className="px-2.5 py-2 border-r border-line space-y-1">
                          <select
                            value={m?.id || ''}
                            onChange={(e) => {
                              const pickedId = e.target.value;
                              setRowManualBoMap((prev) => ({
                                ...prev,
                                [idx]: pickedId,
                              }));
                            }}
                            className="w-full h-7 px-2 rounded border border-line bg-surface text-xs font-medium text-ink focus:outline-none focus:border-ink"
                          >
                            <option value="">
                              -- Tự động tìm trên Sheet Listing Brand --
                            </option>
                            {sameChannelBoList.length > 0 && (
                              <optgroup
                                label={`Deal & Phụ lục SOW của kênh @${row.channelHandle} (${sameChannelBoList.length})`}
                              >
                                {sameChannelBoList.map((bo) => (
                                  <option key={bo.id} value={bo.id}>
                                    {bo.maBooking || 'Sẽ tự cấp BO'} · {bo.storeName} ·{' '}
                                    {bo.sanPham} ({formatVnd(bo.chiPhiBookingNetCuoi)})
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            {otherBoList.length > 0 && (
                              <optgroup label="Chọn Deal & Phụ lục SOW khác trong danh sách">
                                {otherBoList.map((bo) => (
                                  <option key={bo.id} value={bo.id}>
                                    {bo.maBooking || 'Chưa cấp BO'} · @{bo.idKenh} ·{' '}
                                    {bo.storeName} · {bo.sanPham}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                          {m ? (
                            <div className="flex items-center justify-between gap-1 text-2xs text-positive font-medium">
                              <span>
                                ✓ Deal:{' '}
                                <span className="font-code font-semibold text-ink">
                                  {m.maBooking || 'Tự cấp khi lưu'}
                                </span>{' '}
                                · {m.sanPham}
                              </span>
                              <span className="font-code font-semibold text-ink">
                                Net: {formatVnd(finalCost)}
                              </span>
                            </div>
                          ) : (
                            <div className="text-2xs text-warning">
                              Chưa có trong List duyệt — sẽ tự tìm từ Sheet Listing Brand
                            </div>
                          )}
                        </td>

                        {/* Cột 3: Ngày air thực tế (chỉnh trực tiếp) & SLA */}
                        <td className="px-2.5 py-2 border-r border-line space-y-1">
                          <input
                            type="date"
                            value={row.actualAirDate}
                            onChange={(e) =>
                              updateDraftRowField(idx, 'actualAirDate', e.target.value)
                            }
                            className="w-full h-7 px-2 rounded border border-line bg-surface font-code text-xs text-ink"
                          />
                          <div className="flex items-center justify-between gap-1 text-2xs font-code">
                            <span className="text-ink-3">
                              KH: {m?.plannedAirDate || '—'} ({computeWeekLabelFromDate(row.actualAirDate)})
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded font-sans font-semibold ${
                                sla.statusText.startsWith('Trễ')
                                  ? 'bg-critical-soft text-critical'
                                  : sla.statusText === 'Đúng hạn' ||
                                    sla.statusText.startsWith('Sớm')
                                  ? 'bg-positive-soft text-positive'
                                  : 'bg-sunken text-ink-3'
                              }`}
                            >
                              {sla.statusText}
                            </span>
                          </div>
                        </td>

                        {/* Cột 4: Mã ủy quyền Spark Ads (chỉnh trực tiếp) */}
                        <td className="px-2.5 py-2 border-r border-line space-y-1">
                          <input
                            type="text"
                            value={row.sparkAdsCode}
                            onChange={(e) =>
                              updateDraftRowField(idx, 'sparkAdsCode', e.target.value)
                            }
                            placeholder="#SPARK-..."
                            className="w-full h-7 px-2 rounded border border-line bg-surface font-code text-xs text-ink"
                          />
                          <div className="text-2xs text-ink-3">
                            {row.sparkAdsCode ? 'Đã có mã ủy quyền Ads' : 'Chưa nhập mã Ads'}
                          </div>
                        </td>

                        {/* Cột 5: Views 30d · Đơn 30d · GMV 30d (chỉnh trực tiếp) */}
                        <td className="px-2.5 py-2 border-r border-line space-y-1">
                          <div className="grid grid-cols-2 gap-1">
                            <div className="flex items-center justify-between gap-1 h-6 px-1.5 rounded border border-line bg-surface">
                              <span className="text-2xs text-ink-3 shrink-0">View</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={formatNumber(Number(row.views30d) || 0)}
                                onChange={(e) =>
                                  updateDraftRowField(
                                    idx,
                                    'views30d',
                                    parseThousandNumberInput(e.target.value)
                                  )
                                }
                                className="w-full bg-transparent text-right font-code text-2xs text-ink tabular-nums focus:outline-none"
                              />
                            </div>
                            <div className="flex items-center justify-between gap-1 h-6 px-1.5 rounded border border-line bg-surface">
                              <span className="text-2xs text-ink-3 shrink-0">Đơn</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={formatNumber(Number(row.orders30d) || 0)}
                                onChange={(e) =>
                                  updateDraftRowField(
                                    idx,
                                    'orders30d',
                                    parseThousandNumberInput(e.target.value)
                                  )
                                }
                                className="w-full bg-transparent text-right font-code text-2xs text-ink tabular-nums focus:outline-none"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-1 h-6 px-1.5 rounded border border-line bg-surface">
                            <span className="text-2xs font-medium text-positive shrink-0">
                              GMV
                            </span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formatNumber(Number(row.gmv30d) || 0)}
                              onChange={(e) =>
                                updateDraftRowField(
                                  idx,
                                  'gmv30d',
                                  parseThousandNumberInput(e.target.value)
                                )
                              }
                              className="w-full bg-transparent text-right font-code font-semibold text-xs text-positive tabular-nums focus:outline-none"
                            />
                          </div>
                        </td>

                        {/* Cột 6: ROI · GPM · Đánh giá hiệu quả · ĐNTT */}
                        <td className="px-2.5 py-2 text-right space-y-0.5">
                          <div className="font-code font-semibold text-xs text-ink tabular-nums">
                            ROI: {roi > 0 ? `${roi}x` : '0.00x'}{' '}
                            <span className="text-2xs font-normal text-ink-3">
                              (GPM {formatVndShort(gpm)})
                            </span>
                          </div>
                          <div>
                            <span
                              className={`inline-block px-1.5 py-0.2 rounded text-2xs font-semibold ${
                                effectivenessLabel.startsWith('Winner')
                                  ? 'bg-positive-soft text-positive'
                                  : effectivenessLabel.startsWith('Đạt KPI') ||
                                    effectivenessLabel.startsWith('FOC Hiệu quả')
                                  ? 'bg-accent-soft text-accent'
                                  : effectivenessLabel.startsWith('Cần tối ưu')
                                  ? 'bg-critical-soft text-critical'
                                  : 'bg-sunken text-ink-3'
                              }`}
                            >
                              {effectivenessLabel}
                            </span>
                          </div>
                          {m && (
                            <div className="text-2xs font-code text-positive font-semibold">
                              Đủ ĐK ĐNTT · Còn trả: {formatVndShort(remainPay)}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tầng 4 (Bước 2): Nghiệm thu theo từng Bảng công việc (Job) & Quyền lợi theo Deal + Đối soát Kế toán thanh toán Deal */}
          <div className="border border-line rounded-lg overflow-hidden bg-surface">
            <div className="px-3 py-2 bg-sunken border-b border-line flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-ink inline-flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-accent" />
                Bước 2: Nghiệm thu theo từng Bảng công việc (Job) &amp; Quyền lợi trong Phụ lục SOW
              </span>
            </div>

            <div className="p-3 space-y-3 max-h-96 overflow-y-auto">
              {parsedAcceptanceRows.map((row, idx) => {
                const m = row.matchedItem;
                if (!m) return null;
                const baseJobs = ensureDealJobsForApprovedItem({
                  ...m,
                  linkAir: row.linkAir || m.linkAir,
                  actualAirDate: row.actualAirDate || m.actualAirDate,
                  sparkAdsCode: row.sparkAdsCode || m.sparkAdsCode,
                });
                const currentDealJobs = stage2DealJobsEdits[m.id] || baseJobs;
                const activeJobIdx = Math.min(
                  Math.max(0, stage2ActiveJobIdxMap[m.id] || 0),
                  Math.max(0, currentDealJobs.length - 1)
                );
                const activeJob = currentDealJobs[activeJobIdx] || currentDealJobs[0];
                const hasVideoStep1 = Boolean(
                  row.linkAir?.trim() ||
                    m.linkAir?.trim() ||
                    row.actualAirDate?.trim() ||
                    activeJob?.linkAir?.trim()
                );

                const currentAddons =
                  activeJob?.addonServices && activeJob.addonServices.length > 0
                    ? activeJob.addonServices
                    : stage2AddonEdits[m.id] ||
                      (m.addonServices && m.addonServices.length > 0
                        ? m.addonServices
                        : buildDefaultAddonServicesForDeal({
                            maBooking: activeJob?.jobCode || m.maBooking || 'DEAL',
                            totalNet:
                              (activeJob
                                ? computeDealSowJobSubtotal(activeJob).plannedJobNet
                                : 0) || m.chiPhiBookingNetCuoi,
                            sparkAdsCode:
                              activeJob?.sparkAdsCode || row.sparkAdsCode || m.sparkAdsCode,
                            actualAirDate:
                              activeJob?.actualAirDate || row.actualAirDate || m.actualAirDate,
                            includeDefaultAddons: true,
                          }));

                const totalVideoCostAllJobs = currentDealJobs.reduce(
                  (s, j) => s + (Number(j.videoAssetNetCost) || 0),
                  0
                );
                const totalAddonsCostAllJobs = currentDealJobs.reduce(
                  (s, j) =>
                    s +
                    (j.addonServices || []).reduce(
                      (sa, a) => sa + (Number(a.allocatedCostVnd) || 0),
                      0
                    ),
                  0
                );
                const totalDroppedCostAllJobs = currentDealJobs.reduce(
                  (s, j) =>
                    s +
                    (j.addonServices || [])
                      .filter((a) => a.acceptanceStatus === 'DROPPED')
                      .reduce((sa, a) => sa + (Number(a.allocatedCostVnd) || 0), 0),
                  0
                );
                const totalDealNet =
                  totalVideoCostAllJobs + totalAddonsCostAllJobs || m.chiPhiBookingNetCuoi;
                const effectiveDealPayable = Math.max(
                  0,
                  totalDealNet - totalDroppedCostAllJobs - (m.soTienTamUngTruoc || 0)
                );

                const updateActiveJobInModal = (patch: Partial<DealSowJobItem>) => {
                  const nextJobs = currentDealJobs.map((j, jIdx) => {
                    if (jIdx !== activeJobIdx) return j;
                    return { ...j, ...patch };
                  });
                  setStage2DealJobsEdits((prev) => ({
                    ...prev,
                    [m.id]: nextJobs,
                  }));
                };

                return (
                  <div
                    key={`${m.id}-${idx}`}
                    className="p-2.5 rounded-lg border border-line bg-sunken/30 space-y-2 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-line">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-code font-semibold text-ink">
                          Deal: {m.maBooking || 'Sẽ cấp mã BO'} · @{m.idKenh} ({currentDealJobs.length} Job · {currentDealJobs.length} Bảng CV)
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-surface border border-line font-code text-2xs text-ink-2">
                          HĐNT: {m.masterContractCode || generateMasterContractCode(m.idKenh, m.kocId)}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-surface border border-line font-code text-2xs text-ink-2">
                          Phụ lục: {m.contractAppendixCode || `PL-${m.maBooking || 'DEAL'}-01`}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 font-code text-2xs">
                        <span>Video ({currentDealJobs.length} Job): {formatVnd(totalVideoCostAllJobs)}</span>
                        <span>+ DV kèm: {formatVnd(totalAddonsCostAllJobs)}</span>
                        {totalDroppedCostAllJobs > 0 && (
                          <span className="text-critical font-semibold">
                            - Khấu trừ hủy: {formatVnd(totalDroppedCostAllJobs)}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-positive-soft text-positive font-semibold">
                          Thanh toán Deal: {formatVnd(effectiveDealPayable)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const mergedItem = recalculateApprovedBookingItem({
                              ...m,
                              linkAir: row.linkAir || m.linkAir,
                              actualAirDate: row.actualAirDate || m.actualAirDate,
                              sparkAdsCode: row.sparkAdsCode || m.sparkAdsCode,
                              dealJobs: currentDealJobs,
                            });
                            setDraftBbntPreviewDeal(
                              buildBookingDealFromApprovedItem(mergedItem)
                            );
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-accent-soft text-accent font-sans font-semibold text-2xs transition-colors"
                        >
                          <FileText className="w-3 h-3" />
                          Xem nháp BBNT ({currentDealJobs.length} Bảng CV)
                        </button>
                      </div>
                    </div>

                    {/* Thanh chọn Bảng công việc (Job #1, Job #2...) trong Deal */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {currentDealJobs.map((jItem, jIdx) => {
                        const isSelectedJob = jIdx === activeJobIdx;
                        const sub = computeDealSowJobSubtotal(jItem);
                        return (
                          <button
                            key={jItem.id || jIdx}
                            type="button"
                            onClick={() =>
                              setStage2ActiveJobIdxMap((prev) => ({
                                ...prev,
                                [m.id]: jIdx,
                              }))
                            }
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-2xs transition-colors ${
                              isSelectedJob
                                ? 'border-accent bg-accent-soft/40 text-ink font-semibold'
                                : 'border-line bg-surface text-ink-2 hover:bg-sunken'
                            }`}
                          >
                            <span className="font-code text-accent font-semibold">
                              Bảng CV #{jIdx + 1} · {jItem.jobCode}
                            </span>
                            <span className="truncate max-w-[130px]">
                              {jItem.productName || jItem.jobTitle}
                            </span>
                            <span className="font-code text-ink">
                              {formatVndShort(sub.acceptedJobNet)}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Thông tin nghiệm thu Video chính của Bảng công việc (Job) đang chọn */}
                    {activeJob && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2 rounded border border-line bg-surface">
                        <div>
                          <span className="text-2xs text-ink-3 block">
                            Link Video nghiệm thu ({activeJob.jobCode})
                          </span>
                          <input
                            type="text"
                            value={
                              activeJobIdx === 0
                                ? activeJob.linkAir || row.linkAir || ''
                                : activeJob.linkAir || ''
                            }
                            onChange={(e) =>
                              updateActiveJobInModal({
                                linkAir: e.target.value,
                                acceptanceStatus: e.target.value.trim()
                                  ? 'DA_NGHIEM_THU'
                                  : 'CHUA_NGHIEM_THU',
                              })
                            }
                            placeholder="https://www.tiktok.com/@koc/video/..."
                            className="mt-0.5 w-full h-7 px-2 rounded border border-line bg-surface font-code text-xs text-ink"
                          />
                        </div>
                        <div>
                          <span className="text-2xs text-ink-3 block">
                            Ngày lên sóng thực tế ({activeJob.jobCode})
                          </span>
                          <input
                            type="date"
                            value={
                              activeJobIdx === 0
                                ? activeJob.actualAirDate || row.actualAirDate || ''
                                : activeJob.actualAirDate || ''
                            }
                            onChange={(e) =>
                              updateActiveJobInModal({ actualAirDate: e.target.value })
                            }
                            className="mt-0.5 w-full h-7 px-2 rounded border border-line bg-surface font-code text-xs text-ink"
                          />
                        </div>
                        <div>
                          <span className="text-2xs text-ink-3 block">
                            Mã Spark Ads ({activeJob.jobCode})
                          </span>
                          <input
                            type="text"
                            value={
                              activeJobIdx === 0
                                ? activeJob.sparkAdsCode || row.sparkAdsCode || ''
                                : activeJob.sparkAdsCode || ''
                            }
                            onChange={(e) =>
                              updateActiveJobInModal({ sparkAdsCode: e.target.value })
                            }
                            placeholder="#SPARK-..."
                            className="mt-0.5 w-full h-7 px-2 rounded border border-line bg-surface font-code text-xs text-ink"
                          />
                        </div>
                      </div>
                    )}

                    {!hasVideoStep1 ? (
                      <div className="flex items-center gap-2 p-2 rounded bg-warning-soft text-warning text-xs font-medium">
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Đang khóa Bước 2: Cần điền Link Video nghiệm thu ở Bước 1 trước khi nghiệm thu các phần dịch vụ gia tăng của Bảng công việc.
                        </span>
                      </div>
                    ) : currentAddons.length === 0 ? (
                      <div className="text-ink-3 text-xs">
                        Bảng công việc #{activeJobIdx + 1} ({activeJob?.jobCode}) chỉ gồm 1 Video thuần (không có dịch vụ gia tăng đi kèm).
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {currentAddons.map((addon, addonIdx) => {
                          const effectiveStatus =
                            addon.acceptanceStatus === 'LOCKED_BY_VIDEO'
                              ? 'PENDING_ACCEPTANCE'
                              : addon.acceptanceStatus || 'PENDING_ACCEPTANCE';
                          return (
                            <div
                              key={addon.id || addonIdx}
                              className="p-2 rounded border border-line bg-surface space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-ink inline-flex items-center gap-1">
                                  <Unlock className="w-3 h-3 text-positive shrink-0" />
                                  {addon.termLabel}
                                </span>
                                <span className="font-code text-2xs text-ink-3">
                                  {addon.allocatedCostVnd
                                    ? formatVnd(addon.allocatedCostVnd)
                                    : 'Gộp trong gói Job'}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 items-center">
                                <input
                                  type="text"
                                  value={
                                    addon.termType === 'ADS_CODE'
                                      ? addon.evidenceCodeOrUrl ||
                                        activeJob?.sparkAdsCode ||
                                        row.sparkAdsCode ||
                                        ''
                                      : addon.evidenceCodeOrUrl || ''
                                  }
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const nextList = currentAddons.map((a, i) =>
                                      i === addonIdx
                                        ? {
                                            ...a,
                                            evidenceCodeOrUrl: val,
                                            acceptanceStatus: val.trim()
                                              ? ('VERIFIED' as const)
                                              : a.acceptanceStatus,
                                          }
                                        : a
                                    );
                                    updateActiveJobInModal({ addonServices: nextList });
                                  }}
                                  placeholder="Mã Spark Ads / Link bài Reup / Link bàn giao file..."
                                  className="sm:col-span-7 h-7 px-2 rounded border border-line bg-surface font-code text-xs text-ink"
                                />
                                <select
                                  value={effectiveStatus}
                                  onChange={(e) => {
                                    const nextSt = e.target
                                      .value as DealRightsTermItem['acceptanceStatus'];
                                    const nextList = currentAddons.map((a, i) =>
                                      i === addonIdx
                                        ? {
                                            ...a,
                                            acceptanceStatus: nextSt,
                                          }
                                        : a
                                    );
                                    updateActiveJobInModal({ addonServices: nextList });
                                  }}
                                  className={`sm:col-span-5 h-7 px-1.5 rounded border text-xs font-semibold ${
                                    effectiveStatus === 'VERIFIED'
                                      ? 'bg-positive-soft text-positive border-line'
                                      : effectiveStatus === 'DROPPED'
                                        ? 'bg-critical-soft text-critical border-line'
                                        : 'bg-warning-soft text-warning border-line'
                                  }`}
                                >
                                  <option value="VERIFIED">Đã nghiệm thu</option>
                                  <option value="PENDING_ACCEPTANCE">Chờ trả quyền lợi</option>
                                  <option value="DROPPED">Không thực hiện (Khấu trừ)</option>
                                </select>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      {/* Hộp thoại Tạo Deal & Phụ lục SOW */}
      <Modal
        open={Boolean(dealBuilderItem)}
        onClose={() => setDealBuilderTargetId(null)}
        title={
          isDealBuilderSowLocked
            ? 'Chi tiết Deal & Phụ lục SOW (Đã ký)'
            : 'Tạo Deal & Phụ lục SOW'
        }
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDealBuilderTargetId(null)}>
              Đóng
            </Button>
            {isDealBuilderSowLocked ? (
              <Button
                variant="primary"
                icon={Unlock}
                onClick={handleUnlockForAmendmentAppendix}
              >
                Lập Phụ lục bổ sung ({nextAmendmentAppendixCode})
              </Button>
            ) : (
              <>
                <Button
                  variant={onOpenContractForDeal ? 'secondary' : 'primary'}
                  icon={FileCheck}
                  onClick={() => handleSaveDealBuilderModal(false)}
                >
                  Lưu Deal &amp; Phát hành Phụ lục
                </Button>
                {onOpenContractForDeal && (
                  <Button
                    variant="primary"
                    icon={FileText}
                    onClick={() => handleSaveDealBuilderModal(true)}
                  >
                    Lưu Deal &amp; Ký Phụ lục SOW
                  </Button>
                )}
              </>
            )}
          </>
        }
      >
        {dealBuilderItem && (
          <div className="space-y-4 text-xs">
            {/* Cảnh báo khóa điều khoản khi Phụ lục SOW đã ký hoàn tất */}
            {isDealBuilderSowLocked ? (
              <div className="p-3 rounded-lg bg-warning-soft border border-line flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-warning font-medium">
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>
                    Phụ lục SOW ({dealDraftAppendixCode}) đã ký hoàn tất — các điều khoản đơn giá, ngày air cam kết và hạng mục bàn giao đã được khóa để bảo toàn hồ sơ pháp lý.
                  </span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Unlock}
                  onClick={handleUnlockForAmendmentAppendix}
                >
                  Lập Phụ lục bổ sung ({nextAmendmentAppendixCode})
                </Button>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-positive-soft/60 border border-line flex items-center gap-2 text-positive font-medium">
                <Unlock className="w-4 h-4 shrink-0" />
                <span>
                  Phụ lục SOW đang ở trạng thái <span className="font-semibold">Chờ ký</span> — được phép chỉnh sửa toàn bộ đơn giá, ngày air dự kiến và quyền lợi đi kèm trước khi ký kết.
                </span>
              </div>
            )}

            {/* Khối 1: Định danh Deal & Phụ lục Hợp đồng (1 HĐNT/KOC + 1 Phụ lục/Deal) */}
            <div className="p-3 rounded-lg border border-line bg-sunken/40 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-ink inline-flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-accent" />
                  Định danh Deal &amp; Phụ lục SOW (KOC: @{dealBuilderItem.idKenh} · {dealBuilderItem.storeName})
                </span>
                <Status tone={isDealBuilderSowLocked ? 'positive' : 'warning'}>
                  {isDealBuilderSowLocked ? 'Đã ký SOW (Đã khóa)' : 'Cho phép chỉnh sửa'}
                </Status>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Field label="Mã Deal (Booking Order)">
                  <Input
                    value={dealDraftCode}
                    disabled={isDealBuilderSowLocked}
                    onChange={(e) => {
                      const nextCode = e.target.value;
                      setDealDraftCode(nextCode);
                      setDealDraftAppendixCode(generateDealAppendixCode(nextCode, 1));
                    }}
                  />
                </Field>
                <Field label="Mã Hợp đồng nguyên tắc (1 HĐNT / KOC)">
                  <Input
                    value={dealDraftMasterContract}
                    disabled={isDealBuilderSowLocked}
                    onChange={(e) => setDealDraftMasterContract(e.target.value)}
                  />
                </Field>
                <Field label="Mã Phụ lục theo Deal (1 Phụ lục / Deal)">
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={dealDraftAppendixCode}
                      disabled={isDealBuilderSowLocked}
                      onChange={(e) => setDealDraftAppendixCode(e.target.value)}
                    />
                    <Select
                      value={dealDraftAppendixStatus}
                      onChange={(e) =>
                        setDealDraftAppendixStatus(
                          e.target.value as DealContractAppendixStatus
                        )
                      }
                      className="w-auto shrink-0"
                    >
                      <option value="CHỜ_KÝ">Chờ ký PL</option>
                      <option value="ĐÃ_KÝ">Đã ký PL</option>
                      <option value="CHƯA_LẬP">Chưa lập</option>
                    </Select>
                  </div>
                </Field>
              </div>
            </div>

            {/* Khối 2: Quản lý danh sách Job trong Deal (1 Deal -> N Job, mỗi Job = 1 Bảng công việc trong Phụ lục SOW) */}
            <div className="p-3 rounded-lg border border-line bg-sunken/50 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink inline-flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-accent" />
                    Danh sách Job trong Deal ({dealDraftJobs.length} Job = {dealDraftJobs.length} Bảng công việc trong Phụ lục SOW)
                  </span>
                </div>
                {!isDealBuilderSowLocked && (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Plus}
                    onClick={handleAddJobToDealBuilder}
                  >
                    + Thêm Job (Bảng công việc mới vào Phụ lục)
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {dealDraftJobs.map((jobItem, jIdx) => {
                  const isSelected = jIdx === activeDealDraftJobIdx;
                  const jobSub = computeDealSowJobSubtotal(jobItem);
                  return (
                    <div
                      key={jobItem.id || jIdx}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                        isSelected
                          ? 'border-accent bg-accent-soft/40 text-ink font-semibold'
                          : 'border-line bg-surface text-ink-2 hover:bg-sunken'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectDealDraftJob(jIdx)}
                        className="text-left flex items-center gap-2"
                      >
                        <span className="px-1.5 py-0.5 rounded bg-accent/15 text-accent font-code text-2xs font-semibold">
                          Bảng CV #{jIdx + 1} · {jobItem.jobCode}
                        </span>
                        <span className="truncate max-w-[170px]">
                          {jobItem.productName || dealBuilderItem.sanPham || 'Sản phẩm'}
                        </span>
                        <span className="font-code text-accent">
                          {formatVnd(jobSub.plannedJobNet)}
                        </span>
                      </button>
                      {!isDealBuilderSowLocked && dealDraftJobs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteDealDraftJob(jIdx)}
                          className="text-ink-3 hover:text-critical p-0.5"
                          title="Xóa Job (Bảng công việc) này khỏi Deal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Khối 3: Bảng công việc của Job đang chọn (Video chính + Dịch vụ gia tăng đi kèm của Job) */}
            {(() => {
              const activeJob = dealDraftJobs[activeDealDraftJobIdx];
              const activeJobSub = activeJob
                ? computeDealSowJobSubtotal(activeJob)
                : { videoNet: dealDraftVideoNetCost, addonsNet: 0, plannedJobNet: dealDraftVideoNetCost };
              return (
                <div className="p-3 rounded-lg border border-line bg-surface space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-line">
                    <div className="font-semibold text-ink inline-flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-accent" />
                      <span>
                        Bảng công việc #{activeDealDraftJobIdx + 1} ({activeJob?.jobCode || `${dealDraftCode}-J01`}) — Chi tiết Hạng mục trong Phụ lục SOW
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-sunken border border-line font-code text-xs font-semibold text-accent">
                      Cộng Bảng công việc #{activeDealDraftJobIdx + 1}: {formatVnd(activeJobSub.plannedJobNet)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    <Field label="Mã Job trên Phụ lục">
                      <Input
                        value={activeJob?.jobCode || `${dealDraftCode}-J0${activeDealDraftJobIdx + 1}`}
                        disabled={isDealBuilderSowLocked}
                        onChange={(e) => {
                          const nextCode = e.target.value;
                          updateActiveDealDraftJob((j) => ({ ...j, jobCode: nextCode }));
                        }}
                      />
                    </Field>
                    <Field label="Sản phẩm / Nội dung Job này" className="sm:col-span-2">
                      <Input
                        value={activeJob?.productName ?? dealBuilderItem.sanPham}
                        disabled={isDealBuilderSowLocked}
                        onChange={(e) => {
                          const nextProd = e.target.value;
                          updateActiveDealDraftJob((j) => ({
                            ...j,
                            productName: nextProd,
                            jobTitle: `Bảng công việc #${activeDealDraftJobIdx + 1} (${j.jobCode}) — ${nextProd}`,
                          }));
                        }}
                      />
                    </Field>
                    <Field label="Kênh đăng tải">
                      <Select
                        value={activeJob?.mediaChannel || 'TikTok'}
                        disabled={isDealBuilderSowLocked}
                        onChange={(e) => {
                          const ch = e.target.value as NonNullable<DealSowJobItem['mediaChannel']>;
                          updateActiveDealDraftJob((j) => ({ ...j, mediaChannel: ch }));
                        }}
                      >
                        <option value="TikTok">TikTok</option>
                        <option value="Facebook">Facebook Reels</option>
                        <option value="Instagram">Instagram Reels</option>
                        <option value="Shopee Video">Shopee Video</option>
                        <option value="YouTube">YouTube Shorts</option>
                      </Select>
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <Field label="Ngày air dự kiến (Job này)">
                      <Input
                        type="date"
                        value={dealDraftPlannedAirDate}
                        disabled={isDealBuilderSowLocked}
                        onChange={(e) => {
                          const nextDate = e.target.value;
                          setDealDraftPlannedAirDate(nextDate);
                          updateActiveDealDraftJob((j) => ({ ...j, plannedAirDate: nextDate }));
                        }}
                      />
                    </Field>
                    <Field label="Đơn giá Net Hạng mục 1 - Video (VNĐ)">
                      <Input
                        type="text"
                        inputMode="numeric"
                        disabled={isDealBuilderSowLocked}
                        value={formatNumber(Number(dealDraftVideoNetCost) || 0)}
                        onChange={(e) => {
                          const nextCost = parseThousandNumberInput(e.target.value);
                          setDealDraftVideoNetCost(nextCost);
                          updateActiveDealDraftJob((j) => ({ ...j, videoAssetNetCost: nextCost }));
                        }}
                      />
                    </Field>
                    <Field label="Số tiền tạm ứng trước toàn Deal (VNĐ)">
                      <Input
                        type="text"
                        inputMode="numeric"
                        disabled={isDealBuilderSowLocked}
                        value={formatNumber(Number(dealDraftAdvanceAmount) || 0)}
                        onChange={(e) =>
                          setDealDraftAdvanceAmount(parseThousandNumberInput(e.target.value))
                        }
                      />
                    </Field>
                  </div>

                  {/* Các hạng mục đi kèm trong Bảng công việc của Job đang chọn */}
                  <div className="pt-2 border-t border-line space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-ink">
                        Các hạng mục công việc đi kèm trong Bảng công việc #{activeDealDraftJobIdx + 1} ({dealDraftAddons.length} hạng mục)
                      </span>
                      <div className="flex flex-wrap items-center gap-1">
                        {[
                          {
                            type: 'ADS_CODE' as const,
                            label: '+ Mã Spark Ads (30d)',
                            fullLabel: 'Cấp mã quảng cáo Spark Ads (30 ngày)',
                            anchor: 'ACCEPTANCE_DATE' as const,
                            days: 30,
                          },
                          {
                            type: 'IMAGE_USAGE' as const,
                            label: '+ Sử dụng hình ảnh (30d)',
                            fullLabel: 'Quyền sử dụng hình ảnh & file video gốc (30 ngày)',
                            anchor: 'ACCEPTANCE_DATE' as const,
                            days: 30,
                          },
                          {
                            type: 'EXCLUSIVITY' as const,
                            label: '+ Độc quyền ngành hàng',
                            fullLabel: 'Độc quyền ngành hàng (30 ngày)',
                            anchor: 'AIR_DATE' as const,
                            days: 30,
                          },
                          {
                            type: 'CROSS_POST_REUP' as const,
                            label: '+ Đăng chéo / Reup Wave 1',
                            fullLabel: 'Đăng chéo kênh phụ / Reup Wave 1',
                            anchor: 'ACCEPTANCE_DATE' as const,
                            days: 30,
                          },
                          {
                            type: 'LINK_BIO_CART' as const,
                            label: '+ Gắn giỏ & Link Bio',
                            fullLabel: 'Gắn giỏ hàng & Link Bio (30 ngày)',
                            anchor: 'AIR_DATE' as const,
                            days: 30,
                          },
                        ].map((preset) => {
                          const active = dealDraftAddons.some(
                            (a) => a.termType === preset.type
                          );
                          return (
                            <button
                              key={preset.type}
                              type="button"
                              disabled={isDealBuilderSowLocked}
                              onClick={() =>
                                handleTogglePresetAddonInBuilder(
                                  preset.type,
                                  preset.fullLabel,
                                  preset.anchor,
                                  preset.days
                                )
                              }
                              className={`px-2 py-1 rounded border text-2xs font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none ${
                                active
                                  ? 'bg-ink border-ink text-white'
                                  : 'bg-sunken border-line text-ink-2 hover:bg-surface'
                              }`}
                            >
                              {preset.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {dealDraftAddons.length === 0 ? (
                      <div className="p-2.5 rounded border border-dashed border-line text-ink-3 text-center">
                        Bảng công việc #{activeDealDraftJobIdx + 1} hiện chỉ có 1 Hạng mục Video chính. Bấm các nút phía trên nếu Job này có kèm Dịch vụ gia tăng (Mã Ads, Hình ảnh, Độc quyền, Đăng chéo...).
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {dealDraftAddons.map((addon, idx) => (
                          <div
                            key={addon.id || idx}
                            className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2 rounded border border-line bg-sunken/30"
                          >
                            <div className="sm:col-span-5">
                              <input
                                type="text"
                                disabled={isDealBuilderSowLocked}
                                value={addon.termLabel}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const nextAddons = dealDraftAddons.map((a, i) =>
                                    i === idx ? { ...a, termLabel: val } : a
                                  );
                                  setDealDraftAddons(nextAddons);
                                  updateActiveDealDraftJob((j) => ({ ...j, addonServices: nextAddons }));
                                }}
                                className="w-full h-7 px-2 rounded border border-line bg-surface font-medium text-xs text-ink disabled:bg-sunken disabled:text-ink-3"
                              />
                            </div>
                            <div className="sm:col-span-3 flex items-center gap-1">
                              <span className="text-2xs text-ink-3 shrink-0">Thời hạn:</span>
                              <input
                                type="number"
                                disabled={isDealBuilderSowLocked}
                                value={addon.durationDays}
                                onChange={(e) => {
                                  const days = Math.max(1, Number(e.target.value) || 30);
                                  const nextAddons = dealDraftAddons.map((a, i) =>
                                    i === idx ? { ...a, durationDays: days } : a
                                  );
                                  setDealDraftAddons(nextAddons);
                                  updateActiveDealDraftJob((j) => ({ ...j, addonServices: nextAddons }));
                                }}
                                className="w-14 h-7 px-1.5 rounded border border-line bg-surface font-code text-xs text-right text-ink disabled:bg-sunken disabled:text-ink-3"
                              />
                              <span className="text-2xs text-ink-3">ngày</span>
                            </div>
                            <div className="sm:col-span-3 flex items-center gap-1">
                              <span className="text-2xs text-ink-3 shrink-0">Phí Net:</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                disabled={isDealBuilderSowLocked}
                                value={formatNumber(Number(addon.allocatedCostVnd) || 0)}
                                onChange={(e) => {
                                  const cost = parseThousandNumberInput(e.target.value);
                                  const nextAddons = dealDraftAddons.map((a, i) =>
                                    i === idx ? { ...a, allocatedCostVnd: cost } : a
                                  );
                                  setDealDraftAddons(nextAddons);
                                  updateActiveDealDraftJob((j) => ({ ...j, addonServices: nextAddons }));
                                }}
                                className="w-full h-7 px-2 rounded border border-line bg-surface font-code text-xs text-right font-semibold text-ink tabular-nums disabled:bg-sunken disabled:text-ink-3"
                              />
                            </div>
                            <div className="sm:col-span-1 text-right">
                              {!isDealBuilderSowLocked && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextAddons = dealDraftAddons.filter((_, i) => i !== idx);
                                    setDealDraftAddons(nextAddons);
                                    updateActiveDealDraftJob((j) => ({ ...j, addonServices: nextAddons }));
                                  }}
                                  className="text-critical hover:underline text-xs font-semibold"
                                >
                                  Xóa
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Khối 4: Bảng tổng hợp toàn bộ N Bảng công việc (Job) trong Phụ lục SOW của Deal */}
            {(() => {
              const allSubs = dealDraftJobs.map((j) => computeDealSowJobSubtotal(j));
              const totalVideosNet = allSubs.reduce((s, x) => s + x.videoNet, 0);
              const totalAddonsNet = allSubs.reduce((s, x) => s + x.addonsNet, 0);
              const grandDealNet = totalVideosNet + totalAddonsNet;
              return (
                <div className="p-3 rounded-lg border border-line bg-sunken/40 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 font-code text-xs">
                    <div className="text-ink-2">
                      Tổng hợp Phụ lục SOW ({dealDraftAppendixCode}):{' '}
                      <span className="font-semibold text-ink">
                        {dealDraftJobs.length} Job ({dealDraftJobs.length} Bảng công việc)
                      </span>{' '}
                      · Video Net: <span className="font-semibold text-ink">{formatVnd(totalVideosNet)}</span> + Dịch vụ đi kèm:{' '}
                      <span className="font-semibold text-ink">{formatVnd(totalAddonsNet)}</span>
                    </div>
                    <div className="px-2.5 py-1 rounded bg-surface border border-line font-semibold text-ink">
                      Tổng giá trị Deal (Ghi trên Phụ lục): {formatVnd(grandDealNet)}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </Modal>

      {/* Hộp thoại Đối soát sâu 5 tiêu chí Brief, Kịch bản 4 bước, Hook 3s & Giỏ hàng TikTok Shop */}
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

      {/* Hộp thoại Đối soát Thanh toán theo Deal & Tạo luồng phê duyệt Lark Approval */}
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

      <Modal
        open={isReportSchemaModalOpen}
        onClose={() => setIsReportSchemaModalOpen(false)}
        title="Cấu trúc Sheet 3 — Kết quả (28 cột A → AB)"
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full gap-2">
            <div className="text-xs text-ink-2">
              Tab: <code className="font-mono text-ink">Template Report Video - đã chốt</code> · <code className="font-mono text-ink">Báo cáo &amp; Nghiệm thu</code>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setIsReportSchemaModalOpen(false)}>
                Đóng
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={FileSpreadsheet}
                disabled={isSyncingReportSheet}
                onClick={() => {
                  setIsReportSchemaModalOpen(false);
                  void handlePushReportSheetToGoogle();
                }}
              >
                Đẩy Sheet Kết quả
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-3">
          <Segmented
            value={reportSchemaGroupFilter}
            onChange={setReportSchemaGroupFilter}
            items={[
              { key: 'ALL', label: `Tất cả (${BOOKING_REPORT_COLUMNS.length})` },
              ...Array.from(new Set(BOOKING_REPORT_COLUMNS.map((c) => c.group))).map((grp) => ({
                key: grp,
                label: grp,
              })),
            ]}
          />

          <div className="max-h-[440px] overflow-y-auto border border-line rounded-lg">
            <DataTable
              columns={[
                {
                  key: 'col',
                  header: 'Cột',
                  width: 85,
                  render: (r) => (
                    <span className="font-mono text-xs font-semibold text-ink">
                      #{r.index} ({r.excelCol})
                    </span>
                  ),
                },
                {
                  key: 'header',
                  header: 'Tên cột',
                  render: (r) => (
                    <span className="font-medium text-xs text-ink">
                      {r.header.replace(/\n/g, ' ')}
                    </span>
                  ),
                },
                {
                  key: 'group',
                  header: 'Nhóm',
                  width: 170,
                  render: (r) => <span className="text-xs text-ink-2">{r.group}</span>,
                },
                {
                  key: 'source',
                  header: 'Nguồn dữ liệu / Công thức',
                  render: (r) =>
                    r.formulaBuilder ? (
                      <code className="text-2xs font-mono bg-sunken px-1.5 py-0.5 rounded border border-line text-ink">
                        {r.formulaBuilder(3)}
                      </code>
                    ) : (
                      <span className="text-xs text-ink-2">
                        {r.fillMode === 'BOOKING_MASTER'
                          ? 'Đẩy từ Quản lý Deal & Booking'
                          : r.fillMode === 'SELLER_DATA'
                            ? 'TikTok Seller / Nghiệm thu'
                            : 'Báo cáo Ads TikTok'}
                      </span>
                    ),
                },
              ]}
              rows={BOOKING_REPORT_COLUMNS.filter(
                (c) => reportSchemaGroupFilter === 'ALL' || c.group === reportSchemaGroupFilter
              )}
              rowKey={(r) => r.key}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(syncComparisonReport)}
        onClose={() => setSyncComparisonReport(null)}
        title={syncComparisonReport?.title || 'Đối soát đồng bộ Google Sheet'}
        size="lg"
        footer={
          syncComparisonReport ? (
            <div className="flex items-center justify-between w-full gap-2">
              <div className="text-xs text-ink-2">
                Phạm vi: <span className="font-medium text-ink">{syncComparisonReport.targetStoresLabel}</span>
                {syncComparisonReport.missingSheetStores &&
                  syncComparisonReport.missingSheetStores.length > 0 && (
                    <span className="text-warning ml-2">
                      ({syncComparisonReport.missingSheetStores.length} gian chưa gắn Link Sheet)
                    </span>
                  )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSyncComparisonReport(null)}
                >
                  {syncComparisonReport.stage === 'COMPLETED' ? 'Đóng' : 'Hủy'}
                </Button>
                {syncComparisonReport.stage === 'PREVIEW' && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={
                      isSyncingReportSheet
                        ? Loader2
                        : syncComparisonReport.mode === 'PUSH_REPORT_SHEET'
                          ? FileSpreadsheet
                          : Check
                    }
                    disabled={isSyncingReportSheet}
                    onClick={() => {
                      if (syncComparisonReport.mode === 'PUSH_REPORT_SHEET') {
                        void confirmExecutePushReportSheet();
                      } else if (syncComparisonReport.mode === 'PULL_REPORT_SHEET') {
                        confirmExecutePullReportSheet();
                      } else {
                        confirmExecutePullListingSheets();
                      }
                    }}
                  >
                    {isSyncingReportSheet
                      ? 'Đang đồng bộ…'
                      : syncComparisonReport.mode === 'PUSH_REPORT_SHEET'
                        ? `Xác nhận Đẩy (${syncComparisonReport.addedCount + syncComparisonReport.updatedCount + syncComparisonReport.unchangedCount} dòng)`
                        : syncComparisonReport.mode === 'PULL_REPORT_SHEET'
                          ? `Xác nhận Cập nhật (${syncComparisonReport.updatedCount} dòng)`
                          : `Xác nhận Đồng bộ (${syncComparisonReport.addedCount + syncComparisonReport.updatedCount} dòng)`}
                  </Button>
                )}
              </div>
            </div>
          ) : undefined
        }
      >
        {syncComparisonReport && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Segmented
                value={
                  syncDiffFilter === 'CHANGED' || syncDiffFilter === 'UNCHANGED' || syncDiffFilter === 'ALL'
                    ? syncDiffFilter
                    : 'ALL'
                }
                onChange={(val) => setSyncDiffFilter(val as typeof syncDiffFilter)}
                items={[
                  {
                    key: 'CHANGED',
                    label: `Thay đổi (${
                      syncComparisonReport.addedCount +
                      syncComparisonReport.updatedCount +
                      (syncComparisonReport.mode === 'PULL_REPORT_SHEET'
                        ? syncComparisonReport.extraCount
                        : 0)
                    })`,
                  },
                  {
                    key: 'UNCHANGED',
                    label: `Đã khớp (${syncComparisonReport.unchangedCount})`,
                  },
                  {
                    key: 'ALL',
                    label: `Tất cả (${syncComparisonReport.diffRows.length})`,
                  },
                ]}
              />
              {syncComparisonReport.stage === 'COMPLETED' && (
                <Status tone="positive">Đã đồng bộ</Status>
              )}
            </div>

            <StatRow size="sm">
              <Stat
                label="Thêm mới"
                value={syncComparisonReport.addedCount}
                numeric={syncComparisonReport.addedCount}
                tone={syncComparisonReport.addedCount > 0 ? 'positive' : undefined}
              />
              <Stat
                label="Cập nhật"
                value={syncComparisonReport.updatedCount}
                numeric={syncComparisonReport.updatedCount}
                tone={syncComparisonReport.updatedCount > 0 ? 'warning' : undefined}
              />
              <Stat
                label="Đã khớp"
                value={syncComparisonReport.unchangedCount}
                numeric={syncComparisonReport.unchangedCount}
              />
              <Stat
                label={syncComparisonReport.extraLabel}
                value={syncComparisonReport.extraCount}
                numeric={syncComparisonReport.extraCount}
              />
            </StatRow>

            <div className="max-h-[380px] overflow-y-auto border border-line rounded-lg">
              <DataTable
                columns={[
                  {
                    key: 'deal',
                    header: 'Mã BO & Gian hàng',
                    width: 155,
                    render: (r) => (
                      <div>
                        <div className="font-mono text-xs font-semibold text-ink">
                          {r.dealCode || '—'}
                        </div>
                        <div className="text-2xs text-ink-2">{r.store}</div>
                      </div>
                    ),
                  },
                  {
                    key: 'koc',
                    header: 'KOC & Sản phẩm',
                    width: 190,
                    render: (r) => (
                      <div>
                        <div className="text-xs font-medium text-ink">
                          {r.tenKoc} <span className="text-ink-2">(@{r.idKenh.replace(/^@/, '')})</span>
                        </div>
                        <div className="text-2xs text-ink-2 truncate max-w-[180px]">
                          {r.sanPham || '—'}
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Trạng thái',
                    width: 120,
                    render: (r) => {
                      if (r.status === 'ADDED') return <Status tone="positive">Thêm mới</Status>;
                      if (r.status === 'UPDATED') return <Status tone="warning">Cập nhật</Status>;
                      if (r.status === 'PRESERVED_SHEET') return <Status tone="info">Giữ trên Sheet</Status>;
                      if (r.status === 'UNMATCHED_SHEET') return <Status tone="critical">Chưa khớp</Status>;
                      return <Status tone="neutral">Đã khớp</Status>;
                    },
                  },
                  {
                    key: 'diffs',
                    header: 'Đối soát dữ liệu (Trước → Sau)',
                    render: (r) => (
                      <div className="space-y-1">
                        {r.fieldDiffs.length > 0 ? (
                          r.fieldDiffs.map((fd, i) => (
                            <div key={i} className="text-xs flex flex-wrap items-center gap-1.5">
                              <span className="font-medium text-ink">{fd.field}:</span>
                              <span className="text-ink-2 font-mono">{fd.oldVal}</span>
                              <span className="text-ink-3">→</span>
                              <span className="font-semibold text-accent font-mono">{fd.newVal}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-ink-2">
                            {r.preservedMetricsNote || 'Không thay đổi'}
                          </span>
                        )}
                      </div>
                    ),
                  },
                ]}
                rows={syncComparisonReport.diffRows.filter((r) => {
                  if (syncDiffFilter === 'ALL') return true;
                  if (syncDiffFilter === 'CHANGED') {
                    return (
                      r.status === 'ADDED' ||
                      r.status === 'UPDATED' ||
                      r.status === 'UNMATCHED_SHEET'
                    );
                  }
                  if (syncDiffFilter === 'UNCHANGED') return r.status === 'UNCHANGED';
                  return true;
                })}
                rowKey={(r) => r.id}
              />
            </div>
          </div>
        )}
      </Modal>

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
        onNotify={onNotify}
      />
    </div>
  );
};
