import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest, checkOrigin } from '@/lib/contracts/access';
import { ContractError, event, requireCondition } from '@/lib/contracts/domain';
import { listContracts, saveContract } from '@/lib/contracts/store';
import {
  buildStableContractCode,
  canAdvanceSigningStatus,
  verifyContractSystemWebhookAuth,
} from '@/lib/contracts/contractSystemClient';
import { syncContractToJob } from '@/lib/server/contractJobSync';
import type { SigningPerson } from '@/lib/contracts/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ContractSystemWebhookPayload {
  /** Mã hợp đồng idempotent (code). */
  code?: string;
  contractCode?: string;
  /** ID hợp đồng trên contract-system. */
  contractId?: string;
  /** UUID tài liệu trên WeSign. */
  documentId?: string;
  providerDocumentId?: string;
  /** Trạng thái ký mới: WAITING | PARTIAL | COMPLETED | REJECTED | CANCELLED. */
  status?: string;
  sourceStatus?: number;
  /** Thời điểm phát sinh sự kiện (epoch ms hoặc ISO string) để chống ghi đè lùi trạng thái. */
  timestamp?: number | string;
  /** URL file đã ký sau khi worker hoàn tất queue signed-file-download (Bước 12). */
  signedFileUrl?: string;
  signedFileStatus?: 'IDLE' | 'QUEUED' | 'DOWNLOADED' | 'FAILED';
  /** Danh sách người ký cập nhật từ WeSign. */
  signers?: Array<{
    name: string;
    email: string;
    action: number;
    status?: string;
    roleLabel?: string;
    order?: number;
    signedAt?: string;
  }>;
}

