import { randomUUID } from 'node:crypto';
import type { ContractActor, ContractEvent, ContractRecord, ReviewStep } from './types';
export class ContractError extends Error { constructor(message: string, public status = 400) { super(message); } }
export function requireCondition(condition: unknown, message: string, status = 400): asserts condition { if (!condition) throw new ContractError(message, status); }
export const inScope = (brand: string, actor: ContractActor) => actor.allBrands || actor.brands.includes(brand);
export function canRead(record: ContractRecord, actor: ContractActor) {
  return !!inScope(record.brand, actor) && (record.ownerId === actor.id || record.steps.some(s => s.reviewerId === actor.id) || actor.roles.some(r => ['LEAD', 'SIGN_COORDINATOR', 'AUDITOR'].includes(r)));
}
export function event(record: ContractRecord, actor: ContractActor, action: string, note = '') {
  const entry: ContractEvent = { at: new Date().toISOString(), actorId: actor.id, actorName: actor.name, action, note, version: record.version };
  record.history.push(entry); record.updatedAt = entry.at;
}
type Input = Pick<ContractRecord, 'title' | 'brand' | 'partner' | 'templateId' | 'templateHash' | 'values'> & { parentId?: string };
export function createContract(input: Input, actor: ContractActor): ContractRecord {
  requireCondition(actor.roles.includes('CREATOR') && inScope(input.brand, actor), 'Không có quyền tạo hợp đồng cho nhãn hàng này.', 403);
  const at = new Date().toISOString();
  const record: ContractRecord = { ...input, id: randomUUID(), ownerId: actor.id, ownerName: actor.name, version: 1, revision: 1, approval: 'DRAFT', steps: [], checks: [], signing: [], history: [], versions: [], createdAt: at, updatedAt: at };
  event(record, actor, 'CREATE'); return record;
}
export function editContract(record: ContractRecord, actor: ContractActor, input: Input) {
  requireCondition(record.ownerId === actor.id && actor.roles.includes('CREATOR') && inScope(record.brand, actor) && inScope(input.brand, actor), 'Chỉ người phụ trách được sửa hồ sơ.', 403);
  requireCondition(!record.signing.some(s => !['CANCELLED', 'REJECTED'].includes(s.status)), 'Hồ sơ đang trình ký hoặc đã ký không thể sửa.');
  requireCondition(record.approval !== 'IN_REVIEW', 'Cần nhận yêu cầu bổ sung hoặc thu hồi hồ sơ trước khi sửa.');
  requireCondition(record.templateId === input.templateId && record.templateHash === input.templateHash, 'Không đổi mẫu/phiên bản nguồn trên hồ sơ đã tạo.');
  const next = structuredClone(record);
  next.versions.push({ version: record.version, values: structuredClone(record.values), at: record.updatedAt, actorId: actor.id });
  Object.assign(next, input); next.version++; next.steps = []; next.approval = 'DRAFT'; event(next, actor, 'EDIT'); return next;
}
export function submitContract(record: ContractRecord, actor: ContractActor, reviewers: ContractActor[]) {
  requireCondition(record.ownerId === actor.id && inScope(record.brand, actor), 'Không có quyền gửi hồ sơ.', 403);
  requireCondition(['DRAFT', 'CHANGES', 'REJECTED'].includes(record.approval), 'Hồ sơ không ở trạng thái có thể gửi duyệt.');
  requireCondition(reviewers.length >= 2 && new Set(reviewers.map(r => r.id)).size === reviewers.length, 'Cần người duyệt độc lập cho kế toán và pháp chế.');
  const next = structuredClone(record);
  next.steps = (['LEGAL', 'FINANCE'] as const).map(role => {
    const reviewer = reviewers.find(r => r.roles.includes(role));
    requireCondition(reviewer && reviewer.id !== actor.id && inScope(record.brand, reviewer), 'Reviewer không có quyền hoặc trùng người tạo.');
    return { role, reviewerId: reviewer.id, reviewerName: reviewer.name, status: 'PENDING', note: '', version: record.version };
  });
  requireCondition(new Set(next.steps.map(s => s.reviewerId)).size === next.steps.length, 'Pháp chế và kế toán cần hai người độc lập.');
  const lead = reviewers.find(r => r.roles.includes('LEAD'));
  if (lead) { requireCondition(lead.id !== actor.id && inScope(record.brand, lead), 'Lead không có quyền hoặc trùng người tạo.'); next.steps.push({ role: 'LEAD', reviewerId: lead.id, reviewerName: lead.name, status: 'PENDING', note: '', version: record.version }); }
  next.approval = 'IN_REVIEW'; event(next, actor, 'SUBMIT'); return next;
}
export function decideContract(record: ContractRecord, actor: ContractActor, decision: ReviewStep['status'], note: string) {
  requireCondition(record.approval === 'IN_REVIEW', 'Hồ sơ không đang chờ duyệt.');
  const index = record.steps.findIndex(s => s.reviewerId === actor.id && s.status === 'PENDING' && actor.roles.includes(s.role) && s.version === record.version);
  requireCondition(index >= 0 && actor.id !== record.ownerId && inScope(record.brand, actor), 'Không có bước duyệt được giao cho bạn.', 403);
  requireCondition(['APPROVED', 'CHANGES', 'REJECTED'].includes(decision), 'Quyết định không hợp lệ.');
  requireCondition(decision === 'APPROVED' || note.trim(), 'Cần nêu lý do yêu cầu sửa hoặc từ chối.');
  const next = structuredClone(record); Object.assign(next.steps[index], { status: decision, note, decidedAt: new Date().toISOString() });
  next.approval = decision === 'CHANGES' ? 'CHANGES' : decision === 'REJECTED' ? 'REJECTED' : next.steps.every(s => s.status === 'APPROVED') ? 'APPROVED' : 'IN_REVIEW';
  event(next, actor, decision, note); return next;
}
export function assertCanSign(record: ContractRecord, actor: ContractActor) {
  requireCondition(actor.roles.includes('SIGN_COORDINATOR') && inScope(record.brand, actor), 'Không có quyền trình ký.', 403);
  requireCondition(record.approval === 'APPROVED' && record.steps.length >= 2 && ['LEGAL', 'FINANCE'].every(role => record.steps.some(s => s.role === role && s.status === 'APPROVED' && s.version === record.version)) && record.steps.every(s => s.status === 'APPROVED' && s.version === record.version), 'Chỉ phiên bản đã đủ phê duyệt mới được bắt đầu luồng trình ký.');
}
