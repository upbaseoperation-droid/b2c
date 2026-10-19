import { NextRequest, NextResponse } from 'next/server';
import {
  analyzeRawCustomerCommentsToClusters,
  generateBrandMarketResearchDossier,
  inspectCompetitorWebsiteUrl,
  type LiveWebInspectionResult,
} from '@/lib/brandMarketResearchEngine';
import { scrapeTikTokVideoComments } from '@/lib/tiktokOpenSourceEngines';

export const dynamic = 'force-dynamic';

/**
 * GET /api/integrations/market-research/analyze?brand=ClubClio&competitors=@romand_vn,@espoir_vietnam&url=https://...
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const brandQuery = sp.get('brand') || sp.get('query') || 'ClubClio';
    const category = sp.get('category') || undefined;
    const competitorsRaw = sp.get('competitors') || '';
    const websiteUrl = sp.get('url') || '';

    const customCompetitorInputs = competitorsRaw
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    let liveWebInspection: LiveWebInspectionResult | null = null;
    if (websiteUrl.trim()) {
      liveWebInspection = await inspectCompetitorWebsiteUrl(websiteUrl.trim());
    }

    const dossier = generateBrandMarketResearchDossier({
      brandNameOrQuery: brandQuery,
      customCategory: category,
      customCompetitorInputs,
      liveWebInspection,
    });

    return NextResponse.json({
      success: true,
      dossier,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi khi phân tích hồ sơ thương hiệu.';
    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/market-research/analyze
 * Hỗ trợ 3 chế độ:
 * 1. mode = 'BRAND_DOSSIER': Phân tích tổng thể 4P, Định vị, Ma trận Đối thủ & Góc kịch bản (kèm quét URL nếu có)
 * 2. mode = 'INSPECT_URL': Quét trực tiếp trang web thương hiệu / trang sản phẩm đối thủ
 * 3. mode = 'MINE_REVIEWS': Đào bình luận khách hàng từ link video TikTok thực tế + danh sách đánh giá Shopee/TikTok
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'BRAND_DOSSIER';

    if (mode === 'INSPECT_URL') {
      const url = String(body.url || '').trim();
      if (!url) {
        return NextResponse.json(
          { success: false, message: 'Vui lòng nhập đường dẫn URL website hoặc gian hàng cần quét.' },
          { status: 400 }
        );
      }
      const inspection = await inspectCompetitorWebsiteUrl(url);
      return NextResponse.json({
        success: true,
        mode: 'INSPECT_URL',
        inspection,
      });
    }

    if (mode === 'MINE_REVIEWS') {
      const brandName = String(body.brandName || 'Thương hiệu').trim();
      const videoUrl = String(body.videoUrl || '').trim();
      const rawText = String(body.rawText || '');

      const linesFromText = rawText
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);

      let scrapedCommentsCount = 0;
      const combinedLines: string[] = [...linesFromText];

      if (videoUrl) {
        try {
          const scraped = await scrapeTikTokVideoComments(videoUrl, 40);
          if (scraped.comments && scraped.comments.length > 0) {
            scrapedCommentsCount = scraped.comments.length;
            for (const c of scraped.comments) {
              if (c.text && c.text.trim()) {
                combinedLines.push(c.text.trim());
              }
            }
          }
        } catch {
          // Tiếp tục xử lý danh sách text nếu link video không lấy được thêm bình luận
        }
      }

      const clusters = analyzeRawCustomerCommentsToClusters(combinedLines, brandName);
      return NextResponse.json({
        success: true,
        mode: 'MINE_REVIEWS',
        totalAnalyzedLines: combinedLines.length,
        scrapedCommentsCount,
        clusters,
      });
    }

    // Mặc định: BRAND_DOSSIER
    const brandNameOrQuery = String(body.brandName || body.query || 'ClubClio').trim();
    const customCategory = body.category ? String(body.category).trim() : undefined;
    const websiteUrl = body.websiteUrl ? String(body.websiteUrl).trim() : '';
    const rawCompetitors = Array.isArray(body.competitors)
      ? body.competitors.map(String)
      : String(body.competitors || '')
          .split(/[,;\n]+/)
          .map((s) => s.trim())
          .filter(Boolean);

    let liveWebInspection: LiveWebInspectionResult | null = null;
    if (websiteUrl) {
      liveWebInspection = await inspectCompetitorWebsiteUrl(websiteUrl);
    }

    const dossier = generateBrandMarketResearchDossier({
      brandNameOrQuery,
      customCategory,
      customCompetitorInputs: rawCompetitors,
      liveWebInspection,
    });

    return NextResponse.json({
      success: true,
      mode: 'BRAND_DOSSIER',
      dossier,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định khi chạy phân tích thị trường.';
    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 }
    );
  }
}
