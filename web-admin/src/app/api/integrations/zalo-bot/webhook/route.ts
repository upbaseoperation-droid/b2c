import { NextRequest, NextResponse } from 'next/server';
import {
  getZaloBotSecretToken,
  processZaloWebhookEvent,
  getDebugEvents,
  recordDebugEvent,
  captureTikTokProductFrameBuffer,
} from '@/lib/server/zaloBot';
import {
  getVnCartBridgeState,
  saveVnCartBridgeResolvedItems,
  type VnCartBridgeItem,
} from '@/lib/linkAirCheckServer';

export const dynamic = 'force-dynamic';
export const preferredRegion = ['sin1', 'hkg1'];

/**
 * GET /api/integrations/zalo-bot/webhook
 * Health check, Debug inspector & Public Frame Image endpoint (?frame=1) cho Zalo Bot sendPhoto
 */
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('vnBridgePoll') === '1') {
    const configuredSecret = getZaloBotSecretToken();
    const incomingSecret =
      req.headers.get('x-bot-api-secret-token') ||
      req.headers.get('X-Bot-Api-Secret-Token');
    if (incomingSecret !== configuredSecret) {
      return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 403 });
    }
    const vnBridgeUrl = req.nextUrl.searchParams.get('vnBridgeUrl') || undefined;
    const state = await getVnCartBridgeState(vnBridgeUrl);
    return NextResponse.json({
      ok: true,
      pending: Object.values(state.pending || {}),
      cachedCount: Object.keys(state.items || {}).length,
    });
  }

  const isFrameRequest = req.nextUrl.searchParams.get('frame') === '1';
  if (isFrameRequest) {
    const sp = req.nextUrl.searchParams;
    const decodeParam = (raw: string | null): string | undefined => {
      if (!raw) return undefined;
      let cur = raw.trim();
      for (let i = 0; i < 3 && /%[0-9A-Fa-f]{2}/.test(cur); i++) {
        try {
          const next = decodeURIComponent(cur);
          if (next === cur) break;
          cur = next;
        } catch {
          break;
        }
      }
      return cur || undefined;
    };

    let b64Data: {
      v?: string;
      c?: string;
      s?: number;
      m?: Record<string, any>;
    } | null = null;
    const rawB64 = sp.get('b64');
    if (rawB64) {
      try {
        b64Data = JSON.parse(Buffer.from(rawB64, 'base64url').toString('utf8'));
      } catch {
        b64Data = null;
      }
    }

    const frameId = decodeParam(sp.get('frameId'));
    const videoUrl = b64Data?.v || decodeParam(sp.get('videoUrl')) || '';
    const sec = Number(b64Data?.s ?? sp.get('sec') ?? 3.5);
    const coverUrl = b64Data?.c || decodeParam(sp.get('coverUrl'));
    const viewsRaw = sp.get('views');
    const msecRaw = sp.get('msec');
    const tagsRaw = decodeParam(sp.get('tags'));

    const overlayMeta = {
      kocHandle: b64Data?.m?.kocHandle || decodeParam(sp.get('handle')),
      kocName: b64Data?.m?.kocName || decodeParam(sp.get('name')),
      caption: b64Data?.m?.caption || decodeParam(sp.get('cap')),
      timeLabel: decodeParam(sp.get('tl')),
      airedAt: b64Data?.m?.airedAt || decodeParam(sp.get('air')),
      views: viewsRaw ? Number(viewsRaw) : null,
      likes: b64Data?.m?.likes ?? (sp.get('likes') ? Number(sp.get('likes')) : null),
      comments: b64Data?.m?.comments ?? (sp.get('cmt') ? Number(sp.get('cmt')) : null),
      shares: b64Data?.m?.shares ?? (sp.get('shr') ? Number(sp.get('shr')) : null),
      saves: b64Data?.m?.saves ?? (sp.get('sav') ? Number(sp.get('sav')) : null),
      durationSeconds: b64Data?.m?.durationSeconds ?? (sp.get('dur') ? Number(sp.get('dur')) : null),
      productTitle: b64Data?.m?.productTitle || decodeParam(sp.get('title')),
      productId: b64Data?.m?.productId || decodeParam(sp.get('pid')),
      hashtags: b64Data?.m?.hashtags || tagsRaw,
      quote: decodeParam(sp.get('quote')),
      mentionSec: msecRaw ? Number(msecRaw) : null,
    };

    if (videoUrl || frameId || coverUrl) {
      const captured = await captureTikTokProductFrameBuffer({
        videoUrl,
        coverUrl,
        captureSec: Number.isFinite(sec) ? sec : 3.5,
        frameId,
        overlayMeta,
      });
      if (captured.buffer && captured.buffer.length > 300) {
        const isPng = captured.buffer[0] === 0x89 && captured.buffer[1] === 0x50;
        const ext = isPng ? 'png' : 'jpg';
        return new NextResponse(new Uint8Array(captured.buffer), {
          status: 200,
          headers: {
            'Content-Type': isPng ? 'image/png' : 'image/jpeg',
            'Content-Length': String(captured.buffer.length),
            'Content-Disposition': `inline; filename="tiktok-air-check.${ext}"`,
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

export async function HEAD(req: NextRequest) {
  return GET(req);
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

    if (body.vnBridgeResolve === true) {
      const items = (Array.isArray(body.items) ? body.items : []) as VnCartBridgeItem[];
      await saveVnCartBridgeResolvedItems(items, body.vnBridgeUrl);
      return NextResponse.json({ ok: true, saved: items.length });
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
