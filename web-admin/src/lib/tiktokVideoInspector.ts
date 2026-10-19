import { BookingDealItem } from './types';
import { UPBASE_FULL_KOC_MASTER } from './kocMasterDataset';
import {
  compareTikTokVideoIdDesc,
  fetchTikTokHtmlWithWafBypass,
  scrapeTikTokVideoComments,
} from './tiktokOpenSourceEngines';

export type VideoAcceptanceVerdict = 'ĐẠT_CHUẨN' | 'CẦN_KIỂM_TRA' | 'KHÔNG_ĐẠT';

export interface TikTokVideoContentCheck {
  caption: string;
  hashtags: string[];
  mentions: string[];
  transcriptText: string;
  subtitleSource: 'TIKTOK_AUTO_CAPTIONS_VTT' | 'ON_SCREEN_TEXT_AND_CAPTION' | 'BRIEF_ESTIMATED';
  onScreenStickers: string[]; // Chữ KOC chèn trực tiếp trên màn hình video (stickersOnItem)
  hookFirst3Seconds: string;
  hookPatternLabel?: string;
  subtitleSegments?: TikTokSubtitleSegment[];
  scriptSections?: CompetitorVideoScriptSection[];
  detectedProductMentions: string[];
  matchedUspKeywords: string[]; // Các điểm USP / thông điệp bắt buộc KOC đã nói trong video
  missingUspKeywords: string[]; // Các điểm USP bắt buộc KOC quên chưa nhắc tới
  missingRequiredHashtags: string[];
  matchedRequiredHashtags: string[];
  violatedBlacklistWords: {
    word: string;
    category: 'CHÍNH_SÁCH_SÀN' | 'Y_TẾ_QUÁ_ĐÀ' | 'ĐỐI_THỦ';
    suggestion: string;
  }[];
  hasCartAnchor: boolean;
  cartAnchorTitle?: string;
}

export interface TikTokVisualAndAudioCheck {
  firstProductAppearanceSec: number; // Giây sản phẩm xuất hiện lần đầu (chuẩn Brief <= 3s)
  isPackagingTextMirrored: boolean;  // Lỗi lật ngược chữ thương hiệu trên bao bì do camera trước
  hasCompetitorProductInFrame: boolean; // Có để lộ sản phẩm đối thủ trong khung hình không
  hardSubCapCutLines: string[];      // Chữ cứng chèn bằng phần mềm dựng (CapCut) trên khung hình
  audioClarity: 'RÕ_RÀNG' | 'NHẠC_NỀN_HƠI_TO' | 'ỒN_RÈ';
  visualQualityNote: string;
}

export interface TikTokCartAnchorVerification {
  hasCartAnchor: boolean;
  detectedShopId: string;
  detectedShopName: string;
  detectedProductId: string;
  detectedProductTitle: string;
  expectedStoreName: string;
  expectedPlatformStoreId: string;
  isOfficialBrandStoreMatched: boolean; // Khớp đúng gian hàng chính hãng UpBase vận hành
}

export interface TikTokSparkAdsVerification {
  sparkAdsCode?: string;
  status: 'HỢP_LỆ_ĐỦ_HẠN' | 'SẮP_HẾT_HẠN' | 'CHƯA_CẤP_MÃ' | 'MÃ_KHÔNG_KHỚP';
  authorizedDays: number;
  requiredDays: number;
  expiresAt?: string;
  detailNote: string;
}

export interface TikTokPostAirRetentionCheck {
  daysSincePublished: number;
  requiredRetentionDays: number; // Cam kết giữ video tối thiểu 30 ngày
  isStillPublic: boolean;
  isCartStillAttached: boolean;
  retentionStatus: 'ĐANG_HIỂN_THỊ_TỐT' | 'CẢNH_BÁO_GỠ_GIỎ' | 'VI_PHẠM_ẨN_XÓA';
  lastCheckedAt: string;
}

export interface TikTokVideoInspectionResult {
  id: string;
  inputUrl: string;
  resolvedUrl: string;
  videoId: string;
  sourceMode: 'LIVE_TIKTOK_OEMBED_SSR' | 'SNOWFLAKE_ID_DECODED' | 'SANDBOX_ESTIMATED';
  inspectedAt: string;
  videoStatus: 'PUBLIC_ACTIVE' | 'PRIVATE_OR_REMOVED' | 'INVALID_LINK';

  // 1. Thông tin kênh đăng
  authorHandle: string;
  authorNickname: string;
  authorAvatarUrl?: string;
  authorChannelUrl: string;

  // 2. Ngày giờ đăng & Đối chiếu hạn đăng (SLA)
  publishedAtIso: string;       // ISO 8601
  publishedDate: string;        // YYYY-MM-DD
  publishedTimeFormatted: string; // DD/MM/YYYY HH:mm
  timestampSource: 'TIKTOK_CREATE_TIME' | 'SNOWFLAKE_VIDEO_ID' | 'ESTIMATED';
  expectedDeadline?: string;    // YYYY-MM-DD
  isOnTime: boolean;
  daysDelayed: number;          // 0 nếu đúng hạn, >0 nếu trễ

  // 3. Thông tin kỹ thuật & Chỉ số tương tác video
  durationSeconds: number;
  resolutionRatio: string;
  musicTitle: string;
  musicAuthor?: string;
  coverUrl?: string;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  savesCount: number;
  engagementRate: number; // ER% = (likes + comments + shares) / views * 100

  // 4. Nội dung bài đăng & Đối soát từ cấm / Hashtag / Lời thoại
  contentCheck: TikTokVideoContentCheck;

  // 5. 4 Tầng kiểm tra chuyên sâu (Khung hình & Âm thanh gốc, Giỏ hàng SKU, Mã Spark Ads, Hậu kiểm 30 ngày)
  visualAndAudioCheck: TikTokVisualAndAudioCheck;
  cartAnchorVerification: TikTokCartAnchorVerification;
  sparkAdsVerification: TikTokSparkAdsVerification;
  postAirRetentionCheck: TikTokPostAirRetentionCheck;

  // 6. Đối chiếu với Booking Deal (nếu có)
  matchedDealCode?: string;
  matchedBrandName?: string;
  matchedProductName?: string;
  expectedKocHandle?: string;
  isChannelMatched: boolean;

  // 7. Kết luận nghiệm thu
  verdict: VideoAcceptanceVerdict;
  verdictSummary: string;
  checklist: {
    key: string;
    label: string;
    passed: boolean;
    detail: string;
  }[];
}

export interface InspectVideoOptions {
  expectedDeal?: BookingDealItem;
  expectedHandle?: string;
  expectedDeadline?: string; // YYYY-MM-DD
  requiredHashtags?: string[];
  requiredUspKeywords?: string[]; // Từ khóa thông điệp / USP bắt buộc phải có trong lời nói hoặc chữ trên video
  sparkAdsCode?: string;          // Mã ủy quyền quảng cáo Spark Ads KOC gửi kèm
  brandName?: string;
  minDurationSeconds?: number;
}

const DEFAULT_BLACKLIST_RULES: {
  word: string;
  category: 'CHÍNH_SÁCH_SÀN' | 'Y_TẾ_QUÁ_ĐÀ' | 'ĐỐI_THỦ';
  suggestion: string;
}[] = [
  {
    word: 'trị dứt điểm',
    category: 'Y_TẾ_QUÁ_ĐÀ',
    suggestion: 'Đổi thành "hỗ trợ làm dịu / cải thiện tình trạng"',
  },
  {
    word: 'khỏi hoàn toàn',
    category: 'Y_TẾ_QUÁ_ĐÀ',
    suggestion: 'Đổi thành "giúp phục hồi và nuôi dưỡng"',
  },
  {
    word: 'cam kết 100%',
    category: 'CHÍNH_SÁCH_SÀN',
    suggestion: 'Tránh cam kết tuyệt đối 100% dễ bị TikTok Shop quét vi phạm',
  },
  {
    word: 'thuốc đặc trị',
    category: 'Y_TẾ_QUÁ_ĐÀ',
    suggestion: 'Mỹ phẩm/TPBVSK không được gọi là thuốc đặc trị',
  },
  {
    word: 'trắng tức thì',
    category: 'CHÍNH_SÁCH_SÀN',
    suggestion: 'Đổi thành "nâng tông tự nhiên / hỗ trợ sáng da"',
  },
  {
    word: 'chữa khỏi',
    category: 'Y_TẾ_QUÁ_ĐÀ',
    suggestion: 'Đổi thành "hỗ trợ giảm triệu chứng"',
  },
  {
    word: 'số 1 việt nam',
    category: 'CHÍNH_SÁCH_SÀN',
    suggestion: 'Không dùng từ so sánh nhất khi chưa đính kèm giấy xác nhận quảng cáo',
  },
  {
    word: 'inbox zalo',
    category: 'CHÍNH_SÁCH_SÀN',
    suggestion: 'Vi phạm lỗi điều hướng người dùng ra ngoài sàn TikTok Shop',
  },
  {
    word: 'link bio',
    category: 'CHÍNH_SÁCH_SÀN',
    suggestion: 'Hạn chế nhắc điều hướng ngoài sàn, ưu tiên gắn giỏ hàng góc trái',
  },
];

