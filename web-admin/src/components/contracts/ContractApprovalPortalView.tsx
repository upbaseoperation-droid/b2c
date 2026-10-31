'use client';

import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Send,
} from 'lucide-react';
import type { BookingDealItem, KocItem, LegalDocAttachment } from '../../lib/types';
import type { ContractRecord, FieldSource, ReviewStep } from '../../lib/contracts/types';
import { OFFICIAL_TEMPLATES_SNAPSHOT } from '../../lib/contracts/builtInTemplatesSnapshot';
import { resolvePaymentScheduleOption } from '../../lib/contracts/contractRules';
import {
  evaluateLegalProfileSigningHistory,
  resolveContractLegalAttachments,
  type LegalProfileSigningHistorySummary,
} from '../../lib/contracts/legalProfileHistory';
import { formatVnd } from '../../lib/format';
import { documentOfTemplate } from '../../lib/planDealLink';
import {
  LegalAttachmentsPanel,
  LegalDocPreviewModal,
  LegalProfileSigningHistoryBanner,
} from './LegalAttachmentsPanel';
import { ClauseDiffList } from './GoogleDocsReviewPanel';
import {
  Button,
  Chips,
  ConfirmDialog,
  DataTable,
  EmptyState,
  Field,
  FilterBar,
  Modal,
  Pagination,
  Panel,
  Segmented,
  Stat,
  StatRow,
  Status,
  Textarea,
} from '../ui';
import type { Column, StatusTone } from '../ui';
import { contractApi, type ContractBootstrap } from './api';
import { FinanceAdvancePaymentReportView } from './FinanceAdvancePaymentReportView';
import { FinanceReminderInboxView } from './FinanceReminderInboxView';
import { GoogleDocsFinanceApproveDialog } from './GoogleDocsFinanceApproveDialog';
import { ContractDocumentViewer } from './ContractDocumentViewer';
import { isAcceptance, resolveActiveLegalProfile } from './contractUi';

export type ApprovalPortalMode = 'LEGAL_PORTAL' | 'FINANCE_PORTAL';

type LegalFilter = 'PENDING_LEGAL' | 'CLAUSE_DIFF' | 'KOC_OWN_FORM' | 'LEGAL_APPROVED' | 'ALL';
type FinanceFilter =
  | 'PENDING_FINANCE'
  | 'VERIFIED_PROFILE'
  | 'GDOCS_FINAL'
  | 'BBNT_SETTLEMENT'
  | 'BUDGET_ALERT'
  | 'FINANCE_APPROVED'
  | 'ALL';

function parseVndNumber(raw?: string | number | null): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? Math.round(raw) : 0;
  if (!raw || typeof raw !== 'string') return 0;
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return 0;
  const val = Number(digits);
  return Number.isFinite(val) ? Math.round(val) : 0;
}

/** Che mờ số nhạy cảm (CCCD, STK, SĐT) chỉ hiển thị 4 số cuối theo quy tắc Bảo mật dữ liệu B2C */
export function maskSensitiveNumber(raw?: string | null, reveal = false): string {
  if (!raw || !raw.trim()) return 'Chưa cập nhật';
  const cleaned = raw.trim();
  const digits = cleaned.replace(/\D/g, '');
  if (reveal) return digits || cleaned;
  if (digits.length >= 4) {
    return `****${digits.slice(-4)}`;
  }
  return '****';
}

export interface ExtractedFinancialSummary {
  grossAmount: number;
  taxAmount: number;
  netAmount: number;
  advanceAmount: number;
  remainingAmount: number;
  dealBudget: number;
  isOverDealBudget: boolean;
  isUnbudgetedSpend: boolean;
  taxLabel: string;
  bankAccount: string;
  bankName: string;
  cccdOrTaxCode: string;
  phone: string;
  missingBankInfo: boolean;
}

function findValueByFieldSource(
  record: ContractRecord,
  ...sources: (FieldSource | string)[]
): string {
  const v = record.values || {};
  const snap = OFFICIAL_TEMPLATES_SNAPSHOT[record.templateId];
  if (!snap?.fields) return '';
  for (const src of sources) {
    for (const f of snap.fields) {
      if (f.source === src && v[f.key]?.trim()) {
        return v[f.key].trim();
      }
    }
  }
  return '';
}

export function extractContractFinancials(
  record: ContractRecord,
  deal?: BookingDealItem,
  koc?: KocItem,
): ExtractedFinancialSummary {
  const v = record.values || {};
  const snap = OFFICIAL_TEMPLATES_SNAPSHOT[record.templateId];
  const grossFromValues =
    parseVndNumber(v['src:grossAmount']) ||
    parseVndNumber(findValueByFieldSource(record, 'grossTotal', 'subtotal', 'videoFee')) ||
    parseVndNumber(v['word/document.xml:p190:cell']) ||
    parseVndNumber(v['word/document.xml:p168:cell']) ||
    parseVndNumber(v['word/document.xml:p166:cell']) ||
    parseVndNumber(v['TONG_GIA_TRI']) ||
    parseVndNumber(v['GIA_TRI_HOP_DONG']);

  const dealBudget = Math.round(deal?.totalValue || 0);
  const grossAmount = grossFromValues > 0 ? grossFromValues : dealBudget;

  const isCompany = record.templateId.startsWith('COM-');
  const isHousehold = record.templateId.startsWith('HKD-');

  const explicitTax =
    parseVndNumber(v['src:pitTax']) ||
    parseVndNumber(findValueByFieldSource(record, 'pitAmount', 'vatAmount')) ||
    parseVndNumber(v['word/document.xml:p188:cell']);
  const explicitNet =
    parseVndNumber(v['src:netAmount']) ||
    parseVndNumber(findValueByFieldSource(record, 'netTotal')) ||
    parseVndNumber(v['word/document.xml:p186:cell']);

  let taxAmount = explicitTax;
  let netAmount = explicitNet;
  let taxLabel = 'Thuế TNCN 10%';

  if (isCompany) {
    taxLabel = 'Thuế VAT';
    if (!taxAmount && grossAmount > 0) {
      taxAmount = Math.round(grossAmount * 0.08);
    }
    if (!netAmount && grossAmount > 0) {
      netAmount = grossAmount;
    }
  } else if (isHousehold) {
    taxLabel = 'Thuế HKD';
    if (!netAmount && grossAmount > 0) {
      netAmount = grossAmount - taxAmount;
    }
  } else {
    if (!taxAmount && grossAmount >= 2_000_000) {
      taxAmount = Math.round(grossAmount * 0.1);
    }
    if (!netAmount && grossAmount > 0) {
      netAmount = Math.max(0, grossAmount - taxAmount);
    }
  }

  const payOption = resolvePaymentScheduleOption(v, record.templateId, snap?.fields);
  const explicitAdvance =
    parseVndNumber(v['sowAdvanceAmount']) ||
    parseVndNumber(findValueByFieldSource(record, 'advanceAmount')) ||
    parseVndNumber(v['word/document.xml:p208:14']);
  const advanceAmount =
    payOption === 'ONE_TIME'
      ? 0
      : explicitAdvance > 0
        ? explicitAdvance
        : payOption === 'TWO_TIMES'
          ? Math.round(netAmount * 0.5)
          : 0;
  const remainingAmount = Math.max(0, netAmount - advanceAmount);

  const activeProfile = resolveActiveLegalProfile(
    koc,
    deal,
    record.legalProfileId || v['LEGAL_PROFILE_ID'],
  );
  const bankAccount =
    v['src:bankAccount'] ||
    findValueByFieldSource(record, 'bankAccountNumber') ||
    v['SO_TAI_KHOAN'] ||
    activeProfile?.bankAccountNumber ||
    koc?.bankAccount ||
    '';
  const bankName =
    v['src:bankName'] ||
    findValueByFieldSource(record, 'bankName') ||
    v['NGAN_HANG'] ||
    activeProfile?.bankName ||
    koc?.bankName ||
    '';
  const cccdOrTaxCode =
    v['src:cccd'] ||
    v['src:taxCode'] ||
    findValueByFieldSource(record, 'cccd', 'taxCode', 'businessLicenseNo') ||
    v['word/document.xml:p39:cell'] ||
    activeProfile?.cccd ||
    activeProfile?.taxCode ||
    koc?.cccd ||
    koc?.taxCode ||
    '';
  const phone =
    v['src:phone'] ||
    findValueByFieldSource(record, 'phone') ||
    v['word/document.xml:p45:cell'] ||
    activeProfile?.contactPhone ||
    koc?.phone ||
    '';

  const isOverDealBudget = dealBudget > 0 && grossAmount > dealBudget;
  const isUnbudgetedSpend =
    (Boolean(record.dealId || record.dealCode) && !deal && grossAmount > 0) ||
    (deal !== undefined && dealBudget === 0 && grossAmount > 0);
  const missingBankInfo = !bankAccount.trim();

  return {
    grossAmount,
    taxAmount,
    netAmount,
    advanceAmount,
    remainingAmount,
    dealBudget,
    isOverDealBudget,
    isUnbudgetedSpend,
    taxLabel,
    bankAccount,
    bankName,
    cccdOrTaxCode,
    phone,
    missingBankInfo,
  };
}

