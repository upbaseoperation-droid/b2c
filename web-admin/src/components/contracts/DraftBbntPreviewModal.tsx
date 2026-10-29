'use client';

import React, { useMemo, useState } from 'react';
import { Camera, CheckCircle2, Download, ExternalLink, FileCheck, FileCode2, RefreshCw, Send, Trash2 } from 'lucide-react';
import type { BookingDealItem, KocItem } from '../../lib/types';
import type {
  AcceptanceScreenshotItem,
  ContractRecord,
  VideoAcceptanceInspectionMeta,
} from '../../lib/contracts/types';
import { OFFICIAL_TEMPLATES_SNAPSHOT } from '../../lib/contracts/builtInTemplatesSnapshot';
import {
  buildStableContractCode,
  enrichTemplateWithSignFlow,
} from '../../lib/contracts/contractSystemRules';
import { findSavedScreenshotsForContext } from '../../lib/acceptanceScreenshotStore';
import { formatNumber } from '../../lib/format';
import { Button, Field, Input, Modal, Select, Status } from '../ui';
import { contractApi } from './api';
import { ContractDocumentViewer } from './ContractDocumentViewer';
import { VideoProductScreenshotModal } from './VideoProductScreenshotModal';
import {
  SOW_JOBS_META_KEY,
  SOW_TASK_DELIVERABLE_INFO,
  aggregateMultiJobAcceptanceBreakdown,
  buildDealSowJobTables,
  computeSigningProgress,
  dateTime,
  formatMoneyInput,
  isAcceptance,
  partnerName,
  prefill,
  syncValuesFromJobAcceptanceBreakdown,
  templateFor,
  uniqueFields,
  type JobAcceptanceAddonRow,
  type SowJobTableDraft,
} from './contractUi';

export interface DraftBbntPreviewModalProps {
  open: boolean;
  onClose: () => void;
  deal: BookingDealItem | null;
  koc?: KocItem;
  existingRecords?: ContractRecord[];
  onSavedRecord?: (record: ContractRecord) => void;
  onOpenFullEditor?: (deal: BookingDealItem) => void;
}

