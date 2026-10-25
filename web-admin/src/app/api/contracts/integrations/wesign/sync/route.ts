import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { actorFromRequest, checkOrigin } from '@/lib/contracts/access';
import { listContracts, saveContract } from '@/lib/contracts/store';
import { wesignDetail } from '@/lib/contracts/wesign';
import { ContractError, event, requireCondition, signingChanged } from '@/lib/contracts/domain';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function extractTargetDocumentIds(payload: unknown): Set<string> {
  const ids = new Set<string>();
  const add = (val: unknown) => {
    if (typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim())) {
      ids.add(val.trim().toLowerCase());
    }
  };
  if (!payload || typeof payload !== 'object') return ids;
  if (Array.isArray(payload)) {
    for (const item of payload) {
      if (item && typeof item === 'object') {
        const rec = item as Record<string, unknown>;
        add(rec.documentId);
        add(rec.id);
        if (rec.document && typeof rec.document === 'object') add((rec.document as Record<string, unknown>).id);
      }
    }
    return ids;
  }
  const obj = payload as Record<string, unknown>;
  add(obj.documentId);
  add(obj.id);
  if (obj.document && typeof obj.document === 'object') {
    add((obj.document as Record<string, unknown>).id);
  }
  if (Array.isArray(obj.documentIds)) {
    for (const d of obj.documentIds) add(d);
  }
  return ids;
}

// Điểm nhận callback/job chỉ kích hoạt đọc lại trạng thái từ MISA, không tin trạng thái trong body.
export async function POST(req: NextRequest) {
  try {
    const secret = process.env.WESIGN_SYNC_SECRET;
    const supplied =
      req.headers.get('authorization')?.replace(/^Bearer /i, '') ||
      req.headers.get('x-wesign-secret') ||
      '';
    const hasValidSecret = Boolean(
      secret &&
        supplied &&
        Buffer.byteLength(secret) === Buffer.byteLength(supplied) &&
        timingSafeEqual(Buffer.from(secret), Buffer.from(supplied)),
    );

    let actorLabel = { id: 'wesign-sync', name: 'Đồng bộ MISA weSign', roles: [] as never[], brands: [] as string[] };
    if (!hasValidSecret) {
      try {
        checkOrigin(req);
        const sessionActor = actorFromRequest(req);
        requireCondition(
          sessionActor.roles.some(r => ['SIGN_COORDINATOR', 'LEAD', 'LEGAL', 'FINANCE'].includes(r)),
          'Không có quyền đồng bộ.',
          401,
        );
        actorLabel = { id: sessionActor.id, name: sessionActor.name, roles: [] as never[], brands: [] };
      } catch {
        throw new ContractError('Không có quyền đồng bộ.', 401);
      }
    }

    let targetDocIds = new Set<string>();
    try {
      const raw = await req.text();
      if (raw.trim()) {
        targetDocIds = extractTargetDocumentIds(JSON.parse(raw));
      }
    } catch {
      // Bỏ qua nếu body rỗng hoặc không phải JSON
    }

    const records = (await listContracts()).filter(
      r =>
        r.signing.length &&
        r.signing.at(-1)!.provider !== 'DEMO' &&
        !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(r.signing.at(-1)!.status),
    );
    const results: Array<{ id: string; documentId: string; status?: string; progressPercent?: number; changed?: boolean; success: boolean }> = [];
    // Ưu tiên hồ sơ được chỉ định trong callback weSign, sau đó ưu tiên hồ sơ chưa được đồng bộ lâu nhất.
    records.sort((a, b) => {
      const aDoc = a.signing.at(-1)!.documentId.toLowerCase();
      const bDoc = b.signing.at(-1)!.documentId.toLowerCase();
      const aTargeted = targetDocIds.has(aDoc) ? 0 : 1;
      const bTargeted = targetDocIds.has(bDoc) ? 0 : 1;
      if (aTargeted !== bTargeted) return aTargeted - bTargeted;
      return (a.signing.at(-1)!.syncedAt || '').localeCompare(b.signing.at(-1)!.syncedAt || '');
    });

    const batch = targetDocIds.size > 0
      ? records.filter(r => targetDocIds.has(r.signing.at(-1)!.documentId.toLowerCase())).concat(
          records.filter(r => !targetDocIds.has(r.signing.at(-1)!.documentId.toLowerCase())),
        ).slice(0, 50)
      : records.slice(0, 50);

    let changedCount = 0;
    for (const record of batch) {
      const next = structuredClone(record);
      const attempt = next.signing.at(-1)!;
      try {
        const detail = await wesignDetail(attempt.documentId);
        if (!signingChanged(attempt, detail)) {
          results.push({
            id: record.id,
            documentId: attempt.documentId,
            status: detail.status,
            progressPercent: detail.progressPercent,
            changed: false,
            success: true,
          });
          continue;
        }
        Object.assign(attempt, detail, { error: undefined });
        event(next, actorLabel, 'SYNC_WESIGN', String(detail.sourceStatus));
        await saveContract(next, record.revision);
        changedCount++;
        results.push({
          id: record.id,
          documentId: attempt.documentId,
          status: detail.status,
          progressPercent: detail.progressPercent,
          changed: true,
          success: true,
        });
      } catch (e) {
        if (!(e instanceof ContractError && e.status === 409)) {
          attempt.error = e instanceof ContractError ? e.message : 'Lỗi kết nối weSign. Giữ nguyên trạng thái lần đồng bộ trước.';
          await saveContract(next, record.revision).catch(() => undefined);
        }
        results.push({ id: record.id, documentId: attempt.documentId, success: false });
      }
    }
    return NextResponse.json({
      results,
      syncedCount: results.filter(r => r.success).length,
      changedCount,
      remaining: Math.max(0, records.length - 50),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof ContractError ? e.message : 'Không thể đồng bộ.' },
      { status: e instanceof ContractError ? e.status : 503 },
    );
  }
}
