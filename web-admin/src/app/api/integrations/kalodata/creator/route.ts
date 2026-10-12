import { NextRequest, NextResponse } from 'next/server';
import { kalodataClient } from '@/lib/kalodata/client';
import { KalodataPeriod } from '@/lib/kalodata/types';

export async function GET(request: NextRequest) {
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
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi trong quá trình tra cứu dữ liệu Creator từ Kalodata',
        error: error.message
      },
      { status: 500 }
    );
  }
}
