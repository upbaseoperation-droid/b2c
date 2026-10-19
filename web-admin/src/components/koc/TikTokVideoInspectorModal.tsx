'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  ExternalLink,
  Check,
  RefreshCw,
  Download,
  Copy,
  FileText,
  Clock,
} from 'lucide-react';
import { BookingDealItem, PublicationItemModel } from '../../lib/types';
import {
  TikTokVideoInspectionResult,
  buildVideoInspectionCsv,
} from '../../lib/tiktokVideoInspector';
import { formatNumber } from '../../lib/format';
import {
  Button,
  DataTable,
  Modal,
  Status,
  Textarea,
} from '../ui';
import type { Column } from '../ui';

interface TikTokVideoInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  deals?: BookingDealItem[];
  initialDeal?: BookingDealItem | null;
  initialUrl?: string;
  onAcceptVideoForDeal?: (
    dealCode: string,
    inspection: TikTokVideoInspectionResult
  ) => void;
  onAddPublication?: (pub: PublicationItemModel) => void;
}

export const TikTokVideoInspectorModal: React.FC<TikTokVideoInspectorModalProps> = ({
  isOpen,
  onClose,
  deals = [],
  initialDeal = null,
  initialUrl = '',
  onAcceptVideoForDeal,
  onAddPublication,
}) => {
  const [rawUrlsInput, setRawUrlsInput] = useState<string>(
    initialUrl || initialDeal?.tiktokVideoUrl || ''
  );
  const [selectedDealCode, setSelectedDealCode] = useState<string>(
    initialDeal?.dealCode || ''
  );

  const [isInspecting, setIsInspecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [results, setResults] = useState<TikTokVideoInspectionResult[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [acceptedVideoIds, setAcceptedVideoIds] = useState<Set<string>>(new Set());

  const currentInitialKey = `${isOpen}:${initialDeal?.dealCode || ''}:${initialUrl}`;
  const [prevInitialKey, setPrevInitialKey] = useState<string>(currentInitialKey);
  if (currentInitialKey !== prevInitialKey) {
    setPrevInitialKey(currentInitialKey);
    if (isOpen) {
      setResults([]);
      setSelectedVideoId('');
      setErrorMessage(null);
      if (initialDeal) {
        setSelectedDealCode(initialDeal.dealCode);
        setRawUrlsInput(initialUrl || initialDeal.tiktokVideoUrl || '');
      } else {
        setSelectedDealCode('');
        setRawUrlsInput(initialUrl || '');
      }
    }
  }

  const selectedDealObj = useMemo(
    () => deals.find((d) => d.dealCode === selectedDealCode) || initialDeal || undefined,
    [deals, selectedDealCode, initialDeal]
  );

  const activeInspection = useMemo(
    () => results.find((r) => r.id === selectedVideoId) || results[0] || null,
    [results, selectedVideoId]
  );

  const handleCopyText = (key: string, text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  const handleRunInspection = async () => {
    if (!rawUrlsInput.trim()) {
      setErrorMessage('Vui lòng dán ít nhất 1 đường link video TikTok.');
      return;
    }

    setIsInspecting(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/integrations/tiktok-koc/inspect-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: rawUrlsInput,
          dealCode: selectedDealCode || undefined,
          expectedHandle: selectedDealObj?.kocChannelId,
          expectedDeadline: selectedDealObj?.deadlinePost || undefined,
          brandName: selectedDealObj?.brandName,
        }),
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        setErrorMessage(json.error || 'Không thể kiểm tra link video lúc này.');
      } else {
        const fetchedResults: TikTokVideoInspectionResult[] = json.data || [];
        setResults(fetchedResults);
        if (fetchedResults.length > 0) {
          setSelectedVideoId(fetchedResults[0].id);
        }
      }
    } catch {
      setErrorMessage('Lỗi kết nối khi kiểm tra link video TikTok.');
    } finally {
      setIsInspecting(false);
    }
  };

  const handleExportCsv = () => {
    if (results.length === 0) return;
    const csvContent = buildVideoInspectionCsv(results);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kiem-tra-video-tiktok-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleAcceptSingleVideo = (item: TikTokVideoInspectionResult) => {
    const targetDealCode = selectedDealCode || item.matchedDealCode;
    if (targetDealCode && onAcceptVideoForDeal) {
      onAcceptVideoForDeal(targetDealCode, item);
    }
    if (onAddPublication) {
      const newPub: PublicationItemModel = {
        id: `pub-${Date.now()}`,
        publicationCode: `PUB-${item.videoId.slice(-5)}`,
        contentItemId: `cnt-${item.videoId.slice(-4)}`,
        contentCode: `CNT-${item.videoId.slice(-4)}`,
        dealCode: targetDealCode || 'BO-AUTO',
        creatorName: item.authorNickname,
        platform: 'TIKTOK',
        platformPostUrl: item.resolvedUrl,
        platformPostId: item.videoId,
        sparkAdsCode: item.sparkAdsVerification.sparkAdsCode,
        sparkAdsExpiryDays: item.sparkAdsVerification.authorizedDays,
        publishedAt: item.publishedDate,
        viewsCount: item.viewsCount,
        likesCount: item.likesCount,
        affiliateGmv: 0,
        itemsSold: 0,
        costAttributed: selectedDealObj?.totalValue || 1500000,
        roi: 0,
        isMediaHandedOff: false,
        verificationStatus: 'VERIFIED',
      };
      onAddPublication(newPub);
    }
    setAcceptedVideoIds((prev) => new Set([...prev, item.videoId]));
  };

  const columns: Column<TikTokVideoInspectionResult>[] = [
    {
      key: 'koc',
      header: 'Kênh KOC',
      width: 155,
      render: (r) => (
        <div className="grid gap-0.5 min-w-0">
          <span className="text-xs font-semibold text-ink truncate">
            {r.authorNickname}
          </span>
          <a
            href={r.authorChannelUrl}
            target="_blank"
            rel="noreferrer"
            className="text-2xs font-code text-accent hover:underline inline-flex items-center gap-1"
          >
            <span>@{r.authorHandle}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      ),
    },
    {
      key: 'content',
      header: 'Bài đăng & Câu mở đầu 3s (Hook)',
      width: 310,
      render: (r) => (
        <div className="grid gap-1 min-w-0 max-w-[330px]">
          {r.contentCheck.hookFirst3Seconds && (
            <div className="text-2xs font-semibold text-ink bg-accent-soft/40 border border-accent/20 rounded px-1.5 py-0.5 line-clamp-1">
              Hook 3s: &ldquo;{r.contentCheck.hookFirst3Seconds}&rdquo;
            </div>
          )}
          <a
            href={r.resolvedUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-ink hover:text-accent line-clamp-2 leading-snug inline-flex items-start gap-1"
          >
            <span>{r.contentCheck.caption || r.resolvedUrl}</span>
            <ExternalLink className="w-3 h-3 shrink-0 mt-0.5 text-ink-3" />
          </a>
          {r.contentCheck.hashtags.length > 0 && (
            <span className="text-2xs font-code text-ink-3 truncate">
              {r.contentCheck.hashtags.join(' ')}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'published',
      header: 'Ngày đăng & Thời lượng',
      width: 155,
      render: (r) => (
        <div className="grid gap-0.5 text-xs tabular-nums">
          <span className="font-medium text-ink">{r.publishedTimeFormatted}</span>
          <span className="text-2xs text-ink-3">
            {r.durationSeconds > 0 ? `${r.durationSeconds} giây · ` : ''}
            {r.contentCheck.hasCartAnchor ? 'Có gắn giỏ hàng' : 'Không gắn giỏ'}
          </span>
        </div>
      ),
    },
    {
      key: 'metrics',
      header: 'Lượt xem & Tương tác',
      align: 'right',
      width: 175,
      render: (r) => (
        <div className="grid gap-0.5 text-xs tabular-nums">
          <span className="font-semibold text-ink">
            {formatNumber(r.viewsCount)} view · ER {r.engagementRate}%
          </span>
          <span className="text-2xs text-ink-3">
            {formatNumber(r.likesCount)} tim · {formatNumber(r.commentsCount)} bình luận ·{' '}
            {formatNumber(r.sharesCount)} chia sẻ
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái & Kịch bản',
      align: 'right',
      width: 195,
      render: (r) => {
        const hasViolation = r.contentCheck.violatedBlacklistWords.length > 0;
        const isSelected = activeInspection?.id === r.id;
        return (
          <div className="flex items-center justify-end gap-1.5 flex-wrap">
            {results.length > 1 && (
              <Button
                size="sm"
                variant={isSelected ? 'primary' : 'ghost'}
                icon={FileText}
                onClick={() => setSelectedVideoId(r.id)}
              >
                Kịch bản
              </Button>
            )}
            {hasViolation ? (
              <Status tone="critical">
                Từ cấm: {r.contentCheck.violatedBlacklistWords.map((w) => w.word).join(', ')}
              </Status>
            ) : (
              <Status tone="positive">Hợp lệ</Status>
            )}
            {(onAcceptVideoForDeal || onAddPublication) && (
              acceptedVideoIds.has(r.videoId) ? (
                <span className="text-2xs font-semibold text-positive">Đã duyệt</span>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Check}
                  onClick={() => handleAcceptSingleVideo(r)}
                >
                  Duyệt
                </Button>
              )
            )}
          </div>
        );
      },
    },
  ];

  const fullScriptCopyText = useMemo(() => {
    if (!activeInspection) return '';
    const sections = activeInspection.contentCheck.scriptSections || [];
    return [
      `=== KỊCH BẢN & LỜI THOẠI VIDEO NGHIỆM THU (@${activeInspection.authorHandle}) ===`,
      `• Link video: ${activeInspection.resolvedUrl}`,
      `• Thời lượng: ${activeInspection.durationSeconds} giây · Lượt xem: ${formatNumber(activeInspection.viewsCount)} (ER ${activeInspection.engagementRate}%)`,
      `• Câu mở đầu 3 giây đầu (Hook): "${activeInspection.contentCheck.hookFirst3Seconds}"`,
      activeInspection.contentCheck.hookPatternLabel
        ? `• Nhóm mở đầu: ${activeInspection.contentCheck.hookPatternLabel}`
        : '',
      '',
      '[KỊCH BẢN 4 BƯỚC TRONG VIDEO]:',
      ...sections.map(
        (s) =>
          `${s.stepIndex}. [${s.timeRange}] ${s.sectionTitle}\n   - Lời thoại / Nội dung: ${s.spokenOrTextContent}\n   - Khung hình: ${s.visualAndActionNote}`
      ),
      '',
      '[LỜI THOẠI CHI TIẾT THEO MỐC GIÂY]:',
      activeInspection.contentCheck.transcriptText || activeInspection.contentCheck.caption,
    ]
      .filter(Boolean)
      .join('\n');
  }, [activeInspection]);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Kiểm tra & Nghiệm thu Link Video TikTok"
      size="2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Đóng
          </Button>
          {results.length > 0 && (
            <Button variant="secondary" icon={Download} onClick={handleExportCsv}>
              Xuất CSV ({results.length})
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {initialDeal && (
          <div className="px-3 py-2 rounded-lg border border-line bg-surface-2 flex items-center justify-between text-xs">
            <span>
              Đối chiếu Deal: <strong className="font-code">{initialDeal.dealCode}</strong> ·{' '}
              <strong>{initialDeal.kocStageName}</strong> (@{initialDeal.kocChannelId}) ·{' '}
              {initialDeal.brandName}
            </span>
            {initialDeal.deadlinePost && (
              <span className="text-2xs text-ink-3">
                Hạn đăng: {initialDeal.deadlinePost}
              </span>
            )}
          </div>
        )}

        <div className="px-3.5 py-2.5 rounded-xl border border-line bg-surface space-y-2">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_auto] gap-2.5 items-start">
            <Textarea
              id="tiktok-video-inspector-input"
              aria-label="Link video TikTok"
              rows={2}
              value={rawUrlsInput}
              onChange={(e) => {
                setRawUrlsInput(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Dán link video TikTok cần nghiệm thu (mỗi dòng 1 link)..."
              className="font-code text-xs"
            />

            <Button
              variant="primary"
              icon={isInspecting ? RefreshCw : Search}
              disabled={isInspecting}
              onClick={handleRunInspection}
            >
              {isInspecting ? 'Đang kiểm tra...' : 'Kiểm tra video'}
            </Button>
          </div>
          {errorMessage && <p className="text-2xs text-critical">{errorMessage}</p>}
        </div>

        {results.length > 0 && (
          <div className="border border-line rounded-xl overflow-hidden bg-surface">
            <DataTable
              rows={results}
              columns={columns}
              rowKey={(r) => r.id}
              fitContainer
              compact
            />
          </div>
        )}

        {activeInspection && (
          <div className="border border-line rounded-xl bg-surface p-3.5 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-line">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-ink">
                  Kịch bản & Lời thoại trong video: @{activeInspection.authorHandle}
                </span>
                {activeInspection.contentCheck.hookPatternLabel && (
                  <Status tone="info">
                    {activeInspection.contentCheck.hookPatternLabel}
                  </Status>
                )}
                <Status tone="neutral">
                  {activeInspection.contentCheck.subtitleSource === 'TIKTOK_AUTO_CAPTIONS_VTT'
                    ? 'Phụ đề giọng nói TikTok (WebVTT)'
                    : 'Tách từ chữ trên màn hình & bài đăng'}
                </Status>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={copiedKey === 'hook' ? Check : Copy}
                  onClick={() =>
                    handleCopyText('hook', activeInspection.contentCheck.hookFirst3Seconds)
                  }
                >
                  {copiedKey === 'hook' ? 'Đã chép Hook 3s' : 'Chép Hook 3s'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={copiedKey === 'full' ? Check : Copy}
                  onClick={() => handleCopyText('full', fullScriptCopyText)}
                >
                  {copiedKey === 'full' ? 'Đã chép kịch bản' : 'Chép toàn bộ kịch bản'}
                </Button>
              </div>
            </div>

            {results.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {results.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedVideoId(item.id)}
                    className={`px-2.5 py-1 rounded-lg text-2xs font-medium border transition ${
                      item.id === activeInspection.id
                        ? 'bg-accent text-white border-accent'
                        : 'bg-surface-2 text-ink-2 border-line hover:text-ink'
                    }`}
                  >
                    #{idx + 1} @{item.authorHandle} ({item.durationSeconds || 30}s)
                  </button>
                ))}
              </div>
            )}

            {/* Câu mở đầu 3 giây đầu (Hook) & Chữ nổi trên màn hình */}
            <div className="grid md:grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-lg border border-accent/25 bg-accent-soft/30 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-accent">
                    Câu mở đầu 3 giây đầu (Hook 00:00 - 00:03)
                  </span>
                  <span className="text-2xs font-code text-ink-3">
                    Xuất hiện SP giây thứ {activeInspection.visualAndAudioCheck.firstProductAppearanceSec}s
                  </span>
                </div>
                <p className="text-xs font-semibold text-ink leading-relaxed">
                  &ldquo;{activeInspection.contentCheck.hookFirst3Seconds || activeInspection.contentCheck.caption}&rdquo;
                </p>
              </div>

              <div className="p-2.5 rounded-lg border border-line bg-surface-2 space-y-1">
                <span className="text-2xs font-semibold uppercase tracking-wider text-ink-3">
                  Chữ chèn trên màn hình (On-screen Text / Stickers) & Giỏ hàng
                </span>
                {activeInspection.contentCheck.onScreenStickers.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {activeInspection.contentCheck.onScreenStickers.map((stk, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-surface border border-line text-2xs text-ink font-medium"
                      >
                        {stk}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-ink-2">
                    {activeInspection.contentCheck.hasCartAnchor
                      ? `Gắn thẻ giỏ hàng: ${activeInspection.contentCheck.cartAnchorTitle || 'TikTok Shop'}`
                      : 'Không chèn sticker chữ tách rời trên khung hình'}
                  </p>
                )}
              </div>
            </div>

            {/* Bóc tách Kịch bản 4 bước */}
            {activeInspection.contentCheck.scriptSections &&
              activeInspection.contentCheck.scriptSections.length > 0 && (
                <div className="grid lg:grid-cols-2 gap-2.5">
                  {activeInspection.contentCheck.scriptSections.map((sec) => (
                    <div
                      key={sec.stepIndex}
                      className="p-2.5 rounded-lg border border-line bg-surface-2/60 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-ink">
                          Bước {sec.stepIndex}: {sec.sectionTitle}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-surface border border-line font-code text-2xs text-ink-2">
                          {sec.timeRange}
                        </span>
                      </div>
                      <p className="text-xs text-ink leading-relaxed">
                        {sec.spokenOrTextContent}
                      </p>
                      <p className="text-2xs text-ink-3">
                        Khung hình: {sec.visualAndActionNote}
                      </p>
                    </div>
                  ))}
                </div>
              )}

            {/* Lời thoại chi tiết theo mốc giây */}
            {activeInspection.contentCheck.subtitleSegments &&
              activeInspection.contentCheck.subtitleSegments.length > 0 && (
                <div className="rounded-lg border border-line bg-surface-2 overflow-hidden">
                  <div className="px-3 py-2 border-b border-line flex items-center justify-between">
                    <span className="text-xs font-semibold text-ink inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-accent" />
                      Lời thoại & Phụ đề bóc tách theo mốc giây ({activeInspection.contentCheck.subtitleSegments.length} phân đoạn)
                    </span>
                    <span className="text-2xs font-code text-ink-3">
                      Âm thanh: {activeInspection.musicTitle}
                    </span>
                  </div>
                  <div className="max-h-44 overflow-y-auto divide-y divide-line/60">
                    {activeInspection.contentCheck.subtitleSegments.map((seg, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-1.5 flex items-start gap-2.5 text-xs hover:bg-surface/60"
                      >
                        <span className="font-code text-2xs text-accent bg-accent-soft/40 px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                          {seg.timeLabel}
                        </span>
                        <span className="text-ink leading-relaxed">{seg.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}
      </div>
    </Modal>
  );
};

