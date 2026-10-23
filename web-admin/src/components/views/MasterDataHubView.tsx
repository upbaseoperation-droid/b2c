'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  ActionMenu,
  Button, 
  Chips,
  DataTable,
  EmptyState,
  FilterBar,
  PageActions,
  Pagination, 
  Panel,
  Person,
  Select,
  Status,
  Tabs, 
  Modal, 
  ChannelTag,
  channelOf,
  useFlipList,
  BrandAvatar,
  ShopeeLogo,
  TikTokLogo
} from '../ui';
import { DEFAULT_MASTER_CATALOG, INITIAL_MASTER_PRODUCTS, type MasterCatalog } from '../../lib/masterCatalog';
import type { Column } from '../ui';
import { formatVndShort, formatVnd } from '../../lib/format';
import { 
  Search, 
  ExternalLink, 
  RotateCcw, 
  Plus, 
  X, 
  ChevronRight,
  Trash2,
  Archive,
  AlertCircle,
  RefreshCw,
  CloudDownload,
  Edit3
} from 'lucide-react';
import { UserProfile, BrandDetail, StorePortfolioItem, KocItem, MasterContentPillar, Contributor, BookingDealItem } from '../../lib/types';
import { INITIAL_BRANDS, INITIAL_STORE_PORTFOLIOS, INITIAL_KOCS, INITIAL_PUSH_PRODUCTS } from '../../lib/mockData';
import { INITIAL_CONTRIBUTORS } from '../../lib/selfChannelData';
import { 
  UPBASE_MASTER_PILLARS, 
  UPBASE_CAST_TIERS, 
  UPBASE_VIDEO_FORMATS, 
  UPBASE_KOC_NICHES, 
  UPBASE_STAFF_MASTER
} from '../../lib/importedMasterData';
import { KocMasterDataView } from './KocMasterDataView';
import { 
  CastTiersMasterView, 
  KocNichesMasterView, 
  VideoFormatsMasterView, 
  StoresMasterView, 
  StaffMasterView,
  ContributorsMasterView
} from './master-data';
import { ProductCatalogView } from './ProductCatalogView';
import {
  UPBASE_MASTER_SLA_CONFIG,
  UPBASE_MASTER_KPI_DEFINITIONS
} from '../../lib/enterpriseMasterConfig';

export type MasterDataSubTab = 
  | 'brands' 
  | 'stores' 
  | 'product-catalog'
  | 'products' 
  | 'pillars' 
  | 'cast-tiers' 
  | 'koc-niches' 
  | 'video-formats' 
  | 'kocs' 
  | 'ctvs'
  | 'staff'
  | 'sla-kpi';

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
  contributors?: Contributor[];
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onOpenQuickBookWithKoc?: (koc: KocItem) => void;
  onKocCreated?: (koc: KocItem) => void;
  onKocUpdated?: (koc: KocItem) => void;
  onContributorCreated?: (ctv: Contributor) => void;
  onContributorUpdated?: (ctv: Contributor) => void;
  onContributorDeleted?: (ctvId: string) => void;
  onUpdateStore?: (store: StorePortfolioItem) => void;
  onNavigateToBrandProfile?: (brandName: string) => void;
  onNavigateToStoreProfile?: (storeName: string) => void;
  onNavigateToCtvProfile?: (ctvId?: string) => void;
  deals?: BookingDealItem[];
  onNavigateToKocPortal?: (kocId: string | null) => void;
  onSelectDealForContract?: (deal: BookingDealItem) => void;
}

