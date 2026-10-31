'use client';

/**
 * Hợp đồng: danh sách hồ sơ → hồ sơ chi tiết → form tạo/sửa theo mẫu pháp chế,
 * kèm Portal Pháp chế phê duyệt, Portal Kế toán đối soát & phê duyệt,
 * và Quản lý danh mục & biểu mẫu hợp đồng chuẩn của Pháp chế.
 * Dữ liệu và quyền lấy từ máy chủ (/api/contracts); giao diện không tự cấp quyền.
 * Từ màn Booking, nút “HĐ” mở hồ sơ của booking đó, chưa có thì mở form tạo đã điền sẵn.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, FilePen, FileText, FolderKanban, Link2, Plus, RefreshCw } from 'lucide-react';
import type { BookingDealItem, KocItem, LegalDocAttachment } from '../../lib/types';
import { saveSyncedKocLegalAttachments } from '../koc/kocUtils';
import type { ContractField, ContractRecord, DocBlock, LegalTemplate } from '../../lib/contracts/types';
import { formatDate } from '../../lib/format';
import { Button, Chips, DataTable, EmptyState, FilterBar, Modal, PageActions, Pagination, Panel, Person, Select, Stat, StatRow, Status, Tabs } from '../ui';
import type { Column } from '../ui';
import { ApiError, contractApi, type ContractBootstrap } from '../contracts/api';
import { browserDemoEnabled, downloadBrowserDemo, enableBrowserDemo } from '../contracts/browserDemo';
import { computeSigningProgress, contractStatus, isAcceptance, OFFICIAL_3STAGE_TEMPLATE_IDS, resolveActiveLegalProfile } from '../contracts/contractUi';
import { ContractCatalogView } from '../contracts/ContractCatalogView';
import { ContractApprovalPortalView } from '../contracts/ContractApprovalPortalView';
import { computeFinanceReminderItems } from '../contracts/FinanceReminderInboxView';
import { ContractDetail } from '../contracts/ContractDetail';
import { ContractDocumentViewer } from '../contracts/ContractDocumentViewer';
import { ContractForm, type ContractFormInit, type ContractFormPayload } from '../contracts/ContractForm';
import { ContractSetReconciliationView } from '../contracts/ContractSetReconciliationView';
import { OperationalReportDrawer } from '../OperationalReportDrawer';
import { detectSubjectKind, extractSowPaymentScheduleAndAdvance } from '../../lib/contracts/contractRules';
import { documentOfTemplate, type ContractDocument } from '../../lib/planDealLink';

/** Yêu cầu mở hồ sơ của một booking hoặc KOC / Hồ sơ pháp lý (từ màn Booking hoặc Danh bạ KOC). `nonce` đổi mỗi lần bấm. */
export interface ContractIntent {
  dealId?: string;
  deal?: BookingDealItem;
  kocId?: string;
  legalProfileId?: string;
  nonce: number;
  /** Loại tài liệu cần mở hoặc soạn của deal/KOC: hợp đồng nguyên tắc, SOW hoặc biên bản nghiệm thu. */
  document?: ContractDocument;
  fromBooking?: boolean;
}

type Screen =
  | { mode: 'list' }
  | { mode: 'deal_docs' }
  | { mode: 'legal_portal' }
  | { mode: 'finance_portal' }
  | { mode: 'finance_payment_portal' }
  | { mode: 'finance_reminders' }
  | { mode: 'sets' }
  | { mode: 'catalog' }
  | { mode: 'detail'; id: string }
  | { mode: 'form'; editId?: string; init?: ContractFormInit };
const isDealDoc = (r: ContractRecord) => {
  const doc = documentOfTemplate(r.templateId);
  return doc === 'SOW' || doc === 'BBNT';
};

type Filter = 'ALL' | 'MINE' | 'REVIEW' | 'GOOGLE_DOCS' | 'SIGN' | 'DONE' | 'NEED_ACCEPTANCE';

