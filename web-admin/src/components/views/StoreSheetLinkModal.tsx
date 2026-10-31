'use client';

import React, { useEffect, useState } from 'react';
import { ArrowUpDown, Columns, Copy, EyeOff, FileSpreadsheet, RefreshCw, Save } from 'lucide-react';
import { persistStoreSheetLinks, type StoreSheetLink } from '../../lib/storeSheetLinks';
import { Button, ChannelTag, Field, Input, Modal, Select } from '../ui';

export interface StoreSheetLinkTarget {
  storeId: string;
  storeName: string;
  brandName: string;
  platform: string;
  link: StoreSheetLink;
}

interface StoreSheetLinkModalProps {
  target: StoreSheetLinkTarget | null;
  /** Các gian cùng nhãn, để áp dụng chung một file Sheet. */
  brandSiblings?: StoreSheetLinkTarget[];
  saEmail?: string;
  onClose: () => void;
  onSaved?: (patches: Record<string, StoreSheetLink>) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

const MONTH_OPTIONS = ['2026/11', '2026/10', '2026/09', '2026/08'];

/** Sửa Link Google Sheet + 3 tab chuẩn của một gian, kèm thao tác nhanh trên file Sheet. */
export const StoreSheetLinkModal: React.FC<StoreSheetLinkModalProps> = ({
  target,
  brandSiblings = [],
  saEmail: saEmailProp,
  onClose,
  onSaved,
  onNotify,
}) => {
  const [link, setLink] = useState<StoreSheetLink>({
    bookingSheetUrl: '',
    planSheetTab: '',
    defaultSheetTab: '',
    reportSheetTab: '',
  });
  const [applyToBrand, setApplyToBrand] = useState(false);
  const [tabs, setTabs] = useState<string[]>([]);
  const [loadingTabs, setLoadingTabs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [controlBusy, setControlBusy] = useState(false);
  const [collapsedMonths, setCollapsedMonths] = useState<string[]>(['2026/09', '2026/08']);
  const [fetchedSaEmail, setSaEmail] = useState('');
  const saEmail = saEmailProp || fetchedSaEmail;

  // Mở gian khác thì nạp lại form theo gian đó
  const [loadedStoreId, setLoadedStoreId] = useState<string | null>(null);
  const targetId = target?.storeId ?? null;
  if (targetId !== loadedStoreId) {
    setLoadedStoreId(targetId);
    if (target) {
      setLink(target.link);
      setApplyToBrand(false);
      setTabs([]);
    }
  }

  const hasTarget = Boolean(target);
  useEffect(() => {
    if (!hasTarget || saEmail) return;
    fetch('/api/booking-list/push-sheet')
      .then(r => r.json())
      .then((d: { serviceAccountEmail?: string }) => {
        if (d.serviceAccountEmail) setSaEmail(d.serviceAccountEmail);
      })
      .catch(() => {});
  }, [hasTarget, saEmail]);

  const otherBrandStores = target ? brandSiblings.filter(s => s.storeId !== target.storeId) : [];
  const sheetUrl = link.bookingSheetUrl.trim();

  const handleFetchTabs = async () => {
    if (!sheetUrl) {
      onNotify?.('Dán Link Google Sheet trước khi đọc tab.', 'warning');
      return;
    }
    setLoadingTabs(true);
    try {
      const res = await fetch(`/api/booking-list/push-sheet?sheetUrl=${encodeURIComponent(sheetUrl)}`);
      const data = (await res.json()) as { serviceAccountEmail?: string; tabs?: string[]; error?: string };
      if (data.serviceAccountEmail) setSaEmail(data.serviceAccountEmail);
      if (!res.ok || data.error) {
        onNotify?.(data.error || 'Không đọc được danh sách tab từ Google Sheet.', 'warning');
        return;
      }
      const found = data.tabs || [];
      setTabs(found);
      if (found.length > 0) {
        const plan = found.find(t => /plan|ke\s*hoach|kế\s*hoạch/i.test(t));
        const listing = found.find(t => /list|de\s*xuat|đề\s*xuất|koc/i.test(t));
        const report = found.find(t => /report|ket\s*qua|kết\s*quả|nghiem\s*thu|nghiệm\s*thu|air|bao\s*cao|báo\s*cáo/i.test(t));
        setLink(prev => ({
          ...prev,
          planSheetTab: prev.planSheetTab || plan || '',
          defaultSheetTab: prev.defaultSheetTab || listing || found[0],
          reportSheetTab: prev.reportSheetTab || report || '',
        }));
      }
      onNotify?.(`Đã đọc ${found.length} tab từ file Sheet.`, 'success');
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : 'Lỗi kết nối Google Sheet.', 'error');
    } finally {
      setLoadingTabs(false);
    }
  };

  const runSheetControl = async (
    payload: {
      collapsedMonths?: string[];
      expandAllMonths?: boolean;
      columnPreset?: 'BRAND_REVIEW' | 'AIR_ACCEPTANCE' | 'FULL_TEMPLATE';
      sortBy?: 'PRODUCT' | 'STAFF';
      installFilterViews?: boolean;
    },
    successMsg: string
  ) => {
    if (!sheetUrl) return;
    setControlBusy(true);
    try {
      const res = await fetch('/api/booking-list/push-sheet', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetUrl,
          activeTab: link.defaultSheetTab.trim() || tabs[0] || 'Listing',
          ...payload,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; tabsDetail?: { title: string }[]; error?: string } | null;
      if (!res.ok || !data?.ok) {
        onNotify?.(data?.error || 'Không thực hiện được thao tác trên Google Sheet.', 'error');
        return;
      }
      if (Array.isArray(data.tabsDetail)) setTabs(data.tabsDetail.map(t => t.title));
      onNotify?.(successMsg, 'success');
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : 'Lỗi điều khiển Google Sheet.', 'error');
    } finally {
      setControlBusy(false);
    }
  };

