'use client';

import React from 'react';
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Key,
  RefreshCw,
  Settings,
  Upload,
} from 'lucide-react';
import type {
  BookingDealItem,
  KocItem,
  StorePortfolioItem,
} from '../../lib/types';
import {
  formatNumber,
  formatVnd,
  formatVndShort,
  parseThousandNumberInput,
} from '../../lib/format';
import {
  CONTENT_TAG_OPTIONS,
  DE_XUAT_UPBASE_OPTIONS,
  DOT_LISTING_OPTIONS,
  TEP_KENH_OPTIONS,
  computeGrossFeeWithTax,
  computeTepBookingFromNetFee,
  downloadStaffSheetCsv,
  makeSheetKey,
  normalizeTikTokId,
  type StaffBrandSheetCollection,
  type StaffListingColumnMeta,
  type StaffListingSheetRow,
} from '../../lib/staffBrandListingSheet';
import {
  BrandProductDropdownInput,
  buildBrandProductCatalogGroups,
} from './BrandProductDropdownInput';
import { Avatar, Button, Field, Input, Modal, Select, Status } from '../ui';
import {
  PushSheetReconciliationView,
  type PushSheetReconciliationReport,
} from './PushSheetReconciliationView';
import { MONTH_OPTIONS } from './ListingSheetSummaryHeader';
import type {
  CreateDealDraftRow,
  PullBrandReviewSummary,
  SheetPullRowDiff,
  SheetTabDetailItem,
} from './StaffBrandListingSheetWorkspace';

