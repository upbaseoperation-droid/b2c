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

export type ProductItemType = 'SINGLE' | 'HARD_BUNDLE' | 'ROUTINE_COMBO';
export const PRODUCT_TYPE_LABEL: Record<ProductItemType, string> = {
  SINGLE: 'SKU đơn lẻ',
  HARD_BUNDLE: 'Combo có link riêng trên sàn',
  ROUTINE_COMBO: 'Combo Routine (Ghép nhiều link lẻ)',
};

export type ProductPushRole = 'HERO' | 'ENTRY' | 'ADDON' | 'GIFT';
export const PRODUCT_ROLE_LABEL: Record<ProductPushRole, string> = {
  HERO: 'Hero SKU (Chủ lực)',
  ENTRY: 'Entry SKU (Phễu dẫn)',
  ADDON: 'Add-on (Bán chéo)',
  GIFT: 'Quà tặng kèm (GWP)',
};

export type BundleComponentRole = 'MAIN' | 'SUB' | 'GIFT';
export const BUNDLE_COMPONENT_ROLE_LABEL: Record<BundleComponentRole, string> = {
  MAIN: 'Sản phẩm chính',
  SUB: 'Sản phẩm kết hợp',
  GIFT: 'Quà tặng kèm (0% ngân sách)',
};

export interface BundleComponentItem {
  id: string;
  productId: string;
  quantity: number;
  componentRole: BundleComponentRole;
  /** Tỷ trọng phân bổ chi phí & GMV về SKU đơn (0–100%). Mặc định GIFT = 0. */
  allocationPct: number | null;
}

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
  status: 'ACTIVE' | 'OUT_OF_STOCK' | 'STOPPED';
  productType?: ProductItemType;
  role?: ProductPushRole;
  originalPrice?: number | null;
  promoPrice?: number | null;
  monthlySampleQuota?: number | null;
  substituteProductId?: string;
  detectKeywords?: string;
  /** Dung tích / Quy cách đóng gói (VD: Tuýp 30g, Chai 50ml, Hộp 30 gói) */
  size?: string;
  /** Điểm nổi bật riêng của SKU (USP cấp sản phẩm) */
  usps?: string;
  /** Thành phần & Hoạt chất chính (VD: Nghệ Nano THC, Bơ hạt mỡ, Vitamin E) */
  ingredients?: string;
  /** Công dụng & Cơ chế tác động */
  mechanism?: string;
  /** Hướng dẫn sử dụng / Bước dùng trong Routine */
  usageInstruction?: string;
  /** Đối tượng / Loại da sử dụng phù hợp */
  targetUser?: string;
  /** Lưu ý / Chống chỉ định riêng của SKU */
  contraindications?: string;
  bundleComponents?: BundleComponentItem[];
  cartLinks: CartLink[];
  affiliateLinks: AffiliateLink[];
}

export interface ProductGroup {
  id: string;
  name: string;
  /** Điểm nhấn sản phẩm / Thông điệp USP bắt buộc khi làm Brief & SOW */
  usp?: string;
  /** Claim cấm / Từ khóa cấm / Hạn chế nội dung (Do & Don't) của nhóm sản phẩm */
  forbiddenClaims?: string;
  products: CatalogProduct[];
}

export interface BrandProductCatalog {
  groups: ProductGroup[];
}

export const EMPTY_PRODUCT_CATALOG: BrandProductCatalog = { groups: [] };

