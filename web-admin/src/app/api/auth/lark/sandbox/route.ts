import { NextRequest, NextResponse } from 'next/server';
import { USERS } from '@/lib/mockData';
import { encodeSessionToken, SESSION_COOKIE_NAME, sanitizeReturnTo } from '@/lib/larkAuth';

export const dynamic = 'force-dynamic';

const isSandboxAllowed = () => {
  return true; // Cho phép chuyển đổi vai trò và đăng nhập trực tiếp không cần Lark/Gmail trên mọi môi trường
};

/**
 * POST /api/auth/lark/sandbox
 * Cho phép chuyển đổi vai trò và đăng nhập trực tiếp nhanh chóng mà không cần Lark/Gmail.
 * Yêu cầu gửi userId hợp lệ đã đăng ký trong hệ thống.
 */
export async function POST(request: NextRequest) {

  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Thiếu userId hợp lệ để đăng nhập sandbox.' },
        { status: 400 }
      );
    }

    const targetUser = USERS.find(u => u.id === userId);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy tài khoản nhân sự với ID đã cung cấp.' },
        { status: 404 }
      );
    }

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

/**
 * GET /api/auth/lark/sandbox?userId=...&returnTo=...
 * Cho phép đăng nhập nhanh trực tiếp qua URL mà không cần đăng nhập Lark/Gmail.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const userId = searchParams.get('userId') || USERS[0].id;
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo') || '/');

  const targetUser = USERS.find(u => u.id === userId) || USERS[0];
  const sessionUser = {
    ...targetUser,
    larkOpenId: `ou_sandbox_${targetUser.id}`,
    larkAvatarUrl: undefined
  };

  const token = encodeSessionToken(sessionUser);
  const redirectUrl = new URL(returnTo, request.url);
  const response = NextResponse.redirect(redirectUrl);

  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 // 7 ngày
  });

  return response;
}
