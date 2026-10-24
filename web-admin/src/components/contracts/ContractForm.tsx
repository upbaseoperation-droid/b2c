'use client';

/**
 * Tạo hoặc sửa hồ sơ theo mẫu pháp chế. Chọn booking thì tự chọn mẫu theo loại hồ sơ KOC
 * và điền sẵn các ô có dữ liệu (Bên B, số hợp đồng, ngày ký, sản phẩm, giá). Người tạo kiểm tra lại trước khi lưu.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Camera, Columns2, FileScan, FileUp, Scale, Trash2, Upload } from 'lucide-react';
import type { BookingDealItem, KocItem, OcrExtractedFields } from '../../lib/types';
import type { AcceptanceScreenshotItem, ContractField, ContractRecord, DocBlock, LegalTemplate, VideoAcceptanceInspectionMeta } from '../../lib/contracts/types';
import { Button, Field, Input, Modal, Panel, Segmented, Select, Status, Textarea } from '../ui';
import { formatNumber } from '../../lib/format';
import { contractApi, type ContractBootstrap } from './api';
import { ContractDocumentViewer } from './ContractDocumentViewer';
import { VideoProductScreenshotModal } from './VideoProductScreenshotModal';
import { findSavedScreenshotsForContext } from '../../lib/acceptanceScreenshotStore';
import {
  GROUP_ORDER,
  buildJobAcceptanceBreakdown,
  formatMoneyInput,
  inferAcceptanceTemplateId,
  isAcceptance,
  partnerName,
  prefill,
  syncValuesFromJobAcceptanceBreakdown,
  templateFor,
  uniqueFields,
  type JobAcceptanceAddonRow,
} from './contractUi';
import { evaluateContractRules } from '../../lib/contracts/contractRules';
import { parseDocxInBrowser } from './docxClientParser';

export interface ContractFormInit {
  dealId?: string;
  kind?: 'CONTRACT' | 'ACCEPTANCE';
  parentId?: string;
  templateId?: string;
  isKocOwnForm?: boolean;
}

export interface ContractFormPayload {
  title: string; brand: string; partner: string; templateId: string; parentId: string;
  values: Record<string, string>; dealId?: string; dealCode?: string; kocId?: string;
  hasCustomTerms?: boolean; customTermsSummary?: string; internalNotes?: string;
  isKocOwnForm?: boolean;
  customFilename?: string;
  customFileBase64?: string;
  customFileBlocks?: DocBlock[];
  customFileParagraphs?: string[];
  acceptanceScreenshots?: AcceptanceScreenshotItem[];
}

const findKoc = (kocs: KocItem[], deal?: BookingDealItem) =>
  deal ? kocs.find(k => k.id === deal.kocId) || kocs.find(k => k.channelId.replace(/^@/, '').toLowerCase() === (deal.kocChannelId || '').replace(/^@/, '').toLowerCase()) : undefined;

export function ContractForm({
  data,
  deals,
  kocs,
  record,
  init,
  busy,
  onCancel,
  onSave,
}: {
  data: ContractBootstrap;
  deals: BookingDealItem[];
  kocs: KocItem[];
  /** Có `record` là sửa (tạo phiên bản mới). */
  record?: ContractRecord;
  init?: ContractFormInit;
  busy: boolean;
  onCancel: () => void;
  onSave: (payload: ContractFormPayload) => void;
}) {
  const editing = !!record;
  const findBestParentForAcceptance = (d?: BookingDealItem, k?: KocItem): ContractRecord | undefined => {
    if (!d && !k) return undefined;
    // Ưu tiên Phụ lục SOW của chính Job đó
    if (d) {
      const sowByDeal = data.records.find(
        r => r.templateId.endsWith('-SOW') && (r.dealId === d.id || (d.dealCode && r.dealCode === d.dealCode)),
      );
      if (sowByDeal) return sowByDeal;
    }
    // Kế tiếp: HĐNT hoặc HĐ của Deal/KOC
    return data.records.find(
      r =>
        !isAcceptance(r.templateId) &&
        ((d && (r.dealId === d.id || (d.dealCode && r.dealCode === d.dealCode))) ||
          (k?.id && r.kocId === k.id)),
    );
  };

  const initialParent =
    data.records.find(r => r.id === (record?.parentId || init?.parentId)) ||
    ((record ? isAcceptance(record.templateId) : init?.kind === 'ACCEPTANCE')
      ? findBestParentForAcceptance(
          deals.find(d => d.id === (record?.dealId || init?.dealId)),
          findKoc(kocs, deals.find(d => d.id === (record?.dealId || init?.dealId))),
        )
      : undefined);
  const initialDeal = deals.find(d => d.id === (record?.dealId || init?.dealId || initialParent?.dealId));
  const [dealId, setDealId] = useState(initialDeal?.id || '');
  const [kind, setKind] = useState<'CONTRACT' | 'ACCEPTANCE'>(
    record ? (isAcceptance(record.templateId) ? 'ACCEPTANCE' : 'CONTRACT') : init?.templateId ? (isAcceptance(init.templateId) ? 'ACCEPTANCE' : 'CONTRACT') : init?.kind || 'CONTRACT',
  );
  const inferAcceptanceTemplate = (parentTplId?: string) =>
    inferAcceptanceTemplateId(parentTplId, data.templates);
  const [templateId, setTemplateId] = useState(
    record?.templateId ||
      init?.templateId ||
      (initialDeal
        ? templateFor(findKoc(kocs, initialDeal), init?.kind || 'CONTRACT', initialDeal, data.templates)
        : init?.kind === 'ACCEPTANCE' && initialParent
          ? inferAcceptanceTemplate(initialParent.templateId) || 'IND-VID-BBNT'
          : ''),
  );
  const [title, setTitle] = useState(
    record?.title ||
      (initialDeal
        ? [init?.kind === 'ACCEPTANCE' ? 'Nghiệm thu video' : 'Hợp đồng video', initialDeal.kocStageName, initialDeal.brandName].filter(Boolean).join(' · ')
        : initialParent && init?.kind === 'ACCEPTANCE'
          ? ['Nghiệm thu video', initialParent.partner, initialParent.brand].filter(Boolean).join(' · ')
          : ''),
  );
  const [brand, setBrand] = useState(record?.brand || initialDeal?.brandName || initialParent?.brand || data.actor.brands[0] || '');
  const [partner, setPartner] = useState(record?.partner || (initialDeal ? partnerName(findKoc(kocs, initialDeal), initialDeal) : initialParent?.partner || ''));
  const [parentId, setParentId] = useState(record?.parentId || init?.parentId || initialParent?.id || '');
  const [values, setValues] = useState<Record<string, string>>(record?.values || {});
  const [prefilled, setPrefilled] = useState<Set<string>>(new Set());
  const [hasCustomTerms, setHasCustomTerms] = useState<boolean>(record?.hasCustomTerms ?? false);
  const [customTermsSummary, setCustomTermsSummary] = useState<string>(record?.customTermsSummary || '');
  const [internalNotes, setInternalNotes] = useState<string>(record?.internalNotes || '');
  const [template, setTemplate] = useState<LegalTemplate | null>(null);
  const [loadError, setLoadError] = useState('');
  const [showSplitPreview, setShowSplitPreview] = useState(true);
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);
  const [ocrOpen, setOcrOpen] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrNotice, setOcrNotice] = useState('');
  const ocrInputRef = useRef<HTMLInputElement | null>(null);
  const [screenshotModalOpen, setScreenshotModalOpen] = useState(false);
  const [acceptanceScreenshots, setAcceptanceScreenshots] = useState<AcceptanceScreenshotItem[]>(() =>
    record?.acceptanceScreenshots && record.acceptanceScreenshots.length > 0
      ? record.acceptanceScreenshots
      : findSavedScreenshotsForContext({
          dealId: initialDeal?.id,
          dealCode: initialDeal?.dealCode,
          kocId: initialDeal?.kocId || initialParent?.kocId,
          videoUrl: initialDeal?.tiktokVideoUrl,
        })
  );

  const [isKocOwnForm, setIsKocOwnForm] = useState<boolean>(record?.isKocOwnForm ?? init?.isKocOwnForm ?? false);
  const [customFile, setCustomFile] = useState<{
    filename: string;
    base64?: string;
    blocks: DocBlock[];
    paragraphs: string[];
  } | null>(
    record?.customFile
      ? {
          filename: record.customFile.filename,
          blocks: record.customFile.blocks || [],
          paragraphs: record.customFile.paragraphs || [],
        }
      : null,
  );
  const [customContractValue, setCustomContractValue] = useState<string>(
    record?.values?.['token:[Tổng tiền trước thuế/sau thuế]'] ||
      (initialDeal?.totalValue ? formatMoneyInput(String(initialDeal.totalValue)) : ''),
  );
  const kocDocxInputRef = useRef<HTMLInputElement | null>(null);

  const parentRecord = useMemo(() => data.records.find(r => r.id === parentId), [data.records, parentId]);
  const parentTemplate = useMemo(
    () => (parentRecord ? data.templates.find(t => t.id === parentRecord.templateId) : undefined),
    [data.templates, parentRecord],
  );
  const deal = useMemo(() => deals.find(d => d.id === dealId), [deals, dealId]);
  const koc = useMemo(
    () => findKoc(kocs, deal) || (parentRecord?.kocId ? kocs.find(k => k.id === parentRecord.kocId) : undefined),
    [kocs, deal, parentRecord],
  );
  const targetKocId = koc?.id || deal?.kocId || record?.kocId || parentRecord?.kocId;
  const kocTemplates = data.templates.filter(
    t => (t.scope === 'KOC_CUSTOM' && t.kocId === targetKocId) || (t.kocId && t.kocId === targetKocId),
  );
  const primaryKocTemplate = kocTemplates[0];
  const kocLegalNotes = primaryKocTemplate?.legalNotes;

  const initialBreakdown = useMemo(
    () => buildJobAcceptanceBreakdown(initialDeal, findKoc(kocs, initialDeal), initialParent),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [draftVideoFee, setDraftVideoFee] = useState<number>(initialBreakdown.videoItem.feeNetVnd);
  const [draftAddons, setDraftAddons] = useState<JobAcceptanceAddonRow[]>(initialBreakdown.addonItems);
  const jobAcceptanceBreakdown = useMemo(
    () => buildJobAcceptanceBreakdown(deal, koc, parentRecord, draftAddons, draftVideoFee),
    [deal, koc, parentRecord, draftAddons, draftVideoFee],
  );

  // Tải mẫu (kèm vị trí ô). Hồ sơ đang sửa dùng đúng bản mẫu đã khóa của hồ sơ.
  useEffect(() => {
    if (!templateId) return;
    let cancelled = false;
    contractApi<{ template: LegalTemplate }>(`/api/contracts/templates/${templateId}${record ? `?record=${encodeURIComponent(record.id)}` : ''}`)
      .then(r => {
        if (cancelled) return;
        setTemplate(r.template); setLoadError('');
        if (!record) {
          const result = prefill(uniqueFields(r.template), {}, {
            koc,
            deal,
            brand,
            existingRecords: data.records,
            parentRecord,
            parentFields: parentTemplate ? uniqueFields(parentTemplate) : [],
          });
          setValues(result.values); setPrefilled(new Set(result.filled));
        }
      })
      .catch(e => !cancelled && setLoadError((e as Error).message));
    return () => { cancelled = true; };
    // Chỉ tải lại khi đổi mẫu; đổi booking được xử lý ở chooseDeal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const fields = uniqueFields(template);
  const groups = useMemo(
    () => GROUP_ORDER.map(g => ({ ...g, fields: fields.filter(f => (f.group || 'OTHER') === g.key) })).filter(g => g.fields.length),
    [fields],
  );
  const required = fields.filter(f => f.required);
  const requiredDone = required.filter(f => values[f.key]?.trim()).length;

  const applyJobBreakdownToDraftValues = (
    nextVideoFee: number,
    nextAddons: JobAcceptanceAddonRow[],
    targetDeal = deal,
    targetKoc = koc,
    targetParent = parentRecord,
  ) => {
    setDraftVideoFee(nextVideoFee);
    setDraftAddons(nextAddons);
    if (fields.length > 0) {
      const nextBd = buildJobAcceptanceBreakdown(targetDeal, targetKoc, targetParent, nextAddons, nextVideoFee);
      setValues(prev => syncValuesFromJobAcceptanceBreakdown(fields, prev, nextBd));
    }
  };

  const autoTitle = (k: KocItem | undefined, d: BookingDealItem | undefined, kd: 'CONTRACT' | 'ACCEPTANCE') =>
    [kd === 'CONTRACT' ? 'Hợp đồng video' : 'Nghiệm thu video', k?.stageName || d?.kocStageName, d?.brandName].filter(Boolean).join(' · ');

  const chooseDeal = (id: string) => {
    const d = deals.find(x => x.id === id); const k = findKoc(kocs, d);
    setDealId(id);
    if (!d) return;
    setBrand(d.brandName); setPartner(partnerName(k, d));
    if (d.totalValue && !customContractValue) setCustomContractValue(formatMoneyInput(String(d.totalValue)));
    if (!title.trim() || title === autoTitle(findKoc(kocs, deal), deal, kind)) setTitle(autoTitle(k, d, kind));
    const matchedParent = kind === 'ACCEPTANCE' ? (findBestParentForAcceptance(d, k) || parentRecord) : parentRecord;
    if (kind === 'ACCEPTANCE' && matchedParent && matchedParent.id !== parentId) {
      setParentId(matchedParent.id);
    }
    const freshBd = buildJobAcceptanceBreakdown(d, k, matchedParent);
    setDraftVideoFee(freshBd.videoItem.feeNetVnd);
    setDraftAddons(freshBd.addonItems);
    const savedShots = findSavedScreenshotsForContext({
      dealId: d.id,
      dealCode: d.dealCode,
      kocId: d.kocId,
      videoUrl: d.tiktokVideoUrl,
    });
    if (savedShots.length > 0 && acceptanceScreenshots.length === 0) {
      setAcceptanceScreenshots(savedShots);
    }
    const nextTemplate = templateFor(k, kind, d, data.templates);
    if (nextTemplate !== templateId) { setTemplate(null); setValues({}); setTemplateId(nextTemplate); }
    else if (template) {
      const matchedParentTpl = matchedParent ? data.templates.find(t => t.id === matchedParent.templateId) : undefined;
      const result = prefill(fields, {}, { koc: k, deal: d, brand: d.brandName, existingRecords: data.records, parentRecord: matchedParent, parentFields: matchedParentTpl ? uniqueFields(matchedParentTpl) : [] });
      setValues(result.values); setPrefilled(new Set(result.filled));
    }
  };

  const chooseKind = (k: 'CONTRACT' | 'ACCEPTANCE') => {
    setKind(k);
    if (title === autoTitle(koc, deal, kind)) setTitle(autoTitle(koc, deal, k));
    if (k === 'ACCEPTANCE') {
      const bestP = findBestParentForAcceptance(deal, koc);
      if (bestP) setParentId(bestP.id);
      const freshBd = buildJobAcceptanceBreakdown(deal, koc, bestP || parentRecord);
      setDraftVideoFee(freshBd.videoItem.feeNetVnd);
      setDraftAddons(freshBd.addonItems);
    } else {
      setParentId('');
    }
    const next = deal ? templateFor(koc, k, deal, data.templates) : (data.templates.find(t => t.kind === k)?.id || '');
    setTemplate(null); setValues({}); setTemplateId(next);
  };

  const switchSourceMode = (nextOwnForm: boolean) => {
    setIsKocOwnForm(nextOwnForm);
    if (nextOwnForm) {
      setHasCustomTerms(true);
      if (!templateId) {
        const fallback = deal ? templateFor(koc, kind, deal, data.templates) : (data.templates.find(t => t.kind === kind)?.id || 'IND-HD');
        setTemplateId(fallback);
      }
    }
  };

  const handleKocDocxSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.docx')) {
      setLoadError('Vui lòng chọn tệp hợp đồng định dạng Word (.docx).');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      try {
        const parsed = await parseDocxInBrowser(base64);
        setCustomFile({
          filename: file.name,
          base64,
          blocks: parsed.blocks,
          paragraphs: parsed.paragraphs,
        });
        setLoadError('');
        if (!title.trim()) {
          const cleanName = file.name.replace(/\.docx$/i, '');
          setTitle(cleanName);
        }
      } catch (err) {
        setLoadError((err as Error).message || 'Không đọc được nội dung file Word (.docx).');
      }
    };
    reader.readAsDataURL(file);
  };

  const setValue = (f: ContractField, raw: string) => {
    const v = f.kind === 'money' ? formatMoneyInput(raw) : raw;
    setValues(prev => ({ ...prev, [f.key]: v }));
    if (prefilled.has(f.key)) setPrefilled(prev => { const n = new Set(prev); n.delete(f.key); return n; });
  };

  const focusFieldInput = (fieldKey: string) => {
    setActiveFieldKey(fieldKey);
    const input = document.getElementById(`ct-f-${fieldKey}`);
    if (input) {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input.focus();
    }
  };

  const applyOcrFields = (extracted: OcrExtractedFields, docLabel?: string) => {
    const resolvedPartner =
      extracted.companyName ||
      extracted.fullName ||
      partner;
    if (resolvedPartner) setPartner(resolvedPartner);

    if (fields.length > 0) {
      const nextValues = { ...values };
      const filledKeys = new Set(prefilled);
      const cccdText = [
        extracted.idNumber,
        extracted.issueDate ? `cấp ngày ${extracted.issueDate}` : '',
        extracted.issuePlace ? `tại ${extracted.issuePlace}` : '',
      ]
        .filter(Boolean)
        .join(' ');
      const repText = [
        extracted.legalRepresentative || extracted.fullName,
        extracted.legalRepTitle ? `Chức vụ: ${extracted.legalRepTitle}` : '',
      ]
        .filter(Boolean)
        .join(' — ');
      const addrText = extracted.headquartersAddress || extracted.permanentAddress || extracted.originAddress || '';

      for (const f of fields) {
        if (f.source === 'partyName' && resolvedPartner) {
          nextValues[f.key] = resolvedPartner;
          filledKeys.add(f.key);
        } else if (f.source === 'ownerName' && (extracted.fullName || extracted.legalRepresentative)) {
          nextValues[f.key] = extracted.fullName || extracted.legalRepresentative || '';
          filledKeys.add(f.key);
        } else if (f.source === 'representative' && repText) {
          nextValues[f.key] = repText;
          filledKeys.add(f.key);
        } else if (f.source === 'cccd' && cccdText) {
          nextValues[f.key] = cccdText;
          filledKeys.add(f.key);
        } else if (f.source === 'taxCode' && extracted.taxCode) {
          nextValues[f.key] = extracted.taxCode;
          filledKeys.add(f.key);
        } else if (f.source === 'address' && addrText) {
          nextValues[f.key] = addrText;
          filledKeys.add(f.key);
        }
      }
      setValues(nextValues);
      setPrefilled(filledKeys);
    }
    setOcrNotice(`Đã điền thông tin Bên B từ ${docLabel || 'giấy tờ pháp lý'}: ${resolvedPartner}`);
    setOcrOpen(false);
  };

  const runOcrRequest = async (payload: { imageBase64?: string; fileName?: string; presetKey?: string }) => {
    setOcrBusy(true);
    try {
      const res = await fetch('/api/ocr/extract-legal-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success && json.data?.fields) {
        applyOcrFields(json.data.fields as OcrExtractedFields, json.data.documentTypeLabel);
      } else {
        setLoadError(json.error || 'Không đọc được thông tin từ ảnh giấy tờ.');
      }
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setOcrBusy(false);
    }
  };

  const handleOcrFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = typeof reader.result === 'string' ? reader.result : '';
      runOcrRequest({ imageBase64: base64, fileName: file.name });
    };
    reader.readAsDataURL(file);
  };

  const templates = data.templates.filter(t => t.kind === kind && t.active !== false);
  // SOW phải gắn với hợp đồng nguyên tắc gốc của KOC
  const isSow = templateId.endsWith('-SOW');
  const parents = data.records.filter(r =>
    !isAcceptance(r.templateId) &&
    r.id !== record?.id &&
    (isSow
      ? r.templateId.endsWith('-HDNT') && (!targetKocId || !r.kocId || r.kocId === targetKocId)
      : !dealId || !r.dealId || r.dealId === dealId || (targetKocId && r.kocId === targetKocId)),
  );
  const dealOptions = useMemo(() => {
    const slice = deals.slice(0, 200);
    if (deal && !slice.some(d => d.id === deal.id)) {
      return [deal, ...slice];
    }
    return slice;
  }, [deals, deal]);

  const docDateVal = values['token:[dd.mm.yy]'] || '';
  const kocIdVal = values['token:[ID KOC]'] || '';
  const duplicateRecord = useMemo(() => {
    if (!docDateVal || !kocIdVal) return null;
    return data.records.find(
      r =>
        r.id !== record?.id &&
        r.values['token:[dd.mm.yy]'] === docDateVal &&
        r.values['token:[ID KOC]'] === kocIdVal,
    );
  }, [data.records, record?.id, docDateVal, kocIdVal]);

  const resolveDuplicateNumber = () => {
    const suffix = deal?.dealCode ? `-${deal.dealCode}` : `-${String(data.records.length + 1).padStart(2, '0')}`;
    setValues(prev => ({
      ...prev,
      'token:[ID KOC]': `${kocIdVal}${suffix}`,
    }));
  };

  const numericTotal = useMemo(() => {
    const netField = fields.find(f => f.source === 'netTotal') || fields.find(f => f.source === 'lineTotal');
    const raw =
      (isKocOwnForm ? customContractValue : '') ||
      (netField ? values[netField.key] : '') ||
      values['token:[Tổng tiền trước thuế/sau thuế]'] ||
      values['token:[Thù lao trọn gói]'] ||
      values['token:[Thành tiền (VNĐ)]'] ||
      '';
    const parsed = parseInt(raw.replace(/[^\d]/g, ''), 10);
    const dealRecord = deal as unknown as Record<string, unknown> | undefined;
    const fallbackAmount = Number(
      deal?.totalValue || dealRecord?.paymentAmount || dealRecord?.contractAmount || 0
    );
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackAmount;
  }, [values, fields, deal, isKocOwnForm, customContractValue]);

  const numericAdvance = useMemo(() => {
    const advField = fields.find(f => f.source === 'advanceAmount');
    const raw = (advField ? values[advField.key] : '') || values['token:[Số tiền tạm ứng đợt 1]'] || '';
    const parsed = parseInt(raw.replace(/[^\d]/g, ''), 10);
    return Number.isFinite(parsed) ? parsed : (deal?.advanceAmount || 0);
  }, [values, fields, deal]);

  const ruleEval = useMemo(() => {
    const selectedTpl = data.templates.find(t => t.id === templateId);
    return evaluateContractRules({
      koc,
      deal,
      totalValue: numericTotal,
      advanceAmount: numericAdvance,
      hasCustomTerms: isKocOwnForm || hasCustomTerms,
      isKolForm: isKocOwnForm || selectedTpl?.scope === 'KOC_CUSTOM',
      availableTemplates: data.templates,
    });
  }, [koc, deal, numericTotal, numericAdvance, hasCustomTerms, isKocOwnForm, templateId, data.templates]);

  const canSubmitForm =
    !busy &&
    Boolean(template) &&
    Boolean(title.trim()) &&
    Boolean(brand.trim()) &&
    Boolean(partner.trim()) &&
    (!isKocOwnForm || Boolean(customFile)) &&
    (!isSow || Boolean(parentId));

  return (
    <form
      className="space-y-4"
      onSubmit={e => {
        e.preventDefault();
        const nextValues = isKocOwnForm && customContractValue.trim()
          ? { ...values, 'token:[Tổng tiền trước thuế/sau thuế]': customContractValue.trim() }
          : values;
        onSave({
          title: title.trim(),
          brand: brand.trim(),
          partner: partner.trim(),
          templateId,
          parentId,
          values: nextValues,
          dealId: deal?.id,
          dealCode: deal?.dealCode,
          kocId: koc?.id,
          hasCustomTerms: isKocOwnForm ? true : hasCustomTerms,
          customTermsSummary: customTermsSummary.trim() || undefined,
          internalNotes: internalNotes.trim() || undefined,
          isKocOwnForm,
          customFilename: isKocOwnForm ? customFile?.filename : undefined,
          customFileBase64: isKocOwnForm ? customFile?.base64 : undefined,
          customFileBlocks: isKocOwnForm ? customFile?.blocks : undefined,
          customFileParagraphs: isKocOwnForm ? customFile?.paragraphs : undefined,
          acceptanceScreenshots,
        });
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={onCancel} className="-ml-2.5">Hợp đồng</Button>
          <span className="text-ink-3">/</span>
          <h2 className="text-base font-semibold text-ink truncate">
            {editing ? `Sửa ${record!.title} (v${record!.version + 1})` : 'Tạo hợp đồng'}
          </h2>
          {isKocOwnForm ? (
            <span className="rounded-md bg-accent/15 px-2 py-0.5 text-2xs font-medium text-accent">
              {customFile ? `Tệp KOC: ${customFile.filename}` : 'Chưa chọn tệp .docx KOC'}
            </span>
          ) : (
            template && (
              <span className="rounded-md bg-sunken px-2 py-0.5 text-2xs font-medium text-ink-2 tabular-nums">
                Đã điền {requiredDone}/{required.length} mục bắt buộc
              </span>
            )
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {kind === 'ACCEPTANCE' && (
            <Button
              size="sm"
              variant="secondary"
              icon={Camera}
              onClick={() => setScreenshotModalOpen(true)}
            >
              Lấy thông tin Link Air & cắt ảnh nghiệm thu{acceptanceScreenshots.length > 0 ? ` (${acceptanceScreenshots.length})` : ''}
            </Button>
          )}
          {!isKocOwnForm && (
            <Button size="sm" variant="secondary" icon={FileScan} onClick={() => setOcrOpen(true)}>
              Đọc ảnh CCCD / ĐKKD
            </Button>
          )}
          {template && (
            <Button size="sm" variant="secondary" icon={Columns2} onClick={() => setShowSplitPreview(v => !v)}>
              {showSplitPreview ? 'Ẩn bản xem A4' : 'Xem bản A4 song song'}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onCancel}>Hủy</Button>
          <Button size="sm" variant="primary" type="submit" disabled={!canSubmitForm}>
            {editing ? 'Lưu phiên bản mới' : 'Lưu nháp'}
          </Button>
        </div>
      </div>

      {ocrNotice && (
        <div role="status" className="rounded-xl bg-positive-soft border border-line px-4 py-2 text-xs text-positive font-medium flex items-center justify-between gap-2">
          <span>{ocrNotice}</span>
          <button type="button" onClick={() => setOcrNotice('')} className="text-ink-3 hover:text-ink">Đóng</button>
        </div>
      )}

      {duplicateRecord && (
        <div className="rounded-xl border border-warning/40 bg-warning-soft px-3.5 py-2.5 text-xs text-ink flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-warning-strong shrink-0" />
            <span><strong className="text-warning-strong font-semibold">Trùng số hợp đồng:</strong> Đã tồn tại hồ sơ {docDateVal}/{kocIdVal} (&ldquo;{duplicateRecord.title}&rdquo;).</span>
          </div>
          <Button size="sm" variant="secondary" onClick={resolveDuplicateNumber}>
            Thêm hậu tố (-{deal?.dealCode || '02'})
          </Button>
        </div>
      )}

      {loadError && <p role="alert" className="text-[13px] text-critical">{loadError}</p>}

      <div className={`grid grid-cols-1 gap-5 items-start ${template && showSplitPreview ? 'xl:grid-cols-[minmax(0,1fr)_minmax(480px,54%)]' : ''}`}>
        <div className="grid gap-4 min-w-0">
          {(kocLegalNotes || primaryKocTemplate) && (
            <div className="rounded-xl border border-warning/40 bg-warning-soft/75 p-3 space-y-1.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-warning-strong flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 shrink-0" />
                  Lưu ý Pháp chế ({koc?.stageName || partner || 'KOC'}):
                </span>
                {primaryKocTemplate && templateId !== primaryKocTemplate.id && !editing && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setTemplate(null);
                      setValues({});
                      setTemplateId(primaryKocTemplate.id);
                      setHasCustomTerms(false);
                    }}
                  >
                    Áp dụng mẫu riêng ({primaryKocTemplate.name})
                  </Button>
                )}
              </div>
              {kocLegalNotes && <p className="text-ink whitespace-pre-wrap">{kocLegalNotes}</p>}
            </div>
          )}

          <Panel title="Thông tin chung">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-line">
                <span className="text-xs font-medium text-ink-2">Nguồn hợp đồng</span>
                <Segmented
                  value={isKocOwnForm ? 'KOC_DOCX' : 'UPBASE_TEMPLATE'}
                  onChange={v => switchSourceMode(v === 'KOC_DOCX')}
                  items={[
                    { key: 'UPBASE_TEMPLATE', label: 'Soạn theo mẫu hệ thống' },
                    { key: 'KOC_DOCX', label: 'Tải lên file hợp đồng riêng của KOC (.docx)' },
                  ]}
                />
              </div>

              <div className="grid gap-3.5 md:grid-cols-2">
                <Field label="Booking" htmlFor="ct-deal">
                  <Select id="ct-deal" value={dealId} onChange={e => chooseDeal(e.target.value)} disabled={editing && !!record?.dealId}>
                    <option value="">Không gắn booking</option>
                    {dealOptions.map(d => <option key={d.id} value={d.id}>{d.dealCode} · {d.kocStageName} · {d.brandName}</option>)}
                  </Select>
                </Field>
                <Field label="Loại hồ sơ">
                  <div>
                    {editing ? (
                      <span className="text-[13.5px] text-ink">{kind === 'CONTRACT' ? 'Hợp đồng' : 'Biên bản nghiệm thu'}</span>
                    ) : (
                      <Segmented items={[{ key: 'CONTRACT', label: 'Hợp đồng' }, { key: 'ACCEPTANCE', label: 'Biên bản nghiệm thu' }]} value={kind} onChange={chooseKind} />
                    )}
                  </div>
                </Field>
                <Field label={isKocOwnForm ? 'Phân loại pháp nhân / Mẫu đối chiếu' : 'Mẫu pháp chế'} htmlFor="ct-template">
                  <Select
                    id="ct-template"
                    required
                    value={templateId}
                    disabled={editing}
                    onChange={e => {
                      const nextTpl = e.target.value;
                      setTemplate(null);
                      setValues({});
                      setTemplateId(nextTpl);
                      if (nextTpl.endsWith('-SOW') && !parentId) {
                        const matchingHdnt = data.records.find(
                          r => r.templateId.endsWith('-HDNT') && ((targetKocId && r.kocId === targetKocId) || (partner && r.partner === partner)),
                        );
                        if (matchingHdnt) setParentId(matchingHdnt.id);
                      }
                    }}
                  >
                    <option value="">Chọn mẫu</option>
                    {kocTemplates.length > 0 && (
                      <optgroup label={`Mẫu duyệt riêng KOC (${kocTemplates.length})`}>
                        {kocTemplates.map(t => (
                          <option key={t.id} value={t.id}>
                            [Mẫu riêng] {t.name} ({t.version})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="Mẫu chuẩn Upbase">
                      {(editing ? data.templates : templates)
                        .filter(t => !kocTemplates.some(kt => kt.id === t.id))
                        .map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </optgroup>
                  </Select>
                </Field>
                <Field label="Tên hồ sơ" htmlFor="ct-title">
                  <Input id="ct-title" required maxLength={180} value={title} onChange={e => setTitle(e.target.value)} placeholder="Hợp đồng video · Tên KOC · Nhãn hàng" />
                </Field>
                <Field label="Nhãn hàng" htmlFor="ct-brand">
                  <Input id="ct-brand" required maxLength={120} list="ct-brands" value={brand} onChange={e => setBrand(e.target.value)} />
                  <datalist id="ct-brands">{data.actor.brands.map(b => <option key={b} value={b} />)}</datalist>
                </Field>
                <Field label="Đối tác (Bên B)" htmlFor="ct-partner">
                  <Input id="ct-partner" required maxLength={180} value={partner} onChange={e => setPartner(e.target.value)} />
                </Field>
                {isKocOwnForm && (
                  <Field label="Tổng giá trị hợp đồng (VNĐ)" htmlFor="ct-koc-total" className="md:col-span-2">
                    <Input
                      id="ct-koc-total"
                      inputMode="numeric"
                      className="tabular-nums"
                      value={customContractValue}
                      onChange={e => setCustomContractValue(formatMoneyInput(e.target.value))}
                      placeholder="Nhập giá trị ghi trên hợp đồng KOC để đối soát..."
                    />
                  </Field>
                )}
                {(kind === 'ACCEPTANCE' || isSow) && (
                  <Field label={isSow ? 'Hợp đồng nguyên tắc' : 'Phụ lục SOW / Hợp đồng gốc của Job'} htmlFor="ct-parent" className="md:col-span-2">
                    <Select
                      id="ct-parent"
                      value={parentId}
                      onChange={e => {
                        const nextParentId = e.target.value;
                        setParentId(nextParentId);
                        const pRec = data.records.find(r => r.id === nextParentId);
                        if (pRec) {
                          if (!brand.trim()) setBrand(pRec.brand);
                          if (!partner.trim()) setPartner(pRec.partner);
                          if (pRec.dealId && !dealId) chooseDeal(pRec.dealId);
                          if (!title.trim()) setTitle([isSow ? 'SOW booking video' : 'Nghiệm thu video', pRec.partner, pRec.brand].filter(Boolean).join(' · '));
                          const freshBd = buildJobAcceptanceBreakdown(deal, koc, pRec);
                          setDraftVideoFee(freshBd.videoItem.feeNetVnd);
                          setDraftAddons(freshBd.addonItems);
                          const inferredTpl = isSow ? '' : inferAcceptanceTemplate(pRec.templateId);
                          if (inferredTpl && inferredTpl !== templateId) {
                            setTemplate(null);
                            setValues({});
                            setTemplateId(inferredTpl);
                          } else if (template) {
                            const pTpl = data.templates.find(t => t.id === pRec.templateId);
                            const result = prefill(fields, {}, {
                              koc,
                              deal,
                              brand: brand || pRec.brand,
                              existingRecords: data.records,
                              parentRecord: pRec,
                              parentFields: pTpl ? uniqueFields(pTpl) : [],
                            });
                            setValues(result.values);
                            setPrefilled(new Set(result.filled));
                          }
                        }
                      }}
                    >
                      <option value="">{isSow ? 'Chọn hợp đồng nguyên tắc' : 'Chọn Phụ lục SOW / Hợp đồng của Job'}</option>
                      {parents.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                    </Select>
                  </Field>
                )}
              </div>

              {isKocOwnForm && (
                <div className="rounded-xl border-2 border-dashed border-accent/40 bg-accent-soft/20 p-4 space-y-2.5">
                  <input
                    ref={kocDocxInputRef}
                    type="file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleKocDocxSelect}
                    className="hidden"
                  />
                  {customFile ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface border border-line px-3.5 py-2.5 text-xs">
                      <div className="min-w-0">
                        <span className="font-semibold text-ink block truncate">{customFile.filename}</span>
                        <span className="text-2xs text-ink-3">
                          Đã đọc {customFile.paragraphs.filter(p => p.trim()).length} đoạn văn bản · Xem trực tiếp bên phải
                        </span>
                      </div>
                      <Button size="sm" variant="secondary" icon={FileUp} onClick={() => kocDocxInputRef.current?.click()}>
                        Đổi file .docx khác
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs">
                        <span className="font-semibold text-ink block">Tải lên hợp đồng theo mẫu riêng của KOC / Agency (.docx)</span>
                        <span className="text-2xs text-ink-3">
                          Hệ thống hiển thị nguyên văn trên khung A4 để Pháp chế &amp; Kế toán rà soát và lưu làm mẫu chuẩn của KOC.
                        </span>
                      </div>
                      <Button size="sm" variant="primary" icon={Upload} onClick={() => kocDocxInputRef.current?.click()}>
                        Chọn file .docx của KOC
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Thanh tóm tắt quy tắc pháp chế & tùy chọn điều khoản riêng */}
              <div className="rounded-lg border border-line bg-sunken/40 p-3 space-y-2.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-2">
                    <span>
                      Luồng duyệt: <strong className="text-accent font-semibold">{ruleEval.reviewStream.streamName}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      SLA: <strong className="text-ink">TCKT {ruleEval.reviewStream.slaHoursTckt}h · Pháp chế {ruleEval.reviewStream.slaHoursLegal}h</strong>
                    </span>
                    <span>·</span>
                    <span>
                      {ruleEval.isContractMandatory ? 'Bắt buộc ký HĐ' : 'Miễn HĐ giấy'} · {ruleEval.isAcceptanceMandatory ? 'Bắt buộc BBNT' : 'Thanh lý tự động'}
                    </span>
                  </div>
                  {!isKocOwnForm && (
                    <label className="inline-flex items-center gap-2 cursor-pointer font-medium text-ink">
                      <input
                        type="checkbox"
                        checked={hasCustomTerms}
                        onChange={e => setHasCustomTerms(e.target.checked)}
                        className="rounded border-line"
                      />
                      <span>Có sửa điều khoản / ngoại lệ</span>
                    </label>
                  )}
                </div>

                {(hasCustomTerms || isKocOwnForm) && (
                  <div className="grid gap-3 md:grid-cols-2 pt-2 border-t border-line">
                    <Field label={isKocOwnForm ? 'Điểm lưu ý chính trong mẫu riêng của KOC' : 'Nội dung đề xuất sửa / Thỏa thuận riêng'} htmlFor="ct-custom-terms">
                      <Textarea
                        id="ct-custom-terms"
                        rows={2}
                        value={customTermsSummary}
                        onChange={e => setCustomTermsSummary(e.target.value)}
                        placeholder={isKocOwnForm ? 'Tóm tắt điều khoản thanh toán, phạt, bản quyền trong form của KOC...' : 'Nêu điều khoản thay đổi để Pháp chế duyệt...'}
                      />
                    </Field>
                    <Field label="Ghi chú nội bộ" htmlFor="ct-notes">
                      <Textarea
                        id="ct-notes"
                        rows={2}
                        value={internalNotes}
                        onChange={e => setInternalNotes(e.target.value)}
                        placeholder="Ghi chú trao đổi với KOC / Quản lý..."
                      />
                    </Field>
                  </div>
                )}
              </div>
            </div>
          </Panel>

          {kind === 'ACCEPTANCE' && (
            <Panel
              title="Kiểm tra Bản nháp Nghiệm thu theo Phụ lục Job (Video + Dịch vụ đi kèm)"
              actions={
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const nextList: JobAcceptanceAddonRow[] = [
                        ...draftAddons,
                        {
                          id: `addon-${Date.now()}`,
                          termType: 'CROSS_POST_REUP',
                          termLabel: 'Đăng chéo kênh phụ / Dịch vụ bổ sung theo Phụ lục',
                          durationDays: 30,
                          evidenceCodeOrUrl: '',
                          allocatedCostVnd: 0,
                          acceptanceStatus: 'VERIFIED',
                        },
                      ];
                      applyJobBreakdownToDraftValues(draftVideoFee, nextList);
                    }}
                  >
                    + Thêm dịch vụ đi kèm
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => applyJobBreakdownToDraftValues(draftVideoFee, draftAddons)}
                  >
                    Đồng bộ vào Bản nháp A4
                  </Button>
                </div>
              }
            >
              <div className="space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg border border-line bg-sunken/50">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-accent/15 text-accent font-mono font-semibold">
                      Job: {jobAcceptanceBreakdown.jobCode}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-surface border border-line font-mono text-ink-2">
                      Phụ lục SOW: {jobAcceptanceBreakdown.appendixCode}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-surface border border-line font-mono text-ink-2">
                      HĐNT: {jobAcceptanceBreakdown.masterContractCode}
                    </span>
                  </div>
                  <Status tone="positive">
                    Nghiệm thu theo Phụ lục Job (1 Video + {draftAddons.length} dịch vụ đi kèm)
                  </Status>
                </div>

                {/* Hạng mục 1: Video chính */}
                <div className="p-3 rounded-lg border border-line bg-surface space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-ink">
                      1. Hạng mục Video chính: Sản xuất và đăng tải Video review ({jobAcceptanceBreakdown.videoItem.productName || brand || 'Sản phẩm chiến dịch'})
                    </span>
                    <Status tone="positive">Hoàn thành</Status>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 items-end">
                    <Field label="Ngày đăng tải thực tế (Air Date)">
                      <Input
                        value={jobAcceptanceBreakdown.videoItem.airDate || '—'}
                        readOnly
                        className="font-mono bg-sunken/40"
                      />
                    </Field>
                    <Field label="Link bài đăng (Link Air)">
                      <Input
                        value={jobAcceptanceBreakdown.videoItem.videoUrl || 'Chưa điền link video'}
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
                          applyJobBreakdownToDraftValues(nextFee, draftAddons);
                        }}
                      />
                    </Field>
                  </div>
                </div>

                {/* Hạng mục 2..N: Các dịch vụ đi kèm trong Phụ lục Job */}
                <div className="p-3 rounded-lg border border-line bg-surface space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-ink">
                      2. Các dịch vụ đi kèm theo Phụ lục SOW ({draftAddons.length} hạng mục)
                    </span>
                    <span className="text-2xs font-mono text-ink-2">
                      Phí dịch vụ đạt nghiệm thu: {formatNumber(jobAcceptanceBreakdown.financials.activeAddonsNet)}đ
                      {jobAcceptanceBreakdown.financials.droppedDeduction > 0
                        ? ` · Khấu trừ hủy: -${formatNumber(jobAcceptanceBreakdown.financials.droppedDeduction)}đ`
                        : ''}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {draftAddons.map((addon, idx) => (
                      <div
                        key={addon.id || idx}
                        className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center p-2 rounded-lg border border-line bg-sunken/30"
                      >
                        <div className="md:col-span-4">
                          <Input
                            value={addon.termLabel}
                            onChange={e => {
                              const nextList = draftAddons.map((a, i) =>
                                i === idx ? { ...a, termLabel: e.target.value } : a,
                              );
                              applyJobBreakdownToDraftValues(draftVideoFee, nextList);
                            }}
                            placeholder="Tên dịch vụ đi kèm..."
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
                              applyJobBreakdownToDraftValues(draftVideoFee, nextList);
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
                              applyJobBreakdownToDraftValues(draftVideoFee, nextList);
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
                              applyJobBreakdownToDraftValues(draftVideoFee, nextList);
                            }}
                            placeholder="0 (Gộp gói)"
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
                              applyJobBreakdownToDraftValues(draftVideoFee, nextList);
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
                                applyJobBreakdownToDraftValues(draftVideoFee, nextList);
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

                {/* Tóm tắt quyết toán nghiệm thu theo Phụ lục Job */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-2.5 rounded-lg border border-line bg-sunken/60 font-mono">
                  <div>
                    <span className="text-2xs text-ink-3 block">Tổng Phụ lục SOW</span>
                    <strong className="text-ink">{formatNumber(jobAcceptanceBreakdown.financials.plannedTotalNet)}đ</strong>
                  </div>
                  <div>
                    <span className="text-2xs text-ink-3 block">Khấu trừ hủy DV</span>
                    <strong className={jobAcceptanceBreakdown.financials.droppedDeduction > 0 ? 'text-critical' : 'text-ink-2'}>
                      {jobAcceptanceBreakdown.financials.droppedDeduction > 0
                        ? `-${formatNumber(jobAcceptanceBreakdown.financials.droppedDeduction)}đ`
                        : '0đ'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-2xs text-ink-3 block">Nghiệm thu Net</span>
                    <strong className="text-ink">{formatNumber(jobAcceptanceBreakdown.financials.acceptedTotalNet)}đ</strong>
                  </div>
                  <div>
                    <span className="text-2xs text-ink-3 block">
                      {jobAcceptanceBreakdown.subjectKind === 'COM'
                        ? `VAT (${deal?.vatRatePercent ?? 8}%)`
                        : jobAcceptanceBreakdown.subjectKind === 'HKD'
                          ? 'Thuế HKD (0đ)'
                          : 'Thuế TNCN (10%)'}
                    </span>
                    <strong className="text-ink">
                      {formatNumber(
                        jobAcceptanceBreakdown.subjectKind === 'COM'
                          ? jobAcceptanceBreakdown.financials.vatTax
                          : jobAcceptanceBreakdown.financials.pitTax,
                      )}đ
                    </strong>
                  </div>
                  <div>
                    <span className="text-2xs text-ink-3 block">
                      Còn trả (Sau tạm ứng {formatNumber(jobAcceptanceBreakdown.financials.advanceAmount)}đ)
                    </span>
                    <strong className="text-positive">{formatNumber(jobAcceptanceBreakdown.financials.remainingPayable)}đ</strong>
                  </div>
                </div>
              </div>
            </Panel>
          )}

          {!isKocOwnForm && template && groups.map(g => (
            <Panel key={g.key} title={g.title}>
              <div className="grid gap-3.5 md:grid-cols-2">
                {g.fields.map(f => {
                  const id = `ct-f-${f.key}`;
                  const label = `${f.title || f.label}${f.required ? ' *' : ''}`;
                  return (
                    <Field key={f.key} label={label} htmlFor={id} className={f.kind === 'long' ? 'md:col-span-2' : undefined}>
                      {f.kind === 'long' ? (
                        <Textarea
                          id={id}
                          rows={2}
                          maxLength={4000}
                          value={values[f.key] || ''}
                          onFocus={() => setActiveFieldKey(f.key)}
                          onChange={e => setValue(f, e.target.value)}
                        />
                      ) : (
                        <Input
                          id={id}
                          maxLength={4000}
                          inputMode={f.kind === 'money' || f.kind === 'number' ? 'numeric' : undefined}
                          placeholder={f.kind === 'date' ? 'dd/mm/yyyy' : f.kind === 'money' ? 'Số tiền (đ)' : undefined}
                          className={f.kind === 'money' || f.kind === 'number' ? 'tabular-nums' : undefined}
                          value={values[f.key] || ''}
                          onFocus={() => setActiveFieldKey(f.key)}
                          onChange={e => setValue(f, e.target.value)}
                        />
                      )}
                    </Field>
                  );
                })}
              </div>
            </Panel>
          ))}

          {(kind === 'ACCEPTANCE' || acceptanceScreenshots.length > 0) && (
            <Panel
              title="Kiểm tra Link Air, Chỉ số tương tác, Kịch bản & Hình ảnh nghiệm thu"
              actions={
                <Button
                  size="sm"
                  variant="primary"
                  icon={Camera}
                  onClick={() => setScreenshotModalOpen(true)}
                >
                  {acceptanceScreenshots.length > 0
                    ? 'Kiểm tra lại Link Air / Quản lý ảnh'
                    : 'Lấy thông tin Link Air & cắt ảnh nghiệm thu'}
                </Button>
              }
            >
              {(() => {
                const inspectionMeta = acceptanceScreenshots.find(s => s.inspectionMeta)?.inspectionMeta;
                return (
                  <div className="space-y-3">
                    {inspectionMeta && (
                      <div className="p-3 rounded-xl border border-line bg-surface-2/60 space-y-2 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-ink">
                              Kết quả kiểm tra Link Air: @{inspectionMeta.authorHandle}
                            </span>
                            <Status
                              tone={
                                inspectionMeta.scriptVerdict === 'VI_PHẠM_TỪ_CẤM'
                                  ? 'critical'
                                  : inspectionMeta.scriptVerdict === 'ĐẠT_CHUẨN'
                                    ? 'positive'
                                    : 'warning'
                              }
                            >
                              {inspectionMeta.scriptVerdict === 'VI_PHẠM_TỪ_CẤM'
                                ? 'Cảnh báo từ cấm'
                                : inspectionMeta.scriptVerdict === 'ĐẠT_CHUẨN'
                                  ? 'Kịch bản đạt chuẩn'
                                  : 'Cần kiểm tra kịch bản'}
                            </Status>
                            <Status tone={inspectionMeta.hasCartAnchor ? 'positive' : 'warning'}>
                              {inspectionMeta.hasCartAnchor ? 'Đã gắn giỏ hàng' : 'Chưa gắn giỏ hàng'}
                            </Status>
                          </div>
                          <span className="text-2xs font-code text-ink-2">
                            Ngày đăng: {inspectionMeta.publishedTimeFormatted || '—'} · {inspectionMeta.durationSeconds}s
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-ink-2">
                          <span>
                            Views: <strong className="text-ink font-code">{formatNumber(inspectionMeta.viewsCount)}</strong>
                          </span>
                          <span>
                            Tim: <strong className="text-ink font-code">{formatNumber(inspectionMeta.likesCount)}</strong>
                          </span>
                          <span>
                            Bình luận: <strong className="text-ink font-code">{formatNumber(inspectionMeta.commentsCount)}</strong>
                          </span>
                          <span>
                            Chia sẻ: <strong className="text-ink font-code">{formatNumber(inspectionMeta.sharesCount)}</strong>
                          </span>
                          <span>
                            ER: <strong className="text-accent font-code">{inspectionMeta.engagementRate}%</strong>
                          </span>
                        </div>
                        <p className="text-2xs text-ink-2">
                          Đối soát nội dung: <span className="text-ink font-medium">{inspectionMeta.scriptSummaryNote}</span>
                        </p>
                      </div>
                    )}

                    {acceptanceScreenshots.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-line bg-surface-2/40 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-2">
                        <span>
                          Chưa có thông tin kiểm tra Link Air và ảnh chụp sản phẩm. Bấm nút bên phải để lấy thông tin bài đăng, kiểm tra chỉ số, đối soát kịch bản và cắt ảnh KOC cầm sản phẩm đưa vào Biên bản nghiệm thu.
                        </span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {acceptanceScreenshots.map((shot, idx) => (
                          <div
                            key={shot.id || idx}
                            className="flex items-start gap-2.5 p-2.5 rounded-xl border border-line bg-surface-2/50"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={shot.imageDataUrl}
                              alt={shot.note || shot.timeLabel}
                              className="w-16 h-24 rounded-lg object-cover border border-line bg-black shrink-0"
                            />
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="px-1.5 py-0.5 rounded bg-positive-soft text-positive font-code text-2xs font-semibold">
                                  Ảnh #{idx + 1} · Mốc {shot.timeLabel}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAcceptanceScreenshots(prev => prev.filter(x => x.id !== shot.id))
                                  }
                                  className="text-ink-3 hover:text-critical p-0.5"
                                  title="Gỡ ảnh khỏi BBNT"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <p className="text-xs font-medium text-ink line-clamp-2">
                                {shot.note || `Khung hình sản phẩm tại giây ${shot.timeLabel}`}
                              </p>
                              {shot.matchedTerm && (
                                <p className="text-2xs text-ink-3 truncate">SP: {shot.matchedTerm}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </Panel>
          )}
        </div>

        {template && showSplitPreview && (
          <div className="xl:sticky xl:top-4 min-w-0">
            <ContractDocumentViewer
              title={title || (isKocOwnForm && customFile ? customFile.filename : template.name)}
              templateName={isKocOwnForm && customFile ? `Tệp KOC: ${customFile.filename}` : template.name}
              blocks={isKocOwnForm && customFile ? customFile.blocks : (template.blocks || [])}
              paragraphs={isKocOwnForm && customFile ? customFile.paragraphs : template.paragraphs}
              fields={isKocOwnForm ? [] : template.fields}
              values={values}
              compareValues={record?.values}
              activeFieldKey={activeFieldKey}
              onSelectField={focusFieldInput}
              downloadHref={isKocOwnForm ? undefined : `/api/contracts/templates/${template.id}?download=1`}
              maxHeight="calc(100vh - 140px)"
              compactToolbar
              isTemplatePreview={isKocOwnForm}
              acceptanceScreenshots={acceptanceScreenshots}
            />
          </div>
        )}
      </div>

      {template && (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>Hủy</Button>
          <Button variant="primary" type="submit" disabled={!canSubmitForm}>
            {editing ? 'Lưu phiên bản mới' : 'Lưu nháp'}
          </Button>
        </div>
      )}

      <Modal
        open={ocrOpen}
        onClose={() => setOcrOpen(false)}
        title="Đọc ảnh CCCD / Giấy phép ĐKKD"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOcrOpen(false)}>Đóng</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="border-2 border-dashed border-line-strong rounded-xl p-5 text-center bg-canvas/50 space-y-2">
            <input
              ref={ocrInputRef}
              type="file"
              accept="image/*"
              onChange={handleOcrFileChange}
              className="hidden"
            />
            <Button
              variant="primary"
              icon={Upload}
              disabled={ocrBusy}
              onClick={() => ocrInputRef.current?.click()}
            >
              {ocrBusy ? 'Đang đọc ảnh giấy tờ…' : 'Tải ảnh CCCD / ĐKKD từ máy'}
            </Button>
            <p className="text-2xs text-ink-3">
              Hỗ trợ ảnh JPG, PNG chụp rõ nét mặt trước CCCD gắn chip hoặc trang thông tin ĐKKD.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-line">
            <p className="text-xs font-medium text-ink">Hoặc chọn nhanh mẫu giấy tờ có sẵn để điền thử:</p>
            <div className="grid gap-2">
              <button
                type="button"
                disabled={ocrBusy}
                onClick={() => runOcrRequest({ presetKey: 'CCCD_INDIVIDUAL' })}
                className="w-full text-left px-3.5 py-2.5 rounded-lg border border-line hover:bg-sunken transition-colors text-xs"
              >
                <span className="font-semibold text-ink block">CCCD Cá nhân · Nguyễn Thu Trang</span>
                <span className="text-2xs text-ink-3">Số CCCD: 001201019876 · Nơi cấp: Cục Cảnh sát QLHC về TTXH</span>
              </button>
              <button
                type="button"
                disabled={ocrBusy}
                onClick={() => runOcrRequest({ presetKey: 'BUSINESS_HOUSEHOLD' })}
                className="w-full text-left px-3.5 py-2.5 rounded-lg border border-line hover:bg-sunken transition-colors text-xs"
              >
                <span className="font-semibold text-ink block">ĐKKD Hộ kinh doanh · Studio Sáng Tạo Hoàng Gia</span>
                <span className="text-2xs text-ink-3">MST: 8129481023 · Chủ hộ: Trần Văn Nam</span>
              </button>
              <button
                type="button"
                disabled={ocrBusy}
                onClick={() => runOcrRequest({ presetKey: 'BUSINESS_COMPANY' })}
                className="w-full text-left px-3.5 py-2.5 rounded-lg border border-line hover:bg-sunken transition-colors text-xs"
              >
                <span className="font-semibold text-ink block">ĐKKD Công ty · Công ty TNHH Truyền thông &amp; Quảng cáo Creator Việt</span>
                <span className="text-2xs text-ink-3">MST: 0109876543 · Đại diện: Lê Quang Huy (Giám đốc)</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <VideoProductScreenshotModal
        open={screenshotModalOpen}
        onClose={() => setScreenshotModalOpen(false)}
        initialVideoUrl={deal?.tiktokVideoUrl || ''}
        dealId={deal?.id}
        dealCode={deal?.dealCode}
        kocId={koc?.id}
        authorHandle={koc?.channelId || deal?.kocChannelId}
        brandName={brand || deal?.brandName}
        productName={deal?.productName}
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
                    deal?.productName ||
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
    </form>
  );
}
