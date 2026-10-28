'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Columns,
  Copy,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Link2,
  Lock,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  resolveStoreStaffAssignment,
  type BookingDealItem,
  type KocItem,
  type KocListingItem,
  type ListingBatchCycle,
  type SalaryGrade,
  type StorePortfolioItem,
  type UserProfile,
  type UserRole,
} from '../../lib/types';
import { filterScopedStores } from '../../lib/rbacScope';
import { isPersonInField } from '../../lib/staffIdentity';
import { resolveBrandBookingSheetUrl } from '../../lib/bookingList';
import { formatVnd, formatVndShort } from '../../lib/format';
import {
  BRAND_CHON_OPTIONS,
  CONTENT_TAG_OPTIONS,
  DE_XUAT_UPBASE_OPTIONS,
  DOT_LISTING_OPTIONS,
  STAFF_LISTING_COLUMNS,
  STAFF_SHEET_READONLY_SYSTEM_COLUMNS,
  STAFF_SHEET_UPDATED_EVENT,
  TEP_KENH_OPTIONS,
  TRANG_THAI_OPTIONS,
  buildStaffListingRowFromKoc,
  canStaffEditSheetField,
  computeGrossFeeWithTax,
  computeListingToBrandSla,
  computeTepBookingFromNetFee,
  downloadStaffSheetCsv,
  formatStaffSheetToTsv,
  formatVnDateTime,
  getStaffSheetFieldEditPolicy,
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
  type StaffSheetRoleTier,
} from '../../lib/staffBrandListingSheet';
import {
  APPROVED_BOOKING_LIST_UPDATED_EVENT,
  buildBookingDealFromApprovedItem,
  generateBookingOrderCode,
  generateDealAppendixCode,
  generateMasterContractCode,
  recalculateApprovedBookingItem,
  saveApprovedBookingList,
  syncApprovedItemsBackToStaffBrandSheets,
  transferBrandApprovedRowsToBookingList,
} from '../../lib/approvedBookingList';
import {
  KOC_OUTREACH_EMAIL_UPDATED_EVENT,
  loadKocOutreachEmailState,
} from '../../lib/kocOutreachEmailService';
import { KocOutreachEmailModal } from './KocOutreachEmailModal';
import { ActionMenu, Avatar, Button, Field, Input, Modal, Select, Status } from '../ui';

const UI_HEADER_OVERRIDES: Partial<Record<StaffListingColumnKey, string>> = {
  ngayDien: 'TG Listing (Ngày giờ)',
  dot: 'Đợt',
  nhanSuDien: 'Nhân sự điền',
  idKenh: 'ID kênh',
  linkKenh: 'Link kênh',
  tepKenh: 'Tệp kênh',
  tenKenh: 'Tên kênh KOC',
  phiBookingKemThue: 'Phí kèm thuế TNCN',
  leaderNote: 'Ghi chú Leader',
  lyDoTuChoi: 'Lý do từ chối',
  ngayBrandDuyet: 'TG Brand duyệt',
  slaBrandDuyet: 'SLA Brand duyệt (48h)',
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
    col.header.replace(/[\u{1F383}\u{1F338}]/gu, '').replace(/\s*\(Bổ sung thêm\)/gi, '').trim()
  );
}

export interface StaffBrandListingSheetWorkspaceProps {
  kocs: KocItem[];
  stores: StorePortfolioItem[];
  deals: BookingDealItem[];
  currentUser?: UserProfile | null;
  currentUserName: string;
  currentRole?: UserRole;
  selectedMonth: string;
  onChangeMonth: (month: string) => void;
  selectedStore: string;
  onChangeStore: (storeName: string) => void;
  onSyncRowsToSystemListings?: (newItems: Partial<KocListingItem>[], store: StorePortfolioItem, batchCycle: ListingBatchCycle) => void;
  onCreateOrUpdateDeals?: (newOrUpdatedDeals: BookingDealItem[]) => void;
  onOpenDealBoard?: (context: {
    storeName: string;
    monthKey: string;
    createdDealCodes?: string[];
  }) => void;
  onOpenShortlistFilterModal?: () => void;
  onOpenSheetSetupScreen?: (tab?: 'TABLE' | 'FIELD_PERMISSIONS' | 'BULK_PASTE' | 'SERVICE_ACCOUNT') => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export interface SheetPushFieldChange {
  column: string;
  sheetValue: string;
  appValue: string;
}

export interface SheetPushRowDiff {
  rowId?: string;
  key?: string;
  handle?: string;
  kocName: string;
  action: 'ADD' | 'UPDATE' | 'SKIP';
  sheetRowNum?: number;
  matchedBy?: 'ROW_ID' | 'COMPOSITE' | 'HANDLE';
  brandDecisionOnSheet?: string;
  fieldChanges: SheetPushFieldChange[];
}

export interface SheetPullRowDiff {
  handle: string;
  kocName: string;
  action: 'UPDATE_EXISTING' | 'IMPORT_NEW' | 'UNCHANGED';
  appRowId?: string;
  sheetRowId?: string;
  matchedBy?: 'ROW_ID' | 'HANDLE';
  prevBrandDecision: string;
  brandDecisionOnSheet: string;
  brandDecisionChanged: boolean;
  isNewlyApprovedYes: boolean;
  isNewlyRejectedNo: boolean;
  isNewlyConsidering: boolean;
  listingTime: string;
  brandReviewTime: string;
  slaStatus: 'ON_TIME' | 'OVERDUE' | 'WAITING' | 'WAITING_OVERDUE';
  slaLabel: string;
  slaElapsedHours: number | null;
  sanPham: string;
  netFee: number;
  lyDoTuChoi: string;
  existingMaBooking: string;
  sheetPatch: Partial<StaffListingSheetRow>;
  fieldChanges: { label: string; appValue: string; sheetValue: string }[];
}

export interface PullBrandReviewSummary {
  newlyApprovedCount: number;
  newlyApprovedNetBudget: number;
  totalApprovedOnSheetCount: number;
  newlyRejectedCount: number;
  newlyConsideringCount: number;
  pendingOnSheetCount: number;
  reviewedWithSlaCount: number;
  onTimeSlaCount: number;
  overdueSlaCount: number;
  avgReviewHours: number;
  readyForDealCreationCount: number;
}

export interface CreateDealDraftRow {
  rowId: string;
  selected: boolean;
  maBooking: string;
  isExistingBo: boolean;
  idKenh: string;
  tenKenh: string;
  tepKenh: string;
  dot: string;
  sanPham: string;
  giaNetVideo: number;
  giaChotCuoi: number;
  ngayAirChot: string;
  nhanSuDien: string;
  ngayDien: string;
  ngayBrandDuyet: string;
  slaBrandDuyet: string;
}

export interface SheetTabDetailItem {
  sheetId: number;
  title: string;
  hidden: boolean;
  index: number;
}

const MONTH_OPTIONS = ['2026/11', '2026/10', '2026/09', '2026/08'];

const FILL_MODE_BADGE: Record<
  'AUTO_SYSTEM' | 'FORMULA' | 'MANUAL_STAFF',
  { label: string; className: string }
> = {
  AUTO_SYSTEM: {
    label: 'Tự động',
    className: 'bg-sunken text-ink-3 border-line',
  },
  FORMULA: {
    label: 'Công thức',
    className: 'bg-accent-soft text-accent border-accent/25',
  },
  MANUAL_STAFF: {
    label: 'NV điền',
    className: 'bg-surface text-ink border-line-strong',
  },
};

export const StaffBrandListingSheetWorkspace: React.FC<
  StaffBrandListingSheetWorkspaceProps
> = ({
  kocs,
  stores,
  deals,
  currentUser,
  currentUserName,
  currentRole,
  selectedMonth,
  onChangeMonth,
  selectedStore,
  onChangeStore,
  onSyncRowsToSystemListings,
  onCreateOrUpdateDeals,
  onOpenDealBoard,
  onOpenShortlistFilterModal,
  onOpenSheetSetupScreen,
  onNotify,
}) => {
  const [storeOverrides, setStoreOverrides] = useState<Record<string, Partial<StorePortfolioItem>>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem('upbase_store_overrides_v1');
      return raw ? (JSON.parse(raw) as Record<string, Partial<StorePortfolioItem>>) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const onOverrideUpdated = () => {
      try {
        const raw = window.localStorage.getItem('upbase_store_overrides_v1');
        setStoreOverrides(raw ? (JSON.parse(raw) as Record<string, Partial<StorePortfolioItem>>) : {});
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('upbase:store-overrides-updated', onOverrideUpdated);
    return () => window.removeEventListener('upbase:store-overrides-updated', onOverrideUpdated);
  }, []);

  const b2cStores = useMemo(() => {
    const mergedAll = stores
      .filter((s) => s.isB2cManaged !== false && s.storeName)
      .map((s) => {
        const ov = storeOverrides[s.id];
        if (!ov) return s;
        // Chỉ lấy thông tin Link Google Sheet / Tab / Link gian hàng từ storeOverrides;
        // dữ liệu phân quyền nhân sự (PIC chính, Nhân viên hỗ trợ, Leader) lấy 100% từ Phân quyền theo gian trên hệ thống
        return {
          ...s,
          ...(ov.bookingSheetUrl !== undefined ? { bookingSheetUrl: ov.bookingSheetUrl } : {}),
          ...(ov.defaultSheetTab !== undefined ? { defaultSheetTab: ov.defaultSheetTab } : {}),
          ...(ov.storeUrl !== undefined ? { storeUrl: ov.storeUrl } : {}),
        };
      });
    if (currentUser) {
      const scoped = filterScopedStores(mergedAll, currentUser);
      if (scoped.length > 0) return scoped;
    }
    return mergedAll;
  }, [stores, storeOverrides, currentUser]);

  const activeMonth = selectedMonth === 'ALL' ? '2026/10' : selectedMonth;
  const isStoreValid = b2cStores.some((s) => s.storeName === selectedStore);
  const activeStoreName = useMemo(() => {
    if (selectedStore && selectedStore !== 'ALL') {
      if (isStoreValid) return selectedStore;
      // Tìm gian hàng tương đương nếu tên cũ hoặc tên lệch (ví dụ 'Kutieskin' -> 'Kutieskin Mama_TikTok_E2E-S')
      const lower = selectedStore.toLowerCase();
      const matched = b2cStores.find((s) => {
        const sLower = s.storeName.toLowerCase();
        const bLower = (s.brandName || '').toLowerCase();
        return (
          sLower.includes(lower) ||
          lower.includes(sLower) ||
          (bLower && lower.includes(bLower)) ||
          (bLower && bLower.includes(lower.split(/[\s-_]/)[0]))
        );
      });
      if (matched) return matched.storeName;
    }
    return b2cStores[0]?.storeName || '';
  }, [selectedStore, isStoreValid, b2cStores]);

  // Đồng bộ lại với component cha nếu selectedStore ban đầu không hợp lệ trong b2cStores
  useEffect(() => {
    if (selectedStore && selectedStore !== 'ALL' && activeStoreName && selectedStore !== activeStoreName) {
      onChangeStore(activeStoreName);
    }
  }, [selectedStore, activeStoreName, onChangeStore]);

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

  // Mặc định mở bộ cột GĐ 1: Bản gửi Brand + hiển thị luôn Thời gian Listing, Thời gian Brand duyệt & SLA Brand duyệt
  const [activeColumnPreset, setActiveColumnPreset] = useState<
    'BRAND_WORKING_FILE' | 'ACCEPTANCE_FILE_32' | 'ALL_48' | 'LARK_BASE'
  >('BRAND_WORKING_FILE');
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<StaffListingColumnKey[]>(() =>
    Array.from(
      new Set<StaffListingColumnKey>([
        'ngayDien',
        ...STAFF_LISTING_COLUMNS.filter((c) => c.inBrandWorkingFile).map((c) => c.key),
        'ngayBrandDuyet',
        'slaBrandDuyet',
      ])
    )
  );
  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);

  const visibleColumns = useMemo(() => {
    const set = new Set(visibleColumnKeys);
    const base = STAFF_LISTING_COLUMNS.filter(
      (c) => set.has(c.key) && c.key !== 'ngayBrandDuyet' && c.key !== 'slaBrandDuyet'
    );
    const slaCols = STAFF_LISTING_COLUMNS.filter(
      (c) => (c.key === 'ngayBrandDuyet' || c.key === 'slaBrandDuyet') && set.has(c.key)
    );
    if (slaCols.length === 0) return base;
    const insertIdx = base.findIndex(
      (c) => c.key === 'lyDoTuChoi' || c.key === 'brandChon'
    );
    if (insertIdx === -1) return [...base, ...slaCols];
    // Nếu có cả brandChon và lyDoTuChoi thì đặt ngay sau lyDoTuChoi
    const afterLyDo = base.findIndex((c) => c.key === 'lyDoTuChoi');
    const targetPos = afterLyDo !== -1 ? afterLyDo + 1 : insertIdx + 1;
    return [
      ...base.slice(0, targetPos),
      ...slaCols,
      ...base.slice(targetPos),
    ];
  }, [visibleColumnKeys]);

  const toggleColumnKey = (key: StaffListingColumnKey) => {
    setVisibleColumnKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const applyColumnPreset = (
    preset: 'ALL_48' | 'BRAND_WORKING_FILE' | 'LARK_BASE' | 'ACCEPTANCE_FILE_32'
  ) => {
    setActiveColumnPreset(preset);
    if (preset === 'ALL_48') {
      setVisibleColumnKeys(STAFF_LISTING_COLUMNS.map((c) => c.key));
    } else if (preset === 'BRAND_WORKING_FILE') {
      setVisibleColumnKeys(
        Array.from(
          new Set<StaffListingColumnKey>([
            'ngayDien',
            ...STAFF_LISTING_COLUMNS.filter((c) => c.inBrandWorkingFile).map((c) => c.key),
            'ngayBrandDuyet',
            'slaBrandDuyet',
          ])
        )
      );
    } else if (preset === 'ACCEPTANCE_FILE_32') {
      const coreKeys: StaffListingColumnKey[] = [
        'ngayDien',
        'dot',
        'nhanSuDien',
        'idKenh',
        'tenKenh',
        'sanPham',
        'giaNetVideo',
        'brandChon',
        'ngayBrandDuyet',
        'slaBrandDuyet',
      ];
      const acceptanceKeys = STAFF_LISTING_COLUMNS.filter(
        (c) => c.group === 'Chốt Book & Nghiệm thu (File 3.2)'
      ).map((c) => c.key);
      setVisibleColumnKeys(Array.from(new Set([...coreKeys, ...acceptanceKeys])));
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
  const [filterNhanSu, setFilterNhanSu] = useState<string>('ALL');
  const [appSortBy, setAppSortBy] = useState<'DEFAULT' | 'PRODUCT' | 'STAFF' | 'BATCH' | 'BRAND_DECISION'>('DEFAULT');
  const [rowSearchQuery, setRowSearchQuery] = useState<string>('');
  const [isGoogleSheetModalOpen, setIsGoogleSheetModalOpen] = useState(false);
  const [googleSheetUrlDraft, setGoogleSheetUrlDraft] = useState('');
  const [isSheetTemplateModalOpen, setIsSheetTemplateModalOpen] = useState(false);
  const [sheetTabsDetail, setSheetTabsDetail] = useState<SheetTabDetailItem[]>([]);
  const [sheetTemplateActiveTab, setSheetTemplateActiveTab] = useState('');
  const [sheetColumnPresetMode, setSheetColumnPresetMode] = useState<'BRAND_REVIEW' | 'AIR_ACCEPTANCE' | 'FULL_TEMPLATE'>('BRAND_REVIEW');
  const [sheetTemplateBusy, setSheetTemplateBusy] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Phân quyền lấy trực tiếp từ dữ liệu Phân công Gian hàng trên hệ thống (1 PIC Chính + Nhân viên hỗ trợ + Leader)
  const storeAssignment = useMemo(
    () =>
      activeStoreObj
        ? resolveStoreStaffAssignment(activeStoreObj, '')
        : { primaryPic: '', supportStaff: [], allOwners: [] },
    [activeStoreObj]
  );
  const storeLeaderName = useMemo(
    () =>
      activeStoreObj?.hasBookingLeader && activeStoreObj?.bookingLeader
        ? activeStoreObj.bookingLeader.trim()
        : '',
    [activeStoreObj]
  );
  const identityUser = useMemo(
    () =>
      currentUser || {
        id: '',
        name: currentUserName,
      },
    [currentUser, currentUserName]
  );
  const isAdminOrManager =
    !currentRole ||
    currentRole === 'ADMIN' ||
    currentRole === 'MANAGER';
  const isStoreLeader =
    currentRole === 'LEADER' ||
    Boolean(
      storeLeaderName &&
        isPersonInField(identityUser, storeLeaderName, activeStoreObj?.staffCodes)
    );
  const isPrimaryPic = Boolean(
    storeAssignment.primaryPic &&
      isPersonInField(identityUser, storeAssignment.primaryPic, activeStoreObj?.staffCodes)
  );
  const isSupportStaff = storeAssignment.supportStaff.some((s) =>
    isPersonInField(identityUser, s, activeStoreObj?.staffCodes)
  );
  const fieldEditPolicy = useMemo(
    () => getStaffSheetFieldEditPolicy(collection),
    [collection]
  );
  const currentRoleTier: StaffSheetRoleTier = useMemo(() => {
    if (isAdminOrManager) return 'ADMIN';
    if (isStoreLeader) return 'LEADER';
    if (isPrimaryPic || !storeAssignment.primaryPic) return 'PRIMARY_PIC';
    return 'SUPPORT';
  }, [isAdminOrManager, isStoreLeader, isPrimaryPic, storeAssignment.primaryPic]);

  const canManageAllRows =
    isAdminOrManager ||
    isStoreLeader ||
    isPrimaryPic ||
    !storeAssignment.primaryPic ||
    (isSupportStaff && fieldEditPolicy.supportRowScope === 'ALL_STORE_ROWS');

  const canPushToGoogleSheet =
    isAdminOrManager ||
    isStoreLeader ||
    isPrimaryPic ||
    !storeAssignment.primaryPic ||
    (isSupportStaff && fieldEditPolicy.allowSupportPushToSheet);

  const canEditRow = (row: StaffListingSheetRow): boolean => {
    if (canManageAllRows) return true;
    const owner = (row.nhanSuDien || '').trim().toLowerCase();
    return !owner || owner === currentUserName.trim().toLowerCase();
  };

  const canEditCell = (
    row: StaffListingSheetRow,
    colKey: StaffListingColumnKey
  ): { allowed: boolean; reason?: string } => {
    const owner = (row.nhanSuDien || '').trim().toLowerCase();
    const isOwnRow = !owner || owner === currentUserName.trim().toLowerCase();
    return canStaffEditSheetField({
      policy: fieldEditPolicy,
      roleTier: currentRoleTier,
      colKey,
      isOwnRow,
      isBrandApproved: row.brandChon === 'Yes',
    });
  };

  const isColumnAllowedForCurrentUser = (colKey: StaffListingColumnKey): boolean => {
    if (STAFF_SHEET_READONLY_SYSTEM_COLUMNS.includes(colKey)) return false;
    if (currentRoleTier === 'ADMIN') return true;
    return (fieldEditPolicy.editableFieldsByRole[currentRoleTier] || []).includes(colKey);
  };

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

  const currentGoogleSheetUrl = useMemo(() => {
    return (
      activeStoreObj?.bookingSheetUrl ||
      collection.googleSheetUrls[activeStoreName] ||
      resolveBrandBookingSheetUrl(activeStoreObj?.brandName, activeStoreName, activeStoreObj) ||
      ''
    ).trim();
  }, [activeStoreObj, collection.googleSheetUrls, activeStoreName]);

  const defaultGoogleSheetTab = useMemo(() => {
    return (activeStoreObj?.defaultSheetTab || `Listing ${activeMonth.replace('/', '-')}`).trim();
  }, [activeStoreObj, activeMonth]);

  // Danh sách nhân sự đã điền trong Sheet hiện tại
  const staffInSheetOptions = useMemo(() => {
    const set = new Set<string>();
    if (storeAssignment.primaryPic) set.add(storeAssignment.primaryPic);
    storeAssignment.supportStaff.forEach((s) => set.add(s));
    rows.forEach((r) => {
      if (r.nhanSuDien && r.nhanSuDien.trim()) set.add(r.nhanSuDien.trim());
    });
    return Array.from(set);
  }, [rows, storeAssignment]);

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

  // Lọc và sắp xếp dòng hiển thị trên Sheet
  const displayedRows = useMemo(() => {
    const q = rowSearchQuery.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (filterDot !== 'ALL' && r.dot !== filterDot) return false;
      if (filterBrandChon !== 'ALL' && r.brandChon !== filterBrandChon) return false;
      if (filterNhanSu === 'MINE') {
        if ((r.nhanSuDien || '').trim().toLowerCase() !== currentUserName.trim().toLowerCase()) {
          return false;
        }
      } else if (filterNhanSu !== 'ALL') {
        if ((r.nhanSuDien || '').trim().toLowerCase() !== filterNhanSu.trim().toLowerCase()) {
          return false;
        }
      }
      if (q) {
        const hit =
          r.idKenh.toLowerCase().includes(q) ||
          r.tenKenh.toLowerCase().includes(q) ||
          r.sanPham.toLowerCase().includes(q) ||
          r.tepKenh.toLowerCase().includes(q) ||
          r.contentNote.toLowerCase().includes(q) ||
          (r.nhanSuDien || '').toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });

    if (appSortBy === 'DEFAULT') return filtered;
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (appSortBy === 'PRODUCT') {
        const c = (a.sanPham || '').localeCompare(b.sanPham || '', 'vi');
        return c !== 0 ? c : (a.nhanSuDien || '').localeCompare(b.nhanSuDien || '', 'vi');
      }
      if (appSortBy === 'STAFF') {
        const c = (a.nhanSuDien || '').localeCompare(b.nhanSuDien || '', 'vi');
        return c !== 0 ? c : (a.sanPham || '').localeCompare(b.sanPham || '', 'vi');
      }
      if (appSortBy === 'BATCH') {
        const c = (a.dot || '').localeCompare(b.dot || '', 'vi');
        return c !== 0 ? c : (a.sanPham || '').localeCompare(b.sanPham || '', 'vi');
      }
      if (appSortBy === 'BRAND_DECISION') {
        const rank = (v: string) => (v === 'Yes' ? 0 : v === 'Cân nhắc' ? 1 : v === 'No' ? 2 : 3);
        const c = rank(a.brandChon) - rank(b.brandChon);
        return c !== 0 ? c : (a.sanPham || '').localeCompare(b.sanPham || '', 'vi');
      }
      return 0;
    });
    return sorted;
  }, [rows, filterDot, filterBrandChon, filterNhanSu, currentUserName, rowSearchQuery, appSortBy]);

