'use client';

import React, { useState } from 'react';
import { Edit3, Plus } from 'lucide-react';
import { MasterCastTier } from '../../../lib/types';
import { formatVnd } from '../../../lib/format';
import { 
  ActionMenu, 
  Button, 
  Chips, 
  DataTable, 
  EmptyState, 
  FilterBar, 
  Modal, 
  PageActions, 
  Panel 
} from '../../ui';

interface CastTiersMasterViewProps {
  initialTiers: MasterCastTier[];
  canEdit?: boolean;
  onChange?: (items: MasterCastTier[]) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const CastTiersMasterView: React.FC<CastTiersMasterViewProps> = ({
  initialTiers,
  onChange,
  canEdit = true,
  onNotify
}) => {
  const [localItems, setLocalItems] = useState<MasterCastTier[]>(initialTiers);
  const tiers = onChange ? initialTiers : localItems;
  const setTiers = (update: React.SetStateAction<MasterCastTier[]>) => {
    const next = typeof update === 'function' ? update(tiers) : update;
    if (onChange) onChange(next); else setLocalItems(next);
  };
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<MasterCastTier | null>(null);

  const [form, setForm] = useState({
    tierCode: '',
    priceRange: '',
    minCast: 0,
    maxCast: 0,
    baseAverage: 0,
    creatorGroup: 'Massive Creator',
    note: '',
    adsCost: 'Không mất',
    usageImageCost: 'Không mất'
  });

  const filteredTiers = tiers.filter(t => {
    if (selectedGroup !== 'ALL' && t.creatorGroup !== selectedGroup) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        t.tierCode.toLowerCase().includes(q) ||
        t.priceRange.toLowerCase().includes(q) ||
        t.creatorGroup.toLowerCase().includes(q) ||
        t.note.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const isTierFiltered = search.trim() !== '' || selectedGroup !== 'ALL';

  const handleResetTierFilters = () => {
    setSearch('');
    setSelectedGroup('ALL');
  };

  const handleOpenAdd = () => {
    if (!canEdit) return;
    setEditingTier(null);
    setForm({
      tierCode: '',
      priceRange: '',
      minCast: 0,
      maxCast: 0,
      baseAverage: 0,
      creatorGroup: 'Massive Creator',
      note: '',
      adsCost: 'Không mất',
      usageImageCost: 'Không mất'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tier: MasterCastTier) => {
    setEditingTier(tier);
    setForm({
      tierCode: tier.tierCode,
      priceRange: tier.priceRange,
      minCast: tier.minCast,
      maxCast: tier.maxCast,
      baseAverage: tier.baseAverage,
      creatorGroup: tier.creatorGroup,
      note: tier.note,
      adsCost: tier.adsCost,
      usageImageCost: tier.usageImageCost
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!form.tierCode.trim()) return;

    if (editingTier) {
      setTiers(prev => prev.map(t => t.id === editingTier.id ? {
        ...t,
        tierCode: form.tierCode.trim(),
        priceRange: form.priceRange.trim(),
        minCast: Number(form.minCast),
        maxCast: Number(form.maxCast),
        baseAverage: Number(form.baseAverage),
        creatorGroup: form.creatorGroup,
        note: form.note.trim(),
        adsCost: form.adsCost.trim(),
        usageImageCost: form.usageImageCost.trim(),
        lastUpdate: new Date().toISOString().split('T')[0]
      } : t));
      if (onNotify) onNotify(`Đã sửa bản nháp: bậc cast [${form.tierCode}]`);
    } else {
      const newTier: MasterCastTier = {
        id: `CAST-${String(tiers.length + 1).padStart(2, '0')}`,
        tierCode: form.tierCode.trim(),
        priceRange: form.priceRange.trim(),
        minCast: Number(form.minCast),
        maxCast: Number(form.maxCast),
        baseAverage: Number(form.baseAverage),
        creatorGroup: form.creatorGroup,
        note: form.note.trim(),
        adsCost: form.adsCost.trim(),
        usageImageCost: form.usageImageCost.trim(),
        lastUpdate: new Date().toISOString().split('T')[0]
      };
      setTiers(prev => [...prev, newTier]);
      if (onNotify) onNotify(`Đã thêm vào bản nháp: bậc cast mới [${newTier.tierCode}]`);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      <PageActions>
        <Button
          variant="primary"
          icon={Plus}
          onClick={handleOpenAdd}
          disabled={!canEdit}
        >
          Thêm bậc cast
        </Button>
      </PageActions>

      <Panel flush>
        <div className="p-4 border-b border-line grid gap-2.5">
          <FilterBar
            search={{
              value: search,
              onChange: (v) => setSearch(v),
              placeholder: 'Tìm mã bậc cast (KL1, KL2...), khoảng giá, phân nhóm...',
            }}
            filters={
              isTierFiltered ? (
                <Button variant="ghost" onClick={handleResetTierFilters}>
                  Xóa bộ lọc
                </Button>
              ) : undefined
            }
            resultCount={isTierFiltered ? filteredTiers.length : undefined}
          />

          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <Chips
              label="Phân nhóm"
              items={[
                { key: 'ALL', label: 'Tất cả phân nhóm', count: tiers.length },
                { key: 'Massive Creator', label: 'Massive Creator', count: tiers.filter(t => t.creatorGroup === 'Massive Creator').length },
                { key: 'Mid Creator', label: 'Mid Creator', count: tiers.filter(t => t.creatorGroup === 'Mid Creator').length },
                { key: 'Key Creator', label: 'Key Creator', count: tiers.filter(t => t.creatorGroup === 'Key Creator').length },
                { key: 'Top Creator', label: 'Top Creator', count: tiers.filter(t => t.creatorGroup === 'Top Creator').length },
              ]}
              value={selectedGroup}
              onChange={(k) => setSelectedGroup(k)}
            />
          </div>
        </div>

        <DataTable<MasterCastTier>
          columns={[
            {
              key: 'tierCode',
              header: 'Mã bậc & Phân nhóm',
              render: (t: MasterCastTier) => (
                <div>
                  <div className="font-semibold text-ink font-mono text-xs">{t.tierCode}</div>
                  <div className="text-2xs text-ink-3">{t.creatorGroup}</div>
                </div>
              )
            },
            {
              key: 'priceRange',
              header: 'Khoảng giá định mức',
              render: (t: MasterCastTier) => (
                <span className="text-xs text-ink-2 font-medium">{t.priceRange}</span>
              )
            },
            {
              key: 'minMax',
              header: 'Định mức Min - Max',
              align: 'right',
              render: (t: MasterCastTier) => (
                <div className="font-mono text-xs text-ink">
                  {t.minCast === 0 && t.maxCast <= 1 ? (
                    <span className="text-ink-3">0 đ (FOC / TAP)</span>
                  ) : (
                    `${formatVnd(t.minCast)} - ${t.maxCast > 30000000 ? '>30M' : formatVnd(t.maxCast)}`
                  )}
                </div>
              )
            },
            {
              key: 'baseAverage',
              header: 'Base trung bình',
              align: 'right',
              render: (t: MasterCastTier) => (
                <div className="font-mono text-xs font-semibold text-ink">
                  {t.baseAverage === 0 ? '0 đ' : formatVnd(t.baseAverage)}
                </div>
              )
            },
            {
              key: 'rights',
              header: 'Quyền khai thác',
              render: (t: MasterCastTier) => (
                <div className="space-y-0.5 text-2xs">
                  <div className="text-ink-2">
                    <span className="text-ink-3">Ads:</span>{' '}
                    <span className={t.adsCost === 'Không mất' ? 'text-positive font-medium' : 'text-warning font-medium'}>
                      {t.adsCost}
                    </span>
                  </div>
                  <div className="text-ink-2">
                    <span className="text-ink-3">SDHA:</span>{' '}
                    <span className={t.usageImageCost === 'Không mất' ? 'text-positive font-medium' : 'text-warning font-medium'}>
                      {t.usageImageCost}
                    </span>
                  </div>
                </div>
              )
            },
            {
              key: 'note',
              header: 'Ghi chú chiến lược',
              render: (t: MasterCastTier) => (
                <p className="text-ink-2 text-xs leading-relaxed max-w-sm line-clamp-2">
                  {t.note || '—'}
                </p>
              )
            },
            {
              key: 'actions',
              header: 'Thao tác',
              align: 'right',
              render: (t: MasterCastTier) => (
                <ActionMenu
                  items={[
                    {
                      label: 'Chỉnh sửa',
                      icon: Edit3,
                      onSelect: () => handleOpenEdit(t),
                      disabled: !canEdit,
                    }
                  ]}
                />
              )
            }
          ]}
          rows={filteredTiers}
          rowKey={(t) => t.id}
          stickyLast
          empty={
            <EmptyState
              title="Không tìm thấy bậc cast phù hợp"
              description="Thử đổi từ khóa tìm kiếm hoặc lọc theo phân nhóm khác..."
            />
          }
        />
      </Panel>

      {/* Modal Add / Edit Cast Tier */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTier ? `Cập nhật bậc cast [${editingTier.tierCode}]` : 'Thêm bậc cast mới'}
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              form="cast-tier-form"
              variant="primary"
            >
              Lưu bậc cast
            </Button>
          </>
        }
      >
        <form id="cast-tier-form" onSubmit={handleSave} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-ink-2 font-medium mb-1">Mã bậc (Tier Code) *</label>
              <input
                type="text"
                required
                placeholder="VD: KL8, TAP..."
                value={form.tierCode}
                onChange={(e) => setForm(prev => ({ ...prev, tierCode: e.target.value.toUpperCase() }))}
                className="w-full px-3 py-1.5 border border-line-strong rounded-lg font-mono bg-surface text-ink focus:outline-none focus:border-focus"
              />
            </div>
            <div>
              <label className="block text-ink-2 font-medium mb-1">Khoảng giá hiển thị</label>
              <input
                type="text"
                placeholder="VD: 500k - 1.5M"
                value={form.priceRange}
                onChange={(e) => setForm(prev => ({ ...prev, priceRange: e.target.value }))}
                className="w-full px-3 py-1.5 border border-line-strong rounded-lg bg-surface text-ink focus:outline-none focus:border-focus"
              />
            </div>
          </div>

          <div>
            <label className="block text-ink-2 font-medium mb-1">Phân nhóm Creator</label>
            <select
              value={form.creatorGroup}
              onChange={(e) => setForm(prev => ({ ...prev, creatorGroup: e.target.value }))}
              className="w-full px-3 py-1.5 border border-line-strong rounded-lg bg-surface text-ink focus:outline-none focus:border-focus"
            >
              <option value="Massive Creator">Massive Creator (Phủ số lượng lớn)</option>
              <option value="Mid Creator">Mid Creator (Tầm trung)</option>
              <option value="Key Creator">Key Creator (Chủ lực)</option>
              <option value="Top Creator">Top Creator (Ngôi sao / KOL)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-ink-2 font-medium mb-1">Min Cast (VNĐ)</label>
              <input
                type="number"
                value={form.minCast}
                onChange={(e) => setForm(prev => ({ ...prev, minCast: Number(e.target.value) }))}
                className="w-full px-3 py-1.5 border border-line-strong rounded-lg font-mono bg-surface text-ink focus:outline-none focus:border-focus"
              />
            </div>
            <div>
              <label className="block text-ink-2 font-medium mb-1">Max Cast (VNĐ)</label>
              <input
                type="number"
                value={form.maxCast}
                onChange={(e) => setForm(prev => ({ ...prev, maxCast: Number(e.target.value) }))}
                className="w-full px-3 py-1.5 border border-line-strong rounded-lg font-mono bg-surface text-ink focus:outline-none focus:border-focus"
              />
            </div>
            <div>
              <label className="block text-ink-2 font-medium mb-1">Base TB (VNĐ)</label>
              <input
                type="number"
                value={form.baseAverage}
                onChange={(e) => setForm(prev => ({ ...prev, baseAverage: Number(e.target.value) }))}
                className="w-full px-3 py-1.5 border border-line-strong rounded-lg font-mono bg-surface text-ink focus:outline-none focus:border-focus"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-ink-2 font-medium mb-1">Chi phí quyền Ads</label>
              <input
                type="text"
                placeholder="Không mất / Thương lượng"
                value={form.adsCost}
                onChange={(e) => setForm(prev => ({ ...prev, adsCost: e.target.value }))}
                className="w-full px-3 py-1.5 border border-line-strong rounded-lg bg-surface text-ink focus:outline-none focus:border-focus"
              />
            </div>
            <div>
              <label className="block text-ink-2 font-medium mb-1">Chi phí quyền SDHA</label>
              <input
                type="text"
                placeholder="Không mất / Thương lượng"
                value={form.usageImageCost}
                onChange={(e) => setForm(prev => ({ ...prev, usageImageCost: e.target.value }))}
                className="w-full px-3 py-1.5 border border-line-strong rounded-lg bg-surface text-ink focus:outline-none focus:border-focus"
              />
            </div>
          </div>

          <div>
            <label className="block text-ink-2 font-medium mb-1">Ghi chú chiến lược</label>
            <textarea
              rows={2}
              placeholder="Ghi chú về hiệu suất, mục tiêu sử dụng nhóm..."
              value={form.note}
              onChange={(e) => setForm(prev => ({ ...prev, note: e.target.value }))}
              className="w-full px-3 py-1.5 border border-line-strong rounded-lg bg-surface text-ink focus:outline-none focus:border-focus"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
