import { NextRequest, NextResponse } from 'next/server';
import { getLarkConfig, buildLarkAuthUrl, sanitizeReturnTo } from '@/lib/larkAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const config = getLarkConfig();
  const searchParams = request.nextUrl.searchParams;
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'));

  if (!config.isConfigured) {
    // Nếu chưa cấu hình App ID & App Secret trong .env, chuyển hướng về trang login với cảnh báo
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'lark_not_configured');
    loginUrl.searchParams.set('returnTo', returnTo);
    return NextResponse.redirect(loginUrl);
  }

  // Tạo CSRF State ngẫu nhiên kết hợp với returnTo
  const statePayload = {
    csrf: Math.random().toString(36).substring(2, 15),
    returnTo
  };
  const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url');

  const authUrl = buildLarkAuthUrl(state);
  const response = NextResponse.redirect(authUrl);

  // Lưu state vào cookie tạm (thời hạn 10 phút) để chống tấn công CSRF
  response.cookies.set('lark_oauth_state', statePayload.csrf, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600
  });

  return response;
}
