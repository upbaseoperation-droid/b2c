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
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  FileText,
  FolderOpen,
  Loader2,
  Pencil,
  Plus,
  Store,
  Upload,
} from 'lucide-react';
import type { BookingDealItem, StorePortfolioItem } from '../../lib/types';
import type { BrandDocCategory, BrandDocument, BrandPermissions, BrandProfile, BrandSection } from '../../lib/brands/types';
import { SECTION_LABEL } from '../../lib/brands/types';
import { formatNumber, formatPercent, formatVnd, formatVndShort } from '../../lib/format';
import { INITIAL_STORE_PORTFOLIOS } from '../../lib/mockData';
import {
  ActionMenu,
  Avatar,
  Button,
  ChannelTag,
  Chips,
  ConfirmDialog,
  DataTable,
  EmptyState,
  FilterBar,
  Modal,
  Panel,
  Person,
  SectionHeader,
  Select,
  Stat,
  StatRow,
  Status,
  Tabs,
  channelOf,
  sharedTo,
  type Column,
} from '../ui';
import { ContentRulesDialog, EntityDialog, ItemDialog, PositioningDialog, RatecardDialog, type ItemField } from './BrandEditors';
import {
  DOC_CATEGORY_LABEL,
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
type BrandDetailTab = 'OVERVIEW' | 'FILES' | 'STORES' | 'PRODUCTS' | 'COMPLIANCE';

const PRODUCT_FIELDS: ItemField[] = [
  { key: 'name', label: 'Tên sản phẩm', required: true, wide: true },
  { key: 'skuCode', label: 'Mã SKU' },
  { key: 'size', label: 'Quy cách', hint: 'Ví dụ 120g, 500ml, 60 viên.' },
  { key: 'priceVnd', label: 'Giá niêm yết', kind: 'money' },
  { key: 'pdpUrl', label: 'Link trang sản phẩm', kind: 'url' },
  { key: 'usps', label: 'Điểm nổi bật KOC cần nói', kind: 'lines' },
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
  busy,
  onBack,
  nav,
  onSave,
  onOpenBooking,
  onNavigateToStoreProfile,
  onNotify,
}: {
  row: BrandRow;
  can: BrandPermissions;
  deals: BookingDealItem[];
  stores?: StorePortfolioItem[];
  busy: boolean;
  onBack: () => void;
  nav?: { onPrev?: () => void; onNext?: () => void; position?: number; total?: number };
  onSave: Save;
  onOpenBooking?: () => void;
  onNavigateToStoreProfile?: (storeName: string) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}) {
  const p = row.profile;
  const m = row.master;

  const [activeTab, setActiveTab] = useState<BrandDetailTab>('OVERVIEW');
  const [dialog, setDialog] = useState<null | 'POSITIONING' | 'ENTITY' | 'RATECARD' | 'CONTENT_RULES'>(null);
  const [item, setItem] = useState<null | { list: ListKey; index: number }>(null);
  const [removing, setRemoving] = useState<null | { list: ListKey; index: number }>(null);
  const [showTaxCode, setShowTaxCode] = useState(false);

  // Kho tệp R2 state
  const [quickUploading, setQuickUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<BrandDocCategory>('GUIDELINE');
  const [docFilter, setDocFilter] = useState<'ALL' | BrandDocCategory>('ALL');
  const [docSearch, setDocSearch] = useState('');
  const [previewDoc, setPreviewDoc] = useState<BrandDocument | null>(null);
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
      growthPic: m?.growthPic,
      budgetNet: Math.round((m?.planBudget || m?.monthlyBudget || 0) / Math.max(1, m?.stores?.length || 1)),
    })) as StorePortfolioItem[];
  }, [stores, row.name, m]);

  // Các deal booking của thương hiệu
  const brandDeals = useMemo(() => {
    const bLower = row.name.trim().toLowerCase();
    const storeNames = new Set(brandStores.map(s => s.storeName.trim().toLowerCase()));
    return deals.filter(
      d => d.brandName.trim().toLowerCase() === bLower || (d.storeName && storeNames.has(d.storeName.trim().toLowerCase())),
    );
  }, [deals, row.name, brandStores]);

  const openDeals = useMemo(
    () => brandDeals.filter(d => !['COMPLETED', 'CANCELLED', 'FINAL_PAID'].includes(d.status)),
    [brandDeals],
  );

  // Tính toán ngân sách Net tổng hợp từ các gian hàng hoặc Brand Master
  const totalBudgetNet = useMemo(() => {
    const fromStores = brandStores.reduce((s, st) => s + (st.budgetNet ?? st.monthlyBudget ?? 0), 0);
    return fromStores > 0 ? fromStores : (m?.planBudget || m?.monthlyBudget || 0);
  }, [brandStores, m]);

  const totalSpentNet = useMemo(() => {
    const fromStores = brandStores.reduce((s, st) => s + (st.actualSpentNet ?? 0), 0);
    const fromDeals = brandDeals.reduce((s, d) => s + (d.totalValue || 0), 0);
    return Math.max(fromStores, fromDeals);
  }, [brandStores, brandDeals]);

  const totalTargetGmv = useMemo(() => {
    const fromStores = brandStores.reduce((s, st) => s + (st.monthlyTargetGmv ?? 0), 0);
    return fromStores > 0 ? fromStores : (m?.targetGmv || 0);
  }, [brandStores, m]);

  const totalTargetVideos = useMemo(() => {
    const fromStores = brandStores.reduce(
      (s, st) => s + (st.targetAffiliateContents || 0) + (st.targetSelfChannelContents || 0) + (st.targetFocVideos || 0),
      0,
    );
    return fromStores > 0 ? fromStores : (m?.targetVideos || 0);
  }, [brandStores, m]);

  const isOverbudget = totalBudgetNet > 0 && totalSpentNet > totalBudgetNet;
  const isUnbudgetedSpend = totalBudgetNet === 0 && totalSpentNet > 0;
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
  const growthPicName = real(m?.growthPic) || brandStores.find(s => s.growthPic)?.growthPic || '';

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

  const storeColumns: Column<StorePortfolioItem>[] = [
    {
      key: 'storeName',
      header: 'Gian hàng sàn',
      width: 240,
      render: s => (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-ink truncate">{s.storeName}</span>
            <ChannelTag channel={channelOf(s.platform)} />
          </div>
          <span className="block text-2xs text-ink-3 font-code mt-0.5">{s.storeOperationId || s.id}</span>
        </div>
      ),
    },
    {
      key: 'pic',
      header: 'Phụ trách B2C',
      width: 190,
      render: s => {
        const pic = s.b2cOwnerName || s.primaryPic || (s.b2cOwners && s.b2cOwners[0]) || primarySpecialist;
        return (
          <div className="leading-tight">
            <Person name={pic} size={18} />
            <span className="block text-2xs text-ink-3 mt-0.5">
              {s.hasBookingLeader && s.bookingLeader ? `TN: ${s.bookingLeader}` : 'Trực tiếp Trưởng phòng'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'budgetNet',
      header: 'Hạn mức Net',
      align: 'right',
      width: 130,
      render: s => {
        const bNet = s.budgetNet ?? s.monthlyBudget ?? 0;
        return <span className="tabular-nums font-medium text-ink">{bNet > 0 ? formatVnd(bNet) : '0 đ'}</span>;
      },
    },
    {
      key: 'spent',
      header: 'Đã duyệt chi',
      align: 'right',
      width: 130,
      render: s => {
        const bNet = s.budgetNet ?? s.monthlyBudget ?? 0;
        const sDeals = brandDeals.filter(d => d.storeName?.toLowerCase() === s.storeName.toLowerCase());
        const spent = s.actualSpentNet ?? sDeals.reduce((sum, d) => sum + (d.totalValue || 0), 0);
        const over = (bNet > 0 && spent > bNet) || (bNet === 0 && spent > 0);
        return <span className={`tabular-nums ${over ? 'text-critical font-medium' : 'text-ink'}`}>{formatVnd(spent)}</span>;
      },
    },
    {
      key: 'quota',
      header: 'Chỉ tiêu video',
      align: 'right',
      width: 130,
      render: s => {
        const aff = s.targetAffiliateContents || 0;
        const self = s.targetSelfChannelContents || 0;
        const foc = s.targetFocVideos || 0;
        return (
          <div className="leading-tight text-right">
            <span className="block tabular-nums font-medium text-ink">{formatNumber(aff + self + foc)} video</span>
            <span className="block text-2xs text-ink-3">Aff {aff} · Kênh {self} · FOC {foc}</span>
          </div>
        );
      },
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      width: 100,
      render: s =>
        onNavigateToStoreProfile ? (
          <Button size="sm" variant="ghost" onClick={() => onNavigateToStoreProfile(s.storeName)}>
            Mở gian hàng
          </Button>
        ) : null,
    },
  ];

  const dealColumns: Column<BookingDealItem>[] = [
    {
      key: 'koc',
      header: 'Creator / KOC',
      render: d => (
        <div className="min-w-0">
          <Person name={d.kocStageName} size={20} />
          {d.campaignTitle && <span className="block truncate text-2xs text-ink-3 mt-0.5">{d.campaignTitle}</span>}
        </div>
      ),
    },
    {
      key: 'store',
      header: 'Gian hàng',
      width: 180,
      render: d => <span className="text-xs text-ink-2 truncate block max-w-[170px]">{d.storeName || row.name}</span>,
    },
    {
      key: 'cost',
      header: 'Chi phí Net',
      align: 'right',
      width: 130,
      render: d => <span className="tabular-nums font-medium text-ink">{formatVnd(d.totalValue || 0)}</span>,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: 120,
      render: d => {
        const isDone = d.status === 'COMPLETED' || d.status === 'FINAL_PAID';
        const isPending = d.status === 'DRAFT' || d.status === 'SCRIPT_PENDING' || d.status === 'TERMS_AGREED';
        return isDone ? <Status tone="positive">Hoàn tất</Status> : isPending ? <Status tone="warning">Chờ duyệt</Status> : <Status tone="info">Đang chạy</Status>;
      },
    },
    {
      key: 'video',
      header: 'Video',
      align: 'right',
      width: 100,
      render: d => {
        const link = d.videoUrl || d.tiktokVideoUrl || '';
        return link ? (
          <a href={link} target="_blank" rel="noreferrer" className="text-accent hover:underline inline-flex items-center gap-1 text-2xs font-medium">
            <span>Xem clip</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="text-2xs text-ink-3">Chưa lên bài</span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. THANH ĐIỀU HƯỚNG & THAO TÁC NHANH */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={onBack} className="-ml-2.5">
            Danh bạ thương hiệu
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

        <div className="flex items-center gap-2">
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
              {quickUploading ? 'Đang tải lên R2…' : 'Tải tệp thương hiệu'}
            </Button>
          )}
          <Button size="sm" variant="secondary" icon={FolderOpen} onClick={() => setActiveTab('FILES')}>
            Kho tệp R2 ({p.documents.length})
          </Button>
          {onOpenBooking && (
            <Button size="sm" variant="primary" onClick={onOpenBooking}>
              Quản lý Booking ({openDeals.length})
            </Button>
          )}
        </div>
      </div>

      {/* 2. ĐỊNH DANH THƯƠNG HIỆU */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          {/* Tên chuyển cảnh khớp với hàng trong BrandProfilesView */}
          <span className="shrink-0 inline-flex" style={sharedTo('brand-avatar')}><Avatar name={row.name} size={44} /></span>
          <div className="min-w-0 grid gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-ink" style={sharedTo('brand-title')}>{row.name}</h2>
              {m?.code && (
                <span className="px-1.5 py-0.5 rounded bg-sunken border border-line text-2xs font-code text-ink-2">
                  {m.code}
                </span>
              )}
              <Status tone={status.tone}>{status.label}</Status>
              <span className="text-[13px] text-ink-3 tabular-nums">{row.done}/{row.total} mục hồ sơ</span>
              {(m?.platforms || []).map(pl => (
                <ChannelTag key={pl} channel={channelOf(pl)} />
              ))}
              {isOverbudget && <Status tone="critical">Vượt hạn mức Net</Status>}
              {isUnbudgetedSpend && <Status tone="warning">Chi ngoài kế hoạch (0đ)</Status>}
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

      {/* 3. THANH CHỈ SỐ VẬN HÀNH THƯƠNG HIỆU */}
      <StatRow>
        <Stat
          label="Tổng hạn mức Order Net"
          value={formatVndShort(totalBudgetNet)}
          note={`Phân bổ cho ${brandStores.length} gian hàng · Chỉ tiêu ${formatNumber(totalTargetVideos)} video`}
        />
        <Stat
          label="Thực tế đã duyệt chi"
          value={formatVndShort(totalSpentNet)}
          progress={{ value: totalSpentNet, max: totalBudgetNet || 1, invert: totalSpentNet > totalBudgetNet }}
          note={
            totalBudgetNet > 0
              ? totalSpentNet > totalBudgetNet
                ? `Vượt trần ${formatVndShort(totalSpentNet - totalBudgetNet)}`
                : `Đã giải ngân ${formatPercent(totalSpentNet / totalBudgetNet, 0)} · ${brandDeals.length} deal`
              : totalSpentNet > 0
                ? 'Cảnh báo: Chi khi hạn mức Order 0 đ'
                : 'Chế độ gửi mẫu FOC 0 đ'
          }
          tone={isOverbudget ? 'critical' : isUnbudgetedSpend ? 'warning' : 'positive'}
        />
        <Stat
          label="Mục tiêu GMV tháng"
          value={totalTargetGmv > 0 ? formatVndShort(totalTargetGmv) : 'Theo sàn'}
          note={`${brandStores.length} gian hàng (${(m?.platforms || ['TikTok Shop']).join(', ')})`}
        />
        <Stat
          label="Kho tệp R2 & Pháp lý"
          value={`${p.documents.length} tệp`}
          note={
            expiredLegalCount > 0
              ? `${expiredLegalCount} văn bản pháp lý hết hiệu lực`
              : `${p.legal.length} văn bản pháp lý · ${p.products.length} SKU chủ lực`
          }
          tone={expiredLegalCount > 0 ? 'critical' : r2FilesCount > 0 ? 'positive' : undefined}
        />
      </StatRow>

      {/* 4. CÁC PHÂN KHU NGHIỆP VỤ */}
      <Tabs<BrandDetailTab>
        value={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'OVERVIEW', label: 'Tổng quan & Định vị', count: `${row.done}/${row.total}` },
          { key: 'FILES', label: 'Kho tệp & Tài liệu (R2)', count: p.documents.length },
          { key: 'STORES', label: 'Gian hàng & Booking', count: brandStores.length },
          { key: 'PRODUCTS', label: 'Sản phẩm & Trần thù lao', count: p.products.length },
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
            {/* Định vị & thông điệp */}
            <Panel
              title={SECTION_LABEL.POSITIONING}
              description="Khẩu hiệu, giọng văn và tệp khách hàng mục tiêu để KOC bám sát khi lên kịch bản"
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
                </div>
              ) : (
                <EmptyState title="Chưa có định vị thương hiệu" description="Thêm khẩu hiệu, giọng văn và chân dung khách hàng để KOC viết kịch bản." />
              )}
            </Panel>

            {/* Sản phẩm chủ lực */}
            <Panel
              title={SECTION_LABEL.PRODUCTS}
              description={`Danh mục ${p.products.length} sản phẩm trọng tâm nhận booking & gửi mẫu cho KOC`}
              actions={addBtn('products')}
              flush
            >
              {p.products.length === 0 ? (
                <EmptyState
                  title="Chưa có sản phẩm chủ lực"
                  description={
                    (m?.heroProducts.length || 0) > 0
                      ? `Dữ liệu gốc có ${m!.heroProducts.length} sản phẩm (${m!.heroProducts.map(h => h.productName || h.sku).slice(0, 3).join(', ')}) nhưng chưa cập nhật hướng dẫn cho KOC.`
                      : 'Thêm các SKU trọng tâm để KOC nắm rõ USP, thành phần và cơ chế tác động.'
                  }
                />
              ) : (
                <ul className="divide-y divide-line">
                  {p.products.map((x, i) => (
                    <li key={x.id} className="px-4 py-4 grid gap-2.5 text-[13px]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-ink">{x.name}</span>
                            {x.skuCode && (
                              <span className="px-1.5 py-0.5 rounded bg-sunken border border-line text-2xs font-code text-ink-2">
                                {x.skuCode}
                              </span>
                            )}
                            {x.size && <span className="text-2xs text-ink-3">· {x.size}</span>}
                            {x.priceVnd && <span className="text-xs font-semibold text-ink tabular-nums">· {formatVnd(x.priceVnd)}</span>}
                          </div>
                          {x.pdpUrl && (
                            <a
                              href={x.pdpUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-2xs text-accent hover:underline inline-flex items-center gap-1 mt-0.5"
                            >
                              <span>Mở trang sản phẩm trên sàn</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        {itemMenu('products', i)}
                      </div>
                      {x.usps.length > 0 && (
                        <div>
                          <span className="block text-2xs text-ink-3 mb-1">Điểm nổi bật KOC cần nhấn mạnh (USP):</span>
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
                  ))}
                </ul>
              )}
            </Panel>

            {/* Quy chuẩn nội dung */}
            <Panel
              title={SECTION_LABEL.CONTENT_RULES}
              description="Từ khóa cấm, từ khuyến khích và quy chuẩn hình ảnh bắt buộc khi duyệt kịch bản & video"
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
                <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-line text-[13px]">
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
              )}
            </Panel>

            {/* Văn bản pháp lý & Câu hỏi khó */}
            <div className="grid gap-6 md:grid-cols-2">
              <Panel
                title={SECTION_LABEL.LEGAL}
                description="Phiếu công bố, giấy xác nhận quảng cáo"
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
                                <span className="px-1.5 py-0.5 rounded bg-canvas border border-line text-2xs text-ink-2 font-code">
                                  {[ext || 'FILE', size, l.storage === 'R2' ? 'R2' : undefined].filter(Boolean).join(' · ')}
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
                description="Hướng dẫn KOC trả lời câu hỏi khó trên live / bình luận"
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
            {/* Kho tệp R2 rút gọn */}
            <Aside
              title={`${SECTION_LABEL.DOCUMENTS} (${p.documents.length})`}
              note="Lưu trữ trên Cloudflare R2 hoặc liên kết tài liệu"
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
                    {can.DOCUMENTS ? 'Chưa có tài liệu. Nhấn “Tải tệp” hoặc kéo thả tệp vào đây để lưu lên Cloudflare R2.' : 'Chưa có tài liệu.'}
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
                                {(ext || size || d.storage === 'R2') && (
                                  <span className="px-1.5 py-0.2 rounded bg-surface border border-line text-ink-2 font-code">
                                    {[ext || (d.fileKey ? 'FILE' : 'LINK'), size, d.storage === 'R2' ? 'R2' : undefined].filter(Boolean).join(' · ')}
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
            <Aside title="Cơ cấu nhân sự phụ trách B2C" note="Phân bổ theo quy chuẩn 69 gian hàng B2C">
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
                {growthPicName && (
                  <Info label="Phụ trách Tăng trưởng (Growth PIC)">
                    <Person name={growthPicName} size={20} />
                  </Info>
                )}
                <Info label="Chuyên viên điều phối mẫu FOC">
                  <Person name="Trần Thị Hảo" size={20} />
                </Info>
              </dl>
            </Aside>

            {/* Trần thù lao */}
            <Aside title={SECTION_LABEL.RATECARD} action={editBtn('RATECARD', () => setDialog('RATECARD'))} note="Mức tối đa cho 1 video theo khung lương KOC.">
              {p.ratecard.some(r => r.maxBudget) ? (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
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

            <History profile={p} />
          </aside>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: KHO TỆP & TÀI LIỆU THƯƠNG HIỆU (CLOUDFLARE R2 HUB)             */}
      {/* ===================================================================== */}
      {activeTab === 'FILES' && (
        <div className="space-y-6">
          {/* Khu vực tải tệp lên Cloudflare R2 */}
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
                    Tải tệp thương hiệu lên kho lưu trữ Cloudflare R2
                  </h3>
                  <p className="text-xs text-ink-2 mt-0.5">
                    Kéo thả nhiều tệp vào khung này hoặc chọn tệp từ máy tính. Hỗ trợ PDF, Word, Excel, PowerPoint, ảnh PNG/JPG/SVG, ZIP (tối đa 25 MB/tệp).
                  </p>
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
                  {quickUploading ? 'Đang tải lên R2…' : 'Chọn tệp từ máy'}
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
            description="Bao gồm Brand Guideline, hồ sơ công bố pháp lý, thông tin sản phẩm, brief chiến dịch và bộ logo/hình ảnh gốc"
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
                    ? 'Nhấn “Chọn tệp từ máy” phía trên để tải tệp thương hiệu lên Cloudflare R2.'
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
                            <span className="px-2 py-0.5 rounded bg-sunken text-2xs text-ink-2">
                              {DOC_CATEGORY_LABEL[d.category]}
                            </span>
                            <Status tone={d.storage === 'R2' ? 'positive' : d.fileKey ? 'info' : 'neutral'}>
                              {d.storage === 'R2' ? 'Cloudflare R2' : d.fileKey ? 'Kho nội bộ' : 'Liên kết ngoài'}
                            </Status>
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
      {/* TAB 3: GIAN HÀNG SÀN & BOOKING TRỰC THUỘC                             */}
      {/* ===================================================================== */}
      {activeTab === 'STORES' && (
        <div className="space-y-6">
          <Panel
            title={`Gian hàng sàn trực thuộc ${row.name} (${brandStores.length} gian hàng)`}
            description="Phân bổ hạn mức Order Net, chỉ tiêu video và nhân sự B2C phụ trách theo từng gian hàng trên TikTok Shop, Shopee Mall, Lazada"
            flush
          >
            {brandStores.length === 0 ? (
              <EmptyState
                title="Chưa ghi nhận gian hàng sàn"
                description="Thương hiệu này hiện chưa gắn gian hàng trong danh mục 69 gian hàng B2C."
              />
            ) : (
              <DataTable
                columns={storeColumns}
                rows={brandStores}
                rowKey={s => s.id}
                onRowClick={onNavigateToStoreProfile ? s => onNavigateToStoreProfile(s.storeName) : undefined}
              />
            )}
          </Panel>

          <Panel
            title={`Thực tế Booking KOC của thương hiệu (${brandDeals.length} deal)`}
            description="Các deal KOC đã phát sinh chi phí hoặc đang triển khai cho các gian hàng của thương hiệu"
            actions={onOpenBooking && <Button size="sm" variant="secondary" onClick={onOpenBooking}>Mở Quản lý Booking</Button>}
            flush
          >
            {brandDeals.length === 0 ? (
              <EmptyState
                title="Chưa có deal booking trong kỳ"
                description="Chưa có booking KOC nào được ghi nhận cho thương hiệu này."
              />
            ) : (
              <DataTable columns={dealColumns} rows={brandDeals} rowKey={d => d.id} />
            )}
          </Panel>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: SẢN PHẨM CHỦ LỰC & TRẦN THÙ LAO KOC                            */}
      {/* ===================================================================== */}
      {activeTab === 'PRODUCTS' && (
        <div className="grid gap-6 items-start lg:grid-cols-[minmax(0,1fr)_360px]">
          <Panel
            title={`Danh mục Sản phẩm chủ lực (${p.products.length} SKU)`}
            description="Thông tin chi tiết về điểm bán hàng độc nhất (USP), cơ chế, thành phần và lưu ý cho KOC"
            actions={addBtn('products')}
            flush
          >
            {p.products.length === 0 ? (
              <EmptyState title="Chưa có sản phẩm chủ lực" description="Nhấn “Thêm sản phẩm” để cập nhật thông tin SKU cho KOC." />
            ) : (
              <ul className="divide-y divide-line">
                {p.products.map((x, i) => (
                  <li key={x.id} className="px-4 py-4 grid gap-2.5 text-[13px]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-ink text-sm">{x.name}</span>
                          {x.skuCode && (
                            <span className="px-1.5 py-0.5 rounded bg-sunken border border-line text-2xs font-code text-ink-2">
                              {x.skuCode}
                            </span>
                          )}
                          {x.size && <span className="text-xs text-ink-3">· {x.size}</span>}
                          {x.priceVnd && <span className="text-xs font-semibold text-ink tabular-nums">· {formatVnd(x.priceVnd)}</span>}
                        </div>
                        {x.pdpUrl && (
                          <a href={x.pdpUrl} target="_blank" rel="noreferrer" className="text-2xs text-accent hover:underline inline-flex items-center gap-1 mt-0.5">
                            <span>Xem trang sản phẩm (PDP)</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      {itemMenu('products', i)}
                    </div>
                    {x.usps.length > 0 && (
                      <div className="rounded-lg bg-canvas/70 border border-line p-3">
                        <span className="block text-2xs font-medium text-ink-3 mb-1">Điểm nổi bật KOC bắt buộc nhắc (USP):</span>
                        <ul className="list-disc pl-5 text-ink-2 grid gap-1">
                          {x.usps.map((u, k) => <li key={k}>{u}</li>)}
                        </ul>
                      </div>
                    )}
                    <dl className="grid gap-3 sm:grid-cols-2">
                      {x.mechanism && <Info label="Cơ chế tác động / Hướng dẫn quay">{x.mechanism}</Info>}
                      {x.ingredients.length > 0 && <Info label="Thành phần chính">{x.ingredients.join('; ')}</Info>}
                      {x.targetUser && <Info label="Đối tượng phù hợp">{x.targetUser}</Info>}
                      {x.contraindications && <Info label="Chống chỉ định / Lưu ý">{x.contraindications}</Info>}
                    </dl>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title={SECTION_LABEL.RATECARD}
            description="Định mức chi phí tối đa cho 1 video theo phân hạng KOC (KL1 → KL7)"
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
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: TỪ CẤM, PHÁP LÝ & CÂU HỎI KHÓ                                  */}
      {/* ===================================================================== */}
      {activeTab === 'COMPLIANCE' && (
        <div className="space-y-6">
          <Panel
            title={SECTION_LABEL.CONTENT_RULES}
            description="Danh mục từ khóa cấm, cách diễn đạt thay thế và quy chuẩn hình ảnh cho KOC"
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
              <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-line text-[13px]">
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
            )}
          </Panel>

          <Panel
            title={`${SECTION_LABEL.LEGAL} (${p.legal.length})`}
            description="Phiếu công bố sản phẩm, giấy xác nhận nội dung quảng cáo và chứng nhận kiểm nghiệm lưu trên Cloudflare R2"
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
                            <span className="px-1.5 py-0.5 rounded bg-canvas border border-line text-2xs text-ink-2 font-code">
                              {[ext || 'FILE', size, l.storage === 'R2' ? 'R2' : undefined].filter(Boolean).join(' · ')}
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
            description="Kịch bản trả lời khi người xem hỏi vặn về giá, nguồn gốc, tác dụng phụ"
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

      {/* HỘP THOẠI XEM TRƯỚC TỆP TRỰC TIẾP */}
      {previewDoc && (
        <Modal
          open={Boolean(previewDoc)}
          onClose={() => setPreviewDoc(null)}
          title={previewDoc.title}
          description={[DOC_CATEGORY_LABEL[previewDoc.category], previewDoc.fileName, formatFileSize(previewDoc.fileSize)].filter(Boolean).join(' · ')}
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
          <div className="rounded-lg border border-line bg-canvas overflow-hidden min-h-[420px] flex items-center justify-center">
            {/^(image\/|\.(png|jpg|jpeg|webp|gif|svg)$)/i.test(previewDoc.mimeType || previewDoc.fileName || '') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewDoc.url} alt={previewDoc.title} className="max-h-[70vh] w-auto object-contain" />
            ) : (
              <iframe src={previewDoc.url} title={previewDoc.title} className="w-full h-[65vh] border-0" />
            )}
          </div>
        </Modal>
      )}

      {/* CÁC HỘP THOẠI CHỈNH SỬA */}
      {dialog === 'POSITIONING' && <PositioningDialog open value={p.positioning} busy={busy} onClose={() => setDialog(null)} onSave={v => saveDialog('POSITIONING', v)} />}
      {dialog === 'ENTITY' && <EntityDialog open value={p.entity} fallbackCompany={real(m?.companyName)} busy={busy} onClose={() => setDialog(null)} onSave={v => saveDialog('ENTITY', v)} />}
      {dialog === 'RATECARD' && <RatecardDialog open value={p.ratecard} busy={busy} onClose={() => setDialog(null)} onSave={v => saveDialog('RATECARD', { ratecard: v })} />}
      {dialog === 'CONTENT_RULES' && <ContentRulesDialog open value={p.contentRules} busy={busy} onClose={() => setDialog(null)} onSave={v => saveDialog('CONTENT_RULES', v)} />}

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

function Aside({ title, action, note, children }: { title: string; action?: React.ReactNode; note?: string; children: React.ReactNode }) {
  return (
    <section className="px-4 py-4">
      <div className="flex items-center justify-between gap-2 min-h-7 mb-1">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {action}
      </div>
      {note && <p className="text-2xs text-ink-3 mb-3">{note}</p>}
      {!note && <div className="mb-2" />}
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
