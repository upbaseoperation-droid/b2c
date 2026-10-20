import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/larkAuth';
import {
  getTikTokSellerDbStatus,
  syncB2cStoresAndTikTokSellerToDb
} from '@/lib/server/tiktokSellerStore';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tiktok-seller/sync
 * Kiểm tra trạng thái các bảng hứng dữ liệu TikTok Seller & 69 Gian hàng B2C trong DB
 */
export async function GET(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Vui lòng đăng nhập.' },
      { status: 401 }
    );
  }

  try {
    const status = await getTikTokSellerDbStatus();
    return NextResponse.json({
      success: true,
      dbStatus: status
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Lỗi khi truy vấn trạng thái DB TikTok Seller.'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tiktok-seller/sync
 * Đồng bộ toàn bộ 69 gian hàng B2C (File 4.1 & 4.1.1), 39 kết nối TikTok Seller,
 * 6 chiến dịch PGM/LGM và danh sách Video Booking (File 3.2) xuống các bảng PostgreSQL.
 */
export async function POST(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Vui lòng đăng nhập.' },
      { status: 401 }
    );
  }

  const allowed = ['ADMIN', 'MANAGER', 'GROWTH_MANAGER', 'MEDIA_MANAGER'].includes(user.role);
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: 'Bạn không có quyền kích hoạt đồng bộ dữ liệu TikTok Seller xuống DB.' },
      { status: 403 }
    );
  }

  try {
    const result = await syncB2cStoresAndTikTokSellerToDb();
    return NextResponse.json({
      success: true,
      syncResult: result
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Lỗi khi đồng bộ dữ liệu TikTok Seller xuống DB.'
      },
      { status: 500 }
    );
  }
}
