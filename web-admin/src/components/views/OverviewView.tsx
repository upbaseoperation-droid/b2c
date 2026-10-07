'use client';

import React from 'react';
import {
  TrendingUp,
  Clock,
  Video,
  Award,
  ArrowRight,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { BookingDealItem } from '../../lib/types';

interface OverviewViewProps {
  deals: BookingDealItem[];
  onOpenQuickBook: () => void;
  onSelectDeal: (deal: BookingDealItem) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  deals,
  onOpenQuickBook,
  onSelectDeal,
}) => {
  return (
    <div className="space-y-6">
      {/* 4 Standardized Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-enterprise p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Tỷ Lệ Đạt SLA Toàn Phòng</span>
            <div className="text-2xl font-bold text-slate-900">94.8%</div>
            <span className="text-[11px] text-emerald-600 font-semibold">↑ Tăng 34% sau chuẩn hóa</span>
          </div>
        </div>

        <div className="card-enterprise p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Thời Gian Khởi Tạo Hợp Đồng</span>
            <div className="text-2xl font-bold text-slate-900">1.2 phút</div>
            <span className="text-[11px] text-emerald-600 font-semibold">Tiết kiệm 95% thời gian tạo thủ công</span>
          </div>
        </div>

        <div className="card-enterprise p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Video/Live Đang Triển Khai</span>
            <div className="text-2xl font-bold text-slate-900">164 Clips</div>
            <span className="text-[11px] text-slate-500">TikTok, Shopee, Reels, Threads</span>
          </div>
        </div>

        <div className="card-enterprise p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Nhân Sự Xuất Sắc Trong Tuần</span>
            <div className="text-2xl font-bold text-slate-900">Khánh Vy</div>
            <span className="text-[11px] text-slate-500">32 Deals • 100% đúng hạn SLA</span>
          </div>
        </div>
      </div>

      {/* 3-Team Pipeline Visualization */}
      <div className="card-enterprise p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Luồng Chuyển Giao Công Việc 3 Team (3-Team Handoff Pipeline)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Chuẩn hóa giao tiếp 2 chiều — Không nhận việc qua chat miệng</p>
          </div>
          <span className="badge-emerald px-2.5 py-1 rounded-full text-xs font-bold">
            SLA Khép Kín 8 Chặng
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Column 1: Brand */}
          <div className="card-inner-box p-4 border border-blue-200/80 bg-blue-50/20 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">1. Brand Team</span>
              <span className="badge-blue px-2 py-0.5 rounded text-[10px] font-bold">SLA: 24h</span>
            </div>
            <div className="space-y-2">
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs space-y-1.5 shadow-2xs">
                <span className="font-bold text-slate-900 block">Mega Sale 10.10: Kháng Nắng</span>
                <p className="text-slate-600 text-[11px]">Big Idea: &quot;Lá Chắn Đa Tầng&quot; - Target 1.8 Tỷ GMV</p>
                <div className="flex justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-100">
                  <span className="font-medium text-slate-700">Phương Thảo</span>
                  <span className="text-emerald-600 font-semibold">Đã duyệt brief</span>
                </div>
              </div>
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs space-y-1.5 shadow-2xs">
                <span className="font-bold text-slate-900 block">Re-positioning Thu Đông Q4</span>
                <p className="text-slate-600 text-[11px]">Value Proposition cho dòng phục hồi da mùa khô</p>
                <div className="flex justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-100">
                  <span className="font-medium text-slate-700">Tiến (Brand Lead)</span>
                  <span className="text-blue-600 font-semibold">SLA còn 14h</span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Content */}
          <div className="card-inner-box p-4 border border-purple-200/80 bg-purple-50/20 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">2. Content Team</span>
              <span className="badge-purple px-2 py-0.5 rounded text-[10px] font-bold">SLA: 24h - 48h</span>
            </div>
            <div className="space-y-2">
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs space-y-1.5 shadow-2xs">
                <span className="font-bold text-slate-900 block">Master Plan 10.10: 45 Posts</span>
                <p className="text-slate-600 text-[11px]">Pillars: Giáo dục UV (35%) + Social Proof (45%)</p>
                <div className="flex justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-100">
                  <span className="font-medium text-slate-700">Quỳnh Như</span>
                  <span className="text-emerald-600 font-semibold">Đã chuyển Booking</span>
                </div>
              </div>
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs space-y-1.5 shadow-2xs">
                <span className="font-bold text-slate-900 block">Duyệt Kịch Bản KOC 60s</span>
                <p className="text-slate-600 text-[11px]">Angle &quot;Soi camera UV trước và sau khi thoa&quot;</p>
                <div className="flex justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-100">
                  <span className="font-medium text-slate-700">Hoàng Linh</span>
                  <span className="text-amber-600 font-semibold">SLA còn 4h</span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Booking */}
          <div className="card-inner-box p-4 border border-emerald-200/80 bg-emerald-50/20 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">3. Booking Execution</span>
              <span className="badge-emerald px-2 py-0.5 rounded text-[10px] font-bold">SLA: 12h - 48h</span>
            </div>
            <div className="space-y-2">
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs space-y-1.5 shadow-2xs">
                <span className="font-bold text-slate-900 block">Booking 30 KOC Video Tier 3</span>
                <p className="text-slate-600 text-[11px]">Đã chốt 28/30 KOCs • 18 HĐ đã chi tạm ứng 2tr</p>
                <div className="flex justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-100">
                  <span className="font-medium text-slate-700">Khánh Vy</span>
                  <span className="text-emerald-600 font-semibold">Đang tiến độ tốt</span>
                </div>
              </div>
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs space-y-1.5 shadow-2xs">
                <span className="font-bold text-slate-900 block">Live Affiliate Marathon D-Day</span>
                <p className="text-slate-600 text-[11px]">Booking 8 KOC Live đồng thời khung 19h - 24h</p>
                <div className="flex justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-100">
                  <span className="font-medium text-slate-700">Nguyễn Anh</span>
                  <span className="text-blue-600 font-semibold">Chờ nghiệm thu</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Deals Table */}
      <div className="card-enterprise overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Theo Dõi Deals KOC & Tiến Độ Giải Ngân</h3>
            <p className="text-xs text-slate-500 mt-0.5">Tự động đồng bộ với CSDL Supabase PostgreSQL</p>
          </div>
          <button
            onClick={onOpenQuickBook}
            className="btn-md bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-2xs transition"
          >
            + Thêm Deal Mới
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0 text-xs min-w-[1050px]">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider">
                <th className="p-3.5 pl-6 border-b border-slate-200 w-[110px] min-w-[110px] whitespace-nowrap">Mã Deal</th>
                <th className="p-3.5 border-b border-slate-200 w-[180px] min-w-[180px]">KOC / Kênh</th>
                <th className="p-3.5 border-b border-slate-200 w-[240px] min-w-[240px]">Chiến Dịch</th>
                <th className="p-3.5 border-b border-slate-200 w-[130px] min-w-[130px] whitespace-nowrap">Nhân Sự</th>
                <th className="p-3.5 border-b border-slate-200 w-[140px] min-w-[140px] whitespace-nowrap">Tổng Deal</th>
                <th className="p-3.5 border-b border-slate-200 w-[140px] min-w-[140px] whitespace-nowrap">Tạm Ứng Đợt 1</th>
                <th className="p-3.5 border-b border-slate-200 w-[140px] min-w-[140px] whitespace-nowrap">Trạng Thái</th>
                <th className="p-3.5 pr-6 text-right border-b border-slate-200 w-[110px] min-w-[110px] whitespace-nowrap sticky right-0 bg-slate-50 border-l border-slate-200 z-10">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => (
                <tr key={deal.id} className="group hover:bg-slate-50/80 transition-colors">
                  <td className="p-3.5 pl-6 border-b border-slate-100 font-mono font-bold text-blue-600 whitespace-nowrap">{deal.dealCode}</td>
                  <td className="p-3.5 border-b border-slate-100">
                    <div className="font-bold text-slate-900">{deal.kocStageName}</div>
                    <div className="text-[11px] text-slate-500">{deal.kocTier}</div>
                  </td>
                  <td className="p-3.5 border-b border-slate-100 text-slate-700 max-w-xs truncate">{deal.campaignTitle}</td>
                  <td className="p-3.5 border-b border-slate-100 font-medium text-slate-700 whitespace-nowrap">{deal.assignedStaff}</td>
                  <td className="p-3.5 border-b border-slate-100 font-bold text-slate-900 whitespace-nowrap font-mono">
                    {deal.totalValue.toLocaleString('vi-VN')}&nbsp;₫
                  </td>
                  <td className="p-3.5 border-b border-slate-100 font-bold text-emerald-600 whitespace-nowrap font-mono">
                    {deal.advanceAmount.toLocaleString('vi-VN')}&nbsp;₫
                  </td>
                  <td className="p-3.5 border-b border-slate-100 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      deal.status === 'ADVANCE_PAID' ? 'badge-emerald' :
                      deal.status === 'SCRIPT_APPROVED' ? 'badge-purple' :
                      deal.status === 'VIDEO_SUBMITTED' ? 'badge-blue' :
                      'badge-slate'
                    }`}>
                      {deal.statusLabel}
                    </span>
                  </td>
                  <td className="p-3.5 pr-6 text-right border-b border-slate-100 whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 border-l border-slate-200 z-10">
                    <button
                      onClick={() => onSelectDeal(deal)}
                      className="btn-sm bg-white hover:bg-slate-50 text-blue-600 rounded-lg text-xs font-semibold border border-slate-200 transition flex items-center gap-1.5 ml-auto shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      <span>Xem HĐ</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
