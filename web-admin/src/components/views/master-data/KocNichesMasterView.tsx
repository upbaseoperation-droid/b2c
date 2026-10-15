'use client';

import React, { useState, useMemo } from 'react';
import { Edit3, Plus } from 'lucide-react';
import { MasterKocNiche } from '../../../lib/types';
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

interface KocNichesMasterViewProps {
  initialNiches: MasterKocNiche[];
  canEdit?: boolean;
  onChange?: (items: MasterKocNiche[]) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const KocNichesMasterView: React.FC<KocNichesMasterViewProps> = ({
  initialNiches,
  onChange,
  canEdit = true,
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
  const categories = useMemo(() => 
    Array.from(new Set(niches.map(n => n.category || 'Đa ngành'))).sort(),
    [niches]
  );

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
    if (!canEdit) return;
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
    if (!canEdit) return;
    if (!form.nicheName.trim()) return;

    if (editingNiche) {
      setNiches(prev => prev.map(item => item.id === editingNiche.id ? {
        ...item,
        nicheName: form.nicheName.trim(),
        definition: form.definition.trim(),
        category: form.category.trim(),
        properties: form.properties.trim(),
        pillarMatch: form.pillarMatch.trim()
      } : item));
      if (onNotify) onNotify(`Đã sửa bản nháp: tệp kênh [${form.nicheName}]`);
    } else {
      const newNiche: MasterKocNiche = {
        id: `NICHE-${String(niches.length + 1).padStart(2, '0')}`,
        nicheName: form.nicheName.trim(),
        definition: form.definition.trim(),
        category: form.category.trim(),
        properties: form.properties.trim(),
        pillarMatch: form.pillarMatch.trim()
      };
      setNiches(prev => [...prev, newNiche]);
      if (onNotify) onNotify(`Đã thêm vào bản nháp: tệp kênh mới [${newNiche.nicheName}]`);
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
          Thêm tệp KOC
        </Button>
      </PageActions>

      <Panel flush>
        <div className="p-4 border-b border-line grid gap-2.5">
          <FilterBar
            search={{
              value: search,
              onChange: (v) => setSearch(v),
              placeholder: 'Tìm tên tệp kênh KOC, định nghĩa, chuyên mục...',
            }}
            filters={
              isNicheFiltered ? (
                <Button variant="ghost" onClick={handleResetNicheFilters}>
                  Xóa bộ lọc
                </Button>
              ) : undefined
            }
            resultCount={isNicheFiltered ? filteredNiches.length : undefined}
          />

          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <Chips
              label="Chuyên mục"
              items={[
                { key: 'ALL', label: 'Tất cả chuyên mục', count: niches.length },
                ...categories.slice(0, 8).map(c => ({
                  key: c,
                  label: c,
                  count: niches.filter(n => (n.category || 'Đa ngành') === c).length
                }))
              ]}
              value={selectedCategory}
              onChange={(k) => setSelectedCategory(k)}
            />
          </div>
        </div>

        <DataTable<MasterKocNiche>
          columns={[
            {
              key: 'nicheName',
              header: 'Tên tệp kênh KOC',
              render: (n: MasterKocNiche) => (
                <div>
                  <div className="font-semibold text-ink text-xs">{n.nicheName}</div>
                  <div className="font-mono text-2xs text-ink-3">{n.id}</div>
                </div>
              )
            },
            {
              key: 'category',
              header: 'Chuyên mục',
              render: (n: MasterKocNiche) => (
                <span className="text-xs font-medium text-ink-2">{n.category || 'Đa ngành'}</span>
              )
            },
            {
              key: 'properties',
              header: 'Thuộc tính KOC',
              render: (n: MasterKocNiche) => (
                <span className="inline-block px-1.5 py-0.5 rounded text-2xs bg-surface-subtle border border-line text-ink-2 font-medium">
                  {n.properties || 'Lifestyle'}
                </span>
              )
            },
            {
              key: 'definition',
              header: 'Định nghĩa & Quy chuẩn tệp',
              render: (n: MasterKocNiche) => (
                <p className="text-ink-2 text-xs leading-relaxed max-w-md line-clamp-2">
                  {n.definition || '—'}
                </p>
              )
            },
            {
              key: 'pillarMatch',
              header: 'Trụ cột gợi ý',
              render: (n: MasterKocNiche) => (
                <span className="text-xs text-ink-2 font-medium">
                  {n.pillarMatch || '—'}
                </span>
              )
            },
            {
              key: 'actions',
              header: 'Thao tác',
              align: 'right',
              render: (n: MasterKocNiche) => (
                <ActionMenu
                  items={[
                    {
                      label: 'Chỉnh sửa',
                      icon: Edit3,
                      onSelect: () => handleOpenEdit(n),
                      disabled: !canEdit,
                    }
                  ]}
                />
              )
            }
          ]}
          rows={filteredNiches}
          rowKey={(n) => n.id}
          stickyLast
          empty={
            <EmptyState
              title="Không tìm thấy tệp kênh KOC phù hợp"
              description="Thử đổi từ khóa tìm kiếm hoặc chọn chuyên mục khác..."
            />
          }
        />
      </Panel>

      {/* Modal Add / Edit Niche */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingNiche ? `Cập nhật tệp kênh [${editingNiche.nicheName}]` : 'Thêm tệp kênh KOC mới'}
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
              form="koc-niche-form"
              variant="primary"
            >
              Lưu tệp kênh
            </Button>
          </>
        }
      >
        <form id="koc-niche-form" onSubmit={handleSave} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-ink-2 font-medium mb-1">Tên tệp kênh *</label>
            <input
              type="text"
              required
              placeholder="VD: Review Mẹ & Bé, Bác sỹ, Chăm sóc da..."
              value={form.nicheName}
              onChange={(e) => setForm(prev => ({ ...prev, nicheName: e.target.value }))}
              className="w-full px-3 py-1.5 border border-line-strong rounded-lg bg-surface text-ink focus:outline-none focus:border-focus"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-ink-2 font-medium mb-1">Chuyên mục ngành</label>
              <input
                type="text"
                placeholder="VD: Beauty, Mom & Baby..."
                value={form.category}
                onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-1.5 border border-line-strong rounded-lg bg-surface text-ink focus:outline-none focus:border-focus"
              />
            </div>
            <div>
              <label className="block text-ink-2 font-medium mb-1">Thuộc tính KOC</label>
              <input
                type="text"
                placeholder="VD: Expert, Lifestyle, Reviewer..."
                value={form.properties}
                onChange={(e) => setForm(prev => ({ ...prev, properties: e.target.value }))}
                className="w-full px-3 py-1.5 border border-line-strong rounded-lg bg-surface text-ink focus:outline-none focus:border-focus"
              />
            </div>
          </div>

          <div>
            <label className="block text-ink-2 font-medium mb-1">Trụ cột nội dung gợi ý liên kết</label>
            <input
              type="text"
              placeholder="VD: Review trực tiếp, Educate, Nỗi đau - Giải pháp..."
              value={form.pillarMatch}
              onChange={(e) => setForm(prev => ({ ...prev, pillarMatch: e.target.value }))}
              className="w-full px-3 py-1.5 border border-line-strong rounded-lg bg-surface text-ink focus:outline-none focus:border-focus"
            />
          </div>

          <div>
            <label className="block text-ink-2 font-medium mb-1">Định nghĩa & Quy chuẩn tệp</label>
            <textarea
              rows={3}
              placeholder="Mô tả tiêu chuẩn KOC thuộc tệp này..."
              value={form.definition}
              onChange={(e) => setForm(prev => ({ ...prev, definition: e.target.value }))}
              className="w-full px-3 py-1.5 border border-line-strong rounded-lg bg-surface text-ink focus:outline-none focus:border-focus"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
