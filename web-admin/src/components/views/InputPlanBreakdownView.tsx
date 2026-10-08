'use client';

import React, { useState, useMemo } from 'react';
import { formatVndShort } from '../../lib/format';
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
  Coins,
  Users,
  UserCheck,
  X,
  ChevronLeft,
  MessageSquare,
  BadgeCheck
} from 'lucide-react';
import { 
  InputPlanBreakdownState, 
  InputPlanRowItem, 
  InputPlanChannelType,
  UserProfile, 
  StaffDetailedPlanItem,
  SalaryGrade,
  WeeklyStorePlan411,
  PlanDiscussionMessage,
  PlanDiscussionRole,
  MonthlyPlanStatus
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
import { MonthlyPlanHub } from './MonthlyPlanHub';
import { INITIAL_MONTHLY_PLANS } from '../../lib/monthlyPlanData';
import { PlanApprovalStepper } from './PlanApprovalStepper';
import { PlanDiscussionHub } from './PlanDiscussionHub';

interface InputPlanBreakdownViewProps {
  currentUser?: UserProfile;
  onNotify?: (msg: string) => void;
  onGenerateDealsFromPlan?: (slots: StaffDetailedPlanItem[]) => void;
  onApplyPlanToWeeklyStore?: (planData: WeeklyStorePlan411) => void;
  initialShowStudio?: boolean;
}

export const InputPlanBreakdownView: React.FC<InputPlanBreakdownViewProps> = ({
  currentUser,
  onNotify,
  onGenerateDealsFromPlan,
  onApplyPlanToWeeklyStore,
  initialShowStudio = false
}) => {
  // Master Monthly Plans State
  const [monthlyPlans, setMonthlyPlans] = useState<InputPlanBreakdownState[]>(INITIAL_MONTHLY_PLANS);
  // View mode: false = Màn hình Quản Lý Kế Hoạch Theo Tháng (MonthlyPlanHub), true = Studio Chi tiết Phân Rã
  const [isShowingStudio, setIsShowingStudio] = useState<boolean>(initialShowStudio);

  // Main Plan State (default from Fresh balanced scenario or active plan)
  const [planState, setPlanState] = useState<InputPlanBreakdownState>(INITIAL_MONTHLY_PLANS[0]);
  const [activeScenarioId, setActiveScenarioId] = useState<string>(MOCK_PLAN_SCENARIOS[0].id);

  // Simulation Role: Booking PIC vs Growth PIC vs Trưởng Phòng
  const [currentRole, setCurrentRole] = useState<PlanDiscussionRole>('BOOKING');

  // Active Channel Sub-Tab
  const [activeTab, setActiveTab] = useState<'TIKTOK' | 'MULTI_PLATFORM' | 'SELF_CHANNEL' | 'LIVESTREAM' | 'DISCUSSIONS' | 'ALL_SUMMARY' | 'EXCEL_PREVIEW'>('TIKTOK');

  // View Mode: 'CARDS' (Intuitive & Visual) or 'TABLE' (Clean & Fast)
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('TABLE');

  const notify = (msg: string) => {
    if (onNotify) onNotify(msg);
  };

  // Brand Options
  const BRAND_OPTIONS = [
    { name: 'Fresh_TikTok_E2E-C', label: 'Fresh (mỹ phẩm & chăm sóc da)' },
    { name: 'Face Republic_TikTok_E2E-O', label: 'Face Republic (Dược mỹ phẩm)' },
    { name: 'Clio_TikTok_E2E-C', label: 'Clio Cosmetics (Make-up chuẩn Hàn)' },
    { name: 'Senka_TikTok_E2E-C', label: 'Senka (chăm sóc da & làm sạch)' },
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

  // Thông tin chuyên môn của các thành viên trong team Booking để bạn PIC dễ dàng phân công
  const TEAM_MEMBERS_INFO: Record<string, { role: string; avatar: string; expertise: string }> = {
    'Đặng Mai Hà Linh': { role: 'Brand PIC / Senior Specialist', avatar: 'HL', expertise: 'Chiến lược, Celeb & Macro (KL5-KL7)' },
    'Khánh Vy': { role: 'Senior Booking Specialist', avatar: 'KV', expertise: 'Key Creator & Mid-Macro (KL3-KL5)' },
    'Nguyễn Thu Trang': { role: 'Booking Specialist', avatar: 'TT', expertise: 'Micro KOC & Shopee Affiliate' },
    'Phạm Thị Thu Hằng': { role: 'Booking Specialist', avatar: 'TH', expertise: 'Affiliate TAP & Review voice' },
    'Trần Minh Đức': { role: 'Live & Creator Specialist', avatar: 'MĐ', expertise: 'Livestream Độc quyền & Co-host' },
    'Lê Hoàng Yến': { role: 'Multi-platform Specialist', avatar: 'HY', expertise: 'Facebook, Instagram & Threads' },
    'Phan Diệu Ánh': { role: 'Junior Booking Associate', avatar: 'DÁ', expertise: 'KOC Mới & Reup Sàn' }
  };

  // State Modal Phân Bổ Kế Hoạch Cho Team của bạn PIC
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [allocationFilterChannel, setAllocationFilterChannel] = useState<'ALL' | InputPlanChannelType>('ALL');

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
    notify(`Đơn giá ${item.tierLabel} đã khôi phục về benchmark ${formatVndShort(bench)}`);
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
      notify(`Số lượng nội dung đã đủ hoặc vượt chỉ tiêu (${totalAllocatedContents}/${planState.totalTargetContents})!`);
      return;
    }

    const newQty = item.qty + contentHeadroom;
    handleUpdateItemQty(id, newQty);
    notify(`Đã điền toàn bộ ${contentHeadroom} slot nội dung còn thiếu vào [${item.tierLabel.split(':')[0]}]!`);
  };

  const handleSelectScenario = (scenarioId: string) => {
    const sc = MOCK_PLAN_SCENARIOS.find(s => s.id === scenarioId);
    if (!sc) return;
    setActiveScenarioId(sc.id);
    setPlanState(JSON.parse(JSON.stringify(sc.state)));
    notify(`Đã nạp thành công bộ dữ liệu test: ${sc.name.split('—')[0]}!`);
  };

  const handleRandomizeScenario = () => {
    const randomPlan = generateRandomMockPlan();
    setActiveScenarioId('RANDOM');
    setPlanState(randomPlan);
    notify(`Đã sinh dữ liệu test ngẫu nhiên cho ${randomPlan.brandName.split('_')[0]} (${randomPlan.totalTargetContents} video / ${formatVndShort(randomPlan.totalTargetBudget)})!`);
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
      BALANCED: 'Chuẩn Cân Bằng Upbase (Phủ đều KL1 → KL5)',
      GMV_MAX: 'Tối Đa GMV Chốt Đơn (Tập trung Micro & Live)',
      BRAND_PUSH: 'Đẩy Mạnh Nhận Diện (Dồn KL5-KL7 & Video viral)',
      COST_SAVER: 'Tiết Kiệm Chi Phí (Tối đa KL1-KL2 & Reup sàn)'
    };
    notify(`Đã phân rã tự động theo chiến lược: ${presetNames[preset]}!`);
  };

  const handleExportExcel = async () => {
    try {
      await exportInputPlanStudioToExcel(planState);
      notify(`Xuất file Excel 4.1.1 Input Plan thành công cho ${planState.brandName}!`);
    } catch (err: any) {
      console.error(err);
      notify(`Lỗi khi xuất Excel: ${err?.message || 'Vui lòng thử lại'}`);
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
    notify(`Đã lưu kế hoạch ${planState.week} (${planState.brandName}) vào Sổ Kế Hoạch Tuần Thực Tế!`);
  };

  // Cập nhật người phụ trách cho từng dòng phân rã
  const handleUpdateItemAssignee = (id: string, staffName: string) => {
    setPlanState(prev => ({
      ...prev,
      items: prev.items.map(it => it.id === id ? { ...it, assignedStaff: staffName } : it)
    }));
  };

  // Cập nhật ghi chú/yêu cầu riêng của PIC cho dòng đó
  const handleUpdateItemStaffNotes = (id: string, notes: string) => {
    setPlanState(prev => ({
      ...prev,
      items: prev.items.map(it => it.id === id ? { ...it, staffNotes: notes } : it)
    }));
  };

  // Gán tất cả các dòng cho PIC chủ trì
  const handleAssignAllToPic = () => {
    setPlanState(prev => ({
      ...prev,
      items: prev.items.map(it => ({ ...it, assignedStaff: prev.pic }))
    }));
    notify(`Đã gán toàn bộ kế hoạch cho PIC chủ trì (${planState.pic})!`);
  };

  // Gán tự động theo năng lực và chuyên môn của các thành viên trong team
  const handleAutoAssignByExpertise = () => {
    setPlanState(prev => ({
      ...prev,
      items: prev.items.map(it => {
        let assigned = prev.pic;
        // Livestream -> Trần Minh Đức
        if (it.channel === 'LIVESTREAM') {
          assigned = 'Trần Minh Đức';
        }
        // Đa sàn (Shopee, FB, IG, Threads) -> Lê Hoàng Yến
        else if (['SHOPEE', 'FACEBOOK', 'INSTAGRAM', 'THREADS'].includes(it.channel)) {
          assigned = 'Lê Hoàng Yến';
        }
        // Kênh tự xây & Reup -> Phan Diệu Ánh
        else if (it.channel === 'SELF_CHANNEL') {
          assigned = 'Phan Diệu Ánh';
        }
        // TikTok Celeb & Macro lớn (KL6, KL7) -> PIC chủ trì
        else if (['KL6', 'KL7'].includes(it.tierCode)) {
          assigned = prev.pic;
        }
        // TikTok Mid-Macro (KL4, KL5) -> Khánh Vy
        else if (['KL4', 'KL5'].includes(it.tierCode)) {
          assigned = 'Khánh Vy';
        }
        // TikTok Micro (KL3) -> Nguyễn Thu Trang
        else if (it.tierCode === 'KL3') {
          assigned = 'Nguyễn Thu Trang';
        }
        // TikTok Affiliate / TAP (KL1, KL2, TAP) -> Phạm Thị Thu Hằng
        else {
          assigned = 'Phạm Thị Thu Hằng';
        }

        return { ...it, assignedStaff: assigned };
      })
    }));
    notify(`PIC ${planState.pic} đã phân bổ tự động các dòng theo chuyên môn của từng thành viên trong team!`);
  };

  // Tổng hợp phân bổ theo từng nhân sự trong team
  const staffAllocationSummary = useMemo(() => {
    const summaryMap: Record<string, {
      staffName: string;
      videoCount: number;
      totalBudget: number;
      targetGmv: number;
      channels: Set<string>;
      tiersCount: Record<string, number>;
    }> = {};

    PIC_OPTIONS.forEach(staff => {
      summaryMap[staff] = {
        staffName: staff,
        videoCount: 0,
        totalBudget: 0,
        targetGmv: 0,
        channels: new Set(),
        tiersCount: {}
      };
    });

    planState.items.forEach(item => {
      const assignee = item.assignedStaff || planState.pic;
      if (!summaryMap[assignee]) {
        summaryMap[assignee] = {
          staffName: assignee,
          videoCount: 0,
          totalBudget: 0,
          targetGmv: 0,
          channels: new Set(),
          tiersCount: {}
        };
      }
      summaryMap[assignee].videoCount += item.qty;
      summaryMap[assignee].totalBudget += item.totalBudget;
      summaryMap[assignee].targetGmv += item.targetGmv;
      summaryMap[assignee].channels.add(item.channel);
      summaryMap[assignee].tiersCount[item.tierCode] = (summaryMap[assignee].tiersCount[item.tierCode] || 0) + item.qty;
    });

    return Object.values(summaryMap).filter(s => s.videoCount > 0 || s.staffName === planState.pic);
  }, [planState.items, planState.pic]);

  const handleGenerateBookingSlots = () => {
    const generatedSlots: StaffDetailedPlanItem[] = [];
    const brandOnly = planState.brandName.split('_')[0] || planState.brandName;

    planState.items.forEach(item => {
      if (item.qty <= 0) return;
      const slotsToGen = Math.min(item.qty, 8);
      const assignee = item.assignedStaff || planState.pic;

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
          staffName: assignee,
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
          leadNotes: item.staffNotes
            ? `[Giao bởi PIC ${planState.pic}]: ${item.staffNotes} (${item.platform} - ${item.contentFormat})`
            : `[Giao bởi PIC ${planState.pic}]: Phân rã từ Input Plan (${item.platform} - ${item.contentFormat})`,
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
        });
      }
    });

    if (onGenerateDealsFromPlan && generatedSlots.length > 0) {
      onGenerateDealsFromPlan(generatedSlots);
    }

    const assignedCount = staffAllocationSummary.filter(s => s.videoCount > 0).length;
    notify(`PIC ${planState.pic} đã phân bổ thành công ${generatedSlots.length} slot KOC cho ${assignedCount} nhân sự trong team Booking!`);
    setIsAllocationModalOpen(false);
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

  const handleStatusChangeForPlan = (
    planId: string, 
    newStatus: MonthlyPlanStatus, 
    logMessage: string, 
    note?: string
  ) => {
    const timestamp = new Date().toISOString();
    const isTargetCurrent = planState.id === planId;
    const targetPlan = isTargetCurrent ? planState : monthlyPlans.find(p => p.id === planId);
    if (!targetPlan) return;

    let authorName = targetPlan.pic;
    let authorTitle = 'Booking PIC';
    if (currentRole === 'GROWTH') {
      authorName = targetPlan.growthPic || 'Trần Thị Ánh';
      authorTitle = 'Growth PIC / Brand Growth Lead';
    } else if (currentRole === 'LEAD') {
      authorName = 'Nguyễn Hoàng Long';
      authorTitle = 'Trưởng Phòng B2C';
    }

    const newMsg: PlanDiscussionMessage = {
      id: `DISC-${Date.now()}`,
      authorName,
      authorRole: currentRole,
      authorTitle,
      content: note ? `${logMessage}\n\nÝ kiến ghi chú: "${note}"` : logMessage,
      type: newStatus === 'PRE_APPROVED' 
        ? 'PRE_APPROVAL_PASS' 
        : (newStatus === 'APPROVED' || newStatus === 'LEAD_APPROVED' || newStatus === 'IN_EXECUTION') 
        ? 'FINAL_APPROVAL_PASS' 
        : newStatus === 'REVISION_REQUESTED' 
        ? 'REVISION_REQUEST' 
        : 'STATUS_CHANGE',
      timestamp,
      tags: ['Quy Trình Duyệt', newStatus]
    };

    const updatedPlan: InputPlanBreakdownState = {
      ...targetPlan,
      status: newStatus,
      updatedAt: timestamp,
      preApprovedBy: newStatus === 'PRE_APPROVED' ? authorName : targetPlan.preApprovedBy,
      preApprovedAt: newStatus === 'PRE_APPROVED' ? timestamp : targetPlan.preApprovedAt,
      preApprovalNotes: newStatus === 'PRE_APPROVED' ? note : targetPlan.preApprovalNotes,
      approvedBy: (newStatus === 'APPROVED' || newStatus === 'IN_EXECUTION') ? authorName : targetPlan.approvedBy,
      approvedAt: (newStatus === 'APPROVED' || newStatus === 'IN_EXECUTION') ? timestamp : targetPlan.approvedAt,
      revisionNotes: newStatus === 'REVISION_REQUESTED' ? note : targetPlan.revisionNotes,
      discussions: [newMsg, ...(targetPlan.discussions || [])]
    };

    if (isTargetCurrent) {
      setPlanState(updatedPlan);
    }
    setMonthlyPlans(prev => prev.map(p => p.id === planId ? updatedPlan : p));
  };

  const handleSendMessageToPlan = (
    planId: string, 
    msg: Omit<PlanDiscussionMessage, 'id' | 'timestamp'>
  ) => {
    const fullMsg: PlanDiscussionMessage = {
      ...msg,
      id: `DISC-${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    const isTargetCurrent = planState.id === planId;
    if (isTargetCurrent) {
      setPlanState(prev => ({
        ...prev,
        updatedAt: new Date().toISOString(),
        discussions: [fullMsg, ...(prev.discussions || [])]
      }));
    }
    setMonthlyPlans(prev => prev.map(p => {
      if (p.id !== planId) return p;
      return {
        ...p,
        updatedAt: new Date().toISOString(),
        discussions: [fullMsg, ...(p.discussions || [])]
      };
    }));
  };

  // MÀN HÌNH 1: QUẢN LÝ KẾ HOẠCH THEO THÁNG (MONTHLY PLAN HUB)
  if (!isShowingStudio) {
    return (
      <MonthlyPlanHub
        plans={monthlyPlans}
        currentUser={currentUser}
        onNotify={notify}
        onSelectPlan={(selected) => {
          setPlanState(selected);
          setIsShowingStudio(true);
        }}
        onCreatePlan={(newPlan) => {
          setMonthlyPlans(prev => [newPlan, ...prev]);
          setPlanState(newPlan);
          setIsShowingStudio(true);
        }}
        onClonePlan={(sourcePlan, targetMonth) => {
          const cloned: InputPlanBreakdownState = {
            ...sourcePlan,
            id: `PLAN-${targetMonth.replace('/', '-')}-${Date.now().toString().slice(-4)}`,
            title: `Kế Hoạch B2C ${targetMonth} - ${sourcePlan.brandName} (Nhân Bản)`,
            month: targetMonth,
            status: 'DRAFT',
            statusLabel: 'Bản Nháp (Đang Lập)',
            spentBudget: 0,
            deliveredContents: 0,
            actualGmv: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          setMonthlyPlans(prev => [cloned, ...prev]);
        }}
        onUpdatePlanStatus={(planId, newStatus, log, note) => {
          handleStatusChangeForPlan(planId, newStatus, log || `Cập nhật trạng thái kế hoạch sang ${newStatus}`, note);
        }}
        onSendMessage={(planId, msg) => {
          handleSendMessageToPlan(planId, msg);
        }}
      />
    );
  }

  // MÀN HÌNH 2: PHÂN RÃ KẾ HOẠCH CHI TIẾT (INPUT PLAN STUDIO)
  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-[1600px] mx-auto pb-12">
      {/* THANH ĐIỀU HƯỚNG: QUAY LẠI QUẢN LÝ KẾ HOẠCH THÁNG */}
      <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-indigo-500/20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              // Lưu cập nhật kế hoạch hiện tại vào master state
              setMonthlyPlans(prev => prev.map(p => p.id === planState.id ? planState : p));
              setIsShowingStudio(false);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs backdrop-blur-sm transition-all border border-white/10 shadow-sm transform active:scale-95"
          >
            <ChevronLeft className="w-4 h-4 text-amber-400" />
            <span>Quay lại quản lý kế hoạch tháng</span>
          </button>

          <div className="h-6 w-px bg-white/20 hidden md:block" />

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                {planState.month} • {planState.week}
              </span>
              <span className="text-xs font-semibold text-indigo-200">
                {planState.brandName}
              </span>
              <span className="text-xs text-slate-400">• PIC: <strong className="text-white">{planState.pic}</strong></span>
            </div>
            <div className="text-sm font-semibold text-white truncate max-w-xl">
              {planState.title}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Plan Switcher */}
          <select
            value={planState.id}
            onChange={(e) => {
              const found = monthlyPlans.find(p => p.id === e.target.value);
              if (found) {
                // save current first
                setMonthlyPlans(prev => prev.map(p => p.id === planState.id ? planState : p));
                setPlanState(found);
                notify(`Đã chuyển sang kế hoạch: ${found.title}`);
              }
            }}
            className="px-3 py-2 bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-xl text-xs font-semibold focus:outline-none cursor-pointer"
          >
            {monthlyPlans.map(p => (
              <option key={p.id} value={p.id} className="text-slate-900">
                [{p.month}] {p.brandName} - {p.title.slice(0, 32)}...
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setMonthlyPlans(prev => prev.map(p => p.id === planState.id ? { ...planState, updatedAt: new Date().toISOString() } : p));
              notify(`Đã lưu thay đổi kế hoạch "${planState.title}" vào Danh Mục Master!`);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs shadow-md transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            Lưu kế hoạch
          </button>
        </div>
      </div>

      {/* 0. LUỒNG PHÊ DUYỆT 2 CẤP & TIẾN TRÌNH SƠ DUYỆT (APPROVAL STEPPER) */}
      <PlanApprovalStepper
        plan={planState}
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        onStatusChange={(newStatus, log, note) => handleStatusChangeForPlan(planState.id, newStatus, log, note)}
        onNotify={notify}
      />

      {/* ========================================================================= */}
      {/* 1. TOP HEADER & QUICK METRICS COCKPIT                                    */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
        {/* Row 1: Brand / Period / Test Bar */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-slate-900 tracking-tight">
                  Tạo kế hoạch Input Plan B2C
                </h1>
                <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  Phân rã 4 tầng & 7 bậc KOC
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Nhập ngân sách & số lượng ban đầu → Hệ thống tự động phân tách theo kênh, nền tảng & Tier KL1-KL7
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

            {/* PIC Chủ Trì Kế Hoạch (Có trách nhiệm phân bổ cho team) */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
              <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="text-2xs font-semibold text-slate-400">PIC:</span>
              <select
                value={planState.pic}
                onChange={(e) => {
                  const newPic = e.target.value;
                  setPlanState(prev => ({ ...prev, pic: newPic }));
                  notify(`Đã chọn ${newPic} làm PIC chủ trì kế hoạch ${planState.brandName.split('_')[0]}!`);
                }}
                className="bg-transparent text-slate-800 font-semibold text-xs focus:outline-none cursor-pointer"
                title="Chuyên viên phụ trách chính (PIC) có trách nhiệm phân bổ kế hoạch cho các bạn nhân sự khác trong team"
              >
                {PIC_OPTIONS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Nút Phân Bổ Kế Hoạch Cho Team */}
            <button
              onClick={() => setIsAllocationModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition"
              title="Mở bảng phân bổ từng dòng / bậc KOC cho các bạn nhân sự trong team"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Phân bổ cho Team</span>
            </button>

            {/* Test Presets Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/60">
              <span className="text-2xs font-semibold text-slate-500 px-1 flex items-center gap-1">
                <FlaskConical className="w-3 h-3 text-indigo-500" />
                Test:
              </span>
              {MOCK_PLAN_SCENARIOS.slice(0, 3).map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => handleSelectScenario(sc.id)}
                  className={`text-2xs font-medium px-2 py-0.5 rounded transition ${
                    activeScenarioId === sc.id
                      ? 'bg-white text-indigo-700 font-semibold shadow-2xs'
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
                <span className="font-semibold text-2xs text-slate-700 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-indigo-600" />
                  1. Ngân sách tổng giao
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
                    className="w-full text-xl font-semibold font-mono text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 shadow-2xs"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400 pointer-events-none">
                    {formatVndShort(planState.totalTargetBudget)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPlanState(prev => ({ ...prev, totalTargetBudget: Math.max(0, prev.totalTargetBudget - 10000000) }))}
                    className="px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition"
                    title="Giảm 10 triệu"
                  >
                    -10M
                  </button>
                  <button
                    onClick={() => setPlanState(prev => ({ ...prev, totalTargetBudget: prev.totalTargetBudget + 10000000 }))}
                    className="px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition"
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
                <span className={`font-mono font-semibold ${isOverBudget ? 'text-rose-600' : 'text-slate-900'}`}>
                  {formatVndShort(totalAllocatedBudget)} / {formatVndShort(planState.totalTargetBudget)}
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
                <span className="font-semibold text-2xs text-slate-700 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-emerald-600" />
                  2. Chỉ tiêu số lượng video
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
                    className="w-full text-xl font-semibold font-mono text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 shadow-2xs"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400 pointer-events-none">
                    Video / Live
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPlanState(prev => ({ ...prev, totalTargetContents: Math.max(0, prev.totalTargetContents - 5) }))}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition"
                    title="Giảm 5 slot"
                  >
                    -5
                  </button>
                  <button
                    onClick={() => setPlanState(prev => ({ ...prev, totalTargetContents: prev.totalTargetContents + 5 }))}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition"
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
                <span className={`font-mono font-semibold ${contentHeadroom !== 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
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
          <div className="lg:col-span-4 p-4 rounded-xl bg-indigo-50/50 border border-indigo-200/70 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-indigo-950 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  3. Trạng thái cân đối
                </span>
                <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full ${
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
                    <span className="font-mono font-semibold text-rose-600">
                      -{formatVndShort(Math.abs(budgetHeadroom))}
                    </span>
                  ) : (
                    <span className="font-mono font-semibold text-emerald-700">
                      +{formatVndShort(budgetHeadroom)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Số lượng video còn thiếu:</span>
                  <span className={`font-mono font-semibold ${contentHeadroom === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {contentHeadroom === 0 ? 'Đã khớp đủ' : `${contentHeadroom} video`}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Balance Button */}
            <div className="mt-3 pt-2 border-t border-indigo-200/50 flex items-center gap-2">
              <button
                onClick={() => handleApplyPreset('BALANCED')}
                className="w-full text-xs font-semibold py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-1.5 shadow-2xs transition"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Cân đối chuẩn 1-Click</span>
              </button>
            </div>
          </div>
        </div>

        {/* Row 3: Strategy Presets Quick Bar (One-click breakdown) */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 mr-1">
              Phân rã nhanh theo chiến lược:
            </span>
            <button
              onClick={() => handleApplyPreset('BALANCED')}
              className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 ${
                planState.strategyPreset === 'BALANCED'
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <span>Cân bằng (chuẩn Upbase)</span>
            </button>
            <button
              onClick={() => handleApplyPreset('GMV_MAX')}
              className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 ${
                planState.strategyPreset === 'GMV_MAX'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-semibold'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <span>Tối đa GMV chốt đơn</span>
            </button>
            <button
              onClick={() => handleApplyPreset('BRAND_PUSH')}
              className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 ${
                planState.strategyPreset === 'BRAND_PUSH'
                  ? 'bg-purple-50 border-purple-300 text-purple-700 font-semibold'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <span>Tăng phủ Brand (KL5-KL7)</span>
            </button>
            <button
              onClick={() => handleApplyPreset('COST_SAVER')}
              className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 ${
                planState.strategyPreset === 'COST_SAVER'
                  ? 'bg-amber-50 border-amber-300 text-amber-700 font-semibold'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <span>Tiết kiệm CIR thấp</span>
            </button>
          </div>

          {/* Quick Business Projections */}
          <div className="flex items-center gap-3 text-xs font-mono text-slate-600">
            <span>Dự phóng GMV: <strong className="text-slate-900 font-semibold">{formatVndShort(totalProjectedGmv)}</strong></span>
            <span>•</span>
            <span>CIR: <strong className={projectedCir <= 20 ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-semibold'}>{projectedCir.toFixed(1)}%</strong></span>
            <span>•</span>
            <span>ROI: <strong className="text-indigo-700 font-semibold">{projectedRoi.toFixed(1)}x</strong></span>
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
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'TIKTOK'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/90 hover:bg-slate-50'
            }`}
          >
            <span>1. TikTok Creator (KL1 → KL7)</span>
            <span className={`text-2xs px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'TIKTOK' ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-100 text-slate-600'
            }`}>
              {channelTotals.tiktok.qty} clip · {formatVndShort(channelTotals.tiktok.budget)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('MULTI_PLATFORM')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'MULTI_PLATFORM'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/90 hover:bg-slate-50'
            }`}
          >
            <span>2. Đa sàn</span>
            <span className={`text-2xs px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'MULTI_PLATFORM' ? 'bg-orange-800 text-orange-100' : 'bg-slate-100 text-slate-600'
            }`}>
              {channelTotals.multiPlatform.qty} clip · {formatVndShort(channelTotals.multiPlatform.budget)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('SELF_CHANNEL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'SELF_CHANNEL'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/90 hover:bg-slate-50'
            }`}
          >
            <span>3. Kênh tự xây</span>
            <span className={`text-2xs px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'SELF_CHANNEL' ? 'bg-teal-800 text-teal-100' : 'bg-slate-100 text-slate-600'
            }`}>
              {channelTotals.selfChannel.qty} clip · {formatVndShort(channelTotals.selfChannel.budget)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('LIVESTREAM')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'LIVESTREAM'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/90 hover:bg-slate-50'
            }`}
          >
            <span>4. Livestream Commerce</span>
            <span className={`text-2xs px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'LIVESTREAM' ? 'bg-purple-800 text-purple-100' : 'bg-slate-100 text-slate-600'
            }`}>
              {channelTotals.livestream.qty} ca · {formatVndShort(channelTotals.livestream.budget)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('DISCUSSIONS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'DISCUSSIONS'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/90 hover:bg-slate-50'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
            <span>5. Trao Đổi Booking & Growth</span>
            <span className={`text-2xs px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'DISCUSSIONS' ? 'bg-indigo-600 text-white' : 'bg-amber-100 text-amber-800'
            }`}>
              {planState.discussions?.length || 0} trao đổi
            </span>
          </button>
        </div>

        {/* View Switchers & Excel Preview */}
        <div className="flex items-center gap-2">
          {/* Card vs Table toggle */}
          {activeTab !== 'EXCEL_PREVIEW' && activeTab !== 'DISCUSSIONS' && (
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
              <button
                onClick={() => setViewMode('TABLE')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                  viewMode === 'TABLE' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Dạng bảng tối giản, dễ nhập số lượng"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Bảng tinh gọn</span>
              </button>
              <button
                onClick={() => setViewMode('CARDS')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                  viewMode === 'CARDS' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Dạng thẻ trực quan cho từng bậc KOC"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Thẻ bậc KOC</span>
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
            <span>Đối chiếu 4.1.1</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN CONTENT AREA: VIEW MODE 1 - CARDS VIEW (INTUITIVE & MODERN)       */}
      {/* ========================================================================= */}
      {activeTab !== 'EXCEL_PREVIEW' && activeTab !== 'DISCUSSIONS' && viewMode === 'CARDS' && (
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
                      <span className={`text-2xs font-semibold px-2.5 py-0.5 rounded-md font-mono border ${getTierBadgeStyle(item.tierCode)}`}>
                        {item.tierCode}
                      </span>
                      <span className="text-xs font-semibold font-mono text-slate-800">
                        {formatVndShort(item.unitCost)} / slot
                      </span>
                    </div>

                    <h3 className="font-semibold text-sm text-slate-900 leading-snug">
                      {item.tierLabel.split(':')[1]?.trim() || item.tierLabel}
                    </h3>
                    <p className="text-2xs text-slate-500 mt-1 line-clamp-1">
                      {item.notes || item.platform}
                    </p>

                    {/* Content Format Selector Dropdown (Clean Popover Style) */}
                    <div className="mt-3">
                      <label className="text-2xs font-semibold text-slate-400 block mb-1">
                        Định dạng video tương ứng
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

                    {/* Nhân Sự Phụ Trách / Thực Thi */}
                    <div className="mt-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-2xs font-semibold text-slate-400 flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-blue-600" />
                          Nhân sự phụ trách
                        </label>
                        {item.assignedStaff && item.assignedStaff !== planState.pic && (
                          <span className="text-2xs font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                            Team
                          </span>
                        )}
                      </div>
                      <select
                        value={item.assignedStaff || planState.pic}
                        onChange={(e) => handleUpdateItemAssignee(item.id, e.target.value)}
                        className={`w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition ${
                          item.assignedStaff && item.assignedStaff !== planState.pic
                            ? 'bg-blue-50/70 border-blue-300 text-blue-900'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                        }`}
                      >
                        {PIC_OPTIONS.map(staff => (
                          <option key={staff} value={staff}>
                            {staff} {staff === planState.pic ? '(PIC)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Card Footer: Quantity Stepper & Subtotal */}
                  <div className="mt-4 pt-3.5 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-600">Số lượng clip:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleAdjustItemQty(item.id, -1)}
                          className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold flex items-center justify-center transition active:scale-95 shadow-2xs"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) => handleUpdateItemQty(item.id, Number(e.target.value))}
                          className="w-12 text-center text-sm font-semibold font-mono py-0.5 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs"
                        />
                        <button
                          onClick={() => handleAdjustItemQty(item.id, 1)}
                          className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold flex items-center justify-center transition active:scale-95 shadow-2xs"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleAdjustItemQty(item.id, 5)}
                          className="text-2xs font-semibold px-1.5 py-1 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition"
                          title="Tăng nhanh 5 clip"
                        >
                          +5
                        </button>
                      </div>
                    </div>

                    {/* Subtotal & GMV */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-500">Thành tiền:</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {formatVndShort(item.totalBudget)}
                        <span className="text-2xs font-normal text-slate-400 ml-1">({itemBudgetPct.toFixed(1)}%)</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-2xs text-slate-500 mt-0.5">
                      <span>Dự phóng GMV:</span>
                      <span className="font-mono font-semibold text-emerald-700">
                        {formatVndShort(item.targetGmv)} (ROI {item.expectedRoiMultiplier}x)
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
              <span>Tổng ngân sách: <strong className="text-slate-900">{formatVndShort(visibleItems.reduce((s, it) => s + it.totalBudget, 0))}</strong></span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAllocationModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition"
                title="Mở bảng phân bổ từng dòng kế hoạch cho nhân sự trong team Booking"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Phân bổ cho Team</span>
              </button>

              <button
                onClick={handleExportExcel}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất File Excel 4.1.1</span>
              </button>

              <button
                onClick={handleGenerateBookingSlots}
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition"
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
      {activeTab !== 'EXCEL_PREVIEW' && activeTab !== 'DISCUSSIONS' && viewMode === 'TABLE' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-2xs">
                  <th className="py-3 px-4 w-44">Phân bậc KOC / nền tảng</th>
                  <th className="py-3 px-4 min-w-[220px]">Loại nội dung tương ứng</th>
                  <th className="py-3 px-3 w-48">Nhân sự thực thi</th>
                  <th className="py-3 px-4 w-40 text-center">Số lượng clip</th>
                  <th className="py-3 px-4 w-32 text-right">Đơn giá net</th>
                  <th className="py-3 px-4 w-32 text-right">Thành tiền</th>
                  <th className="py-3 px-4 w-32 text-right">Dự phóng GMV</th>
                  <th className="py-3 px-3 w-16 text-center">Điền nốt</th>
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
                          <span className={`text-2xs font-semibold px-2 py-0.5 rounded font-mono border ${getTierBadgeStyle(item.tierCode)}`}>
                            {item.tierCode}
                          </span>
                          <span className="font-semibold text-slate-900 text-xs truncate max-w-[130px]">
                            {item.tierLabel.split(':')[1]?.trim() || item.tierLabel}
                          </span>
                        </div>
                        <span className="text-2xs text-slate-400 block truncate max-w-[180px]">
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

                      {/* Column 2b: Assignee Selector */}
                      <td className="py-3 px-3">
                        <select
                          value={item.assignedStaff || planState.pic}
                          onChange={(e) => handleUpdateItemAssignee(item.id, e.target.value)}
                          className={`w-full text-xs font-semibold px-2 py-1.5 rounded-lg border transition shadow-2xs ${
                            item.assignedStaff && item.assignedStaff !== planState.pic
                              ? 'bg-blue-50/70 border-blue-300 text-blue-900'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                        >
                          {PIC_OPTIONS.map(staff => (
                            <option key={staff} value={staff}>
                              {staff} {staff === planState.pic ? '(PIC)' : ''}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Column 3: Quantity Stepper & Number Input */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleAdjustItemQty(item.id, -1)}
                            className="w-6 h-6 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold flex items-center justify-center transition shadow-2xs active:scale-95"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) => handleUpdateItemQty(item.id, Number(e.target.value))}
                            className="w-12 text-center text-xs font-semibold font-mono py-1 border border-slate-200 rounded-md bg-white text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs"
                          />
                          <button
                            onClick={() => handleAdjustItemQty(item.id, 1)}
                            className="w-6 h-6 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold flex items-center justify-center transition shadow-2xs active:scale-95"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleAdjustItemQty(item.id, 5)}
                            className="text-2xs font-semibold px-1.5 py-1 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition"
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
                              title={`Khôi phục Benchmark: ${formatVndShort(item.benchmarkCost)}`}
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Column 5: Subtotal & Percentage Bar */}
                      <td className="py-3 px-4 text-right font-mono">
                        <span className="text-xs font-semibold text-slate-900 block">
                          {formatVndShort(item.totalBudget)}
                        </span>
                        <div className="flex items-center justify-end gap-1.5 mt-0.5">
                          <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden inline-block">
                            <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${Math.min(100, itemBudgetPct * 3)}%` }} />
                          </div>
                          <span className="text-2xs text-slate-400">{itemBudgetPct.toFixed(1)}%</span>
                        </div>
                      </td>

                      {/* Column 6: Projected GMV */}
                      <td className="py-3 px-4 text-right font-mono">
                        <span className="text-xs font-semibold text-emerald-700 block">
                          {formatVndShort(item.targetGmv)}
                        </span>
                        <span className="text-2xs text-slate-400 block">
                          ROI {item.expectedRoiMultiplier}x
                        </span>
                      </td>

                      {/* Column 7: Quick Fill Button */}
                      <td className="py-3 px-3 text-center">
                        {contentHeadroom > 0 ? (
                          <button
                            onClick={() => handleFillRemainingToItem(item.id)}
                            className="text-2xs font-semibold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded border border-indigo-200 transition"
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
              <span>Tổng kênh này: <strong className="text-indigo-700">{formatVndShort(visibleItems.reduce((s, it) => s + it.totalBudget, 0))}</strong></span>
              <span>•</span>
              <span>Số lượng: <strong className="text-slate-900">{visibleItems.reduce((s, it) => s + it.qty, 0)}</strong> video</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAllocationModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition"
                title="Mở bảng phân bổ từng dòng kế hoạch cho nhân sự trong team Booking"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Phân bổ cho Team</span>
              </button>

              <button
                onClick={handleExportExcel}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất File Excel 4.1.1</span>
              </button>

              <button
                onClick={handleGenerateBookingSlots}
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition"
              >
                <Send className="w-3.5 h-3.5 text-amber-300" />
                <span>Chuyển Sang Booking Execution</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TAB TRAO ĐỔI BOOKING & GROWTH & LỊCH SỬ DUYỆT                          */}
      {/* ========================================================================= */}
      {activeTab === 'DISCUSSIONS' && (
        <div className="space-y-4">
          <PlanDiscussionHub
            plan={planState}
            currentRole={currentRole}
            onSendMessage={(msg) => handleSendMessageToPlan(planState.id, msg)}
            onNotify={notify}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. TAB EXCEL PREVIEW (CLEAN SHEET 4.1.1 VERIFICATION)                     */}
      {/* ========================================================================= */}
      {activeTab === 'EXCEL_PREVIEW' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-semibold">Đối chiếu chuẩn xác Sheet 4.1.1 Input Plan</h3>
                <p className="text-xs text-slate-400">Kiểm tra đầy đủ 61 cột chuẩn trước khi xuất file gửi trưởng phòng duyệt</p>
              </div>
            </div>
            <button
              onClick={handleExportExcel}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải File .xlsx này</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-[460px]">
            <table className="w-full text-xs text-left border-collapse font-mono">
              <thead className="sticky top-0 bg-slate-800 text-white z-10 text-2xs">
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
                  <th className="p-2.5 border border-slate-700 bg-blue-900 text-right">Ngân sách TikTok</th>
                  <th className="p-2.5 border border-slate-700 bg-orange-900 text-center">Shopee Reup</th>
                  <th className="p-2.5 border border-slate-700 bg-orange-900 text-center">Shopee Aff</th>
                  <th className="p-2.5 border border-slate-700 bg-teal-900 text-center">Self Voice</th>
                  <th className="p-2.5 border border-slate-700 bg-teal-900 text-center">Self AI</th>
                  <th className="p-2.5 border border-slate-700 bg-purple-900 text-center">Live độc quyền</th>
                  <th className="p-2.5 border border-slate-700 bg-purple-900 text-center">Live Add-in</th>
                  <th className="p-2.5 border border-slate-700 bg-emerald-900 text-right">Target GMV</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white hover:bg-blue-50 text-slate-900 font-semibold">
                  <td className="p-2.5 border border-slate-200">{planState.month}</td>
                  <td className="p-2.5 border border-slate-200">{planState.brandName}</td>
                  <td className="p-2.5 border border-slate-200">{planState.week}</td>
                  <td className="p-2.5 border border-slate-200 text-center text-indigo-700 font-semibold">
                    {planState.items.filter(it => it.channel === 'TIKTOK').reduce((s, it) => s + it.qty, 0)}
                  </td>
                  <td className="p-2.5 border border-slate-200 text-center">{planState.items.find(i => i.id === 'row-tt-kl1')?.qty || 0}</td>
                  <td className="p-2.5 border border-slate-200 text-center">{planState.items.find(i => i.id === 'row-tt-kl2')?.qty || 0}</td>
                  <td className="p-2.5 border border-slate-200 text-center">{planState.items.find(i => i.id === 'row-tt-kl3')?.qty || 0}</td>
                  <td className="p-2.5 border border-slate-200 text-center">{planState.items.find(i => i.id === 'row-tt-kl4')?.qty || 0}</td>
                  <td className="p-2.5 border border-slate-200 text-center">{planState.items.find(i => i.id === 'row-tt-kl5')?.qty || 0}</td>
                  <td className="p-2.5 border border-slate-200 text-center">{planState.items.find(i => i.id === 'row-tt-kl6')?.qty || 0}</td>
                  <td className="p-2.5 border border-slate-200 text-center">{planState.items.find(i => i.id === 'row-tt-kl7')?.qty || 0}</td>
                  <td className="p-2.5 border border-slate-200 text-right text-indigo-700 font-semibold">
                    {formatVndShort(planState.items.filter(it => it.channel === 'TIKTOK').reduce((s, it) => s + it.totalBudget, 0))}
                  </td>
                  <td className="p-2.5 border border-slate-200 text-center">{planState.items.find(i => i.id === 'row-shopee-reup')?.qty || 0}</td>
                  <td className="p-2.5 border border-slate-200 text-center">{planState.items.find(i => i.id === 'row-shopee-aff')?.qty || 0}</td>
                  <td className="p-2.5 border border-slate-200 text-center">{planState.items.find(i => i.id === 'row-self-voice')?.qty || 0}</td>
                  <td className="p-2.5 border border-slate-200 text-center">{planState.items.find(i => i.id === 'row-self-ai')?.qty || 0}</td>
                  <td className="p-2.5 border border-slate-200 text-center">{planState.items.find(i => i.id === 'row-live-exclusive')?.qty || 0}</td>
                  <td className="p-2.5 border border-slate-200 text-center">{planState.items.find(i => i.id === 'row-live-addin')?.qty || 0}</td>
                  <td className="p-2.5 border border-slate-200 text-right text-emerald-700 font-semibold">
                    {formatVndShort(planState.targetGmv)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL PHÂN BỔ KẾ HOẠCH CHO TEAM BOOKING (PIC COORDINATION STUDIO)     */}
      {/* ========================================================================= */}
      {isAllocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold">Phân bổ kế hoạch cho Team booking</h3>
                    <span className="text-2xs bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full font-semibold">
                      Chủ trì: {planState.pic}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Thương hiệu: <strong className="text-white">{planState.brandName.split('_')[0]}</strong> • {planState.month} - {planState.week} • Tổng {totalAllocatedContents} video ({formatVndShort(totalAllocatedBudget)})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAllocationModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
                title="Đóng cửa sổ"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Workload Summary across Team */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-blue-600" />
                      Cân Bằng Tải Khối Lượng Công Việc Team ({staffAllocationSummary.filter(s => s.videoCount > 0).length} nhân sự tham gia)
                    </h4>
                    <p className="text-2xs text-slate-400 mt-0.5">
                      Bạn PIC chủ trì có trách nhiệm điều phối chỉ tiêu video và ngân sách phù hợp năng lực của từng bạn
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAutoAssignByExpertise}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-1.5 transition shadow-2xs"
                    >
                      <Zap className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Gán tự động theo chuyên môn</span>
                    </button>
                    <button
                      onClick={handleAssignAllToPic}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-1 transition"
                    >
                      <RotateCcw className="w-3 h-3 text-slate-500" />
                      <span>Gán toàn bộ cho PIC</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {PIC_OPTIONS.map((staffName) => {
                    const info = TEAM_MEMBERS_INFO[staffName] || { role: 'Booking Specialist', avatar: 'ST', expertise: 'KOC' };
                    const summary = staffAllocationSummary.find(s => s.staffName === staffName) || {
                      staffName,
                      videoCount: 0,
                      totalBudget: 0,
                      targetGmv: 0,
                      channels: new Set<string>()
                    };
                    const isPic = staffName === planState.pic;
                    const pctOfTotal = totalAllocatedContents > 0 ? (summary.videoCount / totalAllocatedContents) * 100 : 0;

                    return (
                      <div
                        key={staffName}
                        className={`p-3.5 rounded-xl border transition ${
                          summary.videoCount > 0
                            ? isPic 
                              ? 'bg-blue-50/60 border-blue-200 shadow-2xs'
                              : 'bg-white border-slate-200 shadow-2xs'
                            : 'bg-slate-50/60 border-slate-200/60 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg font-semibold text-xs flex items-center justify-center ${
                              isPic ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {info.avatar}
                            </div>
                            <div>
                              <div className="flex items-center gap-1">
                                <span className="font-semibold text-xs text-slate-900 leading-tight">{staffName}</span>
                                {isPic && (
                                  <span className="text-2xs bg-blue-600 text-white font-semibold px-1.5 py-0.2 rounded-full">
                                    PIC
                                  </span>
                                )}
                              </div>
                              <span className="text-2xs text-slate-500 block leading-tight">{info.role}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-baseline justify-between">
                          <span className="text-xs text-slate-600">Được giao:</span>
                          <span className="font-semibold font-mono text-sm text-indigo-700">
                            {summary.videoCount} <span className="text-2xs font-normal text-slate-500">video ({pctOfTotal.toFixed(0)}%)</span>
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-2xs font-mono text-slate-500 mt-1">
                          <span>Ngân sách:</span>
                          <span className="font-semibold text-slate-800">{formatVndShort(summary.totalBudget)}</span>
                        </div>

                        {/* Progress Bar of workload */}
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                          <div
                            className={`h-full rounded-full transition-all ${
                              pctOfTotal > 40 ? 'bg-amber-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${Math.min(100, pctOfTotal)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Items Allocation Table */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-slate-600" />
                      Chi tiết phân bổ từng phân bậc KOC & kênh
                    </h4>
                    <p className="text-2xs text-slate-400 mt-0.5">
                      Chọn trực tiếp nhân sự thực thi và nhập chỉ đạo chi tiết của PIC cho từng dòng
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      onClick={() => setAllocationFilterChannel('ALL')}
                      className={`px-2.5 py-1 rounded text-2xs font-semibold transition ${
                        allocationFilterChannel === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Tất Cả ({planState.items.length})
                    </button>
                    <button
                      onClick={() => setAllocationFilterChannel('TIKTOK')}
                      className={`px-2.5 py-1 rounded text-2xs font-semibold transition ${
                        allocationFilterChannel === 'TIKTOK' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      TikTok
                    </button>
                    <button
                      onClick={() => setAllocationFilterChannel('SHOPEE')}
                      className={`px-2.5 py-1 rounded text-2xs font-semibold transition ${
                        allocationFilterChannel === 'SHOPEE' ? 'bg-white text-orange-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Đa sàn
                    </button>
                    <button
                      onClick={() => setAllocationFilterChannel('SELF_CHANNEL')}
                      className={`px-2.5 py-1 rounded text-2xs font-semibold transition ${
                        allocationFilterChannel === 'SELF_CHANNEL' ? 'bg-white text-teal-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Kênh Tự Xây
                    </button>
                    <button
                      onClick={() => setAllocationFilterChannel('LIVESTREAM')}
                      className={`px-2.5 py-1 rounded text-2xs font-semibold transition ${
                        allocationFilterChannel === 'LIVESTREAM' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Livestream
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <div className="overflow-x-auto max-h-[380px]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 text-2xs">
                        <tr>
                          <th className="py-2.5 px-3 w-40">Phân bậc KOC</th>
                          <th className="py-2.5 px-3 w-44">Định dạng video</th>
                          <th className="py-2.5 px-3 w-28 text-center">Số lượng clip</th>
                          <th className="py-2.5 px-3 w-28 text-right">Ngân Sách</th>
                          <th className="py-2.5 px-3 w-52">Nhân sự phụ trách</th>
                          <th className="py-2.5 px-3 min-w-[200px]">Chỉ đạo / lưu ý của PIC</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {planState.items
                          .filter(item => {
                            if (allocationFilterChannel === 'ALL') return true;
                            if (allocationFilterChannel === 'TIKTOK') return item.channel === 'TIKTOK';
                            if (allocationFilterChannel === 'SHOPEE') return ['SHOPEE', 'FACEBOOK', 'INSTAGRAM', 'THREADS'].includes(item.channel);
                            if (allocationFilterChannel === 'SELF_CHANNEL') return item.channel === 'SELF_CHANNEL';
                            if (allocationFilterChannel === 'LIVESTREAM') return item.channel === 'LIVESTREAM';
                            return true;
                          })
                          .map(item => {
                            const isPicAssigned = !item.assignedStaff || item.assignedStaff === planState.pic;

                            return (
                              <tr key={item.id} className="hover:bg-slate-50 transition">
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-2xs font-semibold px-2 py-0.5 rounded font-mono border ${getTierBadgeStyle(item.tierCode)}`}>
                                      {item.tierCode}
                                    </span>
                                    <span className="font-semibold text-slate-900 truncate max-w-[110px]">
                                      {item.tierLabel.split(':')[1]?.trim() || item.tierLabel}
                                    </span>
                                  </div>
                                </td>

                                <td className="py-2.5 px-3">
                                  <span className="text-slate-700 font-medium truncate block max-w-[170px]">
                                    {item.contentFormat}
                                  </span>
                                </td>

                                <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-900">
                                  {item.qty} clip
                                </td>

                                <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                                  {formatVndShort(item.totalBudget)}
                                </td>

                                <td className="py-2.5 px-3">
                                  <select
                                    value={item.assignedStaff || planState.pic}
                                    onChange={(e) => handleUpdateItemAssignee(item.id, e.target.value)}
                                    className={`w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition ${
                                      !isPicAssigned
                                        ? 'bg-blue-50/70 border-blue-300 text-blue-900'
                                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                                    }`}
                                  >
                                    {PIC_OPTIONS.map(staff => (
                                      <option key={staff} value={staff}>
                                        {staff} {staff === planState.pic ? '(PIC Chủ Trì)' : ''}
                                      </option>
                                    ))}
                                  </select>
                                </td>

                                <td className="py-2.5 px-3">
                                  <input
                                    type="text"
                                    placeholder="Lưu ý: Yêu cầu KOC lên link bio, reup Shopee..."
                                    value={item.staffNotes || ''}
                                    onChange={(e) => handleUpdateItemStaffNotes(item.id, e.target.value)}
                                    className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-xs font-mono text-slate-600">
                <span>Phân bổ: <strong className="text-blue-700 font-semibold">{staffAllocationSummary.filter(s => s.videoCount > 0).length}</strong> nhân sự</span>
                <span>•</span>
                <span>Tổng clip: <strong className="text-slate-900 font-semibold">{totalAllocatedContents}</strong></span>
                <span>•</span>
                <span>Ngân sách: <strong className="text-slate-900 font-semibold">{formatVndShort(totalAllocatedBudget)}</strong></span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAllocationModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs transition"
                >
                  Đóng & lưu nháp
                </button>

                <button
                  onClick={handleGenerateBookingSlots}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md transition active:scale-95"
                >
                  <Send className="w-3.5 h-3.5 text-amber-300" />
                  <span>Xác nhận & giao việc cho Team</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
