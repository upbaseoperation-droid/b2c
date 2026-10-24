import { NextRequest, NextResponse } from 'next/server';
import { kalodataClient } from '@/lib/kalodata/client';
import { KalodataPeriod, KalodataSyncPayload } from '@/lib/kalodata/types';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/larkAuth';

export async function POST(request: NextRequest) {
  const user = getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized: Vui lòng đăng nhập để đồng bộ dữ liệu Kalodata.' },
      { status: 401 }
    );
  }
  if (user.partnerType || user.role.endsWith('_PARTNER')) {
    return NextResponse.json(
      { success: false, message: 'Tài khoản đối tác không có quyền đồng bộ dữ liệu Kalodata.' },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as KalodataSyncPayload;
    const { kocId, channelId, period = '30d' } = body;

    if (!channelId || channelId.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          message: 'Thiếu thông tin kênh TikTok (channelId) để thực hiện đồng bộ.'
        },
        { status: 400 }
      );
    }

    const detail = await kalodataClient.getCreatorDetail(channelId, period as KalodataPeriod);
    const syncResult = kalodataClient.buildKocSyncResult(detail);

    // Nếu có kocId và database Prisma sẵn sàng, tiến hành cập nhật vào database
    let dbUpdated = false;
    if (kocId && prisma) {
      try {
        await prisma.kocProfile.update({
          where: { id: kocId },
          data: {
            followersCount: detail.profile.followers,
            avgViews: detail.metrics.avgViews,
            // Cập nhật các trường thương mại nếu có trong schema
            updatedAt: new Date()
          }
        });
        dbUpdated = true;
      } catch {
        // Nếu không tìm thấy bằng id, thử tìm bằng channelId
        try {
          const clean = channelId.trim().toLowerCase().replace('@', '');
          await prisma.kocProfile.updateMany({
            where: { channelId: { contains: clean, mode: 'insensitive' } },
            data: {
              followersCount: detail.profile.followers,
              avgViews: detail.metrics.avgViews,
              updatedAt: new Date()
            }
          });
          dbUpdated = true;
        } catch (innerErr) {
          // Ghi nhận nhưng không chặn phản hồi cho client
          console.warn('[Kalodata Sync] Bỏ qua cập nhật database (sẽ cập nhật trạng thái trên giao diện):', innerErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã lấy dữ liệu thương mại kênh @${detail.profile.handle} từ Kalodata thành công`,
      data: detail,
      updates: syncResult.suggestedUpdates,
      dbUpdated
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi trong quá trình đồng bộ số liệu từ Kalodata',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
