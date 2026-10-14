import type { UserProfile } from '../types';
import type { EntryInput, EntryKind, HubScope, HubThread } from './types';

export class HubError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function requireHub(condition: unknown, message: string, status = 400): asserts condition {
  if (!condition) throw new HubError(message, status);
}
export function canAccess(actor: UserProfile, scope: HubScope): boolean {
  if (actor.canLogin === false) return false;
  if (actor.partnerType || actor.role.endsWith('_PARTNER')) {
    return actor.role === `${scope.partnerType}_PARTNER` && actor.partnerType === scope.partnerType && actor.linkedEntityId === scope.partnerId;
  }
  if (['ADMIN', 'MANAGER'].includes(actor.role)) return true;
  if (!['LEADER', 'BRAND_MEMBER', 'BOOKING_MEMBER', 'CONTENT_MEMBER'].includes(actor.role)) return false;
  return scope.staffNames.includes(actor.name) || (actor.assignedBrands || []).some(id => scope.brandIds.includes(id));
}
export function canDecide(actor: UserProfile, scope: HubScope): boolean {
  return !!scope.proposalVersion && canAccess(actor, scope) && (
    actor.role === 'BRAND_PARTNER' && !!actor.permissions?.includes('CAN_APPROVE_DEALS') || actor.role === 'ADMIN'
  );
}
const kinds: EntryKind[] = ['COMMENT', 'EXTERNAL', 'APPROVE', 'REJECT', 'REQUEST_INFO'];
const str = (value: unknown, max: number) => {
  requireHub(value === undefined || typeof value === 'string', 'Nội dung không hợp lệ.');
  const text = (value as string | undefined)?.trim() || '';
  requireHub(text.length <= max, `Nội dung vượt quá ${max} ký tự.`);
  return text;
};
export function safeLink(value: string): string {
  try {
    const url = new URL(value);
    requireHub(url.protocol === 'https:' && !url.username && !url.password, 'Link phải dùng https và không chứa thông tin đăng nhập.');
    return url.href;
  } catch { throw new HubError('Link tài liệu không hợp lệ. Vui lòng dùng đường dẫn https.'); }
}
export function parseEntry(value: unknown): EntryInput {
  requireHub(value && typeof value === 'object' && !Array.isArray(value), 'Dữ liệu không hợp lệ.');
  const body = value as Record<string, unknown>;
  const clientId = str(body.clientId, 100);
  requireHub(/^[A-Za-z0-9_-]{8,100}$/.test(clientId), 'Mã gửi không hợp lệ.');
  const kind = body.kind as EntryKind;
  requireHub(kinds.includes(kind), 'Loại ý kiến không hợp lệ.');
  const content = str(body.content, 6000);
  const link = str(body.linkUrl, 2000);
  const linkTitle = str(body.linkTitle, 160);
  const externalChannel = str(body.externalChannel, 100);
  requireHub(kind === 'APPROVE' || !!content || (kind === 'COMMENT' && !!link), 'Vui lòng nhập ý kiến hoặc lý do.');
  requireHub(!link || linkTitle, 'Vui lòng đặt tên/phiên bản cho link tài liệu.');
  requireHub(kind !== 'EXTERNAL' || externalChannel, 'Vui lòng nhập kênh trao đổi bên ngoài.');
  requireHub(Number.isSafeInteger(body.expectedRevision) && Number(body.expectedRevision) >= 0, 'Phiên bản hội thoại không hợp lệ.');
  return { clientId, kind, content, expectedRevision: Number(body.expectedRevision), linkUrl: link ? safeLink(link) : undefined, linkTitle: link ? linkTitle : undefined, externalChannel: kind === 'EXTERNAL' ? externalChannel : undefined, replyTo: str(body.replyTo, 100) || undefined, proposalVersion: str(body.proposalVersion, 100) || undefined };
}
export function emptyThread(scope: HubScope): HubThread {
  return { key: scope.key, revision: 0, proposalVersion: scope.proposalVersion, decision: scope.initialDecision || 'PENDING', entries: [] };
}
export function currentThread(thread: HubThread, scope: HubScope): HubThread {
  return thread.proposalVersion === scope.proposalVersion ? thread : { ...thread, proposalVersion: scope.proposalVersion, decision: 'PENDING' };
}
export function applyEntry(stored: HubThread, input: EntryInput, actor: UserProfile, scope: HubScope): HubThread {
  requireHub(canAccess(actor, scope), 'Bạn không có quyền vào cuộc trao đổi này.', 403);
  const thread = currentThread(stored, scope);
  const duplicate = thread.entries.find(e => e.clientId === input.clientId);
  if (duplicate) {
    requireHub(duplicate.authorId === actor.id && duplicate.kind === input.kind && duplicate.content === input.content && duplicate.linkUrl === input.linkUrl && duplicate.linkTitle === input.linkTitle && duplicate.replyTo === input.replyTo && duplicate.externalChannel === input.externalChannel && duplicate.proposalVersion === input.proposalVersion, 'Mã gửi đã được dùng cho nội dung khác.', 409);
    return thread;
  }
  requireHub(!input.replyTo || thread.entries.some(e => e.clientId === input.replyTo), 'Không tìm thấy ý kiến được trả lời trong cuộc trao đổi này.');
  const decision = !['COMMENT', 'EXTERNAL'].includes(input.kind);
  if (decision) {
    requireHub(canDecide(actor, scope), 'Chỉ Brand có quyền duyệt hoặc quản trị viên được xác nhận quyết định.', 403);
    requireHub(input.expectedRevision === thread.revision && input.proposalVersion === scope.proposalVersion, 'Đề xuất hoặc hội thoại đã thay đổi. Vui lòng xem lại trước khi duyệt.', 409);
  }
  return { ...thread, revision: thread.revision + 1,
    decision: input.kind === 'APPROVE' ? 'APPROVED' : input.kind === 'REJECT' ? 'REJECTED' : input.kind === 'REQUEST_INFO' ? 'NEEDS_INFO' : thread.decision,
    entries: [...thread.entries, { ...input, authorId: actor.id, authorName: actor.name, authorRole: actor.roleTitle || actor.role, createdAt: new Date().toISOString() }] };
}
