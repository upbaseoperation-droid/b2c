import { REAL_B2C_42_BRANDS } from './realB2cBrandsData';
import { UPBASE_FULL_KOC_MASTER } from './kocMasterDataset';
import { B2C_BOOKED_VIDEOS_OCT_2026 } from './b2cAnalyticsDataset';
import {
  parseTikTokHandles,
  scrapeTikTokCreatorData,
} from './tiktokKocScraper';
import {
  extractCompetitorVideoScriptAndHook,
} from './tiktokVideoInspector';
import {
  scrapeTikTokVideoComments,
} from './tiktokOpenSourceEngines';

export interface BrandBriefCriteriaInput {
  brandName: string;
  productName?: string;
  category?: string;
  targetAudience?: string;
  requiredUspKeywords?: string[];
  preferredContentStyle?: string;
  maxBudgetPerVideoVnd?: number;
  competitorNames?: string[];
  videoScanLimit?: number; // Mặc định 40 video/kênh (tối đa 80)
  llmConfig?: {
    provider?: 'GEMINI' | 'OPENAI';
    apiKey?: string;
    model?: string;
    systemInstruction?: string;
  };
}

export interface KocBriefMatchAxisScore {
  axisKey:
    | 'CATEGORY_PRODUCT_FIT'
    | 'CHANNEL_VIEW_HEALTH'
    | 'CONTENT_STYLE_HOOK'
    | 'AUDIENCE_BUYING_INTENT'
    | 'EXCLUSIVITY_AND_BUDGET';
  axisLabel: string;
  score: number;
  maxScore: number;
  status: 'TỐT' | 'KHÁ' | 'CẦN_LƯU_Ý';
  evidenceNote: string;
}

export interface KocAnalyzedVideoSample {
  videoId: string;
  videoUrl: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
  hasCartAnchor: boolean;
  cartAnchorTitle?: string;
  caption: string;
  hook3sText: string;
  hookPatternLabel: string;
}

export interface KocChannelBriefAnalysisReport {
  id: string;
  analyzedAt: string;
  handle: string;
  nickname: string;
  avatarUrl?: string;
  channelUrl: string;
  bio: string;
  tierLabel: string;
  followers: number;
  totalLikes: number;
  totalChannelVideos: number;
  extractedPhone?: string;
  extractedEmail?: string;
  estimatedRateCardVnd: number;
  historicalUpbaseDealsCount: number;
  historicalUpbaseBrands: string[];

  // 1. Thống kê trên tập video quét mở rộng (30-50+ video)
  videoSampleStats: {
    scannedVideosCount: number;
    avgViews: number;
    medianViews: number; // Trung vị chống lệch do 1 bài ăn may
    minViews: number;
    maxViews: number;
    viewConsistencyRatioPct: number; // Tỷ lệ bài giữ phong độ >= 50% median
    avgEngagementRatePct: number;
    postingFrequencyPerWeek: number;
    affiliateCartRatioPct: number; // % video có gắn giỏ hàng
  };

  // 2. Phân tích Ngách, Văn phong & Cách mở đầu 3s
  contentPersonaProfile: {
    dominantCategories: string[];
    dominantContentStyle: string;
    dominantHookPatterns: string[];
    spokenToneSummary: string;
    topPromotedProducts: string[];
    detectedCompetitorMentions: {
      competitorName: string;
      videoUrl: string;
      publishedAt: string;
    }[];
  };

  // 3. Phân tích Tệp người xem qua Bình luận thực tế
  audienceCommentProfile: {
    totalCommentsSampled: number;
    buyingIntentCount: number;
    buyingIntentRatePct: number;
    detectedViewerPersonas: string[];
    topBuyerQuestions: {
      username: string;
      text: string;
      likeCount: number;
    }[];
  };

  // 4. Chấm điểm Khớp Brief Brand (0 - 100 điểm)
  briefMatchEvaluation: {
    brandName: string;
    productName: string;
    totalScore: number; // 0 - 100
    fitVerdict: 'RẤT_KHỚP' | 'KHÁ_KHỚP' | 'CẦN_CÂN_NHẮC' | 'KHÔNG_KHỚP';
    fitVerdictLabel: string;
    axisScores: KocBriefMatchAxisScore[];
    whyMatchStrengths: string[];
    riskWarnings: string[];
    recommendedAngleForKoc: string;
    tailoredHook3sForKoc: string;
    tailored4StepScript: {
      stepIndex: number;
      timeRange: string;
      title: string;
      content: string;
    }[];
    analysisEngineMode: 'REAL_CRAWL_PLUS_LLM' | 'REAL_CRAWL_QUANTITATIVE';
  };

  analyzedVideos: KocAnalyzedVideoSample[];
}

export type KocBriefAnalysisJobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface KocBriefAnalysisBackgroundJob {
  jobId: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  status: KocBriefAnalysisJobStatus;
  progressPct: number;
  currentStepLabel: string;
  handles: string[];
  completedHandlesCount: number;
  videoScanLimitPerChannel: number;
  totalVideosScannedSoFar: number;
  briefCriteria: Omit<BrandBriefCriteriaInput, 'llmConfig'>;
  results: KocChannelBriefAnalysisReport[];
  errorMessage?: string;
}

interface GlobalKocBriefJobStore {
  jobs: Map<string, KocBriefAnalysisBackgroundJob>;
}

const globalForBriefJobs = globalThis as unknown as {
  __UPBASE_KOC_BRIEF_JOBS__?: GlobalKocBriefJobStore;
};

function getJobStore(): GlobalKocBriefJobStore {
  if (!globalForBriefJobs.__UPBASE_KOC_BRIEF_JOBS__) {
    globalForBriefJobs.__UPBASE_KOC_BRIEF_JOBS__ = {
      jobs: new Map<string, KocBriefAnalysisBackgroundJob>(),
    };
  }
  return globalForBriefJobs.__UPBASE_KOC_BRIEF_JOBS__;
}

function stripAccents(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return Math.round(sorted[mid]);
}

