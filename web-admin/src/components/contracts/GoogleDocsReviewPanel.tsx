'use client';

import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  FileCheck2,
  FileText,
  MessageSquare,
  RefreshCw,
  Scale,
  Share2,
} from 'lucide-react';
import type {
  GoogleDocCommentItem,
  GoogleDocsAuditTrail,
  GoogleDocsReviewRouting,
} from '../../lib/contracts/googleDocsTypes';
import { Button, Segmented, Status } from '../ui';
import { formatDate } from '../../lib/format';

export interface ReviewStepSummary {
  reviewerName?: string;
  status: 'PENDING' | 'APPROVED' | 'CHANGES' | 'REJECTED';
  note?: string;
  decidedAt?: string;
}

export interface GoogleDocsReviewPanelProps {
  url?: string;
  docId?: string;
  sourceType?: 'TEMPLATE_AMENDED' | 'KOC_CUSTOM_DOC';
  routing?: GoogleDocsReviewRouting | null;
  comments?: GoogleDocCommentItem[];
  auditTrail?: GoogleDocsAuditTrail | null;
  onSyncComments?: () => Promise<void>;
  syncingComments?: boolean;
  onGenerateReport?: () => Promise<void>;
  generatingReport?: boolean;
  onApproveAndPushWeSign?: () => void;
  canApproveWeSign?: boolean;
  isFinanceRole?: boolean;
  isLegalRole?: boolean;
  isLeadRole?: boolean;
  approvalStatus?: string;
  compact?: boolean;
  legalStep?: ReviewStepSummary;
  financeStep?: ReviewStepSummary;
  onLegalApprove?: () => void;
  canLegalApprove?: boolean;
  /** Email tài khoản dịch vụ Google cần được chia sẻ file; rỗng khi máy chủ chưa kết nối Google. */
  shareEmail?: string;
}

