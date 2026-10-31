'use client';

import React, { useMemo, useState } from 'react';
import {
  Button,
  Chips,
  ConfirmDialog,
  DataTable,
  EmptyState,
  Field,
  FilterBar,
  Input,
  Modal,
  PageActions,
  Select,
  Status,
  Textarea,
  type Column,
} from '../ui';
import { Check, Copy, Edit3, Lightbulb, Plus, Trash2 } from 'lucide-react';
import type { ContentAngleItem, MasterContentPillar, PushProductItem, StorePortfolioItem, UserProfile } from '../../lib/types';
import type { BrandProduct } from '../../lib/brands/types';
import { INITIAL_CONTENT_ANGLES, generateAiAngleSuggestions } from '../../lib/contentAngleData';
import { INITIAL_MASTER_PILLARS } from '../../lib/selfChannelData';
import { INITIAL_PUSH_PRODUCTS } from '../../lib/mockData';
import { getVietnamDateYmd } from '../../lib/format';
import { loadSavedBrandAngles, SAVED_BRAND_ANGLES_EVENT } from '../../lib/contentContextBuilder';

interface ContentAngleSetupViewProps {
  currentUser?: UserProfile | null;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onSelectAngleForBooking?: (angle: ContentAngleItem) => void;
  initialProductId?: string;
  initialStoreName?: string;
  brandName?: string;
  brandProducts?: BrandProduct[];
  brandStores?: StorePortfolioItem[];
  embedded?: boolean;
}

function matchesBrandName(candidate?: string, targetBrand?: string): boolean {
  if (!candidate || !targetBrand) return false;
  const a = candidate.trim().toLowerCase();
  const b = targetBrand.trim().toLowerCase();
  return a === b || a.includes(b) || b.includes(a);
}