export function DraftBbntPreviewModal({
  open,
  onClose,
  deal,
  koc,
  existingRecords = [],
  onSavedRecord,
  onOpenFullEditor,
}: DraftBbntPreviewModalProps) {
  const allSnapshotTemplates = useMemo(() => Object.values(OFFICIAL_TEMPLATES_SNAPSHOT), []);

  const parentRecord = useMemo(() => {
    if (!deal) return undefined;
    const sow = existingRecords.find(
      r =>
        r.templateId.endsWith('-SOW') &&
        (r.dealId === deal.id || (deal.dealCode && r.dealCode === deal.dealCode)),
    );
    if (sow) return sow;
    return existingRecords.find(
      r =>
        !isAcceptance(r.templateId) &&
        (r.dealId === deal.id ||
          (deal.dealCode && r.dealCode === deal.dealCode) ||
          (koc?.id && r.kocId === koc.id)),
    );
  }, [deal, koc, existingRecords]);

  const existingBbntFromProps = useMemo(() => {
    if (!deal) return undefined;
    return existingRecords.find(
      r =>
        isAcceptance(r.templateId) &&
        (r.dealId === deal.id || (deal.dealCode && r.dealCode === deal.dealCode)),
    );
  }, [deal, existingRecords]);

  const [savedContractRecord, setSavedContractRecord] = useState<ContractRecord | null>(null);
  const activeBbntRecord = savedContractRecord || existingBbntFromProps;

  const templateId = useMemo(() => {
    if (activeBbntRecord?.templateId) return activeBbntRecord.templateId;
    if (!deal) return 'IND-VID-BBNT';
    return templateFor(koc, 'ACCEPTANCE', deal, allSnapshotTemplates, 'BBNT');
  }, [activeBbntRecord, deal, koc, allSnapshotTemplates]);

  const template = useMemo(
    () =>
      enrichTemplateWithSignFlow(
        OFFICIAL_TEMPLATES_SNAPSHOT[templateId] || OFFICIAL_TEMPLATES_SNAPSHOT['IND-VID-BBNT'],
      ),
    [templateId],
  );
  const fields = useMemo(() => uniqueFields(template), [template]);

  const [draftJobTables, setDraftJobTables] = useState<SowJobTableDraft[]>([]);
  const [activeJobTableIdx, setActiveJobTableIdx] = useState<number>(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);
  const [acceptanceScreenshots, setAcceptanceScreenshots] = useState<AcceptanceScreenshotItem[]>([]);
  const [screenshotModalOpen, setScreenshotModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [partyAEmail, setPartyAEmail] = useState('hopdong@upbase.vn');
  const [partyBEmail, setPartyBEmail] = useState('');

  const syncKey = open && deal ? `${deal.id}::${deal.dealCode || ''}::${templateId}::${deal.tiktokVideoUrl || ''}::${(deal.dealJobs || []).length}` : '';
  const [prevSyncKey, setPrevSyncKey] = useState('');

  if (syncKey && syncKey !== prevSyncKey && deal) {
    setPrevSyncKey(syncKey);
    setSaveMessage('');
    setSaveError('');
    setSavedContractRecord(null);
    const savedValues = existingBbntFromProps?.values || parentRecord?.values || {};
    const initTables = buildDealSowJobTables(deal, koc, parentRecord, savedValues[SOW_JOBS_META_KEY]);
    setDraftJobTables(initTables);
    setActiveJobTableIdx(0);
    const initBd = aggregateMultiJobAcceptanceBreakdown({
      jobs: initTables,
      deal,
      koc,
      parentRecord,
    });

    const savedShots =
      existingBbntFromProps?.acceptanceScreenshots && existingBbntFromProps.acceptanceScreenshots.length > 0
        ? existingBbntFromProps.acceptanceScreenshots
        : findSavedScreenshotsForContext({
            dealId: deal.id,
            dealCode: deal.dealCode,
            kocId: koc?.id || deal.kocId,
            videoUrl: deal.tiktokVideoUrl,
          });
    setAcceptanceScreenshots(savedShots);

    let nextValues: Record<string, string>;
    if (existingBbntFromProps?.values && Object.keys(existingBbntFromProps.values).length > 0) {
      nextValues = syncValuesFromJobAcceptanceBreakdown(fields, existingBbntFromProps.values, initBd);
    } else {
      const parentTpl = parentRecord ? OFFICIAL_TEMPLATES_SNAPSHOT[parentRecord.templateId] : undefined;
      const prefilled = prefill(fields, {}, {
        koc,
        deal,
        brand: deal.brandName,
        existingRecords,
        parentRecord,
        parentFields: parentTpl ? uniqueFields(parentTpl) : [],
      });
      nextValues = syncValuesFromJobAcceptanceBreakdown(fields, prefilled.values, initBd);
    }
    setValues(nextValues);
    setPartyBEmail(
      nextValues['src:email'] ||
        nextValues['token:[ĐIỀN EMAIL]'] ||
        koc?.email ||
        'partner@booking.upbase.vn',
    );
  }

  const safeActiveIdx = Math.min(Math.max(0, activeJobTableIdx), Math.max(0, draftJobTables.length - 1));
  const activeJobTable: SowJobTableDraft | undefined = draftJobTables[safeActiveIdx];
  const draftVideoFee = activeJobTable?.videoFeeNetVnd || 0;
  const draftAddons = activeJobTable?.addonItems || [];

  const breakdown = useMemo(
    () =>
      aggregateMultiJobAcceptanceBreakdown({
        jobs: draftJobTables,
        deal: deal || undefined,
        koc,
        parentRecord,
      }),
    [deal, koc, parentRecord, draftJobTables],
  );

  const stableBbntCode = useMemo(
    () =>
      activeBbntRecord?.contractSystem?.contractCode ||
      buildStableContractCode({
        id: activeBbntRecord?.id || deal?.id || 'BBNT',
        templateId,
        brand: deal?.brandName || 'UPBASE',
        dealCode: deal?.dealCode,
        kocId: koc?.id || deal?.kocId,
        values,
      }),
    [activeBbntRecord, deal, templateId, koc, values],
  );

  const latestSigning = activeBbntRecord?.signing.at(-1);
  const signingProgress = computeSigningProgress(latestSigning);
  const isBbntSigned = latestSigning?.status === 'COMPLETED';

  const handleUpdateAllJobTables = (nextTables: SowJobTableDraft[]) => {
    setDraftJobTables(nextTables);
    const nextBd = aggregateMultiJobAcceptanceBreakdown({
      jobs: nextTables,
      deal: deal || undefined,
      koc,
      parentRecord,
    });
    setValues(prev => ({
      ...syncValuesFromJobAcceptanceBreakdown(fields, prev, nextBd),
      [SOW_JOBS_META_KEY]: JSON.stringify(nextTables),
    }));
  };

  const handleUpdateActiveJobField = (patch: Partial<SowJobTableDraft>) => {
    const nextTables = draftJobTables.map((t, i) => (i === safeActiveIdx ? { ...t, ...patch } : t));
    handleUpdateAllJobTables(nextTables);
  };

  const handleUpdateBreakdown = (nextVideoFee: number, nextAddons: JobAcceptanceAddonRow[]) => {
    handleUpdateActiveJobField({
      videoFeeNetVnd: nextVideoFee,
      addonItems: nextAddons,
    });
  };

  const upsertBbntRecord = async (): Promise<ContractRecord> => {
    if (!deal) throw new Error('Thiếu thông tin Deal.');
    const resolvedPartner = partnerName(koc, deal) || deal.kocStageName || 'Đối tác KOC';
    const resolvedTitle = [
      'Nghiệm thu video',
      deal.dealCode,
      deal.kocStageName || resolvedPartner,
      deal.brandName,
    ]
      .filter(Boolean)
      .join(' · ');

    if (activeBbntRecord) {
      const res = await contractApi<{ record: ContractRecord }>('/api/contracts', {
        action: 'EDIT',
        id: activeBbntRecord.id,
        revision: activeBbntRecord.revision,
        title: activeBbntRecord.title || resolvedTitle,
        brand: deal.brandName || activeBbntRecord.brand,
        partner: resolvedPartner,
        templateId: activeBbntRecord.templateId,
        parentId: parentRecord?.id || activeBbntRecord.parentId,
        values,
        dealId: deal.id,
        dealCode: deal.dealCode,
        kocId: koc?.id || deal.kocId,
        acceptanceScreenshots,
      });
      setSavedContractRecord(res.record);
      onSavedRecord?.(res.record);
      return res.record;
    }

    const res = await contractApi<{ record: ContractRecord }>('/api/contracts', {
      action: 'CREATE',
      title: resolvedTitle,
      brand: deal.brandName || 'Nhãn hàng',
      partner: resolvedPartner,
      templateId,
      parentId: parentRecord?.id || undefined,
      values,
      dealId: deal.id,
      dealCode: deal.dealCode,
      kocId: koc?.id || deal.kocId,
      acceptanceScreenshots,
    });
    setSavedContractRecord(res.record);
    onSavedRecord?.(res.record);
    return res.record;
  };

  const handleSaveDraftToContractHub = async () => {
    if (!deal) return;
    setSaving(true);
    setSaveError('');
    setSaveMessage('');
    try {
      const rec = await upsertBbntRecord();
      setSaveMessage(
        `Đã lưu BBNT và đồng bộ Google Docs (${rec.contractSystem?.contractCode || stableBbntCode} · v${rec.version}).`,
      );
    } catch (e) {
      setSaveError((e as Error).message || 'Không lưu được bản nháp Biên bản nghiệm thu.');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncGoogleDocs = async () => {
    if (!activeBbntRecord) return;
    setSaving(true);
    setSaveError('');
    setSaveMessage('');
    try {
      const res = await contractApi<{ record: ContractRecord }>('/api/contracts', {
        action: 'SYNC_GOOGLE_DOCS',
        id: activeBbntRecord.id,
        revision: activeBbntRecord.revision,
      });
      setSavedContractRecord(res.record);
      onSavedRecord?.(res.record);
      setSaveMessage(`Đã xuất lại bản .docx BBNT mới nhất từ Google Docs (${stableBbntCode}).`);
    } catch (e) {
      setSaveError((e as Error).message || 'Không đồng bộ được Google Docs.');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestSignBbnt = async () => {
    if (!deal) return;
    setSaving(true);
    setSaveError('');
    setSaveMessage('');
    try {
      let current = activeBbntRecord || (await upsertBbntRecord());
      if (current.approval === 'APPROVED') {
        const res = await contractApi<{ record: ContractRecord }>('/api/contracts', {
          action: 'REQUEST_SIGN',
          id: current.id,
          revision: current.revision,
          partyAEmail: partyAEmail.trim() || 'hopdong@upbase.vn',
          partyBEmail: partyBEmail.trim() || 'partner@booking.upbase.vn',
        });
        current = res.record;
        setSavedContractRecord(current);
        onSavedRecord?.(current);
        setSaveMessage(
          `Đã xuất .docx từ Google Docs và phát lệnh requestSign BBNT sang WeSign (${current.contractSystem?.contractCode || stableBbntCode}).`,
        );
      } else {
        setSavedContractRecord(current);
        onSavedRecord?.(current);
        setSaveMessage(
          `Đã lưu BBNT (${current.contractSystem?.contractCode || stableBbntCode}). Mở chi tiết văn bản để hoàn tất duyệt nội bộ trước khi gửi requestSign.`,
        );
      }
    } catch (e) {
      setSaveError((e as Error).message || 'Không thể phát lệnh trình ký BBNT.');
    } finally {
      setSaving(false);
    }
  };

  if (!deal) return null;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={`Biên bản nghiệm thu (BBNT) & Ký số contract-system · ${breakdown.jobCode}`}
        size="xl"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2 w-full">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                icon={Camera}
                onClick={() => setScreenshotModalOpen(true)}
              >
                {acceptanceScreenshots.length > 0
                  ? `Ảnh sản phẩm đính kèm (${acceptanceScreenshots.length})`
                  : 'Lấy thông tin Link Air & Cắt ảnh sản phẩm'}
              </Button>
              {onOpenFullEditor && (
                <Button
                  variant="secondary"
                  icon={ExternalLink}
                  onClick={() => {
                    onClose();
                    onOpenFullEditor(deal);
                  }}
                >
                  Mở chi tiết &amp; Trình ký BBNT
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={onClose}>
                Đóng
              </Button>
              {activeBbntRecord?.approval === 'APPROVED' && !isBbntSigned && (
                <Button
                  variant="secondary"
                  icon={Send}
                  disabled={saving}
                  onClick={() => void handleRequestSignBbnt()}
                >
                  Gửi ký BBNT (requestSign)
                </Button>
              )}
              <Button
                variant="primary"
                icon={FileCheck}
                disabled={saving}
                onClick={() => void handleSaveDraftToContractHub()}
              >
                {saving
                  ? 'Đang xử lý…'
                  : activeBbntRecord
                    ? 'Cập nhật BBNT & Google Docs'
                    : 'Lưu BBNT & Gen .docx Google Docs'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {saveMessage && (
            <div className="p-3 rounded-xl border border-positive/40 bg-positive-soft text-positive font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-positive shrink-0" />
              <span>{saveMessage}</span>
            </div>
          )}
          {saveError && (
            <div className="p-3 rounded-xl border border-critical/40 bg-critical-soft text-critical font-medium">
              {saveError}
            </div>
          )}

          {/* Thanh liên thông 13 bước contract-system dành cho Biên bản nghiệm thu (BBNT) */}
          <div className="rounded-xl border border-line bg-surface p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <FileCode2 className="w-4 h-4 text-accent shrink-0" />
                <span className="font-semibold text-ink">
                  Luồng sinh BBNT &amp; Ký số 2 bên qua contract-system
                </span>
                <span className="font-code text-2xs px-2 py-0.5 rounded bg-sunken border border-line text-ink">
                  Mã BBNT: {stableBbntCode}
                </span>
                {(template.signTags || []).map(tag => (
                  <span key={tag} className="font-code text-2xs px-1.5 py-0.5 rounded bg-accent-soft/60 border border-accent/25 text-accent">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {activeBbntRecord?.contractSystem?.googleDocsUrl && (
                  <a
                    href={activeBbntRecord.contractSystem.googleDocsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-line-strong bg-surface text-2xs font-medium text-accent hover:bg-sunken"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Mở BBNT trên Google Docs
                  </a>
                )}
                {activeBbntRecord?.contractSystem?.googleDocsUrl && !isBbntSigned && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={RefreshCw}
                    disabled={saving}
                    onClick={() => void handleSyncGoogleDocs()}
                  >
                    Xuất lại .docx từ Google Docs
                  </Button>
                )}
                {isBbntSigned && (
                  <a
                    href={
                      latestSigning?.signedFileUrl ||
                      activeBbntRecord?.contractSystem?.signedFileUrl ||
                      `/api/contracts/${activeBbntRecord?.id}/document?signed=1`
                    }
                    className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-positive/40 bg-positive-soft text-2xs font-semibold text-positive hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Bản BBNT đã ký (.pdf/.docx)
                  </a>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <div className="rounded-lg border border-line bg-sunken/30 px-3 py-2 space-y-0.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-2xs font-semibold text-ink">Bước 4 · Mẫu BBNT &amp; SOW gốc</span>
                  <Status tone="positive">{template.version}</Status>
                </div>
                <span className="text-2xs text-ink-2 block truncate">
                  {template.id} · Kế thừa SOW {breakdown.appendixCode}
                </span>
              </div>

              <div className="rounded-lg border border-line bg-sunken/30 px-3 py-2 space-y-0.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-2xs font-semibold text-ink">Bước 5–6 · Gen .docx &amp; Google Docs</span>
                  <Status tone={activeBbntRecord?.contractSystem?.googleDocsUrl ? 'positive' : 'neutral'}>
                    {activeBbntRecord?.contractSystem?.googleDocsUrl ? 'Đã đồng bộ' : 'Chưa lưu'}
                  </Status>
                </div>
                <span className="text-2xs text-ink-2 block truncate">
                  {activeBbntRecord?.contractSystem?.googleDocsSyncedAt
                    ? `Đồng bộ ${dateTime(activeBbntRecord.contractSystem.googleDocsSyncedAt)}`
                    : 'Lưu BBNT để tạo file Google Docs'}
                </span>
              </div>

              <div className="rounded-lg border border-line bg-sunken/30 px-3 py-2 space-y-0.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-2xs font-semibold text-ink">Bước 7–8 · Gửi ký BBNT (requestSign)</span>
                  <Status tone={latestSigning ? 'positive' : activeBbntRecord?.approval === 'APPROVED' ? 'warning' : 'neutral'}>
                    {latestSigning
                      ? `${signingProgress?.completedCount || 0}/${signingProgress?.totalCount || 2} chữ ký`
                      : activeBbntRecord?.approval === 'APPROVED'
                        ? 'Sẵn sàng ký'
                        : 'Chờ duyệt BBNT'}
                  </Status>
                </div>
                <span className="text-2xs text-ink-2 block truncate">
                  Bên A: {partyAEmail} · Bên B: {partyBEmail}
                </span>
              </div>

              <div className="rounded-lg border border-line bg-sunken/30 px-3 py-2 space-y-0.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-2xs font-semibold text-ink">Bước 9–13 · Webhook &amp; ĐNTT</span>
                  <Status tone={isBbntSigned ? 'positive' : latestSigning ? 'warning' : 'neutral'}>
                    {isBbntSigned ? 'Đủ điều kiện ĐNTT' : latestSigning ? 'Đang chờ ký' : 'Chưa trình ký'}
                  </Status>
                </div>
                <span className="text-2xs text-ink-2 block truncate">
                  {isBbntSigned ? 'Đã khóa số liệu & tải bản ký' : 'Queue: signed-file-download'}
                </span>
              </div>
            </div>
          </div>

          {/* Khối 1: Bảng đối soát Phụ lục Job (1 Deal -> N Job -> N Bảng công việc) */}
          <div className="p-3.5 rounded-xl border border-line bg-sunken/40 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-line">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-accent/15 text-accent font-code font-semibold">
                  Deal: {deal.dealCode || breakdown.jobCode} ({draftJobTables.length} Job · {draftJobTables.length} Bảng CV)
                </span>
                <span className="px-2 py-0.5 rounded bg-surface border border-line font-code text-ink-2">
                  Phụ lục SOW: {breakdown.appendixCode}
                </span>
                <span className="px-2 py-0.5 rounded bg-surface border border-line font-code text-ink-2">
                  HĐNT: {breakdown.masterContractCode}
                </span>
                <span className="px-2 py-0.5 rounded bg-surface border border-line font-medium text-ink">
                  Mẫu: {template.name}
                </span>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const nextList: JobAcceptanceAddonRow[] = [
                    ...draftAddons,
                    {
                      id: `addon-${Date.now()}`,
                      termType: 'CROSS_POST_REUP',
                      termLabel: 'Đăng chéo kênh phụ / Dịch vụ đi kèm theo Phụ lục',
                      durationDays: 30,
                      evidenceCodeOrUrl: '',
                      allocatedCostVnd: 0,
                      acceptanceStatus: 'VERIFIED',
                    },
                  ];
                  handleUpdateBreakdown(draftVideoFee, nextList);
                }}
              >
                + Thêm dịch vụ đi kèm
              </Button>
            </div>

            {/* Thanh chuyển đổi giữa các Bảng công việc (Job) trong Deal */}
            {draftJobTables.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {draftJobTables.map((jt, jIdx) => {
                  const isActive = jIdx === safeActiveIdx;
                  const activeAddonsSum = (jt.addonItems || [])
                    .filter(a => a.includedInSow !== false && a.acceptanceStatus !== 'DROPPED')
                    .reduce((s, a) => s + (Number(a.allocatedCostVnd) || 0), 0);
                  const jobSub = (Number(jt.videoFeeNetVnd) || 0) + activeAddonsSum;
                  return (
                    <button
                      key={jt.id || jIdx}
                      type="button"
                      onClick={() => setActiveJobTableIdx(jIdx)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                        isActive
                          ? 'border-accent bg-accent-soft/40 text-ink font-semibold'
                          : 'border-line bg-surface text-ink-2 hover:bg-sunken'
                      }`}
                    >
                      <span className="font-code font-semibold text-accent">
                        Bảng CV #{jIdx + 1} · {jt.jobCode}
                      </span>
                      <span className="truncate max-w-[140px]">
                        {jt.productName || jt.jobTitle}
                      </span>
                      <span className="font-code text-2xs px-1.5 py-0.5 rounded bg-surface border border-line text-ink">
                        {formatNumber(jobSub)}đ
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Hạng mục 1 của Job đang chọn: Video chính */}
            <div className="p-2.5 rounded-lg border border-line bg-surface space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-ink">
                  Bảng công việc #{safeActiveIdx + 1} ({activeJobTable?.jobCode || breakdown.jobCode}) · 1. Video chính ({activeJobTable?.productName || breakdown.videoItem.productName || deal.brandName})
                </span>
                <Status tone={activeJobTable?.videoUrl ? 'positive' : 'warning'}>
                  {activeJobTable?.videoUrl ? 'Đã có Link Air' : 'Chờ Link Air'}
                </Status>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <Field label="Ngày đăng tải thực tế (Air Date)">
                  <Input
                    value={activeJobTable?.airDate || breakdown.videoItem.airDate || ''}
                    onChange={e => handleUpdateActiveJobField({ airDate: e.target.value })}
                    placeholder="DD/MM/YYYY"
                    className="font-code"
                  />
                </Field>
                <Field label="Link bài đăng (Link Air)">
                  <Input
                    value={activeJobTable?.videoUrl || ''}
                    onChange={e => handleUpdateActiveJobField({ videoUrl: e.target.value })}
                    placeholder="https://www.tiktok.com/@koc/video/..."
                    className="font-code"
                  />
                </Field>
                <Field label="Thành tiền Video chính (VNĐ - Net)">
                  <Input
                    inputMode="numeric"
                    className="font-code tabular-nums font-semibold"
                    value={formatMoneyInput(String(draftVideoFee || 0))}
                    onChange={e => {
                      const nextFee = Number(e.target.value.replace(/\D/g, '')) || 0;
                      handleUpdateBreakdown(nextFee, draftAddons);
                    }}
                  />
                </Field>
              </div>
            </div>

            {/* Task #2..N: Các Task đi kèm trong Phụ lục SOW của Job */}
            <div className="p-2.5 rounded-lg border border-line bg-surface space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-ink">
                  Các Task đi kèm trong Phụ lục SOW ({draftAddons.filter(a => a.includedInSow !== false).length}/{draftAddons.length} Task áp dụng cho Job này)
                </span>
                <span className="text-2xs font-code text-ink-2">
                  Phí Task đi kèm đạt nghiệm thu: {formatNumber(breakdown.financials.activeAddonsNet)}đ
                  {breakdown.financials.droppedDeduction > 0
                    ? ` · Khấu trừ hủy Task: -${formatNumber(breakdown.financials.droppedDeduction)}đ`
                    : ''}
                </span>
              </div>

              <div className="space-y-1.5">
                {draftAddons.map((addon, idx) => {
                  const isIncluded = addon.includedInSow !== false;
                  const info = SOW_TASK_DELIVERABLE_INFO[addon.termType] || SOW_TASK_DELIVERABLE_INFO.ADS_CODE;
                  const taskNo = idx + 2;
                  return (
                    <div
                      key={addon.id || idx}
                      className={`p-2 rounded border space-y-1.5 ${
                        isIncluded ? 'border-line bg-sunken/30' : 'border-dashed border-line bg-sunken/15 opacity-70'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-ink">
                          <input
                            type="checkbox"
                            checked={isIncluded}
                            onChange={e => {
                              const checked = e.target.checked;
                              const nextList = draftAddons.map((a, i) =>
                                i === idx ? { ...a, includedInSow: checked } : a,
                              );
                              handleUpdateBreakdown(draftVideoFee, nextList);
                            }}
                            className="rounded border-line text-accent focus:ring-accent"
                          />
                          <span className="px-1.5 py-0.5 rounded bg-surface border border-line font-code text-2xs">
                            Task #{taskNo} · {addon.taskCode || `${breakdown.jobCode}-T0${taskNo}`}
                          </span>
                          <span>{addon.termLabel}</span>
                        </label>
                        <span className="px-2 py-0.5 rounded bg-surface border border-line text-2xs text-ink-2">
                          {isIncluded ? (addon.deliverableLabel || info.deliverableLabel) : 'Không có trong SOW của Job này'}
                        </span>
                      </div>

                      {isIncluded && (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                          <div className="md:col-span-4">
                            <Input
                              value={addon.termLabel}
                              onChange={e => {
                                const nextList = draftAddons.map((a, i) =>
                                  i === idx ? { ...a, termLabel: e.target.value } : a,
                                );
                                handleUpdateBreakdown(draftVideoFee, nextList);
                              }}
                            />
                          </div>
                          <div className="md:col-span-2 flex items-center gap-1">
                            <Input
                              type="number"
                              min={1}
                              value={addon.durationDays}
                              onChange={e => {
                                const days = Math.max(1, Number(e.target.value) || 30);
                                const nextList = draftAddons.map((a, i) =>
                                  i === idx ? { ...a, durationDays: days } : a,
                                );
                                handleUpdateBreakdown(draftVideoFee, nextList);
                              }}
                              className="font-code text-right"
                            />
                            <span className="text-2xs text-ink-3 shrink-0">ngày</span>
                          </div>
                          <div className="md:col-span-2">
                            <Input
                              value={addon.evidenceCodeOrUrl}
                              onChange={e => {
                                const nextList = draftAddons.map((a, i) =>
                                  i === idx ? { ...a, evidenceCodeOrUrl: e.target.value } : a,
                                );
                                handleUpdateBreakdown(draftVideoFee, nextList);
                              }}
                              placeholder={info.evidencePlaceholder}
                              className="font-code"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Input
                              inputMode="numeric"
                              value={addon.allocatedCostVnd > 0 ? formatMoneyInput(String(addon.allocatedCostVnd)) : '0'}
                              onChange={e => {
                                const cost = Number(e.target.value.replace(/\D/g, '')) || 0;
                                const nextList = draftAddons.map((a, i) =>
                                  i === idx ? { ...a, allocatedCostVnd: cost } : a,
                                );
                                handleUpdateBreakdown(draftVideoFee, nextList);
                              }}
                              className="font-code text-right"
                            />
                          </div>
                          <div className="md:col-span-2 flex items-center gap-1">
                            <Select
                              value={addon.acceptanceStatus}
                              onChange={e => {
                                const st = e.target.value as JobAcceptanceAddonRow['acceptanceStatus'];
                                const nextList = draftAddons.map((a, i) =>
                                  i === idx ? { ...a, acceptanceStatus: st } : a,
                                );
                                handleUpdateBreakdown(draftVideoFee, nextList);
                              }}
                            >
                              <option value="VERIFIED">Hoàn thành</option>
                              <option value="PENDING_ACCEPTANCE">Chờ bàn giao</option>
                              <option value="DROPPED">Hủy - Khấu trừ</option>
                            </Select>
                            {draftAddons.length > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const nextList = draftAddons.filter((_, i) => i !== idx);
                                  handleUpdateBreakdown(draftVideoFee, nextList);
                                }}
                                className="text-ink-3 hover:text-critical p-1 shrink-0"
                                title="Xóa Task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Khối tổng hợp quyết toán theo Phụ lục Job */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-2.5 rounded-lg border border-line bg-surface font-code">
              <div>
                <span className="text-2xs text-ink-3 block">Tổng Phụ lục SOW</span>
                <strong className="text-ink">{formatNumber(breakdown.financials.plannedTotalNet)}đ</strong>
              </div>
              <div>
                <span className="text-2xs text-ink-3 block">Khấu trừ hủy DV</span>
                <strong className={breakdown.financials.droppedDeduction > 0 ? 'text-critical' : 'text-ink-2'}>
                  {breakdown.financials.droppedDeduction > 0
                    ? `-${formatNumber(breakdown.financials.droppedDeduction)}đ`
                    : '0đ'}
                </strong>
              </div>
              <div>
                <span className="text-2xs text-ink-3 block">Nghiệm thu Net</span>
                <strong className="text-ink">{formatNumber(breakdown.financials.acceptedTotalNet)}đ</strong>
              </div>
              <div>
                <span className="text-2xs text-ink-3 block">
                  {breakdown.subjectKind === 'COM'
                    ? `VAT (${deal.vatRatePercent ?? 8}%)`
                    : breakdown.subjectKind === 'HKD'
                      ? 'Thuế HKD (0đ)'
                      : 'Thuế TNCN (10%)'}
                </span>
                <strong className="text-ink">
                  {formatNumber(
                    breakdown.subjectKind === 'COM'
                      ? breakdown.financials.vatTax
                      : breakdown.financials.pitTax,
                  )}đ
                </strong>
              </div>
              <div>
                <span className="text-2xs text-ink-3 block">
                  Còn thanh toán (Sau tạm ứng {formatNumber(breakdown.financials.advanceAmount)}đ)
                </span>
                <strong className="text-positive">{formatNumber(breakdown.financials.remainingPayable)}đ</strong>
              </div>
            </div>
          </div>

          {/* Khối 2: Bản xem trước Biên bản nghiệm thu chuẩn A4 */}
          <ContractDocumentViewer
            title={`Biên bản nghiệm thu · ${breakdown.jobCode}`}
            templateName={`${template.name} · Mã ${stableBbntCode}`}
            blocks={template.blocks || []}
            paragraphs={template.paragraphs}
            fields={template.fields}
            values={values}
            activeFieldKey={activeFieldKey}
            onSelectField={key => setActiveFieldKey(key)}
            maxHeight="520px"
            signingPeople={latestSigning?.people}
            signingDocumentId={latestSigning?.documentId}
            partnerName={partnerName(koc, deal)}
            acceptanceScreenshots={acceptanceScreenshots}
          />
        </div>
      </Modal>

      <VideoProductScreenshotModal
        open={screenshotModalOpen}
        onClose={() => setScreenshotModalOpen(false)}
        initialVideoUrl={deal.tiktokVideoUrl || ''}
        dealId={deal.id}
        dealCode={deal.dealCode}
        kocId={koc?.id || deal.kocId}
        authorHandle={koc?.channelId || deal.kocChannelId}
        brandName={deal.brandName}
        productName={deal.productName}
        existingScreenshots={acceptanceScreenshots}
        onApplyScreenshots={(items: AcceptanceScreenshotItem[], inspectionMeta?: VideoAcceptanceInspectionMeta) => {
          setAcceptanceScreenshots(items);
          if (inspectionMeta && fields.length > 0) {
            setValues(prev => {
              const next = { ...prev };
              for (const f of fields) {
                const fTitle = (f.title || f.label || '').toLowerCase();
                if (f.source === 'airDate' && inspectionMeta.publishedDateVn && !next[f.key]?.trim()) {
                  next[f.key] = inspectionMeta.publishedDateVn;
                } else if (f.source === 'channelLink' && inspectionMeta.authorHandle && !next[f.key]?.trim()) {
                  next[f.key] = `https://www.tiktok.com/@${inspectionMeta.authorHandle.replace(/^@/, '')}`;
                } else if (
                  f.source === 'product' &&
                  (inspectionMeta.matchedProductTerms[0] || inspectionMeta.cartAnchorTitle) &&
                  !next[f.key]?.trim()
                ) {
                  next[f.key] =
                    deal.productName ||
                    inspectionMeta.matchedProductTerms[0] ||
                    inspectionMeta.cartAnchorTitle ||
                    '';
                } else if (
                  (fTitle.includes('link video') || fTitle === 'dòng 1 · link') &&
                  inspectionMeta.resolvedUrl &&
                  !next[f.key]?.trim()
                ) {
                  next[f.key] = inspectionMeta.resolvedUrl;
                }
              }
              return next;
            });
          }
        }}
      />
    </>
  );
}
