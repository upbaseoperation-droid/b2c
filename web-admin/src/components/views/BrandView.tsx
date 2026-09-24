'use client';

import React, { useState } from 'react';
import { Target, ArrowRight, CheckCircle, Sparkles, Send, DollarSign, TrendingUp, Users } from 'lucide-react';
import { CampaignItem } from '../../lib/types';
import { INITIAL_CAMPAIGNS } from '../../lib/mockData';
import { CampaignCreateModal } from '../CampaignCreateModal';

interface BrandViewProps {
  onCampaignCreatedNotification?: (campaign: CampaignItem) => void;
  onTriggerHandoffNotification?: (campaignTitle: string) => void;
}

export const BrandView: React.FC<BrandViewProps> = ({
  onCampaignCreatedNotification,
  onTriggerHandoffNotification,
}) => {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>(INITIAL_CAMPAIGNS);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'ACTIVE' | 'UPCOMING'>('ALL');

  const handleCreateCampaign = (newCamp: CampaignItem) => {
    setCampaigns(prev => [newCamp, ...prev]);
    if (onCampaignCreatedNotification) onCampaignCreatedNotification(newCamp);
  };

  const handleHandoff = (campId: string) => {
    setCampaigns(prev => prev.map(c => c.id === campId ? {
      ...c,
      briefStatus: 'HANDED_OFF_TO_CONTENT'
    } : c));
    const targetCamp = campaigns.find(c => c.id === campId);
    if (onTriggerHandoffNotification && targetCamp) {
      onTriggerHandoffNotification(targetCamp.title);
    }
  };

  const filteredCampaigns = campaigns.filter(c => selectedFilter === 'ALL' || c.status === selectedFilter);

  return (
    <div className="space-y-4">
      {/* Action & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 text-xs">Trạng thái:</span>
          {[
            { key: 'ALL', label: 'Tất cả chiến dịch' },
            { key: 'ACTIVE', label: 'Đang chạy (Active)' },
            { key: 'UPCOMING', label: 'Sắp diễn ra (Upcoming)' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedFilter(tab.key as any)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                selectedFilter === tab.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-[#101726] text-slate-400 hover:text-slate-200 border border-[#1e293b]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Target className="w-3.5 h-3.5" />
          <span>+ Tạo Chiến Dịch / Brief Mới</span>
        </button>
      </div>

      {/* Campaign Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredCampaigns.map((c) => {
          const budgetPercent = Math.min(100, Math.round((c.spentBudget / (c.budget || 1)) * 100));
          const gmvPercent = Math.min(100, Math.round((c.currentGmv / (c.targetGmv || 1)) * 100));

          return (
            <div key={c.id} className="card-enterprise p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="badge-blue px-2.5 py-1 rounded-full font-mono text-xs font-bold">
                    {c.code}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                    c.status === 'ACTIVE' ? 'badge-emerald' : 'badge-amber'
                  }`}>
                    {c.status === 'ACTIVE' ? 'Đang Thực Thi' : 'Kế Hoạch Sắp Chạy'}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">{c.title}</h3>
                  <p className="text-xs text-blue-400 font-semibold mt-0.5">{c.brand}</p>
                </div>

                <div className="card-inner-box p-4 space-y-2 text-xs text-slate-300">
                  <p>🎯 <strong>Target Audience:</strong> {c.targetAudience}</p>
                  <p>💡 <strong>Big Idea:</strong> &ldquo;{c.bigIdea}&rdquo;</p>
                  <p>📅 <strong>Thời gian:</strong> {c.startDate} ➔ {c.endDate}</p>
                </div>

                {/* Financial Progress Bars */}
                <div className="space-y-2 pt-1 text-xs">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Ngân sách giải ngân: <strong>{c.spentBudget.toLocaleString('vi-VN')} đ</strong> / {c.budget.toLocaleString('vi-VN')} đ</span>
                      <span className="font-bold text-cyan-400">{budgetPercent}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#0b1120] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" style={{ width: `${budgetPercent}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Doanh số GMV đạt: <strong className="text-emerald-400">{c.currentGmv.toLocaleString('vi-VN')} đ</strong> / {c.targetGmv.toLocaleString('vi-VN')} đ</span>
                      <span className="font-bold text-emerald-400">{gmvPercent}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#0b1120] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" style={{ width: `${gmvPercent}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Handoff Status & Trigger */}
              <div className="flex items-center justify-between pt-4 border-t border-[#1e293b] mt-2">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  {c.briefStatus === 'IN_PRODUCTION' ? 'Content & Booking đang chạy' :
                   c.briefStatus === 'HANDED_OFF_TO_CONTENT' ? 'Đã Bàn Giao Content (SLA 24h)' :
                   'Brief nháp — Chưa bàn giao'}
                </span>

                {c.briefStatus === 'DRAFT' ? (
                  <button
                    onClick={() => handleHandoff(c.id)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Bàn Giao Sang Content</span>
                  </button>
                ) : (
                  <span className="badge-blue px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1">
                    <span>Đã Kích Hoạt SLA</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Campaign Create Modal */}
      <CampaignCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCampaignCreated={handleCreateCampaign}
      />
    </div>
  );
};
