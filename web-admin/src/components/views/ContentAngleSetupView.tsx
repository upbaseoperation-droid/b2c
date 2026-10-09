'use client';

import React, { useState, useMemo } from 'react';
import { ConfirmDialog } from '../ui';
import { 
  Sparkles, 
  Layers, 
  Search, 
  Plus, 
  Filter, 
  Copy, 
  Check, 
  Edit3, 
  Trash2, 
  Flame, 
  Zap, 
  Store, 
  Package, 
  Tag, 
  Users, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  HelpCircle, 
  ExternalLink,
  ChevronDown,
  LayoutGrid,
  Table as TableIcon,
  Grid3X3,
  Lightbulb,
  ArrowRight,
  Info,
  X,
  Share2,
  Video
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
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

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

  // AI Generator Modal State
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
    setFormCallToAction('Bấm ngay vào giỏ hàng góc trái để nhận ưu đãi độc quyền!');
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
      if (onNotify) onNotify('Vui lòng nhập tên kịch bản và câu Hook 3 giây đầu!', 'warning');
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
      if (onNotify) onNotify(`Đã cập nhật góc kịch bản "${updated.name}" thành công!`, 'success');
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
        createdBy: currentUser?.name || 'Content Lead',
        createdAt: new Date().toISOString().substring(0, 10),
        updatedAt: new Date().toISOString().substring(0, 10)
      };

      setAngles(prev => [newAngle, ...prev]);
      if (onNotify) onNotify(`Đã thêm mới góc kịch bản "${newAngle.name}" cho sản phẩm!`, 'success');
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
    if (onNotify) onNotify('Đã sao chép câu Hook 3 giây vào bộ nhớ tạm!', 'success');
  };

  // Handle Open AI Suggestions
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
    if (onNotify) onNotify('Đã áp dụng gợi ý kịch bản AI vào biểu mẫu!', 'info');
  };

  // Pillar color map
  const getPillarBadgeClass = (pillarCode?: string, pillarName?: string) => {
    const name = (pillarCode || pillarName || '').toLowerCase();
    if (name.includes('problem') || name.includes('nỗi đau')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (name.includes('review') || name.includes('trực tiếp')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (name.includes('unbox')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (name.includes('fomo') || name.includes('trend')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (name.includes('vlog') || name.includes('story')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (name.includes('controversial') || name.includes('tranh cãi')) return 'bg-pink-50 text-pink-700 border-pink-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* ========================================================================= */}
      {/* 1. HEADER & HERO ACTION BAR                                               */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-50 via-blue-50 to-transparent -mr-20 -mt-20 rounded-full blur-3xl opacity-70 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200/80 text-purple-700 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Phân Hệ Kịch Bản Chiến Lược</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Thiết Lập & Quản Lý Góc Nội Dung (Content Angles)
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              Phân rã <strong>Trụ cột nội dung (Content Pillars)</strong> thành các <strong>hướng kịch bản chi tiết đi theo từng sản phẩm của gian hàng</strong>. Cung cấp sẵn Hook 3s, nỗi đau khách hàng & luận điểm USP để các bạn Booking PIC gắn trực tiếp cho KOC khi phân bổ kế hoạch.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleOpenAiModal}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs hover:opacity-95 transition flex items-center gap-2 cursor-pointer"
            >
              <Lightbulb className="w-4 h-4 text-amber-300" />
              <span>Gợi ý kịch bản AI</span>
            </button>

            <button
              onClick={() => handleOpenCreateModal()}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Thêm Content Angle</span>
            </button>
          </div>
        </div>

        {/* Overview Metric Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100">
          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60">
            <div className="text-2xs text-slate-500 font-medium">Tổng số Content Angles</div>
            <div className="text-lg font-bold text-slate-900 mt-0.5 flex items-baseline gap-1.5">
              <span>{angles.length}</span>
              <span className="text-2xs font-semibold text-emerald-600">({activeCount} Active)</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60">
            <div className="text-2xs text-slate-500 font-medium">Sản phẩm đã phủ Angles</div>
            <div className="text-lg font-bold text-purple-700 mt-0.5 flex items-baseline gap-1.5">
              <span>{new Set(angles.map(a => a.productId)).size}</span>
              <span className="text-2xs text-slate-500">/ {products.length} SP đẩy</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60">
            <div className="text-2xs text-slate-500 font-medium">Trụ cột (Pillars) tham gia</div>
            <div className="text-lg font-bold text-blue-700 mt-0.5 flex items-baseline gap-1.5">
              <span>{new Set(angles.map(a => a.pillarId)).size}</span>
              <span className="text-2xs text-slate-500">/ {pillars.length} Pillars</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60">
            <div className="text-2xs text-slate-500 font-medium">Lượt Booking KOC đã dùng</div>
            <div className="text-lg font-bold text-emerald-600 mt-0.5 flex items-baseline gap-1.5">
              <span>{totalBookingsApplied}</span>
              <span className="text-2xs text-slate-500">deals</span>
            </div>
          </div>
        </div>
      </div>

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
            placeholder="Tìm theo tên kịch bản, câu Hook 3s, nỗi đau, sản phẩm..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:bg-white"
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
            className="text-xs h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:border-purple-500"
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
            className="text-xs h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:border-purple-500 max-w-[200px] truncate"
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
            className="text-xs h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:border-purple-500"
          >
            <option value="ALL">Tất cả Pillars ({pillars.length})</option>
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
                viewMode === 'CARDS' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Thẻ Brief</span>
            </button>
            <button
              onClick={() => setViewMode('MATRIX')}
              title="Xem ma trận phủ sản phẩm x pillar"
              className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'MATRIX' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ma Trận Phủ SP</span>
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              title="Xem dạng bảng chi tiết"
              className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'TABLE' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bảng Tổng Hợp</span>
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
              <span className="font-semibold text-purple-700">Gian hàng: {selectedStore}</span>
            )}
          </div>

          {filteredAngles.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Không tìm thấy góc kịch bản nào</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Thử thay đổi bộ lọc hoặc thêm góc kịch bản mới cho sản phẩm này.
              </p>
              <button
                onClick={() => handleOpenCreateModal()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 transition"
              >
                + Thêm Content Angle Mới
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredAngles.map((angle) => {
                const isCopied = copiedId === angle.id;

                return (
                  <div
                    key={angle.id}
                    className="bg-white border border-slate-200 hover:border-purple-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4 relative group"
                  >
                    {/* Top Row: Product & Pillar Badge */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-2xs font-semibold border ${getPillarBadgeClass(angle.pillarCode, angle.pillarName)}`}>
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
                          <div className="text-xs font-bold text-slate-900 truncate" title={angle.productName}>
                            {angle.productName}
                          </div>
                          <div className="text-2xs text-slate-500 flex items-center gap-1 truncate">
                            <Store className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{angle.storeName}</span>
                          </div>
                        </div>
                      </div>

                      {/* Angle Title */}
                      <h3 className="text-sm font-semibold text-slate-900 group-hover:text-purple-700 transition leading-snug pt-1">
                        {angle.name}
                      </h3>
                    </div>

                    {/* Middle Section: Hook Idea (Prominent Visual) */}
                    <div className="bg-purple-50/70 border border-purple-200/80 rounded-xl p-3.5 space-y-1.5 relative">
                      <div className="flex items-center justify-between text-2xs font-bold text-purple-700 uppercase tracking-wide">
                        <span className="flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-amber-500" />
                          Hook 3 Giây Đầu (Viral Opener)
                        </span>
                        <button
                          onClick={() => handleCopyHook(angle.hookIdea, angle.id)}
                          className="hover:text-purple-900 flex items-center gap-1 cursor-pointer bg-white/80 px-1.5 py-0.5 rounded border border-purple-200"
                          title="Sao chép câu hook này"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700 font-semibold text-2xs">Đã chép</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-purple-600" />
                              <span className="text-2xs">Chép Hook</span>
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
                        <span className="text-2xs font-semibold text-rose-600 uppercase tracking-wide">Nỗi đau / Vấn đề: </span>
                        <span className="text-slate-600">{angle.painPoint}</span>
                      </div>
                      <div>
                        <span className="text-2xs font-semibold text-emerald-600 uppercase tracking-wide">Hướng giải quyết: </span>
                        <span className="text-slate-600">{angle.solutionApproach}</span>
                      </div>
                    </div>

                    {/* USPs / Key Selling Points */}
                    {angle.keySellingPoints && angle.keySellingPoints.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-slate-100">
                        <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wide block">USPs Bắt Buộc Nói:</span>
                        <div className="flex flex-wrap gap-1">
                          {angle.keySellingPoints.map((usp, uIdx) => (
                            <span
                              key={uIdx}
                              className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-2xs border border-slate-200/80 truncate max-w-full"
                              title={usp}
                            >
                              • {usp}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Card Footer: Metadata & Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          {angle.usageCount || 0} booking đã dùng
                        </span>
                        <span className="text-slate-400">• {angle.suggestedFormat || 'Voiceover'}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        {onSelectAngleForBooking && (
                          <button
                            onClick={() => onSelectAngleForBooking(angle)}
                            className="px-2 py-1 rounded bg-purple-600 text-white font-semibold hover:bg-purple-700 transition"
                            title="Chọn góc này cho booking deal"
                          >
                            Gắn Booking
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
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-xs text-blue-900">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold">Ma trận mức độ sẵn sàng kịch bản (Content Angles Coverage):</strong>
              <p className="text-blue-700 mt-0.5">
                Bảng này thể hiện mỗi sản phẩm trọng tâm của gian hàng đã có bao nhiêu góc kịch bản ứng với từng Trụ cột nội dung (Content Pillar). Ô màu vàng / trống nghĩa là sản phẩm đó chưa có góc kịch bản ở trụ cột tương ứng — bấm vào nút <strong className="font-semibold">+</strong> tại ô để bổ sung kịch bản tức thì!
              </p>
            </div>
          </div>

          <div className="card-enterprise overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[900px]">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 text-2xs font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5 pl-6 w-[280px] min-w-[280px]">Sản Phẩm & Gian Hàng</th>
                    {pillars.map(pillar => (
                      <th key={pillar.id} className="p-3.5 text-center min-w-[140px]">
                        <div className="font-semibold text-slate-800">{pillar.name}</div>
                        <div className="text-3xs text-slate-400 font-normal font-mono lowercase">{pillar.code}</div>
                      </th>
                    ))}
                    <th className="p-3.5 pr-6 text-center w-[120px]">Tổng Angles</th>
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
                              <div className="font-bold text-slate-900 text-xs truncate max-w-[200px]" title={product.productName}>
                                {product.productName}
                              </div>
                              <div className="text-2xs text-slate-500 font-mono">{product.sku}</div>
                              <div className="text-2xs text-purple-700 font-medium truncate max-w-[200px]">{product.storeName}</div>
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
                                <div className="inline-flex flex-col items-center gap-1 group relative">
                                  <div className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 flex items-center gap-1 shadow-xs">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>{matchedAngles.length} Angle{matchedAngles.length > 1 ? 's' : ''}</span>
                                  </div>
                                  
                                  {/* Quick tooltip list of hooks */}
                                  <div className="text-3xs text-slate-500 truncate max-w-[130px]" title={matchedAngles[0].name}>
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
                                  <span>Thiếu Angle</span>
                                </button>
                              )}
                            </td>
                          );
                        })}

                        {/* Total Count */}
                        <td className="p-3.5 pr-6 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                            productAngles.length >= 3 
                              ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                              : productAngles.length > 0 
                              ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {productAngles.length} Angles
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
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 text-2xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 pl-6 w-[100px]">Mã</th>
                  <th className="p-3.5 w-[220px]">Sản Phẩm & Gian Hàng</th>
                  <th className="p-3.5 w-[140px]">Trụ Cột (Pillar)</th>
                  <th className="p-3.5 w-[220px]">Tên Góc Tiếp Cận</th>
                  <th className="p-3.5 min-w-[260px]">Hook 3 Giây Đầu</th>
                  <th className="p-3.5 w-[120px] text-center">Đã Dùng</th>
                  <th className="p-3.5 w-[100px] text-center">Trạng Thái</th>
                  <th className="p-3.5 pr-6 text-right w-[100px]">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredAngles.map((angle) => (
                  <tr key={angle.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5 pl-6 font-mono font-semibold text-purple-700 text-2xs">
                      {angle.code}
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900">{angle.productName}</div>
                      <div className="text-2xs text-slate-500">{angle.storeName}</div>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-2xs font-semibold border ${getPillarBadgeClass(angle.pillarCode, angle.pillarName)}`}>
                        {angle.pillarName}
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800">
                      {angle.name}
                    </td>
                    <td className="p-3.5 italic text-slate-600">
                      &ldquo;{angle.hookIdea}&rdquo;
                    </td>
                    <td className="p-3.5 text-center font-bold text-slate-900">
                      {angle.usageCount || 0}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-2xs font-semibold ${
                        angle.status === 'ACTIVE' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {angle.status}
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
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h2 className="text-base font-bold text-slate-900">
                  {editingAngle ? 'Chỉnh Sửa Góc Kịch Bản (Content Angle)' : 'Thiết Lập Góc Kịch Bản Mới Cho Sản Phẩm'}
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
                    className="w-full text-xs h-9 px-3 rounded-lg border border-slate-200 bg-white font-medium focus:outline-none focus:border-purple-500"
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
                    className="w-full text-xs h-9 px-3 rounded-lg border border-slate-200 bg-white font-medium focus:outline-none focus:border-purple-500 truncate"
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
                    <span>Trụ cột nội dung (Pillar) *</span>
                  </label>
                  <select
                    value={formPillarId}
                    onChange={(e) => setFormPillarId(e.target.value)}
                    className="w-full text-xs h-9 px-3 rounded-lg border border-slate-200 bg-white font-medium focus:outline-none focus:border-purple-500"
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
                  Tên góc tiếp cận / Tiêu đề kịch bản *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ví dụ: Cứu nguy da bé chàm sữa nửa đêm / Thử thách 72h không thâm sẹo"
                  className="w-full text-xs px-3.5 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-purple-500 font-medium"
                  required
                />
              </div>

              {/* Row 3: Hook Idea (3s Opener) */}
              <div className="space-y-1.5 bg-purple-50/60 p-4 rounded-xl border border-purple-200/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-500" />
                    <span>Hook 3 Giây Đầu Mở Màn Video (Cốt lõi thu hút giữ chân) *</span>
                  </label>
                  <span className="text-2xs text-purple-600 font-semibold">Tỷ lệ giữ chân quyết định GMV</span>
                </div>
                <textarea
                  value={formHookIdea}
                  onChange={(e) => setFormHookIdea(e.target.value)}
                  placeholder="Nhập câu thoại hoặc hành động 3 giây đầu gây tò mò / giật mình / đánh trúng tâm lý..."
                  rows={2}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-purple-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600 italic"
                  required
                />
              </div>

              {/* Row 4: Pain Point & Solution Approach */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-rose-700">
                    Nỗi đau khách hàng / Insight cốt lõi
                  </label>
                  <textarea
                    value={formPainPoint}
                    onChange={(e) => setFormPainPoint(e.target.value)}
                    placeholder="Khách hàng đang gặp khó khăn gì? Bức xúc gì trước khi tìm thấy sản phẩm?"
                    rows={3}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-purple-500"
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
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Row 5: Key Selling Points (USPs) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Luận điểm USP bắt buộc phải nói trong kịch bản (Key Selling Points)
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormKeySellingPoints(prev => [...prev, ''])}
                    className="text-2xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Thêm USP</span>
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
                      placeholder={`USP #${idx + 1}: Điểm khác biệt / Thành phần độc quyền / Chứng nhận`}
                      className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-purple-500"
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
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Lời kêu gọi hành động (CTA)</label>
                  <input
                    type="text"
                    value={formCallToAction}
                    onChange={(e) => setFormCallToAction(e.target.value)}
                    placeholder="Bấm ngay vào giỏ hàng vàng..."
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Định dạng video đề xuất</label>
                  <select
                    value={formSuggestedFormat}
                    onChange={(e) => setFormSuggestedFormat(e.target.value)}
                    className="w-full text-xs h-9 px-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Voiceover B-roll">Voiceover B-roll</option>
                    <option value="Review trực tiếp cận mặt">Review trực tiếp cận mặt</option>
                    <option value="POV Tình huống kịch tính">POV Tình huống kịch tính</option>
                    <option value="Unboxing ASMR">Unboxing ASMR</option>
                    <option value="Daily Vlog nhẹ nhàng">Daily Vlog nhẹ nhàng</option>
                    <option value="Chuyên gia / Dược sĩ tư vấn">Chuyên gia / Dược sĩ tư vấn</option>
                  </select>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-600 font-medium">Trạng thái:</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="text-xs h-8 px-2 rounded-md border border-slate-200 bg-white font-semibold"
                  >
                    <option value="ACTIVE">ACTIVE (Sẵn sàng dùng)</option>
                    <option value="DRAFT">DRAFT (Bản nháp)</option>
                    <option value="ARCHIVED">ARCHIVED (Lưu trữ)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 shadow-xs transition"
                  >
                    {editingAngle ? 'Lưu Thay Đổi' : 'Tạo Content Angle'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL: AI MAGIC ANGLE SUGGESTIONS                                      */}
      {/* ========================================================================= */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <h2 className="text-base font-bold text-slate-900">
                  Trợ Lý AI Gợi Ý Góc Kịch Bản (Smart Content Angles Generator)
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
                  <label className="text-2xs font-semibold text-slate-500 uppercase">Chọn sản phẩm cần gợi ý:</label>
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
                  <label className="text-2xs font-semibold text-slate-500 uppercase">Định hướng Trụ cột:</label>
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
                <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>3 Hướng tiếp cận được AI đề xuất cho sản phẩm này:</span>
                  <span className="text-2xs text-purple-600 font-semibold">Tối ưu theo thị hiếu TikTok Shop 2026</span>
                </div>

                {aiSuggestions.map((sugg, sIdx) => (
                  <div
                    key={sIdx}
                    className="p-4 rounded-xl border border-slate-200 hover:border-purple-300 bg-slate-50/50 hover:bg-white transition space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900">{sugg.name}</h4>
                      <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        {sugg.pillarName}
                      </span>
                    </div>

                    <div className="p-2.5 bg-purple-50/80 rounded-lg border border-purple-200 text-xs italic text-slate-800">
                      <strong>Hook:</strong> &ldquo;{sugg.hookIdea}&rdquo;
                    </div>

                    <p className="text-2xs text-slate-600 leading-relaxed">
                      <strong>Giải pháp:</strong> {sugg.solutionApproach}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-2xs text-slate-400">Format: {sugg.suggestedFormat}</span>
                      <button
                        type="button"
                        onClick={() => handleApplyAiSuggestion(sugg)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 transition flex items-center gap-1.5"
                      >
                        <span>Áp Dụng Hướng Này</span>
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
