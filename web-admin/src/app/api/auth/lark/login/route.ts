import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
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
    csrf: randomBytes(24).toString('base64url'),
    returnTo
  };
  const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url');

  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const requestOrigin =
    forwardedProto && forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : request.nextUrl.origin;

  const authUrl = buildLarkAuthUrl(state, requestOrigin);
  const response = NextResponse.redirect(authUrl);

  const isHttps = request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';

  // Lưu state vào cookie tạm (thời hạn 10 phút) để chống tấn công CSRF
  response.cookies.set('lark_oauth_state', statePayload.csrf, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' && isHttps,
    sameSite: 'lax',
    path: '/',
    maxAge: 600
  });

  return response;
}
