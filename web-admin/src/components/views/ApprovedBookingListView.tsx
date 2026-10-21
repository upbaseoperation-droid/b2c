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
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShoppingBag,
  Sparkles,
  Trash2,
  Video,
} from 'lucide-react';
import type {
  BookingDealItem,
  KocItem,
  SalaryGrade,
  StorePortfolioItem,
} from '../../lib/types';
import { formatVnd, formatVndShort } from '../../lib/format';
import {
  APPROVED_BOOKING_LIST_UPDATED_EVENT,
  DINH_DANG_NGHIEM_THU_OPTIONS,
  LOAI_TAI_KHOAN_THANH_TOAN_OPTIONS,
  PHAN_LOAI_VIDEO_OPTIONS,
  autoMapVideoAcceptanceByKocChannel,
  buildBookingDealFromApprovedItem,
  computeAirSlaStatus,
  computeWeekLabelFromDate,
  downloadApprovedBookingListCsv,
  evaluateVideoEffectivenessLabel,
  extractTikTokChannelAndVideoFromInput,
  formatApprovedBookingListToTsv,
  generateBookingOrderCode,
  loadApprovedBookingList,
  recalculateApprovedBookingItem,
  saveApprovedBookingList,
  syncApprovedItemsBackToStaffBrandSheets,
  transferBrandApprovedRowsToBookingList,
  type ApprovedBookingListItem,
  type ApprovedBookingPaymentStatus,
  type VideoAcceptanceMappingInput,
} from '../../lib/approvedBookingList';
import {
  loadStaffSheetCollection,
  makeSheetKey,
  normalizeTikTokId,
} from '../../lib/staffBrandListingSheet';
import type { TikTokVideoInspectionResult } from '../../lib/tiktokVideoInspector';
import { TikTokVideoInspectorModal } from '../koc/TikTokVideoInspectorModal';
import { ActionMenu, Button, Field, Input, Modal, PageActions, Segmented, Select, Status } from '../ui';

