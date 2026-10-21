'use client';

import React, { useEffect, useState } from 'react';
import { Check, Code2, Copy, Plus, Send, Video } from 'lucide-react';
import type { KocItem } from '../../lib/types';
import {
  STANDARD_WEEK_OPTIONS,
  extractSystemVideoId,
  normalizeChannelHandle,
  type KocWeeklyAggregatedHistory,
  type SystemRegisteredVideo,
  type VideoWeeklySnapshotItem,
} from '../../lib/kocVideoWeeklyHistory';
import {
  Button,
  Field,
  Input,
  Modal,
  Select,
  Status,
  Tabs,
  Textarea,
} from '../ui';

export type RegistryModalTab = 'NEW_VIDEO' | 'NEW_KOC' | 'API_DOCS';

interface KocVideoHistoryRegistryModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: RegistryModalTab;
  prefillKoc?: Pick<KocItem, 'id' | 'channelId' | 'stageName' | 'brandName' | 'rateCardVideo'> | null;
  onSuccess?: (result: {
    registeredVideo?: SystemRegisteredVideo;
    newKoc?: KocItem;
    videoSnapshots?: VideoWeeklySnapshotItem[];
    kocSummaries?: KocWeeklyAggregatedHistory[];
    message: string;
  }) => void;
}

