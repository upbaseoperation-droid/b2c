'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ShoppingBag,
  Video,
  Radio,
  Users,
  Eye,
  DollarSign,
  Layers,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Check
} from 'lucide-react';
import {
  KalodataCreatorDetail,
  KalodataPeriod,
  KalodataConnectionStatus
} from '@/lib/kalodata/types';
import { KocItem } from '@/lib/types';
import { formatVndShort } from '@/lib/format';

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
  onNotify
}) => {
  const [handle, setHandle] = useState('');
  const [period, setPeriod] = useState<KalodataPeriod>('30d');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<KalodataConnectionStatus | null>(null);
  const [result, setResult] = useState<KalodataCreatorDetail | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  // Khởi tạo handle khi modal mở
  useEffect(() => {
    if (isOpen) {
      const initialHandle = targetKoc?.channelId ? targetKoc.channelId.replace('@', '') : '';
      setHandle(initialHandle);
      setErrorMsg(null);
      // Kiểm tra trạng thái API
      fetchStatus();
      if (initialHandle) {
        handleFetchData(initialHandle, period);
      }
    } else {
      setResult(null);
      setErrorMsg(null);
    }
  }, [isOpen, targetKoc]);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/integrations/kalodata/status');
      const json = await res.json();
      if (json.success) {
        setStatus(json.data);
      }
    } catch {
      // Bỏ qua lỗi kết nối ngầm
    }
  };

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
    } catch (err: any) {
      setErrorMsg('Lỗi kết nối khi gửi yêu cầu tra cứu Kalodata.');
    } finally {
      setLoading(false);
    }
  };

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
        avatarUrl: result.profile.avatarUrl || targetKoc.avatarUrl
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
          period
        })
      });

      if (onNotify) {
        onNotify(
          `Đã cập nhật chỉ số bán hàng từ Kalodata vào hồ sơ KOC ${targetKoc.stageName} thành công.`,
          'success'
        );
      }

      onClose();
    } catch (err: any) {
      if (onNotify) {
        onNotify('Lỗi khi cập nhật dữ liệu vào hồ sơ KOC.', 'error');
      }
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800">
                  Đồng bộ số liệu thương mại từ Kalodata
                </h3>
                {status?.hasApiKey ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-emerald-100 text-emerald-800">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    API trực tiếp
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-amber-100 text-amber-800" title="Chờ điền KALODATA_API_KEY khi hoàn tất hợp đồng">
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    Chế độ thử nghiệm
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Tra cứu doanh số, GPM, đơn hàng và cơ cấu video/live của KOC trên TikTok Shop
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thanh tìm kiếm & bộ lọc chu kỳ */}
        <div className="p-6 border-b border-slate-200 bg-white space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">
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
                className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-medium placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>

            {/* Chọn chu kỳ */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
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
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
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
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Đang tra cứu...' : 'Tra cứu số liệu'}</span>
            </button>
          </div>

          {/* Cảnh báo chế độ */}
          {!status?.hasApiKey && (
            <div className="flex items-center gap-2 text-2xs text-amber-800 bg-amber-50/80 px-3 py-2 rounded-lg border border-amber-200/60">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>
                Hệ thống đang chạy chế độ mô phỏng số liệu thị trường Việt Nam. Khi hoàn tất hợp đồng với Kalodata, chỉ cần cấu hình khóa API trong hệ thống để tự động chuyển sang luồng đồng bộ trực tiếp.
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center justify-between">
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="text-rose-500 hover:text-rose-800 font-bold"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Nội dung kết quả */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <div className="text-xs font-semibold text-slate-700">
                Đang kết nối Kalodata và trích xuất chỉ số bán hàng...
              </div>
              <div className="text-2xs text-slate-500">
                Đang phân tích doanh số, GPM và cơ cấu ngành hàng kênh @{handle}
              </div>
            </div>
          ) : result ? (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img
                    src={result.profile.avatarUrl}
                    alt={result.profile.nickname}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm ring-2 ring-slate-100"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80';
                    }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-slate-800">
                        {result.profile.nickname}
                      </h4>
                      {result.profile.isVerified && (
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      )}
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-2xs font-semibold">
                        {result.profile.category}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">
                      @{result.profile.handle} • Khu vực: {result.profile.region}
                    </div>
                    {result.profile.bio && (
                      <p className="text-2xs text-slate-600 mt-1 max-w-xl line-clamp-2">
                        {result.profile.bio}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-6 w-full md:w-auto justify-between md:justify-start">
                  <div>
                    <div className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">
                      Follower
                    </div>
                    <div className="text-base font-bold text-slate-800">
                      {result.profile.followers.toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <div>
                    <div className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">
                      Lượt xem TB
                    </div>
                    <div className="text-base font-bold text-blue-600">
                      {result.metrics.avgViews.toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <div>
                    <div className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">
                      Tương tác
                    </div>
                    <div className="text-base font-bold text-emerald-600">
                      {result.metrics.engagementRate}%
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Thẻ chỉ số thương mại cốt lõi */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-2xs font-semibold">
                    <span>Doanh số ước tính ({result.metrics.period})</span>
                    <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div className="text-lg font-bold text-slate-900 mt-1">
                    {formatVndShort(result.metrics.gmv)}
                  </div>
                  <div className="text-2xs text-slate-500 mt-0.5">
                    {result.metrics.gmv.toLocaleString('vi-VN')} đ
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-2xs font-semibold">
                    <span>Số lượng bán ra</span>
                    <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="text-lg font-bold text-emerald-700 mt-1">
                    {result.metrics.itemsSold.toLocaleString('vi-VN')}
                  </div>
                  <div className="text-2xs text-slate-500 mt-0.5">
                    ~{result.metrics.orderCount.toLocaleString('vi-VN')} đơn hàng
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-2xs font-semibold">
                    <span>GPM (Doanh số/1K views)</span>
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <div className="text-lg font-bold text-indigo-700 mt-1">
                    {formatVndShort(result.metrics.gpm)}
                  </div>
                  <div className="text-2xs text-slate-500 mt-0.5">
                    Hiệu quả gắn giỏ hàng
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-2xs font-semibold">
                    <span>Giá trị đơn TB (AOV)</span>
                    <Layers className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div className="text-lg font-bold text-amber-700 mt-1">
                    {formatVndShort(result.metrics.aov)}
                  </div>
                  <div className="text-2xs text-slate-500 mt-0.5">
                    Mức chi tiêu trung bình
                  </div>
                </div>
              </div>

              {/* Chi tiết phân bổ kênh bán & Nhân khẩu học */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cơ cấu nguồn doanh số */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
                  <h5 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <Video className="w-4 h-4 text-blue-600" />
                    <span>Cơ cấu doanh số theo định dạng nội dung</span>
                  </h5>

                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-700">Video ngắn</span>
                        <span className="font-bold text-blue-700">
                          {result.metrics.gmvShareVideo}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${result.metrics.gmvShareVideo}%` }}
                        />
                      </div>
                      <div className="text-2xs text-slate-500 mt-0.5">
                        {result.metrics.videoCount} video gắn giỏ hàng trong kỳ
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-700">Livestream</span>
                        <span className="font-bold text-purple-700">
                          {result.metrics.gmvShareLive}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all"
                          style={{ width: `${result.metrics.gmvShareLive}%` }}
                        />
                      </div>
                      <div className="text-2xs text-slate-500 mt-0.5">
                        {result.metrics.liveCount} phiên phát trực tiếp bán hàng
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-700">Thẻ sản phẩm / Gian hàng</span>
                        <span className="font-bold text-slate-700">
                          {result.metrics.gmvShareProductCard}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className="bg-slate-500 h-2 rounded-full transition-all"
                          style={{ width: `${result.metrics.gmvShareProductCard}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Nhân khẩu học người xem */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
                  <h5 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>Nhân khẩu học tệp người theo dõi</span>
                  </h5>

                  {/* Giới tính */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">Giới tính:</span>
                      <span className="font-bold text-slate-800">
                        Nữ {result.audience.femaleRatio}% • Nam {result.audience.maleRatio}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 flex overflow-hidden">
                      <div
                        className="bg-rose-500 h-full"
                        style={{ width: `${result.audience.femaleRatio}%` }}
                      />
                      <div
                        className="bg-sky-500 h-full"
                        style={{ width: `${result.audience.maleRatio}%` }}
                      />
                    </div>
                  </div>

                  {/* Độ tuổi */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="text-2xs font-semibold text-slate-500 uppercase">
                      Phân bổ độ tuổi
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="text-2xs text-slate-500">18 - 24 tuổi</div>
                        <div className="text-xs font-bold text-slate-800 mt-0.5">
                          {result.audience.age18_24}%
                        </div>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="text-2xs text-slate-500">25 - 34 tuổi</div>
                        <div className="text-xs font-bold text-slate-800 mt-0.5">
                          {result.audience.age25_34}%
                        </div>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="text-2xs text-slate-500">&gt; 35 tuổi</div>
                        <div className="text-xs font-bold text-slate-800 mt-0.5">
                          {result.audience.age35Plus}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sản phẩm bán chạy */}
              {result.topProducts && result.topProducts.length > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h5 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-blue-600" />
                    <span>Top sản phẩm gắn link bán chạy nhất của KOC</span>
                  </h5>

                  <div className="divide-y divide-slate-100">
                    {result.topProducts.map((p) => (
                      <div
                        key={p.productId}
                        className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3">
                          {p.productImageUrl ? (
                            <img
                              src={p.productImageUrl}
                              alt={p.productName}
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                              <ShoppingBag className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <div className="text-xs font-bold text-slate-800 line-clamp-1">
                              {p.productName}
                            </div>
                            <div className="text-2xs text-slate-500">
                              Ngành: {p.categoryName} {p.shopName ? `• Gian hàng: ${p.shopName}` : ''}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold text-slate-800">
                            {formatVndShort(p.gmv)}
                          </div>
                          <div className="text-2xs text-slate-500">
                            {p.salesCount.toLocaleString('vi-VN')} lượt bán • Hoa hồng: {p.commissionRate}%
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
              <Search className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="text-xs font-semibold text-slate-700">
                Chưa có dữ liệu tra cứu
              </div>
              <div className="text-2xs text-slate-500 max-w-sm mx-auto">
                Nhập tên kênh TikTok và nhấn &quot;Tra cứu số liệu&quot; để xem báo cáo thương mại từ Kalodata.
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between">
          <div className="text-2xs text-slate-500">
            {result?.syncedAt
              ? `Cập nhật lúc: ${new Date(result.syncedAt).toLocaleTimeString('vi-VN')} - ${new Date(result.syncedAt).toLocaleDateString('vi-VN')}`
              : 'Nguồn dữ liệu: Kalodata E-commerce Analytics'}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition"
            >
              Đóng
            </button>

            {targetKoc && result && (
              <button
                type="button"
                onClick={handleApplyToKoc}
                disabled={isApplying}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isApplying ? 'Đang cập nhật...' : 'Cập nhật vào hồ sơ KOC'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
