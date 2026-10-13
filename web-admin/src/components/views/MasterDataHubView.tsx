'use client';

import React, { useState, useMemo } from 'react';
import { 
  Button, 
  Tabs, 
  TabItem, 
  Stat, 
  StatRow, 
  Panel, 
  Modal, 
  ConfirmDialog, 
  Pagination, 
  ChannelTag 
} from '../ui';
import { formatVndShort, formatVnd } from '../../lib/format';
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
  ChevronRight,
  Trash2,
  Archive,
  AlertTriangle,
  Building2,
  Store,
  ShoppingBag,
  AlertCircle,
  GitFork,
  BookOpen,
  ArrowRight,
  Database,
  RefreshCw,
  CloudDownload,
  Edit3,
  ShieldCheck,
  Clock,
  UserCheck,
  Users,
  Layers
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
import { MasterDataMindmapView } from './MasterDataMindmapView';
import {
  UPBASE_MASTER_SLA_CONFIG,
  UPBASE_MASTER_KPI_DEFINITIONS,
  INITIAL_BACKUP_ASSIGNMENTS,
  INITIAL_STORE_ASSIGNMENT_HISTORY,
  INITIAL_AUDIT_LOGS
} from '../../lib/enterpriseMasterConfig';

export type MasterDataSubTab = 
  | 'brands' 
  | 'stores' 
  | 'mindmap'
  | 'products' 
  | 'pillars' 
  | 'cast-tiers' 
  | 'koc-niches' 
  | 'video-formats' 
  | 'kocs' 
  | 'staff'
  | 'sla-kpi'
  | 'assignment-history'
  | 'audit-trail';

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
  commissionRate?: number;
  heroType?: 'HERO' | 'ENTRY' | 'ADDON';
  sampleAvailableCount?: number;
  usp?: string;
}

interface MasterDataHubViewProps {
  currentUser: UserProfile;
  initialSubTab?: MasterDataSubTab;
  brands?: BrandDetail[];
  stores?: StorePortfolioItem[];
  kocs?: KocItem[];
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onOpenQuickBookWithKoc?: (koc: KocItem) => void;
  onKocCreated?: (koc: KocItem) => void;
  onKocUpdated?: (koc: KocItem) => void;
  onUpdateStore?: (store: StorePortfolioItem) => void;
  onNavigateToBrandProfile?: (brandName: string) => void;
  onNavigateToStoreProfile?: (storeName: string) => void;
}

