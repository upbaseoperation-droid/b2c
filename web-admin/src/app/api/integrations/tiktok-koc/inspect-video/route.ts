import { NextRequest, NextResponse } from 'next/server';
import {
  extractCompetitorVideoScriptAndHook,
  inspectTikTokVideoBatch,
  parseTikTokVideoUrls,
  TikTokVideoInspectionResult,
} from '@/lib/tiktokVideoInspector';
import { INITIAL_DEALS } from '@/lib/mockData';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.mode === 'EXTRACT_SCRIPT') {
      const targetUrl = String(body.url || body.videoUrl || '').trim();
      if (!targetUrl) {
        return NextResponse.json(
          {
            success: false,
            error: 'Vui lòng cung cấp đường dẫn video TikTok cần tách lời thoại & Hook.',
          },
          { status: 400 }
        );
      }
      const breakdown = await extractCompetitorVideoScriptAndHook(
        targetUrl,
        body.fallbackContext
      );
      return NextResponse.json({
        success: true,
        mode: 'EXTRACT_SCRIPT',
        breakdown,
      });
    }

    const rawUrls: string | string[] = body.urls || body.url || '';
    const expectedDealCode: string | undefined = body.dealCode;
    const expectedHandle: string | undefined = body.expectedHandle;
    const expectedDeadline: string | undefined = body.expectedDeadline;
    const requiredHashtags: string[] | undefined = body.requiredHashtags;
    const requiredUspKeywords: string[] | undefined = body.requiredUspKeywords;
    const brandName: string | undefined = body.brandName;
    const minDurationSeconds: number | undefined = body.minDurationSeconds;

    const urls = parseTikTokVideoUrls(rawUrls);
    if (urls.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Vui lòng nhập ít nhất 1 đường link video TikTok hợp lệ.',
        },
        { status: 400 }
      );
    }

    const cappedUrls = urls.slice(0, 100);
    const expectedDeal = expectedDealCode
      ? INITIAL_DEALS.find((d) => d.dealCode === expectedDealCode)
      : undefined;

    const results: TikTokVideoInspectionResult[] = await inspectTikTokVideoBatch(
      cappedUrls,
      {
        expectedDeal,
        expectedHandle,
        expectedDeadline,
        requiredHashtags,
        requiredUspKeywords,
        brandName,
        minDurationSeconds,
      },
      INITIAL_DEALS,
      5
    );

    const summary = {
      totalInspected: results.length,
      passedCount: results.filter((r) => r.verdict === 'ĐẠT_CHUẨN').length,
      warningCount: results.filter((r) => r.verdict === 'CẦN_KIỂM_TRA').length,
      failedCount: results.filter((r) => r.verdict === 'KHÔNG_ĐẠT').length,
      onTimeCount: results.filter((r) => r.isOnTime).length,
      lateCount: results.filter((r) => !r.isOnTime).length,
    };

    return NextResponse.json({
      success: true,
      summary,
      data: results,
    });
  } catch (error) {
    console.error('[TikTok Video Inspector API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Không thể kiểm tra link video TikTok lúc này. Vui lòng thử lại.',
      },
      { status: 500 }
    );
  }
}
