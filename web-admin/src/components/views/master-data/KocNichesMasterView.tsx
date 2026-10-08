'use client';

import React, { useState } from 'react';
import { Search, Plus, X, FolderTree, Tag, Compass, Filter, RotateCcw } from 'lucide-react';
import { MasterKocNiche } from '../../../lib/types';

interface KocNichesMasterViewProps {
  initialNiches: MasterKocNiche[];
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const KocNichesMasterView: React.FC<KocNichesMasterViewProps> = ({
  initialNiches,
  onNotify
}) => {
  const [niches, setNiches] = useState<MasterKocNiche[]>(initialNiches);
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
      if (onNotify) onNotify(`Đã cập nhật tệp kênh [${form.nicheName}]`);
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
      if (onNotify) onNotify(`Đã thêm tệp kênh mới [${newNiche.nicheName}]`);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Tổng số tệp kênh KOC</span>
            <FolderTree className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-slate-900">{niches.length}</span>
            <span className="text-2xs text-slate-500">tệp phân loại</span>
          </div>
          <div className="text-2xs text-slate-500 mt-1">
            Review Nữ, Mẹ bé, Chuyên gia, Makeup...
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Chuyên mục ngành hàng</span>
            <Tag className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-blue-600">{categories.length}</span>
            <span className="text-2xs text-slate-500">nhóm ngành</span>
          </div>
          <div className="text-2xs text-slate-500 mt-1">
            Beauty, Health, Mom & Baby, Tech, F&B...
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Chuẩn hóa Trụ cột nội dung</span>
            <Compass className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-emerald-600">
              {niches.filter(n => n.pillarMatch).length}
            </span>
            <span className="text-2xs text-slate-500">tệp đã gắn Pillar</span>
          </div>
          <div className="text-2xs text-slate-500 mt-1">
            Liên kết trực tiếp ma trận phân bổ booking
          </div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1 max-w-xl">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tên tệp, định nghĩa, pillar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none shrink-0"
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
                className="py-1.5 px-2.5 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold transition flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Xóa lọc</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm tệp KOC
          </button>
        </div>

        {/* Results summary */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-2xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Tìm thấy <strong className="text-slate-900 font-bold">{filteredNiches.length}</strong> / {niches.length} tệp KOC</span>
            {isNicheFiltered && (
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-3xs">
                Đang lọc kết quả
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Master Niches Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-2xs">
            <tr>
              <th className="py-3 px-4 w-[180px]">Tên tệp kênh KOC</th>
              <th className="py-3 px-4 w-[160px]">Chuyên mục</th>
              <th className="py-3 px-4 w-[130px]">Thuộc tính KOC</th>
              <th className="py-3 px-4 min-w-[280px]">Định nghĩa tệp</th>
              <th className="py-3 px-4 w-[160px]">Trụ cột phù hợp</th>
              <th className="py-3 px-4 text-right w-[80px]">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredNiches.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  Không tìm thấy tệp kênh KOC phù hợp
                </td>
              </tr>
            ) : (
              filteredNiches.map(n => (
                <tr key={n.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-900 text-xs">
                      {n.nicheName}
                    </span>
                    <div className="text-2xs font-mono text-slate-400 mt-0.5">{n.id}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-2xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      {n.category || 'Đa ngành'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-2xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      {n.properties || 'Lifestyle'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 text-2xs leading-relaxed">
                    {n.definition || '—'}
                  </td>
                  <td className="py-3 px-4">
                    {n.pillarMatch ? (
                      <span className="px-2 py-0.5 rounded text-2xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {n.pillarMatch}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-2xs">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(n)}
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

      {/* Modal Add / Edit Niche */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-semibold text-sm text-slate-900">
                {editingNiche ? `Cập nhật tệp kênh [${editingNiche.nicheName}]` : 'Thêm tệp kênh KOC mới'}
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
              <div>
                <label className="block text-slate-600 font-medium mb-1">Tên tệp kênh *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Review Mẹ & Bé, Bác sỹ..."
                  value={form.nicheName}
                  onChange={(e) => setForm(prev => ({ ...prev, nicheName: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Chuyên mục ngành</label>
                  <input
                    type="text"
                    placeholder="VD: Beauty, Mom & Baby..."
                    value={form.category}
                    onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Thuộc tính KOC</label>
                  <input
                    type="text"
                    placeholder="VD: Expert, Lifestyle..."
                    value={form.properties}
                    onChange={(e) => setForm(prev => ({ ...prev, properties: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Trụ cột nội dung gợi ý liên kết</label>
                <input
                  type="text"
                  placeholder="VD: Review trực tiếp, Educate..."
                  value={form.pillarMatch}
                  onChange={(e) => setForm(prev => ({ ...prev, pillarMatch: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Định nghĩa & Quy chuẩn tệp</label>
                <textarea
                  rows={3}
                  placeholder="Mô tả tiêu chuẩn KOC thuộc tệp này..."
                  value={form.definition}
                  onChange={(e) => setForm(prev => ({ ...prev, definition: e.target.value }))}
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
                  Lưu tệp kênh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
