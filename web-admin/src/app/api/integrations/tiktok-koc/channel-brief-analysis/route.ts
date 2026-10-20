import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/larkAuth';
import {
  analyzeSingleKocChannelForBrief,
  BrandBriefCriteriaInput,
  enqueueKocBriefAnalysisJob,
  getKocBriefAnalysisJob,
  listKocBriefAnalysisJobs,
} from '@/lib/kocChannelBriefAnalyzer';
import { parseTikTokHandles } from '@/lib/tiktokKocScraper';

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
      { success: false, error: 'Tài khoản đối tác không có quyền xem phân tích kênh KOC.' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId')?.trim();

    if (jobId) {
      const job = getKocBriefAnalysisJob(jobId);
      if (!job) {
        return NextResponse.json(
          {
            success: false,
            error: `Không tìm thấy tiến trình phân tích ngầm mã ${jobId}.`,
          },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        job,
      });
    }

    const jobs = listKocBriefAnalysisJobs();
    return NextResponse.json({
      success: true,
      jobs,
    });
  } catch (error) {
    console.error('[KOC Brief Analysis API - GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Không thể truy vấn trạng thái tiến trình phân tích kênh KOC.',
      },
      { status: 500 }
    );
  }
}

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
      { success: false, error: 'Tài khoản đối tác không có quyền kích hoạt phân tích kênh KOC.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const rawHandlesInput: string | string[] =
      body.handles || body.handle || body.urls || '';
    const handles = parseTikTokHandles(rawHandlesInput);

    if (handles.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Vui lòng nhập ít nhất 1 kênh TikTok KOC (@handle hoặc link kênh).',
        },
        { status: 400 }
      );
    }

    const criteria: BrandBriefCriteriaInput = {
      brandName: String(body.brandName || 'Cocoon').trim(),
      productName: body.productName ? String(body.productName).trim() : undefined,
      category: body.category ? String(body.category).trim() : undefined,
      targetAudience: body.targetAudience
        ? String(body.targetAudience).trim()
        : undefined,
      requiredUspKeywords: Array.isArray(body.requiredUspKeywords)
        ? body.requiredUspKeywords.map(String).filter(Boolean)
        : typeof body.requiredUspKeywords === 'string'
        ? body.requiredUspKeywords
            .split(/[,;\n]+/)
            .map((s: string) => s.trim())
            .filter(Boolean)
        : undefined,
      preferredContentStyle: body.preferredContentStyle
        ? String(body.preferredContentStyle).trim()
        : undefined,
      maxBudgetPerVideoVnd: body.maxBudgetPerVideoVnd
        ? Number(body.maxBudgetPerVideoVnd)
        : undefined,
      videoScanLimit: Math.min(Math.max(Number(body.videoScanLimit) || 40, 12), 80),
      llmConfig: body.llmConfig,
    };

    const runInBackground = body.background !== false;

    if (runInBackground) {
      const job = enqueueKocBriefAnalysisJob(handles, criteria);
      return NextResponse.json({
        success: true,
        mode: 'BACKGROUND_JOB',
        job,
      });
    }

    const report = await analyzeSingleKocChannelForBrief(handles[0], criteria);
    return NextResponse.json({
      success: true,
      mode: 'IMMEDIATE',
      report,
    });
  } catch (error) {
    console.error('[KOC Brief Analysis API - POST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Không thể khởi tạo phân tích kênh KOC & đối chiếu Brief lúc này.',
      },
      { status: 500 }
    );
  }
}