const CATEGORY_SIGNAL_DICTIONARY: Array<{
  label: string;
  keywords: string[];
}> = [
  {
    label: 'Chăm sóc da & Dược mỹ phẩm (Skincare)',
    keywords: [
      'skincare',
      'kem chong nang',
      'sua rua mat',
      'tay trang',
      'kem duong',
      'serum',
      'bha',
      'retinol',
      'da dau',
      'da mun',
      'duoc my pham',
      'tay da chet',
      'toner',
      'mat na',
    ],
  },
  {
    label: 'Mẹ & Bé (Mom & Baby)',
    keywords: [
      'me bim',
      'so sinh',
      'cho be',
      'cham sua',
      'ham ta',
      'bim',
      'sua tam cho be',
      'me bau',
      'do so sinh',
      'cham con',
    ],
  },
  {
    label: 'Trang điểm (Makeup & Cushion)',
    keywords: [
      'makeup',
      'trang diem',
      'son',
      'cushion',
      'phan nuoc',
      'che khuyet diem',
      'ke mat',
      'mascara',
      'swatch',
    ],
  },
  {
    label: 'Chăm sóc cơ thể & Hương thơm (Body & Hair)',
    keywords: [
      'sua tam',
      'body mist',
      'xit thom',
      'duong the',
      'dau goi',
      'cham soc toc',
      'nuoc hoa',
      'lan khu mui',
      'ddvs',
      'dung dich ve sinh',
    ],
  },
  {
    label: 'Sức khỏe & Thực phẩm bổ sung (Wellness)',
    keywords: [
      'collagen',
      'vien uong',
      'vitamin',
      'men vi sinh',
      'eatclean',
      'giam can',
      'Tang de khang',
      'bo sung',
    ],
  },
  {
    label: 'Gia dụng & Đời sống (Home & Lifestyle)',
    keywords: [
      'nuoc giat',
      'nuoc xa',
      'gia dung',
      'nha cua',
      'decor',
      'nau an',
      'vlog',
      'ootd',
      'phoi do',
    ],
  },
];

function detectDominantCategories(combinedText: string): string[] {
  const norm = stripAccents(combinedText);
  const scored = CATEGORY_SIGNAL_DICTIONARY.map((cat) => {
    let hits = 0;
    for (const kw of cat.keywords) {
      if (norm.includes(stripAccents(kw))) {
        hits += 1;
      }
    }
    return { label: cat.label, hits };
  })
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits);

  if (scored.length === 0) {
    return ['Review Tổng hợp & Đời sống (Lifestyle)'];
  }
  return scored.slice(0, 3).map((s) => s.label);
}

function detectContentStyleAndVoice(
  combinedCaptionsAndTranscripts: string,
  affiliateRatioPct: number
): {
  dominantStyle: string;
  spokenToneSummary: string;
} {
  const norm = stripAccents(combinedCaptionsAndTranscripts);

  if (/\b(thanh phan|hoat chat|nong do|ph |corticoid|paraben|bac si|duoc si|khoa hoc)\b/.test(norm)) {
    return {
      dominantStyle: 'Phân tích thành phần & Góc nhìn chuyên môn (Expert / Ingredient Breakdown)',
      spokenToneSummary:
        'Giọng điệu thuyết phục bằng dẫn chứng thành phần, bảng công bố và giải thích cơ chế rõ ràng; phù hợp với sản phẩm cần xây dựng lòng tin an toàn.',
    };
  }

  if (/\b(me bim|con minh|be nha|cham con|bau bi|di sinh|nha minh)\b/.test(norm)) {
    return {
      dominantStyle: 'Chia sẻ kinh nghiệm Mẹ bỉm & Đời sống gia đình (Mom Vlog / Real Experience)',
      spokenToneSummary:
        'Văn phong gần gũi, tâm sự thực tế từ quá trình chăm con/chăm sóc gia đình, dễ tạo đồng cảm và chuyển đổi với tệp phụ nữ có gia đình.',
    };
  }

  if (/\b(test|cam thuong|can canh|truoc va sau|7 ngay|14 ngay|kiem chung|boc phot|su that)\b/.test(norm)) {
    return {
      dominantStyle: 'Test thực tế dưới camera thường & Kiểm chứng hiệu quả (Direct Proof / Swatch)',
      spokenToneSummary:
        'Nói thẳng vào vấn đề ngay 3 giây đầu, ưu tiên quay cận cảnh chất sản phẩm trên da thật để chứng minh hiệu quả trực quan.',
    };
  }

  if (affiliateRatioPct >= 65 || /\b(san sale|gia hoi|mua 1 tang|combo|gio hang|unbox|dap hop)\b/.test(norm)) {
    return {
      dominantStyle: 'Đập hộp & Săn ưu đãi chuyển đổi giỏ hàng (Haul / Deal Conversion)',
      spokenToneSummary:
        'Nhịp nói nhanh, nhấn mạnh quà tặng kèm, mức giảm giá sâu và điều hướng bấm giỏ hàng góc trái mạnh mẽ.',
    };
  }

  return {
    dominantStyle: 'Review trải nghiệm cá nhân & Kể chuyện đời thường (Storytelling / Daily Routine)',
    spokenToneSummary:
      'Lồng ghép sản phẩm tự nhiên vào thói quen sinh hoạt hàng ngày, giữ tỷ lệ tương tác tự nhiên tốt với người xem.',
  };
}

function detectViewerPersonasFromComments(commentTexts: string[]): string[] {
  const combined = stripAccents(commentTexts.join(' '));
  const personas: string[] = [];

  if (/\b(da dau|da mun|nhay cam|lo chan long|tham mun|bong troc|kich ung)\b/.test(combined)) {
    personas.push('Người có làn da dầu mụn / nhạy cảm đang tìm giải pháp cải thiện');
  }
  if (/\b(me bau|bau dung|cho be|thang tuoi|so sinh|cham sua|con em)\b/.test(combined)) {
    personas.push('Mẹ bầu & Mẹ bỉm sữa quan tâm độ lành tính cho bé');
  }
  if (/\b(hoc sinh|sinh vien|gia bao nhieu|san sale|ma giam|re khong)\b/.test(combined)) {
    personas.push('Nhóm khách trẻ (Gen Z / Sinh viên) nhạy bén về giá và ưu đãi combo');
  }
  if (/\b(di lam|van phong|lau troi|kiem dau|nang tong|chong nang)\b/.test(combined)) {
    personas.push('Nhân viên văn phòng cần sản phẩm tiện lợi, nâng tông & bền màu');
  }

  if (personas.length === 0) {
    personas.push('Người tiêu dùng mua sắm trực tiếp trên TikTok Shop quan tâm chất lượng thật');
  }
  return personas;
}

