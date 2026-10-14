'use client';

/**
 * Màn hình Quản lý Danh bạ & Hồ sơ chuyên sâu Cộng tác viên / VJ (Self-Channel).
 * Tách biệt hoàn toàn với Dữ liệu gốc (Master Data chỉ lưu thông tin cơ bản):
 * - Chế độ Danh sách: Bộ lọc đa chiều, Chip vai trò & cảnh báo pháp lý/hợp đồng, bảng dữ liệu, phân trang.
 * - Chế độ Hồ sơ chi tiết (2 cột chuẩn như KocProfile / StoreProfile):
 *   + Cột trái: Pháp lý (CCCD, MST, Đọc ảnh giấy tờ), Hợp đồng Partnership, Thanh toán & Mã QR, Hậu cần gửi mẫu 48h & Sản phẩm cầm sẵn, Rate Card & Bối cảnh quay.
 *   + Cột phải: Lịch sử & Hiệu quả sản xuất video kênh Brand, Công việc đang chạy & Hàng mẫu, Cập nhật hồ sơ chuyên sâu.
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Edit3,
  ExternalLink,
  FileScan,
  FolderOpen,
  Package,
  Plus,
  QrCode,
  Star,
  Video,
} from 'lucide-react';
import type {
  Contributor,
  ContributorRole,
  OcrLegalExtractionResult,
  SelfChannelVideoTask,
  UserProfile,
} from '../../lib/types';
import { INITIAL_CONTRIBUTORS, INITIAL_SELF_CHANNEL_TASKS } from '../../lib/selfChannelData';
import { formatDate, formatVnd, formatVndShort } from '../../lib/format';
import { LegalOcrModal } from '../LegalOcrModal';
import {
  ActionMenu,
  Avatar,
  Button,
  Chips,
  DataTable,
  EmptyState,
  Field,
  FilterBar,
  Input,
  Modal,
  PageActions,
  Pagination,
  Panel,
  Person,
  SectionHeader,
  Select,
  Stat,
  StatRow,
  Status,
  Tabs,
  Textarea,
} from '../ui';
import type { Column, TabItem } from '../ui';

export const CTV_ROLE_LABELS: Record<ContributorRole, string> = {
  ALL_IN_ONE: 'Quay dựng trọn gói',
  CREATIVE_ACTOR: 'VJ / Diễn viên',
  VIDEO_EDITOR: 'Dựng phim',
  SCRIPTWRITER: 'Biên kịch',
};

export const CTV_CONTRACT_LABELS: Record<NonNullable<Contributor['contractStatus']>, { label: string; tone: 'positive' | 'warning' | 'critical' | 'neutral' }> = {
  ACTIVE: { label: 'Đã ký hợp đồng', tone: 'positive' },
  PENDING_SIGN: { label: 'Chờ ký hợp đồng', tone: 'warning' },
  EXPIRED: { label: 'Cần thanh lý / Gia hạn', tone: 'critical' },
  NONE: { label: 'Chưa có hợp đồng', tone: 'neutral' },
};

type RoleFilter = 'ALL' | ContributorRole;
type IssueFilter = '' | 'MISSING_LEGAL' | 'NO_CONTRACT' | 'HAS_STOCK';

export interface CtvManagementViewProps {
  contributors?: Contributor[];
  tasks?: SelfChannelVideoTask[];
  currentUser?: UserProfile | null;
  selectedCtvId?: string | null;
  onContributorCreated?: (ctv: Contributor) => void;
  onContributorUpdated?: (ctv: Contributor) => void;
  onOpenSelfChannelHub?: (ctv?: Contributor) => void;
  onNavigateBackToMaster?: () => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

const hasLegalInfo = (c: Contributor) => Boolean(c.cccd && c.cccd.trim().length >= 9);

export const CtvManagementView: React.FC<CtvManagementViewProps> = ({
  contributors: propContributors = INITIAL_CONTRIBUTORS,
  tasks = INITIAL_SELF_CHANNEL_TASKS,
  selectedCtvId: propSelectedCtvId,
  onContributorCreated,
  onContributorUpdated,
  onOpenSelfChannelHub,
  onNotify,
}) => {
  const [localCtvs, setLocalCtvs] = useState<Contributor[]>(propContributors);
  const [syncedCtvs, setSyncedCtvs] = useState(propContributors);
  if (propContributors !== syncedCtvs) {
    setSyncedCtvs(propContributors);
    setLocalCtvs(propContributors);
  }

  // Điều hướng mở hồ sơ chi tiết
  const [openCtvId, setOpenCtvId] = useState<string | null>(propSelectedCtvId || null);
  const [syncedSelectedId, setSyncedSelectedId] = useState(propSelectedCtvId);
  if (propSelectedCtvId !== syncedSelectedId) {
    setSyncedSelectedId(propSelectedCtvId);
    if (propSelectedCtvId) {
      setOpenCtvId(propSelectedCtvId);
    }
  }

  const rootRef = useRef<HTMLDivElement>(null);

  // Bộ lọc danh sách
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [issueFilter, setIssueFilter] = useState<IssueFilter>('');
  const [selectedNiche, setSelectedNiche] = useState('ALL');
  const [selectedPic, setSelectedPic] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Modal Đọc ảnh giấy tờ, Mã QR, Tạo mới
  const [ocrTarget, setOcrTarget] = useState<Contributor | null>(null);
  const [qrTarget, setQrTarget] = useState<Contributor | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form tạo mới CTV trên màn Danh bạ
  const [createForm, setCreateForm] = useState({
    name: '',
    code: '',
    phone: '',
    email: '',
    role: 'ALL_IN_ONE' as ContributorRole,
    niche: 'Mẹ & Bé, Chăm sóc da',
    contentPic: 'Quỳnh Như',
    channelLink: '',
    unitRateAllInOne: 1500000,
    monthlyCapacityVideos: 12,
    bankName: 'Techcombank',
    bankAccount: '',
    bankAccountName: '',
    shippingAddress: '',
  });

  const nicheOptions = useMemo(() => {
    const s = new Set<string>();
    localCtvs.forEach((c) => c.nicheSpecialty.forEach((n) => s.add(n.trim())));
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [localCtvs]);

  const picOptions = useMemo(() => {
    const s = new Set<string>();
    localCtvs.forEach((c) => {
      if (c.contentPic) s.add(c.contentPic.trim());
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [localCtvs]);

  // Lọc cơ sở (trừ chip)
  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return localCtvs.filter((c) => {
      if (q) {
        const hit =
          c.name.toLowerCase().includes(q) ||
          (c.code || '').toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          (c.cccd || '').toLowerCase().includes(q) ||
          c.nicheSpecialty.some((n) => n.toLowerCase().includes(q));
        if (!hit) return false;
      }
      if (selectedNiche !== 'ALL' && !c.nicheSpecialty.includes(selectedNiche)) return false;
      if (selectedPic !== 'ALL' && c.contentPic !== selectedPic) return false;
      return true;
    });
  }, [localCtvs, search, selectedNiche, selectedPic]);

  const matchesIssue = (c: Contributor, f: IssueFilter) => {
    if (!f) return true;
    if (f === 'MISSING_LEGAL') return !hasLegalInfo(c);
    if (f === 'NO_CONTRACT') return !c.contractStatus || c.contractStatus !== 'ACTIVE';
    if (f === 'HAS_STOCK') return Boolean(c.onHandProducts && c.onHandProducts.length > 0);
    return true;
  };

  const filtered = useMemo(
    () =>
      baseFiltered.filter(
        (c) => (roleFilter === 'ALL' || c.role === roleFilter) && matchesIssue(c, issueFilter),
      ),
    [baseFiltered, roleFilter, issueFilter],
  );

  const roleChips = (['ALL', 'ALL_IN_ONE', 'CREATIVE_ACTOR', 'VIDEO_EDITOR', 'SCRIPTWRITER'] as const).map((key) => ({
    key,
    label: key === 'ALL' ? 'Tất cả' : CTV_ROLE_LABELS[key],
    count: baseFiltered.filter((c) => matchesIssue(c, issueFilter) && (key === 'ALL' || c.role === key)).length,
  }));

  const issueBase = baseFiltered.filter((c) => roleFilter === 'ALL' || c.role === roleFilter);
  const issueChips = [
    {
      key: 'MISSING_LEGAL' as const,
      label: 'Thiếu giấy tờ',
      count: issueBase.filter((c) => !hasLegalInfo(c)).length,
    },
    {
      key: 'NO_CONTRACT' as const,
      label: 'Chưa ký hợp đồng',
      count: issueBase.filter((c) => !c.contractStatus || c.contractStatus !== 'ACTIVE').length,
    },
    {
      key: 'HAS_STOCK' as const,
      label: 'Sẵn hàng mẫu tại nhà',
      count: issueBase.filter((c) => c.onHandProducts && c.onHandProducts.length > 0).length,
    },
  ];

  const isFiltered =
    Boolean(search.trim()) ||
    roleFilter !== 'ALL' ||
    issueFilter !== '' ||
    selectedNiche !== 'ALL' ||
    selectedPic !== 'ALL';

  const resetFilters = () => {
    setSearch('');
    setRoleFilter('ALL');
    setIssueFilter('');
    setSelectedNiche('ALL');
    setSelectedPic('ALL');
    setPage(1);
  };

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
      `Đã cập nhật thông tin CCCD cho CTV ${ocrTarget.name}`,
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
      channelLink: createForm.channelLink.trim(),
      nicheSpecialty: createForm.niche
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      role: createForm.role,
      status: 'ACTIVE',
      contentPic: createForm.contentPic,
      partnershipPic: 'Việt Hoàng',
      contractStatus: 'PENDING_SIGN',
      bankName: createForm.bankName,
      bankAccount: createForm.bankAccount.trim(),
      bankAccountName: createForm.bankAccountName.trim().toUpperCase() || createForm.name.trim().toUpperCase(),
      unitRateAllInOne: Number(createForm.unitRateAllInOne) || 1500000,
      monthlyCapacityVideos: Number(createForm.monthlyCapacityVideos) || 12,
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
    onNotify?.(`Đã thêm CTV ${newCtv.name} (${newCtv.code})`, 'success');
  };

  const openProfile = (id: string) => {
    setOpenCtvId(id);
    requestAnimationFrame(() => rootRef.current?.scrollIntoView({ block: 'start' }));
  };

  // Nếu đang mở hồ sơ chi tiết 1 CTV
  if (openCtvId) {
    const activeCtv = localCtvs.find((c) => c.id === openCtvId || c.code === openCtvId);
    if (activeCtv) {
      const idx = filtered.findIndex((c) => c.id === activeCtv.id);
      const prevCtv = idx > 0 ? filtered[idx - 1] : undefined;
      const nextCtv = idx >= 0 && idx < filtered.length - 1 ? filtered[idx + 1] : undefined;

      return (
        <div ref={rootRef}>
          <CtvProfileDetail
            ctv={activeCtv}
            tasks={tasks}
            nav={{
              onBack: () => setOpenCtvId(null),
              onPrev: prevCtv ? () => openProfile(prevCtv.id) : undefined,
              onNext: nextCtv ? () => openProfile(nextCtv.id) : undefined,
              position: idx >= 0 ? idx + 1 : undefined,
              total: filtered.length,
            }}
            onScanDocs={() => setOcrTarget(activeCtv)}
            onShowQr={() => setQrTarget(activeCtv)}
            onAssignTask={() => onOpenSelfChannelHub?.(activeCtv)}
            onSave={(updated, msg) => applyUpdate(updated, msg)}
          />

          {ocrTarget && (
            <LegalOcrModal
              isOpen={true}
              onClose={() => setOcrTarget(null)}
              onApplyToContract={handleApplyOcr}
            />
          )}

          {qrTarget && <CtvVietQrModal ctv={qrTarget} onClose={() => setQrTarget(null)} />}
        </div>
      );
    }
  }

  // Bảng Danh bạ CTV / VJ
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const columns: Column<Contributor>[] = [
    {
      key: 'ctv',
      header: 'CTV / VJ',
      width: 230,
      render: (c) => (
        <div className="flex items-center gap-2.5 min-w-0 max-w-[260px]">
          <Avatar name={c.name} src={c.avatar} size={34} />
          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-medium text-ink">{c.name}</span>
              <span className="text-2xs font-mono px-1.5 py-0.5 rounded bg-sunken text-ink-3">
                {c.code || c.id.toUpperCase()}
              </span>
            </div>
            <span className="block truncate text-2xs text-ink-3 mt-0.5">
              {c.phone}
              {c.contentPic ? ` · PIC: ${c.contentPic}` : ''}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Vai trò & Thế mạnh',
      width: 190,
      render: (c) => (
        <div className="leading-tight">
          <span className="block text-ink font-medium">{CTV_ROLE_LABELS[c.role]}</span>
          <span className="block text-2xs text-ink-3 truncate max-w-[200px]">
            {c.nicheSpecialty.join(' · ')}
          </span>
        </div>
      ),
    },
    {
      key: 'rate',
      header: 'Định mức & Công suất',
      width: 150,
      align: 'right',
      render: (c) => {
        const mainRate =
          c.role === 'VIDEO_EDITOR'
            ? c.unitRateEditOnly || 500000
            : c.role === 'SCRIPTWRITER'
              ? c.unitRateScriptOnly || 350000
              : c.unitRateAllInOne || 1500000;
        return (
          <div className="leading-tight tabular-nums">
            <span className="block font-medium text-ink">{formatVndShort(mainRate)} / video</span>
            <span className="block text-2xs text-ink-3">
              Đang nhận {c.assignedTaskCount - c.completedTaskCount}/{c.monthlyCapacityVideos || 12} job
            </span>
          </div>
        );
      },
    },
    {
      key: 'legal',
      header: 'Pháp lý & Hợp đồng',
      width: 170,
      render: (c) => {
        const contractInfo = CTV_CONTRACT_LABELS[c.contractStatus || 'NONE'];
        return (
          <div className="grid gap-1 justify-items-start leading-tight">
            {hasLegalInfo(c) ? (
              <Status tone={contractInfo.tone}>{contractInfo.label}</Status>
            ) : (
              <Status tone="warning">Thiếu CCCD</Status>
            )}
            <span className="text-2xs text-ink-3 font-mono truncate max-w-[160px]">
              {c.contractCode || (c.cccd ? `CCCD: ***${c.cccd.slice(-4)}` : 'Cần đọc ảnh CCCD')}
            </span>
          </div>
        );
      },
    },
    {
      key: 'logistics',
      header: 'Hàng mẫu & Bối cảnh',
      width: 180,
      render: (c) => (
        <div className="leading-tight">
          {c.onHandProducts && c.onHandProducts.length > 0 ? (
            <span className="block text-xs font-medium text-positive">
              Sẵn {c.onHandProducts.length} SKU tại nhà
            </span>
          ) : (
            <span className="block text-xs text-ink-2">Cần gửi mẫu (SLA 48h)</span>
          )}
          <span className="block text-2xs text-ink-3 truncate max-w-[180px]">
            {c.shippingAddress || 'Chưa cập nhật địa chỉ nhận mẫu'}
          </span>
        </div>
      ),
    },
    {
      key: 'performance',
      header: 'Hiệu suất & Thù lao',
      width: 155,
      align: 'right',
      render: (c) => (
        <div className="leading-tight tabular-nums">
          <span className="block font-medium text-ink">
            {c.completedTaskCount} video · ★ {c.ratingScore.toFixed(1)}
          </span>
          <span className="block text-2xs text-ink-3">
            Đã chi: {formatVndShort(c.totalPaidAmount)}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: 44,
      align: 'right',
      render: (c) => (
        <ActionMenu
          label={`Thao tác với ${c.name}`}
          items={[
            { label: 'Mở hồ sơ chi tiết', icon: Edit3, onSelect: () => openProfile(c.id) },
            { label: 'Giao việc video kênh', icon: Video, onSelect: () => onOpenSelfChannelHub?.(c) },
            {
              label: hasLegalInfo(c) ? 'Đọc lại ảnh CCCD' : 'Đọc ảnh CCCD',
              icon: FileScan,
              onSelect: () => setOcrTarget(c),
            },
            { label: 'Mã QR thanh toán', icon: QrCode, onSelect: () => setQrTarget(c) },
          ]}
        />
      ),
    },
  ];

  return (
    <div ref={rootRef} className="space-y-4">
      <PageActions>
        {onOpenSelfChannelHub && (
          <Button variant="secondary" icon={Video} onClick={() => onOpenSelfChannelHub()}>
            Sản xuất video kênh
          </Button>
        )}
        <Button variant="primary" icon={Plus} onClick={() => setIsCreateOpen(true)}>
          Thêm CTV
        </Button>
      </PageActions>

      <Panel flush>
        <div className="p-4 border-b border-line space-y-2.5">
          <FilterBar
            search={{
              value: search,
              onChange: setSearch,
              placeholder: 'Tìm tên CTV/VJ, mã CTV, SĐT, CCCD, thế mạnh…',
            }}
            chips={
              <>
                <Chips items={roleChips} value={roleFilter} onChange={setRoleFilter} />
                <span className="h-4 w-px bg-line hidden sm:inline-block" aria-hidden="true" />
                <Chips
                  items={issueChips}
                  value={issueFilter}
                  onChange={(k) => setIssueFilter(issueFilter === k ? '' : k)}
                />
              </>
            }
            filters={
              <>
                <Select
                  value={selectedNiche}
                  onChange={(e) => setSelectedNiche(e.target.value)}
                  aria-label="Ngành hàng thế mạnh"
                >
                  <option value="ALL">Ngành hàng: Tất cả ({nicheOptions.length})</option>
                  {nicheOptions.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </Select>
                <Select
                  value={selectedPic}
                  onChange={(e) => setSelectedPic(e.target.value)}
                  aria-label="Content PIC"
                >
                  <option value="ALL">PIC: Tất cả</option>
                  {picOptions.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </Select>
                {isFiltered && (
                  <Button variant="secondary" size="sm" onClick={resetFilters}>
                    Đặt lại
                  </Button>
                )}
              </>
            }
            resultCount={isFiltered ? filtered.length : undefined}
          />
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(c) => c.id}
          onRowClick={(c) => openProfile(c.id)}
          empty={
            <EmptyState
              title="Không có CTV / VJ khớp bộ lọc"
              description="Thử đặt lại bộ lọc hoặc thêm Cộng tác viên mới."
              action={
                isFiltered ? (
                  <Button variant="secondary" onClick={resetFilters}>
                    Xóa bộ lọc
                  </Button>
                ) : undefined
              }
            />
          }
        />

        <Pagination
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
        />
      </Panel>

      {/* Modal Đọc ảnh CCCD */}
      {ocrTarget && (
        <LegalOcrModal
          isOpen={true}
          onClose={() => setOcrTarget(null)}
          onApplyToContract={handleApplyOcr}
        />
      )}

      {/* Modal Mã QR */}
      {qrTarget && <CtvVietQrModal ctv={qrTarget} onClose={() => setQrTarget(null)} />}

      {/* Modal Thêm mới CTV */}
      <Modal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Thêm Cộng tác viên / VJ mới"
        description="Khai báo hồ sơ CTV sản xuất video kênh Brand. Có thể đọc ảnh CCCD sau khi tạo."
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" form="create-ctv-full-form" variant="primary" icon={Plus}>
              Lưu hồ sơ CTV
            </Button>
          </>
        }
      >
        <form id="create-ctv-full-form" onSubmit={handleCreateCtv} className="grid gap-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Họ và tên CTV / VJ">
              <Input
                required
                value={createForm.name}
                onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="VD: Nguyễn Hoàng Yến"
              />
            </Field>
            <Field label="Số điện thoại">
              <Input
                required
                value={createForm.phone}
                onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="VD: 0981 234 567"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Vai trò chuyên môn">
              <Select
                value={createForm.role}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, role: e.target.value as ContributorRole }))
                }
              >
                <option value="ALL_IN_ONE">Quay dựng trọn gói (All-in-one)</option>
                <option value="CREATIVE_ACTOR">VJ / Diễn viên</option>
                <option value="VIDEO_EDITOR">Dựng phim (Video Editor)</option>
                <option value="SCRIPTWRITER">Biên kịch</option>
              </Select>
            </Field>
            <Field label="Nhân sự Content phụ trách (PIC)">
              <Input
                value={createForm.contentPic}
                onChange={(e) => setCreateForm((p) => ({ ...p, contentPic: e.target.value }))}
                placeholder="VD: Lê Phương Thảo"
              />
            </Field>
          </div>

          <Field label="Ngành hàng thế mạnh (cách nhau bằng dấu phẩy)">
            <Input
              value={createForm.niche}
              onChange={(e) => setCreateForm((p) => ({ ...p, niche: e.target.value }))}
              placeholder="VD: Mẹ & Bé, Dược mỹ phẩm, Gia đình"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Đơn giá tham chiếu (VNĐ/video)">
              <Input
                type="number"
                value={createForm.unitRateAllInOne}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, unitRateAllInOne: Number(e.target.value) }))
                }
              />
            </Field>
            <Field label="Công suất tối đa (video/tháng)">
              <Input
                type="number"
                value={createForm.monthlyCapacityVideos}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, monthlyCapacityVideos: Number(e.target.value) }))
                }
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Ngân hàng nhận thù lao">
              <Input
                value={createForm.bankName}
                onChange={(e) => setCreateForm((p) => ({ ...p, bankName: e.target.value }))}
                placeholder="VD: Techcombank, Vietcombank..."
              />
            </Field>
            <Field label="Số tài khoản">
              <Input
                value={createForm.bankAccount}
                onChange={(e) => setCreateForm((p) => ({ ...p, bankAccount: e.target.value }))}
                placeholder="Nhập số tài khoản"
              />
            </Field>
          </div>

          <Field label="Địa chỉ nhận hàng mẫu (phục vụ gửi hàng 48h)">
            <Input
              value={createForm.shippingAddress}
              onChange={(e) => setCreateForm((p) => ({ ...p, shippingAddress: e.target.value }))}
              placeholder="Số nhà, tòa nhà, phường/xã, quận/huyện, tỉnh/thành..."
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
};

