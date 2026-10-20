import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/larkAuth';
import {
  analyzeRawCustomerCommentsToClusters,
  generateBrandMarketResearchDossier,
  inspectCompetitorWebsiteUrl,
  resolveOfficialWebsiteForBrand,
  type LiveScrapedCompetitorKocItem,
  type LiveScrapedCompetitorSignal,
  type LiveWebInspectionResult,
} from '@/lib/brandMarketResearchEngine';
import {
  scrapeLiveBrandWebIntelligence,
  scrapeWebSearchSnippets,
} from '@/lib/liveBrandWebScraper';
import { listProfiles } from '@/lib/brands/store';
import { brandKey } from '@/lib/brands/types';
import {
  discoverCompetitorKocs,
  type TikTokCompetitorKocResult,
  type TikTokCompetitorProfileSummary,
} from '@/lib/tiktokKocScraper';
import { scrapeTikTokVideoComments } from '@/lib/tiktokOpenSourceEngines';

export const dynamic = 'force-dynamic';

async function resolveSavedBrandProfile(brandNameOrQuery: string) {
  try {
    const profiles = await listProfiles();
    const targetKey = brandKey(brandNameOrQuery);
    return (
      profiles.find(
        (p) =>
          p.key === targetKey ||
          p.key.includes(targetKey) ||
          targetKey.includes(p.key)
      ) || null
    );
  } catch {
    return null;
  }
}

async function fetchPrimaryBrandLiveTikTok(brandNameOrQuery: string): Promise<{
  signal: LiveScrapedCompetitorSignal | null;
  kocItems: LiveScrapedCompetitorKocItem[];
  rawProfile: TikTokCompetitorProfileSummary | null;
  rawResults: TikTokCompetitorKocResult[];
  minedCommentTexts: string[];
}> {
  try {
    const res = await discoverCompetitorKocs(brandNameOrQuery, {
      period: '30d',
      limit: 8,
    });
    if (!res.results || res.results.length === 0) {
      return {
        signal: null,
        kocItems: [],
        rawProfile: res.competitorProfile || null,
        rawResults: [],
        minedCommentTexts: [],
      };
    }

    const totalViews = res.results.reduce(
      (s, r) => s + (r.competitorCollaboration?.latestCollabViews || 0),
      0
    );
    const avgEr =
      Math.round(
        (res.results.reduce(
          (s, r) => s + (r.engagementMetrics?.engagementRate || 0),
          0
        ) /
          res.results.length) *
          10
      ) / 10;

    const latestVideoUrl =
      res.results[0]?.competitorCollaboration?.latestCollabVideoUrl;

    const signal: LiveScrapedCompetitorSignal = {
      handle: res.competitorProfile.handle || brandNameOrQuery,
      brandName:
        res.competitorProfile.brandName || brandNameOrQuery.replace(/^@+/, ''),
      followers: res.competitorProfile.followers || 0,
      detectedKocCount: res.results.length,
      totalSampleViews: totalViews,
      avgEngagementRatePct: avgEr,
      topPromotedProduct:
        res.results[0]?.competitorCollaboration?.competitorProductPromoted,
      latestVideoUrl,
    };

    const kocItems: LiveScrapedCompetitorKocItem[] = res.results.map((r) => ({
      handle: r.handle,
      nickname: r.channelProfile.nickname,
      tierLabel: r.affiliateMetrics.suggestedClassification.tierLabel,
      followers: r.channelProfile.followers,
      erPct: r.engagementMetrics.engagementRate,
      views: r.competitorCollaboration.latestCollabViews,
      productPromoted: r.competitorCollaboration.competitorProductPromoted,
      videoUrl: r.competitorCollaboration.latestCollabVideoUrl,
      publishedAt: r.competitorCollaboration.latestCollabPublishedAt,
    }));

    // Tự động cào bình luận thực tế từ video dẫn đầu để phân tích tiếng nói khách hàng
    let minedCommentTexts: string[] = [];
    const videoWithComments = res.results.find(
      (r) =>
        r.competitorCollaboration?.latestCollabVideoUrl &&
        r.competitorCollaboration.latestCollabVideoUrl.includes('/video/')
    );
    if (videoWithComments?.competitorCollaboration.latestCollabVideoUrl) {
      try {
        const scrapedComments = await scrapeTikTokVideoComments(
          videoWithComments.competitorCollaboration.latestCollabVideoUrl,
          35
        );
        minedCommentTexts = (scrapedComments.comments || [])
          .map((c) => c.text?.trim())
          .filter((t): t is string => Boolean(t && t.length >= 4));
      } catch {
        // Fallback nếu video khóa bình luận
      }
    }

    return {
      signal,
      kocItems,
      rawProfile: res.competitorProfile,
      rawResults: res.results,
      minedCommentTexts,
    };
  } catch {
    return {
      signal: null,
      kocItems: [],
      rawProfile: null,
      rawResults: [],
      minedCommentTexts: [],
    };
  }
}

