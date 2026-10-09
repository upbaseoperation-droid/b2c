'use client';

import React, { useState, useMemo } from 'react';
import { ChannelTag } from '../ui';
import { 
  Search, 
  ExternalLink, 
  Filter, 
  RotateCcw, 
  Plus, 
  X, 
  CheckCircle2,
  Shield,
  Tag,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { UserProfile, BrandDetail, StorePortfolioItem, KocItem, MasterContentPillar } from '../../lib/types';
import { INITIAL_BRANDS, INITIAL_STORE_PORTFOLIOS, USERS, INITIAL_KOCS, INITIAL_PUSH_PRODUCTS } from '../../lib/mockData';
import { 
  UPBASE_MASTER_PILLARS, 
  UPBASE_CAST_TIERS, 
  UPBASE_VIDEO_FORMATS, 
  UPBASE_KOC_NICHES, 
  UPBASE_STORES_MASTER, 
  UPBASE_STAFF_MASTER, 
  UPBASE_BRANDS_MASTER 
} from '../../lib/importedMasterData';
import { KocMasterDataView } from './KocMasterDataView';
import { 
  CastTiersMasterView, 
  KocNichesMasterView, 
  VideoFormatsMasterView, 
  StoresMasterView, 
  StaffMasterView 
} from './master-data';

export type MasterDataSubTab = 
  | 'brands' 
  | 'stores' 
  | 'products' 
  | 'pillars' 
  | 'cast-tiers' 
  | 'koc-niches' 
  | 'video-formats' 
  | 'kocs' 
  | 'staff';

export interface MasterProductItem {
  id: string;
  sku: string;
  productName: string;
  brandName: string;
  storeName: string;
  platform: 'TikTok Shop' | 'Shopee Mall' | 'Lazada';
  category: string;
  originalPrice: number;
  pdpUrl: string;
  status: 'ACTIVE' | 'DISCONTINUED';
}

interface MasterDataHubViewProps {
  currentUser: UserProfile;
  initialSubTab?: MasterDataSubTab;
  brands?: BrandDetail[];
  kocs?: KocItem[];
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onOpenQuickBookWithKoc?: (koc: KocItem) => void;
  onKocCreated?: (koc: KocItem) => void;
  onKocUpdated?: (koc: KocItem) => void;
}

export const MasterDataHubView: React.FC<MasterDataHubViewProps> = ({
  currentUser,
  initialSubTab = 'brands',
  brands = INITIAL_BRANDS,
  kocs = INITIAL_KOCS,
  onNotify,
  onOpenQuickBookWithKoc,
  onKocCreated,
  onKocUpdated
}) => {
  const [activeSubTab, setActiveSubTab] = useState<MasterDataSubTab>(initialSubTab);

  // Brand state (Tải 625 thương hiệu chuẩn Upbase Master Data)
  const [brandList, setBrandList] = useState<BrandDetail[]>(() => 
    UPBASE_BRANDS_MASTER.length > 0 ? UPBASE_BRANDS_MASTER : brands
  );
  const [brandSearch, setBrandSearch] = useState('');
  const [selectedBrandCategory, setSelectedBrandCategory] = useState('ALL');
  const [selectedBrandStatus, setSelectedBrandStatus] = useState('ALL');
  const [selectedBrandPic, setSelectedBrandPic] = useState('ALL');
  const [selectedBrandBudgetTier, setSelectedBrandBudgetTier] = useState('ALL');
  const [brandPage, setBrandPage] = useState(1);
  const BRAND_PAGE_SIZE = 25;

  // Dynamic Brand Categories & PICs
  const brandCategories = useMemo(() => {
    const set = new Set<string>();
    brandList.forEach(b => {
      if (b.category) set.add(b.category.trim());
    });
    return Array.from(set).sort();
  }, [brandList]);

  const brandPics = useMemo(() => {
    const set = new Set<string>();
    brandList.forEach(b => {
      if (b.accountPic) set.add(b.accountPic.trim());
      if (b.growthPic) set.add(b.growthPic.trim());
      if (b.bookingPicLead) set.add(b.bookingPicLead.trim());
    });
    return Array.from(set).sort();
  }, [brandList]);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandDetail | null>(null);
  const [brandForm, setBrandForm] = useState({
    name: '',
    companyName: '',
    category: 'Mẹ & Bé',
    contactPerson: '',
    status: 'ACTIVE' as 'ACTIVE' | 'PAUSED' | 'UPCOMING'
  });

  // Store state (Tải 957 gian hàng chuẩn Upbase Master Data)
  const [storeList, setStoreList] = useState<StorePortfolioItem[]>(UPBASE_STORES_MASTER);
  const [storeSearch, setStoreSearch] = useState('');
  const [selectedStorePlatform, setSelectedStorePlatform] = useState('ALL');
  const [selectedStoreBrand, setSelectedStoreBrand] = useState('ALL');
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [storeForm, setStoreForm] = useState({
    storeName: '',
    brandName: brands[0]?.name || 'Kutieskin',
    platform: 'TikTok Shop' as 'TikTok Shop' | 'Shopee Mall' | 'Lazada',
    storeUrl: '',
    accountOwnerName: 'Hoàng Long'
  });

  // Master Product Catalog state (Dữ liệu gốc sản phẩm)
  const [productList, setProductList] = useState<MasterProductItem[]>(() => 
    INITIAL_PUSH_PRODUCTS.map(p => ({
      id: p.id,
      sku: p.sku,
      productName: p.productName,
      brandName: p.brandName,
      storeName: p.storeName || (p.platform === 'TIKTOK_SHOP' ? `${p.brandName} TikTok Shop` : `${p.brandName} Shopee Mall`),
      platform: p.platform === 'TIKTOK_SHOP' ? 'TikTok Shop' : p.platform === 'SHOPEE_MALL' ? 'Shopee Mall' : 'Lazada',
      category: p.brandCategory,
      originalPrice: p.originalPrice,
      pdpUrl: p.pdpUrl || '',
      status: 'ACTIVE'
    }))
  );
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductBrand, setSelectedProductBrand] = useState('ALL');
  const [selectedProductPlatform, setSelectedProductPlatform] = useState('ALL');
  const [selectedProductCategory, setSelectedProductCategory] = useState('ALL');
  const [selectedProductPriceRange, setSelectedProductPriceRange] = useState('ALL');
  const [selectedProductStatus, setSelectedProductStatus] = useState('ALL');

  const productCategories = useMemo(() => {
    const set = new Set<string>();
    productList.forEach(p => {
      if (p.category) set.add(p.category.trim());
    });
    return Array.from(set).sort();
  }, [productList]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MasterProductItem | null>(null);
  const [productForm, setProductForm] = useState({
    sku: '',
    productName: '',
    brandName: brands[0]?.name || 'Kutieskin',
    storeName: '',
    platform: 'Shopee Mall' as 'TikTok Shop' | 'Shopee Mall' | 'Lazada',
    category: 'Mẹ & Bé',
    originalPrice: 150000,
    pdpUrl: '',
    status: 'ACTIVE' as 'ACTIVE' | 'DISCONTINUED'
  });

  // Staff state
  // Master Content Pillars state (15 Trụ cột nội dung chuẩn Upbase Master Data 5.5)
  const [pillarList, setPillarList] = useState<MasterContentPillar[]>(UPBASE_MASTER_PILLARS);
  const [pillarSearch, setPillarSearch] = useState('');
  const [selectedPillarNiche, setSelectedPillarNiche] = useState('ALL');
  const [selectedPillarStatus, setSelectedPillarStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [selectedPillarCostTier, setSelectedPillarCostTier] = useState('ALL');
  const [isPillarModalOpen, setIsPillarModalOpen] = useState(false);
  const [editingPillar, setEditingPillar] = useState<MasterContentPillar | null>(null);
  const [pillarForm, setPillarForm] = useState({
    code: '',
    name: '',
    description: '',
    applicableNiches: 'Mẹ & Bé, Chăm Sóc Da',
    suggestedFormats: 'Voiceover chuyên gia + B-roll, Infographic trực quan',
    benchmarkUnitCost: 1500000,
    targetAudience: 'Phụ huynh có con nhỏ, người có vấn đề da liễu',
    keyObjectives: 'Xây dựng uy tín nhãn hàng, định vị chuyên gia & gieo niềm tin',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    colorTag: '#4F46E5'
  });

  const [staffSearch, setStaffSearch] = useState('');
  const [selectedStaffRole, setSelectedStaffRole] = useState('ALL');

  // Filtered Brands with Multi-dimensions
  const filteredBrands = useMemo(() => {
    return brandList.filter(b => {
      if (selectedBrandCategory !== 'ALL' && b.category !== selectedBrandCategory) return false;
      if (selectedBrandStatus !== 'ALL' && b.status !== selectedBrandStatus) return false;
      if (selectedBrandPic !== 'ALL') {
        const matchPic = (b.accountPic && b.accountPic.includes(selectedBrandPic)) ||
                         (b.growthPic && b.growthPic.includes(selectedBrandPic)) ||
                         (b.bookingPicLead && b.bookingPicLead.includes(selectedBrandPic));
        if (!matchPic) return false;
      }
      if (selectedBrandBudgetTier !== 'ALL') {
        const budget = b.planBudget || 0;
        if (selectedBrandBudgetTier === 'TIER_TOP' && budget < 100000000) return false;
        if (selectedBrandBudgetTier === 'TIER_MID' && (budget < 50000000 || budget >= 100000000)) return false;
        if (selectedBrandBudgetTier === 'TIER_LOW' && (budget === 0 || budget >= 50000000)) return false;
        if (selectedBrandBudgetTier === 'TIER_ZERO' && budget > 0) return false;
      }
      if (brandSearch.trim()) {
        const q = brandSearch.toLowerCase();
        return (
          b.name.toLowerCase().includes(q) ||
          b.companyName.toLowerCase().includes(q) ||
          (b.code && b.code.toLowerCase().includes(q)) ||
          (b.accountPic && b.accountPic.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [brandList, selectedBrandCategory, selectedBrandStatus, selectedBrandPic, selectedBrandBudgetTier, brandSearch]);

  const isBrandFiltered = brandSearch.trim() !== '' || selectedBrandCategory !== 'ALL' || selectedBrandStatus !== 'ALL' || selectedBrandPic !== 'ALL' || selectedBrandBudgetTier !== 'ALL';

  const handleResetBrandFilters = () => {
    setBrandSearch('');
    setSelectedBrandCategory('ALL');
    setSelectedBrandStatus('ALL');
    setSelectedBrandPic('ALL');
    setSelectedBrandBudgetTier('ALL');
    setBrandPage(1);
  };

  const totalBrandPages = Math.ceil(filteredBrands.length / BRAND_PAGE_SIZE) || 1;
  const currentBrands = filteredBrands.slice((brandPage - 1) * BRAND_PAGE_SIZE, brandPage * BRAND_PAGE_SIZE);

  // Filtered Stores
  const filteredStores = storeList.filter(s => {
    if (selectedStorePlatform !== 'ALL' && s.platform !== selectedStorePlatform) return false;
    if (selectedStoreBrand !== 'ALL' && s.brandName !== selectedStoreBrand) return false;
    if (storeSearch.trim()) {
      const q = storeSearch.toLowerCase();
      return s.storeName.toLowerCase().includes(q) || s.brandName.toLowerCase().includes(q);
    }
    return true;
  });

  // Filtered Master Products with Multi-dimensions
  const filteredProducts = useMemo(() => {
    return productList.filter(p => {
      if (selectedProductBrand !== 'ALL' && p.brandName !== selectedProductBrand) return false;
      if (selectedProductPlatform !== 'ALL' && p.platform !== selectedProductPlatform) return false;
      if (selectedProductCategory !== 'ALL' && p.category !== selectedProductCategory) return false;
      if (selectedProductStatus !== 'ALL' && p.status !== selectedProductStatus) return false;
      if (selectedProductPriceRange !== 'ALL') {
        const price = p.originalPrice || 0;
        if (selectedProductPriceRange === 'UNDER_200K' && price >= 200000) return false;
        if (selectedProductPriceRange === '200K_500K' && (price < 200000 || price > 500000)) return false;
        if (selectedProductPriceRange === '500K_1M' && (price < 500000 || price > 1000000)) return false;
        if (selectedProductPriceRange === 'OVER_1M' && price <= 1000000) return false;
      }
      if (productSearch.trim()) {
        const q = productSearch.toLowerCase();
        return (
          p.productName.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.brandName.toLowerCase().includes(q) ||
          p.storeName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [productList, selectedProductBrand, selectedProductPlatform, selectedProductCategory, selectedProductPriceRange, selectedProductStatus, productSearch]);

  const isProductFiltered = productSearch.trim() !== '' || selectedProductBrand !== 'ALL' || selectedProductPlatform !== 'ALL' || selectedProductCategory !== 'ALL' || selectedProductPriceRange !== 'ALL' || selectedProductStatus !== 'ALL';

  const handleResetProductFilters = () => {
    setProductSearch('');
    setSelectedProductBrand('ALL');
    setSelectedProductPlatform('ALL');
    setSelectedProductCategory('ALL');
    setSelectedProductPriceRange('ALL');
    setSelectedProductStatus('ALL');
  };

  // Filtered Staff
  const filteredStaff = USERS.filter(u => {
    if (selectedStaffRole !== 'ALL' && u.role !== selectedStaffRole) return false;
    if (staffSearch.trim()) {
      const q = staffSearch.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.roleTitle.toLowerCase().includes(q);
    }
    return true;
  });

  // Filtered Content Pillars with Multi-dimensions
  const filteredPillars = useMemo(() => {
    return pillarList.filter(p => {
      if (selectedPillarStatus !== 'ALL' && p.status !== selectedPillarStatus) return false;
      if (selectedPillarNiche !== 'ALL') {
        const matchNiche = p.applicableNiches.some(n => 
          n.toLowerCase().includes(selectedPillarNiche.toLowerCase()) || n === 'Toàn ngành'
        );
        if (!matchNiche) return false;
      }
      if (selectedPillarCostTier !== 'ALL') {
        const cost = p.benchmarkUnitCost || 0;
        if (selectedPillarCostTier === 'UNDER_1M' && cost >= 1000000) return false;
        if (selectedPillarCostTier === '1M_2M' && (cost < 1000000 || cost > 2000000)) return false;
        if (selectedPillarCostTier === 'OVER_2M' && cost <= 2000000) return false;
      }
      if (pillarSearch.trim()) {
        const q = pillarSearch.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) || 
          p.code.toLowerCase().includes(q) || 
          p.description.toLowerCase().includes(q) ||
          p.keyObjectives.toLowerCase().includes(q) ||
          p.applicableNiches.some(n => n.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [pillarList, selectedPillarStatus, selectedPillarNiche, selectedPillarCostTier, pillarSearch]);

  const isPillarFiltered = pillarSearch.trim() !== '' || selectedPillarNiche !== 'ALL' || selectedPillarStatus !== 'ALL' || selectedPillarCostTier !== 'ALL';

  const handleResetPillarFilters = () => {
    setPillarSearch('');
    setSelectedPillarNiche('ALL');
    setSelectedPillarStatus('ALL');
    setSelectedPillarCostTier('ALL');
  };

  // Format Currency
  const formatVnd = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  // Handle Add/Edit Brand
  const handleSaveBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandForm.name.trim()) return;

    if (editingBrand) {
      setBrandList(prev => prev.map(b => b.id === editingBrand.id ? {
        ...b,
        name: brandForm.name.trim(),
        companyName: brandForm.companyName.trim() || brandForm.name.trim(),
        category: brandForm.category,
        accountPic: brandForm.contactPerson.trim() || b.accountPic,
        status: brandForm.status
      } : b));
      if (onNotify) onNotify(`Đã cập nhật thông tin thương hiệu ${brandForm.name}`);
    } else {
      const newBrand: BrandDetail = {
        id: `brand-${Date.now()}`,
        code: brandForm.name.slice(0, 4).toUpperCase(),
        name: brandForm.name.trim(),
        companyName: brandForm.companyName.trim() || brandForm.name.trim(),
        category: brandForm.category,
        color: '#4F46E5',
        status: brandForm.status,
        planBudget: 0,
        spentBudget: 0,
        targetGmv: 0,
        currentGmv: 0,
        targetVideos: 0,
        airedVideos: 0,
        accountPic: brandForm.contactPerson.trim() || 'Vân Ngọc',
        growthPic: 'Hoàng Long',
        bookingPicLead: 'Khánh Vy',
        brandGuideline: 'Tài liệu hướng dẫn nhãn hàng',
        kocCriteria: 'KOC uy tín, tỷ lệ hoàn tất tốt',
        stores: [],
        heroProducts: []
      };
      setBrandList(prev => [newBrand, ...prev]);
      if (onNotify) onNotify(`Đã thêm thương hiệu mới ${brandForm.name}`);
    }
    setIsBrandModalOpen(false);
    setEditingBrand(null);
  };

  // Handle Add Store
  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeForm.storeName.trim()) return;

    const newStore: StorePortfolioItem = {
      id: `store-${Date.now()}`,
      storeName: storeForm.storeName.trim(),
      brandName: storeForm.brandName,
      platform: storeForm.platform,
      storeUrl: storeForm.storeUrl.trim(),
      serviceModel: 'FULL_SERVICE',
      difficultyTier: 'Tiêu chuẩn',
      difficultyMultiplier: 1.0,
      accountStatus: 'ACTIVE',
      category: 'Mẹ & Bé',
      monthlyTargetGmv: 300000000,
      monthlyBudget: 20000000,
      accountOwnerName: storeForm.accountOwnerName,
      b2cOwnerName: 'Khánh Vy',
      b2cOwners: ['Khánh Vy'],
      assignmentNotes: ''
    };
    setStoreList(prev => [newStore, ...prev]);
    if (onNotify) onNotify(`Đã thêm gian hàng ${storeForm.storeName}`);
    setIsStoreModalOpen(false);
  };

  // Handle Add / Edit Master Product
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.sku.trim() || !productForm.productName.trim()) return;

    if (editingProduct) {
      setProductList(prev => prev.map(p => p.id === editingProduct.id ? {
        ...p,
        sku: productForm.sku.trim().toUpperCase(),
        productName: productForm.productName.trim(),
        brandName: productForm.brandName,
        storeName: productForm.storeName.trim() || `${productForm.brandName} ${productForm.platform}`,
        platform: productForm.platform,
        category: productForm.category,
        originalPrice: Number(productForm.originalPrice),
        pdpUrl: productForm.pdpUrl.trim(),
        status: productForm.status
      } : p));
      if (onNotify) onNotify(`Đã cập nhật sản phẩm [${productForm.sku}] vào dữ liệu gốc`);
    } else {
      const newProd: MasterProductItem = {
        id: `mp-${Date.now()}`,
        sku: productForm.sku.trim().toUpperCase(),
        productName: productForm.productName.trim(),
        brandName: productForm.brandName,
        storeName: productForm.storeName.trim() || `${productForm.brandName} ${productForm.platform}`,
        platform: productForm.platform,
        category: productForm.category,
        originalPrice: Number(productForm.originalPrice),
        pdpUrl: productForm.pdpUrl.trim(),
        status: productForm.status
      };
      setProductList(prev => [newProd, ...prev]);
      if (onNotify) onNotify(`Đã thêm sản phẩm [${newProd.sku}] vào dữ liệu gốc`);
    }
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  // Handle Add / Edit Master Content Pillar
  const handleSavePillar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pillarForm.code.trim() || !pillarForm.name.trim()) return;

    const niches = pillarForm.applicableNiches
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const formats = pillarForm.suggestedFormats
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    if (editingPillar) {
      setPillarList(prev => prev.map(p => p.id === editingPillar.id ? {
        ...p,
        code: pillarForm.code.trim().toUpperCase(),
        name: pillarForm.name.trim(),
        description: pillarForm.description.trim(),
        applicableNiches: niches.length > 0 ? niches : ['Toàn ngành'],
        suggestedFormats: formats.length > 0 ? formats : ['Video ngắn chuẩn'],
        benchmarkUnitCost: Number(pillarForm.benchmarkUnitCost) || 1000000,
        targetAudience: pillarForm.targetAudience.trim() || 'Người dùng đa kênh',
        keyObjectives: pillarForm.keyObjectives.trim() || 'Tăng độ nhận diện thương hiệu',
        status: pillarForm.status,
        colorTag: pillarForm.colorTag || '#4F46E5'
      } : p));
      if (onNotify) onNotify(`Đã cập nhật trụ cột nội dung: ${pillarForm.name}`);
    } else {
      const newPillar: MasterContentPillar = {
        id: `MASTER-PIL-${Date.now()}`,
        code: pillarForm.code.trim().toUpperCase(),
        name: pillarForm.name.trim(),
        description: pillarForm.description.trim(),
        applicableNiches: niches.length > 0 ? niches : ['Toàn ngành'],
        suggestedFormats: formats.length > 0 ? formats : ['Video ngắn chuẩn'],
        benchmarkUnitCost: Number(pillarForm.benchmarkUnitCost) || 1000000,
        targetAudience: pillarForm.targetAudience.trim() || 'Người dùng đa kênh',
        keyObjectives: pillarForm.keyObjectives.trim() || 'Tăng độ nhận diện thương hiệu',
        status: pillarForm.status,
        colorTag: pillarForm.colorTag || '#4F46E5',
        activeBrandsCount: 0,
        createdAt: new Date().toISOString().split('T')[0]
      };
      setPillarList(prev => [newPillar, ...prev]);
      if (onNotify) onNotify(`Đã thêm trụ cột nội dung mới: ${pillarForm.name}`);
    }
    setIsPillarModalOpen(false);
    setEditingPillar(null);
  };

  const handleTogglePillarStatus = (pillarId: string) => {
    setPillarList(prev => prev.map(p => {
      if (p.id === pillarId) {
        const nextStatus = p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        if (onNotify) onNotify(`${p.name} chuyển sang trạng thái ${nextStatus === 'ACTIVE' ? 'Áp dụng' : 'Tạm dừng'}`);
        return { ...p, status: nextStatus };
      }
      return p;
    }));
  };

  return (
    <div className="space-y-5">
      {/* Sub-Tabs Navigation */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 pt-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <h1 className="text-base font-semibold text-slate-900">Dữ liệu gốc</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Quản lý các danh mục nền tảng: Thương hiệu, gian hàng, sản phẩm, trụ cột nội dung, KOC và nhân sự
            </p>
          </div>
        </div>

        {/* Minimalist Sub-Tabs */}
        <div className="flex space-x-6 overflow-x-auto text-xs font-medium pt-1">
          <button
            type="button"
            onClick={() => setActiveSubTab('brands')}
            className={`py-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'brands'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Thương hiệu</span>
            <span className="text-2xs font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
              {brandList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('stores')}
            className={`py-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'stores'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Gian hàng</span>
            <span className="text-2xs font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
              {storeList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('products')}
            className={`py-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'products'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Sản phẩm</span>
            <span className="text-2xs font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
              {productList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('pillars')}
            className={`py-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'pillars'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Trụ cột nội dung</span>
            <span className="text-2xs font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
              {pillarList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('cast-tiers')}
            className={`py-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'cast-tiers'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Bậc cast & Phân nhóm</span>
            <span className="text-2xs font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
              {UPBASE_CAST_TIERS.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('koc-niches')}
            className={`py-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'koc-niches'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Tệp kênh KOC</span>
            <span className="text-2xs font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
              {UPBASE_KOC_NICHES.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('video-formats')}
            className={`py-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'video-formats'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Định dạng video</span>
            <span className="text-2xs font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
              {UPBASE_VIDEO_FORMATS.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('kocs')}
            className={`py-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'kocs'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Danh bạ KOC</span>
            <span className="text-2xs font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
              {kocs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('staff')}
            className={`py-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'staff'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Nhân sự Booking</span>
            <span className="text-2xs font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
              {UPBASE_STAFF_MASTER.length}
            </span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: THƯƠNG HIỆU */}
      {activeSubTab === 'brands' && (
        <div className="space-y-4">
          {/* Enhanced Brands Multi-Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            {/* Top row: Search + Add button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm thương hiệu, công ty chủ quản, mã brand..."
                  value={brandSearch}
                  onChange={(e) => {
                    setBrandSearch(e.target.value);
                    setBrandPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-slate-800 bg-slate-50/50"
                />
                {brandSearch && (
                  <button
                    onClick={() => setBrandSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingBrand(null);
                  setBrandForm({
                    name: '',
                    companyName: '',
                    category: 'Mẹ & Bé',
                    contactPerson: '',
                    status: 'ACTIVE'
                  });
                  setIsBrandModalOpen(true);
                }}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shrink-0 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm thương hiệu
              </button>
            </div>

            {/* Bottom row: Multi-dimension filters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div>
                <label className="text-3xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  1. Ngành hàng ({brandCategories.length}):
                </label>
                <select
                  value={selectedBrandCategory}
                  onChange={(e) => {
                    setSelectedBrandCategory(e.target.value);
                    setBrandPage(1);
                  }}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-medium text-slate-800 focus:outline-none focus:border-slate-800"
                >
                  <option value="ALL">Tất cả ngành hàng</option>
                  {brandCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-3xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  2. Trạng thái vận hành:
                </label>
                <select
                  value={selectedBrandStatus}
                  onChange={(e) => {
                    setSelectedBrandStatus(e.target.value);
                    setBrandPage(1);
                  }}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-medium text-slate-800 focus:outline-none focus:border-slate-800"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="ACTIVE">Đang hoạt động (ACTIVE)</option>
                  <option value="PAUSED">Tạm dừng (PAUSED)</option>
                  <option value="UPCOMING">Sắp diễn ra (UPCOMING)</option>
                </select>
              </div>

              <div>
                <label className="text-3xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  3. Nhân sự phụ trách (PIC):
                </label>
                <select
                  value={selectedBrandPic}
                  onChange={(e) => {
                    setSelectedBrandPic(e.target.value);
                    setBrandPage(1);
                  }}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-medium text-slate-800 focus:outline-none focus:border-slate-800"
                >
                  <option value="ALL">Tất cả nhân sự phụ trách</option>
                  {brandPics.map(pic => (
                    <option key={pic} value={pic}>{pic}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-3xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  4. Quy mô Ngân sách tháng:
                </label>
                <select
                  value={selectedBrandBudgetTier}
                  onChange={(e) => {
                    setSelectedBrandBudgetTier(e.target.value);
                    setBrandPage(1);
                  }}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-medium text-slate-800 focus:outline-none focus:border-slate-800"
                >
                  <option value="ALL">Mọi quy mô ngân sách</option>
                  <option value="TIER_TOP">Top chiến lược (&gt; 100M)</option>
                  <option value="TIER_MID">Trung bình (50M - 100M)</option>
                  <option value="TIER_LOW">Khởi tạo (&lt; 50M)</option>
                  <option value="TIER_ZERO">Chưa có ngân sách (0đ)</option>
                </select>
              </div>

              <div className="flex items-end">
                {isBrandFiltered ? (
                  <button
                    type="button"
                    onClick={handleResetBrandFilters}
                    className="w-full py-1.5 px-3 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Xóa bộ lọc</span>
                  </button>
                ) : (
                  <div className="text-2xs text-slate-400 px-2 py-1.5 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <span>Bộ lọc đa chiều</span>
                  </div>
                )}
              </div>
            </div>

            {/* Filter Results Summary */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-2xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>
                  Tìm thấy <strong className="text-slate-900 font-bold">{filteredBrands.length}</strong> / {brandList.length} thương hiệu
                </span>
                {isBrandFiltered && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-semibold text-3xs">
                    Đang lọc kết quả
                  </span>
                )}
              </div>
              <span className="text-slate-400">
                Hiển thị trang {brandPage} / {totalBrandPages} (25 thương hiệu/trang)
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-2xs">
                <tr>
                  <th className="py-3 px-4">Tên thương hiệu</th>
                  <th className="py-3 px-4">Doanh nghiệp chủ quản</th>
                  <th className="py-3 px-4">Ngành hàng</th>
                  <th className="py-3 px-4 text-center">Số gian hàng</th>
                  <th className="py-3 px-4">Đại diện phụ trách</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentBrands.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{b.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-2xs text-slate-400 font-mono">{b.code || b.id}</span>
                        {b.platforms && b.platforms.length > 0 && (
                          <div className="flex items-center gap-1">
                            {b.platforms.map(p => (
                              <span key={p} className="px-1.5 py-0.2 rounded text-3xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                {p.replace(' Mall', '').replace(' Shop', '')}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{b.companyName || b.name}</td>
                    <td className="py-3 px-4 text-slate-600">{b.category}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="font-mono font-semibold text-slate-900">
                        {b.storeCount || b.stores?.length || 0}
                      </div>
                      {(b.liveStoreCount !== undefined || b.offStoreCount !== undefined) && (
                        <div className="text-3xs text-slate-400 mt-0.5">
                          {b.liveStoreCount || 0} Live • {b.offStoreCount || 0} Off
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-2xs space-y-0.5">
                      <div className="text-slate-800 font-medium">{b.accountPic || 'Chưa phân công'}</div>
                      {b.growthPic && <div className="text-slate-500">Growth: {b.growthPic}</div>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-2xs font-semibold ${
                        b.status === 'ACTIVE' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {b.status === 'ACTIVE' ? 'Đang hợp tác' : 'Đã dừng / Hết HĐ'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBrand(b);
                          setBrandForm({
                            name: b.name,
                            companyName: b.companyName,
                            category: b.category,
                            contactPerson: b.accountPic || '',
                            status: b.status
                          });
                          setIsBrandModalOpen(true);
                        }}
                        className="text-slate-600 hover:text-slate-900 font-medium text-xs px-2 py-1 rounded hover:bg-slate-100 transition"
                      >
                        Sửa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination for Brands */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
              <div>
                Hiển thị <span className="font-semibold text-slate-900">{Math.min(filteredBrands.length, (brandPage - 1) * BRAND_PAGE_SIZE + 1)}</span> - <span className="font-semibold text-slate-900">{Math.min(filteredBrands.length, brandPage * BRAND_PAGE_SIZE)}</span> trên tổng số <span className="font-semibold text-slate-900">{filteredBrands.length}</span> thương hiệu
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  type="button"
                  disabled={brandPage <= 1}
                  onClick={() => setBrandPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 text-xs font-mono font-medium text-slate-800">
                  Trang {brandPage} / {totalBrandPages}
                </span>
                <button
                  type="button"
                  disabled={brandPage >= totalBrandPages}
                  onClick={() => setBrandPage(p => Math.min(totalBrandPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: GIAN HÀNG */}
      {activeSubTab === 'stores' && (
        <StoresMasterView
          initialStores={storeList}
          brandNames={brandList.map(b => b.name)}
          onNotify={onNotify}
        />
      )}

      {/* SUB-TAB 3: SẢN PHẨM (Master Product Catalog) */}
      {activeSubTab === 'products' && (
        <div className="space-y-4">
          {/* Enhanced Products Multi-Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm theo SKU, tên sản phẩm, thương hiệu, gian hàng..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-slate-800 bg-slate-50/50"
                />
                {productSearch && (
                  <button
                    onClick={() => setProductSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setProductForm({
                    sku: '',
                    productName: '',
                    brandName: brandList[0]?.name || 'Kutieskin',
                    storeName: '',
                    platform: 'Shopee Mall',
                    category: 'Mẹ & Bé',
                    originalPrice: 150000,
                    pdpUrl: '',
                    status: 'ACTIVE'
                  });
                  setIsProductModalOpen(true);
                }}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shrink-0 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm sản phẩm
              </button>
            </div>

            {/* Bottom Row Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div>
                <label className="text-3xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  1. Sàn / Nền tảng:
                </label>
                <select
                  value={selectedProductPlatform}
                  onChange={(e) => setSelectedProductPlatform(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-medium text-slate-800 focus:outline-none focus:border-slate-800"
                >
                  <option value="ALL">Tất cả các sàn</option>
                  <option value="TikTok Shop">TikTok Shop</option>
                  <option value="Shopee Mall">Shopee Mall</option>
                  <option value="Lazada">Lazada</option>
                </select>
              </div>

              <div>
                <label className="text-3xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  2. Thương hiệu:
                </label>
                <select
                  value={selectedProductBrand}
                  onChange={(e) => setSelectedProductBrand(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-medium text-slate-800 focus:outline-none focus:border-slate-800"
                >
                  <option value="ALL">Mọi nhãn hàng ({brandList.length})</option>
                  {brandList.slice(0, 60).map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-3xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  3. Ngành hàng:
                </label>
                <select
                  value={selectedProductCategory}
                  onChange={(e) => setSelectedProductCategory(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-medium text-slate-800 focus:outline-none focus:border-slate-800"
                >
                  <option value="ALL">Mọi ngành hàng ({productCategories.length})</option>
                  {productCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-3xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  4. Khoảng giá niêm yết:
                </label>
                <select
                  value={selectedProductPriceRange}
                  onChange={(e) => setSelectedProductPriceRange(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-medium text-slate-800 focus:outline-none focus:border-slate-800"
                >
                  <option value="ALL">Mọi mức giá</option>
                  <option value="UNDER_200K">Dưới 200.000đ</option>
                  <option value="200K_500K">200.000đ - 500.000đ</option>
                  <option value="500K_1M">500.000đ - 1.000.000đ</option>
                  <option value="OVER_1M">Trên 1.000.000đ</option>
                </select>
              </div>

              <div>
                <label className="text-3xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  5. Trạng thái kinh doanh:
                </label>
                <select
                  value={selectedProductStatus}
                  onChange={(e) => setSelectedProductStatus(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-medium text-slate-800 focus:outline-none focus:border-slate-800"
                >
                  <option value="ALL">Tất cả</option>
                  <option value="ACTIVE">Đang bán</option>
                  <option value="DISCONTINUED">Ngừng bán</option>
                </select>
              </div>

              <div className="flex items-end">
                {isProductFiltered ? (
                  <button
                    type="button"
                    onClick={handleResetProductFilters}
                    className="w-full py-1.5 px-3 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Xóa bộ lọc</span>
                  </button>
                ) : (
                  <div className="text-2xs text-slate-400 px-2 py-1.5 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <span>Bộ lọc sản phẩm</span>
                  </div>
                )}
              </div>
            </div>

            {/* Filter Results Summary */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-2xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>
                  Tìm thấy <strong className="text-slate-900 font-bold">{filteredProducts.length}</strong> / {productList.length} sản phẩm Master
                </span>
                {isProductFiltered && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-semibold text-3xs">
                    Đang lọc kết quả
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-2xs">
                <tr>
                  <th className="py-3 px-4">Mã SKU & tên sản phẩm</th>
                  <th className="py-3 px-4">Thương hiệu</th>
                  <th className="py-3 px-4">Gian hàng & Sàn</th>
                  <th className="py-3 px-4">Ngành hàng</th>
                  <th className="py-3 px-4 text-right">Giá niêm yết</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-semibold text-slate-800">{p.sku}</div>
                      <div className="text-slate-900 font-medium line-clamp-1">{p.productName}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{p.brandName}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <ChannelTag channel={p.platform} />
                        <span className="text-2xs text-slate-600 truncate max-w-[140px]">{p.storeName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{p.category}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                      {formatVnd(p.originalPrice)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-2xs font-semibold ${
                        p.status === 'ACTIVE' 
                          ? 'bg-slate-100 text-slate-800' 
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {p.status === 'ACTIVE' ? 'Đang kinh doanh' : 'Tạm ngừng'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {p.pdpUrl && (
                          <a
                            href={p.pdpUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-500 hover:text-slate-800 p-1"
                            title="Xem trang sản phẩm trên sàn"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(p);
                            setProductForm({
                              sku: p.sku,
                              productName: p.productName,
                              brandName: p.brandName,
                              storeName: p.storeName,
                              platform: p.platform,
                              category: p.category,
                              originalPrice: p.originalPrice,
                              pdpUrl: p.pdpUrl,
                              status: p.status
                            });
                            setIsProductModalOpen(true);
                          }}
                          className="text-slate-600 hover:text-slate-900 font-medium text-xs px-2 py-1 rounded hover:bg-slate-100 transition"
                        >
                          Sửa
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

      {/* SUB-TAB: TRỤ CỘT NỘI DUNG (Content Pillars Master Data) */}
      {activeSubTab === 'pillars' && (
        <div className="space-y-4">
          {/* Top Filter and Action Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm theo mã, tên trụ cột, định hướng, ngành hàng..."
                  value={pillarSearch}
                  onChange={(e) => setPillarSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-slate-800 bg-slate-50/50"
                />
                {pillarSearch && (
                  <button
                    onClick={() => setPillarSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingPillar(null);
                  setPillarForm({
                    code: '',
                    name: '',
                    description: '',
                    applicableNiches: 'Mẹ & Bé, Chăm Sóc Da',
                    suggestedFormats: 'Voiceover chuyên gia + B-roll, Infographic trực quan',
                    benchmarkUnitCost: 1500000,
                    targetAudience: 'Phụ huynh có con nhỏ, người có vấn đề da liễu',
                    keyObjectives: 'Xây dựng uy tín nhãn hàng, định vị chuyên gia & gieo niềm tin',
                    status: 'ACTIVE',
                    colorTag: '#4F46E5'
                  });
                  setIsPillarModalOpen(true);
                }}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shrink-0 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm trụ cột nội dung
              </button>
            </div>

            {/* Multi-dimensional filters for Pillars */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div>
                <label className="text-3xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  1. Ngành hàng áp dụng:
                </label>
                <select
                  value={selectedPillarNiche}
                  onChange={(e) => setSelectedPillarNiche(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-medium text-slate-800 focus:outline-none focus:border-slate-800"
                >
                  <option value="ALL">Mọi ngành hàng</option>
                  <option value="Mẹ & Bé">Mẹ & Bé</option>
                  <option value="Chăm Sóc Da">Chăm Sóc Da</option>
                  <option value="Sức Khỏe">Sức Khỏe</option>
                  <option value="Gia Dụng">Gia Dụng</option>
                  <option value="F&B">F&B</option>
                  <option value="Toàn ngành">Toàn ngành</option>
                </select>
              </div>

              <div>
                <label className="text-3xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  2. Trạng thái áp dụng:
                </label>
                <select
                  value={selectedPillarStatus}
                  onChange={(e) => setSelectedPillarStatus(e.target.value as any)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-medium text-slate-800 focus:outline-none focus:border-slate-800"
                >
                  <option value="ALL">Mọi trạng thái ({pillarList.length})</option>
                  <option value="ACTIVE">Đang áp dụng ({pillarList.filter(p => p.status === 'ACTIVE').length})</option>
                  <option value="INACTIVE">Tạm dừng ({pillarList.filter(p => p.status === 'INACTIVE').length})</option>
                </select>
              </div>

              <div>
                <label className="text-3xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  3. Định mức benchmark:
                </label>
                <select
                  value={selectedPillarCostTier}
                  onChange={(e) => setSelectedPillarCostTier(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-medium text-slate-800 focus:outline-none focus:border-slate-800"
                >
                  <option value="ALL">Mọi mức chi phí</option>
                  <option value="UNDER_1M">Dưới 1.000.000đ</option>
                  <option value="1M_2M">1.000.000đ - 2.000.000đ</option>
                  <option value="OVER_2M">Trên 2.000.000đ</option>
                </select>
              </div>

              <div className="flex items-end">
                {isPillarFiltered ? (
                  <button
                    type="button"
                    onClick={handleResetPillarFilters}
                    className="w-full py-1.5 px-3 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Xóa bộ lọc</span>
                  </button>
                ) : (
                  <div className="text-2xs text-slate-400 px-2 py-1.5 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <span>Bộ lọc Content Pillar</span>
                  </div>
                )}
              </div>
            </div>

            {/* Filter Summary */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-2xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>
                  Tìm thấy <strong className="text-slate-900 font-bold">{filteredPillars.length}</strong> / {pillarList.length} trụ cột nội dung
                </span>
                {isPillarFiltered && (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold text-3xs">
                    Đang lọc kết quả
                  </span>
                )}
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <span>
                  Định mức TB: <strong className="text-slate-800 font-semibold">{formatVnd(Math.round(pillarList.reduce((acc, p) => acc + p.benchmarkUnitCost, 0) / (pillarList.length || 1)))}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Master Content Pillar Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-2xs">
                <tr>
                  <th className="py-3 px-4 w-[240px]">Trụ cột & Mã chuẩn</th>
                  <th className="py-3 px-4 min-w-[280px]">Định hướng sáng tạo & Mục tiêu</th>
                  <th className="py-3 px-4 w-[180px]">Ngành hàng áp dụng</th>
                  <th className="py-3 px-4 min-w-[180px]">Format video gợi ý</th>
                  <th className="py-3 px-4 text-right w-[140px]">Định mức tham chiếu</th>
                  <th className="py-3 px-4 text-center w-[110px]">Trạng thái</th>
                  <th className="py-3 px-4 text-right w-[130px]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPillars.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Không tìm thấy trụ cột nội dung phù hợp với điều kiện lọc
                    </td>
                  </tr>
                ) : (
                  filteredPillars.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Mã & Tên Pillar */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span 
                              className="w-2 h-2 rounded-full shrink-0" 
                              style={{ backgroundColor: p.colorTag || '#4F46E5' }} 
                            />
                            <span className="font-semibold text-slate-900 text-xs">
                              {p.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-2xs font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {p.code}
                            </span>
                            {p.tagPillar && (
                              <span className="text-2xs font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                Tag: {p.tagPillar}
                              </span>
                            )}
                          </div>
                          {p.targetAudience && (
                            <p className="text-2xs text-slate-500 line-clamp-1">
                              Tệp: {p.targetAudience}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Định hướng sáng tạo & Mục tiêu */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1.5 max-w-lg">
                          <p className="text-slate-700 text-xs leading-relaxed">
                            {p.description}
                          </p>
                          {p.keyObjectives && (
                            <div className="flex items-start gap-1 text-2xs text-slate-500 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                              <span className="font-medium text-slate-700 shrink-0">Mục tiêu:</span>
                              <span className="line-clamp-2">{p.keyObjectives}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Ngành hàng áp dụng */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex flex-wrap gap-1">
                          {p.applicableNiches.map((n, idx) => (
                            <span 
                              key={idx}
                              className="inline-block px-1.5 py-0.5 rounded text-2xs font-medium bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap"
                            >
                              {n}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Format video gợi ý */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1">
                          {p.suggestedFormats.map((fmt, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-2xs text-slate-600">
                              <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                              <span className="line-clamp-1">{fmt}</span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Đơn giá tham chiếu */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-900 font-mono">
                            {formatVnd(p.benchmarkUnitCost)}
                          </div>
                          <div className="text-2xs text-slate-400">
                            / video CTV
                          </div>
                          {p.activeBrandsCount !== undefined && (
                            <div className="text-2xs text-slate-500">
                              {p.activeBrandsCount} brand áp dụng
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-4 align-top text-center">
                        <span 
                          className={`inline-block px-2 py-0.5 rounded text-2xs font-semibold border ${
                            p.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {p.status === 'ACTIVE' ? 'Áp dụng' : 'Tạm dừng'}
                        </span>
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPillar(p);
                              setPillarForm({
                                code: p.code,
                                name: p.name,
                                description: p.description,
                                applicableNiches: p.applicableNiches.join(', '),
                                suggestedFormats: p.suggestedFormats.join(', '),
                                benchmarkUnitCost: p.benchmarkUnitCost,
                                targetAudience: p.targetAudience,
                                keyObjectives: p.keyObjectives,
                                status: p.status,
                                colorTag: p.colorTag || '#4F46E5'
                              });
                              setIsPillarModalOpen(true);
                            }}
                            className="text-slate-600 hover:text-slate-900 font-medium text-xs px-2 py-1 rounded hover:bg-slate-100 transition"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTogglePillarStatus(p.id)}
                            className={`text-2xs font-medium px-2 py-1 rounded transition ${
                              p.status === 'ACTIVE'
                                ? 'text-slate-500 hover:text-amber-700 hover:bg-amber-50'
                                : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {p.status === 'ACTIVE' ? 'Tạm dừng' : 'Kích hoạt'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB: BẬC CAST & PHÂN NHÓM CREATOR */}
      {activeSubTab === 'cast-tiers' && (
        <CastTiersMasterView
          initialTiers={UPBASE_CAST_TIERS}
          onNotify={onNotify}
        />
      )}

      {/* SUB-TAB: TỆP KÊNH & CHUYÊN MỤC KOC */}
      {activeSubTab === 'koc-niches' && (
        <KocNichesMasterView
          initialNiches={UPBASE_KOC_NICHES}
          onNotify={onNotify}
        />
      )}

      {/* SUB-TAB: PHÂN LOẠI ĐỊNH DẠNG VIDEO */}
      {activeSubTab === 'video-formats' && (
        <VideoFormatsMasterView
          initialFormats={UPBASE_VIDEO_FORMATS}
          onNotify={onNotify}
        />
      )}

      {/* SUB-TAB: DANH BẠ KOC */}
      {activeSubTab === 'kocs' && (
        <KocMasterDataView
          kocs={kocs}
          currentUser={currentUser}
          onOpenQuickBookWithKoc={onOpenQuickBookWithKoc || (() => {})}
          onKocCreated={onKocCreated}
          onKocUpdated={onKocUpdated}
        />
      )}

      {/* SUB-TAB: NHÂN SỰ BOOKING & VẬN HÀNH */}
      {activeSubTab === 'staff' && (
        <StaffMasterView
          initialStaff={UPBASE_STAFF_MASTER}
          onNotify={onNotify}
        />
      )}

      {/* MODAL: THÊM / SỬA THƯƠNG HIỆU */}
      {isBrandModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-semibold text-sm text-slate-900">
                {editingBrand ? 'Cập nhật thương hiệu' : 'Thêm thương hiệu mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsBrandModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBrand} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Tên thương hiệu *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Kutieskin Mama & Baby"
                  value={brandForm.name}
                  onChange={(e) => setBrandForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Doanh nghiệp chủ quản</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Công ty cổ phần dược mỹ phẩm CVI"
                  value={brandForm.companyName}
                  onChange={(e) => setBrandForm(prev => ({ ...prev, companyName: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Ngành hàng</label>
                <select
                  value={brandForm.category}
                  onChange={(e) => setBrandForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  <option value="Mẹ & Bé">Mẹ & Bé</option>
                  <option value="Chăm Sóc Da">Chăm Sóc Da</option>
                  <option value="Sữa Công Thức">Sữa Công Thức</option>
                  <option value="Chăm Sóc Cá Nhân">Chăm Sóc Cá Nhân</option>
                  <option value="Gia Dụng & Đời Sống">Gia Dụng & Đời Sống</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Người đại diện phụ trách</label>
                <input
                  type="text"
                  placeholder="Họ và tên đại diện"
                  value={brandForm.contactPerson}
                  onChange={(e) => setBrandForm(prev => ({ ...prev, contactPerson: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Trạng thái hợp tác</label>
                <select
                  value={brandForm.status}
                  onChange={(e) => setBrandForm(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  <option value="ACTIVE">Đang hợp tác</option>
                  <option value="UPCOMING">Sắp triển khai</option>
                  <option value="PAUSED">Tạm dừng</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBrandModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: THÊM GIAN HÀNG */}
      {isStoreModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-semibold text-sm text-slate-900">Thêm gian hàng mới</h3>
              <button
                type="button"
                onClick={() => setIsStoreModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStore} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Tên gian hàng *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Kutieskin Official Store"
                  value={storeForm.storeName}
                  onChange={(e) => setStoreForm(prev => ({ ...prev, storeName: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Nền tảng sàn</label>
                  <select
                    value={storeForm.platform}
                    onChange={(e) => setStoreForm(prev => ({ ...prev, platform: e.target.value as any }))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                  >
                    <option value="TikTok Shop">TikTok Shop</option>
                    <option value="Shopee Mall">Shopee Mall</option>
                    <option value="Lazada">Lazada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Thuộc thương hiệu</label>
                  <select
                    value={storeForm.brandName}
                    onChange={(e) => setStoreForm(prev => ({ ...prev, brandName: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                  >
                    {brandList.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Link gian hàng (URL)</label>
                <input
                  type="url"
                  placeholder="https://shopee.vn/..."
                  value={storeForm.storeUrl}
                  onChange={(e) => setStoreForm(prev => ({ ...prev, storeUrl: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Nhân sự phụ trách (PIC)</label>
                <input
                  type="text"
                  value={storeForm.accountOwnerName}
                  onChange={(e) => setStoreForm(prev => ({ ...prev, accountOwnerName: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStoreModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: THÊM / SỬA SẢN PHẨM GỐC */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-semibold text-sm text-slate-900">
                {editingProduct ? 'Cập nhật thông tin sản phẩm' : 'Thêm sản phẩm vào dữ liệu gốc'}
              </h3>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Mã SKU *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: KUTIE-SOOTH-30G"
                    value={productForm.sku}
                    onChange={(e) => setProductForm(prev => ({ ...prev, sku: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Giá niêm yết (VNĐ) *</label>
                  <input
                    type="number"
                    required
                    value={productForm.originalPrice}
                    onChange={(e) => setProductForm(prev => ({ ...prev, originalPrice: Number(e.target.value) }))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Tên sản phẩm *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Kem bôi dịu da Kutieskin 30g"
                  value={productForm.productName}
                  onChange={(e) => setProductForm(prev => ({ ...prev, productName: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Thuộc thương hiệu</label>
                  <select
                    value={productForm.brandName}
                    onChange={(e) => setProductForm(prev => ({ ...prev, brandName: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                  >
                    {brandList.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Nền tảng sàn</label>
                  <select
                    value={productForm.platform}
                    onChange={(e) => setProductForm(prev => ({ ...prev, platform: e.target.value as any }))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                  >
                    <option value="Shopee Mall">Shopee Mall</option>
                    <option value="TikTok Shop">TikTok Shop</option>
                    <option value="Lazada">Lazada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Tên gian hàng phân phối</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Kutieskin Shopee Mall"
                  value={productForm.storeName}
                  onChange={(e) => setProductForm(prev => ({ ...prev, storeName: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Ngành hàng sản phẩm</label>
                <input
                  type="text"
                  value={productForm.category}
                  onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Link trang sản phẩm (PDP URL)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={productForm.pdpUrl}
                  onChange={(e) => setProductForm(prev => ({ ...prev, pdpUrl: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Trạng thái kinh doanh</label>
                <select
                  value={productForm.status}
                  onChange={(e) => setProductForm(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  <option value="ACTIVE">Đang kinh doanh</option>
                  <option value="DISCONTINUED">Tạm ngừng</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: THÊM / SỬA TRỤ CỘT NỘI DUNG (MASTER CONTENT PILLAR) */}
      {isPillarModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-semibold text-sm text-slate-900">
                  {editingPillar ? `Cập nhật trụ cột: ${editingPillar.name}` : 'Thêm trụ cột nội dung mới'}
                </h3>
                <p className="text-2xs text-slate-500 mt-0.5">
                  Dữ liệu gốc này sẽ được sử dụng chung cho việc lập kế hoạch kênh nội bộ và giao task video cho CTV.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPillarModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePillar} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Mã trụ cột (Code) *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: EDUCATIONAL, STORYTELLING..."
                    value={pillarForm.code}
                    onChange={(e) => setPillarForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono uppercase focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Tên trụ cột nội dung *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Giáo Dục & Lời Khuyên Chuyên Gia"
                    value={pillarForm.name}
                    onChange={(e) => setPillarForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Đơn giá định mức tham chiếu (VNĐ / video)</label>
                  <input
                    type="number"
                    min="100000"
                    step="50000"
                    value={pillarForm.benchmarkUnitCost}
                    onChange={(e) => setPillarForm(prev => ({ ...prev, benchmarkUnitCost: Number(e.target.value) }))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Màu nhận diện</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={pillarForm.colorTag}
                      onChange={(e) => setPillarForm(prev => ({ ...prev, colorTag: e.target.value }))}
                      className="w-8 h-8 rounded border border-slate-200 cursor-pointer p-0.5 bg-white shrink-0"
                    />
                    <input
                      type="text"
                      value={pillarForm.colorTag}
                      onChange={(e) => setPillarForm(prev => ({ ...prev, colorTag: e.target.value }))}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  Ngành hàng áp dụng <span className="text-slate-400 font-normal">(Phân cách bằng dấu phẩy)</span>
                </label>
                <input
                  type="text"
                  placeholder="Mẹ & Bé, Chăm Sóc Da, Sức Khỏe, Toàn ngành"
                  value={pillarForm.applicableNiches}
                  onChange={(e) => setPillarForm(prev => ({ ...prev, applicableNiches: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  Định dạng video gợi ý <span className="text-slate-400 font-normal">(Phân cách bằng dấu phẩy)</span>
                </label>
                <input
                  type="text"
                  placeholder="Voiceover chuyên gia + B-roll, Q&A giải đáp thắc mắc, Infographic"
                  value={pillarForm.suggestedFormats}
                  onChange={(e) => setPillarForm(prev => ({ ...prev, suggestedFormats: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Tệp khán giả mục tiêu</label>
                  <input
                    type="text"
                    placeholder="VD: Phụ huynh có con nhỏ, Gen Z chuộng skincare..."
                    value={pillarForm.targetAudience}
                    onChange={(e) => setPillarForm(prev => ({ ...prev, targetAudience: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Mục tiêu truyền thông cốt lõi</label>
                  <input
                    type="text"
                    placeholder="VD: Xây dựng uy tín, thúc đẩy chuyển đổi giỏ hàng..."
                    value={pillarForm.keyObjectives}
                    onChange={(e) => setPillarForm(prev => ({ ...prev, keyObjectives: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Định hướng nội dung & Tiêu chuẩn nghiệm thu *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Mô tả cụ thể góc nhìn nội dung, lưu ý kịch bản, các Do & Don'ts khi sản xuất video thuộc pillar này..."
                  value={pillarForm.description}
                  onChange={(e) => setPillarForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Trạng thái áp dụng</label>
                <select
                  value={pillarForm.status}
                  onChange={(e) => setPillarForm(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  <option value="ACTIVE">Đang áp dụng (Khả dụng cho mọi Brand)</option>
                  <option value="INACTIVE">Tạm dừng (Không gợi ý khi lập kế hoạch)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPillarModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition"
                >
                  Lưu thông tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
