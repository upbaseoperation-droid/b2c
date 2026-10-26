'use client';

/**
 * Hồ sơ một hợp đồng. Cột chính: tiến trình duyệt → ký, kiểm tra nội dung, nội dung đã điền.
 * Cột phụ: thông tin hồ sơ, phiên bản, lịch sử. Nút chính đổi theo việc người xem cần làm tiếp.
 */

import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, Download, FileCheck2, FilePlus2, Pencil, RefreshCw, RotateCcw, Scale, ScanSearch } from 'lucide-react';
import type { BookingDealItem, KocItem } from '../../lib/types';
import type { ContractField, ContractRecord, ContractRole, DocBlock } from '../../lib/contracts/types';
import { ActionMenu, Button, ConfirmDialog, EmptyState, Field, Input, Modal, Person, SectionHeader, Select, Status, Textarea } from '../ui';
import type { ActionMenuItem, StatusTone } from '../ui';
import { formatDate } from '../../lib/format';
import { contractApi, type ContractBootstrap } from './api';
import { ContractDocumentViewer } from './ContractDocumentViewer';
import { VideoProductScreenshotModal } from './VideoProductScreenshotModal';
import { findSavedScreenshotsForContext } from '../../lib/acceptanceScreenshotStore';
import { HISTORY_LABEL, ROLE_LABEL, computeSigningProgress, contractStatus, dateTime, isAcceptance, signerStatus, stepStatus } from './contractUi';
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
  onCreateAcceptance: () => void;
  onCreateSow?: () => void;
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
  const myStep = record.approval === 'IN_REVIEW' ? record.steps.find(s => s.reviewerId === me.id && s.status === 'PENDING') : undefined;
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

  const [dialog, setDialog] = useState<null | 'submit' | 'approve' | 'changes' | 'reject' | 'withdraw' | 'link'>(null);
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

  // Nút chính: việc tiếp theo của người đang xem.
  const primary = canSubmit ? (
    <Button variant="primary" icon={FileCheck2} disabled={busy} onClick={() => setDialog('submit')}>Gửi duyệt</Button>
  ) : myStep ? (
    <Button variant="primary" disabled={busy} onClick={() => setDialog('approve')}>Duyệt</Button>
  ) : canStartSigning && data.config.wesign ? (
    <Button variant="primary" disabled={busy} onClick={() => setDialog('link')}>Liên kết luồng ký</Button>
  ) : canStartSigning && demo ? (
    <Button variant="primary" disabled={busy} onClick={() => onAction({ action: 'DEMO_SIGN_START' }, 'Đã bắt đầu lượt ký thử')}>Bắt đầu ký thử</Button>
  ) : signing?.status === 'COMPLETED' && isFrameworkWithSow && onCreateSow && me.roles.includes('CREATOR') ? (
    <Button variant="primary" icon={FilePlus2} onClick={onCreateSow}>Tạo phụ lục SOW</Button>
  ) : signing?.status === 'COMPLETED' && !isAcceptance(record.templateId) && !isFrameworkWithSow && !hasAcceptance && me.roles.includes('CREATOR') ? (
    <Button variant="primary" icon={FilePlus2} onClick={onCreateAcceptance}>Tạo biên bản nghiệm thu</Button>
  ) : null;

  const menu: ActionMenuItem[] = [
    ...(myStep ? [{ label: 'Từ chối', onSelect: () => setDialog('reject') }] : []),
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

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={onBack} className="-ml-2.5">Hợp đồng</Button>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 grid gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-ink">{record.title}</h2>
            <Status tone={status.tone}>{status.label}</Status>
            {status.note && <span className="text-[13px] text-ink-3">{status.note}</span>}
          </div>
          <p className="text-[13px] text-ink-2">
            {[record.partner, record.brand, template?.name, `Phiên bản ${record.version}`].filter(Boolean).join(' · ')}
            {record.dealCode && <span className="text-ink-3"> · Booking <span className="font-code">{record.dealCode}</span></span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAcceptanceDoc && (
            <Button
              variant="secondary"
              icon={Camera}
              disabled={busy}
              onClick={() => setScreenshotModalOpen(true)}
            >
              Lấy thông tin Link Air & cắt ảnh nghiệm thu{shownScreenshots.length > 0 ? ` (${shownScreenshots.length})` : ''}
            </Button>
          )}
          {isFrameworkWithSow && onCreateSow && me.roles.includes('CREATOR') && (
            <Button variant="secondary" icon={FilePlus2} disabled={busy} onClick={onCreateSow}>
              Tạo phụ lục SOW
            </Button>
          )}
          {editable && <Button icon={Pencil} onClick={onEdit}>Sửa</Button>}
          {myStep && <Button disabled={busy} onClick={() => setDialog('changes')}>Yêu cầu sửa</Button>}
          <a href={`/api/contracts/${record.id}/document`} className="inline-flex items-center gap-1.5 h-[34px] px-3.5 rounded-md border border-line-strong bg-surface text-[13.5px] font-medium text-ink hover:bg-sunken">
            <Download className="w-4 h-4 text-ink-3" strokeWidth={1.75} />Tải Word
          </a>
          {primary}
          {menu.length > 0 && <ActionMenu items={menu} />}
        </div>
      </header>

      <div className="grid gap-6 items-start lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-6 min-w-0">
          {record.hasCustomTerms && (
            <div className="rounded-xl border border-warning/50 bg-warning-soft/70 p-4 space-y-1.5">
              <span className="font-semibold text-xs text-warning-strong flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Điều khoản KOC đề xuất sửa / Thỏa thuận riêng
              </span>
              <p className="text-sm font-medium text-ink">
                {record.customTermsSummary || 'Hồ sơ có yêu cầu chỉnh sửa riêng so với mẫu chuẩn (Cần Pháp chế thẩm định trước khi chuyển Kế toán)'}
              </p>
            </div>
          )}

          {/* Tiến trình */}
          <section className="grid gap-3">
            <SectionHeader title="Tiến trình" />
            <ol className="bg-surface border border-line rounded-xl divide-y divide-line">
              <Step title="Soạn hồ sơ" who={record.ownerName} status={record.approval === 'DRAFT' && !record.steps.length ? { label: 'Nháp', tone: 'neutral' } : { label: 'Hoàn tất', tone: 'positive' }} meta={`Phiên bản ${record.version}`} />
              {record.steps.length === 0 ? (
                <li className="px-4 py-3 text-[13px] text-ink-3">Chưa gửi duyệt.</li>
              ) : (
                record.steps.map((s, i) => (
                  <Step key={`${s.reviewerId}-${i}`} title={ROLE_LABEL[s.role]} who={s.reviewerName} status={stepStatus(s)} meta={s.decidedAt ? dateTime(s.decidedAt) : undefined} note={s.note} />
                ))
              )}
              <li className="px-4 py-3.5 grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-medium text-ink">Ký điện tử · MISA AMIS weSign</span>
                    {signing ? (
                      <Status tone={signingProgress?.tone || contractStatus(record).tone}>
                        {signing.status === 'COMPLETED' ? 'Đã ký hoàn tất' : contractStatus(record).label}
                      </Status>
                    ) : (
                      <Status>Chưa trình ký</Status>
                    )}
                    {signingProgress && (
                      <span className="text-2xs font-semibold px-2 py-0.5 rounded-md border border-line bg-sunken text-ink tabular-nums">
                        {signingProgress.completedCount}/{signingProgress.totalCount} bước ký ({signingProgress.progressPercent}%)
                      </span>
                    )}
                    {signing?.provider === 'DEMO' && (
                      <span className="text-2xs text-warning">Chế độ ký thử (Chưa gửi MISA)</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {canStartSigning && (
                      <Button size="sm" variant="secondary" disabled={busy} onClick={() => setDialog('link')}>
                        Gắn mã luồng ký weSign
                      </Button>
                    )}
                    {signing && signing.provider !== 'DEMO' && (
                      <Button
                        size="sm"
                        icon={RefreshCw}
                        disabled={busy}
                        onClick={() => onAction({ action: 'SYNC_WESIGN' }, 'Đã đồng bộ tiến độ ký từ MISA weSign')}
                      >
                        Đồng bộ weSign
                      </Button>
                    )}
                    {signing?.provider === 'DEMO' && coordinator && ['WAITING', 'PARTIAL'].includes(signing.status) && (
                      <>
                        <Button size="sm" disabled={busy} onClick={() => onAction({ action: 'DEMO_SIGN_NEXT' })}>
                          Ký thử người tiếp theo
                        </Button>
                        <Button size="sm" variant="ghost" disabled={busy} onClick={() => onAction({ action: 'DEMO_SIGN_REJECT' })}>
                          Từ chối thử
                        </Button>
                      </>
                    )}
                    {signing?.status === 'COMPLETED' && signing.provider !== 'DEMO' && (
                      <a
                        href={`/api/contracts/${record.id}/document?signed=1`}
                        className="inline-flex items-center gap-1 rounded-md border border-positive/40 bg-positive-soft px-2.5 py-1 text-xs font-medium text-positive hover:underline"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Tải bản đã ký weSign (.pdf)
                      </a>
                    )}
                  </div>
                </div>

                {!signing && record.approval !== 'APPROVED' && (
                  <p className="text-[13px] text-ink-3">
                    Luồng ký weSign sẽ mở khóa ngay sau khi phiên bản v{record.version} hoàn tất phê duyệt nội bộ.
                  </p>
                )}
                {!signing && record.approval === 'APPROVED' && (
                  <div className="rounded-lg border border-line bg-sunken/40 p-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-2">
                    <span>
                      Hồ sơ đã đủ phê duyệt. Nhập <strong>Mã tài liệu (UUID)</strong> từ MISA AMIS weSign để hệ thống tự động theo dõi tiến độ từng bước ký và tải bản PDF hoàn tất.
                    </span>
                    {!data.config.wesign && (
                      <span className="text-2xs text-warning-strong font-medium">
                        Cần cấu hình biến môi trường WESIGN_ACCESS_TOKEN để đồng bộ trực tiếp với máy chủ MISA
                      </span>
                    )}
                  </div>
                )}

                {signing && signingProgress && (
                  <div className="rounded-xl border border-line bg-sunken/30 p-3.5 space-y-3">
                    {/* Thanh tiến độ ký tổng thể */}
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-ink">
                          Tiến độ luồng ký: {signingProgress.summaryText}
                        </span>
                        <span className="text-2xs text-ink-3 font-code">
                          UUID: {signing.documentId}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-line overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            signing.status === 'COMPLETED'
                              ? 'bg-positive'
                              : signing.status === 'REJECTED'
                                ? 'bg-critical'
                                : 'bg-accent'
                          }`}
                          style={{ width: `${Math.max(4, signingProgress.progressPercent)}%` }}
                        />
                      </div>
                    </div>

                    {/* Cảnh báo người đang giữ lượt ký hiện tại */}
                    {['WAITING', 'PARTIAL'].includes(signing.status) && signingProgress.currentSignerName && (
                      <div className="rounded-lg border border-accent/30 bg-accent-soft/40 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-ink">
                          Đang chờ ký tại lượt hiện hành:{' '}
                          <strong className="text-accent">{signingProgress.currentSignerName}</strong>
                          {signingProgress.currentSignerEmail && (
                            <span className="text-ink-2"> ({signingProgress.currentSignerEmail})</span>
                          )}
                        </span>
                        <Status tone="warning">Đang giữ lượt ký</Status>
                      </div>
                    )}

                    {/* Danh sách từng bước ký trả về từ weSign */}
                    <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
                      {signing.people.map((p, i) => {
                        const s = signerStatus(p.action, p.status);
                        const stepNum = p.level ?? i + 1;
                        const roleText = p.roleLabel || 'Người ký';
                        return (
                          <li key={i} className="px-3 py-2.5 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-2xs font-semibold shrink-0 ${
                                  p.action === 2
                                    ? 'bg-positive-soft text-positive border border-positive/30'
                                    : p.action === 1
                                      ? 'bg-warning-soft text-warning-strong border border-warning/40'
                                      : p.action === 3
                                        ? 'bg-critical-soft text-critical border border-critical/30'
                                        : 'bg-sunken text-ink-3 border border-line'
                                }`}
                              >
                                {stepNum}
                              </span>
                              <Person name={p.name} sub={p.email} size={24} />
                              <span className="text-2xs px-1.5 py-0.5 rounded bg-sunken border border-line text-ink-2">
                                {roleText}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {p.at && <span className="text-2xs text-ink-3 tabular-nums">{dateTime(p.at)}</span>}
                              <Status tone={s.tone}>{s.label}</Status>
                            </div>
                          </li>
                        );
                      })}
                    </ul>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-2xs text-ink-3">
                      <span>
                        Đồng bộ gần nhất: {dateTime(signing.syncedAt)} · Đối chiếu bản duyệt v{signing.version}
                        {signing.name ? ` · Tên trên weSign: ${signing.name}` : ''}
                      </span>
                      {signing.provider !== 'DEMO' && ['WAITING', 'PARTIAL'].includes(signing.status) && (
                        <span>Tự động đọc tiến độ mỗi 2 phút hoặc nhận qua Webhook weSign</span>
                      )}
                    </div>
                  </div>
                )}
                {signing?.error && <p role="alert" className="text-[13px] text-critical">{signing.error}</p>}
              </li>
            </ol>
          </section>

          {/* Kiểm tra nội dung */}
          <section className="grid gap-3">
            <SectionHeader
              title="Kiểm tra nội dung"
              actions={canCheck && <Button size="sm" icon={ScanSearch} disabled={busy} onClick={() => onAction({ action: 'CHECK' }, 'Đã kiểm tra nội dung')}>Kiểm tra</Button>}
            />
            <div className="bg-surface border border-line rounded-xl px-4 py-3">
              {!current ? (
                <p className="text-[13px] text-ink-3">
                  Chưa kiểm tra phiên bản {record.version}.{record.checks.length > 0 && ' Kết quả của phiên bản trước không còn áp dụng.'}
                </p>
              ) : current.findings.length === 0 ? (
                <p className="text-[13px] text-positive">Không thấy vấn đề trong phạm vi đã kiểm tra · {dateTime(current.at)}</p>
              ) : (
                <ul className="grid gap-3">
                  {current.findings.map((f, i) => (
                    <li
                      key={i}
                      onClick={f.fieldKey ? () => setActiveFieldKey(f.fieldKey!) : undefined}
                      className={`pl-3 border-l-2 ${f.severity === 'ERROR' ? 'border-critical' : f.severity === 'WARNING' ? 'border-warning' : 'border-line-strong'} ${f.fieldKey ? 'cursor-pointer hover:bg-sunken/60 rounded-r py-0.5' : ''}`}
                    >
                      <p className="text-[13px] text-ink">
                        {f.message}
                        {f.fieldKey && <span className="ml-2 text-2xs text-accent hover:underline">Xem trên hợp đồng ↓</span>}
                      </p>
                      {f.evidence && <p className="text-2xs text-ink-3 mt-0.5 line-clamp-2">{f.evidence}</p>}
                    </li>
                  ))}
                  <li className="text-2xs text-ink-3">{current.provider === 'AI' ? 'Gợi ý' : 'Kiểm tra ô bắt buộc'} · {dateTime(current.at)}</li>
                </ul>
              )}
            </div>
          </section>

          {/* Quy chuẩn pháp chế & Luồng phê duyệt */}
          {(() => {
            const allFields = previewData?.fields || template?.fields || [];
            const parseNum = (val?: string) => {
              const raw = (val || '').replace(/[^\d]/g, '');
              return raw ? Number(raw) : 0;
            };
            const baseField =
              allFields.find(f => f.source === 'netTotal') ||
              allFields.find(f => f.source === 'lineTotal') ||
              allFields.find(f => f.source === 'unitPrice');
            const customTokenNum = parseNum(
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
              moneyFields.reduce((max, f) => Math.max(max, parseNum(shownValues[f.key])), 0);
            const advField = allFields.find(f => f.source === 'advanceAmount');
            const parsedAdvance =
              (advField ? parseNum(shownValues[advField.key]) : 0) ||
              parseNum(shownValues['token:[Số tiền tạm ứng đợt 1]']) ||
              linkedDeal?.advanceAmount ||
              0;
            const ruleEvaluation = evaluateContractRules({
              koc: linkedKoc,
              deal: linkedDeal,
              kind: isAcceptance(record.templateId) ? 'ACCEPTANCE' : 'CONTRACT',
              totalValue: linkedDeal?.totalValue || baseContractValue || 0,
              advanceAmount: parsedAdvance,
              actualSettledValue: baseContractValue > 0 ? baseContractValue : undefined,
              hasCustomTerms: record.hasCustomTerms,
              isKolForm: record.isKocOwnForm || template?.scope === 'KOC_CUSTOM',
              availableTemplates: data.templates,
            });

            return (
              <section className="grid gap-3">
                <SectionHeader
                  title="Quy chuẩn pháp chế & Luồng duyệt"
                  actions={
                    <Status tone={ruleEvaluation.isHighValueKoc ? 'warning' : 'positive'}>
                      {ruleEvaluation.reviewStream.streamName}
                    </Status>
                  }
                />
                <div className="bg-surface border border-line rounded-xl p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-2xs text-ink-3 block">Mẫu hợp đồng (BR-01)</span>
                    <span className={`text-xs font-semibold block ${ruleEvaluation.isHighValueKoc ? 'text-accent' : 'text-positive'}`}>
                      {ruleEvaluation.isHighValueKoc ? '≥ 50 triệu (Được dùng mẫu KOC)' : 'Dưới 50 triệu (100% mẫu UpBase)'}
                    </span>
                    <span className="text-2xs text-ink-3 block">{ruleEvaluation.templateCompliance.note}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-2xs text-ink-3 block">Nghĩa vụ ký (BR-03)</span>
                    <span className={`text-xs font-semibold block ${ruleEvaluation.isContractMandatory ? 'text-ink' : 'text-positive'}`}>
                      {ruleEvaluation.isContractMandatory ? 'Bắt buộc ký hợp đồng' : 'Miễn HĐ giấy'}
                    </span>
                    <span className="text-2xs text-ink-3 block">{ruleEvaluation.contractMandatoryReason}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-2xs text-ink-3 block">Nghiệm thu (BR-04)</span>
                    <span className={`text-xs font-semibold block ${ruleEvaluation.isAcceptanceMandatory ? 'text-ink' : 'text-positive'}`}>
                      {ruleEvaluation.isAcceptanceMandatory ? 'Bắt buộc lập BBNT' : 'Thanh lý tự động'}
                    </span>
                    <span className="text-2xs text-ink-3 block">{ruleEvaluation.acceptanceMandatoryReason}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-2xs text-ink-3 block">Thời hạn xử lý (SLA)</span>
                    <span className="text-xs font-semibold text-accent block">TCKT {ruleEvaluation.reviewStream.slaHoursTckt}h · Pháp chế {ruleEvaluation.reviewStream.slaHoursLegal}h</span>
                    <span className="text-2xs text-ink-3 block">{ruleEvaluation.reviewStream.flowDescription}</span>
                  </div>
                </div>
              </section>
            );
          })()}

          {/* Đối soát tài chính & hạn mức Booking (Dành cho Kế toán & Lead) */}
          {(() => {
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
              moneyFields.reduce((max, f) => Math.max(max, parseNum(shownValues[f.key])), 0);
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

            return (
              <section className="grid gap-3">
                <SectionHeader
                  title="Đối soát tài chính & Hạn mức Booking"
                  actions={
                    dealValue > 0 && baseContractValue > 0 ? (
                      <Status tone={diff === 0 ? 'positive' : diff > 0 ? 'critical' : 'warning'}>
                        {diff === 0
                          ? 'Khớp 100% giá trị Booking'
                          : diff > 0
                            ? `Vượt Booking +${diff.toLocaleString('vi-VN')} đ`
                            : `Thấp hơn Booking ${Math.abs(diff).toLocaleString('vi-VN')} đ`}
                      </Status>
                    ) : (
                      <span className="text-xs text-ink-2">Chế độ thuế: {subject}</span>
                    )
                  }
                />
                <div className="bg-surface border border-line rounded-xl p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-2xs text-ink-3 block">Giá trị thù lao dịch vụ</span>
                    <span className="text-sm font-semibold text-ink tabular-nums block">
                      {baseContractValue > 0 ? `${baseContractValue.toLocaleString('vi-VN')} đ` : 'Chưa điền số tiền'}
                    </span>
                    <span className="text-2xs text-ink-3 block">
                      {grossContractValue > baseContractValue
                        ? `Tổng gồm thuế: ${grossContractValue.toLocaleString('vi-VN')} đ`
                        : template?.kind === 'ACCEPTANCE'
                          ? 'Giá trị nghiệm thu quyết toán'
                          : 'Tổng thù lao dịch vụ'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-2xs text-ink-3 block">Hạn mức Deal Booking gốc</span>
                    <span className="text-sm font-semibold text-ink tabular-nums block">
                      {linkedDeal ? `${dealValue.toLocaleString('vi-VN')} đ` : 'Hồ sơ độc lập'}
                    </span>
                    <span className="text-2xs text-ink-3 block">
                      {linkedDeal
                        ? `${linkedDeal.dealCode} · Khung ${linkedDeal.salaryGrade} · Tạm ứng ${linkedDeal.advanceAmount.toLocaleString('vi-VN')} đ`
                        : 'Không gắn mã Booking'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-2xs text-ink-3 block">Khấu trừ thuế / Hóa đơn</span>
                    <span className="text-sm font-semibold text-ink tabular-nums block">
                      {isIndividual
                        ? pitWithholding > 0
                          ? `TNCN 10%: ${pitWithholding.toLocaleString('vi-VN')} đ`
                          : 'TNCN 0 đ (< 2 triệu)'
                        : explicitVat > 0
                          ? `VAT: ${explicitVat.toLocaleString('vi-VN')} đ`
                          : 'Xuất hóa đơn theo ĐKKD'}
                    </span>
                    <span className="text-2xs text-ink-3 block">
                      {isIndividual ? 'Khấu trừ tại nguồn trước khi chi' : `Đối tác ${subject} xuất hóa đơn`}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-2xs text-ink-3 block">Thực chi cho Bên B (Net)</span>
                    <span className="text-sm font-semibold text-positive tabular-nums block">
                      {netPayout > 0 ? `${netPayout.toLocaleString('vi-VN')} đ` : '—'}
                    </span>
                    <span className="text-2xs text-ink-3 block">
                      {isAcceptance(record.templateId) ? 'Đủ điều kiện trình duyệt chi' : 'Tất toán sau khi có BBNT'}
                    </span>
                  </div>
                </div>
              </section>
            );
          })()}

          {/* Xem trực tiếp văn bản hợp đồng trên màn hình */}
          <section className="grid gap-3">
            <SectionHeader
              title="Văn bản hợp đồng trực tiếp"
            />
            {previewError && <p role="alert" className="text-[13px] text-critical">{previewError}</p>}
            {previewLoading && !previewData ? (
              <div className="bg-surface border border-line rounded-xl p-8 text-center text-[13px] text-ink-3">
                Đang dựng văn bản hợp đồng…
              </div>
            ) : (
              <ContractDocumentViewer
                title={record.title}
                templateName={
                  record.isKocOwnForm && record.customFile
                    ? `Tệp KOC: ${record.customFile.filename} · Phiên bản ${selectedVersion}`
                    : `${template?.name || record.templateId} · Phiên bản ${selectedVersion}`
                }
                blocks={previewData?.blocks || record.customFile?.blocks || template?.blocks || []}
                paragraphs={previewData?.paragraphs || record.customFile?.paragraphs || []}
                fields={record.isKocOwnForm ? [] : (previewData?.fields || template?.fields || [])}
                values={shownValues}
                compareValues={comparePrev && previousSnapshot ? previousSnapshot.values : undefined}
                activeFieldKey={activeFieldKey}
                onSelectField={key => setActiveFieldKey(key)}
                downloadHref={`/api/contracts/${record.id}/document?version=${selectedVersion}`}
                signingPeople={selectedVersion === signing?.version ? signing.people : undefined}
                acceptanceScreenshots={shownScreenshots}
                isTemplatePreview={record.isKocOwnForm}
                versionSelector={
                  record.versions.length > 0 ? (
                    <div className="inline-flex items-center gap-1.5">
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
                        <label className="inline-flex items-center gap-1 text-2xs text-ink-2 cursor-pointer px-1.5">
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
        </div>

        <aside className="bg-surface border border-line rounded-xl divide-y divide-line min-w-0">
          <AsideSection title="Thông tin">
            <dl className="grid gap-3">
              <Info label="Người phụ trách"><Person name={record.ownerName} size={20} /></Info>
              <Info label="Mẫu">
                {record.isKocOwnForm && record.customFile
                  ? `Tệp riêng KOC (${record.customFile.filename})`
                  : (template?.name || record.templateId)}
              </Info>
              <Info label="Đối tác">{record.partner}</Info>
              <Info label="Nhãn hàng">{record.brand}</Info>
              {record.dealCode && <Info label="Booking"><span className="font-code">{record.dealCode}</span></Info>}
              {parent && (
                <Info label={record.templateId.endsWith('-SOW') ? 'Hợp đồng nguyên tắc gốc' : 'Hồ sơ gốc'}>
                  <button type="button" className="text-accent hover:underline text-left" onClick={() => onOpen(parent.id)}>{parent.title}</button>
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
              {record.internalNotes && (
                <Info label="Lưu ý đàm phán">
                  <span className="text-xs text-ink-2 italic break-words">{record.internalNotes}</span>
                </Info>
              )}
              {signing && <Info label="Mã luồng ký"><span className="font-code text-2xs break-all">{signing.documentId}</span></Info>}
              <Info label="Tạo lúc">{dateTime(record.createdAt)}</Info>
            </dl>
          </AsideSection>
          <AsideSection title="Phiên bản">
            <ul className="grid gap-1.5 text-[13px]">
              <li className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedVersion(record.version)}
                  className={`text-left hover:underline ${selectedVersion === record.version ? 'font-semibold text-accent' : 'text-ink'}`}
                >
                  Phiên bản {record.version} <span className="text-ink-3 font-normal">· hiện tại</span>
                </button>
                <a className="text-accent hover:underline shrink-0" href={`/api/contracts/${record.id}/document`}>Tải</a>
              </li>
              {[...record.versions].reverse().map(v => (
                <li key={v.version} className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedVersion(v.version)}
                    className={`text-left hover:underline ${selectedVersion === v.version ? 'font-semibold text-accent' : 'text-ink-2'}`}
                  >
                    Phiên bản {v.version} <span className="text-ink-3 font-normal">· {dateTime(v.at)}</span>
                  </button>
                  <a className="text-accent hover:underline shrink-0" href={`/api/contracts/${record.id}/document?version=${v.version}`}>Tải</a>
                </li>
              ))}
            </ul>
          </AsideSection>
          {(legalNotes || kocTemplate) && (
            <AsideSection title="Lưu ý của Pháp chế">
              <div className="rounded-lg bg-warning-soft/70 border border-warning/30 p-2.5 text-xs text-ink space-y-1.5">
                <div className="font-semibold text-warning-strong flex items-center justify-between gap-1">
                  <span className="flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 shrink-0" />
                    Lưu ý cho {record.partner}
                  </span>
                  {kocTemplate && (
                    <span className="text-2xs font-normal px-1.5 py-0.5 rounded bg-surface border border-line text-ink-2">
                      Mẫu đã duyệt
                    </span>
                  )}
                </div>
                {legalNotes && (
                  <p className="text-xs text-ink whitespace-pre-wrap leading-relaxed">
                    {legalNotes}
                  </p>
                )}
                {kocTemplate && (
                  <div className="text-2xs text-ink-3 pt-1 border-t border-line/60">
                    Mẫu: {kocTemplate.name}
                    {kocTemplate.approvedByLegal && ` · ${kocTemplate.approvedByLegal}`}
                    {kocTemplate.approvedAt && ` · ${formatDate(kocTemplate.approvedAt)}`}
                  </div>
                )}
              </div>
            </AsideSection>
          )}
          <DiscussionAndHistory
            record={record}
            onAddNote={note => onAction({ action: 'ADD_NOTE', note }, 'Đã lưu ghi chú đàm phán')}
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
        onSubmit={(ids, reqLegal) => onAction({ action: 'SUBMIT', reviewers: ids, requireLegal: reqLegal }, 'Đã gửi duyệt').then(r => r && setDialog(null))}
      />
      <LinkDialog open={dialog === 'link'} version={record.version} busy={busy} onClose={() => setDialog(null)} onSubmit={documentId => onAction({ action: 'LINK_WESIGN', documentId, confirmed: true }, 'Đã liên kết luồng ký').then(r => r && setDialog(null))} />
      {myStep?.role === 'LEGAL' ? (
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
    <li className="px-4 py-3 grid gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[13px] font-medium text-ink w-24 shrink-0">{title}</span>
          <Person name={who} size={20} />
        </div>
        <div className="flex items-center gap-2">
          {meta && <span className="text-2xs text-ink-3">{meta}</span>}
          <Status tone={status.tone}>{status.note || status.label}</Status>
        </div>
      </div>
      {note && <p className="text-[13px] text-ink-2 whitespace-pre-wrap pl-[108px]">{note}</p>}
    </li>
  );
}

function AsideSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-4 py-4">
      <h3 className="text-sm font-semibold text-ink mb-3">{title}</h3>
      {children}
    </section>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-2xs text-ink-3">{label}</dt>
      <dd className="text-[13px] text-ink break-words">{children}</dd>
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
        <ol className="grid gap-3">
          {shown.map((h, i) => (
            <li key={i} className={`grid gap-0.5 pl-2.5 border-l-2 ${h.action === 'NOTE' ? 'border-accent' : 'border-line'}`}>
              <div className="flex items-center justify-between gap-1">
                <span className={`text-[13px] font-medium ${h.action === 'NOTE' ? 'text-accent' : 'text-ink'}`}>
                  {HISTORY_LABEL[h.action] || h.action}
                </span>
                <span className="text-2xs text-ink-3">v{h.version}</span>
              </div>
              <span className="text-2xs text-ink-3">{h.actorName} · {dateTime(h.at)}</span>
              {h.note && !/^-?\d+$/.test(h.note) && (
                <span className={`text-2xs mt-0.5 ${h.action === 'NOTE' ? 'text-ink font-normal bg-sunken/60 p-1.5 rounded' : 'text-ink-2 line-clamp-3'}`}>
                  {h.note}
                </span>
              )}
            </li>
          ))}
          {items.length > 8 && (
            <li>
              <button type="button" className="text-[13px] text-accent hover:underline" onClick={() => setAll(v => !v)}>
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
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [initKey, setInitKey] = useState('');
  const template = data.templates.find(t => t.id === record.templateId);
  const options = (role: ContractRole) => data.reviewers.filter(a => a.id !== record.ownerId && a.roles.includes(role) && (a.allBrands || a.brands.includes(record.brand)));

  const isExempt = template?.exemptLegalReview !== false && !record.hasCustomTerms;
  const [forceLegal, setForceLegal] = useState<boolean>(!isExempt);

  const currentKey = open ? `${record.id}:${record.version}` : '';
  if (currentKey !== initKey) {
    setInitKey(currentKey);
    if (open) {
      const legalOpts = options('LEGAL');
      const financeOpts = options('FINANCE');
      const leadOpts = options('LEAD');
      const defaultRoles = template?.defaultReviewRoles || ['LEGAL', 'FINANCE'];
      const defaultForceLegal = !isExempt;
      setForceLegal(defaultForceLegal);
      setPicked({
        LEGAL: defaultForceLegal ? (legalOpts[0]?.id || '') : '',
        FINANCE: financeOpts.find(a => a.id !== legalOpts[0]?.id)?.id || financeOpts[0]?.id || '',
        LEAD: defaultRoles.includes('LEAD') ? (leadOpts[0]?.id || '') : '',
      });
    }
  }

  const needLegal = forceLegal || Boolean(record.hasCustomTerms);
  const ready = !!picked.FINANCE && (!needLegal || (!!picked.LEGAL && picked.LEGAL !== picked.FINANCE));
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Gửi duyệt hồ sơ"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button
            variant="primary"
            disabled={busy || !ready}
            onClick={() => onSubmit(Object.values(picked).filter(Boolean), needLegal)}
          >
            Gửi duyệt
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {isExempt && !forceLegal ? (
          <div className="rounded-lg border border-positive/30 bg-positive-soft p-3 text-xs text-ink space-y-1">
            <div className="font-semibold text-positive flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              Áp dụng luồng chuẩn: Miễn duyệt Pháp chế
            </div>
            <p className="text-2xs text-ink-2">
              Hồ sơ dùng mẫu chuẩn và không có điều khoản sửa đổi riêng. Hồ sơ chuyển thẳng Kế toán soát xét ngân sách và thuế.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-warning/40 bg-warning-soft p-3 text-xs text-ink space-y-1">
            <div className="font-semibold text-warning-strong flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Bắt buộc Pháp chế (chị Liên) duyệt trước
            </div>
            <p className="text-2xs text-ink-2">
              {record.hasCustomTerms
                ? `Hồ sơ có thỏa thuận sửa đổi riêng theo yêu cầu của KOC: "${record.customTermsSummary || ''}".`
                : 'Mẫu biểu này yêu cầu Pháp chế thẩm định trước.'}
            </p>
          </div>
        )}

        {isExempt && (
          <label className="flex items-center gap-2 text-xs text-ink-2 cursor-pointer">
            <input
              type="checkbox"
              checked={forceLegal}
              onChange={e => {
                const nextForce = e.target.checked;
                setForceLegal(nextForce);
                if (nextForce && !picked.LEGAL) {
                  setPicked(p => ({ ...p, LEGAL: options('LEGAL')[0]?.id || '' }));
                }
              }}
              className="rounded border-line"
            />
            Yêu cầu thêm Pháp chế duyệt bổ sung nếu cần
          </label>
        )}

        {(['LEGAL', 'FINANCE', 'LEAD'] as const).map(role => {
          if (role === 'LEGAL' && !needLegal) return null;
          return (
            <Field
              key={role}
              label={`${ROLE_LABEL[role]}${role === 'LEAD' ? ' (tùy theo hạn mức / nhóm)' : ' *'}`}
              htmlFor={`rv-${role}`}
            >
              <Select
                id={`rv-${role}`}
                value={picked[role] || ''}
                onChange={e => setPicked(p => ({ ...p, [role]: e.target.value }))}
              >
                <option value="">{role === 'LEAD' ? 'Không cần' : 'Chọn người duyệt'}</option>
                {options(role).map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </Select>
            </Field>
          );
        })}

        {needLegal && picked.LEGAL && picked.LEGAL === picked.FINANCE && (
          <p className="text-2xs text-critical">Chọn hai người khác nhau cho pháp chế và kế toán.</p>
        )}
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
      <label className="flex items-start gap-2 text-[13px] text-ink-2">
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
          <label className="flex items-start gap-2.5 text-xs font-medium text-ink cursor-pointer">
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
