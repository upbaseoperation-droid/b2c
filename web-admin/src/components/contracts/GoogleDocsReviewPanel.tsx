'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  FileText,
  MessageSquare,
  RefreshCw,
  Scale,
  Share2,
  ShieldAlert,
} from 'lucide-react';
import type {
  GoogleDocClauseDiff,
  GoogleDocCommentItem,
  GoogleDocsAuditTrail,
  GoogleDocsReviewRouting,
} from '../../lib/contracts/googleDocsTypes';
import { Button, Panel, Status } from '../ui';
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
  docId,
  sourceType = 'TEMPLATE_AMENDED',
  routing,
  comments = [],
  auditTrail,
  onSyncComments,
  syncingComments = false,
  onApproveAndPushWeSign,
  canApproveWeSign = false,
  isFinanceRole = false,
  isLegalRole = false,
  isLeadRole = false,
  approvalStatus,
  compact = false,
  legalStep,
  financeStep,
  onLegalApprove,
  canLegalApprove = false,
  shareEmail = '',
}: GoogleDocsReviewPanelProps) {
  const [copiedBotEmail, setCopiedBotEmail] = useState(false);
  // Mẫu của KOC không so với mẫu Upbase nên chỉ có phần bình luận.
  const [activeTab, setActiveTab] = useState<'DIFFS' | 'COMMENTS'>(sourceType === 'KOC_CUSTOM_DOC' ? 'COMMENTS' : 'DIFFS');

  const handleCopyEmail = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(shareEmail);
      setCopiedBotEmail(true);
      setTimeout(() => setCopiedBotEmail(false), 2000);
    }
  };

  const diffs = routing?.clauseDiffs || [];
  const financeDiffs = diffs.filter(d => d.targetRole === 'FINANCE' || d.targetRole === 'BOTH');
  const legalDiffs = diffs.filter(d => d.targetRole === 'LEGAL' || d.targetRole === 'BOTH');

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
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
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
        {shareEmail && <div className="rounded-lg border border-line bg-sunken/60 p-2.5 text-xs text-ink-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Share2 className="w-3.5 h-3.5 text-accent shrink-0" />
            <span>
              Chia sẻ file cho{' '}
              <code className="px-1.5 py-0.5 rounded bg-surface border border-line text-ink font-mono text-2xs">
                {shareEmail}
              </code>{' '}
              (quyền Người nhận xét) để hệ thống đọc được bình luận và lịch sử sửa.
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopyEmail}
            className="inline-flex items-center gap-1 text-2xs font-medium text-accent hover:text-accent-strong px-2 py-1 rounded bg-surface border border-line"
          >
            {copiedBotEmail ? (
              <>
                <Check className="w-3 h-3 text-positive" />
                <span>Đã sao chép</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Chép email</span>
              </>
            )}
          </button>
        </div>}

        {/* Tóm tắt phân luồng thẩm định */}
        {routing && sourceType === 'KOC_CUSTOM_DOC' && (
          <p className="text-xs text-ink-2">Mẫu riêng của KOC: không so với mẫu Upbase. Pháp chế và Kế toán rà toàn bộ văn bản trên Google Doc.</p>
        )}
        {routing && sourceType !== 'KOC_CUSTOM_DOC' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
            <div className="rounded-lg border border-line bg-sunken/30 p-2.5">
              <span className="text-2xs text-ink-3 block">Tổng điều khoản sửa đổi</span>
              <span className="text-sm font-semibold text-ink">
                {diffs.length} điều khoản
              </span>
            </div>
            <div className="rounded-lg border border-line bg-accent-soft/30 p-2.5">
              <div className="flex items-center gap-1 text-2xs text-accent font-medium">
                <CreditCard className="w-3 h-3" />
                <span>Kế toán (TCKT) cần duyệt</span>
              </div>
              <span className="text-sm font-semibold text-ink">
                {financeDiffs.length} điều khoản
              </span>
            </div>
            <div className="rounded-lg border border-line bg-warning-soft/30 p-2.5">
              <div className="flex items-center gap-1 text-2xs text-warning-strong font-medium">
                <Scale className="w-3 h-3" />
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
        <div className="rounded-xl border border-line bg-surface p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-warning-soft text-warning-strong flex items-center justify-center shrink-0">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-ink block">Pháp chế duyệt</span>
                <span className="text-2xs text-ink-3">Góp ý, sửa trực tiếp trên Google Doc rồi duyệt bản trình final</span>
              </div>
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
        <div className="rounded-xl border border-line bg-surface p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-ink block">Kế toán duyệt &amp; đẩy WeSign</span>
                <span className="text-2xs text-ink-3">Duyệt sau Pháp chế; hệ thống xuất DOCX, PDF từ Google Doc để đẩy WeSign</span>
              </div>
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

      {/* Tabs chuyển đổi giữa Điều khoản sửa đổi và Lịch sử bình luận */}
      <div className="flex items-center gap-2 border-b border-line pb-2">
        {sourceType !== 'KOC_CUSTOM_DOC' && <button
          type="button"
          onClick={() => setActiveTab('DIFFS')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'DIFFS'
              ? 'bg-ink text-canvas font-semibold'
              : 'text-ink-2 hover:text-ink hover:bg-sunken'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Danh sách điều khoản sửa đổi ({diffs.length})</span>
        </button>}

        <button
          type="button"
          onClick={() => setActiveTab('COMMENTS')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'COMMENTS'
              ? 'bg-ink text-canvas font-semibold'
              : 'text-ink-2 hover:text-ink hover:bg-sunken'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Trao đổi & Bình luận Google Docs ({comments.length})</span>
        </button>
      </div>

      {/* Nội dung Tab 1: Danh sách điều khoản sửa đổi */}
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
                  className="rounded-xl border border-line bg-surface p-3.5 space-y-2.5 text-xs"
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

                    <div className="flex items-center gap-1.5">
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
                      <div className="rounded-lg border border-line bg-sunken/40 p-2.5 space-y-1">
                        <span className="font-semibold text-ink-3 block">Mẫu chuẩn hệ thống:</span>
                        <p className="text-ink-2 whitespace-pre-wrap line-clamp-4">{diff.originalText}</p>
                      </div>
                    )}
                    {diff.modifiedText && (
                      <div className="rounded-lg border border-line-strong bg-warning-soft/20 p-2.5 space-y-1">
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
                className="rounded-xl border border-line bg-surface p-3.5 space-y-2 text-xs"
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
                      <Check className="w-3 h-3" />
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
                        <div className="flex items-center gap-1.5 text-2xs">
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
    </div>
  );
}
