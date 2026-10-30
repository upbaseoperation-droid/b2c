import { NextRequest, NextResponse } from 'next/server';
import { syncContractToJob } from '@/lib/server/contractJobSync';
import { createHash } from 'node:crypto';
import { actorFromRequest, configuredActors, checkOrigin, DEMO_ACTORS } from '@/lib/contracts/access';
import { canRead, createContract, editContract, submitContract, decideContract, assertCanSign, event, requireCondition, ContractError, inScope, signingChanged } from '@/lib/contracts/domain';
import { listContracts, getContract, saveContract, storageMode } from '@/lib/contracts/store';
import { loadTemplate, templateCatalog, renderTemplate, archiveTemplate, saveTemplateMeta, parseAndStoreCustomDocx, readArchivedDocxBuffer, uploadTemplateDocx } from '@/lib/contracts/templates';
import { checkContract, aiConfigured } from '@/lib/contracts/check';
import { wesignConfigured, wesignDetail } from '@/lib/contracts/wesign';
import {
  canAdvanceSigningStatus,
  contractSystemConfigured,
  createStandaloneContractSystemMeta,
  generateContractOnSystem,
  querySigningStatusFromContractSystem,
  requestSignOnSystem,
  syncTemplatesWithContractSystem,
} from '@/lib/contracts/contractSystemClient';
import { buildStableContractCode } from '@/lib/contracts/contractSystemRules';
import type { AcceptanceScreenshotItem, ContractActor, ContractRecord, ReviewStep } from '@/lib/contracts/types';
import { simulateSigning } from '@/lib/contracts/demo';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function failure(error: unknown) { return NextResponse.json({ error: error instanceof ContractError ? error.message : 'Không thể xử lý hồ sơ. Kiểm tra cấu hình và thử lại.' }, { status: error instanceof ContractError ? eStatus(error) : 503, headers: { 'Cache-Control': 'no-store' } }); }
function eStatus(error: unknown) { return error instanceof ContractError ? error.status : 503; }
export async function GET(req: NextRequest) {
  try {
    const actor = actorFromRequest(req);
    const actors = configuredActors();
    const rawTemplates = await templateCatalog();
    const templates = await syncTemplatesWithContractSystem(rawTemplates);
    return NextResponse.json(
      {
        actor,
        reviewers: actors.filter(a => a.roles.some(r => ['LEGAL', 'FINANCE', 'LEAD'].includes(r))),
        demoActors: process.env.NODE_ENV !== 'production' ? DEMO_ACTORS : [],
        templates,
        records: (await listContracts()).filter(r => canRead(r, actor)),
        config: {
          storage: storageMode(),
          ai: aiConfigured(),
          wesign: wesignConfigured(),
          contractSystem: contractSystemConfigured(),
        },
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) { return failure(error); }
}
async function parseInput(body: Record<string, unknown>, actor: ContractActor, existing?: ContractRecord) {
  const title = typeof body.title === 'string' ? body.title.trim() : ''; const brand = typeof body.brand === 'string' ? body.brand.trim() : ''; const partner = typeof body.partner === 'string' ? body.partner.trim() : '';
  requireCondition(title && title.length <= 180 && brand && brand.length <= 120 && partner && partner.length <= 180, 'Cần nhập tiêu đề, nhãn hàng và đối tác hợp lệ.');
  requireCondition(typeof body.templateId === 'string', 'Cần chọn mẫu pháp chế.');
  if (existing) requireCondition(body.templateId === existing.templateId, 'Không thể đổi mẫu của hồ sơ đã tạo.');
  const { template } = await loadTemplate(body.templateId, existing?.templateHash);
  requireCondition(typeof body.values === 'object' && body.values && !Array.isArray(body.values), 'Dữ liệu điền không hợp lệ.');
  const fields = new Set(template.fields.map(f => f.key)); const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(body.values)) {
    if (!fields.has(key) && !key.startsWith('token:')) continue;
    requireCondition(typeof value === 'string' && value.length <= 4000 && !/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(value), 'Trường điền không hợp lệ.');
    values[key] = value;
  }
  const ref = (v: unknown) => { if (v === undefined || v === null || v === '') return undefined; requireCondition(typeof v === 'string' && /^[\w.@-]{1,80}$/.test(v), 'Mã booking hoặc KOC không hợp lệ.'); return v; };

  const isKocOwnForm = Boolean(body.isKocOwnForm);
  let customFile = existing?.customFile;
  if (typeof body.customFileBase64 === 'string' && body.customFileBase64.trim()) {
    const filename = typeof body.customFilename === 'string' && body.customFilename.trim() ? body.customFilename.trim() : 'hop-dong-koc.docx';
    const parsed = await parseAndStoreCustomDocx(body.customFileBase64, filename, template.subject);
    customFile = {
      filename: parsed.filename,
      hash: parsed.hash,
      uploadedAt: new Date().toISOString(),
      uploadedBy: actor.name,
      blocks: parsed.blocks,
      paragraphs: parsed.paragraphs,
    };
  }
  if (isKocOwnForm) {
    requireCondition(Boolean(customFile), 'Vui lòng tải lên file hợp đồng (.docx) của KOC.');
  }

  let acceptanceScreenshots: AcceptanceScreenshotItem[] | undefined = existing?.acceptanceScreenshots;
  if (Array.isArray(body.acceptanceScreenshots)) {
    acceptanceScreenshots = (body.acceptanceScreenshots as AcceptanceScreenshotItem[])
      .filter((item) => item && typeof item.imageDataUrl === 'string' && item.imageDataUrl.trim().length > 0)
      .slice(0, 12);
  }

  return {
    title, brand, partner, templateId: template.id, templateHash: template.hash, values,
    parentId: typeof body.parentId === 'string' && body.parentId ? body.parentId : undefined,
    dealId: ref(body.dealId), dealCode: ref(body.dealCode), kocId: ref(body.kocId),
    hasCustomTerms: isKocOwnForm ? true : Boolean(body.hasCustomTerms),
    customTermsSummary: typeof body.customTermsSummary === 'string' ? body.customTermsSummary.trim().slice(0, 2000) : undefined,
    internalNotes: typeof body.internalNotes === 'string' ? body.internalNotes.trim().slice(0, 4000) : undefined,
    isKocOwnForm,
    customFile: isKocOwnForm ? customFile : undefined,
    acceptanceScreenshots,
    googleDocsUrl: typeof body.googleDocsUrl === 'string' && body.googleDocsUrl.trim() ? body.googleDocsUrl.trim() : existing?.googleDocsUrl,
    googleDocsId: typeof body.googleDocsId === 'string' && body.googleDocsId.trim() ? body.googleDocsId.trim() : existing?.googleDocsId,
    googleDocsSource: body.googleDocsSource === 'KOC_CUSTOM_DOC' ? 'KOC_CUSTOM_DOC' : (body.googleDocsUrl ? 'TEMPLATE_AMENDED' : existing?.googleDocsSource),
    googleDocsReviewRouting: (typeof body.googleDocsReviewRouting === 'object' && body.googleDocsReviewRouting !== null ? body.googleDocsReviewRouting : existing?.googleDocsReviewRouting) as any,
    googleDocsComments: (Array.isArray(body.googleDocsComments) ? body.googleDocsComments : existing?.googleDocsComments) as any,
    googleDocsAuditTrail: (typeof body.googleDocsAuditTrail === 'object' && body.googleDocsAuditTrail !== null ? body.googleDocsAuditTrail : existing?.googleDocsAuditTrail) as any,
  };
}
export async function POST(req: NextRequest) {
  try {
    checkOrigin(req); const actor = actorFromRequest(req);
    const raw = await req.text(); requireCondition(Buffer.byteLength(raw) < 20 * 1024 * 1024, 'Hồ sơ vượt giới hạn dung lượng.', 413);
    let body: Record<string, unknown>; try { body = JSON.parse(raw); } catch { throw new ContractError('Dữ liệu yêu cầu không hợp lệ.'); }
    requireCondition(body && typeof body === 'object' && !Array.isArray(body), 'Yêu cầu không hợp lệ.');
    if (body.action === 'CREATE') {
      const input = await parseInput(body, actor);
      let parentContractCode: string | undefined;
      if (input.parentId) {
        const parent = await getContract(input.parentId);
        requireCondition(canRead(parent, actor), 'Không có quyền truy cập hồ sơ gốc.', 403);
        parentContractCode = parent.contractSystem?.contractCode || buildStableContractCode(parent);
        if (input.templateId.endsWith('-SOW')) {
          requireCondition(parent.templateId.endsWith('-HDNT'), 'Phụ lục SOW phải gắn với Hợp đồng nguyên tắc (HĐNT).');
          requireCondition(!input.kocId || !parent.kocId || parent.kocId === input.kocId, 'Hợp đồng nguyên tắc gốc phải thuộc cùng KOC.');
        }
      }
      const draft = createContract(input, actor);
      const { template } = await loadTemplate(input.templateId, input.templateHash);
      draft.contractSystem = await generateContractOnSystem(draft, template, parentContractCode).catch(() =>
        createStandaloneContractSystemMeta(draft, template, parentContractCode),
      );
      await archiveTemplate(input.templateId, input.templateHash);
      const saved = await saveContract(draft); await syncContractToJob(saved).catch(() => 0); return NextResponse.json({ record: saved });
    }
    requireCondition(typeof body.id === 'string', 'Thiếu mã hồ sơ.');
    const record = await getContract(body.id); requireCondition(canRead(record, actor), 'Không có quyền truy cập hồ sơ.', 403);
    requireCondition(body.revision === record.revision, 'Hồ sơ đã thay đổi. Vui lòng tải lại.', 409);
    let next: ContractRecord = structuredClone(record);
    if (body.action === 'EDIT') {
      next = editContract(record, actor, await parseInput(body, actor, record));
      const { template } = await loadTemplate(next.templateId, next.templateHash);
      const parentRec = next.parentId ? await getContract(next.parentId).catch(() => null) : null;
      const parentCode = parentRec ? (parentRec.contractSystem?.contractCode || buildStableContractCode(parentRec)) : undefined;
      next.contractSystem = await generateContractOnSystem(next, template, parentCode).catch(() =>
        createStandaloneContractSystemMeta(next, template, parentCode),
      );
    }
    else if (body.action === 'SUBMIT') {
      const { template } = await loadTemplate(record.templateId, record.templateHash);
      requireCondition(template.hash === record.templateHash, 'Mẫu nguồn đã thay đổi.', 409);
      if (!record.isKocOwnForm) {
        requireCondition(template.fields.filter(f => f.required).every(f => record.values[f.key]?.trim()), 'Còn trường bắt buộc chưa điền.');
      }
      requireCondition(Array.isArray(body.reviewers) && body.reviewers.every(id => typeof id === 'string'), 'Cần chọn người duyệt.');
      const reviewers = configuredActors().filter(a => (body.reviewers as string[]).includes(a.id));
      requireCondition(reviewers.length === body.reviewers.length, 'Người duyệt chưa được cấp quyền.');
      const mandatoryLegal = Boolean(record.isKocOwnForm || record.hasCustomTerms || template.exemptLegalReview === false);
      next = submitContract(record, actor, reviewers, {
        requireLegal: mandatoryLegal ? true : (typeof body.requireLegal === 'boolean' ? body.requireLegal : undefined),
      });
    } else if (body.action === 'ADD_NOTE') {
      requireCondition(typeof body.note === 'string' && body.note.trim() && body.note.length <= 4000, 'Nội dung ghi chú không hợp lệ.');
      event(next, actor, 'NOTE', (body.note as string).trim());
    } else if (body.action === 'DECIDE') {
      requireCondition(typeof body.note === 'string' && body.note.length <= 4000, 'Nhận xét không hợp lệ.');
      next = decideContract(record, actor, body.decision as ReviewStep['status'], body.note);
      const isLegal = actor.roles.includes('LEGAL') || record.steps.find(s => s.reviewerId === actor.id)?.role === 'LEGAL';
      if (isLegal && body.decision === 'APPROVED') {
        const kocId = record.kocId || (typeof body.kocId === 'string' ? body.kocId : undefined);
        const kocLegalNotes = typeof body.kocLegalNotes === 'string' ? body.kocLegalNotes.trim() : undefined;
        if (body.saveAsKocTemplate === true && kocId) {
          const customTplId = `KOC-${kocId.toUpperCase().replace(/[^A-Z0-9_-]/g, '')}`;
          try {
            const currentTpl = await loadTemplate(record.templateId, record.templateHash);
            const customBuf = record.customFile?.hash ? await readArchivedDocxBuffer(record.customFile.hash) : null;
            if (customBuf) {
              await uploadTemplateDocx(customTplId, actor.name, {
                base64Docx: customBuf.toString('base64'),
                filename: record.customFile?.filename || `${customTplId}.docx`,
                name: `Mẫu duyệt riêng · ${record.partner || kocId}`,
                subject: currentTpl.template.subject,
                kind: currentTpl.template.kind,
                category: currentTpl.template.category,
                version: `${currentTpl.template.version}-KOC`,
                description: `Mẫu hợp đồng đã được Pháp chế (${actor.name}) phê duyệt riêng cho KOC ${record.partner}.`,
                exemptLegalReview: true,
                scope: 'KOC_CUSTOM',
                kocId,
                kocName: record.partner,
                approvedByLegal: actor.name,
                approvedAt: new Date().toISOString(),
                originalContractId: record.id,
                customType: record.isKocOwnForm ? 'KOC_FORM' : 'UPBASE_AMENDED',
                legalNotes: kocLegalNotes || body.note,
                note: `Ban hành mẫu riêng của KOC ${record.partner} từ hồ sơ ${record.id}`,
              });
            } else {
              await saveTemplateMeta(customTplId, actor.name, {
                name: `Mẫu duyệt riêng · ${record.partner || kocId}`,
                subject: currentTpl.template.subject,
                kind: currentTpl.template.kind,
                category: currentTpl.template.category,
                version: `${currentTpl.template.version}-KOC`,
                description: `Mẫu hợp đồng đã được Pháp chế (${actor.name}) phê duyệt riêng cho KOC ${record.partner}.`,
                exemptLegalReview: true,
                scope: 'KOC_CUSTOM',
                kocId,
                kocName: record.partner,
                approvedByLegal: actor.name,
                approvedAt: new Date().toISOString(),
                originalContractId: record.id,
                customType: record.isKocOwnForm ? 'KOC_FORM' : (record.hasCustomTerms ? 'UPBASE_AMENDED' : 'KOC_FORM'),
                legalNotes: kocLegalNotes || body.note,
              });
            }
            event(next, actor, 'NOTE', `Pháp chế đã lưu mẫu này thành Mẫu đã duyệt cho KOC ${record.partner || kocId}. Các booking sau sẽ được miễn duyệt lại điều khoản.`);
          } catch {
            // Không làm gián đoạn luồng duyệt chính nếu việc lưu mẫu bổ sung gặp lỗi
          }
        } else if (kocLegalNotes) {
          event(next, actor, 'NOTE', `Lưu ý của Pháp chế cho KOC: ${kocLegalNotes}`);
        }
      }
    } else if (body.action === 'UPDATE_LEGAL_NOTES') {
      requireCondition(actor.roles.some(r => ['LEGAL', 'LEAD'].includes(r)), 'Chỉ Pháp chế hoặc Trưởng bộ phận mới có quyền cập nhật lưu ý pháp lý.', 403);
      requireCondition(typeof body.legalNotes === 'string' && body.legalNotes.length <= 4000, 'Nội dung lưu ý không hợp lệ.');
      const notes = (body.legalNotes as string).trim();
      next.internalNotes = notes;
      event(next, actor, 'NOTE', `Cập nhật lưu ý Pháp chế: ${notes}`);
    } else if (body.action === 'UPDATE_ACCEPTANCE_SCREENSHOTS') {
      requireCondition(actor.id === record.ownerId || actor.roles.some(r => ['CREATOR', 'LEAD'].includes(r)), 'Không có quyền cập nhật ảnh chụp nghiệm thu.', 403);
      requireCondition(Array.isArray(body.acceptanceScreenshots), 'Danh sách ảnh chụp không hợp lệ.');
      next.acceptanceScreenshots = (body.acceptanceScreenshots as AcceptanceScreenshotItem[])
        .filter((item) => item && typeof item.imageDataUrl === 'string' && item.imageDataUrl.trim().length > 0)
        .slice(0, 12);
      event(next, actor, 'NOTE', `Đã cập nhật ${next.acceptanceScreenshots.length} ảnh chụp màn hình sản phẩm đính kèm Biên bản nghiệm thu`);
    } else if (body.action === 'WITHDRAW') {
      requireCondition(actor.id === record.ownerId && ['IN_REVIEW', 'APPROVED'].includes(record.approval), 'Không thể thu hồi hồ sơ.', 403);
      requireCondition(!record.signing.some(s => !['CANCELLED', 'REJECTED'].includes(s.status)), 'Hồ sơ đã trình ký không thể thu hồi nội bộ.');
      requireCondition(typeof body.note === 'string' && body.note.trim() && body.note.length <= 4000, 'Cần lý do thu hồi.');
      next.approval = 'DRAFT'; next.steps = []; event(next, actor, 'WITHDRAW', body.note);
    } else if (body.action === 'CHECK') {
      requireCondition(record.ownerId === actor.id || record.steps.some(s => s.reviewerId === actor.id), 'Không có quyền kiểm tra hồ sơ.', 403);
      requireCondition(record.approval !== 'APPROVED' && !record.signing.length, 'Chỉ kiểm tra trước khi hoàn tất phê duyệt.');
      const previous = record.checks.find(c => c.version === record.version && c.provider === (aiConfigured() ? 'AI' : 'RULES'));
      requireCondition(!previous || Date.now() - Date.parse(previous.at) > 60000, 'Đã có kết quả cho phiên bản này. Thử lại sau một phút.');
      next.checks.push(await checkContract(record)); event(next, actor, aiConfigured() ? 'AI_CHECK' : 'RULE_CHECK');
    } else if (body.action === 'GENERATE_CONTRACT_SYSTEM') {
      requireCondition(inScope(record.brand, actor), 'Không có quyền đồng bộ bản hợp đồng.', 403);
      const { template } = await loadTemplate(record.templateId, record.templateHash);
      const parentRec = next.parentId ? await getContract(next.parentId).catch(() => null) : null;
      const parentCode = parentRec ? (parentRec.contractSystem?.contractCode || buildStableContractCode(parentRec)) : undefined;
      const meta = await generateContractOnSystem(next, template, parentCode);
      next.contractSystem = meta;
      event(next, actor, 'GENERATE_CONTRACT_SYSTEM', `Đã tạo bản .docx và đồng bộ Google Docs (${meta.contractCode})`);
    } else if (body.action === 'SYNC_GOOGLE_DOCS') {
      requireCondition(inScope(record.brand, actor), 'Không có quyền đồng bộ Google Docs.', 403);
      const { template } = await loadTemplate(record.templateId, record.templateHash);
      const baseMeta = next.contractSystem || createStandaloneContractSystemMeta(next, template);
      const now = new Date().toISOString();
      next.contractSystem = {
        ...baseMeta,
        googleDocsSyncedAt: now,
        lastSyncedAt: now,
      };
      const syncNote = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : 'Đã xuất lại bản .docx mới nhất từ Google Docs';
      event(next, actor, 'SYNC_GOOGLE_DOCS', syncNote);
    } else if (body.action === 'REQUEST_SIGN') {
      assertCanSign(record, actor);
      const { template } = await loadTemplate(record.templateId, record.templateHash);
      const rendered = await renderTemplate(record.templateId, record.templateHash, record.values);
      const partyAEmail = typeof body.partyAEmail === 'string' ? body.partyAEmail.trim() : undefined;
      const partyBEmail = typeof body.partyBEmail === 'string' ? body.partyBEmail.trim() : undefined;
      const { meta, attempt, reusedExisting } = await requestSignOnSystem({
        record: next,
        actor,
        renderedParagraphs: rendered.paragraphs,
        template,
        partyAEmail,
        partyBEmail,
      });
      next.contractSystem = meta;
      if (!reusedExisting) {
        next.signing.push(attempt);
        event(
          next,
          actor,
          'REQUEST_SIGN',
          `Đã xuất .docx từ Google Docs và gửi ký sang WeSign qua contract-system (Mã: ${meta.contractCode})`,
        );
      }
    } else if (body.action === 'LINK_WESIGN') {
      assertCanSign(record, actor);
      requireCondition(typeof body.documentId === 'string' && body.confirmed === true, 'Cần mã weSign và xác nhận đã đối chiếu bản duyệt.');
      requireCondition(!record.signing.some(s => !['CANCELLED', 'REJECTED'].includes(s.status)), 'Hồ sơ đã có lượt ký đang hoạt động hoặc hoàn tất.');
      requireCondition(!(await listContracts()).some(r => r.signing.some(s => s.documentId.toLowerCase() === (body.documentId as string).toLowerCase())), 'Luồng weSign đã được liên kết với một hồ sơ.');
      const detail = await wesignDetail(body.documentId);
      requireCondition(detail.status !== 'DRAFT', 'Luồng weSign chưa được trình ký.');
      const rendered = await renderTemplate(record.templateId, record.templateHash, record.values);
      next.signing.push({ ...detail, documentId: body.documentId.toLowerCase(), version: record.version, linkedBy: actor.id, linkedAt: new Date().toISOString(), evidenceConfirmedBy: actor.id, evidenceHash: createHash('sha256').update(rendered.paragraphs.join('\n')).digest('hex') });
      event(next, actor, 'LINK_WESIGN', `Đã đối chiếu thủ công với phiên bản v${record.version}; ${body.documentId}`);
    } else if (typeof body.action === 'string' && ['DEMO_SIGN_START', 'DEMO_SIGN_NEXT', 'DEMO_SIGN_REJECT', 'DEMO_FAST_SIGN'].includes(body.action)) {
      next = simulateSigning(record, actor, body.action);
    } else if (body.action === 'SYNC_WESIGN') {
      requireCondition(inScope(record.brand, actor), 'Không có quyền đồng bộ.', 403);
      const attempt = next.signing.at(-1); requireCondition(attempt, 'Chưa liên kết luồng ký.');
      requireCondition(attempt.provider !== 'DEMO', 'Luồng giả lập không đồng bộ với MISA.');
      try {
        const remoteSystemDetail =
          attempt.provider === 'CONTRACT_SYSTEM'
            ? await querySigningStatusFromContractSystem(next)
            : null;
        if (remoteSystemDetail) {
          const guard = canAdvanceSigningStatus({
            currentStatus: attempt.status,
            nextStatus: remoteSystemDetail.status,
            lastWebhookTimestamp: attempt.lastWebhookTimestamp,
            incomingTimestamp: remoteSystemDetail.eventTimestamp,
          });
          if (guard.allowed) {
            Object.assign(attempt, remoteSystemDetail, {
              error: undefined,
              lastWebhookTimestamp: remoteSystemDetail.eventTimestamp || Date.now(),
            });
            if (next.contractSystem) {
              next.contractSystem.lastSyncedAt = remoteSystemDetail.syncedAt;
              if (remoteSystemDetail.signedFileUrl) next.contractSystem.signedFileUrl = remoteSystemDetail.signedFileUrl;
              if (remoteSystemDetail.signedFileStatus) next.contractSystem.signedFileStatus = remoteSystemDetail.signedFileStatus;
            }
            event(next, actor, 'SYNC_WESIGN', `Đồng bộ từ contract-system: ${remoteSystemDetail.status}`);
          } else {
            return NextResponse.json({ record });
          }
        } else {
          const detail = await wesignDetail(attempt.documentId);
          // Không đổi gì thì không ghi: tránh lịch sử phình và lỗi “người khác đã cập nhật” khi nhiều người cùng xem.
          if (!signingChanged(attempt, detail)) return NextResponse.json({ record: { ...record, signing: [...record.signing.slice(0, -1), { ...attempt, syncedAt: detail.syncedAt }] } });
          Object.assign(attempt, detail, { error: undefined }); event(next, actor, 'SYNC_WESIGN', String(detail.sourceStatus));
        }
      }
      catch (error) {
        const message = error instanceof ContractError ? error.message : 'Không kết nối được weSign. Trạng thái đang hiển thị là lần đồng bộ trước.';
        if (attempt.error === message) return NextResponse.json({ record });
        attempt.error = message; event(next, actor, 'SYNC_ERROR', attempt.error);
      }
    } else throw new ContractError('Thao tác không hợp lệ.');
    const savedRecord = await saveContract(next, record.revision);
    // Kết quả duyệt / trạng thái ký của Phụ lục SOW, BBNT tự cập nhật về Job trên bảng Deal
    await syncContractToJob(savedRecord).catch(() => 0);
    return NextResponse.json({ record: savedRecord });
  } catch (error) { return failure(error); }
}