export const ContentAngleSetupView: React.FC<ContentAngleSetupViewProps> = ({
  currentUser,
  onNotify,
  onSelectAngleForBooking,
  initialProductId,
  brandName,
  brandProducts,
  brandStores,
  embedded = false,
}) => {
  const [pillars] = useState<MasterContentPillar[]>(INITIAL_MASTER_PILLARS);

  const products = useMemo<PushProductItem[]>(() => {
    const baseMatched = brandName
      ? INITIAL_PUSH_PRODUCTS.filter(p => matchesBrandName(p.brandName, brandName))
      : INITIAL_PUSH_PRODUCTS;

    if (!brandName) return baseMatched;

    const primaryStore = brandStores?.[0];
    const defaultStoreName = primaryStore?.storeName || `${brandName} Official Store`;
    const defaultPlatform: 'TIKTOK_SHOP' | 'SHOPEE_MALL' | 'LAZADA' =
      primaryStore?.platform === 'Shopee Mall'
        ? 'SHOPEE_MALL'
        : primaryStore?.platform === 'Lazada'
          ? 'LAZADA'
          : 'TIKTOK_SHOP';

    const convertedFromBrandProfile: PushProductItem[] = (brandProducts || [])
      .filter(bp => !baseMatched.some(m => m.sku === bp.skuCode || m.productName.toLowerCase() === bp.name.toLowerCase()))
      .map((bp, idx) => ({
        id: bp.id || `bp-${brandName.toLowerCase().replace(/\s+/g, '-')}-${idx + 1}`,
        sku: bp.skuCode || `${brandName.toUpperCase().slice(0, 4)}-SKU-${idx + 1}`,
        productName: bp.name,
        brandId: `brand-${brandName.toLowerCase().replace(/\s+/g, '-')}`,
        brandName,
        brandCategory: 'Chăm sóc & Làm đẹp',
        storeId: primaryStore?.id || `store-${brandName.toLowerCase().replace(/\s+/g, '-')}`,
        storeName: defaultStoreName,
        platform: defaultPlatform,
        cycleMonth: '2026/10',
        campaignName: `Chiến dịch ${brandName}`,
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        originalPrice: bp.priceVnd || 250000,
        promotionalPrice: bp.dealPriceVnd || bp.priceVnd || 199000,
        discountPercent: bp.priceVnd && bp.dealPriceVnd ? Math.max(0, Math.round((1 - bp.dealPriceVnd / bp.priceVnd) * 100)) : 15,
        affiliateRate: bp.commissionOrganicPct ?? 10,
        availableStock: bp.sampleStockStatus === 'OUT_OF_STOCK' ? 0 : 100,
        monthlySampleQuota: 30,
        allocatedSampleCount: 10,
        usp: bp.usps?.join(' · ') || bp.mechanism || `Sản phẩm chính hãng ${brandName}`,
        viralAngle: bp.mechanism || 'Chia sẻ trải nghiệm thực tế và điểm nổi bật sản phẩm',
        targetKocNiche: bp.targetUser ? [bp.targetUser] : ['Khách hàng mục tiêu'],
        pdpUrl: bp.pdpUrl,
        feasibilityScore: 'HIGH_VIRAL',
        b2cPic: primaryStore?.b2cOwnerName || 'Lê Phương Thảo',
        status: 'LOCKED_APPROVED',
        proposedAt: '2026-10-01',
        comments: [],
        changeRequests: [],
        auditLogs: [],
      }));

    const combined = [...baseMatched, ...convertedFromBrandProfile];
    if (combined.length > 0) return combined;

    return [
      {
        id: `bp-default-${brandName.toLowerCase().replace(/\s+/g, '-')}`,
        sku: `${brandName.toUpperCase().slice(0, 4)}-01`,
        productName: `${brandName} - Sản phẩm chính`,
        brandId: `brand-${brandName.toLowerCase().replace(/\s+/g, '-')}`,
        brandName,
        brandCategory: 'Chăm sóc & Làm đẹp',
        storeId: primaryStore?.id || `store-${brandName.toLowerCase().replace(/\s+/g, '-')}`,
        storeName: defaultStoreName,
        platform: defaultPlatform,
        cycleMonth: '2026/10',
        campaignName: `Chiến dịch ${brandName}`,
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        originalPrice: 290000,
        promotionalPrice: 229000,
        discountPercent: 21,
        affiliateRate: 10,
        availableStock: 100,
        monthlySampleQuota: 30,
        allocatedSampleCount: 8,
        usp: `Sản phẩm chính hãng từ ${brandName}`,
        viralAngle: 'Tình huống thực tế & đánh giá chất sản phẩm',
        targetKocNiche: ['Khách hàng mục tiêu'],
        feasibilityScore: 'HIGH_VIRAL',
        b2cPic: primaryStore?.b2cOwnerName || 'Lê Phương Thảo',
        status: 'LOCKED_APPROVED',
        proposedAt: '2026-10-01',
        comments: [],
        changeRequests: [],
        auditLogs: [],
      },
    ];
  }, [brandName, brandProducts, brandStores]);

  const initialScopedAngles = useMemo<ContentAngleItem[]>(() => {
    if (!brandName) return INITIAL_CONTENT_ANGLES;
    const matched = INITIAL_CONTENT_ANGLES.filter(
      a =>
        matchesBrandName(a.brandName, brandName) ||
        products.some(p => p.id === a.productId || p.sku === a.productSku),
    );
    if (matched.length > 0) return matched;

    const firstProd = products[0];
    if (!firstProd) return [];
    const codePrefix = brandName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4) || 'ANG';
    return generateAiAngleSuggestions(firstProd.productName, 'Nỗi đau - Giải pháp', brandName).map((sugg, idx) => ({
      ...sugg,
      id: `ang-${codePrefix.toLowerCase()}-seed-${idx + 1}`,
      code: `ANG-${codePrefix}-0${idx + 1}`,
      productId: firstProd.id,
      productName: firstProd.productName,
      productSku: firstProd.sku,
      brandId: firstProd.brandId,
      brandName,
      storeId: firstProd.storeId,
      storeName: firstProd.storeName,
      platform: firstProd.platform,
      keySellingPoints: firstProd.usp ? firstProd.usp.split(' · ').filter(Boolean) : sugg.keySellingPoints,
      targetAudience: firstProd.targetKocNiche?.join(', ') || sugg.targetAudience,
      status: idx === 0 ? 'WINNING' : 'ACTIVE',
      usageCount: (3 - idx) * 4,
      avgViewsEstimate: 65000 + idx * 15000,
      createdBy: currentUser?.name || 'Đặng Thị Yến Nhi',
      createdAt: '2026-10-01',
      updatedAt: '2026-10-15',
    }));
  }, [brandName, products, currentUser?.name]);

  const [angles, setAngles] = useState<ContentAngleItem[]>(initialScopedAngles);
  const [prevScopedAngles, setPrevScopedAngles] = useState<ContentAngleItem[]>(initialScopedAngles);
  if (initialScopedAngles !== prevScopedAngles) {
    setPrevScopedAngles(initialScopedAngles);
    setAngles(initialScopedAngles);
  }

  const [savedAngles, setSavedAngles] = useState<ContentAngleItem[]>(() => loadSavedBrandAngles(brandName));
  React.useEffect(() => {
    const handleUpdate = () => {
      setSavedAngles(loadSavedBrandAngles(brandName));
    };
    window.addEventListener(SAVED_BRAND_ANGLES_EVENT, handleUpdate);
    return () => window.removeEventListener(SAVED_BRAND_ANGLES_EVENT, handleUpdate);
  }, [brandName]);

  const effectiveAngles = useMemo(() => {
    if (!savedAngles || savedAngles.length === 0) return angles;
    const map = new Map<string, ContentAngleItem>();
    savedAngles.forEach(a => map.set(a.id, a));
    angles.forEach(a => {
      if (!map.has(a.id)) {
        map.set(a.id, a);
      }
    });
    return Array.from(map.values());
  }, [savedAngles, angles]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string>(initialProductId || 'ALL');
  const [selectedPillar, setSelectedPillar] = useState<string>('ALL');

  const productSyncKey = `${brandName}::${initialProductId || ''}`;
  const [prevProductSyncKey, setPrevProductSyncKey] = useState(productSyncKey);
  if (productSyncKey !== prevProductSyncKey) {
    setPrevProductSyncKey(productSyncKey);
    setSelectedProduct(initialProductId || 'ALL');
  }

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAngle, setEditingAngle] = useState<ContentAngleItem | null>(null);

  const [formProductId, setFormProductId] = useState<string>('');
  const [formPillarId, setFormPillarId] = useState<string>(pillars[0]?.id || 'PIL-01');
  const [formName, setFormName] = useState('');
  const [formHookIdea, setFormHookIdea] = useState('');
  const [formPainPoint, setFormPainPoint] = useState('');
  const [formSolutionApproach, setFormSolutionApproach] = useState('');
  const [formSuggestedFormat, setFormSuggestedFormat] = useState('Voiceover B-roll');
  const [formStatus, setFormStatus] = useState<ContentAngleItem['status']>('ACTIVE');

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiProductSelect, setAiProductSelect] = useState<string>('');
  const [aiPillarSelect, setAiPillarSelect] = useState<string>('Nỗi đau - Giải pháp');
  const [aiSuggestions, setAiSuggestions] = useState<Array<Partial<ContentAngleItem>>>([]);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingAngle, setDeletingAngle] = useState<{ id: string; name: string } | null>(null);

  const filteredAngles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return effectiveAngles.filter(angle => {
      if (q) {
        const hay = `${angle.name} ${angle.hookIdea} ${angle.productName} ${angle.painPoint} ${angle.solutionApproach}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (selectedProduct !== 'ALL' && angle.productId !== selectedProduct && angle.productSku !== selectedProduct) return false;
      if (selectedPillar !== 'ALL' && angle.pillarId !== selectedPillar && angle.pillarName !== selectedPillar) return false;
      return true;
    });
  }, [effectiveAngles, searchTerm, selectedProduct, selectedPillar]);

  const pillarChipItems = useMemo(() => {
    return [
      { key: 'ALL', label: 'Tất cả', count: effectiveAngles.length },
      ...pillars.map(p => ({
        key: p.id,
        label: p.name,
        count: effectiveAngles.filter(a => a.pillarId === p.id || a.pillarName === p.name).length,
      })),
    ];
  }, [effectiveAngles, pillars]);

  const handleOpenCreateModal = () => {
    setEditingAngle(null);
    const prod = products.find(p => p.id === selectedProduct || p.sku === selectedProduct) || products[0];
    const pil = pillars.find(p => p.id === selectedPillar) || pillars[0];

    setFormProductId(prod?.id || '');
    setFormPillarId(pil?.id || 'PIL-01');
    setFormName('');
    setFormHookIdea('');
    setFormPainPoint('');
    setFormSolutionApproach('');
    setFormSuggestedFormat(pil?.suggestedFormats?.[0] || 'Voiceover B-roll');
    setFormStatus('ACTIVE');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (angle: ContentAngleItem) => {
    setEditingAngle(angle);
    setFormProductId(angle.productId || products[0]?.id || '');
    setFormPillarId(angle.pillarId || 'PIL-01');
    setFormName(angle.name);
    setFormHookIdea(angle.hookIdea);
    setFormPainPoint(angle.painPoint);
    setFormSolutionApproach(angle.solutionApproach);
    setFormSuggestedFormat(angle.suggestedFormat || 'Voiceover B-roll');
    setFormStatus(angle.status || 'ACTIVE');
    setIsModalOpen(true);
  };

  const handleSaveAngle = () => {
    if (!formName.trim() || !formHookIdea.trim()) {
      onNotify?.('Vui lòng nhập tên kịch bản và câu mở đầu.', 'warning');
      return;
    }

    const matchedProd = products.find(p => p.id === formProductId || p.sku === formProductId) || products[0];
    const matchedPillar = pillars.find(p => p.id === formPillarId) || pillars[0];

    if (editingAngle) {
      const updated: ContentAngleItem = {
        ...editingAngle,
        name: formName.trim(),
        pillarId: matchedPillar.id,
        pillarName: matchedPillar.name,
        pillarCode: matchedPillar.code,
        productId: matchedProd?.id || formProductId,
        productName: matchedProd?.productName || editingAngle.productName,
        productSku: matchedProd?.sku || editingAngle.productSku,
        brandId: matchedProd?.brandId || editingAngle.brandId,
        brandName: matchedProd?.brandName || editingAngle.brandName,
        storeId: matchedProd?.storeId || editingAngle.storeId,
        storeName: matchedProd?.storeName || editingAngle.storeName,
        hookIdea: formHookIdea.trim(),
        painPoint: formPainPoint.trim(),
        solutionApproach: formSolutionApproach.trim(),
        suggestedFormat: formSuggestedFormat,
        status: formStatus,
        updatedAt: getVietnamDateYmd(),
      };

      setAngles(prev => prev.map(a => (a.id === updated.id ? updated : a)));
      onNotify?.(`Đã lưu kịch bản "${updated.name}"`, 'success');
    } else {
      const codePrefix = (matchedProd?.brandName || 'ANG').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);
      const newAngle: ContentAngleItem = {
        id: `ang-${Date.now()}`,
        code: `ANG-${codePrefix}-${Date.now().toString().slice(-3)}`,
        name: formName.trim(),
        pillarId: matchedPillar.id,
        pillarName: matchedPillar.name,
        pillarCode: matchedPillar.code,
        productId: matchedProd?.id || formProductId,
        productName: matchedProd?.productName || 'Sản phẩm',
        productSku: matchedProd?.sku || 'SKU',
        brandId: matchedProd?.brandId,
        brandName: matchedProd?.brandName || brandName || 'Thương hiệu',
        storeId: matchedProd?.storeId,
        storeName: matchedProd?.storeName || 'Gian hàng',
        hookIdea: formHookIdea.trim(),
        painPoint: formPainPoint.trim(),
        solutionApproach: formSolutionApproach.trim(),
        keySellingPoints: matchedProd?.usp ? [matchedProd.usp] : [],
        targetAudience: matchedProd?.targetKocNiche?.join(', ') || 'Khách hàng mục tiêu',
        callToAction: 'Bấm vào giỏ hàng góc trái để mua.',
        suggestedFormat: formSuggestedFormat,
        status: formStatus,
        usageCount: 0,
        avgViewsEstimate: 50000,
        createdBy: currentUser?.name || 'Phòng B2C',
        createdAt: getVietnamDateYmd(),
        updatedAt: getVietnamDateYmd(),
      };

      setAngles(prev => [newAngle, ...prev]);
      onNotify?.(`Đã thêm kịch bản "${newAngle.name}"`, 'success');
    }

    setIsModalOpen(false);
  };

  const handleCopyHook = (hookText: string, angleId: string) => {
    navigator.clipboard.writeText(hookText);
    setCopiedId(angleId);
    setTimeout(() => setCopiedId(null), 2000);
    onNotify?.('Đã chép câu mở đầu', 'success');
  };

  const handleOpenAiModal = () => {
    const prod = products.find(p => p.id === selectedProduct || p.sku === selectedProduct) || products[0];
    setAiProductSelect(prod?.id || '');
    setAiPillarSelect('Nỗi đau - Giải pháp');
    setAiSuggestions(generateAiAngleSuggestions(prod?.productName || '', 'Nỗi đau - Giải pháp', prod?.brandName || ''));
    setIsAiModalOpen(true);
  };

  const handleApplyAiSuggestion = (sugg: Partial<ContentAngleItem>) => {
    const matchedProd = products.find(p => p.id === aiProductSelect) || products[0];
    const matchedPillar = pillars.find(p => p.name.includes(aiPillarSelect)) || pillars[0];

    setEditingAngle(null);
    setFormProductId(matchedProd?.id || '');
    setFormPillarId(matchedPillar.id);
    setFormName(sugg.name || '');
    setFormHookIdea(sugg.hookIdea || '');
    setFormPainPoint(sugg.painPoint || '');
    setFormSolutionApproach(sugg.solutionApproach || '');
    setFormSuggestedFormat(sugg.suggestedFormat || 'Voiceover B-roll');

    setIsAiModalOpen(false);
    setIsModalOpen(true);
  };

  const columns: Column<ContentAngleItem>[] = [
    {
      key: 'product',
      header: 'Sản phẩm & Nhóm nội dung',
      width: 215,
      render: a => (
        <div className="min-w-0 leading-tight">
          <div className="font-semibold text-ink truncate" title={a.productName}>
            {a.productName}
          </div>
          <div className="text-2xs text-ink-3 mt-0.5 flex flex-wrap items-center gap-2">
            <span className="font-code">{a.productSku}</span>
            <span>·</span>
            <span className="text-accent font-medium">{a.pillarName}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'hook',
      header: 'Góc kịch bản & Câu mở đầu (3s)',
      render: a => {
        const isCopied = copiedId === a.id;
        return (
          <div className="min-w-[240px] space-y-1">
            <div className="font-semibold text-ink">{a.name}</div>
            <div className="flex items-start justify-between gap-2 rounded bg-canvas border border-line px-3 py-2 text-xs">
              <span className="text-ink-2 italic">“{a.hookIdea}”</span>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  handleCopyHook(a.hookIdea, a.id);
                }}
                className="shrink-0 text-2xs font-medium text-accent hover:underline inline-flex items-center gap-1"
                title="Chép câu mở đầu"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-positive" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Đã chép' : 'Chép'}</span>
              </button>
            </div>
          </div>
        );
      },
    },
    {
      key: 'approach',
      header: 'Vấn đề & Cách giải quyết',
      render: a => (
        <div className="min-w-[220px] space-y-1 text-xs leading-snug">
          {a.painPoint && (
            <div>
              <span className="text-ink-3">Vấn đề: </span>
              <span className="text-ink">{a.painPoint}</span>
            </div>
          )}
          {a.solutionApproach && (
            <div>
              <span className="text-ink-3">Giải quyết: </span>
              <span className="text-ink-2">{a.solutionApproach}</span>
            </div>
          )}
          {!a.painPoint && !a.solutionApproach && <span className="text-ink-3">—</span>}
        </div>
      ),
    },
    {
      key: 'format',
      header: 'Cách quay & Đánh giá',
      width: 175,
      render: a => {
        const st = a.status || 'ACTIVE';
        const statusMeta: Record<ContentAngleItem['status'], { label: string; tone: 'positive' | 'info' | 'warning' | 'neutral' }> = {
          WINNING: { label: 'Hiệu quả tốt (Win)', tone: 'positive' },
          ACTIVE: { label: 'Đang đẩy mạnh', tone: 'info' },
          DRAFT: { label: 'Thử nghiệm', tone: 'warning' },
          ARCHIVED: { label: 'Tạm dừng', tone: 'neutral' },
        };
        const meta = statusMeta[st] || statusMeta.ACTIVE;
        return (
          <div className="space-y-1 leading-tight">
            <div className="text-xs text-ink-2">{a.suggestedFormat || 'Review thực tế'}</div>
            <div>
              <Status tone={meta.tone}>{meta.label}</Status>
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
      render: a => (
        <div className="inline-flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
          {onSelectAngleForBooking && (
            <Button size="sm" variant="secondary" onClick={() => onSelectAngleForBooking(a)}>
              Chọn
            </Button>
          )}
          <Button size="sm" variant="ghost" icon={Edit3} onClick={() => handleOpenEditModal(a)}>
            Sửa
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={Trash2}
            onClick={() => setDeletingAngle({ id: a.id, name: a.name })}
          />
        </div>
      ),
    },
  ];

  return (
    <div className={embedded ? 'divide-y divide-line' : 'rounded-xl border border-line bg-surface overflow-hidden divide-y divide-line'}>
      {!embedded && (
        <PageActions>
          <Button size="sm" variant="secondary" icon={Lightbulb} onClick={handleOpenAiModal}>
            Gợi ý kịch bản mẫu
          </Button>
          <Button size="sm" variant="primary" icon={Plus} onClick={handleOpenCreateModal}>
            Thêm kịch bản
          </Button>
        </PageActions>
      )}

      {/* THANH LỌC & NÚT THAO TÁC GỌN GÀNG */}
      <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {products.length > 1 && (
            <Select
              value={selectedProduct}
              onChange={e => setSelectedProduct(e.target.value)}
              className="w-[210px]"
            >
              <option value="ALL">Tất cả sản phẩm ({products.length})</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.productName}
                </option>
              ))}
            </Select>
          )}
          <div className="flex-1 min-w-[240px]">
            <FilterBar
              search={{
                value: searchTerm,
                onChange: setSearchTerm,
                placeholder: 'Tìm tên kịch bản, câu mở đầu 3s, vấn đề...',
              }}
              chips={<Chips items={pillarChipItems} value={selectedPillar} onChange={setSelectedPillar} />}
              resultCount={searchTerm.trim() ? filteredAngles.length : undefined}
            />
          </div>
        </div>

        {embedded && (
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="secondary" size="sm" icon={Lightbulb} onClick={handleOpenAiModal}>
              Gợi ý mẫu
            </Button>
            <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenCreateModal}>
              Thêm kịch bản
            </Button>
          </div>
        )}
      </div>

      {/* BẢNG DANH SÁCH GÓC KỊCH BẢN */}
      <div>
        <DataTable
          columns={columns}
          rows={filteredAngles}
          rowKey={a => a.id}
          onRowClick={handleOpenEditModal}
          empty={
            <EmptyState
              title="Chưa có góc kịch bản phù hợp"
              action={
                <Button size="sm" variant="primary" icon={Plus} onClick={handleOpenCreateModal}>
                  Thêm kịch bản
                </Button>
              }
            />
          }
        />
      </div>

      {/* HỘP THOẠI THÊM / SỬA GÓC KỊCH BẢN (6 TRƯỜNG CỐT LÕI) */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAngle ? 'Sửa góc kịch bản' : 'Thêm góc kịch bản'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleSaveAngle}>
              Lưu kịch bản
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Field label="Sản phẩm *">
              <Select value={formProductId} onChange={e => setFormProductId(e.target.value)}>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.productName} ({p.sku})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Nhóm nội dung *">
              <Select value={formPillarId} onChange={e => setFormPillarId(e.target.value)}>
                {pillars.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Cách quay">
              <Select value={formSuggestedFormat} onChange={e => setFormSuggestedFormat(e.target.value)}>
                <option value="Voiceover B-roll">Lồng tiếng &amp; cảnh quay phụ</option>
                <option value="Review trực tiếp cận mặt">Review trực tiếp cận mặt</option>
                <option value="POV Tình huống kịch tính">Tình huống thực tế</option>
                <option value="Unboxing ASMR">Mở hộp &amp; test chất</option>
                <option value="Daily Vlog nhẹ nhàng">Vlog hằng ngày</option>
                <option value="Chuyên gia / Dược sĩ tư vấn">Chuyên gia / dược sĩ tư vấn</option>
              </Select>
            </Field>
            <Field label="Đánh giá hiệu quả">
              <Select value={formStatus} onChange={e => setFormStatus(e.target.value as ContentAngleItem['status'])}>
                <option value="WINNING">Hiệu quả tốt (Win)</option>
                <option value="ACTIVE">Đang đẩy mạnh</option>
                <option value="DRAFT">Thử nghiệm</option>
                <option value="ARCHIVED">Tạm dừng</option>
              </Select>
            </Field>
          </div>

          <Field label="Tên góc kịch bản *">
            <Input
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="VD: Cứu nguy da bé chàm sữa / Test độ kiềm dầu sau 8 tiếng"
            />
          </Field>

          <Field label="Câu mở đầu (3 giây đầu) *">
            <Textarea
              rows={2}
              value={formHookIdea}
              onChange={e => setFormHookIdea(e.target.value)}
              placeholder="Câu thoại hoặc tình huống mở đầu giữ chân người xem..."
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Vấn đề khách hàng gặp phải">
              <Textarea
                rows={3}
                value={formPainPoint}
                onChange={e => setFormPainPoint(e.target.value)}
                placeholder="Khách hàng đang gặp tình trạng gì trước khi dùng?"
              />
            </Field>
            <Field label="Cách sản phẩm giải quyết">
              <Textarea
                rows={3}
                value={formSolutionApproach}
                onChange={e => setFormSolutionApproach(e.target.value)}
                placeholder="Sản phẩm giải quyết vấn đề trên như thế nào?"
              />
            </Field>
          </div>
        </div>
      </Modal>

      {/* HỘP THOẠI GỢI Ý KỊCH BẢN MẪU */}
      <Modal
        open={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        title="Gợi ý kịch bản mẫu theo sản phẩm"
        size="lg"
        footer={
          <Button variant="ghost" onClick={() => setIsAiModalOpen(false)}>
            Đóng
          </Button>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Sản phẩm">
              <Select
                value={aiProductSelect}
                onChange={e => {
                  setAiProductSelect(e.target.value);
                  const prod = products.find(p => p.id === e.target.value);
                  setAiSuggestions(
                    generateAiAngleSuggestions(prod?.productName || '', aiPillarSelect, prod?.brandName || ''),
                  );
                }}
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.productName}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Nhóm nội dung">
              <Select
                value={aiPillarSelect}
                onChange={e => {
                  setAiPillarSelect(e.target.value);
                  const prod = products.find(p => p.id === aiProductSelect);
                  setAiSuggestions(
                    generateAiAngleSuggestions(prod?.productName || '', e.target.value, prod?.brandName || ''),
                  );
                }}
              >
                {pillars.map(p => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="space-y-3">
            {aiSuggestions.map((sugg, sIdx) => (
              <div
                key={sIdx}
                className="p-4 rounded-lg border border-line bg-canvas space-y-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="font-semibold text-ink">{sugg.name}</div>
                  <div className="text-ink-2 italic">“{sugg.hookIdea}”</div>
                  <div className="text-2xs text-ink-3">{sugg.solutionApproach}</div>
                </div>
                <Button size="sm" variant="primary" onClick={() => handleApplyAiSuggestion(sugg)}>
                  Dùng mẫu này
                </Button>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingAngle)}
        onOpenChange={open => !open && setDeletingAngle(null)}
        title="Xóa góc kịch bản"
        description={`Xóa kịch bản "${deletingAngle?.name}" khỏi danh sách?`}
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        variant="danger"
        onConfirm={() => {
          if (deletingAngle) {
            setAngles(prev => prev.filter(a => a.id !== deletingAngle.id));
            onNotify?.(`Đã xóa kịch bản "${deletingAngle.name}"`, 'info');
            setDeletingAngle(null);
          }
        }}
      />
    </div>
  );
};
