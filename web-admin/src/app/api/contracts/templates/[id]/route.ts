import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/contracts/access';
import { loadTemplate } from '@/lib/contracts/templates';
import { ContractError } from '@/lib/contracts/domain';
export const runtime = 'nodejs';
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try { actorFromRequest(req); const { id } = await context.params; const { template, zip } = await loadTemplate(id);
    if (req.nextUrl.searchParams.get('download') === '1') return new NextResponse(new Uint8Array(await zip.generateAsync({ type: 'nodebuffer' })), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': `attachment; filename="${id}.docx"`, 'Cache-Control': 'private, no-store' } });
    return NextResponse.json({ template }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return NextResponse.json({ error: e instanceof ContractError ? e.message : 'Không đọc được file mẫu. Kiểm tra thư mục pháp chế.' }, { status: e instanceof ContractError ? e.status : 503 }); }
}
