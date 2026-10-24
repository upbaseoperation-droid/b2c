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
  ShoppingBag,
  Camera,
} from 'lucide-react';
import { BookingDealItem, PublicationItemModel } from '../../lib/types';
import {
  TikTokVideoInspectionResult,
  buildVideoInspectionCsv,
} from '../../lib/tiktokVideoInspector';
import { formatNumber, getVietnamDateYmd } from '../../lib/format';
import { findSavedScreenshotsForContext } from '../../lib/acceptanceScreenshotStore';
import { VideoProductScreenshotModal } from '../contracts/VideoProductScreenshotModal';
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
  const [requiredHashtagsInput, setRequiredHashtagsInput] = useState<string>('');
  const [requiredUspInput, setRequiredUspInput] = useState<string>(
    initialDeal?.contentHook || ''
  );
  const [expectedDeadlineInput, setExpectedDeadlineInput] = useState<string>(
    initialDeal?.deadlinePost || ''
  );
  const [expectedHandleInput, setExpectedHandleInput] = useState<string>(
    initialDeal?.kocChannelId || ''
  );
  const [expectedCartUrlInput, setExpectedCartUrlInput] = useState<string>('');
  const [minDurationInput, setMinDurationInput] = useState<string>('15');

  const [isInspecting, setIsInspecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [results, setResults] = useState<TikTokVideoInspectionResult[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [acceptedVideoIds, setAcceptedVideoIds] = useState<Set<string>>(new Set());
  const [screenshotModalOpen, setScreenshotModalOpen] = useState(false);
  const [savedScreenshotCount, setSavedScreenshotCount] = useState<number>(0);

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
        setExpectedDeadlineInput(initialDeal.deadlinePost || '');
        setExpectedHandleInput(initialDeal.kocChannelId || '');
        setRequiredUspInput(initialDeal.contentHook || '');
        setRequiredHashtagsInput(
          initialDeal.brandName
            ? `#${initialDeal.brandName.replace(/\s+/g, '')}`
            : ''
        );
      } else {
        setSelectedDealCode('');
        setRawUrlsInput(initialUrl || '');
        setExpectedDeadlineInput('');
        setExpectedHandleInput('');
        setRequiredUspInput('');
        setRequiredHashtagsInput('');
      }
    }
  }

  const selectedDealObj = useMemo(
    () => (isOpen && selectedDealCode ? deals.find((d) => d.dealCode === selectedDealCode) : undefined) || initialDeal || undefined,
    [isOpen, deals, selectedDealCode, initialDeal]
  );

  const selectableDeals = useMemo(() => {
    if (!isOpen) return [];
    const slice = deals.slice(0, 150);
    if (selectedDealObj && !slice.some((d) => d.id === selectedDealObj.id)) {
      return [selectedDealObj, ...slice];
    }
    return slice;
  }, [isOpen, deals, selectedDealObj]);

  const activeInspection = useMemo(
    () => results.find((r) => r.id === selectedVideoId) || results[0] || null,
    [results, selectedVideoId]
  );

  const inspectionSummary = useMemo(() => {
    const total = results.length;
    const passed = results.filter((r) => r.verdict === 'ĐẠT_CHUẨN').length;
    const warning = results.filter((r) => r.verdict === 'CẦN_KIỂM_TRA').length;
    const failed = results.filter((r) => r.verdict === 'KHÔNG_ĐẠT').length;
    const onTime = results.filter((r) => r.isOnTime).length;
    return { total, passed, warning, failed, onTime };
  }, [results]);

  const handleDealSelectChange = (dealCode: string) => {
    setSelectedDealCode(dealCode);
    const deal = deals.find((d) => d.dealCode === dealCode);
    if (deal) {
      setExpectedDeadlineInput(deal.deadlinePost || '');
      setExpectedHandleInput(deal.kocChannelId || '');
      if (deal.contentHook) setRequiredUspInput(deal.contentHook);
      if (deal.brandName) {
        setRequiredHashtagsInput(`#${deal.brandName.replace(/\s+/g, '')}`);
      }
      if (!rawUrlsInput.trim() && deal.tiktokVideoUrl) {
        setRawUrlsInput(deal.tiktokVideoUrl);
      }
    }
  };

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

    const parsedHashtags = requiredHashtagsInput
      .split(/[\s,;]+/)
      .map((h) => h.trim())
      .filter(Boolean);

    const parsedUspKeywords = requiredUspInput
      .split(/[,;\n]+/)
      .map((kw) => kw.trim())
      .filter(Boolean);

    const minDurNum = Number(minDurationInput);

    try {
      const response = await fetch('/api/integrations/tiktok-koc/inspect-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: rawUrlsInput,
          dealCode: selectedDealCode || undefined,
          expectedHandle: expectedHandleInput.trim() || selectedDealObj?.kocChannelId || undefined,
          expectedDeadline: expectedDeadlineInput.trim() || selectedDealObj?.deadlinePost || undefined,
          expectedCartUrl: expectedCartUrlInput.trim() || undefined,
          requiredHashtags: parsedHashtags.length > 0 ? parsedHashtags : undefined,
          requiredUspKeywords: parsedUspKeywords.length > 0 ? parsedUspKeywords : undefined,
          minDurationSeconds: Number.isFinite(minDurNum) && minDurNum > 0 ? minDurNum : 15,
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
    link.download = `kiem-tra-video-tiktok-${getVietnamDateYmd()}.csv`;
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
          {!r.isChannelMatched && r.expectedKocHandle && (
            <span className="text-2xs text-critical font-medium">
              Lệch kênh cam kết (@{r.expectedKocHandle})
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'content',
      header: 'Bài đăng & Câu mở đầu 3s (Hook)',
      width: 300,
      render: (r) => (
        <div className="grid gap-1 min-w-0 max-w-[320px]">
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
      header: 'Ngày đăng, Giỏ hàng & SLA',
      width: 210,
      render: (r) => {
        const cartUrl =
          r.cartAnchorVerification.detectedProductUrl ||
          r.contentCheck.cartAnchorUrl ||
          (r.cartAnchorVerification.detectedProductId
            ? `https://shop.tiktok.com/view/product/${r.cartAnchorVerification.detectedProductId}?region=VN&locale=vi-VN`
            : undefined);
        const extraProdCount =
          (r.cartAnchorVerification.detectedProducts?.length ?? 0) > 1
            ? (r.cartAnchorVerification.detectedProducts?.length ?? 1) - 1
            : 0;
        const cartComp = r.cartAnchorVerification.cartLinkComparison;
        return (
          <div className="grid gap-0.5 text-xs tabular-nums">
            <span className="font-medium text-ink">{r.publishedTimeFormatted}</span>
            <div className="flex items-center gap-1.5 flex-wrap text-2xs text-ink-3">
              {r.durationSeconds > 0 ? <span>{r.durationSeconds}s ·</span> : null}
              {r.contentCheck.hasCartAnchor ? (
                cartUrl ? (
                  <a
                    href={cartUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-accent font-medium hover:underline"
                    title={r.cartAnchorVerification.detectedProductTitle || cartUrl}
                  >
                    <ShoppingBag className="w-3 h-3 shrink-0" />
                    <span>Link giỏ hàng</span>
                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                  </a>
                ) : (
                  <span className="text-positive font-medium">Có gắn giỏ</span>
                )
              ) : (
                <span>Không gắn giỏ</span>
              )}
              {extraProdCount > 0 && (
                <span className="px-1 py-0.2 rounded bg-accent-soft text-accent text-2xs font-semibold">
                  +{extraProdCount} SP
                </span>
              )}
            </div>
            {cartComp?.hasExpectedInput && (
              <span
                className={`text-2xs font-semibold ${
                  cartComp.status === 'MATCHED' ? 'text-positive' : 'text-critical'
                }`}
              >
                {cartComp.status === 'MATCHED'
                  ? '✓ Khớp link giỏ hàng mẫu'
                  : cartComp.status === 'MISSING_CART'
                  ? '✕ Chưa gắn link giỏ mẫu'
                  : '✕ Lệch link giỏ hàng mẫu'}
              </span>
            )}
            {r.expectedDeadline && (
              <span
                className={`text-2xs font-semibold ${
                  r.isOnTime ? 'text-positive' : 'text-critical'
                }`}
              >
                {r.isOnTime
                  ? `Đúng hạn (${r.expectedDeadline})`
                  : `Trễ ${r.daysDelayed} ngày (Hạn ${r.expectedDeadline})`}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'metrics',
      header: 'Lượt xem & Tương tác',
      align: 'right',
      width: 170,
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
      header: 'Kết luận Brief & Kịch bản',
      align: 'right',
      width: 215,
      render: (r) => {
        const isSelected = activeInspection?.id === r.id;
        return (
          <div className="grid gap-1 justify-items-end">
            <div className="flex items-center justify-end gap-1.5 flex-wrap">
              {results.length > 1 && (
                <Button
                  size="sm"
                  variant={isSelected ? 'primary' : 'ghost'}
                  icon={FileText}
                  onClick={() => setSelectedVideoId(r.id)}
                >
                  Chi tiết
                </Button>
              )}
              {r.verdict === 'ĐẠT_CHUẨN' ? (
                <Status tone="positive">Đạt chuẩn</Status>
              ) : r.verdict === 'CẦN_KIỂM_TRA' ? (
                <Status tone="warning">Cần kiểm tra</Status>
              ) : (
                <Status tone="critical">Không đạt</Status>
              )}
              {(onAcceptVideoForDeal || onAddPublication) &&
                (acceptedVideoIds.has(r.videoId) ? (
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
                ))}
            </div>
            {r.verdict !== 'ĐẠT_CHUẨN' && (
              <span className="text-2xs text-ink-3 text-right line-clamp-1 max-w-[205px]">
                {r.verdictSummary}
              </span>
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
      `=== KỊCH BẢN & ĐỐI SOÁT BRIEF VIDEO NGHIỆM THU (@${activeInspection.authorHandle}) ===`,
      `• Link video: ${activeInspection.resolvedUrl}`,
      `• Kết luận nghiệm thu: ${activeInspection.verdict} (${activeInspection.verdictSummary})`,
      `• Thời lượng: ${activeInspection.durationSeconds} giây · Lượt xem: ${formatNumber(activeInspection.viewsCount)} (ER ${activeInspection.engagementRate}%)`,
      `• Giỏ hàng TikTok Shop: ${
        activeInspection.contentCheck.hasCartAnchor
          ? activeInspection.cartAnchorVerification.detectedProductTitle || 'Có gắn giỏ hàng'
          : 'Chưa gắn giỏ hàng'
      }`,
      activeInspection.cartAnchorVerification.detectedProductUrl
        ? `• Link giỏ hàng: ${activeInspection.cartAnchorVerification.detectedProductUrl}`
        : '',
      `• Câu mở đầu 3 giây đầu (Hook): "${activeInspection.contentCheck.hookFirst3Seconds}"`,
      activeInspection.contentCheck.hookPatternLabel
        ? `• Nhóm mở đầu: ${activeInspection.contentCheck.hookPatternLabel}`
        : '',
      '',
      '[CHECKLIST 5 TIÊU CHÍ ĐỐI SOÁT BRIEF]:',
      ...activeInspection.checklist.map(
        (c) => `- [${c.passed ? 'ĐẠT' : 'CHƯA ĐẠT'}] ${c.label}: ${c.detail}`
      ),
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

  if (!isOpen) return null;

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
          <Button
            variant="secondary"
            icon={Camera}
            onClick={() => setScreenshotModalOpen(true)}
          >
            Chụp ảnh sản phẩm cho BBNT{savedScreenshotCount > 0 ? ` (${savedScreenshotCount})` : ''}
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
        {/* Khung nhập Link & Tiêu chí đối soát theo Brief chiến dịch */}
        <div className="px-3.5 py-3 rounded-xl border border-line bg-surface space-y-3">
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

          <div className="pt-2.5 border-t border-line grid sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {selectableDeals.length > 0 ? (
              <label className="grid gap-1 text-2xs font-medium text-ink-2">
                <span>Deal Booking đối chiếu</span>
                <select
                  value={selectedDealCode}
                  onChange={(e) => handleDealSelectChange(e.target.value)}
                  className="h-8 px-2.5 rounded-md border border-line bg-surface-2 text-xs text-ink"
                >
                  <option value="">-- Không chọn Deal --</option>
                  {selectableDeals.map((d) => (
                    <option key={d.id} value={d.dealCode}>
                      {d.dealCode} · @{d.kocChannelId} ({d.brandName})
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="grid gap-1 text-2xs font-medium text-ink-2">
                <span>Kênh KOC cam kết (@handle)</span>
                <input
                  type="text"
                  value={expectedHandleInput}
                  onChange={(e) => setExpectedHandleInput(e.target.value)}
                  placeholder="VD: @reviewmypham..."
                  className="h-8 px-2.5 rounded-md border border-line bg-surface-2 text-xs text-ink font-code"
                />
              </label>
            )}

            <label className="grid gap-1 text-2xs font-medium text-ink-2">
              <span>Hashtag bắt buộc</span>
              <input
                type="text"
                value={requiredHashtagsInput}
                onChange={(e) => setRequiredHashtagsInput(e.target.value)}
                placeholder="VD: #CocoonVietnam, #TayDaChet"
                className="h-8 px-2.5 rounded-md border border-line bg-surface-2 text-xs text-ink font-code"
              />
            </label>

            <label className="grid gap-1 text-2xs font-medium text-ink-2">
              <span title="Link giỏ hàng mẫu đối chiếu hoặc Mã SP">Link giỏ hàng / Mã SP</span>
              <input
                type="text"
                value={expectedCartUrlInput}
                onChange={(e) => setExpectedCartUrlInput(e.target.value)}
                placeholder="Dán link giỏ hàng TikTok Shop hoặc mã SP..."
                className="h-8 px-2.5 rounded-md border border-line bg-surface-2 text-xs text-ink font-code"
              />
            </label>

            <label className="grid gap-1 text-2xs font-medium text-ink-2">
              <span title="Từ khóa USP bắt buộc nói trong video">Từ khóa USP bắt buộc</span>
              <input
                type="text"
                value={requiredUspInput}
                onChange={(e) => setRequiredUspInput(e.target.value)}
                placeholder="VD: không cồn, dịu nhẹ, cà phê Đắk Lắk"
                className="h-8 px-2.5 rounded-md border border-line bg-surface-2 text-xs text-ink"
              />
            </label>

            <div className="grid grid-cols-[minmax(0,1fr)_72px] gap-2">
              <label className="grid gap-1 text-2xs font-medium text-ink-2">
                <span>Hạn đăng SLA</span>
                <input
                  type="date"
                  value={expectedDeadlineInput}
                  onChange={(e) => setExpectedDeadlineInput(e.target.value)}
                  className="h-8 px-2 rounded-md border border-line bg-surface-2 text-xs text-ink font-code"
                />
              </label>
              <label className="grid gap-1 text-2xs font-medium text-ink-2">
                <span>Tối thiểu (s)</span>
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={minDurationInput}
                  onChange={(e) => setMinDurationInput(e.target.value)}
                  className="h-8 px-2 rounded-md border border-line bg-surface-2 text-xs text-ink font-code tabular-nums"
                />
              </label>
            </div>
          </div>

          {errorMessage && <p className="text-2xs text-critical">{errorMessage}</p>}
        </div>

        {/* Thanh tổng hợp kết quả đối soát Brief */}
        {results.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <div className="px-3 py-2 rounded-lg border border-line bg-surface-2 flex items-center justify-between">
              <span className="text-2xs text-ink-3">Tổng video</span>
              <span className="text-xs font-semibold text-ink tabular-nums">
                {inspectionSummary.total}
              </span>
            </div>
            <div className="px-3 py-2 rounded-lg border border-line bg-surface-2 flex items-center justify-between">
              <span className="text-2xs text-ink-3">Đạt chuẩn</span>
              <span className="text-xs font-semibold text-positive tabular-nums">
                {inspectionSummary.passed}
              </span>
            </div>
            <div className="px-3 py-2 rounded-lg border border-line bg-surface-2 flex items-center justify-between">
              <span className="text-2xs text-ink-3">Cần kiểm tra</span>
              <span className="text-xs font-semibold text-warning tabular-nums">
                {inspectionSummary.warning}
              </span>
            </div>
            <div className="px-3 py-2 rounded-lg border border-line bg-surface-2 flex items-center justify-between">
              <span className="text-2xs text-ink-3">Không đạt</span>
              <span className="text-xs font-semibold text-critical tabular-nums">
                {inspectionSummary.failed}
              </span>
            </div>
            <div className="px-3 py-2 rounded-lg border border-line bg-surface-2 flex items-center justify-between">
              <span className="text-2xs text-ink-3">Đúng hạn SLA</span>
              <span className="text-xs font-semibold text-ink tabular-nums">
                {inspectionSummary.onTime}/{inspectionSummary.total}
              </span>
            </div>
          </div>
        )}

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
            {results.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-line">
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
                    #{idx + 1} @{item.authorHandle} ({item.verdict === 'ĐẠT_CHUẨN' ? 'Đạt' : item.verdict === 'CẦN_KIỂM_TRA' ? 'Cần xem' : 'Lỗi'})
                  </button>
                ))}
              </div>
            )}

            {/* Checklist 5 tiêu chí đối soát theo Brief chiến dịch */}
            <div className="rounded-lg border border-line bg-surface-2/60 p-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-ink">
                    Checklist 5 Tiêu chí Đối soát Brief: @{activeInspection.authorHandle}
                  </span>
                  {activeInspection.verdict === 'ĐẠT_CHUẨN' ? (
                    <Status tone="positive">Đạt chuẩn nghiệm thu</Status>
                  ) : activeInspection.verdict === 'CẦN_KIỂM_TRA' ? (
                    <Status tone="warning">{activeInspection.verdictSummary}</Status>
                  ) : (
                    <Status tone="critical">{activeInspection.verdictSummary}</Status>
                  )}
                </div>
                <span className="text-2xs font-code text-ink-3">
                  Đạt {activeInspection.checklist.filter((c) => c.passed).length}/
                  {activeInspection.checklist.length} tiêu chí
                </span>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
                {activeInspection.checklist.map((item) => (
                  <div
                    key={item.key}
                    className={`p-2 rounded-lg border text-xs space-y-1 ${
                      item.passed
                        ? 'border-line bg-surface'
                        : 'border-critical/40 bg-critical-soft/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-semibold text-ink text-2xs">
                        {item.label}
                      </span>
                      <Status tone={item.passed ? 'positive' : 'critical'}>
                        {item.passed ? 'Đạt' : 'Chưa đạt'}
                      </Status>
                    </div>
                    <p className="text-2xs text-ink-2 leading-snug">{item.detail}</p>
                  </div>
                ))}
              </div>

              {/* Chi tiết Từ khóa USP, Hashtag bắt buộc & Từ cấm nếu có */}
              {(activeInspection.contentCheck.matchedRequiredHashtags.length > 0 ||
                activeInspection.contentCheck.missingRequiredHashtags.length > 0 ||
                activeInspection.contentCheck.matchedUspKeywords.length > 0 ||
                activeInspection.contentCheck.missingUspKeywords.length > 0 ||
                activeInspection.contentCheck.violatedBlacklistWords.length > 0) && (
                <div className="pt-2 border-t border-line flex flex-wrap gap-2 text-2xs">
                  {activeInspection.contentCheck.matchedRequiredHashtags.map((ht) => (
                    <span
                      key={`ht-ok-${ht}`}
                      className="px-2 py-0.5 rounded bg-positive-soft text-positive font-code font-medium"
                    >
                      Đủ hashtag: {ht}
                    </span>
                  ))}
                  {activeInspection.contentCheck.missingRequiredHashtags.map((ht) => (
                    <span
                      key={`ht-miss-${ht}`}
                      className="px-2 py-0.5 rounded bg-critical-soft text-critical font-code font-medium"
                    >
                      Thiếu hashtag: {ht}
                    </span>
                  ))}
                  {activeInspection.contentCheck.matchedUspKeywords.map((kw) => (
                    <span
                      key={`usp-ok-${kw}`}
                      className="px-2 py-0.5 rounded bg-positive-soft text-positive font-medium"
                    >
                      Đã nói USP: &ldquo;{kw}&rdquo;
                    </span>
                  ))}
                  {activeInspection.contentCheck.missingUspKeywords.map((kw) => (
                    <span
                      key={`usp-miss-${kw}`}
                      className="px-2 py-0.5 rounded bg-warning-soft text-warning font-medium"
                    >
                      Chưa nhắc USP: &ldquo;{kw}&rdquo;
                    </span>
                  ))}
                  {activeInspection.contentCheck.violatedBlacklistWords.map((v, i) => (
                    <span
                      key={`bl-${i}`}
                      className="px-2 py-0.5 rounded bg-critical-soft text-critical font-medium"
                    >
                      Từ cấm &ldquo;{v.word}&rdquo; → {v.suggestion}
                    </span>
                  ))}
                </div>
              )}
            </div>

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

            {/* Câu mở đầu 3 giây đầu (Hook) & Chữ nổi trên màn hình */}
            <div className="grid md:grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-lg border border-accent/25 bg-accent-soft/30 space-y-1.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-accent">
                    Câu mở đầu 3 giây đầu (Hook 00:00 - 00:03)
                  </span>
                  {activeInspection.visualAndAudioCheck.firstProductAppearanceSec !== null ? (
                    <span className="px-1.5 py-0.5 rounded bg-positive-soft text-positive text-2xs font-code font-semibold">
                      Nhắc tên SP giây thứ {activeInspection.visualAndAudioCheck.firstProductAppearanceSec}s
                      {activeInspection.visualAndAudioCheck.firstProductMentionTerm
                        ? ` (“${activeInspection.visualAndAudioCheck.firstProductMentionTerm}”)`
                        : ''}
                    </span>
                  ) : (
                    <span className="text-2xs font-code text-ink-3">
                      Chưa phát hiện mốc giây nhắc tên SP trong phụ đề
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-ink leading-relaxed">
                  &ldquo;{activeInspection.contentCheck.hookFirst3Seconds || activeInspection.contentCheck.caption}&rdquo;
                </p>
                {activeInspection.visualAndAudioCheck.firstProductMentionQuote && (
                  <div className="pt-1 border-t border-accent/20 flex items-start justify-between gap-2 text-2xs text-ink-2">
                    <span>
                      Câu nhắc SP đầu tiên ({activeInspection.visualAndAudioCheck.firstProductMentionTimeLabel}):{' '}
                      <strong className="text-ink">
                        &ldquo;{activeInspection.visualAndAudioCheck.firstProductMentionQuote}&rdquo;
                      </strong>
                    </span>
                    {(activeInspection.visualAndAudioCheck.productMentionMoments?.length ?? 0) > 1 && (
                      <span className="shrink-0 font-code text-accent">
                        Tổng {activeInspection.visualAndAudioCheck.productMentionMoments?.length} lần nhắc
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="p-2.5 rounded-lg border border-line bg-surface-2 space-y-1.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-ink-3">
                    Giỏ hàng TikTok Shop & Đối chiếu Link SP
                  </span>
                  <div className="flex items-center gap-1.5">
                    {activeInspection.cartAnchorVerification.cartLinkComparison?.hasExpectedInput && (
                      <Status
                        tone={
                          activeInspection.cartAnchorVerification.cartLinkComparison.status ===
                          'MATCHED'
                            ? 'positive'
                            : 'critical'
                        }
                      >
                        {activeInspection.cartAnchorVerification.cartLinkComparison.status ===
                        'MATCHED'
                          ? 'Khớp link mẫu'
                          : activeInspection.cartAnchorVerification.cartLinkComparison.status ===
                            'MISSING_CART'
                          ? 'Chưa gắn giỏ mẫu'
                          : 'Sai link giỏ hàng'}
                      </Status>
                    )}
                    {activeInspection.contentCheck.hasCartAnchor ? (
                      <Status
                        tone={
                          (activeInspection.cartAnchorVerification.detectedProducts?.length ?? 0) > 0
                            ? 'positive'
                            : activeInspection.cartAnchorVerification.hasCapCutConflict
                            ? 'warning'
                            : 'neutral'
                        }
                      >
                        Có gắn giỏ (
                        {(activeInspection.cartAnchorVerification.detectedProducts?.length ?? 0) > 0
                          ? `${activeInspection.cartAnchorVerification.detectedProducts?.length} SP`
                          : activeInspection.cartAnchorVerification.diagnosticCode === 'CAPCUT_CONFLICT'
                          ? 'Thẻ CapCut đè web'
                          : 'Đã xác nhận'}
                        )
                      </Status>
                    ) : (
                      <Status tone="neutral">Không gắn giỏ</Status>
                    )}
                  </div>
                </div>

                {activeInspection.cartAnchorVerification.cartLinkComparison?.hasExpectedInput && (
                  <div
                    className={`p-2 rounded-lg border text-2xs space-y-0.5 ${
                      activeInspection.cartAnchorVerification.cartLinkComparison.status ===
                      'MATCHED'
                        ? 'border-positive/30 bg-positive-soft/30 text-positive'
                        : 'border-critical/40 bg-critical-soft/25 text-critical'
                    }`}
                  >
                    <p className="font-semibold">
                      {activeInspection.cartAnchorVerification.cartLinkComparison.detailNote}
                    </p>
                    <p className="font-code text-ink-3 truncate">
                      Link/Mã mẫu đối chiếu:{' '}
                      {activeInspection.cartAnchorVerification.cartLinkComparison.expectedRawInput}
                    </p>
                  </div>
                )}

                {(activeInspection.cartAnchorVerification.detectedProducts?.length ?? 0) > 0 ? (
                  <div className="grid gap-1.5">
                    {activeInspection.cartAnchorVerification.detectedProducts?.map((prod, idx) => {
                      const comp = activeInspection.cartAnchorVerification.cartLinkComparison;
                      const isMatchedWithExpected =
                        comp?.hasExpectedInput &&
                        comp.matchedProducts.some(
                          (m) =>
                            (m.productId && m.productId === prod.productId) ||
                            (m.productUrl && m.productUrl === prod.productUrl)
                        );
                      return (
                        <div
                          key={prod.productId || prod.productUrl || idx}
                          className={`p-2 rounded-lg border space-y-1 ${
                            comp?.hasExpectedInput
                              ? isMatchedWithExpected
                                ? 'border-positive/40 bg-positive-soft/15'
                                : 'border-warning/40 bg-surface'
                              : 'border-line bg-surface'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5 min-w-0">
                              {prod.coverUrl && (
                                <img
                                  src={prod.coverUrl}
                                  alt={prod.title}
                                  className="w-11 h-11 rounded-md object-cover border border-line shrink-0 bg-surface-2"
                                  referrerPolicy="no-referrer"
                                />
                              )}
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {comp?.hasExpectedInput && (
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-2xs font-semibold ${
                                        isMatchedWithExpected
                                          ? 'bg-positive text-white'
                                          : 'bg-warning-soft text-warning'
                                      }`}
                                    >
                                      {isMatchedWithExpected ? 'Đúng SP mẫu' : 'SP ngoài link mẫu'}
                                    </span>
                                  )}
                                  <p className="text-xs font-semibold text-ink line-clamp-2">
                                    {prod.title}
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 text-2xs text-ink-3 font-code mt-0.5">
                                  {prod.anchorKeyword && (
                                    <span className="px-1.5 py-0.2 rounded bg-accent-soft/50 text-accent font-sans font-medium">
                                      Nhãn giỏ: &ldquo;{prod.anchorKeyword}&rdquo;
                                    </span>
                                  )}
                                  {prod.categoryName && (
                                    <span className="px-1.5 py-0.2 rounded bg-surface-2 border border-line text-ink-2 font-sans">
                                      {prod.categoryName}
                                    </span>
                                  )}
                                  {prod.productId && <span>Mã SP: {prod.productId}</span>}
                                  {prod.skuId && <span>SKU: {prod.skuId}</span>}
                                  {prod.sellerId && <span>Shop ID: {prod.sellerId}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {(prod.productUrl || prod.productId) && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    setExpectedCartUrlInput(prod.productUrl || prod.productId)
                                  }
                                >
                                  Dùng đối chiếu
                                </Button>
                              )}
                              {(() => {
                                const prodLink =
                                  prod.productUrl ||
                                  (prod.productId
                                    ? `https://shop.tiktok.com/view/product/${prod.productId}?region=VN&locale=vi-VN`
                                    : undefined);
                                if (!prodLink) return null;
                                return (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      icon={copiedKey === `cart-${idx}` ? Check : Copy}
                                      onClick={() => handleCopyText(`cart-${idx}`, prodLink)}
                                    >
                                      {copiedKey === `cart-${idx}` ? 'Đã chép' : 'Chép link'}
                                    </Button>
                                    <a
                                      href={prodLink}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-accent text-white text-2xs font-medium hover:opacity-90"
                                    >
                                      <span>Mở giỏ</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                          {(() => {
                            const prodLink =
                              prod.productUrl ||
                              (prod.productId
                                ? `https://shop.tiktok.com/view/product/${prod.productId}?region=VN&locale=vi-VN`
                                : undefined);
                            if (!prodLink) return null;
                            return (
                              <a
                                href={prodLink}
                                target="_blank"
                                rel="noreferrer"
                                className="block text-2xs font-code text-accent hover:underline truncate"
                                title={prodLink}
                              >
                                {prodLink}
                              </a>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                ) : activeInspection.contentCheck.hasCartAnchor ? (
                  <div className="p-3 rounded-lg border border-line bg-surface space-y-2 text-xs">
                    {(activeInspection.cartAnchorVerification.detectedProductTitle ||
                      activeInspection.contentCheck.cartAnchorTitle) ? (
                      <>
                        <p className="font-semibold text-ink">
                          {activeInspection.cartAnchorVerification.detectedProductTitle ||
                            activeInspection.contentCheck.cartAnchorTitle}
                        </p>
                        {activeInspection.cartAnchorVerification.detectedProductId && (
                          <p className="text-2xs font-code text-ink-3">
                            Mã SP: {activeInspection.cartAnchorVerification.detectedProductId}
                          </p>
                        )}
                        {(activeInspection.cartAnchorVerification.detectedProductUrl ||
                          activeInspection.contentCheck.cartAnchorUrl) && (
                          <div className="flex items-center gap-2 pt-1">
                            <a
                              href={
                                activeInspection.cartAnchorVerification.detectedProductUrl ||
                                activeInspection.contentCheck.cartAnchorUrl
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-accent text-white text-2xs font-medium hover:opacity-90"
                            >
                              <span>Mở giỏ hàng</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-2xs font-semibold ${
                              activeInspection.cartAnchorVerification.diagnosticCode === 'CAPCUT_CONFLICT'
                                ? 'bg-warning-soft text-warning border border-warning/30'
                                : 'bg-surface-2 text-ink-2 border border-line'
                            }`}
                          >
                            {activeInspection.cartAnchorVerification.diagnosticCode === 'CAPCUT_CONFLICT'
                              ? 'Xung đột mẫu CapCut trên Web'
                              : 'Thẻ SP ẩn / Hết tồn kho'}
                          </span>
                          <span className="text-2xs text-ink-3">
                            Tín hiệu gốc: isECVideo = 1
                          </span>
                        </div>
                        <p className="text-2xs text-ink-2 leading-relaxed">
                          {activeInspection.cartAnchorVerification.diagnosticReason ||
                            'Xác nhận video có bật giỏ hàng khi đăng, nhưng TikTok không trả về chi tiết thẻ sản phẩm trên giao diện Web (thường do sản phẩm hết hàng hoặc bị CapCut đè).'}
                        </p>
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          <a
                            href={activeInspection.resolvedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 h-6 px-2 rounded bg-surface-2 border border-line text-2xs text-ink hover:text-accent font-medium"
                          >
                            <span>Mở video kiểm tra trên TikTok</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <span className="text-2xs text-ink-3">
                            Gợi ý: Dán mã SP của Brand vào ô tìm kiếm phía trên để đối soát
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg border border-dashed border-line bg-surface-2 text-2xs text-ink-3">
                    {activeInspection.cartAnchorVerification.diagnosticReason ||
                      'Video không gắn giỏ hàng TikTok Shop (isECVideo = 0).'}
                  </div>
                )}

                {activeInspection.contentCheck.onScreenStickers.length > 0 && (
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
                    {activeInspection.contentCheck.subtitleSegments.map((seg, idx) => {
                      const matchedMoment =
                        activeInspection.visualAndAudioCheck.productMentionMoments?.find(
                          (m) => m.timeLabel === seg.timeLabel && m.quote === seg.text
                        );
                      return (
                        <div
                          key={idx}
                          className={`px-3 py-1.5 flex items-start justify-between gap-2.5 text-xs ${
                            matchedMoment ? 'bg-positive-soft/25' : 'hover:bg-surface/60'
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span
                              className={`font-code text-2xs px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                                matchedMoment
                                  ? 'bg-positive text-white font-semibold'
                                  : 'text-accent bg-accent-soft/40'
                              }`}
                            >
                              {seg.timeLabel}
                            </span>
                            <span className="text-ink leading-relaxed">{seg.text}</span>
                          </div>
                          {matchedMoment && (
                            <span className="shrink-0 px-1.5 py-0.5 rounded bg-positive-soft text-positive text-2xs font-code font-medium">
                              SP: &ldquo;{matchedMoment.matchedTerm}&rdquo; ({matchedMoment.startSec}s)
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
          </div>
        )}
      </div>
      <VideoProductScreenshotModal
        open={screenshotModalOpen}
        onClose={() => setScreenshotModalOpen(false)}
        initialVideoUrl={
          activeInspection?.resolvedUrl ||
          rawUrlsInput.split(/\r?\n/)[0]?.trim() ||
          selectedDealObj?.tiktokVideoUrl ||
          ''
        }
        productName={
          activeInspection?.cartAnchorVerification.detectedProductTitle ||
          selectedDealObj?.brandName ||
          ''
        }
        brandName={selectedDealObj?.brandName || ''}
        dealId={selectedDealObj?.id}
        dealCode={selectedDealCode || activeInspection?.matchedDealCode || selectedDealObj?.dealCode}
        authorHandle={activeInspection?.authorHandle || expectedHandleInput || selectedDealObj?.kocChannelId}
        existingScreenshots={findSavedScreenshotsForContext({
          dealId: selectedDealObj?.id,
          dealCode: selectedDealCode || activeInspection?.matchedDealCode || selectedDealObj?.dealCode,
          authorHandle: activeInspection?.authorHandle || expectedHandleInput || selectedDealObj?.kocChannelId,
          videoUrl:
            activeInspection?.resolvedUrl ||
            rawUrlsInput.split(/\r?\n/)[0]?.trim() ||
            selectedDealObj?.tiktokVideoUrl,
        })}
        onApplyScreenshots={(items) => {
          setSavedScreenshotCount(items.length);
        }}
      />
    </Modal>
  );
};