export const newCatalogId = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const newGroup = (name = ''): ProductGroup => ({ id: newCatalogId('PG'), name, usp: '', forbiddenClaims: '', products: [] });
export const newProduct = (productType: ProductItemType = 'SINGLE'): CatalogProduct => ({
  id: newCatalogId('PR'),
  name: '',
  sku: '',
  status: 'ACTIVE',
  productType,
  role: 'HERO',
  originalPrice: null,
  promoPrice: null,
  monthlySampleQuota: null,
  substituteProductId: '',
  detectKeywords: '',
  size: '',
  usps: '',
  ingredients: '',
  mechanism: '',
  usageInstruction: '',
  targetUser: '',
  contraindications: '',
  bundleComponents: [],
  cartLinks: [],
  affiliateLinks: [],
});
export const newBundleComponent = (productId = ''): BundleComponentItem => ({
  id: newCatalogId('BC'),
  productId,
  quantity: 1,
  componentRole: 'MAIN',
  allocationPct: null,
});
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
  const nonNegInt = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : null);
  const day = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
  const validStatus = (v: unknown): CatalogProduct['status'] =>
    v === 'STOPPED' ? 'STOPPED' : v === 'OUT_OF_STOCK' ? 'OUT_OF_STOCK' : 'ACTIVE';
  const validProductType = (v: unknown): ProductItemType =>
    v === 'HARD_BUNDLE' ? 'HARD_BUNDLE' : v === 'ROUTINE_COMBO' ? 'ROUTINE_COMBO' : 'SINGLE';
  const validRole = (v: unknown): ProductPushRole =>
    v === 'ENTRY' ? 'ENTRY' : v === 'ADDON' ? 'ADDON' : v === 'GIFT' ? 'GIFT' : 'HERO';
  const validCompRole = (v: unknown): BundleComponentRole =>
    v === 'SUB' ? 'SUB' : v === 'GIFT' ? 'GIFT' : 'MAIN';

  const groups = (Array.isArray(input?.groups) ? input!.groups! : []).slice(0, 200).map(g => ({
    id: s(g?.id, 40) || newCatalogId('PG'),
    name: s(g?.name, 120),
    usp: s(g?.usp, 1000),
    forbiddenClaims: s(g?.forbiddenClaims, 1000),
    products: (Array.isArray(g?.products) ? g.products : []).slice(0, 500).map(p => ({
      id: s(p?.id, 40) || newCatalogId('PR'),
      name: s(p?.name, 200),
      sku: s(p?.sku, 80),
      status: validStatus(p?.status),
      productType: validProductType(p?.productType),
      role: validRole(p?.role),
      originalPrice: nonNegInt(p?.originalPrice),
      promoPrice: nonNegInt(p?.promoPrice),
      monthlySampleQuota: nonNegInt(p?.monthlySampleQuota),
      substituteProductId: s(p?.substituteProductId, 40),
      detectKeywords: s(p?.detectKeywords, 500),
      size: s(p?.size, 120),
      usps: s(p?.usps, 1500),
      ingredients: s(p?.ingredients, 1500),
      mechanism: s(p?.mechanism, 2000),
      usageInstruction: s(p?.usageInstruction, 1000),
      targetUser: s(p?.targetUser, 600),
      contraindications: s(p?.contraindications, 600),
      bundleComponents: (Array.isArray(p?.bundleComponents) ? p.bundleComponents : []).slice(0, 30).map(c => ({
        id: s(c?.id, 40) || newCatalogId('BC'),
        productId: s(c?.productId, 40),
        quantity: Math.max(1, nonNegInt(c?.quantity) ?? 1),
        componentRole: validCompRole(c?.componentRole),
        allocationPct: c?.componentRole === 'GIFT' ? 0 : pct(c?.allocationPct),
      })),
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

/** Danh sách phẳng tất cả sản phẩm kèm nhóm trong BrandProductCatalog. */
export function listAllCatalogProducts(catalog: BrandProductCatalog): { group: ProductGroup; product: CatalogProduct }[] {
  const out: { group: ProductGroup; product: CatalogProduct }[] = [];
  for (const g of catalog.groups || []) {
    for (const p of g.products || []) {
      out.push({ group: g, product: p });
    }
  }
  return out;
}

/** Tìm sản phẩm theo ID hoặc tên khớp chuẩn hóa. */
export function findCatalogProduct(
  catalog: BrandProductCatalog,
  idOrName: string | undefined | null,
  preferredGroupId?: string
): { group: ProductGroup; product: CatalogProduct } | null {
  const key = (idOrName || '').trim();
  if (!key) return null;
  const all = listAllCatalogProducts(catalog);
  const byId = all.find(x => x.product.id === key);
  if (byId) return byId;
  const nk = normName(key);
  if (preferredGroupId) {
    const inGroup = all.find(x => x.group.id === preferredGroupId && (normName(x.product.name) === nk || normName(x.product.sku) === nk));
    if (inGroup) return inGroup;
  }
  return all.find(x => normName(x.product.name) === nk || (x.product.sku && normName(x.product.sku) === nk)) || null;
}

/** Tự động tính tỷ trọng phân bổ chi phí & GMV (%) cho các món trong Combo dựa trên giá niêm yết × số lượng (GIFT = 0%). */
export function autoAllocateBundleWeights(
  catalog: BrandProductCatalog,
  components: BundleComponentItem[]
): BundleComponentItem[] {
  const active = components.filter(c => c.componentRole !== 'GIFT' && c.productId);
  if (active.length === 0) {
    return components.map(c => ({ ...c, allocationPct: c.componentRole === 'GIFT' ? 0 : null }));
  }
  const values = active.map(c => {
    const found = findCatalogProduct(catalog, c.productId);
    const price = found?.product.originalPrice && found.product.originalPrice > 0 ? found.product.originalPrice : 1;
    return { id: c.id, val: price * Math.max(1, c.quantity || 1) };
  });
  const totalVal = values.reduce((s, x) => s + x.val, 0) || active.length;
  let remainingPct = 100;
  const pctById = new Map<string, number>();
  values.forEach((v, idx) => {
    if (idx === values.length - 1) {
      pctById.set(v.id, Math.max(0, Math.round(remainingPct * 10) / 10));
    } else {
      const p = Math.round((v.val / totalVal) * 1000) / 10;
      pctById.set(v.id, p);
      remainingPct -= p;
    }
  });
  return components.map(c => ({
    ...c,
    allocationPct: c.componentRole === 'GIFT' ? 0 : (pctById.get(c.id) ?? 0),
  }));
}

/** Tính hạn mức mẫu khả dụng thực tế của một SKU hoặc Combo (dựa trên giới hạn của SKU thành phần thấp nhất). */
export function resolveEffectiveSampleQuota(
  catalog: BrandProductCatalog,
  product: CatalogProduct | undefined | null,
  sentCountsByProductId: Record<string, number> = {}
): {
  quota: number | null;
  sent: number;
  remaining: number | null;
  bottleneckProductName?: string;
  hasOutOfStockComponent: boolean;
  outOfStockComponentNames: string[];
} {
  if (!product) {
    return { quota: null, sent: 0, remaining: null, hasOutOfStockComponent: false, outOfStockComponentNames: [] };
  }
  const directSent = sentCountsByProductId[product.id] || sentCountsByProductId[normName(product.name)] || 0;
  const isCombo = product.productType === 'HARD_BUNDLE' || product.productType === 'ROUTINE_COMBO';
  const comps = (product.bundleComponents || []).filter(c => c.productId);

  if (!isCombo || comps.length === 0) {
    const quota = product.monthlySampleQuota ?? null;
    const remaining = quota !== null ? Math.max(0, quota - directSent) : null;
    const isOos = product.status === 'OUT_OF_STOCK';
    return {
      quota,
      sent: directSent,
      remaining,
      hasOutOfStockComponent: isOos,
      outOfStockComponentNames: isOos ? [product.name] : [],
    };
  }

  let minPossibleSets: number | null = product.monthlySampleQuota !== null && product.monthlySampleQuota !== undefined
    ? Math.max(0, product.monthlySampleQuota - directSent)
    : null;
  let minInitialQuota: number | null = product.monthlySampleQuota ?? null;
  let bottleneckName: string | undefined;
  const oosNames: string[] = [];

  for (const c of comps) {
    const found = findCatalogProduct(catalog, c.productId);
    if (!found) continue;
    const cp = found.product;
    if (cp.status === 'OUT_OF_STOCK' || cp.status === 'STOPPED') {
      oosNames.push(cp.name || cp.sku || c.productId);
    }
    if (cp.monthlySampleQuota !== null && cp.monthlySampleQuota !== undefined) {
      const compSent = (sentCountsByProductId[cp.id] || sentCountsByProductId[normName(cp.name)] || 0) + directSent * Math.max(1, c.quantity || 1);
      const compRemSets = Math.floor(Math.max(0, cp.monthlySampleQuota - compSent) / Math.max(1, c.quantity || 1));
      const compInitSets = Math.floor(cp.monthlySampleQuota / Math.max(1, c.quantity || 1));
      if (minInitialQuota === null || compInitSets < minInitialQuota) {
        minInitialQuota = compInitSets;
      }
      if (minPossibleSets === null || compRemSets < minPossibleSets) {
        minPossibleSets = compRemSets;
        bottleneckName = cp.name || cp.sku;
      }
    }
  }

  return {
    quota: minInitialQuota,
    sent: directSent,
    remaining: minPossibleSets,
    bottleneckProductName: bottleneckName,
    hasOutOfStockComponent: product.status === 'OUT_OF_STOCK' || oosNames.length > 0,
    outOfStockComponentNames: oosNames,
  };
}

/** Lấy danh sách Link giỏ hàng & Link Affiliate thực tế (tự động gom link các SKU thành phần nếu là ROUTINE_COMBO). */
export function resolveEffectiveProductLinks(
  catalog: BrandProductCatalog,
  product: CatalogProduct | undefined | null
): {
  cartLinks: CartLink[];
  affiliateLinks: AffiliateLink[];
  isMultiComponentLinks: boolean;
} {
  if (!product) return { cartLinks: [], affiliateLinks: [], isMultiComponentLinks: false };
  const isRoutine = product.productType === 'ROUTINE_COMBO';
  const comps = (product.bundleComponents || []).filter(c => c.productId);

  if (!isRoutine || comps.length === 0) {
    return {
      cartLinks: product.cartLinks || [],
      affiliateLinks: product.affiliateLinks || [],
      isMultiComponentLinks: false,
    };
  }

  const cartLinks: CartLink[] = [...(product.cartLinks || [])];
  const affiliateLinks: AffiliateLink[] = [...(product.affiliateLinks || [])];
  const seenCart = new Set(cartLinks.map(l => normUrl(l.url)));
  const seenAff = new Set(affiliateLinks.map(l => normUrl(l.url)));

  for (const c of comps) {
    const found = findCatalogProduct(catalog, c.productId);
    if (!found) continue;
    const cp = found.product;
    for (const l of cp.cartLinks || []) {
      const k = normUrl(l.url);
      if (k && !seenCart.has(k)) {
        seenCart.add(k);
        cartLinks.push({
          ...l,
          note: l.note ? `[${cp.name}] ${l.note}` : `[${cp.name}]`,
        });
      }
    }
    for (const l of cp.affiliateLinks || []) {
      const k = normUrl(l.url);
      if (k && !seenAff.has(k)) {
        seenAff.add(k);
        affiliateLinks.push({
          ...l,
          label: l.label ? `${cp.name} · ${l.label}` : cp.name,
        });
      }
    }
  }

  return {
    cartLinks,
    affiliateLinks,
    isMultiComponentLinks: true,
  };
}

/** Gộp USP, Claim cấm và Từ khóa nhận diện phụ đề (BBNT) cho cả SKU đơn lẫn Combo đa thành phần. */
export function resolveEffectiveProductGuidelines(
  catalog: BrandProductCatalog,
  groupId: string,
  product: CatalogProduct | undefined | null
): {
  usp: string;
  forbiddenClaims: string;
  detectKeywords: string;
} {
  const group = catalog.groups.find(g => g.id === groupId);
  const usps = new Set<string>();
  const claims = new Set<string>();
  const keywords = new Set<string>();

  if (group?.usp?.trim()) usps.add(group.usp.trim());
  if (group?.forbiddenClaims?.trim()) claims.add(group.forbiddenClaims.trim());

  if (product) {
    if (product.name.trim()) keywords.add(product.name.trim());
    if (product.sku.trim()) keywords.add(product.sku.trim());
    if (product.detectKeywords?.trim()) {
      product.detectKeywords.split(/[,;\n]/).map(s => s.trim()).filter(Boolean).forEach(k => keywords.add(k));
    }
    const isCombo = product.productType === 'HARD_BUNDLE' || product.productType === 'ROUTINE_COMBO';
    for (const c of isCombo ? product.bundleComponents || [] : []) {
      const found = findCatalogProduct(catalog, c.productId);
      if (!found) continue;
      if (found.group.usp?.trim()) usps.add(`[${found.product.name}] ${found.group.usp.trim()}`);
      if (found.group.forbiddenClaims?.trim()) claims.add(`[${found.product.name}] ${found.group.forbiddenClaims.trim()}`);
      if (found.product.name.trim()) keywords.add(found.product.name.trim());
      if (found.product.detectKeywords?.trim()) {
        found.product.detectKeywords.split(/[,;\n]/).map(s => s.trim()).filter(Boolean).forEach(k => keywords.add(k));
      }
    }
  }

  return {
    usp: Array.from(usps).join(' | '),
    forbiddenClaims: Array.from(claims).join(' | '),
    detectKeywords: Array.from(keywords).join(', '),
  };
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
      const isCombo = p.productType === 'HARD_BUNDLE' || p.productType === 'ROUTINE_COMBO';
      const comps = (p.bundleComponents || []).filter(c => c.productId);
      if (!p.name.trim()) issues.push({ level: 'error', where, text: 'Sản phẩm chưa có tên.' });
      if (p.sku.trim()) {
        const k = p.sku.trim().toLowerCase();
        if (skus.has(k)) issues.push({ level: 'error', where, text: `SKU ${p.sku.trim()} trùng với ${skus.get(k)}.` });
        else skus.set(k, where);
      }
      if (isCombo && comps.length === 0) {
        issues.push({ level: 'warning', where, text: 'Combo chưa chọn các SKU đơn thành phần.' });
      }
      if (isCombo && comps.length > 0) {
        const nonGiftWithPct = comps.filter(c => c.componentRole !== 'GIFT' && c.allocationPct !== null);
        if (nonGiftWithPct.length > 0) {
          const sumPct = nonGiftWithPct.reduce((s, c) => s + (c.allocationPct || 0), 0);
          if (Math.abs(sumPct - 100) > 1) {
            issues.push({ level: 'warning', where, text: `Tổng tỷ trọng phân bổ của các món chính/phụ trong Combo đang là ${Math.round(sumPct * 10) / 10}% (nên bằng 100%).` });
          }
        }
        for (const c of comps) {
          const found = findCatalogProduct(catalog, c.productId);
          if (found && (found.product.status === 'OUT_OF_STOCK' || found.product.status === 'STOPPED')) {
            issues.push({ level: 'warning', where, text: `Món thành phần "${found.product.name}" trong Combo đang ${found.product.status === 'OUT_OF_STOCK' ? 'tạm hết hàng' : 'ngừng bán'}.` });
          }
        }
      }
      const effLinks = resolveEffectiveProductLinks(catalog, p);
      if (p.status === 'ACTIVE' && effLinks.cartLinks.length === 0) {
        issues.push({ level: 'warning', where, text: 'Chưa có link giỏ hàng.' });
      }
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
  originalPrice?: number;
  heroType?: 'HERO' | 'ENTRY' | 'ADDON';
  sampleAvailableCount?: number;
}

export function importLegacyProducts(catalog: BrandProductCatalog, brandName: string, legacy: LegacyProductLike[]): { catalog: BrandProductCatalog; added: number; skipped: number } {
  const known = new Set<string>();
  for (const g of catalog.groups) for (const p of g.products) known.add(p.sku.trim().toLowerCase() || `name:${normName(p.name)}`);
  const incoming = legacy.filter(p => p.brandName === brandName);
  const GROUP_NAME = 'Chưa phân nhóm';
  const group = catalog.groups.find(g => normName(g.name) === normName(GROUP_NAME));
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
    p.role = l.heroType || 'HERO';
    p.originalPrice = typeof l.originalPrice === 'number' && l.originalPrice > 0 ? l.originalPrice : null;
    p.monthlySampleQuota = typeof l.sampleAvailableCount === 'number' && l.sampleAvailableCount >= 0 ? l.sampleAvailableCount : null;
    if (l.pdpUrl && isHttpUrl(l.pdpUrl)) p.cartLinks.push({ ...newCartLink(), platform: l.platform === 'Shopee Mall' ? 'Shopee' : l.platform, storeName: l.storeName, url: l.pdpUrl });
    created.push(p);
  }
  if (created.length === 0) return { catalog, added: 0, skipped };
  const groups = group ? catalog.groups.map(g => (g === group ? { ...g, products: [...g.products, ...created] } : g)) : [...catalog.groups, { ...newGroup(GROUP_NAME), products: created }];
  return { catalog: { groups }, added: created.length, skipped };
}

export interface BrandProfileProductSource {
  id: string;
  name: string;
  skuCode: string;
  size?: string;
  priceVnd?: number;
  dealPriceVnd?: number;
  commissionOrganicPct?: number;
  commissionAdsPct?: number;
  sampleStockStatus?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'PRE_ORDER';
  pdpUrl?: string;
  usps?: string[];
  mechanism?: string;
  ingredients?: string[];
  usageInstruction?: string;
  targetUser?: string;
  contraindications?: string;
}

export interface PushProductSource {
  id: string;
  sku: string;
  productName: string;
  brandName: string;
  storeName: string;
  platform: 'TIKTOK_SHOP' | 'SHOPEE_MALL' | 'LAZADA' | string;
  originalPrice: number;
  promotionalPrice: number;
  affiliateRate: number;
  availableStock: number;
  monthlySampleQuota: number;
  allocatedSampleCount: number;
  usp: string;
  doAndDonts?: string;
  pdpUrl?: string;
  pdpUrlTikTok?: string;
  pdpUrlShopee?: string;
  startDate?: string;
  endDate?: string;
}

function deriveGroupNameFromProductName(rawName: string): string {
  const cleaned = rawName
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+\d+[.,]?\d*\s*(ml|g|gr|kg|l|viên|gói|ống|chai|hộp|tuýp|miếng|cặp|bộ)\b.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || rawName.trim() || 'Dòng sản phẩm chủ lực';
}

/**
 * Tự động đồng bộ và làm giàu Danh mục Sản phẩm 2 tầng (Nhóm SP -> SKU/Combo)
 * từ Hồ sơ Brand (`BrandProfile.products`) và Sản phẩm đẩy (`INITIAL_PUSH_PRODUCTS`).
 * Giữ nguyên toàn bộ chỉnh sửa thủ công đã lưu trong `catalog`, chỉ bổ sung các nhóm/SKU còn thiếu.
 */
export function mergeBrandSourcesIntoCatalog(
  catalog: BrandProductCatalog,
  brandName: string,
  profileProducts: BrandProfileProductSource[] = [],
  bannedPhrases: string[] = [],
  pushProducts: PushProductSource[] = [],
): BrandProductCatalog {
  const base = sanitizeProductCatalog(catalog);
  const groups: ProductGroup[] = base.groups.map(g => ({
    ...g,
    products: g.products.map(p => ({
      ...p,
      cartLinks: [...p.cartLinks],
      affiliateLinks: [...p.affiliateLinks],
      bundleComponents: [...(p.bundleComponents || [])],
    })),
  }));

  const knownSkus = new Set<string>();
  const knownNames = new Set<string>();
  for (const g of groups) {
    for (const p of g.products) {
      if (p.sku.trim()) knownSkus.add(p.sku.trim().toLowerCase());
      if (p.name.trim()) knownNames.add(normName(p.name));
    }
  }

  const brandNorm = normName(brandName);
  const matchingPush = pushProducts.filter(p => normName(p.brandName) === brandNorm);
  const bannedSummary = bannedPhrases.slice(0, 6).filter(Boolean).join(', ');

  const findOrCreateGroup = (groupTitle: string, uspText: string, forbiddenText: string): ProductGroup => {
    const tNorm = normName(groupTitle);
    let found = groups.find(g => {
      const gNorm = normName(g.name);
      return gNorm === tNorm || (gNorm.length >= 6 && tNorm.includes(gNorm)) || (tNorm.length >= 6 && gNorm.includes(tNorm));
    });
    if (!found) {
      found = {
        id: `grp-${brandNorm.replace(/[^a-z0-9]+/g, '-')}-${groups.length + 1}`,
        name: groupTitle,
        usp: uspText,
        forbiddenClaims: forbiddenText,
        products: [],
      };
      groups.push(found);
    } else {
      if (!(found.usp || '').trim() && uspText) found.usp = uspText;
      if (!(found.forbiddenClaims || '').trim() && forbiddenText) found.forbiddenClaims = forbiddenText;
    }
    return found;
  };

  // 1. Nạp từ Hồ sơ Brand (BrandProfile.products)
  profileProducts.forEach((bp, idx) => {
    const skuKey = (bp.skuCode || '').trim().toLowerCase();
    const nameKey = normName(bp.name || '');
    if (!nameKey) return;
    if ((skuKey && knownSkus.has(skuKey)) || knownNames.has(nameKey)) {
      // Nếu sản phẩm đã có trong catalog nhưng chưa có thông số chuyên môn thì làm giàu tự động
      for (const g of groups) {
        for (const p of g.products) {
          if ((skuKey && p.sku.trim().toLowerCase() === skuKey) || normName(p.name) === nameKey) {
            if (!p.size && bp.size) p.size = bp.size;
            if (!p.usps && bp.usps?.length) p.usps = bp.usps.join(' · ');
            if (!p.ingredients && bp.ingredients?.length) p.ingredients = bp.ingredients.join('; ');
            if (!p.mechanism && bp.mechanism) p.mechanism = bp.mechanism;
            if (!p.usageInstruction && bp.usageInstruction) p.usageInstruction = bp.usageInstruction;
            if (!p.targetUser && bp.targetUser) p.targetUser = bp.targetUser;
            if (!p.contraindications && bp.contraindications) p.contraindications = bp.contraindications;
          }
        }
      }
      return;
    }

    const matchedPush = matchingPush.find(
      mp => (skuKey && mp.sku.trim().toLowerCase() === skuKey) || normName(mp.productName) === nameKey
    );

    const uspText = (bp.usps || []).filter(Boolean).join(' · ') || matchedPush?.usp || '';
    const forbiddenText = [bp.contraindications, matchedPush?.doAndDonts, bannedSummary ? `Từ cấm: ${bannedSummary}` : '']
      .map(s => (s || '').trim())
      .filter(Boolean)
      .join(' | ');

    const groupTitle = deriveGroupNameFromProductName(bp.name);
    const grp = findOrCreateGroup(groupTitle, uspText, forbiddenText);

    const isCombo = /combo|bộ\s+\d|set\s+\d|mua\s+\d/i.test(bp.name);
    const status: CatalogProduct['status'] =
      bp.sampleStockStatus === 'OUT_OF_STOCK' || (matchedPush && matchedPush.availableStock <= 0)
        ? 'OUT_OF_STOCK'
        : 'ACTIVE';

    const quota = matchedPush
      ? Math.max(0, matchedPush.monthlySampleQuota)
      : bp.sampleStockStatus === 'OUT_OF_STOCK'
        ? 0
        : bp.sampleStockStatus === 'LOW_STOCK'
          ? 8
          : 30;

    const cartLinks: CartLink[] = [];
    if (matchedPush?.pdpUrlTikTok && isHttpUrl(matchedPush.pdpUrlTikTok)) {
      cartLinks.push({ id: `cl-${bp.id}-tt`, platform: 'TikTok Shop', storeName: matchedPush.storeName, url: matchedPush.pdpUrlTikTok, note: '' });
    }
    if (matchedPush?.pdpUrlShopee && isHttpUrl(matchedPush.pdpUrlShopee)) {
      cartLinks.push({ id: `cl-${bp.id}-sp`, platform: 'Shopee', storeName: matchedPush.storeName, url: matchedPush.pdpUrlShopee, note: '' });
    }
    if (cartLinks.length === 0) {
      const fallbackUrl = matchedPush?.pdpUrl || bp.pdpUrl || '';
      if (fallbackUrl && isHttpUrl(fallbackUrl)) {
        const plat = matchedPush?.platform === 'SHOPEE_MALL' ? 'Shopee' : 'TikTok Shop';
        cartLinks.push({ id: `cl-${bp.id}-1`, platform: plat, storeName: matchedPush?.storeName || `${brandName} Official`, url: fallbackUrl, note: '' });
      }
    }

    const affiliateLinks: AffiliateLink[] = [];
    const commPct = matchedPush?.affiliateRate ?? bp.commissionOrganicPct ?? null;
    const primaryUrl = cartLinks[0]?.url || (bp.pdpUrl && isHttpUrl(bp.pdpUrl) ? bp.pdpUrl : '');
    if (commPct !== null && primaryUrl) {
      affiliateLinks.push({
        id: `al-${bp.id}-open`,
        platform: cartLinks[0]?.platform || 'TikTok Shop',
        type: 'OPEN',
        label: 'Hoa hồng mở toàn sàn',
        url: primaryUrl,
        commissionPct: commPct,
        designatedKoc: '',
        validFrom: '',
        validTo: '',
        note: '',
      });
    }

    const prod: CatalogProduct = {
      id: bp.id || `prd-${brandNorm}-${idx + 1}`,
      name: bp.name.trim(),
      sku: (bp.skuCode || '').trim(),
      status,
      productType: isCombo ? 'HARD_BUNDLE' : 'SINGLE',
      role: idx === 0 ? 'HERO' : idx === 1 ? 'HERO' : 'ENTRY',
      originalPrice: bp.priceVnd ?? matchedPush?.originalPrice ?? null,
      promoPrice: bp.dealPriceVnd ?? matchedPush?.promotionalPrice ?? null,
      monthlySampleQuota: quota,
      substituteProductId: '',
      detectKeywords: [bp.skuCode, bp.name].filter(Boolean).join(', '),
      size: bp.size || '',
      usps: uspText,
      ingredients: (bp.ingredients || []).filter(Boolean).join('; '),
      mechanism: bp.mechanism || '',
      usageInstruction: bp.usageInstruction || '',
      targetUser: bp.targetUser || '',
      contraindications: bp.contraindications || '',
      bundleComponents: [],
      cartLinks,
      affiliateLinks,
    };

    grp.products.push(prod);
    if (skuKey) knownSkus.add(skuKey);
    knownNames.add(nameKey);
  });

  // 2. Nạp thêm từ danh sách Sản phẩm đẩy (INITIAL_PUSH_PRODUCTS) nếu chưa có trong Hồ sơ Brand
  matchingPush.forEach((mp, idx) => {
    const skuKey = (mp.sku || '').trim().toLowerCase();
    const nameKey = normName(mp.productName || '');
    if (!nameKey) return;
    if ((skuKey && knownSkus.has(skuKey)) || knownNames.has(nameKey)) return;

    const forbiddenText = [mp.doAndDonts, bannedSummary ? `Từ cấm: ${bannedSummary}` : '']
      .map(s => (s || '').trim())
      .filter(Boolean)
      .join(' | ');

    const groupTitle = deriveGroupNameFromProductName(mp.productName);
    const grp = findOrCreateGroup(groupTitle, mp.usp || '', forbiddenText);
    const isCombo = /combo|bộ\s+\d|set\s+\d|mua\s+\d/i.test(mp.productName);
    const plat = mp.platform === 'SHOPEE_MALL' ? 'Shopee' : mp.platform === 'LAZADA' ? 'Lazada' : 'TikTok Shop';

    const cartLinks: CartLink[] = [];
    if (mp.pdpUrlTikTok && isHttpUrl(mp.pdpUrlTikTok)) {
      cartLinks.push({ id: `cl-mp-${mp.id}-tt`, platform: 'TikTok Shop', storeName: mp.storeName, url: mp.pdpUrlTikTok, note: '' });
    }
    if (mp.pdpUrlShopee && isHttpUrl(mp.pdpUrlShopee)) {
      cartLinks.push({ id: `cl-mp-${mp.id}-sp`, platform: 'Shopee', storeName: mp.storeName, url: mp.pdpUrlShopee, note: '' });
    }
    if (cartLinks.length === 0 && mp.pdpUrl && isHttpUrl(mp.pdpUrl)) {
      cartLinks.push({ id: `cl-mp-${mp.id}-1`, platform: plat, storeName: mp.storeName, url: mp.pdpUrl, note: '' });
    }

    const affiliateLinks: AffiliateLink[] = [];
    if (typeof mp.affiliateRate === 'number' && cartLinks[0]?.url) {
      affiliateLinks.push({
        id: `al-mp-${mp.id}-open`,
        platform: cartLinks[0].platform,
        type: 'OPEN',
        label: `Hoa hồng chiến dịch (${mp.storeName})`,
        url: cartLinks[0].url,
        commissionPct: mp.affiliateRate,
        designatedKoc: '',
        validFrom: mp.startDate || '',
        validTo: mp.endDate || '',
        note: '',
      });
    }

    const prod: CatalogProduct = {
      id: mp.id || `prd-push-${brandNorm}-${idx + 1}`,
      name: mp.productName.trim(),
      sku: (mp.sku || '').trim(),
      status: mp.availableStock <= 0 ? 'OUT_OF_STOCK' : 'ACTIVE',
      productType: isCombo ? 'HARD_BUNDLE' : 'SINGLE',
      role: 'HERO',
      originalPrice: mp.originalPrice || null,
      promoPrice: mp.promotionalPrice || null,
      monthlySampleQuota: Math.max(0, mp.monthlySampleQuota),
      substituteProductId: '',
      detectKeywords: [mp.sku, mp.productName].filter(Boolean).join(', '),
      bundleComponents: [],
      cartLinks,
      affiliateLinks,
    };

    grp.products.push(prod);
    if (skuKey) knownSkus.add(skuKey);
    knownNames.add(nameKey);
  });

  return { groups };
}

