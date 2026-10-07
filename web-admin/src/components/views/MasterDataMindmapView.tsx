'use client';

import React, { useState, useMemo } from 'react';
import {
  GitFork,
  Building2,
  Store,
  Users,
  Package,
  ChevronRight,
  ChevronDown,
  Crown,
  Search,
  Maximize2,
  Minimize2,
  RotateCcw,
  Plus,
  SlidersHorizontal,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Tag,
  DollarSign,
  TrendingUp,
  Layers,
  Sparkles,
  Edit3,
  X,
  UserCheck,
  UserPlus,
  Info,
  BadgeAlert,
  ArrowRight,
  Filter,
  Eye,
  ShoppingBag
} from 'lucide-react';
import { UserProfile, BrandDetail, EcomStore, HeroProduct, StaffMasterMember } from '../../lib/types';
import { INITIAL_BRANDS, STAFF_MASTER_DIRECTORY } from '../../lib/mockData';

// Extended type for Store with explicit Store-specific Product IDs and PIC hierarchy
export interface StoreProductSkuMap {
  masterProductId: string;
  masterSku: string;
  productName: string;
  platformProductId: string; // ID thật trên sàn (TTS-xxx, SP-xxx)
  platformUrl: string;
  storePrice: number;
  commissionRate: number;
  isHeroSku: boolean;
}

export interface MindmapStoreNode {
  id: string;
  brandId: string;
  brandName: string;
  storeName: string;
  platform: 'TIKTOK_SHOP' | 'SHOPEE_MALL' | 'LAZADA';
  storeId: string;
  storeUrl: string;
  status: 'ACTIVE' | 'PAUSED';
  monthlyTargetGmv: number;
  monthlyBudget: number;
  // Nhân sự: 1 PIC chính chịu trách nhiệm toàn diện + các PIC thành viên
  primaryPic: string; // 👑 1 PIC Chính
  memberPics: string[]; // Danh sách các PIC hỗ trợ
  assignmentNotes?: string;
  // Sản phẩm phân bổ trên gian này
  storeProducts: StoreProductSkuMap[];
}

interface MasterDataMindmapViewProps {
  currentUser: UserProfile;
  onOpenQuickBookWithBrand?: (brandName: string) => void;
  onNotify?: (msg: string) => void;
}

