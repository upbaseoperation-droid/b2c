'use client';

import React, { useMemo, useState } from 'react';
import { Check, ExternalLink, FileSpreadsheet } from 'lucide-react';
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
  loadStaffSheetCollection,
  makeSheetKey,
  normalizeTikTokId,
} from '../../lib/staffBrandListingSheet';
import {
  BrandProductDropdownInput,
  buildBrandProductCatalogGroups,
} from './BrandProductDropdownInput';
import { Avatar, Button, Field, Input, Modal, Select, Status } from '../ui';

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
      : b2cStores[0]?.storeName || '4PM_Shopee_E2E-S';

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

  const sheetCountMap = useMemo(() => {
    if (!open) return {} as Record<string, number>;
    const col = loadStaffSheetCollection(allKocs, stores, deals);
    const map: Record<string, number> = {};
    b2cStores.forEach((st) => {
      const k = makeSheetKey(monthKey, st.storeName);
      map[st.storeName] = col.sheets[k]?.length || 0;
    });
    return map;
  }, [open, monthKey, b2cStores, allKocs, stores, deals]);

  const catalogOptions = useMemo(
    () =>
      buildBrandProductCatalogGroups({
        brandName: activeStoreObj?.brandName,
        storeName,
        storeObj: activeStoreObj,
        deals,
      }),
    [activeStoreObj, deals, storeName]
  );

  const handleConfirm = (openSheetAfter: boolean) => {
    if (!targetKocs.length) return;
    const finalProduct = sanPham.trim();

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
      size="xl"
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
        <div className="grid grid-cols-1 sm:grid-cols-[140px_minmax(0,1fr)_125px] gap-3 bg-sunken p-4 rounded-lg border border-line">
          <Field label="Plan Tháng" labelClassName="whitespace-nowrap">
            <Select className="w-full" value={monthKey} onChange={(e) => setMonthKey(e.target.value)}>
              {MONTH_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  Plan Tháng {m}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Gian hàng (Sheet Brand)" labelClassName="whitespace-nowrap">
            <Select
              className="w-full"
              value={storeName}
              onChange={(e) => {
                const nextStore = e.target.value;
                setStoreName(nextStore);
                const nextStoreObj = b2cStores.find((s) => s.storeName === nextStore);
                const nextCat = buildBrandProductCatalogGroups({
                  brandName: nextStoreObj?.brandName,
                  storeName: nextStore,
                  storeObj: nextStoreObj,
                  deals,
                });
                setSanPham(nextCat.flatOptions[0]?.name || '');
              }}
            >
              {b2cStores.map((st) => (
                <option key={st.id} value={st.storeName}>
                  {st.brandName} — {st.storeName} ({sheetCountMap[st.storeName] || 0} KOC)
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Đợt trình duyệt" labelClassName="whitespace-nowrap">
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
          <Field label="Sản phẩm đề xuất (Cột K)" labelClassName="whitespace-nowrap">
            <BrandProductDropdownInput
              value={sanPham}
              onChange={(val) => setSanPham(val)}
              brandName={activeStoreObj?.brandName}
              storeName={storeName}
              storeObj={activeStoreObj}
              deals={deals}
              placeholder={
                catalogOptions.flatOptions[0]?.name ||
                'Chọn sản phẩm từ Danh mục SP của Brand...'
              }
            />
          </Field>

          <Field label="Content tag (Cột G)" labelClassName="whitespace-nowrap">
            <Select className="w-full" value={contentTag} onChange={(e) => setContentTag(e.target.value)}>
              {CONTENT_TAG_OPTIONS.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Đề xuất từ UpBase (Cột R)" labelClassName="whitespace-nowrap">
            <Select className="w-full" value={deXuatUpBase} onChange={(e) => setDeXuatUpBase(e.target.value)}>
              {DE_XUAT_UPBASE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Content note (Cột T)" labelClassName="whitespace-nowrap">
          <div className="space-y-2">
            <Input
              value={contentNote}
              onChange={(e) => setContentNote(e.target.value)}
              placeholder="Ghi chú định hướng nội dung gửi Brand..."
            />
            <div className="flex flex-wrap gap-2">
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
            <span className="text-xs font-semibold text-ink flex items-center gap-2">
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
                  className="px-3 py-3 flex items-center justify-between gap-3 text-xs bg-surface"
                >
                  <div className="flex items-center gap-3 min-w-0">
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
