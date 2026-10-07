'use client';

import React, { useState, useMemo } from 'react';
import {
  Layers,
  Calculator,
  DollarSign,
  Video,
  Sparkles,
  TrendingUp,
  Download,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Send,
  Plus,
  Minus,
  SlidersHorizontal,
  FileSpreadsheet,
  Tv,
  Share2,
  Check,
  ChevronDown,
  Flame,
  ArrowRight,
  Zap,
  Building2,
  Calendar,
  User,
  FlaskConical,
  Dices,
  PieChart,
  BarChart3,
  Sliders,
  LayoutGrid,
  Table as TableIcon,
  HelpCircle,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Coins
} from 'lucide-react';
import { 
  InputPlanBreakdownState, 
  InputPlanRowItem, 
  UserProfile, 
  StaffDetailedPlanItem,
  SalaryGrade,
  WeeklyStorePlan411
} from '../../lib/types';
import { 
  BENCHMARK_COSTS, 
  CONTENT_FORMAT_OPTIONS, 
  INITIAL_INPUT_PLAN_STATE, 
  autoBalancePlanItems,
  MOCK_PLAN_SCENARIOS,
  generateRandomMockPlan,
  MockPlanScenario
} from '../../lib/inputPlanDefaults';
import { exportInputPlanStudioToExcel } from '../../lib/excelExport';

interface InputPlanBreakdownViewProps {
  currentUser?: UserProfile;
  onNotify?: (msg: string) => void;
  onGenerateDealsFromPlan?: (slots: StaffDetailedPlanItem[]) => void;
  onApplyPlanToWeeklyStore?: (planData: WeeklyStorePlan411) => void;
}