  const handleSave = async () => {
    if (!target) return;
    const patches: Record<string, StoreSheetLink> = { [target.storeId]: link };
    if (applyToBrand) {
      // Gian cùng nhãn dùng chung file; tab đã đặt riêng thì giữ, chưa đặt thì lấy theo gian đang sửa
      for (const s of otherBrandStores) {
        patches[s.storeId] = {
          bookingSheetUrl: link.bookingSheetUrl,
          planSheetTab: s.link.planSheetTab || link.planSheetTab,
          defaultSheetTab: s.link.defaultSheetTab || link.defaultSheetTab,
          reportSheetTab: s.link.reportSheetTab || link.reportSheetTab,
        };
      }
    }
    setSaving(true);
    try {
      await persistStoreSheetLinks(patches);
      onSaved?.(patches);
      onNotify?.(`Đã lưu Link Google Sheet cho ${Object.keys(patches).length} gian hàng.`, 'success');
      onClose();
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : 'Không lưu được Link Sheet.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const tabField = (key: 'planSheetTab' | 'defaultSheetTab' | 'reportSheetTab', placeholder: string) =>
    tabs.length > 0 ? (
      <Select value={link[key]} onChange={e => setLink(prev => ({ ...prev, [key]: e.target.value }))}>
        <option value="">Mặc định ({placeholder})</option>
        {tabs.map(t => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </Select>
    ) : (
      <Input
        value={link[key]}
        onChange={e => setLink(prev => ({ ...prev, [key]: e.target.value }))}
        placeholder={placeholder}
      />
    );

  return (
    <Modal
      open={Boolean(target)}
      onClose={onClose}
      size="lg"
      title={target ? `Google Sheet · ${target.storeName}` : 'Google Sheet'}
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Đóng
          </Button>
          <Button variant="primary" icon={Save} disabled={saving} onClick={() => void handleSave()}>
            {saving ? 'Đang lưu…' : 'Lưu'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {target && (
          <div className="flex items-center gap-2 text-xs text-ink-3">
            <span className="font-medium text-ink-2">{target.brandName}</span>
            <span>·</span>
            <ChannelTag channel={target.platform} />
          </div>
        )}
        <Field label="Link Google Sheet">
          <div className="flex items-center gap-2">
            <Input
              value={link.bookingSheetUrl}
              onChange={e => {
                setLink(prev => ({ ...prev, bookingSheetUrl: e.target.value }));
                setTabs([]);
              }}
              placeholder="https://docs.google.com/spreadsheets/d/..."
            />
            {sheetUrl && (
              <a
                href={sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line-strong bg-surface text-ink-2 hover:bg-sunken hover:text-accent"
                title="Mở Google Sheet"
              >
                <FileSpreadsheet className="h-4 w-4" />
              </a>
            )}
            <Button
              size="sm"
              variant="secondary"
              icon={RefreshCw}
              disabled={loadingTabs || !sheetUrl}
              onClick={() => void handleFetchTabs()}
            >
              {loadingTabs ? 'Đang đọc…' : 'Đọc tab'}
            </Button>
          </div>
        </Field>

        {/* Màn Google Sheet đã có banner email ở đầu trang; chỉ nhắc khi mở từ nơi khác */}
        {saEmail && !saEmailProp && (
          <div className="flex flex-wrap items-center gap-2 rounded-md bg-sunken px-3 py-2 text-2xs text-ink-2">
            <span>Chia sẻ quyền Editor của file cho</span>
            <code className="rounded bg-surface px-2 py-0.5 font-mono text-ink">{saEmail}</code>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-accent hover:underline cursor-pointer"
              onClick={() => {
                void navigator.clipboard?.writeText(saEmail);
                onNotify?.('Đã sao chép email.', 'info');
              }}
            >
              <Copy className="h-3.5 w-3.5" /> Sao chép
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Tab Plan tháng">{tabField('planSheetTab', 'Plan tháng')}</Field>
          <Field label="Tab Listing KOC">{tabField('defaultSheetTab', 'Listing KOC')}</Field>
          <Field label="Tab Kết quả">{tabField('reportSheetTab', 'Báo cáo & Nghiệm thu')}</Field>
        </div>

        {otherBrandStores.length > 0 && (
          <label className="inline-flex items-center gap-2 text-xs text-ink-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={applyToBrand}
              onChange={e => setApplyToBrand(e.target.checked)}
              className="h-4 w-4 rounded border-line-strong text-primary focus:ring-0"
            />
            <span>
              Dùng chung file này cho {otherBrandStores.length} gian khác của {target?.brandName}
            </span>
          </label>
        )}

        {sheetUrl && (
          <details className="rounded-lg border border-line">
            <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-ink">
              Thao tác trên file Sheet
            </summary>
            <div className="space-y-3 border-t border-line px-3 py-3 text-xs">
              <div className="space-y-2">
                <div className="text-2xs font-medium text-ink-3">Hiện cột</div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Columns}
                    disabled={controlBusy}
                    onClick={() =>
                      void runSheetControl({ columnPreset: 'BRAND_REVIEW' }, 'Đã chỉ hiện 32 cột gửi Brand duyệt.')
                    }
                  >
                    32 cột gửi Brand
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Columns}
                    disabled={controlBusy}
                    onClick={() =>
                      void runSheetControl({ columnPreset: 'AIR_ACCEPTANCE' }, 'Đã hiện cột Đi Air & Nghiệm thu.')
                    }
                  >
                    Đi Air & Nghiệm thu
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={controlBusy}
                    onClick={() =>
                      void runSheetControl({ columnPreset: 'FULL_TEMPLATE' }, 'Đã hiện đủ 61 cột (giữ ẩn cột Row ID).')
                    }
                  >
                    Đủ 61 cột
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-2xs font-medium text-ink-3">Sắp xếp và gắn bộ lọc</div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={ArrowUpDown}
                    disabled={controlBusy}
                    onClick={() =>
                      void runSheetControl(
                        { sortBy: 'PRODUCT', installFilterViews: true },
                        'Đã sắp xếp theo Sản phẩm và gắn bộ lọc.'
                      )
                    }
                  >
                    Theo sản phẩm
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={ArrowUpDown}
                    disabled={controlBusy}
                    onClick={() =>
                      void runSheetControl(
                        { sortBy: 'STAFF', installFilterViews: true },
                        'Đã sắp xếp theo Nhân sự và gắn bộ lọc.'
                      )
                    }
                  >
                    Theo nhân sự
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-2xs font-medium text-ink-3">Thu gọn tháng cũ (cột Tháng)</div>
                <div className="flex flex-wrap items-center gap-2">
                  {MONTH_OPTIONS.map(m => {
                    const on = collapsedMonths.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        disabled={controlBusy}
                        onClick={() =>
                          setCollapsedMonths(prev => (prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]))
                        }
                        className={`rounded border px-2 py-0.5 text-2xs font-medium transition-colors cursor-pointer ${
                          on ? 'border-line-strong bg-sunken text-ink' : 'border-line bg-surface text-ink-3'
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={EyeOff}
                    disabled={controlBusy || collapsedMonths.length === 0}
                    onClick={() =>
                      void runSheetControl(
                        { collapsedMonths },
                        `Đã thu gọn các tháng ${collapsedMonths.join(', ')}.`
                      )
                    }
                  >
                    Thu gọn
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={controlBusy}
                    onClick={() => {
                      setCollapsedMonths([]);
                      void runSheetControl({ expandAllMonths: true }, 'Đã mở rộng tất cả các tháng.');
                    }}
                  >
                    Mở tất cả
                  </Button>
                </div>
              </div>
            </div>
          </details>
        )}
      </div>
    </Modal>
  );
};
