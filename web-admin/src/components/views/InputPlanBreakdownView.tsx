'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  ChevronUp,
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
  BadgeCheck,
  SendHorizonal,
  Lock
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
  MonthlyPlanStatus,
  StorePortfolioItem,
  PlanVersionSnapshot
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
import {
  INITIAL_MONTHLY_PLANS,
  getPlanVersionSnapshots,
  suggestNextVersionCode,
  enrichPlanWithVersions,
} from '../../lib/monthlyPlanData';
import { useMonthlyPlanSync } from '../../lib/useMonthlyPlanSync';
import { PlanApprovalStepper, deriveSignOff } from './PlanApprovalStepper';
import { PlanHistoryModal } from './PlanHistoryModal';
import { PlanChatDrawer, PlanChatButton } from './PlanChatDrawer';
import { usePlanChat } from '../../lib/usePlanChat';
import { PlanSyncBadge } from './PlanSyncBadge';
import {
  ConfirmDialog,
  ShopeeLogo,
  FacebookLogo,
  InstagramLogo,
  ThreadsLogo,
  TikTokLogo,
  Presence,
} from '../ui';
import { StorePlanMindmap } from './StorePlanMindmap';

interface InputPlanBreakdownViewProps {
  currentUser?: UserProfile;
  storePortfolios?: StorePortfolioItem[];
  onUpdateStore?: (store: StorePortfolioItem) => void;
  onNotify?: (msg: string) => void;
  onGenerateDealsFromPlan?: (slots: StaffDetailedPlanItem[]) => void;
  onApplyPlanToWeeklyStore?: (planData: WeeklyStorePlan411) => void;
  initialShowStudio?: boolean;
}