  // Thống kê nhanh của Sheet Brand hiện tại + Đo lường SLA Brand duyệt
  const sheetStats = useMemo(() => {
    const totalCount = rows.length;
    const totalNet = rows.reduce((s, r) => s + (Number(r.giaNetVideo) || 0), 0);
    const totalGross = rows.reduce((s, r) => s + (Number(r.phiBookingKemThue) || 0), 0);
    const brandApprovedCount = rows.filter((r) => r.brandChon === 'Yes').length;
    const mustHaveCount = rows.filter((r) => r.deXuatUpBase === 'Must Have').length;

    let reviewedCount = 0;
    let onTimeCount = 0;
    let totalReviewHours = 0;
    let overdueWaitCount = 0;

    for (const r of rows) {
      const sla = computeListingToBrandSla({
        ngayDien: r.ngayDien,
        createdAt: r.createdAt,
        brandChon: r.brandChon,
        ngayBrandDuyet: r.ngayBrandDuyet,
        brandReviewedAt: r.brandReviewedAt,
      });
      if (sla.status === 'ON_TIME' || sla.status === 'OVERDUE') {
        reviewedCount++;
        if (sla.status === 'ON_TIME') onTimeCount++;
        if (sla.elapsedHours !== null) totalReviewHours += sla.elapsedHours;
      } else if (sla.status === 'WAITING_OVERDUE') {
        overdueWaitCount++;
      }
    }

    const avgReviewHours =
      reviewedCount === 0 ? 0 : Math.round((totalReviewHours / reviewedCount) * 10) / 10;
    const readyToCreateDealsCount = rows.filter(
      (r) => r.brandChon === 'Yes' && !r.maBooking
    ).length;
    const alreadyCreatedDealsCount = rows.filter(
      (r) => r.brandChon === 'Yes' && Boolean(r.maBooking)
    ).length;

    return {
      totalCount,
      totalNet,
      totalGross,
      brandApprovedCount,
      mustHaveCount,
      reviewedCount,
      onTimeCount,
      avgReviewHours,
      overdueWaitCount,
      readyToCreateDealsCount,
      alreadyCreatedDealsCount,
    };
  }, [rows]);