export const MasterDataHubView: React.FC<MasterDataHubViewProps> = ({
  currentUser,
  initialSubTab = 'brands',
  brands = INITIAL_BRANDS,
  stores,
  kocs = INITIAL_KOCS,
  onNotify,
  onOpenQuickBookWithKoc,
  onKocCreated,
  onKocUpdated,
  onUpdateStore,
  onNavigateToBrandProfile,
  onNavigateToStoreProfile
}) => {
  const [activeSubTab, setActiveSubTab] = useState<MasterDataSubTab>(initialSubTab);

  // Brand state (Tải 625 thương hiệu chuẩn Upbase Master Data)
  const [brandList, setBrandList] = useState<BrandDetail[]>(() => 
    brands && brands.length > 0 ? brands : INITIAL_BRANDS
  );
  const [syncedBrands, setSyncedBrands] = useState(brands);
  if (brands !== syncedBrands) {
    setSyncedBrands(brands);
    if (brands && brands.length > 0) {
      setBrandList(brands);
    }
  }
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

  // Modal 1: Tạo nhanh chỉ cần Tên Brand
  const [isQuickBrandModalOpen, setIsQuickBrandModalOpen] = useState(false);
  const [quickBrandName, setQuickBrandName] = useState('');
  const [quickBrandCode, setQuickBrandCode] = useState('');
  const [quickBrandCategory, setQuickBrandCategory] = useState('Mỹ phẩm & Làm đẹp');

  // Modal 2: Đồng bộ / Nhập hàng loạt từ Lark Base
  const [isLarkSyncModalOpen, setIsLarkSyncModalOpen] = useState(false);
  const [larkRawText, setLarkRawText] = useState('');
  const [isSyncingLark, setIsSyncingLark] = useState(false);

  // Modal 3: Chỉnh sửa thông tin cơ bản của Brand
  const [isEditBrandModalOpen, setIsEditBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandDetail | null>(null);
  const [editBrandName, setEditBrandName] = useState('');
  const [editBrandCode, setEditBrandCode] = useState('');
  const [editBrandCategory, setEditBrandCategory] = useState('Mỹ phẩm & Làm đẹp');
  const [editBrandStatus, setEditBrandStatus] = useState<'ACTIVE' | 'PAUSED' | 'UPCOMING'>('ACTIVE');

  const [deletingBrand, setDeletingBrand] = useState<BrandDetail | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Store state (Đồng bộ danh mục 353 gian hàng chuẩn Upbase Master Data)
  const [storeList, setStoreList] = useState<StorePortfolioItem[]>(() => 
    stores && stores.length > 0 ? stores : INITIAL_STORE_PORTFOLIOS
  );
  const [syncedStores, setSyncedStores] = useState(stores);
  if (stores !== syncedStores) {
    setSyncedStores(stores);
    if (stores && stores.length > 0) {
      setStoreList(stores);
    }
  }

  const handleStoreUpdated = (updated: StorePortfolioItem) => {
    setStoreList(prev => prev.map(s => s.id === updated.id ? updated : s));
    if (onUpdateStore) onUpdateStore(updated);
  };

  // Master Product Catalog state (Dữ liệu gốc sản phẩm)

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
      commissionRate: (p as any).affiliateCommissionRate || 15,
      heroType: ((p as any).heroType as any) || 'HERO',
      sampleAvailableCount: (p as any).availableStock || 50,
      usp: (p as any).keySellingPoints?.join(', ') || '',
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
    commissionRate: 15,
    heroType: 'HERO' as 'HERO' | 'ENTRY' | 'ADDON',
    sampleAvailableCount: 50,
    usp: '',
    status: 'ACTIVE' as 'ACTIVE' | 'DISCONTINUED'
  });
  const [deletingProduct, setDeletingProduct] = useState<MasterProductItem | null>(null);

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

  // Check brand relational dependencies
  const getBrandDependencies = (brandName: string) => {
    const bNameLower = brandName.trim().toLowerCase();
    const linkedStores = storeList.filter(s => s.brandName?.trim().toLowerCase() === bNameLower);
    const linkedProducts = productList.filter(p => p.brandName?.trim().toLowerCase() === bNameLower);
    return {
      stores: linkedStores,
      products: linkedProducts,
      totalCount: linkedStores.length + linkedProducts.length
    };
  };

  // 1. Tạo nhanh thương hiệu đơn giản (Chỉ cần Tên Brand)
  const handleQuickCreateBrand = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = quickBrandName.trim();
    if (!cleanName) return;

    const isDuplicate = brandList.some(b => b.name.trim().toLowerCase() === cleanName.toLowerCase());
    if (isDuplicate) {
      if (onNotify) onNotify(`Tên thương hiệu "${cleanName}" đã tồn tại trong Master Data!`, 'error');
      return;
    }

    const autoCode = quickBrandCode.trim() 
      ? quickBrandCode.trim().toUpperCase() 
      : cleanName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase() || `BR_${Date.now().toString().slice(-4)}`;

    const newBrand: BrandDetail = {
      id: `brand-${Date.now()}`,
      code: autoCode,
      name: cleanName,
      companyName: cleanName,
      category: quickBrandCategory.trim() || 'Mỹ phẩm & Làm đẹp',
      color: '#4F46E5',
      status: 'ACTIVE',
      planBudget: 0,
      monthlyBudget: 0,
      spentBudget: 0,
      targetGmv: 0,
      currentGmv: 0,
      targetVideos: 0,
      airedVideos: 0,
      accountPic: 'Chưa phân công',
      growthPic: 'Chưa phân công',
      bookingPicLead: 'Chưa phân công',
      platforms: ['Shopee Mall', 'TikTok Shop'],
      brandGuideline: '',
      kocCriteria: '',
      stores: [],
      heroProducts: [],
      profileStatus: 'NOT_CONFIGURED'
    };

    setBrandList(prev => [newBrand, ...prev]);
    setIsQuickBrandModalOpen(false);
    setQuickBrandName('');
    setQuickBrandCode('');
    if (onNotify) onNotify(`Đã tạo thương hiệu [${cleanName}] thành công! Bạn có thể vào màn hình Hồ sơ thương hiệu để thiết lập chi tiết.`, 'success');
  };

  // 2. Nhập hàng loạt tên thương hiệu từ Lark Base (Dán danh sách text)
  const handleLarkBulkImport = () => {
    if (!larkRawText.trim()) return;

    const lines = larkRawText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length === 0) return;

    let addedCount = 0;
    const newBrands: BrandDetail[] = [];

    lines.forEach((line, idx) => {
      const parts = line.split(/[,\t|]/).map(p => p.trim());
      const brandName = parts[0];
      const category = parts[1] || 'Mỹ phẩm & Làm đẹp';

      if (!brandName) return;

      const isDup = brandList.some(b => b.name.toLowerCase() === brandName.toLowerCase()) ||
                    newBrands.some(b => b.name.toLowerCase() === brandName.toLowerCase());

      if (!isDup) {
        const autoCode = brandName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase() || `LARK_${Date.now().toString().slice(-3)}_${idx}`;
        newBrands.push({
          id: `brand-lark-${Date.now()}-${idx}`,
          code: autoCode,
          name: brandName,
          companyName: brandName,
          category: category,
          color: '#0284C7',
          status: 'ACTIVE',
          planBudget: 0,
          monthlyBudget: 0,
          spentBudget: 0,
          targetGmv: 0,
          currentGmv: 0,
          targetVideos: 0,
          airedVideos: 0,
          accountPic: 'Chưa phân công',
          growthPic: 'Chưa phân công',
          bookingPicLead: 'Chưa phân công',
          platforms: ['TikTok Shop', 'Shopee Mall'],
          brandGuideline: '',
          kocCriteria: '',
          stores: [],
          heroProducts: [],
          profileStatus: 'NOT_CONFIGURED'
        });
        addedCount++;
      }
    });

    if (newBrands.length > 0) {
      setBrandList(prev => [...newBrands, ...prev]);
      setIsLarkSyncModalOpen(false);
      setLarkRawText('');
      if (onNotify) onNotify(`Đã nhập thành công ${addedCount} thương hiệu từ Lark Base!`, 'success');
    } else {
      if (onNotify) onNotify('Tất cả các thương hiệu trong danh sách đã có trên hệ thống.', 'warning');
    }
  };

  // 3. Đồng bộ trực tiếp từ Lark Base 3.5 (API Mock)
  const handleSyncFromLarkBaseApi = () => {
    setIsSyncingLark(true);
    setTimeout(() => {
      setIsSyncingLark(false);
      const larkSampleBrands = [
        'ClubClio', 'Peripera', 'Dprogram', 'Anessa', 'Bioderma', 
        'Cocoon', 'Torriden', 'Skin1004', 'Cosrx', 'Klairs', 
        'Innisfree', 'Laneige', 'Some By Mi', 'Maybelline', "L'Oreal Paris"
      ];
      let added = 0;
      const toAdd: BrandDetail[] = [];
      larkSampleBrands.forEach((name, idx) => {
        const exists = brandList.some(b => b.name.toLowerCase() === name.toLowerCase()) ||
                       toAdd.some(b => b.name.toLowerCase() === name.toLowerCase());
        if (!exists) {
          const autoCode = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
          toAdd.push({
            id: `brand-lark-api-${Date.now()}-${idx}`,
            code: autoCode,
            name: name,
            companyName: `${name} Vietnam`,
            category: 'Mỹ phẩm & Làm đẹp',
            color: '#0284C7',
            status: 'ACTIVE',
            planBudget: 0,
            monthlyBudget: 0,
            spentBudget: 0,
            targetGmv: 0,
            currentGmv: 0,
            targetVideos: 0,
            airedVideos: 0,
            accountPic: 'Chưa phân công',
            growthPic: 'Chưa phân công',
            bookingPicLead: 'Chưa phân công',
            platforms: ['TikTok Shop', 'Shopee Mall'],
            brandGuideline: '',
            kocCriteria: '',
            stores: [],
            heroProducts: [],
            profileStatus: 'NOT_CONFIGURED'
          });
          added++;
        }
      });

      if (toAdd.length > 0) {
        setBrandList(prev => [...toAdd, ...prev]);
        setIsLarkSyncModalOpen(false);
        if (onNotify) onNotify(`Đồng bộ thành công ${added} thương hiệu mới từ Lark Base!`, 'success');
      } else {
        if (onNotify) onNotify('Dữ liệu thương hiệu đã được cập nhật mới nhất từ Lark Base.', 'info');
      }
    }, 600);
  };

  // 4. Lưu chỉnh sửa thông tin cơ bản của Brand
  const handleSaveEditBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBrand) return;
    const cleanName = editBrandName.trim();
    if (!cleanName) return;

    const brandCode = (editBrandCode.trim() || cleanName.slice(0, 4)).toUpperCase();
    const oldName = editingBrand.name;
    const isNameChanged = oldName.toLowerCase() !== cleanName.toLowerCase();

    // Check duplicate
    const isDuplicate = brandList.some(b => b.id !== editingBrand.id && b.name.toLowerCase() === cleanName.toLowerCase());
    if (isDuplicate) {
      if (onNotify) onNotify(`Tên thương hiệu "${cleanName}" đã tồn tại!`, 'error');
      return;
    }

    setBrandList(prev => prev.map(b => b.id === editingBrand.id ? {
      ...b,
      name: cleanName,
      code: brandCode,
      category: editBrandCategory,
      status: editBrandStatus,
      companyName: b.companyName === oldName ? cleanName : b.companyName
    } : b));

    // Đồng bộ sang gian hàng & sản phẩm nếu đổi tên
    if (isNameChanged) {
      setStoreList(prev => prev.map(s => s.brandName === oldName ? { ...s, brandName: cleanName } : s));
      setProductList(prev => prev.map(p => p.brandName === oldName ? { ...p, brandName: cleanName } : p));
      if (onNotify) onNotify(`Đã đổi tên thương hiệu sang [${cleanName}] và đồng bộ sang các gian hàng, sản phẩm liên kết!`, 'success');
    } else {
      if (onNotify) onNotify(`Đã cập nhật thông tin thương hiệu [${cleanName}]`, 'success');
    }

    setIsEditBrandModalOpen(false);
    setEditingBrand(null);
  };

  // Handle Soft Archive Brand
  const handleArchiveBrand = (brand: BrandDetail) => {
    setBrandList(prev => prev.map(b => b.id === brand.id ? { ...b, status: 'PAUSED' } : b));
    if (onNotify) onNotify(`Đã chuyển thương hiệu [${brand.name}] sang trạng thái Tạm dừng (Lưu trữ an toàn)`, 'info');
    setDeletingBrand(null);
    setDeleteConfirmText('');
  };

  // Handle Confirm Hard Delete Brand
  const handleConfirmHardDeleteBrand = () => {
    if (!deletingBrand) return;
    const deps = getBrandDependencies(deletingBrand.name);
    if (deps.totalCount > 0 && deleteConfirmText.trim() !== deletingBrand.name.trim()) {
      if (onNotify) onNotify(`Vui lòng nhập chính xác tên thương hiệu "${deletingBrand.name}" để xác nhận xóa!`, 'error');
      return;
    }
    setBrandList(prev => prev.filter(b => b.id !== deletingBrand.id));
    if (onNotify) onNotify(`Đã xóa thương hiệu [${deletingBrand.name}] khỏi Master Data`, 'warning');
    setDeletingBrand(null);
    setDeleteConfirmText('');
  };

  // Handle Add / Edit Master Product
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSku = productForm.sku.trim().toUpperCase();
    const cleanName = productForm.productName.trim();
    if (!cleanSku || !cleanName) return;

    // Check duplicate SKU
    const isDupSku = productList.some(p => 
      (!editingProduct || p.id !== editingProduct.id) &&
      p.sku.toUpperCase() === cleanSku
    );
    if (isDupSku) {
      if (onNotify) onNotify(`Mã SKU "${cleanSku}" đã tồn tại trong danh mục sản phẩm gốc!`, 'error');
      return;
    }

    if (editingProduct) {
      setProductList(prev => prev.map(p => p.id === editingProduct.id ? {
        ...p,
        sku: cleanSku,
        productName: cleanName,
        brandName: productForm.brandName,
        storeName: productForm.storeName.trim() || `${productForm.brandName} ${productForm.platform}`,
        platform: productForm.platform,
        category: productForm.category,
        originalPrice: Number(productForm.originalPrice),
        pdpUrl: productForm.pdpUrl.trim(),
        commissionRate: Number(productForm.commissionRate) || 15,
        heroType: productForm.heroType,
        sampleAvailableCount: Number(productForm.sampleAvailableCount) || 0,
        usp: productForm.usp.trim(),
        status: productForm.status
      } : p));
      if (onNotify) onNotify(`Đã cập nhật sản phẩm [${cleanSku}] vào dữ liệu gốc`, 'success');
    } else {
      const newProd: MasterProductItem = {
        id: `mp-${Date.now()}`,
        sku: cleanSku,
        productName: cleanName,
        brandName: productForm.brandName,
        storeName: productForm.storeName.trim() || `${productForm.brandName} ${productForm.platform}`,
        platform: productForm.platform,
        category: productForm.category,
        originalPrice: Number(productForm.originalPrice),
        pdpUrl: productForm.pdpUrl.trim(),
        commissionRate: Number(productForm.commissionRate) || 15,
        heroType: productForm.heroType,
        sampleAvailableCount: Number(productForm.sampleAvailableCount) || 0,
        usp: productForm.usp.trim(),
        status: productForm.status
      };
      setProductList(prev => [newProd, ...prev]);
      if (onNotify) onNotify(`Đã thêm sản phẩm [${newProd.sku}] vào dữ liệu gốc`, 'success');
    }
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = (prod: MasterProductItem) => {
    setProductList(prev => prev.filter(p => p.id !== prod.id));
    if (onNotify) onNotify(`Đã xóa sản phẩm [${prod.sku}] khỏi danh mục gốc`, 'warning');
    setDeletingProduct(null);
  };

  const handleDiscontinueProduct = (prod: MasterProductItem) => {
    setProductList(prev => prev.map(p => p.id === prod.id ? { ...p, status: 'DISCONTINUED' } : p));
    if (onNotify) onNotify(`Đã chuyển sản phẩm [${prod.sku}] sang trạng thái Tạm ngừng`, 'info');
    setDeletingProduct(null);
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
      <Tabs
        items={[
          { key: 'brands', label: 'Thương hiệu', count: brandList.length },
          { key: 'stores', label: 'Gian hàng', count: storeList.length },
          { key: 'mindmap', label: 'Sơ đồ phân cấp' },
          { key: 'products', label: 'Sản phẩm', count: productList.length },
          { key: 'pillars', label: 'Trụ cột nội dung', count: pillarList.length },
          { key: 'cast-tiers', label: 'Bậc cast', count: UPBASE_CAST_TIERS.length },
          { key: 'koc-niches', label: 'Tệp kênh', count: UPBASE_KOC_NICHES.length },
          { key: 'video-formats', label: 'Định dạng video', count: UPBASE_VIDEO_FORMATS.length },
          { key: 'kocs', label: 'Danh bạ KOC', count: kocs.length },
          { key: 'staff', label: 'Nhân sự Booking', count: UPBASE_STAFF_MASTER.length },
          { key: 'sla-kpi', label: 'Chuẩn SLA & KPI', count: UPBASE_MASTER_SLA_CONFIG.length + UPBASE_MASTER_KPI_DEFINITIONS.length },
          { key: 'assignment-history', label: 'Lịch sử PIC', count: INITIAL_STORE_ASSIGNMENT_HISTORY.length },
          { key: 'audit-trail', label: 'Nhật ký kiểm toán', count: INITIAL_AUDIT_LOGS.length },
        ]}
        value={activeSubTab}
        onChange={setActiveSubTab}
      />

      {/* SUB-TAB: SƠ ĐỒ MINDMAP (BRAND → GIAN HÀNG → PIC → SKU) */}
      {activeSubTab === 'mindmap' && (
        <MasterDataMindmapView
          currentUser={currentUser}
          brands={brandList}
          storePortfolios={storeList}
          onNotify={(msg) => onNotify?.(msg)}
        />
      )}

      {/* SUB-TAB 1: THƯƠNG HIỆU */}
      {activeSubTab === 'brands' && (
        <div className="space-y-4">
          {/* 1. Header & Quick Stats */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-ink">Danh mục thương hiệu B2C</h2>
              <p className="text-[13px] text-ink-3">Quản lý nhãn hàng, liên kết gian hàng sàn và theo dõi định mức ngân sách</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="secondary"
                onClick={() => {
                  setLarkRawText('');
                  setIsLarkSyncModalOpen(true);
                }}
              >
                Đồng bộ Lark Base
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  if (onNavigateToBrandProfile) {
                    onNavigateToBrandProfile('ALL');
                  } else if (onNotify) {
                    onNotify('Chuyển sang Màn hình Hồ sơ thương hiệu', 'info');
                  }
                }}
              >
                Hồ sơ thương hiệu
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setQuickBrandName('');
                  setQuickBrandCode('');
                  setQuickBrandCategory(brandCategories[0] || 'Mỹ phẩm & Làm đẹp');
                  setIsQuickBrandModalOpen(true);
                }}
              >
                Thêm thương hiệu
              </Button>
            </div>
          </div>

          <StatRow>
            <Stat
              label="Tổng thương hiệu B2C"
              value={`${brandList.length} nhãn`}
              note="Chuẩn hóa 100% Master Data"
            />
            <Stat
              label="Gian hàng sàn trực thuộc"
              value={`${storeList.length} gian`}
              note={`${storeList.filter(s => s.platform.includes('TikTok')).length} TikTok Shop • ${storeList.filter(s => s.platform.includes('Shopee')).length} Shopee Mall`}
            />
            <Stat
              label="Tổng ngân sách tháng"
              value={formatVndShort(brandList.reduce((s, b) => s + (b.planBudget || b.monthlyBudget || 0), 0))}
              note="Hạn mức chi tiêu tháng 10/2026"
            />
            <Stat
              label="Hồ sơ thương hiệu"
              value={`${brandList.filter(b => b.brandGuideline && b.brandGuideline.length > 5).length} / ${brandList.length}`}
              note="Đã thiết lập guideline & tiêu chuẩn"
            />
          </StatRow>

          {/* 2. Filter & Search Toolbar */}
          <div className="bg-surface p-3.5 rounded-xl border border-line shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm thương hiệu, mã, ngành hàng, PIC..."
                  value={brandSearch}
                  onChange={(e) => {
                    setBrandSearch(e.target.value);
                    setBrandPage(1);
                  }}
                  className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg border border-line bg-surface focus:outline-none focus:ring-1 focus:ring-line-strong text-ink"
                />
                {brandSearch && (
                  <button
                    onClick={() => setBrandSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={selectedBrandCategory}
                  onChange={(e) => {
                    setSelectedBrandCategory(e.target.value);
                    setBrandPage(1);
                  }}
                  className="text-xs border border-line rounded-lg px-2.5 py-1.5 bg-surface text-ink focus:outline-none"
                >
                  <option value="ALL">Tất cả ngành hàng ({brandCategories.length})</option>
                  {brandCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                <select
                  value={selectedBrandStatus}
                  onChange={(e) => {
                    setSelectedBrandStatus(e.target.value);
                    setBrandPage(1);
                  }}
                  className="text-xs border border-line rounded-lg px-2.5 py-1.5 bg-surface text-ink focus:outline-none"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="ACTIVE">Đang hợp tác</option>
                  <option value="PAUSED">Tạm dừng</option>
                </select>

                <select
                  value={selectedBrandBudgetTier}
                  onChange={(e) => {
                    setSelectedBrandBudgetTier(e.target.value);
                    setBrandPage(1);
                  }}
                  className="text-xs border border-line rounded-lg px-2.5 py-1.5 bg-surface text-ink focus:outline-none"
                >
                  <option value="ALL">Mọi quy mô ngân sách</option>
                  <option value="TIER_TOP">Trọng điểm (&gt; 100M)</option>
                  <option value="TIER_MID">Trung bình (50M - 100M)</option>
                  <option value="TIER_LOW">Khởi tạo (&lt; 50M)</option>
                  <option value="TIER_ZERO">Chưa có ngân sách (0đ)</option>
                </select>

                {isBrandFiltered && (
                  <button
                    type="button"
                    onClick={handleResetBrandFilters}
                    className="py-1.5 px-2.5 rounded-lg border border-line bg-surface text-critical hover:bg-critical-soft text-xs font-medium transition flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Đặt lại</span>
                  </button>
                )}
              </div>
            </div>

            {/* Results Counter */}
            <div className="flex items-center justify-between pt-2 border-t border-line text-2xs text-ink-3">
              <div className="flex items-center gap-2">
                <span>
                  Đang hiển thị <strong className="text-ink font-semibold">{filteredBrands.length}</strong> / {brandList.length} thương hiệu B2C
                </span>
                {isBrandFiltered && (
                  <span className="px-2 py-0.5 rounded-full bg-accent-soft text-accent border border-line font-medium text-2xs">
                    Đang lọc kết quả
                  </span>
                )}
              </div>
              <span className="text-ink-3">
                Trang {brandPage} / {totalBrandPages} (25 thương hiệu/trang)
              </span>
            </div>
          </div>

          {/* 3. Brands Table */}
          <div className="bg-surface rounded-xl border border-line shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-canvas text-ink-3 font-medium border-b border-line text-[12.5px]">
                    <th className="py-2.5 px-4 min-w-[220px]">Thương hiệu & Mã</th>
                    <th className="py-2.5 px-3 min-w-[150px]">Ngành hàng</th>
                    <th className="py-2.5 px-3 text-center min-w-[140px]">Gian hàng trực thuộc</th>
                    <th className="py-2.5 px-3 min-w-[160px]">Chuyên viên phụ trách</th>
                    <th className="py-2.5 px-3 text-right min-w-[130px]">Ngân sách tháng</th>
                    <th className="py-2.5 px-3 min-w-[170px]">Hồ sơ thương hiệu</th>
                    <th className="py-2.5 px-3 text-center min-w-[110px]">Trạng thái</th>
                    <th className="py-2.5 px-4 text-right min-w-[90px]"><span className="sr-only">Thao tác</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {currentBrands.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-ink-3 text-xs">
                        Không tìm thấy thương hiệu nào phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    currentBrands.map((b) => {
                      const brandStores = storeList.filter(s => 
                        s.brandName?.toLowerCase() === b.name?.toLowerCase() ||
                        s.storeName?.toLowerCase().startsWith(b.name?.toLowerCase() || '')
                      );
                      const storeCount = b.stores?.length || brandStores.length || b.storeCount || 0;
                      const hasProfile = Boolean(b.brandGuideline && b.brandGuideline.length > 5);
                      const budget = b.planBudget || b.monthlyBudget || 0;
                      const initials = b.name.substring(0, 2).toUpperCase();

                      return (
                        <tr key={b.id} className="hover:bg-canvas transition-colors group">
                          {/* 1. Brand name & Code */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-8 h-8 rounded-lg text-white font-medium text-2xs flex items-center justify-center shrink-0 shadow-2xs"
                                style={{ backgroundColor: b.color || '#4f46e5' }}
                              >
                                {initials}
                              </div>
                              <div>
                                <span className="font-semibold text-ink text-xs block group-hover:text-primary transition-colors">
                                  {b.name}
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <span className="text-2xs font-mono font-medium px-1.5 py-0.5 rounded bg-sunken text-ink-2 border border-line">
                                    {b.code || b.id.replace('brand-b2c-', '').toUpperCase()}
                                  </span>
                                  {b.platforms && b.platforms.map(p => (
                                    <ChannelTag key={p} channel={p as any} />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 2. Category */}
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-2xs font-medium bg-sunken text-ink-2 border border-line">
                              {b.category || 'Mỹ phẩm & Làm đẹp'}
                            </span>
                          </td>

                          {/* 3. Stores count & details */}
                          <td className="py-3 px-3 text-center">
                            <div className="font-medium text-ink text-xs">
                              {storeCount} gian hàng
                            </div>
                            {b.platforms && b.platforms.length > 0 && (
                              <div className="text-2xs text-ink-3 mt-0.5">
                                {b.platforms.join(' • ')}
                              </div>
                            )}
                          </td>

                          {/* 4. PIC */}
                          <td className="py-3 px-3">
                            <div className="font-medium text-ink text-xs">
                              {b.brandPicName || b.bookingPicLead || 'Chưa phân công'}
                            </div>
                            <div className="text-2xs text-ink-3 mt-0.5">
                              {b.accountPic ? `AM: ${b.accountPic}` : ''}
                            </div>
                          </td>

                          {/* 5. Budget */}
                          <td className="py-3 px-3 text-right">
                            <div className="font-mono font-medium text-ink text-xs">
                              {budget > 0 ? formatVndShort(budget) : <span className="text-ink-3 font-normal">0 đ</span>}
                            </div>
                            {b.targetGmv ? (
                              <div className="text-2xs text-positive font-mono mt-0.5">
                                GMV: {formatVndShort(b.targetGmv)}
                              </div>
                            ) : null}
                          </td>

                          {/* 6. Profile Status */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-2xs font-medium ${
                                hasProfile
                                  ? 'bg-positive-soft text-positive border border-line'
                                  : 'bg-warning-soft text-warning border border-line'
                              }`}>
                                {hasProfile ? 'Đã có hồ sơ' : 'Chưa thiết lập'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (onNavigateToBrandProfile) {
                                    onNavigateToBrandProfile(b.name);
                                  } else if (onNotify) {
                                    onNotify(`Chuyển đến màn hình hồ sơ thương hiệu: ${b.name}`, 'info');
                                  }
                                }}
                                className="text-2xs font-medium text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                              >
                                <span>{hasProfile ? 'Xem' : 'Tạo'}</span>
                                <ChevronRight className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </td>

                          {/* 7. Status */}
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-medium ${
                              b.status === 'ACTIVE'
                                ? 'bg-positive-soft text-positive border border-line'
                                : 'bg-sunken text-ink-3 border border-line'
                            }`}>
                              {b.status === 'ACTIVE' ? 'Đang hợp tác' : 'Tạm dừng'}
                            </span>
                          </td>

                          {/* 8. Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingBrand(b);
                                  setEditBrandName(b.name);
                                  setEditBrandCode(b.code || '');
                                  setEditBrandCategory(b.category || 'Mỹ phẩm & Làm đẹp');
                                  setEditBrandStatus(b.status || 'ACTIVE');
                                  setIsEditBrandModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-sunken transition cursor-pointer"
                                title="Chỉnh sửa thông tin cơ bản"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeletingBrand(b);
                                  setDeleteConfirmText('');
                                }}
                                className="p-1.5 rounded-lg text-ink-3 hover:text-critical hover:bg-critical-soft transition cursor-pointer"
                                title="Xóa thương hiệu"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              page={brandPage}
              pageSize={BRAND_PAGE_SIZE}
              total={filteredBrands.length}
              onPageChange={setBrandPage}
            />
          </div>
        </div>
      )}


      {/* SUB-TAB 2: GIAN HÀNG */}
      {activeSubTab === 'stores' && (
        <StoresMasterView
          initialStores={storeList}
          brandNames={brandList.map(b => b.name)}
          brands={brandList}
          onNotify={onNotify}
          onUpdateStore={handleStoreUpdated}
          onNavigateToBrandProfile={onNavigateToBrandProfile}
          onNavigateToStoreManagement={onNavigateToStoreProfile}
        />
      )}

      {/* SUB-TAB 3: SẢN PHẨM (Master Product Catalog) */}
      {activeSubTab === 'products' && (
        <div className="space-y-4">
          {/* Enhanced Products Multi-Filter Bar */}
          <div className="bg-surface p-3.5 rounded-xl border border-line shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm theo SKU, tên sản phẩm, thương hiệu, gian hàng..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-line bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-line-strong"
                />
                {productSearch && (
                  <button
                    onClick={() => setProductSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <Button
                variant="primary"
                onClick={() => {
                  setEditingProduct(null);
                  setProductForm({
                    sku: '',
                    productName: '',
                    brandName: brandList[0]?.name || 'Kutieskin',
                    storeName: '',
                    platform: 'Shopee Mall',
                    category: productCategories[0] || 'Mẹ & Bé',
                    originalPrice: 150000,
                    pdpUrl: '',
                    commissionRate: 15,
                    heroType: 'HERO',
                    sampleAvailableCount: 50,
                    usp: '',
                    status: 'ACTIVE'
                  });
                  setIsProductModalOpen(true);
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm sản phẩm
              </Button>
            </div>

            {/* Bottom Row Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-line text-xs">
              <div>
                <label className="text-2xs text-ink-3 block mb-1">
                  1. Sàn / Nền tảng:
                </label>
                <select
                  value={selectedProductPlatform}
                  onChange={(e) => setSelectedProductPlatform(e.target.value)}
                  className="w-full text-xs border border-line rounded-lg px-2.5 py-1.5 bg-surface text-ink focus:outline-none"
                >
                  <option value="ALL">Tất cả các sàn</option>
                  <option value="TikTok Shop">TikTok Shop</option>
                  <option value="Shopee Mall">Shopee Mall</option>
                  <option value="Lazada">Lazada</option>
                </select>
              </div>

              <div>
                <label className="text-2xs text-ink-3 block mb-1">
                  2. Thương hiệu:
                </label>
                <select
                  value={selectedProductBrand}
                  onChange={(e) => setSelectedProductBrand(e.target.value)}
                  className="w-full text-xs border border-line rounded-lg px-2.5 py-1.5 bg-surface text-ink focus:outline-none"
                >
                  <option value="ALL">Mọi nhãn hàng ({brandList.length})</option>
                  {brandList.slice(0, 60).map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-2xs text-ink-3 block mb-1">
                  3. Ngành hàng:
                </label>
                <select
                  value={selectedProductCategory}
                  onChange={(e) => setSelectedProductCategory(e.target.value)}
                  className="w-full text-xs border border-line rounded-lg px-2.5 py-1.5 bg-surface text-ink focus:outline-none"
                >
                  <option value="ALL">Mọi ngành hàng ({productCategories.length})</option>
                  {productCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-2xs text-ink-3 block mb-1">
                  4. Khoảng giá niêm yết:
                </label>
                <select
                  value={selectedProductPriceRange}
                  onChange={(e) => setSelectedProductPriceRange(e.target.value)}
                  className="w-full text-xs border border-line rounded-lg px-2.5 py-1.5 bg-surface text-ink focus:outline-none"
                >
                  <option value="ALL">Mọi mức giá</option>
                  <option value="UNDER_200K">Dưới 200.000đ</option>
                  <option value="200K_500K">200.000đ - 500.000đ</option>
                  <option value="500K_1M">500.000đ - 1.000.000đ</option>
                  <option value="OVER_1M">Trên 1.000.000đ</option>
                </select>
              </div>

              <div>
                <label className="text-2xs text-ink-3 block mb-1">
                  5. Trạng thái kinh doanh:
                </label>
                <select
                  value={selectedProductStatus}
                  onChange={(e) => setSelectedProductStatus(e.target.value)}
                  className="w-full text-xs border border-line rounded-lg px-2.5 py-1.5 bg-surface text-ink focus:outline-none"
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
                    className="w-full py-1.5 px-3 rounded-lg border border-line bg-surface text-critical hover:bg-critical-soft text-xs font-medium transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Xóa bộ lọc</span>
                  </button>
                ) : (
                  <div className="text-2xs text-ink-3 px-2 py-1.5 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-ink-3" />
                    <span>Bộ lọc sản phẩm</span>
                  </div>
                )}
              </div>
            </div>

            {/* Filter Results Summary */}
            <div className="flex items-center justify-between pt-2 border-t border-line text-2xs text-ink-3">
              <div className="flex items-center gap-2">
                <span>
                  Tìm thấy <strong className="text-ink font-semibold">{filteredProducts.length}</strong> / {productList.length} sản phẩm Master
                </span>
                {isProductFiltered && (
                  <span className="px-2 py-0.5 rounded-full bg-accent-soft text-accent border border-line font-medium text-2xs">
                    Đang lọc kết quả
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-line shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-canvas text-ink-3 border-b border-line font-medium text-[12.5px]">
                <tr>
                  <th className="py-2.5 px-4">Mã SKU & tên sản phẩm</th>
                  <th className="py-2.5 px-4">Thương hiệu</th>
                  <th className="py-2.5 px-4">Gian hàng & Sàn</th>
                  <th className="py-2.5 px-4">Ngành hàng</th>
                  <th className="py-2.5 px-4 text-right">Giá niêm yết</th>
                  <th className="py-2.5 px-4 text-center">Trạng thái</th>
                  <th className="py-2.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredProducts.map(p => (
                  <tr key={p.id} className="hover:bg-canvas transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <span className="font-mono font-medium text-ink">{p.sku}</span>
                        {p.heroType && (
                          <span className={`px-1.5 py-0.5 rounded text-2xs font-medium ${
                            p.heroType === 'HERO' ? 'bg-warning-soft text-warning border border-line' :
                            p.heroType === 'ENTRY' ? 'bg-accent-soft text-accent border border-line' :
                            'bg-sunken text-ink-2 border border-line'
                          }`}>
                            {p.heroType}
                          </span>
                        )}
                        {p.sampleAvailableCount !== undefined && p.sampleAvailableCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-2xs font-mono text-positive bg-positive-soft border border-line">
                            Mẫu: {p.sampleAvailableCount}
                          </span>
                        )}
                      </div>
                      <div className="text-ink font-medium line-clamp-1">{p.productName}</div>
                      {p.usp && <div className="text-2xs text-ink-3 line-clamp-1 mt-0.5">USP: {p.usp}</div>}
                    </td>
                    <td className="py-3 px-4 text-ink-2 font-medium">{p.brandName}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <ChannelTag channel={p.platform} />
                        <span className="text-2xs text-ink-3 truncate max-w-[140px]">{p.storeName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-ink-2">
                      <div>{p.category}</div>
                      {p.commissionRate !== undefined && (
                        <div className="text-2xs text-ink-3 font-mono mt-0.5">
                          CMS: {p.commissionRate}%
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-ink">
                      {formatVnd(p.originalPrice)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-2xs font-medium ${
                        p.status === 'ACTIVE' 
                          ? 'bg-positive-soft text-positive border border-line' 
                          : 'bg-sunken text-ink-3 border border-line'
                      }`}>
                        {p.status === 'ACTIVE' ? 'Đang kinh doanh' : 'Tạm ngừng'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {p.pdpUrl && (
                          <a
                            href={p.pdpUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-ink-3 hover:text-ink p-1"
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
                              commissionRate: p.commissionRate || 15,
                              heroType: p.heroType || 'HERO',
                              sampleAvailableCount: p.sampleAvailableCount || 0,
                              usp: p.usp || '',
                              status: p.status
                            });
                            setIsProductModalOpen(true);
                          }}
                          className="text-ink-2 hover:text-ink font-medium text-xs px-2 py-1 rounded hover:bg-sunken transition cursor-pointer"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingProduct(p)}
                          className="text-critical hover:bg-critical-soft font-medium text-xs px-2 py-1 rounded transition flex items-center gap-1 cursor-pointer"
                          title="Xóa hoặc ngừng kinh doanh sản phẩm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa</span>
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
          <div className="bg-surface p-3.5 rounded-xl border border-line shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm theo mã, tên trụ cột, định hướng, ngành hàng..."
                  value={pillarSearch}
                  onChange={(e) => setPillarSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg border border-line bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-line-strong"
                />
                {pillarSearch && (
                  <button
                    onClick={() => setPillarSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <Button
                variant="primary"
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
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm trụ cột nội dung
              </Button>
            </div>

            {/* Multi-dimensional filters for Pillars */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-line text-xs">
              <div>
                <label className="text-2xs text-ink-3 block mb-1">
                  1. Ngành hàng áp dụng:
                </label>
                <select
                  value={selectedPillarNiche}
                  onChange={(e) => setSelectedPillarNiche(e.target.value)}
                  className="w-full text-xs border border-line rounded-lg px-2.5 py-1.5 bg-surface text-ink focus:outline-none"
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
                <label className="text-2xs text-ink-3 block mb-1">
                  2. Trạng thái áp dụng:
                </label>
                <select
                  value={selectedPillarStatus}
                  onChange={(e) => setSelectedPillarStatus(e.target.value as any)}
                  className="w-full text-xs border border-line rounded-lg px-2.5 py-1.5 bg-surface text-ink focus:outline-none"
                >
                  <option value="ALL">Mọi trạng thái ({pillarList.length})</option>
                  <option value="ACTIVE">Đang áp dụng ({pillarList.filter(p => p.status === 'ACTIVE').length})</option>
                  <option value="INACTIVE">Tạm dừng ({pillarList.filter(p => p.status === 'INACTIVE').length})</option>
                </select>
              </div>

              <div>
                <label className="text-2xs text-ink-3 block mb-1">
                  3. Định mức benchmark:
                </label>
                <select
                  value={selectedPillarCostTier}
                  onChange={(e) => setSelectedPillarCostTier(e.target.value)}
                  className="w-full text-xs border border-line rounded-lg px-2.5 py-1.5 bg-surface text-ink focus:outline-none"
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
                    className="w-full py-1.5 px-3 rounded-lg border border-line bg-surface text-critical hover:bg-critical-soft text-xs font-medium transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Xóa bộ lọc</span>
                  </button>
                ) : (
                  <div className="text-2xs text-ink-3 px-2 py-1.5 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-ink-3" />
                    <span>Bộ lọc Content Pillar</span>
                  </div>
                )}
              </div>
            </div>

            {/* Filter Summary */}
            <div className="flex items-center justify-between pt-2 border-t border-line text-2xs text-ink-3">
              <div className="flex items-center gap-2">
                <span>
                  Tìm thấy <strong className="text-ink font-semibold">{filteredPillars.length}</strong> / {pillarList.length} trụ cột nội dung
                </span>
                {isPillarFiltered && (
                  <span className="px-2 py-0.5 rounded-full bg-accent-soft text-accent border border-line font-medium text-2xs">
                    Đang lọc kết quả
                  </span>
                )}
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <span>
                  Định mức TB: <strong className="text-ink font-semibold">{formatVnd(Math.round(pillarList.reduce((acc, p) => acc + p.benchmarkUnitCost, 0) / (pillarList.length || 1)))}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Master Content Pillar Table */}
          <div className="bg-surface rounded-xl border border-line shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-canvas text-ink-3 border-b border-line font-medium text-[12.5px]">
                <tr>
                  <th className="py-2.5 px-4 w-[240px]">Trụ cột & Mã chuẩn</th>
                  <th className="py-2.5 px-4 min-w-[280px]">Định hướng sáng tạo & Mục tiêu</th>
                  <th className="py-2.5 px-4 w-[180px]">Ngành hàng áp dụng</th>
                  <th className="py-2.5 px-4 min-w-[180px]">Format video gợi ý</th>
                  <th className="py-2.5 px-4 text-right w-[140px]">Định mức tham chiếu</th>
                  <th className="py-2.5 px-4 text-center w-[110px]">Trạng thái</th>
                  <th className="py-2.5 px-4 text-right w-[130px]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredPillars.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-ink-3">
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

      {/* MODAL 1: TẠO NHANH THƯƠNG HIỆU (CHỈ CẦN TÊN BRAND) */}
      <Modal
        open={isQuickBrandModalOpen}
        onClose={() => setIsQuickBrandModalOpen(false)}
        title="Thêm nhanh thương hiệu"
        description="Tạo nhanh chỉ bằng tên nhãn hàng. Cấu hình chi tiết thực hiện tại màn hình Hồ sơ thương hiệu."
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsQuickBrandModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              form="quick-brand-form"
              variant="primary"
              icon={Plus}
            >
              Tạo thương hiệu
            </Button>
          </>
        }
      >
        <form id="quick-brand-form" onSubmit={handleQuickCreateBrand} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-ink font-semibold mb-1">
              Tên thương hiệu (Brand Name) <span className="text-critical">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ví dụ: L'Oréal, Senka, Kutieskin, Torriden..."
              value={quickBrandName}
              onChange={(e) => setQuickBrandName(e.target.value)}
              className="w-full px-3 py-2 border border-line-strong rounded-lg focus:outline-none focus:border-focus bg-surface font-medium text-ink text-sm"
            />
            <span className="text-2xs text-ink-3 mt-1 block">
              Chỉ cần nhập tên thương hiệu để khởi tạo và đưa vào danh sách vận hành.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-ink-2 font-medium mb-1">
                Ngành hàng
              </label>
              <select
                value={quickBrandCategory}
                onChange={(e) => setQuickBrandCategory(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-line-strong rounded-lg bg-surface text-ink focus:outline-none focus:border-focus"
              >
                {brandCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                {!brandCategories.includes('Mỹ phẩm & Làm đẹp') && (
                  <option value="Mỹ phẩm & Làm đẹp">Mỹ phẩm & Làm đẹp</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-ink-2 font-medium mb-1">
                Mã Brand (Tùy chọn)
              </label>
              <input
                type="text"
                placeholder="Tự sinh nếu trống"
                value={quickBrandCode}
                onChange={(e) => setQuickBrandCode(e.target.value.toUpperCase())}
                className="w-full px-2.5 py-1.5 border border-line-strong rounded-lg font-mono focus:outline-none focus:border-focus bg-surface text-ink uppercase"
              />
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-accent-soft border border-line text-2xs text-accent flex items-start gap-2">
            <BookOpen className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <span>
              Sau khi tạo, thương hiệu sẽ sẵn sàng để liên kết gian hàng. Bạn có thể mở <strong>Hồ sơ thương hiệu</strong> bất cứ khi nào cần cấu hình Brand Guidelines và trần thù lao KOC.
            </span>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: ĐỒNG BỘ / NHẬP HÀNG LOẠT TỪ LARK BASE */}
      <Modal
        open={isLarkSyncModalOpen}
        onClose={() => setIsLarkSyncModalOpen(false)}
        title="Đồng bộ danh sách Brand từ Lark Base"
        description="Nhập nhanh hàng loạt danh sách tên nhãn hàng từ bảng Lark Base 3.5 vào hệ thống"
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsLarkSyncModalOpen(false)}
            >
              Đóng
            </Button>
            <Button
              variant="primary"
              disabled={!larkRawText.trim()}
              onClick={handleLarkBulkImport}
              icon={CloudDownload}
            >
              Xác nhận nhập từ danh sách
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          {/* Lựa chọn 1: Đồng bộ API tự động */}
          <div className="p-3.5 bg-canvas rounded-lg border border-line flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-ink">Đồng bộ tự động từ Bảng 3.5 Lark Base</p>
              <p className="text-2xs text-ink-3 mt-0.5">
                Tự động kéo các thương hiệu mới nhất trong Lark Base B2C về danh sách
              </p>
            </div>
            <Button
              variant="secondary"
              disabled={isSyncingLark}
              onClick={handleSyncFromLarkBaseApi}
            >
              <RefreshCw className={`w-4 h-4 shrink-0 text-ink-3 ${isSyncingLark ? 'animate-spin' : ''}`} />
              <span>{isSyncingLark ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}</span>
            </Button>
          </div>

          <div className="flex items-center gap-2 text-ink-3 text-2xs uppercase tracking-wider font-semibold">
            <div className="h-px bg-line flex-1" />
            <span>Hoặc dán danh sách tên Brand</span>
            <div className="h-px bg-line flex-1" />
          </div>

          {/* Lựa chọn 2: Dán danh sách text nhiều dòng */}
          <div>
            <label className="block text-ink font-semibold mb-1">
              Dán danh sách tên thương hiệu (Mỗi dòng một tên):
            </label>
            <textarea
              rows={6}
              value={larkRawText}
              onChange={(e) => setLarkRawText(e.target.value)}
              placeholder={`Ví dụ:\nClubClio\nPeripera\nTorriden\nAnessa\nSkin1004\nCosrx`}
              className="w-full px-3 py-2 border border-line-strong rounded-lg focus:outline-none focus:border-focus bg-surface font-mono text-xs text-ink"
            />
            <div className="flex items-center justify-between text-2xs text-ink-3 mt-1">
              <span>Hỗ trợ định dạng: <code>Tên thương hiệu</code> hoặc <code>Tên, Ngành hàng</code></span>
              <span>{larkRawText.split('\n').filter(l => l.trim()).length} dòng</span>
            </div>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: CHỈNH SỬA THÔNG TIN CƠ BẢN CỦA BRAND */}
      <Modal
        open={isEditBrandModalOpen && !!editingBrand}
        onClose={() => {
          setIsEditBrandModalOpen(false);
          setEditingBrand(null);
        }}
        title="Sửa thông tin thương hiệu"
        description="Chỉnh sửa tên hiển thị, mã định danh và trạng thái"
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditBrandModalOpen(false);
                setEditingBrand(null);
              }}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              form="edit-brand-form"
              variant="primary"
            >
              Lưu thay đổi
            </Button>
          </>
        }
      >
        {editingBrand && (
          <form id="edit-brand-form" onSubmit={handleSaveEditBrand} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-ink font-semibold mb-1">
                Tên thương hiệu <span className="text-critical">*</span>
              </label>
              <input
                type="text"
                required
                value={editBrandName}
                onChange={(e) => setEditBrandName(e.target.value)}
                className="w-full px-3 py-2 border border-line-strong rounded-lg focus:outline-none focus:border-focus font-medium text-ink bg-surface text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-ink-2 font-medium mb-1">
                  Mã Brand
                </label>
                <input
                  type="text"
                  value={editBrandCode}
                  onChange={(e) => setEditBrandCode(e.target.value.toUpperCase())}
                  className="w-full px-2.5 py-1.5 border border-line-strong rounded-lg font-mono focus:outline-none focus:border-focus bg-surface text-ink uppercase"
                />
              </div>

              <div>
                <label className="block text-ink-2 font-medium mb-1">
                  Ngành hàng
                </label>
                <select
                  value={editBrandCategory}
                  onChange={(e) => setEditBrandCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-line-strong rounded-lg bg-surface text-ink focus:outline-none focus:border-focus"
                >
                  {brandCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-ink-2 font-medium mb-1">
                Trạng thái hợp tác
              </label>
              <select
                value={editBrandStatus}
                onChange={(e) => setEditBrandStatus(e.target.value as any)}
                className="w-full px-2.5 py-1.5 border border-line-strong rounded-lg bg-surface text-ink focus:outline-none focus:border-focus font-medium"
              >
                <option value="ACTIVE">Đang hợp tác (Active)</option>
                <option value="UPCOMING">Sắp triển khai (Upcoming)</option>
                <option value="PAUSED">Tạm dừng (Paused)</option>
              </select>
            </div>

            <div className="p-2.5 rounded-lg bg-canvas border border-line text-2xs text-ink-2 flex items-center justify-between">
              <span>Cần thiết lập Guidelines hay trần thù lao?</span>
              <button
                type="button"
                onClick={() => {
                  setIsEditBrandModalOpen(false);
                  if (onNavigateToBrandProfile) {
                    onNavigateToBrandProfile(editingBrand.name);
                  }
                }}
                className="font-semibold text-accent underline hover:text-ink cursor-pointer"
              >
                Mở Hồ sơ thương hiệu →
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL: XÓA / LƯU TRỮ THƯƠNG HIỆU (DEPENDENCY CHECK & ARCHIVE) */}
      {deletingBrand && (() => {
        const deps = getBrandDependencies(deletingBrand.name);
        const hasDeps = deps.totalCount > 0;
        const isConfirmMatch = deleteConfirmText.trim().toLowerCase() === deletingBrand.name.trim().toLowerCase();

        return (
          <Modal
            open={!!deletingBrand}
            onClose={() => {
              setDeletingBrand(null);
              setDeleteConfirmText('');
            }}
            title={hasDeps ? 'Kiểm tra ràng buộc: Thương hiệu đang có liên kết' : `Xác nhận xóa thương hiệu [${deletingBrand.name}]`}
            description={`Thương hiệu: ${deletingBrand.name} (${deletingBrand.category})`}
            size="md"
            footer={
              <>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setDeletingBrand(null);
                    setDeleteConfirmText('');
                  }}
                >
                  Hủy bỏ
                </Button>
                <Button
                  variant="danger"
                  disabled={hasDeps && !isConfirmMatch}
                  onClick={handleConfirmHardDeleteBrand}
                  icon={Trash2}
                >
                  Xác nhận xóa vĩnh viễn
                </Button>
              </>
            }
          >
            {hasDeps ? (
              <div className="space-y-3 text-xs">
                <div className="bg-warning-soft border border-line p-3 rounded-lg text-ink space-y-2">
                  <p className="font-semibold text-xs flex items-center gap-1.5 text-warning">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Phát hiện {deps.totalCount} đối tượng đang liên kết trực tiếp:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-2xs">
                    <div className="bg-surface p-2 rounded-md border border-line">
                      <div className="font-semibold text-ink">{deps.stores.length} gian hàng:</div>
                      <ul className="list-disc list-inside text-ink-2 truncate mt-0.5">
                        {deps.stores.slice(0, 3).map(s => <li key={s.id}>{s.storeName}</li>)}
                        {deps.stores.length > 3 && <li>...và {deps.stores.length - 3} gian hàng khác</li>}
                      </ul>
                    </div>
                    <div className="bg-surface p-2 rounded-md border border-line">
                      <div className="font-semibold text-ink">{deps.products.length} sản phẩm:</div>
                      <ul className="list-disc list-inside text-ink-2 truncate mt-0.5">
                        {deps.products.slice(0, 3).map(p => <li key={p.id}>{p.sku}</li>)}
                        {deps.products.length > 3 && <li>...và {deps.products.length - 3} sản phẩm khác</li>}
                      </ul>
                    </div>
                  </div>
                  <p className="text-2xs text-warning">
                    <strong>Cảnh báo:</strong> Xóa vĩnh viễn sẽ làm mất mối quan hệ cha-con với các gian hàng và sản phẩm này trong phân bổ và báo cáo GMV.
                  </p>
                </div>

                <div className="p-3 bg-canvas border border-line rounded-lg space-y-2">
                  <div className="flex items-center gap-1.5 text-ink font-semibold text-xs">
                    <Archive className="w-4 h-4 text-ink-2" />
                    <span>Khuyến nghị: Chuyển sang Tạm dừng (Lưu trữ an toàn)</span>
                  </div>
                  <p className="text-2xs text-ink-3 leading-relaxed">
                    Giữ nguyên dữ liệu lịch sử booking và phân bổ, chỉ ẩn thương hiệu khỏi danh mục đề xuất đang hoạt động.
                  </p>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => handleArchiveBrand(deletingBrand)}
                    icon={Archive}
                  >
                    Chuyển thành Tạm dừng (Khuyên dùng)
                  </Button>
                </div>

                <div className="pt-2 border-t border-line space-y-2">
                  <label className="block text-2xs text-ink-2">
                    Nếu vẫn muốn <strong className="text-critical">xóa vĩnh viễn</strong>, hãy nhập chính xác tên: <span className="font-mono font-semibold text-ink select-all">{deletingBrand.name}</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Nhập tên thương hiệu để xác nhận..."
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full px-3 py-1.5 border border-line-strong rounded-lg text-xs font-medium focus:outline-none focus:border-critical bg-surface text-ink"
                  />
                </div>
              </div>
            ) : (
              <div className="text-xs text-ink-2 space-y-2">
                <p>
                  Thương hiệu này hiện không có gian hàng hay sản phẩm nào liên kết. Bạn có thể xóa an toàn khỏi Master Data.
                </p>
              </div>
            )}
          </Modal>
        );
      })()}

      {/* MODAL: THÊM / SỬA SẢN PHẨM GỐC */}
      <Modal
        open={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title={editingProduct ? `Cập nhật sản phẩm: [${editingProduct.sku}]` : 'Thêm sản phẩm vào Master Catalog'}
        description="Dữ liệu gốc sản phẩm dùng cho phân bổ mẫu thử KOC và gắn giỏ hàng TikTok / Shopee"
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsProductModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              form="product-catalog-form"
              variant="primary"
            >
              {editingProduct ? 'Lưu cập nhật sản phẩm' : 'Thêm sản phẩm'}
            </Button>
          </>
        }
      >
        <form id="product-catalog-form" onSubmit={handleSaveProduct} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-ink-2 font-medium mb-1">Mã SKU *</label>
              <input
                type="text"
                required
                placeholder="VD: KUTIE-SOOTH-30G"
                value={productForm.sku}
                onChange={(e) => setProductForm(prev => ({ ...prev, sku: e.target.value.toUpperCase() }))}
                className="w-full px-3 py-1.5 border border-line-strong rounded-lg font-mono focus:outline-none focus:border-focus bg-surface text-ink"
              />
            </div>
            <div>
              <label className="block text-ink-2 font-medium mb-1">Giá niêm yết (VNĐ) *</label>
              <input
                type="number"
                required
                step={10000}
                value={productForm.originalPrice}
                onChange={(e) => setProductForm(prev => ({ ...prev, originalPrice: Number(e.target.value) }))}
                className="w-full px-3 py-1.5 border border-line-strong rounded-lg font-mono focus:outline-none focus:border-focus bg-surface text-ink"
              />
              <span className="text-2xs text-ink-3 font-mono mt-0.5 block">{formatVnd(productForm.originalPrice)}</span>
            </div>
          </div>

          <div>
            <label className="block text-ink-2 font-medium mb-1">Tên sản phẩm *</label>
            <input
              type="text"
              required
              placeholder="Ví dụ: Kem bôi dịu da Kutieskin 30g cho bé"
              value={productForm.productName}
              onChange={(e) => setProductForm(prev => ({ ...prev, productName: e.target.value }))}
              className="w-full px-3 py-1.5 border border-line-strong rounded-lg focus:outline-none focus:border-focus bg-surface font-medium text-ink"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-ink-2 font-medium mb-1">Thuộc thương hiệu</label>
              <select
                value={productForm.brandName}
                onChange={(e) => setProductForm(prev => ({ ...prev, brandName: e.target.value }))}
                className="w-full px-3 py-1.5 border border-line-strong rounded-lg bg-surface focus:outline-none focus:border-focus font-medium text-ink"
              >
                {brandList.map(b => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-ink-2 font-medium mb-1">Nền tảng sàn</label>
              <select
                value={productForm.platform}
                onChange={(e) => setProductForm(prev => ({ ...prev, platform: e.target.value as any }))}
                className="w-full px-3 py-1.5 border border-line-strong rounded-lg bg-surface text-ink focus:outline-none focus:border-focus"
              >
                <option value="Shopee Mall">Shopee Mall</option>
                <option value="TikTok Shop">TikTok Shop</option>
                <option value="Lazada">Lazada</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-ink-2 font-medium mb-1">Tên gian hàng phân phối</label>
              <input
                type="text"
                placeholder="Ví dụ: Kutieskin Shopee Mall"
                value={productForm.storeName}
                onChange={(e) => setProductForm(prev => ({ ...prev, storeName: e.target.value }))}
                className="w-full px-3 py-1.5 border border-line-strong rounded-lg focus:outline-none focus:border-focus bg-surface text-ink"
              />
            </div>
            <div>
              <label className="block text-ink-2 font-medium mb-1">Ngành hàng</label>
              <input
                type="text"
                value={productForm.category}
                onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-1.5 border border-line-strong rounded-lg focus:outline-none focus:border-focus bg-surface text-ink"
              />
            </div>
          </div>

          {/* Tùy chọn B2C Marketing: Loại sản phẩm, Hoa hồng, Mẫu thử */}
          <div className="p-3 bg-canvas rounded-lg border border-line space-y-3">
            <span className="text-2xs font-semibold uppercase tracking-wider text-ink block">
              Chính sách phân phối & Booking KOC
            </span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-ink-2 font-medium mb-1">Phân loại vai trò</label>
                <select
                  value={productForm.heroType}
                  onChange={(e) => setProductForm(prev => ({ ...prev, heroType: e.target.value as any }))}
                  className="w-full px-2 py-1.5 border border-line-strong rounded-lg bg-surface text-ink focus:outline-none focus:border-focus text-xs font-semibold"
                >
                  <option value="HERO">HERO (Chủ lực)</option>
                  <option value="ENTRY">ENTRY (Sản phẩm phễu)</option>
                  <option value="ADDON">ADDON (Bán kèm)</option>
                </select>
              </div>
              <div>
                <label className="block text-ink-2 font-medium mb-1">Hoa hồng Affiliate (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={productForm.commissionRate}
                  onChange={(e) => setProductForm(prev => ({ ...prev, commissionRate: Number(e.target.value) }))}
                  className="w-full px-2 py-1.5 border border-line-strong rounded-lg font-mono focus:outline-none focus:border-focus bg-surface text-ink text-xs"
                />
              </div>
              <div>
                <label className="block text-ink-2 font-medium mb-1">Mẫu thử sẵn có</label>
                <input
                  type="number"
                  min={0}
                  value={productForm.sampleAvailableCount}
                  onChange={(e) => setProductForm(prev => ({ ...prev, sampleAvailableCount: Number(e.target.value) }))}
                  className="w-full px-2 py-1.5 border border-line-strong rounded-lg font-mono focus:outline-none focus:border-focus bg-surface text-ink text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-ink-2 font-medium mb-1">Điểm bán hàng độc nhất (USP)</label>
              <input
                type="text"
                placeholder="Chiết xuất thảo dược tự nhiên, chứng nhận an toàn cho trẻ sơ sinh..."
                value={productForm.usp}
                onChange={(e) => setProductForm(prev => ({ ...prev, usp: e.target.value }))}
                className="w-full px-3 py-1.5 border border-line-strong rounded-lg focus:outline-none focus:border-focus bg-surface text-ink"
              />
            </div>
          </div>

          <div>
            <label className="block text-ink-2 font-medium mb-1">Link trang sản phẩm (PDP URL)</label>
            <input
              type="url"
              placeholder="https://shopee.vn/... hoặc https://shop.tiktok.com/..."
              value={productForm.pdpUrl}
              onChange={(e) => setProductForm(prev => ({ ...prev, pdpUrl: e.target.value }))}
              className="w-full px-3 py-1.5 border border-line-strong rounded-lg focus:outline-none focus:border-focus bg-surface text-ink"
            />
          </div>

          <div>
            <label className="block text-ink-2 font-medium mb-1">Trạng thái kinh doanh</label>
            <select
              value={productForm.status}
              onChange={(e) => setProductForm(prev => ({ ...prev, status: e.target.value as any }))}
              className="w-full px-3 py-1.5 border border-line-strong rounded-lg bg-surface text-ink focus:outline-none focus:border-focus font-medium"
            >
              <option value="ACTIVE">Đang kinh doanh (Active)</option>
              <option value="DISCONTINUED">Tạm ngừng kinh doanh (Discontinued)</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* MODAL: XÓA SẢN PHẨM */}
      {deletingProduct && (
        <Modal
          open={!!deletingProduct}
          onClose={() => setDeletingProduct(null)}
          title="Xác nhận xử lý sản phẩm"
          description={`Mã SKU: ${deletingProduct.sku}`}
          size="sm"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setDeletingProduct(null)}
              >
                Hủy bỏ
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDeleteProduct(deletingProduct)}
                icon={Trash2}
              >
                Xóa vĩnh viễn
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-canvas rounded-lg border border-line space-y-1">
              <div className="font-semibold text-ink">{deletingProduct.productName}</div>
              <div className="text-ink-3 text-2xs flex items-center gap-2">
                <span>{deletingProduct.brandName}</span>
                <span>•</span>
                <span>{deletingProduct.platform}</span>
                <span>•</span>
                <span className="font-mono font-semibold text-ink">{formatVnd(deletingProduct.originalPrice)}</span>
              </div>
            </div>

            <div className="space-y-2 text-ink-2">
              <p>Bạn có thể lựa chọn một trong 2 phương án:</p>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => handleDiscontinueProduct(deletingProduct)}
                icon={Archive}
              >
                Chuyển sang "Tạm ngừng kinh doanh" (An toàn)
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: THÊM / SỬA TRỤ CỘT NỘI DUNG (MASTER CONTENT PILLAR) */}
      <Modal
        open={isPillarModalOpen}
        onClose={() => setIsPillarModalOpen(false)}
        title={editingPillar ? `Cập nhật trụ cột: ${editingPillar.name}` : 'Thêm trụ cột nội dung mới'}
        description="Dữ liệu gốc này sẽ được sử dụng chung cho việc lập kế hoạch kênh nội bộ và giao task video cho CTV."
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsPillarModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              form="content-pillar-form"
              variant="primary"
            >
              Lưu thông tin
            </Button>
          </>
        }
      >
        <form id="content-pillar-form" onSubmit={handleSavePillar} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-ink-2 font-medium mb-1">Mã trụ cột (Code) *</label>
              <input
                type="text"
                required
                placeholder="VD: EDUCATIONAL, STORYTELLING..."
                value={pillarForm.code}
                onChange={(e) => setPillarForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                className="w-full px-3 py-1.5 border border-line-strong rounded-lg font-mono uppercase focus:outline-none focus:border-focus bg-surface text-ink"
              />
            </div>

            <div>
              <label className="block text-ink-2 font-medium mb-1">Tên trụ cột nội dung *</label>
              <input
                type="text"
                required
                placeholder="VD: Giáo Dục & Lời Khuyên Chuyên Gia"
                value={pillarForm.name}
                onChange={(e) => setPillarForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-1.5 border border-line-strong rounded-lg focus:outline-none focus:border-focus bg-surface text-ink font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-ink-2 font-medium mb-1">Đơn giá định mức tham chiếu (VNĐ / video)</label>
              <input
                type="number"
                min="100000"
                step="50000"
                value={pillarForm.benchmarkUnitCost}
                onChange={(e) => setPillarForm(prev => ({ ...prev, benchmarkUnitCost: Number(e.target.value) }))}
                className="w-full px-3 py-1.5 border border-line-strong rounded-lg font-mono focus:outline-none focus:border-focus bg-surface text-ink"
              />
            </div>

            <div>
              <label className="block text-ink-2 font-medium mb-1">Màu nhận diện</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={pillarForm.colorTag}
                  onChange={(e) => setPillarForm(prev => ({ ...prev, colorTag: e.target.value }))}
                  className="w-8 h-8 rounded border border-line cursor-pointer p-0.5 bg-surface shrink-0"
                />
                <input
                  type="text"
                  value={pillarForm.colorTag}
                  onChange={(e) => setPillarForm(prev => ({ ...prev, colorTag: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-line-strong rounded-lg font-mono focus:outline-none focus:border-focus bg-surface text-ink"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-ink-2 font-medium mb-1">
              Ngành hàng áp dụng <span className="text-ink-3 font-normal">(Phân cách bằng dấu phẩy)</span>
            </label>
            <input
              type="text"
              placeholder="Mẹ & Bé, Chăm Sóc Da, Sức Khỏe, Toàn ngành"
              value={pillarForm.applicableNiches}
              onChange={(e) => setPillarForm(prev => ({ ...prev, applicableNiches: e.target.value }))}
              className="w-full px-3 py-1.5 border border-line-strong rounded-lg focus:outline-none focus:border-focus bg-surface text-ink"
            />
          </div>

          <div>
            <label className="block text-ink-2 font-medium mb-1">
              Định dạng video gợi ý <span className="text-ink-3 font-normal">(Phân cách bằng dấu phẩy)</span>
            </label>
            <input
              type="text"
              placeholder="Voiceover chuyên gia + B-roll, Q&A giải đáp thắc mắc, Infographic"
              value={pillarForm.suggestedFormats}
              onChange={(e) => setPillarForm(prev => ({ ...prev, suggestedFormats: e.target.value }))}
              className="w-full px-3 py-1.5 border border-line-strong rounded-lg focus:outline-none focus:border-focus bg-surface text-ink"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-ink-2 font-medium mb-1">Tệp khán giả mục tiêu</label>
              <input
                type="text"
                placeholder="VD: Phụ huynh có con nhỏ, Gen Z chuộng skincare..."
                value={pillarForm.targetAudience}
                onChange={(e) => setPillarForm(prev => ({ ...prev, targetAudience: e.target.value }))}
                className="w-full px-3 py-1.5 border border-line-strong rounded-lg focus:outline-none focus:border-focus bg-surface text-ink"
              />
            </div>

            <div>
              <label className="block text-ink-2 font-medium mb-1">Mục tiêu truyền thông cốt lõi</label>
              <input
                type="text"
                placeholder="VD: Xây dựng uy tín, thúc đẩy chuyển đổi giỏ hàng..."
                value={pillarForm.keyObjectives}
                onChange={(e) => setPillarForm(prev => ({ ...prev, keyObjectives: e.target.value }))}
                className="w-full px-3 py-1.5 border border-line-strong rounded-lg focus:outline-none focus:border-focus bg-surface text-ink"
              />
            </div>
          </div>

          <div>
            <label className="block text-ink-2 font-medium mb-1">Định hướng nội dung & Tiêu chuẩn nghiệm thu *</label>
            <textarea
              rows={3}
              required
              placeholder="Mô tả cụ thể góc nhìn nội dung, lưu ý kịch bản, các Do & Don'ts khi sản xuất video thuộc pillar này..."
              value={pillarForm.description}
              onChange={(e) => setPillarForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-1.5 border border-line-strong rounded-lg focus:outline-none focus:border-focus bg-surface text-ink"
            />
          </div>

          <div>
            <label className="block text-ink-2 font-medium mb-1">Trạng thái áp dụng</label>
            <select
              value={pillarForm.status}
              onChange={(e) => setPillarForm(prev => ({ ...prev, status: e.target.value as any }))}
              className="w-full px-3 py-1.5 border border-line-strong rounded-lg bg-surface text-ink focus:outline-none focus:border-focus"
            >
              <option value="ACTIVE">Đang áp dụng (Khả dụng cho mọi Brand)</option>
              <option value="INACTIVE">Tạm dừng (Không gợi ý khi lập kế hoạch)</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* SUB-TAB: CHUẨN SLA & KPI */}
      {activeSubTab === 'sla-kpi' && (
        <div className="space-y-6">
          {/* Section 1: SLA Milestones Config */}
          <div className="bg-surface rounded-xl border border-line overflow-hidden">
            <div className="p-4 border-b border-line bg-canvas flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-xs text-ink uppercase tracking-wide">
                  1. Bảng định nghĩa chuẩn 7 mốc thời gian cam kết dịch vụ (SLA Milestones)
                </h3>
                <p className="text-2xs text-ink-3 mt-0.5">
                  Quy định giới hạn thời gian phản hồi, xử lý kịch bản, điều phối hàng mẫu và nghiệm thu video cho toàn bộ chu trình Booking
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-accent-soft text-accent font-mono text-2xs font-semibold border border-line">
                {UPBASE_MASTER_SLA_CONFIG.length} Mốc chuẩn hóa
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas text-ink-3 border-b border-line font-semibold text-2xs">
                  <tr>
                    <th className="py-2.5 px-4 w-[110px]">Mã mốc</th>
                    <th className="py-2.5 px-4 min-w-[200px]">Tên mốc vận hành</th>
                    <th className="py-2.5 px-4 text-center w-[100px]">SLA Chuẩn</th>
                    <th className="py-2.5 px-4 text-center w-[110px]">Cảnh báo</th>
                    <th className="py-2.5 px-4 w-[130px]">Vai trò PIC</th>
                    <th className="py-2.5 px-4 w-[130px]">Leo thang đến</th>
                    <th className="py-2.5 px-4 text-center w-[100px]">Điểm phạt SLA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {UPBASE_MASTER_SLA_CONFIG.map((sla) => (
                    <tr key={sla.milestoneCode} className="hover:bg-sunken/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-ink text-2xs">
                        {sla.milestoneCode}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-ink">{sla.milestoneName}</div>
                        <div className="text-2xs text-ink-3 mt-0.5">{sla.description}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-ink">
                        {sla.standardSlaHours}h
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-warning font-semibold">
                        {sla.warningThresholdHours}h
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-sunken text-ink-2">
                          {sla.responsibleRole}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-critical-soft text-critical border border-line">
                          {sla.escalateToRole}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-critical">
                        -{sla.penaltyWeight} đ
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Master KPI Definitions */}
          <div className="bg-surface rounded-xl border border-line overflow-hidden">
            <div className="p-4 border-b border-line bg-canvas flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-xs text-ink uppercase tracking-wide">
                  2. Bảng định nghĩa định mức & trọng số KPI chuẩn theo chức danh
                </h3>
                <p className="text-2xs text-ink-3 mt-0.5">
                  Khung đánh giá hiệu suất (KPI Framework) chuẩn hóa cho các bộ phận Account, Growth, Booking và Content
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-positive-soft text-positive font-mono text-2xs font-semibold border border-line">
                {UPBASE_MASTER_KPI_DEFINITIONS.length} Chỉ số KPI
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas text-ink-3 border-b border-line font-semibold text-2xs">
                  <tr>
                    <th className="py-2.5 px-4 w-[100px]">Mã KPI</th>
                    <th className="py-2.5 px-4 w-[110px]">Chức danh</th>
                    <th className="py-2.5 px-4 min-w-[220px]">Tên chỉ số KPI</th>
                    <th className="py-2.5 px-4 text-center w-[120px]">Chỉ tiêu chuẩn</th>
                    <th className="py-2.5 px-4 text-center w-[90px]">Trọng số</th>
                    <th className="py-2.5 px-4 w-[90px]">Chu kỳ</th>
                    <th className="py-2.5 px-4 min-w-[240px]">Tiêu chí đối chuẩn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {UPBASE_MASTER_KPI_DEFINITIONS.map((kpi) => (
                    <tr key={kpi.kpiCode} className="hover:bg-sunken/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-ink text-2xs">
                        {kpi.kpiCode}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-sunken text-ink-2">
                          {kpi.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-ink">
                        {kpi.kpiName}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-positive">
                        {kpi.targetValue} {kpi.unit}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-ink">
                        {kpi.weightPct}%
                      </td>
                      <td className="py-3 px-4 text-2xs text-ink-3 font-mono">
                        {kpi.cycle}
                      </td>
                      <td className="py-3 px-4 text-2xs text-ink-2">
                        {kpi.benchmarkCriteria}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB: LỊCH SỬ PHÂN CÔNG & BACKUP PIC */}
      {activeSubTab === 'assignment-history' && (
        <div className="space-y-6">
          {/* Section 1: Store Assignment History */}
          <div className="bg-surface rounded-xl border border-line overflow-hidden">
            <div className="p-4 border-b border-line bg-canvas flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-xs text-ink uppercase tracking-wide">
                  1. Nhật ký lịch sử điều chuyển & phân công gian hàng (Store Assignment History)
                </h3>
                <p className="text-2xs text-ink-3 mt-0.5">
                  Lưu vết toàn bộ các lần thay đổi nhân sự Account, Growth, Booking và Content trên từng gian hàng vận hành
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-warning-soft text-warning font-mono text-2xs font-semibold border border-line">
                {INITIAL_STORE_ASSIGNMENT_HISTORY.length} Bản ghi
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas text-ink-3 border-b border-line font-semibold text-2xs">
                  <tr>
                    <th className="py-2.5 px-4 w-[110px]">Mã gian</th>
                    <th className="py-2.5 px-4 min-w-[200px]">Gian hàng</th>
                    <th className="py-2.5 px-4 w-[130px]">Hành động</th>
                    <th className="py-2.5 px-4 min-w-[180px]">Nhân sự đảm nhận</th>
                    <th className="py-2.5 px-4 min-w-[240px]">Lý do điều chuyển</th>
                    <th className="py-2.5 px-4 w-[140px]">Người thực hiện</th>
                    <th className="py-2.5 px-4 text-right w-[110px]">Hiệu lực</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {INITIAL_STORE_ASSIGNMENT_HISTORY.map((h) => (
                    <tr key={h.id} className="hover:bg-sunken/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-ink text-2xs">
                        {h.storeId}
                      </td>
                      <td className="py-3 px-4 font-medium text-ink">
                        {h.storeName}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-2xs font-semibold uppercase tracking-wider ${
                          h.action === 'ASSIGNED'
                            ? 'bg-positive-soft text-positive border border-line'
                            : h.action === 'REASSIGNED'
                            ? 'bg-accent-soft text-accent border border-line'
                            : 'bg-warning-soft text-warning border border-line'
                        }`}>
                          {h.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-2xs">
                        <strong className="text-ink font-semibold">{h.staffName}</strong>
                        <div className="text-2xs text-ink-3 font-mono">{h.roleType}</div>
                      </td>
                      <td className="py-3 px-4 text-2xs text-ink-2">
                        {h.reason || h.handoverNotes || '—'}
                      </td>
                      <td className="py-3 px-4 text-2xs font-medium text-ink-2">
                        {h.assignedByName}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-2xs text-ink-3">
                        {h.effectiveDate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Backup Staff Assignments */}
          <div className="bg-surface rounded-xl border border-line overflow-hidden">
            <div className="p-4 border-b border-line bg-canvas flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-xs text-ink uppercase tracking-wide">
                  2. Danh sách nhân sự dự phòng được ủy quyền (Backup Staff Assignments)
                </h3>
                <p className="text-2xs text-ink-3 mt-0.5">
                  Ủy quyền xử lý nghiệp vụ khi PIC chính vắng mặt, đảm bảo không tắc nghẽn cam kết SLA
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-accent-soft text-accent font-mono text-2xs font-semibold border border-line">
                {INITIAL_BACKUP_ASSIGNMENTS.length} Cặp ủy quyền
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas text-ink-3 border-b border-line font-semibold text-2xs">
                  <tr>
                    <th className="py-2.5 px-4 min-w-[160px]">Nhân sự chính</th>
                    <th className="py-2.5 px-4 w-[110px]">Chức danh</th>
                    <th className="py-2.5 px-4 min-w-[160px]">Nhân sự dự phòng (Backup)</th>
                    <th className="py-2.5 px-4 min-w-[240px]">Lý do & Ghi chú ủy quyền</th>
                    <th className="py-2.5 px-4 text-center w-[120px]">Trạng thái</th>
                    <th className="py-2.5 px-4 text-right w-[180px]">Thời hạn ủy quyền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {INITIAL_BACKUP_ASSIGNMENTS.map((b) => (
                    <tr key={b.id} className="hover:bg-sunken/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-ink">
                        {b.primaryStaffName}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-sunken text-ink-2">
                          {b.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-warning">
                        {b.backupStaffName}
                      </td>
                      <td className="py-3 px-4 text-2xs text-ink-2">
                        <div><strong className="text-ink">{b.reason}</strong></div>
                        {b.notes && <div className="text-ink-3 text-2xs mt-0.5">{b.notes}</div>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-2xs font-semibold uppercase tracking-wider ${
                          b.isActive
                            ? 'bg-positive-soft text-positive border border-line'
                            : 'bg-sunken text-ink-3 border border-line'
                        }`}>
                          {b.isActive ? 'Đang kích hoạt' : 'Chờ sẵn sàng'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-2xs text-ink-3">
                        {b.startDate} → {b.endDate || 'Vô thời hạn'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB: NHẬT KÝ KIỂM TOÁN AUDIT */}
      {activeSubTab === 'audit-trail' && (
        <div className="space-y-4">
          <div className="bg-surface rounded-xl border border-line overflow-hidden">
            <div className="p-4 border-b border-line bg-canvas flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-xs text-ink uppercase tracking-wide">
                  Nhật ký kiểm toán hệ thống nghiệp vụ (Audit Trail & Change Logs)
                </h3>
                <p className="text-2xs text-ink-3 mt-0.5">
                  Ghi nhận đầy đủ thông tin kiểm toán (ai làm gì, tác động lên thực thể nào, thời gian và địa chỉ IP) theo chuẩn BRD
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-sunken text-ink font-mono text-2xs font-semibold border border-line">
                {INITIAL_AUDIT_LOGS.length} Sự kiện kiểm toán
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas text-ink-3 border-b border-line font-semibold text-2xs">
                  <tr>
                    <th className="py-2.5 px-4 w-[110px]">Mã Audit</th>
                    <th className="py-2.5 px-4 w-[160px]">Thời gian</th>
                    <th className="py-2.5 px-4 w-[100px]">Hành động</th>
                    <th className="py-2.5 px-4 w-[140px]">Đối tượng</th>
                    <th className="py-2.5 px-4 min-w-[160px]">Người thực hiện</th>
                    <th className="py-2.5 px-4 min-w-[280px]">Nội dung thay đổi chi tiết</th>
                    <th className="py-2.5 px-4 text-right w-[110px]">Địa chỉ IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {INITIAL_AUDIT_LOGS.map((log) => (
                    <tr key={log.id} className="hover:bg-sunken/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-ink text-2xs">
                        {log.id}
                      </td>
                      <td className="py-3 px-4 font-mono text-2xs text-ink-3">
                        {log.timestamp}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-2xs font-semibold uppercase tracking-wider ${
                          log.action === 'CREATE'
                            ? 'bg-positive-soft text-positive border border-line'
                            : log.action === 'UPDATE' || log.action === 'APPROVE'
                            ? 'bg-accent-soft text-accent border border-line'
                            : 'bg-critical-soft text-critical border border-line'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-2xs font-mono">
                        <span className="text-ink-3">{log.entityType}:</span>{' '}
                        <strong className="text-ink">{log.entityId}</strong>
                      </td>
                      <td className="py-3 px-4 text-2xs">
                        <div className="font-semibold text-ink">{log.actorName}</div>
                        <div className="text-2xs text-ink-3">{log.actorRole}</div>
                      </td>
                      <td className="py-3 px-4 text-2xs text-ink-2">
                        {log.note || (log.changedFields ? JSON.stringify(log.changedFields) : '—')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-2xs text-ink-3">
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
