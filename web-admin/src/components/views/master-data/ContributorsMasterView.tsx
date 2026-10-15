'use client';

/**
 * Danh bạ Cộng tác viên / VJ (Dữ liệu gốc).
 * Thiết kế chuẩn hóa theo Design System, đồng nhất 100% với Danh bạ KOC (KocMasterDataView):
 * - PageActions: Thêm CTV / VJ
 * - Panel flush bao trọn FilterBar + Chips phân loại + DataTable + Pagination
 * - Bấm một hàng để mở hồ sơ chi tiết in-place (CtvProfileDetail) với thanh điều hướng, nút quay lại giữ nguyên bộ lọc
 * - Tích hợp đọc ảnh CCCD (LegalOcrModal), xem mã VietQR thanh toán (CtvVietQrModal)
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  Edit3,
  FileScan,
  Plus,
  QrCode,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import type {
  Contributor,
  ContributorRole,
  ContributorStatus,
  OcrLegalExtractionResult,
  SelfChannelVideoTask,
  UserProfile,
} from '../../../lib/types';
import { INITIAL_CONTRIBUTORS, INITIAL_SELF_CHANNEL_TASKS } from '../../../lib/selfChannelData';
import { formatVndShort } from '../../../lib/format';
import { LegalOcrModal } from '../../LegalOcrModal';
import {
  CTV_CONTRACT_LABELS,
  CTV_ROLE_LABELS,
  CtvProfileDetail,
  CtvVietQrModal,
} from '../CtvManagementView';
import {
  ActionMenu,
  Avatar,
  Button,
  Chips,
  ConfirmDialog,
  DataTable,
  EmptyState,
  FilterBar,
  Modal,
  PageActions,
  Pagination,
  Panel,
  Person,
  Select,
  Status,
} from '../../ui';
import type { Column } from '../../ui';

export interface ContributorsMasterViewProps {
  contributors?: Contributor[];
  tasks?: SelfChannelVideoTask[];
  currentUser?: UserProfile;
  selectedCtvId?: string | null;
  onContributorCreated?: (ctv: Contributor) => void;
  onContributorUpdated?: (ctv: Contributor) => void;
  onContributorDeleted?: (ctvId: string) => void;
  onNavigateToCtvProfile?: (ctvId?: string) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

type RoleFilter = 'ALL' | ContributorRole;
type IssueFilter = '' | 'MISSING_LEGAL' | 'NO_CONTRACT' | 'ON_HOLD';

const ALL = 'ALL';

const hasLegalInfo = (c: Contributor) => Boolean(c.cccd && c.cccd.trim().length >= 9);

export const ContributorsMasterView: React.FC<ContributorsMasterViewProps> = ({
  contributors: propContributors = INITIAL_CONTRIBUTORS,
  tasks = INITIAL_SELF_CHANNEL_TASKS,
  selectedCtvId = null,
  onContributorCreated,
  onContributorUpdated,
  onContributorDeleted,
  onNotify,
}) => {
  const [localCtvs, setLocalCtvs] = useState<Contributor[]>(propContributors);
  const [syncedCtvs, setSyncedCtvs] = useState(propContributors);
  if (propContributors !== syncedCtvs) {
    setSyncedCtvs(propContributors);
    setLocalCtvs(propContributors);
  }

  // Mở hồ sơ chi tiết in-place (null = đang ở bảng danh sách)
  const [openCtvId, setOpenCtvId] = useState<string | null>(selectedCtvId);
  const [syncedSelectedId, setSyncedSelectedId] = useState<string | null>(selectedCtvId);
  if (selectedCtvId !== syncedSelectedId) {
    setSyncedSelectedId(selectedCtvId);
    if (selectedCtvId) {
      setOpenCtvId(selectedCtvId);
    }
  }

  const rootRef = useRef<HTMLDivElement>(null);

  // Modal chức năng
  const [ocrTarget, setOcrTarget] = useState<Contributor | null>(null);
  const [qrTarget, setQrTarget] = useState<Contributor | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingCtv, setDeletingCtv] = useState<Contributor | null>(null);

  // Form tạo nhanh CTV
  const [createForm, setCreateForm] = useState({
    name: '',
    code: '',
    phone: '',
    email: '',
    role: 'ALL_IN_ONE' as ContributorRole,
    niche: 'Mẹ & Bé, Chăm sóc da',
    contentPic: 'Quỳnh Như',
    rate: 1500000,
    shippingAddress: '',
  });

  // Bộ lọc danh bạ
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<RoleFilter>(ALL);
  const [issue, setIssue] = useState<IssueFilter>('');
  const [pic, setPic] = useState(ALL);
  const [niche, setNiche] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Danh sách lựa chọn lọc động
  const picOptions = useMemo(() => {
    const s = new Set<string>();
    localCtvs.forEach((c) => {
      if (c.contentPic) s.add(c.contentPic.trim());
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [localCtvs]);

  const nicheOptions = useMemo(() => {
    const s = new Set<string>();
    localCtvs.forEach((c) => c.nicheSpecialty.forEach((n) => s.add(n.trim())));
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [localCtvs]);

  // Lọc cơ sở trước khi áp dụng chip (để số đếm trên chip luôn chính xác)
  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    return localCtvs.filter((c) => {
      if (q) {
        const hit =
          c.name.toLowerCase().includes(q) ||
          (c.code || '').toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          (c.contentPic || '').toLowerCase().includes(q) ||
          c.nicheSpecialty.some((n) => n.toLowerCase().includes(q)) ||
          (qDigits.length >= 4 && (c.cccd || '').replace(/\D/g, '').includes(qDigits));
        if (!hit) return false;
      }
      if (pic !== ALL && c.contentPic !== pic) return false;
      if (niche !== ALL && !c.nicheSpecialty.includes(niche)) return false;
      if (status !== ALL && c.status !== status) return false;
      return true;
    });
  }, [localCtvs, search, pic, niche, status]);

  const matchesIssue = (c: Contributor, f: IssueFilter) => {
    if (!f) return true;
    if (f === 'MISSING_LEGAL') return !hasLegalInfo(c);
    if (f === 'NO_CONTRACT') return !c.contractStatus || c.contractStatus !== 'ACTIVE';
    if (f === 'ON_HOLD') return c.status === 'ON_HOLD';
    return true;
  };

  const filtered = useMemo(
    () =>
      baseFiltered.filter(
        (c) => (role === ALL || c.role === role) && matchesIssue(c, issue),
      ),
    [baseFiltered, role, issue],
  );

  // Chips vai trò & Chips cần xử lý
  const roleChips = (['ALL', 'ALL_IN_ONE', 'CREATIVE_ACTOR', 'VIDEO_EDITOR', 'SCRIPTWRITER'] as const).map(
    (key) => ({
      key,
      label: key === ALL ? 'Tất cả vai trò' : CTV_ROLE_LABELS[key],
      count: baseFiltered.filter((c) => matchesIssue(c, issue) && (key === ALL || c.role === key)).length,
    }),
  );

  const issueBase = baseFiltered.filter((c) => role === ALL || c.role === role);
  const issueChips = [
    {
      key: 'MISSING_LEGAL' as const,
      label: 'Thiếu CCCD',
      count: issueBase.filter((c) => !hasLegalInfo(c)).length,
    },
    {
      key: 'NO_CONTRACT' as const,
      label: 'Chưa ký HĐ',
      count: issueBase.filter((c) => !c.contractStatus || c.contractStatus !== 'ACTIVE').length,
    },
    {
      key: 'ON_HOLD' as const,
      label: 'Tạm dừng',
      count: issueBase.filter((c) => c.status === 'ON_HOLD').length,
    },
  ];

  const moreFilterCount = Number(niche !== ALL) + Number(status !== ALL);
  const isFiltered =
    Boolean(search.trim()) ||
    role !== ALL ||
    issue !== '' ||
    pic !== ALL ||
    moreFilterCount > 0;

  const resetFilters = () => {
    setSearch('');
    setRole(ALL);
    setIssue('');
    setPic(ALL);
    setNiche(ALL);
    setStatus(ALL);
    setPage(1);
  };

  // Reset về page 1 khi bộ lọc thay đổi
  const filterKey = [search, role, issue, pic, niche, status, pageSize].join('|');
  const [pagedKey, setPagedKey] = useState(filterKey);
  if (filterKey !== pagedKey) {
    setPagedKey(filterKey);
    setPage(1);
  }

  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  /* ------------------------------------------------------- Thao tác cập nhật */

  const applyUpdate = (updated: Contributor, message: string) => {
    setLocalCtvs((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    onContributorUpdated?.(updated);
    onNotify?.(message, 'success');
  };

  const handleApplyOcr = (r: OcrLegalExtractionResult) => {
    if (!ocrTarget) return;
    const f = r.fields;
    applyUpdate(
      {
        ...ocrTarget,
        realName: f.fullName || ocrTarget.realName || ocrTarget.name,
        cccd: f.idNumber || ocrTarget.cccd,
        taxCode: f.taxCode || ocrTarget.taxCode,
        permanentAddress: f.permanentAddress || f.headquartersAddress || ocrTarget.permanentAddress,
        dob: f.dob || ocrTarget.dob,
        issueDate: f.issueDate || ocrTarget.issueDate,
        issuePlace: f.issuePlace || ocrTarget.issuePlace,
        isOcrVerified: true,
        ocrVerifiedAt: new Date().toISOString(),
      },
      `Đã cập nhật giấy tờ CCCD cho CTV ${ocrTarget.name}`,
    );
    setOcrTarget(null);
  };

  const handleCreateCtv = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.phone.trim()) {
      onNotify?.('Vui lòng nhập Họ tên và Số điện thoại CTV', 'warning');
      return;
    }
    const nextIdx = localCtvs.length + 1;
    const newCtv: Contributor = {
      id: `ctv-${Date.now()}`,
      code: createForm.code.trim() || `CTV-B2C-${String(nextIdx).padStart(3, '0')}`,
      name: createForm.name.trim(),
      realName: createForm.name.trim(),
      phone: createForm.phone.trim(),
      email: createForm.email.trim(),
      nicheSpecialty: createForm.niche
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      role: createForm.role,
      status: 'ACTIVE',
      contentPic: createForm.contentPic.trim() || 'Lê Phương Thảo',
      partnershipPic: 'Việt Hoàng',
      contractStatus: 'PENDING_SIGN',
      bankName: 'Techcombank',
      bankAccount: '',
      bankAccountName: createForm.name.trim().toUpperCase(),
      unitRateAllInOne: Number(createForm.rate) || 1500000,
      monthlyCapacityVideos: 12,
      shippingRecipientName: createForm.name.trim(),
      shippingPhone: createForm.phone.trim(),
      shippingAddress: createForm.shippingAddress.trim(),
      ratingScore: 5.0,
      firstPassRate: 100,
      onTimeRate: 100,
      assignedTaskCount: 0,
      completedTaskCount: 0,
      totalPaidAmount: 0,
      joinedDate: new Date().toISOString().split('T')[0],
    };

    setLocalCtvs((prev) => [newCtv, ...prev]);
    onContributorCreated?.(newCtv);
    setIsCreateOpen(false);
    setCreateForm({
      name: '',
      code: '',
      phone: '',
      email: '',
      role: 'ALL_IN_ONE',
      niche: 'Mẹ & Bé, Chăm sóc da',
      contentPic: 'Quỳnh Như',
      rate: 1500000,
      shippingAddress: '',
    });
    onNotify?.(`Đã thêm CTV / VJ ${newCtv.name} (${newCtv.code}) vào danh bạ`, 'success');
  };

  const handleConfirmDelete = () => {
    if (!deletingCtv) return;
    setLocalCtvs((prev) => prev.filter((c) => c.id !== deletingCtv.id));
    onContributorDeleted?.(deletingCtv.id);
    onNotify?.(`Đã xóa CTV [${deletingCtv.name}] khỏi danh mục gốc`, 'info');
    setDeletingCtv(null);
  };

  /* ------------------------------------------------------------- Điều hướng */

  const openProfile = (id: string) => {
    setOpenCtvId(id);
    requestAnimationFrame(() => rootRef.current?.scrollIntoView({ block: 'start' }));
  };

  const rowActions = (c: Contributor) => [
    { label: 'Mở hồ sơ chi tiết', icon: Edit3, onSelect: () => openProfile(c.id) },
    {
      label: hasLegalInfo(c) ? 'Đọc lại ảnh CCCD' : 'Đọc ảnh CCCD',
      icon: FileScan,
      onSelect: () => setOcrTarget(c),
    },
    { label: 'Mã QR thanh toán', icon: QrCode, onSelect: () => setQrTarget(c) },
    {
      label: 'Xóa CTV',
      icon: Trash2,
      onSelect: () => setDeletingCtv(c),
    },
  ];

  /* ------------------------------------------------------ Cấu hình cột Bảng */

  const columns: Column<Contributor>[] = [
    {
      key: 'ctv',
      header: 'Họ tên CTV / VJ',
      width: 180,
      render: (c) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar name={c.name} src={c.avatar} size={30} />
          <span className="truncate font-semibold text-ink text-xs">{c.name}</span>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Mã & Số điện thoại',
      width: 150,
      render: (c) => (
        <div className="leading-tight text-xs">
          <span className="block font-mono font-medium text-ink">
            {c.code || c.id.toUpperCase()}
          </span>
          <span className="block text-2xs text-ink-3 mt-0.5">
            {c.phone || '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Vai trò chính',
      width: 145,
      render: (c) => (
        <div className="leading-tight">
          <span className="block text-ink font-medium">{CTV_ROLE_LABELS[c.role]}</span>
          <span className="block text-2xs text-ink-3 whitespace-nowrap">
            {c.monthlyCapacityVideos || 12} video/tháng
          </span>
        </div>
      ),
    },
    {
      key: 'niche',
      header: 'Ngành hàng thế mạnh',
      width: 150,
      render: (c) => (
        <span className="block truncate text-ink text-xs">
          {c.nicheSpecialty.join(', ') || '—'}
        </span>
      ),
    },
    {
      key: 'pic',
      header: 'Chuyên viên PIC',
      width: 140,
      render: (c) => (
        <div className="grid gap-1 min-w-0">
          {c.contentPic ? (
            <Person name={c.contentPic} size={18} />
          ) : (
            <span className="text-2xs text-ink-3">Chưa có PIC</span>
          )}
          {c.partnershipPic && (
            <span className="text-2xs text-ink-3 truncate">HĐ: {c.partnershipPic}</span>
          )}
        </div>
      ),
    },
    {
      key: 'legal',
      header: 'Hồ sơ & Hợp đồng',
      width: 145,
      render: (c) => {
        const contract = CTV_CONTRACT_LABELS[c.contractStatus || 'NONE'];
        const toneClass =
          contract.tone === 'positive'
            ? 'text-positive font-medium'
            : contract.tone === 'warning'
              ? 'text-warning font-medium'
              : contract.tone === 'critical'
                ? 'text-critical font-medium'
                : 'text-ink-2';
        return (
          <div className="grid gap-1 justify-items-start">
            {!hasLegalInfo(c) ? (
              <span className="text-xs font-medium text-warning">Thiếu CCCD</span>
            ) : (
              <span className={`text-xs ${toneClass}`}>{contract.label}</span>
            )}
            <span className="text-2xs text-ink-3 font-code truncate max-w-[130px]">
              {c.contractCode || (c.cccd ? `CCCD: ***${c.cccd.slice(-4)}` : 'Chưa quét CCCD')}
            </span>
          </div>
        );
      },
    },
    {
      key: 'rate',
      header: 'Định mức / video',
      align: 'right',
      width: 130,
      render: (c) => {
        const mainRate =
          c.role === 'VIDEO_EDITOR'
            ? c.unitRateEditOnly || 500000
            : c.role === 'SCRIPTWRITER'
              ? c.unitRateScriptOnly || 350000
              : c.unitRateAllInOne || 1500000;
        return (
          <span className="font-semibold text-ink tabular-nums font-mono text-xs">
            {formatVndShort(mainRate)}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: 110,
      render: (c) => (
        <Status tone={c.status === 'ACTIVE' ? 'positive' : 'neutral'}>
          {c.status === 'ACTIVE' ? 'Đang hợp tác' : 'Tạm dừng'}
        </Status>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 48,
      render: (c) => <ActionMenu items={rowActions(c)} />,
    },
  ];

  /* ------------------------------------------------------------- Render */

  // Khi đang mở hồ sơ chi tiết in-place
  if (openCtvId) {
    const activeCtv = localCtvs.find((c) => c.id === openCtvId || c.code === openCtvId);
    if (activeCtv) {
      const navList = filtered.some((c) => c.id === activeCtv.id) ? filtered : localCtvs;
      const idx = navList.findIndex((c) => c.id === activeCtv.id);
      const prevCtv = idx > 0 ? navList[idx - 1] : undefined;
      const nextCtv = idx >= 0 && idx < navList.length - 1 ? navList[idx + 1] : undefined;

      return (
        <div ref={rootRef} className="space-y-6 scroll-mt-4">
          <CtvProfileDetail
            ctv={activeCtv}
            tasks={tasks}
            nav={{
              onBack: () => setOpenCtvId(null),
              onPrev: prevCtv ? () => openProfile(prevCtv.id) : undefined,
              onNext: nextCtv ? () => openProfile(nextCtv.id) : undefined,
              position: idx >= 0 ? idx + 1 : undefined,
              total: navList.length,
            }}
            onScanDocs={() => setOcrTarget(activeCtv)}
            onShowQr={() => setQrTarget(activeCtv)}
            onAssignTask={() => onNotify?.(`Mở giao việc cho CTV ${activeCtv.name}`, 'info')}
            onSave={(updated, msg) => applyUpdate(updated, msg)}
          />

          {ocrTarget && (
            <LegalOcrModal
              isOpen={true}
              onClose={() => setOcrTarget(null)}
              onApplyToContract={handleApplyOcr}
              initialPreset="CCCD_INDIVIDUAL"
            />
          )}

          {qrTarget && <CtvVietQrModal ctv={qrTarget} onClose={() => setQrTarget(null)} />}
        </div>
      );
    }
  }

  return (
    <div ref={rootRef} className="space-y-6 scroll-mt-4">
      <PageActions>
        <Button variant="primary" icon={Plus} onClick={() => setIsCreateOpen(true)}>
          Thêm CTV / VJ
        </Button>
      </PageActions>

      <Panel flush>
        <div className="p-4 border-b border-line grid gap-2.5">
          <FilterBar
            search={{
              value: search,
              onChange: setSearch,
              placeholder: 'Tên CTV, mã, SĐT, CCCD, chuyên viên PIC...',
            }}
            filters={
              <>
                <Select
                  value={role}
                  onChange={(e) => setRole(e.target.value as RoleFilter)}
                  aria-label="Vai trò"
                  className="w-auto"
                >
                  <option value={ALL}>Mọi vai trò</option>
                  <option value="ALL_IN_ONE">Quay dựng trọn gói</option>
                  <option value="CREATIVE_ACTOR">VJ / Diễn viên</option>
                  <option value="VIDEO_EDITOR">Dựng phim</option>
                  <option value="SCRIPTWRITER">Biên kịch</option>
                </Select>

                <Select
                  value={pic}
                  onChange={(e) => setPic(e.target.value)}
                  aria-label="PIC"
                  className="w-auto"
                >
                  <option value={ALL}>Chuyên viên PIC</option>
                  {picOptions.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </Select>

                <Button
                  variant={showMoreFilters || moreFilterCount > 0 ? 'secondary' : 'ghost'}
                  icon={SlidersHorizontal}
                  aria-expanded={showMoreFilters}
                  onClick={() => setShowMoreFilters((v) => !v)}
                >
                  Lọc khác{moreFilterCount > 0 ? ` (${moreFilterCount})` : ''}
                </Button>

                {isFiltered && (
                  <Button variant="ghost" onClick={resetFilters}>
                    Xóa bộ lọc
                  </Button>
                )}
              </>
            }
            resultCount={isFiltered ? filtered.length : undefined}
          />

          {showMoreFilters && (
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                aria-label="Ngành hàng thế mạnh"
                className="w-auto"
              >
                <option value={ALL}>Ngành hàng thế mạnh</option>
                {nicheOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </Select>

              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                aria-label="Trạng thái"
                className="w-auto"
              >
                <option value={ALL}>Mọi trạng thái</option>
                <option value="ACTIVE">Đang hợp tác</option>
                <option value="ON_HOLD">Tạm dừng</option>
              </Select>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <Chips label="Vai trò" items={roleChips} value={role} onChange={setRole} />
            <Chips<IssueFilter>
              label="Cần xử lý"
              items={issueChips}
              value={issue}
              onChange={(k) => setIssue((cur) => (cur === k ? '' : k))}
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(c) => c.id}
          onRowClick={(c) => openProfile(c.id)}
          stickyLast
          empty={
            <EmptyState
              title={localCtvs.length === 0 ? 'Chưa có CTV / VJ nào' : 'Không có CTV khớp bộ lọc'}
              description={
                localCtvs.length === 0
                  ? 'Thêm CTV / VJ đầu tiên để bắt đầu quản lý danh bạ và phân công video kênh Brand.'
                  : 'Bỏ bớt điều kiện lọc hoặc tìm bằng từ khóa khác.'
              }
              action={
                localCtvs.length === 0 ? (
                  <Button variant="primary" icon={Plus} onClick={() => setIsCreateOpen(true)}>
                    Thêm CTV / VJ
                  </Button>
                ) : (
                  <Button onClick={resetFilters}>Xóa bộ lọc</Button>
                )
              }
            />
          }
        />

        <Pagination
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </Panel>

      {/* Modal Đọc ảnh CCCD */}
      {ocrTarget && (
        <LegalOcrModal
          isOpen={true}
          onClose={() => setOcrTarget(null)}
          onApplyToContract={handleApplyOcr}
          initialPreset="CCCD_INDIVIDUAL"
        />
      )}

      {/* Modal Mã QR thanh toán */}
      {qrTarget && <CtvVietQrModal ctv={qrTarget} onClose={() => setQrTarget(null)} />}

      {/* Modal Thêm CTV / VJ mới */}
      <Modal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Thêm Cộng tác viên / VJ"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" form="create-ctv-master-form" variant="primary" icon={Plus}>
              Tạo CTV
            </Button>
          </>
        }
      >
        <form id="create-ctv-master-form" onSubmit={handleCreateCtv} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-ink font-semibold mb-1">
              Họ và tên CTV / VJ <span className="text-critical">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ví dụ: Nguyễn Hoàng Yến, Dược sĩ Lê Mai Anh..."
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:border-focus bg-surface font-medium text-ink text-sm"
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
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-line rounded-lg bg-surface text-ink focus:outline-none focus:border-focus"
              />
            </div>
            <div>
              <label className="block text-ink-2 font-medium mb-1">Mã CTV (Tùy chọn)</label>
              <input
                type="text"
                placeholder="Tự sinh nếu để trống"
                value={createForm.code}
                onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                className="w-full px-2.5 py-1.5 border border-line rounded-lg font-mono bg-surface text-ink focus:outline-none focus:border-focus"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-ink-2 font-medium mb-1">Vai trò chính</label>
              <select
                value={createForm.role}
                onChange={(e) =>
                  setCreateForm({ ...createForm, role: e.target.value as ContributorRole })
                }
                className="w-full px-2.5 py-1.5 border border-line rounded-lg bg-surface text-ink focus:outline-none focus:border-focus"
              >
                <option value="ALL_IN_ONE">Quay dựng trọn gói</option>
                <option value="CREATIVE_ACTOR">VJ / Diễn viên</option>
                <option value="VIDEO_EDITOR">Dựng phim</option>
                <option value="SCRIPTWRITER">Biên kịch</option>
              </select>
            </div>
            <div>
              <label className="block text-ink-2 font-medium mb-1">Chuyên viên PIC phụ trách</label>
              <input
                type="text"
                value={createForm.contentPic}
                onChange={(e) => setCreateForm({ ...createForm, contentPic: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-line rounded-lg bg-surface text-ink focus:outline-none focus:border-focus"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-ink-2 font-medium mb-1">Định mức thù lao / video (VNĐ)</label>
              <input
                type="number"
                step="50000"
                value={createForm.rate}
                onChange={(e) => setCreateForm({ ...createForm, rate: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 border border-line rounded-lg bg-surface text-ink focus:outline-none focus:border-focus"
              />
            </div>
            <div>
              <label className="block text-ink-2 font-medium mb-1">Email liên hệ</label>
              <input
                type="email"
                placeholder="ctv@gmail.com"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-line rounded-lg bg-surface text-ink focus:outline-none focus:border-focus"
              />
            </div>
          </div>

          <div>
            <label className="block text-ink-2 font-medium mb-1">Ngành hàng thế mạnh</label>
            <input
              type="text"
              value={createForm.niche}
              onChange={(e) => setCreateForm({ ...createForm, niche: e.target.value })}
              placeholder="VD: Mẹ & Bé, Dược mỹ phẩm, Thực phẩm chức năng"
              className="w-full px-2.5 py-1.5 border border-line rounded-lg bg-surface text-ink focus:outline-none focus:border-focus"
            />
          </div>

          <div>
            <label className="block text-ink-2 font-medium mb-1">Địa chỉ nhận hàng mẫu</label>
            <input
              type="text"
              value={createForm.shippingAddress}
              onChange={(e) => setCreateForm({ ...createForm, shippingAddress: e.target.value })}
              placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
              className="w-full px-2.5 py-1.5 border border-line rounded-lg bg-surface text-ink focus:outline-none focus:border-focus"
            />
          </div>
        </form>
      </Modal>

      {/* Dialog xác nhận xóa CTV */}
      <ConfirmDialog
        open={Boolean(deletingCtv)}
        onCancel={() => setDeletingCtv(null)}
        onConfirm={handleConfirmDelete}
        title="Xóa CTV khỏi Dữ liệu gốc"
        description={
          deletingCtv
            ? `Bạn có chắc chắn muốn xóa CTV "${deletingCtv.name}" khỏi danh mục gốc? Thao tác này không thể hoàn tác.`
            : ''
        }
        confirmLabel="Xóa CTV"
        tone="danger"
      />
    </div>
  );
};