/* ========================================================================== */
/* TRANG HỒ SƠ CHI TIẾT CTV / VJ (2 CỘT CHUẨN NHƯ KOC PROFILE & STORE PROFILE) */
/* ========================================================================== */

type CtvDetailTab = 'HISTORY' | 'SETTLEMENT_HISTORY' | 'SAMPLES_AND_JOBS' | 'EDIT_PROFILE';

function CtvProfileDetail({
  ctv,
  tasks,
  nav,
  onScanDocs,
  onShowQr,
  onAssignTask,
  onSave,
}: {
  ctv: Contributor;
  tasks: SelfChannelVideoTask[];
  nav: {
    onBack: () => void;
    onPrev?: () => void;
    onNext?: () => void;
    position?: number;
    total?: number;
  };
  onScanDocs: () => void;
  onShowQr: () => void;
  onAssignTask: () => void;
  onSave: (updated: Contributor, message: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<CtvDetailTab>('HISTORY');
  const [newSkuInput, setNewSkuInput] = useState('');
  const [selectedTaskIdForLog, setSelectedTaskIdForLog] = useState<string | null>(null);

  // State form chỉnh sửa chuyên sâu
  const [editForm, setEditForm] = useState({
    name: ctv.name,
    realName: ctv.realName || ctv.name,
    phone: ctv.phone,
    email: ctv.email || '',
    role: ctv.role,
    contentPic: ctv.contentPic || '',
    partnershipPic: ctv.partnershipPic || 'Việt Hoàng',
    channelLink: ctv.channelLink || '',
    driveFolderUrl: ctv.driveFolderUrl || '',
    niche: ctv.nicheSpecialty.join(', '),
    cccd: ctv.cccd || '',
    taxCode: ctv.taxCode || '',
    issueDate: ctv.issueDate || '',
    issuePlace: ctv.issuePlace || '',
    permanentAddress: ctv.permanentAddress || '',
    contractCode: ctv.contractCode || '',
    contractStatus: ctv.contractStatus || 'PENDING_SIGN',
    contractExpiryDate: ctv.contractExpiryDate || '',
    bankName: ctv.bankName,
    bankAccount: ctv.bankAccount,
    bankAccountName: ctv.bankAccountName,
    unitRateAllInOne: ctv.unitRateAllInOne || 1500000,
    unitRateShootingOnly: ctv.unitRateShootingOnly || 900000,
    unitRateEditOnly: ctv.unitRateEditOnly || 500000,
    unitRateScriptOnly: ctv.unitRateScriptOnly || 300000,
    monthlyCapacityVideos: ctv.monthlyCapacityVideos || 12,
    shippingRecipientName: ctv.shippingRecipientName || ctv.name,
    shippingPhone: ctv.shippingPhone || ctv.phone,
    shippingAddress: ctv.shippingAddress || '',
    shippingNotes: ctv.shippingNotes || '',
    studioBackdrops: (ctv.studioBackdrops || []).join(', '),
    personalTraits: ctv.personalTraits || '',
    notes: ctv.notes || '',
  });

  const ctvTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.contributorId === ctv.id ||
          (t.contributorName &&
            t.contributorName.toLowerCase().includes(ctv.name.split('(')[0].trim().toLowerCase())),
      ),
    [tasks, ctv],
  );

  const runningTasks = useMemo(
    () => ctvTasks.filter((t) => t.status !== 'ACCEPTED_COMPLETED' && t.status !== 'PAID'),
    [ctvTasks],
  );

  // Thống kê lịch sử hợp tác theo từng Nhãn hàng
  const brandHistoryStats = useMemo(() => {
    const map = new Map<
      string,
      {
        brandName: string;
        totalTasks: number;
        completedTasks: number;
        firstPassCount: number;
        totalRemuneration: number;
        formats: string[];
      }
    >();
    ctvTasks.forEach((t) => {
      const cur = map.get(t.brandName) || {
        brandName: t.brandName,
        totalTasks: 0,
        completedTasks: 0,
        firstPassCount: 0,
        totalRemuneration: 0,
        formats: [],
      };
      cur.totalTasks += 1;
      if (t.status === 'ACCEPTED_COMPLETED' || t.status === 'PAID') {
        cur.completedTasks += 1;
      }
      const hasRevision = (t.feedbackLogs || []).some((f) => f.verdict === 'REVISE');
      if (!hasRevision && (t.videoDeliverables?.currentVersion || 1) <= 1) {
        cur.firstPassCount += 1;
      }
      cur.totalRemuneration += t.remuneration || 0;
      if (t.videoFormat && !cur.formats.includes(t.videoFormat)) {
        cur.formats.push(t.videoFormat);
      }
      map.set(t.brandName, cur);
    });
    return Array.from(map.values());
  }, [ctvTasks]);

  // Tổng hợp lịch sử các đợt quyết toán DNTT & Thuế TNCN 10% của CTV
  const settlementBatches = useMemo(() => {
    const batches: Array<{
      id: string;
      dnttCode: string;
      period: string;
      videoCount: number;
      taskCodes: string[];
      grossAmount: number;
      pitTaxAmount: number;
      netAmount: number;
      paymentRef: string;
      disbursedAt: string;
      status: 'DISBURSED' | 'PENDING_DNTT';
    }> = [];

    // 1. Các video chờ lập DNTT hiện tại (ACCEPTED_COMPLETED)
    const pendingTasks = ctvTasks.filter((t) => t.status === 'ACCEPTED_COMPLETED');
    if (pendingTasks.length > 0) {
      const gross = pendingTasks.reduce((s, t) => s + t.remuneration, 0);
      const tax = gross >= 2000000 ? Math.round(gross * 0.1) : 0;
      batches.push({
        id: 'batch-pending-current',
        dnttCode: 'Chờ lập phiếu DNTT',
        period: 'Tháng 10/2026 (Đợt 2)',
        videoCount: pendingTasks.length,
        taskCodes: pendingTasks.map((t) => t.taskCode),
        grossAmount: gross,
        pitTaxAmount: tax,
        netAmount: gross - tax,
        paymentRef: 'Chờ Kế toán giải ngân',
        disbursedAt: '—',
        status: 'PENDING_DNTT',
      });
    }

    // 2. Các video đã PAID trong danh sách task hiện tại
    const paidTasks = ctvTasks.filter((t) => t.status === 'PAID');
    if (paidTasks.length > 0) {
      const gross = paidTasks.reduce((s, t) => s + t.remuneration, 0);
      const tax = paidTasks.reduce(
        (s, t) => s + (t.pitTaxDeducted ?? (gross >= 2000000 ? Math.round(t.remuneration * 0.1) : 0)),
        0,
      );
      batches.push({
        id: 'batch-paid-oct1',
        dnttCode: paidTasks[0].dnttCode || 'DNTT-CTV-202610-001',
        period: 'Tháng 10/2026 (Đợt 1)',
        videoCount: paidTasks.length,
        taskCodes: paidTasks.map((t) => t.taskCode),
        grossAmount: gross,
        pitTaxAmount: tax,
        netAmount: gross - tax,
        paymentRef: paidTasks[0].paymentRef || 'UNC-TCB-982134',
        disbursedAt: paidTasks[0].paidAt || '2026-10-05',
        status: 'DISBURSED',
      });
    }

    // 3. Lịch sử các đợt quyết toán kỳ trước (T8 & T9/2026) tạo thành lũy kế totalPaidAmount của CTV
    const currentPaidGross = paidTasks.reduce((s, t) => s + t.remuneration, 0);
    const historicalGross = Math.max(0, (ctv.totalPaidAmount || 0) - currentPaidGross);
    const historicalVideos = Math.max(0, (ctv.completedTaskCount || 0) - paidTasks.length - pendingTasks.length);
    if (historicalGross > 0 && historicalVideos > 0) {
      const sepVideos = Math.ceil(historicalVideos * 0.6);
      const augVideos = Math.max(1, historicalVideos - sepVideos);
      const sepGross = Math.round((historicalGross * 0.6) / 100000) * 100000;
      const augGross = Math.max(0, historicalGross - sepGross);

      if (sepGross > 0) {
        const sepTax = sepGross >= 2000000 ? Math.round(sepGross * 0.1) : 0;
        batches.push({
          id: 'batch-hist-sep',
          dnttCode: `DNTT-CTV-202609-0${ctv.id.replace('ctv-', '')}`,
          period: 'Tháng 09/2026 (Quyết toán tháng)',
          videoCount: sepVideos,
          taskCodes: [`${ sepVideos } video nghiệm thu T09/2026`],
          grossAmount: sepGross,
          pitTaxAmount: sepTax,
          netAmount: sepGross - sepTax,
          paymentRef: `UNC-202609-${1040 + Number(ctv.id.replace(/\D/g, '') || 1)}`,
          disbursedAt: '2026-09-28',
          status: 'DISBURSED',
        });
      }
      if (augGross > 0) {
        const augTax = augGross >= 2000000 ? Math.round(augGross * 0.1) : 0;
        batches.push({
          id: 'batch-hist-aug',
          dnttCode: `DNTT-CTV-202608-0${ctv.id.replace('ctv-', '')}`,
          period: 'Tháng 08/2026 (Quyết toán tháng)',
          videoCount: augVideos,
          taskCodes: [`${ augVideos } video nghiệm thu T08/2026`],
          grossAmount: augGross,
          pitTaxAmount: augTax,
          netAmount: augGross - augTax,
          paymentRef: `UNC-202608-${1010 + Number(ctv.id.replace(/\D/g, '') || 1)}`,
          disbursedAt: '2026-08-29',
          status: 'DISBURSED',
        });
      }
    }

    return batches;
  }, [ctvTasks, ctv]);

  // Lịch sử giao nhận & đối soát hàng mẫu của CTV
  const sampleShippingHistory = useMemo(() => {
    const records: Array<{
      id: string;
      trackingCode: string;
      sku: string;
      productName: string;
      brandName: string;
      taskCode: string;
      shippedAt: string;
      shippingStatus: string;
      reconciliationNote: string;
    }> = [];

    ctvTasks.forEach((t) => {
      if (t.linkedSku) {
        records.push({
          id: `ship-${t.id}`,
          trackingCode:
            t.sampleTrackingCode ||
            (t.sampleShippingStatus === 'ON_HAND_AT_HOME' ? 'SẴN TẠI NHÀ CTV' : 'Chờ cấp mã vận đơn'),
          sku: t.linkedSku,
          productName: t.productName || t.linkedSku,
          brandName: t.brandName,
          taskCode: t.taskCode,
          shippedAt: t.sampleShippedAt || t.sampleDeliveredAt || t.createdAt,
          shippingStatus:
            t.sampleShippingStatus === 'ON_HAND_AT_HOME'
              ? 'Dùng mẫu sẵn tại nhà'
              : t.sampleShippingStatus === 'DELIVERED'
                ? 'Đã giao thành công'
                : t.sampleShippingStatus === 'SHIPPING'
                  ? 'Đang vận chuyển (SLA 48h)'
                  : 'Chờ kho xuất mẫu',
          reconciliationNote:
            t.status === 'ACCEPTED_COMPLETED' || t.status === 'PAID'
              ? 'Đã quay nghiệm thu · Lưu mẫu tại nhà cho đợt sau'
              : 'Đang phục vụ quay video kỳ này',
        });
      }
    });

    // Bổ sung các SKU đang cầm sẵn tại nhà nhưng chưa gắn vào task tháng 10
    (ctv.onHandProducts || []).forEach((sku, idx) => {
      const alreadyListed = records.some((r) => r.sku === sku);
      if (!alreadyListed) {
        records.push({
          id: `onhand-${sku}-${idx}`,
          trackingCode: `GHN-88190${idx + 1}`,
          sku,
          productName: `Sản phẩm mẫu lưu kho tại nhà (${sku})`,
          brandName: sku.startsWith('KUTIE')
            ? 'Kutieskin Mama & Baby'
            : sku.startsWith('SEN')
              ? 'Senka Skincare Nhật Bản'
              : sku.startsWith('PH')
                ? 'pHCare Chăm Sóc Vệ Sinh Nữ'
                : 'Nhãn hàng B2C',
          taskCode: 'Tồn mẫu từ kỳ trước',
          shippedAt: ctv.joinedDate || '2026-09-10',
          shippingStatus: 'Đang giữ tại nhà CTV',
          reconciliationNote: 'Sẵn sàng nhận đơn gấp < 5 ngày không cần chờ ship',
        });
      }
    });

    return records;
  }, [ctvTasks, ctv]);

  const selectedTaskForLog = useMemo(
    () => ctvTasks.find((t) => t.id === selectedTaskIdForLog) || ctvTasks[0] || null,
    [ctvTasks, selectedTaskIdForLog],
  );

  const missingLegal = !hasLegalInfo(ctv);
  const contractMeta = CTV_CONTRACT_LABELS[ctv.contractStatus || 'NONE'];

  const tabItems: TabItem<CtvDetailTab>[] = [
    { key: 'HISTORY', label: 'Lịch sử sản xuất & Nhật ký sửa bài', count: ctvTasks.length },
    { key: 'SETTLEMENT_HISTORY', label: 'Lịch sử DNTT & Hợp đồng', count: settlementBatches.length },
    {
      key: 'SAMPLES_AND_JOBS',
      label: 'Hàng mẫu & Lịch sử vận đơn',
      count: sampleShippingHistory.length || undefined,
    },
    { key: 'EDIT_PROFILE', label: 'Cập nhật hồ sơ chuyên sâu' },
  ];

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: Contributor = {
      ...ctv,
      name: editForm.name.trim(),
      realName: editForm.realName.trim(),
      phone: editForm.phone.trim(),
      email: editForm.email.trim(),
      role: editForm.role,
      contentPic: editForm.contentPic.trim(),
      partnershipPic: editForm.partnershipPic.trim(),
      channelLink: editForm.channelLink.trim(),
      driveFolderUrl: editForm.driveFolderUrl.trim(),
      nicheSpecialty: editForm.niche
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      cccd: editForm.cccd.trim(),
      taxCode: editForm.taxCode.trim(),
      issueDate: editForm.issueDate.trim(),
      issuePlace: editForm.issuePlace.trim(),
      permanentAddress: editForm.permanentAddress.trim(),
      contractCode: editForm.contractCode.trim(),
      contractStatus: editForm.contractStatus,
      contractExpiryDate: editForm.contractExpiryDate.trim(),
      bankName: editForm.bankName.trim(),
      bankAccount: editForm.bankAccount.trim(),
      bankAccountName: editForm.bankAccountName.trim().toUpperCase(),
      unitRateAllInOne: Number(editForm.unitRateAllInOne) || 0,
      unitRateShootingOnly: Number(editForm.unitRateShootingOnly) || 0,
      unitRateEditOnly: Number(editForm.unitRateEditOnly) || 0,
      unitRateScriptOnly: Number(editForm.unitRateScriptOnly) || 0,
      monthlyCapacityVideos: Number(editForm.monthlyCapacityVideos) || 12,
      shippingRecipientName: editForm.shippingRecipientName.trim(),
      shippingPhone: editForm.shippingPhone.trim(),
      shippingAddress: editForm.shippingAddress.trim(),
      shippingNotes: editForm.shippingNotes.trim(),
      studioBackdrops: editForm.studioBackdrops
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      personalTraits: editForm.personalTraits.trim(),
      notes: editForm.notes.trim(),
    };
    onSave(updated, `Đã lưu hồ sơ chuyên sâu của CTV ${updated.name}`);
  };

  const handleAddOnHandSku = (e: React.FormEvent) => {
    e.preventDefault();
    const sku = newSkuInput.trim().toUpperCase();
    if (!sku) return;
    const current = ctv.onHandProducts || [];
    if (current.includes(sku)) {
      setNewSkuInput('');
      return;
    }
    onSave(
      { ...ctv, onHandProducts: [...current, sku] },
      `Đã ghi nhận CTV ${ctv.name} đang giữ sẵn sản phẩm ${sku}`,
    );
    setNewSkuInput('');
  };

  const handleRemoveOnHandSku = (sku: string) => {
    const current = ctv.onHandProducts || [];
    onSave(
      { ...ctv, onHandProducts: current.filter((item) => item !== sku) },
      `Đã gỡ mã sản phẩm ${sku} khỏi danh sách cầm sẵn`,
    );
  };

  const taskColumns: Column<SelfChannelVideoTask>[] = [
    {
      key: 'code',
      header: 'Mã & Tiêu đề video',
      width: 230,
      render: (t) => (
        <div className="leading-tight max-w-[250px]">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-2xs text-ink-3">{t.taskCode}</span>
            {t.videoFormat && (
              <span className="px-1.5 py-0 rounded bg-sunken text-ink-2 text-[10px] font-medium">
                {t.videoFormat}
              </span>
            )}
          </div>
          <span className="font-medium text-ink block truncate mt-0.5">{t.title}</span>
          <span className="text-2xs text-ink-3 block">
            {t.brandName} · SKU: {t.linkedSku}
          </span>
        </div>
      ),
    },
    {
      key: 'pillar',
      header: 'PIC & Trụ cột',
      width: 150,
      render: (t) => (
        <div className="leading-tight">
          <span className="text-ink font-medium block truncate max-w-[150px]">{t.pillarName}</span>
          <span className="text-2xs text-ink-3 block">
            Content: {t.contentPic || ctv.contentPic || 'Quỳnh Như'}
          </span>
        </div>
      ),
    },
    {
      key: 'deliverable',
      header: 'Bản nộp & Vòng sửa',
      width: 155,
      render: (t) => {
        const revCount = (t.feedbackLogs || []).filter((f) => f.verdict === 'REVISE').length;
        return (
          <div className="leading-tight">
            {t.videoDeliverables?.finalVideoUrl || t.videoDeliverables?.draftVideoUrl ? (
              <a
                href={t.videoDeliverables.finalVideoUrl || t.videoDeliverables.draftVideoUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-accent hover:underline inline-flex items-center gap-1 text-xs font-medium"
              >
                <span>Video v{t.videoDeliverables.currentVersion || 1}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <span className="text-ink-2 text-xs">
                {t.scriptContent ? 'Đã có kịch bản' : 'Đang viết kịch bản'}
              </span>
            )}
            <span className="block text-2xs text-ink-3">
              {revCount > 0 ? `Đã sửa ${revCount} lần` : 'Đạt ngay vòng 1'} · {(t.feedbackLogs || []).length} nhận xét
            </span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: 140,
      render: (t) => {
        if (t.status === 'PAID') return <Status tone="positive">Đã quyết toán</Status>;
        if (t.status === 'ACCEPTED_COMPLETED') return <Status tone="positive">Đã nghiệm thu</Status>;
        if (t.status === 'INTERNAL_QA_PASSED') return <Status tone="info">Chờ Brand nghiệm thu</Status>;
        if (t.status === 'DRAFT_VIDEO_SUBMITTED') return <Status tone="info">Chờ QA nội bộ</Status>;
        if (t.status === 'SCRIPT_PENDING_REVIEW') return <Status tone="warning">Chờ duyệt kịch bản</Status>;
        if (t.status === 'BRAND_ORIENTATION_PENDING') return <Status tone="warning">Chờ Brand duyệt VJ</Status>;
        return <Status tone="info">Đang quay dựng</Status>;
      },
    },
    {
      key: 'remuneration',
      header: 'Thù lao & Nhật ký',
      width: 130,
      align: 'right',
      render: (t) => (
        <div className="tabular-nums leading-tight">
          <span className="font-medium text-ink block">{formatVnd(t.remuneration)}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTaskIdForLog(t.id);
            }}
            className="text-2xs text-accent hover:underline font-medium cursor-pointer"
          >
            Xem nhật ký duyệt →
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Thanh điều hướng quay lại & chuyển CTV */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={nav.onBack} className="-ml-2.5">
          Danh bạ CTV / VJ
        </Button>
        {(nav.onPrev || nav.onNext) && (
          <div className="flex items-center gap-1.5 text-2xs text-ink-3">
            {nav.position && nav.total ? (
              <span className="tabular-nums mr-1">
                {nav.position} / {nav.total}
              </span>
            ) : null}
            <button
              type="button"
              disabled={!nav.onPrev}
              onClick={nav.onPrev}
              className="w-7 h-7 rounded border border-line bg-surface hover:bg-sunken disabled:opacity-40 inline-flex items-center justify-center text-ink-2"
              aria-label="CTV trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={!nav.onNext}
              onClick={nav.onNext}
              className="w-7 h-7 rounded border border-line bg-surface hover:bg-sunken disabled:opacity-40 inline-flex items-center justify-center text-ink-2"
              aria-label="CTV sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Header Hồ sơ CTV */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <Avatar name={ctv.name} src={ctv.avatar} size={52} />
          <div className="min-w-0 grid gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-ink">{ctv.name}</h2>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-sunken text-ink-2 border border-line">
                {ctv.code || ctv.id.toUpperCase()}
              </span>
              <Status tone="info">{CTV_ROLE_LABELS[ctv.role]}</Status>
              <Status tone={contractMeta.tone}>{contractMeta.label}</Status>
              {missingLegal && <Status tone="warning">Thiếu CCCD</Status>}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-2">
              {ctv.channelLink && (
                <a
                  href={ctv.channelLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
                >
                  <span>Kênh mẫu / Portfolio</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              {ctv.driveFolderUrl && (
                <a
                  href={ctv.driveFolderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-ink-2 hover:text-ink hover:underline"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-ink-3" />
                  <span>Drive tổng nộp video</span>
                </a>
              )}
              <span className="text-ink-3">· {ctv.nicheSpecialty.join(' · ')}</span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-2">
              {ctv.contentPic && <Person name={ctv.contentPic} sub="Content PIC" size={20} />}
              {ctv.partnershipPic && (
                <Person name={ctv.partnershipPic} sub="Partnership (Hợp đồng)" size={20} />
              )}
              <span className="inline-flex items-center gap-1 text-2xs font-semibold text-warning bg-warning-soft px-1.5 py-0.5 rounded">
                <Star className="w-3 h-3 fill-current" />
                {ctv.ratingScore.toFixed(1)} / 5.0
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" icon={QrCode} onClick={onShowQr}>
            Mã QR
          </Button>
          <Button variant="secondary" icon={FileScan} onClick={onScanDocs}>
            {missingLegal ? 'Đọc ảnh CCCD' : 'Đọc lại CCCD'}
          </Button>
          <Button variant="primary" icon={Video} onClick={onAssignTask}>
            Giao việc video kênh
          </Button>
        </div>
      </header>

      {/* Bố cục 2 cột chuẩn: Cột trái (Hồ sơ sâu) + Cột phải (Lịch sử, Quyết toán, Hàng mẫu, Chỉnh sửa) */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-6 items-start">
        {/* CỘT TRÁI: THÔNG TIN QUẢN TRỊ SÂU */}
        <aside className="space-y-4">
          {/* 1. Pháp lý & Hợp đồng Partnership */}
          <Panel>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-ink text-[13px]">Pháp lý &amp; Hợp đồng CTV</h3>
                <button
                  type="button"
                  onClick={onScanDocs}
                  className="text-2xs font-medium text-accent hover:underline cursor-pointer"
                >
                  Đọc ảnh CCCD
                </button>
              </div>
              <dl className="grid gap-2 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-3">Họ tên pháp lý</dt>
                  <dd className="font-medium text-ink text-right">{ctv.realName || ctv.name}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-3">Số CCCD</dt>
                  <dd className="font-mono font-medium text-ink">
                    {ctv.cccd || <span className="text-warning">Chưa bổ sung</span>}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-3">Mã số thuế TNCN</dt>
                  <dd className="font-mono text-ink-2">{ctv.taxCode || '—'}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-3">Mã hợp đồng khung</dt>
                  <dd className="font-mono font-medium text-ink">{ctv.contractCode || 'Chưa cấp mã'}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-3">Hiệu lực đến</dt>
                  <dd className="text-ink-2">{ctv.contractExpiryDate ? formatDate(ctv.contractExpiryDate) : '—'}</dd>
                </div>
                {ctv.permanentAddress && (
                  <div className="pt-1 border-t border-line">
                    <dt className="text-ink-3 text-2xs">Địa chỉ thường trú (trên CCCD):</dt>
                    <dd className="text-ink-2 mt-0.5">{ctv.permanentAddress}</dd>
                  </div>
                )}
              </dl>
            </div>
          </Panel>

          {/* 2. Tài khoản nhận thù lao */}
          <Panel>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-ink text-[13px]">Tài khoản nhận thù lao</h3>
                <button
                  type="button"
                  onClick={onShowQr}
                  className="text-2xs font-medium text-accent hover:underline cursor-pointer"
                >
                  Xem mã QR
                </button>
              </div>
              <dl className="grid gap-2">
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-3">Ngân hàng</dt>
                  <dd className="font-medium text-ink">{ctv.bankName}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-3">Số tài khoản</dt>
                  <dd className="font-mono font-semibold text-ink">{ctv.bankAccount}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-3">Chủ tài khoản</dt>
                  <dd className="font-mono text-ink-2">{ctv.bankAccountName}</dd>
                </div>
              </dl>
            </div>
          </Panel>

          {/* 3. Định mức đơn giá (Rate Card) & Công suất */}
          <Panel>
            <div className="space-y-3 text-xs">
              <h3 className="font-semibold text-ink text-[13px]">Định mức đơn giá &amp; Công suất</h3>
              <dl className="grid gap-2 tabular-nums">
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-3">Quay dựng trọn gói</dt>
                  <dd className="font-mono font-semibold text-ink">
                    {ctv.unitRateAllInOne ? formatVnd(ctv.unitRateAllInOne) : '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-3">Chỉ quay thô / Diễn xuất</dt>
                  <dd className="font-mono text-ink-2">
                    {ctv.unitRateShootingOnly ? formatVnd(ctv.unitRateShootingOnly) : '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-3">Dựng hậu kỳ lẻ (Edit)</dt>
                  <dd className="font-mono text-ink-2">
                    {ctv.unitRateEditOnly ? formatVnd(ctv.unitRateEditOnly) : '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-3">Viết kịch bản lẻ</dt>
                  <dd className="font-mono text-ink-2">
                    {ctv.unitRateScriptOnly ? formatVnd(ctv.unitRateScriptOnly) : '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 pt-1.5 border-t border-line">
                  <dt className="text-ink-3">Công suất cam kết</dt>
                  <dd className="font-medium text-ink">
                    Tối đa {ctv.monthlyCapacityVideos || 12} video/tháng
                  </dd>
                </div>
              </dl>
            </div>
          </Panel>

          {/* 4. Hậu cần gửi hàng mẫu (SLA 48h) & Bối cảnh quay */}
          <Panel>
            <div className="space-y-3 text-xs">
              <h3 className="font-semibold text-ink text-[13px]">Hậu cần gửi mẫu &amp; Bối cảnh VJ</h3>
              <dl className="grid gap-2">
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-3">Người nhận</dt>
                  <dd className="font-medium text-ink text-right">
                    {ctv.shippingRecipientName || ctv.name}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-3">SĐT nhận hàng</dt>
                  <dd className="font-mono text-ink">{ctv.shippingPhone || ctv.phone}</dd>
                </div>
                <div>
                  <dt className="text-ink-3 text-2xs">Địa chỉ nhận hàng mẫu (SLA gửi 48h):</dt>
                  <dd className="text-ink font-medium mt-0.5">
                    {ctv.shippingAddress || 'Chưa cập nhật địa chỉ'}
                  </dd>
                  {ctv.shippingNotes && (
                    <span className="block text-2xs text-ink-3 mt-0.5">
                      Ghi chú giao: {ctv.shippingNotes}
                    </span>
                  )}
                </div>
                {ctv.studioBackdrops && ctv.studioBackdrops.length > 0 && (
                  <div className="pt-1.5 border-t border-line">
                    <dt className="text-ink-3 text-2xs mb-1">Bối cảnh quay sẵn có:</dt>
                    <dd className="flex flex-wrap gap-1">
                      {ctv.studioBackdrops.map((bg, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-sunken text-ink-2 text-2xs border border-line"
                        >
                          {bg}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
                {ctv.personalTraits && (
                  <div className="pt-1.5 border-t border-line">
                    <dt className="text-ink-3 text-2xs">Đặc điểm nhân vật / VJ:</dt>
                    <dd className="text-ink-2 mt-0.5 leading-relaxed">{ctv.personalTraits}</dd>
                  </div>
                )}
              </dl>
            </div>
          </Panel>
        </aside>

        {/* CỘT PHẢI: LỊCH SỬ SẢN XUẤT, LỊCH SỬ QUYẾT TOÁN, HÀNG MẪU & CHỈNH SỬA HỒ SƠ */}
        <div className="space-y-5 min-w-0">
          <StatRow>
            <Stat
              label="Video đã nghiệm thu"
              value={`${ctv.completedTaskCount} / ${ctv.assignedTaskCount}`}
              note={`Công suất tối đa ${ctv.monthlyCapacityVideos || 12} video/tháng`}
              progress={{ value: ctv.completedTaskCount, max: Math.max(1, ctv.assignedTaskCount) }}
            />
            <Stat
              label="Duyệt đạt ngay lần 1"
              value={`${ctv.firstPassRate ?? 88}%`}
              note="Tỷ lệ kịch bản & demo đạt chuẩn không cần sửa"
              tone="positive"
            />
            <Stat
              label="Đúng hạn SLA"
              value={`${ctv.onTimeRate ?? 95}%`}
              note="Cam kết nộp kịch bản & demo trước ngày air ≥ 2 ngày"
            />
            <Stat
              label="Tổng thù lao đã chi"
              value={formatVndShort(ctv.totalPaidAmount)}
              note={
                ctv.pendingPaymentAmount
                  ? `Chờ quyết toán: ${formatVnd(ctv.pendingPaymentAmount)}`
                  : 'Không có công nợ tồn đọng'
              }
              tone={ctv.pendingPaymentAmount ? 'warning' : 'positive'}
            />
          </StatRow>

          <Tabs items={tabItems} value={activeTab} onChange={setActiveTab} />

          {/* TAB 1: LỊCH SỬ SẢN XUẤT & NHẬT KÝ SỬA BÀI */}
          {activeTab === 'HISTORY' && (
            <div className="space-y-4">
              {/* Khối 1.1: Lịch sử hợp tác theo từng Nhãn hàng */}
              {brandHistoryStats.length > 0 && (
                <Panel>
                  <div className="space-y-3">
                    <SectionHeader
                      title="Lịch sử hợp tác theo Nhãn hàng (Brand History)"
                      description="Tổng hợp số lượng video, định dạng sở trường và thù lao của CTV trên từng Brand."
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {brandHistoryStats.map((b) => (
                        <div
                          key={b.brandName}
                          className="p-3 rounded-xl border border-line bg-canvas/60 space-y-1.5 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-ink truncate">{b.brandName}</span>
                            <span className="px-1.5 py-0.5 rounded bg-sunken text-ink-2 font-mono text-2xs">
                              {b.completedTasks}/{b.totalTasks} video
                            </span>
                          </div>
                          <div className="text-2xs text-ink-3">
                            Định dạng: {b.formats.length > 0 ? b.formats.join(', ') : 'Review voice'}
                          </div>
                          <div className="flex items-center justify-between pt-1.5 border-t border-line/70 tabular-nums">
                            <span className="text-2xs text-positive font-medium">
                              Đạt lần 1: {Math.round((b.firstPassCount / Math.max(1, b.totalTasks)) * 100)}%
                            </span>
                            <span className="font-mono font-semibold text-ink">
                              {formatVndShort(b.totalRemuneration)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Panel>
              )}

              {/* Khối 1.2: Bảng danh sách Video đã & đang thực hiện */}
              <Panel flush>
                <div className="px-4 py-3 border-b border-line flex items-center justify-between">
                  <SectionHeader
                    title="Danh sách video kênh Brand đã & đang thực hiện"
                    description="Bấm vào một dòng video để xem chi tiết kịch bản, file nộp và nhật ký nhận xét/chỉnh sửa qua từng vòng."
                  />
                </div>
                <DataTable
                  columns={taskColumns}
                  rows={ctvTasks}
                  rowKey={(t) => t.id}
                  onRowClick={(t) => setSelectedTaskIdForLog(t.id)}
                  empty={
                    <EmptyState
                      title="Chưa có video nào được giao cho CTV này"
                      description="Bấm Giao việc video kênh để phân bổ kịch bản mới cho CTV."
                    />
                  }
                />
              </Panel>

              {/* Khối 1.3: Chi tiết Kịch bản, File bàn giao & Nhật ký chỉnh sửa (Revision & Feedback Log) */}
              {selectedTaskForLog && (
                <Panel>
                  <div className="space-y-4 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-line">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-2xs px-1.5 py-0.5 rounded bg-sunken text-ink-2">
                            {selectedTaskForLog.taskCode}
                          </span>
                          <h4 className="font-semibold text-ink text-sm">
                            Nhật ký thực hiện &amp; Duyệt bài: {selectedTaskForLog.title}
                          </h4>
                        </div>
                        <p className="text-2xs text-ink-3 mt-0.5">
                          Nhãn hàng: <strong>{selectedTaskForLog.brandName}</strong> · SKU:{' '}
                          <span className="font-mono">{selectedTaskForLog.linkedSku}</span> · Content PIC:{' '}
                          <strong>{selectedTaskForLog.contentPic || 'Quỳnh Như'}</strong> · Partnership:{' '}
                          <strong>{selectedTaskForLog.partnershipPic || 'Việt Hoàng'}</strong>
                        </p>
                      </div>
                      <span className="font-mono font-semibold text-ink">
                        Thù lao: {formatVnd(selectedTaskForLog.remuneration)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Cột kịch bản & Link bàn giao */}
                      <div className="space-y-2.5 p-3.5 rounded-xl bg-sunken/50 border border-line">
                        <div className="font-semibold text-ink flex items-center justify-between">
                          <span>1. Kịch bản &amp; File bàn giao của CTV</span>
                          <span className="text-2xs font-mono text-ink-3">
                            Phiên bản: v{selectedTaskForLog.videoDeliverables?.currentVersion || 1}
                          </span>
                        </div>
                        {selectedTaskForLog.scriptContent ? (
                          <div className="space-y-1.5 text-ink-2">
                            <div>
                              <span className="font-semibold text-ink">Hook 3s đầu: </span>
                              <span>{selectedTaskForLog.scriptContent.hook}</span>
                            </div>
                            <div>
                              <span className="font-semibold text-ink">Nội dung chính: </span>
                              <span>{selectedTaskForLog.scriptContent.body}</span>
                            </div>
                            <div>
                              <span className="font-semibold text-ink">Kêu gọi (CTA): </span>
                              <span>{selectedTaskForLog.scriptContent.cta}</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-ink-3 italic">CTV chưa nộp kịch bản chi tiết.</p>
                        )}

                        <div className="pt-2 border-t border-line flex flex-wrap gap-3 text-2xs">
                          {selectedTaskForLog.videoDeliverables?.draftVideoUrl && (
                            <a
                              href={selectedTaskForLog.videoDeliverables.draftVideoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-accent hover:underline inline-flex items-center gap-1 font-medium"
                            >
                              <span>Link Video Demo (Drive)</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          {selectedTaskForLog.videoDeliverables?.storeDriveFolderUrl && (
                            <a
                              href={selectedTaskForLog.videoDeliverables.storeDriveFolderUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-ink-2 hover:text-ink hover:underline inline-flex items-center gap-1 font-medium"
                            >
                              <FolderOpen className="w-3 h-3" />
                              <span>Drive tổng gian hàng</span>
                            </a>
                          )}
                          {selectedTaskForLog.videoDeliverables?.publishedChannelUrl && (
                            <a
                              href={selectedTaskForLog.videoDeliverables.publishedChannelUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-positive hover:underline inline-flex items-center gap-1 font-medium"
                            >
                              <span>Bài đăng thực tế trên kênh Brand</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Cột Lịch sử nhận xét & sửa bài (Feedback Logs) */}
                      <div className="space-y-2.5 p-3.5 rounded-xl bg-surface border border-line">
                        <div className="font-semibold text-ink">
                          2. Lịch sử duyệt &amp; Nhận xét chỉnh sửa ({(selectedTaskForLog.feedbackLogs || []).length} lượt)
                        </div>
                        {(selectedTaskForLog.feedbackLogs || []).length === 0 ? (
                          <p className="text-ink-3">
                            Chưa có yêu cầu chỉnh sửa hoặc nhận xét nào được ghi nhận ở đầu việc này.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {selectedTaskForLog.feedbackLogs.map((fb) => (
                              <div
                                key={fb.id}
                                className="p-2.5 rounded-lg border border-line bg-canvas/60 space-y-1"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold text-ink">
                                    {fb.reviewedBy} · Vòng v{fb.version} ({fb.type})
                                  </span>
                                  <Status tone={fb.verdict === 'APPROVED' ? 'positive' : 'warning'}>
                                    {fb.verdict === 'APPROVED' ? 'Đạt chuẩn' : 'Yêu cầu sửa'}
                                  </Status>
                                </div>
                                <p className="text-ink-2">{fb.comment}</p>
                                <span className="block text-2xs text-ink-3 font-mono">
                                  Thời gian: {formatDate(fb.reviewedAt)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Panel>
              )}
            </div>
          )}

          {/* TAB 2: LỊCH SỬ QUYẾT TOÁN DNTT, THUẾ TNCN 10% & HỢP ĐỒNG */}
          {activeTab === 'SETTLEMENT_HISTORY' && (
            <div className="space-y-4">
              <Panel flush>
                <div className="px-4 py-3 border-b border-line">
                  <SectionHeader
                    title="Lịch sử các đợt quyết toán thù lao (Phiếu DNTT & Khấu trừ thuế TNCN 10%)"
                    description="Theo dõi toàn bộ các đợt chi trả nhuận bút sản xuất video, khấu trừ thuế TNCN 10% (với đợt chi ≥ 2.000.000 đ) và mã Ủy nhiệm chi (UNC)."
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-line bg-sunken/60 text-ink-3 font-semibold text-2xs">
                        <th className="py-2.5 px-4">MÃ PHIẾU DNTT</th>
                        <th className="py-2.5 px-3">KỲ QUYẾT TOÁN</th>
                        <th className="py-2.5 px-3 text-center">SỐ VIDEO</th>
                        <th className="py-2.5 px-3 text-right">TỔNG GROSS</th>
                        <th className="py-2.5 px-3 text-right">THUẾ TNCN (10%)</th>
                        <th className="py-2.5 px-3 text-right">THỰC NHẬN (NET)</th>
                        <th className="py-2.5 px-3">MÃ UNC / NGÀY CHI</th>
                        <th className="py-2.5 px-4 text-right">TRẠNG THÁI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {settlementBatches.map((b) => (
                        <tr key={b.id} className="hover:bg-sunken/40">
                          <td className="py-3 px-4 font-mono font-semibold text-ink">{b.dnttCode}</td>
                          <td className="py-3 px-3">
                            <div className="font-medium text-ink">{b.period}</div>
                            <div className="text-2xs text-ink-3 font-mono truncate max-w-[200px]">
                              {b.taskCodes.join(', ')}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-semibold text-ink">
                            {b.videoCount} video
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-semibold text-ink">
                            {formatVnd(b.grossAmount)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-critical">
                            {b.pitTaxAmount > 0 ? `- ${formatVnd(b.pitTaxAmount)}` : '0 đ'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-semibold text-positive">
                            {formatVnd(b.netAmount)}
                          </td>
                          <td className="py-3 px-3 font-mono text-2xs text-ink-2">
                            <div>{b.paymentRef}</div>
                            {b.disbursedAt !== '—' && (
                              <div className="text-ink-3">{formatDate(b.disbursedAt)}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {b.status === 'DISBURSED' ? (
                              <Status tone="positive">Đã giải ngân</Status>
                            ) : (
                              <Status tone="warning">Chờ lập DNTT</Status>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>

              {/* Lịch sử Hợp đồng khung & Thỏa thuận Đơn giá (Rate Card Log) */}
              <Panel>
                <div className="space-y-3 text-xs">
                  <SectionHeader
                    title="Lịch sử Hợp đồng dịch vụ & Điều chỉnh đơn giá (Partnership Log)"
                    description="Lưu vết quá trình xác thực pháp lý CCCD, ký hợp đồng khung và cập nhật đơn giá với Partnership Leader (Việt Hoàng)."
                  />
                  <div className="divide-y divide-line border border-line rounded-xl overflow-hidden">
                    <div className="p-3 bg-surface flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold text-ink">
                          Áp dụng Định mức đơn giá hiện hành ({CTV_ROLE_LABELS[ctv.role]})
                        </span>
                        <p className="text-2xs text-ink-3 mt-0.5">
                          Trọn gói: {formatVnd(ctv.unitRateAllInOne || 1500000)} · Quay lẻ:{' '}
                          {formatVnd(ctv.unitRateShootingOnly || 900000)} · Dựng lẻ:{' '}
                          {formatVnd(ctv.unitRateEditOnly || 500000)} · Kịch bản:{' '}
                          {formatVnd(ctv.unitRateScriptOnly || 300000)}
                        </p>
                      </div>
                      <div className="text-right text-2xs text-ink-3">
                        <span className="font-medium text-ink block">Người duyệt: {ctv.partnershipPic || 'Việt Hoàng'}</span>
                        <span className="font-mono">Hiệu lực từ: {formatDate(ctv.joinedDate)}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-surface flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold text-ink">
                          Hợp đồng dịch vụ CTV: {ctv.contractCode || 'Đang chờ cấp mã hợp đồng'}
                        </span>
                        <p className="text-2xs text-ink-3 mt-0.5">
                          {hasLegalInfo(ctv)
                            ? `Đã xác thực CCCD (${ctv.cccd}) & MST (${ctv.taxCode || 'Đã khai báo'})`
                            : 'Chưa hoàn tất xác thực CCCD — Cần bổ sung trước khi lập phiếu DNTT'}
                        </p>
                      </div>
                      <div className="text-right">
                        <Status tone={contractMeta.tone}>{contractMeta.label}</Status>
                      </div>
                    </div>
                  </div>
                </div>
              </Panel>
            </div>
          )}

          {/* TAB 3: HÀNG MẪU CẦM SẴN & LỊCH SỬ VẬN ĐƠN */}
          {activeTab === 'SAMPLES_AND_JOBS' && (
            <div className="space-y-4">
              <Panel>
                <div className="space-y-3">
                  <SectionHeader
                    title="Sản phẩm mẫu CTV đang cầm sẵn tại nhà"
                    description="Theo quy định SLA: Chỉ nhận làm video kênh mới dưới 5 ngày trước ngày air nếu VJ/CTV đã có sẵn sản phẩm này tại nhà."
                  />

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {(ctv.onHandProducts || []).length === 0 ? (
                      <span className="text-xs text-ink-3">
                        Chưa có sản phẩm mẫu nào đang giữ tại nhà (cần gửi hàng trước 48h).
                      </span>
                    ) : (
                      (ctv.onHandProducts || []).map((sku) => (
                        <span
                          key={sku}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-positive-soft text-positive border border-line text-xs font-mono font-medium"
                        >
                          <Package className="w-3.5 h-3.5" />
                          <span>{sku}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveOnHandSku(sku)}
                            className="ml-1 text-ink-3 hover:text-critical cursor-pointer"
                            title="Gỡ mã SKU"
                          >
                            ✕
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  <form onSubmit={handleAddOnHandSku} className="flex items-center gap-2 pt-2 max-w-md">
                    <Input
                      value={newSkuInput}
                      onChange={(e) => setNewSkuInput(e.target.value)}
                      placeholder="Nhập mã SKU CTV đang cầm sẵn (VD: KUTIE-SOOTH-30G)"
                    />
                    <Button type="submit" variant="secondary" icon={Plus}>
                      Thêm SKU
                    </Button>
                  </form>
                </div>
              </Panel>

              {/* Bảng Lịch sử giao nhận & đối soát hàng mẫu */}
              <Panel flush>
                <div className="px-4 py-3 border-b border-line">
                  <SectionHeader
                    title={`Lịch sử giao nhận & đối soát hàng mẫu (${sampleShippingHistory.length})`}
                    description="Theo dõi mã vận đơn gửi hàng mẫu (SLA 48h), ngày nhận và trạng thái tồn mẫu tại nhà CTV."
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-line bg-sunken/60 text-ink-3 font-semibold text-2xs">
                        <th className="py-2.5 px-4">MÃ VẬN ĐƠN</th>
                        <th className="py-2.5 px-3">MÃ SKU &amp; SẢN PHẨM</th>
                        <th className="py-2.5 px-3">ĐẦU VIỆC GẮN KÈM</th>
                        <th className="py-2.5 px-3">NGÀY GỬI / CẬP NHẬT</th>
                        <th className="py-2.5 px-3">TRẠNG THÁI GIAO</th>
                        <th className="py-2.5 px-4">ĐỐI SOÁT HÀNG MẪU</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {sampleShippingHistory.map((item) => (
                        <tr key={item.id} className="hover:bg-sunken/40">
                          <td className="py-2.5 px-4 font-mono font-semibold text-ink">
                            {item.trackingCode}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-semibold text-ink block">{item.sku}</span>
                            <span className="text-2xs text-ink-3">{item.brandName}</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-2xs text-ink-2">{item.taskCode}</td>
                          <td className="py-2.5 px-3 font-mono text-2xs text-ink-3">
                            {formatDate(item.shippedAt)}
                          </td>
                          <td className="py-2.5 px-3">
                            <Status
                              tone={
                                item.shippingStatus.includes('nhà') || item.shippingStatus.includes('thành công')
                                  ? 'positive'
                                  : 'warning'
                              }
                            >
                              {item.shippingStatus}
                            </Status>
                          </td>
                          <td className="py-2.5 px-4 text-2xs text-ink-2">{item.reconciliationNote}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>

              <Panel flush>
                <div className="px-4 py-3 border-b border-line">
                  <SectionHeader
                    title={`Công việc đang triển khai (${runningTasks.length})`}
                    description="Các video đang ở bước viết kịch bản, chờ duyệt hoặc đang quay dựng."
                  />
                </div>
                <DataTable
                  columns={taskColumns}
                  rows={runningTasks}
                  rowKey={(t) => t.id}
                  onRowClick={(t) => {
                    setSelectedTaskIdForLog(t.id);
                    setActiveTab('HISTORY');
                  }}
                  empty={
                    <EmptyState
                      title="Không có công việc đang chờ xử lý"
                      description="Tất cả các task giao cho CTV này đã được nghiệm thu."
                    />
                  }
                />
              </Panel>
            </div>
          )}

          {/* TAB 3: CHỈNH SỬA HỒ SƠ CHUYÊN SÂU */}
          {activeTab === 'EDIT_PROFILE' && (
            <Panel>
              <form onSubmit={handleSaveProfile} className="space-y-5">
                <SectionHeader
                  title="Cập nhật hồ sơ chuyên sâu CTV / VJ"
                  description="Chỉnh sửa thông tin pháp lý, hợp đồng, định mức đơn giá, tài khoản ngân hàng và địa chỉ nhận hàng mẫu."
                  actions={
                    <Button type="submit" variant="primary">
                      Lưu thay đổi
                    </Button>
                  }
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-line">
                  <Field label="Họ tên hiển thị">
                    <Input
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                    />
                  </Field>
                  <Field label="Họ tên pháp lý (trên CCCD)">
                    <Input
                      value={editForm.realName}
                      onChange={(e) => setEditForm((p) => ({ ...p, realName: e.target.value }))}
                    />
                  </Field>
                  <Field label="Vai trò chính">
                    <Select
                      value={editForm.role}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, role: e.target.value as ContributorRole }))
                      }
                    >
                      <option value="ALL_IN_ONE">Quay dựng trọn gói</option>
                      <option value="CREATIVE_ACTOR">VJ / Diễn viên</option>
                      <option value="VIDEO_EDITOR">Dựng phim</option>
                      <option value="SCRIPTWRITER">Biên kịch</option>
                    </Select>
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Số điện thoại">
                    <Input
                      required
                      value={editForm.phone}
                      onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                    />
                  </Field>
                  <Field label="Nhân sự Content phụ trách">
                    <Input
                      value={editForm.contentPic}
                      onChange={(e) => setEditForm((p) => ({ ...p, contentPic: e.target.value }))}
                    />
                  </Field>
                  <Field label="Nhân sự Partnership (Hợp đồng)">
                    <Input
                      value={editForm.partnershipPic}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, partnershipPic: e.target.value }))
                      }
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Link kênh TikTok / Portfolio mẫu">
                    <Input
                      value={editForm.channelLink}
                      onChange={(e) => setEditForm((p) => ({ ...p, channelLink: e.target.value }))}
                    />
                  </Field>
                  <Field label="Link Drive tổng gian hàng / Nộp video">
                    <Input
                      value={editForm.driveFolderUrl}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, driveFolderUrl: e.target.value }))
                      }
                    />
                  </Field>
                </div>

                {/* Khối Pháp lý & Hợp đồng */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-line">
                  <Field label="Số CCCD">
                    <Input
                      value={editForm.cccd}
                      onChange={(e) => setEditForm((p) => ({ ...p, cccd: e.target.value }))}
                    />
                  </Field>
                  <Field label="Mã số thuế TNCN">
                    <Input
                      value={editForm.taxCode}
                      onChange={(e) => setEditForm((p) => ({ ...p, taxCode: e.target.value }))}
                    />
                  </Field>
                  <Field label="Mã hợp đồng CTV">
                    <Input
                      value={editForm.contractCode}
                      onChange={(e) => setEditForm((p) => ({ ...p, contractCode: e.target.value }))}
                      placeholder="VD: HĐ-CTV-2026/018"
                    />
                  </Field>
                  <Field label="Trạng thái hợp đồng">
                    <Select
                      value={editForm.contractStatus}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          contractStatus: e.target.value as NonNullable<Contributor['contractStatus']>,
                        }))
                      }
                    >
                      <option value="ACTIVE">Đã ký hợp đồng</option>
                      <option value="PENDING_SIGN">Chờ ký hợp đồng</option>
                      <option value="EXPIRED">Cần thanh lý / Gia hạn</option>
                      <option value="NONE">Chưa có hợp đồng</option>
                    </Select>
                  </Field>
                </div>

                {/* Khối Ngân hàng & Đơn giá */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-line">
                  <Field label="Ngân hàng">
                    <Input
                      value={editForm.bankName}
                      onChange={(e) => setEditForm((p) => ({ ...p, bankName: e.target.value }))}
                    />
                  </Field>
                  <Field label="Số tài khoản">
                    <Input
                      value={editForm.bankAccount}
                      onChange={(e) => setEditForm((p) => ({ ...p, bankAccount: e.target.value }))}
                    />
                  </Field>
                  <Field label="Chủ tài khoản">
                    <Input
                      value={editForm.bankAccountName}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, bankAccountName: e.target.value }))
                      }
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <Field label="Giá trọn gói (đ)">
                    <Input
                      type="number"
                      value={editForm.unitRateAllInOne}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, unitRateAllInOne: Number(e.target.value) }))
                      }
                    />
                  </Field>
                  <Field label="Giá chỉ quay (đ)">
                    <Input
                      type="number"
                      value={editForm.unitRateShootingOnly}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, unitRateShootingOnly: Number(e.target.value) }))
                      }
                    />
                  </Field>
                  <Field label="Giá dựng lẻ (đ)">
                    <Input
                      type="number"
                      value={editForm.unitRateEditOnly}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, unitRateEditOnly: Number(e.target.value) }))
                      }
                    />
                  </Field>
                  <Field label="Giá kịch bản (đ)">
                    <Input
                      type="number"
                      value={editForm.unitRateScriptOnly}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, unitRateScriptOnly: Number(e.target.value) }))
                      }
                    />
                  </Field>
                  <Field label="Công suất/tháng">
                    <Input
                      type="number"
                      value={editForm.monthlyCapacityVideos}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          monthlyCapacityVideos: Number(e.target.value),
                        }))
                      }
                    />
                  </Field>
                </div>

                {/* Khối Hậu cần gửi hàng mẫu & Bối cảnh */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-line">
                  <Field label="Địa chỉ nhận hàng mẫu (SLA 48h)">
                    <Input
                      value={editForm.shippingAddress}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, shippingAddress: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Ghi chú giao nhận hàng mẫu">
                    <Input
                      value={editForm.shippingNotes}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, shippingNotes: e.target.value }))
                      }
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Bối cảnh quay sẵn có (cách nhau bằng dấu phẩy)">
                    <Input
                      value={editForm.studioBackdrops}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, studioBackdrops: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Đặc điểm nhân vật / VJ">
                    <Input
                      value={editForm.personalTraits}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, personalTraits: e.target.value }))
                      }
                    />
                  </Field>
                </div>

                <Field label="Ghi chú đánh giá từ Content Lead">
                  <Textarea
                    rows={2}
                    value={editForm.notes}
                    onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                  />
                </Field>
              </form>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* MODAL MÃ QR THANH TOÁN CHO CTV                                              */
/* ========================================================================== */

function CtvVietQrModal({ ctv, onClose }: { ctv: Contributor; onClose: () => void }) {
  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`Mã QR thanh toán — ${ctv.name}`}
      description="Dùng cho Kế toán đối soát tài khoản nhận thù lao sản xuất video kênh Brand."
      size="sm"
      footer={<Button onClick={onClose}>Đóng</Button>}
    >
      <div className="space-y-3 text-xs">
        <div className="p-4 rounded-xl border border-line bg-canvas text-center space-y-2">
          <div className="w-36 h-36 mx-auto rounded-lg border border-line bg-surface flex items-center justify-center">
            <QrCode className="w-24 h-24 text-ink" />
          </div>
          <p className="font-mono font-semibold text-ink text-sm">{ctv.bankAccount}</p>
          <p className="text-ink-2 font-medium">
            {ctv.bankName} · {ctv.bankAccountName}
          </p>
        </div>
        <dl className="grid gap-1.5 text-xs">
          <div className="flex justify-between">
            <dt className="text-ink-3">Mã CTV</dt>
            <dd className="font-mono text-ink">{ctv.code || ctv.id}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-3">Hợp đồng</dt>
            <dd className="font-mono text-ink">{ctv.contractCode || 'Chưa cập nhật'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-3">Chờ quyết toán</dt>
            <dd className="font-mono font-semibold text-ink">
              {formatVnd(ctv.pendingPaymentAmount || 0)}
            </dd>
          </div>
        </dl>
      </div>
    </Modal>
  );
}
