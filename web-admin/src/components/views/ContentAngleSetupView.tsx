'use client';

import React, { useState, useMemo } from 'react';
import { ConfirmDialog, PageActions, StatRow, Stat, Button, Presence } from '../ui';
import { 
  Layers, 
  Search, 
  Plus, 
  Copy, 
  Check, 
  Edit3, 
  Trash2, 
  Flame, 
  Store, 
  Package, 
  CheckCircle2, 
  LayoutGrid,
  Table as TableIcon,
  Grid3X3,
  Lightbulb,
  ArrowRight,
  Info,
  X
} from 'lucide-react';
import { ContentAngleItem, UserProfile, MasterContentPillar, PushProductItem } from '../../lib/types';
import { INITIAL_CONTENT_ANGLES, generateAiAngleSuggestions } from '../../lib/contentAngleData';
import { INITIAL_MASTER_PILLARS } from '../../lib/selfChannelData';
import { INITIAL_PUSH_PRODUCTS } from '../../lib/mockData';

interface ContentAngleSetupViewProps {
  currentUser?: UserProfile;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onSelectAngleForBooking?: (angle: ContentAngleItem) => void;
  initialProductId?: string;
  initialStoreName?: string;
}

export const ContentAngleSetupView: React.FC<ContentAngleSetupViewProps> = ({
  currentUser,
  onNotify,
  onSelectAngleForBooking,
  initialProductId,
  initialStoreName
}) => {
  // Master Angles State
  const [angles, setAngles] = useState<ContentAngleItem[]>(INITIAL_CONTENT_ANGLES);
  const [pillars] = useState<MasterContentPillar[]>(INITIAL_MASTER_PILLARS);
  const [products] = useState<PushProductItem[]>(INITIAL_PUSH_PRODUCTS);

  // Active View Mode: 'CARDS' | 'MATRIX' | 'TABLE'
  const [viewMode, setViewMode] = useState<'CARDS' | 'MATRIX' | 'TABLE'>('CARDS');

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStore, setSelectedStore] = useState<string>(initialStoreName || 'ALL');
  const [selectedProduct, setSelectedProduct] = useState<string>(initialProductId || 'ALL');
  const [selectedPillar, setSelectedPillar] = useState<string>('ALL');
  const [selectedStatus] = useState<string>('ALL');

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAngle, setEditingAngle] = useState<ContentAngleItem | null>(null);

  // Form State
  const [formStoreName, setFormStoreName] = useState<string>('');
  const [formProductId, setFormProductId] = useState<string>('');
  const [formPillarId, setFormPillarId] = useState<string>(pillars[0]?.id || 'PIL-01');
  const [formName, setFormName] = useState('');
  const [formHookIdea, setFormHookIdea] = useState('');
  const [formPainPoint, setFormPainPoint] = useState('');
  const [formSolutionApproach, setFormSolutionApproach] = useState('');
  const [formKeySellingPoints, setFormKeySellingPoints] = useState<string[]>(['']);
  const [formTargetAudience, setFormTargetAudience] = useState('');
  const [formCallToAction, setFormCallToAction] = useState('');
  const [formSuggestedFormat, setFormSuggestedFormat] = useState('Voiceover B-roll');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'DRAFT' | 'ARCHIVED'>('ACTIVE');

  // Suggestion Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiProductSelect, setAiProductSelect] = useState<string>('');
  const [aiPillarSelect, setAiPillarSelect] = useState<string>('Nỗi đau - Giải pháp');
  const [aiSuggestions, setAiSuggestions] = useState<Array<Partial<ContentAngleItem>>>([]);

  // Copy feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingAngle, setDeletingAngle] = useState<{ id: string; name: string } | null>(null);

  // Extract unique Stores from Products & Angles
  const availableStores = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => { if (p.storeName) set.add(p.storeName); });
    angles.forEach(a => { if (a.storeName) set.add(a.storeName); });
    return Array.from(set);
  }, [products, angles]);

  // Filtered Products based on selected store
  const availableProducts = useMemo(() => {
    if (selectedStore === 'ALL') return products;
    return products.filter(p => p.storeName === selectedStore);
  }, [products, selectedStore]);

  // Form Products based on selected store in form
  const formAvailableProducts = useMemo(() => {
    if (!formStoreName) return products;
    return products.filter(p => p.storeName === formStoreName);
  }, [products, formStoreName]);

  // Filtered Angles
  const filteredAngles = useMemo(() => {
    return angles.filter(angle => {
      const matchSearch = 
        angle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        angle.hookIdea.toLowerCase().includes(searchTerm.toLowerCase()) ||
        angle.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        angle.brandName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        angle.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        angle.painPoint.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      if (selectedStore !== 'ALL' && angle.storeName !== selectedStore) return false;
      if (selectedProduct !== 'ALL' && angle.productId !== selectedProduct && angle.productSku !== selectedProduct) return false;
      if (selectedPillar !== 'ALL' && angle.pillarId !== selectedPillar && angle.pillarName !== selectedPillar) return false;
      if (selectedStatus !== 'ALL' && angle.status !== selectedStatus) return false;

      return true;
    });
  }, [angles, searchTerm, selectedStore, selectedProduct, selectedPillar, selectedStatus]);

  // Overview metrics
  const activeCount = useMemo(() => angles.filter(a => a.status === 'ACTIVE').length, [angles]);
  const totalBookingsApplied = useMemo(() => angles.reduce((sum, a) => sum + (a.usageCount || 0), 0), [angles]);
  
  // Matrix data calculation: rows = unique products, columns = pillars
  const matrixProducts = useMemo(() => {
    return selectedStore === 'ALL' ? products : products.filter(p => p.storeName === selectedStore);
  }, [products, selectedStore]);

  // Handle open create modal
  const handleOpenCreateModal = (prefillProduct?: PushProductItem, prefillPillar?: MasterContentPillar) => {
    setEditingAngle(null);
    const prod = prefillProduct || (matrixProducts[0] || products[0]);
    const pil = prefillPillar || pillars[0];

    setFormStoreName(prod?.storeName || availableStores[0] || '');
    setFormProductId(prod?.id || '');
    setFormPillarId(pil?.id || 'PIL-01');
    setFormName('');
    setFormHookIdea('');
    setFormPainPoint('');
    setFormSolutionApproach('');
    setFormKeySellingPoints(prod?.usp ? [prod.usp] : ['']);
    setFormTargetAudience(prod?.targetKocNiche ? prod.targetKocNiche.join(', ') : 'Khách hàng đa kênh');
    setFormCallToAction('Bấm ngay vào giỏ hàng góc trái để nhận ưu đãi.');
    setFormSuggestedFormat(pil?.suggestedFormats?.[0] || 'Voiceover B-roll');
    setFormStatus('ACTIVE');
    setIsModalOpen(true);
  };

  // Handle open edit modal
  const handleOpenEditModal = (angle: ContentAngleItem) => {
    setEditingAngle(angle);
    setFormStoreName(angle.storeName || '');
    setFormProductId(angle.productId || '');
    setFormPillarId(angle.pillarId || 'PIL-01');
    setFormName(angle.name);
    setFormHookIdea(angle.hookIdea);
    setFormPainPoint(angle.painPoint);
    setFormSolutionApproach(angle.solutionApproach);
    setFormKeySellingPoints(angle.keySellingPoints?.length ? [...angle.keySellingPoints] : ['']);
    setFormTargetAudience(angle.targetAudience);
    setFormCallToAction(angle.callToAction);
    setFormSuggestedFormat(angle.suggestedFormat || 'Voiceover B-roll');
    setFormStatus(angle.status);
    setIsModalOpen(true);
  };

  // Handle Save Angle
  const handleSaveAngle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formHookIdea.trim()) {
      if (onNotify) onNotify('Vui lòng nhập tên kịch bản và câu mở đầu 3 giây.', 'warning');
      return;
    }

    const matchedProd = products.find(p => p.id === formProductId) || products[0];
    const matchedPillar = pillars.find(p => p.id === formPillarId) || pillars[0];

    const cleanKsps = formKeySellingPoints.filter(k => k.trim().length > 0);

    if (editingAngle) {
      // Update
      const updated: ContentAngleItem = {
        ...editingAngle,
        name: formName.trim(),
        pillarId: matchedPillar.id,
        pillarName: matchedPillar.name,
        pillarCode: matchedPillar.code,
        productId: matchedProd?.id || formProductId,
        productName: matchedProd?.productName || editingAngle.productName,
        productSku: matchedProd?.sku || editingAngle.productSku,
        productImageUrl: matchedProd?.imageUrl || editingAngle.productImageUrl,
        brandId: matchedProd?.brandId || editingAngle.brandId,
        brandName: matchedProd?.brandName || editingAngle.brandName,
        storeId: matchedProd?.storeId || editingAngle.storeId,
        storeName: formStoreName || matchedProd?.storeName || editingAngle.storeName,
        hookIdea: formHookIdea.trim(),
        painPoint: formPainPoint.trim(),
        solutionApproach: formSolutionApproach.trim(),
        keySellingPoints: cleanKsps.length > 0 ? cleanKsps : [matchedProd?.usp || 'Sản phẩm chính hãng'],
        targetAudience: formTargetAudience.trim() || 'Người tiêu dùng',
        callToAction: formCallToAction.trim(),
        suggestedFormat: formSuggestedFormat,
        status: formStatus,
        updatedAt: new Date().toISOString().substring(0, 10)
      };

      setAngles(prev => prev.map(a => a.id === updated.id ? updated : a));
      if (onNotify) onNotify(`Đã cập nhật góc kịch bản "${updated.name}"`, 'success');
    } else {
      // Create new
      const codePrefix = matchedProd?.brandName?.toLowerCase().includes('kuti') ? 'KUTI' :
        matchedProd?.brandName?.toLowerCase().includes('roche') ? 'LRP' :
        matchedProd?.brandName?.toLowerCase().includes('royal') ? 'ROYAL' : 'ANG';

      const newAngle: ContentAngleItem = {
        id: `ang-${Date.now()}`,
        code: `ANG-${codePrefix}-${Date.now().toString().slice(-3)}`,
        name: formName.trim(),
        pillarId: matchedPillar.id,
        pillarName: matchedPillar.name,
        pillarCode: matchedPillar.code,
        productId: matchedProd?.id || formProductId,
        productName: matchedProd?.productName || 'Sản phẩm đẩy',
        productSku: matchedProd?.sku || 'SKU-GEN',
        productImageUrl: matchedProd?.imageUrl,
        brandId: matchedProd?.brandId,
        brandName: matchedProd?.brandName || 'Thương hiệu',
        storeId: matchedProd?.storeId,
        storeName: formStoreName || matchedProd?.storeName || 'Gian hàng',
        hookIdea: formHookIdea.trim(),
        painPoint: formPainPoint.trim(),
        solutionApproach: formSolutionApproach.trim(),
        keySellingPoints: cleanKsps.length > 0 ? cleanKsps : [matchedProd?.usp || 'Sản phẩm chính hãng'],
        targetAudience: formTargetAudience.trim() || 'Người tiêu dùng',
        callToAction: formCallToAction.trim(),
        suggestedFormat: formSuggestedFormat,
        status: formStatus,
        usageCount: 0,
        avgViewsEstimate: 50000,
        createdBy: currentUser?.name || 'Trưởng nhóm nội dung',
        createdAt: new Date().toISOString().substring(0, 10),
        updatedAt: new Date().toISOString().substring(0, 10)
      };

      setAngles(prev => [newAngle, ...prev]);
      if (onNotify) onNotify(`Đã thêm góc kịch bản "${newAngle.name}"`, 'success');
    }

    setIsModalOpen(false);
  };

  // Handle Delete
  const handleDeleteAngle = (id: string, name: string) => {
    setDeletingAngle({ id, name });
  };

  // Handle Copy Hook
  const handleCopyHook = (hookText: string, angleId: string) => {
    navigator.clipboard.writeText(hookText);
    setCopiedId(angleId);
    setTimeout(() => setCopiedId(null), 2500);
    if (onNotify) onNotify('Đã sao chép câu mở đầu 3 giây', 'success');
  };

  // Handle Open Suggestions
  const handleOpenAiModal = () => {
    const prod = matrixProducts[0] || products[0];
    setAiProductSelect(prod?.id || '');
    setAiPillarSelect('Nỗi đau - Giải pháp');
    generateSuggestions(prod?.productName || '', 'Nỗi đau - Giải pháp', prod?.brandName || '');
    setIsAiModalOpen(true);
  };

  const generateSuggestions = (prodName: string, pilName: string, brandName: string) => {
    const suggs = generateAiAngleSuggestions(prodName, pilName, brandName);
    setAiSuggestions(suggs);
  };

  const handleApplyAiSuggestion = (sugg: Partial<ContentAngleItem>) => {
    const matchedProd = products.find(p => p.id === aiProductSelect) || products[0];
    const matchedPillar = pillars.find(p => p.name.includes(aiPillarSelect)) || pillars[0];

    setFormStoreName(matchedProd?.storeName || '');
    setFormProductId(matchedProd?.id || '');
    setFormPillarId(matchedPillar.id);
    setFormName(sugg.name || '');
    setFormHookIdea(sugg.hookIdea || '');
    setFormPainPoint(sugg.painPoint || '');
    setFormSolutionApproach(sugg.solutionApproach || '');
    setFormKeySellingPoints(sugg.keySellingPoints || [matchedProd?.usp || '']);
    setFormTargetAudience(sugg.targetAudience || 'Khách hàng mục tiêu');
    setFormCallToAction(sugg.callToAction || '');
    setFormSuggestedFormat(sugg.suggestedFormat || 'Voiceover B-roll');
    setFormStatus('ACTIVE');

    setIsAiModalOpen(false);
    setIsModalOpen(true);
    if (onNotify) onNotify('Đã áp dụng góc kịch bản mẫu vào biểu mẫu', 'info');
  };

  // Pillar color map
  const getPillarBadgeClass = (pillarCode?: string, pillarName?: string) => {
    const name = (pillarCode || pillarName || '').toLowerCase();
    if (name.includes('problem') || name.includes('nỗi đau')) return 'text-critical';
    if (name.includes('review') || name.includes('trực tiếp')) return 'text-accent';
    if (name.includes('unbox')) return 'text-positive';
    if (name.includes('fomo') || name.includes('trend')) return 'text-warning';
    return 'text-ink-2';
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      <PageActions>
        <Button variant="secondary" icon={Lightbulb} onClick={handleOpenAiModal}>
          Gợi ý góc tiếp cận
        </Button>
        <Button variant="primary" icon={Plus} onClick={() => handleOpenCreateModal()}>
          Thêm góc tiếp cận
        </Button>
      </PageActions>

      <StatRow>
        <Stat label="Tổng số góc tiếp cận" value={angles.length} note={`${activeCount} đang dùng`} />
        <Stat label="Sản phẩm đã có góc tiếp cận" value={`${new Set(angles.map(a => a.productId)).size} / ${products.length}`} />
        <Stat label="Trụ cột nội dung tham gia" value={`${new Set(angles.map(a => a.pillarId)).size} / ${pillars.length}`} />
        <Stat label="Lượt booking KOC đã dùng" value={totalBookingsApplied} tone="positive" />
      </StatRow>

      {/* ========================================================================= */}
      {/* 2. FILTER & TOOLBAR                                                       */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên kịch bản, câu mở đầu 3s, nỗi đau, sản phẩm..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-accent focus:bg-white"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Store Filter */}
          <select
            value={selectedStore}
            onChange={(e) => {
              setSelectedStore(e.target.value);
              setSelectedProduct('ALL');
            }}
            className="text-xs h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:border-accent"
          >
            <option value="ALL">Tất cả gian hàng ({availableStores.length})</option>
            {availableStores.map(store => (
              <option key={store} value={store}>{store}</option>
            ))}
          </select>

          {/* Product Filter */}
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="text-xs h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:border-accent max-w-[200px] truncate"
          >
            <option value="ALL">Tất cả sản phẩm ({availableProducts.length})</option>
            {availableProducts.map(p => (
              <option key={p.id} value={p.id}>{p.productName}</option>
            ))}
          </select>

          {/* Pillar Filter */}
          <select
            value={selectedPillar}
            onChange={(e) => setSelectedPillar(e.target.value)}
            className="text-xs h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:border-accent"
          >
            <option value="ALL">Tất cả trụ cột ({pillars.length})</option>
            {pillars.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('CARDS')}
              title="Xem dạng thẻ kịch bản"
              className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'CARDS' ? 'bg-white text-accent shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Thẻ brief</span>
            </button>
            <button
              onClick={() => setViewMode('MATRIX')}
              title="Xem ma trận phủ sản phẩm x trụ cột"
              className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'MATRIX' ? 'bg-white text-accent shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ma trận phủ SP</span>
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              title="Xem dạng bảng chi tiết"
              className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'TABLE' ? 'bg-white text-accent shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bảng tổng hợp</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. VIEW MODE 1: CARDS GRID (THẺ BRIEF CHI TIẾT)                           */}
      {/* ========================================================================= */}
      {viewMode === 'CARDS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>Hiển thị <strong>{filteredAngles.length}</strong> góc kịch bản phù hợp</span>
            {selectedStore !== 'ALL' && (
              <span className="font-semibold text-accent">Gian hàng: {selectedStore}</span>
            )}
          </div>

          {filteredAngles.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-accent-soft text-accent flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Không tìm thấy góc kịch bản nào</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Thử thay đổi bộ lọc hoặc thêm góc kịch bản mới cho sản phẩm này.
              </p>
              <button
                onClick={() => handleOpenCreateModal()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary-hover transition"
              >
                Thêm góc tiếp cận mới
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredAngles.map((angle) => {
                const isCopied = copiedId === angle.id;

                return (
                  <div
                    key={angle.id}
                    className="bg-white border border-slate-200 hover:border-line-strong rounded-2xl p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4 relative group"
                  >
                    {/* Top Row: Product & Pillar Label */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-2xs font-medium ${getPillarBadgeClass(angle.pillarCode, angle.pillarName)}`}>
                          {angle.pillarName}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <span className="text-2xs font-mono text-slate-400 font-medium">{angle.code}</span>
                          <span className={`w-2 h-2 rounded-full ${angle.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        </div>
                      </div>

                      {/* Product & Store Tag */}
                      <div className="flex items-center gap-2 pt-0.5">
                        {angle.productImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={angle.productImageUrl}
                            alt={angle.productName}
                            className="w-7 h-7 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-900 truncate" title={angle.productName}>
                            {angle.productName}
                          </div>
                          <div className="text-2xs text-slate-500 flex items-center gap-1 truncate">
                            <Store className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{angle.storeName}</span>
                          </div>
                        </div>
                      </div>

                      {/* Angle Title */}
                      <h3 className="text-sm font-semibold text-slate-900 group-hover:text-accent transition leading-snug pt-1">
                        {angle.name}
                      </h3>
                    </div>

                    {/* Middle Section: Hook Idea (Prominent Visual) */}
                    <div className="bg-accent-soft border border-line rounded-xl p-3.5 space-y-1.5 relative">
                      <div className="flex items-center justify-between text-2xs font-semibold text-accent">
                        <span className="flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-amber-500" />
                          Mở đầu 3 giây
                        </span>
                        <button
                          onClick={() => handleCopyHook(angle.hookIdea, angle.id)}
                          className="hover:text-ink flex items-center gap-1 cursor-pointer bg-white/80 px-1.5 py-0.5 rounded border border-line"
                          title="Sao chép câu mở đầu này"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700 font-semibold text-2xs">Đã chép</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-accent" />
                              <span className="text-2xs">Chép câu mở đầu</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-slate-800 italic leading-relaxed">
                        &ldquo;{angle.hookIdea}&rdquo;
                      </p>
                    </div>

                    {/* Painpoint & Solution */}
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-2xs font-semibold text-rose-600">Nỗi đau / vấn đề: </span>
                        <span className="text-slate-600">{angle.painPoint}</span>
                      </div>
                      <div>
                        <span className="text-2xs font-semibold text-emerald-600">Hướng giải quyết: </span>
                        <span className="text-slate-600">{angle.solutionApproach}</span>
                      </div>
                    </div>

                    {/* USPs / Key Selling Points */}
                    {angle.keySellingPoints && angle.keySellingPoints.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-slate-100">
                        <span className="text-2xs font-semibold text-slate-400 block">Luận điểm bắt buộc nói:</span>
                        <div className="text-2xs text-ink-2 space-y-0.5">
                          {angle.keySellingPoints.map((usp, uIdx) => (
                            <div
                              key={uIdx}
                              className="truncate max-w-full"
                              title={usp}
                            >
                              · {usp}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Card Footer: Metadata & Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-ink-2">
                          {angle.usageCount || 0} booking đã dùng
                        </span>
                        <span className="text-slate-400">• {angle.suggestedFormat || 'Voiceover'}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        {onSelectAngleForBooking && (
                          <button
                            onClick={() => onSelectAngleForBooking(angle)}
                            className="px-2 py-1 rounded bg-primary text-white font-semibold hover:bg-primary-hover transition"
                            title="Chọn góc này cho booking deal"
                          >
                            Gắn booking
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEditModal(angle)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                          title="Sửa góc kịch bản"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAngle(angle.id, angle.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Xóa góc kịch bản"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. VIEW MODE 2: MATRIX COVERAGE (MA TRẬN SẢN PHẨM × CONTENT PILLAR)       */}
      {/* ========================================================================= */}
      {viewMode === 'MATRIX' && (
        <div className="space-y-4">


          <div className="card-enterprise overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[900px]">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 text-2xs font-semibold">
                  <tr>
                    <th className="p-3.5 pl-6 w-[280px] min-w-[280px]">Sản phẩm & gian hàng</th>
                    {pillars.map(pillar => (
                      <th key={pillar.id} className="p-3.5 text-center min-w-[140px]">
                        <div className="font-semibold text-slate-800">{pillar.name}</div>
                        <div className="text-2xs text-slate-400 font-normal font-mono lowercase">{pillar.code}</div>
                      </th>
                    ))}
                    <th className="p-3.5 pr-6 text-center w-[120px]">Tổng góc tiếp cận</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {matrixProducts.map(product => {
                    const productAngles = angles.filter(a => a.productId === product.id || a.productSku === product.sku);

                    return (
                      <tr key={product.id} className="hover:bg-slate-50/70 transition">
                        {/* Product Info */}
                        <td className="p-3.5 pl-6">
                          <div className="flex items-center gap-3">
                            {product.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={product.imageUrl}
                                alt={product.productName}
                                className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                <Package className="w-5 h-5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 text-xs truncate max-w-[200px]" title={product.productName}>
                                {product.productName}
                              </div>
                              <div className="text-2xs text-slate-500 font-mono">{product.sku}</div>
                              <div className="text-2xs text-accent font-medium truncate max-w-[200px]">{product.storeName}</div>
                            </div>
                          </div>
                        </td>

                        {/* Pillars Columns */}
                        {pillars.map(pillar => {
                          const matchedAngles = productAngles.filter(a => 
                            a.pillarId === pillar.id || 
                            a.pillarName.toLowerCase() === pillar.name.toLowerCase()
                          );
                          const hasAngles = matchedAngles.length > 0;

                          return (
                            <td key={pillar.id} className="p-3 text-center align-middle">
                              {hasAngles ? (
                                <div className="inline-flex flex-col items-center gap-0.5 group relative">
                                  <div className="text-positive font-semibold text-xs flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-positive" />
                                    <span>{matchedAngles.length} góc</span>
                                  </div>
                                  
                                  {/* Quick tooltip list of hooks */}
                                  <div className="text-2xs text-slate-500 truncate max-w-[130px]" title={matchedAngles[0].name}>
                                    {matchedAngles[0].name}
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleOpenCreateModal(product, pillar)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-50/70 hover:bg-amber-100 text-amber-800 text-2xs font-semibold border border-amber-200/80 transition flex items-center justify-center gap-1 mx-auto"
                                  title={`Thêm góc kịch bản ${pillar.name} cho sản phẩm này`}
                                >
                                  <Plus className="w-3 h-3 text-amber-600" />
                                  <span>Thiếu góc tiếp cận</span>
                                </button>
                              )}
                            </td>
                          );
                        })}

                        {/* Total Count */}
                        <td className="p-3.5 pr-6 text-center">
                          <span className={`text-xs font-semibold tabular-nums ${
                            productAngles.length >= 3 
                              ? 'text-accent' 
                              : productAngles.length > 0 
                              ? 'text-ink' 
                              : 'text-critical'
                          }`}>
                            {productAngles.length} góc
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. VIEW MODE 3: TABLE VIEW                                                */}
      {/* ========================================================================= */}
      {viewMode === 'TABLE' && (
        <div className="card-enterprise overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 text-2xs font-semibold">
                <tr>
                  <th className="p-3.5 pl-6 w-[100px]">Mã</th>
                  <th className="p-3.5 w-[220px]">Sản phẩm & gian hàng</th>
                  <th className="p-3.5 w-[140px]">Trụ cột</th>
                  <th className="p-3.5 w-[220px]">Tên góc tiếp cận</th>
                  <th className="p-3.5 min-w-[260px]">Mở đầu 3 giây</th>
                  <th className="p-3.5 w-[120px] text-center">Đã dùng</th>
                  <th className="p-3.5 w-[100px] text-center">Trạng thái</th>
                  <th className="p-3.5 pr-6 text-right w-[100px]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredAngles.map((angle) => (
                  <tr key={angle.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5 pl-6 font-mono font-semibold text-accent text-2xs">
                      {angle.code}
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900">{angle.productName}</div>
                      <div className="text-2xs text-slate-500">{angle.storeName}</div>
                    </td>
                    <td className="p-3.5">
                      <span className={`text-xs font-medium ${getPillarBadgeClass(angle.pillarCode, angle.pillarName)}`}>
                        {angle.pillarName}
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800">
                      {angle.name}
                    </td>
                    <td className="p-3.5 italic text-slate-600">
                      &ldquo;{angle.hookIdea}&rdquo;
                    </td>
                    <td className="p-3.5 text-center font-semibold text-slate-900">
                      {angle.usageCount || 0}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-2xs font-semibold ${
                        angle.status === 'ACTIVE' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {angle.status === 'ACTIVE' ? 'Đang chạy' : angle.status === 'DRAFT' ? 'Nháp' : 'Đã lưu trữ'}
                      </span>
                    </td>
                    <td className="p-3.5 pr-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditModal(angle)}
                          className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAngle(angle.id, angle.name)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL: CREATE / EDIT CONTENT ANGLE                                     */}
      {/* ========================================================================= */}
      <Presence show={!!isModalOpen}>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-accent" />
                <h2 className="text-base font-semibold text-slate-900">
                  {editingAngle ? 'Chỉnh sửa góc tiếp cận' : 'Thiết lập góc tiếp cận mới cho sản phẩm'}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveAngle} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Row 1: Store & Product & Pillar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Store */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Store className="w-3.5 h-3.5 text-slate-400" />
                    <span>Gian hàng phụ trách *</span>
                  </label>
                  <select
                    value={formStoreName}
                    onChange={(e) => {
                      setFormStoreName(e.target.value);
                      const matching = products.filter(p => p.storeName === e.target.value);
                      if (matching.length > 0) setFormProductId(matching[0].id);
                    }}
                    className="w-full text-xs h-9 px-3 rounded-lg border border-slate-200 bg-white font-medium focus:outline-none focus:border-accent"
                    required
                  >
                    {availableStores.map(store => (
                      <option key={store} value={store}>{store}</option>
                    ))}
                  </select>
                </div>

                {/* Product */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-slate-400" />
                    <span>Sản phẩm trọng tâm (SKU) *</span>
                  </label>
                  <select
                    value={formProductId}
                    onChange={(e) => {
                      setFormProductId(e.target.value);
                      const selProd = products.find(p => p.id === e.target.value);
                      if (selProd?.usp) setFormKeySellingPoints([selProd.usp]);
                    }}
                    className="w-full text-xs h-9 px-3 rounded-lg border border-slate-200 bg-white font-medium focus:outline-none focus:border-accent truncate"
                    required
                  >
                    {formAvailableProducts.map(p => (
                      <option key={p.id} value={p.id}>{p.productName} ({p.sku})</option>
                    ))}
                  </select>
                </div>

                {/* Pillar */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span>Trụ cột nội dung *</span>
                  </label>
                  <select
                    value={formPillarId}
                    onChange={(e) => setFormPillarId(e.target.value)}
                    className="w-full text-xs h-9 px-3 rounded-lg border border-slate-200 bg-white font-medium focus:outline-none focus:border-accent"
                    required
                  >
                    {pillars.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Angle Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Tên góc tiếp cận / tiêu đề kịch bản *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ví dụ: Cứu nguy da bé chàm sữa nửa đêm / Thử thách 72h không thâm sẹo"
                  className="w-full text-xs px-3.5 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-accent font-medium"
                  required
                />
              </div>

              {/* Row 3: Hook Idea (3s Opener) */}
              <div className="space-y-1.5 bg-accent-soft p-4 rounded-xl border border-line">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-500" />
                    <span>Mở đầu 3 giây (thu hút giữ chân người xem) *</span>
                  </label>
                </div>
                <textarea
                  value={formHookIdea}
                  onChange={(e) => setFormHookIdea(e.target.value)}
                  placeholder="Nhập câu thoại hoặc hành động 3 giây đầu gây tò mò / đánh trúng tâm lý..."
                  rows={2}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-line bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-accent italic"
                  required
                />
              </div>

              {/* Row 4: Pain Point & Solution Approach */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-rose-700">
                    Nỗi đau khách hàng
                  </label>
                  <textarea
                    value={formPainPoint}
                    onChange={(e) => setFormPainPoint(e.target.value)}
                    placeholder="Khách hàng đang gặp khó khăn gì trước khi tìm thấy sản phẩm?"
                    rows={3}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-emerald-700">
                    Cách lồng ghép sản phẩm làm giải pháp
                  </label>
                  <textarea
                    value={formSolutionApproach}
                    onChange={(e) => setFormSolutionApproach(e.target.value)}
                    placeholder="Sản phẩm xuất hiện ở giây thứ mấy? Giải quyết nỗi đau trên như thế nào?"
                    rows={3}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Row 5: Key Selling Points (USPs) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Luận điểm sản phẩm bắt buộc phải nói trong kịch bản
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormKeySellingPoints(prev => [...prev, ''])}
                    className="text-2xs font-semibold text-accent hover:text-ink flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Thêm luận điểm</span>
                  </button>
                </div>
                {formKeySellingPoints.map((usp, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={usp}
                      onChange={(e) => {
                        const newKsps = [...formKeySellingPoints];
                        newKsps[idx] = e.target.value;
                        setFormKeySellingPoints(newKsps);
                      }}
                      placeholder={`Luận điểm #${idx + 1}: Điểm khác biệt / thành phần / chứng nhận`}
                      className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-accent"
                    />
                    {formKeySellingPoints.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setFormKeySellingPoints(prev => prev.filter((_, i) => i !== idx))}
                        className="p-1.5 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Row 6: Target Audience & CTA & Format */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Tệp khán giả mục tiêu</label>
                  <input
                    type="text"
                    value={formTargetAudience}
                    onChange={(e) => setFormTargetAudience(e.target.value)}
                    placeholder="Mẹ bỉm có con 0-3 tuổi, Gen Z..."
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Lời kêu gọi hành động (CTA)</label>
                  <input
                    type="text"
                    value={formCallToAction}
                    onChange={(e) => setFormCallToAction(e.target.value)}
                    placeholder="Bấm ngay vào giỏ hàng vàng..."
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Định dạng video đề xuất</label>
                  <select
                    value={formSuggestedFormat}
                    onChange={(e) => setFormSuggestedFormat(e.target.value)}
                    className="w-full text-xs h-9 px-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-accent"
                  >
                    <option value="Voiceover B-roll">Lồng tiếng & cảnh quay phụ</option>
                    <option value="Review trực tiếp cận mặt">Review trực tiếp cận mặt</option>
                    <option value="POV Tình huống kịch tính">Tình huống thực tế</option>
                    <option value="Unboxing ASMR">Mở hộp</option>
                    <option value="Daily Vlog nhẹ nhàng">Nhật ký hằng ngày</option>
                    <option value="Chuyên gia / Dược sĩ tư vấn">Chuyên gia / dược sĩ tư vấn</option>
                  </select>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-600 font-medium">Trạng thái:</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'ACTIVE' | 'DRAFT' | 'ARCHIVED')}
                    className="text-xs h-8 px-2 rounded-md border border-slate-200 bg-white font-semibold"
                  >
                    <option value="ACTIVE">Đang chạy (sẵn sàng dùng)</option>
                    <option value="DRAFT">Nháp</option>
                    <option value="ARCHIVED">Lưu trữ</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary-hover shadow-xs transition"
                  >
                    {editingAngle ? 'Lưu thay đổi' : 'Tạo góc tiếp cận'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      </Presence>

      {/* ========================================================================= */}
      {/* 7. MODAL: ANGLE SUGGESTIONS                                               */}
      {/* ========================================================================= */}
      <Presence show={!!isAiModalOpen}>
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-sunken">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <h2 className="text-base font-semibold text-slate-900">
                  Gợi ý góc tiếp cận theo sản phẩm
                </h2>
              </div>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2 border-b border-slate-100">
                <div className="space-y-1">
                  <label className="text-2xs font-semibold text-slate-500">Chọn sản phẩm cần gợi ý:</label>
                  <select
                    value={aiProductSelect}
                    onChange={(e) => {
                      setAiProductSelect(e.target.value);
                      const prod = products.find(p => p.id === e.target.value);
                      generateSuggestions(prod?.productName || '', aiPillarSelect, prod?.brandName || '');
                    }}
                    className="w-full text-xs h-9 px-3 rounded-lg border border-slate-200 bg-white font-medium"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.productName} ({p.brandName})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-2xs font-semibold text-slate-500">Định hướng trụ cột:</label>
                  <select
                    value={aiPillarSelect}
                    onChange={(e) => {
                      setAiPillarSelect(e.target.value);
                      const prod = products.find(p => p.id === aiProductSelect);
                      generateSuggestions(prod?.productName || '', e.target.value, prod?.brandName || '');
                    }}
                    className="w-full text-xs h-9 px-3 rounded-lg border border-slate-200 bg-white font-medium"
                  >
                    {pillars.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Suggestions Cards */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                  <span>3 hướng tiếp cận đề xuất cho sản phẩm này:</span>
                </div>

                {aiSuggestions.map((sugg, sIdx) => (
                  <div
                    key={sIdx}
                    className="p-4 rounded-xl border border-slate-200 hover:border-line-strong bg-slate-50/50 hover:bg-white transition space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-semibold text-slate-900">{sugg.name}</h4>
                      <span className="text-2xs font-medium text-accent">
                        {sugg.pillarName}
                      </span>
                    </div>

                    <div className="p-2.5 bg-accent-soft rounded-lg border border-line text-xs italic text-slate-800">
                      <strong>Mở đầu:</strong> &ldquo;{sugg.hookIdea}&rdquo;
                    </div>

                    <p className="text-2xs text-slate-600 leading-relaxed">
                      <strong>Giải pháp:</strong> {sugg.solutionApproach}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-2xs text-slate-400">Định dạng: {sugg.suggestedFormat}</span>
                      <button
                        type="button"
                        onClick={() => handleApplyAiSuggestion(sugg)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary-hover transition flex items-center gap-1.5"
                      >
                        <span>Áp dụng hướng này</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      </Presence>
      {/* Confirm Delete Angle Dialog */}
      <ConfirmDialog
        open={Boolean(deletingAngle)}
        onOpenChange={(open) => !open && setDeletingAngle(null)}
        title="Xác nhận xóa góc kịch bản"
        description={`Bạn có chắc chắn muốn xóa góc kịch bản "${deletingAngle?.name}" không? Thao tác này không thể hoàn tác.`}
        confirmLabel="Xóa góc kịch bản"
        cancelLabel="Hủy"
        variant="danger"
        onConfirm={() => {
          if (deletingAngle) {
            setAngles(prev => prev.filter(a => a.id !== deletingAngle.id));
            if (onNotify) onNotify(`Đã xóa góc kịch bản "${deletingAngle.name}"`, 'info');
            setDeletingAngle(null);
          }
        }}
      />
    </div>
  );
};
