import { NextRequest, NextResponse } from 'next/server';
import { discoverKocSocialChannels } from '@/lib/kocSocialDiscovery';
import { getAuthenticatedUser } from '@/lib/larkAuth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/integrations/tiktok-koc/social-discovery
 * Dò tìm nickname và đường dẫn kênh Shopee, Facebook, Instagram, Threads của KOC
 * để người dùng đối chiếu và xác nhận lưu vào Danh bạ KOC.
 */
export async function POST(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Vui lòng đăng nhập để dò tìm kênh mạng xã hội KOC.' },
      { status: 401 }
    );
  }
  if (user.partnerType || user.role.endsWith('_PARTNER')) {
    return NextResponse.json(
      { success: false, error: 'Tài khoản đối tác không có quyền sử dụng công cụ dò tìm đa kênh.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const tiktokHandle = String(body.tiktokHandle || body.channelId || '').trim();
    const stageName = String(body.stageName || tiktokHandle).trim();
    const realName = body.realName ? String(body.realName).trim() : undefined;
    const phone = body.phone ? String(body.phone).trim() : undefined;
    const niche = body.niche ? String(body.niche).trim() : undefined;
    const bio = body.bio ? String(body.bio).trim() : undefined;
    const kocId = body.kocId ? String(body.kocId).trim() : undefined;
    const llmConfig = body.llmConfig && typeof body.llmConfig === 'object' ? body.llmConfig : undefined;

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
      niche,
      bio,
      llmConfig,
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
