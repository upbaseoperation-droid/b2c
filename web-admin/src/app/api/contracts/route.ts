import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { actorFromRequest, configuredActors, checkOrigin, DEMO_ACTORS } from '@/lib/contracts/access';
import { canRead, createContract, editContract, submitContract, decideContract, assertCanSign, event, requireCondition, ContractError, inScope } from '@/lib/contracts/domain';
import { listContracts, getContract, saveContract, storageMode } from '@/lib/contracts/store';
import { loadTemplate, templateCatalog, renderTemplate, archiveTemplate } from '@/lib/contracts/templates';
import { checkContract, aiConfigured } from '@/lib/contracts/check';
import { wesignConfigured, wesignDetail } from '@/lib/contracts/wesign';
import type { ContractRecord, ReviewStep } from '@/lib/contracts/types';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function failure(error: unknown) { return NextResponse.json({ error: error instanceof ContractError ? error.message : 'Không thể xử lý hồ sơ. Kiểm tra cấu hình và thử lại.' }, { status: error instanceof ContractError ? error.status : 503, headers: { 'Cache-Control': 'no-store' } }); }
export async function GET(req: NextRequest) {
  try {
    const actor = actorFromRequest(req);
    const actors = configuredActors();
    return NextResponse.json({ actor, reviewers: actors.filter(a => a.roles.some(r => ['LEGAL', 'FINANCE', 'LEAD'].includes(r))), demoActors: process.env.NODE_ENV !== 'production' ? DEMO_ACTORS : [], templates: await templateCatalog(), records: (await listContracts()).filter(r => canRead(r, actor)), config: { storage: storageMode(), ai: aiConfigured(), wesign: wesignConfigured() } }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}
async function parseInput(body: Record<string, unknown>, existing?: ContractRecord) {
  const title = typeof body.title === 'string' ? body.title.trim() : ''; const brand = typeof body.brand === 'string' ? body.brand.trim() : ''; const partner = typeof body.partner === 'string' ? body.partner.trim() : '';
  requireCondition(title && title.length <= 180 && brand && brand.length <= 120 && partner && partner.length <= 180, 'Cần nhập tiêu đề, nhãn hàng và đối tác hợp lệ.');
  requireCondition(typeof body.templateId === 'string', 'Cần chọn mẫu pháp chế.');
  if (existing) requireCondition(body.templateId === existing.templateId, 'Không thể đổi mẫu của hồ sơ đã tạo.');
  const { template } = await loadTemplate(body.templateId, existing?.templateHash);
  requireCondition(typeof body.values === 'object' && body.values && !Array.isArray(body.values), 'Dữ liệu điền không hợp lệ.');
  const fields = new Set(template.fields.map(f => f.key)); const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(body.values)) { requireCondition(fields.has(key) && typeof value === 'string' && value.length <= 4000 && !/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(value), 'Trường điền không hợp lệ.'); values[key] = value; }
  return { title, brand, partner, templateId: template.id, templateHash: template.hash, values, parentId: typeof body.parentId === 'string' && body.parentId ? body.parentId : undefined };
}
export async function POST(req: NextRequest) {
  try {
    checkOrigin(req); const actor = actorFromRequest(req);
    const raw = await req.text(); requireCondition(Buffer.byteLength(raw) < 300000, 'Hồ sơ vượt giới hạn dung lượng.', 413);
    let body: Record<string, unknown>; try { body = JSON.parse(raw); } catch { throw new ContractError('Dữ liệu yêu cầu không hợp lệ.'); }
    requireCondition(body && typeof body === 'object' && !Array.isArray(body), 'Yêu cầu không hợp lệ.');
    if (body.action === 'CREATE') {
      const input = await parseInput(body);
      if (input.parentId) { const parent = await getContract(input.parentId); requireCondition(canRead(parent, actor), 'Không có quyền truy cập hồ sơ gốc.', 403); }
      const draft = createContract(input, actor); await archiveTemplate(input.templateId, input.templateHash);
      const saved = await saveContract(draft); return NextResponse.json({ record: saved });
    }
    requireCondition(typeof body.id === 'string', 'Thiếu mã hồ sơ.');
    const record = await getContract(body.id); requireCondition(canRead(record, actor), 'Không có quyền truy cập hồ sơ.', 403);
    requireCondition(body.revision === record.revision, 'Hồ sơ đã thay đổi. Vui lòng tải lại.', 409);
    let next: ContractRecord = structuredClone(record);
    if (body.action === 'EDIT') next = editContract(record, actor, await parseInput(body, record));
    else if (body.action === 'SUBMIT') {
      const { template } = await loadTemplate(record.templateId, record.templateHash);
      requireCondition(template.hash === record.templateHash, 'Mẫu nguồn đã thay đổi.', 409);
      requireCondition(template.fields.filter(f => f.required).every(f => record.values[f.key]?.trim()), 'Còn trường bắt buộc chưa điền.');
      requireCondition(Array.isArray(body.reviewers) && body.reviewers.every(id => typeof id === 'string'), 'Cần chọn người duyệt.');
      const reviewers = configuredActors().filter(a => (body.reviewers as string[]).includes(a.id));
      requireCondition(reviewers.length === body.reviewers.length, 'Người duyệt chưa được cấp quyền.');
      next = submitContract(record, actor, reviewers);
    } else if (body.action === 'DECIDE') {
      requireCondition(typeof body.note === 'string' && body.note.length <= 4000, 'Nhận xét không hợp lệ.');
      next = decideContract(record, actor, body.decision as ReviewStep['status'], body.note);
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
    } else if (body.action === 'SYNC_WESIGN') {
      requireCondition(inScope(record.brand, actor), 'Không có quyền đồng bộ.', 403);
      const attempt = next.signing.at(-1); requireCondition(attempt, 'Chưa liên kết luồng ký.');
      try { const detail = await wesignDetail(attempt.documentId); Object.assign(attempt, detail, { error: undefined }); event(next, actor, 'SYNC_WESIGN', String(detail.sourceStatus)); }
      catch (error) { attempt.error = error instanceof ContractError ? error.message : 'Không kết nối được weSign. Trạng thái đang hiển thị là lần đồng bộ trước.'; event(next, actor, 'SYNC_ERROR', attempt.error); }
    } else throw new ContractError('Thao tác không hợp lệ.');
    return NextResponse.json({ record: await saveContract(next, record.revision) });
  } catch (error) { return failure(error); }
}
