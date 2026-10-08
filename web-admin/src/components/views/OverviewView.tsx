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
import { Stat, StatRow, Person, ChannelBar } from '../ui';
import { formatVndShort } from '../../lib/format';

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
      {/* Chỉ số chính, tính từ danh sách deal */}
      {(() => {
        const totalValue = deals.reduce((sum, d) => sum + (d.totalValue || 0), 0);
        const advance = deals.reduce((sum, d) => sum + (d.advanceAmount || 0), 0);
        const gmv = deals.reduce((sum, d) => sum + (d.gmv30 || 0), 0);
        const staffCount = new Set(deals.map(d => d.assignedStaff).filter(Boolean)).size;
        const byStaff = new Map<string, number>();
        deals.forEach(d => d.assignedStaff && byStaff.set(d.assignedStaff, (byStaff.get(d.assignedStaff) || 0) + 1));
        const top = [...byStaff.entries()].sort((x, y) => y[1] - x[1])[0];
        return (
          <div className="space-y-4">
            <StatRow>
              <Stat label="Giá trị deal" value={formatVndShort(totalValue)} progress={{ value: advance, max: totalValue || 1, target: 0 }} note={`Đã tạm ứng ${formatVndShort(advance)}`} />
              <Stat label="Deal đang theo dõi" value={deals.length} note={`${staffCount} nhân sự phụ trách`} />
              <Stat label="GMV 30 ngày" value={formatVndShort(gmv)} note={totalValue > 0 ? `Gấp ${(gmv / totalValue).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} lần giá trị deal` : undefined} tone={gmv >= totalValue ? 'positive' : undefined} />
              <Stat label="Nhiều deal nhất" value={top ? <Person name={top[0]} size={28} /> : '—'} note={top ? `${top[1]} deal` : undefined} />
            </StatRow>
            <div className="bg-surface border border-line rounded-xl px-4 py-3.5 grid gap-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] font-medium text-ink">Giá trị deal theo kênh</span>
                <span className="text-2xs text-ink-3 tabular-nums">{formatVndShort(totalValue)}</span>
              </div>
              <ChannelBar
                format={formatVndShort}
                values={deals.map(d => ({
                  channel: d.bookingFormat === 'Booking Livestream KOC' ? 'LIVE' : (d.storeName || d.campaignTitle || ''),
                  value: d.totalValue || 0,
                }))}
              />
            </div>
          </div>
        );
      })()}

      {/* 3-Team Pipeline Visualization */}
      <div className="card-enterprise p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Bàn giao giữa các team
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Mỗi việc có người nhận và hạn SLA, không giao qua tin nhắn</p>
          </div>
          <span className="badge-emerald px-2.5 py-1 rounded-full text-xs font-semibold">
            8 bước có SLA
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Column 1: Brand */}
          <div className="card-inner-box p-4 border border-blue-200/80 bg-blue-50/20 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-semibold text-blue-600">1. Brand Team</span>
              <span className="badge-blue px-2 py-0.5 rounded text-2xs font-semibold">SLA: 24h</span>
            </div>
            <div className="space-y-2">
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs space-y-1.5 shadow-2xs">
                <span className="font-semibold text-slate-900 block">Mega Sale 10.10: Kháng nắng</span>
                <p className="text-slate-600 text-2xs">Big Idea: &quot;Lá Chắn Đa Tầng&quot; - Target 1.8 Tỷ GMV</p>
                <div className="flex justify-between text-2xs text-slate-500 pt-1.5 border-t border-slate-100">
                  <span className="font-medium text-slate-700">Phương Thảo</span>
                  <span className="text-emerald-600 font-semibold">Đã duyệt brief</span>
                </div>
              </div>
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs space-y-1.5 shadow-2xs">
                <span className="font-semibold text-slate-900 block">Re-positioning Thu Đông Q4</span>
                <p className="text-slate-600 text-2xs">Value Proposition cho dòng phục hồi da mùa khô</p>
                <div className="flex justify-between text-2xs text-slate-500 pt-1.5 border-t border-slate-100">
                  <span className="font-medium text-slate-700">Tiến</span>
                  <span className="text-blue-600 font-semibold">SLA còn 14h</span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Content */}
          <div className="card-inner-box p-4 border border-purple-200/80 bg-purple-50/20 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-semibold text-purple-600">2. Content Team</span>
              <span className="badge-purple px-2 py-0.5 rounded text-2xs font-semibold">SLA: 24h - 48h</span>
            </div>
            <div className="space-y-2">
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs space-y-1.5 shadow-2xs">
                <span className="font-semibold text-slate-900 block">Master Plan 10.10: 45 Posts</span>
                <p className="text-slate-600 text-2xs">Pillars: Giáo dục UV (35%) + Social Proof (45%)</p>
                <div className="flex justify-between text-2xs text-slate-500 pt-1.5 border-t border-slate-100">
                  <span className="font-medium text-slate-700">Quỳnh Như</span>
                  <span className="text-emerald-600 font-semibold">Đã chuyển Booking</span>
                </div>
              </div>
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs space-y-1.5 shadow-2xs">
                <span className="font-semibold text-slate-900 block">Duyệt kịch bản KOC 60s</span>
                <p className="text-slate-600 text-2xs">Angle &quot;Soi camera UV trước và sau khi thoa&quot;</p>
                <div className="flex justify-between text-2xs text-slate-500 pt-1.5 border-t border-slate-100">
                  <span className="font-medium text-slate-700">Hoàng Linh</span>
                  <span className="text-amber-600 font-semibold">SLA còn 4h</span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Booking */}
          <div className="card-inner-box p-4 border border-emerald-200/80 bg-emerald-50/20 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-semibold text-emerald-600">3. Booking Execution</span>
              <span className="badge-emerald px-2 py-0.5 rounded text-2xs font-semibold">SLA: 12h - 48h</span>
            </div>
            <div className="space-y-2">
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs space-y-1.5 shadow-2xs">
                <span className="font-semibold text-slate-900 block">Booking 30 KOC Video Tier 3</span>
                <p className="text-slate-600 text-2xs">Đã chốt 28/30 KOCs • 18 HĐ đã chi tạm ứng 2tr</p>
                <div className="flex justify-between text-2xs text-slate-500 pt-1.5 border-t border-slate-100">
                  <span className="font-medium text-slate-700">Khánh Vy</span>
                  <span className="text-emerald-600 font-semibold">Đang tiến độ tốt</span>
                </div>
              </div>
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs space-y-1.5 shadow-2xs">
                <span className="font-semibold text-slate-900 block">Live Affiliate Marathon D-Day</span>
                <p className="text-slate-600 text-2xs">Booking 8 KOC Live đồng thời khung 19h - 24h</p>
                <div className="flex justify-between text-2xs text-slate-500 pt-1.5 border-t border-slate-100">
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
            <h3 className="text-sm font-semibold text-slate-900">Deal KOC và tạm ứng</h3>
            <p className="text-xs text-slate-500 mt-0.5">Giá trị deal, tạm ứng và trạng thái của từng KOC</p>
          </div>
          <button
            onClick={onOpenQuickBook}
            className="btn-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-2xs transition"
          >
            + Thêm deal mới
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0 text-xs min-w-[1050px]">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-2xs font-semibold">
                <th className="p-3.5 pl-6 border-b border-slate-200 w-[110px] min-w-[110px] whitespace-nowrap">Mã Deal</th>
                <th className="p-3.5 border-b border-slate-200 w-[180px] min-w-[180px]">KOC / Kênh</th>
                <th className="p-3.5 border-b border-slate-200 w-[240px] min-w-[240px]">Chiến dịch</th>
                <th className="p-3.5 border-b border-slate-200 w-[130px] min-w-[130px] whitespace-nowrap">Nhân sự</th>
                <th className="p-3.5 border-b border-slate-200 w-[140px] min-w-[140px] whitespace-nowrap">Tổng Deal</th>
                <th className="p-3.5 border-b border-slate-200 w-[140px] min-w-[140px] whitespace-nowrap">Tạm ứng đợt 1</th>
                <th className="p-3.5 border-b border-slate-200 w-[140px] min-w-[140px] whitespace-nowrap">Trạng Thái</th>
                <th className="p-3.5 pr-6 text-right border-b border-slate-200 w-[110px] min-w-[110px] whitespace-nowrap sticky right-0 bg-slate-50 border-l border-slate-200 z-10">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => (
                <tr key={deal.id} className="group hover:bg-slate-50/80 transition-colors">
                  <td className="p-3.5 pl-6 border-b border-slate-100 font-mono font-semibold text-blue-600 whitespace-nowrap">{deal.dealCode}</td>
                  <td className="p-3.5 border-b border-slate-100">
                    <div className="font-semibold text-slate-900">{deal.kocStageName}</div>
                    <div className="text-2xs text-slate-500">{deal.kocTier}</div>
                  </td>
                  <td className="p-3.5 border-b border-slate-100 text-slate-700 max-w-xs truncate">{deal.campaignTitle}</td>
                  <td className="p-3.5 border-b border-slate-100 whitespace-nowrap"><Person name={deal.assignedStaff} size={22} /></td>
                  <td className="p-3.5 border-b border-slate-100 font-semibold text-slate-900 whitespace-nowrap font-mono">
                    {deal.totalValue.toLocaleString('vi-VN')}&nbsp;₫
                  </td>
                  <td className="p-3.5 border-b border-slate-100 font-semibold text-emerald-600 whitespace-nowrap font-mono">
                    {deal.advanceAmount.toLocaleString('vi-VN')}&nbsp;₫
                  </td>
                  <td className="p-3.5 border-b border-slate-100 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-2xs font-semibold ${
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
