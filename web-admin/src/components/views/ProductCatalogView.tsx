'use client';

import React, { useMemo, useState } from 'react';
import { Edit3, FolderPlus, Plus, Trash2 } from 'lucide-react';
import {
  Button,
  Chips,
  ConfirmDialog,
  DataTable,
  EmptyState,
  Field,
  FilterBar,
  Input,
  Modal,
  Select,
  Status,
  Textarea,
  type Column,
} from '../ui';
import { formatVnd } from '../../lib/format';
import { usePlanRecord } from '../../lib/usePlanRecord';
import {
  AFFILIATE_TYPE_LABEL,
  BUNDLE_COMPONENT_ROLE_LABEL,
  EMPTY_PRODUCT_CATALOG,
  LINK_PLATFORMS,
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
  hideBrandSelector?: boolean;
  selectedAngleProductId?: string;
  onSelectProductForAngle?: (skuOrId: string) => void;
  onCatalogSaved?: (brandName: string, catalog: BrandProductCatalog) => void;
  onNotify?: (message: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

const saveLabel: Record<string, string> = {
  idle: '',
  loading: 'Đang tải…',
  saved: 'Đã lưu',
  dirty: 'Đang chờ lưu…',
  saving: 'Đang lưu…',
  error: 'Lưu lỗi',
};

const ROLE_META: Record<ProductPushRole, { label: string; tone: 'info' | 'positive' | 'neutral' | 'warning' }> = {
  HERO: { label: 'Chủ lực', tone: 'info' },
  ENTRY: { label: 'Phễu dẫn', tone: 'positive' },
  ADDON: { label: 'Bán chéo', tone: 'neutral' },
  GIFT: { label: 'Quà tặng', tone: 'warning' },
};

const TYPE_LABEL_CLEAN: Record<ProductItemType, string> = {
  SINGLE: 'Sản phẩm lẻ',
  HARD_BUNDLE: 'Combo có link riêng',
  ROUTINE_COMBO: 'Combo ghép nhiều link',
};

interface ProductRowItem {
  group: ProductGroup;
  product: CatalogProduct;
}

interface ProductFormDraft {
  mode: 'create' | 'edit';
  originalGroupId?: string;
  targetGroupId: string;
  newGroupName: string;
  product: CatalogProduct;
  showExtraLinks: boolean;
}

const NEW_GROUP_SENTINEL = '__NEW_GROUP__';

function cloneProduct(p: CatalogProduct): CatalogProduct {
  return {
    ...p,
    bundleComponents: (p.bundleComponents || []).map(c => ({ ...c })),
    cartLinks: (p.cartLinks || []).map(l => ({ ...l })),
    affiliateLinks: (p.affiliateLinks || []).map(l => ({ ...l })),
  };
}

export const ProductCatalogView: React.FC<ProductCatalogViewProps> = ({
  brandNames,
  legacyProducts,
  initialBrand,
  hideBrandSelector = false,
  selectedAngleProductId,
  onSelectProductForAngle,
  onCatalogSaved,
  onNotify,
}) => {
  const notify = (msg: string, type: 'success' | 'warning' | 'info' | 'error' = 'info') => onNotify?.(msg, type);
  const brands = useMemo(
    () => Array.from(new Set([...brandNames, ...(initialBrand ? [initialBrand] : [])].filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [brandNames, initialBrand],
  );
  const [brand, setBrand] = useState(initialBrand || '');
  const [groupId, setGroupId] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const [groupModal, setGroupModal] = useState<{ mode: 'create' | 'edit'; group: ProductGroup } | null>(null);
  const [productDraft, setProductDraft] = useState<ProductFormDraft | null>(null);

  const [pendingDeleteGroup, setPendingDeleteGroup] = useState<ProductGroup | null>(null);
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState<{ groupId: string; product: CatalogProduct } | null>(null);

  const activeBrand = brand || initialBrand || brands[0] || '';

  const { data, status, update, saveNow } = usePlanRecord<BrandProductCatalog>(
    '/api/product-catalog',
    activeBrand || null,
    EMPTY_PRODUCT_CATALOG,
    msg => notify(msg, 'warning'),
    'brand',
  );

  const allBrandProducts = useMemo(() => listAllCatalogProducts(data), [data]);

  const [prevBrand, setPrevBrand] = useState(activeBrand);
  if (prevBrand !== activeBrand) {
    setPrevBrand(activeBrand);
    setGroupId('ALL');
  }

  const selectedGroup = groupId === 'ALL' ? null : data.groups.find(g => g.id === groupId) || null;
  const defaultTargetGroup = selectedGroup || data.groups[0] || null;
  const legacyCount = legacyProducts.filter(p => p.brandName === activeBrand).length;

  const setGroups = (groups: ProductGroup[]) => {
    const nextCatalog = { groups };
    update(nextCatalog);
    if (activeBrand) onCatalogSaved?.(activeBrand, nextCatalog);
  };

  const patchGroup = (id: string, next: Partial<ProductGroup>) =>
    setGroups(data.groups.map(g => (g.id === id ? { ...g, ...next } : g)));

  const handleOpenCreateGroup = () => {
    setGroupModal({ mode: 'create', group: newGroup('') });
  };

  const handleOpenEditGroup = (g: ProductGroup) => {
    setGroupModal({ mode: 'edit', group: { ...g } });
  };

  const handleSaveGroupModal = () => {
    if (!groupModal) return;
    const trimmedName = groupModal.group.name.trim() || `Nhóm sản phẩm ${data.groups.length + 1}`;
    const cleaned: ProductGroup = {
      ...groupModal.group,
      name: trimmedName,
    };
    if (groupModal.mode === 'create') {
      setGroups([...data.groups, cleaned]);
      setGroupId(cleaned.id);
      notify(`Đã tạo nhóm "${trimmedName}"`, 'success');
    } else {
      patchGroup(cleaned.id, {
        name: cleaned.name,
        usp: cleaned.usp,
        forbiddenClaims: cleaned.forbiddenClaims,
      });
      notify(`Đã cập nhật nhóm "${trimmedName}"`, 'success');
    }
    setGroupModal(null);
  };

  const handleOpenCreateProduct = (type: ProductItemType = 'SINGLE') => {
    const created = newProduct(type);
    setProductDraft({
      mode: 'create',
      targetGroupId: defaultTargetGroup ? defaultTargetGroup.id : NEW_GROUP_SENTINEL,
      newGroupName: data.groups.length === 0 ? `Sản phẩm ${activeBrand}` : '',
      product: created,
      showExtraLinks: false,
    });
  };

  const handleOpenEditProduct = (gId: string, prod: CatalogProduct) => {
    setProductDraft({
      mode: 'edit',
      originalGroupId: gId,
      targetGroupId: gId,
      newGroupName: '',
      product: cloneProduct(prod),
      showExtraLinks: prod.cartLinks.length > 1 || prod.affiliateLinks.length > 1,
    });
  };

  const handleSaveProductDraft = () => {
    if (!productDraft) return;
    const trimmedName = productDraft.product.name.trim();
    if (!trimmedName) {
      notify('Vui lòng nhập tên sản phẩm', 'warning');
      return;
    }

    const cleanedProduct: CatalogProduct = {
      ...productDraft.product,
      name: trimmedName,
      sku: productDraft.product.sku.trim(),
      cartLinks: productDraft.product.cartLinks.filter(l => l.url.trim() || l.storeName.trim()),
      affiliateLinks: productDraft.product.affiliateLinks.filter(
        l => l.url.trim() || (l.commissionPct !== null && l.commissionPct !== undefined),
      ),
    };

    let nextGroups = [...data.groups];
    let finalGroupId = productDraft.targetGroupId;

    if (finalGroupId === NEW_GROUP_SENTINEL || !nextGroups.some(g => g.id === finalGroupId)) {
      const createdGrp = newGroup(productDraft.newGroupName.trim() || `Sản phẩm ${activeBrand}`);
      nextGroups = [...nextGroups, createdGrp];
      finalGroupId = createdGrp.id;
    }

    if (productDraft.mode === 'create') {
      nextGroups = nextGroups.map(g =>
        g.id === finalGroupId ? { ...g, products: [...g.products, cleanedProduct] } : g,
      );
      setGroups(nextGroups);
      notify(`Đã thêm "${cleanedProduct.name}"`, 'success');
    } else {
      const fromGroupId = productDraft.originalGroupId || finalGroupId;
      if (fromGroupId === finalGroupId) {
        nextGroups = nextGroups.map(g =>
          g.id === finalGroupId
            ? { ...g, products: g.products.map(p => (p.id === cleanedProduct.id ? cleanedProduct : p)) }
            : g,
        );
      } else {
        nextGroups = nextGroups.map(g => {
          if (g.id === fromGroupId) {
            return { ...g, products: g.products.filter(p => p.id !== cleanedProduct.id) };
          }
          if (g.id === finalGroupId) {
            return { ...g, products: [...g.products, cleanedProduct] };
          }
          return g;
        });
      }
      setGroups(nextGroups);
      notify(`Đã cập nhật "${cleanedProduct.name}"`, 'success');
    }

    setProductDraft(null);
  };

  const removeGroup = (g: ProductGroup) => {
    if (g.products.length > 0) {
      setPendingDeleteGroup(g);
      return;
    }
    setGroups(data.groups.filter(x => x.id !== g.id));
    setGroupId('ALL');
  };

  const removeProduct = (targetGroupId: string, p: CatalogProduct) => {
    if (p.cartLinks.length > 0 || p.affiliateLinks.length > 0 || (p.bundleComponents || []).length > 0) {
      setPendingDeleteProduct({ groupId: targetGroupId, product: p });
      return;
    }
    const g = data.groups.find(x => x.id === targetGroupId);
    if (!g) return;
    patchGroup(targetGroupId, { products: g.products.filter(x => x.id !== p.id) });
  };

  const importLegacy = () => {
    const res = importLegacyProducts(data, activeBrand, legacyProducts);
    if (res.added === 0) {
      notify(res.skipped > 0 ? 'Các sản phẩm đã có trong danh mục.' : 'Không có sản phẩm cũ của nhãn này.', 'info');
      return;
    }
    update(res.catalog);
    if (activeBrand) onCatalogSaved?.(activeBrand, res.catalog);
    notify(`Đã thêm ${res.added} sản phẩm vào danh mục.`, 'success');
  };

  const groupChipItems = useMemo(() => {
    return [
      { key: 'ALL', label: 'Tất cả', count: allBrandProducts.length },
      ...data.groups.map(g => ({
        key: g.id,
        label: g.name || 'Chưa đặt tên',
        count: g.products.length,
      })),
    ];
  }, [allBrandProducts.length, data.groups]);

  const visibleRows = useMemo<ProductRowItem[]>(() => {
    const source = selectedGroup
      ? selectedGroup.products.map(product => ({ group: selectedGroup, product }))
      : allBrandProducts;
    const q = search.trim().toLowerCase();
    if (!q) return source;
    return source.filter(({ group: grp, product: p }) => {
      return `${p.name} ${p.sku} ${p.size || ''} ${grp.name} ${p.usps || ''}`.toLowerCase().includes(q);
    });
  }, [selectedGroup, allBrandProducts, search]);

  const urlClass = (url: string) => (url.trim() && !isHttpUrl(url) ? 'border-critical' : '');

  const columns: Column<ProductRowItem>[] = [
    {
      key: 'name',
      header: 'Sản phẩm & Mã SKU',
      render: ({ product: p }) => {
        const pType: ProductItemType = p.productType || 'SINGLE';
        const isCombo = pType === 'HARD_BUNDLE' || pType === 'ROUTINE_COMBO';
        return (
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-ink">
                {p.name || <span className="text-critical">Chưa đặt tên</span>}
              </span>
              {isCombo && (
                <span className="px-1.5 py-0.5 rounded bg-accent-soft text-accent text-2xs font-medium">
                  Combo {(p.bundleComponents || []).length > 0 ? `(${(p.bundleComponents || []).length} món)` : ''}
                </span>
              )}
            </div>
            <div className="text-2xs text-ink-3 mt-0.5 flex flex-wrap items-center gap-1.5">
              <span className="font-code">{p.sku || 'Chưa có mã SKU'}</span>
              {p.size && <span>· {p.size}</span>}
            </div>
          </div>
        );
      },
    },
    {
      key: 'group',
      header: 'Nhóm hàng',
      width: 170,
      render: ({ group: grp }) => (
        <span className="text-xs text-ink-2 truncate block max-w-[165px]" title={grp.name}>
          {grp.name || 'Chưa đặt tên'}
        </span>
      ),
    },
    {
      key: 'role',
      header: 'Vai trò & Trạng thái',
      width: 175,
      render: ({ product: p }) => {
        const roleMeta = ROLE_META[p.role || 'HERO'] || ROLE_META.HERO;
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            <Status tone={roleMeta.tone}>{roleMeta.label}</Status>
            <Status
              tone={
                p.status === 'ACTIVE'
                  ? 'positive'
                  : p.status === 'OUT_OF_STOCK'
                    ? 'critical'
                    : 'neutral'
              }
            >
              {p.status === 'ACTIVE' ? 'Đang bán' : p.status === 'OUT_OF_STOCK' ? 'Tạm hết' : 'Ngừng bán'}
            </Status>
          </div>
        );
      },
    },
    {
      key: 'price',
      header: 'Giá bán',
      align: 'right',
      width: 135,
      render: ({ product: p }) => (
        <div className="tabular-nums text-right leading-tight">
          {p.promoPrice ? (
            <>
              <span className="font-semibold text-ink block">{formatVnd(p.promoPrice)}</span>
              {p.originalPrice && p.originalPrice > p.promoPrice && (
                <span className="text-2xs text-ink-3 line-through block">{formatVnd(p.originalPrice)}</span>
              )}
            </>
          ) : p.originalPrice ? (
            <span className="font-medium text-ink">{formatVnd(p.originalPrice)}</span>
          ) : (
            <span className="text-ink-3">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'links',
      header: 'Hoa hồng & Mẫu thử',
      width: 170,
      render: ({ product: p }) => {
        const effLinks = resolveEffectiveProductLinks(data, p);
        const sampleCheck = resolveEffectiveSampleQuota(data, p);
        const commPct = effLinks.affiliateLinks[0]?.commissionPct;
        return (
          <div className="leading-tight text-xs space-y-0.5">
            <div className="text-ink">
              {commPct !== null && commPct !== undefined ? (
                <span className="font-medium text-positive">HH {commPct}%</span>
              ) : (
                <span className="text-ink-3">Chưa nhập HH</span>
              )}
              <span className="text-ink-3">
                {' · '}
                {sampleCheck.quota !== null ? `${sampleCheck.remaining} mẫu` : 'Mẫu tự do'}
              </span>
            </div>
            <div className="text-2xs text-ink-3">
              {effLinks.cartLinks.length} link giỏ · {effLinks.affiliateLinks.length} link aff
            </div>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      width: 150,
      render: ({ group: grp, product: p }) => {
        const isSelectedForAngle = selectedAngleProductId === (p.sku || p.id);
        return (
          <div className="inline-flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
            {onSelectProductForAngle && (
              <Button
                size="sm"
                variant={isSelectedForAngle ? 'primary' : 'ghost'}
                onClick={() => onSelectProductForAngle(p.sku || p.id)}
              >
                {isSelectedForAngle ? 'Đang lọc' : 'Kịch bản'}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              icon={Edit3}
              onClick={() => handleOpenEditProduct(grp.id, p)}
            >
              Sửa
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={Trash2}
              onClick={() => removeProduct(grp.id, p)}
            />
          </div>
        );
      },
    },
  ];

  return (
    <div className={hideBrandSelector ? 'divide-y divide-line' : 'rounded-xl border border-line bg-surface overflow-hidden divide-y divide-line'}>
      {/* 1. THANH LỌC NHÓM, TÌM KIẾM & NÚT THÊM */}
      <div className="p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            {!hideBrandSelector && (
              <Select value={activeBrand} onChange={e => setBrand(e.target.value)} className="w-[180px]">
                {brands.length === 0 && <option value="">Chưa có thương hiệu</option>}
                {brands.map(b => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            )}
            <div className="flex-1 min-w-[240px]">
              <FilterBar
                search={{
                  value: search,
                  onChange: setSearch,
                  placeholder: 'Tìm tên sản phẩm, mã SKU, nhóm hàng...',
                }}
                chips={<Chips items={groupChipItems} value={groupId} onChange={setGroupId} />}
                resultCount={search.trim() ? visibleRows.length : undefined}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {saveLabel[status] && <span className="text-2xs text-ink-3 mr-1">{saveLabel[status]}</span>}
            {status === 'error' && (
              <Button size="sm" variant="secondary" onClick={saveNow}>
                Lưu lại
              </Button>
            )}
            {legacyCount > 0 && allBrandProducts.length === 0 && (
              <Button size="sm" variant="ghost" onClick={importLegacy}>
                Lấy dữ liệu cũ ({legacyCount})
              </Button>
            )}
            <Button size="sm" variant="secondary" icon={FolderPlus} onClick={handleOpenCreateGroup} disabled={!activeBrand}>
              Nhóm hàng
            </Button>
            <Button size="sm" variant="primary" icon={Plus} onClick={() => handleOpenCreateProduct('SINGLE')} disabled={!activeBrand}>
              Thêm sản phẩm
            </Button>
          </div>
        </div>

        {/* 2. THANH THÔNG TIN NHÓM ĐANG CHỌN (GỌN 1 DÒNG) */}
        {selectedGroup && (
          <div className="rounded-lg border border-line bg-canvas px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 min-w-0">
              <span className="font-semibold text-ink">{selectedGroup.name || 'Nhóm chưa đặt tên'}</span>
              {selectedGroup.usp && (
                <span className="text-ink-2 truncate max-w-[360px]" title={selectedGroup.usp}>
                  USP: {selectedGroup.usp}
                </span>
              )}
              {selectedGroup.forbiddenClaims && (
                <span className="text-critical truncate max-w-[320px]" title={selectedGroup.forbiddenClaims}>
                  Lưu ý: {selectedGroup.forbiddenClaims}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button size="sm" variant="secondary" icon={Edit3} onClick={() => handleOpenEditGroup(selectedGroup)}>
                Sửa nhóm
              </Button>
              <Button size="sm" variant="ghost" icon={Trash2} onClick={() => removeGroup(selectedGroup)}>
                Xóa nhóm
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 3. BẢNG DANH SÁCH SẢN PHẨM */}
      <div>
        <DataTable
          columns={columns}
          rows={visibleRows}
          rowKey={r => r.product.id}
          onRowClick={r => handleOpenEditProduct(r.group.id, r.product)}
          empty={
            <EmptyState
              title={data.groups.length === 0 ? 'Chưa có sản phẩm nào' : 'Không tìm thấy sản phẩm phù hợp'}
              action={
                <Button size="sm" variant="primary" icon={Plus} onClick={() => handleOpenCreateProduct('SINGLE')}>
                  Thêm sản phẩm
                </Button>
              }
            />
          }
        />
      </div>

      {/* ===================================================================== */}
      {/* HỘP THOẠI TẠO / SỬA NHÓM SẢN PHẨM                                     */}
      {/* ===================================================================== */}
      <Modal
        open={Boolean(groupModal)}
        onClose={() => setGroupModal(null)}
        title={groupModal?.mode === 'create' ? 'Tạo nhóm sản phẩm' : 'Sửa nhóm sản phẩm'}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setGroupModal(null)}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleSaveGroupModal}>
              Lưu nhóm
            </Button>
          </>
        }
      >
        {groupModal && (
          <div className="space-y-3.5">
            <Field label="Tên nhóm sản phẩm *">
              <Input
                value={groupModal.group.name}
                placeholder="VD: Dòng chống nắng kiềm dầu, Bộ dưỡng trắng..."
                onChange={e => setGroupModal(prev => (prev ? { ...prev, group: { ...prev.group, name: e.target.value } } : null))}
              />
            </Field>
            <Field label="Điểm nổi bật chung của nhóm (USP)">
              <Input
                value={groupModal.group.usp || ''}
                placeholder="VD: Chống nắng phổ rộng, kiềm dầu 8 tiếng..."
                onChange={e => setGroupModal(prev => (prev ? { ...prev, group: { ...prev.group, usp: e.target.value } } : null))}
              />
            </Field>
            <Field label="Lưu ý hoặc từ cấm của nhóm">
              <Input
                value={groupModal.group.forbiddenClaims || ''}
                placeholder="VD: Không cam kết trị nám 100%..."
                onChange={e =>
                  setGroupModal(prev => (prev ? { ...prev, group: { ...prev.group, forbiddenClaims: e.target.value } } : null))
                }
              />
            </Field>
          </div>
        )}
      </Modal>

      {/* ===================================================================== */}
      {/* HỘP THOẠI THÊM / SỬA SẢN PHẨM (1 MÀN HÌNH DUY NHẤT - BẢN NHÁP)        */}
      {/* ===================================================================== */}
      <Modal
        open={Boolean(productDraft)}
        onClose={() => setProductDraft(null)}
        title={
          productDraft
            ? productDraft.mode === 'create'
              ? 'Thêm sản phẩm / Combo'
              : `Sửa: ${productDraft.product.name || 'Sản phẩm'}`
            : ''
        }
        size="xl"
        footer={
          productDraft ? (
            <div className="flex w-full items-center justify-between gap-2">
              <div>
                {productDraft.mode === 'edit' && (
                  <Button
                    variant="danger"
                    icon={Trash2}
                    onClick={() => {
                      const gId = productDraft.originalGroupId || productDraft.targetGroupId;
                      const prod = productDraft.product;
                      setProductDraft(null);
                      removeProduct(gId, prod);
                    }}
                  >
                    Xóa sản phẩm
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setProductDraft(null)}>
                  Hủy
                </Button>
                <Button
                  variant="primary"
                  disabled={!productDraft.product.name.trim()}
                  onClick={handleSaveProductDraft}
                >
                  {productDraft.mode === 'create' ? 'Thêm sản phẩm' : 'Lưu thay đổi'}
                </Button>
              </div>
            </div>
          ) : undefined
        }
      >
        {productDraft && (() => {
          const p = productDraft.product;
          const pType: ProductItemType = p.productType || 'SINGLE';
          const isCombo = pType === 'HARD_BUNDLE' || pType === 'ROUTINE_COMBO';
          const pRole: ProductPushRole = p.role || 'HERO';
          const candidateComponentProducts = allBrandProducts.filter(
            x => x.product.id !== p.id && (x.product.productType || 'SINGLE') === 'SINGLE',
          );

          const patchProd = (next: Partial<CatalogProduct>) =>
            setProductDraft(prev => (prev ? { ...prev, product: { ...prev.product, ...next } } : null));

          const primaryCart = p.cartLinks[0] || null;
          const primaryAff = p.affiliateLinks[0] || null;
          const primaryPlatform = primaryCart?.platform || primaryAff?.platform || 'TikTok Shop';

          const setPrimaryPlatform = (platform: string) => {
            const nextCarts =
              p.cartLinks.length > 0
                ? p.cartLinks.map((l, idx) => (idx === 0 ? { ...l, platform } : l))
                : [{ ...newCartLink(), platform }];
            const nextAffs =
              p.affiliateLinks.length > 0
                ? p.affiliateLinks.map((l, idx) => (idx === 0 ? { ...l, platform } : l))
                : [{ ...newAffiliateLink(), platform }];
            patchProd({ cartLinks: nextCarts, affiliateLinks: nextAffs });
          };

          const setPrimaryCartUrl = (url: string) => {
            const nextCarts =
              p.cartLinks.length > 0
                ? p.cartLinks.map((l, idx) => (idx === 0 ? { ...l, url } : l))
                : [{ ...newCartLink(), platform: primaryPlatform, url }];
            patchProd({ cartLinks: nextCarts });
          };

          const setPrimaryCommission = (commissionPct: number | null) => {
            const nextAffs =
              p.affiliateLinks.length > 0
                ? p.affiliateLinks.map((l, idx) => (idx === 0 ? { ...l, commissionPct } : l))
                : [{ ...newAffiliateLink(), platform: primaryPlatform, commissionPct }];
            patchProd({ affiliateLinks: nextAffs });
          };

          const setPrimaryAffUrl = (url: string) => {
            const nextAffs =
              p.affiliateLinks.length > 0
                ? p.affiliateLinks.map((l, idx) => (idx === 0 ? { ...l, url } : l))
                : [{ ...newAffiliateLink(), platform: primaryPlatform, url }];
            patchProd({ affiliateLinks: nextAffs });
          };

          const patchCart = (id: string, next: Partial<CartLink>) =>
            patchProd({ cartLinks: p.cartLinks.map(l => (l.id === id ? { ...l, ...next } : l)) });
          const patchAff = (id: string, next: Partial<AffiliateLink>) =>
            patchProd({ affiliateLinks: p.affiliateLinks.map(l => (l.id === id ? { ...l, ...next } : l)) });
          const patchBundleComp = (id: string, next: Partial<BundleComponentItem>) =>
            patchProd({
              bundleComponents: autoAllocateBundleWeights(
                data,
                (p.bundleComponents || []).map(c => (c.id === id ? { ...c, ...next } : c)),
              ),
            });

          const isCreatingNewGroup =
            productDraft.targetGroupId === NEW_GROUP_SENTINEL || data.groups.length === 0;

          return (
            <div className="space-y-4">
              {/* KHỐI 1: THÔNG TIN CƠ BẢN & GIÁ BÁN */}
              <div className="rounded-lg border border-line bg-canvas/50 p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-ink">1. Thông tin sản phẩm &amp; giá bán</span>
                  <div className="inline-flex rounded-lg border border-line bg-surface p-0.5 gap-0.5">
                    {(Object.keys(TYPE_LABEL_CLEAN) as ProductItemType[]).map(k => {
                      const active = pType === k;
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => patchProd({ productType: k })}
                          className={`px-2.5 py-1 rounded-md text-2xs font-medium transition-colors ${
                            active ? 'bg-ink text-surface' : 'text-ink-2 hover:text-ink'
                          }`}
                        >
                          {TYPE_LABEL_CLEAN[k]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <Field label={isCombo ? 'Tên Combo *' : 'Tên sản phẩm *'} className="sm:col-span-2">
                    <Input
                      value={p.name}
                      placeholder={isCombo ? 'VD: Bộ đôi làm sạch kép' : 'VD: Kem chống nắng kiềm dầu 50ml'}
                      onChange={e => patchProd({ name: e.target.value })}
                    />
                  </Field>
                  <Field label="Mã SKU">
                    <Input
                      value={p.sku}
                      placeholder="VD: SKU-01"
                      onChange={e => patchProd({ sku: e.target.value })}
                    />
                  </Field>
                  <Field label="Quy cách đóng gói">
                    <Input
                      placeholder="VD: Tuýp 50ml"
                      value={p.size || ''}
                      onChange={e => patchProd({ size: e.target.value })}
                    />
                  </Field>

                  <Field label="Nhóm sản phẩm" className={isCreatingNewGroup ? 'sm:col-span-1' : 'sm:col-span-2'}>
                    <Select
                      value={isCreatingNewGroup ? NEW_GROUP_SENTINEL : productDraft.targetGroupId}
                      onChange={e =>
                        setProductDraft(prev => (prev ? { ...prev, targetGroupId: e.target.value } : null))
                      }
                    >
                      {data.groups.map(g => (
                        <option key={g.id} value={g.id}>
                          {g.name || 'Nhóm chưa đặt tên'}
                        </option>
                      ))}
                      <option value={NEW_GROUP_SENTINEL}>+ Tạo nhóm mới...</option>
                    </Select>
                  </Field>
                  {isCreatingNewGroup && (
                    <Field label="Tên nhóm mới">
                      <Input
                        value={productDraft.newGroupName}
                        placeholder="VD: Dòng chống nắng"
                        onChange={e =>
                          setProductDraft(prev => (prev ? { ...prev, newGroupName: e.target.value } : null))
                        }
                      />
                    </Field>
                  )}
                  <Field label="Vai trò">
                    <Select
                      value={pRole}
                      onChange={e => patchProd({ role: e.target.value as ProductPushRole })}
                    >
                      {(Object.keys(ROLE_META) as ProductPushRole[]).map(k => (
                        <option key={k} value={k}>
                          {ROLE_META[k].label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Trạng thái bán">
                    <Select
                      value={p.status}
                      onChange={e => patchProd({ status: e.target.value as CatalogProduct['status'] })}
                    >
                      <option value="ACTIVE">Đang bán</option>
                      <option value="OUT_OF_STOCK">Tạm hết hàng</option>
                      <option value="STOPPED">Ngừng bán</option>
                    </Select>
                  </Field>

                  <Field label="Giá niêm yết (VNĐ)">
                    <Input
                      type="number"
                      min={0}
                      placeholder="VD: 350000"
                      value={p.originalPrice ?? ''}
                      onChange={e =>
                        patchProd({ originalPrice: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })
                      }
                    />
                  </Field>
                  <Field label="Giá bán tham khảo (VNĐ)">
                    <Input
                      type="number"
                      min={0}
                      placeholder="VD: 279000"
                      value={p.promoPrice ?? ''}
                      onChange={e =>
                        patchProd({ promoPrice: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })
                      }
                    />
                  </Field>
                  <Field label="Hoa hồng KOC (%)">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="0.5"
                      placeholder="VD: 10"
                      value={primaryAff?.commissionPct ?? ''}
                      onChange={e =>
                        setPrimaryCommission(e.target.value === '' ? null : Number(e.target.value))
                      }
                    />
                  </Field>
                  <Field label="Mẫu thử tối đa / tháng">
                    <Input
                      type="number"
                      min={0}
                      placeholder="Không giới hạn"
                      value={p.monthlySampleQuota ?? ''}
                      onChange={e =>
                        patchProd({
                          monthlySampleQuota:
                            e.target.value === '' ? null : Math.max(0, Math.round(Number(e.target.value))),
                        })
                      }
                    />
                  </Field>
                </div>

                {/* CÁC MÓN TRONG COMBO */}
                {isCombo && (
                  <div className="rounded-lg border border-line bg-surface p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-ink">
                        Sản phẩm lẻ trong Combo ({(p.bundleComponents || []).length} món)
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={Plus}
                        onClick={() =>
                          patchProd({
                            bundleComponents: autoAllocateBundleWeights(data, [
                              ...(p.bundleComponents || []),
                              newBundleComponent(candidateComponentProducts[0]?.product.id || ''),
                            ]),
                          })
                        }
                      >
                        Thêm món
                      </Button>
                    </div>

                    {(p.bundleComponents || []).length === 0 ? (
                      <p className="text-xs text-ink-3 py-1">
                        Chưa có sản phẩm thành phần. Nhấn &ldquo;Thêm món&rdquo; để chọn các SKU lẻ trong Combo.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {(p.bundleComponents || []).map(c => (
                          <div
                            key={c.id}
                            className="grid grid-cols-1 sm:grid-cols-[1fr_90px_160px_auto] gap-2 items-center bg-canvas p-2 rounded border border-line"
                          >
                            <Select
                              value={c.productId}
                              onChange={e => patchBundleComp(c.id, { productId: e.target.value })}
                            >
                              <option value="">-- Chọn sản phẩm lẻ --</option>
                              {candidateComponentProducts.map(x => (
                                <option key={x.product.id} value={x.product.id}>
                                  {x.product.name || 'Chưa đặt tên'} {x.product.sku ? `(${x.product.sku})` : ''}
                                </option>
                              ))}
                            </Select>
                            <Input
                              type="number"
                              min={1}
                              value={c.quantity}
                              onChange={e =>
                                patchBundleComp(c.id, {
                                  quantity: Math.max(1, Math.round(Number(e.target.value) || 1)),
                                })
                              }
                            />
                            <Select
                              value={c.componentRole}
                              onChange={e =>
                                patchBundleComp(c.id, {
                                  componentRole: e.target.value as BundleComponentRole,
                                })
                              }
                            >
                              {(Object.keys(BUNDLE_COMPONENT_ROLE_LABEL) as BundleComponentRole[]).map(r => (
                                <option key={r} value={r}>
                                  {BUNDLE_COMPONENT_ROLE_LABEL[r]}
                                </option>
                              ))}
                            </Select>
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={Trash2}
                              onClick={() =>
                                patchProd({
                                  bundleComponents: autoAllocateBundleWeights(
                                    data,
                                    (p.bundleComponents || []).filter(x => x.id !== c.id),
                                  ),
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* KHỐI 2: LINK GIỎ HÀNG & LINK HOA HỒNG */}
              <div className="rounded-lg border border-line bg-canvas/50 p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-ink">2. Link sản phẩm trên sàn &amp; Link Affiliate</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Plus}
                    onClick={() =>
                      setProductDraft(prev => {
                        if (!prev) return null;
                        const nextCarts =
                          prev.product.cartLinks.length > 0
                            ? [...prev.product.cartLinks, newCartLink()]
                            : [newCartLink(), newCartLink()];
                        return {
                          ...prev,
                          showExtraLinks: true,
                          product: { ...prev.product, cartLinks: nextCarts },
                        };
                      })
                    }
                  >
                    Thêm link sàn / gian hàng khác
                  </Button>
                </div>

                {!productDraft.showExtraLinks ? (
                  <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr_1fr] gap-3">
                    <Field label="Sàn bán chính">
                      <Select value={primaryPlatform} onChange={e => setPrimaryPlatform(e.target.value)}>
                        {LINK_PLATFORMS.map(x => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Link giỏ hàng sản phẩm">
                      <Input
                        className={urlClass(primaryCart?.url || '')}
                        value={primaryCart?.url || ''}
                        placeholder="https://shop.tiktok.com/... hoặc https://shopee.vn/..."
                        onChange={e => setPrimaryCartUrl(e.target.value)}
                      />
                    </Field>
                    <Field label="Link hoa hồng (Affiliate)">
                      <Input
                        className={urlClass(primaryAff?.url || '')}
                        value={primaryAff?.url || ''}
                        placeholder="https://..."
                        onChange={e => setPrimaryAffUrl(e.target.value)}
                      />
                    </Field>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-2xs font-semibold text-ink-2">
                          Danh sách link sản phẩm trên sàn ({p.cartLinks.length})
                        </span>
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={Plus}
                          onClick={() => patchProd({ cartLinks: [...p.cartLinks, newCartLink()] })}
                        >
                          Thêm link giỏ hàng
                        </Button>
                      </div>
                      {p.cartLinks.map(l => (
                        <div
                          key={l.id}
                          className="grid grid-cols-1 sm:grid-cols-[130px_150px_1fr_auto] gap-2 items-center bg-surface p-2 rounded border border-line"
                        >
                          <Select value={l.platform} onChange={e => patchCart(l.id, { platform: e.target.value })}>
                            {LINK_PLATFORMS.map(x => (
                              <option key={x} value={x}>
                                {x}
                              </option>
                            ))}
                          </Select>
                          <Input
                            placeholder="Tên gian hàng"
                            value={l.storeName}
                            onChange={e => patchCart(l.id, { storeName: e.target.value })}
                          />
                          <Input
                            className={urlClass(l.url)}
                            value={l.url}
                            placeholder="Link sản phẩm (https://...)"
                            onChange={e => patchCart(l.id, { url: e.target.value })}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={Trash2}
                            onClick={() => patchProd({ cartLinks: p.cartLinks.filter(x => x.id !== l.id) })}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 pt-2 border-t border-line">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-2xs font-semibold text-ink-2">
                          Danh sách link Affiliate &amp; Hoa hồng ({p.affiliateLinks.length})
                        </span>
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={Plus}
                          onClick={() => patchProd({ affiliateLinks: [...p.affiliateLinks, newAffiliateLink()] })}
                        >
                          Thêm link Affiliate
                        </Button>
                      </div>
                      {p.affiliateLinks.map(l => (
                        <div
                          key={l.id}
                          className="grid grid-cols-1 sm:grid-cols-[120px_95px_130px_1fr_auto] gap-2 items-center bg-surface p-2 rounded border border-line"
                        >
                          <Select value={l.platform} onChange={e => patchAff(l.id, { platform: e.target.value })}>
                            {LINK_PLATFORMS.map(x => (
                              <option key={x} value={x}>
                                {x}
                              </option>
                            ))}
                          </Select>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step="0.5"
                            placeholder="% HH"
                            value={l.commissionPct === null ? '' : l.commissionPct}
                            onChange={e =>
                              patchAff(l.id, {
                                commissionPct: e.target.value === '' ? null : Number(e.target.value),
                              })
                            }
                          />
                          <Select
                            value={l.type}
                            onChange={e =>
                              patchAff(l.id, {
                                type: e.target.value as AffiliateLinkType,
                                designatedKoc: e.target.value === 'OPEN' ? '' : l.designatedKoc,
                              })
                            }
                          >
                            {(Object.keys(AFFILIATE_TYPE_LABEL) as AffiliateLinkType[]).map(k => (
                              <option key={k} value={k}>
                                {AFFILIATE_TYPE_LABEL[k]}
                              </option>
                            ))}
                          </Select>
                          <Input
                            className={urlClass(l.url)}
                            value={l.url}
                            placeholder="Link Affiliate (https://...)"
                            onChange={e => patchAff(l.id, { url: e.target.value })}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={Trash2}
                            onClick={() => patchProd({ affiliateLinks: p.affiliateLinks.filter(x => x.id !== l.id) })}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* KHỐI 3: ĐIỂM BÁN CHÍNH (USP) & LƯU Ý KHI QUAY */}
              <div className="rounded-lg border border-line bg-canvas/50 p-3.5 space-y-3">
                <span className="text-xs font-semibold text-ink block">3. Điểm bán chính (USP) &amp; lưu ý khi quay</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Điểm bán chính (USP)">
                    <Textarea
                      rows={2}
                      placeholder="VD: Thấm nhanh trong 3 giây, không vón cục, kiềm dầu 8 tiếng..."
                      value={p.usps || ''}
                      onChange={e => patchProd({ usps: e.target.value })}
                    />
                  </Field>
                  <Field label="Công dụng chính">
                    <Textarea
                      rows={2}
                      placeholder="Mô tả công dụng để KOC giới thiệu đúng trong video..."
                      value={p.mechanism || ''}
                      onChange={e => patchProd({ mechanism: e.target.value })}
                    />
                  </Field>
                  <Field label="Thành phần nổi bật">
                    <Input
                      placeholder="VD: Niacinamide 5%, Chiết xuất Rau má, Vitamin E..."
                      value={p.ingredients || ''}
                      onChange={e => patchProd({ ingredients: e.target.value })}
                    />
                  </Field>
                  <Field label="Đối tượng / Loại da phù hợp">
                    <Input
                      placeholder="VD: Da dầu mụn nhạy cảm, trẻ sơ sinh..."
                      value={p.targetUser || ''}
                      onChange={e => patchProd({ targetUser: e.target.value })}
                    />
                  </Field>
                  <Field label="Cách dùng & lưu ý khi quay (kết cấu, cách test)">
                    <Input
                      placeholder="VD: Chất gel trong suốt, quay cận cảnh lúc thoa tệp vào da..."
                      value={p.usageInstruction || ''}
                      onChange={e => patchProd({ usageInstruction: e.target.value })}
                    />
                  </Field>
                  <Field label="Lưu ý tránh sai sót / Không dùng cho">
                    <Input
                      placeholder="VD: Không bôi lên vết thương hở, không nói trị dứt điểm..."
                      value={p.contraindications || ''}
                      onChange={e => patchProd({ contraindications: e.target.value })}
                    />
                  </Field>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDeleteGroup)}
        title="Xóa nhóm sản phẩm"
        message={
          pendingDeleteGroup
            ? `Nhóm "${pendingDeleteGroup.name || 'chưa đặt tên'}" có ${pendingDeleteGroup.products.length} sản phẩm. Xóa nhóm sẽ xóa cả sản phẩm bên trong. Tiếp tục?`
            : ''
        }
        confirmLabel="Xóa nhóm"
        tone="danger"
        onCancel={() => setPendingDeleteGroup(null)}
        onConfirm={() => {
          if (pendingDeleteGroup) {
            setGroups(data.groups.filter(x => x.id !== pendingDeleteGroup.id));
            setGroupId('ALL');
          }
          setPendingDeleteGroup(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDeleteProduct)}
        title="Xóa sản phẩm"
        message={
          pendingDeleteProduct
            ? `Xóa "${pendingDeleteProduct.product.name || 'sản phẩm'}" cùng các liên kết của nó?`
            : ''
        }
        confirmLabel="Xóa sản phẩm"
        tone="danger"
        onCancel={() => setPendingDeleteProduct(null)}
        onConfirm={() => {
          if (pendingDeleteProduct) {
            const g = data.groups.find(x => x.id === pendingDeleteProduct.groupId);
            if (g) {
              patchGroup(g.id, {
                products: g.products.filter(x => x.id !== pendingDeleteProduct.product.id),
              });
            }
          }
          setPendingDeleteProduct(null);
        }}
      />
    </div>
  );
};