export function ContractManagementView({
  deals = [],
  kocs = [],
  intent,
  onNotify,
  onSyncDealContractStatus,
  onSyncKocLegalProfileContract,
  onBackToBooking,
  demoMode = false,
  currentUserId,
}: {
  deals?: BookingDealItem[];
  kocs?: KocItem[];
  intent?: ContractIntent | null;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onSyncDealContractStatus?: (dealId: string, patch: Partial<BookingDealItem>) => void;
  onSyncKocLegalProfileContract?: (
    kocId: string,
    legalProfileId: string | undefined,
    frameworkData: {
      contractCode?: string;
      status?: 'CHƯA_KÝ' | 'ĐANG_TRÌNH_KÝ' | 'ĐÃ_KÝ';
      signedAt?: string;
      driveUrl?: string;
      googleDocsUrl?: string;
      legalAttachments?: LegalDocAttachment[];
    }
  ) => void;
  onBackToBooking?: () => void;
  demoMode?: boolean;
  currentUserId?: string;
}) {
  const effectiveDeals = useMemo(() => {
    if (!intent?.deal) return deals;
    return deals.some(d => d.id === intent.deal!.id)
      ? deals.map(d => (d.id === intent.deal!.id ? intent.deal! : d))
      : [intent.deal, ...deals];
  }, [deals, intent]);
  const [data, setData] = useState<ContractBootstrap | null>(null);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [screen, setScreen] = useState<Screen>({ mode: 'list' });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');

  useEffect(() => {
    const onSubView = (e: Event) => {
      const detail = (e as CustomEvent<{ tab?: string; subView?: string }>).detail;
      if (detail?.tab !== 'contracts') return;
      if (detail.subView === 'RECORDS') {
        setFilter('ALL');
        setScreen({ mode: 'list' });
      } else if (detail.subView === 'DEAL_DOCS') {
        setFilter('ALL');
        setScreen({ mode: 'deal_docs' });
      } else if (detail.subView === 'BBNT') {
        setFilter('NEED_ACCEPTANCE');
        setScreen({ mode: 'deal_docs' });
      } else if (detail.subView === 'APPROVAL_PORTAL') {
        setScreen({ mode: 'legal_portal' });
      }
    };
    window.addEventListener('upbase-sidebar-subview', onSubView);
    return () => window.removeEventListener('upbase-sidebar-subview', onSubView);
  }, []);
  const [page, setPage] = useState(1);
  const [quickViewRecord, setQuickViewRecord] = useState<ContractRecord | null>(null);
  const [quickViewDoc, setQuickViewDoc] = useState<{ paragraphs: string[]; blocks?: DocBlock[]; fields?: ContractField[]; values?: Record<string, string> } | null>(null);
  const quickViewRecordId = quickViewRecord?.id || '';
  const [prevQuickViewRecordId, setPrevQuickViewRecordId] = useState(quickViewRecordId);
  if (quickViewRecordId !== prevQuickViewRecordId) {
    setPrevQuickViewRecordId(quickViewRecordId);
    setQuickViewDoc(null);
  }
  const [isContractReportOpen, setIsContractReportOpen] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [portalDealLookupCode, setPortalDealLookupCode] = useState('');

  const refresh = useCallback(async () => {
    if (demoMode) enableBrowserDemo();
    const result = await contractApi<ContractBootstrap>('/api/contracts');
    for (const r of result.records || []) {
      if (r.kocId && r.legalAttachments && r.legalAttachments.length > 0) {
        saveSyncedKocLegalAttachments(r.kocId, r.legalProfileId, r.legalAttachments);
      }
    }
    setData(result);
    setLoadError(null);
    return result;
  }, [demoMode]);

  useEffect(() => {
    (async () => {
      if (currentUserId) {
        await contractApi('/api/contracts/demo', { id: currentUserId }).catch(() => undefined);
      } else if (process.env.NODE_ENV === 'development') {
        await contractApi('/api/auth/me').catch(() => undefined);
      }
      const nextData = await refresh();
      if (!intent) {
        if (nextData.actor.roles.includes('LEGAL') && !nextData.actor.roles.includes('LEAD')) {
          setScreen({ mode: 'legal_portal' });
        } else if (nextData.actor.roles.includes('FINANCE') && !nextData.actor.roles.includes('LEAD')) {
          setScreen({ mode: 'finance_portal' });
        } else {
          setScreen(prev =>
            prev.mode === 'legal_portal' ||
            prev.mode === 'finance_portal' ||
            prev.mode === 'finance_payment_portal' ||
            prev.mode === 'finance_reminders'
              ? { mode: 'list' }
              : prev,
          );
        }
      }
    })().catch(e => setLoadError(e instanceof ApiError ? e : new ApiError((e as Error).message, 503)));
  }, [refresh, currentUserId, intent]);

  // Tải văn bản hợp đồng khi bấm Xem nhanh trên bảng danh sách
  useEffect(() => {
    if (!quickViewRecord) return;
    let cancelled = false;
    contractApi<{ paragraphs: string[]; blocks?: DocBlock[]; fields?: ContractField[]; values?: Record<string, string> }>(`/api/contracts/${quickViewRecord.id}/document?preview=1`)
      .then(r => { if (!cancelled) setQuickViewDoc(r); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [quickViewRecord]);

  // Mở theo booking hoặc KOC / Hồ sơ pháp lý khi được gọi từ màn Booking hoặc Danh bạ KOC.
  const [handledIntent, setHandledIntent] = useState<number | null>(null);
  if (intent && data && handledIntent !== intent.nonce) {
    setHandledIntent(intent.nonce);
    const latest = (rs: ContractRecord[]) => [...rs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    if (intent.kocId && !intent.dealId) {
      const koc = kocs.find(k => k.id === intent.kocId);
      const activeProf = resolveActiveLegalProfile(koc, undefined, intent.legalProfileId);
      const baseSubject = detectSubjectKind(koc);
      const subject =
        baseSubject === 'CTV'
          ? 'CTV'
          : activeProf?.legalType === 'COMPANY'
            ? 'COM'
            : activeProf?.legalType === 'HOUSEHOLD'
              ? 'HKD'
              : baseSubject;
      const doc = intent.document || 'HDNT';
      const templateId = doc === 'HDNT' ? `${subject}-HDNT` : doc === 'SOW' ? `${subject}-SOW` : `${subject}-VID-BBNT`;
      setScreen({
        mode: 'form',
        init: {
          kocId: intent.kocId,
          legalProfileId: intent.legalProfileId || activeProf?.id,
          kind: doc === 'BBNT' ? 'ACCEPTANCE' : 'CONTRACT',
          docStage: doc,
          templateId,
        },
      });
    } else if (intent.document) {
      // Deal của kế hoạch: mở hồ sơ đã có của đúng loại tài liệu, chưa có thì mở form soạn theo mẫu bản mới
      const doc = intent.document;
      const deal = intent.deal || effectiveDeals.find(d => d.id === intent.dealId);
      const koc = kocs.find(k => k.id === (intent.kocId || deal?.kocId));
      const activeProf = resolveActiveLegalProfile(koc, deal, intent.legalProfileId || deal?.legalProfileId);
      const baseSubject = detectSubjectKind(koc, deal);
      const subject =
        baseSubject === 'CTV'
          ? 'CTV'
          : activeProf?.legalType === 'COMPANY'
            ? 'COM'
            : activeProf?.legalType === 'HOUSEHOLD'
              ? 'HKD'
              : baseSubject;
      const sameDeal = (r: ContractRecord) => r.dealId === intent.dealId || Boolean(deal?.dealCode && r.dealCode === deal.dealCode);
      const sameKocForDoc = (r: ContractRecord) => sameDeal(r) || Boolean(deal?.kocId && r.kocId === deal.kocId);
      const existing = latest(data.records.filter(r => documentOfTemplate(r.templateId) === doc && (doc === 'HDNT' ? sameKocForDoc(r) && r.templateId.startsWith(`${subject}-`) : sameDeal(r))));
      if (existing) setScreen({ mode: 'detail', id: existing.id });
      else {
        const templateId = doc === 'HDNT' ? `${subject}-HDNT` : doc === 'SOW' ? `${subject}-SOW` : `${subject}-VID-BBNT`;
        if (!data.templates.some(t => t.id === templateId)) {
          onNotify?.(subject === 'CTV' && doc === 'SOW' ? 'KOC thuộc nhóm CTV kênh không có SOW, chỉ có hợp đồng nguyên tắc và biên bản nghiệm thu theo tháng.' : `Chưa có mẫu ${templateId} trong danh mục biểu mẫu.`, 'warning');
          setScreen({ mode: 'list' });
        } else {
          const sameKoc = (r: ContractRecord) => sameDeal(r) || Boolean(deal?.kocId && r.kocId === deal.kocId);
          const framework = latest(data.records.filter(r => documentOfTemplate(r.templateId) === 'HDNT' && r.templateId.startsWith(`${subject}-`) && sameKoc(r)));
          const sow = latest(data.records.filter(r => documentOfTemplate(r.templateId) === 'SOW' && sameDeal(r)));
          const parentId = doc === 'SOW' ? framework?.id : doc === 'BBNT' ? sow?.id || framework?.id : undefined;
          setScreen({ mode: 'form', init: { dealId: intent.dealId, kocId: intent.kocId || deal?.kocId, legalProfileId: intent.legalProfileId || deal?.legalProfileId || activeProf?.id, kind: doc === 'BBNT' ? 'ACCEPTANCE' : 'CONTRACT', docStage: doc, templateId, parentId } });
        }
      }
    } else {
      const deal = intent.deal || effectiveDeals.find(d => d.id === intent.dealId);
      const sameDeal = (r: ContractRecord) => r.dealId === intent.dealId || Boolean(deal?.dealCode && r.dealCode === deal.dealCode);
      const existing = latest(data.records.filter(r => sameDeal(r) && !isAcceptance(r.templateId)));
      const koc = kocs.find(k => k.id === (intent.kocId || deal?.kocId));
      const activeProf = resolveActiveLegalProfile(koc, deal, intent.legalProfileId || deal?.legalProfileId);
      const baseSubject = detectSubjectKind(koc, deal);
      const subject =
        baseSubject === 'CTV'
          ? 'CTV'
          : activeProf?.legalType === 'COMPANY'
            ? 'COM'
            : activeProf?.legalType === 'HOUSEHOLD'
              ? 'HKD'
              : baseSubject;
      const framework = latest(data.records.filter(r => documentOfTemplate(r.templateId) === 'HDNT' && r.templateId.startsWith(`${subject}-`) && (sameDeal(r) || Boolean(deal?.kocId && r.kocId === deal.kocId))));
      const nextStage = subject === 'CTV' ? 'HDNT' : 'SOW';
      const nextTemplateId = nextStage === 'SOW' ? `${subject}-SOW` : `${subject}-HDNT`;
      setScreen(
        existing
          ? { mode: 'detail', id: existing.id }
          : {
              mode: 'form',
              init: {
                dealId: intent.dealId,
                kocId: intent.kocId || deal?.kocId,
                legalProfileId: intent.legalProfileId || deal?.legalProfileId || activeProf?.id,
                kind: 'CONTRACT',
                docStage: nextStage,
                templateId: nextTemplateId,
                parentId: framework?.id,
              },
            },
      );
    }
  }

  const record = screen.mode === 'detail' || (screen.mode === 'form' && screen.editId)
    ? data?.records.find(r => r.id === (screen.mode === 'detail' ? screen.id : screen.editId))
    : undefined;

  const syncDealStatusForRecord = (updatedRec: ContractRecord) => {
    const docKind = documentOfTemplate(updatedRec.templateId);
    const isCompleted = updatedRec.signing.at(-1)?.status === 'COMPLETED';
    const vMap = updatedRec.values || {};
    const docDate = vMap['token:[DDMMYY]'] || vMap['token:[DD/MM/YYYY]'] || '';
    const kocCode = vMap['token:[ID KOC]'] || updatedRec.dealCode || 'KOC';
    const signedUrl =
      updatedRec.signing.at(-1)?.signedFileUrl ||
      updatedRec.contractSystem?.signedFileUrl ||
      (isCompleted ? `/api/contracts/${updatedRec.id}/document?version=${updatedRec.version}` : undefined);
    const frameworkCode =
      updatedRec.contractSystem?.contractCode || `${docDate || '26'}/${kocCode}/HĐNT-UPB`;

    const resolvedKocId =
      updatedRec.kocId ||
      effectiveDeals.find(
        d => d.id === updatedRec.dealId || (updatedRec.dealCode && d.dealCode === updatedRec.dealCode),
      )?.kocId;

    if (resolvedKocId && updatedRec.legalAttachments && updatedRec.legalAttachments.length > 0) {
      saveSyncedKocLegalAttachments(resolvedKocId, updatedRec.legalProfileId, updatedRec.legalAttachments);
    }

    const isReadyOrInReview =
      isCompleted ||
      updatedRec.approval === 'APPROVED' ||
      updatedRec.approval === 'IN_REVIEW' ||
      updatedRec.signing.length > 0;
    const dealDocStatus: 'CHƯA_LẬP' | 'CHỜ_KÝ' | 'ĐÃ_KÝ' = isCompleted
      ? 'ĐÃ_KÝ'
      : isReadyOrInReview
        ? 'CHỜ_KÝ'
        : 'CHƯA_LẬP';

    if (
      resolvedKocId &&
      onSyncKocLegalProfileContract &&
      (docKind === 'HDNT' || (updatedRec.legalAttachments && updatedRec.legalAttachments.length > 0))
    ) {
      onSyncKocLegalProfileContract(resolvedKocId, updatedRec.legalProfileId, {
        ...(docKind === 'HDNT'
          ? {
              contractCode: frameworkCode,
              status: isCompleted ? 'ĐÃ_KÝ' : isReadyOrInReview ? 'ĐANG_TRÌNH_KÝ' : 'CHƯA_KÝ',
              signedAt: isCompleted ? new Date().toISOString() : undefined,
              driveUrl: signedUrl,
              googleDocsUrl: updatedRec.contractSystem?.googleDocsUrl,
            }
          : {}),
        legalAttachments: updatedRec.legalAttachments,
      });
    }

    if (!(updatedRec.dealId || updatedRec.dealCode) || !onSyncDealContractStatus) return;
    const targetDealId = updatedRec.dealId || effectiveDeals.find(d => d.dealCode === updatedRec.dealCode)?.id || updatedRec.dealCode || '';
    if (docKind === 'SOW') {
      const sowPay = extractSowPaymentScheduleAndAdvance(vMap, updatedRec.templateId);
      onSyncDealContractStatus(targetDealId, {
        dealCode: updatedRec.dealCode,
        contractAppendixCode:
          updatedRec.contractSystem?.contractCode || `PL01-${docDate || '26'}/${kocCode}`,
        contractAppendixStatus: dealDocStatus,
        contractAppendixGoogleDocsUrl: updatedRec.contractSystem?.googleDocsUrl,
        contractAppendixSignedUrl: signedUrl,
        paymentScheduleOption: sowPay.paymentScheduleOption,
        advanceAmount: sowPay.paymentScheduleOption === 'TWO_TIMES' ? sowPay.advanceAmount : 0,
        soTienTamUngTruoc: sowPay.paymentScheduleOption === 'TWO_TIMES' ? sowPay.advanceAmount : 0,
      });
    } else if (docKind === 'HDNT') {
      onSyncDealContractStatus(targetDealId, {
        dealCode: updatedRec.dealCode,
        masterContractCode: frameworkCode,
        masterContractStatus: dealDocStatus,
        masterContractGoogleDocsUrl: updatedRec.contractSystem?.googleDocsUrl,
        masterContractSignedUrl: signedUrl,
      });
    } else if (docKind === 'BBNT') {
      onSyncDealContractStatus(targetDealId, {
        dealCode: updatedRec.dealCode,
        bbntCode:
          updatedRec.contractSystem?.contractCode || `BBNT-${docDate || '26'}/${kocCode}`,
        bbntStatus: dealDocStatus,
        bbntGoogleDocsUrl: updatedRec.contractSystem?.googleDocsUrl,
        bbntSignedUrl: signedUrl,
      });
    }
  };

  /** Gửi một thao tác lên máy chủ. Thành công: tải lại, mở hồ sơ, báo bằng toast. */
  const act = async (payload: Record<string, unknown>, done = 'Đã cập nhật hồ sơ') => {
    setBusy(true);
    try {
      if (payload.action === 'REFRESH_ONLY') {
        await refresh();
        const updatedRecord = payload.updatedRecord as ContractRecord | undefined;
        if (updatedRecord) {
          syncDealStatusForRecord(updatedRecord);
          setScreen({ mode: 'detail', id: updatedRecord.id });
        }
        onNotify?.(done, 'success');
        return updatedRecord;
      }
      const result = await contractApi<{ record: ContractRecord }>('/api/contracts', { id: record?.id, revision: record?.revision, ...payload });
      await refresh();
      syncDealStatusForRecord(result.record);
      setScreen({ mode: 'detail', id: result.record.id });
      onNotify?.(done, 'success');
      return result.record;
    } catch (e) {
      onNotify?.((e as Error).message, 'error');
      return undefined;
    } finally {
      setBusy(false);
    }
  };

  // Đang xem hồ sơ có luồng ký thật: đọc lại tiến độ mỗi 2 phút (máy chủ chỉ ghi khi có thay đổi).
  useEffect(() => {
    const s = record?.signing.at(-1);
    if (screen.mode !== 'detail' || !data?.config.wesign || !s || s.provider === 'DEMO' || ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(s.status)) return;
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible' || busy) return;
      contractApi('/api/contracts', { id: record!.id, revision: record!.revision, action: 'SYNC_WESIGN' }).then(() => refresh()).catch(() => undefined);
    }, 120000);
    return () => clearInterval(timer);
  }, [screen.mode, record, data?.config.wesign, busy, refresh]);

  const me = data?.actor;
  const parentIdsWithChildren = useMemo(
    () => new Set((data?.records || []).map(c => c.parentId).filter(Boolean) as string[]),
    [data?.records],
  );
  const firstDealByKocId = useMemo(() => {
    const map = new Map<string, BookingDealItem>();
    for (const d of effectiveDeals) {
      if (d.kocId && !map.has(d.kocId)) {
        map.set(d.kocId, d);
      }
    }
    return map;
  }, [effectiveDeals]);

  const waitingMe = (r: ContractRecord) =>
    r.approval === 'IN_REVIEW' &&
    r.steps.some(
      s =>
        s.status === 'PENDING' &&
        (s.reviewerId === me?.id || (me?.id !== r.ownerId && me?.roles.includes(s.role))),
    );
  const awaitingSign = (r: ContractRecord) => r.approval === 'APPROVED' && r.signing.at(-1)?.status !== 'COMPLETED';
  const done = (r: ContractRecord) => r.signing.at(-1)?.status === 'COMPLETED';
  const needAcceptance = (r: ContractRecord) =>
    r.signing.at(-1)?.status === 'COMPLETED' &&
    !isAcceptance(r.templateId) &&
    !(r.templateId.endsWith('-HDNT') && r.templateId !== 'CTV-HDNT') &&
    !parentIdsWithChildren.has(r.id);

  const matches: Record<Filter, (r: ContractRecord) => boolean> = {
    ALL: () => true,
    MINE: r => r.ownerId === me?.id,
    REVIEW: waitingMe,
    GOOGLE_DOCS: (r: ContractRecord) => Boolean(r.googleDocsUrl || r.hasCustomTerms),
    SIGN: awaitingSign,
    DONE: done,
    NEED_ACCEPTANCE: needAcceptance,
  };

  // Tab "Hợp đồng" chỉ có hợp đồng nguyên tắc; phụ lục SOW và BBNT gắn theo deal nằm ở tab riêng.
  const showDealDocs = screen.mode === 'deal_docs';
  const tabRecords = useMemo(
    () => (data?.records || []).filter(r => isDealDoc(r) === showDealDocs),
    [data, showDealDocs],
  );
  const kocHasDeal = (kocId?: string) => Boolean(kocId && firstDealByKocId.has(kocId));
  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tabRecords.filter(r => !q || `${r.title} ${r.brand} ${r.partner} ${r.dealCode || ''}`.toLowerCase().includes(q));
  }, [tabRecords, search]);
  const rows = searched.filter(matches[filter]);
  const pageSize = 20;
  const [pagedKey, setPagedKey] = useState('');
  if (`${search}|${filter}|${showDealDocs}` !== pagedKey) {
    setPagedKey(`${search}|${filter}|${showDealDocs}`);
    setPage(1);
    if (showDealDocs ? filter === 'GOOGLE_DOCS' : filter === 'NEED_ACCEPTANCE') setFilter('ALL');
  }

  const isFinanceUser = Boolean(me?.roles.includes('FINANCE'));
  const chipKeys: Filter[] = showDealDocs
    ? [
        'ALL',
        'MINE',
        ...(isFinanceUser ? (['REVIEW'] as const) : []),
        'SIGN',
        'DONE',
        'NEED_ACCEPTANCE',
      ]
    : [
        'ALL',
        'MINE',
        ...(isFinanceUser ? (['REVIEW'] as const) : []),
        'GOOGLE_DOCS',
        'SIGN',
        'DONE',
      ];
  const chips = chipKeys.map(key => ({
    key,
    label: {
      ALL: 'Tất cả',
      MINE: 'Của tôi',
      REVIEW: 'Chờ tôi duyệt',
      GOOGLE_DOCS: 'Mẫu KOC / sửa điều khoản',
      SIGN: 'Chờ ký',
      DONE: 'Đã ký',
      NEED_ACCEPTANCE: 'Cần lập nghiệm thu',
    }[key],
    count: searched.filter(matches[key]).length,
  }));

  const columns: Column<ContractRecord>[] = [
    {
      key: 'title',
      header: 'Hồ sơ',
      width: 240,
      render: r => {
        const tpl = data?.templates.find(t => t.id === r.templateId);
        const docStage = documentOfTemplate(r.templateId);
        const stageName =
          docStage === 'HDNT'
            ? 'Hợp đồng nguyên tắc'
            : docStage === 'SOW'
              ? 'Phụ lục SOW'
              : 'Biên bản nghiệm thu';
        return (
          <div className="min-w-0 max-w-[260px] leading-snug space-y-0.5">
            <span className="block truncate font-medium text-ink">{r.title}</span>
            <span className="block truncate text-2xs text-ink-3">
              {stageName} · {r.isKocOwnForm && r.customFile ? r.customFile.filename : (tpl?.id || r.templateId)} · v{r.version}
            </span>
          </div>
        );
      },
    },
    {
      key: 'partner',
      header: showDealDocs ? 'KOC & nhãn hàng' : 'Đối tác KOC (Bên B)',
      width: 190,
      render: r => {
        const docStage = documentOfTemplate(r.templateId);
        const rawHandle = r.values['token:[ID KOC]'] || '';
        const kocHandle = rawHandle ? `@${rawHandle.replace(/^@/, '')}` : '';
        const legalSubject = r.templateId.startsWith('COM-')
          ? 'Công ty'
          : r.templateId.startsWith('HKD-')
            ? 'Hộ kinh doanh'
            : 'Cá nhân';
        return (
          <div className="min-w-0 max-w-[210px] leading-snug space-y-0.5">
            <span className="block truncate font-medium text-ink">{r.partner}</span>
            <span className="block truncate text-2xs text-ink-3">
              {docStage === 'HDNT' || !showDealDocs ? (
                <>
                  {legalSubject}
                  {kocHandle ? (
                    <>
                      {' · '}
                      <span className="font-code text-ink-2">{kocHandle}</span>
                    </>
                  ) : (
                    ' · Ký khung với UpBase'
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
      key: 'links',
      header: 'Mã chứng từ & văn bản',
      width: 215,
      render: r => {
        const code = r.contractSystem?.contractCode || r.signing.at(-1)?.contractCode || r.title;
        const gdocsUrl = r.googleDocsUrl || r.contractSystem?.googleDocsUrl;
        const docxUrl = r.googleDocsAuditTrail?.exportedDocxUrl || r.contractSystem?.exportedDocxUrl || `/api/contracts/${r.id}/document?version=${r.version}`;
        const pdfUrl = r.googleDocsAuditTrail?.exportedPdfUrl;
        const hasReport = Boolean(r.googleDocsAuditTrail?.negotiationReport);
        const signedUrl =
          r.signing.at(-1)?.signedFileUrl ||
          r.contractSystem?.signedFileUrl ||
          (r.signing.at(-1)?.status === 'COMPLETED' ? `/api/contracts/${r.id}/document?version=${r.version}` : undefined);
        return (
          <div className="min-w-0 max-w-[230px] leading-snug space-y-0.5" onClick={e => e.stopPropagation()}>
            <div className="font-code text-xs font-medium text-ink truncate" title={code}>
              {code}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-2xs text-ink-3">
              <button
                type="button"
                onClick={() => setQuickViewRecord(r)}
                className="font-medium text-accent hover:underline"
              >
                Xem văn bản
              </button>
              <span>·</span>
              <a
                href={docxUrl}
                target="_blank"
                rel="noreferrer"
                className="hover:text-ink hover:underline"
              >
                .docx ↗
              </a>
              {pdfUrl && (
                <>
                  <span>·</span>
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-ink hover:underline"
                  >
                    .pdf ↗
                  </a>
                </>
              )}
              {gdocsUrl && (
                <>
                  <span>·</span>
                  <a
                    href={gdocsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-ink hover:underline"
                  >
                    Docs ↗
                  </a>
                </>
              )}
              {hasReport && (
                <>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => setScreen({ mode: 'detail', id: r.id })}
                    className="font-medium text-positive hover:underline"
                  >
                    Báo cáo đàm phán ({r.googleDocsComments?.length || 0} góp ý)
                  </button>
                </>
              )}
              {signedUrl && (
                <>
                  <span>·</span>
                  <a
                    href={signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-positive font-medium hover:underline"
                  >
                    Bản ký ↗
                  </a>
                </>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'owner',
      header: 'Phụ trách',
      width: 140,
      render: r => <Person name={r.ownerName} size={20} />,
    },
    {
      key: 'status',
      header: 'Trạng thái & ký số',
      width: 170,
      render: r => {
        const s = contractStatus(r);
        const attempt = r.signing.at(-1);
        const prog = computeSigningProgress(attempt);
        let signSummary = s.note || '';
        if (attempt && prog) {
          const pA = attempt.people[0];
          const pB = attempt.people[1];
          const aDone = pA?.action === 2 || attempt.status === 'COMPLETED';
          const bDone = pB?.action === 2 || attempt.status === 'COMPLETED';
          signSummary =
            aDone && bDone
              ? 'Đã ký đủ 2/2 bên'
              : aDone
                ? 'Bên A đã ký · Chờ Bên B'
                : bDone
                  ? 'Bên B đã ký · Chờ Bên A'
                  : 'Đang chờ 2 bên ký';
        }
        return (
          <div className="leading-snug space-y-0.5">
            <Status tone={s.tone}>{s.label}</Status>
            {signSummary && (
              <span className="block text-2xs text-ink-3 truncate max-w-[165px]">
                {signSummary}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'updated',
      header: 'Cập nhật',
      width: 135,
      align: 'right',
      render: r => {
        const isSigned = r.signing.at(-1)?.status === 'COMPLETED';
        const isSow = documentOfTemplate(r.templateId) === 'SOW';
        const isHdnt = r.templateId.endsWith('-HDNT') && r.templateId !== 'CTV-HDNT';
        const hasChild = parentIdsWithChildren.has(r.id);
        return (
          <div
            className="leading-snug space-y-0.5 text-right"
            onClick={e => e.stopPropagation()}
          >
            <span className="block text-ink-2 tabular-nums text-xs">
              {formatDate(r.updatedAt)}
            </span>
            {isSigned && isHdnt && kocHasDeal(r.kocId) ? (
              <button
                type="button"
                onClick={() =>
                  setScreen({
                    mode: 'form',
                    init: {
                      dealId: r.dealId || (r.kocId ? firstDealByKocId.get(r.kocId)?.id : undefined),
                      kocId: r.kocId,
                      legalProfileId: r.legalProfileId,
                      kind: 'CONTRACT',
                      docStage: 'SOW',
                      parentId: r.id,
                      templateId: r.templateId.replace(/-HDNT$/, '-SOW'),
                    },
                  })
                }
                className="text-2xs font-medium text-accent hover:underline"
              >
                Lập SOW →
              </button>
            ) : isSigned && isSow && !hasChild ? (
              <button
                type="button"
                onClick={() =>
                  setScreen({
                    mode: 'form',
                    init: {
                      dealId: r.dealId || (r.kocId ? firstDealByKocId.get(r.kocId)?.id : undefined),
                      kocId: r.kocId,
                      legalProfileId: r.legalProfileId,
                      kind: 'ACCEPTANCE',
                      docStage: 'BBNT',
                      parentId: r.id,
                      templateId: r.templateId.replace(/-SOW$/, '-VID-BBNT'),
                    },
                  })
                }
                className="text-2xs font-medium text-accent hover:underline"
              >
                Lập BBNT →
              </button>
            ) : !isSigned && (data?.demoActors.length ?? 0) > 0 ? (
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const result = await contractApi<{ record: ContractRecord }>('/api/contracts', {
                      id: r.id,
                      revision: r.revision,
                      action: 'DEMO_FAST_SIGN',
                    });
                    await refresh();
                    syncDealStatusForRecord(result.record);
                    onNotify?.(`Đã ký đủ 2 bên (${r.title})`, 'success');
                  } catch (err) {
                    onNotify?.((err as Error).message, 'error');
                  } finally {
                    setBusy(false);
                  }
                }}
                className="text-2xs font-medium text-positive hover:underline"
              >
                Ký 2 bên
              </button>
            ) : null}
          </div>
        );
      },
    },
  ];

  /* ------------------------------------------------------------ Render */

  if (loadError && !data) {
    return (
      <Panel>
        <EmptyState
          title={loadError.status === 401 ? 'Cần đăng nhập Lark để xem hợp đồng' : loadError.status === 403 ? 'Tài khoản chưa được cấp quyền hợp đồng' : 'Chưa tải được hợp đồng'}
          description={loadError.message}
          action={<div className="flex gap-2"><Button onClick={() => { enableBrowserDemo(); refresh().catch(() => undefined); }}>Mở bản giả lập</Button>{loadError.status === 401 ? <a href="/api/auth/lark/login?returnTo=/" className="text-xs text-accent hover:underline">Đăng nhập Lark</a> : <Button onClick={() => refresh().catch(() => undefined)}>Thử lại</Button>}</div>}
        />
      </Panel>
    );
  }
  if (!data) return <p className="text-xs text-ink-3 px-1">Đang tải hồ sơ hợp đồng…</p>;

  const canCreate = data.actor.roles.some(r => ['CREATOR', 'LEAD'].includes(r));

  const pendingFinanceCount = data.records.filter(
    r =>
      (r.approval === 'IN_REVIEW' &&
        r.steps.some(s => s.role === 'FINANCE' && s.status === 'PENDING' && s.version === r.version)) ||
      (Boolean(r.googleDocsUrl) && r.approval !== 'APPROVED' && !r.signing.some(s => s.status === 'COMPLETED')),
  ).length;

  const financeReminderCount = computeFinanceReminderItems({
    data,
    deals: effectiveDeals,
    kocs,
  }).filter(item => item.urgency === 'critical' || item.urgency === 'warning').length;

  return (
    <div className="space-y-4" onClickCapture={e => {
      if (!browserDemoEnabled()) return;
      const link = (e.target as HTMLElement).closest('a');
      if (link?.getAttribute('href')?.startsWith('/api/contracts/')) { e.preventDefault(); downloadBrowserDemo(link.getAttribute('href')!).catch(error => onNotify?.(error.message, 'error')); }
    }}>
      {(screen.mode === 'list' ||
        screen.mode === 'deal_docs' ||
        screen.mode === 'legal_portal' ||
        screen.mode === 'finance_portal' ||
        screen.mode === 'finance_payment_portal' ||
        screen.mode === 'finance_reminders' ||
        screen.mode === 'sets' ||
        screen.mode === 'catalog') && (
        <>
          <PageActions>
            {data.records.some(r => r.signing.length > 0 && r.signing.at(-1)!.provider !== 'DEMO' && !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(r.signing.at(-1)!.status)) && (
              <Button
                size="sm"
                variant="secondary"
                icon={RefreshCw}
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const res = await contractApi<{ syncedCount?: number; changedCount?: number }>('/api/contracts/integrations/wesign/sync', {});
                    await refresh();
                    onNotify?.(`Đã đồng bộ ${res.syncedCount ?? 0} luồng ký weSign (${res.changedCount ?? 0} cập nhật mới).`, 'success');
                  } catch (e) {
                    onNotify?.((e as Error).message, 'error');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Đồng bộ weSign
              </Button>
            )}
            {canCreate && (
              <Button
                size="sm"
                variant="primary"
                icon={Plus}
                onClick={() =>
                  setScreen({
                    mode: 'form',
                    init: { docStage: showDealDocs ? 'SOW' : 'HDNT', kind: 'CONTRACT', source: 'UPBASE_TEMPLATE' },
                  })
                }
              >
                Tạo hợp đồng
              </Button>
            )}
          </PageActions>

          <Tabs
            value={
              screen.mode === 'catalog'
                ? 'CATALOG'
                : screen.mode === 'sets'
                  ? 'SETS'
                  : screen.mode === 'legal_portal'
                    ? 'LEGAL_PORTAL'
                    : screen.mode === 'finance_portal'
                      ? 'FINANCE_PORTAL'
                      : screen.mode === 'finance_payment_portal'
                        ? 'FINANCE_PAYMENT_PORTAL'
                        : screen.mode === 'finance_reminders'
                          ? 'FINANCE_REMINDERS'
                          : screen.mode === 'deal_docs'
                            ? 'DEAL_DOCS'
                            : 'RECORDS'
            }
            onChange={v =>
              setScreen(
                v === 'CATALOG'
                  ? { mode: 'catalog' }
                  : v === 'SETS'
                    ? { mode: 'sets' }
                    : v === 'LEGAL_PORTAL'
                      ? { mode: 'legal_portal' }
                      : v === 'FINANCE_PORTAL'
                        ? { mode: 'finance_portal' }
                        : v === 'FINANCE_PAYMENT_PORTAL'
                          ? { mode: 'finance_payment_portal' }
                          : v === 'FINANCE_REMINDERS'
                            ? { mode: 'finance_reminders' }
                            : v === 'DEAL_DOCS'
                              ? { mode: 'deal_docs' }
                              : { mode: 'list' },
              )
            }
            items={[
              { key: 'RECORDS', label: 'Hợp đồng', count: data.records.filter(r => !isDealDoc(r)).length },
              { key: 'DEAL_DOCS', label: 'Phụ lục & BBNT', count: data.records.filter(isDealDoc).length },
              ...(data.actor.roles.includes('LEGAL')
                ? [
                    {
                      key: 'LEGAL_PORTAL' as const,
                      label: 'Theo dõi pháp chế',
                      count: data.records.length,
                    },
                  ]
                : []),
              ...(data.actor.roles.includes('FINANCE')
                ? [
                    {
                      key: 'FINANCE_PORTAL' as const,
                      label: 'Duyệt kế toán',
                      count: pendingFinanceCount,
                      tone: (pendingFinanceCount > 0 ? 'critical' : 'default') as 'critical' | 'default',
                    },
                    {
                      key: 'FINANCE_REMINDERS' as const,
                      label: 'Nhắc việc kế toán',
                      count: financeReminderCount,
                      tone: (financeReminderCount > 0 ? 'critical' : 'default') as 'critical' | 'default',
                    },
                    { key: 'FINANCE_PAYMENT_PORTAL' as const, label: 'Đối chiếu thanh toán' },
                  ]
                : []),
              { key: 'SETS', label: 'Theo bộ' },
              {
                key: 'CATALOG',
                label: 'Biểu mẫu',
                count: data.templates.filter(
                  t => t.scope === 'KOC_CUSTOM' || OFFICIAL_3STAGE_TEMPLATE_IDS.includes(t.id as never),
                ).length,
              },
            ]}
            actions={
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" icon={FileText} onClick={() => setIsContractReportOpen(true)}>
                  Báo cáo thuế &amp; điều khoản
                </Button>
                {demoMode && data.demoActors.length > 0 && (
                  <Select
                    value={data.actor.id}
                    disabled={busy}
                    onChange={async e => {
                      const nextId = e.target.value;
                      setBusy(true);
                      try {
                        await contractApi('/api/contracts/demo', { id: nextId });
                        const nextData = await refresh();
                        if (nextData.actor.roles.includes('LEGAL') && !nextData.actor.roles.includes('LEAD')) {
                          setScreen({ mode: 'legal_portal' });
                        } else if (nextData.actor.roles.includes('FINANCE') && !nextData.actor.roles.includes('LEAD')) {
                          setScreen({ mode: 'finance_reminders' });
                        } else {
                          setScreen({ mode: 'list' });
                        }
                        const actorName = data.demoActors.find(a => a.id === nextId)?.name || nextId;
                        onNotify?.(`Đã chuyển góc nhìn: ${actorName}`, 'info');
                      } catch (err) {
                        onNotify?.((err as Error).message, 'error');
                      } finally {
                        setBusy(false);
                      }
                    }}
                    className="w-44"
                  >
                    {data.demoActors.map(actorItem => (
                      <option key={actorItem.id} value={actorItem.id}>
                        Góc nhìn: {actorItem.name}
                      </option>
                    ))}
                  </Select>
                )}
              </div>
            }
          />
        </>
      )}

      {screen.mode === 'legal_portal' ||
      screen.mode === 'finance_portal' ||
      screen.mode === 'finance_payment_portal' ||
      screen.mode === 'finance_reminders' ? (
        <ContractApprovalPortalView
          mode={screen.mode === 'legal_portal' ? 'LEGAL_PORTAL' : 'FINANCE_PORTAL'}
          initialFinanceSection={
            screen.mode === 'finance_payment_portal'
              ? 'ADVANCE_PAYMENT_REPORT'
              : screen.mode === 'finance_reminders'
                ? 'FINANCE_REMINDERS'
                : 'CONTRACT_REVIEW'
          }
          initialDealLookupQuery={portalDealLookupCode}
          data={data}
          deals={effectiveDeals}
          kocs={kocs}
          busy={busy}
          onOpenRecord={id => setScreen({ mode: 'detail', id })}
          onQuickViewRecord={rec => setQuickViewRecord(rec)}
          onOpenDealLookup={code => {
            setPortalDealLookupCode(code);
            setScreen({ mode: 'finance_payment_portal' });
          }}
          onRefresh={refresh}
          onNotify={onNotify}
        />
      ) : screen.mode === 'catalog' ? (
        <ContractCatalogView
          data={data}
          onRefresh={refresh}
          onNotify={onNotify}
          onUseTemplate={(tpl: LegalTemplate) =>
            setScreen({ mode: 'form', init: { templateId: tpl.id, kind: tpl.kind } })
          }
        />
      ) : screen.mode === 'sets' ? (
        <ContractSetReconciliationView
          data={data}
          deals={effectiveDeals}
          kocs={kocs}
          busy={busy}
          onOpenRecord={id => setScreen({ mode: 'detail', id })}
          onQuickViewRecord={rec => setQuickViewRecord(rec)}
          onCreateStageDoc={init => setScreen({ mode: 'form', init })}
          onSyncRecordValues={async (targetRecord, nextValues) => {
            setBusy(true);
            try {
              await contractApi<{ record: ContractRecord }>('/api/contracts', {
                id: targetRecord.id,
                revision: targetRecord.revision,
                action: 'EDIT',
                title: targetRecord.title,
                brand: targetRecord.brand,
                partner: targetRecord.partner,
                templateId: targetRecord.templateId,
                values: nextValues,
                kocId: targetRecord.kocId,
                legalProfileId: targetRecord.legalProfileId,
                legalAttachments: targetRecord.legalAttachments,
                googleDocsUrl: targetRecord.googleDocsUrl,
                googleDocsId: targetRecord.googleDocsId,
                googleDocsSource: targetRecord.googleDocsSource,
                googleDocsReviewRouting: targetRecord.googleDocsReviewRouting,
                googleDocsComments: targetRecord.googleDocsComments,
                googleDocsAuditTrail: targetRecord.googleDocsAuditTrail,
                internalNotes: targetRecord.internalNotes,
                isKocOwnForm: targetRecord.isKocOwnForm,
                dealId: targetRecord.dealId,
                dealCode: targetRecord.dealCode,
                parentId: targetRecord.parentId,
                hasCustomTerms: targetRecord.hasCustomTerms,
                customTermsSummary: targetRecord.customTermsSummary,
                acceptanceScreenshots: targetRecord.acceptanceScreenshots,
              });
              await refresh();
              onNotify?.(`Đã đồng bộ chuẩn hóa chỉ số cho "${targetRecord.title}"`, 'success');
            } catch (err) {
              onNotify?.((err as Error).message, 'error');
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : screen.mode === 'form' ? (
        <ContractForm
          key={screen.editId || `new-${screen.init?.dealId || ''}-${screen.init?.kocId || ''}-${screen.init?.legalProfileId || ''}-${screen.init?.kind || ''}-${screen.init?.docStage || ''}-${screen.init?.parentId || ''}-${screen.init?.templateId || ''}-${screen.init?.source || 'std'}`}
          data={data}
          deals={effectiveDeals}
          kocs={kocs}
          record={screen.editId ? record : undefined}
          init={screen.init}
          busy={busy}
          onCancel={() => setScreen(screen.editId ? { mode: 'detail', id: screen.editId } : screen.init?.docStage === 'SOW' || screen.init?.docStage === 'BBNT' ? { mode: 'deal_docs' } : { mode: 'list' })}
          onBackToBooking={intent?.fromBooking ? onBackToBooking : undefined}
          onQuickFrameworkCreated={() => { void refresh(); }}
          onSyncKocLegalAttachments={(kId, profId, attachments) => {
            saveSyncedKocLegalAttachments(kId, profId, attachments);
            onSyncKocLegalProfileContract?.(kId, profId, { legalAttachments: attachments });
          }}
          onSave={(p: ContractFormPayload) => act({ action: screen.editId ? 'EDIT' : 'CREATE', ...p }, screen.editId ? 'Đã lưu phiên bản mới' : 'Đã lưu nháp hợp đồng')}
        />
      ) : screen.mode === 'detail' && record ? (
        <ContractDetail
          key={record.id}
          record={record}
          data={data}
          deals={effectiveDeals}
          busy={busy}
          onBack={() => setScreen(isDealDoc(record) ? { mode: 'deal_docs' } : { mode: 'list' })}
          onBackToBooking={intent?.fromBooking ? onBackToBooking : undefined}
          onAction={act}
          onEdit={() => setScreen({ mode: 'form', editId: record.id })}
          onOpen={id => setScreen({ mode: 'detail', id })}
          onCreateAcceptance={record.dealId || kocHasDeal(record.kocId) ? () => setScreen({ mode: 'form', init: { dealId: record.dealId || (record.kocId ? firstDealByKocId.get(record.kocId)?.id : undefined), kocId: record.kocId, legalProfileId: record.legalProfileId, kind: 'ACCEPTANCE', docStage: 'BBNT', parentId: record.id, templateId: record.templateId.replace(/-SOW$/, '-VID-BBNT') } }) : undefined}
          onCreateSow={kocHasDeal(record.kocId) ? () => setScreen({ mode: 'form', init: { dealId: record.dealId || (record.kocId ? firstDealByKocId.get(record.kocId)?.id : undefined), kocId: record.kocId, legalProfileId: record.legalProfileId, kind: 'CONTRACT', docStage: 'SOW', parentId: record.id, templateId: record.templateId.replace(/-HDNT$/, '-SOW') } }) : undefined}
          kocs={kocs}
        />
      ) : (
        <div className="space-y-4">
          <Panel flush>
            <div className="p-4 border-b border-line">
              <FilterBar
                search={{ value: search, onChange: setSearch, placeholder: showDealDocs ? 'Tên phụ lục, đối tác, nhãn hàng, mã booking' : 'Tên hợp đồng, tên KOC, mã hợp đồng' }}
                chips={<Chips items={chips} value={filter} onChange={setFilter} />}
                resultCount={search.trim() ? rows.length : undefined}
              />
            </div>
            <DataTable
              columns={columns}
              rows={rows.slice((page - 1) * pageSize, page * pageSize)}
              rowKey={r => r.id}
              onRowClick={r => setScreen({ mode: 'detail', id: r.id })}
              empty={
                tabRecords.length === 0 ? (
                  showDealDocs ? (
                    <EmptyState
                      title="Chưa có phụ lục hay biên bản nghiệm thu nào"
                      description="Phụ lục SOW và BBNT được lập từ deal của KOC: mở deal ở màn Booking rồi bấm HĐ."
                    />
                  ) : (
                    <EmptyState
                      title="Chưa có hợp đồng nào"
                      action={
                        <div className="flex items-center gap-2">
                          <Button variant="secondary" icon={FolderKanban} onClick={() => setScreen({ mode: 'catalog' })}>
                            Xem mẫu hợp đồng
                          </Button>
                          {canCreate && (
                            <Button
                              variant="primary"
                              icon={Plus}
                              onClick={() =>
                                setScreen({
                                  mode: 'form',
                                  init: { docStage: 'HDNT', kind: 'CONTRACT', source: 'UPBASE_TEMPLATE' },
                                })
                              }
                            >
                              Tạo hợp đồng
                            </Button>
                          )}
                        </div>
                      }
                    />
                  )
                ) : (
                  <EmptyState title="Không có hồ sơ khớp" />
                )
              }
            />
            <Pagination page={page} pageSize={pageSize} total={rows.length} onPageChange={setPage} />
          </Panel>
        </div>
      )}

      {/* Bước đầu của việc ký hợp đồng: chọn mẫu Upbase hay mẫu của KOC */}
      <Modal
        open={chooserOpen}
        onClose={() => setChooserOpen(false)}
        title="Tạo hợp đồng với KOC"
        footer={<Button variant="ghost" onClick={() => setChooserOpen(false)}>Hủy</Button>}
      >
        <div className="grid gap-2">
          {([
            {
              source: 'UPBASE_TEMPLATE',
              icon: FileText,
              title: 'Mẫu chuẩn Upbase',
            },
            {
              source: 'UPBASE_AMENDED',
              icon: FilePen,
              title: 'Mẫu Upbase (có sửa)',
            },
            {
              source: 'GOOGLE_DOCS',
              icon: Link2,
              title: 'Mẫu của KOC',
            },
          ] as const).map(opt => (
            <button
              key={opt.source}
              type="button"
              onClick={() => {
                setChooserOpen(false);
                setScreen({ mode: 'form', init: { docStage: 'HDNT', kind: 'CONTRACT', source: opt.source } });
              }}
              className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-left transition-colors hover:border-accent hover:bg-accent-soft/30"
            >
              <opt.icon className="w-4 h-4 shrink-0 text-accent" />
              <span className="text-xs font-semibold text-ink">{opt.title}</span>
            </button>
          ))}
        </div>
      </Modal>

      {/* Xem nhanh văn bản hợp đồng ngay từ bảng danh sách */}
      <Modal
        open={Boolean(quickViewRecord)}
        onClose={() => setQuickViewRecord(null)}
        title={quickViewRecord?.title || 'Xem hợp đồng'}
        size="lg"
        footer={
          quickViewRecord && (
            <div className="flex items-center justify-between w-full gap-2">
              <a
                href={`/api/contracts/${quickViewRecord.id}/document`}
                className="inline-flex items-center gap-2 text-xs text-accent hover:underline"
              >
                <Download className="w-4 h-4" />
                Tải file Word (.docx)
              </a>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setQuickViewRecord(null)}>Đóng</Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    const id = quickViewRecord.id;
                    setQuickViewRecord(null);
                    setScreen({ mode: 'detail', id });
                  }}
                >
                  Mở chi tiết & xử lý hồ sơ
                </Button>
              </div>
            </div>
          )
        }
      >
        {quickViewRecord && (
          <ContractDocumentViewer
            title={quickViewRecord.title}
            templateName={`${data.templates.find(t => t.id === quickViewRecord.templateId)?.name || quickViewRecord.templateId} · Phiên bản ${quickViewRecord.version}`}
            blocks={quickViewDoc?.blocks || []}
            paragraphs={quickViewDoc?.paragraphs || []}
            fields={quickViewDoc?.fields || []}
            values={quickViewDoc?.values || quickViewRecord.values}
            clauseDiffs={
              quickViewRecord.googleDocsAuditTrail?.initialToFinalDiffs?.length
                ? quickViewRecord.googleDocsAuditTrail.initialToFinalDiffs
                : quickViewRecord.googleDocsReviewRouting?.clauseDiffs
            }
            downloadHref={`/api/contracts/${quickViewRecord.id}/document`}
            signingPeople={quickViewRecord.signing.at(-1)?.people}
            signingDocumentId={quickViewRecord.signing.at(-1)?.documentId}
            partnerName={quickViewRecord.partner}
            acceptanceScreenshots={quickViewRecord.acceptanceScreenshots}
            maxHeight="65vh"
          />
        )}
      </Modal>

      <OperationalReportDrawer
        isOpen={isContractReportOpen}
        onClose={() => setIsContractReportOpen(false)}
        purposeId="CONTRACT_DRAFTING"
        moduleTitle="Báo cáo rà soát hồ sơ hợp đồng, điều khoản pháp chế & khấu trừ thuế TNCN"
        contextDataText={[
          `[DỮ LIỆU PHÂN HỆ: Quản Lý Hợp Đồng, Biên Bản Nghiệm Thu & Thuế TNCN]`,
          `- Tổng quan hồ sơ pháp lý B2C: ${data.records.length} hồ sơ, ${data.templates.length} mẫu hợp đồng & biên bản nghiệm thu chuẩn.`,
          `- Đang chờ duyệt: ${data.records.filter(r => r.approval === 'IN_REVIEW').length} bộ | Chờ ký: ${data.records.filter(awaitingSign).length} bộ | Đã ký hoàn tất: ${data.records.filter(done).length} bộ | Cần lập nghiệm thu: ${data.records.filter(needAcceptance).length} bộ.`,
          ...rows.slice(0, 8).map(
            r => `- Hồ sơ ${r.id} | Tiêu đề: ${r.title} | Đối tác/KOC: ${r.partner} | Nhãn hàng: ${r.brand} | Trạng thái: ${contractStatus(r).label} | Phiên bản: v${r.version} | Cập nhật: ${formatDate(r.updatedAt)}`
          ),
        ].join('\n')}
        customSystemPrompt="Kiểm tra danh sách hồ sơ hợp đồng và biên bản nghiệm thu hiện tại: (1) Rà soát rủi ro điều khoản sử dụng hình ảnh KOC chạy Spark Ads 30-90 ngày và thời hạn giữ link giỏ hàng vàng, (2) Kiểm tra quy định khấu trừ thuế TNCN 10% đối với cá nhân kinh doanh/KOC có phát sinh thù lao từ 2.000.000đ/lần trở lên, (3) Liệt kê các hồ sơ đang tắc ở bước chờ duyệt pháp chế hoặc chờ ký số để đôn đốc giải ngân đúng hạn."
        onNotify={onNotify}
      />
    </div>
  );
}
