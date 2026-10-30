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

export interface GoogleDocsAuditTrail {
  syncedAt: string;
  commentsCount: number;
  approvedByFinance?: string;
  approvedAtFinance?: string;
  approvedByLegal?: string;
  approvedAtLegal?: string;
  snapshotHash?: string;
}
