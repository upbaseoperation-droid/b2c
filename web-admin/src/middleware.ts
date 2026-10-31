import { effectiveUser } from '@/lib/server/accessPolicy';
import { type NextRequest, NextResponse } from "next/server";
import { decodeSessionToken, encodeSessionToken, SESSION_COOKIE_NAME, sanitizeReturnTo } from "@/lib/larkAuth";
import { USERS } from "@/lib/mockData";

export const runtime = 'nodejs';

function forwardNext(request: NextRequest) {
  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Job đồng bộ tự xác thực bearer secret tại route, không dùng phiên người dùng.
  if (
    pathname === '/api/contracts/integrations/wesign/sync' ||
    pathname.startsWith('/api/integrations/zalo-bot/webhook')
  ) {
    return NextResponse.next();
  }

  // 1. Cho phép truy cập trang login và các API xác thực auth, static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/login' ||
    pathname === '/icon.png' ||
    pathname === '/favicon.ico'
  ) {
    return forwardNext(request);
  }

  // 2. Kiểm tra phiên đăng nhập được ký HMAC
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = sessionCookie ? decodeSessionToken(sessionCookie) : null;

  // 3. Nếu chưa có phiên: Tự động cấp phiên Quản trị BOD mặc định (không bắt buộc đăng nhập Lark/Gmail)
  if (!user) {
    if (process.env.NODE_ENV === 'production') {
      if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Vui lòng đăng nhập.' }, { status: 401 });
      const login = new URL('/login', request.url);
      login.searchParams.set('returnTo', sanitizeReturnTo(pathname + request.nextUrl.search));
      return NextResponse.redirect(login);
    }
    const defaultUser = USERS[0];
    const defaultToken = encodeSessionToken(defaultUser);

    const response = forwardNext(request);
    const isHttps = request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
    response.cookies.set(SESSION_COOKIE_NAME, defaultToken, {
      httpOnly: true,
      secure: (process.env.NODE_ENV as string) === 'production' && isHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });
    return response;
  }

  try {
    const actor = await effectiveUser(user);
    if (!actor) return NextResponse.json({ error: 'Quyền truy cập đã bị thu hồi.' }, { status: 403 });
    // Forward the current server policy to legacy handlers that read the signed session synchronously.
    if (JSON.stringify(actor) !== JSON.stringify(user)) request.cookies.set(SESSION_COOKIE_NAME, encodeSessionToken(actor));
  } catch { return NextResponse.json({ error: 'Không kiểm tra được quyền. Thử lại sau.' }, { status: 503 }); }
  return forwardNext(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
