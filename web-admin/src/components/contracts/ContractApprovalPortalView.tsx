'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  FileCheck2,
  FileText,
  Scale,
  Send,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type { BookingDealItem, KocItem, LegalDocAttachment } from '../../lib/types';
import type { ContractRecord, ReviewStep } from '../../lib/contracts/types';
import {
  evaluateLegalProfileSigningHistory,
  resolveContractLegalAttachments,
  type LegalProfileSigningHistorySummary,
} from '../../lib/contracts/legalProfileHistory';
import { formatVnd } from '../../lib/format';
import { documentOfTemplate } from '../../lib/planDealLink';
import { LegalAttachmentsPanel, LegalProfileSigningHistoryBanner } from './LegalAttachmentsPanel';
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
  Stat,
  StatRow,
  Status,
  Textarea,
} from '../ui';
import type { Column, StatusTone } from '../ui';
import { contractApi, type ContractBootstrap } from './api';
import { GoogleDocsFinanceApproveDialog } from './GoogleDocsFinanceApproveDialog';
import { isAcceptance } from './contractUi';

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

export function extractContractFinancials(
  record: ContractRecord,
  deal?: BookingDealItem,
  koc?: KocItem,
): ExtractedFinancialSummary {
  const v = record.values || {};
  const grossFromValues =
    parseVndNumber(v['src:grossAmount']) ||
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
    parseVndNumber(v['word/document.xml:p188:cell']);
  const explicitNet =
    parseVndNumber(v['src:netAmount']) ||
    parseVndNumber(v['word/document.xml:p186:cell']);

  let taxAmount = explicitTax;
  let netAmount = explicitNet;
  let taxLabel = 'Thuế TNCN 10% (≥ 2tr)';

  if (isCompany) {
    taxLabel = 'VAT 8-10% (Pháp nhân Công ty)';
    if (!taxAmount && grossAmount > 0) {
      taxAmount = Math.round(grossAmount * 0.08);
    }
    if (!netAmount && grossAmount > 0) {
      netAmount = grossAmount;
    }
  } else if (isHousehold) {
    taxLabel = 'Thuế HKD theo biểu mẫu';
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

  const advanceAmount =
    parseVndNumber(v['word/document.xml:p208:14']) ||
    Math.round(netAmount * 0.5);
  const remainingAmount = Math.max(0, netAmount - advanceAmount);

  const activeProfile = koc?.legalProfiles?.[0];
  const bankAccount =
    v['src:bankAccount'] ||
    v['SO_TAI_KHOAN'] ||
    activeProfile?.bankAccountNumber ||
    koc?.bankAccount ||
    '';
  const bankName =
    v['src:bankName'] ||
    v['NGAN_HANG'] ||
    activeProfile?.bankName ||
    koc?.bankName ||
    '';
  const cccdOrTaxCode =
    v['src:cccd'] ||
    v['src:taxCode'] ||
    v['word/document.xml:p39:cell'] ||
    activeProfile?.taxCode ||
    koc?.cccd ||
    koc?.taxCode ||
    '';
  const phone =
    v['src:phone'] ||
    v['word/document.xml:p45:cell'] ||
    koc?.phone ||
    '';

  const isOverDealBudget = dealBudget > 0 && grossAmount > dealBudget;
  const isUnbudgetedSpend = deal !== undefined && dealBudget === 0 && grossAmount > 0;
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
  data,
  deals = [],
  kocs = [],
  busy,
  onOpenRecord,
  onQuickViewRecord,
  onRefresh,
  onNotify,
}: {
  mode: ApprovalPortalMode;
  data: ContractBootstrap;
  deals?: BookingDealItem[];
  kocs?: KocItem[];
  busy: boolean;
  onOpenRecord: (id: string) => void;
  onQuickViewRecord: (record: ContractRecord) => void;
  onRefresh: () => Promise<unknown>;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}) {
  const me = data.actor;
  const isLegalActor = me.roles.includes('LEGAL') || me.roles.includes('LEAD');
  const isFinanceActor = me.roles.includes('FINANCE') || me.roles.includes('LEAD');

  const [search, setSearch] = useState('');
  const [legalFilter, setLegalFilter] = useState<LegalFilter>('PENDING_LEGAL');
  const [financeFilter, setFinanceFilter] = useState<FinanceFilter>('PENDING_FINANCE');
  const [page, setPage] = useState(1);
  const [revealSensitive, setRevealSensitive] = useState(false);

  // Hộp thoại thẩm định chi tiết ngay trên Portal
  const [inspectRecord, setInspectRecord] = useState<ContractRecord | null>(null);
  const [decisionModal, setDecisionModal] = useState<{
    record: ContractRecord;
    decision: 'APPROVED' | 'CHANGES' | 'REJECTED';
    role: 'LEGAL' | 'FINANCE';
  } | null>(null);
  const [gdocsFinanceRecord, setGdocsFinanceRecord] = useState<ContractRecord | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  // Trạng thái form duyệt Pháp chế & Kế toán
  const [legalApproveNote, setLegalApproveNote] = useState('');
  const [saveAsKocTemplate, setSaveAsKocTemplate] = useState(true);
  const [kocLegalNotes, setKocLegalNotes] = useState('');
  const [financeApproveNote, setFinanceApproveNote] = useState('');
  const [quickPreviewDoc, setQuickPreviewDoc] = useState<LegalDocAttachment | null>(null);

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
      const deal = (r.dealId && dealMap.get(r.dealId)) || (r.dealCode && dealMap.get(r.dealCode)) || undefined;
      const koc = (r.kocId && kocMap.get(r.kocId)) || (deal?.kocId && kocMap.get(deal.kocId)) || undefined;
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

  const resolveRecordLegalAttachments = (r: ContractRecord): LegalDocAttachment[] => {
    return resolveContractLegalAttachments(r, dealMap, kocMap, data.records);
  };

  const isPendingLegal = (r: ContractRecord) => {
    const legalStep = r.steps.find(s => s.role === 'LEGAL' && s.version === r.version);
    if (r.approval === 'IN_REVIEW' && legalStep?.status === 'PENDING') return true;
    if (r.approval === 'IN_REVIEW' && (r.hasCustomTerms || r.isKocOwnForm || r.googleDocsReviewRouting?.requiresLegal) && (!legalStep || legalStep.status === 'PENDING')) {
      return true;
    }
    return false;
  };

  const isPendingFinance = (r: ContractRecord) => {
    const finStep = r.steps.find(s => s.role === 'FINANCE' && s.version === r.version);
    return r.approval === 'IN_REVIEW' && finStep?.status === 'PENDING';
  };

  const isGDocsPendingFinal = (r: ContractRecord) =>
    Boolean(r.googleDocsUrl) && r.approval !== 'APPROVED' && !r.signing.some(s => s.status === 'COMPLETED');

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
      r => !q || `${r.title} ${r.brand} ${r.partner} ${r.dealCode || ''} ${r.id}`.toLowerCase().includes(q),
    );
  }, [data.records, search]);

  const legalMatches: Record<LegalFilter, (r: ContractRecord) => boolean> = {
    PENDING_LEGAL: isPendingLegal,
    CLAUSE_DIFF: r => Boolean(r.googleDocsUrl || r.hasCustomTerms || (r.googleDocsReviewRouting?.clauseDiffs.length ?? 0) > 0),
    KOC_OWN_FORM: r => Boolean(r.isKocOwnForm),
    LEGAL_APPROVED: isLegalApproved,
    ALL: () => true,
  };

  const financeMatches: Record<FinanceFilter, (r: ContractRecord) => boolean> = {
    PENDING_FINANCE: isPendingFinance,
    VERIFIED_PROFILE: r => isPendingFinance(r) && isVerifiedLegalProfile(r),
    GDOCS_FINAL: isGDocsPendingFinal,
    BBNT_SETTLEMENT: r => isAcceptance(r.templateId) || documentOfTemplate(r.templateId) === 'BBNT',
    BUDGET_ALERT: hasBudgetOrBankAlert,
    FINANCE_APPROVED: isFinanceApproved,
    ALL: () => true,
  };

  const filteredRows = useMemo(() => {
    if (mode === 'LEGAL_PORTAL') {
      return searchedRecords.filter(legalMatches[legalFilter]);
    }
    return searchedRecords.filter(financeMatches[financeFilter]);
  }, [mode, searchedRecords, legalFilter, financeFilter]);

  const pageSize = 15;
  const pagedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const openLegalDecision = (record: ContractRecord, decision: 'APPROVED' | 'CHANGES' | 'REJECTED') => {
    setLegalApproveNote(
      decision === 'APPROVED'
        ? 'Pháp chế đã rà soát và đồng ý với các điều khoản sửa đổi / bổ sung trên hồ sơ.'
        : '',
    );
    setSaveAsKocTemplate(Boolean(record.hasCustomTerms || record.isKocOwnForm));
    setKocLegalNotes(record.customTermsSummary || record.internalNotes || '');
    setDecisionModal({ record, decision, role: 'LEGAL' });
  };

  const openFinanceDecision = (record: ContractRecord, decision: 'APPROVED' | 'CHANGES' | 'REJECTED') => {
    if (decision === 'APPROVED' && record.googleDocsUrl) {
      setGdocsFinanceRecord(record);
      return;
    }
    const hist = signingHistoryMap.get(record.id);
    setFinanceApproveNote(
      decision === 'APPROVED'
        ? hist?.recommendedFinanceNote ||
            'Đã kiểm tra khớp hạn mức Booking, thuế khấu trừ và thông tin tài khoản thụ hưởng.'
        : '',
    );
    setDecisionModal({ record, decision, role: 'FINANCE' });
  };

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
      setDecisionModal(null);
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

  const handleGDocsFinanceApprove = async (payload: { note: string; partyAEmail?: string; partyBEmail?: string }) => {
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
      onNotify?.(`Kế toán đã duyệt chốt (FINAL) và đẩy "${gdocsFinanceRecord.title}" sang WeSign`, 'success');
    } catch (err) {
      onNotify?.((err as Error).message, 'error');
    } finally {
      setActionBusy(false);
    }
  };

  // Thống kê tổng giá trị chờ Kế toán duyệt
  const totalPendingNetVnd = useMemo(() => {
    return data.records
      .filter(isPendingFinance)
      .reduce((sum, r) => sum + (financialMap.get(r.id)?.netAmount || 0), 0);
  }, [data.records, financialMap]);

  // Cột bảng Portal Pháp chế
  const legalColumns: Column<ContractRecord>[] = [
    {
      key: 'title',
      header: 'Hồ sơ & Giai đoạn',
      width: 235,
      render: r => {
        const docStage = documentOfTemplate(r.templateId);
        const stageBadge =
          docStage === 'HDNT'
            ? { label: '1. HĐNT Khung', cls: 'bg-sunken border-line text-ink-2' }
            : docStage === 'SOW'
              ? { label: '2. Phụ lục SOW', cls: 'bg-accent-soft/50 border-accent/30 text-accent' }
              : { label: '3. Nghiệm thu BBNT', cls: 'bg-positive-soft/60 border-positive/30 text-positive' };
        return (
          <div className="min-w-0 max-w-[260px] leading-tight space-y-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded border shrink-0 ${stageBadge.cls}`}>
                {stageBadge.label}
              </span>
              <span className="block truncate font-semibold text-ink">{r.title}</span>
            </div>
            <span className="block truncate text-2xs text-ink-3">
              {r.brand} · {r.dealCode || 'Hợp đồng khung'} · v{r.version}
            </span>
          </div>
        );
      },
    },
    {
      key: 'partner',
      header: 'Đối tác KOC · Định danh & CCCD/ĐKKD',
      width: 215,
      render: r => {
        const fin = financialMap.get(r.id);
        const docs = resolveRecordLegalAttachments(r);
        const isUnder50M = r.isKocOwnForm && (fin?.grossAmount || 0) > 0 && (fin?.grossAmount || 0) < 50_000_000;
        return (
          <div className="min-w-0 max-w-[235px] leading-tight space-y-1">
            <span className="block truncate font-medium text-ink">{r.partner}</span>
            <span className="block truncate text-2xs text-ink-3 font-code">
              CCCD/MST: {maskSensitiveNumber(fin?.cccdOrTaxCode, revealSensitive)}
            </span>
            {docs.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1 pt-0.5" onClick={e => e.stopPropagation()}>
                {docs.map(doc => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setQuickPreviewDoc(doc)}
                    className="inline-flex items-center gap-1 text-2xs font-medium px-1.5 py-0.5 rounded border border-accent/30 bg-accent-soft/50 text-accent hover:bg-accent-soft transition-colors"
                    title={`Bấm để xem ${doc.label}`}
                  >
                    <Eye className="w-3 h-3 shrink-0" />
                    {doc.docType === 'DKKD'
                      ? 'Xem ĐKKD'
                      : doc.docType === 'CCCD_BACK'
                        ? 'CCCD sau'
                        : 'CCCD trước'}
                  </button>
                ))}
              </div>
            ) : (
              <span className="block truncate text-2xs text-warning-strong font-medium">
                Chưa đính kèm CCCD/ĐKKD
              </span>
            )}
            {r.isKocOwnForm && (
              <span
                className={`inline-block text-2xs px-1.5 py-0.5 rounded border font-medium ${
                  isUnder50M
                    ? 'border-critical/40 bg-critical-soft text-critical'
                    : 'border-warning/40 bg-warning-soft text-warning-strong'
                }`}
              >
                {isUnder50M ? 'Mẫu riêng KOC (< 50tr: Cần ngoại lệ)' : 'Mẫu riêng KOC (≥ 50tr)'}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'clauses',
      header: 'Điều khoản sửa đổi & Phân luồng',
      width: 250,
      render: r => {
        const routing = r.googleDocsReviewRouting;
        const legalClauses = routing?.legalClauses || [];
        const diffsCount = routing?.clauseDiffs?.length || 0;
        if (!r.hasCustomTerms && !r.googleDocsUrl && !r.isKocOwnForm) {
          return <span className="text-2xs text-ink-3">Mẫu chuẩn (Miễn duyệt Pháp chế)</span>;
        }
        return (
          <div className="min-w-0 max-w-[270px] leading-tight space-y-1">
            <div className="flex flex-wrap items-center gap-1">
              {legalClauses.length > 0 ? (
                legalClauses.map(c => (
                  <span
                    key={c}
                    className="text-2xs font-semibold px-1.5 py-0.5 rounded border border-warning/40 bg-warning-soft text-warning-strong"
                  >
                    {c}
                  </span>
                ))
              ) : (
                <span className="text-2xs font-medium text-warning-strong">Có điều khoản chỉnh sửa riêng</span>
              )}
              {diffsCount > 0 && (
                <span className="text-2xs text-ink-3">({diffsCount} điểm khác biệt)</span>
              )}
            </div>
            <span className="block truncate text-2xs text-ink-2">
              {r.customTermsSummary || routing?.summary || 'Cần Pháp chế thẩm định điều khoản bản quyền & phạt vi phạm'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'legalStatus',
      header: 'Trạng thái Pháp chế',
      width: 145,
      render: r => {
        const step = r.steps.find(s => s.role === 'LEGAL' && s.version === r.version);
        let label = 'Miễn duyệt';
        let tone: StatusTone = 'neutral';
        if (step?.status === 'APPROVED' || r.googleDocsAuditTrail?.approvedByLegal) {
          label = 'Đã duyệt điều khoản';
          tone = 'positive';
        } else if (step?.status === 'CHANGES') {
          label = 'Yêu cầu sửa';
          tone = 'warning';
        } else if (step?.status === 'REJECTED') {
          label = 'Đã từ chối';
          tone = 'critical';
        } else if (isPendingLegal(r)) {
          label = 'Chờ Pháp chế (SLA 24h)';
          tone = 'warning';
        }
        return <Status tone={tone}>{label}</Status>;
      },
    },
    {
      key: 'actions',
      header: 'Thẩm định Pháp chế',
      width: 215,
      align: 'right',
      render: r => {
        const pending = isPendingLegal(r);
        return (
          <div className="inline-flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
            <Button size="sm" variant="secondary" icon={Scale} onClick={() => setInspectRecord(r)}>
              Rà soát điều khoản
            </Button>
            {pending && isLegalActor && r.ownerId !== me.id && (
              <Button size="sm" variant="primary" icon={CheckCircle2} disabled={busy || actionBusy} onClick={() => openLegalDecision(r, 'APPROVED')}>
                Duyệt
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  // Cột bảng Portal Kế toán
  const financeColumns: Column<ContractRecord>[] = [
    {
      key: 'title',
      header: 'Hồ sơ & Mã Booking',
      width: 225,
      render: r => {
        const docStage = documentOfTemplate(r.templateId);
        const stageBadge =
          docStage === 'HDNT'
            ? { label: '1. HĐNT Khung', cls: 'bg-sunken border-line text-ink-2' }
            : docStage === 'SOW'
              ? { label: '2. Phụ lục SOW', cls: 'bg-accent-soft/50 border-accent/30 text-accent' }
              : { label: '3. Nghiệm thu BBNT', cls: 'bg-positive-soft/60 border-positive/30 text-positive' };
        return (
          <div className="min-w-0 max-w-[250px] leading-tight space-y-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded border shrink-0 ${stageBadge.cls}`}>
                {stageBadge.label}
              </span>
              <span className="block truncate font-semibold text-ink">{r.title}</span>
            </div>
            <span className="block truncate text-2xs text-ink-3">
              {r.brand} · <span className="font-code text-ink-2">{r.dealCode || 'HĐ Khung'}</span> · v{r.version}
            </span>
          </div>
        );
      },
    },
    {
      key: 'beneficiary',
      header: 'Thụ hưởng · Hồ sơ pháp lý & CCCD/ĐKKD',
      width: 265,
      render: r => {
        const fin = financialMap.get(r.id);
        const docs = resolveRecordLegalAttachments(r);
        const hist = signingHistoryMap.get(r.id);
        return (
          <div className="min-w-0 max-w-[285px] leading-tight space-y-1">
            <span className="block truncate font-medium text-ink">{r.partner}</span>
            <span className="block truncate text-2xs text-ink-2 font-code">
              {fin?.bankName ? `${fin.bankName} · ` : ''}
              {maskSensitiveNumber(fin?.bankAccount, revealSensitive)} · MST/CCCD:{' '}
              {maskSensitiveNumber(fin?.cccdOrTaxCode, revealSensitive)}
            </span>

            {/* Gợi ý Kế toán: Hồ sơ pháp lý đã từng ký hay ký lần đầu */}
            {hist && (
              <div>
                {hist.status === 'SIGNED_VERIFIED' || hist.status === 'FINANCE_VERIFIED' ? (
                  <span
                    className="inline-flex items-center gap-1 text-2xs font-semibold px-1.5 py-0.5 rounded border border-positive/40 bg-positive-soft text-positive"
                    title={hist.detailMessage}
                  >
                    <ShieldCheck className="w-3 h-3 shrink-0" />
                    {hist.badgeLabel} ({hist.latestMatch?.id} · Miễn check lại)
                  </span>
                ) : hist.status === 'PROFILE_CHANGED' ? (
                  <span
                    className="inline-flex items-center gap-1 text-2xs font-semibold px-1.5 py-0.5 rounded border border-critical/40 bg-critical-soft text-critical"
                    title={hist.detailMessage}
                  >
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    {hist.badgeLabel}
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 text-2xs font-medium px-1.5 py-0.5 rounded border border-warning/40 bg-warning-soft text-warning-strong"
                    title={hist.detailMessage}
                  >
                    {hist.badgeLabel}
                  </span>
                )}
              </div>
            )}

            {/* Nút mở xem nhanh CCCD & ĐKKD ngay trên dòng bảng cho Kế toán */}
            {docs.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1 pt-0.5" onClick={e => e.stopPropagation()}>
                {docs.map(doc => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setQuickPreviewDoc(doc)}
                    className="inline-flex items-center gap-1 text-2xs font-medium px-1.5 py-0.5 rounded border border-accent/30 bg-accent-soft/50 text-accent hover:bg-accent-soft transition-colors"
                    title={`Bấm để xem trực tiếp ${doc.label} (${doc.fileName})`}
                  >
                    <Eye className="w-3 h-3 shrink-0" />
                    {doc.docType === 'DKKD'
                      ? 'Xem ĐKKD'
                      : doc.docType === 'CCCD_BACK'
                        ? 'Xem CCCD sau'
                        : 'Xem CCCD trước'}
                  </button>
                ))}
              </div>
            ) : (
              <span className="block truncate text-2xs text-critical font-medium">
                Thiếu tệp CCCD/ĐKKD trên R2
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'financials',
      header: 'Gross · Thuế · Thực chi (Net)',
      width: 225,
      align: 'right',
      render: r => {
        const fin = financialMap.get(r.id);
        if (!fin || fin.grossAmount === 0) {
          return <span className="text-2xs text-ink-3">Hợp đồng khung (Theo SOW)</span>;
        }
        return (
          <div className="leading-tight space-y-0.5 tabular-nums text-right">
            <div className="text-xs font-semibold text-ink">
              Net: {formatVnd(fin.netAmount)}
            </div>
            <div className="text-2xs text-ink-3">
              Gross {formatVnd(fin.grossAmount)} · Thuế {formatVnd(fin.taxAmount)}
            </div>
            {fin.isOverDealBudget ? (
              <span className="inline-block text-2xs font-semibold text-critical">
                Vượt trần Deal ({formatVnd(fin.dealBudget)})
              </span>
            ) : fin.isUnbudgetedSpend ? (
              <span className="inline-block text-2xs font-semibold text-critical">
                Hạn mức Deal 0đ (Unbudgeted)
              </span>
            ) : fin.missingBankInfo ? (
              <span className="inline-block text-2xs font-semibold text-warning-strong">
                Thiếu STK ngân hàng
              </span>
            ) : (
              <span className="inline-block text-2xs text-positive">
                Khớp hạn mức Booking
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'financeStatus',
      header: 'Trạng thái Kế toán',
      width: 145,
      render: r => {
        const finStep = r.steps.find(s => s.role === 'FINANCE' && s.version === r.version);
        let label = 'Chưa trình duyệt';
        let tone: StatusTone = 'neutral';
        if (r.signing.at(-1)?.status === 'COMPLETED') {
          label = 'Đã ký đủ 2 bên';
          tone = 'positive';
        } else if (r.approval === 'APPROVED' || finStep?.status === 'APPROVED') {
          label = 'Đã duyệt FINAL';
          tone = 'positive';
        } else if (finStep?.status === 'CHANGES') {
          label = 'Yêu cầu sửa';
          tone = 'warning';
        } else if (finStep?.status === 'REJECTED') {
          label = 'Đã từ chối';
          tone = 'critical';
        } else if (r.googleDocsUrl && r.approval === 'IN_REVIEW') {
          label = 'Chờ chốt & đẩy WeSign';
          tone = 'warning';
        } else if (finStep?.status === 'PENDING') {
          label = 'Chờ Kế toán (SLA 48h)';
          tone = 'warning';
        }
        return <Status tone={tone}>{label}</Status>;
      },
    },
    {
      key: 'actions',
      header: 'Thao tác Kế toán',
      width: 235,
      align: 'right',
      render: r => {
        const pendingFin = isPendingFinance(r);
        const gdocsPending = isGDocsPendingFinal(r);
        return (
          <div className="inline-flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
            <Button size="sm" variant="secondary" icon={CreditCard} onClick={() => setInspectRecord(r)}>
              Đối soát
            </Button>
            {isFinanceActor && gdocsPending ? (
              <Button
                size="sm"
                variant="primary"
                icon={Send}
                disabled={busy || actionBusy}
                onClick={() => setGdocsFinanceRecord(r)}
              >
                Duyệt &amp; WeSign
              </Button>
            ) : (
              isFinanceActor &&
              pendingFin &&
              r.ownerId !== me.id && (
                <Button
                  size="sm"
                  variant="primary"
                  icon={CheckCircle2}
                  disabled={busy || actionBusy}
                  onClick={() => openFinanceDecision(r, 'APPROVED')}
                >
                  Duyệt FINAL
                </Button>
              )
            )}
          </div>
        );
      },
    },
  ];

  const legalChipItems: { key: LegalFilter; label: string; count: number }[] = [
    { key: 'PENDING_LEGAL', label: 'Chờ Pháp chế duyệt', count: searchedRecords.filter(legalMatches.PENDING_LEGAL).length },
    { key: 'CLAUSE_DIFF', label: 'Sửa điều khoản / Google Docs', count: searchedRecords.filter(legalMatches.CLAUSE_DIFF).length },
    { key: 'KOC_OWN_FORM', label: 'Mẫu riêng KOC (≥ 50tr)', count: searchedRecords.filter(legalMatches.KOC_OWN_FORM).length },
    { key: 'LEGAL_APPROVED', label: 'Đã duyệt điều khoản', count: searchedRecords.filter(legalMatches.LEGAL_APPROVED).length },
    { key: 'ALL', label: 'Tất cả hồ sơ', count: searchedRecords.length },
  ];

  const financeChipItems: { key: FinanceFilter; label: string; count: number }[] = [
    { key: 'PENDING_FINANCE', label: 'Chờ Kế toán duyệt', count: searchedRecords.filter(financeMatches.PENDING_FINANCE).length },
    { key: 'GDOCS_FINAL', label: 'Google Docs chờ chốt WeSign', count: searchedRecords.filter(financeMatches.GDOCS_FINAL).length },
    { key: 'BBNT_SETTLEMENT', label: 'Nghiệm thu & Tất toán (BBNT)', count: searchedRecords.filter(financeMatches.BBNT_SETTLEMENT).length },
    { key: 'BUDGET_ALERT', label: 'Cảnh báo lệch trần / Thiếu STK', count: searchedRecords.filter(financeMatches.BUDGET_ALERT).length },
    { key: 'FINANCE_APPROVED', label: 'Đã duyệt FINAL', count: searchedRecords.filter(financeMatches.FINANCE_APPROVED).length },
    { key: 'ALL', label: 'Tất cả hồ sơ', count: searchedRecords.length },
  ];

  const inspectFinancials = inspectRecord ? financialMap.get(inspectRecord.id) : undefined;
  const inspectLegalStep = inspectRecord?.steps.find(s => s.role === 'LEGAL' && s.version === inspectRecord.version);
  const inspectFinanceStep = inspectRecord?.steps.find(s => s.role === 'FINANCE' && s.version === inspectRecord.version);

  return (
    <div className="space-y-4">
      {mode === 'LEGAL_PORTAL' ? (
        <StatRow>
          <Stat
            label="Hồ sơ chờ Pháp chế duyệt"
            value={`${data.records.filter(isPendingLegal).length} bộ`}
            tone={data.records.some(isPendingLegal) ? 'warning' : 'positive'}
            note="Cam kết SLA phản hồi trong 24h làm việc"
          />
          <Stat
            label="Hồ sơ sửa đổi điều khoản / Google Docs"
            value={`${data.records.filter(legalMatches.CLAUSE_DIFF).length} bộ`}
            note="Phân luồng tự động điều khoản bản quyền & phạt vi phạm"
          />
          <Stat
            label="Hợp đồng theo mẫu riêng KOC"
            value={`${data.records.filter(legalMatches.KOC_OWN_FORM).length} bộ`}
            note="Kiểm soát ngưỡng BR-01 (Giá trị hợp đồng ≥ 50.000.000đ)"
          />
          <Stat
            label="Mẫu KOC đã chuẩn hóa (Miễn duyệt lại)"
            value={`${data.templates.filter(t => t.scope === 'KOC_CUSTOM').length} mẫu`}
            tone="positive"
            note="Áp dụng tự động cho các đợt Booking tiếp theo"
          />
        </StatRow>
      ) : (
        <StatRow>
          <Stat
            label="Hồ sơ chờ Kế toán phê duyệt"
            value={`${data.records.filter(isPendingFinance).length} bộ`}
            tone={data.records.some(isPendingFinance) ? 'warning' : 'positive'}
            note={`Tổng thực chi Net chờ duyệt: ${formatVnd(totalPendingNetVnd)}`}
          />
          <Stat
            label="Google Docs chờ chốt FINAL & WeSign"
            value={`${data.records.filter(isGDocsPendingFinal).length} bộ`}
            tone={data.records.some(isGDocsPendingFinal) ? 'warning' : undefined}
            note="Kế toán là cấp phê duyệt cuối cùng trước khi phát lệnh ký"
          />
          <Stat
            label="Biên bản nghiệm thu chờ quyết toán"
            value={`${data.records.filter(financeMatches.BBNT_SETTLEMENT).length} bộ`}
            note="Đối soát link sản phẩm thực tế & giải ngân đợt 2"
          />
          <Stat
            label="Cảnh báo vượt trần / thiếu thông tin"
            value={`${data.records.filter(hasBudgetOrBankAlert).length} bộ`}
            tone={data.records.some(hasBudgetOrBankAlert) ? 'critical' : 'positive'}
            note="Kiểm tra khớp ngân sách Deal & tài khoản thụ hưởng"
          />
        </StatRow>
      )}

      <Panel flush>
        <div className="p-4 border-b border-line space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {mode === 'LEGAL_PORTAL' ? (
                <Scale className="w-4 h-4 text-accent" />
              ) : (
                <CreditCard className="w-4 h-4 text-accent" />
              )}
              <span className="text-sm font-semibold text-ink">
                {mode === 'LEGAL_PORTAL'
                  ? 'Bàn làm việc Ban Pháp chế — Thẩm định điều khoản & Biểu mẫu KOC'
                  : 'Bàn làm việc Phòng Kế toán — Đối soát Ngân sách, Thuế TNCN & Chốt trình ký WeSign'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {(isLegalActor || isFinanceActor) && (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={revealSensitive ? EyeOff : Eye}
                  onClick={() => setRevealSensitive(v => !v)}
                >
                  {revealSensitive ? 'Ẩn số CCCD / STK' : 'Hiện đầy đủ CCCD / STK'}
                </Button>
              )}
            </div>
          </div>

          <FilterBar
            search={{
              value: search,
              onChange: v => {
                setSearch(v);
                setPage(1);
              },
              placeholder: 'Tìm theo tên hồ sơ, KOC, nhãn hàng, mã booking...',
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
          onRowClick={r => setInspectRecord(r)}
          empty={
            <EmptyState
              title={
                mode === 'LEGAL_PORTAL'
                  ? 'Không có hồ sơ cần Pháp chế xử lý trong bộ lọc này'
                  : 'Không có hồ sơ cần Kế toán xử lý trong bộ lọc này'
              }
            />
          }
        />
        <Pagination page={page} pageSize={pageSize} total={filteredRows.length} onPageChange={setPage} />
      </Panel>

      {/* Hộp thoại Thẩm định Pháp chế / Đối soát Kế toán */}
      <Modal
        open={Boolean(inspectRecord)}
        onClose={() => setInspectRecord(null)}
        title={
          inspectRecord
            ? mode === 'LEGAL_PORTAL'
              ? `Thẩm định Pháp chế · ${inspectRecord.title}`
              : `Đối soát Kế toán & Duyệt chi · ${inspectRecord.title}`
            : 'Chi tiết thẩm định'
        }
        size="lg"
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
                  Xem văn bản A4
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={FileText}
                  onClick={() => {
                    const id = inspectRecord.id;
                    setInspectRecord(null);
                    onOpenRecord(id);
                  }}
                >
                  Mở hồ sơ đầy đủ
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {mode === 'LEGAL_PORTAL' && isLegalActor && isPendingLegal(inspectRecord) && inspectRecord.ownerId !== me.id && (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={actionBusy}
                      onClick={() => openLegalDecision(inspectRecord, 'CHANGES')}
                    >
                      Yêu cầu sửa
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={actionBusy}
                      onClick={() => openLegalDecision(inspectRecord, 'REJECTED')}
                    >
                      Từ chối
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      icon={CheckCircle2}
                      disabled={actionBusy}
                      onClick={() => openLegalDecision(inspectRecord, 'APPROVED')}
                    >
                      Pháp chế duyệt điều khoản
                    </Button>
                  </>
                )}

                {mode === 'FINANCE_PORTAL' && isFinanceActor && (isPendingFinance(inspectRecord) || isGDocsPendingFinal(inspectRecord)) && (
                  <>
                    {isPendingFinance(inspectRecord) && inspectRecord.ownerId !== me.id && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={actionBusy}
                          onClick={() => openFinanceDecision(inspectRecord, 'CHANGES')}
                        >
                          Yêu cầu sửa
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={actionBusy}
                          onClick={() => openFinanceDecision(inspectRecord, 'REJECTED')}
                        >
                          Từ chối
                        </Button>
                      </>
                    )}
                    {inspectRecord.googleDocsUrl ? (
                      <Button
                        size="sm"
                        variant="primary"
                        icon={Send}
                        disabled={actionBusy}
                        onClick={() => setGdocsFinanceRecord(inspectRecord)}
                      >
                        Kế toán duyệt FINAL &amp; Đẩy WeSign
                      </Button>
                    ) : (
                      inspectRecord.ownerId !== me.id && (
                        <Button
                          size="sm"
                          variant="primary"
                          icon={CheckCircle2}
                          disabled={actionBusy}
                          onClick={() => openFinanceDecision(inspectRecord, 'APPROVED')}
                        >
                          Kế toán duyệt chuẩn (FINAL)
                        </Button>
                      )
                    )}
                  </>
                )}
              </div>
            </div>
          )
        }
      >
        {inspectRecord && inspectFinancials && (
          <div className="space-y-4 text-xs">
            {/* Thông tin định danh & Đối tác */}
            <div className="rounded-xl border border-line bg-surface p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
                <div>
                  <span className="font-semibold text-ink text-sm block">{inspectRecord.partner}</span>
                  <span className="text-2xs text-ink-3">
                    Nhãn hàng: <strong className="text-ink-2">{inspectRecord.brand}</strong> · Mã Booking:{' '}
                    <strong className="font-code text-ink-2">{inspectRecord.dealCode || 'Hợp đồng khung'}</strong> · Mẫu:{' '}
                    <strong className="font-code text-ink-2">{inspectRecord.templateId}</strong>
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={revealSensitive ? EyeOff : Eye}
                  onClick={() => setRevealSensitive(v => !v)}
                >
                  {revealSensitive ? 'Ẩn thông tin nhạy cảm' : 'Mở xem CCCD & STK'}
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg bg-sunken p-2.5">
                  <span className="text-2xs text-ink-3 block">Số CCCD / Mã số thuế</span>
                  <span className="font-code font-semibold text-ink">
                    {maskSensitiveNumber(inspectFinancials.cccdOrTaxCode, revealSensitive)}
                  </span>
                </div>
                <div className="rounded-lg bg-sunken p-2.5">
                  <span className="text-2xs text-ink-3 block">Tài khoản thụ hưởng</span>
                  <span className="font-code font-semibold text-ink">
                    {maskSensitiveNumber(inspectFinancials.bankAccount, revealSensitive)}
                  </span>
                  <span className="text-2xs text-ink-2 block truncate">
                    {inspectFinancials.bankName || 'Chưa khai báo ngân hàng'}
                  </span>
                </div>
                <div className="rounded-lg bg-sunken p-2.5">
                  <span className="text-2xs text-ink-3 block">Điện thoại &amp; Người trình</span>
                  <span className="font-code font-medium text-ink">
                    {maskSensitiveNumber(inspectFinancials.phone, revealSensitive)}
                  </span>
                  <span className="text-2xs text-ink-2 block truncate">
                    PIC: {inspectRecord.ownerName}
                  </span>
                </div>
              </div>
            </div>

            {/* Khối đối chiếu Tệp đính kèm CCCD & ĐKKD trên Cloudflare R2 */}
            <LegalAttachmentsPanel
              attachments={resolveRecordLegalAttachments(inspectRecord)}
              entitySlug={inspectRecord.kocId || inspectRecord.partner || inspectRecord.id}
              legalType={
                inspectRecord.templateId.startsWith('COM-')
                  ? 'COMPANY'
                  : inspectRecord.templateId.startsWith('HKD-')
                    ? 'HOUSEHOLD'
                    : 'INDIVIDUAL'
              }
              editable
              onChange={async (nextAttachments) => {
                try {
                  const res = await contractApi<{ record: ContractRecord }>('/api/contracts', {
                    id: inspectRecord.id,
                    revision: inspectRecord.revision,
                    action: 'ATTACH_LEGAL_DOCS',
                    legalAttachments: nextAttachments,
                  });
                  setInspectRecord(res.record);
                  await onRefresh();
                } catch (err) {
                  onNotify?.((err as Error).message, 'error');
                }
              }}
              title="Hồ sơ pháp lý đính kèm: CCCD & Giấy phép ĐKKD (Cloudflare R2)"
            />

            {/* Khối đối soát tài chính & Thuế (luôn hiển thị chi tiết cho Kế toán & Pháp chế) */}
            <div className="rounded-xl border border-line bg-surface p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-accent" />
                  Bảng đối soát Giá trị hợp đồng, Thuế khấu trừ &amp; Hạn mức Booking
                </span>
                {inspectFinancials.isOverDealBudget ? (
                  <Status tone="critical">Vượt trần Booking</Status>
                ) : inspectFinancials.isUnbudgetedSpend ? (
                  <Status tone="critical">Chưa cấp hạn mức (0đ)</Status>
                ) : (
                  <Status tone="positive">Trong hạn mức duyệt</Status>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 tabular-nums">
                <div className="rounded-lg border border-line p-2.5">
                  <span className="text-2xs text-ink-3 block">Tổng giá trị (Gross)</span>
                  <span className="text-sm font-semibold text-ink">
                    {formatVnd(inspectFinancials.grossAmount)}
                  </span>
                </div>
                <div className="rounded-lg border border-line p-2.5">
                  <span className="text-2xs text-ink-3 block">{inspectFinancials.taxLabel}</span>
                  <span className="text-sm font-semibold text-warning-strong">
                    {formatVnd(inspectFinancials.taxAmount)}
                  </span>
                </div>
                <div className="rounded-lg border border-line bg-positive-soft/30 p-2.5">
                  <span className="text-2xs text-ink-3 block">Thực nhận KOC (Net)</span>
                  <span className="text-sm font-semibold text-positive">
                    {formatVnd(inspectFinancials.netAmount)}
                  </span>
                </div>
                <div className="rounded-lg border border-line p-2.5">
                  <span className="text-2xs text-ink-3 block">Tạm ứng / Còn lại</span>
                  <span className="text-xs font-semibold text-ink block">
                    Tạm ứng: {formatVnd(inspectFinancials.advanceAmount)}
                  </span>
                  <span className="text-2xs text-ink-2 block">
                    Tất toán: {formatVnd(inspectFinancials.remainingAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Khối Rà soát Điều khoản sửa đổi & Google Docs Diff */}
            <div className="rounded-xl border border-line bg-surface p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-ink flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-accent" />
                   So khớp Điều khoản sửa đổi (Clause Diffs) &amp; Trao đổi Google Docs
                </span>
                {inspectRecord.googleDocsUrl && (
                  <a
                    href={inspectRecord.googleDocsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-2xs font-semibold text-accent hover:underline"
                  >
                    Mở tài liệu Google Docs <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {inspectRecord.customTermsSummary && (
                <div className="rounded-lg border border-warning/40 bg-warning-soft p-2.5 text-ink">
                  <span className="font-semibold text-warning-strong block">Tóm tắt đề xuất sửa đổi từ KOC:</span>
                  <span>{inspectRecord.customTermsSummary}</span>
                </div>
              )}

              {inspectRecord.googleDocsReviewRouting?.clauseDiffs &&
              inspectRecord.googleDocsReviewRouting.clauseDiffs.length > 0 ? (
                <div className="space-y-2">
                  {inspectRecord.googleDocsReviewRouting.clauseDiffs.map((diff, idx) => (
                    <div key={idx} className="rounded-lg border border-line bg-sunken/50 p-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-ink">
                          {diff.clauseNumber}: {diff.title}
                        </span>
                        <span
                          className={`text-2xs font-semibold px-1.5 py-0.5 rounded border ${
                            diff.targetRole === 'FINANCE'
                              ? 'border-accent/30 bg-accent-soft text-accent'
                              : 'border-warning/40 bg-warning-soft text-warning-strong'
                          }`}
                        >
                          {diff.targetRole === 'FINANCE'
                            ? 'Phân luồng: Kế toán'
                            : diff.targetRole === 'LEGAL'
                              ? 'Phân luồng: Pháp chế'
                              : 'Pháp chế & Kế toán'}
                        </span>
                      </div>
                      {diff.originalText && (
                        <div className="text-2xs text-ink-3 line-through bg-surface p-2 rounded border border-line">
                          Mẫu gốc: {diff.originalText}
                        </div>
                      )}
                      {diff.modifiedText && (
                        <div className="text-2xs text-ink bg-surface p-2 rounded border border-line font-medium">
                          Bản sửa đổi: {diff.modifiedText}
                        </div>
                      )}
                      <div className="text-2xs text-ink-2">{diff.explanation}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-2xs text-ink-3">
                  Hồ sơ sử dụng điều khoản chuẩn, không phát sinh điểm khác biệt tự động trên Google Docs.
                </p>
              )}

              {/* Tiến độ 2 bước Pháp chế & Kế toán */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-line">
                <div className="rounded-lg border border-line p-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-2xs text-ink-3 block">Bước 1: Ban Pháp chế</span>
                    <span className="font-medium text-ink">
                      {inspectLegalStep?.reviewerName || 'Miễn duyệt (Mẫu chuẩn)'}
                    </span>
                  </div>
                  <Status
                    tone={
                      !inspectLegalStep || inspectLegalStep.status === 'APPROVED'
                        ? 'positive'
                        : inspectLegalStep.status === 'REJECTED'
                          ? 'critical'
                          : 'warning'
                    }
                  >
                    {!inspectLegalStep
                      ? 'Miễn duyệt'
                      : inspectLegalStep.status === 'APPROVED'
                        ? 'Đã duyệt'
                        : inspectLegalStep.status === 'CHANGES'
                          ? 'Yêu cầu sửa'
                          : inspectLegalStep.status === 'REJECTED'
                            ? 'Từ chối'
                            : 'Đang chờ'}
                  </Status>
                </div>
                <div className="rounded-lg border border-line p-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-2xs text-ink-3 block">Bước 2: Phòng Kế toán (FINAL)</span>
                    <span className="font-medium text-ink">
                      {inspectFinanceStep?.reviewerName || 'Lê Thị Thu Hà (Kế toán B2C)'}
                    </span>
                  </div>
                  <Status
                    tone={
                      inspectRecord.approval === 'APPROVED' || inspectFinanceStep?.status === 'APPROVED'
                        ? 'positive'
                        : inspectFinanceStep?.status === 'REJECTED'
                          ? 'critical'
                          : 'warning'
                    }
                  >
                    {inspectRecord.approval === 'APPROVED' || inspectFinanceStep?.status === 'APPROVED'
                      ? 'Đã duyệt FINAL'
                      : inspectFinanceStep?.status === 'CHANGES'
                        ? 'Yêu cầu sửa'
                        : inspectFinanceStep?.status === 'REJECTED'
                          ? 'Từ chối'
                          : 'Đang chờ'}
                  </Status>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Hộp thoại Pháp chế Xác nhận duyệt + Lưu mẫu riêng KOC */}
      {decisionModal && decisionModal.role === 'LEGAL' && decisionModal.decision === 'APPROVED' && (
        <Modal
          open={true}
          onClose={() => setDecisionModal(null)}
          title={`Pháp chế phê duyệt điều khoản · ${decisionModal.record.partner}`}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDecisionModal(null)} disabled={actionBusy}>
                Hủy
              </Button>
              <Button
                variant="primary"
                icon={CheckCircle2}
                disabled={actionBusy}
                onClick={() =>
                  submitDecision(decisionModal.record, 'APPROVED', legalApproveNote, {
                    saveAsKocTemplate,
                    kocLegalNotes,
                  })
                }
              >
                {actionBusy ? 'Đang lưu...' : 'Xác nhận duyệt Pháp chế'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <Field label="Nhận xét thẩm định của Pháp chế" htmlFor="portal-legal-note">
              <Textarea
                id="portal-legal-note"
                rows={3}
                value={legalApproveNote}
                onChange={e => setLegalApproveNote(e.target.value)}
                placeholder="Nhập ý kiến thẩm định điều khoản..."
              />
            </Field>

            <div className="rounded-lg border border-line bg-surface p-3 space-y-3">
              <label className="flex items-start gap-2.5 text-xs font-medium text-ink cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-line text-accent"
                  checked={saveAsKocTemplate}
                  onChange={e => setSaveAsKocTemplate(e.target.checked)}
                />
                <span>
                  Lưu làm Mẫu hợp đồng đã duyệt riêng cho KOC ({decisionModal.record.partner}) — Miễn duyệt lại cho các đợt Booking sau
                </span>
              </label>

              {saveAsKocTemplate && (
                <Field label="Lưu ý pháp lý bắt buộc khi tái sử dụng mẫu KOC này" htmlFor="portal-koc-legal-notes">
                  <Textarea
                    id="portal-koc-legal-notes"
                    rows={2}
                    value={kocLegalNotes}
                    onChange={e => setKocLegalNotes(e.target.value)}
                    placeholder="Ví dụ: Chỉ được chạy Spark Ads tối đa 45 ngày, thanh toán trong 05 ngày..."
                  />
                </Field>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Hộp thoại Kế toán duyệt chuẩn hoặc Yêu cầu sửa / Từ chối */}
      {decisionModal && !(decisionModal.role === 'LEGAL' && decisionModal.decision === 'APPROVED') && (
        <ConfirmDialog
          open={true}
          title={
            decisionModal.decision === 'APPROVED'
              ? 'Kế toán phê duyệt hồ sơ (FINAL)'
              : decisionModal.decision === 'CHANGES'
                ? 'Yêu cầu chỉnh sửa hồ sơ'
                : 'Từ chối phê duyệt hồ sơ'
          }
          tone={decisionModal.decision === 'REJECTED' ? 'danger' : undefined}
          confirmLabel={
            decisionModal.decision === 'APPROVED'
              ? 'Xác nhận duyệt FINAL'
              : decisionModal.decision === 'CHANGES'
                ? 'Gửi yêu cầu sửa'
                : 'Từ chối hồ sơ'
          }
          reason={{
            label:
              decisionModal.decision === 'APPROVED'
                ? 'Ghi chú kiểm soát ngân sách & thuế (không bắt buộc)'
                : 'Lý do yêu cầu sửa / từ chối (bắt buộc)',
            required: decisionModal.decision !== 'APPROVED',
          }}
          onConfirm={note =>
            submitDecision(
              decisionModal.record,
              decisionModal.decision,
              note || 'Đã kiểm tra khớp hạn mức Booking, thuế khấu trừ và thông tin tài khoản thụ hưởng.',
            )
          }
          onCancel={() => setDecisionModal(null)}
          onOpenChange={o => !o && setDecisionModal(null)}
        />
      )}

      {/* Hộp thoại Kế toán duyệt chốt Google Docs & Đẩy sang WeSign */}
      {gdocsFinanceRecord && (
        <GoogleDocsFinanceApproveDialog
          open={Boolean(gdocsFinanceRecord)}
          record={gdocsFinanceRecord}
          busy={actionBusy}
          onClose={() => setGdocsFinanceRecord(null)}
          onConfirm={handleGDocsFinanceApprove}
        />
      )}
    </div>
  );
}
