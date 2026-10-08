import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/larkAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: 'Đăng xuất thành công'
  });

  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}

export async function GET(request: NextRequest) {
  const loginUrl = new URL('/login', request.nextUrl.origin);
  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
