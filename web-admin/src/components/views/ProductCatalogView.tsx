'use client';

import React, { useMemo, useState } from 'react';
import { Edit3, FolderPlus, Layers, Plus, Trash2 } from 'lucide-react';
import { Button, ConfirmDialog, EmptyState, Field, Input, Modal, Select, Status, Textarea } from '../ui';
import { formatVnd } from '../../lib/format';
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
  saved: 'Đã lưu tự động',
  dirty: 'Đang chờ lưu…',
  saving: 'Đang lưu…',
  error: 'Lưu lỗi',
};

const TH = 'whitespace-nowrap border-b border-line bg-sunken/50 px-3 py-2 text-left text-2xs font-semibold text-ink-3';
const TD = 'border-b border-line px-3 py-2.5 align-middle text-xs';

const ROLE_SHORT_LABEL: Record<ProductPushRole, { label: string; tone: 'info' | 'positive' | 'neutral' | 'warning' }> = {
  HERO: { label: 'Hero chủ lực', tone: 'info' },
  ENTRY: { label: 'SP Phễu dẫn', tone: 'positive' },
  ADDON: { label: 'Bán chéo', tone: 'neutral' },
  GIFT: { label: 'Quà tặng GWP', tone: 'warning' },
};

const TYPE_SHORT_LABEL: Record<ProductItemType, string> = {
  SINGLE: 'SKU đơn',
  HARD_BUNDLE: 'Combo có link riêng',
  ROUTINE_COMBO: 'Routine gắn nhiều link',
};

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
  const [filterType, setFilterType] = useState<'ALL' | 'SINGLE' | 'COMBO'>('ALL');
  const [filterRole, setFilterRole] = useState<'ALL' | ProductPushRole>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | CatalogProduct['status']>('ALL');

  // State tạo / sửa Nhóm sản phẩm trong Modal gọn gàng
  const [groupModal, setGroupModal] = useState<{ mode: 'create' | 'edit'; group: ProductGroup } | null>(null);
  // State tạo / sửa Sản phẩm hoặc Combo trong Modal
  const [editingProductModal, setEditingProductModal] = useState<{ groupId: string; productId: string; isNew?: boolean } | null>(null);

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

  const patchProductInGroup = (targetGroupId: string, pid: string, next: Partial<CatalogProduct>) => {
    const targetGrp = data.groups.find(g => g.id === targetGroupId);
    if (!targetGrp) return;
    patchGroup(targetGroupId, {
      products: targetGrp.products.map(p => (p.id === pid ? { ...p, ...next } : p)),
    });
  };

  const moveProductToGroup = (fromGroupId: string, toGroupId: string, prod: CatalogProduct) => {
    if (fromGroupId === toGroupId) return;
    setGroups(
      data.groups.map(g => {
        if (g.id === fromGroupId) {
          return { ...g, products: g.products.filter(p => p.id !== prod.id) };
        }
        if (g.id === toGroupId) {
          return { ...g, products: [...g.products, prod] };
        }
        return g;
      }),
    );
    setEditingProductModal(prev => (prev ? { ...prev, groupId: toGroupId } : null));
  };

  const handleOpenCreateGroup = () => {
    const draft = newGroup('');
    setGroupModal({ mode: 'create', group: draft });
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
      notify(`Đã tạo nhóm sản phẩm "${trimmedName}"`, 'success');
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

  const handleCreateProduct = (type: ProductItemType) => {
    let targetGrp = defaultTargetGroup;
    let nextGroups = data.groups;
    if (!targetGrp) {
      targetGrp = newGroup(`Sản phẩm chủ lực ${activeBrand}`);
      nextGroups = [targetGrp];
    }
    const created = newProduct(type);
    const updatedGroups = nextGroups.map(g =>
      g.id === targetGrp!.id ? { ...g, products: [...g.products, created] } : g,
    );
    setGroups(updatedGroups);
    setEditingProductModal({ groupId: targetGrp.id, productId: created.id, isNew: true });
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
      notify(res.skipped > 0 ? 'Các sản phẩm của bảng cũ đã có trong danh mục.' : 'Bảng cũ không có sản phẩm của Brand này.', 'info');
      return;
    }
    update(res.catalog);
    if (activeBrand) onCatalogSaved?.(activeBrand, res.catalog);
    notify(`Đã đưa ${res.added} sản phẩm từ bảng cũ vào danh mục.`, 'success');
  };

  const visibleRows = useMemo(() => {
    const source = selectedGroup
      ? selectedGroup.products.map(product => ({ group: selectedGroup, product }))
      : allBrandProducts;
    return source.filter(({ product: p }) => {
      const pType = p.productType || 'SINGLE';
      if (filterType === 'SINGLE' && pType !== 'SINGLE') return false;
      if (filterType === 'COMBO' && pType === 'SINGLE') return false;
      if (filterRole !== 'ALL' && (p.role || 'HERO') !== filterRole) return false;
      if (filterStatus !== 'ALL' && p.status !== filterStatus) return false;
      return true;
    });
  }, [selectedGroup, allBrandProducts, filterType, filterRole, filterStatus]);

  // Sản phẩm đang mở trong Modal chỉnh sửa
  const activeModalContext = useMemo(() => {
    if (!editingProductModal) return null;
    const grp = data.groups.find(g => g.id === editingProductModal.groupId);
    const prod = grp?.products.find(p => p.id === editingProductModal.productId);
    if (!grp || !prod) return null;
    return { group: grp, product: prod };
  }, [editingProductModal, data.groups]);

  const urlClass = (url: string) => (url.trim() && !isHttpUrl(url) ? 'border-critical' : '');

  return (
    <div className="space-y-3">
      {/* 1. THANH CHỌN NHÓM SẢN PHẨM & NÚT TẠO NHANH */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-line">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
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

          <button
            type="button"
            onClick={() => setGroupId('ALL')}
            className={`h-8 px-3 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
              groupId === 'ALL'
                ? 'border-accent bg-accent-soft text-accent font-semibold'
                : 'border-line bg-surface text-ink-2 hover:bg-sunken hover:text-ink'
            }`}
          >
            <span>Tất cả nhóm</span>
            <span className="text-2xs px-1.5 py-0.2 rounded-full bg-canvas text-ink-3 tabular-nums">
              {allBrandProducts.length}
            </span>
          </button>

          {data.groups.map(g => {
            const isSelected = groupId === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setGroupId(g.id)}
                className={`h-8 px-3 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors max-w-[240px] ${
                  isSelected
                    ? 'border-accent bg-accent-soft text-accent font-semibold'
                    : 'border-line bg-surface text-ink-2 hover:bg-sunken hover:text-ink'
                }`}
              >
                <span className="truncate">{g.name || 'Nhóm chưa đặt tên'}</span>
                <span className="text-2xs px-1.5 py-0.2 rounded-full bg-canvas text-ink-3 tabular-nums shrink-0">
                  {g.products.length}
                </span>
              </button>
            );
          })}

          <Button size="sm" variant="secondary" icon={FolderPlus} onClick={handleOpenCreateGroup} disabled={!activeBrand}>
            Tạo nhóm SP
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {saveLabel[status] && <span className="text-2xs text-ink-3 mr-1">{saveLabel[status]}</span>}
          {status === 'error' && (
            <Button size="sm" variant="secondary" onClick={saveNow}>
              Lưu lại
            </Button>
          )}
          {legacyCount > 0 && (
            <Button size="sm" variant="ghost" onClick={importLegacy}>
              Lấy từ bảng cũ ({legacyCount})
            </Button>
          )}
          <Button size="sm" variant="secondary" icon={Plus} onClick={() => handleCreateProduct('HARD_BUNDLE')} disabled={!activeBrand}>
            Thêm Combo / Routine
          </Button>
          <Button size="sm" variant="primary" icon={Plus} onClick={() => handleCreateProduct('SINGLE')} disabled={!activeBrand}>
            Thêm SKU đơn
          </Button>
        </div>
      </div>

      {/* 2. THÔNG TIN NHÓM ĐANG CHỌN (NẾU ĐANG CHỌN 1 NHÓM CỤ THỂ) */}
      {selectedGroup && (
        <div className="rounded-xl border border-line bg-canvas/60 px-3.5 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="min-w-0 space-y-1 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-2xs font-semibold uppercase tracking-wide text-accent bg-accent-soft px-2 py-0.5 rounded">
                Nhóm sản phẩm
              </span>
              <h4 className="text-sm font-semibold text-ink">{selectedGroup.name || 'Nhóm chưa đặt tên'}</h4>
              <span className="text-2xs text-ink-3">({selectedGroup.products.length} sản phẩm)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-xs">
              <div className="truncate">
                <span className="text-ink-3">Điểm nhấn USP: </span>
                <span className="text-ink font-medium">{selectedGroup.usp || 'Chưa thiết lập'}</span>
              </div>
              <div className="truncate">
                <span className="text-ink-3">Lưu ý / Từ cấm nhóm: </span>
                <span className="text-critical font-medium">{selectedGroup.forbiddenClaims || 'Chưa thiết lập'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button size="sm" variant="secondary" icon={Edit3} onClick={() => handleOpenEditGroup(selectedGroup)}>
              Sửa thông tin nhóm
            </Button>
            <Button size="sm" variant="ghost" icon={Trash2} onClick={() => removeGroup(selectedGroup)}>
              Xóa nhóm
            </Button>
          </div>
        </div>
      )}

      {/* 3. THANH LỌC NHANH & CHỈ SỐ TỔNG QUAN */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-2">
          <span>
            Nhóm SP: <strong className="text-ink">{summaryStats.groupCount}</strong>
          </span>
          <span>
            SKU đơn: <strong className="text-ink">{summaryStats.singleCount}</strong>
          </span>
          <span>
            Combo &amp; Routine: <strong className="text-ink">{summaryStats.comboCount}</strong>
          </span>
          <span>
            Hero chủ lực: <strong className="text-ink">{summaryStats.heroCount}</strong>
          </span>
          <span>
            Quota mẫu/tháng: <strong className="text-ink">{summaryStats.totalSampleQuota}</strong>
          </span>
          {summaryStats.oosCount > 0 && (
            <span className="font-medium text-critical">
              Tạm hết hàng: <strong>{summaryStats.oosCount}</strong>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Select value={filterType} onChange={e => setFilterType(e.target.value as 'ALL' | 'SINGLE' | 'COMBO')} className="w-[145px]">
            <option value="ALL">Tất cả loại SP</option>
            <option value="SINGLE">Chỉ SKU đơn lẻ</option>
            <option value="COMBO">Chỉ Combo &amp; Routine</option>
          </Select>
          <Select value={filterRole} onChange={e => setFilterRole(e.target.value as 'ALL' | ProductPushRole)} className="w-[150px]">
            <option value="ALL">Tất cả vai trò</option>
            {(Object.keys(PRODUCT_ROLE_LABEL) as ProductPushRole[]).map(k => (
              <option key={k} value={k}>
                {ROLE_SHORT_LABEL[k].label}
              </option>
            ))}
          </Select>
          <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value as 'ALL' | CatalogProduct['status'])} className="w-[145px]">
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang bán</option>
            <option value="OUT_OF_STOCK">Tạm hết hàng</option>
            <option value="STOPPED">Ngừng bán</option>
          </Select>
        </div>
      </div>

      {/* 4. BẢNG DANH SÁCH SẢN PHẨM & COMBO RÕ RÀNG, DỄ QUÉT */}
      {visibleRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-8">
          <EmptyState
            title={data.groups.length === 0 ? 'Chưa có nhóm sản phẩm nào' : 'Chưa có sản phẩm khớp bộ lọc'}
            action={
              <div className="flex items-center gap-2">
                {data.groups.length === 0 && (
                  <Button size="sm" variant="secondary" icon={FolderPlus} onClick={handleOpenCreateGroup}>
                    Tạo nhóm sản phẩm
                  </Button>
                )}
                <Button size="sm" variant="primary" icon={Plus} onClick={() => handleCreateProduct('SINGLE')}>
                  Thêm SKU đơn đầu tiên
                </Button>
              </div>
            }
          />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Sản phẩm / Combo &amp; Mã SKU</th>
                <th className={TH}>Nhóm sản phẩm</th>
                <th className={TH}>Phân loại &amp; Vai trò</th>
                <th className={`${TH} text-right`}>Giá niêm yết → Giá Deal</th>
                <th className={TH}>Mẫu thử &amp; Liên kết</th>
                <th className={`${TH} text-right`}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map(({ group: grp, product: p }) => {
                const pType: ProductItemType = p.productType || 'SINGLE';
                const isCombo = pType === 'HARD_BUNDLE' || pType === 'ROUTINE_COMBO';
                const pRole: ProductPushRole = p.role || 'HERO';
                const roleMeta = ROLE_SHORT_LABEL[pRole] || ROLE_SHORT_LABEL.HERO;
                const effLinks = resolveEffectiveProductLinks(data, p);
                const sampleCheck = resolveEffectiveSampleQuota(data, p);
                const isAngleSelected = selectedAngleProductId === (p.sku || p.id);

                return (
                  <tr
                    key={p.id}
                    onClick={() => setEditingProductModal({ groupId: grp.id, productId: p.id })}
                    className="group cursor-pointer transition-colors hover:bg-canvas/70"
                  >
                    <td className={TD}>
                      <div className="flex items-start gap-2.5 min-w-[200px]">
                        <div
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-2xs font-semibold ${
                            isCombo
                              ? 'border-accent/30 bg-accent-soft text-accent'
                              : 'border-line bg-sunken text-ink-2'
                          }`}
                        >
                          {isCombo ? 'CB' : 'SKU'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-ink group-hover:text-accent transition-colors">
                            {p.name || <span className="text-critical">Chưa đặt tên sản phẩm</span>}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-2xs text-ink-2 mt-0.5">
                            <span className="font-code">{p.sku || 'Chưa có mã SKU'}</span>
                            {p.size && <span>· {p.size}</span>}
                            {p.detectKeywords && (
                              <span className="truncate max-w-[180px]" title={p.detectKeywords}>
                                · Từ khóa: {p.detectKeywords}
                              </span>
                            )}
                          </div>
                          {(p.ingredients || p.mechanism || p.targetUser) && (
                            <div className="text-2xs text-ink-2 mt-0.5 truncate max-w-[280px]" title={[p.ingredients, p.mechanism, p.targetUser].filter(Boolean).join(' · ')}>
                              {[p.ingredients && `TP: ${p.ingredients}`, p.targetUser && `Đối tượng: ${p.targetUser}`, p.mechanism].filter(Boolean).join(' · ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className={TD}>
                      <div className="max-w-[180px]">
                        <span className="font-medium text-ink block truncate">{grp.name || 'Chưa đặt tên'}</span>
                        {grp.usp && (
                          <span className="text-2xs text-ink-3 block truncate mt-0.5" title={grp.usp}>
                            {grp.usp}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className={TD}>
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
                      <span className="block text-2xs text-ink-3 mt-1">{TYPE_SHORT_LABEL[pType]}</span>
                    </td>

                    <td className={`${TD} text-right tabular-nums`}>
                      {p.promoPrice ? (
                        <div>
                          <span className="font-semibold text-ink">{formatVnd(p.promoPrice)}</span>
                          {p.originalPrice && p.originalPrice > p.promoPrice && (
                            <span className="block text-2xs text-ink-3 line-through">{formatVnd(p.originalPrice)}</span>
                          )}
                        </div>
                      ) : p.originalPrice ? (
                        <span className="font-medium text-ink">{formatVnd(p.originalPrice)}</span>
                      ) : (
                        <span className="text-ink-3">Chưa nhập giá</span>
                      )}
                    </td>

                    <td className={TD}>
                      <div className="space-y-0.5 text-2xs">
                        <div className="text-ink-2">
                          Mẫu thử:{' '}
                          <strong className="text-ink tabular-nums">
                            {sampleCheck.quota !== null ? `${sampleCheck.remaining} mẫu` : 'Không giới hạn'}
                          </strong>
                          {isCombo && ` (${(p.bundleComponents || []).length} món)`}
                        </div>
                        <div className="text-ink-3 flex items-center gap-2">
                          <span>{effLinks.cartLinks.length} link giỏ</span>
                          <span>·</span>
                          <span className={effLinks.affiliateLinks.length === 0 ? 'text-warning font-medium' : ''}>
                            {effLinks.affiliateLinks.length} link aff
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className={`${TD} text-right`} onClick={e => e.stopPropagation()}>
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {onSelectProductForAngle && (
                          <Button
                            size="sm"
                            variant={isAngleSelected ? 'primary' : 'secondary'}
                            icon={Layers}
                            onClick={() => onSelectProductForAngle(p.sku || p.id)}
                          >
                            {isAngleSelected ? 'Đang lọc góc' : 'Góc kịch bản'}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={Edit3}
                          onClick={() => setEditingProductModal({ groupId: grp.id, productId: p.id })}
                        >
                          Sửa
                        </Button>
                        <button
                          type="button"
                          aria-label="Xóa sản phẩm"
                          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-ink-3 hover:bg-sunken hover:text-critical"
                          onClick={() => removeProduct(grp.id, p)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ===================================================================== */}
      {/* HỘP THOẠI TẠO / SỬA NHÓM SẢN PHẨM (CÓ NHÃN RÕ RÀNG, DỄ HIỂU)          */}
      {/* ===================================================================== */}
      <Modal
        open={Boolean(groupModal)}
        onClose={() => setGroupModal(null)}
        title={groupModal?.mode === 'create' ? 'Tạo Nhóm sản phẩm mới' : 'Cập nhật Nhóm sản phẩm'}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setGroupModal(null)}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleSaveGroupModal}>
              {groupModal?.mode === 'create' ? 'Tạo nhóm sản phẩm' : 'Lưu thay đổi'}
            </Button>
          </>
        }
      >
        {groupModal && (
          <div className="space-y-3.5">
            <Field label="Tên nhóm sản phẩm / Dòng hàng chủ lực *">
              <Input
                value={groupModal.group.name}
                placeholder="VD: Dòng Chống Nắng Kiềm Dầu, Bộ Dưỡng Trắng..."
                onChange={e => setGroupModal(prev => (prev ? { ...prev, group: { ...prev.group, name: e.target.value } } : null))}
              />
            </Field>
            <Field label="Điểm nhấn USP bắt buộc của nhóm (tự động đưa vào Brief & SOW)">
              <Input
                value={groupModal.group.usp || ''}
                placeholder="VD: Màng lọc chống nắng phổ rộng, kiềm dầu 8h, không nâng tông trắng bệch..."
                onChange={e => setGroupModal(prev => (prev ? { ...prev, group: { ...prev.group, usp: e.target.value } } : null))}
              />
            </Field>
            <Field label="Từ khóa cấm / Lưu ý bắt buộc cho các sản phẩm trong nhóm">
              <Input
                value={groupModal.group.forbiddenClaims || ''}
                placeholder="VD: Không cam kết trị nám 100%, không quay sản phẩm bị rách tem..."
                onChange={e =>
                  setGroupModal(prev => (prev ? { ...prev, group: { ...prev.group, forbiddenClaims: e.target.value } } : null))
                }
              />
            </Field>
          </div>
        )}
      </Modal>

      {/* ===================================================================== */}
      {/* HỘP THOẠI TẠO / SỬA CHI TIẾT SẢN PHẨM & COMBO (CÓ NHÃN ĐẦY ĐỦ)         */}
      {/* ===================================================================== */}
      <Modal
        open={Boolean(activeModalContext)}
        onClose={() => setEditingProductModal(null)}
        title={
          activeModalContext
            ? `${editingProductModal?.isNew ? 'Thêm mới' : 'Chỉnh sửa'} ${
                (activeModalContext.product.productType || 'SINGLE') === 'SINGLE' ? 'Sản phẩm (SKU đơn)' : 'Combo / Routine'
              } — ${activeModalContext.product.name || 'Chưa đặt tên'}`
            : ''
        }
        size="xl"
        footer={
          activeModalContext ? (
            <div className="flex w-full items-center justify-between gap-2">
              <Button
                variant="danger"
                icon={Trash2}
                onClick={() => {
                  const ctx = activeModalContext;
                  setEditingProductModal(null);
                  removeProduct(ctx.group.id, ctx.product);
                }}
              >
                Xóa sản phẩm này
              </Button>
              <Button variant="primary" onClick={() => setEditingProductModal(null)}>
                Hoàn tất
              </Button>
            </div>
          ) : undefined
        }
      >
        {activeModalContext && (() => {
          const { group: grp, product: p } = activeModalContext;
          const pType: ProductItemType = p.productType || 'SINGLE';
          const isCombo = pType === 'HARD_BUNDLE' || pType === 'ROUTINE_COMBO';
          const pRole: ProductPushRole = p.role || 'HERO';
          const sampleCheck = resolveEffectiveSampleQuota(data, p);
          const candidateComponentProducts = allBrandProducts.filter(
            x => x.product.id !== p.id && (x.product.productType || 'SINGLE') === 'SINGLE',
          );

          const patchProd = (next: Partial<CatalogProduct>) => patchProductInGroup(grp.id, p.id, next);
          const patchCart = (id: string, next: Partial<CartLink>) =>
            patchProd({ cartLinks: p.cartLinks.map(l => (l.id === id ? { ...l, ...next } : l)) });
          const patchAff = (id: string, next: Partial<AffiliateLink>) =>
            patchProd({ affiliateLinks: p.affiliateLinks.map(l => (l.id === id ? { ...l, ...next } : l)) });
          const patchBundleComp = (id: string, next: Partial<BundleComponentItem>) =>
            patchProd({
              bundleComponents: (p.bundleComponents || []).map(c => (c.id === id ? { ...c, ...next } : c)),
            });

          return (
            <div className="space-y-4">
              {/* PHẦN 1: THÔNG TIN ĐỊNH DANH & GIÁ BÁN */}
              <div className="rounded-xl border border-line bg-canvas/50 p-3.5 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-ink">
                  1. Định danh sản phẩm, Phân nhóm &amp; Giá bán
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <Field label={isCombo ? 'Tên Combo / Routine *' : 'Tên sản phẩm *'} className="sm:col-span-2">
                    <Input
                      value={p.name}
                      placeholder={isCombo ? 'VD: Combo Làm Sạch Kép 4PM' : 'VD: Kem Chống Nắng Babe Mattifying 50ml'}
                      onChange={e => patchProd({ name: e.target.value })}
                    />
                  </Field>
                  <Field label={isCombo ? 'Mã Combo' : 'Mã SKU nội bộ'}>
                    <Input
                      value={p.sku}
                      placeholder="VD: SKU-4PM-01"
                      onChange={e => patchProd({ sku: e.target.value })}
                    />
                  </Field>

                  <Field label="Thuộc Nhóm sản phẩm">
                    <Select
                      value={grp.id}
                      onChange={e => moveProductToGroup(grp.id, e.target.value, p)}
                    >
                      {data.groups.map(g => (
                        <option key={g.id} value={g.id}>
                          {g.name || 'Nhóm chưa đặt tên'}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Hình thức đóng gói">
                    <Select
                      value={pType}
                      onChange={e => patchProd({ productType: e.target.value as ProductItemType })}
                    >
                      {(Object.keys(PRODUCT_TYPE_LABEL) as ProductItemType[]).map(k => (
                        <option key={k} value={k}>
                          {PRODUCT_TYPE_LABEL[k]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Vai trò trong chiến dịch">
                    <Select
                      value={pRole}
                      onChange={e => patchProd({ role: e.target.value as ProductPushRole })}
                    >
                      {(Object.keys(PRODUCT_ROLE_LABEL) as ProductPushRole[]).map(k => (
                        <option key={k} value={k}>
                          {PRODUCT_ROLE_LABEL[k]}
                        </option>
                      ))}
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
                  <Field label="Giá Deal / Khuyến mãi (VNĐ)">
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
                  <Field label="Trạng thái tồn kho">
                    <Select
                      value={p.status}
                      onChange={e => patchProd({ status: e.target.value as CatalogProduct['status'] })}
                    >
                      <option value="ACTIVE">Đang bán</option>
                      <option value="OUT_OF_STOCK">Tạm hết hàng (Dừng SLA)</option>
                      <option value="STOPPED">Ngừng bán</option>
                    </Select>
                  </Field>

                  <Field label={isCombo ? 'Quota hộp mẫu riêng (nếu có)' : 'Hạn mức mẫu thử / tháng'}>
                    <Input
                      type="number"
                      min={0}
                      placeholder={isCombo ? 'Trống = tính theo món lẻ' : 'VD: 30'}
                      value={p.monthlySampleQuota ?? ''}
                      onChange={e =>
                        patchProd({
                          monthlySampleQuota:
                            e.target.value === '' ? null : Math.max(0, Math.round(Number(e.target.value))),
                        })
                      }
                    />
                  </Field>
                  <Field label="SKU thay thế khi hết hàng">
                    <Select
                      value={p.substituteProductId || ''}
                      onChange={e => patchProd({ substituteProductId: e.target.value })}
                    >
                      <option value="">-- Không chọn --</option>
                      {allBrandProducts
                        .filter(x => x.product.id !== p.id && x.product.status === 'ACTIVE')
                        .map(x => (
                          <option key={x.product.id} value={x.product.id}>
                            {x.product.name || x.product.sku} ({x.group.name})
                          </option>
                        ))}
                    </Select>
                  </Field>
                  <Field label="Từ khóa dò phụ đề nghiệm thu">
                    <Input
                      placeholder="VD: kem chống nắng, 4pm..."
                      value={p.detectKeywords || ''}
                      onChange={e => patchProd({ detectKeywords: e.target.value })}
                    />
                  </Field>
                </div>
              </div>

              {/* PHẦN CHUYÊN MÔN SKU: THÀNH PHẦN, CÔNG DỤNG, CÁCH DÙNG & ĐỐI TƯỢNG */}
              <div className="rounded-xl border border-line bg-canvas/50 p-3.5 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-ink">
                  Thông tin chuyên môn SKU (Thành phần, Công dụng, Cách dùng &amp; Đối tượng)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <Field label="Dung tích / Quy cách đóng gói">
                    <Input
                      placeholder="VD: Tuýp 30g, Chai 50ml, Hộp 30 gói"
                      value={p.size || ''}
                      onChange={e => patchProd({ size: e.target.value })}
                    />
                  </Field>
                  <Field label="Đối tượng / Loại da sử dụng phù hợp" className="sm:col-span-2">
                    <Input
                      placeholder="VD: Da dầu mụn nhạy cảm, Trẻ sơ sinh từ 5 ngày tuổi..."
                      value={p.targetUser || ''}
                      onChange={e => patchProd({ targetUser: e.target.value })}
                    />
                  </Field>
                  <Field label="Điểm nổi bật riêng của SKU (USP)" className="sm:col-span-3">
                    <Input
                      placeholder="VD: Thấm nhanh trong 3 giây, không vón cục, kiềm dầu 8 tiếng..."
                      value={p.usps || ''}
                      onChange={e => patchProd({ usps: e.target.value })}
                    />
                  </Field>
                  <Field label="Thành phần & Hoạt chất chính" className="sm:col-span-3">
                    <Input
                      placeholder="VD: Niacinamide 5%, Chiết xuất Rau má, Nghệ Nano THC, Vitamin E..."
                      value={p.ingredients || ''}
                      onChange={e => patchProd({ ingredients: e.target.value })}
                    />
                  </Field>
                  <Field label="Công dụng & Cơ chế tác động" className="sm:col-span-3">
                    <Textarea
                      rows={2}
                      placeholder="Mô tả công dụng chính và cơ chế hoạt động để KOC nói đúng trên video..."
                      value={p.mechanism || ''}
                      onChange={e => patchProd({ mechanism: e.target.value })}
                    />
                  </Field>
                  <Field label="Hướng dẫn sử dụng / Bước dùng trong Routine" className="sm:col-span-2">
                    <Input
                      placeholder="VD: Thoa ngày 2 lần sáng/tối sau bước làm sạch; vỗ nhẹ 15 giây..."
                      value={p.usageInstruction || ''}
                      onChange={e => patchProd({ usageInstruction: e.target.value })}
                    />
                  </Field>
                  <Field label="Lưu ý / Chống chỉ định riêng của SKU">
                    <Input
                      placeholder="VD: Không bôi lên vết thương hở..."
                      value={p.contraindications || ''}
                      onChange={e => patchProd({ contraindications: e.target.value })}
                    />
                  </Field>
                </div>
              </div>

              {/* PHẦN 2: THÀNH PHẦN CẤU THÀNH COMBO (CHỈ HIỆN KHI LÀ COMBO / ROUTINE) */}
              {isCombo && (
                <div className="rounded-xl border border-line bg-canvas/50 p-3.5 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-ink">
                        2. Các SKU đơn lẻ cấu thành Combo ({(p.bundleComponents || []).length} món)
                      </h4>
                      {sampleCheck.quota !== null && (
                        <span className="rounded bg-surface px-2 py-0.5 text-2xs font-medium text-ink-2 border border-line">
                          Khả dụng tối đa: <strong>{sampleCheck.remaining}</strong> bộ mẫu
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {(p.bundleComponents || []).length > 0 && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            patchProd({
                              bundleComponents: autoAllocateBundleWeights(data, p.bundleComponents || []),
                            })
                          }
                        >
                          Tự chia % theo giá
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={Plus}
                        onClick={() =>
                          patchProd({
                            bundleComponents: [
                              ...(p.bundleComponents || []),
                              newBundleComponent(candidateComponentProducts[0]?.product.id || ''),
                            ],
                          })
                        }
                      >
                        Thêm món vào Combo
                      </Button>
                    </div>
                  </div>

                  {(p.bundleComponents || []).length === 0 ? (
                    <div className="rounded-lg border border-dashed border-line bg-surface px-3 py-4 text-center text-xs text-ink-3">
                      Nhấn &ldquo;Thêm món vào Combo&rdquo; để chọn các SKU đơn lẻ nằm trong gói Combo này.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
                      <table className="w-full min-w-[600px] border-collapse">
                        <thead>
                          <tr>
                            <th className={TH}>SKU thành phần</th>
                            <th className={`${TH} w-[90px] text-right`}>Số lượng</th>
                            <th className={`${TH} w-[190px]`}>Vai trò trong Combo</th>
                            <th className={`${TH} w-[140px] text-right`}>Tỷ trọng báo cáo (%)</th>
                            <th className={`${TH} w-[40px]`} />
                          </tr>
                        </thead>
                        <tbody>
                          {(p.bundleComponents || []).map(c => (
                            <tr key={c.id}>
                              <td className={TD}>
                                <Select
                                  value={c.productId}
                                  onChange={e => patchBundleComp(c.id, { productId: e.target.value })}
                                >
                                  <option value="">-- Chọn SKU đơn --</option>
                                  {candidateComponentProducts.map(x => (
                                    <option key={x.product.id} value={x.product.id}>
                                      {x.product.name || 'Chưa đặt tên'} {x.product.sku ? `(${x.product.sku})` : ''}
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
                                  onChange={e =>
                                    patchBundleComp(c.id, {
                                      quantity: Math.max(1, Math.round(Number(e.target.value) || 1)),
                                    })
                                  }
                                />
                              </td>
                              <td className={TD}>
                                <Select
                                  value={c.componentRole}
                                  onChange={e => {
                                    const nextRole = e.target.value as BundleComponentRole;
                                    patchBundleComp(c.id, {
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
                                    patchBundleComp(c.id, {
                                      allocationPct:
                                        e.target.value === ''
                                          ? null
                                          : Math.max(0, Math.min(100, Number(e.target.value))),
                                    })
                                  }
                                />
                              </td>
                              <td className={TD}>
                                <button
                                  type="button"
                                  aria-label="Xóa món"
                                  className="rounded p-1.5 text-ink-3 hover:bg-sunken hover:text-critical"
                                  onClick={() =>
                                    patchProd({
                                      bundleComponents: (p.bundleComponents || []).filter(x => x.id !== c.id),
                                    })
                                  }
                                >
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
              )}

              {/* PHẦN 3: LINK GIỎ HÀNG & LINK AFFILIATE */}
              <div className="rounded-xl border border-line bg-canvas/50 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-ink">
                    {isCombo ? '3. Link giỏ hàng theo Gian hàng' : '2. Link giỏ hàng theo Gian hàng'} ({p.cartLinks.length})
                  </h4>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Plus}
                    onClick={() => patchProd({ cartLinks: [...p.cartLinks, newCartLink()] })}
                  >
                    Thêm link giỏ hàng
                  </Button>
                </div>
                {p.cartLinks.length > 0 && (
                  <div className="overflow-x-auto rounded-lg border border-line bg-surface">
                    <table className="w-full min-w-[560px] border-collapse">
                      <thead>
                        <tr>
                          <th className={`${TH} w-[130px]`}>Sàn</th>
                          <th className={`${TH} w-[160px]`}>Gian hàng</th>
                          <th className={TH}>Link sản phẩm (PDP)</th>
                          <th className={`${TH} w-[150px]`}>Ghi chú</th>
                          <th className={`${TH} w-[40px]`} />
                        </tr>
                      </thead>
                      <tbody>
                        {p.cartLinks.map(l => (
                          <tr key={l.id}>
                            <td className={TD}>
                              <Select value={l.platform} onChange={e => patchCart(l.id, { platform: e.target.value })}>
                                {LINK_PLATFORMS.map(x => (
                                  <option key={x} value={x}>
                                    {x}
                                  </option>
                                ))}
                              </Select>
                            </td>
                            <td className={TD}>
                              <Input
                                className="h-8"
                                placeholder="Tên gian hàng"
                                value={l.storeName}
                                onChange={e => patchCart(l.id, { storeName: e.target.value })}
                              />
                            </td>
                            <td className={TD}>
                              <Input
                                className={`h-8 ${urlClass(l.url)}`}
                                value={l.url}
                                placeholder="https://..."
                                onChange={e => patchCart(l.id, { url: e.target.value })}
                              />
                            </td>
                            <td className={TD}>
                              <Input
                                className="h-8"
                                value={l.note}
                                onChange={e => patchCart(l.id, { note: e.target.value })}
                              />
                            </td>
                            <td className={TD}>
                              <button
                                type="button"
                                aria-label="Xóa link"
                                className="rounded p-1.5 text-ink-3 hover:bg-sunken hover:text-critical"
                                onClick={() => patchProd({ cartLinks: p.cartLinks.filter(x => x.id !== l.id) })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-line">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-ink">
                    Link Affiliate &amp; Mức hoa hồng ({p.affiliateLinks.length})
                  </h4>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Plus}
                    onClick={() => patchProd({ affiliateLinks: [...p.affiliateLinks, newAffiliateLink()] })}
                  >
                    Thêm link Affiliate
                  </Button>
                </div>
                {p.affiliateLinks.length > 0 && (
                  <div className="overflow-x-auto rounded-lg border border-line bg-surface">
                    <table className="w-full min-w-[780px] border-collapse">
                      <thead>
                        <tr>
                          <th className={`${TH} w-[130px]`}>Tên đợt / Nhãn</th>
                          <th className={`${TH} w-[115px]`}>Sàn</th>
                          <th className={TH}>Link Affiliate</th>
                          <th className={`${TH} w-[100px] text-right`}>Hoa hồng (%)</th>
                          <th className={`${TH} w-[130px]`}>Hình thức</th>
                          <th className={`${TH} w-[130px]`}>KOC chỉ định</th>
                          <th className={`${TH} w-[40px]`} />
                        </tr>
                      </thead>
                      <tbody>
                        {p.affiliateLinks.map(l => (
                          <tr key={l.id}>
                            <td className={TD}>
                              <Input
                                className="h-8"
                                placeholder="VD: HH chuẩn"
                                value={l.label}
                                onChange={e => patchAff(l.id, { label: e.target.value })}
                              />
                            </td>
                            <td className={TD}>
                              <Select value={l.platform} onChange={e => patchAff(l.id, { platform: e.target.value })}>
                                {LINK_PLATFORMS.map(x => (
                                  <option key={x} value={x}>
                                    {x}
                                  </option>
                                ))}
                              </Select>
                            </td>
                            <td className={TD}>
                              <Input
                                className={`h-8 ${urlClass(l.url)}`}
                                value={l.url}
                                placeholder="https://..."
                                onChange={e => patchAff(l.id, { url: e.target.value })}
                              />
                            </td>
                            <td className={TD}>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                step="0.1"
                                className="h-8 text-right"
                                value={l.commissionPct === null ? '' : l.commissionPct}
                                onChange={e =>
                                  patchAff(l.id, {
                                    commissionPct: e.target.value === '' ? null : Number(e.target.value),
                                  })
                                }
                              />
                            </td>
                            <td className={TD}>
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
                            </td>
                            <td className={TD}>
                              {l.type === 'DESIGNATED' ? (
                                <Input
                                  className="h-8"
                                  value={l.designatedKoc}
                                  placeholder="ID kênh"
                                  onChange={e => patchAff(l.id, { designatedKoc: e.target.value })}
                                />
                              ) : (
                                <span className="text-ink-3 px-2">Mở tự do</span>
                              )}
                            </td>
                            <td className={TD}>
                              <button
                                type="button"
                                aria-label="Xóa link"
                                className="rounded p-1.5 text-ink-3 hover:bg-sunken hover:text-critical"
                                onClick={() =>
                                  patchProd({ affiliateLinks: p.affiliateLinks.filter(x => x.id !== l.id) })
                                }
                              >
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
            ? `Xóa "${pendingDeleteProduct.product.name || 'sản phẩm'}" cùng các cấu hình liên kết của nó?`
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
