import { randomUUID } from 'node:crypto';
import { assertCanSign, event, requireCondition } from './domain';
import type { ContractActor, ContractRecord } from './types';

export function simulateSigning(record: ContractRecord, actor: ContractActor, action: string) {
  requireCondition(process.env.NODE_ENV !== 'production', 'Giả lập ký chỉ dùng trong môi trường phát triển.', 403);
  assertCanSign(record, actor);
  const next = structuredClone(record);
  let attempt = next.signing.at(-1);
  const now = new Date().toISOString();
  if (action === 'DEMO_SIGN_START') {
    requireCondition(!attempt || ['REJECTED', 'CANCELLED'].includes(attempt.status), 'Đã có lượt ký đang hoạt động hoặc hoàn tất.');
    attempt = { documentId: randomUUID(), version: record.version, linkedBy: actor.id, linkedAt: now, syncedAt: now, provider: 'DEMO', status: 'WAITING', sourceStatus: -1, evidenceConfirmedBy: actor.id, evidenceHash: '', people: [
      { name: 'Đại diện Upbase (giả lập)', email: 'upbase@example.invalid', action: 1, status: 'Chờ ký' },
      { name: `${record.partner} (giả lập)`, email: 'partner@example.invalid', action: 0, status: 'Chưa đến lượt' },
    ] };
    next.signing.push(attempt);
  } else {
    requireCondition(attempt?.provider === 'DEMO' && ['WAITING', 'PARTIAL'].includes(attempt.status), 'Không có lượt ký giả lập đang hoạt động.');
    if (action === 'DEMO_SIGN_REJECT') {
      const person = attempt.people.find(p => p.action === 1)!; person.action = 3; person.status = 'Từ chối'; attempt.status = 'REJECTED'; attempt.sourceStatus = -4;
    } else {
      requireCondition(action === 'DEMO_SIGN_NEXT', 'Thao tác giả lập không hợp lệ.');
      const person = attempt.people.find(p => p.action === 1)!; person.action = 2; person.status = 'Đã ký';
      const following = attempt.people.find(p => p.action === 0);
      if (following) { following.action = 1; following.status = 'Chờ ký'; attempt.status = 'PARTIAL'; attempt.sourceStatus = -2; }
      else { attempt.status = 'COMPLETED'; attempt.sourceStatus = -3; }
    }
    attempt.syncedAt = now;
  }
  event(next, actor, action, 'Giả lập tiến độ ký; không gửi tài liệu đến MISA, không tạo chữ ký pháp lý.');
  return next;
}
