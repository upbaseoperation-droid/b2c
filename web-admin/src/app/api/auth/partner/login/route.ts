import { NextRequest, NextResponse } from 'next/server';
import { encodeSessionToken, SESSION_COOKIE_NAME } from '@/lib/larkAuth';
import { 
  INITIAL_THIRD_PARTY_ACCOUNTS, 
  convertPartnerAccountToUserProfile,
  getPartnerLandingTab 
} from '@/lib/thirdPartyAccessData';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, accountId } = body;

    let targetAccount = null;

    if (accountId) {
      targetAccount = INITIAL_THIRD_PARTY_ACCOUNTS.find(a => a.id === accountId);
    } else if (email) {
      targetAccount = INITIAL_THIRD_PARTY_ACCOUNTS.find(
        a => a.gmail.toLowerCase() === email.trim().toLowerCase()
      );
    }

    // Nếu không tìm thấy trong danh sách đã cấp quyền, tạo tài khoản Guest Brand hoặc báo lỗi
    if (!targetAccount) {
      // Cho phép test linh hoạt với bất kỳ email gmail nào nếu người dùng gõ
      if (email && email.toLowerCase().includes('@')) {
        const isKoc = email.toLowerCase().includes('koc') || email.toLowerCase().includes('creator');
        const isCtv = email.toLowerCase().includes('ctv');
        const partnerType: 'BRAND' | 'KOC' | 'CTV' = isKoc ? 'KOC' : isCtv ? 'CTV' : 'BRAND';

        targetAccount = {
          id: `tpa-auto-${Date.now()}`,
          gmail: email.trim().toLowerCase(),
          displayName: email.split('@')[0],
          partnerType,
          linkedEntityId: isKoc ? 'koc-1' : isCtv ? 'ctv-hamy' : 'brand-kutieskin',
          linkedEntityName: isKoc ? 'Mega Uri Review' : isCtv ? 'Hà My Content' : 'Kutieskin Mama & Baby',
          permissions: {
            canApproveDeals: true,
            canReviewScripts: true,
            canViewGmvAndRoas: true,
            canViewFinancials: true,
            canSubmitVideos: true,
            canProvideSparkAds: true,
            canClaimSamples: true
          },
          status: 'ACTIVE' as const,
          lastLoginAt: new Date().toISOString().substring(0, 16).replace('T', ' '),
          loginCount: 1,
          createdAt: new Date().toISOString().substring(0, 10),
          createdBy: 'Gmail OAuth / Self SSO'
        };
      } else {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Email Gmail chưa được cấp quyền trong hệ thống. Vui lòng liên hệ Admin / Trưởng phòng UpBase để được cấp quyền truy cập.' 
          },
          { status: 403 }
        );
      }
    }

    if (targetAccount.status === 'SUSPENDED') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Tài khoản Gmail này đang bị tạm khóa. Vui lòng liên hệ Trưởng phòng Upbase để mở lại quyền truy cập.' 
        },
        { status: 403 }
      );
    }

    const sessionUser = convertPartnerAccountToUserProfile(targetAccount);
    const token = encodeSessionToken(sessionUser);
    const landingTab = getPartnerLandingTab(sessionUser);

    const response = NextResponse.json({
      success: true,
      message: `Đăng nhập thành công với tư cách ${sessionUser.name} (${sessionUser.roleTitle})`,
      user: sessionUser,
      landingTab
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
      { success: false, error: error.message || 'Lỗi xác thực tài khoản Gmail đối tác' },
      { status: 500 }
    );
  }
}
