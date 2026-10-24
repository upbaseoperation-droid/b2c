'use client';

import React, { useMemo, useState } from 'react';
import { Camera, CheckCircle2, ExternalLink, FileCheck, Trash2 } from 'lucide-react';
import type { BookingDealItem, KocItem } from '../../lib/types';
import type {
  AcceptanceScreenshotItem,
  ContractRecord,
  VideoAcceptanceInspectionMeta,
} from '../../lib/contracts/types';
import { OFFICIAL_TEMPLATES_SNAPSHOT } from '../../lib/contracts/builtInTemplatesSnapshot';
import { findSavedScreenshotsForContext } from '../../lib/acceptanceScreenshotStore';
import { formatNumber } from '../../lib/format';
import { Button, Field, Input, Modal, Select, Status } from '../ui';
import { contractApi } from './api';
import { ContractDocumentViewer } from './ContractDocumentViewer';
import { VideoProductScreenshotModal } from './VideoProductScreenshotModal';
import {
  buildJobAcceptanceBreakdown,
  formatMoneyInput,
  isAcceptance,
  partnerName,
  prefill,
  syncValuesFromJobAcceptanceBreakdown,
  templateFor,
  uniqueFields,
  type JobAcceptanceAddonRow,
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

  const existingBbntRecord = useMemo(() => {
    if (!deal) return undefined;
    return existingRecords.find(
      r =>
        isAcceptance(r.templateId) &&
        (r.dealId === deal.id || (deal.dealCode && r.dealCode === deal.dealCode)),
    );
  }, [deal, existingRecords]);

  const templateId = useMemo(() => {
    if (existingBbntRecord?.templateId) return existingBbntRecord.templateId;
    if (!deal) return 'IND-VID-BBNT';
    return templateFor(koc, 'ACCEPTANCE', deal, allSnapshotTemplates, 'BBNT');
  }, [existingBbntRecord, deal, koc, allSnapshotTemplates]);

  const template = useMemo(
    () => OFFICIAL_TEMPLATES_SNAPSHOT[templateId] || OFFICIAL_TEMPLATES_SNAPSHOT['IND-VID-BBNT'],
    [templateId],
  );
  const fields = useMemo(() => uniqueFields(template), [template]);

  const [draftVideoFee, setDraftVideoFee] = useState<number>(0);
  const [draftAddons, setDraftAddons] = useState<JobAcceptanceAddonRow[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);
  const [acceptanceScreenshots, setAcceptanceScreenshots] = useState<AcceptanceScreenshotItem[]>([]);
  const [screenshotModalOpen, setScreenshotModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  const syncKey = open && deal ? `${deal.id}::${deal.dealCode || ''}::${templateId}::${deal.tiktokVideoUrl || ''}` : '';
  const [prevSyncKey, setPrevSyncKey] = useState('');

  if (syncKey && syncKey !== prevSyncKey && deal) {
    setPrevSyncKey(syncKey);
    setSaveMessage('');
    setSaveError('');
    const initBd = buildJobAcceptanceBreakdown(deal, koc, parentRecord);
    setDraftVideoFee(initBd.videoItem.feeNetVnd);
    setDraftAddons(initBd.addonItems);

    const savedShots =
      existingBbntRecord?.acceptanceScreenshots && existingBbntRecord.acceptanceScreenshots.length > 0
        ? existingBbntRecord.acceptanceScreenshots
        : findSavedScreenshotsForContext({
            dealId: deal.id,
            dealCode: deal.dealCode,
            kocId: koc?.id || deal.kocId,
            videoUrl: deal.tiktokVideoUrl,
          });
    setAcceptanceScreenshots(savedShots);

    if (existingBbntRecord?.values && Object.keys(existingBbntRecord.values).length > 0) {
      const synced = syncValuesFromJobAcceptanceBreakdown(fields, existingBbntRecord.values, initBd);
      setValues(synced);
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
      setValues(prefilled.values);
    }
  }

  const breakdown = useMemo(
    () => buildJobAcceptanceBreakdown(deal || undefined, koc, parentRecord, draftAddons, draftVideoFee),
    [deal, koc, parentRecord, draftAddons, draftVideoFee],
  );

  const handleUpdateBreakdown = (nextVideoFee: number, nextAddons: JobAcceptanceAddonRow[]) => {
    setDraftVideoFee(nextVideoFee);
    setDraftAddons(nextAddons);
    const nextBd = buildJobAcceptanceBreakdown(deal || undefined, koc, parentRecord, nextAddons, nextVideoFee);
    setValues(prev => syncValuesFromJobAcceptanceBreakdown(fields, prev, nextBd));
  };

  const handleSaveDraftToContractHub = async () => {
    if (!deal) return;
    setSaving(true);
    setSaveError('');
    setSaveMessage('');
    try {
      const resolvedPartner = partnerName(koc, deal) || deal.kocStageName || 'Đối tác KOC';
      const resolvedTitle = [
        'Nghiệm thu video',
        deal.dealCode,
        deal.kocStageName || resolvedPartner,
        deal.brandName,
      ]
        .filter(Boolean)
        .join(' · ');

      if (existingBbntRecord) {
        const res = await contractApi<{ record: ContractRecord }>('/api/contracts', {
          method: 'POST',
          body: JSON.stringify({
            action: 'EDIT',
            id: existingBbntRecord.id,
            revision: existingBbntRecord.revision,
            title: existingBbntRecord.title || resolvedTitle,
            brand: deal.brandName || existingBbntRecord.brand,
            partner: resolvedPartner,
            templateId: existingBbntRecord.templateId,
            parentId: parentRecord?.id || existingBbntRecord.parentId,
            values,
            dealId: deal.id,
            dealCode: deal.dealCode,
            kocId: koc?.id || deal.kocId,
            acceptanceScreenshots,
          }),
        });
        setSaveMessage(`Đã cập nhật bản nháp BBNT (${res.record.title} · v${res.record.version}) trong Quản lý Hợp đồng.`);
        onSavedRecord?.(res.record);
      } else {
        const res = await contractApi<{ record: ContractRecord }>('/api/contracts', {
          method: 'POST',
          body: JSON.stringify({
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
          }),
        });
        setSaveMessage(`Đã tạo bản nháp BBNT (${res.record.title}) trong Quản lý Hợp đồng.`);
        onSavedRecord?.(res.record);
      }
    } catch (e) {
      setSaveError((e as Error).message || 'Không lưu được bản nháp Biên bản nghiệm thu.');
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
        title={`Kiểm tra Bản nháp Biên bản nghiệm thu theo Phụ lục Job (${breakdown.jobCode})`}
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
                  ? `Kiểm tra Link Air & Ảnh sản phẩm (${acceptanceScreenshots.length})`
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
                  Mở trình soạn thảo BBNT chi tiết
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={onClose}>
                Đóng
              </Button>
              <Button
                variant="primary"
                icon={FileCheck}
                disabled={saving}
                onClick={() => void handleSaveDraftToContractHub()}
              >
                {saving
                  ? 'Đang lưu bản nháp…'
                  : existingBbntRecord
                    ? 'Cập nhật Bản nháp BBNT'
                    : 'Xác nhận & Lưu Bản nháp BBNT'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {saveMessage && (
            <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveMessage}</span>
            </div>
          )}
          {saveError && (
            <div className="p-3 rounded-xl border border-critical/40 bg-critical-soft text-critical font-medium">
              {saveError}
            </div>
          )}

          {/* Khối 1: Bảng đối soát Phụ lục Job (Video chính + Dịch vụ đi kèm) */}
          <div className="p-3.5 rounded-xl border border-line bg-sunken/40 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-line">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-accent/15 text-accent font-mono font-semibold">
                  Job: {breakdown.jobCode}
                </span>
                <span className="px-2 py-0.5 rounded bg-surface border border-line font-mono text-ink-2">
                  Phụ lục SOW: {breakdown.appendixCode}
                </span>
                <span className="px-2 py-0.5 rounded bg-surface border border-line font-mono text-ink-2">
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

            {/* Hạng mục 1: Video chính */}
            <div className="p-2.5 rounded-lg border border-line bg-surface space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-ink">
                  1. Hạng mục Video chính: Sản xuất và đăng tải Video review ({breakdown.videoItem.productName || deal.brandName})
                </span>
                <Status tone="positive">Hoàn thành</Status>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <Field label="Ngày đăng tải thực tế (Air Date)">
                  <Input
                    value={breakdown.videoItem.airDate || '—'}
                    readOnly
                    className="font-mono bg-sunken/40"
                  />
                </Field>
                <Field label="Link bài đăng (Link Air)">
                  <Input
                    value={breakdown.videoItem.videoUrl || 'Chưa điền link video'}
                    readOnly
                    className="font-mono bg-sunken/40"
                  />
                </Field>
                <Field label="Thành tiền Video chính (VNĐ - Net)">
                  <Input
                    inputMode="numeric"
                    className="font-mono tabular-nums font-semibold"
                    value={formatMoneyInput(String(draftVideoFee || 0))}
                    onChange={e => {
                      const nextFee = Number(e.target.value.replace(/\D/g, '')) || 0;
                      handleUpdateBreakdown(nextFee, draftAddons);
                    }}
                  />
                </Field>
              </div>
            </div>

            {/* Hạng mục 2..N: Các dịch vụ đi kèm */}
            <div className="p-2.5 rounded-lg border border-line bg-surface space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-ink">
                  2. Các dịch vụ đi kèm trong Phụ lục Job ({draftAddons.length} hạng mục)
                </span>
                <span className="text-2xs font-mono text-ink-2">
                  Phí dịch vụ đi kèm đạt nghiệm thu: {formatNumber(breakdown.financials.activeAddonsNet)}đ
                  {breakdown.financials.droppedDeduction > 0
                    ? ` · Khấu trừ hủy: -${formatNumber(breakdown.financials.droppedDeduction)}đ`
                    : ''}
                </span>
              </div>

              <div className="space-y-1.5">
                {draftAddons.map((addon, idx) => (
                  <div
                    key={addon.id || idx}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center p-2 rounded border border-line bg-sunken/30"
                  >
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
                        className="font-mono text-right"
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
                        placeholder="Mã Spark Ads / Link..."
                        className="font-mono"
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
                        className="font-mono text-right"
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
                      {draftAddons.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const nextList = draftAddons.filter((_, i) => i !== idx);
                            handleUpdateBreakdown(draftVideoFee, nextList);
                          }}
                          className="text-ink-3 hover:text-critical p-1 shrink-0"
                          title="Xóa dịch vụ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Khối tổng hợp quyết toán theo Phụ lục Job */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-2.5 rounded-lg border border-line bg-surface font-mono">
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
            title={`Bản nháp Biên bản nghiệm thu · ${breakdown.jobCode}`}
            templateName={`${template.name} (Theo Phụ lục ${breakdown.appendixCode})`}
            blocks={template.blocks || []}
            paragraphs={template.paragraphs}
            fields={template.fields}
            values={values}
            activeFieldKey={activeFieldKey}
            onSelectField={key => setActiveFieldKey(key)}
            maxHeight="520px"
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
                if (f.source === 'airDate' && inspectionMeta.publishedDateVn && !next[f.key]?.trim()) {
                  next[f.key] = inspectionMeta.publishedDateVn;
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
