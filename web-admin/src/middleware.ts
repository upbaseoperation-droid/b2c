import { type NextRequest, NextResponse } from "next/server";
import { decodeSessionToken, encodeSessionToken, SESSION_COOKIE_NAME, sanitizeReturnTo } from "@/lib/larkAuth";
import { USERS } from "@/lib/mockData";
import { updateSession } from "@/utils/supabase/middleware";

export const runtime = 'nodejs';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Cho phép truy cập trang login và các API xác thực auth, static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/login' ||
    pathname === '/icon.png' ||
    pathname === '/favicon.ico'
  ) {
    return await updateSession(request);
  }

  // 2. Kiểm tra phiên đăng nhập được ký HMAC
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = sessionCookie ? decodeSessionToken(sessionCookie) : null;

  // 3. Nếu chưa có phiên: Tự động cấp phiên Quản trị BOD mặc định (không bắt buộc đăng nhập Lark/Gmail)
  if (!user) {
    const defaultUser = USERS[0];
    const defaultToken = encodeSessionToken(defaultUser);

    const response = await updateSession(request);
    response.cookies.set(SESSION_COOKIE_NAME, defaultToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });
    return response;
  }

  return await updateSession(request);
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
