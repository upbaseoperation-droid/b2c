'use client';

import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, ConfirmDialog, Input, Select } from '../ui';
import { usePlanRecord } from '../../lib/usePlanRecord';
import {
  AFFILIATE_TYPE_LABEL,
  BUNDLE_COMPONENT_ROLE_LABEL,
  EMPTY_PRODUCT_CATALOG,
  LINK_PLATFORMS,
  PRODUCT_ROLE_LABEL,
  PRODUCT_TYPE_LABEL,
  autoAllocateBundleWeights,
  importLegacyProducts,
  isHttpUrl,
  listAllCatalogProducts,
  newAffiliateLink,
  newBundleComponent,
  newCartLink,
  newGroup,
  newProduct,
  resolveEffectiveProductLinks,
  resolveEffectiveSampleQuota,
  validateProductCatalog,
  type AffiliateLink,
  type AffiliateLinkType,
  type BrandProductCatalog,
  type BundleComponentItem,
  type BundleComponentRole,
  type CartLink,
  type CatalogProduct,
  type LegacyProductLike,
  type ProductGroup,
  type ProductItemType,
  type ProductPushRole,
} from '../../lib/productCatalog';

interface ProductCatalogViewProps {
  brandNames: string[];
  legacyProducts: LegacyProductLike[];
  initialBrand?: string;
  onCatalogSaved?: (brandName: string, catalog: BrandProductCatalog) => void;
  onNotify?: (message: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

const saveLabel: Record<string, string> = { idle: '', loading: 'Đang tải…', saved: 'Đã lưu', dirty: 'Chưa lưu', saving: 'Đang lưu…', error: 'Lưu lỗi' };
const TH = 'whitespace-nowrap border-b border-line bg-sunken px-2 py-1.5 text-left text-2xs font-medium text-ink-3';
const TD = 'border-b border-line px-2 py-1 align-top';

export const ProductCatalogView: React.FC<ProductCatalogViewProps> = ({
  brandNames,
  legacyProducts,
  initialBrand,
  onCatalogSaved,
  onNotify,
}) => {
  const notify = (msg: string, type: 'success' | 'warning' | 'info' | 'error' = 'info') => onNotify?.(msg, type);
  const brands = useMemo(() => Array.from(new Set([...brandNames, ...(initialBrand ? [initialBrand] : [])].filter(Boolean))).sort((a, b) => a.localeCompare(b)), [brandNames, initialBrand]);
  const [brand, setBrand] = useState(initialBrand || '');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'SINGLE' | 'COMBO'>('ALL');
  const [filterRole, setFilterRole] = useState<'ALL' | ProductPushRole>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | CatalogProduct['status']>('ALL');
  const [pendingDeleteGroup, setPendingDeleteGroup] = useState<ProductGroup | null>(null);
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState<CatalogProduct | null>(null);
  const activeBrand = brand || initialBrand || brands[0] || '';

  const { data, status, update, saveNow } = usePlanRecord<BrandProductCatalog>('/api/product-catalog', activeBrand || null, EMPTY_PRODUCT_CATALOG, msg => notify(msg, 'warning'), 'brand');
  const issues = useMemo(() => validateProductCatalog(data), [data]);
  const errors = issues.filter(i => i.level === 'error').length;

  const allBrandProducts = useMemo(() => listAllCatalogProducts(data), [data]);
  const summaryStats = useMemo(() => {
    let singleCount = 0;
    let comboCount = 0;
    let heroCount = 0;
    let oosCount = 0;
    let totalSampleQuota = 0;
    for (const { product: p } of allBrandProducts) {
      const pType = p.productType || 'SINGLE';
      if (pType === 'SINGLE') singleCount++;
      else comboCount++;
      if ((p.role || 'HERO') === 'HERO') heroCount++;
      if (p.status === 'OUT_OF_STOCK') oosCount++;
      if (pType === 'SINGLE' && typeof p.monthlySampleQuota === 'number' && p.monthlySampleQuota > 0) {
        totalSampleQuota += p.monthlySampleQuota;
      }
    }
    return {
      groupCount: data.groups.length,
      singleCount,
      comboCount,
      heroCount,
      oosCount,
      totalSampleQuota,
    };
  }, [allBrandProducts, data.groups.length]);

  const [prevBrand, setPrevBrand] = useState(activeBrand);
  if (prevBrand !== activeBrand) {
    setPrevBrand(activeBrand);
    setGroupId(null);
  }
  const group = data.groups.find(g => g.id === groupId) || data.groups[0] || null;
  const legacyCount = legacyProducts.filter(p => p.brandName === activeBrand).length;

  const setGroups = (groups: ProductGroup[]) => {
    const nextCatalog = { groups };
    update(nextCatalog);
    if (activeBrand) onCatalogSaved?.(activeBrand, nextCatalog);
  };
  const patchGroup = (id: string, next: Partial<ProductGroup>) => setGroups(data.groups.map(g => (g.id === id ? { ...g, ...next } : g)));
  const patchProduct = (pid: string, next: Partial<CatalogProduct>) => group && patchGroup(group.id, { products: group.products.map(p => (p.id === pid ? { ...p, ...next } : p)) });

  const addGroup = () => {
    const g = newGroup('');
    setGroups([...data.groups, g]);
    setGroupId(g.id);
  };
  const removeGroup = (g: ProductGroup) => {
    if (g.products.length > 0) {
      setPendingDeleteGroup(g);
      return;
    }
    setGroups(data.groups.filter(x => x.id !== g.id));
    setGroupId(null);
  };
  const removeProduct = (p: CatalogProduct) => {
    if (!group) return;
    if (p.cartLinks.length > 0 || p.affiliateLinks.length > 0 || (p.bundleComponents || []).length > 0) {
      setPendingDeleteProduct(p);
      return;
    }
    patchGroup(group.id, { products: group.products.filter(x => x.id !== p.id) });
  };

  const importLegacy = () => {
    const res = importLegacyProducts(data, activeBrand, legacyProducts);
    if (res.added === 0) {
      notify(res.skipped > 0 ? 'Các sản phẩm của bảng cũ đã có trong danh mục.' : 'Bảng cũ không có sản phẩm của Brand này.', 'info');
      return;
    }
    update(res.catalog);
    if (activeBrand) onCatalogSaved?.(activeBrand, res.catalog);
    notify(`Đã đưa ${res.added} sản phẩm từ bảng cũ vào nhóm "Chưa phân nhóm"${res.skipped ? `, bỏ qua ${res.skipped} sản phẩm đã có` : ''}. Hoa hồng và link affiliate cần nhập lại.`, 'success');
  };

  const patchCart = (p: CatalogProduct, id: string, next: Partial<CartLink>) => patchProduct(p.id, { cartLinks: p.cartLinks.map(l => (l.id === id ? { ...l, ...next } : l)) });
  const patchAff = (p: CatalogProduct, id: string, next: Partial<AffiliateLink>) => patchProduct(p.id, { affiliateLinks: p.affiliateLinks.map(l => (l.id === id ? { ...l, ...next } : l)) });
  const patchBundleComp = (p: CatalogProduct, id: string, next: Partial<BundleComponentItem>) =>
    patchProduct(p.id, {
      bundleComponents: (p.bundleComponents || []).map(c => (c.id === id ? { ...c, ...next } : c)),
    });

  const urlClass = (url: string) => (url.trim() && !isHttpUrl(url) ? 'border-critical' : '');

  const visibleProducts = useMemo(() => {
    if (!group) return [];
    return group.products.filter(p => {
      const pType = p.productType || 'SINGLE';
      if (filterType === 'SINGLE' && pType !== 'SINGLE') return false;
      if (filterType === 'COMBO' && pType === 'SINGLE') return false;
      if (filterRole !== 'ALL' && (p.role || 'HERO') !== filterRole) return false;
      if (filterStatus !== 'ALL' && p.status !== filterStatus) return false;
      return true;
    });
  }, [group, filterType, filterRole, filterStatus]);

  const renderProduct = (p: CatalogProduct) => {
    const pType: ProductItemType = p.productType || 'SINGLE';
    const isCombo = pType === 'HARD_BUNDLE' || pType === 'ROUTINE_COMBO';
    const pRole: ProductPushRole = p.role || 'HERO';
    const sampleCheck = resolveEffectiveSampleQuota(data, p);
    const effLinks = resolveEffectiveProductLinks(data, p);
    const candidateComponentProducts = allBrandProducts.filter(x => x.product.id !== p.id && (x.product.productType || 'SINGLE') === 'SINGLE');

    return (
      <div key={p.id} className="rounded-lg border border-line bg-surface">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <Select
            value={pType}
            onChange={e => patchProduct(p.id, { productType: e.target.value as ProductItemType })}
            className="w-[215px]"
          >
            {(Object.keys(PRODUCT_TYPE_LABEL) as ProductItemType[]).map(k => (
              <option key={k} value={k}>
                {PRODUCT_TYPE_LABEL[k]}
              </option>
            ))}
          </Select>
          <Input className="h-9 min-w-[220px] flex-1" placeholder={isCombo ? 'Tên Combo / Routine' : 'Tên sản phẩm'} value={p.name} onChange={e => patchProduct(p.id, { name: e.target.value })} />
          <Input className="h-9 w-[150px]" placeholder={isCombo ? 'Mã Combo' : 'SKU nội bộ'} value={p.sku} onChange={e => patchProduct(p.id, { sku: e.target.value })} />
          <Select value={pRole} onChange={e => patchProduct(p.id, { role: e.target.value as ProductPushRole })} className="w-[165px]">
            {(Object.keys(PRODUCT_ROLE_LABEL) as ProductPushRole[]).map(k => (
              <option key={k} value={k}>
                {PRODUCT_ROLE_LABEL[k]}
              </option>
            ))}
          </Select>
          <Select value={p.status} onChange={e => patchProduct(p.id, { status: e.target.value as CatalogProduct['status'] })} className="w-[175px]">
            <option value="ACTIVE">Đang bán</option>
            <option value="OUT_OF_STOCK">Tạm hết hàng (Dừng SLA)</option>
            <option value="STOPPED">Ngừng bán</option>
          </Select>
          <button type="button" aria-label="Xóa sản phẩm" className="rounded p-1.5 text-ink-3 hover:bg-sunken hover:text-critical" onClick={() => removeProduct(p)}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-3">
          {/* Thông số Thương mại, Kho mẫu, Thay thế & Từ khóa BBNT */}
          <div className="grid grid-cols-1 gap-2.5 rounded-md border border-line bg-sunken/40 p-2.5 md:grid-cols-5">
            <div>
              <div className="mb-1 text-2xs font-medium text-ink-3">Giá niêm yết (VNĐ)</div>
              <Input
                type="number"
                min={0}
                className="h-8 text-right"
                placeholder="VD: 350000"
                value={p.originalPrice ?? ''}
                onChange={e => patchProduct(p.id, { originalPrice: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })}
              />
            </div>
            <div>
              <div className="mb-1 text-2xs font-medium text-ink-3">Giá Deal / KM kỳ này (VNĐ)</div>
              <Input
                type="number"
                min={0}
                className="h-8 text-right"
                placeholder="VD: 279000"
                value={p.promoPrice ?? ''}
                onChange={e => patchProduct(p.id, { promoPrice: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })}
              />
            </div>
            <div>
              <div className="mb-1 text-2xs font-medium text-ink-3">
                {isCombo ? 'Quota hộp mẫu riêng (nếu có)' : 'Hạn mức mẫu thử / tháng'}
              </div>
              <Input
                type="number"
                min={0}
                className="h-8 text-right"
                placeholder={isCombo ? 'Trống = tính theo món lẻ' : 'VD: 50'}
                value={p.monthlySampleQuota ?? ''}
                onChange={e => patchProduct(p.id, { monthlySampleQuota: e.target.value === '' ? null : Math.max(0, Math.round(Number(e.target.value))) })}
              />
            </div>
            <div>
              <div className="mb-1 text-2xs font-medium text-ink-3">SKU thay thế khi hết hàng</div>
              <Select
                value={p.substituteProductId || ''}
                onChange={e => patchProduct(p.id, { substituteProductId: e.target.value })}
              >
                <option value="">-- Chưa chọn --</option>
                {allBrandProducts
                  .filter(x => x.product.id !== p.id && x.product.status === 'ACTIVE')
                  .map(x => (
                    <option key={x.product.id} value={x.product.id}>
                      {x.product.name || x.product.sku} ({x.group.name})
                    </option>
                  ))}
              </Select>
            </div>
            <div>
              <div className="mb-1 text-2xs font-medium text-ink-3">Từ khóa dò phụ đề BBNT</div>
              <Input
                className="h-8"
                placeholder="VD: cushion clio, phấn nước..."
                value={p.detectKeywords || ''}
                onChange={e => patchProduct(p.id, { detectKeywords: e.target.value })}
              />
            </div>
          </div>

          {/* Cấu hình Thành phần Combo (nếu là HARD_BUNDLE hoặc ROUTINE_COMBO) */}
          {isCombo && (
            <div className="space-y-2 rounded-md border border-line bg-sunken/30 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-ink">
                    Thành phần cấu thành Combo ({(p.bundleComponents || []).length} món)
                  </span>
                  {sampleCheck.quota !== null && (
                    <span className="rounded bg-surface px-2 py-0.5 text-2xs font-medium text-ink-2 border border-line">
                      Khả dụng tối đa: <strong>{sampleCheck.remaining}</strong> bộ mẫu
                      {sampleCheck.bottleneckProductName ? ` (giới hạn bởi ${sampleCheck.bottleneckProductName})` : ''}
                    </span>
                  )}
                  {sampleCheck.hasOutOfStockComponent && (
                    <span className="rounded bg-critical/10 px-2 py-0.5 text-2xs font-medium text-critical border border-critical/30">
                      Cảnh báo: Có món thành phần đang hết hàng ({sampleCheck.outOfStockComponentNames.join(', ')})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {(p.bundleComponents || []).length > 0 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        patchProduct(p.id, {
                          bundleComponents: autoAllocateBundleWeights(data, p.bundleComponents || []),
                        })
                      }
                    >
                      Tự chia % theo giá niêm yết
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Plus}
                    onClick={() =>
                      patchProduct(p.id, {
                        bundleComponents: [...(p.bundleComponents || []), newBundleComponent(candidateComponentProducts[0]?.product.id || '')],
                      })
                    }
                  >
                    Thêm món vào Combo
                  </Button>
                </div>
              </div>

              {(p.bundleComponents || []).length === 0 ? (
                <div className="rounded border border-dashed border-line px-3 py-3 text-center text-xs text-ink-3">
                  Chọn các SKU đơn lẻ cấu thành nên Combo này để hệ thống tự động kiểm soát tồn mẫu, gộp Claim cấm và phân bổ chi phí/GMV báo cáo không bị nhân đôi.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border border-line bg-surface">
                  <table className="w-full min-w-[680px] border-collapse">
                    <thead>
                      <tr>
                        <th className={TH}>SKU thành phần</th>
                        <th className={`${TH} w-[95px] text-right`}>Số lượng</th>
                        <th className={`${TH} w-[200px]`}>Vai trò trong Combo</th>
                        <th className={`${TH} w-[150px] text-right`}>Tỷ trọng báo cáo (%)</th>
                        <th className={`${TH} w-[140px]`}>Trạng thái / Mẫu</th>
                        <th className={`${TH} w-[40px]`} />
                      </tr>
                    </thead>
                    <tbody>
                      {(p.bundleComponents || []).map(c => {
                        const foundComp = allBrandProducts.find(x => x.product.id === c.productId);
                        const compProd = foundComp?.product;
                        return (
                          <tr key={c.id}>
                            <td className={TD}>
                              <Select
                                value={c.productId}
                                onChange={e => patchBundleComp(p, c.id, { productId: e.target.value })}
                              >
                                <option value="">-- Chọn SKU đơn --</option>
                                {candidateComponentProducts.map(x => (
                                  <option key={x.product.id} value={x.product.id}>
                                    {x.product.name || 'Chưa đặt tên'} {x.product.sku ? `(${x.product.sku})` : ''} — {x.group.name}
                                  </option>
                                ))}
                              </Select>
                            </td>
                            <td className={TD}>
                              <Input
                                type="number"
                                min={1}
                                className="h-8 text-right"
                                value={c.quantity}
                                onChange={e => patchBundleComp(p, c.id, { quantity: Math.max(1, Math.round(Number(e.target.value) || 1)) })}
                              />
                            </td>
                            <td className={TD}>
                              <Select
                                value={c.componentRole}
                                onChange={e => {
                                  const nextRole = e.target.value as BundleComponentRole;
                                  patchBundleComp(p, c.id, {
                                    componentRole: nextRole,
                                    allocationPct: nextRole === 'GIFT' ? 0 : c.allocationPct,
                                  });
                                }}
                              >
                                {(Object.keys(BUNDLE_COMPONENT_ROLE_LABEL) as BundleComponentRole[]).map(r => (
                                  <option key={r} value={r}>
                                    {BUNDLE_COMPONENT_ROLE_LABEL[r]}
                                  </option>
                                ))}
                              </Select>
                            </td>
                            <td className={TD}>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                step="0.1"
                                disabled={c.componentRole === 'GIFT'}
                                className="h-8 text-right"
                                value={c.componentRole === 'GIFT' ? 0 : (c.allocationPct ?? '')}
                                onChange={e =>
                                  patchBundleComp(p, c.id, {
                                    allocationPct: e.target.value === '' ? null : Math.max(0, Math.min(100, Number(e.target.value))),
                                  })
                                }
                              />
                            </td>
                            <td className={`${TD} text-xs text-ink-2`}>
                              {compProd ? (
                                <div>
                                  <span className={compProd.status === 'OUT_OF_STOCK' ? 'font-medium text-critical' : ''}>
                                    {compProd.status === 'ACTIVE' ? 'Đang bán' : compProd.status === 'OUT_OF_STOCK' ? 'Tạm hết hàng' : 'Ngừng bán'}
                                  </span>
                                  {compProd.monthlySampleQuota !== null && compProd.monthlySampleQuota !== undefined && (
                                    <span className="ml-1 text-ink-3">· Quota: {compProd.monthlySampleQuota}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-ink-3">—</span>
                              )}
                            </td>
                            <td className={TD}>
                              <button
                                type="button"
                                aria-label="Xóa món"
                                className="rounded p-1.5 text-ink-3 hover:bg-sunken hover:text-critical"
                                onClick={() =>
                                  patchProduct(p.id, {
                                    bundleComponents: (p.bundleComponents || []).filter(x => x.id !== c.id),
                                  })
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {pType === 'ROUTINE_COMBO' && effLinks.cartLinks.length > 0 && (
                <div className="rounded border border-line bg-surface px-3 py-2 text-xs text-ink-2">
                  <span className="font-semibold text-ink">Chế độ gắn nhiều link lẻ (Routine):</span> Tự động kế thừa{' '}
                  <strong>{effLinks.cartLinks.length} link giỏ hàng</strong> và{' '}
                  <strong>{effLinks.affiliateLinks.length} link affiliate</strong> từ các SKU thành phần khi tạo Deal &amp; xuất Sheet Listing.
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-ink">
                {pType === 'ROUTINE_COMBO' ? 'Link giỏ hàng riêng bổ sung (ngoài các link lẻ kế thừa)' : 'Link giỏ hàng theo Gian hàng'}
              </div>
              <Button size="sm" variant="secondary" icon={Plus} onClick={() => patchProduct(p.id, { cartLinks: [...p.cartLinks, newCartLink()] })}>
                Thêm link
              </Button>
            </div>
          {p.cartLinks.length > 0 && (
            <div className="overflow-x-auto rounded-md border border-line">
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr>
                    <th className={TH}>Sàn</th>
                    <th className={TH}>Gian hàng</th>
                    <th className={TH}>Link</th>
                    <th className={TH}>Ghi chú</th>
                    <th className={TH} />
                  </tr>
                </thead>
                <tbody>
                  {p.cartLinks.map(l => (
                    <tr key={l.id}>
                      <td className={`${TD} w-[130px]`}>
                        <Select value={l.platform} onChange={e => patchCart(p, l.id, { platform: e.target.value })}>
                          {LINK_PLATFORMS.map(x => (
                            <option key={x} value={x}>
                              {x}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className={`${TD} w-[170px]`}>
                        <Input className="h-8" value={l.storeName} onChange={e => patchCart(p, l.id, { storeName: e.target.value })} />
                      </td>
                      <td className={TD}>
                        <Input className={`h-8 ${urlClass(l.url)}`} value={l.url} placeholder="https://" onChange={e => patchCart(p, l.id, { url: e.target.value })} />
                      </td>
                      <td className={`${TD} w-[170px]`}>
                        <Input className="h-8" value={l.note} onChange={e => patchCart(p, l.id, { note: e.target.value })} />
                      </td>
                      <td className={`${TD} w-[40px]`}>
                        <button type="button" aria-label="Xóa link" className="rounded p-1.5 text-ink-3 hover:bg-sunken hover:text-critical" onClick={() => patchProduct(p.id, { cartLinks: p.cartLinks.filter(x => x.id !== l.id) })}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-ink">Link affiliate</div>
            <Button size="sm" variant="secondary" icon={Plus} onClick={() => patchProduct(p.id, { affiliateLinks: [...p.affiliateLinks, newAffiliateLink()] })}>
              Thêm link
            </Button>
          </div>
          {p.affiliateLinks.length > 0 && (
            <div className="overflow-x-auto rounded-md border border-line">
              <table className="w-full min-w-[1000px] border-collapse">
                <thead>
                  <tr>
                    <th className={TH}>Tên link</th>
                    <th className={TH}>Sàn</th>
                    <th className={TH}>Link</th>
                    <th className={`${TH} text-right`}>Hoa hồng (%)</th>
                    <th className={TH}>Loại</th>
                    <th className={TH}>KOC chỉ định</th>
                    <th className={TH}>Từ ngày</th>
                    <th className={TH}>Đến ngày</th>
                    <th className={TH} />
                  </tr>
                </thead>
                <tbody>
                  {p.affiliateLinks.map(l => (
                    <tr key={l.id}>
                      <td className={`${TD} w-[140px]`}>
                        <Input className="h-8" value={l.label} onChange={e => patchAff(p, l.id, { label: e.target.value })} />
                      </td>
                      <td className={`${TD} w-[120px]`}>
                        <Select value={l.platform} onChange={e => patchAff(p, l.id, { platform: e.target.value })}>
                          {LINK_PLATFORMS.map(x => (
                            <option key={x} value={x}>
                              {x}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className={TD}>
                        <Input className={`h-8 ${urlClass(l.url)}`} value={l.url} placeholder="https://" onChange={e => patchAff(p, l.id, { url: e.target.value })} />
                      </td>
                      <td className={`${TD} w-[100px]`}>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step="0.1"
                          className="h-8 text-right"
                          value={l.commissionPct === null ? '' : l.commissionPct}
                          onChange={e => patchAff(p, l.id, { commissionPct: e.target.value === '' ? null : Number(e.target.value) })}
                        />
                      </td>
                      <td className={`${TD} w-[130px]`}>
                        <Select value={l.type} onChange={e => patchAff(p, l.id, { type: e.target.value as AffiliateLinkType, designatedKoc: e.target.value === 'OPEN' ? '' : l.designatedKoc })}>
                          {(Object.keys(AFFILIATE_TYPE_LABEL) as AffiliateLinkType[]).map(k => (
                            <option key={k} value={k}>
                              {AFFILIATE_TYPE_LABEL[k]}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className={`${TD} w-[150px]`}>
                        {l.type === 'DESIGNATED' ? <Input className="h-8" value={l.designatedKoc} placeholder="ID kênh" onChange={e => patchAff(p, l.id, { designatedKoc: e.target.value })} /> : <div className="px-2 py-1.5 text-ink-3">—</div>}
                      </td>
                      <td className={`${TD} w-[140px]`}>
                        <Input type="date" className="h-8" value={l.validFrom} onChange={e => patchAff(p, l.id, { validFrom: e.target.value })} />
                      </td>
                      <td className={`${TD} w-[140px]`}>
                        <Input type="date" className="h-8" value={l.validTo} onChange={e => patchAff(p, l.id, { validTo: e.target.value })} />
                      </td>
                      <td className={`${TD} w-[40px]`}>
                        <button type="button" aria-label="Xóa link" className="rounded p-1.5 text-ink-3 hover:bg-sunken hover:text-critical" onClick={() => patchProduct(p.id, { affiliateLinks: p.affiliateLinks.filter(x => x.id !== l.id) })}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={activeBrand} onChange={e => setBrand(e.target.value)} className="w-[240px]">
          {brands.length === 0 && <option value="">Chưa có thương hiệu</option>}
          {brands.map(b => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </Select>
        <Select value={filterType} onChange={e => setFilterType(e.target.value as 'ALL' | 'SINGLE' | 'COMBO')} className="w-[160px]">
          <option value="ALL">Tất cả loại SP</option>
          <option value="SINGLE">Chỉ SKU đơn lẻ</option>
          <option value="COMBO">Chỉ Combo &amp; Routine</option>
        </Select>
        <Select value={filterRole} onChange={e => setFilterRole(e.target.value as 'ALL' | ProductPushRole)} className="w-[170px]">
          <option value="ALL">Tất cả vai trò</option>
          {(Object.keys(PRODUCT_ROLE_LABEL) as ProductPushRole[]).map(k => (
            <option key={k} value={k}>
              {PRODUCT_ROLE_LABEL[k]}
            </option>
          ))}
        </Select>
        <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value as 'ALL' | CatalogProduct['status'])} className="w-[165px]">
          <option value="ALL">Tất cả trạng thái</option>
          <option value="ACTIVE">Đang bán</option>
          <option value="OUT_OF_STOCK">Tạm hết hàng</option>
          <option value="STOPPED">Ngừng bán</option>
        </Select>
        <span className="text-xs text-ink-3">{saveLabel[status]}</span>
        {errors > 0 && <span className="text-xs text-critical">{errors} lỗi cần sửa</span>}
        <div className="ml-auto flex items-center gap-2">
          {status === 'error' && (
            <Button size="sm" variant="secondary" onClick={saveNow}>
              Lưu lại
            </Button>
          )}
          <Button size="md" variant="secondary" onClick={importLegacy} disabled={!activeBrand || legacyCount === 0}>
            Đưa từ bảng cũ ({legacyCount})
          </Button>
        </div>
      </div>

      {/* Thống kê tổng quan Chiều Sản phẩm & Combo của Brand */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border border-line bg-sunken/40 px-3.5 py-2 text-xs text-ink-2">
        <span>
          Nhóm SP: <strong className="text-ink">{summaryStats.groupCount}</strong>
        </span>
        <span>
          SKU đơn lẻ: <strong className="text-ink">{summaryStats.singleCount}</strong>
        </span>
        <span>
          Combo &amp; Routine: <strong className="text-ink">{summaryStats.comboCount}</strong>
        </span>
        <span>
          Hero SKU chủ lực: <strong className="text-ink">{summaryStats.heroCount}</strong>
        </span>
        <span>
          Tổng hạn mức mẫu thử/tháng: <strong className="text-ink">{summaryStats.totalSampleQuota}</strong>
        </span>
        {summaryStats.oosCount > 0 && (
          <span className="font-medium text-critical">
            Đang tạm hết hàng: <strong>{summaryStats.oosCount}</strong>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="space-y-2 rounded-lg border border-line bg-surface p-3">
          <Button size="md" variant="primary" icon={Plus} onClick={addGroup} disabled={!activeBrand}>
            Thêm nhóm
          </Button>
          {data.groups.length === 0 && <div className="px-1 py-3 text-xs text-ink-3">Chưa có nhóm sản phẩm.</div>}
          <div className="space-y-1">
            {data.groups.map(g => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGroupId(g.id)}
                className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-[13px] transition ${group?.id === g.id ? 'border-accent bg-accent-soft' : 'border-line hover:bg-sunken'}`}
              >
                <span className="truncate">{g.name || 'Chưa đặt tên'}</span>
                <span className="ml-2 text-2xs text-ink-3">{g.products.length}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="min-w-0 space-y-3">
          {!group ? (
            <div className="rounded-lg border border-dashed border-line px-6 py-14 text-center text-sm text-ink-3">Chọn hoặc thêm một nhóm sản phẩm.</div>
          ) : (
            <>
              <div className="rounded-lg border border-line bg-surface p-3 space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Input className="h-9 max-w-[320px]" placeholder="Tên nhóm sản phẩm thúc đẩy" value={group.name} onChange={e => patchGroup(group.id, { name: e.target.value })} />
                  <Button size="md" variant="primary" icon={Plus} onClick={() => patchGroup(group.id, { products: [...group.products, newProduct('SINGLE')] })}>
                    Thêm SKU đơn
                  </Button>
                  <Button size="md" variant="secondary" icon={Plus} onClick={() => patchGroup(group.id, { products: [...group.products, newProduct('HARD_BUNDLE')] })}>
                    Thêm Combo / Routine
                  </Button>
                  <button type="button" aria-label="Xóa nhóm" className="rounded p-1.5 text-ink-3 hover:bg-sunken hover:text-critical" onClick={() => removeGroup(group)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <Input
                    className="h-8 text-xs"
                    placeholder="USP / Điểm nhấn bắt buộc (tự động đổ vào Brief & SOW)"
                    value={group.usp || ''}
                    onChange={e => patchGroup(group.id, { usp: e.target.value })}
                  />
                  <Input
                    className="h-8 text-xs"
                    placeholder="Claim cấm / Từ khóa cấm Do & Don't (tự động đổ vào Brief & SOW)"
                    value={group.forbiddenClaims || ''}
                    onChange={e => patchGroup(group.id, { forbiddenClaims: e.target.value })}
                  />
                </div>
              </div>
              {visibleProducts.length === 0 && (
                <div className="rounded-lg border border-dashed border-line px-6 py-10 text-center text-sm text-ink-3">
                  {group.products.length === 0 ? 'Nhóm này chưa có sản phẩm.' : 'Không có sản phẩm khớp bộ lọc hiện tại.'}
                </div>
              )}
              {visibleProducts.map(renderProduct)}
            </>
          )}

          {issues.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-ink">Kiểm tra ({issues.length})</div>
              {issues.slice(0, 40).map((i, idx) => (
                <div key={idx} className={`rounded-md border px-3 py-1.5 text-[13px] ${i.level === 'error' ? 'border-critical text-critical' : 'border-line text-ink'}`}>
                  <span className="mr-2 font-medium">{i.where}</span>
                  {i.text}
                </div>
              ))}
              {issues.length > 40 && <div className="text-2xs text-ink-3">Còn {issues.length - 40} mục nữa.</div>}
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDeleteGroup)}
        title="Xóa nhóm sản phẩm"
        message={
          pendingDeleteGroup
            ? `Nhóm "${pendingDeleteGroup.name || 'chưa đặt tên'}" có ${pendingDeleteGroup.products.length} sản phẩm. Xóa nhóm sẽ xóa cả sản phẩm và link. Tiếp tục?`
            : ''
        }
        confirmLabel="Xóa nhóm"
        tone="danger"
        onCancel={() => setPendingDeleteGroup(null)}
        onConfirm={() => {
          if (pendingDeleteGroup) {
            setGroups(data.groups.filter(x => x.id !== pendingDeleteGroup.id));
            setGroupId(null);
          }
          setPendingDeleteGroup(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDeleteProduct)}
        title="Xóa sản phẩm"
        message={
          pendingDeleteProduct
            ? `Xóa "${pendingDeleteProduct.name || 'sản phẩm'}" cùng các link của nó?`
            : ''
        }
        confirmLabel="Xóa sản phẩm"
        tone="danger"
        onCancel={() => setPendingDeleteProduct(null)}
        onConfirm={() => {
          if (pendingDeleteProduct && group) {
            patchGroup(group.id, { products: group.products.filter(x => x.id !== pendingDeleteProduct.id) });
          }
          setPendingDeleteProduct(null);
        }}
      />
    </div>
  );
};
