'use client';

import React, { useState, useEffect } from 'react';
import { X, Target, Sparkles, Send, Calendar, DollarSign, Users, Tag, AlertCircle } from 'lucide-react';
import { CampaignItem } from '../lib/types';

interface CampaignCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCampaignCreated: (campaign: CampaignItem) => void;
}

export const CampaignCreateModal: React.FC<CampaignCreateModalProps> = ({
  isOpen,
  onClose,
  onCampaignCreated,
}) => {
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [brand, setBrand] = useState('Senka');
  const [targetAudience, setTargetAudience] = useState('');
  const [bigIdea, setBigIdea] = useState('');
  const [keyMessage, setKeyMessage] = useState('');
  const [heroSkusInput, setHeroSkusInput] = useState('');
  const [targetCir, setTargetCir] = useState(18.0);
  const [contentPic, setContentPic] = useState('Quỳnh Như (Content Lead)');
  const [budget, setBudget] = useState(150000000);
  const [targetGmv, setTargetGmv] = useState(1000000000);
  const [targetKocCount, setTargetKocCount] = useState(25);
  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState('2026-10-31');

  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Parse hero SKUs
    const parsedSkus = heroSkusInput
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const newCampaign: CampaignItem = {
      id: `camp-${Date.now()}`,
      code: code || `CAMP-${Math.floor(1000 + Math.random() * 9000)}`,
      title,
      brand,
      targetAudience: targetAudience || 'Khách hàng mục tiêu TikTok Shop & Shopee Mall',
      bigIdea: bigIdea || 'Chiến dịch bùng nổ doanh số quý 4',
      keyMessage: keyMessage || undefined,
      heroSkus: parsedSkus.length > 0 ? parsedSkus : undefined,
      targetCir,
      contentPic,
      handoffAt: new Date().toISOString(),
      handoffSlaHours: 24,
      budget,
      spentBudget: 0,
      targetGmv,
      currentGmv: 0,
      targetKocCount,
      bookedKocCount: 0,
      status: 'ACTIVE',
      briefStatus: 'HANDED_OFF_TO_CONTENT',
      startDate,
      endDate
    };

    onCampaignCreated(newCampaign);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-label="Tạo Chiến Dịch & Soạn Thảo Brief"
        className="bg-white border border-slate-200 rounded-xl w-full max-w-xl shadow-2xl overflow-hidden my-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Target className="w-4 h-4 text-blue-700" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Tạo Chiến Dịch &amp; Soạn Thảo Brief</h3>
              <p className="text-xs text-slate-500">Brand Team xác lập mục tiêu &amp; chuyển giao sang Content Studio SLA 24h</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng modal"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Campaign Title & Code */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Tên Chiến Dịch *
              </label>
              <input
                type="text"
                placeholder="VD: Mega Sale 11.11 — Cứu Rỗi Làn Da Dầu Mụn"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Mã Code *
              </label>
              <input
                type="text"
                placeholder="CAMP-1111"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                required
              />
            </div>
          </div>

          {/* Brand & Content PIC */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Brand / Nhãn Hàng *
              </label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              >
                <option value="Senka">Senka (Chăm sóc da Nhật Bản)</option>
                <option value="Kutieskin">Kutieskin (Mẹ & Bé Hữu Cơ)</option>
                <option value="Nature's Way">Nature&apos;s Way (Vitamin Trẻ Em Úc)</option>
                <option value="Babe">Babe (Dược Mỹ Phẩm Tây Ban Nha)</option>
                <option value="Bio-Essence">Bio-Essence (Vàng 24K Chống Lão Hóa)</option>
                <option value="pHCare">pHCare (Dung Dịch Phụ Nữ)</option>
                <option value="Cure Natural">Cure Natural (Tẩy Da Chết Nhật Bản)</option>
                <option value="Keyshu">Keyshu (Mặt Nạ Rau Má)</option>
                <option value="Royal Ausnz">Royal Ausnz (Sữa Hoàng Gia Úc)</option>
                <option value="Peripera">Peripera (Son Môi & Makeup Hàn Quốc)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Người Nhận Bàn Giao (Content PIC)
              </label>
              <select
                value={contentPic}
                onChange={(e) => setContentPic(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              >
                <option value="Quỳnh Như (Content Lead)">Quỳnh Như (Content Lead)</option>
                <option value="Trần Anh Thư (Content Senior)">Trần Anh Thư (Content Senior)</option>
                <option value="Hoàng Yến (Creative PIC)">Hoàng Yến (Creative PIC)</option>
              </select>
            </div>
          </div>

          {/* Big Idea */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Big Idea Chiến Dịch *
            </label>
            <input
              type="text"
              placeholder="VD: 'Lá Chắn Đa Tầng — Bảo Vệ Toàn Diện Cả Ngày Dài'"
              value={bigIdea}
              onChange={(e) => setBigIdea(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
              required
            />
          </div>

          {/* Key Message */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Thông Điệp Cốt Lõi (Key Message)
            </label>
            <input
              type="text"
              placeholder="VD: Làm sạch sâu nhưng giữ trọn màng ẩm, không căng rát da sau 7 ngày"
              value={keyMessage}
              onChange={(e) => setKeyMessage(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          {/* Hero SKUs Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Sản Phẩm Chủ Lực (Hero SKUs, phân cách bằng dấu phẩy)
            </label>
            <input
              type="text"
              placeholder="VD: Sữa Rửa Mặt Perfect Whip 120g, Nước Tẩy Trang All Clear Water 500ml"
              value={heroSkusInput}
              onChange={(e) => setHeroSkusInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Chân Dung Khách Hàng Mục Tiêu (Target Persona) *
            </label>
            <textarea
              rows={2}
              placeholder="VD: Nữ 18-28 tuổi, nhân viên văn phòng hoặc sinh viên thường xuyên tiếp xúc máy tính và tia UV..."
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
              required
            />
          </div>

          {/* Financials & Target CIR */}
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Ngân Sách (VNĐ)</label>
              <input
                type="number"
                step={10000000}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-900 font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] text-emerald-600 mb-1">Target GMV (VNĐ)</label>
              <input
                type="number"
                step={50000000}
                value={targetGmv}
                onChange={(e) => setTargetGmv(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-emerald-700 font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] text-blue-600 mb-1">Target CIR (%)</label>
              <input
                type="number"
                step={0.5}
                value={targetCir}
                onChange={(e) => setTargetCir(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-blue-700 font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Target KOC</label>
              <input
                type="number"
                value={targetKocCount}
                onChange={(e) => setTargetKocCount(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 font-bold"
              />
            </div>
          </div>

          {/* Start and End Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Ngày Bắt Đầu
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Hạn Kết Thúc
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded shadow-sm transition flex items-center justify-center gap-2 text-xs"
            >
              <Send className="w-4 h-4" />
              <span>Tạo Brief & Tự Động Bàn Giao Sang Content (SLA 24h)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
