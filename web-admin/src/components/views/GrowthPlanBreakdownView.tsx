'use client';

import React, { useState } from 'react';
import { 
  Target, 
  DollarSign, 
  Layers, 
  Sparkles, 
  Save, 
  Send, 
  Plus, 
  Minus, 
  Calendar, 
  User, 
  Clock, 
  Info,
  FileCheck,
  Zap,
  Video,
  Tv,
  BarChart3,
  AlertOctagon,
  HelpCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { 
  GrowthDemandItem, 
  GrowthDemandBreakdownTier, 
  GrowthDemandStatus,
  WeeklyStorePlan411
} from '../../lib/types';
import { INITIAL_GROWTH_DEMANDS, MOCK_WEEKLY_PLANS_411 } from '../../lib/mockData';
import { exportPlanOrderToExcel, downloadWeeklyTemplate411 } from '../../lib/excelExport';

interface GrowthPlanBreakdownViewProps {
  onNotify?: (message: string) => void;
  onGenerateDealsFromPlan?: (demand: GrowthDemandItem) => void;
}

export const GrowthPlanBreakdownView: React.FC<GrowthPlanBreakdownViewProps> = ({
  onNotify,
  onGenerateDealsFromPlan
}) => {
  const [demands, setDemands] = useState<GrowthDemandItem[]>(INITIAL_GROWTH_DEMANDS);
  const [selectedDemandId, setSelectedDemandId] = useState<string>(INITIAL_GROWTH_DEMANDS[0].id);
  const [statusFilter, setStatusFilter] = useState<'ALL' | GrowthDemandStatus>('ALL');

  // Currently selected demand
  const activeDemand = demands.find(d => d.id === selectedDemandId) || demands[0];

  // Editable breakdown state for the active demand
  const [currentBreakdown, setCurrentBreakdown] = useState<GrowthDemandBreakdownTier[]>(
    activeDemand.breakdown.map(t => ({ ...t }))
  );
  const [strategyNotes, setStrategyNotes] = useState<string>(activeDemand.bookingStrategyNotes || '');
  const [selectedPlan411Id, setSelectedPlan411Id] = useState<string>(MOCK_WEEKLY_PLANS_411[0].id);

  const activePlan411 = MOCK_WEEKLY_PLANS_411.find(p => p.id === selectedPlan411Id) || MOCK_WEEKLY_PLANS_411[0];

  const handleApplyPlan411 = () => {
    // Map KL1-KL7 to the 4 tiers
    // KL1 + KL2 -> TIER_4_AFFILIATE
    // KL3 -> TIER_3_MICRO
    // KL4 + KL5 -> TIER_2_MACRO
    // KL6 + KL7 -> TIER_1_CELEB
    const p = activePlan411;
    const affCount = p.kocTiersCount.kl1 + p.kocTiersCount.kl2;
    const affCost = (p.tierBudgets.kl1 + p.tierBudgets.kl2) / Math.max(1, affCount);

    const microCount = p.kocTiersCount.kl3;
    const microCost = p.tierBudgets.kl3 / Math.max(1, microCount);

    const macroCount = p.kocTiersCount.kl4 + p.kocTiersCount.kl5;
    const macroCost = (p.tierBudgets.kl4 + p.tierBudgets.kl5) / Math.max(1, macroCount);

    const celebCount = p.kocTiersCount.kl6 + p.kocTiersCount.kl7;
    const celebCost = (p.tierBudgets.kl6 + p.tierBudgets.kl7) / Math.max(1, celebCount);

    setCurrentBreakdown(prev => prev.map(t => {
      if (t.tier === 'TIER_4_AFFILIATE') {
        return { ...t, targetCount: affCount, estimatedAvgCost: Math.round(affCost), allocatedBudget: affCount * Math.round(affCost) };
      }
      if (t.tier === 'TIER_3_MICRO') {
        return { ...t, targetCount: microCount, estimatedAvgCost: Math.round(microCost), allocatedBudget: microCount * Math.round(microCost) };
      }
      if (t.tier === 'TIER_2_MACRO') {
        return { ...t, targetCount: macroCount, estimatedAvgCost: Math.round(macroCost), allocatedBudget: macroCount * Math.round(macroCost) };
      }
      if (t.tier === 'TIER_1_CELEB') {
        return { ...t, targetCount: celebCount, estimatedAvgCost: Math.round(celebCost), allocatedBudget: celebCount * Math.round(celebCost) };
      }
      return t;
    }));

    if (onNotify) {
      onNotify(`📥 Đã nạp thành công dữ liệu ${p.week} từ File 4.1.1 (${p.storeName}) vào phân bổ KOC!`);
    }
  };

  const [channelTab, setChannelTab] = useState<'AFFILIATE' | 'SELF_CHANNEL' | 'LIVESTREAM' | 'FOUR_STAGE'>('AFFILIATE');
  const [exceptionExplanation, setExceptionExplanation] = useState<string>(activeDemand.exceptionExplanation || '');

  // Synchronize when active demand changes
  const handleSelectDemand = (demand: GrowthDemandItem) => {
    setSelectedDemandId(demand.id);
    setCurrentBreakdown(demand.breakdown.map(t => ({ ...t })));
    setStrategyNotes(demand.bookingStrategyNotes || '');
    setExceptionExplanation(demand.exceptionExplanation || '');
  };

  // Calculations for Real-time Headroom
  const totalAllocatedBudget = currentBreakdown.reduce((sum, t) => sum + (t.targetCount * t.estimatedAvgCost), 0);
  const totalExpectedGmv = currentBreakdown.reduce((sum, t) => sum + (t.targetCount * t.estimatedGmvPerKoc), 0);
  const totalKocCount = currentBreakdown.reduce((sum, t) => sum + t.targetCount, 0);

  // NMV calculation (Net Merchandise Value after cancellation)
  const cancellationRate = activeDemand.cancellationRate || 0.08;
  const projectedNmv = totalExpectedGmv * (1 - cancellationRate);
  const targetNmv = activeDemand.targetNmv || (activeDemand.targetGmv * (1 - cancellationRate));
  const nmvAchievementRate = targetNmv > 0 ? (projectedNmv / targetNmv) * 100 : 0;

  // Macro + Celeb budget (Bậc KL4 trở lên)
  const celebBudget = currentBreakdown.find(t => t.tier === 'TIER_1_CELEB')?.allocatedBudget || 0;
  const macroBudget = currentBreakdown.find(t => t.tier === 'TIER_2_MACRO')?.allocatedBudget || 0;
  const highTierBudget = celebBudget + macroBudget;
  const highTierRatio = totalAllocatedBudget > 0 ? highTierBudget / totalAllocatedBudget : 0;

  const budgetHeadroom = activeDemand.totalAssignedBudget - totalAllocatedBudget;
  const isOverBudget = budgetHeadroom < 0;
  const isHighTierBlocked = highTierRatio > 0.45; // Quá 45% ngân sách cho Celeb/Macro là rủi ro định mức
  const isNmvShortfall = projectedNmv < targetNmv * 0.9;

  // Validation Gate Block Reasons
  const blockReasons: string[] = [];
  if (isOverBudget) {
    blockReasons.push(`Vượt ngân sách: Vượt ${(Math.abs(budgetHeadroom) / 1000000).toFixed(1)}M đ so với định mức Growth giao.`);
  }
  if (isHighTierBlocked) {
    blockReasons.push(`Vi phạm định mức KOC lớn: Bậc >= KL4 chiếm ${(highTierRatio * 100).toFixed(1)}% (vượt ngưỡng trần 45%).`);
  }
  if (isNmvShortfall) {
    blockReasons.push(`Chưa đạt chỉ tiêu NMV: Dự phóng hụt ${((targetNmv - projectedNmv) / 1000000).toFixed(1)}M đ so với cam kết.`);
  }

  const isBlocked = blockReasons.length > 0 && !exceptionExplanation.trim();

  const gmvAchievementRate = activeDemand.targetGmv > 0 
    ? (totalExpectedGmv / activeDemand.targetGmv) * 100 
    : 0;
  
  const projectedCir = totalExpectedGmv > 0 
    ? (totalAllocatedBudget / totalExpectedGmv) * 100 
    : 0;
  const projectedRoi = totalAllocatedBudget > 0 
    ? totalExpectedGmv / totalAllocatedBudget 
    : 0;

  // Handlers for modifying Tier Count and Cost
  const handleUpdateTierCount = (tierIndex: number, delta: number) => {
    setCurrentBreakdown(prev => {
      const next = [...prev];
      const newCount = Math.max(0, next[tierIndex].targetCount + delta);
      next[tierIndex] = {
        ...next[tierIndex],
        targetCount: newCount,
        allocatedBudget: newCount * next[tierIndex].estimatedAvgCost,
        totalExpectedGmv: newCount * next[tierIndex].estimatedGmvPerKoc
      };
      return next;
    });
  };

  const handleUpdateTierCountDirect = (tierIndex: number, val: number) => {
    setCurrentBreakdown(prev => {
      const next = [...prev];
      const newCount = Math.max(0, isNaN(val) ? 0 : val);
      next[tierIndex] = {
        ...next[tierIndex],
        targetCount: newCount,
        allocatedBudget: newCount * next[tierIndex].estimatedAvgCost,
        totalExpectedGmv: newCount * next[tierIndex].estimatedGmvPerKoc
      };
      return next;
    });
  };

  const handleUpdateTierCost = (tierIndex: number, newCost: number) => {
    setCurrentBreakdown(prev => {
      const next = [...prev];
      const cost = Math.max(0, isNaN(newCost) ? 0 : newCost);
      next[tierIndex] = {
        ...next[tierIndex],
        estimatedAvgCost: cost,
        allocatedBudget: next[tierIndex].targetCount * cost
      };
      return next;
    });
  };

  const handleUpdateTierGmv = (tierIndex: number, newGmv: number) => {
    setCurrentBreakdown(prev => {
      const next = [...prev];
      const gmv = Math.max(0, isNaN(newGmv) ? 0 : newGmv);
      next[tierIndex] = {
        ...next[tierIndex],
        estimatedGmvPerKoc: gmv,
        totalExpectedGmv: next[tierIndex].targetCount * gmv
      };
      return next;
    });
  };

  const handleUpdateTierNotes = (tierIndex: number, notes: string) => {
    setCurrentBreakdown(prev => {
      const next = [...prev];
      next[tierIndex] = { ...next[tierIndex], notes };
      return next;
    });
  };

  // Strategy Presets
  const applyPreset = (presetType: 'GMV_MAX' | 'BRAND_PUSH' | 'BALANCED') => {
    let newBreakdown: GrowthDemandBreakdownTier[] = [];
    if (presetType === 'GMV_MAX') {
      // 0 Celeb, 2 Macro (36M), 12 Micro (54M), 60 Affiliate (60M)
      newBreakdown = currentBreakdown.map(t => {
        if (t.tier === 'TIER_1_CELEB') {
          return { ...t, targetCount: 0, estimatedAvgCost: 35000000, estimatedGmvPerKoc: 140000000 };
        }
        if (t.tier === 'TIER_2_MACRO') {
          return { ...t, targetCount: 2, estimatedAvgCost: 18000000, estimatedGmvPerKoc: 95000000 };
        }
        if (t.tier === 'TIER_3_MICRO') {
          return { ...t, targetCount: 12, estimatedAvgCost: 4500000, estimatedGmvPerKoc: 32000000 };
        }
        return { ...t, targetCount: 60, estimatedAvgCost: 1000000, estimatedGmvPerKoc: 11000000 };
      });
    } else if (presetType === 'BRAND_PUSH') {
      // 2 Celeb (70M), 3 Macro (54M), 4 Micro (18M), 8 Affiliate (8M)
      newBreakdown = currentBreakdown.map(t => {
        if (t.tier === 'TIER_1_CELEB') {
          return { ...t, targetCount: 2, estimatedAvgCost: 35000000, estimatedGmvPerKoc: 150000000 };
        }
        if (t.tier === 'TIER_2_MACRO') {
          return { ...t, targetCount: 3, estimatedAvgCost: 18000000, estimatedGmvPerKoc: 90000000 };
        }
        if (t.tier === 'TIER_3_MICRO') {
          return { ...t, targetCount: 4, estimatedAvgCost: 4500000, estimatedGmvPerKoc: 28000000 };
        }
        return { ...t, targetCount: 8, estimatedAvgCost: 1000000, estimatedGmvPerKoc: 9000000 };
      });
    } else {
      // Balanced Upbase: 1 Celeb (35M), 3 Macro (54M), 8 Micro (36M), 25 Affiliate (25M)
      newBreakdown = currentBreakdown.map(t => {
        if (t.tier === 'TIER_1_CELEB') {
          return { ...t, targetCount: 1, estimatedAvgCost: 35000000, estimatedGmvPerKoc: 140000000 };
        }
        if (t.tier === 'TIER_2_MACRO') {
          return { ...t, targetCount: 3, estimatedAvgCost: 18000000, estimatedGmvPerKoc: 90000000 };
        }
        if (t.tier === 'TIER_3_MICRO') {
          return { ...t, targetCount: 8, estimatedAvgCost: 4500000, estimatedGmvPerKoc: 31500000 };
        }
        return { ...t, targetCount: 25, estimatedAvgCost: 1000000, estimatedGmvPerKoc: 11000000 };
      });
    }

    // Recalculate allocated & GMV
    newBreakdown = newBreakdown.map(t => ({
      ...t,
      allocatedBudget: t.targetCount * t.estimatedAvgCost,
      totalExpectedGmv: t.targetCount * t.estimatedGmvPerKoc
    }));

    setCurrentBreakdown(newBreakdown);
    if (onNotify) {
      onNotify(`✨ Đã áp dụng chiến lược phân bổ: ${presetType === 'GMV_MAX' ? 'Tối Đa Hóa GMV' : presetType === 'BRAND_PUSH' ? 'Nhận Diện & Trust' : 'Tỷ Lệ Vàng Upbase'}`);
    }
  };

  // Save Plan Action
  const handleSavePlan = (newStatus?: GrowthDemandStatus) => {
    setDemands(prev => prev.map(d => {
      if (d.id === activeDemand.id) {
        return {
          ...d,
          breakdown: currentBreakdown,
          bookingStrategyNotes: strategyNotes,
          status: newStatus || (d.status === 'PENDING_BREAKDOWN' ? 'PLANNED' : d.status),
          approvedAt: newStatus === 'LEAD_APPROVED' ? new Date().toISOString() : d.approvedAt
        };
      }
      return d;
    }));

    if (onNotify) {
      if (newStatus === 'LEAD_APPROVED') {
        onNotify(`🎉 Quản lý đã phê duyệt Kế hoạch phân bổ ${activeDemand.code}! Kích hoạt chuyển giao sang Booking Execution.`);
      } else {
        onNotify(`💾 Đã lưu thành công Kế hoạch phân bổ cho ${activeDemand.code} (${activeDemand.brandName})!`);
      }
    }
  };

  // Convert to Deals
  const handleGenerateDeals = () => {
    handleSavePlan('LEAD_APPROVED');
    if (onGenerateDealsFromPlan) {
      onGenerateDealsFromPlan({
        ...activeDemand,
        breakdown: currentBreakdown,
        bookingStrategyNotes: strategyNotes,
        status: 'LEAD_APPROVED'
      });
    }
    if (onNotify) {
      onNotify(`⚡ Đã tự động khởi tạo ${totalKocCount} vị trí Deal Booking từ Kế Hoạch ${activeDemand.code}! Bàn giao nhân sự Booking tác nghiệp.`);
    }
  };

  const handleExportPlan = async () => {
    try {
      await exportPlanOrderToExcel(activeDemand, currentBreakdown);
      if (onNotify) {
        onNotify(`📊 Đã xuất file Excel Kế hoạch 4.1 thành công cho ${activeDemand.code}!`);
      }
    } catch (err) {
      console.error(err);
      if (onNotify) {
        onNotify('❌ Lỗi khi xuất file Excel kế hoạch.');
      }
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadWeeklyTemplate411();
      if (onNotify) {
        onNotify('📥 Đã tải xuống biểu mẫu Template Input Plan 4.1.1!');
      }
    } catch (err) {
      console.error(err);
      if (onNotify) {
        onNotify('❌ Lỗi khi tải biểu mẫu template.');
      }
    }
  };

  const filteredDemands = demands.filter(d => {
    if (statusFilter === 'ALL') return true;
    return d.status === statusFilter;
  });

  const pendingCount = demands.filter(d => d.status === 'PENDING_BREAKDOWN').length;

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. HEADER & OVERVIEW BAR                                                 */}
      {/* ========================================================================= */}
      <div className="card-enterprise p-5 bg-white border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-2xs" />
              <h2 className="text-base font-bold text-slate-900 tracking-tight uppercase">
                BÀN LÀM VIỆC: PHÂN BỔ KOC / KOL TỪ YÊU CẦU GROWTH
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Luồng Handoff Growth ➔ Booking
              </span>
              {pendingCount > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded font-bold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1 shadow-2xs">
                  <Clock className="w-3 h-3 text-amber-600" />
                  {pendingCount} Yêu Cầu Chờ Lập Plan
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Nhận đề bài ngân sách &amp; GMV từ Growth Lead ➔ Break-down chi tiết số lượng KOC theo 4 Level (Celeb, Macro, Micro, Affiliate) &amp; dự phóng CIR thời gian thực.
            </p>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs self-start lg:self-auto">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer ${
                statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất Cả ({demands.length})
            </button>
            <button
              onClick={() => setStatusFilter('PENDING_BREAKDOWN')}
              className={`px-3 py-1 rounded-md font-semibold transition flex items-center gap-1 cursor-pointer ${
                statusFilter === 'PENDING_BREAKDOWN' ? 'bg-amber-600 text-white shadow-2xs' : 'text-amber-700 hover:text-amber-800'
              }`}
            >
              Chờ Lập Plan ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('PLANNED')}
              className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer ${
                statusFilter === 'PLANNED' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đã Lập ({demands.filter(d => d.status === 'PLANNED').length})
            </button>
            <button
              onClick={() => setStatusFilter('LEAD_APPROVED')}
              className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer ${
                statusFilter === 'LEAD_APPROVED' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-700 hover:text-emerald-800'
              }`}
            >
              Đã Duyệt ({demands.filter(d => d.status === 'LEAD_APPROVED').length})
            </button>
          </div>
        </div>

        {/* Growth Demands Carousel / Selector Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {filteredDemands.map(demand => {
            const isSelected = demand.id === activeDemand.id;
            return (
              <div
                key={demand.id}
                onClick={() => handleSelectDemand(demand)}
                className={`p-3.5 rounded-xl border cursor-pointer transition text-left flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-50/80 border-blue-500 shadow-xs ring-1 ring-blue-500/40'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 shadow-2xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                      {demand.code}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                      demand.status === 'PENDING_BREAKDOWN' ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse' :
                      demand.status === 'PLANNED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      demand.status === 'LEAD_APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                      'bg-purple-50 text-purple-700 border-purple-200'
                    }`}>
                      {demand.status === 'PENDING_BREAKDOWN' ? 'Chờ Lập Plan' :
                       demand.status === 'PLANNED' ? 'Đã Lập Xong' :
                       demand.status === 'LEAD_APPROVED' ? 'Đã Phê Duyệt' : 'Đang Chạy'}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{demand.brandName}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{demand.title}</p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Ngân Sách Cấp</span>
                    <span className="font-bold text-emerald-600 font-mono">
                      {(demand.totalAssignedBudget / 1000000).toLocaleString('vi-VN')}M đ
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px]">Mục Tiêu GMV</span>
                    <span className="font-bold text-blue-600 font-mono">
                      {(demand.targetGmv / 1000000).toLocaleString('vi-VN')}M đ
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ACTIVE DEMAND WORKSPACE & VALIDATION GAUGES                            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Interactive Breakdown Form */}
        <div className="lg:col-span-2 space-y-5">
          {/* Active Demand Info Banner */}
          <div className="card-enterprise p-5 bg-white border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    {activeDemand.code}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">{activeDemand.title}</h3>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 mt-1.5 flex-wrap">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <strong>Growth PIC:</strong> {activeDemand.growthPic}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <strong>Booking PIC:</strong> {activeDemand.bookingPic}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <strong>Tháng:</strong> {activeDemand.month}
                  </span>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="text-right">
                <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded border ${
                  activeDemand.status === 'PENDING_BREAKDOWN' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                  activeDemand.status === 'PLANNED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  activeDemand.status === 'LEAD_APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                  'bg-purple-50 text-purple-700 border-purple-200'
                }`}>
                  {activeDemand.status === 'PENDING_BREAKDOWN' ? 'Chờ Lập Kế Hoạch' :
                   activeDemand.status === 'PLANNED' ? 'Đã Lập (Chờ Duyệt)' :
                   activeDemand.status === 'LEAD_APPROVED' ? 'Lead Đã Duyệt' : 'Đang Triển Khai'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">
                  Hạn chót: {activeDemand.deadlineBreakdown}
                </span>
              </div>
            </div>

            {/* Growth Brief Notes */}
            <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <span className="font-bold text-amber-800 flex items-center gap-1.5 mb-1">
                <Info className="w-3.5 h-3.5 text-amber-600" />
                Định hướng &amp; Yêu cầu trọng tâm từ Growth Team:
              </span>
              <p className="text-slate-700 leading-relaxed">{activeDemand.growthNotes}</p>
            </div>

            {/* Quick Strategy Presets */}
            <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Gợi ý phân bổ 1-Click:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => applyPreset('GMV_MAX')}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                >
                  🚀 Tối Đa Hóa GMV (Micro + Affiliate)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('BRAND_PUSH')}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition cursor-pointer"
                >
                  👑 Đẩy Thương Hiệu &amp; Trust (Celeb + Macro)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('BALANCED')}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition cursor-pointer"
                >
                  ⚖️ Tỷ Lệ Vàng Upbase (Chuẩn 4 Cấp)
                </button>
              </div>
            </div>

            {/* 📥 Nạp Dữ Liệu Kế Hoạch Thực Tế Từ File 4.1.1 Input Plan */}
            <div className="mt-3 p-3 rounded-lg bg-blue-50/60 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-blue-600" />
                  Nạp Kế Hoạch Tuần Thực Tế (File 4.1.1 - 7 Bậc KL1-KL7):
                </span>
                <select
                  value={selectedPlan411Id}
                  onChange={(e) => setSelectedPlan411Id(e.target.value)}
                  className="text-xs bg-white text-slate-800 border border-slate-300 rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer"
                >
                  {MOCK_WEEKLY_PLANS_411.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.week} • {p.storeName} ({p.totalAffiliateBudget.toLocaleString()}đ)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-[11px] text-slate-600 font-mono hidden md:block">
                  KL1:{activePlan411.kocTiersCount.kl1} | KL2:{activePlan411.kocTiersCount.kl2} | KL3:{activePlan411.kocTiersCount.kl3} | KL4:{activePlan411.kocTiersCount.kl4} | KL5:{activePlan411.kocTiersCount.kl5} | KL6:{activePlan411.kocTiersCount.kl6} | KL7:{activePlan411.kocTiersCount.kl7}
                </div>
                <button
                  type="button"
                  onClick={handleApplyPlan411}
                  className="px-3 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-2xs flex items-center gap-1 cursor-pointer"
                >
                  Áp Dụng
                </button>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg transition flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Tải biểu mẫu Excel chuẩn 4.1.1 để điền số"
                >
                  <Download className="w-3 h-3 text-emerald-600" />
                  Mẫu 4.1.1
                </button>
              </div>
            </div>
          </div>

          {/* 4 Chân Kiềng Của Plan Tổng: KOC Affiliate | Self-Channel | Livestream | Đối Soát 4 Cột */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 overflow-x-auto">
            <button
              type="button"
              onClick={() => setChannelTab('AFFILIATE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                channelTab === 'AFFILIATE' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              1. Video KOC Affiliate (KL1-KL7)
            </button>

            <button
              type="button"
              onClick={() => setChannelTab('SELF_CHANNEL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                channelTab === 'SELF_CHANNEL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Video className="w-3.5 h-3.5 text-purple-600" />
              2. Video Self-Channel (Inhouse &amp; Reup)
            </button>

            <button
              type="button"
              onClick={() => setChannelTab('LIVESTREAM')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                channelTab === 'LIVESTREAM' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Tv className="w-3.5 h-3.5 text-amber-600" />
              3. Livestream (Inhouse &amp; CTV)
            </button>

            <button
              type="button"
              onClick={() => setChannelTab('FOUR_STAGE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                channelTab === 'FOUR_STAGE' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
              4. Đối Soát 4 Cột &amp; NMV Gap
            </button>
          </div>

          {/* Interactive Tier Breakdown Table (Tab 1: KOC Affiliate) */}
          {channelTab === 'AFFILIATE' && (
          <div className="card-enterprise p-5 bg-white border border-slate-200 shadow-xs overflow-x-auto">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  BẢNG PHÂN BỔ SỐ LƯỢNG KOC &amp; DỰ PHÓNG NGÂN SÁCH THEO 4 LEVEL
                </h4>
                <p className="text-[11px] text-slate-500">
                  Điều chỉnh số lượng và đơn giá dự kiến để hệ thống tự động cân đối ngân sách và doanh số kỳ vọng.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-700 px-2.5 py-1 rounded bg-slate-100 border border-slate-200">
                Tổng Target: <strong className="text-blue-600">{totalKocCount} KOCs</strong>
              </span>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                  <th className="py-2.5 px-3 font-semibold">Cấp Độ KOC / KOL</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Số Lượng Target</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Đơn Giá TB / KOC</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Ngân Sách Phân Bổ</th>
                  <th className="py-2.5 px-3 font-semibold text-right">GMV Dự Phóng / KOC</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Tổng GMV Dự Kiến</th>
                  <th className="py-2.5 px-3 font-semibold text-center">ROI Dự Phóng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {currentBreakdown.map((tierItem, idx) => {
                  const tierBudget = tierItem.targetCount * tierItem.estimatedAvgCost;
                  const tierGmv = tierItem.targetCount * tierItem.estimatedGmvPerKoc;
                  const tierRoi = tierBudget > 0 ? (tierGmv / tierBudget).toFixed(1) : '0.0';
                  const budgetShare = totalAllocatedBudget > 0 ? ((tierBudget / totalAllocatedBudget) * 100).toFixed(0) : '0';

                  return (
                    <tr key={tierItem.tier} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 text-xs">{tierItem.tierLabel}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{tierItem.salaryGradeLabel}</div>
                        <input
                          type="text"
                          placeholder="Ghi chú chiến lược tier..."
                          value={tierItem.notes || ''}
                          onChange={(e) => handleUpdateTierNotes(idx, e.target.value)}
                          className="mt-1 w-full text-[10px] bg-white text-slate-800 border border-slate-200 rounded px-2 py-0.5 focus:border-blue-500 outline-none"
                        />
                      </td>

                      {/* Quantity Controller with +/- buttons */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateTierCount(idx, -1)}
                            className="w-5 h-5 flex items-center justify-center rounded bg-white hover:bg-slate-100 text-slate-700 font-bold transition shadow-2xs cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={tierItem.targetCount}
                            onChange={(e) => handleUpdateTierCountDirect(idx, parseInt(e.target.value) || 0)}
                            className="w-10 text-center font-bold text-slate-900 bg-transparent outline-none text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateTierCount(idx, 1)}
                            className="w-5 h-5 flex items-center justify-center rounded bg-white hover:bg-slate-100 text-slate-700 font-bold transition shadow-2xs cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Unit Cost */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            step="500000"
                            value={tierItem.estimatedAvgCost}
                            onChange={(e) => handleUpdateTierCost(idx, parseInt(e.target.value) || 0)}
                            className="w-24 text-right font-mono text-xs bg-white text-emerald-700 border border-slate-300 rounded px-1.5 py-1 focus:border-emerald-500 outline-none"
                          />
                          <span className="text-[10px] text-slate-400">đ</span>
                        </div>
                      </td>

                      {/* Allocated Budget */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        <div>{(tierBudget).toLocaleString('vi-VN')} đ</div>
                        <div className="text-[10px] text-slate-500 font-normal">
                          Tỷ trọng: {budgetShare}%
                        </div>
                      </td>

                      {/* Forecast GMV / KOC */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            step="1000000"
                            value={tierItem.estimatedGmvPerKoc}
                            onChange={(e) => handleUpdateTierGmv(idx, parseInt(e.target.value) || 0)}
                            className="w-24 text-right font-mono text-xs bg-white text-blue-700 border border-slate-300 rounded px-1.5 py-1 focus:border-blue-500 outline-none"
                          />
                          <span className="text-[10px] text-slate-400">đ</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-normal">
                          Benchmark: {tierItem.historicalRoiBenchmark}x
                        </div>
                      </td>

                      {/* Total Expected GMV */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-blue-600">
                        <div>{(tierGmv).toLocaleString('vi-VN')} đ</div>
                      </td>

                      {/* Tier ROI */}
                      <td className="py-3 px-3 text-center">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                          parseFloat(tierRoi) >= 6.0 ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                          parseFloat(tierRoi) >= 4.0 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-amber-50 text-amber-800 border-amber-300'
                        }`}>
                          {tierRoi}x
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold text-xs">
                  <td className="py-3 px-3 text-slate-900">TỔNG CỘNG TOÀN CHIẾN DỊCH</td>
                  <td className="py-3 px-3 text-center text-blue-600">{totalKocCount} KOCs</td>
                  <td className="py-3 px-3 text-right text-slate-400">—</td>
                  <td className={`py-3 px-3 text-right font-mono ${isOverBudget ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {(totalAllocatedBudget).toLocaleString('vi-VN')} đ
                  </td>
                  <td className="py-3 px-3 text-right text-slate-400">—</td>
                  <td className="py-3 px-3 text-right font-mono text-blue-600">
                    {(totalExpectedGmv).toLocaleString('vi-VN')} đ
                  </td>
                  <td className="py-3 px-3 text-center text-amber-700">
                    {projectedRoi.toFixed(1)}x
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          )}

          {/* Tab 2: Video Self-Channel (Inhouse & Reup Đa Kênh) */}
          {channelTab === 'SELF_CHANNEL' && (
            <div className="card-enterprise p-5 bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Video className="w-4 h-4 text-purple-600" />
                    KẾ HOẠCH VIDEO SELF-CHANNEL (KÊNH THƯƠNG HIỆU INHOUSE)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Sản xuất nội dung độc quyền bởi Content Team Upbase và phân phối Reup đa nền tảng để phủ sóng sản phẩm.
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-700 px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200">
                  Tiết kiệm ~45.000.000đ chi phí Cast KOC
                </span>
              </div>

              {/* KPI Mini-cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500">Video Sản Xuất Mới</div>
                  <div className="text-base font-bold text-slate-900 mt-1">24 Videos Plan</div>
                  <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Đã hoàn thành 18/24 (75%)</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500">Ngân Sách Sản Xuất Inhouse</div>
                  <div className="text-base font-bold text-slate-900 mt-1">18.000.000đ</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">750.000đ / video dựng &amp; kịch bản</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500">Chi Phí Đã Giải Ngân (MTD)</div>
                  <div className="text-base font-bold text-purple-600 mt-1">14.200.000đ</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Tiến độ ngân sách: 78.8%</div>
                </div>
              </div>

              {/* Reup Matrix Table */}
              <div className="pt-2">
                <h5 className="text-xs font-semibold text-slate-800 mb-2">Ma Trận Phân Phối Reup Đa Kênh (Theo Cột 211-215 Sheet 4.1):</h5>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                      <th className="py-2 px-3">Kênh Phân Phối</th>
                      <th className="py-2 px-3 text-center">Chỉ Tiêu Reup (Plan)</th>
                      <th className="py-2 px-3 text-center">Đã Reup Thực Tế</th>
                      <th className="py-2 px-3 text-center">Tiến Độ</th>
                      <th className="py-2 px-3 text-right">Chi Phí Bình Quân/Kênh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">TikTok Shop (Kênh Chính)</td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-700">24 video</td>
                      <td className="py-2.5 px-3 text-center font-mono text-emerald-700 font-bold">18 video</td>
                      <td className="py-2.5 px-3 text-center text-emerald-700 font-semibold">75%</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">0đ (Inhouse)</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">Shopee Video (Gắn Giỏ Hàng)</td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-700">24 video</td>
                      <td className="py-2.5 px-3 text-center font-mono text-emerald-700 font-bold">18 video</td>
                      <td className="py-2.5 px-3 text-center text-emerald-700 font-semibold">75%</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">0đ</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">Facebook Reels / Fanpage</td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-700">20 video</td>
                      <td className="py-2.5 px-3 text-center font-mono text-blue-600 font-bold">15 video</td>
                      <td className="py-2.5 px-3 text-center text-blue-600 font-semibold">75%</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">0đ</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">Threads Video (Tương Tác Viral)</td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-700">12 video</td>
                      <td className="py-2.5 px-3 text-center font-mono text-purple-600 font-bold">10 video</td>
                      <td className="py-2.5 px-3 text-center text-purple-600 font-semibold">83%</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">0đ</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Livestream Gian Hàng (Inhouse & CTV) */}
          {channelTab === 'LIVESTREAM' && (
            <div className="card-enterprise p-5 bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Tv className="w-4 h-4 text-amber-600" />
                    KẾ HOẠCH LIVESTREAM GIAN HÀNG (INHOUSE HN/HCM &amp; CTV)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Phân bổ phiên live định kỳ 3h (Inhouse) và 2h (CTV) nhằm giữ nhịp chuyển đổi trong các khung giờ vàng.
                  </p>
                </div>
                <span className="text-xs font-bold text-amber-800 px-2.5 py-1 rounded bg-amber-50 border border-amber-200">
                  Tổng 34 Phiên • 92 Giờ Live
                </span>
              </div>

              {/* KPI Live */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500">Inhouse Studio HCM (3h)</div>
                  <div className="text-base font-bold text-slate-900 mt-1">16 Phiên</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">48 giờ live</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500">Inhouse Studio HN (3h)</div>
                  <div className="text-base font-bold text-slate-900 mt-1">8 Phiên</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">24 giờ live</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500">CTV Live Ngoài (2h)</div>
                  <div className="text-base font-bold text-slate-900 mt-1">10 Phiên</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">20 giờ live</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500">Target NMV Live</div>
                  <div className="text-base font-bold text-emerald-600 mt-1">250.000.000đ</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Chi phí: 35.000.000đ</div>
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-900">
                <span className="font-semibold text-blue-800">Quy chuẩn SLA Livestream:</span> Phiên live Inhouse phải setup trước 30 phút, kiểm tra đường truyền và voucher sàn độc quyền. Nếu rớt live quá 15 phút, PIC livestream phải lập biên bản bù giờ.
              </div>
            </div>
          )}

          {/* Tab 4: Đối Soát 4 Cột & NMV Gap (Chuẩn Sheet 4.1) */}
          {channelTab === 'FOUR_STAGE' && (
            <div className="card-enterprise p-5 bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-600" />
                    BẢNG ĐỐI SOÁT 4 CỘT: PLAN ➔ DUYỆT ➔ ĐIỀU CHỈNH ➔ THỰC TẾ MTD
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Theo dõi sát vòng đời ngân sách và chênh lệch Gap NMV thực thu sau khi trừ tỷ lệ hủy đơn của sàn.
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-700 px-2.5 py-1 rounded bg-slate-100 border border-slate-200">
                  Tỷ Lệ Hủy: <strong className="text-amber-600 font-bold">8.0%</strong>
                </span>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                    <th className="py-2.5 px-3">Hạng Mục</th>
                    <th className="py-2.5 px-3 text-right">1. (Plan) Đầu Tháng</th>
                    <th className="py-2.5 px-3 text-right">2. (Duyệt) Leader</th>
                    <th className="py-2.5 px-3 text-right">3. (Sau Đ/C) Giữa Kỳ</th>
                    <th className="py-2.5 px-3 text-right">4. (Report) MTD</th>
                    <th className="py-2.5 px-3 text-right">GAP Chênh Lệch</th>
                    <th className="py-2.5 px-3 text-center">Đánh Giá Tiến Độ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">Ngân Sách Video Affiliate</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">150.000.000đ</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">150.000.000đ</td>
                    <td className="py-2.5 px-3 text-right font-mono text-blue-700">155.000.000đ</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">114.000.000đ</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-500">+41.000.000đ</td>
                    <td className="py-2.5 px-3 text-center text-emerald-700 font-semibold">Đúng tiến độ (73.5%)</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">Ngân Sách Self-Channel</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">18.000.000đ</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">18.000.000đ</td>
                    <td className="py-2.5 px-3 text-right font-mono text-blue-700">18.000.000đ</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">14.200.000đ</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-500">+3.800.000đ</td>
                    <td className="py-2.5 px-3 text-center text-emerald-700 font-semibold">Đúng tiến độ (78.8%)</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">Ngân Sách Livestream</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">35.000.000đ</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">35.000.000đ</td>
                    <td className="py-2.5 px-3 text-right font-mono text-blue-700">35.000.000đ</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">28.500.000đ</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-500">+6.500.000đ</td>
                    <td className="py-2.5 px-3 text-center text-emerald-700 font-semibold">Đúng tiến độ (81.4%)</td>
                  </tr>
                  <tr className="hover:bg-slate-50 border-t border-slate-200 bg-slate-50/70 font-bold">
                    <td className="py-2.5 px-3 text-slate-900">TỔNG CHI PHÍ THÚC ĐẨY</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-900">203.000.000đ</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-900">203.000.000đ</td>
                    <td className="py-2.5 px-3 text-right font-mono text-blue-700">208.000.000đ</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700">156.700.000đ</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-500">+51.300.000đ</td>
                    <td className="py-2.5 px-3 text-center text-emerald-700">Trong hạn mức</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-semibold text-blue-700">GMV Kế Hoạch (Gộp)</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">750.000.000đ</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">750.000.000đ</td>
                    <td className="py-2.5 px-3 text-right font-mono text-blue-700">770.000.000đ</td>
                    <td className="py-2.5 px-3 text-right font-mono text-blue-700 font-bold">556.000.000đ</td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-700">-214.000.000đ</td>
                    <td className="py-2.5 px-3 text-center text-blue-700 font-semibold">Đạt 72.2% MTD</td>
                  </tr>
                  <tr className="hover:bg-slate-50 bg-emerald-50/60 font-bold border-t border-emerald-200">
                    <td className="py-3 px-3 text-emerald-900">NMV THUẦN (TRỪ HỦY 8%)</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-900">690.000.000đ</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-900">690.000.000đ</td>
                    <td className="py-3 px-3 text-right font-mono text-blue-700">708.400.000đ</td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-700 text-sm">511.520.000đ</td>
                    <td className="py-3 px-3 text-right font-mono text-amber-700">-196.880.000đ</td>
                    <td className="py-3 px-3 text-center text-emerald-700">Cần chạy nước rút D-Day</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Booking Strategy Textarea */}
          <div className="card-enterprise p-4 bg-white border border-slate-200 shadow-xs">
            <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-blue-600" />
              Chiến Lược Triển Khai &amp; Danh Sách KOC Đề Xuất (Booking PIC Note):
            </h4>
            <textarea
              rows={3}
              value={strategyNotes}
              onChange={(e) => setStrategyNotes(e.target.value)}
              placeholder="Nhập ghi chú chiến lược tiếp cận, danh sách KOC dự kiến đưa vào pool, kế hoạch gửi mẫu hoặc thỏa thuận độc quyền..."
              className="w-full text-xs bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none leading-relaxed"
            />
          </div>
        </div>

        {/* Right Col: Real-time Headroom Radar & Action Box */}
        <div className="space-y-5">
          {/* Card 1: Budget Headroom Radar */}
          <div className={`card-enterprise p-5 border transition ${
            isOverBudget ? 'bg-rose-50/70 border-rose-300' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                KIỂM SOÁT NGÂN SÁCH
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                isOverBudget ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-emerald-50 text-emerald-700 border-emerald-300'
              }`}>
                {isOverBudget ? '⚠️ VƯỢT HẠN MỨC' : '✅ TRONG HẠN MỨC'}
              </span>
            </div>

            <div className="space-y-3 mt-4 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Ngân sách Growth cấp:</span>
                <span className="font-bold font-mono text-slate-900">
                  {(activeDemand.totalAssignedBudget).toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Tổng ngân sách đã chia:</span>
                <span className={`font-bold font-mono ${isOverBudget ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {(totalAllocatedBudget).toLocaleString('vi-VN')} đ
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                <div
                  className={`h-full transition-all duration-300 ${
                    isOverBudget ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, (totalAllocatedBudget / activeDemand.totalAssignedBudget) * 100)}%` }}
                />
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-slate-600 font-semibold">Khoảng trống còn lại:</span>
                <span className={`font-bold font-mono text-sm ${
                  isOverBudget ? 'text-rose-600' : 'text-emerald-600'
                }`}>
                  {budgetHeadroom >= 0 ? '+' : ''}{(budgetHeadroom / 1000000).toLocaleString('vi-VN')}M đ
                </span>
              </div>
              {isOverBudget && (
                <p className="text-[11px] text-rose-800 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                  ⚠️ Tổng ngân sách đang vượt <strong>{(Math.abs(budgetHeadroom) / 1000000).toFixed(1)}M đ</strong>. Hãy giảm số lượng KOC hoặc điều chỉnh đơn giá để đảm bảo tuân thủ hạn mức của Growth!
                </p>
              )}
            </div>
          </div>

          {/* Card 2: GMV & NMV Target & CIR Projection */}
          <div className="card-enterprise p-5 bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-blue-600" />
                MỤC TIÊU NMV &amp; GMV (THUẦN SAU HỦY)
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                nmvAchievementRate >= 100 ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}>
                {nmvAchievementRate >= 100 ? 'ĐẠT KỲ VỌNG' : 'CHƯA ĐẠT'}
              </span>
            </div>

            <div className="space-y-3 mt-4 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Target GMV gộp Growth giao:</span>
                <span className="font-bold font-mono text-slate-900">
                  {(activeDemand.targetGmv).toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Dự phóng GMV đạt được:</span>
                <span className="font-bold font-mono text-blue-600 text-sm">
                  {(totalExpectedGmv).toLocaleString('vi-VN')} đ
                </span>
              </div>

              {/* NMV Section */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">Tỷ lệ hủy đơn định mức:</span>
                  <span className="font-mono text-amber-700 font-semibold">{(cancellationRate * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-600 font-semibold">Target NMV thuần (Sau hủy):</span>
                  <span className="font-mono font-bold text-slate-800">{(targetNmv).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-200">
                  <span className="text-emerald-700 font-bold">Dự phóng NMV thực thu:</span>
                  <span className="font-mono font-bold text-emerald-700">{(projectedNmv).toLocaleString('vi-VN')} đ</span>
                </div>
              </div>

              {/* Progress */}
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${Math.min(100, nmvAchievementRate)}%` }}
                />
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-slate-600 font-semibold">% Đạt Target NMV Thuần:</span>
                <span className={`font-bold font-mono text-sm ${
                  nmvAchievementRate >= 100 ? 'text-emerald-600' : 'text-amber-700'
                }`}>
                  {nmvAchievementRate.toFixed(1)}%
                </span>
              </div>

              {/* CIR Projection */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">CIR trần (Growth yêu cầu):</span>
                  <span className="font-bold font-mono text-slate-800">{activeDemand.targetCir.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">CIR Dự phóng kế hoạch:</span>
                  <span className={`font-bold font-mono ${
                    projectedCir <= activeDemand.targetCir ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {projectedCir.toFixed(1)}% ({projectedCir <= activeDemand.targetCir ? 'Tốt hơn trần' : 'Vượt trần'})
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Blended ROI dự kiến:</span>
                  <span className="font-bold font-mono text-amber-700 text-sm">{projectedRoi.toFixed(1)}x</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Box With Validation Gate */}
          <div className="card-enterprise p-5 bg-white border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-200">
              THAO TÁC DUYỆT &amp; KIỂM SOÁT ĐỊNH MỨC
            </h4>

            {/* Validation Gate Alert */}
            {blockReasons.length > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-2">
                <div className="font-bold text-rose-800 flex items-center gap-1.5">
                  <AlertOctagon className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>CHẶN GỬI DUYỆT ({blockReasons.length} Cảnh Báo)</span>
                </div>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-rose-700">
                  {blockReasons.map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
                <div className="pt-2 border-t border-rose-200">
                  <label className="text-[10px] text-rose-800 font-semibold block mb-1">
                    Nhập giải trình ngoại lệ (để mở khóa gửi nếu Growth đã đồng ý):
                  </label>
                  <input
                    type="text"
                    value={exceptionExplanation}
                    onChange={(e) => setExceptionExplanation(e.target.value)}
                    placeholder="VD: Growth duyệt ngoại lệ đẩy mạnh Macro mở phễu..."
                    className="w-full text-[11px] bg-white border border-rose-300 rounded-lg px-2.5 py-1 text-slate-900 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => handleSavePlan()}
              className="w-full py-2.5 px-3 rounded-lg font-semibold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center justify-center gap-2 border border-slate-300 cursor-pointer shadow-2xs"
            >
              <Save className="w-3.5 h-3.5 text-blue-600" />
              Lưu Bản Nháp (Save Draft)
            </button>

            <button
              type="button"
              disabled={isBlocked}
              onClick={() => handleSavePlan('PLANNED')}
              className={`w-full py-2.5 px-3 rounded-lg font-bold text-xs transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer ${
                isBlocked
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              {isBlocked ? 'Bị Chặn Gửi (Cần Giải Trình)' : 'Trình Duyệt Lên Growth & Quản Lý'}
            </button>

            <button
              type="button"
              disabled={isBlocked}
              onClick={handleGenerateDeals}
              className={`w-full py-2.5 px-3 rounded-lg font-bold text-xs transition flex items-center justify-center gap-2 shadow-2xs border cursor-pointer ${
                isBlocked
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              Duyệt &amp; Khởi Tạo {totalKocCount} Deals Tác Nghiệp
            </button>

            {/* Excel Export & Template Action Buttons */}
            <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportPlan}
                className="py-2 px-2 rounded-lg font-semibold text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                title="Xuất trọn vẹn Kế hoạch 4 chặng & KOC 7 bậc sang file Excel .xlsx"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                Xuất Excel 4.1
              </button>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="py-2 px-2 rounded-lg font-semibold text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                title="Tải biểu mẫu Excel chuẩn 4.1.1 để PIC điền kế hoạch tuần"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                Mẫu Input 4.1.1
              </button>
            </div>
            <p className="text-[10px] text-slate-500 text-center">
              Khởi tạo tự động các deal booking vào phân hệ Quản Lý Booking để nhân viên bắt đầu tiếp cận KOC.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