  // Cập nhật 1 ô trên bảng (kiểm tra quyền dòng + quyền sửa trường theo cấu hình của Admin)
  const handleCellChange = (
    rowId: string,
    key: StaffListingColumnKey,
    value: string | number
  ) => {
    const targetRowCheck = rows.find((r) => r.id === rowId);
    if (targetRowCheck) {
      const check = canEditCell(targetRowCheck, key);
      if (!check.allowed) {
        onNotify?.(
          check.reason ||
            `Bạn chưa được cấp quyền sửa trường này. Liên hệ Quản trị viên để mở quyền trên màn Thiết lập Google Sheet & Phân quyền Sửa Trường.`,
          'warning'
        );
        return;
      }
    }
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
        const brandDecisionChanged =
          key === 'brandChon' && String(value) !== String(r.brandChon || '');
        const updated = recalculateStaffListingRow(
          { ...r, [key]: value },
          {
            preserveIdKenhInput: key === 'idKenh',
            forceRefreshBrandTimestamp: brandDecisionChanged,
          }
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

  // Chuẩn hóa ID kênh và tự động điền thông tin từ Danh bạ KOC khi rời ô nhập (đóng dấu ngày giờ Listing)
  const handleIdKenhBlur = (rowId: string) => {
    updateActiveSheetRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const clean = normalizeTikTokId(String(r.idKenh || '')).toLowerCase();
        const matchedKoc = clean
          ? kocs.find((k) => normalizeTikTokId(k.channelId).toLowerCase() === clean)
          : undefined;
        const wasBlank = !r.kocId && !r.tenKenh;
        const nowIso = new Date().toISOString();
        const nowFormatted = formatVnDateTime(new Date());
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
          return recalculateStaffListingRow({
            ...autoRow,
            id: r.id,
            ngayDien: wasBlank ? nowFormatted : r.ngayDien || autoRow.ngayDien,
            createdAt: wasBlank ? nowIso : r.createdAt || autoRow.createdAt,
          });
        }
        return recalculateStaffListingRow({
          ...r,
          ...(wasBlank && clean
            ? { ngayDien: nowFormatted, createdAt: nowIso }
            : {}),
        });
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

  // Xóa các dòng đã chọn (kiểm tra phân quyền PIC chính / Booking Support)
  const handleDeleteSelectedRows = () => {
    if (selectedRowIds.length === 0) return;
    const selectedSet = new Set(selectedRowIds);
    const selectedRows = rows.filter((r) => selectedSet.has(r.id));
    const forbiddenRows = selectedRows.filter((r) => !canEditRow(r));
    if (forbiddenRows.length > 0) {
      onNotify?.(
        `Có ${forbiddenRows.length} dòng do nhân sự khác điền. Booking Support chỉ được xóa dòng do mình thêm.`,
        'warning'
      );
      return;
    }
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
        ? STAFF_LISTING_COLUMNS.filter((c) => c.index <= 48)
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
        expectedAirDate: r.ngayAirPlan || undefined,
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

  // =========================================================================
  // KẾT NỐI 2 CHIỀU VỚI GOOGLE SHEET KÈM BÁO CÁO ĐỐI SOÁT 2 BÊN (DRY-RUN)
  // =========================================================================
  const [isPushSheetModalOpen, setIsPushSheetModalOpen] = useState(false);
  const [pushScope, setPushScope] = useState<'SELECTED_ONLY' | 'ALL_ROWS'>('ALL_ROWS');
  const [pushColMode, setPushColMode] = useState<'BRAND_WORKING_32' | 'ALL_VISIBLE'>('BRAND_WORKING_32');
  const [pushSheetUrl, setPushSheetUrl] = useState('');
  const [pushSheetTab, setPushSheetTab] = useState('');
  const [availableSheetTabs, setAvailableSheetTabs] = useState<string[]>([]);
  const [loadingSheetTabs, setLoadingSheetTabs] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushDiffReport, setPushDiffReport] = useState<{
    added: number;
    updated: number;
    skipped: number;
    totalInSheet: number;
    diffs: SheetPushRowDiff[];
  } | null>(null);

  const [isPullSheetModalOpen, setIsPullSheetModalOpen] = useState(false);
  const [pullSheetUrl, setPullSheetUrl] = useState('');
  const [pullSheetTab, setPullSheetTab] = useState('');
  const [pullBusy, setPullBusy] = useState(false);
  const [pullDiffReport, setPullDiffReport] = useState<{
    diffs: SheetPullRowDiff[];
    notOnSheetHandles: string[];
    totalSheetRows: number;
    brandSummary: PullBrandReviewSummary;
  } | null>(null);
  const [selectedPullHandles, setSelectedPullHandles] = useState<string[]>([]);
  const [pullReportFilter, setPullReportFilter] = useState<
    'ALL' | 'NEW_APPROVED_YES' | 'BRAND_CHANGED' | 'ALL_CHANGED'
  >('ALL');

  // Hộp thoại Tạo các Deal từ KOC Brand đã duyệt & Chuyển sang Bảng Deal
  const [isCreateDealsModalOpen, setIsCreateDealsModalOpen] = useState(false);
  const [dealDrafts, setDealDrafts] = useState<CreateDealDraftRow[]>([]);

  const fetchTabsForSheetUrl = async (
    url: string,
    currentTab: string,
    onPickTab: (tab: string) => void
  ) => {
    const cleanUrl = url.trim();
    if (!cleanUrl) return;
    setLoadingSheetTabs(true);
    try {
      const res = await fetch(
        `/api/booking-list/push-sheet?sheetUrl=${encodeURIComponent(cleanUrl)}`,
        { cache: 'no-store' }
      );
      const data = (await res.json().catch(() => null)) as {
        tabs?: string[];
        tabsDetail?: SheetTabDetailItem[];
        error?: string;
      } | null;
      if (res.ok && Array.isArray(data?.tabs)) {
        setAvailableSheetTabs(data.tabs);
        if (Array.isArray(data.tabsDetail)) {
          setSheetTabsDetail(data.tabsDetail);
        }
        if (data.tabs.length > 0 && (!currentTab || !data.tabs.includes(currentTab))) {
          onPickTab(data.tabs[0]);
        }
      } else if (data?.error) {
        onNotify?.(data.error, 'warning');
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingSheetTabs(false);
    }
  };

  const getTargetRowsForPush = (scope: 'SELECTED_ONLY' | 'ALL_ROWS'): StaffListingSheetRow[] => {
    if (scope === 'SELECTED_ONLY') {
      const selSet = new Set(selectedRowIds);
      return displayedRows.filter((r) => selSet.has(r.id));
    }
    return displayedRows;
  };

  const getColsForPush = (mode: 'BRAND_WORKING_32' | 'ALL_VISIBLE'): StaffListingColumnMeta[] => {
    if (mode === 'BRAND_WORKING_32') {
      return STAFF_LISTING_COLUMNS.filter((c) => c.inBrandWorkingFile);
    }
    return visibleColumns;
  };

  // Luôn đính kèm cột kỹ thuật "Mã dòng (Row ID)" để Google Sheet nhận diện chính xác 1-1 từng dòng
  // kể cả khi người dùng Sort bảng trên Google Sheet theo Sản phẩm / Nhân sự hoặc 1 KOC làm nhiều sản phẩm
  const buildMatrixForPush = (
    targetRows: StaffListingSheetRow[],
    cols: StaffListingColumnMeta[]
  ): { columns: string[]; rows: string[][] } => {
    const columns = [...cols.map((c) => getDisplayHeader(c)), 'Mã dòng (Row ID)'];
    const matrix = targetRows.map((row) => [
      ...cols.map((col) => {
        const val = row[col.key];
        if (val === undefined || val === null) return '';
        return String(val);
      }),
      row.id,
    ]);
    return { columns, rows: matrix };
  };

  const handleRunPushDiffPreview = async (
    overrideUrl?: string,
    overrideTab?: string,
    overrideScope?: 'SELECTED_ONLY' | 'ALL_ROWS',
    overrideColMode?: 'BRAND_WORKING_32' | 'ALL_VISIBLE'
  ) => {
    const urlToUse = (overrideUrl ?? pushSheetUrl).trim();
    const tabToUse = (overrideTab ?? pushSheetTab).trim() || defaultGoogleSheetTab;
    const scopeToUse = overrideScope ?? pushScope;
    const colModeToUse = overrideColMode ?? pushColMode;

    if (!urlToUse) {
      onNotify?.('Vui lòng nhập hoặc gắn Link Google Sheet của gian hàng trước khi đối soát.', 'warning');
      return;
    }
    const targetRows = getTargetRowsForPush(scopeToUse);
    if (targetRows.length === 0) {
      onNotify?.(
        scopeToUse === 'SELECTED_ONLY'
          ? 'Chưa có dòng nào được tích chọn. Vui lòng tích chọn ít nhất 1 dòng hoặc chuyển sang "Đẩy cả bảng".'
          : 'Bảng hiện tại chưa có dòng KOC nào để đẩy lên Google Sheet.',
        'warning'
      );
      return;
    }

    setPushBusy(true);
    setPushDiffReport(null);
    try {
      const cols = getColsForPush(colModeToUse);
      const { columns, rows: matrixRows } = buildMatrixForPush(targetRows, cols);
      const res = await fetch('/api/booking-list/push-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: activeSheetKey,
          sheetUrl: urlToUse,
          tab: tabToUse,
          columns,
          rows: matrixRows,
          dryRun: true,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        onNotify?.(body?.error || `Lỗi đối soát Google Sheet (${res.status})`, 'error');
        return;
      }
      setPushDiffReport({
        added: body.added || 0,
        updated: body.updated || 0,
        skipped: body.skipped || 0,
        totalInSheet: body.totalInSheet || 0,
        diffs: Array.isArray(body.diffs) ? body.diffs : [],
      });
    } catch (err) {
      onNotify?.(
        err instanceof Error ? err.message : 'Không kết nối được Google Sheet để đối soát.',
        'error'
      );
    } finally {
      setPushBusy(false);
    }
  };

  const handleOpenPushSheetModal = () => {
    const initialScope: 'SELECTED_ONLY' | 'ALL_ROWS' =
      selectedRowIds.length > 0 ? 'SELECTED_ONLY' : 'ALL_ROWS';
    const initialUrl = currentGoogleSheetUrl;
    const initialTab = defaultGoogleSheetTab;
    setPushScope(initialScope);
    setPushSheetUrl(initialUrl);
    setPushSheetTab(initialTab);
    setPushDiffReport(null);
    setIsPushSheetModalOpen(true);
    if (initialUrl) {
      void fetchTabsForSheetUrl(initialUrl, initialTab, (t) => setPushSheetTab(t));
      void handleRunPushDiffPreview(initialUrl, initialTab, initialScope, pushColMode);
    }
  };

  const handleConfirmPushSheet = async () => {
    if (!canPushToGoogleSheet) {
      onNotify?.(
        `Chỉ PIC chính (${storeAssignment.primaryPic}) hoặc Quản trị viên mới có quyền xác nhận ghi dữ liệu lên Google Sheet.`,
        'warning'
      );
      return;
    }
    const urlToUse = pushSheetUrl.trim();
    const tabToUse = pushSheetTab.trim() || defaultGoogleSheetTab;
    const targetRows = getTargetRowsForPush(pushScope);
    if (!urlToUse || targetRows.length === 0) return;

    setPushBusy(true);
    try {
      const cols = getColsForPush(pushColMode);
      const { columns, rows: matrixRows } = buildMatrixForPush(targetRows, cols);
      const res = await fetch('/api/booking-list/push-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: activeSheetKey,
          sheetUrl: urlToUse,
          tab: tabToUse,
          columns,
          rows: matrixRows,
          dryRun: false,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        onNotify?.(body?.error || `Lỗi ghi Google Sheet (${res.status})`, 'error');
        return;
      }
      setIsPushSheetModalOpen(false);
      setPushDiffReport(null);
      onNotify?.(
        `Đã đẩy lên Google Sheet thành công: thêm mới ${body.added || 0} dòng, cập nhật ${body.updated || 0} dòng, giữ nguyên ${body.skipped || 0} dòng.`,
        'success'
      );
    } catch (err) {
      onNotify?.(
        err instanceof Error ? err.message : 'Không đẩy được dữ liệu lên Google Sheet.',
        'error'
      );
    } finally {
      setPushBusy(false);
    }
  };

  // Đọc & so sánh dữ liệu từ Google Sheet trước khi kéo về bảng App
  const handleRunPullDiffPreview = async (overrideUrl?: string, overrideTab?: string) => {
    const urlToUse = (overrideUrl ?? pullSheetUrl).trim();
    const tabToUse = (overrideTab ?? pullSheetTab).trim() || defaultGoogleSheetTab;
    if (!urlToUse) {
      onNotify?.('Vui lòng nhập hoặc gắn Link Google Sheet của gian hàng trước khi kéo dữ liệu.', 'warning');
      return;
    }
    setPullBusy(true);
    setPullDiffReport(null);
    try {
      const res = await fetch('/api/booking-list/pull-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: activeSheetKey,
          sheetUrl: urlToUse,
          tab: tabToUse,
          dryRun: true,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        onNotify?.(body?.error || `Lỗi đọc Google Sheet (${res.status})`, 'error');
        return;
      }

      const sheetRows: Record<string, string>[] = Array.isArray(body?.sheetRows)
        ? body.sheetRows
        : [];

      const pickSheetCol = (r: Record<string, string>, names: string[]): string => {
        const keys = Object.keys(r);
        for (const n of names) {
          const target = n.toLowerCase().trim();
          const found = keys.find(
            (k) =>
              k
                .replace(/[\u{1F383}\u{1F338}]/gu, '')
                .replace(/\s*\(bổ sung thêm\)/gi, '')
                .trim()
                .toLowerCase() === target || k.trim().toLowerCase() === target
          );
          if (found && r[found] !== undefined) return String(r[found]).trim();
        }
        return '';
      };

      const appByRowId = new Map<string, StaffListingSheetRow>();
      const appByHandle = new Map<string, StaffListingSheetRow>();
      for (const r of rows) {
        if (r.id) appByRowId.set(r.id, r);
        const h = normalizeTikTokId(r.idKenh).toLowerCase();
        if (h && !appByHandle.has(h)) appByHandle.set(h, r);
      }

      const seenHandlesOnSheet = new Set<string>();
      const diffs: SheetPullRowDiff[] = [];

      for (const sr of sheetRows) {
        const sheetRowId = pickSheetCol(sr, [
          'mã dòng (row id)',
          'mã dòng',
          'row id',
          'rowid',
        ]);
        const rawId = pickSheetCol(sr, ['id kênh', '🎃id kênh', 'id kenh', 'mã koc', 'koc']);
        const cleanHandle = normalizeTikTokId(rawId);
        const lowerH = cleanHandle.toLowerCase();
        if (!lowerH && !sheetRowId) continue;
        if (lowerH) seenHandlesOnSheet.add(lowerH);

        const rawBrand = pickSheetCol(sr, ['brand chọn', 'brand chon', 'kết quả brand', 'trạng thái brand']);
        const normBrand =
          /^(yes|duyệt|duyet|đồng ý|ok|approve|approved|1|true|chọn)$/i.test(rawBrand)
            ? 'Yes'
            : /^(no|từ chối|tu choi|loại|reject|rejected|0|false|không)$/i.test(rawBrand)
              ? 'No'
              : /^(cân nhắc|can nhac|pending|xem xét|considering|hold)$/i.test(rawBrand)
                ? 'Cân nhắc'
                : rawBrand;

        const sheetTenKenh = pickSheetCol(sr, ['tên kênh koc', 'tên kênh', 'ten kenh']);
        const sheetLyDo = pickSheetCol(sr, ['lý do từ chối', 'ly do tu choi', 'phản hồi brand']);
        const sheetLeaderNote = pickSheetCol(sr, ['ghi chú leader', 'leader note']);
        const sheetSanPham = pickSheetCol(sr, ['sản phẩm', 'san pham']);
        const sheetContentNote = pickSheetCol(sr, ['content note']);
        const sheetDeXuat = pickSheetCol(sr, ['đề xuất từ upbase', 'đề xuất upbase']);
        const sheetGiaNetRaw = pickSheetCol(sr, ['giá net video', 'gia net video', 'đơn giá']);
        const sheetGiaNet = Number(sheetGiaNetRaw.replace(/[^\d]/g, '')) || 0;
        const sheetNgayAirPlan = pickSheetCol(sr, ['ngày air (plan)', 'ngay air plan']);
        const sheetLinkNghiemThu = pickSheetCol(sr, ['link nghiệm thu', 'link air nghiệm thu']);
        const sheetNgayBrandDuyet = pickSheetCol(sr, [
          'tg brand duyệt',
          'thời gian brand duyệt',
          'ngày brand duyệt',
          'ngay brand duyet',
        ]);

        // Ưu tiên 1: Khớp chính xác theo Row ID (kể cả khi Sheet bị Sort theo Sản phẩm / Nhân sự)
        // Ưu tiên 2: Khớp theo ID kênh
        const byRowId = sheetRowId ? appByRowId.get(sheetRowId) : undefined;
        const existingAppRow = byRowId || (lowerH ? appByHandle.get(lowerH) : undefined);
        const matchedBy: 'ROW_ID' | 'HANDLE' = byRowId ? 'ROW_ID' : 'HANDLE';

        if (existingAppRow) {
          const fieldChanges: { label: string; appValue: string; sheetValue: string }[] = [];
          const sheetPatch: Partial<StaffListingSheetRow> = {};
          const prevBrandDecision = existingAppRow.brandChon || '';
          const brandDecisionChanged = Boolean(normBrand && normBrand !== prevBrandDecision);
          const isNewlyApprovedYes = normBrand === 'Yes' && prevBrandDecision !== 'Yes';
          const isNewlyRejectedNo = normBrand === 'No' && prevBrandDecision !== 'No';
          const isNewlyConsidering = normBrand === 'Cân nhắc' && prevBrandDecision !== 'Cân nhắc';
          const effectiveReviewTime =
            normBrand === 'Yes' || normBrand === 'No' || normBrand === 'Cân nhắc'
              ? sheetNgayBrandDuyet ||
                (brandDecisionChanged
                  ? formatVnDateTime(new Date())
                  : existingAppRow.ngayBrandDuyet || formatVnDateTime(new Date()))
              : '';

          if (brandDecisionChanged) {
            fieldChanges.push({
              label: 'Brand chọn',
              appValue: prevBrandDecision || 'Chờ duyệt',
              sheetValue: `${normBrand}${effectiveReviewTime ? ` (${effectiveReviewTime})` : ''}`,
            });
            sheetPatch.brandChon = normBrand;
            if (normBrand === 'Yes' || normBrand === 'No' || normBrand === 'Cân nhắc') {
              sheetPatch.ngayBrandDuyet = effectiveReviewTime;
              sheetPatch.brandReviewedAt = new Date().toISOString();
            }
          } else if (
            sheetNgayBrandDuyet &&
            sheetNgayBrandDuyet !== (existingAppRow.ngayBrandDuyet || '')
          ) {
            sheetPatch.ngayBrandDuyet = sheetNgayBrandDuyet;
          }
          if (sheetLyDo && sheetLyDo !== (existingAppRow.lyDoTuChoi || '')) {
            fieldChanges.push({
              label: 'Lý do từ chối',
              appValue: existingAppRow.lyDoTuChoi || '(Trống)',
              sheetValue: sheetLyDo,
            });
            sheetPatch.lyDoTuChoi = sheetLyDo;
          }
          if (sheetLeaderNote && sheetLeaderNote !== (existingAppRow.leaderNote || '')) {
            fieldChanges.push({
              label: 'Ghi chú Leader',
              appValue: existingAppRow.leaderNote || '(Trống)',
              sheetValue: sheetLeaderNote,
            });
            sheetPatch.leaderNote = sheetLeaderNote;
          }
          if (sheetSanPham && sheetSanPham !== (existingAppRow.sanPham || '')) {
            fieldChanges.push({
              label: 'Sản phẩm',
              appValue: existingAppRow.sanPham || '(Trống)',
              sheetValue: sheetSanPham,
            });
            sheetPatch.sanPham = sheetSanPham;
          }
          if (sheetGiaNet > 0 && sheetGiaNet !== Number(existingAppRow.giaNetVideo || 0)) {
            fieldChanges.push({
              label: 'Giá Net video',
              appValue: formatVnd(Number(existingAppRow.giaNetVideo || 0)),
              sheetValue: formatVnd(sheetGiaNet),
            });
            sheetPatch.giaNetVideo = sheetGiaNet;
          }
          if (sheetContentNote && sheetContentNote !== (existingAppRow.contentNote || '')) {
            fieldChanges.push({
              label: 'Content note',
              appValue: existingAppRow.contentNote || '(Trống)',
              sheetValue: sheetContentNote,
            });
            sheetPatch.contentNote = sheetContentNote;
          }
          if (sheetLinkNghiemThu && sheetLinkNghiemThu !== (existingAppRow.linkAirNghiemThu || '')) {
            fieldChanges.push({
              label: 'Link nghiệm thu',
              appValue: existingAppRow.linkAirNghiemThu || '(Trống)',
              sheetValue: sheetLinkNghiemThu,
            });
            sheetPatch.linkAirNghiemThu = sheetLinkNghiemThu;
          }

          const listingTime = existingAppRow.ngayDien || formatVnDateTime(new Date());
          const sla = computeListingToBrandSla({
            ngayDien: listingTime,
            createdAt: existingAppRow.createdAt,
            brandChon: normBrand || prevBrandDecision,
            ngayBrandDuyet: effectiveReviewTime || existingAppRow.ngayBrandDuyet,
            brandReviewedAt: existingAppRow.brandReviewedAt,
          });
          const effectiveNet =
            sheetGiaNet > 0 ? sheetGiaNet : Number(existingAppRow.giaNetVideo || 0);

          diffs.push({
            handle: cleanHandle || normalizeTikTokId(existingAppRow.idKenh),
            kocName: existingAppRow.tenKenh || sheetTenKenh || cleanHandle,
            action: fieldChanges.length > 0 ? 'UPDATE_EXISTING' : 'UNCHANGED',
            appRowId: existingAppRow.id,
            sheetRowId: sheetRowId || undefined,
            matchedBy,
            prevBrandDecision,
            brandDecisionOnSheet: normBrand || prevBrandDecision,
            brandDecisionChanged,
            isNewlyApprovedYes,
            isNewlyRejectedNo,
            isNewlyConsidering,
            listingTime,
            brandReviewTime: effectiveReviewTime || existingAppRow.ngayBrandDuyet || '',
            slaStatus: sla.status,
            slaLabel: sla.label,
            slaElapsedHours: sla.elapsedHours,
            sanPham: sheetSanPham || existingAppRow.sanPham || '',
            netFee: effectiveNet,
            lyDoTuChoi: sheetLyDo || existingAppRow.lyDoTuChoi || '',
            existingMaBooking: existingAppRow.maBooking || '',
            sheetPatch,
            fieldChanges,
          });
        } else {
          const matchedKoc = kocs.find(
            (k) => normalizeTikTokId(k.channelId).toLowerCase() === lowerH
          );
          const nowFormatted = formatVnDateTime(new Date());
          const effectiveReviewTime =
            normBrand === 'Yes' || normBrand === 'No' || normBrand === 'Cân nhắc'
              ? sheetNgayBrandDuyet || nowFormatted
              : '';
          const fieldChanges: { label: string; appValue: string; sheetValue: string }[] = [
            {
              label: 'KOC mới từ Google Sheet',
              appValue: 'Chưa có trên bảng App',
              sheetValue: `@${cleanHandle}${sheetTenKenh ? ` (${sheetTenKenh})` : ''}`,
            },
          ];
          if (normBrand) {
            fieldChanges.push({
              label: 'Brand chọn',
              appValue: 'Chưa có',
              sheetValue: `${normBrand}${effectiveReviewTime ? ` (${effectiveReviewTime})` : ''}`,
            });
          }
          const sla = computeListingToBrandSla({
            ngayDien: nowFormatted,
            brandChon: normBrand,
            ngayBrandDuyet: effectiveReviewTime,
          });
          const effectiveNet = sheetGiaNet || matchedKoc?.rateCardVideo || 1500000;
          const effectiveProd = sheetSanPham || activeStoreObj?.mainProducts?.[0] || '';
          diffs.push({
            handle: cleanHandle,
            kocName: sheetTenKenh || matchedKoc?.stageName || cleanHandle,
            action: 'IMPORT_NEW',
            prevBrandDecision: '',
            brandDecisionOnSheet: normBrand,
            brandDecisionChanged: Boolean(normBrand),
            isNewlyApprovedYes: normBrand === 'Yes',
            isNewlyRejectedNo: normBrand === 'No',
            isNewlyConsidering: normBrand === 'Cân nhắc',
            listingTime: nowFormatted,
            brandReviewTime: effectiveReviewTime,
            slaStatus: sla.status,
            slaLabel: sla.label,
            slaElapsedHours: sla.elapsedHours,
            sanPham: effectiveProd,
            netFee: effectiveNet,
            lyDoTuChoi: sheetLyDo || '',
            existingMaBooking: '',
            sheetPatch: {
              idKenh: cleanHandle,
              tenKenh: sheetTenKenh || matchedKoc?.stageName || cleanHandle,
              brandChon: normBrand || '',
              ngayBrandDuyet: effectiveReviewTime,
              brandReviewedAt: effectiveReviewTime ? new Date().toISOString() : undefined,
              lyDoTuChoi: sheetLyDo || '',
              leaderNote: sheetLeaderNote || '',
              sanPham: effectiveProd,
              giaNetVideo: effectiveNet,
              contentNote: sheetContentNote || '',
              deXuatUpBase: sheetDeXuat || 'Recommend',
              ngayAirPlan: sheetNgayAirPlan || '',
              linkAirNghiemThu: sheetLinkNghiemThu || '',
            },
            fieldChanges,
          });
        }
      }

      const notOnSheetHandles: string[] = [];
      for (const r of rows) {
        const h = normalizeTikTokId(r.idKenh).toLowerCase();
        if (h && !seenHandlesOnSheet.has(h)) {
          notOnSheetHandles.push(`@${normalizeTikTokId(r.idKenh)}`);
        }
      }

      const newlyApprovedDiffs = diffs.filter((d) => d.isNewlyApprovedYes);
      const newlyApprovedCount = newlyApprovedDiffs.length;
      const newlyApprovedNetBudget = newlyApprovedDiffs.reduce((s, d) => s + (d.netFee || 0), 0);
      const totalApprovedOnSheetCount = diffs.filter(
        (d) => d.brandDecisionOnSheet === 'Yes'
      ).length;
      const newlyRejectedCount = diffs.filter((d) => d.isNewlyRejectedNo).length;
      const newlyConsideringCount = diffs.filter((d) => d.isNewlyConsidering).length;
      const pendingOnSheetCount = diffs.filter(
        (d) => !d.brandDecisionOnSheet || d.brandDecisionOnSheet === 'Chờ duyệt'
      ).length;

      const reviewedDiffs = diffs.filter(
        (d) => d.slaStatus === 'ON_TIME' || d.slaStatus === 'OVERDUE'
      );
      const reviewedWithSlaCount = reviewedDiffs.length;
      const onTimeSlaCount = reviewedDiffs.filter((d) => d.slaStatus === 'ON_TIME').length;
      const overdueSlaCount = reviewedDiffs.filter((d) => d.slaStatus === 'OVERDUE').length;
      const totalReviewHours = reviewedDiffs.reduce(
        (s, d) => s + (d.slaElapsedHours ?? 0),
        0
      );
      const avgReviewHours =
        reviewedWithSlaCount === 0
          ? 0
          : Math.round((totalReviewHours / reviewedWithSlaCount) * 10) / 10;
      const readyForDealCreationCount = diffs.filter(
        (d) => d.brandDecisionOnSheet === 'Yes' && !d.existingMaBooking
      ).length;

      setPullDiffReport({
        diffs,
        notOnSheetHandles,
        totalSheetRows: sheetRows.length,
        brandSummary: {
          newlyApprovedCount,
          newlyApprovedNetBudget,
          totalApprovedOnSheetCount,
          newlyRejectedCount,
          newlyConsideringCount,
          pendingOnSheetCount,
          reviewedWithSlaCount,
          onTimeSlaCount,
          overdueSlaCount,
          avgReviewHours,
          readyForDealCreationCount,
        },
      });
      setPullReportFilter('ALL');
      setSelectedPullHandles(
        diffs
          .filter((d) => d.action === 'UPDATE_EXISTING' || d.action === 'IMPORT_NEW')
          .map((d) => d.handle)
      );
    } catch (err) {
      onNotify?.(
        err instanceof Error ? err.message : 'Không đọc được dữ liệu từ Google Sheet.',
        'error'
      );
    } finally {
      setPullBusy(false);
    }
  };

  const handleOpenPullSheetModal = () => {
    const initialUrl = currentGoogleSheetUrl;
    const initialTab = defaultGoogleSheetTab;
    setPullSheetUrl(initialUrl);
    setPullSheetTab(initialTab);
    setPullDiffReport(null);
    setPullReportFilter('ALL');
    setSelectedPullHandles([]);
    setIsPullSheetModalOpen(true);
    if (initialUrl) {
      void fetchTabsForSheetUrl(initialUrl, initialTab, (t) => setPullSheetTab(t));
      void handleRunPullDiffPreview(initialUrl, initialTab);
    }
  };

  // Mở hộp thoại Tạo các Deal từ danh sách KOC Brand đã duyệt (Yes) để chuyển sang Bảng Deal
  const handleOpenCreateDealsModal = (
    overrideRowsSource?: StaffListingSheetRow[],
    preferredSelectedRowIds?: string[]
  ) => {
    const sourceRows = overrideRowsSource || rows;
    const approvedRows = sourceRows.filter((r) => r.brandChon === 'Yes');
    if (approvedRows.length === 0) {
      onNotify?.(
        'Hiện chưa có dòng KOC nào có trạng thái "Brand chọn = Yes" trên bảng này để tạo Deal.',
        'warning'
      );
      return;
    }

    const prefSet =
      preferredSelectedRowIds && preferredSelectedRowIds.length > 0
        ? new Set(preferredSelectedRowIds)
        : selectedRowIds.length > 0
          ? new Set(selectedRowIds)
          : null;

    const defaultAirYmd = `${activeMonth.replace('/', '-')}-20`;
    const drafts: CreateDealDraftRow[] = approvedRows.map((r, idx) => {
      const existingBo = (r.maBooking || '').trim();
      const hasExistingBo = Boolean(existingBo);
      const shouldSelect = prefSet
        ? prefSet.has(r.id)
        : !hasExistingBo || approvedRows.every((x) => Boolean(x.maBooking));
      return {
        rowId: r.id,
        selected: shouldSelect,
        maBooking: hasExistingBo
          ? existingBo
          : generateBookingOrderCode(activeMonth, 201 + idx),
        isExistingBo: hasExistingBo,
        idKenh: normalizeTikTokId(r.idKenh),
        tenKenh: r.tenKenh || r.idKenh,
        tepKenh: r.tepKenh || 'Beauty',
        dot: r.dot || 'Đợt 1',
        sanPham:
          r.sanPham ||
          activeStoreObj?.mainProducts?.[0] ||
          (activeStoreObj?.brandName ? `Sản phẩm ${activeStoreObj.brandName}` : ''),
        giaNetVideo: Number(r.giaNetVideo) || 0,
        giaChotCuoi: Number(r.giaChotCuoi || r.giaNetVideo) || 0,
        ngayAirChot: r.ngayAirChot || r.ngayAirPlan || defaultAirYmd,
        nhanSuDien: r.nhanSuDien || currentUserName,
        ngayDien: r.ngayDien || '',
        ngayBrandDuyet: r.ngayBrandDuyet || formatVnDateTime(new Date()),
        slaBrandDuyet: r.slaBrandDuyet || 'Đúng hạn',
      };
    });

    setDealDrafts(drafts);
    setIsCreateDealsModalOpen(true);
  };

  // Xác nhận tạo Deal hàng loạt từ các KOC Brand đã duyệt & chuyển sang Bảng Deal
  const handleConfirmCreateDealsAndOpenBoard = (shouldNavigateToBoard = true) => {
    const selectedDrafts = dealDrafts.filter((d) => d.selected);
    if (selectedDrafts.length === 0) {
      onNotify?.('Vui lòng tích chọn ít nhất 1 KOC đã được Brand duyệt để tạo Deal.', 'warning');
      return;
    }

    const draftByRowId = new Map(selectedDrafts.map((d) => [d.rowId, d]));
    const updatedSheetRowsForTransfer: StaffListingSheetRow[] = [];

    updateActiveSheetRows((prev) =>
      prev.map((r) => {
        const draft = draftByRowId.get(r.id);
        if (!draft) return r;
        const nextRow = recalculateStaffListingRow({
          ...r,
          brandChon: 'Yes',
          chuyenListDuyetBook: true,
          maBooking: draft.maBooking.trim(),
          sanPham: draft.sanPham.trim() || r.sanPham,
          giaChotCuoi: Number(draft.giaChotCuoi) || Number(r.giaNetVideo) || 0,
          ngayAirChot: draft.ngayAirChot || r.ngayAirPlan,
          nhanSuDien: draft.nhanSuDien || r.nhanSuDien,
          trangThai: 'Đã đồng ý',
        });
        updatedSheetRowsForTransfer.push(nextRow);
        return nextRow;
      })
    );

    // Đồng bộ sang List Duyệt Book (ApprovedBookingList) và bật cờ bookingOrderCreated = true + sinh mã Hợp đồng & Phụ lục
    const transferRes = transferBrandApprovedRowsToBookingList({
      rowsToTransfer: updatedSheetRowsForTransfer,
      sheetKey: activeSheetKey,
      store: activeStoreObj,
      allKocs: kocs,
      allStores: stores,
      allDeals: deals,
    });

    const nowIso = new Date().toISOString();
    const createdOrUpdatedDeals: BookingDealItem[] = [];
    const createdDealCodes: string[] = [];
    const syncedApprovedItems = transferRes.totalApprovedList.map((item) => {
      const matchedDraft =
        (item.sourceSheetRowId && draftByRowId.get(item.sourceSheetRowId)) ||
        selectedDrafts.find(
          (d) =>
            d.idKenh.toLowerCase() === normalizeTikTokId(item.idKenh).toLowerCase() &&
            item.storeName === activeStoreName &&
            item.thangPlan === activeMonth
        );
      if (!matchedDraft) return item;

      const boCode =
        matchedDraft.maBooking.trim() ||
        item.maBooking ||
        generateBookingOrderCode(activeMonth);
      const finalNet = Number(matchedDraft.giaChotCuoi) || item.chiPhiBookingNetCuoi || 0;
      const recalc = recalculateApprovedBookingItem({
        ...item,
        maBooking: boCode,
        bookingOrderCreated: true,
        bookingOrderCreatedAt: item.bookingOrderCreatedAt || nowIso,
        sanPham: matchedDraft.sanPham.trim() || item.sanPham,
        chiPhiBookingNetCuoi: finalNet,
        plannedAirDate: matchedDraft.ngayAirChot || item.plannedAirDate,
        nguoiPhuTrach: matchedDraft.nhanSuDien || item.nguoiPhuTrach,
        masterContractCode:
          item.masterContractCode || generateMasterContractCode(item.idKenh, activeMonth),
        contractAppendixCode:
          item.contractAppendixCode || generateDealAppendixCode(boCode, 1),
        contractAppendixStatus:
          item.contractAppendixStatus === 'CHƯA_LẬP' || !item.contractAppendixStatus
            ? 'CHỜ_KÝ'
            : item.contractAppendixStatus,
      });
      createdDealCodes.push(boCode);
      createdOrUpdatedDeals.push(buildBookingDealFromApprovedItem(recalc));
      return recalc;
    });

    saveApprovedBookingList(syncedApprovedItems, true);
    syncApprovedItemsBackToStaffBrandSheets(syncedApprovedItems, kocs, stores, deals);
    setCollection(loadStaffSheetCollection(kocs, stores, deals, currentUserName));

    if (createdOrUpdatedDeals.length > 0) {
      onCreateOrUpdateDeals?.(createdOrUpdatedDeals);
    }

    setIsCreateDealsModalOpen(false);
    onNotify?.(
      `Đã tạo/cập nhật ${selectedDrafts.length} Deal (${createdDealCodes
        .slice(0, 4)
        .join(', ')}${createdDealCodes.length > 4 ? '...' : ''}) từ danh sách Brand duyệt!`,
      'success'
    );

    if (shouldNavigateToBoard) {
      onOpenDealBoard?.({
        storeName: activeStoreName,
        monthKey: activeMonth,
        createdDealCodes,
      });
    }
  };

  const handleConfirmApplyPullSheet = (openCreateDealsAfter = false) => {
    if (!pullDiffReport) return;
    const selSet = new Set(selectedPullHandles.map((h) => h.toLowerCase()));
    const itemsToApply = pullDiffReport.diffs.filter((d) =>
      selSet.has(d.handle.toLowerCase())
    );
    if (itemsToApply.length === 0) {
      onNotify?.('Vui lòng tích chọn ít nhất 1 dòng thay đổi để áp dụng vào bảng.', 'warning');
      return;
    }

    let updatedCount = 0;
    let importedCount = 0;
    const newlyApprovedRows: StaffListingSheetRow[] = [];
    let finalSheetRowsSnapshot: StaffListingSheetRow[] = [];

    updateActiveSheetRows((prev) => {
      const next = prev.map((r) => {
        const h = normalizeTikTokId(r.idKenh).toLowerCase();
        // Ưu tiên khớp theo Row ID (r.id), sau đó mới theo ID kênh
        const matchedUpdate =
          itemsToApply.find(
            (d) => d.action === 'UPDATE_EXISTING' && d.appRowId && d.appRowId === r.id
          ) ||
          itemsToApply.find(
            (d) =>
              d.action === 'UPDATE_EXISTING' &&
              !d.appRowId &&
              d.handle.toLowerCase() === h
          );
        if (!matchedUpdate) return r;
        updatedCount++;
        const merged = recalculateStaffListingRow({
          ...r,
          ...matchedUpdate.sheetPatch,
        });
        if (merged.brandChon === 'Yes') {
          newlyApprovedRows.push(merged);
        }
        return merged;
      });

      for (const imp of itemsToApply.filter((d) => d.action === 'IMPORT_NEW')) {
        const lowerH = imp.handle.toLowerCase();
        const matchedKoc = kocs.find(
          (k) => normalizeTikTokId(k.channelId).toLowerCase() === lowerH
        );
        const baseRow = buildStaffListingRowFromKoc({
          koc: matchedKoc || {
            stageName: imp.kocName,
            channelId: imp.handle,
            rateCardVideo: Number(imp.sheetPatch.giaNetVideo) || 1500000,
            followers: 0,
            tepKenh: 'Beauty',
          },
          monthKey: activeMonth,
          storeName: activeStoreName,
          staffName: currentUserName,
          deals,
          dot: 'Đợt 1',
          sanPham: imp.sheetPatch.sanPham || '',
          contentTag: 'Review trực tiếp',
          deXuatUpBase: imp.sheetPatch.deXuatUpBase || 'Recommend',
          contentNote: imp.sheetPatch.contentNote || '',
          ngayAirPlan: imp.sheetPatch.ngayAirPlan || '',
        });
        const finalNewRow = recalculateStaffListingRow({
          ...baseRow,
          ...imp.sheetPatch,
        });
        next.push(finalNewRow);
        importedCount++;
        if (finalNewRow.brandChon === 'Yes') {
          newlyApprovedRows.push(finalNewRow);
        }
      }

      finalSheetRowsSnapshot = next;
      return next;
    });

    if (newlyApprovedRows.length > 0) {
      setTimeout(() => {
        transferBrandApprovedRowsToBookingList({
          rowsToTransfer: newlyApprovedRows,
          sheetKey: activeSheetKey,
          store: activeStoreObj,
          allKocs: kocs,
          allStores: stores,
          allDeals: deals,
        });
        setCollection(loadStaffSheetCollection(kocs, stores, deals, currentUserName));
      }, 0);
    }

    setIsPullSheetModalOpen(false);
    setPullDiffReport(null);
    onNotify?.(
      `Đã đồng bộ từ Google Sheet vào bảng: cập nhật ${updatedCount} dòng, nhập mới ${importedCount} dòng${
        newlyApprovedRows.length > 0
          ? `, ghi nhận ${newlyApprovedRows.length} KOC được Brand duyệt (Yes)`
          : ''
      }.`,
      'success'
    );

    if (openCreateDealsAfter) {
      const preferredIds = newlyApprovedRows.map((r) => r.id);
      handleOpenCreateDealsModal(
        finalSheetRowsSnapshot.length > 0 ? finalSheetRowsSnapshot : rows,
        preferredIds
      );
    }
  };

  // =========================================================================
  // ĐIỀU KHIỂN HIỂN THỊ TEMPLATE GOOGLE SHEET (ẨN THÁNG, ẨN CỘT, SORT SHEET)
  // =========================================================================
  const handleOpenSheetTemplateModal = () => {
    const url = currentGoogleSheetUrl;
    if (!url) {
      setGoogleSheetUrlDraft('');
      setIsGoogleSheetModalOpen(true);
      onNotify?.('Vui lòng gắn Link Google Sheet trước khi thiết lập hiển thị Template.', 'info');
      return;
    }
    const defaultTab = defaultGoogleSheetTab;
    setSheetTemplateActiveTab(defaultTab);
    setIsSheetTemplateModalOpen(true);
    void fetchTabsForSheetUrl(url, defaultTab, (t) => setSheetTemplateActiveTab(t));
  };

  const runSheetTemplatePatch = async (
    payload: {
      activeTab?: string;
      tabVisibility?: { title: string; hidden: boolean }[];
      columnPreset?: 'BRAND_REVIEW' | 'AIR_ACCEPTANCE' | 'FULL_TEMPLATE';
      sortBy?: 'PRODUCT' | 'STAFF' | 'BATCH' | 'BRAND_DECISION';
      installFilterViews?: boolean;
    },
    successMessage: string
  ) => {
    const url = currentGoogleSheetUrl;
    if (!url) {
      onNotify?.('Chưa gắn Link Google Sheet.', 'warning');
      return;
    }
    setSheetTemplateBusy(true);
    try {
      const res = await fetch('/api/booking-list/push-sheet', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetUrl: url,
          activeTab: payload.activeTab || sheetTemplateActiveTab || defaultGoogleSheetTab,
          ...payload,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        tabsDetail?: SheetTabDetailItem[];
        error?: string;
      } | null;
      if (!res.ok || !data?.ok) {
        onNotify?.(data?.error || 'Không thực thi được thiết lập trên Google Sheet.', 'error');
        return;
      }
      if (Array.isArray(data.tabsDetail)) {
        setSheetTabsDetail(data.tabsDetail);
        setAvailableSheetTabs(data.tabsDetail.map((t) => t.title));
      }
      onNotify?.(successMessage, 'success');
    } catch (err) {
      onNotify?.(
        err instanceof Error ? err.message : 'Lỗi kết nối khi điều khiển Google Sheet.',
        'error'
      );
    } finally {
      setSheetTemplateBusy(false);
    }
  };

  const handleToggleSingleSheetTabHidden = (tabTitle: string, nextHidden: boolean) => {
    setSheetTabsDetail((prev) =>
      prev.map((t) => (t.title === tabTitle ? { ...t, hidden: nextHidden } : t))
    );
  };

  const handleHideOldMonthTabsDraft = () => {
    const activeTabClean = (sheetTemplateActiveTab || defaultGoogleSheetTab).trim().toLowerCase();
    const monthToken = activeMonth.split('/')[1] || '10'; // VD: '10'
    setSheetTabsDetail((prev) =>
      prev.map((t) => {
        const lower = t.title.toLowerCase();
        const isCurrent =
          lower === activeTabClean ||
          lower.includes(`t${monthToken}`) ||
          lower.includes(`-${monthToken}`) ||
          lower.includes(`/${monthToken}`);
        return { ...t, hidden: !isCurrent };
      })
    );
  };

  return (
    <div className="space-y-3">
      {/* Khung làm việc tích hợp: 2 thanh điều khiển tinh gọn + Bảng dữ liệu chuẩn Google Sheet */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden shadow-2xs">
        {/* Thanh 1: Ngữ cảnh Tháng / Gian hàng + Phân quyền PIC & Support + Link Google Sheet + 4 Chỉ số tóm tắt */}
        <div className="px-3 py-2 border-b border-line bg-sunken/40 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <select
              value={activeMonth}
              onChange={(e) => onChangeMonth(e.target.value)}
              aria-label="Chọn tháng"
              className="h-8 px-2.5 text-xs font-semibold rounded-md border border-line-strong bg-surface text-ink shrink-0 focus:outline-none focus:border-ink"
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
              className="h-8 px-2.5 text-xs font-semibold rounded-md border border-line-strong bg-surface text-ink max-w-[260px] truncate shrink-0 focus:outline-none focus:border-ink"
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

            {/* Cụm hiển thị gọn lấy trực tiếp từ Phân quyền theo gian: 1 PIC Chính + Nhân viên hỗ trợ + Leader + Link Google Sheet */}
            <div className="flex flex-wrap items-center gap-1.5 text-2xs">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface border border-line text-ink"
                title="Dữ liệu đồng bộ tự động từ Phân quyền theo gian hàng"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-accent shrink-0" />
                <span className="text-ink-3">PIC Chính:</span>
                <strong className="font-semibold text-ink">
                  {storeAssignment.primaryPic || 'Chưa phân công'}
                </strong>
              </span>

              {storeAssignment.supportStaff.length > 0 && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface border border-line text-ink-2"
                  title={`Nhân viên hỗ trợ (từ Phân quyền theo gian): ${storeAssignment.supportStaff.join(', ')}`}
                >
                  <Users className="w-3.5 h-3.5 text-ink-3 shrink-0" />
                  <span className="text-ink-3">Hỗ trợ:</span>
                  <span className="font-medium text-ink">
                    {storeAssignment.supportStaff.slice(0, 2).join(', ')}
                    {storeAssignment.supportStaff.length > 2
                      ? ` +${storeAssignment.supportStaff.length - 2}`
                      : ''}
                  </span>
                </span>
              )}

              {storeLeaderName && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface border border-line text-ink-2"
                  title={`Leader phụ trách cụm gian hàng: ${storeLeaderName}`}
                >
                  <span className="text-ink-3">Leader:</span>
                  <span className="font-medium text-ink">{storeLeaderName}</span>
                </span>
              )}

              <Status
                tone={
                  isPrimaryPic || isAdminOrManager || isStoreLeader
                    ? 'positive'
                    : isSupportStaff
                    ? 'info'
                    : 'neutral'
                }
              >
                {isPrimaryPic
                  ? `Quyền: PIC Chính (${fieldEditPolicy.editableFieldsByRole.PRIMARY_PIC.length}/47 trường)`
                  : isSupportStaff
                  ? `Quyền: Hỗ trợ (${fieldEditPolicy.editableFieldsByRole.SUPPORT.length}/47 trường)`
                  : isStoreLeader
                  ? `Quyền: Leader (${fieldEditPolicy.editableFieldsByRole.LEADER.length}/47 trường)`
                  : isAdminOrManager
                  ? 'Quyền: Quản trị viên (Toàn quyền)'
                  : 'Quyền xem & đề xuất'}
              </Status>

              {isAdminOrManager && onOpenSheetSetupScreen && (
                <button
                  type="button"
                  onClick={() => onOpenSheetSetupScreen('FIELD_PERMISSIONS')}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface border border-line text-ink-2 font-medium hover:bg-sunken hover:text-ink"
                  title="Mở màn hình cấu hình quyền sửa từng trường (cột) cho Nhân viên hỗ trợ, PIC Chính và Leader"
                >
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-accent" />
                  <span>Phân quyền sửa trường</span>
                </button>
              )}

              {currentGoogleSheetUrl ? (
                <>
                  <a
                    href={currentGoogleSheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface border border-line text-accent font-medium hover:bg-sunken"
                    title={currentGoogleSheetUrl}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                    <span>Mở Google Sheet</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                  <button
                    type="button"
                    onClick={handleOpenSheetTemplateModal}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface border border-line text-ink-2 font-medium hover:bg-sunken hover:text-ink"
                    title="Ẩn các tháng cũ, ẩn/hiện cột Template và Sort theo Sản phẩm / Nhân sự trên Google Sheet"
                  >
                    <Settings className="w-3.5 h-3.5 shrink-0 text-accent" />
                    <span>Setup &amp; Sort File Sheet</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (isAdminOrManager && onOpenSheetSetupScreen) {
                      onOpenSheetSetupScreen('TABLE');
                    } else {
                      setGoogleSheetUrlDraft('');
                      setIsGoogleSheetModalOpen(true);
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface border border-line text-warning font-medium hover:bg-sunken"
                >
                  <Link2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Chưa gắn Link Sheet</span>
                </button>
              )}
            </div>
          </div>

          {/* Cụm chỉ số tóm tắt gọn trên 1 dòng + Đo lường SLA Brand duyệt */}
          <div className="flex flex-wrap items-center gap-3 px-2.5 py-1 rounded-md bg-surface border border-line text-xs shrink-0">
            <div className="flex items-center gap-1">
              <span className="text-ink-3">KOC:</span>
              <strong className="text-ink tabular-nums">{sheetStats.totalCount}</strong>
            </div>
            <span className="h-3 w-px bg-line" />
            <div className="flex items-center gap-1">
              <span className="text-ink-3">Brand duyệt:</span>
              <strong className="text-positive tabular-nums">
                {sheetStats.brandApprovedCount}/{sheetStats.totalCount}
              </strong>
            </div>
            <span className="h-3 w-px bg-line" />
            <div
              className="flex items-center gap-1"
              title="Đo lường SLA từ thời điểm Listing KOC mới lên đến khi Brand phản hồi (Cam kết chuẩn: ≤ 48h)"
            >
              <Clock className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="text-ink-3">SLA Brand (48h):</span>
              {sheetStats.reviewedCount > 0 ? (
                <strong
                  className={`tabular-nums ${
                    sheetStats.onTimeCount === sheetStats.reviewedCount
                      ? 'text-positive'
                      : 'text-warning'
                  }`}
                >
                  {sheetStats.onTimeCount}/{sheetStats.reviewedCount} đúng hạn (TB {sheetStats.avgReviewHours}h)
                </strong>
              ) : (
                <strong className="text-ink-2 tabular-nums">Chưa có phản hồi</strong>
              )}
              {sheetStats.overdueWaitCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-2xs">
                  {sheetStats.overdueWaitCount} quá hạn chờ
                </span>
              )}
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
          </div>
        </div>

        {/* Thanh 2: Bộ lọc + Chuyển nhanh Giai đoạn cột + 3 Nút thao tác chính (1 nút primary duy nhất) */}
        <div className="px-3 py-2 border-b border-line bg-surface flex flex-wrap items-center justify-between gap-2">
          {/* Bên trái: Tìm kiếm, Lọc, Chuyển nhanh Giai đoạn cột */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="relative w-44 sm:w-52">
              <Search className="w-3.5 h-3.5 text-ink-3 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={rowSearchQuery}
                onChange={(e) => setRowSearchQuery(e.target.value)}
                placeholder="Tìm ID kênh, tên KOC, SP..."
                className="w-full h-8 pl-7 pr-2 text-xs rounded-md border border-line-strong bg-surface text-ink focus:outline-none focus:border-ink"
              />
            </div>

            <select
              value={filterDot}
              onChange={(e) => setFilterDot(e.target.value)}
              className="h-8 px-2 text-xs rounded-md border border-line-strong bg-surface text-ink"
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
              className="h-8 px-2 text-xs rounded-md border border-line-strong bg-surface text-ink"
            >
              <option value="ALL">Brand chọn: Tất cả</option>
              {BRAND_CHON_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  Brand: {b}
                </option>
              ))}
            </select>

            <select
              value={filterNhanSu}
              onChange={(e) => setFilterNhanSu(e.target.value)}
              className="h-8 px-2 text-xs rounded-md border border-line-strong bg-surface text-ink"
              aria-label="Lọc theo nhân sự điền"
            >
              <option value="ALL">Nhân sự: Toàn nhóm</option>
              <option value="MINE">Dòng của tôi ({currentUserName})</option>
              {staffInSheetOptions.map((stName) => (
                <option key={stName} value={stName}>
                  NV: {stName}
                </option>
              ))}
            </select>

            <select
              value={appSortBy}
              onChange={(e) =>
                setAppSortBy(
                  e.target.value as
                    | 'DEFAULT'
                    | 'PRODUCT'
                    | 'STAFF'
                    | 'BATCH'
                    | 'BRAND_DECISION'
                )
              }
              className="h-8 px-2 text-xs rounded-md border border-line-strong bg-surface text-ink"
              aria-label="Sắp xếp bảng theo Sản phẩm hoặc Nhân sự"
            >
              <option value="DEFAULT">Sắp xếp: Thứ tự gốc</option>
              <option value="PRODUCT">Sort theo: Sản phẩm (A → Z)</option>
              <option value="STAFF">Sort theo: Nhân sự điền (A → Z)</option>
              <option value="BATCH">Sort theo: Đợt Listing</option>
              <option value="BRAND_DECISION">Sort theo: Brand chọn (Yes)</option>
            </select>

            {/* Bộ chuyển nhanh 3 giai đoạn cột trên Google Sheet */}
            <div className="inline-flex items-center p-0.5 rounded-md bg-sunken border border-line text-2xs">
              <button
                type="button"
                onClick={() => applyColumnPreset('BRAND_WORKING_FILE')}
                className={`px-2 py-1 rounded transition-colors ${
                  activeColumnPreset === 'BRAND_WORKING_FILE'
                    ? 'bg-surface text-ink font-semibold shadow-2xs'
                    : 'text-ink-2 hover:text-ink'
                }`}
              >
                1. Listing &amp; Trình Brand
              </button>
              <button
                type="button"
                onClick={() => applyColumnPreset('ACCEPTANCE_FILE_32')}
                className={`px-2 py-1 rounded transition-colors ${
                  activeColumnPreset === 'ACCEPTANCE_FILE_32'
                    ? 'bg-surface text-ink font-semibold shadow-2xs'
                    : 'text-ink-2 hover:text-ink'
                }`}
              >
                2. Đi Air &amp; Nghiệm thu
              </button>
              <button
                type="button"
                onClick={() => applyColumnPreset('ALL_48')}
                className={`px-2 py-1 rounded transition-colors ${
                  activeColumnPreset === 'ALL_48'
                    ? 'bg-surface text-ink font-semibold shadow-2xs'
                    : 'text-ink-2 hover:text-ink'
                }`}
              >
                Đầy đủ ({STAFF_LISTING_COLUMNS.length} cột)
              </button>
            </div>
          </div>

          {/* Bên phải: Chỉ giữ 3 nút nghiệp vụ cốt lõi + 1 menu Thao tác khác */}
          <div className="flex flex-wrap items-center gap-1.5">
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

            <Button
              variant="secondary"
              size="sm"
              icon={UserPlus}
              onClick={() => setIsDirectoryPickerOpen(true)}
            >
              Chọn KOC
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={handleOpenPullSheetModal}
            >
              Kéo từ Sheet
            </Button>

            {sheetStats.brandApprovedCount > 0 && (
              <Button
                variant="secondary"
                size="sm"
                icon={ArrowRight}
                onClick={() => handleOpenCreateDealsModal()}
              >
                {sheetStats.readyToCreateDealsCount > 0
                  ? `Tạo Deal chuyển Bảng Deal (${sheetStats.readyToCreateDealsCount} mới)`
                  : `Tạo / Đồng bộ Deal (${sheetStats.brandApprovedCount})`}
              </Button>
            )}

            <Button
              variant="primary"
              size="sm"
              icon={Upload}
              onClick={handleOpenPushSheetModal}
            >
              {selectedRowIds.length > 0
                ? `Đẩy ${selectedRowIds.length} dòng chọn lên Sheet`
                : `Đẩy lên Google Sheet (${displayedRows.length})`}
            </Button>

            <ActionMenu
              label="Thao tác khác"
              items={[
                {
                  label: `Tạo các Deal từ KOC Brand đã duyệt (${sheetStats.brandApprovedCount} KOC)`,
                  icon: ArrowRight,
                  onSelect: () => handleOpenCreateDealsModal(),
                },
                ...(onOpenDealBoard
                  ? [
                      {
                        label: `Mở Bảng Deal & Nghiệm thu (${sheetStats.alreadyCreatedDealsCount} Deal đã tạo)`,
                        icon: FileText,
                        onSelect: () =>
                          onOpenDealBoard({
                            storeName: activeStoreName,
                            monthKey: activeMonth,
                          }),
                      },
                    ]
                  : []),
                {
                  label: 'Thêm dòng trống tự nhập',
                  icon: Plus,
                  onSelect: handleAddBlankRow,
                },
                {
                  label: `Gửi mail mời KOC (${
                    selectedRowIds.length > 0 ? selectedRowIds.length : displayedRows.length
                  })`,
                  icon: Mail,
                  onSelect: () => handleOpenOutreachForSelection('COMPOSE'),
                },
                {
                  label: 'Copy bảng gửi Brand (Google Sheet)',
                  icon: Copy,
                  onSelect: () => {
                    void handleCopyTsv('BRAND_WORKING_COLS');
                  },
                },
                {
                  label: 'Xuất file CSV / Excel',
                  icon: Download,
                  onSelect: () =>
                    downloadStaffSheetCsv(rows, visibleColumns, activeStoreName, activeMonth),
                },
                {
                  label: `Tùy chỉnh ẩn/hiện cột (${visibleColumns.length}/${STAFF_LISTING_COLUMNS.length})`,
                  icon: Columns,
                  onSelect: () => setIsColumnPickerOpen((v) => !v),
                },
                {
                  label: `Chọn nhanh dòng Brand duyệt (${sheetStats.brandApprovedCount})`,
                  icon: CheckCircle2,
                  onSelect: handleSelectAllBrandApproved,
                },
                {
                  label: 'Thiết lập & Sort File Google Sheet (Ẩn tháng, Ẩn cột, Sort SP/NV)',
                  icon: Settings,
                  onSelect: handleOpenSheetTemplateModal,
                },
                {
                  label: currentGoogleSheetUrl
                    ? 'Đổi Link Google Sheet'
                    : 'Gắn Link Google Sheet',
                  icon: Link2,
                  onSelect: () => {
                    setGoogleSheetUrlDraft(currentGoogleSheetUrl);
                    setIsGoogleSheetModalOpen(true);
                  },
                },
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
                <span className="px-1.5 py-0.5 rounded text-2xs border bg-accent-soft text-accent border-accent/25">
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
                      <span className="font-mono text-2xs text-ink-3 shrink-0">
                        [{col.excelCol}]
                      </span>
                      <span className="truncate" title={col.header}>
                        {getDisplayHeader(col)}
                      </span>
                    </span>
                    <span
                      className={`px-1 py-0.2 rounded text-2xs border shrink-0 ${badge.className}`}
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
                  const isSystemReadOnly = STAFF_SHEET_READONLY_SYSTEM_COLUMNS.includes(col.key);
                  const colEditableByRole = isColumnAllowedForCurrentUser(col.key);
                  return (
                    <th
                      key={col.key}
                      style={
                        isStickyId
                          ? { width: col.width, minWidth: col.width, maxWidth: col.width }
                          : { minWidth: col.width }
                      }
                      title={
                        isSystemReadOnly
                          ? `Cột ${col.excelCol} (${badge.label}): ${col.header} — Hệ thống tự động tính`
                          : colEditableByRole
                            ? `Cột ${col.excelCol}: ${col.header} — Được phép chỉnh sửa`
                            : `Cột ${col.excelCol}: ${col.header} — Khóa sửa theo cấu hình phân quyền của Quản trị viên`
                      }
                      className={`px-2 py-1.5 border-r border-line text-left align-top ${
                        isStickyId
                          ? 'sticky left-[76px] z-30 bg-sunken shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-0.5 text-2xs">
                        <span className="font-mono text-ink-3">
                          {col.excelCol}
                        </span>
                        <span className="inline-flex items-center gap-1 text-ink-3 font-normal">
                          {!isSystemReadOnly && !colEditableByRole && (
                            <Lock className="w-3 h-3 text-ink-3 shrink-0" />
                          )}
                          <span>
                            {!isSystemReadOnly && !colEditableByRole ? 'Chỉ xem' : badge.label}
                          </span>
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
                  const rowEditable = canEditRow(row);
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
                        const cellCheck = canEditCell(row, col.key);
                        const cellEditable = cellCheck.allowed;
                        const cellTitle = !cellEditable ? cellCheck.reason : undefined;

                        // Các cột thông tin hệ thống tự động
                        if (col.key === 'ngayDien') {
                          return (
                            <td
                              key={col.key}
                              className={`${cellBaseClass} bg-sunken/30`}
                              title={`Ghi nhận thời điểm Listing KOC lên bảng: ${String(
                                row.ngayDien || '—'
                              )}`}
                            >
                              <div className="inline-flex items-center gap-1 font-mono text-2xs text-ink-2 whitespace-nowrap tabular-nums">
                                <Clock className="w-3 h-3 text-ink-3 shrink-0" />
                                <span>{String(row.ngayDien || '—')}</span>
                              </div>
                            </td>
                          );
                        }

                        if (col.key === 'thang' || col.key === 'store') {
                          return (
                            <td key={col.key} className={`${cellBaseClass} bg-sunken/30`}>
                              <span className="truncate block text-xs text-ink-2">
                                {String(row[col.key] ?? '—')}
                              </span>
                            </td>
                          );
                        }

                        // Render ô nhập / chọn phù hợp từng cột
                        if (col.key === 'nhanSuDien') {
                          return (
                            <td key={col.key} className={cellBaseClass}>
                              <div className="flex items-center justify-between gap-1">
                                <span className="truncate font-medium text-ink">
                                  {row.nhanSuDien || currentUserName}
                                </span>
                                {!rowEditable && (
                                  <span
                                    className="px-1 py-0.5 rounded bg-sunken border border-line text-2xs text-ink-3 shrink-0"
                                    title="Dòng do nhân sự khác thêm (chỉ xem)"
                                  >
                                    Chỉ xem
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        }

                        if (col.key === 'dot') {
                          return (
                            <td key={col.key} className={cellBaseClass} title={cellTitle}>
                              <select
                                disabled={!cellEditable}
                                value={row.dot}
                                onChange={(e) =>
                                  handleCellChange(row.id, 'dot', e.target.value)
                                }
                                className="w-full h-7 px-1.5 rounded border border-line bg-surface text-xs text-ink disabled:bg-sunken disabled:text-ink-3"
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
                            <td key={col.key} className={cellBaseClass} title={cellTitle}>
                              <select
                                disabled={!cellEditable}
                                value={row.contentTag}
                                onChange={(e) =>
                                  handleCellChange(row.id, 'contentTag', e.target.value)
                                }
                                className="w-full h-7 px-1.5 rounded border border-line bg-surface text-xs text-ink disabled:bg-sunken disabled:text-ink-3"
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
                            <td key={col.key} className={cellBaseClass} title={cellTitle}>
                              <select
                                disabled={!cellEditable}
                                value={row.tepKenh}
                                onChange={(e) =>
                                  handleCellChange(row.id, 'tepKenh', e.target.value)
                                }
                                className="w-full h-7 px-1.5 rounded border border-line bg-surface text-xs text-ink disabled:bg-sunken disabled:text-ink-3"
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
                            <td key={col.key} className={cellBaseClass} title={cellTitle}>
                              <select
                                disabled={!cellEditable}
                                value={row.trangThai}
                                onChange={(e) =>
                                  handleCellChange(row.id, 'trangThai', e.target.value)
                                }
                                className="w-full h-7 px-1.5 rounded border border-line bg-surface text-xs text-ink disabled:bg-sunken disabled:text-ink-3"
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
                            <td key={col.key} className={cellBaseClass} title={cellTitle}>
                              <select
                                disabled={!cellEditable}
                                value={row.deXuatUpBase}
                                onChange={(e) =>
                                  handleCellChange(row.id, 'deXuatUpBase', e.target.value)
                                }
                                className={`w-full h-7 px-1.5 rounded border text-xs font-medium disabled:opacity-60 ${
                                  row.deXuatUpBase === 'Must Have'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : row.deXuatUpBase === 'Recommend'
                                      ? 'bg-accent-soft text-accent border-accent/25'
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
                          const rowSla = computeListingToBrandSla({
                            ngayDien: row.ngayDien,
                            createdAt: row.createdAt,
                            brandChon: row.brandChon,
                            ngayBrandDuyet: row.ngayBrandDuyet,
                            brandReviewedAt: row.brandReviewedAt,
                          });
                          return (
                            <td key={col.key} className={cellBaseClass} title={cellTitle}>
                              <div className="space-y-1">
                                <select
                                  disabled={!cellEditable}
                                  value={row.brandChon}
                                  onChange={(e) =>
                                    handleCellChange(row.id, 'brandChon', e.target.value)
                                  }
                                  className={`w-full h-7 px-1.5 rounded border text-xs font-semibold disabled:opacity-60 ${
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
                                {row.ngayBrandDuyet ? (
                                  <div
                                    className="flex items-center justify-between gap-1 text-2xs text-ink-2 font-mono tabular-nums"
                                    title={`Listing: ${row.ngayDien || '—'} → Brand duyệt: ${row.ngayBrandDuyet} | SLA: ${row.slaBrandDuyet || rowSla.label}`}
                                  >
                                    <span className="truncate">Duyệt: {row.ngayBrandDuyet}</span>
                                  </div>
                                ) : (
                                  <div
                                    className="flex items-center justify-between gap-1 text-2xs text-ink-3 font-mono tabular-nums"
                                    title={`Listing lúc: ${row.ngayDien || '—'} | ${rowSla.label}`}
                                  >
                                    <span className="truncate">Listing: {row.ngayDien || '—'}</span>
                                  </div>
                                )}
                                {row.chuyenListDuyetBook && (
                                  <div className="flex items-center justify-between gap-1 text-2xs font-medium text-emerald-700 bg-emerald-50/80 border border-emerald-200 rounded px-1.5 py-0.5">
                                    <span>Đã chốt</span>
                                    {row.maBooking && (
                                      <span className="font-mono font-semibold">
                                        {row.maBooking}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        }

                        if (col.key === 'ngayBrandDuyet') {
                          return (
                            <td
                              key={col.key}
                              className={`${cellBaseClass} bg-sunken/30`}
                              title={
                                row.ngayBrandDuyet
                                  ? `Listing lúc: ${row.ngayDien || '—'} | Brand phản hồi lúc: ${row.ngayBrandDuyet}`
                                  : 'Chưa có phản hồi từ Brand'
                              }
                            >
                              {row.ngayBrandDuyet ? (
                                <div className="inline-flex items-center gap-1 font-mono text-2xs font-medium text-ink whitespace-nowrap tabular-nums">
                                  <Clock className="w-3 h-3 text-accent shrink-0" />
                                  <span>{row.ngayBrandDuyet}</span>
                                </div>
                              ) : (
                                <span className="text-2xs text-ink-3">Chờ Brand duyệt</span>
                              )}
                            </td>
                          );
                        }

                        if (col.key === 'slaBrandDuyet') {
                          const slaInfo = computeListingToBrandSla({
                            ngayDien: row.ngayDien,
                            createdAt: row.createdAt,
                            brandChon: row.brandChon,
                            ngayBrandDuyet: row.ngayBrandDuyet,
                            brandReviewedAt: row.brandReviewedAt,
                          });
                          const displaySla = row.slaBrandDuyet || slaInfo.label || '—';
                          return (
                            <td
                              key={col.key}
                              className={`${cellBaseClass} bg-sunken/30`}
                              title={`Thời điểm Listing: ${row.ngayDien || '—'} → Thời điểm Brand duyệt: ${
                                row.ngayBrandDuyet || 'Chưa duyệt'
                              } (Chuẩn SLA: ≤ 48h)`}
                            >
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-semibold border whitespace-nowrap tabular-nums ${
                                  slaInfo.status === 'ON_TIME'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : slaInfo.status === 'OVERDUE' || slaInfo.status === 'WAITING_OVERDUE'
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : slaInfo.status === 'WAITING'
                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                        : 'bg-surface text-ink-3 border-line'
                                }`}
                              >
                                {displaySla}
                              </span>
                            </td>
                          );
                        }

                        if (col.key === 'maBooking') {
                          return (
                            <td key={col.key} className={`${cellBaseClass} bg-sunken/30`}>
                              {row.maBooking ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 font-mono text-xs font-semibold text-emerald-800">
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
                            <td key={col.key} className={cellBaseClass} title={cellTitle}>
                              <div className="flex items-center gap-1">
                                <input
                                  type="url"
                                  disabled={!cellEditable}
                                  value={String(row.linkAirNghiemThu ?? '')}
                                  onChange={(e) =>
                                    handleCellChange(row.id, 'linkAirNghiemThu', e.target.value)
                                  }
                                  placeholder="Dán link video Air..."
                                  className="w-full h-7 px-2 rounded border border-line bg-surface text-xs text-ink focus:outline-none focus:border-ink disabled:bg-sunken disabled:text-ink-3"
                                />
                                {row.linkAirNghiemThu && (
                                  <a
                                    href={row.linkAirNghiemThu}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="h-7 w-7 rounded border border-line bg-surface text-accent hover:bg-sunken inline-flex items-center justify-center shrink-0"
                                    title="Mở video nghiệm thu"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </td>
                          );
                        }

                        if (col.key === 'trangThaiSlaAir') {
                          const slaVal = row.trangThaiSlaAir || 'Chưa lên sóng';
                          return (
                            <td key={col.key} className={`${cellBaseClass} bg-sunken/30`}>
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-semibold border ${
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
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-semibold border ${
                                  payVal === 'Đã thanh toán'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : payVal === 'Đủ điều kiện ĐNTT' ||
                                      payVal === 'Đã lập ĐNTT'
                                    ? 'bg-accent-soft text-accent border-accent/25'
                                    : 'bg-surface text-ink-3 border-line'
                                }`}
                              >
                                {payVal}
                              </span>
                            </td>
                          );
                        }

                        if (col.key === 'roiNghiemThu') {
                          const numVal = Number(row.roiNghiemThu) || 0;
                          return (
                            <td
                              key={col.key}
                              className={`${cellBaseClass} font-mono text-xs font-semibold text-right tabular-nums bg-sunken/30`}
                            >
                              {numVal <= 0 ? '—' : `${numVal.toFixed(2)}x`}
                            </td>
                          );
                        }

                        if (
                          col.key === 'giaChotCuoi' ||
                          col.key === 'viewsNghiemThu' ||
                          col.key === 'gmvNghiemThu' ||
                          col.key === 'donHangNghiemThu'
                        ) {
                          return (
                            <td key={col.key} className={cellBaseClass} title={cellTitle}>
                              <input
                                type="number"
                                disabled={!cellEditable}
                                value={Number(row[col.key]) || 0}
                                onChange={(e) =>
                                  handleCellChange(
                                    row.id,
                                    col.key,
                                    Number(e.target.value) || 0
                                  )
                                }
                                className="w-full h-7 px-2 rounded border border-line bg-surface text-right font-mono text-xs text-ink tabular-nums focus:outline-none focus:border-ink disabled:bg-sunken disabled:text-ink-3"
                              />
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
                            <td key={col.key} className={cellBaseClass} title={cellTitle}>
                              <input
                                type="number"
                                disabled={!cellEditable}
                                value={row[col.key]}
                                onChange={(e) =>
                                  handleCellChange(
                                    row.id,
                                    col.key,
                                    Number(e.target.value) || 0
                                  )
                                }
                                className="w-full h-7 px-2 rounded border border-line bg-surface text-right font-mono text-xs text-ink tabular-nums focus:outline-none focus:border-ink disabled:bg-sunken disabled:text-ink-3"
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
                              title={cellTitle}
                              className={`${cellBaseClass} ${
                                isFormulaCol ? 'bg-sunken/40' : ''
                              }`}
                            >
                              <div className="flex items-center justify-end gap-0.5">
                                <input
                                  type="number"
                                  step="0.1"
                                  disabled={!cellEditable || isFormulaCol}
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
                                      : 'border-line bg-surface text-ink disabled:bg-sunken disabled:text-ink-3'
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
                              title={cellTitle}
                            >
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  disabled={!cellEditable}
                                  value={String(row.idKenh ?? '')}
                                  onChange={(e) =>
                                    handleCellChange(row.id, 'idKenh', e.target.value)
                                  }
                                  onBlur={() => handleIdKenhBlur(row.id)}
                                  placeholder={col.header}
                                  className="w-full min-w-0 h-7 px-2 rounded border border-line bg-surface text-xs text-ink font-semibold focus:outline-none focus:border-ink disabled:bg-sunken disabled:text-ink-3"
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
                                    <span className="text-2xs font-semibold">Đã gửi</span>
                                  )}
                                </button>
                              </div>
                            </td>
                          );
                        }

                        if (col.key === 'email') {
                          return (
                            <td key={col.key} className={cellBaseClass} title={cellTitle}>
                              <div className="flex items-center gap-1">
                                <input
                                  type="email"
                                  disabled={!cellEditable}
                                  value={String(row.email ?? '')}
                                  onChange={(e) =>
                                    handleCellChange(row.id, 'email', e.target.value)
                                  }
                                  placeholder="email@gmail.com"
                                  className="w-full h-7 px-2 rounded border border-line bg-surface text-xs text-ink focus:outline-none focus:border-ink disabled:bg-sunken disabled:text-ink-3"
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
                          <td key={col.key} className={cellBaseClass} title={cellTitle}>
                            <input
                              type="text"
                              disabled={!cellEditable}
                              value={String(row[col.key] ?? '')}
                              onChange={(e) =>
                                handleCellChange(row.id, col.key, e.target.value)
                              }
                              placeholder={col.header}
                              className="w-full h-7 px-2 rounded border border-line bg-surface text-xs text-ink focus:outline-none focus:border-ink disabled:bg-sunken disabled:text-ink-3"
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
        size="xl"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5 p-3 rounded-lg bg-sunken border border-line">
            <Field label="Đợt (Cột C)" className="md:col-span-2" labelClassName="whitespace-nowrap">
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

            <Field label="Sản phẩm (Cột K)" className="md:col-span-4" labelClassName="whitespace-nowrap">
              <Input
                value={quickProduct}
                onChange={(e) => setQuickProduct(e.target.value)}
                placeholder={
                  activeStoreObj?.mainProducts?.[0] || 'Nhập tên sản phẩm...'
                }
              />
            </Field>

            <Field label="Content tag (Cột G)" className="md:col-span-3" labelClassName="whitespace-nowrap">
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

            <Field label="Đề xuất UpBase (Cột R)" className="md:col-span-3" labelClassName="whitespace-nowrap">
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

      {/* Modal 1: Đẩy dữ liệu lên Google Sheet & Báo cáo Review Đối soát 2 bên (App ↔ Google Sheet) */}
      <Modal
        open={isPushSheetModalOpen}
        onClose={() => setIsPushSheetModalOpen(false)}
        title={`Đẩy dữ liệu lên Google Sheet & Báo cáo Đối soát 2 bên — "${activeStoreName}"`}
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsPushSheetModalOpen(false)}>
              Đóng
            </Button>
            <Button
              variant="secondary"
              icon={RefreshCw}
              disabled={pushBusy || !pushSheetUrl.trim()}
              onClick={() => void handleRunPushDiffPreview()}
            >
              {pushBusy ? 'Đang so sánh…' : '1. So sánh dữ liệu 2 bên'}
            </Button>
            <Button
              variant="primary"
              icon={Upload}
              disabled={pushBusy || !pushDiffReport || !canPushToGoogleSheet}
              onClick={() => void handleConfirmPushSheet()}
            >
              {pushBusy
                ? 'Đang đẩy…'
                : `2. Xác nhận Đẩy lên Google Sheet (${
                    pushDiffReport
                      ? pushDiffReport.added + pushDiffReport.updated
                      : getTargetRowsForPush(pushScope).length
                  } dòng thay đổi)`}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          {!canPushToGoogleSheet && (
            <div className="p-2.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800">
              Bạn đang ở vai trò <strong>Booking Support</strong>. Bạn có thể chạy bước{' '}
              <strong>1. So sánh dữ liệu 2 bên</strong> để kiểm tra trước, nhưng bước{' '}
              <strong>2. Xác nhận Đẩy lên Google Sheet</strong> cần do{' '}
              <strong>PIC Chính ({storeAssignment.primaryPic})</strong> hoặc Quản trị viên thực hiện.
            </div>
          )}

          {/* Chọn phạm vi đẩy: Đẩy dòng đang tích chọn vs Đẩy cả bảng */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 p-3 rounded-lg bg-sunken border border-line">
            <Field label="Phạm vi dòng đẩy lên Google Sheet">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPushScope('SELECTED_ONLY');
                    setPushDiffReport(null);
                    if (pushSheetUrl.trim() && selectedRowIds.length > 0) {
                      void handleRunPushDiffPreview(
                        pushSheetUrl,
                        pushSheetTab,
                        'SELECTED_ONLY',
                        pushColMode
                      );
                    }
                  }}
                  className={`px-3 py-2 rounded-md border text-left transition-colors ${
                    pushScope === 'SELECTED_ONLY'
                      ? 'bg-ink text-white border-ink font-semibold'
                      : 'bg-surface text-ink border-line hover:bg-sunken'
                  }`}
                >
                  <div>Chỉ đẩy các dòng chọn</div>
                  <div
                    className={`text-2xs ${
                      pushScope === 'SELECTED_ONLY' ? 'text-white/80' : 'text-ink-3'
                    }`}
                  >
                    Đang tích chọn: {selectedRowIds.length} dòng
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPushScope('ALL_ROWS');
                    setPushDiffReport(null);
                    if (pushSheetUrl.trim()) {
                      void handleRunPushDiffPreview(
                        pushSheetUrl,
                        pushSheetTab,
                        'ALL_ROWS',
                        pushColMode
                      );
                    }
                  }}
                  className={`px-3 py-2 rounded-md border text-left transition-colors ${
                    pushScope === 'ALL_ROWS'
                      ? 'bg-ink text-white border-ink font-semibold'
                      : 'bg-surface text-ink border-line hover:bg-sunken'
                  }`}
                >
                  <div>Đẩy cả bảng hiện tại</div>
                  <div
                    className={`text-2xs ${
                      pushScope === 'ALL_ROWS' ? 'text-white/80' : 'text-ink-3'
                    }`}
                  >
                    Toàn bộ: {displayedRows.length} dòng
                  </div>
                </button>
              </div>
            </Field>

            <Field label="Cấu trúc cột đẩy lên Google Sheet">
              <Select
                value={pushColMode}
                onChange={(e) => {
                  const nextMode = e.target.value as 'BRAND_WORKING_32' | 'ALL_VISIBLE';
                  setPushColMode(nextMode);
                  setPushDiffReport(null);
                  if (pushSheetUrl.trim()) {
                    void handleRunPushDiffPreview(
                      pushSheetUrl,
                      pushSheetTab,
                      pushScope,
                      nextMode
                    );
                  }
                }}
              >
                <option value="BRAND_WORKING_32">
                  Bản gửi Brand chuẩn Google Sheet Template (32 cột Working file)
                </option>
                <option value="ALL_VISIBLE">
                  Toàn bộ các cột đang bật ({visibleColumns.length} cột)
                </option>
              </Select>
            </Field>
          </div>

          {/* Link Google Sheet & Tên Tab đích */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
            <div className="md:col-span-8">
              <Field label="Link Google Sheet của gian hàng">
                <div className="flex items-center gap-1.5">
                  <Input
                    value={pushSheetUrl}
                    onChange={(e) => {
                      setPushSheetUrl(e.target.value);
                      setPushDiffReport(null);
                    }}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={loadingSheetTabs || !pushSheetUrl.trim()}
                    onClick={() =>
                      void fetchTabsForSheetUrl(pushSheetUrl, pushSheetTab, (t) =>
                        setPushSheetTab(t)
                      )
                    }
                  >
                    {loadingSheetTabs ? 'Đang tải…' : 'Đọc Tab'}
                  </Button>
                </div>
              </Field>
            </div>

            <div className="md:col-span-4">
              <Field label="Tab đích trên Google Sheet">
                {availableSheetTabs.length > 0 ? (
                  <Select
                    value={pushSheetTab}
                    onChange={(e) => {
                      setPushSheetTab(e.target.value);
                      setPushDiffReport(null);
                    }}
                  >
                    {!availableSheetTabs.includes(pushSheetTab) && pushSheetTab && (
                      <option value={pushSheetTab}>{pushSheetTab} (Tạo mới nếu chưa có)</option>
                    )}
                    {availableSheetTabs.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    value={pushSheetTab}
                    onChange={(e) => {
                      setPushSheetTab(e.target.value);
                      setPushDiffReport(null);
                    }}
                    placeholder={defaultGoogleSheetTab}
                  />
                )}
              </Field>
            </div>
          </div>

          {/* Báo cáo Review Đối soát Dữ liệu 2 bên trước khi Đẩy */}
          <div className="border border-line rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-sunken border-b border-line flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-ink">
                Báo cáo Review Đối soát Dữ liệu 2 bên (App ↔ Google Sheet)
              </span>
              {pushDiffReport && (
                <div className="flex flex-wrap items-center gap-2 text-2xs">
                  <Status tone="positive">+{pushDiffReport.added} thêm mới</Status>
                  <Status tone="warning">{pushDiffReport.updated} cập nhật ô</Status>
                  <Status tone="neutral">{pushDiffReport.skipped} giữ nguyên</Status>
                  <span className="text-ink-3">
                    (Sheet hiện có {pushDiffReport.totalInSheet} dòng)
                  </span>
                </div>
              )}
            </div>

            {!pushDiffReport ? (
              <div className="p-6 text-center text-ink-3 space-y-2">
                <div>
                  {pushBusy
                    ? 'Đang đọc file Google Sheet và đối chiếu từng dòng KOC giữa 2 bên...'
                    : 'Nhấn nút "1. So sánh dữ liệu 2 bên" để hệ thống kiểm tra sự khác biệt giữa bảng App và file Google Sheet trước khi đẩy.'}
                </div>
              </div>
            ) : (
              <div className="space-y-2 p-3">
                <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-2xs text-emerald-900">
                  <strong>Cơ chế an toàn bảo vệ file Google Sheet:</strong> Hệ thống tuyệt đối{' '}
                  <strong>không xóa dòng</strong> đang có trên Sheet và{' '}
                  <strong>không ghi đè các cột của Brand</strong> (<em>Brand chọn</em>,{' '}
                  <em>Lý do từ chối</em>). Chỉ thêm dòng mới vào cuối bảng hoặc cập nhật các ô thông tin KOC có thay đổi.
                </div>

                <div className="max-h-72 overflow-y-auto border border-line rounded-md">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-sunken border-b border-line text-2xs font-semibold text-ink-2">
                      <tr>
                        <th className="py-2 px-2.5 w-[24%]">KOC (@ID kênh)</th>
                        <th className="py-2 px-2.5 w-[20%]">Hành động dự kiến</th>
                        <th className="py-2 px-2.5 w-[18%]">Trạng thái trên Sheet</th>
                        <th className="py-2 px-2.5 w-[38%]">Chi tiết thay đổi (Sheet hiện tại → App đẩy lên)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {pushDiffReport.diffs.map((d, idx) => (
                        <tr key={`${d.key}-${idx}`} className="hover:bg-sunken/40">
                          <td className="py-2 px-2.5 font-medium text-ink">
                            <div>@{d.handle || d.key}</div>
                            {d.kocName && d.kocName !== (d.handle || d.key) && (
                              <div className="text-2xs text-ink-3">{d.kocName}</div>
                            )}
                            {d.rowId && (
                              <div className="text-2xs font-mono text-ink-3">
                                RowID: {d.rowId.slice(-10)}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-2.5">
                            {d.action === 'ADD' && (
                              <Status tone="positive">+ Thêm dòng mới</Status>
                            )}
                            {d.action === 'UPDATE' && (
                              <div className="space-y-0.5">
                                <Status tone="warning">
                                  Cập nhật dòng #{d.sheetRowNum}
                                </Status>
                                <div className="text-2xs text-ink-3">
                                  {d.matchedBy === 'ROW_ID'
                                    ? 'Khớp chuẩn theo Row ID'
                                    : 'Khớp theo ID kênh'}
                                </div>
                              </div>
                            )}
                            {d.action === 'SKIP' && (
                              <div className="space-y-0.5">
                                <Status tone="neutral">
                                  Giữ nguyên dòng #{d.sheetRowNum}
                                </Status>
                                <div className="text-2xs text-ink-3">
                                  {d.matchedBy === 'ROW_ID'
                                    ? 'Khớp chuẩn theo Row ID'
                                    : 'Khớp theo ID kênh'}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-2.5 text-2xs">
                            {d.brandDecisionOnSheet ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
                                Brand: {d.brandDecisionOnSheet} (Giữ nguyên)
                              </span>
                            ) : d.action === 'ADD' ? (
                              <span className="text-ink-3">Chưa có trên Sheet</span>
                            ) : (
                              <span className="text-ink-3">Brand chưa điền</span>
                            )}
                          </td>
                          <td className="py-2 px-2.5 text-2xs">
                            {d.action === 'ADD' ? (
                              <span className="text-emerald-700 font-medium">
                                Ghi dòng KOC mới vào cuối tab &ldquo;{pushSheetTab || defaultGoogleSheetTab}&rdquo;
                              </span>
                            ) : d.fieldChanges.length === 0 ? (
                              <span className="text-ink-3">
                                Dữ liệu 2 bên giống nhau 100%, không cần ghi lại
                              </span>
                            ) : (
                              <div className="space-y-1">
                                {d.fieldChanges.map((fc, fIdx) => (
                                  <div key={fIdx} className="leading-snug">
                                    <strong className="text-ink">{fc.column}:</strong>{' '}
                                    <span className="line-through text-ink-3">
                                      {fc.sheetValue || '(Trống)'}
                                    </span>{' '}
                                    →{' '}
                                    <span className="font-semibold text-accent">
                                      {fc.appValue || '(Trống)'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal 2: Kéo dữ liệu từ Google Sheet & Báo cáo Tổng hợp Kết quả Brand Duyệt + SLA (Google Sheet ↔ App) */}
      <Modal
        open={isPullSheetModalOpen}
        onClose={() => setIsPullSheetModalOpen(false)}
        title={`Kéo dữ liệu từ Google Sheet & Báo cáo Kết quả Brand Duyệt — "${activeStoreName}"`}
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsPullSheetModalOpen(false)}>
              Đóng
            </Button>
            <Button
              variant="secondary"
              icon={RefreshCw}
              disabled={pullBusy || !pullSheetUrl.trim()}
              onClick={() => void handleRunPullDiffPreview()}
            >
              {pullBusy ? 'Đang đọc Sheet…' : '1. Đọc & So sánh lại'}
            </Button>
            <Button
              variant={
                pullDiffReport && pullDiffReport.brandSummary.totalApprovedOnSheetCount > 0
                  ? 'secondary'
                  : 'primary'
              }
              icon={Check}
              disabled={pullBusy || !pullDiffReport || selectedPullHandles.length === 0}
              onClick={() => handleConfirmApplyPullSheet(false)}
            >
              {`2. Cập nhật vào Bảng Listing (${selectedPullHandles.length})`}
            </Button>
            {pullDiffReport && pullDiffReport.brandSummary.totalApprovedOnSheetCount > 0 && (
              <Button
                variant="primary"
                icon={ArrowRight}
                disabled={pullBusy || selectedPullHandles.length === 0}
                onClick={() => handleConfirmApplyPullSheet(true)}
              >
                {`3. Cập nhật & Tạo Deal chuyển Bảng Deal (${
                  pullDiffReport.brandSummary.newlyApprovedCount > 0
                    ? `${pullDiffReport.brandSummary.newlyApprovedCount} KOC mới duyệt`
                    : `${pullDiffReport.brandSummary.totalApprovedOnSheetCount} KOC duyệt`
                })`}
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
            <div className="md:col-span-8">
              <Field label="Link Google Sheet của gian hàng">
                <div className="flex items-center gap-1.5">
                  <Input
                    value={pullSheetUrl}
                    onChange={(e) => {
                      setPullSheetUrl(e.target.value);
                      setPullDiffReport(null);
                    }}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={loadingSheetTabs || !pullSheetUrl.trim()}
                    onClick={() =>
                      void fetchTabsForSheetUrl(pullSheetUrl, pullSheetTab, (t) =>
                        setPullSheetTab(t)
                      )
                    }
                  >
                    {loadingSheetTabs ? 'Đang tải…' : 'Đọc Tab'}
                  </Button>
                </div>
              </Field>
            </div>

            <div className="md:col-span-4">
              <Field label="Tab cần kéo dữ liệu về">
                {availableSheetTabs.length > 0 ? (
                  <Select
                    value={pullSheetTab}
                    onChange={(e) => {
                      setPullSheetTab(e.target.value);
                      setPullDiffReport(null);
                    }}
                  >
                    {availableSheetTabs.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    value={pullSheetTab}
                    onChange={(e) => {
                      setPullSheetTab(e.target.value);
                      setPullDiffReport(null);
                    }}
                    placeholder={defaultGoogleSheetTab}
                  />
                )}
              </Field>
            </div>
          </div>

          <div className="border border-line rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-sunken border-b border-line flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-ink">
                Báo cáo Tổng hợp Kết quả Brand Duyệt &amp; Đối soát Thay đổi (Google Sheet → Bảng Listing)
              </span>
              {pullDiffReport && (
                <div className="flex flex-wrap items-center gap-2 text-2xs">
                  <Status tone="positive">
                    +{pullDiffReport.brandSummary.newlyApprovedCount} KOC Brand mới duyệt (Yes)
                  </Status>
                  <Status tone="warning">
                    {pullDiffReport.diffs.filter((d) => d.action === 'UPDATE_EXISTING').length} dòng có thay đổi
                  </Status>
                  <Status tone="neutral">
                    {pullDiffReport.diffs.filter((d) => d.action === 'UNCHANGED').length} dòng không đổi
                  </Status>
                </div>
              )}
            </div>

            {!pullDiffReport ? (
              <div className="p-6 text-center text-ink-3">
                {pullBusy
                  ? 'Đang đọc dữ liệu từ Google Sheet, tổng hợp kết quả Brand duyệt và đo lường SLA...'
                  : 'Nhấn nút "1. Đọc & So sánh lại" để xem báo cáo kết quả Brand duyệt và chi tiết thay đổi trước khi cập nhật vào bảng.'}
              </div>
            ) : (
              <div className="p-3 space-y-3">
                {/* 4 Khối Báo cáo Tổng hợp Kết quả Brand Duyệt & SLA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  <div className="rounded-lg border border-line bg-surface p-2.5 space-y-1">
                    <div className="text-2xs text-ink-3 font-medium">
                      1. KOC Brand mới duyệt (Yes)
                    </div>
                    <div className="text-base font-bold text-positive tabular-nums">
                      +{pullDiffReport.brandSummary.newlyApprovedCount} KOC mới duyệt
                    </div>
                    <div className="text-2xs text-ink-2 tabular-nums">
                      Ngân sách Net mới duyệt:{' '}
                      <strong className="text-ink">
                        {formatVnd(pullDiffReport.brandSummary.newlyApprovedNetBudget)}
                      </strong>{' '}
                      · Tổng Yes trên Sheet:{' '}
                      <strong>{pullDiffReport.brandSummary.totalApprovedOnSheetCount}</strong>
                    </div>
                  </div>

                  <div className="rounded-lg border border-line bg-surface p-2.5 space-y-1">
                    <div className="text-2xs text-ink-3 font-medium">
                      2. Từ chối (No) / Cân nhắc / Chờ duyệt
                    </div>
                    <div className="text-base font-bold text-ink tabular-nums">
                      +{pullDiffReport.brandSummary.newlyRejectedCount} Từ chối · +
                      {pullDiffReport.brandSummary.newlyConsideringCount} Cân nhắc
                    </div>
                    <div className="text-2xs text-ink-2 tabular-nums">
                      Còn chờ Brand phản hồi:{' '}
                      <strong className="text-ink">
                        {pullDiffReport.brandSummary.pendingOnSheetCount} KOC
                      </strong>
                    </div>
                  </div>

                  <div className="rounded-lg border border-line bg-surface p-2.5 space-y-1">
                    <div className="text-2xs text-ink-3 font-medium">
                      3. Thời gian Brand duyệt &amp; SLA (48h)
                    </div>
                    <div className="text-base font-bold text-accent tabular-nums">
                      {pullDiffReport.brandSummary.reviewedWithSlaCount > 0
                        ? `${pullDiffReport.brandSummary.onTimeSlaCount}/${pullDiffReport.brandSummary.reviewedWithSlaCount} đúng hạn (TB ${pullDiffReport.brandSummary.avgReviewHours}h)`
                        : 'Chưa có mốc duyệt'}
                    </div>
                    <div className="text-2xs text-ink-2 tabular-nums">
                      Trễ cam kết 48h:{' '}
                      <strong
                        className={
                          pullDiffReport.brandSummary.overdueSlaCount > 0
                            ? 'text-critical'
                            : 'text-ink'
                        }
                      >
                        {pullDiffReport.brandSummary.overdueSlaCount} KOC
                      </strong>
                    </div>
                  </div>

                  <div className="rounded-lg border border-line bg-surface p-2.5 space-y-1">
                    <div className="text-2xs text-ink-3 font-medium">
                      4. Chuyển tạo Deal sang Bảng Deal
                    </div>
                    <div className="text-base font-bold text-ink tabular-nums">
                      {pullDiffReport.brandSummary.readyForDealCreationCount} KOC sẵn sàng tạo Deal
                    </div>
                    <div className="text-2xs text-ink-2">
                      Bấm nút <strong>3. Cập nhật &amp; Tạo Deal</strong> bên dưới để sinh mã BO và chuyển sang Bảng Deal
                    </div>
                  </div>
                </div>

                {pullDiffReport.notOnSheetHandles.length > 0 && (
                  <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-2xs text-amber-900">
                    <strong>Lưu ý đối soát:</strong> Có{' '}
                    <strong>{pullDiffReport.notOnSheetHandles.length} KOC</strong> đang có trên bảng App nhưng chưa xuất hiện trên tab Google Sheet này:{' '}
                    <span className="font-mono">
                      {pullDiffReport.notOnSheetHandles.slice(0, 10).join(', ')}
                    </span>
                    . Các dòng này trên App sẽ được giữ nguyên.
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 text-2xs text-ink-2">
                  <div className="inline-flex items-center p-0.5 rounded-md bg-sunken border border-line">
                    <button
                      type="button"
                      onClick={() => setPullReportFilter('ALL')}
                      className={`px-2 py-1 rounded ${
                        pullReportFilter === 'ALL'
                          ? 'bg-surface text-ink font-semibold shadow-2xs'
                          : 'text-ink-2 hover:text-ink'
                      }`}
                    >
                      Tất cả ({pullDiffReport.diffs.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPullReportFilter('NEW_APPROVED_YES')}
                      className={`px-2 py-1 rounded ${
                        pullReportFilter === 'NEW_APPROVED_YES'
                          ? 'bg-surface text-positive font-semibold shadow-2xs'
                          : 'text-ink-2 hover:text-ink'
                      }`}
                    >
                      Brand mới duyệt Yes ({pullDiffReport.brandSummary.newlyApprovedCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPullReportFilter('BRAND_CHANGED')}
                      className={`px-2 py-1 rounded ${
                        pullReportFilter === 'BRAND_CHANGED'
                          ? 'bg-surface text-ink font-semibold shadow-2xs'
                          : 'text-ink-2 hover:text-ink'
                      }`}
                    >
                      Đổi trạng thái Brand (
                      {pullDiffReport.diffs.filter((d) => d.brandDecisionChanged).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPullReportFilter('ALL_CHANGED')}
                      className={`px-2 py-1 rounded ${
                        pullReportFilter === 'ALL_CHANGED'
                          ? 'bg-surface text-ink font-semibold shadow-2xs'
                          : 'text-ink-2 hover:text-ink'
                      }`}
                    >
                      Có thay đổi (
                      {pullDiffReport.diffs.filter((d) => d.action !== 'UNCHANGED').length})
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedPullHandles(
                          pullDiffReport.diffs
                            .filter((d) => d.isNewlyApprovedYes)
                            .map((d) => d.handle)
                        )
                      }
                      className="text-positive hover:underline font-semibold"
                    >
                      Chỉ chọn KOC mới duyệt Yes (
                      {pullDiffReport.brandSummary.newlyApprovedCount})
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedPullHandles(
                          pullDiffReport.diffs
                            .filter((d) => d.action !== 'UNCHANGED')
                            .map((d) => d.handle)
                        )
                      }
                      className="text-accent hover:underline font-medium"
                    >
                      Chọn tất cả dòng có thay đổi
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => setSelectedPullHandles([])}
                      className="text-ink-3 hover:underline"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto border border-line rounded-md">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-sunken border-b border-line text-2xs font-semibold text-ink-2">
                      <tr>
                        <th className="py-2 px-2 w-9 text-center">Chọn</th>
                        <th className="py-2 px-2.5 w-[22%]">KOC &amp; Sản phẩm</th>
                        <th className="py-2 px-2.5 w-[20%]">Kết quả Brand duyệt</th>
                        <th className="py-2 px-2.5 w-[24%]">Thời gian &amp; SLA Brand duyệt</th>
                        <th className="py-2 px-2.5 w-[28%]">Chi tiết thay đổi (Trên App → Từ Sheet)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {pullDiffReport.diffs
                        .filter((d) => {
                          if (pullReportFilter === 'NEW_APPROVED_YES') return d.isNewlyApprovedYes;
                          if (pullReportFilter === 'BRAND_CHANGED') return d.brandDecisionChanged;
                          if (pullReportFilter === 'ALL_CHANGED') return d.action !== 'UNCHANGED';
                          return true;
                        })
                        .map((d, idx) => {
                          const checked = selectedPullHandles.some(
                            (h) => h.toLowerCase() === d.handle.toLowerCase()
                          );
                          return (
                            <tr
                              key={`${d.handle}-${idx}`}
                              className={checked ? 'bg-accent-soft/20' : 'hover:bg-sunken/40'}
                            >
                              <td className="py-2 px-2 text-center">
                                <input
                                  type="checkbox"
                                  disabled={d.action === 'UNCHANGED'}
                                  checked={checked}
                                  onChange={() =>
                                    setSelectedPullHandles((prev) =>
                                      checked
                                        ? prev.filter(
                                            (h) => h.toLowerCase() !== d.handle.toLowerCase()
                                          )
                                        : [...prev, d.handle]
                                    )
                                  }
                                  className="rounded border-line"
                                />
                              </td>
                              <td className="py-2 px-2.5 font-medium text-ink">
                                <div>@{d.handle}</div>
                                {d.kocName && d.kocName !== d.handle && (
                                  <div className="text-2xs text-ink-3">{d.kocName}</div>
                                )}
                                <div className="text-2xs text-ink-2 truncate max-w-[180px]">
                                  {d.sanPham || 'Chưa gắn SP'} ·{' '}
                                  <strong className="tabular-nums">{formatVnd(d.netFee)}</strong>
                                </div>
                              </td>
                              <td className="py-2 px-2.5 text-2xs">
                                <div className="space-y-1">
                                  {d.isNewlyApprovedYes ? (
                                    <Status tone="positive">
                                      {`${d.prevBrandDecision || 'Chờ duyệt'} → Yes (Mới duyệt)`}
                                    </Status>
                                  ) : d.isNewlyRejectedNo ? (
                                    <Status tone="critical">
                                      {`${d.prevBrandDecision || 'Chờ duyệt'} → No (Từ chối)`}
                                    </Status>
                                  ) : d.isNewlyConsidering ? (
                                    <Status tone="warning">
                                      {`${d.prevBrandDecision || 'Chờ duyệt'} → Cân nhắc`}
                                    </Status>
                                  ) : d.brandDecisionOnSheet === 'Yes' ? (
                                    <Status tone="positive">Đã duyệt: Yes</Status>
                                  ) : d.brandDecisionOnSheet === 'No' ? (
                                    <Status tone="critical">Đã từ chối: No</Status>
                                  ) : (
                                    <Status tone="neutral">
                                      {d.brandDecisionOnSheet || 'Chờ Brand duyệt'}
                                    </Status>
                                  )}
                                  {d.lyDoTuChoi && (
                                    <div className="text-2xs text-ink-2">
                                      Ghi chú/Lý do: <strong>{d.lyDoTuChoi}</strong>
                                    </div>
                                  )}
                                  {d.existingMaBooking && (
                                    <div className="text-2xs font-mono text-accent">
                                      Đã có Deal: {d.existingMaBooking}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-2.5 text-2xs">
                                <div className="space-y-0.5 tabular-nums">
                                  <div className="text-ink-3">
                                    Listing: <span className="text-ink">{d.listingTime || '—'}</span>
                                  </div>
                                  <div className="text-ink-3">
                                    Duyệt:{' '}
                                    <strong className="text-ink">
                                      {d.brandReviewTime || 'Chưa phản hồi'}
                                    </strong>
                                  </div>
                                  <div className="pt-0.5">
                                    <Status
                                      tone={
                                        d.slaStatus === 'ON_TIME'
                                          ? 'positive'
                                          : d.slaStatus === 'OVERDUE' ||
                                              d.slaStatus === 'WAITING_OVERDUE'
                                            ? 'critical'
                                            : 'warning'
                                      }
                                    >
                                      {d.slaLabel}
                                    </Status>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2 px-2.5 text-2xs">
                                {d.fieldChanges.length === 0 ? (
                                  <span className="text-ink-3">
                                    Dữ liệu trên Sheet và trên App giống hệt nhau
                                  </span>
                                ) : (
                                  <div className="space-y-1">
                                    {d.fieldChanges.map((fc, fIdx) => (
                                      <div key={fIdx} className="leading-snug">
                                        <strong className="text-ink">{fc.label}:</strong>{' '}
                                        <span className="line-through text-ink-3">
                                          {fc.appValue}
                                        </span>{' '}
                                        →{' '}
                                        <span className="font-semibold text-emerald-700">
                                          {fc.sheetValue}
                                        </span>
                                      </div>
                                    ))}
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
            )}
          </div>
        </div>
      </Modal>

      {/* Modal 2B: Tạo các Deal từ KOC Brand đã duyệt & Chuyển sang Bảng Deal */}
      <Modal
        open={isCreateDealsModalOpen}
        onClose={() => setIsCreateDealsModalOpen(false)}
        title={`Tạo các Deal từ KOC Brand đã duyệt & Chuyển sang Bảng Deal — "${activeStoreName}" (${activeMonth})`}
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsCreateDealsModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="secondary"
              icon={Check}
              disabled={dealDrafts.filter((d) => d.selected).length === 0}
              onClick={() => handleConfirmCreateDealsAndOpenBoard(false)}
            >
              {`Chỉ tạo Deal tại chỗ (${dealDrafts.filter((d) => d.selected).length} Deal)`}
            </Button>
            <Button
              variant="primary"
              icon={ArrowRight}
              disabled={dealDrafts.filter((d) => d.selected).length === 0}
              onClick={() => handleConfirmCreateDealsAndOpenBoard(true)}
            >
              {`Xác nhận Tạo ${dealDrafts.filter((d) => d.selected).length} Deal & Chuyển sang Bảng Deal`}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          {/* Thanh tóm tắt số lượng Deal, Ngân sách Net/Gross và SLA Brand duyệt */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="rounded-lg border border-line bg-sunken p-2.5 space-y-0.5">
              <div className="text-2xs text-ink-3">Số KOC Brand duyệt chọn tạo Deal</div>
              <div className="text-base font-bold text-ink tabular-nums">
                {dealDrafts.filter((d) => d.selected).length} / {dealDrafts.length} KOC đã duyệt
              </div>
              <div className="text-2xs text-ink-2">
                Tạo mới:{' '}
                <strong>
                  {dealDrafts.filter((d) => d.selected && !d.isExistingBo).length} Deal
                </strong>{' '}
                · Cập nhật Deal đã có:{' '}
                <strong>
                  {dealDrafts.filter((d) => d.selected && d.isExistingBo).length} Deal
                </strong>
              </div>
            </div>

            <div className="rounded-lg border border-line bg-sunken p-2.5 space-y-0.5">
              <div className="text-2xs text-ink-3">Tổng Ngân sách Chốt (Net / Gross kèm thuế)</div>
              <div className="text-base font-bold text-positive tabular-nums">
                {formatVnd(
                  dealDrafts
                    .filter((d) => d.selected)
                    .reduce((s, d) => s + (Number(d.giaChotCuoi) || 0), 0)
                )}
              </div>
              <div className="text-2xs text-ink-2 tabular-nums">
                Tổng Gross (kèm thuế TNCN 10%):{' '}
                <strong className="text-accent">
                  {formatVnd(
                    dealDrafts
                      .filter((d) => d.selected)
                      .reduce(
                        (s, d) => s + computeGrossFeeWithTax(Number(d.giaChotCuoi) || 0),
                        0
                      )
                  )}
                </strong>
              </div>
            </div>

            <div className="rounded-lg border border-line bg-sunken p-2.5 space-y-0.5">
              <div className="text-2xs text-ink-3">Đồng bộ Tự động sau khi tạo Deal</div>
              <div className="text-2xs text-ink-2 leading-relaxed">
                Hệ thống tự động cấp mã <strong>BO...</strong>, tạo Hợp đồng khung &amp; Phụ lục Deal, đồng bộ sang <strong>Bảng Deal &amp; Nghiệm thu</strong> và gắn ngược mã BO về dòng Listing.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-2xs text-ink-2">
            <span>
              Kiểm tra và chỉnh sửa nhanh Sản phẩm, Chi phí Net chốt cuối hoặc Ngày Air dự kiến trước khi chuyển sang Bảng Deal:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setDealDrafts((prev) =>
                    prev.map((d) => ({ ...d, selected: !d.isExistingBo }))
                  )
                }
                className="text-positive hover:underline font-semibold"
              >
                Chọn các KOC chưa có mã Deal (
                {dealDrafts.filter((d) => !d.isExistingBo).length})
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() =>
                  setDealDrafts((prev) => prev.map((d) => ({ ...d, selected: true })))
                }
                className="text-accent hover:underline font-medium"
              >
                Chọn tất cả ({dealDrafts.length})
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() =>
                  setDealDrafts((prev) => prev.map((d) => ({ ...d, selected: false })))
                }
                className="text-ink-3 hover:underline"
              >
                Bỏ chọn
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto border border-line rounded-md">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-sunken border-b border-line text-2xs font-semibold text-ink-2">
                <tr>
                  <th className="py-2 px-2 w-9 text-center">Chọn</th>
                  <th className="py-2 px-2.5 w-[20%]">KOC (@ID kênh)</th>
                  <th className="py-2 px-2.5 w-[18%]">TG Brand duyệt &amp; SLA</th>
                  <th className="py-2 px-2.5 w-[16%]">Mã Deal (BO)</th>
                  <th className="py-2 px-2.5 w-[20%]">Sản phẩm chốt</th>
                  <th className="py-2 px-2.5 w-[13%]">Giá Net chốt (đ)</th>
                  <th className="py-2 px-2.5 w-[13%]">Ngày Air dự kiến</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {dealDrafts.map((draft, idx) => (
                  <tr
                    key={draft.rowId}
                    className={draft.selected ? 'bg-accent-soft/20' : 'hover:bg-sunken/40'}
                  >
                    <td className="py-2 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={draft.selected}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setDealDrafts((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, selected: checked } : item
                            )
                          );
                        }}
                        className="rounded border-line"
                      />
                    </td>
                    <td className="py-2 px-2.5">
                      <div className="font-semibold text-ink">@{draft.idKenh}</div>
                      <div className="text-2xs text-ink-3">
                        {draft.tenKenh} · {draft.dot}
                      </div>
                      <div className="text-2xs text-ink-3">PIC: {draft.nhanSuDien}</div>
                    </td>
                    <td className="py-2 px-2.5 text-2xs tabular-nums">
                      <div className="text-ink font-medium">{draft.ngayBrandDuyet || '—'}</div>
                      <div className="text-ink-3">Listing: {draft.ngayDien || '—'}</div>
                      <div className="pt-0.5">
                        <Status
                          tone={
                            draft.slaBrandDuyet.startsWith('Trễ') ? 'critical' : 'positive'
                          }
                        >
                          {draft.slaBrandDuyet || 'Đúng hạn'}
                        </Status>
                      </div>
                    </td>
                    <td className="py-2 px-2.5">
                      <input
                        type="text"
                        value={draft.maBooking}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDealDrafts((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, maBooking: val } : item
                            )
                          );
                        }}
                        className="w-full h-7 px-2 text-xs font-mono font-semibold rounded border border-line-strong bg-surface text-accent"
                      />
                      <div className="text-2xs mt-0.5">
                        {draft.isExistingBo ? (
                          <span className="text-ink-3">Đã có trên Bảng Deal</span>
                        ) : (
                          <span className="text-positive font-medium">+ Tạo mới Deal</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2.5">
                      <input
                        type="text"
                        value={draft.sanPham}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDealDrafts((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, sanPham: val } : item
                            )
                          );
                        }}
                        placeholder="Nhập tên sản phẩm..."
                        className="w-full h-7 px-2 text-xs rounded border border-line-strong bg-surface text-ink"
                      />
                    </td>
                    <td className="py-2 px-2.5">
                      <input
                        type="number"
                        step={50000}
                        value={draft.giaChotCuoi}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          setDealDrafts((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, giaChotCuoi: val } : item
                            )
                          );
                        }}
                        className="w-full h-7 px-2 text-xs font-semibold tabular-nums rounded border border-line-strong bg-surface text-ink"
                      />
                      <div className="text-2xs text-ink-3 tabular-nums mt-0.5">
                        Gross: {formatVnd(computeGrossFeeWithTax(draft.giaChotCuoi))}
                      </div>
                    </td>
                    <td className="py-2 px-2.5">
                      <input
                        type="date"
                        value={draft.ngayAirChot}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDealDrafts((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, ngayAirChot: val } : item
                            )
                          );
                        }}
                        className="w-full h-7 px-2 text-xs tabular-nums rounded border border-line-strong bg-surface text-ink"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* Modal 3: Thiết lập Hiển thị & Sắp xếp File Google Sheet (Ẩn tháng, Ẩn cột Template, Sort SP/NV & Filter Views) */}
      <Modal
        open={isSheetTemplateModalOpen}
        onClose={() => setIsSheetTemplateModalOpen(false)}
        title={`Thiết lập Hiển thị & Sắp xếp File Google Sheet — "${activeStoreName}"`}
        size="xl"
        footer={
          <Button variant="ghost" onClick={() => setIsSheetTemplateModalOpen(false)}>
            Đóng
          </Button>
        }
      >
        <div className="space-y-4 text-xs">
          {/* Thông tin cơ chế Row ID bảo vệ đồng bộ */}
          <div className="rounded-lg border border-line bg-sunken p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="font-semibold text-ink flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-accent shrink-0" />
                <span>Cơ chế nhận diện dòng bằng Mã dòng (Row ID) tự động</span>
              </div>
              <div className="text-2xs text-ink-2">
                Mỗi dòng KOC đẩy lên Google Sheet đều gắn sẵn một <strong>Mã dòng (Row ID)</strong> duy nhất (được tự động ẩn trên Google Sheet). Nhờ đó, dù bạn có <strong>Sort (Sắp xếp)</strong> file Google Sheet theo Sản phẩm hay theo Nhân sự điền, hoặc 1 KOC book nhiều sản phẩm, hệ thống vẫn nhận diện chính xác 100% từng dòng khi Đẩy/Kéo.
              </div>
            </div>
            {currentGoogleSheetUrl && (
              <a
                href={currentGoogleSheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-surface border border-line-strong text-accent font-semibold hover:bg-sunken shrink-0"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Mở File Google Sheet</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Chọn Tab đang thao tác cho mục Ẩn cột & Sort */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-8">
              <Field label="Chọn Tab (Tháng / Đợt) trên Google Sheet để điều khiển Cột & Sắp xếp">
                <Select
                  value={sheetTemplateActiveTab}
                  onChange={(e) => setSheetTemplateActiveTab(e.target.value)}
                >
                  {availableSheetTabs.length > 0 ? (
                    availableSheetTabs.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))
                  ) : (
                    <option value={defaultGoogleSheetTab}>{defaultGoogleSheetTab}</option>
                  )}
                </Select>
              </Field>
            </div>
            <div className="md:col-span-4">
              <Button
                variant="secondary"
                size="sm"
                icon={RefreshCw}
                disabled={loadingSheetTabs || sheetTemplateBusy}
                onClick={() =>
                  void fetchTabsForSheetUrl(
                    currentGoogleSheetUrl,
                    sheetTemplateActiveTab,
                    (t) => setSheetTemplateActiveTab(t)
                  )
                }
              >
                {loadingSheetTabs ? 'Đang tải danh sách Tab…' : 'Làm mới danh sách Tab'}
              </Button>
            </div>
          </div>

          {/* MỤC 1: ẨN / HIỆN CÁC TAB THÁNG TRÊN FILE GOOGLE SHEET */}
          <div className="border border-line rounded-lg p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-semibold text-ink">
                  1. Ẩn / Hiện các Tab Tháng trên File Google Sheet ({sheetTabsDetail.length} Tab)
                </div>
                <div className="text-2xs text-ink-3">
                  Ẩn bớt các tab tháng cũ để Brand mở file Google Sheet nhìn gọn gàng, chỉ tập trung vào tháng đang chạy.
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={sheetTemplateBusy || sheetTabsDetail.length <= 1}
                  onClick={handleHideOldMonthTabsDraft}
                >
                  Chỉ giữ tháng {activeMonth} &amp; chọn ẩn tháng cũ
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  disabled={sheetTemplateBusy || sheetTabsDetail.length === 0}
                  onClick={() =>
                    void runSheetTemplatePatch(
                      {
                        tabVisibility: sheetTabsDetail.map((t) => ({
                          title: t.title,
                          hidden: t.hidden,
                        })),
                      },
                      'Đã cập nhật ẩn/hiện các Tab Tháng trên file Google Sheet.'
                    )
                  }
                >
                  {sheetTemplateBusy ? 'Đang lưu…' : 'Áp dụng ẩn/hiện Tab lên Sheet'}
                </Button>
              </div>
            </div>

            {sheetTabsDetail.length === 0 ? (
              <div className="text-2xs text-ink-3 py-2">
                Chưa tải được danh sách Tab hoặc file Google Sheet chưa chia sẻ quyền cho Service Account.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
                {sheetTabsDetail.map((t) => (
                  <label
                    key={t.sheetId}
                    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md border cursor-pointer select-none ${
                      t.hidden
                        ? 'bg-sunken border-line text-ink-3'
                        : 'bg-surface border-line-strong text-ink font-medium'
                    }`}
                  >
                    <span className="truncate text-2xs" title={t.title}>
                      {t.title}
                    </span>
                    <input
                      type="checkbox"
                      checked={!t.hidden}
                      onChange={(e) =>
                        handleToggleSingleSheetTabHidden(t.title, !e.target.checked)
                      }
                      className="rounded border-line"
                    />
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* MỤC 2: ẨN / HIỆN CÁC NHÓM CỘT TRÊN FILE GOOGLE SHEET (VÌ DÙNG CHUNG 1 TEMPLATE) */}
          <div className="border border-line rounded-lg p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-semibold text-ink">
                  2. Ẩn / Hiện các Cột trên File Google Sheet (Template chung 42 cột)
                </div>
                <div className="text-2xs text-ink-3">
                  Vì dùng chung 1 Template cho cả Listing, Đi Air và Nghiệm thu, bạn có thể chọn chế độ để ẩn các cột chưa dùng tới hoặc cột nội bộ (Zalo, STK, CCCD, RowID) ngay trên file Google Sheet.
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                disabled={sheetTemplateBusy}
                onClick={() =>
                  void runSheetTemplatePatch(
                    { columnPreset: sheetColumnPresetMode },
                    `Đã áp dụng chế độ hiển thị cột "${sheetColumnPresetMode}" trên tab "${
                      sheetTemplateActiveTab || defaultGoogleSheetTab
                    }".`
                  )
                }
              >
                {sheetTemplateBusy ? 'Đang áp dụng…' : 'Áp dụng ẩn/hiện Cột lên Sheet'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <label
                className={`p-2.5 rounded-md border cursor-pointer flex items-start gap-2 ${
                  sheetColumnPresetMode === 'BRAND_REVIEW'
                    ? 'border-ink bg-accent-soft/20'
                    : 'border-line bg-surface'
                }`}
              >
                <input
                  type="radio"
                  name="sheetColPreset"
                  checked={sheetColumnPresetMode === 'BRAND_REVIEW'}
                  onChange={() => setSheetColumnPresetMode('BRAND_REVIEW')}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-semibold text-ink">
                    1. Gửi Brand duyệt Listing
                  </div>
                  <div className="text-2xs text-ink-3">
                    Hiện các cột KOC, Chỉ số kênh, Sản phẩm, Giá, Brand chọn; tự động <strong>ẩn</strong> cột Liên hệ/STK/CCCD, cột Nghiệm thu và cột RowID.
                  </div>
                </div>
              </label>

              <label
                className={`p-2.5 rounded-md border cursor-pointer flex items-start gap-2 ${
                  sheetColumnPresetMode === 'AIR_ACCEPTANCE'
                    ? 'border-ink bg-accent-soft/20'
                    : 'border-line bg-surface'
                }`}
              >
                <input
                  type="radio"
                  name="sheetColPreset"
                  checked={sheetColumnPresetMode === 'AIR_ACCEPTANCE'}
                  onChange={() => setSheetColumnPresetMode('AIR_ACCEPTANCE')}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-semibold text-ink">
                    2. Theo dõi Đi Air &amp; Nghiệm thu
                  </div>
                  <div className="text-2xs text-ink-3">
                    Mở hiển thị thêm các cột Link Air, Ngày Air thực tế, Views/GMV nghiệm thu 30 ngày; vẫn <strong>ẩn</strong> cột Liên hệ/STK/CCCD và RowID.
                  </div>
                </div>
              </label>

              <label
                className={`p-2.5 rounded-md border cursor-pointer flex items-start gap-2 ${
                  sheetColumnPresetMode === 'FULL_TEMPLATE'
                    ? 'border-ink bg-accent-soft/20'
                    : 'border-line bg-surface'
                }`}
              >
                <input
                  type="radio"
                  name="sheetColPreset"
                  checked={sheetColumnPresetMode === 'FULL_TEMPLATE'}
                  onChange={() => setSheetColumnPresetMode('FULL_TEMPLATE')}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-semibold text-ink">
                    3. Mở toàn bộ cột Template
                  </div>
                  <div className="text-2xs text-ink-3">
                    Hiện toàn bộ 42 cột dữ liệu trên file Google Sheet (chỉ ẩn gọn cột kỹ thuật Mã dòng RowID).
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* MỤC 3: NÚT SORT THEO SẢN PHẨM / NHÂN SỰ & GẮN BỘ LỌC TRÊN FILE GOOGLE SHEET */}
          <div className="border border-line rounded-lg p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-semibold text-ink">
                  3. Sắp xếp (Sort) theo Sản phẩm / Nhân sự &amp; Gắn Nút Lọc trên File Google Sheet
                </div>
                <div className="text-2xs text-ink-3">
                  Bấm để sắp xếp trực tiếp các dòng trên file Google Sheet hoặc cài sẵn nút phễu lọc + 4 Chế độ xem nhanh (Filter Views) vào menu <em>Dữ liệu → Chế độ xem bộ lọc</em> của Google Sheet.
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                disabled={sheetTemplateBusy}
                onClick={() =>
                  void runSheetTemplatePatch(
                    { installFilterViews: true },
                    'Đã bật nút Lọc ở dòng tiêu đề và tạo sẵn 4 Chế độ xem (Filter Views: Theo Sản phẩm, Theo Nhân sự, Theo Đợt, Brand chọn Yes) trên Google Sheet!'
                  )
                }
              >
                Gắn Nút Lọc &amp; 4 Filter Views vào Google Sheet
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                size="sm"
                variant="secondary"
                disabled={sheetTemplateBusy}
                onClick={() =>
                  void runSheetTemplatePatch(
                    { sortBy: 'PRODUCT', installFilterViews: true },
                    'Đã sắp xếp file Google Sheet theo Sản phẩm (A → Z)!'
                  )
                }
              >
                Sort Google Sheet theo Sản phẩm (A → Z)
              </Button>

              <Button
                size="sm"
                variant="secondary"
                disabled={sheetTemplateBusy}
                onClick={() =>
                  void runSheetTemplatePatch(
                    { sortBy: 'STAFF', installFilterViews: true },
                    'Đã sắp xếp file Google Sheet theo Nhân sự điền (A → Z)!'
                  )
                }
              >
                Sort Google Sheet theo Nhân sự điền (A → Z)
              </Button>

              <Button
                size="sm"
                variant="secondary"
                disabled={sheetTemplateBusy}
                onClick={() =>
                  void runSheetTemplatePatch(
                    { sortBy: 'BATCH', installFilterViews: true },
                    'Đã sắp xếp file Google Sheet theo Đợt Listing!'
                  )
                }
              >
                Sort Google Sheet theo Đợt Listing
              </Button>

              <Button
                size="sm"
                variant="secondary"
                disabled={sheetTemplateBusy}
                onClick={() =>
                  void runSheetTemplatePatch(
                    { sortBy: 'BRAND_DECISION', installFilterViews: true },
                    'Đã gom các dòng KOC Brand chọn (Yes) lên đầu file Google Sheet!'
                  )
                }
              >
                Gom KOC Brand chọn (Yes) lên đầu Sheet
              </Button>
            </div>
          </div>
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
