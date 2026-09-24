'use client';

import React, { useState } from 'react';
import { X, Target, Sparkles, Send, Calendar, DollarSign, Users } from 'lucide-react';
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
  const [brand, setBrand] = useState('UpBeauty E2E-T');
  const [targetAudience, setTargetAudience] = useState('');
  const [bigIdea, setBigIdea] = useState('');
  const [budget, setBudget] = useState(200000000);
  const [targetGmv, setTargetGmv] = useState(1500000000);
  const [targetKocCount, setTargetKocCount] = useState(25);
  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState('2026-10-31');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newCampaign: CampaignItem = {
      id: `camp-${Date.now()}`,
      code: code || `CAMP-${Math.floor(1000 + Math.random() * 9000)}`,
      title,
      brand,
      targetAudience: targetAudience || 'Khách hàng mục tiêu TikTok & Shopee',
      bigIdea: bigIdea || 'Chiến dịch bùng nổ doanh số quý 4',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#101726] border border-[#1e293b] rounded-lg w-full max-w-xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b] bg-[#0c121e]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Target className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Tạo Chiến Dịch & Chuẩn Hóa Brief</h3>
              <p className="text-xs text-slate-400">Brand Team xác lập mục tiêu & chuyển giao sang Content SLA 24h</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Campaign Title & Code */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Tên Chiến Dịch
              </label>
              <input
                type="text"
                placeholder="VD: Mega Sale 11.11 — Cứu Rỗi Làn Da Dầu Mụn"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#172238] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Mã (Code)
              </label>
              <input
                type="text"
                placeholder="CAMP-1111"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full bg-[#172238] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Brand & Client */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Brand / Nhãn Hàng
            </label>
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full bg-[#172238] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="UpBeauty E2E-T">UpBeauty E2E-T (TikTok & Shopee Brand)</option>
              <option value="Ziaja & Revision Skincare">Ziaja & Revision Skincare (Chăm Sóc Da Dược Liệu)</option>
              <option value="CeraVe Official Store">CeraVe Official Store (Phân Phối Độc Quyền)</option>
              <option value="La Roche-Posay Partner">La Roche-Posay Partner (Phục Hồi B5)</option>
            </select>
          </div>

          {/* Big Idea & Key Message */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Big Idea & Thông Điệp Cốt Lõi
            </label>
            <input
              type="text"
              placeholder="VD: 'Lá Chắn Đa Tầng — Bảo Vệ Toàn Diện Cả Ngày Dài'"
              value={bigIdea}
              onChange={(e) => setBigIdea(e.target.value)}
              className="w-full bg-[#172238] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Chân Dung Khách Hàng Mục Tiêu (Target Persona)
            </label>
            <textarea
              rows={2}
              placeholder="VD: Nữ 18-28 tuổi, nhân viên văn phòng hoặc sinh viên thường xuyên tiếp xúc máy tính và tia UV..."
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full bg-[#172238] border border-[#1e293b] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Financials & Target KOCs */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Ngân Sách Tổng (VNĐ)</label>
              <input
                type="number"
                step={10000000}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full bg-[#172238] border border-[#1e293b] rounded-xl px-3 py-2 text-xs text-white font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] text-emerald-400 mb-1">Mục Tiêu GMV (VNĐ)</label>
              <input
                type="number"
                step={50000000}
                value={targetGmv}
                onChange={(e) => setTargetGmv(Number(e.target.value))}
                className="w-full bg-[#172238] border border-[#1e293b] rounded-xl px-3 py-2 text-xs text-emerald-400 font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] text-blue-400 mb-1">Target Số KOC</label>
              <input
                type="number"
                value={targetKocCount}
                onChange={(e) => setTargetKocCount(Number(e.target.value))}
                className="w-full bg-[#172238] border border-[#1e293b] rounded-xl px-3 py-2 text-xs text-blue-400 font-bold"
              />
            </div>
          </div>

          {/* Start and End Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Ngày Bắt Đầu
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#172238] border border-[#1e293b] rounded-xl px-3.5 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Hạn Kết Thúc
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-[#172238] border border-[#1e293b] rounded-xl px-3.5 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2 text-xs"
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
