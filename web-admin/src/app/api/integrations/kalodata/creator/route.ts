import { NextRequest, NextResponse } from 'next/server';
import { kalodataClient } from '@/lib/kalodata/client';
import { KalodataPeriod } from '@/lib/kalodata/types';
import { getAuthenticatedUser } from '@/lib/larkAuth';

export async function GET(request: NextRequest) {
  const user = getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Vui lòng đăng nhập để tra cứu chi tiết Creator Kalodata.' },
      { status: 401 }
    );
  }
  if (user.partnerType || user.role.endsWith('_PARTNER')) {
    return NextResponse.json(
      { success: false, error: 'Tài khoản đối tác không có quyền tra cứu chi tiết Creator Kalodata.' },
      { status: 403 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const handle = searchParams.get('handle') || searchParams.get('channelId');
    const periodParam = (searchParams.get('period') || '30d') as KalodataPeriod;
    const validPeriods: KalodataPeriod[] = ['7d', '30d', '90d'];
    const period = validPeriods.includes(periodParam) ? periodParam : '30d';

    if (!handle || handle.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          message: 'Vui lòng cung cấp ID kênh TikTok (handle) để tra cứu dữ liệu.'
        },
        { status: 400 }
      );
    }

    const detail = await kalodataClient.getCreatorDetail(handle, period);
    const syncResult = kalodataClient.buildKocSyncResult(detail);

    return NextResponse.json({
      success: true,
      data: detail,
      syncResult
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi trong quá trình tra cứu dữ liệu Creator từ Kalodata',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
