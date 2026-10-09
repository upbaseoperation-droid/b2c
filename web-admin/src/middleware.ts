import { type NextRequest, NextResponse } from "next/server";
import { decodeSessionToken, SESSION_COOKIE_NAME, sanitizeReturnTo } from "@/lib/larkAuth";
import { updateSession } from "@/utils/supabase/middleware";

export const runtime = 'nodejs';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Cho phép truy cập trang login và các API xác thực auth
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/login' ||
    pathname === '/icon.png' ||
    pathname === '/favicon.ico'
  ) {
    // Nếu đã đăng nhập với session hợp lệ mà vào /login -> Chuyển hướng về trang chủ
    if (pathname === '/login') {
      const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
      if (sessionCookie && decodeSessionToken(sessionCookie)) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }
    return await updateSession(request);
  }

  // 2. Kiểm tra phiên đăng nhập được ký HMAC cho tất cả các trang và API còn lại
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = sessionCookie ? decodeSessionToken(sessionCookie) : null;

  if (!user) {
    // Với API nội bộ: Trả về HTTP 401 Unauthorized JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized: Phiên làm việc không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.' },
        { status: 401 }
      );
    }

    // Với giao diện người dùng: Chuyển hướng bắt buộc sang /login kèm returnTo an toàn
    const loginUrl = new URL('/login', request.url);
    const safeReturnTo = sanitizeReturnTo(pathname + request.nextUrl.search);
    if (safeReturnTo && safeReturnTo !== '/') {
      loginUrl.searchParams.set('returnTo', safeReturnTo);
    }
    const response = NextResponse.redirect(loginUrl);
    if (sessionCookie) {
      response.cookies.delete(SESSION_COOKIE_NAME);
    }
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
