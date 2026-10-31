'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Package, RefreshCw } from 'lucide-react';
import type { BookingDealItem, StorePortfolioItem } from '../../lib/types';
import { formatVnd } from '../../lib/format';
import { INITIAL_BRAND_KNOWLEDGE_BASES, INITIAL_PUSH_PRODUCTS } from '../../lib/mockData';
import { REAL_B2C_42_BRANDS } from '../../lib/realB2cBrandsData';
import { findBrandProfile, useBrandProfiles } from '../../lib/brands/useBrandProfiles';
import { brandKey, type BrandProfile } from '../../lib/brands/types';
import {
  EMPTY_PRODUCT_CATALOG,
  mergeBrandSourcesIntoCatalog,
  sanitizeProductCatalog,
  type BrandProductCatalog,
  type BrandProfileProductSource,
  type CatalogProduct,
  type ProductGroup,
} from '../../lib/productCatalog';

/**
 * Danh mục SKU & Combo tiêu chuẩn theo Brand phòng B2C (dùng làm dữ liệu nền khi Brand
 * chưa lưu danh mục riêng trong /api/product-catalog, đảm bảo 100% gian hàng có sẵn Dropdown SP).
 */
const B2C_BRAND_STANDARD_PRODUCTS: Record<
  string,
  Array<{
    name: string;
    sku: string;
    size?: string;
    priceVnd?: number;
    isCombo?: boolean;
  }>
