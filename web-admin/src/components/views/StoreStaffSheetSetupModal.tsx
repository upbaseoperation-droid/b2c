'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ExternalLink, FileSpreadsheet, Search, Upload, Users } from 'lucide-react';
import type { StorePortfolioItem } from '../../lib/types';
import { resolveBrandBookingSheetUrl } from '../../lib/bookingList';
import { pushSharedStateToDb } from '../../lib/sharedStateClient';
import { USERS } from '../../lib/mockData';
import { Button, Field, Input, Modal, Select, Status, Tabs, Textarea } from '../ui';

interface StoreStaffSheetDraft {
  storeId: string;
  storeName: string;
  brandName: string;
  platform: string;
  pic: string;
  storeUrl: string;
  bookingSheetUrl: string;
  defaultSheetTab: string;
}

interface ParsedBulkRow {
  rawStore: string;
  matchedStore?: StorePortfolioItem;
  pic: string;
  bookingSheetUrl: string;
  storeUrl: string;
  defaultSheetTab: string;
}

interface StoreStaffSheetSetupModalProps {
  open: boolean;
  onClose: () => void;
  stores: StorePortfolioItem[];
  onSaved?: (updatedByStoreId: Record<string, Partial<StorePortfolioItem>>) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

const normText = (v: string) =>
  (v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

export const StoreStaffSheetSetupModal: React.FC<StoreStaffSheetSetupModalProps> = ({
  open,
  onClose,
  stores,
  onSaved,
  onNotify,
}) => {
  const [mode, setMode] = useState<'TABLE' | 'BULK_PASTE'>('TABLE');
  const [search, setSearch] = useState('');
  const [staffFilter, setStaffFilter] = useState('');
  const [drafts, setDrafts] = useState<Record<string, StoreStaffSheetDraft>>({});
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [bulkText, setBulkText] = useState('');
  const [saving, setSaving] = useState(false);

  const b2cStores = useMemo(
    () => stores.filter(s => s.isB2cManaged !== false && s.storeName),
    [stores]
  );

  // Khởi tạo dữ liệu nháp từ danh sách Gian hàng + Store Overrides
  useEffect(() => {
    if (!open) return;
    let overrides: Record<string, Partial<StorePortfolioItem>> = {};
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem('upbase_store_overrides_v1');
        if (raw) overrides = JSON.parse(raw) as Record<string, Partial<StorePortfolioItem>>;
      } catch {
        /* bỏ qua lỗi đọc cache */
      }
    }
    const nextDrafts: Record<string, StoreStaffSheetDraft> = {};
    for (const st of b2cStores) {
      const ov = overrides[st.id] || {};
      const merged: StorePortfolioItem = { ...st, ...ov };
      nextDrafts[st.id] = {
        storeId: st.id,
        storeName: st.storeName,
        brandName: st.brandName || st.storeName,
        platform: st.platform || 'TikTok Shop',
        pic: (merged.primaryPic || merged.b2cOwnerName || '').trim(),
        storeUrl: (merged.storeUrl || '').trim(),
        bookingSheetUrl: (merged.bookingSheetUrl || resolveBrandBookingSheetUrl(st.brandName, st.storeName, merged) || '').trim(),
        defaultSheetTab: (merged.defaultSheetTab || '').trim(),
      };
    }
    setDrafts(nextDrafts);
    setDirtyIds(new Set());
  }, [open, b2cStores]);

