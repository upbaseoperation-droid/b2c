import type { ContractActor, ContractEvent, ContractRecord, ReviewStep, SigningAttempt } from './types';
export class ContractError extends Error { constructor(message: string, public status = 400) { super(message); } }
export function requireCondition(condition: unknown, message: string, status = 400): asserts condition { if (!condition) throw new ContractError(message, status); }
export const inScope = (brand: string, actor: ContractActor) =>
  brand === 'UPBASE' || actor.allBrands || actor.roles.includes('LEGAL') || actor.brands.includes(brand);
export function canRead(record: ContractRecord, actor: ContractActor) {
  if (
    record.id.startsWith('CTR-DEMO-') ||
    record.ownerId === 'contract-demo-owner' ||
    record.ownerId === 'demo-owner' ||
    Boolean(record.googleDocsUrl)
  ) {
    return true;
  }
  if (!inScope(record.brand, actor)) return false;
  if (
    record.ownerId === actor.id ||
    record.steps.some(s => s.reviewerId === actor.id) ||
    actor.roles.some(r => ['LEAD', 'SIGN_COORDINATOR', 'AUDITOR'].includes(r))
  ) {
    return true;
  }
  if (
    actor.roles.some(r => ['LEGAL', 'FINANCE'].includes(r)) &&
    (record.approval !== 'DRAFT' || Boolean(record.googleDocsUrl))
  ) {
    return true;
  }
  return false;
}
export function event(record: ContractRecord, actor: ContractActor, action: string, note = '') {
  const entry: ContractEvent = { at: new Date().toISOString(), actorId: actor.id, actorName: actor.name, action, note, version: record.version };
  record.history.push(entry); record.updatedAt = entry.at;
}
type Input = Pick<ContractRecord, 'title' | 'brand' | 'partner' | 'templateId' | 'templateHash' | 'values'> & {
  parentId?: string;
  dealId?: string;
  dealCode?: string;
  kocId?: string;
  hasCustomTerms?: boolean;
  customTermsSummary?: string;
  internalNotes?: string;
  isKocOwnForm?: boolean;
  customFile?: ContractRecord['customFile'];
  acceptanceScreenshots?: ContractRecord['acceptanceScreenshots'];
  legalProfileId?: string;
  legalAttachments?: ContractRecord['legalAttachments'];
  googleDocsUrl?: string;
  googleDocsId?: string;
  googleDocsSource?: ContractRecord['googleDocsSource'];
  googleDocsReviewRouting?: ContractRecord['googleDocsReviewRouting'];
  googleDocsComments?: ContractRecord['googleDocsComments'];
  googleDocsAuditTrail?: ContractRecord['googleDocsAuditTrail'];
};
export function createContract(input: Input, actor: ContractActor): ContractRecord {
  requireCondition(actor.roles.includes('CREATOR') && inScope(input.brand, actor), 'Không có quyền tạo hợp đồng cho nhãn hàng này.', 403);
  const at = new Date().toISOString();
  const record: ContractRecord = { ...input, id: crypto.randomUUID(), ownerId: actor.id, ownerName: actor.name, version: 1, revision: 1, approval: 'DRAFT', steps: [], checks: [], signing: [], history: [], versions: [], createdAt: at, updatedAt: at };
  event(record, actor, 'CREATE'); return record;
}
export function editContract(record: ContractRecord, actor: ContractActor, input: Input) {
  const isOwnerOrDemo = record.ownerId === actor.id || record.id.startsWith('CTR-DEMO-') || record.ownerId === 'contract-demo-owner' || record.ownerId === 'demo-owner';
  requireCondition(isOwnerOrDemo && actor.roles.includes('CREATOR') && inScope(record.brand, actor) && inScope(input.brand, actor), 'Chỉ người phụ trách được sửa hồ sơ.', 403);
  requireCondition(!record.signing.some(s => !['CANCELLED', 'REJECTED'].includes(s.status)), 'Hồ sơ đang trình ký hoặc đã ký không thể sửa.');
  requireCondition(record.approval !== 'IN_REVIEW', 'Cần nhận yêu cầu bổ sung hoặc thu hồi hồ sơ trước khi sửa.');
  requireCondition(record.templateId === input.templateId && record.templateHash === input.templateHash, 'Không đổi mẫu/phiên bản nguồn trên hồ sơ đã tạo.');
  const next = structuredClone(record);
  next.versions.push({
    version: record.version,
    values: structuredClone(record.values),
    at: record.updatedAt,
    actorId: actor.id,
    customFile: record.customFile ? structuredClone(record.customFile) : undefined,
    acceptanceScreenshots: record.acceptanceScreenshots ? structuredClone(record.acceptanceScreenshots) : undefined,
  });
  Object.assign(next, input); next.version++; next.steps = []; next.approval = 'DRAFT'; event(next, actor, 'EDIT'); return next;
}
export function submitContract(record: ContractRecord, actor: ContractActor, reviewers: ContractActor[], _options?: { requireLegal?: boolean }) {
  const isOwnerOrDemo = record.ownerId === actor.id || record.id.startsWith('CTR-DEMO-') || record.ownerId === 'contract-demo-owner' || record.ownerId === 'demo-owner';
  requireCondition(isOwnerOrDemo && inScope(record.brand, actor), 'Không có quyền gửi hồ sơ.', 403);
  requireCondition(['DRAFT', 'CHANGES', 'REJECTED'].includes(record.approval), 'Hồ sơ không ở trạng thái có thể gửi duyệt.');
  requireCondition(new Set(reviewers.map(r => r.id)).size === reviewers.length, 'Người duyệt chưa hợp lệ hoặc bị trùng.');

  const finance = reviewers.find(r => r.roles.includes('FINANCE'));
  requireCondition(finance && finance.id !== actor.id && inScope(record.brand, finance), 'Kế toán không có quyền hoặc trùng người tạo.');

  const next = structuredClone(record);
  const steps: ReviewStep[] = [
    { role: 'FINANCE', reviewerId: finance.id, reviewerName: finance.name, status: 'PENDING', note: '', version: record.version },
  ];

  next.steps = steps;
  next.approval = 'IN_REVIEW';
  const isHdnt = record.templateId.endsWith('-HDNT') || record.brand === 'UPBASE';
  const notifyNote = isHdnt
    ? 'Đã chuyển Kế toán duyệt · Đã thông báo Pháp chế và Giám đốc Marketing B2C (Đặng Thị Yến Nhi) để quản lý, theo dõi'
    : 'Đã chuyển Kế toán duyệt · Đã thông báo Pháp chế để quản lý, theo dõi';
  event(next, actor, 'SUBMIT', notifyNote);
  return next;
}
export function decideContract(record: ContractRecord, actor: ContractActor, decision: ReviewStep['status'], note: string) {
  requireCondition(record.approval === 'IN_REVIEW', 'Hồ sơ không đang chờ duyệt.');
  requireCondition(actor.roles.includes('FINANCE'), 'Chỉ Kế toán mới có quyền phê duyệt hợp đồng.', 403);
  let index = record.steps.findIndex(s => s.reviewerId === actor.id && s.status === 'PENDING' && s.role === 'FINANCE' && s.version === record.version);
  if (index < 0) {
    index = record.steps.findIndex(s => s.status === 'PENDING' && s.role === 'FINANCE' && s.version === record.version);
  }
  requireCondition(index >= 0 && actor.id !== record.ownerId && inScope(record.brand, actor), 'Không có bước duyệt được giao cho bạn.', 403);
  requireCondition(['APPROVED', 'CHANGES', 'REJECTED'].includes(decision), 'Quyết định không hợp lệ.');
  requireCondition(decision === 'APPROVED' || note.trim(), 'Cần nêu lý do yêu cầu sửa hoặc từ chối.');
  const next = structuredClone(record);
  Object.assign(next.steps[index], {
    reviewerId: actor.id,
    reviewerName: actor.name,
    status: decision,
    note,
    decidedAt: new Date().toISOString(),
  });
  const isFinanceFinal = actor.roles.includes('FINANCE') && decision === 'APPROVED';
  next.approval = decision === 'CHANGES'
    ? 'CHANGES'
    : decision === 'REJECTED'
    ? 'REJECTED'
    : (isFinanceFinal || next.steps.every(s => s.status === 'APPROVED'))
    ? 'APPROVED'
    : 'IN_REVIEW';
  event(next, actor, decision, note); return next;
}
export function assertCanSign(record: ContractRecord, actor: ContractActor) {
  requireCondition(actor.roles.includes('SIGN_COORDINATOR') && inScope(record.brand, actor), 'Không có quyền trình ký.', 403);
  const hasFinance = record.steps.some(s => s.role === 'FINANCE' && s.status === 'APPROVED' && s.version === record.version);
  requireCondition(
    record.approval === 'APPROVED' &&
    record.steps.length >= 1 &&
    hasFinance,
    'Chỉ phiên bản đã được Kế toán phê duyệt cuối cùng (FINAL) mới được bắt đầu luồng trình ký.'
  );
}
/** Kết quả đọc lại từ weSign có khác lần trước không (trạng thái, người ký, lỗi). */
export function signingChanged(previous: SigningAttempt, detail: Pick<SigningAttempt, 'status' | 'sourceStatus' | 'people'>) {
  return previous.status !== detail.status || previous.sourceStatus !== detail.sourceStatus || !!previous.error
    || JSON.stringify(previous.people.map(p => [p.email, p.action])) !== JSON.stringify(detail.people.map(p => [p.email, p.action]));
}