async function tryEnhanceWithLlmIfConfigured(
  report: KocChannelBriefAnalysisReport,
  criteria: BrandBriefCriteriaInput
): Promise<{
  spokenToneSummary?: string;
  recommendedAngleForKoc?: string;
  tailoredHook3sForKoc?: string;
  tailored4StepScript?: {
    stepIndex: number;
    timeRange: string;
    title: string;
    content: string;
  }[];
  usedLlm: boolean;
}> {
  const apiKey =
    criteria.llmConfig?.apiKey?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    '';

  if (!apiKey) {
    return { usedLlm: false };
  }

  const provider =
    criteria.llmConfig?.provider ||
    (process.env.GEMINI_API_KEY ? 'GEMINI' : 'OPENAI');

  const sampleHooks = report.analyzedVideos
    .slice(0, 6)
    .map((v, i) => `${i + 1}. [${v.views.toLocaleString('vi-VN')} view] Hook: "${v.hook3sText}" | Caption: ${v.caption.slice(0, 120)}`)
    .join('\n');

  const sampleComments = report.audienceCommentProfile.topBuyerQuestions
    .slice(0, 5)
    .map((c) => `- @${c.username}: "${c.text}"`)
    .join('\n');

  const customInstructionLine = criteria.llmConfig?.systemInstruction?.trim()
    ? `Chỉ dẫn nghiệp vụ (Prompt) tùy chỉnh: ${criteria.llmConfig.systemInstruction.trim()}`
    : '';

  const prompt = [
    ...(customInstructionLine ? [customInstructionLine] : []),
    `Phân tích kênh TikTok @${report.handle} (${report.nickname}, ${report.followers.toLocaleString('vi-VN')} followers, View trung vị ${report.videoSampleStats.medianViews.toLocaleString('vi-VN')}, ER ${report.videoSampleStats.avgEngagementRatePct}%) để ghép với Brief của thương hiệu "${criteria.brandName}" (${criteria.productName || 'Sản phẩm chủ lực'}).`,
    `USP bắt buộc của sản phẩm: ${(criteria.requiredUspKeywords || []).join(', ') || 'Chính hãng, hiệu quả thực tế'}.`,
    `Đối tượng mục tiêu: ${criteria.targetAudience || 'Khách hàng mục tiêu của nhãn hàng'}.`,
    `Các câu mở đầu (Hook 3s) thực tế trên kênh @${report.handle}:`,
    sampleHooks || 'Chưa có mẫu câu thoại',
    `Bình luận thực tế của người xem trên kênh:`,
    sampleComments || 'Chưa có mẫu bình luận',
    `Hãy trả về đúng định dạng JSON (không bọc markdown) gồm các trường:`,
    `{"spokenToneSummary": "Nhận xét 2 câu về văn phong thực tế của KOC", "recommendedAngleForKoc": "Góc tiếp cận nội dung phù hợp nhất khi KOC này lên bài cho thương hiệu", "tailoredHook3sForKoc": "Câu mở đầu 3 giây viết theo đúng giọng của KOC này", "step1": "Nội dung 0-3s", "step2": "Nội dung 3-10s", "step3": "Nội dung 10-25s", "step4": "Nội dung chốt đơn 25-30s"}`,
  ].join('\n');

  try {
    let rawJsonText = '';
    if (provider === 'GEMINI') {
      const requestedModel = (criteria.llmConfig?.model || 'gemini-2.5-flash').trim();
      const aliasMap: Record<string, string> = {
        'gemini-3.8-flash': 'gemini-2.5-flash',
        'gemini-3.5-flash': 'gemini-2.0-flash',
        'gemini-3.5-flash-lite': 'gemini-2.0-flash-lite',
        'gemini-4-argon': 'gemini-2.5-pro',
        'gemini-3.1-pro-preview': 'gemini-2.5-pro',
      };
      const primaryUpstream = aliasMap[requestedModel] || requestedModel;
      const geminiCandidates = Array.from(
        new Set([primaryUpstream, 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'])
      );
      for (const candidateModel of geminiCandidates) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          candidateModel
        )}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.25, maxOutputTokens: 900 },
          }),
          signal: AbortSignal.timeout(12000),
        });
        if (res.ok) {
          const data = await res.json();
          rawJsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (rawJsonText) break;
        }
      }
    } else {
      const modelId = criteria.llmConfig?.model || 'gpt-4o-mini';
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.25,
          max_tokens: 900,
        }),
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok) {
        const data = await res.json();
        rawJsonText = data?.choices?.[0]?.message?.content || '';
      }
    }

    const cleaned = rawJsonText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { usedLlm: false };

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, string>;
    return {
      spokenToneSummary: parsed.spokenToneSummary || undefined,
      recommendedAngleForKoc: parsed.recommendedAngleForKoc || undefined,
      tailoredHook3sForKoc: parsed.tailoredHook3sForKoc || undefined,
      tailored4StepScript:
        parsed.step1 && parsed.step2 && parsed.step3 && parsed.step4
          ? [
              {
                stepIndex: 1,
                timeRange: '00:00 - 00:03',
                title: 'Mở đầu giữ chân (Hook 3s theo giọng KOC)',
                content: parsed.step1,
              },
              {
                stepIndex: 2,
                timeRange: '00:03 - 00:10',
                title: 'Dẫn dắt vấn đề & Bối cảnh thực tế',
                content: parsed.step2,
              },
              {
                stepIndex: 3,
                timeRange: '00:10 - 00:25',
                title: 'Trải nghiệm sản phẩm & Chứng minh USP',
                content: parsed.step3,
              },
              {
                stepIndex: 4,
                timeRange: '00:25 - 00:35',
                title: 'Chốt đơn & Điều hướng Giỏ hàng',
                content: parsed.step4,
              },
            ]
          : undefined,
      usedLlm: true,
    };
  } catch {
    return { usedLlm: false };
  }
}

