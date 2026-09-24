'use client';

import React, { useState } from 'react';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#0e1320] border border-[#1e293b] rounded-xl text-xs">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-400" />
            Đánh Giá Hiệu Suất & Kỷ Luật Vận Hành Nhân Sự (30 Nhân Sự)
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Cơ chế tính điểm chuẩn hóa: 30% Kỷ luật SLA + 40% Sản lượng Video + 30% Doanh thu GMV
          </p>
        </div>
        <div className="flex items-center gap-1 bg-[#090d16] p-1 rounded-lg border border-[#1e293b] shrink-0 self-end sm:self-auto">
          <button 
            onClick={() => setTimeRange('MONTH')}
            className={`px-3 py-1 rounded text-xs font-semibold transition ${
              timeRange === 'MONTH' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Tháng 8 & 9/2026
          </button>
          <button 
            onClick={() => setTimeRange('WEEK')}
            className={`px-3 py-1 rounded text-xs font-semibold transition ${
              timeRange === 'WEEK' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Tuần Này
          </button>
        </div>
      </div>

      {/* Top 3 Executive Cards (Minimal & Elegant - No Toy Podium) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top 1 */}
        {top1 && (
          <div className="card-enterprise p-5 bg-[#0e1320] border-blue-500/30 flex flex-col justify-between relative">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  #1 Toàn Phòng
                </span>
                <span className="text-xs font-bold text-blue-400 font-mono">
                  {top1.totalScore} Điểm
                </span>
              </div>
              <h4 className="text-base font-bold text-white tracking-tight">{top1.name}</h4>
              <span className="text-xs text-slate-400">{top1.team}</span>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#1e293b] text-center">
                <div className="p-2 bg-[#090d16] rounded-lg">
                  <span className="text-[10px] text-slate-400 block">SLA (30%)</span>
                  <span className="text-xs font-bold text-emerald-400 font-mono">{top1.slaScore}%</span>
                </div>
                <div className="p-2 bg-[#090d16] rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Video (40%)</span>
                  <span className="text-xs font-bold text-white font-mono">{top1.videoCount}</span>
                </div>
                <div className="p-2 bg-[#090d16] rounded-lg">
                  <span className="text-[10px] text-slate-400 block">GMV (30%)</span>
                  <span className="text-xs font-bold text-blue-400 font-mono">{(top1.gmv / 1000000).toFixed(0)}M</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#1e293b]/60 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Đánh giá chung:</span>
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] font-semibold">
                {top1.badge}
              </span>
            </div>
          </div>
        )}

        {/* Top 2 */}
        {top2 && (
          <div className="card-enterprise p-5 bg-[#0e1320] border-[#1e293b] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  #2 Toàn Phòng
                </span>
                <span className="text-xs font-bold text-slate-300 font-mono">
                  {top2.totalScore} Điểm
                </span>
              </div>
              <h4 className="text-base font-bold text-white tracking-tight">{top2.name}</h4>
              <span className="text-xs text-slate-400">{top2.team}</span>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#1e293b] text-center">
                <div className="p-2 bg-[#090d16] rounded-lg">
                  <span className="text-[10px] text-slate-400 block">SLA (30%)</span>
                  <span className="text-xs font-bold text-emerald-400 font-mono">{top2.slaScore}%</span>
                </div>
                <div className="p-2 bg-[#090d16] rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Video (40%)</span>
                  <span className="text-xs font-bold text-white font-mono">{top2.videoCount}</span>
                </div>
                <div className="p-2 bg-[#090d16] rounded-lg">
                  <span className="text-[10px] text-slate-400 block">GMV (30%)</span>
                  <span className="text-xs font-bold text-slate-300 font-mono">{(top2.gmv / 1000000).toFixed(0)}M</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#1e293b]/60 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Đánh giá chung:</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-semibold">
                {top2.badge}
              </span>
            </div>
          </div>
        )}

        {/* Top 3 */}
        {top3 && (
          <div className="card-enterprise p-5 bg-[#0e1320] border-[#1e293b] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  #3 Toàn Phòng
                </span>
                <span className="text-xs font-bold text-slate-300 font-mono">
                  {top3.totalScore} Điểm
                </span>
              </div>
              <h4 className="text-base font-bold text-white tracking-tight">{top3.name}</h4>
              <span className="text-xs text-slate-400">{top3.team}</span>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#1e293b] text-center">
                <div className="p-2 bg-[#090d16] rounded-lg">
                  <span className="text-[10px] text-slate-400 block">SLA (30%)</span>
                  <span className="text-xs font-bold text-emerald-400 font-mono">{top3.slaScore}%</span>
                </div>
                <div className="p-2 bg-[#090d16] rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Video (40%)</span>
                  <span className="text-xs font-bold text-white font-mono">{top3.videoCount}</span>
                </div>
                <div className="p-2 bg-[#090d16] rounded-lg">
                  <span className="text-[10px] text-slate-400 block">GMV (30%)</span>
                  <span className="text-xs font-bold text-slate-300 font-mono">{(top3.gmv / 1000000).toFixed(0)}M</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#1e293b]/60 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Đánh giá chung:</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-semibold">
                {top3.badge}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Full Leaderboard Table */}
      <div className="card-enterprise overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1e293b] flex items-center justify-between bg-[#0c121e]">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Bảng Đánh Giá Chi Tiết Toàn Bộ 30 Nhân Sự
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Tự động đồng bộ từ kết quả nghiệm thu video, doanh số đối soát và thời gian xử lý SLA
            </p>
          </div>
          <span className="badge-blue px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
            Thời gian thực
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="table-header-enterprise bg-[#121826]">
                <th className="p-3 pl-5 text-slate-300 font-semibold">Thứ Hạng</th>
                <th className="p-3 text-slate-300 font-semibold">Nhân Sự</th>
                <th className="p-3 text-slate-300 font-semibold">Bộ Phận Phụ Trách</th>
                <th className="p-3 text-right text-slate-300 font-semibold">Kỷ Luật SLA (30%)</th>
                <th className="p-3 text-right text-slate-300 font-semibold">Sản Lượng Video (40%)</th>
                <th className="p-3 text-right text-slate-300 font-semibold">Doanh Thu GMV (30%)</th>
                <th className="p-3 text-right text-slate-300 font-semibold">Tổng Điểm</th>
                <th className="p-3 pr-5 text-right text-slate-300 font-semibold">Đánh Giá Nghiệp Vụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]">
              {boardData.map((item) => (
                <tr key={item.rank} className="table-row-enterprise hover:bg-[#121826]/60 transition-colors">
                  <td className="p-3 pl-5 font-mono">
                    <span className={`font-semibold ${
                      item.rank === 1 ? 'text-blue-400 font-bold' :
                      item.rank <= 3 ? 'text-slate-300 font-semibold' : 'text-slate-500'
                    }`}>
                      #{item.rank}
                    </span>
                  </td>
                  <td className="p-3 font-semibold text-white">{item.name}</td>
                  <td className="p-3 text-slate-400">{item.team}</td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-400">{item.slaScore}%</td>
                  <td className="p-3 text-right font-mono text-white">{item.videoCount} Clips</td>
                  <td className="p-3 text-right font-mono font-semibold text-blue-400">
                    {item.gmv.toLocaleString('vi-VN')} đ
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-white">{item.totalScore}</td>
                  <td className="p-3 pr-5 text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      item.rank === 1 
                        ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20' 
                        : 'bg-slate-800/80 text-slate-300 border border-slate-700/60'
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
