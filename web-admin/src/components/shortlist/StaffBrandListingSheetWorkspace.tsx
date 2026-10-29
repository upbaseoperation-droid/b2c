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
  Eye,
  FileSpreadsheet,
  FileText,
  Key,
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
import { formatNumber, formatVnd, formatVndShort } from '../../lib/format';
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
  buildStaffListingRowFromListingItem,
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
import { KocQuickViewModal } from './KocQuickViewModal';
import {
  BrandProductDropdownInput,
  buildBrandProductCatalogGroups,
} from './BrandProductDropdownInput';
import { ActionMenu, Avatar, Button, Field, Input, Modal, PageActions, Person, Select, Status } from '../ui';
import { PushSheetReconciliationView, type PushSheetReconciliationReport } from './PushSheetReconciliationView';

const BRAND_REVIEW_PRIORITY_KEYS: StaffListingColumnKey[] = [
  'idKenh',
  'tenKenh',
  'sanPham',
  'tepKenh',
  'contentTag',
  'tepBooking',
  'giaNetVideo',
  'phiBookingKemThue',
  'deXuatUpBase',
  'brandChon',
  'lyDoTuChoi',
  'contentNote',
  'slaBrandDuyet',
  'ngayBrandDuyet',
  'ngayDien',
  'nhanSuDien',
  'dot',
];

const parseThousandNumberInput = (raw: string): number => {
  const digits = String(raw || '').replace(/[^\d]/g, '');
  return digits ? Number(digits) || 0 : 0;
};

interface BufferedSheetTextInputProps {
  value: string;
  onCommit: (nextValue: string) => void;
  onBlurAfterCommit?: () => void;
  onDoubleClick?: () => void;
  disabled?: boolean;
  readOnly?: boolean;
  type?: 'text' | 'email' | 'url';
  placeholder?: string;
  className?: string;
}

const BufferedSheetTextInput = React.memo<BufferedSheetTextInputProps>(function BufferedSheetTextInput({
  value,
  onCommit,
  onBlurAfterCommit,
  onDoubleClick,
  disabled,
  readOnly,
  type = 'text',
  placeholder,
  className,
}) {
  const [draft, setDraft] = useState(value);
  const focusedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestCommittedRef = useRef(value);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  useEffect(() => {
    latestCommittedRef.current = value;
    if (!focusedRef.current) {
      setDraft(value);
    }
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const flushCommit = (valToCommit: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (valToCommit !== latestCommittedRef.current) {
      latestCommittedRef.current = valToCommit;
      onCommitRef.current(valToCommit);
    }
  };

  return (
    <input
      type={type}
      disabled={disabled}
      readOnly={readOnly}
      value={draft}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onChange={(e) => {
        const nextVal = e.target.value;
        setDraft(nextVal);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          if (nextVal !== latestCommittedRef.current) {
            latestCommittedRef.current = nextVal;
            onCommitRef.current(nextVal);
          }
        }, 160);
      }}
      onBlur={() => {
        focusedRef.current = false;
        flushCommit(draft);
        onBlurAfterCommit?.();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          flushCommit(draft);
        }
      }}
      onDoubleClick={onDoubleClick}
      placeholder={placeholder}
      className={className}
    />
  );
});

interface BufferedSheetNumberInputProps {
  value: number;
  onCommit: (nextValue: number) => void;
  disabled?: boolean;
  readOnly?: boolean;
  mode?: 'thousand' | 'percent';
  className?: string;
}

