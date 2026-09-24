'use client';

import React, { useState } from 'react';
import { X, Zap, Sparkles, CheckCircle, Calendar, DollarSign, UserCheck } from 'lucide-react';
import { KocItem } from '../lib/types';
import { INITIAL_KOCS } from '../lib/mockData';

interface QuickBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDealCreated: (deal: any) => void;
  preselectedKoc?: KocItem | null;
  preselectedBrand?: string | null;
}

export const QuickBookModal: React.FC<QuickBookModalProps> = ({
  isOpen,
  onClose,
  onDealCreated,
  preselectedKoc,
  preselectedBrand,
}) => {
  const [selectedKocId, setSelectedKocId] = useState<string>(preselectedKoc?.id || INITIAL_KOCS[0].id);
  const [campaign, setCampaign] = useState<string>('CAMP-1010');
  const [brandName, setBrandName] = useState<string>(preselectedBrand || 'Kutieskin Mama');
  const [productName, setProductName] = useState<string>('Kem bôi dịu da & Nước tắm thảo dược');
  const [bookingBatch, setBookingBatch] = useState<string>('Đợt 1');
  const [bookingFormat, setBookingFormat] = useState<'Booking Video KOC' | 'Booking Livestream KOC' | 'Affiliate Thuần'>('Booking Video KOC');
  const [contentNote, setContentNote] = useState<string>('');
  const [rate, setRate] = useState<number>(preselectedKoc?.rateCardVideo || 10000000);
  const [deadline, setDeadline] = useState<string>('2026-10-06');
  const [advanceType, setAdvanceType] = useState<'FIXED_2M' | 'PERCENT_20'>('FIXED_2M');

  if (!isOpen) return null;

  const currentKoc = INITIAL_KOCS.find(k => k.id === selectedKocId) || preselectedKoc || INITIAL_KOCS[0];
  const advanceAmount = advanceType === 'FIXED_2M' ? Math.min(2000000, rate) : Math.round(rate * 0.2);
  const finalAmount = Math.max(0, rate - advanceAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dealCode = `BO26_${currentKoc.stageName.toUpperCase().replace(/\s+/g, '')}_${Math.floor(1000 + Math.random() * 9000)}`;
    const jobId = `ID26${Math.floor(10000000 + Math.random() * 90000000)}`;
    
    const newDeal = {
      id: `deal-${Date.now()}`,
      dealCode,
      jobId,
      campaignCode: campaign,
      campaignTitle: campaign === 'CAMP-1010' ? 'Mega Sale 10.10 — Kháng Nắng Đa Tầng' : 'Thu Đông Rạng Rỡ — Dược Mỹ Phẩm Phục Hồi',
      brandName: brandName,
      storeName: `${brandName.replace(/\s+/g, '')}_TikTok_E2E-C`,
      productName: productName.trim() || 'Sản phẩm chủ lực chiến dịch',
      bookingBatch: bookingBatch,
      bookingFormat: bookingFormat,
      kocId: currentKoc.id,
      kocStageName: currentKoc.stageName,
      kocChannelId: currentKoc.channelId,
      kocTier: currentKoc.tier,
      salaryGrade: currentKoc.salaryGrade || 'KL5',
      segment: currentKoc.segment || 'Mid Creator',
      tepKenh: currentKoc.tepKenh || currentKoc.creatorCategory || 'Review Nữ',
      creatorCategory: currentKoc.tepKenh || currentKoc.creatorCategory || 'Review Nữ',
      kocCategory: currentKoc.kocCategory || 'Personal care',
      contentPillar: 'Review trực tiếp' as const,
      
      // Phê duyệt Brand theo Job cụ thể này
      brandApprovalStatus: 'CHỜ_DUYỆT' as const,
      kocResponseStatus: 'ĐỒNG_Ý' as const,
      
      // Pipeline vận hành của Job
      pipelineText: 'Chờ Brand duyệt',
      status: 'SCRIPT_PENDING' as const,
      statusLabel: 'Đã List KOC (Chờ Brand Duyệt Danh Sách)',
      sampleStatus: 'CHƯA_GỬI' as const,
      adsCodeStatus: 'CHƯA_CẤP' as const,
      
      assignedStaff: 'Khánh Vy',
      bookingPic: 'Khánh Vy',
      growthPic: 'Nguyễn Văn Tú',
      accountPic: 'Trần Việt Hoàng',
      contentNote: contentNote.trim() || 'Đề xuất kịch bản review thực tế, nhấn mạnh USP sản phẩm và gắn link giỏ hàng.',
      
      totalValue: rate,
      advanceAmount,
      finalAmount,
      deadlinePost: deadline,
      viewsCount: 0,
      affiliateGmv: 0,
      gmv30: 0,
      roi: 0,
      publishedDays: 0,
      hasGmv: false,
      isBreakEven: false,
      isWinnerTop20: currentKoc.isWinnerTop20 || false,
      remainingSlaHours: 24.0,
      isSlaWarning: false
    };

    onDealCreated(newDeal);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#101726] border border-[#1e293b] rounded-lg w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b] bg-[#0c121e]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
              <Zap className="w-4 h-4 text-blue-400 fill-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Tạo Booking Deal Mới</h3>
              <p className="text-xs text-slate-400">Khởi tạo hợp đồng, phân bổ ngân sách và kích hoạt quy trình SLA</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Field 1: Campaign & Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                1. Chiến Dịch Áp Dụng
              </label>
              <select
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
                className="w-full bg-[#172238] border border-[#1e293b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition"
              >
                <option value="CAMP-1010">Mega Sale 10.10 — Kháng Nắng Đa Tầng</option>
                <option value="CAMP-GLOW">Thu Đông Rạng Rỡ — Dược Mỹ Phẩm</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                2. Cụm Gian Hàng / Brand
              </label>
              <select
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full bg-[#172238] border border-[#1e293b] rounded-xl px-3 py-2 text-xs text-cyan-300 font-bold focus:outline-none focus:border-blue-500 transition"
              >
                <option value="Kutieskin Mama">Kutieskin Mama</option>
                <option value="Royal Ausnz">Royal Ausnz</option>
                <option value="Nature's Way">Nature's Way</option>
                <option value="Bye Bye Blemish">Bye Bye Blemish</option>
                <option value="pHCare">pHCare</option>
                <option value="Babe">Babe</option>
                <option value="Keyshu">Keyshu</option>
                <option value="EUPC">EUPC</option>
              </select>
            </div>
          </div>

          {/* Field 2: Product & Batch & Format */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                3. Sản Phẩm Cần Lên Bài / Gửi Mẫu:
              </label>
              <input
                type="text"
                placeholder="VD: Kem bôi dịu da & Nước tắm thảo dược"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full bg-[#172238] border border-[#1e293b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Đợt Booking:
              </label>
              <select
                value={bookingBatch}
                onChange={(e) => setBookingBatch(e.target.value)}
                className="w-full bg-[#172238] border border-[#1e293b] rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="Đợt 1">Đợt 1</option>
                <option value="Đợt 2">Đợt 2</option>
                <option value="Đợt 3">Đợt 3</option>
              </select>
            </div>
          </div>

          {/* Field 3: KOC Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              4. Chọn KOC (Từ Danh Bạ 5.700 KOCs Đã Đánh Index)
            </label>
            <select
              value={selectedKocId}
              onChange={(e) => {
                setSelectedKocId(e.target.value);
                const k = INITIAL_KOCS.find(item => item.id === e.target.value);
                if (k) setRate(k.rateCardVideo);
              }}
              className="w-full bg-[#172238] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition"
            >
              {INITIAL_KOCS.map(koc => (
                <option key={koc.id} value={koc.id}>
                  {koc.stageName} ({koc.tierLabel}) — Rate: {koc.rateCardVideo.toLocaleString('vi-VN')} đ • Follow: {koc.followers.toLocaleString('vi-VN')}
                </option>
              ))}
            </select>
            {currentKoc && (
              <div className="mt-2 p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-between text-xs text-blue-300">
                <span>👤 CCCD: <strong>{currentKoc.cccd}</strong></span>
                <span>🏦 <strong>{currentKoc.bankName}</strong>: {currentKoc.bankAccount}</span>
                <span className="text-emerald-400 font-semibold">★ {currentKoc.reliabilityScore}/10</span>
              </div>
            )}
          </div>

          {/* Field 3: Deal Value & Auto-Split Advance */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                3. Giá Deal & Chia Đợt Tạm Ứng
              </label>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setAdvanceType('FIXED_2M')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${advanceType === 'FIXED_2M' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                >
                  Cố định 2 Tr
                </button>
                <button
                  type="button"
                  onClick={() => setAdvanceType('PERCENT_20')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${advanceType === 'PERCENT_20' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                >
                  Tỷ lệ 20%
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Tổng Giá Trị (VNĐ)</span>
                <input
                  type="number"
                  value={rate}
                  step={500000}
                  onChange={(e) => setRate(Number(e.target.value))}
                  className="w-full bg-[#172238] border border-[#1e293b] rounded-xl px-3 py-2 text-sm text-white font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <span className="text-[11px] text-emerald-400 font-medium block mb-1">Đợt 1 (Tạm ứng)</span>
                <input
                  type="text"
                  value={advanceAmount.toLocaleString('vi-VN') + ' đ'}
                  readOnly
                  className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2 text-sm text-emerald-400 font-bold"
                />
              </div>
              <div>
                <span className="text-[11px] text-blue-400 font-medium block mb-1">Đợt 2 (Quyết toán)</span>
                <input
                  type="text"
                  value={finalAmount.toLocaleString('vi-VN') + ' đ'}
                  readOnly
                  className="w-full bg-blue-500/10 border border-blue-500/30 rounded-xl px-3 py-2 text-sm text-blue-400 font-bold"
                />
              </div>
            </div>
          </div>

          {/* Field 4: Post Deadline */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              4. Hạn Chót Nghiệm Thu Video Lên Sóng
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-[#172238] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2 text-sm"
            >
              <Zap className="w-4 h-4 fill-white" />
              Tạo Deal & Kích Hoạt Luồng SLA 3 Team
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
