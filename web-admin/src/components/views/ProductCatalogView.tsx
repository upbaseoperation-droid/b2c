'use client';

import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, ConfirmDialog, Input, Select } from '../ui';
import { usePlanRecord } from '../../lib/usePlanRecord';
import {
  AFFILIATE_TYPE_LABEL,
  EMPTY_PRODUCT_CATALOG,
  LINK_PLATFORMS,
  importLegacyProducts,
  isHttpUrl,
  newAffiliateLink,
  newCartLink,
  newGroup,
  newProduct,
  validateProductCatalog,
  type AffiliateLink,
  type AffiliateLinkType,
  type BrandProductCatalog,
  type CartLink,
  type CatalogProduct,
  type LegacyProductLike,
  type ProductGroup,
} from '../../lib/productCatalog';

interface ProductCatalogViewProps {
  brandNames: string[];
  legacyProducts: LegacyProductLike[];
  onNotify?: (message: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

const saveLabel: Record<string, string> = { idle: '', loading: 'Đang tải…', saved: 'Đã lưu', dirty: 'Chưa lưu', saving: 'Đang lưu…', error: 'Lưu lỗi' };
const TH = 'whitespace-nowrap border-b border-line bg-sunken px-2 py-1.5 text-left text-2xs font-medium text-ink-3';
const TD = 'border-b border-line px-2 py-1 align-top';

export const ProductCatalogView: React.FC<ProductCatalogViewProps> = ({ brandNames, legacyProducts, onNotify }) => {
  const notify = (msg: string, type: 'success' | 'warning' | 'info' | 'error' = 'info') => onNotify?.(msg, type);
  const brands = useMemo(() => Array.from(new Set(brandNames)).sort((a, b) => a.localeCompare(b)), [brandNames]);
  const [brand, setBrand] = useState('');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [pendingDeleteGroup, setPendingDeleteGroup] = useState<ProductGroup | null>(null);
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState<CatalogProduct | null>(null);
  const activeBrand = brand || brands[0] || '';

  const { data, status, update, saveNow } = usePlanRecord<BrandProductCatalog>('/api/product-catalog', activeBrand || null, EMPTY_PRODUCT_CATALOG, msg => notify(msg, 'warning'), 'brand');
  const issues = useMemo(() => validateProductCatalog(data), [data]);
  const errors = issues.filter(i => i.level === 'error').length;

  const [prevBrand, setPrevBrand] = useState(activeBrand);
  if (prevBrand !== activeBrand) {
    setPrevBrand(activeBrand);
    setGroupId(null);
  }
  const group = data.groups.find(g => g.id === groupId) || data.groups[0] || null;
  const legacyCount = legacyProducts.filter(p => p.brandName === activeBrand).length;

  const setGroups = (groups: ProductGroup[]) => update({ groups });
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
    if (p.cartLinks.length > 0 || p.affiliateLinks.length > 0) {
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
    notify(`Đã đưa ${res.added} sản phẩm từ bảng cũ vào nhóm "Chưa phân nhóm"${res.skipped ? `, bỏ qua ${res.skipped} sản phẩm đã có` : ''}. Hoa hồng và link affiliate cần nhập lại.`, 'success');
  };

  const patchCart = (p: CatalogProduct, id: string, next: Partial<CartLink>) => patchProduct(p.id, { cartLinks: p.cartLinks.map(l => (l.id === id ? { ...l, ...next } : l)) });
  const patchAff = (p: CatalogProduct, id: string, next: Partial<AffiliateLink>) => patchProduct(p.id, { affiliateLinks: p.affiliateLinks.map(l => (l.id === id ? { ...l, ...next } : l)) });

  const urlClass = (url: string) => (url.trim() && !isHttpUrl(url) ? 'border-critical' : '');

  const renderProduct = (p: CatalogProduct) => (
    <div key={p.id} className="rounded-lg border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        <Input className="h-9 min-w-[220px] flex-1" placeholder="Tên sản phẩm" value={p.name} onChange={e => patchProduct(p.id, { name: e.target.value })} />
        <Input className="h-9 w-[160px]" placeholder="SKU nội bộ" value={p.sku} onChange={e => patchProduct(p.id, { sku: e.target.value })} />
        <Select value={p.status} onChange={e => patchProduct(p.id, { status: e.target.value as CatalogProduct['status'] })} className="w-[140px]">
          <option value="ACTIVE">Đang bán</option>
          <option value="STOPPED">Ngừng bán</option>
        </Select>
        <button type="button" aria-label="Xóa sản phẩm" className="rounded p-1.5 text-ink-3 hover:bg-sunken hover:text-critical" onClick={() => removeProduct(p)}>
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4 p-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-ink">Link giỏ hàng</div>
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={activeBrand} onChange={e => setBrand(e.target.value)} className="w-[260px]">
          {brands.length === 0 && <option value="">Chưa có thương hiệu</option>}
          {brands.map(b => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
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
                  <Button size="md" variant="primary" icon={Plus} onClick={() => patchGroup(group.id, { products: [...group.products, newProduct()] })}>
                    Thêm sản phẩm
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
              {group.products.length === 0 && <div className="rounded-lg border border-dashed border-line px-6 py-10 text-center text-sm text-ink-3">Nhóm này chưa có sản phẩm.</div>}
              {group.products.map(renderProduct)}
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
