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
  CheckSquare,
  RotateCcw,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Wand2,
  Lightbulb,
  FolderOpen,
  LayoutDashboard,
  CheckCheck,
  Save,
  Coins,
  TrendingUp,
  Building2
} from 'lucide-react';
import {
  BrandKnowledgeBase,
  DetailedHeroSku,
  BrandLegalCertification,
  ObjectionFaqItem,
  BlacklistKeyword,
  WhitelistKeyword,
  CrisisProtocol,
  AiScriptAnalysisResult,
  UserProfile,
  BrandDetail
} from '../../lib/types';
import { INITIAL_BRAND_KNOWLEDGE_BASES } from '../../lib/mockData';
import { UPBASE_BRANDS_MASTER } from '../../lib/importedMasterData';
import { analyzeScriptWithAi } from '../../lib/aiScriptAnalyzer';
import { BrandDocumentsTab } from './BrandDocumentsTab';
import { SAMPLE_BRAND_DOCUMENTS } from '../../lib/brandDocumentExtractor';

export interface BrandKnowledgeViewProps {
  currentUser?: UserProfile | null;
  selectedBrand?: string;
  brands?: BrandDetail[];
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onNavigateBackToBrands?: () => void;
}

type KnowledgeTabKey = 
  | 'OVERVIEW_PIC' 
  | 'RATECARD_CEILING' 
  | 'DOCUMENTS' 
  | 'SKUS' 
  | 'LEGAL' 
  | 'KEYWORDS' 
  | 'OBJECTIONS' 
  | 'VISUAL_IDENTITY' 
  | 'AI_INSPECTOR';

