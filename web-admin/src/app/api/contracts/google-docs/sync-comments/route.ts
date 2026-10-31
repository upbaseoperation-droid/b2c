import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/contracts/access';
import { canRead, ContractError, event, requireCondition } from '@/lib/contracts/domain';
import { getContract, saveContract } from '@/lib/contracts/store';
import { captureGoogleDocForRecord } from '@/lib/contracts/googleDocsServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function failure(error: unknown) {
  return NextResponse.json(
    { error: error instanceof ContractError ? error.message : 'Không thể đồng bộ từ Google Doc.' },
    { status: error instanceof ContractError ? error.status : 500, headers: { 'Cache-Control': 'no-store' } },
  );
}

/**
 * Đồng bộ từ Google Doc: gộp bình luận mới (không xóa bình luận đã lưu), lấy lịch sử phiên bản
 * và, với mẫu Upbase có chỉnh sửa, so lại nội dung với mẫu. Bản chốt lúc trình final không đổi.
 */
export async function POST(req: NextRequest) {
  try {
    const actor = actorFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { contractId } = body;
    requireCondition(typeof contractId === 'string' && contractId.trim(), 'Thiếu mã hồ sơ hợp đồng.');

    const record = await getContract(contractId.trim());
    requireCondition(canRead(record, actor), 'Không có quyền truy cập hồ sơ này.', 403);
    requireCondition(Boolean(record.googleDocsUrl), 'Hồ sơ chưa có link Google Doc.');

    const capture = await captureGoogleDocForRecord(record, actor.name);
    const updated = structuredClone(record);
    const now = new Date().toISOString();
    updated.googleDocsComments = capture.comments;
    updated.googleDocsReviewRouting = capture.routing;
    updated.googleDocsAuditTrail = {
      ...updated.googleDocsAuditTrail,
      syncedAt: now,
      commentsCount: capture.comments.length,
      revisions: capture.revisions,
      simulated: capture.simulated || undefined,
    };
    event(
      updated,
      actor,
      'SYNC_GOOGLE_DOCS_COMMENTS',
      `Đã đồng bộ ${capture.comments.length} bình luận và ${capture.revisions.length} phiên bản từ Google Doc${capture.simulated ? ' (giả lập)' : ''}`,
    );

    const saved = await saveContract(updated, record.revision);
    return NextResponse.json({ success: true, comments: capture.comments, record: saved });
  } catch (error) {
    return failure(error);
  }
}