> = {
  bella: [
    {
      name: 'Dung dịch vệ sinh phụ nữ Bella Gentle Care 150ml',
      sku: 'BELLA-DDVS-150',
      size: 'Chai 150ml',
      priceVnd: 165000,
    },
    {
      name: 'Bọt vệ sinh phụ nữ Bella Dịu Nhẹ Kháng Khuẩn 100ml',
      sku: 'BELLA-FOAM-100',
      size: 'Chai 100ml',
      priceVnd: 149000,
    },
    {
      name: 'Khăn ướt vệ sinh phụ nữ Bella Intimate Wipes (Gói 20 tờ)',
      sku: 'BELLA-WIPE-20',
      size: 'Gói 20 tờ',
      priceVnd: 65000,
    },
    {
      name: 'Combo 2 Chai Dung dịch vệ sinh Bella + Tặng Khăn ướt Intimate',
      sku: 'BELLA-CB-01',
      size: 'Combo 2 chai + quà',
      priceVnd: 299000,
      isCombo: true,
    },
    {
      name: 'Combo Sản phẩm Chủ lực BELLA Chăm sóc toàn diện',
      sku: 'SKU-BELLA-01',
      size: 'Bộ tiêu chuẩn',
      priceVnd: 250000,
      isCombo: true,
    },
  ],
  '4pm': [
    {
      name: 'Áo thun Polo 4PM Form Regular chống nhăn',
      sku: '4PM-POLO-01',
      size: 'Size M/L/XL/2XL',
      priceVnd: 249000,
    },
    {
      name: 'Quần âu ống đứng 4PM Casual co giãn nhẹ',
      sku: '4PM-PANT-02',
      size: 'Size 29-34',
      priceVnd: 329000,
    },
    {
      name: 'Áo sơ mi Oxford 4PM tay dài Basic',
      sku: '4PM-SHIRT-03',
      size: 'Size M/L/XL',
      priceVnd: 279000,
    },
    {
      name: 'Quần Short Kaki 4PM Basic năng động',
      sku: '4PM-SHORT-04',
      size: 'Size 29-34',
      priceVnd: 199000,
    },
    {
      name: 'Combo Set đồ nam 4PM (Áo Polo + Quần âu Casual)',
      sku: 'SKU-4PM-01',
      size: 'Combo 2 món',
      priceVnd: 499000,
      isCombo: true,
    },
  ],
  kutieskin: [
    {
      name: 'Kem mẩn ngứa - hăm Kutieskin cho bé 30g',
      sku: 'KUTI-MAN-30G',
      size: 'Tuýp 30g',
      priceVnd: 96000,
    },
    {
      name: 'Kem chàm sữa Kutieskin 30g dịu da cho bé',
      sku: 'KUTI-CHAM-30G',
      size: 'Tuýp 30g',
      priceVnd: 205000,
    },
    {
      name: 'Kem dưỡng ẩm hàng ngày Kutieskin 30g',
      sku: 'KUTI-DUONG-30G',
      size: 'Tuýp 30g',
      priceVnd: 105000,
    },
    {
      name: 'Nước tắm gội thảo dược Kutieskin 200ml',
      sku: 'KUTI-TAM-200ML',
      size: 'Chai 200ml',
      priceVnd: 168000,
    },
    {
      name: 'Combo Bộ đôi Chăm sóc da bé Kutieskin (Kem mẩn ngứa + Kem dưỡng ẩm)',
      sku: 'KUTI-CB-DOI',
      size: 'Combo 2 tuýp',
      priceVnd: 189000,
      isCombo: true,
    },
  ],
  clubclio: [
    {
      name: 'Phấn nước Clio Kill Cover Mesh Glow Cushion SPF50+ PA++++',
      sku: 'CLIO-CUSH-GLOW',
      size: 'Hộp 15g + Lõi phụ',
      priceVnd: 549000,
    },
    {
      name: 'Phấn nước Clio Kill Cover The New Founwear Cushion',
      sku: 'CLIO-CUSH-NEW',
      size: 'Hộp 15g + Lõi phụ',
      priceVnd: 529000,
    },
    {
      name: 'Bảng phấn mắt 12 ô Clio Pro Eye Palette Air',
      sku: 'CLIO-EYE-AIR',
      size: 'Bảng 12 ô',
      priceVnd: 469000,
    },
    {
      name: 'Son tint bóng Clio Crystal Glam Tint',
      sku: 'CLIO-TINT-GLAM',
      size: 'Thỏi 3.4g',
      priceVnd: 289000,
    },
    {
      name: 'Kẻ mắt nước chống trôi Clio Superproof Pen Liner',
      sku: 'CLIO-LINER-01',
      size: 'Cây 0.55ml',
      priceVnd: 239000,
    },
  ],
  peripera: [
    {
      name: 'Son tint bóng Peripera Ink Mood Glowy Tint',
      sku: 'PERI-GLOWY-01',
      size: 'Thỏi 4g',
      priceVnd: 189000,
    },
    {
      name: 'Son kem lì mịn môi Peripera Ink Velvet',
      sku: 'PERI-VELVET-02',
      size: 'Thỏi 4g',
      priceVnd: 169000,
    },
    {
      name: 'Phấn má hồng Peripera Pure Blushed Sunshine Cheek',
      sku: 'PERI-CHEEK-03',
      size: 'Hộp 4.2g',
      priceVnd: 145000,
    },
  ],
  goodal: [
    {
      name: 'Serum mờ thâm sáng da Goodal Green Tangerine Vita C Dark Spot Care',
      sku: 'GOODAL-VITAC-SRM',
      size: 'Chai 40ml',
      priceVnd: 459000,
    },
    {
      name: 'Kem dưỡng sáng da Goodal Green Tangerine Vita C Cream',
      sku: 'GOODAL-VITAC-CRM',
      size: 'Hũ 50ml',
      priceVnd: 429000,
    },
    {
      name: 'Toner Pad tẩy tế bào chết dịu nhẹ Goodal Vita C (Hộp 70 miếng)',
      sku: 'GOODAL-VITAC-PAD',
      size: 'Hộp 70 miếng',
      priceVnd: 389000,
    },
  ],
  dermatory: [
    {
      name: 'Toner Pad làm dịu da mụn Dermatory Hypoallergenic Cica Rescue Gauze Pad',
      sku: 'DERM-CICA-PAD',
      size: 'Hộp 60 miếng',
      priceVnd: 369000,
    },
    {
      name: 'Kem dưỡng phục hồi Dermatory Hypoallergenic Cica Cream',
      sku: 'DERM-CICA-CRM',
      size: 'Tuýp 50ml',
      priceVnd: 319000,
    },
  ],
  klairs: [
    {
      name: 'Nước hoa hồng Dear, Klairs Supple Preparation Unscented Toner 180ml',
      sku: 'KLAIRS-TONER-180',
      size: 'Chai 180ml',
      priceVnd: 315000,
    },
    {
      name: 'Kem dưỡng làm dịu da Dear, Klairs Midnight Blue Calming Cream 60ml',
      sku: 'KLAIRS-BLUE-60',
      size: 'Tuýp 60ml',
      priceVnd: 435000,
    },
    {
      name: 'Tinh chất sáng da Dear, Klairs Freshly Juiced Vitamin Drop 35ml',
      sku: 'KLAIRS-VITC-35',
      size: 'Chai 35ml',
      priceVnd: 355000,
    },
  ],
  skin1004: [
    {
      name: 'Tinh chất rau má Skin1004 Madagascar Centella Ampoule 100ml',
      sku: 'S1004-AMP-100',
      size: 'Chai 100ml',
      priceVnd: 385000,
    },
    {
      name: 'Kem chống nắng nâng tông Skin1004 Centella Air-Fit Suncream Plus 50ml',
      sku: 'S1004-SUN-50',
      size: 'Chai 50ml',
      priceVnd: 315000,
    },
    {
      name: 'Dầu tẩy trang rau má Skin1004 Madagascar Centella Light Cleansing Oil 200ml',
      sku: 'S1004-OIL-200',
      size: 'Chai 200ml',
      priceVnd: 365000,
    },
  ],
  simplus: [
    {
      name: 'Nồi chiên không dầu Simplus 4.5L chống dính đa năng',
      sku: 'SIMP-AF-45L',
      size: 'Dung tích 4.5L',
      priceVnd: 699000,
    },
    {
      name: 'Máy sấy tóc ion âm Simplus 1600W gấp gọn',
      sku: 'SIMP-DRY-1600',
      size: 'Công suất 1600W',
      priceVnd: 259000,
    },
    {
      name: 'Bàn ủi hơi nước cầm tay Simplus 1200W',
      sku: 'SIMP-IRON-1200',
      size: 'Công suất 1200W',
      priceVnd: 329000,
    },
    {
      name: 'Máy hút bụi cầm tay lực hút mạnh Simplus',
      sku: 'SIMP-VAC-01',
      size: 'Bản tiêu chuẩn',
      priceVnd: 459000,
    },
  ],
  rejuran: [
    {
      name: 'Tinh chất phục hồi chuyên sâu Rejuran Healer Turnover Ampoule 30ml',
      sku: 'REJU-AMP-30',
      size: 'Chai 30ml',
      priceVnd: 890000,
    },
    {
      name: 'Kem dưỡng tái tạo da Rejuran Turnover Active Cream 50ml',
      sku: 'REJU-CRM-50',
      size: 'Tuýp 50ml',
      priceVnd: 650000,
    },
    {
      name: 'Kem chống nắng phổ rộng Rejuran UV Protection Cream SPF50+',
      sku: 'REJU-SUN-50',
      size: 'Tuýp 50ml',
      priceVnd: 490000,
    },
  ],
  loccitane: [
    {
      name: 'Dầu tắm hạnh nhân L’Occitane Almond Shower Oil 250ml',
      sku: 'LOCC-ALM-250',
      size: 'Chai 250ml',
      priceVnd: 750000,
    },
    {
      name: 'Kem dưỡng da tay bơ đậu mỡ L’Occitane Shea Butter Hand Cream 30ml',
      sku: 'LOCC-HAND-30',
      size: 'Tuýp 30ml',
      priceVnd: 310000,
    },
    {
      name: 'Dầu gội phục hồi hư tổn L’Occitane Intensive Repair Shampoo 300ml',
      sku: 'LOCC-SHAMP-300',
      size: 'Chai 300ml',
      priceVnd: 820000,
    },
  ],
  cindybloom: [
    {
      name: 'Nước hoa nữ Cindy Bloom Urban Vibes Eau De Parfum 50ml',
      sku: 'CB-EDP-URBAN',
      size: 'Chai 50ml',
      priceVnd: 265000,
    },
    {
      name: 'Xịt thơm toàn thân Cindy Bloom Romantic Muse Body Mist 105ml',
      sku: 'CB-MIST-MUSE',
      size: 'Chai 105ml',
      priceVnd: 139000,
    },
    {
      name: 'Sữa tắm hương nước hoa Cindy Bloom Aroma Shower Gel 640g',
      sku: 'CB-SHOWER-640',
      size: 'Chai 640g',
      priceVnd: 175000,
    },
  ],
  byebyeblemish: [
    {
      name: 'Chấm mụn lưu huỳnh qua đêm Bye Bye Blemish Drying Lotion 29ml',
      sku: 'BBB-DRY-29ML',
      size: 'Lọ 29ml',
      priceVnd: 265000,
    },
    {
      name: 'Gel chấm mụn tràm trà Bye Bye Blemish Tea Tree Drying Lotion',
      sku: 'BBB-TEATREE-29',
      size: 'Lọ 29ml',
      priceVnd: 275000,
    },
    {
      name: 'Miếng dán mụn vô hình Bye Bye Blemish Microneedling Blemish Patch',
      sku: 'BBB-PATCH-01',
      size: 'Hộp 24 miếng',
      priceVnd: 159000,
    },
  ],
  baniphar: [
    {
      name: 'Viên uống bổ sung sắt hữu cơ Baniphar Ferrous Plus (Hộp 30 viên)',
      sku: 'BANI-FER-30',
      size: 'Hộp 30 viên',
      priceVnd: 245000,
    },
    {
      name: 'Dung dịch xịt họng keo ong kháng khuẩn Baniphar Propolis Spray 30ml',
      sku: 'BANI-SPRAY-30',
      size: 'Chai 30ml',
      priceVnd: 135000,
    },
    {
      name: 'Combo Chăm sóc đề kháng gia đình Baniphar Chính Hãng',
      sku: 'BANI-CB-01',
      size: 'Combo 2 hộp',
      priceVnd: 350000,
      isCombo: true,
    },
  ],
  eupc: [
    {
      name: 'Sữa rửa mặt dịu nhẹ EUPC Dermatological Cleansing Gel 200ml',
      sku: 'EUPC-GEL-200',
      size: 'Chai 200ml',
      priceVnd: 345000,
    },
    {
      name: 'Kem dưỡng phục hồi hàng rào bảo vệ da EUPC Barrier Repair Cream 50ml',
      sku: 'EUPC-CRM-50',
      size: 'Tuýp 50ml',
      priceVnd: 420000,
    },
    {
      name: 'Kem chống nắng phổ rộng kiềm dầu EUPC Mattifying Fluid SPF50+',
      sku: 'EUPC-SUN-50',
      size: 'Tuýp 50ml',
      priceVnd: 465000,
    },
  ],
  mine: [
    {
      name: 'Tinh chất cấp ẩm phục hồi Mine Hyaluronic B5 Serum 30ml',
      sku: 'MINE-B5-30',
      size: 'Chai 30ml',
      priceVnd: 289000,
    },
    {
      name: 'Kem dưỡng khóa ẩm mỏng nhẹ Mine Soothing Gel Cream 50g',
      sku: 'MINE-CRM-50',
      size: 'Hũ 50g',
      priceVnd: 319000,
    },
    {
      name: 'Combo Routine Cấp ẩm & Phục hồi da Mine (Serum B5 + Gel Cream)',
      sku: 'MINE-CB-ROUTINE',
      size: 'Combo 2 món',
      priceVnd: 549000,
      isCombo: true,
    },
  ],
};

