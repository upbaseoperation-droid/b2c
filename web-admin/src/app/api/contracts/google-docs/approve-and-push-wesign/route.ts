import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/contracts/access';
import { canRead, ContractError, decideContract, event, inScope, requireCondition } from '@/lib/contracts/domain';
import { getContract, saveContract } from '@/lib/contracts/store';
import { loadTemplate } from '@/lib/contracts/templates';
import { extractGoogleDocId } from '@/lib/contracts/googleDocsService';
import { buildContractNegotiationReport, captureGoogleDocForRecord, exportGoogleDocFile } from '@/lib/contracts/googleDocsServer';
import { requestSignOnSystem } from '@/lib/contracts/contractSystemClient';
import { buildStableContractCode } from '@/lib/contracts/contractSystemRules';
import { uploadLegalDocFile } from '@/lib/brands/r2';
import { syncContractToJob } from '@/lib/server/contractJobSync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function failure(error: unknown) {
  return NextResponse.json(
    { error: error instanceof ContractError ? error.message : 'Không thể phê duyệt và đẩy hồ sơ sang WeSign.' },
    { status: error instanceof ContractError ? error.status : 500, headers: { 'Cache-Control': 'no-store' } },
  );
}

/**
 * Kế toán duyệt hồ sơ Google Doc (bước cuối, sau Pháp chế) và đẩy WeSign.
 * Tự động kéo bản mới nhất từ Google Doc, lưu cả Bản ban đầu (`initialSnapshot`), bình luận, lịch sử phiên bản,
 * Bản chốt duyệt (`approvedSnapshot`), xuất DOCX/PDF lưu hệ thống, tạo Báo cáo lưu vết đàm phán (`negotiationReport`) và đẩy WeSign.
 */
export async function POST(req: NextRequest) {
  try {
    const actor = actorFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { contractId, note, partyAEmail, partyBEmail } = body;
    requireCondition(typeof contractId === 'string' && contractId.trim(), 'Thiếu mã hồ sơ hợp đồng.');

    const record = await getContract(contractId.trim());
    requireCondition(canRead(record, actor), 'Không có quyền truy cập hồ sơ này.', 403);
    requireCondition(inScope(record.brand, actor), 'Không có quyền thao tác trên nhãn hàng này.', 403);
    requireCondition(
      actor.roles.includes('FINANCE'),
      'Chỉ Kế toán được duyệt chốt bản cuối và đẩy WeSign.',
      403,
    );
    requireCondition(Boolean(record.googleDocsUrl), 'Hồ sơ không theo luồng Google Doc.');
    requireCondition(
      record.approval === 'IN_REVIEW',
      'Hồ sơ không ở trạng thái chờ duyệt.',
    );
    const pendingLegal = record.steps.find(s => s.role === 'LEGAL' && s.version === record.version && s.status !== 'APPROVED');
    requireCondition(!pendingLegal, 'Pháp chế chưa duyệt hồ sơ này.');

    // Tự động kéo và lưu phiên bản mới nhất trên Google Doc ngay lúc Kế toán bấm chốt (không bắt B2C trình lại).
    const capture = await captureGoogleDocForRecord(record, actor.name);
    const prevFinalHash = record.googleDocsAuditTrail?.finalSnapshot?.hash;
    const autoSyncedLatest = Boolean(prevFinalHash && prevFinalHash !== capture.snapshot.hash);

    const approvalNote =
      typeof note === 'string' && note.trim() ? note.trim() : 'Kế toán duyệt bản Google Doc đã trình final và đẩy WeSign.';
    const updated = decideContract(record, actor, 'APPROVED', approvalNote);
    requireCondition(updated.approval === 'APPROVED', 'Còn bước duyệt chưa hoàn tất.');

    // Xuất DOCX và PDF từ Google Doc để đẩy WeSign.
    const docId = record.googleDocsId || extractGoogleDocId(record.googleDocsUrl || '')!;
    const code = updated.contractSystem?.contractCode || buildStableContractCode(updated);
    const fileBase = `${code.replace(/[^\w.-]+/g, '-')}-v${updated.version}`;
    const [docx, pdf] = await Promise.all([exportGoogleDocFile(docId, 'docx'), exportGoogleDocFile(docId, 'pdf')]);
    const entitySlug = `hop-dong-${updated.id}`;
    const docxFile = docx
      ? await uploadLegalDocFile({ entitySlug, originalName: `${fileBase}.docx`, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: docx })
      : null;
    const pdfFile = pdf ? await uploadLegalDocFile({ entitySlug, originalName: `${fileBase}.pdf`, mimeType: 'application/pdf', buffer: pdf }) : null;

    const now = new Date().toISOString();
    updated.googleDocsStage = 'FINAL';
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
      finalSnapshot: record.googleDocsAuditTrail?.finalSnapshot || capture.snapshot,
      approvedByFinance: actor.name,
      approvedAtFinance: now,
      approvedSnapshot: capture.snapshot,
      snapshotHash: capture.snapshot.hash,
      exportedDocxUrl: docxFile?.url,
      exportedPdfUrl: pdfFile?.url,
      exportedAt: docxFile || pdfFile ? now : undefined,
    };
    updated.googleDocsAuditTrail.negotiationReport = await buildContractNegotiationReport(updated, actor.name);
    event(
      updated,
      actor,
      'FINANCE_APPROVE_AND_EXPORT',
      capture.simulated
        ? 'Kế toán duyệt bản Google Doc (giả lập: máy chủ chưa kết nối Google nên chưa xuất được DOCX/PDF).'
        : `Kế toán duyệt và tự động chốt bản mới nhất từ Google Doc (${capture.comments.length} bình luận, ${capture.revisions.length} phiên bản${autoSyncedLatest ? ', đã tự động cập nhật thay đổi mới nhất trên Google Doc' : ''}). Đã lưu Báo cáo đàm phán, xuất DOCX/PDF lưu hệ thống & đẩy WeSign.`,
    );

    // Chưa có API WeSign: tạo lượt trình ký với bằng chứng là nội dung Google Doc đã chốt, file đẩy lên WeSign là DOCX/PDF vừa xuất.
    const { template } = await loadTemplate(updated.templateId, updated.templateHash);
    const { meta, attempt, reusedExisting } = await requestSignOnSystem({
      record: updated,
      actor,
      renderedParagraphs: capture.snapshot.paragraphs,
      template,
      partyAEmail: partyAEmail || 'marketing-lead@upbase.vn',
      partyBEmail: partyBEmail || updated.values['src:email'] || updated.values['partnerEmail'] || '',
    });
    updated.contractSystem = { ...meta, exportedDocxUrl: docxFile?.url || meta.exportedDocxUrl };
    if (!reusedExisting) {
      updated.signing.push(attempt);
      event(updated, actor, 'WESIGN_SUBMITTED', `Đã tạo lượt trình ký WeSign (${meta.contractCode || code}).`);
    }

    const saved = await saveContract(updated, record.revision);
    await syncContractToJob(saved).catch(() => 0);
    return NextResponse.json({ success: true, record: saved, attempt, commentsCount: capture.comments.length });
  } catch (error) {
    return failure(error);
  }
}
