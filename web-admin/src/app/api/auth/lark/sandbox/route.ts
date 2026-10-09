import { NextRequest, NextResponse } from 'next/server';
import { USERS } from '@/lib/mockData';
import { encodeSessionToken, SESSION_COOKIE_NAME, sanitizeReturnTo } from '@/lib/larkAuth';

export const dynamic = 'force-dynamic';

const isSandboxAllowed = () => {
  return process.env.ALLOW_SANDBOX_LOGIN === 'true' || process.env.NODE_ENV !== 'production';
};

/**
 * POST /api/auth/lark/sandbox
 * Chỉ cho phép trong môi trường phát triển (development/sandbox).
 * Yêu cầu gửi userId hợp lệ đã đăng ký trong hệ thống, không tự ý cấp quyền Admin mặc định.
 */
export async function POST(request: NextRequest) {
  if (!isSandboxAllowed()) {
    return NextResponse.json(
      { success: false, error: 'Chế độ Sandbox bị vô hiệu hóa trong môi trường này.' },
      { status: 403 }
    );
  }

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
 * GET /api/auth/lark/sandbox
 * Vô hiệu hóa phương thức GET để ngăn chặn việc cấp session tự động qua liên kết hoặc tấn công CSRF.
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(
    { 
      success: false, 
      error: 'Phương thức GET bị vô hiệu hóa vì lý do bảo mật. Vui lòng đăng nhập qua giao diện người dùng chính thức.' 
    },
    { status: 405 }
  );
}