// Bộ nhớ đệm danh mục sản phẩm lấy từ /api/product-catalog?brand=... theo khóa Brand
const brandCatalogMemoryCache = new Map<string, BrandProductCatalog>();
const brandCatalogInflight = new Map<string, Promise<BrandProductCatalog | null>>();

export async function fetchBrandCatalogByBrandName(
  brandName: string,
  force = false
): Promise<BrandProductCatalog | null> {
  const cleanBrand = brandName.trim();
  if (!cleanBrand) return null;
  const bKey = brandKey(cleanBrand);
  if (!force && brandCatalogMemoryCache.has(bKey)) {
    return brandCatalogMemoryCache.get(bKey)!;
  }
  if (!force && brandCatalogInflight.has(bKey)) {
    return brandCatalogInflight.get(bKey)!;
  }

  const req = fetch(`/api/product-catalog?brand=${encodeURIComponent(cleanBrand)}`, {
    cache: 'no-store',
  })
    .then(async (res) => {
      if (!res.ok) return null;
      const body = (await res.json().catch(() => null)) as {
        data?: Partial<BrandProductCatalog>;
      } | null;
      if (!body?.data) return null;
      const sanitized = sanitizeProductCatalog(body.data);
      brandCatalogMemoryCache.set(bKey, sanitized);
      return sanitized;
    })
    .catch(() => null)
    .finally(() => {
      brandCatalogInflight.delete(bKey);
    });

  brandCatalogInflight.set(bKey, req);
  return req;
}