const BufferedSheetNumberInput = React.memo<BufferedSheetNumberInputProps>(function BufferedSheetNumberInput({
  value,
  onCommit,
  disabled,
  readOnly,
  mode = 'thousand',
  className,
}) {
  const formatVal = (v: number) =>
    mode === 'thousand' ? formatNumber(Number(v) || 0) : String(Number(v) || 0);
  const [draft, setDraft] = useState(() => formatVal(value));
  const focusedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestCommittedRef = useRef(Number(value) || 0);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  useEffect(() => {
    const num = Number(value) || 0;
    latestCommittedRef.current = num;
    if (!focusedRef.current) {
      setDraft(formatVal(num));
    }
  }, [value, mode]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const parseDraft = (raw: string): number =>
    mode === 'thousand' ? parseThousandNumberInput(raw) : Number(raw) || 0;

  const flushCommit = (raw: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const parsed = parseDraft(raw);
    if (parsed !== latestCommittedRef.current) {
      latestCommittedRef.current = parsed;
      onCommitRef.current(parsed);
    }
    setDraft(formatVal(parsed));
  };

  return (
    <input
      type={mode === 'percent' ? 'number' : 'text'}
      step={mode === 'percent' ? '0.1' : undefined}
      inputMode="numeric"
      disabled={disabled}
      readOnly={readOnly}
      value={draft}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onChange={(e) => {
        const raw = e.target.value;
        const parsed = parseDraft(raw);
        setDraft(mode === 'thousand' ? formatNumber(parsed) : raw);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          if (parsed !== latestCommittedRef.current) {
            latestCommittedRef.current = parsed;
            onCommitRef.current(parsed);
          }
        }, 160);
      }}
      onBlur={() => {
        focusedRef.current = false;
        flushCommit(draft);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          flushCommit(draft);
        }
      }}
      className={className}
    />
  );
});

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
  onOpenCreateDealWorkspace?: (data: {
    storeName: string;
    monthKey: string;
    drafts: CreateDealDraftRow[];
    sourceRows: StaffListingSheetRow[];
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
  advanceAmount?: number;
  ngayAirChot: string;
  nhanSuDien: string;
  ngayDien: string;
  ngayBrandDuyet: string;
  slaBrandDuyet: string;
  bookingFormat?: 'Booking Video KOC' | 'Booking Livestream KOC' | 'Affiliate Thuần';
  contractType?: 'UPBASE_STANDARD' | 'KOC_CUSTOM';
  recipientName?: string;
  recipientPhone?: string;
  shippingAddress?: string;
  sampleCarrier?: string;
  sampleTrackingCode?: string;
  sparkAdsExpiryDays?: number;
  contentAngle?: string;
  notes?: string;
  isDropped?: boolean;
  dropReason?: string;
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
  kocs: rawKocs,
  stores: rawStores,
  deals: rawDeals,
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
  onOpenCreateDealWorkspace,
  onOpenShortlistFilterModal,
  onOpenSheetSetupScreen,
  onNotify,
}) => {
  const kocs = useMemo(() => (Array.isArray(rawKocs) ? rawKocs : []), [rawKocs]);
  const stores = useMemo(() => (Array.isArray(rawStores) ? rawStores : []), [rawStores]);
  const deals = useMemo(() => (Array.isArray(rawDeals) ? rawDeals : []), [rawDeals]);
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

  const [serverSummary, setServerSummary] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch('/api/listing-board?summary=true', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data?.summary) {
          const counts: Record<string, number> = {};
          for (const [k, v] of Object.entries(data.summary as Record<string, { count: number }>)) {
            counts[k] = v.count;
          }
          setServerSummary(counts);
        }
      })
      .catch(() => {});
  }, []);

  const fetchedSheetsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const currentRows = collection?.sheets?.[activeSheetKey];
    if (fetchedSheetsRef.current.has(activeSheetKey)) return;
    if (currentRows && currentRows.length > 0) {
      fetchedSheetsRef.current.add(activeSheetKey);
      return;
    }
    fetchedSheetsRef.current.add(activeSheetKey);
    fetch(
      `/api/listing-board?storeName=${encodeURIComponent(activeStoreName)}&month=${encodeURIComponent(activeMonth)}`,
      { cache: 'no-store' }
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.items || !Array.isArray(data.items) || data.items.length === 0) return;
        const mappedRows = data.items.map((item: KocListingItem) =>
          buildStaffListingRowFromListingItem(item, currentUserName, kocs)
        );
        setCollection((prev) => {
          if (prev?.sheets?.[activeSheetKey] && prev.sheets[activeSheetKey].length > 0) return prev;
          const next = {
            ...prev,
            sheets: {
              ...(prev?.sheets || {}),
              [activeSheetKey]: mappedRows,
            },
          };
          saveStaffSheetCollection(next, false);
          return next;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activeSheetKey, activeStoreName, activeMonth, collection?.sheets, currentUserName]);

  const rows: StaffListingSheetRow[] = useMemo(
    () => (Array.isArray(collection?.sheets?.[activeSheetKey]) ? collection.sheets[activeSheetKey] : []),
    [collection, activeSheetKey]
  );

  const updateActiveSheetRows = (updater: (prev: StaffListingSheetRow[]) => StaffListingSheetRow[]) => {
    setCollection((prev) => {
      const currentRows = Array.isArray(prev?.sheets?.[activeSheetKey])
        ? prev.sheets[activeSheetKey]
        : [];
      const nextRows = updater(currentRows);
      const nextCollection: StaffBrandSheetCollection = {
        ...prev,
        sheets: {
          ...(prev?.sheets || {}),
          [activeSheetKey]: nextRows,
        },
      };
      saveStaffSheetCollection(nextCollection, false);
      return nextCollection;
    });
  };

  const sheetCountsSignature = useMemo(() => {
    const sheets = collection?.sheets;
    if (!sheets) return '';
    return Object.keys(sheets)
      .map((k) => `${k}:${Array.isArray(sheets[k]) ? sheets[k].length : 0}`)
      .join('|');
  }, [collection?.sheets]);

  const sheetCountMap = useMemo(() => {
    void sheetCountsSignature;
    const map = new Map<string, number>();
    const sheets = collection?.sheets;
    if (sheets) {
      for (const [k, list] of Object.entries(sheets)) {
        if (Array.isArray(list)) map.set(k, list.length);
      }
    }
    return map;
  }, [sheetCountsSignature]);

  const getStoreMonthCount = React.useCallback(
    (month: string, storeName: string): number => {
      const key = makeSheetKey(month, storeName);
      const localLen = sheetCountMap.get(key) || 0;
      const srvLen = serverSummary[key] || 0;
      return Math.max(localLen, srvLen);
    },
    [sheetCountMap, serverSummary]
  );

  // Thống kê tổng KOC và số gian hàng có dữ liệu theo từng tháng để hiển thị ngay trên ô chọn Tháng
  const monthSummaryStats = useMemo(() => {
    const map: Record<string, { totalKocs: number; storeCount: number }> = {};
    for (const m of MONTH_OPTIONS) {
      let totalKocs = 0;
      let storeCount = 0;
      for (const st of b2cStores) {
        const c = getStoreMonthCount(m, st.storeName);
        if (c > 0) {
          totalKocs += c;
          storeCount += 1;
        }
      }
      map[m] = { totalKocs, storeCount };
    }
    return map;
  }, [b2cStores, getStoreMonthCount]);

  // Sắp xếp danh sách gian hàng trong dropdown: ưu tiên các gian hàng đã có KOC Listing trong tháng đang chọn lên đầu
  const sortedB2cStoresForActiveMonth = useMemo(() => {
    return [...b2cStores].sort((a, b) => {
      const ca = getStoreMonthCount(activeMonth, a.storeName);
      const cb = getStoreMonthCount(activeMonth, b.storeName);
      if (ca > 0 && cb === 0) return -1;
      if (ca === 0 && cb > 0) return 1;
      if (ca !== cb) return cb - ca;
      return (a.brandName || a.storeName).localeCompare(b.brandName || b.storeName, 'vi');
    });
  }, [b2cStores, activeMonth, getStoreMonthCount]);

  // Khi vào màn hình lần đầu, nếu gian hàng mặc định có 0 KOC trong tháng đang chọn thì tự động chọn gian hàng đầu tiên có dữ liệu KOC
  const didInitialAutoSelectRef = useRef(false);
  useEffect(() => {
    if (didInitialAutoSelectRef.current) return;
    if (!activeStoreName || b2cStores.length === 0) return;
    const currentCount = getStoreMonthCount(activeMonth, activeStoreName);
    if (currentCount > 0) {
      didInitialAutoSelectRef.current = true;
      return;
    }
    const firstWithData = sortedB2cStoresForActiveMonth.find(
      (st) => getStoreMonthCount(activeMonth, st.storeName) > 0
    );
    if (firstWithData && firstWithData.storeName !== activeStoreName) {
      didInitialAutoSelectRef.current = true;
      onChangeStore(firstWithData.storeName);
    }
  }, [
    activeMonth,
    activeStoreName,
    b2cStores.length,
    getStoreMonthCount,
    sortedB2cStoresForActiveMonth,
    onChangeStore,
  ]);

  // Các Sheet Brand đang có dữ liệu trong tháng đang chọn
  const activeMonthBrandSheets = useMemo(() => {
    const prefix = `${activeMonth}__`;
    const storeNamesWithData = new Set<string>();
    sheetCountMap.forEach((len, key) => {
      if (key.startsWith(prefix) && len > 0) {
        storeNamesWithData.add(key.slice(prefix.length));
      }
    });
    Object.entries(serverSummary).forEach(([key, count]) => {
      if (key.startsWith(prefix) && count > 0) {
        storeNamesWithData.add(key.slice(prefix.length));
      }
    });
    storeNamesWithData.add(activeStoreName);
    return Array.from(storeNamesWithData).map((sName) => {
      const st = b2cStores.find((s) => s.storeName === sName);
      const localCount = sheetCountMap.get(makeSheetKey(activeMonth, sName)) || 0;
      const count = localCount > 0 ? localCount : (serverSummary[makeSheetKey(activeMonth, sName)] || 0);
      return {
        storeName: sName,
        brandName: st?.brandName || sName.split(/[-_]/)[0].trim(),
        count,
      };
    });
  }, [activeMonth, sheetCountMap, serverSummary, activeStoreName, b2cStores]);

  // Mặc định mở bộ cột GĐ 1: 17 cột trọng tâm phục vụ Listing & Trình Brand duyệt ngay trên màn hình đầu tiên
  // (Khi đẩy/copy Google Sheet vẫn xuất đủ 57 cột chuẩn A -> BE)
  const [activeColumnPreset, setActiveColumnPreset] = useState<
    'BRAND_WORKING_FILE' | 'ACCEPTANCE_FILE_32' | 'ALL_48' | 'LARK_BASE'
  >('BRAND_WORKING_FILE');
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<StaffListingColumnKey[]>(() => [
    ...BRAND_REVIEW_PRIORITY_KEYS,
  ]);
  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);

  const visibleColumns = useMemo(() => {
    const set = new Set(visibleColumnKeys);
    const allSelected = STAFF_LISTING_COLUMNS.filter((c) => set.has(c.key));

    // Trong góc nhìn "1. Listing & Trình Brand", đưa các cột quyết định (ID kênh, Tên kênh, Sản phẩm, Tệp Booking, Giá net, Đề xuất UpBase, Brand chọn, Lý do, SLA) lên đầu
    // để người dùng nhìn thấy ngay trạng thái duyệt mà không cần cuộn ngang; đồng thời giữ ID kênh ở vị trí đầu tiên để khớp tuyệt đối với sticky left-[72px].
    const priorityOrder: StaffListingColumnKey[] =
      activeColumnPreset === 'BRAND_WORKING_FILE'
        ? BRAND_REVIEW_PRIORITY_KEYS
        : ['idKenh'];

    const priorityRank = new Map<StaffListingColumnKey, number>();
    priorityOrder.forEach((k, idx) => priorityRank.set(k, idx));

    const prioritized: StaffListingColumnMeta[] = [];
    const remaining: StaffListingColumnMeta[] = [];

    for (const col of allSelected) {
      if (priorityRank.has(col.key)) {
        prioritized.push(col);
      } else {
        remaining.push(col);
      }
    }

    prioritized.sort(
      (a, b) => (priorityRank.get(a.key) ?? 999) - (priorityRank.get(b.key) ?? 999)
    );

    const combined = [...prioritized, ...remaining];
    if (activeColumnPreset === 'BRAND_WORKING_FILE') {
      return combined;
    }

    // Với các chế độ khác, giữ nguyên vị trí SLA ngay sau Lý do từ chối / Brand chọn
    const base = combined.filter(
      (c) => c.key !== 'ngayBrandDuyet' && c.key !== 'slaBrandDuyet'
    );
    const slaCols = combined.filter(
      (c) => c.key === 'ngayBrandDuyet' || c.key === 'slaBrandDuyet'
    );
    if (slaCols.length === 0) return base;
    const insertIdx = base.findIndex(
      (c) => c.key === 'lyDoTuChoi' || c.key === 'brandChon'
    );
    if (insertIdx === -1) return [...base, ...slaCols];
    const afterLyDo = base.findIndex((c) => c.key === 'lyDoTuChoi');
    const targetPos = afterLyDo !== -1 ? afterLyDo + 1 : insertIdx + 1;
    return [
      ...base.slice(0, targetPos),
      ...slaCols,
      ...base.slice(targetPos),
    ];
  }, [visibleColumnKeys, activeColumnPreset]);

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
      setVisibleColumnKeys(
        STAFF_LISTING_COLUMNS.filter((c) => c.index <= 57).map((c) => c.key)
      );
    } else if (preset === 'BRAND_WORKING_FILE') {
      setVisibleColumnKeys([...BRAND_REVIEW_PRIORITY_KEYS]);
    } else if (preset === 'ACCEPTANCE_FILE_32') {
      const coreKeys: StaffListingColumnKey[] = [
        'idKenh',
        'tenKenh',
        'sanPham',
        'giaNetVideo',
        'brandChon',
        'ngayBrandDuyet',
        'slaBrandDuyet',
        'ngayDien',
        'nhanSuDien',
        'dot',
      ];
      const acceptanceKeys = STAFF_LISTING_COLUMNS.filter(
        (c) => c.group === 'Chốt Book & Nghiệm thu (File 3.2)'
      ).map((c) => c.key);
      setVisibleColumnKeys(Array.from(new Set([...coreKeys, ...acceptanceKeys])));
    } else {
      setVisibleColumnKeys(
        STAFF_LISTING_COLUMNS.filter((c) => c.inLarkBase && c.index <= 57).map((c) => c.key)
      );
    }
  };

  // Tìm kiếm & chọn KOC từ Danh bạ ngay tại Sheet (cho phép chọn Plan Tháng & Gian hàng đích)
  const [isDirectoryPickerOpen, setIsDirectoryPickerOpen] = useState(false);
  const [pickerTargetMonth, setPickerTargetMonth] = useState<string>(activeMonth);
  const [pickerTargetStoreName, setPickerTargetStoreName] = useState<string>(activeStoreName);
  const [kocSearchText, setKocSearchText] = useState('');
  const [kocFilterTep, setKocFilterTep] = useState('ALL');
  const [kocFilterKl, setKocFilterKl] = useState('ALL');
  const [pickedKocIds, setPickedKocIds] = useState<string[]>([]);
  const [quickBatchDot, setQuickBatchDot] = useState('Đợt 1');
  const [quickProduct, setQuickProduct] = useState('');
  const [quickContentTag, setQuickContentTag] = useState('Review trực tiếp');
  const [quickUpbaseProposal, setQuickUpbaseProposal] = useState('Recommend');

  const activeBrandProductCatalog = useMemo(
    () =>
      buildBrandProductCatalogGroups({
        brandName: activeStoreObj?.brandName,
        storeName: activeStoreName,
        storeObj: activeStoreObj,
        deals,
      }),
    [activeStoreObj, activeStoreName, deals]
  );

  const kocByChannelMap = useMemo(() => {
    const map = new Map<string, KocItem>();
    for (const k of kocs) {
      const ch = normalizeTikTokId(k.channelId).toLowerCase();
      if (ch && !map.has(ch)) map.set(ch, k);
    }
    return map;
  }, [kocs]);

  const handleOpenDirectoryPickerModal = () => {
    setPickerTargetMonth(activeMonth);
    setPickerTargetStoreName(activeStoreName);
    setQuickProduct(
      activeBrandProductCatalog.flatOptions[0]?.name || activeStoreObj?.mainProducts?.[0] || ''
    );
    setPickedKocIds([]);
    setIsDirectoryPickerOpen(true);
  };

  // Tùy chọn Copy & Google Sheet
  const [copyWithHeaders, setCopyWithHeaders] = useState(true);
  const [copyWithFormulas, setCopyWithFormulas] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const selectedRowIdSet = useMemo(() => new Set(selectedRowIds), [selectedRowIds]);
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
  // Thu gọn các tháng cũ theo Cột Tháng (Cột B) trên Bảng App & trên Google Sheet
  const [showOldMonthsInTable, setShowOldMonthsInTable] = useState(false);
  const [expandedOldMonths, setExpandedOldMonths] = useState<string[]>([]);
  const [sheetCollapsedMonthsDraft, setSheetCollapsedMonthsDraft] = useState<string[]>(() =>
    MONTH_OPTIONS.filter((m) => m < activeMonth)
  );
  const [sheetMonthColumnStats, setSheetMonthColumnStats] = useState<
    { month: string; rowCount: number; collapsed: boolean }[]
  >([]);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [isPicPopoverOpen, setIsPicPopoverOpen] = useState(false);
  const picPopoverRef = useRef<HTMLDivElement>(null);
  const [quickViewRow, setQuickViewRow] = useState<Partial<StaffListingSheetRow> | null>(null);

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
  const storePicTotalCount = useMemo(() => {
    const names = new Set<string>();
    if (storeAssignment.primaryPic) names.add(storeAssignment.primaryPic);
    storeAssignment.supportStaff.forEach((s) => {
      if (s) names.add(s);
    });
    if (storeLeaderName) names.add(storeLeaderName);
    return names.size;
  }, [storeAssignment, storeLeaderName]);
  const picRowCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const key = (r.nhanSuDien || '').trim().toLowerCase();
      if (key) map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [rows]);
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
    [collection?.fieldEditPolicy]
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

  useEffect(() => {
    if (!isPicPopoverOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!picPopoverRef.current?.contains(e.target as Node)) {
        setIsPicPopoverOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsPicPopoverOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [isPicPopoverOpen]);

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
    patch: Partial<Pick<StaffListingSheetRow, 'email' | 'trangThai' | 'zalo'>>
  ) => {
    const targetRow = rows.find((r) => r.id === rowId);
    if (targetRow && (patch.email !== undefined || patch.zalo !== undefined)) {
      syncSheetRowContactToKocMaster({
        kocId: targetRow.kocId,
        idKenh: targetRow.idKenh,
        ...(patch.email !== undefined ? { email: patch.email } : {}),
        ...(patch.zalo !== undefined ? { zalo: patch.zalo } : {}),
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
    return (
      activeStoreObj?.defaultSheetTab ||
      activeStoreName ||
      `Listing ${activeMonth.replace('/', '-')}`
    ).trim();
  }, [activeStoreObj, activeStoreName, activeMonth]);

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

  const pickerTargetStoreObj = useMemo(
    () => b2cStores.find((s) => s.storeName === pickerTargetStoreName) || activeStoreObj,
    [b2cStores, pickerTargetStoreName, activeStoreObj]
  );

  const existingHandlesInPickerTargetSheet = useMemo(() => {
    const targetKey = makeSheetKey(pickerTargetMonth, pickerTargetStoreName);
    const targetRows = collection.sheets[targetKey] || [];
    return new Set(
      targetRows.map((r) => normalizeTikTokId(r.idKenh).toLowerCase()).filter(Boolean)
    );
  }, [collection.sheets, pickerTargetMonth, pickerTargetStoreName]);

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

  // Các nhóm dòng thuộc Tháng cũ của cùng Gian hàng (dựa trên Cột B: Tháng) để hiển thị thu gọn / mở rộng ngay trên Bảng
  const oldMonthSheet202611 = activeMonth !== '2026/11' ? collection?.sheets?.[makeSheetKey('2026/11', activeStoreName)] : undefined;
  const oldMonthSheet202610 = activeMonth !== '2026/10' ? collection?.sheets?.[makeSheetKey('2026/10', activeStoreName)] : undefined;
  const oldMonthSheet202609 = activeMonth !== '2026/09' ? collection?.sheets?.[makeSheetKey('2026/09', activeStoreName)] : undefined;
  const oldMonthSheet202608 = activeMonth !== '2026/08' ? collection?.sheets?.[makeSheetKey('2026/08', activeStoreName)] : undefined;

  const storeOldMonthGroups = useMemo(() => {
    const groups: {
      month: string;
      rows: StaffListingSheetRow[];
      approvedCount: number;
      totalNet: number;
    }[] = [];

    const byMonth: Record<string, StaffListingSheetRow[] | undefined> = {
      '2026/11': oldMonthSheet202611,
      '2026/10': oldMonthSheet202610,
      '2026/09': oldMonthSheet202609,
      '2026/08': oldMonthSheet202608,
    };

    for (const m of MONTH_OPTIONS) {
      if (m === activeMonth) continue;
      const rawList = byMonth[m];
      const list = Array.isArray(rawList) ? rawList : [];
      if (list.length === 0) continue;
      const approvedCount = list.filter((r) => r.brandChon === 'Yes').length;
      const totalNet = list.reduce((s, r) => s + (Number(r.giaNetVideo) || 0), 0);
      groups.push({
        month: m,
        rows: list,
        approvedCount,
        totalNet,
      });
    }
    return groups.sort((a, b) => b.month.localeCompare(a.month));
  }, [
    activeMonth,
    oldMonthSheet202611,
    oldMonthSheet202610,
    oldMonthSheet202609,
    oldMonthSheet202608,
  ]);

  const toggleExpandOldMonthInTable = (month: string) => {
    setExpandedOldMonths((prev) =>
      prev.includes(month) ? prev.filter((x) => x !== month) : [...prev, month]
    );
  };

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
    const syncMasterKeys: StaffListingColumnKey[] = [
      'tenKenh',
      'tepKenh',
      'follower',
      'giaNetVideo',
      'doanhSo',
      'soMonBanRa',
      'gpm',
      'aov',
      'viewTrungBinh',
      'viewTrungVi',
      'ctrPct',
      'crPct',
      'tyLeTuongTacPct',
      'gmvTuVideoPct',
      'gmvTuLivePct',
      'namPct',
      'nuPct',
      'tuoi18_24Pct',
      'tuoi25_34Pct',
      'location',
      'email',
      'zalo',
      'nguoiNhanHang',
      'sdtNhanHang',
      'diaChiNhanHang',
      'soTaiKhoan',
      'nganHang',
      'soCccd',
    ];
    if (syncMasterKeys.includes(key)) {
      const targetRow = rows.find((r) => r.id === rowId);
      if (targetRow) {
        const strVal = String(value);
        const numVal = Number(value) || 0;
        syncSheetRowContactToKocMaster({
          kocId: targetRow.kocId,
          idKenh: targetRow.idKenh,
          ...(key === 'tenKenh' ? { stageName: strVal } : {}),
          ...(key === 'tepKenh' ? { tepKenh: strVal } : {}),
          ...(key === 'follower' ? { followers: numVal } : {}),
          ...(key === 'giaNetVideo' ? { rateCardVideo: numVal } : {}),
          ...(key === 'doanhSo' ? { recentRevenue: numVal } : {}),
          ...(key === 'soMonBanRa' ? { itemsSold: numVal } : {}),
          ...(key === 'gpm' ? { gpm: numVal } : {}),
          ...(key === 'aov' ? { aov: numVal } : {}),
          ...(key === 'viewTrungBinh' ? { avgViews: numVal } : {}),
          ...(key === 'viewTrungVi' ? { medianViews: numVal } : {}),
          ...(key === 'ctrPct' ? { tiktokAvgCtr: numVal } : {}),
          ...(key === 'crPct' ? { tiktokAvgCvr: numVal } : {}),
          ...(key === 'tyLeTuongTacPct' ? { engagementRate: numVal } : {}),
          ...(key === 'gmvTuVideoPct' ? { gmvShareVideo: numVal } : {}),
          ...(key === 'gmvTuLivePct' ? { gmvShareLive: numVal } : {}),
          ...(key === 'namPct'
            ? { maleRatio: numVal, femaleRatio: Math.max(0, Number((100 - numVal).toFixed(2))) }
            : {}),
          ...(key === 'nuPct'
            ? { femaleRatio: numVal, maleRatio: Math.max(0, Number((100 - numVal).toFixed(2))) }
            : {}),
          ...(key === 'tuoi18_24Pct' ? { age18_24: numVal } : {}),
          ...(key === 'tuoi25_34Pct' ? { age25_34: numVal } : {}),
          ...(key === 'location' ? { location: strVal } : {}),
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
        const matchedKoc = clean ? kocByChannelMap.get(clean) : undefined;
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
      activeBrandProductCatalog.flatOptions[0]?.name ||
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

  // Đưa các KOC đã tích chọn từ Danh bạ vào Sheet theo Plan Tháng & Gian hàng đã chọn
  const handleAddPickedKocsToSheet = () => {
    if (pickedKocIds.length === 0) return;
    const pickedSet = new Set(pickedKocIds);
    const selectedKocs = kocs.filter((k) => pickedSet.has(k.id));
    const targetMonth = pickerTargetMonth || activeMonth;
    const targetStore = pickerTargetStoreName || activeStoreName;
    const targetStoreObj =
      b2cStores.find((s) => s.storeName === targetStore) || activeStoreObj;
    const cat = buildBrandProductCatalogGroups({
      brandName: targetStoreObj?.brandName,
      storeName: targetStore,
      storeObj: targetStoreObj,
      deals,
    });
    const defaultProd =
      quickProduct.trim() ||
      cat.flatOptions[0]?.name ||
      targetStoreObj?.mainProducts?.[0] ||
      (targetStoreObj?.brandName ? `Sản phẩm ${targetStoreObj.brandName}` : '');

    let added = 0;
    let skipped = 0;
    const targetKey = makeSheetKey(targetMonth, targetStore);

    setCollection((prev) => {
      const currentRows = prev.sheets[targetKey] || [];
      const existingSet = new Set(
        currentRows.map((r) => normalizeTikTokId(r.idKenh).toLowerCase()).filter(Boolean)
      );
      const nextRows = [...currentRows];

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
            monthKey: targetMonth,
            storeName: targetStore,
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

      const next: StaffBrandSheetCollection = {
        ...prev,
        sheets: {
          ...prev.sheets,
          [targetKey]: nextRows,
        },
      };
      saveStaffSheetCollection(next);
      return next;
    });

    if (targetMonth !== activeMonth) {
      onChangeMonth(targetMonth);
    }
    if (targetStore !== activeStoreName) {
      onChangeStore(targetStore);
    }

    setPickedKocIds([]);
    setIsDirectoryPickerOpen(false);
    if (added > 0) {
      onNotify?.(
        skipped > 0
          ? `Đã đưa ${added} KOC vào Sheet "${targetStore}" (Plan ${targetMonth}, bỏ qua ${skipped} kênh trùng).`
          : `Đã đưa ${added} KOC vào Sheet "${targetStore}" (Plan ${targetMonth}) và tự động điền dữ liệu hồ sơ.`,
        'success'
      );
    } else {
      onNotify?.(
        `Các KOC đã chọn đều đã có trong Sheet "${targetStore}" (Plan ${targetMonth}).`,
        'warning'
      );
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

  // Cập nhật hàng loạt (Bulk Update) cho các dòng đã chọn: Đợt, Đề xuất UpBase, hoặc Brand chọn
  const handleBulkUpdateSelectedRows = (
    field: 'dot' | 'deXuatUpBase' | 'brandChon',
    value: string
  ) => {
    if (!value || selectedRowIds.length === 0) return;
    const selectedSet = new Set(selectedRowIds);
    const approvedRowsToSync: StaffListingSheetRow[] = [];
    let updatedCount = 0;

    updateActiveSheetRows((prev) =>
      prev.map((r) => {
        if (!selectedSet.has(r.id)) return r;
        const check = canEditCell(r, field);
        if (!check.allowed) return r;
        updatedCount++;
        const brandDecisionChanged = field === 'brandChon' && value !== r.brandChon;
        const updated = recalculateStaffListingRow(
          { ...r, [field]: value },
          { forceRefreshBrandTimestamp: brandDecisionChanged }
        );
        if (field === 'brandChon' && value === 'Yes') {
          approvedRowsToSync.push(updated);
        }
        return updated;
      })
    );

    if (approvedRowsToSync.length > 0) {
      const rowsForTransfer = [...approvedRowsToSync];
      setTimeout(() => {
        transferBrandApprovedRowsToBookingList({
          rowsToTransfer: rowsForTransfer,
          sheetKey: activeSheetKey,
          store: activeStoreObj,
          allKocs: kocs,
          allStores: stores,
          allDeals: deals,
        });
        setCollection(loadStaffSheetCollection(kocs, stores, deals, currentUserName));
      }, 0);
    }

    const fieldLabel =
      field === 'dot'
        ? 'Đợt'
        : field === 'deXuatUpBase'
          ? 'Đề xuất UpBase'
          : 'Brand chọn';
    if (updatedCount > 0) {
      onNotify?.(
        `Đã cập nhật "${fieldLabel}: ${value}" cho ${updatedCount} dòng KOC.`,
        'success'
      );
    } else {
      onNotify?.('Không có dòng nào đủ quyền chỉnh sửa.', 'warning');
    }
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
        ? STAFF_LISTING_COLUMNS.filter((c) => c.index <= 57)
        : mode === 'BRAND_WORKING_COLS'
          ? STAFF_LISTING_COLUMNS.filter((c) => c.inBrandWorkingFile)
          : visibleColumns;

    const tsv = formatStaffSheetToTsv(targetRows, colsToCopy, {
      includeHeaders: copyWithHeaders,
      useGoogleSheetFormulas: copyWithFormulas,
      startRowNumberInSheet: 9,
    });

    try {
      await navigator.clipboard.writeText(tsv);
      const label =
        mode === 'BRAND_WORKING_COLS'
          ? `bản gửi Brand (${colsToCopy.length} cột Working file)`
          : mode === 'ALL_48_COLS'
            ? 'đầy đủ 57 cột chuẩn Template (A -> BE)'
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
  const [pushDiffReport, setPushDiffReport] = useState<PushSheetReconciliationReport | null>(null);

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

  const tryRestoreServiceAccountFromLocalCache = async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    const cachedJson = window.localStorage.getItem('upbase_b2c_google_sa_config_v1');
    if (!cachedJson || !cachedJson.trim()) return false;
    try {
      const res = await fetch('/api/booking-list/push-sheet', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceAccountJson: cachedJson.trim() }),
      });
      const data = (await res.json().catch(() => null)) as { configured?: boolean } | null;
      return Boolean(res.ok && data?.configured);
    } catch {
      return false;
    }
  };

  const [isServiceAccountConfigured, setIsServiceAccountConfigured] = useState<boolean>(true);
  const [isShowingSaJsonInput, setIsShowingSaJsonInput] = useState<boolean>(false);
  const [pushSaJsonDraft, setPushSaJsonDraft] = useState<string>('');
  const [savingPushSa, setSavingPushSa] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/booking-list/push-sheet')
      .then((r) => r.json())
      .then((d: { configured?: boolean }) => {
        if (!d?.configured) {
          void tryRestoreServiceAccountFromLocalCache().then((restored) => {
            setIsServiceAccountConfigured(restored);
          });
        } else {
          setIsServiceAccountConfigured(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleSavePushServiceAccount = async () => {
    if (!pushSaJsonDraft.trim()) return;
    setSavingPushSa(true);
    try {
      const res = await fetch('/api/booking-list/push-sheet', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceAccountJson: pushSaJsonDraft.trim() }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        configured?: boolean;
        serviceAccountEmail?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Không lưu được cấu hình Google Service Account.');
      }
      setIsServiceAccountConfigured(true);
      setIsShowingSaJsonInput(false);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('upbase_b2c_google_sa_config_v1', pushSaJsonDraft.trim());
        } catch {
          /* ignore */
        }
      }
      onNotify?.(
        `Đã lưu Google Service Account (${data.serviceAccountEmail || 'thành công'}). Bắt đầu đối soát...`,
        'success'
      );
      setPushSaJsonDraft('');
      if (pushSheetUrl.trim()) {
        void fetchTabsForSheetUrl(pushSheetUrl, pushSheetTab, (t) => setPushSheetTab(t));
        void handleRunPushDiffPreview(pushSheetUrl, pushSheetTab, pushScope, pushColMode);
      }
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : 'Lỗi lưu Service Account.', 'error');
    } finally {
      setSavingPushSa(false);
    }
  };

  const fetchTabsForSheetUrl = async (
    url: string,
    currentTab: string,
    onPickTab: (tab: string) => void
  ) => {
    const cleanUrl = url.trim();
    if (!cleanUrl) return;
    setLoadingSheetTabs(true);
    try {
      let res = await fetch(
        `/api/booking-list/push-sheet?sheetUrl=${encodeURIComponent(cleanUrl)}`,
        { cache: 'no-store' }
      );
      let data = (await res.json().catch(() => null)) as {
        configured?: boolean;
        tabs?: string[];
        tabsDetail?: SheetTabDetailItem[];
        matchedTabByGid?: string | null;
        error?: string;
      } | null;
      if (data?.configured === false) {
        setIsServiceAccountConfigured(false);
        const restored = await tryRestoreServiceAccountFromLocalCache();
        if (restored) {
          setIsServiceAccountConfigured(true);
          res = await fetch(
            `/api/booking-list/push-sheet?sheetUrl=${encodeURIComponent(cleanUrl)}`,
            { cache: 'no-store' }
          );
          data = (await res.json().catch(() => null)) as {
            configured?: boolean;
            tabs?: string[];
            tabsDetail?: SheetTabDetailItem[];
            matchedTabByGid?: string | null;
            error?: string;
          } | null;
        }
      }
      if (res.ok && Array.isArray(data?.tabs)) {
        setAvailableSheetTabs(data.tabs);
        if (Array.isArray(data.tabsDetail)) {
          setSheetTabsDetail(data.tabsDetail);
        }
        if (data.tabs.length > 0 && (!currentTab || !data.tabs.includes(currentTab))) {
          onPickTab(data.matchedTabByGid || data.tabs[0]);
        }
      } else if (data?.error && data?.configured !== false) {
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
      return STAFF_LISTING_COLUMNS.filter((c) => c.index <= 57);
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
      const reqPayload = JSON.stringify({
        planId: activeSheetKey,
        sheetUrl: urlToUse,
        tab: tabToUse,
        columns,
        rows: matrixRows,
        dryRun: true,
      });
      let res = await fetch('/api/booking-list/push-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: reqPayload,
      });
      let body = await res.json().catch(() => null);
      if (!res.ok && body?.code === 'NOT_CONFIGURED') {
        const restored = await tryRestoreServiceAccountFromLocalCache();
        if (restored) {
          setIsServiceAccountConfigured(true);
          res = await fetch('/api/booking-list/push-sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: reqPayload,
          });
          body = await res.json().catch(() => null);
        } else {
          setIsServiceAccountConfigured(false);
          setIsShowingSaJsonInput(true);
          return;
        }
      }
      if (!res.ok) {
        if (body?.code === 'NOT_CONFIGURED') {
          setIsServiceAccountConfigured(false);
          setIsShowingSaJsonInput(true);
        } else {
          onNotify?.(body?.error || `Lỗi đối soát Google Sheet (${res.status})`, 'error');
        }
        return;
      }
      setPushDiffReport({
        added: body.added || 0,
        updated: body.updated || 0,
        skipped: body.skipped || 0,
        sheetOnlyCount: body.sheetOnlyCount || 0,
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
    setIsShowingSaJsonInput(false);
    setIsPushSheetModalOpen(true);
    if (initialUrl) {
      void fetchTabsForSheetUrl(initialUrl, initialTab, (t) => setPushSheetTab(t));
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
      const reqPayload = JSON.stringify({
        planId: activeSheetKey,
        sheetUrl: urlToUse,
        tab: tabToUse,
        columns,
        rows: matrixRows,
        dryRun: false,
      });
      let res = await fetch('/api/booking-list/push-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: reqPayload,
      });
      let body = await res.json().catch(() => null);
      if (!res.ok && body?.code === 'NOT_CONFIGURED') {
        const restored = await tryRestoreServiceAccountFromLocalCache();
        if (restored) {
          res = await fetch('/api/booking-list/push-sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: reqPayload,
          });
          body = await res.json().catch(() => null);
        }
      }
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
      const reqPayload = JSON.stringify({
        planId: activeSheetKey,
        sheetUrl: urlToUse,
        tab: tabToUse,
        dryRun: true,
      });
      let res = await fetch('/api/booking-list/pull-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: reqPayload,
      });
      let body = await res.json().catch(() => null);
      if (!res.ok && body?.code === 'NOT_CONFIGURED') {
        const restored = await tryRestoreServiceAccountFromLocalCache();
        if (restored) {
          res = await fetch('/api/booking-list/pull-sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: reqPayload,
          });
          body = await res.json().catch(() => null);
        }
      }
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

        const sheetTenKenh = pickSheetCol(sr, [
          'tên người ảnh hưởng (tên kênh)',
          'tên kênh koc',
          'tên kênh',
          'ten kenh',
        ]);
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
    if (onOpenCreateDealWorkspace) {
      onOpenCreateDealWorkspace({
        storeName: activeStoreName,
        monthKey: activeMonth,
        drafts,
        sourceRows: approvedRows,
      });
      return;
    }
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
      `Đã tạo ${selectedDrafts.length} deal (${createdDealCodes
        .slice(0, 4)
        .join(', ')}${createdDealCodes.length > 4 ? '…' : ''})`,
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
  // ĐIỀU KHIỂN HIỂN THỊ TEMPLATE GOOGLE SHEET (THU GỌN CỘT THÁNG CŨ, ẨN CỘT, SORT SHEET)
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
    setSheetCollapsedMonthsDraft(MONTH_OPTIONS.filter((m) => m < activeMonth));
    setIsSheetTemplateModalOpen(true);
    void fetchTabsForSheetUrl(url, defaultTab, (t) => setSheetTemplateActiveTab(t));
  };

  const runSheetTemplatePatch = async (
    payload: {
      activeTab?: string;
      tabVisibility?: { title: string; hidden: boolean }[];
      collapsedMonths?: string[];
      collapseOldMonthsBefore?: string;
      expandAllMonths?: boolean;
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
          planId: activeSheetKey,
          sheetUrl: url,
          activeTab: payload.activeTab || sheetTemplateActiveTab || defaultGoogleSheetTab,
          ...payload,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        tabsDetail?: SheetTabDetailItem[];
        collapsedRowsCount?: number;
        monthColumnStats?: { month: string; rowCount: number; collapsed: boolean }[];
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
      if (Array.isArray(data.monthColumnStats) && data.monthColumnStats.length > 0) {
        setSheetMonthColumnStats(data.monthColumnStats);
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

  const handleToggleCollapseMonthDraft = (month: string) => {
    setSheetCollapsedMonthsDraft((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month]
    );
  };

  const handleSelectOldMonthsToCollapseDraft = () => {
    setSheetCollapsedMonthsDraft(MONTH_OPTIONS.filter((m) => m < activeMonth));
  };

  return (
    <div className="space-y-2">
      <PageActions>
        <div className="hidden xl:flex items-center gap-2 px-2.5 h-8 rounded-md bg-sunken/70 border border-line text-2xs">
          <div className="flex items-center gap-1">
            <span className="text-ink-3">KOC:</span>
            <strong className="text-ink tabular-nums">
              {formatNumber(sheetStats.totalCount)}
            </strong>
          </div>
          <span className="h-3 w-px bg-line" />
          <div className="flex items-center gap-1">
            <span className="text-ink-3">Duyệt:</span>
            <strong className="text-positive tabular-nums">
              {formatNumber(sheetStats.brandApprovedCount)}/{formatNumber(sheetStats.totalCount)}
            </strong>
          </div>
          <span className="h-3 w-px bg-line" />
          <div
            className="flex items-center gap-1"
            title="Đo lường SLA từ thời điểm Listing KOC mới lên đến khi Brand phản hồi (Cam kết chuẩn: ≤ 48h)"
          >
            <Clock className="w-3 h-3 text-accent shrink-0" />
            <span className="text-ink-3">SLA:</span>
            {sheetStats.reviewedCount > 0 ? (
              <strong
                className={`tabular-nums ${
                  sheetStats.onTimeCount === sheetStats.reviewedCount
                    ? 'text-positive'
                    : 'text-warning'
                }`}
              >
                {sheetStats.onTimeCount}/{sheetStats.reviewedCount} ({sheetStats.avgReviewHours}h)
              </strong>
            ) : (
              <strong className="text-ink-2 tabular-nums">Chờ</strong>
            )}
            {sheetStats.overdueWaitCount > 0 && (
              <span className="px-1 rounded bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-2xs">
                {sheetStats.overdueWaitCount} trễ
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

        <Button
          variant="secondary"
          size="sm"
          icon={RefreshCw}
          onClick={handleOpenPullSheetModal}
        >
          Kéo từ Sheet
        </Button>

        <Button
          variant="primary"
          size="sm"
          icon={Upload}
          onClick={handleOpenPushSheetModal}
        >
          {selectedRowIds.length > 0
            ? `Đẩy ${selectedRowIds.length} dòng`
            : `Đẩy lên Sheet (${displayedRows.length})`}
        </Button>
      </PageActions>

      {/* Khung làm việc tích hợp: 2 thanh điều khiển 1 dòng sát mép + Bảng dữ liệu chuẩn Google Sheet */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden shadow-2xs">
        {/* Thanh 1 (1 dòng duy nhất): Ngữ cảnh Tháng / Gian hàng / PIC / Link Sheet (Trái) + Chế độ cột / Chọn KOC / Thêm dòng / Tạo Deal (Phải) */}
        <div className="px-3 py-1.5 border-b border-line bg-sunken/40 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <select
              value={activeMonth}
              onChange={(e) => {
                const nextMonth = e.target.value;
                onChangeMonth(nextMonth);
                // Nếu gian hàng hiện tại có 0 KOC ở tháng mới chuyển sang, tự động chọn gian hàng đầu tiên có dữ liệu ở tháng mới
                if (getStoreMonthCount(nextMonth, activeStoreName) === 0) {
                  const firstStoreInNextMonth = [...b2cStores]
                    .sort((a, b) => getStoreMonthCount(nextMonth, b.storeName) - getStoreMonthCount(nextMonth, a.storeName))
                    .find((st) => getStoreMonthCount(nextMonth, st.storeName) > 0);
                  if (firstStoreInNextMonth) {
                    onChangeStore(firstStoreInNextMonth.storeName);
                  }
                }
              }}
              aria-label="Chọn tháng"
              className="h-7 px-2 text-xs font-semibold rounded-md border border-line-strong bg-surface text-ink shrink-0 focus:outline-none focus:border-ink"
            >
              {MONTH_OPTIONS.map((m) => {
                const st = monthSummaryStats[m];
                const suffix =
                  st && st.totalKocs > 0
                    ? ` (${formatNumber(st.totalKocs)} KOC · ${st.storeCount} gian)`
                    : '';
                return (
                  <option key={m} value={m}>
                    Tháng {m}{suffix}
                  </option>
                );
              })}
            </select>

            <select
              value={activeStoreName}
              onChange={(e) => onChangeStore(e.target.value)}
              aria-label="Chọn Brand / Gian hàng"
              className="h-7 px-2 text-xs font-semibold rounded-md border border-line-strong bg-surface text-ink max-w-[260px] truncate shrink-0 focus:outline-none focus:border-ink"
            >
              {sortedB2cStoresForActiveMonth.map((st) => {
                const c = getStoreMonthCount(activeMonth, st.storeName);
                return (
                  <option key={st.id} value={st.storeName}>
                    {st.brandName} — {st.storeName} ({c} KOC)
                  </option>
                );
              })}
            </select>

            {/* Cụm hiển thị gọn: Nút bấm xem danh sách PIC gian hàng & Quyền + Link Google Sheet */}
            <div className="flex flex-wrap items-center gap-1.5 text-2xs">
              <div ref={picPopoverRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsPicPopoverOpen((v) => !v)}
                  aria-expanded={isPicPopoverOpen}
                  className="h-7 inline-flex items-center gap-1.5 px-2 rounded-md bg-surface border border-line-strong text-ink font-medium hover:bg-sunken transition-colors"
                >
                  <Users className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span>PIC ({storePicTotalCount})</span>
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isPrimaryPic || isAdminOrManager || isStoreLeader
                        ? 'bg-emerald-500'
                        : isSupportStaff
                          ? 'bg-accent'
                          : 'bg-ink-3'
                    }`}
                    title={
                      isPrimaryPic
                        ? 'Quyền PIC Chính'
                        : isSupportStaff
                          ? 'Quyền Hỗ trợ'
                          : isStoreLeader
                            ? 'Quyền Leader'
                            : isAdminOrManager
                              ? 'Quyền Quản trị viên'
                              : 'Quyền xem & đề xuất'
                    }
                  />
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-ink-3 shrink-0 transition-transform ${
                      isPicPopoverOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isPicPopoverOpen && (
                  <div className="absolute left-0 top-full mt-1.5 z-40 w-80 rounded-lg border border-line-strong bg-surface shadow-lg p-3 space-y-3 text-xs">
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-line">
                      <span className="font-semibold text-ink truncate">
                        Nhân sự &amp; Quyền gian hàng
                      </span>
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
                          ? 'Quyền: PIC Chính'
                          : isSupportStaff
                            ? 'Quyền: Hỗ trợ'
                            : isStoreLeader
                              ? 'Quyền: Leader'
                              : isAdminOrManager
                                ? 'Quản trị viên'
                                : 'Xem & đề xuất'}
                      </Status>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-2xs font-medium text-ink-3">PIC Chính</div>
                      {storeAssignment.primaryPic ? (
                        <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-sunken/60 border border-line">
                          <Person
                            name={storeAssignment.primaryPic}
                            sub={`${
                              picRowCountMap.get(storeAssignment.primaryPic.trim().toLowerCase()) || 0
                            } dòng trong bảng`}
                            size={24}
                          />
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Status tone="positive">PIC Chính</Status>
                            <button
                              type="button"
                              onClick={() => {
                                setFilterNhanSu(storeAssignment.primaryPic);
                                setIsPicPopoverOpen(false);
                              }}
                              className="px-1.5 py-0.5 rounded border border-line bg-surface text-2xs text-ink-2 hover:bg-sunken hover:text-ink"
                            >
                              Lọc
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="px-2 py-1.5 rounded-md bg-sunken/40 border border-line text-2xs text-ink-3">
                          Chưa phân công
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-2xs font-medium text-ink-3">
                        Nhân viên hỗ trợ ({storeAssignment.supportStaff.length})
                      </div>
                      {storeAssignment.supportStaff.length > 0 ? (
                        <div className="max-h-44 overflow-y-auto space-y-1 pr-0.5">
                          {storeAssignment.supportStaff.map((staffName) => (
                            <div
                              key={staffName}
                              className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-surface border border-line"
                            >
                              <Person
                                name={staffName}
                                sub={`${
                                  picRowCountMap.get(staffName.trim().toLowerCase()) || 0
                                } dòng trong bảng`}
                                size={22}
                              />
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Status tone="info">Hỗ trợ</Status>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFilterNhanSu(staffName);
                                    setIsPicPopoverOpen(false);
                                  }}
                                  className="px-1.5 py-0.5 rounded border border-line bg-surface text-2xs text-ink-2 hover:bg-sunken hover:text-ink"
                                >
                                  Lọc
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="px-2 py-1.5 rounded-md bg-sunken/40 border border-line text-2xs text-ink-3">
                          Không có nhân sự hỗ trợ
                        </div>
                      )}
                    </div>

                    {storeLeaderName && (
                      <div className="space-y-1.5 pt-1 border-t border-line">
                        <div className="text-2xs font-medium text-ink-3">Trưởng nhóm phụ trách</div>
                        <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-surface border border-line">
                          <Person name={storeLeaderName} size={22} />
                          <Status tone="brand">Leader</Status>
                        </div>
                      </div>
                    )}

                    {isAdminOrManager && onOpenSheetSetupScreen && (
                      <div className="pt-2 border-t border-line">
                        <button
                          type="button"
                          onClick={() => {
                            setIsPicPopoverOpen(false);
                            onOpenSheetSetupScreen('FIELD_PERMISSIONS');
                          }}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md bg-sunken border border-line text-ink font-medium hover:bg-line/50"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-accent" />
                          <span>Cấu hình phân quyền sửa trường</span>
                        </button>
                      </div>
                    )}

                    {filterNhanSu !== 'ALL' && (
                      <div className="pt-1 border-t border-line flex items-center justify-between gap-2">
                        <span className="text-2xs text-ink-2 truncate">
                          Đang lọc: <strong className="text-ink">{filterNhanSu}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setFilterNhanSu('ALL');
                            setIsPicPopoverOpen(false);
                          }}
                          className="text-2xs font-medium text-accent hover:underline shrink-0"
                        >
                          Bỏ lọc
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {currentGoogleSheetUrl ? (
                <div className="inline-flex items-center rounded-md border border-line-strong bg-surface overflow-hidden h-7">
                  <a
                    href={currentGoogleSheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 h-full text-accent font-medium hover:bg-sunken transition-colors"
                    title={currentGoogleSheetUrl}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                    <span>Mở Sheet</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                  <button
                    type="button"
                    onClick={handleOpenSheetTemplateModal}
                    className="inline-flex items-center gap-1 px-2 h-full border-l border-line text-ink-2 font-medium hover:bg-sunken hover:text-ink transition-colors"
                    title="Ẩn các tháng cũ, ẩn/hiện cột Template và Sort theo Sản phẩm / Nhân sự trên Google Sheet"
                  >
                    <Settings className="w-3.5 h-3.5 shrink-0 text-accent" />
                    <span>Setup Sheet</span>
                  </button>
                </div>
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
                  className="h-7 inline-flex items-center gap-1 px-2 rounded-md bg-surface border border-line-strong text-warning font-medium hover:bg-sunken"
                >
                  <Link2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Gắn Link Sheet</span>
                </button>
              )}
            </div>
          </div>

          {/* Cụm phải Thanh 1: Chế độ cột + Nút Cột + Chọn KOC + Thêm dòng + Tạo Deal + Khác */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <div className="inline-flex items-center p-0.5 rounded-md bg-surface border border-line text-2xs">
              <button
                type="button"
                onClick={() => applyColumnPreset('BRAND_WORKING_FILE')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  activeColumnPreset === 'BRAND_WORKING_FILE'
                    ? 'bg-ink text-surface font-semibold shadow-2xs'
                    : 'text-ink-2 hover:text-ink'
                }`}
              >
                1. Trình Brand (17)
              </button>
              <button
                type="button"
                onClick={() => applyColumnPreset('ACCEPTANCE_FILE_32')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  activeColumnPreset === 'ACCEPTANCE_FILE_32'
                    ? 'bg-ink text-surface font-semibold shadow-2xs'
                    : 'text-ink-2 hover:text-ink'
                }`}
              >
                2. Đi Air &amp; Nghiệm thu
              </button>
              <button
                type="button"
                onClick={() => applyColumnPreset('ALL_48')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  activeColumnPreset === 'ALL_48'
                    ? 'bg-ink text-surface font-semibold shadow-2xs'
                    : 'text-ink-2 hover:text-ink'
                }`}
              >
                Đầy đủ (57)
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsColumnPickerOpen((v) => !v)}
              className={`h-7 inline-flex items-center gap-1 px-2 rounded-md border text-2xs font-medium transition-colors ${
                isColumnPickerOpen
                  ? 'bg-ink text-surface border-ink'
                  : 'bg-surface text-ink-2 border-line hover:bg-sunken hover:text-ink'
              }`}
              title="Bật/tắt hiển thị từng cột trên bảng"
            >
              <Columns className="w-3.5 h-3.5 shrink-0" />
              <span>
                Cột ({visibleColumns.length}/57)
              </span>
            </button>

            <Button
              variant="secondary"
              size="sm"
              icon={UserPlus}
              onClick={handleOpenDirectoryPickerModal}
            >
              Chọn KOC
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={Plus}
              onClick={handleAddBlankRow}
            >
              Thêm dòng
            </Button>

            {sheetStats.brandApprovedCount > 0 && (
              <Button
                variant="secondary"
                size="sm"
                icon={ArrowRight}
                onClick={() => handleOpenCreateDealsModal()}
              >
                {sheetStats.readyToCreateDealsCount > 0
                  ? `Tạo Deal (${sheetStats.readyToCreateDealsCount})`
                  : `Deal (${sheetStats.brandApprovedCount})`}
              </Button>
            )}

            <ActionMenu
              label="Khác"
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

        {/* Thanh 2 (1 dòng duy nhất): Tìm kiếm + Bộ lọc + Sort (Trái) & Chú giải nguồn cột / Chỉ số thu gọn (Phải) */}
        <div className="px-3 py-1.5 border-b border-line bg-surface flex flex-wrap items-center justify-between gap-2">
          {/* Bên trái: Tìm kiếm, Lọc, Sắp xếp */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="relative w-44 sm:w-56">
              <Search className="w-3.5 h-3.5 text-ink-3 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={rowSearchQuery}
                onChange={(e) => setRowSearchQuery(e.target.value)}
                placeholder="Tìm ID kênh, tên KOC, SP..."
                className="w-full h-7 pl-7 pr-2 text-xs rounded-md border border-line bg-surface text-ink focus:outline-none focus:border-ink"
              />
            </div>

            <select
              value={filterDot}
              onChange={(e) => setFilterDot(e.target.value)}
              className="h-7 px-2 text-xs rounded-md border border-line bg-surface text-ink"
            >
              <option value="ALL">Đợt: Tất cả</option>
              {DOT_LISTING_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <select
              value={filterBrandChon}
              onChange={(e) => setFilterBrandChon(e.target.value)}
              className="h-7 px-2 text-xs rounded-md border border-line bg-surface text-ink"
            >
              <option value="ALL">Brand: Tất cả</option>
              {BRAND_CHON_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  Brand: {b}
                </option>
              ))}
            </select>

            <select
              value={filterNhanSu}
              onChange={(e) => setFilterNhanSu(e.target.value)}
              className="h-7 px-2 text-xs rounded-md border border-line bg-surface text-ink max-w-[165px]"
              aria-label="Lọc theo nhân sự điền"
            >
              <option value="ALL">NV: Toàn nhóm</option>
              <option value="MINE">Của tôi ({currentUserName})</option>
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
              className="h-7 px-2 text-xs rounded-md border border-line bg-surface text-ink"
              aria-label="Sắp xếp bảng theo Sản phẩm hoặc Nhân sự"
            >
              <option value="DEFAULT">Sắp xếp: Mặc định</option>
              <option value="PRODUCT">Sort: Sản phẩm (A→Z)</option>
              <option value="STAFF">Sort: Nhân sự (A→Z)</option>
              <option value="BATCH">Sort: Đợt Listing</option>
              <option value="BRAND_DECISION">Sort: Brand chọn (Yes)</option>
            </select>

            {storeOldMonthGroups.length > 0 && (
              <button
                type="button"
                onClick={() => setShowOldMonthsInTable((v) => !v)}
                className={`h-7 px-2 rounded-md border text-2xs font-medium transition-colors ${
                  showOldMonthsInTable
                    ? 'bg-accent-soft text-accent border-accent/30'
                    : 'bg-sunken text-ink-2 border-line hover:text-ink'
                }`}
                title="Hiện hoặc ẩn các nhóm dòng tháng cũ của gian hàng này ngay đầu bảng"
              >
                {showOldMonthsInTable
                  ? `Tháng cũ (${storeOldMonthGroups.length}): Đang hiện`
                  : `Tháng cũ (${storeOldMonthGroups.length}): Đang ẩn`}
              </button>
            )}
          </div>

          {/* Bên phải Thanh 2: Chú giải màu cột (Tự động / Công thức / NV điền) lấp đầy cân đối khoảng trống phải */}
          <div className="flex flex-wrap items-center gap-2 text-2xs text-ink-2 shrink-0">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Tự động: Danh bạ KOC
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Công thức: Tự tính
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sunken text-ink-2 border border-line font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-ink-3" />
              NV điền: Nhập / chọn
            </span>
          </div>
        </div>

        {/* Thanh thao tác hàng loạt theo ngữ cảnh (Contextual Bulk Action Bar) khi tích chọn dòng */}
        {selectedRowIds.length > 0 && (
          <div className="px-3 py-1.5 bg-accent-soft/60 border-b border-accent/25 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 font-semibold text-accent">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Đã chọn {selectedRowIds.length} KOC</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedRowIds([])}
                className="text-2xs font-medium text-ink-2 hover:text-ink underline"
              >
                Bỏ chọn
              </button>
              <span className="h-3.5 w-px bg-line-strong mx-0.5" />
              <span className="text-2xs font-medium text-ink-2">Đổi hàng loạt:</span>

              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkUpdateSelectedRows('dot', e.target.value);
                    e.target.value = '';
                  }
                }}
                className="h-7 px-2 text-2xs font-medium rounded border border-line-strong bg-surface text-ink"
              >
                <option value="">+ Gán Đợt...</option>
                {DOT_LISTING_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkUpdateSelectedRows('deXuatUpBase', e.target.value);
                    e.target.value = '';
                  }
                }}
                className="h-7 px-2 text-2xs font-medium rounded border border-line-strong bg-surface text-ink"
              >
                <option value="">+ Đề xuất UpBase...</option>
                {DE_XUAT_UPBASE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>

              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkUpdateSelectedRows('brandChon', e.target.value);
                    e.target.value = '';
                  }
                }}
                className="h-7 px-2 text-2xs font-semibold rounded border border-line-strong bg-surface text-ink"
              >
                <option value="">+ Brand chọn (Yes/No)...</option>
                {BRAND_CHON_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    Brand: {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {rows.some(
                (r) => selectedRowIds.includes(r.id) && r.brandChon === 'Yes'
              ) && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={ArrowRight}
                  onClick={() => handleOpenCreateDealsModal(rows, selectedRowIds)}
                >
                  Tạo deal (
                  {
                    rows.filter(
                      (r) => selectedRowIds.includes(r.id) && r.brandChon === 'Yes'
                    ).length
                  }
                  )
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                icon={Mail}
                onClick={() => handleOpenOutreachForSelection('COMPOSE')}
              >
                Gửi mail ({selectedRowIds.length})
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={Upload}
                onClick={handleOpenPushSheetModal}
              >
                Đẩy Sheet ({selectedRowIds.length})
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                onClick={handleDeleteSelectedRows}
              >
                Xóa ({selectedRowIds.length})
              </Button>
            </div>
          </div>
        )}

        {/* Khung bật/tắt cột tùy ý (chỉ hiện khi bấm nút Cột) */}
        {isColumnPickerOpen && (
          <div className="p-3 bg-sunken border-b border-line space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-line">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink">
                <span>Cấu hình cột hiển thị:</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs border bg-emerald-50 text-emerald-700 border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Tự động: Lấy từ Danh bạ
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs border bg-accent-soft text-accent border-accent/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  Công thức: Tự tính
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs border bg-amber-50 text-amber-800 border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  NV điền: Nhập/chọn
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => applyColumnPreset('BRAND_WORKING_FILE')}
                >
                  1. Trình Brand (15 cột trọng tâm)
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => applyColumnPreset('ACCEPTANCE_FILE_32')}
                >
                  2. Đi Air &amp; Nghiệm thu
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => applyColumnPreset('LARK_BASE')}
                >
                  Lark Base (46 cột)
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => applyColumnPreset('ALL_48')}
                >
                  Tất cả ({STAFF_LISTING_COLUMNS.length} cột A–BE)
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
        <div className="overflow-x-auto max-h-[75vh]">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-20 bg-sunken border-b border-line">
              <tr>
                <th className="sticky left-0 z-30 bg-sunken px-1.5 py-2 border-r border-line w-[36px] min-w-[36px] max-w-[36px] text-center">
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
                <th className="sticky left-[36px] z-30 bg-sunken px-1 py-2 border-r border-line w-[36px] min-w-[36px] max-w-[36px] text-center font-mono text-2xs text-ink-3">
                  STT
                </th>
                {visibleColumns.map((col) => {
                  const badge = FILL_MODE_BADGE[col.fillMode];
                  const isStickyId = col.key === 'idKenh';
                  const displayHeader = getDisplayHeader(col);
                  const isSystemReadOnly = STAFF_SHEET_READONLY_SYSTEM_COLUMNS.includes(col.key);
                  const colEditableByRole = isColumnAllowedForCurrentUser(col.key);
                  const dotColorClass =
                    col.fillMode === 'AUTO_SYSTEM'
                      ? 'bg-emerald-500'
                      : col.fillMode === 'FORMULA'
                        ? 'bg-accent'
                        : 'bg-amber-500';
                  return (
                    <th
                      key={col.key}
                      style={
                        isStickyId
                          ? { width: 210, minWidth: 210, maxWidth: 210 }
                          : { minWidth: col.width }
                      }
                      title={
                        isSystemReadOnly
                          ? `Cột ${col.excelCol} (${badge.label}): ${col.header} — Hệ thống tự động tính`
                          : colEditableByRole
                            ? `Cột ${col.excelCol} (${badge.label}): ${col.header} — Được phép chỉnh sửa`
                            : `Cột ${col.excelCol} (${badge.label}): ${col.header} — Khóa sửa theo phân quyền`
                      }
                      className={`px-2 py-2 border-r border-line text-left align-middle ${
                        isStickyId
                          ? 'sticky left-[72px] z-30 bg-sunken shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1 min-w-0 truncate">
                          <span className="font-mono text-2xs text-ink-3 shrink-0">
                            {col.excelCol}
                          </span>
                          <span className="font-semibold text-ink truncate">
                            {displayHeader}
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1 shrink-0">
                          {!isSystemReadOnly && !colEditableByRole && (
                            <Lock className="w-3 h-3 text-ink-3 shrink-0" />
                          )}
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${dotColorClass}`}
                          />
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-line">
              {/* Các nhóm dòng thuộc Tháng cũ theo Cột Tháng (Cột B) — Mặc định thu gọn gọn gàng */}
              {showOldMonthsInTable &&
                storeOldMonthGroups.map((group) => {
                  const isExpanded = expandedOldMonths.includes(group.month);
                  return (
                    <React.Fragment key={`old-month-group-${group.month}`}>
                      <tr className="bg-sunken/80 hover:bg-sunken transition-colors">
                        <td
                          colSpan={visibleColumns.length + 2}
                          className="p-0 border-b border-line bg-sunken/80"
                        >
                          <div className="sticky left-0 max-w-[calc(100vw-360px)] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleExpandOldMonthInTable(group.month)}
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-line-strong bg-surface font-semibold text-ink hover:bg-accent-soft hover:text-accent transition-colors"
                              >
                                <span className="font-mono text-xs">
                                  {isExpanded ? '[-]' : '[+]'}
                                </span>
                                <span>Cột Tháng (B): {group.month}</span>
                              </button>
                              <Status tone={isExpanded ? 'info' : 'neutral'}>
                                {isExpanded ? 'Đang mở rộng' : 'Đã thu gọn tháng cũ'}
                              </Status>
                              <span className="text-2xs text-ink-2">
                                <strong>{group.rows.length}</strong> dòng KOC · Brand chọn Yes:{' '}
                                <strong className="text-positive">{group.approvedCount}</strong> · Tổng Net:{' '}
                                <strong className="font-mono tabular-nums">
                                  {formatVnd(group.totalNet)}
                                </strong>
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => toggleExpandOldMonthInTable(group.month)}
                                className="text-2xs font-medium text-accent hover:underline px-1.5 py-0.5"
                              >
                                {isExpanded
                                  ? 'Thu gọn lại tháng này'
                                  : `Bấm mở xem nhanh ${group.rows.length} dòng`}
                              </button>
                              <span className="text-line-strong">·</span>
                              <button
                                type="button"
                                onClick={() => onChangeMonth(group.month)}
                                className="text-2xs font-medium text-ink-2 hover:text-ink hover:underline px-1.5 py-0.5"
                              >
                                Chuyển hẳn sang Tháng {group.month}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                      {isExpanded &&
                        group.rows.map((oldRow, oldIdx) => (
                          <tr
                            key={`old-${group.month}-${oldRow.id}`}
                            className="bg-sunken/35 text-ink-2 hover:bg-sunken/60 transition-colors"
                          >
                            <td className="sticky left-0 z-10 bg-sunken px-2 py-1 border-r border-line text-center font-mono text-2xs text-ink-3">
                              —
                            </td>
                            <td className="sticky left-[38px] z-10 bg-sunken px-1.5 py-1 border-r border-line text-center font-mono text-2xs text-ink-3 tabular-nums">
                              {oldIdx + 1}
                            </td>
                            {visibleColumns.map((col) => {
                              const isStickyId = col.key === 'idKenh';
                              const val = oldRow[col.key];
                              return (
                                <td
                                  key={`old-cell-${oldRow.id}-${col.key}`}
                                  className={`px-2 py-1 border-r border-line text-2xs truncate max-w-[220px] ${
                                    isStickyId
                                      ? 'sticky left-[76px] z-10 bg-sunken font-semibold text-ink shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]'
                                      : ''
                                  }`}
                                >
                                  {col.key === 'thang' ? (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-surface border border-line font-mono font-semibold text-ink-2">
                                      {oldRow.thang || group.month}
                                    </span>
                                  ) : col.key === 'brandChon' ? (
                                    <Status
                                      tone={
                                        oldRow.brandChon === 'Yes'
                                          ? 'positive'
                                          : oldRow.brandChon === 'No'
                                            ? 'critical'
                                            : 'neutral'
                                      }
                                    >
                                      {oldRow.brandChon || 'Chờ duyệt'}
                                    </Status>
                                  ) : col.key === 'giaNetVideo' || col.key === 'phiBookingKemThue' ? (
                                    <span className="font-mono tabular-nums">
                                      {formatVnd(Number(val) || 0)}
                                    </span>
                                  ) : (
                                    String(val ?? '—')
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                    </React.Fragment>
                  );
                })}

              {/* Thanh tiêu đề Tháng hiện tại đang làm việc khi có các nhóm Tháng cũ ở trên */}
              {showOldMonthsInTable && storeOldMonthGroups.length > 0 && (
                <tr className="bg-accent-soft/25">
                  <td
                    colSpan={visibleColumns.length + 2}
                    className="p-0 border-b border-line bg-accent-soft/25"
                  >
                    <div className="sticky left-0 max-w-[calc(100vw-360px)] px-3 py-1.5 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-accent text-white font-semibold">
                          <span>[-] Cột Tháng (B): {activeMonth}</span>
                        </span>
                        <Status tone="positive">Tháng đang làm việc (Mở rộng)</Status>
                        <span className="text-2xs text-ink-2">
                          Đang hiển thị <strong>{displayedRows.length}</strong> / {rows.length} dòng KOC của tháng {activeMonth}
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
              )}

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
                      <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                        {storeOldMonthGroups.length > 0 && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onChangeMonth(storeOldMonthGroups[0].month)}
                          >
                            Xem Tháng {storeOldMonthGroups[0].month} ({storeOldMonthGroups[0].rows.length} KOC)
                          </Button>
                        )}
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
                  const isSelected = selectedRowIdSet.has(row.id);
                  const rowEditable = canEditRow(row);
                  const stickyCellBg = isSelected
                    ? 'bg-accent-soft'
                    : 'bg-surface group-hover:bg-sunken';
                  const flatInputClass =
                    'w-full h-7 px-1.5 rounded border border-transparent bg-transparent hover:border-line hover:bg-surface focus:border-ink focus:bg-surface text-xs text-ink focus:outline-none disabled:hover:border-transparent disabled:hover:bg-transparent disabled:text-ink-3 transition-colors';
                  const flatSelectClass =
                    'w-full h-7 px-1.5 rounded border border-transparent bg-transparent hover:border-line hover:bg-surface focus:border-ink focus:bg-surface text-xs text-ink focus:outline-none disabled:hover:border-transparent disabled:hover:bg-transparent disabled:text-ink-3 transition-colors cursor-pointer';
                  return (
                    <tr
                      key={row.id}
                      className={`group ${
                        isSelected ? 'bg-accent-soft/30' : 'hover:bg-sunken/50'
                      } transition-colors`}
                    >
                      <td
                        className={`sticky left-0 z-10 ${stickyCellBg} px-1.5 py-1 border-r border-line w-[36px] min-w-[36px] max-w-[36px] text-center`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(row.id)}
                          className="rounded border-line"
                        />
                      </td>
                      <td
                        className={`sticky left-[36px] z-10 ${stickyCellBg} px-1 py-1 border-r border-line w-[36px] min-w-[36px] max-w-[36px] text-center font-mono text-2xs text-ink-3 tabular-nums`}
                      >
                        {rIdx + 1}
                      </td>

                      {visibleColumns.map((col) => {
                        const isStickyId = col.key === 'idKenh';
                        const cellBaseClass = `px-1.5 py-1 border-r border-line align-middle ${
                          isStickyId
                            ? `sticky left-[72px] z-10 ${stickyCellBg} shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]`
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
                              className={`${cellBaseClass} bg-sunken/25`}
                              title={`Ghi nhận thời điểm Listing KOC lên bảng: ${String(
                                row.ngayDien || '—'
                              )}`}
                            >
                              <div className="inline-flex items-center gap-1 font-mono text-2xs text-ink-2 whitespace-nowrap tabular-nums">
                                <span>{String(row.ngayDien || '—')}</span>
                              </div>
                            </td>
                          );
                        }

                        if (col.key === 'thang' || col.key === 'store') {
                          return (
                            <td key={col.key} className={`${cellBaseClass} bg-sunken/25`}>
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
                              <div className="flex items-center justify-between gap-1 px-1">
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
                                className={flatSelectClass}
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
                                className={flatSelectClass}
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
                                className={flatSelectClass}
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
                                className={flatSelectClass}
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
                                className={`w-full h-7 px-1.5 rounded border text-xs font-medium disabled:opacity-60 cursor-pointer ${
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
                          const slaTooltip = row.ngayBrandDuyet
                            ? `Listing: ${row.ngayDien || '—'} → Brand duyệt: ${row.ngayBrandDuyet} | SLA: ${row.slaBrandDuyet || rowSla.label}`
                            : `Listing lúc: ${row.ngayDien || '—'} | ${rowSla.label}`;
                          return (
                            <td
                              key={col.key}
                              className={cellBaseClass}
                              title={cellTitle || slaTooltip}
                            >
                              <div className="flex items-center gap-1">
                                <select
                                  disabled={!cellEditable}
                                  value={row.brandChon}
                                  onChange={(e) =>
                                    handleCellChange(row.id, 'brandChon', e.target.value)
                                  }
                                  className={`w-full h-7 px-1.5 rounded border text-xs font-semibold disabled:opacity-60 cursor-pointer ${
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
                                  <span
                                    className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 font-mono text-2xs font-semibold text-emerald-700 shrink-0"
                                    title={
                                      row.maBooking
                                        ? `Đã tạo Deal: ${row.maBooking}`
                                        : 'Đã chốt chuyển sang Bảng Deal'
                                    }
                                  >
                                    {row.maBooking || 'BO'}
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        }

                        if (col.key === 'ngayBrandDuyet') {
                          return (
                            <td
                              key={col.key}
                              className={`${cellBaseClass} bg-sunken/25`}
                              title={
                                row.ngayBrandDuyet
                                  ? `Listing lúc: ${row.ngayDien || '—'} | Brand phản hồi lúc: ${row.ngayBrandDuyet}`
                                  : 'Chưa có phản hồi từ Brand'
                              }
                            >
                              {row.ngayBrandDuyet ? (
                                <div className="inline-flex items-center gap-1 font-mono text-2xs font-medium text-ink whitespace-nowrap tabular-nums">
                                  <span>{row.ngayBrandDuyet}</span>
                                </div>
                              ) : (
                                <span className="text-2xs text-ink-3">—</span>
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
                              className={`${cellBaseClass} bg-sunken/25`}
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
                            <td key={col.key} className={`${cellBaseClass} bg-sunken/25`}>
                              {row.maBooking ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 font-mono text-xs font-semibold text-emerald-800">
                                  {row.maBooking}
                                </span>
                              ) : (
                                <span className="text-2xs text-ink-3">—</span>
                              )}
                            </td>
                          );
                        }

                        if (col.key === 'linkAirNghiemThu') {
                          return (
                            <td key={col.key} className={cellBaseClass} title={cellTitle}>
                              <div className="flex items-center gap-1">
                                <BufferedSheetTextInput
                                  type="url"
                                  disabled={!cellEditable}
                                  value={String(row.linkAirNghiemThu ?? '')}
                                  onCommit={(val) =>
                                    handleCellChange(row.id, 'linkAirNghiemThu', val)
                                  }
                                  placeholder="Dán link video Air..."
                                  className={flatInputClass}
                                />
                                {row.linkAirNghiemThu && (
                                  <a
                                    href={row.linkAirNghiemThu}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="h-6 w-6 rounded border border-line bg-surface text-accent hover:bg-sunken inline-flex items-center justify-center shrink-0"
                                    title="Mở video nghiệm thu"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </td>
                          );
                        }

                        if (col.key === 'trangThaiSlaAir') {
                          const slaVal = row.trangThaiSlaAir || 'Chưa lên sóng';
                          return (
                            <td key={col.key} className={`${cellBaseClass} bg-sunken/25`}>
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
                            <td key={col.key} className={`${cellBaseClass} bg-sunken/25`}>
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
                              className={`${cellBaseClass} font-mono text-xs font-semibold text-right tabular-nums bg-sunken/25`}
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
                              <BufferedSheetNumberInput
                                disabled={!cellEditable}
                                value={Number(row[col.key]) || 0}
                                onCommit={(val) => handleCellChange(row.id, col.key, val)}
                                className={`${flatInputClass} text-right font-mono tabular-nums`}
                              />
                            </td>
                          );
                        }

                        if (col.key === 'linkKenh') {
                          return (
                            <td key={col.key} className={cellBaseClass}>
                              <div className="flex items-center gap-1.5 px-1">
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
                              className={`${cellBaseClass} font-mono font-semibold text-ink tabular-nums text-right bg-sunken/35`}
                            >
                              {formatVnd(row.phiBookingKemThue)}
                            </td>
                          );
                        }

                        if (
                          col.key === 'giaDaHopTacTruocDo' ||
                          col.key === 'giaNetVideo' ||
                          col.key === 'follower' ||
                          col.key === 'gmvDaHopTac' ||
                          col.key === 'doanhSo' ||
                          col.key === 'doanhSoUocTinh30d' ||
                          col.key === 'soMonBanRa' ||
                          col.key === 'gpm' ||
                          col.key === 'aov' ||
                          col.key === 'viewTrungBinh' ||
                          col.key === 'costPerView' ||
                          col.key === 'gmvTarget' ||
                          col.key === 'viewTrungVi' ||
                          col.key === 'viewTarget'
                        ) {
                          return (
                            <td key={col.key} className={cellBaseClass} title={cellTitle}>
                              <BufferedSheetNumberInput
                                disabled={!cellEditable}
                                value={Number(row[col.key]) || 0}
                                onCommit={(val) => handleCellChange(row.id, col.key, val)}
                                className={`${flatInputClass} text-right font-mono tabular-nums`}
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
                          col.key === 'tuoiOtherPct' ||
                          col.key === 'ctrPct' ||
                          col.key === 'crPct' ||
                          col.key === 'tyLeTuongTacPct'
                        ) {
                          const isFormulaCol = col.fillMode === 'FORMULA';
                          return (
                            <td
                              key={col.key}
                              title={cellTitle}
                              className={`${cellBaseClass} ${
                                isFormulaCol ? 'bg-sunken/35' : ''
                              }`}
                            >
                              <div className="flex items-center justify-end gap-0.5">
                                <BufferedSheetNumberInput
                                  mode="percent"
                                  disabled={!cellEditable || isFormulaCol}
                                  readOnly={isFormulaCol}
                                  value={Number(row[col.key]) || 0}
                                  onCommit={(val) => handleCellChange(row.id, col.key, val)}
                                  className={`w-16 h-7 px-1 rounded border text-right font-mono text-xs tabular-nums ${
                                    isFormulaCol
                                      ? 'border-transparent bg-transparent text-ink-2 font-semibold'
                                      : 'border-transparent bg-transparent hover:border-line hover:bg-surface focus:border-ink focus:bg-surface text-ink disabled:text-ink-3'
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
                          const tiktokUrl =
                            row.linkKenh ||
                            (cleanH ? `https://www.tiktok.com/@${cleanH}` : '');
                          return (
                            <td
                              key={col.key}
                              style={{ width: 210, minWidth: 210, maxWidth: 210 }}
                              className={cellBaseClass}
                              title={cellTitle}
                            >
                              <div className="flex items-center gap-0.5">
                                <BufferedSheetTextInput
                                  type="text"
                                  disabled={!cellEditable}
                                  value={String(row.idKenh ?? '')}
                                  onCommit={(val) => handleCellChange(row.id, 'idKenh', val)}
                                  onBlurAfterCommit={() => handleIdKenhBlur(row.id)}
                                  onDoubleClick={() => {
                                    if (cleanH || row.kocId) setQuickViewRow(row);
                                  }}
                                  placeholder={col.header}
                                  className={`${flatInputClass} min-w-0 font-semibold`}
                                />
                                {tiktokUrl && (
                                  <a
                                    href={tiktokUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={`Mở kênh TikTok @${cleanH}`}
                                    className="h-6 w-6 rounded text-ink-3 hover:text-accent hover:bg-surface inline-flex items-center justify-center shrink-0 transition-colors"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setQuickViewRow(row)}
                                  disabled={!cleanH && !row.kocId}
                                  title={`Xem nhanh hồ sơ KOC, hiệu suất kênh & lịch sử hợp tác (@${cleanH || 'KOC'})`}
                                  className="h-6 w-6 rounded text-accent hover:bg-surface inline-flex items-center justify-center shrink-0 disabled:opacity-35 transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenOutreachForSingleRow(row)}
                                  title={
                                    isSent
                                      ? `Đã gửi thư mời hợp tác (${row.email || 'Xem lại / Gửi tiếp'})`
                                      : `Soạn & gửi mail mời hợp tác cho @${cleanH || 'KOC'}`
                                  }
                                  className={`relative h-6 w-6 rounded inline-flex items-center justify-center shrink-0 transition-colors ${
                                    isSent
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'text-ink-3 hover:text-ink hover:bg-surface'
                                  }`}
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                  {isSent && (
                                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500" />
                                  )}
                                </button>
                              </div>
                            </td>
                          );
                        }

                        if (col.key === 'tenKenh') {
                          const cleanH = normalizeTikTokId(row.idKenh).toLowerCase();
                          return (
                            <td key={col.key} className={cellBaseClass} title={cellTitle}>
                              <BufferedSheetTextInput
                                type="text"
                                disabled={!cellEditable}
                                value={String(row.tenKenh ?? '')}
                                onCommit={(val) => handleCellChange(row.id, 'tenKenh', val)}
                                onDoubleClick={() => {
                                  if (cleanH || row.kocId) setQuickViewRow(row);
                                }}
                                placeholder={col.header}
                                className={flatInputClass}
                              />
                            </td>
                          );
                        }

                        if (col.key === 'email') {
                          return (
                            <td key={col.key} className={cellBaseClass} title={cellTitle}>
                              <div className="flex items-center gap-1">
                                <BufferedSheetTextInput
                                  type="email"
                                  disabled={!cellEditable}
                                  value={String(row.email ?? '')}
                                  onCommit={(val) => handleCellChange(row.id, 'email', val)}
                                  placeholder="email@gmail.com"
                                  className={flatInputClass}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleOpenOutreachForSingleRow(row)}
                                  title="Mở hộp thoại gửi mail mời hợp tác"
                                  className="h-6 w-6 rounded text-ink-3 hover:text-ink hover:bg-surface inline-flex items-center justify-center shrink-0"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          );
                        }

                        if (col.key === 'sanPham') {
                          return (
                            <td key={col.key} className={cellBaseClass} title={cellTitle}>
                              <BrandProductDropdownInput
                                size="sm"
                                disabled={!cellEditable}
                                value={String(row.sanPham ?? '')}
                                onChange={(val) => handleCellChange(row.id, 'sanPham', val)}
                                brandName={activeStoreObj?.brandName}
                                storeName={activeStoreName}
                                storeObj={activeStoreObj}
                                deals={deals}
                                precomputedCatalog={activeBrandProductCatalog}
                                placeholder="Chọn SP của Brand..."
                              />
                            </td>
                          );
                        }

                        // Các cột văn bản chung (contentNote, leaderNote, lyDoTuChoi, thanhQuaHopTac, ngayAirPlan, thông tin liên hệ/ngân hàng/CCCD...)
                        return (
                          <td key={col.key} className={cellBaseClass} title={cellTitle}>
                            <BufferedSheetTextInput
                              type="text"
                              disabled={!cellEditable}
                              value={String(row[col.key] ?? '')}
                              onCommit={(val) => handleCellChange(row.id, col.key, val)}
                              placeholder={col.header}
                              className={flatInputClass}
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
        title="Tìm kiếm & Chọn KOC từ Danh bạ đưa vào Sheet"
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
              Đưa {pickedKocIds.length} KOC vào Sheet &ldquo;{pickerTargetStoreName}&rdquo; ({pickerTargetMonth})
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {/* Hàng 1: Chọn Plan Tháng, Gian hàng (Sheet Brand) và Đợt Listing */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 p-3 rounded-lg bg-sunken border border-line">
            <Field label="Plan Tháng" className="sm:col-span-3" labelClassName="whitespace-nowrap">
              <Select
                value={pickerTargetMonth}
                onChange={(e) => setPickerTargetMonth(e.target.value)}
              >
                {MONTH_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    Plan Tháng {m}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Gian hàng (Sheet Brand)"
              className="sm:col-span-6"
              labelClassName="whitespace-nowrap"
            >
              <Select
                value={pickerTargetStoreName}
                onChange={(e) => {
                  const nextStore = e.target.value;
                  setPickerTargetStoreName(nextStore);
                  const nextStoreObj = b2cStores.find((s) => s.storeName === nextStore);
                  const nextCat = buildBrandProductCatalogGroups({
                    brandName: nextStoreObj?.brandName,
                    storeName: nextStore,
                    storeObj: nextStoreObj,
                    deals,
                  });
                  setQuickProduct(
                    nextCat.flatOptions[0]?.name || nextStoreObj?.mainProducts?.[0] || ''
                  );
                }}
              >
                {b2cStores.map((st) => {
                  const key = makeSheetKey(pickerTargetMonth, st.storeName);
                  const count = collection.sheets[key]?.length || 0;
                  return (
                    <option key={st.id} value={st.storeName}>
                      {st.brandName} — {st.storeName} ({count} KOC)
                    </option>
                  );
                })}
              </Select>
            </Field>

            <Field label="Đợt (Cột C)" className="sm:col-span-3" labelClassName="whitespace-nowrap">
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

            <Field label="Sản phẩm (Cột K)" className="sm:col-span-6" labelClassName="whitespace-nowrap">
              <BrandProductDropdownInput
                value={quickProduct}
                onChange={(val) => setQuickProduct(val)}
                brandName={pickerTargetStoreObj?.brandName}
                storeName={pickerTargetStoreName}
                storeObj={pickerTargetStoreObj}
                deals={deals}
                placeholder={
                  pickerTargetStoreObj?.mainProducts?.[0] ||
                  'Chọn sản phẩm từ Danh mục SP của Brand...'
                }
              />
            </Field>

            <Field label="Content tag (Cột G)" className="sm:col-span-3" labelClassName="whitespace-nowrap">
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

            <Field label="Đề xuất UpBase (Cột R)" className="sm:col-span-3" labelClassName="whitespace-nowrap">
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
                Danh bạ KOC ({filteredDirectoryKocs.length} kênh) — Đích: {pickerTargetStoreName} (Plan {pickerTargetMonth})
              </span>
              <span className="text-ink-3">
                Đã chọn: <strong className="text-ink">{pickedKocIds.length}</strong>
              </span>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-line">
              {filteredDirectoryKocs.slice(0, 80).map((k) => {
                const cleanHandle = normalizeTikTokId(k.channelId);
                const alreadyInSheet = existingHandlesInPickerTargetSheet.has(
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
            {(googleSheetUrlDraft.trim() || currentGoogleSheetUrl) && (
              <Button
                variant="secondary"
                icon={Settings}
                onClick={async () => {
                  const targetUrl = (googleSheetUrlDraft || currentGoogleSheetUrl || '').trim();
                  if (!targetUrl) return;
                  try {
                    const res = await fetch('/api/booking-list/setup-appscript', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        storeName: activeStoreName,
                        sheetUrl: targetUrl,
                      }),
                    });
                    const data = (await res.json().catch(() => null)) as {
                      ok?: boolean;
                      code?: string;
                      error?: string;
                      results?: Array<{ ok: boolean; scriptId?: string; error?: string }>;
                    } | null;
                    if (!res.ok || !data?.ok) {
                      if (data?.code === 'OAUTH_NOT_CONFIGURED' && onOpenSheetSetupScreen) {
                        setIsGoogleSheetModalOpen(false);
                        onOpenSheetSetupScreen('SERVICE_ACCOUNT');
                        onNotify?.(
                          'Đã mở màn Quản lý Tiện ích Apps Script & Cấu hình OAuth2. Hãy dán Client ID, Client Secret và Refresh Token để cài đặt Apps Script lên Sheet.',
                          'info'
                        );
                        return;
                      }
                      onNotify?.(
                        data?.error ||
                          data?.results?.[0]?.error ||
                          'Không thể cài đặt Apps Script lên Sheet này.',
                        'error'
                      );
                      return;
                    }
                    onNotify?.(
                      `Đã cài đặt / cập nhật bộ Tiện ích Apps Script lên Google Sheet của "${activeStoreName}"!`,
                      'success'
                    );
                  } catch {
                    onNotify?.('Lỗi kết nối khi cài đặt Apps Script.', 'error');
                  }
                }}
              >
                Cài đặt Apps Script lên Sheet
              </Button>
            )}
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
        size="2xl"
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
                  Chuẩn Template List KOC_TikTok đã chốt (57 cột A → BE)
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

            {!isServiceAccountConfigured ? (
              <div className="p-3.5 bg-warning-soft/40 border-b border-line space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="p-1 rounded-md bg-warning text-white shrink-0 mt-0.5">
                    <Key className="w-4 h-4" />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="text-xs font-semibold text-ink">
                      Chưa cấu hình tài khoản Google Service Account
                    </div>
                    <div className="text-2xs text-ink-2 leading-relaxed">
                      Hệ thống cần tài khoản dịch vụ Google để đọc và ghi trực tiếp lên Google Sheet của Brand.
                      Bạn có thể dán mã khóa Service Account JSON ngay bên dưới, hoặc xuất file Excel / Copy 57 cột chuẩn để dán thủ công vào Sheet.
                    </div>
                  </div>
                </div>

                {/* Khung dán Service Account JSON nhanh */}
                <div className="space-y-2 pt-2 border-t border-line/60">
                  <div className="flex items-center justify-between">
                    <span className="text-2xs font-medium text-ink">
                      Khai báo Service Account JSON trực tiếp:
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsShowingSaJsonInput((v) => !v)}
                      className="text-2xs text-accent font-medium hover:underline"
                    >
                      {isShowingSaJsonInput ? 'Thu gọn ô dán khóa' : 'Dán mã khóa JSON'}
                    </button>
                  </div>

                  {isShowingSaJsonInput && (
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        value={pushSaJsonDraft}
                        onChange={(e) => setPushSaJsonDraft(e.target.value)}
                        placeholder='{"type": "service_account", "project_id": "...", "private_key": "...", "client_email": "..."}'
                        className="w-full p-2 rounded-md border border-line bg-surface text-ink text-2xs font-code focus:outline-none focus:border-focus"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={savingPushSa || !pushSaJsonDraft.trim()}
                          onClick={() => void handleSavePushServiceAccount()}
                        >
                          {savingPushSa ? 'Đang lưu…' : 'Lưu Service Account & Bắt đầu đối soát'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Các phương án dự phòng tải Excel / Copy TSV */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-line/60">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Download}
                    onClick={() =>
                      downloadStaffSheetCsv(
                        getTargetRowsForPush(pushScope),
                        getColsForPush(pushColMode),
                        activeStoreName,
                        activeMonth
                      )
                    }
                  >
                    Tải file CSV / Excel ({getTargetRowsForPush(pushScope).length} dòng)
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Copy}
                    onClick={() => void handleCopyTsv('ALL_48_COLS')}
                  >
                    Copy 57 cột (Dán Ctrl+V vào Google Sheet)
                  </Button>
                </div>
              </div>
            ) : !pushDiffReport ? (
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

                <PushSheetReconciliationView
                  report={pushDiffReport}
                  targetTabName={pushSheetTab || defaultGoogleSheetTab}
                  storeName={activeStoreName}
                  sheetUrl={pushSheetUrl}
                  onNotify={onNotify}
                />
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
                                <button
                                  type="button"
                                  onClick={() => {
                                    const matchedRow = rows.find(
                                      (r) =>
                                        normalizeTikTokId(r.idKenh).toLowerCase() ===
                                        normalizeTikTokId(d.handle).toLowerCase()
                                    );
                                    setQuickViewRow(
                                      matchedRow || {
                                        idKenh: d.handle,
                                        tenKenh: d.kocName || d.handle,
                                      }
                                    );
                                  }}
                                  className="inline-flex items-center gap-1 font-semibold text-accent hover:underline"
                                  title="Xem nhanh hồ sơ, hiệu suất & lịch sử KOC"
                                >
                                  <span>@{d.handle}</span>
                                  <Eye className="w-3 h-3 shrink-0" />
                                </button>
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

      {/* Modal 2B: Tạo Deal từ KOC Brand đã duyệt */}
      <Modal
        open={isCreateDealsModalOpen}
        onClose={() => setIsCreateDealsModalOpen(false)}
        title={`Tạo deal — ${activeStoreName} (${activeMonth})`}
        size="3xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsCreateDealsModalOpen(false)}>
              Hủy
            </Button>
            {onOpenCreateDealWorkspace && (
              <Button
                variant="secondary"
                icon={ArrowRight}
                onClick={() => {
                  setIsCreateDealsModalOpen(false);
                  onOpenCreateDealWorkspace({
                    storeName: activeStoreName,
                    monthKey: activeMonth,
                    drafts: dealDrafts,
                    sourceRows: rows.filter((r) => r.brandChon === 'Yes'),
                  });
                }}
              >
                Mở màn hình to để tạo deal →
              </Button>
            )}
            <Button
              variant="secondary"
              icon={Check}
              disabled={dealDrafts.filter((d) => d.selected).length === 0}
              onClick={() => handleConfirmCreateDealsAndOpenBoard(false)}
            >
              {`Tạo tại chỗ (${dealDrafts.filter((d) => d.selected).length})`}
            </Button>
            <Button
              variant="primary"
              icon={ArrowRight}
              disabled={dealDrafts.filter((d) => d.selected).length === 0}
              onClick={() => handleConfirmCreateDealsAndOpenBoard(true)}
            >
              {`Tạo & mở deal (${dealDrafts.filter((d) => d.selected).length})`}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          {/* Thanh tóm tắt gọn trên 1 hàng */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-line">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <div className="inline-flex items-center gap-1.5">
                <span className="text-ink-3">Đã chọn:</span>
                <span className="font-semibold text-ink tabular-nums">
                  {dealDrafts.filter((d) => d.selected).length}/{dealDrafts.length} KOC
                </span>
                <Status tone="positive">
                  {dealDrafts.filter((d) => d.selected && !d.isExistingBo).length} tạo mới
                </Status>
                {dealDrafts.some((d) => d.selected && d.isExistingBo) && (
                  <Status tone="neutral">
                    {dealDrafts.filter((d) => d.selected && d.isExistingBo).length} cập nhật
                  </Status>
                )}
              </div>

              {dealDrafts.length > 1 && (
                <div className="flex items-center gap-2 text-2xs">
                  <span className="text-line-strong">|</span>
                  <button
                    type="button"
                    onClick={() =>
                      setDealDrafts((prev) =>
                        prev.map((d) => ({ ...d, selected: !d.isExistingBo }))
                      )
                    }
                    className="text-positive hover:underline font-medium"
                  >
                    Chưa có mã BO ({dealDrafts.filter((d) => !d.isExistingBo).length})
                  </button>
                  <span className="text-ink-3">·</span>
                  <button
                    type="button"
                    onClick={() =>
                      setDealDrafts((prev) => prev.map((d) => ({ ...d, selected: true })))
                    }
                    className="text-accent hover:underline font-medium"
                  >
                    Chọn tất cả
                  </button>
                  <span className="text-ink-3">·</span>
                  <button
                    type="button"
                    onClick={() =>
                      setDealDrafts((prev) => prev.map((d) => ({ ...d, selected: false })))
                    }
                    className="text-ink-3 hover:text-ink hover:underline"
                  >
                    Bỏ chọn
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 tabular-nums">
              <div>
                <span className="text-ink-3">Tổng Net: </span>
                <span className="font-semibold text-positive">
                  {formatVnd(
                    dealDrafts
                      .filter((d) => d.selected)
                      .reduce((s, d) => s + (Number(d.giaChotCuoi) || 0), 0)
                  )}
                </span>
              </div>
              <div>
                <span className="text-ink-3">Tổng Gross (10%): </span>
                <span className="font-semibold text-ink">
                  {formatVnd(
                    dealDrafts
                      .filter((d) => d.selected)
                      .reduce(
                        (s, d) => s + computeGrossFeeWithTax(Number(d.giaChotCuoi) || 0),
                        0
                      )
                  )}
                </span>
              </div>

              {dealDrafts.length > 1 && (
                <div className="inline-flex items-center gap-1.5 pl-2 border-l border-line">
                  <span className="text-2xs text-ink-3">Gán ngày air:</span>
                  <input
                    type="date"
                    value={
                      dealDrafts.find((d) => d.selected)?.ngayAirChot ||
                      `${activeMonth.replace('/', '-')}-20`
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      setDealDrafts((prev) =>
                        prev.map((item) =>
                          item.selected ? { ...item, ngayAirChot: val } : item
                        )
                      );
                    }}
                    className="h-7 px-2 text-2xs tabular-nums rounded-md border border-line-strong bg-surface text-ink focus:outline-none focus:border-ink"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Bảng danh sách KOC tạo Deal: 1 dòng gọn mỗi KOC, không tràn ngang */}
          <div className="max-h-[440px] overflow-y-auto overflow-x-auto border border-line rounded-xl">
            <table className="w-full table-fixed min-w-[920px] text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-sunken/70 border-b border-line text-2xs font-semibold text-ink-3">
                <tr>
                  <th className="py-2.5 px-2.5 w-10 text-center">
                    <input
                      type="checkbox"
                      aria-label="Chọn tất cả KOC"
                      checked={
                        dealDrafts.length > 0 && dealDrafts.every((d) => d.selected)
                      }
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setDealDrafts((prev) =>
                          prev.map((item) => ({ ...item, selected: checked }))
                        );
                      }}
                      className="rounded border-line-strong"
                    />
                  </th>
                  <th className="py-2.5 px-3 w-[23%]">KOC</th>
                  <th className="py-2.5 px-2.5 w-[14%]">Mã deal</th>
                  <th className="py-2.5 px-2.5 w-[25%]">Sản phẩm chốt</th>
                  <th className="py-2.5 px-2.5 w-[13%] text-right">Giá Net (đ)</th>
                  <th className="py-2.5 px-2.5 w-[12%] text-right">Phí Gross (10%)</th>
                  <th className="py-2.5 px-2.5 w-[13%]">Ngày air dự kiến</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface">
                {dealDrafts.map((draft, idx) => (
                  <tr
                    key={draft.rowId}
                    className={
                      draft.selected
                        ? 'bg-surface hover:bg-canvas transition-colors'
                        : 'bg-sunken/30 hover:bg-sunken/50 transition-colors opacity-65'
                    }
                  >
                    <td className="py-2.5 px-2.5 align-middle text-center">
                      <input
                        type="checkbox"
                        aria-label={`Chọn ${draft.idKenh}`}
                        checked={draft.selected}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setDealDrafts((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, selected: checked } : item
                            )
                          );
                        }}
                        className="rounded border-line-strong"
                      />
                    </td>
                    <td className="py-2.5 px-3 align-middle min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => {
                            const matchedRow = rows.find((r) => r.id === draft.rowId);
                            setQuickViewRow(
                              matchedRow || {
                                idKenh: draft.idKenh,
                                tenKenh: draft.tenKenh,
                                dot: draft.dot,
                                sanPham: draft.sanPham,
                              }
                            );
                          }}
                          className="inline-flex items-center gap-1 font-semibold text-accent hover:underline min-w-0 max-w-full"
                          title="Xem hồ sơ KOC"
                        >
                          <span className="truncate">@{draft.idKenh}</span>
                          <Eye className="w-3.5 h-3.5 shrink-0" />
                        </button>
                      </div>
                      <div
                        className="text-2xs text-ink-3 truncate mt-0.5"
                        title={`${draft.tenKenh} · ${draft.dot} · PIC: ${draft.nhanSuDien}`}
                      >
                        {draft.tenKenh} · {draft.dot} · {draft.nhanSuDien}
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5 align-middle">
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
                        className="w-full h-8 px-2.5 text-xs font-code font-semibold rounded-md border border-line-strong bg-surface text-accent focus:outline-none focus:border-ink"
                      />
                    </td>
                    <td className="py-2.5 px-2.5 align-middle">
                      <BrandProductDropdownInput
                        size="sm"
                        value={draft.sanPham}
                        onChange={(val) => {
                          setDealDrafts((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, sanPham: val } : item
                            )
                          );
                        }}
                        brandName={activeStoreObj?.brandName}
                        storeName={activeStoreName}
                        storeObj={activeStoreObj}
                        deals={deals}
                        placeholder="Chọn sản phẩm..."
                      />
                    </td>
                    <td className="py-2.5 px-2.5 align-middle">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatNumber(Number(draft.giaChotCuoi) || 0)}
                        onChange={(e) => {
                          const val = parseThousandNumberInput(e.target.value);
                          setDealDrafts((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, giaChotCuoi: val } : item
                            )
                          );
                        }}
                        className="w-full h-8 px-2.5 text-xs text-right font-semibold tabular-nums rounded-md border border-line-strong bg-surface text-ink focus:outline-none focus:border-ink"
                      />
                    </td>
                    <td className="py-2.5 px-2.5 align-middle text-right tabular-nums font-medium text-ink-2">
                      {formatVnd(computeGrossFeeWithTax(draft.giaChotCuoi))}
                    </td>
                    <td className="py-2.5 px-2.5 align-middle">
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
                        className="w-full h-8 px-2 text-xs tabular-nums rounded-md border border-line-strong bg-surface text-ink focus:outline-none focus:border-ink"
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

          {/* MỤC 1: THU GỌN CÁC THÁNG CŨ THEO CỘT THÁNG (CỘT B) TRÊN FILE GOOGLE SHEET */}
          <div className="border border-line rounded-lg p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-semibold text-ink">
                  1. Thu gọn các Tháng cũ theo Cột Tháng (Cột B) trên File Google Sheet
                </div>
                <div className="text-2xs text-ink-3">
                  Trên Google Sheet, các tháng nằm chung trong bảng và phân biệt ở <strong>Cột B (Tháng)</strong>. Chọn các tháng cũ bên dưới để <strong>thu gọn dòng (Collapse Rows)</strong> trên Google Sheet, chỉ mở rộng tháng đang làm việc ({activeMonth}).
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={sheetTemplateBusy}
                  onClick={handleSelectOldMonthsToCollapseDraft}
                >
                  Chọn thu gọn tháng cũ (&lt; {activeMonth})
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={sheetTemplateBusy}
                  onClick={() => {
                    setSheetCollapsedMonthsDraft([]);
                    void runSheetTemplatePatch(
                      { expandAllMonths: true },
                      'Đã mở rộng lại toàn bộ các dòng của mọi tháng ở Cột Tháng (Cột B) trên Google Sheet.'
                    );
                  }}
                >
                  Mở rộng tất cả tháng
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  disabled={sheetTemplateBusy}
                  onClick={() =>
                    void runSheetTemplatePatch(
                      {
                        collapsedMonths: sheetCollapsedMonthsDraft,
                      },
                      sheetCollapsedMonthsDraft.length > 0
                        ? `Đã thu gọn các dòng thuộc tháng cũ (${sheetCollapsedMonthsDraft.join(', ')}) theo Cột Tháng (Cột B) trên Google Sheet.`
                        : 'Đã mở rộng toàn bộ các tháng theo Cột Tháng (Cột B) trên Google Sheet.'
                    )
                  }
                >
                  {sheetTemplateBusy ? 'Đang áp dụng…' : 'Áp dụng thu gọn Cột Tháng lên Sheet'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1">
              {Array.from(
                new Set([
                  ...MONTH_OPTIONS,
                  ...sheetMonthColumnStats.map((s) => s.month),
                ])
              )
                .sort((a, b) => b.localeCompare(a))
                .map((m) => {
                  const isCollapsed = sheetCollapsedMonthsDraft.includes(m);
                  const isCurrentMonth = m === activeMonth;
                  const appCount =
                    (collection.sheets[makeSheetKey(m, activeStoreName)] || []).length;
                  const sheetStat = sheetMonthColumnStats.find((s) => s.month === m);
                  const rowCountLabel =
                    sheetStat !== undefined
                      ? `${sheetStat.rowCount} dòng trên Sheet`
                      : `${appCount} dòng trên App`;

                  return (
                    <label
                      key={m}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-md border cursor-pointer select-none transition-colors ${
                        isCollapsed
                          ? 'bg-sunken border-line text-ink-2'
                          : 'bg-surface border-line-strong text-ink font-semibold'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="font-mono">
                            {isCollapsed ? '[+]' : '[-]'} Cột B: {m}
                          </span>
                          {isCurrentMonth && <Status tone="positive">Hiện tại</Status>}
                        </div>
                        <div className="text-2xs text-ink-3">
                          {rowCountLabel} ·{' '}
                          <strong className={isCollapsed ? 'text-warning' : 'text-positive'}>
                            {isCollapsed ? 'Thu gọn dòng' : 'Mở rộng dòng'}
                          </strong>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isCollapsed}
                        onChange={() => handleToggleCollapseMonthDraft(m)}
                        className="rounded border-line shrink-0"
                        title="Tích chọn để thu gọn các dòng có Cột B (Tháng) là tháng này"
                      />
                    </label>
                  );
                })}
            </div>
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

      {/* Modal Xem nhanh Hồ sơ, Hiệu suất Kênh & Lịch sử Hợp tác KOC */}
      <KocQuickViewModal
        open={Boolean(quickViewRow)}
        onClose={() => setQuickViewRow(null)}
        sheetRow={quickViewRow}
        kocs={kocs}
        stores={stores}
        deals={deals}
        currentUser={currentUser}
        onNotify={onNotify}
      />
    </div>
  );
};
