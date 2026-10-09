import { NextRequest, NextResponse } from 'next/server';
import { decodeSessionToken, encodeSessionToken, SESSION_COOKIE_NAME, getLarkConfig } from '@/lib/larkAuth';
import { USERS } from '@/lib/mockData';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const config = getLarkConfig();

  const isStrict = request.nextUrl.searchParams.get('strict') === '1';

  if (sessionCookie) {
    const user = decodeSessionToken(sessionCookie);
    if (user) {
      return NextResponse.json({
        authenticated: true,
        user,
        larkConfigured: config.isConfigured
      });
    }
  }

  if (isStrict) {
    return NextResponse.json({
      authenticated: false,
      user: null,
      larkConfigured: config.isConfigured
    }, { status: 401 });
  }

  // Tự động cấp phiên làm việc Quản trị BOD mặc định nếu chưa đăng nhập hoặc cookie hết hạn
  const defaultUser = USERS[0];
  const token = encodeSessionToken(defaultUser);

  const response = NextResponse.json({
    authenticated: true,
    user: defaultUser,
    isAutoLogin: true,
    larkConfigured: config.isConfigured
  });

  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 // 7 ngày
  });

  return response;
}
