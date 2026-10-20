'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, ExternalLink, FileSpreadsheet } from 'lucide-react';
import type { BookingDealItem, KocItem, StorePortfolioItem } from '../../lib/types';
import { formatVnd } from '../../lib/format';
import {
  CONTENT_NOTE_SUGGESTIONS,
  CONTENT_TAG_OPTIONS,
  DE_XUAT_UPBASE_OPTIONS,
  DOT_LISTING_OPTIONS,
  appendKocsToStaffBrandSheet,
  computeGrossFeeWithTax,
  computeTepBookingFromNetFee,
  normalizeTikTokId,
} from '../../lib/staffBrandListingSheet';
import { Avatar, Button, Field, Input, Modal, Select, Status } from '../ui';

const BRAND_PRODUCT_CATALOG: Record<string, string[]> = {
  '4pm': [
    'Áo thun Polo 4PM Form Regular',
    'Quần âu ống đứng 4PM Smart Casual',
    'Áo sơ mi Oxford 4PM chống nhăn',
    'Quần Short Kaki 4PM Basic',
    'Set đồ nam 4PM Thu Đông',
  ],
  kutieskin: [
    'Kem mẩn ngứa - hăm Kutieskin 30g',
    'Kem dưỡng ẩm cho bé Kutieskin 30g',
    'Sữa tắm gội thảo dược Kutieskin 200ml',
    'Kem chống nắng cho bé Kutieskin',
    'Tinh dầu bạch đàn chanh Kutieskin',
  ],
  clubclio: [
    'Phấn nước Clio Kill Cover Mesh Glow Cushion',
    'Bảng mắt Clio Pro Eye Palette Air',
    'Son tint bóng Clio Crystal Glam Tint',
    'Kẻ mắt nước Clio Superproof Pen Liner',
    'Che khuyết điểm Clio Kill Cover Founwear',
  ],
  peripera: [
    'Son tint bóng Peripera Ink Mood Glowy Tint',
    'Son kem lì Peripera Ink Velvet',
    'Má hồng Peripera Pure Blushed Sunshine Cheek',
    'Bảng mắt Peripera All Take Mood Technique',
  ],
  goodal: [
    'Serum mờ thâm sáng da Goodal Green Tangerine Vita C',
    'Kem dưỡng sáng da Goodal Vita C Dark Spot Cream',
    'Toner Pad Goodal Green Tangerine Vita C',
  ],
  dermatory: [
    'Toner Pad làm dịu da Dermatory Hypoallergenic Cica',
    'Kem dưỡng phục hồi Dermatory Cica Cream',
    'Mặt nạ thạch Dermatory Pro Trouble Pore',
  ],
  klairs: [
    'Nước hoa hồng Dear, Klairs Supple Preparation Unscented Toner',
    'Kem dưỡng ẩm làm dịu Dear, Klairs Midnight Blue Calming Cream',
    'Tinh chất sáng da Dear, Klairs Freshly Juiced Vitamin Drop',
    'Kem chống nắng Dear, Klairs All-day Airy Sunscreen',
  ],
  skin1004: [
    'Tinh chất rau má Skin1004 Madagascar Centella Ampoule',
    'Kem chống nắng Skin1004 Centella Air-Fit Suncream Plus',
    'Dầu tẩy trang Skin1004 Madagascar Centella Light Cleansing Oil',
    'Sữa rửa mặt tạo bọt Skin1004 Centella Ampoule Foam',
  ],
  simplus: [
    'Nồi chiên không dầu Simplus 4.5L',
    'Máy sấy tóc ion âm Simplus 1600W',
    'Bàn ủi hơi nước cầm tay Simplus',
    'Máy hút bụi cầm tay Simplus',
    'Máy xay sinh tố đa năng Simplus',
  ],
  rejuran: [
    'Tinh chất phục hồi Rejuran Healer Turnover Ampoule',
    'Kem dưỡng tái tạo da Rejuran Turnover Active Cream',
    'Kem chống nắng Rejuran UV Protection Cream',
  ],
  loccitane: [
    'Dầu tắm hạnh nhân L’Occitane Almond Shower Oil',
    'Kem dưỡng da tay L’Occitane Shea Butter Hand Cream',
    'Tinh chất dưỡng tóc L’Occitane Intensive Repair',
  ],
  senka: [
    'Sữa rửa mặt tạo bọt Senka Perfect Whip 120g',
    'Nước tẩy trang Senka All Clear Water Micellar',
    'Kem chống nắng Senka Perfect UV Milk',
  ],
  cindybloom: [
    'Nước hoa Cindy Bloom Urban Vibes 50ml',
    'Xịt thơm toàn thân Cindy Bloom Body Mist',
    'Sữa tắm hương nước hoa Cindy Bloom',
  ],
};

