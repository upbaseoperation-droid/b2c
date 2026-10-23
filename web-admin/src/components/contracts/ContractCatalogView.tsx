'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  Edit3,
  FilePlus2,
  FileSpreadsheet,
  History,
  Layers,
  Plus,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import type { ContractCategory, LegalTemplate } from '../../lib/contracts/types';
import { formatDate } from '../../lib/format';
import {
  ActionMenu,
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
import { contractApi, type ContractBootstrap } from './api';
import { ContractDocumentViewer } from './ContractDocumentViewer';
import { GROUP_ORDER, ROLE_LABEL, uniqueFields } from './contractUi';

export const CATEGORY_LABELS: Record<ContractCategory, string> = {
  BOOKING_VIDEO: 'Hợp đồng Booking Video',
  ACCEPTANCE_SETTLEMENT: 'Nghiệm thu & Tất toán',
  CTV_FRAMEWORK: 'Hợp đồng nguyên tắc CTV',
  LIVESTREAM_APPENDIX: 'Phụ lục & Livestream',
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
  const canCreateContract = data.actor.roles.some(r => ['CREATOR', 'LEAD'].includes(r));

  const [categoryFilter, setCategoryFilter] = useState<'ALL' | ContractCategory>('ALL');
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'GLOBAL' | 'KOC_CUSTOM'>('ALL');
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
  const [editExemptLegalReview, setEditExemptLegalReview] = useState(true);
  const [editScope, setEditScope] = useState<'GLOBAL' | 'KOC_CUSTOM'>('GLOBAL');
  const [editKocId, setEditKocId] = useState('');
  const [editKocName, setEditKocName] = useState('');
  const [editCustomType, setEditCustomType] = useState<'UPBASE_AMENDED' | 'KOC_FORM'>('UPBASE_AMENDED');
  const [editLegalNotes, setEditLegalNotes] = useState('');

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
  const [uploadExemptLegalReview, setUploadExemptLegalReview] = useState(true);
  const [uploadScope, setUploadScope] = useState<'GLOBAL' | 'KOC_CUSTOM'>('GLOBAL');
  const [uploadKocId, setUploadKocId] = useState('');
  const [uploadKocName, setUploadKocName] = useState('');
  const [uploadCustomType, setUploadCustomType] = useState<'UPBASE_AMENDED' | 'KOC_FORM'>('UPBASE_AMENDED');
  const [uploadLegalNotes, setUploadLegalNotes] = useState('');
  const [uploadFile, setUploadFile] = useState<{ name: string; base64: string } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.templates.filter(t => {
      const scope = t.scope || 'GLOBAL';
      if (scopeFilter !== 'ALL' && scope !== scopeFilter) return false;
      const cat = t.category || (t.id.startsWith('CTV-') ? 'CTV_FRAMEWORK' : t.kind === 'ACCEPTANCE' ? 'ACCEPTANCE_SETTLEMENT' : 'BOOKING_VIDEO');
      if (categoryFilter !== 'ALL' && cat !== categoryFilter) return false;
      if (!q) return true;
      return `${t.id} ${t.name} ${t.subject} ${t.version} ${t.filename} ${t.description || ''} ${t.kocName || ''} ${t.kocId || ''} ${t.legalNotes || ''}`.toLowerCase().includes(q);
    });
  }, [data.templates, categoryFilter, scopeFilter, search]);

  if (!filteredTemplates.some(t => t.id === selectedId) && filteredTemplates[0] && selectedId !== filteredTemplates[0].id) {
    setSelectedId(filteredTemplates[0].id);
  }

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setLoadingDetail(true);
    });
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

  const scopeChips = useMemo(() => [
    { key: 'ALL' as const, label: 'Tất cả nguồn', count: data.templates.length },
    { key: 'GLOBAL' as const, label: 'Mẫu chuẩn Upbase', count: data.templates.filter(t => (t.scope || 'GLOBAL') === 'GLOBAL').length },
    { key: 'KOC_CUSTOM' as const, label: 'Mẫu duyệt theo KOC', count: data.templates.filter(t => t.scope === 'KOC_CUSTOM').length },
  ], [data.templates]);

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
    setEditExemptLegalReview(tpl.exemptLegalReview !== false);
    setEditScope(tpl.scope || 'GLOBAL');
    setEditKocId(tpl.kocId || '');
    setEditKocName(tpl.kocName || '');
    setEditCustomType(tpl.customType || 'UPBASE_AMENDED');
    setEditLegalNotes(tpl.legalNotes || '');
    setEditModalOpen(true);
  };

  const openUploadModal = (mode: 'NEW' | 'UPDATE', tpl?: LegalTemplate, presetScope?: 'GLOBAL' | 'KOC_CUSTOM') => {
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
      setUploadExemptLegalReview(tpl.exemptLegalReview !== false);
      setUploadScope(tpl.scope || 'GLOBAL');
      setUploadKocId(tpl.kocId || '');
      setUploadKocName(tpl.kocName || '');
      setUploadCustomType(tpl.customType || 'UPBASE_AMENDED');
      setUploadLegalNotes(tpl.legalNotes || '');
      setUploadNote('Cập nhật biểu mẫu theo quy định pháp chế mới');
    } else if (presetScope === 'KOC_CUSTOM') {
      setNewCode('KOC-');
      setUploadName('Mẫu hợp đồng riêng · ');
      setUploadSubject('Cá nhân');
      setUploadKind('CONTRACT');
      setUploadCategory('BOOKING_VIDEO');
      setUploadVersion('Ver102026-KOC');
      setUploadDescription('Mẫu hợp đồng theo form riêng của KOC / Agency đã được Pháp chế rà soát.');
      setUploadRoles(['LEGAL', 'FINANCE']);
      setUploadExemptLegalReview(true);
      setUploadScope('KOC_CUSTOM');
      setUploadKocId('');
      setUploadKocName('');
      setUploadCustomType('KOC_FORM');
      setUploadLegalNotes('');
      setUploadNote('Tải lên mẫu hợp đồng riêng của KOC');
    } else {
      setNewCode('LIV-HD');
      setUploadName('Hợp đồng dịch vụ Livestream · Cá nhân');
      setUploadSubject('Cá nhân');
      setUploadKind('CONTRACT');
      setUploadCategory('LIVESTREAM_APPENDIX');
      setUploadVersion('Ver102026');
      setUploadDescription('Mẫu hợp đồng áp dụng cho phiên phát sóng trực tiếp (Livestream) trên sàn TMĐT.');
      setUploadRoles(['LEGAL', 'FINANCE', 'LEAD']);
      setUploadExemptLegalReview(true);
      setUploadScope('GLOBAL');
      setUploadKocId('');
      setUploadKocName('');
      setUploadCustomType('UPBASE_AMENDED');
      setUploadLegalNotes('');
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
        exemptLegalReview: editExemptLegalReview,
        scope: editScope,
        kocId: editScope === 'KOC_CUSTOM' ? editKocId.trim() : undefined,
        kocName: editScope === 'KOC_CUSTOM' ? editKocName.trim() : undefined,
        customType: editScope === 'KOC_CUSTOM' ? editCustomType : undefined,
        legalNotes: editScope === 'KOC_CUSTOM' ? editLegalNotes.trim() : undefined,
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

  const handleDeleteTemplate = async () => {
    if (!loadedTemplate) return;
    const isUsed = data.records.some(r => r.templateId === loadedTemplate.id);
    if (isUsed) {
      onNotify?.('Không thể xóa biểu mẫu đã phát sinh hồ sơ hợp đồng. Vui lòng chuyển trạng thái sang Tạm dừng.', 'error');
      setDeleteConfirmOpen(false);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/contracts/templates/${loadedTemplate.id}`, {
        method: 'DELETE',
        headers: { credentials: 'same-origin' },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Lỗi khi xóa biểu mẫu.');
      setDeleteConfirmOpen(false);
      await onRefresh();
      onNotify?.(`Đã xóa biểu mẫu "${loadedTemplate.name}".`, 'success');
      const remaining = data.templates.filter(t => t.id !== loadedTemplate.id);
      if (remaining[0]) setSelectedId(remaining[0].id);
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
        exemptLegalReview: uploadExemptLegalReview,
        scope: uploadScope,
        kocId: uploadScope === 'KOC_CUSTOM' ? uploadKocId.trim() : undefined,
        kocName: uploadScope === 'KOC_CUSTOM' ? uploadKocName.trim() : undefined,
        customType: uploadScope === 'KOC_CUSTOM' ? uploadCustomType : undefined,
        legalNotes: uploadScope === 'KOC_CUSTOM' ? uploadLegalNotes.trim() : undefined,
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
  const kocCustomCount = data.templates.filter(t => t.scope === 'KOC_CUSTOM').length;

  return (
    <div className="space-y-4">
      <Panel flush>
        <div className="p-3.5 border-b border-line flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-0 w-full sm:min-w-[240px]">
            <FilterBar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: 'Tìm tên mẫu, mã (IND-HD, COM-HD...), đối tượng...',
              }}
              filters={
                kocCustomCount > 0 ? (
                  <Select
                    value={scopeFilter}
                    onChange={e => setScopeFilter(e.target.value as 'ALL' | 'GLOBAL' | 'KOC_CUSTOM')}
                    className="w-auto min-w-[160px]"
                    aria-label="Nguồn biểu mẫu"
                  >
                    {scopeChips.map(s => (
                      <option key={s.key} value={s.key}>
                        {s.label} ({s.count})
                      </option>
                    ))}
                  </Select>
                ) : undefined
              }
              chips={<Chips items={categoryChips.filter(c => c.key === 'ALL' || c.count > 0)} value={categoryFilter} onChange={setCategoryFilter} />}
            />
          </div>
          {(canManageCatalog || canCreateContract) && (
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" icon={Upload} onClick={() => openUploadModal('NEW', undefined, 'KOC_CUSTOM')}>
                Tải mẫu KOC (.docx)
              </Button>
              {canManageCatalog && (
                <Button size="sm" variant="secondary" icon={Plus} onClick={() => openUploadModal('NEW')}>
                  Thêm mẫu mới
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[290px_minmax(0,1fr)] divide-y lg:divide-y-0 lg:divide-x divide-line">
          {/* Cột trái: Danh sách mẫu hợp đồng thu gọn */}
          <div className="max-h-[78vh] overflow-y-auto divide-y divide-line bg-canvas/30">
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
                const isActive = t.active !== false;

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className={`w-full text-left px-3.5 py-2.5 transition-colors block space-y-1 ${
                      isSelected ? 'bg-accent/10 border-l-3 border-l-accent' : 'hover:bg-surface'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[13px] text-ink truncate">{t.name}</span>
                      <span className="shrink-0 rounded bg-sunken px-1.5 py-0.5 text-2xs font-code text-ink-2">
                        {t.id}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-1 text-2xs text-ink-3">
                      <span>
                        {t.subject}
                        {typeof t.fieldCount === 'number' && t.fieldCount > 0 ? ` · ${t.fieldCount} ô điền` : ''}
                      </span>
                      {t.scope === 'KOC_CUSTOM' ? (
                        <span className="inline-flex items-center gap-0.5 font-medium text-accent">
                          <Star className="w-2.5 h-2.5 shrink-0" /> {t.kocName || t.kocId}
                        </span>
                      ) : !isActive ? (
                        <span className="text-ink-3">Ngừng áp dụng</span>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Cột phải: Chi tiết mẫu hợp đồng */}
          <div className="p-4 space-y-3.5 min-w-0 bg-surface">
            {loadingDetail && !loadedTemplate ? (
              <div className="py-16 text-center text-[13px] text-ink-3">
                Đang tải biểu mẫu…
              </div>
            ) : !loadedTemplate ? (
              <EmptyState title="Chọn một mẫu hợp đồng bên trái" />
            ) : (
              <>
                {/* Thanh tiêu đề & thao tác trên 1 hàng gọn */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-line">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <h3 className="text-[15px] font-semibold text-ink">{loadedTemplate.name}</h3>
                    <span className="text-2xs font-code text-ink-3">
                      {loadedTemplate.id} · {loadedTemplate.version}
                    </span>
                    <Status tone={loadedTemplate.exemptLegalReview !== false ? 'positive' : 'warning'}>
                      {loadedTemplate.exemptLegalReview !== false ? 'Miễn duyệt Pháp chế' : 'Cần Pháp chế duyệt'}
                    </Status>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Segmented
                      value={subTab}
                      onChange={setSubTab}
                      items={[
                        { key: 'PREVIEW', label: 'Văn bản A4' },
                        { key: 'FIELDS', label: `Trường điền (${dedupedFields.length})` },
                        { key: 'META', label: 'Cấu hình' },
                      ]}
                    />
                    <a
                      href={`/api/contracts/templates/${loadedTemplate.id}?download=1`}
                      className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-line-strong bg-surface text-xs font-medium text-ink hover:bg-sunken"
                    >
                      <Download className="w-3.5 h-3.5 text-ink-3" />
                      Tải .docx
                    </a>
                    {canCreateContract && loadedTemplate.active !== false && (
                      <Button
                        size="sm"
                        variant="primary"
                        icon={FilePlus2}
                        onClick={() => onUseTemplate(loadedTemplate)}
                      >
                        Soạn hợp đồng
                      </Button>
                    )}
                    {canManageCatalog && (
                      <ActionMenu
                        items={[
                          {
                            label: 'Cập nhật file Word (.docx)',
                            icon: Upload,
                            onSelect: () => openUploadModal('UPDATE', loadedTemplate),
                          },
                          {
                            label: 'Sửa cấu hình biểu mẫu',
                            icon: Edit3,
                            onSelect: () => openEditMeta(loadedTemplate),
                          },
                          {
                            label: 'Xóa biểu mẫu',
                            icon: Trash2,
                            danger: true,
                            onSelect: () => setDeleteConfirmOpen(true),
                          },
                        ]}
                      />
                    )}
                  </div>
                </div>

                {loadedTemplate.scope === 'KOC_CUSTOM' && loadedTemplate.legalNotes && (
                  <div className="rounded-lg border border-accent/30 bg-accent-soft/30 px-3 py-2 text-xs text-ink">
                    <span className="font-semibold text-accent">Lưu ý Pháp chế ({loadedTemplate.kocName || loadedTemplate.kocId}): </span>
                    {loadedTemplate.legalNotes}
                  </div>
                )}

                {subTab === 'PREVIEW' && (
                  <ContractDocumentViewer
                    title={loadedTemplate.name}
                    templateName={`${loadedTemplate.name} (${loadedTemplate.version})`}
                    blocks={loadedTemplate.blocks || []}
                    paragraphs={loadedTemplate.paragraphs}
                    fields={loadedTemplate.fields}
                    values={{}}
                    maxHeight="70vh"
                    isTemplatePreview
                  />
                )}

                {subTab === 'FIELDS' && (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-sunken/70 border border-line px-3.5 py-2 text-xs text-ink-2 flex flex-wrap items-center justify-between gap-2">
                      <span>
                        <strong>{dedupedFields.length} trường thông tin</strong> ({dedupedFields.filter(f => f.required).length} bắt buộc)
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
                              <div key={f.key} className="px-4 py-2.5 grid lg:grid-cols-[220px_180px_minmax(0,1fr)_90px] gap-2 items-center text-xs">
                                <div className="min-w-0">
                                  <span className="font-medium text-ink block truncate">{f.title || f.label}</span>
                                  <span className="text-2xs text-ink-3 font-code">{f.key}</span>
                                </div>
                                <div>
                                  {f.source ? (
                                    <span className="inline-flex items-center gap-1 text-2xs text-accent font-medium">
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
                                  <span className={`text-2xs font-medium ${f.required ? 'text-warning' : 'text-ink-3'}`}>
                                    {f.required ? 'Bắt buộc' : 'Tùy chọn'}
                                  </span>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <Field label="Mô tả mẫu hợp đồng" htmlFor="cat-edit-desc">
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
          <Field label="Phạm vi áp dụng">
            <Segmented
              value={editScope}
              onChange={v => setEditScope(v as 'GLOBAL' | 'KOC_CUSTOM')}
              items={[
                { key: 'GLOBAL', label: 'Mẫu chuẩn Upbase (dùng chung)' },
                { key: 'KOC_CUSTOM', label: 'Mẫu riêng theo KOC/KOL' },
              ]}
            />
          </Field>

          {editScope === 'KOC_CUSTOM' && (
            <div className="rounded-lg border border-accent/30 bg-accent-soft/30 p-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Mã KOC / ID kênh *">
                  <Input value={editKocId} onChange={e => setEditKocId(e.target.value)} placeholder="VD: koc-1 hoặc tên kênh" required />
                </Field>
                <Field label="Tên KOC / Đối tác *">
                  <Input value={editKocName} onChange={e => setEditKocName(e.target.value)} placeholder="VD: Phạm Ngọc Hiếu An (Uri)" required />
                </Field>
              </div>
              <Field label="Loại điều khoản chỉnh sửa">
                <Select value={editCustomType} onChange={e => setEditCustomType(e.target.value as 'UPBASE_AMENDED' | 'KOC_FORM')}>
                  <option value="UPBASE_AMENDED">Chỉnh sửa điều khoản trên mẫu Upbase</option>
                  <option value="KOC_FORM">Sử dụng form mẫu riêng của KOC / Agency</option>
                </Select>
              </Field>
              <Field label="Lưu ý & Thỏa thuận của Pháp chế cho KOC này">
                <Textarea
                  rows={2}
                  value={editLegalNotes}
                  onChange={e => setEditLegalNotes(e.target.value)}
                  placeholder="VD: KOC chỉ đồng ý thanh toán trong 7 ngày; thời hạn cấp quyền Spark Ads tối đa 60 ngày..."
                />
              </Field>
            </div>
          )}

          <div className="rounded-lg border border-line bg-sunken/40 p-3 space-y-1">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={editExemptLegalReview}
                onChange={e => setEditExemptLegalReview(e.target.checked)}
                className="mt-0.5 rounded border-line"
              />
              <div>
                <span className="font-medium text-[13px] text-ink block">
                  {editScope === 'KOC_CUSTOM' ? 'Mẫu KOC đã duyệt: Miễn bước thẩm định lại của Pháp chế' : 'Mẫu chuẩn Upbase: Miễn bước duyệt Pháp chế'}
                </span>
              </div>
            </label>
          </div>
        </div>
      </Modal>

      {/* Modal tải file .docx (Tạo mới hoặc cập nhật phiên bản) */}
      <Modal
        open={Boolean(uploadModalMode)}
        onClose={() => setUploadModalMode(null)}
        title={uploadModalMode === 'NEW' ? (uploadScope === 'KOC_CUSTOM' ? 'Tải lên mẫu hợp đồng riêng của KOC (.docx)' : 'Thêm mẫu hợp đồng mới') : `Cập nhật file .docx · ${loadedTemplate?.name || ''}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setUploadModalMode(null)}>Hủy</Button>
            <Button variant="primary" disabled={busy || !uploadFile || !uploadName.trim()} onClick={handleUploadSubmit}>
              {uploadModalMode === 'NEW' ? 'Lưu vào danh mục mẫu' : 'Lưu phiên bản mới'}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          {uploadModalMode === 'NEW' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Mã mẫu (duy nhất)" htmlFor="up-code">
                <Input id="up-code" value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())} placeholder="VD: KOC-CHANH, LIV-HD" />
              </Field>
              <Field label="Phiên bản" htmlFor="up-ver">
                <Input id="up-ver" value={uploadVersion} onChange={e => setUploadVersion(e.target.value)} placeholder="Ver102026" />
              </Field>
            </div>
          )}

          {uploadModalMode === 'UPDATE' && (
            <Field label="Phiên bản mới" htmlFor="up-ver-update">
              <Input id="up-ver-update" value={uploadVersion} onChange={e => setUploadVersion(e.target.value)} placeholder="Ver102026" />
            </Field>
          )}

          <Field label="Tên mẫu hợp đồng" htmlFor="up-name">
            <Input id="up-name" value={uploadName} onChange={e => setUploadName(e.target.value)} />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                </div>
              )}
            </div>
          </Field>

          <Field label="Phạm vi áp dụng">
            <Segmented
              value={uploadScope}
              onChange={v => setUploadScope(v as 'GLOBAL' | 'KOC_CUSTOM')}
              items={[
                { key: 'GLOBAL', label: 'Mẫu chuẩn Upbase (dùng chung)' },
                { key: 'KOC_CUSTOM', label: 'Mẫu riêng theo KOC/KOL' },
              ]}
            />
          </Field>

          {uploadScope === 'KOC_CUSTOM' && (
            <div className="rounded-lg border border-accent/30 bg-accent-soft/30 p-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Mã KOC / ID kênh *">
                  <Input
                    value={uploadKocId}
                    onChange={e => {
                      const val = e.target.value;
                      setUploadKocId(val);
                      if (newCode === 'KOC-' || newCode.startsWith('KOC-')) {
                        const slug = val.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 18);
                        if (slug) setNewCode(`KOC-${slug}`);
                      }
                    }}
                    placeholder="VD: koc-1 hoặc tên kênh"
                    required
                  />
                </Field>
                <Field label="Tên KOC / Đối tác *">
                  <Input
                    value={uploadKocName}
                    onChange={e => {
                      const val = e.target.value;
                      setUploadKocName(val);
                      if (uploadName.startsWith('Mẫu hợp đồng riêng ·')) {
                        setUploadName(`Mẫu hợp đồng riêng · ${val}`);
                      }
                    }}
                    placeholder="VD: Phạm Ngọc Hiếu An (Uri)"
                    required
                  />
                </Field>
              </div>
              <Field label="Loại điều khoản chỉnh sửa">
                <Select value={uploadCustomType} onChange={e => setUploadCustomType(e.target.value as 'UPBASE_AMENDED' | 'KOC_FORM')}>
                  <option value="KOC_FORM">Sử dụng form mẫu riêng của KOC / Agency</option>
                  <option value="UPBASE_AMENDED">Chỉnh sửa điều khoản trên mẫu Upbase</option>
                </Select>
              </Field>
              <Field label="Lưu ý & Thỏa thuận của Pháp chế cho KOC này">
                <Textarea
                  rows={2}
                  value={uploadLegalNotes}
                  onChange={e => setUploadLegalNotes(e.target.value)}
                  placeholder="VD: KOC chỉ đồng ý thanh toán trong 7 ngày; thời hạn cấp quyền Spark Ads tối đa 60 ngày..."
                />
              </Field>
            </div>
          )}

          <div className="rounded-lg border border-line bg-sunken/40 p-3 space-y-1">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={uploadExemptLegalReview}
                onChange={e => setUploadExemptLegalReview(e.target.checked)}
                className="mt-0.5 rounded border-line"
              />
              <div>
                <span className="font-medium text-[13px] text-ink block">
                  {uploadScope === 'KOC_CUSTOM' ? 'Mẫu KOC đã duyệt: Miễn bước thẩm định lại của Pháp chế' : 'Mẫu chuẩn Upbase: Miễn bước duyệt Pháp chế'}
                </span>
              </div>
            </label>
          </div>

          <Field label="Ghi chú ban hành phiên bản" htmlFor="up-note">
            <Input id="up-note" value={uploadNote} onChange={e => setUploadNote(e.target.value)} placeholder="Lý do cập nhật hoặc điều khoản thay đổi..." />
          </Field>
        </div>
      </Modal>

      {/* Modal xác nhận xóa biểu mẫu */}
      <Modal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Xác nhận xóa biểu mẫu"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteConfirmOpen(false)}>Hủy</Button>
            <Button variant="danger" disabled={busy} onClick={handleDeleteTemplate}>
              Xác nhận xóa
            </Button>
          </div>
        }
      >
        <p className="text-xs text-ink-2">
          Lưu ý: Chỉ có thể xóa biểu mẫu chưa có hồ sơ hợp đồng nào liên kết. Nếu biểu mẫu đã được sử dụng, vui lòng chuyển trạng thái sang &ldquo;Ngừng áp dụng&rdquo;.
        </p>
      </Modal>
    </div>
  );
}