/**
 * Phân tích chuyên sâu 1 kênh KOC (quét tới 40-80 video gần nhất, bóc lời thoại/Hook, cào bình luận)
 * và chấm điểm khớp với Brief chiến dịch của Brand.
 */
export async function analyzeSingleKocChannelForBrief(
  rawHandle: string,
  criteria: BrandBriefCriteriaInput,
  onProgress?: (stepLabel: string, scannedVideos: number) => void
): Promise<KocChannelBriefAnalysisReport> {
  const cleanHandle =
    parseTikTokHandles(rawHandle)[0] ||
    rawHandle.trim().toLowerCase().replace(/^@+/, '');

  const videoLimit = Math.min(Math.max(criteria.videoScanLimit || 40, 12), 80);

  onProgress?.(
    `Đang quét hồ sơ & thu thập danh sách tới ${videoLimit} video trên kênh @${cleanHandle}...`,
    0
  );

  const scraped = await scrapeTikTokCreatorData(cleanHandle, '30d', {
    videoLimit,
  });

  const existingKoc = UPBASE_FULL_KOC_MASTER.find(
    (k) => k.channelId.toLowerCase().replace(/^@+/, '') === cleanHandle
  );

  // Gộp thêm các video đã lên sóng trong lịch sử nội bộ (File 3.2) nếu có
  const historicalAiredForKoc = B2C_BOOKED_VIDEOS_OCT_2026.filter(
    (v) => v.channelId.toLowerCase().replace(/^@+/, '') === cleanHandle
  );

  const rawVideos = [...scraped.recentVideos];
  const seenIds = new Set(rawVideos.map((v) => v.videoId));

  if (existingKoc?.recentVideos) {
    for (const ev of existingKoc.recentVideos) {
      if (!seenIds.has(ev.videoId)) {
        seenIds.add(ev.videoId);
        rawVideos.push(ev);
      }
    }
  }

  const totalScannedVideos = rawVideos.length;
  onProgress?.(
    `Đã thu thập ${totalScannedVideos} video của @${cleanHandle}. Đang bóc tách lời thoại & câu mở đầu 3s...`,
    totalScannedVideos
  );

  // Bóc tách sâu kịch bản & lời thoại cho 6 video nổi bật nhất trên kênh
  const topVideosForScript = [...rawVideos]
    .sort((a, b) => b.views - a.views)
    .slice(0, 6);

  const scriptBreakdowns = await Promise.all(
    topVideosForScript.map((v) =>
      extractCompetitorVideoScriptAndHook(v.videoUrl, {
        handle: cleanHandle,
        nickname: scraped.channelProfile.nickname,
        views: v.views,
        productPromoted: v.productName,
      }).catch(() => null)
    )
  );

  const breakdownByVideoId = new Map<
    string,
    NonNullable<(typeof scriptBreakdowns)[number]>
  >();
  for (const b of scriptBreakdowns) {
    if (b && b.videoId) {
      breakdownByVideoId.set(b.videoId, b);
    }
  }

  onProgress?.(
    `Đang quét bình luận người xem dưới các video chủ lực của @${cleanHandle}...`,
    totalScannedVideos
  );

  // Quét bình luận người xem thực tế từ 3 video đầu bảng
  const commentTargetVideos = topVideosForScript.slice(0, 3);
  const commentResults = await Promise.all(
    commentTargetVideos.map((v) =>
      scrapeTikTokVideoComments(v.videoUrl, 30, {
        resolvedVideoId: v.videoId,
      }).catch(() => null)
    )
  );

  const allComments = commentResults.flatMap((r) => r?.comments || []);
  const buyingIntentComments = allComments.filter(
    (c) => c.intentType === 'BUYING_INTENT'
  );
  const buyingIntentRatePct =
    allComments.length > 0
      ? Number(((buyingIntentComments.length / allComments.length) * 100).toFixed(1))
      : 18.5;

  const analyzedVideos: KocAnalyzedVideoSample[] = rawVideos.map((v) => {
    const bd = breakdownByVideoId.get(v.videoId);
    const firstSentence = (v.caption || '')
      .replace(/#[\p{L}\p{N}_]+/gu, '')
      .split(/[.!?\n]+/)[0]
      ?.trim();
    const hook3sText =
      bd?.hookAnalysis.spokenHook3s ||
      firstSentence ||
      v.caption.slice(0, 100) ||
      'Mở đầu trực diện vào sản phẩm';
    const hookPatternLabel =
      bd?.hookAnalysis.hookPatternLabel ||
      (/(\?|sao|tại sao|đừng|sai lầm)/i.test(hook3sText)
        ? 'Đánh trực diện nỗi đau / Phản biện'
        : /(test|so sánh|trước|sau|cận cảnh)/i.test(hook3sText)
        ? 'Test thực tế / So sánh trực quan'
        : 'Review trải nghiệm trực tiếp');

    return {
      videoId: v.videoId,
      videoUrl: v.videoUrl,
      publishedAt: v.publishedAt,
      views: v.views,
      likes: v.likes,
      comments: v.comments,
      shares: v.shares,
      engagementRate: v.engagementRate,
      hasCartAnchor: Boolean(v.isAffiliate),
      cartAnchorTitle: bd?.cartAnchorTitle || v.productName,
      caption: v.caption,
      hook3sText,
      hookPatternLabel,
    };
  });

  // 1. Tính toán thống kê chuyên sâu trên tập video quét được
  const viewsList = analyzedVideos.map((v) => v.views).filter((v) => v > 0);
  const avgViews =
    viewsList.length > 0
      ? Math.round(viewsList.reduce((s, x) => s + x, 0) / viewsList.length)
      : scraped.engagementMetrics.avgViews || existingKoc?.avgViews || 15000;
  const medianViews =
    viewsList.length > 0 ? computeMedian(viewsList) : avgViews;
  const minViews = viewsList.length > 0 ? Math.min(...viewsList) : 0;
  const maxViews = viewsList.length > 0 ? Math.max(...viewsList) : avgViews;

  const steadyCount = viewsList.filter((v) => v >= medianViews * 0.5).length;
  const viewConsistencyRatioPct =
    viewsList.length > 0
      ? Math.round((steadyCount / viewsList.length) * 100)
      : 75;

  const affiliateVideosCount = analyzedVideos.filter((v) => v.hasCartAnchor).length;
  const affiliateCartRatioPct =
    analyzedVideos.length > 0
      ? Math.round((affiliateVideosCount / analyzedVideos.length) * 100)
      : 45;

  // Ước tính tần suất đăng bài/tuần từ khoảng ngày đăng của các video
  const validDates = analyzedVideos
    .map((v) => new Date(v.publishedAt).getTime())
    .filter((t) => Number.isFinite(t) && t > 1000000000000)
    .sort((a, b) => b - a);
  let postingFrequencyPerWeek = 3.5;
  if (validDates.length >= 2) {
    const spanDays = Math.max(
      7,
      (validDates[0] - validDates[validDates.length - 1]) / (86400 * 1000)
    );
    postingFrequencyPerWeek = Number(
      Math.min(14, Math.max(0.5, (validDates.length / spanDays) * 7)).toFixed(1)
    );
  }

  // 2. Nhận diện ngành hàng, văn phong & sản phẩm gắn giỏ
  const allTranscriptsAndCaptions = [
    scraped.channelProfile.bio,
    ...analyzedVideos.map((v) => `${v.caption} ${v.hook3sText} ${v.cartAnchorTitle || ''}`),
    ...scriptBreakdowns.map((b) => b?.fullTranscriptText || ''),
  ].join(' ');

  const dominantCategories = detectDominantCategories(allTranscriptsAndCaptions);
  const { dominantStyle, spokenToneSummary } = detectContentStyleAndVoice(
    allTranscriptsAndCaptions,
    affiliateCartRatioPct
  );

  const hookPatternCounts = new Map<string, number>();
  for (const v of analyzedVideos) {
    hookPatternCounts.set(
      v.hookPatternLabel,
      (hookPatternCounts.get(v.hookPatternLabel) || 0) + 1
    );
  }
  const dominantHookPatterns = [...hookPatternCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label]) => label);

  const topPromotedProducts = Array.from(
    new Set(
      analyzedVideos
        .map((v) => v.cartAnchorTitle)
        .filter((p): p is string => Boolean(p && p.trim().length >= 3))
    )
  ).slice(0, 6);

  // Kiểm tra xung đột đối thủ trong các video đã đăng
  const targetBrandNorm = stripAccents(criteria.brandName || '');
  const competitorCandidates =
    criteria.competitorNames && criteria.competitorNames.length > 0
      ? criteria.competitorNames
      : [
          'La Roche-Posay',
          'Anessa',
          'Skin1004',
          'CeraVe',
          'Cetaphil',
          "L'Oreal",
          'Rom&nd',
          'Mustela',
          'Bioderma',
          'Paula Choice',
          'Obagi',
        ].filter((c) => stripAccents(c) !== targetBrandNorm);

  const detectedCompetitorMentions: KocChannelBriefAnalysisReport['contentPersonaProfile']['detectedCompetitorMentions'] =
    [];
  for (const v of analyzedVideos) {
    const vNorm = stripAccents(`${v.caption} ${v.cartAnchorTitle || ''}`);
    for (const comp of competitorCandidates) {
      const compNorm = stripAccents(comp);
      if (compNorm.length >= 4 && vNorm.includes(compNorm)) {
        detectedCompetitorMentions.push({
          competitorName: comp,
          videoUrl: v.videoUrl,
          publishedAt: v.publishedAt,
        });
      }
    }
  }

  // 3. Chấm điểm 5 trục đối chiếu Brief Brand (Thang 100 điểm)
  const brandRecord = REAL_B2C_42_BRANDS.find(
    (b) => stripAccents(b.name) === targetBrandNorm
  );
  const briefCategoryText =
    criteria.category ||
    brandRecord?.category ||
    criteria.productName ||
    criteria.brandName;
  const briefUspList =
    criteria.requiredUspKeywords && criteria.requiredUspKeywords.length > 0
      ? criteria.requiredUspKeywords
      : [criteria.productName || criteria.brandName].filter(Boolean);

  const normChannelCorpus = stripAccents(allTranscriptsAndCaptions);
  const normBriefCategory = stripAccents(briefCategoryText);

  // Trục 1: Độ khớp Ngành hàng & Tệp sản phẩm (Tối đa 30 điểm)
  let catScore = 18;
  const matchedCatTokens = normBriefCategory
    .split(/\s+/)
    .filter((t) => t.length >= 3 && normChannelCorpus.includes(t));
  const matchedUspTokens = briefUspList.filter((kw) =>
    normChannelCorpus.includes(stripAccents(kw))
  );
  if (
    dominantCategories.some((c) =>
       stripAccents(c)
        .split(/\s+/)
        .some((w) => w.length >= 4 && normBriefCategory.includes(w))
    )
  ) {
    catScore += 8;
  } else if (matchedCatTokens.length > 0) {
    catScore += 5;
  }
  catScore = Math.min(30, catScore + Math.min(4, matchedUspTokens.length * 2));

  // Trục 2: Sức khỏe Lượt xem trung vị & Độ ổn định kênh (Tối đa 20 điểm)
  const avgEr = scraped.engagementMetrics.engagementRate || 3.5;
  let healthScore = 12;
  if (medianViews >= 30000) healthScore += 4;
  else if (medianViews >= 10000) healthScore += 2;
  if (avgEr >= 4.0) healthScore += 2;
  if (viewConsistencyRatioPct >= 65) healthScore += 2;
  healthScore = Math.min(20, healthScore);

  // Trục 3: Văn phong, Định dạng quay & Cách mở đầu 3s (Tối đa 20 điểm)
  let styleScore = 15;
  if (criteria.preferredContentStyle) {
    const prefNorm = stripAccents(criteria.preferredContentStyle);
    if (
      stripAccents(dominantStyle).includes(prefNorm) ||
      normChannelCorpus.includes(prefNorm)
    ) {
      styleScore = 19;
    }
  } else if (dominantHookPatterns.length > 0) {
    styleScore = 17;
  }

  // Trục 4: Tỷ lệ khách hỏi mua thực tế dưới bình luận (Tối đa 15 điểm)
  let intentScore = 10;
  if (buyingIntentRatePct >= 20) intentScore = 14;
  else if (buyingIntentRatePct >= 12) intentScore = 12;

  // Trục 5: An toàn xung đột Đối thủ & Phù hợp Ngân sách Cast (Tối đa 15 điểm)
  const estimatedRateCardVnd =
    existingKoc?.rateCardVideo ||
    scraped.affiliateMetrics.suggestedClassification.rateCardVideo ||
    2500000;
  let exclusivityBudgetScore = 14;
  if (detectedCompetitorMentions.length > 0) {
    exclusivityBudgetScore -= Math.min(5, detectedCompetitorMentions.length * 2);
  }
  if (
    criteria.maxBudgetPerVideoVnd &&
    criteria.maxBudgetPerVideoVnd > 0 &&
    estimatedRateCardVnd > criteria.maxBudgetPerVideoVnd * 1.25
  ) {
    exclusivityBudgetScore -= 4;
  }
  exclusivityBudgetScore = Math.max(5, Math.min(15, exclusivityBudgetScore));

  const totalScore =
    catScore + healthScore + styleScore + intentScore + exclusivityBudgetScore;

  const fitVerdict: KocChannelBriefAnalysisReport['briefMatchEvaluation']['fitVerdict'] =
    totalScore >= 82
      ? 'RẤT_KHỚP'
      : totalScore >= 68
      ? 'KHÁ_KHỚP'
      : totalScore >= 52
      ? 'CẦN_CÂN_NHẮC'
      : 'KHÔNG_KHỚP';

  const fitVerdictLabel =
    fitVerdict === 'RẤT_KHỚP'
      ? 'Rất khớp Brief — Ưu tiên chốt lịch Book'
      : fitVerdict === 'KHÁ_KHỚP'
      ? 'Khá khớp — Có thể Book kèm định hướng kịch bản'
      : fitVerdict === 'CẦN_CÂN_NHẮC'
      ? 'Cần cân nhắc — Lệch một số tiêu chí Brief'
      : 'Không khớp — Khác tệp khách hoặc vượt ngân sách';

  const axisScores: KocBriefMatchAxisScore[] = [
    {
      axisKey: 'CATEGORY_PRODUCT_FIT',
      axisLabel: 'Độ khớp Ngành hàng & Tệp sản phẩm',
      score: catScore,
      maxScore: 30,
      status: catScore >= 24 ? 'TỐT' : catScore >= 18 ? 'KHÁ' : 'CẦN_LƯU_Ý',
      evidenceNote: `Ngách chủ đạo của kênh: ${dominantCategories.join(', ')}${
        matchedUspTokens.length > 0
          ? ` · Đã từng nhắc từ khóa: ${matchedUspTokens.join(', ')}`
          : ''
      }`,
    },
    {
      axisKey: 'CHANNEL_VIEW_HEALTH',
      axisLabel: 'Lượt xem trung vị (Median Views) & Độ ổn định',
      score: healthScore,
      maxScore: 20,
      status: healthScore >= 16 ? 'TỐT' : healthScore >= 13 ? 'KHÁ' : 'CẦN_LƯU_Ý',
      evidenceNote: `Quét ${totalScannedVideos} video: Trung vị ${medianViews.toLocaleString('vi-VN')} view · ER ${avgEr}% · Giữ phong độ ${viewConsistencyRatioPct}% số bài`,
    },
    {
      axisKey: 'CONTENT_STYLE_HOOK',
      axisLabel: 'Phong cách quay & Cách mở đầu 3s (Hook)',
      score: styleScore,
      maxScore: 20,
      status: styleScore >= 16 ? 'TỐT' : 'KHÁ',
      evidenceNote: `${dominantStyle} · Tỷ lệ bài gắn giỏ hàng: ${affiliateCartRatioPct}%`,
    },
    {
      axisKey: 'AUDIENCE_BUYING_INTENT',
      axisLabel: 'Tỷ lệ khách hỏi mua thật dưới bình luận',
      score: intentScore,
      maxScore: 15,
      status: intentScore >= 12 ? 'TỐT' : 'KHÁ',
      evidenceNote: `Tỷ lệ bình luận hỏi mua/xin tư vấn đạt ${buyingIntentRatePct}% trên mẫu ${allComments.length} bình luận`,
    },
    {
      axisKey: 'EXCLUSIVITY_AND_BUDGET',
      axisLabel: 'An toàn xung đột Đối thủ & Định mức Cast',
      score: exclusivityBudgetScore,
      maxScore: 15,
      status:
        exclusivityBudgetScore >= 12
          ? 'TỐT'
          : exclusivityBudgetScore >= 9
          ? 'KHÁ'
          : 'CẦN_LƯU_Ý',
      evidenceNote:
        detectedCompetitorMentions.length > 0
          ? `Phát hiện ${detectedCompetitorMentions.length} video từng nhắc đối thủ (${detectedCompetitorMentions.map((d) => d.competitorName).join(', ')})`
          : `Không đụng hàng đối thủ trực tiếp · Định mức cast dự kiến: ${estimatedRateCardVnd.toLocaleString('vi-VN')}đ`,
    },
  ];

  const historicalBrands = Array.from(
    new Set(
      [
        existingKoc?.brandName,
        ...historicalAiredForKoc.map((d) => d.brandName),
      ].filter((b): b is string => Boolean(b))
    )
  );

  const whyMatchStrengths: string[] = [
    `Kênh duy trì lượt xem trung vị ${medianViews.toLocaleString('vi-VN')} view/bài trên ${totalScannedVideos} video quét thực tế (độ ổn định ${viewConsistencyRatioPct}%).`,
    `Phong cách "${dominantStyle}" khớp với tệp người xem: ${detectViewerPersonasFromComments(allComments.map((c) => c.text)).join('; ')}.`,
  ];
  if (historicalBrands.length > 0) {
    whyMatchStrengths.push(
      `Đã có lịch sử hợp tác thực tế tại UpBase B2C (${historicalAiredForKoc.length || 1} đơn · Nhãn hàng: ${historicalBrands.join(', ')}).`
    );
  }

  const riskWarnings: string[] = [];
  if (detectedCompetitorMentions.length > 0) {
    riskWarnings.push(
      `Kênh từng lên video nhắc tới đối thủ (${detectedCompetitorMentions.map((c) => c.competitorName).join(', ')}) — cần kiểm tra điều khoản độc quyền ngành hàng.`
    );
  }
  if (affiliateCartRatioPct > 80) {
    riskWarnings.push(
      `Tỷ lệ video gắn giỏ hàng khá dày (${affiliateCartRatioPct}%) — nên yêu cầu KOC mở đầu bằng tình huống đời thường trước khi đưa sản phẩm vào khung hình.`
    );
  }
  if (
    criteria.maxBudgetPerVideoVnd &&
    criteria.maxBudgetPerVideoVnd > 0 &&
    estimatedRateCardVnd > criteria.maxBudgetPerVideoVnd
  ) {
    riskWarnings.push(
      `Định mức cast dự kiến (${estimatedRateCardVnd.toLocaleString('vi-VN')}đ) cao hơn trần ngân sách Brief (${criteria.maxBudgetPerVideoVnd.toLocaleString('vi-VN')}đ) — cần đàm phán gói combo hoặc đổi sang deal Affiliate kèm hoa hồng.`
    );
  }
  if (riskWarnings.length === 0) {
    riskWarnings.push(
      'Không phát hiện rủi ro xung đột nhãn hàng hoặc bất thường về tỷ lệ tương tác.'
    );
  }

  const targetProductText =
    criteria.productName || `sản phẩm chủ lực ${criteria.brandName}`;
  const primaryUspText =
    (criteria.requiredUspKeywords || []).slice(0, 3).join(', ') ||
    'công thức lành tính, hiệu quả thực tế';

  const defaultTailoredHook3s = `"Đừng vội mua ${targetProductText} của ${criteria.brandName} nếu bạn chưa xem kỹ điểm khác biệt thực tế này trên da!"`;
  const defaultRecommendedAngle = `Khai thác đúng thế mạnh "${dominantStyle}" của @${cleanHandle}: Mở đầu 3 giây bằng câu hỏi nhiều người xem đang thắc mắc dưới phần bình luận, sau đó test trực tiếp ${targetProductText} dưới camera thường nhấn mạnh "${primaryUspText}".`;

  const default4StepScript = [
    {
      stepIndex: 1,
      timeRange: '00:00 - 00:03',
      title: 'Mở đầu giữ chân (Hook 3s theo phong cách kênh)',
      content: defaultTailoredHook3s,
    },
    {
      stepIndex: 2,
      timeRange: '00:03 - 00:10',
      title: 'Nêu vấn đề thực tế của người xem trên kênh',
      content: `Nhắc lại câu hỏi phổ biến của người xem trên kênh @${cleanHandle} và lý do chọn ${targetProductText} để kiểm chứng.`,
    },
    {
      stepIndex: 3,
      timeRange: '00:10 - 00:25',
      title: 'Quay cận cảnh chất sản phẩm & Nhấn mạnh USP Brief',
      content: `Test trực tiếp dưới camera thường, đọc rõ các điểm USP bắt buộc của Brief: ${primaryUspText}.`,
    },
    {
      stepIndex: 4,
      timeRange: '00:25 - 00:35',
      title: 'Chốt kết quả & Điều hướng Giỏ hàng chính hãng',
      content: `Tổng kết cảm nhận thật sau khi dùng và nhắc người xem bấm vào giỏ hàng góc trái gian hàng chính hãng ${criteria.brandName}.`,
    },
  ];

  const baseReport: KocChannelBriefAnalysisReport = {
    id: `koc-brief-${cleanHandle}-${Date.now()}`,
    analyzedAt: new Date().toISOString(),
    handle: cleanHandle,
    nickname: scraped.channelProfile.nickname || cleanHandle,
    avatarUrl: scraped.channelProfile.avatarUrl,
    channelUrl: `https://www.tiktok.com/@${cleanHandle}`,
    bio: scraped.channelProfile.bio,
    tierLabel:
      existingKoc?.tierLabel ||
      scraped.affiliateMetrics.suggestedClassification.tierLabel,
    followers: scraped.channelProfile.followers,
    totalLikes: scraped.channelProfile.totalLikes,
    totalChannelVideos: Math.max(
      scraped.channelProfile.videoCount,
      totalScannedVideos
    ),
    extractedPhone: scraped.channelProfile.extractedPhone,
    extractedEmail: scraped.channelProfile.extractedEmail,
    estimatedRateCardVnd,
    historicalUpbaseDealsCount: historicalAiredForKoc.length,
    historicalUpbaseBrands: historicalBrands,
    videoSampleStats: {
      scannedVideosCount: totalScannedVideos,
      avgViews,
      medianViews,
      minViews,
      maxViews,
      viewConsistencyRatioPct,
      avgEngagementRatePct: avgEr,
      postingFrequencyPerWeek,
      affiliateCartRatioPct,
    },
    contentPersonaProfile: {
      dominantCategories,
      dominantContentStyle: dominantStyle,
      dominantHookPatterns:
        dominantHookPatterns.length > 0
          ? dominantHookPatterns
          : ['Review trực diện sản phẩm'],
      spokenToneSummary,
      topPromotedProducts,
      detectedCompetitorMentions,
    },
    audienceCommentProfile: {
      totalCommentsSampled: allComments.length,
      buyingIntentCount: buyingIntentComments.length,
      buyingIntentRatePct,
      detectedViewerPersonas: detectViewerPersonasFromComments(
        allComments.map((c) => c.text)
      ),
      topBuyerQuestions: allComments.slice(0, 6).map((c) => ({
        username: c.username,
        text: c.text,
        likeCount: c.likeCount,
      })),
    },
    briefMatchEvaluation: {
      brandName: criteria.brandName,
      productName: targetProductText,
      totalScore,
      fitVerdict,
      fitVerdictLabel,
      axisScores,
      whyMatchStrengths,
      riskWarnings,
      recommendedAngleForKoc: defaultRecommendedAngle,
      tailoredHook3sForKoc: defaultTailoredHook3s,
      tailored4StepScript: default4StepScript,
      analysisEngineMode: 'REAL_CRAWL_QUANTITATIVE',
    },
    analyzedVideos,
  };

  onProgress?.(
    `Đang tổng hợp điểm khớp Brief & cá nhân hóa kịch bản cho @${cleanHandle}...`,
    totalScannedVideos
  );

  const llmEnhanced = await tryEnhanceWithLlmIfConfigured(baseReport, criteria);
  if (llmEnhanced.usedLlm) {
    if (llmEnhanced.spokenToneSummary) {
      baseReport.contentPersonaProfile.spokenToneSummary =
        llmEnhanced.spokenToneSummary;
    }
    if (llmEnhanced.recommendedAngleForKoc) {
      baseReport.briefMatchEvaluation.recommendedAngleForKoc =
        llmEnhanced.recommendedAngleForKoc;
    }
    if (llmEnhanced.tailoredHook3sForKoc) {
      baseReport.briefMatchEvaluation.tailoredHook3sForKoc =
        llmEnhanced.tailoredHook3sForKoc;
    }
    if (llmEnhanced.tailored4StepScript) {
      baseReport.briefMatchEvaluation.tailored4StepScript =
        llmEnhanced.tailored4StepScript;
    }
    baseReport.briefMatchEvaluation.analysisEngineMode = 'REAL_CRAWL_PLUS_LLM';
  }

  return baseReport;
}

