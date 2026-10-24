'use client';

/**
 * Hồ sơ chi tiết một thương hiệu B2C — thiết kế theo Upbase Ops Design System.
 * Bao gồm:
 * - Thanh chỉ số vận hành cấp Thương hiệu (Hạn mức Order Net tổng hợp từ gian hàng, Đã duyệt chi, Kho tệp R2, Sản phẩm & Quy chuẩn).
 * - 5 phân khu chuyên sâu: Tổng quan & Định vị, Kho tệp & Tài liệu (Cloudflare R2), Gian hàng sàn & Booking, Sản phẩm & Trần thù lao, Quy chuẩn & Pháp lý.
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Download,
  ExternalLink,
  Eye,
  FileSignature,
  FileSpreadsheet,
  FileText,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Store,
  Upload,
  Users,
  Video,
} from 'lucide-react';
import type { BookingDealItem, InputPlanBreakdownState, StorePortfolioItem, UserProfile } from '../../lib/types';
import type { BrandDocCategory, BrandDocument, BrandPermissions, BrandProfile, BrandSection } from '../../lib/brands/types';
import { SECTION_LABEL } from '../../lib/brands/types';
import { formatNumber, formatVnd, formatVndShort } from '../../lib/format';
import { INITIAL_STORE_PORTFOLIOS } from '../../lib/mockData';
import {
  PROFILE_MONTH_OPTIONS,
  buildBrandMonthlyPlanReport,
  type BrandMonthlyPlanReport,
  type StoreMonthlyBookingRecord,
  type StoreMonthlyPlanReport,
} from '../../lib/monthlyProfileMetrics';
import {
  ActionMenu,
  BrandAvatar,
  Button,
  ChannelTag,
  Chips,
  ConfirmDialog,
  DataTable,
  EmptyState,
  FilterBar,
  Modal,
  Pagination,
  Panel,
  Person,
  Select,
  Stat,
  StatRow,
  Status,
  Tabs,
  channelOf,
  sharedTo,
  type Column,
} from '../ui';
import {
  ContentRulesDialog,
  EntityDialog,
  ItemDialog,
  PositioningDialog,
  RatecardDialog,
  WorkflowRulesDialog,
  type ItemField,
} from './BrandEditors';
import { StoreEditDialog } from '../stores/StoreEditDialog';
import { ContentAngleSetupView } from '../views/ContentAngleSetupView';
import { CloudflareR2SetupModal } from './CloudflareR2SetupPanel';
import {
  DOC_CATEGORY_LABEL,
  KOC_APPROVAL_MODE_LABEL,
  OPERATING_MODEL_LABEL,
  PROJECT_TIER_LABEL,
  SAMPLE_RETURN_LABEL,
  SAMPLE_SENDER_LABEL,
  SAMPLE_STOCK_LABEL,
  STRATEGY_OWNER_LABEL,
  TONE_LABEL,
  dateTime,
  fileExtLabel,
  formatFileSize,
  isExpired,
  real,
  uploadBrandFileClient,
  type BrandRow,
} from './brandUi';

type Save = (section: BrandSection, data: unknown, summary?: string) => Promise<boolean>;
type ListKey = 'products' | 'faqs' | 'legal' | 'documents';
export type BrandDetailTab = 'OVERVIEW' | 'WORKFLOW' | 'FILES' | 'STORES' | 'PRODUCTS' | 'COMPLIANCE';

const PRODUCT_FIELDS: ItemField[] = [
  { key: 'name', label: 'Tên sản phẩm', required: true, wide: true },
  { key: 'skuCode', label: 'Mã SKU' },
  { key: 'size', label: 'Quy cách', hint: 'Ví dụ 120g, 500ml, 60 viên.' },
  { key: 'priceVnd', label: 'Giá niêm yết', kind: 'money' },
  { key: 'dealPriceVnd', label: 'Giá bán chiến dịch / Giá deal', kind: 'money' },
  { key: 'commissionOrganicPct', label: 'Hoa hồng tự nhiên (%)', kind: 'number', hint: 'VD: 12' },
  { key: 'commissionAdsPct', label: 'Hoa hồng chạy quảng cáo (%)', kind: 'number', hint: 'VD: 8' },
  {
    key: 'sampleStockStatus',
    label: 'Tồn kho hàng mẫu gửi KOC',
    kind: 'select',
    options: Object.entries(SAMPLE_STOCK_LABEL).map(([value, info]) => ({ value, label: info.label })),
  },
  {
    key: 'sampleReturnRule',
    label: 'Chính sách thu hồi hàng mẫu',
    kind: 'select',
    options: Object.entries(SAMPLE_RETURN_LABEL).map(([value, label]) => ({ value, label })),
  },
  { key: 'pdpUrl', label: 'Link trang sản phẩm', kind: 'url', wide: true },
  { key: 'usps', label: 'Điểm nổi bật KOC cần nhấn mạnh', kind: 'lines' },
  { key: 'mechanism', label: 'Cơ chế tác động', kind: 'long' },
  { key: 'ingredients', label: 'Thành phần chính', kind: 'lines', hint: 'Mỗi dòng: tên thành phần: công dụng.' },
  { key: 'targetUser', label: 'Phù hợp với' },
  { key: 'contraindications', label: 'Không dùng cho' },
];
const FAQ_FIELDS: ItemField[] = [
  { key: 'question', label: 'Câu hỏi của người xem', required: true, wide: true },
  { key: 'answer', label: 'Câu trả lời gợi ý cho KOC', kind: 'long', required: true },
  { key: 'mention', label: 'Nên nhắc', kind: 'lines' },
  { key: 'avoid', label: 'Không được nói', kind: 'lines' },
];
const LEGAL_FIELDS: ItemField[] = [
  { key: 'title', label: 'Tên văn bản', required: true, wide: true, hint: 'Ví dụ: Phiếu công bố mỹ phẩm, Giấy xác nhận nội dung quảng cáo.' },
  { key: 'docNumber', label: 'Số văn bản' },
  { key: 'authority', label: 'Cơ quan cấp' },
  { key: 'issueDate', label: 'Ngày cấp', hint: 'dd/mm/yyyy' },
  { key: 'validUntil', label: 'Hiệu lực đến', hint: 'dd/mm/yyyy, để trống nếu không thời hạn.' },
  { key: 'disclaimer', label: 'Câu cảnh báo bắt buộc khi truyền thông', kind: 'long' },
  { key: 'url', label: 'Tệp bản scan hoặc link', kind: 'file', wide: true },
];
const DOC_FIELDS: ItemField[] = [
  { key: 'title', label: 'Tên tài liệu', required: true, wide: true },
  { key: 'category', label: 'Loại', kind: 'select', options: Object.entries(DOC_CATEGORY_LABEL).map(([value, label]) => ({ value, label })) },
  { key: 'url', label: 'Tệp tài liệu hoặc link (Lark, Google Drive…)', kind: 'file', required: true },
  { key: 'note', label: 'Ghi chú', kind: 'long' },
];
const LIST_META: Record<ListKey, { section: BrandSection; fields: ItemField[]; noun: string }> = {
  products: { section: 'PRODUCTS', fields: PRODUCT_FIELDS, noun: 'sản phẩm' },
  faqs: { section: 'FAQS', fields: FAQ_FIELDS, noun: 'câu hỏi' },
  legal: { section: 'LEGAL', fields: LEGAL_FIELDS, noun: 'văn bản pháp lý' },
  documents: { section: 'DOCUMENTS', fields: DOC_FIELDS, noun: 'tài liệu' },
};

const QUICK_UPLOAD_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.gif,.svg,.zip,.txt';

export function BrandProfileDetail({
  row,
  can,
  deals,
  stores = INITIAL_STORE_PORTFOLIOS,
  monthlyPlans,
  selectedMonth: controlledMonth,
  onMonthChange,
  busy,
  onBack,
  nav,
  onSave,
  onOpenBooking,
  onNavigateToStoreProfile,
  onUpdateStore,
  onDrilldownToPlan,
  onDrilldownToListing,
  onDrilldownToBooking,
  onSelectDealForContract,
  onNotify,
  embedded = false,
  hideInternalRatecard = false,
  initialTab,
  currentUser,
}: {
  row: BrandRow;
  can: BrandPermissions;
  deals: BookingDealItem[];
  stores?: StorePortfolioItem[];
  monthlyPlans?: InputPlanBreakdownState[];
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
  busy: boolean;
  onBack: () => void;
  nav?: { onPrev?: () => void; onNext?: () => void; position?: number; total?: number };
  onSave: Save;
  onOpenBooking?: () => void;
  onNavigateToStoreProfile?: (storeName: string) => void;
  onUpdateStore?: (store: StorePortfolioItem) => void;
  onDrilldownToPlan?: (params: { planId?: string; storeId?: string; storeName?: string; brandName?: string; month: string }) => void;
  onDrilldownToListing?: (params: { storeName?: string; brandName?: string; month: string }) => void;
  onDrilldownToBooking?: (params: { storeName?: string; brandName?: string; dealCode?: string; month: string }) => void;
  onSelectDealForContract?: (deal: BookingDealItem) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  embedded?: boolean;
  hideInternalRatecard?: boolean;
  initialTab?: BrandDetailTab;
  currentUser?: UserProfile | null;
}) {
  const p = row.profile;
  const m = row.master;

  const [internalMonth, setInternalMonth] = useState<string>(controlledMonth || '2026/10');
  const activeMonth = controlledMonth || internalMonth;
  const handleMonthChange = (next: string) => {
    setInternalMonth(next);
    onMonthChange?.(next);
  };

  const [activeTab, setActiveTab] = useState<BrandDetailTab>(initialTab || 'STORES');
  const [selectedAngleProductId, setSelectedAngleProductId] = useState<string>('ALL');

  const [prevInitialTab, setPrevInitialTab] = useState<BrandDetailTab | undefined>(initialTab);
  if (initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab);
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }
  const [dialog, setDialog] = useState<null | 'POSITIONING' | 'ENTITY' | 'RATECARD' | 'CONTENT_RULES' | 'WORKFLOW_RULES'>(null);
  const [item, setItem] = useState<null | { list: ListKey; index: number }>(null);
  const [removing, setRemoving] = useState<null | { list: ListKey; index: number }>(null);
  const [editingStore, setEditingStore] = useState<StorePortfolioItem | null>(null);
  const [inspectingBooking, setInspectingBooking] = useState<StoreMonthlyBookingRecord | null>(null);
  const [showTaxCode, setShowTaxCode] = useState(false);

  // Kho tệp R2 state
  const [quickUploading, setQuickUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<BrandDocCategory>('GUIDELINE');
  const [docFilter, setDocFilter] = useState<'ALL' | BrandDocCategory>('ALL');
  const [docSearch, setDocSearch] = useState('');
  const [previewDoc, setPreviewDoc] = useState<BrandDocument | null>(null);
  const [r2SetupOpen, setR2SetupOpen] = useState(false);
  const quickFileInputRef = useRef<HTMLInputElement | null>(null);

  const saveDialog = async (section: BrandSection, data: unknown) => {
    if (await onSave(section, data)) setDialog(null);
  };
  const saveList = async (list: ListKey, next: unknown[], summary: string) => {
    const meta = LIST_META[list];
    return onSave(meta.section, { [list]: next }, summary);
  };
  const listOf = (list: ListKey) => p[list] as unknown as Array<Record<string, unknown>>;

  const handleQuickUploadFiles = async (files: FileList | null, categoryOverride?: BrandDocCategory) => {
    if (!files || files.length === 0 || !can.DOCUMENTS) return;
    setQuickUploading(true);
    try {
      const targetCategory = categoryOverride || uploadCategory || 'GUIDELINE';
      const uploadedDocs = [];
      for (const file of Array.from(files)) {
        const stored = await uploadBrandFileClient({
          file,
          brandName: row.name,
          section: 'DOCUMENTS',
        });
        const cleanTitle = file.name.replace(/\.[^.]+$/, '') || file.name;
        uploadedDocs.push({
          title: cleanTitle,
          category: targetCategory,
          url: stored.url,
          note: '',
          fileKey: stored.fileKey,
          fileName: stored.fileName,
          fileSize: stored.fileSize,
          mimeType: stored.mimeType,
          storage: stored.storage,
        });
      }
      const nextDocs = [...listOf('documents'), ...uploadedDocs];
      const summary = uploadedDocs.length === 1
        ? `Tải tệp tài liệu: ${uploadedDocs[0].title}`
        : `Tải lên ${uploadedDocs.length} tệp tài liệu`;
      await saveList('documents', nextDocs, summary);
    } catch (e) {
      onNotify?.((e as Error).message || 'Không tải được tệp lên.', 'error');
    } finally {
      setQuickUploading(false);
      if (quickFileInputRef.current) quickFileInputRef.current.value = '';
    }
  };

  // Gian hàng trực thuộc thương hiệu này
  const brandStores = useMemo(() => {
    const bLower = row.name.trim().toLowerCase();
    const matched = stores.filter(
      s => s.brandName?.trim().toLowerCase() === bLower || s.storeName?.trim().toLowerCase().startsWith(`${bLower}_`),
    );
    if (matched.length > 0) return matched;
    return (m?.stores || []).map(st => ({
      id: st.id,
      storeName: st.storeName,
      brandName: row.name,
      platform: st.platform === 'SHOPEE_MALL' ? 'Shopee' : st.platform === 'LAZADA' ? 'Lazada' : 'TikTok',
      storeOperationId: st.storeId,
      storeUrl: st.storeUrl,
      affiliateRate: st.affiliateRate,
      requiresSparkAds: st.requiresSparkAds,
      operationStatus: 'Live' as const,
      b2cOwnerName: m?.brandPicName || 'Lê Phương Thảo',
      accountOwnerName: m?.accountPic,
      budgetNet: Math.round((m?.planBudget || m?.monthlyBudget || 0) / Math.max(1, m?.stores?.length || 1)),
    })) as StorePortfolioItem[];
  }, [stores, row.name, m]);

  // Chuỗi hồ sơ Plan & Report theo từng tháng của Thương hiệu
  const monthlyBrandLedger = useMemo<BrandMonthlyPlanReport[]>(() => {
    return PROFILE_MONTH_OPTIONS.map(opt =>
      buildBrandMonthlyPlanReport(row.name, brandStores, opt.value, {
        monthlyPlans,
        deals,
      }),
    );
  }, [row.name, brandStores, monthlyPlans, deals]);

  const currentBrandReport = useMemo<BrandMonthlyPlanReport>(() => {
    return (
      monthlyBrandLedger.find(r => r.month === activeMonth) ||
      buildBrandMonthlyPlanReport(row.name, brandStores, activeMonth, {
        monthlyPlans,
        deals,
      })
    );
  }, [monthlyBrandLedger, activeMonth, row.name, brandStores, monthlyPlans, deals]);

  const [bookingPage, setBookingPage] = useState<number>(1);
  const BOOKING_PAGE_SIZE = 25;

  const isOverbudget = currentBrandReport.overbudgetStoresCount > 0 || (currentBrandReport.planBudgetNet > 0 && currentBrandReport.reportSpentNet > currentBrandReport.planBudgetNet);
  const isUnbudgetedSpend = currentBrandReport.unbudgetedStoresCount > 0 || (currentBrandReport.planBudgetNet === 0 && currentBrandReport.reportSpentNet > 0);
  const expiredLegalCount = p.legal.filter(l => l.validUntil && isExpired(l.validUntil)).length;
  const r2FilesCount = p.documents.filter(d => d.fileKey || d.storage === 'R2' || d.storage === 'LOCAL').length;

  // Đội ngũ phụ trách theo quy chuẩn 2 tầng phòng B2C
  const leadB2c = 'Đặng Thị Yến Nhi';
  const groupLeaders = Array.from(new Set(brandStores.filter(s => s.hasBookingLeader && s.bookingLeader).map(s => s.bookingLeader!)));
  const specialistPics = Array.from(
    new Set(
      brandStores
        .map(s => s.b2cOwnerName || s.primaryPic || (s.b2cOwners && s.b2cOwners[0]))
        .filter((x): x is string => Boolean(x && !/chưa/i.test(x))),
    ),
  );
  const primarySpecialist = specialistPics[0] || real(m?.brandPicName) || 'Lê Phương Thảo';
  const accountPicName = real(m?.accountPic) || brandStores.find(s => s.accountOwnerName)?.accountOwnerName || '';

  const status = !row.saved
    ? { label: 'Nháp', tone: 'neutral' as const }
    : row.done === row.total
      ? { label: 'Hoàn tất', tone: 'positive' as const }
      : { label: 'Đang chạy', tone: 'info' as const };

  const editBtn = (section: BrandSection, onClick: () => void, label = 'Sửa') =>
    can[section] && <Button size="sm" icon={Pencil} onClick={onClick}>{label}</Button>;
  const addBtn = (list: ListKey, label?: string) =>
    can[LIST_META[list].section] && (
      <Button size="sm" icon={Plus} onClick={() => setItem({ list, index: -1 })}>
        {label || `Thêm ${LIST_META[list].noun}`}
      </Button>
    );
  const itemMenu = (list: ListKey, index: number) =>
    can[LIST_META[list].section] && (
      <ActionMenu
        items={[
          { label: 'Sửa', onSelect: () => setItem({ list, index }) },
          { label: 'Xóa', onSelect: () => setRemoving({ list, index }) },
        ]}
      />
    );

  // Lọc danh sách tài liệu trong tab Kho tệp R2
  const filteredDocs = useMemo(() => {
    return p.documents.filter(d => {
      if (docFilter !== 'ALL' && d.category !== docFilter) return false;
      if (docSearch.trim()) {
        const q = docSearch.trim().toLowerCase();
        return (
          d.title.toLowerCase().includes(q) ||
          (d.note && d.note.toLowerCase().includes(q)) ||
          (d.fileName && d.fileName.toLowerCase().includes(q)) ||
          d.addedBy.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [p.documents, docFilter, docSearch]);

  const docChips = useMemo(() => {
    const base: Array<{ key: 'ALL' | BrandDocCategory; label: string; count: number }> = [
      { key: 'ALL', label: 'Tất cả', count: p.documents.length },
      ...(Object.entries(DOC_CATEGORY_LABEL) as Array<[BrandDocCategory, string]>).map(([key, label]) => ({
        key,
        label,
        count: p.documents.filter(d => d.category === key).length,
      })),
    ];
    return base;
  }, [p.documents]);

  // Cột bảng lịch sử hồ sơ theo tháng của thương hiệu
  const brandLedgerColumns: Column<BrandMonthlyPlanReport>[] = [
    {
      key: 'month',
      header: 'Kỳ hồ sơ tháng',
      width: 155,
      render: r => {
        const isSelected = r.month === activeMonth;
        return (
          <div className="flex items-center gap-1.5">
            <span className={`font-semibold tabular-nums ${isSelected ? 'text-accent' : 'text-ink'}`}>{r.monthLabel}</span>
            {isSelected && <span className="text-2xs font-medium text-accent">· Đang xem</span>}
          </div>
        );
      },
    },
    {
      key: 'nmv',
      header: 'Doanh số NMV (Plan → Report)',
      width: 215,
      align: 'right',
      render: r => (
        <div className="leading-tight tabular-nums text-right">
          <div className="text-xs font-medium text-ink">
            <span className="text-ink-3">Plan: </span>
            {r.planNmv > 0 ? formatVndShort(r.planNmv) : 'Theo sàn'}
            <span className="text-ink-3"> · Đạt: </span>
            <span className="font-semibold text-accent">{r.reportNmv > 0 ? formatVndShort(r.reportNmv) : '0 đ'}</span>
          </div>
          {r.planNmv > 0 && (
            <span className={`block text-2xs ${r.nmvAchievementPct >= 80 ? 'text-positive' : 'text-ink-3'}`}>
              Hoàn thành {r.nmvAchievementPct}% chỉ tiêu NMV
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'budgetNet',
      header: 'Ngân sách Net (Plan → Duyệt chi)',
      width: 225,
      align: 'right',
      render: r => {
        const isOver = r.overbudgetStoresCount > 0 || (r.planBudgetNet > 0 && r.reportSpentNet > r.planBudgetNet);
        const isUnbudgeted = r.unbudgetedStoresCount > 0;
        return (
          <div className="leading-tight tabular-nums text-right">
            <div className="text-xs font-medium text-ink">
              <span className="text-ink-3">Hạn mức: </span>
              {r.planBudgetNet > 0 ? formatVndShort(r.planBudgetNet) : '0 đ'}
              <span className="text-ink-3"> · Chi: </span>
              <span className={`font-semibold ${isOver || isUnbudgeted ? 'text-critical' : 'text-ink'}`}>
                {formatVndShort(r.reportSpentNet)}
              </span>
            </div>
            <span className={`block text-2xs ${isOver || isUnbudgeted ? 'text-critical font-medium' : 'text-ink-3'}`}>
              {isUnbudgeted
                ? `${r.unbudgetedStoresCount} gian phát sinh chi ngoài kế hoạch`
                : isOver
                  ? `${r.overbudgetStoresCount} gian vượt hạn mức Net`
                  : r.planBudgetNet > 0
                    ? `Giải ngân ${r.budgetBurnPct}% hạn mức`
                    : 'Chỉ tiêu FOC 0đ'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'videos',
      header: 'Video (Plan → Booked → Air)',
      width: 205,
      align: 'right',
      render: r => (
        <div className="leading-tight tabular-nums text-right">
          <span className="block text-xs font-medium text-ink">
            {r.planTotalVideos} chỉ tiêu → <strong className="text-accent">{r.reportBookedCount}</strong> deal →{' '}
            <strong className="text-positive">{r.reportAiredCount}</strong> lên bài
          </span>
          <span className="block text-2xs text-ink-3">
            Lượt xem: {formatNumber(r.reportTotalViews)} · Đơn: {formatNumber(r.reportTotalOrders)}
          </span>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Drill-down',
      width: 195,
      align: 'right',
      render: r => (
        <div className="inline-flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
          <Button
            size="sm"
            variant={r.month === activeMonth ? 'secondary' : 'ghost'}
            onClick={() => handleMonthChange(r.month)}
          >
            {r.month === activeMonth ? 'Đang chọn' : 'Xem tháng'}
          </Button>
          {onDrilldownToPlan && (
            <Button
              size="sm"
              variant="secondary"
              icon={FileSpreadsheet}
              onClick={() =>
                onDrilldownToPlan({
                  brandName: row.name,
                  month: r.month,
                })
              }
            >
              Plan
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Cột bảng đối soát Plan vs Report của từng gian hàng trực thuộc trong tháng đang chọn
  const storeMonthlyColumns: Column<StoreMonthlyPlanReport>[] = [
    {
      key: 'storeName',
      header: 'Gian hàng sàn',
      width: 225,
      render: sr => (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-ink truncate">{sr.storeName}</span>
            <ChannelTag channel={channelOf(sr.platform)} />
          </div>
          <span className="block text-2xs text-ink-3 mt-0.5">
            PIC: <strong className="text-ink-2 font-medium">{sr.specialistPic}</strong>
            {sr.leaderPic ? ` · TN: ${sr.leaderPic}` : ' · Trực tiếp GĐ'}
          </span>
        </div>
      ),
    },
    {
      key: 'nmv',
      header: `NMV (${activeMonth})`,
      width: 165,
      align: 'right',
      render: sr => (
        <div className="leading-tight tabular-nums text-right">
          <span className="block text-xs font-medium text-ink">
            Plan: {sr.planNmv > 0 ? formatVndShort(sr.planNmv) : 'Theo sàn'}
          </span>
          <span className="block text-2xs text-accent font-medium mt-0.5">
            Report: {sr.reportNmv > 0 ? formatVndShort(sr.reportNmv) : '0 đ'}
            {sr.planNmv > 0 ? ` (${sr.nmvAchievementPct}%)` : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'budgetNet',
      header: `Ngân sách Net (${activeMonth})`,
      width: 175,
      align: 'right',
      render: sr => (
        <div className="leading-tight tabular-nums text-right">
          <span className="block text-xs font-medium text-ink">
            Plan: {sr.planBudgetNet > 0 ? formatVndShort(sr.planBudgetNet) : '0 đ'}
          </span>
          <span className={`block text-2xs font-medium mt-0.5 ${sr.isOverbudget || sr.isUnbudgetedSpend ? 'text-critical' : 'text-ink-2'}`}>
            Chi: {formatVndShort(sr.reportSpentNet)}
            {sr.isUnbudgetedSpend ? ' · Ngoài KH' : sr.isOverbudget ? ' · Vượt trần' : sr.planBudgetNet > 0 ? ` (${sr.budgetBurnPct}%)` : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'quota',
      header: 'Video (Plan → Report)',
      align: 'right',
      width: 170,
      render: sr => (
        <div className="leading-tight text-right tabular-nums">
          <span className="block font-medium text-ink text-xs">
            Plan {sr.planTotalVideos} → Booked <strong className="text-accent">{sr.reportBookedCount}</strong> → Air <strong className="text-positive">{sr.reportAiredCount}</strong>
          </span>
          <span className="block text-2xs text-ink-3 mt-0.5">
            Aff {sr.planAffiliateVideos} · Kênh {sr.planSelfChannelVideos} · FOC {sr.planFocVideos}
          </span>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Drill-down Gian hàng / Plan / Booking',
      align: 'right',
      width: 280,
      render: sr => {
        const storeObj = brandStores.find(s => s.id === sr.storeId || s.storeName === sr.storeName);
        return (
          <div className="inline-flex items-center justify-end gap-1 flex-wrap" onClick={e => e.stopPropagation()}>
            {onDrilldownToPlan && (
              <Button
                size="sm"
                variant="secondary"
                icon={FileSpreadsheet}
                onClick={() =>
                  onDrilldownToPlan({
                    planId: sr.planId,
                    storeId: sr.storeId,
                    storeName: sr.storeName,
                    brandName: row.name,
                    month: activeMonth,
                  })
                }
              >
                Plan
              </Button>
            )}
            {onDrilldownToBooking && (
              <Button
                size="sm"
                variant="secondary"
                icon={Video}
                onClick={() =>
                  onDrilldownToBooking({
                    storeName: sr.storeName,
                    brandName: row.name,
                    month: activeMonth,
                  })
                }
              >
                Booking ({sr.reportBookedCount})
              </Button>
            )}
            {onNavigateToStoreProfile && (
              <Button size="sm" variant="ghost" onClick={() => onNavigateToStoreProfile(sr.storeName)}>
                Hồ sơ gian
              </Button>
            )}
            {storeObj && onUpdateStore && (can.WORKFLOW_RULES || can.POSITIONING) && (
              <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditingStore(storeObj)}>
                Sửa
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  // Cột bảng chi tiết Booking & Báo cáo Video của Thương hiệu trong tháng
  const brandBookingColumns: Column<StoreMonthlyBookingRecord>[] = [
    {
      key: 'koc',
      header: 'Creator / KOC & Mã Deal',
      width: 225,
      render: b => (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-ink truncate">{b.kocName}</span>
            <span className="text-2xs font-code text-ink-3">
              · {b.tierCode}
            </span>
          </div>
          <span className="block text-2xs text-ink-3 font-code mt-0.5">
            {b.dealCode} · {b.kocHandle}
          </span>
        </div>
      ),
    },
    {
      key: 'store',
      header: 'Gian hàng & PIC',
      width: 175,
      render: b => (
        <div className="leading-tight min-w-0">
          <span className="text-xs font-medium text-ink truncate block max-w-[170px]">{b.storeName}</span>
          <span className="text-2xs text-ink-3 block truncate mt-0.5">PIC: {b.picName}</span>
        </div>
      ),
    },
    {
      key: 'cost',
      header: 'Chi phí Net / Gross',
      align: 'right',
      width: 135,
      render: b => (
        <div className="leading-tight tabular-nums text-right">
          <span className="block font-medium text-ink">{b.costNet > 0 ? formatVnd(b.costNet) : '0 đ (FOC)'}</span>
          {b.costGross > b.costNet && (
            <span className="block text-2xs text-ink-3">Gross: {formatVndShort(b.costGross)}</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái & Ngày Air',
      width: 155,
      render: b => (
        <div className="leading-tight">
          {b.isAired ? (
            <Status tone="positive">{b.statusLabel}</Status>
          ) : (
            <Status tone="info">{b.statusLabel}</Status>
          )}
          <span className="block text-2xs text-ink-3 mt-1">{b.airDate || 'Đang sản xuất'}</span>
        </div>
      ),
    },
    {
      key: 'performance',
      header: 'Kết quả Video (Views · Đơn · GMV)',
      align: 'right',
      width: 205,
      render: b => (
        <div className="leading-tight tabular-nums text-right">
          <span className="block text-xs font-medium text-ink">
            {formatNumber(b.views)} xem · {formatNumber(b.orders)} đơn
          </span>
          <span className="block text-2xs text-accent font-medium mt-0.5">
            Doanh thu: {b.revenue > 0 ? formatVndShort(b.revenue) : '0 đ'}
            {b.roas > 0 ? ` · ROAS ${b.roas}x` : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Drill-down',
      align: 'right',
      width: 155,
      render: b => (
        <div className="inline-flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
          {b.videoLink ? (
            <a
              href={b.videoLink}
              target="_blank"
              rel="noreferrer"
              className="h-7 px-2 rounded border border-line bg-surface hover:bg-sunken text-2xs font-medium text-accent inline-flex items-center gap-1"
            >
              <span>Clip</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : null}
          <Button size="sm" variant="secondary" onClick={() => setInspectingBooking(b)}>
            Chi tiết
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. THANH ĐIỀU HƯỚNG & THAO TÁC NHANH */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={onBack} className="-ml-2.5">
            {embedded ? 'Quay lại Tổng quan Cổng' : 'Danh bạ thương hiệu'}
          </Button>
          {(nav?.onPrev || nav?.onNext) && (
            <div className="flex items-center gap-1 pl-2 border-l border-line text-2xs text-ink-3">
              <button
                type="button"
                disabled={!nav?.onPrev}
                onClick={nav?.onPrev}
                aria-label="Nhãn hàng trước"
                title="Nhãn hàng trước"
                className="p-1 rounded hover:bg-sunken text-ink-3 hover:text-ink disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {nav?.position && nav?.total ? (
                <span className="tabular-nums font-medium">{nav.position} / {nav.total}</span>
              ) : null}
              <button
                type="button"
                disabled={!nav?.onNext}
                onClick={nav?.onNext}
                aria-label="Nhãn hàng sau"
                title="Nhãn hàng sau"
                className="p-1 rounded hover:bg-sunken text-ink-3 hover:text-ink disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-accent" />
            <span className="text-ink-3">Kỳ hồ sơ:</span>
            <select
              value={activeMonth}
              onChange={e => handleMonthChange(e.target.value)}
              className="bg-transparent font-semibold text-ink focus:outline-none cursor-pointer"
              aria-label="Chọn kỳ hồ sơ tháng của thương hiệu"
            >
              {PROFILE_MONTH_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <input
            ref={quickFileInputRef}
            type="file"
            multiple
            accept={QUICK_UPLOAD_ACCEPT}
            className="hidden"
            onChange={e => void handleQuickUploadFiles(e.target.files)}
          />
          {can.DOCUMENTS && (
            <Button
              size="sm"
              variant="secondary"
              icon={quickUploading ? Loader2 : Upload}
              disabled={busy || quickUploading}
              onClick={() => quickFileInputRef.current?.click()}
            >
              {quickUploading ? 'Đang tải tệp…' : 'Tải tệp thương hiệu'}
            </Button>
          )}
          {onDrilldownToPlan && (
            <Button
              size="sm"
              variant="secondary"
              icon={FileSpreadsheet}
              onClick={() => onDrilldownToPlan({ brandName: row.name, month: activeMonth })}
            >
              Chi tiết Plan ({activeMonth})
            </Button>
          )}
          {(onDrilldownToBooking || onOpenBooking) && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                if (onDrilldownToBooking) {
                  onDrilldownToBooking({ brandName: row.name, month: activeMonth });
                } else {
                  onOpenBooking?.();
                }
              }}
            >
              Quản lý Booking ({currentBrandReport.reportBookedCount})
            </Button>
          )}
        </div>
      </div>

      {/* 2. ĐỊNH DANH THƯƠNG HIỆU (THÔNG SỐ TĨNH) */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          {/* Tên chuyển cảnh khớp với hàng trong BrandProfilesView */}
          <span className="shrink-0 inline-flex" style={sharedTo('brand-avatar')}>
            <BrandAvatar name={row.name} id={row.master?.id} code={row.master?.code} size={48} rounded="lg" />
          </span>
          <div className="min-w-0 grid gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-ink" style={sharedTo('brand-title')}>{row.name}</h2>
              {m?.code && (
                <span className="text-2xs font-code text-ink-3">
                  · {m.code}
                </span>
              )}
              <Status tone={status.tone}>{status.label}</Status>
              <span className="text-[13px] text-ink-3 tabular-nums">{row.done}/{row.total} mục hồ sơ tĩnh</span>
              {(m?.platforms || []).map(pl => (
                <ChannelTag key={pl} channel={channelOf(pl)} />
              ))}
              {isOverbudget && (
                <span className="text-2xs font-medium text-critical">
                  · Có gian hàng vượt hạn mức ({activeMonth})
                </span>
              )}
              {isUnbudgetedSpend && (
                <span className="text-2xs font-medium text-warning">
                  · Có gian hàng chi ngoài KH ({activeMonth})
                </span>
              )}
            </div>
            <p className="text-[13px] text-ink-2">
              {[
                real(m?.category) || 'Nhãn hàng B2C',
                p.entity?.companyName || real(m?.companyName),
                p.entity?.originCountry ? `Xuất xứ: ${p.entity.originCountry}` : '',
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-ink-3">
              <span>Account PIC:</span>
              {accountPicName ? <Person name={accountPicName} size={18} /> : <span className="text-ink-3">Chưa gán</span>}
              <span>·</span>
              <span>Booking PIC:</span>
              <Person name={primarySpecialist} size={18} />
              <span>·</span>
              <span>Trưởng phòng B2C:</span>
              <Person name={leadB2c} size={18} />
            </div>
          </div>
        </div>
        {row.saved && (
          <p className="text-2xs text-ink-3">
            Phiên bản v{p.revision} · Cập nhật {dateTime(p.updatedAt)} bởi <strong className="text-ink-2 font-medium">{p.updatedBy}</strong>
          </p>
        )}
      </header>

      {/* 3. THANH CHỈ SỐ HỒ SƠ THÁNG: PLAN VS REPORT (THEO KỲ ĐANG CHỌN) */}
      <StatRow>
        <Stat
          label={`Doanh số NMV (${currentBrandReport.monthLabel})`}
          value={currentBrandReport.reportNmv > 0 ? formatVndShort(currentBrandReport.reportNmv) : '0 đ'}
          progress={
            currentBrandReport.planNmv > 0
              ? { value: currentBrandReport.reportNmv, max: currentBrandReport.planNmv }
              : undefined
          }
          note={
            currentBrandReport.planNmv > 0
              ? `Plan NMV: ${formatVndShort(currentBrandReport.planNmv)} · Đạt ${currentBrandReport.nmvAchievementPct}% (${brandStores.length} gian)`
              : `Plan NMV: Theo sàn (${brandStores.length} gian hàng)`
          }
          tone={currentBrandReport.nmvAchievementPct >= 80 ? 'positive' : undefined}
        />
        <Stat
          label={`Ngân sách Net (${currentBrandReport.monthLabel})`}
          value={formatVndShort(currentBrandReport.reportSpentNet)}
          progress={{
            value: currentBrandReport.reportSpentNet,
            max: currentBrandReport.planBudgetNet || 1,
            invert: currentBrandReport.reportSpentNet > currentBrandReport.planBudgetNet,
          }}
          note={
            currentBrandReport.planBudgetNet > 0
              ? `Plan Net: ${formatVndShort(currentBrandReport.planBudgetNet)} · Giải ngân ${currentBrandReport.budgetBurnPct}%`
              : currentBrandReport.reportSpentNet > 0
                ? 'Cảnh báo: Phát sinh chi khi Plan Net = 0 đ'
                : 'Plan Net: 0 đ (Chế độ FOC gửi mẫu)'
          }
          tone={isOverbudget ? 'critical' : isUnbudgetedSpend ? 'warning' : 'positive'}
        />
        <Stat
          label={`Sản lượng Video (${currentBrandReport.monthLabel})`}
          value={`${currentBrandReport.reportAiredCount} / ${currentBrandReport.planTotalVideos} video`}
          progress={
            currentBrandReport.planTotalVideos > 0
              ? { value: currentBrandReport.reportAiredCount, max: currentBrandReport.planTotalVideos }
              : undefined
          }
          note={`Đã chốt ${currentBrandReport.reportBookedCount} deal · ${formatNumber(currentBrandReport.reportTotalViews)} xem · ${formatNumber(currentBrandReport.reportTotalOrders)} đơn`}
          tone={currentBrandReport.videoAiredPct >= 75 ? 'positive' : undefined}
        />
        <Stat
          label="Hồ sơ tĩnh: Tài liệu & Pháp lý"
          value={`${p.documents.length} tệp · ${p.products.length} SKU`}
          note={
            expiredLegalCount > 0
              ? `${expiredLegalCount} văn bản pháp lý hết hiệu lực`
              : `${p.legal.length} văn bản pháp lý · ${p.contentRules?.banned.length || 0} từ cấm`
          }
          tone={expiredLegalCount > 0 ? 'critical' : r2FilesCount > 0 ? 'positive' : undefined}
        />
      </StatRow>

      {/* 4. CÁC PHÂN KHU NGHIỆP VỤ */}
      <Tabs<BrandDetailTab>
        value={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'STORES',
            label: `Hồ sơ Tháng: Plan & Report (${activeMonth})`,
            count: `${brandStores.length} gian · ${currentBrandReport.reportBookedCount} deal`,
          },
          { key: 'OVERVIEW', label: 'Hồ sơ tĩnh & Định vị', count: `${row.done}/${row.total}` },
          {
            key: 'WORKFLOW',
            label: 'Quy tắc vận hành & Phê duyệt',
            count: p.workflowRules?.kocApprovalMode === 'KL4_PLUS_ONLY' ? 'Duyệt KL4+' : p.workflowRules?.kocApprovalMode === 'NONE_AUTO' ? 'Tự chủ' : 'Duyệt 100%',
          },
          { key: 'FILES', label: 'Tài liệu & Hợp đồng', count: p.documents.length },
          { key: 'PRODUCTS', label: 'Sản phẩm, Góc nội dung & Trần thù lao', count: `${p.products.length} SKU` },
          {
            key: 'COMPLIANCE',
            label: 'Từ cấm, Pháp lý & Câu hỏi khó',
            count: (p.contentRules?.banned.length || 0) + p.legal.length + p.faqs.length,
            tone: expiredLegalCount > 0 ? 'critical' : 'default',
          },
        ]}
      />

      {/* ===================================================================== */}
      {/* TAB 1: TỔNG QUAN & ĐỊNH VỊ (BỐ CỤC 2 CỘT)                             */}
      {/* ===================================================================== */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid gap-6 items-start lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="grid gap-6 min-w-0">
            {/* Quy tắc vận hành & Phê duyệt (ảnh hưởng trực tiếp tới luồng làm việc của nhân sự) */}
            <Panel
              title={SECTION_LABEL.WORKFLOW_RULES}
              actions={
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => setActiveTab('WORKFLOW')}>
                    Chi tiết quy trình
                  </Button>
                  {editBtn('WORKFLOW_RULES', () => setDialog('WORKFLOW_RULES'), 'Cấu hình luồng')}
                </div>
              }
            >
              {p.workflowRules ? (
                <div className="grid gap-3.5 text-[13px]">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-ink-2">
                    <span className="font-semibold text-ink">
                      {PROJECT_TIER_LABEL[p.workflowRules.projectTier]}
                    </span>
                    <span className="text-ink-3">·</span>
                    <span className="font-medium text-ink-2">
                      {OPERATING_MODEL_LABEL[p.workflowRules.operatingModel]}
                    </span>
                    <span className="text-ink-3">·</span>
                    <span className="text-ink-3">
                      {STRATEGY_OWNER_LABEL[p.workflowRules.strategyOwnerTeam]}
                    </span>
                  </div>
                  <dl className="grid gap-3 sm:grid-cols-3 pt-1">
                    <Info label="Chốt chặn duyệt danh sách KOC">
                      <span className="font-medium text-ink">{KOC_APPROVAL_MODE_LABEL[p.workflowRules.kocApprovalMode]}</span>
                    </Info>
                    <Info label="SLA duyệt kịch bản & giới hạn sửa">
                      <span>
                        {[
                          p.workflowRules.requireScriptApproval ? 'Duyệt kịch bản' : 'Bỏ duyệt kịch bản',
                          p.workflowRules.requireDemoApproval ? 'Duyệt video nháp' : 'Không duyệt nháp',
                        ].join(' + ')}{' '}
                        · Tự động cho phép đăng sau <strong>{p.workflowRules.autoAirAfterHours}h</strong> · Tối đa <strong>{p.workflowRules.maxFreeRevisions} lần sửa</strong>
                      </span>
                    </Info>
                    <Info label="Đầu mối gửi mẫu & thu hồi">
                      <span>
                        {SAMPLE_SENDER_LABEL[p.workflowRules.sampleSender]} (SLA {p.workflowRules.samplePrepSlaHours}h) · {SAMPLE_RETURN_LABEL[p.workflowRules.defaultSamplePolicy]}
                      </span>
                    </Info>
                  </dl>
                  <div className="rounded-lg bg-canvas/80 border border-line px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-2xs text-ink-2">
                    <span>
                      <strong>Bản quyền &amp; Quảng cáo:</strong>{' '}
                      {p.workflowRules.requiresAdsCode ? `Cấp mã quảng cáo ${p.workflowRules.adsCodeDurationDays} ngày` : 'Không bắt buộc mã quảng cáo'}
                      {' · '}Giữ clip tối thiểu {p.workflowRules.minVideoRetentionDays} ngày
                      {p.workflowRules.exclusivityDays > 0 ? ` · Độc quyền ngành hàng ${p.workflowRules.exclusivityDays} ngày` : ''}
                    </span>
                    <span className="text-ink-3">
                      Người duyệt phía nhãn: <strong className="text-ink">{p.workflowRules.brandApproverName || 'Đại diện nhãn hàng'}</strong>
                    </span>
                  </div>
                </div>
              ) : (
                <EmptyState title="Chưa cấu hình quy tắc vận hành" description="Thiết lập cổng duyệt KOC, SLA duyệt kịch bản và chính sách gửi mẫu." />
              )}
            </Panel>

            {/* Định vị & thông điệp 4P / Insight */}
            <Panel
              title={SECTION_LABEL.POSITIONING}
              actions={editBtn('POSITIONING', () => setDialog('POSITIONING'), p.positioning ? 'Sửa' : 'Thêm')}
            >
              {p.positioning && (p.positioning.slogan || p.positioning.toneOfVoice || p.positioning.story) ? (
                <div className="grid gap-4 text-[13px]">
                  {p.positioning.slogan && (
                    <div className="rounded-lg bg-canvas border border-line px-3.5 py-2.5">
                      <span className="block text-2xs text-ink-3 mb-0.5">Khẩu hiệu chủ đạo (Slogan)</span>
                      <p className="text-[14.5px] font-medium text-ink">“{p.positioning.slogan}”</p>
                    </div>
                  )}
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <Info label="Phong cách & giọng văn KOC">
                      {[p.positioning.toneTag && TONE_LABEL[p.positioning.toneTag], p.positioning.toneOfVoice].filter(Boolean).join(' · ')}
                    </Info>
                    <Info label="Khách hàng mục tiêu">{p.positioning.targetAudience}</Info>
                  </dl>
                  {p.positioning.story && (
                    <Info label="Câu chuyện thương hiệu & Bối cảnh ngành hàng">
                      <span className="whitespace-pre-line text-ink-2 leading-relaxed">{p.positioning.story}</span>
                    </Info>
                  )}
                  {((p.positioning.painPoints?.length || 0) > 0 || (p.positioning.barriersToTrial?.length || 0) > 0) && (
                    <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-line">
                      {(p.positioning.painPoints?.length || 0) > 0 && (
                        <div className="rounded-lg bg-canvas/60 border border-line p-3">
                          <span className="block text-2xs font-medium text-ink-3 mb-1">Nỗi đau khách hàng (mở đầu 3 giây đầu):</span>
                          <ul className="list-disc pl-4 text-xs text-ink-2 grid gap-1">
                            {p.positioning.painPoints!.map((pt, idx) => <li key={idx}>{pt}</li>)}
                          </ul>
                        </div>
                      )}
                      {(p.positioning.barriersToTrial?.length || 0) > 0 && (
                        <div className="rounded-lg bg-canvas/60 border border-line p-3">
                          <span className="block text-2xs font-medium text-ink-3 mb-1">Rào cản mua hàng KOC cần hóa giải:</span>
                          <ul className="list-disc pl-4 text-xs text-ink-2 grid gap-1">
                            {p.positioning.barriersToTrial!.map((br, idx) => <li key={idx}>{br}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  {((p.positioning.rtbs?.length || 0) > 0 || (p.positioning.contentPillars?.length || 0) > 0 || (p.positioning.competitors?.length || 0) > 0) && (
                    <dl className="grid gap-3 sm:grid-cols-2 pt-1">
                      {(p.positioning.rtbs?.length || 0) > 0 && (
                        <Info label="Bằng chứng tin cậy & kiểm nghiệm">
                          {p.positioning.rtbs!.join(' · ')}
                        </Info>
                      )}
                      {(p.positioning.contentPillars?.length || 0) > 0 && (
                        <Info label="Trụ cột tuyến nội dung">
                          {p.positioning.contentPillars!.join(' · ')}
                        </Info>
                      )}
                      {(p.positioning.competitors?.length || 0) > 0 && (
                        <Info label="Nhãn hàng cùng phân khúc (không nhắc tên trong clip)">
                          {p.positioning.competitors!.join(', ')}
                        </Info>
                      )}
                    </dl>
                  )}
                </div>
              ) : (
                <EmptyState title="Chưa có định vị thương hiệu" description="Thêm khẩu hiệu, giọng văn và chân dung khách hàng để KOC viết kịch bản." />
              )}
            </Panel>

            {/* Sản phẩm chủ lực */}
            <Panel
              title={SECTION_LABEL.PRODUCTS}
              actions={addBtn('products')}
              flush
            >
              {p.products.length === 0 ? (
                <EmptyState
                  title="Chưa có sản phẩm chủ lực"
                  description={
                    (m?.heroProducts.length || 0) > 0
                      ? `Dữ liệu gốc có ${m!.heroProducts.length} sản phẩm (${m!.heroProducts.map(h => h.productName || h.sku).slice(0, 3).join(', ')}) nhưng chưa cập nhật hướng dẫn cho KOC.`
                      : 'Thêm các SKU trọng tâm để KOC nắm rõ điểm nổi bật, thành phần và cơ chế tác động.'
                  }
                />
              ) : (
                <ul className="divide-y divide-line">
                  {p.products.map((x, i) => {
                    const stockMeta = x.sampleStockStatus ? SAMPLE_STOCK_LABEL[x.sampleStockStatus] : SAMPLE_STOCK_LABEL.IN_STOCK;
                    return (
                      <li key={x.id} className="px-4 py-4 grid gap-2.5 text-[13px]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-ink">{x.name}</span>
                              {x.skuCode && (
                                <span className="text-2xs font-code text-ink-3">
                                  · {x.skuCode}
                                </span>
                              )}
                              {x.size && <span className="text-2xs text-ink-3">· {x.size}</span>}
                              {x.priceVnd && <span className="text-xs font-semibold text-ink tabular-nums">· Niêm yết {formatVnd(x.priceVnd)}</span>}
                              {x.dealPriceVnd && <span className="text-xs font-semibold text-accent tabular-nums">· Giá deal {formatVnd(x.dealPriceVnd)}</span>}
                              <Status tone={stockMeta.tone}>{stockMeta.label}</Status>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-ink-3 mt-1">
                              {(x.commissionOrganicPct !== undefined || x.commissionAdsPct !== undefined) && (
                                <span>
                                  Hoa hồng KOC: <strong className="text-ink-2">{x.commissionOrganicPct ?? 10}% tự nhiên</strong>
                                  {x.commissionAdsPct !== undefined ? ` / ${x.commissionAdsPct}% quảng cáo` : ''}
                                </span>
                              )}
                              {x.sampleReturnRule && (
                                <span>· {SAMPLE_RETURN_LABEL[x.sampleReturnRule]}</span>
                              )}
                              {x.pdpUrl && (
                                <a
                                  href={x.pdpUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-accent hover:underline inline-flex items-center gap-1"
                                >
                                  <span>Mở trang sản phẩm trên sàn</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                          {itemMenu('products', i)}
                        </div>
                        {x.usps.length > 0 && (
                          <div>
                            <span className="block text-2xs text-ink-3 mb-1">Điểm nổi bật KOC cần nhấn mạnh:</span>
                            <ul className="list-disc pl-5 text-ink-2 grid gap-0.5">
                              {x.usps.map((u, k) => <li key={k}>{u}</li>)}
                            </ul>
                          </div>
                        )}
                        <dl className="grid gap-3 sm:grid-cols-2 pt-1">
                          {x.mechanism && <Info label="Cơ chế tác động / Góc kịch bản">{x.mechanism}</Info>}
                          {x.ingredients.length > 0 && <Info label="Thành phần chính">{x.ingredients.join('; ')}</Info>}
                          {x.targetUser && <Info label="Đối tượng phù hợp">{x.targetUser}</Info>}
                          {x.contraindications && <Info label="Lưu ý / Không dùng cho">{x.contraindications}</Info>}
                        </dl>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            {/* Quy chuẩn nội dung */}
            <Panel
              title={SECTION_LABEL.CONTENT_RULES}
              actions={editBtn('CONTENT_RULES', () => setDialog('CONTENT_RULES'), p.contentRules ? 'Sửa' : 'Thêm')}
              flush
            >
              {!p.contentRules ||
              (!p.contentRules.banned.length &&
                !p.contentRules.preferred.length &&
                !p.contentRules.visualDo.length &&
                !p.contentRules.visualDont.length) ? (
                <EmptyState title="Chưa có quy chuẩn nội dung" description="Thiết lập từ cấm và quy tắc hình ảnh để đối soát kịch bản KOC." />
              ) : (
                <div className="divide-y divide-line text-[13px]">
                  <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-line">
                    <div className="px-4 py-4 grid gap-2.5 content-start">
                      <h4 className="text-2xs font-medium text-critical">Từ khóa cấm dùng ({p.contentRules.banned.length})</h4>
                      {p.contentRules.banned.length === 0 ? (
                        <p className="text-ink-3">—</p>
                      ) : (
                        <ul className="grid gap-2">
                          {p.contentRules.banned.map(b => (
                            <li key={b.id} className="rounded-lg bg-canvas/60 border border-line p-2.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-medium text-critical">“{b.phrase}”</span>
                                {b.replacement && <span className="text-ink-2">→ Thay bằng: <strong className="text-positive font-medium">“{b.replacement}”</strong></span>}
                              </div>
                              {b.reason && <span className="block text-2xs text-ink-3 mt-0.5">{b.reason}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                      {p.contentRules.visualDont.length > 0 && (
                        <>
                          <h4 className="text-2xs font-medium text-ink-3 pt-2">Hình ảnh không được xuất hiện</h4>
                          <ul className="list-disc pl-5 text-ink-2 grid gap-1">
                            {p.contentRules.visualDont.map((x, k) => <li key={k}>{x}</li>)}
                          </ul>
                        </>
                      )}
                    </div>
                    <div className="px-4 py-4 grid gap-2.5 content-start">
                      <h4 className="text-2xs font-medium text-positive">Cụm từ khuyến khích ({p.contentRules.preferred.length})</h4>
                      {p.contentRules.preferred.length === 0 ? (
                        <p className="text-ink-3">—</p>
                      ) : (
                        <ul className="grid gap-2">
                          {p.contentRules.preferred.map(x => (
                            <li key={x.id} className="rounded-lg bg-canvas/60 border border-line p-2.5">
                              <span className="font-medium text-positive">“{x.phrase}”</span>
                              {x.note && <span className="block text-2xs text-ink-3 mt-0.5">{x.note}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                      {p.contentRules.visualDo.length > 0 && (
                        <>
                          <h4 className="text-2xs font-medium text-ink-3 pt-2">Hình ảnh nên có trong video</h4>
                          <ul className="list-disc pl-5 text-ink-2 grid gap-1">
                            {p.contentRules.visualDo.map((x, k) => <li key={k}>{x}</li>)}
                          </ul>
                        </>
                      )}
                    </div>
                  </div>
                  {((p.contentRules.mandatoryHashtags?.length || 0) > 0 || p.contentRules.defaultCta || p.contentRules.videoDurationRule) && (
                    <div className="px-4 py-3.5 bg-canvas/40 grid gap-2 sm:grid-cols-3 text-xs">
                      <Info label="Hashtag & gắn thẻ bắt buộc">
                        {[...(p.contentRules.mandatoryHashtags || []), ...(p.contentRules.mandatoryMentions || [])].join(' ')}
                      </Info>
                      <Info label="Thời lượng & cấu trúc clip">
                        {p.contentRules.videoDurationRule}
                      </Info>
                      <Info label="Câu điều hướng mua hàng (CTA)">
                        {p.contentRules.defaultCta}
                      </Info>
                    </div>
                  )}
                </div>
              )}
            </Panel>

            {/* Văn bản pháp lý & Câu hỏi khó */}
            <div className="grid gap-6 md:grid-cols-2">
              <Panel
                title={SECTION_LABEL.LEGAL}
                actions={addBtn('legal', 'Thêm văn bản')}
                flush
              >
                {p.legal.length === 0 ? (
                  <EmptyState title="Chưa có văn bản pháp lý" description="Tải lên phiếu công bố sản phẩm hoặc giấy phép quảng cáo." />
                ) : (
                  <ul className="divide-y divide-line">
                    {p.legal.map((l, i) => {
                      const ext = fileExtLabel(l.fileName || l.url);
                      const size = formatFileSize(l.fileSize);
                      const downloadUrl = l.fileKey ? `/api/brands/files?key=${encodeURIComponent(l.fileKey)}&download=1` : undefined;
                      return (
                        <li key={l.id} className="px-4 py-3 grid gap-1 text-[13px]">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex flex-wrap items-center gap-1.5">
                              <span className="font-medium text-ink">{l.title}</span>
                              {l.validUntil && isExpired(l.validUntil) ? (
                                <Status tone="critical">Hết hiệu lực</Status>
                              ) : (
                                <Status tone="positive">Còn hiệu lực</Status>
                              )}
                              {l.fileKey && (
                                <span className="text-2xs text-ink-3 font-code">
                                  · {[ext || 'FILE', size].filter(Boolean).join(' · ')}
                                </span>
                              )}
                            </div>
                            {itemMenu('legal', i)}
                          </div>
                          <p className="text-2xs text-ink-3 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                            <span>{[l.docNumber && `Số ${l.docNumber}`, l.authority, l.issueDate && `cấp ${l.issueDate}`, l.validUntil && `đến ${l.validUntil}`].filter(Boolean).join(' · ')}</span>
                            {l.url && (
                              <>
                                <span>·</span>
                                <a href={l.url} target="_blank" rel="noreferrer" className="text-accent hover:underline inline-flex items-center gap-0.5">
                                  <span>Bản scan</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </>
                            )}
                            {downloadUrl && (
                              <>
                                <span>·</span>
                                <a href={downloadUrl} className="text-accent hover:underline inline-flex items-center gap-0.5">
                                  <span>Tải xuống</span>
                                  <Download className="w-3 h-3" />
                                </a>
                              </>
                            )}
                          </p>
                          {l.disclaimer && <p className="text-2xs text-ink-2 mt-0.5">Cảnh báo bắt buộc: “{l.disclaimer}”</p>}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Panel>

              <Panel
                title={SECTION_LABEL.FAQS}
                actions={addBtn('faqs', 'Thêm câu hỏi')}
                flush
              >
                {p.faqs.length === 0 ? (
                  <EmptyState title="Chưa có câu hỏi khó" description="Bổ sung hướng dẫn xử lý tình huống cho KOC." />
                ) : (
                  <ul className="divide-y divide-line">
                    {p.faqs.map((f, i) => (
                      <li key={f.id} className="px-4 py-3 grid gap-1 text-[13px]">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-ink">{f.question}</p>
                          {itemMenu('faqs', i)}
                        </div>
                        <p className="text-ink-2 text-xs whitespace-pre-line">{f.answer}</p>
                        {(f.mention.length > 0 || f.avoid.length > 0) && (
                          <p className="text-2xs text-ink-3">
                            {f.mention.length > 0 && <>Nên nhắc: <span className="text-positive">{f.mention.join('; ')}</span></>}
                            {f.mention.length > 0 && f.avoid.length > 0 && ' · '}
                            {f.avoid.length > 0 && <>Tránh nói: <span className="text-critical">{f.avoid.join('; ')}</span></>}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          </div>

          {/* CỘT PHỤ BÊN PHẢI */}
          <aside className="bg-surface border border-line rounded-xl divide-y divide-line min-w-0">
            {/* Kho tài liệu rút gọn */}
            <Aside
              title={`${SECTION_LABEL.DOCUMENTS} (${p.documents.length})`}
              action={
                <div className="flex items-center gap-1.5">
                  {can.DOCUMENTS && (
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={quickUploading ? Loader2 : Upload}
                      disabled={busy || quickUploading}
                      onClick={() => quickFileInputRef.current?.click()}
                    >
                      {quickUploading ? 'Đang tải…' : 'Tải tệp'}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setActiveTab('FILES')}>
                    Mở kho tệp
                  </Button>
                </div>
              }
            >
              <div
                onDragOver={e => { if (can.DOCUMENTS) { e.preventDefault(); e.stopPropagation(); } }}
                onDrop={e => {
                  if (!can.DOCUMENTS) return;
                  e.preventDefault();
                  e.stopPropagation();
                  void handleQuickUploadFiles(e.dataTransfer.files);
                }}
              >
                {p.documents.length === 0 ? (
                  <p className="text-[13px] text-ink-3">
                    {can.DOCUMENTS ? 'Chưa có tài liệu. Nhấn “Tải tệp” hoặc kéo thả tệp vào đây để lưu lên hệ thống.' : 'Chưa có tài liệu.'}
                  </p>
                ) : (
                  <ul className="grid gap-2 text-[13px]">
                    {p.documents.slice(0, 5).map((d, i) => {
                      const ext = fileExtLabel(d.fileName || d.url);
                      const size = formatFileSize(d.fileSize);
                      const downloadUrl = d.fileKey ? `/api/brands/files?key=${encodeURIComponent(d.fileKey)}&download=1` : undefined;
                      return (
                        <li key={d.id} className="flex items-start justify-between gap-2 rounded-lg border border-line bg-canvas/40 px-2.5 py-2">
                          <div className="min-w-0 flex items-start gap-2">
                            <FileText className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <a href={d.url} target="_blank" rel="noreferrer" className="font-medium text-accent hover:underline break-words">
                                {d.title}
                              </a>
                              <div className="flex flex-wrap items-center gap-1.5 text-2xs text-ink-3 mt-0.5">
                                <span>{DOC_CATEGORY_LABEL[d.category]}</span>
                                {(ext || size) && (
                                  <span className="text-ink-3 font-code">
                                    · {[ext || (d.fileKey ? 'FILE' : 'LINK'), size].filter(Boolean).join(' · ')}
                                  </span>
                                )}
                                {downloadUrl && (
                                  <a href={downloadUrl} className="text-accent hover:underline inline-flex items-center gap-0.5">
                                    <Download className="w-3 h-3" />
                                    <span>Tải</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                          {itemMenu('documents', i)}
                        </li>
                      );
                    })}
                    {p.documents.length > 5 && (
                      <li>
                        <button type="button" onClick={() => setActiveTab('FILES')} className="text-2xs text-accent hover:underline">
                          Xem toàn bộ {p.documents.length} tệp trong Kho tài liệu →
                        </button>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </Aside>

            {/* Pháp nhân */}
            <Aside title={SECTION_LABEL.ENTITY} action={editBtn('ENTITY', () => setDialog('ENTITY'))}>
              <dl className="grid gap-3">
                <Info label="Tên công ty pháp nhân">{p.entity?.companyName || real(m?.companyName)}</Info>
                <Info label="Mã số thuế">
                  {p.entity?.taxCode && (
                    <span className="inline-flex items-center gap-2">
                      <span className="font-code tabular-nums">
                        {showTaxCode ? p.entity.taxCode : `•••• ${p.entity.taxCode.slice(-4)}`}
                      </span>
                      {can.ENTITY && (
                        <button
                          type="button"
                          onClick={() => setShowTaxCode(v => !v)}
                          className="text-2xs text-accent hover:underline"
                        >
                          {showTaxCode ? 'Ẩn số' : 'Hiện số'}
                        </button>
                      )}
                    </span>
                  )}
                </Info>
                <Info label="Đại diện liên hệ phía nhãn">{p.entity?.contactPerson || real(m?.contactPerson)}</Info>
                <Info label="Quốc gia / Xuất xứ">{p.entity?.originCountry}</Info>
              </dl>
            </Aside>

            {/* Đội ngũ phụ trách theo cơ cấu 2 tầng B2C */}
            <Aside title="Cơ cấu nhân sự phụ trách B2C">
              <dl className="grid gap-3">
                <Info label="Trưởng phòng B2C (Phê duyệt kế hoạch)">
                  <Person name={leadB2c} size={20} />
                </Info>
                <Info label="Trưởng nhóm phụ trách">
                  {groupLeaders.length > 0 ? (
                    <div className="grid gap-1">
                      {groupLeaders.map(gl => <Person key={gl} name={gl} size={20} />)}
                    </div>
                  ) : (
                    <span className="text-2xs text-ink-3">Không có trưởng nhóm — Trình trực tiếp Trưởng phòng</span>
                  )}
                </Info>
                <Info label="Chuyên viên thực thi Booking (PIC)">
                  <div className="grid gap-1.5">
                    {(specialistPics.length > 0 ? specialistPics : [primarySpecialist]).map(sp => (
                      <Person key={sp} name={sp} size={20} />
                    ))}
                  </div>
                </Info>
                {accountPicName && (
                  <Info label="Quản lý quan hệ nhãn hàng (Account PIC)">
                    <Person name={accountPicName} size={20} />
                  </Info>
                )}
                <Info label="Chuyên viên điều phối mẫu FOC">
                  <Person name="Trần Thị Hảo" size={20} />
                </Info>
              </dl>
            </Aside>

            {/* Trần thù lao */}
            {!hideInternalRatecard && (
              <Aside title={SECTION_LABEL.RATECARD} action={editBtn('RATECARD', () => setDialog('RATECARD'))}>
                {p.ratecard.some(r => r.maxBudget) ? (
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
                    {p.ratecard.map(r => (
                      <React.Fragment key={r.grade}>
                        <dt className="text-ink-2 font-code">{r.grade}</dt>
                        <dd className="text-right tabular-nums font-medium text-ink">
                          {r.maxBudget ? formatVndShort(r.maxBudget) : <span className="text-ink-3">—</span>}
                        </dd>
                      </React.Fragment>
                    ))}
                  </dl>
                ) : (
                  <p className="text-[13px] text-ink-3">Chưa đặt trần riêng cho nhãn.</p>
                )}
              </Aside>
            )}

            <History profile={p} />
          </aside>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 1B: QUY TẮC VẬN HÀNH & PHÊ DUYỆT (ĐIỀU KHIỂN LUỒNG LÀM VIỆC)       */}
      {/* ===================================================================== */}
      {activeTab === 'WORKFLOW' && (
        <div className="space-y-6">
          <Panel
            title={`${SECTION_LABEL.WORKFLOW_RULES} — ${row.name}`}
            actions={editBtn('WORKFLOW_RULES', () => setDialog('WORKFLOW_RULES'), 'Chỉnh sửa quy tắc vận hành')}
          >
            {p.workflowRules ? (
              <div className="grid gap-6 md:grid-cols-2 text-[13px]">
                {/* Nhóm 1: Phân hạng dự án & Mô hình vận hành */}
                <div className="rounded-xl border border-line bg-canvas/50 p-4 space-y-3">
                  <h4 className="text-xs font-semibold text-ink uppercase tracking-wide">
                    1. Phân hạng dự án &amp; Mô hình phối hợp team
                  </h4>
                  <dl className="grid gap-3">
                    <Info label="Phân hạng dự án B2C">
                      <Status tone={p.workflowRules.projectTier === 'TIER_A_STRATEGIC' ? 'info' : p.workflowRules.projectTier === 'TIER_B_GROWTH' ? 'positive' : 'neutral'}>
                        {PROJECT_TIER_LABEL[p.workflowRules.projectTier]}
                      </Status>
                    </Info>
                    <Info label="Mô hình phân công nhân sự (theo định hướng B2C)">
                      <span className="font-medium text-ink">{OPERATING_MODEL_LABEL[p.workflowRules.operatingModel]}</span>
                    </Info>
                    <Info label="Đơn vị chủ trì chiến lược nội dung (Key Message)">
                      <span>{STRATEGY_OWNER_LABEL[p.workflowRules.strategyOwnerTeam]}</span>
                    </Info>
                    <Info label="Đầu mối phê duyệt phía nhãn hàng">
                      <span className="font-medium text-ink">{p.workflowRules.brandApproverName || 'Đại diện nhãn hàng'}</span>
                    </Info>
                  </dl>
                </div>

                {/* Nhóm 2: Chốt chặn phê duyệt KOC & Kịch bản */}
                <div className="rounded-xl border border-line bg-canvas/50 p-4 space-y-3">
                  <h4 className="text-xs font-semibold text-ink uppercase tracking-wide">
                    2. Chốt chặn duyệt danh sách KOC &amp; SLA kịch bản
                  </h4>
                  <dl className="grid gap-3">
                    <Info label="Quy tắc duyệt danh sách KOC (tác động khi tạo deal)">
                      <span className="font-semibold text-accent">{KOC_APPROVAL_MODE_LABEL[p.workflowRules.kocApprovalMode]}</span>
                    </Info>
                    <Info label="Các bước bắt buộc trình nhãn duyệt">
                      <span>
                        {[
                          p.workflowRules.requireScriptApproval ? 'Bắt buộc duyệt kịch bản' : 'Không cần nhãn duyệt kịch bản',
                          p.workflowRules.requireDemoApproval ? 'Bắt buộc duyệt video nháp (Demo)' : 'Không cần duyệt video nháp',
                        ].join(' · ')}
                      </span>
                    </Info>
                    <Info label="Thời hạn tự động cho phép đăng bài (Auto-air SLA)">
                      <span>
                        Sau <strong>{p.workflowRules.autoAirAfterHours} giờ</strong> kể từ khi gửi kịch bản/video nháp mà nhãn chưa phản hồi, chuyên viên được phép cho KOC lên bài để kịp tiến độ chiến dịch.
                      </span>
                    </Info>
                    <Info label="Giới hạn số lần chỉnh sửa miễn phí">
                      <span>
                        Tối đa <strong>{p.workflowRules.maxFreeRevisions} lần sửa</strong> theo đúng brief ban đầu (từ lần thứ {p.workflowRules.maxFreeRevisions + 1} cần thương lượng phụ phí).
                      </span>
                    </Info>
                  </dl>
                </div>

                {/* Nhóm 3: Gửi mẫu & Bản quyền chạy Ads */}
                <div className="rounded-xl border border-line bg-canvas/50 p-4 space-y-3">
                  <h4 className="text-xs font-semibold text-ink uppercase tracking-wide">
                    3. Quy định gửi hàng mẫu &amp; Bản quyền quảng cáo
                  </h4>
                  <dl className="grid gap-3">
                    <Info label="Đầu mối xuất kho gửi mẫu &amp; SLA chuẩn bị">
                      <span>
                        <strong>{SAMPLE_SENDER_LABEL[p.workflowRules.sampleSender]}</strong> · Chuẩn bị đơn trong <strong>{p.workflowRules.samplePrepSlaHours} giờ</strong>
                      </span>
                    </Info>
                    <Info label="Chính sách thu hồi hàng mẫu mặc định">
                      <span>{SAMPLE_RETURN_LABEL[p.workflowRules.defaultSamplePolicy]}</span>
                    </Info>
                    <Info label="Yêu cầu cấp mã quảng cáo (Spark Ads) &amp; File gốc">
                      <span>
                        {p.workflowRules.requiresAdsCode
                          ? `Bắt buộc cấp mã quảng cáo tối thiểu ${p.workflowRules.adsCodeDurationDays} ngày`
                          : 'Không bắt buộc cấp mã quảng cáo'}
                        {p.workflowRules.requireRawVideoHandover ? ' · Bắt buộc bàn giao file video gốc không logo' : ''}
                      </span>
                    </Info>
                    <Info label="Phạm vi sử dụng lại hình ảnh &amp; Độc quyền">
                      <span>
                        Kênh được đăng lại: <strong>{(p.workflowRules.repostAllowedChannels || []).join(', ') || 'TikTok'}</strong>
                        {' · '}Giữ video tối thiểu <strong>{p.workflowRules.minVideoRetentionDays} ngày</strong>
                        {p.workflowRules.exclusivityDays > 0 ? ` · Độc quyền ngành hàng ${p.workflowRules.exclusivityDays} ngày` : ' · Không yêu cầu độc quyền'}
                      </span>
                    </Info>
                    <Info label="Chính sách phụ phí mua bản quyền / chạy quảng cáo">
                      <span>
                        {p.workflowRules.allowExtraFeeForAdsOrCrosspost
                          ? 'Cho phép đàm phán phụ phí với KOC lớn khi nhãn cần mua đứt file gốc hoặc đăng đa kênh'
                          : 'Giá booking trọn gói đã bao gồm quyền sử dụng hình ảnh theo thời hạn chuẩn'}
                      </span>
                    </Info>
                  </dl>
                </div>

                {/* Nhóm 4: Chân dung KOC ưu tiên & Bàn giao tài liệu */}
                <div className="rounded-xl border border-line bg-canvas/50 p-4 space-y-3">
                  <h4 className="text-xs font-semibold text-ink uppercase tracking-wide">
                    4. Tiêu chí chọn KOC &amp; Liên kết điều hành (Bảng 3.5)
                  </h4>
                  <dl className="grid gap-3">
                    <Info label="Nhóm KOC ưu tiên của nhãn">
                      <span>{(p.workflowRules.preferredKocNiches || []).join(' · ') || 'Chưa giới hạn'}</span>
                    </Info>
                    <Info label="Tiêu chí duyệt kênh KOC">
                      <span>{p.workflowRules.kocSelectionCriteria || '—'}</span>
                    </Info>
                    {(p.workflowRules.handoverFrom || p.workflowRules.handoverTo) && (
                      <Info label="Nhân sự bàn giao &amp; tiếp nhận (Bảng 3.5)">
                        <span>
                          Bàn giao: <strong>{p.workflowRules.handoverFrom || '—'}</strong> → Tiếp nhận: <strong>{p.workflowRules.handoverTo || primarySpecialist}</strong>
                        </span>
                      </Info>
                    )}
                    <Info label="Liên kết điều hành trực tiếp của nhãn">
                      <div className="flex flex-wrap gap-2 pt-0.5">
                        {p.workflowRules.bookingSheetUrl && (
                          <a
                            href={p.workflowRules.bookingSheetUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded border border-line bg-surface hover:bg-sunken text-xs text-accent font-medium inline-flex items-center gap-1"
                          >
                            <span>Bảng theo dõi Booking</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {p.workflowRules.operationFileUrl && (
                          <a
                            href={p.workflowRules.operationFileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded border border-line bg-surface hover:bg-sunken text-xs text-accent font-medium inline-flex items-center gap-1"
                          >
                            <span>Bảng vận hành &amp; Kịch bản</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {p.workflowRules.canvaBriefUrl && (
                          <a
                            href={p.workflowRules.canvaBriefUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded border border-line bg-surface hover:bg-sunken text-xs text-accent font-medium inline-flex items-center gap-1"
                          >
                            <span>Canva Brief</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {p.workflowRules.handoverFileUrl && (
                          <a
                            href={p.workflowRules.handoverFileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded border border-line bg-surface hover:bg-sunken text-xs text-accent font-medium inline-flex items-center gap-1"
                          >
                            <span>Hồ sơ bàn giao gốc</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {!p.workflowRules.bookingSheetUrl &&
                          !p.workflowRules.operationFileUrl &&
                          !p.workflowRules.canvaBriefUrl &&
                          !p.workflowRules.handoverFileUrl && (
                            <span className="text-xs text-ink-3">Xem trong tab Tài liệu &amp; Hợp đồng</span>
                          )}
                      </div>
                    </Info>
                  </dl>
                </div>
              </div>
            ) : (
              <EmptyState title="Chưa có quy tắc vận hành" />
            )}
          </Panel>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: KHO TÀI LIỆU & HỢP ĐỒNG THƯƠNG HIỆU                            */}
      {/* ===================================================================== */}
      {activeTab === 'FILES' && (
        <div className="space-y-6">
          {/* Khu vực tải tệp thương hiệu */}
          {can.DOCUMENTS && (
            <div
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={e => {
                e.preventDefault();
                e.stopPropagation();
                void handleQuickUploadFiles(e.dataTransfer.files);
              }}
              className="bg-surface border-2 border-dashed border-line-strong rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-ink">
                    Tải tài liệu thương hiệu lên hệ thống
                  </h3>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5 text-xs text-ink-2">
                  <span>Phân loại khi tải:</span>
                  <Select
                    value={uploadCategory}
                    onChange={e => setUploadCategory(e.target.value as BrandDocCategory)}
                    className="w-44"
                  >
                    {(Object.entries(DOC_CATEGORY_LABEL) as Array<[BrandDocCategory, string]>).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </Select>
                </div>
                <Button
                  variant="primary"
                  icon={quickUploading ? Loader2 : Upload}
                  disabled={busy || quickUploading}
                  onClick={() => quickFileInputRef.current?.click()}
                >
                  {quickUploading ? 'Đang tải tệp…' : 'Chọn tệp từ máy'}
                </Button>
                <Button
                  variant="secondary"
                  icon={Plus}
                  disabled={busy || quickUploading}
                  onClick={() => setItem({ list: 'documents', index: -1 })}
                >
                  Dán link / Thêm chi tiết
                </Button>
              </div>
            </div>
          )}

          {/* Danh sách tài liệu thương hiệu */}
          <Panel
            title={`Kho tài liệu & tệp thương hiệu ${row.name}`}
            actions={
              <Button
                size="sm"
                variant="secondary"
                icon={Cloud}
                onClick={() => setR2SetupOpen(true)}
              >
                Cấu hình Cloudflare R2
              </Button>
            }
            flush
          >
            <div className="p-4 border-b border-line">
              <FilterBar
                search={{
                  value: docSearch,
                  onChange: setDocSearch,
                  placeholder: 'Tìm theo tên tài liệu, tên tệp, ghi chú, người tải...',
                }}
                chips={<Chips items={docChips} value={docFilter} onChange={setDocFilter} />}
                resultCount={docSearch.trim() ? filteredDocs.length : undefined}
              />
            </div>

            {filteredDocs.length === 0 ? (
              <EmptyState
                title="Chưa có tệp tài liệu phù hợp"
                description={
                  can.DOCUMENTS
                    ? 'Nhấn “Chọn tệp từ máy” phía trên để tải tệp thương hiệu lên hệ thống.'
                    : 'Nhãn hàng hiện chưa có tài liệu trong danh mục này.'
                }
              />
            ) : (
              <div className="divide-y divide-line">
                {filteredDocs.map(d => {
                  const realIndex = p.documents.findIndex(x => x.id === d.id);
                  const ext = fileExtLabel(d.fileName || d.url) || (d.fileKey ? 'FILE' : 'LINK');
                  const size = formatFileSize(d.fileSize);
                  const downloadUrl = d.fileKey ? `/api/brands/files?key=${encodeURIComponent(d.fileKey)}&download=1` : undefined;
                  const canPreviewInline = Boolean(
                    d.fileKey && (/^(PDF|PNG|JPG|JPEG|WEBP|GIF|SVG)$/i.test(ext) || /^(application\/pdf|image\/)/i.test(d.mimeType || '')),
                  );

                  return (
                    <div key={d.id} className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-canvas/50 transition-colors">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-sunken border border-line flex items-center justify-center text-2xs font-code font-semibold text-ink-2 shrink-0 mt-0.5">
                          {ext.slice(0, 4)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <a href={d.url} target="_blank" rel="noreferrer" className="text-[13.5px] font-medium text-ink hover:text-accent hover:underline break-words">
                              {d.title}
                            </a>
                            <span className="text-2xs text-ink-3">
                              · {DOC_CATEGORY_LABEL[d.category]} · {d.fileKey ? 'Tệp đính kèm' : 'Liên kết ngoài'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-2xs text-ink-3 mt-0.5">
                            {d.fileName && <span className="font-code text-ink-2">{d.fileName}</span>}
                            {size && <span>· {size}</span>}
                            <span>· Tải lên bởi <strong className="text-ink-2 font-medium">{d.addedBy}</strong></span>
                            {d.addedAt && <span>· {dateTime(d.addedAt)}</span>}
                          </div>
                          {d.note && <p className="text-xs text-ink-2 mt-1">{d.note}</p>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        {canPreviewInline && (
                          <Button size="sm" variant="secondary" icon={Eye} onClick={() => setPreviewDoc(d)}>
                            Xem tệp
                          </Button>
                        )}
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noreferrer"
                          className="h-7 px-2.5 rounded-md border border-line-strong bg-surface hover:bg-sunken text-[13px] font-medium text-ink inline-flex items-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-ink-3" />
                          <span>Mở</span>
                        </a>
                        {downloadUrl && (
                          <a
                            href={downloadUrl}
                            className="h-7 px-2.5 rounded-md border border-line-strong bg-surface hover:bg-sunken text-[13px] font-medium text-ink inline-flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5 text-ink-3" />
                            <span>Tải xuống</span>
                          </a>
                        )}
                        {realIndex >= 0 && itemMenu('documents', realIndex)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: HỒ SƠ THÁNG: PLAN & REPORT CỦA THƯƠNG HIỆU & CÁC GIAN HÀNG     */}
      {/* ===================================================================== */}
      {activeTab === 'STORES' && (
        <div className="space-y-6">
          {/* 1. BẢNG LỊCH SỬ HỒ SƠ PLAN & REPORT CỦA THƯƠNG HIỆU QUA CÁC THÁNG */}
          <Panel
            title={`Hồ sơ Tháng (Plan & Report) — ${row.name}`}
            flush
          >
            <DataTable
              columns={brandLedgerColumns}
              rows={monthlyBrandLedger}
              rowKey={r => r.month}
              onRowClick={r => handleMonthChange(r.month)}
            />
          </Panel>

          {/* 2. KẾ HOẠCH & BÁO CÁO 3 VỊ TRÍ GẮN THEO THƯƠNG HIỆU TRONG KỲ THÁNG */}
          {currentBrandReport.brandPlan && (
            <Panel
              title={`Kế hoạch & Báo cáo 3 vị trí gắn theo Thương hiệu — ${currentBrandReport.monthLabel}`}
              actions={
                onDrilldownToPlan && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={FileSpreadsheet}
                    onClick={() => onDrilldownToPlan({ brandName: row.name, month: activeMonth })}
                  >
                    Mở Kế hoạch Tháng ({activeMonth})
                  </Button>
                )
              }
            >
              <div className="grid gap-3 md:grid-cols-3 text-xs">
                <div className="rounded-lg border border-line bg-canvas/60 p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-ink-2 uppercase tracking-wide text-2xs">1. Plan / Strategy</span>
                    <Status tone={currentBrandReport.brandPlan.status === 'APPROVED' || currentBrandReport.brandPlan.status === 'COMPLETED' ? 'positive' : 'info'}>
                      {currentBrandReport.brandPlan.status === 'APPROVED' || currentBrandReport.brandPlan.status === 'COMPLETED' ? 'Đã duyệt' : 'Đang triển khai'}
                    </Status>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-ink-3">Phụ trách:</span>
                    <Person name={currentBrandReport.brandPlan.planStrategyPic} size={18} />
                  </div>
                  <p className="text-ink-2 leading-relaxed">{currentBrandReport.brandPlan.planStrategyPlan.bigIdeaAndKeyMessage}</p>
                </div>

                <div className="rounded-lg border border-line bg-canvas/60 p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-ink-2 uppercase tracking-wide text-2xs">2. Content / Brand Main</span>
                    <span className="text-2xs font-code font-semibold text-positive">
                      {currentBrandReport.brandPlan.contentBrandMainPlan.deliveredCount}/{currentBrandReport.brandPlan.contentBrandMainPlan.heroScriptsTarget} tuyến
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-ink-3">Phụ trách:</span>
                    <Person name={currentBrandReport.brandPlan.contentBrandMainPic} size={18} />
                  </div>
                  <p className="text-ink-2 leading-relaxed">{currentBrandReport.brandPlan.contentBrandMainPlan.focusPillars}</p>
                </div>

                <div className="rounded-lg border border-line bg-canvas/60 p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-ink-2 uppercase tracking-wide text-2xs">3. Key Visual / SIS</span>
                    <span className="text-2xs font-code font-semibold text-positive">
                      {currentBrandReport.brandPlan.keyVisualSisPlan.deliveredCount}/{currentBrandReport.brandPlan.keyVisualSisPlan.kvDirectionCount + currentBrandReport.brandPlan.keyVisualSisPlan.sisBannerPackageCount} bộ KV
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-ink-3">Phụ trách:</span>
                    <Person name={currentBrandReport.brandPlan.keyVisualSisPic} size={18} />
                  </div>
                  <p className="text-ink-2 leading-relaxed">{currentBrandReport.brandPlan.keyVisualSisPlan.designTheme}</p>
                </div>
              </div>
            </Panel>
          )}

          {/* 3. ĐỐI SOÁT PLAN VS REPORT THEO TỪNG GIAN HÀNG TRỰC THUỘC TRONG KỲ */}
          <Panel
            title={`Đối soát Plan & Report theo Gian hàng trực thuộc (${currentBrandReport.monthLabel} · ${brandStores.length} gian hàng)`}
            flush
          >
            {currentBrandReport.storeReports.length === 0 ? (
              <EmptyState
                title="Chưa ghi nhận gian hàng sàn"
                description="Thương hiệu này hiện chưa gắn gian hàng trong danh mục 69 gian hàng B2C."
              />
            ) : (
              <DataTable
                columns={storeMonthlyColumns}
                rows={currentBrandReport.storeReports}
                rowKey={sr => sr.storeId}
                onRowClick={onNavigateToStoreProfile ? sr => onNavigateToStoreProfile(sr.storeName) : undefined}
              />
            )}
          </Panel>

          {/* 4. THỰC TẾ DEAL BOOKING & BÁO CÁO VIDEO CỦA THƯƠNG HIỆU TRONG KỲ */}
          <Panel
            title={`Thực tế Deal Booking & Báo cáo Video (${currentBrandReport.monthLabel} · ${currentBrandReport.bookings.length} deal)`}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                {onDrilldownToListing && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Users}
                    onClick={() => onDrilldownToListing({ brandName: row.name, month: activeMonth })}
                  >
                    Mở Đề xuất KOC
                  </Button>
                )}
                {(onDrilldownToBooking || onOpenBooking) && (
                  <Button
                    size="sm"
                    variant="primary"
                    icon={ArrowUpRight}
                    onClick={() => {
                      if (onDrilldownToBooking) {
                        onDrilldownToBooking({ brandName: row.name, month: activeMonth });
                      } else {
                        onOpenBooking?.();
                      }
                    }}
                  >
                    Mở Quản lý Booking ({currentBrandReport.bookings.length})
                  </Button>
                )}
              </div>
            }
            flush
          >
            {currentBrandReport.bookings.length === 0 ? (
              <EmptyState
                title={`Chưa có deal booking trong ${currentBrandReport.monthLabel}`}
                description="Chưa có booking KOC nào được ghi nhận cho thương hiệu này trong kỳ đang chọn."
              />
            ) : (
              <>
              <DataTable
                columns={brandBookingColumns}
                rows={currentBrandReport.bookings.slice((bookingPage - 1) * BOOKING_PAGE_SIZE, bookingPage * BOOKING_PAGE_SIZE)}
                rowKey={b => b.id}
                onRowClick={b => setInspectingBooking(b)}
              />
              <Pagination
                page={bookingPage}
                pageSize={BOOKING_PAGE_SIZE}
                total={currentBrandReport.bookings.length}
                onPageChange={setBookingPage}
              />
              </>
            )}
          </Panel>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: SẢN PHẨM CHỦ LỰC, GÓC NỘI DUNG & TRẦN THÙ LAO KOC              */}
      {/* ===================================================================== */}
      {activeTab === 'PRODUCTS' && (
        <div className="space-y-6">
          <div className="grid gap-6 items-start lg:grid-cols-[minmax(0,1fr)_360px]">
            <Panel
              title={`Danh mục Sản phẩm chủ lực (${p.products.length} SKU)`}
              actions={addBtn('products')}
              flush
            >
              {p.products.length === 0 ? (
                <EmptyState title="Chưa có sản phẩm chủ lực" />
              ) : (
                <ul className="divide-y divide-line">
                  {p.products.map((x, i) => {
                    const stockMeta = x.sampleStockStatus ? SAMPLE_STOCK_LABEL[x.sampleStockStatus] : SAMPLE_STOCK_LABEL.IN_STOCK;
                    return (
                      <li key={x.id} className="px-4 py-4 grid gap-2.5 text-[13px]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-ink text-sm">{x.name}</span>
                              {x.skuCode && (
                                <span className="text-2xs font-code text-ink-3">
                                  · {x.skuCode}
                                </span>
                              )}
                              {x.size && <span className="text-xs text-ink-3">· {x.size}</span>}
                              {x.priceVnd && <span className="text-xs font-semibold text-ink tabular-nums">· Niêm yết {formatVnd(x.priceVnd)}</span>}
                              {x.dealPriceVnd && <span className="text-xs font-semibold text-accent tabular-nums">· Giá deal {formatVnd(x.dealPriceVnd)}</span>}
                              <Status tone={stockMeta.tone}>{stockMeta.label}</Status>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-ink-3 mt-1">
                              {(x.commissionOrganicPct !== undefined || x.commissionAdsPct !== undefined) && (
                                <span>
                                  Hoa hồng KOC: <strong className="text-ink-2">{x.commissionOrganicPct ?? 10}% tự nhiên</strong>
                                  {x.commissionAdsPct !== undefined ? ` / ${x.commissionAdsPct}% quảng cáo` : ''}
                                </span>
                              )}
                              {x.sampleReturnRule && <span>· {SAMPLE_RETURN_LABEL[x.sampleReturnRule]}</span>}
                              {x.pdpUrl && (
                                <a href={x.pdpUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline inline-flex items-center gap-1">
                                  <span>Xem trang sản phẩm</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              size="sm"
                              variant={selectedAngleProductId === (x.skuCode || x.id) ? 'primary' : 'secondary'}
                              icon={Layers}
                              onClick={() => {
                                const key = x.skuCode || x.id;
                                setSelectedAngleProductId(prev => (prev === key ? 'ALL' : key));
                              }}
                            >
                              {selectedAngleProductId === (x.skuCode || x.id) ? 'Đang lọc góc SP' : 'Góc nội dung'}
                            </Button>
                            {itemMenu('products', i)}
                          </div>
                        </div>
                        {x.usps.length > 0 && (
                          <div className="rounded-lg bg-canvas/70 border border-line p-3">
                            <span className="block text-2xs font-medium text-ink-3 mb-1">Điểm nổi bật KOC cần nhắc:</span>
                            <ul className="list-disc pl-5 text-ink-2 grid gap-1">
                              {x.usps.map((u, k) => <li key={k}>{u}</li>)}
                            </ul>
                          </div>
                        )}
                        <dl className="grid gap-3 sm:grid-cols-2">
                          {x.mechanism && <Info label="Cơ chế tác động &amp; góc quay">{x.mechanism}</Info>}
                          {x.ingredients.length > 0 && <Info label="Thành phần chính">{x.ingredients.join('; ')}</Info>}
                          {x.targetUser && <Info label="Đối tượng phù hợp">{x.targetUser}</Info>}
                          {x.contraindications && <Info label="Chống chỉ định / Lưu ý">{x.contraindications}</Info>}
                        </dl>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            {!hideInternalRatecard && (
              <Panel
                title={SECTION_LABEL.RATECARD}
                actions={editBtn('RATECARD', () => setDialog('RATECARD'))}
              >
                {p.ratecard.some(r => r.maxBudget) ? (
                  <div className="space-y-3">
                    {(() => {
                      const maxVal = Math.max(...p.ratecard.map(r => r.maxBudget || 0), 1);
                      return p.ratecard.map(r => {
                        const pct = r.maxBudget ? Math.max(6, Math.round((r.maxBudget / maxVal) * 100)) : 0;
                        return (
                          <div key={r.grade} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-code font-semibold text-ink">{r.grade}</span>
                              <span className="tabular-nums font-medium text-ink">
                                {r.maxBudget ? formatVnd(r.maxBudget) : <span className="text-ink-3">Không đặt trần</span>}
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-sunken overflow-hidden">
                              <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                ) : (
                  <EmptyState title="Chưa đặt trần thù lao" description="Trưởng phòng B2C có thể cấu hình mức trần thù lao KOC cho nhãn hàng này." />
                )}
              </Panel>
            )}
          </div>

          <Panel
            title={`Góc nội dung & Ma trận kịch bản theo SKU — ${row.name}`}
            actions={
              selectedAngleProductId !== 'ALL' ? (
                <Button size="sm" variant="ghost" onClick={() => setSelectedAngleProductId('ALL')}>
                  Bỏ lọc SKU ({selectedAngleProductId})
                </Button>
              ) : undefined
            }
          >
            <ContentAngleSetupView
              currentUser={currentUser}
              brandName={row.name}
              brandProducts={p.products}
              brandStores={brandStores}
              initialProductId={selectedAngleProductId}
              embedded
              onNotify={onNotify}
              onSelectAngleForBooking={(angle) => {
                onNotify?.(`Đã chọn góc kịch bản "${angle.name}" cho Booking`, 'success');
                onOpenBooking?.();
              }}
            />
          </Panel>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: TỪ CẤM, PHÁP LÝ & CÂU HỎI KHÓ                                  */}
      {/* ===================================================================== */}
      {activeTab === 'COMPLIANCE' && (
        <div className="space-y-6">
          <Panel
            title={SECTION_LABEL.CONTENT_RULES}
            actions={editBtn('CONTENT_RULES', () => setDialog('CONTENT_RULES'), p.contentRules ? 'Sửa quy chuẩn' : 'Thêm quy chuẩn')}
            flush
          >
            {!p.contentRules ||
            (!p.contentRules.banned.length &&
              !p.contentRules.preferred.length &&
              !p.contentRules.visualDo.length &&
              !p.contentRules.visualDont.length) ? (
              <EmptyState title="Chưa có quy chuẩn nội dung" description="Thiết lập từ khóa cấm và quy chuẩn hình ảnh." />
            ) : (
              <div className="divide-y divide-line text-[13px]">
                <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-line">
                  <div className="p-4 grid gap-3 content-start">
                    <h4 className="text-xs font-semibold text-critical">Từ khóa cấm ({p.contentRules.banned.length})</h4>
                    {p.contentRules.banned.map(b => (
                      <div key={b.id} className="rounded-lg bg-canvas border border-line p-3 grid gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-critical">“{b.phrase}”</span>
                          {b.replacement && <span className="text-ink-2">→ Thay bằng: <strong className="text-positive">“{b.replacement}”</strong></span>}
                        </div>
                        {b.reason && <p className="text-2xs text-ink-3">{b.reason}</p>}
                      </div>
                    ))}
                    {p.contentRules.visualDont.length > 0 && (
                      <div className="pt-2">
                        <h4 className="text-xs font-semibold text-ink mb-1.5">Hình ảnh không được dùng</h4>
                        <ul className="list-disc pl-5 text-ink-2 grid gap-1">
                          {p.contentRules.visualDont.map((x, k) => <li key={k}>{x}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="p-4 grid gap-3 content-start">
                    <h4 className="text-xs font-semibold text-positive">Cụm từ nên dùng ({p.contentRules.preferred.length})</h4>
                    {p.contentRules.preferred.map(x => (
                      <div key={x.id} className="rounded-lg bg-canvas border border-line p-3 grid gap-1">
                        <span className="font-semibold text-positive">“{x.phrase}”</span>
                        {x.note && <p className="text-2xs text-ink-3">{x.note}</p>}
                      </div>
                    ))}
                    {p.contentRules.visualDo.length > 0 && (
                      <div className="pt-2">
                        <h4 className="text-xs font-semibold text-ink mb-1.5">Hình ảnh khuyến khích trong video</h4>
                        <ul className="list-disc pl-5 text-ink-2 grid gap-1">
                          {p.contentRules.visualDo.map((x, k) => <li key={k}>{x}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                {((p.contentRules.mandatoryHashtags?.length || 0) > 0 || p.contentRules.defaultCta || p.contentRules.videoDurationRule) && (
                  <div className="p-4 bg-canvas/40 grid gap-3 sm:grid-cols-3 text-xs">
                    <Info label="Hashtag & gắn thẻ bắt buộc">
                      {[...(p.contentRules.mandatoryHashtags || []), ...(p.contentRules.mandatoryMentions || [])].join(' ')}
                    </Info>
                    <Info label="Thời lượng & cấu trúc clip">
                      {p.contentRules.videoDurationRule}
                    </Info>
                    <Info label="Câu điều hướng mua hàng (CTA)">
                      {p.contentRules.defaultCta}
                    </Info>
                  </div>
                )}
              </div>
            )}
          </Panel>

          <Panel
            title={`${SECTION_LABEL.LEGAL} (${p.legal.length})`}
            actions={addBtn('legal')}
            flush
          >
            {p.legal.length === 0 ? (
              <EmptyState title="Chưa có văn bản pháp lý" description="Tải lên bản scan phiếu công bố hoặc giấy xác nhận quảng cáo." />
            ) : (
              <ul className="divide-y divide-line">
                {p.legal.map((l, i) => {
                  const ext = fileExtLabel(l.fileName || l.url);
                  const size = formatFileSize(l.fileSize);
                  const downloadUrl = l.fileKey ? `/api/brands/files?key=${encodeURIComponent(l.fileKey)}&download=1` : undefined;
                  return (
                    <li key={l.id} className="px-4 py-3.5 grid gap-1.5 text-[13px]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-ink">{l.title}</span>
                          {l.validUntil && isExpired(l.validUntil) ? (
                            <Status tone="critical">Hết hiệu lực</Status>
                          ) : (
                            <Status tone="positive">Còn hiệu lực</Status>
                          )}
                          {l.fileKey && (
                            <span className="text-2xs text-ink-3 font-code">
                              · {[ext || 'FILE', size].filter(Boolean).join(' · ')}
                            </span>
                          )}
                        </div>
                        {itemMenu('legal', i)}
                      </div>
                      <p className="text-2xs text-ink-3 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                        <span>{[l.docNumber && `Số văn bản: ${l.docNumber}`, l.authority && `Cơ quan cấp: ${l.authority}`, l.issueDate && `Ngày cấp: ${l.issueDate}`, l.validUntil && `Hiệu lực đến: ${l.validUntil}`].filter(Boolean).join(' · ')}</span>
                        {l.url && (
                          <>
                            <span>·</span>
                            <a href={l.url} target="_blank" rel="noreferrer" className="text-accent hover:underline inline-flex items-center gap-1">
                              <span>Xem bản scan</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </>
                        )}
                        {downloadUrl && (
                          <>
                            <span>·</span>
                            <a href={downloadUrl} className="text-accent hover:underline inline-flex items-center gap-1">
                              <span>Tải xuống</span>
                              <Download className="w-3 h-3" />
                            </a>
                          </>
                        )}
                      </p>
                      {l.disclaimer && <p className="text-xs text-ink-2">Câu cảnh báo bắt buộc trên video: “{l.disclaimer}”</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel
            title={`${SECTION_LABEL.FAQS} (${p.faqs.length})`}
            actions={addBtn('faqs')}
            flush
          >
            {p.faqs.length === 0 ? (
              <EmptyState title="Chưa có câu hỏi khó" description="Thêm các tình huống hỏi đáp mẫu cho KOC." />
            ) : (
              <ul className="divide-y divide-line">
                {p.faqs.map((f, i) => (
                  <li key={f.id} className="px-4 py-3.5 grid gap-1.5 text-[13px]">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-ink">{f.question}</p>
                      {itemMenu('faqs', i)}
                    </div>
                    <p className="text-ink-2 whitespace-pre-line">{f.answer}</p>
                    {(f.mention.length > 0 || f.avoid.length > 0) && (
                      <p className="text-2xs text-ink-3">
                        {f.mention.length > 0 && <>Nên nhắc: <span className="text-positive">{f.mention.join('; ')}</span></>}
                        {f.mention.length > 0 && f.avoid.length > 0 && ' · '}
                        {f.avoid.length > 0 && <>Không nói: <span className="text-critical">{f.avoid.join('; ')}</span></>}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {/* HỘP THOẠI XEM CHI TIẾT DEAL BOOKING & BÁO CÁO VIDEO (DRILL-DOWN) */}
      <Modal
        open={Boolean(inspectingBooking)}
        onClose={() => setInspectingBooking(null)}
        title={inspectingBooking ? `Chi tiết Booking & Báo cáo Video — ${inspectingBooking.kocName}` : ''}
        size="lg"
        footer={
          inspectingBooking ? (
            <>
              <Button variant="ghost" onClick={() => setInspectingBooking(null)}>
                Đóng
              </Button>
              {onNavigateToStoreProfile && (
                <Button
                  variant="secondary"
                  icon={Store}
                  onClick={() => {
                    const targetStore = inspectingBooking.storeName;
                    setInspectingBooking(null);
                    onNavigateToStoreProfile(targetStore);
                  }}
                >
                  Mở Hồ sơ gian hàng
                </Button>
              )}
              {inspectingBooking.sourceDeal && onSelectDealForContract && (
                <Button
                  variant="secondary"
                  icon={FileSignature}
                  onClick={() => {
                    const deal = inspectingBooking.sourceDeal!;
                    setInspectingBooking(null);
                    onSelectDealForContract(deal);
                  }}
                >
                  Soạn / Xem hợp đồng
                </Button>
              )}
              {(onDrilldownToBooking || onOpenBooking) && (
                <Button
                  variant="primary"
                  icon={ArrowUpRight}
                  onClick={() => {
                    const target = inspectingBooking;
                    setInspectingBooking(null);
                    if (onDrilldownToBooking) {
                      onDrilldownToBooking({
                        storeName: target.storeName,
                        brandName: row.name,
                        dealCode: target.dealCode,
                        month: target.month,
                      });
                    } else {
                      onOpenBooking?.();
                    }
                  }}
                >
                  Mở trong Quản lý Booking
                </Button>
              )}
            </>
          ) : undefined
        }
      >
        {inspectingBooking && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-lg border border-line bg-canvas p-3">
                <span className="block text-2xs text-ink-3">Chi phí Net</span>
                <span className="mt-1 block text-sm font-semibold text-ink tabular-nums">
                  {inspectingBooking.costNet > 0 ? formatVnd(inspectingBooking.costNet) : '0 đ (FOC)'}
                </span>
              </div>
              <div className="rounded-lg border border-line bg-canvas p-3">
                <span className="block text-2xs text-ink-3">Lượt xem thực tế</span>
                <span className="mt-1 block text-sm font-semibold text-ink tabular-nums">
                  {formatNumber(inspectingBooking.views)}
                </span>
              </div>
              <div className="rounded-lg border border-line bg-canvas p-3">
                <span className="block text-2xs text-ink-3">Đơn hàng quy đổi</span>
                <span className="mt-1 block text-sm font-semibold text-ink tabular-nums">
                  {formatNumber(inspectingBooking.orders)} đơn
                </span>
              </div>
              <div className="rounded-lg border border-line bg-canvas p-3">
                <span className="block text-2xs text-ink-3">Doanh thu (GMV) & ROAS</span>
                <span className="mt-1 block text-sm font-semibold text-accent tabular-nums">
                  {formatVndShort(inspectingBooking.revenue)} ({inspectingBooking.roas}x)
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-line bg-surface p-3.5 space-y-2.5">
              <div className="grid sm:grid-cols-2 gap-2.5">
                <div>
                  <span className="text-2xs text-ink-3 block">Creator / KOC & Hạng</span>
                  <span className="font-semibold text-ink">
                    {inspectingBooking.kocName} ({inspectingBooking.kocHandle}) · {inspectingBooking.tierLabel}
                  </span>
                </div>
                <div>
                  <span className="text-2xs text-ink-3 block">Gian hàng & Nhân sự phụ trách</span>
                  <span className="font-medium text-ink">
                    {inspectingBooking.storeName} · PIC: {inspectingBooking.picName}
                  </span>
                </div>
                <div>
                  <span className="text-2xs text-ink-3 block">Trạng thái thực thi</span>
                  <span className="font-medium text-ink">
                    {inspectingBooking.statusLabel} {inspectingBooking.airDate ? `(${inspectingBooking.airDate})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-2xs text-ink-3 block">Mã quảng cáo (Ads Code)</span>
                  <span className="font-code text-ink">{inspectingBooking.adsCode || 'Chưa cấp mã'}</span>
                </div>
              </div>
              <div>
                <span className="text-2xs text-ink-3 block">Sản phẩm & Kịch bản triển khai</span>
                <p className="text-ink-2 mt-0.5">{inspectingBooking.campaignTitle}</p>
              </div>
              {inspectingBooking.videoLink && (
                <div className="pt-2 border-t border-line flex items-center justify-between">
                  <span className="text-2xs text-ink-3">Link video nghiệm thu trên sàn:</span>
                  <a
                    href={inspectingBooking.videoLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent hover:underline font-medium inline-flex items-center gap-1"
                  >
                    <span>Mở xem clip gốc</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* HỘP THOẠI XEM TRƯỚC TỆP TRỰC TIẾP */}
      {previewDoc && (
        <Modal
          open={Boolean(previewDoc)}
          onClose={() => setPreviewDoc(null)}
          title={previewDoc.title}
          size="lg"
          footer={
            <>
              <Button variant="ghost" onClick={() => setPreviewDoc(null)}>Đóng</Button>
              {previewDoc.fileKey && (
                <a
                  href={`/api/brands/files?key=${encodeURIComponent(previewDoc.fileKey)}&download=1`}
                  className="h-[34px] px-3.5 rounded-md bg-primary text-white hover:bg-primary-hover text-[13.5px] font-medium inline-flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải xuống</span>
                </a>
              )}
            </>
          }
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap text-2xs text-ink-3 pb-2 border-b border-line">
              <span>{DOC_CATEGORY_LABEL[previewDoc.category]}</span>
              {previewDoc.fileName && <span>·</span>}
              {previewDoc.fileName && <span className="font-mono text-ink">{previewDoc.fileName}</span>}
              {previewDoc.fileSize && <span>·</span>}
              {previewDoc.fileSize && <span>{formatFileSize(previewDoc.fileSize)}</span>}
            </div>
            <div className="rounded-lg border border-line bg-canvas overflow-hidden min-h-[420px] flex items-center justify-center">
            {/^(image\/|\.(png|jpg|jpeg|webp|gif|svg)$)/i.test(previewDoc.mimeType || previewDoc.fileName || '') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewDoc.url} alt={previewDoc.title} className="max-h-[70vh] w-auto object-contain" />
            ) : (
              <iframe src={previewDoc.url} title={previewDoc.title} className="w-full h-[65vh] border-0" />
            )}
            </div>
          </div>
        </Modal>
      )}

      {/* CÁC HỘP THOẠI CHỈNH SỬA */}
      {dialog === 'POSITIONING' && <PositioningDialog open value={p.positioning} busy={busy} onClose={() => setDialog(null)} onSave={v => saveDialog('POSITIONING', v)} />}
      {dialog === 'ENTITY' && <EntityDialog open value={p.entity} fallbackCompany={real(m?.companyName)} busy={busy} onClose={() => setDialog(null)} onSave={v => saveDialog('ENTITY', v)} />}
      {dialog === 'RATECARD' && <RatecardDialog open value={p.ratecard} busy={busy} onClose={() => setDialog(null)} onSave={v => saveDialog('RATECARD', { ratecard: v })} />}
      {dialog === 'CONTENT_RULES' && <ContentRulesDialog open value={p.contentRules} busy={busy} onClose={() => setDialog(null)} onSave={v => saveDialog('CONTENT_RULES', v)} />}
      {dialog === 'WORKFLOW_RULES' && <WorkflowRulesDialog open value={p.workflowRules} busy={busy} onClose={() => setDialog(null)} onSave={v => saveDialog('WORKFLOW_RULES', v)} />}

      {item && (() => {
        const meta = LIST_META[item.list];
        const list = listOf(item.list);
        const current = item.index >= 0 ? list[item.index] : item.list === 'documents' ? { category: uploadCategory || 'GUIDELINE' } : undefined;
        const uploadContext = item.list === 'documents' || item.list === 'legal'
          ? { brandName: row.name, section: meta.section as 'DOCUMENTS' | 'LEGAL' }
          : undefined;
        return (
          <ItemDialog
            open
            title={item.index >= 0 ? `Sửa ${meta.noun}` : `Thêm ${meta.noun}`}
            fields={meta.fields}
            item={current}
            busy={busy}
            uploadContext={uploadContext}
            onClose={() => setItem(null)}
            onSave={async next => {
              const updated = item.index >= 0 ? list.map((x, k) => (k === item.index ? next : x)) : [...list, next];
              const name = String(next.name || next.question || next.title || '');
              if (await saveList(item.list, updated, `${item.index >= 0 ? 'Sửa' : 'Thêm'} ${meta.noun}: ${name}`)) setItem(null);
            }}
          />
        );
      })()}

      {editingStore && onUpdateStore && (
        <StoreEditDialog
          open={!!editingStore}
          store={editingStore}
          onClose={() => setEditingStore(null)}
          onOpenMonthlyPlan={
            onDrilldownToPlan
              ? () =>
                  onDrilldownToPlan({
                    storeId: editingStore.id,
                    storeName: editingStore.storeName,
                    brandName: row.name,
                    month: activeMonth,
                  })
              : undefined
          }
          onSave={updated => {
            onUpdateStore(updated);
            setEditingStore(null);
            onNotify?.(`Đã cập nhật thông số tĩnh của gian hàng "${updated.storeName}" — đồng bộ toàn hệ thống.`, 'success');
          }}
        />
      )}

      <ConfirmDialog
        open={!!removing}
        title={removing ? `Xóa ${LIST_META[removing.list].noun}` : ''}
        description="Mục này bị xóa khỏi hồ sơ. Lịch sử vẫn ghi lại thao tác."
        tone="danger"
        confirmLabel="Xóa"
        onConfirm={() => {
          if (!removing) return;
          const list = listOf(removing.list);
          const gone = list[removing.index];
          const fileKey = typeof gone?.fileKey === 'string' ? gone.fileKey : '';
          if (fileKey) {
            fetch(`/api/brands/files?key=${encodeURIComponent(fileKey)}`, { method: 'DELETE' }).catch(() => undefined);
          }
          saveList(removing.list, list.filter((_, k) => k !== removing.index), `Xóa ${LIST_META[removing.list].noun}: ${String(gone?.name || gone?.question || gone?.title || '')}`);
        }}
        onOpenChange={o => !o && setRemoving(null)}
      />

      <CloudflareR2SetupModal
        open={r2SetupOpen}
        onClose={() => setR2SetupOpen(false)}
        onNotify={onNotify}
      />
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-2xs text-ink-3">{label}</dt>
      <dd className="text-[13px] text-ink break-words">{children || <span className="text-ink-3">—</span>}</dd>
    </div>
  );
}

function Aside({ title, action, children }: { title: string; action?: React.ReactNode; note?: string; children: React.ReactNode }) {
  return (
    <section className="px-4 py-4">
      <div className="flex items-center justify-between gap-2 min-h-7 mb-2">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function History({ profile }: { profile: BrandProfile }) {
  const [all, setAll] = useState(false);
  const items = all ? profile.history : profile.history.slice(0, 5);
  return (
    <Aside title="Lịch sử cập nhật">
      {profile.history.length === 0 ? <p className="text-[13px] text-ink-3">Chưa có thay đổi.</p> : (
        <ol className="grid gap-2.5">
          {items.map((h, i) => (
            <li key={i} className="grid gap-0.5">
              <span className="text-[13px] text-ink">{h.summary}</span>
              <span className="text-2xs text-ink-3">{h.actorName} · {dateTime(h.at)}</span>
            </li>
          ))}
          {profile.history.length > 5 && (
            <li>
              <button type="button" className="text-[13px] text-accent hover:underline" onClick={() => setAll(v => !v)}>
                {all ? 'Thu gọn' : `Xem thêm ${profile.history.length - 5}`}
              </button>
            </li>
          )}
        </ol>
      )}
    </Aside>
  );
}
