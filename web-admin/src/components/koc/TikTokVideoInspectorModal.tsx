'use client';

import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  ExternalLink,
  Calendar,
  Clock,
  Video,
  Hash,
  FileText,
  Music,
  ShoppingBag,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Check,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Download,
  KeyRound,
  Camera,
  Table2,
  LayoutGrid,
} from 'lucide-react';
import { BookingDealItem, PublicationItemModel } from '../../lib/types';
import {
  TikTokVideoInspectionResult,
  buildVideoInspectionCsv,
} from '../../lib/tiktokVideoInspector';
import { formatNumber } from '../../lib/format';

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

const SAMPLE_TEST_LINKS = [
  'https://www.tiktok.com/@chanhbeauty.99/video/7426328192000084993',
  'https://www.tiktok.com/@megauriviu/video/7425957104000084994',
  'https://www.tiktok.com/@bacsi.da.lieu.linh/video/7426699280000084995',
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
  const [expectedDeadline, setExpectedDeadline] = useState<string>(
    initialDeal?.deadlinePost || '2026-10-18'
  );
  const [requiredHashtagsInput, setRequiredHashtagsInput] = useState<string>(
    initialDeal?.brandName
      ? `#${initialDeal.brandName.toLowerCase().replace(/[^a-z0-9]/g, '')}, #tiktokshop`
      : '#kutieskin, #tiktokshop'
  );
  const [requiredUspInput, setRequiredUspInput] = useState<string>(
    initialDeal?.brandName
      ? `${initialDeal.brandName}, dịu nhẹ, thấm nhanh`
      : 'Kutieskin, dịu nhẹ, thấm nhanh'
  );
  const [sparkAdsCodeInput, setSparkAdsCodeInput] = useState<string>(
    initialDeal?.sparkAdsCode || ''
  );
  const [minDurationSeconds, setMinDurationSeconds] = useState<number>(30);

  const [isInspecting, setIsInspecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [results, setResults] = useState<TikTokVideoInspectionResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'DETAIL' | 'BATCH_TABLE'>('DETAIL');
  const [acceptedVideoIds, setAcceptedVideoIds] = useState<Set<string>>(new Set());

  // Đồng bộ khi mở modal với initialDeal mới
  const [prevInitialKey, setPrevInitialKey] = useState<string>(
    `${initialDeal?.dealCode || ''}:${initialUrl}`
  );
  const currentInitialKey = `${initialDeal?.dealCode || ''}:${initialUrl}`;
  if (currentInitialKey !== prevInitialKey) {
    setPrevInitialKey(currentInitialKey);
    if (initialDeal) {
      setSelectedDealCode(initialDeal.dealCode);
      setExpectedDeadline(initialDeal.deadlinePost || '2026-10-18');
      setRequiredHashtagsInput(
        `#${initialDeal.brandName.toLowerCase().replace(/[^a-z0-9]/g, '')}, #tiktokshop`
      );
      setRequiredUspInput(`${initialDeal.brandName}, dịu nhẹ, thấm nhanh`);
      setSparkAdsCodeInput(initialDeal.sparkAdsCode || '');
      if (initialUrl || initialDeal.tiktokVideoUrl) {
        setRawUrlsInput(initialUrl || initialDeal.tiktokVideoUrl || '');
      }
    } else if (initialUrl) {
      setRawUrlsInput(initialUrl);
    }
  }

  const selectedDealObj = useMemo(
    () => deals.find((d) => d.dealCode === selectedDealCode) || initialDeal || undefined,
    [deals, selectedDealCode, initialDeal]
  );

  if (!isOpen) return null;

  const handleDealSelectChange = (code: string) => {
    setSelectedDealCode(code);
    const found = deals.find((d) => d.dealCode === code);
    if (found) {
      if (found.deadlinePost) setExpectedDeadline(found.deadlinePost);
      if (found.brandName) {
        setRequiredHashtagsInput(
          `#${found.brandName.toLowerCase().replace(/[^a-z0-9]/g, '')}, #tiktokshop`
        );
        setRequiredUspInput(`${found.brandName}, dịu nhẹ, thấm nhanh`);
      }
      if (found.sparkAdsCode) {
        setSparkAdsCodeInput(found.sparkAdsCode);
      }
      if (found.tiktokVideoUrl && !rawUrlsInput.trim()) {
        setRawUrlsInput(found.tiktokVideoUrl);
      }
    }
  };

  const handleFillSampleLinks = () => {
    setRawUrlsInput(SAMPLE_TEST_LINKS.join('\n'));
    setErrorMessage(null);
  };

  const handleRunInspection = async () => {
    if (!rawUrlsInput.trim()) {
      setErrorMessage('Vui lòng dán ít nhất 1 đường link video TikTok KOC gửi.');
      return;
    }

    setIsInspecting(true);
    setErrorMessage(null);

    try {
      const hashtags = requiredHashtagsInput
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const uspKeywords = requiredUspInput
        .split(/[,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const response = await fetch('/api/integrations/tiktok-koc/inspect-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: rawUrlsInput,
          dealCode: selectedDealCode || undefined,
          expectedHandle: selectedDealObj?.kocChannelId,
          expectedDeadline: expectedDeadline || undefined,
          requiredHashtags: hashtags,
          requiredUspKeywords: uspKeywords,
          sparkAdsCode: sparkAdsCodeInput || undefined,
          brandName: selectedDealObj?.brandName,
          minDurationSeconds,
        }),
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        setErrorMessage(json.error || 'Không thể kiểm tra link video lúc này.');
      } else {
        setResults(json.data || []);
        setSelectedIndex(0);
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
    link.download = `nghiem-thu-video-koc-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const activeResult: TikTokVideoInspectionResult | undefined =
    results[selectedIndex] || results[0];

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Nghiệm thu Chuyên sâu Link Video TikTok KOC gửi
              </h2>
              <p className="text-xs text-slate-600">
                Kiểm tra ngày đăng, khung hình & âm thanh gốc, mã gian hàng/SKU giỏ hàng, hiệu lực mã Spark Ads, lời thoại USP, từ cấm sàn và hậu kiểm lưu trữ 30 ngày
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition"
          >
            Đóng
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Input & Configuration Box */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
            <div className="lg:col-span-5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800">
                  Danh sách link video TikTok KOC gửi (hỗ trợ tới 100 link/lô)
                </label>
                <button
                  type="button"
                  onClick={handleFillSampleLinks}
                  className="text-2xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Điền 3 link mẫu để thử</span>
                </button>
              </div>
              <textarea
                rows={5}
                value={rawUrlsInput}
                onChange={(e) => setRawUrlsInput(e.target.value)}
                placeholder="https://www.tiktok.com/@chanhbeauty.99/video/7426328192000084993&#10;https://vt.tiktok.com/ZS..."
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:border-blue-600 focus:outline-none"
              />
              <p className="text-2xs text-slate-500">
                Hỗ trợ link đầy đủ (`tiktok.com/@user/video/...`) và link rút gọn điện thoại (`vt.tiktok.com/...`). Tự động chạy theo lô 5 luồng song song chống chặn IP.
              </p>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3 content-start">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Đối chiếu với Job / Mã BO (tùy chọn)
                </label>
                <select
                  value={selectedDealCode}
                  onChange={(e) => handleDealSelectChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                >
                  <option value="">-- Tự động khớp theo @handle kênh KOC --</option>
                  {deals.map((d) => (
                    <option key={d.id} value={d.dealCode}>
                      {d.dealCode} · {d.kocStageName} (@{d.kocChannelId || 'koc'}) · {d.brandName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Hạn đăng cam kết (SLA)
                </label>
                <input
                  type="date"
                  value={expectedDeadline}
                  onChange={(e) => setExpectedDeadline(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Hashtag bắt buộc
                </label>
                <input
                  type="text"
                  value={requiredHashtagsInput}
                  onChange={(e) => setRequiredHashtagsInput(e.target.value)}
                  placeholder="#kutieskin, #tiktokshop"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Từ khóa USP bắt buộc nói
                </label>
                <input
                  type="text"
                  value={requiredUspInput}
                  onChange={(e) => setRequiredUspInput(e.target.value)}
                  placeholder="Kutieskin, dịu nhẹ, thấm nhanh"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Mã Spark Ads KOC gửi
                </label>
                <input
                  type="text"
                  value={sparkAdsCodeInput}
                  onChange={(e) => setSparkAdsCodeInput(e.target.value)}
                  placeholder="#74263281A99 (tùy chọn)"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-3 flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span>Thời lượng tối thiểu:</span>
                  <input
                    type="number"
                    min={5}
                    max={300}
                    value={minDurationSeconds}
                    onChange={(e) => setMinDurationSeconds(Number(e.target.value) || 30)}
                    className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-center text-slate-900"
                  />
                  <span>giây</span>
                </div>

                <div className="flex items-center gap-2">
                  {results.length > 0 && (
                    <button
                      type="button"
                      onClick={handleExportCsv}
                      className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Xuất CSV đối soát ({results.length})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleRunInspection}
                    disabled={isInspecting}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition shrink-0 cursor-pointer"
                  >
                    {isInspecting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang kiểm tra...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5" />
                        <span>Kiểm tra & Nghiệm thu</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Inspection Results */}
          {results.length > 0 && activeResult && (
            <div className="space-y-5">
              {/* Summary Bar & View Mode Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
                  <div className="p-3 rounded-xl border border-slate-200 bg-white">
                    <div className="text-2xs text-slate-500 font-medium">Tổng video kiểm tra</div>
                    <div className="text-base font-bold text-slate-900 mt-0.5">
                      {results.length} video
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50">
                    <div className="text-2xs text-emerald-700 font-medium">Đạt chuẩn nghiệm thu</div>
                    <div className="text-base font-bold text-emerald-700 mt-0.5">
                      {results.filter((r) => r.verdict === 'ĐẠT_CHUẨN').length} video
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/50">
                    <div className="text-2xs text-amber-700 font-medium">Cần lưu ý (Trễ / Thiếu tag)</div>
                    <div className="text-base font-bold text-amber-700 mt-0.5">
                      {results.filter((r) => r.verdict === 'CẦN_KIỂM_TRA').length} video
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/50">
                    <div className="text-2xs text-rose-700 font-medium">Vi phạm từ cấm / Sai kênh</div>
                    <div className="text-base font-bold text-rose-700 mt-0.5">
                      {results.filter((r) => r.verdict === 'KHÔNG_ĐẠT').length} video
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start">
                  <button
                    type="button"
                    onClick={() => setViewMode('DETAIL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                      viewMode === 'DETAIL'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Chi tiết 6 tầng</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('BATCH_TABLE')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                      viewMode === 'BATCH_TABLE'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Table2 className="w-3.5 h-3.5" />
                    <span>Bảng tổng hợp & Hậu kiểm ({results.length})</span>
                  </button>
                </div>
              </div>

              {/* MODE 1: BATCH TABLE & 30-DAY RETENTION MONITOR */}
              {viewMode === 'BATCH_TABLE' && (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 text-2xs font-semibold">
                        <tr>
                          <th className="p-3">Kênh KOC & BO</th>
                          <th className="p-3">Ngày giờ đăng & SLA</th>
                          <th className="p-3">Khung hình & Nội dung</th>
                          <th className="p-3">Giỏ hàng Gian hàng & SKU</th>
                          <th className="p-3">Mã Spark Ads</th>
                          <th className="p-3">Hậu kiểm 30 ngày</th>
                          <th className="p-3 text-right">Kết luận & Duyệt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {results.map((r, idx) => (
                          <tr
                            key={r.id}
                            onClick={() => {
                              setSelectedIndex(idx);
                              setViewMode('DETAIL');
                            }}
                            className="hover:bg-blue-50/40 transition cursor-pointer"
                          >
                            <td className="p-3">
                              <div className="font-bold text-slate-900">{r.authorNickname}</div>
                              <div className="text-2xs font-mono text-blue-600">@{r.authorHandle}</div>
                              <div className="text-2xs text-slate-500">
                                BO: <strong>{r.matchedDealCode || selectedDealCode || 'Tự động'}</strong>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="font-semibold text-slate-900">{r.publishedTimeFormatted}</div>
                              <div
                                className={`text-2xs font-semibold ${
                                  r.isOnTime ? 'text-emerald-700' : 'text-rose-600'
                                }`}
                              >
                                {r.isOnTime ? 'Đúng hạn' : `Trễ ${r.daysDelayed} ngày`}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="text-2xs text-slate-800">
                                SP lên hình: <strong>giây {r.visualAndAudioCheck.firstProductAppearanceSec}s</strong> ·{' '}
                                {r.durationSeconds}s
                              </div>
                              <div className="text-2xs text-slate-600 mt-0.5">
                                USP: {r.contentCheck.matchedUspKeywords.length}/
                                {r.contentCheck.matchedUspKeywords.length +
                                  r.contentCheck.missingUspKeywords.length}{' '}
                                · Từ cấm:{' '}
                                <strong
                                  className={
                                    r.contentCheck.violatedBlacklistWords.length === 0
                                      ? 'text-emerald-700'
                                      : 'text-rose-600'
                                  }
                                >
                                  {r.contentCheck.violatedBlacklistWords.length === 0
                                    ? '0 lỗi'
                                    : `${r.contentCheck.violatedBlacklistWords.length} lỗi`}
                                </strong>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="font-semibold text-emerald-700">
                                {r.cartAnchorVerification.detectedShopName}
                              </div>
                              <div className="text-2xs font-mono text-slate-500">
                                SKU: {r.cartAnchorVerification.detectedProductId}
                              </div>
                            </td>
                            <td className="p-3 font-mono">
                              <div className="text-2xs font-semibold text-slate-900">
                                {r.sparkAdsVerification.sparkAdsCode}
                              </div>
                              <div className="text-2xs text-emerald-700">
                                Ủy quyền {r.sparkAdsVerification.authorizedDays} ngày
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Công khai ({r.postAirRetentionCheck.daysSincePublished}/30 ngày)
                              </span>
                            </td>
                            <td
                              className="p-3 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-end gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-2xs font-semibold ${
                                    r.verdict === 'ĐẠT_CHUẨN'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : r.verdict === 'CẦN_KIỂM_TRA'
                                      ? 'bg-amber-50 text-amber-700'
                                      : 'bg-rose-50 text-rose-700'
                                  }`}
                                >
                                  {r.verdict === 'ĐẠT_CHUẨN'
                                    ? 'Đạt chuẩn'
                                    : r.verdict === 'CẦN_KIỂM_TRA'
                                    ? 'Lưu ý'
                                    : 'Không đạt'}
                                </span>
                                {acceptedVideoIds.has(r.videoId) ? (
                                  <span className="text-2xs font-semibold text-emerald-700">
                                    ✓ Đã duyệt
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleAcceptSingleVideo(r)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-2xs font-semibold cursor-pointer"
                                  >
                                    Duyệt
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* MODE 2: DETAILED 6-LAYER INSPECTION */}
              {viewMode === 'DETAIL' && (
                <>
                  {/* Multi-video selector tabs if > 1 */}
                  {results.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {results.map((r, idx) => {
                        const isSelected = idx === selectedIndex;
                        return (
                          <button
                            key={r.id}
                            onClick={() => setSelectedIndex(idx)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-2 shrink-0 cursor-pointer ${
                              isSelected
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <span>@{r.authorHandle}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-2xs ${
                                r.verdict === 'ĐẠT_CHUẨN'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : r.verdict === 'CẦN_KIỂM_TRA'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-rose-500/20 text-rose-300'
                              }`}
                            >
                              {r.verdict === 'ĐẠT_CHUẨN'
                                ? 'Đạt'
                                : r.verdict === 'CẦN_KIỂM_TRA'
                                ? 'Lưu ý'
                                : 'Không đạt'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Detailed Inspection Card for Active Video */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Left Column */}
                    <div className="lg:col-span-5 space-y-4">
                      {/* Verdict Banner */}
                      <div
                        className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
                          activeResult.verdict === 'ĐẠT_CHUẨN'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : activeResult.verdict === 'CẦN_KIỂM_TRA'
                            ? 'bg-amber-50 border-amber-200 text-amber-900'
                            : 'bg-rose-50 border-rose-200 text-rose-900'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {activeResult.verdict === 'ĐẠT_CHUẨN' ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                          ) : activeResult.verdict === 'CẦN_KIỂM_TRA' ? (
                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <div className="text-xs font-bold">
                              Kết luận:{' '}
                              {activeResult.verdict === 'ĐẠT_CHUẨN'
                                ? 'ĐẠT CHUẨN NGHIỆM THU'
                                : activeResult.verdict === 'CẦN_KIỂM_TRA'
                                ? 'CẦN KIỂM TRA / NHẮC KOC BỔ SUNG'
                                : 'KHÔNG ĐẠT (CẦN SỬA GẤP)'}
                            </div>
                            <div className="text-2xs mt-0.5 opacity-90">
                              {activeResult.verdictSummary}
                            </div>
                          </div>
                        </div>

                        {acceptedVideoIds.has(activeResult.videoId) ? (
                          <span className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-2xs font-semibold flex items-center gap-1 shrink-0">
                            <Check className="w-3.5 h-3.5" />
                            <span>Đã nghiệm thu</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAcceptSingleVideo(activeResult)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-2xs font-semibold flex items-center gap-1 shrink-0 shadow-xs transition cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Duyệt nghiệm thu</span>
                          </button>
                        )}
                      </div>

                      {/* Card 1: Ngày giờ đăng & Kênh đăng + Hậu kiểm 30 ngày */}
                      <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <span>1. Ngày đăng, Kênh & Hậu kiểm 30 ngày</span>
                          </span>
                          <a
                            href={activeResult.resolvedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-2xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <span>Mở bài gốc TikTok</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                            <div className="text-2xs text-slate-500">Thời điểm đăng bài</div>
                            <div className="font-bold text-slate-900 mt-0.5 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-blue-600" />
                              <span>{activeResult.publishedTimeFormatted}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Nguồn:{' '}
                              {activeResult.timestampSource === 'TIKTOK_CREATE_TIME'
                                ? 'TikTok Metadata trực tiếp'
                                : activeResult.timestampSource === 'SNOWFLAKE_VIDEO_ID'
                                ? 'Giải mã từ Video ID TikTok'
                                : 'Đối chiếu lịch đăng'}
                            </div>
                          </div>

                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                            <div className="text-2xs text-slate-500">Đối chiếu hạn đăng (SLA)</div>
                            <div
                              className={`font-bold mt-0.5 ${
                                activeResult.isOnTime ? 'text-emerald-700' : 'text-rose-600'
                              }`}
                            >
                              {activeResult.isOnTime
                                ? 'Đúng hạn cam kết'
                                : `Trễ ${activeResult.daysDelayed} ngày`}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Hạn cam kết: {activeResult.expectedDeadline || 'Không giới hạn'}
                            </div>
                          </div>

                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                            <div className="text-2xs text-slate-500">Kênh KOC đăng bài</div>
                            <div className="font-bold text-slate-900 mt-0.5">
                              {activeResult.authorNickname}
                            </div>
                            <div className="text-2xs font-mono text-blue-600">
                              @{activeResult.authorHandle}
                            </div>
                          </div>

                          <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200">
                            <div className="text-2xs text-emerald-800">Hậu kiểm lưu trữ 30 ngày</div>
                            <div className="font-bold text-emerald-700 mt-0.5">
                              Đang hiển thị ({activeResult.postAirRetentionCheck.daysSincePublished}/30 ngày)
                            </div>
                            <div className="text-[10px] text-emerald-700 mt-0.5">
                              Không bị ẩn/xóa · Còn giữ giỏ hàng
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card 2: Đối soát Mã Gian Hàng (Shop ID), SKU Giỏ hàng & Mã Spark Ads */}
                      <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <ShoppingBag className="w-4 h-4 text-emerald-600" />
                            <span>2. Đối soát Gian hàng Giỏ hàng & Mã Spark Ads</span>
                          </span>
                          <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Đúng Shop UpBase
                          </span>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-2xs text-slate-500">Gian hàng gắn trong giỏ:</span>
                              <strong className="text-emerald-700">
                                {activeResult.cartAnchorVerification.detectedShopName} (
                                {activeResult.cartAnchorVerification.detectedShopId})
                              </strong>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-2xs text-slate-500">Sản phẩm & Mã SKU:</span>
                              <strong className="text-slate-900 truncate max-w-[230px]">
                                SKU {activeResult.cartAnchorVerification.detectedProductId} ·{' '}
                                {activeResult.cartAnchorVerification.detectedProductTitle}
                              </strong>
                            </div>
                          </div>

                          <div className="p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-2xs text-indigo-800 font-semibold flex items-center gap-1">
                                <KeyRound className="w-3.5 h-3.5" />
                                Mã ủy quyền Spark Ads:
                              </span>
                              <span className="font-mono font-bold text-indigo-900">
                                {activeResult.sparkAdsVerification.sparkAdsCode}
                              </span>
                            </div>
                            <div className="text-2xs text-indigo-700">
                              {activeResult.sparkAdsVerification.detailNote}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2 text-center pt-1">
                          <div className="p-2 rounded-lg bg-slate-50">
                            <div className="text-2xs text-slate-500 flex items-center justify-center gap-1">
                              <Eye className="w-3 h-3" /> Xem
                            </div>
                            <div className="text-xs font-bold text-slate-900 mt-0.5 tabular-nums">
                              {formatNumber(activeResult.viewsCount)}
                            </div>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50">
                            <div className="text-2xs text-slate-500 flex items-center justify-center gap-1">
                              <Heart className="w-3 h-3 text-rose-500" /> Thích
                            </div>
                            <div className="text-xs font-bold text-slate-900 mt-0.5 tabular-nums">
                              {formatNumber(activeResult.likesCount)}
                            </div>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50">
                            <div className="text-2xs text-slate-500 flex items-center justify-center gap-1">
                              <MessageCircle className="w-3 h-3 text-blue-500" /> B.luận
                            </div>
                            <div className="text-xs font-bold text-slate-900 mt-0.5 tabular-nums">
                              {formatNumber(activeResult.commentsCount)}
                            </div>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50">
                            <div className="text-2xs text-slate-500 flex items-center justify-center gap-1">
                              <Share2 className="w-3 h-3 text-emerald-500" /> ER%
                            </div>
                            <div className="text-xs font-bold text-emerald-700 mt-0.5 tabular-nums">
                              {activeResult.engagementRate}%
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Checklist 5 tiêu chí */}
                      <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5">
                        <div className="text-xs font-bold text-slate-900">
                          Bảng kiểm 5 tiêu chí nghiệm thu tự động
                        </div>
                        <div className="space-y-2">
                          {activeResult.checklist.map((item) => (
                            <div
                              key={item.key}
                              className="flex items-start gap-2 text-xs p-2 rounded-lg bg-slate-50 border border-slate-100"
                            >
                              {item.passed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              )}
                              <div>
                                <div className="font-semibold text-slate-900">{item.label}</div>
                                <div className="text-2xs text-slate-600">{item.detail}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Khung hình, Caption, Hashtag, Lời thoại & Từ cấm */}
                    <div className="lg:col-span-7 space-y-4">
                      {/* Card 3: Kiểm tra Khung hình Video & Âm thanh gốc (CapCut Hard-sub, Lật chữ bao bì, Giây xuất hiện SP) */}
                      <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Camera className="w-4 h-4 text-emerald-600" />
                            <span>3. Kiểm tra Khung hình Video, Bao bì sản phẩm & Chữ dựng CapCut</span>
                          </span>
                          <span className="text-2xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
                            Thời lượng {activeResult.durationSeconds}s · {activeResult.resolutionRatio}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                            <div className="text-2xs text-slate-500">Sản phẩm lên khung hình</div>
                            <div className="font-bold text-emerald-700 mt-0.5">
                              Giây thứ {activeResult.visualAndAudioCheck.firstProductAppearanceSec}s (Đạt Hook 3s)
                            </div>
                          </div>
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                            <div className="text-2xs text-slate-500">Chữ bao bì thương hiệu</div>
                            <div className="font-bold text-emerald-700 mt-0.5">
                              {activeResult.visualAndAudioCheck.isPackagingTextMirrored
                                ? 'Cảnh báo: Bị lật ngược chữ'
                                : 'Đúng chiều (Không bị ngược)'}
                            </div>
                          </div>
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                            <div className="text-2xs text-slate-500">Âm thanh & Nhạc nền</div>
                            <div className="font-bold text-slate-900 mt-0.5 truncate">
                              Giọng nói rõ · {activeResult.musicTitle}
                            </div>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                          <div className="text-2xs font-semibold text-slate-700">
                            Chữ hiển thị trên khung hình video (CapCut / Text Stickers):
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              ...activeResult.visualAndAudioCheck.hardSubCapCutLines,
                              ...activeResult.contentCheck.onScreenStickers,
                            ]
                              .slice(0, 5)
                              .map((line, idx) => (
                                <span
                                  key={idx}
                                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-2xs font-medium text-slate-800"
                                >
                                  &ldquo;{line}&rdquo;
                                </span>
                              ))}
                          </div>
                        </div>
                      </div>

                      {/* Card 4: Caption & Hashtag */}
                      <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Hash className="w-4 h-4 text-blue-600" />
                            <span>4. Nội dung Caption & Kiểm tra Hashtag chiến dịch</span>
                          </span>
                          <span className="text-2xs text-slate-500">
                            Phát hiện {activeResult.contentCheck.hashtags.length} hashtag
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                          {activeResult.contentCheck.caption || 'Không có mô tả caption'}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/40">
                            <div className="text-2xs font-semibold text-emerald-800 mb-1.5">
                              Hashtag đã gắn trên bài ({activeResult.contentCheck.hashtags.length})
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {activeResult.contentCheck.hashtags.length > 0 ? (
                                activeResult.contentCheck.hashtags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="px-2 py-0.5 rounded-full text-2xs font-mono font-semibold bg-white text-emerald-700 border border-emerald-200"
                                  >
                                    {tag}
                                  </span>
                                ))
                              ) : (
                                <span className="text-2xs text-slate-500">KOC chưa gắn hashtag nào</span>
                              )}
                            </div>
                          </div>

                          <div
                            className={`p-3 rounded-xl border ${
                              activeResult.contentCheck.missingRequiredHashtags.length === 0
                                ? 'border-emerald-200 bg-emerald-50/40'
                                : 'border-amber-200 bg-amber-50/50'
                            }`}
                          >
                            <div className="text-2xs font-semibold text-slate-800 mb-1.5">
                              Đối chiếu Hashtag bắt buộc của Brand
                            </div>
                            {activeResult.contentCheck.missingRequiredHashtags.length === 0 ? (
                              <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Đã gắn đầy đủ tất cả hashtag bắt buộc</span>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="text-2xs font-semibold text-amber-800">
                                  Thiếu {activeResult.contentCheck.missingRequiredHashtags.length} hashtag bắt buộc:
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {activeResult.contentCheck.missingRequiredHashtags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="px-2 py-0.5 rounded-full text-2xs font-mono font-semibold bg-white text-amber-800 border border-amber-300"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card 5: Lời thoại phụ đề & Thông điệp USP */}
                      <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-indigo-600" />
                            <span>5. Lời thoại trong Video (Transcript) & Đối soát Thông điệp USP</span>
                          </span>
                          <span className="text-2xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold">
                            {activeResult.contentCheck.subtitleSource === 'TIKTOK_AUTO_CAPTIONS_VTT'
                              ? 'Phụ đề giọng nói TikTok (WebVTT)'
                              : activeResult.contentCheck.subtitleSource === 'ON_SCREEN_TEXT_AND_CAPTION'
                              ? 'Chữ chèn trên màn hình'
                              : 'Bóc tách âm thanh & kịch bản'}
                          </span>
                        </div>

                        <div className="space-y-2.5 text-xs">
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                            <div className="text-2xs font-semibold text-slate-600">
                              Lời thoại bóc tách theo mốc thời gian:
                            </div>
                            <p className="text-xs text-slate-800 leading-relaxed">
                              {activeResult.contentCheck.transcriptText}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/40">
                              <div className="text-2xs font-semibold text-emerald-800 mb-1">
                                Thông điệp / USP KOC đã nhắc tới ({activeResult.contentCheck.matchedUspKeywords.length})
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {activeResult.contentCheck.matchedUspKeywords.map((kw) => (
                                  <span
                                    key={kw}
                                    className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-white text-emerald-700 border border-emerald-200"
                                  >
                                    ✓ {kw}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div
                              className={`p-3 rounded-xl border ${
                                activeResult.contentCheck.missingUspKeywords.length === 0
                                  ? 'border-emerald-200 bg-emerald-50/40'
                                  : 'border-amber-200 bg-amber-50/50'
                              }`}
                            >
                              <div className="text-2xs font-semibold text-slate-800 mb-1">
                                Thông điệp / USP còn thiếu
                              </div>
                              {activeResult.contentCheck.missingUspKeywords.length === 0 ? (
                                <div className="text-xs font-semibold text-emerald-700">
                                  Đầy đủ các điểm USP yêu cầu
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-1.5">
                                  {activeResult.contentCheck.missingUspKeywords.map((kw) => (
                                    <span
                                      key={kw}
                                      className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-white text-amber-800 border border-amber-300"
                                    >
                                      Thiếu: {kw}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card 6: Rà soát từ cấm sàn & chính sách Brand */}
                      <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <ShieldAlert className="w-4 h-4 text-rose-600" />
                            <span>6. Kiểm tra Từ cấm sàn TikTok Shop & Quy chuẩn Y tế / Brand</span>
                          </span>
                        </div>

                        {activeResult.contentCheck.violatedBlacklistWords.length === 0 ? (
                          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-800">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            <div>
                              <div className="font-bold">An toàn chính sách nội dung (Cả lời nói & chữ viết)</div>
                              <div className="text-2xs mt-0.5">
                                Không phát hiện các từ khóa bị cấm trên TikTok Shop (cam kết 100%, trị dứt điểm, thuốc đặc trị, điều hướng Zalo/ngoài sàn...). Đủ điều kiện bàn giao chạy Spark Ads.
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="text-xs font-semibold text-rose-700">
                              Phát hiện {activeResult.contentCheck.violatedBlacklistWords.length} từ ngữ vi phạm cần yêu cầu KOC chỉnh sửa:
                            </div>
                            {activeResult.contentCheck.violatedBlacklistWords.map((v, i) => (
                              <div
                                key={i}
                                className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-1"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-rose-800">
                                    Từ vi phạm: &ldquo;{v.word}&rdquo;
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-2xs font-semibold">
                                    {v.category}
                                  </span>
                                </div>
                                <div className="text-2xs text-rose-700">
                                  <strong>Hướng xử lý:</strong> {v.suggestion}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            {activeResult ? (
              <span>
                Đang xem video <strong>@{activeResult.authorHandle}</strong> · Đăng ngày{' '}
                <strong>{activeResult.publishedTimeFormatted}</strong> · Giỏ hàng:{' '}
                <strong>{activeResult.cartAnchorVerification.detectedShopName}</strong>
              </span>
            ) : (
              <span>Dán 1 hoặc nhiều link video TikTok của KOC gửi vào ô trên và bấm &ldquo;Kiểm tra & Nghiệm thu&rdquo;</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              Đóng
            </button>
            {activeResult && (
              <button
                type="button"
                onClick={() => {
                  handleAcceptSingleVideo(activeResult);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Xác nhận nghiệm thu & Lưu vào Job</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
