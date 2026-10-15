'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { formatVndShort } from '../../lib/format';
import {
  Layers,
  Download,
  Save,
  RotateCcw,
  CheckCircle2,
  Send,
  Plus,
  Minus,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Zap,
  Sliders,
  LayoutGrid,
  Table as TableIcon,
  ShieldCheck,
  Users,
  UserCheck,
  X,
  ChevronLeft,
  MessageSquare,
  SendHorizonal,
  Lock,
  Unlock,
  FileText
} from 'lucide-react';
import { OperationalReportDrawer } from '../OperationalReportDrawer';
import { CampaignCreateModal } from '../CampaignCreateModal';
import { INITIAL_CAMPAIGNS } from '../../lib/mockData';
import { 
  InputPlanBreakdownState, 
  InputPlanRowItem, 
  InputPlanChannelType,
  CorePlanMetricsLayer1,
  UserProfile, 
  StaffDetailedPlanItem,
  SalaryGrade,
  WeeklyStorePlan411,
  PlanDiscussionMessage,
  PlanDiscussionRole,
  MonthlyPlanStatus,
  StorePortfolioItem,
  PlanVersionSnapshot,
  CampaignItem,
  isCampaignActiveInMonth,
  getCampaignPhaseForMonth
} from '../../lib/types';
import { 
  BENCHMARK_COSTS, 
  CONTENT_FORMAT_OPTIONS, 
  autoBalancePlanItems,
} from '../../lib/inputPlanDefaults';
import { exportInputPlanStudioToExcel, exportBrandMonthlyOneSheetToExcel } from '../../lib/excelExport';
import { buildBrandOneSheetPlanData } from '../../lib/oneSheetPlanBuilder';
import { BrandOneSheetPlanView } from './BrandOneSheetPlanView';
import { MonthlyPlanHub } from './MonthlyPlanHub';
import {
  INITIAL_MONTHLY_PLANS,
  getPlanVersionSnapshots,
  enrichPlanWithVersions,
} from '../../lib/monthlyPlanData';
import { useMonthlyPlanSync } from '../../lib/useMonthlyPlanSync';
import { PlanApprovalStepper } from './PlanApprovalStepper';
import { PlanHistoryModal } from './PlanHistoryModal';
import { PlanChatDrawer, PlanChatButton } from './PlanChatDrawer';
import { usePlanChat } from '../../lib/usePlanChat';
import { PlanSyncBadge } from './PlanSyncBadge';
import {
  ConfirmDialog,
  Presence,
  Status,
} from '../ui';
import { StorePlanMindmap } from './StorePlanMindmap';

const PIC_OPTIONS = [
  'Lê Phương Thảo',
  'Lương Thị Như Quỳnh',
  'Lê Thanh Hải',
  'Phạm Thị Thu Hằng',
  'Hoàng Hải Long',
  'Trần Hải Phượng',
  'Phan Diệu Ánh',
  'Vũ Hoài Lâm',
  'Nguyễn Thị Mai Anh',
  'Quỳnh Như',
  'Trần Thị Hảo',
  'Đặng Mai Hà Linh',
  'Khánh Vy',
  'Nguyễn Thu Trang',
  'Lê Hoàng Yến',
  'Trần Minh Đức'
];

const TEAM_MEMBERS_INFO: Record<string, { role: string; avatar: string; expertise: string }> = {
  'Lê Phương Thảo': { role: 'Chuyên viên Booking B2C', avatar: 'PT', expertise: 'KOC Affiliate trả phí (KL1–KL6)' },
  'Lương Thị Như Quỳnh': { role: 'Chuyên viên Booking B2C', avatar: 'NQ', expertise: 'KOC Affiliate & Key Creator (KL2–KL6)' },
  'Lê Thanh Hải': { role: 'Chuyên viên Booking B2C', avatar: 'TH', expertise: 'KOC Affiliate & Mega Campaign' },
  'Phạm Thị Thu Hằng': { role: 'Chuyên viên Booking B2C', avatar: 'TH', expertise: 'Affiliate TAP, FOC & Review voice' },
  'Hoàng Hải Long': { role: 'Chuyên viên Booking B2C', avatar: 'HL', expertise: 'KOC Affiliate & Micro/Macro (KL1–KL5)' },
  'Trần Hải Phượng': { role: 'Chuyên viên Booking B2C', avatar: 'HP', expertise: 'KOC Affiliate & Gian hàng mới' },
  'Phan Diệu Ánh': { role: 'Chuyên viên Booking & Content', avatar: 'DÁ', expertise: 'KOC Mới, Self-Channel & Reup Sàn' },
  'Vũ Hoài Lâm': { role: 'Chuyên viên Booking & Content', avatar: 'HL', expertise: 'Video Self-Channel & KOC Affiliate' },
  'Nguyễn Thị Mai Anh': { role: 'Chuyên viên Content Self-Channel', avatar: 'MA', expertise: 'Kịch bản & Sản xuất Video Kênh Brand (Team Việt Hoàng)' },
  'Quỳnh Như': { role: 'Chuyên viên Content Self-Channel', avatar: 'QN', expertise: 'Sản xuất Video Self-Channel & CTV (Team Việt Hoàng)' },
  'Trần Thị Hảo': { role: 'Chuyên viên Gửi mẫu FOC', avatar: 'TH', expertise: 'Điều phối gửi mẫu miễn phí 0đ Cast (FOC)' },
  'Đặng Mai Hà Linh': { role: 'Brand PIC / Senior Specialist', avatar: 'HL', expertise: 'Chiến lược, Celeb & Macro (KL5-KL7)' },
  'Khánh Vy': { role: 'Senior Booking Specialist', avatar: 'KV', expertise: 'Key Creator & Mid-Macro (KL3-KL5)' },
  'Nguyễn Thu Trang': { role: 'Booking Specialist', avatar: 'TT', expertise: 'Micro KOC & Shopee Affiliate' },
  'Trần Minh Đức': { role: 'Live & Creator Specialist', avatar: 'MĐ', expertise: 'Livestream Độc quyền & Co-host' },
  'Lê Hoàng Yến': { role: 'Multi-platform Specialist', avatar: 'HY', expertise: 'Facebook, Instagram & Shopee Video' }
};

interface InputPlanBreakdownViewProps {
  currentUser?: UserProfile;
  storePortfolios?: StorePortfolioItem[];
  onUpdateStore?: (store: StorePortfolioItem) => void;
  campaigns?: CampaignItem[];
  onCampaignsChange?: React.Dispatch<React.SetStateAction<CampaignItem[]>>;
  onNotify?: (msg: string) => void;
  onGenerateDealsFromPlan?: (slots: StaffDetailedPlanItem[]) => void;
  onApplyPlanToWeeklyStore?: (planData: WeeklyStorePlan411) => void;
  onOpenListingForPlan?: (plan: InputPlanBreakdownState, salaryGrade?: SalaryGrade) => void;
  onPlansChange?: (plans: InputPlanBreakdownState[]) => void;
  initialShowStudio?: boolean;
  planDrilldownIntent?: {
    planId?: string;
    storeId?: string;
    storeName?: string;
    brandName?: string;
    month?: string;
    nonce: number;
  } | null;
}