export const MasterDataMindmapView: React.FC<MasterDataMindmapViewProps> = ({
  currentUser,
  onOpenQuickBookWithBrand,
  onNotify
}) => {
  // Master Brands list
  const [brands, setBrands] = useState<BrandDetail[]>(INITIAL_BRANDS);

  // Initialize Store nodes with 1 Primary PIC + Sub-PICs + Store-specific Product IDs
  const [stores, setStores] = useState<MindmapStoreNode[]>([
    // Brand 1: Kutieskin
    {
      id: 'store-kuti-tts',
      brandId: 'brand-kutieskin',
      brandName: 'Kutieskin Mama & Baby',
      storeName: 'Kutieskin Official Store',
      platform: 'TIKTOK_SHOP',
      storeId: 'TTS_VN_83921',
      storeUrl: 'https://shop.tiktok.com/view/product/kutieskin-official',
      status: 'ACTIVE',
      monthlyTargetGmv: 450000000,
      monthlyBudget: 150000000,
      primaryPic: 'Khánh Vy', // 👑 PIC Chính
      memberPics: ['Trần Minh Đức', 'Lê Hoàng Yến'],
      assignmentNotes: 'Khánh Vy chủ trì phân rã plan và chốt ngân sách. Đức phụ trách KOC Affiliate, Yến phụ trách Livestream.',
      storeProducts: [
        {
          masterProductId: 'prod-kuti-1',
          masterSku: 'KUTIE-SOOTH-30G',
          productName: 'Kem Bôi Dịu Da Kutieskin 30g',
          platformProductId: 'TTS-83921-KUTI01',
          platformUrl: 'https://shop.tiktok.com/view/product/172938472910',
          storePrice: 96000,
          commissionRate: 15,
          isHeroSku: true
        },
        {
          masterProductId: 'prod-kuti-2',
          masterSku: 'KUTIE-BATH-250ML',
          productName: 'Nước Tắm Gội Thảo Dược Kutieskin 250ml',
          platformProductId: 'TTS-83921-KUTI02',
          platformUrl: 'https://shop.tiktok.com/view/product/172938472911',
          storePrice: 135000,
          commissionRate: 15,
          isHeroSku: false
        },
        {
          masterProductId: 'prod-kuti-3',
          masterSku: 'KUTIE-CREAM-50G',
          productName: 'Kem Dưỡng Ẩm Kutieskin Sơ Sinh 50g',
          platformProductId: 'TTS-83921-KUTI03',
          platformUrl: 'https://shop.tiktok.com/view/product/172938472912',
          storePrice: 115000,
          commissionRate: 16,
          isHeroSku: true
        }
      ]
    },
    {
      id: 'store-kuti-sp',
      brandId: 'brand-kutieskin',
      brandName: 'Kutieskin Mama & Baby',
      storeName: 'Shopee Mall Kutieskin Chính Hãng',
      platform: 'SHOPEE_MALL',
      storeId: 'SP_MALL_19284',
      storeUrl: 'https://shopee.vn/kutieskin_official',
      status: 'ACTIVE',
      monthlyTargetGmv: 400000000,
      monthlyBudget: 130000000,
      primaryPic: 'Trần Minh Đức', // 👑 PIC Chính
      memberPics: ['Khánh Vy'],
      assignmentNotes: 'Trần Minh Đức làm PIC chính điều phối Shopee Mall, tối ưu voucher sàn và hoa hồng affiliate Shopee.',
      storeProducts: [
        {
          masterProductId: 'prod-kuti-1',
          masterSku: 'KUTIE-SOOTH-30G',
          productName: 'Kem Bôi Dịu Da Kutieskin 30g',
          platformProductId: 'SP-19284-ITEM998', // Cùng sản phẩm nhưng ID Shopee khác TikTok!
          platformUrl: 'https://shopee.vn/product/19284/998124',
          storePrice: 99000,
          commissionRate: 12,
          isHeroSku: true
        },
        {
          masterProductId: 'prod-kuti-3',
          masterSku: 'KUTIE-CREAM-50G',
          productName: 'Kem Dưỡng Ẩm Kutieskin Sơ Sinh 50g',
          platformProductId: 'SP-19284-ITEM999',
          platformUrl: 'https://shopee.vn/product/19284/999125',
          storePrice: 118000,
          commissionRate: 14,
          isHeroSku: true
        }
      ]
    },

    // Brand 2: Face Republic
    {
      id: 'store-fr-tts',
      brandId: 'brand-facerepublic',
      brandName: 'Face Republic Korea',
      storeName: 'Face Republic Official Shop',
      platform: 'TIKTOK_SHOP',
      storeId: 'TTS_VN_55102',
      storeUrl: 'https://shop.tiktok.com/view/product/facerepublic-vn',
      status: 'ACTIVE',
      monthlyTargetGmv: 620000000,
      monthlyBudget: 210000000,
      primaryPic: 'Đặng Mai Hà Linh', // 👑 PIC Chính
      memberPics: ['Nguyễn Thu Trang', 'Phan Diệu Ánh'],
      assignmentNotes: 'Hà Linh phụ trách kế hoạch tổng. Trang đẩy KOC Review Dược mỹ phẩm, Ánh phụ trách live định kỳ.',
      storeProducts: [
        {
          masterProductId: 'prod-fr-1',
          masterSku: 'FR-SUN-PURITY-50ML',
          productName: 'Kem Chống Nắng Thuần Chay Face Republic 50ml',
          platformProductId: 'TTS-55102-SUN01',
          platformUrl: 'https://shop.tiktok.com/view/product/284910293',
          storePrice: 289000,
          commissionRate: 18,
          isHeroSku: true
        },
        {
          masterProductId: 'prod-fr-2',
          masterSku: 'FR-CLEANSER-160ML',
          productName: 'Sữa Rửa Mặt Dịu Nhẹ Cica pH 5.5 160ml',
          platformProductId: 'TTS-55102-CLN02',
          platformUrl: 'https://shop.tiktok.com/view/product/284910294',
          storePrice: 215000,
          commissionRate: 15,
          isHeroSku: false
        }
      ]
    },
    {
      id: 'store-fr-sp',
      brandId: 'brand-facerepublic',
      brandName: 'Face Republic Korea',
      storeName: 'Face Republic Shopee Mall',
      platform: 'SHOPEE_MALL',
      storeId: 'SP_MALL_33419',
      storeUrl: 'https://shopee.vn/facerepublic_official',
      status: 'ACTIVE',
      monthlyTargetGmv: 350000000,
      monthlyBudget: 90000000,
      primaryPic: 'Nguyễn Thu Trang', // 👑 PIC Chính
      memberPics: ['Đặng Mai Hà Linh'],
      assignmentNotes: 'Nguyễn Thu Trang làm PIC chính gian Shopee, tập trung flash sale và affiliate network.',
      storeProducts: [
        {
          masterProductId: 'prod-fr-1',
          masterSku: 'FR-SUN-PURITY-50ML',
          productName: 'Kem Chống Nắng Thuần Chay Face Republic 50ml',
          platformProductId: 'SP-33419-ITEM772',
          platformUrl: 'https://shopee.vn/product/33419/772189',
          storePrice: 295000,
          commissionRate: 14,
          isHeroSku: true
        }
      ]
    },

    // Brand 3: Clio Cosmetics
    {
      id: 'store-clio-tts',
      brandId: 'brand-clio',
      brandName: 'Clio Cosmetics Vietnam',
      storeName: 'Clio Vietnam Official TikTok Shop',
      platform: 'TIKTOK_SHOP',
      storeId: 'TTS_VN_99214',
      storeUrl: 'https://shop.tiktok.com/view/product/clio-vietnam',
      status: 'ACTIVE',
      monthlyTargetGmv: 950000000,
      monthlyBudget: 320000000,
      primaryPic: 'Phạm Thị Thu Hằng', // 👑 PIC Chính
      memberPics: ['Khánh Vy', 'Trần Minh Đức'],
      assignmentNotes: 'Thu Hằng chịu trách nhiệm chính số Clio TTS. Phối hợp Vy book KOC make-up Beauty Guru.',
      storeProducts: [
        {
          masterProductId: 'prod-clio-1',
          masterSku: 'CLIO-CUSH-KILL-15G',
          productName: 'Phấn Nước Clio Kill Cover The New Founwear Cushion',
          platformProductId: 'TTS-99214-CUSH01',
          platformUrl: 'https://shop.tiktok.com/view/product/592817291',
          storePrice: 420000,
          commissionRate: 20,
          isHeroSku: true
        },
        {
          masterProductId: 'prod-clio-2',
          masterSku: 'CLIO-LIP-TINT-04',
          productName: 'Son Kem Lì Clio Chiffon Blur Tint #04',
          platformProductId: 'TTS-99214-LIP02',
          platformUrl: 'https://shop.tiktok.com/view/product/592817292',
          storePrice: 290000,
          commissionRate: 18,
          isHeroSku: true
        }
      ]
    }
  ]);

  // UI Interactive States for Mindmap
  // Set of expanded node IDs: 'root', 'brand-xxx', 'store-xxx', 'store-xxx-staff', 'store-xxx-products', etc.
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set(['root', 'brand-kutieskin', 'store-kuti-tts', 'store-kuti-tts-staff', 'store-kuti-tts-products', 'brand-facerepublic', 'store-fr-tts'])
  );

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<'ALL' | 'TIKTOK_SHOP' | 'SHOPEE_MALL' | 'LAZADA'>('ALL');
  const [filterBrandId, setFilterBrandId] = useState<string>('ALL');
  const [filterPic, setFilterPic] = useState<string>('ALL');
  const [showStaffBranches, setShowStaffBranches] = useState<boolean>(true);
  const [showProductBranches, setShowProductBranches] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Inspector / Detail Drawer State
  const [selectedNode, setSelectedNode] = useState<{
    type: 'ROOT' | 'BRAND' | 'STORE' | 'STAFF' | 'PRODUCT';
    data: any;
  } | null>({
    type: 'STORE',
    data: stores[0]
  });

  // Edit / Assignment Modal State inside Inspector
  const [isEditingStorePic, setIsEditingStorePic] = useState(false);
  const [editingStoreForm, setEditingStoreForm] = useState<{
    storeId: string;
    primaryPic: string;
    memberPics: string[];
    assignmentNotes: string;
  } | null>(null);

  // Helper: Toggle expand/collapse
  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const all = new Set<string>(['root']);
    brands.forEach(b => {
      all.add(b.id);
      stores.filter(s => s.brandId === b.id).forEach(s => {
        all.add(s.id);
        all.add(`${s.id}-staff`);
        all.add(`${s.id}-products`);
      });
    });
    setExpandedNodes(all);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set(['root']));
  };

  // Filtered stores
  const filteredStores = useMemo(() => {
    return stores.filter(s => {
      if (filterPlatform !== 'ALL' && s.platform !== filterPlatform) return false;
      if (filterBrandId !== 'ALL' && s.brandId !== filterBrandId) return false;
      if (filterPic !== 'ALL') {
        const matchesPic = s.primaryPic === filterPic || s.memberPics.includes(filterPic);
        if (!matchesPic) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inBrand = s.brandName.toLowerCase().includes(q);
        const inStore = s.storeName.toLowerCase().includes(q) || s.storeId.toLowerCase().includes(q);
        const inPic = s.primaryPic.toLowerCase().includes(q) || s.memberPics.some(m => m.toLowerCase().includes(q));
        const inProduct = s.storeProducts.some(p => 
          p.productName.toLowerCase().includes(q) || 
          p.masterSku.toLowerCase().includes(q) || 
          p.platformProductId.toLowerCase().includes(q)
        );
        return inBrand || inStore || inPic || inProduct;
      }
      return true;
    });
  }, [stores, filterPlatform, filterBrandId, filterPic, searchQuery]);

  // Unique PIC options
  const allPicOptions = useMemo(() => {
    const set = new Set<string>();
    stores.forEach(s => {
      set.add(s.primaryPic);
      s.memberPics.forEach(p => set.add(p));
    });
    STAFF_MASTER_DIRECTORY.forEach(staff => set.add(staff.name));
    return Array.from(set);
  }, [stores]);

  // Handle Save PIC Assignment
  const handleSaveStoreAssignment = () => {
    if (!editingStoreForm) return;
    setStores(prev => prev.map(s => {
      if (s.id === editingStoreForm.storeId) {
        return {
          ...s,
          primaryPic: editingStoreForm.primaryPic,
          memberPics: editingStoreForm.memberPics,
          assignmentNotes: editingStoreForm.assignmentNotes
        };
      }
      return s;
    }));

    if (selectedNode?.type === 'STORE' && selectedNode.data.id === editingStoreForm.storeId) {
      setSelectedNode({
        type: 'STORE',
        data: {
          ...selectedNode.data,
          primaryPic: editingStoreForm.primaryPic,
          memberPics: editingStoreForm.memberPics,
          assignmentNotes: editingStoreForm.assignmentNotes
        }
      });
    }

    setIsEditingStorePic(false);
    const msg = `👑 Đã cập nhật PIC Chính [${editingStoreForm.primaryPic}] cho gian hàng!`;
    if (onNotify) onNotify(msg);
  };

  // Helper for platform visual badge
  const renderPlatformBadge = (platform: 'TIKTOK_SHOP' | 'SHOPEE_MALL' | 'LAZADA') => {
    switch (platform) {
      case 'TIKTOK_SHOP':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-black text-cyan-300 border border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            TikTok Shop
          </span>
        );
      case 'SHOPEE_MALL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <ShoppingBag className="w-2.5 h-2.5 text-amber-400" />
            Shopee Mall
          </span>
        );
      case 'LAZADA':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            Lazada
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Context Description */}
      <div className="bg-[#0b1120] border border-[#1e293b] rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-600/10 via-purple-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                <GitFork className="w-3.5 h-3.5" />
                MINDMAP MASTER DATA 4 CHIỀU
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Brand ➔ Gian Hàng ➔ PIC Chính ➔ Store SKUs
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
              Sơ Đồ Phân Cấp & Dữ Liệu Gốc Master Data
            </h2>
            <p className="text-xs text-slate-400 max-w-3xl mt-1 leading-relaxed">
              Trực quan hóa cấu trúc thực tế: <strong>Brand</strong> là cấp cao nhất, rẽ nhánh sang các <strong>Gian hàng</strong> sàn. Mỗi gian hàng có đúng <strong>1 PIC chính</strong> chủ trì và tự phân bổ xuống các nhân sự thành viên, cùng danh mục <strong>Store Product ID</strong> tương ứng từng sàn.
            </p>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="px-3 py-2 bg-[#162036] border border-[#1e293b] rounded-xl flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-blue-400" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Thương Hiệu</div>
                <div className="text-sm font-black text-white">{brands.length} Brands</div>
              </div>
            </div>
            <div className="px-3 py-2 bg-[#162036] border border-[#1e293b] rounded-xl flex items-center gap-2.5">
              <Store className="w-4 h-4 text-purple-400" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Gian Hàng Sàn</div>
                <div className="text-sm font-black text-white">{stores.length} Shops</div>
              </div>
            </div>
            <div className="px-3 py-2 bg-[#162036] border border-[#1e293b] rounded-xl flex items-center gap-2.5">
              <Crown className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">PIC Chính Lead</div>
                <div className="text-sm font-black text-amber-300">
                  {new Set(stores.map(s => s.primaryPic)).size} Lead PICs
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="mt-4 pt-4 border-t border-[#1e293b] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            {/* Search Input */}
            <div className="relative min-w-[220px] flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm Brand, Gian hàng, PIC chính, SKU..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#0f172a] border border-[#1e293b] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filter Platform */}
            <select
              value={filterPlatform}
              onChange={e => setFilterPlatform(e.target.value as any)}
              className="bg-[#0f172a] border border-[#1e293b] text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 text-xs"
            >
              <option value="ALL">🌐 Tất Cả Sàn</option>
              <option value="TIKTOK_SHOP">TikTok Shop</option>
              <option value="SHOPEE_MALL">Shopee Mall</option>
              <option value="LAZADA">Lazada</option>
            </select>

            {/* Filter Brand */}
            <select
              value={filterBrandId}
              onChange={e => setFilterBrandId(e.target.value)}
              className="bg-[#0f172a] border border-[#1e293b] text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 text-xs"
            >
              <option value="ALL">🏢 Tất Cả Brand</option>
              {brands.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            {/* Filter PIC */}
            <select
              value={filterPic}
              onChange={e => setFilterPic(e.target.value)}
              className="bg-[#0f172a] border border-[#1e293b] text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 text-xs"
            >
              <option value="ALL">👤 Tất Cả PIC</option>
              {allPicOptions.map(pic => (
                <option key={pic} value={pic}>PIC: {pic}</option>
              ))}
            </select>
          </div>

          {/* View & Expand Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Toggle Branches */}
            <button
              onClick={() => setShowStaffBranches(prev => !prev)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
                showStaffBranches
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  : 'bg-[#0f172a] border-[#1e293b] text-slate-400 hover:text-white'
              }`}
              title="Bật/Tắt hiển thị nhánh Nhân Sự & PIC"
            >
              <Crown className="w-3 h-3" />
              <span>Nhân Sự</span>
            </button>

            <button
              onClick={() => setShowProductBranches(prev => !prev)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
                showProductBranches
                  ? 'bg-blue-500/10 border-blue-500/40 text-blue-300'
                  : 'bg-[#0f172a] border-[#1e293b] text-slate-400 hover:text-white'
              }`}
              title="Bật/Tắt hiển thị nhánh Sản Phẩm & Store SKUs"
            >
              <Package className="w-3 h-3" />
              <span>Sản Phẩm</span>
            </button>

            <div className="h-4 w-px bg-slate-700 mx-1" />

            <button
              onClick={expandAll}
              className="px-2.5 py-1.5 bg-[#0f172a] hover:bg-[#1e293b] border border-[#1e293b] rounded-lg text-slate-300 hover:text-white font-medium transition"
              title="Mở rộng tất cả các nhánh"
            >
              Xổ Hết
            </button>
            <button
              onClick={collapseAll}
              className="px-2.5 py-1.5 bg-[#0f172a] hover:bg-[#1e293b] border border-[#1e293b] rounded-lg text-slate-300 hover:text-white font-medium transition"
              title="Thu gọn về gốc"
            >
              Thu Lại
            </button>

            {/* Zoom Controls */}
            <div className="flex items-center bg-[#0f172a] border border-[#1e293b] rounded-lg px-2 py-1 text-slate-300">
              <button
                onClick={() => setZoomLevel(prev => Math.max(75, prev - 10))}
                className="px-1 hover:text-white font-bold"
                title="Thu nhỏ"
              >
                -
              </button>
              <span className="text-[10px] px-1 font-mono">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel(prev => Math.min(130, prev + 10))}
                className="px-1 hover:text-white font-bold"
                title="Phóng to"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Mindmap Canvas (Left/Center) + Node Inspector Drawer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Mindmap Interactive Tree Canvas */}
        <div className="lg:col-span-8 bg-[#070b14] border border-[#1e293b] rounded-2xl p-4 sm:p-6 shadow-inner overflow-x-auto min-h-[620px] relative">
          {/* Subtle Grid Background */}
          <div 
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }}
          />

          <div 
            className="transition-transform duration-200 origin-top-left"
            style={{ transform: `scale(${zoomLevel / 100})` }}
          >
            {/* ROOT NODE: B2C Master Catalog */}
            <div className="flex items-start gap-8">
              <div className="relative shrink-0">
                <div
                  onClick={() => {
                    toggleNode('root');
                    setSelectedNode({ type: 'ROOT', data: { brandsCount: brands.length, storesCount: stores.length } });
                  }}
                  className={`w-64 p-4 rounded-2xl cursor-pointer transition-all border shadow-xl ${
                    expandedNodes.has('root')
                      ? 'bg-gradient-to-br from-blue-900/60 to-purple-950/80 border-blue-500/50 shadow-blue-500/10'
                      : 'bg-[#0f172a] border-slate-700/60 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      MASTER ROOT
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-white mt-3">Hệ Thống Master Data B2C</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Quản trị tập trung {brands.length} Brands & {stores.length} Gian Hàng
                  </p>
                  
                  <div className="mt-3 pt-2.5 border-t border-slate-700/50 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Store className="w-3 h-3 text-purple-400" /> {stores.length} Shops
                    </span>
                    <button className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-0.5">
                      {expandedNodes.has('root') ? (
                        <><span>Thu gọn</span> <ChevronDown className="w-3.5 h-3.5" /></>
                      ) : (
                        <><span>Xổ ra</span> <ChevronRight className="w-3.5 h-3.5" /></>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* LEVEL 1: BRAND NODES */}
              {expandedNodes.has('root') && (
                <div className="space-y-6 relative border-l-2 border-slate-800/80 pl-8">
                  {brands.map(brand => {
                    const isBrandExpanded = expandedNodes.has(brand.id);
                    const brandStores = filteredStores.filter(s => s.brandId === brand.id);
                    const hasStores = brandStores.length > 0;

                    // If filters are active and brand has no matching store, skip
                    if (filterBrandId !== 'ALL' && brand.id !== filterBrandId) return null;
                    if (filteredStores.length > 0 && !hasStores && (searchQuery || filterPlatform !== 'ALL' || filterPic !== 'ALL')) {
                      return null;
                    }

                    return (
                      <div key={brand.id} className="relative">
                        {/* Connecting branch curve indicator */}
                        <div className="absolute -left-8 top-6 w-8 h-0.5 bg-slate-800" />

                        <div className="flex items-start gap-8">
                          {/* Brand Node Card */}
                          <div
                            onClick={() => {
                              toggleNode(brand.id);
                              setSelectedNode({ type: 'BRAND', data: brand });
                            }}
                            className={`w-72 p-3.5 rounded-xl cursor-pointer transition-all border shadow-md ${
                              isBrandExpanded
                                ? 'bg-[#101b33] border-blue-500/60 shadow-blue-500/5'
                                : 'bg-[#0f172a] border-slate-800 hover:border-slate-600'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                🏢 BRAND TỔNG
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {brandStores.length} Gian Hàng
                              </span>
                            </div>

                            <div className="mt-2 flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center font-bold text-white text-xs border border-slate-700 shrink-0">
                                {brand.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-black text-white truncate">{brand.name}</h4>
                                <div className="text-[10px] text-slate-400 truncate">{brand.category}</div>
                              </div>
                            </div>

                            <div className="mt-2.5 pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[10px]">
                              <div>
                                <span className="text-slate-500 block">Account PIC:</span>
                                <span className="font-semibold text-slate-300 truncate block">{brand.accountPic || 'Chưa gán'}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block">Target GMV:</span>
                                <span className="font-bold text-emerald-400">{(brand.targetGmv / 1000000).toFixed(0)}M đ</span>
                              </div>
                            </div>

                            <div className="mt-2 flex items-center justify-between text-[10px] pt-1">
                              <span className="text-slate-400">
                                {brand.heroProducts?.length || 0} Hero SKUs
                              </span>
                              <span className="text-blue-400 font-bold flex items-center gap-0.5">
                                {isBrandExpanded ? (
                                  <><span>Đóng gian hàng</span> <ChevronDown className="w-3 h-3" /></>
                                ) : (
                                  <><span>Xổ gian hàng ({brandStores.length})</span> <ChevronRight className="w-3 h-3" /></>
                                )}
                              </span>
                            </div>
                          </div>

                          {/* LEVEL 2: STORE NODES OF THIS BRAND */}
                          {isBrandExpanded && (
                            <div className="space-y-6 relative border-l-2 border-slate-800/80 pl-8">
                              {brandStores.length === 0 ? (
                                <div className="p-3 bg-[#0f172a] border border-dashed border-slate-800 rounded-lg text-slate-400 text-xs italic">
                                  Chưa có gian hàng nào khớp bộ lọc.
                                </div>
                              ) : (
                                brandStores.map(store => {
                                  const isStoreExpanded = expandedNodes.has(store.id);
                                  const isStaffExpanded = expandedNodes.has(`${store.id}-staff`);
                                  const isProductsExpanded = expandedNodes.has(`${store.id}-products`);

                                  return (
                                    <div key={store.id} className="relative">
                                      <div className="absolute -left-8 top-6 w-8 h-0.5 bg-slate-800" />

                                      <div className="flex items-start gap-8">
                                        {/* Store Node Card */}
                                        <div
                                          onClick={() => {
                                            toggleNode(store.id);
                                            setSelectedNode({ type: 'STORE', data: store });
                                          }}
                                          className={`w-72 p-3.5 rounded-xl cursor-pointer transition-all border shadow-sm ${
                                            isStoreExpanded
                                              ? 'bg-[#131d33] border-purple-500/60 shadow-purple-500/5'
                                              : 'bg-[#0f172a] border-slate-800 hover:border-slate-600'
                                          }`}
                                        >
                                          <div className="flex items-center justify-between gap-1">
                                            {renderPlatformBadge(store.platform)}
                                            <span className="text-[10px] font-mono text-slate-400 truncate">
                                              {store.storeId}
                                            </span>
                                          </div>

                                          <div className="mt-2">
                                            <h5 className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                                              <Store className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                              <span className="truncate">{store.storeName}</span>
                                            </h5>
                                          </div>

                                          {/* Key Highlight: 1 PIC Chính */}
                                          <div className="mt-2.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                                            <div className="flex items-center justify-between text-[10px]">
                                              <span className="text-amber-400 font-bold flex items-center gap-1">
                                                <Crown className="w-3 h-3 text-amber-400" />
                                                1 PIC CHÍNH (Lead):
                                              </span>
                                              <span className="text-white font-extrabold truncate">
                                                {store.primaryPic}
                                              </span>
                                            </div>
                                            <div className="text-[9px] text-amber-300/80 mt-0.5">
                                              Chủ trì lập kế hoạch & phân bổ ngân sách
                                            </div>
                                          </div>

                                          <div className="mt-2 pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-1.5 text-[10px]">
                                            <div>
                                              <span className="text-slate-500 block">Ngân Sách:</span>
                                              <span className="font-semibold text-white">{(store.monthlyBudget / 1000000).toFixed(0)}M đ</span>
                                            </div>
                                            <div>
                                              <span className="text-slate-500 block">Target GMV:</span>
                                              <span className="font-bold text-emerald-400">{(store.monthlyTargetGmv / 1000000).toFixed(0)}M đ</span>
                                            </div>
                                          </div>

                                          {/* Sub-branch action toggles */}
                                          <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                                            <span className="text-slate-400">
                                              {store.memberPics.length} PIC phụ • {store.storeProducts.length} SKUs
                                            </span>
                                            <span className="text-purple-400 font-bold flex items-center gap-0.5">
                                              {isStoreExpanded ? (
                                                <><span>Thu nhánh</span> <ChevronDown className="w-3 h-3" /></>
                                              ) : (
                                                <><span>Mở chi tiết</span> <ChevronRight className="w-3 h-3" /></>
                                              )}
                                            </span>
                                          </div>
                                        </div>

                                        {/* LEVEL 3: 2 SUB-BRANCHES (NHÂN SỰ & SẢN PHẨM) */}
                                        {isStoreExpanded && (
                                          <div className="space-y-4 relative border-l-2 border-purple-900/60 pl-8">
                                            {/* Sub-branch 1: NHÂN SỰ & PIC (Staff Allocation) */}
                                            {showStaffBranches && (
                                              <div className="relative">
                                                <div className="absolute -left-8 top-5 w-8 h-0.5 bg-purple-900/60" />
                                                
                                                <div className="w-64 bg-[#0d1526] border border-amber-500/30 rounded-xl p-3 shadow-md">
                                                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                                                    <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                                                      <Users className="w-3 h-3 text-amber-400" />
                                                      ĐỘI NGŨ PHỤ TRÁCH ({1 + store.memberPics.length})
                                                    </span>
                                                    <button
                                                      onClick={e => {
                                                        e.stopPropagation();
                                                        setEditingStoreForm({
                                                          storeId: store.id,
                                                          primaryPic: store.primaryPic,
                                                          memberPics: [...store.memberPics],
                                                          assignmentNotes: store.assignmentNotes || ''
                                                        });
                                                        setIsEditingStorePic(true);
                                                        setSelectedNode({ type: 'STORE', data: store });
                                                      }}
                                                      className="p-1 hover:bg-amber-500/20 text-amber-400 rounded"
                                                      title="Phân công lại PIC"
                                                    >
                                                      <Edit3 className="w-3 h-3" />
                                                    </button>
                                                  </div>

                                                  {/* 👑 PIC Chính Highlight */}
                                                  <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/40">
                                                    <div className="flex items-center gap-2">
                                                      <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-slate-950 font-black text-[10px] shrink-0">
                                                        👑
                                                      </div>
                                                      <div className="min-w-0">
                                                        <div className="text-[11px] font-black text-amber-300 truncate">
                                                          {store.primaryPic}
                                                        </div>
                                                        <div className="text-[9px] text-amber-400/80">
                                                          PIC Chính (Chịu trách nhiệm số)
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>

                                                  {/* Nhân sự thành viên (Sub-PICs) */}
                                                  <div className="mt-2 space-y-1">
                                                    <div className="text-[9px] font-bold text-slate-500 uppercase">
                                                      Nhân sự phối hợp:
                                                    </div>
                                                    {store.memberPics.length === 0 ? (
                                                      <div className="text-[10px] text-slate-500 italic">Chưa thêm PIC hỗ trợ</div>
                                                    ) : (
                                                      store.memberPics.map((picName, pIdx) => (
                                                        <div
                                                          key={pIdx}
                                                          className="flex items-center justify-between px-2 py-1 bg-[#101b33] rounded text-[10px] border border-slate-800"
                                                        >
                                                          <span className="text-slate-300 font-medium truncate flex items-center gap-1.5">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                                            {picName}
                                                          </span>
                                                          <span className="text-[9px] text-slate-500">Phối hợp</span>
                                                        </div>
                                                      ))
                                                    )}
                                                  </div>

                                                  {store.assignmentNotes && (
                                                    <div className="mt-2 p-1.5 bg-[#0b1120] rounded text-[9px] text-slate-400 border border-slate-800/80 line-clamp-2">
                                                      💬 {store.assignmentNotes}
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            )}

                                            {/* Sub-branch 2: SẢN PHẨM & STORE SKUs */}
                                            {showProductBranches && (
                                              <div className="relative">
                                                <div className="absolute -left-8 top-5 w-8 h-0.5 bg-purple-900/60" />

                                                <div className="w-72 bg-[#0d1526] border border-blue-500/30 rounded-xl p-3 shadow-md">
                                                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                                                    <span className="text-[10px] font-bold text-blue-300 flex items-center gap-1">
                                                      <Package className="w-3 h-3 text-blue-400" />
                                                      STORE SKUS MAPPING ({store.storeProducts.length})
                                                    </span>
                                                    <span className="text-[9px] text-slate-400">
                                                      ID Sàn Riêng
                                                    </span>
                                                  </div>

                                                  <div className="mt-2 space-y-2">
                                                    {store.storeProducts.map(prod => (
                                                      <div
                                                        key={prod.platformProductId}
                                                        onClick={() => setSelectedNode({ type: 'PRODUCT', data: { ...prod, storeName: store.storeName, platform: store.platform } })}
                                                        className="p-2 bg-[#101b33] hover:bg-[#162444] rounded-lg border border-slate-800 transition cursor-pointer"
                                                      >
                                                        <div className="flex items-center justify-between">
                                                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                                            {prod.isHeroSku ? '⭐ HERO SKU' : 'CORE SKU'}
                                                          </span>
                                                          <span className="text-[9px] font-mono text-emerald-400 font-bold">
                                                            {prod.commissionRate}% hoa hồng
                                                          </span>
                                                        </div>

                                                        <div className="text-[11px] font-bold text-white mt-1 truncate">
                                                          {prod.productName}
                                                        </div>

                                                        {/* Highlighting the Core Logic: Platform Product ID vs Master SKU */}
                                                        <div className="mt-1.5 p-1 bg-[#090f1d] rounded text-[9px] space-y-0.5 border border-slate-800/80">
                                                          <div className="flex items-center justify-between">
                                                            <span className="text-slate-500">Store Item ID:</span>
                                                            <span className="font-mono text-cyan-300 font-bold truncate">
                                                              {prod.platformProductId}
                                                            </span>
                                                          </div>
                                                          <div className="flex items-center justify-between">
                                                            <span className="text-slate-500">Master SKU:</span>
                                                            <span className="font-mono text-slate-400 truncate">
                                                              {prod.masterSku}
                                                            </span>
                                                          </div>
                                                        </div>

                                                        <div className="mt-1 text-[10px] text-slate-400 flex items-center justify-between">
                                                          <span>Giá shop: <strong>{prod.storePrice.toLocaleString('vi-VN')} đ</strong></span>
                                                          <a
                                                            href={prod.platformUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-blue-400 hover:underline flex items-center gap-0.5 text-[9px]"
                                                            onClick={e => e.stopPropagation()}
                                                          >
                                                            Link sàn <ExternalLink className="w-2.5 h-2.5" />
                                                          </a>
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Node Inspector & Master Data Detail Editor */}
        <div className="lg:col-span-4 space-y-4">
          {/* Main Inspector Card */}
          <div className="bg-[#0b1120] border border-[#1e293b] rounded-2xl p-4 sm:p-5 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    Bảng Điều Khiển Master Data
                  </h4>
                  <div className="text-[10px] text-slate-400">
                    Chi tiết thực thể đang chọn
                  </div>
                </div>
              </div>

              {selectedNode && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  {selectedNode.type}
                </span>
              )}
            </div>

            {/* Content for Selected Node */}
            <div className="mt-4 text-xs">
              {!selectedNode ? (
                <div className="p-6 text-center text-slate-500 italic">
                  Nhấn vào bất kỳ Node nào trên sơ đồ Mindmap để xem và điều chỉnh dữ liệu gốc.
                </div>
              ) : selectedNode.type === 'STORE' ? (
                <div className="space-y-4">
                  {/* Store Header */}
                  <div>
                    <div className="flex items-center justify-between">
                      {renderPlatformBadge(selectedNode.data.platform)}
                      <span className="text-[10px] font-mono text-slate-400">
                        ID: {selectedNode.data.storeId}
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-white mt-1.5">
                      {selectedNode.data.storeName}
                    </h3>
                    <div className="text-[11px] text-slate-400">
                      Thuộc Brand: <strong>{selectedNode.data.brandName}</strong>
                    </div>
                  </div>

                  {/* 👑 Section: Phân Công PIC Chính & Phân Quyền */}
                  <div className="p-3.5 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/40 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-black text-amber-300 flex items-center gap-1.5">
                        <Crown className="w-4 h-4 text-amber-400" />
                        TRÁCH NHIỆM & PIC CHÍNH
                      </span>
                      <button
                        onClick={() => {
                          setEditingStoreForm({
                            storeId: selectedNode.data.id,
                            primaryPic: selectedNode.data.primaryPic,
                            memberPics: [...selectedNode.data.memberPics],
                            assignmentNotes: selectedNode.data.assignmentNotes || ''
                          });
                          setIsEditingStorePic(true);
                        }}
                        className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[10px] font-bold flex items-center gap-1 transition"
                      >
                        <Edit3 className="w-3 h-3" /> Đổi PIC
                      </button>
                    </div>

                    <div className="p-2.5 bg-[#090f1d] rounded-lg border border-amber-500/30 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400">1 PIC Chính Phụ Trách:</div>
                        <div className="text-xs font-black text-white flex items-center gap-1 mt-0.5">
                          <span className="text-amber-400">👑</span> {selectedNode.data.primaryPic}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Lead Shop
                      </span>
                    </div>

                    <div className="mt-2.5 space-y-1">
                      <div className="text-[10px] text-slate-400 font-semibold">
                        Nhân sự phối hợp ({selectedNode.data.memberPics.length}):
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedNode.data.memberPics.map((pName: string, i: number) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-[#162036] text-slate-300 border border-slate-700 text-[10px]"
                          >
                            {pName}
                          </span>
                        ))}
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 mt-2 italic bg-[#0f172a] p-2 rounded border border-slate-800">
                      💡 <strong>Nguyên tắc:</strong> Mọi kế hoạch tuần/tháng (Plan Studio) của gian hàng này sẽ do <strong>{selectedNode.data.primaryPic}</strong> chủ trì phân chia và giao task.
                    </p>
                  </div>

                  {/* Financial Targets */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 bg-[#101b33] border border-[#1e293b] rounded-xl">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Ngân Sách Tháng</div>
                      <div className="text-sm font-black text-white mt-1">
                        {(selectedNode.data.monthlyBudget / 1000000).toFixed(0)} Triệu đ
                      </div>
                    </div>
                    <div className="p-3 bg-[#101b33] border border-[#1e293b] rounded-xl">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Target GMV</div>
                      <div className="text-sm font-black text-emerald-400 mt-1">
                        {(selectedNode.data.monthlyTargetGmv / 1000000).toFixed(0)} Triệu đ
                      </div>
                    </div>
                  </div>

                  {/* Store Products List */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-white mb-2">
                      <span className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-blue-400" />
                        Danh Mục Sản Phẩm Đang Bán ({selectedNode.data.storeProducts.length})
                      </span>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {selectedNode.data.storeProducts.map((p: StoreProductSkuMap) => (
                        <div key={p.platformProductId} className="p-2.5 bg-[#0f172a] border border-[#1e293b] rounded-xl">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-white truncate max-w-[170px]">{p.productName}</span>
                            <span className="text-emerald-400 font-bold">{p.commissionRate}% comm</span>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[9px] text-slate-400 font-mono">
                            <span>Sàn ID: <strong className="text-cyan-300">{p.platformProductId}</strong></span>
                            <span>Giá: {p.storePrice.toLocaleString('vi-VN')} đ</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-[#1e293b] flex items-center gap-2">
                    {onOpenQuickBookWithBrand && (
                      <button
                        onClick={() => onOpenQuickBookWithBrand(selectedNode.data.brandName)}
                        className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Mở Lập Plan Cho Gian Hàng Này</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : selectedNode.type === 'PRODUCT' ? (
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      📦 SẢN PHẨM & STORE SKU MAPPING
                    </span>
                    <h3 className="text-sm font-black text-white mt-2">
                      {selectedNode.data.productName}
                    </h3>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Đang bán tại gian: <strong>{selectedNode.data.storeName}</strong>
                    </div>
                  </div>

                  <div className="p-3 bg-[#101b33] border border-blue-500/30 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Store Item ID sàn:</span>
                      <span className="font-mono text-cyan-300 font-bold">{selectedNode.data.platformProductId}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Mã Master SKU gốc:</span>
                      <span className="font-mono text-slate-300">{selectedNode.data.masterSku}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Giá bán tại gian này:</span>
                      <span className="font-bold text-white">{selectedNode.data.storePrice.toLocaleString('vi-VN')} đ</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Tỷ lệ hoa hồng affiliate:</span>
                      <span className="font-bold text-emerald-400">{selectedNode.data.commissionRate}%</span>
                    </div>
                  </div>

                  <div className="p-3 bg-[#0f172a] border border-[#1e293b] rounded-xl text-[11px] text-slate-400 space-y-1.5">
                    <div className="font-bold text-slate-300">💡 Cơ chế ánh xạ ID tự động:</div>
                    <p>
                      Khi PIC lập Plan cho gian hàng này và chọn sản phẩm <em>{selectedNode.data.productName}</em>, hệ thống sẽ tự động gán mã <strong>{selectedNode.data.platformProductId}</strong> để KOC gắn đúng giỏ hàng, tránh nhầm lẫn giữa các sàn.
                    </p>
                  </div>
                </div>
              ) : selectedNode.type === 'BRAND' ? (
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      🏢 BRAND TỔNG
                    </span>
                    <h3 className="text-sm font-black text-white mt-2">
                      {selectedNode.data.name}
                    </h3>
                    <div className="text-[11px] text-slate-400">
                      {selectedNode.data.companyName}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 bg-[#101b33] border border-[#1e293b] rounded-xl">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Tổng Target GMV</div>
                      <div className="text-sm font-black text-emerald-400 mt-1">
                        {(selectedNode.data.targetGmv / 1000000).toFixed(0)}M đ
                      </div>
                    </div>
                    <div className="p-3 bg-[#101b33] border border-[#1e293b] rounded-xl">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Ngân Sách Brand</div>
                      <div className="text-sm font-black text-white mt-1">
                        {(selectedNode.data.planBudget / 1000000).toFixed(0)}M đ
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-[#0f172a] border border-[#1e293b] rounded-xl space-y-1.5 text-[11px]">
                    <div className="text-slate-400">Account PIC: <strong className="text-slate-200">{selectedNode.data.accountPic}</strong></div>
                    <div className="text-slate-400">Growth PIC: <strong className="text-slate-200">{selectedNode.data.growthPic}</strong></div>
                    <div className="text-slate-400">Booking Lead: <strong className="text-slate-200">{selectedNode.data.bookingPicLead}</strong></div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-white">Tổng Quan Master Data Toàn Hệ Thống</h3>
                  <p className="text-slate-400 text-xs">
                    Hệ thống đang cấu trúc dữ liệu theo 4 chiều: <strong>Brand ➔ Gian hàng ➔ Nhân sự (1 PIC chính) ➔ Sản phẩm (Store SKU)</strong>.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Legend & Guidelines */}
          <div className="bg-[#0b1120] border border-[#1e293b] rounded-2xl p-4 text-xs space-y-2">
            <h5 className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              Quy Chuẩn Master Data B2C
            </h5>
            <ul className="space-y-1.5 text-[11px] text-slate-400 list-disc list-inside">
              <li>Mỗi Gian hàng chỉ có đúng <strong>1 PIC Chính</strong> chịu trách nhiệm KPI và số cuối.</li>
              <li>Mỗi sản phẩm có <strong>1 Master SKU</strong> ở Brand nhưng có các <strong>Store Product ID khác nhau</strong> trên mỗi sàn.</li>
              <li>Khi làm <strong>Plan</strong>, PIC chính phân rã ngân sách xuống từng nhân sự theo đúng Store Product ID của shop.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* MODAL: CHỈNH SỬA / ĐỔI PIC CHÍNH VÀ NHÂN SỰ CỦA GIAN HÀNG */}
      {isEditingStorePic && editingStoreForm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#0b1120] border border-[#1e293b] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-amber-500/20 to-slate-900 border-b border-[#1e293b] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    Phân Công PIC Chính & Đội Ngũ Gian Hàng
                  </h3>
                  <div className="text-[10px] text-slate-400">
                    Chỉ định 1 PIC chính chủ trì lập kế hoạch & các nhân sự phối hợp
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsEditingStorePic(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* 👑 1 PIC Chính (Primary Store PIC) */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>1 PIC Chính Phụ Trách (Bắt buộc chọn 1 người):</span>
                </label>
                <select
                  value={editingStoreForm.primaryPic}
                  onChange={e => {
                    const newPrimary = e.target.value;
                    setEditingStoreForm(prev => {
                      if (!prev) return null;
                      // Remove from memberPics if selected as primary
                      const updatedMembers = prev.memberPics.filter(m => m !== newPrimary);
                      return {
                        ...prev,
                        primaryPic: newPrimary,
                        memberPics: updatedMembers
                      };
                    });
                  }}
                  className="w-full bg-[#0f172a] border border-amber-500/40 text-amber-300 font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-400"
                >
                  {allPicOptions.map(staff => (
                    <option key={staff} value={staff}>👑 {staff} (Lead PIC Gian Hàng)</option>
                  ))}
                </select>
                <p className="text-[10px] text-amber-400/80 mt-1">
                  Nhân sự này sẽ có thẩm quyền lập, phân bổ ngân sách và giao việc cho các thành viên trong gian hàng này.
                </p>
              </div>

              {/* Nhân sự phối hợp (Multi-select) */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span>Các Nhân Sự Phối Hợp / Cùng Làm Shop (Sub-PICs):</span>
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-[#090f1d] rounded-xl border border-slate-800">
                  {allPicOptions
                    .filter(staff => staff !== editingStoreForm.primaryPic)
                    .map(staff => {
                      const isSelected = editingStoreForm.memberPics.includes(staff);
                      return (
                        <button
                          key={staff}
                          type="button"
                          onClick={() => {
                            setEditingStoreForm(prev => {
                              if (!prev) return null;
                              const exists = prev.memberPics.includes(staff);
                              return {
                                ...prev,
                                memberPics: exists
                                  ? prev.memberPics.filter(m => m !== staff)
                                  : [...prev.memberPics, staff]
                              };
                            });
                          }}
                          className={`p-2 rounded-lg text-left text-[11px] font-medium border flex items-center justify-between transition ${
                            isSelected
                              ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                              : 'bg-[#101b33] border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span className="truncate">{staff}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Ghi chú phân chia */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  Ghi Chú Phân Chia Trách Nhiệm Giữa Các PICs:
                </label>
                <textarea
                  rows={3}
                  value={editingStoreForm.assignmentNotes}
                  onChange={e => setEditingStoreForm(prev => prev ? { ...prev, assignmentNotes: e.target.value } : null)}
                  placeholder="Ví dụ: PIC Chính quản lý budget tổng và KOC Celeb; Bạn B làm KOC Mass; Bạn C làm Livestream..."
                  className="w-full bg-[#0f172a] border border-[#1e293b] text-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#080d19] border-t border-[#1e293b] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditingStorePic(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveStoreAssignment}
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black rounded-xl text-xs shadow-lg transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Lưu Phân Công Master Data</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
