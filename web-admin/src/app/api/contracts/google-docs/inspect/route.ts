import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/contracts/access';
import { ContractError, requireCondition } from '@/lib/contracts/domain';
import { loadTemplate } from '@/lib/contracts/templates';
import { inspectGoogleDoc } from '@/lib/contracts/googleDocsService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function failure(error: unknown) {
  return NextResponse.json(
    { error: error instanceof ContractError ? error.message : 'Không thể phân tích tài liệu Google Docs.' },
    { status: error instanceof ContractError ? error.status : 500, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(req: NextRequest) {
  try {
    const actor = actorFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { url, templateId, templateHash, isCustomDoc } = body;

    requireCondition(typeof url === 'string' && url.trim(), 'Vui lòng cung cấp liên kết Google Docs.');

    let template = null;
    if (typeof templateId === 'string' && templateId.trim()) {
      try {
        const loaded = await loadTemplate(templateId.trim(), typeof templateHash === 'string' ? templateHash : undefined);
        template = loaded.template;
      } catch {
        // Nếu không tải được template, tiếp tục ở chế độ hợp đồng riêng
      }
    }

    const result = await inspectGoogleDoc(url.trim(), template, Boolean(isCustomDoc));

    return NextResponse.json({
      success: true,
      actor: { id: actor.id, name: actor.name },
      ...result,
    });
  } catch (error) {
    return failure(error);
  }
}