export const BrandKnowledgeView: React.FC<BrandKnowledgeViewProps> = ({
  currentUser,
  selectedBrand = 'ALL',
  brands,
  onNotify,
  onNavigateBackToBrands
}) => {
  const [knowledgeBases, setKnowledgeBases] = useState<BrandKnowledgeBase[]>(() => {
    const list: BrandKnowledgeBase[] = INITIAL_BRAND_KNOWLEDGE_BASES.map(brand => ({
      ...brand,
      documents: brand.documents || SAMPLE_BRAND_DOCUMENTS.filter(
        d => d.brandId === brand.id || d.brandName.toLowerCase() === brand.brandName.toLowerCase()
      ),
      isConfigured: true,
      ratecardCeiling: brand.ratecardCeiling || [
        { grade: 'KL1', maxBudget: 500000, description: 'Creator khởi đầu (< 500k)' },
        { grade: 'KL2', maxBudget: 1500000, description: 'Micro Creator (500k - 1.5tr)' },
        { grade: 'KL3', maxBudget: 3500000, description: 'Mid Creator (1.5tr - 3.5tr)' },
        { grade: 'KL4', maxBudget: 7000000, description: 'Key Creator (3.5tr - 7tr)' },
        { grade: 'KL5', maxBudget: 12000000, description: 'Macro Creator (7tr - 12tr)' },
        { grade: 'KL6', maxBudget: 20000000, description: 'Top Creator (12tr - 20tr)' },
        { grade: 'KL7', maxBudget: 35000000, description: 'Celeb / Star (> 20tr)' }
      ]
    }));

    // Merge in all brands from Master Data (UPBASE_BRANDS_MASTER + props)
    const allMasterBrands = brands && brands.length > 0 ? brands : UPBASE_BRANDS_MASTER;
    allMasterBrands.forEach(b => {
      const existing = list.find(item => item.brandName.toLowerCase() === b.name.toLowerCase());
      if (existing) {
        existing.companyName = existing.companyName || b.companyName || b.name;
        existing.accountPic = existing.accountPic || b.accountPic;
        existing.growthPic = existing.growthPic || b.growthPic;
        existing.bookingPicLead = existing.bookingPicLead || b.bookingPicLead;
        existing.monthlyBudget = existing.monthlyBudget || b.monthlyBudget || b.planBudget || 0;
        existing.targetGmv = existing.targetGmv || b.targetGmv || 0;
        existing.platforms = existing.platforms || (b.platforms as any) || ['Shopee Mall', 'TikTok Shop'];
      } else {
        const hasGuideline = b.brandGuideline && b.brandGuideline.length > 10;
        const brandSlug = (b.code || b.name).toLowerCase().replace(/[^a-z0-9]/g, '-');
        list.push({
          id: `kb-${brandSlug}`,
          brandName: b.name,
          companyName: b.companyName || b.name,
          category: b.category || 'Mỹ phẩm & Làm đẹp',
          originCountry: 'Việt Nam',
          foundedYear: 2024,
          slogan: hasGuideline ? b.brandGuideline.slice(0, 80) : 'Chưa thiết lập slogan',
          brandStory: b.brandGuideline || 'Chưa thiết lập câu chuyện thương hiệu và định vị',
          toneOfVoice: 'Chuyên nghiệp, tin cậy, gần gũi',
          toneTag: 'BÁC_SĨ_CHUYÊN_GIA',
          targetPersonaSummary: 'Khách hàng quan tâm đến chất lượng và nguồn gốc xuất xứ',
          colors: [
            { name: 'Chủ đạo', hex: '#4F46E5', role: 'PRIMARY' },
            { name: 'Phụ trợ', hex: '#0284C7', role: 'SECONDARY' }
          ],
          logoAssetRules: 'Sử dụng logo chính thức',
          logoDownloadUrls: [],
          visualDoList: ['Sử dụng hình ảnh bao bì sắc nét', 'Đặt logo góc trên video', 'Hình ảnh sản phẩm rõ ràng'],
          visualDontList: ['Không dùng từ ngữ phóng đại', 'Không vi phạm chính sách sàn', 'Không nhắc tên đối thủ'],
          certifications: [],
          skus: (b.heroProducts || []).map(p => ({
            id: p.id,
            skuCode: p.sku,
            name: p.productName || p.sku,
            volumeOrWeight: 'Fullsize',
            category: p.category || 'Mỹ phẩm & Làm đẹp',
            priceVnd: p.price || 250000,
            sampleStockCount: p.sampleStock || 50,
            pdpUrl: p.pdpUrl || '#',
            scientificMechanism: 'Cơ chế tác động chuẩn theo tài liệu thương hiệu',
            keyActiveIngredients: [],
            uniqueSellingPoints: p.keySellingPoints || ['Sản phẩm chủ lực'],
            clinicalTrials: 'Đạt chuẩn kiểm định chất lượng',
            usageInstructions: 'Sử dụng theo hướng dẫn của nhà sản xuất',
            targetSkinOrUser: 'Người tiêu dùng có nhu cầu',
            contraindications: p.restrictedClaims?.join(', ') || 'Không dùng cho người mẫn cảm với thành phần'
          })),
          blacklistKeywords: [],
          whitelistKeywords: [],
          objectionFaqs: [],
          crisisProtocols: [],
          lastUpdated: new Date().toISOString(),
          updatedBy: 'Hệ thống Lark Sync',
          publicShareSlug: brandSlug,
          documents: [],
          isConfigured: b.profileStatus === 'CONFIGURED' || !!hasGuideline,
          accountPic: b.accountPic || 'Chưa phân công',
          growthPic: b.growthPic || 'Chưa phân công',
          bookingPicLead: b.bookingPicLead || 'Chưa phân công',
          monthlyBudget: b.monthlyBudget || b.planBudget || 0,
          targetGmv: b.targetGmv || 0,
          platforms: (b.platforms as any) || ['Shopee Mall', 'TikTok Shop'],
          ratecardCeiling: [
            { grade: 'KL1', maxBudget: 500000, description: 'Creator khởi đầu (< 500k)' },
            { grade: 'KL2', maxBudget: 1500000, description: 'Micro Creator (500k - 1.5tr)' },
            { grade: 'KL3', maxBudget: 3500000, description: 'Mid Creator (1.5tr - 3.5tr)' },
            { grade: 'KL4', maxBudget: 7000000, description: 'Key Creator (3.5tr - 7tr)' },
            { grade: 'KL5', maxBudget: 12000000, description: 'Macro Creator (7tr - 12tr)' },
            { grade: 'KL6', maxBudget: 20000000, description: 'Top Creator (12tr - 20tr)' },
            { grade: 'KL7', maxBudget: 35000000, description: 'Celeb / Star (> 20tr)' }
          ]
        });
      }
    });

    return list;
  });

  const isManagerOrBOD = !currentUser || ['ADMIN', 'MANAGER', 'LEADER'].includes(currentUser.role);
  const [selectedBrandId, setSelectedBrandId] = useState<string>(() => {
    if (selectedBrand && selectedBrand !== 'ALL') {
      const match = INITIAL_BRAND_KNOWLEDGE_BASES.find(b => b.brandName.toLowerCase().includes(selectedBrand.toLowerCase()));
      if (match) return match.id;
    }
    return isManagerOrBOD ? 'ALL' : (INITIAL_BRAND_KNOWLEDGE_BASES[0]?.id || 'kb-senka');
  });

  // Đồng bộ khi đổi nhãn hàng trên TopHeader
  React.useEffect(() => {
    if (selectedBrand) {
      if (selectedBrand === 'ALL') {
        setSelectedBrandId('ALL');
      } else {
        const match = knowledgeBases.find(b => b.brandName.toLowerCase().includes(selectedBrand.toLowerCase()));
        if (match) {
          setSelectedBrandId(match.id);
        }
      }
    }
  }, [selectedBrand, knowledgeBases]);
  const [activeKnowledgeTab, setActiveKnowledgeTab] = useState<KnowledgeTabKey>('OVERVIEW_PIC');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const [brandSelectorSearch, setBrandSelectorSearch] = useState('');

  const handleUpdateBrand = (updatedBrand: BrandKnowledgeBase) => {
    setKnowledgeBases(prev => prev.map(b => b.id === updatedBrand.id ? updatedBrand : b));
  };

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

  // AI Inspector States
  const [inputScriptText, setInputScriptText] = useState<string>(
    `Review sữa rửa mặt Senka Perfect Whip cho các bạn da dầu mụn đây!\nEm này rửa xong đảm bảo trị dứt điểm mụn và sạch thâm 100%, tốt hơn Biore hay Hada Labo nhiều.\nBọt tơ tằm trắng Mayu Haku siêu xốp giúp làm sạch sâu bụi bẩn và gấp đôi Hyaluronic Acid giữ ẩm dịu nhẹ.\nBấm ngay vào link giỏ hàng góc trái video để săn voucher giảm giá nhé!`
  );
  const [selectedSkuId, setSelectedSkuId] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<AiScriptAnalysisResult | null>(null);

  // Active Brand Knowledge Base
  const currentBrand = knowledgeBases.find(b => b.id === selectedBrandId) || knowledgeBases[0];

  const updateCurrentBrandField = <K extends keyof BrandKnowledgeBase>(field: K, value: BrandKnowledgeBase[K]) => {
    setKnowledgeBases(prev => prev.map(kb => {
      if (kb.id === currentBrand.id) {
        return {
          ...kb,
          [field]: value
        };
      }
      return kb;
    }));
  };

  const handleSaveCurrentProfile = () => {
    setKnowledgeBases(prev => prev.map(kb => {
      if (kb.id === currentBrand.id) {
        return {
          ...kb,
          isConfigured: true,
          lastUpdated: new Date().toISOString(),
          updatedBy: currentUser?.name || 'Chuyên viên B2C'
        };
      }
      return kb;
    }));
    onNotify?.(`Đã lưu hồ sơ thương hiệu "${currentBrand.brandName}" thành công!`, 'success');
  };

  const handleRunAiAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const activeSku = currentBrand.skus.find(s => s.id === selectedSkuId) || currentBrand.skus[0];
      const result = analyzeScriptWithAi(inputScriptText, currentBrand, activeSku);
      setAiAnalysisResult(result);
      setIsAnalyzing(false);
    }, 450);
  };

  const handleLoadPreset = (type: 'SENKA_ERROR' | 'NATURE_DISCLAIMER' | 'KUTIE_PERFECT') => {
    if (type === 'SENKA_ERROR') {
      setSelectedBrandId('kb-senka');
      const text = `Review sữa rửa mặt Senka Perfect Whip cho các bạn da dầu mụn đây!\nEm này rửa xong đảm bảo trị dứt điểm mụn và sạch thâm 100%, tốt hơn Biore hay Hada Labo nhiều.\nBọt tơ tằm trắng Mayu Haku siêu xốp giúp làm sạch sâu bụi bẩn và gấp đôi Hyaluronic Acid giữ ẩm dịu nhẹ.\nBấm ngay vào link giỏ hàng góc trái video để săn voucher giảm giá nhé!`;
      setInputScriptText(text);
      const senka = knowledgeBases.find(b => b.id === 'kb-senka') || currentBrand;
      setAiAnalysisResult(analyzeScriptWithAi(text, senka, senka.skus[0]));
    } else if (type === 'NATURE_DISCLAIMER') {
      setSelectedBrandId('kb-naturesway');
      const text = `Bé lười ăn hay ốm vặt thì mẹ mua ngay kẹo dẻo Kids Smart Vita Gummies này nha!\nKẹo dẻo bổ sung kẽm và vitamin C tăng cường miễn dịch cho bé rất tốt.\nThuốc bổ tăng cân giúp bé ăn ngon tự nhiên sau 2 tuần.\nBấm vào giỏ hàng săn deal mua 1 tặng 1 duy nhất hôm nay!`;
      setInputScriptText(text);
      const nw = knowledgeBases.find(b => b.id === 'kb-naturesway') || currentBrand;
      setAiAnalysisResult(analyzeScriptWithAi(text, nw, nw.skus[0]));
    } else if (type === 'KUTIE_PERFECT') {
      setSelectedBrandId('kb-kutieskin');
      const text = `Bé bị muỗi đốt hay mẩn ngứa hăm tã thì mẹ đừng vội dùng kem có corticoid độc hại nhé!\nEm kem bôi dịu da Kutieskin này dùng công nghệ thảo dược Aminovector nhập khẩu từ Pháp, an toàn cho trẻ sơ sinh từ 5 ngày tuổi.\nChiết xuất yến mạch và bơ shea làm dịu ngứa sau 24h, chất kem thấm nhanh không hề bết dính quần áo bé.\nCác mẹ bấm ngay vào giỏ hàng góc trái để nhận ưu đãi chính hãng từ CVI Pharma nhé!`;
      setInputScriptText(text);
      const kuti = knowledgeBases.find(b => b.id === 'kb-kutieskin') || currentBrand;
      setAiAnalysisResult(analyzeScriptWithAi(text, kuti, kuti.skus[0]));
    }
  };

  const handleApplyRewritten = () => {
    if (aiAnalysisResult?.rewrittenScript?.fullText) {
      setInputScriptText(aiAnalysisResult.rewrittenScript.fullText);
      const activeSku = currentBrand.skus.find(s => s.id === selectedSkuId) || currentBrand.skus[0];
      setAiAnalysisResult(analyzeScriptWithAi(aiAnalysisResult.rewrittenScript.fullText, currentBrand, activeSku));
    }
  };

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

  // Filtered Brands for ALL view
  const filteredBrands = knowledgeBases.filter((b) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.brandName.toLowerCase().includes(q) ||
      b.category.toLowerCase().includes(q) ||
      b.originCountry.toLowerCase().includes(q) ||
      b.slogan.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* TOP TOOLBAR & GLOBAL ACTIONS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 rounded-md border border-slate-200 shadow-sm">
        {/* Left: Back button & Brand Selector Dropdown */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {onNavigateBackToBrands && (
            <button
              onClick={onNavigateBackToBrands}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold flex items-center gap-1.5 transition border border-slate-300"
              title="Quay lại Danh sách Brand để thêm hoặc đồng bộ Lark Base"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
              <span>Danh sách Brand</span>
            </button>
          )}

          {/* Brand Combobox / Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsBrandDropdownOpen(prev => !prev)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-800 hover:bg-slate-50 transition shadow-xs min-w-[240px] justify-between"
            >
              <div className="flex items-center gap-2 truncate">
                <Building className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate">
                  {selectedBrandId === 'ALL' ? 'Tất cả nhãn hàng (Ma trận)' : currentBrand.brandName}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {selectedBrandId !== 'ALL' && (
                  <span className={`text-2xs px-1.5 py-0.2 rounded-full font-medium ${
                    currentBrand.isConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {currentBrand.isConfigured ? 'Đã lập' : 'Chưa'}
                  </span>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </button>

            {/* Dropdown Popover */}
            {isBrandDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsBrandDropdownOpen(false)}
                />
                <div className="absolute left-0 top-full mt-1.5 w-80 max-h-96 bg-white border border-slate-200 rounded-lg shadow-xl z-40 flex flex-col overflow-hidden animate-in fade-in duration-100">
                  <div className="p-2 border-b border-slate-200 bg-slate-50">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Tìm kiếm trong danh sách brand..."
                        value={brandSelectorSearch}
                        onChange={(e) => setBrandSelectorSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                    <button
                      onClick={() => {
                        setSelectedBrandId('ALL');
                        setIsBrandDropdownOpen(false);
                        setBrandSelectorSearch('');
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition ${
                        selectedBrandId === 'ALL' ? 'bg-blue-50/70 font-semibold text-blue-700' : 'text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <LayoutDashboard className="w-3.5 h-3.5 text-slate-500" />
                        <span>Tất cả nhãn hàng (Ma trận đối soát)</span>
                      </div>
                      <span className="text-2xs bg-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-semibold">
                        {knowledgeBases.length}
                      </span>
                    </button>

                    {knowledgeBases
                      .filter(b => !brandSelectorSearch || b.brandName.toLowerCase().includes(brandSelectorSearch.toLowerCase()) || b.category.toLowerCase().includes(brandSelectorSearch.toLowerCase()))
                      .map(brand => (
                        <button
                          key={brand.id}
                          onClick={() => {
                            setSelectedBrandId(brand.id);
                            setIsBrandDropdownOpen(false);
                            setBrandSelectorSearch('');
                          }}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition ${
                            selectedBrandId === brand.id ? 'bg-blue-50/70 font-semibold text-blue-700' : 'text-slate-700'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <div className="font-medium text-slate-900 truncate">{brand.brandName}</div>
                            <div className="text-2xs text-slate-400 truncate">{brand.category} • {brand.originCountry}</div>
                          </div>
                          <div className="shrink-0 flex items-center gap-1.5">
                            <span className={`text-2xs px-1.5 py-0.5 rounded-full font-medium ${
                              brand.isConfigured ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {brand.isConfigured ? 'Đã lập' : 'Chưa'}
                            </span>
                          </div>
                        </button>
                      ))
                    }
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Quick Major Brands Switcher */}
          <div className="hidden xl:flex items-center gap-1 pl-2 border-l border-slate-200">
            {knowledgeBases.slice(0, 5).map(brand => (
              <button
                key={brand.id}
                onClick={() => setSelectedBrandId(brand.id)}
                className={`px-2.5 py-1 rounded text-2xs font-semibold transition ${
                  selectedBrandId === brand.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {brand.brandName}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Search & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tra cứu thành phần, SKU, FAQ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          {selectedBrandId !== 'ALL' && (
            <button
              onClick={handleSaveCurrentProfile}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-sm transition flex items-center gap-1.5 whitespace-nowrap"
              title="Lưu tất cả thông tin hồ sơ của nhãn hàng này"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu hồ sơ</span>
            </button>
          )}

          <button
            onClick={() => setIsShareModalOpen(true)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-sm transition flex items-center gap-1.5 whitespace-nowrap"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Sinh Link KOC</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-md border border-slate-300 transition flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 text-slate-600" />
            <span>Bổ sung Tri thức</span>
          </button>
        </div>
      </div>

      {selectedBrandId === 'ALL' ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* 1. THỐNG KÊ TOÀN KHỐI THƯƠNG HIỆU */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="card-enterprise p-4 flex items-center gap-3 bg-white">
              <div className="w-10 h-10 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xs text-slate-500 font-medium">Nhãn hàng quản lý</p>
                <p className="text-lg font-semibold text-slate-900">{knowledgeBases.length} nhãn</p>
              </div>
            </div>

            <div className="card-enterprise p-4 flex items-center gap-3 bg-white">
              <div className="w-10 h-10 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xs text-slate-500 font-medium">SKU chủ lực (Hero)</p>
                <p className="text-lg font-semibold text-slate-900">
                  {knowledgeBases.reduce((acc, b) => acc + b.skus.length, 0)} SKU
                </p>
              </div>
            </div>

            <div className="card-enterprise p-4 flex items-center gap-3 bg-white">
              <div className="w-10 h-10 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xs text-slate-500 font-medium">Hồ sơ pháp lý / BYT</p>
                <p className="text-lg font-semibold text-slate-900">
                  {knowledgeBases.reduce((acc, b) => acc + b.certifications.length, 0)} hồ sơ
                </p>
              </div>
            </div>

            <div className="card-enterprise p-4 flex items-center gap-3 bg-white">
              <div className="w-10 h-10 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xs text-slate-500 font-medium">Tệp tài liệu lưu kho</p>
                <p className="text-lg font-semibold text-purple-700">
                  {knowledgeBases.reduce((acc, b) => acc + (b.documents?.length || 0), 0)} tệp
                </p>
              </div>
            </div>

            <div className="card-enterprise p-4 flex items-center gap-3 bg-white">
              <div className="w-10 h-10 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xs text-slate-500 font-medium">Từ cấm (Blacklist)</p>
                <p className="text-lg font-semibold text-rose-700">
                  {knowledgeBases.reduce((acc, b) => acc + b.blacklistKeywords.length, 0)} từ
                </p>
              </div>
            </div>
          </div>

          {/* 2. MA TRẬN ĐỐI SOÁT & HOÀN THIỆN GUIDELINE TỪNG NHÃN */}
          <div className="card-enterprise overflow-hidden bg-white">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Ma Trận Quản Trị Brand Guideline &amp; Hồ Sơ Pháp Lý Toàn Bộ Nhãn Hàng
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dành cho Cấp Quản lý &amp; Trưởng phòng theo dõi mức độ hoàn thiện quy chuẩn của từng nhãn hàng
                </p>
              </div>
              <span className="text-2xs px-2.5 py-1 rounded bg-slate-200 text-slate-700 font-semibold">
                Chế độ xem Quản lý (BOD/Manager)
              </span>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                  <th className="py-3 px-4">Thương hiệu &amp; Xuất xứ</th>
                  <th className="py-3 px-3">Ngành hàng</th>
                  <th className="py-3 px-3">Tone of Voice (Phong cách)</th>
                  <th className="py-3 px-3">Tệp tài liệu</th>
                  <th className="py-3 px-3">Hero SKUs</th>
                  <th className="py-3 px-3">Hồ sơ pháp lý</th>
                  <th className="py-3 px-3">Từ cấm Blacklist</th>
                  <th className="py-3 px-4">Mức độ hoàn thiện</th>
                  <th className="py-3 px-4 text-right">Chi Tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredBrands.map((brand) => {
                  const hasStory = !!brand.brandStory;
                  const hasSkus = brand.skus.length > 0;
                  const hasLegal = brand.certifications.length > 0;
                  const hasBlacklist = brand.blacklistKeywords.length > 0;
                  const hasDocs = (brand.documents?.length || 0) > 0;
                  const completenessScore = Math.min(100, (
                    (hasStory ? 20 : 0) +
                    (hasSkus ? 20 : 0) +
                    (hasLegal ? 20 : 0) +
                    (hasBlacklist ? 20 : 0) +
                    (hasDocs ? 20 : 0)
                  ));

                  return (
                    <tr key={brand.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                          <span>{brand.brandName}</span>
                          <span className="text-2xs font-normal text-slate-500">({brand.originCountry})</span>
                        </div>
                        <p className="text-2xs text-blue-700 italic mt-0.5 truncate max-w-xs">&ldquo;{brand.slogan}&rdquo;</p>
                      </td>

                      <td className="py-3.5 px-3 text-slate-700 font-medium">
                        {brand.category}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                          {brand.toneTag.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 font-semibold text-slate-800">
                        <span className="flex items-center gap-1">
                          <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
                          <span>{brand.documents?.length || 0} tệp</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-3 font-semibold text-slate-800">
                        {brand.skus.length} SKU
                      </td>

                      <td className="py-3.5 px-3 font-semibold text-emerald-700">
                        {brand.certifications.length} văn bản
                      </td>

                      <td className="py-3.5 px-3 font-semibold text-rose-700">
                        {brand.blacklistKeywords.length} từ
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="w-32 space-y-1">
                          <div className="flex justify-between text-2xs text-slate-600">
                            <span>Hoàn thiện</span>
                            <span className="font-semibold text-slate-900">{completenessScore}%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                completenessScore >= 80
                                  ? 'bg-emerald-500'
                                  : completenessScore >= 60
                                  ? 'bg-blue-500'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${completenessScore}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedBrandId(brand.id)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs font-semibold transition border border-blue-200 shadow-2xs flex items-center gap-1 ml-auto"
                        >
                          <span>Vào nhãn</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 3. KHỐI NGUYÊN TẮC TUÂN THỦ PHÁP LÝ TOÀN BỘ NHÃN HÀNG */}
          <div className="card-enterprise p-5 bg-amber-50/30 border-amber-200 space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Nguyên Tắc Pháp Lý &amp; Kiểm Soát Rủi Ro Áp Dụng Chung Cho Toàn Khối B2C</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-700">
              <div className="p-3 bg-white rounded border border-amber-200 space-y-1">
                <p className="font-semibold text-slate-900">1. Quy chế Quản lý Mỹ phẩm BYT</p>
                <p className="text-2xs text-slate-600 leading-relaxed">
                  Tuyệt đối cấm dùng từ &ldquo;trị mụn dứt điểm&rdquo;, &ldquo;chữa khỏi thâm nám&rdquo;. Mỹ phẩm chỉ có tính năng làm sạch, dưỡng ẩm và hỗ trợ ngăn ngừa.
                </p>
              </div>

              <div className="p-3 bg-white rounded border border-amber-200 space-y-1">
                <p className="font-semibold text-slate-900">2. Nghị định 15 về Thực phẩm chức năng</p>
                <p className="text-2xs text-slate-600 leading-relaxed">
                  Bắt buộc xuất hiện câu tuyên bố: &ldquo;Thực phẩm này không phải là thuốc, không có tác dụng thay thế thuốc chữa bệnh&rdquo;. Cấm gọi TPCN là &ldquo;thuốc bổ&rdquo;.
                </p>
              </div>

              <div className="p-3 bg-white rounded border border-amber-200 space-y-1">
                <p className="font-semibold text-slate-900">3. Chính sách TikTok Shop Seller</p>
                <p className="text-2xs text-slate-600 leading-relaxed">
                  Không so sánh dìm hàng thương hiệu đối thủ, không dùng từ tuyệt đối &ldquo;100%&rdquo; không có số liệu kiểm nghiệm lâm sàng, tránh bị quét bóp tương tác kênh.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Back to all brands button for Manager/Leader */}
          {isManagerOrBOD && (
            <div className="flex items-center justify-between pb-1">
              <button
                onClick={() => setSelectedBrandId('ALL')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 transition px-2 py-1 rounded hover:bg-blue-50"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại Bảng tổng quan ma trận nhãn hàng</span>
              </button>
            </div>
          )}

          {/* BRAND PROFILE HEADER HERO BANNER */}
          <div className="card-enterprise p-5 bg-slate-50 border-slate-200">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
          <div className="space-y-3 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs px-2 py-0.5 rounded font-semibold bg-blue-100 text-blue-800">
                {currentBrand.originCountry}
              </span>
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight">{currentBrand.brandName}</h1>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-slate-600 font-medium">{currentBrand.category}</span>
              <span className="px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
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
                <strong>Đối tượng khách hàng mục tiêu:</strong> {currentBrand.targetPersonaSummary}
              </p>
              <p>
                <strong>Giọng văn &amp; Phong cách (Tone of Voice):</strong> {currentBrand.toneOfVoice}
              </p>
            </div>
          </div>

          {/* Color Palette & Logo Assets Download Box */}
          <div className="card-inner-box p-4 space-y-3 w-full md:w-80 shrink-0">
            <div>
              <p className="text-2xs font-semibold text-slate-500 mb-2">
                Bộ mã màu thương hiệu
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
                      <p className="text-2xs font-semibold text-slate-800 truncate">{color.name}</p>
                      <p className="text-2xs font-mono text-slate-500 flex items-center justify-between">
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
              <p className="text-2xs font-semibold text-slate-500 mb-1.5">
                Tài nguyên Logo chuẩn
              </p>
              <div className="space-y-1">
                {currentBrand.logoDownloadUrls.map((logo, idx) => (
                  <a
                    key={idx}
                    href={logo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-2xs text-blue-600 hover:text-blue-700 font-medium flex items-center justify-between p-1 rounded hover:bg-slate-100 transition"
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

      {/* KNOWLEDGE CATEGORY SUB-TABS */}
      <div className="border-b border-slate-200">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveKnowledgeTab('OVERVIEW_PIC')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeKnowledgeTab === 'OVERVIEW_PIC'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>Hồ sơ &amp; Phân công PIC</span>
            {currentBrand.isConfigured ? (
              <span className="px-1.5 py-0.2 rounded-full text-2xs bg-emerald-100 text-emerald-800 font-semibold">Đã lập</span>
            ) : (
              <span className="px-1.5 py-0.2 rounded-full text-2xs bg-amber-100 text-amber-800 font-semibold">Cần điền</span>
            )}
          </button>

          <button
            onClick={() => setActiveKnowledgeTab('RATECARD_CEILING')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeKnowledgeTab === 'RATECARD_CEILING'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Coins className="w-4 h-4 text-amber-600" />
            <span>Định mức &amp; Trần thù lao</span>
            <span className="px-1.5 py-0.2 rounded-full text-2xs bg-slate-200 text-slate-700 font-semibold">
              {(currentBrand.ratecardCeiling || []).length || 7} bậc
            </span>
          </button>

          <button
            onClick={() => setActiveKnowledgeTab('DOCUMENTS')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeKnowledgeTab === 'DOCUMENTS'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FolderOpen className="w-4 h-4 text-blue-600" />
            <span>Kho tài liệu &amp; Đọc tệp</span>
            <span className="px-1.5 py-0.2 rounded-full text-2xs bg-blue-100 text-blue-800 font-semibold">
              {(currentBrand.documents || []).length}
            </span>
          </button>

          <button
            onClick={() => setActiveKnowledgeTab('SKUS')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeKnowledgeTab === 'SKUS'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-500" />
            <span>Bách khoa toàn thư sản phẩm</span>
            <span className="px-1.5 py-0.2 rounded-full text-2xs bg-slate-200 text-slate-700 font-semibold">
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
            <span>Pháp lý & bằng chứng lâm sàng</span>
            <span className="px-1.5 py-0.2 rounded-full text-2xs bg-slate-200 text-slate-700 font-semibold">
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
            <span>Từ điển Blacklist & Whitelist</span>
            <span className="px-1.5 py-0.2 rounded-full text-2xs bg-slate-200 text-slate-700 font-semibold">
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
            <span>Xử lý phản biện & FAQ khủng hoảng</span>
            <span className="px-1.5 py-0.2 rounded-full text-2xs bg-slate-200 text-slate-700 font-semibold">
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

          <button
            onClick={() => {
              setActiveKnowledgeTab('AI_INSPECTOR');
              if (!aiAnalysisResult) {
                const activeSku = currentBrand.skus.find(s => s.id === selectedSkuId) || currentBrand.skus[0];
                setAiAnalysisResult(analyzeScriptWithAi(inputScriptText, currentBrand, activeSku));
              }
            }}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeKnowledgeTab === 'AI_INSPECTOR'
                ? 'border-purple-600 text-purple-800 bg-purple-50/70 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Thẩm định kịch bản</span>
            <span className="px-1.5 py-0.2 rounded-full text-2xs bg-purple-600 text-white font-semibold">
              Tự động
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 0A: HỒ SƠ DOANH NGHIỆP & PHÂN CÔNG PIC 3 BÊN (SLA B2C)                 */}
      {/* ========================================================================= */}
      {activeKnowledgeTab === 'OVERVIEW_PIC' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Card 1: Thông tin pháp nhân & Định danh */}
          <div className="card-enterprise p-5 bg-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Thông Tin Pháp Nhân &amp; Định Danh Thương Hiệu
                </h3>
              </div>
              <span className={`text-2xs px-2.5 py-0.5 rounded-full font-semibold ${
                currentBrand.isConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {currentBrand.isConfigured ? 'Hồ sơ: Đã hoàn thiện' : 'Hồ sơ: Đang thiết lập'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tên thương hiệu (Brand Name) *
                </label>
                <input
                  type="text"
                  value={currentBrand.brandName}
                  onChange={(e) => updateCurrentBrandField('brandName', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Công ty đại diện / Pháp nhân hợp đồng
                </label>
                <input
                  type="text"
                  placeholder="VD: Công ty TNHH Shiseido Việt Nam"
                  value={currentBrand.companyName || ''}
                  onChange={(e) => updateCurrentBrandField('companyName', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mã số thuế (MST)
                </label>
                <input
                  type="text"
                  placeholder="VD: 0309998888"
                  value={currentBrand.taxCode || ''}
                  onChange={(e) => updateCurrentBrandField('taxCode', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Đầu mối liên hệ phía Brand (Contact Person)
                </label>
                <input
                  type="text"
                  placeholder="VD: Nguyễn Lan Anh - Brand Manager (0988.xxx.xxx)"
                  value={currentBrand.contactPerson || ''}
                  onChange={(e) => updateCurrentBrandField('contactPerson', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Quốc gia xuất xứ
                </label>
                <input
                  type="text"
                  value={currentBrand.originCountry}
                  onChange={(e) => updateCurrentBrandField('originCountry', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Ngành hàng chủ lực
                </label>
                <input
                  type="text"
                  value={currentBrand.category}
                  onChange={(e) => updateCurrentBrandField('category', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Phân công nhân sự 3 bên (SLA B2C) */}
          <div className="card-enterprise p-5 bg-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Phân Công Nhân Sự Phụ Trách 3 Bên (SLA B2C)</span>
                </h3>
                <p className="text-2xs text-slate-500 mt-0.5">
                  Thiết lập nhân sự chịu trách nhiệm đối soát và xử lý các điểm nghẽn SLA vận hành
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 bg-blue-50/50 rounded-lg border border-blue-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-900">1. Account PIC</span>
                  <span className="text-2xs bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-medium">Khách hàng</span>
                </div>
                <p className="text-2xs text-slate-500">Chịu trách nhiệm brief, hợp đồng thương hiệu và nghiệm thu</p>
                <input
                  type="text"
                  placeholder="VD: Phạm Thị Nhài / Hà Thị Thương"
                  value={currentBrand.accountPic || ''}
                  onChange={(e) => updateCurrentBrandField('accountPic', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="p-3.5 bg-emerald-50/50 rounded-lg border border-emerald-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-900">2. Growth PIC</span>
                  <span className="text-2xs bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded font-medium">Vận hành Sàn</span>
                </div>
                <p className="text-2xs text-slate-500">Phụ trách traffic, deal sàn, target GMV và phối hợp live</p>
                <input
                  type="text"
                  placeholder="VD: Phạm Thị Hồng Yến / Nguyễn Anh Tú"
                  value={currentBrand.growthPic || ''}
                  onChange={(e) => updateCurrentBrandField('growthPic', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="p-3.5 bg-purple-50/50 rounded-lg border border-purple-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-purple-900">3. Booking PIC / Leader</span>
                  <span className="text-2xs bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded font-medium">B2C Booking</span>
                </div>
                <p className="text-2xs text-slate-500">Phụ trách kế hoạch Creator, duyệt kịch bản, nghiệm thu video</p>
                <input
                  type="text"
                  placeholder="VD: Nguyễn Thị Ngọc Tâm / Lê Phương Thảo"
                  value={currentBrand.bookingPicLead || ''}
                  onChange={(e) => updateCurrentBrandField('bookingPicLead', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Kế hoạch tài chính & Sàn phân phối */}
          <div className="card-enterprise p-5 bg-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Hạn Mức Ngân Sách Tháng &amp; Kênh Sàn Phân Phối
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Trần Ngân Sách Booking Tháng (VNĐ)
                </label>
                <input
                  type="number"
                  placeholder="50000000"
                  value={currentBrand.monthlyBudget || 0}
                  onChange={(e) => updateCurrentBrandField('monthlyBudget', Number(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 font-mono font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
                />
                <p className="text-2xs text-slate-400 mt-1">
                  Tương đương: {((currentBrand.monthlyBudget || 0)).toLocaleString('vi-VN')} đ
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Doanh Thu Mục Tiêu GMV Tháng (VNĐ)
                </label>
                <input
                  type="number"
                  placeholder="250000000"
                  value={currentBrand.targetGmv || 0}
                  onChange={(e) => updateCurrentBrandField('targetGmv', Number(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 font-mono font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
                />
                <p className="text-2xs text-slate-400 mt-1">
                  Tương đương: {((currentBrand.targetGmv || 0)).toLocaleString('vi-VN')} đ
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Sàn Thương Mại Điện Tử Hoạt Động
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {(['TikTok Shop', 'Shopee Mall', 'Lazada'] as const).map(platform => {
                    const currentPlatforms = currentBrand.platforms || ['Shopee Mall', 'TikTok Shop'];
                    const isSelected = currentPlatforms.includes(platform as any);
                    return (
                      <button
                        type="button"
                        key={platform}
                        onClick={() => {
                          const next = isSelected
                            ? currentPlatforms.filter(p => p !== platform)
                            : [...currentPlatforms, platform];
                          updateCurrentBrandField('platforms', next as any);
                        }}
                        className={`px-3 py-1.5 rounded text-xs font-semibold border transition flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        <span>{platform}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Định vị thương hiệu & Giá trị cốt lõi */}
          <div className="card-enterprise p-5 bg-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-600" />
                <span>Định Vị Thương Hiệu &amp; Quy Chuẩn Truyền Thông (Brand Identity)</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Slogan / Tuyên ngôn thương hiệu
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Dưỡng ẩm chuẩn Nhật Bản cho làn da mộc rạng ngời"
                    value={currentBrand.slogan}
                    onChange={(e) => updateCurrentBrandField('slogan', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 italic focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nhóm phong cách (Tone Tag)
                  </label>
                  <select
                    value={currentBrand.toneTag}
                    onChange={(e) => updateCurrentBrandField('toneTag', e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                  >
                    <option value="BÁC_SĨ_CHUYÊN_GIA">Bác sĩ &amp; Chuyên gia da liễu</option>
                    <option value="MẸ_BỈM_CHÂN_THỰC">Mẹ bỉm &amp; Gia đình chân thực</option>
                    <option value="GEN_Z_TRENDING">Gen Z tươi trẻ &amp; Bắt trend</option>
                    <option value="SANG_TRỌNG_CAO_CẤP">Sang trọng &amp; Đẳng cấp (High-end)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Giọng văn &amp; Phong cách (Tone of Voice)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Chuyên nghiệp, tin cậy, nhẹ nhàng, giải thích cơ chế khoa học"
                    value={currentBrand.toneOfVoice}
                    onChange={(e) => updateCurrentBrandField('toneOfVoice', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Chân dung khách hàng mục tiêu (Target Persona)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="VD: Nữ 18-28 tuổi, da dầu mụn, học sinh sinh viên hoặc nhân viên văn phòng quan tâm giá thành hợp lý..."
                    value={currentBrand.targetPersonaSummary}
                    onChange={(e) => updateCurrentBrandField('targetPersonaSummary', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Câu chuyện thương hiệu (Brand Story &amp; Guideline)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Lịch sử thương hiệu, nguồn gốc nguyên liệu, giá trị cam kết..."
                    value={currentBrand.brandStory}
                    onChange={(e) => updateCurrentBrandField('brandStory', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action bottom bar */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-2xs text-slate-500">
              Cập nhật lần cuối: {new Date(currentBrand.lastUpdated).toLocaleString('vi-VN')} bởi {currentBrand.updatedBy}
            </span>
            <button
              onClick={handleSaveCurrentProfile}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow-sm transition flex items-center gap-2 text-xs"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Hồ Sơ Thương Hiệu</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 0B: ĐỊNH MỨC & TRẦN THÙ LAO CREATOR                                   */}
      {/* ========================================================================= */}
      {activeKnowledgeTab === 'RATECARD_CEILING' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="card-enterprise overflow-hidden bg-white">
            <div className="p-5 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-600" />
                  <span>Trần Thù Lao Creator Theo Phân Cấp (Ratecard Ceiling B2C)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Định mức trần tối đa nhãn hàng cho phép trả theo từng cấp độ KOC (Bảo đảm không bị vượt ngân sách Net)
                </p>
              </div>

              <button
                onClick={handleSaveCurrentProfile}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-xs transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu định mức trần</span>
              </button>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="py-3 px-4 w-28">Bậc Creator</th>
                  <th className="py-3 px-4 w-44">Tên phân cấp</th>
                  <th className="py-3 px-4 w-48">Trần thù lao Net (VNĐ)</th>
                  <th className="py-3 px-4">Mô tả &amp; Tiêu chuẩn định vị</th>
                  <th className="py-3 px-4 w-44 text-right">Kiểm soát hệ thống</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(currentBrand.ratecardCeiling || [
                  { grade: 'KL1', maxBudget: 500000, description: 'Creator khởi đầu / Hạt giống (< 500k)' },
                  { grade: 'KL2', maxBudget: 1500000, description: 'Micro Creator (500k - 1.5tr)' },
                  { grade: 'KL3', maxBudget: 3500000, description: 'Mid Creator (1.5tr - 3.5tr)' },
                  { grade: 'KL4', maxBudget: 7000000, description: 'Key Creator (3.5tr - 7tr)' },
                  { grade: 'KL5', maxBudget: 12000000, description: 'Macro Creator (7tr - 12tr)' },
                  { grade: 'KL6', maxBudget: 20000000, description: 'Top Creator (12tr - 20tr)' },
                  { grade: 'KL7', maxBudget: 35000000, description: 'Celeb / Star (> 20tr)' }
                ]).map((item, idx) => (
                  <tr key={item.grade} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300">
                        {item.grade}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {item.grade === 'KL1' && 'Creator Khởi Đầu / FOC'}
                      {item.grade === 'KL2' && 'Micro Creator'}
                      {item.grade === 'KL3' && 'Mid Creator'}
                      {item.grade === 'KL4' && 'Key Creator'}
                      {item.grade === 'KL5' && 'Macro Creator'}
                      {item.grade === 'KL6' && 'Top Creator'}
                      {item.grade === 'KL7' && 'Celeb / Star'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={item.maxBudget}
                          onChange={(e) => {
                            const newBudget = Number(e.target.value) || 0;
                            const updatedCeilings = (currentBrand.ratecardCeiling || []).map((c, i) =>
                              i === idx ? { ...c, maxBudget: newBudget } : c
                            );
                            updateCurrentBrandField('ratecardCeiling', updatedCeilings);
                          }}
                          className="w-36 px-2.5 py-1 text-xs font-mono font-semibold bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:border-blue-500"
                        />
                        <span className="text-2xs text-slate-500">đ</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => {
                          const newDesc = e.target.value;
                          const updatedCeilings = (currentBrand.ratecardCeiling || []).map((c, i) =>
                            i === idx ? { ...c, description: newDesc } : c
                          );
                          updateCurrentBrandField('ratecardCeiling', updatedCeilings);
                        }}
                        className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:border-blue-500 text-slate-700"
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Chặn vượt trần</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Quy định nghiệm thu & Hoa hồng trần */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="card-enterprise p-4 bg-white space-y-2">
              <span className="font-semibold text-slate-900 block">1. Suất Mẫu FOC Tối Đa</span>
              <p className="text-2xs text-slate-500">Hạn mức số lượng mẫu gửi miễn phí không phát sinh chi phí thù lao cho nhãn này</p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  defaultValue={30}
                  className="w-24 px-2.5 py-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded focus:bg-white"
                />
                <span className="text-slate-600 font-medium">suất / tháng</span>
              </div>
            </div>

            <div className="card-enterprise p-4 bg-white space-y-2">
              <span className="font-semibold text-slate-900 block">2. Tỷ Lệ Tương Tác Tối Thiểu (ER)</span>
              <p className="text-2xs text-slate-500">KOC phải đạt mức độ tương tác tối thiểu trên các video gần nhất để được book</p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  defaultValue={3.5}
                  step={0.1}
                  className="w-24 px-2.5 py-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded focus:bg-white"
                />
                <span className="text-slate-600 font-medium">%</span>
              </div>
            </div>

            <div className="card-enterprise p-4 bg-white space-y-2">
              <span className="font-semibold text-slate-900 block">3. Trần Hoa Hồng Tiếp Thị Liên Kết</span>
              <p className="text-2xs text-slate-500">Mức hoa hồng Affiliate tối đa cho phép cấu hình trên sàn đối với KOC của nhãn</p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  defaultValue={18}
                  className="w-24 px-2.5 py-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded focus:bg-white"
                />
                <span className="text-slate-600 font-medium">% GMV</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 0: KHO TÀI LIỆU & ĐỌC TỆP TRÍCH XUẤT THÔNG TIN                       */}
      {/* ========================================================================= */}
      {activeKnowledgeTab === 'DOCUMENTS' && (
        <BrandDocumentsTab
          currentBrand={currentBrand}
          onUpdateBrand={handleUpdateBrand}
        />
      )}

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
                      <span className="font-mono text-xs px-2.5 py-0.5 rounded font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {sku.skuCode}
                      </span>
                      <h3 className="text-base font-semibold text-slate-900">{sku.name}</h3>
                      <span className="text-xs text-slate-500 font-medium">({sku.volumeOrWeight})</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Phân loại: <span className="font-semibold text-slate-700">{sku.category}</span> | Giá niêm yết:{' '}
                      <span className="font-semibold text-slate-900">{sku.priceVnd.toLocaleString('vi-VN')} đ</span>
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
                  <div className="flex items-center gap-1.5 font-semibold text-blue-800">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Cơ chế tác động khoa học:</span>
                  </div>
                  <p className="leading-relaxed text-slate-700">{sku.scientificMechanism}</p>
                </div>

                {/* Key Active Ingredients & USPs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Ingredients Table */}
                  <div className="card-inner-box p-3.5 space-y-2">
                    <h4 className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <span>Thành phần hoạt chất cốt lõi</span>
                    </h4>
                    <div className="space-y-2">
                      {sku.keyActiveIngredients.map((ing, idx) => (
                        <div key={idx} className="p-2 rounded bg-white border border-slate-200 space-y-0.5">
                          <div className="flex justify-between font-semibold text-slate-900">
                            <span>{ing.name}</span>
                            <span className="text-blue-600 font-mono text-2xs">{ing.percentage || 'Chuẩn lâm sàng'}</span>
                          </div>
                          <p className="text-2xs text-slate-500">Nguồn gốc: {ing.origin}</p>
                          <p className="text-2xs text-slate-700 font-medium">• {ing.benefit}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* USPs & Clinical Proof */}
                  <div className="card-inner-box p-3.5 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-amber-500" />
                        <span>3-5 đặc tính nổi bật</span>
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

                    <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-slate-800 text-2xs space-y-1">
                      <p className="font-semibold text-emerald-800">Số liệu kiểm nghiệm lâm sàng:</p>
                      <p>{sku.clinicalTrials}</p>
                    </div>
                  </div>
                </div>

                {/* Target Audience & Contraindications (Chỉ định & Chống chỉ định) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="p-3 rounded border border-emerald-200 bg-emerald-50/30">
                    <p className="font-semibold text-emerald-900 mb-1 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Chỉ định (Ai nên dùng):</span>
                    </p>
                    <p className="text-slate-700">{sku.targetSkinOrUser}</p>
                  </div>

                  <div className="p-3 rounded border border-rose-200 bg-rose-50/30">
                    <p className="font-semibold text-rose-900 mb-1 flex items-center gap-1.5">
                      <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                      <span>Chống chỉ định (Ai không được dùng):</span>
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
              <h3 className="text-sm font-semibold text-slate-900">Hồ sơ pháp lý, giấy phép & bằng chứng lâm sàng</h3>
              <p className="text-xs text-slate-500">
                Toàn bộ chứng từ đã được phòng pháp chế thẩm định, cho phép KOC trích dẫn số giấy phép trong video
              </p>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                  <th className="py-2.5 px-4">Tên văn bản / giấy phép</th>
                  <th className="py-2.5 px-3">Loại hồ sơ</th>
                  <th className="py-2.5 px-3">Cơ quan cấp</th>
                  <th className="py-2.5 px-3">Số quyết định</th>
                  <th className="py-2.5 px-4">Tóm tắt kết luận thẩm định</th>
                  <th className="py-2.5 px-3 text-right">Tra Cứu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {currentBrand.certifications.map((cert) => (
                  <tr key={cert.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {cert.docTitle}
                      {cert.mandatoryDisclaimerText && (
                        <div className="mt-1.5 p-1.5 rounded bg-amber-50 border border-amber-200 text-2xs text-amber-900 font-normal">
                          <span className="font-semibold">Tuyên bố bắt buộc:</span> &ldquo;{cert.mandatoryDisclaimerText}&rdquo;
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
                      <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
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
                  <h3 className="text-sm font-semibold text-rose-900 flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4 text-rose-600" />
                    <span>Từ cấm tuyệt đối & nhạy cảm</span>
                  </h3>
                  <p className="text-xs text-rose-700">Tránh bị TikTok bóp tương tác hoặc bộ Y tế xử phạt</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                  {currentBrand.blacklistKeywords.length} từ cấm
                </span>
              </div>

              <div className="space-y-3">
                {currentBrand.blacklistKeywords.map((kw) => (
                  <div key={kw.id} className="p-3 bg-white rounded border border-rose-200 space-y-1.5 text-xs shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-rose-900 bg-rose-100 px-2 py-0.5 rounded">
                        &ldquo;{kw.keyword}&rdquo;
                      </span>
                      <span className="text-2xs font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                        {kw.severity === 'CRITICAL_BANNED' ? 'Cấm Tuyệt Đối' : 'Cảnh Báo Đối Thủ'}
                      </span>
                    </div>

                    <p className="text-slate-600 text-2xs">
                      <strong>Lý do cấm:</strong> {kw.rationale}
                    </p>

                    {kw.alternativeSuggestion && (
                      <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-emerald-800">
                        <span className="font-medium text-2xs">
                          <strong>Gợi ý thay thế:</strong> {kw.alternativeSuggestion}
                        </span>
                        <button
                          onClick={() => handleCopy(`alt-${kw.id}`, kw.alternativeSuggestion!)}
                          className="text-blue-600 hover:text-blue-700 font-semibold text-2xs flex items-center gap-1 shrink-0 ml-2"
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
                  <h3 className="text-sm font-semibold text-emerald-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Bộ từ khóa thắng lợi</span>
                  </h3>
                  <p className="text-xs text-emerald-700">Các cụm từ kích thích chuyển đổi cao và hợp chuẩn 100%</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  {currentBrand.whitelistKeywords.length} cụm từ
                </span>
              </div>

              <div className="space-y-3">
                {currentBrand.whitelistKeywords.map((wkw) => (
                  <div key={wkw.id} className="p-3 bg-white rounded border border-emerald-200 space-y-1.5 text-xs shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded">
                        &ldquo;{wkw.phrase}&rdquo;
                      </span>
                      <span className="text-2xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        {wkw.category.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <p className="text-slate-700 italic text-2xs">
                      <strong>Ví dụ trong video:</strong> &ldquo;{wkw.exampleUsage}&rdquo;
                    </p>

                    <p className="text-2xs text-slate-500">
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
                    <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
                      Vấn Đề: {faq.targetConcern.replace(/_/g, ' ')}
                    </span>
                    <h4 className="text-sm font-semibold text-slate-900">
                      {faq.question}
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
                        <span>Sao chép lời thoại KOC</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Recommended Answer for KOC */}
                <div className="p-3 bg-indigo-50/40 rounded-md border border-indigo-100 text-xs text-slate-800 space-y-1">
                  <p className="font-semibold text-indigo-900">Câu Trả Lời Mẫu Chuẩn Cho KOC (Livestream &amp; Comment):</p>
                  <p className="leading-relaxed text-slate-700 font-medium">
                    &ldquo;{faq.recommendedAnswerForKoc}&rdquo;
                  </p>
                </div>

                {/* Do Mention & Don't Say Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="p-2.5 rounded bg-emerald-50/50 border border-emerald-200 space-y-1">
                    <p className="font-semibold text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>KOC nên nhắc đến:</span>
                    </p>
                    <ul className="space-y-0.5 text-slate-700 text-2xs">
                      {faq.doMentionPoints.map((pt, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <span className="text-emerald-600 font-semibold">•</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-2.5 rounded bg-rose-50/50 border border-rose-200 space-y-1">
                    <p className="font-semibold text-rose-800 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Tuyệt đối không nói:</span>
                    </p>
                    <ul className="space-y-0.5 text-slate-700 text-2xs">
                      {faq.dontSayWords.map((pt, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <span className="text-rose-600 font-semibold">•</span>
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
            <div className="card-enterprise p-5 bg-amber-50/40 border-amber-200 space-y-3">
              <h4 className="text-xs font-semibold text-amber-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Quy Trình Xử Lý Sự Cố &amp; Khiếu Nại Khẩn Cấp (Crisis Protocol)</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {currentBrand.crisisProtocols.map((cp, idx) => (
                  <div key={idx} className="p-3 bg-white rounded border border-amber-200 space-y-1.5">
                    <div className="flex items-center justify-between font-semibold text-slate-900">
                      <span>Bước {cp.stepNumber}: {cp.actionTitle}</span>
                      <span className="text-amber-700 text-2xs bg-amber-100 px-1.5 py-0.5 rounded">
                        SLA: {cp.slaResponseMinutes} phút
                      </span>
                    </div>
                    <p className="text-slate-600 text-2xs">{cp.guidelineDescription}</p>
                    <p className="text-2xs text-blue-700 font-medium">Đầu mối liên hệ: {cp.contactPic}</p>
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
            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-600" />
              <span>Nguyên Tắc Hiển Thị Logo &amp; Nhận Diện (Safe Space)</span>
            </h4>
            <p className="text-slate-600 leading-relaxed">{currentBrand.logoAssetRules}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="card-enterprise p-5 border-emerald-200 bg-emerald-50/20 space-y-3">
              <h4 className="text-xs font-semibold text-emerald-800 flex items-center gap-2">
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
              <h4 className="text-xs font-semibold text-rose-800 flex items-center gap-2">
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
      {/* TAB 6: AI THẨM ĐỊNH KỊCH BẢN (AI SCRIPT INSPECTOR)                         */}
      {/* ========================================================================= */}
      {activeKnowledgeTab === 'AI_INSPECTOR' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header Banner & Demo Scenarios */}
          <div className="p-5 rounded-lg bg-purple-900 text-white shadow-md relative overflow-hidden">
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-purple-500/30 text-purple-200 border border-purple-400/40 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-purple-300" />
                    Bộ kiểm tra & đối soát quy chuẩn
                  </span>
                  <span className="text-xs text-purple-300 font-medium">
                    Chuẩn hóa theo Brand Guideline: <strong>{currentBrand.brandName}</strong>
                  </span>
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
                  <span>Thẩm Định &amp; Góp Ý Kịch Bản KOC Tự Động</span>
                </h3>
                <p className="text-xs text-purple-200/90 leading-relaxed">
                  Đối soát kịch bản KOC theo 5 tiêu chí: quét từ cấm, quy định pháp lý, đặc tính sản phẩm, giọng văn và cấu trúc kịch bản. Gợi ý điều chỉnh từ ngữ vi phạm.
                </p>
              </div>

              {/* 3 Preset Quick-Test Buttons */}
              <div className="space-y-2 shrink-0">
                <p className="text-2xs font-semibold text-purple-200">
                  Nạp kịch bản mẫu kiểm thử nhanh:
                </p>
                <div className="flex flex-wrap lg:flex-col gap-2">
                  <button
                    onClick={() => handleLoadPreset('SENKA_ERROR')}
                    className="px-3 py-1.5 rounded-md bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200 text-xs font-medium transition text-left flex items-center justify-between gap-2"
                  >
                    <span>Senka: Vi phạm từ cấm &amp; dìm đối thủ</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleLoadPreset('NATURE_DISCLAIMER')}
                    className="px-3 py-1.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-medium transition text-left flex items-center justify-between gap-2"
                  >
                    <span>Nature&apos;s Way: Thiếu cảnh báo BYT</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleLoadPreset('KUTIE_PERFECT')}
                    className="px-3 py-1.5 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-xs font-medium transition text-left flex items-center justify-between gap-2"
                  >
                    <span>Kutieskin: Chuẩn y khoa đạt 95đ</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 2-Column Workstation */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Cột Trái (5 Cột): Khung Nhập Liệu & Cấu Hình Đối Soát */}
            <div className="lg:col-span-5 space-y-4">
              <div className="card-enterprise p-5 bg-white space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-600" />
                    <span>Nội dung kịch bản cần kiểm thẩm</span>
                  </h4>
                  <span className="text-2xs text-slate-500">
                    {inputScriptText.trim().split(/\s+/).filter(Boolean).length} từ • {inputScriptText.length} ký tự
                  </span>
                </div>

                {/* SKU Selector Dropdown */}
                <div className="space-y-1.5 text-xs">
                  <label className="font-semibold text-slate-700 flex items-center justify-between">
                    <span>Sản phẩm đối soát:</span>
                    <span className="text-2xs text-blue-600 font-normal">
                      Khớp {currentBrand.skus.length} SKU trong kho
                    </span>
                  </label>
                  <select
                    value={selectedSkuId}
                    onChange={(e) => setSelectedSkuId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-slate-800 text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">-- Mặc định ({currentBrand.skus[0]?.name || 'Tất cả SKU'}) --</option>
                    {currentBrand.skus.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.volumeOrWeight}) - {s.priceVnd.toLocaleString('vi-VN')} đ
                      </option>
                    ))}
                  </select>
                </div>

                {/* Active Brand Context Pill */}
                <div className="p-3 bg-purple-50/60 rounded-md border border-purple-100 text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold text-purple-900">
                    <span>Nhãn hàng: {currentBrand.brandName}</span>
                    <span className="text-2xs bg-purple-200/70 text-purple-800 px-1.5 py-0.5 rounded">
                      Tone: {currentBrand.toneTag.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-2xs text-slate-600">
                    Đang giám sát <strong>{currentBrand.blacklistKeywords.length} từ cấm</strong> &amp;{' '}
                    <strong>{currentBrand.certifications.length} văn bản pháp lý</strong>.
                  </p>
                </div>

                {/* Script Textarea */}
                <div className="space-y-1.5">
                  <textarea
                    rows={10}
                    value={inputScriptText}
                    onChange={(e) => setInputScriptText(e.target.value)}
                    placeholder="Dán nội dung lời thoại kịch bản của KOC vào đây..."
                    className="w-full p-3 text-xs leading-relaxed text-slate-800 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono transition"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleRunAiAnalysis}
                    disabled={isAnalyzing || !inputScriptText.trim()}
                    className={`flex-1 py-2.5 px-4 rounded-md text-xs font-semibold text-white shadow-sm flex items-center justify-center gap-2 transition ${
                      isAnalyzing || !inputScriptText.trim()
                        ? 'bg-purple-300 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-700 active:scale-98'
                    }`}
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Đang kiểm tra &amp; đối soát kịch bản...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Kiểm tra kịch bản</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setInputScriptText('');
                      setAiAnalysisResult(null);
                    }}
                    title="Xóa trắng kịch bản"
                    className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md border border-slate-200 transition"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Cột Phải (7 Cột): Báo Cáo Phân Tích AI Chi tiết */}
            <div className="lg:col-span-7 space-y-4">
              {!aiAnalysisResult ? (
                <div className="card-enterprise p-12 bg-white text-center space-y-3 border-dashed border-2 border-slate-300">
                  <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-800">Chưa có dữ liệu phân tích kịch bản</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Vui lòng nhập kịch bản ở khung bên trái hoặc bấm vào một trong các kịch bản mẫu ở trên, sau đó nhấn <strong>&ldquo;Kiểm tra kịch bản&rdquo;</strong>.
                  </p>
                </div>
              ) : (
                <>
                  {/* Top Score Card & Verdict */}
                  <div className={`card-enterprise p-5 border-l-4 transition ${
                    aiAnalysisResult.complianceStatus === 'PASS'
                      ? 'border-l-emerald-500 bg-emerald-50/20 border-emerald-200'
                      : aiAnalysisResult.complianceStatus === 'WARNING'
                      ? 'border-l-amber-500 bg-amber-50/20 border-amber-200'
                      : 'border-l-rose-500 bg-rose-50/20 border-rose-200'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Left: Overall Score Dial */}
                      <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-full flex flex-col items-center justify-center font-semibold border-4 shrink-0 ${
                          aiAnalysisResult.complianceStatus === 'PASS'
                            ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                            : aiAnalysisResult.complianceStatus === 'WARNING'
                            ? 'border-amber-500 text-amber-700 bg-amber-50'
                            : 'border-rose-500 text-rose-700 bg-rose-50'
                        }`}>
                          <span className="text-xl leading-none">{aiAnalysisResult.overallScore}</span>
                          <span className="text-2xs font-normal text-slate-500">/ 100</span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded text-2xs font-semibold   border ${
                              aiAnalysisResult.complianceStatus === 'PASS'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : aiAnalysisResult.complianceStatus === 'WARNING'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-rose-100 text-rose-800 border-rose-300'
                            }`}>
                              {aiAnalysisResult.complianceStatus === 'PASS' && 'ĐẠT CHUẨN XUẤT SẮC (PASS)'}
                              {aiAnalysisResult.complianceStatus === 'WARNING' && 'CẢNH BÁO — CẦN ĐIỀU CHỈNH (WARNING)'}
                              {aiAnalysisResult.complianceStatus === 'FAIL' && 'KHÔNG ĐẠT — TỪ CHỐI DUYỆT (FAIL)'}
                            </span>
                            <span className="text-2xs text-slate-500">
                              Phát hiện {aiAnalysisResult.issues.length} vấn đề
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed font-medium">
                            {aiAnalysisResult.summaryVerdict}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 5-Dimension Score Progress Cards */}
                  <div className="card-enterprise p-4 bg-white space-y-3">
                    <h5 className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                      <span>Bảng điểm 5 trục chuẩn mực Brand Guideline</span>
                      <span className="text-2xs text-slate-400 font-normal">Độ tin cậy đối soát: 99.4%</span>
                    </h5>

                    <div className="grid grid-cols-1 gap-2.5">
                      {aiAnalysisResult.dimensions.map((dim, idx) => (
                        <div key={idx} className="p-2.5 rounded border border-slate-100 bg-slate-50/50 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between font-semibold">
                            <span className="text-slate-800">{dim.name}</span>
                            <div className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.2 rounded text-2xs font-semibold ${
                                dim.status === 'EXCELLENT'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : dim.status === 'GOOD'
                                  ? 'bg-blue-100 text-blue-800'
                                  : dim.status === 'WARNING'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                                {dim.status}
                              </span>
                              <span className="font-mono text-slate-900 font-semibold">
                                {dim.score}/{dim.maxScore} đ
                              </span>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                dim.status === 'EXCELLENT'
                                  ? 'bg-emerald-500'
                                  : dim.status === 'GOOD'
                                  ? 'bg-blue-500'
                                  : dim.status === 'WARNING'
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(100, (dim.score / dim.maxScore) * 100)}%` }}
                            />
                          </div>

                          <p className="text-2xs text-slate-600">{dim.feedback}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Detected Issues Details */}
                  {aiAnalysisResult.issues.length > 0 && (
                    <div className="card-enterprise p-4 bg-white space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h5 className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span>Chi tiết Lỗi &amp; Rủi Ro Phát Hiện ({aiAnalysisResult.issues.length})</span>
                        </h5>
                        <span className="text-2xs text-slate-500">Cần sửa trước khi gửi Brand</span>
                      </div>

                      <div className="space-y-2.5">
                        {aiAnalysisResult.issues.map((issue) => (
                          <div
                            key={issue.id}
                            className={`p-3 rounded-md border text-xs space-y-1.5 ${
                              issue.severity === 'CRITICAL'
                                ? 'bg-rose-50/40 border-rose-200 text-rose-900'
                                : issue.severity === 'WARNING'
                                ? 'bg-amber-50/40 border-amber-200 text-amber-900'
                                : 'bg-blue-50/40 border-blue-200 text-blue-900'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold flex items-center gap-1.5">
                                {issue.severity === 'CRITICAL' && <AlertOctagon className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                                {issue.severity === 'WARNING' && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                                {issue.severity === 'SUGGESTION' && <Lightbulb className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                                <span>{issue.title}</span>
                              </span>
                              <span className={`px-1.5 py-0.2 rounded text-2xs font-semibold ${
                                issue.severity === 'CRITICAL'
                                  ? 'bg-rose-200 text-rose-800'
                                  : issue.severity === 'WARNING'
                                  ? 'bg-amber-200 text-amber-800'
                                  : 'bg-blue-200 text-blue-800'
                              }`}>
                                {issue.severity}
                              </span>
                            </div>

                            <p className="text-2xs text-slate-700 leading-relaxed">
                              <strong>Lý do rủi ro:</strong> {issue.rationale}
                            </p>

                            {issue.replacementSuggestion && (
                              <div className="p-2 rounded bg-white border border-slate-200/80 flex items-start justify-between gap-2 text-2xs">
                                <div>
                                  <span className="text-emerald-700 font-semibold">Gợi ý chuẩn Brand: </span>
                                  <span className="text-slate-800 italic">&ldquo;{issue.replacementSuggestion}&rdquo;</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Rewritten Script Card (Auto-Fixed) */}
                  <div className="card-enterprise p-5 bg-purple-50/50 border-purple-200 space-y-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-100 pb-3">
                      <div>
                        <h5 className="text-sm font-semibold text-purple-950 flex items-center gap-2">
                          <Wand2 className="w-4 h-4 text-purple-600" />
                          <span>Kịch bản gợi ý sau khi sửa từ khóa vi phạm</span>
                        </h5>
                        <p className="text-2xs text-slate-500">
                          Tự động khử từ cấm, thay thế bằng thuật ngữ y khoa và chèn tuyên bố pháp lý
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleApplyRewritten}
                          className="px-2.5 py-1 rounded bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-semibold transition flex items-center gap-1"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                          <span>Áp dụng vào ô nhập</span>
                        </button>

                        <button
                          onClick={() => handleCopy('ai-rewritten-script', aiAnalysisResult.rewrittenScript.fullText)}
                          className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition flex items-center gap-1 shadow-xs"
                        >
                          {copiedId === 'ai-rewritten-script' ? (
                            <>
                              <CheckCheck className="w-3.5 h-3.5 text-white" />
                              <span>Đã chép!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Sao chép lời thoại</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 4-Part Structure Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-white rounded border border-purple-100 space-y-1">
                        <span className="font-semibold text-purple-800 text-2xs">1. Hook 3 giây đầu:</span>
                        <p className="text-slate-700 text-2xs leading-relaxed italic">
                          &ldquo;{aiAnalysisResult.rewrittenScript.hook}&rdquo;
                        </p>
                      </div>

                      <div className="p-3 bg-white rounded border border-purple-100 space-y-1">
                        <span className="font-semibold text-amber-800 text-2xs">2. Nỗi đau người dùng:</span>
                        <p className="text-slate-700 text-2xs leading-relaxed italic">
                          &ldquo;{aiAnalysisResult.rewrittenScript.painPoint}&rdquo;
                        </p>
                      </div>

                      <div className="p-3 bg-white rounded border border-purple-100 space-y-1">
                        <span className="font-semibold text-blue-800 text-2xs">3. Giải Pháp &amp; USPs Độc Quyền:</span>
                        <p className="text-slate-700 text-2xs leading-relaxed italic">
                          &ldquo;{aiAnalysisResult.rewrittenScript.solutionAndUsp}&rdquo;
                        </p>
                      </div>

                      <div className="p-3 bg-white rounded border border-purple-100 space-y-1">
                        <span className="font-semibold text-emerald-800 text-2xs">4. Kêu gọi hành động (CTA):</span>
                        <p className="text-slate-700 text-2xs leading-relaxed italic">
                          &ldquo;{aiAnalysisResult.rewrittenScript.callToAction}&rdquo;
                        </p>
                      </div>
                    </div>

                    {/* Full Script Box */}
                    <div className="p-3.5 bg-white rounded-md border border-purple-200 text-xs text-slate-800 space-y-1.5 font-mono">
                      <span className="text-2xs font-semibold text-purple-900 font-sans block">
                        Toàn văn kịch bản hoàn chỉnh (sẵn sàng gửi KOC bấm máy):
                      </span>
                      <p className="whitespace-pre-line text-slate-800 leading-relaxed text-2xs bg-slate-50 p-3 rounded border border-slate-200">
                        {aiAnalysisResult.rewrittenScript.fullText}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
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
                  <h3 className="text-sm font-semibold text-slate-900">
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
                <span className="font-mono bg-white px-3 py-1 rounded border border-slate-200 text-slate-800 font-semibold truncate">
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
                    <span>Đã Sao chép link gửi KOC!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép link gửi KOC</span>
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
                  <span className="px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-blue-100 text-blue-800">
                    Bảng hướng dẫn dành cho creator / KOC
                  </span>
                  <h3 className="text-lg font-semibold text-slate-900">{currentBrand.brandName}</h3>
                  <p className="text-xs text-blue-700 italic">&ldquo;{currentBrand.slogan}&rdquo;</p>
                  <p className="text-2xs text-slate-500">Giọng điệu: <strong>{currentBrand.toneOfVoice}</strong></p>
                </div>

                {/* Hero SKUs Quick Cards */}
                <div className="space-y-2">
                  <p className="font-semibold text-slate-800 text-xs flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    <span>Sản phẩm chủ lực cần Quay</span>
                  </p>
                  {currentBrand.skus.map((sku) => (
                    <div key={sku.id} className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1.5">
                      <div className="flex justify-between font-semibold text-slate-900">
                        <span>{sku.name}</span>
                        <span className="text-blue-700">{sku.priceVnd.toLocaleString('vi-VN')} đ</span>
                      </div>
                      <p className="text-2xs text-slate-600"><strong>Cơ chế:</strong> {sku.scientificMechanism}</p>
                      <div className="space-y-0.5 pt-1">
                        {sku.uniqueSellingPoints.map((usp, idx) => (
                          <p key={idx} className="text-2xs text-slate-700 flex items-start gap-1">
                            <span className="text-emerald-600 font-semibold">•</span>
                            <span>{usp}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Blacklist Warning */}
                <div className="p-3 bg-rose-50 rounded border border-rose-200 space-y-1">
                  <p className="font-semibold text-rose-800 flex items-center gap-1">
                    <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                    <span>Lưu ý cấm kỵ (tuyệt đối không dùng từ này)</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {currentBrand.blacklistKeywords.map((kw) => (
                      <span key={kw.id} className="px-2 py-0.5 bg-white text-rose-800 rounded border border-rose-200 font-semibold text-2xs">
                        ✕ {kw.keyword}
                      </span>
                    ))}
                  </div>
                </div>

                {/* FAQ Quick Objection */}
                {currentBrand.objectionFaqs[0] && (
                  <div className="p-3 bg-indigo-50 rounded border border-indigo-200 space-y-1">
                    <p className="font-semibold text-indigo-900">Gợi ý trả lời khi bị người xem hỏi khó:</p>
                    <p className="text-2xs font-semibold text-slate-800">Q: {currentBrand.objectionFaqs[0].question}</p>
                    <p className="text-2xs text-slate-600">&ldquo;{currentBrand.objectionFaqs[0].recommendedAnswerForKoc}&rdquo;</p>
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
                <h3 className="text-sm font-semibold text-slate-900">
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
                  Nhóm vấn đề *
                </label>
                <select
                  value={newFaqConcern}
                  onChange={(e) => setNewFaqConcern(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="KÍCH_ỨNG_MẨN_ĐỎ">Kích ứng / mẩn đỏ / da nhạy cảm</option>
                  <option value="GIÁ_CẢ">Giá cả / So sánh đắt rẻ</option>
                  <option value="HIỆU_QUẢ_CHẬM">Hiệu quả / tác dụng chậm</option>
                  <option value="NGUỒN_GỐC_XUẤT_XỨ">Nguồn gốc / hàng giả / xách Tay</option>
                  <option value="SO_SÁNH_ĐỐI_THỦ">So sánh trực tiếp đối thủ</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Câu hỏi hóc búa của người xem *
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
                  Câu trả lời mẫu chuẩn cho KOC (đã duyệt) *
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
                  Những điểm KOC nên nhấn mạnh (cách nhau bằng dấu phẩy)
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
                  Những từ KOC tuyệt đối tránh nói (cách nhau bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  placeholder="VD: Khô rát, thuốc trị, hút cạn dầu"
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
                  Lưu vào bách khoa Tri thức
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
