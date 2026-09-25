'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Building,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Flame,
  Award,
  Share2,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Download,
  AlertTriangle,
  AlertOctagon,
  Sparkles,
  HelpCircle,
  PhoneCall,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Plus,
  X,
  Filter,
  Layers,
  Lock,
  Globe,
  SlidersHorizontal,
  BookmarkCheck,
  CheckSquare
} from 'lucide-react';
import {
  BrandKnowledgeBase,
  DetailedHeroSku,
  BrandLegalCertification,
  ObjectionFaqItem,
  BlacklistKeyword,
  WhitelistKeyword,
  CrisisProtocol
} from '../../lib/types';
import { INITIAL_BRAND_KNOWLEDGE_BASES } from '../../lib/mockData';

type KnowledgeTabKey = 'SKUS' | 'LEGAL' | 'KEYWORDS' | 'OBJECTIONS' | 'VISUAL_IDENTITY';

export const BrandKnowledgeView: React.FC = () => {
  const [knowledgeBases, setKnowledgeBases] = useState<BrandKnowledgeBase[]>(INITIAL_BRAND_KNOWLEDGE_BASES);
  const [selectedBrandId, setSelectedBrandId] = useState<string>(INITIAL_BRAND_KNOWLEDGE_BASES[0]?.id || 'kb-senka');
  const [activeKnowledgeTab, setActiveKnowledgeTab] = useState<KnowledgeTabKey>('SKUS');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Copy Feedback State
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // KOC Share Portal Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareDeviceMode, setShareDeviceMode] = useState<'MOBILE' | 'DESKTOP'>('MOBILE');

  // Add Item Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addCategoryType, setAddCategoryType] = useState<'SKU' | 'LEGAL' | 'FAQ' | 'KEYWORD'>('SKU');

  // New FAQ Form State
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');
  const [newFaqConcern, setNewFaqConcern] = useState<'GIÁ_CẢ' | 'HIỆU_QUẢ_CHẬM' | 'KÍCH_ỨNG_MẨN_ĐỎ' | 'NGUỒN_GỐC_XUẤT_XỨ' | 'SO_SÁNH_ĐỐI_THỦ'>('KÍCH_ỨNG_MẨN_ĐỎ');
  const [newFaqDoPoints, setNewFaqDoPoints] = useState('');
  const [newFaqDontWords, setNewFaqDontWords] = useState('');

  // Active Brand Knowledge Base
  const currentBrand = knowledgeBases.find(b => b.id === selectedBrandId) || knowledgeBases[0];

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddNewFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) return;

    const newFaq: ObjectionFaqItem = {
      id: `faq-custom-${Date.now()}`,
      question: newFaqQuestion.trim(),
      targetConcern: newFaqConcern,
      recommendedAnswerForKoc: newFaqAnswer.trim(),
      doMentionPoints: newFaqDoPoints.split(',').map(s => s.trim()).filter(Boolean),
      dontSayWords: newFaqDontWords.split(',').map(s => s.trim()).filter(Boolean)
    };

    setKnowledgeBases(prev => prev.map(kb => {
      if (kb.id === currentBrand.id) {
        return {
          ...kb,
          objectionFaqs: [newFaq, ...kb.objectionFaqs]
        };
      }
      return kb;
    }));

    // Reset & Close
    setNewFaqQuestion('');
    setNewFaqAnswer('');
    setNewFaqDoPoints('');
    setNewFaqDontWords('');
    setIsAddModalOpen(false);
  };

  // Filtered SKUs based on search
  const filteredSkus = currentBrand.skus.filter(sku => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return sku.name.toLowerCase().includes(q)
      || sku.skuCode.toLowerCase().includes(q)
      || sku.scientificMechanism.toLowerCase().includes(q)
      || sku.uniqueSellingPoints.some(u => u.toLowerCase().includes(q))
      || sku.keyActiveIngredients.some(k => k.name.toLowerCase().includes(q));
  });

  // Filtered FAQs based on search
  const filteredFaqs = currentBrand.objectionFaqs.filter(faq => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return faq.question.toLowerCase().includes(q)
      || faq.recommendedAnswerForKoc.toLowerCase().includes(q)
      || faq.doMentionPoints.some(p => p.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 🌟 TOP TOOLBAR & GLOBAL ACTIONS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-md border border-slate-200 shadow-sm">
        {/* Brand Selector Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 whitespace-nowrap">
            <Building className="w-4 h-4 text-blue-600" /> Nhãn Hàng:
          </span>
          {knowledgeBases.map((brand) => (
            <button
              key={brand.id}
              onClick={() => setSelectedBrandId(brand.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-2 whitespace-nowrap ${
                selectedBrandId === brand.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{brand.brandName}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedBrandId === brand.id ? 'bg-blue-700 text-white' : 'bg-white text-slate-500'
              }`}>
                {brand.skus.length} SKUs
              </span>
            </button>
          ))}
        </div>

        {/* Action Buttons: Search & KOC Share Link */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tra cứu thành phần, SKU, FAQ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <button
            onClick={() => setIsShareModalOpen(true)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-semibold rounded-md shadow-sm transition flex items-center gap-1.5 whitespace-nowrap"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Sinh Link KOC</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-sm transition flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Bổ Sung Tri Thức</span>
          </button>
        </div>
      </div>

      {/* 🌟 BRAND PROFILE HEADER HERO BANNER */}
      <div className="card-enterprise p-5 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 border-slate-200">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
          <div className="space-y-3 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs px-2 py-0.5 rounded font-bold bg-blue-100 text-blue-800">
                {currentBrand.originCountry}
              </span>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{currentBrand.brandName}</h1>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-slate-600 font-medium">{currentBrand.category}</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                {currentBrand.toneTag.replace(/_/g, ' ')}
              </span>
            </div>

            <p className="text-sm font-semibold text-blue-700 italic">
              &ldquo;{currentBrand.slogan}&rdquo;
            </p>

            <p className="text-xs text-slate-600 leading-relaxed">
              {currentBrand.brandStory}
            </p>

            <div className="card-inner-box p-3 space-y-1.5 text-xs text-slate-700">
              <p>
                <strong>🎯 Đối tượng khách hàng mục tiêu:</strong> {currentBrand.targetPersonaSummary}
              </p>
              <p>
                <strong>🗣️ Giọng văn &amp; Phong cách (Tone of Voice):</strong> {currentBrand.toneOfVoice}
              </p>
            </div>
          </div>

          {/* Color Palette & Logo Assets Download Box */}
          <div className="card-inner-box p-4 space-y-3 w-full md:w-80 shrink-0">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Bộ Mã Màu Thương Hiệu (Brand Palette)
              </p>
              <div className="grid grid-cols-2 gap-2">
                {currentBrand.colors.map((color, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleCopy(`color-${idx}`, color.hex)}
                    className="flex items-center gap-2 p-1.5 rounded bg-white border border-slate-200 hover:border-slate-300 transition text-left group"
                  >
                    <span className="w-5 h-5 rounded border border-black/10 shrink-0" style={{ backgroundColor: color.hex }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-slate-800 truncate">{color.name}</p>
                      <p className="text-[10px] font-mono text-slate-500 flex items-center justify-between">
                        <span>{color.hex}</span>
                        {copiedId === `color-${idx}` ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                        )}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Tài Nguyên Logo Chuẩn
              </p>
              <div className="space-y-1">
                {currentBrand.logoDownloadUrls.map((logo, idx) => (
                  <a
                    key={idx}
                    href={logo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-medium flex items-center justify-between p-1 rounded hover:bg-slate-100 transition"
                  >
                    <span className="truncate pr-2">• {logo.format}</span>
                    <Download className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 5 KNOWLEDGE CATEGORY SUB-TABS */}
      <div className="border-b border-slate-200">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveKnowledgeTab('SKUS')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeKnowledgeTab === 'SKUS'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-500" />
            <span>Bách Khoa Toàn Thư Sản Phẩm (Hero SKUs)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold">
              {currentBrand.skus.length}
            </span>
          </button>

          <button
            onClick={() => setActiveKnowledgeTab('LEGAL')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeKnowledgeTab === 'LEGAL'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Pháp Lý & Bằng Chứng Lâm Sàng</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold">
              {currentBrand.certifications.length}
            </span>
          </button>

          <button
            onClick={() => setActiveKnowledgeTab('KEYWORDS')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeKnowledgeTab === 'KEYWORDS'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Từ Điển Blacklist & Whitelist</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold">
              {currentBrand.blacklistKeywords.length + currentBrand.whitelistKeywords.length}
            </span>
          </button>

          <button
            onClick={() => setActiveKnowledgeTab('OBJECTIONS')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeKnowledgeTab === 'OBJECTIONS'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <HelpCircle className="w-4 h-4 text-indigo-600" />
            <span>Xử Lý Phản Biện & FAQ Khủng Hoảng</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold">
              {currentBrand.objectionFaqs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveKnowledgeTab('VISUAL_IDENTITY')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeKnowledgeTab === 'VISUAL_IDENTITY'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Award className="w-4 h-4 text-purple-600" />
            <span>Quy Chuẩn Hình Ảnh Do&apos;s &amp; Don&apos;ts</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: BÁCH KHOA TOÀN THƯ HERO SKUS                                       */}
      {/* ========================================================================= */}
      {activeKnowledgeTab === 'SKUS' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5">
            {filteredSkus.map((sku) => (
              <div key={sku.id} className="card-enterprise p-5 space-y-4 bg-white">
                {/* SKU Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs px-2.5 py-0.5 rounded font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {sku.skuCode}
                      </span>
                      <h3 className="text-base font-bold text-slate-900">{sku.name}</h3>
                      <span className="text-xs text-slate-500 font-medium">({sku.volumeOrWeight})</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Phân loại: <span className="font-semibold text-slate-700">{sku.category}</span> | Giá niêm yết:{' '}
                      <span className="font-bold text-slate-900">{sku.priceVnd.toLocaleString('vi-VN')} đ</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                      Tồn kho mẫu: <strong>{sku.sampleStockCount} mẫu</strong>
                    </span>
                    <a
                      href={sku.pdpUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition flex items-center gap-1"
                    >
                      <span>Xem Gian Hàng</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Scientific Mechanism Callout */}
                <div className="p-3.5 bg-blue-50/50 rounded-md border border-blue-100 text-xs text-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-blue-800">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Cơ Chế Tác Động Khoa Học (Scientific Mechanism):</span>
                  </div>
                  <p className="leading-relaxed text-slate-700">{sku.scientificMechanism}</p>
                </div>

                {/* Key Active Ingredients & USPs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Ingredients Table */}
                  <div className="card-inner-box p-3.5 space-y-2">
                    <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span>🧪 Thành Phần Hoạt Chất Cốt Lõi (Key Actives)</span>
                    </h4>
                    <div className="space-y-2">
                      {sku.keyActiveIngredients.map((ing, idx) => (
                        <div key={idx} className="p-2 rounded bg-white border border-slate-200 space-y-0.5">
                          <div className="flex justify-between font-semibold text-slate-900">
                            <span>{ing.name}</span>
                            <span className="text-blue-600 font-mono text-[11px]">{ing.percentage || 'Chuẩn lâm sàng'}</span>
                          </div>
                          <p className="text-[11px] text-slate-500">Nguồn gốc: {ing.origin}</p>
                          <p className="text-[11px] text-slate-700 font-medium">• {ing.benefit}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* USPs & Clinical Proof */}
                  <div className="card-inner-box p-3.5 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-amber-500" />
                        <span>3-5 Đặc Tính Nổi Bật (Unique Selling Points - USPs)</span>
                      </h4>
                      <ul className="space-y-1.5 text-slate-700">
                        {sku.uniqueSellingPoints.map((usp, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{usp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-slate-800 text-[11px] space-y-1">
                      <p className="font-bold text-emerald-800">🔬 Số Liệu Kiểm Nghiệm Lâm Sàng:</p>
                      <p>{sku.clinicalTrials}</p>
                    </div>
                  </div>
                </div>

                {/* Target Audience & Contraindications (Chỉ định & Chống chỉ định) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="p-3 rounded border border-emerald-200 bg-emerald-50/30">
                    <p className="font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Chỉ Định (Ai Nên Dùng):</span>
                    </p>
                    <p className="text-slate-700">{sku.targetSkinOrUser}</p>
                  </div>

                  <div className="p-3 rounded border border-rose-200 bg-rose-50/30">
                    <p className="font-bold text-rose-900 mb-1 flex items-center gap-1.5">
                      <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                      <span>Chống Chỉ Định (Ai Không Được Dùng):</span>
                    </p>
                    <p className="text-slate-700">{sku.contraindications}</p>
                  </div>
                </div>

                {/* Usage Instructions */}
                <div className="text-xs text-slate-600 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span><strong>Hướng dẫn sử dụng:</strong> {sku.usageInstructions}</span>
                  <button
                    onClick={() => handleCopy(`sku-usp-${sku.id}`, sku.uniqueSellingPoints.join('\n• '))}
                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 hover:underline shrink-0 pl-3"
                  >
                    {copiedId === `sku-usp-${sku.id}` ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700">Đã chép USPs</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Sao Chép USPs</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PHÁP LÝ & BẰNG CHỨNG LÂM SÀNG                                      */}
      {/* ========================================================================= */}
      {activeKnowledgeTab === 'LEGAL' && (
        <div className="space-y-4">
          <div className="card-enterprise overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">Hồ Sơ Pháp Lý, Giấy Phép & Bằng Chứng Lâm Sàng</h3>
              <p className="text-xs text-slate-500">
                Toàn bộ chứng từ đã được phòng Pháp chế thẩm định, cho phép KOC trích dẫn số giấy phép trong video
              </p>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                  <th className="py-2.5 px-4">Tên Văn Bản / Giấy Phép</th>
                  <th className="py-2.5 px-3">Loại Hồ Sơ</th>
                  <th className="py-2.5 px-3">Cơ Quan Cấp</th>
                  <th className="py-2.5 px-3">Số Quyết Định</th>
                  <th className="py-2.5 px-4">Tóm Tắt Kết Luận Thẩm Định</th>
                  <th className="py-2.5 px-3 text-right">Tra Cứu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {currentBrand.certifications.map((cert) => (
                  <tr key={cert.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {cert.docTitle}
                      {cert.mandatoryDisclaimerText && (
                        <div className="mt-1.5 p-1.5 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-normal">
                          <span className="font-bold">⚠️ Tuyên bố bắt buộc:</span> &ldquo;{cert.mandatoryDisclaimerText}&rdquo;
                          <button
                            onClick={() => handleCopy(`disc-${cert.id}`, cert.mandatoryDisclaimerText!)}
                            className="ml-2 text-blue-600 hover:underline font-medium"
                          >
                            {copiedId === `disc-${cert.id}` ? 'Đã chép' : 'Sao chép'}
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                        {cert.docType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-medium">
                      {cert.issuingAuthority}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {cert.docNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-sm">
                      {cert.summaryKeyFindings}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {cert.verificationUrl ? (
                        <a
                          href={cert.verificationUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1 hover:underline"
                        >
                          <span>Xác thực</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">Lưu trữ nội bộ</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TỪ ĐIỂN BLACKLIST & WHITELIST                                      */}
      {/* ========================================================================= */}
      {activeKnowledgeTab === 'KEYWORDS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Cột Trái: Blacklist (Từ Cấm) */}
            <div className="card-enterprise p-5 space-y-4 border-rose-200 bg-rose-50/15">
              <div className="flex items-center justify-between border-b border-rose-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-rose-900 flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4 text-rose-600" />
                    <span>Từ Cấm Tuyệt Đối & Nhạy Cảm (Blacklist Vault)</span>
                  </h3>
                  <p className="text-xs text-rose-700">Tránh bị TikTok bóp tương tác hoặc Bộ Y Tế xử phạt</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                  {currentBrand.blacklistKeywords.length} từ cấm
                </span>
              </div>

              <div className="space-y-3">
                {currentBrand.blacklistKeywords.map((kw) => (
                  <div key={kw.id} className="p-3 bg-white rounded border border-rose-200 space-y-1.5 text-xs shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-900 bg-rose-100 px-2 py-0.5 rounded">
                        &ldquo;{kw.keyword}&rdquo;
                      </span>
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                        {kw.severity === 'CRITICAL_BANNED' ? 'Cấm Tuyệt Đối' : 'Cảnh Báo Đối Thủ'}
                      </span>
                    </div>

                    <p className="text-slate-600 text-[11px]">
                      <strong>Lý do cấm:</strong> {kw.rationale}
                    </p>

                    {kw.alternativeSuggestion && (
                      <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-emerald-800">
                        <span className="font-medium text-[11px]">
                          <strong>Gợi ý thay thế:</strong> {kw.alternativeSuggestion}
                        </span>
                        <button
                          onClick={() => handleCopy(`alt-${kw.id}`, kw.alternativeSuggestion!)}
                          className="text-blue-600 hover:text-blue-700 font-semibold text-[11px] flex items-center gap-1 shrink-0 ml-2"
                        >
                          {copiedId === `alt-${kw.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Cột Phải: Whitelist (Từ Khuyến Khích / Power Words) */}
            <div className="card-enterprise p-5 space-y-4 border-emerald-200 bg-emerald-50/15">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Bộ Từ Khóa Thắng Lợi (Whitelist & Winning Phrases)</span>
                  </h3>
                  <p className="text-xs text-emerald-700">Các cụm từ kích thích chuyển đổi cao và hợp chuẩn 100%</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  {currentBrand.whitelistKeywords.length} cụm từ
                </span>
              </div>

              <div className="space-y-3">
                {currentBrand.whitelistKeywords.map((wkw) => (
                  <div key={wkw.id} className="p-3 bg-white rounded border border-emerald-200 space-y-1.5 text-xs shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded">
                        &ldquo;{wkw.phrase}&rdquo;
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        {wkw.category.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <p className="text-slate-700 italic text-[11px]">
                      <strong>Ví dụ trong video:</strong> &ldquo;{wkw.exampleUsage}&rdquo;
                    </p>

                    <p className="text-[11px] text-slate-500">
                      <strong>Lợi ích:</strong> {wkw.benefitNotes}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: XỬ LÝ PHẢN BIỆN & FAQ KHỦNG HOẢNG                                  */}
      {/* ========================================================================= */}
      {activeKnowledgeTab === 'OBJECTIONS' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4">
            {filteredFaqs.map((faq) => (
              <div key={faq.id} className="card-enterprise p-5 space-y-3 bg-white">
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                      Vấn Đề: {faq.targetConcern.replace(/_/g, ' ')}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">
                      ❓ {faq.question}
                    </h4>
                  </div>
                  <button
                    onClick={() => handleCopy(`faq-ans-${faq.id}`, faq.recommendedAnswerForKoc)}
                    className="text-blue-600 hover:text-blue-700 font-semibold text-xs flex items-center gap-1 shrink-0"
                  >
                    {copiedId === `faq-ans-${faq.id}` ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Đã chép câu trả lời</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao Chép Lời Thoại KOC</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Recommended Answer for KOC */}
                <div className="p-3 bg-indigo-50/40 rounded-md border border-indigo-100 text-xs text-slate-800 space-y-1">
                  <p className="font-bold text-indigo-900">💬 Câu Trả Lời Mẫu Chuẩn Cho KOC (Livestream &amp; Comment):</p>
                  <p className="leading-relaxed text-slate-700 font-medium">
                    &ldquo;{faq.recommendedAnswerForKoc}&rdquo;
                  </p>
                </div>

                {/* Do Mention & Don't Say Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="p-2.5 rounded bg-emerald-50/50 border border-emerald-200 space-y-1">
                    <p className="font-bold text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>KOC Nên Nhắc Đến:</span>
                    </p>
                    <ul className="space-y-0.5 text-slate-700 text-[11px]">
                      {faq.doMentionPoints.map((pt, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <span className="text-emerald-600 font-bold">•</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-2.5 rounded bg-rose-50/50 border border-rose-200 space-y-1">
                    <p className="font-bold text-rose-800 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Tuyệt Đối Không Nói:</span>
                    </p>
                    <ul className="space-y-0.5 text-slate-700 text-[11px]">
                      {faq.dontSayWords.map((pt, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <span className="text-rose-600 font-bold">•</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Crisis Management Protocol Box */}
          {currentBrand.crisisProtocols.length > 0 && (
            <div className="card-enterprise p-5 bg-gradient-to-r from-amber-50/40 to-slate-50 border-amber-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Quy Trình Xử Lý Sự Cố &amp; Khiếu Nại Khẩn Cấp (Crisis Protocol)</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {currentBrand.crisisProtocols.map((cp, idx) => (
                  <div key={idx} className="p-3 bg-white rounded border border-amber-200 space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>Bước {cp.stepNumber}: {cp.actionTitle}</span>
                      <span className="text-amber-700 text-[10px] bg-amber-100 px-1.5 py-0.5 rounded">
                        SLA: {cp.slaResponseMinutes} phút
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px]">{cp.guidelineDescription}</p>
                    <p className="text-[11px] text-blue-700 font-medium">📞 Đầu mối liên hệ: {cp.contactPic}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: QUY CHUẨN HÌNH ẢNH DO'S & DON'TS                                   */}
      {/* ========================================================================= */}
      {activeKnowledgeTab === 'VISUAL_IDENTITY' && (
        <div className="space-y-5">
          <div className="card-enterprise p-4 bg-white space-y-2 text-xs">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-600" />
              <span>Nguyên Tắc Hiển Thị Logo &amp; Nhận Diện (Safe Space)</span>
            </h4>
            <p className="text-slate-600 leading-relaxed">{currentBrand.logoAssetRules}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="card-enterprise p-5 border-emerald-200 bg-emerald-50/20 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Quy Chuẩn Hình Ảnh Khuyến Khích (Visual Do&apos;s)</span>
              </h4>
              <ul className="space-y-2 text-xs text-slate-700">
                {currentBrand.visualDoList.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card-enterprise p-5 border-rose-200 bg-rose-50/20 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Điều Cấm Kỵ Trong Video / Hình Ảnh (Visual Don&apos;ts)</span>
              </h4>
              <ul className="space-y-2 text-xs text-slate-700">
                {currentBrand.visualDontList.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <X className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SINH LINK CHIA SẺ KOC (KOC VIEW-ONLY SHARE PORTAL)                 */}
      {/* ========================================================================= */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-4xl shadow-2xl overflow-hidden my-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Cổng Chia Sẻ Tri Thức Cho KOC — {currentBrand.brandName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Link công khai chỉ hiển thị USPs, Từ cấm &amp; Hướng dẫn (Ẩn toàn bộ chi phí/P&amp;L nội bộ)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-slate-200 p-1 rounded text-xs font-semibold">
                  <button
                    onClick={() => setShareDeviceMode('MOBILE')}
                    className={`px-2.5 py-0.5 rounded transition ${
                      shareDeviceMode === 'MOBILE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Mobile View
                  </button>
                  <button
                    onClick={() => setShareDeviceMode('DESKTOP')}
                    className={`px-2.5 py-0.5 rounded transition ${
                      shareDeviceMode === 'DESKTOP' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Desktop View
                  </button>
                </div>

                <button
                  onClick={() => setIsShareModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Share Link Strip */}
            <div className="p-4 bg-emerald-50/50 border-b border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-slate-600 font-medium">Link KOC:</span>
                <span className="font-mono bg-white px-3 py-1 rounded border border-slate-200 text-slate-800 font-bold truncate">
                  https://upbase.vn/brand-guideline/{currentBrand.publicShareSlug}?pin={currentBrand.shareAccessPin || 'OPEN'}
                </span>
              </div>

              <button
                onClick={() => handleCopy('share-link', `https://upbase.vn/brand-guideline/${currentBrand.publicShareSlug}?pin=${currentBrand.shareAccessPin || 'OPEN'}`)}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded shadow-xs transition flex items-center gap-1.5 shrink-0"
              >
                {copiedId === 'share-link' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Đã Sao Chép Link Gửi KOC!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao Chép Link Gửi KOC</span>
                  </>
                )}
              </button>
            </div>

            {/* Live Preview Container */}
            <div className="p-6 bg-slate-100 flex justify-center max-h-[65vh] overflow-y-auto">
              <div className={`bg-white rounded-lg border border-slate-200 shadow-md p-6 space-y-5 transition-all duration-200 ${
                shareDeviceMode === 'MOBILE' ? 'w-full max-w-sm text-xs' : 'w-full max-w-2xl text-xs'
              }`}>
                {/* KOC Portal Header */}
                <div className="text-center space-y-1.5 border-b border-slate-100 pb-4">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                    BẢNG HƯỚNG DẪN DÀNH CHO CREATOR / KOC
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">{currentBrand.brandName}</h3>
                  <p className="text-xs text-blue-700 italic">&ldquo;{currentBrand.slogan}&rdquo;</p>
                  <p className="text-[11px] text-slate-500">Giọng điệu: <strong>{currentBrand.toneOfVoice}</strong></p>
                </div>

                {/* Hero SKUs Quick Cards */}
                <div className="space-y-2">
                  <p className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    <span>Sản Phẩm Chủ Lực Cần Quay</span>
                  </p>
                  {currentBrand.skus.map((sku) => (
                    <div key={sku.id} className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1.5">
                      <div className="flex justify-between font-bold text-slate-900">
                        <span>{sku.name}</span>
                        <span className="text-blue-700">{sku.priceVnd.toLocaleString('vi-VN')} đ</span>
                      </div>
                      <p className="text-[11px] text-slate-600"><strong>Cơ chế:</strong> {sku.scientificMechanism}</p>
                      <div className="space-y-0.5 pt-1">
                        {sku.uniqueSellingPoints.map((usp, idx) => (
                          <p key={idx} className="text-[11px] text-slate-700 flex items-start gap-1">
                            <span className="text-emerald-600 font-bold">•</span>
                            <span>{usp}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Blacklist Warning */}
                <div className="p-3 bg-rose-50 rounded border border-rose-200 space-y-1">
                  <p className="font-bold text-rose-800 flex items-center gap-1">
                    <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                    <span>Lưu Ý Cấm Kỵ (Tuyệt Đối Không Dùng Từ Này)</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {currentBrand.blacklistKeywords.map((kw) => (
                      <span key={kw.id} className="px-2 py-0.5 bg-white text-rose-800 rounded border border-rose-200 font-bold text-[10px]">
                        ✕ {kw.keyword}
                      </span>
                    ))}
                  </div>
                </div>

                {/* FAQ Quick Objection */}
                {currentBrand.objectionFaqs[0] && (
                  <div className="p-3 bg-indigo-50 rounded border border-indigo-200 space-y-1">
                    <p className="font-bold text-indigo-900">💡 Gợi ý trả lời khi bị người xem hỏi khó:</p>
                    <p className="text-[11px] font-semibold text-slate-800">Q: {currentBrand.objectionFaqs[0].question}</p>
                    <p className="text-[11px] text-slate-600">&ldquo;{currentBrand.objectionFaqs[0].recommendedAnswerForKoc}&rdquo;</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BỔ SUNG TRI THỨC MỚI (ADD FAQ / SKU / LEGAL)                      */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Thêm Câu Hỏi Xử Lý Phản Biện FAQ ({currentBrand.brandName})
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewFaq} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nhóm Vấn Đề (Concern Category) *
                </label>
                <select
                  value={newFaqConcern}
                  onChange={(e) => setNewFaqConcern(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="KÍCH_ỨNG_MẨN_ĐỎ">Kích Ứng / Mẩn Đỏ / Da Nhạy Cảm</option>
                  <option value="GIÁ_CẢ">Giá Cả / So Sánh Đắt Rẻ</option>
                  <option value="HIỆU_QUẢ_CHẬM">Hiệu Quả / Tác Dụng Chậm</option>
                  <option value="NGUỒN_GỐC_XUẤT_XỨ">Nguồn Gốc / Hàng Giả / Xách Tay</option>
                  <option value="SO_SÁNH_ĐỐI_THỦ">So Sánh Trực Tiếp Đối Thủ</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Câu Hỏi Hóc Búa Của Người Xem *
                </label>
                <input
                  type="text"
                  placeholder="VD: Dùng có bị đẩy mụn ẩn không? Sao giá đắt hơn shop khác?"
                  value={newFaqQuestion}
                  onChange={(e) => setNewFaqQuestion(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Câu Trả Lời Mẫu Chuẩn Cho KOC (Đã duyệt) *
                </label>
                <textarea
                  rows={3}
                  placeholder="Lời thoại mẫu chuẩn khoa học để KOC đọc trên Live hoặc trả lời bình luận..."
                  value={newFaqAnswer}
                  onChange={(e) => setNewFaqAnswer(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Những Điểm KOC NÊN Nhấn Mạnh (Cách nhau bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  placeholder="VD: Kiểm nghiệm lâm sàng, pH 5.0, Tem chống giả chính hãng"
                  value={newFaqDoPoints}
                  onChange={(e) => setNewFaqDoPoints(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Những Từ KOC TUYỆT ĐỐI TRÁNH Nói (Cách nhau bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  placeholder="VD: Khô rát, Thuốc trị, Hút cạn dầu"
                  value={newFaqDontWords}
                  onChange={(e) => setNewFaqDontWords(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-2 border border-slate-200 rounded font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition"
                >
                  Lưu Vào Bách Khoa Tri Thức
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