export const InputPlanBreakdownView: React.FC<InputPlanBreakdownViewProps> = ({
  currentUser,
  onNotify,
  onGenerateDealsFromPlan,
  onApplyPlanToWeeklyStore
}) => {
  // Main Plan State (default from Fresh balanced scenario)
  const [planState, setPlanState] = useState<InputPlanBreakdownState>(MOCK_PLAN_SCENARIOS[0].state);
  const [activeScenarioId, setActiveScenarioId] = useState<string>(MOCK_PLAN_SCENARIOS[0].id);

  // Active Channel Sub-Tab
  const [activeTab, setActiveTab] = useState<'TIKTOK' | 'MULTI_PLATFORM' | 'SELF_CHANNEL' | 'LIVESTREAM' | 'ALL_SUMMARY' | 'EXCEL_PREVIEW'>('TIKTOK');

  // View Mode: 'CARDS' (Intuitive & Visual) or 'TABLE' (Clean & Fast)
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('TABLE');

  const notify = (msg: string) => {
    if (onNotify) onNotify(msg);
  };

  // Brand Options
  const BRAND_OPTIONS = [
    { name: 'Fresh_TikTok_E2E-C', label: 'Fresh (Mỹ phẩm & Chăm sóc da)' },
    { name: 'Face Republic_TikTok_E2E-O', label: 'Face Republic (Dược mỹ phẩm)' },
    { name: 'Clio_TikTok_E2E-C', label: 'Clio Cosmetics (Make-up chuẩn Hàn)' },
    { name: 'Senka_TikTok_E2E-C', label: 'Senka (Chăm sóc da & Làm sạch)' },
    { name: 'TM Clean_TikTok_E2E-C', label: 'TM Clean (Gia dụng & Chăm sóc nhà)' },
    { name: 'Innisfree_TikTok_E2E-C', label: 'Innisfree (Trà xanh dưỡng da)' }
  ];

  const PIC_OPTIONS = [
    'Đặng Mai Hà Linh',
    'Khánh Vy',
    'Nguyễn Thu Trang',
    'Phạm Thị Thu Hằng',
    'Trần Minh Đức',
    'Lê Hoàng Yến',
    'Phan Diệu Ánh'
  ];

  const WEEK_OPTIONS = [
    'W40 [25.09 - 01.10]',
    'W41 [05.10 - 11.10]',
    'W42 [12.10 - 18.10]',
    'W43 [19.10 - 25.10]',
    'W44 [26.10 - 31.10]'
  ];

  // -------------------------------------------------------------
  // REAL-TIME METRICS CALCULATIONS
  // -------------------------------------------------------------
  const totalAllocatedBudget = useMemo(() => {
    return planState.items.reduce((sum, item) => sum + item.totalBudget, 0);
  }, [planState.items]);

  const totalAllocatedContents = useMemo(() => {
    return planState.items.reduce((sum, item) => sum + item.qty, 0);
  }, [planState.items]);

  const totalProjectedGmv = useMemo(() => {
    return planState.items.reduce((sum, item) => sum + item.targetGmv, 0);
  }, [planState.items]);

  // Budget Headroom & Status
  const budgetHeadroom = planState.totalTargetBudget - totalAllocatedBudget;
  const isOverBudget = budgetHeadroom < 0;
  const budgetUsagePct = planState.totalTargetBudget > 0
    ? (totalAllocatedBudget / planState.totalTargetBudget) * 100
    : 0;

  // Content Headroom & Status
  const contentHeadroom = planState.totalTargetContents - totalAllocatedContents;
  const contentFillPct = planState.totalTargetContents > 0
    ? (totalAllocatedContents / planState.totalTargetContents) * 100
    : 0;

  // Channel Subtotals for Visual Breakdown
  const channelTotals = useMemo(() => {
    const tt = planState.items.filter(it => it.channel === 'TIKTOK');
    const mp = planState.items.filter(it => ['SHOPEE', 'FACEBOOK', 'INSTAGRAM', 'THREADS'].includes(it.channel));
    const sc = planState.items.filter(it => it.channel === 'SELF_CHANNEL');
    const lv = planState.items.filter(it => it.channel === 'LIVESTREAM');

    const sumBudget = (list: typeof tt) => list.reduce((s, i) => s + i.totalBudget, 0);
    const sumQty = (list: typeof tt) => list.reduce((s, i) => s + i.qty, 0);

    return {
      tiktok: { budget: sumBudget(tt), qty: sumQty(tt), pct: totalAllocatedBudget > 0 ? (sumBudget(tt) / totalAllocatedBudget) * 100 : 0 },
      multiPlatform: { budget: sumBudget(mp), qty: sumQty(mp), pct: totalAllocatedBudget > 0 ? (sumBudget(mp) / totalAllocatedBudget) * 100 : 0 },
      selfChannel: { budget: sumBudget(sc), qty: sumQty(sc), pct: totalAllocatedBudget > 0 ? (sumBudget(sc) / totalAllocatedBudget) * 100 : 0 },
      livestream: { budget: sumBudget(lv), qty: sumQty(lv), pct: totalAllocatedBudget > 0 ? (sumBudget(lv) / totalAllocatedBudget) * 100 : 0 }
    };
  }, [planState.items, totalAllocatedBudget]);

  // CIR & ROI Projected
  const projectedCir = totalProjectedGmv > 0 ? (totalAllocatedBudget / totalProjectedGmv) * 100 : 0;
  const projectedRoi = totalAllocatedBudget > 0 ? totalProjectedGmv / totalAllocatedBudget : 0;
  const blendedCostPerVideo = totalAllocatedContents > 0 ? Math.round(totalAllocatedBudget / totalAllocatedContents) : 0;

  // -------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------
  const handleUpdateItemQty = (id: string, newQty: number) => {
    const validQty = Math.max(0, isNaN(newQty) ? 0 : Math.round(newQty));
    setPlanState(prev => ({
      ...prev,
      items: prev.items.map(it => {
        if (it.id === id) {
          const newBudget = validQty * it.unitCost;
          return {
            ...it,
            qty: validQty,
            totalBudget: newBudget,
            targetGmv: newBudget * it.expectedRoiMultiplier
          };
        }
        return it;
      })
    }));
  };

  const handleAdjustItemQty = (id: string, delta: number) => {
    const item = planState.items.find(it => it.id === id);
    if (!item) return;
    handleUpdateItemQty(id, item.qty + delta);
  };

  const handleUpdateItemCost = (id: string, newCost: number) => {
    const validCost = Math.max(0, isNaN(newCost) ? 0 : Math.round(newCost));
    setPlanState(prev => ({
      ...prev,
      items: prev.items.map(it => {
        if (it.id === id) {
          const newBudget = it.qty * validCost;
          return {
            ...it,
            unitCost: validCost,
            totalBudget: newBudget,
            targetGmv: newBudget * it.expectedRoiMultiplier
          };
        }
        return it;
      })
    }));
  };

  const handleResetItemToBenchmark = (id: string) => {
    const item = planState.items.find(it => it.id === id);
    if (!item) return;
    const bench = item.benchmarkCost || BENCHMARK_COSTS[item.tierCode] || 1000000;
    handleUpdateItemCost(id, bench);
    notify(`🔄 Đơn giá ${item.tierLabel} đã khôi phục về benchmark ${(bench / 1000000).toFixed(2)}M đ`);
  };

  const handleUpdateItemFormat = (id: string, format: string) => {
    setPlanState(prev => ({
      ...prev,
      items: prev.items.map(it => it.id === id ? { ...it, contentFormat: format } : it)
    }));
  };

  const handleFillRemainingToItem = (id: string) => {
    const item = planState.items.find(it => it.id === id);
    if (!item) return;

    if (contentHeadroom <= 0) {
      notify(`⚠️ Số lượng nội dung đã đủ hoặc vượt chỉ tiêu (${totalAllocatedContents}/${planState.totalTargetContents})!`);
      return;
    }

    const newQty = item.qty + contentHeadroom;
    handleUpdateItemQty(id, newQty);
    notify(`⚡ Đã điền toàn bộ ${contentHeadroom} slot nội dung còn thiếu vào [${item.tierLabel.split(':')[0]}]!`);
  };

  const handleSelectScenario = (scenarioId: string) => {
    const sc = MOCK_PLAN_SCENARIOS.find(s => s.id === scenarioId);
    if (!sc) return;
    setActiveScenarioId(sc.id);
    setPlanState(JSON.parse(JSON.stringify(sc.state)));
    notify(`🧪 Đã nạp thành công bộ dữ liệu test: ${sc.name.split('—')[0]}!`);
  };

  const handleRandomizeScenario = () => {
    const randomPlan = generateRandomMockPlan();
    setActiveScenarioId('RANDOM');
    setPlanState(randomPlan);
    notify(`🎲 Đã sinh dữ liệu test ngẫu nhiên cho ${randomPlan.brandName.split('_')[0]} (${randomPlan.totalTargetContents} video / ${(randomPlan.totalTargetBudget / 1000000).toFixed(0)}M đ)!`);
  };

  const handleApplyPreset = (preset: 'BALANCED' | 'GMV_MAX' | 'BRAND_PUSH' | 'COST_SAVER') => {
    const balanced = autoBalancePlanItems(
      planState.items,
      planState.totalTargetBudget,
      planState.totalTargetContents,
      preset
    );
    setPlanState(prev => ({
      ...prev,
      strategyPreset: preset,
      items: balanced
    }));

    const presetNames: Record<string, string> = {
      BALANCED: 'Chuẩn Cân Bằng Upbase (Phủ đều KL1 ➔ KL5)',
      GMV_MAX: 'Tối Đa GMV Chốt Đơn (Tập trung Micro & Live)',
      BRAND_PUSH: 'Đẩy Mạnh Nhận Diện (Dồn KL5-KL7 & Video viral)',
      COST_SAVER: 'Tiết Kiệm Chi Phí (Tối đa KL1-KL2 & Reup sàn)'
    };
    notify(`⚡ Đã phân rã tự động theo chiến lược: ${presetNames[preset]}!`);
  };

  const handleExportExcel = async () => {
    try {
      await exportInputPlanStudioToExcel(planState);
      notify(`📥 Xuất file Excel 4.1.1 Input Plan thành công cho ${planState.brandName}!`);
    } catch (err: any) {
      console.error(err);
      notify(`❌ Lỗi khi xuất Excel: ${err?.message || 'Vui lòng thử lại'}`);
    }
  };

  const handleApplyToWeeklyPlan = () => {
    const getItem = (id: string) => planState.items.find(it => it.id === id);
    const newWeeklyPlan: WeeklyStorePlan411 = {
      id: `PLAN-411-${Date.now().toString().slice(-6)}`,
      month: planState.month,
      week: planState.week,
      pic: planState.pic,
      storeName: planState.brandName,
      tiktokAffiliateQty: planState.items.filter(it => it.channel === 'TIKTOK').reduce((s, it) => s + it.qty, 0),
      tapAffiliateQty: getItem('row-tt-tap')?.qty || 0,
      kocTiersCount: {
        kl1: getItem('row-tt-kl1')?.qty || 0,
        kl2: getItem('row-tt-kl2')?.qty || 0,
        kl3: getItem('row-tt-kl3')?.qty || 0,
        kl4: getItem('row-tt-kl4')?.qty || 0,
        kl5: getItem('row-tt-kl5')?.qty || 0,
        kl6: getItem('row-tt-kl6')?.qty || 0,
        kl7: getItem('row-tt-kl7')?.qty || 0
      },
      totalAffiliateBudget: planState.items.filter(it => it.channel === 'TIKTOK').reduce((s, it) => s + it.totalBudget, 0),
      tierBudgets: {
        kl1: getItem('row-tt-kl1')?.totalBudget || 0,
        kl2: getItem('row-tt-kl2')?.totalBudget || 0,
        kl3: getItem('row-tt-kl3')?.totalBudget || 0,
        kl4: getItem('row-tt-kl4')?.totalBudget || 0,
        kl5: getItem('row-tt-kl5')?.totalBudget || 0,
        kl6: getItem('row-tt-kl6')?.totalBudget || 0,
        kl7: getItem('row-tt-kl7')?.totalBudget || 0
      },
      actualBookedQty: 0,
      actualSpentBudget: 0,
      targetGmv: planState.targetGmv,
      notes: planState.notes
    };

    if (onApplyPlanToWeeklyStore) {
      onApplyPlanToWeeklyStore(newWeeklyPlan);
    }
    notify(`✅ Đã lưu kế hoạch ${planState.week} (${planState.brandName}) vào Sổ Kế Hoạch Tuần Thực Tế!`);
  };

  const handleGenerateBookingSlots = () => {
    const generatedSlots: StaffDetailedPlanItem[] = [];
    const brandOnly = planState.brandName.split('_')[0] || planState.brandName;

    planState.items.forEach(item => {
      if (item.qty <= 0) return;
      const slotsToGen = Math.min(item.qty, 8);
      for (let i = 1; i <= slotsToGen; i++) {
        const salaryGrade = (item.salaryGrade || (item.tierCode.startsWith('KL') ? item.tierCode : 'KL3')) as SalaryGrade;
        const kocTier = ['KL6', 'KL7'].includes(salaryGrade) 
          ? 'TIER_1_CELEB' 
          : ['KL4', 'KL5'].includes(salaryGrade) 
          ? 'TIER_2_MACRO' 
          : salaryGrade === 'KL3' 
          ? 'TIER_3_MICRO' 
          : 'TIER_4_AFFILIATE';

        generatedSlots.push({
          id: `slot-auto-${Date.now()}-${item.id}-${i}`,
          staffName: planState.pic,
          month: planState.month,
          brandName: brandOnly,
          tier: kocTier,
          salaryGrade: salaryGrade,
          targetWeek: 'W1',
          kocStageName: `[Slot ${item.tierLabel.split(':')[0]}] #${i}`,
          channelId: `@koc_${item.platform.toLowerCase()}_${i}`,
          tepKenh: 'Beauty',
          contentPillar: item.contentFormat,
          budgetEstimated: item.unitCost,
          targetGmv: item.unitCost * item.expectedRoiMultiplier,
          status: 'DRAFT',
          leadNotes: `Sinh tự động từ Input Plan Studio (${item.platform} - ${item.contentFormat})`,
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
        });
      }
    });

    if (onGenerateDealsFromPlan && generatedSlots.length > 0) {
      onGenerateDealsFromPlan(generatedSlots);
    }
    notify(`🚀 Đã sinh ${generatedSlots.length} slot KOC tác nghiệp và chuyển giao sang khâu Booking!`);
  };

  // Visible items based on activeTab
  const visibleItems = useMemo(() => {
    if (activeTab === 'TIKTOK') return planState.items.filter(it => it.channel === 'TIKTOK');
    if (activeTab === 'MULTI_PLATFORM') return planState.items.filter(it => ['SHOPEE', 'FACEBOOK', 'INSTAGRAM', 'THREADS'].includes(it.channel));
    if (activeTab === 'SELF_CHANNEL') return planState.items.filter(it => it.channel === 'SELF_CHANNEL');
    if (activeTab === 'LIVESTREAM') return planState.items.filter(it => it.channel === 'LIVESTREAM');
    return planState.items;
  }, [activeTab, planState.items]);

  // Helper for Tier Badge Color
  const getTierBadgeStyle = (tierCode: string) => {
    switch (tierCode) {
      case 'KL1': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'KL2': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'KL3': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'KL4': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'KL5': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'KL6': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'KL7': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'TAP UpAffiliate': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-[1600px] mx-auto pb-12">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & QUICK METRICS COCKPIT                                    */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
        {/* Row 1: Brand / Period / Test Bar */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 tracking-tight">
                  Tạo Kế Hoạch Input Plan B2C
                </h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  Phân rã 4 Tầng & 7 Bậc KOC
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Nhập Ngân sách & Số lượng ban đầu ➔ Hệ thống tự động phân tách theo Kênh, Nền tảng & Tier KL1-KL7
              </p>
            </div>
          </div>

          {/* Controls: Brand, Week, PIC, Test Data */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={planState.brandName}
              onChange={(e) => setPlanState(prev => ({ ...prev, brandName: e.target.value }))}
              className="text-xs font-semibold px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              {BRAND_OPTIONS.map(b => (
                <option key={b.name} value={b.name}>{b.label}</option>
              ))}
            </select>

            <select
              value={planState.week}
              onChange={(e) => setPlanState(prev => ({ ...prev, week: e.target.value }))}
              className="text-xs font-semibold px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              {WEEK_OPTIONS.map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>

            {/* Test Presets Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-500 px-1 flex items-center gap-1">
                <FlaskConical className="w-3 h-3 text-indigo-500" />
                Test:
              </span>
              {MOCK_PLAN_SCENARIOS.slice(0, 3).map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => handleSelectScenario(sc.id)}
                  className={`text-[11px] font-medium px-2 py-0.5 rounded transition ${
                    activeScenarioId === sc.id
                      ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sc.name.split('—')[0].trim()}
                </button>
              ))}
              <button
                onClick={handleRandomizeScenario}
                className="p-1 text-slate-500 hover:text-amber-600 transition"
                title="Sinh dữ liệu test ngẫu nhiên"
              >
                <Dices className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Master Inputs & Live Balancer (Clean, Refined & Spacious) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-4">
          {/* Card 1: Tổng Ngân Sách */}
          <div className="lg:col-span-4 p-4 rounded-xl bg-slate-50/70 border border-slate-200/70 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-bold uppercase tracking-wider text-[11px] text-slate-700 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-indigo-600" />
                  1. Ngân Sách Tổng Giao
                </span>
                <span className="font-mono text-slate-400">VNĐ</span>
              </div>
              
              <div className="flex items-center gap-2 mt-1">
                <div className="relative flex-1">
                  <input
                    type="number"
                    step="5000000"
                    value={planState.totalTargetBudget}
                    onChange={(e) => setPlanState(prev => ({ ...prev, totalTargetBudget: Number(e.target.value) || 0 }))}
                    className="w-full text-xl font-bold font-mono text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 shadow-2xs"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400 pointer-events-none">
                    {(planState.totalTargetBudget / 1000000).toFixed(0)}M
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPlanState(prev => ({ ...prev, totalTargetBudget: Math.max(0, prev.totalTargetBudget - 10000000) }))}
                    className="px-2 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition"
                    title="Giảm 10 triệu"
                  >
                    -10M
                  </button>
                  <button
                    onClick={() => setPlanState(prev => ({ ...prev, totalTargetBudget: prev.totalTargetBudget + 10000000 }))}
                    className="px-2 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition"
                    title="Tăng 10 triệu"
                  >
                    +10M
                  </button>
                </div>
              </div>
            </div>

            {/* Sub progress */}
            <div className="mt-3 pt-2 border-t border-slate-200/60">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-500">Đã phân bổ các kênh:</span>
                <span className={`font-mono font-bold ${isOverBudget ? 'text-rose-600' : 'text-slate-900'}`}>
                  {(totalAllocatedBudget / 1000000).toFixed(2)}M / {(planState.totalTargetBudget / 1000000).toFixed(0)}M
                </span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isOverBudget ? 'bg-rose-500' : budgetUsagePct >= 95 ? 'bg-emerald-500' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${Math.min(100, budgetUsagePct)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Tổng Số Lượng Video / Phiên Live */}
          <div className="lg:col-span-4 p-4 rounded-xl bg-slate-50/70 border border-slate-200/70 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-bold uppercase tracking-wider text-[11px] text-slate-700 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-emerald-600" />
                  2. Chỉ Tiêu Số Lượng Video
                </span>
                <span className="font-mono text-slate-400">SL Slot</span>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <div className="relative flex-1">
                  <input
                    type="number"
                    step="5"
                    value={planState.totalTargetContents}
                    onChange={(e) => setPlanState(prev => ({ ...prev, totalTargetContents: Number(e.target.value) || 0 }))}
                    className="w-full text-xl font-bold font-mono text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 shadow-2xs"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400 pointer-events-none">
                    Video / Live
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPlanState(prev => ({ ...prev, totalTargetContents: Math.max(0, prev.totalTargetContents - 5) }))}
                    className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition"
                    title="Giảm 5 slot"
                  >
                    -5
                  </button>
                  <button
                    onClick={() => setPlanState(prev => ({ ...prev, totalTargetContents: prev.totalTargetContents + 5 }))}
                    className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition"
                    title="Tăng 5 slot"
                  >
                    +5
                  </button>
                </div>
              </div>
            </div>

            {/* Sub progress */}
            <div className="mt-3 pt-2 border-t border-slate-200/60">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-500">Đã chia vào các tier:</span>
                <span className={`font-mono font-bold ${contentHeadroom !== 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {totalAllocatedContents} / {planState.totalTargetContents} slot ({contentFillPct.toFixed(0)}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    contentHeadroom === 0 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(100, contentFillPct)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Phân Bổ Tự Động & Trạng Thái Headroom */}
          <div className="lg:col-span-4 p-4 rounded-xl bg-gradient-to-br from-indigo-50/50 to-blue-50/50 border border-indigo-200/70 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-indigo-950 uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  3. Trạng Thái Cân Đối
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isOverBudget 
                    ? 'bg-rose-100 text-rose-700' 
                    : budgetHeadroom === 0 && contentHeadroom === 0
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-indigo-100 text-indigo-700'
                }`}>
                  {isOverBudget ? 'Vượt trần' : budgetHeadroom === 0 && contentHeadroom === 0 ? 'Khớp 100%' : 'Chờ cân đối'}
                </span>
              </div>

              {/* Status details */}
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Ngân sách chênh lệch:</span>
                  {isOverBudget ? (
                    <span className="font-mono font-bold text-rose-600">
                      -{(Math.abs(budgetHeadroom) / 1000000).toFixed(1)}M đ
                    </span>
                  ) : (
                    <span className="font-mono font-bold text-emerald-700">
                      +{(budgetHeadroom / 1000000).toFixed(1)}M đ
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Số lượng video còn thiếu:</span>
                  <span className={`font-mono font-bold ${contentHeadroom === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {contentHeadroom === 0 ? 'Đã khớp đủ' : `${contentHeadroom} video`}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Balance Button */}
            <div className="mt-3 pt-2 border-t border-indigo-200/50 flex items-center gap-2">
              <button
                onClick={() => handleApplyPreset('BALANCED')}
                className="w-full text-xs font-bold py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-1.5 shadow-2xs transition"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Cân Đối Chuẩn 1-Click</span>
              </button>
            </div>
          </div>
        </div>

        {/* Row 3: Strategy Presets Quick Bar (One-click breakdown) */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500 mr-1">
              Phân rã nhanh theo chiến lược:
            </span>
            <button
              onClick={() => handleApplyPreset('BALANCED')}
              className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 ${
                planState.strategyPreset === 'BALANCED'
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <span>🎯 Cân Bằng (Chuẩn Upbase)</span>
            </button>
            <button
              onClick={() => handleApplyPreset('GMV_MAX')}
              className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 ${
                planState.strategyPreset === 'GMV_MAX'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-bold'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <span>🚀 Tối Đa GMV Chốt Đơn</span>
            </button>
            <button
              onClick={() => handleApplyPreset('BRAND_PUSH')}
              className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 ${
                planState.strategyPreset === 'BRAND_PUSH'
                  ? 'bg-purple-50 border-purple-300 text-purple-700 font-bold'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <span>🌟 Tăng Phủ Brand (KL5-KL7)</span>
            </button>
            <button
              onClick={() => handleApplyPreset('COST_SAVER')}
              className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 ${
                planState.strategyPreset === 'COST_SAVER'
                  ? 'bg-amber-50 border-amber-300 text-amber-700 font-bold'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <span>💰 Tiết Kiệm CIR Thấp</span>
            </button>
          </div>

          {/* Quick Business Projections */}
          <div className="flex items-center gap-3 text-xs font-mono text-slate-600">
            <span>Dự phóng GMV: <strong className="text-slate-900 font-bold">{(totalProjectedGmv / 1000000).toFixed(0)}M</strong></span>
            <span>•</span>
            <span>CIR: <strong className={projectedCir <= 20 ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>{projectedCir.toFixed(1)}%</strong></span>
            <span>•</span>
            <span>ROI: <strong className="text-indigo-700 font-bold">{projectedRoi.toFixed(1)}x</strong></span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CHANNELS NAVIGATION & VIEW TOGGLES                                    */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-2">
        {/* Channel Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveTab('TIKTOK')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'TIKTOK'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/90 hover:bg-slate-50'
            }`}
          >
            <span>🟣 1. TikTok Creator (KL1 ➔ KL7)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'TIKTOK' ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-100 text-slate-600'
            }`}>
              {channelTotals.tiktok.qty} clip · {(channelTotals.tiktok.budget / 1000000).toFixed(1)}M
            </span>
          </button>

          <button
            onClick={() => setActiveTab('MULTI_PLATFORM')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'MULTI_PLATFORM'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/90 hover:bg-slate-50'
            }`}
          >
            <span>🟠 2. Đa Sàn (Shopee, Reels, Threads)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'MULTI_PLATFORM' ? 'bg-orange-800 text-orange-100' : 'bg-slate-100 text-slate-600'
            }`}>
              {channelTotals.multiPlatform.qty} clip · {(channelTotals.multiPlatform.budget / 1000000).toFixed(1)}M
            </span>
          </button>

          <button
            onClick={() => setActiveTab('SELF_CHANNEL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'SELF_CHANNEL'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/90 hover:bg-slate-50'
            }`}
          >
            <span>🟢 3. Kênh Tự Xây (In-House & AI)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'SELF_CHANNEL' ? 'bg-teal-800 text-teal-100' : 'bg-slate-100 text-slate-600'
            }`}>
              {channelTotals.selfChannel.qty} clip · {(channelTotals.selfChannel.budget / 1000000).toFixed(1)}M
            </span>
          </button>

          <button
            onClick={() => setActiveTab('LIVESTREAM')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'LIVESTREAM'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/90 hover:bg-slate-50'
            }`}
          >
            <span>🔴 4. Livestream Commerce</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'LIVESTREAM' ? 'bg-purple-800 text-purple-100' : 'bg-slate-100 text-slate-600'
            }`}>
              {channelTotals.livestream.qty} ca · {(channelTotals.livestream.budget / 1000000).toFixed(1)}M
            </span>
          </button>
        </div>

        {/* View Switchers & Excel Preview */}
        <div className="flex items-center gap-2">
          {/* Card vs Table toggle */}
          {activeTab !== 'EXCEL_PREVIEW' && (
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
              <button
                onClick={() => setViewMode('TABLE')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                  viewMode === 'TABLE' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Dạng bảng tối giản, dễ nhập số lượng"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Bảng Tinh Gọn</span>
              </button>
              <button
                onClick={() => setViewMode('CARDS')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                  viewMode === 'CARDS' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Dạng thẻ trực quan cho từng bậc KOC"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Thẻ Bậc KOC</span>
              </button>
            </div>
          )}

          <button
            onClick={() => setActiveTab('EXCEL_PREVIEW')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition ${
              activeTab === 'EXCEL_PREVIEW'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Đối Chiếu 4.1.1</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN CONTENT AREA: VIEW MODE 1 - CARDS VIEW (INTUITIVE & MODERN)       */}
      {/* ========================================================================= */}
      {activeTab !== 'EXCEL_PREVIEW' && viewMode === 'CARDS' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleItems.map((item) => {
              const itemBudgetPct = totalAllocatedBudget > 0 ? (item.totalBudget / totalAllocatedBudget) * 100 : 0;
              const isKL = item.tierCode.startsWith('KL');

              return (
                <div 
                  key={item.id}
                  className={`bg-white rounded-2xl border transition-all duration-200 hover:shadow-md p-4 flex flex-col justify-between ${
                    item.qty > 0 ? 'border-slate-300/80 shadow-2xs' : 'border-slate-200/60 opacity-80 hover:opacity-100'
                  }`}
                >
                  {/* Card Header: Tier Badge & Name */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-md font-mono border ${getTierBadgeStyle(item.tierCode)}`}>
                        {item.tierCode}
                      </span>
                      <span className="text-xs font-bold font-mono text-slate-800">
                        {(item.unitCost / 1000000).toFixed(2)}M đ / slot
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 leading-snug">
                      {item.tierLabel.split(':')[1]?.trim() || item.tierLabel}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                      {item.notes || item.platform}
                    </p>

                    {/* Content Format Selector Dropdown (Clean Popover Style) */}
                    <div className="mt-3">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Định Dạng Video Tương Ứng
                      </label>
                      <select
                        value={item.contentFormat}
                        onChange={(e) => handleUpdateItemFormat(item.id, e.target.value)}
                        className="w-full text-xs font-medium px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500 transition"
                      >
                        {CONTENT_FORMAT_OPTIONS.map(fmt => (
                          <option key={fmt} value={fmt}>{fmt}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Card Footer: Quantity Stepper & Subtotal */}
                  <div className="mt-4 pt-3.5 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-600">Số Lượng Clip:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleAdjustItemQty(item.id, -1)}
                          className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center transition active:scale-95 shadow-2xs"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) => handleUpdateItemQty(item.id, Number(e.target.value))}
                          className="w-12 text-center text-sm font-bold font-mono py-0.5 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs"
                        />
                        <button
                          onClick={() => handleAdjustItemQty(item.id, 1)}
                          className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center transition active:scale-95 shadow-2xs"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleAdjustItemQty(item.id, 5)}
                          className="text-[10px] font-bold px-1.5 py-1 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition"
                          title="Tăng nhanh 5 clip"
                        >
                          +5
                        </button>
                      </div>
                    </div>

                    {/* Subtotal & GMV */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-500">Thành tiền:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {(item.totalBudget / 1000000).toFixed(2)}M đ
                        <span className="text-[10px] font-normal text-slate-400 ml-1">({itemBudgetPct.toFixed(1)}%)</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5">
                      <span>Dự phóng GMV:</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {(item.targetGmv / 1000000).toFixed(1)}M (ROI {item.expectedRoiMultiplier}x)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Action Bar */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 text-xs font-mono text-slate-600">
              <span>Kênh: <strong className="text-slate-900">{activeTab}</strong></span>
              <span>•</span>
              <span>Tổng số lượng: <strong className="text-indigo-700">{visibleItems.reduce((s, it) => s + it.qty, 0)}</strong> video</span>
              <span>•</span>
              <span>Tổng ngân sách: <strong className="text-slate-900">{(visibleItems.reduce((s, it) => s + it.totalBudget, 0) / 1000000).toFixed(2)}M đ</strong></span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất File Excel 4.1.1</span>
              </button>

              <button
                onClick={handleGenerateBookingSlots}
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
              >
                <Send className="w-3.5 h-3.5 text-amber-300" />
                <span>Chuyển Sang Booking Execution</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MAIN CONTENT AREA: VIEW MODE 2 - CLEAN STREAMLINED TABLE               */}
      {/* ========================================================================= */}
      {activeTab !== 'EXCEL_PREVIEW' && viewMode === 'TABLE' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 w-44">Phân Bậc KOC / Nền Tảng</th>
                  <th className="py-3 px-4 min-w-[260px]">Loại Nội Dung Tương Ứng</th>
                  <th className="py-3 px-4 w-44 text-center">Số Lượng Clip</th>
                  <th className="py-3 px-4 w-36 text-right">Đơn Giá Net</th>
                  <th className="py-3 px-4 w-36 text-right">Thành Tiền</th>
                  <th className="py-3 px-4 w-36 text-right">Dự Phóng GMV</th>
                  <th className="py-3 px-3 w-20 text-center">Điền Nốt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleItems.map((item) => {
                  const itemBudgetPct = totalAllocatedBudget > 0 ? (item.totalBudget / totalAllocatedBudget) * 100 : 0;
                  return (
                    <tr key={item.id} className="hover:bg-indigo-50/30 transition group">
                      {/* Column 1: Tier Badge & Label */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded font-mono border ${getTierBadgeStyle(item.tierCode)}`}>
                            {item.tierCode}
                          </span>
                          <span className="font-bold text-slate-900 text-xs truncate max-w-[130px]">
                            {item.tierLabel.split(':')[1]?.trim() || item.tierLabel}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block truncate max-w-[180px]">
                          {item.notes || item.platform}
                        </span>
                      </td>

                      {/* Column 2: Content Format Selector */}
                      <td className="py-3 px-4">
                        <select
                          value={item.contentFormat}
                          onChange={(e) => handleUpdateItemFormat(item.id, e.target.value)}
                          className="w-full text-xs font-medium px-2.5 py-1.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500 transition shadow-2xs"
                        >
                          {CONTENT_FORMAT_OPTIONS.map(fmt => (
                            <option key={fmt} value={fmt}>{fmt}</option>
                          ))}
                        </select>
                      </td>

                      {/* Column 3: Quantity Stepper & Number Input */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleAdjustItemQty(item.id, -1)}
                            className="w-6 h-6 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center transition shadow-2xs active:scale-95"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) => handleUpdateItemQty(item.id, Number(e.target.value))}
                            className="w-12 text-center text-xs font-bold font-mono py-1 border border-slate-200 rounded-md bg-white text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs"
                          />
                          <button
                            onClick={() => handleAdjustItemQty(item.id, 1)}
                            className="w-6 h-6 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center transition shadow-2xs active:scale-95"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleAdjustItemQty(item.id, 5)}
                            className="text-[10px] font-bold px-1.5 py-1 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition"
                            title="Tăng nhanh 5 video"
                          >
                            +5
                          </button>
                        </div>
                      </td>

                      {/* Column 4: Unit Cost & Benchmark Reset */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            step="500000"
                            value={item.unitCost}
                            onChange={(e) => handleUpdateItemCost(item.id, Number(e.target.value))}
                            className="w-24 text-right text-xs font-mono font-medium px-2 py-1 bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs"
                          />
                          {item.unitCost !== item.benchmarkCost && (
                            <button
                              onClick={() => handleResetItemToBenchmark(item.id)}
                              className="text-slate-400 hover:text-indigo-600 p-0.5 transition"
                              title={`Khôi phục Benchmark: ${(item.benchmarkCost / 1000000).toFixed(2)}M`}
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Column 5: Subtotal & Percentage Bar */}
                      <td className="py-3 px-4 text-right font-mono">
                        <span className="text-xs font-bold text-slate-900 block">
                          {(item.totalBudget / 1000000).toFixed(2)}M đ
                        </span>
                        <div className="flex items-center justify-end gap-1.5 mt-0.5">
                          <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden inline-block">
                            <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${Math.min(100, itemBudgetPct * 3)}%` }} />
                          </div>
                          <span className="text-[10px] text-slate-400">{itemBudgetPct.toFixed(1)}%</span>
                        </div>
                      </td>

                      {/* Column 6: Projected GMV */}
                      <td className="py-3 px-4 text-right font-mono">
                        <span className="text-xs font-bold text-emerald-700 block">
                          {(item.targetGmv / 1000000).toFixed(1)}M đ
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          ROI {item.expectedRoiMultiplier}x
                        </span>
                      </td>

                      {/* Column 7: Quick Fill Button */}
                      <td className="py-3 px-3 text-center">
                        {contentHeadroom > 0 ? (
                          <button
                            onClick={() => handleFillRemainingToItem(item.id)}
                            className="text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded border border-indigo-200 transition"
                            title={`Điền nốt ${contentHeadroom} video còn thiếu vào dòng này`}
                          >
                            + Fill
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs">•</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Actions */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs font-mono text-slate-600">
              <span>Đang hiển thị: <strong className="text-slate-900">{visibleItems.length}</strong> phân bậc</span>
              <span>•</span>
              <span>Tổng kênh này: <strong className="text-indigo-700">{(visibleItems.reduce((s, it) => s + it.totalBudget, 0) / 1000000).toFixed(2)}M đ</strong></span>
              <span>•</span>
              <span>Số lượng: <strong className="text-slate-900">{visibleItems.reduce((s, it) => s + it.qty, 0)}</strong> video</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất File Excel 4.1.1</span>
              </button>

              <button
                onClick={handleGenerateBookingSlots}
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
              >
                <Send className="w-3.5 h-3.5 text-amber-300" />
                <span>Chuyển Sang Booking Execution</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TAB EXCEL PREVIEW (CLEAN SHEET 4.1.1 VERIFICATION)                     */}
      {/* ========================================================================= */}
      {activeTab === 'EXCEL_PREVIEW' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold">Đối Chiếu Chuẩn Xác Sheet 4.1.1 Input Plan</h3>
                <p className="text-xs text-slate-400">Kiểm tra đầy đủ 61 cột chuẩn trước khi xuất file gửi Trưởng Phòng duyệt</p>
              </div>
            </div>
            <button
              onClick={handleExportExcel}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải File .xlsx Này</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-[460px]">
            <table className="w-full text-xs text-left border-collapse font-mono">
              <thead className="sticky top-0 bg-slate-800 text-white z-10 text-[11px]">
                <tr>
                  <th className="p-2.5 border border-slate-700">Tháng</th>
                  <th className="p-2.5 border border-slate-700">Store</th>
                  <th className="p-2.5 border border-slate-700">Tuần</th>
                  <th className="p-2.5 border border-slate-700 bg-indigo-900 text-center">TikTok Aff (Qty)</th>
                  <th className="p-2.5 border border-slate-700 bg-indigo-900 text-center">KL1</th>
                  <th className="p-2.5 border border-slate-700 bg-indigo-900 text-center">KL2</th>
                  <th className="p-2.5 border border-slate-700 bg-indigo-900 text-center">KL3</th>
                  <th className="p-2.5 border border-slate-700 bg-indigo-900 text-center">KL4</th>
                  <th className="p-2.5 border border-slate-700 bg-indigo-900 text-center">KL5</th>
                  <th className="p-2.5 border border-slate-700 bg-indigo-900 text-center">KL6</th>
                  <th className="p-2.5 border border-slate-700 bg-indigo-900 text-center">KL7</th>
                  <th className="p-2.5 border border-slate-700 bg-blue-900 text-right">Ngân Sách TikTok</th>
                  <th className="p-2.5 border border-slate-700 bg-orange-900 text-center">Shopee Reup</th>
                  <th className="p-2.5 border border-slate-700 bg-orange-900 text-center">Shopee Aff</th>
                  <th className="p-2.5 border border-slate-700 bg-teal-900 text-center">Self Voice</th>
                  <th className="p-2.5 border border-slate-700 bg-teal-900 text-center">Self AI</th>
                  <th className="p-2.5 border border-slate-700 bg-purple-900 text-center">Live Độc Quyền</th>
                  <th className="p-2.5 border border-slate-700 bg-purple-900 text-center">Live Add-in</th>
                  <th className="p-2.5 border border-slate-700 bg-emerald-900 text-right">Target GMV</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white hover:bg-blue-50 text-slate-900 font-semibold">
                  <td className="p-2.5 border border-slate-200">{planState.month}</td>
                  <td className="p-2.5 border border-slate-200">{planState.brandName}</td>
                  <td className="p-2.5 border border-slate-200">{planState.week}</td>
                  <td className="p-2.5 border border-slate-200 text-center text-indigo-700 font-bold">
                    {planState.items.filter(it => it.channel === 'TIKTOK').reduce((s, it) => s + it.qty, 0)}
                  </td>
                  <td className="p-2.5 border border-slate-200 text-center">{planState.items.find(i => i.id === 'row-tt-kl1')?.qty || 0}</td>
                  <td className="p-2.5 border border-slate-200 text-center">{planState.items.find(i => i.id === 'row-tt-kl2')?.qty || 0}</td>
                  <td className="p-2.5 border border-slate-200 text-center">{planState.items.find(i => i.id === 'row-tt-kl3')?.qty || 0}</td>
                  <td className="p-2.5 border border-slate-200 text-center">{planState.items.find(i => i.id === 'row-tt-kl4')?.qty || 0}</td>
                  <td className="p-2.5 border border-slate-200 text-center">{planState.items.find(i => i.id === 'row-tt-kl5')?.qty || 0}</td>
                  <td className="p-2.5 border border-slate-200 text-center">{planState.items.find(i => i.id === 'row-tt-kl6')?.qty || 0}</td>
                  <td className="p-2.5 border border-slate-200 text-center">{planState.items.find(i => i.id === 'row-tt-kl7')?.qty || 0}</td>
                  <td className="p-2.5 border border-slate-200 text-right text-indigo-700 font-bold">
                    {(planState.items.filter(it => it.channel === 'TIKTOK').reduce((s, it) => s + it.totalBudget, 0) / 1000000).toFixed(1)}M đ
                  </td>
                  <td className="p-2.5 border border-slate-200 text-center">{planState.items.find(i => i.id === 'row-shopee-reup')?.qty || 0}</td>
                  <td className="p-2.5 border border-slate-200 text-center">{planState.items.find(i => i.id === 'row-shopee-aff')?.qty || 0}</td>
                  <td className="p-2.5 border border-slate-200 text-center">{planState.items.find(i => i.id === 'row-self-voice')?.qty || 0}</td>
                  <td className="p-2.5 border border-slate-200 text-center">{planState.items.find(i => i.id === 'row-self-ai')?.qty || 0}</td>
                  <td className="p-2.5 border border-slate-200 text-center">{planState.items.find(i => i.id === 'row-live-exclusive')?.qty || 0}</td>
                  <td className="p-2.5 border border-slate-200 text-center">{planState.items.find(i => i.id === 'row-live-addin')?.qty || 0}</td>
                  <td className="p-2.5 border border-slate-200 text-right text-emerald-700 font-bold">
                    {(planState.targetGmv / 1000000).toFixed(0)}M đ
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