export const KocVideoHistoryRegistryModal: React.FC<KocVideoHistoryRegistryModalProps> = ({
  open,
  onClose,
  initialTab = 'NEW_VIDEO',
  prefillKoc = null,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<RegistryModalTab>(initialTab);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form Tab 1: Đăng ký Video mới theo videoId hệ thống
  const [videoInputRaw, setVideoInputRaw] = useState('');
  const [dealCode, setDealCode] = useState('');
  const [kocChannelId, setKocChannelId] = useState('');
  const [kocStageName, setKocStageName] = useState('');
  const [brandName, setBrandName] = useState('Cathy Doll');
  const [storeName, setStoreName] = useState('Cathy Doll_TikTok_E2E-C');
  const [productName, setProductName] = useState('Gel kẻ mắt Cathy Doll');
  const [bookingCostNet, setBookingCostNet] = useState('1500000');
  const [sparkAdsCode, setSparkAdsCode] = useState('');
  const [weekKey, setWeekKey] = useState('2026-W42');
  const [initialAdsSpend, setInitialAdsSpend] = useState('');
  const [initialGmv, setInitialGmv] = useState('');
  const [initialOrders, setInitialOrders] = useState('');
  const [initialViews, setInitialViews] = useState('');

  // Form Tab 2: Phát sinh KOC mới
  const [newKocHandle, setNewKocHandle] = useState('');
  const [newKocStage, setNewKocStage] = useState('');
  const [newKocFollowers, setNewKocFollowers] = useState('45000');
  const [newKocAvgViews, setNewKocAvgViews] = useState('18000');
  const [newKocRateNet, setNewKocRateNet] = useState('2000000');
  const [newKocPhone, setNewKocPhone] = useState('');
  const [newKocFirstVideo, setNewKocFirstVideo] = useState('');

  // Form Tab 3: Gửi thử API JSON
  const [apiMode, setApiMode] = useState<'INGEST_WEEKLY_DATA' | 'REGISTER_NEW_VIDEO' | 'REGISTER_NEW_KOC'>('INGEST_WEEKLY_DATA');
  const [apiPayloadText, setApiPayloadText] = useState('');
  const [apiResponseText, setApiResponseText] = useState('');

  useEffect(() => {
    if (!open) return;
    setActiveTab(initialTab);
    setErrorMsg('');
    if (prefillKoc) {
      const cleanH = normalizeChannelHandle(prefillKoc.channelId);
      setKocChannelId(cleanH);
      setKocStageName(prefillKoc.stageName || cleanH);
      if (prefillKoc.brandName) {
        setBrandName(prefillKoc.brandName);
        setStoreName(`${prefillKoc.brandName}_TikTok_E2E-C`);
      }
      if (prefillKoc.rateCardVideo !== undefined) {
        setBookingCostNet(String(prefillKoc.rateCardVideo));
      }
    }
  }, [open, initialTab, prefillKoc]);

  useEffect(() => {
    if (apiMode === 'INGEST_WEEKLY_DATA') {
      setApiPayloadText(
        JSON.stringify(
          {
            action: 'INGEST_WEEKLY_DATA',
            weekKey: '2026-W42',
            fileName: 'API_Weekly_Ads_W42.json',
            rows: [
              {
                videoId: '7675354051319581970',
                adsSpend: 2350000,
                gmv: 12850000,
                orders: 142,
                views: 58400,
                impressions: 51200,
                clicks: 1890,
                ctr: 3.69,
                cvr: 4.95,
                hookRate2s: 29.4,
                completionRate100: 1.2,
                authorizationType: 'Video code',
                explorationStatus: 'Performing',
              },
            ],
          },
          null,
          2
        )
      );
    } else if (apiMode === 'REGISTER_NEW_VIDEO') {
      setApiPayloadText(
        JSON.stringify(
          {
            action: 'REGISTER_NEW_VIDEO',
            videoId: '7695128901234567890',
            linkAir: 'https://www.tiktok.com/@soanhtran98/video/7695128901234567890',
            dealCode: 'BO261068901',
            kocChannelId: 'soanhtran98',
            kocStageName: 'Sơ Anh Trần',
            brandName: 'Mine',
            storeName: 'Mine_TikTok_E2E-C',
            productName: 'Tinh chất phục hồi Mine',
            bookingCostNet: 5000000,
            weekKey: '2026-W42',
            initialAdsSpend: 1200000,
            initialGmv: 6800000,
            initialOrders: 45,
            initialViews: 32000,
          },
          null,
          2
        )
      );
    } else {
      setApiPayloadText(
        JSON.stringify(
          {
            action: 'REGISTER_NEW_KOC',
            channelId: 'linhbeauty.official',
            stageName: 'Linh Beauty Review',
            followers: 68000,
            avgViews: 24000,
            rateCardVideo: 2500000,
            tepKenh: 'Beauty',
            kocCategory: 'Personal care',
            brandName: 'ClubClio',
            storeName: 'ClubClio_TikTok_E2E-C',
            videoId: '7695889900112233445',
            dealCode: 'BO261069102',
          },
          null,
          2
        )
      );
    }
  }, [apiMode]);

  const handleVideoInputBlur = () => {
    const raw = videoInputRaw.trim();
    const handleMatch = raw.match(/tiktok\.com\/@([^/?#]+)/i);
    if (handleMatch && !kocChannelId) {
      const h = normalizeChannelHandle(handleMatch[1]);
      setKocChannelId(h);
      if (!kocStageName) setKocStageName(h);
    }
  };

  const extractedPreviewVideoId = extractSystemVideoId(videoInputRaw);

  const handleRegisterVideo = async () => {
    setErrorMsg('');
    if (!extractedPreviewVideoId) {
      setErrorMsg('Vui lòng nhập Mã Video ID hoặc dán Link video TikTok hợp lệ.');
      return;
    }
    if (!kocChannelId.trim()) {
      setErrorMsg('Vui lòng nhập ID kênh TikTok của KOC sở hữu video.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/koc-video-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REGISTER_NEW_VIDEO',
          videoId: extractedPreviewVideoId,
          linkAir: videoInputRaw.includes('http') ? videoInputRaw.trim() : undefined,
          dealCode: dealCode.trim() || undefined,
          kocChannelId: kocChannelId.trim(),
          kocStageName: kocStageName.trim() || kocChannelId.trim(),
          brandName,
          storeName,
          productName,
          bookingCostNet: Number(bookingCostNet) || 0,
          sparkAdsCode: sparkAdsCode.trim() || undefined,
          weekKey,
          initialAdsSpend: Number(initialAdsSpend) || 0,
          initialGmv: Number(initialGmv) || 0,
          initialOrders: Number(initialOrders) || 0,
          initialViews: Number(initialViews) || 0,
          source: 'MANUAL_REGISTERED',
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.error || 'Không thể đăng ký Video mới.');
        return;
      }
      onSuccess?.({
        registeredVideo: data.registeredVideo,
        kocSummaries: data.kocSummaries,
        message: `Đã đăng ký Video ID ${extractedPreviewVideoId} (@${normalizeChannelHandle(kocChannelId)}) vào hệ thống.`,
      });
      onClose();
    } catch {
      setErrorMsg('Lỗi kết nối máy chủ khi đăng ký Video.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterKoc = async () => {
    setErrorMsg('');
    const cleanH = normalizeChannelHandle(newKocHandle);
    if (!cleanH) {
      setErrorMsg('Vui lòng nhập ID kênh TikTok của KOC mới.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/koc-video-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REGISTER_NEW_KOC',
          channelId: cleanH,
          stageName: newKocStage.trim() || cleanH,
          followers: Number(newKocFollowers) || 0,
          avgViews: Number(newKocAvgViews) || 0,
          rateCardVideo: Number(newKocRateNet) || 0,
          phone: newKocPhone.trim() || undefined,
          brandName,
          storeName,
          videoId: extractSystemVideoId(newKocFirstVideo) || undefined,
          linkAir: newKocFirstVideo.includes('http') ? newKocFirstVideo.trim() : undefined,
          weekKey,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.error || 'Không thể đăng ký KOC mới.');
        return;
      }
      onSuccess?.({
        newKoc: data.koc,
        registeredVideo: data.registeredVideo,
        kocSummaries: data.kocSummaries,
        message: `Đã thêm KOC @${cleanH}${data.registeredVideo ? ` kèm Video ID ${data.registeredVideo.videoId}` : ''} vào hệ thống.`,
      });
      onClose();
    } catch {
      setErrorMsg('Lỗi kết nối máy chủ khi thêm KOC mới.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestApiCall = async () => {
    setErrorMsg('');
    setApiResponseText('');
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(apiPayloadText);
    } catch {
      setErrorMsg('Nội dung JSON không hợp lệ.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/koc-video-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      setApiResponseText(JSON.stringify(data, null, 2));
      if (data.success) {
        onSuccess?.({
          registeredVideo: data.registeredVideo,
          newKoc: data.koc,
          videoSnapshots: data.videoSnapshots,
          kocSummaries: data.kocSummaries,
          message: `Đã thực thi API ${String(parsed.action || 'INGEST_WEEKLY_DATA')} thành công.`,
        });
      } else {
        setErrorMsg(data.error || 'API trả về lỗi.');
      }
    } catch {
      setErrorMsg('Không gọi được endpoint /api/koc-video-history.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Đăng ký Video ID, KOC mới & Cổng API Lịch sử Tuần"
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full gap-2">
          <div className="text-xs text-ink-3">
            {extractedPreviewVideoId && activeTab === 'NEW_VIDEO' ? (
              <span>
                Mã Video hệ thống nhận diện: <strong className="font-mono text-ink">{extractedPreviewVideoId}</strong>
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Đóng
            </Button>
            {activeTab === 'NEW_VIDEO' && (
              <Button variant="primary" icon={Plus} disabled={submitting} onClick={handleRegisterVideo}>
                {submitting ? 'Đang lưu...' : 'Lưu Video ID'}
              </Button>
            )}
            {activeTab === 'NEW_KOC' && (
              <Button variant="primary" icon={Plus} disabled={submitting} onClick={handleRegisterKoc}>
                {submitting ? 'Đang lưu...' : 'Lưu KOC mới'}
              </Button>
            )}
            {activeTab === 'API_DOCS' && (
              <Button variant="primary" icon={Send} disabled={submitting} onClick={handleTestApiCall}>
                {submitting ? 'Đang gửi...' : 'Gửi thử API'}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'NEW_VIDEO', label: 'Đăng ký Video mới (Theo Video ID)' },
            { key: 'NEW_KOC', label: 'Phát sinh KOC mới' },
            { key: 'API_DOCS', label: 'Cổng API tích hợp' },
          ]}
        />

        {errorMsg && (
          <div className="p-3 rounded-lg bg-critical-soft text-critical text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {activeTab === 'NEW_VIDEO' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <Field label="Link video TikTok hoặc Mã Video ID hệ thống">
                <Input
                  value={videoInputRaw}
                  onChange={(e) => setVideoInputRaw(e.target.value)}
                  onBlur={handleVideoInputBlur}
                  placeholder="VD: https://www.tiktok.com/@soanhtran98/video/7693883284572458260 hoặc 7693883284572458260"
                />
              </Field>
            </div>

            <Field label="ID kênh TikTok KOC (@handle)">
              <Input
                value={kocChannelId}
                onChange={(e) => setKocChannelId(e.target.value)}
                placeholder="VD: soanhtran98"
              />
            </Field>

            <Field label="Tên hiển thị KOC">
              <Input
                value={kocStageName}
                onChange={(e) => setKocStageName(e.target.value)}
                placeholder="VD: Sơ Anh Trần"
              />
            </Field>

            <Field label="Mã đơn Booking (BO)">
              <Input
                value={dealCode}
                onChange={(e) => setDealCode(e.target.value)}
                placeholder="VD: BO261066832"
              />
            </Field>

            <Field label="Kỳ tuần ghi nhận">
              <Select value={weekKey} onChange={(e) => setWeekKey(e.target.value)}>
                {STANDARD_WEEK_OPTIONS.map((w) => (
                  <option key={w.weekKey} value={w.weekKey}>
                    {w.weekLabel}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Thương hiệu (Brand)">
              <Input
                value={brandName}
                onChange={(e) => {
                  setBrandName(e.target.value);
                  setStoreName(`${e.target.value}_TikTok_E2E-C`);
                }}
              />
            </Field>

            <Field label="Gian hàng B2C (Store)">
              <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} />
            </Field>

            <Field label="Sản phẩm gắn giỏ">
              <Input value={productName} onChange={(e) => setProductName(e.target.value)} />
            </Field>

            <Field label="Chi phí Cát-xê Net (VNĐ)" noWrap>
              <Input
                type="number"
                value={bookingCostNet}
                onChange={(e) => setBookingCostNet(e.target.value)}
              />
            </Field>

            <div className="sm:col-span-2 pt-2 border-t border-line grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="Chi phí Ads tuần đầu (VNĐ)" noWrap>
                <Input
                  type="number"
                  value={initialAdsSpend}
                  onChange={(e) => setInitialAdsSpend(e.target.value)}
                  placeholder="0"
                />
              </Field>
              <Field label="Doanh thu GMV tuần (VNĐ)" noWrap>
                <Input
                  type="number"
                  value={initialGmv}
                  onChange={(e) => setInitialGmv(e.target.value)}
                  placeholder="0"
                />
              </Field>
              <Field label="Số đơn hàng" noWrap>
                <Input
                  type="number"
                  value={initialOrders}
                  onChange={(e) => setInitialOrders(e.target.value)}
                  placeholder="0"
                />
              </Field>
              <Field label="Lượt xem (Views)" noWrap>
                <Input
                  type="number"
                  value={initialViews}
                  onChange={(e) => setInitialViews(e.target.value)}
                  placeholder="0"
                />
              </Field>
            </div>
          </div>
        )}

        {activeTab === 'NEW_KOC' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Field label="ID kênh TikTok (@handle)">
              <Input
                value={newKocHandle}
                onChange={(e) => setNewKocHandle(e.target.value)}
                placeholder="VD: linhbeauty.official"
              />
            </Field>

            <Field label="Tên hiển thị KOC">
              <Input
                value={newKocStage}
                onChange={(e) => setNewKocStage(e.target.value)}
                placeholder="VD: Linh Beauty Review"
              />
            </Field>

            <Field label="Lượng người theo dõi (Follower)">
              <Input
                type="number"
                value={newKocFollowers}
                onChange={(e) => setNewKocFollowers(e.target.value)}
              />
            </Field>

            <Field label="Lượt xem trung bình">
              <Input
                type="number"
                value={newKocAvgViews}
                onChange={(e) => setNewKocAvgViews(e.target.value)}
              />
            </Field>

            <Field label="Đơn giá Video Net (VNĐ)">
              <Input
                type="number"
                value={newKocRateNet}
                onChange={(e) => setNewKocRateNet(e.target.value)}
              />
            </Field>

            <Field label="Số điện thoại / Zalo">
              <Input
                value={newKocPhone}
                onChange={(e) => setNewKocPhone(e.target.value)}
                placeholder="VD: 0987654321"
              />
            </Field>

            <Field label="Thương hiệu phụ trách">
              <Input
                value={brandName}
                onChange={(e) => {
                  setBrandName(e.target.value);
                  setStoreName(`${e.target.value}_TikTok_E2E-C`);
                }}
              />
            </Field>

            <Field label="Gian hàng B2C">
              <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Link video hoặc Mã Video ID đầu tiên (Tùy chọn)">
                <Input
                  value={newKocFirstVideo}
                  onChange={(e) => setNewKocFirstVideo(e.target.value)}
                  placeholder="Dán link video TikTok hoặc mã videoId nếu KOC đã có bài đăng đầu tiên"
                />
              </Field>
            </div>
          </div>
        )}

        {activeTab === 'API_DOCS' && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-sunken border border-line flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-accent" />
                <span className="font-mono font-semibold text-ink">POST /api/koc-video-history</span>
                <Status tone="info">JSON REST API</Status>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant={apiMode === 'INGEST_WEEKLY_DATA' ? 'primary' : 'secondary'}
                  onClick={() => setApiMode('INGEST_WEEKLY_DATA')}
                >
                  1. Nạp số liệu tuần theo Video ID
                </Button>
                <Button
                  size="sm"
                  variant={apiMode === 'REGISTER_NEW_VIDEO' ? 'primary' : 'secondary'}
                  onClick={() => setApiMode('REGISTER_NEW_VIDEO')}
                >
                  2. Phát sinh Video mới
                </Button>
                <Button
                  size="sm"
                  variant={apiMode === 'REGISTER_NEW_KOC' ? 'primary' : 'secondary'}
                  onClick={() => setApiMode('REGISTER_NEW_KOC')}
                >
                  3. Phát sinh KOC mới
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink">Payload JSON gửi lên Endpoint</span>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={copiedKey === 'payload' ? Check : Copy}
                  onClick={() => handleCopy('payload', apiPayloadText)}
                >
                  {copiedKey === 'payload' ? 'Đã chép' : 'Sao chép JSON'}
                </Button>
              </div>
              <Textarea
                rows={10}
                value={apiPayloadText}
                onChange={(e) => setApiPayloadText(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            {apiResponseText && (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-positive">Kết quả phản hồi từ máy chủ</span>
                <pre className="p-3 rounded-lg bg-sunken border border-line font-mono text-2xs text-ink overflow-x-auto max-h-44">
                  {apiResponseText}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
