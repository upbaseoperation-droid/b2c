'use client';

import React, { useState, useEffect } from 'react';
import { Presence } from '../ui';
import {
  X,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ShoppingBag,
  Video,
  Users,
  DollarSign,
  Layers,
  ShieldCheck,
  Check,
} from 'lucide-react';
import {
  KalodataCreatorDetail,
  KalodataPeriod,
  KalodataConnectionStatus,
} from '@/lib/kalodata/types';
import { KocItem } from '@/lib/types';
import { formatVnd, formatVndShort, formatNumber } from '@/lib/format';

interface KalodataSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetKoc?: KocItem | null;
  onApplyUpdates?: (kocId: string, updates: Partial<KocItem>) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const KalodataSyncModal: React.FC<KalodataSyncModalProps> = ({
  isOpen,
  onClose,
  targetKoc,
  onApplyUpdates,
  onNotify,
}) => {
  const initialHandleFromProp = targetKoc?.channelId ? targetKoc.channelId.replace('@', '') : '';
  const [handle, setHandle] = useState(initialHandleFromProp);
  const [period, setPeriod] = useState<KalodataPeriod>('30d');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<KalodataConnectionStatus | null>(null);
  const [result, setResult] = useState<KalodataCreatorDetail | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  // Đồng bộ state khi mở/đóng modal hoặc đổi targetKoc
  const syncKey = `${isOpen}-${targetKoc?.id || ''}`;
  const [prevSyncKey, setPrevSyncKey] = useState(syncKey);
  if (prevSyncKey !== syncKey) {
    setPrevSyncKey(syncKey);
    if (isOpen) {
      setHandle(initialHandleFromProp);
      setErrorMsg(null);
      setLoading(Boolean(initialHandleFromProp));
    } else {
      setResult(null);
      setErrorMsg(null);
      setLoading(false);
    }
  }

  const handleFetchData = async (targetHandle?: string, targetPeriod?: KalodataPeriod) => {
    const queryHandle = (targetHandle || handle).trim().replace('@', '');
    const queryPeriod = targetPeriod || period;

    if (!queryHandle) {
      setErrorMsg('Vui lòng nhập ID kênh TikTok (username) để tra cứu.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(
        `/api/integrations/kalodata/creator?handle=${encodeURIComponent(queryHandle)}&period=${queryPeriod}`
      );
      const json = await res.json();

      if (json.success && json.data) {
        setResult(json.data);
      } else {
        setErrorMsg(json.message || 'Không tìm thấy dữ liệu cho kênh này.');
      }
    } catch {
      setErrorMsg('Lỗi kết nối khi gửi yêu cầu tra cứu Kalodata.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    const queryHandle = targetKoc?.channelId ? targetKoc.channelId.replace('@', '') : '';

    fetch('/api/integrations/kalodata/status')
      .then((res) => res.json())
      .then((json) => {
        if (active && json.success) {
          setStatus(json.data);
        }
      })
      .catch(() => {
        // Bỏ qua lỗi kết nối ngầm
      });

    if (queryHandle) {
      fetch(
        `/api/integrations/kalodata/creator?handle=${encodeURIComponent(queryHandle)}&period=${period}`
      )
        .then((res) => res.json())
        .then((json) => {
          if (!active) return;
          if (json.success && json.data) {
            setResult(json.data);
          } else {
            setErrorMsg(json.message || 'Không tìm thấy dữ liệu cho kênh này.');
          }
        })
        .catch(() => {
          if (active) {
            setErrorMsg('Lỗi kết nối khi gửi yêu cầu tra cứu Kalodata.');
          }
        })
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });
    }

    return () => {
      active = false;
    };
  }, [isOpen, targetKoc, period]);

  const handleApplyToKoc = async () => {
    if (!result || !targetKoc) return;

    setIsApplying(true);
    try {
      const updates: Partial<KocItem> = {
        followers: result.profile.followers,
        avgViews: result.metrics.avgViews,
        recentRevenue: result.metrics.gmv,
        itemsSold: result.metrics.itemsSold,
        gpm: result.metrics.gpm,
        aov: result.metrics.aov,
        gmvShareVideo: result.metrics.gmvShareVideo,
        gmvShareLive: result.metrics.gmvShareLive,
        gmvShareProductCard: result.metrics.gmvShareProductCard,
        femaleRatio: result.audience.femaleRatio,
        maleRatio: result.audience.maleRatio,
        age18_24: result.audience.age18_24,
        age25_34: result.audience.age25_34,
        age35Plus: result.audience.age35Plus,
        avatarUrl: result.profile.avatarUrl || targetKoc.avatarUrl,
      };

      if (onApplyUpdates) {
        onApplyUpdates(targetKoc.id, updates);
      }

      // Gọi API sync để lưu vào database nếu có
      await fetch('/api/integrations/kalodata/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kocId: targetKoc.id,
          channelId: result.profile.handle,
          period,
        }),
      });

      if (onNotify) {
        onNotify(
          `Đã cập nhật chỉ số bán hàng từ Kalodata vào hồ sơ KOC ${targetKoc.stageName}.`,
          'success'
        );
      }

      onClose();
    } catch {
      if (onNotify) {
        onNotify('Lỗi khi cập nhật dữ liệu vào hồ sơ KOC.', 'error');
      }
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return <Presence show={false} />;

  return (
    <Presence show>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 overflow-y-auto animate-in fade-in duration-(--motion-base)">
      <div data-motion-panel className="relative w-full max-w-4xl bg-surface rounded-2xl shadow-2xl border border-line overflow-hidden flex flex-col max-h-[92dvh] animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-line flex items-center justify-between bg-sunken">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-fg flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-ink">
                Đồng bộ số liệu thương mại từ Kalodata
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted hover:text-ink rounded-lg hover:bg-hover transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thanh tìm kiếm & bộ lọc chu kỳ */}
        <div className="p-4 sm:p-6 border-b border-line bg-surface space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted font-semibold text-xs">
                @
              </span>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleFetchData();
                  }
                }}
                placeholder="Nhập ID kênh TikTok (VD: megauriviu, chanhbeauty...)"
                className="w-full pl-8 pr-4 py-2.5 bg-sunken border border-line-strong rounded-xl text-xs text-ink font-medium placeholder-muted focus:outline-none focus:border-primary focus:bg-surface transition"
              />
            </div>

            {/* Chọn chu kỳ */}
            <div className="flex items-center bg-sunken p-1 rounded-xl border border-line shrink-0">
              {(['7d', '30d', '90d'] as KalodataPeriod[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPeriod(p);
                    if (result) handleFetchData(handle, p);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    period === p
                      ? 'bg-surface text-primary'
                      : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  {p === '7d' ? '7 ngày gần nhất' : p === '30d' ? '30 ngày' : '90 ngày'}
                </button>
              ))}
            </div>

            {/* Nút tìm kiếm */}
            <button
              type="button"
              onClick={() => handleFetchData()}
              disabled={loading}
              className="px-5 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-fg rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Đang tra cứu...' : 'Tra cứu số liệu'}</span>
            </button>
          </div>

          {/* Cảnh báo chế độ */}
          {!status?.hasApiKey && (
            <div className="flex items-center gap-2 text-2xs text-warn bg-warn-soft px-3 py-2 rounded-lg border border-warn-line">
              <AlertCircle className="w-3.5 h-3.5 text-warn shrink-0" />
              <span>
                Hệ thống đang chạy chế độ mô phỏng số liệu thị trường Việt Nam. Khi hoàn tất hợp đồng với Kalodata, chỉ cần cấu hình khóa API trong hệ thống để tự động chuyển sang luồng đồng bộ trực tiếp.
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-danger-soft border border-danger-line text-danger rounded-xl text-xs flex items-center justify-between">
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="text-danger hover:opacity-80 font-semibold"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Nội dung kết quả */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-sunken">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
              <div className="text-xs font-semibold text-ink-2">
                Đang kết nối Kalodata và trích xuất chỉ số bán hàng...
              </div>
              <div className="text-2xs text-muted">
                Đang phân tích doanh số, GPM và cơ cấu ngành hàng kênh @{handle}
              </div>
            </div>
          ) : result ? (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="bg-surface p-5 rounded-2xl border border-line flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={result.profile.avatarUrl}
                    alt={result.profile.nickname}
                    className="w-16 h-16 rounded-full object-cover border border-line"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80';
                    }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-semibold text-ink">
                        {result.profile.nickname}
                      </h4>
                      {result.profile.isVerified && (
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div className="text-xs text-muted font-medium mt-0.5">
                      @{result.profile.handle} · {result.profile.category} · Khu vực: {result.profile.region}
                    </div>
                    {result.profile.bio && (
                      <p className="text-2xs text-ink-2 mt-1 max-w-xl line-clamp-2">
                        {result.profile.bio}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-line pt-3 md:pt-0 md:pl-6 w-full md:w-auto justify-between md:justify-start">
                  <div>
                    <div className="text-2xs font-medium text-muted">
                      Follower
                    </div>
                    <div className="text-base font-semibold text-ink tabular-nums">
                      {formatNumber(result.profile.followers)}
                    </div>
                  </div>
                  <div>
                    <div className="text-2xs font-medium text-muted">
                      Lượt xem TB
                    </div>
                    <div className="text-base font-semibold text-primary tabular-nums">
                      {formatNumber(result.metrics.avgViews)}
                    </div>
                  </div>
                  <div>
                    <div className="text-2xs font-medium text-muted">
                      Tương tác
                    </div>
                    <div className="text-base font-semibold text-success tabular-nums">
                      {result.metrics.engagementRate}%
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Thẻ chỉ số thương mại cốt lõi */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <div className="bg-surface p-4 rounded-xl border border-line">
                  <div className="flex items-center justify-between text-muted text-2xs font-medium">
                    <span>Doanh số ước tính ({result.metrics.period})</span>
                    <DollarSign className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="text-lg font-semibold text-ink mt-1 tabular-nums">
                    {formatVndShort(result.metrics.gmv)}
                  </div>
                  <div className="text-2xs text-muted mt-0.5 tabular-nums">
                    {formatVnd(result.metrics.gmv)}
                  </div>
                </div>

                <div className="bg-surface p-4 rounded-xl border border-line">
                  <div className="flex items-center justify-between text-muted text-2xs font-medium">
                    <span>Số lượng bán ra</span>
                    <ShoppingBag className="w-3.5 h-3.5 text-success" />
                  </div>
                  <div className="text-lg font-semibold text-success mt-1 tabular-nums">
                    {formatNumber(result.metrics.itemsSold)}
                  </div>
                  <div className="text-2xs text-muted mt-0.5 tabular-nums">
                    ~{formatNumber(result.metrics.orderCount)} đơn hàng
                  </div>
                </div>

                <div className="bg-surface p-4 rounded-xl border border-line">
                  <div className="flex items-center justify-between text-muted text-2xs font-medium">
                    <span>GPM (Doanh số/1K views)</span>
                    <TrendingUp className="w-3.5 h-3.5 text-info" />
                  </div>
                  <div className="text-lg font-semibold text-info mt-1 tabular-nums">
                    {formatVndShort(result.metrics.gpm)}
                  </div>
                  <div className="text-2xs text-muted mt-0.5">
                    Hiệu quả gắn giỏ hàng
                  </div>
                </div>

                <div className="bg-surface p-4 rounded-xl border border-line">
                  <div className="flex items-center justify-between text-muted text-2xs font-medium">
                    <span>Giá trị đơn TB (AOV)</span>
                    <Layers className="w-3.5 h-3.5 text-warn" />
                  </div>
                  <div className="text-lg font-semibold text-warn mt-1 tabular-nums">
                    {formatVndShort(result.metrics.aov)}
                  </div>
                  <div className="text-2xs text-muted mt-0.5">
                    Mức chi tiêu trung bình
                  </div>
                </div>
              </div>

              {/* Chi tiết phân bổ kênh bán & Nhân khẩu học */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cơ cấu nguồn doanh số */}
                <div className="bg-surface p-5 rounded-2xl border border-line space-y-3.5">
                  <h5 className="text-xs font-semibold text-ink flex items-center gap-2">
                    <Video className="w-4 h-4 text-primary" />
                    <span>Cơ cấu doanh số theo định dạng nội dung</span>
                  </h5>

                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-ink-2">Video ngắn</span>
                        <span className="font-semibold text-primary tabular-nums">
                          {result.metrics.gmvShareVideo}%
                        </span>
                      </div>
                      <div className="w-full bg-sunken rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${result.metrics.gmvShareVideo}%` }}
                        />
                      </div>
                      <div className="text-2xs text-muted mt-0.5">
                        {result.metrics.videoCount} video gắn giỏ hàng trong kỳ
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-ink-2">Livestream</span>
                        <span className="font-semibold text-info tabular-nums">
                          {result.metrics.gmvShareLive}%
                        </span>
                      </div>
                      <div className="w-full bg-sunken rounded-full h-2">
                        <div
                          className="bg-info h-2 rounded-full transition-all"
                          style={{ width: `${result.metrics.gmvShareLive}%` }}
                        />
                      </div>
                      <div className="text-2xs text-muted mt-0.5">
                        {result.metrics.liveCount} phiên phát trực tiếp bán hàng
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-ink-2">Thẻ sản phẩm / Gian hàng</span>
                        <span className="font-semibold text-ink-2 tabular-nums">
                          {result.metrics.gmvShareProductCard}%
                        </span>
                      </div>
                      <div className="w-full bg-sunken rounded-full h-2">
                        <div
                          className="bg-muted h-2 rounded-full transition-all"
                          style={{ width: `${result.metrics.gmvShareProductCard}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Nhân khẩu học người xem */}
                <div className="bg-surface p-5 rounded-2xl border border-line space-y-3.5">
                  <h5 className="text-xs font-semibold text-ink flex items-center gap-2">
                    <Users className="w-4 h-4 text-success" />
                    <span>Nhân khẩu học tệp người theo dõi</span>
                  </h5>

                  {/* Giới tính */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-ink-2 font-medium">Giới tính:</span>
                      <span className="font-semibold text-ink tabular-nums">
                        Nữ {result.audience.femaleRatio}% • Nam {result.audience.maleRatio}%
                      </span>
                    </div>
                    <div className="w-full bg-sunken rounded-full h-2.5 flex overflow-hidden">
                      <div
                        className="bg-primary h-full"
                        style={{ width: `${result.audience.femaleRatio}%` }}
                      />
                      <div
                        className="bg-info h-full"
                        style={{ width: `${result.audience.maleRatio}%` }}
                      />
                    </div>
                  </div>

                  {/* Độ tuổi */}
                  <div className="pt-2 border-t border-line space-y-2">
                    <div className="text-2xs font-medium text-muted">
                      Phân bổ độ tuổi
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-sunken rounded-xl border border-line">
                        <div className="text-2xs text-muted">18 - 24 tuổi</div>
                        <div className="text-xs font-semibold text-ink mt-0.5 tabular-nums">
                          {result.audience.age18_24}%
                        </div>
                      </div>
                      <div className="p-2 bg-sunken rounded-xl border border-line">
                        <div className="text-2xs text-muted">25 - 34 tuổi</div>
                        <div className="text-xs font-semibold text-ink mt-0.5 tabular-nums">
                          {result.audience.age25_34}%
                        </div>
                      </div>
                      <div className="p-2 bg-sunken rounded-xl border border-line">
                        <div className="text-2xs text-muted">&gt; 35 tuổi</div>
                        <div className="text-xs font-semibold text-ink mt-0.5 tabular-nums">
                          {result.audience.age35Plus}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sản phẩm bán chạy */}
              {result.topProducts && result.topProducts.length > 0 && (
                <div className="bg-surface p-5 rounded-2xl border border-line space-y-3">
                  <h5 className="text-xs font-semibold text-ink flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-primary" />
                    <span>Top sản phẩm gắn link bán chạy nhất của KOC</span>
                  </h5>

                  <div className="divide-y divide-line">
                    {result.topProducts.map((p) => (
                      <div
                        key={p.productId}
                        className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3">
                          {p.productImageUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={p.productImageUrl}
                              alt={p.productName}
                              className="w-10 h-10 rounded-lg object-cover border border-line"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-sunken flex items-center justify-center text-muted">
                              <ShoppingBag className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <div className="text-xs font-semibold text-ink line-clamp-1">
                              {p.productName}
                            </div>
                            <div className="text-2xs text-muted">
                              Ngành: {p.categoryName} {p.shopName ? `• Gian hàng: ${p.shopName}` : ''}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-semibold text-ink tabular-nums">
                            {formatVndShort(p.gmv)}
                          </div>
                          <div className="text-2xs text-muted tabular-nums">
                            {formatNumber(p.salesCount)} lượt bán • Hoa hồng: {p.commissionRate}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-16 text-center space-y-2">
              <Search className="w-10 h-10 text-muted mx-auto" />
              <div className="text-xs font-semibold text-ink-2">
                Chưa có dữ liệu tra cứu
              </div>
              <div className="text-2xs text-muted max-w-sm mx-auto">
                Nhập tên kênh TikTok và nhấn &quot;Tra cứu số liệu&quot; để xem báo cáo thương mại từ Kalodata.
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-line bg-surface flex flex-wrap items-center justify-between gap-2.5">
          <div className="text-2xs text-muted">
            {result?.syncedAt
              ? `Cập nhật lúc: ${new Date(result.syncedAt).toLocaleTimeString('vi-VN')} - ${new Date(result.syncedAt).toLocaleDateString('vi-VN')}`
              : 'Nguồn dữ liệu: Kalodata E-commerce Analytics'}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-ink-2 hover:text-ink bg-sunken hover:bg-hover transition"
            >
              Đóng
            </button>

            {targetKoc && result && (
              <button
                type="button"
                onClick={handleApplyToKoc}
                disabled={isApplying}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-primary-fg bg-primary hover:bg-primary-hover transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isApplying ? 'Đang cập nhật...' : 'Cập nhật vào hồ sơ KOC'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
    </Presence>
  );
};

