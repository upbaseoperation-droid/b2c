export type EntryKind = 'COMMENT' | 'EXTERNAL' | 'APPROVE' | 'REJECT' | 'REQUEST_INFO';
export type Decision = 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_INFO';
export interface HubScope {
  key: string;
  title: string;
  partnerType: 'BRAND' | 'KOC' | 'CTV';
  partnerId: string;
  brandIds: string[];
  staffNames: string[];
  proposalVersion?: string;
  initialDecision?: Decision;
}
export interface EntryInput {
  clientId: string;
  kind: EntryKind;
  content: string;
  linkUrl?: string;
  linkTitle?: string;
  externalChannel?: string;
  replyTo?: string;
  proposalVersion?: string;
  expectedRevision: number;
}
export interface HubEntry extends EntryInput {
  authorId: string;
  authorName: string;
  authorRole: string;
  createdAt: string;
}
export interface HubThread {
  key: string;
  revision: number;
  proposalVersion?: string;
  decision: Decision;
  entries: HubEntry[];
}
export interface ThreadResponse {
  thread: HubThread;
  title: string;
  canDecide: boolean;
  hasMore: boolean;
}
export const KIND_LABELS: Record<EntryKind, string> = { COMMENT: 'Ý kiến', EXTERNAL: 'Ghi nhận trao đổi bên ngoài', APPROVE: 'Đã duyệt', REJECT: 'Không duyệt', REQUEST_INFO: 'Cần bổ sung thông tin' };
export const DECISION_LABELS: Record<Decision, string> = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Không duyệt', NEEDS_INFO: 'Cần bổ sung thông tin' };
