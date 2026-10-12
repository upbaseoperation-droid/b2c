import { NextResponse } from 'next/server';
import { kalodataClient } from '@/lib/kalodata/client';

export async function GET() {
  try {
    const status = kalodataClient.getConnectionStatus();
    return NextResponse.json({
      success: true,
      data: status
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi khi kiểm tra trạng thái kết nối Kalodata',
        error: error.message
      },
      { status: 500 }
    );
  }
}
