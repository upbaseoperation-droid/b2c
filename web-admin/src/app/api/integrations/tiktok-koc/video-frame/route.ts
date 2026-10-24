import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import {
  extractTikTokShopAnchorInfo,
  fetchTikTokHtmlWithWafBypass,
} from '@/lib/tiktokOpenSourceEngines';
import {
  decodeTikTokVideoIdTimestamp,
  detectProductMentionMoments,
  extractHandleAndVideoIdFromUrl,
  extractHashtagsAndMentions,
  formatVnDateTime,
  parseWebVttToSegments,
  scanBlacklistViolations,
  type TikTokProductMentionMoment,
  type TikTokSubtitleSegment,
} from '@/lib/tiktokVideoInspector';
import type { VideoAcceptanceInspectionMeta } from '@/lib/contracts/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface StreamSessionEntry {
  streamUrls: string[];
  cookies?: string;
  referer: string;
  createdAt: number;
  frameCache?: Map<string, Buffer>;
}

interface CachedVideoRawMeta {
  resolvedUrl: string;
  videoId: string;
  authorHandle: string;
  authorNickname: string;
  caption: string;
  durationSeconds: number;
  publishedTimeFormatted: string;
  publishedDateVn: string;
  coverUrl: string;
  originCoverUrl: string;
  hasCartAnchor: boolean;
  cartAnchorTitle: string;
  cartProductCount: number;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  savesCount: number;
  subtitleSegments: TikTokSubtitleSegment[];
  onScreenStickers: string[];
  candidateStreamUrls: string[];
  sessionCookies?: string;
  cachedAt: number;
}

const globalForStreamSessions = globalThis as unknown as {
  __upbaseVideoStreamSessions?: Map<string, StreamSessionEntry>;
  __upbaseVideoRawMetaCache?: Map<string, CachedVideoRawMeta>;
  __upbaseFfmpegAvailable?: boolean | null;
};

function getStreamSessionMap(): Map<string, StreamSessionEntry> {
  if (!globalForStreamSessions.__upbaseVideoStreamSessions) {
    globalForStreamSessions.__upbaseVideoStreamSessions = new Map();
  }
  const map = globalForStreamSessions.__upbaseVideoStreamSessions;
  const now = Date.now();
  if (map.size > 150) {
    for (const [k, v] of map.entries()) {
      if (now - v.createdAt > 20 * 60 * 1000 || map.size > 150) {
        map.delete(k);
      }
    }
  }
  return map;
}

function getVideoRawMetaCache(): Map<string, CachedVideoRawMeta> {
  if (!globalForStreamSessions.__upbaseVideoRawMetaCache) {
    globalForStreamSessions.__upbaseVideoRawMetaCache = new Map();
  }
  const map = globalForStreamSessions.__upbaseVideoRawMetaCache;
  const now = Date.now();
  if (map.size > 100) {
    for (const [k, v] of map.entries()) {
      if (now - v.cachedAt > 10 * 60 * 1000 || map.size > 100) {
        map.delete(k);
      }
    }
  }
  return map;
}

async function checkFfmpegAvailable(): Promise<boolean> {
  if (typeof globalForStreamSessions.__upbaseFfmpegAvailable === 'boolean') {
    return globalForStreamSessions.__upbaseFfmpegAvailable;
  }
  const available = await new Promise<boolean>((resolve) => {
    execFile('ffmpeg', ['-version'], { timeout: 2500 }, (err) => {
      resolve(!err);
    });
  });
  globalForStreamSessions.__upbaseFfmpegAvailable = available;
  return available;
}

async function extractSingleFrameWithFfmpeg(
  streamUrl: string,
  sec: number,
  cookies?: string,
  referer?: string
): Promise<Buffer | null> {
  const safeSec = Math.max(0.2, Math.min(300, Math.round(sec * 10) / 10));
  const headerLines: string[] = [
    `Referer: ${referer || 'https://www.tiktok.com/'}`,
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  ];
  if (cookies) {
    headerLines.push(`Cookie: ${cookies}`);
  }

  return new Promise<Buffer | null>((resolve) => {
    const args = [
      '-hide_banner',
      '-loglevel',
      'error',
      '-headers',
      `${headerLines.join('\r\n')}\r\n`,
      '-ss',
      String(safeSec),
      '-i',
      streamUrl,
      '-frames:v',
      '1',
      '-vf',
      'scale=540:-2',
      '-q:v',
      '3',
      '-f',
      'image2pipe',
      '-vcodec',
      'mjpeg',
      'pipe:1',
    ];

    execFile(
      'ffmpeg',
      args,
      { encoding: 'buffer', maxBuffer: 4 * 1024 * 1024, timeout: 9000 },
      (err, stdout) => {
        if (err || !stdout || stdout.length < 512) {
          resolve(null);
          return;
        }
        resolve(stdout);
      }
    );
  });
}

