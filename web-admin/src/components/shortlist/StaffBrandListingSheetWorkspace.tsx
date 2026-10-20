'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Columns,
  Copy,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Link2,
  Mail,
  Plus,
  Search,
  Send,
  Settings,
  Trash2,
  UserPlus,
} from 'lucide-react';
import type {
  BookingDealItem,
  KocItem,
  KocListingItem,
  ListingBatchCycle,
  SalaryGrade,
  StorePortfolioItem,
  UserRole,
} from '../../lib/types';
import { formatVnd, formatVndShort } from '../../lib/format';
import {
  BRAND_CHON_OPTIONS,
  CONTENT_NOTE_SUGGESTIONS,
  CONTENT_TAG_OPTIONS,
  DE_XUAT_UPBASE_OPTIONS,
  DOT_LISTING_OPTIONS,
  STAFF_LISTING_COLUMNS,
  STAFF_SHEET_UPDATED_EVENT,
  TEP_KENH_OPTIONS,
  TRANG_THAI_OPTIONS,
  buildStaffListingRowFromKoc,
  computeTepBookingFromNetFee,
  downloadStaffSheetCsv,
  formatStaffSheetToTsv,
  loadStaffSheetCollection,
  makeSheetKey,
  normalizeTikTokId,
  recalculateStaffListingRow,
  saveStaffSheetCollection,
  syncSheetRowContactToKocMaster,
  type StaffBrandSheetCollection,
  type StaffListingColumnKey,
  type StaffListingColumnMeta,
  type StaffListingSheetRow,
} from '../../lib/staffBrandListingSheet';
import {
  APPROVED_BOOKING_LIST_UPDATED_EVENT,
  transferBrandApprovedRowsToBookingList,
} from '../../lib/approvedBookingList';
import {
  KOC_OUTREACH_EMAIL_UPDATED_EVENT,
  loadKocOutreachEmailState,
} from '../../lib/kocOutreachEmailService';
import { KocOutreachEmailModal } from './KocOutreachEmailModal';
import { ActionMenu, Avatar, Button, Field, Input, Modal, Select, Status } from '../ui';

const UI_HEADER_OVERRIDES: Partial<Record<StaffListingColumnKey, string>> = {
  ngayDien: 'Ngày điền',
  dot: 'Đợt',
  nhanSuDien: 'Nhân sự điền',
  idKenh: 'ID kênh',
  linkKenh: 'Link kênh',
  tepKenh: 'Tệp kênh',
  tenKenh: 'Tên kênh KOC',
  phiBookingKemThue: 'Phí kèm thuế TNCN',
  leaderNote: 'Ghi chú Leader',
  lyDoTuChoi: 'Lý do từ chối',
  gmvDaHopTac: 'GMV đã hợp tác',
  doanhSo: 'Doanh số 30d',
  aov: 'AOV',
  viewTrungBinh: 'View TB video',
  giaChotCuoi: 'Chi phí chốt cuối',
  ngayAirChot: 'Ngày air chốt',
  linkAirNghiemThu: 'Link nghiệm thu',
  ngayAirReal: 'Ngày air thực tế',
  viewsNghiemThu: 'Views 30 ngày',
  gmvNghiemThu: 'GMV 30 ngày',
  donHangNghiemThu: 'Đơn hàng 30 ngày',
  roiNghiemThu: 'ROI 30 ngày',
};

function getDisplayHeader(col: StaffListingColumnMeta): string {
  return (
    UI_HEADER_OVERRIDES[col.key] ||
    col.header.replace(/[🎃🌸]/g, '').replace(/\s*\(Bổ sung thêm\)/gi, '').trim()
  );
}

