import { NextRequest, NextResponse } from 'next/server';
import {
  getZaloBotSecretToken,
  processZaloWebhookEvent,
  getDebugEvents,
  recordDebugEvent,
  captureTikTokProductFrameBuffer,
} from '@/lib/server/zaloBot';

export const dynamic = 'force-dynamic';
export const preferredRegion = ['sin1', 'hkg1'];

/**
 * GET /api/integrations/zalo-bot/webhook
 * Health check, Debug inspector & Public Frame Image endpoint (?frame=1) cho Zalo Bot sendPhoto
 */
export async function GET(req: NextRequest) {
  const isFrameRequest = req.nextUrl.searchParams.get('frame') === '1';
  if (isFrameRequest) {
    const frameId = req.nextUrl.searchParams.get('frameId') || undefined;
    const videoUrl = req.nextUrl.searchParams.get('videoUrl') || '';
    const sec = Number(req.nextUrl.searchParams.get('sec') || 3.5);
    const coverUrl = req.nextUrl.searchParams.get('coverUrl') || undefined;

    if (videoUrl || frameId || coverUrl) {
      const captured = await captureTikTokProductFrameBuffer({
        videoUrl,
        coverUrl,
        captureSec: Number.isFinite(sec) ? sec : 3.5,
        frameId,
      });
      if (captured.buffer && captured.buffer.length > 300) {
        return new NextResponse(new Uint8Array(captured.buffer), {
          status: 200,
          headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          },
        });
      }
      const redirectTarget = captured.resolvedCoverUrl || coverUrl;
      if (redirectTarget && /^https?:\/\//i.test(redirectTarget)) {
        return NextResponse.redirect(redirectTarget, 302);
      }
    }
    return new NextResponse('Frame not found', { status: 404 });
  }

  const isDebug = req.nextUrl.searchParams.get('debug') === 'true';

  return NextResponse.json({
    ok: true,
    status: 'online',
    service: 'Upbase B2C Zalo Bot Webhook',
    timestamp: new Date().toISOString(),
    ...(isDebug ? { recentEvents: getDebugEvents() } : {}),
  });
}

/**
 * POST /api/integrations/zalo-bot/webhook
 * Nhận sự kiện tin nhắn từ Zalo Bot Server
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Kiểm tra xác thực Secret Token
    const configuredSecret = getZaloBotSecretToken();
    const incomingSecret =
      req.headers.get('x-bot-api-secret-token') ||
      req.headers.get('X-Bot-Api-Secret-Token');

    // Đã đặt ZALO_BOT_SECRET_TOKEN: bắt buộc header khớp (thiếu header cũng từ chối), vì webhook ghi được dữ liệu việc của CTV.
    // Chưa đặt: giữ cách cũ (chỉ chặn khi header có mà sai) để không làm gián đoạn bot đang chạy.
    const strictSecret = Boolean(process.env.ZALO_BOT_SECRET_TOKEN?.trim());
    const secretRejected = strictSecret ? incomingSecret !== configuredSecret : Boolean(incomingSecret && incomingSecret !== configuredSecret);
    if (secretRejected) {
      console.warn('[ZaloBot] Từ chối webhook: secret token thiếu hoặc không khớp.');
      recordDebugEvent({
        time: new Date().toISOString(),
        body: null,
        error: incomingSecret ? 'Secret token không khớp.' : 'Thiếu secret token.',
      });
      return NextResponse.json({ error: 'UNAUTHORIZED_SECRET_TOKEN' }, { status: 403 });
    }

    // 2. Đọc payload
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ ok: false, error: 'INVALID_BODY' }, { status: 400 });
    }

    // 3. Xử lý trực tiếp sự kiện để Vercel Serverless không đóng băng tiến trình trước khi quét xong giỏ hàng TikTok
    await processZaloWebhookEvent(body).catch((err) => {
      console.error('[ZaloBot] Lỗi xử lý event:', err);
      recordDebugEvent({
        time: new Date().toISOString(),
        body,
        error: `processZaloWebhookEvent error: ${err?.message || err}`,
      });
    });

    return NextResponse.json({ ok: true, message: 'Event received' });
  } catch (err: any) {
    console.error('[ZaloBot Webhook Error]:', err);
    return NextResponse.json({ ok: false, error: err?.message || 'INTERNAL_ERROR' }, { status: 500 });
  }
}
