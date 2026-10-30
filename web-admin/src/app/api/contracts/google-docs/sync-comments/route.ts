import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/contracts/access';
import { canRead, ContractError, event, requireCondition } from '@/lib/contracts/domain';
import { getContract, saveContract } from '@/lib/contracts/store';
import { extractGoogleDocId, fetchGoogleDocComments } from '@/lib/contracts/googleDocsService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function failure(error: unknown) {
  return NextResponse.json(
    { error: error instanceof ContractError ? error.message : 'Không thể đồng bộ bình luận từ Google Docs.' },
    { status: error instanceof ContractError ? error.status : 500, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(req: NextRequest) {
  try {
    const actor = actorFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { contractId, url } = body;

    requireCondition(typeof contractId === 'string' && contractId.trim(), 'Thiếu mã hồ sơ hợp đồng.');

    const record = await getContract(contractId.trim());
    requireCondition(canRead(record, actor), 'Không có quyền truy cập hồ sơ này.', 403);

    const docId = record.googleDocsId || (url ? extractGoogleDocId(url) : null) || record.id;
    requireCondition(docId, 'Hồ sơ chưa có liên kết Google Docs hợp lệ.');

    const comments = await fetchGoogleDocComments(docId);

    const updated = structuredClone(record);
    updated.googleDocsComments = comments;
    const now = new Date().toISOString();
    if (!updated.googleDocsAuditTrail) {
      updated.googleDocsAuditTrail = {
        syncedAt: now,
        commentsCount: comments.length,
      };
    } else {
      updated.googleDocsAuditTrail.syncedAt = now;
      updated.googleDocsAuditTrail.commentsCount = comments.length;
    }

    event(
      updated,
      actor,
      'SYNC_GOOGLE_DOCS_COMMENTS',
      `Đã đồng bộ ${comments.length} bình luận & phản hồi từ Google Docs`,
    );

    const saved = await saveContract(updated, record.revision);

    return NextResponse.json({
      success: true,
      comments,
      record: saved,
    });
  } catch (error) {
    return failure(error);
  }
}
