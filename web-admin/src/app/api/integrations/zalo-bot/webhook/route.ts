import { NextRequest, NextResponse } from 'next/server';
import {
  getZaloBotSecretToken,
  processZaloWebhookEvent,
  getDebugEvents,
  recordDebugEvent,
} from '@/lib/server/zaloBot';

export const dynamic = 'force-dynamic';

/**
 * GET /api/integrations/zalo-bot/webhook
 * Health check & Debug inspector endpoint
 */
export async function GET(req: NextRequest) {
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

    if (configuredSecret && incomingSecret && incomingSecret !== configuredSecret) {
      console.warn('[ZaloBot] Secret token mismatch:', { incomingSecret, configuredSecret });
      recordDebugEvent({
        time: new Date().toISOString(),
        body: null,
        error: `Secret token mismatch: incoming=${incomingSecret}`,
      });
      return NextResponse.json({ error: 'UNAUTHORIZED_SECRET_TOKEN' }, { status: 403 });
    }

    // 2. Đọc payload
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ ok: false, error: 'INVALID_BODY' }, { status: 400 });
    }

    // 3. Xử lý sự kiện trong nền
    void processZaloWebhookEvent(body).catch((err) => {
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