export interface BrandCatalogProductOption {
  id: string;
  name: string;
  sku: string;
  groupName: string;
  productType: 'SINGLE' | 'HARD_BUNDLE' | 'ROUTINE_COMBO';
  role: 'HERO' | 'ENTRY' | 'ADDON' | 'GIFT';
  priceVnd: number | null;
  status: 'ACTIVE' | 'OUT_OF_STOCK' | 'STOPPED';
  sampleQuota: number | null;
  size?: string;
}

export interface BrandCatalogGroupOption {
  groupId: string;
  groupName: string;
  items: BrandCatalogProductOption[];
}

/**
 * Tổng hợp đồng bộ Danh mục Sản phẩm (Nhóm SP -> Sản phẩm/Combo) của một Brand
 * từ phân hệ Sản phẩm (/api/product-catalog), Hồ sơ Brand (/api/brands/profiles),
 * INITIAL_PUSH_PRODUCTS, REAL_B2C_42_BRANDS và danh mục gian hàng.
 */
export function buildBrandProductCatalogGroups(params: {
  brandName?: string;
  storeName?: string;
  storeObj?: StorePortfolioItem | null;
  deals?: BookingDealItem[];
  brandProfiles?: BrandProfile[];
  remoteCatalog?: BrandProductCatalog | null;
}): {
  resolvedBrandName: string;
  groups: BrandCatalogGroupOption[];
  flatOptions: BrandCatalogProductOption[];
} {
  const { brandName, storeName, storeObj, deals = [], brandProfiles = [], remoteCatalog } = params;

  const rawBrand =
    (brandName || storeObj?.brandName || storeName?.split(/[—\-_]/)[0] || '').trim();
  const bKey = brandKey(rawBrand);
  const bCompact = rawBrand.toLowerCase().replace(/[^a-z0-9]/g, '');

  // 1. Lấy sản phẩm từ Hồ sơ Brand (BrandProfile.products)
  const matchedProfile = findBrandProfile(brandProfiles, rawBrand);
  const profileSources: BrandProfileProductSource[] = [];
  const seenSourceNames = new Set<string>();

  const pushSource = (src: BrandProfileProductSource) => {
    const nk = src.name.trim().toLowerCase();
    if (!nk || seenSourceNames.has(nk)) return;
    seenSourceNames.add(nk);
    profileSources.push(src);
  };

  (matchedProfile?.products || []).forEach((p) => {
    pushSource({
      id: p.id,
      name: p.name,
      skuCode: p.skuCode,
      size: p.size,
      priceVnd: p.priceVnd,
      dealPriceVnd: p.dealPriceVnd,
      commissionOrganicPct: p.commissionOrganicPct,
      commissionAdsPct: p.commissionAdsPct,
      sampleStockStatus: p.sampleStockStatus,
      pdpUrl: p.pdpUrl,
      usps: p.usps,
      mechanism: p.mechanism,
      ingredients: p.ingredients,
      usageInstruction: p.usageInstruction,
      targetUser: p.targetUser,
      contraindications: p.contraindications,
    });
  });

  // 2. Nạp từ INITIAL_BRAND_KNOWLEDGE_BASES nếu có
  INITIAL_BRAND_KNOWLEDGE_BASES.forEach((kb) => {
    if (brandKey(kb.brandName) === bKey) {
      (kb.skus || []).forEach((s) => {
        pushSource({
          id: s.id,
          name: s.name,
          skuCode: s.skuCode,
          size: s.volumeOrWeight,
          priceVnd: s.priceVnd,
          sampleStockStatus:
            s.sampleStockCount && s.sampleStockCount <= 0 ? 'OUT_OF_STOCK' : 'IN_STOCK',
          pdpUrl: s.pdpUrl,
          usps: s.uniqueSellingPoints,
        });
      });
    }
  });

  // 3. Nạp từ B2C_BRAND_STANDARD_PRODUCTS (đảm bảo mọi Brand như BELLA, 4PM, Kutieskin... có đủ SKU đơn & Combo)
  Object.entries(B2C_BRAND_STANDARD_PRODUCTS).forEach(([key, list]) => {
    if (bCompact.includes(key) || (storeName || '').toLowerCase().replace(/[^a-z0-9]/g, '').includes(key)) {
      list.forEach((it, idx) => {
        pushSource({
          id: `std-${key}-${idx + 1}`,
          name: it.name,
          skuCode: it.sku,
          size: it.size,
          priceVnd: it.priceVnd,
          sampleStockStatus: 'IN_STOCK',
        });
      });
    }
  });

  // 4. Nạp từ REAL_B2C_42_BRANDS (heroProducts)
  const masterBrand = REAL_B2C_42_BRANDS.find(
    (b) => brandKey(b.name) === bKey || brandKey(b.code) === bKey
  );
  (masterBrand?.heroProducts || []).forEach((hp, idx) => {
    pushSource({
      id: hp.id || `hero-${bKey}-${idx + 1}`,
      name: hp.productName,
      skuCode: hp.sku,
      priceVnd: hp.price,
      sampleStockStatus: hp.sampleAvailable === false ? 'OUT_OF_STOCK' : 'IN_STOCK',
      pdpUrl: hp.pdpUrl,
    });
  });

  // 5. Nạp từ mainProducts của Gian hàng
  (storeObj?.mainProducts || []).forEach((mpName, idx) => {
    if (mpName?.trim()) {
      pushSource({
        id: `store-mp-${bKey}-${idx + 1}`,
        name: mpName.trim(),
        skuCode: `${(rawBrand || 'SKU').toUpperCase().replace(/[^A-Z0-9]/g, '')}-0${idx + 1}`,
        sampleStockStatus: 'IN_STOCK',
      });
    }
  });

  // 6. Nạp thêm từ các Deal đã chạy của Brand
  deals.forEach((d, idx) => {
    if (
      d.brandName &&
      rawBrand &&
      brandKey(d.brandName) === bKey &&
      d.productName?.trim()
    ) {
      pushSource({
        id: `deal-prd-${idx + 1}`,
        name: d.productName.trim(),
        skuCode: '',
        sampleStockStatus: 'IN_STOCK',
      });
    }
  });

  // 7. Nếu Brand chưa có bất kỳ SKU cụ thể nào, tạo bộ sản phẩm chuẩn theo tên Brand
  if (profileSources.length === 0 && rawBrand) {
    const codePrefix = rawBrand.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'BRAND';
    pushSource({
      id: `default-hero-${bKey}`,
      name: `Sản phẩm chủ lực ${rawBrand} Chính Hãng`,
      skuCode: `${codePrefix}-HERO-01`,
      priceVnd: 280000,
      sampleStockStatus: 'IN_STOCK',
    });
    pushSource({
      id: `default-combo-${bKey}`,
      name: `Combo bán chạy chiến dịch ${rawBrand}`,
      skuCode: `${codePrefix}-CB-02`,
      priceVnd: 450000,
      sampleStockStatus: 'IN_STOCK',
    });
  }

  // Hợp nhất qua hàm chuẩn của phân hệ Sản phẩm (mergeBrandSourcesIntoCatalog)
  const baseCatalog = remoteCatalog || brandCatalogMemoryCache.get(bKey) || EMPTY_PRODUCT_CATALOG;
  const mergedCatalog = mergeBrandSourcesIntoCatalog(
    baseCatalog,
    rawBrand || 'Brand B2C',
    profileSources,
    [],
    INITIAL_PUSH_PRODUCTS
  );

  const groups: BrandCatalogGroupOption[] = [];
  const flatOptions: BrandCatalogProductOption[] = [];

  mergedCatalog.groups.forEach((g: ProductGroup) => {
    const items: BrandCatalogProductOption[] = (g.products || [])
      .filter((p: CatalogProduct) => p.name.trim() && p.status !== 'STOPPED')
      .map((p: CatalogProduct) => {
        const opt: BrandCatalogProductOption = {
          id: p.id,
          name: p.name.trim(),
          sku: (p.sku || '').trim(),
          groupName: g.name || 'Nhóm sản phẩm chính',
          productType: p.productType || 'SINGLE',
          role: p.role || 'HERO',
          priceVnd: p.promoPrice ?? p.originalPrice ?? null,
          status: p.status || 'ACTIVE',
          sampleQuota: p.monthlySampleQuota ?? null,
          size: p.size,
        };
        flatOptions.push(opt);
        return opt;
      });

    if (items.length > 0) {
      groups.push({
        groupId: g.id,
        groupName: g.name || 'Nhóm sản phẩm chính',
        items,
      });
    }
  });

  return {
    resolvedBrandName: matchedProfile?.brandName || masterBrand?.name || rawBrand || 'Gian hàng',
    groups,
    flatOptions,
  };
}