export const MasterDataHubView: React.FC<MasterDataHubViewProps> = ({
  currentUser,
  initialSubTab = 'brands',
  brands = INITIAL_BRANDS,
  stores,
  kocs = INITIAL_KOCS,
  deals,
  contributors = INITIAL_CONTRIBUTORS,
  onNotify,
  onOpenQuickBookWithKoc,
  onKocCreated,
  onKocUpdated,
  onContributorCreated,
  onContributorUpdated,
  onContributorDeleted,
  onUpdateStore,
  onNavigateToBrandProfile,
  onNavigateToStoreProfile,
  onNavigateToCtvProfile,
  onNavigateToKocPortal,
  onSelectDealForContract
}) => {
  const [activeSubTab, setActiveSubTab] = useState<MasterDataSubTab>(initialSubTab);

  // Brand state (Tải 625 thương hiệu chuẩn Upbase Master Data)
  const [brandList, setBrandList] = useState<BrandDetail[]>(() => 
    brands ?? []
  );

  const [brandSearch, setBrandSearch] = useState('');
  const [selectedBrandCategory, setSelectedBrandCategory] = useState('ALL');
  const [selectedBrandStatus, setSelectedBrandStatus] = useState('ALL');
  const [selectedBrandPic, setSelectedBrandPic] = useState('ALL');
  const [brandPage, setBrandPage] = useState(1);
  const BRAND_PAGE_SIZE = 25;

  // Dynamic Brand Categories
  const brandCategories = useMemo(() => {
    const set = new Set<string>();
    brandList.forEach(b => {
      if (b.category) set.add(b.category.trim());
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
    stores ?? []
  );

  const handleStoreUpdated = (updated: StorePortfolioItem) => {
    if (!canEditCatalog || catalogBusy) { onNotify?.("Bạn không có quyền sửa danh mục gốc.", "warning"); return; }
    setStoreList(prev => prev.some(s => s.id === updated.id) ? prev.map(s => s.id === updated.id ? updated : s) : [...prev, updated]);
    // Bản nháp được đẩy sang nguồn dùng chung sau khi lưu.
  };

  // Master Product Catalog state (Dữ liệu gốc sản phẩm)
  const [productList, setProductList] = useState<MasterProductItem[]>([]);
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

  // Master Content Pillars state (15 Trụ cột nội dung chuẩn Upbase Master Data 5.5)
  const [pillarList, setPillarList] = useState<MasterContentPillar[]>(UPBASE_MASTER_PILLARS);
  const [pillarSearch, setPillarSearch] = useState('');
  const [selectedPillarStatus, setSelectedPillarStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
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

  const [productPage, setProductPage] = useState(1);
  const [productPageSize, setProductPageSize] = useState(15);
  const [pillarPage, setPillarPage] = useState(1);
  const [pillarPageSize, setPillarPageSize] = useState(15);

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
      if (brandSearch.trim()) {
        const q = brandSearch.toLowerCase();
        return (
          b.name.toLowerCase().includes(q) ||
          b.companyName.toLowerCase().includes(q) ||
          (b.code && b.code.toLowerCase().includes(q)) ||
          (b.accountPic && b.accountPic.toLowerCase().includes(q)) ||
          (b.brandPicName && b.brandPicName.toLowerCase().includes(q)) ||
          (b.bookingPicLead && b.bookingPicLead.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [brandList, selectedBrandCategory, selectedBrandStatus, selectedBrandPic, brandSearch]);

  const isBrandFiltered = brandSearch.trim() !== '' || selectedBrandCategory !== 'ALL' || selectedBrandStatus !== 'ALL' || selectedBrandPic !== 'ALL';

  const handleResetBrandFilters = () => {
    setBrandSearch('');
    setSelectedBrandCategory('ALL');
    setSelectedBrandStatus('ALL');
    setSelectedBrandPic('ALL');
    setBrandPage(1);
  };

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
    setProductPage(1);
  };

  const paginatedProducts = useMemo(() => {
    const start = (productPage - 1) * productPageSize;
    return filteredProducts.slice(start, start + productPageSize);
  }, [filteredProducts, productPage, productPageSize]);

  // Filtered Content Pillars
  const filteredPillars = useMemo(() => {
    return pillarList.filter(p => {
      if (selectedPillarStatus !== 'ALL' && p.status !== selectedPillarStatus) return false;
      if (pillarSearch.trim()) {
        const q = pillarSearch.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) || 
          p.code.toLowerCase().includes(q) || 
          p.description.toLowerCase().includes(q) ||
          p.applicableNiches.some(n => n.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [pillarList, selectedPillarStatus, pillarSearch]);

  const paginatedPillars = useMemo(() => {
    const start = (pillarPage - 1) * pillarPageSize;
    return filteredPillars.slice(start, start + pillarPageSize);
  }, [filteredPillars, pillarPage, pillarPageSize]);

  const brandsBodyRef = useRef<HTMLTableSectionElement>(null);
  const productsBodyRef = useRef<HTMLTableSectionElement>(null);
  const pillarsBodyRef = useRef<HTMLTableSectionElement>(null);
  useFlipList(brandsBodyRef, currentBrands.map(b => b.id).join('|'));
  useFlipList(productsBodyRef, paginatedProducts.map(p => p.id).join('|'));
  useFlipList(pillarsBodyRef, paginatedPillars.map(p => p.id).join('|'));

  const isPillarFiltered = pillarSearch.trim() !== '' || selectedPillarStatus !== 'ALL';

  const handleResetPillarFilters = () => {
    setPillarSearch('');
    setSelectedPillarStatus('ALL');
    setPillarPage(1);
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
    if (!canEditCatalog || catalogBusy) { onNotify?.("Bạn không có quyền sửa danh mục gốc.", "warning"); return; }
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
    if (onNotify) onNotify(`Đã thêm vào bản nháp thương hiệu [${cleanName}] — chọn Lưu danh mục trước khi mở Hồ sơ thương hiệu.`, 'success');
  };

  // 2. Nhập hàng loạt tên thương hiệu từ Lark Base (Dán danh sách text)
  const handleLarkBulkImport = () => {
    if (!canEditCatalog || catalogBusy) { onNotify?.("Bạn không có quyền sửa danh mục gốc.", "warning"); return; }
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
      if (onNotify) onNotify(`Đã nhập vào bản nháp ${addedCount} thương hiệu từ Lark Base!`, 'success');
    } else {
      if (onNotify) onNotify('Tất cả các thương hiệu trong danh sách đã có trên hệ thống.', 'warning');
    }
  };

  // 3. Đồng bộ trực tiếp từ Lark Base 3.5 (API Mock)
  const handleSyncFromLarkBaseApi = () => {
    onNotify?.('Chưa kết nối API danh mục Lark. Hãy dán danh sách để nhập vào bản nháp, kiểm tra rồi lưu.', 'info');
  };

  // 4. Lưu chỉnh sửa thông tin cơ bản của Brand
  const handleSaveEditBrand = (e: React.FormEvent) => {
    if (!canEditCatalog || catalogBusy) { onNotify?.("Bạn không có quyền sửa danh mục gốc.", "warning"); return; }
    e.preventDefault();
    if (!editingBrand) return;
    const cleanName = editBrandName.trim();
    if (!cleanName) return;

    const brandCode = (editBrandCode.trim() || cleanName.slice(0, 4)).toUpperCase();
    const oldName = editingBrand.name;
    const isNameChanged = oldName.toLowerCase() !== cleanName.toLowerCase();

    if (isNameChanged && getBrandDependencies(oldName).totalCount > 0) { onNotify?.('Thương hiệu còn dữ liệu liên kết. Không thể đổi tên; hãy giữ tên hoặc tạm dừng.', 'error'); return; }
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
      if (onNotify) onNotify(`Bản nháp đổi tên thương hiệu sang [${cleanName}] và đồng bộ sang các gian hàng, sản phẩm liên kết!`, 'success');
    } else {
      if (onNotify) onNotify(`Đã sửa bản nháp: thông tin thương hiệu [${cleanName}]`, 'success');
    }

    setIsEditBrandModalOpen(false);
    setEditingBrand(null);
  };

  // Handle Soft Archive Brand
  const handleArchiveBrand = (brand: BrandDetail) => {
    if (!canEditCatalog || catalogBusy) { onNotify?.("Bạn không có quyền sửa danh mục gốc.", "warning"); return; }
    setBrandList(prev => prev.map(b => b.id === brand.id ? { ...b, status: 'PAUSED' } : b));
    if (onNotify) onNotify(`Bản nháp chuyển thương hiệu [${brand.name}] sang trạng thái Tạm dừng (Lưu trữ an toàn)`, 'info');
    setDeletingBrand(null);
    setDeleteConfirmText('');
  };

  // Handle Confirm Hard Delete Brand
  const handleConfirmHardDeleteBrand = () => {
    if (!canEditCatalog || catalogBusy) { onNotify?.("Bạn không có quyền sửa danh mục gốc.", "warning"); return; }
    if (!deletingBrand) return;
    const deps = getBrandDependencies(deletingBrand.name);
    if (deps.totalCount > 0) {
      if (onNotify) onNotify(`Không thể xóa ${deletingBrand.name} vì còn dữ liệu liên kết. Hãy chọn Tạm dừng.`, 'error');
      return;
    }
    setBrandList(prev => prev.filter(b => b.id !== deletingBrand.id));
    if (onNotify) onNotify(`Đã đánh dấu xóa trong bản nháp: thương hiệu [${deletingBrand.name}] khỏi Master Data`, 'warning');
    setDeletingBrand(null);
    setDeleteConfirmText('');
  };

  // Handle Add / Edit Master Product
  const handleSaveProduct = (e: React.FormEvent) => {
    if (!canEditCatalog || catalogBusy) { onNotify?.("Bạn không có quyền sửa danh mục gốc.", "warning"); return; }
    e.preventDefault();
    const cleanSku = productForm.sku.trim().toUpperCase();
    const cleanName = productForm.productName.trim();
    if (!cleanSku || !cleanName) return;
    if (![Number(productForm.originalPrice), Number(productForm.commissionRate), Number(productForm.sampleAvailableCount)].every(n => Number.isFinite(n) && n >= 0) || Number(productForm.commissionRate) > 100) { onNotify?.('Giá, tồn kho và hoa hồng phải là số không âm; hoa hồng không quá 100%.', 'error'); return; }

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
        commissionRate: Number(productForm.commissionRate ?? 15),
        heroType: productForm.heroType,
        sampleAvailableCount: Number(productForm.sampleAvailableCount) || 0,
        usp: productForm.usp.trim(),
        status: productForm.status
      } : p));
      if (onNotify) onNotify(`Đã sửa bản nháp: sản phẩm [${cleanSku}] vào dữ liệu gốc`, 'success');
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
        commissionRate: Number(productForm.commissionRate ?? 15),
        heroType: productForm.heroType,
        sampleAvailableCount: Number(productForm.sampleAvailableCount) || 0,
        usp: productForm.usp.trim(),
        status: productForm.status
      };
      setProductList(prev => [newProd, ...prev]);
      if (onNotify) onNotify(`Đã thêm vào bản nháp sản phẩm [${newProd.sku}] vào dữ liệu gốc`, 'success');
    }
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = (prod: MasterProductItem) => {
    if (!canEditCatalog || catalogBusy) { onNotify?.("Bạn không có quyền sửa danh mục gốc.", "warning"); return; }
    setProductList(prev => prev.filter(p => p.id !== prod.id));
    if (onNotify) onNotify(`Đã đánh dấu xóa trong bản nháp: sản phẩm [${prod.sku}] khỏi danh mục gốc`, 'warning');
    setDeletingProduct(null);
  };

  const handleDiscontinueProduct = (prod: MasterProductItem) => {
    if (!canEditCatalog || catalogBusy) { onNotify?.("Bạn không có quyền sửa danh mục gốc.", "warning"); return; }
    setProductList(prev => prev.map(p => p.id === prod.id ? { ...p, status: 'DISCONTINUED' } : p));
    if (onNotify) onNotify(`Đã chuyển sản phẩm [${prod.sku}] sang trạng thái Tạm ngừng`, 'info');
    setDeletingProduct(null);
  };

  // Handle Add / Edit Master Content Pillar
  const handleSavePillar = (e: React.FormEvent) => {
    if (!canEditCatalog || catalogBusy) { onNotify?.("Bạn không có quyền sửa danh mục gốc.", "warning"); return; }
    e.preventDefault();
    if (!pillarForm.code.trim() || !pillarForm.name.trim()) return;

    if (!Number.isFinite(Number(pillarForm.benchmarkUnitCost)) || Number(pillarForm.benchmarkUnitCost) < 0) { onNotify?.('Chi phí phải là số không âm.', 'error'); return; }
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
        benchmarkUnitCost: Number(pillarForm.benchmarkUnitCost ?? 1000000),
        targetAudience: pillarForm.targetAudience.trim() || 'Người dùng đa kênh',
        keyObjectives: pillarForm.keyObjectives.trim() || 'Tăng độ nhận diện thương hiệu',
        status: pillarForm.status,
        colorTag: pillarForm.colorTag || '#4F46E5'
      } : p));
      if (onNotify) onNotify(`Đã sửa bản nháp: trụ cột nội dung: ${pillarForm.name}`);
    } else {
      const newPillar: MasterContentPillar = {
        id: `MASTER-PIL-${Date.now()}`,
        code: pillarForm.code.trim().toUpperCase(),
        name: pillarForm.name.trim(),
        description: pillarForm.description.trim(),
        applicableNiches: niches.length > 0 ? niches : ['Toàn ngành'],
        suggestedFormats: formats.length > 0 ? formats : ['Video ngắn chuẩn'],
        benchmarkUnitCost: Number(pillarForm.benchmarkUnitCost ?? 1000000),
        targetAudience: pillarForm.targetAudience.trim() || 'Người dùng đa kênh',
        keyObjectives: pillarForm.keyObjectives.trim() || 'Tăng độ nhận diện thương hiệu',
        status: pillarForm.status,
        colorTag: pillarForm.colorTag || '#4F46E5',
        activeBrandsCount: 0,
        createdAt: new Date().toISOString().split('T')[0]
      };
      setPillarList(prev => [newPillar, ...prev]);
      if (onNotify) onNotify(`Đã thêm vào bản nháp trụ cột nội dung mới: ${pillarForm.name}`);
    }
    setIsPillarModalOpen(false);
    setEditingPillar(null);
  };

  const handleTogglePillarStatus = (pillarId: string) => {
    if (!canEditCatalog || catalogBusy) { onNotify?.("Bạn không có quyền sửa danh mục gốc.", "warning"); return; }
    setPillarList(prev => prev.map(p => {
      if (p.id === pillarId) {
        const nextStatus = p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        if (onNotify) onNotify(`${p.name} chuyển sang trạng thái ${nextStatus === 'ACTIVE' ? 'Áp dụng' : 'Tạm dừng'}`);
        return { ...p, status: nextStatus };
      }
      return p;
    }));
  };


  const [extraCatalog, setExtraCatalog] = useState<Pick<MasterCatalog, "castTiers" | "niches" | "formats">>({ castTiers: [], niches: [], formats: [] });
  const [catalogRevision, setCatalogRevision] = useState<number | null>(null);
  const [catalogBusy, setCatalogBusy] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [canEditCatalog, setCanEditCatalog] = useState(false);
  const [savedCatalog, setSavedCatalog] = useState('');
  const draftCatalog: MasterCatalog = { brands: brandList, stores: storeList, products: productList, pillars: pillarList, ...extraCatalog };
  const serializeCatalog = (c: MasterCatalog): string => JSON.stringify({ brands: c.brands, stores: c.stores, products: c.products, pillars: c.pillars, castTiers: c.castTiers, niches: c.niches, formats: c.formats });
  const catalogDirty = savedCatalog !== '' && serializeCatalog(draftCatalog) !== savedCatalog;
  const acceptCatalog = (body: { revision: number; data: MasterCatalog; canEdit: boolean }) => {
    const data = body.data;
    setBrandList(data.brands); setStoreList(data.stores); setProductList(data.products); setPillarList(data.pillars);
    setExtraCatalog({ castTiers: data.castTiers, niches: data.niches, formats: data.formats });
    setCatalogRevision(body.revision); setCanEditCatalog(body.canEdit); setSavedCatalog(serializeCatalog(data));
  };
  const reloadCatalog = async () => {
    const res = await fetch('/api/master-data', { cache: 'no-store' });
    const body = await res.json(); if (!res.ok) throw new Error(body.error);
    acceptCatalog(body); setCatalogError('');
  };
  useEffect(() => {
    let cancelled = false;
    setBrandList([]); setStoreList([]); setProductList([]); setExtraCatalog({ castTiers: [], niches: [], formats: [] }); setSavedCatalog(''); setCatalogError(''); setCatalogRevision(null); setCanEditCatalog(false);
    fetch('/api/master-data', { cache: 'no-store' }).then(async res => { const body = await res.json(); if (!res.ok) throw new Error(body.error); if (!cancelled) acceptCatalog(body); }).catch(e => { if (!cancelled) setCatalogError(e.message); });
    return () => { cancelled = true; };
  }, [currentUser.id]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (catalogDirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [catalogDirty]);
  const commitCatalog = async () => {
    if (!canEditCatalog || catalogBusy || catalogRevision === null) return;
    setCatalogBusy(true); setCatalogError('');
    try {
      const res = await fetch('/api/master-data', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: catalogRevision, data: draftCatalog }) });
      const body = await res.json(); if (!res.ok) throw new Error(body.error);
      acceptCatalog(body); window.dispatchEvent(new Event('upbase-master-data-updated'));
      onNotify?.('Đã lưu danh mục dùng chung trên máy chủ.', 'success');
    } catch (e) { setCatalogError((e as Error).message); }
    finally { setCatalogBusy(false); }
  };

  return (
    <div className="space-y-5">
      {(catalogDirty || catalogError) && (
        <div role="status" className="rounded-lg border border-line bg-surface p-3 text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-medium text-ink">
            {catalogDirty && <span className="w-2 h-2 rounded-full bg-amber-500" />}
            <span>{catalogDirty ? 'Có thay đổi chưa lưu' : ''}</span>
            {catalogError && <span role="alert" className="text-critical ml-2">{catalogError}</span>}
          </div>
          <div className="flex items-center gap-2">
            {canEditCatalog && catalogDirty && (
              <Button size="sm" variant="primary" onClick={commitCatalog} disabled={catalogBusy}>
                {catalogBusy ? 'Đang lưu…' : 'Lưu danh mục'}
              </Button>
            )}
            <Button size="sm" variant="ghost" disabled={catalogBusy} onClick={() => { if (catalogDirty && !window.confirm('Bỏ bản nháp và tải dữ liệu mới nhất?')) return; reloadCatalog().catch(e => setCatalogError(e.message)); }}>
              Tải lại
            </Button>
          </div>
        </div>
      )}

      {/* Sub-Tabs Navigation */}
      <Tabs
        items={[
          { key: 'brands', label: 'Thương hiệu', count: brandList.length },
          { key: 'stores', label: 'Gian hàng', count: storeList.length },
          { key: 'product-catalog', label: 'Danh mục sản phẩm' },
          { key: 'products', label: 'Sản phẩm (bảng cũ)', count: productList.length },
          { key: 'pillars', label: 'Trụ cột nội dung', count: pillarList.length },
          { key: 'cast-tiers', label: 'Bậc cast', count: extraCatalog.castTiers.length },
          { key: 'koc-niches', label: 'Tệp kênh', count: extraCatalog.niches.length },
          { key: 'video-formats', label: 'Định dạng video', count: extraCatalog.formats.length },
          { key: 'kocs', label: 'Danh bạ KOC', count: kocs.length },
          { key: 'ctvs', label: 'Danh sách VJ / CTV', count: contributors.length },
          { key: 'staff', label: 'Danh sách nhân sự', count: UPBASE_STAFF_MASTER.length },
          { key: 'sla-kpi', label: 'Chuẩn SLA & KPI', count: UPBASE_MASTER_SLA_CONFIG.length + UPBASE_MASTER_KPI_DEFINITIONS.length },
        ]}
        value={activeSubTab}
        onChange={setActiveSubTab}
      />

      {/* SUB-TAB 1: THƯƠNG HIỆU */}
      {activeSubTab === 'brands' && (() => {
        const getShopeeInfo = (b: BrandDetail) => {
          const brandStores = storeList.filter(
            (s) =>
              s.brandName?.toLowerCase() === b.name?.toLowerCase() ||
              s.storeName?.toLowerCase().startsWith(b.name?.toLowerCase() || ''),
          );
          const stores = [
            ...(b.stores || []).filter((s) => (s.platform || '').toUpperCase().includes('SHOPEE')),
            ...brandStores.filter((s) => (s.platform || '').toUpperCase().includes('SHOPEE')),
          ];
          const seen = new Set<string>();
          const storeNames: string[] = [];
          stores.forEach((s) => {
            const name = s.storeName?.trim();
            if (name && !seen.has(name.toLowerCase())) {
              seen.add(name.toLowerCase());
              storeNames.push(name);
            }
          });
          const hasShopee = storeNames.length > 0 || (b.platforms || []).some((p) => p.toUpperCase().includes('SHOPEE'));
          return {
            hasShopee,
            count: Math.max(storeNames.length, hasShopee ? 1 : 0),
            storeNames,
          };
        };

        const getTikTokInfo = (b: BrandDetail) => {
          const brandStores = storeList.filter(
            (s) =>
              s.brandName?.toLowerCase() === b.name?.toLowerCase() ||
              s.storeName?.toLowerCase().startsWith(b.name?.toLowerCase() || ''),
          );
          const stores = [
            ...(b.stores || []).filter((s) => (s.platform || '').toUpperCase().includes('TIKTOK')),
            ...brandStores.filter((s) => (s.platform || '').toUpperCase().includes('TIKTOK')),
          ];
          const seen = new Set<string>();
          const storeNames: string[] = [];
          stores.forEach((s) => {
            const name = s.storeName?.trim();
            if (name && !seen.has(name.toLowerCase())) {
              seen.add(name.toLowerCase());
              storeNames.push(name);
            }
          });
          const hasTikTok = storeNames.length > 0 || (b.platforms || []).some((p) => p.toUpperCase().includes('TIKTOK'));
          return {
            hasTikTok,
            count: Math.max(storeNames.length, hasTikTok ? 1 : 0),
            storeNames,
          };
        };

        const brandColumns: Column<BrandDetail>[] = [
          {
            key: 'brand',
            header: 'Thương hiệu',
            width: 200,
            render: (b) => {
              const initials = b.name.substring(0, 2).toUpperCase();
              return (
                <div className="flex items-center gap-2.5 min-w-0">
                  <BrandAvatar
                    id={b.id}
                    brandId={b.id}
                    name={b.name}
                    brandName={b.name}
                    code={b.code}
                    size={36}
                    rounded="md"
                    className="shrink-0 shadow-2xs"
                    fallback={
                      <div
                        className="w-9 h-9 rounded-md text-white font-semibold text-xs flex items-center justify-center shrink-0 shadow-2xs"
                        style={{ backgroundColor: b.color || '#4f46e5' }}
                      >
                        {initials}
                      </div>
                    }
                  />
                  <div className="leading-tight min-w-0">
                    <span className="font-semibold text-ink block truncate group-hover:text-primary transition-colors text-xs">
                      {b.name}
                    </span>
                  </div>
                </div>
              );
            },
          },
          {
            key: 'category',
            header: 'Ngành hàng',
            width: 140,
            render: (b) => (
              <span className="text-ink text-xs block truncate">{b.category || 'Mỹ phẩm & Làm đẹp'}</span>
            ),
          },
          {
            key: 'shopee',
            header: (
              <span className="inline-flex items-center gap-1.5 text-ink-2 font-medium justify-center">
                <ShopeeLogo className="w-3.5 h-3.5" />
                <span>Shopee</span>
              </span>
            ),
            align: 'center',
            width: 130,
            render: (b) => {
              const shopee = getShopeeInfo(b);
              if (!shopee.hasShopee) {
                return <span className="text-ink-4 text-xs font-normal select-none">—</span>;
              }
              const label = shopee.count > 1 ? `Shopee (${shopee.count})` : 'Shopee';
              return (
                <div className="flex items-center justify-center">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-medium bg-sunken text-ink border border-line shadow-2xs hover:bg-canvas transition-colors"
                    title={shopee.storeNames.join('\n') || 'Shopee'}
                  >
                    <ShopeeLogo className="w-3.5 h-3.5 shrink-0" />
                    <span>{label}</span>
                  </span>
                </div>
              );
            },
          },
          {
            key: 'tiktok',
            header: (
              <span className="inline-flex items-center gap-1.5 text-ink-2 font-medium justify-center">
                <TikTokLogo className="w-3.5 h-3.5" />
                <span>TikTok</span>
              </span>
            ),
            align: 'center',
            width: 130,
            render: (b) => {
              const tiktok = getTikTokInfo(b);
              if (!tiktok.hasTikTok) {
                return <span className="text-ink-4 text-xs font-normal select-none">—</span>;
              }
              const label = tiktok.count > 1 ? `TikTok Shop (${tiktok.count})` : 'TikTok Shop';
              return (
                <div className="flex items-center justify-center">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-medium bg-zinc-100 text-zinc-900 border border-zinc-200/90 shadow-2xs hover:bg-zinc-200/60 transition-colors"
                    title={tiktok.storeNames.join('\n') || 'TikTok Shop'}
                  >
                    <TikTokLogo className="w-3.5 h-3.5 shrink-0" />
                    <span>{label}</span>
                  </span>
                </div>
              );
            },
          },
          {
            key: 'am',
            header: 'AM',
            width: 140,
            render: (b) => (
              b.accountPic ? (
                <Person name={b.accountPic} size={20} />
              ) : (
                <span className="text-ink-4 text-xs select-none">—</span>
              )
            ),
          },
          {
            key: 'marketingPic',
            header: 'PIC Marketing',
            width: 150,
            render: (b) => {
              const picName = b.brandPicName || b.bookingPicLead;
              return picName ? (
                <Person name={picName} size={20} />
              ) : (
                <span className="text-ink-4 text-xs select-none">—</span>
              );
            },
          },
          {
            key: 'profile',
            header: 'Hồ sơ thương hiệu',
            width: 130,
            render: (b) => {
              const hasProfile = Boolean(b.brandGuideline && b.brandGuideline.length > 5);
              return (
                <span className={`text-xs font-medium ${hasProfile ? 'text-positive' : 'text-warning'}`}>
                  {hasProfile ? 'Đã có hồ sơ' : 'Chưa thiết lập'}
                </span>
              );
            },
          },
          {
            key: 'status',
            header: 'Trạng thái',
            align: 'center',
            width: 100,
            render: (b) => (
              <Status tone={b.status === 'ACTIVE' ? 'positive' : 'neutral'}>
                {b.status === 'ACTIVE' ? 'Đang hợp tác' : 'Tạm dừng'}
              </Status>
            ),
          },
          {
            key: 'actions',
            header: '',
            align: 'right',
            width: 48,
            render: (b) => (
              <ActionMenu
                items={[
                  {
                    label: 'Xem hồ sơ',
                    icon: ExternalLink,
                    onSelect: () => {
                      if (onNavigateToBrandProfile) onNavigateToBrandProfile(b.name);
                      else onNotify?.(`Chuyển đến màn hình hồ sơ thương hiệu: ${b.name}`, 'info');
                    },
                  },
                  {
                    label: 'Sửa thương hiệu',
                    icon: Edit3,
                    onSelect: () => {
                      setEditingBrand(b);
                      setEditBrandName(b.name);
                      setEditBrandCode(b.code || '');
                      setEditBrandCategory(b.category || 'Mỹ phẩm & Làm đẹp');
                      setEditBrandStatus(b.status || 'ACTIVE');
                      setIsEditBrandModalOpen(true);
                    },
                  },
                  {
                    label: 'Xóa thương hiệu',
                    icon: Trash2,
                    onSelect: () => {
                      setDeletingBrand(b);
                      setDeleteConfirmText('');
                    },
                  },
                ]}
              />
            ),
          },
        ];

        return (
          <div className="space-y-6">
            <PageActions>
              <div className="flex items-center gap-2">
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
                    if (onNavigateToBrandProfile) onNavigateToBrandProfile('ALL');
                    else onNotify?.('Chuyển sang Màn hình Hồ sơ thương hiệu', 'info');
                  }}
                >
                  Hồ sơ thương hiệu
                </Button>
                <Button
                  variant="primary"
                  icon={Plus}
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
            </PageActions>

            <Panel flush>
              <div className="p-4 border-b border-line grid gap-2.5">
                <FilterBar
                  search={{
                    value: brandSearch,
                    onChange: (v) => {
                      setBrandSearch(v);
                      setBrandPage(1);
                    },
                    placeholder: 'Tìm thương hiệu, ngành hàng, PIC...',
                  }}
                  filters={
                    <>
                      <Select
                        value={selectedBrandCategory}
                        onChange={(e) => {
                          setSelectedBrandCategory(e.target.value);
                          setBrandPage(1);
                        }}
                        aria-label="Ngành hàng"
                        className="w-auto"
                      >
                        <option value="ALL">Mọi ngành hàng ({brandCategories.length})</option>
                        {brandCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </Select>

                      <Select
                        value={selectedBrandStatus}
                        onChange={(e) => {
                          setSelectedBrandStatus(e.target.value);
                          setBrandPage(1);
                        }}
                        aria-label="Trạng thái"
                        className="w-auto"
                      >
                        <option value="ALL">Mọi trạng thái</option>
                        <option value="ACTIVE">Đang hợp tác</option>
                        <option value="PAUSED">Tạm dừng</option>
                      </Select>

                      {isBrandFiltered && (
                        <Button variant="ghost" onClick={handleResetBrandFilters}>
                          Xóa bộ lọc
                        </Button>
                      )}
                    </>
                  }
                  resultCount={isBrandFiltered ? filteredBrands.length : undefined}
                />

                <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                  <Chips
                    label="Trạng thái"
                    items={[
                      { key: 'ALL', label: 'Tất cả thương hiệu', count: brandList.length },
                      { key: 'ACTIVE', label: 'Đang hợp tác', count: brandList.filter((b) => b.status === 'ACTIVE').length },
                      { key: 'PAUSED', label: 'Tạm dừng', count: brandList.filter((b) => b.status === 'PAUSED').length },
                    ]}
                    value={selectedBrandStatus}
                    onChange={(val) => {
                      setSelectedBrandStatus(val);
                      setBrandPage(1);
                    }}
                  />
                  <Chips
                    label="Hồ sơ"
                    items={[
                      {
                        key: 'READY',
                        label: 'Đã có hồ sơ',
                        count: brandList.filter((b) => Boolean(b.brandGuideline && b.brandGuideline.length > 5)).length,
                      },
                      {
                        key: 'MISSING',
                        label: 'Chưa thiết lập',
                        count: brandList.filter((b) => !Boolean(b.brandGuideline && b.brandGuideline.length > 5)).length,
                      },
                    ]}
                    value={''}
                    onChange={() => {}}
                  />
                </div>
              </div>

              <DataTable
                columns={brandColumns}
                rows={currentBrands}
                rowKey={(b) => b.id}
                onRowClick={(b) => {
                  if (onNavigateToBrandProfile) onNavigateToBrandProfile(b.name);
                  else onNotify?.(`Mở hồ sơ thương hiệu: ${b.name}`, 'info');
                }}
                stickyLast
                empty={
                  <EmptyState
                    title={brandList.length === 0 ? 'Chưa có thương hiệu nào' : 'Không có thương hiệu khớp bộ lọc'}
                    description={
                      brandList.length === 0
                        ? 'Thêm thương hiệu đầu tiên hoặc đồng bộ từ Lark Base để quản lý danh mục B2C.'
                        : 'Bỏ bớt điều kiện lọc hoặc tìm kiếm theo từ khóa khác.'
                    }
                    action={
                      brandList.length === 0 ? (
                        <Button
                          variant="primary"
                          icon={Plus}
                          onClick={() => {
                            setQuickBrandName('');
                            setQuickBrandCode('');
                            setQuickBrandCategory(brandCategories[0] || 'Mỹ phẩm & Làm đẹp');
                            setIsQuickBrandModalOpen(true);
                          }}
                        >
                          Thêm thương hiệu
                        </Button>
                      ) : (
                        <Button onClick={handleResetBrandFilters}>Xóa bộ lọc</Button>
                      )
                    }
                  />
                }
              />

              <Pagination
                page={brandPage}
                pageSize={BRAND_PAGE_SIZE}
                total={filteredBrands.length}
                onPageChange={setBrandPage}
              />
            </Panel>
          </div>
        );
      })()}


      {/* SUB-TAB 2: GIAN HÀNG */}
      {activeSubTab === 'stores' && (
        <StoresMasterView
          initialStores={storeList}
          brandNames={brandList.map(b => b.name)}
          brands={brandList}
          onNotify={onNotify}
          onUpdateStore={handleStoreUpdated} onStoresChange={items => { if (canEditCatalog) setStoreList(items); }} canEdit={canEditCatalog}
          onNavigateToBrandProfile={onNavigateToBrandProfile}
          onNavigateToStoreManagement={onNavigateToStoreProfile}
        />
      )}

      {/* SUB-TAB: DANH MỤC SẢN PHẨM THEO BRAND (nhóm → sản phẩm → link giỏ hàng, link affiliate) */}
      {activeSubTab === 'product-catalog' && <ProductCatalogView brandNames={brandList.map(b => b.name)} legacyProducts={productList} onNotify={onNotify} />}

      {/* SUB-TAB 3: SẢN PHẨM (Master Product Catalog) */}
      {activeSubTab === 'products' && (
        <div className="space-y-4">
          <PageActions>
            <Button
              variant="primary"
              icon={Plus}
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
              Thêm sản phẩm
            </Button>
          </PageActions>

          <Panel flush>
            <div className="p-4 border-b border-line grid gap-2.5">
              <FilterBar
                search={{
                  value: productSearch,
                  onChange: (v) => {
                    setProductSearch(v);
                    setProductPage(1);
                  },
                  placeholder: 'Tìm SKU, tên sản phẩm, gian hàng...',
                }}
                filters={
                  <>
                    <Select
                      value={selectedProductPlatform}
                      onChange={(e) => {
                        setSelectedProductPlatform(e.target.value);
                        setProductPage(1);
                      }}
                      aria-label="Sàn thương mại"
                      className="w-auto"
                    >
                      <option value="ALL">Mọi sàn</option>
                      <option value="TikTok Shop">TikTok Shop</option>
                      <option value="Shopee Mall">Shopee Mall</option>
                      <option value="Lazada">Lazada</option>
                    </Select>

                    <Select
                      value={selectedProductBrand}
                      onChange={(e) => {
                        setSelectedProductBrand(e.target.value);
                        setProductPage(1);
                      }}
                      aria-label="Thương hiệu"
                      className="w-auto"
                    >
                      <option value="ALL">Mọi nhãn hàng ({brandList.length})</option>
                      {brandList.slice(0, 60).map(b => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                    </Select>

                    <Select
                      value={selectedProductCategory}
                      onChange={(e) => {
                        setSelectedProductCategory(e.target.value);
                        setProductPage(1);
                      }}
                      aria-label="Ngành hàng"
                      className="w-auto"
                    >
                      <option value="ALL">Mọi ngành hàng ({productCategories.length})</option>
                      {productCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </Select>

                    <Select
                      value={selectedProductPriceRange}
                      onChange={(e) => {
                        setSelectedProductPriceRange(e.target.value);
                        setProductPage(1);
                      }}
                      aria-label="Mức giá"
                      className="w-auto"
                    >
                      <option value="ALL">Mọi mức giá</option>
                      <option value="UNDER_200K">&lt; 200.000đ</option>
                      <option value="200K_500K">200K - 500K</option>
                      <option value="500K_1M">500K - 1M</option>
                      <option value="OVER_1M">&gt; 1.000.000đ</option>
                    </Select>

                    {isProductFiltered && (
                      <Button variant="ghost" onClick={handleResetProductFilters}>
                        Xóa bộ lọc
                      </Button>
                    )}
                  </>
                }
                resultCount={isProductFiltered ? filteredProducts.length : undefined}
              />

              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                <Chips
                  label="Trạng thái"
                  items={[
                    { key: 'ALL', label: 'Tất cả sản phẩm', count: productList.length },
                    { key: 'ACTIVE', label: 'Đang kinh doanh', count: productList.filter(p => p.status === 'ACTIVE').length },
                    { key: 'DISCONTINUED', label: 'Tạm ngừng', count: productList.filter(p => p.status !== 'ACTIVE').length },
                  ]}
                  value={selectedProductStatus}
                  onChange={(k) => {
                    setSelectedProductStatus(k);
                    setProductPage(1);
                  }}
                />
              </div>
            </div>

            <DataTable<MasterProductItem>
              columns={[
                {
                  key: 'sku',
                  header: 'Mã SKU & Sản phẩm',
                  render: (p: MasterProductItem) => (
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <span className="font-mono font-medium text-ink">{p.sku}</span>
                        {p.heroType && (
                          <span className={`text-2xs font-medium ${
                            p.heroType === 'HERO' ? 'text-warning' :
                            p.heroType === 'ENTRY' ? 'text-accent' :
                            'text-ink-2'
                          }`}>
                            · {p.heroType}
                          </span>
                        )}
                        {p.sampleAvailableCount !== undefined && p.sampleAvailableCount > 0 && (
                          <span className="text-2xs font-mono text-positive">
                            · Mẫu: {p.sampleAvailableCount}
                          </span>
                        )}
                      </div>
                      <div className="text-ink font-medium line-clamp-1">{p.productName}</div>
                      {p.usp && <div className="text-2xs text-ink-3 line-clamp-1 mt-0.5">USP: {p.usp}</div>}
                    </div>
                  )
                },
                {
                  key: 'brandName',
                  header: 'Thương hiệu',
                  render: (p: MasterProductItem) => <span className="text-ink-2 font-medium">{p.brandName}</span>
                },
                {
                  key: 'store',
                  header: 'Gian hàng & Sàn',
                  render: (p: MasterProductItem) => (
                    <div className="flex items-center gap-1.5">
                      <ChannelTag channel={p.platform} />
                      <span className="text-2xs text-ink-3 truncate max-w-[140px]">{p.storeName}</span>
                    </div>
                  )
                },
                {
                  key: 'category',
                  header: 'Ngành hàng',
                  render: (p: MasterProductItem) => (
                    <div>
                      <div>{p.category}</div>
                      {p.commissionRate !== undefined && (
                        <div className="text-2xs text-ink-3 font-mono mt-0.5">
                          CMS: {p.commissionRate}%
                        </div>
                      )}
                    </div>
                  )
                },
                {
                  key: 'originalPrice',
                  header: 'Giá niêm yết',
                  align: 'right',
                  render: (p: MasterProductItem) => (
                    <span className="font-mono font-medium text-ink">
                      {formatVnd(p.originalPrice)}
                    </span>
                  )
                },
                {
                  key: 'status',
                  header: 'Trạng thái',
                  align: 'center',
                  render: (p: MasterProductItem) => (
                    <Status tone={p.status === 'ACTIVE' ? 'positive' : 'neutral'}>
                      {p.status === 'ACTIVE' ? 'Đang bán' : 'Tạm ngừng'}
                    </Status>
                  )
                },
                {
                  key: 'actions',
                  header: 'Thao tác',
                  align: 'right',
                  render: (p: MasterProductItem) => {
                    const items = [];
                    if (p.pdpUrl) {
                      items.push({
                        label: 'Xem trên sàn',
                        icon: ExternalLink,
                        onSelect: () => window.open(p.pdpUrl, '_blank')
                      });
                    }
                    items.push({
                      label: 'Chỉnh sửa',
                      icon: Edit3,
                      onSelect: () => {
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
                      }
                    });
                    items.push({
                      label: 'Xóa sản phẩm',
                      icon: Trash2,
                      onSelect: () => setDeletingProduct(p)
                    });
                    return <ActionMenu items={items} />;
                  }
                }
              ]}
              rows={paginatedProducts}
              rowKey={(p) => p.id}
              stickyLast
              empty={
                <EmptyState
                  title="Không tìm thấy sản phẩm"
                  description="Thử đổi từ khóa hoặc bộ lọc sàn, ngành hàng, giá..."
                />
              }
            />

            {filteredProducts.length > productPageSize && (
              <Pagination
                page={productPage}
                pageSize={productPageSize}
                total={filteredProducts.length}
                onPageChange={setProductPage}
                onPageSizeChange={(sz) => {
                  setProductPageSize(sz);
                  setProductPage(1);
                }}
              />
            )}
          </Panel>
        </div>
      )}

      {/* SUB-TAB: TRỤ CỘT NỘI DUNG (Content Pillars Master Data) */}
      {activeSubTab === 'pillars' && (
        <div className="space-y-4">
          <PageActions>
            <Button
              variant="primary"
              icon={Plus}
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
              Thêm trụ cột
            </Button>
          </PageActions>

          <Panel flush>
            <div className="p-4 border-b border-line grid gap-2.5">
              <FilterBar
                search={{
                  value: pillarSearch,
                  onChange: (v) => {
                    setPillarSearch(v);
                    setPillarPage(1);
                  },
                  placeholder: 'Tìm tên, mã trụ cột hoặc định hướng nội dung...',
                }}
                filters={
                  isPillarFiltered ? (
                    <Button variant="ghost" onClick={handleResetPillarFilters}>
                      Xóa bộ lọc
                    </Button>
                  ) : undefined
                }
                resultCount={isPillarFiltered ? filteredPillars.length : undefined}
              />

              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                <Chips
                  label="Trạng thái"
                  items={[
                    { key: 'ALL', label: 'Tất cả trụ cột', count: pillarList.length },
                    { key: 'ACTIVE', label: 'Đang áp dụng', count: pillarList.filter(p => p.status === 'ACTIVE').length },
                    { key: 'INACTIVE', label: 'Tạm dừng', count: pillarList.filter(p => p.status === 'INACTIVE').length },
                  ]}
                  value={selectedPillarStatus}
                  onChange={(k) => {
                    setSelectedPillarStatus(k as 'ALL' | 'ACTIVE' | 'INACTIVE');
                    setPillarPage(1);
                  }}
                />
              </div>
            </div>

            <DataTable<MasterContentPillar>
              columns={[
                {
                  key: 'code',
                  header: 'Trụ cột nội dung',
                  render: (p: MasterContentPillar) => (
                    <div className="flex items-center gap-2.5">
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0" 
                        style={{ backgroundColor: p.colorTag || '#4F46E5' }} 
                        title={`Màu nhận diện: ${p.colorTag || '#4F46E5'}`}
                      />
                      <div>
                        <div className="font-semibold text-ink text-xs">
                          {p.name}
                        </div>
                        <div className="font-mono text-2xs text-ink-3">
                          {p.code}
                        </div>
                      </div>
                    </div>
                  )
                },
                {
                  key: 'description',
                  header: 'Định hướng nội dung',
                  render: (p: MasterContentPillar) => {
                    const desc = p.description || (p.code === 'LIVESTREAM_HIGHLIGHT' ? 'Nội dung phát sóng trực tiếp, tương tác hai chiều và thúc đẩy doanh số phiên live.' : '—');
                    return (
                      <p className="text-ink-2 text-xs leading-relaxed max-w-xl">
                        {desc}
                      </p>
                    );
                  }
                },
                {
                  key: 'formats',
                  header: 'Định dạng gợi ý',
                  render: (p: MasterContentPillar) => {
                    const formats = (p.suggestedFormats || [])
                      .map(f => f.replace(/Video AI/gi, 'Video đồ họa').trim())
                      .filter(Boolean);
                    if (formats.length === 0) return <span className="text-ink-3 text-xs">—</span>;
                    return (
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {formats.map((fmt, idx) => (
                          <span 
                            key={idx} 
                            className="inline-block px-1.5 py-0.5 rounded text-2xs bg-surface-subtle border border-line text-ink-2 font-medium"
                          >
                            {fmt}
                          </span>
                        ))}
                      </div>
                    );
                  }
                },
                {
                  key: 'cost',
                  header: 'Định mức tham chiếu',
                  align: 'right',
                  render: (p: MasterContentPillar) => (
                    <div>
                      <div className="font-semibold text-ink font-mono text-xs">
                        {formatVnd(p.benchmarkUnitCost)}
                      </div>
                      <div className="text-2xs text-ink-3">
                        / video
                      </div>
                    </div>
                  )
                },
                {
                  key: 'status',
                  header: 'Trạng thái',
                  align: 'center',
                  render: (p: MasterContentPillar) => (
                    <Status tone={p.status === 'ACTIVE' ? 'positive' : 'neutral'}>
                      {p.status === 'ACTIVE' ? 'Áp dụng' : 'Tạm dừng'}
                    </Status>
                  )
                },
                {
                  key: 'actions',
                  header: 'Thao tác',
                  align: 'right',
                  render: (p: MasterContentPillar) => (
                    <ActionMenu
                      items={[
                        {
                          label: 'Chỉnh sửa',
                          icon: Edit3,
                          onSelect: () => {
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
                          }
                        },
                        {
                          label: p.status === 'ACTIVE' ? 'Tạm dừng áp dụng' : 'Kích hoạt lại',
                          icon: RotateCcw,
                          onSelect: () => handleTogglePillarStatus(p.id)
                        }
                      ]}
                    />
                  )
                }
              ]}
              rows={paginatedPillars}
              rowKey={(p) => p.id}
              stickyLast
              empty={
                <EmptyState
                  title="Không tìm thấy trụ cột nội dung"
                  description="Thử đổi từ khóa tìm kiếm tên hoặc mã trụ cột..."
                />
              }
            />

            {filteredPillars.length > pillarPageSize && (
              <Pagination
                page={pillarPage}
                pageSize={pillarPageSize}
                total={filteredPillars.length}
                onPageChange={setPillarPage}
                onPageSizeChange={(sz) => {
                  setPillarPageSize(sz);
                  setPillarPage(1);
                }}
              />
            )}
          </Panel>
        </div>
      )}

      {/* SUB-TAB: BẬC CAST & PHÂN NHÓM CREATOR */}
      {activeSubTab === 'cast-tiers' && (
        <CastTiersMasterView
          initialTiers={extraCatalog.castTiers} canEdit={canEditCatalog} onChange={items => setExtraCatalog(prev => ({ ...prev, castTiers: items }))}
          onNotify={onNotify}
        />
      )}

      {/* SUB-TAB: TỆP KÊNH & CHUYÊN MỤC KOC */}
      {activeSubTab === 'koc-niches' && (
        <KocNichesMasterView
          initialNiches={extraCatalog.niches} canEdit={canEditCatalog} onChange={items => setExtraCatalog(prev => ({ ...prev, niches: items }))}
          onNotify={onNotify}
        />
      )}

      {/* SUB-TAB: PHÂN LOẠI ĐỊNH DẠNG VIDEO */}
      {activeSubTab === 'video-formats' && (
        <VideoFormatsMasterView
          initialFormats={extraCatalog.formats} canEdit={canEditCatalog} onChange={items => setExtraCatalog(prev => ({ ...prev, formats: items }))}
          onNotify={onNotify}
        />
      )}

      {/* SUB-TAB: DANH BẠ KOC */}
      {activeSubTab === 'kocs' && (
        <KocMasterDataView
          kocs={kocs}
          allDeals={deals}
          currentUser={currentUser}
          onOpenQuickBookWithKoc={onOpenQuickBookWithKoc || (() => {})}
          onKocCreated={onKocCreated}
          onKocUpdated={onKocUpdated}
          onOpenKocPortal={onNavigateToKocPortal}
          onSelectDealForContract={onSelectDealForContract}
          onNotify={onNotify}
        />
      )}

      {/* SUB-TAB: DỮ LIỆU GỐC CỘNG TÁC VIÊN / VJ */}
      {activeSubTab === 'ctvs' && (
        <ContributorsMasterView
          contributors={contributors}
          currentUser={currentUser}
          onContributorCreated={onContributorCreated}
          onContributorUpdated={onContributorUpdated}
          onContributorDeleted={onContributorDeleted}
          onNavigateToCtvProfile={onNavigateToCtvProfile}
          onNotify={onNotify}
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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
                className="w-full px-2.5 py-1.5 border border-line-strong rounded-lg font-mono focus:outline-none focus:border-focus bg-surface text-ink "
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: ĐỒNG BỘ / NHẬP HÀNG LOẠT TỪ LARK BASE */}
      <Modal
        open={isLarkSyncModalOpen}
        onClose={() => setIsLarkSyncModalOpen(false)}
        title="Đồng bộ danh sách Brand từ Lark Base"
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

          <div className="flex items-center gap-2 text-ink-3 text-2xs font-semibold">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-ink-2 font-medium mb-1">
                  Mã Brand
                </label>
                <input
                  type="text"
                  value={editBrandCode}
                  onChange={(e) => setEditBrandCode(e.target.value.toUpperCase())}
                  className="w-full px-2.5 py-1.5 border border-line-strong rounded-lg font-mono focus:outline-none focus:border-focus bg-surface text-ink "
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
                onChange={(e) => setEditBrandStatus(e.target.value as 'ACTIVE' | 'PAUSED' | 'UPCOMING')}
                className="w-full px-2.5 py-1.5 border border-line-strong rounded-lg bg-surface text-ink focus:outline-none focus:border-focus font-medium"
              >
                <option value="ACTIVE">Đang hợp tác (Active)</option>
                <option value="UPCOMING">Sắp triển khai (Upcoming)</option>
                <option value="PAUSED">Tạm dừng (Paused)</option>
              </select>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                onChange={(e) => setProductForm(prev => ({ ...prev, platform: e.target.value as 'TikTok Shop' | 'Shopee Mall' | 'Lazada' }))}
                className="w-full px-3 py-1.5 border border-line-strong rounded-lg bg-surface text-ink focus:outline-none focus:border-focus"
              >
                <option value="Shopee Mall">Shopee Mall</option>
                <option value="TikTok Shop">TikTok Shop</option>
                <option value="Lazada">Lazada</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <span className="text-2xs font-semibold text-ink block">
              Chính sách phân phối & Booking KOC
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-ink-2 font-medium mb-1">Phân loại vai trò</label>
                <select
                  value={productForm.heroType}
                  onChange={(e) => setProductForm(prev => ({ ...prev, heroType: e.target.value as 'HERO' | 'ENTRY' | 'ADDON' }))}
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
              onChange={(e) => setProductForm(prev => ({ ...prev, status: e.target.value as 'ACTIVE' | 'DISCONTINUED' }))}
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
                Chuyển sang &quot;Tạm ngừng kinh doanh&quot; (An toàn)
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
                className="w-full px-3 py-1.5 border border-line-strong rounded-lg font-mono focus:outline-none focus:border-focus bg-surface text-ink"
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
              onChange={(e) => setPillarForm(prev => ({ ...prev, status: e.target.value as 'ACTIVE' | 'INACTIVE' }))}
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
            <div className="px-4 py-2.5 border-b border-line bg-canvas flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-xs text-ink">
                  Mốc thời gian cam kết dịch vụ (SLA)
                </h3>
                <span className="text-2xs font-mono font-medium text-ink-3">
                  ({UPBASE_MASTER_SLA_CONFIG.length} mốc)
                </span>
              </div>
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
                        <span className="text-xs font-medium text-ink-2">
                          {sla.responsibleRole}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-medium text-critical">
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
            <div className="px-4 py-2.5 border-b border-line bg-canvas flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-xs text-ink">
                  Chỉ số đo lường hiệu suất làm việc (KPI)
                </h3>
                <span className="text-2xs font-mono font-medium text-ink-3">
                  ({UPBASE_MASTER_KPI_DEFINITIONS.length} chỉ số)
                </span>
              </div>
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
                        <span className="text-xs font-medium text-ink-2">
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
    </div>
  );
};