export const InputPlanBreakdownView: React.FC<InputPlanBreakdownViewProps> = ({
  currentUser,
  storePortfolios,
  onUpdateStore,
  campaigns: externalCampaigns,
  onCampaignsChange,
  onNotify,
  onGenerateDealsFromPlan,
  onApplyPlanToWeeklyStore,
  onOpenListingForPlan,
  onPlansChange,
  initialShowStudio = false,
  planDrilldownIntent,
}) => {
  const [localCampaigns, setLocalCampaigns] = useState<CampaignItem[]>(INITIAL_CAMPAIGNS);
  const effectiveCampaigns = externalCampaigns ?? localCampaigns;
  const updateCampaigns: React.Dispatch<React.SetStateAction<CampaignItem[]>> = onCampaignsChange ?? setLocalCampaigns;
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState<boolean>(false);
  const [editingCampaignForModal, setEditingCampaignForModal] = useState<CampaignItem | null>(null);

  // Master Monthly Plans State
  const [monthlyPlans, setMonthlyPlans] = useState<InputPlanBreakdownState[]>(INITIAL_MONTHLY_PLANS);
  // View mode: false = Màn hình Quản Lý Kế Hoạch Theo Tháng (MonthlyPlanHub), true = Studio Chi tiết Phân Rã
  const [isShowingStudio, setIsShowingStudio] = useState<boolean>(initialShowStudio);

  // Main Plan State (default from Fresh balanced scenario or active plan)
  const [planState, setPlanState] = useState<InputPlanBreakdownState>(INITIAL_MONTHLY_PLANS[0]);

  // Khi người dùng drill-down từ Hồ sơ Gian hàng hoặc Hồ sơ Thương hiệu sang Kế hoạch tháng
  const [handledDrilldownNonce, setHandledDrilldownNonce] = useState<number>(0);
  if (planDrilldownIntent && planDrilldownIntent.nonce !== handledDrilldownNonce) {
    setHandledDrilldownNonce(planDrilldownIntent.nonce);
    const { planId, storeId, storeName, brandName, month } = planDrilldownIntent;
    const storeNorm = (storeName || '').trim().toLowerCase();
    const brandNorm = (brandName || '').trim().toLowerCase();
    const matched =
      (planId ? monthlyPlans.find(p => p.id === planId) : undefined) ||
      (storeId ? monthlyPlans.find(p => p.storeId === storeId && (!month || p.month === month)) : undefined) ||
      (storeNorm
        ? monthlyPlans.find(
            p =>
              p.brandName.trim().toLowerCase() === storeNorm &&
              (!month || p.month === month),
          )
        : undefined) ||
      (storeNorm
        ? monthlyPlans.find(p => p.brandName.trim().toLowerCase() === storeNorm)
        : undefined) ||
      (brandNorm
        ? monthlyPlans.find(p => {
            const pBrand = (p.parentBrand || p.brandName.split('_')[0] || '').trim().toLowerCase();
            return pBrand === brandNorm || p.brandName.trim().toLowerCase().startsWith(`${brandNorm}_`);
          })
        : undefined);
    if (matched) {
      setPlanState(matched);
      setIsShowingStudio(true);
    }
  }

  useEffect(() => {
    if (!onPlansChange) return;
    const merged = monthlyPlans.map(p => (p.id === planState.id ? planState : p));
    onPlansChange(merged);
  }, [monthlyPlans, planState, onPlansChange]);

  // Simulation Role: Booking PIC vs Growth PIC vs Trưởng Phòng
  const [currentRole, setCurrentRole] = useState<PlanDiscussionRole>('BOOKING');
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Đồng bộ vai trò thao tác theo tài khoản đang đăng nhập
  const [prevUserRole, setPrevUserRole] = useState<string | undefined>(undefined);
  if (currentUser?.role !== prevUserRole) {
    setPrevUserRole(currentUser?.role);
    if (currentUser) {
      if (currentUser.role === 'GROWTH_MEMBER' || currentUser.role === 'GROWTH_MANAGER') {
        setCurrentRole('GROWTH');
      } else if (currentUser.role === 'MEDIA_MEMBER' || currentUser.role === 'MEDIA_MANAGER') {
        setCurrentRole('MEDIA');
      } else if (['ADMIN', 'MANAGER'].includes(currentUser.role)) {
        setCurrentRole('LEAD');
      } else if (currentUser.role === 'BOOKING_MEMBER' || currentUser.role === 'LEADER') {
        setCurrentRole('BOOKING');
      }
    }
  }

  // Active Section / Channel Sub-Tab: Tách riêng Tổng quan (OVERVIEW) và Chi tiết phân rã
  const [activeTab, setActiveTab] = useState<
    | 'OVERVIEW'
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
    | 'BRAND_ONE_SHEET'
  >('OVERVIEW');

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

  const handleUpdateWeeklyMatrixCell = (index: number, field: string, value: number | string) => {
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
  const [isVersionHistoryModalOpen, setIsVersionHistoryModalOpen] = useState(false);
  const [isPlanReportOpen, setIsPlanReportOpen] = useState(false);

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
            coreMetricsLayer1: planState.coreMetricsLayer1,
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

    const restoredLayer1: CorePlanMetricsLayer1 | undefined = snap.coreMetricsLayer1
      ? { ...snap.coreMetricsLayer1 }
      : planState.coreMetricsLayer1
      ? {
          ...planState.coreMetricsLayer1,
          isLocked: snap.versionCode === 'v1.0',
          pnlTotalBudgetNet: snap.totalTargetBudget,
          targetNmvTotal: snap.targetGmv,
          budgetAdsNet: snap.budgetAdsTotal ?? planState.budgetAdsTotal ?? 0,
          budgetAffiliateNet: snap.budgetAffiliate ?? Math.round(snap.totalTargetBudget * 0.65),
          budgetSelfChannelNet: snap.budgetSelfChannel ?? Math.round(snap.totalTargetBudget * 0.20),
        }
      : undefined;

    const nextPlanState: InputPlanBreakdownState = {
      ...planState,
      currentVersionCode: snap.versionCode,
      totalTargetBudget: snap.totalTargetBudget,
      budgetAdsTotal: snap.budgetAdsTotal ?? planState.budgetAdsTotal,
      budgetAffiliate: snap.budgetAffiliate ?? planState.budgetAffiliate,
      budgetSelfChannel: snap.budgetSelfChannel ?? planState.budgetSelfChannel,
      totalTargetContents: snap.totalTargetContents,
      targetGmv: snap.targetGmv,
      coreMetricsLayer1: restoredLayer1,
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
  // Chế độ Focus riêng kế hoạch của 1 nhân sự trong gian hàng (khi 2-3 người cùng làm chung 1 gian hàng)
  const [focusedStaffFilter, setFocusedStaffFilter] = useState<string>('ALL');

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

  // Content Headroom & Status
  const contentHeadroom = planState.totalTargetContents - totalAllocatedContents;

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

  // Hệ số quy đổi Net -> Gross chuẩn kế toán B2C: VAT 8% * TNCN 10% = 1.188 (Net/Gross = 0.8418)
  const GROSS_MULTIPLIER = 1.188;

  // LAYER 1: Khung Chỉ Số Cốt Lõi (Các bên cùng điền, chỉnh sửa & bấm Chốt trước khi sang Layer 2)
  const layer1Metrics: CorePlanMetricsLayer1 = useMemo(() => {
    const raw = planState.coreMetricsLayer1;
    const defaultAffBudget = planState.budgetAffiliate ?? (channelTotals.affiliatePaid.budget || Math.round(planState.totalTargetBudget * 0.65));
    const defaultSelfBudget = planState.budgetSelfChannel ?? (channelTotals.selfChannel.budget || Math.round(planState.totalTargetBudget * 0.20));
    const defaultMultiBudget = channelTotals.multiPlatform.budget || Math.max(0, planState.totalTargetBudget - defaultAffBudget - defaultSelfBudget - (planState.budgetAdsTotal || 0));
    const defaultLiveBudget = channelTotals.livestream.budget || 0;

    return {
      isLocked: raw?.isLocked ?? Boolean(planState.status && !['DRAFT', 'REVISION_REQUESTED'].includes(planState.status)),
      lockedBy: raw?.lockedBy,
      lockedAt: raw?.lockedAt,
      alignmentNote: raw?.alignmentNote ?? (planState.growthAlignmentNotes || ''),
      targetNmvTotal: raw?.targetNmvTotal ?? (planState.targetGmv || 0),
      targetGmvAffiliate: raw?.targetGmvAffiliate ?? Math.round((planState.targetGmv || 0) * 0.72),
      targetGmvSelfChannel: raw?.targetGmvSelfChannel ?? Math.round((planState.targetGmv || 0) * 0.18),
      targetGmvLivestream: raw?.targetGmvLivestream ?? Math.round((planState.targetGmv || 0) * 0.10),
      pnlTotalBudgetNet: raw?.pnlTotalBudgetNet ?? (planState.totalTargetBudget || 0),
      budgetAffiliateNet: raw?.budgetAffiliateNet ?? defaultAffBudget,
      budgetSelfChannelNet: raw?.budgetSelfChannelNet ?? defaultSelfBudget,
      budgetMultiPlatformNet: raw?.budgetMultiPlatformNet ?? defaultMultiBudget,
      budgetLivestreamNet: raw?.budgetLivestreamNet ?? defaultLiveBudget,
      budgetAdsNet: raw?.budgetAdsNet ?? (planState.budgetAdsTotal || 0),
      targetAdsRoas: raw?.targetAdsRoas ?? (planState.multiPartySignOff?.media?.targetRoas || 4.5),
      qtyAffiliatePaid: raw?.qtyAffiliatePaid ?? channelTotals.affiliatePaid.qty,
      qtyFocSample: raw?.qtyFocSample ?? channelTotals.tapFreecast.qty,
      qtySelfChannel: raw?.qtySelfChannel ?? channelTotals.selfChannel.qty,
      qtyMultiPlatform: raw?.qtyMultiPlatform ?? channelTotals.multiPlatform.qty,
      qtyLivestreamSessions: raw?.qtyLivestreamSessions ?? (channelTotals.livestream.qty || 4),
    };
  }, [planState, channelTotals]);

  const isLayer1Locked = Boolean(isPlanLocked || layer1Metrics.isLocked);
  const totalLayer1ChannelBudgetNet =
    layer1Metrics.budgetAffiliateNet +
    layer1Metrics.budgetSelfChannelNet +
    layer1Metrics.budgetMultiPlatformNet +
    layer1Metrics.budgetLivestreamNet +
    layer1Metrics.budgetAdsNet;
  const totalLayer1Videos =
    layer1Metrics.qtyAffiliatePaid +
    layer1Metrics.qtyFocSample +
    layer1Metrics.qtySelfChannel +
    layer1Metrics.qtyMultiPlatform;
  const layer1BudgetGapVsPnl = layer1Metrics.pnlTotalBudgetNet - totalLayer1ChannelBudgetNet;

  // Cập nhật các chỉ số trên Layer 1
  const handleUpdateLayer1Metrics = (patch: Partial<CorePlanMetricsLayer1>) => {
    setPlanState(prev => {
      const nextLayer1: CorePlanMetricsLayer1 = {
        ...layer1Metrics,
        ...(prev.coreMetricsLayer1 || {}),
        ...patch,
      };
      const nextTotalContents =
        nextLayer1.qtyAffiliatePaid +
        nextLayer1.qtyFocSample +
        nextLayer1.qtySelfChannel +
        nextLayer1.qtyMultiPlatform;
      return {
        ...prev,
        coreMetricsLayer1: nextLayer1,
        totalTargetBudget: nextLayer1.pnlTotalBudgetNet,
        targetGmv: nextLayer1.targetNmvTotal,
        budgetAdsTotal: nextLayer1.budgetAdsNet,
        budgetAffiliate: nextLayer1.budgetAffiliateNet,
        budgetSelfChannel: nextLayer1.budgetSelfChannelNet,
        totalTargetContents: nextTotalContents > 0 ? nextTotalContents : prev.totalTargetContents,
        targetAffiliateContents: nextLayer1.qtyAffiliatePaid + nextLayer1.qtyFocSample,
        targetSelfChannelContents: nextLayer1.qtySelfChannel,
        growthAlignmentNotes: nextLayer1.alignmentNote,
      };
    });
  };

  // Đồng bộ khung chỉ số cốt lõi từ Layer 1 xuống bảng phân rã chi tiết ở Layer 2
  const applyLayer1FrameToLayer2Items = (l1: CorePlanMetricsLayer1, currentItems: InputPlanRowItem[]): InputPlanRowItem[] => {
    const nextItems = currentItems.map(it => ({ ...it }));

    // 1. Cập nhật FOC (Mẫu 0đ)
    const focRows = nextItems.filter(it => it.tierCode.includes('TAP') || it.id === 'row-tt-tap');
    if (focRows.length > 0) {
      focRows[0].qty = Math.max(0, l1.qtyFocSample);
      focRows[0].unitCost = 0;
      focRows[0].totalBudget = 0;
      for (let i = 1; i < focRows.length; i++) {
        focRows[i].qty = 0;
        focRows[i].totalBudget = 0;
      }
    }

    // Helper phân bổ số lượng & ngân sách cho nhóm dòng
    const scaleGroupRows = (rows: InputPlanRowItem[], targetQty: number, targetBudget: number) => {
      if (rows.length === 0) return;
      if (targetQty <= 0) {
        rows.forEach(r => {
          r.qty = 0;
          r.totalBudget = 0;
          r.targetGmv = 0;
        });
        return;
      }
      const curQtySum = rows.reduce((s, r) => s + r.qty, 0);
      let remQty = targetQty;
      rows.forEach((r, idx) => {
        if (idx === rows.length - 1) {
          r.qty = Math.max(0, remQty);
        } else {
          const share = curQtySum > 0 ? r.qty / curQtySum : 1 / rows.length;
          const q = Math.min(remQty, Math.max(0, Math.round(targetQty * share)));
          r.qty = q;
          remQty -= q;
        }
        r.totalBudget = r.qty * r.unitCost;
        r.targetGmv = r.totalBudget * (r.expectedRoiMultiplier || 1);
      });

      // Điều chỉnh chênh lệch ngân sách vào dòng có số lượng > 0 lớn nhất
      const curBudSum = rows.reduce((s, r) => s + r.totalBudget, 0);
      if (targetBudget > 0 && curBudSum !== targetBudget) {
        const activeRows = rows.filter(r => r.qty > 0);
        if (activeRows.length > 0) {
          const ratio = curBudSum > 0 ? targetBudget / curBudSum : 1;
          let remBud = targetBudget;
          activeRows.forEach((r, idx) => {
            if (idx === activeRows.length - 1) {
              r.totalBudget = Math.max(0, remBud);
              r.unitCost = r.qty > 0 ? Math.round(r.totalBudget / r.qty) : r.unitCost;
            } else {
              const newUnit = Math.max(50000, Math.round((r.unitCost * ratio) / 10000) * 10000);
              r.unitCost = newUnit;
              r.totalBudget = r.qty * newUnit;
              remBud -= r.totalBudget;
            }
            r.targetGmv = r.totalBudget * (r.expectedRoiMultiplier || 1);
          });
        }
      }
    };

    // 2. Cập nhật Affiliate Paid (KL1 - KL7)
    const affPaidRows = nextItems.filter(it => it.channel === 'TIKTOK' && !it.tierCode.includes('TAP') && it.id !== 'row-tt-tap');
    scaleGroupRows(affPaidRows, l1.qtyAffiliatePaid, l1.budgetAffiliateNet);

    // 3. Cập nhật Self-Channel (Kênh Brand)
    const selfRows = nextItems.filter(it => it.channel === 'SELF_CHANNEL');
    scaleGroupRows(selfRows, l1.qtySelfChannel, l1.budgetSelfChannelNet);

    // 4. Cập nhật Đa sàn khác
    const multiRows = nextItems.filter(it => ['SHOPEE', 'FACEBOOK', 'INSTAGRAM', 'THREADS'].includes(it.channel));
    scaleGroupRows(multiRows, l1.qtyMultiPlatform, l1.budgetMultiPlatformNet);

    return nextItems;
  };

  const handleSyncLayer1ToLayer2 = () => {
    setPlanState(prev => ({
      ...prev,
      items: applyLayer1FrameToLayer2Items(layer1Metrics, prev.items),
    }));
    notify('Đã đồng bộ Chỉ tiêu tháng sang bảng phân bổ chi tiết!');
  };

  // Chốt Chỉ tiêu tháng -> Chuyển sang Phân bổ chi tiết
  const handleLockLayer1AndProceed = (syncToLayer2: boolean = true) => {
    const actor = currentUser?.name || planState.growthPic || planState.pic || 'Nhóm Kế Hoạch';
    const now = new Date().toISOString();
    const lockedLayer1: CorePlanMetricsLayer1 = {
      ...layer1Metrics,
      isLocked: true,
      lockedBy: actor,
      lockedAt: now,
    };

    const logMsg: PlanDiscussionMessage = {
      id: `DISC-${Date.now()}`,
      authorName: actor,
      authorRole: currentRole,
      authorTitle: currentRole === 'GROWTH' ? 'Growth PIC' : currentRole === 'LEAD' ? 'Quản lý B2C' : 'Booking PIC',
      content: `Đã thống nhất và CHỐT CHỈ TIÊU THÁNG trên phiên bản ${planState.currentVersionCode || 'v1.0'}:\n• Tổng PnL Net: ${formatVndShort(lockedLayer1.pnlTotalBudgetNet)} | Target NMV: ${formatVndShort(lockedLayer1.targetNmvTotal)}\n• KOC trả phí: ${lockedLayer1.qtyAffiliatePaid} video (${formatVndShort(lockedLayer1.budgetAffiliateNet)}) | Mẫu FOC 0đ: ${lockedLayer1.qtyFocSample} suất\n• Kênh Brand: ${lockedLayer1.qtySelfChannel} video (${formatVndShort(lockedLayer1.budgetSelfChannelNet)}) | Đa sàn: ${lockedLayer1.qtyMultiPlatform} video (${formatVndShort(lockedLayer1.budgetMultiPlatformNet)})\n→ Chuyển sang phân bổ chi tiết KL1–KL7 & Lịch tuần.`,
      type: 'STATUS_CHANGE',
      timestamp: now,
      tags: ['Chốt chỉ tiêu', planState.currentVersionCode || 'v1.0'],
    };

    setPlanState(prev => {
      const nextItems = syncToLayer2 ? applyLayer1FrameToLayer2Items(lockedLayer1, prev.items) : prev.items;
      const updated: InputPlanBreakdownState = {
        ...prev,
        coreMetricsLayer1: lockedLayer1,
        growthAlignmentStatus: 'ĐÃ_THỐNG_NHẤT',
        totalTargetBudget: lockedLayer1.pnlTotalBudgetNet,
        targetGmv: lockedLayer1.targetNmvTotal,
        budgetAdsTotal: lockedLayer1.budgetAdsNet,
        budgetAffiliate: lockedLayer1.budgetAffiliateNet,
        budgetSelfChannel: lockedLayer1.budgetSelfChannelNet,
        totalTargetContents: totalLayer1Videos > 0 ? totalLayer1Videos : prev.totalTargetContents,
        items: nextItems,
        discussions: [logMsg, ...(prev.discussions || [])],
        updatedAt: now,
      };
      setMonthlyPlans(list => list.map(p => (p.id === updated.id ? updated : p)));
      return updated;
    });

    setActiveTab('ALL_SUMMARY');
    notify('Đã chốt Chỉ tiêu tháng và chuyển sang Phân bổ chi tiết!');
  };

  // Mở khóa chỉ tiêu khi đang ở Bản nháp hoặc Bản điều chỉnh
  const handleUnlockLayer1ForEdit = () => {
    if (isPlanLocked) return;
    handleUpdateLayer1Metrics({ isLocked: false });
    notify(`Đã mở khóa Chỉ tiêu tháng trên bản ${planState.currentVersionCode || 'v1.0'} — có thể chỉnh sửa lại chỉ tiêu và phân bổ.`);
  };

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
    } catch (err: unknown) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : 'Vui lòng thử lại';
      notify(`Lỗi khi xuất Excel: ${errMsg}`);
    }
  };

  // Cập nhật người phụ trách cho từng dòng phân rã
  const handleUpdateItemAssignee = (id: string, staffName: string) => {
    setPlanState(prev => ({
      ...prev,
      items: prev.items.map(it => it.id === id ? { ...it, assignedStaff: staffName } : it)
    }));
  };

  // Tách 1 dòng hạng mục thành 2 dòng để chia cho 2–3 nhân sự cùng làm chung trên 1 gian hàng
  const handleSplitRowForCoWorker = (rowId: string) => {
    setPlanState(prev => {
      const idx = prev.items.findIndex(it => it.id === rowId);
      if (idx === -1) return prev;
      const source = prev.items[idx];
      const currentAssignee = source.assignedStaff || prev.pic;
      // Chọn đồng đội mặc định khác người hiện tại
      const isSelfChannel = source.channel === 'SELF_CHANNEL';
      const candidatePool = isSelfChannel
        ? ['Quỳnh Như', 'Nguyễn Thị Mai Anh', 'Vũ Hoài Lâm', 'Phan Diệu Ánh']
        : ['Lương Thị Như Quỳnh', 'Lê Phương Thảo', 'Phạm Thị Thu Hằng', 'Hoàng Hải Long', 'Lê Thanh Hải', 'Phan Diệu Ánh'];
      const coWorker = candidatePool.find(name => name !== currentAssignee) || PIC_OPTIONS.find(name => name !== currentAssignee) || currentAssignee;

      const firstQty = source.qty > 1 ? Math.ceil(source.qty / 2) : source.qty;
      const secondQty = source.qty > 1 ? Math.floor(source.qty / 2) : 1;

      const updatedSource = {
        ...source,
        qty: firstQty,
        totalBudget: firstQty * source.unitCost,
        targetGmv: firstQty * source.unitCost * source.expectedRoiMultiplier,
      };

      const splitRow = {
        ...source,
        id: `${source.id}-split-${Date.now().toString(36).slice(-4)}`,
        assignedStaff: coWorker,
        qty: secondQty,
        totalBudget: secondQty * source.unitCost,
        targetGmv: secondQty * source.unitCost * source.expectedRoiMultiplier,
        staffNotes: `Tách chia cùng ${currentAssignee} trên cùng gian hàng`,
      };

      const nextItems = [...prev.items];
      nextItems.splice(idx, 1, updatedSource, splitRow);
      return { ...prev, items: nextItems };
    });
    notify('Đã tách dòng hạng mục để 2–3 nhân sự cùng phụ trách trên gian hàng này.');
  };

  // Gộp lại dòng đã tách vào dòng gốc
  const handleRemoveSplitRow = (rowId: string) => {
    setPlanState(prev => {
      const target = prev.items.find(it => it.id === rowId);
      if (!target) return prev;
      const baseId = rowId.split('-split-')[0];
      const sibling = prev.items.find(it => it.id !== rowId && (it.id === baseId || it.tierCode === target.tierCode));
      const nextItems = prev.items
        .filter(it => it.id !== rowId)
        .map(it => {
          if (sibling && it.id === sibling.id) {
            const mergedQty = it.qty + target.qty;
            return {
              ...it,
              qty: mergedQty,
              totalBudget: mergedQty * it.unitCost,
              targetGmv: mergedQty * it.unitCost * it.expectedRoiMultiplier,
            };
          }
          return it;
        });
      return { ...prev, items: nextItems };
    });
    notify('Đã gộp lại dòng tách chia vào hạng mục chính.');
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
        // Kênh tự xây & Reup -> Quỳnh Như / Nguyễn Thị Mai Anh (Team Việt Hoàng)
        else if (it.channel === 'SELF_CHANNEL') {
          assigned = it.id.includes('reup') ? 'Nguyễn Thị Mai Anh' : 'Quỳnh Như';
        }
        // TikTok Celeb & Macro lớn (KL6, KL7) -> PIC chủ trì
        else if (['KL6', 'KL7'].includes(it.tierCode)) {
          assigned = prev.pic;
        }
        // TikTok Mid-Macro (KL4, KL5) -> Lương Thị Như Quỳnh
        else if (['KL4', 'KL5'].includes(it.tierCode)) {
          assigned = 'Lương Thị Như Quỳnh';
        }
        // TikTok Micro (KL3) -> Lê Phương Thảo
        else if (it.tierCode === 'KL3') {
          assigned = 'Lê Phương Thảo';
        }
        // FOC 0đ -> Trần Thị Hảo
        else if (it.tierCode.includes('TAP') || it.id === 'row-tt-tap') {
          assigned = 'Trần Thị Hảo';
        }
        // TikTok Affiliate (KL1, KL2) -> Phạm Thị Thu Hằng
        else {
          assigned = 'Phạm Thị Thu Hằng';
        }

        return { ...it, assignedStaff: assigned };
      })
    }));
    notify(`PIC ${planState.pic} đã phân bổ tự động các dòng theo chuyên môn của từng thành viên (Booking, Content Self-Channel, FOC, Đa sàn)!`);
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

  // Visible items based on activeTab & focusedStaffFilter: Chia tách rõ 4 đầu việc B2C + lọc theo nhân sự phụ trách
  const visibleItems = (() => {
    let base = planState.items.filter(it => it.channel !== 'LIVESTREAM');
    if (activeTab === 'AFFILIATE_PAID') base = planState.items.filter(it => it.channel === 'TIKTOK' && !it.tierCode.includes('TAP'));
    else if (activeTab === 'TAP_FREECAST') base = planState.items.filter(it => it.tierCode.includes('TAP') || it.id === 'row-tt-tap');
    else if (activeTab === 'SELF_CHANNEL') base = planState.items.filter(it => it.channel === 'SELF_CHANNEL');
    else if (activeTab === 'MULTI_PLATFORM') base = planState.items.filter(it => ['SHOPEE', 'FACEBOOK', 'INSTAGRAM', 'THREADS'].includes(it.channel));

    if (focusedStaffFilter !== 'ALL') {
      return base.filter(it => (it.assignedStaff || planState.pic) === focusedStaffFilter);
    }
    return base;
  })();

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

  const planReportContextText = [
    `[DỮ LIỆU PHÂN HỆ: Kế Hoạch Tháng B2C (Plan 4.1 & 4.1.1) — ${isShowingStudio ? planState.brandName : `Tổng hợp ${monthlyPlans.length} kế hoạch gian hàng`}]`,
    `- Gian hàng đang chọn: ${planState.brandName} (${planState.month} · Phiên bản ${planState.currentVersionCode || 'v1.0'}).`,
    `- Phụ trách thực thi (PIC): ${planState.pic} | Cấp sơ duyệt Leader: ${planState.hasBookingLeader && planState.bookingLeader ? planState.bookingLeader : 'Không có leader (Trình trực tiếp Giám đốc Marketing Đặng Thị Yến Nhi)'}.`,
    `- Mục tiêu GMV: ${formatVndShort(planState.targetGmv || 0)} | Hạn mức Ngân sách trần (Net): ${formatVndShort(planState.totalTargetBudget || 0)}.`,
    `- Ngân sách đã phân rã: ${formatVndShort(totalAllocatedBudget)} (${planState.totalTargetBudget > 0 ? Math.round((totalAllocatedBudget / planState.totalTargetBudget) * 100) : 0}% hạn mức) | Số lượng nội dung: ${totalAllocatedContents} / ${planState.totalTargetContents} video.`,
    `- Tỷ trọng KOC nhóm cao (KL4–KL7): ${highTierSharePct.toFixed(1)}% (${highTierOverLimit ? 'CẢNH BÁO: Vượt ngưỡng 45%' : 'Đạt chuẩn <= 45%'}).`,
    `- Dự phóng CIR: ${projectedCir.toFixed(1)}% | ROI dự kiến: ${projectedRoi.toFixed(2)}x.`,
  ].join('\n');

  // MÀN HÌNH 1: QUẢN LÝ KẾ HOẠCH THEO THÁNG (MONTHLY PLAN HUB)
  if (!isShowingStudio) {
    return (
      <div className="space-y-4">
        {planSync.status === 'offline' && (
          <div className="p-3 rounded-lg bg-critical-soft text-critical text-xs flex items-center justify-between border border-critical/30">
            <span>Không kết nối được database. Đang hiển thị dữ liệu mẫu, mọi thay đổi sẽ mất khi tải lại trang.</span>
            <button
              type="button"
              onClick={() => void planSync.saveNow()}
              className="underline font-semibold cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        )}
        <MonthlyPlanHub
          plans={monthlyPlans}
          storePortfolios={storePortfolios}
          campaigns={effectiveCampaigns}
          onCampaignsChange={updateCampaigns}
          onUpdateStore={onUpdateStore}
          currentUser={currentUser}
          onNotify={notify}
          syncBadge={
            <PlanSyncBadge
              status={planSync.status}
              lastSavedAt={planSync.lastSavedAt}
              errorMessage={planSync.errorMessage}
              onRetry={() => void planSync.saveNow()}
            />
          }
          onOpenPlanReport={() => setIsPlanReportOpen(true)}
        onSelectPlan={(selected, options) => {
          setPlanState(selected);
          if (options?.focusStaffName) {
            setFocusedStaffFilter(options.focusStaffName);
            if (options.focusWorkstream === 'AFFILIATE_PAID') setActiveTab('AFFILIATE_PAID');
            else if (options.focusWorkstream === 'FOC_SAMPLE') setActiveTab('TAP_FREECAST');
            else if (options.focusWorkstream === 'SELF_CHANNEL') setActiveTab('SELF_CHANNEL');
            else if (options.focusWorkstream === 'MULTI_PLATFORM') setActiveTab('MULTI_PLATFORM');
            else setActiveTab('ALL_SUMMARY');
          } else {
            setFocusedStaffFilter('ALL');
          }
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
        onImportLarkbasePlans={(importedPlans) => {
          setMonthlyPlans(prev => {
            const byId = new Map(prev.map(p => [p.id, p]));
            for (const imp of importedPlans) {
              // Khớp theo ID hoặc theo storeName + month
              const existing =
                byId.get(imp.id) ||
                Array.from(byId.values()).find(
                  p =>
                    p.month === imp.month &&
                    ((p.storeId && imp.storeId && p.storeId === imp.storeId) ||
                      (p.storeName &&
                        imp.storeName &&
                        p.storeName.trim().toLowerCase() === imp.storeName.trim().toLowerCase()))
                );
              if (existing) {
                byId.set(existing.id, {
                  ...existing,
                  ...imp,
                  id: existing.id
                });
              } else {
                byId.set(imp.id, imp);
              }
            }
            return Array.from(byId.values());
          });
        }}
        onOpenListingForPlan={onOpenListingForPlan ? (plan) => onOpenListingForPlan(plan) : undefined}
      />
      <OperationalReportDrawer
        isOpen={isPlanReportOpen}
        onClose={() => setIsPlanReportOpen(false)}
        purposeId="PLAN_ADS_ANALYSIS"
        moduleTitle="Báo Cáo Thẩm Định Kế Hoạch Tháng (Plan 4.1 & 4.1.1)"
        moduleSubtitle="Đối soát hạn mức Order Gross/Net, tỷ lệ Paid KOC vs FOC và luồng phê duyệt B2C"
        contextDataText={planReportContextText}
        onNotify={onNotify}
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
  const planStatus = planState.status || 'DRAFT';
  const userRole = currentUser?.role || '';
  const canLeaderReview = ['ADMIN', 'MANAGER', 'LEADER'].includes(userRole);
  const isLeadUser = ['ADMIN', 'MANAGER'].includes(userRole) || currentRole === 'LEAD';
  const isApprovedStatus = ['APPROVED', 'LEAD_APPROVED', 'BRAND_APPROVED', 'IN_EXECUTION', 'COMPLETED'].includes(planStatus);
  const hasLeader = Boolean(planState.hasBookingLeader !== undefined ? planState.hasBookingLeader : planState.bookingLeader);
  const studioVersionSnapshots = getPlanVersionSnapshots(planState);
  const activeVersionCode = planState.currentVersionCode || 'v1.0';

  const isDetailBreakdownTab = [
    'ALL_SUMMARY',
    'AFFILIATE_PAID',
    'TAP_FREECAST',
    'SELF_CHANNEL',
    'MULTI_PLATFORM',
    'MINDMAP',
  ].includes(activeTab);

  return (
    <div className="space-y-4 animate-in fade-in duration-200 pb-12">
      {/* ========================================================================= */}
      {/* THANH ĐIỀU HƯỚNG DUY NHẤT CỦA PLAN: TÁCH RỜI TỔNG QUAN & CHI TIẾT          */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200/90 px-4 py-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Bên trái: Nút quay lại + Chọn nhanh gian hàng + Phiên bản (Không lặp tiêu đề) */}
        <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
          <button
            onClick={() => {
              setMonthlyPlans(prev => prev.map(p => p.id === planState.id ? planState : p));
              setIsShowingStudio(false);
              if (planSync.isPersistent) void planSync.saveNow();
            }}
            className="h-8 px-2.5 shrink-0 inline-flex items-center gap-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer"
            title="Quay lại danh sách kế hoạch tháng"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Danh sách</span>
          </button>

          <select
            value={planState.id}
            onChange={(e) => {
              const found = monthlyPlans.find(p => p.id === e.target.value);
              if (found) {
                setMonthlyPlans(prev => prev.map(p => p.id === planState.id ? planState : p));
                setPlanState(found);
              }
            }}
            className="h-8 px-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 font-semibold text-xs text-slate-900 focus:outline-none cursor-pointer max-w-[260px] truncate"
            title="Chuyển sang gian hàng khác"
          >
            {monthlyPlans.map(p => (
              <option key={p.id} value={p.id}>
                {p.brandName} · {p.month}
              </option>
            ))}
          </select>

          {/* Nút Phiên bản gọn gàng */}
          <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 border border-slate-200/80">
            {studioVersionSnapshots.map((snap) => {
              const isCurrent = snap.versionCode === activeVersionCode;
              return (
                <button
                  key={snap.versionCode}
                  type="button"
                  onClick={() => handleSwitchVersionInStudio(snap)}
                  className={`px-2 py-0.5 rounded-md text-2xs font-semibold transition cursor-pointer ${
                    isCurrent
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                  title={`${snap.versionName}`}
                >
                  {snap.versionCode}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setIsVersionHistoryModalOpen(true)}
              className="px-2 py-0.5 rounded-md text-2xs font-semibold text-blue-700 hover:bg-white transition inline-flex items-center gap-1 cursor-pointer"
              title="So sánh các phiên bản hoặc tạo phiên bản mới trong tháng"
            >
              <Layers className="w-3 h-3" />
              <span className="hidden md:inline">Bản mới</span>
            </button>
          </div>
        </div>

        {/* Ở giữa: Chuyển đổi giữa Chỉ tiêu tháng và Phân bổ kênh */}
        <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 flex-wrap gap-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'OVERVIEW'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>1. Chỉ tiêu tháng</span>
            <span className="text-2xs font-normal text-ink-3">
              · {isLayer1Locked ? 'Đã chốt' : 'Đang điền'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isDetailBreakdownTab) setActiveTab('ALL_SUMMARY');
            }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer ${
              isDetailBreakdownTab
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>2. Phân bổ kênh &amp; KOC</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('WEEKLY_MATRIX')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'WEEKLY_MATRIX'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            3. Lịch tuần
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('EXCEL_PREVIEW')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'EXCEL_PREVIEW'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            4. Biểu mẫu tổng hợp
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('BRAND_ONE_SHEET')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1 cursor-pointer ${
              activeTab === 'BRAND_ONE_SHEET'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-emerald-800 hover:bg-emerald-50'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>5. Bản duyệt Brand</span>
          </button>
        </div>

        {/* Bên phải: Lưu + Trao đổi + Thao tác + Nút trạng thái/gửi duyệt */}
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenListingForPlan && (
            <button
              type="button"
              onClick={() => onOpenListingForPlan(planState)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition cursor-pointer"
              title="Mở bảng Listing KOC theo khung lương KL1–KL7 của kế hoạch này"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Triển khai Listing KOC</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsPlanReportOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>Báo cáo thẩm định</span>
          </button>

          <button
            onClick={async () => {
              setMonthlyPlans(prev => prev.map(p => p.id === planState.id ? planState : p));
              if (!planSync.isPersistent) {
                notify('Chưa kết nối database, kế hoạch đã lưu tạm trên phiên làm việc.');
                return;
              }
              const ok = await planSync.saveNow();
              notify(ok ? `Đã lưu kế hoạch "${planState.title}".` : 'Lưu kế hoạch không thành công, vui lòng thử lại.');
            }}
            disabled={planSync.status === 'saving'}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs transition disabled:opacity-60 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Lưu</span>
          </button>

          <PlanChatButton unreadCount={planChat.unreadCount} onClick={() => setIsChatOpen(true)} />

          <div className="relative">
            <button
              onClick={() => setIsActionMenuOpen(prev => !prev)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs transition cursor-pointer"
              aria-haspopup="menu"
              aria-expanded={isActionMenuOpen}
            >
              <span>Thao tác</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isActionMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {isActionMenuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsActionMenuOpen(false)} />
                <div role="menu" className="absolute right-0 mt-1.5 w-60 z-40 bg-white border border-slate-200 rounded-xl shadow-lg py-1 text-xs">
                  {[
                    ...(onOpenListingForPlan ? [{
                      label: 'Triển khai Listing KOC (KL)',
                      icon: <UserCheck className="w-3.5 h-3.5" />,
                      onClick: () => onOpenListingForPlan(planState),
                      disabled: false,
                      hint: undefined as string | undefined
                    }] : []),
                    {
                      label: 'Mở Biểu mẫu 1-Sheet Trình Brand',
                      icon: <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />,
                      onClick: () => setActiveTab('BRAND_ONE_SHEET'),
                    },
                    {
                      label: 'Xuất Excel 1-Sheet Trình Brand',
                      icon: <Download className="w-3.5 h-3.5 text-emerald-600" />,
                      onClick: () => {
                        const oneSheet = buildBrandOneSheetPlanData({
                          brandName: (planState.parentBrand || planState.brandName).split('_')[0].trim(),
                          month: planState.month,
                          storePlans: monthlyPlans.map(p => (p.id === planState.id ? planState : p)),
                          storePortfolios,
                          campaigns: effectiveCampaigns,
                        });
                        void exportBrandMonthlyOneSheetToExcel(oneSheet);
                        notify(`Đã xuất file Excel 1-Sheet Trình Brand cho ${(planState.parentBrand || planState.brandName).split('_')[0].trim()}!`);
                      },
                    },
                    {
                      label: 'Quản lý phiên bản tháng',
                      icon: <Layers className="w-3.5 h-3.5" />,
                      onClick: () => setIsVersionHistoryModalOpen(true),
                    },
                    {
                      label: 'Phân bổ cho team',
                      icon: <Users className="w-3.5 h-3.5" />,
                      onClick: () => setIsAllocationModalOpen(true),
                      disabled: isPlanLocked,
                      hint: isPlanLocked ? 'Đã chốt' : undefined
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
                      hint: !isPlanLocked ? 'Chờ chốt' : undefined
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

          {isPlanLocked ? (
            <Status tone="positive">{`Đã chốt ${activeVersionCode}`}</Status>
          ) : planStatus === 'PENDING_APPROVAL' ? (
            isLeadUser ? (
              <button
                onClick={() => setActiveTab('OVERVIEW')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Xem &amp; duyệt</span>
              </button>
            ) : (
              <Status tone="warning">Chờ duyệt</Status>
            )
          ) : isApprovedStatus ? (
            <Status tone="positive">Đã duyệt</Status>
          ) : (
            <button
              onClick={openSubmitToManager}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer"
            >
              <SendHorizonal className="w-3.5 h-3.5" />
              <span>Gửi duyệt</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MÀN 1 (LAYER 1): ĐIỀN & THỐNG NHẤT CHỈ SỐ CỐT LÕI (TRƯỚC KHI PHÂN RÃ)     */}
      {/* ========================================================================= */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-4">
          {/* Thanh trạng thái kế hoạch */}
          <div className="bg-slate-900 text-white rounded-xl p-3 px-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap text-xs font-semibold">
              <span className="text-blue-300">
                Phiên bản {activeVersionCode}
              </span>
              <span className="text-slate-500">·</span>
              <span className={
                isPlanLocked
                  ? 'text-emerald-300'
                  : isLayer1Locked
                  ? 'text-blue-200'
                  : 'text-amber-300'
              }>
                {isPlanLocked
                  ? 'Đã khóa chốt'
                  : isLayer1Locked
                  ? 'Đã chốt chỉ tiêu tháng'
                  : 'Đang điền chỉ tiêu'}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {!isPlanLocked && isLayer1Locked && (
                <button
                  type="button"
                  onClick={handleUnlockLayer1ForEdit}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs transition cursor-pointer"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Mở khóa sửa chỉ tiêu</span>
                </button>
              )}
              {!isLayer1Locked && (
                <button
                  type="button"
                  onClick={() => handleLockLayer1AndProceed(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs shadow-xs transition cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Chốt chỉ tiêu &amp; Sang phân bổ →</span>
                </button>
              )}
              {isLayer1Locked && (
                <button
                  type="button"
                  onClick={() => setActiveTab('ALL_SUMMARY')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition cursor-pointer"
                >
                  <span>Mở phân bổ chi tiết</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 1.0 KHUNG LIÊN KẾT THỰC THỂ CHIẾN DỊCH (CAMPAIGN 1–3 THÁNG) & LỊCH TREO KEY VISUAL */}
          {(() => {
            const brandRoot = (planState.brandName || '').split('_')[0].trim();
            const linkedCampaign =
              effectiveCampaigns.find(c => c.id === planState.campaignId) ||
              (planState.hasCampaign !== false
                ? effectiveCampaigns.find(
                    c =>
                      isCampaignActiveInMonth(c, planState.month) &&
                      c.brand.toLowerCase().includes(brandRoot.toLowerCase())
                  )
                : undefined);
            const hasCampaignActive = planState.hasCampaign ?? Boolean(linkedCampaign);
            const activePhase = linkedCampaign ? getCampaignPhaseForMonth(linkedCampaign, planState.month) : undefined;
            const brandCampaignCandidates = effectiveCampaigns.filter(
              c =>
                c.brand.toLowerCase().includes(brandRoot.toLowerCase()) ||
                isCampaignActiveInMonth(c, planState.month)
            );

            return (
              <div className="bg-white rounded-xl border border-line p-4 space-y-3 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                        Chiến dịch &amp; Key Visual kỳ {planState.month}
                      </h3>
                      <span className="text-slate-400">·</span>
                      <span className={`text-2xs font-semibold ${hasCampaignActive ? 'text-accent' : 'text-slate-600'}`}>
                        {hasCampaignActive ? 'Có chiến dịch' : 'Duy trì (Không campaign)'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          const candidate =
                            effectiveCampaigns.find(
                              c =>
                                isCampaignActiveInMonth(c, planState.month) &&
                                c.brand.toLowerCase().includes(brandRoot.toLowerCase())
                            ) || effectiveCampaigns[0];
                          const ph = candidate ? getCampaignPhaseForMonth(candidate, planState.month) : undefined;
                          const updated: Partial<InputPlanBreakdownState> = {
                            hasCampaign: true,
                            campaignId: candidate?.id,
                            campaignCode: candidate?.code,
                            campaignTitle: candidate?.title,
                            campaignPhaseName: ph?.phaseName || `Giai đoạn ${planState.month}`,
                          };
                          setPlanState(prev => ({ ...prev, ...updated }));
                          setMonthlyPlans(prev => prev.map(p => (p.id === planState.id ? { ...p, ...updated } : p)));
                          notify(`Đã bật chế độ CÓ Chiến dịch (Campaign) cho kế hoạch tháng ${planState.month}`);
                        }}
                        className={`px-2.5 py-1 rounded-md text-2xs font-semibold transition cursor-pointer ${
                          hasCampaignActive ? 'bg-accent text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Có Campaign
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated: Partial<InputPlanBreakdownState> = {
                            hasCampaign: false,
                            campaignId: undefined,
                            campaignCode: undefined,
                            campaignTitle: undefined,
                            campaignPhaseName: undefined,
                          };
                          setPlanState(prev => ({ ...prev, ...updated }));
                          setMonthlyPlans(prev => prev.map(p => (p.id === planState.id ? { ...p, ...updated } : p)));
                          notify(`Đã chuyển kế hoạch ${planState.storeName || planState.brandName} kỳ ${planState.month} sang chế độ Duy trì (Không Campaign)`);
                        }}
                        className={`px-2.5 py-1 rounded-md text-2xs font-semibold transition cursor-pointer ${
                          !hasCampaignActive ? 'bg-slate-800 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Không Campaign (Duy trì)
                      </button>
                    </div>

                    {hasCampaignActive && linkedCampaign && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCampaignForModal(linkedCampaign);
                          setIsCampaignModalOpen(true);
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-line bg-sunken hover:bg-slate-100 text-ink font-semibold text-2xs transition cursor-pointer"
                      >
                        Sửa / Phân kỳ Campaign
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setEditingCampaignForModal(null);
                        setIsCampaignModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-2xs transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tạo Campaign mới</span>
                    </button>
                  </div>
                </div>

                {hasCampaignActive ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <label className="text-2xs font-semibold text-slate-600 block mb-1">
                          Chiến dịch (Campaign) đang gắn với kế hoạch tháng {planState.month}
                        </label>
                        <select
                          value={linkedCampaign?.id || ''}
                          onChange={(e) => {
                            const selected = effectiveCampaigns.find(c => c.id === e.target.value);
                            if (!selected) return;
                            const ph = getCampaignPhaseForMonth(selected, planState.month);
                            const updated: Partial<InputPlanBreakdownState> = {
                              hasCampaign: true,
                              campaignId: selected.id,
                              campaignCode: selected.code,
                              campaignTitle: selected.title,
                              campaignPhaseName: ph?.phaseName || `Giai đoạn ${planState.month}`,
                            };
                            setPlanState(prev => ({ ...prev, ...updated }));
                            setMonthlyPlans(prev => prev.map(p => (p.id === planState.id ? { ...p, ...updated } : p)));
                            notify(`Đã gắn Chiến dịch [${selected.code}] ${selected.title} vào kế hoạch tháng ${planState.month}`);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-accent"
                        >
                          {brandCampaignCandidates.map(c => (
                            <option key={c.id} value={c.id}>
                              [{c.code}] {c.brand} — {c.title} ({(c.coveredMonths || []).length || 1} tháng: {(c.coveredMonths || [planState.month]).join(' → ')})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-2xs font-semibold text-slate-600 block mb-1">
                          Giai đoạn (Phase) trong kỳ {planState.month}
                        </label>
                        <div className="px-2.5 py-1.5 rounded-lg border border-line bg-sunken text-xs font-semibold text-ink truncate">
                          {activePhase?.phaseName || planState.campaignPhaseName || `Giai đoạn thực thi ${planState.month}`}
                        </div>
                      </div>
                    </div>

                    {linkedCampaign && (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        {/* Cột 1: Thông điệp & CTKM Section 01 */}
                        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-1.5 text-2xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-800 uppercase">01. Định hướng &amp; CTKM</span>
                            <span className="font-mono text-2xs text-slate-500">
                              {(linkedCampaign.coveredMonths || []).length > 1
                                ? `Kéo dài ${linkedCampaign.coveredMonths?.length} tháng (${linkedCampaign.coveredMonths?.join(', ')})`
                                : `Chiến dịch 1 tháng (${linkedCampaign.coveredMonths?.[0] || planState.month})`}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Big Idea: </span>
                            <strong className="text-slate-900">{linkedCampaign.bigIdea}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500">Key Message: </span>
                            <span className="text-slate-800 italic">&ldquo;{linkedCampaign.keyMessage}&rdquo;</span>
                          </div>
                          {linkedCampaign.comboPromoOffer && (
                            <div>
                              <span className="text-slate-500">Combo / CTKM: </span>
                              <span className="text-slate-800 font-medium">{linkedCampaign.comboPromoOffer}</span>
                            </div>
                          )}
                        </div>

                        {/* Cột 2: Ngân sách & Mục tiêu của Phase tháng này */}
                        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-1.5 text-2xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800 uppercase">02. Phân kỳ tháng {planState.month}</span>
                            {activePhase && !isLayer1Locked && (
                              <button
                                type="button"
                                onClick={() => {
                                  handleUpdateLayer1Metrics({
                                    targetNmvTotal: activePhase.targetGmv || layer1Metrics.targetNmvTotal,
                                    pnlTotalBudgetNet: activePhase.allocatedBudget || layer1Metrics.pnlTotalBudgetNet,
                                  });
                                  notify(`Đã áp dụng Hạn mức Phase ${planState.month} (${formatVndShort(activePhase.allocatedBudget)}) vào bảng Chỉ tiêu!`);
                                }}
                                className="text-2xs font-semibold text-accent hover:underline cursor-pointer"
                              >
                                Áp vào Chỉ tiêu →
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-0.5">
                            <div className="p-2 rounded bg-white border border-slate-200/80">
                              <span className="text-slate-500 block text-2xs">Ngân sách Phase ({planState.month})</span>
                              <strong className="font-mono text-xs text-slate-900">
                                {formatVndShort(activePhase?.allocatedBudget || linkedCampaign.budget)}
                              </strong>
                              <span className="text-2xs text-slate-400 block">
                                / Tổng {formatVndShort(linkedCampaign.budget)}
                              </span>
                            </div>
                            <div className="p-2 rounded bg-white border border-slate-200/80">
                              <span className="text-slate-500 block text-2xs">Target GMV Phase ({planState.month})</span>
                              <strong className="font-mono text-xs text-emerald-700">
                                {formatVndShort(activePhase?.targetGmv || linkedCampaign.targetGmv)}
                              </strong>
                              <span className="text-2xs text-slate-400 block">
                                {activePhase?.targetKocCount || linkedCampaign.targetKocCount} KOCs
                              </span>
                            </div>
                          </div>
                          {(activePhase?.saleMilestones || linkedCampaign.saleMilestones) && (
                            <div className="text-2xs text-slate-600 pt-0.5">
                              Mốc Sale: <strong className="text-slate-800">{activePhase?.saleMilestones || linkedCampaign.saleMilestones}</strong>
                            </div>
                          )}
                        </div>

                        {/* Cột 3: Key Visual & Lịch treo KV Section 03 */}
                        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-1.5 text-2xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800 uppercase">03. Key Visual &amp; Lịch Treo KV</span>
                            {linkedCampaign.kvPic && (
                              <span className="text-2xs text-slate-500">KV PIC: <strong>{linkedCampaign.kvPic}</strong></span>
                            )}
                          </div>
                          <div>
                            <span className="text-slate-500">Chủ đề KV: </span>
                            <strong className="text-slate-900">
                              {linkedCampaign.keyVisualSpec?.theme || 'Theo Brand Guideline chung'}
                            </strong>
                          </div>
                          {linkedCampaign.keyVisualSpec?.promoTextOnKv && (
                            <div>
                              <span className="text-slate-500">Text CTKM trên KV: </span>
                              <span className="text-slate-800">{linkedCampaign.keyVisualSpec.promoTextOnKv}</span>
                            </div>
                          )}
                          {linkedCampaign.keyVisualSpec && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1 font-mono text-2xs text-slate-600">
                              <span>
                                Ref: <strong>{linkedCampaign.keyVisualSpec.refDate}</strong>
                              </span>
                              <span className="text-slate-300">·</span>
                              <span>
                                Order: <strong>{linkedCampaign.keyVisualSpec.orderDate}</strong>
                              </span>
                              <span className="text-slate-300">·</span>
                              <span className="text-emerald-700 font-semibold">
                                Treo KV: <strong>{linkedCampaign.keyVisualSpec.hangDate}</strong>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs text-slate-600">
                    <span>
                      Chế độ: <strong className="text-slate-900">Duy trì thường nhật</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCampaignForModal(null);
                        setIsCampaignModalOpen(true);
                      }}
                      className="text-accent font-semibold hover:underline shrink-0 cursor-pointer"
                    >
                      + Khởi tạo Campaign
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* 1A. ĐẦU VÀO SỐ TỔNG PnL (GROWTH GIAO BAN ĐẦU) */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Đầu vào ban đầu — Số tổng PnL do Growth giao
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Ô 1: Mục tiêu NMV tổng */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="flex items-center justify-between">
                  <label className="text-2xs font-semibold text-slate-600 block">
                    1. Mục tiêu Doanh số (NMV)
                  </label>
                  <span className="text-2xs font-mono font-semibold text-emerald-700">
                    {formatVndShort(layer1Metrics.targetNmvTotal)}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <input
                    type="number"
                    disabled={isLayer1Locked}
                    step={10000000}
                    value={layer1Metrics.targetNmvTotal}
                    onChange={(e) => handleUpdateLayer1Metrics({ targetNmvTotal: Math.max(0, Number(e.target.value) || 0) })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-sm font-semibold text-emerald-700 focus:outline-none focus:border-blue-500 disabled:bg-slate-100"
                  />
                </div>
              </div>

              {/* Ô 2: Tổng ngân sách thúc đẩy Net (PnL) */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <label className="text-2xs font-semibold text-slate-600 block">
                  2. Tổng trần Ngân sách thúc đẩy (Net)
                </label>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <input
                    type="number"
                    disabled={isLayer1Locked}
                    step={5000000}
                    value={layer1Metrics.pnlTotalBudgetNet}
                    onChange={(e) => handleUpdateLayer1Metrics({ pnlTotalBudgetNet: Math.max(0, Number(e.target.value) || 0) })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-500 disabled:bg-slate-100"
                  />
                </div>
                <div className="flex items-center justify-between text-2xs text-slate-500 mt-1 font-mono">
                  <span>Net: <strong className="text-slate-800">{formatVndShort(layer1Metrics.pnlTotalBudgetNet)}</strong></span>
                  <span>Gross: <strong className="text-slate-700">{formatVndShort(Math.round(layer1Metrics.pnlTotalBudgetNet * GROSS_MULTIPLIER))}</strong></span>
                </div>
              </div>

              {/* Ô 3: Gói ngân sách Ads tổng giao Media */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="flex items-center justify-between gap-1">
                  <label className="text-2xs font-semibold text-slate-600">
                    3. Gói ngân sách Ads (Media)
                  </label>
                  <span className="text-2xs text-blue-700 font-mono font-semibold">
                    ROAS {layer1Metrics.targetAdsRoas}x
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <input
                    type="number"
                    disabled={isLayer1Locked}
                    step={5000000}
                    value={layer1Metrics.budgetAdsNet}
                    onChange={(e) => handleUpdateLayer1Metrics({ budgetAdsNet: Math.max(0, Number(e.target.value) || 0) })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-sm font-semibold text-blue-700 focus:outline-none focus:border-blue-500 disabled:bg-slate-100"
                  />
                </div>
              </div>

              {/* Ô 4: Đối soát tổng khung Layer 1 vs Số tổng PnL */}
              <div className={`rounded-xl border p-3 ${
                layer1BudgetGapVsPnl < 0
                  ? 'border-rose-200 bg-rose-50/50'
                  : layer1BudgetGapVsPnl === 0
                  ? 'border-emerald-200 bg-emerald-50/50'
                  : 'border-blue-200 bg-blue-50/40'
              }`}>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-2xs font-semibold text-slate-600">
                    4. Đối soát Chỉ tiêu vs PnL
                  </span>
                  <span className={`text-2xs font-mono font-semibold tabular-nums ${
                    layer1BudgetGapVsPnl < 0
                      ? 'text-rose-700'
                      : layer1BudgetGapVsPnl === 0
                      ? 'text-emerald-700'
                      : 'text-blue-700'
                  }`}>
                    {layer1BudgetGapVsPnl < 0
                      ? `Vượt ${formatVndShort(Math.abs(layer1BudgetGapVsPnl))}`
                      : layer1BudgetGapVsPnl === 0
                      ? 'Khớp 100% PnL'
                      : `Chưa chia ${formatVndShort(layer1BudgetGapVsPnl)}`}
                  </span>
                </div>
                <div className="text-base font-semibold font-mono text-slate-900 mt-1.5">
                  {formatVndShort(totalLayer1ChannelBudgetNet)} <span className="text-xs font-normal text-slate-500">/ {formatVndShort(layer1Metrics.pnlTotalBudgetNet)}</span>
                </div>
                <span className="text-2xs text-slate-600 mt-1 block">
                  Tổng sản lượng chỉ tiêu: <strong>{totalLayer1Videos} video</strong> + <strong>{layer1Metrics.qtyLivestreamSessions} phiên live</strong>
                </span>
              </div>
            </div>
          </div>

          {/* 1B. BẢNG THỐNG NHẤT CHỈ TIÊU CỐT LÕI GIỮA CÁC BÊN */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/80">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                      Bảng thống nhất Chỉ tiêu tháng (Growth · Booking B2C · Media)
                    </h3>
                  </div>
                  
                </div>

                <div className="flex items-center gap-1.5">
                  {!isPlanLocked && (
                    <button
                      type="button"
                      onClick={handleSyncLayer1ToLayer2}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-2xs font-semibold transition cursor-pointer"
                      title="Cập nhật các dòng KL1-KL7, FOC, Kênh Brand khớp theo bảng chỉ tiêu này"
                    >
                      Đồng bộ sang Phân bổ
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsChatOpen(true)}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-2xs font-semibold transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                    <span>Trao đổi ({planState.discussions?.length || 0})</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-2xs text-slate-500 font-semibold bg-slate-50/50">
                      <th className="py-2.5 px-3.5">Luồng chỉ số cốt lõi (Phần 1)</th>
                      <th className="py-2.5 px-2.5 text-right">Định mức sản lượng</th>
                      <th className="py-2.5 px-2.5 text-right">Trần chi phí Net (VNĐ)</th>
                      <th className="py-2.5 px-2.5 text-right">Quy đổi Gross</th>
                      <th className="py-2.5 px-2.5 text-right">Mục tiêu Doanh số</th>
                      <th className="py-2.5 px-3.5 text-right">Đã phân bổ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Dòng 1: Video KOC trả phí */}
                    <tr className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3.5">
                        <div className="font-semibold text-slate-900">1. Video KOC trả phí (Affiliate Paid)</div>
                      </td>
                      <td className="py-2.5 px-2.5 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <input
                            type="number"
                            disabled={isLayer1Locked}
                            value={layer1Metrics.qtyAffiliatePaid}
                            onChange={(e) => handleUpdateLayer1Metrics({ qtyAffiliatePaid: Math.max(0, Number(e.target.value) || 0) })}
                            className="w-16 text-right font-mono font-semibold px-2 py-1 rounded border border-slate-300 bg-white text-slate-900 disabled:bg-slate-100"
                          />
                          <span className="text-2xs text-slate-500">video</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2.5 text-right">
                        <input
                          type="number"
                          disabled={isLayer1Locked}
                          step={1000000}
                          value={layer1Metrics.budgetAffiliateNet}
                          onChange={(e) => handleUpdateLayer1Metrics({ budgetAffiliateNet: Math.max(0, Number(e.target.value) || 0) })}
                          className="w-28 text-right font-mono font-semibold px-2 py-1 rounded border border-slate-300 bg-white text-blue-700 disabled:bg-slate-100"
                        />
                        <div className="text-2xs font-mono text-slate-500 mt-0.5">{formatVndShort(layer1Metrics.budgetAffiliateNet)}</div>
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-slate-600">
                        {formatVndShort(Math.round(layer1Metrics.budgetAffiliateNet * GROSS_MULTIPLIER))}
                      </td>
                      <td className="py-2.5 px-2.5 text-right">
                        <input
                          type="number"
                          disabled={isLayer1Locked}
                          step={5000000}
                          value={layer1Metrics.targetGmvAffiliate}
                          onChange={(e) => handleUpdateLayer1Metrics({ targetGmvAffiliate: Math.max(0, Number(e.target.value) || 0) })}
                          className="w-28 text-right font-mono font-semibold px-2 py-1 rounded border border-slate-200 bg-slate-50 text-emerald-700 disabled:bg-slate-100"
                        />
                        <div className="text-2xs font-mono text-slate-500 mt-0.5">{formatVndShort(layer1Metrics.targetGmvAffiliate)}</div>
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <div className={`text-2xs font-mono font-semibold ${
                          channelTotals.affiliatePaid.qty === layer1Metrics.qtyAffiliatePaid && channelTotals.affiliatePaid.budget === layer1Metrics.budgetAffiliateNet
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }`}>
                          Đã phân bổ: {channelTotals.affiliatePaid.qty} video · {formatVndShort(channelTotals.affiliatePaid.budget)}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setViewMode('TABLE');
                            setActiveTab('AFFILIATE_PAID');
                          }}
                          className="text-2xs font-semibold text-blue-600 hover:underline mt-0.5 cursor-pointer"
                        >
                          Phân rã KL1–KL7 →
                        </button>
                      </td>
                    </tr>

                    {/* Dòng 2: Suất gửi mẫu miễn phí FOC 0đ */}
                    <tr className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3.5">
                        <div className="font-semibold text-slate-900">2. Suất gửi mẫu miễn phí (FOC 0đ)</div>
                      </td>
                      <td className="py-2.5 px-2.5 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <input
                            type="number"
                            disabled={isLayer1Locked}
                            value={layer1Metrics.qtyFocSample}
                            onChange={(e) => handleUpdateLayer1Metrics({ qtyFocSample: Math.max(0, Number(e.target.value) || 0) })}
                            className="w-16 text-right font-mono font-semibold px-2 py-1 rounded border border-slate-300 bg-white text-slate-900 disabled:bg-slate-100"
                          />
                          <span className="text-2xs text-slate-500">suất</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono font-semibold text-slate-400">
                        0 đ (FOC)
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-slate-400">
                        0 đ
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-2xs text-slate-400">
                        Gộp trong GMV Aff
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <div className={`text-2xs font-mono font-semibold ${
                          channelTotals.tapFreecast.qty === layer1Metrics.qtyFocSample ? 'text-emerald-700' : 'text-amber-700'
                        }`}>
                          Đã phân bổ: {channelTotals.tapFreecast.qty} suất
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setViewMode('TABLE');
                            setActiveTab('TAP_FREECAST');
                          }}
                          className="text-2xs font-semibold text-blue-600 hover:underline mt-0.5 cursor-pointer"
                        >
                          Chi tiết FOC →
                        </button>
                      </td>
                    </tr>

                    {/* Dòng 3: Video kênh thương hiệu (Self-channel) */}
                    <tr className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3.5">
                        <div className="font-semibold text-slate-900">3. Video kênh thương hiệu (Self-channel)</div>
                      </td>
                      <td className="py-2.5 px-2.5 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <input
                            type="number"
                            disabled={isLayer1Locked}
                            value={layer1Metrics.qtySelfChannel}
                            onChange={(e) => handleUpdateLayer1Metrics({ qtySelfChannel: Math.max(0, Number(e.target.value) || 0) })}
                            className="w-16 text-right font-mono font-semibold px-2 py-1 rounded border border-slate-300 bg-white text-slate-900 disabled:bg-slate-100"
                          />
                          <span className="text-2xs text-slate-500">video</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2.5 text-right">
                        <input
                          type="number"
                          disabled={isLayer1Locked}
                          step={500000}
                          value={layer1Metrics.budgetSelfChannelNet}
                          onChange={(e) => handleUpdateLayer1Metrics({ budgetSelfChannelNet: Math.max(0, Number(e.target.value) || 0) })}
                          className="w-28 text-right font-mono font-semibold px-2 py-1 rounded border border-slate-300 bg-white text-blue-700 disabled:bg-slate-100"
                        />
                        <div className="text-2xs font-mono text-slate-500 mt-0.5">{formatVndShort(layer1Metrics.budgetSelfChannelNet)}</div>
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-slate-600">
                        {formatVndShort(Math.round(layer1Metrics.budgetSelfChannelNet * GROSS_MULTIPLIER))}
                      </td>
                      <td className="py-2.5 px-2.5 text-right">
                        <input
                          type="number"
                          disabled={isLayer1Locked}
                          step={5000000}
                          value={layer1Metrics.targetGmvSelfChannel}
                          onChange={(e) => handleUpdateLayer1Metrics({ targetGmvSelfChannel: Math.max(0, Number(e.target.value) || 0) })}
                          className="w-28 text-right font-mono font-semibold px-2 py-1 rounded border border-slate-200 bg-slate-50 text-emerald-700 disabled:bg-slate-100"
                        />
                        <div className="text-2xs font-mono text-slate-500 mt-0.5">{formatVndShort(layer1Metrics.targetGmvSelfChannel)}</div>
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <div className={`text-2xs font-mono font-semibold ${
                          channelTotals.selfChannel.qty === layer1Metrics.qtySelfChannel && channelTotals.selfChannel.budget === layer1Metrics.budgetSelfChannelNet
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }`}>
                          Đã phân bổ: {channelTotals.selfChannel.qty} video · {formatVndShort(channelTotals.selfChannel.budget)}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setViewMode('TABLE');
                            setActiveTab('SELF_CHANNEL');
                          }}
                          className="text-2xs font-semibold text-blue-600 hover:underline mt-0.5 cursor-pointer"
                        >
                          Phân rã kênh Brand →
                        </button>
                      </td>
                    </tr>

                    {/* Dòng 4: Đa sàn khác (Shopee, FB, IG, Threads) */}
                    <tr className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3.5">
                        <div className="font-semibold text-slate-900">4. Đa sàn khác (Shopee, FB, IG, Threads)</div>
                      </td>
                      <td className="py-2.5 px-2.5 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <input
                            type="number"
                            disabled={isLayer1Locked}
                            value={layer1Metrics.qtyMultiPlatform}
                            onChange={(e) => handleUpdateLayer1Metrics({ qtyMultiPlatform: Math.max(0, Number(e.target.value) || 0) })}
                            className="w-16 text-right font-mono font-semibold px-2 py-1 rounded border border-slate-300 bg-white text-slate-900 disabled:bg-slate-100"
                          />
                          <span className="text-2xs text-slate-500">video</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2.5 text-right">
                        <input
                          type="number"
                          disabled={isLayer1Locked}
                          step={500000}
                          value={layer1Metrics.budgetMultiPlatformNet}
                          onChange={(e) => handleUpdateLayer1Metrics({ budgetMultiPlatformNet: Math.max(0, Number(e.target.value) || 0) })}
                          className="w-28 text-right font-mono font-semibold px-2 py-1 rounded border border-slate-300 bg-white text-blue-700 disabled:bg-slate-100"
                        />
                        <div className="text-2xs font-mono text-slate-500 mt-0.5">{formatVndShort(layer1Metrics.budgetMultiPlatformNet)}</div>
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-slate-600">
                        {formatVndShort(Math.round(layer1Metrics.budgetMultiPlatformNet * GROSS_MULTIPLIER))}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-2xs text-slate-400">
                        Đa nền tảng
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <div className={`text-2xs font-mono font-semibold ${
                          channelTotals.multiPlatform.qty === layer1Metrics.qtyMultiPlatform && channelTotals.multiPlatform.budget === layer1Metrics.budgetMultiPlatformNet
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }`}>
                          Đã phân bổ: {channelTotals.multiPlatform.qty} video · {formatVndShort(channelTotals.multiPlatform.budget)}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setViewMode('TABLE');
                            setActiveTab('MULTI_PLATFORM');
                          }}
                          className="text-2xs font-semibold text-blue-600 hover:underline mt-0.5 cursor-pointer"
                        >
                          Phân rã đa sàn →
                        </button>
                      </td>
                    </tr>

                    {/* Dòng 5: Livestream */}
                    <tr className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3.5">
                        <div className="font-semibold text-slate-900">5. Phiên Livestream (Affiliate / Inhouse / CTV)</div>
                      </td>
                      <td className="py-2.5 px-2.5 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <input
                            type="number"
                            disabled={isLayer1Locked}
                            value={layer1Metrics.qtyLivestreamSessions}
                            onChange={(e) => handleUpdateLayer1Metrics({ qtyLivestreamSessions: Math.max(0, Number(e.target.value) || 0) })}
                            className="w-16 text-right font-mono font-semibold px-2 py-1 rounded border border-slate-300 bg-white text-slate-900 disabled:bg-slate-100"
                          />
                          <span className="text-2xs text-slate-500">phiên</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2.5 text-right">
                        <input
                          type="number"
                          disabled={isLayer1Locked}
                          step={500000}
                          value={layer1Metrics.budgetLivestreamNet}
                          onChange={(e) => handleUpdateLayer1Metrics({ budgetLivestreamNet: Math.max(0, Number(e.target.value) || 0) })}
                          className="w-28 text-right font-mono font-semibold px-2 py-1 rounded border border-slate-300 bg-white text-blue-700 disabled:bg-slate-100"
                        />
                        <div className="text-2xs font-mono text-slate-500 mt-0.5">{formatVndShort(layer1Metrics.budgetLivestreamNet)}</div>
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-slate-600">
                        {formatVndShort(Math.round(layer1Metrics.budgetLivestreamNet * GROSS_MULTIPLIER))}
                      </td>
                      <td className="py-2.5 px-2.5 text-right">
                        <input
                          type="number"
                          disabled={isLayer1Locked}
                          step={5000000}
                          value={layer1Metrics.targetGmvLivestream}
                          onChange={(e) => handleUpdateLayer1Metrics({ targetGmvLivestream: Math.max(0, Number(e.target.value) || 0) })}
                          className="w-28 text-right font-mono font-semibold px-2 py-1 rounded border border-slate-200 bg-slate-50 text-emerald-700 disabled:bg-slate-100"
                        />
                        <div className="text-2xs font-mono text-slate-500 mt-0.5">{formatVndShort(layer1Metrics.targetGmvLivestream)}</div>
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <span className="text-2xs font-mono text-slate-500">
                          {layer1Metrics.qtyLivestreamSessions} ca live
                        </span>
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-900">
                      <td className="py-2.5 px-3.5">
                        Tổng cộng Chỉ tiêu (Kèm gói Ads {formatVndShort(layer1Metrics.budgetAdsNet)})
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono">
                        {totalLayer1Videos} video + {layer1Metrics.qtyLivestreamSessions} live
                      </td>
                      <td className={`py-2.5 px-2.5 text-right font-mono ${layer1BudgetGapVsPnl < 0 ? 'text-rose-600' : 'text-blue-700'}`}>
                        {formatVndShort(totalLayer1ChannelBudgetNet)}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-slate-700">
                        {formatVndShort(Math.round(totalLayer1ChannelBudgetNet * GROSS_MULTIPLIER))}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-emerald-700">
                        {formatVndShort(layer1Metrics.targetNmvTotal)}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-xs">
                        Đã phân bổ: {totalAllocatedContents} video · {formatVndShort(totalCombinedBudget)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Khu vực ghi chú thống nhất & Nút Chốt */}
              <div className="p-3.5 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="text-2xs font-semibold text-slate-600 block mb-1">
                    Ghi chú thống nhất chỉ tiêu tháng (Growth · Booking · Media):
                  </label>
                  <input
                    type="text"
                    disabled={isLayer1Locked}
                    value={layer1Metrics.alignmentNote || ''}
                    onChange={(e) => handleUpdateLayer1Metrics({ alignmentNote: e.target.value })}
                    placeholder="Nhập thống nhất giữa các bên (VD: Chốt trần Net Affiliate 150Tr, đẩy 50 suất FOC mẫu mới, giữ 20 video kênh Brand)..."
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:border-blue-500 disabled:bg-slate-100"
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!isLayer1Locked ? (
                    <button
                      type="button"
                      onClick={() => handleLockLayer1AndProceed(true)}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Chốt chỉ tiêu &amp; Sang phân bổ chi tiết →</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      {!isPlanLocked && (
                        <button
                          type="button"
                          onClick={handleUnlockLayer1ForEdit}
                          className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-semibold text-xs transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Sửa lại Chỉ tiêu</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveTab('ALL_SUMMARY')}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Mở bảng Phân bổ chi tiết</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cột phải (4/12): Nhân sự phụ trách & Lịch sử phiên bản */}
            <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-4 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-xs font-semibold text-slate-900">Thông tin phụ trách &amp; Phiên bản</h3>
                {canLeaderReview && hasLeader && leaderStatus !== 'ĐÃ_SƠ_DUYỆT' && !isPlanLocked && (
                  <button
                    onClick={() => {
                      setLeaderReviewNote(planState.leaderNotes || '');
                      setLeaderApprovalDecision('APPROVE');
                      setIsLeaderApprovalModalOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-semibold text-2xs transition cursor-pointer"
                  >
                    Leader Sơ duyệt
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-2xs text-slate-500 block">Chuyên viên B2C (PIC)</span>
                  <strong className="text-slate-900 font-semibold mt-0.5 block">
                    {planState.primaryPic || planState.pic || 'Chưa phân công'}
                  </strong>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-2xs text-slate-500">Luồng duyệt B2C</span>
                    {isLeadUser && !isPlanLocked && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextHas = !hasLeader;
                          const defaultLeader = nextHas ? (planState.bookingLeader || 'Nguyễn Thị Ngọc Tâm') : undefined;
                          setPlanState(prev => ({
                            ...prev,
                            hasBookingLeader: nextHas,
                            bookingLeader: defaultLeader,
                            leaderApprovalStatus: nextHas
                              ? (prev.leaderApprovalStatus === 'KHÔNG_ÁP_DỤNG' ? 'CHƯA_DUYỆT' : (prev.leaderApprovalStatus || 'CHƯA_DUYỆT'))
                              : 'KHÔNG_ÁP_DỤNG'
                          }));
                          notify(nextHas
                            ? `Đã bật yêu cầu Leader sơ duyệt cho gian ${planState.brandName}`
                            : `Đã chuyển gian ${planState.brandName} sang Duyệt trực tiếp`);
                        }}
                        className="text-2xs text-blue-600 hover:underline font-medium cursor-pointer"
                      >
                        Đổi
                      </button>
                    )}
                  </div>
                  <strong className="text-slate-900 font-semibold mt-0.5 block truncate">
                    {hasLeader ? (planState.bookingLeader || 'Nguyễn Thị Ngọc Tâm') : 'Trực tiếp Lead B2C'}
                  </strong>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-2xs text-slate-500 block">Phụ trách Growth</span>
                  <strong className="text-slate-900 font-semibold mt-0.5 block">
                    {planState.growthPic || '—'}
                  </strong>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-2xs text-slate-500 block">Trạng thái Chỉ tiêu</span>
                  <strong className={`font-semibold mt-0.5 block ${isLayer1Locked ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {isLayer1Locked ? 'Đã chốt chỉ tiêu tháng' : 'Đang điền & trao đổi'}
                  </strong>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="text-2xs text-slate-500">
                  Đang mở <strong className="text-slate-800">{activeVersionCode}</strong> ({studioVersionSnapshots.length} phiên bản trong tháng {planState.month})
                </div>
                <button
                  type="button"
                  onClick={() => setIsVersionHistoryModalOpen(true)}
                  className="text-2xs font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  Lịch sử &amp; So sánh bản →
                </button>
              </div>
            </div>
          </div>

          {/* 1C. Quy trình Ký duyệt 4 bên (Hiển thị trực tiếp trong màn Tổng quan) */}
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
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MÀN 2: PHÂN RÃ CHI TIẾT HẠNG MỤC (DỰA TRÊN CHỈ TIÊU ĐÃ THỐNG NHẤT)       */}
      {/* ========================================================================= */}
      {isDetailBreakdownTab && (
        <div className="bg-white rounded-xl border border-slate-200/90 px-3.5 py-2.5 space-y-2.5">
          {/* Thanh mốc chỉ tiêu đối chiếu trực tiếp với Phân rã chi tiết */}
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-2xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-800 uppercase tracking-wide inline-flex items-center gap-1">
                {isLayer1Locked ? <Lock className="w-3 h-3 text-emerald-600" /> : <Unlock className="w-3 h-3 text-amber-600" />}
                <span>Mốc chỉ tiêu tháng ({activeVersionCode}):</span>
              </span>
              <span className={`font-mono ${
                channelTotals.affiliatePaid.qty === layer1Metrics.qtyAffiliatePaid && channelTotals.affiliatePaid.budget === layer1Metrics.budgetAffiliateNet
                  ? 'text-emerald-700'
                  : 'text-amber-700'
              }`}>
                KOC trả phí: <strong>{channelTotals.affiliatePaid.qty}/{layer1Metrics.qtyAffiliatePaid}</strong> video ({formatVndShort(channelTotals.affiliatePaid.budget)}/{formatVndShort(layer1Metrics.budgetAffiliateNet)})
              </span>
              <span className="text-slate-300">·</span>
              <span className={`font-mono ${
                channelTotals.tapFreecast.qty === layer1Metrics.qtyFocSample
                  ? 'text-emerald-700'
                  : 'text-amber-700'
              }`}>
                FOC 0đ: <strong>{channelTotals.tapFreecast.qty}/{layer1Metrics.qtyFocSample}</strong> suất
              </span>
              <span className="text-slate-300">·</span>
              <span className={`font-mono ${
                channelTotals.selfChannel.qty === layer1Metrics.qtySelfChannel && channelTotals.selfChannel.budget === layer1Metrics.budgetSelfChannelNet
                  ? 'text-emerald-700'
                  : 'text-amber-700'
              }`}>
                Kênh Brand: <strong>{channelTotals.selfChannel.qty}/{layer1Metrics.qtySelfChannel}</strong> video ({formatVndShort(channelTotals.selfChannel.budget)}/{formatVndShort(layer1Metrics.budgetSelfChannelNet)})
              </span>
              <span className="text-slate-300">·</span>
              <span className={`font-mono ${
                channelTotals.multiPlatform.qty === layer1Metrics.qtyMultiPlatform && channelTotals.multiPlatform.budget === layer1Metrics.budgetMultiPlatformNet
                  ? 'text-emerald-700'
                  : 'text-amber-700'
              }`}>
                Đa sàn: <strong>{channelTotals.multiPlatform.qty}/{layer1Metrics.qtyMultiPlatform}</strong> video ({formatVndShort(channelTotals.multiPlatform.budget)}/{formatVndShort(layer1Metrics.budgetMultiPlatformNet)})
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {!isPlanLocked && (
                <button
                  type="button"
                  onClick={handleSyncLayer1ToLayer2}
                  className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold transition cursor-pointer"
                >
                  Khớp theo chỉ tiêu
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab('OVERVIEW')}
                className="px-2 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold transition cursor-pointer"
              >
                ← Sửa Chỉ tiêu tháng
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Bộ lọc kênh 1 dòng gọn gàng */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {([
                { key: 'ALL_SUMMARY', label: `Tất cả (${totalAllocatedContents})` },
                { key: 'AFFILIATE_PAID', label: `1. KOC trả phí (${channelTotals.affiliatePaid.qty})` },
                { key: 'TAP_FREECAST', label: `2. Mẫu FOC (${channelTotals.tapFreecast.qty})` },
                { key: 'SELF_CHANNEL', label: `3. Kênh Brand (${channelTotals.selfChannel.qty})` },
                { key: 'MULTI_PLATFORM', label: `4. Đa sàn (${channelTotals.multiPlatform.qty})` },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border cursor-pointer ${
                    activeTab === tab.key
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Bên phải: Chỉ số đối soát 1 dòng + Chuyển chế độ Bảng / Sơ đồ nhánh / Thẻ */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-xs text-slate-600 hidden sm:flex items-center gap-1.5">
                <span>Đã chia:</span>
                <strong className={`font-mono ${isOverBudget ? 'text-rose-600' : 'text-slate-900'}`}>
                  {formatVndShort(totalCombinedBudget)}
                </strong>
                <span className="text-slate-400">/ {formatVndShort(planState.totalTargetBudget)}</span>
                <span className="text-slate-300">·</span>
                <span className={`font-mono text-2xs font-semibold tabular-nums ${
                  isOverBudget ? 'text-rose-700' : budgetHeadroom === 0 ? 'text-emerald-700' : 'text-blue-700'
                }`}>
                  {isOverBudget ? `Vượt ${formatVndShort(Math.abs(budgetHeadroom))}` : budgetHeadroom === 0 ? 'Khớp trần' : `Còn ${formatVndShort(budgetHeadroom)}`}
                </span>
              </div>

              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 shrink-0">
                <button
                  onClick={() => {
                    if (activeTab === 'MINDMAP') setActiveTab('ALL_SUMMARY');
                    setViewMode('TABLE');
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                    activeTab !== 'MINDMAP' && viewMode === 'TABLE' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" /> Bảng
                </button>
                <button
                  onClick={() => setActiveTab('MINDMAP')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                    activeTab === 'MINDMAP' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" /> Sơ đồ nhánh
                </button>
                <button
                  onClick={() => {
                    if (activeTab === 'MINDMAP') setActiveTab('ALL_SUMMARY');
                    setViewMode('CARDS');
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                    activeTab !== 'MINDMAP' && viewMode === 'CARDS' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" /> Thẻ
                </button>
              </div>
            </div>
          </div>

          {/* Thanh Focus riêng theo từng nhân sự phụ trách trên gian hàng này */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-2xs font-semibold text-slate-500 inline-flex items-center gap-1 mr-1">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                Lọc theo người làm trên gian hàng ({staffAllocationSummary.filter(s => s.videoCount > 0).length} người):
              </span>
              <button
                type="button"
                onClick={() => setFocusedStaffFilter('ALL')}
                className={`px-2 py-0.5 rounded-md text-2xs font-semibold border transition cursor-pointer ${
                  focusedStaffFilter === 'ALL'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Toàn đội ({totalAllocatedContents} video)
              </button>
              {staffAllocationSummary
                .filter(s => s.videoCount > 0)
                .map(s => {
                  const isFocused = focusedStaffFilter === s.staffName;
                  return (
                    <button
                      key={s.staffName}
                      type="button"
                      onClick={() => setFocusedStaffFilter(isFocused ? 'ALL' : s.staffName)}
                      className={`px-2 py-0.5 rounded-md text-2xs font-semibold border transition cursor-pointer ${
                        isFocused
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-blue-50/60 text-blue-800 border-blue-200 hover:bg-blue-100/70'
                      }`}
                      title={`Chỉ hiện phần việc của ${s.staffName}: ${s.videoCount} video (${formatVndShort(s.totalBudget)})`}
                    >
                      {s.staffName} ({s.videoCount} video · {formatVndShort(s.totalBudget)})
                    </button>
                  );
                })}
            </div>
            {focusedStaffFilter !== 'ALL' && (
              <span className="text-2xs font-medium text-blue-700">
                Đang lọc riêng: <strong>{focusedStaffFilter}</strong>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Khi phiên bản đã chốt: khóa toàn bộ ô nhập của vùng phân rã */}
      <fieldset disabled={isPlanLocked} className="min-w-0 m-0 p-0 border-0 space-y-5">

      {/* ========================================================================= */}
      {/* 2.5 MAIN CONTENT AREA: SƠ ĐỒ NHÁNH MINDMAP                                 */}
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
      {/* 3. MAIN CONTENT AREA: VIEW MODE 1 - CARDS VIEW                            */}
      {/* ========================================================================= */}
      {activeTab !== 'OVERVIEW' && activeTab !== 'MINDMAP' && activeTab !== 'EXCEL_PREVIEW' && activeTab !== 'DISCUSSIONS' && activeTab !== 'WEEKLY_MATRIX' && viewMode === 'CARDS' && (
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
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-2xs font-code text-ink-3">
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

                    <div className="mt-3">
                      <label className="text-2xs font-semibold text-slate-400 block mb-1">
                        Định dạng video
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

                    <div className="mt-2.5">
                      <label className="text-2xs font-semibold text-slate-400 flex items-center gap-1 mb-1">
                        <UserCheck className="w-3 h-3 text-blue-600" />
                        Nhân sự phụ trách
                      </label>
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
                        >
                          +5
                        </button>
                      </div>
                    </div>

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
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MAIN CONTENT AREA: BẢNG PHÂN RÃ GỌN GÀNG, THOÁNG MẮT                   */}
      {/* ========================================================================= */}
      {activeTab !== 'OVERVIEW' && activeTab !== 'MINDMAP' && activeTab !== 'EXCEL_PREVIEW' && activeTab !== 'DISCUSSIONS' && activeTab !== 'WEEKLY_MATRIX' && viewMode === 'TABLE' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
          {/* THANH CÔNG CỤ 1 DÒNG GỌN: GỢI Ý CƠ CẤU & KHỚP TRẦN */}
          {!isPlanLocked && (
            <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-2xs font-semibold text-slate-600 mr-1">Gợi ý cơ cấu:</span>
                {([
                  { id: 'BALANCED', label: 'Chuẩn cân bằng (KL1–KL5)' },
                  { id: 'GMV_MAX', label: 'Đẩy số Mega (KL1–KL3 & FOC)' },
                  { id: 'BRAND_PUSH', label: 'Đẩy nhận diện (KL4–KL6 & Brand)' },
                  { id: 'COST_SAVER', label: 'Tối ưu chi phí (KL1–KL2 & FOC)' },
                ] as const).map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleApplyPreset(p.id)}
                    className={`px-2.5 py-1 rounded-lg text-2xs font-semibold border transition cursor-pointer ${
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
                  >
                    Tự động khớp trần ({formatVndShort(budgetHeadroom)} dư)
                  </button>
                )}
                {contentHeadroom > 0 && (
                  <button
                    type="button"
                    onClick={handleFillFocRemaining}
                    className="px-2.5 py-1 rounded-lg text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                  >
                    + Bù {contentHeadroom} video thiếu vào FOC (0đ)
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="w-full">
            <table className="w-full table-fixed text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-2xs">
                  <th className="py-2.5 px-3 w-[23%]">Đầu việc / Khung lương KOC</th>
                  <th className="py-2.5 px-2.5 w-[17%]">Định dạng video</th>
                  <th className="py-2.5 px-2.5 w-[18%]">Nhân sự thực thi (Tách 2–3 người)</th>
                  <th className="py-2.5 px-2 w-[16%] text-center">Số lượng video</th>
                  <th className="py-2.5 px-2.5 w-[11%] text-right">Đơn giá Net</th>
                  <th className="py-2.5 px-2.5 w-[9%] text-right">Thành tiền</th>
                  <th className="py-2.5 px-2 w-[8%] text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleItems.map((item) => {
                  const itemBudgetPct = totalAllocatedBudget > 0 ? (item.totalBudget / totalAllocatedBudget) * 100 : 0;
                  const isSplitRow = item.id.includes('-split-');
                  const klMatch = item.tierCode.toUpperCase().match(/^KL[1-7]$/);
                  const rowSalaryGrade = klMatch ? (klMatch[0] as SalaryGrade) : undefined;

                  return (
                    <tr
                      key={item.id}
                      className="transition hover:bg-blue-50/30"
                    >
                      {/* Column 1: Tier Badge & Label */}
                      <td className="py-2 px-3 align-middle">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-2xs font-code text-ink-3 shrink-0">
                            {item.tierCode}
                          </span>
                          <span className="font-semibold text-slate-900 text-xs truncate" title={item.tierLabel}>
                            {item.tierLabel.split(':')[1]?.trim() || item.tierLabel}
                          </span>
                        </div>
                      </td>

                      {/* Column 2: Content Format Selector */}
                      <td className="py-2 px-2.5 align-middle">
                        <select
                          value={item.contentFormat}
                          onChange={(e) => handleUpdateItemFormat(item.id, e.target.value)}
                          className="w-full text-xs font-medium px-2 py-1.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 transition truncate"
                        >
                          {CONTENT_FORMAT_OPTIONS.map(fmt => (
                            <option key={fmt} value={fmt}>{fmt}</option>
                          ))}
                        </select>
                      </td>

                      {/* Column 3: Assignee Selector + Split for Co-Workers */}
                      <td className="py-2 px-2.5 align-middle">
                        <div className="flex items-center gap-1">
                          <select
                            value={item.assignedStaff || planState.pic}
                            onChange={(e) => handleUpdateItemAssignee(item.id, e.target.value)}
                            className={`flex-1 min-w-0 text-xs font-semibold px-2 py-1.5 rounded-lg border transition truncate ${
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
                          {!isPlanLocked && (
                            <button
                              type="button"
                              onClick={() => handleSplitRowForCoWorker(item.id)}
                              className="px-1.5 py-1 rounded border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 text-slate-600 text-2xs font-semibold shrink-0 transition cursor-pointer"
                              title="Tách dòng này để 2–3 nhân sự cùng chia nhau làm trên cùng gian hàng"
                            >
                              +Chia
                            </button>
                          )}
                          {!isPlanLocked && isSplitRow && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSplitRow(item.id)}
                              className="px-1 py-1 rounded border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-2xs font-semibold shrink-0 transition cursor-pointer"
                              title="Gộp lại vào dòng gốc"
                            >
                              Gộp
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Column 4: Quantity Stepper (Gọn 1 hàng, bỏ thanh kéo thừa) */}
                      <td className="py-2 px-2 align-middle">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleAdjustItemQty(item.id, -1)}
                            className="w-6 h-6 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold flex items-center justify-center transition shrink-0"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) => handleUpdateItemQty(item.id, Number(e.target.value))}
                            className="w-12 text-center text-xs font-semibold font-mono py-1 border border-slate-200 rounded bg-white text-slate-900 focus:outline-none focus:border-blue-500"
                          />
                          <button
                            onClick={() => handleAdjustItemQty(item.id, 1)}
                            className="w-6 h-6 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold flex items-center justify-center transition shrink-0"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleAdjustItemQty(item.id, 5)}
                            className="text-2xs font-semibold px-1.5 py-1 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition shrink-0"
                            title="Tăng nhanh 5 video"
                          >
                            +5
                          </button>
                        </div>
                      </td>

                      {/* Column 5: Unit Cost & Benchmark Reset */}
                      <td className="py-2 px-2.5 text-right align-middle">
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            step="500000"
                            value={item.unitCost}
                            onChange={(e) => handleUpdateItemCost(item.id, Number(e.target.value))}
                            className="w-full max-w-[92px] text-right text-xs font-mono font-medium px-1.5 py-1 bg-white border border-slate-200 rounded text-slate-800 focus:outline-none focus:border-blue-500"
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
                      <td className="py-2 px-2.5 text-right font-mono align-middle">
                        <span className="text-xs font-semibold text-slate-900 block">
                          {formatVndShort(item.totalBudget)}
                        </span>
                        <span className="text-2xs text-slate-400 block">
                          {itemBudgetPct.toFixed(0)}%
                        </span>
                      </td>

                      {/* Column 7: Quick Fill & Listing KOC Button */}
                      <td className="py-2 px-2 text-center align-middle">
                        <div className="flex items-center justify-center gap-1">
                          {onOpenListingForPlan && rowSalaryGrade && (
                            <button
                              type="button"
                              onClick={() => onOpenListingForPlan(planState, rowSalaryGrade)}
                              className="text-2xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-1.5 py-1 rounded border border-blue-200 transition cursor-pointer shrink-0"
                              title={`Triển khai Listing KOC khung ${rowSalaryGrade} (${item.qty} video)`}
                            >
                              List KOC
                            </button>
                          )}
                          {contentHeadroom > 0 ? (
                            <button
                              onClick={() => handleFillRemainingToItem(item.id)}
                              className="text-2xs font-semibold text-blue-600 hover:bg-blue-50 px-1.5 py-1 rounded border border-blue-200 transition"
                              title={`Điền nốt ${contentHeadroom} video còn thiếu vào dòng này`}
                            >
                              +{contentHeadroom}
                            </button>
                          ) : !rowSalaryGrade ? (
                            <span className="text-slate-300 text-xs">•</span>
                          ) : null}
                        </div>
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
          {/* Thanh điều khiển 1 dòng gọn gàng (Bỏ 5 hộp lặp lại chỉ số bên dưới bảng) */}
          <div className="bg-white rounded-xl border border-slate-200/90 px-4 py-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-800 mr-1">Tự động rải 5 tuần theo nhịp:</span>
              <button
                type="button"
                onClick={() => handleDistributeWeeklyByPattern('MEGA_EARLY')}
                className="px-2.5 py-1 rounded-lg text-2xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition cursor-pointer"
              >
                Mega Sale đầu tháng (Dồn W1–W2: 55%)
              </button>
              <button
                type="button"
                onClick={() => handleDistributeWeeklyByPattern('PAYDAY_PEAK')}
                className="px-2.5 py-1 rounded-lg text-2xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition cursor-pointer"
              >
                Mid-month &amp; Payday (Đỉnh W2 &amp; W4)
              </button>
              <button
                type="button"
                onClick={() => handleDistributeWeeklyByPattern('EVEN')}
                className="px-2.5 py-1 rounded-lg text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
              >
                Rải đều 5 tuần (20% / tuần)
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button
                onClick={handleResetWeeklyMatrix}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Khôi phục mẫu</span>
              </button>
              <button
                onClick={handleSyncWeeklyMatrixToStore}
                className="px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <SendHorizonal className="w-3.5 h-3.5 text-blue-600" />
                <span>Đồng bộ lịch tuần</span>
              </button>
              <button
                onClick={handleSaveWeeklyMatrix}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-amber-300" />
                <span>Lưu 5 tuần</span>
              </button>
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
                          <span className={`text-2xs font-semibold ${
                            isBudgetSafe ? 'text-emerald-700' : 'text-rose-700'
                          }`}>
                            {isBudgetSafe ? '✓ Trong trần' : 'Vượt trần'}
                          </span>
                        </td>
                      </tr>
                    );
                  })()}
                </tfoot>
              </table>
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
      {/* 5. TAB TRÌNH BRAND 1-SHEET (MONTHLY CONTENT & KEY VISUAL PLAN)            */}
      {/* ========================================================================= */}
      {activeTab === 'BRAND_ONE_SHEET' && (
        <BrandOneSheetPlanView
          brandName={(planState.parentBrand || planState.brandName).split('_')[0].trim()}
          month={planState.month}
          storePlans={monthlyPlans.map(p => (p.id === planState.id ? planState : p))}
          storePortfolios={storePortfolios}
          campaigns={effectiveCampaigns}
          onSaveOneSheetData={(savedData) => {
            setPlanState(prev => ({ ...prev, oneSheetPlanData: savedData }));
            setMonthlyPlans(prev =>
              prev.map(p => (p.id === planState.id ? { ...p, oneSheetPlanData: savedData } : p))
            );
          }}
          onOpenCampaignModal={() => {
            const activeCamp = effectiveCampaigns.find(c => c.id === planState.campaignId);
            setEditingCampaignForModal(activeCamp || null);
            setIsCampaignModalOpen(true);
          }}
          onNotify={notify}
        />
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
                  <h3 className="text-base font-semibold">Phân bổ kế hoạch cho Team booking</h3>
                  <p className="text-xs text-ink-2 mt-0.5">
                    Thương hiệu: <strong className="text-ink">{planState.brandName.split('_')[0]}</strong> · {planState.month} - {planState.week} · Tổng {totalAllocatedContents} video ({formatVndShort(totalAllocatedBudget)}) · Trưởng nhóm: <strong className="text-ink">{planState.bookingLeader || (planState.hasBookingLeader ? 'Nguyễn Thị Ngọc Tâm' : 'Không có leader')}</strong> · PIC chính: <strong className="text-ink">{planState.primaryPic || planState.pic}</strong>
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
                                  <span className="text-2xs font-mono text-blue-700">
                                    · PIC
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
                                    <span className="text-2xs font-code text-ink-3 shrink-0">
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
                                    placeholder="Ghi chú tác nghiệp (VD: KOC lên link bio, reup Shopee...)"
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

      <OperationalReportDrawer
        isOpen={isPlanReportOpen}
        onClose={() => setIsPlanReportOpen(false)}
        purposeId="PLAN_ADS_ANALYSIS"
        moduleTitle={`Thẩm Định Kế Hoạch Tháng: ${planState.brandName} (${planState.month})`}
        moduleSubtitle="Kiểm tra hạn mức Order Gross/Net, tỷ trọng khung lương KL1–KL7 và luồng phê duyệt B2C"
        contextDataText={planReportContextText}
        onNotify={onNotify}
      />

      <CampaignCreateModal
        isOpen={isCampaignModalOpen}
        onClose={() => {
          setIsCampaignModalOpen(false);
          setEditingCampaignForModal(null);
        }}
        initialCampaign={editingCampaignForModal}
        defaultBrand={(planState.brandName || '').split('_')[0].trim()}
        onCampaignCreated={(savedCampaign) => {
          updateCampaigns(prev => {
            const exists = prev.some(c => c.id === savedCampaign.id);
            return exists ? prev.map(c => (c.id === savedCampaign.id ? savedCampaign : c)) : [savedCampaign, ...prev];
          });
          const ph = getCampaignPhaseForMonth(savedCampaign, planState.month);
          const updated: Partial<InputPlanBreakdownState> = {
            hasCampaign: true,
            campaignId: savedCampaign.id,
            campaignCode: savedCampaign.code,
            campaignTitle: savedCampaign.title,
            campaignPhaseName: ph?.phaseName || `Giai đoạn ${planState.month}`,
          };
          setPlanState(prev => ({ ...prev, ...updated }));
          setMonthlyPlans(prev => prev.map(p => (p.id === planState.id ? { ...p, ...updated } : p)));
          setIsCampaignModalOpen(false);
          setEditingCampaignForModal(null);
          notify(`Đã lưu & gắn Chiến dịch [${savedCampaign.code}] ${savedCampaign.title} vào kế hoạch tháng ${planState.month}!`);
        }}
      />
    </div>
  );
};
