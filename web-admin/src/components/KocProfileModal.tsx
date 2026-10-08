'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Zap, 
  Star, 
  ShieldCheck, 
  Phone, 
  CreditCard, 
  Video, 
  TrendingUp, 
  CheckCircle, 
  ExternalLink, 
  Award, 
  Flame, 
  Tag, 
  MapPin, 
  Mail, 
  ShoppingBag, 
  Users, 
  BarChart3, 
  PieChart, 
  Truck, 
  FileText, 
  Building2,
  Calendar,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { KocItem } from '../lib/types';

interface KocProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  koc: KocItem | null;
  onOpenQuickBook: (koc: KocItem) => void;
}

export const KocProfileModal: React.FC<KocProfileModalProps> = ({
  isOpen,
  onClose,
  koc,
  onOpenQuickBook,
}) => {
  const [activeTab, setActiveTab] = useState<'ECOMMERCE' | 'AUDIENCE' | 'LOGISTICS' | 'CONTRACT_HISTORY'>('ECOMMERCE');

  // Keyboard accessibility: ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !koc) return null;

  const pastBookingDeals = [
    {
      code: `BO26_${koc.stageName.toUpperCase().replace(/\s+/g, '')}_01`,
      jobId: `ID26_${koc.stageName.toUpperCase().replace(/\s+/g, '')}_JOB1`,
      brandName: koc.niche.includes('Mẹ') || koc.tepKenh?.includes('Mẹ') || koc.kocCategory === 'Mom and baby' ? 'Kutieskin Mama' : 'Royal Ausnz',
      productName: koc.niche.includes('Mẹ') || koc.kocCategory === 'Mom and baby' ? 'Nước tắm thảo dược & Kem dịu da' : 'Sữa Hoàng Gia Úc Premium',
      batch: 'Đợt 1 (Mở màn)',
      campaign: 'Mega Sale 9.9 — Khởi Động Mùa Thu',
      date: '10/09/2026',
      brandApprovalStatus: 'ĐÃ_DUYỆT' as const,
      brandRejectReason: undefined,
      pipelineText: 'Done',
      cost: koc.rateCardVideo,
      gmv30: koc.totalPastGmv ? Math.round(koc.totalPastGmv * 0.55) : koc.rateCardVideo * 2.8,
      roi: koc.historicalRoi || 2.8,
      status: 'Đã Hoàn Tất',
      isWinner: koc.isWinnerTop20
    },
    {
      code: `BO26_${koc.stageName.toUpperCase().replace(/\s+/g, '')}_02`,
      jobId: `ID26_${koc.stageName.toUpperCase().replace(/\s+/g, '')}_JOB2`,
      brandName: 'Bye Bye Blemish',
      productName: 'Chấm mụn tràm trà Tea Tree Drying Lotion',
      batch: 'Đợt 2 (Đẩy số)',
      campaign: 'Super Summer Glow 2026',
      date: '25/07/2026',
      brandApprovalStatus: 'ĐÃ_DUYỆT' as const,
      brandRejectReason: undefined,
      pipelineText: 'Done',
      cost: koc.rateCardVideo,
      gmv30: koc.totalPastGmv ? Math.round(koc.totalPastGmv * 0.45) : koc.rateCardVideo * 3.2,
      roi: (koc.historicalRoi ? koc.historicalRoi * 1.1 : 3.2),
      status: 'Đã Hoàn Tất',
      isWinner: koc.isWinnerTop20
    },
    {
      code: `BO26_${koc.stageName.toUpperCase().replace(/\s+/g, '')}_03`,
      jobId: `ID26_${koc.stageName.toUpperCase().replace(/\s+/g, '')}_JOB3`,
      brandName: 'pHCare',
      productName: 'Dung dịch vệ sinh phụ nữ Daily Care',
      batch: 'Đợt 1',
      campaign: 'Chăm Sóc Toàn Diện Q3',
      date: '05/08/2026',
      brandApprovalStatus: 'TỪ_CHỐI' as const,
      brandRejectReason: 'Brand yêu cầu creator Nữ có chuyên môn Sản/Phụ khoa hoặc Review chuyên sâu',
      pipelineText: 'Brand từ chối',
      cost: 0,
      gmv30: 0,
      roi: 0,
      status: 'Brand Từ Chối',
      isWinner: false
    }
  ];

  const totalGmv = koc.totalPastGmv || (pastBookingDeals[0].gmv30 + pastBookingDeals[1].gmv30);
  const totalCost = koc.totalPastCost || (pastBookingDeals[0].cost + pastBookingDeals[1].cost);
  const overallRoi = koc.historicalRoi || Number((totalGmv / (totalCost || 1)).toFixed(2));

  const femaleRatio = koc.femaleRatio ?? 85;
  const maleRatio = koc.maleRatio ?? (100 - femaleRatio);
  const age18_24 = koc.age18_24 ?? 55;
  const age25_34 = koc.age25_34 ?? 35;
  const age35Plus = koc.age35Plus ?? 10;
  const gmvShareVideo = koc.gmvShareVideo ?? 70;
  const gmvShareLive = koc.gmvShareLive ?? 20;
  const gmvShareProductCard = koc.gmvShareProductCard ?? 10;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="koc-profile-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Top Header - Clean Enterprise Light */}
        <div className="relative p-6 bg-slate-50 border-b border-slate-200">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
            aria-label="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-600 text-white flex items-center justify-center font-semibold text-2xl shadow-sm shrink-0">
              {koc.stageName.charAt(0)}
            </div>

            <div className="space-y-1">
              <div className="flex items-center flex-wrap gap-2">
                <h3 id="koc-profile-title" className="text-lg font-semibold text-slate-900">{koc.stageName}</h3>
                <span className="badge-blue px-2 py-0.5 rounded text-xs font-semibold">
                  {koc.tierLabel}
                </span>
                <span className="badge-purple px-2 py-0.5 rounded text-xs font-semibold font-mono">
                  KL: {koc.salaryGrade}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  koc.segment === 'Top Creator' ? 'badge-amber' :
                  koc.segment === 'Key Creator' ? 'badge-purple' :
                  koc.segment === 'Mid Creator' ? 'badge-blue' : 'badge-slate'
                }`}>
                  Segment: {koc.segment || 'Massive Creator'}
                </span>
                <span className="badge-emerald px-2 py-0.5 rounded text-xs font-semibold">
                  Tệp: {koc.tepKenh || koc.creatorCategory}
                </span>
                <span className="bg-pink-50 text-pink-700 border border-pink-200 px-2 py-0.5 rounded text-xs font-semibold">
                  {koc.kocCategory || 'Personal care'}
                </span>
                {koc.isWinnerTop20 && (
                  <span className="badge-amber px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>Winner Top 20</span>
                  </span>
                )}
              </div>

              <div className="text-xs text-blue-700 font-mono flex items-center flex-wrap gap-2 pt-0.5">
                <a 
                  href={koc.channelLink || `https://www.tiktok.com/@${koc.channelId.replace('@', '')}`}
                  target="_blank" 
                  rel="noreferrer"
                  className="hover:underline flex items-center gap-1 font-semibold text-blue-600"
                >
                  <span>{koc.channelId}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span className="text-slate-300">•</span>
                <span className="text-slate-600">Tên thật: <strong className="text-slate-800">{koc.realName}</strong></span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-600 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-rose-500" />
                  Khu vực: <strong className="text-slate-800">{koc.location || 'Hà Nội'}</strong>
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-600">
                  PIC phụ trách: <strong className="text-amber-700">{koc.bookingPic || 'Khánh Vy'}</strong>
                </span>
              </div>

              <div className="text-xs text-slate-500">
                Chuyên môn ngách: <strong className="text-slate-700">{koc.niche}</strong>
              </div>
            </div>
          </div>

          {/* Navigation Tabs inside Modal */}
          <div className="flex items-center gap-2 mt-5 border-t border-slate-200 pt-3 overflow-x-auto">
            {[
              { id: 'ECOMMERCE', label: '1. Hiệu suất E-Commerce & GMV', icon: ShoppingBag },
              { id: 'AUDIENCE', label: '2. Nhân khẩu học & tệp Follower', icon: Users },
              { id: 'LOGISTICS', label: '3. Hậu cần nhận mẫu & vận hành', icon: Truck },
              { id: 'CONTRACT_HISTORY', label: '4. Pháp lý & lịch sử booking', icon: FileText },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Body - Clean Light */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs text-slate-800">
          {/* TAB 1: E-COMMERCE ANALYTICS */}
          {activeTab === 'ECOMMERCE' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Classification Info Box */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 mb-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Định Danh &amp; Phân Loại Creator Theo Quy Chuẩn Booking:</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-xs text-slate-500 block font-medium">1. Khung Lương (KL):</span>
                    <strong className="text-purple-700 font-mono text-sm block mt-0.5">{koc.salaryGrade}</strong>
                    <span className="text-2xs text-slate-400">Đơn giá net video</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-xs text-slate-500 block font-medium">2. Segment:</span>
                    <strong className="text-slate-900 font-semibold text-xs block mt-0.5">{koc.segment || 'Massive Creator'}</strong>
                    <span className="text-2xs text-slate-400">Cấp độ chiến lược</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-xs text-slate-500 block font-medium">3. Tệp kênh:</span>
                    <strong className="text-emerald-700 font-semibold text-xs block mt-0.5">{koc.tepKenh || koc.creatorCategory || 'Review Nữ'}</strong>
                    <span className="text-2xs text-slate-400">Định vị nội dung</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-xs text-slate-500 block font-medium">4. KOC Category:</span>
                    <strong className="text-pink-700 font-semibold text-xs block mt-0.5">{koc.kocCategory || 'Personal care'}</strong>
                    <span className="text-2xs text-slate-400">Ngành hàng cốt lõi</span>
                  </div>
                </div>
              </div>

              {/* Key High-level Performance Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs text-center">
                  <span className="text-xs text-slate-500 block">Followers Kênh</span>
                  <span className="text-base font-semibold text-slate-900 mt-0.5 block">
                    {koc.followers.toLocaleString('vi-VN')}
                  </span>
                  <span className="text-2xs text-slate-500">View TB: {koc.avgViews.toLocaleString('vi-VN')}</span>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs text-center">
                  <span className="text-xs text-slate-500 block">Báo giá video net</span>
                  <span className="text-base font-semibold text-blue-600 mt-0.5 block font-mono">
                    {koc.rateCardVideo.toLocaleString('vi-VN')} đ
                  </span>
                  <span className="badge-purple px-1.5 py-0.2 rounded text-2xs font-semibold mt-1 inline-block">
                    Khung {koc.salaryGrade}
                  </span>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs text-center">
                  <span className="text-xs text-emerald-700 block font-semibold">Kỷ lục GMV</span>
                  <span className="text-base font-semibold text-emerald-700 mt-0.5 block font-mono">
                    {(koc.gmvBestCase || totalGmv).toLocaleString('vi-VN')} đ
                  </span>
                  <span className="text-2xs text-slate-500">Đơn hàng: ~{(koc.itemsSold || 1200).toLocaleString('vi-VN')} món</span>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-blue-200 bg-blue-50/20 shadow-2xs text-center">
                  <span className="text-xs text-blue-700 font-semibold block">AOV (giá trị đơn TB)</span>
                  <span className="text-base font-semibold text-blue-700 mt-0.5 block font-mono">
                    {(koc.aov || 245000).toLocaleString('vi-VN')} đ
                  </span>
                  <span className="text-2xs text-slate-500">GPM: {(koc.gpm || 28.5)}%</span>
                </div>
              </div>

              {/* GMV Channels Breakdown */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-blue-600" />
                    <span>Cơ cấu nguồn doanh thu (tỉ trọng GMV thực tế KOC bán được)</span>
                  </h4>
                  <span className="text-2xs text-slate-500">Đồng bộ TikTok Shop Analytics</span>
                </div>

                <div className="space-y-3 pt-1">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">1. Tỉ trọng GMV từ video ngắn</span>
                      <strong className="text-blue-700 font-mono">{gmvShareVideo}%</strong>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${gmvShareVideo}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">2. Tỉ trọng GMV từ livestream</span>
                      <strong className="text-purple-700 font-mono">{gmvShareLive}%</strong>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div className="h-full bg-purple-600 rounded-full" style={{ width: `${gmvShareLive}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">3. Tỉ trọng GMV từ Showcase Ghim kênh</span>
                      <strong className="text-emerald-700 font-mono">{gmvShareProductCard}%</strong>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${gmvShareProductCard}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Insights */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 font-semibold block mb-0.5">Gợi ý chiến lược booking từ Upbase:</strong>
                  <p className="text-slate-700 leading-relaxed text-xs">
                    {koc.contentNote || 'KOC có thế mạnh review chân thật, giọng truyền cảm, chuyển đổi tốt ở giỏ hàng video. Khuyến nghị chạy kèm Spark Ads 7 ngày sau khi video lên xu hướng để tối đa hóa điểm hoàn vốn (ROI).'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUDIENCE DEMOGRAPHICS */}
          {activeTab === 'AUDIENCE' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <h4 className="text-xs font-semibold text-slate-900">Tỷ lệ giới tính Follower</h4>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-600">Nữ: <strong className="text-pink-600">{femaleRatio}%</strong></span>
                    <span className="text-slate-600">Nam: <strong className="text-blue-600">{maleRatio}%</strong></span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
                    <div className="h-full bg-pink-500" style={{ width: `${femaleRatio}%` }} />
                    <div className="h-full bg-blue-500" style={{ width: `${maleRatio}%` }} />
                  </div>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <h4 className="text-xs font-semibold text-slate-900">Độ tuổi khán giả chính</h4>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-2xs text-slate-500 block">18-24 tuổi</span>
                      <strong className="text-slate-900 font-mono text-sm">{age18_24}%</strong>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-2xs text-slate-500 block">25-34 tuổi</span>
                      <strong className="text-blue-700 font-mono text-sm">{age25_34}%</strong>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-2xs text-slate-500 block">&gt;35 tuổi</span>
                      <strong className="text-slate-900 font-mono text-sm">{age35Plus}%</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SAMPLE SHIPPING LOGISTICS */}
          {activeTab === 'LOGISTICS' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-emerald-600" />
                    <span>Thông tin nhận hàng gửi mẫu</span>
                  </h4>
                  <span className="badge-emerald px-2 py-0.5 rounded text-xs font-semibold">
                    Đã xác thực địa chỉ
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs text-slate-500 block">Địa chỉ nhận hàng:</span>
                      <strong className="text-slate-900 text-xs block mt-0.5 leading-relaxed">
                        {koc.shippingAddress || `${koc.realName} — ${koc.phone} — Tòa nhà Upbase, Cầu Giấy, Hà Nội`}
                      </strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                    <div>
                      <span className="text-xs text-slate-500 block">Khu vực địa lý:</span>
                      <strong className="text-slate-800">{koc.location || 'Hà Nội / Miền Bắc'}</strong>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">Thời gian giao mẫu dự kiến:</span>
                      <span className="text-slate-700">1 - 2 Ngày làm việc</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Channels */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-600" />
                  <span>Kênh Liên Lạc &amp; Booking PIC Nội Bộ</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 block">Số điện thoại:</span>
                    <span className="font-semibold text-slate-900 font-mono text-xs block mt-0.5">{koc.phone}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 block">Zalo làm việc:</span>
                    <span className="font-semibold text-blue-700 font-mono text-xs block mt-0.5">{koc.zalo}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 block">Email báo giá:</span>
                    <span className="font-semibold text-slate-800 font-mono text-xs block mt-0.5 truncate">
                      {koc.email || `${koc.channelId.replace('@', '')}@creator.vn`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LEGAL & PAYMENT & PAST DEALS */}
          {activeTab === 'CONTRACT_HISTORY' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Thông Tin Pháp Lý &amp; Tài Khoản Nhận Thanh Toán</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-xs text-slate-500 block">Họ &amp; Tên Thật (Trên CCCD):</span>
                    <span className="font-semibold text-slate-900 mt-0.5 block">{koc.realName}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-xs text-slate-500 block">Số CCCD / hộ chiếu:</span>
                    <span className="font-semibold text-slate-900 mt-0.5 block font-mono">{koc.cccd}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 sm:col-span-2">
                    <span className="text-xs text-slate-500 block">Tài khoản ngân hàng KOC:</span>
                    <span className="font-semibold text-emerald-700 mt-0.5 block font-mono text-xs">
                      {koc.bankAccount} — Ngân Hàng {koc.bankName} ({koc.realName.toUpperCase()})
                    </span>
                  </div>
                </div>
              </div>

              {/* Past Deals Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-semibold text-xs text-slate-900">
                  Lịch sử các deal đã thực hiện tại Upbase
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 text-2xs font-semibold">
                        <th className="p-2.5 pl-4">Thương Hiệu &amp; SP</th>
                        <th className="p-2.5">Chiến dịch</th>
                        <th className="p-2.5">Phê duyệt</th>
                        <th className="p-2.5">Doanh Số (GMV)</th>
                        <th className="p-2.5 pr-4 text-right">Hiệu quả</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pastBookingDeals.map((deal, idx) => (
                        <tr key={idx} className="border-t border-slate-200 hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 pl-4">
                            <strong className="text-slate-900 block">{deal.brandName}</strong>
                            <span className="text-2xs text-slate-500">{deal.productName}</span>
                          </td>
                          <td className="p-2.5">
                            <span className="text-slate-800">{deal.campaign}</span>
                            <div className="text-2xs text-slate-400 font-mono">{deal.date}</div>
                          </td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded text-2xs font-semibold ${
                              deal.brandApprovalStatus === 'ĐÃ_DUYỆT' ? 'badge-emerald' : 'badge-slate'
                            }`}>
                              {deal.brandApprovalStatus === 'ĐÃ_DUYỆT' ? '✓ Đã Duyệt' : '✕ Từ Chối'}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono">
                            <strong className="text-emerald-700 block">{deal.gmv30.toLocaleString('vi-VN')} đ</strong>
                            <span className="text-2xs text-slate-400">Phí: {deal.cost.toLocaleString('vi-VN')} đ</span>
                          </td>
                          <td className="p-2.5 pr-4 text-right">
                            <span className="font-semibold text-xs text-blue-700">ROI {deal.roi.toFixed(1)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg transition shadow-2xs"
          >
            Đóng hồ sơ
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenQuickBook(koc);
            }}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs transition flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 fill-white" />
            <span>Khởi tạo booking với KOC này</span>
          </button>
        </div>
      </div>
    </div>
  );
};
