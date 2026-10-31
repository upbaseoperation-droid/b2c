'use client';

import React, { useState } from 'react';
import { Edit3, Plus } from 'lucide-react';
import { 
  ActionMenu, 
  Button, 
  DataTable, 
  EmptyState, 
  FilterBar, 
  Modal, 
  PageActions, 
  Panel 
} from '../../ui';
import { MasterVideoFormat } from '../../../lib/types';
import { getVietnamDateYmd } from '../../../lib/format';

interface VideoFormatsMasterViewProps {
  initialFormats: MasterVideoFormat[];
  canEdit?: boolean;
  onChange?: (items: MasterVideoFormat[]) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const VideoFormatsMasterView: React.FC<VideoFormatsMasterViewProps> = ({
  initialFormats,
  onChange,
  canEdit = true,
  onNotify
}) => {
  const [localItems, setLocalItems] = useState<MasterVideoFormat[]>(initialFormats);
  const formats = onChange ? initialFormats : localItems;
  const setFormats = (update: React.SetStateAction<MasterVideoFormat[]>) => {
    const next = typeof update === 'function' ? update(formats) : update;
    if (onChange) onChange(next); else setLocalItems(next);
  };
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
        (f.option && f.option.toLowerCase().includes(q)) ||
        f.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const isFiltered = search.trim() !== '';

  const handleOpenAdd = () => {
    if (!canEdit) return;
    setEditingFormat(null);
    setForm({ name: '', option: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (f: MasterVideoFormat) => {
    setEditingFormat(f);
    setForm({ 
      name: f.name.replace(/Video AI/gi, 'Video đồ họa'), 
      option: (f.option || f.name).replace(/Video AI/gi, 'Video đồ họa') 
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!form.name.trim()) return;

    if (editingFormat) {
      setFormats(prev => prev.map(item => item.id === editingFormat.id ? {
        ...item,
        name: form.name.trim(),
        option: form.option.trim() || form.name.trim(),
        lastUpdate: getVietnamDateYmd()
      } : item));
      if (onNotify) onNotify(`Đã sửa bản nháp: định dạng video [${form.name}]`);
    } else {
      const newFormat: MasterVideoFormat = {
        id: `VF-${String(formats.length + 1).padStart(2, '0')}`,
        name: form.name.trim(),
        option: form.option.trim() || form.name.trim(),
        lastUpdate: getVietnamDateYmd()
      };
      setFormats(prev => [...prev, newFormat]);
      if (onNotify) onNotify(`Đã thêm vào bản nháp: định dạng video mới [${newFormat.name}]`);
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
          Thêm định dạng video
        </Button>
      </PageActions>

      <Panel flush>
        <div className="p-4 border-b border-line grid gap-3">
          <FilterBar
            search={{
              value: search,
              onChange: (v) => setSearch(v),
              placeholder: 'Tìm theo tên định dạng, mã hoặc tùy chọn hiển thị...',
            }}
            filters={
              isFiltered ? (
                <Button variant="ghost" onClick={() => setSearch('')}>
                  Xóa bộ lọc
                </Button>
              ) : undefined
            }
            resultCount={isFiltered ? filteredFormats.length : undefined}
          />
        </div>

        <DataTable<MasterVideoFormat>
          columns={[
            {
              key: 'id',
              header: 'Mã định dạng',
              render: (f: MasterVideoFormat) => (
                <span className="font-mono font-semibold text-xs text-ink">
                  {f.id}
                </span>
              )
            },
            {
              key: 'name',
              header: 'Tên định dạng video',
              render: (f: MasterVideoFormat) => {
                const cleanName = f.name.replace(/Video AI/gi, 'Video đồ họa');
                return (
                  <span className="font-semibold text-xs text-ink">
                    {cleanName}
                  </span>
                );
              }
            },
            {
              key: 'option',
              header: 'Tùy chọn hiển thị (Option)',
              render: (f: MasterVideoFormat) => {
                const cleanOpt = (f.option || f.name).replace(/Video AI/gi, 'Video đồ họa');
                return (
                  <span className="text-xs text-ink-2">
                    {cleanOpt}
                  </span>
                );
              }
            },
            {
              key: 'lastUpdate',
              header: 'Cập nhật lần cuối',
              align: 'right',
              render: (f: MasterVideoFormat) => (
                <span className="font-mono text-2xs text-ink-3">
                  {f.lastUpdate || '2026-05-05'}
                </span>
              )
            },
            {
              key: 'actions',
              header: 'Thao tác',
              align: 'right',
              render: (f: MasterVideoFormat) => (
                <ActionMenu
                  items={[
                    {
                      label: 'Chỉnh sửa',
                      icon: Edit3,
                      onSelect: () => handleOpenEdit(f),
                      disabled: !canEdit,
                    }
                  ]}
                />
              )
            }
          ]}
          rows={filteredFormats}
          rowKey={(f) => f.id}
          stickyLast
          empty={
            <EmptyState
              title="Không tìm thấy định dạng video phù hợp"
              description="Thử đổi từ khóa tìm kiếm định dạng video..."
            />
          }
        />
      </Panel>

      {/* Modal Add / Edit Format */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingFormat ? `Cập nhật định dạng [${editingFormat.name.replace(/Video AI/gi, 'Video đồ họa')}]` : 'Thêm định dạng video mới'}
        size="sm"
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
              form="video-format-form"
              variant="primary"
            >
              Lưu định dạng
            </Button>
          </>
        }
      >
        <form id="video-format-form" onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block text-ink-2 font-medium mb-1">Tên định dạng video *</label>
            <input
              type="text"
              required
              placeholder="VD: Review Voice, Ảnh lướt, Unbox Voice..."
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-line-strong rounded-lg bg-surface text-ink focus:outline-none focus:border-focus font-medium"
            />
          </div>

          <div>
            <label className="block text-ink-2 font-medium mb-1">Tùy chọn hiển thị (Option)</label>
            <input
              type="text"
              placeholder="VD: Review Voice (giọng đọc trải nghiệm)..."
              value={form.option}
              onChange={(e) => setForm(prev => ({ ...prev, option: e.target.value }))}
              className="w-full px-3 py-2 border border-line-strong rounded-lg bg-surface text-ink focus:outline-none focus:border-focus"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
