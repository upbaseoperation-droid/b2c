'use client';

import React, { useState, useMemo } from 'react';
import { formatVndShort } from '../../lib/format';
import { ChannelTag, channelOf, BrandAvatar, Modal, Button } from '../ui';
import {
  Building2,
  Store,
  Users,
  Package,
  ChevronRight,
  ChevronDown,
  Crown,
  Search,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Edit3,
  X,
  Info
} from 'lucide-react';
import { UserProfile, BrandDetail, StorePortfolioItem } from '../../lib/types';
import { INITIAL_BRANDS, STAFF_MASTER_DIRECTORY, INITIAL_STORE_PORTFOLIOS } from '../../lib/mockData';

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
  primaryPic: string; // 1 PIC Chính
  memberPics: string[]; // Danh sách các PIC hỗ trợ
  assignmentNotes?: string;
  // Sản phẩm phân bổ trên gian này
  storeProducts: StoreProductSkuMap[];
  isB2cManaged?: boolean;
  requiresB2cPlan?: boolean;
}

// 5 Demo stores with rich manually-tuned SKUs
export const STATIC_DETAILED_DEMO_STORES: MindmapStoreNode[] = [

    // Brand 1: Kutieskin
    {
      id: 'store-kuti-tts',
      brandId: 'brand-kutieskin',
      brandName: 'Kutieskin Mama & Baby',
      storeName: 'Kutieskin Mama_TikTok_E2E-S',
      platform: 'TIKTOK_SHOP',
      storeId: 'TTS_VN_83921',
      storeUrl: 'https://shop.tiktok.com/view/product/kutieskin-official',
      status: 'ACTIVE',
      monthlyTargetGmv: 450000000,
      monthlyBudget: 150000000,
      primaryPic: 'Lê Phương Thảo', // PIC Chính
      memberPics: ['Trần Minh Đức', 'Lê Hoàng Yến'],
      assignmentNotes: 'Lê Phương Thảo chủ trì phân rã plan và chốt ngân sách. Đức phụ trách KOC Affiliate, Yến phụ trách Livestream.',
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
      storeName: 'Kutieskin Mama_Shopee_E2E-S',
      platform: 'SHOPEE_MALL',
      storeId: 'SP_MALL_19284',
      storeUrl: 'https://shopee.vn/kutieskin_official',
      status: 'ACTIVE',
      monthlyTargetGmv: 400000000,
      monthlyBudget: 130000000,
      primaryPic: 'Trần Minh Đức', // PIC Chính
      memberPics: ['Lê Phương Thảo'],
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
      primaryPic: 'Đặng Mai Hà Linh', // PIC Chính
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
      primaryPic: 'Nguyễn Thu Trang', // PIC Chính
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
      primaryPic: 'Phạm Thị Thu Hằng', // PIC Chính
      memberPics: ['Lê Phương Thảo', 'Trần Minh Đức'],
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
];

// Helper: Normalize brand names to handle known aliases and case mismatches
export function normalizeBrandKey(name?: string): string {
  if (!name) return '';
  const clean = name.trim().toLowerCase();
  if (clean === 'intimate' || clean === 'ziaja' || clean === 'ziaja intimate') {
    return 'ziaja intimate';
  }
  return clean;
}

// Helper: Convert all 69 StorePortfolioItems into rich MindmapStoreNodes
export function buildMindmapStoresAndBrands(
  rawPortfolios: StorePortfolioItem[] = INITIAL_STORE_PORTFOLIOS,
  baseBrands: BrandDetail[] = INITIAL_BRANDS
) {
  // 1. Build Brands Map
  const brandMap = new Map<string, BrandDetail>();
  baseBrands.forEach(b => {
    brandMap.set(normalizeBrandKey(b.name), b);
  });

  const brandColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#06b6d4', '#6366f1', '#14b8a6', '#f43f5e', '#84cc16'];

  // Check for any portfolio stores with unmapped brands
  rawPortfolios.forEach((s, idx) => {
    const bName = (s.brandName || 'Thương hiệu').trim();
    const key = normalizeBrandKey(bName);

    if (!brandMap.has(key)) {
      const brandId = `brand-b2c-${bName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      const color = brandColors[brandMap.size % brandColors.length];

      const sameStores = rawPortfolios.filter(st => normalizeBrandKey(st.brandName) === key);
      const totalGmv = sameStores.reduce((acc, curr) => acc + (curr.monthlyTargetGmv || 0), 0);
      const totalBudget = sameStores.reduce((acc, curr) => acc + (curr.monthlyBudget || 0), 0);

      const newBrand: BrandDetail = {
        id: brandId,
        code: bName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || `BR${idx}`,
        name: bName,
        companyName: `Công ty TNHH Phân Phối ${bName} Việt Nam`,
        category: s.category || 'Mỹ phẩm & Chăm sóc cá nhân',
        color,
        status: 'ACTIVE',
        planBudget: totalBudget,
        spentBudget: Math.round(totalBudget * 0.42),
        targetGmv: totalGmv,
        currentGmv: Math.round(totalGmv * 0.48),
        targetVideos: sameStores.length * 15,
        airedVideos: Math.round(sameStores.length * 8),
        accountPic: s.accountOwnerName || 'Chưa gán',
        bookingPicLead: (s.b2cOwners && s.b2cOwners[0]) || s.b2cOwnerName || 'Chưa gán',
        brandGuideline: `Bộ quy chuẩn nhận diện thương hiệu & định hướng nội dung ${bName}.`,
        kocCriteria: `KOC/KOL từ 50k-500k followers ngành ${s.category || 'Lifestyle & Beauty'}.`,
        stores: [],
        heroProducts: []
      };

      brandMap.set(key, newBrand);
    }
  });

  const finalBrands = Array.from(brandMap.values());

  // Aggregate financial metrics from actual stores for accurate brand totals
  finalBrands.forEach(b => {
    const key = normalizeBrandKey(b.name);
    const linkedStores = rawPortfolios.filter(st => normalizeBrandKey(st.brandName) === key);
    const storeSumBudget = linkedStores.reduce((sum, st) => sum + (st.monthlyBudget || 0), 0);
    const storeSumGmv = linkedStores.reduce((sum, st) => sum + (st.monthlyTargetGmv || 0), 0);
    if (!b.planBudget && storeSumBudget > 0) {
      b.planBudget = storeSumBudget;
    }
    if (!b.targetGmv && storeSumGmv > 0) {
      b.targetGmv = storeSumGmv;
    }
  });

  // 2. Build Store Nodes
  const existingMap = new Map<string, MindmapStoreNode>();
  STATIC_DETAILED_DEMO_STORES.forEach(node => {
    existingMap.set(node.storeName.toLowerCase(), node);
    existingMap.set(node.id.toLowerCase(), node);
  });

  const finalStores: MindmapStoreNode[] = rawPortfolios.map((s, idx) => {
    // Platform normalization
    let platform: 'TIKTOK_SHOP' | 'SHOPEE_MALL' | 'LAZADA' = 'TIKTOK_SHOP';
    const platStr = (s.platform || '').toLowerCase();
    if (platStr.includes('shopee')) {
      platform = 'SHOPEE_MALL';
    } else if (platStr.includes('lazada') || platStr.includes('lzd')) {
      platform = 'LAZADA';
    } else {
      platform = 'TIKTOK_SHOP';
    }

    const normKey = normalizeBrandKey(s.brandName);
    const brandObj = brandMap.get(normKey);
    const brandId = brandObj ? brandObj.id : `brand-b2c-${(s.brandName || '').toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const brandName = brandObj ? brandObj.name : (s.brandName || 'Thương hiệu').trim();

    // Primary PIC: B2C Specialist PIC is primary responsibility (GEMINI.md standard), NOT sales account owner
    const primaryPic = (s.primaryPic && s.primaryPic !== 'Chưa phân công' && s.primaryPic !== 'Chưa gán')
      ? s.primaryPic
      : (s.b2cOwnerName && s.b2cOwnerName !== 'Chưa phân công' && s.b2cOwnerName !== 'Chưa gán')
        ? s.b2cOwnerName
        : (s.b2cOwners && s.b2cOwners[0] && s.b2cOwners[0] !== 'Chưa phân công' && s.b2cOwners[0] !== 'Chưa gán')
          ? s.b2cOwners[0]
          : (s.assignedStaff && s.assignedStaff !== 'Chưa phân công' && s.assignedStaff !== 'Chưa gán')
            ? s.assignedStaff
            : 'Chưa phân công';

    // Build Squad/Member PIC list
    const memberPics: string[] = [];
    if (s.assignedMembers && Array.isArray(s.assignedMembers)) {
      s.assignedMembers.forEach(m => {
        if (m && m !== 'Chưa phân công' && m !== 'Chưa gán' && m !== primaryPic && !memberPics.includes(m)) {
          memberPics.push(m);
        }
      });
    }
    if (s.b2cOwners && Array.isArray(s.b2cOwners)) {
      s.b2cOwners.forEach(bo => {
        if (bo && bo !== 'Chưa phân công' && bo !== 'Chưa gán' && bo !== primaryPic && !memberPics.includes(bo)) {
          memberPics.push(bo);
        }
      });
    }
    if (s.accountOwnerName && s.accountOwnerName !== 'Chưa gán' && s.accountOwnerName !== primaryPic && !memberPics.includes(`Account: ${s.accountOwnerName}`)) {
      memberPics.push(`Account: ${s.accountOwnerName}`);
    }

    const cleanBrandSlug = brandName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || 'SKU';
    const storeShortId = (s.id || `st-${idx}`).replace(/[^a-zA-Z0-9]/g, '').slice(-4);

    // Hero Products Mapping from Brand Master Data
    let storeProducts: StoreProductSkuMap[] = [];
    if (brandObj && brandObj.heroProducts && brandObj.heroProducts.length > 0) {
      storeProducts = brandObj.heroProducts.map((hp, pIdx) => ({
        masterProductId: hp.id || `prod-${s.id}-${pIdx}`,
        masterSku: hp.sku || `${cleanBrandSlug}-SKU-${pIdx + 1}`,
        productName: hp.productName,
        platformProductId: `${platform === 'TIKTOK_SHOP' ? 'TTS' : platform === 'SHOPEE_MALL' ? 'SP' : 'LZD'}-${storeShortId}-${String(pIdx + 1).padStart(2, '0')}`,
        platformUrl: hp.pdpUrl || s.storeUrl || '#',
        storePrice: hp.price || 250000,
        commissionRate: hp.commissionRate || 15,
        isHeroSku: pIdx === 0
      }));
    } else {
      storeProducts = [
        {
          masterProductId: `prod-${s.id || idx}-1`,
          masterSku: `${cleanBrandSlug}-HERO-01`,
          productName: `Combo Chăm Sóc & Làm Đẹp ${brandName} Best Seller`,
          platformProductId: `${platform === 'TIKTOK_SHOP' ? 'TTS' : platform === 'SHOPEE_MALL' ? 'SP' : 'LZD'}-${storeShortId}-01`,
          platformUrl: s.storeUrl || '#',
          storePrice: 289000,
          commissionRate: 15,
          isHeroSku: true
        },
        {
          masterProductId: `prod-${s.id || idx}-2`,
          masterSku: `${cleanBrandSlug}-CORE-02`,
          productName: `Sản Phẩm Phổ Thông ${brandName} Phân Phối Chính Hãng`,
          platformProductId: `${platform === 'TIKTOK_SHOP' ? 'TTS' : platform === 'SHOPEE_MALL' ? 'SP' : 'LZD'}-${storeShortId}-02`,
          platformUrl: s.storeUrl || '#',
          storePrice: 199000,
          commissionRate: 12,
          isHeroSku: false
        }
      ];
    }

    return {
      id: s.id || `store-mindmap-${idx}`,
      brandId,
      brandName,
      storeName: s.storeName,
      platform,
      storeId: s.storeOperation || s.storeOperationId || s.storeName,
      storeUrl: s.storeUrl || '#',
      status: (s.accountStatus === 'ACTIVE' || s.operationStatus === 'Live') ? 'ACTIVE' : 'PAUSED',
      monthlyTargetGmv: s.monthlyTargetGmv || 0,
      monthlyBudget: s.monthlyBudget || 0,
      primaryPic,
      memberPics,
      assignmentNotes: s.assignmentNotes || `PIC Chính: ${primaryPic} | Đội ngũ hỗ trợ: ${memberPics.join(', ') || 'Chưa gán'}`,
      storeProducts,
      isB2cManaged: s.isB2cManaged ?? true,
      requiresB2cPlan: s.requiresB2cPlan ?? true
    };
  });

  return { brands: finalBrands, stores: finalStores };
}

export interface MasterDataMindmapViewProps {
  currentUser: UserProfile;
  onOpenQuickBookWithBrand?: (brandName: string) => void;
  onNotify?: (msg: string) => void;
  storePortfolios?: StorePortfolioItem[];
  brands?: BrandDetail[];
}

type SelectedMindmapNode =
  | { type: 'ROOT'; data: { brandsCount: number; storesCount: number } }
  | { type: 'BRAND'; data: BrandDetail }
  | { type: 'STORE'; data: MindmapStoreNode }
  | { type: 'STAFF'; data: Record<string, unknown> }
  | { type: 'PRODUCT'; data: StoreProductSkuMap & { storeName: string; platform: MindmapStoreNode['platform'] } };

export const MasterDataMindmapView: React.FC<MasterDataMindmapViewProps> = ({
  onOpenQuickBookWithBrand,
  onNotify,
  storePortfolios,
  brands: initialBrandsProp
}) => {
  // Pre-calculate initial brands and stores from live portfolios (131 Live + internal stores)
  const initialData = useMemo(() => {
    return buildMindmapStoresAndBrands(
      storePortfolios && storePortfolios.length > 0 ? storePortfolios : INITIAL_STORE_PORTFOLIOS,
      initialBrandsProp && initialBrandsProp.length > 0 ? initialBrandsProp : INITIAL_BRANDS
    );
  }, [storePortfolios, initialBrandsProp]);

  // Master Brands list (derived dynamically from 131 stores + initial brands)
  const [brands, setBrands] = useState<BrandDetail[]>(initialData.brands);

  // Initialize Store nodes with 1 Primary PIC + Sub-PICs + Store-specific Product IDs
  const [stores, setStores] = useState<MindmapStoreNode[]>(initialData.stores);
  const [prevInitialData, setPrevInitialData] = useState(initialData);
  if (initialData !== prevInitialData) {
    setPrevInitialData(initialData);
    setBrands(initialData.brands);
    setStores(initialData.stores);
  }

  // UI Interactive States for Mindmap
  // Set of expanded node IDs: 'root', 'brand-xxx', 'store-xxx', 'store-xxx-staff', 'store-xxx-products', etc.
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    const initialSet = new Set(['root']);
    if (initialData.brands[0]) {
      initialSet.add(initialData.brands[0].id);
      const firstBrandStores = initialData.stores.filter(s => s.brandId === initialData.brands[0].id);
      firstBrandStores.forEach(s => {
        initialSet.add(s.id);
        initialSet.add(`${s.id}-staff`);
        initialSet.add(`${s.id}-products`);
      });
    }
    return initialSet;
  });

  // Filters
  const [filterB2cOnly, setFilterB2cOnly] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<'ALL' | 'TIKTOK_SHOP' | 'SHOPEE_MALL' | 'LAZADA'>('ALL');
  const [filterBrandId, setFilterBrandId] = useState<string>('ALL');
  const [filterPic, setFilterPic] = useState<string>('ALL');
  const [showStaffBranches, setShowStaffBranches] = useState<boolean>(true);
  const [showProductBranches, setShowProductBranches] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Inspector / Detail Drawer State
  const [selectedNode, setSelectedNode] = useState<SelectedMindmapNode | null>(() => (
    initialData.stores[0] ? { type: 'STORE', data: initialData.stores[0] } : null
  ));

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
      // 1. Mặc định lọc gian B2C làm plan
      if (filterB2cOnly && !s.requiresB2cPlan && !s.isB2cManaged) return false;
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
  }, [stores, filterB2cOnly, filterPlatform, filterBrandId, filterPic, searchQuery]);

  // Unique PIC options
  const allPicOptions = useMemo(() => {
    const set = new Set<string>();
    stores.forEach(s => {
      if (s.primaryPic && s.primaryPic !== 'Chưa phân công' && s.primaryPic !== 'Chưa gán') {
        set.add(s.primaryPic);
      }
      s.memberPics.forEach(p => {
        const clean = p.replace(/^(Growth|Content|Media|CS\/Listing|Booking|Account):\s*/, '').trim();
        if (clean && clean !== 'Chưa phân công' && clean !== 'Chưa gán') {
          set.add(clean);
        }
      });
    });
    STAFF_MASTER_DIRECTORY.forEach(staff => set.add(staff.name));
    return Array.from(set).sort();
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
    const msg = `Đã cập nhật PIC Chính [${editingStoreForm.primaryPic}] cho gian hàng!`;
    if (onNotify) onNotify(msg);
  };

  // Global Escape key listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsEditingStorePic(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Helper for platform visual badge
  const renderPlatformBadge = (platform: 'TIKTOK_SHOP' | 'SHOPEE_MALL' | 'LAZADA') => {
    return <ChannelTag channel={channelOf(platform)} />;
  };

  return (
    <div className="space-y-3">

      {/* Toolbar & Filters */}
      <div className="bg-surface border border-line rounded-xl p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            {/* Toggle B2C Only vs All */}
            <div className="inline-flex p-0.5 bg-sunken rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setFilterB2cOnly(true)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  filterB2cOnly
                    ? 'bg-white text-accent shadow-2xs'
                    : 'text-ink-2 hover:text-ink'
                }`}
              >
                Gian B2C làm plan
              </button>
              <button
                type="button"
                onClick={() => setFilterB2cOnly(false)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  !filterB2cOnly
                    ? 'bg-white text-ink shadow-2xs'
                    : 'text-ink-2 hover:text-ink'
                }`}
              >
                Tất cả gian ({stores.length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm Brand, gian hàng, PIC..."
                className="w-full pl-8 pr-3 py-1.5 bg-canvas border border-line rounded-lg text-ink placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/20 text-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink-2"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filter Platform */}
            <select
              value={filterPlatform}
              onChange={e => setFilterPlatform(e.target.value as 'ALL' | 'TIKTOK_SHOP' | 'SHOPEE_MALL' | 'LAZADA')}
              className="bg-canvas border border-line text-ink-2 rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/20 text-xs"
            >
              <option value="ALL">Tất cả sàn</option>
              <option value="TIKTOK_SHOP">TikTok</option>
              <option value="SHOPEE_MALL">Shopee</option>
              <option value="LAZADA">Lazada</option>
            </select>

            {/* Filter Brand */}
            <select
              value={filterBrandId}
              onChange={e => setFilterBrandId(e.target.value)}
              className="bg-canvas border border-line text-ink-2 rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/20 text-xs"
            >
              <option value="ALL">Tất cả Brand</option>
              {brands.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            {/* Filter PIC */}
            <select
              value={filterPic}
              onChange={e => setFilterPic(e.target.value)}
              className="bg-canvas border border-line text-ink-2 rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/20 text-xs"
            >
              <option value="ALL">Tất cả PIC</option>
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
                  ? 'bg-warning-soft border-warning/20 text-warning'
                  : 'bg-white border-line text-ink-2 hover:text-ink hover:bg-canvas'
              }`}
              title="Bật/tắt hiển thị nhánh nhân sự & PIC"
            >
              <Crown className="w-3 h-3" />
              <span>Nhân sự</span>
            </button>

            <button
              onClick={() => setShowProductBranches(prev => !prev)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
                showProductBranches
                  ? 'bg-accent-soft border-accent/20 text-accent'
                  : 'bg-white border-line text-ink-2 hover:text-ink hover:bg-canvas'
              }`}
              title="Bật/tắt hiển thị nhánh sản phẩm & Store SKUs"
            >
              <Package className="w-3 h-3" />
              <span>Sản phẩm</span>
            </button>

            <div className="h-4 w-px bg-sunken mx-1" />

            <button
              onClick={expandAll}
              className="px-2.5 py-1.5 bg-white hover:bg-canvas border border-line rounded-lg text-ink-2 font-medium transition"
              title="Mở rộng tất cả các nhánh"
            >
              Xổ hết
            </button>
            <button
              onClick={collapseAll}
              className="px-2.5 py-1.5 bg-white hover:bg-canvas border border-line rounded-lg text-ink-2 font-medium transition"
              title="Thu gọn về gốc"
            >
              Thu Lại
            </button>

            {/* Zoom Controls */}
            <div className="flex items-center bg-canvas border border-line rounded-lg px-2 py-1 text-ink-2">
              <button
                onClick={() => setZoomLevel(prev => Math.max(75, prev - 10))}
                className="px-1 hover:text-ink font-semibold"
                title="Thu nhỏ"
              >
                -
              </button>
              <span className="text-2xs font-mono">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel(prev => Math.min(130, prev + 10))}
                className="px-1 hover:text-ink font-semibold"
                title="Phóng to"
              >
                +
              </button>
            </div>
          </div>
        </div>

      {/* Main Grid: Mindmap Canvas (Left/Center) + Node Inspector Drawer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Mindmap Interactive Tree Canvas */}
        <div className="lg:col-span-8 bg-canvas border border-line rounded-xl p-4 sm:p-6 shadow-inner overflow-x-auto min-h-[620px] relative">
          {/* Subtle Grid Background */}
          <div 
            className="absolute inset-0 opacity-[0.35] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #cbd5e1 1.25px, transparent 1.25px)',
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
                  className={`w-full sm:w-64 p-4 rounded-xl cursor-pointer transition-colors border shadow-sm ${
                    expandedNodes.has('root')
                      ? 'bg-white border-accent/20 ring-2 ring-accent/20 shadow-md'
                      : 'bg-white border-line hover:border-line-strong'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-white shadow-xs">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <span className="text-2xs font-semibold text-accent -accent/20">
                      MASTER ROOT
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-ink mt-3">Hệ thống Master Data B2C</h3>
                  
                  
                  <div className="mt-3 pt-2.5 border-t border-line flex items-center justify-between text-2xs">
                    <span className="text-ink-3 flex items-center gap-1">
                      <Store className="w-3 h-3 text-accent" /> {stores.length} Shops
                    </span>
                    <span className="text-accent hover:text-accent font-semibold flex items-center gap-0.5">
                      {expandedNodes.has('root') ? (
                        <><span>Thu gọn</span> <ChevronDown className="w-3.5 h-3.5" /></>
                      ) : (
                        <><span>Xổ ra</span> <ChevronRight className="w-3.5 h-3.5" /></>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* LEVEL 1: BRAND NODES */}
              {expandedNodes.has('root') && (
                <div className="space-y-6 relative border-l-2 border-line-strong pl-8">
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
                        <div className="absolute -left-8 top-6 w-8 h-0.5 bg-sunken" />

                        <div className="flex items-start gap-8">
                          {/* Brand Node Card */}
                          <div
                            onClick={() => {
                              toggleNode(brand.id);
                              setSelectedNode({ type: 'BRAND', data: brand });
                            }}
                            className={`w-full sm:w-72 p-3.5 rounded-xl cursor-pointer transition-colors border shadow-xs ${
                              isBrandExpanded
                                ? 'bg-white border-accent/20 shadow-md ring-2 ring-accent/20'
                                : 'bg-white border-line hover:border-line-strong'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-2xs font-semibold text-accent -accent/20">
                                BRAND TỔNG
                              </span>
                              <span className="text-2xs text-ink-3">
                                {brandStores.length} Gian Hàng
                              </span>
                            </div>

                            <div className="mt-2 flex items-center gap-2.5">
                              <BrandAvatar brandId={brand.id} brandName={brand.name} size={32} />
                              <div className="min-w-0">
                                <h4 className="text-xs font-semibold text-ink truncate">{brand.name}</h4>
                                <div className="text-2xs text-ink-3 truncate">{brand.category}</div>
                              </div>
                            </div>

                            <div className="mt-2.5 pt-2 border-t border-line grid grid-cols-2 gap-2 text-2xs">
                              <div>
                                <span className="text-ink-3 block">Account PIC:</span>
                                <span className="font-semibold text-ink-2 truncate block">{brand.accountPic || 'Chưa gán'}</span>
                              </div>
                              <div>
                                <span className="text-ink-3 block">Ngân sách Plan:</span>
                                <span className="font-semibold text-accent">{formatVndShort(brand.planBudget || 0)}</span>
                              </div>
                            </div>

                            <div className="mt-2 flex items-center justify-between text-2xs pt-1">
                              <span className="text-ink-3">
                                {brand.heroProducts?.length || 0} Hero SKUs
                              </span>
                              <span className="text-accent font-semibold flex items-center gap-0.5">
                                {isBrandExpanded ? (
                                  <><span>Thu gian hàng</span> <ChevronDown className="w-3 h-3" /></>
                                ) : (
                                  <><span>Xổ gian hàng ({brandStores.length})</span> <ChevronRight className="w-3 h-3" /></>
                                )}
                              </span>
                            </div>
                          </div>

                          {/* LEVEL 2: STORE NODES OF THIS BRAND */}
                          {isBrandExpanded && (
                            <div className="space-y-6 relative border-l-2 border-line-strong pl-8">
                              {brandStores.length === 0 ? (
                                <div className="p-3 bg-white border border-dashed border-line-strong rounded-lg text-ink-3 text-xs italic">
                                  Chưa có gian hàng nào khớp bộ lọc.
                                </div>
                              ) : (
                                brandStores.map(store => {
                                  const isStoreExpanded = expandedNodes.has(store.id);

                                  return (
                                    <div key={store.id} className="relative">
                                      <div className="absolute -left-8 top-6 w-8 h-0.5 bg-sunken" />

                                      <div className="flex items-start gap-8">
                                        {/* Store Node Card */}
                                        <div
                                          onClick={() => {
                                            toggleNode(store.id);
                                            setSelectedNode({ type: 'STORE', data: store });
                                          }}
                                          className={`w-full sm:w-72 p-3.5 rounded-xl cursor-pointer transition-colors border shadow-xs ${
                                            isStoreExpanded
                                              ? 'bg-white border-accent/20 shadow-md ring-2 ring-accent/20'
                                              : 'bg-white border-line hover:border-line-strong'
                                          }`}
                                        >
                                          <div className="flex items-center justify-between gap-1">
                                            {renderPlatformBadge(store.platform)}
                                            <span className="text-2xs font-mono text-ink-3 truncate">
                                              {store.storeId}
                                            </span>
                                          </div>

                                          <div className="mt-2">
                                            <h5 className="text-xs font-semibold text-ink truncate flex items-center gap-1.5">
                                              <Store className="w-3.5 h-3.5 text-accent shrink-0" />
                                              <span className="truncate">{store.storeName}</span>
                                            </h5>
                                          </div>

                                          {/* Key Highlight: 1 PIC Chính */}
                                          <div className="mt-2.5 p-2 rounded-lg bg-warning-soft border border-warning/20">
                                            <div className="flex items-center justify-between text-2xs">
                                              <span className="text-warning font-semibold flex items-center gap-1">
                                                <Crown className="w-3 h-3 text-warning" />
                                                1 PIC CHÍNH:
                                              </span>
                                              <span className="text-ink font-semibold truncate">
                                                {store.primaryPic}
                                              </span>
                                            </div>
                                          </div>

                                          <div className="mt-2 pt-2 border-t border-line grid grid-cols-2 gap-1.5 text-2xs">
                                            <div>
                                              <span className="text-ink-3 block">Ngân sách:</span>
                                              <span className="font-semibold text-ink">{formatVndShort(store.monthlyBudget)}</span>
                                            </div>
                                            <div>
                                              <span className="text-ink-3 block">Target GMV:</span>
                                              <span className="font-semibold text-positive">{formatVndShort(store.monthlyTargetGmv)}</span>
                                            </div>
                                          </div>

                                          {/* Sub-branch action toggles */}
                                          <div className="mt-2.5 pt-2 border-t border-line flex items-center justify-between text-2xs">
                                            <span className="text-ink-3">
                                              {store.memberPics.length} PIC phụ • {store.storeProducts.length} SKUs
                                            </span>
                                            <span className="text-accent font-semibold flex items-center gap-0.5">
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
                                          <div className="space-y-4 relative border-l-2 border-accent/20 pl-8">
                                            {/* Sub-branch 1: NHÂN SỰ & PIC (Staff Allocation) */}
                                            {showStaffBranches && (
                                              <div className="relative">
                                                <div className="absolute -left-8 top-5 w-8 h-0.5 bg-accent-soft" />
                                                
                                                <div className="w-full sm:w-64 bg-white border border-warning/20 rounded-xl p-3 shadow-xs">
                                                  <div className="flex items-center justify-between pb-2 border-b border-warning/20">
                                                    <span className="text-2xs font-semibold text-warning flex items-center gap-1">
                                                      <Users className="w-3 h-3 text-warning" />
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
                                                      className="p-1 hover:bg-warning-soft text-warning rounded transition"
                                                      title="Phân công lại PIC"
                                                    >
                                                      <Edit3 className="w-3 h-3" />
                                                    </button>
                                                  </div>

                                                  {/* PIC Chính Highlight */}
                                                  <div className="mt-2 p-2 rounded-lg bg-warning-soft border border-warning/20">
                                                    <div className="flex items-center gap-2">
                                                      <div className="w-6 h-6 rounded-full bg-warning flex items-center justify-center text-white shrink-0">
                                                        <ShieldCheck className="w-3.5 h-3.5" />
                                                      </div>
                                                      <div className="min-w-0">
                                                        <div className="text-2xs font-semibold text-warning truncate">
                                                          {store.primaryPic}
                                                        </div>
                                                        <div className="text-2xs text-warning">
                                                          PIC chính (chịu trách nhiệm số)
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>

                                                  {/* Nhân sự thành viên (Sub-PICs) */}
                                                  <div className="mt-2 space-y-1">
                                                    <div className="text-2xs font-semibold text-ink-3">
                                                      Nhân sự phối hợp:
                                                    </div>
                                                    {store.memberPics.length === 0 ? (
                                                      <div className="text-2xs text-ink-3 italic">Chưa thêm PIC hỗ trợ</div>
                                                    ) : (
                                                      store.memberPics.map((picName, pIdx) => (
                                                        <div
                                                          key={pIdx}
                                                          className="flex items-center justify-between px-2 py-1 bg-canvas rounded text-2xs border border-line"
                                                        >
                                                          <span className="text-ink-2 font-medium truncate flex items-center gap-1.5">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                                                            {picName}
                                                          </span>
                                                          <span className="text-2xs text-ink-3">Phối hợp</span>
                                                        </div>
                                                      ))
                                                    )}
                                                  </div>

                                                  {store.assignmentNotes && (
                                                    <div className="mt-2 p-1.5 bg-warning-soft rounded text-2xs text-warning border border-warning/20/60 line-clamp-2">
                                                      {store.assignmentNotes}
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            )}

                                            {/* Sub-branch 2: SẢN PHẨM & STORE SKUs */}
                                            {showProductBranches && (
                                              <div className="relative">
                                                <div className="absolute -left-8 top-5 w-8 h-0.5 bg-accent-soft" />

                                                <div className="w-full sm:w-72 bg-white border border-accent/20 rounded-xl p-3 shadow-xs">
                                                  <div className="flex items-center justify-between pb-2 border-b border-accent/20">
                                                    <span className="text-2xs font-semibold text-accent flex items-center gap-1">
                                                      <Package className="w-3 h-3 text-accent" />
                                                      STORE SKUS MAPPING ({store.storeProducts.length})
                                                    </span>
                                                    <span className="text-2xs text-ink-3">
                                                      ID sàn riêng
                                                    </span>
                                                  </div>

                                                  <div className="mt-2 space-y-2">
                                                    {store.storeProducts.map(prod => (
                                                      <div
                                                        key={prod.platformProductId}
                                                        onClick={() => setSelectedNode({ type: 'PRODUCT', data: { ...prod, storeName: store.storeName, platform: store.platform } })}
                                                        className="p-2 bg-canvas hover:bg-accent-soft rounded-lg border border-line transition cursor-pointer"
                                                      >
                                                        <div className="flex items-center justify-between">
                                                          <span className="text-2xs font-semibold .5 text-accent -accent/20">
                                                            {prod.isHeroSku ? 'HERO SKU' : 'CORE SKU'}
                                                          </span>
                                                          <span className="text-2xs font-mono text-positive font-semibold">
                                                            {prod.commissionRate}% hoa hồng
                                                          </span>
                                                        </div>

                                                        <div className="text-2xs font-semibold text-ink mt-1 truncate">
                                                          {prod.productName}
                                                        </div>

                                                        {/* Highlighting the Core Logic: Platform Product ID vs Master SKU */}
                                                        <div className="mt-1.5 p-1.5 bg-white rounded text-2xs space-y-0.5 border border-line">
                                                          <div className="flex items-center justify-between">
                                                            <span className="text-ink-3">Store Item ID:</span>
                                                            <span className="font-mono text-accent font-semibold truncate">
                                                              {prod.platformProductId}
                                                            </span>
                                                          </div>
                                                          <div className="flex items-center justify-between">
                                                            <span className="text-ink-3">Master SKU:</span>
                                                            <span className="font-mono text-ink-2 truncate">
                                                              {prod.masterSku}
                                                            </span>
                                                          </div>
                                                        </div>

                                                        <div className="mt-1 text-2xs text-ink-3 flex items-center justify-between">
                                                          <span>Giá shop: <strong className="text-ink">{prod.storePrice.toLocaleString('vi-VN')} đ</strong></span>
                                                          <a
                                                            href={prod.platformUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-accent hover:underline flex items-center gap-0.5 text-2xs font-medium"
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
          <div className="bg-white border border-line rounded-xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent-soft border border-accent/20 flex items-center justify-center text-accent font-semibold">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-ink">
                    Bảng điều khiển Master Data
                  </h4>
                </div>
              </div>

              {selectedNode && (
                <span className="text-2xs font-semibold text-ink-2 -line font-mono">
                  {selectedNode.type}
                </span>
              )}
            </div>

            {/* Content for Selected Node */}
            <div className="mt-4 text-xs">
              {!selectedNode ? (
                <div className="p-6 text-center text-ink-3">
                  Chọn một đối tượng trên sơ đồ để xem thông tin chi tiết.
                </div>
              ) : selectedNode.type === 'STORE' ? (
                <div className="space-y-4">
                  {/* Store Header */}
                  <div>
                    <div className="flex items-center justify-between">
                      {renderPlatformBadge(selectedNode.data.platform)}
                      <span className="text-2xs font-mono text-ink-3">
                        ID: {selectedNode.data.storeId}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-ink mt-1.5">
                      {selectedNode.data.storeName}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 text-2xs text-ink-3">
                      <BrandAvatar brandId={selectedNode.data.brandId} brandName={selectedNode.data.brandName} size={18} />
                      <span>Thuộc Brand: <strong className="text-ink">{selectedNode.data.brandName}</strong></span>
                    </div>
                  </div>

                  {/* Section: Phân Công PIC Chính & Phân Quyền */}
                  <div className="p-3.5 bg-warning-soft border border-warning/20 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xs font-semibold text-warning flex items-center gap-1.5">
                        <Crown className="w-4 h-4 text-warning" />
                        Trách nhiệm & PIC chính
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
                        className="px-2.5 py-1 bg-white hover:bg-warning-soft text-warning border border-warning/20 rounded-lg text-2xs font-semibold flex items-center gap-1 transition shadow-2xs"
                      >
                        <Edit3 className="w-3 h-3" /> Đổi PIC
                      </button>
                    </div>

                    <div className="p-2.5 bg-white rounded-lg border border-warning/20 flex items-center justify-between shadow-2xs">
                      <div>
                        <div className="text-2xs text-ink-3">1 PIC chính phụ trách:</div>
                        <div className="text-xs font-semibold text-ink flex items-center gap-1.5 mt-0.5">
                          <span className=".5 text-2xs font-semibold text-warning -warning/20">PIC CHÍNH</span>
                          <span>{selectedNode.data.primaryPic}</span>
                        </div>
                      </div>
                      <span className="text-2xs font-semibold text-warning -warning/20">
                        Lead Shop
                      </span>
                    </div>

                    <div className="mt-2.5 space-y-1">
                      <div className="text-2xs text-ink-2 font-semibold">
                        Nhân sự phối hợp ({selectedNode.data.memberPics.length}):
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedNode.data.memberPics.map((pName: string, i: number) => (
                          <span
                            key={i}
                            className="bg-white text-ink-2 -line text-2xs"
                          >
                            {pName}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Financial Targets */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 bg-canvas border border-line rounded-xl">
                      <div className="text-2xs text-ink-3 font-semibold">Ngân sách tháng</div>
                      <div className="text-sm font-semibold text-ink mt-1">
                        {(selectedNode.data.monthlyBudget / 1000000).toFixed(0)} Triệu đ
                      </div>
                    </div>
                    <div className="p-3 bg-canvas border border-line rounded-xl">
                      <div className="text-2xs text-ink-3 font-semibold">Target GMV</div>
                      <div className="text-sm font-semibold text-positive mt-1">
                        {(selectedNode.data.monthlyTargetGmv / 1000000).toFixed(0)} Triệu đ
                      </div>
                    </div>
                  </div>

                  {/* Store Products List */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-ink mb-2">
                      <span className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-accent" />
                        Danh Mục Sản Phẩm Đang Bán ({selectedNode.data.storeProducts.length})
                      </span>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {selectedNode.data.storeProducts.map((p: StoreProductSkuMap) => (
                        <div key={p.platformProductId} className="p-2.5 bg-canvas border border-line rounded-xl">
                          <div className="flex items-center justify-between text-2xs">
                            <span className="font-semibold text-ink truncate max-w-[170px]">{p.productName}</span>
                            <span className="text-positive font-semibold">{p.commissionRate}% comm</span>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-2xs text-ink-3 font-mono">
                            <span>Sàn ID: <strong className="text-accent font-semibold">{p.platformProductId}</strong></span>
                            <span>Giá: {p.storePrice.toLocaleString('vi-VN')} đ</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-line flex items-center gap-2">
                    {onOpenQuickBookWithBrand && (
                      <button
                        onClick={() => onOpenQuickBookWithBrand(selectedNode.data.brandName)}
                        className="flex-1 py-2 bg-accent hover:bg-accent text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Mở lập Plan cho gian hàng này</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : selectedNode.type === 'PRODUCT' ? (
                <div className="space-y-4">
                  <div>
                    <span className="text-2xs font-semibold text-accent -accent/20">
                      Sản phẩm & store SKU mapping
                    </span>
                    <h3 className="text-sm font-semibold text-ink mt-2">
                      {selectedNode.data.productName}
                    </h3>
                    <div className="text-2xs text-ink-3 mt-0.5">
                      Đang bán tại gian: <strong className="text-ink">{selectedNode.data.storeName}</strong>
                    </div>
                  </div>

                  <div className="p-3 bg-accent-soft border border-accent/20 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-2xs">
                      <span className="text-ink-2">Store Item ID sàn:</span>
                      <span className="font-mono text-accent font-semibold">{selectedNode.data.platformProductId}</span>
                    </div>
                    <div className="flex items-center justify-between text-2xs">
                      <span className="text-ink-2">Mã Master SKU gốc:</span>
                      <span className="font-mono text-ink">{selectedNode.data.masterSku}</span>
                    </div>
                    <div className="flex items-center justify-between text-2xs">
                      <span className="text-ink-2">Giá bán tại gian này:</span>
                      <span className="font-semibold text-ink">{selectedNode.data.storePrice.toLocaleString('vi-VN')} đ</span>
                    </div>
                    <div className="flex items-center justify-between text-2xs">
                      <span className="text-ink-2">Tỷ lệ hoa hồng affiliate:</span>
                      <span className="font-semibold text-positive">{selectedNode.data.commissionRate}%</span>
                    </div>
                  </div>


                </div>
              ) : selectedNode.type === 'BRAND' ? (
                <div className="space-y-4">
                  <div>
                    <span className="text-2xs font-semibold text-accent -accent/20">
                      BRAND TỔNG
                    </span>
                    <h3 className="text-sm font-semibold text-ink mt-2">
                      {selectedNode.data.name}
                    </h3>
                    <div className="text-2xs text-ink-3">
                      {selectedNode.data.companyName}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 bg-canvas border border-line rounded-xl">
                      <div className="text-2xs text-ink-3 font-semibold">Ngân sách Brand</div>
                      <div className="text-sm font-semibold text-accent mt-1">
                        {formatVndShort(selectedNode.data.planBudget || 0)}
                      </div>
                    </div>
                    <div className="p-3 bg-canvas border border-line rounded-xl">
                      <div className="text-2xs text-ink-3 font-semibold">Tổng Target GMV</div>
                      <div className="text-sm font-semibold text-positive mt-1">
                        {formatVndShort(selectedNode.data.targetGmv || 0)}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-canvas border border-line rounded-xl space-y-1.5 text-2xs">
                    <div className="text-ink-2">Account PIC: <strong className="text-ink">{selectedNode.data.accountPic || 'Chưa gán'}</strong></div>
                    <div className="text-ink-2">Booking Lead: <strong className="text-ink">{selectedNode.data.bookingPicLead || 'Đặng Thị Yến Nhi'}</strong></div>
                  </div>

                  {/* Danh sách gian hàng sàn trực thuộc Brand */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-ink mb-2">
                      <span className="flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-accent" />
                        Gian hàng sàn trực thuộc ({stores.filter(s => s.brandId === selectedNode.data.id).length})
                      </span>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {stores.filter(s => s.brandId === selectedNode.data.id).map(st => (
                        <div
                          key={st.id}
                          onClick={() => setSelectedNode({ type: 'STORE', data: st })}
                          className="p-2.5 bg-canvas hover:bg-accent-soft rounded-xl border border-line transition cursor-pointer"
                        >
                          <div className="flex items-center justify-between text-2xs mb-1">
                            {renderPlatformBadge(st.platform)}
                            <span className="font-semibold text-ink">{formatVndShort(st.monthlyBudget)}</span>
                          </div>
                          <div className="font-semibold text-xs text-ink truncate">
                            {st.storeName}
                          </div>
                          <div className="text-2xs text-ink-3 mt-1 flex items-center justify-between">
                            <span>1 PIC Chính: <strong className="text-warning">{st.primaryPic}</strong></span>
                            <span className="text-accent flex items-center gap-0.5 font-medium">Chi tiết <ChevronRight className="w-2.5 h-2.5" /></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-ink">Tổng quan Master Data toàn hệ thống</h3>
                  
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: CHỈNH SỬA / ĐỔI PIC CHÍNH VÀ NHÂN SỰ CỦA GIAN HÀNG */}
      <Modal
        open={Boolean(isEditingStorePic && editingStoreForm)}
        onClose={() => setIsEditingStorePic(false)}
        title="Phân công PIC chính & đội ngũ gian hàng"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="ghost"
              onClick={() => setIsEditingStorePic(false)}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              icon={CheckCircle2}
              onClick={handleSaveStoreAssignment}
            >
              Lưu phân công Master Data
            </Button>
          </div>
        }
      >
        {isEditingStorePic && editingStoreForm && (
          <div className="space-y-4 text-xs">
            {/* 1 PIC Chính (Primary Store PIC) */}
            <div>
              <label className="block text-ink-2 font-semibold mb-1.5 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-warning" />
                <span>1 PIC chính phụ trách (bắt buộc chọn 1 người):</span>
              </label>
              <select
                value={editingStoreForm.primaryPic}
                onChange={e => {
                  const newPrimary = e.target.value;
                  setEditingStoreForm(prev => {
                    if (!prev) return null;
                    const updatedMembers = prev.memberPics.filter(m => m !== newPrimary);
                    return {
                      ...prev,
                      primaryPic: newPrimary,
                      memberPics: updatedMembers
                    };
                  });
                }}
                className="w-full bg-white border border-warning/20 text-warning font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-warning/20 focus:border-warning/20"
              >
                {allPicOptions.map(staff => (
                  <option key={staff} value={staff}>{staff} (Lead PIC Gian Hàng)</option>
                ))}
              </select>
            </div>

            {/* Nhân sự phối hợp (Multi-select) */}
            <div>
              <label className="block text-ink-2 font-semibold mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-accent" />
                <span>Các nhân sự phối hợp / cùng làm Shop:</span>
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-canvas rounded-xl border border-line">
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
                        className={`p-2 rounded-lg text-left text-2xs font-medium border flex items-center justify-between transition ${
                          isSelected
                            ? 'bg-accent-soft border-accent/20 text-accent font-semibold'
                            : 'bg-white border-line text-ink-2 hover:text-ink hover:bg-sunken'
                        }`}
                      >
                        <span className="truncate">{staff}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Ghi chú phân chia */}
            <div>
              <label className="block text-ink-2 font-semibold mb-1.5">
                Ghi chú phân chia trách nhiệm giữa các PICs:
              </label>
              <textarea
                rows={3}
                value={editingStoreForm.assignmentNotes}
                onChange={e => setEditingStoreForm(prev => prev ? { ...prev, assignmentNotes: e.target.value } : null)}
                placeholder="Ví dụ: PIC chính quản lý budget tổng và KOC Celeb; bạn B làm KOC Mass; bạn C làm Livestream..."
                className="w-full bg-white border border-line-strong text-ink rounded-xl p-2.5 placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/20 text-xs"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