export interface ListingSheetModalsProps {
  activeMonth: string;
  activeStoreName: string;
  activeStoreObj?: StorePortfolioItem;
  b2cStores: StorePortfolioItem[];
  deals: BookingDealItem[];
  rows: StaffListingSheetRow[];
  displayedRows: StaffListingSheetRow[];
  selectedRowIds: string[];
  collection: StaffBrandSheetCollection;
  visibleColumns: StaffListingColumnMeta[];
  currentGoogleSheetUrl: string;
  defaultGoogleSheetTab: string;
  storeAssignment: { primaryPic: string; supportStaff: string[]; allOwners: string[] };
  canPushToGoogleSheet: boolean;
  isDirectoryPickerOpen: boolean;
  setIsDirectoryPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  pickerTargetMonth: string;
  setPickerTargetMonth: React.Dispatch<React.SetStateAction<string>>;
  pickerTargetStoreName: string;
  setPickerTargetStoreName: React.Dispatch<React.SetStateAction<string>>;
  pickerTargetStoreObj?: StorePortfolioItem;
  quickBatchDot: string;
  setQuickBatchDot: React.Dispatch<React.SetStateAction<string>>;
  quickProduct: string;
  setQuickProduct: React.Dispatch<React.SetStateAction<string>>;
  quickContentTag: string;
  setQuickContentTag: React.Dispatch<React.SetStateAction<string>>;
  quickUpbaseProposal: string;
  setQuickUpbaseProposal: React.Dispatch<React.SetStateAction<string>>;
  quickPricingMode: 'KOC_RATECARD' | 'FREECAST' | 'CUSTOM_NET';
  setQuickPricingMode: React.Dispatch<
    React.SetStateAction<'KOC_RATECARD' | 'FREECAST' | 'CUSTOM_NET'>
  >;
  quickCustomNetFee: string;
  setQuickCustomNetFee: React.Dispatch<React.SetStateAction<string>>;
  kocSearchText: string;
  setKocSearchText: React.Dispatch<React.SetStateAction<string>>;
  kocFilterTep: string;
  setKocFilterTep: React.Dispatch<React.SetStateAction<string>>;
  kocFilterKl: string;
  setKocFilterKl: React.Dispatch<React.SetStateAction<string>>;
  filteredDirectoryKocs: KocItem[];
  existingHandlesInPickerTargetSheet: Set<string>;
  pickedKocIds: string[];
  setPickedKocIds: React.Dispatch<React.SetStateAction<string[]>>;
  handleAddPickedKocsToSheet: () => void;
  isGoogleSheetModalOpen: boolean;
  setIsGoogleSheetModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  googleSheetUrlDraft: string;
  setGoogleSheetUrlDraft: React.Dispatch<React.SetStateAction<string>>;
  handleSaveGoogleSheetUrl: () => void;
  onOpenSheetSetupScreen?: (
    tab?: 'TABLE' | 'FIELD_PERMISSIONS' | 'BULK_PASTE' | 'SERVICE_ACCOUNT'
  ) => void;
  isPushSheetModalOpen: boolean;
  setIsPushSheetModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  pushScope: 'SELECTED_ONLY' | 'ALL_ROWS';
  setPushScope: React.Dispatch<React.SetStateAction<'SELECTED_ONLY' | 'ALL_ROWS'>>;
  pushColMode: 'BRAND_WORKING_32' | 'ALL_VISIBLE';
  setPushColMode: React.Dispatch<React.SetStateAction<'BRAND_WORKING_32' | 'ALL_VISIBLE'>>;
  pushSheetUrl: string;
  setPushSheetUrl: React.Dispatch<React.SetStateAction<string>>;
  pushSheetTab: string;
  setPushSheetTab: React.Dispatch<React.SetStateAction<string>>;
  availableSheetTabs: string[];
  loadingSheetTabs: boolean;
  pushBusy: boolean;
  pushDiffReport: PushSheetReconciliationReport | null;
  setPushDiffReport: React.Dispatch<
    React.SetStateAction<PushSheetReconciliationReport | null>
  >;
  isServiceAccountConfigured: boolean;
  isShowingSaJsonInput: boolean;
  setIsShowingSaJsonInput: React.Dispatch<React.SetStateAction<boolean>>;
  pushSaJsonDraft: string;
  setPushSaJsonDraft: React.Dispatch<React.SetStateAction<string>>;
  savingPushSa: boolean;
  handleSavePushServiceAccount: () => Promise<void>;
  fetchTabsForSheetUrl: (
    url: string,
    currentTab: string,
    onPickTab: (tab: string) => void,
    forceReload?: boolean
  ) => Promise<void>;
  getTargetRowsForPush: (
    scope: 'SELECTED_ONLY' | 'ALL_ROWS'
  ) => StaffListingSheetRow[];
  getColsForPush: (
    mode: 'BRAND_WORKING_32' | 'ALL_VISIBLE'
  ) => StaffListingColumnMeta[];
  handleRunPushDiffPreview: (
    overrideUrl?: string,
    overrideTab?: string,
    overrideScope?: 'SELECTED_ONLY' | 'ALL_ROWS',
    overrideColMode?: 'BRAND_WORKING_32' | 'ALL_VISIBLE',
    forceRefresh?: boolean
  ) => Promise<void>;
  handleConfirmPushSheet: () => Promise<void>;
  handleCopyTsv: (
    mode: 'VISIBLE_COLS' | 'ALL_48_COLS' | 'BRAND_WORKING_COLS'
  ) => Promise<void>;
  isPullSheetModalOpen: boolean;
  setIsPullSheetModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  pullSheetUrl: string;
  setPullSheetUrl: React.Dispatch<React.SetStateAction<string>>;
  pullSheetTab: string;
  setPullSheetTab: React.Dispatch<React.SetStateAction<string>>;
  pullBusy: boolean;
  pullDiffReport: {
    diffs: SheetPullRowDiff[];
    notOnSheetHandles: string[];
    totalSheetRows: number;
    brandSummary: PullBrandReviewSummary;
  } | null;
  setPullDiffReport: React.Dispatch<
    React.SetStateAction<{
      diffs: SheetPullRowDiff[];
      notOnSheetHandles: string[];
      totalSheetRows: number;
      brandSummary: PullBrandReviewSummary;
    } | null>
  >;
  selectedPullHandles: string[];
  setSelectedPullHandles: React.Dispatch<React.SetStateAction<string[]>>;
  pullReportFilter: 'ALL' | 'NEW_APPROVED_YES' | 'BRAND_CHANGED' | 'ALL_CHANGED';
  setPullReportFilter: React.Dispatch<
    React.SetStateAction<
      'ALL' | 'NEW_APPROVED_YES' | 'BRAND_CHANGED' | 'ALL_CHANGED'
    >
  >;
  handleRunPullDiffPreview: (
    overrideUrl?: string,
    overrideTab?: string
  ) => Promise<void>;
  handleConfirmApplyPullSheet: (openCreateDealsAfter?: boolean) => void;
  setQuickViewRow: React.Dispatch<
    React.SetStateAction<Partial<StaffListingSheetRow> | null>
  >;
  isCreateDealsModalOpen: boolean;
  setIsCreateDealsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  dealDrafts: CreateDealDraftRow[];
  setDealDrafts: React.Dispatch<React.SetStateAction<CreateDealDraftRow[]>>;
  handleConfirmCreateDealsAndOpenBoard: (shouldNavigateToBoard: boolean) => void;
  onOpenCreateDealWorkspace?: (data: {
    storeName: string;
    monthKey: string;
    drafts: CreateDealDraftRow[];
    sourceRows: StaffListingSheetRow[];
  }) => void;
  isSheetTemplateModalOpen: boolean;
  setIsSheetTemplateModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  sheetTemplateActiveTab: string;
  setSheetTemplateActiveTab: React.Dispatch<React.SetStateAction<string>>;
  sheetTemplateBusy: boolean;
  sheetCollapsedMonthsDraft: string[];
  setSheetCollapsedMonthsDraft: React.Dispatch<React.SetStateAction<string[]>>;
  sheetMonthColumnStats: { month: string; rowCount: number; collapsed: boolean }[];
  sheetColumnPresetMode: 'BRAND_REVIEW' | 'AIR_ACCEPTANCE' | 'FULL_TEMPLATE';
  setSheetColumnPresetMode: React.Dispatch<
    React.SetStateAction<'BRAND_REVIEW' | 'AIR_ACCEPTANCE' | 'FULL_TEMPLATE'>
  >;
  handleSelectOldMonthsToCollapseDraft: () => void;
  handleToggleCollapseMonthDraft: (month: string) => void;
  runSheetTemplatePatch: (
    payload: {
      activeTab?: string;
      tabVisibility?: { title: string; hidden: boolean }[];
      collapsedMonths?: string[];
      collapseOldMonthsBefore?: string;
      expandAllMonths?: boolean;
      columnPreset?: 'BRAND_REVIEW' | 'AIR_ACCEPTANCE' | 'FULL_TEMPLATE';
      sortBy?: 'PRODUCT' | 'STAFF' | 'BATCH' | 'BRAND_DECISION';
      installFilterViews?: boolean;
      standardizeFormatting?: boolean;
    },
    successMessage: string
  ) => Promise<void>;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const ListingSheetModals: React.FC<ListingSheetModalsProps> = ({
  activeMonth,
  activeStoreName,
  activeStoreObj,
  b2cStores,
  deals,
  rows,
  displayedRows,
  selectedRowIds,
  collection,
  visibleColumns,
  currentGoogleSheetUrl,
  defaultGoogleSheetTab,
  storeAssignment,
  canPushToGoogleSheet,
  isDirectoryPickerOpen,
  setIsDirectoryPickerOpen,
  pickerTargetMonth,
  setPickerTargetMonth,
  pickerTargetStoreName,
  setPickerTargetStoreName,
  pickerTargetStoreObj,
  quickBatchDot,
  setQuickBatchDot,
  quickProduct,
  setQuickProduct,
  quickContentTag,
  setQuickContentTag,
  quickUpbaseProposal,
  setQuickUpbaseProposal,
  quickPricingMode,
  setQuickPricingMode,
  quickCustomNetFee,
  setQuickCustomNetFee,
  kocSearchText,
  setKocSearchText,
  kocFilterTep,
  setKocFilterTep,
  kocFilterKl,
  setKocFilterKl,
  filteredDirectoryKocs,
  existingHandlesInPickerTargetSheet,
  pickedKocIds,
  setPickedKocIds,
  handleAddPickedKocsToSheet,
  isGoogleSheetModalOpen,
  setIsGoogleSheetModalOpen,
  googleSheetUrlDraft,
  setGoogleSheetUrlDraft,
  handleSaveGoogleSheetUrl,
  onOpenSheetSetupScreen,
  isPushSheetModalOpen,
  setIsPushSheetModalOpen,
  pushScope,
  setPushScope,
  pushColMode,
  setPushColMode,
  pushSheetUrl,
  setPushSheetUrl,
  pushSheetTab,
  setPushSheetTab,
  availableSheetTabs,
  loadingSheetTabs,
  pushBusy,
  pushDiffReport,
  setPushDiffReport,
  isServiceAccountConfigured,
  isShowingSaJsonInput,
  setIsShowingSaJsonInput,
  pushSaJsonDraft,
  setPushSaJsonDraft,
  savingPushSa,
  handleSavePushServiceAccount,
  fetchTabsForSheetUrl,
  getTargetRowsForPush,
  getColsForPush,
  handleRunPushDiffPreview,
  handleConfirmPushSheet,
  handleCopyTsv,
  isPullSheetModalOpen,
  setIsPullSheetModalOpen,
  pullSheetUrl,
  setPullSheetUrl,
  pullSheetTab,
  setPullSheetTab,
  pullBusy,
  pullDiffReport,
  setPullDiffReport,
  selectedPullHandles,
  setSelectedPullHandles,
  pullReportFilter,
  setPullReportFilter,
  handleRunPullDiffPreview,
  handleConfirmApplyPullSheet,
  setQuickViewRow,
  isCreateDealsModalOpen,
  setIsCreateDealsModalOpen,
  dealDrafts,
  setDealDrafts,
  handleConfirmCreateDealsAndOpenBoard,
  onOpenCreateDealWorkspace,
  isSheetTemplateModalOpen,
  setIsSheetTemplateModalOpen,
  sheetTemplateActiveTab,
  setSheetTemplateActiveTab,
  sheetTemplateBusy,
  sheetCollapsedMonthsDraft,
  setSheetCollapsedMonthsDraft,
  sheetMonthColumnStats,
  sheetColumnPresetMode,
  setSheetColumnPresetMode,
  handleSelectOldMonthsToCollapseDraft,
  handleToggleCollapseMonthDraft,
  runSheetTemplatePatch,
  onNotify,
}) => {
  return (
    <>
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
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 rounded-lg bg-sunken border border-line">
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

            <Field label="Sản phẩm (Cột K)" className="sm:col-span-4" labelClassName="whitespace-nowrap">
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

            <Field label="Hình thức & Báo giá (Cột M/O/P)" className="sm:col-span-4" labelClassName="whitespace-nowrap">
              <div className="flex items-center gap-2">
                <Select
                  value={quickPricingMode}
                  onChange={(e) =>
                    setQuickPricingMode(
                      e.target.value as 'KOC_RATECARD' | 'FREECAST' | 'CUSTOM_NET'
                    )
                  }
                  className={
                    quickPricingMode === 'FREECAST'
                      ? 'bg-positive-soft text-positive border-positive/30 font-semibold'
                      : ''
                  }
                >
                  <option value="KOC_RATECARD">Booking theo Ratecard KOC</option>
                  <option value="FREECAST">Freecast / Gửi mẫu FOC (0đ)</option>
                  <option value="CUSTOM_NET">Nhập giá Net đồng loạt</option>
                </Select>
                {quickPricingMode === 'CUSTOM_NET' && (
                  <Input
                    value={quickCustomNetFee}
                    onChange={(e) => setQuickCustomNetFee(e.target.value)}
                    placeholder="VD: 1.500.000"
                    className="w-32 font-mono text-right"
                  />
                )}
              </div>
            </Field>

            <Field label="Content tag (Cột G)" className="sm:col-span-2" labelClassName="whitespace-nowrap">
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

            <Field label="Đề xuất UpBase (Cột R)" className="sm:col-span-2" labelClassName="whitespace-nowrap">
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                    className={`px-3 py-3 flex items-center justify-between gap-3 text-xs cursor-pointer transition-colors ${
                      alreadyInSheet
                        ? 'bg-sunken/60 opacity-65'
                        : isChecked
                          ? 'bg-accent-soft/30'
                          : 'bg-surface hover:bg-sunken/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
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
                        <div className="font-semibold text-ink truncate flex items-center gap-2">
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
                          {k.femaleRatio !== undefined ? `${k.femaleRatio}%` : '—'}
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
            <div className="flex items-center justify-between p-3 rounded-lg bg-sunken border border-line text-xs">
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
              onClick={() => void handleRunPushDiffPreview(undefined, undefined, undefined, undefined, true)}
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
            <div className="p-3 rounded-md bg-warning-soft border border-warning/30 text-warning">
              Bạn đang ở vai trò <strong>Booking Support</strong>. Bạn có thể chạy bước{' '}
              <strong>1. So sánh dữ liệu 2 bên</strong> để kiểm tra trước, nhưng bước{' '}
              <strong>2. Xác nhận Đẩy lên Google Sheet</strong> cần do{' '}
              <strong>PIC Chính ({storeAssignment.primaryPic})</strong> hoặc Quản trị viên thực hiện.
            </div>
          )}

          {/* Chọn phạm vi đẩy: Đẩy dòng đang tích chọn vs Đẩy cả bảng */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-lg bg-sunken border border-line">
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
                        pushColMode,
                        false
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
                        pushColMode,
                        false
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
                      nextMode,
                      false
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
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-8">
              <Field label="Link Google Sheet của gian hàng">
                <div className="flex items-center gap-2">
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
              <div className="p-4 bg-warning-soft/40 border-b border-line space-y-3">
                <div className="flex items-start gap-3">
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
                <div className="rounded-md bg-positive-soft border border-positive/30 px-3 py-2 text-2xs text-positive">
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
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-8">
              <Field label="Link Google Sheet của gian hàng">
                <div className="flex items-center gap-2">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-line bg-surface p-3 space-y-1">
                    <div className="text-2xs text-ink-3 font-medium">
                      1. KOC Brand mới duyệt (Yes)
                    </div>
                    <div className="text-base font-semibold text-positive tabular-nums">
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

                  <div className="rounded-lg border border-line bg-surface p-3 space-y-1">
                    <div className="text-2xs text-ink-3 font-medium">
                      2. Từ chối (No) / Cân nhắc / Chờ duyệt
                    </div>
                    <div className="text-base font-semibold text-ink tabular-nums">
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

                  <div className="rounded-lg border border-line bg-surface p-3 space-y-1">
                    <div className="text-2xs text-ink-3 font-medium">
                      3. Thời gian Brand duyệt &amp; SLA (48h)
                    </div>
                    <div className="text-base font-semibold text-accent tabular-nums">
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

                  <div className="rounded-lg border border-line bg-surface p-3 space-y-1">
                    <div className="text-2xs text-ink-3 font-medium">
                      4. Chuyển tạo Deal sang Bảng Deal
                    </div>
                    <div className="text-base font-semibold text-ink tabular-nums">
                      {pullDiffReport.brandSummary.readyForDealCreationCount} KOC sẵn sàng tạo Deal
                    </div>
                    <div className="text-2xs text-ink-2">
                      Bấm nút <strong>3. Cập nhật &amp; Tạo Deal</strong> bên dưới để sinh mã BO và chuyển sang Bảng Deal
                    </div>
                  </div>
                </div>

                {pullDiffReport.notOnSheetHandles.length > 0 && (
                  <div className="rounded-md bg-warning-soft border border-warning/30 px-3 py-2 text-2xs text-warning">
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
                        <th className="py-2 px-3 w-[22%]">KOC &amp; Sản phẩm</th>
                        <th className="py-2 px-3 w-[20%]">Kết quả Brand duyệt</th>
                        <th className="py-2 px-3 w-[24%]">Thời gian &amp; SLA Brand duyệt</th>
                        <th className="py-2 px-3 w-[28%]">Chi tiết thay đổi (Trên App → Từ Sheet)</th>
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
                              <td className="py-2 px-3 font-medium text-ink">
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
                                  <Eye className="w-3.5 h-3.5 shrink-0" />
                                </button>
                                {d.kocName && d.kocName !== d.handle && (
                                  <div className="text-2xs text-ink-3">{d.kocName}</div>
                                )}
                                <div className="text-2xs text-ink-2 truncate max-w-[180px]">
                                  {d.sanPham || 'Chưa gắn SP'} ·{' '}
                                  <strong className="tabular-nums">{formatVnd(d.netFee)}</strong>
                                </div>
                              </td>
                              <td className="py-2 px-3 text-2xs">
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
                              <td className="py-2 px-3 text-2xs">
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
                              <td className="py-2 px-3 text-2xs">
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
                                        <span className="font-semibold text-positive">
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
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="inline-flex items-center gap-2">
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

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 tabular-nums">
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
                <div className="inline-flex items-center gap-2 pl-2 border-l border-line">
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
                  <th className="py-3 px-3 w-10 text-center">
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
                  <th className="py-3 px-3 w-[23%]">KOC</th>
                  <th className="py-3 px-3 w-[14%]">Mã deal</th>
                  <th className="py-3 px-3 w-[25%]">Sản phẩm chốt</th>
                  <th className="py-3 px-3 w-[13%] text-right">Giá Net (đ)</th>
                  <th className="py-3 px-3 w-[12%] text-right">Phí Gross (10%)</th>
                  <th className="py-3 px-3 w-[13%]">Ngày air dự kiến</th>
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
                    <td className="py-3 px-3 align-middle text-center">
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
                    <td className="py-3 px-3 align-middle min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
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
                    <td className="py-3 px-3 align-middle">
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
                        className="w-full h-8 px-3 text-xs font-code font-semibold rounded-md border border-line-strong bg-surface text-accent focus:outline-none focus:border-ink"
                      />
                    </td>
                    <td className="py-3 px-3 align-middle">
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
                    <td className="py-3 px-3 align-middle">
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
                        className="w-full h-8 px-3 text-xs text-right font-semibold tabular-nums rounded-md border border-line-strong bg-surface text-ink focus:outline-none focus:border-ink"
                      />
                    </td>
                    <td className="py-3 px-3 align-middle text-right tabular-nums font-medium text-ink-2">
                      {formatVnd(computeGrossFeeWithTax(draft.giaChotCuoi))}
                    </td>
                    <td className="py-3 px-3 align-middle">
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

      {/* Modal 3: Thiết lập Hiển thị & Sắp xếp File Google Sheet */}
      <Modal
        open={isSheetTemplateModalOpen}
        onClose={() => setIsSheetTemplateModalOpen(false)}
        title={`Thiết lập Google Sheet — ${activeStoreName}`}
        size="lg"
        footer={
          <Button variant="ghost" onClick={() => setIsSheetTemplateModalOpen(false)}>
            Đóng
          </Button>
        }
      >
        <div className="space-y-4 text-xs">
          {/* Thanh Tab & Link mở nhanh */}
          <div className="flex flex-wrap items-end justify-between gap-3 pb-1 border-b border-line">
            <div className="w-full sm:w-72">
              <Field label="Tab trang tính">
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
            <div className="flex items-center gap-2">
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
                {loadingSheetTabs ? 'Đang tải…' : 'Làm mới Tab'}
              </Button>
              {currentGoogleSheetUrl && (
                <a
                  href={currentGoogleSheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-surface border border-line text-ink font-semibold hover:bg-sunken shrink-0 text-xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-positive" />
                  <span>Mở Sheet</span>
                  <ExternalLink className="w-3.5 h-3.5 text-ink-3" />
                </a>
              )}
            </div>
          </div>

          {/* MỤC 1: THU GỌN THÁNG CŨ */}
          <div className="border border-line rounded-lg p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-ink">1. Thu gọn tháng cũ</span>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={sheetTemplateBusy}
                  onClick={handleSelectOldMonthsToCollapseDraft}
                >
                  Chọn tháng cũ
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={sheetTemplateBusy}
                  onClick={() => {
                    setSheetCollapsedMonthsDraft([]);
                    void runSheetTemplatePatch(
                      { expandAllMonths: true },
                      'Đã mở rộng toàn bộ các tháng trên Google Sheet.'
                    );
                  }}
                >
                  Hiện tất cả
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
                        ? `Đã thu gọn các tháng cũ (${sheetCollapsedMonthsDraft.join(', ')}) trên Sheet.`
                        : 'Đã mở rộng toàn bộ các tháng trên Google Sheet.'
                    )
                  }
                >
                  {sheetTemplateBusy ? 'Đang lưu…' : 'Áp dụng'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
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
                  const countDisplay = sheetStat !== undefined ? `${sheetStat.rowCount} dòng` : `${appCount} dòng`;

                  return (
                    <label
                      key={m}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-md border cursor-pointer select-none transition-colors ${
                        isCollapsed
                          ? 'bg-sunken border-line text-ink-3'
                          : 'bg-surface border-line-strong text-ink font-semibold'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs">{m}</span>
                          {isCurrentMonth && <Status tone="positive">Hiện tại</Status>}
                        </div>
                        <div className="text-2xs text-ink-3">
                          {countDisplay} · {isCollapsed ? 'Đã thu gọn' : 'Đang mở'}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isCollapsed}
                        onChange={() => handleToggleCollapseMonthDraft(m)}
                        className="rounded border-line shrink-0"
                      />
                    </label>
                  );
                })}
            </div>
          </div>

          {/* MỤC 2: CHẾ ĐỘ HIỂN THỊ CỘT */}
          <div className="border border-line rounded-lg p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-ink">2. Chế độ hiển thị cột</span>
              <Button
                size="sm"
                variant="primary"
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
                {sheetTemplateBusy ? 'Đang lưu…' : 'Áp dụng'}
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label
                className={`p-3 rounded-md border cursor-pointer flex items-center gap-3 select-none transition-colors ${
                  sheetColumnPresetMode === 'BRAND_REVIEW'
                    ? 'border-ink bg-sunken font-semibold text-ink'
                    : 'border-line bg-surface text-ink-2 hover:bg-sunken/50'
                }`}
              >
                <input
                  type="radio"
                  name="sheetColPreset"
                  checked={sheetColumnPresetMode === 'BRAND_REVIEW'}
                  onChange={() => setSheetColumnPresetMode('BRAND_REVIEW')}
                />
                <span>Trình Brand duyệt (15 cột)</span>
              </label>

              <label
                className={`p-3 rounded-md border cursor-pointer flex items-center gap-3 select-none transition-colors ${
                  sheetColumnPresetMode === 'AIR_ACCEPTANCE'
                    ? 'border-ink bg-sunken font-semibold text-ink'
                    : 'border-line bg-surface text-ink-2 hover:bg-sunken/50'
                }`}
              >
                <input
                  type="radio"
                  name="sheetColPreset"
                  checked={sheetColumnPresetMode === 'AIR_ACCEPTANCE'}
                  onChange={() => setSheetColumnPresetMode('AIR_ACCEPTANCE')}
                />
                <span>Đi Air &amp; Nghiệm thu</span>
              </label>

              <label
                className={`p-3 rounded-md border cursor-pointer flex items-center gap-3 select-none transition-colors ${
                  sheetColumnPresetMode === 'FULL_TEMPLATE'
                    ? 'border-ink bg-sunken font-semibold text-ink'
                    : 'border-line bg-surface text-ink-2 hover:bg-sunken/50'
                }`}
              >
                <input
                  type="radio"
                  name="sheetColPreset"
                  checked={sheetColumnPresetMode === 'FULL_TEMPLATE'}
                  onChange={() => setSheetColumnPresetMode('FULL_TEMPLATE')}
                />
                <span>Toàn bộ 57 cột</span>
              </label>
            </div>
          </div>

          {/* MỤC 3: SẮP XẾP, BỘ LỌC VÀ CHUẨN HÓA FONT */}
          <div className="border border-line rounded-lg p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-ink">3. Sắp xếp &amp; Định dạng</span>
              <Button
                size="sm"
                variant="primary"
                disabled={sheetTemplateBusy}
                onClick={() =>
                  void runSheetTemplatePatch(
                    { standardizeFormatting: true },
                    'Đã chuẩn hóa toàn bộ font chữ, viền ô và định dạng tiền tệ đồng nhất trên Google Sheet!'
                  )
                }
              >
                {sheetTemplateBusy ? 'Đang chuẩn hóa…' : 'Chuẩn hóa Font & Viền ô'}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={sheetTemplateBusy}
                onClick={() =>
                  void runSheetTemplatePatch(
                    { installFilterViews: true },
                    'Đã cài đặt Filter Views trên Google Sheet.'
                  )
                }
              >
                Tạo Filter Views
              </Button>

              <Button
                size="sm"
                variant="ghost"
                disabled={sheetTemplateBusy}
                onClick={() =>
                  void runSheetTemplatePatch(
                    { sortBy: 'PRODUCT', installFilterViews: true },
                    'Đã sắp xếp theo Sản phẩm (A → Z).'
                  )
                }
              >
                Theo Sản phẩm
              </Button>

              <Button
                size="sm"
                variant="ghost"
                disabled={sheetTemplateBusy}
                onClick={() =>
                  void runSheetTemplatePatch(
                    { sortBy: 'STAFF', installFilterViews: true },
                    'Đã sắp xếp theo Nhân sự.'
                  )
                }
              >
                Theo Nhân sự
              </Button>

              <Button
                size="sm"
                variant="ghost"
                disabled={sheetTemplateBusy}
                onClick={() =>
                  void runSheetTemplatePatch(
                    { sortBy: 'BATCH', installFilterViews: true },
                    'Đã sắp xếp theo Đợt Listing.'
                  )
                }
              >
                Theo Đợt
              </Button>

              <Button
                size="sm"
                variant="ghost"
                disabled={sheetTemplateBusy}
                onClick={() =>
                  void runSheetTemplatePatch(
                    { sortBy: 'BRAND_DECISION', installFilterViews: true },
                    'Đã gom KOC Brand chọn (Yes) lên đầu.'
                  )
                }
              >
                Đưa (Yes) lên đầu
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};
