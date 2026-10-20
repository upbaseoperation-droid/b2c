import { NextRequest, NextResponse } from 'next/server';
import { requestActor } from '@/lib/server/requestActor';
import { RecordError } from '@/lib/server/sharedRecords';
import { canManageStorePics, readStorePics, saveStorePics, visibleStorePics } from '@/lib/server/storePicStore';
import type { StorePic } from '@/lib/storePics';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store' };
function failure(e: unknown) { return NextResponse.json({ error: e instanceof RecordError ? e.message : 'Không tải/lưu được danh sách PIC gian hàng.' }, { status: e instanceof RecordError ? e.status : 503, headers }); }

export async function GET(req: NextRequest) {
  try {
    const user = await requestActor(req);
    if (!user || user.partnerType) throw new RecordError('Phiên không còn quyền truy cập.', 401);
    const [record, canManage] = await Promise.all([readStorePics(), canManageStorePics(user)]);
    return NextResponse.json({ revision: record.revision, data: visibleStorePics(record.data, user, canManage), canManage }, { headers });
  } catch (e) { return failure(e); }
}

/** Body: { revision, storeId, pics: [{ email, name }] } — thay toàn bộ danh sách PIC của một gian. */
export async function PUT(req: NextRequest) {
  try {
    if (req.headers.get('origin') !== req.nextUrl.origin) throw new RecordError('Yêu cầu không xuất phát từ ứng dụng.', 403);
    const user = await requestActor(req);
    if (!user || user.partnerType) throw new RecordError('Phiên không còn quyền truy cập.', 401);
    const raw = await req.text();
    if (Buffer.byteLength(raw) > 200_000) throw new RecordError('Dữ liệu quá lớn.', 413);
    let parsed: { revision: number; storeId: string; pics: StorePic[] };
    try { parsed = JSON.parse(raw); } catch { throw new RecordError('Dữ liệu JSON không hợp lệ.'); }
    if (typeof parsed?.storeId !== 'string') throw new RecordError('Thiếu gian hàng.');
    const result = await saveStorePics(user, parsed.revision, parsed.storeId, parsed.pics);
    return NextResponse.json({ revision: result.revision, data: result.data, canManage: true }, { headers });
  } catch (e) { return failure(e); }
}
