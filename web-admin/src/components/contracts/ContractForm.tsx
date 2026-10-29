'use client';

/**
 * Tạo hoặc sửa hồ sơ theo mẫu pháp chế. Chọn booking thì tự chọn mẫu theo loại hồ sơ KOC
 * và điền sẵn các ô có dữ liệu (Bên B, số hợp đồng, ngày ký, sản phẩm, giá). Người tạo kiểm tra lại trước khi lưu.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Building2, Camera, CheckCircle2, Columns2, CreditCard, FileScan, FileUp, RefreshCw, Scale, Search, ShieldCheck, Trash2, Upload, UserCheck } from 'lucide-react';
import type { BookingDealItem, KocItem, OcrExtractedFields } from '../../lib/types';
import type { AcceptanceScreenshotItem, ContractField, ContractRecord, DocBlock, LegalTemplate, VideoAcceptanceInspectionMeta } from '../../lib/contracts/types';
import { Button, Field, Input, Modal, Panel, Person, Segmented, Select, Status, StepMark, Textarea } from '../ui';
import { formatNumber } from '../../lib/format';
import { contractApi, type ContractBootstrap } from './api';
import { ContractDocumentViewer } from './ContractDocumentViewer';
import { VideoProductScreenshotModal } from './VideoProductScreenshotModal';
import { findSavedScreenshotsForContext } from '../../lib/acceptanceScreenshotStore';
import {
  evaluateLegalProfileContractReadiness,
  getKocLegalProfiles,
  LEGAL_TYPE_LABEL,
} from '../koc/kocUtils';
import {
  GROUP_ORDER,
  OFFICIAL_3STAGE_TEMPLATE_IDS,
  SOW_JOBS_META_KEY,
  SOW_TASKS_META_KEY,
  SOW_TASK_DELIVERABLE_INFO,
  aggregateMultiJobAcceptanceBreakdown,
  buildDealSowJobTables,
  buildJobAcceptanceBreakdown,
  describeFieldDataSource,
  formatMoneyInput,
  inferAcceptanceTemplateId,
  isAcceptance,
  partnerName,
  prefill,
  resolveActiveLegalProfile,
  syncValuesFromJobAcceptanceBreakdown,
  templateFor,
  uniqueFields,
  type ContractDocStage,
  type JobAcceptanceAddonRow,
  type SowJobTableDraft,
  type SowTaskTermType,
} from './contractUi';
import { evaluateContractRules } from '../../lib/contracts/contractRules';
import { buildStableContractCode, enrichTemplateWithSignFlow } from '../../lib/contracts/contractSystemRules';
import { parseDocxInBrowser } from './docxClientParser';

export interface ContractFormInit {
  dealId?: string;
  kocId?: string;
  legalProfileId?: string;
  kind?: 'CONTRACT' | 'ACCEPTANCE';
  docStage?: ContractDocStage;
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

const loadSavedScreenshotsForDeal = (d?: BookingDealItem, fallbackKocId?: string): AcceptanceScreenshotItem[] => {
  if (!d && !fallbackKocId) return [];
  const primary = findSavedScreenshotsForContext({
    dealId: d?.id,
    dealCode: d?.dealCode,
    kocId: d?.kocId || fallbackKocId,
    videoUrl: d?.tiktokVideoUrl,
  });
  if (primary.length > 0) return primary;
  if (d?.sourceDealCode && d?.dealCode) {
    return findSavedScreenshotsForContext({
      dealId: d.id,
      dealCode: `${d.sourceDealCode}-${d.dealCode}`,
      kocId: d.kocId || fallbackKocId,
      videoUrl: d.tiktokVideoUrl,
    });
  }
  return [];
};

export function ContractForm({
  data,
  deals,
  kocs,
  record,
  init,
  busy,
  onCancel,
  onSave,
  onQuickFrameworkCreated,
  onBackToBooking,
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
  onQuickFrameworkCreated?: (createdRecord: ContractRecord) => void;
  onBackToBooking?: () => void;
}) {
  const editing = !!record;
  const findFrameworkForKoc = (k?: KocItem, d?: BookingDealItem): ContractRecord | undefined => {
    const kId = k?.id || d?.kocId;
    const pName = partnerName(k, d);
    const cleanHandle = (k?.channelId || d?.kocChannelId || '').replace(/^@/, '').toLowerCase();
    return data.records.find(
      r =>
        r.templateId.endsWith('-HDNT') &&
        ((kId && r.kocId === kId) ||
          (pName && r.partner === pName) ||
          (cleanHandle && (r.values['token:[ID KOC]'] || '').toLowerCase().startsWith(cleanHandle))),
    );
  };

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

  const initialDealLookup = deals.find(
    d => d.id === (record?.dealId || init?.dealId) || (record?.dealCode && d.dealCode === record.dealCode),
  );
  const initialKocLookup =
    (init?.kocId ? kocs.find(k => k.id === init.kocId) : undefined) ||
    findKoc(kocs, initialDealLookup) ||
    (record?.kocId ? kocs.find(k => k.id === record.kocId) : undefined);
  const initialResolvedProfile = resolveActiveLegalProfile(
    initialKocLookup,
    initialDealLookup,
    init?.legalProfileId || initialDealLookup?.legalProfileId,
  );

  const initialDocStage: ContractDocStage = (() => {
    const tpl = record?.templateId || init?.templateId || '';
    if (tpl) {
      if (isAcceptance(tpl)) return 'BBNT';
      if (tpl.endsWith('-SOW')) return 'SOW';
      if (tpl.endsWith('-HDNT')) return 'HDNT';
    }
    if (init?.docStage) return init.docStage;
    if (init?.kind === 'ACCEPTANCE') return 'BBNT';
    if (init?.parentId) {
      const p = data.records.find(r => r.id === init.parentId);
      if (p?.templateId.endsWith('-HDNT')) return 'SOW';
    }
    if (initialDealLookup) {
      const existingFw = findFrameworkForKoc(initialKocLookup, initialDealLookup);
      const hasProfileFw = Boolean(
        initialResolvedProfile?.frameworkContractCode?.trim() || initialDealLookup.masterContractCode?.trim(),
      );
      return existingFw || hasProfileFw ? 'SOW' : 'HDNT';
    }
    return 'HDNT';
  })();

  const initialParent =
    data.records.find(r => r.id === (record?.parentId || init?.parentId)) ||
    (initialDocStage === 'BBNT'
      ? findBestParentForAcceptance(initialDealLookup, initialKocLookup)
      : initialDocStage === 'SOW'
        ? findFrameworkForKoc(initialKocLookup, initialDealLookup)
        : undefined);
  const initialDeal = deals.find(
    d =>
      d.id === (record?.dealId || init?.dealId || initialParent?.dealId) ||
      (record?.dealCode && d.dealCode === record.dealCode),
  );
  const initialSyntheticDealForTemplate: BookingDealItem | undefined =
    initialDeal ||
    (initialResolvedProfile
      ? ({
          id: '',
          dealCode: '',
          kocId: initialKocLookup?.id,
          kocStageName: initialKocLookup?.stageName || '',
          kocChannelId: initialKocLookup?.channelId || '',
          brandName: 'UPBASE',
          stage: 'CONTRACTING',
          totalValue: 0,
          legalProfileId: initialResolvedProfile.id,
          vatRatePercent: initialResolvedProfile.vatRatePercent,
          legalProfileSnapshot: {
            legalType: initialResolvedProfile.legalType,
            holderName: initialResolvedProfile.holderName,
          },
        } as unknown as BookingDealItem)
      : undefined);
  const [dealId, setDealId] = useState(initialDeal?.id || '');
  const [selectedKocId, setSelectedKocId] = useState<string>(
    init?.kocId || initialDeal?.kocId || record?.kocId || initialParent?.kocId || initialKocLookup?.id || '',
  );
  const [selectedLegalProfileId, setSelectedLegalProfileId] = useState<string>(
    init?.legalProfileId || initialDeal?.legalProfileId || initialResolvedProfile?.id || '',
  );
  const [kocSearchQuery, setKocSearchQuery] = useState<string>('');
  const [docStage, setDocStage] = useState<ContractDocStage>(initialDocStage);
  const [kind, setKind] = useState<'CONTRACT' | 'ACCEPTANCE'>(
    initialDocStage === 'BBNT'
      ? 'ACCEPTANCE'
      : record
        ? isAcceptance(record.templateId)
          ? 'ACCEPTANCE'
          : 'CONTRACT'
        : init?.templateId
          ? isAcceptance(init.templateId)
            ? 'ACCEPTANCE'
            : 'CONTRACT'
          : init?.kind || 'CONTRACT',
  );
  const inferAcceptanceTemplate = (parentTplId?: string) =>
    inferAcceptanceTemplateId(parentTplId, data.templates);
  const formatStageTitle = (
    stage: ContractDocStage,
    k?: KocItem,
    d?: BookingDealItem,
    fallbackPartner?: string,
    fallbackBrand?: string,
  ) => {
    const kocLabel = k?.stageName || d?.kocStageName || fallbackPartner || '';
    const brandLabel = d?.brandName || fallbackBrand || '';
    if (stage === 'HDNT') {
      return ['Hợp đồng nguyên tắc', kocLabel].filter(Boolean).join(' · ');
    }
    if (stage === 'SOW') {
      return ['Phụ lục SOW', d?.dealCode, kocLabel, brandLabel].filter(Boolean).join(' · ');
    }
    if (stage === 'BBNT') {
      return ['Biên bản nghiệm thu', d?.dealCode, kocLabel, brandLabel].filter(Boolean).join(' · ');
    }
    return ['Hợp đồng video', kocLabel, brandLabel].filter(Boolean).join(' · ');
  };

  const [templateId, setTemplateId] = useState(
    record?.templateId ||
      init?.templateId ||
      (initialDeal
        ? templateFor(findKoc(kocs, initialDeal), initialDocStage === 'BBNT' ? 'ACCEPTANCE' : 'CONTRACT', initialSyntheticDealForTemplate, data.templates, initialDocStage)
        : initialDocStage === 'BBNT' && initialParent
          ? inferAcceptanceTemplate(initialParent.templateId) || 'IND-VID-BBNT'
          : templateFor(initialKocLookup, initialDocStage === 'BBNT' ? 'ACCEPTANCE' : 'CONTRACT', initialSyntheticDealForTemplate, data.templates, initialDocStage)),
  );
  const [title, setTitle] = useState(
    record?.title ||
      formatStageTitle(
        initialDocStage,
        findKoc(kocs, initialDeal) || initialKocLookup,
        initialDeal,
        initialParent?.partner,
        initialDeal?.brandName || initialParent?.brand,
      ),
  );
  const [brand, setBrand] = useState(
    record?.brand ||
      initialDeal?.brandName ||
      initialParent?.brand ||
      (initialDocStage === 'HDNT' ? 'UPBASE' : data.actor.brands[0] || ''),
  );
  const [partner, setPartner] = useState(
    record?.partner ||
      (initialDeal || initialKocLookup
        ? partnerName(findKoc(kocs, initialDeal) || initialKocLookup, initialDeal, init?.legalProfileId || initialDeal?.legalProfileId)
        : initialParent?.partner || ''),
  );
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
      : loadSavedScreenshotsForDeal(initialDeal, initialParent?.kocId)
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
    () =>
      (selectedKocId ? kocs.find(k => k.id === selectedKocId) : undefined) ||
      findKoc(kocs, deal) ||
      (parentRecord?.kocId ? kocs.find(k => k.id === parentRecord.kocId) : undefined),
    [kocs, selectedKocId, deal, parentRecord],
  );
  const kocLegalProfiles = useMemo(() => (koc ? getKocLegalProfiles(koc) : []), [koc]);
  const activeLegalProfile = useMemo(
    () => resolveActiveLegalProfile(koc, deal, selectedLegalProfileId),
    [koc, deal, selectedLegalProfileId],
  );
  const targetKocId = koc?.id || deal?.kocId || record?.kocId || parentRecord?.kocId;
  const kocTemplates = data.templates.filter(
    t => (t.scope === 'KOC_CUSTOM' && t.kocId === targetKocId) || (t.kocId && t.kocId === targetKocId),
  );
  const primaryKocTemplate = kocTemplates[0];
  const kocLegalNotes = primaryKocTemplate?.legalNotes;

  const dealWithActiveProfile = useMemo<BookingDealItem | undefined>(() => {
    if (!deal && !activeLegalProfile) return undefined;
    const base: BookingDealItem = deal || ({
      id: '',
      dealCode: '',
      kocId: koc?.id,
      kocStageName: koc?.stageName || '',
      kocChannelId: koc?.channelId || '',
      brandName: brand || 'UPBASE',
      stage: 'CONTRACTING',
      totalValue: 0,
    } as unknown as BookingDealItem);
    if (!activeLegalProfile) return base;
    const bankAcc = activeLegalProfile.bankAccount || activeLegalProfile.bankAccountNumber || base.kocBankAccount;
    return {
      ...base,
      legalProfileId: activeLegalProfile.id,
      vatRatePercent: activeLegalProfile.vatRatePercent ?? base.vatRatePercent,
      kocIdCardNumber: activeLegalProfile.cccd || base.kocIdCardNumber,
      kocBankName: activeLegalProfile.bankName || base.kocBankName,
      kocBankAccount: bankAcc,
      kocBankHolder: activeLegalProfile.bankHolderName || activeLegalProfile.holderName || base.kocBankHolder,
      legalProfileSnapshot: {
        legalType: activeLegalProfile.legalType,
        holderName: activeLegalProfile.holderName,
        taxCode: activeLegalProfile.taxCode,
        cccd: activeLegalProfile.cccd,
        cccdIssueDate: activeLegalProfile.cccdIssueDate,
        cccdIssuePlace: activeLegalProfile.cccdIssuePlace,
        representativeName: activeLegalProfile.representativeName,
        representativeTitle: activeLegalProfile.representativeTitle,
        registeredAddress: activeLegalProfile.registeredAddress,
        bankName: activeLegalProfile.bankName,
        bankAccount: bankAcc,
        bankAccountNumber: bankAcc,
        bankHolderName: activeLegalProfile.bankHolderName || activeLegalProfile.holderName,
        taxRateLabel: activeLegalProfile.taxRateLabel,
        vatRatePercent: activeLegalProfile.vatRatePercent,
      },
    };
  }, [deal, activeLegalProfile, koc, brand]);

  const ctvAcceptedDeals = useMemo(() => {
    if (!targetKocId) return deal ? [deal] : [];
    const matched = deals.filter(d => d.kocId === targetKocId && (d.tiktokVideoUrl || d.id === deal?.id));
    return matched.length > 0 ? matched.slice(0, 5) : deal ? [deal] : [];
  }, [deals, targetKocId, deal]);

  const initialJobTables = useMemo(
    () =>
      buildDealSowJobTables(
        initialDeal,
        findKoc(kocs, initialDeal) || initialKocLookup,
        initialParent,
        record?.values?.[SOW_JOBS_META_KEY],
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const initialBreakdown = useMemo(
    () =>
      aggregateMultiJobAcceptanceBreakdown({
        jobs: initialJobTables,
        deal: initialDeal,
        koc: findKoc(kocs, initialDeal) || initialKocLookup,
        parentRecord: initialParent,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [draftJobTables, setDraftJobTables] = useState<SowJobTableDraft[]>(initialJobTables);
  const [activeJobTableIdx, setActiveJobTableIdx] = useState<number>(0);
  const [draftVideoFee, setDraftVideoFee] = useState<number>(
    initialJobTables[0]?.videoFeeNetVnd ?? initialBreakdown.videoItem.feeNetVnd,
  );
  const [draftAddons, setDraftAddons] = useState<JobAcceptanceAddonRow[]>(
    initialJobTables[0]?.addonItems ?? initialBreakdown.addonItems,
  );
  const [draftAdvanceAmount, setDraftAdvanceAmount] = useState<number>(initialBreakdown.financials.advanceAmount);
  const [draftProductName, setDraftProductName] = useState<string>(
    initialJobTables[0]?.productName ?? initialBreakdown.videoItem.productName,
  );
  const [draftAirDate, setDraftAirDate] = useState<string>(
    initialJobTables[0]?.airDate ||
      initialDeal?.postedDate ||
      initialDeal?.deadlinePost ||
      initialBreakdown.videoItem.airDate ||
      '',
  );
  const [creatingQuickFramework, setCreatingQuickFramework] = useState<boolean>(false);
  const [quickFwNotice, setQuickFwNotice] = useState<string>('');
  const jobAcceptanceBreakdown = useMemo(
    () =>
      aggregateMultiJobAcceptanceBreakdown({
        jobs: draftJobTables,
        deal: dealWithActiveProfile || deal,
        koc,
        parentRecord,
        advanceAmount: draftAdvanceAmount,
      }),
    [draftJobTables, dealWithActiveProfile, deal, koc, parentRecord, draftAdvanceAmount],
  );

  const latestPrefillCtxRef = useRef({
    koc,
    deal: dealWithActiveProfile || deal,
    brand,
    existingRecords: data.records,
    parentRecord,
    parentFields: parentTemplate ? uniqueFields(parentTemplate) : ([] as ContractField[]),
    legalProfileId: selectedLegalProfileId || deal?.legalProfileId,
    ctvAcceptedDeals,
  });
  useEffect(() => {
    latestPrefillCtxRef.current = {
      koc,
      deal: dealWithActiveProfile || deal,
      brand,
      existingRecords: data.records,
      parentRecord,
      parentFields: parentTemplate ? uniqueFields(parentTemplate) : [],
      legalProfileId: selectedLegalProfileId || deal?.legalProfileId,
      ctvAcceptedDeals,
    };
  });

  // Tải mẫu (kèm vị trí ô). Hồ sơ đang sửa dùng đúng bản mẫu đã khóa của hồ sơ.
  useEffect(() => {
    if (!templateId) return;
    let cancelled = false;
    contractApi<{ template: LegalTemplate }>(`/api/contracts/templates/${templateId}${record ? `?record=${encodeURIComponent(record.id)}` : ''}`)
      .then(r => {
        if (cancelled) return;
        setTemplate(r.template); setLoadError('');
        if (!record) {
          const tplFields = uniqueFields(r.template);
          const result = prefill(tplFields, {}, latestPrefillCtxRef.current);
          const syncedValues =
            docStage === 'SOW' || kind === 'ACCEPTANCE'
              ? syncValuesFromJobAcceptanceBreakdown(tplFields, result.values, jobAcceptanceBreakdown)
              : result.values;
          setValues(syncedValues);
          setPrefilled(new Set(result.filled));
        }
      })
      .catch(e => !cancelled && setLoadError((e as Error).message));
    return () => { cancelled = true; };
    // Chỉ tải lại khi đổi mẫu; đổi booking/KOC được xử lý ở chooseDeal/chooseKocDirectly/chooseLegalProfile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const fields = uniqueFields(template);
  const [fieldFilterMode, setFieldFilterMode] = useState<'ALL' | 'NEEDS_ATTENTION'>(() =>
    init?.dealId || record?.dealId ? 'NEEDS_ATTENTION' : 'ALL',
  );
  const [isContextPickerExpanded, setIsContextPickerExpanded] = useState<boolean>(
    () => !Boolean(init?.dealId || init?.kocId || record?.dealId || record?.kocId),
  );
  const [showOmittedSowTasks, setShowOmittedSowTasks] = useState(false);
  const groups = useMemo(
    () => GROUP_ORDER.map(g => ({ ...g, fields: fields.filter(f => (f.group || 'OTHER') === g.key) })).filter(g => g.fields.length),
    [fields],
  );
  const required = fields.filter(f => f.required);
  const requiredDone = required.filter(f => values[f.key]?.trim()).length;
  const filledTotalCount = fields.filter(f => values[f.key]?.trim()).length;
  const missingTotalCount = fields.length - filledTotalCount;
  const needsAttentionCount = fields.filter(f => !values[f.key]?.trim() || !prefilled.has(f.key)).length;

  const refreshSystemPrefill = () => {
    if (!fields.length) return;
    const result = prefill(fields, {}, {
      koc,
      deal: dealWithActiveProfile || deal,
      brand,
      existingRecords: data.records,
      parentRecord,
      parentFields: parentTemplate ? uniqueFields(parentTemplate) : [],
      legalProfileId: selectedLegalProfileId || deal?.legalProfileId,
      ctvAcceptedDeals,
    });
    const nextBd = aggregateMultiJobAcceptanceBreakdown({
      jobs: draftJobTables,
      deal: dealWithActiveProfile || deal,
      koc,
      parentRecord,
      advanceAmount: draftAdvanceAmount,
    });
    const synced = syncValuesFromJobAcceptanceBreakdown(fields, result.values, nextBd);
    setValues(synced);
    setPrefilled(new Set(result.filled));
  };

  const applyMultiJobTablesToDraftValues = (
    nextJobs: SowJobTableDraft[],
    nextActiveIdx = activeJobTableIdx,
    nextAdvanceAmount = draftAdvanceAmount,
    targetDeal = dealWithActiveProfile || deal,
    targetKoc = koc,
    targetParent = parentRecord,
  ) => {
    const safeIdx = Math.max(0, Math.min(nextActiveIdx, nextJobs.length - 1));
    const activeJob = nextJobs[safeIdx];
    setDraftJobTables(nextJobs);
    setActiveJobTableIdx(safeIdx);
    if (activeJob) {
      setDraftVideoFee(activeJob.videoFeeNetVnd);
      setDraftAddons(activeJob.addonItems);
      setDraftProductName(activeJob.productName);
      setDraftAirDate(activeJob.airDate);
    }
    setDraftAdvanceAmount(nextAdvanceAmount);
    if (fields.length > 0) {
      const nextBd = aggregateMultiJobAcceptanceBreakdown({
        jobs: nextJobs,
        deal: targetDeal,
        koc: targetKoc,
        parentRecord: targetParent,
        advanceAmount: nextAdvanceAmount,
      });
      setValues(prev => syncValuesFromJobAcceptanceBreakdown(fields, prev, nextBd));
    }
  };

  const applyJobBreakdownToDraftValues = (
    nextVideoFee: number,
    nextAddons: JobAcceptanceAddonRow[],
    targetDeal = dealWithActiveProfile || deal,
    targetKoc = koc,
    targetParent = parentRecord,
    nextAdvanceAmount = draftAdvanceAmount,
    nextProductName = draftProductName,
    nextAirDate = draftAirDate,
  ) => {
    const safeIdx = Math.max(0, Math.min(activeJobTableIdx, draftJobTables.length - 1));
    const nextJobs =
      draftJobTables.length > 0
        ? draftJobTables.map((job, idx) =>
            idx === safeIdx
              ? {
                  ...job,
                  videoFeeNetVnd: nextVideoFee,
                  addonItems: nextAddons,
                  productName: nextProductName,
                  airDate: nextAirDate,
                }
              : job,
          )
        : [
            {
              id: 'sow-job-1',
              jobCode: `${targetDeal?.dealCode || 'DEAL'}-J01`,
              jobTitle: `Bảng công việc #1 (${targetDeal?.dealCode || 'DEAL'}-J01)`,
              productName: nextProductName,
              mediaChannel: 'TikTok',
              airDate: nextAirDate,
              videoUrl: targetDeal?.tiktokVideoUrl || '',
              videoFeeNetVnd: nextVideoFee,
              quantity: 1,
              addonItems: nextAddons,
            },
          ];
    applyMultiJobTablesToDraftValues(
      nextJobs,
      safeIdx,
      nextAdvanceAmount,
      targetDeal,
      targetKoc,
      targetParent,
    );
  };

  const handleQuickCreateFrameworkForSow = async () => {
    if (!koc && !deal) return;
    setCreatingQuickFramework(true);
    setLoadError('');
    try {
      const fwTemplateId = templateFor(koc, 'CONTRACT', dealWithActiveProfile || deal, data.templates, 'HDNT');
      const r = await contractApi<{ template: LegalTemplate }>(`/api/contracts/templates/${fwTemplateId}`);
      const fwFields = uniqueFields(r.template);
      const fwPrefill = prefill(fwFields, {}, {
        koc,
        deal: dealWithActiveProfile || deal,
        brand: 'UPBASE',
        existingRecords: data.records,
        legalProfileId: selectedLegalProfileId || deal?.legalProfileId,
      });
      const fwTitle = formatStageTitle('HDNT', koc, dealWithActiveProfile || deal, partner, 'UPBASE');
      const created = await contractApi<{ record: ContractRecord }>('/api/contracts', {
        action: 'CREATE',
        title: fwTitle,
        brand: 'UPBASE',
        partner: partner.trim() || partnerName(koc, deal, selectedLegalProfileId) || 'Đối tác KOC',
        templateId: fwTemplateId,
        values: fwPrefill.values,
        kocId: koc?.id,
        dealId: deal?.id,
        dealCode: deal?.dealCode,
      });
      setParentId(created.record.id);
      const fwDocDate = created.record.values['token:[dd.mm.yy]'] || '';
      if (fwDocDate) {
        setValues(prev => ({
          ...prev,
          'token:[Ngày HĐNT]': fwDocDate,
        }));
      }
      onQuickFrameworkCreated?.(created.record);
      setQuickFwNotice(
        `Đã khởi tạo Hợp đồng nguyên tắc gốc "${created.record.title}" và tự động liên kết vào Phụ lục SOW này.`,
      );
    } catch (e) {
      setLoadError((e as Error).message || 'Không thể khởi tạo nhanh Hợp đồng nguyên tắc.');
    } finally {
      setCreatingQuickFramework(false);
    }
  };

  const chooseDeal = (id: string) => {
    const d = deals.find(x => x.id === id);
    const k = findKoc(kocs, d);
    setDealId(id);
    if (!d) return;
    if (k?.id) setSelectedKocId(k.id);
    const profId = d.legalProfileId || '';
    setSelectedLegalProfileId(profId);
    setBrand(d.brandName);
    setPartner(partnerName(k, d, profId));
    if (d.totalValue && !customContractValue) setCustomContractValue(formatMoneyInput(String(d.totalValue)));

    // Khi chọn 1 Deal để bắt đầu thực thi: nếu KOC đã có HĐNT (trong kho HĐ hoặc trong Hồ sơ pháp lý) -> mở thẳng Phụ lục SOW
    const existingFw = findFrameworkForKoc(k, d);
    const kProf = resolveActiveLegalProfile(k, d, profId);
    const hasFwCode = Boolean(existingFw || kProf?.frameworkContractCode?.trim() || d.masterContractCode?.trim());
    const effectiveStage: ContractDocStage =
      docStage === 'BBNT' ? 'BBNT' : docStage === 'SOW' || hasFwCode ? 'SOW' : 'HDNT';
    if (effectiveStage !== docStage) setDocStage(effectiveStage);

    setTitle(formatStageTitle(effectiveStage, k, d, partnerName(k, d, profId), d.brandName));

    const matchedParent =
      effectiveStage === 'BBNT'
        ? findBestParentForAcceptance(d, k) || parentRecord
        : effectiveStage === 'SOW'
          ? existingFw || parentRecord
          : undefined;
    setParentId(matchedParent?.id || '');

    const freshJobs = buildDealSowJobTables(d, k, matchedParent);
    const freshBd = aggregateMultiJobAcceptanceBreakdown({
      jobs: freshJobs,
      deal: d,
      koc: k,
      parentRecord: matchedParent,
    });
    setDraftJobTables(freshJobs);
    setActiveJobTableIdx(0);
    setDraftVideoFee(freshJobs[0]?.videoFeeNetVnd ?? freshBd.videoItem.feeNetVnd);
    setDraftAddons(freshJobs[0]?.addonItems ?? freshBd.addonItems);
    setDraftAdvanceAmount(freshBd.financials.advanceAmount);
    setDraftProductName(freshJobs[0]?.productName ?? freshBd.videoItem.productName);
    setDraftAirDate(freshJobs[0]?.airDate || d.postedDate || d.deadlinePost || freshBd.videoItem.airDate || '');
    const savedShots = loadSavedScreenshotsForDeal(d, k?.id);
    if (savedShots.length > 0 && acceptanceScreenshots.length === 0) {
      setAcceptanceScreenshots(savedShots);
    }
    const nextTemplate = templateFor(k, effectiveStage === 'BBNT' ? 'ACCEPTANCE' : 'CONTRACT', d, data.templates, effectiveStage);
    if (nextTemplate !== templateId) {
      setTemplate(null);
      setValues({});
      setTemplateId(nextTemplate);
    } else if (template) {
      const matchedParentTpl = matchedParent ? data.templates.find(t => t.id === matchedParent.templateId) : undefined;
      const result = prefill(fields, {}, {
        koc: k,
        deal: d,
        brand: d.brandName,
        existingRecords: data.records,
        parentRecord: matchedParent,
        parentFields: matchedParentTpl ? uniqueFields(matchedParentTpl) : [],
        legalProfileId: profId,
        ctvAcceptedDeals,
      });
      setValues(result.values);
      setPrefilled(new Set(result.filled));
    }
  };

  const chooseKocDirectly = (kId: string) => {
    setSelectedKocId(kId);
    const k = kocs.find(x => x.id === kId);
    if (!k) return;

    const currentDealMatchesKoc =
      deal &&
      (deal.kocId === k.id ||
        (deal.kocChannelId || '').replace(/^@/, '').toLowerCase() === k.channelId.replace(/^@/, '').toLowerCase());
    const matchedDealForKoc = currentDealMatchesKoc
      ? deal
      : docStage === 'HDNT'
        ? undefined
        : deals.find(
            d =>
              d.kocId === k.id ||
              (d.kocChannelId || '').replace(/^@/, '').toLowerCase() === k.channelId.replace(/^@/, '').toLowerCase(),
          );
    if ((matchedDealForKoc?.id || '') !== dealId) {
      setDealId(matchedDealForKoc?.id || '');
    }

    const profiles = getKocLegalProfiles(k);
    const defProf = profiles.find(p => p.isDefault) || profiles[0];
    const nextProfId = defProf?.id || '';
    setSelectedLegalProfileId(nextProfId);
    const nextBrand = matchedDealForKoc?.brandName || (docStage === 'HDNT' ? 'UPBASE' : brand);
    if (nextBrand && nextBrand !== brand) setBrand(nextBrand);
    const nextPartner = partnerName(k, matchedDealForKoc, nextProfId);
    setPartner(nextPartner);
    setTitle(formatStageTitle(docStage, k, matchedDealForKoc, nextPartner, nextBrand));

    const existingFw = findFrameworkForKoc(k, matchedDealForKoc);
    const nextParent =
      docStage === 'BBNT'
        ? findBestParentForAcceptance(matchedDealForKoc, k)
        : docStage === 'SOW'
          ? existingFw
          : undefined;
    setParentId(nextParent?.id || '');

    const bankAcc = defProf?.bankAccount || defProf?.bankAccountNumber;
    const syntheticDeal: BookingDealItem | undefined = defProf
      ? ({
          ...(matchedDealForKoc || {
            id: '',
            dealCode: '',
            kocId: k.id,
            kocStageName: k.stageName,
            kocChannelId: k.channelId,
            brandName: nextBrand || 'UPBASE',
            stage: 'CONTRACTING',
            totalValue: 0,
          }),
          legalProfileId: defProf.id,
          vatRatePercent: defProf.vatRatePercent,
          kocIdCardNumber: defProf.cccd,
          kocBankName: defProf.bankName,
          kocBankAccount: bankAcc,
          kocBankHolder: defProf.bankHolderName || defProf.holderName,
          legalProfileSnapshot: {
            legalType: defProf.legalType,
            holderName: defProf.holderName,
            taxCode: defProf.taxCode,
            cccd: defProf.cccd,
            cccdIssueDate: defProf.cccdIssueDate,
            cccdIssuePlace: defProf.cccdIssuePlace,
            representativeName: defProf.representativeName,
            representativeTitle: defProf.representativeTitle,
            registeredAddress: defProf.registeredAddress,
            bankName: defProf.bankName,
            bankAccount: bankAcc,
            bankAccountNumber: bankAcc,
            bankHolderName: defProf.bankHolderName || defProf.holderName,
            taxRateLabel: defProf.taxRateLabel,
            vatRatePercent: defProf.vatRatePercent,
          },
        } as unknown as BookingDealItem)
      : matchedDealForKoc;

    const freshJobs = buildDealSowJobTables(syntheticDeal, k, nextParent);
    const freshBd = aggregateMultiJobAcceptanceBreakdown({
      jobs: freshJobs,
      deal: syntheticDeal,
      koc: k,
      parentRecord: nextParent,
    });
    setDraftJobTables(freshJobs);
    setActiveJobTableIdx(0);
    setDraftVideoFee(freshJobs[0]?.videoFeeNetVnd ?? freshBd.videoItem.feeNetVnd);
    setDraftAddons(freshJobs[0]?.addonItems ?? freshBd.addonItems);
    setDraftAdvanceAmount(freshBd.financials.advanceAmount);
    setDraftProductName(freshJobs[0]?.productName ?? freshBd.videoItem.productName);
    setDraftAirDate(
      freshJobs[0]?.airDate ||
        matchedDealForKoc?.postedDate ||
        matchedDealForKoc?.deadlinePost ||
        freshBd.videoItem.airDate ||
        '',
    );

    const nextParentTpl = nextParent ? data.templates.find(t => t.id === nextParent.templateId) : undefined;
    const nextCtvDeals = deals
      .filter(d => d.kocId === k.id && (d.tiktokVideoUrl || d.id === matchedDealForKoc?.id))
      .slice(0, 5);
    const nextCtx = {
      koc: k,
      deal: syntheticDeal,
      brand: nextBrand,
      existingRecords: data.records,
      parentRecord: nextParent,
      parentFields: nextParentTpl ? uniqueFields(nextParentTpl) : [],
      legalProfileId: nextProfId,
      ctvAcceptedDeals: nextCtvDeals.length > 0 ? nextCtvDeals : matchedDealForKoc ? [matchedDealForKoc] : [],
    };
    latestPrefillCtxRef.current = nextCtx;

    const nextTemplate = templateFor(k, kind, syntheticDeal, data.templates, docStage);
    if (nextTemplate !== templateId) {
      setTemplate(null);
      setValues({});
      setTemplateId(nextTemplate);
    } else if (template) {
      const result = prefill(fields, {}, nextCtx);
      setValues(result.values);
      setPrefilled(new Set(result.filled));
    }
  };

  const chooseLegalProfile = (profId: string) => {
    setSelectedLegalProfileId(profId);
    const prof = kocLegalProfiles.find(p => p.id === profId);
    const nextPartner = partnerName(koc, deal, profId);
    if (nextPartner) {
      setPartner(nextPartner);
      setTitle(formatStageTitle(docStage, koc, deal, nextPartner, brand));
    }
    const bankAcc = prof?.bankAccount || prof?.bankAccountNumber;
    const syntheticDeal: BookingDealItem | undefined = prof
      ? ({
          ...(deal || {
            id: '',
            dealCode: '',
            kocId: koc?.id,
            kocStageName: koc?.stageName || '',
            kocChannelId: koc?.channelId || '',
            brandName: brand || 'UPBASE',
            stage: 'CONTRACTING',
            totalValue: 0,
          }),
          legalProfileId: prof.id,
          vatRatePercent: prof.vatRatePercent,
          kocIdCardNumber: prof.cccd,
          kocBankName: prof.bankName,
          kocBankAccount: bankAcc,
          kocBankHolder: prof.bankHolderName || prof.holderName,
          legalProfileSnapshot: {
            legalType: prof.legalType,
            holderName: prof.holderName,
            taxCode: prof.taxCode,
            cccd: prof.cccd,
            cccdIssueDate: prof.cccdIssueDate,
            cccdIssuePlace: prof.cccdIssuePlace,
            representativeName: prof.representativeName,
            representativeTitle: prof.representativeTitle,
            registeredAddress: prof.registeredAddress,
            bankName: prof.bankName,
            bankAccount: bankAcc,
            bankAccountNumber: bankAcc,
            bankHolderName: prof.bankHolderName || prof.holderName,
            taxRateLabel: prof.taxRateLabel,
            vatRatePercent: prof.vatRatePercent,
          },
        } as unknown as BookingDealItem)
      : deal;
    const nextCtx = {
      koc,
      deal: syntheticDeal,
      brand,
      existingRecords: data.records,
      parentRecord,
      parentFields: parentTemplate ? uniqueFields(parentTemplate) : [],
      legalProfileId: profId,
      ctvAcceptedDeals,
    };
    latestPrefillCtxRef.current = nextCtx;
    const nextTemplate = templateFor(koc, kind, syntheticDeal, data.templates, docStage);
    if (nextTemplate !== templateId) {
      setTemplate(null);
      setValues({});
      setTemplateId(nextTemplate);
    } else if (template) {
      const result = prefill(fields, {}, nextCtx);
      setValues(result.values);
      setPrefilled(new Set(result.filled));
    }
  };

  const chooseDocStage = (nextStage: ContractDocStage) => {
    const nextKind: 'CONTRACT' | 'ACCEPTANCE' = nextStage === 'BBNT' ? 'ACCEPTANCE' : 'CONTRACT';
    setDocStage(nextStage);
    setKind(nextKind);
    setTitle(formatStageTitle(nextStage, koc, deal, partner, brand));
    if (nextStage === 'HDNT' && !brand.trim()) {
      setBrand('UPBASE');
    }
    let nextParent: ContractRecord | undefined;
    if (nextStage === 'BBNT') {
      nextParent = findBestParentForAcceptance(deal, koc);
      setParentId(nextParent?.id || '');
      const freshBd = buildJobAcceptanceBreakdown(dealWithActiveProfile || deal, koc, nextParent || parentRecord);
      setDraftVideoFee(freshBd.videoItem.feeNetVnd);
      setDraftAddons(freshBd.addonItems);
      setDraftAdvanceAmount(freshBd.financials.advanceAmount);
      setDraftProductName(freshBd.videoItem.productName);
      setDraftAirDate(deal?.postedDate || deal?.deadlinePost || freshBd.videoItem.airDate || '');
    } else if (nextStage === 'SOW') {
      nextParent = findFrameworkForKoc(koc, deal);
      setParentId(nextParent?.id || '');
      const freshBd = buildJobAcceptanceBreakdown(dealWithActiveProfile || deal, koc, nextParent || parentRecord);
      setDraftVideoFee(freshBd.videoItem.feeNetVnd);
      setDraftAddons(freshBd.addonItems);
      setDraftAdvanceAmount(freshBd.financials.advanceAmount);
      setDraftProductName(freshBd.videoItem.productName);
      setDraftAirDate(deal?.postedDate || deal?.deadlinePost || freshBd.videoItem.airDate || '');
    } else {
      setParentId('');
    }
    const nextTpl = templateFor(koc, nextKind, dealWithActiveProfile || deal, data.templates, nextStage);
    setTemplate(null);
    setValues({});
    setTemplateId(nextTpl);
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
    } else {
      setFieldFilterMode('ALL');
      setTimeout(() => {
        const revealed = document.getElementById(`ct-f-${fieldKey}`);
        if (revealed) {
          revealed.scrollIntoView({ behavior: 'smooth', block: 'center' });
          revealed.focus();
        }
      }, 60);
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

  const official11Set = useMemo(() => new Set<string>(OFFICIAL_3STAGE_TEMPLATE_IDS), []);
  const templates = data.templates.filter(
    t =>
      t.active !== false &&
      (t.scope === 'KOC_CUSTOM' || official11Set.has(t.id) || t.id === templateId) &&
      t.kind === kind,
  );
  // SOW phải gắn với hợp đồng nguyên tắc gốc của KOC
  const isSow = templateId.endsWith('-SOW');
  const isHdnt = templateId.endsWith('-HDNT');
  const parents = data.records.filter(r =>
    !isAcceptance(r.templateId) &&
    r.id !== record?.id &&
    (isSow
      ? r.templateId.endsWith('-HDNT') && (!targetKocId || !r.kocId || r.kocId === targetKocId)
      : !dealId || !r.dealId || r.dealId === dealId || (targetKocId && r.kocId === targetKocId)),
  );
  const filteredKocs = useMemo(() => {
    const q = kocSearchQuery.trim().toLowerCase();
    if (!q) return kocs;
    const matched = kocs.filter(k => {
      const profiles = getKocLegalProfiles(k);
      const profileText = profiles
        .map(p => `${p.holderName || ''} ${p.taxCode || ''} ${p.cccd || ''} ${p.bankAccount || ''} ${p.bankName || ''}`)
        .join(' ')
        .toLowerCase();
      const hay = `${k.stageName} ${k.channelId} ${k.realName || ''} ${k.companyName || ''} ${k.cccd || ''} ${k.taxCode || ''} ${k.phone || ''} ${profileText}`.toLowerCase();
      return hay.includes(q);
    });
    if (koc && !matched.some(x => x.id === koc.id)) {
      return [koc, ...matched];
    }
    return matched;
  }, [kocs, kocSearchQuery, koc]);

  const quickPickKocs = useMemo(() => {
    const sourceList = kocSearchQuery.trim() ? filteredKocs : kocs;
    const sorted = [...sourceList].sort((a, b) => {
      const aProfs = getKocLegalProfiles(a).length;
      const bProfs = getKocLegalProfiles(b).length;
      if (bProfs !== aProfs) return bProfs - aProfs;
      return (b.totalPastDeals || 0) - (a.totalPastDeals || 0);
    });
    return sorted.slice(0, 6);
  }, [kocs, filteredKocs, kocSearchQuery]);

  const kocScopedDeals = useMemo(() => {
    if (!koc) return [];
    const cleanHandle = koc.channelId.replace(/^@/, '').toLowerCase();
    return deals.filter(
      d =>
        d.kocId === koc.id ||
        (cleanHandle && (d.kocChannelId || '').replace(/^@/, '').toLowerCase() === cleanHandle),
    );
  }, [deals, koc]);

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
      deal: dealWithActiveProfile || deal,
      totalValue: numericTotal,
      advanceAmount: numericAdvance,
      hasCustomTerms: isKocOwnForm || hasCustomTerms,
      isKolForm: isKocOwnForm || selectedTpl?.scope === 'KOC_CUSTOM',
      availableTemplates: data.templates,
    });
  }, [koc, dealWithActiveProfile, deal, numericTotal, numericAdvance, hasCustomTerms, isKocOwnForm, templateId, data.templates]);

  const hasInheritedMasterContract = Boolean(
    parentId ||
      activeLegalProfile?.frameworkContractCode?.trim() ||
      deal?.masterContractCode?.trim() ||
      values['token:[Ngày HĐNT]']?.trim(),
  );

  const canSubmitForm =
    !busy &&
    Boolean(template) &&
    Boolean(title.trim()) &&
    (isHdnt || Boolean(brand.trim())) &&
    Boolean(partner.trim()) &&
    (!isKocOwnForm || Boolean(customFile)) &&
    (!isSow || hasInheritedMasterContract);

  return (
    <form
      className="space-y-4"
      onSubmit={e => {
        e.preventDefault();
        const baseValues =
          isSow || kind === 'ACCEPTANCE'
            ? { ...values, [SOW_TASKS_META_KEY]: JSON.stringify(draftAddons) }
            : values;
        const nextValues = isKocOwnForm && customContractValue.trim()
          ? { ...baseValues, 'token:[Tổng tiền trước thuế/sau thuế]': customContractValue.trim() }
          : baseValues;
        onSave({
          title: title.trim(),
          brand: brand.trim() || 'UPBASE',
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
          {onBackToBooking && (
            <Button variant="secondary" size="sm" icon={ArrowLeft} onClick={onBackToBooking}>
              Quay về Quản lý Deal &amp; Booking
            </Button>
          )}
          <Button variant="ghost" size="sm" icon={!onBackToBooking ? ArrowLeft : undefined} onClick={onCancel} className={!onBackToBooking ? '-ml-2.5' : ''}>
            Danh sách hợp đồng
          </Button>
          <span className="text-ink-3">/</span>
          <h2 className="text-base font-semibold text-ink truncate">
            {editing
              ? `Sửa ${record!.title} (v${record!.version + 1})`
              : isSow
                ? `Soạn Phụ lục SOW${deal?.dealCode ? ` · ${deal.dealCode}` : ''}`
                : kind === 'ACCEPTANCE'
                  ? `Lập Biên bản nghiệm thu${deal?.dealCode ? ` · ${deal.dealCode}` : ''}`
                  : 'Tạo hợp đồng'}
          </h2>
          {isKocOwnForm ? (
            <span className="rounded-md bg-accent/15 px-2 py-0.5 text-2xs font-medium text-accent">
              {customFile ? `Tệp KOC: ${customFile.filename}` : 'Chưa chọn tệp .docx KOC'}
            </span>
          ) : (
            template && (
              <Status tone={requiredDone === required.length ? 'positive' : 'warning'}>
                Đã điền {requiredDone}/{required.length} mục bắt buộc
              </Status>
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
              Lấy thông tin Link Air &amp; cắt ảnh nghiệm thu{acceptanceScreenshots.length > 0 ? ` (${acceptanceScreenshots.length})` : ''}
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
            {editing
              ? 'Lưu phiên bản mới'
              : isSow
                ? 'Lưu Phụ lục SOW & Chuyển bước ký'
                : 'Lưu nháp'}
          </Button>
        </div>
      </div>

      {/* Thanh lộ trình 3 bước pháp lý chuẩn của Deal */}
      <div className="rounded-xl border border-line bg-surface px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            {
              step: 'HDNT' as const,
              idx: 1,
              label: '1. Hợp đồng nguyên tắc (HĐNT Khung)',
              done: Boolean(parentId || activeLegalProfile?.frameworkContractCode?.trim() || deal?.masterContractCode?.trim()),
            },
            {
              step: 'SOW' as const,
              idx: 2,
              label: '2. Phụ lục SOW (Chốt & Khóa cấu hình Deal)',
              done: deal?.contractAppendixStatus === 'ĐÃ_KÝ',
            },
            {
              step: 'BBNT' as const,
              idx: 3,
              label: '3. Biên bản nghiệm thu (BBNT theo Link Air)',
              done: false,
            },
          ].map((item, i) => {
            const activeStage = docStage === 'HD' ? 'HDNT' : docStage;
            const isActive = activeStage === item.step;
            const markState = isActive ? 'active' : item.done ? 'done' : 'idle';
            return (
              <React.Fragment key={item.step}>
                {i > 0 && <span className="text-ink-3 text-xs">→</span>}
                <button
                  type="button"
                  disabled={editing}
                  onClick={() => !editing && chooseDocStage(item.step)}
                  className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs transition-colors ${
                    isActive
                      ? 'border-accent bg-accent-soft/30 text-ink font-semibold'
                      : 'border-transparent hover:bg-sunken text-ink-2'
                  }`}
                >
                  <StepMark done={markState !== 'idle'} label={item.idx} />
                  <span>{item.label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
        {isSow && (
          <Status tone="info">
            Sau khi ký hoàn tất Phụ lục SOW, cấu hình Deal sẽ được khóa tự động
          </Status>
        )}
      </div>

      {ocrNotice && (
        <div role="status" className="rounded-xl bg-positive-soft border border-line px-4 py-2 text-xs text-positive font-medium flex items-center justify-between gap-2">
          <span>{ocrNotice}</span>
          <button type="button" onClick={() => setOcrNotice('')} className="text-ink-3 hover:text-ink">Đóng</button>
        </div>
      )}

      {quickFwNotice && (
        <div role="status" className="rounded-xl bg-positive-soft border border-positive/30 px-4 py-2 text-xs text-positive font-medium flex items-center justify-between gap-2">
          <span>{quickFwNotice}</span>
          <button type="button" onClick={() => setQuickFwNotice('')} className="text-ink-3 hover:text-ink">Đóng</button>
        </div>
      )}

      {duplicateRecord && (
        <div className="rounded-xl border border-warning/40 bg-warning-soft px-3.5 py-2.5 text-xs text-ink flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-warning-strong shrink-0" />
            <span><span className="text-warning-strong font-semibold">Trùng số hợp đồng:</span> Đã tồn tại hồ sơ {docDateVal}/{kocIdVal} (&ldquo;{duplicateRecord.title}&rdquo;).</span>
          </div>
          <Button size="sm" variant="secondary" onClick={resolveDuplicateNumber}>
            Thêm hậu tố (-{deal?.dealCode || '02'})
          </Button>
        </div>
      )}

      {loadError && <p role="alert" className="text-xs text-critical">{loadError}</p>}

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

          <Panel
            title={
              !isContextPickerExpanded && (koc || deal)
                ? 'Chủ thể KOC, Pháp nhân & Deal gắn kết'
                : 'Thông tin chung'
            }
            actions={
              !isContextPickerExpanded && (koc || deal) ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button size="sm" variant="secondary" icon={RefreshCw} onClick={refreshSystemPrefill}>
                    Đồng bộ lại từ Deal
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setIsContextPickerExpanded(true)}
                  >
                    Đổi KOC / Pháp nhân / Deal
                  </Button>
                </div>
              ) : isContextPickerExpanded && (koc || deal) ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsContextPickerExpanded(false)}
                >
                  Thu gọn khung chọn KOC &amp; Deal
                </Button>
              ) : undefined
            }
          >
            <div className="space-y-4">
              {!isContextPickerExpanded && (koc || deal) ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-line bg-sunken/40 p-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-2xs text-ink-3 block">Chủ thể KOC (Bên B)</span>
                      <Person
                        name={koc?.stageName || deal?.kocStageName || partner || 'KOC'}
                        sub={koc?.channelId || deal?.kocChannelId || undefined}
                        size={24}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-2xs text-ink-3 block">Pháp nhân ký kết</span>
                      {activeLegalProfile ? (
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Status
                              tone={
                                activeLegalProfile.legalType === 'COMPANY'
                                  ? 'info'
                                  : activeLegalProfile.legalType === 'HOUSEHOLD'
                                    ? 'warning'
                                    : 'positive'
                              }
                            >
                              {LEGAL_TYPE_LABEL[activeLegalProfile.legalType]}
                            </Status>
                            <span className="font-semibold text-ink truncate">
                              {activeLegalProfile.holderName}
                            </span>
                          </div>
                          <span className="text-2xs text-ink-2 font-code block truncate">
                            {activeLegalProfile.taxCode
                              ? `MST: ${activeLegalProfile.taxCode}`
                              : activeLegalProfile.cccd
                                ? `CCCD: ${activeLegalProfile.cccd}`
                                : activeLegalProfile.taxAccountType}
                          </span>
                        </div>
                      ) : (
                        <span className="font-semibold text-ink block">{partner || 'Cá nhân'}</span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <span className="text-2xs text-ink-3 block">Deal / Booking gắn kết</span>
                      {deal ? (
                        <div className="space-y-0.5">
                          <span className="font-code font-semibold text-ink block">
                            {deal.dealCode} · {brand || deal.brandName}
                          </span>
                          <span className="text-2xs text-ink-2 font-code block">
                            Hạn mức Net: {formatNumber(deal.totalValue || 0)}đ
                          </span>
                        </div>
                      ) : (
                        <span className="text-ink-2 block">Hồ sơ độc lập · {brand || 'UPBASE'}</span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <span className="text-2xs text-ink-3 block">HĐNT gốc &amp; Biểu mẫu</span>
                      <span className="font-code font-semibold text-accent block truncate">
                        {parentRecord?.title ||
                          activeLegalProfile?.frameworkContractCode ||
                          deal?.masterContractCode ||
                          templateId}
                      </span>
                      <span className="text-2xs text-ink-2 block truncate">
                        {template?.name || templateId}
                      </span>
                    </div>
                  </div>

                  {koc && kocLegalProfiles.length > 1 && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs">
                      <span className="text-ink-2 font-medium">
                        {koc.stageName} có {kocLegalProfiles.length} pháp nhân — đổi nhanh pháp nhân ký Phụ lục:
                      </span>
                      <div className="w-full sm:w-auto sm:min-w-[280px]">
                        <Select
                          value={activeLegalProfile?.id || selectedLegalProfileId}
                          onChange={e => chooseLegalProfile(e.target.value)}
                        >
                          {kocLegalProfiles.map(prof => (
                            <option key={prof.id} value={prof.id}>
                              [{prof.profileCode || 'HSPL'} · {LEGAL_TYPE_LABEL[prof.legalType]}] {prof.holderName}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                  )}

                  {isSow && !parentId && !(activeLegalProfile?.frameworkContractCode?.trim() || deal?.masterContractCode?.trim()) && koc && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-accent/30 bg-accent-soft/20 px-3 py-2 text-2xs">
                      <div className="flex items-center gap-1.5 text-ink">
                        <ShieldCheck className="w-3.5 h-3.5 text-accent shrink-0" />
                        <span>
                          KOC chưa có bản ghi Hợp đồng nguyên tắc (HĐNT). Bấm nút bên phải để khởi tạo nhanh HĐNT gốc và gắn vào Phụ lục SOW.
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={creatingQuickFramework}
                        onClick={() => void handleQuickCreateFrameworkForSow()}
                      >
                        {creatingQuickFramework
                          ? 'Đang tạo HĐNT gốc...'
                          : 'Khởi tạo nhanh HĐNT gốc & Gắn vào SOW'}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <>
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
                    <Field label="Giai đoạn hồ sơ (3 bước chuẩn)" className="md:col-span-2">
                      <div>
                        {editing ? (
                          <span className="text-sm font-medium text-ink">
                            {docStage === 'BBNT'
                              ? '3. Biên bản nghiệm thu (Theo Job)'
                              : docStage === 'SOW'
                                ? '2. Phụ lục SOW (Theo Job)'
                                : '1. Hợp đồng nguyên tắc (Theo KOC)'}
                          </span>
                        ) : (
                          <Segmented
                            items={[
                              { key: 'HDNT', label: '1. HĐNT Khung (Theo KOC)' },
                              { key: 'SOW', label: '2. Phụ lục SOW (Theo Job)' },
                              { key: 'BBNT', label: '3. Nghiệm thu BBNT (Theo Job)' },
                            ]}
                            value={docStage === 'HD' ? 'HDNT' : docStage}
                            onChange={v => chooseDocStage(v as ContractDocStage)}
                          />
                        )}
                      </div>
                    </Field>
                    {/* Khối trung tâm: Xuất phát từ KOC -> Chọn Hồ sơ pháp lý (1 KOC - N Pháp nhân) -> Tự động điền hợp đồng */}
                    <div className="md:col-span-2 rounded-xl border border-accent/30 bg-accent-soft/15 p-3.5 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink">
                            <UserCheck className="w-4 h-4 text-accent" />
                            Chọn KOC &amp; Hồ sơ pháp lý để tự động điền thông tin (1 KOC – N Hồ sơ pháp lý)
                          </span>
                          {koc && (
                            <Status tone="positive">
                              Đã chọn: {koc.stageName} ({kocLegalProfiles.length} hồ sơ pháp lý)
                            </Status>
                          )}
                        </div>
                        {koc && (
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={RefreshCw}
                            onClick={refreshSystemPrefill}
                          >
                            Điền lại thông tin từ KOC
                          </Button>
                        )}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <Field label="1. Chọn KOC / Nhà sáng tạo từ danh bạ" htmlFor="ct-koc">
                          <div className="space-y-1.5">
                            {!(editing && !!record?.kocId) && (
                              <div className="relative">
                                <Search className="w-3.5 h-3.5 text-ink-3 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <Input
                                  value={kocSearchQuery}
                                  onChange={e => setKocSearchQuery(e.target.value)}
                                  placeholder="Tìm nhanh theo tên KOC, @channelId, tên thật/công ty, CCCD, MST, SĐT..."
                                  className="pl-8 text-xs"
                                />
                              </div>
                            )}
                            <Select
                              id="ct-koc"
                              value={koc?.id || selectedKocId}
                              onChange={e => chooseKocDirectly(e.target.value)}
                              disabled={editing && !!record?.kocId}
                            >
                              <option value="">
                                Chọn KOC để tự động điền thông tin ({filteredKocs.length} KOC)...
                              </option>
                              {filteredKocs.slice(0, 300).map(k => {
                                const profCount = getKocLegalProfiles(k).length;
                                return (
                                  <option key={k.id} value={k.id}>
                                    {k.stageName} ({k.channelId}) · {k.realName || k.companyName || 'Chưa rõ tên thật'}
                                    {profCount > 0 ? ` · [${profCount} hồ sơ pháp lý]` : ''}
                                  </option>
                                );
                              })}
                            </Select>
                          </div>
                        </Field>

                        <Field label="2. Gắn Booking / Job (Nếu ký Phụ lục SOW hoặc BBNT)" htmlFor="ct-deal">
                          <div className="space-y-1.5">
                            {koc && kocScopedDeals.length > 0 && !(editing && !!record?.dealId) && (
                              <div className="text-2xs text-ink-2 flex items-center justify-between">
                                <span>
                                  KOC <span className="font-semibold text-ink">{koc.stageName}</span> có{' '}
                                  <span className="font-semibold text-ink">{kocScopedDeals.length}</span> Booking/Job trong hệ thống
                                </span>
                                {dealId && (
                                  <button
                                    type="button"
                                    onClick={() => setDealId('')}
                                    className="text-accent hover:underline font-medium"
                                  >
                                    Bỏ gắn Job (Ký HĐNT độc lập)
                                  </button>
                                )}
                              </div>
                            )}
                            <Select id="ct-deal" value={dealId} onChange={e => chooseDeal(e.target.value)} disabled={editing && !!record?.dealId}>
                              <option value="">{docStage === 'HDNT' ? 'Không gắn booking (Ký HĐNT khung cho KOC)' : 'Chọn booking / Job...'}</option>
                              {koc && kocScopedDeals.length > 0 ? (
                                <>
                                  <optgroup label={`Booking / Job của ${koc.stageName} (${kocScopedDeals.length})`}>
                                    {kocScopedDeals.map(d => (
                                      <option key={d.id} value={d.id}>
                                        {d.dealCode} · {d.kocStageName} · {d.brandName} ({formatNumber(d.totalValue || 0)}đ)
                                      </option>
                                    ))}
                                  </optgroup>
                                  <optgroup label="Các Booking / Job khác">
                                    {dealOptions
                                      .filter(d => !kocScopedDeals.some(kd => kd.id === d.id))
                                      .map(d => (
                                        <option key={d.id} value={d.id}>
                                          {d.dealCode} · {d.kocStageName} · {d.brandName}
                                        </option>
                                      ))}
                                  </optgroup>
                                </>
                              ) : (
                                dealOptions.map(d => (
                                  <option key={d.id} value={d.id}>
                                    {d.dealCode} · {d.kocStageName} · {d.brandName}
                                  </option>
                                ))
                              )}
                            </Select>
                          </div>
                        </Field>
                      </div>

                      {/* Gợi ý chọn nhanh KOC khi chưa chọn hoặc đang gõ tìm kiếm */}
                      {!(editing && !!record?.kocId) && (!koc || kocSearchQuery.trim()) && quickPickKocs.length > 0 && (
                        <div className="pt-1 space-y-1.5">
                          <span className="text-2xs font-medium text-ink-3 block">
                            {kocSearchQuery.trim()
                              ? `Kết quả khớp "${kocSearchQuery}" — bấm để chọn & tự điền:`
                              : 'Chọn nhanh KOC tiêu biểu (ưu tiên KOC có nhiều hồ sơ pháp lý):'}
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {quickPickKocs.map(item => {
                              const itemProfs = getKocLegalProfiles(item);
                              const isCurrent = koc?.id === item.id;
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => {
                                    chooseKocDirectly(item.id);
                                    setKocSearchQuery('');
                                  }}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-2xs transition-colors ${
                                    isCurrent
                                      ? 'border-accent bg-accent text-white font-semibold'
                                      : 'border-line bg-surface hover:border-accent/50 text-ink'
                                  }`}
                                >
                                  <span className="font-semibold">{item.stageName}</span>
                                  <span className={isCurrent ? 'text-white/80 font-code' : 'text-ink-3 font-code'}>
                                    {item.channelId}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-2xs font-semibold ${
                                      isCurrent
                                        ? 'bg-white/20 text-white'
                                        : itemProfs.length > 1
                                          ? 'bg-accent/15 text-accent'
                                          : 'bg-sunken text-ink-2'
                                    }`}
                                  >
                                    {itemProfs.length} pháp nhân
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Danh sách 1..N Hồ sơ pháp lý của KOC đang chọn */}
                      {koc && kocLegalProfiles.length > 0 && (
                        <div className="pt-2 border-t border-line space-y-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <label htmlFor="ct-legal-profile" className="text-xs font-semibold text-ink flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-accent" />
                              <span>
                                Pháp nhân ký kết của KOC (Bên B) — {koc.stageName} có {kocLegalProfiles.length} hồ sơ pháp lý:
                              </span>
                            </label>
                            {kocLegalProfiles.length > 1 && (
                              <span className="text-2xs text-accent font-medium">
                                Bấm vào thẻ pháp nhân bên dưới để chuyển đổi mẫu (IND / HKD / COM) &amp; tự điền
                              </span>
                            )}
                          </div>

                          <Select
                            id="ct-legal-profile"
                            value={activeLegalProfile?.id || selectedLegalProfileId}
                            onChange={e => chooseLegalProfile(e.target.value)}
                          >
                            {kocLegalProfiles.map(prof => {
                              const bankAcc = prof.bankAccount || prof.bankAccountNumber;
                              return (
                                <option key={prof.id} value={prof.id}>
                                  [{prof.profileCode || 'HSPL'} · {LEGAL_TYPE_LABEL[prof.legalType]}] {prof.holderName}
                                  {prof.taxCode ? ` · MST: ${prof.taxCode}` : ''}
                                  {prof.cccd ? ` · CCCD: ${prof.cccd}` : ''}
                                  {bankAcc ? ` · STK: ${bankAcc} (${prof.bankName || ''})` : ''}
                                </option>
                              );
                            })}
                          </Select>

                          <div className={`grid gap-2.5 ${kocLegalProfiles.length > 1 ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
                            {kocLegalProfiles.map((prof, idx) => {
                              const isSelected = (activeLegalProfile?.id || selectedLegalProfileId) === prof.id;
                              const bankAcc = prof.bankAccount || prof.bankAccountNumber;
                              const readiness = evaluateLegalProfileContractReadiness(prof, koc);
                              return (
                                <div
                                  key={prof.id || idx}
                                  onClick={() => chooseLegalProfile(prof.id)}
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      chooseLegalProfile(prof.id);
                                    }
                                  }}
                                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer space-y-1.5 ${
                                    isSelected
                                      ? 'border-accent bg-surface shadow-xs ring-1 ring-accent/30'
                                      : 'border-line bg-surface/70 hover:border-accent/40 hover:bg-surface'
                                  }`}
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="font-code text-2xs font-semibold px-1.5 py-0.5 rounded bg-sunken border border-line text-ink">
                                        {prof.profileCode || `HSPL-0${idx + 1}`}
                                      </span>
                                      <Status
                                        tone={
                                          prof.legalType === 'COMPANY'
                                            ? 'info'
                                            : prof.legalType === 'HOUSEHOLD'
                                              ? 'warning'
                                              : 'positive'
                                        }
                                      >
                                        {LEGAL_TYPE_LABEL[prof.legalType]}
                                      </Status>
                                      {prof.isDefault && (
                                        <span className="px-1.5 py-0.5 rounded bg-sunken text-ink-2 text-2xs font-medium">
                                          Mặc định
                                        </span>
                                      )}
                                      {readiness.ready ? (
                                        <span className="px-1.5 py-0.5 rounded bg-positive-soft text-positive text-2xs font-semibold border border-positive/25">
                                          Đủ {readiness.filledCount}/{readiness.totalRequired} trường HĐ
                                        </span>
                                      ) : (
                                        <span
                                          className="px-1.5 py-0.5 rounded bg-warning-soft text-warning text-2xs font-semibold border border-warning/30"
                                          title={`Thiếu trong Danh bạ KOC: ${readiness.missingFields.join(', ')}`}
                                        >
                                          Thiếu: {readiness.missingFields.slice(0, 2).join(', ')}
                                          {readiness.missingFields.length > 2 ? '…' : ''}
                                        </span>
                                      )}
                                    </div>
                                    {isSelected ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-white text-2xs font-semibold">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Đang điền vào HĐ
                                      </span>
                                    ) : (
                                      <span className="text-2xs text-accent font-medium">Chọn pháp nhân này</span>
                                    )}
                                  </div>

                                  <div className="font-semibold text-xs text-ink truncate" title={prof.holderName}>
                                    {prof.holderName}
                                  </div>

                                  <div className="grid gap-1 text-2xs text-ink-2 pt-0.5">
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                      {prof.cccd && (
                                        <span>
                                          CCCD: <span className="font-code font-semibold text-ink">{prof.cccd}</span>
                                        </span>
                                      )}
                                      {prof.taxCode && (
                                        <span>
                                          MST: <span className="font-code font-semibold text-ink">{prof.taxCode}</span>
                                        </span>
                                      )}
                                      {prof.representativeName && (
                                        <span>
                                          Đại diện: <span className="font-semibold text-ink">{prof.representativeName}</span>
                                          {prof.representativeTitle ? ` (${prof.representativeTitle})` : ''}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                      <span className="inline-flex items-center gap-1">
                                        <CreditCard className="w-3 h-3 text-positive shrink-0" />
                                        {bankAcc ? (
                                          <span>
                                            STK: <span className="font-code font-semibold text-ink">{bankAcc}</span> ({prof.bankName || 'NH'}) ·{' '}
                                            {prof.bankHolderName || prof.holderName}
                                          </span>
                                        ) : (
                                          <span className="text-warning">Chưa có STK ngân hàng</span>
                                        )}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 border-t border-line/60">
                                      <span className="text-ink-3">{prof.taxAccountType}</span>
                                      <span className="inline-flex items-center gap-1 font-medium text-ink-2">
                                        <ShieldCheck className="w-3 h-3 text-accent" />
                                        {prof.frameworkContractStatus === 'ĐÃ_KÝ'
                                          ? `Đã ký HĐNT (${prof.frameworkContractCode || 'HĐNT'})`
                                          : 'Chưa ký HĐNT'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    <Field label={isKocOwnForm ? 'Phân loại pháp nhân / Mẫu đối chiếu' : 'Mẫu pháp chế (Bộ 11 mẫu chuẩn)'} htmlFor="ct-template">
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
                          if (nextTpl.endsWith('-SOW')) {
                            setDocStage('SOW');
                            if (!parentId) {
                              const matchingHdnt = findFrameworkForKoc(koc, deal);
                              if (matchingHdnt) setParentId(matchingHdnt.id);
                            }
                          } else if (nextTpl.endsWith('-HDNT')) {
                            setDocStage('HDNT');
                          } else if (isAcceptance(nextTpl)) {
                            setDocStage('BBNT');
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
                        <optgroup label="Bộ 11 mẫu chuẩn Upbase (Ver072026)">
                          {(editing ? data.templates : templates)
                            .filter(t => !kocTemplates.some(kt => kt.id === t.id))
                            .map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </optgroup>
                      </Select>
                    </Field>
                    <Field label="Tên hồ sơ" htmlFor="ct-title">
                      <Input id="ct-title" required maxLength={180} value={title} onChange={e => setTitle(e.target.value)} placeholder="Hợp đồng nguyên tắc / Phụ lục SOW · Tên KOC" />
                    </Field>
                    <Field label={isHdnt ? 'Phạm vi / Nhãn hàng (HĐNT dùng chung)' : 'Nhãn hàng'} htmlFor="ct-brand">
                      <Input
                        id="ct-brand"
                        required={!isHdnt}
                        maxLength={120}
                        list="ct-brands"
                        value={brand}
                        onChange={e => setBrand(e.target.value)}
                        placeholder={isHdnt ? 'UPBASE (Áp dụng cho mọi nhãn hàng)' : 'Chọn hoặc nhập tên nhãn hàng'}
                      />
                      <datalist id="ct-brands">{data.actor.brands.map(b => <option key={b} value={b} />)}</datalist>
                    </Field>
                    <Field label="Đối tác (Bên B)" htmlFor="ct-partner">
                      <Input id="ct-partner" required maxLength={180} value={partner} onChange={e => setPartner(e.target.value)} />
                    </Field>
                    {template && (() => {
                      const enrichedTpl = enrichTemplateWithSignFlow(template);
                      const previewCode = buildStableContractCode({
                        id: record?.id || 'DRAFT',
                        templateId: template.id,
                        brand: brand || 'UPBASE',
                        dealCode: deal?.dealCode || record?.dealCode,
                        kocId: koc?.id || record?.kocId,
                        values,
                      });
                      return (
                        <div className="md:col-span-2 rounded-lg border border-line bg-sunken/70 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-2xs">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-2">
                            <span>
                              Mã chống trùng (<span className="font-code font-semibold text-ink">contractCode</span>):{' '}
                              <span className="font-code font-semibold text-accent">{previewCode}</span>
                            </span>
                            <span>·</span>
                            <span>
                              Khóa phiên bản mẫu:{' '}
                              <span className="font-code font-semibold text-ink">{template.version}</span>
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-ink-3">
                              {enrichedTpl.signingFlowConfig?.mode === 'PARALLEL' ? 'Ký song song' : 'Ký tuần tự'} ({enrichedTpl.signingFlowConfig?.deadlineDays || 7} ngày)
                            </span>
                            {(enrichedTpl.signTags || []).map(tag => (
                              <span key={tag} className="font-code px-1.5 py-0.5 rounded bg-surface border border-line text-accent">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
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
                      <Field label={isSow ? 'Hợp đồng nguyên tắc gốc của KOC' : 'Phụ lục SOW / Hợp đồng gốc của Job'} htmlFor="ct-parent" className="md:col-span-2">
                        <div className="space-y-2">
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
                                if (!title.trim()) setTitle(formatStageTitle(docStage, koc, deal, pRec.partner, pRec.brand));
                                const freshJobs = buildDealSowJobTables(
                                  dealWithActiveProfile || deal,
                                  koc,
                                  pRec,
                                );
                                setDraftJobTables(freshJobs);
                                setActiveJobTableIdx(0);
                                if (freshJobs[0]) {
                                  setDraftVideoFee(freshJobs[0].videoFeeNetVnd);
                                  setDraftAddons(freshJobs[0].addonItems);
                                  setDraftProductName(freshJobs[0].productName);
                                  setDraftAirDate(freshJobs[0].airDate);
                                }
                                const inferredTpl = isSow ? '' : inferAcceptanceTemplate(pRec.templateId);
                                if (inferredTpl && inferredTpl !== templateId) {
                                  setTemplate(null);
                                  setValues({});
                                  setTemplateId(inferredTpl);
                                } else if (template) {
                                  const pTpl = data.templates.find(t => t.id === pRec.templateId);
                                  const result = prefill(fields, {}, {
                                    koc,
                                    deal: dealWithActiveProfile || deal,
                                    brand: brand || pRec.brand,
                                    existingRecords: data.records,
                                    parentRecord: pRec,
                                    parentFields: pTpl ? uniqueFields(pTpl) : [],
                                    legalProfileId: selectedLegalProfileId || deal?.legalProfileId,
                                    ctvAcceptedDeals,
                                  });
                                  setValues(result.values);
                                  setPrefilled(new Set(result.filled));
                                }
                              }
                            }}
                          >
                            <option value="">
                              {isSow
                                ? activeLegalProfile?.frameworkContractCode?.trim() || deal?.masterContractCode?.trim()
                                  ? `Kế thừa HĐNT từ hồ sơ pháp lý (${activeLegalProfile?.frameworkContractCode || deal?.masterContractCode})`
                                  : 'Chọn hợp đồng nguyên tắc của KOC...'
                                : 'Chọn Phụ lục SOW / Hợp đồng của Job'}
                            </option>
                            {parents.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                          </Select>

                          {isSow && !parentId && (
                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-accent/30 bg-accent-soft/20 px-3 py-2 text-2xs">
                              <div className="flex items-center gap-1.5 text-ink">
                                <ShieldCheck className="w-3.5 h-3.5 text-accent shrink-0" />
                                {activeLegalProfile?.frameworkContractCode?.trim() || deal?.masterContractCode?.trim() ? (
                                  <span>
                                    Phụ lục SOW đang kế thừa số HĐNT{' '}
                                    <span className="font-code font-semibold text-accent">
                                      {activeLegalProfile?.frameworkContractCode || deal?.masterContractCode}
                                    </span>{' '}
                                    từ Hồ sơ pháp lý KOC (có thể lưu và trình ký ngay).
                                  </span>
                                ) : (
                                  <span>
                                    KOC chưa có bản ghi Hợp đồng nguyên tắc (HĐNT) trong danh sách hợp đồng. Bạn có thể khởi tạo nhanh HĐNT gốc ngay tại đây để gắn vào Phụ lục SOW.
                                  </span>
                                )}
                              </div>
                              {koc && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  disabled={creatingQuickFramework}
                                  onClick={() => void handleQuickCreateFrameworkForSow()}
                                >
                                  {creatingQuickFramework
                                    ? 'Đang tạo HĐNT gốc...'
                                    : 'Khởi tạo nhanh HĐNT gốc & Gắn vào Phụ lục SOW'}
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </Field>
                    )}
                  </div>
                </>
              )}

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
                      Luồng duyệt: <span className="text-accent font-semibold">{ruleEval.reviewStream.streamName}</span>
                    </span>
                    <span>·</span>
                    <span>
                      SLA: <span className="text-ink font-semibold">TCKT {ruleEval.reviewStream.slaHoursTckt}h · Pháp chế {ruleEval.reviewStream.slaHoursLegal}h</span>
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

          {(kind === 'ACCEPTANCE' || isSow) && (
            <Panel
              title={
                isSow
                  ? `Tổ chức Bảng công việc theo từng Job trong Phụ lục SOW (${draftJobTables.length} Job · ${draftJobTables.length} Bảng công việc)`
                  : `Nghiệm thu theo từng Bảng công việc (Job) của Phụ lục SOW (${draftJobTables.length} Job)`
              }
              actions={
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const nextIdx = draftJobTables.length;
                      const baseDealCode = deal?.dealCode || jobAcceptanceBreakdown.jobCode || 'DEAL';
                      const nextJobCode = `${baseDealCode}-J0${nextIdx + 1}`;
                      const templateJob = draftJobTables[activeJobTableIdx] || draftJobTables[0];
                      const defaultAddons: JobAcceptanceAddonRow[] = (templateJob?.addonItems || draftAddons).map((a, i) => ({
                        ...a,
                        id: `${nextJobCode}-addon-${Date.now()}-${i}`,
                        taskCode: `${nextJobCode}-T0${i + 2}`,
                      }));
                      const newJob: SowJobTableDraft = {
                        id: `sow-job-${Date.now()}`,
                        jobCode: nextJobCode,
                        jobTitle: `Bảng công việc #${nextIdx + 1} (${nextJobCode})`,
                        productName: brand ? `Sản phẩm ${brand} (Job #${nextIdx + 1})` : `Sản phẩm Job #${nextIdx + 1}`,
                        mediaChannel: templateJob?.mediaChannel || 'TikTok',
                        airDate: templateJob?.airDate || draftAirDate || '',
                        videoUrl: '',
                        videoFeeNetVnd: templateJob?.videoFeeNetVnd || draftVideoFee || 2000000,
                        quantity: 1,
                        addonItems: defaultAddons,
                      };
                      const nextJobs = [...draftJobTables, newJob];
                      applyMultiJobTablesToDraftValues(nextJobs, nextIdx);
                    }}
                  >
                    + Thêm Job (Bảng công việc mới)
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const nextList = draftAddons.map(a => ({ ...a, includedInSow: false }));
                      applyJobBreakdownToDraftValues(draftVideoFee, nextList);
                    }}
                  >
                    Chỉ 1 Task (Chỉ Video)
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const nextList = draftAddons.map(a => ({
                        ...a,
                        includedInSow: a.termType === 'ADS_CODE',
                      }));
                      applyJobBreakdownToDraftValues(draftVideoFee, nextList);
                    }}
                  >
                    2 Task (Video + Mã Ads)
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const nextList = draftAddons.map(a => ({
                        ...a,
                        includedInSow: a.termType === 'ADS_CODE' || a.termType === 'IMAGE_USAGE' || Boolean(a.includedInSow),
                      }));
                      applyJobBreakdownToDraftValues(draftVideoFee, nextList);
                    }}
                  >
                    Đủ 3 Task SOW
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const activeJob = draftJobTables[activeJobTableIdx];
                      const activeJobCode = activeJob?.jobCode || jobAcceptanceBreakdown.jobCode;
                      const info = SOW_TASK_DELIVERABLE_INFO.CROSS_POST_REUP;
                      const nextList: JobAcceptanceAddonRow[] = [
                        ...draftAddons,
                        {
                          id: `addon-${Date.now()}`,
                          taskCode: `${activeJobCode}-T0${draftAddons.length + 2}`,
                          termType: 'CROSS_POST_REUP',
                          termLabel: info.taskTitle,
                          includedInSow: true,
                          deliverableLabel: info.deliverableLabel,
                          durationDays: info.defaultDays,
                          evidenceCodeOrUrl: '',
                          allocatedCostVnd: 0,
                          acceptanceStatus: 'VERIFIED',
                        },
                      ];
                      applyJobBreakdownToDraftValues(draftVideoFee, nextList);
                    }}
                  >
                    + Thêm Task vào Job này
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
                {/* Thanh chuyển đổi giữa N Bảng công việc (N Job trong Deal) */}
                <div className="p-2.5 rounded-lg border border-line bg-sunken/60 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink">
                        Danh sách Job trong Deal ({draftJobTables.length} Job = {draftJobTables.length} Bảng công việc trong Phụ lục SOW):
                      </span>
                      <span className="px-2 py-0.5 rounded bg-surface border border-line font-code text-ink-2">
                        Phụ lục SOW: {jobAcceptanceBreakdown.appendixCode}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-surface border border-line font-code text-ink-2">
                        HĐNT: {jobAcceptanceBreakdown.masterContractCode}
                      </span>
                    </div>
                    <Status tone="positive">
                      Tổng Phụ lục ({draftJobTables.length} Job): {formatNumber(jobAcceptanceBreakdown.financials.plannedTotalNet)}đ
                    </Status>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {draftJobTables.map((jTab, jIdx) => {
                      const isSelectedJob = jIdx === activeJobTableIdx;
                      const jVideoNet = Math.max(0, Number(jTab.videoFeeNetVnd) || 0) * Math.max(1, Number(jTab.quantity) || 1);
                      const jAddonsNet = (jTab.addonItems || [])
                        .filter(a => a.includedInSow !== false && a.acceptanceStatus !== 'DROPPED')
                        .reduce((s, a) => s + (Number(a.allocatedCostVnd) || 0), 0);
                      const jSubtotal = jVideoNet + jAddonsNet;
                      return (
                        <div
                          key={jTab.id || jIdx}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                            isSelectedJob
                              ? 'border-accent bg-accent-soft/40 text-ink font-semibold'
                              : 'border-line bg-surface text-ink-2 hover:bg-sunken'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setActiveJobTableIdx(jIdx);
                              setDraftVideoFee(jTab.videoFeeNetVnd);
                              setDraftAddons(jTab.addonItems);
                              setDraftProductName(jTab.productName);
                              setDraftAirDate(jTab.airDate);
                            }}
                            className="text-left flex items-center gap-2"
                          >
                            <span className="px-1.5 py-0.5 rounded bg-accent/15 text-accent font-code text-2xs font-semibold">
                              Bảng CV #{jIdx + 1} · {jTab.jobCode}
                            </span>
                            <span className="truncate max-w-[180px]">{jTab.productName || 'Sản phẩm'}</span>
                            <span className="font-code text-accent">{formatNumber(jSubtotal)}đ</span>
                          </button>
                          {draftJobTables.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const remaining = draftJobTables.filter((_, idx) => idx !== jIdx);
                                const nextActive = Math.max(0, Math.min(activeJobTableIdx, remaining.length - 1));
                                applyMultiJobTablesToDraftValues(remaining, nextActive);
                              }}
                              className="text-ink-3 hover:text-critical p-0.5"
                              title="Xóa Bảng công việc (Job) này khỏi Phụ lục"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Task #1 của Bảng công việc đang chọn: Sản xuất & đăng tải Video chính */}
                <div className="p-3 rounded-lg border border-line bg-surface space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-accent/15 text-accent font-code text-2xs font-semibold">
                        Bảng công việc #{activeJobTableIdx + 1} ({draftJobTables[activeJobTableIdx]?.jobCode || jobAcceptanceBreakdown.jobCode}) · Hạng mục #1
                      </span>
                      <span className="font-semibold text-ink">
                        Sản xuất và đăng tải Video review ({draftProductName || brand || 'Sản phẩm chiến dịch'})
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-sunken border border-line text-2xs text-ink-2">
                        {jobAcceptanceBreakdown.videoItem.deliverableLabel}
                      </span>
                      <Status tone={jobAcceptanceBreakdown.videoItem.videoUrl ? 'positive' : 'warning'}>
                        {jobAcceptanceBreakdown.videoItem.videoUrl
                          ? 'Đã gắn Link Air'
                          : isSow
                            ? 'Bắt đầu Deal (Chưa Air)'
                            : 'Chờ Link Air'}
                      </Status>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 items-end">
                    <Field label={isSow ? 'Tên sản phẩm / Dịch vụ trong Phụ lục SOW' : 'Đầu việc nghiệm thu: Link bài đăng (Link Air)'}>
                      {isSow ? (
                        <Input
                          value={draftProductName}
                          onChange={e => {
                            const nextProd = e.target.value;
                            applyJobBreakdownToDraftValues(
                              draftVideoFee,
                              draftAddons,
                              undefined,
                              undefined,
                              undefined,
                              draftAdvanceAmount,
                              nextProd,
                              draftAirDate,
                            );
                          }}
                          placeholder={brand || 'Nhập tên sản phẩm / chiến dịch'}
                        />
                      ) : (
                        <Input
                          value={jobAcceptanceBreakdown.videoItem.videoUrl || 'Chưa có link video trên Job'}
                          readOnly
                          className="font-code bg-sunken/40"
                        />
                      )}
                    </Field>
                    <Field label={isSow ? 'Ngày dự kiến đăng tải (Air Date)' : 'Ngày đăng tải (Tự lấy từ Job)'}>
                      {isSow ? (
                        <Input
                          value={draftAirDate}
                          onChange={e => {
                            const nextDate = e.target.value;
                            applyJobBreakdownToDraftValues(
                              draftVideoFee,
                              draftAddons,
                              undefined,
                              undefined,
                              undefined,
                              draftAdvanceAmount,
                              draftProductName,
                              nextDate,
                            );
                          }}
                          placeholder="DD/MM/YYYY"
                          className="font-code"
                        />
                      ) : (
                        <Input
                          value={jobAcceptanceBreakdown.videoItem.airDate || '—'}
                          readOnly
                          className="font-code bg-sunken/40"
                        />
                      )}
                    </Field>
                    <Field label="Thành tiền Task #1 (VNĐ - Net)">
                      <Input
                        inputMode="numeric"
                        className="font-code tabular-nums font-semibold"
                        value={formatMoneyInput(String(draftVideoFee || 0))}
                        onChange={e => {
                          const nextFee = Number(e.target.value.replace(/\D/g, '')) || 0;
                          applyJobBreakdownToDraftValues(
                            nextFee,
                            draftAddons,
                            undefined,
                            undefined,
                            undefined,
                            draftAdvanceAmount,
                            draftProductName,
                            draftAirDate,
                          );
                        }}
                      />
                    </Field>
                  </div>

                  {isSow && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end pt-2 border-t border-line/70">
                      <div className="md:col-span-5">
                        <Field label="Số tiền tạm ứng đợt 1 khi bắt đầu Deal (VNĐ)">
                          <Input
                            inputMode="numeric"
                            className="font-code tabular-nums font-semibold"
                            value={formatMoneyInput(String(draftAdvanceAmount || 0))}
                            onChange={e => {
                              const nextAdv = Number(e.target.value.replace(/\D/g, '')) || 0;
                              applyJobBreakdownToDraftValues(
                                draftVideoFee,
                                draftAddons,
                                undefined,
                                undefined,
                                undefined,
                                nextAdv,
                                draftProductName,
                                draftAirDate,
                              );
                            }}
                          />
                        </Field>
                      </div>
                      <div className="md:col-span-7 flex flex-wrap items-center gap-1.5">
                        <span className="text-2xs text-ink-3 mr-1">Chọn mức tạm ứng:</span>
                        {[
                          { label: '0đ (Trả sau 100%)', calc: () => 0 },
                          {
                            label: 'Tạm ứng 30%',
                            calc: () => Math.round((jobAcceptanceBreakdown.financials.plannedTotalNet || 0) * 0.3),
                          },
                          {
                            label: 'Tạm ứng 50%',
                            calc: () => Math.round((jobAcceptanceBreakdown.financials.plannedTotalNet || 0) * 0.5),
                          },
                          {
                            label: 'Tối đa 2.000.000đ',
                            calc: () =>
                              Math.min(
                                2_000_000,
                                Math.round((jobAcceptanceBreakdown.financials.plannedTotalNet || 0) * 0.5),
                              ),
                          },
                        ].map(preset => (
                          <Button
                            key={preset.label}
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              const nextAdv = preset.calc();
                              applyJobBreakdownToDraftValues(
                                draftVideoFee,
                                draftAddons,
                                undefined,
                                undefined,
                                undefined,
                                nextAdv,
                                draftProductName,
                                draftAirDate,
                              );
                            }}
                          >
                            {preset.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Task #2..N: Các Task đi kèm trong Phụ lục SOW (Bật/tắt tùy theo Job của từng KOC) */}
                <div className="p-3 rounded-lg border border-line bg-surface space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink">
                        Các Task đi kèm trong Phụ lục SOW ({draftAddons.filter(a => a.includedInSow !== false).length}/{draftAddons.length} Task áp dụng cho Job này)
                      </span>
                      {kind === 'ACCEPTANCE' && draftAddons.some(a => a.includedInSow === false) && (
                        <button
                          type="button"
                          onClick={() => setShowOmittedSowTasks(v => !v)}
                          className="text-2xs text-accent hover:underline font-medium"
                        >
                          {showOmittedSowTasks
                            ? 'Ẩn các hạng mục không có trong SOW'
                            : `Hiện ${draftAddons.filter(a => a.includedInSow === false).length} hạng mục không có trong SOW`}
                        </button>
                      )}
                    </div>
                    <span className="text-2xs font-code text-ink-2">
                      Phí Task đi kèm đạt nghiệm thu: {formatNumber(jobAcceptanceBreakdown.financials.activeAddonsNet)}đ
                      {jobAcceptanceBreakdown.financials.droppedDeduction > 0
                        ? ` · Khấu trừ hủy Task: -${formatNumber(jobAcceptanceBreakdown.financials.droppedDeduction)}đ`
                        : ''}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {draftAddons.map((addon, idx) => {
                      const isIncluded = addon.includedInSow !== false;
                      if (kind === 'ACCEPTANCE' && !isIncluded && !showOmittedSowTasks) {
                        return null;
                      }
                      const info = SOW_TASK_DELIVERABLE_INFO[addon.termType] || SOW_TASK_DELIVERABLE_INFO.ADS_CODE;
                      const taskNo = idx + 2;
                      return (
                        <div
                          key={addon.id || idx}
                          className={`p-2.5 rounded-lg border space-y-2 transition-colors ${
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
                                  applyJobBreakdownToDraftValues(draftVideoFee, nextList);
                                }}
                                className="rounded border-line text-accent focus:ring-accent"
                              />
                              <span className="px-1.5 py-0.5 rounded bg-surface border border-line font-code text-2xs">
                                Task #{taskNo} · {addon.taskCode || `${jobAcceptanceBreakdown.jobCode}-T0${taskNo}`}
                              </span>
                              <span>{addon.termLabel}</span>
                            </label>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {isIncluded ? (
                                <>
                                  <span className="px-2 py-0.5 rounded bg-surface border border-line text-2xs text-ink-2">
                                    {addon.deliverableLabel || info.deliverableLabel}
                                  </span>
                                  <Status
                                    tone={
                                      addon.acceptanceStatus === 'DROPPED'
                                        ? 'critical'
                                        : addon.acceptanceStatus === 'VERIFIED'
                                          ? 'positive'
                                          : 'warning'
                                    }
                                  >
                                    {addon.acceptanceStatus === 'DROPPED'
                                      ? 'Hủy - Khấu trừ'
                                      : addon.acceptanceStatus === 'VERIFIED'
                                        ? 'Đạt nghiệm thu'
                                        : 'Chờ bàn giao đầu việc'}
                                  </Status>
                                </>
                              ) : (
                                <Status tone="neutral">Không có trong Job này (SOW ghi Không áp dụng)</Status>
                              )}
                            </div>
                          </div>

                          {isIncluded && (
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                              <div className="md:col-span-3">
                                <Select
                                  value={addon.termType}
                                  onChange={e => {
                                    const nextType = e.target.value as SowTaskTermType;
                                    const nextInfo = SOW_TASK_DELIVERABLE_INFO[nextType];
                                    const nextList = draftAddons.map((a, i) =>
                                      i === idx
                                        ? {
                                            ...a,
                                            termType: nextType,
                                            termLabel: nextInfo.taskTitle,
                                            deliverableLabel: nextInfo.deliverableLabel,
                                            durationDays: nextInfo.defaultDays,
                                          }
                                        : a,
                                    );
                                    applyJobBreakdownToDraftValues(draftVideoFee, nextList);
                                  }}
                                >
                                  <option value="ADS_CODE">Cấp mã quảng cáo Spark Ads</option>
                                  <option value="IMAGE_USAGE">Sử dụng hình ảnh &amp; video</option>
                                  <option value="CROSS_POST_REUP">Đăng chéo / Reup kênh phụ</option>
                                  <option value="LINK_BIO_CART">Gắn giỏ hàng / Link Bio</option>
                                  <option value="EXCLUSIVITY">Độc quyền ngành hàng</option>
                                </Select>
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
                                  className="font-code text-right"
                                />
                                <span className="text-2xs text-ink-3 shrink-0">ngày</span>
                              </div>
                              <div className="md:col-span-3">
                                <Input
                                  value={addon.evidenceCodeOrUrl}
                                  onChange={e => {
                                    const val = e.target.value;
                                    const nextList = draftAddons.map((a, i) =>
                                      i === idx
                                        ? {
                                            ...a,
                                            evidenceCodeOrUrl: val,
                                            acceptanceStatus:
                                              val.trim() && a.acceptanceStatus === 'PENDING_ACCEPTANCE'
                                                ? 'VERIFIED'
                                                : a.acceptanceStatus,
                                          }
                                        : a,
                                    );
                                    applyJobBreakdownToDraftValues(draftVideoFee, nextList);
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
                                    applyJobBreakdownToDraftValues(draftVideoFee, nextList);
                                  }}
                                  placeholder="0 (Gộp gói)"
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
                                    applyJobBreakdownToDraftValues(draftVideoFee, nextList);
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
                                      applyJobBreakdownToDraftValues(draftVideoFee, nextList);
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

                {/* Tóm tắt quyết toán nghiệm thu theo các Task của Phụ lục Job */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-2.5 rounded-lg border border-line bg-sunken/60 font-code">
                  <div>
                    <span className="text-2xs text-ink-3 block">Tổng Phụ lục SOW</span>
                    <span className="font-semibold text-ink">{formatNumber(jobAcceptanceBreakdown.financials.plannedTotalNet)}đ</span>
                  </div>
                  <div>
                    <span className="text-2xs text-ink-3 block">Khấu trừ hủy Task</span>
                    <span className={`font-semibold ${jobAcceptanceBreakdown.financials.droppedDeduction > 0 ? 'text-critical' : 'text-ink-2'}`}>
                      {jobAcceptanceBreakdown.financials.droppedDeduction > 0
                        ? `-${formatNumber(jobAcceptanceBreakdown.financials.droppedDeduction)}đ`
                        : '0đ'}
                    </span>
                  </div>
                  <div>
                    <span className="text-2xs text-ink-3 block">Nghiệm thu Net</span>
                    <span className="font-semibold text-ink">{formatNumber(jobAcceptanceBreakdown.financials.acceptedTotalNet)}đ</span>
                  </div>
                  <div>
                    <span className="text-2xs text-ink-3 block">
                      {jobAcceptanceBreakdown.subjectKind === 'COM'
                        ? `VAT (${deal?.vatRatePercent ?? 8}%)`
                        : jobAcceptanceBreakdown.subjectKind === 'HKD'
                          ? 'Thuế HKD (0đ)'
                          : 'Thuế TNCN (10%)'}
                    </span>
                    <span className="font-semibold text-ink">
                      {formatNumber(
                        jobAcceptanceBreakdown.subjectKind === 'COM'
                          ? jobAcceptanceBreakdown.financials.vatTax
                          : jobAcceptanceBreakdown.financials.pitTax,
                      )}đ
                    </span>
                  </div>
                  <div>
                    <span className="text-2xs text-ink-3 block">
                      Còn trả (Sau tạm ứng {formatNumber(jobAcceptanceBreakdown.financials.advanceAmount)}đ)
                    </span>
                    <span className="font-semibold text-positive">{formatNumber(jobAcceptanceBreakdown.financials.remainingPayable)}đ</span>
                  </div>
                </div>
              </div>
            </Panel>
          )}

          {!isKocOwnForm && template && (
            <div className="rounded-xl border border-line bg-surface p-3 flex flex-wrap items-center justify-between gap-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <Status tone={missingTotalCount === 0 ? 'positive' : 'warning'}>
                  Hệ thống tự điền: {filledTotalCount}/{fields.length} trường
                </Status>
                <span className="text-ink-2">
                  {missingTotalCount === 0
                    ? 'Đã kết nối đủ dữ liệu từ Hồ sơ KOC, Job & Hợp đồng gốc — Người dùng chỉ cần kiểm tra lại hoặc chỉnh sửa khi có ngoại lệ.'
                    : `Còn ${missingTotalCount} trường trống (dòng dự phòng hoặc tùy chọn).`}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Segmented
                  value={fieldFilterMode}
                  onChange={v => setFieldFilterMode(v as 'ALL' | 'NEEDS_ATTENTION')}
                  items={[
                    { key: 'ALL', label: `Tất cả trường (${fields.length})` },
                    { key: 'NEEDS_ATTENTION', label: `Cần kiểm tra / Chỉnh tay (${needsAttentionCount})` },
                  ]}
                />
                <Button size="sm" variant="secondary" onClick={refreshSystemPrefill}>
                  Đồng bộ lại từ KOC &amp; Job
                </Button>
              </div>
            </div>
          )}

          {!isKocOwnForm && template && groups.map(g => {
            const visibleFields =
              fieldFilterMode === 'NEEDS_ATTENTION'
                ? g.fields.filter(f => !values[f.key]?.trim() || !prefilled.has(f.key))
                : g.fields;
            if (visibleFields.length === 0) return null;
            return (
              <Panel key={g.key} title={g.title}>
                <div className="grid gap-3.5 md:grid-cols-2">
                  {visibleFields.map(f => {
                    const id = `ct-f-${f.key}`;
                    const hasVal = Boolean(values[f.key]?.trim());
                    const srcInfo = describeFieldDataSource(f, prefilled.has(f.key), hasVal, Boolean(parentRecord));
                    const label = `${f.title || f.label}${f.required ? ' *' : ''} (${srcInfo.badgeLabel})`;
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
            );
          })}

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
                            Views: <span className="font-semibold text-ink font-code">{formatNumber(inspectionMeta.viewsCount)}</span>
                          </span>
                          <span>
                            Tim: <span className="font-semibold text-ink font-code">{formatNumber(inspectionMeta.likesCount)}</span>
                          </span>
                          <span>
                            Bình luận: <span className="font-semibold text-ink font-code">{formatNumber(inspectionMeta.commentsCount)}</span>
                          </span>
                          <span>
                            Chia sẻ: <span className="font-semibold text-ink font-code">{formatNumber(inspectionMeta.sharesCount)}</span>
                          </span>
                          <span>
                            ER: <span className="font-semibold text-accent font-code">{inspectionMeta.engagementRate}%</span>
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
              partnerName={partner}
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
            {editing
              ? 'Lưu phiên bản mới'
              : isSow
                ? 'Lưu Phụ lục SOW & Chuyển bước ký'
                : 'Lưu nháp'}
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