export interface StaffBrandListingSheetWorkspaceProps {
  kocs: KocItem[];
  stores: StorePortfolioItem[];
  deals: BookingDealItem[];
  currentUserName: string;
  currentRole?: UserRole;
  selectedMonth: string;
  onChangeMonth: (month: string) => void;
  selectedStore: string;
  onChangeStore: (storeName: string) => void;
  onSyncRowsToSystemListings?: (newItems: Partial<KocListingItem>[], store: StorePortfolioItem, batchCycle: ListingBatchCycle) => void;
  onOpenShortlistFilterModal?: () => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

const MONTH_OPTIONS = ['2026/11', '2026/10', '2026/09', '2026/08'];

const FILL_MODE_BADGE: Record<
  'AUTO_SYSTEM' | 'FORMULA' | 'MANUAL_STAFF',
  { label: string; className: string }
> = {
  AUTO_SYSTEM: {
    label: 'Tự động',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  FORMULA: {
    label: 'Công thức',
    className: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  MANUAL_STAFF: {
    label: 'NV điền',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  },
};

export const StaffBrandListingSheetWorkspace: React.FC<
  StaffBrandListingSheetWorkspaceProps
> = ({
  kocs,
  stores,
  deals,
  currentUserName,
  currentRole,
  selectedMonth,
  onChangeMonth,
  selectedStore,
  onChangeStore,
  onSyncRowsToSystemListings,
  onOpenShortlistFilterModal,
  onNotify,
}) => {
  const b2cStores = useMemo(
    () => stores.filter((s) => s.isB2cManaged !== false && s.storeName),
    [stores]
  );

  const activeMonth = selectedMonth === 'ALL' ? '2026/10' : selectedMonth;
  const activeStoreName =
    selectedStore && selectedStore !== 'ALL'
      ? selectedStore
      : b2cStores[0]?.storeName || 'Kutieskin Chính Hãng - TikTok Shop';

  const activeStoreObj = useMemo(
    () =>
      b2cStores.find((s) => s.storeName === activeStoreName) ||
      b2cStores[0],
    [b2cStores, activeStoreName]
  );

  const [collection, setCollection] = useState<StaffBrandSheetCollection>(() =>
    loadStaffSheetCollection(kocs, stores, deals, currentUserName)
  );

  useEffect(() => {
    const refresh = () => {
      setCollection(loadStaffSheetCollection(kocs, stores, deals, currentUserName));
    };
    window.addEventListener(STAFF_SHEET_UPDATED_EVENT, refresh);
    window.addEventListener(APPROVED_BOOKING_LIST_UPDATED_EVENT, refresh);
    return () => {
      window.removeEventListener(STAFF_SHEET_UPDATED_EVENT, refresh);
      window.removeEventListener(APPROVED_BOOKING_LIST_UPDATED_EVENT, refresh);
    };
  }, [kocs, stores, deals, currentUserName]);

  const activeSheetKey = useMemo(
    () => makeSheetKey(activeMonth, activeStoreName),
    [activeMonth, activeStoreName]
  );

  const rows: StaffListingSheetRow[] = useMemo(
    () => collection.sheets[activeSheetKey] || [],
    [collection, activeSheetKey]
  );

  const updateActiveSheetRows = (updater: (prev: StaffListingSheetRow[]) => StaffListingSheetRow[]) => {
    setCollection((prev) => {
      const currentRows = prev.sheets[activeSheetKey] || [];
      const nextRows = updater(currentRows);
      const nextCollection: StaffBrandSheetCollection = {
        ...prev,
        sheets: {
          ...prev.sheets,
          [activeSheetKey]: nextRows,
        },
      };
      saveStaffSheetCollection(nextCollection, false);
      return nextCollection;
    });
  };

  // Các Sheet Brand đang có dữ liệu trong tháng đang chọn
  const activeMonthBrandSheets = useMemo(() => {
    const prefix = `${activeMonth}__`;
    const storeNamesWithData = new Set<string>();
    Object.entries(collection.sheets).forEach(([key, list]) => {
      if (key.startsWith(prefix) && list.length > 0) {
        storeNamesWithData.add(key.slice(prefix.length));
      }
    });
    storeNamesWithData.add(activeStoreName);
    return Array.from(storeNamesWithData).map((sName) => {
      const st = b2cStores.find((s) => s.storeName === sName);
      const count = (collection.sheets[makeSheetKey(activeMonth, sName)] || []).length;
      return {
        storeName: sName,
        brandName: st?.brandName || sName.split(/[-_]/)[0].trim(),
        count,
      };
    });
  }, [collection.sheets, activeMonth, activeStoreName, b2cStores]);

  // Luôn bật toàn bộ 48 cột mặc định, cho phép nhân viên bật/tắt cột bất kỳ
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<StaffListingColumnKey[]>(() =>
    STAFF_LISTING_COLUMNS.map((c) => c.key)
  );
  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);

  const visibleColumns = useMemo(() => {
    const set = new Set(visibleColumnKeys);
    return STAFF_LISTING_COLUMNS.filter((c) => set.has(c.key));
  }, [visibleColumnKeys]);

  const toggleColumnKey = (key: StaffListingColumnKey) => {
    setVisibleColumnKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const applyColumnPreset = (
    preset: 'ALL_48' | 'BRAND_WORKING_FILE' | 'LARK_BASE' | 'ACCEPTANCE_FILE_32'
  ) => {
    if (preset === 'ALL_48') {
      setVisibleColumnKeys(STAFF_LISTING_COLUMNS.map((c) => c.key));
    } else if (preset === 'BRAND_WORKING_FILE') {
      setVisibleColumnKeys(
        STAFF_LISTING_COLUMNS.filter((c) => c.inBrandWorkingFile).map((c) => c.key)
      );
    } else if (preset === 'ACCEPTANCE_FILE_32') {
      const coreKeys: StaffListingColumnKey[] = [
        'thang',
        'dot',
        'store',
        'idKenh',
        'tenKenh',
        'sanPham',
        'giaNetVideo',
        'brandChon',
      ];
      const acceptanceKeys = STAFF_LISTING_COLUMNS.filter(
        (c) => c.group === 'Chốt Book & Nghiệm thu (File 3.2)'
      ).map((c) => c.key);
      setVisibleColumnKeys([...coreKeys, ...acceptanceKeys]);
    } else {
      setVisibleColumnKeys(
        STAFF_LISTING_COLUMNS.filter((c) => c.inLarkBase).map((c) => c.key)
      );
    }
  };

  // Tìm kiếm & chọn KOC từ Danh bạ ngay tại Sheet
  const [isDirectoryPickerOpen, setIsDirectoryPickerOpen] = useState(false);
  const [kocSearchText, setKocSearchText] = useState('');
  const [kocFilterTep, setKocFilterTep] = useState('ALL');
  const [kocFilterKl, setKocFilterKl] = useState('ALL');
  const [pickedKocIds, setPickedKocIds] = useState<string[]>([]);
  const [quickBatchDot, setQuickBatchDot] = useState('Đợt 1');
  const [quickProduct, setQuickProduct] = useState('');
  const [quickContentTag, setQuickContentTag] = useState('Review trực tiếp');
  const [quickUpbaseProposal, setQuickUpbaseProposal] = useState('Recommend');

  // Tùy chọn Copy & Google Sheet
  const [copyWithHeaders, setCopyWithHeaders] = useState(true);
  const [copyWithFormulas, setCopyWithFormulas] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [filterDot, setFilterDot] = useState<string>('ALL');
  const [filterBrandChon, setFilterBrandChon] = useState<string>('ALL');
  const [rowSearchQuery, setRowSearchQuery] = useState<string>('');
  const [isGoogleSheetModalOpen, setIsGoogleSheetModalOpen] = useState(false);
  const [googleSheetUrlDraft, setGoogleSheetUrlDraft] = useState('');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isExportMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!exportMenuRef.current?.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsExportMenuOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [isExportMenuOpen]);

  // Hộp thoại Gửi Mail Mời Hợp Tác KOC & Quản Lý Mẫu Thư
  const [isOutreachModalOpen, setIsOutreachModalOpen] = useState(false);
  const [outreachModalTab, setOutreachModalTab] = useState<'COMPOSE' | 'TEMPLATES' | 'SETTINGS_LOGS'>('COMPOSE');
  const [singleOutreachRow, setSingleOutreachRow] = useState<StaffListingSheetRow | null>(null);
  const [outreachRefreshTick, setOutreachRefreshTick] = useState(0);

  useEffect(() => {
    const onEmailUpdated = () => setOutreachRefreshTick((t) => t + 1);
    window.addEventListener(KOC_OUTREACH_EMAIL_UPDATED_EVENT, onEmailUpdated);
    return () => window.removeEventListener(KOC_OUTREACH_EMAIL_UPDATED_EVENT, onEmailUpdated);
  }, []);

  const sentEmailHandleSet = useMemo(() => {
    void outreachRefreshTick;
    const state = loadKocOutreachEmailState();
    const set = new Set<string>();
    for (const log of state.logs) {
      const h = normalizeTikTokId(log.idKenh).toLowerCase();
      if (h) set.add(h);
    }
    return set;
  }, [outreachRefreshTick]);

  const handleOpenOutreachForSelection = (tab: 'COMPOSE' | 'TEMPLATES' | 'SETTINGS_LOGS' = 'COMPOSE') => {
    setSingleOutreachRow(null);
    setOutreachModalTab(tab);
    setIsOutreachModalOpen(true);
  };

  const handleOpenOutreachForSingleRow = (row: StaffListingSheetRow) => {
    setSingleOutreachRow(row);
    setOutreachModalTab('COMPOSE');
    setIsOutreachModalOpen(true);
  };

  const handleUpdateRowEmailAndStatus = (
    rowId: string,
    patch: Partial<Pick<StaffListingSheetRow, 'email' | 'trangThai'>>
  ) => {
    const targetRow = rows.find((r) => r.id === rowId);
    if (targetRow && patch.email !== undefined) {
      syncSheetRowContactToKocMaster({
        kocId: targetRow.kocId,
        idKenh: targetRow.idKenh,
        email: patch.email,
        allKocs: kocs,
      });
    }
    updateActiveSheetRows((prev) =>
      prev.map((r) => (r.id === rowId ? recalculateStaffListingRow({ ...r, ...patch }) : r))
    );
  };

  const currentGoogleSheetUrl = collection.googleSheetUrls[activeStoreName] || '';

  const existingHandlesInActiveSheet = useMemo(() => {
    return new Set(
      rows.map((r) => normalizeTikTokId(r.idKenh).toLowerCase()).filter(Boolean)
    );
  }, [rows]);

  // Danh sách KOC lọc trong hộp chọn từ Danh bạ
  const filteredDirectoryKocs = useMemo(() => {
    const q = kocSearchText.trim().toLowerCase();
    return kocs.filter((k) => {
      if (q) {
        const matchName = k.stageName.toLowerCase().includes(q);
        const matchHandle = (k.channelId || '').toLowerCase().includes(q);
        const matchReal = (k.realName || '').toLowerCase().includes(q);
        const matchPhone = (k.phone || '').toLowerCase().includes(q);
        if (!matchName && !matchHandle && !matchReal && !matchPhone) return false;
      }
      if (kocFilterTep !== 'ALL' && (k.tepKenh || k.creatorCategory) !== kocFilterTep) {
        return false;
      }
      if (kocFilterKl !== 'ALL') {
        const kl = computeTepBookingFromNetFee(k.rateCardVideo || 0);
        if (kl !== kocFilterKl && k.salaryGrade !== kocFilterKl) return false;
      }
      return true;
    });
  }, [kocs, kocSearchText, kocFilterTep, kocFilterKl]);

  // Lọc dòng hiển thị trên Sheet
  const displayedRows = useMemo(() => {
    const q = rowSearchQuery.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterDot !== 'ALL' && r.dot !== filterDot) return false;
      if (filterBrandChon !== 'ALL' && r.brandChon !== filterBrandChon) return false;
      if (q) {
        const hit =
          r.idKenh.toLowerCase().includes(q) ||
          r.tenKenh.toLowerCase().includes(q) ||
          r.sanPham.toLowerCase().includes(q) ||
          r.tepKenh.toLowerCase().includes(q) ||
          r.contentNote.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [rows, filterDot, filterBrandChon, rowSearchQuery]);

  // Thống kê nhanh của Sheet Brand hiện tại
  const sheetStats = useMemo(() => {
    const totalCount = rows.length;
    const totalNet = rows.reduce((s, r) => s + (Number(r.giaNetVideo) || 0), 0);
    const totalGross = rows.reduce((s, r) => s + (Number(r.phiBookingKemThue) || 0), 0);
    const brandApprovedCount = rows.filter((r) => r.brandChon === 'Yes').length;
    const mustHaveCount = rows.filter((r) => r.deXuatUpBase === 'Must Have').length;
    return { totalCount, totalNet, totalGross, brandApprovedCount, mustHaveCount };
  }, [rows]);

  // Cập nhật 1 ô trên bảng
  const handleCellChange = (
    rowId: string,
    key: StaffListingColumnKey,
    value: string | number
  ) => {
    const contactKeys: StaffListingColumnKey[] = [
      'email',
      'zalo',
      'nguoiNhanHang',
      'sdtNhanHang',
      'diaChiNhanHang',
      'soTaiKhoan',
      'nganHang',
      'soCccd',
    ];
    if (contactKeys.includes(key)) {
      const targetRow = rows.find((r) => r.id === rowId);
      if (targetRow) {
        const strVal = String(value);
        syncSheetRowContactToKocMaster({
          kocId: targetRow.kocId,
          idKenh: targetRow.idKenh,
          ...(key === 'email' ? { email: strVal } : {}),
          ...(key === 'zalo' ? { zalo: strVal, phone: strVal } : {}),
          ...(key === 'nguoiNhanHang' ? { shippingRecipientName: strVal } : {}),
          ...(key === 'sdtNhanHang' ? { shippingPhone: strVal } : {}),
          ...(key === 'diaChiNhanHang' ? { shippingAddress: strVal } : {}),
          ...(key === 'soTaiKhoan' ? { bankAccount: strVal } : {}),
          ...(key === 'nganHang' ? { bankName: strVal } : {}),
          ...(key === 'soCccd' ? { cccd: strVal } : {}),
          allKocs: kocs,
        });
      }
    }

    let approvedRowToSync: StaffListingSheetRow | null = null;

    updateActiveSheetRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const updated = recalculateStaffListingRow(
          { ...r, [key]: value },
          { preserveIdKenhInput: key === 'idKenh' }
        );
        if (key === 'brandChon' && String(value) === 'Yes') {
          approvedRowToSync = updated;
        }
        return updated;
      })
    );

    if (approvedRowToSync) {
      const rowForTransfer = approvedRowToSync as StaffListingSheetRow;
      setTimeout(() => {
        transferBrandApprovedRowsToBookingList({
          rowsToTransfer: [rowForTransfer],
          sheetKey: activeSheetKey,
          store: activeStoreObj,
          allKocs: kocs,
          allStores: stores,
          allDeals: deals,
        });
        setCollection(loadStaffSheetCollection(kocs, stores, deals, currentUserName));
      }, 0);
    }
  };

