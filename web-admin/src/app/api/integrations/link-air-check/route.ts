import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/integrations/link-air-check
 * Chuyển yêu cầu kiểm tra link air sang crawler-worker (dịch vụ chạy riêng, xem crawler-worker/README.md).
 * Body giữ nguyên định dạng của worker: { links, expect } hoặc { items: [{ url, expect }] }.
 */
export async function POST(req: NextRequest) {
  const workerUrl = process.env.CRAWLER_WORKER_URL?.trim().replace(/\/+$/, '');
  if (!workerUrl) {
    return NextResponse.json(
      {
        success: false,
        error: 'WORKER_NOT_CONFIGURED',
        message: 'Chưa cấu hình dịch vụ kiểm tra link. Khai báo CRAWLER_WORKER_URL trong .env.local rồi khởi động lại.',
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'INVALID_JSON', message: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 });
  }

  try {
    const res = await fetch(`${workerUrl}/v1/links/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.CRAWLER_WORKER_TOKEN ? { Authorization: `Bearer ${process.env.CRAWLER_WORKER_TOKEN}` } : {}),
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      // 100 link × vài giây mỗi link, có hàng đợi theo nền tảng.
      signal: AbortSignal.timeout(170_000),
    });
    const data = await res.json().catch(() => null);
    if (res.status === 401) {
      return NextResponse.json(
        { success: false, error: 'WORKER_UNAUTHORIZED', message: 'Token kết nối dịch vụ kiểm tra link không khớp. Kiểm tra CRAWLER_WORKER_TOKEN.' },
        { status: 502 }
      );
    }
    return NextResponse.json(data ?? { success: false, message: 'Dịch vụ kiểm tra link trả dữ liệu không đọc được.' }, {
      status: data ? res.status : 502,
    });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === 'TimeoutError';
    return NextResponse.json(
      {
        success: false,
        error: timedOut ? 'WORKER_TIMEOUT' : 'WORKER_UNREACHABLE',
        message: timedOut
          ? 'Kiểm tra quá lâu. Chia danh sách thành nhiều lần, mỗi lần ít link hơn.'
          : 'Không kết nối được dịch vụ kiểm tra link. Kiểm tra crawler-worker đã chạy chưa.',
      },
      { status: 503 }
    );
  }
}
