'use client';

import React, { useState } from 'react';
import { Search, Plus, X, RotateCcw } from 'lucide-react';
import { MasterKocNiche } from '../../../lib/types';
import { Presence } from '../../ui';

interface KocNichesMasterViewProps {
  initialNiches: MasterKocNiche[];
  onChange?: (items: MasterKocNiche[]) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const KocNichesMasterView: React.FC<KocNichesMasterViewProps> = ({
  initialNiches,
  onChange,
  onNotify
}) => {
  const [localItems, setLocalItems] = useState<MasterKocNiche[]>(initialNiches);
  const niches = onChange ? initialNiches : localItems;
  const setNiches = (update: React.SetStateAction<MasterKocNiche[]>) => {
    const next = typeof update === 'function' ? update(niches) : update;
    if (onChange) onChange(next); else setLocalItems(next);
  };
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNiche, setEditingNiche] = useState<MasterKocNiche | null>(null);

  const [form, setForm] = useState({
    nicheName: '',
    definition: '',
    category: 'Đa ngành',
    properties: 'Lifestyle',
    pillarMatch: ''
  });

  // Extract unique categories
  const categories = Array.from(new Set(niches.map(n => n.category || 'Đa ngành'))).sort();

  const filteredNiches = niches.filter(n => {
    if (selectedCategory !== 'ALL' && (n.category || 'Đa ngành') !== selectedCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        n.nicheName.toLowerCase().includes(q) ||
        (n.definition && n.definition.toLowerCase().includes(q)) ||
        (n.category && n.category.toLowerCase().includes(q)) ||
        (n.properties && n.properties.toLowerCase().includes(q)) ||
        (n.pillarMatch && n.pillarMatch.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const isNicheFiltered = search.trim() !== '' || selectedCategory !== 'ALL';

  const handleResetNicheFilters = () => {
    setSearch('');
    setSelectedCategory('ALL');
  };

  const handleOpenAdd = () => {
    setEditingNiche(null);
    setForm({
      nicheName: '',
      definition: '',
      category: 'Đa ngành',
      properties: 'Lifestyle',
      pillarMatch: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (n: MasterKocNiche) => {
    setEditingNiche(n);
    setForm({
      nicheName: n.nicheName,
      definition: n.definition || '',
      category: n.category || 'Đa ngành',
      properties: n.properties || 'Lifestyle',
      pillarMatch: n.pillarMatch || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nicheName.trim()) return;

    if (editingNiche) {
      setNiches(prev => prev.map(item => item.id === editingNiche.id ? {
        ...item,
        nicheName: form.nicheName.trim(),
        definition: form.definition.trim(),
        category: form.category.trim(),
        properties: form.properties.trim(),
        pillarMatch: form.pillarMatch.trim(),
        lastUpdate: new Date().toISOString().split('T')[0]
      } : item));
      if (onNotify) onNotify(`Đã sửa bản nháp: tệp kênh [${form.nicheName}]`);
    } else {
      const newNiche: MasterKocNiche = {
        id: `NICHE-${String(niches.length + 1).padStart(2, '0')}`,
        nicheName: form.nicheName.trim(),
        definition: form.definition.trim(),
        category: form.category.trim(),
        properties: form.properties.trim(),
        pillarMatch: form.pillarMatch.trim(),
        lastUpdate: new Date().toISOString().split('T')[0]
      };
      setNiches(prev => [...prev, newNiche]);
      if (onNotify) onNotify(`Đã thêm vào bản nháp: tệp kênh mới [${newNiche.nicheName}]`);
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
              placeholder="Tìm tên tệp, định nghĩa, pillar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8.5 pr-8 py-1.5 text-xs rounded-lg border border-line bg-surface focus:outline-none focus:ring-1 focus:ring-line-strong text-ink"
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
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs border border-line rounded-lg px-2.5 py-1.5 bg-surface text-ink focus:outline-none shrink-0"
          >
            <option value="ALL">Mọi chuyên mục ({categories.length})</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {isNicheFiltered && (
            <button
              type="button"
              onClick={handleResetNicheFilters}
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
          Thêm tệp KOC
        </button>
      </div>

      {/* Master Niches Table */}
      <div className="bg-surface rounded-xl border border-line shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-canvas text-ink-3 border-b border-line font-medium text-2xs">
            <tr>
              <th className="py-3 px-4 w-[180px]">Tên tệp kênh KOC</th>
              <th className="py-3 px-4 w-[160px]">Chuyên mục</th>
              <th className="py-3 px-4 w-[130px]">Thuộc tính KOC</th>
              <th className="py-3 px-4 min-w-[280px]">Định nghĩa tệp</th>
              <th className="py-3 px-4 w-[160px]">Trụ cột phù hợp</th>
              <th className="py-3 px-4 text-right w-[80px]">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filteredNiches.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-ink-3">
                  Không tìm thấy tệp kênh KOC phù hợp
                </td>
              </tr>
            ) : (
              filteredNiches.map(n => (
                <tr key={n.id} className="hover:bg-canvas transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-semibold text-ink text-xs">
                      {n.nicheName}
                    </span>
                    <div className="text-2xs font-code text-ink-3 mt-0.5">{n.id}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs font-medium text-ink-2">
                      {n.category || 'Đa ngành'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs text-ink-2">
                      {n.properties || 'Lifestyle'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-ink-2 text-2xs leading-relaxed">
                    {n.definition || '—'}
                  </td>
                  <td className="py-3 px-4">
                    {n.pillarMatch ? (
                      <span className="text-xs font-medium text-ink-2">
                        {n.pillarMatch}
                      </span>
                    ) : (
                      <span className="text-ink-3 text-2xs">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(n)}
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

      {/* Modal Add / Edit Niche */}
      <Presence show={!!isModalOpen}>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-surface rounded-xl shadow-xl border border-line max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="font-semibold text-sm text-ink">
                {editingNiche ? `Cập nhật tệp kênh [${editingNiche.nicheName}]` : 'Thêm tệp kênh KOC mới'}
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
              <div>
                <label className="block text-ink-2 font-medium mb-1">Tên tệp kênh *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Review Mẹ & Bé, Bác sỹ..."
                  value={form.nicheName}
                  onChange={(e) => setForm(prev => ({ ...prev, nicheName: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-line rounded-lg bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-line-strong"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-ink-2 font-medium mb-1">Chuyên mục ngành</label>
                  <input
                    type="text"
                    placeholder="VD: Beauty, Mom & Baby..."
                    value={form.category}
                    onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-line rounded-lg bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-line-strong"
                  />
                </div>
                <div>
                  <label className="block text-ink-2 font-medium mb-1">Thuộc tính KOC</label>
                  <input
                    type="text"
                    placeholder="VD: Expert, Lifestyle..."
                    value={form.properties}
                    onChange={(e) => setForm(prev => ({ ...prev, properties: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-line rounded-lg bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-line-strong"
                  />
                </div>
              </div>

              <div>
                <label className="block text-ink-2 font-medium mb-1">Trụ cột nội dung gợi ý liên kết</label>
                <input
                  type="text"
                  placeholder="VD: Review trực tiếp, Educate..."
                  value={form.pillarMatch}
                  onChange={(e) => setForm(prev => ({ ...prev, pillarMatch: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-line rounded-lg bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-line-strong"
                />
              </div>

              <div>
                <label className="block text-ink-2 font-medium mb-1">Định nghĩa & Quy chuẩn tệp</label>
                <textarea
                  rows={3}
                  placeholder="Mô tả tiêu chuẩn KOC thuộc tệp này..."
                  value={form.definition}
                  onChange={(e) => setForm(prev => ({ ...prev, definition: e.target.value }))}
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
                  Lưu tệp kênh
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
