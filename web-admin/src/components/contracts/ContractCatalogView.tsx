'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Edit3,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  History,
  Layers,
  Plus,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import type { ContractCategory, LegalTemplate } from '../../lib/contracts/types';
import { formatDate } from '../../lib/format';
import {
  Button,
  Chips,
  EmptyState,
  Field,
  FilterBar,
  Input,
  Modal,
  Panel,
  Segmented,
  Select,
  Status,
  Textarea,
} from '../ui';
import type { StatusTone } from '../ui';
import { contractApi, type ContractBootstrap } from './api';
import { ContractDocumentViewer } from './ContractDocumentViewer';
import { GROUP_ORDER, ROLE_LABEL, uniqueFields } from './contractUi';

export const CATEGORY_LABELS: Record<ContractCategory, string> = {
  BOOKING_VIDEO: 'Hợp đồng Booking Video',
  ACCEPTANCE_SETTLEMENT: 'Nghiệm thu & Tất toán',
  CTV_FRAMEWORK: 'Hợp đồng nguyên tắc CTV',
  LIVESTREAM_APPENDIX: 'Phụ lục & Livestream',
};

const CATEGORY_TONES: Record<ContractCategory, StatusTone> = {
  BOOKING_VIDEO: 'info',
  ACCEPTANCE_SETTLEMENT: 'positive',
  CTV_FRAMEWORK: 'warning',
  LIVESTREAM_APPENDIX: 'neutral',
};

const SOURCE_LABELS: Record<string, string> = {
  partyName: 'Tên đối tác / KOC (Hồ sơ KOC)',
  ownerName: 'Chủ hộ kinh doanh (Hồ sơ KOC)',
  representative: 'Người đại diện pháp luật (Hồ sơ KOC)',
  cccd: 'Số CCCD / CMND (Hồ sơ KOC)',
  taxCode: 'Mã số thuế (Hồ sơ KOC)',
  address: 'Địa chỉ thường trú / trụ sở (Hồ sơ KOC)',
  phone: 'Số điện thoại liên hệ (Hồ sơ KOC)',
  email: 'Email nhận hợp đồng (Hồ sơ KOC)',
  kocId: 'Mã KOC nội bộ',
  docDate: 'Ngày lập hồ sơ',
  signDay: 'Ngày ký (01–31)',
  signMonth: 'Tháng ký (01–12)',
  signYearDigit: 'Năm ký',
  product: 'Tên sản phẩm / nhãn hàng (Deal Booking)',
  unitPrice: 'Đơn giá dịch vụ (Deal Booking)',
  quantity: 'Số lượng video (Deal Booking)',
  lineTotal: 'Thành tiền hạng mục (Deal Booking)',
  netTotal: 'Tổng giá trị hợp đồng (Deal Booking)',
};

type SubTab = 'PREVIEW' | 'FIELDS' | 'META';