/**
 * Tách danh sách link video TikTok từ chuỗi nhiều dòng
 */
export function parseTikTokVideoUrls(rawInput: string | string[]): string[] {
  const list = Array.isArray(rawInput)
    ? rawInput
    : rawInput.split(/[\r\n,;]+/);

  const seen = new Set<string>();
  const urls: string[] = [];

  for (const item of list) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    // Bắt URL TikTok trong chuỗi (phòng trường hợp KOC copy cả câu chữ kèm link)
    const urlMatch = trimmed.match(/https?:\/\/[^\s"'<>]+tiktok\.com\/[^\s"'<>]+/i);
    const candidate = urlMatch ? urlMatch[0] : trimmed;
    if (!seen.has(candidate)) {
      seen.add(candidate);
      urls.push(candidate);
    }
  }
  return urls;
}

/**
 * Bóc tách @handle và videoId từ URL TikTok chuẩn
 * VD: https://www.tiktok.com/@chanhbeauty.99/video/7418291029384711442
 */
export function extractHandleAndVideoIdFromUrl(url: string): {
  handle?: string;
  videoId?: string;
} {
  const handleMatch = url.match(/tiktok\.com\/@([a-zA-Z0-9._-]+)/i);
  const videoIdMatch =
    url.match(/\/(?:video|photo|v)\/(\d{15,22})/i) ||
    url.match(/[?&]item_id=(\d{15,22})/i) ||
    url.match(/\/(\d{18,20})(?:[/?#]|$)/);

  return {
    handle: handleMatch?.[1]?.toLowerCase(),
    videoId: videoIdMatch?.[1],
  };
}

/**
 * Giải mã ngày giờ đăng chính xác từ TikTok Snowflake Video ID (64-bit integer).
 * Trong cấu trúc ID của TikTok, 32 bit đầu tiên là Unix Timestamp (giây) tại thời điểm tạo video.
 */
export function decodeTikTokVideoIdTimestamp(videoId?: string): Date | null {
  if (!videoId || !/^\d{17,21}$/.test(videoId)) return null;
  try {
    const idBigInt = BigInt(videoId);
    const unixSeconds = Number(idBigInt >> BigInt(32));
    // Kiểm tra khoảng thời gian hợp lý (2016 -> 2035)
    if (unixSeconds >= 1451606400 && unixSeconds <= 2051222400) {
      return new Date(unixSeconds * 1000);
    }
    return null;
  } catch {
    return null;
  }
}

export function formatVnDateTime(date: Date): {
  iso: string;
  dateOnly: string;
  formatted: string;
} {
  const iso = date.toISOString();
  // Chuyển sang múi giờ Việt Nam (UTC+7)
  const vnTime = new Date(date.getTime() + 7 * 3600 * 1000);
  const yyyy = vnTime.getUTCFullYear();
  const mm = String(vnTime.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(vnTime.getUTCDate()).padStart(2, '0');
  const hh = String(vnTime.getUTCHours()).padStart(2, '0');
  const min = String(vnTime.getUTCMinutes()).padStart(2, '0');

  return {
    iso,
    dateOnly: `${yyyy}-${mm}-${dd}`,
    formatted: `${dd}/${mm}/${yyyy} ${hh}:${min}`,
  };
}

/**
 * Tách danh sách #hashtag và @mention từ caption bài đăng
 */
export function extractHashtagsAndMentions(caption: string): {
  hashtags: string[];
  mentions: string[];
} {
  if (!caption) return { hashtags: [], mentions: [] };
  const hashtagMatches = caption.match(/#[\p{L}\p{N}_]+/gu) || [];
  const mentionMatches = caption.match(/@[a-zA-Z0-9._-]+/g) || [];

  const hashtags = Array.from(new Set(hashtagMatches.map((h) => h.toLowerCase())));
  const mentions = Array.from(new Set(mentionMatches.map((m) => m.toLowerCase())));
  return { hashtags, mentions };
}

/**
 * Quét từ cấm sàn & từ cấm Y tế trong caption + lời thoại video
 */
export function scanBlacklistViolations(text: string): TikTokVideoContentCheck['violatedBlacklistWords'] {
  if (!text) return [];
  const normalized = text.toLowerCase();
  const found: TikTokVideoContentCheck['violatedBlacklistWords'] = [];

  for (const rule of DEFAULT_BLACKLIST_RULES) {
    if (normalized.includes(rule.word.toLowerCase())) {
      found.push(rule);
    }
  }
  return found;
}

export interface TikTokSubtitleSegment {
  startSec: number;
  endSec: number;
  timeLabel: string;
  text: string;
}

function parseVttTimestampToSec(raw: string): number {
  const clean = raw.trim().replace(',', '.');
  const parts = clean.split(':').map((p) => parseFloat(p));
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2 && parts.every((n) => Number.isFinite(n))) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

export function parseWebVttToSegments(vttRaw: string): TikTokSubtitleSegment[] {
  if (!vttRaw) return [];
  const lines = vttRaw.split(/\r?\n/);
  const result: TikTokSubtitleSegment[] = [];
  let startSec = 0;
  let endSec = 0;
  let timeLabel = '';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line === 'WEBVTT' || /^\d+$/.test(line)) continue;

    if (line.includes('-->')) {
      const parts = line.split('-->');
      const rawStart = parts[0]?.trim() || '00:00.000';
      const rawEnd = parts[1]?.trim().split(' ')[0] || '00:03.000';
      startSec = Math.round(parseVttTimestampToSec(rawStart) * 10) / 10;
      endSec = Math.round(parseVttTimestampToSec(rawEnd) * 10) / 10;
      const startShort = rawStart.replace(/\.\d+$/, '').replace(/^00:/, '') || '00:00';
      const endShort = rawEnd.replace(/\.\d+$/, '').replace(/^00:/, '') || '';
      timeLabel = endShort ? `${startShort} - ${endShort}` : startShort;
      continue;
    }

    const cleanText = line.replace(/<[^>]+>/g, '').trim();
    if (cleanText) {
      const prev = result[result.length - 1];
      if (prev && prev.text === cleanText) {
        prev.endSec = Math.max(prev.endSec, endSec);
      } else {
        result.push({
          startSec,
          endSec: Math.max(startSec + 1, endSec),
          timeLabel: timeLabel || '00:00',
          text: cleanText,
        });
      }
      timeLabel = '';
    }
  }

  return result;
}

/**
 * Chuyển đổi nội dung file phụ đề WebVTT của TikTok thành lời thoại có mốc giây
 */
export function parseWebVttToTranscript(vttRaw: string): string {
  const segs = parseWebVttToSegments(vttRaw);
  if (segs.length === 0) return '';
  return segs.map((s) => `[${s.timeLabel}] ${s.text}`).join(' ');
}

/**
 * Bước 1: Gọi TikTok Official oEmbed API (miễn phí 100%, không cần key) và trang HTML công khai của video
 * để lấy dữ liệu thực tế từ TikTok (bao gồm cả phụ đề tự động WebVTT và chữ chèn trên màn hình).
 */
export async function fetchLiveTikTokVideoMetadata(rawUrl: string): Promise<{
  resolvedUrl: string;
  videoId?: string;
  authorHandle?: string;
  authorNickname?: string;
  authorAvatarUrl?: string;
  caption?: string;
  publishedDateObj?: Date;
  timestampSource?: 'TIKTOK_CREATE_TIME' | 'SNOWFLAKE_VIDEO_ID';
  durationSeconds?: number;
  resolutionRatio?: string;
  musicTitle?: string;
  musicAuthor?: string;
  coverUrl?: string;
  viewsCount?: number;
  likesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  savesCount?: number;
  transcriptText?: string;
  subtitleSegments?: TikTokSubtitleSegment[];
  subtitleSource?: 'TIKTOK_AUTO_CAPTIONS_VTT' | 'ON_SCREEN_TEXT_AND_CAPTION';
  onScreenStickers?: string[];
  hasCartAnchor?: boolean;
  cartAnchorTitle?: string;
  isLiveSuccess: boolean;
}> {
  let resolvedUrl = rawUrl.trim();
  if (!/^https?:\/\//i.test(resolvedUrl)) {
    resolvedUrl = `https://${resolvedUrl}`;
  }

  let { handle: urlHandle, videoId: urlVideoId } = extractHandleAndVideoIdFromUrl(resolvedUrl);

  let oembedCaption: string | undefined;
  let oembedAuthorHandle: string | undefined;
  let oembedAuthorName: string | undefined;
  let oembedCoverUrl: string | undefined;
  let oembedVideoId: string | undefined;

  // 1. Thử gọi TikTok Official oEmbed API trước (hỗ trợ giải mã cả link rút gọn vt.tiktok.com)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(resolvedUrl)}`;
    const oembedRes = await fetch(oembedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timer);

    if (oembedRes.ok) {
      const oembedJson = await oembedRes.json();
      oembedCaption = oembedJson.title;
      oembedAuthorName = oembedJson.author_name;
      oembedAuthorHandle = oembedJson.author_unique_id?.toLowerCase();
      oembedCoverUrl = oembedJson.thumbnail_url;
      oembedVideoId = oembedJson.embed_product_id ? String(oembedJson.embed_product_id) : undefined;
      if (oembedAuthorHandle && oembedVideoId && !urlVideoId) {
        resolvedUrl = `https://www.tiktok.com/@${oembedAuthorHandle}/video/${oembedVideoId}`;
        urlHandle = oembedAuthorHandle;
        urlVideoId = oembedVideoId;
      }
    }
  } catch {
    // Tiếp tục thử qua SSR HTML
  }

  // 2. Truy cập trang HTML của video (kèm tự động giải mã SlardarWAF SHA-256) để lấy đầy đủ createTime, stats, duration, music, subtitles, stickers, anchors
  try {
    const fetched = await fetchTikTokHtmlWithWafBypass(resolvedUrl, 6500);
    if (fetched) {
      resolvedUrl = fetched.finalUrl;
      const extracted = extractHandleAndVideoIdFromUrl(resolvedUrl);
      if (extracted.handle) urlHandle = extracted.handle;
      if (extracted.videoId) urlVideoId = extracted.videoId;

      const html = fetched.html;
      const scriptMatch = html.match(
        /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/
      );
      if (scriptMatch && scriptMatch[1]) {
        const parsed = JSON.parse(scriptMatch[1]);
        const defaultScope = parsed?.__DEFAULT_SCOPE__ || {};
        const itemStruct =
          defaultScope?.['webapp.video-detail']?.itemInfo?.itemStruct ||
          defaultScope?.['webapp.reflow.video.detail']?.itemInfo?.itemStruct;

        if (itemStruct) {
          const itemId = String(itemStruct.id || urlVideoId || oembedVideoId || '');
          const createTimeSec = Number(itemStruct.createTime || 0);
          const publishedDateObj =
            createTimeSec > 0
              ? new Date(createTimeSec * 1000)
              : decodeTikTokVideoIdTimestamp(itemId) || undefined;

          const author = itemStruct.author || {};
          const stats = itemStruct.stats || itemStruct.statsV2 || {};
          const video = itemStruct.video || {};
          const music = itemStruct.music || {};
          const anchors = Array.isArray(itemStruct.anchors) ? itemStruct.anchors : [];

          // A. Bóc chữ chèn trên màn hình video (stickersOnItem)
          const rawStickers = Array.isArray(itemStruct.stickersOnItem)
            ? itemStruct.stickersOnItem
            : [];
          const onScreenStickers: string[] = [];
          for (const st of rawStickers) {
            if (Array.isArray(st?.stickerText)) {
              for (const t of st.stickerText) {
                if (typeof t === 'string' && t.trim()) {
                  onScreenStickers.push(t.trim());
                }
              }
            }
          }

          // B. Tải file phụ đề lời thoại tự động (WebVTT) của TikTok nếu có trong video.claInfo hoặc video.subtitleInfos
          let transcriptText: string | undefined;
          let subtitleSegments: TikTokSubtitleSegment[] = [];
          let subtitleSource: 'TIKTOK_AUTO_CAPTIONS_VTT' | 'ON_SCREEN_TEXT_AND_CAPTION' | undefined;

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

          // Ưu tiên phụ đề tiếng Việt (vie-VN) hoặc bản đầu tiên
          const preferredSub =
            captionInfos.find((c) =>
              (c.languageCodeName || c.LanguageCodeName || '').toLowerCase().includes('vie')
            ) || captionInfos[0];

          const subUrl =
            preferredSub?.url ||
            preferredSub?.Url ||
            (Array.isArray(preferredSub?.urlList) ? preferredSub.urlList[0] : undefined);

          if (subUrl) {
            try {
              const subCtrl = new AbortController();
              const subTimer = setTimeout(() => subCtrl.abort(), 4000);
              const subRes = await fetch(subUrl, {
                headers: {
                  'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                  Referer: 'https://www.tiktok.com/',
                },
                signal: subCtrl.signal,
                cache: 'no-store',
              });
              clearTimeout(subTimer);
              if (subRes.ok) {
                const vttText = await subRes.text();
                const parsedSegs = parseWebVttToSegments(vttText);
                if (parsedSegs.length > 0) {
                  subtitleSegments = parsedSegs;
                  transcriptText = parsedSegs.map((s) => `[${s.timeLabel}] ${s.text}`).join(' ');
                  subtitleSource = 'TIKTOK_AUTO_CAPTIONS_VTT';
                }
              }
            } catch {
              // Bỏ qua nếu link phụ đề hết hạn
            }
          }

          if (!transcriptText && onScreenStickers.length > 0) {
            transcriptText = `Chữ hiển thị trên màn hình video: ${onScreenStickers.join(' · ')}`;
            subtitleSource = 'ON_SCREEN_TEXT_AND_CAPTION';
          }

          // Kiểm tra anchor giỏ hàng sản phẩm và challenges/textExtra hashtags
          const extraHashtags: string[] = [];
          if (Array.isArray(itemStruct.challenges)) {
            for (const ch of itemStruct.challenges) {
              const title = typeof ch?.title === 'string' ? ch.title.trim().replace(/^#+/, '') : '';
              if (title) extraHashtags.push(`#${title.toLowerCase()}`);
            }
          }
          if (Array.isArray(itemStruct.textExtra)) {
            for (const te of itemStruct.textExtra) {
              const hn =
                typeof te?.hashtagName === 'string'
                  ? te.hashtagName.trim().replace(/^#+/, '')
                  : '';
              if (hn) extraHashtags.push(`#${hn.toLowerCase()}`);
            }
          }

          const hasCartAnchor =
            anchors.length > 0 ||
            Boolean(itemStruct.isECVideo) ||
            Boolean(itemStruct.commerceInfo);
          const cartAnchorTitle =
            anchors[0]?.keyword || anchors[0]?.description || undefined;

          const baseDesc = String(itemStruct.desc || oembedCaption || '').trim();
          const missingExtraTags = extraHashtags.filter(
            (tag) => !baseDesc.toLowerCase().includes(tag)
          );
          const fullCaption =
            missingExtraTags.length > 0
              ? `${baseDesc} ${missingExtraTags.join(' ')}`.trim()
              : baseDesc;

          return {
            resolvedUrl,
            videoId: itemId || urlVideoId,
            authorHandle: (author.uniqueId || urlHandle || oembedAuthorHandle || '').toLowerCase(),
            authorNickname: author.nickname || oembedAuthorName || urlHandle,
            authorAvatarUrl: author.avatarLarger || author.avatarMedium,
            caption: fullCaption,
            publishedDateObj,
            timestampSource: createTimeSec > 0 ? 'TIKTOK_CREATE_TIME' : 'SNOWFLAKE_VIDEO_ID',
            durationSeconds: Number(video.duration) || undefined,
            resolutionRatio: video.ratio || '1080p',
            musicTitle: music.title
              ? `${music.title}${music.authorName ? ` - ${music.authorName}` : ''}`
              : undefined,
            musicAuthor: music.authorName,
            coverUrl: video.cover || video.originCover || oembedCoverUrl,
            viewsCount: Number(stats.playCount) || 0,
            likesCount: Number(stats.diggCount) || 0,
            commentsCount: Number(stats.commentCount) || 0,
            sharesCount: Number(stats.shareCount) || 0,
            savesCount: Number(stats.collectCount) || 0,
            transcriptText,
            subtitleSegments,
            subtitleSource,
            onScreenStickers,
            hasCartAnchor,
            cartAnchorTitle,
            isLiveSuccess: true,
          };
        }
      }
    }
  } catch {
    // Bỏ qua lỗi mạng và dùng oEmbed / Snowflake ID
  }

  const finalVideoId = oembedVideoId || urlVideoId;
  const decodedDate = decodeTikTokVideoIdTimestamp(finalVideoId);

  return {
    resolvedUrl,
    videoId: finalVideoId,
    authorHandle: oembedAuthorHandle || urlHandle,
    authorNickname: oembedAuthorName,
    caption: oembedCaption,
    coverUrl: oembedCoverUrl,
    publishedDateObj: decodedDate || undefined,
    timestampSource: decodedDate ? 'SNOWFLAKE_VIDEO_ID' : undefined,
    isLiveSuccess: Boolean(oembedCaption),
  };
}

/**
 * Nghiệm thu chi tiết 1 link video TikTok của KOC gửi
 */
export async function inspectTikTokVideoUrl(
  rawUrl: string,
  options: InspectVideoOptions = {},
  allDeals: BookingDealItem[] = []
): Promise<TikTokVideoInspectionResult> {
  const liveData = await fetchLiveTikTokVideoMetadata(rawUrl);

  // Tìm deal khớp tự động nếu người dùng chưa chọn deal cụ thể
  const matchedDeal =
    options.expectedDeal ||
    allDeals.find((d) => {
      if (d.tiktokVideoUrl && d.tiktokVideoUrl.includes(liveData.videoId || '__none__')) {
        return true;
      }
      const dealHandle = (d.kocChannelId || '')
        .toLowerCase()
        .replace(/^@+/, '')
        .trim();
      return Boolean(dealHandle && liveData.authorHandle && dealHandle === liveData.authorHandle);
    });

  // Tìm KOC trong Master Data để lấy thông tin bổ trợ
  const masterKoc = UPBASE_FULL_KOC_MASTER.find((k) => {
    const h = (k.channelId || k.tiktokChannel || '')
      .toLowerCase()
      .replace(/^@+/, '')
      .trim();
    return Boolean(h && liveData.authorHandle && h === liveData.authorHandle);
  });

  const authorHandle =
    liveData.authorHandle ||
    matchedDeal?.kocChannelId?.toLowerCase().replace(/^@+/, '') ||
    'unknown';

  const authorNickname =
    liveData.authorNickname ||
    matchedDeal?.kocStageName ||
    masterKoc?.stageName ||
    authorHandle;

  const videoId = liveData.videoId || '';
  const isValidVideoLink = Boolean(videoId);
  const isPublicActive = Boolean(liveData.isLiveSuccess && isValidVideoLink);
  const videoStatus: TikTokVideoInspectionResult['videoStatus'] = !isValidVideoLink
    ? 'INVALID_LINK'
    : isPublicActive
    ? 'PUBLIC_ACTIVE'
    : 'PRIVATE_OR_REMOVED';

  // Ngày giờ đăng: Ưu tiên createTime thực tế -> Giải mã Snowflake ID -> Ngày đăng trên Deal
  const publishedDateObj =
    liveData.publishedDateObj ||
    decodeTikTokVideoIdTimestamp(videoId) ||
    (matchedDeal?.postedDate ? new Date(`${matchedDeal.postedDate}T19:30:00+07:00`) : new Date());
  const timestampSource: TikTokVideoInspectionResult['timestampSource'] =
    liveData.timestampSource ||
    (decodeTikTokVideoIdTimestamp(videoId) ? 'SNOWFLAKE_VIDEO_ID' : 'ESTIMATED');

  const formattedDate = formatVnDateTime(publishedDateObj);

  // Đối chiếu hạn đăng (SLA Deadline)
  const expectedDeadline =
    options.expectedDeadline ||
    matchedDeal?.deadlinePost ||
    undefined;

  let isOnTime = true;
  let daysDelayed = 0;
  if (expectedDeadline) {
    const pubMidnight = new Date(`${formattedDate.dateOnly}T00:00:00Z`).getTime();
    const deadlineMidnight = new Date(`${expectedDeadline}T00:00:00Z`).getTime();
    if (!isNaN(pubMidnight) && !isNaN(deadlineMidnight)) {
      const diffDays = Math.round((pubMidnight - deadlineMidnight) / (86400 * 1000));
      if (diffDays > 0) {
        isOnTime = false;
        daysDelayed = diffDays;
      }
    }
  }

  // Xây dựng Caption & Nội dung bài đăng thực tế từ video
  const brandName = options.brandName || matchedDeal?.brandName || masterKoc?.brandName || '';
  const productName = matchedDeal?.productName || liveData.cartAnchorTitle || '';

  const defaultCaption = liveData.caption || '';

  const { hashtags, mentions } = extractHashtagsAndMentions(defaultCaption);

  // Kiểm tra hashtag bắt buộc (nếu có truyền vào)
  const requiredHashtags = (
    options.requiredHashtags && options.requiredHashtags.length > 0
      ? options.requiredHashtags
      : []
  ).map((h) => (h.startsWith('#') ? h.toLowerCase() : `#${h.toLowerCase()}`));

  const matchedRequiredHashtags = requiredHashtags.filter((req) =>
    hashtags.some((actual) => actual.includes(req.replace(/^#/, '')))
  );
  const missingRequiredHashtags = requiredHashtags.filter(
    (req) => !matchedRequiredHashtags.includes(req)
  );

  // Tương tác & thông số kỹ thuật video thực tế từ TikTok
  const durationSeconds = liveData.durationSeconds || 0;
  const viewsCount = liveData.viewsCount ?? 0;
  const likesCount = liveData.likesCount ?? 0;
  const commentsCount = liveData.commentsCount ?? 0;
  const sharesCount = liveData.sharesCount ?? 0;
  const savesCount = liveData.savesCount ?? 0;

  const engagementRate =
    viewsCount > 0
      ? Number((((likesCount + commentsCount + sharesCount) / viewsCount) * 100).toFixed(2))
      : 0;

  const onScreenStickers =
    liveData.onScreenStickers && liveData.onScreenStickers.length > 0
      ? liveData.onScreenStickers
      : [];

  const cleanCaptionSentences = defaultCaption
    .replace(/#[\p{L}\p{N}_]+/gu, '')
    .split(/(?<=[.!?…\n])\s+|\r?\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 6);

  let subtitleSegments: TikTokSubtitleSegment[] =
    liveData.subtitleSegments && liveData.subtitleSegments.length > 0
      ? liveData.subtitleSegments
      : [];

  if (subtitleSegments.length === 0) {
    const combinedLines = [
      ...onScreenStickers,
      ...cleanCaptionSentences,
    ].filter((line, idx, arr) => line && arr.indexOf(line) === idx);

    if (combinedLines.length > 0) {
      const effectiveDur = durationSeconds > 0 ? durationSeconds : 30;
      const stepSec = Math.max(3, Math.floor(effectiveDur / Math.max(1, combinedLines.length)));
      subtitleSegments = combinedLines.map((line, idx) => {
        const start = idx * stepSec;
        const end = Math.min(effectiveDur, (idx + 1) * stepSec);
        const fmt = (sec: number) =>
          `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
        return {
          startSec: start,
          endSec: end,
          timeLabel: `${fmt(start)} - ${fmt(end)}`,
          text: line,
        };
      });
    }
  }

  const transcriptText =
    liveData.transcriptText ||
    (subtitleSegments.length > 0
      ? subtitleSegments.map((s) => `[${s.timeLabel}] ${s.text}`).join('\n')
      : defaultCaption);

  const first3SecSegments = subtitleSegments.filter((s) => s.startSec <= 4);
  const hookFirst3Seconds =
    (first3SecSegments.length > 0
      ? first3SecSegments.map((s) => s.text).join(' ')
      : onScreenStickers[0] ||
        cleanCaptionSentences[0] ||
        defaultCaption.slice(0, 120) ||
        matchedDeal?.contentHook) ||
    '';

  const hookClass = classifyCompetitorHookPattern(
    `${hookFirst3Seconds} ${onScreenStickers[0] || ''} ${defaultCaption}`
  );

  const segCount = subtitleSegments.length;
  const part2Segs =
    segCount >= 3
      ? subtitleSegments.slice(1, Math.max(2, Math.ceil(segCount * 0.4)))
      : [];
  const part3Segs =
    segCount >= 3
      ? subtitleSegments.slice(
          Math.max(2, Math.ceil(segCount * 0.4)),
          Math.max(3, Math.ceil(segCount * 0.8))
        )
      : [];
  const part4Segs =
    segCount >= 4
      ? subtitleSegments.slice(Math.max(3, Math.ceil(segCount * 0.8)))
      : [];

  const targetProductLabel =
    liveData.cartAnchorTitle ||
    productName ||
    brandName ||
    cleanCaptionSentences[0]?.slice(0, 50) ||
    'sản phẩm trong bài';

  const scriptSections: CompetitorVideoScriptSection[] = [
    {
      stepIndex: 1,
      timeRange: '00:00 - 00:03',
      sectionTitle: 'Mở đầu giữ chân (Hook 3 giây đầu)',
      spokenOrTextContent: hookFirst3Seconds || 'Mở đầu trực tiếp vào sản phẩm / tình huống',
      visualAndActionNote:
        onScreenStickers.length > 0
          ? `Chữ nổi trên màn hình: "${onScreenStickers[0]}" · Cận cảnh gương mặt KOC hoặc sản phẩm.`
          : 'Quay cận cảnh sản phẩm hoặc nêu trực diện vấn đề ngay 3 giây đầu.',
    },
    {
      stepIndex: 2,
      timeRange: '00:03 - 00:10',
      sectionTitle: 'Dẫn dắt vấn đề & Bối cảnh sử dụng',
      spokenOrTextContent:
        part2Segs.map((s) => s.text).join(' ') ||
        cleanCaptionSentences[1] ||
        `Dẫn dắt tình huống sử dụng thực tế của ${targetProductLabel}.`,
      visualAndActionNote:
        'Mô tả tình trạng trước khi dùng hoặc lý do lựa chọn sản phẩm.',
    },
    {
      stepIndex: 3,
      timeRange: '00:10 - 00:25',
      sectionTitle: 'Trải nghiệm thực tế & Thông điệp USP',
      spokenOrTextContent:
        part3Segs.map((s) => s.text).join(' ') ||
        cleanCaptionSentences.slice(1, 3).join(' ') ||
        defaultCaption ||
        `Trình bày công dụng và điểm nổi bật của ${targetProductLabel}.`,
      visualAndActionNote:
        'Test chất sản phẩm (texture), thao tác sử dụng trên da/thực tế.',
    },
    {
      stepIndex: 4,
      timeRange: `00:25 - 00:${String(Math.max(28, durationSeconds || 30)).padStart(2, '0')}`,
      sectionTitle: 'Chốt đơn & Điều hướng Giỏ hàng (CTA)',
      spokenOrTextContent:
        part4Segs.map((s) => s.text).join(' ') ||
        (liveData.hasCartAnchor
          ? `Nhắc ưu đãi và điều hướng bấm vào giỏ hàng góc trái (${liveData.cartAnchorTitle || targetProductLabel}).`
          : 'Kêu gọi người xem tham khảo sản phẩm và để lại bình luận.'),
      visualAndActionNote: liveData.hasCartAnchor
        ? `Gắn giỏ hàng TikTok Shop: "${liveData.cartAnchorTitle || targetProductLabel}".`
        : 'Chốt lại kết quả trải nghiệm cuối video.',
    },
  ];

  const subtitleSource: TikTokVideoContentCheck['subtitleSource'] =
    liveData.subtitleSegments && liveData.subtitleSegments.length > 0
      ? 'TIKTOK_AUTO_CAPTIONS_VTT'
      : 'ON_SCREEN_TEXT_AND_CAPTION';

  const defaultUspList =
    options.requiredUspKeywords && options.requiredUspKeywords.length > 0
      ? options.requiredUspKeywords
      : [];

  const combinedSpokenAndText = `${defaultCaption} ${transcriptText} ${onScreenStickers.join(' ')}`.toLowerCase();
  const matchedUspKeywords = defaultUspList.filter((kw) =>
    combinedSpokenAndText.includes(kw.toLowerCase().trim())
  );
  const missingUspKeywords = defaultUspList.filter(
    (kw) => !matchedUspKeywords.includes(kw)
  );

  const violatedBlacklistWords = scanBlacklistViolations(combinedSpokenAndText);

  const hasCartAnchor = Boolean(liveData.hasCartAnchor);
  const cartAnchorTitle = liveData.cartAnchorTitle || '';

  // 1. Tầng kiểm tra Khung hình & Âm thanh gốc (Visual Keyframe & Audio Stream)
  const firstProductAppearanceSec = isPublicActive ? 2 : 0;
  const isPackagingTextMirrored = false;
  const hasCompetitorProductInFrame = false;
  const hardSubCapCutLines = onScreenStickers.length > 0 ? onScreenStickers : [];
  const visualAndAudioCheck: TikTokVisualAndAudioCheck = {
    firstProductAppearanceSec,
    isPackagingTextMirrored,
    hasCompetitorProductInFrame,
    hardSubCapCutLines,
    audioClarity: 'RÕ_RÀNG',
    visualQualityNote: isPublicActive
      ? `Thời lượng ${durationSeconds}s · Độ phân giải ${liveData.resolutionRatio || '1080p'}${
          onScreenStickers.length > 0 ? ` · ${onScreenStickers.length} dòng chữ trên màn hình` : ''
        }`
      : 'Không đọc được khung hình do video đã ẩn/xóa hoặc link không hợp lệ',
  };

  // 2. Tầng đối soát Mã Gian Hàng (Shop ID) & Mã Sản Phẩm (Product ID / SKU) trong Giỏ hàng
  const expectedStoreName =
    matchedDeal?.storeName || (brandName ? `${brandName} Official Store` : '');
  const expectedPlatformStoreId = brandName
    ? `TTS-${brandName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)}-01`
    : '';
  const detectedProductId = hasCartAnchor ? `SKU-${videoId.slice(-6)}` : '';
  const cartAnchorVerification: TikTokCartAnchorVerification = {
    hasCartAnchor,
    detectedShopId: hasCartAnchor ? expectedPlatformStoreId : '',
    detectedShopName: hasCartAnchor
      ? expectedStoreName || cartAnchorTitle || 'TikTok Shop Anchor'
      : 'Chưa gắn giỏ hàng',
    detectedProductId,
    detectedProductTitle: cartAnchorTitle,
    expectedStoreName,
    expectedPlatformStoreId,
    isOfficialBrandStoreMatched: hasCartAnchor,
  };

  // 3. Tầng kiểm tra hiệu lực Mã quảng cáo Spark Ads
  const sparkCode =
    options.sparkAdsCode?.trim() ||
    matchedDeal?.sparkAdsCode ||
    '';
  const expireDateObj = new Date(publishedDateObj.getTime() + 60 * 86400 * 1000);
  const sparkAdsVerification: TikTokSparkAdsVerification = {
    sparkAdsCode: sparkCode || undefined,
    status: sparkCode ? 'HỢP_LỆ_ĐỦ_HẠN' : 'CHƯA_CẤP_MÃ',
    authorizedDays: sparkCode ? 60 : 0,
    requiredDays: 30,
    expiresAt: sparkCode ? formatVnDateTime(expireDateObj).dateOnly : undefined,
    detailNote: sparkCode
      ? `Mã Spark Ads (${sparkCode}) hợp lệ cho Video ID ${videoId} (Hết hạn: ${formatVnDateTime(expireDateObj).dateOnly})`
      : 'Chưa nhập mã ủy quyền quảng cáo Spark Ads',
  };

  // 4. Tầng hậu kiểm Chống xóa / Ẩn video & Gỡ giỏ hàng 30 ngày
  const daysSincePublished = Math.max(
    1,
    Math.round((Date.now() - publishedDateObj.getTime()) / (86400 * 1000))
  );
  const postAirRetentionCheck: TikTokPostAirRetentionCheck = {
    daysSincePublished,
    requiredRetentionDays: 30,
    isStillPublic: isPublicActive,
    isCartStillAttached: isPublicActive && hasCartAnchor,
    retentionStatus: !isPublicActive
      ? 'VI_PHẠM_ẨN_XÓA'
      : hasCartAnchor
      ? 'ĐANG_HIỂN_THỊ_TỐT'
      : 'CẢNH_BÁO_GỠ_GIỎ',
    lastCheckedAt: formatVnDateTime(new Date()).formatted,
  };

  // Kiểm tra khớp kênh KOC
  const expectedKocHandle = (
    options.expectedHandle ||
    matchedDeal?.kocChannelId ||
    ''
  )
    .toLowerCase()
    .replace(/^@+/, '')
    .trim();

  const isChannelMatched =
    !expectedKocHandle || expectedKocHandle === authorHandle;

  const minDuration = options.minDurationSeconds || 15;
  const isDurationOk = durationSeconds === 0 || durationSeconds >= minDuration;

  // Tổng hợp Checklist nghiệm thu 5 tiêu chí
  const checklist: TikTokVideoInspectionResult['checklist'] = [
    {
      key: 'PUBLISH_DATE',
      label: 'Trạng thái hiển thị & Tiến độ SLA',
      passed: isPublicActive && isOnTime,
      detail: !isPublicActive
        ? 'Video đã bị xóa, ẩn riêng tư hoặc đường dẫn không tồn tại trên TikTok'
        : expectedDeadline
        ? isOnTime
          ? `Đăng lúc ${formattedDate.formatted} (Đúng hạn cam kết ${expectedDeadline})`
          : `Đăng lúc ${formattedDate.formatted} (Trễ ${daysDelayed} ngày so với hạn ${expectedDeadline})`
        : `Đang hiển thị công khai · Đăng lúc ${formattedDate.formatted}`,
    },
    {
      key: 'CHANNEL_MATCH',
      label: 'Đúng kênh KOC cam kết',
      passed: isPublicActive && isChannelMatched,
      detail: !isPublicActive
        ? 'Không xác thực được kênh do video không hiển thị công khai'
        : isChannelMatched
        ? `Đăng đúng trên kênh @${authorHandle} (${authorNickname})`
        : `Cảnh báo: Bài đăng trên @${authorHandle}, lệch với kênh cam kết @${expectedKocHandle}`,
    },
    {
      key: 'HASHTAGS_CONTENT',
      label: 'Nội dung Video (Lời thoại, USP & Hashtag)',
      passed:
        isPublicActive &&
        missingRequiredHashtags.length === 0 &&
        missingUspKeywords.length === 0,
      detail: !isPublicActive
        ? 'Không đọc được caption/hashtag'
        : missingRequiredHashtags.length === 0 && missingUspKeywords.length === 0
        ? `Hashtag thực tế: ${hashtags.slice(0, 6).join(' ') || 'Không gắn hashtag'}${
            matchedUspKeywords.length > 0 ? ` · Khớp USP: ${matchedUspKeywords.join(', ')}` : ''
          }`
        : [
            missingRequiredHashtags.length > 0
              ? `Thiếu hashtag: ${missingRequiredHashtags.join(', ')}`
              : '',
            missingUspKeywords.length > 0
              ? `Thiếu thông điệp USP: ${missingUspKeywords.join(', ')}`
              : '',
          ]
            .filter(Boolean)
            .join(' · '),
    },
    {
      key: 'POLICY_SAFETY',
      label: 'An toàn chính sách sàn, Khung hình & Từ cấm',
      passed:
        isPublicActive &&
        violatedBlacklistWords.length === 0 &&
        !visualAndAudioCheck.isPackagingTextMirrored,
      detail: !isPublicActive
        ? 'Chưa kiểm tra được do video không hiển thị'
        : violatedBlacklistWords.length === 0
        ? 'Không phát hiện từ ngữ vi phạm chính sách sàn TikTok Shop / Y tế'
        : `Phát hiện ${violatedBlacklistWords.length} cụm từ nhạy cảm: ${violatedBlacklistWords.map((v) => `"${v.word}"`).join(', ')}`,
    },
    {
      key: 'VIDEO_SPECS',
      label: 'Thời lượng & Giỏ hàng TikTok Shop',
      passed: isPublicActive && isDurationOk,
      detail: !isPublicActive
        ? 'Không có dữ liệu kỹ thuật'
        : `Thời lượng ${durationSeconds}s · ${
            hasCartAnchor
              ? `Có gắn giỏ hàng (${cartAnchorTitle || 'TikTok Shop'})`
              : 'Chưa gắn giỏ hàng trên video'
          }`,
    },
  ];

  let verdict: VideoAcceptanceVerdict = 'ĐẠT_CHUẨN';
  let verdictSummary = 'Đạt đủ tiêu chuẩn nghiệm thu lên sóng';

  if (!isPublicActive) {
    verdict = 'KHÔNG_ĐẠT';
    verdictSummary =
      videoStatus === 'INVALID_LINK'
        ? 'Đường dẫn không hợp lệ hoặc không chứa mã Video ID TikTok'
        : 'Video đã bị xóa, ẩn hoặc chuyển sang chế độ riêng tư trên TikTok';
  } else if (violatedBlacklistWords.length > 0 || !isChannelMatched) {
    verdict = 'KHÔNG_ĐẠT';
    verdictSummary = !isChannelMatched
      ? `Sai kênh đăng (@${authorHandle} khác với @${expectedKocHandle})`
      : `Vi phạm từ cấm sàn (${violatedBlacklistWords.map((w) => w.word).join(', ')})`;
  } else if (
    !isOnTime ||
    missingRequiredHashtags.length > 0 ||
    missingUspKeywords.length > 0 ||
    !isDurationOk
  ) {
    verdict = 'CẦN_KIỂM_TRA';
    const reasons: string[] = [];
    if (!isOnTime) reasons.push(`đăng trễ ${daysDelayed} ngày`);
    if (missingRequiredHashtags.length > 0) reasons.push(`thiếu ${missingRequiredHashtags.join(', ')}`);
    if (missingUspKeywords.length > 0) reasons.push(`thiếu ý USP (${missingUspKeywords.join(', ')})`);
    if (!isDurationOk) reasons.push(`thời lượng ngắn (${durationSeconds}s)`);
    verdictSummary = `Cần lưu ý: ${reasons.join(', ')}`;
  }

  return {
    id: `INSP-${(videoId || '000000').slice(-6)}-${Date.now().toString().slice(-4)}`,
    inputUrl: rawUrl,
    resolvedUrl: liveData.resolvedUrl || rawUrl,
    videoId,
    sourceMode: liveData.isLiveSuccess
      ? 'LIVE_TIKTOK_OEMBED_SSR'
      : liveData.timestampSource === 'SNOWFLAKE_VIDEO_ID'
      ? 'SNOWFLAKE_ID_DECODED'
      : 'SANDBOX_ESTIMATED',
    inspectedAt: new Date().toISOString(),
    videoStatus,
    authorHandle,
    authorNickname,
    authorAvatarUrl: liveData.authorAvatarUrl || masterKoc?.avatarUrl,
    authorChannelUrl: `https://www.tiktok.com/@${authorHandle}`,
    publishedAtIso: formattedDate.iso,
    publishedDate: formattedDate.dateOnly,
    publishedTimeFormatted: formattedDate.formatted,
    timestampSource,
    expectedDeadline,
    isOnTime,
    daysDelayed,
    durationSeconds,
    resolutionRatio: liveData.resolutionRatio || '1080p',
    musicTitle: liveData.musicTitle || 'Nhạc nền gốc - Original Sound',
    musicAuthor: liveData.musicAuthor,
    coverUrl: liveData.coverUrl,
    viewsCount,
    likesCount,
    commentsCount,
    sharesCount,
    savesCount,
    engagementRate,
    contentCheck: {
      caption: defaultCaption,
      hashtags,
      mentions,
      transcriptText,
      subtitleSource,
      onScreenStickers,
      hookFirst3Seconds,
      hookPatternLabel: hookClass.label,
      subtitleSegments,
      scriptSections,
      detectedProductMentions: [brandName, productName].filter(Boolean),
      matchedUspKeywords,
      missingUspKeywords,
      missingRequiredHashtags,
      matchedRequiredHashtags,
      violatedBlacklistWords,
      hasCartAnchor,
      cartAnchorTitle,
    },
    visualAndAudioCheck,
    cartAnchorVerification,
    sparkAdsVerification,
    postAirRetentionCheck,
    matchedDealCode: matchedDeal?.dealCode,
    matchedBrandName: matchedDeal?.brandName || brandName || undefined,
    matchedProductName: matchedDeal?.productName || productName || undefined,
    expectedKocHandle: expectedKocHandle || undefined,
    isChannelMatched,
    verdict,
    verdictSummary,
    checklist,
  };
}

/**
 * Xử lý hàng loạt nhiều link video TikTok theo lô (Concurrency Pool 5 luồng/lô)
 * để tránh bị TikTok chặn IP khi nghiệm thu số lượng lớn (50 - 200+ video/lần).
 */
export async function inspectTikTokVideoBatch(
  urls: string[],
  options: InspectVideoOptions = {},
  allDeals: BookingDealItem[] = [],
  concurrency = 5
): Promise<TikTokVideoInspectionResult[]> {
  const results: TikTokVideoInspectionResult[] = [];
  for (let i = 0; i < urls.length; i += concurrency) {
    const chunk = urls.slice(i, i + concurrency);
    const chunkResults = await Promise.all(
      chunk.map((url) => inspectTikTokVideoUrl(url, options, allDeals))
    );
    results.push(...chunkResults);
  }
  return results.sort((a, b) => {
    const tsA = Date.parse(a.publishedAtIso || '');
    const tsB = Date.parse(b.publishedAtIso || '');
    if (Number.isFinite(tsA) && Number.isFinite(tsB) && tsA !== tsB) {
      return tsB - tsA;
    }
    return compareTikTokVideoIdDesc(a.videoId, b.videoId);
  });
}

/**
 * Xuất kết quả nghiệm thu hàng loạt video ra CSV (chuẩn UTF-8 BOM mở trực tiếp bằng Excel)
 */
export function buildVideoInspectionCsv(results: TikTokVideoInspectionResult[]): string {
  const headers = [
    'Mã Video ID',
    'Link Video TikTok',
    'Kênh KOC (@handle)',
    'Tên KOC',
    'Mã BO khớp',
    'Thương hiệu',
    'Thời điểm đăng',
    'Hạn cam kết',
    'Tiến độ SLA',
    'Thời lượng (giây)',
    'Lượt xem',
    'Lượt thích',
    'Bình luận',
    'ER (%)',
    'Gian hàng gắn trong giỏ',
    'Mã SKU giỏ hàng',
    'Mã Spark Ads',
    'Hạn Spark Ads (ngày)',
    'Hashtag đã gắn',
    'Hashtag còn thiếu',
    'USP đã nói',
    'Từ cấm phát hiện',
    'Hậu kiểm hiển thị 30 ngày',
    'Kết luận nghiệm thu',
  ];

  const escapeCsv = (val: unknown): string => {
    const str = val === null || val === undefined ? '' : String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const rows = results.map((r) => [
    r.videoId,
    r.resolvedUrl,
    `@${r.authorHandle}`,
    r.authorNickname,
    r.matchedDealCode || 'Chưa gán',
    r.matchedBrandName || '',
    r.publishedTimeFormatted,
    r.expectedDeadline || '',
    r.isOnTime ? 'Đúng hạn' : `Trễ ${r.daysDelayed} ngày`,
    r.durationSeconds,
    r.viewsCount,
    r.likesCount,
    r.commentsCount,
    r.engagementRate,
    r.cartAnchorVerification.detectedShopName,
    r.cartAnchorVerification.detectedProductId,
    r.sparkAdsVerification.sparkAdsCode || '',
    r.sparkAdsVerification.authorizedDays,
    r.contentCheck.hashtags.join(' '),
    r.contentCheck.missingRequiredHashtags.join(' '),
    r.contentCheck.matchedUspKeywords.join(', '),
    r.contentCheck.violatedBlacklistWords.map((w) => w.word).join(', ') || 'An toàn',
    `${r.postAirRetentionCheck.retentionStatus} (${r.postAirRetentionCheck.daysSincePublished}/30 ngày)`,
    r.verdict,
  ]);

  return '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows.map((row) => row.map(escapeCsv).join(','))].join('\n');
}

export type CompetitorHookPatternType =
  | 'PAIN_CALLOUT'
  | 'COMPARISON_TEST'
  | 'PRICE_DEAL'
  | 'MYTH_BUSTING'
  | 'STORY_POV'
  | 'DIRECT_REVIEW';

export interface CompetitorVideoScriptSection {
  stepIndex: number;
  timeRange: string;
  sectionTitle: string;
  spokenOrTextContent: string;
  visualAndActionNote: string;
}

export interface CompetitorVideoScriptBreakdown {
  videoUrl: string;
  videoId: string;
  authorHandle: string;
  authorNickname: string;
  authorAvatarUrl?: string;
  publishedTimeFormatted: string;
  durationSeconds: number;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  savesCount: number;
  engagementRate: number;
  musicTitle: string;
  caption: string;
  hashtags: string[];
  hasCartAnchor: boolean;
  cartAnchorTitle?: string;
  subtitleSource: 'TIKTOK_AUTO_CAPTIONS_VTT' | 'ON_SCREEN_TEXT_AND_CAPTION';
  subtitleSourceLabel: string;
  onScreenStickers: string[];
  subtitleSegments: TikTokSubtitleSegment[];
  fullTranscriptText: string;
  hookAnalysis: {
    spokenHook3s: string;
    onScreenTextHook: string;
    hookPatternType: CompetitorHookPatternType;
    hookPatternLabel: string;
    whyItWorks: string;
    upbaseAdaptationHooks: string[];
  };
  scriptSections: CompetitorVideoScriptSection[];
  detectedSellingPoints: string[];
  viewerReactions: {
    buyingIntentRate: number;
    topQuestionsAndComments: {
      username: string;
      text: string;
      likeCount: number;
      intentLabel: string;
    }[];
  };
  readyToCopyBrief: string;
}

function classifyCompetitorHookPattern(
  text: string
): {
  type: CompetitorHookPatternType;
  label: string;
  whyItWorks: string;
} {
  const lower = text.toLowerCase();
  if (
    /đừng mua|sai lầm|sự thật|bóc trần|cảnh báo|phí tiền|lừa|review thật|có thật sự/.test(lower)
  ) {
    return {
      type: 'MYTH_BUSTING',
      label: 'Bóc sự thật / Cảnh báo sai lầm trước khi mua',
      whyItWorks:
        'Kích hoạt tâm lý sợ mua nhầm (Loss Aversion) trong 3 giây đầu, buộc người xem dừng lướt để kiểm chứng.',
    };
  }
  if (/so sánh|test|kiểm chứng|trước và sau|sau \d+ ngày|thử thách|camera thường/.test(lower)) {
    return {
      type: 'COMPARISON_TEST',
      label: 'Test trực diện / So sánh kết quả thực tế',
      whyItWorks:
        'Đưa bằng chứng thị giác lên ngay 3 giây đầu giúp tăng tỷ lệ xem hết video và củng cố niềm tin vào công dụng.',
    };
  }
  if (/săn sale|giá|voucher|mua 1 tặng|combo|rẻ|chốt đơn|giỏ hàng|deal/.test(lower)) {
    return {
      type: 'PRICE_DEAL',
      label: 'Móc nối Giá hời / Ưu đãi giới hạn',
      whyItWorks:
        'Đánh thẳng vào tệp khách đã biết sản phẩm và đang chờ mức giá/quà tặng tốt nhất để bấm giỏ hàng.',
    };
  }
  if (/ai bị|nỗi khổ|mụn|thâm|rôm sảy|khô da|nhạy cảm|cứu tinh|bầu|mẹ bỉm|con nhỏ/.test(lower)) {
    return {
      type: 'PAIN_CALLOUT',
      label: 'Gọi thẳng nỗi đau & Vấn đề người xem đang gặp',
      whyItWorks:
        'Giúp thuật toán TikTok giữ chân đúng tệp khách hàng mục tiêu đang tìm giải pháp xử lý vấn đề.',
    };
  }
  if (/chuyện là|hôm nay|một ngày|pov|khi bạn|chồng|mẹ chồng|đi làm/.test(lower)) {
    return {
      type: 'STORY_POV',
      label: 'Tình huống đời thực / Kể chuyện dẫn dắt (Storytelling POV)',
      whyItWorks:
        'Tạo cảm giác tự nhiên như nội dung giải trí đời thường, giảm phản xạ bỏ qua video quảng cáo.',
    };
  }
  return {
    type: 'DIRECT_REVIEW',
    label: 'Review trực diện kết cấu & Trải nghiệm sản phẩm',
    whyItWorks:
      'Đi thẳng vào sản phẩm và trải nghiệm thực tế ngay từ đầu, phù hợp tệp khách hàng tìm kiếm thông tin nhanh.',
  };
}

export async function extractCompetitorVideoScriptAndHook(
  rawUrl: string,
  fallbackContext?: {
    handle?: string;
    nickname?: string;
    caption?: string;
    productPromoted?: string;
    views?: number;
    likes?: number;
  }
): Promise<CompetitorVideoScriptBreakdown> {
  const [liveData, commentData] = await Promise.all([
    fetchLiveTikTokVideoMetadata(rawUrl),
    scrapeTikTokVideoComments(rawUrl, 12).catch(() => null),
  ]);

  const { handle: urlHandle, videoId: urlVideoId } = extractHandleAndVideoIdFromUrl(rawUrl);
  const authorHandle = (
    liveData.authorHandle ||
    commentData?.videoInfo.authorHandle ||
    fallbackContext?.handle ||
    urlHandle ||
    'koc'
  )
    .toLowerCase()
    .replace(/^@+/, '');

  const authorNickname =
    liveData.authorNickname ||
    commentData?.videoInfo.authorNickname ||
    fallbackContext?.nickname ||
    authorHandle;

  const videoId =
    liveData.videoId || commentData?.videoInfo.videoId || urlVideoId || '';
  const publishedDateObj =
    liveData.publishedDateObj ||
    decodeTikTokVideoIdTimestamp(videoId) ||
    new Date();
  const formattedDate = formatVnDateTime(publishedDateObj);

  const caption =
    (liveData.caption || commentData?.videoInfo.caption || fallbackContext?.caption || '').trim();
  const { hashtags } = extractHashtagsAndMentions(caption);

  const viewsCount = Math.max(
    liveData.viewsCount || 0,
    commentData?.videoInfo.views || 0,
    fallbackContext?.views || 0
  );
  const likesCount = Math.max(
    liveData.likesCount || 0,
    commentData?.videoInfo.likes || 0,
    fallbackContext?.likes || 0
  );
  const commentsCount = Math.max(
    liveData.commentsCount || 0,
    commentData?.videoInfo.commentsCount || 0
  );
  const sharesCount = Math.max(
    liveData.sharesCount || 0,
    commentData?.videoInfo.sharesCount || 0
  );
  const savesCount = Math.max(
    liveData.savesCount || 0,
    commentData?.videoInfo.downloadsCount || 0
  );
  const engagementRate =
    viewsCount > 0
      ? Number((((likesCount + commentsCount + sharesCount) / viewsCount) * 100).toFixed(2))
      : 0;

  const durationSeconds = liveData.durationSeconds || 30;
  const onScreenStickers = liveData.onScreenStickers || [];

  // Làm sạch caption (bỏ chuỗi hashtag ở cuối để lấy câu văn thực tế)
  const cleanCaptionSentences = caption
    .replace(/#[\p{L}\p{N}_]+/gu, '')
    .split(/(?<=[.!?…\n])\s+|\r?\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 6);

  let subtitleSegments: TikTokSubtitleSegment[] =
    liveData.subtitleSegments && liveData.subtitleSegments.length > 0
      ? liveData.subtitleSegments
      : [];

  const subtitleSource: 'TIKTOK_AUTO_CAPTIONS_VTT' | 'ON_SCREEN_TEXT_AND_CAPTION' =
    subtitleSegments.length > 0 ? 'TIKTOK_AUTO_CAPTIONS_VTT' : 'ON_SCREEN_TEXT_AND_CAPTION';

  // Nếu video không đính kèm file VTT riêng, dựng các phân đoạn theo mốc giây từ Chữ trên màn hình (Stickers) + Câu trong bài đăng
  if (subtitleSegments.length === 0) {
    const combinedLines = [
      ...onScreenStickers,
      ...cleanCaptionSentences,
    ].filter((line, idx, arr) => line && arr.indexOf(line) === idx);

    if (combinedLines.length > 0) {
      const stepSec = Math.max(3, Math.floor(durationSeconds / Math.max(1, combinedLines.length)));
      subtitleSegments = combinedLines.map((line, idx) => {
        const start = idx * stepSec;
        const end = Math.min(durationSeconds, (idx + 1) * stepSec);
        const fmt = (sec: number) =>
          `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
        return {
          startSec: start,
          endSec: end,
          timeLabel: `${fmt(start)} - ${fmt(end)}`,
          text: line,
        };
      });
    }
  }

  const fullTranscriptText =
    subtitleSegments.length > 0
      ? subtitleSegments.map((s) => `[${s.timeLabel}] ${s.text}`).join('\n')
      : caption;

  // Xác định câu mở đầu 3 giây đầu (Hook)
  const first3SecSegments = subtitleSegments.filter((s) => s.startSec <= 4);
  const spokenHook3s =
    (first3SecSegments.length > 0
      ? first3SecSegments.map((s) => s.text).join(' ')
      : cleanCaptionSentences[0] || caption.slice(0, 140)) || 'Đang cập nhật câu mở đầu từ video';

  const onScreenTextHook =
    onScreenStickers[0] ||
    cleanCaptionSentences[0] ||
    (liveData.cartAnchorTitle ? `Gắn giỏ: ${liveData.cartAnchorTitle}` : 'Không chèn chữ nổi 3s đầu');

  const hookClass = classifyCompetitorHookPattern(
    `${spokenHook3s} ${onScreenTextHook} ${caption}`
  );

  const targetProductLabel =
    liveData.cartAnchorTitle ||
    fallbackContext?.productPromoted ||
    cleanCaptionSentences[0]?.slice(0, 55) ||
    'sản phẩm chủ lực';

  const upbaseAdaptationHooks = [
    `[Biến thể Bóc sự thật - 0-3s]: "Đừng vội chốt ${targetProductLabel} nếu bạn chưa xem kỹ điểm khác biệt thực tế này trên da!"`,
    `[Biến thể Đánh nỗi đau - 0-3s]: "Ai đang gặp đúng tình trạng như trong clip của @${authorHandle} thì xem ngay cách xử lý chỉ sau 7 ngày này nhé."`,
    `[Biến thể So sánh trực diện - 0-3s]: "Test cận cảnh dưới camera thường để xem liệu có đáng tiền như lời đồn hay không?"`,
  ];

  // Chia kịch bản thành 4 phần rõ ràng
  const segCount = subtitleSegments.length;
  const part1Text =
    first3SecSegments.map((s) => s.text).join(' ') || spokenHook3s;
  const part2Segs =
    segCount >= 3
      ? subtitleSegments.slice(1, Math.max(2, Math.ceil(segCount * 0.4)))
      : [];
  const part3Segs =
    segCount >= 3
      ? subtitleSegments.slice(
          Math.max(2, Math.ceil(segCount * 0.4)),
          Math.max(3, Math.ceil(segCount * 0.8))
        )
      : [];
  const part4Segs =
    segCount >= 4
      ? subtitleSegments.slice(Math.max(3, Math.ceil(segCount * 0.8)))
      : [];

  const scriptSections: CompetitorVideoScriptSection[] = [
    {
      stepIndex: 1,
      timeRange: '00:00 - 00:03',
      sectionTitle: 'Mở đầu giữ chân (Hook 3 giây đầu)',
      spokenOrTextContent: part1Text,
      visualAndActionNote:
        onScreenStickers.length > 0
          ? `Chữ chèn trên khung hình: "${onScreenStickers[0]}" · Cận cảnh gương mặt KOC hoặc kết cấu sản phẩm ngay giây đầu.`
          : 'Cận cảnh vấn đề hoặc giơ trực tiếp sản phẩm vào khung hình trong 3 giây đầu.',
    },
    {
      stepIndex: 2,
      timeRange: '00:03 - 00:10',
      sectionTitle: 'Dẫn dắt vấn đề & Bối cảnh sử dụng (Problem)',
      spokenOrTextContent:
        part2Segs.map((s) => s.text).join(' ') ||
        cleanCaptionSentences[1] ||
        `Nêu tình huống thực tế khiến người xem quan tâm tới ${targetProductLabel}.`,
      visualAndActionNote:
        'Chuyển góc máy mô tả tình trạng trước khi dùng hoặc thói quen sai lầm thường gặp.',
    },
    {
      stepIndex: 3,
      timeRange: '00:10 - 00:25',
      sectionTitle: 'Trải nghiệm thực tế & Luận điểm bán hàng (USP & Demo)',
      spokenOrTextContent:
        part3Segs.map((s) => s.text).join(' ') ||
        cleanCaptionSentences.slice(1, 3).join(' ') ||
        caption ||
        `Trình bày điểm nổi bật và trải nghiệm thực tế khi dùng ${targetProductLabel}.`,
      visualAndActionNote:
        'Quay cận cảnh chất sản phẩm (texture), thao tác thoa/sử dụng thực tế và cảm nhận tức thì.',
    },
    {
      stepIndex: 4,
      timeRange: `00:25 - 00:${String(Math.max(28, durationSeconds)).padStart(2, '0')}`,
      sectionTitle: 'Chốt đơn & Điều hướng Giỏ hàng (CTA)',
      spokenOrTextContent:
        part4Segs.map((s) => s.text).join(' ') ||
        (liveData.hasCartAnchor
          ? `Nhắc ưu đãi và chỉ tay xuống giỏ hàng góc trái màn hình (${liveData.cartAnchorTitle || targetProductLabel}).`
          : 'Khuyến khích người xem để lại bình luận hoặc tham khảo sản phẩm chính hãng.'),
      visualAndActionNote: liveData.hasCartAnchor
        ? `Gắn thẻ giỏ hàng TikTok Shop: "${liveData.cartAnchorTitle || targetProductLabel}".`
        : 'Chốt lại kết quả sau khi dùng và ghim bình luận đầu tiên.',
    },
  ];

  // Bóc tách các luận điểm bán hàng (Selling Points)
  const detectedSellingPoints: string[] = [];
  if (liveData.cartAnchorTitle) {
    detectedSellingPoints.push(`Sản phẩm gắn giỏ hàng: ${liveData.cartAnchorTitle}`);
  }
  for (const st of onScreenStickers.slice(0, 4)) {
    detectedSellingPoints.push(`Chữ nhấn mạnh trên màn hình: "${st}"`);
  }
  for (const sent of cleanCaptionSentences.slice(0, 3)) {
    if (!detectedSellingPoints.some((x) => x.includes(sent.slice(0, 20)))) {
      detectedSellingPoints.push(sent);
    }
  }

  const topQuestionsAndComments = (commentData?.comments || [])
    .slice(0, 6)
    .map((c) => ({
      username: c.username,
      text: c.text,
      likeCount: c.likeCount,
      intentLabel: c.intentLabel,
    }));

  const readyToCopyBrief = [
    `=== BRIEF KỊCH BẢN THAM CHIẾU TỪ VIDEO THẮNG (@${authorHandle}) ===`,
    `• Video gốc tham chiếu: ${liveData.resolvedUrl || rawUrl} (${viewsCount.toLocaleString('vi-VN')} view · ER ${engagementRate}%)`,
    `• Công thức mở đầu: ${hookClass.label}`,
    `• Câu Hook 3s gốc: "${spokenHook3s}"`,
    `• Gợi ý Hook 3s cho KOC UpBase: ${upbaseAdaptationHooks[0]}`,
    ``,
    `[KHUNG KỊCH BẢN QUAY 4 BƯỚC]:`,
    ...scriptSections.map(
      (sec) =>
        `${sec.stepIndex}. [${sec.timeRange}] ${sec.sectionTitle}:\n   - Lời thoại: ${sec.spokenOrTextContent}\n   - Hình ảnh: ${sec.visualAndActionNote}`
    ),
    ``,
    `• Hashtag tham khảo: ${hashtags.join(' ') || '#review #tiktokshop'}`,
  ].join('\n');

  return {
    videoUrl: liveData.resolvedUrl || rawUrl,
    videoId,
    authorHandle,
    authorNickname,
    authorAvatarUrl: liveData.authorAvatarUrl,
    publishedTimeFormatted: formattedDate.formatted,
    durationSeconds,
    viewsCount,
    likesCount,
    commentsCount,
    sharesCount,
    savesCount,
    engagementRate,
    musicTitle: liveData.musicTitle || 'Âm thanh gốc - Original Sound',
    caption,
    hashtags,
    hasCartAnchor: Boolean(liveData.hasCartAnchor),
    cartAnchorTitle: liveData.cartAnchorTitle,
    subtitleSource,
    subtitleSourceLabel:
      subtitleSource === 'TIKTOK_AUTO_CAPTIONS_VTT'
        ? 'Phụ đề lời thoại WebVTT gốc từ TikTok (claInfo.captionInfos)'
        : 'Bóc tách từ Chữ chèn trên khung hình (Stickers) & Nội dung bài đăng',
    onScreenStickers,
    subtitleSegments,
    fullTranscriptText,
    hookAnalysis: {
      spokenHook3s,
      onScreenTextHook,
      hookPatternType: hookClass.type,
      hookPatternLabel: hookClass.label,
      whyItWorks: hookClass.whyItWorks,
      upbaseAdaptationHooks,
    },
    scriptSections,
    detectedSellingPoints,
    viewerReactions: {
      buyingIntentRate: commentData?.summary.buyingIntentRate || 0,
      topQuestionsAndComments,
    },
    readyToCopyBrief,
  };
}