function formatSecLabel(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export type VideoMomentCategory =
  | 'HOLDING_SHOWCASE'
  | 'TEXTURE_DEMO'
  | 'VERBAL_MENTION'
  | 'TIMELINE_FALLBACK';

export interface SuggestedVideoFrameMoment {
  sec: number;
  timeLabel: string;
  reason: string;
  matchedTerm?: string;
  quote?: string;
  isPrimaryProductMoment?: boolean;
  momentCategory?: VideoMomentCategory;
  confidenceScore?: number;
}

const HOLDING_SHOWCASE_REGEX =
  /(?:đang dùng|xài em|dùng em|chai này|lọ này|tuýp này|hộp này|em này|2 chai|hai chai|trên tay|cầm|đây là|giơ|quay cận|bao bì)/i;
const TEXTURE_DEMO_REGEX =
  /(?:bôi|thoa|test|chất kem|chất gel|tạo bọt|thấm|mùi hương|rửa|lên da|trên da)/i;

function classifyMomentCategory(quote?: string): {
  category: VideoMomentCategory;
  score: number;
  badgePrefix: string;
} {
  if (!quote) {
    return { category: 'VERBAL_MENTION', score: 72, badgePrefix: 'KOC nhắc' };
  }
  if (HOLDING_SHOWCASE_REGEX.test(quote)) {
    return { category: 'HOLDING_SHOWCASE', score: 96, badgePrefix: 'KOC cầm SP' };
  }
  if (TEXTURE_DEMO_REGEX.test(quote)) {
    return { category: 'TEXTURE_DEMO', score: 88, badgePrefix: 'Test chất SP' };
  }
  return { category: 'VERBAL_MENTION', score: 76, badgePrefix: 'KOC nhắc' };
}

function buildSuggestedMoments(params: {
  durationSeconds: number;
  productMentionMoments: TikTokProductMentionMoment[];
  subtitleSegments: TikTokSubtitleSegment[];
  productName?: string;
  brandName?: string;
}): SuggestedVideoFrameMoment[] {
  const duration = Math.max(6, Math.min(180, params.durationSeconds || 25));
  const suggestions: SuggestedVideoFrameMoment[] = [];
  const addedSecs = new Set<number>();

  const pushMoment = (item: SuggestedVideoFrameMoment) => {
    const clampedSec = Math.max(0.5, Math.min(duration - 0.5, Math.round(item.sec * 10) / 10));
    const roundedKey = Math.round(clampedSec);
    if (
      addedSecs.has(roundedKey) ||
      suggestions.some((existing) => Math.abs(existing.sec - clampedSec) < 1.4)
    ) {
      return;
    }
    addedSecs.add(roundedKey);
    suggestions.push({
      ...item,
      sec: clampedSec,
      timeLabel: formatSecLabel(clampedSec),
    });
  };

  // 1. Chấm điểm và sắp xếp các mốc KOC cầm / test / nhắc sản phẩm trong phụ đề
  const rankedMentions = [...params.productMentionMoments]
    .map((m) => ({
      moment: m,
      classified: classifyMomentCategory(m.quote),
    }))
    .sort((a, b) => {
      if (b.classified.score !== a.classified.score) {
        return b.classified.score - a.classified.score;
      }
      return a.moment.startSec - b.moment.startSec;
    });

  for (const { moment: m, classified } of rankedMentions) {
    const holdSec = Math.min(duration - 0.5, Math.round((m.startSec + 1.0) * 10) / 10);
    pushMoment({
      sec: holdSec,
      timeLabel: formatSecLabel(holdSec),
      reason: `${classified.badgePrefix} "${m.matchedTerm}"`,
      matchedTerm: m.matchedTerm,
      quote: m.quote,
      isPrimaryProductMoment: true,
      momentCategory: classified.category,
      confidenceScore: classified.score,
    });
  }

  // 1b. Bổ sung khung hình cận cảnh (+1.5s sau khi kết thúc câu giới thiệu sản phẩm) cho các mốc cầm sản phẩm trực tiếp
  for (const { moment: m, classified } of rankedMentions) {
    if (suggestions.length >= 8) break;
    const afterSec = Math.min(duration - 0.5, Math.round((m.endSec + 1.5) * 10) / 10);
    const nextSub = params.subtitleSegments.find(
      (s) => afterSec >= s.startSec - 0.3 && afterSec <= s.endSec + 0.5
    );
    pushMoment({
      sec: afterSec,
      timeLabel: formatSecLabel(afterSec),
      reason: `Cận cảnh bao bì "${m.matchedTerm}"`,
      matchedTerm: m.matchedTerm,
      quote: nextSub?.text || m.quote,
      isPrimaryProductMoment: true,
      momentCategory: classified.category === 'HOLDING_SHOWCASE' ? 'HOLDING_SHOWCASE' : 'TEXTURE_DEMO',
      confidenceScore: Math.max(82, classified.score - 4),
    });
  }

  // 2. Bổ sung các mốc giây chuẩn theo tỷ lệ thời lượng video nếu chưa đủ 8 khung hình
  const fallbackStandardPoints: Array<{ sec: number; label: string; score: number }> = [
    { sec: 2, label: 'Mở đầu (Hook 3s đầu)', score: 58 },
    { sec: 4, label: 'Đưa sản phẩm lên khung hình (00:04)', score: 68 },
    { sec: Math.max(6, Math.round(duration * 0.25)), label: 'Giới thiệu cận cảnh bao bì', score: 66 },
    { sec: Math.max(9, Math.round(duration * 0.45)), label: 'Cầm sản phẩm & trải nghiệm thực tế', score: 70 },
    { sec: Math.max(12, Math.round(duration * 0.65)), label: 'Test chất sản phẩm / Điểm nhấn công dụng', score: 68 },
    { sec: Math.max(4, Math.round(duration * 0.85)), label: 'Kêu gọi bấm giỏ hàng cuối video', score: 60 },
  ];

  for (const pt of fallbackStandardPoints) {
    if (suggestions.length >= 8) break;
    const matchedSub = params.subtitleSegments.find(
      (s) => pt.sec >= s.startSec && pt.sec <= s.endSec + 1
    );
    pushMoment({
      sec: pt.sec,
      timeLabel: formatSecLabel(pt.sec),
      reason: pt.label,
      matchedTerm: params.productName || params.brandName,
      quote: matchedSub?.text,
      isPrimaryProductMoment: false,
      momentCategory: 'TIMELINE_FALLBACK',
      confidenceScore: pt.score,
    });
  }

  return suggestions.slice(0, 8).sort((a, b) => a.sec - b.sec);
}

/**
 * GET /api/integrations/tiktok-koc/video-frame
 * - ?imageUrl=... : Proxy ảnh bìa có CORS sạch
 * - ?streamToken=...&captureSec=... : Cắt trực tiếp 1 khung hình JPEG tại mốc giây yêu cầu bằng ffmpeg trên máy chủ
 * - ?streamToken=... : Proxy luồng phát video (.mp4) có hỗ trợ Range & CORS sạch
 */
export async function GET(req: NextRequest) {
  const streamToken = req.nextUrl.searchParams.get('streamToken')?.trim();
  const imageUrl = req.nextUrl.searchParams.get('imageUrl')?.trim();
  const captureSecRaw = req.nextUrl.searchParams.get('captureSec')?.trim();

  if (imageUrl) {
    try {
      const parsed = new URL(imageUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return new NextResponse('Invalid URL protocol', { status: 400 });
      }
      const imgRes = await fetch(parsed.toString(), {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          Referer: 'https://www.tiktok.com/',
        },
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      });
      if (!imgRes.ok) {
        return new NextResponse('Image fetch failed', { status: 502 });
      }
      const buf = await imgRes.arrayBuffer();
      return new NextResponse(buf, {
        status: 200,
        headers: {
          'Content-Type': imgRes.headers.get('content-type') || 'image/jpeg',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch {
      return new NextResponse('Error fetching image', { status: 502 });
    }
  }

  if (!streamToken) {
    return NextResponse.json(
      { success: false, error: 'Thiếu mã phiên luồng video (streamToken).' },
      { status: 400 }
    );
  }

  const session = getStreamSessionMap().get(streamToken);
  if (!session || session.streamUrls.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Phiên phát video đã hết hạn, vui lòng bấm tải lại video.' },
      { status: 404 }
    );
  }

  // Nhánh cắt trực tiếp khung hình JPEG tại giây `captureSec` trên máy chủ (nhanh & không phụ thuộc codec trình duyệt)
  if (captureSecRaw !== undefined && captureSecRaw !== '') {
    const sec = Number(captureSecRaw);
    if (!Number.isFinite(sec) || sec < 0) {
      return new NextResponse('Invalid captureSec', { status: 400 });
    }
    const cacheKey = sec.toFixed(1);
    if (!session.frameCache) {
      session.frameCache = new Map();
    }
    const cachedBuf = session.frameCache.get(cacheKey);
    if (cachedBuf) {
      return new NextResponse(new Uint8Array(cachedBuf), {
        status: 200,
        headers: {
          'Content-Type': 'image/jpeg',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'private, max-age=1800',
        },
      });
    }

    const hasFfmpeg = await checkFfmpegAvailable();
    if (hasFfmpeg) {
      for (const candidateUrl of session.streamUrls) {
        const frameBuf = await extractSingleFrameWithFfmpeg(
          candidateUrl,
          sec,
          session.cookies,
          session.referer
        );
        if (frameBuf) {
          if (session.frameCache.size < 40) {
            session.frameCache.set(cacheKey, frameBuf);
          }
          return new NextResponse(new Uint8Array(frameBuf), {
            status: 200,
            headers: {
              'Content-Type': 'image/jpeg',
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'private, max-age=1800',
            },
          });
        }
      }
    }
    return new NextResponse('Server frame capture unavailable', { status: 422 });
  }

  const rangeHeader = req.headers.get('range');

  for (const candidateUrl of session.streamUrls) {
    try {
      const headers: Record<string, string> = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Referer: session.referer || 'https://www.tiktok.com/',
        Accept: '*/*',
      };
      if (session.cookies) {
        headers.Cookie = session.cookies;
      }
      if (rangeHeader) {
        headers.Range = rangeHeader;
      }

      const upstream = await fetch(candidateUrl, {
        method: 'GET',
        headers,
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
        cache: 'no-store',
      });

      if (!upstream.ok && upstream.status !== 206) {
        continue;
      }

      const resHeaders = new Headers();
      resHeaders.set('Content-Type', upstream.headers.get('content-type') || 'video/mp4');
      resHeaders.set('Access-Control-Allow-Origin', '*');
      resHeaders.set('Accept-Ranges', upstream.headers.get('accept-ranges') || 'bytes');
      const contentLength = upstream.headers.get('content-length');
      if (contentLength) resHeaders.set('Content-Length', contentLength);
      const contentRange = upstream.headers.get('content-range');
      if (contentRange) resHeaders.set('Content-Range', contentRange);
      resHeaders.set('Cache-Control', 'private, max-age=600');

      return new NextResponse(upstream.body, {
        status: upstream.status,
        headers: resHeaders,
      });
    } catch {
      // Thử URL luồng dự phòng tiếp theo
    }
  }

  return NextResponse.json(
    {
      success: false,
      error: 'Không kết nối được luồng phát video trực tiếp từ CDN TikTok.',
    },
    { status: 502 }
  );
}

/**
 * POST /api/integrations/tiktok-koc/video-frame
 * Phân tích link video TikTok song song (oEmbed + SSR WAF + TikWM), trích xuất danh sách mốc giây
 * KOC cầm/test/nhắc sản phẩm và tạo đường dẫn luồng phát MP4 + cắt khung hình.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let rawUrl = String(body?.videoUrl || body?.url || '').trim();
    if (!rawUrl) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng nhập đường dẫn video cần chụp ảnh nghiệm thu.' },
        { status: 400 }
      );
    }
    // Bắt URL TikTok sạch nếu người dùng dán cả dòng kèm mã Spark Ads
    const urlMatch = rawUrl.match(/https?:\/\/[^\s"'<>]+tiktok\.com\/[^\s"'<>]+/i);
    if (urlMatch) {
      rawUrl = urlMatch[0];
    } else if (!/^https?:\/\//i.test(rawUrl)) {
      rawUrl = `https://${rawUrl}`;
    }

    const brandName = typeof body?.brandName === 'string' ? body.brandName.trim() : undefined;
    const productName = typeof body?.productName === 'string' ? body.productName.trim() : undefined;
    const uspKeywords: string[] = Array.isArray(body?.uspKeywords) ? body.uspKeywords : [];

    const initialExtracted = extractHandleAndVideoIdFromUrl(rawUrl);
    const cleanTargetUrl =
      initialExtracted.handle && initialExtracted.videoId
        ? `https://www.tiktok.com/@${initialExtracted.handle}/video/${initialExtracted.videoId}`
        : rawUrl.split('?')[0];

    const cacheKey = initialExtracted.videoId || cleanTargetUrl;
    const rawMetaCache = getVideoRawMetaCache();
    let meta = rawMetaCache.get(cacheKey);

    if (!meta || Date.now() - meta.cachedAt > 10 * 60 * 1000) {
      let resolvedUrl = cleanTargetUrl;
      let urlVideoId = initialExtracted.videoId || '';
      let authorHandle = initialExtracted.handle || '';
      let authorNickname = authorHandle || 'KOC';
      let caption = '';
      let durationSeconds = 22;
      let publishedTimeFormatted = '';
      let publishedDateVn = '';
      let coverUrl = '';
      let originCoverUrl = '';
      let hasCartAnchor = false;
      let cartAnchorTitle = '';
      let cartProductCount = 0;
      let viewsCount = 0;
      let likesCount = 0;
      let commentsCount = 0;
      let sharesCount = 0;
      let savesCount = 0;
      let subtitleSegments: TikTokSubtitleSegment[] = [];
      const onScreenStickers: string[] = [];
      const h264StreamUrls: string[] = [];
      const fallbackStreamUrls: string[] = [];
      let sessionCookies: string | undefined;

      // Chạy song song cả 3 nguồn (oEmbed + TikTok SSR HTML + TikWM) để giảm thời gian chờ từ ~9s xuống ~2s
      const [oembedTask, htmlTask, tikwmTask] = await Promise.allSettled([
        fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(cleanTargetUrl)}`, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          },
          signal: AbortSignal.timeout(4000),
          cache: 'no-store',
        }).then((r) => (r.ok ? r.json() : null)),

        fetchTikTokHtmlWithWafBypass(rawUrl, 5800),

        fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(cleanTargetUrl)}`, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(4500),
          cache: 'no-store',
        }).then((r) => (r.ok ? r.json() : null)),
      ]);

      // 1. Kết quả oEmbed
      if (oembedTask.status === 'fulfilled' && oembedTask.value) {
        const oembedJson = oembedTask.value;
        caption = oembedJson.title || caption;
        authorNickname = oembedJson.author_name || authorNickname;
        authorHandle = (oembedJson.author_unique_id || authorHandle).toLowerCase();
        coverUrl = oembedJson.thumbnail_url || coverUrl;
        if (oembedJson.embed_product_id && !urlVideoId) {
          urlVideoId = String(oembedJson.embed_product_id);
        }
      }

      // 2. Kết quả SSR HTML (lấy phụ đề WebVTT, giỏ hàng, chỉ số tương tác và luồng phát H.264)
      if (htmlTask.status === 'fulfilled' && htmlTask.value) {
        const fetched = htmlTask.value;
        resolvedUrl = fetched.finalUrl?.split('?')[0] || resolvedUrl;
        sessionCookies = fetched.cookies;
        const extracted = extractHandleAndVideoIdFromUrl(fetched.finalUrl || resolvedUrl);
        if (extracted.handle) authorHandle = extracted.handle;
        if (extracted.videoId) urlVideoId = extracted.videoId;

        const scriptMatch = fetched.html.match(
          /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/
        );
        if (scriptMatch?.[1]) {
          try {
            const parsed = JSON.parse(scriptMatch[1]);
            const defaultScope = parsed?.__DEFAULT_SCOPE__ || {};
            const itemStruct =
              defaultScope?.['webapp.video-detail']?.itemInfo?.itemStruct ||
              defaultScope?.['webapp.reflow.video.detail']?.itemInfo?.itemStruct;

            if (itemStruct) {
              urlVideoId = String(itemStruct.id || urlVideoId || '');
              const createTimeSec = Number(itemStruct.createTime || 0);
              const pubDate =
                createTimeSec > 0
                  ? new Date(createTimeSec * 1000)
                  : decodeTikTokVideoIdTimestamp(urlVideoId) || null;
              if (pubDate) {
                publishedTimeFormatted = formatVnDateTime(pubDate).formatted;
                publishedDateVn = publishedTimeFormatted.split(' ')[0] || '';
              }

              authorHandle = String(itemStruct.author?.uniqueId || authorHandle || '').toLowerCase();
              authorNickname = String(
                itemStruct.author?.nickname || authorNickname || authorHandle
              );
              caption = String(itemStruct.desc || caption || '').trim();

              const stats = itemStruct.stats || itemStruct.statsV2 || {};
              viewsCount = Math.max(viewsCount, Number(stats.playCount || 0));
              likesCount = Math.max(likesCount, Number(stats.diggCount || 0));
              commentsCount = Math.max(commentsCount, Number(stats.commentCount || 0));
              sharesCount = Math.max(sharesCount, Number(stats.shareCount || 0));
              savesCount = Math.max(savesCount, Number(stats.collectCount || 0));

              const video = itemStruct.video || {};
              if (Number(video.duration) > 0) {
                durationSeconds = Number(video.duration);
              }
              coverUrl = video.originCover || video.cover || coverUrl;
              originCoverUrl = video.originCover || video.dynamicCover || coverUrl;

              // Phân loại ưu tiên luồng H.264 trước ByteVC1/HEVC để trình duyệt giải mã 100%
              if (Array.isArray(video?.bitrateInfo)) {
                for (const b of video.bitrateInfo as Array<{
                  CodecType?: string;
                  PlayAddr?: { UrlList?: unknown[] };
                }>) {
                  const isHevc = /bytevc|hevc|h265/i.test(String(b?.CodecType || ''));
                  const urls = Array.isArray(b?.PlayAddr?.UrlList) ? b.PlayAddr.UrlList : [];
                  for (const u of urls) {
                    if (typeof u === 'string' && u.startsWith('http')) {
                      if (isHevc) {
                        fallbackStreamUrls.push(u);
                      } else {
                        h264StreamUrls.push(u);
                      }
                    }
                  }
                }
              }

              const directPlayCandidates: unknown[] = [
                video.playAddr,
                video.downloadAddr,
                ...(Array.isArray(video?.PlayAddrStruct?.UrlList)
                  ? video.PlayAddrStruct.UrlList
                  : []),
              ];
              for (const u of directPlayCandidates) {
                if (typeof u === 'string' && u.startsWith('http')) {
                  h264StreamUrls.push(u);
                }
              }

              if (Array.isArray(itemStruct.stickersOnItem)) {
                for (const st of itemStruct.stickersOnItem) {
                  if (Array.isArray(st?.stickerText)) {
                    for (const t of st.stickerText) {
                      if (typeof t === 'string' && t.trim()) {
                        onScreenStickers.push(t.trim());
                      }
                    }
                  }
                }
              }

              const anchorInfo = extractTikTokShopAnchorInfo(itemStruct);
              hasCartAnchor = Boolean(anchorInfo.hasCartAnchor || anchorInfo.cartAnchorTitle);
              cartAnchorTitle = anchorInfo.cartAnchorTitle || '';
              cartProductCount = Array.isArray(anchorInfo.cartProducts)
                ? anchorInfo.cartProducts.length
                : hasCartAnchor
                  ? 1
                  : 0;

              const captionInfos: Array<{
                languageCodeName?: string;
                LanguageCodeName?: string;
                url?: string;
                Url?: string;
                urlList?: string[];
              }> = [
                ...(Array.isArray(video?.claInfo?.captionInfos) ? video.claInfo.captionInfos : []),
                ...(Array.isArray(video?.subtitleInfos) ? video.subtitleInfos : []),
              ];
              const preferredSub =
                captionInfos.find((c) =>
                  (c.languageCodeName || c.LanguageCodeName || '').toLowerCase().includes('vie')
                ) || captionInfos[0];

              const subUrls = [
                preferredSub?.url,
                preferredSub?.Url,
                ...(Array.isArray(preferredSub?.urlList) ? preferredSub.urlList : []),
              ].filter((u): u is string => typeof u === 'string' && u.trim().length > 0);

              for (const subUrl of subUrls) {
                try {
                  const subRes = await fetch(subUrl, {
                    headers: {
                      'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                      Referer: 'https://www.tiktok.com/',
                    },
                    signal: AbortSignal.timeout(3000),
                    cache: 'no-store',
                  });
                  if (subRes.ok) {
                    const vttText = await subRes.text();
                    const segs = parseWebVttToSegments(vttText);
                    if (segs.length > 0) {
                      subtitleSegments = segs;
                      break;
                    }
                  }
                } catch {
                  // Thử link phụ đề tiếp theo
                }
              }
            }
          } catch {
            // Bỏ qua lỗi parse JSON SSR
          }
        }
      }

      // 3. Kết quả TikWM (luồng MP4 H.264 trực tiếp không khóa cookie + chỉ số tương tác dự phòng)
      if (tikwmTask.status === 'fulfilled' && tikwmTask.value?.data) {
        const data = tikwmTask.value.data;
        const playUrl = data.play || data.wmplay || data.hdplay;
        if (typeof playUrl === 'string' && playUrl.startsWith('http')) {
          h264StreamUrls.unshift(playUrl);
        }
        if (!coverUrl && typeof data.origin_cover === 'string') {
          coverUrl = data.origin_cover;
        }
        if (!authorHandle && data.author?.unique_id) {
          authorHandle = String(data.author.unique_id).toLowerCase();
        }
        if ((!authorNickname || authorNickname === 'KOC') && data.author?.nickname) {
          authorNickname = String(data.author.nickname);
        }
        if (!caption && typeof data.title === 'string') {
          caption = data.title;
        }
        if (Number(data.duration) > 0 && durationSeconds === 22) {
          durationSeconds = Number(data.duration);
        }
        viewsCount = Math.max(viewsCount, Number(data.play_count || 0));
        likesCount = Math.max(likesCount, Number(data.digg_count || 0));
        commentsCount = Math.max(commentsCount, Number(data.comment_count || 0));
        sharesCount = Math.max(sharesCount, Number(data.share_count || 0));
        savesCount = Math.max(savesCount, Number(data.collect_count || data.download_count || 0));
        if (!publishedTimeFormatted && Number(data.create_time) > 0) {
          const dt = new Date(Number(data.create_time) * 1000);
          publishedTimeFormatted = formatVnDateTime(dt).formatted;
          publishedDateVn = publishedTimeFormatted.split(' ')[0] || '';
        }
      }

      if (!publishedTimeFormatted && urlVideoId) {
        const decoded = decodeTikTokVideoIdTimestamp(urlVideoId);
        if (decoded) {
          publishedTimeFormatted = formatVnDateTime(decoded).formatted;
          publishedDateVn = publishedTimeFormatted.split(' ')[0] || '';
        }
      }

      const dedupedStreams = Array.from(new Set([...h264StreamUrls, ...fallbackStreamUrls]));
      meta = {
        resolvedUrl,
        videoId: urlVideoId,
        authorHandle,
        authorNickname,
        caption,
        durationSeconds,
        publishedTimeFormatted,
        publishedDateVn,
        coverUrl,
        originCoverUrl,
        hasCartAnchor,
        cartAnchorTitle,
        cartProductCount,
        viewsCount,
        likesCount,
        commentsCount,
        sharesCount,
        savesCount,
        subtitleSegments,
        onScreenStickers,
        candidateStreamUrls: dedupedStreams,
        sessionCookies,
        cachedAt: Date.now(),
      };
      if (dedupedStreams.length > 0) {
        rawMetaCache.set(cacheKey, meta);
      }
    }

    // 4. Dò các mốc giây sản phẩm xuất hiện trong lời thoại
    const mentionDetection = detectProductMentionMoments({
      segments: meta.subtitleSegments,
      brandName,
      productName,
      cartAnchorTitle: meta.cartAnchorTitle,
      caption: meta.caption,
      uspKeywords,
    });

    const suggestedMoments = buildSuggestedMoments({
      durationSeconds: meta.durationSeconds,
      productMentionMoments: mentionDetection.productMentionMoments,
      subtitleSegments: meta.subtitleSegments,
      productName: productName || meta.cartAnchorTitle,
      brandName,
    });

    // 5. Tổng hợp thông tin nghiệm thu Link Air: Chỉ số tương tác, Kịch bản, Hashtag, Từ cấm & Giỏ hàng
    const { hashtags } = extractHashtagsAndMentions(meta.caption);
    const fullTranscript = meta.subtitleSegments.map((s) => s.text).join(' ');
    const combinedCheckText = [
      meta.caption,
      fullTranscript,
      ...meta.onScreenStickers,
    ]
      .filter(Boolean)
      .join(' ');
    const violatedWords = scanBlacklistViolations(combinedCheckText);
    const matchedProductTerms = Array.from(
      new Set(
        mentionDetection.productMentionMoments
          .map((m) => m.matchedTerm)
          .filter((t): t is string => Boolean(t && t.trim()))
      )
    );
    const engagementRate =
      meta.viewsCount > 0
        ? Math.round(
            ((meta.likesCount + meta.commentsCount + meta.sharesCount) / meta.viewsCount) * 10000
          ) / 100
        : 0;
    const wordCount = fullTranscript
      ? fullTranscript.trim().split(/\s+/).filter(Boolean).length
      : 0;
    const scriptVerdict: VideoAcceptanceInspectionMeta['scriptVerdict'] =
      violatedWords.length > 0
        ? 'VI_PHẠM_TỪ_CẤM'
        : matchedProductTerms.length > 0 || meta.hasCartAnchor
          ? 'ĐẠT_CHUẨN'
          : 'CẦN_KIỂM_TRA';
    const scriptSummaryNote =
      violatedWords.length > 0
        ? `Phát hiện ${violatedWords.length} từ cần lưu ý chính sách (${violatedWords.map((v) => v.word).join(', ')})`
        : matchedProductTerms.length > 0
          ? `KOC nhắc tên sản phẩm ${mentionDetection.productMentionMoments.length} lần (${matchedProductTerms.join(', ')}) · Không vi phạm từ cấm`
          : meta.subtitleSegments.length > 0
            ? `Đã bóc tách ${meta.subtitleSegments.length} câu thoại (${wordCount} từ) · Không vi phạm từ cấm`
            : 'Video nhạc nền / chưa có phụ đề rời · Không phát hiện từ cấm trong mô tả';

    const inspectionMeta: VideoAcceptanceInspectionMeta = {
      resolvedUrl: meta.resolvedUrl,
      videoId: meta.videoId || '',
      authorHandle: meta.authorHandle || 'koc',
      authorNickname: meta.authorNickname || meta.authorHandle || 'KOC',
      publishedTimeFormatted: meta.publishedTimeFormatted,
      publishedDateVn:
        meta.publishedDateVn || (meta.publishedTimeFormatted || '').split(' ')[0] || '',
      durationSeconds: meta.durationSeconds,
      caption: meta.caption,
      hashtags,
      hasCartAnchor: Boolean(meta.hasCartAnchor || meta.cartAnchorTitle),
      cartAnchorTitle: meta.cartAnchorTitle || undefined,
      cartProductCount: meta.cartProductCount,
      viewsCount: meta.viewsCount,
      likesCount: meta.likesCount,
      commentsCount: meta.commentsCount,
      sharesCount: meta.sharesCount,
      savesCount: meta.savesCount,
      engagementRate,
      hasSubtitles: meta.subtitleSegments.length > 0,
      transcriptSnippet: fullTranscript ? fullTranscript.slice(0, 360) : undefined,
      wordCount,
      matchedProductTerms,
      violatedWords,
      scriptVerdict,
      scriptSummaryNote,
    };

    let streamProxyUrl: string | null = null;
    let streamToken: string | null = null;
    if (meta.candidateStreamUrls.length > 0) {
      streamToken = randomUUID();
      getStreamSessionMap().set(streamToken, {
        streamUrls: meta.candidateStreamUrls,
        cookies: meta.sessionCookies,
        referer: 'https://www.tiktok.com/',
        createdAt: Date.now(),
      });
      streamProxyUrl = `/api/integrations/tiktok-koc/video-frame?streamToken=${encodeURIComponent(streamToken)}`;
    }

    const proxiedCoverUrl = meta.coverUrl
      ? `/api/integrations/tiktok-koc/video-frame?imageUrl=${encodeURIComponent(meta.coverUrl)}`
      : meta.originCoverUrl
        ? `/api/integrations/tiktok-koc/video-frame?imageUrl=${encodeURIComponent(meta.originCoverUrl)}`
        : null;

    const serverFrameCaptureAvailable =
      Boolean(streamToken) && (await checkFfmpegAvailable());

    return NextResponse.json({
      success: true,
      data: {
        resolvedUrl: meta.resolvedUrl,
        videoId: meta.videoId || '',
        authorHandle: meta.authorHandle || 'koc',
        authorNickname: meta.authorNickname || meta.authorHandle || 'KOC',
        caption: meta.caption,
        durationSeconds: meta.durationSeconds,
        publishedTimeFormatted: meta.publishedTimeFormatted,
        cartAnchorTitle: meta.cartAnchorTitle,
        onScreenStickers: meta.onScreenStickers,
        hasDirectVideoStream: Boolean(streamProxyUrl),
        streamToken,
        streamProxyUrl,
        serverFrameCaptureAvailable,
        proxiedCoverUrl,
        rawCoverUrl: meta.coverUrl || meta.originCoverUrl || null,
        firstProductAppearanceSec: mentionDetection.firstProductAppearanceSec,
        firstProductMentionTerm: mentionDetection.firstProductMentionTerm,
        firstProductMentionQuote: mentionDetection.firstProductMentionQuote,
        productMentionMoments: mentionDetection.productMentionMoments,
        suggestedMoments,
        subtitleSegments: meta.subtitleSegments,
        inspectionMeta,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: (err as Error).message || 'Không thể tải thông tin khung hình video.',
      },
      { status: 500 }
    );
  }
}