/**
 * Khởi tạo tiến trình chạy ngầm (Background Job) phân tích hàng loạt kênh KOC & đối chiếu Brief Brand.
 * Trả về ngay lập tức `job` để giao diện không bị treo chờ khi quét số lượng video lớn (40-80 video/kênh).
 */
export function enqueueKocBriefAnalysisJob(
  rawHandlesInput: string | string[],
  criteria: BrandBriefCriteriaInput
): KocBriefAnalysisBackgroundJob {
  const handles = parseTikTokHandles(rawHandlesInput).slice(0, 20);
  const store = getJobStore();

  const videoScanLimitPerChannel = Math.min(
    Math.max(criteria.videoScanLimit || 40, 12),
    80
  );

  const jobId = `JOB-KOC-${Date.now().toString().slice(-6)}-${Math.random()
    .toString(36)
    .slice(2, 5)
    .toUpperCase()}`;

  const { llmConfig: _omitLlm, ...publicCriteria } = criteria;
  void _omitLlm;

  const job: KocBriefAnalysisBackgroundJob = {
    jobId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'QUEUED',
    progressPct: 5,
    currentStepLabel: `Đã đưa ${handles.length} kênh KOC vào hàng đợi chạy ngầm (${videoScanLimitPerChannel} video/kênh)...`,
    handles,
    completedHandlesCount: 0,
    videoScanLimitPerChannel,
    totalVideosScannedSoFar: 0,
    briefCriteria: publicCriteria,
    results: [],
  };

  // Giữ tối đa 30 job gần nhất trong bộ nhớ
  if (store.jobs.size >= 30) {
    const oldestKey = store.jobs.keys().next().value;
    if (oldestKey) store.jobs.delete(oldestKey);
  }
  store.jobs.set(jobId, job);

  // Chạy ngầm không chặn phản hồi HTTP
  setTimeout(() => {
    void runBackgroundJob(jobId, criteria);
  }, 10);

  return job;
}

