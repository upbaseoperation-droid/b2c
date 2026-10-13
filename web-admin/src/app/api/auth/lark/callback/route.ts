import { NextRequest, NextResponse } from 'next/server';
import { 
  exchangeLarkCodeForUser, 
  resolveUserProfile, 
  encodeSessionToken, 
  SESSION_COOKIE_NAME,
  sanitizeReturnTo
} from '@/lib/larkAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const stateRaw = searchParams.get('state');
  const error = searchParams.get('error');

  const appBaseUrl = request.nextUrl.origin;

  if (error || !code) {
    console.error('[Lark SSO Callback Error]:', error || 'No authorization code received');
    const redirectUrl = new URL('/login', appBaseUrl);
    redirectUrl.searchParams.set('error', error || 'missing_code');
    return NextResponse.redirect(redirectUrl);
  }

  // Parse state & CSRF verification
  let returnTo = '/';
  if (stateRaw) {
    try {
      const stateObj = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8'));
      if (stateObj.returnTo) {
        returnTo = sanitizeReturnTo(stateObj.returnTo);
      }
      const savedCsrf = request.cookies.get('lark_oauth_state')?.value;
      if (!savedCsrf || !stateObj.csrf || savedCsrf !== stateObj.csrf) return NextResponse.redirect(new URL('/login?error=invalid_state', appBaseUrl));
    } catch (e) {
      return NextResponse.redirect(new URL('/login?error=invalid_state', appBaseUrl));
    }
  } else return NextResponse.redirect(new URL('/login?error=missing_state', appBaseUrl));

  try {
    // 1. Đổi code lấy Lark User Profile
    const rawLarkUser = await exchangeLarkCodeForUser(code);
    
    // 2. Map sang UserProfile của hệ thống B2C Ops Hub
    if (process.env.LARK_TENANT_KEY && rawLarkUser.tenant_key !== process.env.LARK_TENANT_KEY) return NextResponse.redirect(new URL('/login?error=tenant_not_allowed', appBaseUrl));
    const userProfile = { ...resolveUserProfile(rawLarkUser), loginProvider: 'LARK' as const, larkTenantKey: rawLarkUser.tenant_key };

    // 3. Mã hóa token phiên làm việc
    const sessionToken = encodeSessionToken(userProfile);

    // 4. Chuyển hướng về trang đích và set cookie session
    const destinationUrl = new URL(sanitizeReturnTo(returnTo), appBaseUrl);
    const response = NextResponse.redirect(destinationUrl);

    // Set cookie bảo mật cho phiên đăng nhập
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 ngày
    });

    // Xóa cookie CSRF state tạm
    response.cookies.delete('lark_oauth_state');

    return response;
  } catch (err: any) {
    console.error('[Lark SSO Callback Exchange Error]:', err);
    const errorUrl = new URL('/login', appBaseUrl);
    errorUrl.searchParams.set('error', 'exchange_failed');
    errorUrl.searchParams.set('message', err.message || 'Lỗi xác thực với máy chủ Lark');
    return NextResponse.redirect(errorUrl);
  }
}
