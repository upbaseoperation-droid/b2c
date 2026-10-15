import { INITIAL_BRANDS, INITIAL_STORE_PORTFOLIOS, INITIAL_PUSH_PRODUCTS } from './mockData';
import { UPBASE_MASTER_PILLARS, UPBASE_CAST_TIERS, UPBASE_KOC_NICHES, UPBASE_VIDEO_FORMATS, UPBASE_BRANDS_MASTER } from './importedMasterData';
import type { MasterProductItem } from '../components/views/MasterDataHubView';

// Explicit aliases imported from the legacy product sheet; never fuzzy-match access scopes.
const LEGACY_BRAND_NAMES: Record<string, string> = {
  'Kutieskin Mama & Baby': 'Kutieskin Mama',
  'pHCare Japan': 'pHCare',
  'Royal Ausnz (Sữa Hoàng Gia Úc)': 'Royal Ausnz',
};
export const INITIAL_MASTER_PRODUCTS: MasterProductItem[] = INITIAL_PUSH_PRODUCTS.map(p => ({
  id: p.id, sku: p.sku, productName: p.productName, brandName: LEGACY_BRAND_NAMES[p.brandName] || p.brandName,
  storeName: p.storeName || `${p.brandName} ${p.platform === 'TIKTOK_SHOP' ? 'TikTok Shop' : 'Shopee Mall'}`,
  platform: p.platform === 'TIKTOK_SHOP' ? 'TikTok Shop' : p.platform === 'SHOPEE_MALL' ? 'Shopee Mall' : 'Lazada',
  category: p.brandCategory, originalPrice: p.originalPrice, pdpUrl: p.pdpUrl || '',
  commissionRate: p.affiliateRate ?? 15, heroType: 'HERO',
  sampleAvailableCount: Math.max(0, (p.monthlySampleQuota ?? 50) - (p.allocatedSampleCount ?? 0)),
  usp: p.usp || '', status: 'ACTIVE',
}));
const referencedBrands = UPBASE_BRANDS_MASTER.filter(b => !INITIAL_BRANDS.some(existing => existing.name === b.name) && INITIAL_MASTER_PRODUCTS.some(p => p.brandName === b.name));
export const DEFAULT_MASTER_CATALOG = {
  brands: [...INITIAL_BRANDS, ...referencedBrands], stores: INITIAL_STORE_PORTFOLIOS, products: INITIAL_MASTER_PRODUCTS,
  pillars: UPBASE_MASTER_PILLARS, castTiers: UPBASE_CAST_TIERS, niches: UPBASE_KOC_NICHES, formats: UPBASE_VIDEO_FORMATS,
};
export type MasterCatalog = typeof DEFAULT_MASTER_CATALOG;
