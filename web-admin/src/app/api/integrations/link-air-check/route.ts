import { NextRequest, NextResponse } from 'next/server';
import { splitLinkInput, type LinkAirExpectation, type LinkAirResult } from '../../../../lib/linkAirCheck';
import { checkSingleLinkServerless } from '../../../../lib/linkAirCheckServer';

export const dynamic = 'force-dynamic';

interface RequestPayload {
  links?: string[] | string;
  expect?: LinkAirExpectation;
  items?: Array<{ url: string; expect?: LinkAirExpectation }>;
}

/**
 * POST /api/integrations/link-air-check
 * Chuyển yêu cầu kiểm tra link air sang crawler-worker nếu đã cấu hình CRAWLER_WORKER_URL;
 * tự động fallback sang bộ kiểm tra tích hợp sẵn trong web-admin khi chưa bật worker riêng.
 */
export async function POST(req: NextRequest) {
  let body: RequestPayload;
  try {
    body = (await req.json()) as RequestPayload;
  } catch {
    return NextResponse.json(
      { success: false, error: 'INVALID_JSON', message: 'Dữ liệu gửi lên không hợp lệ.' },
      { status: 400 }
    );
  }

  const workerUrl = process.env.CRAWLER_WORKER_URL?.trim().replace(/\/+$/, '');
  if (workerUrl) {
    try {
      const res = await fetch(`${workerUrl}/v1/links/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.CRAWLER_WORKER_TOKEN
            ? { Authorization: `Bearer ${process.env.CRAWLER_WORKER_TOKEN}` }
            : {}),
        },
        body: JSON.stringify(body),
        cache: 'no-store',
        signal: AbortSignal.timeout(170_000),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data) {
        return NextResponse.json(data, { status: res.status });
      }
    } catch {
      // Nếu crawler-worker không kết nối được, tự động chuyển sang bộ kiểm tra tích hợp sẵn bên dưới
    }
  }

  const defaultExpect: LinkAirExpectation = body?.expect || {};
  const checkItems: Array<{ url: string; expect: LinkAirExpectation }> = [];

  if (Array.isArray(body?.items) && body.items.length > 0) {
    for (const item of body.items) {
      if (item?.url && typeof item.url === 'string') {
        checkItems.push({ url: item.url.trim(), expect: item.expect || defaultExpect });
      }
    }
  } else if (body?.links) {
    const rawLinks = Array.isArray(body.links)
      ? body.links.map((s) => String(s).trim()).filter(Boolean)
      : splitLinkInput(String(body.links));
    for (const url of rawLinks) {
      checkItems.push({ url, expect: defaultExpect });
    }
  }

  if (checkItems.length === 0) {
    return NextResponse.json(
      { success: false, error: 'EMPTY_LINKS', message: 'Vui lòng nhập ít nhất 1 link cần kiểm tra.' },
      { status: 400 }
    );
  }

  const cappedItems = checkItems.slice(0, 100);
  const results: LinkAirResult[] = [];
  const batchSize = 6;
  for (let i = 0; i < cappedItems.length; i += batchSize) {
    const batch = cappedItems.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((item) => checkSingleLinkServerless(item.url, item.expect))
    );
    results.push(...batchResults);
  }

  const summary = {
    total: results.length,
    pass: results.filter((r) => r.verdict === 'PASS').length,
    review: results.filter((r) => r.verdict === 'REVIEW').length,
    fail: results.filter((r) => r.verdict === 'FAIL').length,
  };

  return NextResponse.json({
    success: true,
    summary,
    results,
  });
}