export interface AddToBrandListingSheetModalProps {
  open: boolean;
  onClose: () => void;
  targetKocs: Array<Partial<KocItem> & { stageName: string; channelId: string }>;
  allKocs: KocItem[];
  stores: StorePortfolioItem[];
  deals: BookingDealItem[];
  currentUserName?: string;
  defaultMonthKey?: string;
  defaultStoreName?: string;
  onAddedSuccess?: (info: { monthKey: string; storeName: string; openSheet: boolean }) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

const MONTH_OPTIONS = ['2026/11', '2026/10', '2026/09', '2026/08'];

export const AddToBrandListingSheetModal: React.FC<AddToBrandListingSheetModalProps> = ({
  open,
  onClose,
  targetKocs,
  allKocs,
  stores,
  deals,
  currentUserName = 'Chuyên viên Listing',
  defaultMonthKey = '2026/10',
  defaultStoreName,
  onAddedSuccess,
  onNotify,
}) => {
  const b2cStores = useMemo(
    () => stores.filter((s) => s.isB2cManaged !== false && s.storeName),
    [stores]
  );

  const initialStore =
    defaultStoreName && b2cStores.some((s) => s.storeName === defaultStoreName)
      ? defaultStoreName
      : b2cStores[0]?.storeName || 'Kutieskin Chính Hãng - TikTok Shop';

  const [monthKey, setMonthKey] = useState<string>(defaultMonthKey);
  const [storeName, setStoreName] = useState<string>(initialStore);
  const [dot, setDot] = useState<string>('Đợt 1');
  const [contentTag, setContentTag] = useState<string>('Review trực tiếp');
  const [deXuatUpBase, setDeXuatUpBase] = useState<string>('Recommend');
  const [sanPham, setSanPham] = useState<string>('');
  const [contentNote, setContentNote] = useState<string>(
    'Hình ảnh phù hợp với thương hiệu'
  );

  const [prevDefaultStore, setPrevDefaultStore] = useState(defaultStoreName);
  if (defaultStoreName !== prevDefaultStore) {
    setPrevDefaultStore(defaultStoreName);
    if (defaultStoreName) setStoreName(defaultStoreName);
  }

  const activeStoreObj = useMemo(
    () => b2cStores.find((s) => s.storeName === storeName),
    [b2cStores, storeName]
  );

  const productSuggestions = useMemo(() => {
    const set = new Set<string>();
    const brandName = (activeStoreObj?.brandName || storeName.split(/[—\-_]/)[0] || '').trim();
    const bLower = brandName.toLowerCase().replace(/[^a-z0-9]/g, '');

    (activeStoreObj?.mainProducts || []).forEach((p) => {
      if (p?.trim()) set.add(p.trim());
    });

    Object.entries(BRAND_PRODUCT_CATALOG).forEach(([key, items]) => {
      if (bLower.includes(key) || storeName.toLowerCase().includes(key)) {
        items.forEach((it) => set.add(it));
      }
    });

    deals.forEach((d) => {
      if (
        d.brandName &&
        brandName &&
        d.brandName.toLowerCase().includes(brandName.toLowerCase()) &&
        d.productName?.trim()
      ) {
        set.add(d.productName.trim());
      }
    });

    if (brandName) {
      set.add(`Sản phẩm chủ lực ${brandName}`);
      set.add(`Combo bán chạy ${brandName}`);
      set.add(`Sản phẩm mới ra mắt ${brandName}`);
      set.add(`Set quà tặng / Deal chiến dịch ${brandName}`);
    } else {
      set.add('Sản phẩm chủ lực chiến dịch tháng');
      set.add('Combo bán chạy trên gian hàng');
    }

    return Array.from(set);
  }, [activeStoreObj, deals, storeName]);

  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const productBoxRef = useRef<HTMLDivElement>(null);
  const productMenuRef = useRef<HTMLDivElement>(null);
  const [productPos, setProductPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 220,
  });