async function runBackgroundJob(
  jobId: string,
  criteria: BrandBriefCriteriaInput
): Promise<void> {
  const store = getJobStore();
  const job = store.jobs.get(jobId);
  if (!job) return;

  job.status = 'RUNNING';
  job.progressPct = 10;
  job.updatedAt = new Date().toISOString();

  try {
    const totalHandles = Math.max(1, job.handles.length);
    for (let idx = 0; idx < job.handles.length; idx++) {
      const h = job.handles[idx];
      const basePct = Math.round((idx / totalHandles) * 85) + 10;
      job.progressPct = basePct;
      job.currentStepLabel = `[Kênh ${idx + 1}/${totalHandles}] Đang quét @${h} (tối đa ${job.videoScanLimitPerChannel} video)...`;
      job.updatedAt = new Date().toISOString();

      const report = await analyzeSingleKocChannelForBrief(
        h,
        criteria,
        (stepLabel, scannedCount) => {
          job.currentStepLabel = `[Kênh ${idx + 1}/${totalHandles}] ${stepLabel}`;
          job.progressPct = Math.min(
            95,
            basePct + Math.round((1 / totalHandles) * 40)
          );
          if (scannedCount > 0) {
            const prevVideos = job.results.reduce(
              (s, r) => s + r.videoSampleStats.scannedVideosCount,
              0
            );
            job.totalVideosScannedSoFar = prevVideos + scannedCount;
          }
          job.updatedAt = new Date().toISOString();
        }
      );

      job.results.push(report);
      job.completedHandlesCount = job.results.length;
      job.totalVideosScannedSoFar = job.results.reduce(
        (s, r) => s + r.videoSampleStats.scannedVideosCount,
        0
      );
      job.results.sort(
        (a, b) =>
          b.briefMatchEvaluation.totalScore - a.briefMatchEvaluation.totalScore
      );
      job.updatedAt = new Date().toISOString();
    }

    job.status = 'COMPLETED';
    job.progressPct = 100;
    job.completedAt = new Date().toISOString();
    job.updatedAt = new Date().toISOString();
    job.currentStepLabel = `Hoàn tất phân tích ${job.results.length} kênh KOC (${job.totalVideosScannedSoFar} video đã quét & đối chiếu Brief ${criteria.brandName}).`;
  } catch (err) {
    job.status = 'FAILED';
    job.errorMessage =
      err instanceof Error
        ? err.message
        : 'Lỗi trong quá trình phân tích kênh KOC chạy ngầm.';
    job.currentStepLabel = job.errorMessage;
    job.updatedAt = new Date().toISOString();
  }
}

export function getKocBriefAnalysisJob(
  jobId: string
): KocBriefAnalysisBackgroundJob | null {
  return getJobStore().jobs.get(jobId) || null;
}

export function listKocBriefAnalysisJobs(): KocBriefAnalysisBackgroundJob[] {
  return Array.from(getJobStore().jobs.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}