export interface ApprovedBookingListViewProps {
  kocs: KocItem[];
  stores: StorePortfolioItem[];
  deals: BookingDealItem[];
  currentUserName: string;
  initialStoreName?: string;
  initialMonthKey?: string;
  onCreateOrUpdateDeals?: (newOrUpdatedDeals: BookingDealItem[]) => void;
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
  initialStoreName,
  initialMonthKey,
  onCreateOrUpdateDeals,
  onNavigateTab,
  onNotify,
}) => {
  const b2cStores = useMemo(
    () => stores.filter((s) => s.isB2cManaged !== false && s.storeName),
    [stores]
  );

  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonthKey || '2026/10');
  const [selectedStore, setSelectedStore] = useState<string>(initialStoreName || 'ALL');
  const [filterPipeline, setFilterPipeline] = useState<string>('ALL');
  const [filterAcceptance, setFilterAcceptance] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewColumnMode, setViewColumnMode] = useState<'ALL_32' | 'BOOKING_FOCUS' | 'ACCEPTANCE_FOCUS'>('ALL_32');

  const [items, setItems] = useState<ApprovedBookingListItem[]>(() =>
    loadApprovedBookingList(kocs, stores, deals, currentUserName)
  );

  useEffect(() => {
    if (initialStoreName) setSelectedStore(initialStoreName);
    if (initialMonthKey) setSelectedMonth(initialMonthKey);
  }, [initialStoreName, initialMonthKey]);

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
  const sheetSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((it) => {
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
          it.storeName.toLowerCase().includes(q) ||
          it.brandName.toLowerCase().includes(q) ||
          it.sanPham.toLowerCase().includes(q) ||
          it.nguoiPhuTrach.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [items, selectedMonth, selectedStore, filterPipeline, filterAcceptance, searchQuery, editingRowId]);

  // Thống kê tổng hợp trên List Duyệt Book
  const stats = useMemo(() => {
    const total = filteredItems.length;
    const boCreatedCount = filteredItems.filter((i) => i.bookingOrderCreated && i.maBooking).length;
    const acceptedCount = filteredItems.filter((i) => i.acceptanceStatus === 'DA_NGHIEM_THU').length;
    const totalFinalNet = filteredItems.reduce((s, i) => s + (Number(i.chiPhiBookingNetCuoi) || 0), 0);
    const totalGross = filteredItems.reduce((s, i) => s + (Number(i.chiPhiGrossKemThue) || 0), 0);
    const totalGmv30d = filteredItems.reduce((s, i) => s + (Number(i.gmv30d) || 0), 0);
    const avgRoi = totalFinalNet > 0 ? Number((totalGmv30d / totalFinalNet).toFixed(2)) : 0;
    return {
      total,
      boCreatedCount,
      pendingBoCount: total - boCreatedCount,
      acceptedCount,
      totalFinalNet,
      totalGross,
      totalGmv30d,
      avgRoi,
    };
  }, [filteredItems]);

  // Chỉnh sửa trực tiếp trên từng dòng (Ngày air chốt, Giá cuối cùng, Tạm ứng, Sản phẩm, Ghi chú...)
  const handleFieldChange = <K extends keyof ApprovedBookingListItem>(
    id: string,
    field: K,
    value: ApprovedBookingListItem[K]
  ) => {
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
      const rowToSync = updatedRowRef;
      if (sheetSyncTimerRef.current) clearTimeout(sheetSyncTimerRef.current);
      sheetSyncTimerRef.current = setTimeout(() => {
        syncApprovedItemsBackToStaffBrandSheets([rowToSync], kocs, stores, deals);
      }, 350);
    }
  };

  // Kéo tất cả các dòng Brand chọn = Yes từ Sheet Listing Cá nhân sang List Duyệt Book
  const handlePullBrandApprovedFromSheets = () => {
    const collection = loadStaffSheetCollection(kocs, stores, deals, currentUserName);
    let totalAdded = 0;
    let totalUpdated = 0;

    Object.entries(collection.sheets).forEach(([sheetKey, rows]) => {
      const approvedRows = rows.filter((r) => r.brandChon === 'Yes');
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
    if (totalAdded === 0 && totalUpdated === 0) {
      onNotify?.(
        'Chưa có dòng nào đánh dấu "Brand chọn = Yes" trên các Sheet Listing Brand.',
        'info'
      );
    } else {
      onNotify?.(
        `Đã đồng bộ từ Sheet Listing Brand: thêm mới ${totalAdded} dòng, cập nhật ${totalUpdated} dòng.`,
        'success'
      );
    }
  };

  // Tạo Booking Order (mã BO...) cho 1 dòng hoặc nhiều dòng đã chọn
  const handleCreateBookingOrders = (targetItemIds?: string[]) => {
    const idsToProcess =
      targetItemIds && targetItemIds.length > 0
        ? targetItemIds
        : selectedIds.length > 0
        ? selectedIds
        : filteredItems.filter((i) => !i.bookingOrderCreated).map((i) => i.id);

    if (idsToProcess.length === 0) {
      onNotify?.('Tất cả các dòng hiển thị đã được tạo Mã Booking Order (BO...).', 'info');
      return;
    }

    const idSet = new Set(idsToProcess);
    const missingAirDate = items.filter(
      (i) => idSet.has(i.id) && !i.plannedAirDate?.trim()
    );
    if (missingAirDate.length > 0) {
      onNotify?.(
        `Vui lòng điền "P.Ngày air (Ngày air chốt)" cho kênh @${missingAirDate[0].idKenh} trước khi tạo Booking Order.`,
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
        const updated = recalculateApprovedBookingItem({
          ...item,
          maBooking: maBo,
          bookingOrderCreated: true,
          bookingOrderCreatedAt: new Date().toISOString(),
          linkedDealId: maBo,
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
      `Đã tạo thành công ${createdDeals.length} Booking Order (${createdDeals
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
      growthPic: defaultStoreObj?.accountOwnerName || 'Phạm Thương Thảo',
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
      giaDeXuatNet: 1500000,
      chiPhiBookingNetCuoi: 1500000,
      chiPhiGrossKemThue: Math.round(1500000 / 0.9),
      klGrade: 'KL3',
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
      soTienCanThanhToan: 1500000,
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
    () => new Date().toISOString().slice(0, 10)
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
              : targetItem?.views30d || 24500,
          gmv30d:
            targetItem?.gmv30d && targetItem.gmv30d > 0
              ? targetItem.gmv30d
              : Math.round((targetItem?.chiPhiBookingNetCuoi || 1500000) * 2.6),
          orders30d:
            targetItem?.orders30d && targetItem.orders30d > 0
              ? targetItem.orders30d
              : 18,
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

  const buildSampleLineForItem = (u: ApprovedBookingListItem, idx = 0) => {
    const sampleUrl =
      u.linkAir ||
      `https://www.tiktok.com/@${u.idKenh}/video/7426881920192837${idx + 1}`;
    const sampleSpark =
      u.sparkAdsCode || `#SPARK-${u.idKenh.slice(0, 6).toUpperCase()}-2610`;
    const sampleViews = u.views30d > 0 ? u.views30d : 22000 + idx * 9500;
    const sampleGmv =
      u.gmv30d > 0
        ? u.gmv30d
        : Math.round((u.chiPhiBookingNetCuoi || 1500000) * (2.6 + idx * 0.4));
    const sampleOrders =
      u.orders30d > 0 ? u.orders30d : Math.max(15, Math.round(sampleGmv / 255000));
    const sampleDate = u.actualAirDate || u.plannedAirDate || defaultAcceptanceAirDate;
    return `${sampleUrl} | ${sampleSpark} | ${sampleViews} | ${sampleGmv} | ${sampleOrders} | ${sampleDate}`;
  };

  // Mở hộp thoại nghiệm thu (có thể truyền sẵn 1 dòng BO cụ thể hoặc mở trống để dán nhiều link)
  const openAcceptanceModalForRow = (row?: ApprovedBookingListItem) => {
    setRowManualBoMap({});
    setRowFieldOverrides({});
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
      // Gợi ý mẫu từ các dòng chưa nghiệm thu trong danh sách đang lọc
      const unaccepted = filteredItems
        .filter((i) => i.acceptanceStatus === 'CHUA_NGHIEM_THU' && i.idKenh)
        .slice(0, 3);
      if (unaccepted.length > 0) {
        setAcceptanceBulkText(
          unaccepted.map((u, idx) => buildSampleLineForItem(u, idx)).join('\n')
        );
      } else {
        setAcceptanceBulkText('');
      }
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
          : parts[1] ||
            matchedItem?.sparkAdsCode ||
            (effectiveHandle
              ? `#SPARK-${effectiveHandle.slice(0, 6).toUpperCase()}-2610`
              : '');
      const views30d =
        override.views30d !== undefined
          ? override.views30d
          : Number((parts[2] || '').replace(/[^0-9]/g, '')) ||
            matchedItem?.views30d ||
            24500;
      const gmv30d =
        override.gmv30d !== undefined
          ? override.gmv30d
          : Number((parts[3] || '').replace(/[^0-9]/g, '')) ||
            matchedItem?.gmv30d ||
            Math.round((matchedItem?.chiPhiBookingNetCuoi || 1500000) * 2.6);
      const orders30d =
        override.orders30d !== undefined
          ? override.orders30d
          : Number((parts[4] || '').replace(/[^0-9]/g, '')) ||
            matchedItem?.orders30d ||
            Math.max(12, Math.round(gmv30d / 260000));
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

    setItems(result.updatedList);

    if (result.updatedApprovedItems.length > 0 && onCreateOrUpdateDeals) {
      const dealsToSync = result.updatedApprovedItems.map((it) =>
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
      const tsv = formatApprovedBookingListToTsv(target, includeHeaders);
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

  return (
    <div className="space-y-3">
      <PageActions>
        {onNavigateTab && (
          <Button
            variant="secondary"
            size="sm"
            icon={ArrowLeft}
            onClick={() =>
              onNavigateTab('koc-listing', {
                storeName: selectedStore !== 'ALL' ? selectedStore : undefined,
                monthKey: selectedMonth !== 'ALL' ? selectedMonth : undefined,
              })
            }
          >
            Về Sheet Listing
          </Button>
        )}
        {onNavigateTab && (
          <Button
            variant="secondary"
            size="sm"
            icon={ExternalLink}
            onClick={() => onNavigateTab('booking')}
          >
            Mở Quản lý Booking
          </Button>
        )}
      </PageActions>

      {/* Khung làm việc tích hợp: Ngữ cảnh + Chỉ số + Bộ lọc + Bảng List Duyệt Book */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden shadow-2xs">
        {/* Tầng 1: Chọn Tháng / Gian hàng + Chế độ xem cột + Chỉ số tóm tắt */}
        <div className="px-3 py-2 border-b border-line bg-sunken/40 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              aria-label="Chọn tháng"
              className="h-7 px-2 text-xs font-semibold rounded-md border border-line-strong bg-surface text-ink shrink-0 focus:outline-none focus:border-ink"
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m === 'ALL' ? 'Tất cả tháng' : `Tháng ${m}`}
                </option>
              ))}
            </select>

            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              aria-label="Chọn Gian hàng / Brand"
              className="h-7 px-2.5 text-xs font-semibold rounded-md border border-line-strong bg-surface text-ink max-w-[240px] truncate shrink-0 focus:outline-none focus:border-ink"
            >
              <option value="ALL">Tất cả Brand / Gian hàng ({items.length})</option>
              {b2cStores.map((st) => {
                const count = items.filter(
                  (i) =>
                    i.storeName === st.storeName &&
                    (selectedMonth === 'ALL' || i.thangPlan === selectedMonth)
                ).length;
                return (
                  <option key={st.id} value={st.storeName}>
                    {st.brandName} — {st.storeName} ({count})
                  </option>
                );
              })}
            </select>

            <span className="hidden sm:inline-block h-4 w-px bg-line mx-0.5 shrink-0" />

            <Segmented
              value={viewColumnMode}
              onChange={setViewColumnMode}
              items={[
                { key: 'ALL_32', label: 'Đầy đủ cột' },
                { key: 'BOOKING_FOCUS', label: 'Chốt Book & Tạo BO' },
                { key: 'ACCEPTANCE_FOCUS', label: 'Nghiệm thu & Thanh toán' },
              ]}
            />
          </div>

          {/* Cụm chỉ số tóm tắt gọn trên 1 dòng */}
          <div className="flex flex-wrap items-center gap-3 px-2.5 py-1 rounded-md bg-surface border border-line text-xs shrink-0">
            <div className="flex items-center gap-1" title={`${stats.boCreatedCount} đã tạo BO · ${stats.pendingBoCount} chờ tạo BO`}>
              <span className="text-ink-3">Duyệt:</span>
              <strong className="text-ink tabular-nums">{stats.total} KOC</strong>
              <span className="text-[11px] text-ink-3 tabular-nums">
                ({stats.boCreatedCount} BO)
              </span>
            </div>
            <span className="h-3 w-px bg-line" />
            <div className="flex items-center gap-1" title={`Gross kèm thuế: ${formatVnd(stats.totalGross)}`}>
              <span className="text-ink-3">Net chốt:</span>
              <strong className="text-ink tabular-nums">
                {formatVndShort(stats.totalFinalNet)}
              </strong>
              <span className="text-[11px] text-ink-3 tabular-nums">
                (Gross {formatVndShort(stats.totalGross)})
              </span>
            </div>
            <span className="h-3 w-px bg-line" />
            <div className="flex items-center gap-1">
              <span className="text-ink-3">Nghiệm thu:</span>
              <strong className="text-positive tabular-nums">
                {stats.acceptedCount}/{stats.total}
              </strong>
            </div>
            <span className="h-3 w-px bg-line" />
            <div className="flex items-center gap-1">
              <span className="text-ink-3">GMV 30d:</span>
              <strong className="text-ink tabular-nums">
                {formatVndShort(stats.totalGmv30d)}
              </strong>
              <span className="text-[11px] font-semibold text-emerald-700 tabular-nums">
                · ROI {stats.avgRoi}x
              </span>
            </div>
          </div>
        </div>

        {/* Tầng 2: Thanh công cụ Tìm kiếm + Lọc trạng thái + Thao tác nghiệp vụ (Gói gọn 1 hàng) */}
        <div className="px-3 py-2 border-b border-line bg-surface flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="relative w-48 sm:w-56">
              <Search className="w-3.5 h-3.5 text-ink-3 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm mã BO, @id_kênh, SP..."
                className="w-full h-7 pl-7 pr-2 text-xs rounded-md border border-line-strong bg-surface text-ink focus:outline-none focus:border-ink"
              />
            </div>

            <select
              value={filterPipeline}
              onChange={(e) => setFilterPipeline(e.target.value)}
              className="h-7 px-2 text-xs rounded-md border border-line-strong bg-surface text-ink"
            >
              <option value="ALL">Trạng thái BO: Tất cả</option>
              <option value="Chờ chốt giá & ngày air">Chờ chốt giá &amp; ngày air</option>
              <option value="Sẵn sàng tạo BO">Sẵn sàng tạo BO</option>
              <option value="Đang thực thi (Đã tạo BO)">Đang thực thi (Đã tạo BO)</option>
              <option value="Đã nghiệm thu video">Đã nghiệm thu video</option>
              <option value="Đã quyết toán">Đã quyết toán</option>
            </select>

            <select
              value={filterAcceptance}
              onChange={(e) => setFilterAcceptance(e.target.value)}
              className="h-7 px-2 text-xs rounded-md border border-line-strong bg-surface text-ink"
            >
              <option value="ALL">Nghiệm thu: Tất cả</option>
              <option value="CHUA_NGHIEM_THU">Chưa nghiệm thu</option>
              <option value="DA_NGHIEM_THU">Đã nghiệm thu</option>
            </select>

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
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={handlePullBrandApprovedFromSheets}
            >
              Đồng bộ từ Sheet
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={Plus}
              onClick={handleAddDirectApprovedRow}
            >
              Thêm dòng
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={Copy}
              onClick={() => void handleCopyTsv(true)}
            >
              Copy Google Sheet
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={Video}
              onClick={() => openAcceptanceModalForRow()}
            >
              Nghiệm thu Video
            </Button>

            <Button
              variant="primary"
              size="sm"
              icon={FileCheck}
              onClick={() => handleCreateBookingOrders()}
            >
              Tạo Booking Order (
              {selectedIds.length > 0 ? selectedIds.length : stats.pendingBoCount})
            </Button>

            <ActionMenu
              label="Xuất dữ liệu & Tiện ích"
              items={[
                {
                  label: 'Copy Google Sheet (Kèm tiêu đề cột)',
                  icon: Copy,
                  onSelect: () => void handleCopyTsv(true),
                },
                {
                  label: 'Copy Google Sheet (Chỉ dòng dữ liệu)',
                  icon: Copy,
                  onSelect: () => void handleCopyTsv(false),
                },
                {
                  label: 'Xuất file CSV (Chuẩn File 3.2)',
                  icon: Download,
                  onSelect: () =>
                    downloadApprovedBookingListCsv(
                      filteredItems,
                      selectedMonth,
                      selectedStore
                    ),
                },
                ...(onNavigateTab
                  ? [
                      {
                        label: 'Mở Quản lý Booking',
                        icon: ExternalLink,
                        onSelect: () => onNavigateTab('booking'),
                      },
                      {
                        label: 'Về Sheet Listing Brand',
                        icon: ArrowLeft,
                        onSelect: () =>
                          onNavigateTab('koc-listing', {
                            storeName: selectedStore !== 'ALL' ? selectedStore : undefined,
                            monthKey: selectedMonth !== 'ALL' ? selectedMonth : undefined,
                          }),
                      },
                    ]
                  : []),
              ]}
            />
          </div>
        </div>

        {/* Tầng 3: Bảng dữ liệu List Duyệt Book (Cố định chuẩn 3 cột đầu, không hở khe khi cuộn ngang) */}
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
                  <div className="text-[10px] font-mono text-ink-3">Cột 1 · File 3.2</div>
                  <div className="font-semibold text-ink truncate">Mã Booking (BO)</div>
                </th>
                <th className="sticky left-[180px] z-30 bg-sunken px-2.5 py-1.5 border-r border-line w-[168px] min-w-[168px] max-w-[168px] text-left shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]">
                  <div className="text-[10px] font-mono text-ink-3">Cột 2 · KOC</div>
                  <div className="font-semibold text-ink truncate">ID kênh &amp; Link</div>
                </th>
                <th className="px-2.5 py-1.5 border-r border-line min-w-[175px] text-left">
                  <div className="text-[10px] font-mono text-ink-3">Cột 3 &amp; 4 · Gian hàng</div>
                  <div className="font-semibold text-ink">Store / Brand · Đợt</div>
                </th>
                <th className="px-2.5 py-1.5 border-r border-line min-w-[170px] text-left">
                  <div className="text-[10px] font-mono text-ink-3">Cột 31 &amp; 89 · Nội dung</div>
                  <div className="font-semibold text-ink">Sản phẩm &amp; Pillar</div>
                </th>

                {/* Nhóm cột nhân viên điền: Ngày air chốt, Giá cuối cùng, Tạm ứng, Tạo BO */}
                <th className="px-2.5 py-1.5 border-r border-line min-w-[140px] text-left bg-amber-50">
                  <div className="text-[10px] font-mono text-amber-800 font-semibold">
                    NV ĐIỀN · Cột 61
                  </div>
                  <div className="font-semibold text-ink">Ngày air chốt</div>
                </th>
                {viewColumnMode !== 'ACCEPTANCE_FOCUS' && (
                  <th className="px-2.5 py-1.5 border-r border-line min-w-[115px] text-right">
                    <div className="text-[10px] font-mono text-ink-3">Sheet Listing</div>
                    <div className="font-semibold text-ink">Giá đề xuất Net</div>
                  </th>
                )}
                <th className="px-2.5 py-1.5 border-r border-line min-w-[145px] text-right bg-amber-50">
                  <div className="text-[10px] font-mono text-amber-800 font-semibold">
                    NV ĐIỀN · Cột 18
                  </div>
                  <div className="font-semibold text-ink">Giá chốt cuối (Net)</div>
                </th>
                <th className="px-2.5 py-1.5 border-r border-line min-w-[130px] text-right">
                  <div className="text-[10px] font-mono text-sky-700">Công thức / 0.9</div>
                  <div className="font-semibold text-ink">Gross &amp; Bậc KL</div>
                </th>
                <th className="px-2.5 py-1.5 border-r border-line min-w-[135px] text-right">
                  <div className="text-[10px] font-mono text-ink-3">Cột 40 &amp; 42</div>
                  <div className="font-semibold text-ink">Tạm ứng / Còn trả</div>
                </th>

                {viewColumnMode !== 'ACCEPTANCE_FOCUS' && (
                  <th className="px-2.5 py-1.5 border-r border-line min-w-[180px] text-left">
                    <div className="text-[10px] font-mono text-ink-3">Cột 17 &amp; 20</div>
                    <div className="font-semibold text-ink">Loại TK thuế &amp; Hợp tác</div>
                  </th>
                )}

                {/* Nhóm cột Nghiệm thu Video */}
                {viewColumnMode !== 'BOOKING_FOCUS' && (
                  <>
                    <th className="px-2.5 py-1.5 border-r border-line min-w-[235px] text-left bg-emerald-50">
                      <div className="text-[10px] font-mono text-emerald-800 font-semibold">
                        NGHIỆM THU · Cột 9
                      </div>
                      <div className="font-semibold text-ink">Link video nghiệm thu</div>
                    </th>
                    <th className="px-2.5 py-1.5 border-r border-line min-w-[140px] text-left bg-emerald-50">
                      <div className="text-[10px] font-mono text-emerald-800 font-semibold">
                        NGHIỆM THU · Cột 6 &amp; 7
                      </div>
                      <div className="font-semibold text-ink">Ngày air thực tế</div>
                    </th>
                    <th className="px-2.5 py-1.5 border-r border-line min-w-[120px] text-left bg-emerald-50">
                      <div className="text-[10px] font-mono text-emerald-800 font-semibold">
                        SLA · Cột 39
                      </div>
                      <div className="font-semibold text-ink">Đúng / Trễ hạn</div>
                    </th>
                    <th className="px-2.5 py-1.5 border-r border-line min-w-[155px] text-left bg-emerald-50">
                      <div className="text-[10px] font-mono text-emerald-800 font-semibold">
                        ADS · Cột 45
                      </div>
                      <div className="font-semibold text-ink">Mã Spark Ads</div>
                    </th>
                    <th className="px-2.5 py-1.5 border-r border-line min-w-[205px] text-right bg-emerald-50">
                      <div className="text-[10px] font-mono text-emerald-800 font-semibold">
                        HIỆU QUẢ · Cột 68–70
                      </div>
                      <div className="font-semibold text-ink">Views · Đơn · GMV 30d</div>
                    </th>
                    <th className="px-2.5 py-1.5 border-r border-line min-w-[150px] text-right bg-emerald-50">
                      <div className="text-[10px] font-mono text-emerald-800 font-semibold">
                        ROI · Cột 71–76
                      </div>
                      <div className="font-semibold text-ink">GPM · ROI · Đánh giá</div>
                    </th>
                    <th className="px-2.5 py-1.5 border-r border-line min-w-[165px] text-left">
                      <div className="text-[10px] font-mono text-ink-3">Cột 22 &amp; 30</div>
                      <div className="font-semibold text-ink">Thanh toán &amp; ND CK</div>
                    </th>
                    <th className="px-2.5 py-1.5 border-r border-line min-w-[175px] text-left">
                      <div className="text-[10px] font-mono text-ink-3">Cột 23–26</div>
                      <div className="font-semibold text-ink">Ngân hàng &amp; CCCD</div>
                    </th>
                  </>
                )}

                <th className="px-2.5 py-1.5 text-center min-w-[145px]">
                  <div className="text-[10px] font-mono text-ink-3">Thao tác</div>
                  <div className="font-semibold text-ink">Tạo BO / Nghiệm thu</div>
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

                      {/* Cột 1: Mã Booking (BO...) */}
                      <td
                        className={`sticky left-[38px] z-10 ${stickyCellBg} px-2.5 py-2 border-r border-line w-[142px] min-w-[142px] max-w-[142px] align-middle`}
                      >
                        {item.bookingOrderCreated && item.maBooking ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 font-mono text-xs font-bold text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                              <span className="truncate">{item.maBooking}</span>
                            </span>
                            <div className="text-[10px] text-ink-3 truncate" title={item.pipelineStatus}>
                              {item.pipelineStatus}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-[11px] font-medium text-amber-800">
                              Chờ tạo BO
                            </span>
                            <div>
                              <button
                                type="button"
                                onClick={() => handleCreateBookingOrders([item.id])}
                                className="text-[11px] font-semibold text-accent hover:underline"
                              >
                                + Tạo mã BO ngay
                              </button>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Cột 2: ID kênh & Link kênh */}
                      <td
                        className={`sticky left-[180px] z-10 ${stickyCellBg} px-2.5 py-2 border-r border-line w-[168px] min-w-[168px] max-w-[168px] align-middle shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]`}
                      >
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={item.idKenh}
                            onChange={(e) =>
                              handleFieldChange(item.id, 'idKenh', e.target.value)
                            }
                            placeholder="Nhập @id_kênh..."
                            className="w-full h-7 px-2 rounded border border-line bg-surface font-semibold text-xs text-ink"
                          />
                          <div className="flex items-center justify-between gap-1 text-[11px] text-ink-3">
                            <span className="truncate max-w-[100px]" title={item.tenKenh}>
                              {item.tenKenh || item.tepKenh}
                            </span>
                            {item.linkKenh && (
                              <a
                                href={item.linkKenh}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent hover:underline shrink-0"
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
                        <div className="text-[11px] text-ink-3">
                          {item.brandName} · {item.thangPlan} · {item.dot}
                        </div>
                        <div className="text-[10px] text-ink-3">
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
                        <div className="text-[11px] text-ink-3 truncate" title={item.pillarContent}>
                          Pillar: {item.pillarContent}
                        </div>
                      </td>

                      {/* Cột 61: Nhân viên điền P.Ngày air (Ngày air chốt) */}
                      <td className="px-2.5 py-2 border-r border-line align-middle bg-amber-50/25">
                        <input
                          type="date"
                          value={item.plannedAirDate}
                          onChange={(e) =>
                            handleFieldChange(item.id, 'plannedAirDate', e.target.value)
                          }
                          className="w-full h-7 px-2 rounded border border-amber-300 bg-surface font-mono text-xs text-ink focus:outline-none focus:border-ink"
                        />
                        <div className="text-[10px] text-ink-3 mt-0.5">
                          Tuần KH: {computeWeekLabelFromDate(item.plannedAirDate) || '—'}
                        </div>
                      </td>

                      {/* Giá đề xuất ban đầu trên Sheet Listing */}
                      {viewColumnMode !== 'ACCEPTANCE_FOCUS' && (
                        <td className="px-2.5 py-2 border-r border-line align-middle text-right font-mono text-xs text-ink-3 tabular-nums">
                          {formatVnd(item.giaDeXuatNet)}
                        </td>
                      )}

                      {/* Cột 18: Nhân viên điền Giá cuối cùng (Chi phí thanh toán Booking Net) */}
                      <td className="px-2.5 py-2 border-r border-line align-middle bg-amber-50/25">
                        <input
                          type="number"
                          value={item.chiPhiBookingNetCuoi}
                          onChange={(e) =>
                            handleFieldChange(
                              item.id,
                              'chiPhiBookingNetCuoi',
                              Number(e.target.value) || 0
                            )
                          }
                          className="w-full h-7 px-2 rounded border border-amber-300 bg-surface text-right font-mono font-bold text-xs text-ink tabular-nums focus:outline-none focus:border-ink"
                        />
                        {item.chiPhiBookingNetCuoi !== item.giaDeXuatNet && (
                          <div className="text-[10px] text-right font-mono text-ink-3 mt-0.5">
                            Chênh:{' '}
                            {formatVndShort(
                              item.chiPhiBookingNetCuoi - item.giaDeXuatNet
                            )}
                          </div>
                        )}
                      </td>

                      {/* Gross kèm thuế TNCN & Bậc KL */}
                      <td className="px-2.5 py-2 border-r border-line align-middle text-right">
                        <div className="font-mono font-semibold text-xs text-ink tabular-nums">
                          {formatVnd(item.chiPhiGrossKemThue)}
                        </div>
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-sunken border border-line font-mono text-[10px] font-semibold text-ink-2 mt-0.5">
                          {item.klGrade}
                        </span>
                      </td>

                      {/* Cột 40 & 42: Số tiền tạm ứng & Còn phải thanh toán */}
                      <td className="px-2.5 py-2 border-r border-line align-middle text-right space-y-1">
                        <div className="flex items-center justify-between gap-1 h-6 px-1.5 rounded border border-line bg-surface">
                          <span className="text-[10px] text-ink-3 shrink-0">Cọc</span>
                          <input
                            type="number"
                            value={item.soTienTamUngTruoc}
                            onChange={(e) =>
                              handleFieldChange(
                                item.id,
                                'soTienTamUngTruoc',
                                Number(e.target.value) || 0
                              )
                            }
                            placeholder="0"
                            className="w-full bg-transparent text-right font-mono text-xs text-ink tabular-nums focus:outline-none"
                          />
                        </div>
                        <div className="text-[10px] font-mono font-semibold text-ink tabular-nums">
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
                          <div className="flex items-center gap-1 text-[10px] text-ink-3">
                            <span>Hợp tác: {item.hinhThucHopTac}</span>
                            <span>·</span>
                            <span>{item.dinhDangNghiemThu}</span>
                          </div>
                        </td>
                      )}

                      {viewColumnMode !== 'BOOKING_FOCUS' && (
                        <>
                          {/* Cột 9: Link air / Link nghiệm thu */}
                          <td className="px-2.5 py-2 border-r border-line align-middle bg-emerald-50/20">
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
                                <div className="flex items-center justify-between gap-1.5 flex-wrap">
                                  <div className="flex items-center gap-1.5">
                                    <a
                                      href={item.linkAir}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[11px] font-semibold text-emerald-700 hover:underline"
                                    >
                                      Mở video ↗
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => openDeepVideoInspector(item)}
                                      className="text-[10px] font-semibold text-accent hover:underline"
                                      title="Kiểm tra 5 tiêu chí Brief, Hook 3s & Giỏ hàng TikTok Shop"
                                    >
                                      · Đối soát Brief &amp; Giỏ
                                    </button>
                                  </div>
                                  <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                                    Đã nghiệm thu
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between gap-1 text-[10px] text-ink-3">
                                  <span>Chưa có link air</span>
                                  <button
                                    type="button"
                                    onClick={() => openAcceptanceModalForRow(item)}
                                    className="font-semibold text-accent hover:underline"
                                  >
                                    + Điền nghiệm thu
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Cột 6 & 7: Ngày air thực tế & Tuần real */}
                          <td className="px-2.5 py-2 border-r border-line align-middle bg-emerald-50/20">
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
                              className="w-full h-7 px-2 rounded border border-line bg-surface font-mono text-xs text-ink"
                            />
                            <div className="text-[10px] font-mono text-ink-3 mt-0.5">
                              Tuần real: <strong>{item.tuanReal || '—'}</strong> · Tháng:{' '}
                              {item.thangAirReal || '—'}
                            </div>
                          </td>

                          {/* Cột 39: Trễ / Đúng hạn điền link air */}
                          <td className="px-2.5 py-2 border-r border-line align-middle bg-emerald-50/20">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
                                item.trangThaiSlaAir.startsWith('Trễ')
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : item.trangThaiSlaAir === 'Đúng hạn' ||
                                    item.trangThaiSlaAir.startsWith('Sớm')
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-surface text-ink-3 border-line'
                              }`}
                            >
                              {item.trangThaiSlaAir}
                            </span>
                          </td>

                          {/* Cột 45: Mã ủy quyền Spark Ads */}
                          <td className="px-2.5 py-2 border-r border-line align-middle bg-emerald-50/20">
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
                              className="w-full h-7 px-2 rounded border border-line bg-surface font-mono text-xs text-ink"
                            />
                          </td>

                          {/* Cột 68-70: Views 30d, Đơn hàng 30d, GMV 30d (Có nhãn nội tuyến rõ ràng) */}
                          <td className="px-2.5 py-2 border-r border-line align-middle text-right bg-emerald-50/20 space-y-1">
                            <div className="grid grid-cols-2 gap-1">
                              <div className="flex items-center justify-between gap-1 h-6 px-1.5 rounded border border-line bg-surface">
                                <span className="text-[9px] text-ink-3 shrink-0">View</span>
                                <input
                                  type="number"
                                  value={item.views30d}
                                  onChange={(e) =>
                                    handleFieldChange(
                                      item.id,
                                      'views30d',
                                      Number(e.target.value) || 0
                                    )
                                  }
                                  title="Views 30 ngày"
                                  className="w-full min-w-0 bg-transparent text-right font-mono text-[11px] text-ink tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </div>
                              <div className="flex items-center justify-between gap-1 h-6 px-1.5 rounded border border-line bg-surface">
                                <span className="text-[9px] text-ink-3 shrink-0">Đơn</span>
                                <input
                                  type="number"
                                  value={item.orders30d}
                                  onChange={(e) =>
                                    handleFieldChange(
                                      item.id,
                                      'orders30d',
                                      Number(e.target.value) || 0
                                    )
                                  }
                                  title="Số đơn hàng 30 ngày"
                                  className="w-full min-w-0 bg-transparent text-right font-mono text-[11px] text-ink tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-1 h-6 px-1.5 rounded border border-line bg-surface">
                              <span className="text-[9px] font-medium text-emerald-800 shrink-0">
                                GMV
                              </span>
                              <input
                                type="number"
                                value={item.gmv30d}
                                onChange={(e) =>
                                  handleFieldChange(
                                    item.id,
                                    'gmv30d',
                                    Number(e.target.value) || 0
                                  )
                                }
                                title="GMV 30 ngày (VNĐ)"
                                className="w-full min-w-0 bg-transparent text-right font-mono font-semibold text-xs text-emerald-800 tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>
                          </td>

                          {/* Cột 71-76: GPM, ROI 30d & Đánh giá hiệu quả video */}
                          <td className="px-2.5 py-2 border-r border-line align-middle text-right bg-emerald-50/20 space-y-0.5">
                            <div className="font-mono font-bold text-xs text-ink tabular-nums">
                              ROI: {item.roi30d.toFixed(2)}x
                            </div>
                            <div className="text-[10px] font-mono text-ink-3 tabular-nums">
                              GPM: {formatVnd(item.gpm30d)}
                            </div>
                            <span
                              className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold truncate max-w-[140px] ${
                                item.danhGiaHieuQuaVideo.startsWith('Winner')
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.danhGiaHieuQuaVideo.startsWith('Đạt KPI') ||
                                    item.danhGiaHieuQuaVideo.startsWith('FOC Hiệu quả')
                                  ? 'bg-sky-100 text-sky-800'
                                  : item.danhGiaHieuQuaVideo.startsWith('Cần tối ưu')
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-sunken text-ink-3'
                              }`}
                              title={item.danhGiaHieuQuaVideo}
                            >
                              {item.danhGiaHieuQuaVideo}
                            </span>
                          </td>

                          {/* Cột 22 & 30: Trạng thái thanh toán & Nội dung chuyển khoản */}
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
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : item.trangThaiPhieuThanhToan === 'Đủ điều kiện ĐNTT' ||
                                    item.trangThaiPhieuThanhToan === 'Đã lập ĐNTT'
                                  ? 'bg-sky-50 text-sky-800 border-sky-200'
                                  : 'bg-surface text-ink border-line'
                              }`}
                            >
                              {PAYMENT_STATUS_OPTIONS.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                            <div
                              className="text-[10px] font-mono text-ink-3 truncate max-w-[165px]"
                              title={item.noiDungChuyenKhoan}
                            >
                              {item.noiDungChuyenKhoan}
                            </div>
                          </td>

                          {/* Cột 23-26: Ngân hàng, STK, CCCD */}
                          <td className="px-2.5 py-2 border-r border-line align-middle text-[11px]">
                            <div className="font-medium text-ink truncate max-w-[170px]">
                              {item.tenTaiKhoanNganHang || '—'}
                            </div>
                            <div className="font-mono text-ink-2">
                              {item.soTaiKhoan || '—'} · {item.nganHang || '—'}
                            </div>
                            <div className="font-mono text-[10px] text-ink-3">
                              CCCD: {item.soCccd || '—'}
                            </div>
                          </td>
                        </>
                      )}

                      {/* Thao tác trên dòng: Tạo BO & Nghiệm thu Video */}
                      <td className="px-2.5 py-2 align-middle text-center">
                        <div className="flex flex-col gap-1">
                          {!item.bookingOrderCreated ? (
                            <Button
                              variant="primary"
                              size="sm"
                              icon={FileCheck}
                              onClick={() => handleCreateBookingOrders([item.id])}
                            >
                              Tạo Booking Order
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant={isAccepted ? 'secondary' : 'primary'}
                                size="sm"
                                icon={Video}
                                onClick={() => openAcceptanceModalForRow(item)}
                              >
                                {isAccepted ? 'Cập nhật nghiệm thu' : 'Nghiệm thu Video'}
                              </Button>
                              {item.linkAir && (
                                <button
                                  type="button"
                                  onClick={() => openDeepVideoInspector(item)}
                                  className="inline-flex items-center justify-center gap-1 text-[10px] font-semibold text-accent hover:underline"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Soi Brief &amp; Giỏ hàng</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hộp thoại Nghiệm thu Video — Tự động tìm kênh KOC, Quét số liệu thực & Chỉnh sửa trực tiếp */}
      <Modal
        open={isAcceptanceModalOpen}
        onClose={() => setIsAcceptanceModalOpen(false)}
        title="Nghiệm thu Video — Tự động khớp kênh KOC, Đối soát SLA & Hiệu quả 30d"
        size="2xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsAcceptanceModalOpen(false)}>
              Đóng
            </Button>
            <Button
              variant="secondary"
              icon={Eye}
              disabled={parsedAcceptanceRows.length === 0}
              onClick={() => {
                const firstRow = parsedAcceptanceRows[0];
                openDeepVideoInspector(
                  firstRow?.matchedItem,
                  firstRow?.linkAir
                );
              }}
            >
              Đối soát sâu Kịch bản &amp; Giỏ hàng
            </Button>
            <Button
              variant="secondary"
              icon={isInspectingTikTokLinks ? Loader2 : Sparkles}
              disabled={isInspectingTikTokLinks || parsedAcceptanceRows.length === 0}
              onClick={() => void handleInspectRealTikTokVideos()}
            >
              {isInspectingTikTokLinks
                ? 'Đang quét TikTok...'
                : 'Quét số liệu thực từ link TikTok'}
            </Button>
            <Button
              variant="primary"
              icon={Check}
              disabled={parsedAcceptanceRows.length === 0}
              onClick={handleConfirmVideoAcceptanceMapping}
            >
              Xác nhận Nghiệm thu &amp; Đồng bộ ({parsedAcceptanceRows.length})
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          {/* Tầng 1: Chọn BO mục tiêu + Ngày air mặc định + Dải KPI tóm tắt đợt nghiệm thu */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 rounded-lg bg-sunken border border-line items-end">
            <div className="lg:col-span-5">
              <Field label="Chọn Booking Order (BO) nghiệm thu (Hoặc tự động tìm theo @id_kênh)">
                <Select
                  value={selectedTargetBoItemId}
                  onChange={(e) => handleSelectTargetBoInModal(e.target.value)}
                >
                  <option value="AUTO">
                    Tự động tìm BO theo @id_kênh KOC trong link video TikTok
                  </option>
                  {filteredItems.map((boItem) => (
                    <option key={boItem.id} value={boItem.id}>
                      {boItem.maBooking ? `[${boItem.maBooking}]` : '[Chưa cấp BO]'} @
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
            <div className="lg:col-span-5 grid grid-cols-4 gap-1.5">
              <div className="px-2.5 py-1.5 rounded border border-line bg-surface">
                <div className="text-[10px] text-ink-3">Khớp BO</div>
                <div className="text-xs font-bold text-ink tabular-nums">
                  {acceptanceModalStats.matchedCount}/{acceptanceModalStats.total} video
                </div>
              </div>
              <div className="px-2.5 py-1.5 rounded border border-line bg-surface">
                <div className="text-[10px] text-ink-3">Đúng hạn SLA</div>
                <div className="text-xs font-bold text-emerald-700 tabular-nums">
                  {acceptanceModalStats.onTimeCount}/{acceptanceModalStats.total}
                </div>
              </div>
              <div className="px-2.5 py-1.5 rounded border border-line bg-surface">
                <div className="text-[10px] text-ink-3">Tổng GMV 30d</div>
                <div className="text-xs font-bold text-emerald-800 tabular-nums">
                  {formatVndShort(acceptanceModalStats.totalGmv)}
                </div>
              </div>
              <div className="px-2.5 py-1.5 rounded border border-line bg-surface">
                <div className="text-[10px] text-ink-3">ROI bình quân</div>
                <div className="text-xs font-bold text-ink tabular-nums">
                  {acceptanceModalStats.avgRoi}x ({acceptanceModalStats.winnerCount} Win)
                </div>
              </div>
            </div>
          </div>

          {/* Tầng 2: Ô dán nhanh danh sách link TikTok (hỗ trợ dán 1 hoặc nhiều link) */}
          <Field label="Dán Link Video TikTok cần nghiệm thu (Mỗi dòng 1 video: Link_TikTok | Mã_Spark_Ads | Views_30d | GMV_30d | Đơn_30d | Ngày_Air)">
            <textarea
              rows={3}
              value={acceptanceBulkText}
              onChange={(e) => {
                setRowFieldOverrides({});
                setAcceptanceBulkText(e.target.value);
              }}
              placeholder="https://www.tiktok.com/@katthy.review/video/7425819201928371 | #SPARK-KATTHY | 32000 | 18500000 | 64 | 2026-10-25"
              className="w-full p-2 rounded-lg border border-line bg-surface font-mono text-xs text-ink focus:outline-none focus:border-ink"
            />
          </Field>

          {/* Tầng 3: Bảng đối soát & chỉnh sửa trực tiếp các trường nghiệm thu cho từng dòng */}
          <div className="border border-line rounded-lg overflow-hidden bg-surface">
            <div className="px-3 py-2 bg-sunken border-b border-line flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-ink">
                Bảng đối soát &amp; chỉnh sửa trực tiếp trường nghiệm thu (
                {acceptanceModalStats.matchedCount}/{acceptanceModalStats.total} dòng đã gắn BO)
              </span>
              <span className="text-[11px] text-ink-3">
                Chỉnh trực tiếp Ngày air, Mã Spark Ads, Views, Đơn, GMV ngay trên từng dòng bên dưới
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
                      Chọn Booking Order (BO) / Dòng Brand duyệt
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
                          <div className="font-mono font-bold text-ink">
                            @{row.channelHandle || m?.idKenh || 'Chưa rõ'}
                          </div>
                          {row.videoId && (
                            <div className="font-mono text-[10px] text-ink-3">
                              ID: {row.videoId}
                            </div>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            {row.linkAir && (
                              <a
                                href={row.linkAir}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-semibold text-emerald-700 hover:underline"
                              >
                                Mở video ↗
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => openDeepVideoInspector(m, row.linkAir)}
                              className="text-[10px] font-semibold text-accent hover:underline"
                            >
                              Soi kịch bản &amp; giỏ
                            </button>
                          </div>
                          {insp && (
                            <div className="pt-1 border-t border-line space-y-0.5 text-[10px]">
                              <div className="flex items-center gap-1 flex-wrap">
                                <span
                                  className={`px-1.5 py-0.2 rounded font-semibold ${
                                    insp.verdict === 'ĐẠT_CHUẨN'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : insp.verdict === 'CẦN_KIỂM_TRA'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-rose-100 text-rose-800'
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
                                label={`Booking Order của kênh @${row.channelHandle} (${sameChannelBoList.length})`}
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
                              <optgroup label="Chọn Booking Order khác trong danh sách">
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
                            <div className="flex items-center justify-between gap-1 text-[10px] text-emerald-700 font-medium">
                              <span>
                                ✓ BO:{' '}
                                <strong className="font-mono">
                                  {m.maBooking || 'Tự cấp khi lưu'}
                                </strong>{' '}
                                · {m.sanPham}
                              </span>
                              <span className="font-mono font-bold text-ink">
                                Net: {formatVnd(finalCost)}
                              </span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-amber-700">
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
                            className="w-full h-7 px-2 rounded border border-line bg-surface font-mono text-xs text-ink"
                          />
                          <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                            <span className="text-ink-3">
                              KH: {m?.plannedAirDate || '—'} ({computeWeekLabelFromDate(row.actualAirDate)})
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded font-sans font-semibold ${
                                sla.statusText.startsWith('Trễ')
                                  ? 'bg-rose-100 text-rose-800'
                                  : sla.statusText === 'Đúng hạn' ||
                                    sla.statusText.startsWith('Sớm')
                                  ? 'bg-emerald-100 text-emerald-800'
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
                            className="w-full h-7 px-2 rounded border border-line bg-surface font-mono text-xs text-ink"
                          />
                          <div className="text-[10px] text-ink-3">
                            {row.sparkAdsCode ? 'Đã có mã ủy quyền Ads' : 'Chưa nhập mã Ads'}
                          </div>
                        </td>

                        {/* Cột 5: Views 30d · Đơn 30d · GMV 30d (chỉnh trực tiếp) */}
                        <td className="px-2.5 py-2 border-r border-line space-y-1">
                          <div className="grid grid-cols-2 gap-1">
                            <div className="flex items-center justify-between gap-1 h-6 px-1.5 rounded border border-line bg-surface">
                              <span className="text-[9px] text-ink-3 shrink-0">View</span>
                              <input
                                type="number"
                                value={row.views30d}
                                onChange={(e) =>
                                  updateDraftRowField(
                                    idx,
                                    'views30d',
                                    Number(e.target.value) || 0
                                  )
                                }
                                className="w-full bg-transparent text-right font-mono text-[11px] text-ink tabular-nums focus:outline-none"
                              />
                            </div>
                            <div className="flex items-center justify-between gap-1 h-6 px-1.5 rounded border border-line bg-surface">
                              <span className="text-[9px] text-ink-3 shrink-0">Đơn</span>
                              <input
                                type="number"
                                value={row.orders30d}
                                onChange={(e) =>
                                  updateDraftRowField(
                                    idx,
                                    'orders30d',
                                    Number(e.target.value) || 0
                                  )
                                }
                                className="w-full bg-transparent text-right font-mono text-[11px] text-ink tabular-nums focus:outline-none"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-1 h-6 px-1.5 rounded border border-line bg-surface">
                            <span className="text-[9px] font-medium text-emerald-800 shrink-0">
                              GMV
                            </span>
                            <input
                              type="number"
                              value={row.gmv30d}
                              onChange={(e) =>
                                updateDraftRowField(
                                  idx,
                                  'gmv30d',
                                  Number(e.target.value) || 0
                                )
                              }
                              className="w-full bg-transparent text-right font-mono font-semibold text-xs text-emerald-800 tabular-nums focus:outline-none"
                            />
                          </div>
                        </td>

                        {/* Cột 6: ROI · GPM · Đánh giá hiệu quả · ĐNTT */}
                        <td className="px-2.5 py-2 text-right space-y-0.5">
                          <div className="font-mono font-bold text-xs text-ink tabular-nums">
                            ROI: {roi > 0 ? `${roi}x` : '0.00x'}{' '}
                            <span className="text-[10px] font-normal text-ink-3">
                              (GPM {formatVndShort(gpm)})
                            </span>
                          </div>
                          <div>
                            <span
                              className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                                effectivenessLabel.startsWith('Winner')
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : effectivenessLabel.startsWith('Đạt KPI') ||
                                    effectivenessLabel.startsWith('FOC Hiệu quả')
                                  ? 'bg-sky-100 text-sky-800'
                                  : effectivenessLabel.startsWith('Cần tối ưu')
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-sunken text-ink-3'
                              }`}
                            >
                              {effectivenessLabel}
                            </span>
                          </div>
                          {m && (
                            <div className="text-[10px] font-mono text-emerald-700 font-semibold">
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
        </div>
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
    </div>
  );
};
