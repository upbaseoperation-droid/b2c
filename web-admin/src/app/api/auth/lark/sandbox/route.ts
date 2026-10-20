import { NextRequest, NextResponse } from 'next/server';
import { USERS } from '@/lib/mockData';
import { UPBASE_STAFF_MASTER } from '@/lib/importedMasterData';
import { classifyMasterStaffMember } from '@/lib/rbacData';
import { readPolicy } from '@/lib/server/accessPolicy';
import { encodeSessionToken, SESSION_COOKIE_NAME, sanitizeReturnTo } from '@/lib/larkAuth';
import { UserProfile } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (process.env.BLOCK_SANDBOX_LOGIN === 'true') {
    return NextResponse.json(
      { success: false, error: 'Chế độ giả lập bị chặn trên môi trường production.' },
      { status: 403 }
    );
  }
  try {
    const body = await request.json();
    const { userId, staffIdentifier, staffOverrides } = body;

    let sessionUser: UserProfile | null = null;

    if (staffIdentifier && typeof staffIdentifier === 'string') {
      const q = staffIdentifier.trim().toLowerCase();

      // Ưu tiên khớp với tài khoản nhân sự cốt lõi đã cấu hình đầy đủ phạm vi Brand/Store trong USERS
      const existingCoreUser = USERS.find(
        u =>
          u.id.toLowerCase() === q ||
          (u.staffCode && u.staffCode.toLowerCase() === q) ||
          u.email.toLowerCase() === q ||
          u.name.toLowerCase() === q
      );

      if (existingCoreUser) {
        if (existingCoreUser.canLogin === false) {
          return NextResponse.json(
            {
              success: false,
              blockedByGatekeeper: true,
              error: `Tài khoản ${existingCoreUser.name} không có quyền đăng nhập vào hệ thống B2C.`
            },
            { status: 403 }
          );
        }

        sessionUser = {
          ...existingCoreUser,
          loginProvider: 'SANDBOX',
          larkOpenId: `ou_sandbox_${existingCoreUser.id}`,
          larkAvatarUrl: undefined
        };
      } else {
        const masterStaff = UPBASE_STAFF_MASTER.find(
          s =>
            s.id.toLowerCase() === q ||
            (s.staffCode && s.staffCode.toLowerCase() === q) ||
            s.email.toLowerCase() === q ||
            s.name.toLowerCase() === q
        );

        if (!masterStaff) {
          return NextResponse.json(
            {
              success: false,
              error: `Không tìm thấy nhân sự "${staffIdentifier}" trong danh bạ 1.011 nhân viên UpBase.`
            },
            { status: 404 }
          );
        }

        const { data: policy } = await readPolicy();
        const classified = classifyMasterStaffMember(
          masterStaff,
          policy.deptRules,
          { ...policy.staffOverrides, ...(staffOverrides || {}) }
        );

        if (!classified.canLogin) {
          return NextResponse.json(
            {
              success: false,
              blockedByGatekeeper: true,
              staffName: masterStaff.name,
              staffCode: masterStaff.staffCode || masterStaff.id,
              department: masterStaff.department || masterStaff.team || 'Phòng ban khác',
              error: `Chặn đăng nhập (403): Nhân sự ${masterStaff.name} (${masterStaff.staffCode}) thuộc phòng "${masterStaff.department || masterStaff.team || 'Khác'}" không thuộc 3 khối được phép vào hệ thống (Marketing B2C, Growth, Media). Chỉ Admin mới có quyền mở khóa ngoại lệ.`
            },
            { status: 403 }
          );
        }

        sessionUser = {
          id: `staff-${masterStaff.id}`,
          name: masterStaff.name,
          email: masterStaff.email,
          role: classified.role,
          roleTitle: `${masterStaff.position || masterStaff.roleTitle} (${masterStaff.department || 'UpBase'})`,
          avatar: masterStaff.avatar || masterStaff.name.slice(0, 2).toUpperCase(),
          staffCode: masterStaff.staffCode || masterStaff.id,
          departmentScope: classified.departmentScope,
          departmentName: masterStaff.department,
          teamName: masterStaff.team,
          managerName: classified.managerName,
          canLogin: true,
          loginProvider: 'SANDBOX',
          larkOpenId: `ou_staff_${masterStaff.id}`
        };
      }
    } else {
      if (!userId || typeof userId !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Thiếu userId hợp lệ để đăng nhập.' },
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

      if (targetUser.canLogin === false) {
        return NextResponse.json(
          {
            success: false,
            blockedByGatekeeper: true,
            error: `Tài khoản ${targetUser.name} không có quyền đăng nhập vào hệ thống B2C.`
          },
          { status: 403 }
        );
      }

      sessionUser = {
        ...targetUser,
        loginProvider: targetUser.loginProvider === 'GMAIL' ? ('GMAIL' as const) : ('SANDBOX' as const),
        larkOpenId: `ou_sandbox_${targetUser.id}`,
        larkAvatarUrl: undefined
      };
    }

    const token = encodeSessionToken(sessionUser);

    const response = NextResponse.json({
      success: true,
      message: `Đăng nhập thành công với tài khoản ${sessionUser.name} (${sessionUser.roleTitle})`,
      user: sessionUser
    });

    const isHttps = request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
    const isSecure = isHttps || (process.env.NODE_ENV === 'production' && !request.nextUrl.hostname.includes('localhost'));
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 ngày
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi đăng nhập' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/lark/sandbox?userId=...&returnTo=...
 * Cho phép đăng nhập nhanh trực tiếp qua URL mà không cần đăng nhập Lark/Gmail.
 */
export async function GET(request: NextRequest) {
  if (process.env.BLOCK_SANDBOX_LOGIN === 'true') {
    return NextResponse.json(
      { success: false, error: 'Chế độ giả lập bị chặn trên môi trường production.' },
      { status: 403 }
    );
  }
  const { searchParams } = request.nextUrl;
  const userId = searchParams.get('userId') || USERS[0].id;
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo') || '/');

  const targetUser = USERS.find(u => u.id === userId) || USERS[0];
  const sessionUser = {
    ...targetUser,
    loginProvider: targetUser.loginProvider === 'GMAIL' ? ('GMAIL' as const) : ('SANDBOX' as const),
    larkOpenId: `ou_sandbox_${targetUser.id}`,
    larkAvatarUrl: undefined
  };

  const token = encodeSessionToken(sessionUser);
  const redirectUrl = new URL(returnTo, request.url);
  const response = NextResponse.redirect(redirectUrl);

  const isHttps = request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
  const isSecure = isHttps || (process.env.NODE_ENV === 'production' && !request.nextUrl.hostname.includes('localhost'));
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 // 7 ngày
  });

  return response;
}

