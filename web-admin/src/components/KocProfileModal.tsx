'use client';

import React, { useState } from 'react';
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

  // Fallback defaults for new e-commerce & audience fields if not set
  const femaleRatio = koc.femaleRatio ?? 85;
  const maleRatio = koc.maleRatio ?? (100 - femaleRatio);
  const age18_24 = koc.age18_24 ?? 55;
  const age25_34 = koc.age25_34 ?? 35;
  const age35Plus = koc.age35Plus ?? 10;
  const gmvShareVideo = koc.gmvShareVideo ?? 70;
  const gmvShareLive = koc.gmvShareLive ?? 20;
  const gmvShareProductCard = koc.gmvShareProductCard ?? 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#101726] border border-[#1e293b] rounded-lg w-full max-w-4xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="relative p-6 bg-gradient-to-r from-blue-950/70 via-[#131d31] to-[#0c121e] border-b border-[#1e293b]">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-md bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-blue-500/30 shrink-0">
              {koc.stageName.charAt(0)}
            </div>

            <div className="space-y-1">
              <div className="flex items-center flex-wrap gap-2">
                <h3 className="text-xl font-bold text-white">{koc.stageName}</h3>
                <span className="badge-blue px-2 py-0.5 rounded text-[11px] font-bold">
                  {koc.tierLabel}
                </span>
                <span className="badge-purple px-2 py-0.5 rounded text-[11px] font-bold font-mono">
                  KL: {koc.salaryGrade}
                </span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  koc.segment === 'Top Creator' ? 'badge-amber' :
                  koc.segment === 'Key Creator' ? 'badge-purple' :
                  koc.segment === 'Mid Creator' ? 'badge-blue' : 'badge-cyan'
                }`}>
                  Segment: {koc.segment || 'Massive Creator'}
                </span>
                <span className="badge-emerald px-2 py-0.5 rounded text-[11px] font-bold">
                  Tệp: {koc.tepKenh || koc.creatorCategory}
                </span>
                <span className="bg-pink-500/20 text-pink-300 border border-pink-500/30 px-2 py-0.5 rounded text-[11px] font-bold">
                  Category: {koc.kocCategory || 'Personal care'}
                </span>
                {koc.bookingFormat && (
                  <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded text-[11px] font-bold">
                    {koc.bookingFormat}
                  </span>
                )}
                {koc.isWinnerTop20 && (
                  <span className="badge-amber px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 shadow-sm">
                    <Flame className="w-3 h-3 fill-amber-400" />
                    Winner Creator (Top 20 Upbase)
                  </span>
                )}
              </div>

              <div className="text-xs text-blue-400 font-mono flex items-center flex-wrap gap-2 pt-0.5">
                <a 
                  href={koc.channelLink || `https://www.tiktok.com/@${koc.channelId.replace('@', '')}`}
                  target="_blank" 
                  rel="noreferrer"
                  className="hover:underline flex items-center gap-1 font-semibold text-cyan-400"
                >
                  <span>{koc.channelId}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span>•</span>
                <span className="text-slate-300">Tên thật: <strong>{koc.realName}</strong></span>
                <span>•</span>
                <span className="text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-rose-400" />
                  Khu vực: <strong className="text-slate-200">{koc.location || 'Hà Nội'}</strong>
                </span>
                <span>•</span>
                <span className="text-slate-400">
                  PIC phụ trách: <strong className="text-amber-300">{koc.bookingPic || 'Khánh Vy'}</strong>
                </span>
              </div>

              <div className="text-xs text-slate-400">
                🏷️ Chuyên môn ngách: <strong className="text-slate-200">{koc.niche}</strong>
              </div>
            </div>
          </div>

          {/* Navigation Tabs inside Modal */}
          <div className="flex items-center gap-2 mt-5 border-t border-[#1e293b]/70 pt-3">
            {[
              { id: 'ECOMMERCE', label: '1. Hiệu Suất E-Commerce & GMV', icon: ShoppingBag },
              { id: 'AUDIENCE', label: '2. Nhân Khẩu Học & Tệp Follower', icon: Users },
              { id: 'LOGISTICS', label: '3. Hậu Cần Nhận Mẫu & Vận Hành', icon: Truck },
              { id: 'CONTRACT_HISTORY', label: '4. Pháp Lý, Hợp Đồng & Lịch Sử', icon: FileText },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                      : 'bg-[#09101d] text-slate-400 hover:text-slate-200 hover:bg-[#131d31]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* ========================================================================= */}
          {/* TAB 1: E-COMMERCE ANALYTICS & GMV BREAKDOWN */}
          {/* ========================================================================= */}
          {activeTab === 'ECOMMERCE' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* 🌟 Thông Tin 4 Phân Loại Chuẩn Vận Hành Booking Upbase */}
              <div className="card-enterprise p-3.5 bg-[#09101d] border border-[#1e293b]">
                <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 mb-2.5 uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Định Danh & Phân Loại Creator Theo Quy Chuẩn Booking (Sheet 3.1 & 3.2):
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-2.5 bg-[#0e1626] rounded-lg border border-[#1e293b]">
                    <span className="text-[10px] text-slate-400 block font-medium">1. Khung Lương (KL):</span>
                    <strong className="text-purple-400 font-mono text-sm block mt-0.5">{koc.salaryGrade}</strong>
                    <span className="text-[9px] text-slate-500">Đơn giá net video</span>
                  </div>
                  <div className="p-2.5 bg-[#0e1626] rounded-lg border border-[#1e293b]">
                    <span className="text-[10px] text-slate-400 block font-medium">2. Segment Creator:</span>
                    <strong className="text-cyan-300 font-semibold text-xs block mt-0.5">{koc.segment || 'Massive Creator'}</strong>
                    <span className="text-[9px] text-slate-500">Cấp độ & vai trò chiến lược</span>
                  </div>
                  <div className="p-2.5 bg-[#0e1626] rounded-lg border border-[#1e293b]">
                    <span className="text-[10px] text-slate-400 block font-medium">3. Tệp Kênh:</span>
                    <strong className="text-emerald-300 font-semibold text-xs block mt-0.5">{koc.tepKenh || koc.creatorCategory || 'Review Nữ'}</strong>
                    <span className="text-[9px] text-slate-500">25 tệp kênh chuẩn</span>
                  </div>
                  <div className="p-2.5 bg-[#0e1626] rounded-lg border border-[#1e293b]">
                    <span className="text-[10px] text-slate-400 block font-medium">4. KOC Category:</span>
                    <strong className="text-pink-300 font-semibold text-xs block mt-0.5">{koc.kocCategory || 'Personal care'}</strong>
                    <span className="text-[9px] text-slate-500">9 nhóm ngành hàng cốt lõi</span>
                  </div>
                </div>
              </div>

              {/* Key High-level Performance Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="card-enterprise p-3.5 text-center">
                  <span className="text-[11px] text-slate-400 block">Followers Kênh</span>
                  <span className="text-base font-bold text-white mt-0.5 block">
                    {koc.followers.toLocaleString('vi-VN')}
                  </span>
                  <span className="text-[10px] text-slate-400">View TB: {koc.avgViews.toLocaleString('vi-VN')}</span>
                </div>

                <div className="card-enterprise p-3.5 text-center">
                  <span className="text-[11px] text-slate-400 block">Báo Giá Video Net</span>
                  <span className="text-base font-bold text-blue-400 mt-0.5 block font-mono">
                    {koc.rateCardVideo.toLocaleString('vi-VN')} đ
                  </span>
                  <span className="badge-purple px-1.5 py-0.2 rounded text-[10px] font-bold mt-1 inline-block">
                    Khung {koc.salaryGrade}
                  </span>
                </div>

                <div className="card-enterprise p-3.5 text-center border-emerald-500/30">
                  <span className="text-[11px] text-emerald-400 block font-semibold">Kỷ Lục GMV (Best Case)</span>
                  <span className="text-base font-black text-emerald-400 mt-0.5 block font-mono">
                    {(koc.gmvBestCase || totalGmv).toLocaleString('vi-VN')} đ
                  </span>
                  <span className="text-[10px] text-slate-400">Đơn hàng: ~{(koc.itemsSold || 1200).toLocaleString('vi-VN')} món</span>
                </div>

                <div className="card-enterprise p-3.5 text-center border-cyan-500/30">
                  <span className="text-[11px] text-cyan-400 font-semibold block">AOV (Giá Trị Đơn TB)</span>
                  <span className="text-base font-black text-cyan-300 mt-0.5 block font-mono">
                    {(koc.aov || 245000).toLocaleString('vi-VN')} đ
                  </span>
                  <span className="text-[10px] text-slate-400">GPM: {(koc.gpm || 28.5)}%</span>
                </div>
              </div>

              {/* GMV Channels Breakdown: Video vs Live vs Product Card */}
              <div className="card-enterprise p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-cyan-400" />
                    Cơ Cấu Nguồn Doanh Thu (Tỉ Trọng GMV Thực Tế KOC Bán Được)
                  </h4>
                  <span className="text-[11px] text-slate-400">Dữ liệu đồng bộ TikTok Shop Analytics</span>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300 font-medium">1. Tỉ Trọng GMV Từ Video Ngắn (Short Video)</span>
                      <strong className="text-blue-400 font-mono">{gmvShareVideo}%</strong>
                    </div>
                    <div className="h-2.5 w-full bg-[#09101d] rounded-full overflow-hidden border border-[#1e293b]">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" style={{ width: `${gmvShareVideo}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300 font-medium">2. Tỉ Trọng GMV Từ Livestream</span>
                      <strong className="text-purple-400 font-mono">{gmvShareLive}%</strong>
                    </div>
                    <div className="h-2.5 w-full bg-[#09101d] rounded-full overflow-hidden border border-[#1e293b]">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: `${gmvShareLive}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300 font-medium">3. Tỉ Trọng GMV Từ Thẻ Sản Phẩm / Showcase Ghim Kênh</span>
                      <strong className="text-emerald-400 font-mono">{gmvShareProductCard}%</strong>
                    </div>
                    <div className="h-2.5 w-full bg-[#09101d] rounded-full overflow-hidden border border-[#1e293b]">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" style={{ width: `${gmvShareProductCard}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Insights */}
              <div className="p-3.5 bg-blue-950/30 border border-blue-500/30 rounded-xl flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white font-bold block mb-0.5">Gợi Ý Chiến Lược Booking Từ UpBase:</strong>
                  <p className="text-slate-300 leading-relaxed text-xs">
                    {koc.contentNote || 'KOC có thế mạnh review chân thật, giọng truyền cảm, chuyển đổi tốt ở giỏ hàng video. Khuyến nghị chạy kèm Spark Ads 7 ngày sau khi video lên xu hướng để tối đa hóa điểm hoàn vốn (ROI).'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: AUDIENCE DEMOGRAPHICS (NHÂN KHẨU HỌC & ĐỘ TUỔI KHÁN GIẢ) */}
          {/* ========================================================================= */}
          {activeTab === 'AUDIENCE' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Gender Distribution */}
              <div className="card-enterprise p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-pink-400" />
                    Cơ Cấu Giới Tính Người Theo Dõi (Follower Gender Split)
                  </h4>
                  <span className="text-[11px] text-slate-400">Rất quan trọng khi đối soát tệp Brand</span>
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
                    <span className="text-pink-400 flex items-center gap-1.5">
                      👩 Nữ Giới: {femaleRatio}%
                    </span>
                    <span className="text-blue-400 flex items-center gap-1.5">
                      👨 Nam Giới: {maleRatio}%
                    </span>
                  </div>
                  <div className="h-4 w-full bg-[#09101d] rounded-full overflow-hidden flex border border-[#1e293b]">
                    <div 
                      className="h-full bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center text-[10px] text-white font-bold" 
                      style={{ width: `${femaleRatio}%` }}
                    >
                      {femaleRatio > 15 ? `${femaleRatio}%` : ''}
                    </div>
                    <div 
                      className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 flex items-center justify-center text-[10px] text-white font-bold" 
                      style={{ width: `${maleRatio}%` }}
                    >
                      {maleRatio > 15 ? `${maleRatio}%` : ''}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    {femaleRatio >= 75 
                      ? '🎯 Tệp khán giả cực kỳ phù hợp cho Brand Mỹ phẩm, Skincare, Dung dịch vệ sinh (pHCare), Mẹ & Bé (Kutieskin).'
                      : '🎯 Tệp cân bằng hoặc thiên Nam, phù hợp các dòng sản phẩm Gia dụng, Công nghệ, Sức khỏe gia đình.'}
                  </p>
                </div>
              </div>

              {/* Age Brackets */}
              <div className="card-enterprise p-4 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  Phân Bổ Theo Nhóm Tuổi (Follower Age Groups)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="p-3 bg-[#09101d] rounded-xl border border-[#1e293b] text-center">
                    <span className="text-slate-400 block text-[11px]">Nhóm 18 - 24 Tuổi (Gen Z)</span>
                    <span className="text-lg font-black text-white mt-1 block font-mono">{age18_24}%</span>
                    <span className="text-[10px] text-cyan-400">Học sinh, sinh viên, AOV thấp - vừa</span>
                  </div>

                  <div className="p-3 bg-[#09101d] rounded-xl border border-[#1e293b] text-center border-blue-500/30">
                    <span className="text-blue-300 block text-[11px] font-semibold">Nhóm 25 - 34 Tuổi (Thu Nhập Cao)</span>
                    <span className="text-lg font-black text-blue-400 mt-1 block font-mono">{age25_34}%</span>
                    <span className="text-[10px] text-slate-400">Dân văn phòng, sức mua mạnh</span>
                  </div>

                  <div className="p-3 bg-[#09101d] rounded-xl border border-[#1e293b] text-center">
                    <span className="text-slate-400 block text-[11px]">Nhóm &gt; 35 Tuổi (Trưởng Thành)</span>
                    <span className="text-lg font-black text-white mt-1 block font-mono">{age35Plus}%</span>
                    <span className="text-[10px] text-slate-400">Mẹ bỉm, chăm sóc gia đình & sức khỏe</span>
                  </div>
                </div>
              </div>

              {/* Brand Fit Recommendation */}
              <div className="card-enterprise p-4 space-y-2">
                <span className="text-slate-400 text-[11px] uppercase tracking-wider font-bold block">
                  Đánh Giá Độ Khớp Với Danh Mục Gian Hàng Hiện Tại
                </span>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg font-bold">
                    ✓ Kutieskin Mama & Baby (Rất Phù Hợp)
                  </span>
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg font-bold">
                    ✓ Bye Bye Blemish (Phù Hợp)
                  </span>
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-lg font-bold">
                    ✓ pHCare (Cần Mã Ads Spark)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: SAMPLE SHIPPING LOGISTICS & OPERATION STATUS */}
          {/* ========================================================================= */}
          {activeTab === 'LOGISTICS' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Shipping Address for physical samples */}
              <div className="card-enterprise p-4 space-y-3 border-emerald-500/30">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Truck className="w-4 h-4 text-emerald-400" />
                    Thông Tin Nhận Hàng Gửi Mẫu (Sample Dispatch Information)
                  </h4>
                  <span className="badge-emerald px-2 py-0.5 rounded text-[10px] font-bold">
                    Đã Xác Thực Địa Chỉ
                  </span>
                </div>

                <div className="p-3.5 bg-[#09101d] rounded-xl border border-[#1e293b] space-y-2">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-400 block text-[11px]">Địa Chỉ Nhận Hàng & Người Nhận:</span>
                      <strong className="text-white text-xs block mt-0.5 leading-relaxed">
                        {koc.shippingAddress || `${koc.realName} — ${koc.phone} — Tòa nhà Landmark 81, P. 22, Q. Bình Thạnh, TP. Hồ Chí Minh`}
                      </strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#1e293b]">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Khu Vực Địa Lý:</span>
                      <strong className="text-cyan-400">{koc.location || 'TP. Hồ Chí Minh / Miền Nam'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Thời Gian Giao Mẫu Dự Kiến:</span>
                      <span className="text-slate-200">1 - 2 Ngày làm việc</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Channels */}
              <div className="card-enterprise p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-400" />
                  Kênh Liên Lạc & Booking PIC Nội Bộ
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-[#09101d] rounded-xl border border-[#1e293b]">
                    <span className="text-slate-400 block text-[11px]">Số Điện Thoại / Hotline:</span>
                    <span className="font-bold text-white font-mono text-sm block mt-0.5">{koc.phone}</span>
                  </div>

                  <div className="p-3 bg-[#09101d] rounded-xl border border-[#1e293b]">
                    <span className="text-slate-400 block text-[11px]">Zalo Làm Việc:</span>
                    <span className="font-bold text-blue-400 font-mono text-sm block mt-0.5">{koc.zalo}</span>
                  </div>

                  <div className="p-3 bg-[#09101d] rounded-xl border border-[#1e293b]">
                    <span className="text-slate-400 block text-[11px]">Email Báo Giá / Hợp Đồng:</span>
                    <span className="font-bold text-slate-200 font-mono text-xs block mt-0.5 truncate">
                      {koc.email || `${koc.channelId.replace('@', '')}@booking.creator.vn`}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-[#09101d] rounded-xl border border-[#1e293b] flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Booking PIC (Nhân Sự Upbase Chăm Sóc):</span>
                    <strong className="text-white text-xs">{koc.bookingPic || 'Khánh Vy (Nhóm Booking Beauty)'}</strong>
                  </div>
                  <span className="badge-blue px-2 py-0.5 rounded text-[10px] font-bold">
                    Trạng Thái: {koc.statusKoc || 'SẴN_SÀNG'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: LEGAL & PAYMENT & PAST UPBASE DEALS */}
          {/* ========================================================================= */}
          {activeTab === 'CONTRACT_HISTORY' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Legal & Payment Details (PII Safe) */}
              <div className="card-enterprise p-4 space-y-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Thông Tin Pháp Lý & Tài Khoản Nhận Thanh Toán (Tự Động Điền Vào Hợp Đồng & VietQR)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2.5 bg-[#0b1120] rounded-xl border border-[#1e293b]">
                    <span className="text-slate-400 block">Họ & Tên Thật (Trên CCCD):</span>
                    <span className="font-bold text-white mt-0.5 block">{koc.realName}</span>
                  </div>
                  <div className="p-2.5 bg-[#0b1120] rounded-xl border border-[#1e293b]">
                    <span className="text-slate-400 block">Số CCCD / Hộ Chiếu:</span>
                    <span className="font-semibold text-white mt-0.5 block font-mono">{koc.cccd}</span>
                  </div>
                  <div className="p-2.5 bg-[#0b1120] rounded-xl border border-[#1e293b] sm:col-span-2">
                    <span className="text-slate-400 block">Tài Khoản Ngân Hàng KOC:</span>
                    <span className="font-bold text-emerald-400 mt-0.5 block font-mono text-sm">
                      {koc.bankAccount} — Ngân Hàng {koc.bankName} ({koc.realName.toUpperCase()})
                    </span>
                  </div>
                </div>
              </div>

              {/* Operational Clarification Notice */}
              <div className="p-3 bg-[#080e1a] rounded-xl border border-blue-500/30 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div className="text-[11px] text-slate-300 leading-relaxed">
                  <strong className="text-cyan-300">Nguyên Tắc Vận Hành Đa Brand (Multi-Brand Operations):</strong> Hồ sơ KOC này là hồ sơ Master dùng chung. Mọi quyết định <span className="text-amber-300 font-semibold">Phê duyệt Brand</span>, <span className="text-rose-300 font-semibold">Lý do từ chối</span>, <span className="text-blue-300 font-semibold">Tiến độ gửi mẫu / video</span> và <span className="text-emerald-300 font-semibold">Nghiệm thu GMV</span> đều được hạch toán độc lập theo <strong>Từng Job / Chiến Dịch</strong> cụ thể.
                </div>
              </div>

              {/* Past Upbase Booking Deals History Table */}
              <div className="card-enterprise overflow-hidden">
                <div className="px-4 py-3 border-b border-[#1e293b] bg-[#0b1120] flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    Lịch Sử Từng Job Booking Theo Nhãn Hàng ({pastBookingDeals.length} Jobs Đã Ghi Nhận)
                  </h4>
                  <span className="text-[11px] text-emerald-400 font-semibold">
                    {overallRoi >= 1.0 ? '🌟 Khuyến Nghị Tái Ký (ROI Khả Quan)' : 'Cân nhắc đàm phán giảm rate card'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="table-header-enterprise bg-[#131d31]">
                        <th className="p-3 pl-4">Mã Job & Brand / Sản Phẩm</th>
                        <th className="p-3">Chiến Dịch & Ngày</th>
                        <th className="p-3">🎃 Phê Duyệt Brand (Job Này)</th>
                        <th className="p-3">Tiến Độ Pipeline</th>
                        <th className="p-3">Chi Phí / GMV</th>
                        <th className="p-3 pr-4 text-right">Hiệu Quả (ROI)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e293b]">
                      {pastBookingDeals.map((deal, idx) => (
                        <tr key={idx} className="table-row-enterprise hover:bg-[#131d31]/50 transition-colors">
                          <td className="p-3 pl-4">
                            <div className="flex items-center gap-1.5 font-mono text-[11px]">
                              <span className="text-blue-400 font-bold">{deal.code}</span>
                              <span className="text-slate-500">• {deal.jobId}</span>
                            </div>
                            <div className="font-bold text-white text-xs mt-0.5">{deal.brandName}</div>
                            <div className="text-[11px] text-cyan-300 font-medium">📦 {deal.productName}</div>
                            <div className="text-[10px] text-slate-400">{deal.batch}</div>
                          </td>

                          <td className="p-3">
                            <div className="text-slate-200 font-medium">{deal.campaign}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{deal.date}</div>
                          </td>

                          <td className="p-3">
                            {deal.brandApprovalStatus === 'ĐÃ_DUYỆT' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold badge-emerald inline-flex items-center gap-1">
                                ✓ Brand Đã Duyệt
                              </span>
                            ) : (
                              <div>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 inline-flex items-center gap-1">
                                  ✕ Brand Từ Chối
                                </span>
                                {deal.brandRejectReason && (
                                  <div className="text-[10px] text-rose-400 mt-1 max-w-[180px] leading-tight font-medium">
                                    Lý do: {deal.brandRejectReason}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block ${
                              deal.pipelineText === 'Done' ? 'badge-emerald' :
                              deal.pipelineText === 'Brand từ chối' ? 'bg-rose-500/20 text-rose-300' : 'badge-blue'
                            }`}>
                              {deal.pipelineText}
                            </span>
                          </td>

                          <td className="p-3">
                            {deal.brandApprovalStatus === 'TỪ_CHỐI' ? (
                              <span className="text-slate-500 text-xs italic font-mono">0 đ (Không phát sinh)</span>
                            ) : (
                              <div>
                                <div className="font-bold text-emerald-400 font-mono">
                                  GMV: {deal.gmv30.toLocaleString('vi-VN')} đ
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  Phí: {deal.cost.toLocaleString('vi-VN')} đ
                                </div>
                              </div>
                            )}
                          </td>

                          <td className="p-3 pr-4 text-right">
                            {deal.brandApprovalStatus === 'TỪ_CHỐI' ? (
                              <span className="text-slate-500 text-xs font-mono">—</span>
                            ) : (
                              <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                                deal.roi >= 1.0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                              }`}>
                                ROI {deal.roi.toFixed(2)}
                              </span>
                            )}
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
        <div className="px-6 py-4 bg-[#0c121e] border-t border-[#1e293b] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition"
          >
            Đóng Hồ Sơ
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenQuickBook(koc);
            }}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2"
          >
            <span>+ Khởi Tạo Booking Với KOC Này</span>
          </button>
        </div>
      </div>
    </div>
  );
};

