'use client';

import React, { useState, useEffect } from 'react';
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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-book-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header - Enterprise Light Theme */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold shadow-2xs">
              <Zap className="w-5 h-5 text-blue-600 fill-blue-600" />
            </div>
            <div>
              <h3 id="quick-book-title" className="text-sm font-bold text-slate-900">
                Tạo Booking Deal Mới
              </h3>
              <p className="text-xs text-slate-500">Khởi tạo hợp đồng, phân bổ ngân sách và kích hoạt quy trình SLA</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            aria-label="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Field 1: Campaign & Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="qb-campaign" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                1. Chiến Dịch Áp Dụng
              </label>
              <select
                id="qb-campaign"
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition shadow-2xs"
              >
                <option value="CAMP-1010">Mega Sale 10.10 — Kháng Nắng Đa Tầng</option>
                <option value="CAMP-GLOW">Thu Đông Rạng Rỡ — Dược Mỹ Phẩm</option>
              </select>
            </div>

            <div>
              <label htmlFor="qb-brand" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                2. Cụm Gian Hàng / Brand
              </label>
              <select
                id="qb-brand"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-blue-700 font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition shadow-2xs"
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
              <label htmlFor="qb-product" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                3. Sản Phẩm / Mẫu:
              </label>
              <input
                id="qb-product"
                type="text"
                placeholder="VD: Kem bôi dịu da & Nước tắm thảo dược"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none shadow-2xs"
              />
            </div>

            <div>
              <label htmlFor="qb-batch" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Đợt Booking:
              </label>
              <select
                id="qb-batch"
                value={bookingBatch}
                onChange={(e) => setBookingBatch(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none shadow-2xs"
              >
                <option value="Đợt 1">Đợt 1</option>
                <option value="Đợt 2">Đợt 2</option>
                <option value="Đợt 3">Đợt 3</option>
              </select>
            </div>
          </div>

          {/* Field 3: KOC Selector */}
          <div>
            <label htmlFor="qb-koc" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              4. Chọn KOC (Từ Danh Bạ Index)
            </label>
            <select
              id="qb-koc"
              value={selectedKocId}
              onChange={(e) => {
                setSelectedKocId(e.target.value);
                const k = INITIAL_KOCS.find(item => item.id === e.target.value);
                if (k) setRate(k.rateCardVideo);
              }}
              className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition shadow-2xs"
            >
              {INITIAL_KOCS.map(koc => (
                <option key={koc.id} value={koc.id}>
                  {koc.stageName} ({koc.tierLabel}) — Rate: {koc.rateCardVideo.toLocaleString('vi-VN')} đ • Follow: {koc.followers.toLocaleString('vi-VN')}
                </option>
              ))}
            </select>
            {currentKoc && (
              <div className="mt-2 p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs text-blue-900">
                <span>👤 CCCD: <strong className="font-mono text-slate-800">{currentKoc.cccd}</strong></span>
                <span>🏦 <strong>{currentKoc.bankName}</strong>: <span className="font-mono text-slate-800">{currentKoc.bankAccount}</span></span>
                <span className="text-emerald-700 font-bold bg-emerald-100/60 px-2 py-0.5 rounded">★ {currentKoc.reliabilityScore}/10</span>
              </div>
            )}
          </div>

          {/* Field 4: Deal Value & Auto-Split Advance */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider">
                5. Giá Deal &amp; Chia Đợt Tạm Ứng
              </label>
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setAdvanceType('FIXED_2M')}
                  className={`px-2 py-1 rounded text-xs font-semibold transition ${advanceType === 'FIXED_2M' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-300'}`}
                >
                  Cố định 2 Tr
                </button>
                <button
                  type="button"
                  onClick={() => setAdvanceType('PERCENT_20')}
                  className={`px-2 py-1 rounded text-xs font-semibold transition ${advanceType === 'PERCENT_20' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-300'}`}
                >
                  Tỷ lệ 20%
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div>
                <span className="text-xs text-slate-600 font-medium block mb-1">Tổng Deal (VNĐ)</span>
                <input
                  type="number"
                  value={rate}
                  step={500000}
                  onChange={(e) => setRate(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <span className="text-xs text-emerald-700 font-medium block mb-1">Đợt 1 (Tạm ứng)</span>
                <input
                  type="text"
                  value={advanceAmount.toLocaleString('vi-VN') + ' đ'}
                  readOnly
                  className="w-full bg-emerald-50 border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs text-emerald-700 font-bold font-mono"
                />
              </div>
              <div>
                <span className="text-xs text-blue-700 font-medium block mb-1">Đợt 2 (Quyết toán)</span>
                <input
                  type="text"
                  value={finalAmount.toLocaleString('vi-VN') + ' đ'}
                  readOnly
                  className="w-full bg-blue-50 border border-blue-300 rounded-lg px-2.5 py-1.5 text-xs text-blue-700 font-bold font-mono"
                />
              </div>
            </div>
          </div>

          {/* Field 5: Post Deadline */}
          <div>
            <label htmlFor="qb-deadline" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              6. Hạn Chót Nghiệm Thu Video Lên Sóng
            </label>
            <input
              id="qb-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none shadow-2xs"
              required
            />
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-xs transition flex items-center justify-center gap-2 text-xs"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Tạo Deal &amp; Kích Hoạt Luồng SLA 3 Team</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
