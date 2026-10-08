'use client';

import React, { useState } from 'react';
import { 
  Search, 
  ExternalLink, 
  Plus, 
  X, 
  CheckCircle2,
  Shield,
  Tag
} from 'lucide-react';
import { UserProfile, BrandDetail, StorePortfolioItem, KocItem } from '../../lib/types';
import { INITIAL_BRANDS, INITIAL_STORE_PORTFOLIOS, USERS, INITIAL_KOCS, INITIAL_PUSH_PRODUCTS } from '../../lib/mockData';
import { KocMasterDataView } from './KocMasterDataView';

export type MasterDataSubTab = 'brands' | 'stores' | 'products' | 'kocs' | 'staff';

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

  // Brand state
  const [brandList, setBrandList] = useState<BrandDetail[]>(brands);
  const [brandSearch, setBrandSearch] = useState('');
  const [selectedBrandCategory, setSelectedBrandCategory] = useState('ALL');
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandDetail | null>(null);
  const [brandForm, setBrandForm] = useState({
    name: '',
    companyName: '',
    category: 'Mẹ & Bé',
    contactPerson: '',
    status: 'ACTIVE' as 'ACTIVE' | 'PAUSED' | 'UPCOMING'
  });

  // Store state
  const [storeList, setStoreList] = useState<StorePortfolioItem[]>(INITIAL_STORE_PORTFOLIOS);
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
  const [staffSearch, setStaffSearch] = useState('');
  const [selectedStaffRole, setSelectedStaffRole] = useState('ALL');

  // Filtered Brands
  const filteredBrands = brandList.filter(b => {
    if (selectedBrandCategory !== 'ALL' && b.category !== selectedBrandCategory) return false;
    if (brandSearch.trim()) {
      const q = brandSearch.toLowerCase();
      return b.name.toLowerCase().includes(q) || b.companyName.toLowerCase().includes(q);
    }
    return true;
  });

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

  // Filtered Master Products
  const filteredProducts = productList.filter(p => {
    if (selectedProductBrand !== 'ALL' && p.brandName !== selectedProductBrand) return false;
    if (selectedProductPlatform !== 'ALL' && p.platform !== selectedProductPlatform) return false;
    if (productSearch.trim()) {
      const q = productSearch.toLowerCase();
      return p.productName.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.brandName.toLowerCase().includes(q);
    }
    return true;
  });

  // Filtered Staff
  const filteredStaff = USERS.filter(u => {
    if (selectedStaffRole !== 'ALL' && u.role !== selectedStaffRole) return false;
    if (staffSearch.trim()) {
      const q = staffSearch.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.roleTitle.toLowerCase().includes(q);
    }
    return true;
  });

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

  return (
    <div className="space-y-5">
      {/* Sub-Tabs Navigation */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 pt-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <h1 className="text-base font-bold text-slate-900">Dữ liệu gốc</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Quản lý các danh mục nền tảng: Thương hiệu, Gian hàng, Sản phẩm, KOC và Nhân sự
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
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Thương hiệu</span>
            <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
              {brandList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('stores')}
            className={`py-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'stores'
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Gian hàng</span>
            <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
              {storeList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('products')}
            className={`py-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'products'
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Sản phẩm</span>
            <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
              {productList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('kocs')}
            className={`py-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'kocs'
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Danh bạ KOC</span>
            <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
              {kocs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('staff')}
            className={`py-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'staff'
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Nhân sự</span>
            <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
              {USERS.length}
            </span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: THƯƠNG HIỆU */}
      {activeSubTab === 'brands' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm thương hiệu, công ty chủ quản..."
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
              <select
                value={selectedBrandCategory}
                onChange={(e) => setSelectedBrandCategory(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none"
              >
                <option value="ALL">Mọi ngành hàng</option>
                <option value="Mẹ & Bé">Mẹ & Bé</option>
                <option value="Chăm Sóc Da">Chăm Sóc Da</option>
                <option value="Sữa Công Thức">Sữa Công Thức</option>
                <option value="Chăm Sóc Cá Nhân">Chăm Sóc Cá Nhân</option>
              </select>
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
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm thương hiệu
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-[11px]">
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
                {filteredBrands.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{b.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{b.code || b.id}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{b.companyName || b.name}</td>
                    <td className="py-3 px-4 text-slate-600">{b.category}</td>
                    <td className="py-3 px-4 text-center font-mono font-semibold text-slate-800">
                      {b.stores?.length || 0}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {b.accountPic || b.brandPicName || 'Chưa phân công'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        b.status === 'ACTIVE' 
                          ? 'bg-slate-100 text-slate-800' 
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {b.status === 'ACTIVE' ? 'Đang hợp tác' : b.status === 'UPCOMING' ? 'Sắp triển khai' : 'Tạm dừng'}
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
          </div>
        </div>
      )}

      {/* SUB-TAB 2: GIAN HÀNG */}
      {activeSubTab === 'stores' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-lg">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm gian hàng, thương hiệu..."
                  value={storeSearch}
                  onChange={(e) => setStoreSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <select
                value={selectedStorePlatform}
                onChange={(e) => setSelectedStorePlatform(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none shrink-0"
              >
                <option value="ALL">Mọi nền tảng</option>
                <option value="TikTok Shop">TikTok Shop</option>
                <option value="Shopee Mall">Shopee Mall</option>
                <option value="Lazada">Lazada</option>
              </select>

              <select
                value={selectedStoreBrand}
                onChange={(e) => setSelectedStoreBrand(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none shrink-0"
              >
                <option value="ALL">Mọi nhãn hàng</option>
                {brandList.map(b => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setStoreForm({
                  storeName: '',
                  brandName: brandList[0]?.name || 'Kutieskin',
                  platform: 'TikTok Shop',
                  storeUrl: '',
                  accountOwnerName: 'Hoàng Long'
                });
                setIsStoreModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm gian hàng
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Tên gian hàng</th>
                  <th className="py-3 px-4">Nền tảng</th>
                  <th className="py-3 px-4">Thương hiệu</th>
                  <th className="py-3 px-4">Phụ trách (PIC)</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Liên kết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStores.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {s.storeName}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        s.platform === 'TikTok Shop' 
                          ? 'bg-slate-900 text-white' 
                          : s.platform === 'Shopee Mall' 
                          ? 'bg-orange-100 text-orange-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {s.platform}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{s.brandName}</td>
                    <td className="py-3 px-4 text-slate-600">{s.accountOwnerName}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Đang hoạt động
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {s.storeUrl ? (
                        <a
                          href={s.storeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 text-xs"
                        >
                          <span>Mở sàn</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">Chưa có link</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: SẢN PHẨM (Master Product Catalog) */}
      {activeSubTab === 'products' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-lg">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm theo SKU, tên sản phẩm, thương hiệu..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <select
                value={selectedProductPlatform}
                onChange={(e) => setSelectedProductPlatform(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none shrink-0"
              >
                <option value="ALL">Mọi nền tảng</option>
                <option value="TikTok Shop">TikTok Shop</option>
                <option value="Shopee Mall">Shopee Mall</option>
                <option value="Lazada">Lazada</option>
              </select>

              <select
                value={selectedProductBrand}
                onChange={(e) => setSelectedProductBrand(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none shrink-0"
              >
                <option value="ALL">Mọi nhãn hàng</option>
                {brandList.map(b => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </select>
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
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm sản phẩm
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Mã SKU & Tên sản phẩm</th>
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
                      <div className="font-mono font-bold text-slate-800">{p.sku}</div>
                      <div className="text-slate-900 font-medium line-clamp-1">{p.productName}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{p.brandName}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.2 rounded text-[10px] font-medium ${
                          p.platform === 'TikTok Shop' 
                            ? 'bg-slate-900 text-white' 
                            : p.platform === 'Shopee Mall' 
                            ? 'bg-orange-100 text-orange-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {p.platform}
                        </span>
                        <span className="text-[11px] text-slate-600 truncate max-w-[140px]">{p.storeName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{p.category}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                      {formatVnd(p.originalPrice)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
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

      {/* SUB-TAB 4: DANH BẠ KOC */}
      {activeSubTab === 'kocs' && (
        <KocMasterDataView
          kocs={kocs}
          currentUser={currentUser}
          onOpenQuickBookWithKoc={onOpenQuickBookWithKoc || (() => {})}
          onKocCreated={onKocCreated}
          onKocUpdated={onKocUpdated}
        />
      )}

      {/* SUB-TAB 5: NHÂN SỰ */}
      {activeSubTab === 'staff' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm nhân sự theo tên, email, vị trí..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <select
                value={selectedStaffRole}
                onChange={(e) => setSelectedStaffRole(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none shrink-0"
              >
                <option value="ALL">Mọi vai trò</option>
                <option value="MANAGER">Trưởng phòng (Manager)</option>
                <option value="BRAND_MEMBER">Quản lý nhãn (Brand Lead)</option>
                <option value="BOOKING_MEMBER">Chuyên viên Booking</option>
                <option value="CONTENT_MEMBER">Chuyên viên Nội dung</option>
              </select>
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span>Đồng bộ qua Lark SSO</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Nhân sự</th>
                  <th className="py-3 px-4">Email công ty</th>
                  <th className="py-3 px-4">Vai trò hệ thống</th>
                  <th className="py-3 px-4">Chức danh</th>
                  <th className="py-3 px-4 text-center">Xác thực</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200">
                          {u.avatar}
                        </div>
                        <span className="font-semibold text-slate-900">{u.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {u.role === 'MANAGER' ? 'Quản trị' : u.role === 'BRAND_MEMBER' ? 'Nhãn hàng' : u.role === 'CONTENT_MEMBER' ? 'Nội dung' : 'Booking'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{u.roleTitle}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Lark SSO
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: THÊM / SỬA THƯƠNG HIỆU */}
      {isBrandModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">
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
                  placeholder="Ví dụ: Công ty Cổ phần Dược Mỹ phẩm CVI"
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
              <h3 className="font-bold text-sm text-slate-900">Thêm gian hàng mới</h3>
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
              <h3 className="font-bold text-sm text-slate-900">
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
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-slate-400 uppercase"
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
                  placeholder="Ví dụ: Kem Bôi Dịu Da Kutieskin 30g"
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
    </div>
  );
};
