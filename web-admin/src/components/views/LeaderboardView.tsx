'use client';

import React, { useState } from 'react';
import { Avatar, Person } from '../ui';
import { formatVndShort } from '../../lib/format';
import { Award, TrendingUp, CheckCircle, Video, ShieldCheck } from 'lucide-react';
import { LeaderboardItem } from '../../lib/types';
import { INITIAL_LEADERBOARD } from '../../lib/mockData';

export const LeaderboardView: React.FC = () => {
  const [boardData] = useState<LeaderboardItem[]>(INITIAL_LEADERBOARD);
  const [timeRange, setTimeRange] = useState<'MONTH' | 'WEEK'>('MONTH');

  const top1 = boardData[0];
  const top2 = boardData[1];
  const top3 = boardData[2];

  return (
    <div className="space-y-6">
      {/* Time Range Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white border border-slate-200 rounded-xl text-xs shadow-2xs">
        <div>
          <h3 className="text-xs font-semibold text-slate-900 flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-600" />
            Đánh giá hiệu suất & kỷ luật vận hành nhân sự (30 nhân sự)
          </h3>
          <p className="text-2xs text-slate-500 mt-0.5">
            Cơ chế tính điểm chuẩn hóa: 30% kỷ luật SLA + 40% sản lượng video + 30% doanh thu GMV
          </p>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0 self-end sm:self-auto">
          <button 
            onClick={() => setTimeRange('MONTH')}
            className={`px-3 py-1 rounded text-xs font-semibold transition ${
              timeRange === 'MONTH' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tháng 8 & 9/2026
          </button>
          <button 
            onClick={() => setTimeRange('WEEK')}
            className={`px-3 py-1 rounded text-xs font-semibold transition ${
              timeRange === 'WEEK' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tuần này
          </button>
        </div>
      </div>

      {/* Top 3 Executive Cards (Minimal & Elegant - No Toy Podium) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top 1 */}
        {top1 && (
          <div className="card-enterprise p-5 bg-white border border-blue-200 shadow-xs flex flex-col justify-between relative">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="badge-blue px-2.5 py-0.5 rounded text-2xs font-semibold flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-blue-600" />
                  Top 1 toàn phòng
                </span>
                <span className="text-xs font-semibold text-blue-600 font-mono">
                  {top1.totalScore} Điểm
                </span>
              </div>
              <div className="flex items-center gap-2.5"><Avatar name={top1.name} size={32} /><h4 className="text-base font-semibold text-slate-900 tracking-tight">{top1.name}</h4></div>
              <span className="text-xs text-slate-500">{top1.team}</span>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="text-2xs text-slate-500 block">SLA (30%)</span>
                  <span className="text-xs font-semibold text-emerald-600 font-mono">{top1.slaScore}%</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="text-2xs text-slate-500 block">Video (40%)</span>
                  <span className="text-xs font-semibold text-slate-900 font-mono">{top1.videoCount}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="text-2xs text-slate-500 block">GMV (30%)</span>
                  <span className="text-xs font-semibold text-blue-600 font-mono">{formatVndShort(top1.gmv)}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-2xs text-slate-500">Đánh giá chung:</span>
              <span className="badge-blue px-2.5 py-0.5 rounded text-2xs font-semibold">
                {top1.badge}
              </span>
            </div>
          </div>
        )}

        {/* Top 2 */}
        {top2 && (
          <div className="card-enterprise p-5 bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="badge-amber px-2.5 py-0.5 rounded text-2xs font-semibold flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  Top 2 toàn phòng
                </span>
                <span className="text-xs font-semibold text-amber-700 font-mono">
                  {top2.totalScore} Điểm
                </span>
              </div>
              <div className="flex items-center gap-2.5"><Avatar name={top2.name} size={32} /><h4 className="text-base font-semibold text-slate-900 tracking-tight">{top2.name}</h4></div>
              <span className="text-xs text-slate-500">{top2.team}</span>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="text-2xs text-slate-500 block">SLA (30%)</span>
                  <span className="text-xs font-semibold text-emerald-600 font-mono">{top2.slaScore}%</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="text-2xs text-slate-500 block">Video (40%)</span>
                  <span className="text-xs font-semibold text-slate-900 font-mono">{top2.videoCount}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="text-2xs text-slate-500 block">GMV (30%)</span>
                  <span className="text-xs font-semibold text-slate-700 font-mono">{formatVndShort(top2.gmv)}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-2xs text-slate-500">Đánh giá chung:</span>
              <span className="badge-emerald px-2.5 py-0.5 rounded text-2xs font-semibold">
                {top2.badge}
              </span>
            </div>
          </div>
        )}

        {/* Top 3 */}
        {top3 && (
          <div className="card-enterprise p-5 bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="badge-purple px-2.5 py-0.5 rounded text-2xs font-semibold flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-purple-600" />
                  Top 3 toàn phòng
                </span>
                <span className="text-xs font-semibold text-purple-700 font-mono">
                  {top3.totalScore} Điểm
                </span>
              </div>
              <div className="flex items-center gap-2.5"><Avatar name={top3.name} size={32} /><h4 className="text-base font-semibold text-slate-900 tracking-tight">{top3.name}</h4></div>
              <span className="text-xs text-slate-500">{top3.team}</span>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="text-2xs text-slate-500 block">SLA (30%)</span>
                  <span className="text-xs font-semibold text-emerald-600 font-mono">{top3.slaScore}%</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="text-2xs text-slate-500 block">Video (40%)</span>
                  <span className="text-xs font-semibold text-slate-900 font-mono">{top3.videoCount}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="text-2xs text-slate-500 block">GMV (30%)</span>
                  <span className="text-xs font-semibold text-slate-700 font-mono">{formatVndShort(top3.gmv)}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-2xs text-slate-500">Đánh giá chung:</span>
              <span className="badge-purple px-2.5 py-0.5 rounded text-2xs font-semibold">
                {top3.badge}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Full Leaderboard Table */}
      <div className="card-enterprise overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
          <div>
            <h3 className="text-xs font-semibold text-slate-900">
              Bảng đánh giá chi tiết toàn bộ 30 nhân sự
            </h3>
            <p className="text-2xs text-slate-500 mt-0.5">
              Tự động đồng bộ từ kết quả nghiệm thu video, doanh số đối soát và thời gian xử lý SLA
            </p>
          </div>
          <span className="badge-blue px-2.5 py-0.5 rounded-full text-2xs font-semibold">
            Thời gian thực
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0 text-xs min-w-[950px]">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-2xs font-semibold">
                <th className="p-3 pl-5 border-b border-slate-200 w-[90px] whitespace-nowrap">Thứ hạng</th>
                <th className="p-3 border-b border-slate-200 w-[180px]">Nhân sự</th>
                <th className="p-3 border-b border-slate-200 w-[160px]">Bộ phận phụ trách</th>
                <th className="p-3 text-right border-b border-slate-200 w-[150px] whitespace-nowrap">Kỷ luật SLA (30%)</th>
                <th className="p-3 text-right border-b border-slate-200 w-[160px] whitespace-nowrap">Sản lượng video (40%)</th>
                <th className="p-3 text-right border-b border-slate-200 w-[170px] whitespace-nowrap">Doanh Thu GMV (30%)</th>
                <th className="p-3 text-right border-b border-slate-200 w-[110px] whitespace-nowrap">Tổng điểm</th>
                <th className="p-3 pr-5 text-right border-b border-slate-200 w-[160px] whitespace-nowrap">Đánh giá nghiệp vụ</th>
              </tr>
            </thead>
            <tbody>
              {boardData.map((item) => (
                <tr key={item.rank} className="group hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                  <td className="p-3 pl-5 border-b border-slate-100 font-mono whitespace-nowrap">
                    <span className={`font-semibold ${
                      item.rank === 1 ? 'text-blue-600 font-semibold' :
                      item.rank === 2 ? 'text-amber-600 font-semibold' :
                      item.rank === 3 ? 'text-purple-600 font-semibold' : 'text-slate-600'
                    }`}>
                      #{item.rank}
                    </span>
                  </td>
                  <td className="p-3 border-b border-slate-100 font-medium"><Person name={item.name} size={24} /></td>
                  <td className="p-3 border-b border-slate-100 text-slate-600">{item.team}</td>
                  <td className="p-3 border-b border-slate-100 text-right font-mono font-semibold text-emerald-600 whitespace-nowrap">{item.slaScore}%</td>
                  <td className="p-3 border-b border-slate-100 text-right font-mono font-medium text-slate-800 whitespace-nowrap">{item.videoCount} Clips</td>
                  <td className="p-3 border-b border-slate-100 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                    {item.gmv.toLocaleString('vi-VN')}&nbsp;₫
                  </td>
                  <td className="p-3 border-b border-slate-100 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">{item.totalScore}</td>
                  <td className="p-3 pr-5 border-b border-slate-100 text-right whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-2xs font-semibold ${
                      item.rank === 1 ? 'badge-blue' :
                      item.rank === 2 ? 'badge-amber' :
                      item.rank === 3 ? 'badge-purple' :
                      'badge-slate'
                    }`}>
                      {item.badge}
                    </span>
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
