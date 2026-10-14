'use client';

import React, { useState } from 'react';
import { Search, Plus, X, RotateCcw } from 'lucide-react';
import { MasterCastTier } from '../../../lib/types';
import { formatVnd } from '../../../lib/format';
import { Presence } from '../../ui';

interface CastTiersMasterViewProps {
  initialTiers: MasterCastTier[];
  onChange?: (items: MasterCastTier[]) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const CastTiersMasterView: React.FC<CastTiersMasterViewProps> = ({
  initialTiers,
  onChange,
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
    <div className="space-y-3">
      {/* Action & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <div className="relative min-w-[200px] max-w-xs flex-1">
            <Search className="w-3.5 h-3.5 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm mã bậc (KL1, KL2...), khoảng giá..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8.5 pr-8 py-1.5 text-xs rounded-lg border border-line focus:outline-none focus:ring-1 focus:ring-line-strong bg-surface text-ink"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="text-xs border border-line rounded-lg px-2.5 py-1.5 bg-surface text-ink focus:outline-none shrink-0"
          >
            <option value="ALL">Mọi phân nhóm</option>
            <option value="Massive Creator">Massive Creator</option>
            <option value="Mid Creator">Mid Creator</option>
            <option value="Key Creator">Key Creator</option>
            <option value="Top Creator">Top Creator</option>
          </select>

          {isTierFiltered && (
            <button
              type="button"
              onClick={handleResetTierFilters}
              className="py-1 px-2 rounded-lg border border-line bg-surface text-critical hover:bg-critical-soft text-xs font-medium transition flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Đặt lại</span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-medium rounded-lg transition flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Thêm bậc cast
        </button>
      </div>

      {/* Master Cast Tier Table */}
      <div className="bg-surface rounded-xl border border-line shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-canvas text-ink-3 border-b border-line font-medium text-2xs">
            <tr>
              <th className="py-3 px-4 w-[140px]">Mã bậc cast</th>
              <th className="py-3 px-4 w-[140px]">Phân nhóm</th>
              <th className="py-3 px-4 w-[130px]">Khoảng giá</th>
              <th className="py-3 px-4 text-right w-[140px]">Min - Max cast</th>
              <th className="py-3 px-4 text-right w-[130px]">Base trung bình</th>
              <th className="py-3 px-4 text-center w-[120px]">Quyền chạy Ads</th>
              <th className="py-3 px-4 text-center w-[120px]">Quyền SDHA</th>
              <th className="py-3 px-4 min-w-[200px]">Ghi chú chiến lược</th>
              <th className="py-3 px-4 text-right w-[80px]">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filteredTiers.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-ink-3">
                  Không tìm thấy bậc cast phù hợp
                </td>
              </tr>
            ) : (
              filteredTiers.map(t => (
                <tr key={t.id} className="hover:bg-canvas transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-code font-semibold text-ink text-xs">
                      {t.tierCode}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs font-medium text-ink-2">
                      {t.creatorGroup}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-ink-2">
                    {t.priceRange}
                  </td>
                  <td className="py-3 px-4 text-right font-code text-ink">
                    {t.minCast === 0 && t.maxCast <= 1 ? (
                      <span className="text-ink-3">0 đ (FOC / TAP)</span>
                    ) : (
                      `${formatVnd(t.minCast)} - ${t.maxCast > 30000000 ? '>30M' : formatVnd(t.maxCast)}`
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-code font-semibold text-ink">
                    {t.baseAverage === 0 ? '0 đ' : formatVnd(t.baseAverage)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`text-xs font-medium ${
                      t.adsCost === 'Không mất' 
                        ? 'text-positive' 
                        : 'text-warning'
                    }`}>
                      {t.adsCost}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`text-xs font-medium ${
                      t.usageImageCost === 'Không mất' 
                        ? 'text-positive' 
                        : 'text-warning'
                    }`}>
                      {t.usageImageCost}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-ink-2 text-2xs leading-relaxed">
                    {t.note || '—'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(t)}
                      className="text-ink-2 hover:text-ink font-medium text-xs px-2 py-1 rounded hover:bg-sunken transition"
                    >
                      Sửa
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Add / Edit Cast Tier */}
      <Presence show={!!isModalOpen}>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-surface rounded-xl shadow-xl border border-line max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="font-semibold text-sm text-ink">
                {editingTier ? `Cập nhật bậc cast [${editingTier.tierCode}]` : 'Thêm bậc cast mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-ink-3 hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-ink-2 font-medium mb-1">Mã bậc (Tier Code) *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: KL8, TAP..."
                    value={form.tierCode}
                    onChange={(e) => setForm(prev => ({ ...prev, tierCode: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-line rounded-lg font-code bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-line-strong"
                  />
                </div>
                <div>
                  <label className="block text-ink-2 font-medium mb-1">Khoảng giá text</label>
                  <input
                    type="text"
                    placeholder="VD: 500k - 1.5M"
                    value={form.priceRange}
                    onChange={(e) => setForm(prev => ({ ...prev, priceRange: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-line rounded-lg bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-line-strong"
                  />
                </div>
              </div>

              <div>
                <label className="block text-ink-2 font-medium mb-1">Phân nhóm Creator</label>
                <select
                  value={form.creatorGroup}
                  onChange={(e) => setForm(prev => ({ ...prev, creatorGroup: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-line rounded-lg bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-line-strong"
                >
                  <option value="Massive Creator">Massive Creator (Phủ số lượng lớn)</option>
                  <option value="Mid Creator">Mid Creator (Tầm trung)</option>
                  <option value="Key Creator">Key Creator (Chủ lực)</option>
                  <option value="Top Creator">Top Creator (Ngôi sao / KOL)</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-ink-2 font-medium mb-1">Min Cast (VNĐ)</label>
                  <input
                    type="number"
                    value={form.minCast}
                    onChange={(e) => setForm(prev => ({ ...prev, minCast: Number(e.target.value) }))}
                    className="w-full px-3 py-1.5 border border-line rounded-lg font-code bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-line-strong"
                  />
                </div>
                <div>
                  <label className="block text-ink-2 font-medium mb-1">Max Cast (VNĐ)</label>
                  <input
                    type="number"
                    value={form.maxCast}
                    onChange={(e) => setForm(prev => ({ ...prev, maxCast: Number(e.target.value) }))}
                    className="w-full px-3 py-1.5 border border-line rounded-lg font-code bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-line-strong"
                  />
                </div>
                <div>
                  <label className="block text-ink-2 font-medium mb-1">Base TB (VNĐ)</label>
                  <input
                    type="number"
                    value={form.baseAverage}
                    onChange={(e) => setForm(prev => ({ ...prev, baseAverage: Number(e.target.value) }))}
                    className="w-full px-3 py-1.5 border border-line rounded-lg font-code bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-line-strong"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-ink-2 font-medium mb-1">Chi phí quyền Ads</label>
                  <input
                    type="text"
                    placeholder="Không mất / Thương lượng"
                    value={form.adsCost}
                    onChange={(e) => setForm(prev => ({ ...prev, adsCost: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-line rounded-lg bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-line-strong"
                  />
                </div>
                <div>
                  <label className="block text-ink-2 font-medium mb-1">Chi phí quyền SDHA</label>
                  <input
                    type="text"
                    placeholder="Không mất / Thương lượng"
                    value={form.usageImageCost}
                    onChange={(e) => setForm(prev => ({ ...prev, usageImageCost: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-line rounded-lg bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-line-strong"
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
                  className="w-full px-3 py-1.5 border border-line rounded-lg bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-line-strong"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 border border-line rounded-lg text-ink-2 hover:bg-canvas transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition"
                >
                  Lưu bậc cast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </Presence>
    </div>
  );
};