export function ContractApprovalPortalView({
  mode,
  initialFinanceSection = 'CONTRACT_REVIEW',
  initialDealLookupQuery = '',
  data,
  deals = [],
  kocs = [],
  busy,
  onOpenRecord,
  onQuickViewRecord,
  onOpenDealLookup,
  onRefresh,
  onNotify,
}: {
  mode: ApprovalPortalMode;
  initialFinanceSection?: 'CONTRACT_REVIEW' | 'ADVANCE_PAYMENT_REPORT' | 'FINANCE_REMINDERS';
  initialDealLookupQuery?: string;
  data: ContractBootstrap;
  deals?: BookingDealItem[];
  kocs?: KocItem[];
  busy: boolean;
  onOpenRecord: (id: string) => void;
  onQuickViewRecord: (record: ContractRecord) => void;
  onOpenDealLookup?: (dealCode: string) => void;
  onRefresh: () => Promise<unknown>;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}) {
  const me = data.actor;
  const isFinanceActor = me.roles.includes('FINANCE');

  const [search, setSearch] = useState('');
  const [legalFilter, setLegalFilter] = useState<LegalFilter>('ALL');
  const [financeFilter, setFinanceFilter] = useState<FinanceFilter>('ALL');
  const [financeSection, setFinanceSection] = useState<
    'CONTRACT_REVIEW' | 'ADVANCE_PAYMENT_REPORT' | 'FINANCE_REMINDERS'
  >(initialFinanceSection);
  const [prevInitialFinanceSection, setPrevInitialFinanceSection] =
    useState(initialFinanceSection);
  if (initialFinanceSection !== prevInitialFinanceSection) {
    setPrevInitialFinanceSection(initialFinanceSection);
    setFinanceSection(initialFinanceSection);
  }
  const [page, setPage] = useState(1);
  const [revealSensitive, setRevealSensitive] = useState(false);
  const [dealLookupQuery, setDealLookupQuery] = useState(initialDealLookupQuery);
  const [prevInitialDealLookupQuery, setPrevInitialDealLookupQuery] =
    useState(initialDealLookupQuery);
  if (initialDealLookupQuery !== prevInitialDealLookupQuery) {
    setPrevInitialDealLookupQuery(initialDealLookupQuery);
    setDealLookupQuery(initialDealLookupQuery);
  }
  const [dealLookupSubTab, setDealLookupSubTab] = useState<'DEAL_LEDGER' | 'LARK_SLIPS'>(
    'DEAL_LEDGER',
  );

  // Hộp thoại đối soát & phê duyệt 2 cột
  const [inspectRecord, setInspectRecord] = useState<ContractRecord | null>(null);
  const [leftPaneTab, setLeftPaneTab] = useState<'DOCS' | 'CLAUSES' | 'PREVIEW'>('DOCS');
  const [rejectOrChangeModal, setRejectOrChangeModal] = useState<{
    record: ContractRecord;
    decision: 'CHANGES' | 'REJECTED';
  } | null>(null);
  const [gdocsFinanceRecord, setGdocsFinanceRecord] = useState<ContractRecord | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const [approveNote, setApproveNote] = useState('');
  const [saveAsKocTemplate, setSaveAsKocTemplate] = useState(true);
  const [kocLegalNotes, setKocLegalNotes] = useState('');
  const [quickPreviewState, setQuickPreviewState] = useState<{
    docs: LegalDocAttachment[];
    active: LegalDocAttachment;
    label?: string;
  } | null>(null);

  // Index O(1) cho Deals và KOCs theo RULE-PERF-01
  const dealMap = useMemo(() => {
    const map = new Map<string, BookingDealItem>();
    for (const d of deals) {
      map.set(d.id, d);
      if (d.dealCode) map.set(d.dealCode, d);
    }
    return map;
  }, [deals]);

  const kocMap = useMemo(() => {
    const map = new Map<string, KocItem>();
    for (const k of kocs) {
      map.set(k.id, k);
    }
    return map;
  }, [kocs]);

  const financialMap = useMemo(() => {
    const map = new Map<string, ExtractedFinancialSummary>();
    for (const r of data.records) {
      const deal =
        (r.dealId && dealMap.get(r.dealId)) ||
        (r.dealCode && dealMap.get(r.dealCode)) ||
        undefined;
      const koc =
        (r.kocId && kocMap.get(r.kocId)) ||
        (deal?.kocId && kocMap.get(deal.kocId)) ||
        undefined;
      map.set(r.id, extractContractFinancials(r, deal, koc));
    }
    return map;
  }, [data.records, dealMap, kocMap]);

  // Index O(1) đánh giá lịch sử ký hợp đồng theo Hồ sơ pháp lý của KOC (RULE-SYNC-01 & RULE-PERF-01)
  const signingHistoryMap = useMemo(() => {
    const map = new Map<string, LegalProfileSigningHistorySummary>();
    for (const r of data.records) {
      map.set(r.id, evaluateLegalProfileSigningHistory(r, data.records, dealMap, kocMap));
    }
    return map;
  }, [data.records, dealMap, kocMap]);

  const docsByRecordId = useMemo(() => {
    const map = new Map<string, LegalDocAttachment[]>();
    for (const r of data.records) {
      map.set(r.id, resolveContractLegalAttachments(r, dealMap, kocMap, data.records));
    }
    return map;
  }, [data.records, dealMap, kocMap]);

  const resolveRecordLegalAttachments = (r: ContractRecord): LegalDocAttachment[] => {
    return docsByRecordId.get(r.id) || [];
  };

  const openUnifiedInspectModal = (record: ContractRecord) => {
    const hist = signingHistoryMap.get(record.id);
    if (mode === 'LEGAL_PORTAL') {
      setApproveNote(
        'Pháp chế đã rà soát và đồng ý với các điều khoản sửa đổi / bổ sung trên hồ sơ.',
      );
      setSaveAsKocTemplate(Boolean(record.hasCustomTerms || record.isKocOwnForm));
      setKocLegalNotes(record.customTermsSummary || record.internalNotes || '');
      setLeftPaneTab(
        record.hasCustomTerms || (record.googleDocsReviewRouting?.clauseDiffs.length ?? 0) > 0
          ? 'CLAUSES'
          : 'DOCS',
      );
    } else {
      setApproveNote(
        hist?.recommendedFinanceNote ||
          'Đã kiểm tra khớp hạn mức Booking, thuế khấu trừ và thông tin tài khoản thụ hưởng.',
      );
      setLeftPaneTab('DOCS');
    }
    setInspectRecord(record);
  };

  const isPendingLegal = (r: ContractRecord) => {
    const legalStep = r.steps.find(s => s.role === 'LEGAL' && s.version === r.version);
    if (r.approval === 'IN_REVIEW' && legalStep?.status === 'PENDING') return true;
    if (
      r.approval === 'IN_REVIEW' &&
      (r.hasCustomTerms || r.isKocOwnForm || r.googleDocsReviewRouting?.requiresLegal) &&
      (!legalStep || legalStep.status === 'PENDING')
    ) {
      return true;
    }
    return false;
  };

  const isPendingFinance = (r: ContractRecord) => {
    const finStep = r.steps.find(s => s.role === 'FINANCE' && s.version === r.version);
    return r.approval === 'IN_REVIEW' && finStep?.status === 'PENDING';
  };

  const isGDocsPendingFinal = (r: ContractRecord) =>
    Boolean(r.googleDocsUrl);

  const isLegalApproved = (r: ContractRecord) =>
    r.steps.some(s => s.role === 'LEGAL' && s.status === 'APPROVED' && s.version === r.version) ||
    Boolean(r.googleDocsAuditTrail?.approvedByLegal);

  const isFinanceApproved = (r: ContractRecord) =>
    r.approval === 'APPROVED' ||
    r.steps.some(s => s.role === 'FINANCE' && s.status === 'APPROVED' && s.version === r.version);

  const isVerifiedLegalProfile = (r: ContractRecord) =>
    Boolean(signingHistoryMap.get(r.id)?.isSkipDeepCheckEligible);

  const hasBudgetOrBankAlert = (r: ContractRecord) => {
    const fin = financialMap.get(r.id);
    const hist = signingHistoryMap.get(r.id);
    return Boolean(
      (fin && (fin.isOverDealBudget || fin.isUnbudgetedSpend || fin.missingBankInfo)) ||
        hist?.status === 'PROFILE_CHANGED',
    );
  };

  const searchedRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.records.filter(
      r =>
        !q ||
        `${r.title} ${r.brand} ${r.partner} ${r.dealCode || ''} ${r.id}`
          .toLowerCase()
          .includes(q),
    );
  }, [data.records, search]);

  const legalMatches: Record<LegalFilter, (r: ContractRecord) => boolean> = {
    PENDING_LEGAL: isPendingLegal,
    CLAUSE_DIFF: r =>
      Boolean(
        r.googleDocsUrl ||
          r.hasCustomTerms ||
          (r.googleDocsReviewRouting?.clauseDiffs.length ?? 0) > 0,
      ),
    KOC_OWN_FORM: r => Boolean(r.isKocOwnForm || r.googleDocsSource === 'KOC_CUSTOM_DOC'),
    LEGAL_APPROVED: isLegalApproved,
    ALL: () => true,
  };

  const financeMatches: Record<FinanceFilter, (r: ContractRecord) => boolean> = {
    PENDING_FINANCE: isPendingFinance,
    VERIFIED_PROFILE: r => isPendingFinance(r) && isVerifiedLegalProfile(r),
    GDOCS_FINAL: isGDocsPendingFinal,
    BBNT_SETTLEMENT: r =>
      isAcceptance(r.templateId) || documentOfTemplate(r.templateId) === 'BBNT',
    BUDGET_ALERT: hasBudgetOrBankAlert,
    FINANCE_APPROVED: isFinanceApproved,
    ALL: () => true,
  };

  const filteredRows =
    mode === 'LEGAL_PORTAL'
      ? searchedRecords.filter(legalMatches[legalFilter])
      : searchedRecords.filter(financeMatches[financeFilter]);

  const pageSize = 15;
  const pagedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const submitDecision = async (
    target: ContractRecord,
    decision: ReviewStep['status'],
    note: string,
    extra?: { saveAsKocTemplate?: boolean; kocLegalNotes?: string },
  ) => {
    setActionBusy(true);
    try {
      await contractApi<{ record: ContractRecord }>('/api/contracts', {
        id: target.id,
        revision: target.revision,
        action: 'DECIDE',
        decision,
        note: note.trim(),
        ...extra,
      });
      await onRefresh();
      setRejectOrChangeModal(null);
      setInspectRecord(null);
      onNotify?.(
        decision === 'APPROVED'
          ? `Đã phê duyệt hồ sơ "${target.title}"`
          : decision === 'CHANGES'
            ? `Đã gửi yêu cầu chỉnh sửa cho "${target.title}"`
            : `Đã từ chối hồ sơ "${target.title}"`,
        decision === 'APPROVED' ? 'success' : 'warning',
      );
    } catch (err) {
      onNotify?.((err as Error).message, 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const handleGDocsFinanceApprove = async (payload: {
    note: string;
    partyAEmail?: string;
    partyBEmail?: string;
  }) => {
    if (!gdocsFinanceRecord) return;
    setActionBusy(true);
    try {
      await contractApi('/api/contracts/google-docs/approve-and-push-wesign', {
        contractId: gdocsFinanceRecord.id,
        note: payload.note,
        partyAEmail: payload.partyAEmail,
        partyBEmail: payload.partyBEmail,
      });
      await onRefresh();
      setGdocsFinanceRecord(null);
      setInspectRecord(null);
      onNotify?.(
        `Kế toán đã duyệt chốt và đẩy "${gdocsFinanceRecord.title}" sang WeSign`,
        'success',
      );
    } catch (err) {
      onNotify?.((err as Error).message, 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const totalPendingNetVnd = useMemo(() => {
    return data.records
      .filter(isPendingFinance)
      .reduce((sum, r) => sum + (financialMap.get(r.id)?.netAmount || 0), 0);
  }, [data.records, financialMap]);

  // Cột bảng Portal Pháp chế: Tối đa 2 dòng/ô, chỉ 1 Status/hàng, không dùng badge tô nền cho thuộc tính
  const legalColumns: Column<ContractRecord>[] = [
    {
      key: 'title',
      header: 'Hồ sơ',
      width: 240,
      render: r => {
        const docStage = documentOfTemplate(r.templateId);
        const stageLabel =
          docStage === 'HDNT'
            ? 'Hợp đồng nguyên tắc'
            : docStage === 'SOW'
              ? 'Phụ lục SOW'
              : 'Biên bản nghiệm thu';
        return (
          <div className="min-w-0 max-w-[260px] leading-snug space-y-0.5">
            <span className="block truncate font-medium text-ink">{r.title}</span>
            <span className="block truncate text-2xs text-ink-3">
              {stageLabel} · <span className="font-code">{r.templateId}</span> · v{r.version}
            </span>
          </div>
        );
      },
    },
    {
      key: 'partner',
      header: 'Đối tác KOC (Bên B)',
      width: 190,
      render: r => {
        const docStage = documentOfTemplate(r.templateId);
        const kocHandle = r.values['token:[ID KOC]'] ? `@${r.values['token:[ID KOC]'].replace(/^@/, '')}` : '';
        return (
          <div className="min-w-0 max-w-[210px] leading-snug space-y-0.5">
            <span className="block truncate font-medium text-ink">{r.partner}</span>
            <span className="block truncate text-2xs text-ink-3">
              {docStage === 'HDNT' || r.brand === 'UPBASE' ? (
                <>
                  HĐ nguyên tắc KOC
                  {kocHandle && (
                    <>
                      {' · '}
                      <span className="font-code text-ink-2">{kocHandle}</span>
                    </>
                  )}
                </>
              ) : (
                <>
                  {r.brand}
                  {r.dealCode ? (
                    <>
                      {' · '}
                      <span className="font-code text-ink-2">{r.dealCode}</span>
                    </>
                  ) : (
                    ' · HĐ khung'
                  )}
                </>
              )}
            </span>
          </div>
        );
      },
    },
    {
      key: 'clauses',
      header: 'Nội dung rà soát',
      width: 240,
      render: r => {
        const routing = r.googleDocsReviewRouting;
        const legalClauses = routing?.legalClauses || [];
        if (!r.hasCustomTerms && !r.googleDocsUrl && !r.isKocOwnForm) {
          return (
            <div className="leading-snug space-y-0.5">
              <span className="block text-ink-2">Mẫu chuẩn</span>
              <span className="block text-2xs text-ink-3">Đã thông báo · Theo dõi</span>
            </div>
          );
        }
        const headline = r.isKocOwnForm
          ? 'Mẫu riêng KOC'
          : legalClauses.length > 0
            ? legalClauses.join(' · ')
            : 'Sửa đổi điều khoản';
        return (
          <div className="min-w-0 max-w-[260px] leading-snug space-y-0.5">
            <span className="block truncate font-medium text-ink">{headline}</span>
            <span className="block truncate text-2xs text-ink-3">
              {r.customTermsSummary || routing?.summary || 'Kiểm tra quyền hình ảnh & phạt vi phạm'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'docs',
      header: 'Giấy tờ CCCD / ĐKKD',
      width: 165,
      render: r => {
        const docs = resolveRecordLegalAttachments(r);
        if (docs.length === 0) {
          return <span className="text-2xs text-ink-3">Chưa đính kèm</span>;
        }
        return (
          <div
            className="leading-snug space-y-0.5"
            onClick={e => e.stopPropagation()}
          >
            <span className="block text-ink-2">{docs.length} tệp đính kèm</span>
            <button
              type="button"
              onClick={() =>
                setQuickPreviewState({
                  docs,
                  active: docs[0],
                  label: r.partner,
                })
              }
              className="text-2xs font-medium text-accent hover:underline"
            >
              Xem giấy tờ →
            </button>
          </div>
        );
      },
    },
    {
      key: 'legalStatus',
      header: 'Trạng thái',
      width: 135,
      render: r => {
        const step = r.steps.find(s => s.role === 'LEGAL' && s.version === r.version);
        let label = 'Đã duyệt';
        let tone: StatusTone = 'positive';
        if (step?.status === 'APPROVED' || r.googleDocsAuditTrail?.approvedByLegal) {
          label = 'Đã duyệt';
          tone = 'positive';
        } else if (step?.status === 'CHANGES' || step?.status === 'REJECTED') {
          label = 'Cần sửa';
          tone = 'critical';
        } else if (isPendingLegal(r)) {
          label = 'Chờ duyệt';
          tone = 'warning';
        }
        return <Status tone={tone}>{label}</Status>;
      },
    },
    {
      key: 'actions',
      header: '',
      width: 110,
      align: 'right',
      render: r => (
        <div
          className="inline-flex items-center justify-end"
          onClick={e => e.stopPropagation()}
        >
          <Button
            size="sm"
            variant="secondary"
            onClick={() => openUnifiedInspectModal(r)}
          >
            Xem
          </Button>
        </div>
      ),
    },
  ];

  // Cột bảng Portal Kế toán: Không đưa số nhạy cảm (CCCD/STK) vào danh sách (Rule 8), chỉ 1 Status/hàng (Rule 6)
  const financeColumns: Column<ContractRecord>[] = [
    {
      key: 'title',
      header: 'Hồ sơ',
      width: 230,
      render: r => {
        const docStage = documentOfTemplate(r.templateId);
        const stageLabel =
          docStage === 'HDNT'
            ? 'Hợp đồng nguyên tắc'
            : docStage === 'SOW'
              ? 'Phụ lục SOW'
              : 'Biên bản nghiệm thu';
        return (
          <div className="min-w-0 max-w-[250px] leading-snug space-y-0.5">
            <span className="block truncate font-medium text-ink">{r.title}</span>
            <span className="block truncate text-2xs text-ink-3">
              {stageLabel}
              {r.dealCode ? (
                <>
                  {' · '}
                  <span className="font-code text-ink-2">{r.dealCode}</span>
                </>
              ) : (
                ' · HĐ khung'
              )}
            </span>
          </div>
        );
      },
    },
    {
      key: 'partner',
      header: 'Đối tác KOC & ngân hàng',
      width: 195,
      render: r => {
        const fin = financialMap.get(r.id);
        const docStage = documentOfTemplate(r.templateId);
        return (
          <div className="min-w-0 max-w-[210px] leading-snug space-y-0.5">
            <span className="block truncate font-medium text-ink">{r.partner}</span>
            <span className="block truncate text-2xs text-ink-3">
              {docStage === 'HDNT' || r.brand === 'UPBASE' ? 'HĐ nguyên tắc' : r.brand} · {fin?.bankName || 'Chưa rõ NH'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'historyAndDocs',
      header: 'Lịch sử ký & giấy tờ',
      width: 235,
      render: r => {
        const hist = signingHistoryMap.get(r.id);
        const docs = resolveRecordLegalAttachments(r);
        return (
          <div
            className="min-w-0 max-w-[250px] leading-snug space-y-0.5"
            onClick={e => e.stopPropagation()}
          >
            {hist?.status === 'SIGNED_VERIFIED' || hist?.status === 'FINANCE_VERIFIED' ? (
              <span className="block truncate font-medium text-positive">
                Đã từng ký ({hist.latestMatch?.id}) · Miễn kiểm tra lại
              </span>
            ) : hist?.status === 'PROFILE_CHANGED' ? (
              <span className="block truncate font-medium text-critical">
                Đổi STK / MST so với HĐ cũ
              </span>
            ) : (
              <span className="block truncate text-ink-2">
                Ký lần đầu · Cần kiểm tra CCCD / ĐKKD
              </span>
            )}
            <div className="flex items-center gap-2 text-2xs text-ink-3">
              <span>
                {docs.length > 0 ? `${docs.length} tệp CCCD / ĐKKD` : 'Chưa đính kèm giấy tờ'}
              </span>
              {docs.length > 0 && (
                <>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() =>
                      setQuickPreviewState({
                        docs,
                        active: docs[0],
                        label: r.partner,
                      })
                    }
                    className="font-medium text-accent hover:underline"
                  >
                    Xem ảnh
                  </button>
                </>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'financials',
      header: 'Thực chi Net',
      width: 175,
      align: 'right',
      render: r => {
        const fin = financialMap.get(r.id);
        if (!fin || fin.grossAmount === 0) {
          return <span className="text-2xs text-ink-3">Theo phụ lục SOW</span>;
        }
        return (
          <div className="leading-snug space-y-0.5 tabular-nums text-right">
            <div className="font-code font-semibold text-ink">
              {formatVnd(fin.netAmount)}
            </div>
            <div className="text-2xs text-ink-3">
              {fin.isOverDealBudget ? (
                <span className="text-critical font-medium">Vượt trần Booking</span>
              ) : fin.isUnbudgetedSpend ? (
                <span className="text-critical font-medium">Hạn mức 0đ</span>
              ) : (
                `Gross ${formatVnd(fin.grossAmount)} · Thuế ${formatVnd(fin.taxAmount)}`
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'financeStatus',
      header: 'Trạng thái',
      width: 135,
      render: r => {
        const finStep = r.steps.find(s => s.role === 'FINANCE' && s.version === r.version);
        let label = 'Nháp';
        let tone: StatusTone = 'neutral';
        if (r.signing.at(-1)?.status === 'COMPLETED') {
          label = 'Hoàn tất';
          tone = 'positive';
        } else if (r.approval === 'APPROVED' || finStep?.status === 'APPROVED') {
          label = 'Đã duyệt';
          tone = 'positive';
        } else if (finStep?.status === 'CHANGES' || finStep?.status === 'REJECTED') {
          label = 'Cần sửa';
          tone = 'critical';
        } else if (
          (r.googleDocsUrl && r.approval === 'IN_REVIEW') ||
          finStep?.status === 'PENDING'
        ) {
          label = 'Chờ duyệt';
          tone = 'warning';
        }
        return <Status tone={tone}>{label}</Status>;
      },
    },
    {
      key: 'actions',
      header: '',
      width: 110,
      align: 'right',
      render: r => {
        const pendingFin = isPendingFinance(r);
        const gdocsPending = isGDocsPendingFinal(r);
        const canAct = isFinanceActor && (pendingFin || gdocsPending);
        return (
          <div
            className="inline-flex items-center justify-end"
            onClick={e => e.stopPropagation()}
          >
            <Button
              size="sm"
              variant={canAct ? 'primary' : 'secondary'}
              disabled={busy || actionBusy}
              onClick={() => openUnifiedInspectModal(r)}
            >
              {canAct ? 'Duyệt' : 'Xem'}
            </Button>
          </div>
        );
      },
    },
  ];

  const legalChipItems: { key: LegalFilter; label: string; count: number }[] = [
    {
      key: 'PENDING_LEGAL',
      label: 'Chờ duyệt',
      count: searchedRecords.filter(legalMatches.PENDING_LEGAL).length,
    },
    {
      key: 'CLAUSE_DIFF',
      label: 'Sửa điều khoản',
      count: searchedRecords.filter(legalMatches.CLAUSE_DIFF).length,
    },
    {
      key: 'KOC_OWN_FORM',
      label: 'Mẫu riêng KOC',
      count: searchedRecords.filter(legalMatches.KOC_OWN_FORM).length,
    },
    {
      key: 'LEGAL_APPROVED',
      label: 'Đã duyệt',
      count: searchedRecords.filter(legalMatches.LEGAL_APPROVED).length,
    },
    { key: 'ALL', label: 'Tất cả', count: searchedRecords.length },
  ];

  const financeChipItems: { key: FinanceFilter; label: string; count: number }[] = [
    {
      key: 'PENDING_FINANCE',
      label: 'Chờ duyệt',
      count: searchedRecords.filter(financeMatches.PENDING_FINANCE).length,
    },
    {
      key: 'VERIFIED_PROFILE',
      label: 'Đã từng ký HSPL',
      count: searchedRecords.filter(financeMatches.VERIFIED_PROFILE).length,
    },
    {
      key: 'GDOCS_FINAL',
      label: 'Google Docs chờ chốt',
      count: searchedRecords.filter(financeMatches.GDOCS_FINAL).length,
    },
    {
      key: 'BBNT_SETTLEMENT',
      label: 'Nghiệm thu BBNT',
      count: searchedRecords.filter(financeMatches.BBNT_SETTLEMENT).length,
    },
    {
      key: 'BUDGET_ALERT',
      label: 'Cảnh báo lệch trần / STK',
      count: searchedRecords.filter(financeMatches.BUDGET_ALERT).length,
    },
    {
      key: 'FINANCE_APPROVED',
      label: 'Đã duyệt',
      count: searchedRecords.filter(financeMatches.FINANCE_APPROVED).length,
    },
    { key: 'ALL', label: 'Tất cả', count: searchedRecords.length },
  ];

  const inspectFinancials = inspectRecord ? financialMap.get(inspectRecord.id) : undefined;
  const inspectHistory = inspectRecord ? signingHistoryMap.get(inspectRecord.id) : undefined;
  const inspectDocs = inspectRecord ? resolveRecordLegalAttachments(inspectRecord) : [];
  const inspectLegalStep = inspectRecord?.steps.find(
    s => s.role === 'LEGAL' && s.version === inspectRecord.version,
  );
  const inspectFinanceStep = inspectRecord?.steps.find(
    s => s.role === 'FINANCE' && s.version === inspectRecord.version,
  );

  const canApproveInInspectModal = Boolean(
    inspectRecord &&
      mode === 'FINANCE_PORTAL' &&
      isFinanceActor &&
      (isPendingFinance(inspectRecord) || isGDocsPendingFinal(inspectRecord)),
  );

  if (mode === 'FINANCE_PORTAL' && financeSection === 'ADVANCE_PAYMENT_REPORT') {
    return (
      <FinanceAdvancePaymentReportView
        deals={deals}
        kocs={kocs}
        contractRecords={data.records}
        isFinanceActor={isFinanceActor}
        initialSearch={dealLookupQuery}
        initialSubTab={dealLookupSubTab}
        onOpenContractRecord={onOpenRecord}
        onQuickViewRecord={onQuickViewRecord}
        onNotify={onNotify}
      />
    );
  }

  return (
    <div className="space-y-4">
      {mode === 'FINANCE_PORTAL' && financeSection === 'FINANCE_REMINDERS' ? (
        <FinanceReminderInboxView
          data={data}
          deals={deals}
          kocs={kocs}
          busy={busy || actionBusy}
          onOpenContractReview={record => openUnifiedInspectModal(record)}
          onOpenDealLookup={(dealCode, subTab) => {
            setDealLookupQuery(dealCode);
            setDealLookupSubTab(subTab || 'DEAL_LEDGER');
            setFinanceSection('ADVANCE_PAYMENT_REPORT');
            onOpenDealLookup?.(dealCode);
          }}
        />
      ) : (
        <>
          <Panel flush>
            <div className="p-4 border-b border-line">
              <FilterBar
                search={{
                  value: search,
                  onChange: v => {
                    setSearch(v);
                    setPage(1);
                  },
                  placeholder: 'Tìm hồ sơ, tên KOC, nhãn hàng, mã deal...',
                }}
                chips={
                  mode === 'LEGAL_PORTAL' ? (
                    <Chips
                      items={legalChipItems}
                      value={legalFilter}
                      onChange={v => {
                        setLegalFilter(v);
                        setPage(1);
                      }}
                    />
                  ) : (
                    <Chips
                      items={financeChipItems}
                      value={financeFilter}
                      onChange={v => {
                        setFinanceFilter(v);
                        setPage(1);
                      }}
                    />
                  )
                }
                resultCount={search.trim() ? filteredRows.length : undefined}
              />
            </div>

            <DataTable
              columns={mode === 'LEGAL_PORTAL' ? legalColumns : financeColumns}
              rows={pagedRows}
              rowKey={r => r.id}
              onRowClick={r => openUnifiedInspectModal(r)}
              empty={
                <EmptyState
                  title={
                    mode === 'LEGAL_PORTAL'
                      ? 'Không có hồ sơ cần Pháp chế xử lý'
                      : 'Không có hồ sơ cần Kế toán xử lý'
                  }
                />
              }
            />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={filteredRows.length}
              onPageChange={setPage}
            />
          </Panel>
        </>
      )}

      {/* HỘP THOẠI ĐỐI SOÁT & PHÊ DUYỆT 2 CỘT CHUẨN DESIGN SYSTEM (§7 Rule 14) */}
      <Modal
        open={Boolean(inspectRecord)}
        onClose={() => setInspectRecord(null)}
        title={
          inspectRecord
            ? `${inspectRecord.title} · ${inspectRecord.partner}`
            : 'Chi tiết hồ sơ'
        }
        size="xl"
        footer={
          inspectRecord && (
            <div className="flex flex-wrap items-center justify-between w-full gap-2">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Eye}
                  onClick={() => {
                    const target = inspectRecord;
                    setInspectRecord(null);
                    onQuickViewRecord(target);
                  }}
                >
                  Xem văn bản
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={FileText}
                  onClick={() => {
                    const id = inspectRecord.id;
                    setInspectRecord(null);
                    onOpenRecord(id);
                  }}
                >
                  Mở trang chi tiết
                </Button>
                {inspectRecord.dealCode && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const code = inspectRecord.dealCode || '';
                      setInspectRecord(null);
                      setDealLookupQuery(code);
                      setFinanceSection('ADVANCE_PAYMENT_REPORT');
                      onOpenDealLookup?.(code);
                    }}
                  >
                    Tra cứu deal ({inspectRecord.dealCode}) →
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {canApproveInInspectModal ? (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={actionBusy}
                      onClick={() =>
                        setRejectOrChangeModal({
                          record: inspectRecord,
                          decision: 'CHANGES',
                        })
                      }
                    >
                      Yêu cầu sửa
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={actionBusy}
                      onClick={() =>
                        setRejectOrChangeModal({
                          record: inspectRecord,
                          decision: 'REJECTED',
                        })
                      }
                    >
                      Từ chối
                    </Button>
                    {mode === 'LEGAL_PORTAL' ? (
                      <Button
                        size="sm"
                        variant="primary"
                        icon={CheckCircle2}
                        disabled={actionBusy}
                        onClick={() =>
                          submitDecision(inspectRecord, 'APPROVED', approveNote, {
                            saveAsKocTemplate,
                            kocLegalNotes,
                          })
                        }
                      >
                        {actionBusy ? 'Đang lưu...' : 'Duyệt pháp chế'}
                      </Button>
                    ) : inspectRecord.googleDocsUrl ? (
                      <Button
                        size="sm"
                        variant="primary"
                        icon={Send}
                        disabled={actionBusy}
                        onClick={() => setGdocsFinanceRecord(inspectRecord)}
                      >
                        Duyệt &amp; đẩy WeSign
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="primary"
                        icon={CheckCircle2}
                        disabled={actionBusy}
                        onClick={() =>
                          submitDecision(
                            inspectRecord,
                            'APPROVED',
                            approveNote ||
                              'Đã kiểm tra khớp hạn mức Booking, thuế khấu trừ và thông tin tài khoản thụ hưởng.',
                          )
                        }
                      >
                        {actionBusy ? 'Đang lưu...' : 'Duyệt kế toán'}
                      </Button>
                    )}
                  </>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => setInspectRecord(null)}>
                    Đóng
                  </Button>
                )}
              </div>
            </div>
          )
        }
      >
        {inspectRecord && inspectFinancials && (
          <div className="space-y-4 text-xs">
            {/* Gợi ý 1 dòng về lịch sử ký hợp đồng với Hồ sơ pháp lý của KOC */}
            {inspectHistory && (
              <LegalProfileSigningHistoryBanner
                summary={inspectHistory}
                onOpenPriorContract={id => {
                  const found = data.records.find(x => x.id === id);
                  if (found) openUnifiedInspectModal(found);
                }}
              />
            )}

            {/* Bố cục 2 cột chuẩn §7 Rule 14: Cột chính (Xem CCCD/ĐKKD & Điều khoản) | Cột phụ 340px (Hồ sơ pháp lý, Đối soát giá trị, Ghi chú duyệt) */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-start">
              {/* CỘT CHÍNH: Giấy tờ CCCD/ĐKKD & Điều khoản */}
              <div className="space-y-3 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Segmented
                    value={leftPaneTab}
                    onChange={v => setLeftPaneTab(v)}
                    items={[
                      {
                        key: 'DOCS',
                        label: `Giấy tờ (${inspectDocs.length})`,
                      },
                      {
                        key: 'PREVIEW',
                        label: 'Văn bản A4',
                      },
                      {
                        key: 'CLAUSES',
                        label: 'Điều khoản & tiến độ',
                      },
                    ]}
                  />
                  {inspectRecord.googleDocsUrl && (
                    <a
                      href={inspectRecord.googleDocsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-2xs font-medium text-accent hover:underline"
                    >
                      Mở Google Docs <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {leftPaneTab === 'DOCS' ? (
                  <LegalAttachmentsPanel
                    attachments={inspectDocs}
                    entitySlug={
                      inspectRecord.kocId || inspectRecord.partner || inspectRecord.id
                    }
                    legalType={
                      inspectRecord.templateId.startsWith('COM-')
                        ? 'COMPANY'
                        : inspectRecord.templateId.startsWith('HKD-')
                           ? 'HOUSEHOLD'
                           : 'INDIVIDUAL'
                    }
                    editable
                    defaultExpandPreview={true}
                    onChange={async nextAttachments => {
                      try {
                        const res = await contractApi<{ record: ContractRecord }>(
                          '/api/contracts',
                          {
                            id: inspectRecord.id,
                            revision: inspectRecord.revision,
                            action: 'ATTACH_LEGAL_DOCS',
                            legalAttachments: nextAttachments,
                          },
                        );
                        setInspectRecord(res.record);
                        await onRefresh();
                      } catch (err) {
                        onNotify?.((err as Error).message, 'error');
                      }
                    }}
                    title="Ảnh CCCD & Giấy phép ĐKKD"
                  />
                ) : leftPaneTab === 'PREVIEW' ? (
                  (() => {
                    const tpl =
                      data.templates.find(t => t.id === inspectRecord.templateId) ||
                      OFFICIAL_TEMPLATES_SNAPSHOT[inspectRecord.templateId];
                    const signAttempt = inspectRecord.signing.at(-1);
                    return (
                      <ContractDocumentViewer
                        title={inspectRecord.title}
                        templateName={`${tpl?.name || inspectRecord.templateId} · v${inspectRecord.version}`}
                        blocks={inspectRecord.customFile?.blocks || tpl?.blocks || []}
                        paragraphs={inspectRecord.customFile?.paragraphs || tpl?.paragraphs || []}
                        fields={inspectRecord.isKocOwnForm ? [] : tpl?.fields || []}
                        values={inspectRecord.values}
                        clauseDiffs={
                          inspectRecord.googleDocsAuditTrail?.initialToFinalDiffs?.length
                            ? inspectRecord.googleDocsAuditTrail.initialToFinalDiffs
                            : inspectRecord.googleDocsReviewRouting?.clauseDiffs
                        }
                        downloadHref={`/api/contracts/${inspectRecord.id}/document?version=${inspectRecord.version}`}
                        signingPeople={signAttempt?.people}
                        signingDocumentId={signAttempt?.documentId}
                        partnerName={inspectRecord.partner}
                        acceptanceScreenshots={inspectRecord.acceptanceScreenshots}
                        isTemplatePreview={inspectRecord.isKocOwnForm}
                        maxHeight="540px"
                        compactToolbar
                      />
                    );
                  })()
                ) : (
                  <div className="rounded-xl border border-line bg-surface divide-y divide-line">
                    {inspectRecord.customTermsSummary && (
                      <div className="p-4 space-y-1">
                        <span className="font-semibold text-ink block">
                          Tóm tắt điều khoản điều chỉnh
                        </span>
                        <p className="text-ink-2">{inspectRecord.customTermsSummary}</p>
                      </div>
                    )}

                    {inspectRecord.googleDocsAuditTrail?.negotiationReport && (
                      <div className="p-4 space-y-2.5 bg-canvas/40">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-ink">
                            Báo cáo lưu vết đàm phán &amp; chỉnh sửa (Bản đầu → Bình luận → Bản chốt)
                          </span>
                          <span className="text-2xs text-positive font-medium">
                            {inspectRecord.googleDocsAuditTrail.negotiationReport.accountContributionsSummary.length} tài khoản · {inspectRecord.googleDocsComments?.length || 0} bình luận
                          </span>
                        </div>
                        <p className="text-2xs text-ink-2 leading-relaxed">
                          {inspectRecord.googleDocsAuditTrail.negotiationReport.executiveSummary}
                        </p>
                        {inspectRecord.googleDocsAuditTrail.negotiationReport.accountContributionsSummary.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            {inspectRecord.googleDocsAuditTrail.negotiationReport.accountContributionsSummary.map((acc, idx) => (
                              <div key={idx} className="rounded-lg border border-line bg-surface p-2.5 text-2xs space-y-0.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold text-ink">{acc.account}</span>
                                  <span className="text-ink-3">{acc.roleHint} · {acc.editCount} lần sửa · {acc.commentCount} bình luận · {acc.replyCount} phản hồi</span>
                                </div>
                                <p className="text-ink-2">{acc.summary}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="p-4 space-y-3">
                      <ClauseDiffList
                        diffs={
                          inspectRecord.googleDocsAuditTrail?.initialToFinalDiffs?.length
                            ? inspectRecord.googleDocsAuditTrail.initialToFinalDiffs
                            : inspectRecord.googleDocsReviewRouting?.clauseDiffs || []
                        }
                        sourceType={inspectRecord.googleDocsSource || 'TEMPLATE_AMENDED'}
                      />
                    </div>

                    <div className="p-4 space-y-2">
                      <span className="font-semibold text-ink block">Tiến độ phê duyệt &amp; theo dõi</span>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-ink-2">
                          Kế toán ({inspectFinanceStep?.reviewerName || 'Lê Thị Thu Hà'})
                        </span>
                        <span
                          className={`text-2xs font-medium ${
                            inspectRecord.approval === 'APPROVED' ||
                            inspectFinanceStep?.status === 'APPROVED'
                              ? 'text-positive'
                              : inspectFinanceStep?.status === 'REJECTED'
                                ? 'text-critical'
                                : 'text-warning'
                          }`}
                        >
                          {inspectRecord.approval === 'APPROVED' ||
                          inspectFinanceStep?.status === 'APPROVED'
                            ? 'Đã duyệt'
                            : 'Chờ duyệt'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-ink-2">
                          Pháp chế ({inspectLegalStep?.reviewerName || 'Bộ phận Pháp chế'})
                        </span>
                        <span
                          className={`text-2xs font-medium ${
                            !inspectLegalStep || inspectLegalStep.status === 'APPROVED'
                              ? 'text-positive'
                              : inspectLegalStep.status === 'REJECTED'
                                ? 'text-critical'
                                : 'text-warning'
                          }`}
                        >
                          {!inspectLegalStep
                            ? 'Đã thông báo · Theo dõi'
                            : inspectLegalStep.status === 'APPROVED'
                              ? 'Đã duyệt'
                              : 'Chờ duyệt'}
                        </span>
                      </div>
                      {(inspectRecord.templateId.endsWith('-HDNT') || inspectRecord.brand === 'UPBASE') && (
                        <div className="flex items-center justify-between py-1">
                          <span className="text-ink-2">
                            Giám đốc Marketing B2C (Đặng Thị Yến Nhi)
                          </span>
                          <span className="text-2xs font-medium text-positive">
                            Đã thông báo · Quản lý
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* CỘT PHỤ 340PX: Chung một khung, ngăn bằng đường kẻ mảnh (DESIGN_SYSTEM.md §7 Rule 14) */}
              <div className="rounded-xl border border-line bg-surface divide-y divide-line">
                {/* Khối 1: Định danh & Thụ hưởng */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-ink">Hồ sơ pháp lý &amp; thụ hưởng</span>
                    <button
                      type="button"
                      onClick={() => setRevealSensitive(v => !v)}
                      className="inline-flex items-center gap-1 text-2xs font-medium text-accent hover:underline"
                    >
                      {revealSensitive ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" /> Ẩn số
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" /> Hiện số
                        </>
                      )}
                    </button>
                  </div>

                  <dl className="space-y-2">
                    <div className="flex justify-between gap-2">
                      <dt className="text-ink-3">Đối tác KOC</dt>
                      <dd className="font-medium text-ink text-right">{inspectRecord.partner}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-ink-3">
                        {documentOfTemplate(inspectRecord.templateId) === 'HDNT' || inspectRecord.brand === 'UPBASE'
                          ? 'Phạm vi hợp đồng'
                          : 'Nhãn hàng · Deal'}
                      </dt>
                      <dd className="text-ink text-right">
                        {documentOfTemplate(inspectRecord.templateId) === 'HDNT' || inspectRecord.brand === 'UPBASE' ? (
                          'Hợp đồng nguyên tắc (UpBase ↔ KOC)'
                        ) : (
                          <>
                            {inspectRecord.brand} ·{' '}
                            <span className="font-code">{inspectRecord.dealCode || 'HĐ khung'}</span>
                          </>
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-ink-3">Số CCCD / MST</dt>
                      <dd className="font-code font-medium text-ink text-right">
                        {maskSensitiveNumber(inspectFinancials.cccdOrTaxCode, revealSensitive)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-ink-3">Ngân hàng</dt>
                      <dd className="text-ink text-right">
                        {inspectFinancials.bankName || 'Chưa cập nhật'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-ink-3">Số tài khoản</dt>
                      <dd className="font-code font-medium text-ink text-right">
                        {maskSensitiveNumber(inspectFinancials.bankAccount, revealSensitive)}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Khối 2: Đối soát giá trị */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-ink">Đối soát giá trị</span>
                    {inspectFinancials.isOverDealBudget ? (
                      <span className="text-2xs font-medium text-critical">Vượt trần</span>
                    ) : inspectFinancials.isUnbudgetedSpend ? (
                      <span className="text-2xs font-medium text-critical">Hạn mức 0đ</span>
                    ) : (
                      <span className="text-2xs font-medium text-positive">Khớp hạn mức</span>
                    )}
                  </div>

                  <dl className="space-y-2 tabular-nums">
                    <div className="flex justify-between gap-2">
                      <dt className="text-ink-3">Tổng giá trị Gross</dt>
                      <dd className="font-code text-ink">
                        {formatVnd(inspectFinancials.grossAmount)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-ink-3">{inspectFinancials.taxLabel}</dt>
                      <dd className="font-code text-ink-2">
                        -{formatVnd(inspectFinancials.taxAmount)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2 pt-2 border-t border-line">
                      <dt className="font-semibold text-ink">Thực chi Net</dt>
                      <dd className="font-code font-semibold text-positive">
                        {formatVnd(inspectFinancials.netAmount)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2 text-2xs text-ink-3 pt-1">
                      <dt>Tạm ứng đợt 1 / Còn lại</dt>
                      <dd className="font-code">
                        {formatVnd(inspectFinancials.advanceAmount)} /{' '}
                        {formatVnd(inspectFinancials.remainingAmount)}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Khối 3: Ghi chú phê duyệt */}
                {canApproveInInspectModal && (
                  <div className="p-4 space-y-3">
                    <Field
                      label={
                        mode === 'LEGAL_PORTAL'
                          ? 'Ghi chú thẩm định Pháp chế'
                          : 'Ghi chú phê duyệt Kế toán'
                      }
                      htmlFor="unified-approve-note"
                    >
                      <Textarea
                        id="unified-approve-note"
                        rows={2}
                        value={approveNote}
                        onChange={e => setApproveNote(e.target.value)}
                        placeholder="Nhập ghi chú phê duyệt..."
                      />
                    </Field>

                    {mode === 'LEGAL_PORTAL' && (
                      <div className="space-y-2 pt-1">
                        <label className="flex items-start gap-2 text-2xs text-ink cursor-pointer">
                          <input
                            type="checkbox"
                            className="mt-0.5 rounded border-line text-accent"
                            checked={saveAsKocTemplate}
                            onChange={e => setSaveAsKocTemplate(e.target.checked)}
                          />
                          <span>
                            Lưu làm mẫu chuẩn riêng của KOC ({inspectRecord.partner}) cho các đợt sau
                          </span>
                        </label>
                        {saveAsKocTemplate && (
                          <Textarea
                            rows={2}
                            value={kocLegalNotes}
                            onChange={e => setKocLegalNotes(e.target.value)}
                            placeholder="Lưu ý pháp lý khi tái sử dụng mẫu này..."
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Hộp thoại Yêu cầu sửa / Từ chối */}
      {rejectOrChangeModal && (
        <ConfirmDialog
          open={true}
          title={
            rejectOrChangeModal.decision === 'CHANGES'
              ? 'Yêu cầu chỉnh sửa hồ sơ'
              : 'Từ chối phê duyệt hồ sơ'
          }
          tone={rejectOrChangeModal.decision === 'REJECTED' ? 'danger' : undefined}
          confirmLabel={
            rejectOrChangeModal.decision === 'CHANGES'
              ? 'Gửi yêu cầu sửa'
              : 'Từ chối hồ sơ'
          }
          reason={{
            label: 'Lý do yêu cầu sửa / từ chối',
            required: true,
          }}
          onConfirm={note =>
            submitDecision(
              rejectOrChangeModal.record,
              rejectOrChangeModal.decision,
              note || '',
            )
          }
          onCancel={() => setRejectOrChangeModal(null)}
          onOpenChange={o => !o && setRejectOrChangeModal(null)}
        />
      )}

      {/* Hộp thoại Kế toán duyệt chốt Google Docs & Đẩy sang WeSign */}
      {gdocsFinanceRecord && (
        <GoogleDocsFinanceApproveDialog
          open={Boolean(gdocsFinanceRecord)}
          record={gdocsFinanceRecord}
          busy={actionBusy}
          signingHistory={signingHistoryMap.get(gdocsFinanceRecord.id)}
          legalAttachments={resolveRecordLegalAttachments(gdocsFinanceRecord)}
          onClose={() => setGdocsFinanceRecord(null)}
          onConfirm={handleGDocsFinanceApprove}
        />
      )}

      {/* Hộp thoại Xem nhanh trực tiếp CCCD / ĐKKD từ dòng bảng */}
      {quickPreviewState && (
        <LegalDocPreviewModal
          attachments={quickPreviewState.docs}
          activeDoc={quickPreviewState.active}
          profileLabel={quickPreviewState.label}
          onSelectDoc={doc =>
            setQuickPreviewState(prev => (prev ? { ...prev, active: doc } : null))
          }
          onClose={() => setQuickPreviewState(null)}
        />
      )}
    </div>
  );
}
