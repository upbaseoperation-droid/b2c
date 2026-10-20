import { NextRequest, NextResponse } from 'next/server';
import { requestActor } from '@/lib/server/requestActor';
import { RecordError } from '@/lib/server/sharedRecords';
import {
  applyAssignmentCommand,
  canManageAssignments,
  readStoreAssignments,
  visibleAssignments,
  type AssignmentCommand,
} from '@/lib/server/storeAssignmentStore';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store' };
function failure(e: unknown) { return NextResponse.json({ error: e instanceof RecordError ? e.message : 'Không tải/lưu được phân công gian hàng.' }, { status: e instanceof RecordError ? e.status : 503, headers }); }

export async function GET(req: NextRequest) {
  try {
    const user = await requestActor(req);
    if (!user || user.partnerType) throw new RecordError('Phiên không còn quyền truy cập.', 401);
    const [record, canManage] = await Promise.all([readStoreAssignments(), canManageAssignments(user)]);
    return NextResponse.json({ revision: record.revision, data: visibleAssignments(record.data, user, canManage), canManage }, { headers });
  } catch (e) { return failure(e); }
}

/** Body: { revision, command: { action: 'saveDraft' | 'lock' | 'handover', ... } } */
export async function POST(req: NextRequest) {
  try {
    if (req.headers.get('origin') !== req.nextUrl.origin) throw new RecordError('Yêu cầu không xuất phát từ ứng dụng.', 403);
    const user = await requestActor(req);
    if (!user || user.partnerType) throw new RecordError('Phiên không còn quyền truy cập.', 401);
    const raw = await req.text();
    if (Buffer.byteLength(raw) > 2_000_000) throw new RecordError('Dữ liệu quá lớn.', 413);
    let parsed: { revision: number; command: AssignmentCommand };
    try { parsed = JSON.parse(raw); } catch { throw new RecordError('Dữ liệu JSON không hợp lệ.'); }
    if (!parsed?.command?.action) throw new RecordError('Thiếu thao tác.');
    const result = await applyAssignmentCommand(user, parsed.revision, parsed.command);
    return NextResponse.json({ revision: result.revision, data: result.data, canManage: true }, { headers });
  } catch (e) { return failure(e); }
}
