import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/contracts/access';
import { ContractError, requireCondition } from '@/lib/contracts/domain';
import { extractGoogleDocId } from '@/lib/contracts/googleDocsService';
import { fetchGoogleDocComments, readGoogleDocContent } from '@/lib/contracts/googleDocsServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function failure(error: unknown) {
  return NextResponse.json(
    { error: error instanceof ContractError ? error.message : 'Không đọc được Google Doc.' },
    { status: error instanceof ContractError ? error.status : 500, headers: { 'Cache-Control': 'no-store' } },
  );
}

/** Kiểm tra máy chủ đọc được một Google Doc hay chưa (tên file, số bình luận), không so với mẫu. */
export async function POST(req: NextRequest) {
  try {
    const actor = actorFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const docId = typeof body.url === 'string' ? extractGoogleDocId(body.url) : null;
    requireCondition(docId, 'Đường dẫn Google Docs không hợp lệ. Vui lòng kiểm tra lại link.');
    const content = await readGoogleDocContent(docId, () => []);
    const { comments } = await fetchGoogleDocComments(docId);
    return NextResponse.json({
      success: true,
      actor: { id: actor.id, name: actor.name },
      docId,
      docUrl: `https://docs.google.com/document/d/${docId}/edit`,
      title: content.title,
      commentsCount: comments.length,
      simulated: content.simulated,
    });
  } catch (error) {
    return failure(error);
  }
}
