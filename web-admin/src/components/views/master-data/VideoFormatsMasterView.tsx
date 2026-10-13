'use client';

import React, { useState } from 'react';
import { Search, Plus, X } from 'lucide-react';
import { Button, Modal, Stat, StatRow } from '../../ui';
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
      {/* Top Overview */}
      <StatRow>
        <Stat
          label="Định dạng tiêu chuẩn"
          value={formats.length}
          note="Voiceover, Nhạc nền text, Ảnh lướt..."
        />
        <Stat
          label="Mẫu dựng sẵn & Tự động"
          value={`${formats.filter(f => f.name.toLowerCase().includes('voice') || f.name.toLowerCase().includes('text')).length} mẫu`}
          note="Tối ưu thời gian sản xuất video hàng loạt"
        />
        <Stat
          label="Kênh phát hành trọng điểm"
          value="TikTok & Reels"
          note="Quy chuẩn khung hình 9:16 cho B2C"
        />
      </StatRow>

      {/* Filter and Action Bar */}
      <div className="bg-surface p-3.5 rounded-xl border border-line shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên định dạng, phân loại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-line bg-surface focus:outline-none focus:ring-1 focus:ring-line-strong text-ink"
          />
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-medium rounded-lg transition flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Thêm định dạng video
        </button>
      </div>

      {/* Video Formats Table */}
      <div className="bg-surface rounded-xl border border-line shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-canvas text-ink-3 border-b border-line font-medium text-[12.5px]">
            <tr>
              <th className="py-2.5 px-4 w-[120px]">Mã định dạng</th>
              <th className="py-2.5 px-4 w-[240px]">Tên định dạng video</th>
              <th className="py-2.5 px-4 min-w-[200px]">Tùy chọn hiển thị (Option)</th>
              <th className="py-2.5 px-4 w-[160px]">Cập nhật lần cuối</th>
              <th className="py-2.5 px-4 text-right w-[80px]">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filteredFormats.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-ink-3">
                  Không tìm thấy định dạng video phù hợp
                </td>
              </tr>
            ) : (
              filteredFormats.map(f => (
                <tr key={f.id} className="hover:bg-canvas transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-mono font-medium text-ink-2 text-xs px-1.5 py-0.5 rounded bg-sunken border border-line">
                      {f.id}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-ink text-xs">
                      {f.name}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-ink-2">
                    <span className="px-2 py-0.5 rounded text-2xs font-medium bg-sunken text-ink-2 border border-line">
                      {f.option}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-ink-3 font-mono text-2xs">
                    {f.lastUpdate || '2026-05-05'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(f)}
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

      {/* Modal Add / Edit Format */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingFormat ? `Cập nhật định dạng [${editingFormat.name}]` : 'Thêm định dạng video'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button variant="primary" onClick={handleSave}>Lưu định dạng</Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-3 text-xs">
          <div>
            <label className="block text-ink-2 font-medium mb-1">Tên định dạng *</label>
            <input
              type="text"
              required
              placeholder="VD: Unbox Voice, Review Voice..."
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-1.5 border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-line-strong text-ink bg-surface"
            />
          </div>

          <div>
            <label className="block text-ink-2 font-medium mb-1">Tùy chọn hiển thị (Option Label)</label>
            <input
              type="text"
              placeholder="VD: Unbox Voice (Để trống nếu giống tên)"
              value={form.option}
              onChange={(e) => setForm(prev => ({ ...prev, option: e.target.value }))}
              className="w-full px-3 py-1.5 border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-line-strong text-ink bg-surface"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
