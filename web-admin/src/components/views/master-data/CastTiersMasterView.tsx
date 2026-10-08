'use client';

import React, { useState } from 'react';
import { Search, Plus, X, Layers, TrendingUp, DollarSign, ShieldAlert } from 'lucide-react';
import { MasterCastTier } from '../../../lib/types';

interface CastTiersMasterViewProps {
  initialTiers: MasterCastTier[];
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const CastTiersMasterView: React.FC<CastTiersMasterViewProps> = ({
  initialTiers,
  onNotify
}) => {
  const [tiers, setTiers] = useState<MasterCastTier[]>(initialTiers);
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

  const formatVnd = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

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
      if (onNotify) onNotify(`Đã cập nhật bậc cast [${form.tierCode}]`);
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
      if (onNotify) onNotify(`Đã thêm bậc cast mới [${newTier.tierCode}]`);
    }
    setIsModalOpen(false);
  };

  const getGroupBadgeClass = (group: string) => {
    switch (group) {
      case 'Massive Creator':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Mid Creator':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Key Creator':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Top Creator':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Số bậc phân loại</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-slate-900">{tiers.length}</span>
            <span className="text-2xs text-slate-500">bậc tiêu chuẩn</span>
          </div>
          <div className="text-2xs text-slate-500 mt-1">
            Từ TAP Affiliate đến KL7 (&gt;30M)
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Massive Creator</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-emerald-600">0 - 1.5M</span>
            <span className="text-2xs text-slate-500">VNĐ</span>
          </div>
          <div className="text-2xs text-slate-500 mt-1">
            Quyền Ads & SDHA: Miễn phí
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Key & Top Creator</span>
            <DollarSign className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-purple-600">5M - &gt;30M</span>
            <span className="text-2xs text-slate-500">VNĐ</span>
          </div>
          <div className="text-2xs text-slate-500 mt-1">
            Chạy Ads & SDHA: Thương lượng
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Chính sách bản quyền</span>
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-800">
            KL1-KL3: Miễn phí
          </div>
          <div className="text-2xs text-slate-500 mt-1">
            KL4 trở lên cần đàm phán riêng
          </div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-lg">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm mã bậc (KL1, KL2...), khoảng giá..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none shrink-0"
          >
            <option value="ALL">Mọi phân nhóm</option>
            <option value="Massive Creator">Massive Creator</option>
            <option value="Mid Creator">Mid Creator</option>
            <option value="Key Creator">Key Creator</option>
            <option value="Top Creator">Top Creator</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Thêm bậc cast
        </button>
      </div>

      {/* Master Cast Tier Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-2xs">
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
          <tbody className="divide-y divide-slate-100">
            {filteredTiers.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  Không tìm thấy bậc cast phù hợp
                </td>
              </tr>
            ) : (
              filteredTiers.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-slate-900 text-xs px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                      {t.tierCode}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-2xs font-semibold border ${getGroupBadgeClass(t.creatorGroup)}`}>
                      {t.creatorGroup}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-700">
                    {t.priceRange}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-800">
                    {t.minCast === 0 && t.maxCast <= 1 ? (
                      <span className="text-slate-400">0 đ (FOC / TAP)</span>
                    ) : (
                      `${formatVnd(t.minCast)} - ${t.maxCast > 30000000 ? '>30M' : formatVnd(t.maxCast)}`
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    {t.baseAverage === 0 ? '0 đ' : formatVnd(t.baseAverage)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-2xs font-medium ${
                      t.adsCost === 'Không mất' 
                        ? 'bg-emerald-50 text-emerald-700' 
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {t.adsCost}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-2xs font-medium ${
                      t.usageImageCost === 'Không mất' 
                        ? 'bg-emerald-50 text-emerald-700' 
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {t.usageImageCost}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 text-2xs leading-relaxed">
                    {t.note || '—'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(t)}
                      className="text-slate-600 hover:text-slate-900 font-medium text-xs px-2 py-1 rounded hover:bg-slate-100 transition"
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
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-semibold text-sm text-slate-900">
                {editingTier ? `Cập nhật bậc cast [${editingTier.tierCode}]` : 'Thêm bậc cast mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Mã bậc (Tier Code) *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: KL8, TAP..."
                    value={form.tierCode}
                    onChange={(e) => setForm(prev => ({ ...prev, tierCode: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Khoảng giá text</label>
                  <input
                    type="text"
                    placeholder="VD: 500k - 1.5M"
                    value={form.priceRange}
                    onChange={(e) => setForm(prev => ({ ...prev, priceRange: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Phân nhóm Creator</label>
                <select
                  value={form.creatorGroup}
                  onChange={(e) => setForm(prev => ({ ...prev, creatorGroup: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  <option value="Massive Creator">Massive Creator (Phủ số lượng lớn)</option>
                  <option value="Mid Creator">Mid Creator (Tầm trung)</option>
                  <option value="Key Creator">Key Creator (Chủ lực)</option>
                  <option value="Top Creator">Top Creator (Ngôi sao / KOL)</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Min Cast (VNĐ)</label>
                  <input
                    type="number"
                    value={form.minCast}
                    onChange={(e) => setForm(prev => ({ ...prev, minCast: Number(e.target.value) }))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Max Cast (VNĐ)</label>
                  <input
                    type="number"
                    value={form.maxCast}
                    onChange={(e) => setForm(prev => ({ ...prev, maxCast: Number(e.target.value) }))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Base TB (VNĐ)</label>
                  <input
                    type="number"
                    value={form.baseAverage}
                    onChange={(e) => setForm(prev => ({ ...prev, baseAverage: Number(e.target.value) }))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Chi phí quyền Ads</label>
                  <input
                    type="text"
                    placeholder="Không mất / Thương lượng"
                    value={form.adsCost}
                    onChange={(e) => setForm(prev => ({ ...prev, adsCost: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Chi phí quyền SDHA</label>
                  <input
                    type="text"
                    placeholder="Không mất / Thương lượng"
                    value={form.usageImageCost}
                    onChange={(e) => setForm(prev => ({ ...prev, usageImageCost: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Ghi chú chiến lược</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú về hiệu suất, mục tiêu sử dụng nhóm..."
                  value={form.note}
                  onChange={(e) => setForm(prev => ({ ...prev, note: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition"
                >
                  Lưu bậc cast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
