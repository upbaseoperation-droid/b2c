'use client';

/**
 * Dữ liệu gốc Cộng tác viên / VJ (Master Data).
 * Chỉ quản lý thông tin định danh rất cơ bản (Mã, Họ tên, SĐT, Vai trò, Ngành hàng, Trạng thái).
 * Các thông tin chuyên sâu (Pháp lý CCCD, Hợp đồng Partnership, Tài khoản ngân hàng, Địa chỉ gửi mẫu 48h,
 * Định mức đơn giá, Sản phẩm cầm sẵn, Lịch sử sản xuất video) được quản lý tại màn hình Hồ sơ CTV / VJ.
 */

import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronRight,
  Edit3,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { Contributor, ContributorRole, ContributorStatus } from '../../../lib/types';
import { INITIAL_CONTRIBUTORS } from '../../../lib/selfChannelData';
import { Avatar, Button, ConfirmDialog, Modal, Pagination } from '../../ui';
import { CTV_ROLE_LABELS } from '../CtvManagementView';

export interface ContributorsMasterViewProps {
  contributors?: Contributor[];
  onContributorCreated?: (ctv: Contributor) => void;
  onContributorUpdated?: (ctv: Contributor) => void;
  onContributorDeleted?: (ctvId: string) => void;
  onNavigateToCtvProfile?: (ctvId?: string) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

const PAGE_SIZE = 15;

export const ContributorsMasterView: React.FC<ContributorsMasterViewProps> = ({
  contributors: propContributors = INITIAL_CONTRIBUTORS,
  onContributorCreated,
  onContributorUpdated,
  onContributorDeleted,
  onNavigateToCtvProfile,
  onNotify,
}) => {
  const [ctvList, setCtvList] = useState<Contributor[]>(propContributors);
  const [synced, setSynced] = useState(propContributors);
  if (propContributors !== synced) {
    setSynced(propContributors);
    setCtvList(propContributors);
  }

  // Bộ lọc cơ bản
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<'ALL' | ContributorRole>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | ContributorStatus>('ALL');
  const [page, setPage] = useState(1);

  // Modal Tạo nhanh CTV (chỉ thông tin cơ bản)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickCode, setQuickCode] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickRole, setQuickRole] = useState<ContributorRole>('ALL_IN_ONE');
  const [quickNiche, setQuickNiche] = useState('Mẹ & Bé, Chăm sóc da');
  const [quickPic, setQuickPic] = useState('Quỳnh Như');

  // Modal Sửa thông tin cơ bản
  const [editingCtv, setEditingCtv] = useState<Contributor | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<ContributorRole>('ALL_IN_ONE');
  const [editNiche, setEditNiche] = useState('');
  const [editPic, setEditPic] = useState('');
  const [editStatus, setEditStatus] = useState<ContributorStatus>('ACTIVE');

  // Xóa CTV
  const [deletingCtv, setDeletingCtv] = useState<Contributor | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ctvList.filter((c) => {
      if (selectedRole !== 'ALL' && c.role !== selectedRole) return false;
      if (selectedStatus !== 'ALL' && c.status !== selectedStatus) return false;
      if (q) {
        const hit =
          c.name.toLowerCase().includes(q) ||
          (c.code || '').toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          (c.contentPic || '').toLowerCase().includes(q) ||
          c.nicheSpecialty.some((n) => n.toLowerCase().includes(q));
        if (!hit) return false;
      }
      return true;
    });
  }, [ctvList, search, selectedRole, selectedStatus]);

  const isFiltered = Boolean(search.trim()) || selectedRole !== 'ALL' || selectedStatus !== 'ALL';

  const handleResetFilters = () => {
    setSearch('');
    setSelectedRole('ALL');
    setSelectedStatus('ALL');
    setPage(1);
  };

  const handleQuickCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim() || !quickPhone.trim()) {
      onNotify?.('Vui lòng nhập Họ tên và Số điện thoại CTV', 'warning');
      return;
    }
    const nextNum = ctvList.length + 1;
    const newCtv: Contributor = {
      id: `ctv-${Date.now()}`,
      code: quickCode.trim() || `CTV-B2C-${String(nextNum).padStart(3, '0')}`,
      name: quickName.trim(),
      phone: quickPhone.trim(),
      nicheSpecialty: quickNiche
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      role: quickRole,
      status: 'ACTIVE',
      contentPic: quickPic.trim() || 'Lê Phương Thảo',
      partnershipPic: 'Việt Hoàng',
      contractStatus: 'NONE',
      bankName: 'Chưa cập nhật',
      bankAccount: '',
      bankAccountName: quickName.trim().toUpperCase(),
      ratingScore: 5.0,
      assignedTaskCount: 0,
      completedTaskCount: 0,
      totalPaidAmount: 0,
      joinedDate: new Date().toISOString().split('T')[0],
    };

    setCtvList((prev) => [newCtv, ...prev]);
    onContributorCreated?.(newCtv);
    setIsQuickAddOpen(false);
    setQuickName('');
    setQuickCode('');
    setQuickPhone('');
    onNotify?.(`Đã khởi tạo CTV [${newCtv.name}] trong Dữ liệu gốc`, 'success');
  };

  const handleSaveBasicEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCtv || !editName.trim()) return;
    const updated: Contributor = {
      ...editingCtv,
      name: editName.trim(),
      code: editCode.trim() || editingCtv.code,
      phone: editPhone.trim(),
      role: editRole,
      nicheSpecialty: editNiche
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      contentPic: editPic.trim(),
      status: editStatus,
    };
    setCtvList((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    onContributorUpdated?.(updated);
    setEditingCtv(null);
    onNotify?.(`Đã cập nhật thông tin cơ bản của CTV [${updated.name}]`, 'success');
  };

  const handleConfirmDelete = () => {
    if (!deletingCtv) return;
    setCtvList((prev) => prev.filter((c) => c.id !== deletingCtv.id));
    onContributorDeleted?.(deletingCtv.id);
    onNotify?.(`Đã xóa CTV [${deletingCtv.name}] khỏi danh mục`, 'info');
    setDeletingCtv(null);
  };

  const currentRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-3">
      {/* Thanh công cụ & Bộ lọc cơ bản */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <div className="relative min-w-[220px] max-w-xs flex-1">
            <Search className="w-3.5 h-3.5 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm tên CTV, mã, SĐT, ngành hàng..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-8.5 pr-8 py-1.5 text-xs rounded-lg border border-line bg-surface focus:outline-none focus:ring-1 focus:ring-line-strong text-ink"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <select
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value as 'ALL' | ContributorRole);
              setPage(1);
            }}
            className="text-xs border border-line rounded-lg px-2.5 py-1.5 bg-surface text-ink focus:outline-none"
          >
            <option value="ALL">Mọi vai trò ({ctvList.length})</option>
            <option value="ALL_IN_ONE">Quay dựng trọn gói</option>
            <option value="CREATIVE_ACTOR">VJ / Diễn viên</option>
            <option value="VIDEO_EDITOR">Dựng phim</option>
            <option value="SCRIPTWRITER">Biên kịch</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value as 'ALL' | ContributorStatus);
              setPage(1);
            }}
            className="text-xs border border-line rounded-lg px-2.5 py-1.5 bg-surface text-ink focus:outline-none"
          >
            <option value="ALL">Mọi trạng thái</option>
            <option value="ACTIVE">Đang hợp tác</option>
            <option value="ON_HOLD">Tạm dừng</option>
          </select>

          {isFiltered && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="py-1 px-2 rounded-lg border border-line bg-surface text-critical hover:bg-critical-soft text-xs font-medium transition flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Đặt lại</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            onClick={() => onNavigateToCtvProfile?.()}
          >
            Hồ sơ CTV / VJ
          </Button>
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => {
              setQuickName('');
              setQuickCode('');
              setQuickPhone('');
              setIsQuickAddOpen(true);
            }}
          >
            Thêm CTV
          </Button>
        </div>
      </div>

      {/* Bảng Dữ liệu gốc CTV / VJ (chỉ hiển thị thông tin rất cơ bản) */}
      <div className="bg-surface rounded-xl border border-line shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-canvas text-ink-3 font-medium border-b border-line text-[12.5px]">
                <th className="py-2.5 px-4 min-w-[220px]">CTV / VJ &amp; Mã</th>
                <th className="py-2.5 px-3 min-w-[150px]">Vai trò chính</th>
                <th className="py-2.5 px-3 min-w-[180px]">Ngành hàng thế mạnh</th>
                <th className="py-2.5 px-3 min-w-[130px]">Số điện thoại</th>
                <th className="py-2.5 px-3 min-w-[150px]">Chuyên viên phụ trách</th>
                <th className="py-2.5 px-3 min-w-[175px]">Hồ sơ CTV / VJ</th>
                <th className="py-2.5 px-3 text-center min-w-[110px]">Trạng thái</th>
                <th className="py-2.5 px-4 text-right min-w-[90px]">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {currentRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-ink-3 text-xs">
                    Không tìm thấy Cộng tác viên / VJ nào khớp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                currentRows.map((c) => {
                  const hasFullProfile = Boolean(
                    c.cccd && c.bankAccount && c.shippingAddress && c.contractStatus === 'ACTIVE',
                  );

                  return (
                    <tr key={c.id} className="hover:bg-canvas transition-colors group">
                      {/* 1. Tên & Mã */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={c.name} src={c.avatar} size={32} />
                          <div>
                            <span className="font-semibold text-ink text-xs block group-hover:text-primary transition-colors">
                              {c.name}
                            </span>
                            <span className="text-2xs font-mono font-medium px-1.5 py-0.5 rounded bg-sunken text-ink-2 border border-line inline-block mt-0.5">
                              {c.code || c.id.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Vai trò */}
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-2xs font-medium bg-sunken text-ink-2 border border-line">
                          {CTV_ROLE_LABELS[c.role]}
                        </span>
                      </td>

                      {/* 3. Ngành hàng */}
                      <td className="py-3 px-3 text-ink-2">
                        <div className="line-clamp-1">{c.nicheSpecialty.join(' • ') || '—'}</div>
                      </td>

                      {/* 4. SĐT */}
                      <td className="py-3 px-3 font-mono text-ink">{c.phone}</td>

                      {/* 5. Chuyên viên phụ trách */}
                      <td className="py-3 px-3">
                        <div className="font-medium text-ink text-xs">
                          {c.contentPic || 'Chưa phân công'}
                        </div>
                        {c.partnershipPic && (
                          <div className="text-2xs text-ink-3 mt-0.5">
                            HĐ: {c.partnershipPic}
                          </div>
                        )}
                      </td>

                      {/* 6. Hồ sơ chuyên sâu (Chuyển sang màn hình Hồ sơ CTV / VJ) */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-2xs font-medium border border-line ${
                              hasFullProfile
                                ? 'bg-positive-soft text-positive'
                                : 'bg-warning-soft text-warning'
                            }`}
                          >
                            {hasFullProfile ? 'Đã đủ hồ sơ' : 'Thiếu pháp lý/mẫu'}
                          </span>
                          <button
                            type="button"
                            onClick={() => onNavigateToCtvProfile?.(c.id)}
                            className="text-2xs font-medium text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>{hasFullProfile ? 'Xem' : 'Thiết lập'}</span>
                            <ChevronRight className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </td>

                      {/* 7. Trạng thái */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-medium border border-line ${
                            c.status === 'ACTIVE'
                              ? 'bg-positive-soft text-positive'
                              : 'bg-sunken text-ink-3'
                          }`}
                        >
                          {c.status === 'ACTIVE' ? 'Đang hợp tác' : 'Tạm dừng'}
                        </span>
                      </td>

                      {/* 8. Thao tác cơ bản */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCtv(c);
                              setEditName(c.name);
                              setEditCode(c.code || '');
                              setEditPhone(c.phone);
                              setEditRole(c.role);
                              setEditNiche(c.nicheSpecialty.join(', '));
                              setEditPic(c.contentPic || '');
                              setEditStatus(c.status);
                            }}
                            className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-sunken transition cursor-pointer"
                            title="Sửa thông tin cơ bản"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingCtv(c)}
                            className="p-1.5 rounded-lg text-ink-3 hover:text-critical hover:bg-critical-soft transition cursor-pointer"
                            title="Xóa CTV"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={filtered.length}
          onPageChange={setPage}
        />
      </div>

      {/* MODAL 1: THÊM NHANH CTV (CHỈ THÔNG TIN CƠ BẢN) */}
      <Modal
        open={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        title="Thêm nhanh Cộng tác viên / VJ"
        description="Khai báo định danh cơ bản vào Dữ liệu gốc. Hồ sơ chuyên sâu (CCCD, hợp đồng, ngân hàng, địa chỉ nhận mẫu) thiết lập tại màn hình Hồ sơ CTV / VJ."
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsQuickAddOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" form="quick-ctv-master-form" variant="primary" icon={Plus}>
              Tạo CTV
            </Button>
          </>
        }
      >
        <form id="quick-ctv-master-form" onSubmit={handleQuickCreate} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-ink font-semibold mb-1">
              Họ và tên CTV / VJ <span className="text-critical">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ví dụ: Nguyễn Hoàng Yến, Dược sĩ Lê Mai Anh..."
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
              className="w-full px-3 py-2 border border-line-strong rounded-lg focus:outline-none focus:border-focus bg-surface font-medium text-ink text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-ink-2 font-medium mb-1">
                Số điện thoại <span className="text-critical">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: 0981 234 567"
                value={quickPhone}
                onChange={(e) => setQuickPhone(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-line-strong rounded-lg bg-surface text-ink focus:outline-none focus:border-focus"
              />
            </div>
            <div>
              <label className="block text-ink-2 font-medium mb-1">Mã CTV (Tùy chọn)</label>
              <input
                type="text"
                placeholder="Tự sinh nếu để trống"
                value={quickCode}
                onChange={(e) => setQuickCode(e.target.value.toUpperCase())}
                className="w-full px-2.5 py-1.5 border border-line-strong rounded-lg font-mono bg-surface text-ink focus:outline-none focus:border-focus"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-ink-2 font-medium mb-1">Vai trò chính</label>
              <select
                value={quickRole}
                onChange={(e) => setQuickRole(e.target.value as ContributorRole)}
                className="w-full px-2.5 py-1.5 border border-line-strong rounded-lg bg-surface text-ink focus:outline-none focus:border-focus"
              >
                <option value="ALL_IN_ONE">Quay dựng trọn gói</option>
                <option value="CREATIVE_ACTOR">VJ / Diễn viên</option>
                <option value="VIDEO_EDITOR">Dựng phim</option>
                <option value="SCRIPTWRITER">Biên kịch</option>
              </select>
            </div>
            <div>
              <label className="block text-ink-2 font-medium mb-1">Content PIC phụ trách</label>
              <input
                type="text"
                value={quickPic}
                onChange={(e) => setQuickPic(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-line-strong rounded-lg bg-surface text-ink focus:outline-none focus:border-focus"
              />
            </div>
          </div>

          <div>
            <label className="block text-ink-2 font-medium mb-1">Ngành hàng thế mạnh</label>
            <input
              type="text"
              value={quickNiche}
              onChange={(e) => setQuickNiche(e.target.value)}
              placeholder="VD: Mẹ & Bé, Dược mỹ phẩm"
              className="w-full px-2.5 py-1.5 border border-line-strong rounded-lg bg-surface text-ink focus:outline-none focus:border-focus"
            />
          </div>

          <div className="p-2.5 rounded-lg bg-accent-soft border border-line text-2xs text-accent flex items-start gap-2">
            <BookOpen className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <span>
              Sau khi tạo, bấm <strong>Thiết lập →</strong> tại cột Hồ sơ CTV / VJ để đọc ảnh CCCD, cập nhật hợp đồng, tài khoản ngân hàng, đơn giá và địa chỉ nhận hàng mẫu.
            </span>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: SỬA THÔNG TIN CƠ BẢN */}
      <Modal
        open={Boolean(editingCtv)}
        onClose={() => setEditingCtv(null)}
        title="Sửa thông tin cơ bản CTV / VJ"
        description="Chỉnh sửa định danh, vai trò và trạng thái hợp tác trong Dữ liệu gốc."
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingCtv(null)}>
              Hủy
            </Button>
            <Button type="submit" form="edit-ctv-master-form" variant="primary">
              Lưu thay đổi
            </Button>
          </>
        }
      >
        <form id="edit-ctv-master-form" onSubmit={handleSaveBasicEdit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-ink font-semibold mb-1">Họ và tên CTV *</label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-line-strong rounded-lg bg-surface text-ink"
              />
            </div>
            <div>
              <label className="block text-ink font-semibold mb-1">Mã CTV</label>
              <input
                type="text"
                value={editCode}
                onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                className="w-full px-2.5 py-1.5 border border-line-strong rounded-lg font-mono bg-surface text-ink"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-ink font-semibold mb-1">Số điện thoại *</label>
              <input
                type="text"
                required
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-line-strong rounded-lg bg-surface text-ink"
              />
            </div>
            <div>
              <label className="block text-ink font-semibold mb-1">Vai trò chính</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as ContributorRole)}
                className="w-full px-2.5 py-1.5 border border-line-strong rounded-lg bg-surface text-ink"
              >
                <option value="ALL_IN_ONE">Quay dựng trọn gói</option>
                <option value="CREATIVE_ACTOR">VJ / Diễn viên</option>
                <option value="VIDEO_EDITOR">Dựng phim</option>
                <option value="SCRIPTWRITER">Biên kịch</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-ink font-semibold mb-1">Content PIC phụ trách</label>
              <input
                type="text"
                value={editPic}
                onChange={(e) => setEditPic(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-line-strong rounded-lg bg-surface text-ink"
              />
            </div>
            <div>
              <label className="block text-ink font-semibold mb-1">Trạng thái</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as ContributorStatus)}
                className="w-full px-2.5 py-1.5 border border-line-strong rounded-lg bg-surface text-ink"
              >
                <option value="ACTIVE">Đang hợp tác</option>
                <option value="ON_HOLD">Tạm dừng</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-ink font-semibold mb-1">Ngành hàng thế mạnh</label>
            <input
              type="text"
              value={editNiche}
              onChange={(e) => setEditNiche(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-line-strong rounded-lg bg-surface text-ink"
            />
          </div>
        </form>
      </Modal>

      {/* XÁC NHẬN XÓA */}
      <ConfirmDialog
        open={Boolean(deletingCtv)}
        onCancel={() => setDeletingCtv(null)}
        onConfirm={handleConfirmDelete}
        title="Xóa CTV khỏi Dữ liệu gốc"
        description={
          deletingCtv
            ? `Bạn có chắc chắn muốn xóa CTV "${deletingCtv.name}" khỏi danh mục gốc?`
            : ''
        }
        confirmLabel="Xóa CTV"
        tone="danger"
      />
    </div>
  );
};
