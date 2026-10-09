'use client';

import React, { useState, useEffect } from 'react';
import { ChannelTag } from '../ui';
import { formatVndShort } from '../../lib/format';
import { 
  Building2, 
  Store, 
  ShoppingBag, 
  ExternalLink, 
  Plus, 
  Edit3, 
  ShieldCheck, 
  Lock, 
  Search, 
  Filter, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Package, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Sparkles, 
  Zap, 
  Info,
  Layers,
  ChevronRight,
  Eye,
  UserCheck,
  UserPlus,
  Check,
  SlidersHorizontal,
  ShieldAlert,
  Award,
  GitFork,
  Database
} from 'lucide-react';
import { UserProfile, BrandDetail, EcomStore, HeroProduct, StorePortfolioItem, StaffMasterMember } from '../../lib/types';
import { INITIAL_BRANDS, INITIAL_STORE_PORTFOLIOS, STAFF_MASTER_DIRECTORY } from '../../lib/mockData';
import { UPBASE_BRANDS_MASTER } from '../../lib/importedMasterData';
import { MasterDataMindmapView } from './MasterDataMindmapView';
import { StaffSearchSelect } from './master-data/StaffSearchSelect';

interface StoresViewProps {
  currentUser: UserProfile;
  onOpenQuickBookWithBrand?: (brandName: string) => void;
}

