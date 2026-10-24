import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import {
  extractTikTokShopAnchorInfo,
  fetchTikTokHtmlWithWafBypass,
} from '@/lib/tiktokOpenSourceEngines';
import {
  decodeTikTokVideoIdTimestamp,
  detectProductMentionMoments,
  extractHandleAndVideoIdFromUrl,
  formatVnDateTime,
  parseWebVttToSegments,
  type TikTokProductMentionMoment,
  type TikTokSubtitleSegment,
} from '@/lib/tiktokVideoInspector';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface StreamSessionEntry {
  streamUrls: string[];
  cookies?: string;
  referer: string;
  createdAt: number;
}

const globalForStreamSessions = globalThis as unknown as {
  __upbaseVideoStreamSessions?: Map<string, StreamSessionEntry>;
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

function formatSecLabel(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export interface SuggestedVideoFrameMoment {
  sec: number;
  timeLabel: string;
  reason: string;
  matchedTerm?: string;
  quote?: string;
  isPrimaryProductMoment?: boolean;
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
    if (addedSecs.has(roundedKey)) return;
    addedSecs.add(roundedKey);
    suggestions.push({
      ...item,
      sec: clampedSec,
      timeLabel: formatSecLabel(clampedSec),
    });
  };

  // 1. Ưu tiên các mốc giây nhắc tên sản phẩm / thương hiệu trong phụ đề
  for (const m of params.productMentionMoments) {
    pushMoment({
      sec: m.startSec,
      timeLabel: formatSecLabel(m.startSec),
      reason: `KOC nhắc "${m.matchedTerm}"`,
      matchedTerm: m.matchedTerm,
      quote: m.quote,
      isPrimaryProductMoment: true,
    });
    const midSec = Math.min(duration - 1, m.startSec + 1.5);
    pushMoment({
      sec: midSec,
      timeLabel: formatSecLabel(midSec),
      reason: `Cận cảnh sau khi nhắc "${m.matchedTerm}" (+1.5s)`,
      matchedTerm: m.matchedTerm,
      quote: m.quote,
      isPrimaryProductMoment: true,
    });
  }

  // 2. Bổ sung các mốc giây chuẩn trong kịch bản review (Hook 2s, Giơ SP 4s, Trải nghiệm 8s, Giỏ hàng cuối video)
  const fallbackStandardPoints: Array<{ sec: number; label: string }> = [
    { sec: 2, label: 'Mở đầu (Hook 3s đầu)' },
    { sec: 4, label: 'Đưa sản phẩm lên khung hình (00:04)' },
    { sec: 7, label: 'Cận cảnh bao bì / chất sản phẩm (00:07)' },
    { sec: Math.min(12, Math.floor(duration * 0.45)), label: 'Trải nghiệm sản phẩm thực tế' },
    { sec: Math.min(18, Math.floor(duration * 0.7)), label: 'Điểm nhấn công dụng chính' },
    { sec: Math.max(3, Math.floor(duration * 0.85)), label: 'Kêu gọi bấm giỏ hàng cuối video' },
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
    });
  }

  return suggestions.sort((a, b) => a.sec - b.sec).slice(0, 8);
}

/**
 * GET /api/integrations/tiktok-koc/video-frame
 * Proxy luồng phát video (.mp4) hoặc ảnh bìa có gắn header CORS sạch
 * để trình duyệt vẽ lên <canvas> và cắt khung hình không bị lỗi bảo mật Tainted Canvas.
 */
