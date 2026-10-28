import { NextRequest, NextResponse } from 'next/server';
import {
  sendZaloMessage,
  processZaloWebhookEvent,
  type ZaloGroupRole,
} from '@/lib/server/zaloBot';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const action = String(body?.action || 'SEND_MESSAGE').toUpperCase();

    if (action === 'SIMULATE_COMMAND') {
      const commandText = String(body?.command || '').trim();
      const chatId = String(body?.chatId || 'zalo_grp_b2c_internal_ops').trim();
      const groupRole = (body?.groupRole || 'INTERNAL_OPS') as ZaloGroupRole;
      const sendToZalo = Boolean(body?.sendToZalo);

      if (!commandText) {
        return NextResponse.json(
          { ok: false, error: 'Vui lòng nhập câu lệnh cần thực thi.' },
          { status: 400 }
        );
      }

      const simulatedPayload = {
        event_name: 'message.text.received',
        result: {
          message: {
            chat: { id: chatId, chat_type: 'GROUP' },
            from: { id: 'web_admin_operator', display_name: 'Điều hành Web-Admin' },
            text: commandText,
          },
        },
      };

      const result = await processZaloWebhookEvent(simulatedPayload, {
        skipSendToZalo: !sendToZalo,
        overrideGroupRole: groupRole,
      });

      return NextResponse.json({
        ok: true,
        handled: result.handled,
        reply: result.reply || 'Lệnh đã được xử lý.',
        holdingScreenshotUrl: result.holdingScreenshotUrl,
        holdingMomentSec: result.holdingMomentSec,
        holdingMomentTimeLabel: result.holdingMomentTimeLabel,
        holdingMomentQuote: result.holdingMomentQuote,
        sentToZalo: sendToZalo,
      });
    }

    const chatId = String(body?.chatId || '').trim();
    const text = String(body?.text || '').trim();

    if (!chatId || !text) {
      return NextResponse.json(
        { ok: false, error: 'Thiếu chatId hoặc nội dung tin nhắn text.' },
        { status: 400 }
      );
    }

    const success = await sendZaloMessage(chatId, text);
    if (!success) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Không thể gửi tin tới Chat ID này trên Zalo Server (hãy kiểm tra Chat ID thực tế từ mục Nhật ký Webhook sau khi nhắn tin trong nhóm).',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, message: 'Đã gửi tin nhắn thành công.' });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Lỗi xử lý gửi tin.' },
      { status: 500 }
    );
  }
}