  const staffOptions = useMemo(() => {
    const names = new Set<string>();
    for (const u of USERS) {
      if (u.name && !u.partnerType) names.add(u.name.trim());
    }
    for (const st of b2cStores) {
      if (st.b2cOwnerName) names.add(st.b2cOwnerName.trim());
      if (st.primaryPic) names.add(st.primaryPic.trim());
    }
    for (const d of Object.values(drafts)) {
      if (d.pic) names.add(d.pic.trim());
    }
    return Array.from(names).filter(Boolean).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [b2cStores, drafts]);

  const updateRow = (storeId: string, patch: Partial<StoreStaffSheetDraft>) => {
    setDrafts(prev => {
      const cur = prev[storeId];
      if (!cur) return prev;
      return { ...prev, [storeId]: { ...cur, ...patch } };
    });
    setDirtyIds(prev => {
      const next = new Set(prev);
      next.add(storeId);
      return next;
    });
  };

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return Object.values(drafts)
      .filter(d => !staffFilter || d.pic.toLowerCase() === staffFilter.toLowerCase())
      .filter(
        d =>
          !q ||
          `${d.storeName} ${d.brandName} ${d.pic} ${d.bookingSheetUrl} ${d.storeUrl}`.toLowerCase().includes(q)
      )
      .sort((a, b) => a.storeName.localeCompare(b.storeName, 'vi'));
  }, [drafts, search, staffFilter]);

  // Phân tích dữ liệu dán hàng loạt từ Excel / Google Sheet
  const parsedBulkRows = useMemo<ParsedBulkRow[]>(() => {
    const lines = bulkText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return [];

    const matchStore = (rawName: string): StorePortfolioItem | undefined => {
      const target = normText(rawName);
      if (!target) return undefined;
      return (
        b2cStores.find(s => normText(s.storeName) === target || normText(s.id) === target) ||
        b2cStores.find(
          s =>
            normText(s.storeName).includes(target) ||
            target.includes(normText(s.storeName)) ||
            normText(s.brandName) === target
        )
      );
    };

    const results: ParsedBulkRow[] = [];
    for (const line of lines) {
      const cells = (line.includes('\t') ? line.split('\t') : line.split(/\s*[|;]\s*/))
        .map(c => c.trim())
        .filter(Boolean);
      if (cells.length === 0) continue;
      // Bỏ qua dòng tiêu đề nếu có
      const firstNorm = normText(cells[0]);
      if (firstNorm === 'gianhang' || firstNorm === 'tengianhang' || firstNorm === 'stt' || firstNorm === 'store') {
        continue;
      }

      let rawStore = '';
      let pic = '';
      let bookingSheetUrl = '';
      let storeUrl = '';
      let defaultSheetTab = '';

      for (const cell of cells) {
        if (/docs\.google\.com\/spreadsheets/i.test(cell)) {
          bookingSheetUrl = cell;
        } else if (/^https?:\/\//i.test(cell)) {
          storeUrl = cell;
        } else if (!rawStore && matchStore(cell)) {
          rawStore = cell;
        } else if (!rawStore) {
          rawStore = cell;
        } else if (!pic) {
          pic = cell;
        } else if (!defaultSheetTab) {
          defaultSheetTab = cell;
        }
      }

      const matchedStore = matchStore(rawStore);
      results.push({
        rawStore,
        matchedStore,
        pic,
        bookingSheetUrl,
        storeUrl,
        defaultSheetTab,
      });
    }
    return results;
  }, [bulkText, b2cStores]);

  const applyBulkToDrafts = () => {
    const matched = parsedBulkRows.filter(r => r.matchedStore);
    if (matched.length === 0) {
      onNotify?.('Chưa tìm thấy dòng nào khớp với tên Gian hàng trong hệ thống.', 'warning');
      return;
    }
    setDrafts(prev => {
      const next = { ...prev };
      for (const row of matched) {
        const stId = row.matchedStore!.id;
        const cur = next[stId];
        if (!cur) continue;
        next[stId] = {
          ...cur,
          pic: row.pic || cur.pic,
          bookingSheetUrl: row.bookingSheetUrl || cur.bookingSheetUrl,
          storeUrl: row.storeUrl || cur.storeUrl,
          defaultSheetTab: row.defaultSheetTab || cur.defaultSheetTab,
        };
      }
      return next;
    });
    setDirtyIds(prev => {
      const next = new Set(prev);
      for (const row of matched) next.add(row.matchedStore!.id);
      return next;
    });
    setMode('TABLE');
    onNotify?.(`Đã điền ${matched.length} gian hàng vào bảng. Bấm "Lưu thiết lập" để áp dụng.`, 'success');
  };

  const handleSaveAll = async () => {
    const targetIds = Array.from(dirtyIds);
    if (targetIds.length === 0) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      let overrides: Record<string, Partial<StorePortfolioItem>> = {};
      if (typeof window !== 'undefined') {
        try {
          const raw = window.localStorage.getItem('upbase_store_overrides_v1');
          if (raw) overrides = JSON.parse(raw) as Record<string, Partial<StorePortfolioItem>>;
        } catch {
          overrides = {};
        }
      }

      const updatedByStoreId: Record<string, Partial<StorePortfolioItem>> = {};
      for (const id of targetIds) {
        const d = drafts[id];
        if (!d) continue;
        const patch: Partial<StorePortfolioItem> = {
          id: d.storeId,
          storeName: d.storeName,
          b2cOwnerName: d.pic.trim(),
          primaryPic: d.pic.trim(),
          assignedStaff: d.pic.trim(),
          assignedPic: d.pic.trim(),
          storeUrl: d.storeUrl.trim() || undefined,
          bookingSheetUrl: d.bookingSheetUrl.trim() || undefined,
          defaultSheetTab: d.defaultSheetTab.trim() || undefined,
        };
        overrides[id] = { ...(overrides[id] || {}), ...patch };
        updatedByStoreId[id] = patch;
      }

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('upbase_store_overrides_v1', JSON.stringify(overrides));
        pushSharedStateToDb('store-overrides-v1', overrides);
        window.dispatchEvent(new CustomEvent('upbase:store-overrides-updated', { detail: overrides }));
      }

      // Đồng bộ phân công và link lên Master Catalog máy chủ (để phân quyền RBAC nhận diện ngay)
      await Promise.allSettled(
        targetIds.map(storeId => {
          const d = drafts[storeId];
          if (!d) return Promise.resolve();
          return fetch('/api/master-data', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              storeId,
              assignment: {
                b2cOwnerName: d.pic.trim(),
                primaryPic: d.pic.trim(),
                assignedStaff: d.pic.trim(),
                assignedPic: d.pic.trim(),
                storeUrl: d.storeUrl.trim(),
                bookingSheetUrl: d.bookingSheetUrl.trim(),
                defaultSheetTab: d.defaultSheetTab.trim(),
              },
            }),
          });
        })
      );

      onSaved?.(updatedByStoreId);
      onNotify?.(`Đã lưu phân công nhân viên & link cho ${targetIds.length} gian hàng.`, 'success');
      onClose();
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : 'Không lưu được thiết lập.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Thiết lập Nhân viên phụ trách (PIC) & Link Gian hàng / Google Sheet"
      size="xl"
      footer={
        <div className="flex w-full items-center justify-between">
          <span className="text-xs text-ink-3">
            Đã chỉnh sửa: <strong className="text-ink">{dirtyIds.size}</strong> / {b2cStores.length} gian hàng
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Đóng
            </Button>
            {mode === 'BULK_PASTE' ? (
              <Button
                variant="primary"
                icon={CheckCircle2}
                disabled={parsedBulkRows.filter(r => r.matchedStore).length === 0}
                onClick={applyBulkToDrafts}
              >
                Đưa {parsedBulkRows.filter(r => r.matchedStore).length} dòng khớp vào Bảng
              </Button>
            ) : (
              <Button variant="primary" disabled={saving || dirtyIds.size === 0} onClick={() => void handleSaveAll()}>
                {saving ? 'Đang lưu…' : `Lưu thiết lập (${dirtyIds.size})`}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Tabs
            value={mode}
            onChange={setMode}
            items={[
              { key: 'TABLE', label: `Bảng cấu hình (${b2cStores.length} Gian hàng)` },
              { key: 'BULK_PASTE', label: 'Dán nhanh hàng loạt từ Excel / Sheet' },
            ]}
          />
          {mode === 'TABLE' && (
            <div className="flex flex-wrap items-center gap-2">
              <Select value={staffFilter} onChange={e => setStaffFilter(e.target.value)} className="w-[190px]">
                <option value="">Tất cả nhân viên (PIC)</option>
                {staffOptions.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm gian hàng, brand, PIC..."
                className="w-[230px]"
              />
            </div>
          )}
        </div>

        {mode === 'TABLE' && (
          <>
            <datalist id="b2c-staff-datalist">
              {staffOptions.map(name => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <div className="max-h-[62vh] overflow-auto rounded-lg border border-line bg-surface">
              <table className="w-full min-w-[920px] text-xs">
                <thead className="sticky top-0 z-10 bg-sunken text-ink-3">
                  <tr className="border-b border-line">
                    <th className="w-[210px] px-3 py-2 text-left font-medium">Gian hàng</th>
                    <th className="w-[180px] px-3 py-2 text-left font-medium">Nhân viên phụ trách (PIC)</th>
                    <th className="px-3 py-2 text-left font-medium">Link Google Sheet (Listing / Duyệt KOC)</th>
                    <th className="w-[150px] px-3 py-2 text-left font-medium">Tab mặc định</th>
                    <th className="w-[210px] px-3 py-2 text-left font-medium">Link Gian hàng Sàn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredRows.map(row => {
                    const isDirty = dirtyIds.has(row.storeId);
                    return (
                      <tr key={row.storeId} className={isDirty ? 'bg-accent-soft/40' : 'hover:bg-sunken/50'}>
                        <td className="px-3 py-2 align-middle">
                          <div className="font-semibold text-ink">{row.storeName}</div>
                          <div className="text-2xs text-ink-3">
                            {row.brandName} · {row.platform}
                          </div>
                        </td>
                        <td className="px-2 py-1.5 align-middle">
                          <Input
                            list="b2c-staff-datalist"
                            value={row.pic}
                            onChange={e => updateRow(row.storeId, { pic: e.target.value })}
                            placeholder="Tên nhân viên..."
                          />
                        </td>
                        <td className="px-2 py-1.5 align-middle">
                          <div className="flex items-center gap-1.5">
                            <Input
                              value={row.bookingSheetUrl}
                              onChange={e => updateRow(row.storeId, { bookingSheetUrl: e.target.value })}
                              placeholder="https://docs.google.com/spreadsheets/d/..."
                            />
                            {row.bookingSheetUrl && (
                              <a
                                href={row.bookingSheetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-line bg-surface text-ink-2 hover:text-accent"
                                title="Mở Google Sheet"
                              >
                                <FileSpreadsheet className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-1.5 align-middle">
                          <Input
                            value={row.defaultSheetTab}
                            onChange={e => updateRow(row.storeId, { defaultSheetTab: e.target.value })}
                            placeholder="Tự động theo đợt"
                          />
                        </td>
                        <td className="px-2 py-1.5 align-middle">
                          <div className="flex items-center gap-1.5">
                            <Input
                              value={row.storeUrl}
                              onChange={e => updateRow(row.storeId, { storeUrl: e.target.value })}
                              placeholder="https://www.tiktok.com/@..."
                            />
                            {row.storeUrl && (
                              <a
                                href={row.storeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-line bg-surface text-ink-2 hover:text-accent"
                                title="Mở link gian hàng"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-ink-3">
                        Không tìm thấy gian hàng phù hợp.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {mode === 'BULK_PASTE' && (
          <div className="space-y-3">
            <div className="rounded-md bg-sunken px-3 py-2 text-xs text-ink-2">
              Copy các cột từ Excel hoặc Google Sheet và dán vào bên dưới. Hệ thống tự động nhận diện cột <strong>Tên gian hàng</strong>, <strong>Nhân viên phụ trách (PIC)</strong>, <strong>Link Google Sheet</strong> (<code>docs.google.com/spreadsheets/...</code>), <strong>Link Gian hàng sàn</strong> và <strong>Tên Tab</strong>.
            </div>
            <Field label="Dữ liệu dán từ Excel / Google Sheet (mỗi gian hàng 1 dòng)">
              <Textarea
                rows={7}
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                placeholder={
                  'Baniphar_TikTok_E2E-S\tLê Thị Hồng Nhung\thttps://docs.google.com/spreadsheets/d/1da2vnk...\thttps://www.tiktok.com/@baniphar\nZiaja_TikTok_E2E-S\tBùi Ngọc Ánh\thttps://docs.google.com/spreadsheets/d/1ZGumQl...\tListing T10'
                }
              />
            </Field>
            {parsedBulkRows.length > 0 && (
              <div className="max-h-[34vh] overflow-auto rounded-lg border border-line bg-surface">
                <table className="w-full text-xs">
                  <thead className="bg-sunken text-ink-3">
                    <tr className="border-b border-line">
                      <th className="px-3 py-2 text-left font-medium">Dòng nhập</th>
                      <th className="px-3 py-2 text-left font-medium">Khớp Gian hàng hệ thống</th>
                      <th className="px-3 py-2 text-left font-medium">Nhân viên (PIC)</th>
                      <th className="px-3 py-2 text-left font-medium">Link Google Sheet</th>
                      <th className="px-3 py-2 text-left font-medium">Link Gian hàng / Tab</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {parsedBulkRows.map((r, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-1.5 text-ink-2">{r.rawStore}</td>
                        <td className="px-3 py-1.5">
                          {r.matchedStore ? (
                            <Status tone="positive">{r.matchedStore.storeName}</Status>
                          ) : (
                            <Status tone="warning">Chưa khớp tên gian hàng</Status>
                          )}
                        </td>
                        <td className="px-3 py-1.5 font-medium text-ink">{r.pic || '—'}</td>
                        <td className="max-w-[240px] truncate px-3 py-1.5 text-ink-2">{r.bookingSheetUrl || '—'}</td>
                        <td className="max-w-[200px] truncate px-3 py-1.5 text-ink-2">
                          {r.storeUrl || r.defaultSheetTab || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