export async function GET(req: NextRequest) {
  const streamToken = req.nextUrl.searchParams.get('streamToken')?.trim();
  const imageUrl = req.nextUrl.searchParams.get('imageUrl')?.trim();

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
 * Phân tích link video TikTok, trích xuất danh sách mốc giây xuất hiện sản phẩm
 * và tạo đường dẫn luồng phát MP4 (qua proxy nội bộ) để cắt khung hình nghiệm thu.
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
    if (!/^https?:\/\//i.test(rawUrl)) {
      rawUrl = `https://${rawUrl}`;
    }

    const brandName = typeof body?.brandName === 'string' ? body.brandName.trim() : undefined;
    const productName = typeof body?.productName === 'string' ? body.productName.trim() : undefined;
    const uspKeywords: string[] = Array.isArray(body?.uspKeywords) ? body.uspKeywords : [];

    let resolvedUrl = rawUrl;
    const initialExtracted = extractHandleAndVideoIdFromUrl(resolvedUrl);
    const urlHandle = initialExtracted.handle;
    let urlVideoId = initialExtracted.videoId;

    let authorHandle = urlHandle || '';
    let authorNickname = urlHandle || 'KOC';
    let caption = '';
    let durationSeconds = 22;
    let publishedTimeFormatted = '';
    let coverUrl = '';
    let originCoverUrl = '';
    let cartAnchorTitle = '';
    let subtitleSegments: TikTokSubtitleSegment[] = [];
    const onScreenStickers: string[] = [];
    const candidateStreamUrls: string[] = [];
    let sessionCookies: string | undefined;

    // 1. Gọi TikTok oEmbed để lấy nhanh thông tin cơ bản và ảnh bìa
    try {
      const oembedRes = await fetch(
        `https://www.tiktok.com/oembed?url=${encodeURIComponent(resolvedUrl)}`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          },
          signal: AbortSignal.timeout(4500),
          cache: 'no-store',
        }
      );
      if (oembedRes.ok) {
        const oembedJson = await oembedRes.json();
        caption = oembedJson.title || caption;
        authorNickname = oembedJson.author_name || authorNickname;
        authorHandle = (oembedJson.author_unique_id || authorHandle).toLowerCase();
        coverUrl = oembedJson.thumbnail_url || coverUrl;
        if (oembedJson.embed_product_id && !urlVideoId) {
          urlVideoId = String(oembedJson.embed_product_id);
          if (authorHandle) {
            resolvedUrl = `https://www.tiktok.com/@${authorHandle}/video/${urlVideoId}`;
          }
        }
      }
    } catch {
      // Tiếp tục qua bước 2
    }

    // 2. Truy cập trang HTML của video (vượt SlardarWAF) để lấy playAddr (.mp4), cookies, phụ đề WebVTT và giỏ hàng
    try {
      const fetched = await fetchTikTokHtmlWithWafBypass(resolvedUrl, 6500);
      if (fetched) {
        resolvedUrl = fetched.finalUrl || resolvedUrl;
        sessionCookies = fetched.cookies;
        const extracted = extractHandleAndVideoIdFromUrl(resolvedUrl);
        if (extracted.handle) authorHandle = extracted.handle;
        if (extracted.videoId) urlVideoId = extracted.videoId;

        const scriptMatch = fetched.html.match(
          /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/
        );
        if (scriptMatch?.[1]) {
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
            }

            authorHandle = String(itemStruct.author?.uniqueId || authorHandle || '').toLowerCase();
            authorNickname = String(itemStruct.author?.nickname || authorNickname || authorHandle);
            caption = String(itemStruct.desc || caption || '').trim();

            const video = itemStruct.video || {};
            if (Number(video.duration) > 0) {
              durationSeconds = Number(video.duration);
            }
            coverUrl = video.originCover || video.cover || coverUrl;
            originCoverUrl = video.originCover || video.dynamicCover || coverUrl;

            // Lấy danh sách đường dẫn luồng phát MP4 (PlayAddr / DownloadAddr / BitrateInfo)
            const rawPlayUrls: unknown[] = [
              video.playAddr,
              video.downloadAddr,
              ...(Array.isArray(video?.PlayAddrStruct?.UrlList) ? video.PlayAddrStruct.UrlList : []),
              ...(Array.isArray(video?.bitrateInfo)
                ? video.bitrateInfo.flatMap((b: { PlayAddr?: { UrlList?: unknown[] } }) =>
                    Array.isArray(b?.PlayAddr?.UrlList) ? b.PlayAddr.UrlList : []
                  )
                : []),
            ];

            for (const u of rawPlayUrls) {
              if (typeof u === 'string' && u.startsWith('http') && !candidateStreamUrls.includes(u)) {
                candidateStreamUrls.push(u);
              }
            }

            // Chữ chèn trên màn hình
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

            // Giỏ hàng
            const anchorInfo = extractTikTokShopAnchorInfo(itemStruct);
            cartAnchorTitle = anchorInfo.cartAnchorTitle || '';

            // Phụ đề WebVTT để lấy mốc giây nhắc tên sản phẩm
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
                  signal: AbortSignal.timeout(3500),
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
        }
      }
    } catch {
      // Tiếp tục kiểm tra nguồn dự phòng
    }

    // 3. Dự phòng lấy luồng MP4 không khoá cookie qua cổng công khai nếu SSR chưa trả về playAddr hoặc để làm fallback
    try {
      const tikwmRes = await fetch(
        `https://www.tikwm.com/api/?url=${encodeURIComponent(resolvedUrl)}`,
        {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(4500),
          cache: 'no-store',
        }
      );
      if (tikwmRes.ok) {
        const tikwmJson = await tikwmRes.json();
        const data = tikwmJson?.data;
        if (data) {
          const playUrl = data.play || data.hdplay || data.wmplay;
          if (typeof playUrl === 'string' && playUrl.startsWith('http')) {
            // Đưa nguồn MP4 trực tiếp không cần cookie lên đầu để trình duyệt seek nhanh nhất
            candidateStreamUrls.unshift(playUrl);
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
        }
      }
    } catch {
      // Bỏ qua nếu cổng dự phòng không phản hồi
    }

    if (!publishedTimeFormatted && urlVideoId) {
      const decoded = decodeTikTokVideoIdTimestamp(urlVideoId);
      if (decoded) {
        publishedTimeFormatted = formatVnDateTime(decoded).formatted;
      }
    }

    // 4. Dò các mốc giây sản phẩm xuất hiện trong lời thoại
    const mentionDetection = detectProductMentionMoments({
      segments: subtitleSegments,
      brandName,
      productName,
      cartAnchorTitle,
      caption,
      uspKeywords,
    });

    const suggestedMoments = buildSuggestedMoments({
      durationSeconds,
      productMentionMoments: mentionDetection.productMentionMoments,
      subtitleSegments,
      productName: productName || cartAnchorTitle,
      brandName,
    });

    let streamProxyUrl: string | null = null;
    if (candidateStreamUrls.length > 0) {
      const token = randomUUID();
      getStreamSessionMap().set(token, {
        streamUrls: candidateStreamUrls,
        cookies: sessionCookies,
        referer: 'https://www.tiktok.com/',
        createdAt: Date.now(),
      });
      streamProxyUrl = `/api/integrations/tiktok-koc/video-frame?streamToken=${encodeURIComponent(token)}`;
    }

    const proxiedCoverUrl = coverUrl
      ? `/api/integrations/tiktok-koc/video-frame?imageUrl=${encodeURIComponent(coverUrl)}`
      : originCoverUrl
        ? `/api/integrations/tiktok-koc/video-frame?imageUrl=${encodeURIComponent(originCoverUrl)}`
        : null;

    return NextResponse.json({
      success: true,
      data: {
        resolvedUrl,
        videoId: urlVideoId || '',
        authorHandle: authorHandle || 'koc',
        authorNickname: authorNickname || authorHandle || 'KOC',
        caption,
        durationSeconds,
        publishedTimeFormatted,
        cartAnchorTitle,
        onScreenStickers,
        hasDirectVideoStream: Boolean(streamProxyUrl),
        streamProxyUrl,
        proxiedCoverUrl,
        rawCoverUrl: coverUrl || originCoverUrl || null,
        firstProductAppearanceSec: mentionDetection.firstProductAppearanceSec,
        firstProductMentionTerm: mentionDetection.firstProductMentionTerm,
        firstProductMentionQuote: mentionDetection.firstProductMentionQuote,
        productMentionMoments: mentionDetection.productMentionMoments,
        suggestedMoments,
        subtitleSegments,
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
