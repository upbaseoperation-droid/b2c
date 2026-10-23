/**
 * Danh mục sản phẩm theo Brand (dùng chung cho mọi sàn), nhập tay, không kết nối sàn:
 * Brand → Nhóm sản phẩm → Sản phẩm → Link giỏ hàng và Link affiliate (mỗi link affiliate có hoa hồng riêng).
 */

export const LINK_PLATFORMS = ['TikTok Shop', 'Shopee', 'Lazada', 'Khác'] as const;

export interface CartLink {
  id: string;
  platform: string;
  storeName: string;
  url: string;
  note: string;
}

export type AffiliateLinkType = 'OPEN' | 'DESIGNATED';
export const AFFILIATE_TYPE_LABEL: Record<AffiliateLinkType, string> = { OPEN: 'Mở đại trà', DESIGNATED: 'Chỉ định KOC' };

export interface AffiliateLink {
  id: string;
  label: string;
  platform: string;
  url: string;
  /** Hoa hồng của riêng link này (0–100). null = chưa nhập. */
  commissionPct: number | null;
  type: AffiliateLinkType;
  designatedKoc: string;
  validFrom: string;
  validTo: string;
  note: string;
}

export interface CatalogProduct {
  id: string;
  name: string;
  sku: string;
  status: 'ACTIVE' | 'STOPPED';
  cartLinks: CartLink[];
  affiliateLinks: AffiliateLink[];
}

export interface ProductGroup {
  id: string;
  name: string;
  products: CatalogProduct[];
}

export interface BrandProductCatalog {
  groups: ProductGroup[];
}

export const EMPTY_PRODUCT_CATALOG: BrandProductCatalog = { groups: [] };

export const newCatalogId = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const newGroup = (name = ''): ProductGroup => ({ id: newCatalogId('PG'), name, products: [] });
export const newProduct = (): CatalogProduct => ({ id: newCatalogId('PR'), name: '', sku: '', status: 'ACTIVE', cartLinks: [], affiliateLinks: [] });
export const newCartLink = (): CartLink => ({ id: newCatalogId('CL'), platform: 'TikTok Shop', storeName: '', url: '', note: '' });
export const newAffiliateLink = (): AffiliateLink => ({
  id: newCatalogId('AL'),
  label: '',
  platform: 'TikTok Shop',
  url: '',
  commissionPct: null,
  type: 'OPEN',
  designatedKoc: '',
  validFrom: '',
  validTo: '',
  note: '',
});