  // Chuẩn hóa ID kênh và tự động điền thông tin từ Danh bạ KOC khi rời ô nhập
  const handleIdKenhBlur = (rowId: string) => {
    updateActiveSheetRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const clean = normalizeTikTokId(String(r.idKenh || '')).toLowerCase();
        const matchedKoc = clean
          ? kocs.find((k) => normalizeTikTokId(k.channelId).toLowerCase() === clean)
          : undefined;
        if (matchedKoc && (!r.kocId || r.kocId !== matchedKoc.id)) {
          const autoRow = buildStaffListingRowFromKoc({
            koc: matchedKoc,
            monthKey: activeMonth,
            storeName: activeStoreName,
            staffName: currentUserName,
            deals,
            dot: r.dot,
            sanPham: r.sanPham,
            contentTag: r.contentTag,
            deXuatUpBase: r.deXuatUpBase,
            trangThai: r.trangThai,
            contentNote: r.contentNote,
            ngayAirPlan: r.ngayAirPlan,
          });
          return {
            ...autoRow,
            id: r.id,
            createdAt: r.createdAt,
          };
        }
        return recalculateStaffListingRow(r);
      })
    );
  };

  // Thêm 1 dòng trống để nhân viên tự gõ hoặc dán ID kênh
  const handleAddBlankRow = () => {
    const defaultProd =
      activeStoreObj?.mainProducts?.[0] ||
      (activeStoreObj?.brandName ? `Sản phẩm ${activeStoreObj.brandName}` : '');
    const blankRow = buildStaffListingRowFromKoc({
      koc: {
        stageName: '',
        channelId: '',
        rateCardVideo: 1500000,
        followers: 0,
        tepKenh: 'Beauty',
      },
      monthKey: activeMonth,
      storeName: activeStoreName,
      staffName: currentUserName,
      deals,
      dot: 'Đợt 1',
      sanPham: defaultProd,
      contentTag: 'Review trực tiếp',
      deXuatUpBase: 'Recommend',
    });
    updateActiveSheetRows((prev) => [...prev, blankRow]);
    onNotify?.('Đã thêm 1 dòng mới vào Sheet.', 'info');
  };

  // Đưa các KOC đã tích chọn từ Danh bạ vào Sheet hiện tại
  const handleAddPickedKocsToSheet = () => {
    if (pickedKocIds.length === 0) return;
    const pickedSet = new Set(pickedKocIds);
    const selectedKocs = kocs.filter((k) => pickedSet.has(k.id));
    const defaultProd =
      quickProduct.trim() ||
      activeStoreObj?.mainProducts?.[0] ||
      (activeStoreObj?.brandName ? `Sản phẩm ${activeStoreObj.brandName}` : '');

    let added = 0;
    let skipped = 0;

    updateActiveSheetRows((prev) => {
      const existingSet = new Set(
        prev.map((r) => normalizeTikTokId(r.idKenh).toLowerCase()).filter(Boolean)
      );
      const nextRows = [...prev];

      for (const koc of selectedKocs) {
        const cleanId = normalizeTikTokId(koc.channelId).toLowerCase();
        if (cleanId && existingSet.has(cleanId)) {
          skipped++;
          continue;
        }
        if (cleanId) existingSet.add(cleanId);
        nextRows.push(
          buildStaffListingRowFromKoc({
            koc,
            monthKey: activeMonth,
            storeName: activeStoreName,
            staffName: currentUserName,
            deals,
            dot: quickBatchDot,
            sanPham: defaultProd,
            contentTag: quickContentTag,
            deXuatUpBase: quickUpbaseProposal,
            contentNote: 'Hình ảnh phù hợp với thương hiệu',
          })
        );
        added++;
      }
      return nextRows;
    });

    setPickedKocIds([]);
    setIsDirectoryPickerOpen(false);
    if (added > 0) {
      onNotify?.(
        skipped > 0
          ? `Đã đưa ${added} KOC vào Sheet "${activeStoreName}" (bỏ qua ${skipped} kênh trùng).`
          : `Đã đưa ${added} KOC vào Sheet "${activeStoreName}" và tự động điền dữ liệu hồ sơ.`,
        'success'
      );
    } else {
      onNotify?.('Các KOC đã chọn đều đã có trong Sheet này.', 'warning');
    }
  };

  // Xóa các dòng đã chọn
  const handleDeleteSelectedRows = () => {
    if (selectedRowIds.length === 0) return;
    const delSet = new Set(selectedRowIds);
    updateActiveSheetRows((prev) => prev.filter((r) => !delSet.has(r.id)));
    setSelectedRowIds([]);
    onNotify?.(`Đã xóa ${delSet.size} dòng khỏi Sheet.`, 'info');
  };

  // Copy TSV vào Clipboard (để dán thẳng vào Google Sheet / Excel)
  const handleCopyTsv = async (mode: 'VISIBLE_COLS' | 'BRAND_WORKING_COLS' | 'ALL_48_COLS') => {
    const targetRows =
      selectedRowIds.length > 0
        ? displayedRows.filter((r) => selectedRowIds.includes(r.id))
        : displayedRows;

    if (targetRows.length === 0) {
      onNotify?.('Chưa có dòng dữ liệu nào để copy.', 'warning');
      return;
    }

    const colsToCopy =
      mode === 'ALL_48_COLS'
        ? STAFF_LISTING_COLUMNS
        : mode === 'BRAND_WORKING_COLS'
          ? STAFF_LISTING_COLUMNS.filter((c) => c.inBrandWorkingFile)
          : visibleColumns;

    const tsv = formatStaffSheetToTsv(targetRows, colsToCopy, {
      includeHeaders: copyWithHeaders,
      useGoogleSheetFormulas: copyWithFormulas,
      startRowNumberInSheet: 4,
    });

    try {
      await navigator.clipboard.writeText(tsv);
      const label =
        mode === 'BRAND_WORKING_COLS'
          ? `bản gửi Brand (${colsToCopy.length} cột Working file)`
          : mode === 'ALL_48_COLS'
            ? 'đầy đủ 48 cột (B -> AW)'
            : `${colsToCopy.length} cột đang bật`;
      onNotify?.(
        `Đã copy ${targetRows.length} dòng (${label}) — bấm Ctrl+V vào Google Sheet hoặc Excel.`,
        'success'
      );
    } catch {
      onNotify?.('Không thể truy cập Clipboard trình duyệt.', 'error');
    }
  };

  // Lưu link Google Sheet cho Brand hiện tại
  const handleSaveGoogleSheetUrl = () => {
    const trimmed = googleSheetUrlDraft.trim();
    setCollection((prev) => {
      const next: StaffBrandSheetCollection = {
        ...prev,
        googleSheetUrls: {
          ...prev.googleSheetUrls,
          [activeStoreName]: trimmed,
        },
      };
      saveStaffSheetCollection(next, false);
      return next;
    });
    setIsGoogleSheetModalOpen(false);
    onNotify?.(
      trimmed
        ? `Đã liên kết Google Sheet cho "${activeStoreName}".`
        : `Đã gỡ liên kết Google Sheet của "${activeStoreName}".`,
      'success'
    );
  };

  // Copy bản gửi Brand & Mở ngay Google Sheet của Brand
  const handleCopyAndOpenGoogleSheet = async () => {
    await handleCopyTsv('BRAND_WORKING_COLS');
    if (currentGoogleSheetUrl) {
      window.open(currentGoogleSheetUrl, '_blank', 'noopener,noreferrer');
    } else {
      setGoogleSheetUrlDraft('');
      setIsGoogleSheetModalOpen(true);
    }
  };

  // Đồng bộ các dòng từ Sheet sang Luồng Duyệt & Air Video chung
  const handlePushToSystemListing = () => {
    if (!onSyncRowsToSystemListings || !activeStoreObj) return;
    const targetRows =
      selectedRowIds.length > 0
        ? displayedRows.filter((r) => selectedRowIds.includes(r.id))
        : displayedRows;
    if (targetRows.length === 0) {
      onNotify?.('Chưa có dòng nào trong Sheet để chuyển sang theo dõi Air Video.', 'warning');
      return;
    }

    const mappedItems: Partial<KocListingItem>[] = targetRows.map((r) => {
      const brandApprovalStatus: KocListingItem['brandApprovalStatus'] =
        r.brandChon === 'Yes'
          ? 'BRAND_APPROVED'
          : r.brandChon === 'No'
            ? 'BRAND_REJECTED'
            : 'BRAND_PENDING';
      const kocNegotiationStatus: KocListingItem['kocNegotiationStatus'] =
        r.trangThai === 'Nhận sản phẩm' || r.trangThai === 'Trải nghiệm sản phẩm'
          ? 'TERMS_AGREED'
          : r.trangThai === 'Từ chối'
            ? 'NEGOTIATION_FAILED'
            : 'CONTACTING';
      const overallStatus: KocListingItem['overallStatus'] =
        brandApprovalStatus === 'BRAND_APPROVED' && kocNegotiationStatus === 'TERMS_AGREED'
          ? 'FINAL_APPROVED'
          : brandApprovalStatus === 'BRAND_REJECTED' || kocNegotiationStatus === 'NEGOTIATION_FAILED'
            ? 'DROPPED'
            : 'SUBMITTED';
      return {
        kocId: r.kocId || `koc-${r.idKenh}`,
        kocName: r.tenKenh || r.idKenh,
        kocHandle: `@${normalizeTikTokId(r.idKenh)}`,
        channel: 'TikTok Shop',
        salaryGrade: (r.tepBooking === 'Freecast' ? 'TAP UpAffiliate' : r.tepBooking) as SalaryGrade,
        followersCount: Number(r.follower) || 0,
        pillarName: r.sanPham || r.contentTag || 'Sản phẩm chiến dịch',
        proposedFee: Number(r.giaNetVideo) || 0,
        finalFee: Number(r.giaNetVideo) || 0,
        expectedAirDate: r.ngayAirPlan || '2026-10-25',
        brandApprovalStatus,
        brandFeedbackNote: r.lyDoTuChoi || r.contentNote || '',
        kocNegotiationStatus,
        negotiationNote: r.trangThai,
        overallStatus,
      };
    });

    onSyncRowsToSystemListings(mappedItems, activeStoreObj, 'BATCH_10');
  };

  // Chọn nhanh tất cả các dòng Brand chọn = Yes
  const handleSelectAllBrandApproved = () => {
    const approvedIds = displayedRows
      .filter((r) => r.brandChon === 'Yes')
      .map((r) => r.id);
    if (approvedIds.length === 0) {
      onNotify?.(
        'Chưa có dòng nào được đánh dấu "Brand chọn = Yes". Bạn có thể tích chọn trực tiếp các dòng cần chuyển.',
        'warning'
      );
      return;
    }
    setSelectedRowIds(approvedIds);
    onNotify?.(`Đã chọn ${approvedIds.length} dòng Brand duyệt (Yes).`, 'info');
  };

  // Chuyển các dòng Brand duyệt sang màn hình độc lập "List duyệt book"
  const handleTransferToApprovedBookingList = (openScreenAfter = false) => {
    const targetRows =
      selectedRowIds.length > 0
        ? displayedRows.filter((r) => selectedRowIds.includes(r.id))
        : displayedRows.filter((r) => r.brandChon === 'Yes');

    if (targetRows.length === 0) {
      onNotify?.(
        'Vui lòng tích chọn các dòng KOC được Brand duyệt (hoặc đổi cột "Brand chọn" sang "Yes") trước khi chuyển sang List duyệt book.',
        'warning'
      );
      return;
    }

    const res = transferBrandApprovedRowsToBookingList({
      rowsToTransfer: targetRows,
      sheetKey: activeSheetKey,
      store: activeStoreObj,
      allKocs: kocs,
      allStores: stores,
      allDeals: deals,
    });

    setCollection(loadStaffSheetCollection(kocs, stores, deals, currentUserName));
    setSelectedRowIds([]);

    onNotify?.(
      `Đã chuyển ${targetRows.length} KOC (${res.addedCount} mới, ${res.updatedCount} cập nhật) sang bảng List duyệt book.`,
      'success'
    );

    if (openScreenAfter && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('upbase-navigate-tab', {
          detail: {
            tab: 'approved-booking-list',
            storeName: activeStoreName,
            monthKey: activeMonth,
          },
        })
      );
    }
  };

  const handleOpenApprovedBookingListScreen = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('upbase-navigate-tab', {
          detail: {
            tab: 'approved-booking-list',
            storeName: activeStoreName,
            monthKey: activeMonth,
          },
        })
      );
    }
  };

  const toggleSelectAllRows = () => {
    if (selectedRowIds.length === displayedRows.length && displayedRows.length > 0) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(displayedRows.map((r) => r.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-3">
      {/* Khung làm việc tích hợp: Chọn Sheet + Chỉ số + Thanh công cụ + Bảng dữ liệu */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden shadow-2xs">
        {/* Tầng 1: Ngữ cảnh Tháng / Gian hàng + Tab chuyển nhanh Sheet + Chỉ số tóm tắt */}
        <div className="px-3 py-2 border-b border-line bg-sunken/40 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <select
              value={activeMonth}
              onChange={(e) => onChangeMonth(e.target.value)}
              aria-label="Chọn tháng"
              className="h-7 px-2 text-xs font-semibold rounded-md border border-line-strong bg-surface text-ink shrink-0 focus:outline-none focus:border-ink"
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </select>

            <select
              value={activeStoreName}
              onChange={(e) => onChangeStore(e.target.value)}
              aria-label="Chọn Brand / Gian hàng"
              className="h-7 px-2.5 text-xs font-semibold rounded-md border border-line-strong bg-surface text-ink max-w-[230px] truncate shrink-0 focus:outline-none focus:border-ink"
            >
              {b2cStores.map((st) => {
                const c = (
                  collection.sheets[makeSheetKey(activeMonth, st.storeName)] || []
                ).length;
                return (
                  <option key={st.id} value={st.storeName}>
                    {st.brandName} — {st.storeName} ({c} KOC)
                  </option>
                );
              })}
            </select>

            <span className="h-4 w-px bg-line mx-0.5 shrink-0" />

            <div className="flex items-center gap-1 shrink-0">
              {activeMonthBrandSheets.map((sh) => {
                const isCurrent = sh.storeName === activeStoreName;
                return (
                  <button
                    key={sh.storeName}
                    type="button"
                    onClick={() => onChangeStore(sh.storeName)}
                    className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-xs font-medium border transition-colors shrink-0 ${
                      isCurrent
                        ? 'bg-ink text-white border-ink'
                        : 'bg-surface text-ink-2 border-line hover:bg-sunken hover:text-ink'
                    }`}
                  >
                    <FileSpreadsheet className="w-3 h-3 shrink-0" />
                    <span className="truncate max-w-[140px]">{sh.storeName}</span>
                    <span
                      className={`px-1 rounded text-[10px] tabular-nums ${
                        isCurrent ? 'bg-white/20 text-white' : 'bg-sunken text-ink-3'
                      }`}
                    >
                      {sh.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cụm chỉ số tóm tắt gọn trên 1 dòng */}
          <div className="flex items-center gap-3 px-2.5 py-1 rounded-md bg-surface border border-line text-xs shrink-0">
            <div className="flex items-center gap-1">
              <span className="text-ink-3">KOC:</span>
              <strong className="text-ink tabular-nums">{sheetStats.totalCount}</strong>
            </div>
            <span className="h-3 w-px bg-line" />
            <div className="flex items-center gap-1">
              <span className="text-ink-3">Net:</span>
              <strong className="text-ink tabular-nums">
                {formatVndShort(sheetStats.totalNet)}
              </strong>
            </div>
            <span className="h-3 w-px bg-line" />
            <div className="flex items-center gap-1">
              <span className="text-ink-3">Gross:</span>
              <strong className="text-accent tabular-nums">
                {formatVndShort(sheetStats.totalGross)}
              </strong>
            </div>
            <span className="h-3 w-px bg-line" />
            <div className="flex items-center gap-1">
              <span className="text-ink-3">Brand chọn:</span>
              <strong className="text-positive tabular-nums">
                {sheetStats.brandApprovedCount}/{sheetStats.totalCount}
              </strong>
            </div>
          </div>
        </div>

        {/* Tầng 2: Thanh công cụ Lọc + Cột hiển thị + Thao tác nghiệp vụ (Gói gọn 1 hàng) */}
        <div className="px-3 py-2 border-b border-line bg-surface flex flex-wrap items-center justify-between gap-2">
          {/* Bên trái: Tìm kiếm, Lọc, Chế độ cột */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="relative w-48 sm:w-52">
              <Search className="w-3.5 h-3.5 text-ink-3 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={rowSearchQuery}
                onChange={(e) => setRowSearchQuery(e.target.value)}
                placeholder="Tìm ID kênh, tên KOC, SP..."
                className="w-full h-7 pl-7 pr-2 text-xs rounded-md border border-line-strong bg-surface text-ink focus:outline-none focus:border-ink"
              />
            </div>

            <select
              value={filterDot}
              onChange={(e) => setFilterDot(e.target.value)}
              className="h-7 px-2 text-xs rounded-md border border-line-strong bg-surface text-ink"
            >
              <option value="ALL">Tất cả đợt</option>
              {DOT_LISTING_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <select
              value={filterBrandChon}
              onChange={(e) => setFilterBrandChon(e.target.value)}
              className="h-7 px-2 text-xs rounded-md border border-line-strong bg-surface text-ink"
            >
              <option value="ALL">Brand chọn: Tất cả</option>
              {BRAND_CHON_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  Brand: {b}
                </option>
              ))}
            </select>

            <Button
              variant="secondary"
              size="sm"
              icon={Columns}
              onClick={() => setIsColumnPickerOpen((v) => !v)}
            >
              Cột ({visibleColumns.length}/{STAFF_LISTING_COLUMNS.length})
            </Button>

            {selectedRowIds.length > 0 && (
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                onClick={handleDeleteSelectedRows}
              >
                Xóa ({selectedRowIds.length})
              </Button>
            )}
          </div>

          {/* Bên phải: Thêm KOC, Gửi mail, Copy/Xuất file, Chuyển List duyệt book */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Button variant="secondary" size="sm" icon={Plus} onClick={handleAddBlankRow}>
              Thêm dòng
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={UserPlus}
              onClick={() => setIsDirectoryPickerOpen(true)}
            >
              Chọn từ Danh bạ
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={Mail}
              onClick={() => handleOpenOutreachForSelection('COMPOSE')}
            >
              Gửi mail ({selectedRowIds.length > 0 ? selectedRowIds.length : displayedRows.length})
            </Button>

            {/* Menu gộp Copy & Xuất dữ liệu */}
            <div ref={exportMenuRef} className="relative inline-block">
              <button
                type="button"
                onClick={() => setIsExportMenuOpen((v) => !v)}
                className="h-7 px-2.5 rounded-md border border-line-strong bg-surface text-xs font-medium text-ink hover:bg-sunken inline-flex items-center gap-1.5 transition-colors"
              >
                <Copy className="w-3.5 h-3.5 text-ink-3" />
                <span>Copy / Xuất</span>
                <ChevronDown className="w-3.5 h-3.5 text-ink-3" />
              </button>

              {isExportMenuOpen && (
                <div className="absolute right-0 top-8 z-40 w-64 p-1.5 bg-surface border border-line rounded-lg shadow-lg text-xs space-y-1">
                  <div className="px-2 py-1.5 bg-sunken rounded border border-line space-y-1.5">
                    <label className="flex items-center gap-2 text-ink-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={copyWithHeaders}
                        onChange={(e) => setCopyWithHeaders(e.target.checked)}
                        className="rounded border-line"
                      />
                      <span>Kèm tiêu đề cột</span>
                    </label>
                    <label className="flex items-center gap-2 text-ink-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={copyWithFormulas}
                        onChange={(e) => setCopyWithFormulas(e.target.checked)}
                        className="rounded border-line"
                      />
                      <span>Giữ công thức Google Sheet</span>
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      void handleCopyTsv('BRAND_WORKING_COLS');
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left text-ink hover:bg-sunken font-medium"
                  >
                    <Copy className="w-3.5 h-3.5 text-ink-3 shrink-0" />
                    <span>Copy bản gửi Brand (Working file)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      void handleCopyTsv('VISIBLE_COLS');
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left text-ink hover:bg-sunken"
                  >
                    <Copy className="w-3.5 h-3.5 text-ink-3 shrink-0" />
                    <span>Copy bảng đang bật ({visibleColumns.length} cột)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      void handleCopyAndOpenGoogleSheet();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left text-ink hover:bg-sunken"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-ink-3 shrink-0" />
                    <span>Copy &amp; Mở Google Sheet</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      downloadStaffSheetCsv(rows, visibleColumns, activeStoreName, activeMonth);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left text-ink hover:bg-sunken"
                  >
                    <Download className="w-3.5 h-3.5 text-ink-3 shrink-0" />
                    <span>Xuất file CSV / Excel</span>
                  </button>

                  <div className="border-t border-line pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsExportMenuOpen(false);
                        setGoogleSheetUrlDraft(currentGoogleSheetUrl);
                        setIsGoogleSheetModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left text-ink-2 hover:bg-sunken hover:text-ink"
                    >
                      <Link2 className="w-3.5 h-3.5 text-ink-3 shrink-0" />
                      <span>
                        {currentGoogleSheetUrl
                          ? 'Đổi link Google Sheet'
                          : 'Gắn link Google Sheet'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={ArrowRight}
              onClick={() => handleTransferToApprovedBookingList(true)}
            >
              Chuyển List duyệt book (
              {selectedRowIds.length > 0
                ? selectedRowIds.length
                : sheetStats.brandApprovedCount}
              )
            </Button>

            <ActionMenu
              label="Tiện ích khác"
              items={[
                {
                  label: `Chọn dòng Brand duyệt (${sheetStats.brandApprovedCount})`,
                  icon: CheckCircle2,
                  onSelect: handleSelectAllBrandApproved,
                },
                {
                  label: 'Mở màn hình List duyệt book',
                  icon: ExternalLink,
                  onSelect: handleOpenApprovedBookingListScreen,
                },
                ...(onSyncRowsToSystemListings
                  ? [
                      {
                        label: 'Chuyển sang Theo dõi Air',
                        icon: Send,
                        onSelect: handlePushToSystemListing,
                      },
                    ]
                  : []),
                {
                  label: 'Quản lý mẫu mail mời KOC',
                  icon: FileText,
                  onSelect: () => handleOpenOutreachForSelection('TEMPLATES'),
                },
                {
                  label: 'Cấu hình Lark Mail & Lịch sử gửi',
                  icon: Settings,
                  onSelect: () => handleOpenOutreachForSelection('SETTINGS_LOGS'),
                },
                {
                  label: currentGoogleSheetUrl
                    ? 'Đã gắn link Google Sheet (Sửa)'
                    : 'Gắn link Google Sheet',
                  icon: Link2,
                  onSelect: () => {
                    setGoogleSheetUrlDraft(currentGoogleSheetUrl);
                    setIsGoogleSheetModalOpen(true);
                  },
                },
                ...(onOpenShortlistFilterModal
                  ? [
                      {
                        label: 'Lọc đề xuất KOC nâng cao',
                        icon: Search,
                        onSelect: onOpenShortlistFilterModal,
                      },
                    ]
                  : []),
              ]}
            />
          </div>
        </div>

        {/* Khung bật/tắt cột tùy ý (chỉ hiện khi bấm nút Cột) */}
        {isColumnPickerOpen && (
          <div className="p-3 bg-sunken border-b border-line space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-line">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink">
                <span>Cấu hình cột hiển thị:</span>
                <span className="px-1.5 py-0.5 rounded text-2xs border bg-emerald-50 text-emerald-700 border-emerald-200">
                  Tự động: Lấy từ Danh bạ
                </span>
                <span className="px-1.5 py-0.5 rounded text-2xs border bg-sky-50 text-sky-700 border-sky-200">
                  Công thức: Tự tính
                </span>
                <span className="px-1.5 py-0.5 rounded text-2xs border bg-amber-50 text-amber-800 border-amber-200">
                  NV điền: Nhập/chọn
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => applyColumnPreset('ALL_48')}
                >
                  Tất cả ({STAFF_LISTING_COLUMNS.length} cột)
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => applyColumnPreset('BRAND_WORKING_FILE')}
                >
                  Bản gửi Brand (32 cột)
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => applyColumnPreset('ACCEPTANCE_FILE_32')}
                >
                  Chốt Book &amp; Nghiệm thu (AX–BJ)
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => applyColumnPreset('LARK_BASE')}
                >
                  Lark Base (46 cột)
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 max-h-56 overflow-y-auto pr-1">
              {STAFF_LISTING_COLUMNS.map((col) => {
                const checked = visibleColumnKeys.includes(col.key);
                const badge = FILL_MODE_BADGE[col.fillMode];
                return (
                  <label
                    key={col.key}
                    className={`flex items-center justify-between gap-1.5 px-2 py-1.5 rounded border text-2xs cursor-pointer select-none transition-colors ${
                      checked
                        ? 'bg-surface border-ink/40 text-ink font-medium'
                        : 'bg-surface/50 border-line text-ink-3'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 min-w-0 truncate">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleColumnKey(col.key)}
                        className="rounded border-line shrink-0"
                      />
                      <span className="font-mono text-[10px] text-ink-3 shrink-0">
                        [{col.excelCol}]
                      </span>
                      <span className="truncate" title={col.header}>
                        {getDisplayHeader(col)}
                      </span>
                    </span>
                    <span
                      className={`px-1 py-0.2 rounded text-[9px] border shrink-0 ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Tầng 3: Bảng dữ liệu Sheet Listing */}
        <div className="overflow-x-auto max-h-[74vh]">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-20 bg-sunken border-b border-line">
              <tr>
                <th className="sticky left-0 z-30 bg-sunken px-2 py-1.5 border-r border-line w-[38px] min-w-[38px] max-w-[38px] text-center">
                  <input
                    type="checkbox"
                    checked={
                      displayedRows.length > 0 &&
                      selectedRowIds.length === displayedRows.length
                    }
                    onChange={toggleSelectAllRows}
                    className="rounded border-line"
                  />
                </th>
                <th className="sticky left-[38px] z-30 bg-sunken px-1.5 py-1.5 border-r border-line w-[38px] min-w-[38px] max-w-[38px] text-center font-mono text-2xs text-ink-3">
                  STT
                </th>
                {visibleColumns.map((col) => {
                  const badge = FILL_MODE_BADGE[col.fillMode];
                  const isStickyId = col.key === 'idKenh';
                  const displayHeader = getDisplayHeader(col);
                  return (
                    <th
                      key={col.key}
                      style={
                        isStickyId
                          ? { width: col.width, minWidth: col.width, maxWidth: col.width }
                          : { minWidth: col.width }
                      }
                      title={`Cột ${col.excelCol}: ${col.header}`}
                      className={`px-2 py-1.5 border-r border-line text-left align-top ${
                        isStickyId
                          ? 'sticky left-[76px] z-30 bg-sunken shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-mono text-[10px] text-ink-3">
                          {col.excelCol}
                        </span>
                        <span
                          className={`px-1 py-0.2 rounded text-[9px] font-medium border ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <div className="font-semibold text-ink leading-tight truncate">
                        {displayHeader}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-line">
              {displayedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length + 2}
                    className="py-12 text-center text-ink-3"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <FileSpreadsheet className="w-7 h-7 text-ink-3" />
                      <div className="font-medium text-ink">
                        Sheet &ldquo;{activeStoreName}&rdquo; ({activeMonth}) chưa có KOC nào
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Button
                          variant="primary"
                          size="sm"
                          icon={UserPlus}
                          onClick={() => setIsDirectoryPickerOpen(true)}
                        >
                          Chọn KOC từ Danh bạ
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Plus}
                          onClick={handleAddBlankRow}
                        >
                          Thêm dòng trống
                        </Button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedRows.map((row, rIdx) => {
                  const isSelected = selectedRowIds.includes(row.id);
                  const stickyCellBg = isSelected
                    ? 'bg-accent-soft'
                    : 'bg-surface group-hover:bg-sunken';
                  return (
                    <tr
                      key={row.id}
                      className={`group ${
                        isSelected ? 'bg-accent-soft/30' : 'hover:bg-sunken/50'
                      } transition-colors`}
                    >
                      <td
                        className={`sticky left-0 z-10 ${stickyCellBg} px-2 py-1.5 border-r border-line w-[38px] min-w-[38px] max-w-[38px] text-center`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(row.id)}
                          className="rounded border-line"
                        />
                      </td>
                      <td
                        className={`sticky left-[38px] z-10 ${stickyCellBg} px-1.5 py-1.5 border-r border-line w-[38px] min-w-[38px] max-w-[38px] text-center font-mono text-2xs text-ink-3 tabular-nums`}
                      >
                        {rIdx + 1}
                      </td>

                      {visibleColumns.map((col) => {
                        const isStickyId = col.key === 'idKenh';
                        const cellBaseClass = `px-2 py-1.5 border-r border-line align-middle ${
                          isStickyId
                            ? `sticky left-[76px] z-10 ${stickyCellBg} shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]`
                            : ''
                        }`;

                        // Render ô nhập / chọn phù hợp từng cột
                        if (col.key === 'dot') {
                          return (
                            <td key={col.key} className={cellBaseClass}>
                              <select
                                value={row.dot}
                                onChange={(e) =>
                                  handleCellChange(row.id, 'dot', e.target.value)
                                }
                                className="w-full h-7 px-1.5 rounded border border-line bg-surface text-xs text-ink"
                              >
                                {DOT_LISTING_OPTIONS.map((d) => (
                                  <option key={d} value={d}>
                                    {d}
                                  </option>
                                ))}
                              </select>
                            </td>
                          );
                        }

                        if (col.key === 'contentTag') {
                          return (
                            <td key={col.key} className={cellBaseClass}>
                              <select
                                value={row.contentTag}
                                onChange={(e) =>
                                  handleCellChange(row.id, 'contentTag', e.target.value)
                                }
                                className="w-full h-7 px-1.5 rounded border border-line bg-surface text-xs text-ink"
                              >
                                {CONTENT_TAG_OPTIONS.map((tag) => (
                                  <option key={tag} value={tag}>
                                    {tag}
                                  </option>
                                ))}
                              </select>
                            </td>
                          );
                        }

                        if (col.key === 'tepKenh') {
                          return (
                            <td key={col.key} className={cellBaseClass}>
                              <select
                                value={row.tepKenh}
                                onChange={(e) =>
                                  handleCellChange(row.id, 'tepKenh', e.target.value)
                                }
                                className="w-full h-7 px-1.5 rounded border border-line bg-surface text-xs text-ink"
                              >
                                {!TEP_KENH_OPTIONS.includes(row.tepKenh) && row.tepKenh && (
                                  <option value={row.tepKenh}>{row.tepKenh}</option>
                                )}
                                {TEP_KENH_OPTIONS.map((t) => (
                                  <option key={t} value={t}>
                                    {t}
                                  </option>
                                ))}
                              </select>
                            </td>
                          );
                        }

                        if (col.key === 'trangThai') {
                          return (
                            <td key={col.key} className={cellBaseClass}>
                              <select
                                value={row.trangThai}
                                onChange={(e) =>
                                  handleCellChange(row.id, 'trangThai', e.target.value)
                                }
                                className="w-full h-7 px-1.5 rounded border border-line bg-surface text-xs text-ink"
                              >
                                {TRANG_THAI_OPTIONS.map((st) => (
                                  <option key={st} value={st}>
                                    {st}
                                  </option>
                                ))}
                              </select>
                            </td>
                          );
                        }

                        if (col.key === 'deXuatUpBase') {
                          return (
                            <td key={col.key} className={cellBaseClass}>
                              <select
                                value={row.deXuatUpBase}
                                onChange={(e) =>
                                  handleCellChange(row.id, 'deXuatUpBase', e.target.value)
                                }
                                className={`w-full h-7 px-1.5 rounded border text-xs font-medium ${
                                  row.deXuatUpBase === 'Must Have'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : row.deXuatUpBase === 'Recommend'
                                      ? 'bg-sky-50 text-sky-800 border-sky-200'
                                      : 'bg-surface text-ink border-line'
                                }`}
                              >
                                {DE_XUAT_UPBASE_OPTIONS.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            </td>
                          );
                        }

                        if (col.key === 'brandChon') {
                          return (
                            <td key={col.key} className={cellBaseClass}>
                              <div className="space-y-1">
                                <select
                                  value={row.brandChon}
                                  onChange={(e) =>
                                    handleCellChange(row.id, 'brandChon', e.target.value)
                                  }
                                  className={`w-full h-7 px-1.5 rounded border text-xs font-semibold ${
                                    row.brandChon === 'Yes'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : row.brandChon === 'No'
                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                        : row.brandChon === 'Cân nhắc'
                                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                                          : 'bg-surface text-ink-2 border-line'
                                  }`}
                                >
                                  {BRAND_CHON_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                                {row.chuyenListDuyetBook && (
                                  <div className="flex items-center justify-between gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50/80 border border-emerald-200 rounded px-1.5 py-0.5">
                                    <span>Đã sang List duyệt</span>
                                    {row.maBooking && (
                                      <span className="font-mono font-bold">
                                        {row.maBooking}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        }

                        if (col.key === 'maBooking') {
                          return (
                            <td key={col.key} className={`${cellBaseClass} bg-sunken/30`}>
                              {row.maBooking ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 font-mono text-xs font-bold text-emerald-800">
                                  {row.maBooking}
                                </span>
                              ) : (
                                <span className="text-2xs text-ink-3">Chưa tạo BO</span>
                              )}
                            </td>
                          );
                        }

                        if (col.key === 'linkAirNghiemThu') {
                          return (
                            <td key={col.key} className={`${cellBaseClass} bg-sunken/30`}>
                              {row.linkAirNghiemThu ? (
                                <a
                                  href={row.linkAirNghiemThu}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-700 font-medium hover:underline truncate block max-w-[200px]"
                                  title={row.linkAirNghiemThu}
                                >
                                  {row.linkAirNghiemThu}
                                </a>
                              ) : (
                                <span className="text-2xs text-ink-3">Chờ nghiệm thu</span>
                              )}
                            </td>
                          );
                        }

                        if (col.key === 'trangThaiSlaAir') {
                          const slaVal = row.trangThaiSlaAir || 'Chưa lên sóng';
                          return (
                            <td key={col.key} className={`${cellBaseClass} bg-sunken/30`}>
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border ${
                                  slaVal.startsWith('Trễ')
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : slaVal === 'Đúng hạn' || slaVal.startsWith('Sớm')
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-surface text-ink-3 border-line'
                                }`}
                              >
                                {slaVal}
                              </span>
                            </td>
                          );
                        }

                        if (col.key === 'trangThaiThanhToan') {
                          const payVal = row.trangThaiThanhToan || 'Chờ nghiệm thu';
                          return (
                            <td key={col.key} className={`${cellBaseClass} bg-sunken/30`}>
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border ${
                                  payVal === 'Đã thanh toán'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : payVal === 'Đủ điều kiện ĐNTT' ||
                                      payVal === 'Đã lập ĐNTT'
                                    ? 'bg-sky-50 text-sky-800 border-sky-200'
                                    : 'bg-surface text-ink-3 border-line'
                                }`}
                              >
                                {payVal}
                              </span>
                            </td>
                          );
                        }

                        if (
                          col.key === 'giaChotCuoi' ||
                          col.key === 'viewsNghiemThu' ||
                          col.key === 'gmvNghiemThu' ||
                          col.key === 'donHangNghiemThu' ||
                          col.key === 'roiNghiemThu'
                        ) {
                          const numVal = Number(row[col.key]) || 0;
                          const formatted =
                            numVal <= 0
                              ? '—'
                              : col.key === 'giaChotCuoi' || col.key === 'gmvNghiemThu'
                              ? formatVnd(numVal)
                              : col.key === 'roiNghiemThu'
                              ? `${numVal.toFixed(2)}x`
                              : numVal.toLocaleString('vi-VN');
                          return (
                            <td
                              key={col.key}
                              className={`${cellBaseClass} font-mono text-xs font-semibold text-right tabular-nums bg-sunken/30`}
                            >
                              {formatted}
                            </td>
                          );
                        }

                        if (col.key === 'linkKenh') {
                          return (
                            <td key={col.key} className={cellBaseClass}>
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={row.linkKenh}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-accent hover:underline truncate max-w-[185px]"
                                  title={row.linkKenh}
                                >
                                  {row.linkKenh || '—'}
                                </a>
                              </div>
                            </td>
                          );
                        }

                        if (col.key === 'tepBooking') {
                          return (
                            <td key={col.key} className={cellBaseClass}>
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-sunken border border-line font-mono text-xs font-semibold text-ink">
                                {row.tepBooking}
                              </span>
                            </td>
                          );
                        }

                        if (col.key === 'phiBookingKemThue') {
                          return (
                            <td
                              key={col.key}
                              className={`${cellBaseClass} font-mono font-semibold text-ink tabular-nums text-right bg-sunken/40`}
                            >
                              {formatVnd(row.phiBookingKemThue)}
                            </td>
                          );
                        }

                        if (
                          col.key === 'giaNetVideo' ||
                          col.key === 'follower' ||
                          col.key === 'gmvDaHopTac' ||
                          col.key === 'doanhSo' ||
                          col.key === 'soMonBanRa' ||
                          col.key === 'gpm' ||
                          col.key === 'aov' ||
                          col.key === 'viewTrungBinh'
                        ) {
                          return (
                            <td key={col.key} className={cellBaseClass}>
                              <input
                                type="number"
                                value={row[col.key]}
                                onChange={(e) =>
                                  handleCellChange(
                                    row.id,
                                    col.key,
                                    Number(e.target.value) || 0
                                  )
                                }
                                className="w-full h-7 px-2 rounded border border-line bg-surface text-right font-mono text-xs text-ink tabular-nums focus:outline-none focus:border-ink"
                              />
                            </td>
                          );
                        }

                        if (
                          col.key === 'gmvTuVideoPct' ||
                          col.key === 'gmvTuLivePct' ||
                          col.key === 'gmvTuTheSanPhamPct' ||
                          col.key === 'namPct' ||
                          col.key === 'nuPct' ||
                          col.key === 'tuoi18_24Pct' ||
                          col.key === 'tuoi25_34Pct' ||
                          col.key === 'tuoiTren35Pct' ||
                          col.key === 'tuoiOtherPct'
                        ) {
                          const isFormulaCol = col.fillMode === 'FORMULA';
                          return (
                            <td
                              key={col.key}
                              className={`${cellBaseClass} ${
                                isFormulaCol ? 'bg-sunken/40' : ''
                              }`}
                            >
                              <div className="flex items-center justify-end gap-0.5">
                                <input
                                  type="number"
                                  step="0.1"
                                  readOnly={isFormulaCol}
                                  value={row[col.key]}
                                  onChange={(e) =>
                                    handleCellChange(
                                      row.id,
                                      col.key,
                                      Number(e.target.value) || 0
                                    )
                                  }
                                  className={`w-16 h-7 px-1.5 rounded border text-right font-mono text-xs tabular-nums ${
                                    isFormulaCol
                                      ? 'border-transparent bg-transparent text-ink-2 font-semibold'
                                      : 'border-line bg-surface text-ink'
                                  }`}
                                />
                                <span className="text-2xs text-ink-3">%</span>
                              </div>
                            </td>
                          );
                        }

                        if (col.key === 'idKenh') {
                          const cleanH = normalizeTikTokId(row.idKenh).toLowerCase();
                          const isSent = cleanH && sentEmailHandleSet.has(cleanH);
                          return (
                            <td
                              key={col.key}
                              style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                              className={cellBaseClass}
                            >
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={String(row.idKenh ?? '')}
                                  onChange={(e) =>
                                    handleCellChange(row.id, 'idKenh', e.target.value)
                                  }
                                  onBlur={() => handleIdKenhBlur(row.id)}
                                  placeholder={col.header}
                                  className="w-full min-w-0 h-7 px-2 rounded border border-line bg-surface text-xs text-ink font-semibold focus:outline-none focus:border-ink"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleOpenOutreachForSingleRow(row)}
                                  title={
                                    isSent
                                      ? `Đã gửi thư mời hợp tác (${row.email || 'Xem lại / Gửi tiếp'})`
                                      : `Soạn & gửi mail mời hợp tác cho @${cleanH || 'KOC'}`
                                  }
                                  className={`h-7 px-1.5 rounded border inline-flex items-center gap-1 shrink-0 transition-colors ${
                                    isSent
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                      : 'bg-surface text-ink-2 border-line hover:bg-sunken hover:text-ink'
                                  }`}
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                  {isSent && (
                                    <span className="text-[9px] font-semibold">Đã gửi</span>
                                  )}
                                </button>
                              </div>
                            </td>
                          );
                        }

                        if (col.key === 'email') {
                          return (
                            <td key={col.key} className={cellBaseClass}>
                              <div className="flex items-center gap-1">
                                <input
                                  type="email"
                                  value={String(row.email ?? '')}
                                  onChange={(e) =>
                                    handleCellChange(row.id, 'email', e.target.value)
                                  }
                                  placeholder="email@gmail.com"
                                  className="w-full h-7 px-2 rounded border border-line bg-surface text-xs text-ink focus:outline-none focus:border-ink"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleOpenOutreachForSingleRow(row)}
                                  title="Mở hộp thoại gửi mail mời hợp tác"
                                  className="h-7 w-7 rounded border border-line bg-surface text-ink-2 hover:text-ink hover:bg-sunken inline-flex items-center justify-center shrink-0"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          );
                        }

                        // Các cột văn bản chung (sanPham, contentNote, leaderNote, lyDoTuChoi, thanhQuaHopTac, ngayAirPlan, thông tin liên hệ/ngân hàng/CCCD...)
                        return (
                          <td key={col.key} className={cellBaseClass}>
                            <input
                              type="text"
                              value={String(row[col.key] ?? '')}
                              onChange={(e) =>
                                handleCellChange(row.id, col.key, e.target.value)
                              }
                              placeholder={col.header}
                              className="w-full h-7 px-2 rounded border border-line bg-surface text-xs text-ink focus:outline-none focus:border-ink"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal chọn KOC từ Danh bạ đưa vào Sheet Brand */}
      <Modal
        open={isDirectoryPickerOpen}
        onClose={() => setIsDirectoryPickerOpen(false)}
        title={`Chọn KOC từ Danh bạ đưa vào Sheet "${activeStoreName}" (${activeMonth})`}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsDirectoryPickerOpen(false)}>
              Đóng
            </Button>
            <Button
              variant="primary"
              icon={Check}
              disabled={pickedKocIds.length === 0}
              onClick={handleAddPickedKocsToSheet}
            >
              Đưa {pickedKocIds.length} KOC đã chọn vào Sheet
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {/* Thiết lập nhanh các trường nhân viên điền khi đưa vào Sheet */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-sunken border border-line">
            <Field label="Đợt (Cột C)">
              <Select
                value={quickBatchDot}
                onChange={(e) => setQuickBatchDot(e.target.value)}
              >
                {DOT_LISTING_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Sản phẩm (Cột K)">
              <Input
                value={quickProduct}
                onChange={(e) => setQuickProduct(e.target.value)}
                placeholder={
                  activeStoreObj?.mainProducts?.[0] || 'Nhập tên sản phẩm...'
                }
              />
            </Field>

            <Field label="Content tag (Cột G)">
              <Select
                value={quickContentTag}
                onChange={(e) => setQuickContentTag(e.target.value)}
              >
                {CONTENT_TAG_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Đề xuất UpBase (Cột R)">
              <Select
                value={quickUpbaseProposal}
                onChange={(e) => setQuickUpbaseProposal(e.target.value)}
              >
                {DE_XUAT_UPBASE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {/* Bộ lọc tìm kiếm Danh bạ KOC */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <Input
              value={kocSearchText}
              onChange={(e) => setKocSearchText(e.target.value)}
              placeholder="Tìm tên KOC, @id_kenh, SĐT..."
            />
            <Select
              value={kocFilterTep}
              onChange={(e) => setKocFilterTep(e.target.value)}
            >
              <option value="ALL">Tất cả Tệp kênh</option>
              {TEP_KENH_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
            <Select
              value={kocFilterKl}
              onChange={(e) => setKocFilterKl(e.target.value)}
            >
              <option value="ALL">Tất cả Tệp Booking (KL)</option>
              <option value="Freecast">Freecast (0đ)</option>
              <option value="KL1">KL1 (&lt; 500k)</option>
              <option value="KL2">KL2 (500k - 1.5M)</option>
              <option value="KL3">KL3 (1.5M - 3M)</option>
              <option value="KL4">KL4 (3M - 5M)</option>
              <option value="KL5">KL5 (5M - 10M)</option>
              <option value="KL6">KL6 (10M - 30M)</option>
              <option value="KL7">KL7 (&ge; 30M)</option>
            </Select>
          </div>

          {/* Danh sách KOC trong Danh bạ */}
          <div className="border border-line rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-sunken border-b border-line flex items-center justify-between text-xs">
              <span className="font-semibold text-ink">
                Danh bạ KOC ({filteredDirectoryKocs.length} kênh)
              </span>
              <span className="text-ink-3">
                Đã chọn: <strong className="text-ink">{pickedKocIds.length}</strong>
              </span>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-line">
              {filteredDirectoryKocs.slice(0, 80).map((k) => {
                const cleanHandle = normalizeTikTokId(k.channelId);
                const alreadyInSheet = existingHandlesInActiveSheet.has(
                  cleanHandle.toLowerCase()
                );
                const isChecked = pickedKocIds.includes(k.id);
                const kl = computeTepBookingFromNetFee(k.rateCardVideo || 0);

                return (
                  <label
                    key={k.id}
                    className={`px-3 py-2.5 flex items-center justify-between gap-3 text-xs cursor-pointer transition-colors ${
                      alreadyInSheet
                        ? 'bg-sunken/60 opacity-65'
                        : isChecked
                          ? 'bg-accent-soft/30'
                          : 'bg-surface hover:bg-sunken/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        disabled={alreadyInSheet}
                        checked={isChecked}
                        onChange={() =>
                          setPickedKocIds((prev) =>
                            prev.includes(k.id)
                              ? prev.filter((id) => id !== k.id)
                              : [...prev, k.id]
                          )
                        }
                        className="rounded border-line shrink-0"
                      />
                      <Avatar name={k.stageName} src={k.avatarUrl} size={30} />
                      <div className="min-w-0">
                        <div className="font-semibold text-ink truncate flex items-center gap-1.5">
                          <span>{k.stageName}</span>
                          <span className="font-normal text-ink-3">@{cleanHandle}</span>
                          {alreadyInSheet && (
                            <Status tone="positive">Đã có trong Sheet</Status>
                          )}
                        </div>
                        <div className="text-2xs text-ink-3 truncate">
                          Tệp: {k.tepKenh || k.creatorCategory || 'Beauty'} · Follower:{' '}
                          {(k.followers || 0).toLocaleString('vi-VN')} · View TB:{' '}
                          {(k.avgViews || 0).toLocaleString('vi-VN')} · Nữ:{' '}
                          {k.femaleRatio ?? 75}%
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-semibold text-ink tabular-nums">
                        {kl} · {formatVnd(k.rateCardVideo || 0)}
                      </div>
                      <div className="text-2xs text-ink-3 tabular-nums">
                        GMV 30d: {formatVndShort(k.recentRevenue || 0)}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal gắn link Google Sheet cho từng Brand */}
      <Modal
        open={isGoogleSheetModalOpen}
        onClose={() => setIsGoogleSheetModalOpen(false)}
        title={`Kết nối Google Sheet cho "${activeStoreName}"`}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsGoogleSheetModalOpen(false)}>
              Đóng
            </Button>
            <Button variant="primary" icon={Check} onClick={handleSaveGoogleSheetUrl}>
              Lưu đường dẫn Google Sheet
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="URL Google Sheet làm việc với Brand">
            <Input
              value={googleSheetUrlDraft}
              onChange={(e) => setGoogleSheetUrlDraft(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
            />
          </Field>
          {currentGoogleSheetUrl && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-sunken border border-line text-xs">
              <span className="truncate text-ink-2">{currentGoogleSheetUrl}</span>
              <a
                href={currentGoogleSheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent font-medium hover:underline shrink-0 ml-2 inline-flex items-center gap-1"
              >
                Mở Sheet <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal Gửi Mail Mời Hợp Tác KOC & Quản Lý Mẫu Thư Chuẩn */}
      <KocOutreachEmailModal
        open={isOutreachModalOpen}
        onClose={() => {
          setIsOutreachModalOpen(false);
          setSingleOutreachRow(null);
        }}
        initialTab={outreachModalTab}
        targetRows={
          singleOutreachRow
            ? [rows.find((r) => r.id === singleOutreachRow.id) || singleOutreachRow]
            : selectedRowIds.length > 0
              ? displayedRows.filter((r) => selectedRowIds.includes(r.id))
              : displayedRows
        }
        allSheetRows={rows}
        sheetKey={activeSheetKey}
        activeMonth={activeMonth}
        activeStoreName={activeStoreName}
        activeStoreObj={activeStoreObj}
        allStores={b2cStores}
        allKocs={kocs}
        currentUserName={currentUserName}
        currentRole={currentRole}
        onUpdateRowFields={handleUpdateRowEmailAndStatus}
        onNotify={onNotify}
      />
    </div>
  );
};
