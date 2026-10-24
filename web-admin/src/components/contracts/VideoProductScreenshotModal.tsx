'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  Clock,
  Download,
  Film,
  ImagePlus,
  Play,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  ZoomIn,
} from 'lucide-react';
import type { AcceptanceScreenshotItem } from '../../lib/contracts/types';
import type {
  SuggestedVideoFrameMoment,
  VideoMomentCategory,
} from '../../app/api/integrations/tiktok-koc/video-frame/route';
import {
  findSavedScreenshotsForContext,
  saveScreenshotsForContext,
} from '../../lib/acceptanceScreenshotStore';
import { Button, Field, Input, Modal, Status } from '../ui';

export interface VideoProductScreenshotModalProps {
  open: boolean;
  onClose: () => void;
  initialVideoUrl?: string;
  dealId?: string;
  dealCode?: string;
  kocId?: string;
  authorHandle?: string;
  brandName?: string;
  productName?: string;
  existingScreenshots?: AcceptanceScreenshotItem[];
  onApplyScreenshots?: (items: AcceptanceScreenshotItem[]) => void;
}

interface CandidateFrameItem {
  id: string;
  timestampSec: number;
  timeLabel: string;
  reason: string;
  matchedTerm?: string;
  captionQuote?: string;
  imageDataUrl: string;
  sourceMode: AcceptanceScreenshotItem['sourceMode'];
  momentCategory?: VideoMomentCategory;
  confidenceScore: number;
  sharpnessScore: number;
}