/**
 * Bước 13: Endpoint nhận sự kiện đồng bộ trạng thái ký và file đã ký từ `contract-system` đẩy về B2C Portal.
 * - Xác thực chữ ký HMAC-SHA256 hoặc khóa bí mật (`verifyContractSystemWebhookAuth`).
 * - Chỉ chấp nhận chuyển trạng thái tiến (`canAdvanceSigningStatus`) và làm bước cập nhật file đã ký idempotent.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signatureHeader =
      req.headers.get('x-contract-system-signature') ||
      req.headers.get('x-wesign-signature');
    const bearerToken =
      req.headers.get('authorization') ||
      req.headers.get('x-contract-system-secret') ||
      req.headers.get('x-wesign-secret');

    const isSignatureValid = verifyContractSystemWebhookAuth({
      rawBody,
      signatureHeader,
      bearerToken,
    });

    let actorLabel = {
      id: 'contract-system-webhook',
      name: 'Đồng bộ contract-system (Webhook)',
      roles: [] as never[],
      brands: [] as string[],
    };

    if (!isSignatureValid) {
      try {
        checkOrigin(req);
        const sessionActor = actorFromRequest(req);
        requireCondition(
          sessionActor.roles.some(r => ['SIGN_COORDINATOR', 'LEAD', 'LEGAL', 'FINANCE'].includes(r)),
          'Không có quyền gửi sự kiện đồng bộ.',
          401,
        );
        actorLabel = {
          id: sessionActor.id,
          name: sessionActor.name,
          roles: [] as never[],
          brands: [],
        };
      } catch {
        throw new ContractError(
          'Chữ ký xác thực Webhook contract-system không hợp lệ hoặc thiếu khóa bảo mật.',
          401,
        );
      }
    }

    let payload: ContractSystemWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as ContractSystemWebhookPayload;
    } catch {
      throw new ContractError('Payload Webhook không đúng định dạng JSON.', 400);
    }

    const targetCode = (payload.code || payload.contractCode || '').trim().toUpperCase();
    const targetContractId = (payload.contractId || '').trim();
    const targetDocId = (payload.documentId || payload.providerDocumentId || '').trim().toLowerCase();

    requireCondition(
      Boolean(targetCode || targetContractId || targetDocId),
      'Cần cung cấp mã hợp đồng (code), contractId hoặc documentId.',
      400,
    );

    const allRecords = await listContracts();
    const matched = allRecords.find(r => {
      const recCode = (r.contractSystem?.contractCode || buildStableContractCode(r)).toUpperCase();
      if (targetCode && recCode === targetCode) return true;
      if (targetContractId && r.contractSystem?.contractSystemId === targetContractId) return true;
      if (targetDocId && r.signing.some(s => s.documentId.toLowerCase() === targetDocId)) return true;
      return false;
    });

    requireCondition(matched, 'Không tìm thấy hồ sơ hợp đồng tương ứng trên B2C Portal.', 404);

    const next = structuredClone(matched);
    const attempt = next.signing.at(-1);
    requireCondition(attempt, 'Hồ sơ chưa mở lượt trình ký.', 409);

    const incomingStatus = (payload.status || attempt.status || 'WAITING').toUpperCase();
    const incomingTs =
      typeof payload.timestamp === 'number'
        ? payload.timestamp
        : typeof payload.timestamp === 'string' && payload.timestamp.trim()
          ? Date.parse(payload.timestamp) || Number(payload.timestamp) || undefined
          : undefined;

    const transition = canAdvanceSigningStatus({
      currentStatus: attempt.status,
      nextStatus: incomingStatus,
      lastWebhookTimestamp: attempt.lastWebhookTimestamp || next.contractSystem?.lastWebhookTimestamp,
      incomingTimestamp: incomingTs,
    });

    const now = new Date().toISOString();

    // Trường hợp sự kiện COMPLETED lặp hoặc worker vừa tải xong file đã ký (Bước 12) cho hợp đồng đã COMPLETED
    if (!transition.allowed) {
      if (transition.isDuplicateCompleted && payload.signedFileUrl && attempt.signedFileUrl !== payload.signedFileUrl) {
        attempt.signedFileUrl = payload.signedFileUrl;
        attempt.signedFileStatus = 'DOWNLOADED';
        attempt.syncedAt = now;
        if (next.contractSystem) {
          next.contractSystem.signedFileUrl = payload.signedFileUrl;
          next.contractSystem.signedFileStatus = 'DOWNLOADED';
          next.contractSystem.lastSyncedAt = now;
        }
        event(next, actorLabel, 'SIGNED_FILE_READY', 'Worker đã tải xong file hợp đồng đã ký từ WeSign');
        const saved = await saveContract(next, matched.revision);
        await syncContractToJob(saved).catch(() => 0);
        return NextResponse.json({
          updated: true,
          idempotent: true,
          status: attempt.status,
          signedFileStatus: attempt.signedFileStatus,
          recordId: saved.id,
        });
      }

      return NextResponse.json({
        updated: false,
        ignored: true,
        reason: transition.reason,
        status: attempt.status,
        recordId: matched.id,
      });
    }

    if (Array.isArray(payload.signers) && payload.signers.length > 0) {
      const updatedPeople: SigningPerson[] = payload.signers.map((s, idx) => ({
        name: s.name,
        email: s.email,
        action: s.action,
        status:
          s.status ||
          (s.action === 2 ? 'Đã ký' : s.action === 3 ? 'Từ chối' : s.action === 1 ? 'Chờ ký' : 'Chưa đến lượt'),
        role: 0,
        roleLabel: s.roleLabel || attempt.people[idx]?.roleLabel || 'Người ký',
        level: s.order || idx + 1,
        at: s.signedAt || (s.action === 2 ? now : attempt.people[idx]?.at),
      }));
      attempt.people = updatedPeople;
    } else if (incomingStatus === 'COMPLETED') {
      attempt.people = attempt.people.map(p => ({
        ...p,
        action: 2,
        status: 'Đã ký',
        at: p.at || now,
      }));
    } else if (incomingStatus === 'PARTIAL' && attempt.people.length >= 2) {
      attempt.people[0] = {
        ...attempt.people[0],
        action: 2,
        status: 'Đã ký',
        at: attempt.people[0].at || now,
      };
      attempt.people[1] = {
        ...attempt.people[1],
        action: 1,
        status: 'Chờ ký',
      };
    }

    const totalCount = attempt.people.length;
    const completedCount = attempt.people.filter(p => p.action === 2).length;
    attempt.status = incomingStatus;
    attempt.sourceStatus =
      typeof payload.sourceStatus === 'number'
        ? payload.sourceStatus
        : incomingStatus === 'COMPLETED'
          ? 2
          : incomingStatus === 'PARTIAL'
            ? 1
            : attempt.sourceStatus;
    attempt.completedCount = completedCount;
    attempt.totalCount = totalCount;
    attempt.progressPercent =
      incomingStatus === 'COMPLETED' ? 100 : totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const waiting = attempt.people.find(p => p.action === 1);
    attempt.currentSignerName = waiting?.name;
    attempt.currentSignerEmail = waiting?.email;
    attempt.syncedAt = now;
    attempt.error = undefined;

    if (incomingTs) {
      attempt.lastWebhookTimestamp = incomingTs;
    } else {
      attempt.lastWebhookTimestamp = Date.now();
    }

    if (payload.signedFileUrl) {
      attempt.signedFileUrl = payload.signedFileUrl;
      attempt.signedFileStatus = 'DOWNLOADED';
    } else if (payload.signedFileStatus) {
      attempt.signedFileStatus = payload.signedFileStatus;
    } else if (incomingStatus === 'COMPLETED' && attempt.signedFileStatus !== 'DOWNLOADED') {
      attempt.signedFileStatus = 'QUEUED';
    }

    if (next.contractSystem) {
      next.contractSystem.lastSyncedAt = now;
      next.contractSystem.lastWebhookTimestamp = attempt.lastWebhookTimestamp;
      if (attempt.signedFileUrl) next.contractSystem.signedFileUrl = attempt.signedFileUrl;
      if (attempt.signedFileStatus) next.contractSystem.signedFileStatus = attempt.signedFileStatus;
    }

    event(
      next,
      actorLabel,
      'CONTRACT_SYSTEM_WEBHOOK',
      `Đồng bộ trạng thái ký từ contract-system: ${incomingStatus} (${attempt.completedCount}/${attempt.totalCount})`,
    );

    const saved = await saveContract(next, matched.revision);
    await syncContractToJob(saved).catch(() => 0);

    return NextResponse.json({
      updated: true,
      recordId: saved.id,
      status: attempt.status,
      progressPercent: attempt.progressPercent,
      signedFileStatus: attempt.signedFileStatus,
    });
  } catch (error) {
    const status = error instanceof ContractError ? error.status : 500;
    return NextResponse.json(
      { error: error instanceof ContractError ? error.message : 'Không thể xử lý Webhook từ contract-system.' },
      { status },
    );
  }
}
