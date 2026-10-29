import { randomUUID } from 'node:crypto';
import { assertCanSign, event, requireCondition } from './domain';
import type { ContractActor, ContractRecord } from './types';

export function simulateSigning(record: ContractRecord, actor: ContractActor, action: string) {
  requireCondition(process.env.NODE_ENV !== 'production', 'Giả lập ký chỉ dùng trong môi trường phát triển.', 403);
  const next = structuredClone(record);
  const now = new Date().toISOString();
  if (action === 'DEMO_FAST_SIGN') {
    for (const s of next.steps) {
      if (s.status !== 'APPROVED') {
        s.status = 'APPROVED';
        s.decidedAt = now;
        s.note = s.note || 'Đã duyệt kiểm tra hạn mức & điều khoản';
      }
    }
    if (next.steps.length === 0) {
      next.steps.push({
        role: 'FINANCE',
        reviewerId: 'demo-finance',
        reviewerName: 'Lê Thị Thu Hà',
        status: 'APPROVED',
        note: 'Đã duyệt hạn mức Booking & thuế',
        version: next.version,
        decidedAt: now,
      });
    }
    next.approval = 'APPROVED';
    const completedAttempt = {
      documentId: randomUUID(),
      name: next.title,
      version: next.version,
      linkedBy: actor.id,
      linkedAt: now,
      syncedAt: now,
      provider: 'DEMO' as const,
      status: 'COMPLETED' as const,
      sourceStatus: -3,
      completedCount: 2,
      totalCount: 2,
      progressPercent: 100,
      evidenceConfirmedBy: actor.id,
      evidenceHash: '',
      people: [
        { name: 'Upbase (Công ty CP Công nghệ UpBase)', email: 'hddt@upbase.asia', role: 0, roleLabel: 'Đại diện Bên A', level: 1, action: 2, status: 'Đã ký', at: now },
        { name: next.partner, email: 'partner@booking.upbase.vn', role: 0, roleLabel: 'Đại diện Bên B (KOC)', level: 2, action: 2, status: 'Đã ký', at: now },
      ],
    };
    next.signing.push(completedAttempt);
    event(next, actor, 'DEMO_FAST_SIGN', 'Đã hoàn tất ký số đủ 2 bên (UpBase & KOC) và khóa cấu hình Deal');
    return next;
  }
  assertCanSign(record, actor);
  let attempt = next.signing.at(-1);
  if (action === 'DEMO_SIGN_START') {
    requireCondition(!attempt || ['REJECTED', 'CANCELLED'].includes(attempt.status), 'Đã có lượt ký đang hoạt động hoặc hoàn tất.');
    attempt = {
      documentId: randomUUID(),
      name: record.title,
      version: record.version,
      linkedBy: actor.id,
      linkedAt: now,
      syncedAt: now,
      provider: 'DEMO',
      status: 'WAITING',
      sourceStatus: -1,
      completedCount: 0,
      totalCount: 2,
      progressPercent: 0,
      currentSignerName: 'Đại diện Upbase (giả lập)',
      currentSignerEmail: 'upbase@example.invalid',
      evidenceConfirmedBy: actor.id,
      evidenceHash: '',
      people: [
        { name: 'Đại diện Upbase (giả lập)', email: 'upbase@example.invalid', role: 0, roleLabel: 'Người ký', level: 1, action: 1, status: 'Chờ ký' },
        { name: `${record.partner} (giả lập)`, email: 'partner@example.invalid', role: 0, roleLabel: 'Người ký', level: 2, action: 0, status: 'Chưa đến lượt' },
      ],
    };
    next.signing.push(attempt);
  } else {
    requireCondition(
      attempt && ['DEMO', 'CONTRACT_SYSTEM'].includes(attempt.provider || '') && ['WAITING', 'PARTIAL'].includes(attempt.status),
      'Không có lượt ký giả lập đang hoạt động.',
    );
    if (action === 'DEMO_SIGN_REJECT') {
      const person = attempt.people.find(p => p.action === 1)!;
      person.action = 3;
      person.status = 'Từ chối';
      person.at = now;
      attempt.status = 'REJECTED';
      attempt.sourceStatus = -4;
    } else {
      requireCondition(action === 'DEMO_SIGN_NEXT', 'Thao tác giả lập không hợp lệ.');
      const person = attempt.people.find(p => p.action === 1)!;
      person.action = 2;
      person.status = 'Đã ký';
      person.at = now;
      const following = attempt.people.find(p => p.action === 0);
      if (following) {
        following.action = 1;
        following.status = 'Chờ ký';
        attempt.status = 'PARTIAL';
        attempt.sourceStatus = -2;
      } else {
        attempt.status = 'COMPLETED';
        attempt.sourceStatus = -3;
        attempt.signedFileStatus = 'DOWNLOADED';
        attempt.signedFileUrl = `/api/contracts/${next.id}/document`;
        if (next.contractSystem) {
          next.contractSystem.signedFileStatus = 'DOWNLOADED';
          next.contractSystem.signedFileUrl = `/api/contracts/${next.id}/document`;
          next.contractSystem.lastSyncedAt = now;
        }
      }
    }
    const completedCount = attempt.people.filter(p => p.action === 2).length;
    const totalCount = attempt.people.length;
    const currentWaiting = attempt.people.find(p => p.action === 1);
    attempt.completedCount = completedCount;
    attempt.totalCount = totalCount;
    attempt.progressPercent = attempt.status === 'COMPLETED' ? 100 : totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    attempt.currentSignerName = currentWaiting?.name;
    attempt.currentSignerEmail = currentWaiting?.email;
    attempt.syncedAt = now;
  }
  event(next, actor, action, 'Giả lập tiến độ ký; không gửi tài liệu đến MISA, không tạo chữ ký pháp lý.');
  return next;
}
