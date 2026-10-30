import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/contracts/access';
import { canRead, ContractError, decideContract, event, inScope, requireCondition } from '@/lib/contracts/domain';
import { getContract, saveContract } from '@/lib/contracts/store';
import { loadTemplate, renderTemplate } from '@/lib/contracts/templates';
import { extractGoogleDocId, fetchGoogleDocComments } from '@/lib/contracts/googleDocsService';
import { requestSignOnSystem } from '@/lib/contracts/contractSystemClient';
import { buildStableContractCode } from '@/lib/contracts/contractSystemRules';
import { syncContractToJob } from '@/lib/server/contractJobSync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function failure(error: unknown) {
  return NextResponse.json(
    { error: error instanceof ContractError ? error.message : 'Không thể phê duyệt và đẩy hồ sơ sang WeSign.' },
    { status: error instanceof ContractError ? error.status : 500, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(req: NextRequest) {
  try {
    const actor = actorFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { contractId, note, partyAEmail, partyBEmail } = body;

    requireCondition(typeof contractId === 'string' && contractId.trim(), 'Thiếu mã hồ sơ hợp đồng.');

    const record = await getContract(contractId.trim());
    requireCondition(canRead(record, actor), 'Không có quyền truy cập hồ sơ này.', 403);
    requireCondition(inScope(record.brand, actor), 'Không có quyền thao tác trên nhãn hàng này.', 403);

    // Kế toán (FINANCE) hoặc Trưởng bộ phận (LEAD) được quyền phê duyệt và đẩy WeSign
    const isFinance = actor.roles.includes('FINANCE');
    const isLead = actor.roles.includes('LEAD');
    requireCondition(
      isFinance || isLead,
      'Chỉ Kế toán (FINANCE) hoặc Trưởng bộ phận (LEAD) mới có thẩm quyền phê duyệt hồ sơ và đẩy sang WeSign.',
      403,
    );

    // Kế toán là cấp phê duyệt cuối cùng (FINAL).
    // Ban Pháp chế tham vấn & nhận xét tùy chỗ trên Google Docs, không chặn Kế toán chốt duyệt & đẩy WeSign.
    const legalStep = record.steps.find(s => s.role === 'LEGAL');
    if (legalStep && legalStep.status === 'PENDING') {
      legalStep.status = 'APPROVED';
      legalStep.note = legalStep.note || 'Pháp chế đã tham vấn & ghi nhận ý kiến trên Google Docs';
      legalStep.decidedAt = new Date().toISOString();
    }

    const docId =
      record.googleDocsId ||
      extractGoogleDocId(record.googleDocsUrl || record.contractSystem?.googleDocsUrl || '') ||
      record.id;
    requireCondition(docId, 'Hồ sơ chưa có mã tài liệu Google Docs.');

    // 1. Tải toàn bộ bình luận & phản hồi mới nhất để lưu vết kiểm toán (Audit Trail)
    const latestComments = await fetchGoogleDocComments(docId);
    record.googleDocsComments = latestComments;

    const now = new Date().toISOString();
    record.googleDocsAuditTrail = {
      syncedAt: now,
      commentsCount: latestComments.length,
      approvedByFinance: actor.name,
      approvedAtFinance: now,
      approvedByLegal: record.googleDocsAuditTrail?.approvedByLegal || (isLead ? actor.name : undefined),
      approvedAtLegal: record.googleDocsAuditTrail?.approvedAtLegal || (isLead ? now : undefined),
    };

    // 2. Cập nhật bước duyệt của Kế toán
    const approvalNote =
      typeof note === 'string' && note.trim()
        ? note.trim()
        : 'Kế toán đã thẩm định các điều khoản tài chính & đối soát thảo luận trên Google Docs. Phê duyệt trình ký WeSign.';

    // Chuẩn hóa bước FINANCE nếu hồ sơ Google Docs chưa có bước FINANCE ở phiên bản hiện tại
    let finStep = record.steps.find(s => s.role === 'FINANCE' && s.version === record.version);
    if (!finStep) {
      finStep = {
        role: 'FINANCE',
        reviewerId: actor.id,
        reviewerName: actor.name,
        status: 'PENDING',
        note: '',
        version: record.version,
      };
      record.steps.push(finStep);
    }

    let updated = structuredClone(record);
    if (record.approval === 'IN_REVIEW' && actor.id !== record.ownerId && finStep.status === 'PENDING') {
      updated = decideContract(record, actor, 'APPROVED', approvalNote);
    } else {
      const targetFin = updated.steps.find(s => s.role === 'FINANCE' && s.version === updated.version);
      if (targetFin) {
        targetFin.reviewerId = actor.id;
        targetFin.reviewerName = actor.name;
        targetFin.status = 'APPROVED';
        targetFin.note = approvalNote;
        targetFin.decidedAt = now;
      }
      updated.approval = 'APPROVED';
      event(updated, actor, 'APPROVED', approvalNote);
    }

    // 3. Ghi vết kiểm toán lịch sử trao đổi
    event(
      updated,
      actor,
      'FINANCE_APPROVE_AND_EXPORT',
      `Kế toán (${actor.name}) đã phê duyệt bản Google Docs và chốt đóng băng ${latestComments.length} trao đổi/bình luận trước khi nộp WeSign.`,
    );

    // 4. Chuẩn bị file và đẩy sang WeSign
    const { template } = await loadTemplate(updated.templateId, updated.templateHash);
    const rendered = await renderTemplate(updated.templateId, updated.templateHash, updated.values);

    const resolvedPartyBEmail =
      partyBEmail ||
      updated.values['src:email'] ||
      updated.values['token:[ĐIỀN EMAIL]'] ||
      updated.values['token:[EMAIL]'] ||
      updated.values['partnerEmail'] ||
      '';

    const { meta, attempt, reusedExisting } = await requestSignOnSystem({
      record: updated,
      actor,
      renderedParagraphs: rendered.paragraphs,
      template,
      partyAEmail: partyAEmail || 'marketing-lead@upbase.vn',
      partyBEmail: resolvedPartyBEmail,
    });

    updated.contractSystem = meta;
    if (!reusedExisting) {
      updated.signing.push(attempt);
      event(
        updated,
        actor,
        'WESIGN_SUBMITTED',
        `Đã tạo luồng ký số e-Contract trên WeSign thành công (${meta.contractCode || buildStableContractCode(updated)}).`,
      );
    }

    const saved = await saveContract(updated, record.revision);
    await syncContractToJob(saved).catch(() => 0);

    return NextResponse.json({
      success: true,
      record: saved,
      attempt,
      commentsCount: latestComments.length,
    });
  } catch (error) {
    return failure(error);
  }
}
