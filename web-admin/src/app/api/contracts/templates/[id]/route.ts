import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest, checkOrigin } from '@/lib/contracts/access';
import { loadTemplate, saveTemplateMeta, uploadTemplateDocx } from '@/lib/contracts/templates';
import { ContractError, canRead, requireCondition } from '@/lib/contracts/domain';
import { getContract } from '@/lib/contracts/store';
import type { ContractCategory } from '@/lib/contracts/types';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = actorFromRequest(req);
    const { id } = await context.params;
    const recordId = req.nextUrl.searchParams.get('record');
    const record = recordId ? await getContract(recordId) : undefined;
    if (record) requireCondition(record.templateId === id && canRead(record, actor), 'Không có quyền truy cập bản mẫu của hồ sơ.', 403);
    const { template, zip } = await loadTemplate(id, record?.templateHash);
    if (req.nextUrl.searchParams.get('download') === '1') {
      return new NextResponse(new Uint8Array(await zip.generateAsync({ type: 'nodebuffer' })), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${id}.docx"`,
          'Cache-Control': 'private, no-store',
        },
      });
    }
    return NextResponse.json({ template }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof ContractError ? e.message : 'Không đọc được file mẫu. Kiểm tra thư mục pháp chế.' },
      { status: e instanceof ContractError ? e.status : 503 },
    );
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    checkOrigin(req);
    const actor = actorFromRequest(req);
    requireCondition(
      actor.roles.some(r => ['LEGAL', 'LEAD'].includes(r)),
      'Chỉ Pháp chế hoặc Trưởng bộ phận mới có quyền cập nhật danh mục mẫu hợp đồng.',
      403,
    );
    const { id } = await context.params;
    const body = (await req.json()) as Record<string, unknown>;
    const action = body.action as string;

    if (action === 'SAVE_META') {
      const template = await saveTemplateMeta(id, actor.name, {
        name: typeof body.name === 'string' ? body.name : undefined,
        subject: typeof body.subject === 'string' ? body.subject : undefined,
        kind: body.kind === 'ACCEPTANCE' ? 'ACCEPTANCE' : body.kind === 'CONTRACT' ? 'CONTRACT' : undefined,
        category: typeof body.category === 'string' ? (body.category as ContractCategory) : undefined,
        version: typeof body.version === 'string' ? body.version : undefined,
        description: typeof body.description === 'string' ? body.description : undefined,
        active: typeof body.active === 'boolean' ? body.active : undefined,
        defaultReviewRoles: Array.isArray(body.defaultReviewRoles)
          ? (body.defaultReviewRoles.filter(r => ['LEGAL', 'FINANCE', 'LEAD'].includes(String(r))) as ('LEGAL' | 'FINANCE' | 'LEAD')[])
          : undefined,
      });
      return NextResponse.json({ template });
    }

    if (action === 'UPLOAD_DOCX') {
      requireCondition(typeof body.base64Docx === 'string' && body.base64Docx.length > 0, 'Thiếu dữ liệu file Word (.docx).');
      const targetId = typeof body.newId === 'string' && body.newId.trim() ? body.newId.trim().toUpperCase() : id;
      const template = await uploadTemplateDocx(targetId, actor.name, {
        base64Docx: body.base64Docx,
        filename: typeof body.filename === 'string' ? body.filename : `${targetId}.docx`,
        name: typeof body.name === 'string' ? body.name : undefined,
        subject: typeof body.subject === 'string' ? body.subject : undefined,
        kind: body.kind === 'ACCEPTANCE' ? 'ACCEPTANCE' : body.kind === 'CONTRACT' ? 'CONTRACT' : undefined,
        category: typeof body.category === 'string' ? (body.category as ContractCategory) : undefined,
        version: typeof body.version === 'string' ? body.version : undefined,
        description: typeof body.description === 'string' ? body.description : undefined,
        defaultReviewRoles: Array.isArray(body.defaultReviewRoles)
          ? (body.defaultReviewRoles.filter(r => ['LEGAL', 'FINANCE', 'LEAD'].includes(String(r))) as ('LEGAL' | 'FINANCE' | 'LEAD')[])
          : undefined,
        note: typeof body.note === 'string' ? body.note : undefined,
      });
      return NextResponse.json({ template });
    }

    throw new ContractError('Thao tác danh mục mẫu không hợp lệ.');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof ContractError ? e.message : 'Không thể lưu biểu mẫu pháp chế.' },
      { status: e instanceof ContractError ? e.status : 400 },
    );
  }
}
