import { NextRequest, NextResponse } from 'next/server';
import { USERS } from '@/lib/mockData';
import { encodeSessionToken, SESSION_COOKIE_NAME } from '@/lib/larkAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body.userId || USERS[0].id;
    const targetUser = USERS.find(u => u.id === userId) || USERS[0];

    const sessionUser = {
      ...targetUser,
      larkOpenId: `ou_sandbox_${targetUser.id}`,
      larkAvatarUrl: undefined
    };

    const token = encodeSessionToken(sessionUser);

    const response = NextResponse.json({
      success: true,
      message: `Đăng nhập thành công với tài khoản ${sessionUser.name} (${sessionUser.roleTitle})`,
      user: sessionUser
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 ngày
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi đăng nhập sandbox' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId') || USERS[0].id;
  const returnTo = searchParams.get('returnTo') || '/';
  
  const targetUser = USERS.find(u => u.id === userId) || USERS[0];
  const sessionUser = {
    ...targetUser,
    larkOpenId: `ou_sandbox_${targetUser.id}`,
    larkAvatarUrl: undefined
  };

  const token = encodeSessionToken(sessionUser);
  const destination = new URL(returnTo.startsWith('/') ? returnTo : '/', request.nextUrl.origin);
  const response = NextResponse.redirect(destination);

  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60
  });

  return response;
}