async function fetchLiveCompetitorSignals(
  competitorInputs: string[]
): Promise<LiveScrapedCompetitorSignal[]> {
  if (!competitorInputs || competitorInputs.length === 0) return [];
  const signals: LiveScrapedCompetitorSignal[] = [];

  await Promise.all(
    competitorInputs.slice(0, 3).map(async (rawComp) => {
      try {
        const [kocRes, webIntel] = await Promise.all([
          discoverCompetitorKocs(rawComp, {
            period: '30d',
            limit: 6,
          }).catch(() => null),
          scrapeLiveBrandWebIntelligence(rawComp).catch(() => null),
        ]);

        const results = kocRes?.results || [];
        const totalViews = results.reduce(
          (s, r) => s + (r.competitorCollaboration?.latestCollabViews || 0),
          0
        );
        const avgEr =
          results.length > 0
            ? Math.round(
                (results.reduce(
                  (s, r) => s + (r.engagementMetrics?.engagementRate || 0),
                  0
                ) /
                  results.length) *
                  10
              ) / 10
            : 0;

        const topWebSku = webIntel?.scrapedProducts?.[0];
        const dealPrice =
          topWebSku?.priceVnd || webIntel?.priceRangeVnd?.median || undefined;
        const listPrice =
          topWebSku?.originalPriceVnd ||
          (dealPrice ? Math.round((dealPrice * 1.18) / 1000) * 1000 : undefined);

        if (results.length > 0 || webIntel) {
          signals.push({
            handle:
              kocRes?.competitorProfile?.handle ||
              webIntel?.tiktokHandle ||
              rawComp,
            brandName: rawComp.replace(/^@+/, '').trim(),
            followers: kocRes?.competitorProfile?.followers || 0,
            detectedKocCount: results.length,
            totalSampleViews: totalViews,
            avgEngagementRatePct: avgEr,
            topPromotedProduct:
              topWebSku?.productName ||
              results[0]?.competitorCollaboration?.competitorProductPromoted,
            latestVideoUrl:
              results[0]?.competitorCollaboration?.latestCollabVideoUrl,
            scrapedDealPriceVnd: dealPrice,
            scrapedListPriceVnd: listPrice,
            scrapedWebsiteUrl:
              webIntel?.shopeeUrl || webIntel?.officialWebsiteUrl,
            scrapedOriginCountry: webIntel?.detectedOriginCountry,
            scrapedUsps: webIntel?.extractedUsps?.slice(0, 3),
          });
        }
      } catch {
        // Bỏ qua nếu một đối thủ không cào được
      }
    })
  );

  return signals;
}

/**
 * GET /api/integrations/market-research/analyze?brand=ClubClio&competitors=@romand_vn,@espoir_vietnam&url=https://...
 */