export const InputPlanBreakdownView: React.FC<InputPlanBreakdownViewProps> = ({
  currentUser,
  storePortfolios,
  onUpdateStore,
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
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Đồng bộ vai trò thao tác theo tài khoản đang đăng nhập
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === 'GROWTH_MEMBER' || currentUser.role === 'GROWTH_MANAGER') {
      setCurrentRole('GROWTH');
    } else if (currentUser.role === 'MEDIA_MEMBER' || currentUser.role === 'MEDIA_MANAGER') {
      setCurrentRole('MEDIA');
    } else if (['ADMIN', 'MANAGER'].includes(currentUser.role)) {
      setCurrentRole('LEAD');
    } else if (currentUser.role === 'BOOKING_MEMBER' || currentUser.role === 'LEADER') {
      setCurrentRole('BOOKING');
    }
  }, [currentUser]);

  // Active Channel Sub-Tab: Sơ đồ nhánh Mindmap + 4 khối nghiệp vụ + Ma trận tuần
  const [activeTab, setActiveTab] = useState<
    | 'MINDMAP'
    | 'AFFILIATE_PAID'
    | 'TAP_FREECAST'
    | 'SELF_CHANNEL'
    | 'MULTI_PLATFORM'
    | 'LIVESTREAM'
    | 'WEEKLY_MATRIX'
    | 'DISCUSSIONS'
    | 'ALL_SUMMARY'
    | 'EXCEL_PREVIEW'
  >('MINDMAP');

  // Ma trận phân rã 5 tuần thực tế (W41 -> W45) chia tách 4 khối cột nghiệp vụ độc lập
  const [weeklyMatrix, setWeeklyMatrix] = useState([
    {
      week: 'W41 [02.10 - 08.10]',
      affPaidQty: 10,
      affPaidBudget: 35000000,
      tapFreeQty: 30,
      selfChannelQty: 8,
      selfChannelBudget: 3500000,
      multiQty: 4,
      multiBudget: 2500000,
      pic: 'Khánh Vy',
      status: 'Đã lập',
      tiers: { kl1: 2, kl2: 3, kl3: 3, kl4: 1, kl5: 1, kl6: 0, kl7: 0 },
      tapChannels: { upAffiliate: 18, brand: 8, upbase: 4 },
      selfFormats: { voice: 3, text: 2, remix: 2, autoScript: 1, pov: 0 },
      multiPlatforms: { shopee: 2, facebook: 1, threads: 1, instagram: 0 }
    },
    {
      week: 'W42 [09.10 - 15.10]',
      affPaidQty: 12,
      affPaidBudget: 42000000,
      tapFreeQty: 35,
      selfChannelQty: 10,
      selfChannelBudget: 4200000,
      multiQty: 5,
      multiBudget: 3200000,
      pic: 'Khánh Vy',
      status: 'Đã lập',
      tiers: { kl1: 2, kl2: 4, kl3: 3, kl4: 2, kl5: 1, kl6: 0, kl7: 0 },
      tapChannels: { upAffiliate: 20, brand: 10, upbase: 5 },
      selfFormats: { voice: 4, text: 2, remix: 2, autoScript: 1, pov: 1 },
      multiPlatforms: { shopee: 2, facebook: 2, threads: 1, instagram: 0 }
    },
    {
      week: 'W43 [16.10 - 22.10]',
      affPaidQty: 10,
      affPaidBudget: 38000000,
      tapFreeQty: 25,
      selfChannelQty: 8,
      selfChannelBudget: 3500000,
      multiQty: 4,
      multiBudget: 2200000,
      pic: 'Khánh Vy',
      status: 'Đã lập',
      tiers: { kl1: 1, kl2: 3, kl3: 3, kl4: 2, kl5: 1, kl6: 0, kl7: 0 },
      tapChannels: { upAffiliate: 15, brand: 7, upbase: 3 },
      selfFormats: { voice: 3, text: 2, remix: 2, autoScript: 1, pov: 0 },
      multiPlatforms: { shopee: 2, facebook: 1, threads: 1, instagram: 0 }
    },
    {
      week: 'W44 [23.10 - 29.10]',
      affPaidQty: 8,
      affPaidBudget: 28000000,
      tapFreeQty: 20,
      selfChannelQty: 6,
      selfChannelBudget: 2800000,
      multiQty: 3,
      multiBudget: 1800000,
      pic: 'Khánh Vy',
      status: 'Đã lập',
      tiers: { kl1: 2, kl2: 2, kl3: 2, kl4: 1, kl5: 1, kl6: 0, kl7: 0 },
      tapChannels: { upAffiliate: 12, brand: 5, upbase: 3 },
      selfFormats: { voice: 2, text: 2, remix: 1, autoScript: 1, pov: 0 },
      multiPlatforms: { shopee: 1, facebook: 1, threads: 1, instagram: 0 }
    },
    {
      week: 'W45 [30.10 - 05.11]',
      affPaidQty: 2,
      affPaidBudget: 7000000,
      tapFreeQty: 10,
      selfChannelQty: 2,
      selfChannelBudget: 1000000,
      multiQty: 1,
      multiBudget: 500000,
      pic: 'Khánh Vy',
      status: 'Dự thảo',
      tiers: { kl1: 0, kl2: 1, kl3: 1, kl4: 0, kl5: 0, kl6: 0, kl7: 0 },
      tapChannels: { upAffiliate: 6, brand: 3, upbase: 1 },
      selfFormats: { voice: 1, text: 0, remix: 1, autoScript: 0, pov: 0 },
      multiPlatforms: { shopee: 1, facebook: 0, threads: 0, instagram: 0 }
    }
  ]);

  const [expandedWeekIndex, setExpandedWeekIndex] = useState<number | null>(null);

  const weeklyMatrixTotals = useMemo(() => {
    const affQty = weeklyMatrix.reduce((s, r) => s + (Number(r.affPaidQty) || 0), 0);
    const affBudget = weeklyMatrix.reduce((s, r) => s + (Number(r.affPaidBudget) || 0), 0);
    const tapQty = weeklyMatrix.reduce((s, r) => s + (Number(r.tapFreeQty) || 0), 0);
    const selfQty = weeklyMatrix.reduce((s, r) => s + (Number(r.selfChannelQty) || 0), 0);
    const selfBudget = weeklyMatrix.reduce((s, r) => s + (Number(r.selfChannelBudget) || 0), 0);
    const multiQty = weeklyMatrix.reduce((s, r) => s + (Number(r.multiQty) || 0), 0);
    const multiBudget = weeklyMatrix.reduce((s, r) => s + (Number(r.multiBudget) || 0), 0);

    const totalQty = affQty + tapQty + selfQty + multiQty;
    const totalBudget = affBudget + selfBudget + multiBudget;

    return {
      affQty,
      affBudget,
      tapQty,
      selfQty,
      selfBudget,
      multiQty,
      multiBudget,
      totalQty,
      totalBudget
    };
  }, [weeklyMatrix]);

  const handleUpdateWeeklyMatrixCell = (index: number, field: string, value: any) => {
    setWeeklyMatrix(prev => prev.map((row, idx) => {
      if (idx === index) {
        return {
          ...row,
          [field]: typeof value === 'number' ? Math.max(0, value) : value
        };
      }
      return row;
    }));
  };

  const handleUpdateWeeklyTier = (weekIdx: number, tierKey: string, val: number) => {
    setWeeklyMatrix(prev => prev.map((row, idx) => {
      if (idx === weekIdx) {
        const curTiers = row.tiers || { kl1: 0, kl2: 0, kl3: 0, kl4: 0, kl5: 0, kl6: 0, kl7: 0 };
        const updatedTiers = { ...curTiers, [tierKey]: Math.max(0, val) };
        const newAffQty = Object.values(updatedTiers).reduce((a, b) => a + b, 0);
        return {
          ...row,
          tiers: updatedTiers,
          affPaidQty: newAffQty
        };
      }
      return row;
    }));
  };

  const handleResetWeeklyMatrix = () => {
    setWeeklyMatrix([
      {
        week: 'W41 [02.10 - 08.10]',
        affPaidQty: 10,
        affPaidBudget: 35000000,
        tapFreeQty: 30,
        selfChannelQty: 8,
        selfChannelBudget: 3500000,
        multiQty: 4,
        multiBudget: 2500000,
        pic: 'Khánh Vy',
        status: 'Đã lập',
        tiers: { kl1: 2, kl2: 3, kl3: 3, kl4: 1, kl5: 1, kl6: 0, kl7: 0 },
        tapChannels: { upAffiliate: 18, brand: 8, upbase: 4 },
        selfFormats: { voice: 3, text: 2, remix: 2, autoScript: 1, pov: 0 },
        multiPlatforms: { shopee: 2, facebook: 1, threads: 1, instagram: 0 }
      },
      {
        week: 'W42 [09.10 - 15.10]',
        affPaidQty: 12,
        affPaidBudget: 42000000,
        tapFreeQty: 35,
        selfChannelQty: 10,
        selfChannelBudget: 4200000,
        multiQty: 5,
        multiBudget: 3200000,
        pic: 'Khánh Vy',
        status: 'Đã lập',
        tiers: { kl1: 2, kl2: 4, kl3: 3, kl4: 2, kl5: 1, kl6: 0, kl7: 0 },
        tapChannels: { upAffiliate: 20, brand: 10, upbase: 5 },
        selfFormats: { voice: 4, text: 2, remix: 2, autoScript: 1, pov: 1 },
        multiPlatforms: { shopee: 2, facebook: 2, threads: 1, instagram: 0 }
      },
      {
        week: 'W43 [16.10 - 22.10]',
        affPaidQty: 10,
        affPaidBudget: 38000000,
        tapFreeQty: 25,
        selfChannelQty: 8,
        selfChannelBudget: 3500000,
        multiQty: 4,
        multiBudget: 2200000,
        pic: 'Khánh Vy',
        status: 'Đã lập',
        tiers: { kl1: 1, kl2: 3, kl3: 3, kl4: 2, kl5: 1, kl6: 0, kl7: 0 },
        tapChannels: { upAffiliate: 15, brand: 7, upbase: 3 },
        selfFormats: { voice: 3, text: 2, remix: 2, autoScript: 1, pov: 0 },
        multiPlatforms: { shopee: 2, facebook: 1, threads: 1, instagram: 0 }
      },
      {
        week: 'W44 [23.10 - 29.10]',
        affPaidQty: 8,
        affPaidBudget: 28000000,
        tapFreeQty: 20,
        selfChannelQty: 6,
        selfChannelBudget: 2800000,
        multiQty: 3,
        multiBudget: 1800000,
        pic: 'Khánh Vy',
        status: 'Đã lập',
        tiers: { kl1: 2, kl2: 2, kl3: 2, kl4: 1, kl5: 1, kl6: 0, kl7: 0 },
        tapChannels: { upAffiliate: 12, brand: 5, upbase: 3 },
        selfFormats: { voice: 2, text: 2, remix: 1, autoScript: 1, pov: 0 },
        multiPlatforms: { shopee: 1, facebook: 1, threads: 1, instagram: 0 }
      },
      {
        week: 'W45 [30.10 - 05.11]',
        affPaidQty: 2,
        affPaidBudget: 7000000,
        tapFreeQty: 10,
        selfChannelQty: 2,
        selfChannelBudget: 1000000,
        multiQty: 1,
        multiBudget: 500000,
        pic: 'Khánh Vy',
        status: 'Dự thảo',
        tiers: { kl1: 0, kl2: 1, kl3: 1, kl4: 0, kl5: 0, kl6: 0, kl7: 0 },
        tapChannels: { upAffiliate: 6, brand: 3, upbase: 1 },
        selfFormats: { voice: 1, text: 0, remix: 1, autoScript: 0, pov: 0 },
        multiPlatforms: { shopee: 1, facebook: 0, threads: 0, instagram: 0 }
      }
    ]);
    if (onNotify) onNotify('Đã khôi phục ma trận phân rã 5 tuần về phân bổ chuẩn!');
  };

  const handleSaveWeeklyMatrix = () => {
    if (onNotify) onNotify(`Đã lưu thành công kế hoạch phân rã 5 tuần cho gian hàng ${planState.brandName}!`);
  };

  const handleSyncWeeklyMatrixToStore = () => {
    if (onApplyPlanToWeeklyStore) {
      const w1 = weeklyMatrix[0];
      const weeklyPlan: WeeklyStorePlan411 = {
        id: `plan-411-${planState.brandName}-${planState.month}-${w1.week.slice(0, 3)}`,
        month: planState.month,
        week: w1.week,
        pic: w1.pic,
        storeName: planState.brandName,
        tiktokAffiliateQty: w1.affPaidQty,
        tapAffiliateQty: w1.tapFreeQty,
        kocTiersCount: w1.tiers || { kl1: 2, kl2: 3, kl3: 3, kl4: 1, kl5: 1, kl6: 0, kl7: 0 },
        totalAffiliateBudget: w1.affPaidBudget,
        tierBudgets: {
          kl1: 500000,
          kl2: 3000000,
          kl3: 7500000,
          kl4: 4500000,
          kl5: 8500000,
          kl6: 0,
          kl7: 0
        },
        actualBookedQty: 0,
        actualSpentBudget: 0,
        targetGmv: planState.targetGmv ? Math.round(planState.targetGmv / 5) : 0,
        notes: `Kế hoạch phân rã tuần từ Studio: 4 Trụ cột (Affiliate ${w1.affPaidQty} clip, TAP ${w1.tapFreeQty} clip, Kênh tự xây ${w1.selfChannelQty} clip, Đa sàn ${w1.multiQty} clip)`
      };
      onApplyPlanToWeeklyStore(weeklyPlan);
    }
    if (onNotify) onNotify(`Đã đồng bộ phân rã tuần vào lịch thực thi gian hàng ${planState.brandName}!`);
  };

  // View Mode: 'CARDS' (Intuitive & Visual) or 'TABLE' (Clean & Fast)
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('TABLE');
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [isApprovalDetailOpen, setIsApprovalDetailOpen] = useState(false);
  const [isVersionHistoryModalOpen, setIsVersionHistoryModalOpen] = useState(false);

  const notify = (msg: string) => {
    if (onNotify) onNotify(msg);
  };

  // Chuyển đổi phiên bản kế hoạch ngay trong tháng (v1.0 <-> v1.1 <-> v1.2...)
  const handleSwitchVersionInStudio = (snap: PlanVersionSnapshot) => {
    if (snap.versionCode === (planState.currentVersionCode || 'v1.0')) return;
    const allSnapshots = getPlanVersionSnapshots(planState);
    const updatedSnapshots = allSnapshots.map(s =>
      s.versionCode === (planState.currentVersionCode || 'v1.0')
        ? {
            ...s,
            totalTargetBudget: planState.totalTargetBudget,
            budgetAdsTotal: planState.budgetAdsTotal || 0,
            totalTargetContents: planState.totalTargetContents,
            targetGmv: planState.targetGmv,
            items: JSON.parse(JSON.stringify(planState.items || [])),
          }
        : s
    );

    const budgetRatio =
      planState.totalTargetBudget > 0 ? snap.totalTargetBudget / planState.totalTargetBudget : 1;
    const restoredItems =
      snap.items && snap.items.length > 0
        ? JSON.parse(JSON.stringify(snap.items))
        : (planState.items || []).map(item => {
            const nextQty = Math.max(0, Math.round(item.qty * budgetRatio));
            const nextBudget = Math.round(item.totalBudget * budgetRatio);
            return {
              ...item,
              qty: nextQty,
              totalBudget: nextBudget,
              targetGmv: Math.round(nextBudget * (item.expectedRoiMultiplier || 1)),
            };
          });

    const nextPlanState: InputPlanBreakdownState = {
      ...planState,
      currentVersionCode: snap.versionCode,
      totalTargetBudget: snap.totalTargetBudget,
      budgetAdsTotal: snap.budgetAdsTotal ?? planState.budgetAdsTotal,
      budgetAffiliate: snap.budgetAffiliate ?? planState.budgetAffiliate,
      budgetSelfChannel: snap.budgetSelfChannel ?? planState.budgetSelfChannel,
      totalTargetContents: snap.totalTargetContents,
      targetGmv: snap.targetGmv,
      notes: snap.changeReason || planState.notes,
      items: restoredItems,
      versionSnapshots: updatedSnapshots,
    };

    setPlanState(nextPlanState);
    setMonthlyPlans(prev => prev.map(p => (p.id === nextPlanState.id ? nextPlanState : p)));
    notify(`Đã chuyển sang xem & làm việc trên phiên bản ${snap.versionCode} (${planState.month}).`);
  };

  // ĐỒNG BỘ DATABASE: danh sách hiệu lực = danh sách tháng + bản đang mở trong Studio
  const effectivePlans = useMemo(
    () => (isShowingStudio ? monthlyPlans.map(p => (p.id === planState.id ? planState : p)) : monthlyPlans),
    [isShowingStudio, monthlyPlans, planState]
  );
  const planSync = useMonthlyPlanSync({
    effectivePlans,
    onNotify,
    onLoaded: (plans) => {
      const enriched = plans.map((p, idx) =>
        p.versionSnapshots && p.versionSnapshots.length > 1 ? p : enrichPlanWithVersions(p, idx)
      );
      setMonthlyPlans(enriched);
      setPlanState(prev => enriched.find(p => p.id === prev.id) || enriched[0] || prev);
    },
    onReplacePlan: (plan) => {
      setMonthlyPlans(prev => prev.map(p => (p.id === plan.id ? plan : p)));
      setPlanState(prev => (prev.id === plan.id ? plan : prev));
    }
  });

  // Trao đổi realtime của kế hoạch đang mở (tin lưu qua API riêng, không phụ thuộc revision)
  const planChat = usePlanChat({
    planId: isShowingStudio ? planState.id : null,
    initialMessages: planState.discussions ?? [],
    currentUser,
    enabled: isChatOpen
  });

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

  const LEADER_OPTIONS = [
    'Nguyễn Thị Ngọc Tâm (Trưởng nhóm Booking)',
    'Không có leader (Duyệt thẳng Trưởng phòng)'
  ];

  // State Leader Sơ Duyệt Nội Bộ
  const [isLeaderApprovalModalOpen, setIsLeaderApprovalModalOpen] = useState(false);
  const [leaderApprovalDecision, setLeaderApprovalDecision] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [leaderReviewNote, setLeaderReviewNote] = useState('');

  const handleLeaderApprovalAction = () => {
    const actor = currentUser?.name || planState.bookingLeader || (planState.hasBookingLeader ? 'Nguyễn Thị Ngọc Tâm' : 'Đặng Thị Yến Nhi');
    const now = new Date().toISOString();
    if (leaderApprovalDecision === 'APPROVE') {
      const note = leaderReviewNote.trim() || 'Đã kiểm tra cơ cấu định mức thù lao KL1-KL7, tỷ trọng kênh và tính khả thi. Đồng ý sơ duyệt nội bộ để chuyển sang Growth thẩm định.';
      setPlanState(prev => ({
        ...prev,
        leaderApprovalStatus: 'ĐÃ_SƠ_DUYỆT',
        leaderApprovedBy: actor,
        leaderApprovedAt: now,
        leaderNotes: note
      }));
      notify(`Trưởng nhóm (${actor}) đã SƠ DUYỆT NỘI BỘ kế hoạch "${planState.title}" thành công!`);
    } else {
      const note = leaderReviewNote.trim() || 'Cơ cấu chi phí và tỷ trọng video chưa tối ưu. Yêu cầu chuyên viên điều chỉnh lại trước khi trình duyệt.';
      setPlanState(prev => ({
        ...prev,
        leaderApprovalStatus: 'YÊU_CẦU_SỬA',
        leaderApprovedBy: actor,
        leaderApprovedAt: now,
        leaderNotes: note
      }));
      notify(`Trưởng nhóm (${actor}) đã yêu cầu chuyên viên ${planState.pic} hiệu chỉnh lại kế hoạch!`);
    }
    setIsLeaderApprovalModalOpen(false);
    setLeaderReviewNote('');
  };

  // State Modal Phân Bổ Kế Hoạch Cho Team của bạn PIC
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [allocationFilterChannel, setAllocationFilterChannel] = useState<'ALL' | InputPlanChannelType>('ALL');

  // State Gửi Duyệt Quản Lý sau khi trao đổi với Growth
  const [isSubmitToManagerModalOpen, setIsSubmitToManagerModalOpen] = useState<boolean>(false);
  const [growthAlignedConfirm, setGrowthAlignedConfirm] = useState<boolean>(true);
  const [submissionNote, setSubmissionNote] = useState<string>('');

  const handleSubmitPlanToManager = () => {
    const actor = currentUser?.name || planState.pic || 'Nhân viên Booking';
    const now = new Date().toISOString();
    const finalNote = submissionNote.trim() || `Đã trao đổi thống nhất với Growth (${planState.growthPic || 'Growth Lead'}) về các chỉ số GMV và ngân sách B2C. Kính gửi Quản lý phê duyệt.`;
    const log = `Nhân viên (${actor}) đã GỬI DUYỆT QUẢN LÝ sau khi thống nhất chỉ số với Growth team: "${finalNote}"`;

    handleStatusChangeForPlan(planState.id, 'PENDING_APPROVAL', log, finalNote);

    setPlanState(prev => ({
      ...prev,
      status: 'PENDING_APPROVAL',
      growthAlignmentStatus: 'ĐÃ_THỐNG_NHẤT',
      growthAlignmentNotes: finalNote,
      submittedAt: now,
      submittedBy: actor
    }));

    setIsSubmitToManagerModalOpen(false);
    setSubmissionNote('');
    notify(`Đã gửi duyệt Kế hoạch "${planState.title}" lên Quản lý thành công!`);
  };

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

  // Budget Headroom & Status: Tổng chi phí = Phân rã KOC & kênh + Gói Ads tổng do Growth giao cho Media
  const totalAdsBudget = planState.budgetAdsTotal || 0;
  const totalCombinedBudget = totalAllocatedBudget + totalAdsBudget;
  const budgetHeadroom = planState.totalTargetBudget - totalCombinedBudget;
  const isOverBudget = budgetHeadroom < 0;
  const budgetUsagePct = planState.totalTargetBudget > 0
    ? (totalCombinedBudget / planState.totalTargetBudget) * 100
    : 0;

  // Content Headroom & Status
  const contentHeadroom = planState.totalTargetContents - totalAllocatedContents;
  const contentFillPct = planState.totalTargetContents > 0
    ? (totalAllocatedContents / planState.totalTargetContents) * 100
    : 0;

  // Channel Subtotals for Visual Breakdown: Tách bạch rõ 4 khối nghiệp vụ
  const channelTotals = useMemo(() => {
    const affPaid = planState.items.filter(it => it.channel === 'TIKTOK' && !it.tierCode.includes('TAP'));
    const tapFree = planState.items.filter(it => it.tierCode.includes('TAP') || it.id === 'row-tt-tap');
    const sc = planState.items.filter(it => it.channel === 'SELF_CHANNEL');
    const mp = planState.items.filter(it => ['SHOPEE', 'FACEBOOK', 'INSTAGRAM', 'THREADS'].includes(it.channel));
    const lv = planState.items.filter(it => it.channel === 'LIVESTREAM');

    const sumBudget = (list: typeof affPaid) => list.reduce((s, i) => s + i.totalBudget, 0);
    const sumQty = (list: typeof affPaid) => list.reduce((s, i) => s + i.qty, 0);

    return {
      affiliatePaid: { budget: sumBudget(affPaid), qty: sumQty(affPaid), pct: totalAllocatedBudget > 0 ? (sumBudget(affPaid) / totalAllocatedBudget) * 100 : 0 },
      tapFreecast: { budget: 0, qty: sumQty(tapFree), pct: 0 },
      selfChannel: { budget: sumBudget(sc), qty: sumQty(sc), pct: totalAllocatedBudget > 0 ? (sumBudget(sc) / totalAllocatedBudget) * 100 : 0 },
      multiPlatform: { budget: sumBudget(mp), qty: sumQty(mp), pct: totalAllocatedBudget > 0 ? (sumBudget(mp) / totalAllocatedBudget) * 100 : 0 },
      livestream: { budget: sumBudget(lv), qty: sumQty(lv), pct: totalAllocatedBudget > 0 ? (sumBudget(lv) / totalAllocatedBudget) * 100 : 0 },
      tiktok: { budget: sumBudget(affPaid) + sumBudget(tapFree), qty: sumQty(affPaid) + sumQty(tapFree), pct: 0 }
    };
  }, [planState.items, totalAllocatedBudget]);

  // CIR & ROI Projected
  const projectedCir = totalProjectedGmv > 0 ? (totalAllocatedBudget / totalProjectedGmv) * 100 : 0;
  const projectedRoi = totalAllocatedBudget > 0 ? totalProjectedGmv / totalAllocatedBudget : 0;
  const blendedCostPerVideo = totalAllocatedContents > 0 ? Math.round(totalAllocatedBudget / totalAllocatedContents) : 0;

  // Tỷ trọng ngân sách dành cho High-Tier KOC (KL4 - KL7) trong Affiliate (giới hạn 45%)
  const highTierBudget = useMemo(() => {
    return planState.items
      .filter(it => ['KL4', 'KL5', 'KL6', 'KL7'].some(k => (it.tierCode || '').toUpperCase().includes(k)))
      .reduce((sum, it) => sum + it.totalBudget, 0);
  }, [planState.items]);
  const highTierSharePct = totalAllocatedBudget > 0 ? (highTierBudget / totalAllocatedBudget) * 100 : 0;
  const highTierOverLimit = highTierSharePct > 45;

  // Phiên bản đã chốt/khóa
  const isPlanLocked = Boolean(planState.isVersionLocked || planState.status === 'LOCKED');

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

  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);
  const [draggingPayload, setDraggingPayload] = useState<{ type: 'FORMAT' | 'STAFF'; value: string } | null>(null);

  const handleDropOnRow = (rowId: string) => {
    setDragOverRowId(null);
    if (!draggingPayload) return;
    if (draggingPayload.type === 'FORMAT') {
      handleUpdateItemFormat(rowId, draggingPayload.value);
      notify(`Đã gán định dạng "${draggingPayload.value}" cho dòng được thả.`);
    } else if (draggingPayload.type === 'STAFF') {
      handleUpdateItemAssignee(rowId, draggingPayload.value);
      notify(`Đã phân công "${draggingPayload.value}" phụ trách dòng được thả.`);
    }
    setDraggingPayload(null);
  };

  const handleApplyToVisibleRows = (type: 'FORMAT' | 'STAFF', value: string) => {
    const visibleIds = new Set(visibleItems.map(it => it.id));
    setPlanState(prev => ({
      ...prev,
      items: prev.items.map(it => {
        if (!visibleIds.has(it.id)) return it;
        return type === 'FORMAT'
          ? { ...it, contentFormat: value }
          : { ...it, assignedStaff: value };
      })
    }));
    notify(type === 'FORMAT'
      ? `Đã áp dụng định dạng "${value}" cho toàn bộ ${visibleItems.length} dòng đang hiển thị.`
      : `Đã gán nhân sự "${value}" cho toàn bộ ${visibleItems.length} dòng đang hiển thị.`);
  };

  // Bù phần video còn thiếu vào FOC (Mẫu 0đ) để khớp tổng chỉ tiêu nội dung mà không đội ngân sách
  const handleFillFocRemaining = () => {
    if (contentHeadroom <= 0) {
      notify(`Tổng số lượng video đã đạt ${totalAllocatedContents}/${planState.totalTargetContents} video.`);
      return;
    }
    const focItem = planState.items.find(it => it.tierCode.includes('TAP') || it.id === 'row-tt-tap');
    if (focItem) {
      handleUpdateItemQty(focItem.id, focItem.qty + contentHeadroom);
      notify(`Đã bù ${contentHeadroom} video còn thiếu vào đầu việc FOC (Mẫu 0đ).`);
    }
  };

  // Tự động quy đổi ngân sách còn dư vào nhóm KOC KL1 - KL3 + bù phần video thiếu vào FOC 0đ
  const handleAutoFitRemainingBudget = () => {
    setPlanState(prev => {
      const currentSpent = prev.items.reduce((s, it) => s + it.totalBudget, 0) + (prev.budgetAdsTotal || 0);
      let remBudget = Math.max(0, prev.totalTargetBudget - currentSpent);
      const nextItems = prev.items.map(it => ({ ...it }));

      const targetTiers = ['KL2', 'KL1', 'KL3'];
      targetTiers.forEach((code, idx) => {
        const row = nextItems.find(it => it.tierCode === code && it.unitCost > 0);
        if (row && remBudget >= row.unitCost) {
          const share = idx === 0 ? 0.5 : idx === 1 ? 0.6 : 1;
          const addQty = Math.floor((remBudget * share) / row.unitCost);
          if (addQty > 0) {
            row.qty += addQty;
            row.totalBudget = row.qty * row.unitCost;
            row.targetGmv = row.totalBudget * row.expectedRoiMultiplier;
            remBudget -= addQty * row.unitCost;
          }
        }
      });

      const currentQty = nextItems.filter(it => it.channel !== 'LIVESTREAM').reduce((s, it) => s + it.qty, 0);
      const remQty = Math.max(0, prev.totalTargetContents - currentQty);
      if (remQty > 0) {
        const focRow = nextItems.find(it => it.tierCode.includes('TAP') || it.id === 'row-tt-tap');
        if (focRow) {
          focRow.qty += remQty;
        }
      }

      return { ...prev, items: nextItems };
    });
    notify(`Đã tự động khớp phần ngân sách dư vào KL1–KL3 và bù đủ chỉ tiêu video vào FOC (0đ).`);
  };

  // Tự động rải tổng 4 đầu việc B2C xuống 5 tuần (W1 -> W5) theo nhịp chiến dịch
  const handleDistributeWeeklyByPattern = (pattern: 'EVEN' | 'MEGA_EARLY' | 'PAYDAY_PEAK') => {
    const weights =
      pattern === 'MEGA_EARLY'
        ? [0.30, 0.25, 0.18, 0.17, 0.10]
        : pattern === 'PAYDAY_PEAK'
        ? [0.15, 0.28, 0.17, 0.28, 0.12]
        : [0.20, 0.20, 0.20, 0.20, 0.20];

    const splitByWeights = (total: number) => {
      let rem = total;
      return weights.map((w, i) => {
        if (i === weights.length - 1) return Math.max(0, rem);
        const val = Math.round(total * w);
        rem -= val;
        return Math.max(0, val);
      });
    };

    const affQtyArr = splitByWeights(channelTotals.affiliatePaid.qty);
    const affBudArr = splitByWeights(channelTotals.affiliatePaid.budget);
    const focQtyArr = splitByWeights(channelTotals.tapFreecast.qty);
    const selfQtyArr = splitByWeights(channelTotals.selfChannel.qty);
    const selfBudArr = splitByWeights(channelTotals.selfChannel.budget);
    const multiQtyArr = splitByWeights(channelTotals.multiPlatform.qty);
    const multiBudArr = splitByWeights(channelTotals.multiPlatform.budget);

    const getTierTotal = (code: string) => planState.items.find(it => it.tierCode === code)?.qty || 0;
    const kl1Arr = splitByWeights(getTierTotal('KL1'));
    const kl2Arr = splitByWeights(getTierTotal('KL2'));
    const kl3Arr = splitByWeights(getTierTotal('KL3'));
    const kl4Arr = splitByWeights(getTierTotal('KL4'));
    const kl5Arr = splitByWeights(getTierTotal('KL5'));
    const kl6Arr = splitByWeights(getTierTotal('KL6'));
    const kl7Arr = splitByWeights(getTierTotal('KL7'));

    setWeeklyMatrix(prev =>
      prev.map((row, idx) => ({
        ...row,
        pic: planState.pic || row.pic,
        affPaidQty: affQtyArr[idx],
        affPaidBudget: affBudArr[idx],
        tapFreeQty: focQtyArr[idx],
        selfChannelQty: selfQtyArr[idx],
        selfChannelBudget: selfBudArr[idx],
        multiQty: multiQtyArr[idx],
        multiBudget: multiBudArr[idx],
        tiers: {
          kl1: kl1Arr[idx],
          kl2: kl2Arr[idx],
          kl3: kl3Arr[idx],
          kl4: kl4Arr[idx],
          kl5: kl5Arr[idx],
          kl6: kl6Arr[idx],
          kl7: kl7Arr[idx],
        }
      }))
    );

    const patternLabel =
      pattern === 'MEGA_EARLY'
        ? 'Nhịp Mega Sale đầu tháng (dồn W1–W2)'
        : pattern === 'PAYDAY_PEAK'
        ? 'Nhịp Mid-month & Payday (đỉnh W2 & W4)'
        : 'Rải đều 5 tuần (20% mỗi tuần)';
    notify(`Đã tự động rải 4 đầu việc B2C xuống 5 tuần theo ${patternLabel}.`);
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
      BALANCED: 'Cơ cấu chuẩn B2C (Phủ đều KL1 → KL5)',
      GMV_MAX: 'Đẩy số Mega / Chốt đơn (Tập trung KL1–KL3 & FOC)',
      BRAND_PUSH: 'Đẩy nhận diện Brand (Tập trung KL4–KL6 & Video kênh Brand)',
      COST_SAVER: 'Tối ưu chi phí (Tối đa KL1–KL2 & FOC 0đ)'
    };
    notify(`Đã áp dụng gợi ý phân bổ: ${presetNames[preset]}!`);
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

  // Visible items based on activeTab: Chia tách rõ 4 đầu việc B2C (Livestream do Growth phụ trách)
  const visibleItems = useMemo(() => {
    if (activeTab === 'AFFILIATE_PAID') return planState.items.filter(it => it.channel === 'TIKTOK' && !it.tierCode.includes('TAP'));
    if (activeTab === 'TAP_FREECAST') return planState.items.filter(it => it.tierCode.includes('TAP') || it.id === 'row-tt-tap');
    if (activeTab === 'SELF_CHANNEL') return planState.items.filter(it => it.channel === 'SELF_CHANNEL');
    if (activeTab === 'MULTI_PLATFORM') return planState.items.filter(it => ['SHOPEE', 'FACEBOOK', 'INSTAGRAM', 'THREADS'].includes(it.channel));
    return planState.items.filter(it => it.channel !== 'LIVESTREAM');
  }, [activeTab, planState.items]);

  // Helper for Tier Badge Color
  const getTierBadgeStyle = (tierCode: string) => {
    switch (tierCode) {
      case 'KL1': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'KL2': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'KL3': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'KL4': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'KL5': return 'bg-slate-50 text-slate-700 border-slate-200';
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

    let authorName = currentUser?.name || targetPlan.pic;
    let authorTitle = 'Booking Specialist PIC';
    if (currentRole === 'GROWTH') {
      authorName = (currentUser?.role === 'GROWTH_MEMBER' ? currentUser.name : null) || targetPlan.growthPic || 'Trần Thị Ánh';
      authorTitle = 'Growth PIC / Chiến lược & PnL';
    } else if (currentRole === 'MEDIA') {
      authorName = (currentUser?.role === 'MEDIA_MEMBER' ? currentUser.name : null) || targetPlan.mediaPic || 'Phan Thành Đạt';
      authorTitle = 'Media PIC / Quảng cáo & Ads';
    } else if (currentRole === 'LEAD') {
      authorName = (['ADMIN', 'MANAGER'].includes(currentUser?.role || '') ? currentUser?.name : null) || targetPlan.approvedBy || 'Vân Ngọc';
      authorTitle = 'Trưởng Phòng B2C';
    } else if (currentRole === 'BOOKING') {
      authorName = (currentUser?.role === 'BOOKING_MEMBER' ? currentUser.name : null) || targetPlan.pic || 'Khánh Vy';
      authorTitle = 'Booking Specialist PIC';
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
      <div className="space-y-3">
      {/* Trạng thái lưu database của danh sách kế hoạch */}
      <div className="flex items-center justify-end gap-2 text-2xs text-slate-500">
        {planSync.status === 'offline' && (
          <span className="mr-auto text-rose-600 font-medium">
            Không kết nối được database. Đang hiển thị dữ liệu mẫu, mọi thay đổi sẽ mất khi tải lại trang.
          </span>
        )}
        <PlanSyncBadge
          status={planSync.status}
          lastSavedAt={planSync.lastSavedAt}
          errorMessage={planSync.errorMessage}
          onRetry={() => void planSync.saveNow()}
        />
      </div>
      <MonthlyPlanHub
        plans={monthlyPlans}
        storePortfolios={storePortfolios}
        onUpdateStore={onUpdateStore}
        currentUser={currentUser}
        onNotify={notify}
        onSelectPlan={(selected) => {
          setPlanState(selected);
          setIsApprovalDetailOpen(selected.status === 'PENDING_APPROVAL');
          setIsShowingStudio(true);
        }}
        onCreatePlan={(newPlan) => {
          setMonthlyPlans(prev => [newPlan, ...prev]);
          setPlanState(newPlan);
          setIsShowingStudio(true);
        }}
        onClonePlan={(sourcePlan, targetMonth) => {
          const now = new Date().toISOString();
          const cloned: InputPlanBreakdownState = {
            ...sourcePlan,
            id: `PLAN-${targetMonth.replace('/', '-')}-${Date.now().toString(36).toUpperCase()}`,
            title: `Kế Hoạch B2C ${targetMonth} - ${sourcePlan.brandName} (Nhân Bản)`,
            month: targetMonth,
            status: 'DRAFT',
            statusLabel: 'Bản Nháp (Đang Lập)',
            spentBudget: 0,
            deliveredContents: 0,
            actualGmv: 0,
            // Kế hoạch nhân bản là bản nháp mới: không kế thừa phiên bản chốt, ký duyệt và sổ trao đổi của kế hoạch gốc
            currentVersionCode: 'v1.0',
            isVersionLocked: false,
            versionSnapshots: [],
            protocols: [],
            multiPartySignOff: undefined,
            discussions: [],
            approvalSteps: [],
            submittedAt: undefined,
            submittedBy: undefined,
            preApprovedAt: undefined,
            preApprovedBy: undefined,
            approvedAt: undefined,
            approvedBy: undefined,
            leaderApprovalStatus: 'CHƯA_DUYỆT',
            leaderApprovedBy: undefined,
            leaderApprovedAt: undefined,
            createdAt: now,
            updatedAt: now
          };
          setMonthlyPlans(prev => [cloned, ...prev]);
        }}
        onUpdatePlanStatus={(planId, newStatus, log, note) => {
          handleStatusChangeForPlan(planId, newStatus, log || `Cập nhật trạng thái kế hoạch sang ${newStatus}`, note);
        }}
        onUpdatePlan={(planId, updated) => {
          setMonthlyPlans(prev => prev.map(p => p.id === planId ? { ...p, ...updated } : p));
          if (planState.id === planId) {
            setPlanState(prev => ({ ...prev, ...updated }));
          }
        }}
        onSendMessage={(planId, msg) => {
          handleSendMessageToPlan(planId, msg);
        }}
      />
      </div>
    );
  }

  // MÀN HÌNH 2: PHÂN RÃ KẾ HOẠCH CHI TIẾT
  const openSubmitToManager = () => {
    setSubmissionNote(`Em đã phân rã xong 4 kênh theo đúng chỉ tiêu GMV (${(planState.targetGmv / 1000000).toLocaleString('vi-VN')} Tr) và ngân sách trần (${(planState.totalTargetBudget / 1000000).toLocaleString('vi-VN')} Tr) đã thống nhất với Growth Lead. Kính gửi Quản lý phê duyệt giải ngân.`);
    setGrowthAlignedConfirm(true);
    setIsSubmitToManagerModalOpen(true);
  };
  const leaderStatus = planState.leaderApprovalStatus;
  const growthStatus = planState.growthAlignmentStatus || 'CHƯA_TRAO_ĐỔI';
  const planStatus = planState.status || 'DRAFT';
  const userRole = currentUser?.role || '';
  const canLeaderReview = ['ADMIN', 'MANAGER', 'LEADER'].includes(userRole);
  const isLeadUser = ['ADMIN', 'MANAGER'].includes(userRole) || currentRole === 'LEAD';
  const headerSignOff = deriveSignOff(planState);
  const isApprovedStatus = ['APPROVED', 'LEAD_APPROVED', 'BRAND_APPROVED', 'IN_EXECUTION', 'COMPLETED'].includes(planStatus);
  const hasLeader = Boolean(planState.hasBookingLeader !== undefined ? planState.hasBookingLeader : planState.bookingLeader);
  const progressSteps = [
    { key: 'growth', label: 'Growth giao số', done: headerSignOff.growth.confirmed, warn: false },
    ...(hasLeader ? [{ key: 'leader', label: 'Leader sơ duyệt', done: leaderStatus === 'ĐÃ_SƠ_DUYỆT', warn: leaderStatus === 'YÊU_CẦU_SỬA' }] : []),
    { key: 'booking', label: 'B2C phân rã', done: headerSignOff.booking.confirmed, warn: planStatus === 'REVISION_REQUESTED' },
    { key: 'media', label: 'Media nhận Ads', done: headerSignOff.media.confirmed, warn: false },
    { key: 'lead', label: 'Trưởng phòng duyệt', done: headerSignOff.leadB2c.confirmed || isPlanLocked, warn: false }
  ];
  const studioVersionSnapshots = getPlanVersionSnapshots(planState);
  const activeVersionCode = planState.currentVersionCode || 'v1.0';
  const baselineSnapshot = studioVersionSnapshots[0];
  const activeSnapshot = studioVersionSnapshots.find(s => s.versionCode === activeVersionCode) || studioVersionSnapshots[studioVersionSnapshots.length - 1];
  const deltaBudgetVsBaseline = baselineSnapshot ? (planState.totalTargetBudget || 0) - (baselineSnapshot.totalTargetBudget || 0) : 0;
  const deltaQtyVsBaseline = baselineSnapshot ? (planState.totalTargetContents || 0) - (baselineSnapshot.totalTargetContents || 0) : 0;

  const openApprovalDetail = () => {
    setIsApprovalDetailOpen(true);
    setTimeout(() => document.getElementById('plan-approval-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200 max-w-[1600px] mx-auto pb-12">
      {/* ========================================================================= */}
      {/* TIÊU ĐỀ KẾ HOẠCH: ĐIỀU HƯỚNG + THÔNG TIN + TIẾN ĐỘ + HÀNH ĐỘNG CHÍNH       */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs">
        {/* Hàng 1: Quay lại + Tên kế hoạch | Lưu + Trao đổi + Hành động + Nút chính */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => {
                // Ghi bản đang mở vào danh sách rồi lưu ngay xuống database
                setMonthlyPlans(prev => prev.map(p => p.id === planState.id ? planState : p));
                setIsShowingStudio(false);
                if (planSync.isPersistent) void planSync.saveNow();
              }}
              className="w-9 h-9 shrink-0 inline-flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition"
              title="Quay lại danh sách kế hoạch tháng"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-2xs text-slate-500">
                <span>Kế hoạch tháng</span>
                <span>/</span>
                {/* Chuyển nhanh sang kế hoạch khác */}
                <select
                  value={planState.id}
                  onChange={(e) => {
                    const found = monthlyPlans.find(p => p.id === e.target.value);
                    if (found) {
                      setMonthlyPlans(prev => prev.map(p => p.id === planState.id ? planState : p));
                      setPlanState(found);
                    }
                  }}
                  className="max-w-[240px] bg-transparent font-semibold text-slate-700 hover:text-blue-700 focus:outline-none cursor-pointer truncate"
                  title="Chuyển sang kế hoạch khác"
                >
                  {monthlyPlans.map(p => (
                    <option key={p.id} value={p.id}>
                      [{p.month}] {p.brandName} ({p.currentVersionCode || 'v1.0'})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-base font-semibold text-slate-900 truncate" title={planState.title}>
                  {planState.title}
                </h2>
                <button
                  type="button"
                  onClick={() => setIsVersionHistoryModalOpen(true)}
                  className={`shrink-0 inline-flex items-center gap-1 text-2xs px-2.5 py-0.5 rounded-full font-semibold border transition cursor-pointer ${
                    isPlanLocked
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                  }`}
                  title="Bấm để mở quản lý & so sánh các phiên bản trong tháng"
                >
                  <Layers className="w-3 h-3" />
                  <span>{activeVersionCode} • {studioVersionSnapshots.length} phiên bản • {isPlanLocked ? 'Đã chốt' : 'Bản nháp'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <PlanSyncBadge
              status={planSync.status}
              lastSavedAt={planSync.lastSavedAt}
              errorMessage={planSync.errorMessage}
              onRetry={() => void planSync.saveNow()}
            />

            <button
              onClick={async () => {
                setMonthlyPlans(prev => prev.map(p => p.id === planState.id ? planState : p));
                if (!planSync.isPersistent) {
                  notify('Chưa kết nối database, kế hoạch chưa được lưu.');
                  return;
                }
                const ok = await planSync.saveNow();
                notify(ok ? `Đã lưu kế hoạch "${planState.title}".` : 'Lưu kế hoạch không thành công, vui lòng thử lại.');
              }}
              disabled={planSync.status === 'saving'}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs transition disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5" />
              Lưu
            </button>

            <button
              type="button"
              onClick={() => setIsVersionHistoryModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold text-xs transition cursor-pointer"
              title="Quản lý, so sánh và tạo phiên bản kế hoạch mới trong tháng"
            >
              <Layers className="w-3.5 h-3.5" />
              Phiên bản ({studioVersionSnapshots.length})
            </button>

            <PlanChatButton unreadCount={planChat.unreadCount} onClick={() => setIsChatOpen(true)} />

            {/* Menu hành động phụ */}
            <div className="relative">
              <button
                onClick={() => setIsActionMenuOpen(prev => !prev)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs transition"
                aria-haspopup="menu"
                aria-expanded={isActionMenuOpen}
              >
                Thao tác
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isActionMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isActionMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsActionMenuOpen(false)} />
                  <div role="menu" className="absolute right-0 mt-1.5 w-64 z-40 bg-white border border-slate-200 rounded-xl shadow-lg py-1 text-xs">
                    {[
                      {
                        label: 'Quản lý & Tạo phiên bản tháng',
                        icon: <Layers className="w-3.5 h-3.5" />,
                        onClick: () => setIsVersionHistoryModalOpen(true),
                      },
                      {
                        label: 'Phân bổ cho team',
                        icon: <Users className="w-3.5 h-3.5" />,
                        onClick: () => setIsAllocationModalOpen(true),
                        disabled: isPlanLocked,
                        hint: isPlanLocked ? 'Phiên bản đã chốt' : undefined
                      },
                      {
                        label: 'Đối chiếu 4.1.1',
                        icon: <FileSpreadsheet className="w-3.5 h-3.5" />,
                        onClick: () => setActiveTab('EXCEL_PREVIEW')
                      },
                      {
                        label: 'Xuất file Excel 4.1.1',
                        icon: <Download className="w-3.5 h-3.5" />,
                        onClick: () => void handleExportExcel()
                      },
                      {
                        label: 'Tạo slot booking',
                        icon: <Send className="w-3.5 h-3.5" />,
                        onClick: handleGenerateBookingSlots,
                        disabled: !isPlanLocked,
                        hint: !isPlanLocked ? 'Chỉ mở sau khi kế hoạch đã chốt' : undefined
                      }
                    ].map(item => (
                      <button
                        key={item.label}
                        role="menuitem"
                        disabled={item.disabled}
                        onClick={() => {
                          setIsActionMenuOpen(false);
                          item.onClick();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-slate-700 hover:bg-slate-50 disabled:text-slate-400 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                      >
                        <span className="text-slate-500">{item.icon}</span>
                        <span className="flex-1">{item.label}</span>
                        {item.hint && <span className="text-2xs text-slate-400">{item.hint}</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* NÚT CHÍNH: thay đổi theo vai trò & trạng thái */}
            {isPlanLocked ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                <Lock className="w-3.5 h-3.5" />
                Đã chốt {planState.currentVersionCode || 'v1.0'}
              </span>
            ) : planStatus === 'PENDING_APPROVAL' ? (
              isLeadUser ? (
                <button
                  onClick={openApprovalDetail}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Xem & duyệt
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  Chờ trưởng phòng duyệt
                </span>
              )
            ) : isApprovedStatus ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                Đã duyệt
              </span>
            ) : (
              <button
                onClick={openSubmitToManager}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer"
                title="Gửi duyệt kế hoạch lên trưởng phòng sau khi đã thống nhất với Growth"
              >
                <SendHorizonal className="w-3.5 h-3.5" />
                Gửi duyệt
              </button>
            )}
          </div>
        </div>

        {/* Hàng 2: Kỳ & phụ trách */}
        <div className="flex items-center gap-x-5 gap-y-1.5 flex-wrap px-5 py-2 border-t border-slate-100 text-xs text-slate-500">
          <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 font-semibold text-slate-700">
            {planState.month} • {planState.week}
          </span>
          <span>
            Leader sơ duyệt: <strong className="text-slate-800 font-semibold">{hasLeader ? (planState.bookingLeader || 'Nguyễn Thị Ngọc Tâm') : 'Duyệt trực tiếp (Không có Lead)'}</strong>
          </span>
          <span>PIC: <strong className="text-slate-800 font-semibold">{planState.primaryPic || planState.pic || '—'}</strong></span>
          <span>Growth: <strong className="text-slate-800 font-semibold">{planState.growthPic || '—'}</strong></span>
          <span>Media: <strong className="text-slate-800 font-semibold">{planState.mediaPic || '—'}</strong></span>

          {/* QUYỀN TRƯỞNG PHÒNG: Tùy chỉnh gian có Lead / không có Lead theo tháng */}
          {isLeadUser && !isPlanLocked && (
            <div className="flex items-center gap-2 ml-auto py-1 px-2.5 bg-blue-50/80 border border-blue-200/90 rounded-xl shadow-2xs">
              <span className="text-2xs font-semibold text-blue-900  ">Cấu hình tháng {planState.month}:</span>
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-blue-950">
                <input
                  type="checkbox"
                  checked={hasLeader}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    const defaultLeader = checked ? (planState.bookingLeader || 'Nguyễn Thị Ngọc Tâm') : undefined;
                    setPlanState(prev => ({
                      ...prev,
                      hasBookingLeader: checked,
                      bookingLeader: defaultLeader,
                      leaderApprovalStatus: checked 
                        ? (prev.leaderApprovalStatus === 'KHÔNG_ÁP_DỤNG' ? 'CHƯA_DUYỆT' : (prev.leaderApprovalStatus || 'CHƯA_DUYỆT')) 
                        : 'KHÔNG_ÁP_DỤNG'
                    }));
                    notify(checked
                      ? `Trưởng Phòng đã BẬT yêu cầu Leader sơ duyệt cho gian ${planState.brandName} (Tháng ${planState.month})`
                      : `Trưởng Phòng đã CHUYỂN gian ${planState.brandName} sang chế độ Duyệt trực tiếp (Tháng ${planState.month})`);
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                />
                <span>Yêu cầu Leader sơ duyệt</span>
              </label>

              {hasLeader && (
                <select
                  value={planState.bookingLeader?.split(' (')[0] || 'Nguyễn Thị Ngọc Tâm'}
                  onChange={(e) => {
                    const chosen = e.target.value;
                    setPlanState(prev => ({
                      ...prev,
                      hasBookingLeader: true,
                      bookingLeader: chosen
                    }));
                    notify(`Đã chỉ định ${chosen} làm Leader sơ duyệt cho gian ${planState.brandName} (Tháng ${planState.month})`);
                  }}
                  className="text-xs bg-white border border-blue-300 rounded-lg px-2 py-0.5 font-semibold text-blue-900 focus:outline-none cursor-pointer"
                >
                  <option value="Nguyễn Thị Ngọc Tâm">Nguyễn Thị Ngọc Tâm (Trưởng nhóm)</option>
                  <option value="Lê Phương Thảo">Lê Phương Thảo (Chuyên viên chính)</option>
                  <option value="Lương Thị Như Quỳnh">Lương Thị Như Quỳnh (Chuyên viên chính)</option>
                  <option value="Lê Thanh Hải">Lê Thanh Hải (Chuyên viên chính)</option>
                  <option value="Hoàng Diệu Thuỳ">Hoàng Diệu Thuỳ (Chuyên viên)</option>
                  <option value="Dương Thị Hồng Nhung">Dương Thị Hồng Nhung (Chuyên viên)</option>
                </select>
              )}
            </div>
          )}
        </div>

        {/* Hàng 2.5: THANH QUẢN LÝ & CHUYỂN ĐỔI CÁC PHIÊN BẢN KẾ HOẠCH TRONG THÁNG */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-5 py-2.5 border-t border-slate-100 bg-blue-50/35 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-2xs font-semibold text-slate-600">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              Phiên bản kế hoạch tháng {planState.month}:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {studioVersionSnapshots.map((snap, idx) => {
                const isCurrent = snap.versionCode === activeVersionCode;
                const snapDelta = idx > 0 && baselineSnapshot
                  ? (snap.totalTargetBudget || 0) - (baselineSnapshot.totalTargetBudget || 0)
                  : 0;
                return (
                  <button
                    key={snap.versionCode}
                    type="button"
                    onClick={() => handleSwitchVersionInStudio(snap)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                      isCurrent
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:text-blue-700'
                    }`}
                    title={`${snap.versionCode} (${snap.versionName}): ${snap.changeReason || ''} (${formatVndShort(snap.totalTargetBudget)} • ${snap.totalTargetContents} video)`}
                  >
                    <span>{snap.versionCode}</span>
                    <span className={`text-2xs font-normal ${isCurrent ? 'text-blue-100' : 'text-slate-500'}`}>
                      {idx === 0 ? 'Bản gốc' : `Đợt ${idx + 1}`}
                    </span>
                    <span className={`text-2xs font-mono ${isCurrent ? 'text-white' : 'text-slate-700'}`}>
                      {formatVndShort(snap.totalTargetBudget)}
                    </span>
                    {snapDelta !== 0 && (
                      <span
                        className={`text-2xs px-1 py-0.2 rounded font-semibold ${
                          isCurrent
                            ? 'bg-blue-500 text-white'
                            : snapDelta > 0
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {snapDelta > 0 ? `+${formatVndShort(snapDelta)}` : formatVndShort(snapDelta)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {(activeSnapshot?.changeReason || activeSnapshot?.versionName) && (
              <span className="text-2xs text-slate-500 truncate max-w-md" title={activeSnapshot.changeReason || activeSnapshot.versionName}>
                • {activeSnapshot.changeReason || activeSnapshot.versionName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {studioVersionSnapshots.length > 1 && (deltaBudgetVsBaseline !== 0 || deltaQtyVsBaseline !== 0) && (
              <span className="text-2xs font-semibold px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-700 tabular-nums">
                So với v1.0:{' '}
                <strong className={deltaBudgetVsBaseline >= 0 ? 'text-emerald-700' : 'text-amber-700'}>
                  {deltaBudgetVsBaseline >= 0 ? `+${formatVndShort(deltaBudgetVsBaseline)}` : formatVndShort(deltaBudgetVsBaseline)}
                </strong>
                {' • '}
                <strong className={deltaQtyVsBaseline >= 0 ? 'text-blue-700' : 'text-amber-700'}>
                  {deltaQtyVsBaseline >= 0 ? `+${deltaQtyVsBaseline}` : deltaQtyVsBaseline} video
                </strong>
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsVersionHistoryModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Tạo bản mới / So sánh ({studioVersionSnapshots.length})
            </button>
          </div>
        </div>

        {/* Hàng 3: Tiến độ duyệt gọn 1 dòng */}
        <div className="flex items-center gap-3 flex-wrap px-5 py-2.5 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl">
          <span className="text-2xs font-semibold text-slate-500  ">Tiến độ</span>
          <ol className="flex items-center gap-1.5 flex-wrap text-xs">
            {progressSteps.map((step, idx) => (
              <li key={step.key} className="flex items-center gap-1.5">
                {idx > 0 && <span className="w-4 h-px bg-slate-300" />}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                  step.done
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : step.warn
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-white text-slate-500 border-slate-200'
                }`}>
                  {step.done ? <CheckCircle2 className="w-3 h-3" /> : step.warn ? <AlertTriangle className="w-3 h-3" /> : <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                  {step.label}
                </span>
              </li>
            ))}
          </ol>

          <div className="flex items-center gap-2 ml-auto">
            {canLeaderReview && hasLeader && leaderStatus !== 'ĐÃ_SƠ_DUYỆT' && !isPlanLocked && (
              <button
                onClick={() => {
                  setLeaderReviewNote(planState.leaderNotes || '');
                  setLeaderApprovalDecision('APPROVE');
                  setIsLeaderApprovalModalOpen(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-amber-50 text-amber-700 border border-amber-300 font-semibold text-xs transition cursor-pointer"
              >
                Leader sơ duyệt
              </button>
            )}
            <button
              onClick={() => (isApprovalDetailOpen ? setIsApprovalDetailOpen(false) : openApprovalDetail())}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs transition"
              aria-expanded={isApprovalDetailOpen}
            >
              {isApprovalDetailOpen ? 'Thu gọn' : 'Chi tiết ký duyệt'}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isApprovalDetailOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CHI TIẾT KÝ DUYỆT (mở từ dòng "Tiến độ" trên tiêu đề)                      */}
      {/* ========================================================================= */}
      {isApprovalDetailOpen && (
        <div id="plan-approval-detail">
          <PlanApprovalStepper
            plan={planState}
            currentRole={currentRole}
            currentUser={currentUser}
            onRoleChange={currentUser?.role === 'ADMIN' ? setCurrentRole : undefined}
            onStatusChange={(newStatus, log, note) => handleStatusChangeForPlan(planState.id, newStatus, log, note)}
            onUpdatePlan={(updated) => {
              setPlanState(prev => ({ ...prev, ...updated }));
              setMonthlyPlans(prev => prev.map(p => p.id === planState.id ? { ...p, ...updated } : p));
            }}
            onNotify={notify}
            headerExtra={
              <div
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs ${
                  growthStatus === 'ĐÃ_THỐNG_NHẤT'
                    ? 'bg-emerald-50 border-emerald-200'
                    : growthStatus === 'ĐANG_TRAO_ĐỔI'
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
                title="Trạng thái trao đổi GMV trần & ngân sách với Growth trước khi gửi duyệt"
              >
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-500">Trao đổi Growth:</span>
                <select
                  value={growthStatus}
                  onChange={(e) => {
                    const newStatus = e.target.value as 'CHƯA_TRAO_ĐỔI' | 'ĐANG_TRAO_ĐỔI' | 'ĐÃ_THỐNG_NHẤT';
                    setPlanState(prev => ({ ...prev, growthAlignmentStatus: newStatus }));
                  }}
                  className="font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="CHƯA_TRAO_ĐỔI">Chưa trao đổi</option>
                  <option value="ĐANG_TRAO_ĐỔI">Đang trao đổi</option>
                  <option value="ĐÃ_THỐNG_NHẤT">Đã thống nhất</option>
                </select>
              </div>
            }
          />
        </div>
      )}

      {/* Phiên bản đã chốt: bảng chỉ đọc */}
      {isPlanLocked && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          <span>
            Phiên bản <strong>{planState.currentVersionCode || 'v1.0'}</strong> đã chốt, số liệu chỉ xem. Muốn điều chỉnh cần Growth tạo phiên bản mới.
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* THÔNG SỐ TỔNG GROWTH BÀN GIAO & TỔNG HỢP 4 ĐẦU VIỆC B2C                   */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900">Thông số tổng Growth giao B2C:</span>
            <span className="font-mono font-semibold text-blue-700">{formatVndShort(planState.totalTargetBudget)}</span>
            <span className="text-slate-300">•</span>
            <span className="font-mono font-semibold text-slate-800">{planState.totalTargetContents} video</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-600">Mục tiêu NMV: <strong className="font-mono text-emerald-700">{formatVndShort(planState.targetGmv)}</strong></span>
          </div>
          <div className="text-2xs text-slate-500 flex items-center gap-2">
            <span>Gói Ads (Media): <strong className="font-mono text-slate-700">{formatVndShort(planState.budgetAdsTotal || 0)}</strong></span>
            <span>•</span>
            <span className="text-slate-500">Livestream do Growth phụ trách</span>
          </div>
        </div>

        {/* 4 ĐẦU VIỆC B2C PHÂN RÃ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-slate-100">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between text-2xs text-slate-500">
              <span className="font-medium">1. KOC trả phí</span>
              <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-semibold">KL1 → KL7</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold font-mono text-slate-900">{channelTotals.affiliatePaid.qty} video</span>
              <span className="text-xs font-semibold font-mono text-blue-700">{formatVndShort(channelTotals.affiliatePaid.budget)}</span>
            </div>
            <div className="text-2xs text-slate-400 mt-0.5">Chia theo khung lương &amp; định dạng</div>
          </div>

          <div className="px-4 py-3">
            <div className="flex items-center justify-between text-2xs text-slate-500">
              <span className="font-medium">2. Gửi mẫu miễn phí (FOC)</span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-semibold">0đ Cast</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold font-mono text-emerald-700">{channelTotals.tapFreecast.qty} video</span>
              <span className="text-xs font-medium font-mono text-slate-400">0 đ</span>
            </div>
            <div className="text-2xs text-slate-400 mt-0.5">Suất gửi mẫu miễn phí cho KOC</div>
          </div>

          <div className="px-4 py-3">
            <div className="flex items-center justify-between text-2xs text-slate-500">
              <span className="font-medium">3. Kênh tự xây</span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-semibold">In-house</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold font-mono text-slate-900">{channelTotals.selfChannel.qty} video</span>
              <span className="text-xs font-semibold font-mono text-emerald-700">{formatVndShort(channelTotals.selfChannel.budget)}</span>
            </div>
            <div className="text-2xs text-slate-400 mt-0.5">Chia theo định dạng video</div>
          </div>

          <div className="px-4 py-3">
            <div className="flex items-center justify-between text-2xs text-slate-500">
              <span className="font-medium">4. Đa sàn ngoài TikTok</span>
              <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 font-semibold">Đa sàn</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold font-mono text-slate-900">{channelTotals.multiPlatform.qty} video</span>
              <span className="text-xs font-semibold font-mono text-amber-700">{formatVndShort(channelTotals.multiPlatform.budget)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-2xs text-slate-400 mt-1">
              <ShopeeLogo className="w-3.5 h-3.5 shrink-0" />
              <FacebookLogo className="w-3.5 h-3.5 shrink-0" />
              <InstagramLogo className="w-3.5 h-3.5 shrink-0" />
              <ThreadsLogo className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Shopee, FB, Insta, Threads</span>
            </div>
          </div>
        </div>

        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/60 space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-xs flex-wrap">
            <span className="text-slate-600">
              Đã phân rã B2C: <strong className="font-mono text-slate-900">{formatVndShort(totalAllocatedBudget)}</strong>
              {totalAdsBudget > 0 && (
                <>
                  {' + '}<strong className="font-mono text-slate-900">{formatVndShort(totalAdsBudget)}</strong> Ads
                </>
              )}
              {' = '}<strong className={`font-mono ${isOverBudget ? 'text-rose-600' : 'text-slate-900'}`}>{formatVndShort(totalCombinedBudget)}</strong>
              <span className="text-slate-400"> / {formatVndShort(planState.totalTargetBudget)}</span>
              <span className="mx-2 text-slate-300">|</span>
              <span>Tổng video: <strong className="font-mono text-slate-900">{totalAllocatedContents}/{planState.totalTargetContents}</strong> ({contentFillPct.toFixed(0)}%)</span>
            </span>
            <span className={`font-mono text-2xs font-semibold px-2 py-0.5 rounded-full ${
              isOverBudget ? 'bg-rose-100 text-rose-700' : budgetHeadroom === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-50 text-blue-700'
            }`}>
              {isOverBudget ? `Vượt trần ${formatVndShort(Math.abs(budgetHeadroom))}` : budgetHeadroom === 0 ? 'Khớp trần ngân sách' : `Còn lại ${formatVndShort(budgetHeadroom)}`}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
            <div
              className={`data-bar h-full rounded-full ${isOverBudget ? 'bg-rose-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(100, budgetUsagePct)}%` }}
            />
          </div>
          {(isOverBudget || highTierOverLimit) && (
            <div className="flex items-center gap-x-4 text-2xs text-slate-500 flex-wrap">
              <span className={highTierOverLimit ? 'text-rose-600 font-semibold' : ''}>
                Tỷ trọng KL4–KL7: <strong className="font-mono">{highTierSharePct.toFixed(0)}%</strong> ngân sách booking (giới hạn 45%)
              </span>
              {isOverBudget && <span className="text-rose-600 font-semibold"> Tổng phân rã vượt trần ngân sách Net</span>}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DÃY ĐẦU VIỆC B2C & MA TRẬN TUẦN (KHÔNG CÓ LIVESTREAM)                     */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {([
            { key: 'MINDMAP', label: 'Sơ đồ nhánh (Mindmap)', sub: 'Chọn nhánh & Kéo phân bổ' },
            { key: 'ALL_SUMMARY', label: 'Bảng gộp tất cả', sub: `${totalAllocatedContents} video · ${formatVndShort(totalAllocatedBudget)}` },
            { key: 'AFFILIATE_PAID', label: '1. KOC trả phí', sub: `${channelTotals.affiliatePaid.qty} video · ${formatVndShort(channelTotals.affiliatePaid.budget)}` },
            { key: 'TAP_FREECAST', label: '2. Gửi mẫu miễn phí (FOC)', sub: `${channelTotals.tapFreecast.qty} video · 0 đ` },
            { key: 'SELF_CHANNEL', label: '3. Kênh tự xây', sub: `${channelTotals.selfChannel.qty} video · ${formatVndShort(channelTotals.selfChannel.budget)}` },
            { key: 'MULTI_PLATFORM', label: '4. Đa sàn ngoài TikTok', sub: `${channelTotals.multiPlatform.qty} video · ${formatVndShort(channelTotals.multiPlatform.budget)}` },
            { key: 'WEEKLY_MATRIX', label: 'Chia theo tuần (W1 → W5)', sub: 'Ma trận 5 tuần' }
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-2.5 py-1.5 rounded-xl text-left transition border ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="text-xs font-semibold">{tab.label}</div>
              <div className={`text-2xs font-mono ${activeTab === tab.key ? 'text-blue-100' : 'text-slate-500'}`}>{tab.sub}</div>
            </button>
          ))}
        </div>

        {activeTab !== 'MINDMAP' && activeTab !== 'EXCEL_PREVIEW' && activeTab !== 'WEEKLY_MATRIX' && (
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 shrink-0">
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                viewMode === 'TABLE' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Xem dạng bảng"
            >
              <TableIcon className="w-3.5 h-3.5" /> Bảng
            </button>
            <button
              onClick={() => setViewMode('CARDS')}
              className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                viewMode === 'CARDS' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Xem dạng thẻ theo bậc KOC"
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Thẻ
            </button>
          </div>
        )}
      </div>

      {/* Khi phiên bản đã chốt: khóa toàn bộ ô nhập của vùng phân rã */}
      <fieldset disabled={isPlanLocked} className="min-w-0 m-0 p-0 border-0 space-y-6">

      {/* ========================================================================= */}
      {/* 2.5 MAIN CONTENT AREA: SƠ ĐỒ NHÁNH MINDMAP (CHỌN NHÁNH & PHÂN RÃ NHANH)    */}
      {/* ========================================================================= */}
      {activeTab === 'MINDMAP' && (
        <StorePlanMindmap
          planState={planState}
          picOptions={PIC_OPTIONS}
          disabled={isPlanLocked}
          onUpdateItems={(nextItems) => setPlanState(prev => ({ ...prev, items: nextItems }))}
          onNotify={notify}
        />
      )}

      {/* ========================================================================= */}
      {/* 3. MAIN CONTENT AREA: VIEW MODE 1 - CARDS VIEW (INTUITIVE & MODERN)       */}
      {/* ========================================================================= */}
      {activeTab !== 'MINDMAP' && activeTab !== 'EXCEL_PREVIEW' && activeTab !== 'DISCUSSIONS' && activeTab !== 'WEEKLY_MATRIX' && viewMode === 'CARDS' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleItems.map((item) => {
              const itemBudgetPct = totalAllocatedBudget > 0 ? (item.totalBudget / totalAllocatedBudget) * 100 : 0;

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

                    {/* Content Format Selector Dropdown */}
                    <div className="mt-3">
                      <label className="text-2xs font-semibold text-slate-400 block mb-1">
                        Định dạng video tương ứng
                      </label>
                      <select
                        value={item.contentFormat}
                        onChange={(e) => handleUpdateItemFormat(item.id, e.target.value)}
                        className="w-full text-xs font-medium px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 transition"
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
                          className="w-12 text-center text-sm font-semibold font-mono py-0.5 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-blue-500 shadow-2xs"
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
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Action Bar */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 text-xs font-mono text-slate-600">
              <span>Tổng số lượng: <strong className="text-blue-700">{visibleItems.reduce((s, it) => s + it.qty, 0)}</strong> video</span>
              <span>•</span>
              <span>Tổng ngân sách: <strong className="text-slate-900">{formatVndShort(visibleItems.reduce((s, it) => s + it.totalBudget, 0))}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MAIN CONTENT AREA: VIEW MODE 2 - BẢNG PHÂN RÃ GỌN KHÔNG CUỘN NGANG     */}
      {/* ========================================================================= */}
      {activeTab !== 'MINDMAP' && activeTab !== 'EXCEL_PREVIEW' && activeTab !== 'DISCUSSIONS' && activeTab !== 'WEEKLY_MATRIX' && viewMode === 'TABLE' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
          {/* THANH CÔNG CỤ NHẬP NHANH: GỢI Ý CƠ CẤU & KÉO-THẢ ĐỊNH DẠNG / NHÂN SỰ */}
          <div className="px-3.5 py-2.5 bg-slate-50/80 border-b border-slate-200 space-y-2">
            {/* Dòng 1: Gợi ý phân bổ tự động & Khớp trần */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-2xs font-semibold text-slate-600 mr-1">Gợi ý cơ cấu:</span>
                {([
                  { id: 'BALANCED', label: 'Chuẩn cân bằng (KL1–KL5)' },
                  { id: 'GMV_MAX', label: 'Đẩy số Mega (Tăng KL1–KL3 & FOC)' },
                  { id: 'BRAND_PUSH', label: 'Đẩy nhận diện (KL4–KL6 & Kênh Brand)' },
                  { id: 'COST_SAVER', label: 'Tối ưu chi phí (KL1–KL2 & FOC)' },
                ] as const).map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleApplyPreset(p.id)}
                    className={`px-2 py-1 rounded-lg text-2xs font-semibold border transition cursor-pointer ${
                      planState.strategyPreset === p.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:text-blue-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {budgetHeadroom > 0 && (
                  <button
                    type="button"
                    onClick={handleAutoFitRemainingBudget}
                    className="px-2.5 py-1 rounded-lg text-2xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition cursor-pointer"
                    title="Tự động chia phần ngân sách còn dư vào KL1–KL3 và bù số video thiếu vào FOC 0đ"
                  >
                    Tự động khớp trần ({formatVndShort(budgetHeadroom)} dư)
                  </button>
                )}
                {contentHeadroom > 0 && (
                  <button
                    type="button"
                    onClick={handleFillFocRemaining}
                    className="px-2.5 py-1 rounded-lg text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                    title="Đẩy toàn bộ số lượng video còn thiếu sang FOC (Mẫu 0đ) để đủ chỉ tiêu mà không tăng chi phí"
                  >
                    + Bù {contentHeadroom} video thiếu vào FOC (0đ)
                  </button>
                )}
              </div>
            </div>

            {/* Dòng 2: Thẻ Kéo-Thả (Drag & Drop) Định dạng video & Nhân sự vào từng dòng */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-200/70 text-2xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-500 font-medium">Kéo thả định dạng (hoặc bấm gán cả nhóm):</span>
                {['Review voice', 'Nhạc text', 'Video remix', 'POV', 'Độc quyền', 'Add in'].map(fmt => (
                  <span
                    key={fmt}
                    draggable
                    onDragStart={() => setDraggingPayload({ type: 'FORMAT', value: fmt })}
                    onDragEnd={() => {
                      setDraggingPayload(null);
                      setDragOverRowId(null);
                    }}
                    onClick={() => handleApplyToVisibleRows('FORMAT', fmt)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-medium hover:border-blue-400 hover:text-blue-700 cursor-grab active:cursor-grabbing select-none shadow-2xs"
                    title="Kéo thả vào 1 dòng bên dưới, hoặc bấm để áp dụng cho toàn bộ nhóm đang mở"
                  >
                    <span>⠿</span>
                    <span>{fmt}</span>
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-500 font-medium">Kéo thả nhân sự:</span>
                {Array.from(new Set([planState.pic, 'Trần Thị Hảo', 'Phan Diệu Ánh', 'Lê Phương Thảo', 'Phạm Thị Thu Hằng'])).filter(Boolean).slice(0, 4).map(staff => (
                  <span
                    key={staff}
                    draggable
                    onDragStart={() => setDraggingPayload({ type: 'STAFF', value: staff })}
                    onDragEnd={() => {
                      setDraggingPayload(null);
                      setDragOverRowId(null);
                    }}
                    onClick={() => handleApplyToVisibleRows('STAFF', staff)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50/70 border border-blue-200 text-blue-800 font-semibold hover:bg-blue-100 cursor-grab active:cursor-grabbing select-none"
                    title="Kéo thả vào 1 dòng bên dưới, hoặc bấm để gán cho toàn bộ nhóm đang mở"
                  >
                    <span>⠿</span>
                    <span>{staff}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="w-full">
            <table className="w-full table-fixed text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-2xs">
                  <th className="py-2.5 px-3 w-[22%]">Đầu việc / Khung lương KOC</th>
                  <th className="py-2.5 px-2.5 w-[19%]">Định dạng video (Thả thẻ vào)</th>
                  <th className="py-2.5 px-2.5 w-[15%]">Nhân sự B2C thực thi</th>
                  <th className="py-2.5 px-2 w-[19%] text-center">Số lượng video (Kéo thanh / Nhập)</th>
                  <th className="py-2.5 px-2.5 w-[11%] text-right">Đơn giá Net</th>
                  <th className="py-2.5 px-2.5 w-[9%] text-right">Thành tiền</th>
                  <th className="py-2.5 px-2 w-[5%] text-center">Bù</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleItems.map((item) => {
                  const itemBudgetPct = totalAllocatedBudget > 0 ? (item.totalBudget / totalAllocatedBudget) * 100 : 0;
                  const isDragOver = dragOverRowId === item.id;
                  const maxSlider = item.tierCode.includes('TAP') ? 200 : 80;

                  return (
                    <tr
                      key={item.id}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragOverRowId !== item.id) setDragOverRowId(item.id);
                      }}
                      onDragLeave={() => {
                        if (dragOverRowId === item.id) setDragOverRowId(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleDropOnRow(item.id);
                      }}
                      className={`transition group ${
                        isDragOver
                          ? 'bg-blue-100/70 ring-2 ring-inset ring-blue-500'
                          : 'hover:bg-blue-50/30'
                      }`}
                    >
                      {/* Column 1: Tier Badge & Label */}
                      <td className="py-2.5 px-3 align-middle">
                        <div className="flex items-center gap-1.5 mb-0.5 min-w-0">
                          <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded font-mono border shrink-0 ${getTierBadgeStyle(item.tierCode)}`}>
                            {item.tierCode}
                          </span>
                          <span className="font-semibold text-slate-900 text-xs truncate" title={item.tierLabel}>
                            {item.tierLabel.split(':')[1]?.trim() || item.tierLabel}
                          </span>
                        </div>
                        <span className="text-2xs text-slate-400 block truncate" title={item.notes || item.platform}>
                          {item.notes || item.platform}
                        </span>
                      </td>

                      {/* Column 2: Content Format Selector */}
                      <td className="py-2.5 px-2.5 align-middle">
                        <select
                          value={item.contentFormat}
                          onChange={(e) => handleUpdateItemFormat(item.id, e.target.value)}
                          className="w-full text-xs font-medium px-2 py-1.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 transition shadow-2xs truncate"
                        >
                          {CONTENT_FORMAT_OPTIONS.map(fmt => (
                            <option key={fmt} value={fmt}>{fmt}</option>
                          ))}
                        </select>
                      </td>

                      {/* Column 3: Assignee Selector */}
                      <td className="py-2.5 px-2.5 align-middle">
                        <select
                          value={item.assignedStaff || planState.pic}
                          onChange={(e) => handleUpdateItemAssignee(item.id, e.target.value)}
                          className={`w-full text-xs font-semibold px-2 py-1.5 rounded-lg border transition shadow-2xs truncate ${
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

                      {/* Column 4: Quantity Stepper + Range Slider */}
                      <td className="py-2 px-2 align-middle">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleAdjustItemQty(item.id, -1)}
                              className="w-6 h-6 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold flex items-center justify-center transition shadow-2xs shrink-0"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              value={item.qty}
                              onChange={(e) => handleUpdateItemQty(item.id, Number(e.target.value))}
                              className="w-11 text-center text-xs font-semibold font-mono py-0.5 border border-slate-200 rounded bg-white text-slate-900 focus:outline-none focus:border-blue-500 shadow-2xs"
                            />
                            <button
                              onClick={() => handleAdjustItemQty(item.id, 1)}
                              className="w-6 h-6 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold flex items-center justify-center transition shadow-2xs shrink-0"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleAdjustItemQty(item.id, 5)}
                              className="text-2xs font-semibold px-1 py-0.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition shrink-0"
                              title="Tăng nhanh 5 video"
                            >
                              +5
                            </button>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={maxSlider}
                            value={Math.min(item.qty, maxSlider)}
                            onChange={(e) => handleUpdateItemQty(item.id, Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            title={`Kéo để chỉnh nhanh số lượng (0 → ${maxSlider} video)`}
                          />
                        </div>
                      </td>

                      {/* Column 5: Unit Cost & Benchmark Reset */}
                      <td className="py-2.5 px-2.5 text-right align-middle">
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            step="500000"
                            value={item.unitCost}
                            onChange={(e) => handleUpdateItemCost(item.id, Number(e.target.value))}
                            className="w-full max-w-[92px] text-right text-xs font-mono font-medium px-1.5 py-1 bg-white border border-slate-200 rounded text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
                          />
                          {item.unitCost !== item.benchmarkCost && (
                            <button
                              onClick={() => handleResetItemToBenchmark(item.id)}
                              className="text-slate-400 hover:text-blue-600 p-0.5 transition shrink-0"
                              title={`Khôi phục đơn giá định mức: ${formatVndShort(item.benchmarkCost)}`}
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Column 6: Subtotal & Percentage */}
                      <td className="py-2.5 px-2.5 text-right font-mono align-middle">
                        <span className="text-xs font-semibold text-slate-900 block">
                          {formatVndShort(item.totalBudget)}
                        </span>
                        <span className="text-2xs text-slate-400 block">
                          {itemBudgetPct.toFixed(1)}% ngân sách
                        </span>
                      </td>

                      {/* Column 7: Quick Fill Button */}
                      <td className="py-2.5 px-2 text-center align-middle">
                        {contentHeadroom > 0 ? (
                          <button
                            onClick={() => handleFillRemainingToItem(item.id)}
                            className="text-2xs font-semibold text-blue-600 hover:bg-blue-50 px-1.5 py-1 rounded border border-blue-200 transition"
                            title={`Điền nốt ${contentHeadroom} video còn thiếu vào dòng này`}
                          >
                            +{contentHeadroom}
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
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs font-mono text-slate-600">
              <span>Đang hiển thị: <strong className="text-slate-900">{visibleItems.length}</strong> hạng mục</span>
              <span>•</span>
              <span>Tổng ngân sách: <strong className="text-blue-700">{formatVndShort(visibleItems.reduce((s, it) => s + it.totalBudget, 0))}</strong></span>
              <span>•</span>
              <span>Số lượng: <strong className="text-slate-900">{visibleItems.reduce((s, it) => s + it.qty, 0)}</strong> video</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TAB MA TRẬN PHÂN RÃ TUẦN - 4 TRỤ CỘT TRIỂN KHAI (W1 -> W5)            */}
      {/* ========================================================================= */}
      {activeTab === 'WEEKLY_MATRIX' && (
        <div className="space-y-4">
          {/* Header & Quick Action Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
                  <Calendar className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-slate-900">
                      Bảng Ma Trận Phân Rã Tuần - 4 Đầu Việc B2C (W1 → W5)
                    </h3>
                    <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      Gian hàng: {planState.brandName}
                    </span>
                    <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      Tháng {planState.month}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-3xl">
                    Bấm chọn <strong>Nhịp chiến dịch</strong> bên dưới để hệ thống tự động lấy tổng của 4 đầu việc B2C rải xuống 5 tuần (`W1 → W5`) và chia sẵn bậc `KL1 → KL7`, không cần gõ tay từng ô.
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                    <span className="text-2xs font-semibold text-slate-600 mr-1">Tự động rải 5 tuần từ 4 đầu việc:</span>
                    <button
                      type="button"
                      onClick={() => handleDistributeWeeklyByPattern('MEGA_EARLY')}
                      className="px-2.5 py-1 rounded-lg text-2xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition cursor-pointer"
                    >
                      Nhịp Mega Sale đầu tháng (Dồn W1–W2: 55%)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDistributeWeeklyByPattern('PAYDAY_PEAK')}
                      className="px-2.5 py-1 rounded-lg text-2xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition cursor-pointer"
                    >
                      Nhịp Mid-month &amp; Payday (Đỉnh W2 &amp; W4)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDistributeWeeklyByPattern('EVEN')}
                      className="px-2.5 py-1 rounded-lg text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                    >
                      Rải đều 5 tuần (20% / tuần)
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <button
                  onClick={handleResetWeeklyMatrix}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
                  title="Khôi phục phân bổ mẫu đều 5 tuần"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Khôi phục mẫu</span>
                </button>
                <button
                  onClick={handleSyncWeeklyMatrixToStore}
                  className="px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
                  title="Đồng bộ phân rã tuần vào lịch thực thi gian hàng"
                >
                  <SendHorizonal className="w-3.5 h-3.5 text-blue-600" />
                  <span>Đồng bộ lịch tuần</span>
                </button>
                <button
                  onClick={handleSaveWeeklyMatrix}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
                >
                  <Save className="w-3.5 h-3.5 text-amber-300" />
                  <span>Lưu kế hoạch 5 tuần</span>
                </button>
              </div>
            </div>

            {/* Top 4 Pillars Metric Badges & Total Variance */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-4 pt-4 border-t border-slate-100">
              {/* Trụ 1 */}
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200">
                <div className="flex items-center justify-between text-2xs text-blue-900 font-semibold mb-1">
                  <span>1. Affiliate Có Cast</span>
                  <span className="px-1.5 py-0.2 rounded bg-blue-200/60 font-mono text-blue-800">KL1 → KL7</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-semibold font-mono text-blue-950">
                    {weeklyMatrixTotals.affQty} <span className="text-2xs font-normal text-blue-700">clip</span>
                  </span>
                  <span className="text-xs font-semibold font-mono text-blue-800">
                    {formatVndShort(weeklyMatrixTotals.affBudget)}
                  </span>
                </div>
                <span className="text-2xs text-blue-600 block mt-0.5">KOC nhận thù lao booking</span>
              </div>

              {/* Trụ 2 */}
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200">
                <div className="flex items-center justify-between text-2xs text-blue-900 font-semibold mb-1">
                  <span>2. Gửi mẫu miễn phí (FOC)</span>
                  <span className="px-1.5 py-0.2 rounded bg-blue-200/60 font-mono text-blue-800">FOC Mẫu</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-semibold font-mono text-blue-950">
                    {weeklyMatrixTotals.tapQty} <span className="text-2xs font-normal text-blue-700">clip</span>
                  </span>
                  <span className="text-xs font-semibold font-mono text-blue-800">
                    0 đ cast
                  </span>
                </div>
                <span className="text-2xs text-blue-600 block mt-0.5">Mạng lưới TAP UpAffiliate & Brand</span>
              </div>

              {/* Trụ 3 */}
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <div className="flex items-center justify-between text-2xs text-emerald-900 font-semibold mb-1">
                  <span>3. Kênh Tự Xây</span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-200/60 font-mono text-emerald-800">Inhouse</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-semibold font-mono text-emerald-950">
                    {weeklyMatrixTotals.selfQty} <span className="text-2xs font-normal text-emerald-700">clip</span>
                  </span>
                  <span className="text-xs font-semibold font-mono text-emerald-800">
                    {formatVndShort(weeklyMatrixTotals.selfBudget)}
                  </span>
                </div>
                <span className="text-2xs text-emerald-600 block mt-0.5">Voice, remix, POV, kịch bản mẫu</span>
              </div>

              {/* Trụ 4 */}
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                <div className="flex items-center justify-between text-2xs text-amber-900 font-semibold mb-1">
                  <span>4. Đa Sàn Khác</span>
                  <span className="px-1.5 py-0.2 rounded bg-amber-200/60 font-mono text-amber-800">Shopee/FB</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-semibold font-mono text-amber-950">
                    {weeklyMatrixTotals.multiQty} <span className="text-2xs font-normal text-amber-700">clip</span>
                  </span>
                  <span className="text-xs font-semibold font-mono text-amber-800">
                    {formatVndShort(weeklyMatrixTotals.multiBudget)}
                  </span>
                </div>
                <span className="text-2xs text-amber-600 block mt-0.5">Shopee Video, FB, Threads, IG</span>
              </div>

              {/* Tổng 5 tuần & Đối soát */}
              <div className="p-3 rounded-xl bg-slate-900 text-white border border-slate-800">
                <div className="flex items-center justify-between text-2xs text-slate-300 font-semibold mb-1">
                  <span>Tổng 5 Tuần</span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                    Khớp 4.1
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-semibold font-mono text-white">
                    {weeklyMatrixTotals.totalQty} <span className="text-2xs font-normal text-slate-400">clip</span>
                  </span>
                  <span className="text-xs font-semibold font-mono text-emerald-400">
                    {formatVndShort(weeklyMatrixTotals.totalBudget)}
                  </span>
                </div>
                <span className="text-2xs text-slate-400 block mt-0.5">
                  Chỉ tiêu: {planState.totalTargetContents} clip ({formatVndShort(planState.totalTargetBudget)})
                </span>
              </div>
            </div>
          </div>

          {/* Ma Trận Phân Rã Chi Tiết 5 Tuần Table (Gọn gàng không cuộn ngang) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
            <div className="w-full">
              <table className="w-full table-fixed text-left text-xs border-collapse">
                <thead>
                  {/* Hàng Header Nhóm (Group Headers) */}
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-2xs">
                    <th className="py-2.5 px-2.5 w-[12%] border-r border-slate-200">Tuần</th>
                    <th colSpan={2} className="py-2 px-2 text-center w-[16%] bg-blue-100/90 text-blue-950 border-r border-blue-200 font-semibold">
                      1. KOC trả phí
                    </th>
                    <th className="py-2 px-2 text-center w-[8%] bg-blue-100/90 text-blue-950 border-r border-blue-200 font-semibold">
                      2. FOC (0đ)
                    </th>
                    <th colSpan={2} className="py-2 px-2 text-center w-[16%] bg-emerald-100/90 text-emerald-950 border-r border-emerald-200 font-semibold">
                      3. Kênh tự xây
                    </th>
                    <th colSpan={2} className="py-2 px-2 text-center w-[16%] bg-amber-100/90 text-amber-950 border-r border-amber-200 font-semibold">
                      4. Đa sàn ngoài TikTok
                    </th>
                    <th colSpan={2} className="py-2 px-2 text-center w-[14%] bg-slate-800 text-white border-r border-slate-700 font-semibold">
                      Tổng Tuần
                    </th>
                    <th className="py-2 px-2 w-[9%] text-center border-r border-slate-200">PIC B2C</th>
                    <th className="py-2 px-1.5 w-[5%] text-center border-r border-slate-200">TT</th>
                    <th className="py-2 px-1 w-[4%] text-center">Mở</th>
                  </tr>
                  {/* Hàng Header Cột Con (Sub Headers) */}
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-2xs">
                    <th className="py-1.5 px-2.5 border-r border-slate-200 text-slate-400">Giai đoạn</th>
                    {/* Trụ 1 */}
                    <th className="py-1.5 px-1.5 text-center bg-blue-50/50 text-blue-900 border-r border-blue-100">Video</th>
                    <th className="py-1.5 px-1.5 text-right bg-blue-50/50 text-blue-900 border-r border-blue-200">Ngân sách</th>
                    {/* Trụ 2 */}
                    <th className="py-1.5 px-1.5 text-center bg-blue-50/50 text-blue-900 border-r border-blue-200">Video 0đ</th>
                    {/* Trụ 3 */}
                    <th className="py-1.5 px-1.5 text-center bg-emerald-50/50 text-emerald-900 border-r border-emerald-100">Video</th>
                    <th className="py-1.5 px-1.5 text-right bg-emerald-50/50 text-emerald-900 border-r border-emerald-200">Chi phí SX</th>
                    {/* Trụ 4 */}
                    <th className="py-1.5 px-1.5 text-center bg-amber-50/50 text-amber-900 border-r border-amber-100">Video</th>
                    <th className="py-1.5 px-1.5 text-right bg-amber-50/50 text-amber-900 border-r border-amber-200">Ngân sách</th>
                    {/* Tổng */}
                    <th className="py-1.5 px-1.5 text-center bg-slate-100 text-slate-900 border-r border-slate-200 font-semibold">Video</th>
                    <th className="py-1.5 px-1.5 text-right bg-slate-100 text-slate-900 border-r border-slate-300 font-semibold">Chi phí</th>
                    {/* Meta */}
                    <th className="py-1.5 px-1.5 text-center border-r border-slate-200">Thực thi</th>
                    <th className="py-1.5 px-1 text-center border-r border-slate-200">Tiến độ</th>
                    <th className="py-1.5 px-1 text-center">Bậc</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {weeklyMatrix.map((row, idx) => {
                    const rowTotalQty = (row.affPaidQty || 0) + (row.tapFreeQty || 0) + (row.selfChannelQty || 0) + (row.multiQty || 0);
                    const rowTotalBudget = (row.affPaidBudget || 0) + (row.selfChannelBudget || 0) + (row.multiBudget || 0);
                    const isExpanded = expandedWeekIndex === idx;

                    return (
                      <React.Fragment key={row.week}>
                        <tr className={`hover:bg-slate-50/80 transition ${isExpanded ? 'bg-blue-50/30' : ''}`}>
                          {/* Cột Tuần */}
                          <td className="py-2 px-2.5 border-r border-slate-200 align-middle">
                            <span className="font-semibold text-slate-900 block font-mono text-xs">
                              {row.week.split(' ')[0]}
                            </span>
                            <span className="text-2xs text-slate-500 font-mono block truncate">
                              {row.week.split(' ').slice(1).join(' ')}
                            </span>
                          </td>

                          {/* Trụ 1: Affiliate Có Cast */}
                          <td className="py-2 px-1.5 border-r border-blue-100 bg-blue-50/20 text-center align-middle">
                            <input
                              type="number"
                              min="0"
                              value={row.affPaidQty}
                              onChange={(e) => handleUpdateWeeklyMatrixCell(idx, 'affPaidQty', Number(e.target.value))}
                              className="w-full max-w-[48px] text-center font-semibold font-mono py-1 px-1 bg-white border border-blue-300 rounded text-blue-950 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                            />
                          </td>
                          <td className="py-2 px-1.5 border-r border-blue-200 bg-blue-50/20 text-right align-middle">
                            <input
                              type="number"
                              step="1000000"
                              min="0"
                              value={row.affPaidBudget}
                              onChange={(e) => handleUpdateWeeklyMatrixCell(idx, 'affPaidBudget', Number(e.target.value))}
                              className="w-full text-right font-medium font-mono py-0.5 px-1 bg-white border border-blue-300 rounded text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 text-2xs"
                            />
                            <span className="text-2xs text-blue-600 block mt-0.5 font-mono">
                              {formatVndShort(row.affPaidBudget)}
                            </span>
                          </td>

                          {/* Trụ 2: TAP Freecast (FOC 0đ) */}
                          <td className="py-2 px-1.5 border-r border-blue-200 bg-blue-50/20 text-center align-middle">
                            <input
                              type="number"
                              min="0"
                              value={row.tapFreeQty}
                              onChange={(e) => handleUpdateWeeklyMatrixCell(idx, 'tapFreeQty', Number(e.target.value))}
                              className="w-full max-w-[52px] text-center font-semibold font-mono py-1 px-1 bg-white border border-blue-300 rounded text-blue-950 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                            />
                            <span className="text-2xs text-blue-600 block mt-0.5 font-mono">0 đ</span>
                          </td>

                          {/* Trụ 3: Kênh Tự Xây */}
                          <td className="py-2 px-1.5 border-r border-emerald-100 bg-emerald-50/20 text-center align-middle">
                            <input
                              type="number"
                              min="0"
                              value={row.selfChannelQty}
                              onChange={(e) => handleUpdateWeeklyMatrixCell(idx, 'selfChannelQty', Number(e.target.value))}
                              className="w-full max-w-[48px] text-center font-semibold font-mono py-1 px-1 bg-white border border-emerald-300 rounded text-emerald-950 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                            />
                          </td>
                          <td className="py-2 px-1.5 border-r border-emerald-200 bg-emerald-50/20 text-right align-middle">
                            <input
                              type="number"
                              step="500000"
                              min="0"
                              value={row.selfChannelBudget}
                              onChange={(e) => handleUpdateWeeklyMatrixCell(idx, 'selfChannelBudget', Number(e.target.value))}
                              className="w-full text-right font-medium font-mono py-0.5 px-1 bg-white border border-emerald-300 rounded text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-2xs"
                            />
                            <span className="text-2xs text-emerald-600 block mt-0.5 font-mono">
                              {formatVndShort(row.selfChannelBudget)}
                            </span>
                          </td>

                          {/* Trụ 4: Đa Sàn Khác */}
                          <td className="py-2 px-1.5 border-r border-amber-100 bg-amber-50/20 text-center align-middle">
                            <input
                              type="number"
                              min="0"
                              value={row.multiQty}
                              onChange={(e) => handleUpdateWeeklyMatrixCell(idx, 'multiQty', Number(e.target.value))}
                              className="w-full max-w-[48px] text-center font-semibold font-mono py-1 px-1 bg-white border border-amber-300 rounded text-amber-950 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                            />
                          </td>
                          <td className="py-2 px-1.5 border-r border-amber-200 bg-amber-50/20 text-right align-middle">
                            <input
                              type="number"
                              step="500000"
                              min="0"
                              value={row.multiBudget}
                              onChange={(e) => handleUpdateWeeklyMatrixCell(idx, 'multiBudget', Number(e.target.value))}
                              className="w-full text-right font-medium font-mono py-0.5 px-1 bg-white border border-amber-300 rounded text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 text-2xs"
                            />
                            <span className="text-2xs text-amber-600 block mt-0.5 font-mono">
                              {formatVndShort(row.multiBudget)}
                            </span>
                          </td>

                          {/* Tổng Tuần */}
                          <td className="py-2 px-1.5 border-r border-slate-200 bg-slate-50 text-center font-mono font-semibold text-slate-900 text-xs align-middle">
                            {rowTotalQty}
                          </td>
                          <td className="py-2 px-1.5 border-r border-slate-300 bg-slate-50 text-right font-mono font-semibold text-blue-950 text-xs align-middle">
                            {formatVndShort(rowTotalBudget)}
                          </td>

                          {/* PIC */}
                          <td className="py-2 px-1.5 border-r border-slate-200 align-middle">
                            <select
                              value={row.pic}
                              onChange={(e) => handleUpdateWeeklyMatrixCell(idx, 'pic', e.target.value)}
                              className="w-full text-2xs font-semibold px-1 py-1 bg-slate-50 hover:bg-white border border-slate-200 rounded text-slate-800 focus:outline-none focus:border-blue-500 truncate"
                            >
                              {PIC_OPTIONS.map(staff => (
                                <option key={staff} value={staff}>{staff}</option>
                              ))}
                            </select>
                          </td>

                          {/* Trạng Thái */}
                          <td className="py-2 px-1 border-r border-slate-200 text-center align-middle">
                            <select
                              value={row.status}
                              onChange={(e) => handleUpdateWeeklyMatrixCell(idx, 'status', e.target.value)}
                              className={`w-full text-2xs font-semibold px-1 py-0.5 rounded border text-center truncate ${
                                row.status === 'Đã lập'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : row.status === 'Đang chạy'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              <option value="Đã lập">Đã lập</option>
                              <option value="Dự thảo">Dự thảo</option>
                              <option value="Đang chạy">Đang chạy</option>
                              <option value="Hoàn thành">Xong</option>
                            </select>
                          </td>

                          {/* Nút Xem Chi Tiết Bậc KOC */}
                          <td className="py-2 px-1 text-center align-middle">
                            <button
                              onClick={() => setExpandedWeekIndex(isExpanded ? null : idx)}
                              className={`p-1 rounded border transition ${
                                isExpanded
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white hover:bg-slate-100 text-slate-500 border-slate-200'
                              }`}
                              title={isExpanded ? 'Thu gọn chi tiết bậc' : 'Mở rộng chi tiết bậc KOC và định dạng'}
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                        </tr>

                        {/* MỞ RỘNG CHI TIẾT BẬC KOC VÀ ĐỊNH DẠNG TUẦN NÀY */}
                        {isExpanded && (
                          <tr className="bg-slate-50/90 border-b border-blue-100">
                            <td colSpan={12} className="p-4">
                              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4 shadow-xs">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                                    <h4 className="text-xs font-semibold text-slate-900">
                                      Chi Tiết Phân Bậc KOC &amp; Định Dạng Tuần {row.week.split(' ')[0]} ({row.pic} phụ trách)
                                    </h4>
                                  </div>
                                  <span className="text-2xs text-slate-500 font-mono">
                                    Tổng: {rowTotalQty} clip ({formatVndShort(rowTotalBudget)})
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                  {/* Khối 1: Phân bậc KL1 -> KL7 */}
                                  <div className="p-3 rounded-lg bg-blue-50/40 border border-blue-100 space-y-2">
                                    <span className="text-2xs font-semibold text-blue-900 block  ">
                                      Bậc KOC Có Cast (KL1 - KL7)
                                    </span>
                                    <div className="grid grid-cols-2 gap-2 text-2xs">
                                      {(['kl1', 'kl2', 'kl3', 'kl4', 'kl5', 'kl6', 'kl7'] as const).map(tierKey => (
                                        <div key={tierKey} className="flex items-center justify-between bg-white px-2 py-1 rounded border border-blue-200">
                                          <span className="font-mono font-semibold text-blue-900 ">{tierKey}</span>
                                          <input
                                            type="number"
                                            min="0"
                                            value={row.tiers?.[tierKey] || 0}
                                            onChange={(e) => handleUpdateWeeklyTier(idx, tierKey, Number(e.target.value))}
                                            className="w-10 text-center font-mono font-semibold py-0.5 border border-slate-200 rounded text-slate-900"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Khối 2: Nguồn TAP FOC */}
                                  <div className="p-3 rounded-lg bg-blue-50/40 border border-blue-100 space-y-2">
                                    <span className="text-2xs font-semibold text-blue-900 block  ">
                                      Nguồn Mẫu TAP Freecast
                                    </span>
                                    <div className="space-y-1.5 text-2xs">
                                      <div className="flex items-center justify-between bg-white px-2 py-1 rounded border border-blue-200">
                                        <span className="text-blue-950 font-medium">TAP UpAffiliate</span>
                                        <span className="font-mono font-semibold text-blue-900">{row.tapChannels?.upAffiliate || 0} clip</span>
                                      </div>
                                      <div className="flex items-center justify-between bg-white px-2 py-1 rounded border border-blue-200">
                                        <span className="text-blue-950 font-medium">TAP Brand (TikTok)</span>
                                        <span className="font-mono font-semibold text-blue-900">{row.tapChannels?.brand || 0} clip</span>
                                      </div>
                                      <div className="flex items-center justify-between bg-white px-2 py-1 rounded border border-blue-200">
                                        <span className="text-blue-950 font-medium">TAP Upbase Nội bộ</span>
                                        <span className="font-mono font-semibold text-blue-900">{row.tapChannels?.upbase || 0} clip</span>
                                      </div>
                                    </div>
                                    <p className="text-2xs text-blue-500 italic mt-1">Cam kết phát mẫu FOC, không phát sinh chi phí thù lao</p>
                                  </div>

                                  {/* Khối 3: Định dạng Kênh Tự Xây */}
                                  <div className="p-3 rounded-lg bg-emerald-50/40 border border-emerald-100 space-y-2">
                                    <span className="text-2xs font-semibold text-emerald-900 block  ">
                                      Định Dạng Kênh Tự Xây (Inhouse)
                                    </span>
                                    <div className="space-y-1.5 text-2xs">
                                      <div className="flex items-center justify-between bg-white px-2 py-1 rounded border border-emerald-200">
                                        <span className="text-emerald-950 font-medium">Review voice</span>
                                        <span className="font-mono font-semibold text-emerald-900">{row.selfFormats?.voice || 0} clip</span>
                                      </div>
                                      <div className="flex items-center justify-between bg-white px-2 py-1 rounded border border-emerald-200">
                                        <span className="text-emerald-950 font-medium">Nhạc text trending</span>
                                        <span className="font-mono font-semibold text-emerald-900">{row.selfFormats?.text || 0} clip</span>
                                      </div>
                                      <div className="flex items-center justify-between bg-white px-2 py-1 rounded border border-emerald-200">
                                        <span className="text-emerald-950 font-medium">Video remix / Highlight</span>
                                        <span className="font-mono font-semibold text-emerald-900">{row.selfFormats?.remix || 0} clip</span>
                                      </div>
                                      <div className="flex items-center justify-between bg-white px-2 py-1 rounded border border-emerald-200">
                                        <span className="text-emerald-950 font-medium">Kịch bản dựng tự động</span>
                                        <span className="font-mono font-semibold text-emerald-900">{row.selfFormats?.autoScript || 0} clip</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Khối 4: Booking Đa Sàn Khác */}
                                  <div className="p-3 rounded-lg bg-amber-50/40 border border-amber-100 space-y-2">
                                    <span className="text-2xs font-semibold text-amber-900 block  ">
                                      Booking Đa Nền Tảng Khác
                                    </span>
                                    <div className="space-y-1.5 text-2xs">
                                      <div className="flex items-center justify-between bg-white px-2 py-1 rounded border border-amber-200">
                                        <span className="text-amber-950 font-medium">Shopee Video (Reup/Aff)</span>
                                        <span className="font-mono font-semibold text-amber-900">{row.multiPlatforms?.shopee || 0} clip</span>
                                      </div>
                                      <div className="flex items-center justify-between bg-white px-2 py-1 rounded border border-amber-200">
                                        <span className="text-amber-950 font-medium">Facebook Reels</span>
                                        <span className="font-mono font-semibold text-amber-900">{row.multiPlatforms?.facebook || 0} clip</span>
                                      </div>
                                      <div className="flex items-center justify-between bg-white px-2 py-1 rounded border border-amber-200">
                                        <span className="text-amber-950 font-medium">Threads Viral Post</span>
                                        <span className="font-mono font-semibold text-amber-900">{row.multiPlatforms?.threads || 0} clip</span>
                                      </div>
                                      <div className="flex items-center justify-between bg-white px-2 py-1 rounded border border-amber-200">
                                        <span className="text-amber-950 font-medium">Instagram Reels</span>
                                        <span className="font-mono font-semibold text-amber-900">{row.multiPlatforms?.instagram || 0} clip</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>

                {/* ================================================================= */}
                {/* FOOTER ĐỐI SOÁT: 3 HÀNG CHUẨN KẾ TOÁN & VẬN HÀNH                  */}
                {/* ================================================================= */}
                <tfoot>
                  {/* HÀNG 1: TỔNG THỰC TẾ 5 TUẦN */}
                  <tr className="bg-blue-50/70 border-t-2 border-blue-300 font-semibold text-xs">
                    <td className="py-2.5 px-2.5 text-slate-900 border-r border-blue-200">
                      Tổng 5 Tuần
                    </td>
                    {/* Trụ 1 */}
                    <td className="py-2 px-1.5 text-center text-blue-950 font-mono border-r border-blue-200 font-semibold">
                      {weeklyMatrixTotals.affQty}
                    </td>
                    <td className="py-2 px-1.5 text-right text-blue-950 font-mono border-r border-blue-300 font-semibold">
                      {formatVndShort(weeklyMatrixTotals.affBudget)}
                    </td>
                    {/* Trụ 2 */}
                    <td className="py-2 px-1.5 text-center text-blue-950 font-mono border-r border-blue-300 font-semibold">
                      {weeklyMatrixTotals.tapQty}
                    </td>
                    {/* Trụ 3 */}
                    <td className="py-2 px-1.5 text-center text-emerald-950 font-mono border-r border-emerald-200 font-semibold">
                      {weeklyMatrixTotals.selfQty}
                    </td>
                    <td className="py-2 px-1.5 text-right text-emerald-950 font-mono border-r border-emerald-300 font-semibold">
                      {formatVndShort(weeklyMatrixTotals.selfBudget)}
                    </td>
                    {/* Trụ 4 */}
                    <td className="py-2 px-1.5 text-center text-amber-950 font-mono border-r border-amber-200 font-semibold">
                      {weeklyMatrixTotals.multiQty}
                    </td>
                    <td className="py-2 px-1.5 text-right text-amber-950 font-mono border-r border-amber-300 font-semibold">
                      {formatVndShort(weeklyMatrixTotals.multiBudget)}
                    </td>
                    {/* Tổng Kế Hoạch Tuần */}
                    <td className="py-2 px-1.5 text-center text-slate-900 font-mono text-xs border-r border-slate-300 font-semibold bg-blue-100/60">
                      {weeklyMatrixTotals.totalQty}
                    </td>
                    <td className="py-2 px-1.5 text-right text-blue-900 font-mono text-xs border-r border-slate-300 font-semibold bg-blue-100/60">
                      {formatVndShort(weeklyMatrixTotals.totalBudget)}
                    </td>
                    <td colSpan={3} className="py-2 px-2 text-center text-2xs text-slate-600 font-semibold">
                      Tổng thực tế 5 tuần
                    </td>
                  </tr>

                  {/* HÀNG 2: CHỈ TIÊU GIAO TỪ BẢNG MACRO 4.1 */}
                  <tr className="bg-slate-100/80 border-t border-slate-200 font-medium text-xs text-slate-700">
                    <td className="py-2 px-2.5 border-r border-slate-200 font-semibold">
                      Chỉ Tiêu 4.1
                    </td>
                    {/* Trụ 1: Target */}
                    <td className="py-2 px-1.5 text-center font-mono border-r border-slate-200 text-slate-600">
                      {planState.targetAffiliateContents || 85}
                    </td>
                    <td className="py-2 px-1.5 text-right font-mono border-r border-slate-200 text-slate-600">
                      {formatVndShort(planState.budgetAffiliate || 150000000)}
                    </td>
                    {/* Trụ 2: Target */}
                    <td className="py-2 px-1.5 text-center font-mono border-r border-slate-200 text-slate-600">
                      120
                    </td>
                    {/* Trụ 3: Target */}
                    <td className="py-2 px-1.5 text-center font-mono border-r border-slate-200 text-slate-600">
                      {planState.targetSelfChannelContents || 40}
                    </td>
                    <td className="py-2 px-1.5 text-right font-mono border-r border-slate-200 text-slate-600">
                      {formatVndShort(planState.budgetSelfChannel || 50000000)}
                    </td>
                    {/* Trụ 4: Target */}
                    <td className="py-2 px-1.5 text-center font-mono border-r border-slate-200 text-slate-600">
                      15
                    </td>
                    <td className="py-2 px-1.5 text-right font-mono border-r border-slate-200 text-slate-600">
                      {formatVndShort(10000000)}
                    </td>
                    {/* Tổng Target */}
                    <td className="py-2 px-1.5 text-center font-mono font-semibold text-slate-800 border-r border-slate-200 bg-slate-200/50">
                      {planState.totalTargetContents}
                    </td>
                    <td className="py-2 px-1.5 text-right font-mono font-semibold text-slate-800 border-r border-slate-200 bg-slate-200/50">
                      {formatVndShort(planState.totalTargetBudget)}
                    </td>
                    <td colSpan={3} className="py-2 px-2 text-center text-2xs text-slate-500">
                      Đề bài Growth giao
                    </td>
                  </tr>

                  {/* HÀNG 3: ĐỐI SOÁT CHÊNH LỆCH (VARIANCE GAP) */}
                  {(() => {
                    const videoDelta = weeklyMatrixTotals.totalQty - planState.totalTargetContents;
                    const budgetDelta = weeklyMatrixTotals.totalBudget - (planState.totalTargetBudget - (planState.budgetAdsTotal || 0));
                    const isBudgetSafe = budgetDelta <= 0;

                    return (
                      <tr className="bg-slate-50 border-t border-slate-200 font-semibold text-xs">
                        <td className="py-2 px-2.5 border-r border-slate-200 text-slate-900">
                          Chênh Lệch
                        </td>
                        {/* Trụ 1: Gap */}
                        <td className="py-2 px-1.5 text-center font-mono border-r border-slate-200 text-2xs text-slate-600">
                          {weeklyMatrixTotals.affQty - (planState.targetAffiliateContents || 85) >= 0 ? '+' : ''}
                          {weeklyMatrixTotals.affQty - (planState.targetAffiliateContents || 85)}
                        </td>
                        <td className="py-2 px-1.5 text-right font-mono border-r border-slate-200 text-2xs text-slate-600">
                          {formatVndShort(weeklyMatrixTotals.affBudget - (planState.budgetAffiliate || 150000000))}
                        </td>
                        {/* Trụ 2: Gap */}
                        <td className="py-2 px-1.5 text-center font-mono border-r border-slate-200 text-2xs text-slate-600">
                          {weeklyMatrixTotals.tapQty - 120 >= 0 ? '+' : ''}{weeklyMatrixTotals.tapQty - 120}
                        </td>
                        {/* Trụ 3: Gap */}
                        <td className="py-2 px-1.5 text-center font-mono border-r border-slate-200 text-2xs text-slate-600">
                          {weeklyMatrixTotals.selfQty - (planState.targetSelfChannelContents || 40) >= 0 ? '+' : ''}
                          {weeklyMatrixTotals.selfQty - (planState.targetSelfChannelContents || 40)}
                        </td>
                        <td className="py-2 px-1.5 text-right font-mono border-r border-slate-200 text-2xs text-slate-600">
                          {formatVndShort(weeklyMatrixTotals.selfBudget - (planState.budgetSelfChannel || 50000000))}
                        </td>
                        {/* Trụ 4: Gap */}
                        <td className="py-2 px-1.5 text-center font-mono border-r border-slate-200 text-2xs text-slate-600">
                          {weeklyMatrixTotals.multiQty - 15 >= 0 ? '+' : ''}{weeklyMatrixTotals.multiQty - 15}
                        </td>
                        <td className="py-2 px-1.5 text-right font-mono border-r border-slate-200 text-2xs text-slate-600">
                          {formatVndShort(weeklyMatrixTotals.multiBudget - 10000000)}
                        </td>
                        {/* Tổng Gap */}
                        <td className="py-2 px-1.5 text-center font-mono border-r border-slate-200 text-xs font-semibold text-blue-900 bg-slate-100">
                          {videoDelta >= 0 ? `+${videoDelta}` : videoDelta}
                        </td>
                        <td className={`py-2 px-1.5 text-right font-mono border-r border-slate-200 text-xs font-semibold bg-slate-100 ${
                          isBudgetSafe ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                          {budgetDelta > 0 ? `+${formatVndShort(budgetDelta)}` : formatVndShort(budgetDelta)}
                        </td>
                        <td colSpan={3} className="py-2 px-1.5 text-center">
                          <span className={`inline-block text-2xs px-1.5 py-0.5 rounded font-semibold ${
                            isBudgetSafe
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}>
                            {isBudgetSafe ? '✓ Trong trần' : ' Vượt trần'}
                          </span>
                        </td>
                      </tr>
                    );
                  })()}
                </tfoot>
              </table>
            </div>

            {/* Table Footer with Operational Controls */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>
                  Ma trận 5 tuần đang thể hiện <strong>{weeklyMatrixTotals.totalQty} video</strong> • Chi phí kế hoạch: <strong className="text-blue-900">{formatVndShort(weeklyMatrixTotals.totalBudget)}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetWeeklyMatrix}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Khôi phục chuẩn</span>
                </button>

                <button
                  onClick={handleSaveWeeklyMatrix}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu kế hoạch 5 tuần</span>
                </button>

                <button
                  onClick={handleSyncWeeklyMatrixToStore}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition"
                >
                  <SendHorizonal className="w-3.5 h-3.5" />
                  <span>Đồng bộ vào lịch tuần</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      </fieldset>

      {/* ========================================================================= */}
      {/* 6. TAB EXCEL PREVIEW (CLEAN SHEET 4.1.1 VERIFICATION)                     */}
      {/* ========================================================================= */}
      {activeTab === 'EXCEL_PREVIEW' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-surface text-ink">
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="text-sm font-semibold">Đối chiếu Sheet 4.1.1 Input Plan</h3>
                <p className="text-xs text-ink-2">Xem trước các cột chính của dòng xuất file trước khi gửi trưởng phòng duyệt</p>
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
              <thead className="sticky top-0 bg-slate-100 text-slate-800 z-10 text-2xs">
                <tr>
                  <th className="p-2.5 border border-slate-200">Tháng</th>
                  <th className="p-2.5 border border-slate-200">Store</th>
                  <th className="p-2.5 border border-slate-200">Tuần</th>
                  <th className="p-2.5 border border-slate-200 bg-blue-50 text-center">TikTok Aff (Qty)</th>
                  <th className="p-2.5 border border-slate-200 bg-blue-50 text-center">KL1</th>
                  <th className="p-2.5 border border-slate-200 bg-blue-50 text-center">KL2</th>
                  <th className="p-2.5 border border-slate-200 bg-blue-50 text-center">KL3</th>
                  <th className="p-2.5 border border-slate-200 bg-blue-50 text-center">KL4</th>
                  <th className="p-2.5 border border-slate-200 bg-blue-50 text-center">KL5</th>
                  <th className="p-2.5 border border-slate-200 bg-blue-50 text-center">KL6</th>
                  <th className="p-2.5 border border-slate-200 bg-blue-50 text-center">KL7</th>
                  <th className="p-2.5 border border-slate-200 bg-blue-50 text-right">Ngân sách TikTok</th>
                  <th className="p-2.5 border border-slate-200 bg-amber-50 text-center">Shopee Reup</th>
                  <th className="p-2.5 border border-slate-200 bg-amber-50 text-center">Shopee Aff</th>
                  <th className="p-2.5 border border-slate-200 bg-emerald-50 text-center">Self Voice</th>
                  <th className="p-2.5 border border-slate-200 bg-emerald-50 text-center">Self Tự động</th>
                  <th className="p-2.5 border border-slate-200 bg-slate-100 text-center">Live độc quyền</th>
                  <th className="p-2.5 border border-slate-200 bg-slate-100 text-center">Live Add-in</th>
                  <th className="p-2.5 border border-slate-200 bg-emerald-50 text-right">Target GMV</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white hover:bg-blue-50 text-slate-900 font-semibold">
                  <td className="p-2.5 border border-slate-200">{planState.month}</td>
                  <td className="p-2.5 border border-slate-200">{planState.brandName}</td>
                  <td className="p-2.5 border border-slate-200">{planState.week}</td>
                  <td className="p-2.5 border border-slate-200 text-center text-blue-700 font-semibold">
                    {planState.items.filter(it => it.channel === 'TIKTOK').reduce((s, it) => s + it.qty, 0)}
                  </td>
                  <td className="p-2.5 border border-slate-200 text-center">{planState.items.find(i => i.id === 'row-tt-kl1')?.qty || 0}</td>
                  <td className="p-2.5 border border-slate-200 text-center">{planState.items.find(i => i.id === 'row-tt-kl2')?.qty || 0}</td>
                  <td className="p-2.5 border border-slate-200 text-center">{planState.items.find(i => i.id === 'row-tt-kl3')?.qty || 0}</td>
                  <td className="p-2.5 border border-slate-200 text-center">{planState.items.find(i => i.id === 'row-tt-kl4')?.qty || 0}</td>
                  <td className="p-2.5 border border-slate-200 text-center">{planState.items.find(i => i.id === 'row-tt-kl5')?.qty || 0}</td>
                  <td className="p-2.5 border border-slate-200 text-center">{planState.items.find(i => i.id === 'row-tt-kl6')?.qty || 0}</td>
                  <td className="p-2.5 border border-slate-200 text-center">{planState.items.find(i => i.id === 'row-tt-kl7')?.qty || 0}</td>
                  <td className="p-2.5 border border-slate-200 text-right text-blue-700 font-semibold">
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
      <Presence show={!!isAllocationModalOpen}>
      {isAllocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-white w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-surface text-ink">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold">Phân bổ kế hoạch cho Team booking</h3>
                    <span className="text-2xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
                      Trưởng nhóm: {planState.bookingLeader || (planState.hasBookingLeader ? 'Nguyễn Thị Ngọc Tâm (Trưởng nhóm Booking)' : 'Không có leader (Duyệt thẳng Trưởng phòng)')}
                    </span>
                    <span className="text-2xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-semibold">
                      PIC chính: {planState.primaryPic || planState.pic}
                    </span>
                  </div>
                  <p className="text-xs text-ink-2 mt-0.5">
                    Thương hiệu: <strong className="text-ink">{planState.brandName.split('_')[0]}</strong> • {planState.month} - {planState.week} • Tổng {totalAllocatedContents} video ({formatVndShort(totalAllocatedBudget)})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAllocationModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition"
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
                      Cân bằng tải khối lượng công việc Team ({staffAllocationSummary.filter(s => s.videoCount > 0).length} nhân sự tham gia)
                    </h4>
                    <p className="text-2xs text-slate-400 mt-0.5">
                      Bạn PIC chủ trì có trách nhiệm điều phối chỉ tiêu video và ngân sách phù hợp năng lực của từng bạn
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAutoAssignByExpertise}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1.5 transition shadow-2xs"
                    >
                      <Zap className="w-3.5 h-3.5 text-blue-600" />
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
                          <span className="font-semibold font-mono text-sm text-blue-700">
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
                            className={`data-bar h-full rounded-full ${
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
                      Tất cả ({planState.items.length})
                    </button>
                    <button
                      onClick={() => setAllocationFilterChannel('TIKTOK')}
                      className={`px-2.5 py-1 rounded text-2xs font-semibold transition ${
                        allocationFilterChannel === 'TIKTOK' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      TikTok
                    </button>
                    <button
                      onClick={() => setAllocationFilterChannel('SHOPEE')}
                      className={`px-2.5 py-1 rounded text-2xs font-semibold transition ${
                        allocationFilterChannel === 'SHOPEE' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Đa sàn
                    </button>
                    <button
                      onClick={() => setAllocationFilterChannel('SELF_CHANNEL')}
                      className={`px-2.5 py-1 rounded text-2xs font-semibold transition ${
                        allocationFilterChannel === 'SELF_CHANNEL' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Kênh tự xây
                    </button>
                    <button
                      onClick={() => setAllocationFilterChannel('LIVESTREAM')}
                      className={`px-2.5 py-1 rounded text-2xs font-semibold transition ${
                        allocationFilterChannel === 'LIVESTREAM' ? 'bg-white text-slate-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
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
                          <th className="py-2.5 px-3 w-28 text-right">Ngân sách</th>
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
                  <Send className="w-3.5 h-3.5" />
                  <span>Xác nhận & giao việc cho Team</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </Presence>

      {/* ========================================================================= */}
      {/* MODAL LEADER SƠ DUYỆT NỘI BỘ (INTERNAL LEADER APPROVAL GATE)              */}
      {/* ========================================================================= */}
      <Presence show={!!isLeaderApprovalModalOpen}>
      {isLeaderApprovalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="px-6 py-4 border-b border-line bg-surface text-ink flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="text-sm font-semibold">Trưởng nhóm sơ duyệt kế hoạch nội bộ</h3>
                  <p className="text-2xs text-ink-2">Kiểm tra định mức thù lao, tỷ trọng kênh và tính khả thi trước khi gửi Growth</p>
                </div>
              </div>
              <button
                onClick={() => setIsLeaderApprovalModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Gian hàng:</span>
                  <strong className="text-slate-900">{planState.brandName}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Trưởng nhóm:</span>
                  <strong className="text-amber-700">{planState.bookingLeader || (planState.hasBookingLeader ? 'Nguyễn Thị Ngọc Tâm' : 'Không có leader')}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Chuyên viên lập plan:</span>
                  <strong className="text-blue-700">{planState.primaryPic || planState.pic}</strong>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Tổng quy mô:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {totalAllocatedContents} video • {formatVndShort(totalAllocatedBudget)}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">Quyết định sơ duyệt của Leader</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLeaderApprovalDecision('APPROVE')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      leaderApprovalDecision === 'APPROVE'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-500/20'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Thông qua nội bộ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaderApprovalDecision('REJECT')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      leaderApprovalDecision === 'REJECT'
                        ? 'bg-rose-50 text-rose-800 border-rose-300 ring-2 ring-rose-500/20'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <RotateCcw className="w-4 h-4 text-rose-600" />
                    <span>Yêu cầu sửa đổi</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Ý kiến chỉ đạo nghiệp vụ của Trưởng nhóm
                </label>
                <textarea
                  rows={3}
                  value={leaderReviewNote}
                  onChange={(e) => setLeaderReviewNote(e.target.value)}
                  placeholder={
                    leaderApprovalDecision === 'APPROVE'
                      ? 'Ví dụ: Đã kiểm tra cơ cấu định mức thù lao KL1-KL7, tỷ trọng kênh và tính khả thi. Đồng ý chuyển Growth thẩm định.'
                      : 'Ví dụ: Cần giảm bớt 2 video KL5 để tăng số lượng Micro KOC KL2-KL3 nhằm đảm bảo phủ rộng dịp Mega sale.'
                  }
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsLeaderApprovalModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs transition"
              >
                Hủy
              </button>
              <button
                onClick={handleLeaderApprovalAction}
                className={`px-4 py-1.5 rounded-lg font-semibold text-xs text-white shadow-xs transition ${
                  leaderApprovalDecision === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {leaderApprovalDecision === 'APPROVE' ? 'Xác Nhận Sơ Duyệt' : 'Gửi Yêu Cầu Sửa'}
              </button>
            </div>
          </div>
        </div>
      )}
      </Presence>

      {/* MODAL: XÁC NHẬN GỬI DUYỆT QUẢN LÝ */}
      <Presence show={!!isSubmitToManagerModalOpen}>
      {isSubmitToManagerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-semibold">
                  <SendHorizonal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-slate-900">Gửi Kế Hoạch Lên Quản Lý Duyệt</h3>
                  <p className="text-2xs text-slate-500">Trình duyệt kế hoạch phân rã chu kỳ {planState.month}</p>
                </div>
              </div>
              <button
                onClick={() => setIsSubmitToManagerModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tóm tắt chỉ số kế hoạch */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Gian hàng / Brand:</span>
                <strong className="text-slate-900 font-semibold">{planState.brandName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Chu kỳ áp dụng:</span>
                <span className="font-semibold text-slate-800">{planState.month} ({planState.week})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ngân sách trần phân rã:</span>
                <strong className="text-blue-600 font-semibold">{formatVndShort(planState.totalTargetBudget)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số lượng nội dung / KOC:</span>
                <span className="font-semibold text-slate-800">{planState.totalTargetContents} nội dung</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Doanh thu GMV mục tiêu:</span>
                <strong className="text-emerald-600 font-semibold">{formatVndShort(planState.targetGmv)}</strong>
              </div>
            </div>

            {/* Xác nhận trao đổi với Growth */}
            <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-200 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={growthAlignedConfirm}
                  onChange={(e) => setGrowthAlignedConfirm(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs text-blue-950 font-medium leading-relaxed">
                  Tôi xác nhận <strong>ĐÃ TRAO ĐỔI VÀ THỐNG NHẤT</strong> các chỉ số mục tiêu (ngân sách, GMV, số lượng KOC) với Growth Lead <strong>({planState.growthPic || 'Growth Team'})</strong>.
                </span>
              </label>
            </div>

            {/* Ghi chú trình duyệt */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Ghi chú trình Quản lý phê duyệt:
              </label>
              <textarea
                rows={3}
                value={submissionNote}
                onChange={(e) => setSubmissionNote(e.target.value)}
                placeholder="Nhập ghi chú hoặc căn cứ chốt số với Growth..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsSubmitToManagerModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={!growthAlignedConfirm}
                onClick={handleSubmitPlanToManager}
                className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-semibold text-xs text-white shadow-md transition-all ${
                  growthAlignedConfirm
                    ? 'bg-blue-600 hover:bg-blue-700 active:scale-95 cursor-pointer'
                    : 'bg-slate-300 cursor-not-allowed'
                }`}
              >
                <SendHorizonal className="w-4 h-4" />
                <span>Xác Nhận & Gửi Duyệt Quản Lý</span>
              </button>
            </div>
          </div>
        </div>
      )}
      </Presence>

      {/* Dialog xác nhận duyệt kế hoạch */}
      <ConfirmDialog
        open={showApproveConfirm}
        title="Xác nhận phê duyệt kế hoạch tháng"
        message={`Bạn có chắc chắn muốn phê duyệt kế hoạch "${planState.title}" với tổng ngân sách ${formatVndShort(planState.totalTargetBudget)}? Kế hoạch sẽ được mở khóa chuyển giao sang khâu Booking để tuyển chọn KOC và ký hợp đồng.`}
        confirmLabel="Phê duyệt kế hoạch"
        onConfirm={() => {
          const log = `Quản lý (${currentUser?.name || 'Manager'}) đã PHÊ DUYỆT CHÍNH THỨC kế hoạch.`;
          handleStatusChangeForPlan(planState.id, 'LEAD_APPROVED', log);
          setPlanState(prev => ({ ...prev, status: 'LEAD_APPROVED' }));
          setShowApproveConfirm(false);
          notify(`Đã phê duyệt kế hoạch thành công!`);
        }}
        onCancel={() => setShowApproveConfirm(false)}
      />

      {/* Dialog yêu cầu chỉnh sửa kế hoạch (bắt buộc nhập lý do) */}
      <ConfirmDialog
        open={showRejectConfirm}
        title="Yêu cầu chỉnh sửa kế hoạch"
        message={`Vui lòng nhập nội dung chỉ đạo hoặc lý do yêu cầu chuyên viên (${planState.pic}) chỉnh sửa kế hoạch:`}
        confirmLabel="Gửi yêu cầu chỉnh sửa"
        tone="danger"
        reason={{
          label: "Nội dung yêu cầu chỉnh sửa",
          placeholder: "Ví dụ: Giảm tỷ trọng kênh Shopee Video, tăng số lượng KOC Micro, điều chỉnh ngân sách...",
          required: true
        }}
        onConfirm={(reason) => {
          const log = `Quản lý (${currentUser?.name || 'Manager'}) YÊU CẦU CHỈNH SỬA: "${reason}"`;
          handleStatusChangeForPlan(planState.id, 'REVISION_REQUESTED', log, reason);
          setPlanState(prev => ({ ...prev, status: 'REVISION_REQUESTED' }));
          setShowRejectConfirm(false);
          notify(`Đã gửi yêu cầu chỉnh sửa cho nhân viên!`);
        }}
        onCancel={() => setShowRejectConfirm(false)}
      />

      {/* Modal quản lý & so sánh các phiên bản kế hoạch trong tháng */}
      <PlanHistoryModal
        plan={planState}
        isOpen={isVersionHistoryModalOpen}
        initialTab="VERSION_HISTORY"
        currentUser={currentUser}
        onClose={() => setIsVersionHistoryModalOpen(false)}
        onSendMessage={(planId, msg) => {
          handleSendMessageToPlan(planId, msg);
        }}
        onStatusChange={(planId, newStatus, log, note) => {
          handleStatusChangeForPlan(planId, newStatus, log, note);
        }}
        onUpdatePlan={(updated) => {
          setPlanState(prev => ({ ...prev, ...updated }));
          setMonthlyPlans(prev => prev.map(p => (p.id === planState.id ? { ...p, ...updated } : p)));
        }}
        onOpenPlanInStudio={(updatedPlan) => {
          setPlanState(updatedPlan);
          setMonthlyPlans(prev => prev.map(p => (p.id === updatedPlan.id ? updatedPlan : p)));
          setIsVersionHistoryModalOpen(false);
        }}
        onNotify={notify}
      />

      {/* Khung trao đổi 4 bên (trượt từ bên phải, không chiếm chỗ bảng phân rã) */}
      <PlanChatDrawer
        open={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        plan={planState}
        currentUser={currentUser}
        chat={planChat}
      />
    </div>
  );
};
