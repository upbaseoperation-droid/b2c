import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/larkAuth';
import {
  discoverCompetitorKocs,
  discoverTikTokKocsByHashtag,
  extractDirectVideoUrlsFromInput,
  parseTikTokHandles,
  scrapeTikTokCreatorData,
  TikTokScrapedKocResult,
} from '@/lib/tiktokKocScraper';
import {
  fetchTikTokTrendingCreators,
  scrapeTikTokVideoComments,
} from '@/lib/tiktokOpenSourceEngines';

export const dynamic = 'force-dynamic';

/**
 * GET /api/integrations/tiktok-koc/scrape?handle=megauriviu&period=30d
 * hoặc GET /api/integrations/tiktok-koc/scrape?hashtag=kemchongnang&period=30d
 * hoặc GET /api/integrations/tiktok-koc/scrape?competitor=larocheposayvn&period=30d
 * hoặc GET /api/integrations/tiktok-koc/scrape?videoUrl=https://www.tiktok.com/@tiktok/video/7106594312292453675
 * hoặc GET /api/integrations/tiktok-koc/scrape?trending=1
 */
export async function GET(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Vui lòng đăng nhập để sử dụng tính năng tra cứu dữ liệu TikTok.' },
      { status: 401 }
    );
  }
  if (user.partnerType || user.role.endsWith('_PARTNER')) {
    return NextResponse.json(
      { success: false, error: 'Tài khoản đối tác không có quyền sử dụng công cụ cào dữ liệu TikTok.' },
      { status: 403 }
    );
  }

  try {
    const searchParams = req.nextUrl.searchParams;
    const videoUrlParam = searchParams.get('videoUrl') || '';
    const trendingParam = searchParams.get('trending') || '';
    const competitorParam = searchParams.get('competitor') || '';
    const hashtagParam = searchParams.get('hashtag') || searchParams.get('keyword') || '';
    const raw = searchParams.get('handle') || searchParams.get('url') || '';
    const periodParam = searchParams.get('period');
    const period: '7d' | '30d' | '90d' =
      periodParam === '7d' || periodParam === '90d' ? periodParam : '30d';

    if (videoUrlParam.trim()) {
      const limit = Number(searchParams.get('limit') || 30);
      const commentData = await scrapeTikTokVideoComments(videoUrlParam, limit);
      return NextResponse.json({
        success: true,
        mode: 'VIDEO_COMMENTS',
        ...commentData,
      });
    }

    if (trendingParam === '1' || trendingParam === 'true') {
      const limit = Number(searchParams.get('limit') || 20);
      const category = searchParams.get('category') || 'ALL';
      const trendingData = await fetchTikTokTrendingCreators(limit, { category });
      return NextResponse.json({
        success: true,
        mode: 'TRENDING_CREATORS',
        ...trendingData,
      });
    }

    if (competitorParam.trim()) {
      const limit = Number(searchParams.get('limit') || 10);
      const targetUpbaseBrand = searchParams.get('targetUpbaseBrand') || undefined;
      const compDiscovery = await discoverCompetitorKocs(competitorParam, {
        period,
        limit,
        targetUpbaseBrand,
      });
      return NextResponse.json({
        success: true,
        mode: 'COMPETITOR_DISCOVERY',
        competitorProfile: compDiscovery.competitorProfile,
        count: compDiscovery.totalDiscovered,
        newOpportunityCount: compDiscovery.newOpportunityCount,
        alreadyInUpbaseCount: compDiscovery.alreadyInUpbaseCount,
        results: compDiscovery.results,
        data: compDiscovery.results[0] || null,
      });
    }

    if (hashtagParam.trim()) {
      const limit = Number(searchParams.get('limit') || 10);
      const discovery = await discoverTikTokKocsByHashtag(hashtagParam, { period, limit });
      return NextResponse.json({
        success: true,
        mode: 'HASHTAG_DISCOVERY',
        hashtag: discovery.hashtag,
        tagPageUrl: discovery.tagPageUrl,
        count: discovery.totalDiscovered,
        results: discovery.results,
        data: discovery.results[0] || null,
      });
    }

    const handles = parseTikTokHandles(raw);
    if (handles.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Vui lòng nhập đường dẫn kênh, @handle, #hashtag hoặc kênh đối thủ hợp lệ.',
        },
        { status: 400 }
      );
    }

    const directVideoUrls = extractDirectVideoUrlsFromInput(raw);
    const videoLimit = Number(searchParams.get('videoLimit') || 24);
    const data = await scrapeTikTokCreatorData(handles[0], period, {
      directVideoUrls,
      videoLimit,
    });
    return NextResponse.json({
      success: true,
      mode: 'HANDLE_SCRAPE',
      data,
      results: [data],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định khi lấy dữ liệu kênh.';
    return NextResponse.json(
      {
        success: false,
        message: 'Không lấy được dữ liệu kênh TikTok. Vui lòng kiểm tra lại ID kênh.',
        error: message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/tiktok-koc/scrape
 * Hỗ trợ 5 chế độ:
 * 1. Cào bình luận thực tế của Video & lọc khách hỏi mua hàng ({ videoUrl: "https://..." })
 * 2. Lấy danh sách Creator đang thịnh hành thực tế trên TikTok ({ trendingCreators: true, category: "SKINCARE" })
 * 3. Quét KOC làm việc cho Đối thủ ({ competitor: "larocheposayvn" })
 * 4. Tìm KOC theo Hashtag / Từ khóa ({ hashtag: "kemchongnang" })
 * 5. Cào hàng loạt kênh theo @handle ({ rawInput: "@quinskincareholic\n@halinhofficial", videoLimit: 24 })
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const videoUrlParam: string = body.videoUrl || '';
    const trendingCreatorsFlag: boolean = Boolean(body.trendingCreators);
    const competitorParam: string = body.competitor || '';
    const hashtagParam: string = body.hashtag || body.keyword || '';
    const rawInput: string | string[] = body.handles || body.rawInput || body.handle || '';
    const periodParam = body.period;
    const period: '7d' | '30d' | '90d' =
      periodParam === '7d' || periodParam === '90d' ? periodParam : '30d';

    const excludeHandles: string[] = Array.isArray(body.excludeHandles)
      ? body.excludeHandles.map((h: unknown) => String(h || ''))
      : [];
    const pageOffset = Number(body.pageOffset || 0);
    const skipProfileFetch = Boolean(body.skipProfileFetch);

    if (typeof videoUrlParam === 'string' && videoUrlParam.trim().length > 0) {
      const limit = Number(body.limit || 40);
      const cursor = Number(body.cursor || 0);
      const resolvedVideoId =
        typeof body.resolvedVideoId === 'string' ? body.resolvedVideoId : undefined;
      const commentData = await scrapeTikTokVideoComments(videoUrlParam, limit, {
        cursor,
        resolvedVideoId,
      });
      return NextResponse.json({
        success: true,
        mode: 'VIDEO_COMMENTS',
        ...commentData,
      });
    }

    if (trendingCreatorsFlag) {
      const limit = Number(body.limit || 20);
      const category = typeof body.category === 'string' ? body.category : 'ALL';
      const trendingData = await fetchTikTokTrendingCreators(limit, {
        category,
        excludeHandles,
        pageOffset,
      });
      return NextResponse.json({
        success: true,
        mode: 'TRENDING_CREATORS',
        ...trendingData,
      });
    }

    if (typeof competitorParam === 'string' && competitorParam.trim().length > 0) {
      const limit = Number(body.limit || 12);
      const targetUpbaseBrand: string | undefined = body.targetUpbaseBrand || undefined;
      const compDiscovery = await discoverCompetitorKocs(competitorParam, {
        period,
        limit,
        targetUpbaseBrand,
        excludeHandles,
        pageOffset,
        skipProfileFetch,
      });
      return NextResponse.json({
        success: true,
        mode: 'COMPETITOR_DISCOVERY',
        competitorProfile: compDiscovery.competitorProfile,
        count: compDiscovery.totalDiscovered,
        newOpportunityCount: compDiscovery.newOpportunityCount,
        alreadyInUpbaseCount: compDiscovery.alreadyInUpbaseCount,
        results: compDiscovery.results,
        data: compDiscovery.results[0] || null,
      });
    }

    if (typeof hashtagParam === 'string' && hashtagParam.trim().length > 0) {
      const limit = Number(body.limit || 12);
      const discovery = await discoverTikTokKocsByHashtag(hashtagParam, {
        period,
        limit,
        excludeHandles,
        pageOffset,
      });
      return NextResponse.json({
        success: true,
        mode: 'HASHTAG_DISCOVERY',
        hashtag: discovery.hashtag,
        tagPageUrl: discovery.tagPageUrl,
        count: discovery.totalDiscovered,
        results: discovery.results,
        data: discovery.results[0] || null,
      });
    }

    const handles = parseTikTokHandles(rawInput).slice(0, 30);
    if (handles.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Vui lòng nhập ít nhất một đường dẫn, @handle, #hashtag hoặc kênh đối thủ hợp lệ.',
        },
        { status: 400 }
      );
    }

    const directVideoUrls = extractDirectVideoUrlsFromInput(rawInput);
    const defaultVideoLimit = handles.length === 1 ? 24 : 16;
    const videoLimit = Number(body.videoLimit || defaultVideoLimit);
    const results: TikTokScrapedKocResult[] = await Promise.all(
      handles.map((h) => scrapeTikTokCreatorData(h, period, { directVideoUrls, videoLimit }))
    );

    return NextResponse.json({
      success: true,
      mode: 'HANDLE_SCRAPE',
      count: results.length,
      results,
      data: results[0] || null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định khi thu thập dữ liệu.';
    return NextResponse.json(
      {
        success: false,
        message: 'Không thực hiện được yêu cầu lấy dữ liệu kênh TikTok.',
        error: message,
      },
      { status: 500 }
    );
  }
}