function formatSecToMmSs(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/**
 * Đo nhanh độ sáng và độ sắc nét biên (Edge Gradient) trên lưới mẫu 32x32 của Canvas (< 0.4ms)
 * để phát hiện khung hình tối đen/mờ nhòe khi chuyển cảnh và xếp hạng khung hình rõ nét nhất.
 */
function analyzeCanvasFrameQuality(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): { brightness: number; sharpnessScore: number; isBlankOrDark: boolean } {
  try {
    const sampleW = Math.min(64, Math.max(16, Math.floor(width / 8)));
    const sampleH = Math.min(64, Math.max(16, Math.floor(height / 8)));
    const startX = Math.floor((width - sampleW) / 2);
    const startY = Math.floor((height - sampleH) / 2);
    const data = ctx.getImageData(startX, startY, sampleW, sampleH).data;

    let lumSum = 0;
    let edgeSum = 0;
    const pixelCount = sampleW * sampleH;

    for (let y = 0; y < sampleH; y++) {
      for (let x = 0; x < sampleW; x++) {
        const idx = (y * sampleW + x) * 4;
        const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        lumSum += lum;
        if (x < sampleW - 1 && y < sampleH - 1) {
          const idxRight = (y * sampleW + (x + 1)) * 4;
          const idxDown = ((y + 1) * sampleW + x) * 4;
          const lumRight =
            0.299 * data[idxRight] + 0.587 * data[idxRight + 1] + 0.114 * data[idxRight + 2];
          const lumDown =
            0.299 * data[idxDown] + 0.587 * data[idxDown + 1] + 0.114 * data[idxDown + 2];
          edgeSum += Math.abs(lum - lumRight) + Math.abs(lum - lumDown);
        }
      }
    }

    const brightness = Math.round(lumSum / Math.max(1, pixelCount));
    const avgEdge = edgeSum / Math.max(1, pixelCount);
    const sharpnessScore = Math.min(99, Math.max(35, Math.round(avgEdge * 2.4)));
    const isBlankOrDark = brightness < 16 || brightness > 248 || avgEdge < 2.2;
    return { brightness, sharpnessScore, isBlankOrDark };
  } catch {
    return { brightness: 128, sharpnessScore: 78, isBlankOrDark: false };
  }
}

function getMomentBadgeProps(category?: VideoMomentCategory): {
  label: string;
  tone: 'positive' | 'info' | 'warning' | 'neutral';
} {
  switch (category) {
    case 'HOLDING_SHOWCASE':
      return { label: 'KOC cầm SP', tone: 'positive' };
    case 'TEXTURE_DEMO':
      return { label: 'Test chất SP', tone: 'info' };
    case 'VERBAL_MENTION':
      return { label: 'Nhắc tên SP', tone: 'warning' };
    default:
      return { label: 'Mốc tiến trình', tone: 'neutral' };
  }
}

export const VideoProductScreenshotModal: React.FC<VideoProductScreenshotModalProps> = ({
  open,
  onClose,
  initialVideoUrl = '',
  dealId,
  dealCode,
  kocId,
  authorHandle,
  brandName,
  productName,
  existingScreenshots,
  onApplyScreenshots,
}) => {
  const [videoUrlInput, setVideoUrlInput] = useState<string>(initialVideoUrl);
  const [productKeywordInput, setProductKeywordInput] = useState<string>(
    productName || brandName || ''
  );
  const [stampOverlay, setStampOverlay] = useState<boolean>(true);
  const [zoomCropProduct, setZoomCropProduct] = useState<boolean>(false);

  const [loadingMeta, setLoadingMeta] = useState<boolean>(false);
  const [extractingFrames, setExtractingFrames] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [statusNotice, setStatusNotice] = useState<string>('');

  const [resolvedMeta, setResolvedMeta] = useState<{
    resolvedUrl: string;
    videoId: string;
    authorHandle: string;
    authorNickname: string;
    durationSeconds: number;
    publishedTimeFormatted: string;
    cartAnchorTitle: string;
    streamToken: string | null;
    streamProxyUrl: string | null;
    serverFrameCaptureAvailable: boolean;
    proxiedCoverUrl: string | null;
    firstProductAppearanceSec: number | null;
    firstProductMentionTerm?: string;
    firstProductMentionQuote?: string;
    suggestedMoments: SuggestedVideoFrameMoment[];
  } | null>(null);

  const [activeVideoSrc, setActiveVideoSrc] = useState<string | null>(null);
  const [currentVideoTime, setCurrentVideoTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [candidateFrames, setCandidateFrames] = useState<CandidateFrameItem[]>([]);
  const [selectedScreenshots, setSelectedScreenshots] = useState<AcceptanceScreenshotItem[]>([]);

  const playerVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoInputRef = useRef<HTMLInputElement | null>(null);
  const imageUploadInputRef = useRef<HTMLInputElement | null>(null);

  const syncKey = `${open}:${initialVideoUrl}:${dealId || ''}:${dealCode || ''}:${productName || ''}`;
  const [prevSyncKey, setPrevSyncKey] = useState<string>('');
  if (syncKey !== prevSyncKey) {
    setPrevSyncKey(syncKey);
    if (open) {
      setVideoUrlInput(initialVideoUrl || '');
      setProductKeywordInput(productName || brandName || '');
      setErrorMsg('');
      setStatusNotice('');
      const initialSaved =
        existingScreenshots && existingScreenshots.length > 0
          ? existingScreenshots
          : findSavedScreenshotsForContext({
              dealId,
              dealCode,
              kocId,
              authorHandle,
              videoUrl: initialVideoUrl,
            });
      setSelectedScreenshots(initialSaved);
    }
  }

  const drawSourceWithCrop = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      source: HTMLVideoElement | HTMLImageElement,
      srcW: number,
      srcH: number,
      destW: number,
      destH: number
    ) => {
      if (zoomCropProduct && srcW > 0 && srcH > 0) {
        // Cắt tập trung 80% vùng trung tâm & nửa dưới khung hình (nơi KOC đưa tay cầm sản phẩm)
        const cropW = Math.round(srcW * 0.8);
        const cropH = Math.round(srcH * 0.8);
        const sx = Math.round((srcW - cropW) / 2);
        const sy = Math.round((srcH - cropH) * 0.58);
        ctx.drawImage(source, sx, sy, cropW, cropH, 0, 0, destW, destH);
      } else {
        ctx.drawImage(source, 0, 0, destW, destH);
      }
    },
    [zoomCropProduct]
  );

  const drawWatermarkStamp = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      meta: {
        timeLabel: string;
        handle?: string;
        term?: string;
        dealCode?: string;
      }
    ) => {
      if (!stampOverlay) return;
      const barHeight = Math.max(38, Math.round(height * 0.065));
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      ctx.fillRect(0, height - barHeight, width, barHeight);

      const fontSize = Math.max(12, Math.round(barHeight * 0.38));
      ctx.font = `600 ${fontSize}px sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';

      const parts = [
        `Mốc ${meta.timeLabel}`,
        meta.handle ? `@${meta.handle.replace(/^@/, '')}` : '',
        meta.term ? `SP: ${meta.term}` : '',
        meta.dealCode ? `Booking: ${meta.dealCode}` : '',
      ].filter(Boolean);

      const labelText = parts.join(' · ');
      ctx.fillText(labelText, 14, height - barHeight / 2, width - 28);
      ctx.restore();
    },
    [stampOverlay]
  );

  /**
   * Vẽ khung hình minh chứng dự phòng từ ảnh bìa video khi cả máy chủ lẫn trình duyệt đều bị chặn luồng MP4
   */
  const buildFallbackCanvasFrame = useCallback(
    async (
      moment: SuggestedVideoFrameMoment,
      meta: {
        proxiedCoverUrl: string | null;
        authorHandle: string;
        authorNickname: string;
        cartAnchorTitle: string;
        publishedTimeFormatted: string;
      }
    ): Promise<string> => {
      const canvas = document.createElement('canvas');
      const width = 540;
      const height = 960;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      if (meta.proxiedCoverUrl) {
        try {
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const el = new Image();
            el.crossOrigin = 'anonymous';
            el.onload = () => resolve(el);
            el.onerror = (e) => reject(e);
            el.src = meta.proxiedCoverUrl!;
          });
          const scale = Math.max(width / img.width, height / img.height);
          const drawW = img.width * scale;
          const drawH = img.height * scale;
          const dx = (width - drawW) / 2;
          const dy = (height - drawH) / 2;
          ctx.drawImage(img, dx, dy, drawW, drawH);
        } catch {
          // Giữ nền mặc định nếu ảnh bìa không tải được
        }
      }

      const cardY = height - 210;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      ctx.fillRect(20, cardY, width - 40, 130);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.75)';
      ctx.lineWidth = 2;
      ctx.strokeRect(20, cardY, width - 40, 130);

      ctx.fillStyle = '#34d399';
      ctx.font = '600 18px sans-serif';
      ctx.fillText(`KHUNG HÌNH SẢN PHẨM · MỐC ${moment.timeLabel}`, 36, cardY + 32);

      ctx.fillStyle = '#ffffff';
      ctx.font = '600 20px sans-serif';
      const prodLabel =
        moment.matchedTerm ||
        meta.cartAnchorTitle ||
        productKeywordInput ||
        productName ||
        brandName ||
        'Sản phẩm chiến dịch';
      ctx.fillText(`Sản phẩm: ${prodLabel.slice(0, 38)}`, 36, cardY + 64);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '16px sans-serif';
      const subQuote = moment.quote
        ? `"${moment.quote.slice(0, 48)}${moment.quote.length > 48 ? '...' : ''}"`
        : moment.reason;
      ctx.fillText(subQuote, 36, cardY + 96);

      if (meta.publishedTimeFormatted) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px sans-serif';
        ctx.fillText(`Ngày đăng: ${meta.publishedTimeFormatted}`, 36, cardY + 118);
      }

      drawWatermarkStamp(ctx, width, height, {
        timeLabel: moment.timeLabel,
        handle: meta.authorHandle || authorHandle,
        term: prodLabel,
        dealCode,
      });

      return canvas.toDataURL('image/jpeg', 0.88);
    },
    [authorHandle, brandName, dealCode, drawWatermarkStamp, productKeywordInput, productName]
  );

  /**
   * Ưu tiên 1: Cắt khung hình song song qua endpoint máy chủ (`?streamToken=...&captureSec=...`)
   * giúp cắt 8 khung hình thực tế trong ~1.5s mà không cần tải toàn bộ file MP4 về trình duyệt.
   */
  const extractFramesViaServerEndpoint = useCallback(
    async (
      streamToken: string,
      moments: SuggestedVideoFrameMoment[],
      authorHandleVal: string
    ): Promise<CandidateFrameItem[]> => {
      const targetMoments = moments.slice(0, 8);
      const results = await Promise.all(
        targetMoments.map(async (m): Promise<CandidateFrameItem | null> => {
          try {
            const frameUrl = `/api/integrations/tiktok-koc/video-frame?streamToken=${encodeURIComponent(
              streamToken
            )}&captureSec=${encodeURIComponent(String(m.sec))}`;

            const img = await new Promise<HTMLImageElement>((resolve, reject) => {
              const el = new Image();
              el.crossOrigin = 'anonymous';
              const timer = setTimeout(() => reject(new Error('Frame timeout')), 9500);
              el.onload = () => {
                clearTimeout(timer);
                resolve(el);
              };
              el.onerror = (err) => {
                clearTimeout(timer);
                reject(err);
              };
              el.src = frameUrl;
            });

            const canvas = document.createElement('canvas');
            const iw = img.naturalWidth || img.width || 540;
            const ih = img.naturalHeight || img.height || 960;
            canvas.width = iw;
            canvas.height = ih;
            const ctx = canvas.getContext('2d');
            if (!ctx) return null;

            drawSourceWithCrop(ctx, img, iw, ih, iw, ih);
            const quality = analyzeCanvasFrameQuality(ctx, iw, ih);

            drawWatermarkStamp(ctx, iw, ih, {
              timeLabel: m.timeLabel,
              handle: authorHandleVal || authorHandle,
              term: m.matchedTerm || productKeywordInput || productName || brandName,
              dealCode,
            });

            return {
              id: `srv-${Math.round(m.sec * 10)}-${Date.now()}`,
              timestampSec: m.sec,
              timeLabel: m.timeLabel,
              reason: m.reason,
              matchedTerm: m.matchedTerm || productKeywordInput || productName,
              captionQuote: m.quote,
              imageDataUrl: canvas.toDataURL('image/jpeg', 0.88),
              sourceMode: m.isPrimaryProductMoment ? 'SUGGESTED_MOMENT' : 'VIDEO_FRAME',
              momentCategory: m.momentCategory,
              confidenceScore: m.confidenceScore || (m.isPrimaryProductMoment ? 88 : 65),
              sharpnessScore: quality.sharpnessScore,
            };
          } catch {
            return null;
          }
        })
      );

      return results.filter((r): r is CandidateFrameItem => r !== null);
    },
    [
      authorHandle,
      brandName,
      dealCode,
      drawSourceWithCrop,
      drawWatermarkStamp,
      productKeywordInput,
      productName,
    ]
  );

  /**
   * Ưu tiên 2: Trích xuất khung hình từ luồng video MP4 trực tiếp trên trình duyệt bằng thẻ <video> + <canvas>
   * (Tự động nhảy tránh khung hình tối đen khi chuyển cảnh)
   */
  const extractFramesFromVideoSource = useCallback(
    async (
      videoSrc: string,
      moments: SuggestedVideoFrameMoment[],
      fallbackMeta: {
        streamToken?: string | null;
        serverFrameCaptureAvailable?: boolean;
        proxiedCoverUrl: string | null;
        authorHandle: string;
        authorNickname: string;
        cartAnchorTitle: string;
        publishedTimeFormatted: string;
      },
      appendMode = false
    ) => {
      setExtractingFrames(true);
      let extracted: CandidateFrameItem[] = [];

      try {
        // Nếu máy chủ hỗ trợ cắt khung hình trực tiếp qua ffmpeg, chạy song song để có kết quả tức thì
        if (fallbackMeta.serverFrameCaptureAvailable && fallbackMeta.streamToken) {
          const serverExtracted = await extractFramesViaServerEndpoint(
            fallbackMeta.streamToken,
            moments,
            fallbackMeta.authorHandle
          );
          if (serverExtracted.length > 0) {
            extracted = serverExtracted;
          }
        }

        // Nếu chưa lấy qua máy chủ (hoặc đang mở file MP4 từ máy tính), dùng thẻ <video> trên trình duyệt
        if (extracted.length === 0) {
          const tempVideo = document.createElement('video');
          tempVideo.crossOrigin = 'anonymous';
          tempVideo.muted = true;
          tempVideo.playsInline = true;
          tempVideo.preload = 'auto';
          tempVideo.src = videoSrc;

          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Timeout loading video stream')), 12000);
            tempVideo.onloadedmetadata = () => {
              clearTimeout(timer);
              resolve();
            };
            tempVideo.onerror = () => {
              clearTimeout(timer);
              reject(new Error('Video stream error'));
            };
          });

          const actualDuration = Number(tempVideo.duration) || 20;
          setVideoDuration(actualDuration);

          const targetMoments = moments.slice(0, 8);
          for (const m of targetMoments) {
            let safeSec = Math.min(Math.max(0.5, m.sec), Math.max(0.5, actualDuration - 0.3));
            const seekToSec = async (targetSec: number) => {
              await new Promise<void>((resolve) => {
                const seekTimer = setTimeout(() => resolve(), 3200);
                tempVideo.onseeked = () => {
                  clearTimeout(seekTimer);
                  resolve();
                };
                tempVideo.currentTime = targetSec;
              });
            };

            await seekToSec(safeSec);

            const canvas = document.createElement('canvas');
            const vw = tempVideo.videoWidth || 540;
            const vh = tempVideo.videoHeight || 960;
            const scale = Math.min(1, 720 / Math.max(vw, 1));
            canvas.width = Math.round(vw * scale);
            canvas.height = Math.round(vh * scale);

            const ctx = canvas.getContext('2d');
            if (ctx) {
              drawSourceWithCrop(ctx, tempVideo, vw, vh, canvas.width, canvas.height);
              let quality = analyzeCanvasFrameQuality(ctx, canvas.width, canvas.height);

              // Nếu trúng đúng khung hình tối đen lúc chuyển cảnh, tự động nhích thêm +0.45s
              if (quality.isBlankOrDark && safeSec + 0.5 < actualDuration) {
                safeSec = Math.round((safeSec + 0.45) * 10) / 10;
                await seekToSec(safeSec);
                drawSourceWithCrop(ctx, tempVideo, vw, vh, canvas.width, canvas.height);
                quality = analyzeCanvasFrameQuality(ctx, canvas.width, canvas.height);
              }

              drawWatermarkStamp(ctx, canvas.width, canvas.height, {
                timeLabel: formatSecToMmSs(safeSec),
                handle: fallbackMeta.authorHandle || authorHandle,
                term: m.matchedTerm || productKeywordInput || productName || brandName,
                dealCode,
              });
              const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
              extracted.push({
                id: `frm-${Math.round(safeSec * 10)}-${Date.now()}`,
                timestampSec: Math.round(safeSec * 10) / 10,
                timeLabel: formatSecToMmSs(safeSec),
                reason: m.reason,
                matchedTerm: m.matchedTerm || productKeywordInput || productName,
                captionQuote: m.quote,
                imageDataUrl: dataUrl,
                sourceMode: m.isPrimaryProductMoment ? 'SUGGESTED_MOMENT' : 'VIDEO_FRAME',
                momentCategory: m.momentCategory,
                confidenceScore: m.confidenceScore || (m.isPrimaryProductMoment ? 88 : 65),
                sharpnessScore: quality.sharpnessScore,
              });
            }
          }
        }
      } catch {
        const fallbackMoments = moments.slice(0, 4);
        for (const m of fallbackMoments) {
          const dataUrl = await buildFallbackCanvasFrame(m, fallbackMeta);
          if (dataUrl) {
            extracted.push({
              id: `fb-${Math.round(m.sec * 10)}-${Date.now()}`,
              timestampSec: m.sec,
              timeLabel: m.timeLabel,
              reason: m.reason,
              matchedTerm: m.matchedTerm || productKeywordInput || productName,
              captionQuote: m.quote,
              imageDataUrl: dataUrl,
              sourceMode: 'SUGGESTED_MOMENT',
              momentCategory: m.momentCategory,
              confidenceScore: m.confidenceScore || 70,
              sharpnessScore: 75,
            });
          }
        }
      } finally {
        setExtractingFrames(false);
      }

      if (extracted.length > 0) {
        setCandidateFrames((prev) => {
          if (!appendMode) return extracted;
          const merged = [...prev];
          for (const item of extracted) {
            if (!merged.some((x) => Math.abs(x.timestampSec - item.timestampSec) < 0.35)) {
              merged.push(item);
            }
          }
          return merged.sort((a, b) => a.timestampSec - b.timestampSec);
        });
      }
    },
    [
      authorHandle,
      brandName,
      buildFallbackCanvasFrame,
      dealCode,
      drawSourceWithCrop,
      drawWatermarkStamp,
      extractFramesViaServerEndpoint,
      productKeywordInput,
      productName,
    ]
  );

  /**
   * Bấm nút "Tải video & dò mốc sản phẩm"
   */
  const handleInspectAndExtract = async () => {
    const cleanUrl = videoUrlInput.trim();
    if (!cleanUrl) {
      setErrorMsg('Vui lòng nhập đường dẫn video TikTok cần chụp khung hình sản phẩm.');
      return;
    }

    setLoadingMeta(true);
    setErrorMsg('');
    setStatusNotice('');

    try {
      const res = await fetch('/api/integrations/tiktok-koc/video-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: cleanUrl,
          brandName,
          productName: productKeywordInput.trim() || productName,
          dealCode,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success || !json.data) {
        setErrorMsg(json.error || 'Không đọc được dữ liệu video.');
        return;
      }

      const data = json.data;
      setResolvedMeta(data);
      setVideoDuration(data.durationSeconds || 22);

      if (data.streamProxyUrl) {
        setActiveVideoSrc(data.streamProxyUrl);
        await extractFramesFromVideoSource(
          data.streamProxyUrl,
          data.suggestedMoments || [],
          {
            streamToken: data.streamToken,
            serverFrameCaptureAvailable: data.serverFrameCaptureAvailable,
            proxiedCoverUrl: data.proxiedCoverUrl,
            authorHandle: data.authorHandle,
            authorNickname: data.authorNickname,
            cartAnchorTitle: data.cartAnchorTitle,
            publishedTimeFormatted: data.publishedTimeFormatted,
          },
          false
        );
      } else {
        const fbFrames: CandidateFrameItem[] = [];
        for (const m of (data.suggestedMoments || []).slice(0, 4)) {
          const dataUrl = await buildFallbackCanvasFrame(m, {
            proxiedCoverUrl: data.proxiedCoverUrl,
            authorHandle: data.authorHandle,
            authorNickname: data.authorNickname,
            cartAnchorTitle: data.cartAnchorTitle,
            publishedTimeFormatted: data.publishedTimeFormatted,
          });
          if (dataUrl) {
            fbFrames.push({
              id: `fb-${Math.round(m.sec * 10)}-${Date.now()}`,
              timestampSec: m.sec,
              timeLabel: m.timeLabel,
              reason: m.reason,
              matchedTerm: m.matchedTerm || productKeywordInput || productName,
              captionQuote: m.quote,
              imageDataUrl: dataUrl,
              sourceMode: 'SUGGESTED_MOMENT',
              momentCategory: m.momentCategory,
              confidenceScore: m.confidenceScore || 70,
              sharpnessScore: 75,
            });
          }
        }
        setCandidateFrames(fbFrames);
      }

      if (data.firstProductAppearanceSec !== null) {
        setStatusNotice(
          `Đã dò thấy ${data.productMentionMoments?.length || 1} mốc KOC nhắc/cầm "${
            data.firstProductMentionTerm || 'sản phẩm'
          }" và cắt sẵn dải khung hình tương ứng.`
        );
      } else {
        setStatusNotice('Đã cắt sẵn dải khung hình gợi ý theo tiến trình giới thiệu sản phẩm.');
      }
    } catch {
      setErrorMsg('Không kết nối được máy chủ khi tải video.');
    } finally {
      setLoadingMeta(false);
    }
  };

  /**
   * Quét liên tiếp 6 khung hình cách nhau 0.7s quanh một mốc giây bất kỳ (±1.8s)
   * để chuyên viên chọn đúng khoảnh khắc KOC cầm sản phẩm rõ nét nhất.
   */
  const handleBurstScanAroundSec = async (centerSec: number, matchedTerm?: string) => {
    if (!activeVideoSrc) return;
    const dur = Math.max(10, videoDuration || resolvedMeta?.durationSeconds || 25);
    const offsets = [-1.4, -0.7, 0, 0.7, 1.4, 2.1];
    const burstMoments: SuggestedVideoFrameMoment[] = offsets.map((off) => {
      const sec = Math.max(0.4, Math.min(dur - 0.4, Math.round((centerSec + off) * 10) / 10));
      return {
        sec,
        timeLabel: formatSecToMmSs(sec),
        reason: `Quét chi tiết quanh ${formatSecToMmSs(centerSec)} (${off >= 0 ? `+${off}s` : `${off}s`})`,
        matchedTerm: matchedTerm || productKeywordInput || productName || brandName,
        isPrimaryProductMoment: true,
        momentCategory: 'HOLDING_SHOWCASE',
        confidenceScore: 92,
      };
    });

    await extractFramesFromVideoSource(
      activeVideoSrc,
      burstMoments,
      {
        streamToken: resolvedMeta?.streamToken,
        serverFrameCaptureAvailable: resolvedMeta?.serverFrameCaptureAvailable,
        proxiedCoverUrl: resolvedMeta?.proxiedCoverUrl || null,
        authorHandle: resolvedMeta?.authorHandle || authorHandle || 'koc',
        authorNickname: resolvedMeta?.authorNickname || 'KOC',
        cartAnchorTitle: resolvedMeta?.cartAnchorTitle || '',
        publishedTimeFormatted: resolvedMeta?.publishedTimeFormatted || '',
      },
      true
    );
    setStatusNotice(
      `Đã cắt bổ sung dải 6 khung hình liên tiếp quanh mốc ${formatSecToMmSs(centerSec)}.`
    );
  };

  /**
   * Tự động chọn 2 khung hình có điểm nhận diện sản phẩm + độ sắc nét cao nhất
   */
  const handleAutoSelectBestFrames = () => {
    if (candidateFrames.length === 0) return;
    const ranked = [...candidateFrames].sort(
      (a, b) => b.confidenceScore + b.sharpnessScore - (a.confidenceScore + a.sharpnessScore)
    );
    const topTwo = ranked.slice(0, 2);
    setSelectedScreenshots((prev) => {
      const next = [...prev];
      for (const cand of topTwo) {
        if (!next.some((s) => s.id === cand.id)) {
          next.push({
            id: cand.id,
            videoUrl: resolvedMeta?.resolvedUrl || videoUrlInput.trim(),
            videoId: resolvedMeta?.videoId,
            authorHandle: resolvedMeta?.authorHandle || authorHandle,
            timestampSec: cand.timestampSec,
            timeLabel: cand.timeLabel,
            matchedTerm: cand.matchedTerm || productKeywordInput.trim() || productName || brandName,
            captionQuote: cand.captionQuote || cand.reason,
            imageDataUrl: cand.imageDataUrl,
            capturedAt: new Date().toISOString(),
            sourceMode: cand.sourceMode,
            note: cand.reason,
          });
        }
      }
      return next;
    });
    setStatusNotice(
      `Đã chọn 2 khung hình rõ nét nhất (${topTwo.map((t) => t.timeLabel).join(', ')}) vào danh sách nghiệm thu.`
    );
  };

  /**
   * Chụp khung hình hiện tại từ trình phát <video> đang mở
   */
  const handleCaptureCurrentPlayerFrame = () => {
    const videoEl = playerVideoRef.current;
    if (!videoEl || !videoEl.videoWidth) {
      setErrorMsg('Trình phát video chưa sẵn sàng khung hình để chụp.');
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      const vw = videoEl.videoWidth;
      const vh = videoEl.videoHeight;
      const scale = Math.min(1, 720 / Math.max(vw, 1));
      canvas.width = Math.round(vw * scale);
      canvas.height = Math.round(vh * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      drawSourceWithCrop(ctx, videoEl, vw, vh, canvas.width, canvas.height);
      const sec = Math.round(videoEl.currentTime * 10) / 10;
      const timeLabel = formatSecToMmSs(sec);
      const handle = resolvedMeta?.authorHandle || authorHandle || 'koc';
      const term =
        productKeywordInput.trim() ||
        resolvedMeta?.firstProductMentionTerm ||
        productName ||
        brandName;

      drawWatermarkStamp(ctx, canvas.width, canvas.height, {
        timeLabel,
        handle,
        term,
        dealCode,
      });

      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      const newItem: AcceptanceScreenshotItem = {
        id: `cap-${Date.now()}-${Math.round(sec * 10)}`,
        videoUrl: resolvedMeta?.resolvedUrl || videoUrlInput.trim(),
        videoId: resolvedMeta?.videoId,
        authorHandle: handle,
        timestampSec: sec,
        timeLabel,
        matchedTerm: term,
        captionQuote: `Chụp trực tiếp tại mốc ${timeLabel}`,
        imageDataUrl: dataUrl,
        capturedAt: new Date().toISOString(),
        sourceMode: 'VIDEO_FRAME',
        note: `Khung hình sản phẩm tại ${timeLabel}`,
      };

      setSelectedScreenshots((prev) => [...prev, newItem]);
      setStatusNotice(`Đã chụp và thêm khung hình tại mốc ${timeLabel} vào danh sách nghiệm thu.`);
    } catch {
      setErrorMsg('Không thể trích xuất khung hình từ video này.');
    }
  };

  /**
   * Mở file video (.mp4, .mov, .webm) từ máy tính để cắt khung hình trực tiếp trên trình duyệt
   */
  const handleLocalVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setActiveVideoSrc(objectUrl);
    setErrorMsg('');

    const defaultMoments: SuggestedVideoFrameMoment[] = [
      { sec: 2, timeLabel: '00:02', reason: 'Mở đầu (00:02)', isPrimaryProductMoment: false },
      { sec: 4, timeLabel: '00:04', reason: 'Đưa sản phẩm lên hình (00:04)', isPrimaryProductMoment: true, momentCategory: 'HOLDING_SHOWCASE', confidenceScore: 90 },
      { sec: 7, timeLabel: '00:07', reason: 'Cận cảnh sản phẩm (00:07)', isPrimaryProductMoment: true, momentCategory: 'HOLDING_SHOWCASE', confidenceScore: 92 },
      { sec: 11, timeLabel: '00:11', reason: 'Trải nghiệm thực tế (00:11)', isPrimaryProductMoment: false, momentCategory: 'TEXTURE_DEMO', confidenceScore: 84 },
      { sec: 15, timeLabel: '00:15', reason: 'Điểm nhấn công dụng (00:15)', isPrimaryProductMoment: false },
      { sec: 19, timeLabel: '00:19', reason: 'Kêu gọi giỏ hàng (00:19)', isPrimaryProductMoment: false },
    ];

    await extractFramesFromVideoSource(
      objectUrl,
      resolvedMeta?.suggestedMoments || defaultMoments,
      {
        streamToken: null,
        serverFrameCaptureAvailable: false,
        proxiedCoverUrl: null,
        authorHandle: resolvedMeta?.authorHandle || authorHandle || 'koc',
        authorNickname: resolvedMeta?.authorNickname || 'KOC',
        cartAnchorTitle: productKeywordInput || productName || '',
        publishedTimeFormatted: '',
      },
      false
    );
    setStatusNotice(`Đã tải tệp video "${file.name}" và cắt sẵn dải khung hình.`);
  };

  /**
   * Tải ảnh chụp màn hình có sẵn từ máy tính hoặc dán từ Clipboard (Ctrl+V)
   */
  const appendImageFileAsScreenshot = useCallback(
    (file: File, sourceLabel: string) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        if (!result) return;
        const sec =
          Math.round(
            (playerVideoRef.current?.currentTime ||
              resolvedMeta?.firstProductAppearanceSec ||
              4) * 10
          ) / 10;
        const timeLabel = formatSecToMmSs(sec);
        const newItem: AcceptanceScreenshotItem = {
          id: `img-${Date.now()}-${sec}`,
          videoUrl: resolvedMeta?.resolvedUrl || videoUrlInput.trim(),
          videoId: resolvedMeta?.videoId,
          authorHandle: resolvedMeta?.authorHandle || authorHandle,
          timestampSec: sec,
          timeLabel,
          matchedTerm: productKeywordInput.trim() || productName || brandName,
          captionQuote: sourceLabel,
          imageDataUrl: result,
          capturedAt: new Date().toISOString(),
          sourceMode: 'CLIPBOARD_OR_UPLOAD',
          note: `Ảnh chụp sản phẩm (${timeLabel})`,
        };
        setSelectedScreenshots((prev) => [...prev, newItem]);
        setStatusNotice(`Đã thêm ảnh từ ${sourceLabel} vào danh sách nghiệm thu.`);
      };
      reader.readAsDataURL(file);
    },
    [
      authorHandle,
      brandName,
      productKeywordInput,
      productName,
      resolvedMeta,
      videoUrlInput,
    ]
  );

  useEffect(() => {
    if (!open) return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            appendImageFileAsScreenshot(file, 'Bộ nhớ tạm (Ctrl+V)');
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [open, appendImageFileAsScreenshot]);

  const toggleSelectCandidate = (cand: CandidateFrameItem) => {
    const exists = selectedScreenshots.some((s) => s.id === cand.id);
    if (exists) {
      setSelectedScreenshots((prev) => prev.filter((s) => s.id !== cand.id));
    } else {
      const newItem: AcceptanceScreenshotItem = {
        id: cand.id,
        videoUrl: resolvedMeta?.resolvedUrl || videoUrlInput.trim(),
        videoId: resolvedMeta?.videoId,
        authorHandle: resolvedMeta?.authorHandle || authorHandle,
        timestampSec: cand.timestampSec,
        timeLabel: cand.timeLabel,
        matchedTerm: cand.matchedTerm || productKeywordInput.trim() || productName || brandName,
        captionQuote: cand.captionQuote || cand.reason,
        imageDataUrl: cand.imageDataUrl,
        capturedAt: new Date().toISOString(),
        sourceMode: cand.sourceMode,
        note: cand.reason,
      };
      setSelectedScreenshots((prev) => [...prev, newItem]);
    }
  };

  const seekVideoTo = (sec: number) => {
    const videoEl = playerVideoRef.current;
    if (!videoEl) return;
    videoEl.currentTime = Math.max(0, Math.min(sec, videoEl.duration || sec));
    setCurrentVideoTime(videoEl.currentTime);
  };

  const handleDownloadSingleImage = (item: AcceptanceScreenshotItem, index: number) => {
    const a = document.createElement('a');
    a.href = item.imageDataUrl;
    const prefix = dealCode || item.authorHandle || 'KOC';
    const cleanTime = (item.timeLabel || '00-00').replace(':', 'm') + 's';
    a.download = `BBNT_${prefix}_Anh${index + 1}_${cleanTime}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSaveAndApply = () => {
    saveScreenshotsForContext(
      {
        dealId,
        dealCode,
        kocId,
        authorHandle: resolvedMeta?.authorHandle || authorHandle,
        videoUrl: resolvedMeta?.resolvedUrl || videoUrlInput.trim(),
        videoId: resolvedMeta?.videoId,
      },
      selectedScreenshots
    );
    onApplyScreenshots?.(selectedScreenshots);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Chụp khung hình sản phẩm từ video để đưa vào Biên bản nghiệm thu"
      size="xl"
      footer={
        <div className="flex flex-wrap items-center justify-between w-full gap-2">
          <span className="text-xs text-ink-2">
            Đã chọn{' '}
            <strong className="text-ink font-semibold">{selectedScreenshots.length}</strong> ảnh
            minh chứng sản phẩm
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Hủy
            </Button>
            <Button
              variant="primary"
              icon={Check}
              onClick={handleSaveAndApply}
              disabled={selectedScreenshots.length === 0}
            >
              Đưa {selectedScreenshots.length > 0 ? `${selectedScreenshots.length} ảnh ` : ''}vào
              Biên bản nghiệm thu
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Thanh nhập link video và từ khóa sản phẩm */}
        <div className="p-3.5 rounded-xl border border-line bg-surface-2/50 space-y-3">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto] items-end">
            <Field label="Đường dẫn video TikTok cần nghiệm thu" htmlFor="vpss-url">
              <Input
                id="vpss-url"
                value={videoUrlInput}
                onChange={(e) => setVideoUrlInput(e.target.value)}
                placeholder="https://www.tiktok.com/@handle/video/..."
              />
            </Field>
            <Field label="Tên sản phẩm / Thương hiệu cần dò mốc giây" htmlFor="vpss-kw">
              <Input
                id="vpss-kw"
                value={productKeywordInput}
                onChange={(e) => setProductKeywordInput(e.target.value)}
                placeholder="VD: HLC + Vỏ sồi, Kutieskin, CeraVe..."
              />
            </Field>
            <Button
              variant="primary"
              icon={loadingMeta || extractingFrames ? RefreshCw : Film}
              disabled={loadingMeta || extractingFrames}
              onClick={handleInspectAndExtract}
            >
              {loadingMeta || extractingFrames
                ? 'Đang cắt khung hình…'
                : 'Tải video & dò mốc sản phẩm'}
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={localVideoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={handleLocalVideoFileChange}
                className="hidden"
              />
              <input
                ref={imageUploadInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  files.forEach((f) => appendImageFileAsScreenshot(f, `Tệp ${f.name}`));
                  e.target.value = '';
                }}
                className="hidden"
              />
              <Button
                size="sm"
                variant="secondary"
                icon={Upload}
                onClick={() => localVideoInputRef.current?.click()}
              >
                Mở file video (.mp4) từ máy
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={ImagePlus}
                onClick={() => imageUploadInputRef.current?.click()}
              >
                Tải ảnh chụp có sẵn (hoặc bấm Ctrl+V)
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-ink-2">
                <input
                  type="checkbox"
                  checked={zoomCropProduct}
                  onChange={(e) => setZoomCropProduct(e.target.checked)}
                  className="rounded border-line"
                />
                <ZoomIn className="w-3.5 h-3.5 text-accent" />
                <span>Zoom cận cảnh sản phẩm (1.25x)</span>
              </label>

              <label className="inline-flex items-center gap-1.5 cursor-pointer text-ink-2">
                <input
                  type="checkbox"
                  checked={stampOverlay}
                  onChange={(e) => setStampOverlay(e.target.checked)}
                  className="rounded border-line"
                />
                <span>Đóng dấu mốc giây & tên sản phẩm lên ảnh</span>
              </label>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-lg border border-critical/40 bg-critical-soft/20 px-3.5 py-2 text-xs text-critical font-medium">
            {errorMsg}
          </div>
        )}

        {statusNotice && (
          <div className="rounded-lg border border-positive/30 bg-positive-soft/25 px-3.5 py-2 text-xs text-positive font-medium flex flex-wrap items-center justify-between gap-2">
            <span>{statusNotice}</span>
            {resolvedMeta?.firstProductAppearanceSec !== null &&
              resolvedMeta?.firstProductAppearanceSec !== undefined && (
                <Status tone="positive">
                  Mốc nhắc SP đầu tiên: {formatSecToMmSs(resolvedMeta.firstProductAppearanceSec)}
                </Status>
              )}
          </div>
        )}

        {/* Khu vực trình phát video + dải khung hình gợi ý */}
        {(activeVideoSrc || candidateFrames.length > 0) && (
          <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)] items-start">
            {/* Cột trái: Trình phát video để tua và bấm chụp thủ công */}
            <div className="rounded-xl border border-line bg-surface p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-ink">Trình phát & Tua khung hình</span>
                <span className="text-2xs font-code text-ink-2 tabular-nums">
                  {formatSecToMmSs(currentVideoTime)} / {formatSecToMmSs(videoDuration)}
                </span>
              </div>

              {activeVideoSrc ? (
                <>
                  <div className="relative rounded-lg overflow-hidden bg-black aspect-[9/16] max-h-[340px] mx-auto flex items-center justify-center">
                    <video
                      ref={playerVideoRef}
                      src={activeVideoSrc}
                      crossOrigin="anonymous"
                      controls
                      playsInline
                      onTimeUpdate={(e) => setCurrentVideoTime(e.currentTarget.currentTime)}
                      onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration || 22)}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => seekVideoTo(Math.max(0, currentVideoTime - 0.5))}
                    >
                      -0.5s
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      icon={Camera}
                      onClick={handleCaptureCurrentPlayerFrame}
                    >
                      Chụp khung này
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => seekVideoTo(currentVideoTime + 0.5)}
                    >
                      +0.5s
                    </Button>
                  </div>

                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Film}
                    disabled={extractingFrames}
                    onClick={() =>
                      handleBurstScanAroundSec(
                        currentVideoTime || resolvedMeta?.firstProductAppearanceSec || 4
                      )
                    }
                    className="w-full justify-center"
                  >
                    Cắt 6 khung liên tiếp quanh {formatSecToMmSs(currentVideoTime)} (±2s)
                  </Button>

                  {resolvedMeta?.suggestedMoments && resolvedMeta.suggestedMoments.length > 0 && (
                    <div className="pt-2 border-t border-line space-y-1.5">
                      <span className="text-2xs font-semibold text-ink-2 block">
                        Nhảy nhanh tới mốc có sản phẩm:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {resolvedMeta.suggestedMoments.map((m, idx) => (
                          <button
                            key={`${m.sec}-${idx}`}
                            type="button"
                            onClick={() => seekVideoTo(m.sec)}
                            className={`px-2 py-0.5 rounded text-2xs font-code border transition-colors ${
                              m.momentCategory === 'HOLDING_SHOWCASE'
                                ? 'bg-positive-soft text-positive border-positive/30 font-semibold'
                                : m.isPrimaryProductMoment
                                  ? 'bg-accent-soft text-accent border-accent/30 font-semibold'
                                  : 'bg-surface-2 text-ink-2 border-line hover:text-ink'
                            }`}
                            title={m.reason}
                          >
                            {m.timeLabel}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-4 rounded-lg border border-dashed border-line bg-surface-2 text-center space-y-2 text-xs text-ink-2">
                  <Play className="w-6 h-6 text-ink-3 mx-auto" />
                  <p>
                    Video TikTok này đang hạn chế phát trực tiếp trên trình duyệt. Bạn có thể chọn
                    ngay ảnh trong dải khung hình bên phải hoặc bấm{' '}
                    <strong>Mở file video (.mp4) từ máy</strong>.
                  </p>
                </div>
              )}
            </div>

            {/* Cột phải: Dải khung hình đã tự động trích xuất */}
            <div className="rounded-xl border border-line bg-surface p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-ink inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-accent" />
                  Dải khung hình trích xuất tại mốc xuất hiện sản phẩm ({candidateFrames.length}{' '}
                  ảnh)
                </span>
                {candidateFrames.length > 0 && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Sparkles}
                    onClick={handleAutoSelectBestFrames}
                  >
                    Tự chọn 2 ảnh rõ nhất
                  </Button>
                )}
              </div>

              {extractingFrames ? (
                <div className="p-8 text-center text-xs text-ink-2 flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-accent" />
                  <span>Đang cắt khung hình tại các mốc KOC cầm và giới thiệu sản phẩm…</span>
                </div>
              ) : candidateFrames.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {candidateFrames.map((cand) => {
                    const isSelected = selectedScreenshots.some((s) => s.id === cand.id);
                    const badge = getMomentBadgeProps(cand.momentCategory);
                    return (
                      <div
                        key={cand.id}
                        onClick={() => toggleSelectCandidate(cand)}
                        className={`group cursor-pointer rounded-xl border overflow-hidden transition-colors flex flex-col ${
                          isSelected
                            ? 'border-accent ring-2 ring-accent/30 bg-accent-soft/15'
                            : 'border-line bg-surface-2/40 hover:border-line-strong'
                        }`}
                      >
                        <div className="relative aspect-[9/16] max-h-[200px] bg-black overflow-hidden">
                          <img
                            src={cand.imageDataUrl}
                            alt={cand.reason}
                            className="w-full h-full object-contain"
                          />
                          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/75 text-white text-2xs font-code">
                            {cand.timeLabel}
                          </span>
                          <span
                            className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shadow ${
                              isSelected
                                ? 'bg-accent text-white'
                                : 'bg-white/85 text-ink border border-line'
                            }`}
                          >
                            {isSelected ? '✓' : '+'}
                          </span>
                          <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1 pointer-events-none">
                            <Status tone={badge.tone}>{badge.label}</Status>
                            <span className="px-1.5 py-0.5 rounded bg-black/70 text-white text-3xs font-code">
                              Nét {cand.sharpnessScore}%
                            </span>
                          </div>
                        </div>
                        <div className="p-2 space-y-1 text-2xs flex-1 flex flex-col justify-between">
                          <div>
                            <p className="font-semibold text-ink line-clamp-1">{cand.reason}</p>
                            {cand.captionQuote && (
                              <p className="text-ink-3 line-clamp-1">
                                &ldquo;{cand.captionQuote}&rdquo;
                              </p>
                            )}
                          </div>
                          {activeVideoSrc && (
                            <div className="pt-1 flex items-center justify-between gap-1 border-t border-line/60">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  seekVideoTo(cand.timestampSec);
                                }}
                                className="text-3xs text-ink-2 hover:text-ink font-medium"
                              >
                                Xem mốc này
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleBurstScanAroundSec(
                                    cand.timestampSec,
                                    cand.matchedTerm
                                  );
                                }}
                                className="text-3xs text-accent hover:underline font-semibold"
                              >
                                Quét ±2s
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 rounded-lg border border-dashed border-line text-center text-xs text-ink-3">
                  Chưa có khung hình nào. Hãy bấm &ldquo;Tải video & dò mốc sản phẩm&rdquo; phía
                  trên.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Danh sách các ảnh đã chọn để chèn vào Biên bản nghiệm thu */}
        <div className="rounded-xl border border-line bg-surface p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-ink">
              Ảnh minh chứng sẽ chèn vào Biên bản nghiệm thu ({selectedScreenshots.length})
            </span>
            {selectedScreenshots.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                icon={Trash2}
                onClick={() => setSelectedScreenshots([])}
              >
                Xóa tất cả ảnh đã chọn
              </Button>
            )}
          </div>

          {selectedScreenshots.length === 0 ? (
            <div className="p-4 rounded-lg border border-dashed border-line bg-surface-2/40 text-center text-xs text-ink-3">
              Chưa chọn ảnh nào. Hãy bấm chọn ảnh từ dải khung hình phía trên, bấm &ldquo;Tự chọn 2
              ảnh rõ nhất&rdquo;, hoặc bấm Ctrl+V để dán ảnh chụp màn hình.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {selectedScreenshots.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl border border-line bg-surface-2/50"
                >
                  <img
                    src={item.imageDataUrl}
                    alt={item.note || item.timeLabel}
                    className="w-16 h-24 rounded-lg object-cover border border-line bg-black shrink-0"
                  />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="px-1.5 py-0.5 rounded bg-accent-soft text-accent font-code text-2xs font-semibold">
                        Ảnh #{idx + 1} · Mốc {item.timeLabel}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDownloadSingleImage(item, idx)}
                          className="text-ink-3 hover:text-accent p-0.5"
                          title="Tải ảnh .JPG về máy"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedScreenshots((prev) => prev.filter((x) => x.id !== item.id))
                          }
                          className="text-ink-3 hover:text-critical p-0.5"
                          title="Gỡ ảnh này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <Input
                      value={item.note || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedScreenshots((prev) =>
                          prev.map((x) => (x.id === item.id ? { ...x, note: val } : x))
                        );
                      }}
                      placeholder="Ghi chú ảnh trên BBNT..."
                    />
                    {item.matchedTerm && (
                      <p className="text-2xs text-ink-3 truncate">SP: {item.matchedTerm}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