export async function GET(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Vui lòng đăng nhập.' },
      { status: 401 }
    );
  }
  if (user.partnerType || user.role.endsWith('_PARTNER')) {
    return NextResponse.json(
      { success: false, error: 'Tài khoản đối tác không có quyền truy cập nghiên cứu thị trường.' },
      { status: 403 }
    );
  }

  try {
    const sp = req.nextUrl.searchParams;
    const brandQuery = sp.get('brand') || sp.get('query') || 'Kutieskin';
    const category = sp.get('category') || undefined;
    const competitorsRaw = sp.get('competitors') || '';
    const websiteUrl =
      sp.get('url') || resolveOfficialWebsiteForBrand(brandQuery) || '';

    const customCompetitorInputs = competitorsRaw
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const [
      savedBrandProfile,
      liveAutoWebIntel,
      liveWebInspection,
      liveScrapedCompetitors,
      primaryTikTok,
    ] = await Promise.all([
      resolveSavedBrandProfile(brandQuery),
      scrapeLiveBrandWebIntelligence(brandQuery, websiteUrl.trim() || undefined).catch(
        () => null
      ),
      websiteUrl.trim()
        ? inspectCompetitorWebsiteUrl(websiteUrl.trim()).catch(() => null)
        : Promise.resolve(null),
      fetchLiveCompetitorSignals(customCompetitorInputs),
      fetchPrimaryBrandLiveTikTok(brandQuery),
    ]);

    const resolvedWebInspection =
      liveWebInspection ||
      (liveAutoWebIntel?.officialWebsiteUrl
        ? await inspectCompetitorWebsiteUrl(liveAutoWebIntel.officialWebsiteUrl).catch(
            () => null
          )
        : null);

    const dossier = generateBrandMarketResearchDossier({
      brandNameOrQuery: brandQuery,
      customCategory: category,
      customCompetitorInputs,
      liveWebInspection: resolvedWebInspection,
      liveAutoWebIntel,
      liveMinedCommentTexts: primaryTikTok.minedCommentTexts,
      savedBrandProfile,
      liveScrapedCompetitors,
      primaryLiveTikTokSignal: primaryTikTok.signal,
      primaryLiveTikTokKocs: primaryTikTok.kocItems,
    });

    return NextResponse.json({
      success: true,
      dossier,
      scannedCompetitorProfile: primaryTikTok.rawProfile,
      scannedCompetitorKocs: primaryTikTok.rawResults,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Lỗi khi phân tích hồ sơ thương hiệu.';
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
 * 1. mode = 'BRAND_DOSSIER': Phân tích tổng thể 4P, Định vị, Thực thi nội bộ File 4.1/3.2/3.5 & Ma trận Đối thủ (Cào tự động đa nguồn)
 * 2. mode = 'INSPECT_URL': Quét trực tiếp trang web thương hiệu / trang sản phẩm đối thủ
 * 3. mode = 'MINE_REVIEWS': Đào bình luận khách hàng từ link video TikTok thực tế + danh sách đánh giá Shopee/TikTok
 */
export async function POST(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Vui lòng đăng nhập.' },
      { status: 401 }
    );
  }
  if (user.partnerType || user.role.endsWith('_PARTNER')) {
    return NextResponse.json(
      { success: false, error: 'Tài khoản đối tác không có quyền kích hoạt phân tích nghiên cứu thị trường.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'BRAND_DOSSIER';

    if (mode === 'INSPECT_URL') {
      const url = String(body.url || '').trim();
      if (!url) {
        return NextResponse.json(
          {
            success: false,
            message: 'Vui lòng nhập đường dẫn URL website hoặc gian hàng cần quét.',
          },
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

    if (mode === 'DISSECT_COMPETITOR_VIDEO') {
      const competitorName = String(body.competitorName || 'Đối thủ').trim();
      const productPromoted = String(body.productPromoted || competitorName).trim();
      const videoUrl = String(body.videoUrl || '').trim();
      const kocHandle = String(body.kocHandle || '').trim();

      const [scrapedCommentsRes, searchSnippets] = await Promise.all([
        videoUrl
          ? scrapeTikTokVideoComments(videoUrl, 25).catch(() => ({ comments: [] }))
          : Promise.resolve({ comments: [] }),
        scrapeWebSearchSnippets(
          `${competitorName} ${productPromoted} review đánh giá thành phần giá bán`,
          competitorName
        ).catch(() => []),
      ]);

      const commentLines = (scrapedCommentsRes.comments || [])
        .map((c) => (c.text || '').trim())
        .filter(Boolean);

      const clusters = analyzeRawCustomerCommentsToClusters(commentLines, competitorName);

      return NextResponse.json({
        success: true,
        mode: 'DISSECT_COMPETITOR_VIDEO',
        competitorName,
        kocHandle,
        productPromoted,
        scrapedComments: commentLines,
        searchSnippets,
        clusters,
      });
    }

    // Mặc định: BRAND_DOSSIER (Cào tự động đa nguồn)
    const brandNameOrQuery = String(body.brandName || body.query || 'Kutieskin').trim();
    const customCategory = body.category ? String(body.category).trim() : undefined;
    const extraSearchQuery = body.searchQuery ? String(body.searchQuery).trim() : undefined;
    const websiteUrl = body.websiteUrl
      ? String(body.websiteUrl).trim()
      : resolveOfficialWebsiteForBrand(brandNameOrQuery) || '';
    const rawCompetitors: string[] = Array.isArray(body.competitors)
      ? body.competitors.map(String)
      : String(body.competitors || '')
          .split(/[,;\n]+/)
          .map((s) => s.trim())
          .filter(Boolean);

    const [
      savedBrandProfile,
      liveAutoWebIntel,
      competitorWebSnippets,
      liveWebInspection,
      liveScrapedCompetitors,
      primaryTikTok,
    ] = await Promise.all([
      resolveSavedBrandProfile(brandNameOrQuery),
      scrapeLiveBrandWebIntelligence(
        brandNameOrQuery,
        websiteUrl || undefined,
        extraSearchQuery
      ).catch(() => null),
      rawCompetitors.length > 0
        ? scrapeWebSearchSnippets(
            `${brandNameOrQuery} so sánh ${rawCompetitors.slice(0, 2).join(' ')} giá bán review`
          ).catch(() => [])
        : Promise.resolve([]),
      websiteUrl
        ? inspectCompetitorWebsiteUrl(websiteUrl).catch(() => null)
        : Promise.resolve<LiveWebInspectionResult | null>(null),
      fetchLiveCompetitorSignals(rawCompetitors),
      fetchPrimaryBrandLiveTikTok(brandNameOrQuery),
    ]);

    if (liveAutoWebIntel && competitorWebSnippets.length > 0) {
      const seenUrls = new Set(liveAutoWebIntel.searchSnippets.map((s) => s.url));
      for (const sn of competitorWebSnippets) {
        if (!seenUrls.has(sn.url)) {
          seenUrls.add(sn.url);
          liveAutoWebIntel.searchSnippets.push(sn);
        }
      }
    }

    const resolvedWebInspection =
      liveWebInspection ||
      (liveAutoWebIntel?.officialWebsiteUrl
        ? await inspectCompetitorWebsiteUrl(liveAutoWebIntel.officialWebsiteUrl).catch(
            () => null
          )
        : null);

    const dossier = generateBrandMarketResearchDossier({
      brandNameOrQuery,
      customCategory,
      customCompetitorInputs: rawCompetitors,
      liveWebInspection: resolvedWebInspection,
      liveAutoWebIntel,
      liveMinedCommentTexts: primaryTikTok.minedCommentTexts,
      savedBrandProfile,
      liveScrapedCompetitors,
      primaryLiveTikTokSignal: primaryTikTok.signal,
      primaryLiveTikTokKocs: primaryTikTok.kocItems,
    });

    return NextResponse.json({
      success: true,
      mode: 'BRAND_DOSSIER',
      dossier,
      scannedCompetitorProfile: primaryTikTok.rawProfile,
      scannedCompetitorKocs: primaryTikTok.rawResults,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Lỗi không xác định khi chạy phân tích thị trường.';
    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 }
    );
  }
}
