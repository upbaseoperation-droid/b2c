'use client';

import React, { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  FileText,
  RefreshCw,
  Search,
  ShoppingBag,
  Video,
} from 'lucide-react';
import type { CompetitorVideoScriptBreakdown } from '../../lib/tiktokVideoInspector';
import { formatNumber } from '../../lib/format';
import { Button, Modal, Panel, Status } from '../ui';

export interface ScriptExtractFallbackContext {
  handle?: string;
  nickname?: string;
  caption?: string;
  productPromoted?: string;
  views?: number;
  likes?: number;
}

interface CompetitorVideoScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUrl?: string;
  fallbackContext?: ScriptExtractFallbackContext;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const CompetitorVideoScriptModal: React.FC<CompetitorVideoScriptModalProps> = ({
  isOpen,
  onClose,
  initialUrl = '',
  fallbackContext,
  onNotify,
}) => {
  const [videoUrlInput, setVideoUrlInput] = useState(initialUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<CompetitorVideoScriptBreakdown | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const syncKey = `${isOpen}|${initialUrl}`;
  const [prevSyncKey, setPrevSyncKey] = useState(syncKey);
  if (syncKey !== prevSyncKey) {
    setPrevSyncKey(syncKey);
    if (!isOpen) {
      setBreakdown(null);
    } else {
      setVideoUrlInput(initialUrl.trim());
      setError(null);
    }
  }

  const runExtract = async (
    targetUrl: string,
    ctx: ScriptExtractFallbackContext | undefined = fallbackContext
  ) => {
    const clean = targetUrl.trim();
    if (!clean) {
      setError('Vui lòng nhập đường dẫn video TikTok cần tách lời thoại & Hook.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/integrations/tiktok-koc/inspect-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'EXTRACT_SCRIPT',
          url: clean,
          fallbackContext: ctx,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success || !json.breakdown) {
        setError(json.error || 'Không bóc tách được lời thoại từ đường dẫn video này.');
        return;
      }
      setBreakdown(json.breakdown as CompetitorVideoScriptBreakdown);
    } catch {
      setError('Không kết nối được dịch vụ phân tích video TikTok. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, key: string, label: string) => {
    if (!text) return;
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    onNotify?.(`Đã sao chép ${label}`, 'success');
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 1800);
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Tách lời thoại & Câu mở đầu 3 giây (Hook) Video Đối thủ"
      size="2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Đóng
          </Button>
          {breakdown && (
            <>
              <Button
                variant="secondary"
                icon={copiedKey === 'transcript' ? Check : Copy}
                onClick={() =>
                  handleCopy(
                    breakdown.fullTranscriptText,
                    'transcript',
                    'toàn bộ lời thoại video'
                  )
                }
              >
                {copiedKey === 'transcript' ? 'Đã sao chép lời thoại' : 'Sao chép lời thoại'}
              </Button>
              <Button
                variant="primary"
                icon={copiedKey === 'brief' ? Check : FileText}
                onClick={() =>
                  handleCopy(
                    breakdown.readyToCopyBrief,
                    'brief',
                    'Brief kịch bản gửi KOC UpBase'
                  )
                }
              >
                {copiedKey === 'brief'
                  ? 'Đã sao chép Brief gửi KOC'
                  : 'Sao chép Brief gửi KOC UpBase'}
              </Button>
            </>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {/* Thanh nhập link video TikTok */}
        <div className="grid sm:grid-cols-[minmax(0,1fr)_auto] gap-2 items-center">
          <input
            type="text"
            value={videoUrlInput}
            onChange={(e) => {
              setVideoUrlInput(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading) {
                e.preventDefault();
                void runExtract(videoUrlInput);
              }
            }}
            placeholder="Dán link video TikTok của đối thủ hoặc KOC (https://www.tiktok.com/@.../video/...)..."
            className="w-full h-9 px-3 rounded-lg border border-line bg-surface text-xs text-ink font-code focus:outline-none focus:border-line-strong"
          />
          <Button
            variant="primary"
            icon={loading ? RefreshCw : Search}
            disabled={loading}
            onClick={() => void runExtract(videoUrlInput)}
          >
            {loading ? 'Đang bóc tách...' : 'Tách lời thoại & Hook'}
          </Button>
        </div>

        {error && (
          <div className="px-3 py-2 rounded-lg border border-danger/30 bg-danger-soft text-xs text-danger">
            {error}
          </div>
        )}

        {loading && !breakdown && (
          <div className="py-10 text-center text-xs text-ink-2">
            Đang tải phụ đề WebVTT, chữ chèn trên khung hình và cấu trúc Hook 3 giây đầu từ TikTok...
          </div>
        )}

        {breakdown && (
          <div className="space-y-4">
            {/* Tóm tắt thông tin Video & Chỉ số thực tế */}
            <div className="px-4 py-3 rounded-xl border border-line bg-surface-2 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1 min-w-0 max-w-xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <a
                    href={breakdown.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-ink hover:text-accent inline-flex items-center gap-1"
                  >
                    <Video className="w-3.5 h-3.5 text-accent" />
                    <span>@{breakdown.authorHandle}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-ink-3" />
                  </a>
                  <span className="text-2xs text-ink-3 tabular-nums">
                    · Đăng: {breakdown.publishedTimeFormatted} · Thời lượng: {breakdown.durationSeconds}s
                  </span>
                  {breakdown.hasCartAnchor && (
                    <Status tone="positive">
                      <ShoppingBag className="w-3.5 h-3.5 mr-1 inline" />
                      {breakdown.cartAnchorTitle || 'Có gắn giỏ hàng'}
                    </Status>
                  )}
                </div>
                <div className="text-2xs text-ink-2 truncate">{breakdown.caption}</div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs tabular-nums">
                <div>
                  <span className="text-2xs text-ink-3 block">Lượt xem</span>
                  <strong className="text-ink">{formatNumber(breakdown.viewsCount)}</strong>
                </div>
                <div>
                  <span className="text-2xs text-ink-3 block">Lượt thích</span>
                  <strong className="text-ink">{formatNumber(breakdown.likesCount)}</strong>
                </div>
                <div>
                  <span className="text-2xs text-ink-3 block">Bình luận</span>
                  <strong className="text-ink">{formatNumber(breakdown.commentsCount)}</strong>
                </div>
                <div>
                  <span className="text-2xs text-ink-3 block">Tương tác ER</span>
                  <strong className="text-positive">{breakdown.engagementRate}%</strong>
                </div>
              </div>
            </div>

            {/* Khối 1: CÂU MỞ ĐẦU 3 GIÂY ĐẦU (HOOK) & BIẾN THỂ CHO UPBASE */}
            <Panel
              title="1. Phân tích Câu mở đầu 3 giây đầu (Hook) & Biến thể đối trọng"
              actions={
                <Status tone="warning">{breakdown.hookAnalysis.hookPatternLabel}</Status>
              }
            >
              <div className="space-y-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-line bg-surface-2 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-2xs font-semibold text-ink-2">
                        Lời mở đầu 3 giây đầu (00:00 - 00:03)
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            breakdown.hookAnalysis.spokenHook3s,
                            'hook3s',
                            'câu mở đầu 3 giây'
                          )
                        }
                        className="text-2xs text-accent hover:underline inline-flex items-center gap-1"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedKey === 'hook3s' ? 'Đã chép' : 'Sao chép'}</span>
                      </button>
                    </div>
                    <div className="text-xs font-semibold text-ink leading-relaxed">
                      &ldquo;{breakdown.hookAnalysis.spokenHook3s}&rdquo;
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-line bg-surface-2 space-y-2">
                    <span className="text-2xs font-semibold text-ink-2 block">
                      Chữ nổi trên màn hình & Cơ chế giữ chân
                    </span>
                    <div className="text-xs font-medium text-ink">
                      Chữ khung hình: {breakdown.hookAnalysis.onScreenTextHook}
                    </div>
                    <div className="text-2xs text-ink-2 leading-relaxed">
                      {breakdown.hookAnalysis.whyItWorks}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-2xs font-semibold text-ink-2 block">
                    Gợi ý 3 câu mở đầu 3 giây viết lại cho KOC UpBase
                  </span>
                  <div className="grid gap-2">
                    {breakdown.hookAnalysis.upbaseAdaptationHooks.map((hookLine, idx) => {
                      const k = `adapt-${idx}`;
                      return (
                        <div
                          key={k}
                          className="px-3 py-2 rounded-lg border border-line bg-surface flex items-center justify-between gap-3"
                        >
                          <span className="text-xs text-ink leading-snug">{hookLine}</span>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(hookLine, k, `biến thể Hook #${idx + 1}`)
                            }
                            className="text-2xs text-accent hover:underline shrink-0 inline-flex items-center gap-1 font-medium"
                          >
                            {copiedKey === k ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Đã chép</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Chép câu này</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Panel>

            {/* Khối 2: BÓC TÁCH KHUNG KỊCH BẢN 4 BƯỚC */}
            <Panel title="2. Bóc tách Khung kịch bản 4 bước (Mở bài → Vấn đề → Trải nghiệm USP → Chốt giỏ hàng)">
              <div className="grid md:grid-cols-2 gap-3">
                {breakdown.scriptSections.map((sec) => (
                  <div
                    key={sec.stepIndex}
                    className="p-3 rounded-lg border border-line bg-surface space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-ink">
                        Bước {sec.stepIndex}: {sec.sectionTitle}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-surface-2 border border-line font-code text-2xs text-ink-2 tabular-nums">
                        {sec.timeRange}
                      </span>
                    </div>
                    <div className="text-xs text-ink leading-relaxed">
                      <strong className="text-ink-2">Lời thoại / Nội dung: </strong>
                      {sec.spokenOrTextContent}
                    </div>
                    <div className="text-2xs text-ink-3 leading-snug">
                      <strong>Góc máy & Hình ảnh: </strong>
                      {sec.visualAndActionNote}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Khối 3: LỜI THOẠI CHI TIẾT THEO MỐC GIÂY & PHẢN ỨNG NGƯỜI XEM */}
            <div className="grid lg:grid-cols-2 gap-4">
              <Panel
                title={`3. Lời thoại theo mốc giây (${breakdown.subtitleSegments.length} đoạn)`}
                actions={
                  <Status tone="neutral">{breakdown.subtitleSourceLabel}</Status>
                }
              >
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {breakdown.subtitleSegments.map((seg, i) => (
                    <div
                      key={`${seg.timeLabel}-${i}`}
                      className="px-3 py-2 rounded border border-line bg-surface-2 flex items-start gap-3 text-xs"
                    >
                      <span className="font-code text-2xs text-accent font-semibold shrink-0 mt-0.5 tabular-nums">
                        [{seg.timeLabel}]
                      </span>
                      <span className="text-ink leading-snug">{seg.text}</span>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel
                title={`4. Luận điểm bán hàng & Bình luận hỏi mua (${breakdown.viewerReactions.buyingIntentRate}% hỏi mua)`}
              >
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {breakdown.detectedSellingPoints.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-2xs font-semibold text-ink-2 block">
                        Điểm nhấn sản phẩm phát hiện trong video
                      </span>
                      {breakdown.detectedSellingPoints.map((pt, i) => (
                        <div
                          key={i}
                          className="px-3 py-2 rounded border border-line bg-surface text-xs text-ink"
                        >
                          • {pt}
                        </div>
                      ))}
                    </div>
                  )}

                  {breakdown.viewerReactions.topQuestionsAndComments.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-2xs font-semibold text-ink-2 block">
                        Bình luận thực tế của người xem dưới video
                      </span>
                      {breakdown.viewerReactions.topQuestionsAndComments.map((cmt, i) => (
                        <div
                          key={i}
                          className="px-3 py-2 rounded border border-line bg-surface-2 text-xs flex items-start justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <span className="font-semibold text-ink">@{cmt.username}: </span>
                            <span className="text-ink-2">{cmt.text}</span>
                          </div>
                          <Status tone="neutral">{cmt.intentLabel}</Status>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Panel>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
