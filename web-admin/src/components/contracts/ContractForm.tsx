'use client';

/**
 * Tạo hoặc sửa hồ sơ theo mẫu pháp chế. Chọn booking thì tự chọn mẫu theo loại hồ sơ KOC
 * và điền sẵn các ô có dữ liệu (Bên B, số hợp đồng, ngày ký, sản phẩm, giá). Người tạo kiểm tra lại trước khi lưu.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Building2, Calendar, Camera, CheckCircle2, Columns2, Copy, CreditCard, FileScan, FileUp, Scale, Search, ShieldCheck, Trash2, Upload, UserCheck } from 'lucide-react';
import type { BookingDealItem, KocItem, LegalDocAttachment, OcrExtractedFields } from '../../lib/types';
import type { AcceptanceScreenshotItem, ContractField, ContractRecord, DocBlock, LegalTemplate, VideoAcceptanceInspectionMeta } from '../../lib/contracts/types';
import { Button, Combobox, DataTable, Field, Input, Modal, Panel, Person, Segmented, Select, Status, Textarea } from '../ui';
import type { Column } from '../ui';
import type { ComboboxOption } from '../ui/Combobox';
import { formatNumber } from '../../lib/format';
import { contractApi, type ContractBootstrap } from './api';
import { ContractDocumentViewer } from './ContractDocumentViewer';
import { LegalAttachmentsPanel } from './LegalAttachmentsPanel';
import { extractGoogleDocId } from '../../lib/contracts/googleDocsService';
import type { GoogleDocsReviewRouting, GoogleDocCommentItem } from '../../lib/contracts/googleDocsTypes';
import { VideoProductScreenshotModal } from './VideoProductScreenshotModal';
import { findSavedScreenshotsForContext } from '../../lib/acceptanceScreenshotStore';
import {
  getKocConnectedChannels,
  KOC_PLATFORM_LABEL,
  mergeLegalDocAttachments,
  saveSyncedKocLegalAttachments,
  getKocLegalProfiles,
  LEGAL_TYPE_LABEL,
} from '../koc/kocUtils';
import {
  GROUP_ORDER,
  OFFICIAL_3STAGE_TEMPLATE_IDS,
  PAYMENT_SCHEDULE_META_KEY,
  SOW_JOBS_META_KEY,
  isTwoTimePaymentField,
  resolvePaymentScheduleOption,
  type PaymentScheduleOption,
  SOW_TASKS_META_KEY,
  SOW_TASK_DELIVERABLE_INFO,
  aggregateMultiJobAcceptanceBreakdown,
  buildDealSowJobTables,
  buildJobAcceptanceBreakdown,
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
  /**
   * Cách tạo hợp đồng người dùng chọn ở bước đầu: mẫu Upbase giữ nguyên, mẫu Upbase có chỉnh sửa
   * (sửa câu chữ trên Google Doc) hoặc Google Doc mẫu của KOC.
   */
  source?: 'UPBASE_TEMPLATE' | 'UPBASE_AMENDED' | 'GOOGLE_DOCS';
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
  legalProfileId?: string;
  legalAttachments?: LegalDocAttachment[];
  googleDocsUrl?: string;
  googleDocsId?: string;
  googleDocsSource?: 'TEMPLATE_AMENDED' | 'KOC_CUSTOM_DOC';
  googleDocsReviewRouting?: GoogleDocsReviewRouting;
  googleDocsComments?: GoogleDocCommentItem[];
  googleDocsAuditTrail?: import('../../lib/contracts/googleDocsTypes').GoogleDocsAuditTrail;
  /** Tạo mới theo luồng Google Doc: lưu và trình draft luôn. */
  submitGoogleDocsDraft?: boolean;
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
  onSyncKocLegalAttachments,
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
  onSyncKocLegalAttachments?: (
    kocId: string,
    legalProfileId: string | undefined,
    attachments: LegalDocAttachment[],
  ) => void;
  onBackToBooking?: () => void;
}) {
  const editing = !!record;
  const findFrameworkForKoc = (
    k?: KocItem,
    d?: BookingDealItem,
    legalProfileIdOverride?: string,
  ): ContractRecord | undefined => {
    const targetKocId = k?.id || d?.kocId;
    const activeProf = resolveActiveLegalProfile(
      k,
      d,
      legalProfileIdOverride || init?.legalProfileId || d?.legalProfileId,
    );
    const expectedPrefix = activeProf
      ? activeProf.legalType === 'COMPANY'
        ? 'COM-'
        : activeProf.legalType === 'HOUSEHOLD'
          ? 'HKD-'
          : 'IND-'
      : '';
    const targetPartnerName = partnerName(k, d, activeProf?.id);
    const targetCleanHandle = (k?.channelId || d?.kocChannelId || '').replace(/^@/, '').toLowerCase();

    if (expectedPrefix) {
      const strictMatch = data.records.find(
        r =>
          r.templateId.endsWith('-HDNT') &&
          r.templateId.startsWith(expectedPrefix) &&
          ((targetKocId && r.kocId === targetKocId && (!targetPartnerName || r.partner === targetPartnerName)) ||
            (targetPartnerName && r.partner === targetPartnerName)),
      );
      if (strictMatch) return strictMatch;

      const prefixAndKocMatch = data.records.find(
        r =>
          r.templateId.endsWith('-HDNT') &&
          r.templateId.startsWith(expectedPrefix) &&
          ((targetKocId && r.kocId === targetKocId) ||
            (targetCleanHandle && (r.values['token:[ID KOC]'] || '').toLowerCase().startsWith(targetCleanHandle))),
      );
      return prefixAndKocMatch;
    }
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
  const [docStage, setDocStage] = useState<ContractDocStage>(initialDocStage);
  const [kind] = useState<'CONTRACT' | 'ACCEPTANCE'>(
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
  const [hasCustomTerms, setHasCustomTerms] = useState<boolean>(record?.hasCustomTerms ?? init?.source === 'UPBASE_AMENDED');
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
  const [legalAttachments, setLegalAttachments] = useState<LegalDocAttachment[]>(() =>
    record?.legalAttachments && record.legalAttachments.length > 0
      ? record.legalAttachments
      : initialResolvedProfile?.legalAttachments || initialDeal?.legalProfileSnapshot?.legalAttachments || []
  );

  const [sourceMode, setSourceMode] = useState<'UPBASE_TEMPLATE' | 'GOOGLE_DOCS' | 'KOC_DOCX'>(() => {
    if (record?.googleDocsUrl) return 'GOOGLE_DOCS';
    if (record?.isKocOwnForm ?? init?.isKocOwnForm) return 'KOC_DOCX';
    if (!record && (init?.source === 'GOOGLE_DOCS' || init?.source === 'UPBASE_AMENDED')) return 'GOOGLE_DOCS';
    return 'UPBASE_TEMPLATE';
  });
  const [googleDocsUrl, setGoogleDocsUrl] = useState<string>(record?.googleDocsUrl || '');
  const [googleDocsSource, setGoogleDocsSource] = useState<'TEMPLATE_AMENDED' | 'KOC_CUSTOM_DOC'>(
    record?.googleDocsSource || (init?.source === 'GOOGLE_DOCS' ? 'KOC_CUSTOM_DOC' : 'TEMPLATE_AMENDED')
  );
  // Phân luồng và bình luận do máy chủ ghi lúc trình final; form chỉ giữ nguyên khi sửa hồ sơ.
  const googleDocsRouting = record?.googleDocsReviewRouting || null;
  const googleDocsComments = record?.googleDocsComments || [];
  const [isKocOwnForm] = useState<boolean>(record?.isKocOwnForm ?? init?.isKocOwnForm ?? false);
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
  // Luồng "mẫu của KOC": hợp đồng nằm trên Google Doc KOC gửi, không có trường của mẫu Upbase.
  const isKocGoogleDoc = sourceMode === 'GOOGLE_DOCS' && googleDocsSource === 'KOC_CUSTOM_DOC';
  const isKocForm = isKocOwnForm || isKocGoogleDoc;
  // Mẫu Upbase có chỉnh sửa: vẫn điền theo mẫu, câu chữ sửa trên Google Doc rồi dán link để so với mẫu gốc.
  const isAmendedGoogleDoc = sourceMode === 'GOOGLE_DOCS' && googleDocsSource === 'TEMPLATE_AMENDED';
  const usesTemplateFields = !isKocForm;
  const activeSourceTab: 'UPBASE_TEMPLATE' | 'UPBASE_AMENDED' | 'GOOGLE_DOCS' =
    isKocGoogleDoc || isKocOwnForm
      ? 'GOOGLE_DOCS'
      : isAmendedGoogleDoc || hasCustomTerms
        ? 'UPBASE_AMENDED'
        : 'UPBASE_TEMPLATE';
  const switchContractSource = (nextSource: 'UPBASE_TEMPLATE' | 'UPBASE_AMENDED' | 'GOOGLE_DOCS') => {
    if (nextSource === 'UPBASE_TEMPLATE') {
      setSourceMode('UPBASE_TEMPLATE');
      setGoogleDocsSource('TEMPLATE_AMENDED');
      setHasCustomTerms(false);
    } else if (nextSource === 'UPBASE_AMENDED') {
      setSourceMode('GOOGLE_DOCS');
      setGoogleDocsSource('TEMPLATE_AMENDED');
      setHasCustomTerms(true);
    } else {
      setSourceMode('GOOGLE_DOCS');
      setGoogleDocsSource('KOC_CUSTOM_DOC');
      setHasCustomTerms(true);
    }
  };
  const [botEmailCopied, setBotEmailCopied] = useState(false);

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
  // Mẫu đã tự điền theo hồ sơ pháp lý: mặc định chỉ hiện các ô cần xem lại.
  const [fieldFilterMode, setFieldFilterMode] = useState<'ALL' | 'NEEDS_ATTENTION'>(() =>
    !record || init?.dealId || record?.dealId ? 'NEEDS_ATTENTION' : 'ALL',
  );
  const [isContextPickerExpanded, setIsContextPickerExpanded] = useState<boolean>(
    () => !Boolean(init?.dealId || init?.kocId || record?.dealId || record?.kocId),
  );
  const [showAllTemplateFields, setShowAllTemplateFields] = useState<boolean>(() => Boolean(record));
  const [manualPartnerMode, setManualPartnerMode] = useState<boolean>(false);
  const [isJobDetailExpanded, setIsJobDetailExpanded] = useState<boolean>(false);
  const [showNotesField, setShowNotesField] = useState<boolean>(() => Boolean(record?.internalNotes));
  const [showOmittedSowTasks, setShowOmittedSowTasks] = useState(false);
  const paymentScheduleOption = useMemo(
    () => resolvePaymentScheduleOption(values, templateId, fields),
    [values, templateId, fields],
  );
  const activeFields = useMemo(
    () => (paymentScheduleOption === 'TWO_TIMES' ? fields : fields.filter(f => !isTwoTimePaymentField(f))),
    [fields, paymentScheduleOption],
  );
  const groups = useMemo(
    () => GROUP_ORDER.map(g => ({ ...g, fields: activeFields.filter(f => (f.group || 'OTHER') === g.key) })).filter(g => g.fields.length),
    [activeFields],
  );
  const isSecondaryOptionalField = (f: ContractField) => {
    if (f.required) return false;
    const t = (f.title || f.label || '').toLowerCase();
    return (
      t.includes('link kênh shopee') ||
      t.includes('link kênh facebook') ||
      t.includes('link kênh instagram') ||
      t.includes('link kênh youtube') ||
      t.includes('link kênh threads') ||
      t.includes('post-only') ||
      t.includes('production-only') ||
      t.includes('phiên bản cắt ngắn') ||
      t.includes('điều khoản điều chỉnh')
    );
  };
  const isFieldNeedsAttention = (f: ContractField) => {
    const hasVal = Boolean(values[f.key]?.trim());
    if (hasVal && !prefilled.has(f.key)) return true;
    if (!hasVal && !isSecondaryOptionalField(f)) return true;
    return false;
  };
  const required = activeFields.filter(f => f.required);
  const requiredDone = required.filter(f => values[f.key]?.trim()).length;
  const dateGroupFields = activeFields.filter(f => f.group === 'DATE');
  const nonDateActiveFields = activeFields.filter(f => f.group !== 'DATE');
  const uiTotalFieldsCount = nonDateActiveFields.length + (dateGroupFields.length > 0 ? 1 : 0);
  const needsAttentionCount =
    nonDateActiveFields.filter(isFieldNeedsAttention).length +
    (dateGroupFields.some(isFieldNeedsAttention) ? 1 : 0);

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

  const selectPaymentScheduleOption = (nextOpt: PaymentScheduleOption) => {
    if (nextOpt === 'ONE_TIME' || nextOpt === 'BY_SOW') {
      setDraftAdvanceAmount(0);
      if (fields.length > 0) {
        const nextBd = aggregateMultiJobAcceptanceBreakdown({
          jobs: draftJobTables,
          deal: dealWithActiveProfile || deal,
          koc,
          parentRecord,
          advanceAmount: 0,
        });
        setValues(prev => {
          const synced = syncValuesFromJobAcceptanceBreakdown(fields, prev, nextBd);
          synced[PAYMENT_SCHEDULE_META_KEY] = nextOpt;
          for (const f of fields) {
            if (isTwoTimePaymentField(f)) {
              synced[f.key] = '';
            }
          }
          return synced;
        });
      } else {
        setValues(prev => ({ ...prev, [PAYMENT_SCHEDULE_META_KEY]: nextOpt }));
      }
      return;
    }

    // nextOpt === 'TWO_TIMES'
    const defaultAdv =
      draftAdvanceAmount > 0
        ? draftAdvanceAmount
        : Math.min(2_000_000, Math.round((jobAcceptanceBreakdown.financials.plannedTotalNet || 0) * 0.5)) || 1_000_000;
    setDraftAdvanceAmount(defaultAdv);
    if (fields.length > 0) {
      const nextBd = aggregateMultiJobAcceptanceBreakdown({
        jobs: draftJobTables,
        deal: dealWithActiveProfile || deal,
        koc,
        parentRecord,
        advanceAmount: defaultAdv,
      });
      setValues(prev => {
        const synced = syncValuesFromJobAcceptanceBreakdown(fields, prev, nextBd);
        synced[PAYMENT_SCHEDULE_META_KEY] = 'TWO_TIMES';
        for (const f of fields) {
          const t = (f.title || f.label || '').toLowerCase();
          if ((t.includes('hạn tạm ứng') || t.includes('hạn thanh toán lần 2')) && !synced[f.key]?.trim()) {
            synced[f.key] = '07 - 10';
          }
        }
        return synced;
      });
    } else {
      setValues(prev => ({ ...prev, [PAYMENT_SCHEDULE_META_KEY]: 'TWO_TIMES' }));
    }
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
      const synced = syncValuesFromJobAcceptanceBreakdown(fields, result.values, freshBd);
      synced[SOW_JOBS_META_KEY] = JSON.stringify(freshJobs);
      setValues(synced);
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
    if (defProf?.legalAttachments) {
      setLegalAttachments(defProf.legalAttachments);
    }
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
      const synced = syncValuesFromJobAcceptanceBreakdown(fields, result.values, freshBd);
      synced[SOW_JOBS_META_KEY] = JSON.stringify(freshJobs);
      setValues(synced);
      setPrefilled(new Set(result.filled));
    }
    setIsContextPickerExpanded(false);
  };

  const chooseLegalProfile = (profId: string) => {
    setSelectedLegalProfileId(profId);
    const prof = kocLegalProfiles.find(p => p.id === profId);
    if (prof?.legalAttachments) {
      setLegalAttachments(prof.legalAttachments);
    }
    if (docStage === 'SOW') {
      const nextFw = findFrameworkForKoc(koc, deal, profId);
      setParentId(nextFw?.id || '');
    }
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
      const synced = syncValuesFromJobAcceptanceBreakdown(fields, result.values, jobAcceptanceBreakdown);
      synced[SOW_JOBS_META_KEY] = JSON.stringify(draftJobTables);
      setValues(synced);
      setPrefilled(new Set(result.filled));
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

  const [signDateText, setSignDateText] = useState<string | null>(null);
  const signDatePickerRef = useRef<HTMLInputElement | null>(null);

  const applySignDateParts = (dd: string, mm: string, yyyy: string) => {
    const cleanDd = dd.padStart(2, '0');
    const cleanMm = mm.padStart(2, '0');
    const yearLastDigit = yyyy.slice(-1);
    const yearLast2 = yyyy.slice(-2);
    setValues(prev => {
      const next = { ...prev };
      for (const f of fields) {
        if (f.source === 'signDay') next[f.key] = cleanDd;
        else if (f.source === 'signMonth') next[f.key] = cleanMm;
        else if (f.source === 'signYearDigit') next[f.key] = yearLastDigit;
        else if (f.source === 'docDate' && prefilled.has(f.key)) {
          next[f.key] = `${cleanDd}.${cleanMm}.${yearLast2}`;
        }
      }
      return next;
    });
    setPrefilled(prev => {
      const n = new Set(prev);
      for (const f of fields) {
        if (f.source === 'signDay' || f.source === 'signMonth' || f.source === 'signYearDigit') {
          n.delete(f.key);
        }
      }
      return n;
    });
  };

  const setValue = (f: ContractField, raw: string) => {
    const v = f.kind === 'money' ? formatMoneyInput(raw) : raw;
    setValues(prev => ({ ...prev, [f.key]: v }));
    if (prefilled.has(f.key)) setPrefilled(prev => { const n = new Set(prev); n.delete(f.key); return n; });
  };

  const leftScrollRef = useRef<HTMLDivElement | null>(null);
  const scrollLeftPaneToInput = (el: HTMLElement) => {
    const pane = leftScrollRef.current;
    if (pane && pane.scrollHeight > pane.clientHeight + 4) {
      const paneRect = pane.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const nextTop =
        pane.scrollTop +
        (elRect.top - paneRect.top) -
        pane.clientHeight / 2 +
        elRect.height / 2;
      pane.scrollTo({ top: Math.max(0, nextTop), behavior: 'smooth' });
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const focusFieldInput = (fieldKey: string) => {
    setActiveFieldKey(fieldKey);
    const matchedField = fields.find(f => f.key === fieldKey);
    const isCombinedDateField =
      matchedField &&
      (matchedField.source === 'signDay' ||
        matchedField.source === 'signMonth' ||
        matchedField.source === 'signYearDigit');
    const targetDomId = isCombinedDateField ? 'ct-f-sign-date' : `ct-f-${fieldKey}`;
    const input = document.getElementById(targetDomId);
    if (input) {
      scrollLeftPaneToInput(input);
      input.focus({ preventScroll: true });
    } else {
      setShowAllTemplateFields(true);
      setFieldFilterMode('ALL');
      setTimeout(() => {
        const revealed = document.getElementById(targetDomId);
        if (revealed) {
          scrollLeftPaneToInput(revealed);
          revealed.focus({ preventScroll: true });
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

    // Đồng thời lưu tệp CCCD/ĐKKD vừa tải lên vào Cloudflare R2 để gắn vào hồ sơ pháp lý
    const formData = new FormData();
    const docType = activeLegalProfile?.legalType && activeLegalProfile.legalType !== 'INDIVIDUAL' ? 'DKKD' : 'CCCD_FRONT';
    formData.append('file', file);
    formData.append('docType', docType);
    formData.append('entitySlug', koc?.channelId || koc?.id || partner || 'koc-legal');
    fetch('/api/contracts/legal-docs', { method: 'POST', body: formData })
      .then(r => r.json())
      .then(json => {
        if (json?.attachment) {
          setLegalAttachments(prev => {
            const next = mergeLegalDocAttachments(prev, [json.attachment as LegalDocAttachment]);
            if (koc?.id) {
              const targetProfId = activeLegalProfile?.id || selectedLegalProfileId || 'default';
              saveSyncedKocLegalAttachments(koc.id, targetProfId, next);
              onSyncKocLegalAttachments?.(koc.id, targetProfId, next);
            }
            return next;
          });
        }
      })
      .catch(() => undefined);
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
  const kocsWithLegalProfiles = useMemo(
    () =>
      kocs.filter(
        k =>
          getKocLegalProfiles(k).length > 0 ||
          k.id === selectedKocId ||
          k.id === record?.kocId ||
          k.id === init?.kocId,
      ),
    [kocs, selectedKocId, record?.kocId, init?.kocId],
  );

  const kocComboOptions = useMemo<ComboboxOption[]>(
    () =>
      kocsWithLegalProfiles.map(k => {
        const profiles = getKocLegalProfiles(k);
        const profileText = profiles.map(p => `${p.holderName || ''} ${p.taxCode || ''} ${p.cccd || ''}`).join(' ');
        const name = k.realName || k.companyName;
        return {
          value: k.id,
          label: `${k.stageName} (${k.channelId})`,
          hint: [name, profiles.length > 0 ? `${profiles.length} hồ sơ` : ''].filter(Boolean).join(' · ') || undefined,
          searchText: `${k.phone || ''} ${k.cccd || ''} ${k.taxCode || ''} ${profileText}`,
        };
      }),
    [kocsWithLegalProfiles],
  );

  const quickPickKocs = useMemo(() => {
    const sorted = [...kocsWithLegalProfiles].sort((a, b) => {
      const aProfs = getKocLegalProfiles(a).length;
      const bProfs = getKocLegalProfiles(b).length;
      if (bProfs !== aProfs) return bProfs - aProfs;
      return (b.totalPastDeals || 0) - (a.totalPastDeals || 0);
    });
    return sorted.slice(0, 6);
  }, [kocsWithLegalProfiles]);

  const kocScopedDeals = useMemo(() => {
    if (!koc) return [];
    const cleanHandle = koc.channelId.replace(/^@/, '').toLowerCase();
    return deals.filter(
      d =>
        d.kocId === koc.id ||
        (cleanHandle && (d.kocChannelId || '').replace(/^@/, '').toLowerCase() === cleanHandle),
    );
  }, [deals, koc]);

  const availableDealsToAdd = useMemo(() => {
    if (!koc) return [];
    const currentCodes = new Set(draftJobTables.map(j => j.jobCode));
    return kocScopedDeals.filter(d => !currentCodes.has(d.dealCode));
  }, [koc, kocScopedDeals, draftJobTables]);

  const addDealToSow = (selectedDeal: BookingDealItem) => {
    const nextIdx = draftJobTables.length;
    const newJobsToAdd: SowJobTableDraft[] = [];
    const currentCodes = new Set(draftJobTables.map(j => j.jobCode));

    if (selectedDeal.dealJobs && selectedDeal.dealJobs.length > 0) {
      selectedDeal.dealJobs.forEach((dj, jIdx) => {
        const code = dj.jobCode || `${selectedDeal.dealCode}-J0${jIdx + 1}`;
        if (!currentCodes.has(code)) {
          newJobsToAdd.push({
            id: `sow-job-${Date.now()}-${jIdx}`,
            jobCode: code,
            jobId: dj.id,
            jobTitle: dj.jobTitle || `Bảng công việc #${nextIdx + jIdx + 1} (${code})`,
            productName: dj.productName || dj.sanPham || selectedDeal.productName || selectedDeal.brandName || 'Sản phẩm chiến dịch',
            mediaChannel: dj.mediaChannel || (selectedDeal.bookingFormat?.includes('Live') ? 'Livestream' : 'TikTok'),
            airDate: dj.plannedAirDate || dj.actualAirDate || selectedDeal.postedDate || selectedDeal.deadlinePost || '',
            videoUrl: dj.linkAir || '',
            videoFeeNetVnd: dj.videoAssetNetCost || selectedDeal.totalValue || 2000000,
            quantity: 1,
            addonItems: [
              {
                id: `addon-ads-${Date.now()}-${jIdx}`,
                taskCode: `${code}-T02`,
                termType: 'ADS_CODE',
                termLabel: 'Cấp mã quảng cáo Spark Ads',
                includedInSow: Boolean(dj.sparkAdsCode || selectedDeal.sparkAdsCode),
                deliverableLabel: 'Mã Spark Ads',
                durationDays: selectedDeal.sparkAdsExpiryDays || 30,
                evidenceCodeOrUrl: dj.sparkAdsCode || selectedDeal.sparkAdsCode || '',
                allocatedCostVnd: 0,
                acceptanceStatus: (dj.sparkAdsCode || selectedDeal.sparkAdsCode) ? 'VERIFIED' : 'PENDING_ACCEPTANCE',
              },
              {
                id: `addon-cart-${Date.now()}-${jIdx}`,
                taskCode: `${code}-T03`,
                termType: 'LINK_BIO_CART',
                termLabel: 'Gắn giỏ hàng / Link Bio',
                includedInSow: true,
                deliverableLabel: 'Link sản phẩm',
                durationDays: 30,
                evidenceCodeOrUrl: '',
                allocatedCostVnd: 0,
                acceptanceStatus: 'PENDING_ACCEPTANCE',
              },
              {
                id: `addon-img-${Date.now()}-${jIdx}`,
                taskCode: `${code}-T04`,
                termType: 'IMAGE_USAGE',
                termLabel: 'Sử dụng hình ảnh & video',
                includedInSow: false,
                deliverableLabel: 'Hình ảnh / Video',
                durationDays: 90,
                evidenceCodeOrUrl: '',
                allocatedCostVnd: 0,
                acceptanceStatus: 'PENDING_ACCEPTANCE',
              },
              {
                id: `addon-excl-${Date.now()}-${jIdx}`,
                taskCode: `${code}-T05`,
                termType: 'EXCLUSIVITY',
                termLabel: 'Độc quyền ngành hàng',
                includedInSow: false,
                deliverableLabel: 'Cam kết độc quyền',
                durationDays: 30,
                evidenceCodeOrUrl: '',
                allocatedCostVnd: 0,
                acceptanceStatus: 'PENDING_ACCEPTANCE',
              },
            ],
          });
        }
      });
    } else {
      const code = selectedDeal.dealCode || `JOB-0${nextIdx + 1}`;
      newJobsToAdd.push({
        id: `sow-job-${Date.now()}`,
        jobCode: code,
        jobId: selectedDeal.jobId || selectedDeal.id,
        jobTitle: `Bảng công việc #${nextIdx + 1} (${code})`,
        productName: selectedDeal.productName || selectedDeal.brandName || 'Sản phẩm chiến dịch',
        mediaChannel: selectedDeal.bookingFormat?.includes('Live') ? 'Livestream' : 'TikTok',
        airDate: selectedDeal.postedDate || selectedDeal.deadlinePost || '',
        videoUrl: selectedDeal.tiktokVideoUrl || '',
        videoFeeNetVnd: selectedDeal.totalValue || 2000000,
        quantity: 1,
        addonItems: [
          {
            id: `addon-ads-${Date.now()}`,
            taskCode: `${code}-T02`,
            termType: 'ADS_CODE',
            termLabel: 'Cấp mã quảng cáo Spark Ads',
            includedInSow: Boolean(selectedDeal.sparkAdsCode),
            deliverableLabel: 'Mã Spark Ads',
            durationDays: selectedDeal.sparkAdsExpiryDays || 30,
            evidenceCodeOrUrl: selectedDeal.sparkAdsCode || '',
            allocatedCostVnd: 0,
            acceptanceStatus: selectedDeal.sparkAdsCode ? 'VERIFIED' : 'PENDING_ACCEPTANCE',
          },
          {
            id: `addon-cart-${Date.now()}`,
            taskCode: `${code}-T03`,
            termType: 'LINK_BIO_CART',
            termLabel: 'Gắn giỏ hàng / Link Bio',
            includedInSow: true,
            deliverableLabel: 'Link sản phẩm',
            durationDays: 30,
            evidenceCodeOrUrl: '',
            allocatedCostVnd: 0,
            acceptanceStatus: 'PENDING_ACCEPTANCE',
          },
          {
            id: `addon-img-${Date.now()}`,
            taskCode: `${code}-T04`,
            termType: 'IMAGE_USAGE',
            termLabel: 'Sử dụng hình ảnh & video',
            includedInSow: false,
            deliverableLabel: 'Hình ảnh / Video',
            durationDays: 90,
            evidenceCodeOrUrl: '',
            allocatedCostVnd: 0,
            acceptanceStatus: 'PENDING_ACCEPTANCE',
          },
          {
            id: `addon-excl-${Date.now()}`,
            taskCode: `${code}-T05`,
            termType: 'EXCLUSIVITY',
            termLabel: 'Độc quyền ngành hàng',
            includedInSow: false,
            deliverableLabel: 'Cam kết độc quyền',
            durationDays: 30,
            evidenceCodeOrUrl: '',
            allocatedCostVnd: 0,
            acceptanceStatus: 'PENDING_ACCEPTANCE',
          },
        ],
      });
    }

    if (newJobsToAdd.length > 0) {
      const nextJobs = [...draftJobTables, ...newJobsToAdd];
      applyMultiJobTablesToDraftValues(nextJobs, nextJobs.length - 1);
    }
  };

  const createNewBlankJob = () => {
    const nextIdx = draftJobTables.length;
    const baseCode = deal?.dealCode || (draftJobTables[0] ? draftJobTables[0].jobCode.split('-')[0] : 'JOB');
    const nextJobCode = `${baseCode}-J0${nextIdx + 1}`;
    const newJob: SowJobTableDraft = {
      id: `sow-job-${Date.now()}`,
      jobCode: nextJobCode,
      jobTitle: `Bảng công việc #${nextIdx + 1} (${nextJobCode})`,
      productName: brand ? `Sản phẩm ${brand} (Job #${nextIdx + 1})` : `Sản phẩm Job #${nextIdx + 1}`,
      mediaChannel: 'TikTok',
      airDate: draftAirDate || '',
      videoUrl: '',
      videoFeeNetVnd: 2000000,
      quantity: 1,
      addonItems: [
        {
          id: `addon-ads-${Date.now()}`,
          taskCode: `${nextJobCode}-T02`,
          termType: 'ADS_CODE',
          termLabel: 'Cấp mã quảng cáo Spark Ads',
          includedInSow: true,
          deliverableLabel: 'Mã Spark Ads',
          durationDays: 30,
          evidenceCodeOrUrl: '',
          allocatedCostVnd: 0,
          acceptanceStatus: 'PENDING_ACCEPTANCE',
        },
        {
          id: `addon-cart-${Date.now()}`,
          taskCode: `${nextJobCode}-T03`,
          termType: 'LINK_BIO_CART',
          termLabel: 'Gắn giỏ hàng / Link Bio',
          includedInSow: true,
          deliverableLabel: 'Link sản phẩm',
          durationDays: 30,
          evidenceCodeOrUrl: '',
          allocatedCostVnd: 0,
          acceptanceStatus: 'PENDING_ACCEPTANCE',
        },
        {
          id: `addon-img-${Date.now()}`,
          taskCode: `${nextJobCode}-T04`,
          termType: 'IMAGE_USAGE',
          termLabel: 'Sử dụng hình ảnh & video',
          includedInSow: false,
          deliverableLabel: 'Hình ảnh / Video',
          durationDays: 90,
          evidenceCodeOrUrl: '',
          allocatedCostVnd: 0,
          acceptanceStatus: 'PENDING_ACCEPTANCE',
        },
        {
          id: `addon-excl-${Date.now()}`,
          taskCode: `${nextJobCode}-T05`,
          termType: 'EXCLUSIVITY',
          termLabel: 'Độc quyền ngành hàng',
          includedInSow: false,
          deliverableLabel: 'Cam kết độc quyền',
          durationDays: 30,
          evidenceCodeOrUrl: '',
          allocatedCostVnd: 0,
          acceptanceStatus: 'PENDING_ACCEPTANCE',
        },
      ],
    };
    const nextJobs = [...draftJobTables, newJob];
    applyMultiJobTablesToDraftValues(nextJobs, nextIdx);
  };

  const removeJobFromSow = (jIdx: number) => {
    if (draftJobTables.length <= 1) return;
    const remaining = draftJobTables.filter((_, idx) => idx !== jIdx);
    const nextActive = Math.max(0, Math.min(activeJobTableIdx, remaining.length - 1));
    applyMultiJobTablesToDraftValues(remaining, nextActive);
  };

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
      (isKocForm ? customContractValue : '') ||
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
  }, [values, fields, deal, isKocForm, customContractValue]);

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
      hasCustomTerms: isKocForm || hasCustomTerms,
      isKolForm: isKocForm || selectedTpl?.scope === 'KOC_CUSTOM',
      availableTemplates: data.templates,
    });
  }, [koc, dealWithActiveProfile, deal, numericTotal, numericAdvance, hasCustomTerms, isKocForm, templateId, data.templates]);

  const hasInheritedMasterContract = Boolean(
    parentId ||
      activeLegalProfile?.frameworkContractCode?.trim() ||
      deal?.masterContractCode?.trim() ||
      values['token:[Ngày HĐNT]']?.trim(),
  );

  const existingFrameworkRecord = activeLegalProfile
    ? findFrameworkForKoc(koc, deal, activeLegalProfile.id)
    : undefined;
  const profileHasFramework = Boolean(existingFrameworkRecord);

  const canSubmitForm =
    !busy &&
    Boolean(template) &&
    Boolean(title.trim()) &&
    (isHdnt || Boolean(brand.trim())) &&
    Boolean(partner.trim()) &&
    (!isKocOwnForm || Boolean(customFile)) &&
    (!(isKocGoogleDoc || isAmendedGoogleDoc) || Boolean(extractGoogleDocId(googleDocsUrl))) &&
    (!isSow || hasInheritedMasterContract);

  const shareEmail = data.config.googleShareEmail || '';
  const googleDocIdValid = Boolean(extractGoogleDocId(googleDocsUrl));
  const renderGoogleDocLink = () => (
    <>
      {shareEmail ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-ink-2">Chia sẻ file cho:</span>
          <span className="font-code font-medium text-ink">{shareEmail}</span>
          <Button
            size="sm"
            variant="ghost"
            icon={botEmailCopied ? CheckCircle2 : Copy}
            onClick={() => {
              navigator.clipboard?.writeText(shareEmail).then(() => setBotEmailCopied(true)).catch(() => undefined);
            }}
          >
            {botEmailCopied ? 'Đã chép' : 'Chép email'}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-warning">
          Máy chủ chưa kết nối Google: hồ sơ vẫn lưu được nhưng bình luận và bản chốt sẽ là dữ liệu giả lập.
        </p>
      )}
      <Field
        label="Link Google Doc hợp đồng *"
        htmlFor="ct-gdoc-url"
        error={googleDocsUrl.trim() && !googleDocIdValid ? 'Link chưa đúng dạng Google Doc (docs.google.com/document/d/…).' : undefined}
      >
        <Input
          id="ct-gdoc-url"
          value={googleDocsUrl}
          onChange={e => setGoogleDocsUrl(e.target.value)}
          placeholder="https://docs.google.com/document/d/…"
        />
      </Field>
    </>
  );

  return (
    <form
      className="space-y-4"
      onSubmit={e => {
        e.preventDefault();
        const baseValues =
          isSow || kind === 'ACCEPTANCE'
            ? {
                ...values,
                [SOW_TASKS_META_KEY]: JSON.stringify(draftAddons),
                [SOW_JOBS_META_KEY]: JSON.stringify(draftJobTables),
                [PAYMENT_SCHEDULE_META_KEY]: paymentScheduleOption,
                'token:[Số tiền tạm ứng đợt 1]':
                  paymentScheduleOption === 'TWO_TIMES'
                    ? formatMoneyInput(String(draftAdvanceAmount || 0))
                    : '0',
                sowAdvanceAmount: String(paymentScheduleOption === 'TWO_TIMES' ? draftAdvanceAmount : 0),
              }
            : values;
        const nextValues = isKocForm && customContractValue.trim()
          ? { ...baseValues, 'token:[Tổng tiền trước thuế/sau thuế]': customContractValue.trim() }
          : baseValues;
        onSave({
          title: title.trim(),
          brand: isHdnt ? 'UPBASE' : brand.trim() || 'UPBASE',
          partner: partner.trim(),
          templateId,
          parentId,
          values: nextValues,
          dealId: isHdnt ? undefined : deal?.id,
          dealCode: isHdnt ? undefined : deal?.dealCode,
          kocId: koc?.id,
          hasCustomTerms: isKocForm || isAmendedGoogleDoc ? true : hasCustomTerms,
          customTermsSummary: customTermsSummary.trim() || undefined,
          internalNotes: internalNotes.trim() || undefined,
          isKocOwnForm,
          customFilename: isKocOwnForm ? customFile?.filename : undefined,
          customFileBase64: isKocOwnForm ? customFile?.base64 : undefined,
          customFileBlocks: isKocOwnForm ? customFile?.blocks : undefined,
          customFileParagraphs: isKocOwnForm ? customFile?.paragraphs : undefined,
          acceptanceScreenshots,
          legalProfileId: activeLegalProfile?.id || selectedLegalProfileId || undefined,
          legalAttachments,
          googleDocsUrl: sourceMode === 'GOOGLE_DOCS' ? googleDocsUrl.trim() : undefined,
          googleDocsId: sourceMode === 'GOOGLE_DOCS' ? (extractGoogleDocId(googleDocsUrl) || undefined) : undefined,
          googleDocsSource: sourceMode === 'GOOGLE_DOCS' ? googleDocsSource : undefined,
          googleDocsReviewRouting: sourceMode === 'GOOGLE_DOCS' ? (googleDocsRouting || undefined) : undefined,
          googleDocsComments: sourceMode === 'GOOGLE_DOCS' ? googleDocsComments : undefined,
          submitGoogleDocsDraft: !editing && (isKocGoogleDoc || isAmendedGoogleDoc) ? true : undefined,
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
          <Button variant="ghost" size="sm" icon={!onBackToBooking ? ArrowLeft : undefined} onClick={onCancel} className={!onBackToBooking ? '-ml-3' : ''}>
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
          {!editing && !isSow && kind !== 'ACCEPTANCE' && (
            <Segmented
              value={activeSourceTab}
              onChange={v => switchContractSource(v as 'UPBASE_TEMPLATE' | 'UPBASE_AMENDED' | 'GOOGLE_DOCS')}
              items={[
                { key: 'UPBASE_TEMPLATE', label: 'Mẫu chuẩn Upbase' },
                { key: 'UPBASE_AMENDED', label: 'Mẫu Upbase (có sửa)' },
                { key: 'GOOGLE_DOCS', label: 'Mẫu của KOC' },
              ]}
            />
          )}
          {isKocGoogleDoc ? (
            <Status tone={googleDocIdValid ? 'positive' : 'warning'}>
              {googleDocIdValid ? 'Đã có link Google Doc' : 'Chưa có link Google Doc'}
            </Status>
          ) : isKocOwnForm ? (
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
        {Boolean(koc || editing || manualPartnerMode || partner.trim()) && (
          <div className="flex flex-wrap items-center gap-2">
            {template && !isKocGoogleDoc && (
              <Button size="sm" variant="secondary" icon={Columns2} onClick={() => setShowSplitPreview(v => !v)}>
                {showSplitPreview ? 'Ẩn bản xem A4' : 'Xem bản A4 song song'}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onCancel}>Hủy</Button>
            <Button size="sm" variant="primary" type="submit" disabled={!canSubmitForm}>
              {editing
                ? 'Lưu phiên bản mới'
                : isKocGoogleDoc || isAmendedGoogleDoc
                  ? 'Lưu & trình draft'
                  : isSow
                    ? 'Lưu Phụ lục SOW & Chuyển bước ký'
                    : 'Lưu nháp'}
            </Button>
          </div>
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
        <div className="rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-xs text-ink flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
            <span><span className="text-warning font-semibold">Trùng số hợp đồng:</span> Đã tồn tại hồ sơ {docDateVal}/{kocIdVal} (&ldquo;{duplicateRecord.title}&rdquo;).</span>
          </div>
          <Button size="sm" variant="secondary" onClick={resolveDuplicateNumber}>
            Thêm hậu tố (-{deal?.dealCode || '02'})
          </Button>
        </div>
      )}

      {loadError && <p role="alert" className="text-xs text-critical">{loadError}</p>}

      {(() => {
        const hasSelectedPartyB = Boolean(koc || editing || manualPartnerMode || partner.trim());
        const showRightPreview = hasSelectedPartyB && Boolean(template) && showSplitPreview && !isKocGoogleDoc;
        const missingRequiredFields = activeFields.filter(
          f => f.required && f.group !== 'DATE' && !values[f.key]?.trim(),
        );

        const renderSignDateInline = () => {
          const dateGroup = groups.find(g => g.key === 'DATE');
          if (!dateGroup) return null;
          const dayField = dateGroup.fields.find(f => f.source === 'signDay');
          const monthField = dateGroup.fields.find(f => f.source === 'signMonth');
          const yearField = dateGroup.fields.find(f => f.source === 'signYearDigit');
          const rawDay = (dayField ? values[dayField.key] : '')?.trim() || '';
          const rawMonth = (monthField ? values[monthField.key] : '')?.trim() || '';
          const rawYear = (yearField ? values[yearField.key] : '')?.trim() || '';
          const fullYear =
            rawYear.length === 4
              ? rawYear
              : rawYear.length === 2
                ? `20${rawYear}`
                : rawYear.length === 1
                  ? `202${rawYear}`
                  : String(new Date().getFullYear());
          const pad2 = (s: string) => (s && /^\d+$/.test(s) ? s.padStart(2, '0') : s);
          const derivedVnDate =
            rawDay && rawMonth
              ? `${pad2(rawDay)}/${pad2(rawMonth)}/${fullYear}`
              : rawMonth
                ? `01/${pad2(rawMonth)}/${fullYear}`
                : '';
          const derivedIsoDate =
            rawDay && rawMonth && /^\d{1,2}$/.test(rawDay) && /^\d{1,2}$/.test(rawMonth) && /^\d{4}$/.test(fullYear)
              ? `${fullYear}-${pad2(rawMonth)}-${pad2(rawDay)}`
              : '';
          const primaryDateField = dayField || monthField || yearField || dateGroup.fields[0];

          return (
            <Field label="Ngày ký hợp đồng *" htmlFor="ct-f-sign-date">
              <div className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    id="ct-f-sign-date"
                    placeholder="DD/MM/YYYY"
                    className="font-code tabular-nums pr-9"
                    value={signDateText !== null ? signDateText : derivedVnDate}
                    onFocus={() => setActiveFieldKey(primaryDateField.key)}
                    onBlur={() => setSignDateText(null)}
                    onChange={e => {
                      const val = e.target.value;
                      setSignDateText(val);
                      const m = val.trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/);
                      if (m) {
                        const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
                        applySignDateParts(m[1], m[2], yyyy);
                      }
                    }}
                  />
                  <input
                    ref={signDatePickerRef}
                    type="date"
                    tabIndex={-1}
                    aria-label="Chọn ngày ký từ lịch"
                    value={derivedIsoDate}
                    onChange={e => {
                      const iso = e.target.value;
                      const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                      if (m) {
                        setSignDateText(null);
                        applySignDateParts(m[3], m[2], m[1]);
                      }
                    }}
                    className="sr-only"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const el = signDatePickerRef.current;
                      if (!el) return;
                      if (typeof el.showPicker === 'function') {
                        el.showPicker();
                      } else {
                        el.click();
                      }
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-ink-3 hover:text-ink hover:bg-sunken transition-colors"
                    title="Chọn từ lịch"
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const now = new Date();
                    setSignDateText(null);
                    applySignDateParts(
                      String(now.getDate()).padStart(2, '0'),
                      String(now.getMonth() + 1).padStart(2, '0'),
                      String(now.getFullYear()),
                    );
                  }}
                >
                  Hôm nay
                </Button>
              </div>
            </Field>
          );
        };

        const renderDealAndParentSelectors = () => (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Booking / Job thực thi *" htmlFor="ct-deal">
              <Select
                id="ct-deal"
                value={dealId}
                onChange={e => chooseDeal(e.target.value)}
                disabled={editing && !!record?.dealId}
              >
                <option value="">Chọn booking / job...</option>
                {koc && kocScopedDeals.length > 0 ? (
                  <>
                    <optgroup label={`Job của ${koc.stageName} (${kocScopedDeals.length})`}>
                      {kocScopedDeals.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.dealCode} · {d.brandName} ({formatNumber(d.totalValue || 0)}đ)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Các Job khác">
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
            </Field>

            <Field label={isSow ? 'Hợp đồng nguyên tắc gốc' : 'Phụ lục SOW gốc'} htmlFor="ct-parent">
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
                        ? `Kế thừa HĐNT (${activeLegalProfile?.frameworkContractCode || deal?.masterContractCode})`
                        : 'Chọn hợp đồng nguyên tắc của KOC...'
                      : 'Chọn Phụ lục SOW của Job...'}
                  </option>
                  {parents.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                </Select>

                {isSow && !parentId && !(activeLegalProfile?.frameworkContractCode?.trim() || deal?.masterContractCode?.trim()) && koc && (
                  <div className="flex items-center justify-between gap-2 text-2xs text-warning bg-warning-soft/30 px-3 py-2 rounded-lg border border-warning/30">
                    <span>KOC chưa có HĐNT gốc trong danh sách</span>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={creatingQuickFramework}
                      onClick={() => void handleQuickCreateFrameworkForSow()}
                    >
                      {creatingQuickFramework ? 'Đang tạo...' : 'Tạo nhanh HĐNT gốc'}
                    </Button>
                  </div>
                )}
              </div>
            </Field>
          </div>
        );

        return (
          <div className={`grid grid-cols-1 gap-5 items-start ${showRightPreview ? 'xl:grid-cols-[minmax(0,1fr)_minmax(480px,54%)]' : 'max-w-4xl mx-auto'}`}>
            <div
              ref={leftScrollRef}
              className={`grid gap-4 min-w-0 ${
                showRightPreview
                  ? 'xl:max-h-[calc(100dvh-136px)] xl:overflow-y-auto xl:overscroll-contain xl:pr-2 pb-2'
                  : ''
              }`}
            >
              <input
                ref={ocrInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleOcrFileChange}
              />

              {hasSelectedPartyB && usesTemplateFields && (kocLegalNotes || primaryKocTemplate) && (
                <div className="rounded-xl border border-warning/40 bg-warning-soft/75 p-3 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-warning flex items-center gap-2">
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

              {/* Bước 1: Tự động thu gọn thành thanh tóm tắt sau khi đã chọn KOC */}
              {hasSelectedPartyB && !isContextPickerExpanded && (koc || activeLegalProfile) ? (
                <Panel
                  title="Bước 1 · Bên B ký hợp đồng"
                  actions={
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={FileScan}
                        disabled={ocrBusy}
                        onClick={() => ocrInputRef.current?.click()}
                      >
                        {ocrBusy ? 'Đang đọc ảnh…' : 'Đọc ảnh CCCD / ĐKKD'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Upload}
                        onClick={() => setOcrOpen(true)}
                      >
                        Giấy tờ đính kèm ({legalAttachments.length})
                      </Button>
                      {!(editing && record?.kocId) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setIsContextPickerExpanded(true)}
                        >
                          Đổi KOC / Hồ sơ
                        </Button>
                      )}
                    </div>
                  }
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-sunken/50 px-3 py-2.5 text-xs">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className="font-semibold text-ink">
                          {koc ? `${koc.stageName} (${koc.channelId})` : partner}
                        </span>
                        {activeLegalProfile && (
                          <>
                            <span className="text-ink-3">·</span>
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
                            <span className="font-medium text-ink">{activeLegalProfile.holderName}</span>
                            <span className="text-ink-3">·</span>
                            <span className="font-code text-ink-2">
                              {activeLegalProfile.taxCode
                                ? `MST ••••${activeLegalProfile.taxCode.slice(-4)}`
                                : `CCCD ••••${(activeLegalProfile.cccd || '').slice(-4) || '—'}`}
                            </span>
                            {(activeLegalProfile.bankAccount || activeLegalProfile.bankAccountNumber) && (
                              <>
                                <span className="text-ink-3">·</span>
                                <span className="font-code text-ink-2">
                                  STK ••••{(activeLegalProfile.bankAccount || activeLegalProfile.bankAccountNumber || '').slice(-4)} ({activeLegalProfile.bankName || 'Ngân hàng'})
                                </span>
                              </>
                            )}
                          </>
                        )}
                        {isHdnt && !editing && profileHasFramework && (
                          <Status tone="warning">Đã có HĐNT</Status>
                        )}
                      </div>

                      {kocLegalProfiles.length > 1 && (
                        <Select
                          aria-label="Đổi hồ sơ pháp lý"
                          value={activeLegalProfile?.id || selectedLegalProfileId}
                          onChange={e => chooseLegalProfile(e.target.value)}
                          className="w-56"
                        >
                          {kocLegalProfiles.map(prof => (
                            <option key={prof.id} value={prof.id}>
                              [{LEGAL_TYPE_LABEL[prof.legalType]}] {prof.holderName}
                            </option>
                          ))}
                        </Select>
                      )}
                    </div>

                    {(isSow || kind === 'ACCEPTANCE') && renderDealAndParentSelectors()}
                  </div>
                </Panel>
              ) : (
                <Panel
                  title="Bước 1 · Chọn Bên B ký"
                  actions={
                    hasSelectedPartyB ? (
                      <Button size="sm" variant="ghost" onClick={() => setIsContextPickerExpanded(false)}>
                        Thu gọn
                      </Button>
                    ) : undefined
                  }
                >
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="KOC / Nhà sáng tạo *" htmlFor="ct-koc">
                        <Combobox
                          id="ct-koc"
                          value={koc?.id || selectedKocId}
                          onChange={v => chooseKocDirectly(v)}
                          disabled={editing && !!record?.kocId}
                          placeholder={`Tìm theo tên KOC, kênh, SĐT… (${kocComboOptions.length} KOC có hồ sơ pháp lý)`}
                          options={kocComboOptions}
                        />
                      </Field>

                      <Field label="Hồ sơ pháp lý Bên B *" htmlFor="ct-legal-profile">
                        <Select
                          id="ct-legal-profile"
                          value={activeLegalProfile?.id || selectedLegalProfileId}
                          onChange={e => chooseLegalProfile(e.target.value)}
                          disabled={!koc || kocLegalProfiles.length === 0}
                        >
                          {!koc ? (
                            <option value="">Chọn KOC trước...</option>
                          ) : kocLegalProfiles.length === 0 ? (
                            <option value="">KOC chưa có hồ sơ pháp lý</option>
                          ) : (
                            kocLegalProfiles.map(prof => {
                              const bankAcc = prof.bankAccount || prof.bankAccountNumber;
                              return (
                                <option key={prof.id} value={prof.id}>
                                  [{LEGAL_TYPE_LABEL[prof.legalType]}] {prof.holderName}
                                  {prof.taxCode ? ` · MST ••••${prof.taxCode.slice(-4)}` : prof.cccd ? ` · CCCD ••••${prof.cccd.slice(-4)}` : ''}
                                  {bankAcc ? ` · STK ••••${bankAcc.slice(-4)}` : ''}
                                </option>
                              );
                            })
                          )}
                        </Select>
                      </Field>
                    </div>

                    {/* Chọn nhanh 6 KOC có sẵn hồ sơ pháp lý khi vừa vào màn tạo */}
                    {!koc && !editing && quickPickKocs.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-2xs font-semibold text-ink-2">
                            Chọn nhanh KOC có sẵn hồ sơ pháp lý:
                          </span>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={FileScan}
                              disabled={ocrBusy}
                              onClick={() => ocrInputRef.current?.click()}
                            >
                              {ocrBusy ? 'Đang đọc ảnh…' : 'Đọc ảnh CCCD / ĐKKD'}
                            </Button>
                            {!manualPartnerMode && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setManualPartnerMode(true)}
                              >
                                Nhập tay đối tác ngoài KOC
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {quickPickKocs.map(qk => {
                            const profs = getKocLegalProfiles(qk);
                            const defP = profs.find(p => p.isDefault) || profs[0];
                            return (
                              <button
                                key={qk.id}
                                type="button"
                                onClick={() => chooseKocDirectly(qk.id)}
                                className="flex flex-col gap-1 rounded-lg border border-line bg-surface px-3 py-2.5 text-left transition-colors hover:border-accent hover:bg-accent-soft/20"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold text-ink truncate">{qk.stageName}</span>
                                  {defP && (
                                    <span className="px-1.5 py-0.5 rounded bg-sunken border border-line text-2xs text-ink-2 shrink-0">
                                      {LEGAL_TYPE_LABEL[defP.legalType]}
                                    </span>
                                  )}
                                </div>
                                <span className="text-2xs font-code text-ink-3 truncate">
                                  {qk.channelId} {defP?.holderName ? `· ${defP.holderName}` : ''}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {activeLegalProfile && (
                      <div className="flex flex-wrap items-center justify-between gap-2 text-2xs text-ink-2 bg-sunken/60 px-3 py-2 rounded-lg border border-line">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-ink">{activeLegalProfile.holderName}</span>
                          <span>·</span>
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
                          <span>·</span>
                          <span className="font-code">
                            {activeLegalProfile.taxCode
                              ? `MST ••••${activeLegalProfile.taxCode.slice(-4)}`
                              : `CCCD ••••${(activeLegalProfile.cccd || '').slice(-4) || '—'}`}
                          </span>
                          {(activeLegalProfile.bankAccount || activeLegalProfile.bankAccountNumber) && (
                            <>
                              <span>·</span>
                              <span className="font-code">
                                STK ••••{(activeLegalProfile.bankAccount || activeLegalProfile.bankAccountNumber || '').slice(-4)} ({activeLegalProfile.bankName || 'Ngân hàng'})
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={FileScan}
                            disabled={ocrBusy}
                            onClick={() => ocrInputRef.current?.click()}
                          >
                            {ocrBusy ? 'Đang đọc ảnh…' : 'Đọc ảnh CCCD / ĐKKD'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={Upload}
                            onClick={() => setOcrOpen(true)}
                          >
                            Giấy tờ đính kèm ({legalAttachments.length})
                          </Button>
                        </div>
                      </div>
                    )}

                    {(isSow || kind === 'ACCEPTANCE') && hasSelectedPartyB && renderDealAndParentSelectors()}

                    {((!isHdnt && hasSelectedPartyB) || manualPartnerMode || (hasSelectedPartyB && !activeLegalProfile)) && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {!isHdnt && (
                          <Field label="Nhãn hàng *" htmlFor="ct-brand">
                            <Input
                              id="ct-brand"
                              required
                              maxLength={120}
                              list="ct-brands"
                              value={brand}
                              onChange={e => setBrand(e.target.value)}
                              placeholder="Tên nhãn hàng"
                            />
                            <datalist id="ct-brands">{data.actor.brands.map(b => <option key={b} value={b} />)}</datalist>
                          </Field>
                        )}
                        {(manualPartnerMode || !activeLegalProfile) && (
                          <Field label="Tên Bên B *" htmlFor="ct-partner">
                            <Input
                              id="ct-partner"
                              required
                              maxLength={180}
                              value={partner}
                              onChange={e => setPartner(e.target.value)}
                              placeholder="Tên đối tác Bên B"
                            />
                          </Field>
                        )}
                      </div>
                    )}
                  </div>
                </Panel>
              )}

              {hasSelectedPartyB && (
                <>
                  {isKocGoogleDoc ? (
                    <Panel title="Bước 2 · Dán link Google Doc của KOC">
                      <div className="space-y-4">
                        {renderGoogleDocLink()}

                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label="Tên hồ sơ *" htmlFor="ct-title">
                            <Input
                              id="ct-title"
                              required
                              maxLength={180}
                              value={title}
                              onChange={e => setTitle(e.target.value)}
                              placeholder="Nhập tên hồ sơ..."
                            />
                          </Field>
                          <Field label="Tổng giá trị hợp đồng (VNĐ)" htmlFor="ct-koc-total">
                            <Input
                              id="ct-koc-total"
                              inputMode="numeric"
                              className="tabular-nums"
                              value={customContractValue}
                              onChange={e => setCustomContractValue(formatMoneyInput(e.target.value))}
                              placeholder="Giá trị ghi trên hợp đồng KOC"
                            />
                          </Field>
                        </div>
                      </div>
                    </Panel>
                  ) : (
                    <Panel title="Bước 2 · Nội dung hợp đồng">
                      <div className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          {!isKocOwnForm && (
                            <Field label="Mẫu hợp đồng" htmlFor="ct-template">
                              <div
                                id="ct-template"
                                className="h-9 px-3 rounded-lg border border-line bg-sunken/70 flex items-center text-xs"
                              >
                                <span className="font-semibold text-ink truncate">{template?.name || templateId}</span>
                              </div>
                            </Field>
                          )}
                          {usesTemplateFields && template ? (
                            renderSignDateInline()
                          ) : (
                            <Field label="Tên hồ sơ *" htmlFor="ct-title">
                              <Input
                                id="ct-title"
                                required
                                maxLength={180}
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Nhập tên hồ sơ..."
                              />
                            </Field>
                          )}
                        </div>

                        {usesTemplateFields && template && (
                          <Field label="Tên hồ sơ *" htmlFor="ct-title">
                            <Input
                              id="ct-title"
                              required
                              maxLength={180}
                              value={title}
                              onChange={e => setTitle(e.target.value)}
                              placeholder="Nhập tên hồ sơ..."
                            />
                          </Field>
                        )}

                        {isKocOwnForm && (
                          <>
                            <Field label="Tổng giá trị hợp đồng (VNĐ)" htmlFor="ct-koc-total">
                              <Input
                                id="ct-koc-total"
                                inputMode="numeric"
                                className="tabular-nums"
                                value={customContractValue}
                                onChange={e => setCustomContractValue(formatMoneyInput(e.target.value))}
                                placeholder="Nhập giá trị ghi trên hợp đồng KOC..."
                              />
                            </Field>

                            <div className="rounded-xl border-2 border-dashed border-accent/40 bg-accent-soft/20 p-4 space-y-3">
                              <input
                                ref={kocDocxInputRef}
                                type="file"
                                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                onChange={handleKocDocxSelect}
                                className="hidden"
                              />
                              {customFile ? (
                                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface border border-line px-4 py-3 text-xs">
                                  <span className="font-semibold text-ink truncate">{customFile.filename}</span>
                                  <Button size="sm" variant="secondary" icon={FileUp} onClick={() => kocDocxInputRef.current?.click()}>
                                    Đổi file .docx khác
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <span className="font-semibold text-ink text-xs">Tải file hợp đồng của KOC (.docx)</span>
                                  <Button size="sm" variant="primary" icon={Upload} onClick={() => kocDocxInputRef.current?.click()}>
                                    Chọn file .docx của KOC
                                  </Button>
                                </div>
                              )}
                            </div>
                          </>
                        )}

                        {koc && getKocConnectedChannels(koc).length > 0 && (
                          <div className="p-3 rounded-xl border border-line bg-sunken/40 space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-2xs font-semibold text-ink">
                                Kênh mạng xã hội của KOC ({getKocConnectedChannels(koc).length} kênh)
                              </span>
                              {getKocConnectedChannels(koc).length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const channelField = fields.find(f => f.source === 'channelLink');
                                    if (!channelField) return;
                                    const allUrls = getKocConnectedChannels(koc)
                                      .map(
                                        c =>
                                          c.url ||
                                          (c.platform === 'TIKTOK'
                                            ? `https://www.tiktok.com/@${c.handle}`
                                            : c.handle),
                                      )
                                      .join(' ; ');
                                    setValue(channelField, allUrls);
                                  }}
                                  className="text-2xs font-medium text-accent hover:underline"
                                >
                                  Chọn tất cả kênh
                                </button>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {getKocConnectedChannels(koc).map(ch => {
                                const chUrl =
                                  ch.url ||
                                  (ch.platform === 'TIKTOK'
                                    ? `https://www.tiktok.com/@${ch.handle}`
                                    : ch.handle);
                                const channelField = fields.find(f => f.source === 'channelLink');
                                const curLinkVal = channelField ? values[channelField.key] || '' : '';
                                const isIncluded =
                                  curLinkVal.toLowerCase().includes(ch.handle.toLowerCase()) ||
                                  (!curLinkVal && ch.isPrimary);
                                return (
                                  <button
                                    key={`${ch.platform}::${ch.handle}`}
                                    type="button"
                                    onClick={() => {
                                      if (!channelField) return;
                                      const parts = curLinkVal
                                        .split(/\s*[,;\n]\s*/)
                                        .map(s => s.trim())
                                        .filter(Boolean);
                                      const existsIdx = parts.findIndex(p =>
                                        p.toLowerCase().includes(ch.handle.toLowerCase()),
                                      );
                                      let nextParts: string[];
                                      if (existsIdx >= 0) {
                                        nextParts =
                                          parts.length > 1
                                            ? parts.filter((_, idx) => idx !== existsIdx)
                                            : parts;
                                      } else {
                                        nextParts = [...parts, chUrl];
                                      }
                                      setValue(channelField, nextParts.join(' ; '));
                                    }}
                                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg border text-2xs font-code transition-colors ${
                                      isIncluded
                                        ? 'border-primary bg-surface text-ink font-semibold'
                                        : 'border-line bg-canvas text-ink-2 hover:border-line-strong'
                                    }`}
                                    title="Bấm để thêm/bớt kênh này vào ô Link kênh trên hợp đồng"
                                  >
                                    <span>{KOC_PLATFORM_LABEL[ch.platform]}:</span>
                                    <span>@{ch.handle}</span>
                                    {ch.platform === 'TIKTOK' && !ch.isPrimary && (
                                      <span className="font-sans text-ink-3">({ch.roleLabel || 'Kênh phụ'})</span>
                                    )}
                                    {ch.platform === 'TIKTOK' && ch.isPrimary && (
                                      <span className="font-sans text-positive">(Kênh chính)</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {usesTemplateFields && template && kind === 'CONTRACT' && !isSow && !isHdnt && templateId !== 'CTV-HDNT' && (
                          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-line bg-sunken/30 text-xs">
                            <span className="font-medium text-ink">Phương thức thanh toán:</span>
                            <Segmented
                              value={paymentScheduleOption}
                              onChange={v => selectPaymentScheduleOption(v as PaymentScheduleOption)}
                              items={[
                                { key: 'ONE_TIME', label: 'Thanh toán 1 lần (100%)' },
                                { key: 'TWO_TIMES', label: 'Thanh toán 2 lần (Tạm ứng + Tất toán)' },
                              ]}
                            />
                          </div>
                        )}

                        {/* Nếu còn mục bắt buộc chưa điền và đang thu gọn trường chi tiết, chỉ hiển thị đúng các ô còn thiếu */}
                        {usesTemplateFields && template && !showAllTemplateFields && missingRequiredFields.length > 0 && (
                          <div className="p-3.5 rounded-xl border border-warning/40 bg-warning-soft/20 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-ink">
                                Cần bổ sung thông tin bắt buộc ({missingRequiredFields.length} mục)
                              </span>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              {missingRequiredFields.map(f => {
                                const id = `ct-f-${f.key}`;
                                const label = `${f.title || f.label} *`;
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
                          </div>
                        )}

                        {/* Thanh điều khiển trường biểu mẫu gọn gàng */}
                        {usesTemplateFields && template && (
                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-sunken/40 px-3 py-2 text-xs">
                            <div className="flex items-center gap-2">
                              <Status tone={requiredDone === required.length ? 'positive' : 'warning'}>
                                Đã điền {requiredDone}/{required.length} mục bắt buộc
                              </Status>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Button size="sm" variant="ghost" onClick={refreshSystemPrefill}>
                                Đồng bộ lại từ KOC
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setShowAllTemplateFields(v => !v)}
                              >
                                {showAllTemplateFields
                                  ? 'Thu gọn các trường biểu mẫu'
                                  : `Xem / sửa toàn bộ trường (${uiTotalFieldsCount})`}
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Ghi chú nội bộ tích hợp gọn ngay cuối Bước 2 cho hợp đồng chuẩn */}
                        {!(hasCustomTerms || isKocForm || isAmendedGoogleDoc) && (
                          <div className="pt-1">
                            {showNotesField || Boolean(internalNotes.trim()) ? (
                              <Field label="Ghi chú nội bộ" htmlFor="ct-notes">
                                <Textarea
                                  id="ct-notes"
                                  rows={2}
                                  value={internalNotes}
                                  onChange={e => setInternalNotes(e.target.value)}
                                  placeholder="Ghi chú trao đổi nội bộ..."
                                />
                              </Field>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setShowNotesField(true)}
                                className="text-xs font-medium text-accent hover:underline"
                              >
                                + Thêm ghi chú nội bộ
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </Panel>
                  )}

                  {(kind === 'ACCEPTANCE' || isSow) && (
                    <Panel
                      title={
                        isSow
                          ? `Bảng công việc & Thanh toán Phụ lục SOW (${draftJobTables.length} Job)`
                          : `Nghiệm thu theo Bảng công việc (${draftJobTables.length} Job)`
                      }
                      actions={
                        <div className="flex flex-wrap items-center gap-2">
                          {isSow && (
                            <>
                              {availableDealsToAdd.length > 0 && (
                                <select
                                  className="text-xs py-1.5 px-3 rounded-lg border border-line bg-surface text-ink font-medium focus:ring-1 focus:ring-accent cursor-pointer"
                                  value=""
                                  onChange={e => {
                                    const d = availableDealsToAdd.find(x => x.id === e.target.value);
                                    if (d) addDealToSow(d);
                                  }}
                                >
                                  <option value="">+ Thêm Job từ kế hoạch KOC ({availableDealsToAdd.length})...</option>
                                  {availableDealsToAdd.map(d => (
                                    <option key={d.id} value={d.id}>
                                      {d.dealCode} · {d.brandName} — {d.productName || 'Sản phẩm'} ({formatNumber(d.totalValue || 0)}đ)
                                    </option>
                                  ))}
                                </select>
                              )}
                              <Button size="sm" variant="secondary" onClick={createNewBlankJob}>
                                + Tạo Job mới
                              </Button>
                            </>
                          )}
                        </div>
                      }
                    >
                      <div className="space-y-4 text-xs">
                        {/* Bảng danh sách tất cả các Job trong Phụ lục */}
                        <div className="border border-line rounded-lg bg-surface overflow-hidden">
                          <DataTable<SowJobTableDraft & { _rowIdx: number }>
                            rows={draftJobTables.map((jTab, jIdx) => ({ ...jTab, _rowIdx: jIdx }))}
                            rowKey={r => `${r.id || r.jobCode}-${r._rowIdx}`}
                            onRowClick={r => {
                              const jIdx = r._rowIdx;
                              setActiveJobTableIdx(jIdx);
                              setDraftVideoFee(r.videoFeeNetVnd);
                              setDraftAddons(r.addonItems);
                              setDraftProductName(r.productName);
                              setDraftAirDate(r.airDate);
                              setIsJobDetailExpanded(true);
                            }}
                            columns={
                              [
                                {
                                  key: 'idx',
                                  header: '#',
                                  width: 44,
                                  align: 'center',
                                  render: r => (
                                    <span className="text-ink-3 font-code">{r._rowIdx + 1}</span>
                                  ),
                                },
                                {
                                  key: 'jobCode',
                                  header: 'Mã Job',
                                  width: 130,
                                  render: r => (
                                    <span className="font-code font-semibold text-ink">{r.jobCode}</span>
                                  ),
                                },
                                {
                                  key: 'productName',
                                  header: 'Sản phẩm / Dịch vụ',
                                  width: 200,
                                  render: r => (
                                    <div className="font-medium text-ink truncate max-w-[200px]">
                                      {r.productName || 'Sản phẩm chiến dịch'}
                                    </div>
                                  ),
                                },
                                {
                                  key: 'mediaChannel',
                                  header: 'Kênh',
                                  width: 90,
                                  render: r => (
                                    <span className="px-2 py-0.5 rounded bg-sunken border border-line text-2xs text-ink-2">
                                      {r.mediaChannel || 'TikTok'}
                                    </span>
                                  ),
                                },
                                {
                                  key: 'airDate',
                                  header: 'Ngày Air',
                                  width: 100,
                                  render: r => (
                                    <span className="font-code text-ink-2">{r.airDate || '—'}</span>
                                  ),
                                },
                                {
                                  key: 'videoFee',
                                  header: 'Thù lao Video',
                                  width: 120,
                                  align: 'right',
                                  render: r => {
                                    const qty = Math.max(1, Number(r.quantity) || 1);
                                    const jVideoNet = Math.max(0, Number(r.videoFeeNetVnd) || 0) * qty;
                                    return (
                                      <span className="font-code font-medium text-ink">
                                        {formatNumber(jVideoNet)}đ
                                      </span>
                                    );
                                  },
                                },
                                {
                                  key: 'addons',
                                  header: 'Dịch vụ đi kèm',
                                  width: 160,
                                  render: r => {
                                    const activeAddons = (r.addonItems || []).filter(
                                      a => a.includedInSow !== false && a.acceptanceStatus !== 'DROPPED',
                                    );
                                    return (
                                      <div className="flex flex-wrap items-center gap-1">
                                        {activeAddons.length === 0 ? (
                                          <span className="text-2xs text-ink-3">Chỉ video</span>
                                        ) : (
                                          activeAddons.map(a => (
                                            <span
                                              key={a.id || a.termType}
                                              className="px-2 py-0.5 rounded bg-surface border border-line text-2xs text-ink-2"
                                            >
                                              {a.termType === 'ADS_CODE'
                                                ? 'Spark Ads'
                                                : a.termType === 'LINK_BIO_CART'
                                                  ? 'Giỏ hàng'
                                                  : a.termType === 'IMAGE_USAGE'
                                                    ? 'Hình ảnh'
                                                    : 'Độc quyền'}
                                            </span>
                                          ))
                                        )}
                                      </div>
                                    );
                                  },
                                },
                                {
                                  key: 'subtotal',
                                  header: 'Tổng Net',
                                  width: 120,
                                  align: 'right',
                                  render: r => {
                                    const qty = Math.max(1, Number(r.quantity) || 1);
                                    const jVideoNet = Math.max(0, Number(r.videoFeeNetVnd) || 0) * qty;
                                    const activeAddons = (r.addonItems || []).filter(
                                      a => a.includedInSow !== false && a.acceptanceStatus !== 'DROPPED',
                                    );
                                    const jAddonsNet = activeAddons.reduce(
                                      (s, a) => s + (Number(a.allocatedCostVnd) || 0),
                                      0,
                                    );
                                    return (
                                      <span className="font-code font-semibold text-accent">
                                        {formatNumber(jVideoNet + jAddonsNet)}đ
                                      </span>
                                    );
                                  },
                                },
                                {
                                  key: 'actions',
                                  header: 'Thao tác',
                                  width: 100,
                                  align: 'right',
                                  render: r => {
                                    const jIdx = r._rowIdx;
                                    const isSelected = jIdx === activeJobTableIdx && isJobDetailExpanded;
                                    return (
                                      <div
                                        className="flex items-center justify-end gap-1"
                                        onClick={e => e.stopPropagation()}
                                      >
                                        <Button
                                          size="sm"
                                          variant={isSelected ? 'primary' : 'secondary'}
                                          onClick={() => {
                                            if (isSelected) {
                                              setIsJobDetailExpanded(false);
                                            } else {
                                              setActiveJobTableIdx(jIdx);
                                              setDraftVideoFee(r.videoFeeNetVnd);
                                              setDraftAddons(r.addonItems);
                                              setDraftProductName(r.productName);
                                              setDraftAirDate(r.airDate);
                                              setIsJobDetailExpanded(true);
                                            }
                                          }}
                                        >
                                          {isSelected ? 'Đóng' : 'Sửa'}
                                        </Button>
                                        {draftJobTables.length > 1 && (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            icon={Trash2}
                                            onClick={() => removeJobFromSow(jIdx)}
                                            title="Xóa Job này khỏi Phụ lục SOW"
                                          />
                                        )}
                                      </div>
                                    );
                                  },
                                },
                              ] satisfies Column<SowJobTableDraft & { _rowIdx: number }>[]
                            }
                          />
                        </div>

                        {/* Khối chỉnh sửa chi tiết cho Job đang chọn (chỉ mở khi bấm Sửa) */}
                        {isJobDetailExpanded && (
                          <div className="p-4 rounded-lg border border-accent/40 bg-surface space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-accent text-white font-code text-2xs font-semibold">
                                  Bảng công việc #{activeJobTableIdx + 1}
                                </span>
                                <span className="font-semibold text-ink text-xs">
                                  Chi tiết đầu việc: {draftJobTables[activeJobTableIdx]?.jobCode}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {draftJobTables[activeJobTableIdx]?.videoUrl ? (
                                  <Status tone="positive">Đã gắn Link Air</Status>
                                ) : (
                                  <Status tone="neutral">{isSow ? 'Chưa Air' : 'Chờ Link Air'}</Status>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setIsJobDetailExpanded(false)}
                                >
                                  Thu gọn
                                </Button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                              <Field label="Tên sản phẩm / Chiến dịch *">
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
                                  placeholder="Nhập tên sản phẩm..."
                                />
                              </Field>

                              <Field label="Kênh đăng tải *">
                                <Select
                                  value={draftJobTables[activeJobTableIdx]?.mediaChannel || 'TikTok'}
                                  onChange={e => {
                                    const nextChan = e.target.value;
                                    const updatedJobs = draftJobTables.map((job, idx) =>
                                      idx === activeJobTableIdx ? { ...job, mediaChannel: nextChan } : job,
                                    );
                                    applyMultiJobTablesToDraftValues(updatedJobs, activeJobTableIdx);
                                  }}
                                >
                                  <option value="TikTok">TikTok</option>
                                  <option value="Facebook">Facebook</option>
                                  <option value="Instagram">Instagram</option>
                                  <option value="Shopee Video">Shopee Video</option>
                                  <option value="YouTube">YouTube</option>
                                </Select>
                              </Field>

                              <Field label={isSow ? 'Ngày dự kiến đăng (Air Date)' : 'Ngày đăng tải thực tế'}>
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
                              </Field>

                              <Field label="Thù lao Video Task #1 (VNĐ - Net)">
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

                            <div className="pt-3 border-t border-line space-y-2">
                              <span className="font-semibold text-2xs text-ink-2">
                                Dịch vụ bổ sung đi kèm theo Job này
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                {draftAddons.slice(0, 4).map((addon, aIdx) => {
                                  const isInc = addon.includedInSow !== false;
                                  return (
                                    <div
                                      key={addon.id || aIdx}
                                      className={`p-3 rounded-lg border transition-colors ${
                                        isInc ? 'border-accent bg-accent-soft/20' : 'border-line bg-sunken/30 opacity-70'
                                      }`}
                                    >
                                      <label className="flex items-start gap-2 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={isInc}
                                          onChange={e => {
                                            const checked = e.target.checked;
                                            const nextList = draftAddons.map((a, i) =>
                                              i === aIdx ? { ...a, includedInSow: checked } : a,
                                            );
                                            applyJobBreakdownToDraftValues(draftVideoFee, nextList);
                                          }}
                                          className="mt-0.5 rounded border-line text-accent focus:ring-accent"
                                        />
                                        <div className="space-y-1 min-w-0">
                                          <span className="font-semibold text-ink text-xs block leading-tight">
                                            {addon.termLabel}
                                          </span>
                                          <div className="flex items-center gap-2 text-2xs text-ink-3">
                                            <span>Thời hạn:</span>
                                            <input
                                              type="number"
                                              min={1}
                                              disabled={!isInc}
                                              value={addon.durationDays}
                                              onChange={e => {
                                                const days = Math.max(1, Number(e.target.value) || 30);
                                                const nextList = draftAddons.map((a, i) =>
                                                  i === aIdx ? { ...a, durationDays: days } : a,
                                                );
                                                applyJobBreakdownToDraftValues(draftVideoFee, nextList);
                                              }}
                                              className="w-12 px-1 py-0.5 text-right font-code border border-line rounded bg-surface text-ink text-2xs disabled:opacity-50"
                                            />
                                            <span>ngày</span>
                                          </div>
                                          {isInc && (
                                            <div className="flex items-center gap-1 text-2xs text-ink-3">
                                              <span>Phí:</span>
                                              <input
                                                type="text"
                                                value={formatMoneyInput(String(addon.allocatedCostVnd || 0))}
                                                onChange={e => {
                                                  const cost = Number(e.target.value.replace(/\D/g, '')) || 0;
                                                  const nextList = draftAddons.map((a, i) =>
                                                    i === aIdx ? { ...a, allocatedCostVnd: cost } : a,
                                                  );
                                                  applyJobBreakdownToDraftValues(draftVideoFee, nextList);
                                                }}
                                                placeholder="0đ"
                                                className="w-20 px-1 py-0.5 text-right font-code border border-line rounded bg-surface text-ink text-2xs"
                                              />
                                              <span>đ</span>
                                            </div>
                                          )}
                                        </div>
                                      </label>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Mục 1.3: Phương án thanh toán phí dịch vụ */}
                        {isSow && (
                          <div className="p-3.5 rounded-lg border border-line bg-surface space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-semibold text-ink text-xs">
                                Phương án thanh toán
                              </span>
                              <Segmented
                                value={paymentScheduleOption === 'TWO_TIMES' ? 'TWO_TIMES' : 'ONE_TIME'}
                                onChange={v => selectPaymentScheduleOption(v as PaymentScheduleOption)}
                                items={[
                                  { key: 'ONE_TIME', label: 'Thanh toán 1 lần (100%)' },
                                  { key: 'TWO_TIMES', label: 'Thanh toán 2 lần (Tạm ứng + Tất toán)' },
                                ]}
                              />
                            </div>

                            {paymentScheduleOption === 'TWO_TIMES' && (
                              <div className="p-3 rounded-lg border border-line bg-sunken/30 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                <div className="md:col-span-5">
                                  <Field label="Số tiền tạm ứng Lần 1 (VNĐ - Net)">
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
                                        setValues(prev => ({ ...prev, [PAYMENT_SCHEDULE_META_KEY]: 'TWO_TIMES' }));
                                      }}
                                    />
                                  </Field>
                                </div>

                                <div className="md:col-span-7 flex flex-wrap items-center gap-2">
                                  <span className="text-2xs text-ink-3">Chọn nhanh:</span>
                                  {[
                                    {
                                      label: 'Tạm ứng 30%',
                                      val: Math.round((jobAcceptanceBreakdown.financials.plannedTotalNet || 0) * 0.3),
                                    },
                                    {
                                      label: 'Tạm ứng 50%',
                                      val: Math.round((jobAcceptanceBreakdown.financials.plannedTotalNet || 0) * 0.5),
                                    },
                                    {
                                      label: 'Tối đa 2tr',
                                      val: Math.min(2_000_000, Math.round((jobAcceptanceBreakdown.financials.plannedTotalNet || 0) * 0.5)),
                                    },
                                  ].map(chip => (
                                    <button
                                      key={chip.label}
                                      type="button"
                                      onClick={() => {
                                        applyJobBreakdownToDraftValues(
                                          draftVideoFee,
                                          draftAddons,
                                          undefined,
                                          undefined,
                                          undefined,
                                          chip.val,
                                          draftProductName,
                                          draftAirDate,
                                        );
                                        setValues(prev => ({ ...prev, [PAYMENT_SCHEDULE_META_KEY]: 'TWO_TIMES' }));
                                      }}
                                      className="px-3 py-1 rounded-lg border border-line bg-surface hover:bg-sunken text-ink text-2xs font-medium transition"
                                    >
                                      {chip.label} ({formatNumber(chip.val)}đ)
                                    </button>
                                  ))}
                                </div>

                                <div className="md:col-span-12 text-2xs text-ink-2 font-code">
                                  Thanh toán Đợt 2 sau khi ký BBNT: <strong className="text-positive">{formatNumber(Math.max(0, (jobAcceptanceBreakdown.financials.plannedTotalNet || 0) - (draftAdvanceAmount || 0)))}đ</strong>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Tóm tắt quyết toán tài chính Phụ lục */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 rounded-lg border border-line bg-sunken/60 font-code text-xs">
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

                  {/* Các nhóm trường chi tiết của mẫu hợp đồng (Mặc định thu gọn, chỉ hiện khi bấm Xem/sửa toàn bộ trường) */}
                  {usesTemplateFields && template && showAllTemplateFields && (
                    <>
                      <div className="rounded-xl border border-line bg-surface p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <Segmented
                          value={fieldFilterMode}
                          onChange={v => setFieldFilterMode(v as 'ALL' | 'NEEDS_ATTENTION')}
                          items={[
                            { key: 'ALL', label: `Tất cả trường (${uiTotalFieldsCount})` },
                            { key: 'NEEDS_ATTENTION', label: `Cần kiểm tra / Chỉnh tay (${needsAttentionCount})` },
                          ]}
                        />
                        <Button size="sm" variant="ghost" onClick={() => setShowAllTemplateFields(false)}>
                          Ẩn trường chi tiết
                        </Button>
                      </div>

                      {groups
                        .filter(g => g.key !== 'DATE')
                        .map(g => {
                          const visibleFields =
                            fieldFilterMode === 'NEEDS_ATTENTION'
                              ? g.fields.filter(isFieldNeedsAttention)
                              : g.fields;
                          if (visibleFields.length === 0) return null;

                          return (
                            <Panel key={g.key} title={g.title}>
                              <div className="grid gap-4 md:grid-cols-2">
                                {visibleFields.map(f => {
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
                          );
                        })}
                    </>
                  )}

                  {(hasCustomTerms || isKocForm || isAmendedGoogleDoc) && (
                    <Panel
                      title={isKocForm ? 'Bước 3 · Ghi chú cho Pháp chế' : 'Bước 3 · Bản đã chỉnh sửa'}
                    >
                      <div className="space-y-3">
                        {isAmendedGoogleDoc && renderGoogleDocLink()}
                        <div className="grid gap-3 md:grid-cols-2">
                          <Field
                            label={isKocForm ? 'Điểm cần lưu ý trong mẫu KOC *' : 'Điều khoản sửa đổi / bổ sung *'}
                            htmlFor="ct-custom-terms"
                          >
                            <Textarea
                              id="ct-custom-terms"
                              rows={2}
                              value={customTermsSummary}
                              onChange={e => setCustomTermsSummary(e.target.value)}
                              placeholder={isKocForm ? 'Tóm tắt điều khoản thanh toán, phạt, bản quyền...' : 'Ghi rõ điều khoản cần sửa đổi hoặc bổ sung...'}
                            />
                          </Field>
                          <Field label="Ghi chú nội bộ" htmlFor="ct-notes">
                            <Textarea
                              id="ct-notes"
                              rows={2}
                              value={internalNotes}
                              onChange={e => setInternalNotes(e.target.value)}
                              placeholder="Ghi chú trao đổi nội bộ..."
                            />
                          </Field>
                        </div>
                      </div>
                    </Panel>
                  )}

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
                              <div className="p-3 rounded-xl border border-line bg-sunken/60 space-y-2 text-xs">
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
                              <div className="p-3 rounded-xl border border-dashed border-line bg-sunken/40 text-xs text-ink-2">
                                Chưa có thông tin Link Air và ảnh nghiệm thu.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {acceptanceScreenshots.map((shot, idx) => (
                                  <div
                                    key={shot.id || idx}
                                    className="flex items-start gap-3 p-3 rounded-xl border border-line bg-sunken/50"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={shot.imageDataUrl}
                                      alt={shot.note || shot.timeLabel}
                                      className="w-16 h-24 rounded-lg object-cover border border-line bg-black shrink-0"
                                    />
                                    <div className="min-w-0 flex-1 space-y-1">
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="px-2 py-0.5 rounded bg-positive-soft text-positive font-code text-2xs font-semibold">
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

                  {template && (
                    <div className="flex justify-end gap-2 pt-1">
                      <Button variant="ghost" onClick={onCancel}>Hủy</Button>
                      <Button variant="primary" type="submit" disabled={!canSubmitForm}>
                        {editing
                          ? 'Lưu phiên bản mới'
                          : isKocGoogleDoc || isAmendedGoogleDoc
                            ? 'Lưu & trình draft'
                            : isSow
                              ? 'Lưu Phụ lục SOW & Chuyển bước ký'
                              : 'Lưu nháp'}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>

            {showRightPreview && template && (
              <div className="xl:sticky xl:top-16 min-w-0">
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
                  maxHeight="calc(100dvh - 192px)"
                  compactToolbar
                  isTemplatePreview={isKocOwnForm}
                  acceptanceScreenshots={acceptanceScreenshots}
                />
              </div>
            )}
          </div>
        );
      })()}

      <Modal
        open={ocrOpen}
        onClose={() => setOcrOpen(false)}
        title="Tải CCCD / Giấy phép ĐKKD"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOcrOpen(false)}>Đóng</Button>
          </div>
        }
      >
        <LegalAttachmentsPanel
          attachments={legalAttachments}
          onChange={nextAttachments => {
            setLegalAttachments(nextAttachments);
            if (koc?.id) {
              const targetProfId = activeLegalProfile?.id || selectedLegalProfileId || 'default';
              saveSyncedKocLegalAttachments(koc.id, targetProfId, nextAttachments);
              onSyncKocLegalAttachments?.(koc.id, targetProfId, nextAttachments);
            }
          }}
          entitySlug={koc?.channelId || koc?.id || partner || 'koc-legal'}
          legalType={activeLegalProfile?.legalType || 'INDIVIDUAL'}
          editable
          onExtractOcrFields={(extracted, docLabel) => applyOcrFields(extracted, docLabel)}
          title="Giấy tờ pháp lý (CCCD / ĐKKD)"
        />
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
