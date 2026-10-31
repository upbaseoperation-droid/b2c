'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
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
  Mail,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
  UserPlus,
  Users,
} from 'lucide-react';
import type { StorePortfolioItem } from '../../lib/types';
import {
  formatNumber,
  formatVndShort,
  parseThousandNumberInput,
} from '../../lib/format';
import {
  BRAND_CHON_OPTIONS,
  DE_XUAT_UPBASE_OPTIONS,
  DOT_LISTING_OPTIONS,
  STAFF_LISTING_COLUMNS,
  downloadStaffSheetCsv,
  type StaffListingColumnKey,
  type StaffListingColumnMeta,
  type StaffListingSheetRow,
} from '../../lib/staffBrandListingSheet';
import {
  ActionMenu,
  BulkBar,
  Button,
  PageActions,
  Person,
  Segmented,
  Select,
  Status,
} from '../ui';

export const BRAND_REVIEW_PRIORITY_KEYS: StaffListingColumnKey[] = [
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

export const MONTH_OPTIONS = ['2026/11', '2026/10', '2026/09', '2026/08'];

export const FILL_MODE_BADGE: Record<
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

export function getDisplayHeader(col: StaffListingColumnMeta): string {
  return (
    UI_HEADER_OVERRIDES[col.key] ||
    col.header
      .replace(/[\u{1F383}\u{1F338}]/gu, '')
      .replace(/\s*\(Bổ sung thêm\)/gi, '')
      .trim()
  );
}

export interface BufferedSheetTextInputProps {
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

export const BufferedSheetTextInput = React.memo<BufferedSheetTextInputProps>(
  function BufferedSheetTextInput({
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
    useEffect(() => {
      onCommitRef.current = onCommit;
    }, [onCommit]);

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
  }
);

export interface BufferedSheetNumberInputProps {
  value: number;
  onCommit: (nextValue: number) => void;
  disabled?: boolean;
  readOnly?: boolean;
  mode?: 'thousand' | 'percent';
  className?: string;
}

export const BufferedSheetNumberInput = React.memo<BufferedSheetNumberInputProps>(
  function BufferedSheetNumberInput({
    value,
    onCommit,
    disabled,
    readOnly,
    mode = 'thousand',
    className,
  }) {
    const [draft, setDraft] = useState(() =>
      mode === 'thousand' ? formatNumber(Number(value) || 0) : String(Number(value) || 0)
    );
    const focusedRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const latestCommittedRef = useRef(Number(value) || 0);
    const onCommitRef = useRef(onCommit);
    useEffect(() => {
      onCommitRef.current = onCommit;
    }, [onCommit]);

    useEffect(() => {
      const num = Number(value) || 0;
      latestCommittedRef.current = num;
      if (!focusedRef.current) {
        setDraft(mode === 'thousand' ? formatNumber(num) : String(num));
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
      setDraft(mode === 'thousand' ? formatNumber(parsed) : String(parsed));
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
  }
);

export interface ListingSheetSummaryHeaderProps {
  activeMonth: string;
  activeStoreName: string;
  b2cStores: StorePortfolioItem[];
  sortedB2cStoresForActiveMonth: StorePortfolioItem[];
  monthSummaryStats: Record<string, { totalKocs: number; storeCount: number }>;
  getStoreMonthCount: (m: string, storeName: string) => number;
  onChangeMonth: (month: string) => void;
  onChangeStore: (storeName: string) => void;
  sheetStats: {
    totalCount: number;
    brandApprovedCount: number;
    reviewedCount: number;
    onTimeCount: number;
    avgReviewHours: number;
    overdueWaitCount: number;
    totalNet: number;
    totalGross: number;
    readyToCreateDealsCount: number;
    alreadyCreatedDealsCount: number;
  };
  planQuotaSummary: {
    targetVideos: number;
    targetBudget: number;
    approvedNet: number;
    isOverbudget: boolean;
    isUnbudgetedSpend: boolean;
  } | null;
  isBrandReviewerRole: boolean;
  selectedRowIds: string[];
  setSelectedRowIds: (ids: string[]) => void;
  displayedRows: StaffListingSheetRow[];
  rows: StaffListingSheetRow[];
  visibleColumns: StaffListingColumnMeta[];
  visibleColumnKeys: StaffListingColumnKey[];
  isColumnPickerOpen: boolean;
  setIsColumnPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activeColumnPreset: 'BRAND_WORKING_FILE' | 'ACCEPTANCE_FILE_32' | 'LARK_BASE' | 'ALL_48';
  applyColumnPreset: (
    preset: 'BRAND_WORKING_FILE' | 'ACCEPTANCE_FILE_32' | 'LARK_BASE' | 'ALL_48'
  ) => void;
  toggleColumnKey: (key: StaffListingColumnKey) => void;
  picPopoverRef: React.RefObject<HTMLDivElement | null>;
  isPicPopoverOpen: boolean;
  setIsPicPopoverOpen: React.Dispatch<React.SetStateAction<boolean>>;
  storePicTotalCount: number;
  isPrimaryPic: boolean;
  isAdminOrManager: boolean;
  isStoreLeader: boolean;
  isSupportStaff: boolean;
  storeAssignment: {
    primaryPic: string;
    supportStaff: string[];
  };
  picRowCountMap: Map<string, number>;
  storeLeaderName?: string;
  filterNhanSu: string;
  setFilterNhanSu: (v: string) => void;
  currentGoogleSheetUrl: string;
  setGoogleSheetUrlDraft: (v: string) => void;
  setIsGoogleSheetModalOpen: (v: boolean) => void;
  handleOpenPullSheetModal: () => void;
  handleOpenPushSheetModal: () => void;
  handleOpenSheetTemplateModal: () => void;
  handleOpenDirectoryPickerModal: () => void;
  handleAddBlankRow: () => void;
  handleOpenCreateDealsModal: (
    overrideRows?: StaffListingSheetRow[],
    onlySelectedIds?: string[]
  ) => void;
  handleOpenOutreachForSelection: (tab?: 'COMPOSE' | 'TEMPLATES' | 'SETTINGS_LOGS') => void;
  handleCopyTsv: (
    mode: 'VISIBLE_COLS' | 'BRAND_WORKING_COLS' | 'ALL_48_COLS'
  ) => Promise<void>;
  handleSelectAllBrandApproved: () => void;
  handleBulkUpdateSelectedRows: (
    field: 'dot' | 'deXuatUpBase' | 'brandChon',
    value: string
  ) => void;
  handleDeleteSelectedRows: () => void;
  onOpenSheetSetupScreen?: (
    tab?: 'TABLE' | 'FIELD_PERMISSIONS' | 'BULK_PASTE' | 'SERVICE_ACCOUNT'
  ) => void;
  onOpenShortlistFilterModal?: () => void;
  onOpenDealBoard?: (context: {
    storeName: string;
    monthKey: string;
    createdDealCodes?: string[];
  }) => void;
  rowSearchQuery: string;
  setRowSearchQuery: (v: string) => void;
  filterDot: string;
  setFilterDot: (v: string) => void;
  filterBrandChon: string;
  setFilterBrandChon: (v: string) => void;
  currentUserName: string;
  staffInSheetOptions: string[];
  appSortBy: 'DEFAULT' | 'PRODUCT' | 'STAFF' | 'BATCH' | 'BRAND_DECISION';
  setAppSortBy: (v: 'DEFAULT' | 'PRODUCT' | 'STAFF' | 'BATCH' | 'BRAND_DECISION') => void;
  storeOldMonthGroupsCount: number;
  showOldMonthsInTable: boolean;
  setShowOldMonthsInTable: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ListingSheetSummaryHeader: React.FC<ListingSheetSummaryHeaderProps> = ({
  activeMonth,
  activeStoreName,
  b2cStores,
  sortedB2cStoresForActiveMonth,
  monthSummaryStats,
  getStoreMonthCount,
  onChangeMonth,
  onChangeStore,
  sheetStats,
  planQuotaSummary,
  isBrandReviewerRole,
  selectedRowIds,
  setSelectedRowIds,
  displayedRows,
  rows,
  visibleColumns,
  visibleColumnKeys,
  isColumnPickerOpen,
  setIsColumnPickerOpen,
  activeColumnPreset,
  applyColumnPreset,
  toggleColumnKey,
  picPopoverRef,
  isPicPopoverOpen,
  setIsPicPopoverOpen,
  storePicTotalCount,
  isPrimaryPic,
  isAdminOrManager,
  isStoreLeader,
  isSupportStaff,
  storeAssignment,
  picRowCountMap,
  storeLeaderName,
  filterNhanSu,
  setFilterNhanSu,
  currentGoogleSheetUrl,
  setGoogleSheetUrlDraft,
  setIsGoogleSheetModalOpen,
  handleOpenPullSheetModal,
  handleOpenPushSheetModal,
  handleOpenSheetTemplateModal,
  handleOpenDirectoryPickerModal,
  handleAddBlankRow,
  handleOpenCreateDealsModal,
  handleOpenOutreachForSelection,
  handleCopyTsv,
  handleSelectAllBrandApproved,
  handleBulkUpdateSelectedRows,
  handleDeleteSelectedRows,
  onOpenSheetSetupScreen,
  onOpenShortlistFilterModal,
  onOpenDealBoard,
  rowSearchQuery,
  setRowSearchQuery,
  filterDot,
  setFilterDot,
  filterBrandChon,
  setFilterBrandChon,
  currentUserName,
  staffInSheetOptions,
  appSortBy,
  setAppSortBy,
  storeOldMonthGroupsCount,
  showOldMonthsInTable,
  setShowOldMonthsInTable,
}) => {
  return (
    <>
      <PageActions>
        <div className="hidden xl:flex items-center gap-2 px-3 h-8 rounded-md bg-sunken/70 border border-line text-2xs">
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
              {formatNumber(sheetStats.brandApprovedCount)}/
              {formatNumber(sheetStats.totalCount)}
            </strong>
            {planQuotaSummary && planQuotaSummary.targetVideos > 0 && (
              <span
                className="text-ink-3 tabular-nums"
                title="Chỉ tiêu số lượng nội dung theo Plan 4.1.1"
              >
                (Plan: {formatNumber(planQuotaSummary.targetVideos)})
              </span>
            )}
          </div>
          <span className="h-3 w-px bg-line" />
          <div
            className="flex items-center gap-1"
            title="Đo lường SLA từ thời điểm Listing KOC mới lên đến khi Brand phản hồi (Cam kết chuẩn: ≤ 48h)"
          >
            <Clock className="w-3.5 h-3.5 text-accent shrink-0" />
            <span className="text-ink-3">SLA:</span>
            {sheetStats.reviewedCount > 0 ? (
              <strong
                className={`tabular-nums ${
                  sheetStats.onTimeCount === sheetStats.reviewedCount
                    ? 'text-positive'
                    : 'text-warning'
                }`}
              >
                {sheetStats.onTimeCount}/{sheetStats.reviewedCount} ({sheetStats.avgReviewHours}
                h)
              </strong>
            ) : (
              <strong className="text-ink-2 tabular-nums">Chờ</strong>
            )}
            {sheetStats.overdueWaitCount > 0 && (
              <span className="px-1 rounded bg-critical-soft border border-critical/30 text-critical font-semibold text-2xs">
                {sheetStats.overdueWaitCount} trễ
              </span>
            )}
          </div>
          <span className="h-3 w-px bg-line" />
          <div className="flex items-center gap-1">
            <span className="text-ink-3">Net:</span>
            <strong
              className={`tabular-nums ${
                planQuotaSummary?.isOverbudget || planQuotaSummary?.isUnbudgetedSpend
                  ? 'text-critical'
                  : 'text-ink'
              }`}
            >
              {formatVndShort(sheetStats.totalNet)}
            </strong>
            {planQuotaSummary && planQuotaSummary.targetBudget > 0 && (
              <span
                className="text-ink-3 tabular-nums"
                title="Trần ngân sách Net theo Plan 4.1.1"
              >
                /{formatVndShort(planQuotaSummary.targetBudget)}
              </span>
            )}
            {(planQuotaSummary?.isOverbudget || planQuotaSummary?.isUnbudgetedSpend) && (
              <span className="px-1 rounded bg-critical-soft border border-critical/30 text-critical font-semibold text-2xs">
                {planQuotaSummary.isUnbudgetedSpend ? 'Chưa cấp HM' : 'Vượt trần'}
              </span>
            )}
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

        {!isBrandReviewerRole && (
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
        )}
      </PageActions>

      {/* Thanh 1: Ngữ cảnh Tháng / Gian hàng / PIC / Link Sheet (Trái) + Chế độ cột / Chọn KOC / Thêm dòng / Tạo Deal (Phải) */}
      <div className="px-3 py-2 border-b border-line bg-sunken/40 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <Select
            value={activeMonth}
            onChange={(e) => {
              const nextMonth = e.target.value;
              onChangeMonth(nextMonth);
              if (getStoreMonthCount(nextMonth, activeStoreName) === 0) {
                const firstStoreInNextMonth = [...b2cStores]
                  .sort(
                    (a, b) =>
                      getStoreMonthCount(nextMonth, b.storeName) -
                      getStoreMonthCount(nextMonth, a.storeName)
                  )
                  .find((st) => getStoreMonthCount(nextMonth, st.storeName) > 0);
                if (firstStoreInNextMonth) {
                  onChangeStore(firstStoreInNextMonth.storeName);
                }
              }
            }}
            aria-label="Chọn tháng"
            className="w-auto shrink-0 font-semibold"
          >
            {MONTH_OPTIONS.map((m) => {
              const st = monthSummaryStats[m];
              const suffix =
                st && st.totalKocs > 0
                  ? ` (${formatNumber(st.totalKocs)} KOC · ${st.storeCount} gian)`
                  : '';
              return (
                <option key={m} value={m}>
                  Tháng {m}
                  {suffix}
                </option>
              );
            })}
          </Select>

          <Select
            value={activeStoreName}
            onChange={(e) => onChangeStore(e.target.value)}
            aria-label="Chọn Brand / Gian hàng"
            className="w-auto max-w-[260px] shrink-0 font-semibold"
          >
            {sortedB2cStoresForActiveMonth.map((st) => {
              const c = getStoreMonthCount(activeMonth, st.storeName);
              return (
                <option key={st.id} value={st.storeName}>
                  {st.brandName} — {st.storeName} ({c} KOC)
                </option>
              );
            })}
          </Select>

          <div className="flex flex-wrap items-center gap-2 text-2xs">
            <div ref={picPopoverRef} className="relative">
              <button
                type="button"
                onClick={() => setIsPicPopoverOpen((v) => !v)}
                aria-expanded={isPicPopoverOpen}
                className="h-7 inline-flex items-center gap-2 px-2 rounded-md bg-surface border border-line-strong text-ink font-medium hover:bg-sunken transition-colors"
              >
                <Users className="w-3.5 h-3.5 text-accent shrink-0" />
                <span>PIC ({storePicTotalCount})</span>
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isPrimaryPic || isAdminOrManager || isStoreLeader
                      ? 'bg-positive'
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
                <div className="absolute left-0 top-full mt-2 z-40 w-80 rounded-lg border border-line-strong bg-surface shadow-lg p-3 space-y-3 text-xs">
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

                  <div className="space-y-2">
                    <div className="text-2xs font-medium text-ink-3">PIC Chính</div>
                    {storeAssignment.primaryPic ? (
                      <div className="flex items-center justify-between gap-2 px-2 py-2 rounded-md bg-sunken/60 border border-line">
                        <Person
                          name={storeAssignment.primaryPic}
                          sub={`${
                            picRowCountMap.get(storeAssignment.primaryPic.trim().toLowerCase()) || 0
                          } dòng trong bảng`}
                          size={24}
                        />
                        <div className="flex items-center gap-2 shrink-0">
                          <Status tone="positive">PIC Chính</Status>
                          <button
                            type="button"
                            onClick={() => {
                              setFilterNhanSu(storeAssignment.primaryPic);
                              setIsPicPopoverOpen(false);
                            }}
                            className="px-2 py-0.5 rounded border border-line bg-surface text-2xs text-ink-2 hover:bg-sunken hover:text-ink"
                          >
                            Lọc
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="px-2 py-2 rounded-md bg-sunken/40 border border-line text-2xs text-ink-3">
                        Chưa phân công
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="text-2xs font-medium text-ink-3">
                      Nhân viên hỗ trợ ({storeAssignment.supportStaff.length})
                    </div>
                    {storeAssignment.supportStaff.length > 0 ? (
                      <div className="max-h-44 overflow-y-auto space-y-1 pr-0.5">
                        {storeAssignment.supportStaff.map((staffName) => (
                          <div
                            key={staffName}
                            className="flex items-center justify-between gap-2 px-2 py-2 rounded-md bg-surface border border-line"
                          >
                            <Person
                              name={staffName}
                              sub={`${
                                picRowCountMap.get(staffName.trim().toLowerCase()) || 0
                              } dòng trong bảng`}
                              size={22}
                            />
                            <div className="flex items-center gap-2 shrink-0">
                              <Status tone="info">Hỗ trợ</Status>
                              <button
                                type="button"
                                onClick={() => {
                                  setFilterNhanSu(staffName);
                                  setIsPicPopoverOpen(false);
                                }}
                                className="px-2 py-0.5 rounded border border-line bg-surface text-2xs text-ink-2 hover:bg-sunken hover:text-ink"
                              >
                                Lọc
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-2 py-2 rounded-md bg-sunken/40 border border-line text-2xs text-ink-3">
                        Không có nhân sự hỗ trợ
                      </div>
                    )}
                  </div>

                  {storeLeaderName && (
                    <div className="space-y-2 pt-1 border-t border-line">
                      <div className="text-2xs font-medium text-ink-3">Trưởng nhóm phụ trách</div>
                      <div className="flex items-center justify-between gap-2 px-2 py-2 rounded-md bg-surface border border-line">
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
                        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-sunken border border-line text-ink font-medium hover:bg-line/50"
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
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
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

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Segmented
            value={activeColumnPreset}
            onChange={(val) =>
              applyColumnPreset(val as 'BRAND_WORKING_FILE' | 'ACCEPTANCE_FILE_32' | 'ALL_48')
            }
            items={[
              { key: 'BRAND_WORKING_FILE', label: 'Trình Brand (17)' },
              { key: 'ACCEPTANCE_FILE_32', label: 'Đi Air & Nghiệm thu' },
              { key: 'ALL_48', label: 'Đầy đủ (57)' },
            ]}
          />

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
            <span>Cột ({visibleColumns.length}/57)</span>
          </button>

          {!isBrandReviewerRole && (
            <>
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
            </>
          )}

          <ActionMenu
            label="Khác"
            items={[
              ...(onOpenShortlistFilterModal && !isBrandReviewerRole
                ? [
                    {
                      label: 'Lọc & Gợi ý KOC theo Khung lương Plan 4.1.1',
                      icon: UserPlus,
                      onSelect: () => onOpenShortlistFilterModal(),
                    },
                  ]
                : []),
              ...(!isBrandReviewerRole
                ? [
                    {
                      label: `Tạo các Deal từ KOC Brand đã duyệt (${sheetStats.brandApprovedCount} KOC)`,
                      icon: ArrowRight,
                      onSelect: () => handleOpenCreateDealsModal(),
                    },
                  ]
                : []),
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
              ...(!isBrandReviewerRole
                ? [
                    {
                      label: `Gửi mail mời KOC (${
                        selectedRowIds.length > 0 ? selectedRowIds.length : displayedRows.length
                      })`,
                      icon: Mail,
                      onSelect: () => handleOpenOutreachForSelection('COMPOSE'),
                    },
                  ]
                : []),
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

      {/* Thanh 2: Tìm kiếm + Bộ lọc + Sort (Trái) & Chú giải nguồn cột (Phải) */}
      <div className="px-3 py-2 border-b border-line bg-surface flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
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

          {storeOldMonthGroupsCount > 0 && (
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
                ? `Tháng cũ (${storeOldMonthGroupsCount}): Đang hiện`
                : `Tháng cũ (${storeOldMonthGroupsCount}): Đang ẩn`}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-2xs text-ink-2 shrink-0">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-positive-soft text-positive border border-positive/30 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-positive" />
            Tự động: Danh bạ KOC
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-warning-soft text-warning border border-warning/30 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-warning" />
            Công thức: Tự tính
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sunken text-ink-2 border border-line font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-ink-3" />
            NV điền: Nhập / chọn
          </span>
        </div>
      </div>

      {/* Thanh thao tác hàng loạt */}
      <BulkBar
        flush
        count={selectedRowIds.length}
        unit="KOC"
        onClear={() => setSelectedRowIds([])}
      >
        <div className="flex flex-wrap items-center gap-2">
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

        {!isBrandReviewerRole && (
          <div className="flex flex-wrap items-center gap-2">
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
        )}
      </BulkBar>

      {isColumnPickerOpen && (
        <div className="p-3 bg-sunken border-b border-line space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-line">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink">
              <span>Cấu hình cột hiển thị:</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs border bg-positive-soft text-positive border-positive/30">
                <span className="w-1.5 h-1.5 rounded-full bg-positive" />
                Tự động: Lấy từ Danh bạ
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs border bg-accent-soft text-accent border-accent/25">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                Công thức: Tự tính
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs border bg-warning-soft text-warning border-warning/30">
                <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                NV điền: Nhập/chọn
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => applyColumnPreset('BRAND_WORKING_FILE')}
              >
                Trình Brand (15 cột trọng tâm)
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

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-56 overflow-y-auto pr-1">
            {STAFF_LISTING_COLUMNS.map((col) => {
              const checked = visibleColumnKeys.includes(col.key);
              const badge = FILL_MODE_BADGE[col.fillMode];
              return (
                <label
                  key={col.key}
                  className={`flex items-center justify-between gap-2 px-2 py-2 rounded border text-2xs cursor-pointer select-none transition-colors ${
                    checked
                      ? 'bg-surface border-ink/40 text-ink font-medium'
                      : 'bg-surface/50 border-line text-ink-3'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0 truncate">
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
    </>
  );
};