export const isHttpUrl = (v: string): boolean => {
  try {
    const u = new URL(v.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

const normUrl = (v: string) => v.trim().replace(/#.*$/, '').replace(/\/+$/, '').toLowerCase();
const normName = (v: string) => v.trim().toLowerCase().replace(/\s+/g, ' ');

/** Làm sạch dữ liệu nhận từ máy khách. */
export function sanitizeProductCatalog(input: Partial<BrandProductCatalog> | undefined): BrandProductCatalog {
  const s = (v: unknown, max = 300) => (typeof v === 'string' ? v.slice(0, max) : '');
  const pct = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const day = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
  const groups = (Array.isArray(input?.groups) ? input!.groups! : []).slice(0, 200).map(g => ({
    id: s(g?.id, 40) || newCatalogId('PG'),
    name: s(g?.name, 120),
    products: (Array.isArray(g?.products) ? g.products : []).slice(0, 500).map(p => ({
      id: s(p?.id, 40) || newCatalogId('PR'),
      name: s(p?.name, 200),
      sku: s(p?.sku, 80),
      status: (p?.status === 'STOPPED' ? 'STOPPED' : 'ACTIVE') as CatalogProduct['status'],
      cartLinks: (Array.isArray(p?.cartLinks) ? p.cartLinks : []).slice(0, 30).map(l => ({
        id: s(l?.id, 40) || newCatalogId('CL'),
        platform: s(l?.platform, 40),
        storeName: s(l?.storeName, 120),
        url: s(l?.url, 1000),
        note: s(l?.note, 300),
      })),
      affiliateLinks: (Array.isArray(p?.affiliateLinks) ? p.affiliateLinks : []).slice(0, 50).map(l => ({
        id: s(l?.id, 40) || newCatalogId('AL'),
        label: s(l?.label, 120),
        platform: s(l?.platform, 40),
        url: s(l?.url, 1000),
        commissionPct: pct(l?.commissionPct),
        type: (l?.type === 'DESIGNATED' ? 'DESIGNATED' : 'OPEN') as AffiliateLinkType,
        designatedKoc: s(l?.designatedKoc, 120),
        validFrom: day(l?.validFrom),
        validTo: day(l?.validTo),
        note: s(l?.note, 300),
      })),
    })),
  }));
  return { groups };
}

export interface CatalogIssue {
  level: 'error' | 'warning';
  where: string;
  text: string;
}

export function validateProductCatalog(catalog: BrandProductCatalog): CatalogIssue[] {
  const issues: CatalogIssue[] = [];
  const groupNames = new Map<string, number>();
  const skus = new Map<string, string>();
  const urls = new Map<string, string>();
  for (const g of catalog.groups) {
    const gName = g.name.trim() || 'Nhóm chưa đặt tên';
    if (!g.name.trim()) issues.push({ level: 'error', where: gName, text: 'Nhóm chưa có tên.' });
    else groupNames.set(normName(g.name), (groupNames.get(normName(g.name)) || 0) + 1);
    for (const p of g.products) {
      const pName = p.name.trim() || 'Sản phẩm chưa đặt tên';
      const where = `${gName} › ${pName}`;
      if (!p.name.trim()) issues.push({ level: 'error', where, text: 'Sản phẩm chưa có tên.' });
      if (p.sku.trim()) {
        const k = p.sku.trim().toLowerCase();
        if (skus.has(k)) issues.push({ level: 'error', where, text: `SKU ${p.sku.trim()} trùng với ${skus.get(k)}.` });
        else skus.set(k, where);
      }
      if (p.status === 'ACTIVE' && p.cartLinks.length === 0) issues.push({ level: 'warning', where, text: 'Chưa có link giỏ hàng.' });
      for (const l of p.cartLinks) {
        if (!l.url.trim()) issues.push({ level: 'error', where, text: `Link giỏ hàng ${l.platform} đang để trống.` });
        else if (!isHttpUrl(l.url)) issues.push({ level: 'error', where, text: `Link giỏ hàng ${l.platform} không hợp lệ.` });
        else {
          const k = normUrl(l.url);
          if (urls.has(k)) issues.push({ level: 'warning', where, text: `Link giỏ hàng trùng với ${urls.get(k)}.` });
          else urls.set(k, where);
        }
      }
      for (const l of p.affiliateLinks) {
        const label = l.label.trim() || l.platform;
        if (!l.url.trim()) issues.push({ level: 'error', where, text: `Link affiliate ${label} đang để trống.` });
        else if (!isHttpUrl(l.url)) issues.push({ level: 'error', where, text: `Link affiliate ${label} không hợp lệ.` });
        else {
          const k = normUrl(l.url);
          if (urls.has(k)) issues.push({ level: 'warning', where, text: `Link affiliate ${label} trùng với ${urls.get(k)}.` });
          else urls.set(k, where);
        }
        if (l.commissionPct === null) issues.push({ level: 'error', where, text: `Link affiliate ${label} chưa nhập hoa hồng.` });
        else if (l.commissionPct < 0 || l.commissionPct > 100) issues.push({ level: 'error', where, text: `Hoa hồng của link ${label} phải từ 0 đến 100%.` });
        if (l.type === 'DESIGNATED' && !l.designatedKoc.trim()) issues.push({ level: 'error', where, text: `Link ${label} chỉ định KOC nhưng chưa ghi KOC.` });
        if (l.validFrom && l.validTo && l.validTo < l.validFrom) issues.push({ level: 'error', where, text: `Link ${label} có hạn kết thúc trước ngày bắt đầu.` });
      }
    }
  }
  groupNames.forEach((n, name) => {
    if (n > 1) issues.push({ level: 'error', where: name, text: 'Có nhiều nhóm trùng tên.' });
  });
  return issues;
}

/** Đưa sản phẩm từ bảng Sản phẩm cũ vào nhóm "Chưa phân nhóm". Không đưa hoa hồng cũ vì bảng cũ không có link affiliate tương ứng. */
export interface LegacyProductLike {
  sku: string;
  productName: string;
  brandName: string;
  storeName: string;
  platform: string;
  pdpUrl: string;
  status: string;
}

export function importLegacyProducts(catalog: BrandProductCatalog, brandName: string, legacy: LegacyProductLike[]): { catalog: BrandProductCatalog; added: number; skipped: number } {
  const known = new Set<string>();
  for (const g of catalog.groups) for (const p of g.products) known.add(p.sku.trim().toLowerCase() || `name:${normName(p.name)}`);
  const incoming = legacy.filter(p => p.brandName === brandName);
  const GROUP_NAME = 'Chưa phân nhóm';
  let group = catalog.groups.find(g => normName(g.name) === normName(GROUP_NAME));
  const created: CatalogProduct[] = [];
  let skipped = 0;
  for (const l of incoming) {
    const key = l.sku.trim().toLowerCase() || `name:${normName(l.productName)}`;
    if (known.has(key)) {
      skipped++;
      continue;
    }
    known.add(key);
    const p = newProduct();
    p.name = l.productName;
    p.sku = l.sku;
    p.status = l.status === 'DISCONTINUED' ? 'STOPPED' : 'ACTIVE';
    if (l.pdpUrl && isHttpUrl(l.pdpUrl)) p.cartLinks.push({ ...newCartLink(), platform: l.platform === 'Shopee Mall' ? 'Shopee' : l.platform, storeName: l.storeName, url: l.pdpUrl });
    created.push(p);
  }
  if (created.length === 0) return { catalog, added: 0, skipped };
  const groups = group ? catalog.groups.map(g => (g === group ? { ...g, products: [...g.products, ...created] } : g)) : [...catalog.groups, { ...newGroup(GROUP_NAME), products: created }];
  return { catalog: { groups }, added: created.length, skipped };
}
