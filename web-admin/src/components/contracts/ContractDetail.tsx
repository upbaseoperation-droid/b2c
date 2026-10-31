'use client';

/**
 * Hồ sơ một hợp đồng. Cột chính: tiến trình duyệt → ký, kiểm tra nội dung, nội dung đã điền.
 * Cột phụ: thông tin hồ sơ, phiên bản, lịch sử. Nút chính đổi theo việc người xem cần làm tiếp.
 */

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Camera, CheckCircle2, ChevronLeft, ChevronRight, Download, ExternalLink, FileCheck2, FileCode2, FilePlus2, Pencil, RefreshCw, RotateCcw, Scale, ScanSearch, Send } from 'lucide-react';
import type { BookingDealItem, KocItem, LegalDocAttachment } from '../../lib/types';
import type { ContractField, ContractRecord, ContractRole, DocBlock } from '../../lib/contracts/types';
import { ActionMenu, Button, ConfirmDialog, EmptyState, Field, Input, Modal, Person, SectionHeader, Segmented, Select, Status, StepMark, Textarea } from '../ui';
import type { ActionMenuItem, StatusTone } from '../ui';
import { formatDate } from '../../lib/format';
import { contractApi, type ContractBootstrap } from './api';
import { ContractDocumentViewer } from './ContractDocumentViewer';
import { GoogleDocsReviewPanel } from './GoogleDocsReviewPanel';
import { GoogleDocsFinanceApproveDialog } from './GoogleDocsFinanceApproveDialog';
import { LegalAttachmentsPanel, LegalProfileSigningHistoryBanner } from './LegalAttachmentsPanel';
import {
  evaluateLegalProfileSigningHistory,
  resolveContractLegalAttachments,
  type LegalProfileSigningHistorySummary,
} from '../../lib/contracts/legalProfileHistory';
import { getKocLegalProfiles } from '../koc/kocUtils';
import type { GoogleDocCommentItem } from '../../lib/contracts/googleDocsTypes';
import { VideoProductScreenshotModal } from './VideoProductScreenshotModal';
import { findSavedScreenshotsForContext } from '../../lib/acceptanceScreenshotStore';
import {
  DEFAULT_SIGN_TAGS,
  HISTORY_LABEL,
  ROLE_LABEL,
  buildDealSowJobTables,
  buildStableContractCode,
  computeSigningProgress,
  contractStatus,
  dateTime,
  enrichTemplateWithSignFlow,
  isAcceptance,
  signerStatus,
  stepStatus,
} from './contractUi';
import { evaluateContractRules } from '../../lib/contracts/contractRules';

type Action = (payload: Record<string, unknown>, done?: string) => Promise<ContractRecord | undefined>;

interface PreviewResponse {
  paragraphs: string[];
  blocks?: DocBlock[];
  fields?: ContractField[];
  values?: Record<string, string>;
  version: number;
}

