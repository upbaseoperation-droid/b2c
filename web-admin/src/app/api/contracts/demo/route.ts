import { NextRequest, NextResponse } from 'next/server';
import { DEMO_ACTORS, checkOrigin } from '@/lib/contracts/access';
import { ContractError, requireCondition } from '@/lib/contracts/domain';
import { encodeSessionToken, SESSION_COOKIE_NAME } from '@/lib/larkAuth';
export async function POST(req: NextRequest) {
  try {
    requireCondition(process.env.NODE_ENV !== 'production', 'Tài khoản kiểm thử chỉ dùng cục bộ.', 403); checkOrigin(req);
    const body = await req.json(); const actor = DEMO_ACTORS.find(a => a.id === body.id); requireCondition(actor, 'Tài khoản kiểm thử không hợp lệ.');
    const token = encodeSessionToken({ id: actor.id, name: actor.name, email: `${actor.id}@example.invalid`, avatar: 'KT', role: 'BOOKING_MEMBER', roleTitle: actor.name, loginProvider: 'SANDBOX' });
    const response = NextResponse.json({ success: true }); response.cookies.set(SESSION_COOKIE_NAME, token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 3600 }); return response;
  } catch (e) { return NextResponse.json({ error: e instanceof ContractError ? e.message : 'Không thể chuyển tài khoản.' }, { status: e instanceof ContractError ? e.status : 400 }); }
}