export interface BrandProductDropdownInputProps {
  value: string;
  onChange: (nextValue: string, selectedOption?: BrandCatalogProductOption) => void;
  brandName?: string;
  storeName?: string;
  storeObj?: StorePortfolioItem | null;
  deals?: BookingDealItem[];
  precomputedCatalog?: {
    resolvedBrandName: string;
    groups: BrandCatalogGroupOption[];
    flatOptions: BrandCatalogProductOption[];
  };
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  title?: string;
  className?: string;
}

export const BrandProductDropdownInput: React.FC<BrandProductDropdownInputProps> = ({
  value,
  onChange,
  brandName,
  storeName,
  storeObj,
  deals = [],
  precomputedCatalog,
  placeholder,
  disabled = false,
  size = 'md',
  title,
  className = '',
}) => {
  const { profiles: brandProfiles } = useBrandProfiles();
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [remoteCatalog, setRemoteCatalog] = useState<BrandProductCatalog | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [draftValue, setDraftValue] = useState(value);
  const isEditingRef = useRef(false);
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isEditingRef.current) {
      setDraftValue(value);
    }
  }, [value]);

  useEffect(() => {
    return () => {
      if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    };
  }, []);

  const boxRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 340,
  });

  const { resolvedBrandName, groups, flatOptions } = useMemo(() => {
    if (precomputedCatalog && !remoteCatalog) {
      return precomputedCatalog;
    }
    return buildBrandProductCatalogGroups({
      brandName,
      storeName,
      storeObj,
      deals,
      brandProfiles,
      remoteCatalog,
    });
  }, [precomputedCatalog, brandName, storeName, storeObj, deals, brandProfiles, remoteCatalog]);

  const updatePos = useCallback(() => {
    const el = boxRef.current;
    if (!el || typeof window === 'undefined') return;
    const rect = el.getBoundingClientRect();
    const menuWidth = Math.max(rect.width, 360);
    const spaceBelow = window.innerHeight - rect.bottom;
    const topPos =
      spaceBelow < 260 && rect.top > 280 ? Math.max(8, rect.top - 270) : rect.bottom + 4;
    setPos({
      top: topPos,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8)),
      width: menuWidth,
    });
  }, []);

  const handleLoadFromProductCatalogApi = useCallback(
    async (force = false) => {
      if (!resolvedBrandName) return;
      setSyncing(true);
      try {
        const data = await fetchBrandCatalogByBrandName(resolvedBrandName, force);
        if (data) setRemoteCatalog(data);
      } finally {
        setSyncing(false);
      }
    },
    [resolvedBrandName]
  );

  const handleOpenDropdown = useCallback(() => {
    if (disabled) return;
    setFilterQuery('');
    setOpen(true);
    void handleLoadFromProductCatalogApi(false);
  }, [disabled, handleLoadFromProductCatalogApi]);

  useEffect(() => {
    if (!open) return;
    updatePos();
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (boxRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [open, updatePos]);

  const filteredGroups = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (item) =>
            item.name.toLowerCase().includes(q) ||
            item.sku.toLowerCase().includes(q) ||
            g.groupName.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, filterQuery]);

  const resolvedPlaceholder =
    placeholder ||
    flatOptions[0]?.name ||
    'Chọn sản phẩm từ Danh mục SP...';

  const isCompact = size === 'sm';

  return (
    <div ref={boxRef} className={`relative ${className}`} title={title || draftValue}>
      <input
        type="text"
        disabled={disabled}
        value={draftValue}
        title={draftValue || resolvedPlaceholder}
        onFocus={() => {
          isEditingRef.current = true;
          handleOpenDropdown();
        }}
        onClick={handleOpenDropdown}
        onBlur={() => {
          isEditingRef.current = false;
          if (commitTimerRef.current) {
            clearTimeout(commitTimerRef.current);
            commitTimerRef.current = null;
          }
          if (draftValue !== value) {
            onChange(draftValue);
          }
        }}
        onChange={(e) => {
          const nextVal = e.target.value;
          setDraftValue(nextVal);
          setFilterQuery(nextVal);
          if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
          commitTimerRef.current = setTimeout(() => {
            commitTimerRef.current = null;
            onChange(nextVal);
          }, 180);
          if (!open && !disabled) {
            setOpen(true);
            void handleLoadFromProductCatalogApi(false);
          }
        }}
        placeholder={resolvedPlaceholder}
        className={
          isCompact
            ? 'w-full h-8 pl-3 pr-7 rounded border border-line-strong bg-surface text-xs font-medium text-ink focus:outline-none focus:border-ink disabled:bg-sunken disabled:text-ink-3'
            : 'w-full h-9 pl-3 pr-8 rounded-md border border-line-strong bg-surface text-xs text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink disabled:bg-sunken disabled:text-ink-3'
        }
      />
      <button
        type="button"
        disabled={disabled}
        tabIndex={-1}
        onClick={() => {
          if (disabled) return;
          if (open) {
            setOpen(false);
          } else {
            handleOpenDropdown();
          }
        }}
        title={`Chọn từ Danh mục Sản phẩm (${flatOptions.length} SP)`}
        className={
          isCompact
            ? 'absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-ink-3 hover:text-ink disabled:opacity-40'
            : 'absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded text-ink-3 hover:text-ink hover:bg-sunken disabled:opacity-40'
        }
      >
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180 text-ink' : ''}`}
        />
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            data-select-portal="true"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
            className="fixed z-[1300] bg-surface border border-line-strong rounded-lg shadow-lg overflow-hidden animate-fade-in"
          >
            {/* Header danh mục Sản phẩm của Brand */}
            <div className="px-3 py-2 bg-sunken border-b border-line flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Package className="w-3.5 h-3.5 text-accent shrink-0" />
                <span className="text-2xs font-semibold text-ink truncate">
                  Sản phẩm &amp; Combo — {resolvedBrandName} ({flatOptions.length})
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleLoadFromProductCatalogApi(true);
                }}
                disabled={syncing}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-line bg-surface text-2xs text-ink-2 hover:text-ink hover:bg-canvas shrink-0"
                title="Làm mới từ phân hệ Sản phẩm & Combo của Brand"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-accent' : ''}`} />
                <span>Đồng bộ SP</span>
              </button>
            </div>

            {/* Danh sách Nhóm sản phẩm -> SKU đơn & Combo */}
            <div className="max-h-64 overflow-y-auto py-1 divide-y divide-line">
              {filteredGroups.length === 0 ? (
                <div className="px-3 py-3 text-2xs text-ink-3 text-center">
                  Không tìm thấy sản phẩm khớp từ khóa. Bạn có thể giữ tên đang nhập hoặc bấm Đồng bộ SP.
                </div>
              ) : (
                filteredGroups.map((group) => (
                  <div key={group.groupId} className="py-1">
                    <div className="px-3 py-1 text-2xs font-semibold text-ink-3 bg-sunken/40 flex items-center justify-between">
                      <span className="truncate">Nhóm: {group.groupName}</span>
                      <span className="tabular-nums shrink-0">{group.items.length} SP</span>
                    </div>
                    {group.items.map((item) => {
                      const isSelected =
                        draftValue.trim().toLowerCase() === item.name.trim().toLowerCase();
                      const isCombo =
                        item.productType === 'HARD_BUNDLE' ||
                        item.productType === 'ROUTINE_COMBO';
                      const isOut = item.status === 'OUT_OF_STOCK';

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            if (commitTimerRef.current) {
                              clearTimeout(commitTimerRef.current);
                              commitTimerRef.current = null;
                            }
                            isEditingRef.current = false;
                            setDraftValue(item.name);
                            onChange(item.name, item);
                            setOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs flex items-start justify-between gap-2 transition-colors ${
                            isSelected
                              ? 'bg-sunken font-semibold text-ink'
                              : 'text-ink hover:bg-sunken/70'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="truncate">{item.name}</span>
                              <span
                                className={`px-2 py-0.2 rounded text-2xs font-medium border ${
                                  isCombo
                                    ? 'bg-accent-soft/40 text-accent border-accent/20'
                                    : 'bg-sunken text-ink-2 border-line'
                                }`}
                              >
                                {isCombo ? 'Combo' : 'SKU đơn'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-2xs text-ink-3">
                              {item.sku && <span className="font-mono">{item.sku}</span>}
                              {item.size && <span>· {item.size}</span>}
                              {item.priceVnd !== null && item.priceVnd > 0 && (
                                <span className="tabular-nums font-medium text-ink-2">
                                  · {formatVnd(item.priceVnd)}
                                </span>
                              )}
                              <span
                                className={
                                  isOut ? 'text-critical font-medium' : 'text-positive'
                                }
                              >
                                · {isOut ? 'Tạm hết mẫu' : 'Còn mẫu'}
                              </span>
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-ink shrink-0 mt-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
