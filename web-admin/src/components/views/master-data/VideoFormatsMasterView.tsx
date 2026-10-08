'use client';

import React, { useState } from 'react';
import { Search, Plus, X, Video, Clapperboard, Sparkles } from 'lucide-react';
import { MasterVideoFormat } from '../../../lib/types';

interface VideoFormatsMasterViewProps {
  initialFormats: MasterVideoFormat[];
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const VideoFormatsMasterView: React.FC<VideoFormatsMasterViewProps> = ({
  initialFormats,
  onNotify
}) => {
  const [formats, setFormats] = useState<MasterVideoFormat[]>(initialFormats);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFormat, setEditingFormat] = useState<MasterVideoFormat | null>(null);

  const [form, setForm] = useState({
    name: '',
    option: ''
  });

  const filteredFormats = formats.filter(f => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        f.name.toLowerCase().includes(q) ||
        (f.option && f.option.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleOpenAdd = () => {
    setEditingFormat(null);
    setForm({ name: '', option: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (f: MasterVideoFormat) => {
    setEditingFormat(f);
    setForm({ name: f.name, option: f.option || f.name });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    if (editingFormat) {
      setFormats(prev => prev.map(item => item.id === editingFormat.id ? {
        ...item,
        name: form.name.trim(),
        option: form.option.trim() || form.name.trim(),
        lastUpdate: new Date().toISOString().split('T')[0]
      } : item));
      if (onNotify) onNotify(`Đã cập nhật định dạng video [${form.name}]`);
    } else {
      const newFormat: MasterVideoFormat = {
        id: `VF-${String(formats.length + 1).padStart(2, '0')}`,
        name: form.name.trim(),
        option: form.option.trim() || form.name.trim(),
        lastUpdate: new Date().toISOString().split('T')[0]
      };
      setFormats(prev => [...prev, newFormat]);
      if (onNotify) onNotify(`Đã thêm định dạng video mới [${newFormat.name}]`);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Định dạng tiêu chuẩn</span>
            <Clapperboard className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-slate-900">{formats.length}</span>
            <span className="text-2xs text-slate-500">format sản xuất</span>
          </div>
          <div className="text-2xs text-slate-500 mt-1">
            Voiceover, Nhạc text, Ảnh lướt, Video AI...
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Định dạng AI & Tự động</span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-purple-600">Video AI & Remix</span>
          </div>
          <div className="text-2xs text-slate-500 mt-1">
            Tối ưu chi phí sản xuất diện rộng
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Kênh triển khai</span>
            <Video className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-800">
            TikTok, Reels, Shorts & Affiliate
          </div>
          <div className="text-2xs text-slate-500 mt-1">
            Chuẩn hóa quy cách xuất video B2C
          </div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên định dạng, phân loại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Thêm định dạng video
        </button>
      </div>

      {/* Video Formats Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-2xs">
            <tr>
              <th className="py-3 px-4 w-[120px]">Mã format</th>
              <th className="py-3 px-4 w-[240px]">Tên định dạng video</th>
              <th className="py-3 px-4 min-w-[200px]">Tùy chọn hiển thị (Option)</th>
              <th className="py-3 px-4 w-[160px]">Cập nhật lần cuối</th>
              <th className="py-3 px-4 text-right w-[80px]">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredFormats.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  Không tìm thấy định dạng video phù hợp
                </td>
              </tr>
            ) : (
              filteredFormats.map(f => (
                <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-mono font-semibold text-slate-600 text-xs px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                      {f.id}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-900 text-xs">
                      {f.name}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    <span className="px-2 py-0.5 rounded text-2xs font-medium bg-slate-50 text-slate-700 border border-slate-200">
                      {f.option}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-mono text-2xs">
                    {f.lastUpdate || '2026-05-05'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(f)}
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

      {/* Modal Add / Edit Format */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-semibold text-sm text-slate-900">
                {editingFormat ? `Cập nhật định dạng [${editingFormat.name}]` : 'Thêm định dạng video'}
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
                <label className="block text-slate-600 font-medium mb-1">Tên định dạng *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Unbox Voice, Review Voice..."
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Tùy chọn hiển thị (Option Label)</label>
                <input
                  type="text"
                  placeholder="VD: Unbox Voice (Để trống nếu giống tên)"
                  value={form.option}
                  onChange={(e) => setForm(prev => ({ ...prev, option: e.target.value }))}
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
                  Lưu định dạng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
