import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/contracts/access';
import { canRead, ContractError, event, requireCondition } from '@/lib/contracts/domain';
import { getContract, saveContract } from '@/lib/contracts/store';
import { buildContractNegotiationReport, captureGoogleDocForRecord } from '@/lib/contracts/googleDocsServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function failure(error: unknown) {
  return NextResponse.json(
    { error: error instanceof ContractError ? error.message : 'Không thể tổng hợp báo cáo lưu vết hợp đồng.' },
    { status: error instanceof ContractError ? error.status : 500, headers: { 'Cache-Control': 'no-store' } },
  );
}

/**
 * Tổng hợp và lưu vết Báo cáo đàm phán & chỉnh sửa của riêng hợp đồng (`negotiationReport`)
 * dựa trên Bản đẩy lên ban đầu (`initialSnapshot`), bình luận/lịch sử sửa của các tài khoản, và Bản chốt cuối.
 */
export async function POST(req: NextRequest) {
  try {
    const actor = actorFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { contractId, syncLatest = true } = body;
    requireCondition(typeof contractId === 'string' && contractId.trim(), 'Thiếu mã hồ sơ hợp đồng.');

    const record = await getContract(contractId.trim());
    requireCondition(canRead(record, actor), 'Không có quyền truy cập hồ sơ này.', 403);
    requireCondition(Boolean(record.googleDocsUrl), 'Hồ sơ chưa có link Google Doc.');

    const updated = structuredClone(record);
    const now = new Date().toISOString();

    if (syncLatest) {
      const capture = await captureGoogleDocForRecord(record, actor.name).catch(() => null);
      if (capture) {
        updated.googleDocsComments = capture.comments;
        updated.googleDocsReviewRouting = capture.routing;
        updated.googleDocsAuditTrail = {
          ...updated.googleDocsAuditTrail,
          syncedAt: now,
          commentsCount: capture.comments.length,
          revisions: capture.revisions,
          simulated: capture.simulated || undefined,
          initialSnapshot: capture.initialSnapshot,
          initialToFinalDiffs: capture.initialToFinalDiffs,
          finalSnapshot: updated.googleDocsAuditTrail?.finalSnapshot || capture.snapshot,
        };
      }
    }

    const report = await buildContractNegotiationReport(updated, actor.name);
    updated.googleDocsAuditTrail = {
      ...updated.googleDocsAuditTrail,
      syncedAt: updated.googleDocsAuditTrail?.syncedAt || now,
      commentsCount: (updated.googleDocsComments || []).length,
      negotiationReport: report,
    };

    event(
      updated,
      actor,
      'NOTE',
      `Đã tổng hợp và lưu Báo cáo đàm phán & chỉnh sửa hợp đồng (${report.accountContributionsSummary.length} tài khoản tham gia, ${report.clauseEvolutionSummary.length} mục biến đổi điều khoản).`,
    );

    const saved = await saveContract(updated, record.revision);
    return NextResponse.json({ success: true, report, record: saved });
  } catch (error) {
    return failure(error);
  }
}
