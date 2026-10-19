import { NextRequest, NextResponse } from 'next/server';
import { discoverKocSocialChannels } from '@/lib/kocSocialDiscovery';

export const dynamic = 'force-dynamic';

/**
 * POST /api/integrations/tiktok-koc/social-discovery
 * Dò tìm nickname và đường dẫn kênh Shopee, Facebook, Instagram, Threads của KOC
 * để người dùng đối chiếu và xác nhận lưu vào Danh bạ KOC.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tiktokHandle = String(body.tiktokHandle || body.channelId || '').trim();
    const stageName = String(body.stageName || tiktokHandle).trim();
    const realName = body.realName ? String(body.realName).trim() : undefined;
    const phone = body.phone ? String(body.phone).trim() : undefined;
    const bio = body.bio ? String(body.bio).trim() : undefined;
    const kocId = body.kocId ? String(body.kocId).trim() : undefined;

    if (!tiktokHandle && !stageName) {
      return NextResponse.json(
        {
          success: false,
          message: 'Cần cung cấp tên KOC hoặc @handle TikTok để tìm kiếm kênh mạng xã hội.',
        },
        { status: 400 }
      );
    }

    const data = await discoverKocSocialChannels({
      kocId,
      tiktokHandle,
      stageName,
      realName,
      phone,
      bio,
      existingChannels: body.existingChannels,
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định khi tìm kiếm kênh mạng xã hội.';
    return NextResponse.json(
      {
        success: false,
        message: 'Không thể hoàn tất dò tìm tài khoản mạng xã hội. Vui lòng thử lại.',
        error: message,
      },
      { status: 500 }
    );
  }
}
