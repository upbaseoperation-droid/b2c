import { NextRequest, NextResponse } from 'next/server';
import { decodeSessionToken, SESSION_COOKIE_NAME, getLarkConfig } from '@/lib/larkAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const config = getLarkConfig();

  if (!sessionCookie) {
    return NextResponse.json({
      authenticated: false,
      user: null,
      larkConfigured: config.isConfigured
    }, { status: 401 });
  }

  const user = decodeSessionToken(sessionCookie);

  if (!user) {
    // Cookie hết hạn hoặc không hợp lệ -> xóa cookie
    const response = NextResponse.json({
      authenticated: false,
      user: null,
      larkConfigured: config.isConfigured
    }, { status: 401 });
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  return NextResponse.json({
    authenticated: true,
    user,
    larkConfigured: config.isConfigured
  });
}