export function ContractDetail({
  record,
  data,
  deals = [],
  kocs = [],
  busy,
  onBack,
  onAction,
  onEdit,
  onOpen,
  onCreateAcceptance,
  onCreateSow,
  onBackToBooking,
  onPrev,
  onNext,
  positionLabel,
}: {
  record: ContractRecord;
  data: ContractBootstrap;
  deals?: BookingDealItem[];
  kocs?: KocItem[];
  busy: boolean;
  onBack: () => void;
  onAction: Action;
  onEdit: () => void;
  onOpen: (id: string) => void;
  /** Không truyền khi KOC chưa có deal: phụ lục và BBNT chỉ lập theo deal. */
  onCreateAcceptance?: () => void;
  onCreateSow?: () => void;
  onBackToBooking?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  positionLabel?: string;
}) {
  const me = data.actor;
  const status = contractStatus(record);
  const template = data.templates.find(t => t.id === record.templateId);
  const kocTemplate = data.templates.find(
    t => (t.kocId === record.kocId && t.scope === 'KOC_CUSTOM') || (t.kocId && t.kocId === record.kocId),
  );
  const legalNotes = template?.legalNotes || kocTemplate?.legalNotes || record.internalNotes;
  const signing = record.signing.at(-1);
  const signingProgress = computeSigningProgress(signing);
  const activeSigning = record.signing.some(s => !['CANCELLED', 'REJECTED'].includes(s.status));
  const isOwner = record.ownerId === me.id;
  const editable = isOwner && record.approval !== 'IN_REVIEW' && !activeSigning;
  const canSubmit = editable && ['DRAFT', 'CHANGES', 'REJECTED'].includes(record.approval);
  const myStep = record.approval === 'IN_REVIEW' && me.roles.includes('FINANCE')
    ? (record.steps.find(s => s.role === 'FINANCE' && s.reviewerId === me.id && s.status === 'PENDING') ||
       (me.id !== record.ownerId ? record.steps.find(s => s.role === 'FINANCE' && s.status === 'PENDING') : undefined))
    : undefined;
  const legalStep = record.steps.find(s => s.role === 'LEGAL');
  const financeStep = record.steps.find(s => s.role === 'FINANCE');
  const isLegalDone = !legalStep || legalStep.status === 'APPROVED';
  const coordinator = me.roles.includes('SIGN_COORDINATOR');
  const canStartSigning = coordinator && record.approval === 'APPROVED' && !activeSigning;
  const demo = data.demoActors.length > 0;
  const canWithdraw = isOwner && ['IN_REVIEW', 'APPROVED'].includes(record.approval) && !signing;
  const canCheck = record.approval !== 'APPROVED' && !record.signing.length && (isOwner || record.steps.some(s => s.reviewerId === me.id));
  const childRecords = data.records.filter(r => r.parentId === record.id);
  const hasAcceptance = childRecords.some(r => isAcceptance(r.templateId));
  const isFrameworkWithSow = record.templateId.endsWith('-HDNT') && record.templateId !== 'CTV-HDNT';
  const parent = record.parentId ? data.records.find(r => r.id === record.parentId) : undefined;
  const linkedDeal = deals.find(d => d.id === record.dealId || (record.dealCode && d.dealCode === record.dealCode));
  const linkedKoc = kocs.find(
    k =>
      k.id === (record.kocId || linkedDeal?.kocId) ||
      (linkedDeal?.kocChannelId && k.channelId.replace(/^@/, '').toLowerCase() === linkedDeal.kocChannelId.replace(/^@/, '').toLowerCase()),
  );

  const [dialog, setDialog] = useState<null | 'submit' | 'approve' | 'changes' | 'reject' | 'withdraw' | 'link' | 'request_sign' | 'google_docs_finance'>(null);
  const enrichedTemplate = template ? enrichTemplateWithSignFlow(template) : undefined;
  const stableContractCode = record.contractSystem?.contractCode || signing?.contractCode || buildStableContractCode(record);
  const templateSignTags = record.contractSystem?.templateSnapshot?.signTags || enrichedTemplate?.signTags || [...DEFAULT_SIGN_TAGS];
  const [screenshotModalOpen, setScreenshotModalOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number>(record.version);
  const [comparePrev, setComparePrev] = useState<boolean>(record.versions.length > 0);
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(true);
  const [previewError, setPreviewError] = useState('');
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);
  const [trackedRecordKey, setTrackedRecordKey] = useState(`${record.id}:${record.version}`);

  if (`${record.id}:${record.version}` !== trackedRecordKey) {
    setTrackedRecordKey(`${record.id}:${record.version}`);
    setSelectedVersion(record.version);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setPreviewLoading(true);
    });
    contractApi<PreviewResponse>(`/api/contracts/${record.id}/document?preview=1&version=${selectedVersion}`)
      .then(r => {
        if (cancelled) return;
        setPreviewData(r);
        setPreviewError('');
      })
      .catch(e => {
        if (!cancelled) setPreviewError((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [record.id, record.revision, selectedVersion]);

  const canApproveGDocsFinance =
    Boolean(record.googleDocsUrl) &&
    me.roles.includes('FINANCE') &&
    me.id !== record.ownerId &&
    record.approval === 'IN_REVIEW' &&
    record.googleDocsStage === 'FINAL' &&
    record.steps.some(s => s.role === 'FINANCE' && s.version === record.version && s.status === 'PENDING');

  // Nút chính: việc tiếp theo của người đang xem (Pháp chế duyệt trước -> Kế toán duyệt & Đẩy WeSign).
  // Lưu ý: Trên luồng Google Docs (record.googleDocsUrl), Pháp chế là tham vấn điều khoản, Kế toán là cấp duyệt FINAL không bị chặn bởi !isLegalDone.
  const primary = myStep?.role === 'LEGAL' ? (
    <Button variant="primary" icon={Scale} disabled={busy} onClick={() => setDialog('approve')}>
      Pháp chế duyệt điều khoản
    </Button>
  ) : canApproveGDocsFinance ? (
    <Button
      variant="primary"
      icon={CheckCircle2}
      disabled={busy}
      onClick={() => setDialog('google_docs_finance')}
    >
      Kế toán duyệt &amp; Đẩy WeSign
    </Button>
  ) : canSubmit && record.googleDocsUrl && !record.googleDocsStage ? (
    <Button variant="primary" icon={FileCheck2} disabled={busy} onClick={() => onAction({ action: 'SUBMIT_GOOGLE_DOCS_DRAFT' }, 'Đã trình draft')}>Trình draft</Button>
  ) : canSubmit ? (
    <Button variant="primary" icon={FileCheck2} disabled={busy} onClick={() => setDialog('submit')}>{record.googleDocsUrl ? 'Trình final' : 'Gửi duyệt'}</Button>
  ) : myStep ? (
    <Button variant="primary" disabled={busy} onClick={() => setDialog('approve')}>Duyệt</Button>
  ) : canStartSigning ? (
    <Button variant="primary" icon={Send} disabled={busy} onClick={() => setDialog('request_sign')}>Gửi ký WeSign (requestSign)</Button>
  ) : signing?.status === 'COMPLETED' && isFrameworkWithSow && onCreateSow && (me.roles.includes('CREATOR') || me.roles.includes('LEAD')) ? (
    <Button variant="primary" icon={FilePlus2} onClick={onCreateSow}>Tạo phụ lục SOW</Button>
  ) : signing?.status === 'COMPLETED' && !isAcceptance(record.templateId) && !isFrameworkWithSow && !hasAcceptance && onCreateAcceptance && (me.roles.includes('CREATOR') || me.roles.includes('LEAD')) ? (
    <Button variant="primary" icon={FilePlus2} onClick={onCreateAcceptance}>Tạo biên bản nghiệm thu</Button>
  ) : signing?.status === 'COMPLETED' && isAcceptance(record.templateId) && onBackToBooking ? (
    <Button variant="primary" icon={CheckCircle2} onClick={onBackToBooking}>Chuyển sang Đề nghị thanh toán</Button>
  ) : null;

  const isStandardFlow =
    !record.isKocOwnForm &&
    !record.googleDocsUrl &&
    record.googleDocsSource !== 'KOC_CUSTOM_DOC' &&
    record.googleDocsSource !== 'TEMPLATE_AMENDED';

  const menu: ActionMenuItem[] = [
    ...(myStep ? [{ label: 'Từ chối', onSelect: () => setDialog('reject') }] : []),
    ...(isStandardFlow && !activeSigning && (isOwner || coordinator)
      ? [
          {
            label: 'Sinh lại file hợp đồng (generateContract)',
            icon: RotateCcw,
            onSelect: () =>
              onAction(
                { action: 'GENERATE_CONTRACT_SYSTEM' },
                'Đã gọi API generateContract sinh file hợp đồng trên Contract Service',
              ),
          },
        ]
      : []),
    ...(canStartSigning ? [{ label: 'Gửi ký WeSign qua contract-system (requestSign)', icon: Send, onSelect: () => setDialog('request_sign') }] : []),
    ...(signing && signing.status !== 'COMPLETED'
      ? [
          {
            label: 'Đồng bộ trạng thái ký (SYNC_WESIGN)',
            icon: RotateCcw,
            onSelect: () => onAction({ action: 'SYNC_WESIGN' }, 'Đã đồng bộ trạng thái ký mới nhất'),
          },
        ]
      : []),
    ...(canStartSigning && data.config.wesign ? [{ label: 'Liên kết luồng ký thủ công', onSelect: () => setDialog('link') }] : []),
    ...(canStartSigning && demo ? [{ label: 'Bắt đầu ký thử nội bộ', onSelect: () => onAction({ action: 'DEMO_SIGN_START' }, 'Đã bắt đầu lượt ký thử') }] : []),
    ...(canCheck ? [{ label: 'Kiểm tra nội dung', icon: ScanSearch, onSelect: () => onAction({ action: 'CHECK' }, 'Đã kiểm tra nội dung') }] : []),
    ...(canWithdraw ? [{ label: 'Thu hồi để sửa', icon: RotateCcw, onSelect: () => setDialog('withdraw') }] : []),
  ];

  const current = record.checks.filter(c => c.version === record.version).at(-1);
  const previousSnapshot = record.versions.find(v => v.version === selectedVersion - 1);
  const shownValues = previewData?.values || (selectedVersion === record.version ? record.values : record.versions.find(v => v.version === selectedVersion)?.values || record.values);
  const isAcceptanceDoc = isAcceptance(record.templateId) || template?.kind === 'ACCEPTANCE';
  const shownScreenshots =
    selectedVersion === record.version
      ? record.acceptanceScreenshots && record.acceptanceScreenshots.length > 0
        ? record.acceptanceScreenshots
        : isAcceptanceDoc
          ? findSavedScreenshotsForContext({
              dealId: record.dealId || linkedDeal?.id,
              dealCode: record.dealCode || linkedDeal?.dealCode,
              kocId: record.kocId || linkedKoc?.id,
              videoUrl: linkedDeal?.tiktokVideoUrl,
            })
          : []
      : record.versions.find(v => v.version === selectedVersion)?.acceptanceScreenshots || [];

  const isSowDoc = record.templateId.endsWith('-SOW');
  const [workspaceTab, setWorkspaceTab] = useState<'DOCUMENT' | 'SPLIT_VERIFY' | 'LEGAL_DOCS' | 'APPROVAL' | 'GOOGLE_DOCS'>(
    record.googleDocsUrl ? 'GOOGLE_DOCS' : 'DOCUMENT'
  );

  const [syncingGDocsComments, setSyncingGDocsComments] = useState(false);
  const [generatingGDocsReport, setGeneratingGDocsReport] = useState(false);
  const [gdocsError, setGdocsError] = useState('');
  const handleSyncGoogleDocsComments = async () => {
    setSyncingGDocsComments(true);
    try {
      const res = await contractApi<{ success: boolean; comments: GoogleDocCommentItem[]; record: ContractRecord }>(
        '/api/contracts/google-docs/sync-comments',
        { contractId: record.id, url: record.googleDocsUrl }
      );
      await onAction({ action: 'REFRESH_ONLY', updatedRecord: res.record }, `Đã đồng bộ ${res.comments.length} bình luận từ Google Doc`);
    } catch (err) {
      setGdocsError((err as Error).message);
    } finally {
      setSyncingGDocsComments(false);
    }
  };

  const handleGenerateGoogleDocsReport = async () => {
    setGeneratingGDocsReport(true);
    setGdocsError('');
    try {
      const res = await contractApi<{ success: boolean; record: ContractRecord }>(
        '/api/contracts/google-docs/summarize-report',
        { contractId: record.id, syncLatest: true }
      );
      await onAction({ action: 'REFRESH_ONLY', updatedRecord: res.record }, 'Đã tổng hợp và lưu báo cáo đàm phán hợp đồng');
    } catch (err) {
      setGdocsError((err as Error).message);
    } finally {
      setGeneratingGDocsReport(false);
    }
  };

  const handleApproveAndPushWeSign = async (dataPayload: { note: string; partyAEmail?: string; partyBEmail?: string }) => {
    setGdocsError('');
    const res = await contractApi<{ success: boolean; record: ContractRecord }>(
      '/api/contracts/google-docs/approve-and-push-wesign',
      {
        contractId: record.id,
        note: dataPayload.note,
        partyAEmail: dataPayload.partyAEmail,
        partyBEmail: dataPayload.partyBEmail,
      }
    );
    setDialog(null);
    await onAction({ action: 'REFRESH_ONLY', updatedRecord: res.record }, 'Đã duyệt và xuất DOCX, PDF từ Google Doc để đẩy WeSign');
  };


  // Tìm bộ 3 hồ sơ liên kết (HĐNT -> Phụ lục SOW -> BBNT) để bấm chuyển nhanh 1 chạm
  const linkedFrameworkRecord = isFrameworkWithSow
    ? record
    : parent && parent.templateId.endsWith('-HDNT')
      ? parent
      : data.records.find(
          r =>
            r.templateId.endsWith('-HDNT') &&
            ((record.kocId && r.kocId === record.kocId) || (record.dealId && r.dealId === record.dealId)),
        );
  const linkedSowRecord = isSowDoc
    ? record
    : parent && parent.templateId.endsWith('-SOW')
      ? parent
      : childRecords.find(r => r.templateId.endsWith('-SOW')) ||
        data.records.find(
          r =>
            r.templateId.endsWith('-SOW') &&
            ((record.dealId && r.dealId === record.dealId) || (record.dealCode && r.dealCode === record.dealCode)),
        );
  const linkedAcceptanceRecord = isAcceptanceDoc
    ? record
    : childRecords.find(r => isAcceptance(r.templateId)) ||
      data.records.find(
        r =>
          isAcceptance(r.templateId) &&
          ((record.dealId && r.dealId === record.dealId) ||
            (linkedSowRecord && r.parentId === linkedSowRecord.id)),
      );

  // Tính toán tóm tắt tài chính & đối soát thuế ngay trên đầu trang
  const financialSummary = (() => {
    const allFields = previewData?.fields || template?.fields || [];
    const parseNum = (val?: string) => {
      const raw = (val || '').replace(/[^\d]/g, '');
      return raw ? Number(raw) : 0;
    };
    const baseField =
      allFields.find(f => f.source === 'netTotal') ||
      allFields.find(f => f.source === 'lineTotal') ||
      allFields.find(f => f.source === 'unitPrice');
    const grossField = allFields.find(f => f.source === 'grossTotal');
    const pitField = allFields.find(f => f.source === 'pitAmount');
    const vatField = allFields.find(f => f.source === 'vatAmount');
    const remField = allFields.find(f => f.source === 'remainingAmount');
    const customTokenNum = parseNum(
      shownValues['NET_TOTAL'] ||
        shownValues['GROSS_TOTAL'] ||
        shownValues['LINE_TOTAL'] ||
        shownValues['token:[Tổng tiền trước thuế/sau thuế]'] ||
        shownValues['token:[Thù lao trọn gói]'] ||
        shownValues['token:[Thành tiền (VNĐ)]'],
    );
    const moneyFields = allFields.filter(
      f => (f.group === 'MONEY' || f.kind === 'money') && f.source !== 'grossTotal' && f.source !== 'vatAmount' && f.source !== 'pitAmount',
    );
    const baseContractValue =
      (baseField ? parseNum(shownValues[baseField.key]) : 0) ||
      customTokenNum ||
      moneyFields.reduce((max, f) => Math.max(max, parseNum(shownValues[f.key])), 0) ||
      linkedDeal?.totalValue ||
      0;
    const grossContractValue = (grossField ? parseNum(shownValues[grossField.key]) : 0) || baseContractValue;
    const dealValue = linkedDeal?.totalValue || 0;
    const diff = dealValue > 0 && baseContractValue > 0 ? baseContractValue - dealValue : 0;
    const subject = template?.subject || 'Cá nhân';
    const isIndividual = subject === 'Cá nhân' || subject === 'CTV tháng';
    const explicitPit = pitField ? parseNum(shownValues[pitField.key]) : 0;
    const explicitVat = vatField ? parseNum(shownValues[vatField.key]) : 0;
    const pitWithholding =
      explicitPit || (isIndividual && baseContractValue >= 2000000 ? Math.round(baseContractValue * 0.1) : 0);
    const remainingPayout = remField ? parseNum(shownValues[remField.key]) : 0;
    const netPayout =
      remainingPayout ||
      (baseContractValue > 0
        ? grossContractValue > baseContractValue && isIndividual
          ? baseContractValue
          : isIndividual
            ? baseContractValue - pitWithholding
            : grossContractValue
        : 0);
    const advField = allFields.find(f => f.source === 'advanceAmount');
    const parsedAdvance =
      (advField ? parseNum(shownValues[advField.key]) : 0) ||
      parseNum(shownValues['ADVANCE_AMOUNT']) ||
      parseNum(shownValues['token:[Số tiền tạm ứng đợt 1]']) ||
      linkedDeal?.advanceAmount ||
      0;
    return {
      baseContractValue,
      grossContractValue,
      dealValue,
      diff,
      subject,
      isIndividual,
      pitWithholding,
      explicitVat,
      netPayout,
      parsedAdvance,
    };
  })();

  const partyASigner = signing?.people[0];
  const partyBSigner = signing?.people[1];
  const isFullySigned = signing?.status === 'COMPLETED';
  const partyADone = partyASigner?.action === 2 || isFullySigned;
  const partyBDone = partyBSigner?.action === 2 || isFullySigned;

  return (
    <div className="space-y-4">
      {/* Thanh điều hướng trên cùng */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {onBackToBooking && (
            <Button variant="secondary" size="sm" icon={ArrowLeft} onClick={onBackToBooking}>
              Quay về Quản lý Deal &amp; Booking
            </Button>
          )}
          <Button variant="ghost" size="sm" icon={!onBackToBooking ? ArrowLeft : undefined} onClick={onBack} className={!onBackToBooking ? '-ml-3' : ''}>
            Danh sách hợp đồng
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isSowDoc && isFullySigned && (
            <Status tone="positive">
              Phụ lục SOW đã ký hoàn tất — Cấu hình Deal đã khóa
            </Status>
          )}
        </div>
      </div>

      {/* Lộ trình 3 bước chỉ hiển thị cho Phụ lục SOW / Biên bản nghiệm thu gắn với Deal */}
      {!isFrameworkWithSow && (isSowDoc || isAcceptanceDoc) && (
        <div className="rounded-xl border border-line bg-surface px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {[
              {
                idx: 1,
                label: '1. Hợp đồng nguyên tắc',
                sub: linkedFrameworkRecord?.title || 'Theo KOC',
                state: (linkedFrameworkRecord ? 'done' : 'idle') as 'done' | 'active' | 'idle',
                isCurrent: false,
                onClick: linkedFrameworkRecord ? () => onOpen(linkedFrameworkRecord.id) : undefined,
              },
              {
                idx: 2,
                label: '2. Phụ lục SOW',
                sub: linkedSowRecord?.title || 'Theo Deal',
                state: (isSowDoc
                  ? isFullySigned
                    ? 'done'
                    : 'active'
                  : isAcceptanceDoc || linkedSowRecord?.signing.at(-1)?.status === 'COMPLETED'
                    ? 'done'
                    : 'idle') as 'done' | 'active' | 'idle',
                isCurrent: isSowDoc,
                onClick: !isSowDoc && linkedSowRecord ? () => onOpen(linkedSowRecord.id) : undefined,
              },
              {
                idx: 3,
                label: '3. Biên bản nghiệm thu',
                sub: linkedAcceptanceRecord?.title || 'Quyết toán',
                state: (isAcceptanceDoc
                  ? isFullySigned
                    ? 'done'
                    : 'active'
                  : linkedAcceptanceRecord?.signing.at(-1)?.status === 'COMPLETED'
                    ? 'done'
                    : 'idle') as 'done' | 'active' | 'idle',
                isCurrent: isAcceptanceDoc,
                onClick: !isAcceptanceDoc
                  ? linkedAcceptanceRecord
                    ? () => onOpen(linkedAcceptanceRecord.id)
                    : isFullySigned
                      ? onCreateAcceptance
                      : undefined
                  : undefined,
              },
            ].map((item, i) => (
              <React.Fragment key={item.idx}>
                {i > 0 && <span className="text-ink-3 text-xs">→</span>}
                <button
                  type="button"
                  disabled={!item.onClick}
                  onClick={item.onClick}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-left transition-colors ${
                    item.isCurrent
                      ? 'border-accent bg-accent-soft/35 text-ink'
                      : item.state === 'done'
                        ? 'border-positive/30 bg-positive-soft/40 text-ink hover:border-positive'
                        : 'border-line bg-sunken/40 text-ink-2 hover:border-line-strong'
                  } ${item.onClick ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <StepMark done={item.state === 'done' || item.isCurrent} label={item.idx} />
                  <div className="leading-tight">
                    <div className="text-xs font-semibold text-ink">{item.label}</div>
                    <div className="text-2xs text-ink-3 truncate max-w-[180px]">{item.sub}</div>
                  </div>
                </button>
              </React.Fragment>
            ))}
          </div>
          {linkedDeal && (
            <span className="text-xs text-ink-2">
              Deal: <span className="font-code font-semibold text-ink">{linkedDeal.dealCode}</span>
            </span>
          )}
        </div>
      )}

      {/* Tiêu đề hồ sơ & Thanh tác vụ chính */}
      <header className="flex flex-wrap items-start justify-between gap-4 bg-surface border border-line rounded-xl px-4 py-3.5">
        <div className="min-w-0 grid gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-ink">{record.title}</h2>
            <Status tone={status.tone}>{status.label}</Status>
          </div>
          <p className="text-xs text-ink-2">
            {[
              record.partner,
              isFrameworkWithSow || record.brand === 'UPBASE' ? 'Hợp đồng nguyên tắc KOC' : record.brand,
              `v${record.version}`,
            ]
              .filter(Boolean)
              .join(' · ')}
            {!isFrameworkWithSow && record.dealCode && (
              <span className="text-ink-3">
                {' '}
                · Deal <span className="font-code">{record.dealCode}</span>
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(record.googleDocsUrl || record.contractSystem?.googleDocsUrl) && (
            <a
              href={record.googleDocsUrl || record.contractSystem?.googleDocsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-line-strong bg-surface text-xs font-medium text-accent hover:bg-sunken"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {record.googleDocsUrl ? 'Google Docs' : 'Google Docs (API 3)'}
            </a>
          )}
          {(record.contractSystem?.signedFileUrl || record.googleDocsAuditTrail?.exportedPdfUrl) && (
            <a
              href={record.contractSystem?.signedFileUrl || record.googleDocsAuditTrail?.exportedPdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-line-strong bg-surface text-xs font-medium text-positive hover:bg-sunken"
            >
              <Download className="w-3.5 h-3.5" />
              Tải PDF đã ký
            </a>
          )}
          <a
            href={
              record.contractSystem?.signingFileUrl ||
              record.googleDocsAuditTrail?.exportedDocxUrl ||
              `/api/contracts/${record.id}/document`
            }
            target={record.contractSystem?.signingFileUrl ? '_blank' : undefined}
            rel={record.contractSystem?.signingFileUrl ? 'noreferrer' : undefined}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-line-strong bg-surface text-xs font-medium text-ink hover:bg-sunken"
          >
            <Download className="w-3.5 h-3.5 text-ink-3" strokeWidth={1.75} />
            {record.contractSystem?.signingFileUrl ? 'Tải .docx trình ký (API 3)' : 'Tải Word'}
          </a>
          {isStandardFlow && !activeSigning && (isOwner || coordinator) && (
            <Button
              variant="secondary"
              size="sm"
              icon={RotateCcw}
              disabled={busy}
              onClick={() =>
                onAction(
                  { action: 'GENERATE_CONTRACT_SYSTEM' },
                  'Đã gọi API 3 (generateContract) sinh file hợp đồng trên Contract Service',
                )
              }
            >
              Sinh file (API 3)
            </Button>
          )}
          {isAcceptanceDoc && (
            <Button
              variant="secondary"
              size="sm"
              icon={Camera}
              disabled={busy}
              onClick={() => setScreenshotModalOpen(true)}
            >
              Ảnh nghiệm thu{shownScreenshots.length > 0 ? ` (${shownScreenshots.length})` : ''}
            </Button>
          )}
          {editable && (
            <Button size="sm" icon={Pencil} onClick={onEdit}>
              Sửa
            </Button>
          )}
          {myStep && (
            <Button size="sm" disabled={busy} onClick={() => setDialog('changes')}>
              Yêu cầu sửa
            </Button>
          )}
          {primary}
          {menu.length > 0 && <ActionMenu items={menu} />}
        </div>
      </header>

      {current && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs space-y-2 ${
            current.findings.some(f => f.severity === 'ERROR')
              ? 'border-critical/40 bg-critical-soft/40 text-ink'
              : current.findings.some(f => f.severity === 'WARNING')
                ? 'border-warning/40 bg-warning-soft/50 text-ink'
                : 'border-positive/30 bg-positive-soft/40 text-ink'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold flex items-center gap-2">
              <ScanSearch className="w-4 h-4 text-accent shrink-0" />
              Kết quả kiểm tra nội dung hồ sơ (v{current.version})
            </span>
            <span className="text-2xs text-ink-3">{dateTime(current.at)}</span>
          </div>
          {current.findings.length === 0 ? (
            <p className="text-positive font-medium">
              Toàn bộ trường bắt buộc và điều khoản đều hợp lệ, không phát hiện cảnh báo.
            </p>
          ) : (
            <ul className="space-y-1">
              {current.findings.map((f, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Status
                    tone={
                      f.severity === 'ERROR'
                        ? 'critical'
                        : f.severity === 'WARNING'
                          ? 'warning'
                          : 'neutral'
                    }
                  >
                    {f.severity === 'ERROR'
                      ? 'Lỗi'
                      : f.severity === 'WARNING'
                        ? 'Cảnh báo'
                        : 'Ghi chú'}
                  </Status>
                  <span className="text-ink">
                    {f.message}
                    {f.evidence ? <span className="text-ink-3"> ({f.evidence})</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* KHÔNG GIAN LÀM VIỆC CHÍNH */}
      <div className="grid gap-5 items-start lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-4 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Segmented<'DOCUMENT' | 'SPLIT_VERIFY' | 'LEGAL_DOCS' | 'APPROVAL' | 'GOOGLE_DOCS'>
              value={workspaceTab}
              onChange={setWorkspaceTab}
              items={[
                { key: 'DOCUMENT', label: 'Văn bản hợp đồng' },
                {
                  key: 'SPLIT_VERIFY',
                  label: 'Đối chiếu song song (CCCD + Văn bản)',
                },
                ...(record.googleDocsUrl
                  ? [
                      {
                        key: 'GOOGLE_DOCS' as const,
                        label: `Báo cáo & Lưu vết Google Docs (${record.googleDocsComments?.length || 0} góp ý)`,
                      },
                    ]
                  : []),
                {
                  key: 'APPROVAL',
                  label: `Duyệt & Ký số`,
                },
                {
                  key: 'LEGAL_DOCS',
                  label: `Giấy tờ pháp lý (${resolveContractLegalAttachments(record, deals, kocs, data.records).length})`,
                },
              ]}
            />
          </div>

          {workspaceTab === 'GOOGLE_DOCS' && record.googleDocsUrl && (
            <GoogleDocsReviewPanel
              url={record.googleDocsUrl}
              docId={record.googleDocsId}
              sourceType={record.googleDocsSource || 'TEMPLATE_AMENDED'}
              routing={record.googleDocsReviewRouting}
              comments={record.googleDocsComments || []}
              auditTrail={record.googleDocsAuditTrail}
              onSyncComments={handleSyncGoogleDocsComments}
              syncingComments={syncingGDocsComments}
              onGenerateReport={handleGenerateGoogleDocsReport}
              generatingReport={generatingGDocsReport}
              canApproveWeSign={canApproveGDocsFinance}
              onApproveAndPushWeSign={() => setDialog('google_docs_finance')}
              isFinanceRole={me.roles.includes('FINANCE')}
              isLegalRole={me.roles.includes('LEGAL')}
              isLeadRole={me.roles.includes('LEAD')}
              approvalStatus={record.approval}
              legalStep={legalStep}
              financeStep={financeStep}
              canLegalApprove={Boolean(myStep?.role === 'LEGAL' && myStep.status === 'PENDING')}
              onLegalApprove={() => setDialog('approve')}
              shareEmail={data.config.googleShareEmail}
            />
          )}
          <GoogleDocsFinanceApproveDialog
            open={dialog === 'google_docs_finance'}
            record={record}
            busy={busy}
            onClose={() => setDialog(null)}
            onConfirm={handleApproveAndPushWeSign}
          />

          {workspaceTab === 'DOCUMENT' ? (
            <section className="grid gap-3">
              {previewError && <p role="alert" className="text-xs text-critical">{previewError}</p>}
              {previewLoading && !previewData ? (
                <div className="bg-surface border border-line rounded-xl p-8 text-center text-xs text-ink-3">
                  Đang dựng văn bản hợp đồng…
                </div>
              ) : (
                <ContractDocumentViewer
                  title={record.title}
                  templateName={
                    record.isKocOwnForm && record.customFile
                      ? `Tệp KOC: ${record.customFile.filename} · v${selectedVersion}`
                      : `${template?.name || record.templateId} · v${selectedVersion}`
                  }
                  blocks={previewData?.blocks || record.customFile?.blocks || template?.blocks || []}
                  paragraphs={previewData?.paragraphs || record.customFile?.paragraphs || []}
                  fields={record.isKocOwnForm ? [] : (previewData?.fields || template?.fields || [])}
                  values={shownValues}
                  compareValues={comparePrev && previousSnapshot ? previousSnapshot.values : undefined}
                  clauseDiffs={
                    record.googleDocsAuditTrail?.initialToFinalDiffs?.length
                      ? record.googleDocsAuditTrail.initialToFinalDiffs
                      : record.googleDocsReviewRouting?.clauseDiffs
                  }
                  activeFieldKey={activeFieldKey}
                  downloadHref={`/api/contracts/${record.id}/document?version=${selectedVersion}`}
                  signingPeople={selectedVersion === signing?.version ? signing?.people : undefined}
                  signingDocumentId={signing?.documentId}
                  partnerName={record.partner}
                  acceptanceScreenshots={shownScreenshots}
                  isTemplatePreview={record.isKocOwnForm}
                  versionSelector={
                    record.versions.length > 0 ? (
                      <div className="inline-flex items-center gap-2">
                        <select
                          aria-label="Chọn phiên bản hợp đồng"
                          value={selectedVersion}
                          onChange={e => setSelectedVersion(Number(e.target.value))}
                          className="h-7 rounded-md border border-line bg-surface px-2 text-2xs font-medium text-ink"
                        >
                          <option value={record.version}>Phiên bản {record.version} (hiện tại)</option>
                          {[...record.versions].reverse().map(v => (
                            <option key={v.version} value={v.version}>
                              Phiên bản {v.version}
                            </option>
                          ))}
                        </select>
                        {previousSnapshot && (
                          <label className="inline-flex items-center gap-1 text-2xs text-ink-2 cursor-pointer px-2">
                            <input
                              type="checkbox"
                              checked={comparePrev}
                              onChange={e => setComparePrev(e.target.checked)}
                            />
                            Đối chiếu v{previousSnapshot.version}
                          </label>
                        )}
                      </div>
                    ) : undefined
                  }
                />
              )}
            </section>
          ) : workspaceTab === 'SPLIT_VERIFY' ? (
            <section className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
              <div className="space-y-3 min-w-0">
                <LegalProfileSigningHistoryBanner
                  summary={evaluateLegalProfileSigningHistory(record, data.records, deals, kocs)}
                  onOpenPriorContract={id => onOpen(id)}
                />
                {(() => {
                  const profiles = linkedKoc ? getKocLegalProfiles(linkedKoc) : [];
                  const activeProf =
                    (record.legalProfileId ? profiles.find(p => p.id === record.legalProfileId) : undefined) ||
                    profiles.find(p => p.isDefault) ||
                    profiles[0];
                  const effectiveAttachments =
                    record.legalAttachments && record.legalAttachments.length > 0
                      ? record.legalAttachments
                      : resolveContractLegalAttachments(record, deals, kocs, data.records);
                  const effectiveLegalType =
                    activeProf?.legalType ||
                    (record.templateId.startsWith('COM-')
                      ? 'COMPANY'
                      : record.templateId.startsWith('HKD-')
                        ? 'HOUSEHOLD'
                        : 'INDIVIDUAL');
                  return (
                    <LegalAttachmentsPanel
                      attachments={effectiveAttachments}
                      entitySlug={linkedKoc?.channelId || linkedKoc?.id || record.partner || record.id}
                      legalType={effectiveLegalType}
                      editable={!isFullySigned}
                      defaultExpandPreview={true}
                      onChange={nextAttachments => {
                        void onAction(
                          { action: 'ATTACH_LEGAL_DOCS', legalAttachments: nextAttachments },
                          'Đã cập nhật tệp đính kèm CCCD / ĐKKD',
                        );
                      }}
                      title="Giấy tờ pháp lý CCCD & ĐKKD"
                    />
                  );
                })()}
              </div>
              <div className="min-w-0">
                {previewLoading && !previewData ? (
                  <div className="bg-surface border border-line rounded-xl p-8 text-center text-xs text-ink-3">
                    Đang dựng văn bản hợp đồng…
                  </div>
                ) : (
                  <ContractDocumentViewer
                    title={record.title}
                    templateName={`${template?.name || record.templateId} · v${selectedVersion}`}
                    blocks={previewData?.blocks || record.customFile?.blocks || template?.blocks || []}
                    paragraphs={previewData?.paragraphs || record.customFile?.paragraphs || []}
                    fields={record.isKocOwnForm ? [] : (previewData?.fields || template?.fields || [])}
                    values={shownValues}
                    compareValues={comparePrev && previousSnapshot ? previousSnapshot.values : undefined}
                    clauseDiffs={
                      record.googleDocsAuditTrail?.initialToFinalDiffs?.length
                        ? record.googleDocsAuditTrail.initialToFinalDiffs
                        : record.googleDocsReviewRouting?.clauseDiffs
                    }
                    activeFieldKey={activeFieldKey}
                    downloadHref={`/api/contracts/${record.id}/document?version=${selectedVersion}`}
                    signingPeople={selectedVersion === signing?.version ? signing?.people : undefined}
                    signingDocumentId={signing?.documentId}
                    partnerName={record.partner}
                    acceptanceScreenshots={shownScreenshots}
                    isTemplatePreview={record.isKocOwnForm}
                    compactToolbar
                  />
                )}
              </div>
            </section>
          ) : workspaceTab === 'LEGAL_DOCS' ? (
            <section className="grid gap-3">
              <LegalProfileSigningHistoryBanner
                summary={evaluateLegalProfileSigningHistory(record, data.records, deals, kocs)}
                onOpenPriorContract={id => onOpen(id)}
              />
              {(() => {
                const profiles = linkedKoc ? getKocLegalProfiles(linkedKoc) : [];
                const activeProf =
                  (record.legalProfileId ? profiles.find(p => p.id === record.legalProfileId) : undefined) ||
                  profiles.find(p => p.isDefault) ||
                  profiles[0];
                const effectiveAttachments =
                  record.legalAttachments && record.legalAttachments.length > 0
                    ? record.legalAttachments
                    : resolveContractLegalAttachments(record, deals, kocs, data.records);
                const effectiveLegalType =
                  activeProf?.legalType ||
                  (record.templateId.startsWith('COM-')
                    ? 'COMPANY'
                    : record.templateId.startsWith('HKD-')
                      ? 'HOUSEHOLD'
                      : 'INDIVIDUAL');
                return (
                  <LegalAttachmentsPanel
                    attachments={effectiveAttachments}
                    entitySlug={linkedKoc?.channelId || linkedKoc?.id || record.partner || record.id}
                    legalType={effectiveLegalType}
                    editable={!isFullySigned}
                    defaultExpandPreview={true}
                    onChange={nextAttachments => {
                      void onAction(
                        { action: 'ATTACH_LEGAL_DOCS', legalAttachments: nextAttachments },
                        'Đã cập nhật tệp đính kèm CCCD / ĐKKD trên Cloudflare R2',
                      );
                    }}
                    title="Giấy tờ pháp lý CCCD & ĐKKD"
                  />
                );
              })()}
            </section>
          ) : (
            <div className="grid gap-4">
              {/* 1. Tiến trình phê duyệt nội bộ */}
              <section className="bg-surface border border-line rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-line flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink">1. Phê duyệt nội bộ</span>
                  <Status tone={record.approval === 'APPROVED' ? 'positive' : record.approval === 'REJECTED' ? 'critical' : 'warning'}>
                    {record.approval === 'APPROVED' ? 'Đã duyệt xong' : record.approval === 'IN_REVIEW' ? 'Đang duyệt' : 'Bản nháp'}
                  </Status>
                </div>
                <ol className="divide-y divide-line">
                  <Step
                    title="Soạn hồ sơ"
                    who={record.ownerName}
                    status={record.approval === 'DRAFT' && !record.steps.length ? { label: 'Nháp', tone: 'neutral' } : { label: 'Hoàn tất', tone: 'positive' }}
                    meta={`v${record.version}`}
                  />
                  {record.steps.map((s, i) => (
                    <Step
                      key={`${s.reviewerId}-${i}`}
                      title={ROLE_LABEL[s.role]}
                      who={s.reviewerName}
                      status={stepStatus(s)}
                      meta={s.decidedAt ? dateTime(s.decidedAt) : undefined}
                      note={s.note}
                    />
                  ))}
                  {record.approval !== 'DRAFT' && !record.steps.some(s => s.role === 'LEGAL') && (
                    <Step
                      title="Pháp chế"
                      who={data.reviewers.find(a => a.roles.includes('LEGAL'))?.name || 'Bộ phận Pháp chế'}
                      status={{ label: 'Đã thông báo · Theo dõi', tone: 'info' }}
                    />
                  )}
                  {record.approval !== 'DRAFT' &&
                    (record.templateId.endsWith('-HDNT') || record.brand === 'UPBASE') &&
                    !record.steps.some(s => s.role === 'LEAD') && (
                      <Step
                        title="Giám đốc B2C"
                        who="Đặng Thị Yến Nhi"
                        status={{ label: 'Đã thông báo · Quản lý', tone: 'info' }}
                      />
                    )}
                </ol>
              </section>

              {/* 2. Ký số 2 bên WeSign */}
              <section className="bg-surface border border-line rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-ink">2. Ký số điện tử 2 bên (WeSign)</span>
                    <Status tone={isFullySigned ? 'positive' : signing ? 'warning' : 'neutral'}>
                      {isFullySigned ? 'Đã ký đủ 2 bên' : signing ? `${signingProgress?.completedCount || 0}/${signingProgress?.totalCount || 2} chữ ký` : 'Chờ trình ký'}
                    </Status>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {demo && !isFullySigned && (
                      <Button
                        size="sm"
                        variant="primary"
                        icon={CheckCircle2}
                        disabled={busy}
                        onClick={() =>
                          onAction(
                            { action: 'DEMO_FAST_SIGN' },
                            isSowDoc
                              ? 'Đã hoàn tất ký Phụ lục SOW — Cấu hình Deal đã được khóa'
                              : 'Đã hoàn tất ký đủ 2 bên',
                          )
                        }
                      >
                        Xác nhận đã ký đủ 2 bên
                      </Button>
                    )}
                    {canStartSigning && (
                      <Button size="sm" variant="secondary" icon={Send} disabled={busy} onClick={() => setDialog('request_sign')}>
                        Đẩy ký WeSign
                      </Button>
                    )}
                    {signing && !isFullySigned && (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={RotateCcw}
                        disabled={busy}
                        onClick={() => onAction({ action: 'SYNC_WESIGN' }, 'Đã đồng bộ trạng thái ký mới nhất')}
                      >
                        Đồng bộ trạng thái
                      </Button>
                    )}
                  </div>
                </div>

                {record.contractSystem && (
                  <div className="rounded-lg border border-line bg-sunken/40 px-3 py-2 text-2xs space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-ink-2">
                        <span>
                          Mã Contract Service: <strong className="font-mono text-ink">{record.contractSystem.contractCode || record.contractSystem.contractSystemId}</strong>
                        </span>
                        {record.contractSystem.remoteStatus && (
                          <Status
                            tone={
                              record.contractSystem.remoteStatus === 'completed'
                                ? 'positive'
                                : record.contractSystem.remoteStatus === 'signing_requested'
                                  ? 'warning'
                                  : 'info'
                            }
                          >
                            {record.contractSystem.remoteStatus === 'completed'
                              ? 'Đã hoàn tất (completed)'
                              : record.contractSystem.remoteStatus === 'signing_requested'
                                ? 'Đang trình ký WeSign (signing_requested)'
                                : `Đã sinh file (${record.contractSystem.remoteStatus})`}
                          </Status>
                        )}
                        {record.contractSystem.wesignRequestId && (
                          <span className="text-ink-3">
                            WeSign ID: <code className="font-mono text-ink-2">{record.contractSystem.wesignRequestId}</code>
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        {record.contractSystem.googleDocsUrl && (
                          <a
                            href={record.contractSystem.googleDocsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            File Google Docs đã sinh
                          </a>
                        )}
                        {record.contractSystem.signingFileUrl && (
                          <a
                            href={record.contractSystem.signingFileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
                          >
                            <Download className="w-3 h-3" />
                            File .docx trình ký
                          </a>
                        )}
                        {record.contractSystem.signedFileUrl && (
                          <a
                            href={record.contractSystem.signedFileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-positive hover:underline"
                          >
                            <Download className="w-3 h-3" />
                            File PDF đã ký
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className={`rounded-lg border p-3 flex flex-col justify-between gap-2 ${partyADone ? 'border-positive/40 bg-positive-soft/35' : 'border-line bg-sunken/30'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-2xs font-semibold text-ink-2">Bên A · Đại diện UpBase</span>
                      <Status tone={partyADone ? 'positive' : 'neutral'}>{partyADone ? 'Đã ký số' : 'Chờ ký'}</Status>
                    </div>
                    <Person name={partyASigner?.name || 'Đặng Thị Yến Nhi'} sub={partyASigner?.email || 'Giám đốc Marketing B2C'} size={24} />
                  </div>
                  <div className={`rounded-lg border p-3 flex flex-col justify-between gap-2 ${partyBDone ? 'border-positive/40 bg-positive-soft/35' : 'border-line bg-sunken/30'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-2xs font-semibold text-ink-2">Bên B · Đối tác KOC</span>
                      <Status tone={partyBDone ? 'positive' : 'neutral'}>{partyBDone ? 'Đã ký số' : 'Chờ ký'}</Status>
                    </div>
                    <Person name={partyBSigner?.name || record.partner} sub={partyBSigner?.email || linkedKoc?.channelId || 'KOC'} size={24} />
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>

        <aside className="bg-surface border border-line rounded-xl divide-y divide-line min-w-0 overflow-hidden">
          <AsideSection title="Thông tin hợp đồng">
            <dl className="grid gap-2.5 min-w-0">
              <Info label="Đối tác KOC (Bên B)">{record.partner}</Info>
              <Info label="Loại hợp đồng">
                {record.isKocOwnForm && record.customFile
                  ? `Mẫu riêng KOC (${record.customFile.filename})`
                  : record.googleDocsSource === 'KOC_CUSTOM_DOC'
                    ? 'Hợp đồng theo mẫu riêng của KOC'
                    : (template?.name || record.templateId)}
              </Info>
              {!isFrameworkWithSow && record.brand && record.brand !== 'UPBASE' && (
                <Info label="Nhãn hàng">{record.brand}</Info>
              )}
              {!isFrameworkWithSow && record.dealCode && (
                <Info label="Mã Booking">
                  <span className="font-code">{record.dealCode}</span>
                </Info>
              )}
              {!isFrameworkWithSow && financialSummary.netPayout > 0 && (
                <Info label="Thực chi Net">
                  <span className="font-code font-semibold text-positive">
                    {financialSummary.netPayout.toLocaleString('vi-VN')} đ
                  </span>
                </Info>
              )}
              <Info label="Mã chứng từ">
                <span className="font-code text-2xs break-all">{stableContractCode}</span>
              </Info>
              <Info label="Phụ trách">
                {(() => {
                  const m = record.ownerName.match(/^(.+?)\s*\((.+)\)$/);
                  return m ? (
                    <Person name={m[1].trim()} sub={m[2].trim()} size={22} />
                  ) : (
                    <Person name={record.ownerName} size={22} />
                  );
                })()}
              </Info>
              {parent && (
                <Info label="Hợp đồng gốc">
                  <button type="button" className="text-accent hover:underline text-left" onClick={() => onOpen(parent.id)}>
                    {parent.title}
                  </button>
                </Info>
              )}
              {childRecords.length > 0 && (
                <Info label="Phụ lục SOW / Nghiệm thu">
                  <ul className="grid gap-1">
                    {childRecords.map(ch => (
                      <li key={ch.id}>
                        <button type="button" className="text-accent hover:underline text-left text-xs" onClick={() => onOpen(ch.id)}>
                          {ch.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </Info>
              )}
              <Info label="Cập nhật">{dateTime(record.updatedAt)}</Info>
            </dl>
          </AsideSection>
          <AsideSection title="Kết nối Contract Service & WeSign">
            <div className="space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <span className="text-ink-3">Luồng xử lý:</span>
                <Status tone={isStandardFlow ? 'info' : 'warning'}>
                  {record.isKocOwnForm || record.googleDocsSource === 'KOC_CUSTOM_DOC'
                    ? 'Luồng 3 · Mẫu riêng KOC (Chỉ WeSign)'
                    : !isStandardFlow
                      ? 'Luồng 2 · Sửa điều khoản (Không gọi API 3)'
                      : 'Luồng 1 · Mẫu chuẩn (API 1, 2, 3, 4)'}
                </Status>
              </div>

              {isStandardFlow && (
                <div className="rounded-lg border border-line bg-sunken/50 p-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-ink">Kết quả API 3 (generateContract)</span>
                    <Status
                      tone={
                        record.contractSystem?.remoteStatus === 'completed'
                          ? 'positive'
                          : record.contractSystem?.remoteStatus === 'failed'
                            ? 'critical'
                            : record.contractSystem?.remoteStatus === 'signing_requested'
                              ? 'warning'
                              : record.contractSystem?.contractSystemId
                                ? 'info'
                                : 'neutral'
                      }
                    >
                      {record.contractSystem?.remoteStatus || (record.contractSystem?.contractSystemId ? 'ready' : 'Chưa sinh file')}
                    </Status>
                  </div>
                  {record.contractSystem?.lastError && (
                    <p className="text-2xs text-critical font-medium">{record.contractSystem.lastError}</p>
                  )}
                  {record.contractSystem ? (
                    <dl className="grid gap-1.5 text-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-ink-3">Mã code:</dt>
                        <dd className="font-mono font-medium text-ink truncate" title={record.contractSystem.contractCode}>
                          {record.contractSystem.contractCode}
                        </dd>
                      </div>
                      {record.contractSystem.contractSystemId && (
                        <div className="flex items-center justify-between gap-2">
                          <dt className="text-ink-3">Contract ID:</dt>
                          <dd className="font-mono text-ink-2 truncate max-w-[170px]" title={record.contractSystem.contractSystemId}>
                            {record.contractSystem.contractSystemId}
                          </dd>
                        </div>
                      )}
                      {record.contractSystem.remoteTemplateId && (
                        <div className="flex items-center justify-between gap-2">
                          <dt className="text-ink-3">Template UUID:</dt>
                          <dd className="font-mono text-ink-2 truncate max-w-[170px]" title={record.contractSystem.remoteTemplateId}>
                            {record.contractSystem.remoteTemplateId}
                          </dd>
                        </div>
                      )}
                      <div className="pt-1 flex flex-col gap-1.5">
                        {record.contractSystem.googleDocsUrl ? (
                          <a
                            href={record.contractSystem.googleDocsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            Mở Google Docs đã sinh (document.fileUrl)
                          </a>
                        ) : (
                          <span className="text-ink-3">document.fileUrl: Chưa có link từ API</span>
                        )}
                        {record.contractSystem.signingFileUrl ? (
                          <a
                            href={record.contractSystem.signingFileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline"
                          >
                            <Download className="w-3 h-3 shrink-0" />
                            Tải file .docx trình ký (signingFileUrl)
                          </a>
                        ) : (
                          <span className="text-ink-3">signingFileUrl: Chưa có link từ API</span>
                        )}
                      </div>
                    </dl>
                  ) : (
                    <p className="text-2xs text-ink-3">Chưa có dữ liệu trả về từ API 3.</p>
                  )}
                  {!activeSigning && (isOwner || coordinator) && (
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={RotateCcw}
                      disabled={busy}
                      onClick={() =>
                        onAction(
                          { action: 'GENERATE_CONTRACT_SYSTEM' },
                          'Đã gọi API 3 (generateContract) sinh lại file hợp đồng',
                        )
                      }
                    >
                      Gọi lại API 3 (generateContract)
                    </Button>
                  )}
                </div>
              )}

              <div className="rounded-lg border border-line bg-sunken/50 p-2.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-ink">Kết quả API 4 (requestSign)</span>
                  <Status tone={isFullySigned ? 'positive' : signing ? 'warning' : 'neutral'}>
                    {isFullySigned
                      ? 'Đã ký hoàn tất'
                      : signing
                        ? `Đang ký (${signingProgress?.completedCount || 0}/${signingProgress?.totalCount || 2})`
                        : 'Chưa gửi ký'}
                  </Status>
                </div>
                {signing || record.contractSystem?.wesignRequestId ? (
                  <dl className="grid gap-1.5 text-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-ink-3">WeSign Request ID:</dt>
                      <dd className="font-mono font-medium text-ink truncate max-w-[160px]">
                        {record.contractSystem?.wesignRequestId || signing?.documentId}
                      </dd>
                    </div>
                    {signing?.people && signing.people.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-line/60">
                        {signing.people.map((p, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2">
                            <span className="text-ink-2 truncate">{p.name} ({p.email})</span>
                            <span className="font-medium text-ink">{p.status || (p.action === 2 ? 'Đã ký' : 'Chờ ký')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {record.contractSystem?.signedFileUrl && (
                      <a
                        href={record.contractSystem.signedFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 pt-1 font-medium text-positive hover:underline"
                      >
                        <Download className="w-3 h-3 shrink-0" />
                        Tải PDF đã ký hoàn tất (signedFileUrl)
                      </a>
                    )}
                  </dl>
                ) : (
                  <p className="text-2xs text-ink-3">
                    {record.approval === 'APPROVED'
                      ? 'Hồ sơ đã duyệt nội bộ, sẵn sàng gọi API 4 (requestSign) đẩy sang WeSign.'
                      : 'Hoàn tất duyệt nội bộ để mở khóa nút gửi ký WeSign.'}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {canStartSigning && (
                    <Button size="sm" variant="primary" icon={Send} disabled={busy} onClick={() => setDialog('request_sign')}>
                      Gọi API 4 (requestSign)
                    </Button>
                  )}
                  {signing && !isFullySigned && (
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={RotateCcw}
                      disabled={busy}
                      onClick={() => onAction({ action: 'SYNC_WESIGN' }, 'Đã đồng bộ trạng thái ký mới nhất')}
                    >
                      Đồng bộ trạng thái ký
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </AsideSection>
          <DiscussionAndHistory
            record={record}
            onAddNote={note => onAction({ action: 'ADD_NOTE', note }, 'Đã lưu ghi chú')}
            busy={busy}
          />
        </aside>
      </div>

      <SubmitDialog
        open={dialog === 'submit'}
        record={record}
        data={data}
        busy={busy}
        onClose={() => setDialog(null)}
        onSubmit={(ids, reqLegal) =>
          onAction(
            { action: 'SUBMIT', reviewers: ids, requireLegal: reqLegal },
            record.googleDocsUrl
              ? 'Đã trình final và chốt bản Google Doc'
              : record.templateId.endsWith('-HDNT') || record.brand === 'UPBASE'
                ? 'Đã gửi Kế toán duyệt · Đã thông báo Pháp chế & Giám đốc Đặng Thị Yến Nhi'
                : 'Đã gửi Kế toán duyệt · Đã thông báo Pháp chế theo dõi',
          ).then(r => r && setDialog(null))
        }
      />
      <LinkDialog open={dialog === 'link'} version={record.version} busy={busy} onClose={() => setDialog(null)} onSubmit={documentId => onAction({ action: 'LINK_WESIGN', documentId, confirmed: true }, 'Đã liên kết luồng ký').then(r => r && setDialog(null))} />
      <RequestSignDialog
        open={dialog === 'request_sign'}
        record={record}
        contractCode={stableContractCode}
        signTags={templateSignTags}
        busy={busy}
        onClose={() => setDialog(null)}
        onSubmit={(partyAEmail, partyBEmail) =>
          onAction(
            { action: 'REQUEST_SIGN', partyAEmail, partyBEmail },
            `Đã xuất .docx từ Google Docs và tạo luồng ký WeSign (${stableContractCode})`,
          ).then(r => r && setDialog(null))
        }
      />
      {myStep?.role === 'FINANCE' ? (
        <FinanceApproveDialog
          open={dialog === 'approve'}
          record={record}
          signingHistory={evaluateLegalProfileSigningHistory(record, data.records, deals, kocs)}
          attachments={resolveContractLegalAttachments(record, deals, kocs, data.records)}
          busy={busy}
          onClose={() => setDialog(null)}
          onOpenPriorContract={id => {
            setDialog(null);
            onOpen(id);
          }}
          onSubmit={note =>
            onAction(
              { action: 'DECIDE', decision: 'APPROVED', note: note || '' },
              'Đã duyệt hồ sơ',
            ).then(r => r && setDialog(null))
          }
        />
      ) : myStep?.role === 'LEGAL' ? (
        <LegalApproveDialog
          open={dialog === 'approve'}
          record={record}
          busy={busy}
          onClose={() => setDialog(null)}
          onSubmit={(note, saveAsKocTemplate, kocLegalNotes) =>
            onAction(
              { action: 'DECIDE', decision: 'APPROVED', note: note || '', saveAsKocTemplate, kocLegalNotes },
              'Đã duyệt hồ sơ',
            ).then(r => r && setDialog(null))
          }
        />
      ) : (
        <ConfirmDialog
          open={dialog === 'approve'}
          title="Duyệt hồ sơ"
          description={`Duyệt phiên bản ${record.version} với vai trò ${myStep ? ROLE_LABEL[myStep.role as ContractRole].toLowerCase() : ''}.`}
          confirmLabel="Duyệt"
          reason={{ label: 'Nhận xét (không bắt buộc)' }}
          onConfirm={note => onAction({ action: 'DECIDE', decision: 'APPROVED', note: note || '' }, 'Đã duyệt hồ sơ')}
          onCancel={() => setDialog(null)}
        onOpenChange={o => !o && setDialog(null)}
        />
      )}
      <ConfirmDialog
        open={dialog === 'changes'}
        title="Yêu cầu sửa"
        description="Người tạo sửa và gửi lại. Phê duyệt hiện tại bị hủy."
        confirmLabel="Gửi yêu cầu"
        reason={{ label: 'Cần sửa gì', required: true }}
        onConfirm={note => onAction({ action: 'DECIDE', decision: 'CHANGES', note: note || '' }, 'Đã gửi yêu cầu sửa')}
        onCancel={() => setDialog(null)}
        onOpenChange={o => !o && setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === 'reject'}
        title="Từ chối hồ sơ"
        tone="danger"
        confirmLabel="Từ chối"
        reason={{ label: 'Lý do từ chối', required: true }}
        onConfirm={note => onAction({ action: 'DECIDE', decision: 'REJECTED', note: note || '' }, 'Đã từ chối hồ sơ')}
        onCancel={() => setDialog(null)}
        onOpenChange={o => !o && setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === 'withdraw'}
        title="Thu hồi để sửa"
        description="Hồ sơ về nháp, các bước duyệt đã có bị hủy."
        confirmLabel="Thu hồi"
        reason={{ label: 'Lý do thu hồi', required: true }}
        onConfirm={note => onAction({ action: 'WITHDRAW', note: note || '' }, 'Đã thu hồi hồ sơ')}
        onCancel={() => setDialog(null)}
        onOpenChange={o => !o && setDialog(null)}
      />
      <VideoProductScreenshotModal
        open={screenshotModalOpen}
        onClose={() => setScreenshotModalOpen(false)}
        initialVideoUrl={linkedDeal?.tiktokVideoUrl || ''}
        productName={shownValues.TEN_NHAN_HANG || record.brand || ''}
        brandName={record.brand || ''}
        dealId={record.dealId || linkedDeal?.id}
        dealCode={record.dealCode || linkedDeal?.dealCode}
        kocId={record.kocId || linkedKoc?.id}
        authorHandle={linkedKoc?.channelId || linkedKoc?.tiktokChannel}
        existingScreenshots={shownScreenshots}
        onApplyScreenshots={items => {
          onAction(
            { action: 'UPDATE_ACCEPTANCE_SCREENSHOTS', acceptanceScreenshots: items },
            'Đã đính kèm ảnh chụp sản phẩm vào Biên bản nghiệm thu',
          );
        }}
      />
    </div>
  );
}

function Step({ title, who, status, meta, note }: { title: string; who: string; status: { label: string; tone: StatusTone; note?: string }; meta?: string; note?: string }) {
  return (
    <li className="px-4 py-3 grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-medium text-ink w-24 shrink-0">{title}</span>
          <Person name={who} size={20} />
        </div>
        <div className="flex items-center gap-2">
          {meta && <span className="text-2xs text-ink-3">{meta}</span>}
          <Status tone={status.tone}>{status.note || status.label}</Status>
        </div>
      </div>
      {note && <p className="text-xs text-ink-2 whitespace-pre-wrap pl-[108px]">{note}</p>}
    </li>
  );
}

function AsideSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-4 py-4 min-w-0 overflow-hidden">
      <h3 className="text-sm font-semibold text-ink mb-3">{title}</h3>
      {children}
    </section>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 min-w-0">
      <dt className="text-2xs text-ink-3">{label}</dt>
      <dd className="text-xs text-ink break-words min-w-0 overflow-hidden">{children}</dd>
    </div>
  );
}

function DiscussionAndHistory({
  record,
  onAddNote,
  busy,
}: {
  record: ContractRecord;
  onAddNote: (note: string) => Promise<unknown>;
  busy: boolean;
}) {
  const [noteText, setNoteText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [all, setAll] = useState(false);
  const items = [...record.history].reverse();
  const shown = all ? items : items.slice(0, 8);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onAddNote(noteText.trim());
      setNoteText('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AsideSection title="Ghi chú đàm phán & Lịch sử">
      <form onSubmit={handleSubmit} className="mb-3 space-y-2">
        <textarea
          rows={2}
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          placeholder="Thêm lưu ý trao đổi KOC / lý do duyệt..."
          className="w-full text-xs rounded-lg border border-line bg-surface p-2 text-ink placeholder:text-ink-3 focus:outline-none focus:ring-1 focus:ring-accent resize-none"
        />
        <div className="flex justify-end">
          <Button size="sm" variant="secondary" type="submit" disabled={busy || submitting || !noteText.trim()}>
            {submitting ? 'Đang lưu…' : 'Lưu ghi chú'}
          </Button>
        </div>
      </form>

      {items.length === 0 ? (
        <EmptyState title="Chưa có thao tác" />
      ) : (
        <ol className="grid gap-3 min-w-0">
          {shown.map((h, i) => (
            <li key={i} className={`grid gap-0.5 pl-3 border-l-2 min-w-0 ${h.action === 'NOTE' ? 'border-accent' : 'border-line'}`}>
              <div className="flex items-center justify-between gap-1 min-w-0">
                <span className={`text-xs font-medium truncate ${h.action === 'NOTE' ? 'text-accent' : 'text-ink'}`}>
                  {HISTORY_LABEL[h.action] || h.action}
                </span>
                <span className="text-2xs text-ink-3 shrink-0">v{h.version}</span>
              </div>
              <span className="text-2xs text-ink-3 break-words">{h.actorName} · {dateTime(h.at)}</span>
              {h.note && !/^-?\d+$/.test(h.note) && (
                <span className={`text-2xs mt-0.5 ${h.action === 'NOTE' ? 'text-ink font-normal bg-sunken/60 p-2 rounded' : 'text-ink-2 line-clamp-3'}`}>
                  {h.note}
                </span>
              )}
            </li>
          ))}
          {items.length > 8 && (
            <li>
              <button type="button" className="text-xs text-accent hover:underline" onClick={() => setAll(v => !v)}>
                {all ? 'Thu gọn' : `Xem thêm ${items.length - 8} thao tác`}
              </button>
            </li>
          )}
        </ol>
      )}
    </AsideSection>
  );
}

function SubmitDialog({
  open,
  record,
  data,
  busy,
  onClose,
  onSubmit,
}: {
  open: boolean;
  record: ContractRecord;
  data: ContractBootstrap;
  busy: boolean;
  onClose: () => void;
  onSubmit: (ids: string[], requireLegal?: boolean) => void;
}) {
  const [financeId, setFinanceId] = useState<string>('');
  const [initKey, setInitKey] = useState('');
  const options = (role: ContractRole) =>
    data.reviewers.filter(
      a =>
        a.id !== record.ownerId &&
        a.roles.includes(role) &&
        (record.brand === 'UPBASE' || a.allBrands || a.brands.includes(record.brand)),
    );

  const financeOpts = options('FINANCE');
  const legalOpts = options('LEGAL');
  const isHdnt = record.templateId.endsWith('-HDNT') || record.brand === 'UPBASE';

  const currentKey = open ? `${record.id}:${record.version}` : '';
  if (currentKey !== initKey) {
    setInitKey(currentKey);
    if (open) {
      setFinanceId(financeOpts[0]?.id || '');
    }
  }

  const ready = Boolean(financeId);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={record.googleDocsUrl ? 'Trình final hồ sơ Google Doc' : 'Gửi duyệt hồ sơ'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button
            variant="primary"
            disabled={busy || !ready}
            onClick={() => onSubmit([financeId], false)}
          >
            {record.googleDocsUrl ? 'Trình final' : 'Gửi duyệt'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Người duyệt (Kế toán) *" htmlFor="rv-FINANCE">
          <Select
            id="rv-FINANCE"
            value={financeId}
            onChange={e => setFinanceId(e.target.value)}
          >
            {financeOpts.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
        </Field>

        <div className="space-y-2">
          <span className="block text-xs font-medium text-ink">Nhận thông báo &amp; theo dõi</span>
          <div className="rounded-lg border border-line bg-sunken/30 divide-y divide-line">
            <div className="px-3 py-2.5 flex items-center justify-between gap-2">
              <Person
                name={legalOpts[0]?.name || 'Bộ phận Pháp chế'}
                sub="Pháp chế · Quản lý, theo dõi hợp đồng"
                size={24}
              />
              <Status tone="info">Nhận thông báo</Status>
            </div>
            {isHdnt && (
              <div className="px-3 py-2.5 flex items-center justify-between gap-2">
                <Person
                  name="Đặng Thị Yến Nhi"
                  sub="Giám đốc Marketing B2C · Nắm thông tin quản lý"
                  size={24}
                />
                <Status tone="info">Nhận thông báo</Status>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function LinkDialog({ open, version, busy, onClose, onSubmit }: { open: boolean; version: number; busy: boolean; onClose: () => void; onSubmit: (id: string) => void }) {
  const [id, setId] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Liên kết luồng ký weSign"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button variant="primary" disabled={busy || !confirmed || !id.trim()} onClick={() => onSubmit(id.trim())}>Liên kết</Button>
        </>
      }
    >
      <Field label="Mã tài liệu trên weSign" htmlFor="ws-id">
        <Input id="ws-id" value={id} onChange={e => setId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="font-code" />
      </Field>
      <label className="flex items-start gap-2 text-xs text-ink-2">
        <input type="checkbox" className="mt-0.5" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
        Tôi đã đối chiếu tài liệu và người ký trên weSign với đúng bản duyệt phiên bản {version}.
      </label>
    </Modal>
  );
}

function LegalApproveDialog({
  open,
  record,
  busy,
  onClose,
  onSubmit,
}: {
  open: boolean;
  record: ContractRecord;
  busy: boolean;
  onClose: () => void;
  onSubmit: (note: string, saveAsKocTemplate: boolean, kocLegalNotes: string) => Promise<unknown>;
}) {
  const [note, setNote] = useState('');
  const [saveAsKocTemplate, setSaveAsKocTemplate] = useState(Boolean(record.hasCustomTerms));
  const [kocLegalNotes, setKocLegalNotes] = useState(record.customTermsSummary || record.internalNotes || '');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Duyệt hồ sơ (Pháp chế)"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button
            variant="primary"
            disabled={busy}
            onClick={() => onSubmit(note, saveAsKocTemplate, kocLegalNotes)}
          >
            Xác nhận duyệt
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Nhận xét phê duyệt" htmlFor="legal-note">
          <Textarea
            id="legal-note"
            rows={2}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Ví dụ: Đồng ý duyệt các điều khoản sửa đổi theo đề xuất..."
          />
        </Field>

        <div className="rounded-lg border border-line bg-surface p-3 space-y-3">
          <label className="flex items-start gap-3 text-xs font-medium text-ink cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 rounded border-line text-accent"
              checked={saveAsKocTemplate}
              onChange={e => setSaveAsKocTemplate(e.target.checked)}
            />
            <div>
              <span>Lưu làm Mẫu hợp đồng đã duyệt cho KOC ({record.partner})</span>
            </div>
          </label>

          {saveAsKocTemplate && (
            <Field
              label="Lưu ý của Pháp chế cho KOC này"
              htmlFor="koc-legal-notes"
            >
              <Textarea
                id="koc-legal-notes"
                rows={3}
                value={kocLegalNotes}
                onChange={e => setKocLegalNotes(e.target.value)}
                placeholder="Ví dụ: KOC chỉ đồng ý thanh toán trong 7 ngày; thời hạn cấp quyền Spark Ads tối đa 60 ngày..."
              />
            </Field>
          )}
        </div>
      </div>
    </Modal>
  );
}

function FinanceApproveDialog({
  open,
  record,
  signingHistory,
  attachments,
  busy,
  onClose,
  onOpenPriorContract,
  onSubmit,
}: {
  open: boolean;
  record: ContractRecord;
  signingHistory: LegalProfileSigningHistorySummary;
  attachments: LegalDocAttachment[];
  busy: boolean;
  onClose: () => void;
  onOpenPriorContract?: (id: string) => void;
  onSubmit: (note: string) => Promise<unknown>;
}) {
  const [note, setNote] = useState(
    signingHistory.recommendedFinanceNote ||
      'Đã kiểm tra khớp hạn mức Booking, thuế khấu trừ và thông tin tài khoản thụ hưởng.',
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Duyệt hồ sơ (Kế toán) · ${record.title}`}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button variant="primary" disabled={busy} onClick={() => onSubmit(note)}>
            Xác nhận duyệt FINAL
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        <LegalProfileSigningHistoryBanner
          summary={signingHistory}
          onOpenPriorContract={onOpenPriorContract}
        />

        <LegalAttachmentsPanel
          attachments={attachments}
          entitySlug={record.kocId || record.partner || record.id}
          legalType={
            record.templateId.startsWith('COM-')
              ? 'COMPANY'
              : record.templateId.startsWith('HKD-')
                ? 'HOUSEHOLD'
                : 'INDIVIDUAL'
          }
          defaultExpandPreview={true}
          title="Xem đối chiếu trực tiếp CCCD & ĐKKD của KOC (Cloudflare R2)"
        />

        <Field label="Nhận xét phê duyệt của Kế toán" htmlFor="detail-finance-approve-note">
          <Textarea
            id="detail-finance-approve-note"
            rows={2}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Nhập nhận xét kiểm soát ngân sách, thuế khấu trừ & hồ sơ pháp lý..."
          />
        </Field>
      </div>
    </Modal>
  );
}

function RequestSignDialog({
  open,
  record,
  contractCode,
  signTags,
  busy,
  onClose,
  onSubmit,
}: {
  open: boolean;
  record: ContractRecord;
  contractCode: string;
  signTags: readonly string[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (partyAEmail: string, partyBEmail: string) => unknown;
}) {
  const [partyAEmail, setPartyAEmail] = useState('hopdong@upbase.vn');
  const [partyBEmail, setPartyBEmail] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [prevOpenKey, setPrevOpenKey] = useState('');

  const curOpenKey = open ? `${record.id}:${record.revision}` : '';
  if (curOpenKey && curOpenKey !== prevOpenKey) {
    setPrevOpenKey(curOpenKey);
    const rawEmail =
      record.values['PARTY_B_EMAIL'] ||
      record.values['src:email'] ||
      record.values['token:[ĐIỀN EMAIL]'] ||
      record.values['token:[EMAIL]'] ||
      '';
    setPartyBEmail(rawEmail.trim());
    setConfirmed(false);
  } else if (!open && prevOpenKey) {
    setPrevOpenKey('');
  }

  const ready = Boolean(partyAEmail.trim() && partyBEmail.trim() && confirmed);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Trình ký WeSign qua contract-system (requestSign)"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button
            variant="primary"
            disabled={busy || !ready}
            onClick={() => onSubmit(partyAEmail.trim(), partyBEmail.trim())}
          >
            Gửi ký WeSign (requestSign)
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-line bg-sunken/70 p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-ink-3">Mã định danh chống trùng (Idempotent code)</span>
            <span className="font-code font-semibold text-ink">{contractCode}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-ink-3">Nguồn tệp trình ký (Bước 6)</span>
            <span className="font-medium text-ink">
              {record.contractSystem?.googleDocsUrl
                ? 'Xuất .docx mới nhất từ Google Docs'
                : `Bản duyệt nội bộ v${record.version}`}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-ink-3">Chế độ ký & Thời hạn (Bước 3 & 8)</span>
            <span className="font-medium text-ink">
              Ký tuần tự (Bên A → Bên B) · Hạn 7 ngày
            </span>
          </div>
          {signTags.length > 0 && (
            <div className="pt-1 border-t border-line flex flex-wrap items-center justify-between gap-2">
              <span className="text-ink-3">Thẻ vị trí chữ ký tự động tách</span>
              <div className="flex flex-wrap gap-2">
                {signTags.map(tag => (
                  <span key={tag} className="font-code text-2xs px-2 py-0.5 rounded bg-surface border border-line text-accent">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Email đại diện Bên A (UpBase) *" htmlFor="req-sign-party-a">
            <Input
              id="req-sign-party-a"
              type="email"
              value={partyAEmail}
              onChange={e => setPartyAEmail(e.target.value)}
              placeholder="hopdong@upbase.vn"
            />
          </Field>
          <Field label={`Email ký số Bên B (${record.partner}) *`} htmlFor="req-sign-party-b">
            <Input
              id="req-sign-party-b"
              type="email"
              value={partyBEmail}
              onChange={e => setPartyBEmail(e.target.value)}
              placeholder="koc@example.com"
            />
          </Field>
        </div>

        <label className="flex items-start gap-2 text-xs text-ink-2 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 rounded border-line"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
          />
          <span>
            Tôi xác nhận phát lệnh <span className="font-code font-semibold text-ink">requestSign</span> sang{' '}
            <span className="font-code font-semibold text-ink">contract-system</span> với mã{' '}
            <span className="font-code font-semibold text-ink">{contractCode}</span> và nhận trạng thái tự động tại Bước 13.
          </span>
        </label>
      </div>
    </Modal>
  );
}

