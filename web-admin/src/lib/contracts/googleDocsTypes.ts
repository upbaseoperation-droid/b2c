export type ClauseReviewTarget = 'LEGAL' | 'FINANCE' | 'BOTH';

export interface GoogleDocClauseDiff {
  clauseNumber: string;
  title: string;
  changeType: 'MODIFIED' | 'ADDED' | 'REMOVED';
  targetRole: ClauseReviewTarget;
  originalText?: string;
  modifiedText?: string;
  explanation: string;
}

export interface GoogleDocCommentItem {
  id: string;
  author: string;
  authorEmail?: string;
  avatar?: string;
  content: string;
  quotedText?: string;
  createdAt: string;
  resolved?: boolean;
  /** Lúc hệ thống thấy bình luận đã bị xóa trên Google Doc; vẫn giữ lại để audit. */
  removedFromSourceAt?: string;
  replies?: Array<{
    id: string;
    author: string;
    content: string;
    createdAt: string;
  }>;
}

export interface GoogleDocsReviewRouting {
  requiresLegal: boolean;
  requiresFinance: boolean;
  legalClauses: string[];
  financeClauses: string[];
  clauseDiffs: GoogleDocClauseDiff[];
  summary: string;
  analyzedAt: string;
}

/** Một phiên bản trong lịch sử sửa của Google Doc. */
export interface GoogleDocRevisionItem {
  id: string;
  modifiedTime: string;
  author?: string;
  authorEmail?: string;
}

/** Bản chốt nội dung Google Doc tại một thời điểm (lúc đẩy lên ban đầu, lúc trình final hoặc lúc Kế toán duyệt). */
export interface GoogleDocSnapshot {
  at: string;
  by: string;
  title: string;
  hash: string;
  paragraphs: string[];
  commentsCount: number;
  revisionCount: number;
  lastRevisionId?: string;
  simulated?: boolean;
}

/** Báo cáo tổng hợp lưu vết đàm phán, bình luận và biến đổi điều khoản của riêng hợp đồng. */
export interface GoogleDocsNegotiationReport {
  generatedAt: string;
  generatedBy: string;
  providerUsed: string;
  modelUsed: string;
  initialHash?: string;
  finalHash?: string;
  executiveSummary: string;
  clauseEvolutionSummary: string[];
  accountContributionsSummary: Array<{
    account: string;
    email?: string;
    roleHint?: string;
    editCount: number;
    commentCount: number;
    replyCount: number;
    summary: string;
  }>;
  riskAndFinanceNotes: string[];
  rawReportText: string;
}

export interface GoogleDocsAuditTrail {
  syncedAt: string;
  commentsCount: number;
  /** Đang dùng dữ liệu giả lập vì máy chủ chưa kết nối Google. */
  simulated?: boolean;
  draftSubmittedAt?: string;
  draftSubmittedBy?: string;
  revisions?: GoogleDocRevisionItem[];
  /** Bản chụp ban đầu ngay khi nhân sự đẩy link Google Doc lên hệ thống (Baseline v0). */
  initialSnapshot?: GoogleDocSnapshot;
  /** Danh sách điều khoản thay đổi giữa bản ban đầu (initialSnapshot) và bản hiện tại/bản chốt cuối. */
  initialToFinalDiffs?: GoogleDocClauseDiff[];
  /** Bản chốt lúc B2C trình final; Pháp chế và Kế toán duyệt trên bản này. */
  finalSnapshot?: GoogleDocSnapshot;
  /** Bản chốt lúc Kế toán duyệt, chính là bản xuất DOCX/PDF đẩy WeSign. */
  approvedSnapshot?: GoogleDocSnapshot;
  /** Báo cáo tổng hợp lưu vết đàm phán (từ bản đầu + comment + bản cuối) của riêng hợp đồng này. */
  negotiationReport?: GoogleDocsNegotiationReport;
  exportedDocxUrl?: string;
  exportedPdfUrl?: string;
  exportedAt?: string;
  approvedByFinance?: string;
  approvedAtFinance?: string;
  approvedByLegal?: string;
  approvedAtLegal?: string;
  snapshotHash?: string;
}