export const StoresView: React.FC<StoresViewProps> = ({
  currentUser,
  onOpenQuickBookWithBrand,
}) => {
  const [brands, setBrands] = useState<BrandDetail[]>(INITIAL_BRANDS);
  const [activeStoreTab, setActiveStoreTab] = useState<'MINDMAP' | 'STORE_PORTFOLIO' | 'BRAND_STRATEGY' | 'STAFF_MATRIX'>('MINDMAP');
  const [storePortfolios, setStorePortfolios] = useState<StorePortfolioItem[]>(INITIAL_STORE_PORTFOLIOS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // State Quản Trị & Phân Quyền Nhân Sự Phụ Trách
  const [assignedStaffFilter, setAssignedStaffFilter] = useState<string>('ALL');
  const [assigningStore, setAssigningStore] = useState<StorePortfolioItem | null>(null);
  const [assignFormState, setAssignFormState] = useState<{
    accountOwnerName: string;
    b2cOwners: string[];
    assignmentNotes: string;
  }>({
    accountOwnerName: '',
    b2cOwners: [],
    assignmentNotes: ''
  });
  const [b2cStaffSearch, setB2cStaffSearch] = useState('');
  const [assignmentToast, setAssignmentToast] = useState<string | null>(null);

  // Modal States Brand
  const [editingBrand, setEditingBrand] = useState<BrandDetail | null>(null);
  const [viewingBrand, setViewingBrand] = useState<BrandDetail | null>(null);
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);

  // Form State for Manager Edit / Create Brand
  const [formData, setFormData] = useState<Partial<BrandDetail>>({
    name: '',
    companyName: '',
    category: 'Mẹ & Bé / Chăm Sóc Da',
    status: 'ACTIVE',
    planBudget: 200000000,
    targetGmv: 600000000,
    targetVideos: 250,
    accountPic: 'Phương Thảo',
    growthPic: 'Hoàng Long',
    bookingPicLead: 'Khánh Vy',
    brandGuideline: '',
    kocCriteria: '',
    forbiddenNotes: ''
  });

// RBAC Permission Check
  const isManager = currentUser.role === 'MANAGER';

  // ESC key listener for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditingBrand(null);
        setIsCreatingBrand(false);
        setViewingBrand(null);
        setAssigningStore(null);
      }
    };
    if (editingBrand || isCreatingBrand || viewingBrand || assigningStore) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingBrand, isCreatingBrand, viewingBrand, assigningStore]);

  // Hàm kiểm tra nhân viên có phụ trách gian hàng hay không (Hỗ trợ cả trường hợp 2+ nhân viên làm cùng 1 shop)
  const isStoreAssignedToUser = (store: StorePortfolioItem, userName: string) => {
    if (!userName) return false;
    const u = userName.toLowerCase().trim();
    if (store.accountOwnerName && store.accountOwnerName.toLowerCase().includes(u)) return true;
    if (store.b2cOwnerName && store.b2cOwnerName.toLowerCase().includes(u)) return true;
    if (store.b2cOwners && store.b2cOwners.some(name => name.toLowerCase().includes(u))) return true;
    return false;
  };

  // PHÂN QUYỀN DỮ LIỆU GIAN HÀNG (DATA SCOPING):
  // - Nếu không phải Manager: Bắt buộc chỉ hiển thị các gian hàng mà nhân sự đó phụ trách
  // - Nếu là Manager: Xem toàn bộ gian hàng, hoặc lọc theo một nhân sự cụ thể để kiểm tra tải
  const scopedPortfolios = storePortfolios.filter(store => {
    if (!isManager) {
      return isStoreAssignedToUser(store, currentUser.name);
    }
    if (assignedStaffFilter !== 'ALL') {
      return isStoreAssignedToUser(store, assignedStaffFilter);
    }
    return true;
  });

  // Categories List
  const categories = [
    { key: 'ALL', label: 'Tất cả ngành hàng' },
    { key: 'Mẹ & Bé', label: 'Mẹ & Bé / Sữa' },
    { key: 'Skincare', label: 'Trị Mụn & Skincare' },
    { key: 'Chăm Sóc Cá Nhân', label: 'Phụ khoa & cá nhân' },
    { key: 'Dược Mỹ Phẩm', label: 'Dược Mỹ Phẩm Châu Âu' },
    { key: 'Gia Dụng', label: 'Gia Dụng & FMCG' },
  ];

  // Filtering Logic cho Store Portfolios
  const filteredStorePortfolios = scopedPortfolios.filter(store => {
    const matchSearch = 
      store.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.brandName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.accountOwnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.b2cOwnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (store.b2cOwners && store.b2cOwners.some(o => o.toLowerCase().includes(searchTerm.toLowerCase())));

    const matchPlatform = selectedPlatform === 'ALL' || store.platform === selectedPlatform;
    const matchCat = selectedCategory === 'ALL' || store.category.includes(selectedCategory);
    const matchStatus = selectedStatus === 'ALL' || store.accountStatus === selectedStatus;

    return matchSearch && matchPlatform && matchCat && matchStatus;
  });

  // Filtering Logic cho Brands
  const filteredBrands = brands.filter(b => {
    const matchSearch = 
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.stores.some(s => s.storeName.toLowerCase().includes(searchTerm.toLowerCase()) || s.storeId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      b.heroProducts.some(p => p.productName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchCat = selectedCategory === 'ALL' || b.category.includes(selectedCategory);
    const matchStatus = selectedStatus === 'ALL' || b.status === selectedStatus;
    const matchPlatform = selectedPlatform === 'ALL' || b.stores.some(s => s.platform === selectedPlatform);

    // Phân quyền Brand: Nếu là nhân viên thường, chỉ hiển thị brand có PIC là mình hoặc có store mình làm
    if (!isManager) {
      const isBrandOwner = 
        (b.accountPic && b.accountPic.toLowerCase().includes(currentUser.name.toLowerCase())) ||
        (b.growthPic && b.growthPic.toLowerCase().includes(currentUser.name.toLowerCase())) ||
        (b.bookingPicLead && b.bookingPicLead.toLowerCase().includes(currentUser.name.toLowerCase()));
      const hasAssignedStore = storePortfolios.some(st => st.brandName === b.name && isStoreAssignedToUser(st, currentUser.name));
      return matchSearch && matchCat && matchStatus && matchPlatform && (isBrandOwner || hasAssignedStore);
    }

    return matchSearch && matchCat && matchStatus && matchPlatform;
  });

  // Quick stats
  const totalStores = brands.reduce((acc, b) => acc + b.stores.length, 0);
  const totalBudget = brands.reduce((acc, b) => acc + b.planBudget, 0);
  const totalSpent = brands.reduce((acc, b) => acc + b.spentBudget, 0);
  const totalGmv = brands.reduce((acc, b) => acc + b.currentGmv, 0);

  // Xử lý mở Modal Phân Công Gian Hàng
  const handleOpenAssignModal = (store: StorePortfolioItem) => {
    if (!isManager) return;
    setAssigningStore(store);
    setB2cStaffSearch('');
    let initialOwners: string[] = [];
    if (store.b2cOwners && store.b2cOwners.length > 0) {
      initialOwners = [...store.b2cOwners];
    } else if (store.b2cOwnerName) {
      initialOwners = store.b2cOwnerName.split(',').map(s => s.trim()).filter(Boolean);
    }
    setAssignFormState({
      accountOwnerName: store.accountOwnerName || 'Phạm Thị Nhài',
      b2cOwners: initialOwners,
      assignmentNotes: store.assignmentNotes || ''
    });
  };

  // Toggle chọn/bỏ chọn nhân sự B2C Ops (Hỗ trợ chọn 2 hoặc nhiều nhân sự cùng làm 1 shop)
  const handleToggleB2cOwner = (staffName: string) => {
    setAssignFormState(prev => {
      const exists = prev.b2cOwners.includes(staffName);
      if (exists) {
        return {
          ...prev,
          b2cOwners: prev.b2cOwners.filter(n => n !== staffName)
        };
      } else {
        return {
          ...prev,
          b2cOwners: [...prev.b2cOwners, staffName]
        };
      }
    });
  };

  // Lưu Phân Công Nhân Sự Cho Shop
  const handleSaveAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningStore || !isManager) return;

    const ownersList = assignFormState.b2cOwners.length > 0 
      ? assignFormState.b2cOwners 
      : ['Khánh Vy'];

    setStorePortfolios(prev => prev.map(s => {
      if (s.id === assigningStore.id) {
        return {
          ...s,
          accountOwnerName: assignFormState.accountOwnerName,
          b2cOwners: ownersList,
          b2cOwnerName: ownersList.join(', '),
          assignmentNotes: assignFormState.assignmentNotes
        };
      }
      return s;
    }));

    const isMulti = ownersList.length > 1;
    const msg = `Đã lưu phân công cho "${assigningStore.storeName}": ${ownersList.join(' & ')} ${isMulti ? '(Đồng phụ trách)' : ''}`;
    setAssignmentToast(msg);
    setTimeout(() => setAssignmentToast(null), 4000);
    setAssigningStore(null);
  };

  // Handle Save / Edit Brand (Manager Only)
  const handleSaveBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isManager) return;

    if (editingBrand) {
      // Update existing
      setBrands(prev => prev.map(b => b.id === editingBrand.id ? {
        ...b,
        ...formData,
        name: formData.name || b.name,
        companyName: formData.companyName || b.companyName,
        planBudget: Number(formData.planBudget) || b.planBudget,
        targetGmv: Number(formData.targetGmv) || b.targetGmv,
        targetVideos: Number(formData.targetVideos) || b.targetVideos,
      } as BrandDetail : b));
      setEditingBrand(null);
    } else if (isCreatingBrand) {
      // Create new
      const newBrand: BrandDetail = {
        id: `brand-${Date.now()}`,
        code: `BRAND_${(formData.name || 'NEW').toUpperCase().replace(/\s+/g, '_')}`,
        name: formData.name || 'Nhãn Hàng Mới',
        companyName: formData.companyName || 'Công ty Đối tác',
        category: formData.category || 'Mẹ & Bé',
        color: 'bg-blue-600 ',
        status: 'ACTIVE',
        planBudget: Number(formData.planBudget) || 200000000,
        spentBudget: 0,
        targetGmv: Number(formData.targetGmv) || 600000000,
        currentGmv: 0,
        targetVideos: Number(formData.targetVideos) || 250,
        airedVideos: 0,
        accountPic: formData.accountPic || 'Phương Thảo',
        growthPic: formData.growthPic || 'Hoàng Long',
        bookingPicLead: formData.bookingPicLead || 'Khánh Vy',
        brandGuideline: formData.brandGuideline || 'Quy định nội dung chuẩn của thương hiệu...',
        kocCriteria: formData.kocCriteria || 'Tiêu chí lựa chọn KOC phù hợp...',
        forbiddenNotes: formData.forbiddenNotes || 'Không vi phạm tiêu chuẩn cộng đồng.',
        stores: [
          {
            id: `store-tts-${Date.now()}`,
            brandId: `brand-${Date.now()}`,
            platform: 'TIKTOK_SHOP',
            storeName: `${formData.name || 'Brand'} Official Store`,
            storeId: `TTS_VN_${Math.floor(10000 + Math.random() * 90000)}`,
            storeUrl: 'https://shop.tiktok.com',
            affiliateRate: 15,
            requiresSparkAds: false,
            status: 'ACTIVE',
            rating: 5.0,
            totalProductsCount: 10
          },
          {
            id: `store-sp-${Date.now()}`,
            brandId: `brand-${Date.now()}`,
            platform: 'SHOPEE_MALL',
            storeName: `Shopee Mall ${formData.name || 'Brand'} Chính Hãng`,
            storeId: `SP_MALL_${Math.floor(10000 + Math.random() * 90000)}`,
            storeUrl: 'https://shopee.vn',
            affiliateRate: 12,
            requiresSparkAds: false,
            status: 'ACTIVE',
            rating: 4.9,
            totalProductsCount: 12
          }
        ],
        heroProducts: [
          {
            id: `prod-${Date.now()}-1`,
            brandId: `brand-${Date.now()}`,
            productName: `Sản Phẩm Chủ Lực ${formData.name || ''}`,
            sku: 'SKU-HERO-01',
            price: 180000,
            commissionRate: 15,
            sampleAvailable: true,
            sampleStock: 150,
            category: 'Chủ lực',
            pdpUrl: 'https://shop.tiktok.com'
          }
        ]
      };
      setBrands(prev => [newBrand, ...prev]);
      setIsCreatingBrand(false);
    }
  };

  const handleOpenEdit = (brand: BrandDetail) => {
    if (!isManager) return;
    setEditingBrand(brand);
    setFormData({
      name: brand.name,
      companyName: brand.companyName,
      category: brand.category,
      status: brand.status,
      planBudget: brand.planBudget,
      targetGmv: brand.targetGmv,
      targetVideos: brand.targetVideos,
      accountPic: brand.accountPic,
      growthPic: brand.growthPic,
      bookingPicLead: brand.bookingPicLead,
      brandGuideline: brand.brandGuideline,
      kocCriteria: brand.kocCriteria,
      forbiddenNotes: brand.forbiddenNotes
    });
  };

  const handleToggleStatus = (brandId: string) => {
    if (!isManager) return;
    setBrands(prev => prev.map(b => b.id === brandId ? {
      ...b,
      status: b.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    } : b));
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Sleek Top Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-0.5">
        <div className="flex items-center gap-2">
          {isManager ? (
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold badge-emerald inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Quản trị Brand & cấu hình Shop (trưởng phòng)</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 border border-slate-200 text-slate-600 inline-flex items-center gap-1.5 shadow-2xs">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>Chế độ xem tra cứu (nhân viên)</span>
            </span>
          )}
          <span className="text-2xs text-slate-500 hidden md:inline">
            • {brands.length} nhãn hàng • {totalStores} gian hàng
          </span>
        </div>

        {isManager && (
          <button
            onClick={() => {
              setIsCreatingBrand(true);
              setFormData({
                name: '',
                companyName: '',
                category: 'Mẹ & Bé / Chăm Sóc Da',
                status: 'ACTIVE',
                planBudget: 250000000,
                targetGmv: 800000000,
                targetVideos: 300,
                accountPic: 'Phương Thảo',
                growthPic: 'Hoàng Long',
                bookingPicLead: 'Khánh Vy',
                brandGuideline: '',
                kocCriteria: '',
                forbiddenNotes: ''
              });
            }}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 hover: text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Thêm Brand mới</span>
          </button>
        )}
      </div>

      {/* 6-Module Subtab Navigation: Module 1 Portfolio / Store Management & Master Data */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 border border-slate-200 rounded-xl text-xs overflow-x-auto shadow-2xs">
        <button
          onClick={() => setActiveStoreTab('MINDMAP')}
          className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 whitespace-nowrap ${
            activeStoreTab === 'MINDMAP'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <GitFork className="w-3.5 h-3.5" />
          <span>1. Mindmap Master Data (Brand → Gian → PIC → SKU)</span>
          <span className="px-1.5 py-0.2 rounded text-2xs bg-blue-100 text-blue-700 font-semibold">
            MỚI
          </span>
        </button>
        <button
          onClick={() => setActiveStoreTab('STORE_PORTFOLIO')}
          className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 whitespace-nowrap ${
            activeStoreTab === 'STORE_PORTFOLIO'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>2. Danh Sách Gian Hàng ({storePortfolios.length} Shops)</span>
        </button>
        <button
          onClick={() => setActiveStoreTab('BRAND_STRATEGY')}
          className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 whitespace-nowrap ${
            activeStoreTab === 'BRAND_STRATEGY'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>3. Chiến Lược Brand &amp; SP ({brands.length} Brands)</span>
        </button>
        <button
          onClick={() => setActiveStoreTab('STAFF_MATRIX')}
          className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 whitespace-nowrap ${
            activeStoreTab === 'STAFF_MATRIX'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>4. Ma Trận Phân Bổ PICs ({STAFF_MASTER_DIRECTORY.length} Nhân Sự)</span>
        </button>
      </div>

      {/* RENDER MODULE 0: INTERACTIVE MINDMAP MASTER DATA */}
      {activeStoreTab === 'MINDMAP' && (
        <MasterDataMindmapView
          storePortfolios={storePortfolios}
          currentUser={currentUser}
          onOpenQuickBookWithBrand={onOpenQuickBookWithBrand}
          onNotify={msg => setAssignmentToast(msg)}
        />
      )}

      {/* RENDER MODULE 1: STORE PORTFOLIO MANAGEMENT */}
      {activeStoreTab === 'STORE_PORTFOLIO' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Toast Notification khi phân công thành công */}
          {assignmentToast && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs animate-in slide-in-from-top-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{assignmentToast}</span>
            </div>
          )}

          {/* BANNER PHÂN QUYỀN DỮ LIỆU NHÂN SỰ (RBAC) */}
          {!isManager && (
            <div className="p-4 bg-blue-950/60 border border-blue-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-semibold shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-white flex items-center gap-2">
                    <span>Phân Quyền Dữ Liệu Gian Hàng — {currentUser.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {currentUser.roleTitle}
                    </span>
                  </div>
                  <p className="text-slate-400 mt-0.5">
                    Hệ thống chỉ hiển thị <strong>{filteredStorePortfolios.length} gian hàng</strong> mà bạn được phân công phụ trách. Dữ liệu các gian hàng khác được bảo mật tự động.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-lg text-2xs font-semibold text-blue-400 shrink-0">
                Đang áp dụng phân quyền
              </span>
            </div>
          )}

          {/* THANH ĐIỀU KHIỂN DÀNH CHO TRƯỞNG PHÒNG (MANAGER FILTER BAR) */}
          {isManager && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-blue-600" />
                  <span>Xem gian hàng theo nhân sự:</span>
                </span>
                <select
                  value={assignedStaffFilter}
                  onChange={(e) => setAssignedStaffFilter(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                >
                  <option value="ALL">Toàn bộ nhân sự ({storePortfolios.length} gian hàng)</option>
                  {STAFF_MASTER_DIRECTORY.map(s => {
                    const count = storePortfolios.filter(st => isStoreAssignedToUser(st, s.name)).length;
                    return (
                      <option key={s.id} value={s.name}>
                        {s.name} ({s.roleTitle}) — {count} gian hàng
                      </option>
                    );
                  })}
                </select>
                {assignedStaffFilter !== 'ALL' && (
                  <button
                    onClick={() => setAssignedStaffFilter('ALL')}
                    className="text-2xs text-blue-600 hover:text-blue-800 font-semibold underline ml-1 cursor-pointer"
                  >
                    Xem tất cả ({storePortfolios.length})
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-2xs">
                <span>Hiển thị <strong>{filteredStorePortfolios.length}</strong> / {storePortfolios.length} gian hàng</span>
              </div>
            </div>
          )}

          {/* Portfolio Metric Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-2xs text-slate-500 block font-medium">Gian hàng đang xem</span>
              <div className="text-xl font-semibold text-blue-600 mt-0.5">{filteredStorePortfolios.length} Gian Hàng</div>
              <span className="text-2xs text-slate-400">
                {isManager ? 'Toàn bộ danh mục hệ thống' : `Được gán cho ${currentUser.name}`}
              </span>
            </div>
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-2xs text-slate-500 block font-medium">Tổng GMV mục tiêu</span>
              <div className="text-xl font-semibold text-emerald-600 mt-0.5 font-mono">
                {(filteredStorePortfolios.reduce((s, p) => s + p.monthlyTargetGmv, 0) / 1000000000).toFixed(2)}B đ
              </div>
              <span className="text-2xs text-emerald-600 font-semibold">Kế hoạch chỉ tiêu tháng</span>
            </div>
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-2xs text-slate-500 block font-medium">Tổng ngân sách phụ trách</span>
              <div className="text-xl font-semibold text-amber-600 mt-0.5 font-mono">
                {(filteredStorePortfolios.reduce((s, p) => s + p.monthlyBudget, 0) / 1000000).toLocaleString('vi-VN')}M đ
              </div>
              <span className="text-2xs text-slate-400">Hạn mức booking KOC</span>
            </div>
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-2xs text-slate-500 block font-medium">Tác nghiệp thực thể</span>
              <div className="text-xl font-semibold text-purple-600 mt-0.5">
                {filteredStorePortfolios.reduce((s, p) => s + (p.activeCandidatesCount || 0), 0)} Can • {filteredStorePortfolios.reduce((s, p) => s + (p.activeBookingsCount || 0), 0)} BO
              </div>
              <span className="text-2xs text-purple-600 font-medium">Kế hoạch vận hành thực tế</span>
            </div>
          </div>

          {/* Master Store Portfolio Table */}
          <div className="card-enterprise overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span>Danh mục gian hàng — Cấu trúc trách nhiệm kép & phân công nhân sự</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Phân định minh bạch giữa <strong>Account/Growth Owner</strong> và <strong>B2C Ops Owner</strong> (Hỗ trợ 2+ nhân viên đồng phụ trách 1 gian hàng)
                </p>
              </div>

              {/* Quick Search */}
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm shop, brand, nhân viên..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 text-slate-600 border-b border-slate-200 text-2xs">
                  <tr>
                    <th className="p-3.5 pl-5">Gian hàng & kênh</th>
                    <th className="p-3.5">Nhãn hàng / ngành</th>
                    <th className="p-3.5">Mô hình dịch vụ</th>
                    <th className="p-3.5">Độ khó</th>
                    <th className="p-3.5">Trách nhiệm kép & PIC phụ trách</th>
                    <th className="p-3.5 font-mono">Target GMV / Budget</th>
                    <th className="p-3.5 text-center">Trạng Thái</th>
                    <th className="p-3.5 pr-5 text-right">Phân công & tác nghiệp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStorePortfolios.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        <div className="max-w-md mx-auto space-y-2">
                          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                          <div className="font-semibold text-slate-800 text-sm">Không tìm thấy gian hàng nào</div>
                          <p className="text-xs text-slate-500">
                            {!isManager 
                              ? `Bạn (${currentUser.name}) chưa được phân công phụ trách gian hàng nào phù hợp với bộ lọc hiện tại. Vui lòng liên hệ Trưởng phòng để được cấp quyền.`
                              : 'Không có gian hàng nào khớp với điều kiện tìm kiếm và bộ lọc của bạn.'}
                          </p>
                          {(searchTerm || selectedCategory !== 'ALL' || selectedPlatform !== 'ALL' || assignedStaffFilter !== 'ALL') && (
                            <button
                              onClick={() => {
                                setSearchTerm('');
                                setSelectedCategory('ALL');
                                setSelectedPlatform('ALL');
                                setAssignedStaffFilter('ALL');
                              }}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                            >
                              Đặt lại bộ lọc
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredStorePortfolios.map((store) => {
                      const isMultiOwner = store.b2cOwners && store.b2cOwners.length > 1;
                      return (
                        <tr key={store.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3.5 pl-5">
                            <div className="font-semibold text-slate-900 text-xs">{store.storeName}</div>
                            <div className="text-2xs text-blue-600 flex items-center gap-1 mt-0.5">
                              <ChannelTag channel={store.platform} />
                              {store.storeUrl && (
                                <a href={store.storeUrl} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-700">
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className="font-semibold text-slate-800">{store.brandName}</span>
                            <div className="text-2xs text-slate-500">{store.category}</div>
                          </td>
                          <td className="p-3.5">
                            {store.serviceModel === 'FULL_SERVICE' && (
                              <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                Full Service E2E
                              </span>
                            )}
                            {store.serviceModel === 'AFFILIATE_ONLY' && (
                              <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                Affiliate Only
                              </span>
                            )}
                            {store.serviceModel === 'LIVESTREAM_DEDICATED' && (
                              <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                Live Dedicated
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded text-2xs font-semibold ${
                              store.difficultyTier === 'Khó'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : store.difficultyTier === 'Vừa'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {store.difficultyTier} (x{store.difficultyMultiplier})
                            </span>
                          </td>
                          <td className="p-3.5 min-w-[260px]">
                            <div className="text-2xs">
                              <span className="text-slate-500">Account/Growth:</span>{' '}
                              <strong className="text-blue-700 font-semibold">{store.accountOwnerName}</strong>
                            </div>
                            <div className="text-2xs mt-1.5">
                              <span className="text-slate-500">B2C Ops PIC:</span>{' '}
                              {isMultiOwner ? (
                                <div className="mt-1 space-y-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="px-1.5 py-0.5 rounded text-2xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 inline-flex items-center gap-1">
                                      <Users className="w-2.5 h-2.5 text-indigo-600" />
                                      <span>{store.b2cOwners!.length} PICs Đồng Phụ Trách</span>
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                    {store.b2cOwners!.map((owner) => (
                                      <span key={owner} className="px-2 py-0.5 rounded-md text-2xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                        {owner}
                                      </span>
                                    ))}
                                  </div>
                                  {store.assignmentNotes && (
                                    <div className="text-2xs text-slate-600 italic mt-0.5 bg-slate-50 px-2 py-1 rounded border border-slate-200" title={store.assignmentNotes}>
                                      {store.assignmentNotes}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="mt-0.5">
                                  <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                    {store.b2cOwnerName}
                                  </span>
                                  {store.assignmentNotes && (
                                    <div className="text-2xs text-slate-500 italic mt-0.5">
                                      {store.assignmentNotes}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5 font-mono">
                            <div className="font-semibold text-emerald-700">
                              {(store.monthlyTargetGmv / 1000000).toLocaleString('vi-VN')}M
                            </div>
                            <div className="text-2xs text-slate-500">
                              CP: {(store.monthlyBudget / 1000000).toLocaleString('vi-VN')}M ({((store.monthlyBudget / store.monthlyTargetGmv) * 100).toFixed(1)}%)
                            </div>
                          </td>
                          <td className="p-3.5 text-center">
                            <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ● {store.accountStatus}
                            </span>
                          </td>
                          <td className="p-3.5 pr-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isManager ? (
                                <button
                                  onClick={() => handleOpenAssignModal(store)}
                                  className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                  title="Phân công hoặc gán thêm nhân sự phụ trách gian hàng này"
                                >
                                  <Users className="w-3 h-3 text-blue-600" />
                                  <span>Phân công PICs</span>
                                </button>
                              ) : (
                                <span className="px-2 py-1 rounded-md text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Đang phụ trách</span>
                                </span>
                              )}
                            </div>
                            <div className="text-2xs text-slate-500 mt-1">
                              {store.activeBookingsCount} Bookings • {store.activeContentsCount} Content
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RENDER MODULE 1: STAFF & STORE ASSIGNMENT MATRIX (MASTER DATA TAB) */}
      {activeStoreTab === 'STAFF_MATRIX' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Danh bạ Master Data nhân sự & Ma trận phân bổ gian hàng</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Quản lý phân công chuyên viên booking, Content & Growth. Một gian hàng có thể được 2 hoặc nhiều nhân sự đồng phụ trách để tối ưu hiệu suất.
              </p>
            </div>
            {isManager && (
              <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-2xs font-semibold text-emerald-700 shrink-0">
                Quyền trưởng phòng: Toàn quyền phân công
              </span>
            )}
          </div>

          {/* Grid Master Data Staff Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {STAFF_MASTER_DIRECTORY.map((staff) => {
              const assignedStores = storePortfolios.filter(st => isStoreAssignedToUser(st, staff.name));
              const loadPct = Math.round((assignedStores.length / staff.maxStoresCapacity) * 100);
              const isOverloaded = assignedStores.length > staff.maxStoresCapacity;
              const isCurrentUser = currentUser.name.toLowerCase().includes(staff.name.toLowerCase());

              return (
                <div 
                  key={staff.id} 
                  className={`p-4 rounded-xl border transition ${
                    isCurrentUser 
                      ? 'bg-blue-50/70 border-blue-300 shadow-xs ring-1 ring-blue-500/20' 
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-semibold text-xs flex items-center justify-center shadow-xs shrink-0">
                        {staff.avatar}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>{staff.name}</span>
                          {isCurrentUser && (
                            <span className="badge-blue px-1.5 py-0.2 rounded text-2xs font-semibold">
                              Bạn
                            </span>
                          )}
                        </div>
                        <div className="text-2xs text-slate-500">{staff.roleTitle}</div>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-2xs font-semibold ${
                      staff.role === 'BOOKING' ? 'badge-purple' :
                      staff.role === 'CONTENT' ? 'badge-rose' :
                      staff.role === 'ACCOUNT' ? 'badge-blue' :
                      'badge-amber'
                    }`}>
                      {staff.team}
                    </span>
                  </div>

                  {/* Contact info */}
                  <div className="text-2xs text-slate-500 mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <span>Email: <strong className="text-slate-800">{staff.email}</strong></span>
                    {staff.phone && <span className="font-mono text-slate-500">{staff.phone}</span>}
                  </div>

                  {/* Workload Capacity Bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-2xs mb-1">
                      <span className="text-slate-500 font-medium">Định mức phụ trách:</span>
                      <span className={`font-semibold ${isOverloaded ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {assignedStores.length} / {staff.maxStoresCapacity} Gian hàng ({loadPct}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          isOverloaded ? 'bg-rose-500' : loadPct >= 75 ? 'bg-emerald-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(100, loadPct)}%` }}
                      />
                    </div>
                  </div>

                  {/* Assigned Stores List */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
                    <span className="text-2xs text-slate-500 font-semibold block">
                      Các Gian Hàng Phụ Trách ({assignedStores.length}):
                    </span>
                    {assignedStores.length === 0 ? (
                      <div className="text-2xs text-slate-400 italic py-1">
                        Chưa được phân công gian hàng nào
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {assignedStores.map(st => {
                          const isCoWorking = st.b2cOwners && st.b2cOwners.length > 1;
                          return (
                            <div key={st.id} className="p-1.5 bg-slate-50 rounded-md border border-slate-200 flex items-center justify-between text-2xs">
                              <div className="truncate pr-2">
                                <span className="font-semibold text-slate-900 block truncate">{st.storeName}</span>
                                <span className="text-2xs text-slate-500">{st.brandName} • {st.platform}</span>
                              </div>
                              {isCoWorking ? (
                                <span className="px-1.5 py-0.5 rounded text-2xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0" title={`Đồng phụ trách cùng: ${st.b2cOwners?.filter(o => o !== staff.name).join(', ')}`}>
                                  Đồng phụ trách
                                </span>
                              ) : (
                                <span className="badge-slate px-1.5 py-0.5 rounded text-2xs font-semibold shrink-0">
                                  Đơn nhiệm
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* RENDER MODULE 1: BRAND STRATEGY (ORIGINAL VIEW) */}
      {activeStoreTab === 'BRAND_STRATEGY' && (
        <div className="space-y-4">
      {/* Compact Overview Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-2xs block">Nhãn hàng</span>
            <div className="text-base font-semibold text-slate-900 mt-0.5">
              {brands.length} <span className="text-xs font-normal text-slate-400">Brands</span>
            </div>
          </div>
          <Building2 className="w-4 h-4 text-blue-600 opacity-80" />
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-2xs block">Gian Hàng E-com</span>
            <div className="text-base font-semibold text-blue-600 mt-0.5">
              {totalStores} <span className="text-xs font-normal text-slate-400">Shops</span>
            </div>
          </div>
          <Store className="w-4 h-4 text-blue-500 opacity-80" />
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-2xs block">Ngân sách quản lý</span>
            <div className="text-base font-semibold text-amber-600 mt-0.5 font-mono">
              {(totalBudget / 1000000).toLocaleString('vi-VN')}M đ
            </div>
          </div>
          <DollarSign className="w-4 h-4 text-amber-500 opacity-80" />
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-2xs block">GMV 30 Ngày</span>
            <div className="text-base font-semibold text-emerald-600 mt-0.5 font-mono">
              {(totalGmv / 1000000000).toFixed(2)}B đ
            </div>
          </div>
          <TrendingUp className="w-4 h-4 text-emerald-500 opacity-80" />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. FILTER & SEARCH CONTROLS */}
      {/* ========================================================================= */}
      <div className="card-enterprise p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên Brand, công ty, gian hàng TikTok/Shopee, hoặc sản phẩm chủ lực..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto text-xs">
            {/* Filter by Platform */}
            <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl p-1">
              {[
                { key: 'ALL', label: 'Tất cả kênh' },
                { key: 'TIKTOK_SHOP', label: 'TikTok Shop' },
                { key: 'SHOPEE_MALL', label: 'Shopee Mall' },
              ].map(p => (
                <button
                  key={p.key}
                  onClick={() => setSelectedPlatform(p.key)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition text-2xs ${
                    selectedPlatform === p.key ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Filter by Status */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="PAUSED">Tạm dừng</option>
            </select>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200 overflow-x-auto text-xs">
          <span className="text-slate-500 text-2xs font-medium shrink-0 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-blue-600" /> Ngành hàng:
          </span>
          {categories.map(c => (
            <button
              key={c.key}
              onClick={() => setSelectedCategory(c.key)}
              className={`px-2.5 py-1 rounded-lg text-2xs font-medium transition whitespace-nowrap ${
                selectedCategory === c.key
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. BRANDS & STORES LIST (ENTERPRISE CARDS) */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        {filteredBrands.map((brand) => {
          const budgetPercent = Math.min(100, Math.round((brand.spentBudget / (brand.planBudget || 1)) * 100));
          const gmvPercent = Math.min(100, Math.round((brand.currentGmv / (brand.targetGmv || 1)) * 100));
          const videoPercent = Math.min(100, Math.round((brand.airedVideos / (brand.targetVideos || 1)) * 100));

          return (
            <div key={brand.id} className="card-enterprise overflow-hidden border-slate-200 hover:border-blue-400/60 transition-all shadow-2xs">
              {/* Card Header */}
              <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className={`w-11 h-11 rounded-md  ${brand.color} text-white flex items-center justify-center font-semibold text-xl shadow-xs shrink-0 mt-0.5`}>
                    {brand.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center flex-wrap gap-2">
                      <h3 className="text-base font-semibold text-slate-900">{brand.name}</h3>
                      <span className="badge-blue px-2 py-0.5 rounded text-2xs font-mono font-semibold">
                        {brand.code}
                      </span>
                      <span className="badge-purple px-2 py-0.5 rounded text-2xs font-semibold">
                        {brand.category}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-2xs font-semibold ${
                        brand.status === 'ACTIVE' ? 'badge-emerald' : 'badge-amber'
                      }`}>
                        {brand.status === 'ACTIVE' ? 'Đang Hoạt Động' : 'Tạm Dừng'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {brand.companyName}
                    </p>
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center flex-wrap gap-2">
                  {/* For All Users: View Details */}
                  <button
                    onClick={() => setViewingBrand(brand)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                    <span>Hồ sơ 360° Brand</span>
                  </button>

                  {/* For Booking Staff: Quick Book directly for this Brand */}
                  {onOpenQuickBookWithBrand && (
                    <button
                      onClick={() => onOpenQuickBookWithBrand(brand.name)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>+ Tạo Booking</span>
                    </button>
                  )}

                  {/* For Manager Only: Edit Controls */}
                  {isManager && (
                    <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                      <button
                        onClick={() => handleOpenEdit(brand)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="Chỉnh sửa thông tin Brand & ngân sách"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Sửa cấu hình</span>
                      </button>
                      <button
                        onClick={() => handleToggleStatus(brand.id)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs ${
                          brand.status === 'ACTIVE' 
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                        title={brand.status === 'ACTIVE' ? 'Tạm dừng hoạt động' : 'Kích hoạt hoạt động'}
                      >
                        {brand.status === 'ACTIVE' ? 'Tạm Dừng' : 'Kích Hoạt'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Body: 3-column Layout */}
              <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-5 text-xs">
                {/* Column 1: E-commerce Stores (TikTok Shop & Shopee Mall) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <span className="font-semibold text-slate-700 text-2xs flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-blue-600" />
                      Gian Hàng E-Commerce ({brand.stores.length} Shops)
                    </span>
                    <span className="text-2xs text-slate-500">Kênh bán chính thức</span>
                  </div>

                  <div className="space-y-2">
                    {brand.stores.map((store) => (
                      <div key={store.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 transition">
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded text-2xs font-semibold ${
                            store.platform === 'TIKTOK_SHOP' ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' : 'bg-orange-50 text-orange-700 border border-orange-200'
                          }`}>
                            {store.platform === 'TIKTOK_SHOP' ? 'TikTok Shop' : 'Shopee Mall'}
                          </span>
                          <a
                            href={store.storeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-500 hover:text-blue-700 flex items-center gap-1 text-2xs transition"
                          >
                            <span>Mở Shop</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        <div className="font-semibold text-slate-900 text-xs mt-1.5">{store.storeName}</div>
                        <div className="text-2xs text-slate-500 font-mono">Mã Shop: {store.storeId}</div>

                        <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-200 text-2xs">
                          <span className="text-slate-500">Hoa hồng Affiliate:</span>
                          <span className="font-semibold text-emerald-700 font-mono">{store.affiliateRate}%</span>
                        </div>

                        {store.requiresSparkAds && (
                          <div className="mt-1.5 px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded text-2xs font-semibold flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>Bắt buộc mã Spark Ads (tránh hụt gap ngân sách)</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column 2: Hero Products (Sản phẩm chủ lực) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <span className="font-semibold text-slate-700 text-2xs flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-pink-600" />
                      Sản Phẩm Chủ Lực Booking ({brand.heroProducts.length} SP)
                    </span>
                    <span className="text-2xs text-slate-500">Được cấp mẫu test</span>
                  </div>

                  <div className="space-y-2">
                    {brand.heroProducts.map((prod) => (
                      <div key={prod.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-slate-900 line-clamp-1">{prod.productName}</span>
                          <span className="text-2xs font-mono text-slate-500 shrink-0">{prod.sku}</span>
                        </div>
                        <div className="flex items-center justify-between text-2xs">
                          <span className="font-semibold text-blue-700 font-mono">{prod.price.toLocaleString('vi-VN')} đ</span>
                          <span className="badge-emerald px-1.5 py-0.2 rounded text-2xs font-semibold">
                            HH: {prod.commissionRate}%
                          </span>
                          <span className="text-2xs text-slate-500">
                            Kho mẫu: <strong className="text-slate-800">{prod.sampleStock}</strong>
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* Booking Guideline snippet */}
                    <div className="p-2.5 bg-blue-50/70 rounded-xl border border-blue-200 text-2xs text-blue-900 space-y-1">
                      <span className="font-semibold text-blue-800 block flex items-center gap-1">
                        <Info className="w-3 h-3 text-blue-600" /> Guideline tóm tắt:
                      </span>
                      <p className="line-clamp-2 text-slate-600">
                        {brand.brandGuideline}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Column 3: Ngân Sách, Hiệu Suất & Đội Ngũ 3 Bên (PIC) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <span className="font-semibold text-slate-700 text-2xs flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                      Ngân sách, GMV & PIC phụ trách
                    </span>
                    <span className="text-2xs text-slate-500">Tháng hiện tại</span>
                  </div>

                  {/* Progress bars */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                    {/* Budget progress */}
                    <div>
                      <div className="flex justify-between text-2xs mb-1">
                        <span className="text-slate-500">Tiến độ ngân sách:</span>
                        <span className="font-semibold text-amber-700 font-mono">
                          {formatVndShort(brand.spentBudget)} / {formatVndShort(brand.planBudget)} ({budgetPercent}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${budgetPercent}%` }} />
                      </div>
                    </div>

                    {/* GMV progress */}
                    <div>
                      <div className="flex justify-between text-2xs mb-1">
                        <span className="text-slate-500">Mục tiêu GMV 30:</span>
                        <span className="font-semibold text-emerald-700 font-mono">
                          {formatVndShort(brand.currentGmv)} / {formatVndShort(brand.targetGmv)} ({gmvPercent}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${gmvPercent}%` }} />
                      </div>
                    </div>

                    {/* Video target */}
                    <div className="flex items-center justify-between text-2xs pt-1 border-t border-slate-200">
                      <span className="text-slate-500">Số video đã Air / chỉ tiêu:</span>
                      <span className="font-semibold text-blue-700 font-mono">
                        {brand.airedVideos} / {brand.targetVideos} video ({videoPercent}%)
                      </span>
                    </div>
                  </div>

                  {/* 3-sided PICs */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Account PIC (Với Brand):</span>
                      <strong className="text-pink-600 font-semibold">{brand.accountPic}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Growth PIC (Ads & GMV):</span>
                      <strong className="text-blue-600 font-semibold">{brand.growthPic}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Booking Lead (KOCs):</span>
                      <strong className="text-amber-600 font-semibold">{brand.bookingPicLead}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: EDIT / CREATE BRAND (TRƯỞNG PHÒNG ONLY) */}
      {/* ========================================================================= */}
      {(editingBrand || isCreatingBrand) && isManager && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditingBrand(null);
              setIsCreatingBrand(false);
            }
          }}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-label="Cấu hình nhãn hàng & gian hàng"
            className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto text-xs text-slate-800"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Quyền trưởng phòng
                </span>
                <h3 className="text-base font-semibold text-slate-900 mt-1">
                  {editingBrand ? `Cập Nhật Cấu Hình: ${editingBrand.name}` : 'Thêm Nhãn Hàng & Cấu Hình Gian Hàng Mới'}
                </h3>
                <p className="text-xs text-slate-500">
                  Cấu hình thông tin nhãn hàng, gian hàng TikTok Shop / Shopee Mall, hạn mức ngân sách và phân bổ nhân sự
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingBrand(null);
                  setIsCreatingBrand(false);
                }}
                aria-label="Đóng modal"
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBrand} className="space-y-4 text-xs">
              {!editingBrand && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-1.5 text-blue-900 font-semibold text-2xs">
                    <Database className="w-3.5 h-3.5 text-blue-600" />
                    <span>Lựa chọn từ Master Data ({UPBASE_BRANDS_MASTER.length} thương hiệu chuẩn hóa)</span>
                  </div>
                  <select
                    onChange={(e) => {
                      const selected = UPBASE_BRANDS_MASTER.find(b => b.id === e.target.value);
                      if (selected) {
                        setFormData({
                          name: selected.name,
                          companyName: selected.companyName || '',
                          category: selected.category || 'Mẹ & Bé',
                          planBudget: selected.planBudget || 150000000,
                          targetGmv: selected.targetGmv || 450000000,
                          bookingPicLead: selected.bookingPicLead || 'Khánh Vy',
                          accountPic: selected.accountPic || 'Phương Thảo',
                          growthPic: selected.growthPic || 'Hoàng Long',
                          brandGuideline: selected.brandGuideline || '',
                          kocCriteria: selected.kocCriteria || 'Phù hợp tệp khách hàng nhãn hàng',
                          status: 'ACTIVE',
                          color: selected.color || 'bg-blue-600'
                        });
                      }
                    }}
                    defaultValue=""
                    className="w-full bg-white border border-blue-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs font-medium"
                  >
                    <option value="" disabled>-- Chọn thương hiệu Master Data để tự động điền thông tin --</option>
                    {UPBASE_BRANDS_MASTER.map(mb => (
                      <option key={mb.id} value={mb.id}>
                        {mb.name} - {mb.category} ({mb.companyName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Row 1: Tên Brand & Công Ty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Tên thương hiệu:</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ví dụ: Kutieskin Mama, Royal Ausnz..."
                    className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Công Ty chủ quản / pháp nhân:</label>
                  <input
                    type="text"
                    required
                    value={formData.companyName || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                    placeholder="Ví dụ: Công ty cổ phần dược mỹ phẩm CVI..."
                    className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Row 2: Ngành Hàng & Trạng Thái */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Danh mục ngành hàng:</label>
                  <select
                    value={formData.category || 'Mẹ & Bé'}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
                  >
                    <option value="Mẹ & Bé / Chăm Sóc Da Trẻ Em">Mẹ & Bé / Chăm Sóc Da Trẻ Em</option>
                    <option value="Sữa & Dinh Dưỡng Cao Cấp">Sữa & Dinh Dưỡng Cao Cấp</option>
                    <option value="Trị Mụn & Skincare Chuyên Sâu">Trị Mụn & Skincare Chuyên Sâu</option>
                    <option value="Chăm Sóc Cá Nhân & Phụ Khoa Nữ">Chăm Sóc Cá Nhân & Phụ Khoa Nữ</option>
                    <option value="Dược Mỹ Phẩm Đặc Trị Châu Âu">Dược Mỹ Phẩm Đặc Trị Châu Âu</option>
                    <option value="Gia Dụng & FMCG">Gia Dụng & FMCG</option>
                    <option value="Mỹ Phẩm Thiên Nhiên & Thảo Mộc">Mỹ Phẩm Thiên Nhiên & Thảo Mộc</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Trạng thái vận hành:</label>
                  <select
                    value={formData.status || 'ACTIVE'}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-semibold"
                  >
                    <option value="ACTIVE">Đang hoạt động</option>
                    <option value="PAUSED">Tạm dừng chiến dịch</option>
                    <option value="UPCOMING">Sắp triển khai</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Ngân Sách & Mục Tiêu */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-semibold text-amber-700 block text-2xs">
                  Phân bổ ngân sách tháng & chỉ tiêu GMV:
                </span>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-slate-600 font-medium block mb-1">Ngân sách phân bổ (đ):</label>
                    <input
                      type="number"
                      step={10000000}
                      value={formData.planBudget || 0}
                      onChange={(e) => setFormData(prev => ({ ...prev, planBudget: Number(e.target.value) }))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-amber-700 font-mono font-semibold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 font-medium block mb-1">Chỉ tiêu GMV 30 (đ):</label>
                    <input
                      type="number"
                      step={10000000}
                      value={formData.targetGmv || 0}
                      onChange={(e) => setFormData(prev => ({ ...prev, targetGmv: Number(e.target.value) }))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-emerald-700 font-mono font-semibold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 font-medium block mb-1">Chỉ tiêu số video:</label>
                    <input
                      type="number"
                      value={formData.targetVideos || 0}
                      onChange={(e) => setFormData(prev => ({ ...prev, targetVideos: Number(e.target.value) }))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-blue-700 font-mono font-semibold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Phân Công 3 PIC */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-semibold text-blue-700 block text-2xs">
                  Phân công nhân sự 3 bên phụ trách Brand:
                </span>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-slate-600 font-medium block mb-1">Account PIC (Làm việc Brand):</label>
                    <input
                      type="text"
                      value={formData.accountPic || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, accountPic: e.target.value }))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-pink-700 font-semibold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 font-medium block mb-1">Growth PIC (Ads & GMV):</label>
                    <input
                      type="text"
                      value={formData.growthPic || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, growthPic: e.target.value }))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-blue-700 font-semibold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 font-medium block mb-1">Booking PIC Lead (KOCs):</label>
                    <input
                      type="text"
                      value={formData.bookingPicLead || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, bookingPicLead: e.target.value }))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-amber-700 font-semibold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Row 5: Guideline & Tiêu Chí KOC */}
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Quy Chuẩn Nội Dung &amp; Tiêu Chí Duyệt KOC Của Brand:</label>
                <textarea
                  rows={3}
                  value={formData.brandGuideline || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, brandGuideline: e.target.value }))}
                  placeholder="Ghi rõ thông điệp cốt lõi, tone & voice, góc quay bắt buộc để nhân viên booking nắm vững..."
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setEditingBrand(null);
                    setIsCreatingBrand(false);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm transition"
                >
                  {editingBrand ? 'Lưu Thay Đổi Cấu Hình' : 'Tạo Nhãn Hàng & Lưu Gian Hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL: VIEW BRAND DETAILS 360° (ALL ROLES) */}
      {/* ========================================================================= */}
      {viewingBrand && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingBrand(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Thông tin nhãn hàng 360°"
        >
          <div className="card-enterprise max-w-2xl w-full p-6 bg-white border-slate-200 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto text-xs text-slate-800 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl  ${viewingBrand.color} text-white flex items-center justify-center font-semibold text-lg shadow-md`}>
                  {viewingBrand.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{viewingBrand.name}</h3>
                  <p className="text-slate-500">{viewingBrand.companyName} • {viewingBrand.category}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingBrand(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Details */}
            <div className="space-y-4">
              {/* Stores list */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-semibold text-blue-700 block text-2xs">
                  Các gian hàng E-Commerce trực thuộc:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {viewingBrand.stores.map((s) => (
                    <div key={s.id} className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{s.storeName}</span>
                        <a href={s.storeUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="text-2xs text-slate-500 font-mono mt-0.5">Mã: {s.storeId} • Hoa hồng: <strong className="text-emerald-600">{s.affiliateRate}%</strong></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hero products */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-semibold text-pink-700 block text-2xs">
                  Sản phẩm chủ lực cần đẩy số:
                </span>
                <div className="space-y-1.5">
                  {viewingBrand.heroProducts.map((p) => (
                    <div key={p.id} className="p-2.5 bg-white rounded-lg flex items-center justify-between border border-slate-200 shadow-2xs">
                      <div>
                        <span className="text-slate-900 font-medium">{p.productName}</span>
                        <span className="text-slate-400 font-mono text-2xs block">SKU: {p.sku}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-blue-700 font-mono">{p.price.toLocaleString('vi-VN')} đ</div>
                        <span className="badge-emerald px-1.5 py-0.5 rounded text-2xs font-semibold">Hoa hồng: {p.commissionRate}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Guidelines */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 space-y-1.5">
                <span className="font-semibold text-amber-800 block text-2xs">
                  Quy định duyệt nội dung & tiêu chí KOC:
                </span>
                <p className="text-slate-700 leading-relaxed">{viewingBrand.brandGuideline}</p>
                {viewingBrand.forbiddenNotes && (
                  <p className="text-rose-600 text-2xs pt-1.5 border-t border-blue-200 font-medium">
                    Điều Cấm Kỵ: {viewingBrand.forbiddenNotes}
                  </p>
                )}
              </div>

              {/* PICs */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block text-2xs">Account PIC:</span>
                  <span className="font-semibold text-pink-700">{viewingBrand.accountPic}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-2xs">Growth PIC:</span>
                  <span className="font-semibold text-blue-700">{viewingBrand.growthPic}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-2xs">Booking Lead:</span>
                  <span className="font-semibold text-amber-700">{viewingBrand.bookingPicLead}</span>
                </div>
              </div>
            </div>

            {/* Bottom button */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <button
                onClick={() => setViewingBrand(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition cursor-pointer"
              >
                Đóng
              </button>
              {onOpenQuickBookWithBrand && (
                <button
                  onClick={() => {
                    const bName = viewingBrand.name;
                    setViewingBrand(null);
                    onOpenQuickBookWithBrand(bName);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5 text-xs cursor-pointer"
                >
                  <span>+ Khởi tạo booking cho Brand này</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL: PHÂN CÔNG NHÂN SỰ PHỤ TRÁCH GIAN HÀNG (MANAGER ONLY) */}
      {/* ========================================================================= */}
      {assigningStore && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAssigningStore(null);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto text-xs text-slate-800 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-semibold shadow-2xs">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Phân công nhân sự phụ trách Shop</h3>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {assigningStore.storeName} • <span className="text-blue-700 font-semibold">{assigningStore.platform}</span> ({assigningStore.brandName})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAssigningStore(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="space-y-4">
              {/* Shop Overview Badges */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block text-2xs">Độ khó 4P:</span>
                  <span className="font-semibold text-amber-700">{assigningStore.difficultyTier} (x{assigningStore.difficultyMultiplier})</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-2xs">Target GMV:</span>
                  <span className="font-semibold text-emerald-700 font-mono">{(assigningStore.monthlyTargetGmv / 1000000).toLocaleString('vi-VN')}M đ</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-2xs">Hạn mức ngân sách:</span>
                  <span className="font-semibold text-blue-700 font-mono">{(assigningStore.monthlyBudget / 1000000).toLocaleString('vi-VN')}M đ</span>
                </div>
              </div>

              {/* 1. Account / Growth Owner */}
              <div>
                <StaffSearchSelect
                  label="1. Account / Growth Owner"
                  sublabel="(Doanh số & Đối tác Brand/Sàn)"
                  badgeColorClass="text-blue-600"
                  placeholder="Gõ tên tìm kiếm Account / Growth Owner..."
                  value={assignFormState.accountOwnerName}
                  departmentHint="ACCOUNT"
                  onChange={(name) => setAssignFormState(prev => ({ ...prev, accountOwnerName: name }))}
                />
              </div>

              {/* 2. B2C Ops PIC(s) - Supports Multi-selection for 2+ staff */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-800 font-semibold block">
                    2. B2C Ops PIC(s) <span className="text-purple-700 font-normal">(Vận hành Booking KOC &amp; Content)</span>:
                  </label>
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                    {assignFormState.b2cOwners.length} nhân sự được chọn
                  </span>
                </div>

                {/* Helper notice */}
                <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-800 mb-2 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Hỗ trợ phân công đồng phụ trách:</strong> Bạn có thể tích chọn <strong>2 hoặc nhiều nhân sự</strong> cùng vận hành gian hàng này (ví dụ: 1 bạn phụ trách Macro KOC, 1 bạn phụ trách Affiliate Seeding).
                  </span>
                </div>

                {/* Search filter for B2C PICs */}
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={b2cStaffSearch}
                    onChange={(e) => setB2cStaffSearch(e.target.value)}
                    placeholder="Gõ tên nhân sự Booking / Content để tìm nhanh..."
                    className="w-full pl-8 pr-7 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white"
                  />
                  {b2cStaffSearch && (
                    <button
                      type="button"
                      onClick={() => setB2cStaffSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Staff Checkbox List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1.5 border border-slate-200 rounded-xl bg-slate-50">
                  {STAFF_MASTER_DIRECTORY.filter(s => {
                    if (s.role !== 'BOOKING' && s.role !== 'CONTENT') return false;
                    if (!b2cStaffSearch.trim()) return true;
                    const q = b2cStaffSearch.toLowerCase().trim();
                    return s.name.toLowerCase().includes(q) || (s.roleTitle || '').toLowerCase().includes(q) || (s.team || '').toLowerCase().includes(q);
                  }).map((s) => {
                    const isSelected = assignFormState.b2cOwners.includes(s.name);
                    const currentStoreCount = storePortfolios.filter(st => isStoreAssignedToUser(st, s.name)).length;
                    return (
                      <div
                        key={s.id}
                        onClick={() => handleToggleB2cOwner(s.name)}
                        className={`p-2.5 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                          isSelected 
                            ? 'bg-blue-50/80 border-blue-400 shadow-2xs' 
                            : 'bg-white border-slate-200 hover:bg-slate-100/70'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // Handled by parent div onClick
                            className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                          />
                          <div className="truncate">
                            <div className="font-semibold text-slate-900 text-xs truncate">{s.name}</div>
                            <div className="text-2xs text-slate-500 truncate">{s.roleTitle}</div>
                          </div>
                        </div>
                        <span className="text-2xs text-slate-500 font-mono shrink-0 pl-1">
                          {currentStoreCount}/{s.maxStoresCapacity} shop
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Assignment Notes */}
              <div>
                <label className="text-slate-800 font-semibold block mb-1">
                  3. Ghi chú phân Chia trách nhiệm <span className="text-slate-500 font-normal">(Phân định vai trò)</span>:
                </label>
                <textarea
                  rows={2}
                  value={assignFormState.assignmentNotes}
                  onChange={(e) => setAssignFormState(prev => ({ ...prev, assignmentNotes: e.target.value }))}
                  placeholder="Ví dụ: Khánh Vy phụ trách KOC Tier 1 & 2; Trần Minh Đức phụ trách KOC Tier 3 & Seeding Affiliate..."
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-xs"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAssigningStore(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-semibold transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Lưu Phân Công &amp; Cập Nhật Quyền</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

