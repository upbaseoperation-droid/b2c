'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  ExternalLink,
  Check,
  RefreshCw,
  Download,
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
  Field,
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

const SAMPLE_VIDEO_URLS = [
  'https://www.tiktok.com/@dhnlie/video/7638191108970843412',
  'https://www.tiktok.com/@keyshulive/video/7542352999495060743',
  'https://www.tiktok.com/@happipham/video/7638845114655214855',
];

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
  const [acceptedVideoIds, setAcceptedVideoIds] = useState<Set<string>>(new Set());

  const currentInitialKey = `${isOpen}:${initialDeal?.dealCode || ''}:${initialUrl}`;
  const [prevInitialKey, setPrevInitialKey] = useState<string>(currentInitialKey);
  if (currentInitialKey !== prevInitialKey) {
    setPrevInitialKey(currentInitialKey);
    if (isOpen) {
      setResults([]);
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
        setResults(json.data || []);
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
      width: 170,
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
      header: 'Nội dung & Hashtag trên bài',
      width: 300,
      render: (r) => (
        <div className="grid gap-1 min-w-0 max-w-[340px]">
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
      width: 165,
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
      width: 190,
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
      header: 'Trạng thái',
      align: 'right',
      width: 150,
      render: (r) => {
        const hasViolation = r.contentCheck.violatedBlacklistWords.length > 0;
        return (
          <div className="flex items-center justify-end gap-2">
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

        <div className="grid lg:grid-cols-[minmax(0,1fr)_auto] gap-3 items-start">
          <Field
            label="Link video TikTok"
            htmlFor="tiktok-video-inspector-input"
            error={errorMessage || undefined}
          >
            <Textarea
              id="tiktok-video-inspector-input"
              rows={3}
              value={rawUrlsInput}
              onChange={(e) => {
                setRawUrlsInput(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Ví dụ: https://www.tiktok.com/@dhnlie/video/7638191108970843412"
            />
          </Field>

          <div className="flex flex-col gap-2 lg:pt-6">
            <Button
              variant="primary"
              icon={isInspecting ? RefreshCw : Search}
              disabled={isInspecting}
              onClick={handleRunInspection}
            >
              {isInspecting ? 'Đang kiểm tra...' : 'Kiểm tra video'}
            </Button>
            <button
              type="button"
              onClick={() => {
                setRawUrlsInput(SAMPLE_VIDEO_URLS.join('\n'));
                if (errorMessage) setErrorMessage(null);
              }}
              className="text-2xs text-accent hover:underline text-right font-medium"
            >
              Điền 3 link mẫu
            </button>
          </div>
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
      </div>
    </Modal>
  );
};
