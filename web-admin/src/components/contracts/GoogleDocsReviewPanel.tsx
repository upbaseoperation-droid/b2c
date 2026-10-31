'use client';

import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  FileCheck2,
  RefreshCw,
  Scale,
  Share2,
} from 'lucide-react';
import type {
  GoogleDocClauseDiff,
  GoogleDocCommentItem,
  GoogleDocsAuditTrail,
  GoogleDocsReviewRouting,
} from '../../lib/contracts/googleDocsTypes';
import {
  buildSubclauseComparisons,
  type WordDiffSegment,
} from '../../lib/contracts/googleDocsService';
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
  canLegalApprove = false,
  onLegalApprove,
  shareEmail = '',
}: GoogleDocsReviewPanelProps) {
  const [copiedBotEmail, setCopiedBotEmail] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);
  const [activeTab, setActiveTab] = useState<'AUDIT_REPORT' | 'DIFFS' | 'COMMENTS'>('AUDIT_REPORT');

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

  const templateDiffs = routing?.clauseDiffs || [];
  const initialSnap = auditTrail?.initialSnapshot || auditTrail?.finalSnapshot;
  const finalSnap = auditTrail?.approvedSnapshot || auditTrail?.finalSnapshot;
  const initialToFinalDiffs = auditTrail?.initialToFinalDiffs || [];
  const effectiveDiffs = initialToFinalDiffs.length > 0 ? initialToFinalDiffs : templateDiffs;
  const report = auditTrail?.negotiationReport;
  const hasSnapshot = Boolean(initialSnap || finalSnap);

  return (
    <div className="space-y-4">
      {/* Thanh công cụ & 3 Tab gọn gàng */}
      <div className="rounded-xl border border-line bg-surface p-3.5 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={activeTab}
          onChange={v => setActiveTab(v)}
          items={[
            {
              key: 'AUDIT_REPORT' as const,
              label: 'Báo cáo đàm phán',
            },
            {
              key: 'DIFFS' as const,
              label: `Đối chiếu điều khoản (${effectiveDiffs.length})`,
            },
            {
              key: 'COMMENTS' as const,
              label: `Bình luận Google Docs (${comments.length})`,
            },
          ]}
        />

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
              {syncingComments ? 'Đang đồng bộ…' : 'Đồng bộ từ Docs'}
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
              {generatingReport ? 'Đang tổng hợp…' : 'Cập nhật báo cáo'}
            </Button>
          )}
          {canLegalApprove && onLegalApprove && legalStep?.status === 'PENDING' && (
            <Button size="sm" variant="primary" icon={Scale} onClick={onLegalApprove}>
              Pháp chế duyệt
            </Button>
          )}
          {canApproveWeSign && onApproveAndPushWeSign && (
            <Button
              size="sm"
              variant="primary"
              icon={CheckCircle2}
              onClick={onApproveAndPushWeSign}
            >
              Duyệt &amp; đẩy WeSign
            </Button>
          )}
        </div>
      </div>

      {/* Chỉ hiện hướng dẫn cấp quyền khi chưa có bản chụp */}
      {shareEmail && !hasSnapshot && (
        <div className="rounded-xl border border-line bg-surface p-3 text-xs text-ink-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Share2 className="w-3.5 h-3.5 text-accent shrink-0" />
            <span>
              Cấp quyền xem/nhận xét trên Google Docs cho{' '}
              <code className="px-2 py-0.5 rounded bg-sunken border border-line text-ink font-code text-2xs">
                {shareEmail}
              </code>
            </span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            icon={copiedBotEmail ? Check : Copy}
            onClick={handleCopyEmail}
          >
            {copiedBotEmail ? 'Đã chép' : 'Chép email'}
          </Button>
        </div>
      )}

      {/* TAB 1: BÁO CÁO ĐÀM PHÁN (GỌN GÀNG, DỄ ĐỌC) */}
      {activeTab === 'AUDIT_REPORT' && (
        <div className="space-y-4">
          {/* 3 Mốc lưu vết */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl border border-line bg-surface p-3.5 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-2xs font-medium text-ink-3">1. Bản đẩy lên ban đầu</span>
                <Status tone={initialSnap ? 'positive' : 'neutral'}>
                  {initialSnap ? `${initialSnap.paragraphs.length} đoạn` : 'Chưa chụp'}
                </Status>
              </div>
              <div className="font-semibold text-ink">
                {initialSnap ? `${initialSnap.by} · ${formatDate(initialSnap.at)}` : 'Chưa ghi nhận'}
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface p-3.5 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-2xs font-medium text-ink-3">2. Quá trình đàm phán</span>
                <Status tone={comments.length > 0 ? 'warning' : 'neutral'}>
                  {comments.length} góp ý
                </Status>
              </div>
              <div className="font-semibold text-ink">
                {(auditTrail?.revisions || []).length} lần sửa · {effectiveDiffs.length} điều khoản đổi
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface p-3.5 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-2xs font-medium text-ink-3">3. Bản chốt cuối (WeSign)</span>
                <Status tone={auditTrail?.approvedSnapshot ? 'positive' : finalSnap ? 'info' : 'neutral'}>
                  {auditTrail?.approvedSnapshot ? 'Kế toán đã chốt' : finalSnap ? 'Đã trình Final' : 'Chưa chốt'}
                </Status>
              </div>
              <div className="font-semibold text-ink">
                {finalSnap ? `${finalSnap.by} · ${formatDate(finalSnap.at)}` : 'Đang đàm phán'}
              </div>
            </div>
          </div>

          {/* Nội dung báo cáo tổng hợp */}
          <div className="rounded-xl border border-line bg-surface p-4 space-y-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-ink text-sm">
                  Tóm tắt quá trình đàm phán &amp; điều khoản chốt
                </span>
                <Status tone={sourceType === 'TEMPLATE_AMENDED' ? 'warning' : 'neutral'}>
                  {sourceType === 'TEMPLATE_AMENDED' ? 'Mẫu UpBase có sửa đổi' : 'Mẫu riêng của KOC'}
                </Status>
              </div>
              {report && (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={copiedReport ? Check : Copy}
                  onClick={handleCopyReport}
                >
                  {copiedReport ? 'Đã chép báo cáo' : 'Chép báo cáo'}
                </Button>
              )}
            </div>

            {!report ? (
              <p className="text-ink-2 py-2">
                Chưa có báo cáo tổng hợp. Bấm <strong>Cập nhật báo cáo</strong> để hệ thống tổng hợp từ Bản ban đầu, Bình luận và Bản chốt cuối.
              </p>
            ) : (
              <div className="space-y-4">
                <p className="text-ink leading-relaxed bg-sunken/40 rounded-lg border border-line p-3">
                  {report.executiveSummary}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="font-semibold text-ink block">
                      Đóng góp theo tài khoản ({report.accountContributionsSummary.length})
                    </span>
                    <ul className="space-y-2">
                      {report.accountContributionsSummary.map((acc, i) => (
                        <li key={i} className="rounded-lg border border-line bg-sunken/25 p-2.5 space-y-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-ink">{acc.account}</span>
                            {acc.roleHint && (
                              <span className="text-2xs text-accent font-medium">{acc.roleHint}</span>
                            )}
                          </div>
                          <p className="text-2xs text-ink-2">{acc.summary}</p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <span className="font-semibold text-ink block">
                      Lưu ý Pháp chế &amp; Kế toán khi thực thi ({report.riskAndFinanceNotes.length})
                    </span>
                    <ul className="space-y-2 text-2xs text-ink-2 list-disc pl-4">
                      {report.riskAndFinanceNotes.map((note, i) => (
                        <li key={i} className="leading-relaxed">{note}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ĐỐI CHIẾU ĐIỀU KHOẢN (BẢN ĐẦU VS BẢN CHỐT CUỐI) */}
      {activeTab === 'DIFFS' && (
        <ClauseDiffList diffs={effectiveDiffs} sourceType={sourceType} />
      )}

      {/* TAB 3: BÌNH LUẬN GOOGLE DOCS */}
      {activeTab === 'COMMENTS' && (
        <div className="space-y-3">
          {comments.length === 0 ? (
            <div className="rounded-xl border border-line bg-surface p-6 text-center text-xs text-ink-3">
              Chưa có bình luận nào trên Google Docs.
            </div>
          ) : (
            comments.map(c => (
              <div
                key={c.id}
                className="rounded-xl border border-line bg-surface p-4 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">{c.author}</span>
                    <span className="text-2xs text-ink-3">{formatDate(c.createdAt)}</span>
                  </div>
                  {c.removedFromSourceAt ? (
                    <span className="text-2xs text-warning-strong font-medium">
                      Đã xóa trên file · đã lưu vết
                    </span>
                  ) : c.resolved ? (
                    <span className="inline-flex items-center gap-1 text-2xs text-positive font-medium">
                      <Check className="w-3.5 h-3.5" />
                      Đã giải quyết
                    </span>
                  ) : null}
                </div>

                {c.quotedText && (
                  <div className="rounded border-l-2 border-accent bg-sunken/40 pl-2.5 py-1 text-2xs text-ink-3 italic">
                    &ldquo;{c.quotedText}&rdquo;
                  </div>
                )}

                <p className="text-ink whitespace-pre-wrap">{c.content}</p>

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
    </div>
  );
}

export function InlineRedlineSegments({
  segments,
  mode = 'inline',
}: {
  segments: WordDiffSegment[];
  mode?: 'inline' | 'original' | 'modified';
}) {
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'equal') {
          return <span key={i}>{seg.text}</span>;
        }
        if (seg.type === 'delete') {
          if (mode === 'modified') return null;
          return (
            <del
              key={i}
              className="bg-critical-soft text-critical line-through decoration-critical/80 px-1 py-0.5 rounded-xs mx-0.5 font-normal"
            >
              {seg.text}
            </del>
          );
        }
        if (mode === 'original') return null;
        return (
          <ins
            key={i}
            className="bg-positive-soft text-positive font-semibold no-underline px-1 py-0.5 rounded-xs mx-0.5 border-b border-positive/40"
          >
            {seg.text}
          </ins>
        );
      })}
    </>
  );
}

export function ClauseDiffList({
  diffs,
  sourceType = 'TEMPLATE_AMENDED',
  compact = false,
}: {
  diffs: GoogleDocClauseDiff[];
  sourceType?: 'TEMPLATE_AMENDED' | 'KOC_CUSTOM_DOC';
  compact?: boolean;
}) {
  const [viewMode, setViewMode] = useState<'INLINE' | 'SPLIT'>('INLINE');

  if (diffs.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 text-center text-xs text-ink-3">
        Hồ sơ giữ nguyên theo mẫu chuẩn, không phát sinh điều khoản sửa đổi.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Thanh chú giải & chuyển chế độ xem */}
      <div className="rounded-xl border border-line bg-surface px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-2xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-ink">
            {diffs.length} điều khoản thay đổi{' '}
            {sourceType === 'TEMPLATE_AMENDED' ? 'trên mẫu chuẩn UpBase' : 'sau đàm phán'}
          </span>
          <span className="inline-flex items-center gap-1.5 text-ink-2">
            <span className="px-1.5 py-0.5 rounded-xs bg-critical-soft text-critical line-through">
              Từ ngữ gốc bị thay
            </span>
            <span>→</span>
            <span className="px-1.5 py-0.5 rounded-xs bg-positive-soft text-positive font-semibold">
              Từ ngữ sửa đổi mới
            </span>
          </span>
        </div>

        {!compact && (
          <Segmented
            value={viewMode}
            onChange={v => setViewMode(v)}
            items={[
              { key: 'INLINE' as const, label: 'Gộp trực quan' },
              { key: 'SPLIT' as const, label: 'Song song 2 cột' },
            ]}
          />
        )}
      </div>

      {/* Danh sách từng điều khoản thay đổi */}
      <div className="space-y-3">
        {diffs.map((diff, idx) => {
          const isFinance = diff.targetRole === 'FINANCE' || diff.targetRole === 'BOTH';
          const isLegal = diff.targetRole === 'LEGAL' || diff.targetRole === 'BOTH';
          const subclauses = buildSubclauseComparisons(diff.originalText, diff.modifiedText);

          return (
            <div
              key={`${diff.clauseNumber}-${idx}`}
              className="rounded-xl border border-line bg-surface overflow-hidden text-xs"
            >
              {/* Header điều khoản */}
              <div className="px-4 py-2.5 bg-sunken/40 border-b border-line flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink">
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
                      ? 'Khoản bổ sung mới'
                      : diff.changeType === 'REMOVED'
                        ? 'Khoản đã lược bỏ'
                        : 'Sửa đổi câu chữ'}
                  </Status>
                </div>

                <div className="flex items-center gap-1.5">
                  {isFinance && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-accent-soft text-accent text-2xs font-medium">
                      <CreditCard className="w-3 h-3" />
                      Kế toán duyệt
                    </span>
                  )}
                  {isLegal && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-warning-soft text-warning-strong text-2xs font-medium">
                      <Scale className="w-3 h-3" />
                      Pháp chế duyệt
                    </span>
                  )}
                </div>
              </div>

              {/* Nội dung đối chiếu từng khoản */}
              <div className="p-4 space-y-2.5">
                {subclauses.map((sub, sIdx) => {
                  if (sub.unchanged) {
                    return (
                      <div
                        key={sIdx}
                        className="rounded-lg bg-sunken/35 border border-line px-3 py-2 text-2xs text-ink-3 flex items-start gap-2"
                      >
                        <span className="px-1.5 py-0.5 rounded bg-surface border border-line text-ink-3 font-medium shrink-0">
                          Giữ nguyên
                        </span>
                        <span className="line-clamp-1">{sub.modifiedLine || sub.originalLine}</span>
                      </div>
                    );
                  }

                  if (viewMode === 'INLINE' || compact || diff.changeType !== 'MODIFIED') {
                    return (
                      <div
                        key={sIdx}
                        className="rounded-lg border border-line-strong bg-surface p-3 leading-relaxed text-xs text-ink"
                      >
                        <InlineRedlineSegments segments={sub.segments} mode="inline" />
                      </div>
                    );
                  }

                  return (
                    <div key={sIdx} className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="rounded-lg border border-line bg-sunken/30 p-3 space-y-1.5 leading-relaxed">
                        <span className="text-2xs font-semibold text-ink-3 block">
                          {sourceType === 'TEMPLATE_AMENDED' ? 'Mẫu chuẩn UpBase (Gốc)' : 'Bản đẩy lên ban đầu (v0)'}
                        </span>
                        <p className="text-ink-2">
                          <InlineRedlineSegments segments={sub.segments} mode="original" />
                        </p>
                      </div>
                      <div className="rounded-lg border border-line-strong bg-surface p-3 space-y-1.5 leading-relaxed">
                        <span className="text-2xs font-semibold text-positive block">
                          Bản chốt sau đàm phán (Final)
                        </span>
                        <p className="text-ink">
                          <InlineRedlineSegments segments={sub.segments} mode="modified" />
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