  const updateProductPos = useCallback(() => {
    const el = productBoxRef.current;
    if (!el || typeof window === 'undefined') return;
    const rect = el.getBoundingClientRect();
    setProductPos({
      top: rect.bottom + 4,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - Math.max(rect.width, 240) - 8)),
      width: Math.max(rect.width, 240),
    });
  }, []);

  useEffect(() => {
    if (!productDropdownOpen) return;
    updateProductPos();
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (productBoxRef.current?.contains(target) || productMenuRef.current?.contains(target)) return;
      setProductDropdownOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setProductDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', updateProductPos);
    window.addEventListener('scroll', updateProductPos, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', updateProductPos);
      window.removeEventListener('scroll', updateProductPos, true);
    };
  }, [productDropdownOpen, updateProductPos]);

  const filteredProductSuggestions = useMemo(() => {
    const q = sanPham.trim().toLowerCase();
    if (!q) return productSuggestions;
    const matched = productSuggestions.filter((p) => p.toLowerCase().includes(q));
    return matched.length > 0 ? matched : productSuggestions;
  }, [productSuggestions, sanPham]);

  const handleConfirm = (openSheetAfter: boolean) => {
    if (!targetKocs.length) return;
    const finalProduct =
      sanPham.trim() ||
      productSuggestions[0] ||
      (activeStoreObj?.brandName ? `Sản phẩm ${activeStoreObj.brandName}` : '');

    const { addedCount, skippedDuplicateCount } = appendKocsToStaffBrandSheet({
      kocsToAdd: targetKocs,
      monthKey,
      storeName,
      staffName: currentUserName,
      allKocs,
      allStores: stores,
      allDeals: deals,
      dot,
      sanPham: finalProduct,
      contentTag,
      deXuatUpBase,
      contentNote: contentNote.trim(),
    });

    if (addedCount > 0) {
      const msg =
        skippedDuplicateCount > 0
          ? `Đã thêm ${addedCount} KOC vào Sheet "${storeName}" (${monthKey}), bỏ qua ${skippedDuplicateCount} kênh đã có.`
          : `Đã thêm ${addedCount} KOC vào Sheet "${storeName}" (${monthKey}).`;
      onNotify?.(msg, 'success');
    } else {
      onNotify?.(
        `Các KOC đã chọn đều đã tồn tại trong Sheet "${storeName}" (${monthKey}).`,
        'warning'
      );
    }

    onAddedSuccess?.({ monthKey, storeName, openSheet: openSheetAfter });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Đưa ${targetKocs.length} KOC vào Sheet Listing của Brand`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Đóng
          </Button>
          <Button variant="secondary" icon={Check} onClick={() => handleConfirm(false)}>
            Lưu vào Sheet
          </Button>
          <Button variant="primary" icon={ExternalLink} onClick={() => handleConfirm(true)}>
            Lưu & Mở Sheet Brand
          </Button>
        </>
      }
    >
      <div className="space-y-4 min-w-0">
        <div className="grid grid-cols-1 sm:grid-cols-[140px_minmax(0,1fr)_125px] gap-3 bg-sunken p-3.5 rounded-lg border border-line">
          <Field label="Tháng làm việc">
            <Select className="w-full" value={monthKey} onChange={(e) => setMonthKey(e.target.value)}>
              {MONTH_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Sheet Brand / Gian hàng">
            <Select className="w-full" value={storeName} onChange={(e) => setStoreName(e.target.value)}>
              {b2cStores.map((st) => (
                <option key={st.id} value={st.storeName}>
                  {st.brandName} — {st.storeName}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Đợt trình duyệt">
            <Select className="w-full" value={dot} onChange={(e) => setDot(e.target.value)}>
              {DOT_LISTING_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Sản phẩm đề xuất (Cột K)">
            <div ref={productBoxRef} className="relative flex items-center min-w-0">
              <Input
                value={sanPham}
                onFocus={() => {
                  updateProductPos();
                  setProductDropdownOpen(true);
                }}
                onClick={() => {
                  updateProductPos();
                  setProductDropdownOpen(true);
                }}
                onChange={(e) => {
                  setSanPham(e.target.value);
                  if (!productDropdownOpen) {
                    updateProductPos();
                    setProductDropdownOpen(true);
                  }
                }}
                placeholder={productSuggestions[0] || 'Chọn hoặc nhập tên sản phẩm...'}
                className="pr-8"
              />
              <button
                type="button"
                tabIndex={-1}
                aria-label="Mở danh sách sản phẩm gợi ý"
                onClick={() => {
                  updateProductPos();
                  setProductDropdownOpen((v) => !v);
                }}
                className="absolute right-2 h-6 w-6 inline-flex items-center justify-center rounded text-ink-3 hover:text-ink"
              >
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-150 ${
                    productDropdownOpen ? 'rotate-180 text-ink' : ''
                  }`}
                />
              </button>
            </div>
            {productDropdownOpen &&
              typeof document !== 'undefined' &&
              createPortal(
                <div
                  ref={productMenuRef}
                  data-select-portal="true"
                  role="listbox"
                  style={{
                    position: 'fixed',
                    top: productPos.top,
                    left: productPos.left,
                    width: productPos.width,
                    zIndex: 220,
                  }}
                  className="bg-surface border border-line-strong rounded-lg shadow-xl overflow-hidden flex flex-col max-h-60 animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-3 bg-sunken/60 border-b border-line">
                    Sản phẩm gợi ý của {activeStoreObj?.brandName || 'Brand'}
                  </div>
                  <div className="overflow-y-auto py-1 divide-y divide-line/40">
                    {filteredProductSuggestions.map((p) => {
                      const active = sanPham.trim() === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            setSanPham(p);
                            setProductDropdownOpen(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 transition-colors ${
                            active
                              ? 'bg-accent-soft text-accent font-semibold'
                              : 'text-ink hover:bg-sunken'
                          }`}
                        >
                          <span className="truncate">{p}</span>
                          {active && <Check className="w-3.5 h-3.5 text-accent shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>,
                document.body
              )}
          </Field>

          <Field label="Content tag (Cột G)">
            <Select className="w-full" value={contentTag} onChange={(e) => setContentTag(e.target.value)}>
              {CONTENT_TAG_OPTIONS.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Đề xuất từ UpBase (Cột R)">
            <Select className="w-full" value={deXuatUpBase} onChange={(e) => setDeXuatUpBase(e.target.value)}>
              {DE_XUAT_UPBASE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Content note (Cột T)">
          <div className="space-y-2">
            <Input
              value={contentNote}
              onChange={(e) => setContentNote(e.target.value)}
              placeholder="Ghi chú định hướng nội dung gửi Brand..."
            />
            <div className="flex flex-wrap gap-1.5">
              {CONTENT_NOTE_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() =>
                    setContentNote((prev) =>
                      prev.includes(s) ? prev : prev ? `${prev} · ${s}` : s
                    )
                  }
                  className="px-2 py-1 rounded border border-line bg-surface hover:bg-sunken text-2xs text-ink-2 transition-colors"
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>
        </Field>

        <div className="border border-line rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-sunken border-b border-line flex items-center justify-between">
            <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-accent" />
              Dữ liệu hệ thống tự động điền ({targetKocs.length} kênh)
            </span>
            <Status tone="info">Tự động lấy 38/48 cột từ Danh bạ & Lịch sử</Status>
          </div>
          <div className="max-h-56 overflow-y-auto divide-y divide-line">
            {targetKocs.map((k, idx) => {
              const handle = normalizeTikTokId(k.channelId || k.tiktokChannel || '');
              const net = Number(k.rateCardVideo || 0);
              const kl = computeTepBookingFromNetFee(net);
              const gross = computeGrossFeeWithTax(net);
              return (
                <div
                  key={`${handle}-${idx}`}
                  className="px-3 py-2.5 flex items-center justify-between gap-3 text-xs bg-surface"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={k.stageName || handle} src={k.avatarUrl} size={28} />
                    <div className="min-w-0">
                      <div className="font-semibold text-ink truncate">
                        {k.stageName || handle}{' '}
                        <span className="font-normal text-ink-3">@{handle}</span>
                      </div>
                      <div className="text-2xs text-ink-3 truncate">
                        Tệp: {k.tepKenh || k.creatorCategory || 'Beauty'} · Follower:{' '}
                        {(k.followers || 0).toLocaleString('vi-VN')} · Nữ: {k.femaleRatio ?? 75}%
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-ink tabular-nums">
                      {kl} · Net: {formatVnd(net)}
                    </div>
                    <div className="text-2xs text-ink-3 tabular-nums">
                      Kèm thuế: {formatVnd(gross)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
};
