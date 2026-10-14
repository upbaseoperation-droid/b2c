import { INITIAL_BRANDS, INITIAL_STORE_PORTFOLIOS, INITIAL_PUSH_PRODUCTS } from './mockData';
import { UPBASE_MASTER_PILLARS, UPBASE_CAST_TIERS, UPBASE_KOC_NICHES, UPBASE_VIDEO_FORMATS } from './importedMasterData';
import type { MasterProductItem } from '../components/views/MasterDataHubView';

export const INITIAL_MASTER_PRODUCTS: MasterProductItem[] = INITIAL_PUSH_PRODUCTS.map(p => ({
  id: p.id, sku: p.sku, productName: p.productName, brandName: p.brandName,
  storeName: p.storeName || `${p.brandName} ${p.platform === 'TIKTOK_SHOP' ? 'TikTok Shop' : 'Shopee Mall'}`,
  platform: p.platform === 'TIKTOK_SHOP' ? 'TikTok Shop' : p.platform === 'SHOPEE_MALL' ? 'Shopee Mall' : 'Lazada',
  category: p.brandCategory, originalPrice: p.originalPrice, pdpUrl: p.pdpUrl || '',
  commissionRate: p.affiliateRate ?? 15, heroType: 'HERO',
  sampleAvailableCount: Math.max(0, (p.monthlySampleQuota ?? 50) - (p.allocatedSampleCount ?? 0)),
  usp: p.usp || '', status: 'ACTIVE',
}));
export const DEFAULT_MASTER_CATALOG = {
  brands: INITIAL_BRANDS, stores: INITIAL_STORE_PORTFOLIOS, products: INITIAL_MASTER_PRODUCTS,
  pillars: UPBASE_MASTER_PILLARS, castTiers: UPBASE_CAST_TIERS, niches: UPBASE_KOC_NICHES, formats: UPBASE_VIDEO_FORMATS,
};
export type MasterCatalog = typeof DEFAULT_MASTER_CATALOG;
