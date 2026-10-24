import { NextRequest, NextResponse } from 'next/server';
import { kalodataClient } from '@/lib/kalodata/client';
import { getAuthenticatedUser } from '@/lib/larkAuth';

export async function GET(request: NextRequest) {
  const user = getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized: Vui lòng đăng nhập để kiểm tra trạng thái Kalodata.' },
      { status: 401 }
    );
  }

  try {
    const status = kalodataClient.getConnectionStatus();
    return NextResponse.json({
      success: true,
      data: status
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi khi kiểm tra trạng thái kết nối Kalodata',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
