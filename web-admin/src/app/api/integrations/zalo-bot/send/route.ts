import { NextRequest, NextResponse } from 'next/server';
import { sendZaloMessage } from '@/lib/server/zaloBot';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
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
        { ok: false, error: 'Không thể gửi tin nhắn qua Zalo Bot API.' },
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