export function ContractCatalogView({
  data,
  onRefresh,
  onUseTemplate,
  onNotify,
}: {
  data: ContractBootstrap;
  onRefresh: () => Promise<unknown>;
  onUseTemplate: (template: LegalTemplate) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}) {
  const canManageCatalog = data.actor.roles.some(r => ['LEGAL', 'LEAD'].includes(r));
  const canCreateContract = data.actor.roles.includes('CREATOR');

  const [categoryFilter, setCategoryFilter] = useState<'ALL' | ContractCategory>('ALL');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>(data.templates[0]?.id || '');
  const [loadedTemplate, setLoadedTemplate] = useState<LegalTemplate | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>('PREVIEW');
  const [busy, setBusy] = useState(false);

  // Modal chỉnh sửa thông tin danh mục
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSubject, setEditSubject] = useState('Cá nhân');
  const [editKind, setEditKind] = useState<'CONTRACT' | 'ACCEPTANCE'>('CONTRACT');
  const [editCategory, setEditCategory] = useState<ContractCategory>('BOOKING_VIDEO');
  const [editVersion, setEditVersion] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [editRoles, setEditRoles] = useState<('LEGAL' | 'FINANCE' | 'LEAD')[]>(['LEGAL', 'FINANCE']);

  // Modal tải file .docx (cập nhật phiên bản hoặc thêm mẫu mới)
  const [uploadModalMode, setUploadModalMode] = useState<null | 'NEW' | 'UPDATE'>(null);
  const [newCode, setNewCode] = useState('');
  const [uploadName, setUploadName] = useState('');
  const [uploadSubject, setUploadSubject] = useState('Cá nhân');
  const [uploadKind, setUploadKind] = useState<'CONTRACT' | 'ACCEPTANCE'>('CONTRACT');
  const [uploadCategory, setUploadCategory] = useState<ContractCategory>('BOOKING_VIDEO');
  const [uploadVersion, setUploadVersion] = useState('Ver102026');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadNote, setUploadNote] = useState('');
  const [uploadRoles, setUploadRoles] = useState<('LEGAL' | 'FINANCE' | 'LEAD')[]>(['LEGAL', 'FINANCE']);
  const [uploadFile, setUploadFile] = useState<{ name: string; base64: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.templates.filter(t => {
      const cat = t.category || (t.id.startsWith('CTV-') ? 'CTV_FRAMEWORK' : t.kind === 'ACCEPTANCE' ? 'ACCEPTANCE_SETTLEMENT' : 'BOOKING_VIDEO');
      if (categoryFilter !== 'ALL' && cat !== categoryFilter) return false;
      if (!q) return true;
      return `${t.id} ${t.name} ${t.subject} ${t.version} ${t.filename} ${t.description || ''}`.toLowerCase().includes(q);
    });
  }, [data.templates, categoryFilter, search]);

  useEffect(() => {
    if (!filteredTemplates.some(t => t.id === selectedId) && filteredTemplates[0]) {
      setSelectedId(filteredTemplates[0].id);
    }
  }, [filteredTemplates, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setLoadedTemplate(null);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    contractApi<{ template: LegalTemplate }>(`/api/contracts/templates/${selectedId}`)
      .then(r => {
        if (!cancelled) setLoadedTemplate(r.template);
      })
      .catch(e => {
        if (!cancelled) onNotify?.((e as Error).message, 'error');
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, onNotify]);

  const categoryChips = useMemo(() => {
    const getCat = (t: LegalTemplate): ContractCategory =>
      t.category || (t.id.startsWith('CTV-') ? 'CTV_FRAMEWORK' : t.kind === 'ACCEPTANCE' ? 'ACCEPTANCE_SETTLEMENT' : 'BOOKING_VIDEO');
    return [
      { key: 'ALL' as const, label: 'Tất cả danh mục', count: data.templates.length },
      { key: 'BOOKING_VIDEO' as const, label: CATEGORY_LABELS.BOOKING_VIDEO, count: data.templates.filter(t => getCat(t) === 'BOOKING_VIDEO').length },
      { key: 'ACCEPTANCE_SETTLEMENT' as const, label: CATEGORY_LABELS.ACCEPTANCE_SETTLEMENT, count: data.templates.filter(t => getCat(t) === 'ACCEPTANCE_SETTLEMENT').length },
      { key: 'CTV_FRAMEWORK' as const, label: CATEGORY_LABELS.CTV_FRAMEWORK, count: data.templates.filter(t => getCat(t) === 'CTV_FRAMEWORK').length },
      { key: 'LIVESTREAM_APPENDIX' as const, label: CATEGORY_LABELS.LIVESTREAM_APPENDIX, count: data.templates.filter(t => getCat(t) === 'LIVESTREAM_APPENDIX').length },
    ];
  }, [data.templates]);

  const openEditMeta = (tpl: LegalTemplate) => {
    setEditName(tpl.name);
    setEditSubject(tpl.subject);
    setEditKind(tpl.kind);
    setEditCategory(tpl.category || (tpl.id.startsWith('CTV-') ? 'CTV_FRAMEWORK' : tpl.kind === 'ACCEPTANCE' ? 'ACCEPTANCE_SETTLEMENT' : 'BOOKING_VIDEO'));
    setEditVersion(tpl.version);
    setEditDescription(tpl.description || '');
    setEditActive(tpl.active !== false);
    setEditRoles(tpl.defaultReviewRoles?.length ? tpl.defaultReviewRoles : tpl.kind === 'ACCEPTANCE' ? ['FINANCE', 'LEAD'] : ['LEGAL', 'FINANCE']);
    setEditModalOpen(true);
  };

  const openUploadModal = (mode: 'NEW' | 'UPDATE', tpl?: LegalTemplate) => {
    setUploadModalMode(mode);
    setUploadFile(null);
    if (mode === 'UPDATE' && tpl) {
      setNewCode(tpl.id);
      setUploadName(tpl.name);
      setUploadSubject(tpl.subject);
      setUploadKind(tpl.kind);
      setUploadCategory(tpl.category || 'BOOKING_VIDEO');
      setUploadVersion(tpl.version === 'Ver052026' ? 'Ver102026' : tpl.version);
      setUploadDescription(tpl.description || '');
      setUploadRoles(tpl.defaultReviewRoles?.length ? tpl.defaultReviewRoles : ['LEGAL', 'FINANCE']);
      setUploadNote('Cập nhật biểu mẫu theo quy định pháp chế mới');
    } else {
      setNewCode('LIV-HD');
      setUploadName('Hợp đồng dịch vụ Livestream · Cá nhân');
      setUploadSubject('Cá nhân');
      setUploadKind('CONTRACT');
      setUploadCategory('LIVESTREAM_APPENDIX');
      setUploadVersion('Ver102026');
      setUploadDescription('Mẫu hợp đồng áp dụng cho phiên phát sóng trực tiếp (Livestream) trên sàn TMĐT.');
      setUploadRoles(['LEGAL', 'FINANCE', 'LEAD']);
      setUploadNote('Ban hành biểu mẫu mới vào danh mục chuẩn');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.docx')) {
      onNotify?.('Vui lòng chọn tệp định dạng Word (.docx).', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      setUploadFile({ name: file.name, base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveMeta = async () => {
    if (!loadedTemplate) return;
    setBusy(true);
    try {
      const res = await contractApi<{ template: LegalTemplate }>(`/api/contracts/templates/${loadedTemplate.id}`, {
        action: 'SAVE_META',
        name: editName,
        subject: editSubject,
        kind: editKind,
        category: editCategory,
        version: editVersion,
        description: editDescription,
        active: editActive,
        defaultReviewRoles: editRoles,
      });
      setLoadedTemplate(res.template);
      setEditModalOpen(false);
      await onRefresh();
      onNotify?.('Đã cập nhật cấu hình danh mục biểu mẫu.', 'success');
    } catch (e) {
      onNotify?.((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile) {
      onNotify?.('Vui lòng chọn file Word (.docx) từ máy tính.', 'warning');
      return;
    }
    const targetId = uploadModalMode === 'NEW' ? newCode.trim().toUpperCase() : loadedTemplate?.id || '';
    if (!targetId) return;
    setBusy(true);
    try {
      const res = await contractApi<{ template: LegalTemplate }>(`/api/contracts/templates/${targetId}`, {
        action: 'UPLOAD_DOCX',
        newId: targetId,
        base64Docx: uploadFile.base64,
        filename: uploadFile.name,
        name: uploadName,
        subject: uploadSubject,
        kind: uploadKind,
        category: uploadCategory,
        version: uploadVersion,
        description: uploadDescription,
        defaultReviewRoles: uploadRoles,
        note: uploadNote,
      });
      setUploadModalMode(null);
      await onRefresh();
      setSelectedId(res.template.id);
      setLoadedTemplate(res.template);
      onNotify?.(
        uploadModalMode === 'NEW'
          ? `Đã thêm mẫu "${res.template.name}" vào danh mục (${res.template.fields.length} trường điền).`
          : `Đã cập nhật phiên bản ${res.template.version} (${res.template.fields.length} trường điền).`,
        'success',
      );
    } catch (e) {
      onNotify?.((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleRole = (
    list: ('LEGAL' | 'FINANCE' | 'LEAD')[],
    setList: (next: ('LEGAL' | 'FINANCE' | 'LEAD')[]) => void,
    role: 'LEGAL' | 'FINANCE' | 'LEAD',
  ) => {
    if (list.includes(role)) {
      if (list.length > 1) setList(list.filter(r => r !== role));
    } else {
      setList([...list, role]);
    }
  };

  const dedupedFields = useMemo(() => uniqueFields(loadedTemplate), [loadedTemplate]);
  const activeCount = data.templates.filter(t => t.active !== false).length;
  const contractCount = data.templates.filter(t => t.kind === 'CONTRACT').length;
  const acceptanceCount = data.templates.filter(t => t.kind === 'ACCEPTANCE').length;

  return (
    <div className="space-y-5">
      {/* Thống kê tổng quan Danh mục Hợp đồng */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-surface border border-line rounded-xl px-4 py-3">
          <div className="flex items-center justify-between text-2xs text-ink-3">
            <span>Tổng biểu mẫu chuẩn</span>
            <FolderKanban className="w-4 h-4 text-accent" />
          </div>
          <p className="text-xl font-semibold text-ink mt-1 tabular-nums">{data.templates.length} mẫu</p>
          <p className="text-2xs text-ink-3 mt-0.5">Chuẩn hóa bởi Phòng Pháp chế</p>
        </div>

        <div className="bg-surface border border-line rounded-xl px-4 py-3">
          <div className="flex items-center justify-between text-2xs text-ink-3">
            <span>Đang có hiệu lực</span>
            <CheckCircle2 className="w-4 h-4 text-positive" />
          </div>
          <p className="text-xl font-semibold text-positive mt-1 tabular-nums">{activeCount}/{data.templates.length}</p>
          <p className="text-2xs text-ink-3 mt-0.5">Cho phép chuyên viên tạo mới</p>
        </div>

        <div className="bg-surface border border-line rounded-xl px-4 py-3">
          <div className="flex items-center justify-between text-2xs text-ink-3">
            <span>Mẫu Hợp đồng dịch vụ / CTV</span>
            <FileText className="w-4 h-4 text-info" />
          </div>
          <p className="text-xl font-semibold text-ink mt-1 tabular-nums">{contractCount} mẫu</p>
          <p className="text-2xs text-ink-3 mt-0.5">Cá nhân, HKD, Công ty, CTV tháng</p>
        </div>

        <div className="bg-surface border border-line rounded-xl px-4 py-3">
          <div className="flex items-center justify-between text-2xs text-ink-3">
            <span>Mẫu Biên bản nghiệm thu</span>
            <ShieldCheck className="w-4 h-4 text-warning" />
          </div>
          <p className="text-xl font-semibold text-ink mt-1 tabular-nums">{acceptanceCount} mẫu</p>
          <p className="text-2xs text-ink-3 mt-0.5">Đối chiếu nghiệm thu & tất toán</p>
        </div>
      </div>

      {/* Thanh công cụ lọc danh mục & thêm mẫu mới */}
      <Panel flush>
        <div className="p-4 border-b border-line flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[280px]">
            <FilterBar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: 'Tìm theo tên mẫu, mã mẫu (IND-HD, COM-HD...), đối tượng, phiên bản...',
              }}
              chips={<Chips items={categoryChips} value={categoryFilter} onChange={setCategoryFilter} />}
            />
          </div>
          {canManageCatalog && (
            <Button variant="primary" icon={Plus} onClick={() => openUploadModal('NEW')}>
              Thêm mẫu hợp đồng mới
            </Button>
          )}
        </div>

        <div className="grid lg:grid-cols-[340px_minmax(0,1fr)] divide-y lg:divide-y-0 lg:divide-x divide-line">
          {/* Cột trái: Danh sách mẫu hợp đồng theo danh mục */}
          <div className="max-h-[78vh] overflow-y-auto divide-y divide-line bg-canvas/40">
            {filteredTemplates.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="Không có mẫu hợp đồng khớp"
                  description="Thử chọn nhóm danh mục khác hoặc xóa từ khóa tìm kiếm."
                />
              </div>
            ) : (
              filteredTemplates.map(t => {
                const isSelected = t.id === selectedId;
                const cat: ContractCategory =
                  t.category ||
                  (t.id.startsWith('CTV-') ? 'CTV_FRAMEWORK' : t.kind === 'ACCEPTANCE' ? 'ACCEPTANCE_SETTLEMENT' : 'BOOKING_VIDEO');
                const isActive = t.active !== false;
                const roles = t.defaultReviewRoles?.length
                  ? t.defaultReviewRoles
                  : t.kind === 'ACCEPTANCE'
                    ? (['FINANCE', 'LEAD'] as const)
                    : (['LEGAL', 'FINANCE'] as const);
                const usedCount = data.records.filter(r => r.templateId === t.id).length;

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className={`w-full text-left p-3.5 transition-colors block space-y-2 ${
                      isSelected ? 'bg-accent/10 border-l-4 border-l-accent' : 'hover:bg-surface'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-semibold text-[13.5px] text-ink block truncate">{t.name}</span>
                        <span className="text-2xs text-ink-3 font-code">
                          Mã: {t.id} · {t.version} · {t.subject}
                        </span>
                      </div>
                      <Status tone={isActive ? 'positive' : 'neutral'}>
                        {isActive ? 'Đang áp dụng' : 'Ngừng áp dụng'}
                      </Status>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Status tone={CATEGORY_TONES[cat]}>{CATEGORY_LABELS[cat]}</Status>
                      {typeof t.fieldCount === 'number' && t.fieldCount > 0 && (
                        <span className="text-2xs px-2 py-0.5 rounded bg-surface border border-line text-ink-2 tabular-nums">
                          {t.fieldCount} vị trí điền
                        </span>
                      )}
                      {usedCount > 0 && (
                        <span className="text-2xs px-2 py-0.5 rounded bg-surface border border-line text-ink-2 tabular-nums">
                          {usedCount} hồ sơ đã tạo
                        </span>
                      )}
                    </div>

                    <div className="text-2xs text-ink-3 flex flex-wrap items-center gap-1">
                      <span>Cấp duyệt mặc định:</span>
                      {roles.map(r => (
                        <span key={r} className="font-medium text-ink-2">
                          {ROLE_LABEL[r]}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Cột phải: Chi tiết mẫu hợp đồng */}
          <div className="p-5 space-y-4 min-w-0 bg-surface">
            {loadingDetail && !loadedTemplate ? (
              <div className="py-16 text-center text-[13px] text-ink-3">
                Đang đọc cấu trúc file Word (.docx) và bóc tách các trường điền…
              </div>
            ) : !loadedTemplate ? (
              <EmptyState
                title="Chọn một mẫu hợp đồng bên trái"
                description="Xem bố cục trang A4, danh sách trường điền tự động và lịch sử phiên bản."
              />
            ) : (
              <>
                {/* Header của mẫu đang chọn */}
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-line">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-ink">{loadedTemplate.name}</h3>
                      <Status tone={loadedTemplate.active !== false ? 'positive' : 'neutral'}>
                        {loadedTemplate.active !== false ? 'Đang áp dụng' : 'Ngừng áp dụng'}
                      </Status>
                      <span className="text-xs font-code px-2 py-0.5 rounded bg-sunken border border-line text-ink-2">
                        {loadedTemplate.id} · {loadedTemplate.version}
                      </span>
                    </div>
                    <p className="text-xs text-ink-2">
                      {loadedTemplate.description ||
                        `Biểu mẫu ${loadedTemplate.kind === 'CONTRACT' ? 'Hợp đồng' : 'Biên bản nghiệm thu'} áp dụng cho đối tác ${loadedTemplate.subject}.`}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`/api/contracts/templates/${loadedTemplate.id}?download=1`}
                      className="inline-flex items-center gap-1.5 h-[32px] px-3 rounded-md border border-line-strong bg-surface text-xs font-medium text-ink hover:bg-sunken"
                    >
                      <Download className="w-3.5 h-3.5 text-ink-3" />
                      Tải mẫu .docx
                    </a>
                    {canManageCatalog && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={Upload}
                          onClick={() => openUploadModal('UPDATE', loadedTemplate)}
                        >
                          Cập nhật file .docx
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={Edit3}
                          onClick={() => openEditMeta(loadedTemplate)}
                        >
                          Sửa danh mục
                        </Button>
                      </>
                    )}
                    {canCreateContract && loadedTemplate.active !== false && (
                      <Button
                        size="sm"
                        variant="primary"
                        icon={FilePlus2}
                        onClick={() => onUseTemplate(loadedTemplate)}
                      >
                        Soạn theo mẫu này
                      </Button>
                    )}
                  </div>
                </div>

                {/* Chuyển đổi giữa 3 chế độ xem chi tiết mẫu */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Segmented
                    value={subTab}
                    onChange={setSubTab}
                    items={[
                      { key: 'PREVIEW', label: 'Xem văn bản mẫu (A4)' },
                      { key: 'FIELDS', label: `Cấu trúc trường điền (${dedupedFields.length})` },
                      { key: 'META', label: 'Cấu hình & Lịch sử phiên bản' },
                    ]}
                  />
                  <span className="text-2xs text-ink-3">
                    File gốc: <span className="font-code text-ink-2">{loadedTemplate.filename}</span>
                  </span>
                </div>

                {subTab === 'PREVIEW' && (
                  <ContractDocumentViewer
                    title={loadedTemplate.name}
                    templateName={`${loadedTemplate.name} (${loadedTemplate.version})`}
                    blocks={loadedTemplate.blocks || []}
                    paragraphs={loadedTemplate.paragraphs}
                    fields={loadedTemplate.fields}
                    values={{}}
                    downloadHref={`/api/contracts/templates/${loadedTemplate.id}?download=1`}
                    maxHeight="66vh"
                  />
                )}

                {subTab === 'FIELDS' && (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-sunken/70 border border-line px-3.5 py-2.5 text-xs text-ink-2 flex flex-wrap items-center justify-between gap-2">
                      <span>
                        Hệ thống tự động phát hiện <strong>{dedupedFields.length} trường thông tin</strong> (gồm{' '}
                        <strong>{dedupedFields.filter(f => f.required).length} trường bắt buộc</strong>) từ các bảng và đoạn văn trong file Word.
                      </span>
                      <span className="text-2xs text-ink-3">
                        Các trường có gắn nguồn sẽ tự động điền khi chọn Booking / KOC
                      </span>
                    </div>

                    {GROUP_ORDER.map(g => {
                      const groupFields = dedupedFields.filter(f => (f.group || 'OTHER') === g.key);
                      if (!groupFields.length) return null;
                      return (
                        <div key={g.key} className="border border-line rounded-xl overflow-hidden">
                          <div className="bg-sunken px-4 py-2.5 border-b border-line flex items-center justify-between">
                            <div>
                              <span className="text-xs font-semibold text-ink">{g.title}</span>
                            </div>
                            <span className="text-2xs font-medium text-ink-2">{groupFields.length} trường</span>
                          </div>
                          <div className="divide-y divide-line">
                            {groupFields.map(f => (
                              <div key={f.key} className="px-4 py-2.5 grid md:grid-cols-[220px_180px_minmax(0,1fr)_90px] gap-2 items-center text-xs">
                                <div className="min-w-0">
                                  <span className="font-medium text-ink block truncate">{f.title || f.label}</span>
                                  <span className="text-2xs text-ink-3 font-code">{f.key}</span>
                                </div>
                                <div>
                                  {f.source ? (
                                    <span className="inline-flex items-center gap-1 text-2xs px-2 py-0.5 rounded bg-accent-soft text-accent font-medium">
                                      <FileSpreadsheet className="w-3 h-3 shrink-0" />
                                      {SOURCE_LABELS[f.source] || f.source}
                                    </span>
                                  ) : (
                                    <span className="text-2xs text-ink-3">Nhập tay khi soạn</span>
                                  )}
                                </div>
                                <div className="text-2xs text-ink-2 truncate" title={f.context}>
                                  {f.context}
                                </div>
                                <div className="text-right">
                                  <Status tone={f.required ? 'warning' : 'neutral'}>
                                    {f.required ? 'Bắt buộc' : 'Tùy chọn'}
                                  </Status>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {subTab === 'META' && (
                  <div className="grid gap-5 lg:grid-cols-2">
                    <div className="border border-line rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-ink">
                        <Layers className="w-4 h-4 text-accent" />
                        <span>Thông tin phân loại danh mục</span>
                      </div>
                      <dl className="divide-y divide-line text-xs">
                        <div className="py-2 flex justify-between gap-4">
                          <dt className="text-ink-3">Mã danh mục biểu mẫu</dt>
                          <dd className="font-code font-medium text-ink">{loadedTemplate.id}</dd>
                        </div>
                        <div className="py-2 flex justify-between gap-4">
                          <dt className="text-ink-3">Nhóm danh mục</dt>
                          <dd className="font-medium text-ink">
                            {CATEGORY_LABELS[loadedTemplate.category || 'BOOKING_VIDEO']}
                          </dd>
                        </div>
                        <div className="py-2 flex justify-between gap-4">
                          <dt className="text-ink-3">Loại văn bản</dt>
                          <dd className="font-medium text-ink">
                            {loadedTemplate.kind === 'CONTRACT' ? 'Hợp đồng' : 'Biên bản nghiệm thu'}
                          </dd>
                        </div>
                        <div className="py-2 flex justify-between gap-4">
                          <dt className="text-ink-3">Chủ thể ký kết (Bên B)</dt>
                          <dd className="font-medium text-ink">{loadedTemplate.subject}</dd>
                        </div>
                        <div className="py-2 flex justify-between gap-4">
                          <dt className="text-ink-3">Luồng duyệt mặc định</dt>
                          <dd className="font-medium text-ink">
                            {(loadedTemplate.defaultReviewRoles || ['LEGAL', 'FINANCE']).map(r => ROLE_LABEL[r]).join(' → ')}
                          </dd>
                        </div>
                        <div className="py-2 flex justify-between gap-4">
                          <dt className="text-ink-3">Mã kiểm tra toàn vẹn (SHA-256)</dt>
                          <dd className="font-code text-2xs text-ink-2">{loadedTemplate.hash.slice(0, 20)}…</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="border border-line rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-ink">
                          <History className="w-4 h-4 text-accent" />
                          <span>Lịch sử phiên bản biểu mẫu</span>
                        </div>
                        <span className="text-2xs text-ink-3">Hợp đồng cũ luôn giữ nguyên bản mẫu lúc tạo</span>
                      </div>
                      <ul className="divide-y divide-line text-xs">
                        {(loadedTemplate.history || []).map((h, i) => (
                          <li key={`${h.hash}-${i}`} className="py-2.5 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-ink">
                                {h.version} {i === 0 && <span className="text-2xs text-positive font-normal">(Hiện hành)</span>}
                              </span>
                              <span className="text-2xs text-ink-3 tabular-nums">{formatDate(h.updatedAt)}</span>
                            </div>
                            <p className="text-2xs text-ink-2">{h.note || 'Cập nhật biểu mẫu pháp chế'}</p>
                            <p className="text-2xs text-ink-3 font-code truncate">
                              {h.filename} · Người ban hành: {h.updatedBy} · #{h.hash.slice(0, 10)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </Panel>

      {/* Modal sửa thông tin danh mục */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Cấu hình danh mục · ${loadedTemplate?.id || ''}`}
        description="Phân nhóm danh mục, cập nhật tên hiển thị, trạng thái hiệu lực và các cấp phê duyệt mặc định."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditModalOpen(false)}>Hủy</Button>
            <Button variant="primary" disabled={busy || !editName.trim()} onClick={handleSaveMeta}>
              Lưu cấu hình danh mục
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <Field label="Tên biểu mẫu hợp đồng" htmlFor="cat-edit-name">
            <Input id="cat-edit-name" value={editName} onChange={e => setEditName(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nhóm danh mục" htmlFor="cat-edit-category">
              <Select
                id="cat-edit-category"
                value={editCategory}
                onChange={e => setEditCategory(e.target.value as ContractCategory)}
              >
                {(Object.keys(CATEGORY_LABELS) as ContractCategory[]).map(k => (
                  <option key={k} value={k}>{CATEGORY_LABELS[k]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Loại văn bản" htmlFor="cat-edit-kind">
              <Select
                id="cat-edit-kind"
                value={editKind}
                onChange={e => setEditKind(e.target.value as 'CONTRACT' | 'ACCEPTANCE')}
              >
                <option value="CONTRACT">Hợp đồng</option>
                <option value="ACCEPTANCE">Biên bản nghiệm thu</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Đối tượng ký (Bên B)" htmlFor="cat-edit-subject">
              <Select id="cat-edit-subject" value={editSubject} onChange={e => setEditSubject(e.target.value)}>
                <option value="Cá nhân">Cá nhân</option>
                <option value="Hộ kinh doanh">Hộ kinh doanh</option>
                <option value="Công ty">Công ty</option>
                <option value="CTV tháng">CTV tháng</option>
              </Select>
            </Field>
            <Field label="Mã phiên bản" htmlFor="cat-edit-version">
              <Input id="cat-edit-version" value={editVersion} onChange={e => setEditVersion(e.target.value)} placeholder="VD: Ver102026" />
            </Field>
          </div>
          <Field label="Mô tả hướng dẫn sử dụng mẫu" htmlFor="cat-edit-desc">
            <Textarea id="cat-edit-desc" rows={2} value={editDescription} onChange={e => setEditDescription(e.target.value)} />
          </Field>
          <Field label="Các cấp duyệt bắt buộc mặc định">
            <div className="flex flex-wrap gap-2 pt-1">
              {(['LEGAL', 'FINANCE', 'LEAD'] as const).map(role => {
                const checked = editRoles.includes(role);
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(editRoles, setEditRoles, role)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      checked ? 'bg-accent-soft border-accent text-accent' : 'bg-surface border-line text-ink-2'
                    }`}
                  >
                    {checked ? '✓ ' : ''}{ROLE_LABEL[role]}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Trạng thái áp dụng">
            <Segmented
              value={editActive ? 'ACTIVE' : 'INACTIVE'}
              onChange={v => setEditActive(v === 'ACTIVE')}
              items={[
                { key: 'ACTIVE', label: 'Đang áp dụng (Cho phép tạo hợp đồng)' },
                { key: 'INACTIVE', label: 'Ngừng áp dụng (Khóa tạo mới)' },
              ]}
            />
          </Field>
        </div>
      </Modal>

      {/* Modal tải file .docx (Tạo mới hoặc cập nhật phiên bản) */}
      <Modal
        open={Boolean(uploadModalMode)}
        onClose={() => setUploadModalMode(null)}
        title={uploadModalMode === 'NEW' ? 'Thêm mẫu hợp đồng mới vào danh mục' : `Cập nhật file .docx · ${loadedTemplate?.name || ''}`}
        description="Tải tệp Word (.docx) chuẩn của Pháp chế lên. Hệ thống tự động bóc tách bảng biểu, đoạn văn và các vị trí cần điền."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setUploadModalMode(null)}>Hủy</Button>
            <Button variant="primary" disabled={busy || !uploadFile || !uploadName.trim()} onClick={handleUploadSubmit}>
              {uploadModalMode === 'NEW' ? 'Ban hành mẫu mới' : 'Lưu phiên bản mới'}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          {uploadModalMode === 'NEW' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mã mẫu (duy nhất)" htmlFor="up-code" hint="VD: LIV-HD, PL-IND, KOC-BBNT">
                <Input id="up-code" value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())} placeholder="LIV-HD" />
              </Field>
              <Field label="Phiên bản" htmlFor="up-ver">
                <Input id="up-ver" value={uploadVersion} onChange={e => setUploadVersion(e.target.value)} placeholder="Ver102026" />
              </Field>
            </div>
          )}

          {uploadModalMode === 'UPDATE' && (
            <Field label="Phiên bản mới" htmlFor="up-ver-update" hint="Các hợp đồng đã tạo bằng phiên bản cũ vẫn giữ nguyên bản mẫu cũ.">
              <Input id="up-ver-update" value={uploadVersion} onChange={e => setUploadVersion(e.target.value)} placeholder="Ver102026" />
            </Field>
          )}

          <Field label="Tên mẫu hợp đồng" htmlFor="up-name">
            <Input id="up-name" value={uploadName} onChange={e => setUploadName(e.target.value)} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Nhóm danh mục" htmlFor="up-cat">
              <Select id="up-cat" value={uploadCategory} onChange={e => setUploadCategory(e.target.value as ContractCategory)}>
                {(Object.keys(CATEGORY_LABELS) as ContractCategory[]).map(k => (
                  <option key={k} value={k}>{CATEGORY_LABELS[k]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Đối tượng ký (Bên B)" htmlFor="up-subject">
              <Select id="up-subject" value={uploadSubject} onChange={e => setUploadSubject(e.target.value)}>
                <option value="Cá nhân">Cá nhân</option>
                <option value="Hộ kinh doanh">Hộ kinh doanh</option>
                <option value="Công ty">Công ty</option>
                <option value="CTV tháng">CTV tháng</option>
              </Select>
            </Field>
          </div>

          <Field label="Tệp Word (.docx) ban hành">
            <div className="border-2 border-dashed border-line-strong rounded-xl p-4 text-center bg-canvas/50 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileSelect}
                className="hidden"
              />
              {uploadFile ? (
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-surface border border-line text-xs">
                  <span className="font-medium text-ink truncate">{uploadFile.name}</span>
                  <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()}>
                    Chọn file khác
                  </Button>
                </div>
              ) : (
                <div>
                  <Button size="sm" variant="secondary" icon={Upload} onClick={() => fileInputRef.current?.click()}>
                    Chọn file .docx từ máy tính
                  </Button>
                  <p className="text-2xs text-ink-3 mt-1.5">
                    Hỗ trợ định dạng Word (.docx). Các vị trí bỏ trống (...) hoặc trong ngoặc vuông [...] sẽ tự động nhận diện làm trường điền.
                  </p>
                </div>
              )}
            </div>
          </Field>

          <Field label="Ghi chú ban hành phiên bản" htmlFor="up-note">
            <Input id="up-note" value={uploadNote} onChange={e => setUploadNote(e.target.value)} placeholder="Lý do cập nhật hoặc điều khoản thay đổi..." />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