export function GoogleDocsReviewPanel({
  url,
  sourceType = 'TEMPLATE_AMENDED',
  routing,
  comments = [],
  auditTrail,
  onSyncComments,
  syncingComments = false,
  onGenerateReport,
  generatingReport = false,
  onApproveAndPushWeSign,
  canApproveWeSign = false,
  legalStep,
  financeStep,
  onLegalApprove,
  canLegalApprove = false,
  shareEmail = '',
}: GoogleDocsReviewPanelProps) {
  const [copiedBotEmail, setCopiedBotEmail] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);
  // Mẫu của KOC không so với mẫu Upbase nên mở mặc định tab Báo cáo hoặc Bình luận.
  const [activeTab, setActiveTab] = useState<'DIFFS' | 'COMMENTS' | 'AUDIT_REPORT'>(
    sourceType === 'KOC_CUSTOM_DOC' ? 'AUDIT_REPORT' : 'DIFFS',
  );

  // Tổng hợp đóng góp (chỉnh sửa revision + bình luận + phản hồi) theo từng tài khoản
  const accountActivities = React.useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        name: string;
        email?: string;
        editCount: number;
        lastEditedAt?: string;
        commentCount: number;
        replyCount: number;
        deletedCommentCount: number;
        items: Array<{
          type: 'COMMENT' | 'REPLY' | 'EDIT';
          at: string;
          content?: string;
          quotedText?: string;
          deleted?: boolean;
          resolved?: boolean;
        }>;
      }
    >();

    const ensureAccount = (nameRaw?: string, emailRaw?: string) => {
      const name = (nameRaw || emailRaw || 'Ẩn danh').trim();
      const email = emailRaw?.trim();
      const key = (email || name).toLowerCase();
      let entry = map.get(key);
      if (!entry) {
        entry = {
          key,
          name,
          email: email && email !== name ? email : undefined,
          editCount: 0,
          commentCount: 0,
          replyCount: 0,
          deletedCommentCount: 0,
          items: [],
        };
        map.set(key, entry);
      }
      return entry;
    };

    for (const rev of auditTrail?.revisions || []) {
      const acc = ensureAccount(rev.author, rev.authorEmail);
      acc.editCount += 1;
      if (!acc.lastEditedAt || rev.modifiedTime > acc.lastEditedAt) {
        acc.lastEditedAt = rev.modifiedTime;
      }
      acc.items.push({
        type: 'EDIT',
        at: rev.modifiedTime,
        content: `Chỉnh sửa văn bản trên Google Docs (Phiên bản #${rev.id})`,
      });
    }

    for (const c of comments) {
      const acc = ensureAccount(c.author, c.authorEmail);
      acc.commentCount += 1;
      if (c.removedFromSourceAt) acc.deletedCommentCount += 1;
      acc.items.push({
        type: 'COMMENT',
        at: c.createdAt,
        content: c.content,
        quotedText: c.quotedText,
        deleted: Boolean(c.removedFromSourceAt),
        resolved: Boolean(c.resolved),
      });

      for (const r of c.replies || []) {
        const replyAcc = ensureAccount(r.author);
        replyAcc.replyCount += 1;
        replyAcc.items.push({
          type: 'REPLY',
          at: r.createdAt,
          content: r.content,
          quotedText: c.quotedText,
        });
      }
    }

    return [...map.values()].map(acc => ({
      ...acc,
      items: acc.items.sort((a, b) => b.at.localeCompare(a.at)),
    }));
  }, [auditTrail?.revisions, comments]);

  const handleCopyEmail = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(shareEmail);
      setCopiedBotEmail(true);
      setTimeout(() => setCopiedBotEmail(false), 2000);
    }
  };

  const handleCopyReport = () => {
    const raw = auditTrail?.negotiationReport?.rawReportText;
    if (raw && navigator?.clipboard) {
      navigator.clipboard.writeText(raw);
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2000);
    }
  };

  const diffs = routing?.clauseDiffs || [];
  const financeDiffs = diffs.filter(d => d.targetRole === 'FINANCE' || d.targetRole === 'BOTH');
  const legalDiffs = diffs.filter(d => d.targetRole === 'LEGAL' || d.targetRole === 'BOTH');
  const initialSnap = auditTrail?.initialSnapshot || auditTrail?.finalSnapshot;
  const finalSnap = auditTrail?.approvedSnapshot || auditTrail?.finalSnapshot;
  const initialToFinalDiffs = auditTrail?.initialToFinalDiffs || [];
  const report = auditTrail?.negotiationReport;

  return (
    <div className="space-y-4">
      {/* Khối tiêu đề & Thông tin tài liệu */}
      <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-ink">
                  {sourceType === 'TEMPLATE_AMENDED'
                    ? 'Hợp đồng sửa đổi điều khoản (Google Docs)'
                    : 'Hợp đồng mẫu riêng của KOC (Google Docs)'}
                </span>
                <Status tone={sourceType === 'TEMPLATE_AMENDED' ? 'warning' : 'neutral'}>
                  {sourceType === 'TEMPLATE_AMENDED' ? 'Sửa template' : 'Mẫu riêng KOC'}
                </Status>
              </div>
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-accent hover:underline flex items-center gap-1 truncate"
                >
                  <span className="truncate">{url}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {url && (
              <Button
                size="sm"
                variant="secondary"
                icon={ExternalLink}
                onClick={() => window.open(url, '_blank')}
              >
                Mở Google Docs
              </Button>
            )}
            {onSyncComments && (
              <Button
                size="sm"
                variant="secondary"
                icon={RefreshCw}
                disabled={syncingComments}
                onClick={onSyncComments}
              >
                {syncingComments ? 'Đang đồng bộ…' : 'Đồng bộ từ Google Doc'}
              </Button>
            )}
            {onGenerateReport && (
              <Button
                size="sm"
                variant="secondary"
                icon={FileCheck2}
                disabled={generatingReport}
                onClick={async () => {
                  setActiveTab('AUDIT_REPORT');
                  await onGenerateReport();
                }}
              >
                {generatingReport ? 'Đang tổng hợp…' : 'Tổng hợp & Lưu báo cáo'}
              </Button>
            )}
            {canApproveWeSign && onApproveAndPushWeSign && (
              <Button
                size="sm"
                variant="primary"
                icon={CheckCircle2}
                onClick={onApproveAndPushWeSign}
              >
                Duyệt & đẩy WeSign
              </Button>
            )}
          </div>
        </div>

        {/* Hộp chỉ dẫn phân quyền Google Docs */}
        {shareEmail && (
          <div className="rounded-lg border border-line bg-sunken/60 p-3 text-xs text-ink-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Share2 className="w-3.5 h-3.5 text-accent shrink-0" />
              <span>
                Chia sẻ file cho{' '}
                <code className="px-2 py-0.5 rounded bg-surface border border-line text-ink font-code text-2xs">
                  {shareEmail}
                </code>{' '}
                (quyền Người nhận xét) để hệ thống ghi nhận bản chụp ban đầu, bình luận, chỉnh sửa và bản chốt cuối.
              </span>
            </div>
            <Button
              size="sm"
              variant="secondary"
              icon={copiedBotEmail ? Check : Copy}
              onClick={handleCopyEmail}
            >
              {copiedBotEmail ? 'Đã sao chép' : 'Chép email'}
            </Button>
          </div>
        )}

        {/* Tóm tắt phân luồng thẩm định */}
        {routing && sourceType === 'KOC_CUSTOM_DOC' && (
          <p className="text-xs text-ink-2">
            Mẫu riêng của KOC: không so với mẫu Upbase. Pháp chế và Kế toán rà toàn bộ văn bản trên Google Doc; hệ thống đối chiếu trực tiếp giữa Bản đẩy lên ban đầu và Bản chốt cuối.
          </p>
        )}
        {routing && sourceType !== 'KOC_CUSTOM_DOC' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="rounded-lg border border-line bg-sunken/30 p-3">
              <span className="text-2xs text-ink-3 block">Tổng điều khoản sửa đổi</span>
              <span className="text-sm font-semibold text-ink">
                {diffs.length} điều khoản
              </span>
            </div>
            <div className="rounded-lg border border-line bg-accent-soft/30 p-3">
              <div className="flex items-center gap-1 text-2xs text-accent font-medium">
                <CreditCard className="w-3.5 h-3.5" />
                <span>Kế toán (TCKT) cần duyệt</span>
              </div>
              <span className="text-sm font-semibold text-ink">
                {financeDiffs.length} điều khoản
              </span>
            </div>
            <div className="rounded-lg border border-line bg-warning-soft/30 p-3">
              <div className="flex items-center gap-1 text-2xs text-warning-strong font-medium">
                <Scale className="w-3.5 h-3.5" />
                <span>Pháp chế cần duyệt</span>
              </div>
              <span className="text-sm font-semibold text-ink">
                {legalDiffs.length} điều khoản
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tiến trình duyệt: Pháp chế duyệt trước, Kế toán duyệt sau rồi đẩy WeSign */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Bước 1: Pháp chế duyệt */}
        <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-warning-soft text-warning-strong flex items-center justify-center shrink-0">
                <Scale className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-ink block">Pháp chế thẩm định điều khoản</span>
            </div>
            <Status
              tone={
                legalStep?.status === 'APPROVED'
                  ? 'positive'
                  : legalStep?.status === 'CHANGES'
                  ? 'warning'
                  : legalStep?.status === 'REJECTED'
                  ? 'critical'
                  : 'neutral'
              }
            >
              {legalStep?.status === 'APPROVED'
                ? 'Đã duyệt'
                : legalStep?.status === 'CHANGES'
                ? 'Yêu cầu sửa'
                : legalStep?.status === 'REJECTED'
                ? 'Từ chối'
                : 'Chờ duyệt'}
            </Status>
          </div>

          {legalStep?.reviewerName && (
            <div className="text-2xs text-ink-2 pt-1 border-t border-line flex items-center justify-between">
              <span>
                Người duyệt: <strong className="text-ink">{legalStep.reviewerName}</strong>
              </span>
              {legalStep.decidedAt && <span>{formatDate(legalStep.decidedAt)}</span>}
            </div>
          )}

          {legalStep?.note && (
            <p className="text-2xs text-ink-2 italic bg-sunken/40 p-2 rounded border border-line">
              &ldquo;{legalStep.note}&rdquo;
            </p>
          )}

          {canLegalApprove && onLegalApprove && legalStep?.status === 'PENDING' && (
            <div className="pt-1">
              <Button size="sm" variant="secondary" icon={Scale} onClick={onLegalApprove}>
                Pháp chế duyệt
              </Button>
            </div>
          )}
        </div>

        {/* Bước 2: Kế toán duyệt và đẩy WeSign */}
        <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-ink block">Kế toán chốt bản cuối &amp; đẩy WeSign</span>
            </div>
            <Status
              tone={
                financeStep?.status === 'APPROVED'
                  ? 'positive'
                  : financeStep?.status === 'CHANGES'
                  ? 'warning'
                  : financeStep?.status === 'REJECTED'
                  ? 'critical'
                  : 'warning'
              }
            >
              {financeStep?.status === 'APPROVED'
                ? 'Đã duyệt'
                : financeStep?.status === 'CHANGES'
                ? 'Yêu cầu sửa'
                : financeStep?.status === 'REJECTED'
                ? 'Từ chối'
                : 'Chờ duyệt'}
            </Status>
          </div>

          {financeStep?.reviewerName && (
            <div className="text-2xs text-ink-2 pt-1 border-t border-line flex items-center justify-between">
              <span>
                Người duyệt: <strong className="text-ink">{financeStep.reviewerName}</strong>
              </span>
              {financeStep.decidedAt && <span>{formatDate(financeStep.decidedAt)}</span>}
            </div>
          )}

          {financeStep?.note && (
            <p className="text-2xs text-ink-2 italic bg-sunken/40 p-2 rounded border border-line">
              &ldquo;{financeStep.note}&rdquo;
            </p>
          )}

          {canApproveWeSign && onApproveAndPushWeSign && (
            <div className="pt-1">
              <Button size="sm" variant="primary" icon={CheckCircle2} onClick={onApproveAndPushWeSign}>
                Duyệt &amp; đẩy WeSign
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs chuyển đổi giữa Điều khoản sửa đổi, Lịch sử bình luận và Báo cáo lưu vết */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-2">
        <Segmented
          value={activeTab}
          onChange={(v) => setActiveTab(v)}
          items={[
            ...(sourceType !== 'KOC_CUSTOM_DOC'
              ? [
                  {
                    key: 'DIFFS' as const,
                    label: `Điều khoản khác mẫu chuẩn (${diffs.length})`,
                  },
                ]
              : []),
            {
              key: 'COMMENTS' as const,
              label: `Trao đổi & bình luận Google Docs (${comments.length})`,
            },
            {
              key: 'AUDIT_REPORT' as const,
              label: 'Báo cáo đàm phán (Bản đầu · Comment · Bản cuối)',
            },
          ]}
        />
      </div>

      {/* Nội dung Tab 1: Danh sách điều khoản sửa đổi so với mẫu chuẩn */}
      {activeTab === 'DIFFS' && (
        <div className="space-y-3">
          {diffs.length === 0 ? (
            <div className="rounded-xl border border-line bg-surface p-6 text-center text-xs text-ink-3">
              {routing ? 'Không phát hiện điều khoản nào bị sửa đổi so với mẫu chuẩn.' : 'Chưa so với mẫu: hệ thống so khi B2C trình final, hoặc bấm Đồng bộ từ Google Doc.'}
            </div>
          ) : (
            diffs.map((diff, idx) => {
              const isFinance = diff.targetRole === 'FINANCE' || diff.targetRole === 'BOTH';
              const isLegal = diff.targetRole === 'LEGAL' || diff.targetRole === 'BOTH';

              return (
                <div
                  key={`${diff.clauseNumber}-${idx}`}
                  className="rounded-xl border border-line bg-surface p-4 space-y-3 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink text-sm">
                        {diff.clauseNumber}: {diff.title}
                      </span>
                      <Status
                        tone={
                          diff.changeType === 'ADDED'
                            ? 'positive'
                            : diff.changeType === 'REMOVED'
                            ? 'critical'
                            : 'warning'
                        }
                      >
                        {diff.changeType === 'ADDED'
                          ? 'Thêm mới'
                          : diff.changeType === 'REMOVED'
                          ? 'Đã xóa'
                          : 'Đã sửa đổi'}
                      </Status>
                    </div>

                    <div className="flex items-center gap-2">
                      {isFinance && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-soft text-accent text-2xs font-medium border border-accent/20">
                          <CreditCard className="w-2.5 h-2.5" />
                          Kế toán thẩm định
                        </span>
                      )}
                      {isLegal && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning-soft text-warning-strong text-2xs font-medium border border-warning/20">
                          <Scale className="w-2.5 h-2.5" />
                          Pháp chế thẩm định
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-ink-2">{diff.explanation}</p>

                  {/* So sánh trước và sau */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-2xs pt-1">
                    {diff.originalText && (
                      <div className="rounded-lg border border-line bg-sunken/40 p-3 space-y-1">
                        <span className="font-semibold text-ink-3 block">Mẫu chuẩn hệ thống:</span>
                        <p className="text-ink-2 whitespace-pre-wrap line-clamp-4">{diff.originalText}</p>
                      </div>
                    )}
                    {diff.modifiedText && (
                      <div className="rounded-lg border border-line-strong bg-warning-soft/20 p-3 space-y-1">
                        <span className="font-semibold text-warning-strong block">Bản sửa trên Google Docs:</span>
                        <p className="text-ink whitespace-pre-wrap line-clamp-4">{diff.modifiedText}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Nội dung Tab 2: Lịch sử trao đổi & Bình luận */}
      {activeTab === 'COMMENTS' && (
        <div className="space-y-3">
          {comments.length === 0 ? (
            <div className="rounded-xl border border-line bg-surface p-6 text-center text-xs text-ink-3">
              Chưa có bình luận nào trên tài liệu Google Docs này.
            </div>
          ) : (
            comments.map(c => (
              <div
                key={c.id}
                className="rounded-xl border border-line bg-surface p-4 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {c.avatar ? (
                      <img
                        src={c.avatar}
                        alt={c.author}
                        className="w-5 h-5 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-accent-soft text-accent text-2xs flex items-center justify-center font-semibold">
                        {c.author.charAt(0)}
                      </div>
                    )}
                    <span className="font-semibold text-ink">{c.author}</span>
                    <span className="text-2xs text-ink-3">
                      {formatDate(c.createdAt)}
                    </span>
                  </div>
                  {c.removedFromSourceAt ? (
                    <span className="text-2xs text-warning-strong font-medium">Đã xóa trên file · lưu để audit</span>
                  ) : c.resolved && (
                    <span className="inline-flex items-center gap-1 text-2xs text-positive font-medium">
                      <Check className="w-3.5 h-3.5" />
                      Đã giải quyết
                    </span>
                  )}
                </div>

                {c.quotedText && (
                  <div className="rounded-md border-l-2 border-accent bg-sunken/40 pl-2 py-1 text-2xs text-ink-3 italic">
                    &ldquo;{c.quotedText}&rdquo;
                  </div>
                )}

                <p className="text-ink whitespace-pre-wrap">{c.content}</p>

                {/* Các phản hồi trong thread */}
                {c.replies && c.replies.length > 0 && (
                  <div className="pl-4 pt-2 border-l border-line space-y-2 mt-2">
                    {c.replies.map(r => (
                      <div key={r.id} className="text-xs space-y-0.5">
                        <div className="flex items-center gap-2 text-2xs">
                          <span className="font-semibold text-ink">{r.author}</span>
                          <span className="text-ink-3">{formatDate(r.createdAt)}</span>
                        </div>
                        <p className="text-ink-2 whitespace-pre-wrap">{r.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Nội dung Tab 3: Báo cáo đàm phán (1. Bản ban đầu -> 2. Bình luận & chỉnh sửa -> 3. Bản chốt cuối) */}
      {activeTab === 'AUDIT_REPORT' && (
        <div className="space-y-4">
          {/* Khối 1: 3 mốc lưu vết (Bản đẩy lên ban đầu -> Bình luận & Chỉnh sửa -> Bản chốt cuối) */}
          <div className="rounded-xl border border-line bg-surface p-4 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-ink text-sm">
                Lưu vết 3 mốc: Bản đẩy lên ban đầu · Quá trình bình luận · Bản chốt cuối
              </span>
              <Status tone={auditTrail?.approvedSnapshot ? 'positive' : auditTrail?.finalSnapshot ? 'info' : 'warning'}>
                {auditTrail?.approvedSnapshot
                  ? 'Đã chốt bản duyệt & Xuất DOCX/PDF đẩy WeSign'
                  : auditTrail?.finalSnapshot
                  ? 'Đã chụp bản trình Final'
                  : 'Đang đàm phán Draft'}
              </Status>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Mốc 1: Bản đẩy lên ban đầu */}
              <div className="rounded-lg border border-line bg-sunken/40 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-2xs font-semibold text-ink-2">Bản đẩy lên ban đầu (v0)</span>
                  <Status tone={initialSnap ? 'positive' : 'neutral'}>
                    {initialSnap ? `${initialSnap.paragraphs.length} đoạn` : 'Chưa chụp'}
                  </Status>
                </div>
                {initialSnap ? (
                  <>
                    <span className="font-semibold text-ink block">
                      {initialSnap.by} · {formatDate(initialSnap.at)}
                    </span>
                    <span className="text-2xs text-ink-3 font-code block truncate" title={initialSnap.hash}>
                      SHA-256: {initialSnap.hash.slice(0, 16)}…
                    </span>
                  </>
                ) : (
                  <span className="text-ink-3 block">Hệ thống tự chụp ngay khi trình Draft hoặc Đồng bộ.</span>
                )}
              </div>

              {/* Mốc 2: Bình luận & Phiên bản chỉnh sửa */}
              <div className="rounded-lg border border-line bg-sunken/40 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-2xs font-semibold text-ink-2">Bình luận &amp; chỉnh sửa</span>
                  <Status tone={comments.length > 0 ? 'warning' : 'neutral'}>
                    {accountActivities.length} tài khoản
                  </Status>
                </div>
                <span className="font-semibold text-ink block">
                  {comments.length} bình luận · {(auditTrail?.revisions || []).length} phiên bản sửa
                </span>
                <span className="text-2xs text-ink-3 block">
                  {initialToFinalDiffs.length > 0
                    ? `${initialToFinalDiffs.length} điều khoản biến đổi so với bản đầu`
                    : 'Giữ nguyên cấu trúc điều khoản so với bản đầu'}
                </span>
              </div>

              {/* Mốc 3: Bản chốt cuối & Xuất file WeSign */}
              <div className="rounded-lg border border-line bg-sunken/40 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-2xs font-semibold text-ink-2">Bản chốt cuối (Final/WeSign)</span>
                  <Status tone={auditTrail?.approvedSnapshot ? 'positive' : finalSnap ? 'info' : 'neutral'}>
                    {auditTrail?.approvedSnapshot ? 'Kế toán đã chốt' : finalSnap ? `${finalSnap.paragraphs.length} đoạn` : 'Chưa chốt'}
                  </Status>
                </div>
                {finalSnap ? (
                  <>
                    <span className="font-semibold text-ink block">
                      {finalSnap.by} · {formatDate(finalSnap.at)}
                    </span>
                    <span className="text-2xs text-ink-3 font-code block truncate" title={finalSnap.hash}>
                      SHA-256: {finalSnap.hash.slice(0, 16)}…
                    </span>
                    {(auditTrail?.exportedDocxUrl || auditTrail?.exportedPdfUrl) && (
                      <div className="flex items-center gap-3 pt-1 text-2xs">
                        {auditTrail.exportedDocxUrl && (
                          <a href={auditTrail.exportedDocxUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline font-medium">
                            Tải file .DOCX đã chốt
                          </a>
                        )}
                        {auditTrail.exportedPdfUrl && (
                          <a href={auditTrail.exportedPdfUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline font-medium">
                            Tải file .PDF đã chốt
                          </a>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-ink-3 block">Hệ thống tự động kéo &amp; lưu khi trình Final hoặc khi Kế toán duyệt.</span>
                )}
              </div>
            </div>
          </div>

          {/* Khối 2: Báo cáo lưu vết đàm phán & chỉnh sửa của riêng hợp đồng */}
          <div className="rounded-xl border border-line bg-surface p-4 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-ink text-sm">
                  Báo cáo lưu vết đàm phán &amp; chỉnh sửa của hợp đồng
                </span>
                {report && (
                  <Status tone="positive">
                    Đã lưu · {formatDate(report.generatedAt)}
                  </Status>
                )}
              </div>
              <div className="flex items-center gap-2">
                {report && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={copiedReport ? Check : Copy}
                    onClick={handleCopyReport}
                  >
                    {copiedReport ? 'Đã chép báo cáo' : 'Chép văn bản báo cáo'}
                  </Button>
                )}
                {onGenerateReport && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={FileCheck2}
                    disabled={generatingReport}
                    onClick={onGenerateReport}
                  >
                    {generatingReport
                      ? 'Đang tổng hợp…'
                      : report
                      ? 'Cập nhật lại báo cáo'
                      : 'Tổng hợp & Lưu báo cáo'}
                  </Button>
                )}
              </div>
            </div>

            {!report ? (
              <div className="rounded-lg border border-line bg-sunken/30 p-4 text-center text-ink-2 space-y-2">
                <p>
                  Báo cáo sẽ tự động được tổng hợp và lưu lại khi B2C trình Final hoặc khi Kế toán bấm duyệt đẩy WeSign. Bạn cũng có thể bấm <strong>Tổng hợp &amp; Lưu báo cáo</strong> ngay bây giờ.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 2.1 Tóm tắt điều hành */}
                <div className="rounded-lg border border-line bg-sunken/40 p-3 space-y-1">
                  <div className="flex items-center justify-between text-2xs text-ink-3">
                    <span className="font-semibold text-ink">Tóm tắt tổng hợp hợp đồng</span>
                    <span>Người xuất: {report.generatedBy}</span>
                  </div>
                  <p className="text-ink leading-relaxed whitespace-pre-wrap">{report.executiveSummary}</p>
                </div>

                {/* 2.2 Biến đổi điều khoản (Bản đầu -> Bản cuối & Mẫu chuẩn) */}
                <div className="rounded-lg border border-line bg-surface p-3 space-y-2">
                  <span className="font-semibold text-ink block">
                    Biến đổi điều khoản (Đối chiếu Bản đầu vs Bản chốt cuối)
                  </span>
                  <ul className="space-y-2 text-ink-2 list-disc pl-4">
                    {report.clauseEvolutionSummary.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>

                  {/* Nếu có diff trực tiếp giữa Bản đầu và Bản cuối thì hiển thị so sánh */}
                  {initialToFinalDiffs.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-line">
                      {initialToFinalDiffs.map((d, idx) => (
                        <div key={`init-final-${idx}`} className="rounded-lg border border-line bg-sunken/30 p-3 space-y-2 text-2xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-ink">
                              {d.clauseNumber}: {d.title}
                            </span>
                            <Status tone={d.changeType === 'ADDED' ? 'positive' : d.changeType === 'REMOVED' ? 'critical' : 'warning'}>
                              {d.changeType === 'ADDED' ? 'Thêm mới so với bản đầu' : d.changeType === 'REMOVED' ? 'Đã lược bỏ so với bản đầu' : 'Đã sửa so với bản đầu'}
                            </Status>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {d.originalText && (
                              <div className="rounded border border-line bg-surface p-2">
                                <span className="font-semibold text-ink-3 block">Bản đẩy lên ban đầu (v0):</span>
                                <p className="text-ink-2 whitespace-pre-wrap line-clamp-3">{d.originalText}</p>
                              </div>
                            )}
                            {d.modifiedText && (
                              <div className="rounded border border-line-strong bg-warning-soft/20 p-2">
                                <span className="font-semibold text-warning-strong block">Bản chốt cuối (Final):</span>
                                <p className="text-ink whitespace-pre-wrap line-clamp-3">{d.modifiedText}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2.3 Tóm tắt đóng góp theo tài khoản + Lưu ý tài chính & pháp lý */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-line bg-surface p-3 space-y-2">
                    <span className="font-semibold text-ink block">
                      Tóm tắt đóng góp theo tài khoản ({report.accountContributionsSummary.length})
                    </span>
                    <ul className="space-y-2">
                      {report.accountContributionsSummary.map((acc, i) => (
                        <li key={i} className="rounded border border-line bg-sunken/30 p-2 space-y-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-ink">
                              {acc.account}
                              {acc.email ? <span className="text-2xs text-ink-3 font-normal"> ({acc.email})</span> : null}
                            </span>
                            {acc.roleHint && (
                              <span className="text-2xs text-accent font-medium">{acc.roleHint}</span>
                            )}
                          </div>
                          <p className="text-2xs text-ink-2">{acc.summary}</p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-lg border border-line bg-surface p-3 space-y-2">
                    <span className="font-semibold text-ink block">
                      Lưu ý tài chính &amp; pháp lý khi thực thi ({report.riskAndFinanceNotes.length})
                    </span>
                    {report.riskAndFinanceNotes.length === 0 ? (
                      <p className="text-2xs text-ink-3">Không có lưu ý rủi ro bổ sung.</p>
                    ) : (
                      <ul className="space-y-2 text-2xs text-ink-2 list-disc pl-4">
                        {report.riskAndFinanceNotes.map((note, i) => (
                          <li key={i}>{note}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Khối 3: Nhật ký chi tiết từng hành động theo tài khoản */}
          <div className="space-y-3">
            <span className="font-semibold text-ink text-xs block">
              Nhật ký chi tiết bình luận &amp; chỉnh sửa theo từng tài khoản ({accountActivities.length} tài khoản)
            </span>
            {accountActivities.length === 0 ? (
              <div className="rounded-xl border border-line bg-surface p-6 text-center text-xs text-ink-3">
                Chưa ghi nhận lịch sử chỉnh sửa hoặc bình luận của tài khoản nào. Bấm Đồng bộ từ Google Doc để cập nhật.
              </div>
            ) : (
              accountActivities.map(acc => (
                <div key={acc.key} className="rounded-xl border border-line bg-surface p-4 space-y-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-accent-soft text-accent text-2xs flex items-center justify-center font-semibold">
                        {acc.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-semibold text-ink text-sm">{acc.name}</span>
                        {acc.email && <span className="text-2xs text-ink-3 ml-2">({acc.email})</span>}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Status tone={acc.editCount > 0 ? 'info' : 'neutral'}>
                        {acc.editCount} lần sửa văn bản
                      </Status>
                      <Status tone={acc.commentCount > 0 ? 'warning' : 'neutral'}>
                        {acc.commentCount} bình luận / đề xuất
                      </Status>
                      {acc.replyCount > 0 && (
                        <Status tone="neutral">{acc.replyCount} phản hồi</Status>
                      )}
                      {acc.deletedCommentCount > 0 && (
                        <Status tone="critical">{acc.deletedCommentCount} bình luận đã xóa</Status>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {acc.items.map((item, idx) => (
                      <div
                        key={`${acc.key}-${idx}`}
                        className="rounded-lg border border-line bg-sunken/30 p-3 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2 text-2xs">
                          <span className="font-semibold text-ink-2">
                            {item.type === 'EDIT'
                              ? 'Chỉnh sửa phiên bản'
                              : item.type === 'REPLY'
                              ? 'Phản hồi bình luận'
                              : 'Bình luận / Đề xuất điều chỉnh'}
                          </span>
                          <div className="flex items-center gap-2">
                            {item.deleted && (
                              <span className="text-critical font-medium">Đã xóa trên Google Doc</span>
                            )}
                            {item.resolved && !item.deleted && (
                              <span className="text-positive font-medium">Đã giải quyết</span>
                            )}
                            <span className="text-ink-3">{formatDate(item.at)}</span>
                          </div>
                        </div>

                        {item.quotedText && (
                          <div className="rounded border-l-2 border-accent bg-surface px-2 py-1 text-2xs text-ink-3 italic">
                            Đoạn tác động: &ldquo;{item.quotedText}&rdquo;
                          </div>
                        )}

                        {item.content && (
                          <p className="text-xs text-ink whitespace-pre-wrap">{item.content}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
