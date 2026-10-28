import { NextRequest, NextResponse } from 'next/server';
import {
  getAllMappings,
  setGroupMapping,
  removeGroupMapping,
  type ZaloGroupMapping,
} from '@/lib/server/zaloBot';

export const dynamic = 'force-dynamic';

export async function GET() {
  const mappings = getAllMappings();
  return NextResponse.json({ ok: true, mappings });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const action = String(body?.action || 'LINK').toUpperCase();
    const groupId = String(body?.groupId || '').trim();

    if (!groupId) {
      return NextResponse.json({ ok: false, error: 'Thiếu groupId' }, { status: 400 });
    }

    if (action === 'UNLINK') {
      removeGroupMapping(groupId);
      return NextResponse.json({ ok: true, message: 'Đã hủy liên kết nhóm.' });
    }

    const mapping: ZaloGroupMapping = {
      groupId,
      dealCode: body?.dealCode ? String(body.dealCode).trim() : undefined,
      brandName: body?.brandName ? String(body.brandName).trim() : undefined,
      kocName: body?.kocName ? String(body.kocName).trim() : undefined,
      linkedAt: new Date().toISOString(),
    };

    setGroupMapping(mapping);
    return NextResponse.json({ ok: true, message: 'Đã lưu liên kết nhóm.', mapping });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Lỗi lưu thông tin liên kết.' },
      { status: 500 }
    );
  }
}
