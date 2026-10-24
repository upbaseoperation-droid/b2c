'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { formatVndShort, formatNumber, getVietnamDateTimeShort } from '../../lib/format';
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
  PlanTierKey,
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
import { PlanWeeklyBreakdown } from './PlanWeeklyBreakdown';
import {
  TIER_KEYS,
  checkBreakdownForSubmit,
  comparePlanWithNewReference41,
  distributeItemsToWeeks,
  hasBreakdownData,
  resolveWeekRows,
} from '../../lib/planBreakdownRules';
import {
  INITIAL_MONTHLY_PLANS,
  getPlanVersionSnapshots,
  enrichPlanWithVersions,
} from '../../lib/monthlyPlanData';
import { useMonthlyPlanSync } from '../../lib/useMonthlyPlanSync';
import { filterScopedPlans } from '../../lib/rbacScope';
import { PlanApprovalStepper } from './PlanApprovalStepper';
import { PlanHistoryModal } from './PlanHistoryModal';
import { PlanSyncBadge } from './PlanSyncBadge';
import { resolveStoreBookingLeader } from '../../lib/larkPaymentRequestEngine';
import {
  ConfirmDialog,
  Modal,
  Presence,
  Status,
  PageHeaderNav,
  PageActions,
} from '../ui';
import { StorePlanMindmap } from './StorePlanMindmap';

interface FormattedNumberInputProps {
  value: number;
  onChange: (val: number) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  step?: number;
}

const FormattedNumberInput: React.FC<FormattedNumberInputProps> = ({
  value,
  onChange,
  disabled = false,
  className = '',
  placeholder,
}) => {
  const [localText, setLocalText] = useState<string>(() => (value ? formatNumber(value) : '0'));
  const isFocusedRef = React.useRef(false);

  useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalText(value ? formatNumber(value) : '0');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = raw ? Number(raw) : 0;
    setLocalText(raw ? formatNumber(num) : '');
    onChange(num);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      disabled={disabled}
      placeholder={placeholder}
      value={localText}
      onFocus={() => {
        isFocusedRef.current = true;
      }}
      onBlur={() => {
        isFocusedRef.current = false;
        setLocalText(value ? formatNumber(value) : '0');
      }}
      onChange={handleChange}
      className={className}
    />
  );
};

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
  const scopedStudioPlans = useMemo(
    () => filterScopedPlans(monthlyPlans, currentUser, storePortfolios),
    [monthlyPlans, currentUser, storePortfolios]
  );
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
    const timer = window.setTimeout(() => {
      const merged = monthlyPlans.map(p => (p.id === planState.id ? planState : p));
      onPlansChange(merged);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [monthlyPlans, planState, onPlansChange]);

  // Vai trò thao tác trên kế hoạch: Booking PIC hoặc Trưởng phòng
  const [currentRole, setCurrentRole] = useState<PlanDiscussionRole>('BOOKING');
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

  // Đồng bộ vai trò thao tác theo tài khoản đang đăng nhập
  const [prevUserRole, setPrevUserRole] = useState<string | undefined>(undefined);
  if (currentUser?.role !== prevUserRole) {
    setPrevUserRole(currentUser?.role);
    if (currentUser) {
      if (['ADMIN', 'MANAGER'].includes(currentUser.role)) {
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
            items: structuredClone(planState.items || []),
          }
        : s
    );

    const budgetRatio =
      planState.totalTargetBudget > 0 ? snap.totalTargetBudget / planState.totalTargetBudget : 1;
    const restoredItems =
      snap.items && snap.items.length > 0
        ? structuredClone(snap.items)
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
      return enriched;
    },
    onReplacePlan: (plan) => {
      setMonthlyPlans(prev => prev.map(p => (p.id === plan.id ? plan : p)));
      setPlanState(prev => (prev.id === plan.id ? plan : prev));
    }
  });

  // State thu gọn / mở rộng chi tiết Campaign & Key Visual ở Tab 1
  const [isCampaignDetailExpanded, setIsCampaignDetailExpanded] = useState(false);

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
    const gate = checkBreakdownForSubmit(planState);
    if (!gate.canSubmit) {
      notify(gate.reason || 'Chưa đủ điều kiện gửi duyệt.');
      return;
    }
    const actor = currentUser?.name || planState.pic || 'Nhân viên Booking';
    const now = new Date().toISOString();
    const finalNote = submissionNote.trim() || `Đã trao đổi thống nhất với Growth (${'Growth Lead'}) về các chỉ số GMV và ngân sách B2C. Kính gửi Quản lý phê duyệt.`;
    const log = `Nhân viên (${actor}) đã GỬI DUYỆT QUẢN LÝ sau khi thống nhất chỉ số với Growth team: "${finalNote}"`;

    // Gian có Trưởng nhóm: sơ duyệt trước, rồi mới tới Giám đốc. Gian không có Trưởng nhóm: lên thẳng Giám đốc.
    const needsLeader = planState.hasBookingLeader !== false && Boolean(planState.bookingLeader);
    const nextStatus: MonthlyPlanStatus = needsLeader ? 'PENDING_PRE_APPROVAL' : 'PENDING_APPROVAL';
    handleStatusChangeForPlan(planState.id, nextStatus, log, finalNote);

    setPlanState(prev => ({
      ...prev,
      status: nextStatus,
      leaderApprovalStatus: needsLeader ? 'CHƯA_DUYỆT' : 'KHÔNG_ÁP_DỤNG',
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

  // LAYER 1: Khung Chỉ Số Cốt Lõi (Ưu tiên đọc số thực tế từ Bảng 4.1 Plan order tổng nếu có)
  const layer1Metrics: CorePlanMetricsLayer1 = useMemo(() => {
    const raw = planState.coreMetricsLayer1;
    const ref41 = planState.reference41;
    const refMultiQty = ref41?.multiPlatform
      ? Object.values(ref41.multiPlatform).reduce((s, m) => s + (m?.affQty || 0), 0)
      : 0;
    const refMultiNet = ref41?.multiPlatform
      ? Object.values(ref41.multiPlatform).reduce((s, m) => s + (m?.costNet || 0), 0)
      : 0;
    const refLiveSelfSessions =
      (ref41?.liveSelf?.inhouse3h || 0) +
      (ref41?.liveSelf?.ctv2h || 0) +
      (ref41?.liveSelf?.brand2h || 0);
    const refLiveTotalSessions = (ref41?.liveSessions || 0) + refLiveSelfSessions;
    const refLiveTotalNet = (ref41?.liveCostNet || 0) + (ref41?.liveSelf?.totalCostNet || 0);
    const refTotalNet = ref41
      ? ref41.affCostNet + ref41.selfCostNet + refMultiNet + refLiveTotalNet
      : planState.totalTargetBudget || 0;
    const refNmv =
      ref41?.gmvTargets?.nmvPlan ||
      (ref41?.gmvTargets
        ? (ref41.gmvTargets.videoAff || 0) +
          (ref41.gmvTargets.videoSelf || 0) +
          (ref41.gmvTargets.liveInhouse || 0) +
          (ref41.gmvTargets.liveCtv || 0)
        : 0) ||
      planState.targetGmv ||
      0;

    const defaultAffBudget =
      ref41 !== undefined
        ? ref41.affCostNet
        : (planState.budgetAffiliate ?? (channelTotals.affiliatePaid.budget || Math.round(planState.totalTargetBudget * 0.65)));
    const defaultSelfBudget =
      ref41 !== undefined
        ? ref41.selfCostNet
        : (planState.budgetSelfChannel ?? (channelTotals.selfChannel.budget || Math.round(planState.totalTargetBudget * 0.20)));
    const defaultMultiBudget =
      ref41 !== undefined
        ? refMultiNet
        : (channelTotals.multiPlatform.budget || Math.max(0, planState.totalTargetBudget - defaultAffBudget - defaultSelfBudget));
    const defaultLiveBudget =
      ref41 !== undefined ? refLiveTotalNet : (channelTotals.livestream.budget || 0);

    return {
      isLocked: raw?.isLocked ?? Boolean(planState.status && !['DRAFT', 'REVISION_REQUESTED'].includes(planState.status)),
      lockedBy: raw?.lockedBy,
      lockedAt: raw?.lockedAt,
      alignmentNote: raw?.alignmentNote ?? (planState.growthAlignmentNotes || ''),
      targetNmvTotal: raw?.targetNmvTotal ?? refNmv,
      targetGmvAffiliate:
        raw?.targetGmvAffiliate ??
        (ref41?.gmvTargets?.videoAff !== undefined ? ref41.gmvTargets.videoAff : Math.round(refNmv * 0.72)),
      targetGmvSelfChannel:
        raw?.targetGmvSelfChannel ??
        (ref41?.gmvTargets?.videoSelf !== undefined ? ref41.gmvTargets.videoSelf : Math.round(refNmv * 0.18)),
      targetGmvLivestream:
        raw?.targetGmvLivestream ??
        (ref41?.gmvTargets
          ? (ref41.gmvTargets.liveInhouse || 0) + (ref41.gmvTargets.liveCtv || 0)
          : Math.round(refNmv * 0.10)),
      pnlTotalBudgetNet: raw?.pnlTotalBudgetNet ?? (refTotalNet || planState.totalTargetBudget || 0),
      budgetAffiliateNet: raw?.budgetAffiliateNet ?? defaultAffBudget,
      budgetSelfChannelNet: raw?.budgetSelfChannelNet ?? defaultSelfBudget,
      budgetMultiPlatformNet: raw?.budgetMultiPlatformNet ?? defaultMultiBudget,
      budgetLivestreamNet: raw?.budgetLivestreamNet ?? defaultLiveBudget,
      budgetAdsNet: raw?.budgetAdsNet ?? (planState.budgetAdsTotal || 0),
      targetAdsRoas: raw?.targetAdsRoas ?? (planState.multiPartySignOff?.media?.targetRoas || 4.5),
      qtyAffiliatePaid: raw?.qtyAffiliatePaid ?? (ref41 ? ref41.cast : channelTotals.affiliatePaid.qty),
      qtyFocSample: raw?.qtyFocSample ?? (ref41 ? ref41.foc : channelTotals.tapFreecast.qty),
      qtySelfChannel: raw?.qtySelfChannel ?? (ref41 ? ref41.selfVideos : channelTotals.selfChannel.qty),
      qtyMultiPlatform: raw?.qtyMultiPlatform ?? (ref41 ? refMultiQty : channelTotals.multiPlatform.qty),
      qtyLivestreamSessions:
        raw?.qtyLivestreamSessions ?? (ref41 ? refLiveTotalSessions : channelTotals.livestream.qty),
    };
  }, [planState, channelTotals]);

  const isLayer1Locked = Boolean(isPlanLocked || layer1Metrics.isLocked);
  const totalLayer1ChannelBudgetNet =
    layer1Metrics.budgetAffiliateNet +
    layer1Metrics.budgetSelfChannelNet +
    layer1Metrics.budgetMultiPlatformNet +
    layer1Metrics.budgetLivestreamNet;
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
    const actor = currentUser?.name || planState.pic || 'Nhóm Kế Hoạch';
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
      authorTitle: currentRole === 'LEAD' ? 'Quản lý B2C' : 'Booking PIC',
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

  const handleDistributeStep2ToWeeksAndOpen = () => {
    const nextRows = distributeItemsToWeeks(planState, 'EVEN');
    setPlanState(prev => ({ ...prev, weeklyBreakdown: nextRows }));
    setActiveTab('WEEKLY_MATRIX');
    notify('Đã tự động phân bổ số lượng & ngân sách từ Bước 2 xuống 4 tuần.');
  };

  const handleOpenWeeklyMatrixStep = () => {
    if (!isPlanLocked) {
      const currentRows = resolveWeekRows(planState);
      const hasStep2Data = (planState.items || []).some(it => !it.id.startsWith('WB-') && (it.qty > 0 || it.totalBudget > 0));
      if (!hasBreakdownData(currentRows) && hasStep2Data) {
        const nextRows = distributeItemsToWeeks(planState, 'EVEN');
        setPlanState(prev => ({ ...prev, weeklyBreakdown: nextRows }));
        notify('Đã tự động chia đều số lượng & ngân sách Bước 2 xuống 4 tuần (có thể đổi tỷ trọng hoặc sửa từng ô).');
      }
    }
    setActiveTab('WEEKLY_MATRIX');
  };

  const handleGenerateBookingSlots = () => {
    const generatedSlots: StaffDetailedPlanItem[] = [];
    const brandOnly = planState.brandName.split('_')[0] || planState.brandName;
    const weekRows = resolveWeekRows(planState);
    const weekKeys: Array<'W1' | 'W2' | 'W3' | 'W4'> = ['W1', 'W2', 'W3', 'W4'];

    planState.items
      .filter(it => !it.id.startsWith('WB-'))
      .forEach(item => {
        if (item.qty <= 0) return;
        const assignee = item.assignedStaff || planState.pic;
        const salaryGrade = (item.salaryGrade || (item.tierCode.startsWith('KL') ? item.tierCode : 'KL3')) as SalaryGrade;
        const kocTier = ['KL6', 'KL7'].includes(salaryGrade)
          ? 'TIER_1_CELEB'
          : ['KL4', 'KL5'].includes(salaryGrade)
          ? 'TIER_2_MACRO'
          : salaryGrade === 'KL3'
          ? 'TIER_3_MICRO'
          : 'TIER_4_AFFILIATE';

        // Tính tỷ trọng từng tuần từ bảng phân rã tuần (nếu đã chia tuần)
        const upperTier = item.tierCode.toUpperCase() as PlanTierKey;
        const rawWeekWeights = weekKeys.map((_, wi) => {
          const r = weekRows[wi];
          if (!r) return 1;
          if (item.channel === 'TIKTOK' && TIER_KEYS.includes(upperTier)) {
            return r.tiers?.[upperTier]?.qty || 0;
          }
          if (item.tierCode.includes('TAP') || item.id === 'row-tt-tap' || item.unitCost === 0) {
            return (r.foc?.tapBrand || 0) + (r.foc?.tap || 0) + (r.foc?.tapUp || 0);
          }
          if (item.channel === 'SELF_CHANNEL') {
            return (
              (r.self?.reviewVoice || 0) +
              (r.self?.videoAi || 0) +
              (r.self?.videoRemix || 0) +
              (r.self?.videoToLive || 0) +
              (r.self?.nhacText || 0)
            );
          }
          if (item.channel === 'LIVESTREAM') {
            return r.live?.sessions || 0;
          }
          return 1;
        });

        const weightSum = rawWeekWeights.reduce((s, w) => s + w, 0);
        const normWeights =
          weightSum > 0 ? rawWeekWeights.map(w => w / weightSum) : weekKeys.map(() => 0.25);

        let rem = item.qty;
        const slotsPerWeek = normWeights.map((w, idx) => {
          if (idx === normWeights.length - 1) return Math.max(0, rem);
          const c = Math.min(rem, Math.max(0, Math.round(item.qty * w)));
          rem -= c;
          return c;
        });

        let slotSeq = 0;
        slotsPerWeek.forEach((weekCount, wi) => {
          const targetWeek = weekKeys[wi] || 'W1';
          for (let k = 0; k < weekCount; k++) {
            slotSeq += 1;
            generatedSlots.push({
              id: `slot-auto-${Date.now()}-${item.id}-${slotSeq}`,
              staffName: assignee,
              month: planState.month,
              brandName: brandOnly,
              tier: kocTier,
              salaryGrade: salaryGrade,
              targetWeek,
              kocStageName: `[Slot ${item.tierLabel.split(':')[0]}] #${slotSeq} (${targetWeek})`,
              channelId: `@koc_${item.platform.toLowerCase()}_${slotSeq}`,
              tepKenh: 'Beauty',
              contentPillar: item.contentFormat,
              budgetEstimated: item.unitCost,
              targetGmv: item.unitCost * item.expectedRoiMultiplier,
              status: 'DRAFT',
              leadNotes: item.staffNotes
                ? `[Giao bởi PIC ${planState.pic} · ${targetWeek}]: ${item.staffNotes} (${item.platform} - ${item.contentFormat})`
                : `[Giao bởi PIC ${planState.pic} · ${targetWeek}]: Phân rã từ Input Plan (${item.platform} - ${item.contentFormat})`,
              updatedAt: getVietnamDateTimeShort(),
            });
          }
        });
      });

    if (onGenerateDealsFromPlan && generatedSlots.length > 0) {
      onGenerateDealsFromPlan(generatedSlots);
    }

    const assignedCount = staffAllocationSummary.filter(s => s.videoCount > 0).length;
    notify(`PIC ${planState.pic} đã bàn giao ${generatedSlots.length} slot KOC theo tuần (W1–W4) cho ${assignedCount} nhân sự thực thi!`);
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
    if (currentRole === 'LEAD') {
      authorName = (['ADMIN', 'MANAGER'].includes(currentUser?.role || '') ? currentUser?.name : null) || targetPlan.approvedBy || 'Đặng Thị Yến Nhi';
      authorTitle = 'Giám đốc Marketing B2C';
    } else if (currentRole === 'BOOKING') {
      authorName = (currentUser?.role === 'BOOKING_MEMBER' ? currentUser.name : null) || targetPlan.pic || 'Lê Phương Thảo';
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
          onPlanOrderUploaded={() => planSync.reload()}
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
            if (selected.reference41 || (selected.weeklyBreakdown && selected.weeklyBreakdown.length > 0)) {
              setActiveTab('WEEKLY_MATRIX');
            }
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
        contextDataText={planReportContextText}
        onNotify={onNotify}
      />
      </div>
    );
  }

  // MÀN HÌNH 2: PHÂN RÃ KẾ HOẠCH CHI TIẾT
  const openSubmitToManager = () => {
    const gate = checkBreakdownForSubmit(planState);
    if (!gate.canSubmit) {
      notify(gate.reason || 'Chưa đủ điều kiện gửi duyệt.');
      return;
    }
    setSubmissionNote(`Em đã phân rã xong 4 kênh theo đúng chỉ tiêu GMV (${(planState.targetGmv / 1000000).toLocaleString('vi-VN')} Tr) và ngân sách trần (${(planState.totalTargetBudget / 1000000).toLocaleString('vi-VN')} Tr) đã thống nhất với Growth Lead. Kính gửi Quản lý phê duyệt giải ngân.`);
    setGrowthAlignedConfirm(true);
    setIsSubmitToManagerModalOpen(true);
  };
  const planStatus = planState.status || 'DRAFT';
  const userRole = currentUser?.role || '';
  const isLeadUser = ['ADMIN', 'MANAGER'].includes(userRole) || currentRole === 'LEAD';
  const isApprovedStatus = ['APPROVED', 'LEAD_APPROVED', 'BRAND_APPROVED', 'IN_EXECUTION', 'COMPLETED'].includes(planStatus);
  const resolvedBookingLeader = resolveStoreBookingLeader(planState.storeName || planState.brandName, planState.bookingLeader);
  const hasLeader = Boolean(resolvedBookingLeader);
  const isPlanLeaderUser = hasLeader && Boolean(planState.bookingLeader) && (currentUser?.name || '').trim().toLowerCase() === (planState.bookingLeader || '').trim().toLowerCase();
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
    <div className="space-y-2 animate-in fade-in duration-200 pb-2">
      {/* ========================================================================= */}
      {/* 1. ĐẨY ĐIỀU HƯỚNG GIAN HÀNG & PHIÊN BẢN LÊN TOPHEADER CẠNH TIÊU ĐỀ        */}
      {/* ========================================================================= */}
      <PageHeaderNav>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <span className="text-slate-300 hidden sm:inline">|</span>
          <button
            type="button"
            onClick={() => {
              setMonthlyPlans(prev => prev.map(p => p.id === planState.id ? planState : p));
              setIsShowingStudio(false);
              if (planSync.isPersistent) void planSync.saveNow();
            }}
            className="h-8 px-2 sm:px-2.5 shrink-0 inline-flex items-center gap-1 rounded-lg bg-surface hover:bg-sunken border border-line text-ink text-xs font-semibold transition cursor-pointer"
            title="Quay lại danh sách kế hoạch tháng"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Danh sách</span>
          </button>

          <select
            value={planState.id}
            onChange={(e) => {
              const found = scopedStudioPlans.find(p => p.id === e.target.value);
              if (found) {
                setMonthlyPlans(prev => prev.map(p => p.id === planState.id ? planState : p));
                setPlanState(found);
              }
            }}
            className="h-8 px-2 sm:px-2.5 rounded-lg bg-surface hover:bg-sunken border border-line font-semibold text-xs text-ink focus:outline-none cursor-pointer max-w-[140px] sm:max-w-[200px] xl:max-w-[250px] truncate"
            title="Chuyển sang gian hàng khác"
          >
            {scopedStudioPlans.map(p => (
              <option key={p.id} value={p.id}>
                {p.storeName || p.brandName} · {p.month}
              </option>
            ))}
          </select>

          <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-sunken border border-line shrink-0">
            {studioVersionSnapshots.map((snap) => {
              const isCurrent = snap.versionCode === activeVersionCode;
              return (
                <button
                  key={snap.versionCode}
                  type="button"
                  onClick={() => handleSwitchVersionInStudio(snap)}
                  className={`px-2 py-0.5 rounded-md text-2xs font-semibold transition cursor-pointer ${
                    isCurrent
                      ? 'bg-accent text-white shadow-2xs'
                      : 'text-ink-2 hover:text-ink hover:bg-surface'
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
              className="px-2 py-0.5 rounded-md text-2xs font-semibold text-accent hover:bg-surface transition inline-flex items-center gap-1 cursor-pointer"
              title="So sánh các phiên bản hoặc tạo phiên bản mới trong tháng"
            >
              <Layers className="w-3 h-3" />
              <span className="hidden md:inline">Bản mới</span>
            </button>
          </div>
        </div>
      </PageHeaderNav>

      {/* 1B. ĐẨY CÁC THAO TÁC TOÀN CỤC LÊN TOPHEADER (PAGE ACTIONS) */}
      <PageActions>
        <div className="hidden md:block">
          <PlanSyncBadge
            status={planSync.status}
            lastSavedAt={planSync.lastSavedAt}
            errorMessage={planSync.errorMessage}
            onRetry={() => void planSync.saveNow()}
          />
        </div>

        <button
          type="button"
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
          title="Lưu kế hoạch"
          className="inline-flex items-center gap-1.5 h-8 px-2 sm:px-2.5 rounded-lg bg-surface hover:bg-sunken text-ink border border-line font-semibold text-xs transition disabled:opacity-60 cursor-pointer"
        >
          <Save className="w-3.5 h-3.5 text-ink-3" />
          <span className="hidden sm:inline">Lưu</span>
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsActionMenuOpen(prev => !prev)}
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-surface hover:bg-sunken text-ink border border-line font-semibold text-xs transition cursor-pointer"
            aria-haspopup="menu"
            aria-expanded={isActionMenuOpen}
          >
            <span>Thao tác</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isActionMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {isActionMenuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setIsActionMenuOpen(false)} />
              <div role="menu" className="absolute right-0 mt-1.5 w-60 z-40 bg-surface border border-line rounded-xl shadow-lg py-1 text-xs">
                {[
                  {
                    label: 'Báo cáo thẩm định kế hoạch',
                    icon: <FileText className="w-3.5 h-3.5" />,
                    onClick: () => setIsPlanReportOpen(true),
                    disabled: false,
                    hint: undefined as string | undefined
                  },
                  ...(onOpenListingForPlan ? [{
                    label: 'Triển khai Listing KOC (KL)',
                    icon: <UserCheck className="w-3.5 h-3.5" />,
                    onClick: () => onOpenListingForPlan(planState),
                    disabled: false,
                    hint: undefined as string | undefined
                  }] : []),
                  {
                    label: 'Xuất Excel 1-Sheet Trình Brand',
                    icon: <Download className="w-3.5 h-3.5" />,
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
                  ...(isLeadUser
                    ? [
                        {
                          label: 'Phân bổ cho team',
                          icon: <Users className="w-3.5 h-3.5" />,
                          onClick: () => setIsAllocationModalOpen(true),
                          disabled: isPlanLocked,
                          hint: isPlanLocked ? 'Đã chốt' : undefined,
                        },
                      ]
                    : []),
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
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-ink hover:bg-sunken disabled:text-ink-3 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                  >
                    <span className="text-ink-3">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.hint && <span className="text-2xs text-ink-3">{item.hint}</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {isPlanLocked ? (
          <Status tone="positive">{`Đã chốt ${activeVersionCode}`}</Status>
        ) : planStatus === 'PENDING_PRE_APPROVAL' ? (
          isPlanLeaderUser || isLeadUser ? (
            <button
              type="button"
              onClick={() => setActiveTab('OVERVIEW')}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Xem &amp; sơ duyệt</span>
            </button>
          ) : (
            <Status tone="warning">Chờ Trưởng nhóm sơ duyệt</Status>
          )
        ) : planStatus === 'PENDING_APPROVAL' ? (
          isLeadUser ? (
            <button
              type="button"
              onClick={() => setActiveTab('OVERVIEW')}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer"
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
            type="button"
            onClick={openSubmitToManager}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer"
          >
            <SendHorizonal className="w-3.5 h-3.5" />
            <span>{planState.reference41?.isGrowthLocked === false ? 'Chờ Chốt 4.1' : 'Gửi duyệt'}</span>
          </button>
        )}
      </PageActions>

      {/* ========================================================================= */}
      {/* 2. THANH QUY TRÌNH 5 BƯỚC GỌN 1 DÒNG                                      */}
      {/* ========================================================================= */}
      {/* CẢNH BÁO ĐỐI SOÁT PLAN 4.1 (CHƯA CHỐT HOẶC ĐÃ DUYỆT NHƯNG LỆCH 4.1 MỚI) */}
      {planState.pendingReference41 && (() => {
        const pendingDiff = comparePlanWithNewReference41(planState, planState.pendingReference41);
        return (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-950 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="font-semibold text-rose-800">
                Cảnh báo đối soát: File 4.1 Plan order tổng mới tải lên thay đổi số liệu so với bản đã duyệt (Đang giữ nguyên bản đã duyệt)
              </div>
              <div className="text-rose-700">
                Chênh lệch ghi nhận: <strong>{pendingDiff.diffSummary.join(' · ') || 'Có thay đổi thông số 4.1'}</strong>
              </div>
            </div>
            {isLeadUser && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const nextRef = planState.pendingReference41!;
                    const nextBudget = nextRef.affCostNet + nextRef.selfCostNet + nextRef.liveCostNet;
                    const nextContents = nextRef.cast + nextRef.foc + nextRef.selfVideos + nextRef.liveSessions;
                    const actorName = currentUser?.name || 'Giám đốc Marketing B2C';
                    const unlockMsg: PlanDiscussionMessage = {
                      id: `DISC-UNLOCK41-${Date.now()}`,
                      authorName: actorName,
                      authorRole: 'LEAD',
                      authorTitle: 'Quản lý B2C',
                      content: `Quản lý (${actorName}) đã mở khóa kế hoạch đã duyệt và cập nhật theo số liệu Bảng 4.1 mới (${pendingDiff.diffSummary.join('; ')}). Chuyển về trạng thái Cần sửa để chuyên viên điều chỉnh phân rã tuần.`,
                      type: 'REVISION_REQUEST',
                      timestamp: new Date().toISOString(),
                      tags: ['Cập nhật 4.1 mới', 'Mở khóa'],
                    };
                    const updated: InputPlanBreakdownState = {
                      ...planState,
                      reference41: nextRef,
                      pendingReference41: undefined,
                      totalTargetBudget: nextBudget,
                      totalTargetContents: nextContents,
                      budgetAffiliate: nextRef.affCostNet,
                      budgetSelfChannel: nextRef.selfCostNet,
                      isVersionLocked: false,
                      status: 'REVISION_REQUESTED',
                      revisionNotes: 'Mở khóa cập nhật theo Bảng 4.1 Plan order tổng mới',
                      discussions: [unlockMsg, ...(planState.discussions || [])],
                      updatedAt: new Date().toISOString(),
                    };
                    setPlanState(updated);
                    setMonthlyPlans(prev => prev.map(p => (p.id === updated.id ? updated : p)));
                    notify(`Đã mở khóa và cập nhật hạn mức theo file 4.1 mới cho "${planState.storeName || planState.brandName}".`);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 font-semibold text-xs transition cursor-pointer"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Mở khóa &amp; Cập nhật theo 4.1 mới</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updated: InputPlanBreakdownState = {
                      ...planState,
                      pendingReference41: undefined,
                      updatedAt: new Date().toISOString(),
                    };
                    setPlanState(updated);
                    setMonthlyPlans(prev => prev.map(p => (p.id === updated.id ? updated : p)));
                    notify('Đã bỏ qua cảnh báo lệch 4.1 mới và giữ nguyên bản đã duyệt.');
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-white hover:bg-rose-100 text-rose-800 px-2.5 py-1.5 font-semibold text-xs transition cursor-pointer"
                >
                  <span>Giữ nguyên bản đã duyệt</span>
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {planState.reference41?.isGrowthLocked === false && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-2">
          <div>
            <strong>Cảnh báo cột &ldquo;Chốt plan&rdquo;:</strong> Dòng Plan order 4.1 của gian hàng này đang ở trạng thái{' '}
            <strong>{planState.reference41.growthLockLabel || 'Chưa chốt'}</strong> (số tạm tính). Hệ thống chỉ cho phép <strong>Lưu Nháp</strong> và khóa gửi duyệt phân rã 4.1.1 cho đến khi tải lên bản 4.1 đã chốt.
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200/90 px-2.5 py-1 shadow-2xs flex items-center justify-between gap-2 flex-wrap">
        <div className="inline-flex max-w-full items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 gap-0.5 shrink-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-2.5 sm:px-3 py-1 rounded-md text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'OVERVIEW'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="sm:hidden">1. Chỉ tiêu</span>
            <span className="hidden sm:inline">1. Chỉ tiêu tháng</span>
            <span className="hidden sm:inline text-2xs font-normal text-slate-500">
              · {isLayer1Locked ? 'Đã chốt' : 'Đang điền'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isDetailBreakdownTab) setActiveTab('ALL_SUMMARY');
            }}
            className={`px-2.5 sm:px-3 py-1 rounded-md text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer shrink-0 ${
              isDetailBreakdownTab
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="sm:hidden">2. Phân bổ</span>
            <span className="hidden sm:inline">2. Phân bổ kênh &amp; KOC</span>
          </button>
          <button
            type="button"
            onClick={handleOpenWeeklyMatrixStep}
            className={`px-2.5 sm:px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer shrink-0 ${
              activeTab === 'WEEKLY_MATRIX'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="sm:hidden">3. Lịch tuần</span>
            <span className="hidden sm:inline">3. Phân rã tuần</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('EXCEL_PREVIEW')}
            className={`px-2.5 sm:px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer shrink-0 ${
              activeTab === 'EXCEL_PREVIEW'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="sm:hidden">4. Tổng hợp</span>
            <span className="hidden sm:inline">4. Biểu mẫu tổng hợp</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('BRAND_ONE_SHEET')}
            className={`px-2.5 sm:px-3 py-1 rounded-md text-xs font-semibold transition inline-flex items-center gap-1 cursor-pointer shrink-0 ${
              activeTab === 'BRAND_ONE_SHEET'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-emerald-800 hover:bg-emerald-50'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="sm:hidden">5. Brand</span>
            <span className="hidden sm:inline">5. Bản duyệt Brand</span>
          </button>
        </div>

        {/* Bên phải thanh bước: Trạng thái 4.1, Đội ngũ 4.1 & lối tắt Listing KOC */}
        <div className="flex items-center gap-1.5 text-2xs text-slate-600 w-full xl:w-auto xl:ml-auto shrink-0 flex-wrap">
          {planState.reference41 && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border font-semibold shrink-0 ${
                planState.reference41.isGrowthLocked === false
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
              title={`Nguồn 4.1: ${planState.reference41.importedBy || 'Bảng 4.1 Plan order tổng'}`}
            >
              <span>4.1: {planState.reference41.isGrowthLocked === false ? (planState.reference41.growthLockLabel || 'Chưa chốt') : 'Đã chốt'}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 max-w-full overflow-x-auto whitespace-nowrap">
            {planState.reference41?.rolePics?.growthPics?.length ? (
              <>
                <span className="hidden sm:inline">Growth: <strong className="text-slate-900">{planState.reference41.rolePics.growthPics.join(', ')}</strong></span>
                <span className="text-slate-300 hidden sm:inline">·</span>
              </>
            ) : null}
            {planState.reference41?.rolePics?.accountPics?.length ? (
              <>
                <span className="hidden xl:inline">Account: <strong className="text-slate-900">{planState.reference41.rolePics.accountPics.join(', ')}</strong></span>
                <span className="text-slate-300 hidden xl:inline">·</span>
              </>
            ) : null}
            <span>Booking PIC: <strong className="text-slate-900">{planState.reference41?.rolePics?.bookingPics?.join(', ') || planState.primaryPic || planState.pic}</strong></span>
            <span className="text-slate-300">·</span>
            <span>
              Leader:{' '}
              <strong className="text-slate-900">
                {hasLeader ? (resolvedBookingLeader || 'Nguyễn Thị Ngọc Tâm') : 'Không có leader'}
              </strong>
            </span>
            {planState.reference41?.rolePics?.livePics?.length ? (
              <>
                <span className="text-slate-300 hidden 2xl:inline">·</span>
                <span className="hidden 2xl:inline">Live: <strong className="text-slate-900">{planState.reference41.rolePics.livePics.join(', ')}</strong></span>
              </>
            ) : null}
          </span>
          {onOpenListingForPlan && (
            <button
              type="button"
              onClick={() => onOpenListingForPlan(planState)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold text-2xs transition cursor-pointer ml-auto sm:ml-0 shrink-0"
              title="Mở bảng Listing KOC theo khung lương KL1–KL7 của kế hoạch này"
            >
              <UserCheck className="w-3 h-3" />
              <span>Listing KOC</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MÀN 1 (LAYER 1): ĐIỀN & THỐNG NHẤT CHỈ SỐ CỐT LÕI (TRƯỚC KHI PHÂN RÃ)     */}
      {/* ========================================================================= */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-2">

          {/* 1.0 THANH CHIẾN DỊCH (CAMPAIGN) & KEY VISUAL GỌN 1 DÒNG (BẤM ĐỂ MỞ CHI TIẾT) */}
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
              <div className="bg-white rounded-xl border border-line px-3 py-2 shadow-2xs space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                    <span className="text-xs font-semibold text-slate-900 uppercase tracking-wide shrink-0">
                      Đầu vào Bảng 4.1 Plan order tổng
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-2xs font-semibold text-slate-700 shrink-0">
                      Chiến dịch {planState.month}:
                    </span>

                    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 shrink-0">
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
                        className={`px-2 py-0.5 rounded-md text-2xs font-semibold transition cursor-pointer ${
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
                          notify(`Đã chuyển kế hoạch ${planState.storeName || planState.brandName} kỳ ${planState.month} sang chế độ Duy trì`);
                        }}
                        className={`px-2 py-0.5 rounded-md text-2xs font-semibold transition cursor-pointer ${
                          !hasCampaignActive ? 'bg-ink text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Duy trì
                      </button>
                    </div>

                    {hasCampaignActive ? (
                      <>
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
                          className="h-7 px-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-accent w-full sm:w-auto sm:max-w-[320px] truncate"
                        >
                          {brandCampaignCandidates.map(c => (
                            <option key={c.id} value={c.id}>
                              [{c.code}] {c.brand} — {c.title}
                            </option>
                          ))}
                        </select>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-2xs font-semibold text-slate-700 truncate max-w-[200px]">
                          {activePhase?.phaseName || planState.campaignPhaseName || `Giai đoạn ${planState.month}`}
                        </span>
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
                            className="text-2xs font-semibold text-accent hover:underline cursor-pointer shrink-0"
                          >
                            Áp hạn mức Phase →
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-slate-600">
                        Kế hoạch định kỳ hàng tháng (không chạy chiến dịch trọng điểm)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {hasCampaignActive && linkedCampaign && (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsCampaignDetailExpanded(prev => !prev)}
                          className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-2xs inline-flex items-center gap-1 transition cursor-pointer"
                        >
                          <span>{isCampaignDetailExpanded ? 'Thu gọn KV & CTKM' : 'Chi tiết KV & CTKM'}</span>
                          {isCampaignDetailExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCampaignForModal(linkedCampaign);
                            setIsCampaignModalOpen(true);
                          }}
                          className="px-2 py-1 rounded-lg border border-line bg-sunken hover:bg-slate-100 text-ink font-semibold text-2xs transition cursor-pointer"
                        >
                          Sửa Campaign
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCampaignForModal(null);
                        setIsCampaignModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold text-2xs transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tạo Campaign</span>
                    </button>
                  </div>
                </div>

                {hasCampaignActive && linkedCampaign && isCampaignDetailExpanded && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                    {/* Cột 1: Thông điệp & CTKM Section 01 */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 space-y-1 text-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-800 uppercase">01. Định hướng &amp; CTKM</span>
                        <span className="font-mono text-2xs text-slate-500">
                          {(linkedCampaign.coveredMonths || []).length > 1
                            ? `${linkedCampaign.coveredMonths?.length} tháng (${linkedCampaign.coveredMonths?.join(', ')})`
                            : `1 tháng (${linkedCampaign.coveredMonths?.[0] || planState.month})`}
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
                    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 space-y-1 text-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 uppercase">02. Phân kỳ tháng {planState.month}</span>
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
                    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 space-y-1 text-2xs">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-stretch">
                  {/* Ô 1: Mục tiêu NMV tổng (4.1) */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <label className="text-2xs font-semibold text-slate-700 block truncate">
                        1. Mục tiêu NMV (4.1)
                      </label>
                      <span className="text-2xs text-slate-500 font-mono truncate block">
                        Aff {formatVndShort(layer1Metrics.targetGmvAffiliate)} · Self {formatVndShort(layer1Metrics.targetGmvSelfChannel)}
                      </span>
                    </div>
                    <FormattedNumberInput
                      disabled={isLayer1Locked}
                      value={layer1Metrics.targetNmvTotal}
                      onChange={(val) => handleUpdateLayer1Metrics({ targetNmvTotal: Math.max(0, val) })}
                      className="w-32 h-7 px-2 py-0.5 text-right rounded-md border border-slate-300 bg-white font-mono text-xs font-semibold text-emerald-700 focus:outline-none focus:border-blue-500 disabled:bg-slate-100 shrink-0"
                    />
                  </div>

                  {/* Ô 2: Tổng trần Ngân sách thúc đẩy Net (4.1) */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <label className="text-2xs font-semibold text-slate-700 block truncate">
                        2. Trần Ngân sách Net (4.1)
                      </label>
                      <span className="text-2xs text-slate-500 font-mono truncate block">
                        Gross: {formatVndShort(Math.round(layer1Metrics.pnlTotalBudgetNet * GROSS_MULTIPLIER))}
                      </span>
                    </div>
                    <FormattedNumberInput
                      disabled={isLayer1Locked}
                      value={layer1Metrics.pnlTotalBudgetNet}
                      onChange={(val) => handleUpdateLayer1Metrics({ pnlTotalBudgetNet: Math.max(0, val) })}
                      className="w-32 h-7 px-2 py-0.5 text-right rounded-md border border-slate-300 bg-white font-mono text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500 disabled:bg-slate-100 shrink-0"
                    />
                  </div>

                  {/* Ô 3: Tổng định mức Sản lượng (4.1) */}
                  {(() => {
                    const ref41 = planState.reference41;
                    const reupTiktok = ref41?.tiktokReup || 0;
                    const reupMulti = ref41?.multiPlatform
                      ? Object.values(ref41.multiPlatform).reduce((s, m) => s + (m?.reupQty || 0), 0)
                      : 0;
                    const totalReup = reupTiktok + reupMulti;
                    const liveAff = ref41?.liveSessions || 0;
                    const liveSelf =
                      (ref41?.liveSelf?.inhouse3h || 0) +
                      (ref41?.liveSelf?.ctv2h || 0) +
                      (ref41?.liveSelf?.brand2h || 0);
                    return (
                      <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-2xs font-semibold text-slate-700 block truncate">
                            3. Sản lượng 4.1 giao
                          </span>
                          <span className="text-2xs text-slate-500 font-mono truncate block">
                            Cast {layer1Metrics.qtyAffiliatePaid} · FOC {layer1Metrics.qtyFocSample} · Reup {totalReup}
                          </span>
                        </div>
                        <div className="text-right font-mono shrink-0">
                          <div className="text-xs font-semibold text-blue-700">
                            {totalLayer1Videos} video
                          </div>
                          <div className="text-2xs text-slate-500">
                            {layer1Metrics.qtyLivestreamSessions} live ({liveAff} Aff · {liveSelf} Self)
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Ô 4: Đối soát tổng khung Layer 1 vs Số tổng 4.1 */}
                  <div className={`rounded-lg border px-2.5 py-1.5 flex items-center justify-between gap-2 ${
                    layer1BudgetGapVsPnl < 0
                      ? 'border-rose-200 bg-rose-50/50'
                      : layer1BudgetGapVsPnl === 0
                      ? 'border-emerald-200 bg-emerald-50/50'
                      : 'border-blue-200 bg-blue-50/40'
                  }`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-2xs font-semibold text-slate-700">4. Đối soát Trần Net</span>
                        <span className={`text-2xs font-mono font-semibold tabular-nums ${
                          layer1BudgetGapVsPnl < 0
                            ? 'text-rose-700'
                            : layer1BudgetGapVsPnl === 0
                            ? 'text-emerald-700'
                            : 'text-blue-700'
                        }`}>
                          ({layer1BudgetGapVsPnl < 0
                            ? `Vượt ${formatVndShort(Math.abs(layer1BudgetGapVsPnl))}`
                            : layer1BudgetGapVsPnl === 0
                            ? 'Khớp 100%'
                            : `Chưa chia ${formatVndShort(layer1BudgetGapVsPnl)}`})
                        </span>
                      </div>
                      <div className="text-2xs text-slate-500 font-mono truncate">
                        Đã phân bổ: {totalAllocatedContents} video · {formatVndShort(totalCombinedBudget)}
                      </div>
                    </div>
                    <div className="text-xs font-semibold font-mono text-slate-900 text-right shrink-0">
                      {formatVndShort(totalLayer1ChannelBudgetNet)}
                      <span className="text-2xs font-normal text-slate-500 block">/ {formatVndShort(layer1Metrics.pnlTotalBudgetNet)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 1B. BẢNG THỐNG NHẤT CHỈ TIÊU CỐT LÕI GIỮA CÁC BÊN */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch">
            <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col justify-between">
              <div>
                <div className="px-3 py-1.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/80">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                      Chỉ tiêu theo kênh (Đối soát Bảng 4.1)
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-2xs font-semibold ${
                      isLayer1Locked ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {isLayer1Locked ? 'Đã chốt chỉ tiêu' : 'Đang điền'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!isPlanLocked && (
                      <button
                        type="button"
                        onClick={handleSyncLayer1ToLayer2}
                        className="px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-2xs font-semibold transition cursor-pointer"
                        title="Cập nhật các dòng KL1-KL7, FOC, Kênh Brand khớp theo bảng chỉ tiêu này"
                      >
                        Đồng bộ sang Phân bổ
                      </button>
                    )}
                  </div>
                </div>

                {/* MOBILE (< 768px): DẠNG THẺ DỌC KHÔNG CẦN CUỘN NGANG */}
                <div className="md:hidden divide-y divide-slate-200">
                  {/* Thẻ 1: Cast trả phí */}
                  <div className="p-2.5 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900">1. Cast trả phí (Affiliate Paid)</div>
                        {(() => {
                          const tiers = planState.reference41?.tiers;
                          const kl4Plus = planState.reference41?.kl4PlusTarget;
                          const activeTiers = tiers
                            ? (['KL1', 'KL2', 'KL3', 'KL4', 'KL5', 'KL6', 'KL7'] as const)
                                .filter(k => (tiers[k] || 0) > 0)
                                .map(k => `${k}:${tiers[k]}`)
                            : [];
                          return (
                            <div className="text-2xs text-slate-500 font-mono">
                              {activeTiers.length > 0 ? activeTiers.join(' · ') : '4.1 KL1–KL7: Chưa tách bậc'}
                              {kl4Plus !== undefined ? ` · KL4+: ${kl4Plus}` : ''}
                            </div>
                          );
                        })()}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setViewMode('TABLE');
                          setActiveTab('AFFILIATE_PAID');
                        }}
                        className="text-2xs font-semibold text-blue-600 shrink-0 cursor-pointer"
                      >
                        KL1–KL7 →
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div>
                        <span className="text-2xs text-slate-500 block">Sản lượng (video)</span>
                        <input
                          type="number"
                          disabled={isLayer1Locked}
                          value={layer1Metrics.qtyAffiliatePaid}
                          onChange={(e) => handleUpdateLayer1Metrics({ qtyAffiliatePaid: Math.max(0, Number(e.target.value) || 0) })}
                          className="w-full h-7 text-right font-mono font-semibold px-2 py-0.5 rounded border border-slate-300 bg-white text-xs text-slate-900 disabled:bg-slate-100"
                        />
                      </div>
                      <div>
                        <span className="text-2xs text-slate-500 block">Trần Net (VNĐ)</span>
                        <FormattedNumberInput
                          disabled={isLayer1Locked}
                          value={layer1Metrics.budgetAffiliateNet}
                          onChange={(val) => handleUpdateLayer1Metrics({ budgetAffiliateNet: Math.max(0, val) })}
                          className="w-full h-7 text-right font-mono font-semibold px-2 py-0.5 rounded border border-slate-300 bg-white text-xs text-blue-700 disabled:bg-slate-100"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-2xs text-slate-500 block">Mục tiêu GMV</span>
                        <FormattedNumberInput
                          disabled={isLayer1Locked}
                          value={layer1Metrics.targetGmvAffiliate}
                          onChange={(val) => handleUpdateLayer1Metrics({ targetGmvAffiliate: Math.max(0, val) })}
                          className="w-full h-7 text-right font-mono font-semibold px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-xs text-emerald-700 disabled:bg-slate-100"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-2xs font-mono text-slate-500">
                      <span>Gross: {formatVndShort(Math.round(layer1Metrics.budgetAffiliateNet * GROSS_MULTIPLIER))}</span>
                      <span className={channelTotals.affiliatePaid.qty === layer1Metrics.qtyAffiliatePaid && channelTotals.affiliatePaid.budget === layer1Metrics.budgetAffiliateNet ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
                        Đã phân bổ: {channelTotals.affiliatePaid.qty} video · {formatVndShort(channelTotals.affiliatePaid.budget)}
                      </span>
                    </div>
                  </div>

                  {/* Thẻ 2: Mẫu FOC (0đ) & TikTok Reup */}
                  <div className="p-2.5 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900">2. Mẫu FOC (0đ) &amp; TikTok Reup</div>
                        {(() => {
                          const fb = planState.reference41?.focBreakdown;
                          const reup = planState.reference41?.tiktokReup || 0;
                          return (
                            <div className="text-2xs text-slate-500 font-mono">
                              TAP Brand: {fb?.tapBrand || 0} · TAP: {fb?.tap || 0} · TAP Up: {fb?.tapUp || 0} · Reup TT: {reup}
                            </div>
                          );
                        })()}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setViewMode('TABLE');
                          setActiveTab('TAP_FREECAST');
                        }}
                        className="text-2xs font-semibold text-blue-600 shrink-0 cursor-pointer"
                      >
                        Chi tiết FOC →
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 items-end">
                      <div>
                        <span className="text-2xs text-slate-500 block">Sản lượng (suất)</span>
                        <input
                          type="number"
                          disabled={isLayer1Locked}
                          value={layer1Metrics.qtyFocSample}
                          onChange={(e) => handleUpdateLayer1Metrics({ qtyFocSample: Math.max(0, Number(e.target.value) || 0) })}
                          className="w-full h-7 text-right font-mono font-semibold px-2 py-0.5 rounded border border-slate-300 bg-white text-xs text-slate-900 disabled:bg-slate-100"
                        />
                      </div>
                      <div>
                        <span className="text-2xs text-slate-500 block">Trần Net (VNĐ)</span>
                        <span className="inline-flex items-center justify-end w-full h-7 px-2 rounded border border-slate-200 bg-slate-50/80 font-mono text-xs font-semibold text-slate-400">
                          0 đ (FOC)
                        </span>
                      </div>
                      <div>
                        <span className="text-2xs text-slate-500 block">Đã phân bổ</span>
                        <span className={`inline-flex items-center justify-end w-full h-7 px-2 rounded border border-slate-200 bg-slate-50 font-mono text-2xs font-semibold ${
                          channelTotals.tapFreecast.qty === layer1Metrics.qtyFocSample ? 'text-emerald-700' : 'text-amber-700'
                        }`}>
                          {channelTotals.tapFreecast.qty} suất
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Thẻ 3: Kênh Brand (Self-channel) */}
                  <div className="p-2.5 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900">3. Kênh Brand (Self-channel)</div>
                        <div className="text-2xs text-slate-500 font-mono">
                          4.1 giao: {planState.reference41?.selfVideos ?? layer1Metrics.qtySelfChannel} video · Net {formatVndShort(planState.reference41?.selfCostNet ?? layer1Metrics.budgetSelfChannelNet)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setViewMode('TABLE');
                          setActiveTab('SELF_CHANNEL');
                        }}
                        className="text-2xs font-semibold text-blue-600 shrink-0 cursor-pointer"
                      >
                        Kênh Brand →
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div>
                        <span className="text-2xs text-slate-500 block">Sản lượng (video)</span>
                        <input
                          type="number"
                          disabled={isLayer1Locked}
                          value={layer1Metrics.qtySelfChannel}
                          onChange={(e) => handleUpdateLayer1Metrics({ qtySelfChannel: Math.max(0, Number(e.target.value) || 0) })}
                          className="w-full h-7 text-right font-mono font-semibold px-2 py-0.5 rounded border border-slate-300 bg-white text-xs text-slate-900 disabled:bg-slate-100"
                        />
                      </div>
                      <div>
                        <span className="text-2xs text-slate-500 block">Trần Net (VNĐ)</span>
                        <FormattedNumberInput
                          disabled={isLayer1Locked}
                          value={layer1Metrics.budgetSelfChannelNet}
                          onChange={(val) => handleUpdateLayer1Metrics({ budgetSelfChannelNet: Math.max(0, val) })}
                          className="w-full h-7 text-right font-mono font-semibold px-2 py-0.5 rounded border border-slate-300 bg-white text-xs text-blue-700 disabled:bg-slate-100"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-2xs text-slate-500 block">Mục tiêu GMV</span>
                        <FormattedNumberInput
                          disabled={isLayer1Locked}
                          value={layer1Metrics.targetGmvSelfChannel}
                          onChange={(val) => handleUpdateLayer1Metrics({ targetGmvSelfChannel: Math.max(0, val) })}
                          className="w-full h-7 text-right font-mono font-semibold px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-xs text-emerald-700 disabled:bg-slate-100"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-2xs font-mono text-slate-500">
                      <span>Gross: {formatVndShort(Math.round(layer1Metrics.budgetSelfChannelNet * GROSS_MULTIPLIER))}</span>
                      <span className={channelTotals.selfChannel.qty === layer1Metrics.qtySelfChannel && channelTotals.selfChannel.budget === layer1Metrics.budgetSelfChannelNet ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
                        Đã phân bổ: {channelTotals.selfChannel.qty} video · {formatVndShort(channelTotals.selfChannel.budget)}
                      </span>
                    </div>
                  </div>

                  {/* Thẻ 4: Đa sàn */}
                  <div className="p-2.5 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900">4. Đa sàn (Shopee, Threads, FB, IG)</div>
                        {(() => {
                          const mp = planState.reference41?.multiPlatform;
                          const sp = mp?.shopee?.affQty || 0;
                          const th = mp?.threads?.affQty || 0;
                          const fb = mp?.facebook?.affQty || 0;
                          const ig = mp?.instagram?.affQty || 0;
                          const reupAll =
                            (mp?.shopee?.reupQty || 0) +
                            (mp?.threads?.reupQty || 0) +
                            (mp?.facebook?.reupQty || 0) +
                            (mp?.instagram?.reupQty || 0);
                          return (
                            <div className="text-2xs text-slate-500 font-mono">
                              Shopee: {sp} · Threads: {th} · FB: {fb} · IG: {ig} (Reup: {reupAll})
                            </div>
                          );
                        })()}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setViewMode('TABLE');
                          setActiveTab('MULTI_PLATFORM');
                        }}
                        className="text-2xs font-semibold text-blue-600 shrink-0 cursor-pointer"
                      >
                        Đa sàn →
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 items-end">
                      <div>
                        <span className="text-2xs text-slate-500 block">Sản lượng (video)</span>
                        <input
                          type="number"
                          disabled={isLayer1Locked}
                          value={layer1Metrics.qtyMultiPlatform}
                          onChange={(e) => handleUpdateLayer1Metrics({ qtyMultiPlatform: Math.max(0, Number(e.target.value) || 0) })}
                          className="w-full h-7 text-right font-mono font-semibold px-2 py-0.5 rounded border border-slate-300 bg-white text-xs text-slate-900 disabled:bg-slate-100"
                        />
                      </div>
                      <div>
                        <span className="text-2xs text-slate-500 block">Trần Net (VNĐ)</span>
                        <FormattedNumberInput
                          disabled={isLayer1Locked}
                          value={layer1Metrics.budgetMultiPlatformNet}
                          onChange={(val) => handleUpdateLayer1Metrics({ budgetMultiPlatformNet: Math.max(0, val) })}
                          className="w-full h-7 text-right font-mono font-semibold px-2 py-0.5 rounded border border-slate-300 bg-white text-xs text-blue-700 disabled:bg-slate-100"
                        />
                      </div>
                      <div>
                        <span className="text-2xs text-slate-500 block">Đã phân bổ</span>
                        <span className={`inline-flex items-center justify-end w-full h-7 px-2 rounded border border-slate-200 bg-slate-50 font-mono text-2xs font-semibold ${
                          channelTotals.multiPlatform.qty === layer1Metrics.qtyMultiPlatform && channelTotals.multiPlatform.budget === layer1Metrics.budgetMultiPlatformNet
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }`}>
                          {channelTotals.multiPlatform.qty} video
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Thẻ 5: Livestream */}
                  <div className="p-2.5 space-y-1.5">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900">5. Livestream (Affiliate &amp; Kênh Brand)</div>
                      {(() => {
                        const ref41 = planState.reference41;
                        const liveAff = ref41?.liveSessions || 0;
                        const ih = ref41?.liveSelf?.inhouse3h || 0;
                        const ctv = ref41?.liveSelf?.ctv2h || 0;
                        const br = ref41?.liveSelf?.brand2h || 0;
                        return (
                          <div className="text-2xs text-slate-500 font-mono">
                            Live Aff: {liveAff} · Inhouse 3h: {ih} · CTV 2h: {ctv}{br > 0 ? ` · Brand 2h: ${br}` : ''}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div>
                        <span className="text-2xs text-slate-500 block">Số phiên live</span>
                        <input
                          type="number"
                          disabled={isLayer1Locked}
                          value={layer1Metrics.qtyLivestreamSessions}
                          onChange={(e) => handleUpdateLayer1Metrics({ qtyLivestreamSessions: Math.max(0, Number(e.target.value) || 0) })}
                          className="w-full h-7 text-right font-mono font-semibold px-2 py-0.5 rounded border border-slate-300 bg-white text-xs text-slate-900 disabled:bg-slate-100"
                        />
                      </div>
                      <div>
                        <span className="text-2xs text-slate-500 block">Trần Net (VNĐ)</span>
                        <FormattedNumberInput
                          disabled={isLayer1Locked}
                          value={layer1Metrics.budgetLivestreamNet}
                          onChange={(val) => handleUpdateLayer1Metrics({ budgetLivestreamNet: Math.max(0, val) })}
                          className="w-full h-7 text-right font-mono font-semibold px-2 py-0.5 rounded border border-slate-300 bg-white text-xs text-blue-700 disabled:bg-slate-100"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-2xs text-slate-500 block">Mục tiêu GMV</span>
                        <FormattedNumberInput
                          disabled={isLayer1Locked}
                          value={layer1Metrics.targetGmvLivestream}
                          onChange={(val) => handleUpdateLayer1Metrics({ targetGmvLivestream: Math.max(0, val) })}
                          className="w-full h-7 text-right font-mono font-semibold px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-xs text-emerald-700 disabled:bg-slate-100"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tổng cộng Mobile */}
                  <div className="p-2.5 bg-slate-50 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-900">
                    <span>Tổng 4.1: {totalLayer1Videos} video + {layer1Metrics.qtyLivestreamSessions} live</span>
                    <span className="font-mono text-blue-700">
                      Net: {formatVndShort(totalLayer1ChannelBudgetNet)} · GMV: {formatVndShort(layer1Metrics.targetNmvTotal)}
                    </span>
                  </div>
                </div>

                {/* DESKTOP/TABLET (>= 768px): BẢNG 6 CỘT THẲNG HÀNG */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-2xs text-slate-500 font-semibold bg-slate-50/50">
                        <th className="py-1.5 px-2.5">Hạng mục &amp; Chi tiết Bảng 4.1</th>
                        <th className="py-1.5 px-2 text-right">Sản lượng</th>
                        <th className="py-1.5 px-2 text-right">Trần Net (VNĐ)</th>
                        <th className="py-1.5 px-2 text-right">Quy đổi Gross</th>
                        <th className="py-1.5 px-2 text-right">Mục tiêu GMV</th>
                        <th className="py-1.5 px-2.5 text-right">Đã phân bổ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {/* Dòng 1: Video KOC trả phí */}
                      <tr className="hover:bg-slate-50/70">
                        <td className="py-1.5 px-2.5">
                          <div className="font-semibold text-slate-900">1. Cast trả phí (Affiliate Paid)</div>
                          {(() => {
                            const tiers = planState.reference41?.tiers;
                            const kl4Plus = planState.reference41?.kl4PlusTarget;
                            const activeTiers = tiers
                              ? (['KL1', 'KL2', 'KL3', 'KL4', 'KL5', 'KL6', 'KL7'] as const)
                                  .filter(k => (tiers[k] || 0) > 0)
                                  .map(k => `${k}:${tiers[k]}`)
                              : [];
                            return (
                              <div className="text-2xs text-slate-500 font-mono truncate">
                                {activeTiers.length > 0 ? activeTiers.join(' · ') : '4.1 KL1–KL7: Chưa tách bậc'}
                                {kl4Plus !== undefined ? ` · KL4+: ${kl4Plus}` : ''}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <input
                              type="number"
                              disabled={isLayer1Locked}
                              value={layer1Metrics.qtyAffiliatePaid}
                              onChange={(e) => handleUpdateLayer1Metrics({ qtyAffiliatePaid: Math.max(0, Number(e.target.value) || 0) })}
                              className="w-16 h-7 text-right font-mono font-semibold px-1.5 py-0.5 rounded border border-slate-300 bg-white text-slate-900 disabled:bg-slate-100"
                            />
                            <span className="w-9 text-left text-2xs text-slate-500">video</span>
                          </div>
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <div className="inline-flex justify-end">
                            <FormattedNumberInput
                              disabled={isLayer1Locked}
                              value={layer1Metrics.budgetAffiliateNet}
                              onChange={(val) => handleUpdateLayer1Metrics({ budgetAffiliateNet: Math.max(0, val) })}
                              className="w-28 h-7 text-right font-mono font-semibold px-2 py-0.5 rounded border border-slate-300 bg-white text-blue-700 disabled:bg-slate-100"
                            />
                          </div>
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-600 tabular-nums">
                          {formatVndShort(Math.round(layer1Metrics.budgetAffiliateNet * GROSS_MULTIPLIER))}
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <div className="inline-flex justify-end">
                            <FormattedNumberInput
                              disabled={isLayer1Locked}
                              value={layer1Metrics.targetGmvAffiliate}
                              onChange={(val) => handleUpdateLayer1Metrics({ targetGmvAffiliate: Math.max(0, val) })}
                              className="w-28 h-7 text-right font-mono font-semibold px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-emerald-700 disabled:bg-slate-100"
                            />
                          </div>
                        </td>
                        <td className="py-1.5 px-2.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-2">
                            <span className={`text-2xs font-mono font-semibold ${
                              channelTotals.affiliatePaid.qty === layer1Metrics.qtyAffiliatePaid && channelTotals.affiliatePaid.budget === layer1Metrics.budgetAffiliateNet
                                ? 'text-emerald-700'
                                : 'text-amber-700'
                            }`}>
                              {channelTotals.affiliatePaid.qty} video · {formatVndShort(channelTotals.affiliatePaid.budget)}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setViewMode('TABLE');
                                setActiveTab('AFFILIATE_PAID');
                              }}
                              className="text-2xs font-semibold text-blue-600 hover:underline cursor-pointer"
                            >
                              KL1–KL7 →
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Dòng 2: Suất gửi mẫu miễn phí FOC 0đ */}
                      <tr className="hover:bg-slate-50/70">
                        <td className="py-1.5 px-2.5">
                          <div className="font-semibold text-slate-900">2. Mẫu FOC (0đ) &amp; TikTok Reup</div>
                          {(() => {
                            const fb = planState.reference41?.focBreakdown;
                            const reup = planState.reference41?.tiktokReup || 0;
                            return (
                              <div className="text-2xs text-slate-500 font-mono truncate">
                                TAP Brand: {fb?.tapBrand || 0} · TAP: {fb?.tap || 0} · TAP Up: {fb?.tapUp || 0} · Reup TT: {reup}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <input
                              type="number"
                              disabled={isLayer1Locked}
                              value={layer1Metrics.qtyFocSample}
                              onChange={(e) => handleUpdateLayer1Metrics({ qtyFocSample: Math.max(0, Number(e.target.value) || 0) })}
                              className="w-16 h-7 text-right font-mono font-semibold px-1.5 py-0.5 rounded border border-slate-300 bg-white text-slate-900 disabled:bg-slate-100"
                            />
                            <span className="w-9 text-left text-2xs text-slate-500">suất</span>
                          </div>
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <span className="inline-flex items-center justify-end w-28 h-7 px-2 rounded border border-slate-200 bg-slate-50/80 font-mono font-semibold text-slate-400">
                            0 đ (FOC)
                          </span>
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-400 tabular-nums">
                          0 đ
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <span className="inline-flex items-center justify-end w-28 h-7 px-2 rounded border border-slate-200 bg-slate-50/80 text-2xs text-slate-400">
                            Gộp GMV Aff
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-2">
                            <span className={`text-2xs font-mono font-semibold ${
                              channelTotals.tapFreecast.qty === layer1Metrics.qtyFocSample ? 'text-emerald-700' : 'text-amber-700'
                            }`}>
                              {channelTotals.tapFreecast.qty} suất
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setViewMode('TABLE');
                                setActiveTab('TAP_FREECAST');
                              }}
                              className="text-2xs font-semibold text-blue-600 hover:underline cursor-pointer"
                            >
                              Chi tiết FOC →
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Dòng 3: Video kênh thương hiệu (Self-channel) */}
                      <tr className="hover:bg-slate-50/70">
                        <td className="py-1.5 px-2.5">
                          <div className="font-semibold text-slate-900">3. Kênh Brand (Self-channel)</div>
                          <div className="text-2xs text-slate-500 font-mono truncate">
                            4.1 giao: {planState.reference41?.selfVideos ?? layer1Metrics.qtySelfChannel} video · Net {formatVndShort(planState.reference41?.selfCostNet ?? layer1Metrics.budgetSelfChannelNet)}
                          </div>
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <input
                              type="number"
                              disabled={isLayer1Locked}
                              value={layer1Metrics.qtySelfChannel}
                              onChange={(e) => handleUpdateLayer1Metrics({ qtySelfChannel: Math.max(0, Number(e.target.value) || 0) })}
                              className="w-16 h-7 text-right font-mono font-semibold px-1.5 py-0.5 rounded border border-slate-300 bg-white text-slate-900 disabled:bg-slate-100"
                            />
                            <span className="w-9 text-left text-2xs text-slate-500">video</span>
                          </div>
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <div className="inline-flex justify-end">
                            <FormattedNumberInput
                              disabled={isLayer1Locked}
                              value={layer1Metrics.budgetSelfChannelNet}
                              onChange={(val) => handleUpdateLayer1Metrics({ budgetSelfChannelNet: Math.max(0, val) })}
                              className="w-28 h-7 text-right font-mono font-semibold px-2 py-0.5 rounded border border-slate-300 bg-white text-blue-700 disabled:bg-slate-100"
                            />
                          </div>
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-600 tabular-nums">
                          {formatVndShort(Math.round(layer1Metrics.budgetSelfChannelNet * GROSS_MULTIPLIER))}
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <div className="inline-flex justify-end">
                            <FormattedNumberInput
                              disabled={isLayer1Locked}
                              value={layer1Metrics.targetGmvSelfChannel}
                              onChange={(val) => handleUpdateLayer1Metrics({ targetGmvSelfChannel: Math.max(0, val) })}
                              className="w-28 h-7 text-right font-mono font-semibold px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-emerald-700 disabled:bg-slate-100"
                            />
                          </div>
                        </td>
                        <td className="py-1.5 px-2.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-2">
                            <span className={`text-2xs font-mono font-semibold ${
                              channelTotals.selfChannel.qty === layer1Metrics.qtySelfChannel && channelTotals.selfChannel.budget === layer1Metrics.budgetSelfChannelNet
                                ? 'text-emerald-700'
                                : 'text-amber-700'
                            }`}>
                              {channelTotals.selfChannel.qty} video · {formatVndShort(channelTotals.selfChannel.budget)}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setViewMode('TABLE');
                                setActiveTab('SELF_CHANNEL');
                              }}
                              className="text-2xs font-semibold text-blue-600 hover:underline cursor-pointer"
                            >
                              Kênh Brand →
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Dòng 4: Đa sàn khác (Shopee, FB, IG, Threads) */}
                      <tr className="hover:bg-slate-50/70">
                        <td className="py-1.5 px-2.5">
                          <div className="font-semibold text-slate-900">4. Đa sàn (Shopee, Threads, FB, IG)</div>
                          {(() => {
                            const mp = planState.reference41?.multiPlatform;
                            const sp = mp?.shopee?.affQty || 0;
                            const th = mp?.threads?.affQty || 0;
                            const fb = mp?.facebook?.affQty || 0;
                            const ig = mp?.instagram?.affQty || 0;
                            const reupAll =
                              (mp?.shopee?.reupQty || 0) +
                              (mp?.threads?.reupQty || 0) +
                              (mp?.facebook?.reupQty || 0) +
                              (mp?.instagram?.reupQty || 0);
                            return (
                              <div className="text-2xs text-slate-500 font-mono truncate">
                                Shopee: {sp} · Threads: {th} · FB: {fb} · IG: {ig} (Reup: {reupAll})
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <input
                              type="number"
                              disabled={isLayer1Locked}
                              value={layer1Metrics.qtyMultiPlatform}
                              onChange={(e) => handleUpdateLayer1Metrics({ qtyMultiPlatform: Math.max(0, Number(e.target.value) || 0) })}
                              className="w-16 h-7 text-right font-mono font-semibold px-1.5 py-0.5 rounded border border-slate-300 bg-white text-slate-900 disabled:bg-slate-100"
                            />
                            <span className="w-9 text-left text-2xs text-slate-500">video</span>
                          </div>
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <div className="inline-flex justify-end">
                            <FormattedNumberInput
                              disabled={isLayer1Locked}
                              value={layer1Metrics.budgetMultiPlatformNet}
                              onChange={(val) => handleUpdateLayer1Metrics({ budgetMultiPlatformNet: Math.max(0, val) })}
                              className="w-28 h-7 text-right font-mono font-semibold px-2 py-0.5 rounded border border-slate-300 bg-white text-blue-700 disabled:bg-slate-100"
                            />
                          </div>
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-600 tabular-nums">
                          {formatVndShort(Math.round(layer1Metrics.budgetMultiPlatformNet * GROSS_MULTIPLIER))}
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <span className="inline-flex items-center justify-end w-28 h-7 px-2 rounded border border-slate-200 bg-slate-50/80 text-2xs text-slate-400">
                            Đa nền tảng
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-2">
                            <span className={`text-2xs font-mono font-semibold ${
                              channelTotals.multiPlatform.qty === layer1Metrics.qtyMultiPlatform && channelTotals.multiPlatform.budget === layer1Metrics.budgetMultiPlatformNet
                                ? 'text-emerald-700'
                                : 'text-amber-700'
                            }`}>
                              {channelTotals.multiPlatform.qty} video · {formatVndShort(channelTotals.multiPlatform.budget)}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setViewMode('TABLE');
                                setActiveTab('MULTI_PLATFORM');
                              }}
                              className="text-2xs font-semibold text-blue-600 hover:underline cursor-pointer"
                            >
                              Đa sàn →
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Dòng 5: Livestream */}
                      <tr className="hover:bg-slate-50/70">
                        <td className="py-1.5 px-2.5">
                          <div className="font-semibold text-slate-900">5. Livestream (Affiliate &amp; Kênh Brand)</div>
                          {(() => {
                            const ref41 = planState.reference41;
                            const liveAff = ref41?.liveSessions || 0;
                            const ih = ref41?.liveSelf?.inhouse3h || 0;
                            const ctv = ref41?.liveSelf?.ctv2h || 0;
                            const br = ref41?.liveSelf?.brand2h || 0;
                            return (
                              <div className="text-2xs text-slate-500 font-mono truncate">
                                Live Aff: {liveAff} · Inhouse 3h: {ih} · CTV 2h: {ctv}{br > 0 ? ` · Brand 2h: ${br}` : ''}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <input
                              type="number"
                              disabled={isLayer1Locked}
                              value={layer1Metrics.qtyLivestreamSessions}
                              onChange={(e) => handleUpdateLayer1Metrics({ qtyLivestreamSessions: Math.max(0, Number(e.target.value) || 0) })}
                              className="w-16 h-7 text-right font-mono font-semibold px-1.5 py-0.5 rounded border border-slate-300 bg-white text-slate-900 disabled:bg-slate-100"
                            />
                            <span className="w-9 text-left text-2xs text-slate-500">phiên</span>
                          </div>
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <div className="inline-flex justify-end">
                            <FormattedNumberInput
                              disabled={isLayer1Locked}
                              value={layer1Metrics.budgetLivestreamNet}
                              onChange={(val) => handleUpdateLayer1Metrics({ budgetLivestreamNet: Math.max(0, val) })}
                              className="w-28 h-7 text-right font-mono font-semibold px-2 py-0.5 rounded border border-slate-300 bg-white text-blue-700 disabled:bg-slate-100"
                            />
                          </div>
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-600 tabular-nums">
                          {formatVndShort(Math.round(layer1Metrics.budgetLivestreamNet * GROSS_MULTIPLIER))}
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <div className="inline-flex justify-end">
                            <FormattedNumberInput
                              disabled={isLayer1Locked}
                              value={layer1Metrics.targetGmvLivestream}
                              onChange={(val) => handleUpdateLayer1Metrics({ targetGmvLivestream: Math.max(0, val) })}
                              className="w-28 h-7 text-right font-mono font-semibold px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-emerald-700 disabled:bg-slate-100"
                            />
                          </div>
                        </td>
                        <td className="py-1.5 px-2.5 text-right whitespace-nowrap">
                          <span className="text-2xs font-mono text-slate-500">
                            {layer1Metrics.qtyLivestreamSessions} ca live
                          </span>
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-900">
                        <td className="py-1.5 px-2.5">
                          Tổng cộng Chỉ tiêu Bảng 4.1
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono">
                          {totalLayer1Videos} video + {layer1Metrics.qtyLivestreamSessions} live
                        </td>
                        <td className={`py-1.5 px-2 text-right font-mono ${layer1BudgetGapVsPnl < 0 ? 'text-rose-600' : 'text-blue-700'}`}>
                          {formatVndShort(totalLayer1ChannelBudgetNet)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-700">
                          {formatVndShort(Math.round(totalLayer1ChannelBudgetNet * GROSS_MULTIPLIER))}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-emerald-700">
                          {formatVndShort(layer1Metrics.targetNmvTotal)}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-mono text-2xs">
                          Đã phân bổ: {totalAllocatedContents} video · {formatVndShort(totalCombinedBudget)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Khu vực ghi chú thống nhất & Nút Chốt gọn 1 dòng */}
              <div className="px-3 py-2 bg-slate-50/70 border-t border-slate-200 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
                <span className="text-2xs font-semibold text-slate-600 shrink-0">
                  Ghi chú thống nhất:
                </span>
                <input
                  type="text"
                  disabled={isLayer1Locked}
                  value={layer1Metrics.alignmentNote || ''}
                  onChange={(e) => handleUpdateLayer1Metrics({ alignmentNote: e.target.value })}
                  placeholder="Nhập thống nhất giữa các bên (VD: Chốt trần Net Affiliate 150Tr, đẩy 50 suất FOC mẫu mới)..."
                  className="w-full sm:w-auto sm:flex-1 min-w-0 h-7 px-2.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:border-blue-500 disabled:bg-slate-100"
                />
                <div className="flex items-center justify-end gap-1.5 w-full sm:w-auto shrink-0">
                  {!isLayer1Locked ? (
                    <button
                      type="button"
                      onClick={() => handleLockLayer1AndProceed(true)}
                      className="w-full sm:w-auto justify-center h-7 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition inline-flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Chốt chỉ tiêu &amp; Sang phân bổ →</span>
                    </button>
                  ) : (
                    <div className="flex items-center justify-end gap-1.5 w-full sm:w-auto">
                      {!isPlanLocked && (
                        <button
                          type="button"
                          onClick={handleUnlockLayer1ForEdit}
                          className="h-7 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-semibold text-xs transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Unlock className="w-3 h-3" />
                          <span>Sửa lại</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveTab('ALL_SUMMARY')}
                        className="flex-1 sm:flex-initial justify-center h-7 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Mở Phân bổ chi tiết</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cột phải (4/12): Trạng thái duyệt các bên (Xanh = Duyệt, Đỏ = Chưa) & Tiến độ đối soát */}
            <div className="lg:col-span-4 flex flex-col justify-between gap-2.5">
              {/* Khung 1: Trạng thái duyệt các bên (có bao nhiêu bên thì bấy nhiêu dòng) */}
              <div id="plan-approval-detail">
                <PlanApprovalStepper
                  plan={planState}
                  currentRole={currentRole}
                  currentUser={currentUser}
                  onRoleChange={currentUser?.role === 'ADMIN' ? setCurrentRole : undefined}
                  onStatusChange={(newStatus, log, note) => handleStatusChangeForPlan(planState.id, newStatus, log, note)}
                  onUpdatePlan={(upd) => {
                    setPlanState(prev => ({ ...prev, ...upd }));
                    setMonthlyPlans(prev => prev.map(p => p.id === planState.id ? { ...p, ...upd } : p));
                  }}
                  onNotify={notify}
                />
              </div>

              {/* Khung 2: Tiến độ đối soát Định mức (Chỉ tiêu vs Đã phân bổ) */}
              <div className="bg-white rounded-xl border border-slate-200 p-2.5 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-semibold text-slate-900">Tiến độ phân bổ chi tiết</h3>
                    <span className={`px-2 py-0.5 rounded-full text-2xs font-semibold ${
                      channelTotals.affiliatePaid.qty === layer1Metrics.qtyAffiliatePaid &&
                      channelTotals.affiliatePaid.budget === layer1Metrics.budgetAffiliateNet &&
                      channelTotals.tapFreecast.qty === layer1Metrics.qtyFocSample &&
                      channelTotals.selfChannel.qty === layer1Metrics.qtySelfChannel &&
                      channelTotals.multiPlatform.qty === layer1Metrics.qtyMultiPlatform &&
                      channelTotals.livestream.qty === layer1Metrics.qtyLivestreamSessions
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {channelTotals.affiliatePaid.qty === layer1Metrics.qtyAffiliatePaid &&
                      channelTotals.affiliatePaid.budget === layer1Metrics.budgetAffiliateNet &&
                      channelTotals.tapFreecast.qty === layer1Metrics.qtyFocSample &&
                      channelTotals.selfChannel.qty === layer1Metrics.qtySelfChannel &&
                      channelTotals.multiPlatform.qty === layer1Metrics.qtyMultiPlatform &&
                      channelTotals.livestream.qty === layer1Metrics.qtyLivestreamSessions
                        ? 'Khớp 100%'
                        : 'Chưa đồng bộ'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ALL_SUMMARY')}
                    className="text-2xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Mở phân bổ</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-1 text-2xs">
                  <div className="flex items-center justify-between px-2 py-1 rounded-md bg-slate-50 border border-slate-100">
                    <span className="font-semibold text-slate-800 truncate">1. KOC trả phí</span>
                    <span className="text-slate-600 font-mono">
                      {channelTotals.affiliatePaid.qty}/{layer1Metrics.qtyAffiliatePaid} video · {formatVndShort(channelTotals.affiliatePaid.budget)}
                    </span>
                    <span className={`font-semibold shrink-0 ${
                      channelTotals.affiliatePaid.qty === layer1Metrics.qtyAffiliatePaid && channelTotals.affiliatePaid.budget === layer1Metrics.budgetAffiliateNet
                        ? 'text-emerald-700'
                        : 'text-rose-600'
                    }`}>
                      {channelTotals.affiliatePaid.qty === layer1Metrics.qtyAffiliatePaid && channelTotals.affiliatePaid.budget === layer1Metrics.budgetAffiliateNet ? 'Khớp' : 'Lệch'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between px-2 py-1 rounded-md bg-slate-50 border border-slate-100">
                    <span className="font-semibold text-slate-800 truncate">2. Mẫu FOC (0đ)</span>
                    <span className="text-slate-600 font-mono">
                      {channelTotals.tapFreecast.qty}/{layer1Metrics.qtyFocSample} suất
                    </span>
                    <span className={`font-semibold shrink-0 ${
                      channelTotals.tapFreecast.qty === layer1Metrics.qtyFocSample ? 'text-emerald-700' : 'text-rose-600'
                    }`}>
                      {channelTotals.tapFreecast.qty === layer1Metrics.qtyFocSample ? 'Khớp' : 'Lệch'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between px-2 py-1 rounded-md bg-slate-50 border border-slate-100">
                    <span className="font-semibold text-slate-800 truncate">3. Kênh Brand</span>
                    <span className="text-slate-600 font-mono">
                      {channelTotals.selfChannel.qty}/{layer1Metrics.qtySelfChannel} video · {formatVndShort(channelTotals.selfChannel.budget)}
                    </span>
                    <span className={`font-semibold shrink-0 ${
                      channelTotals.selfChannel.qty === layer1Metrics.qtySelfChannel && channelTotals.selfChannel.budget === layer1Metrics.budgetSelfChannelNet
                        ? 'text-emerald-700'
                        : 'text-rose-600'
                    }`}>
                      {channelTotals.selfChannel.qty === layer1Metrics.qtySelfChannel && channelTotals.selfChannel.budget === layer1Metrics.budgetSelfChannelNet ? 'Khớp' : 'Lệch'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between px-2 py-1 rounded-md bg-slate-50 border border-slate-100">
                    <span className="font-semibold text-slate-800 truncate">4. Đa sàn khác</span>
                    <span className="text-slate-600 font-mono">
                      {channelTotals.multiPlatform.qty}/{layer1Metrics.qtyMultiPlatform} video · {formatVndShort(channelTotals.multiPlatform.budget)}
                    </span>
                    <span className={`font-semibold shrink-0 ${
                      channelTotals.multiPlatform.qty === layer1Metrics.qtyMultiPlatform && channelTotals.multiPlatform.budget === layer1Metrics.budgetMultiPlatformNet
                        ? 'text-emerald-700'
                        : 'text-rose-600'
                    }`}>
                      {channelTotals.multiPlatform.qty === layer1Metrics.qtyMultiPlatform && channelTotals.multiPlatform.budget === layer1Metrics.budgetMultiPlatformNet ? 'Khớp' : 'Lệch'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between px-2 py-1 rounded-md bg-slate-50 border border-slate-100">
                    <span className="font-semibold text-slate-800 truncate">5. Livestream</span>
                    <span className="text-slate-600 font-mono">
                      {channelTotals.livestream.qty}/{layer1Metrics.qtyLivestreamSessions} phiên · {formatVndShort(channelTotals.livestream.budget)}
                    </span>
                    <span className={`font-semibold shrink-0 ${
                      channelTotals.livestream.qty === layer1Metrics.qtyLivestreamSessions && channelTotals.livestream.budget === layer1Metrics.budgetLivestreamNet
                        ? 'text-emerald-700'
                        : 'text-rose-600'
                    }`}>
                      {channelTotals.livestream.qty === layer1Metrics.qtyLivestreamSessions && channelTotals.livestream.budget === layer1Metrics.budgetLivestreamNet ? 'Khớp' : 'Lệch'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MÀN 2: PHÂN RÃ CHI TIẾT HẠNG MỤC (DỰA TRÊN CHỈ TIÊU ĐÃ THỐNG NHẤT)       */}
      {/* ========================================================================= */}
      {isDetailBreakdownTab && (
        <div className="bg-white rounded-xl border border-slate-200/90 px-3.5 py-2.5 space-y-2.5">
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

            {/* Bên phải: Thao tác khớp chỉ tiêu + Chia xuống 4 tuần + Chuyển chế độ Bảng / Sơ đồ nhánh */}
            <div className="flex items-center gap-2 flex-wrap">
              {!isPlanLocked && (
                <>
                  <button
                    type="button"
                    onClick={handleSyncLayer1ToLayer2}
                    className="px-2.5 py-1 rounded-lg text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold transition cursor-pointer"
                  >
                    Khớp theo chỉ tiêu
                  </button>
                  <button
                    type="button"
                    onClick={handleDistributeStep2ToWeeksAndOpen}
                    className="px-2.5 py-1 rounded-lg text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                    title="Chia số lượng & ngân sách hiện tại xuống 4 tuần và chuyển sang Bước 3"
                  >
                    <span>Chia xuống 4 tuần</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </>
              )}

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
                    ? 'bg-ink text-white border-ink'
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
      {/* 3. MAIN CONTENT AREA: BẢNG PHÂN RÃ GỌN GÀNG, THOÁNG MẮT                   */}
      {/* ========================================================================= */}
      {activeTab !== 'OVERVIEW' && activeTab !== 'MINDMAP' && activeTab !== 'EXCEL_PREVIEW' && activeTab !== 'DISCUSSIONS' && activeTab !== 'WEEKLY_MATRIX' && (
        <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-xs">
          {/* Nút khớp trần khi còn dư ngân sách/sản lượng */}
          {!isPlanLocked && (budgetHeadroom > 0 || contentHeadroom > 0) && (
            <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-end gap-2 text-xs">
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

          {/* MOBILE (< 768px): DẠNG THẺ DỌC CHO BƯỚC 2 (KHÔNG CẦN KÉO NGANG) */}
          <div className="md:hidden divide-y divide-slate-200">
            {visibleItems.map((item) => {
              const itemBudgetPct = totalAllocatedBudget > 0 ? (item.totalBudget / totalAllocatedBudget) * 100 : 0;
              const isSplitRow = item.id.includes('-split-');
              const klMatch = item.tierCode.toUpperCase().match(/^KL[1-7]$/);
              const rowSalaryGrade = klMatch ? (klMatch[0] as SalaryGrade) : undefined;

              return (
                <div key={`mob-${item.id}`} className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-2xs font-code px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold shrink-0">
                          {item.tierCode === 'Video AI' ? 'Giọng máy' : item.tierCode}
                        </span>
                        <span className="font-semibold text-slate-900 text-xs truncate">
                          {item.tierLabel.split(':')[1]?.trim() || item.tierLabel}
                        </span>
                      </div>
                    </div>
                    <div className="text-right font-mono shrink-0">
                      <span className="text-xs font-semibold text-blue-700 block">
                        {formatVndShort(item.totalBudget)}
                      </span>
                      <span className="text-2xs text-slate-400 block">
                        {itemBudgetPct.toFixed(0)}% ngân sách
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-2xs text-slate-500 block mb-0.5">Định dạng video</span>
                      <select
                        value={item.contentFormat}
                        onChange={(e) => handleUpdateItemFormat(item.id, e.target.value)}
                        className="w-full h-8 text-xs font-medium px-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 truncate"
                      >
                        {CONTENT_FORMAT_OPTIONS.map(fmt => (
                          <option key={fmt} value={fmt}>{fmt}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span className="text-2xs text-slate-500 block mb-0.5">Nhân sự thực thi</span>
                      <div className="flex items-center gap-1">
                        <select
                          value={item.assignedStaff || planState.pic}
                          onChange={(e) => handleUpdateItemAssignee(item.id, e.target.value)}
                          className={`flex-1 min-w-0 h-8 text-xs font-semibold px-2 rounded-lg border truncate ${
                            item.assignedStaff && item.assignedStaff !== planState.pic
                              ? 'bg-blue-50/70 border-blue-300 text-blue-900'
                              : 'bg-white border-slate-200 text-slate-800'
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
                            className="h-8 px-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-2xs font-semibold shrink-0 cursor-pointer"
                          >
                            +Chia
                          </button>
                        )}
                        {!isPlanLocked && isSplitRow && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSplitRow(item.id)}
                            className="h-8 px-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-2xs font-semibold shrink-0 cursor-pointer"
                          >
                            Gộp
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 items-end pt-0.5">
                    <div>
                      <span className="text-2xs text-slate-500 block mb-0.5">Số lượng video</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleAdjustItemQty(item.id, -1)}
                          className="w-7 h-7 rounded border border-slate-200 bg-white text-slate-700 font-semibold flex items-center justify-center shrink-0"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) => handleUpdateItemQty(item.id, Number(e.target.value))}
                          className="w-12 h-7 text-center text-xs font-semibold font-mono border border-slate-200 rounded bg-white text-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => handleAdjustItemQty(item.id, 1)}
                          className="w-7 h-7 rounded border border-slate-200 bg-white text-slate-700 font-semibold flex items-center justify-center shrink-0"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdjustItemQty(item.id, 5)}
                          className="h-7 text-2xs font-semibold px-1.5 rounded border border-slate-200 bg-slate-50 text-slate-600 shrink-0"
                        >
                          +5
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-2xs text-slate-500 block mb-0.5">Đơn giá Net (VNĐ)</span>
                      <div className="flex items-center justify-end gap-1">
                        <FormattedNumberInput
                          disabled={isPlanLocked}
                          value={item.unitCost}
                          onChange={(val) => handleUpdateItemCost(item.id, val)}
                          className="w-full h-7 text-right text-xs font-mono font-medium px-2 bg-white border border-slate-200 rounded text-slate-800"
                        />
                        {item.unitCost !== item.benchmarkCost && (
                          <button
                            type="button"
                            onClick={() => handleResetItemToBenchmark(item.id)}
                            className="text-slate-400 hover:text-blue-600 p-1 shrink-0"
                            title={`Khôi phục đơn giá định mức: ${formatVndShort(item.benchmarkCost)}`}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {(onOpenListingForPlan && rowSalaryGrade) || contentHeadroom > 0 ? (
                    <div className="flex items-center justify-end gap-2 pt-1">
                      {onOpenListingForPlan && rowSalaryGrade && (
                        <button
                          type="button"
                          onClick={() => onOpenListingForPlan(planState, rowSalaryGrade)}
                          className="text-2xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 cursor-pointer"
                        >
                          List KOC ({rowSalaryGrade})
                        </button>
                      )}
                      {contentHeadroom > 0 && (
                        <button
                          type="button"
                          onClick={() => handleFillRemainingToItem(item.id)}
                          className="text-2xs font-semibold text-blue-600 bg-white px-2.5 py-1 rounded-md border border-blue-200"
                        >
                          Điền +{contentHeadroom} video thiếu
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="hidden md:block w-full overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-2xs">
                  <th className="py-2.5 px-3 w-[23%]">Đầu việc / Khung lương KOC</th>
                  <th className="py-2.5 px-2.5 w-[17%]">Định dạng video</th>
                  <th className="py-2.5 px-2.5 w-[18%]">Nhân sự thực thi</th>
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
                            {item.tierCode === 'Video AI' ? 'Giọng máy' : item.tierCode}
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
                          <FormattedNumberInput
                            disabled={isPlanLocked}
                            value={item.unitCost}
                            onChange={(val) => handleUpdateItemCost(item.id, val)}
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

      {/* PHÂN RÃ TUẦN: nhập theo tuần, tự cộng và đối chiếu với bảng 4.1 */}
      {activeTab === 'WEEKLY_MATRIX' && (
        <PlanWeeklyBreakdown
          plan={planState}
          readOnly={isPlanLocked || !['DRAFT', 'REVISION_REQUESTED'].includes(planStatus)}
          onChange={patch => setPlanState(prev => ({ ...prev, ...patch }))}
          onNotify={notify}
        />
      )}

      </fieldset>

      {/* ========================================================================= */}
      {/* 6. TAB EXCEL PREVIEW (CLEAN SHEET 4.1.1 VERIFICATION)                     */}
      {/* ========================================================================= */}
      {activeTab === 'EXCEL_PREVIEW' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-3.5 sm:px-6 py-3 sm:py-4 border-b border-line flex flex-wrap items-center justify-between gap-2 bg-surface text-ink">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" />
              <h3 className="text-xs sm:text-sm font-semibold">Đối chiếu Sheet 4.1.1 Input Plan</h3>
            </div>
            <button
              onClick={handleExportExcel}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải File .xlsx này</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-[460px]">
            <table className="w-full min-w-[1350px] whitespace-nowrap text-xs text-left border-collapse font-mono">
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
      <Modal
        open={isAllocationModalOpen}
        onClose={() => setIsAllocationModalOpen(false)}
        title="Phân bổ kế hoạch cho Team booking"
        size="2xl"
        footer={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-3 text-xs font-mono text-slate-600">
              <span>Phân bổ: <strong className="text-blue-700 font-semibold">{staffAllocationSummary.filter(s => s.videoCount > 0).length}</strong> nhân sự</span>
              <span>•</span>
              <span>Tổng clip: <strong className="text-slate-900 font-semibold">{totalAllocatedContents}</strong></span>
              <span>•</span>
              <span>Ngân sách: <strong className="text-slate-900 font-semibold">{formatVndShort(totalAllocatedBudget)}</strong></span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAllocationModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs transition"
              >
                Đóng &amp; lưu nháp
              </button>

              <button
                type="button"
                onClick={handleGenerateBookingSlots}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md transition active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Xác nhận &amp; giao việc cho Team</span>
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
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
                  type="button"
                  onClick={handleAutoAssignByExpertise}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1.5 transition shadow-2xs"
                >
                  <Zap className="w-3.5 h-3.5 text-blue-600" />
                  <span>Gán tự động theo chuyên môn</span>
                </button>
                <button
                  type="button"
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
                  Chi tiết phân bổ từng phân bậc KOC &amp; kênh
                </h4>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 overflow-x-auto max-w-full whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => setAllocationFilterChannel('ALL')}
                  className={`px-2.5 py-1 rounded text-2xs font-semibold transition shrink-0 ${
                    allocationFilterChannel === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả ({planState.items.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAllocationFilterChannel('TIKTOK')}
                  className={`px-2.5 py-1 rounded text-2xs font-semibold transition shrink-0 ${
                    allocationFilterChannel === 'TIKTOK' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  TikTok
                </button>
                <button
                  type="button"
                  onClick={() => setAllocationFilterChannel('SHOPEE')}
                  className={`px-2.5 py-1 rounded text-2xs font-semibold transition shrink-0 ${
                    allocationFilterChannel === 'SHOPEE' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Đa sàn
                </button>
                <button
                  type="button"
                  onClick={() => setAllocationFilterChannel('SELF_CHANNEL')}
                  className={`px-2.5 py-1 rounded text-2xs font-semibold transition shrink-0 ${
                    allocationFilterChannel === 'SELF_CHANNEL' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Kênh tự xây
                </button>
                <button
                  type="button"
                  onClick={() => setAllocationFilterChannel('LIVESTREAM')}
                  className={`px-2.5 py-1 rounded text-2xs font-semibold transition shrink-0 ${
                    allocationFilterChannel === 'LIVESTREAM' ? 'bg-white text-slate-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Livestream
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              {/* MOBILE CARDS (< 768px) */}
              <div className="md:hidden divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
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
                      <div key={`m-alloc-${item.id}`} className="p-3 space-y-2 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-2xs font-code px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                                {item.tierCode === 'Video AI' ? 'Giọng máy' : item.tierCode}
                              </span>
                              <span className="font-semibold text-slate-900">
                                {item.tierLabel.split(':')[1]?.trim() || item.tierLabel}
                              </span>
                            </div>
                            <div className="text-2xs text-slate-500 mt-0.5">{item.contentFormat}</div>
                          </div>
                          <div className="text-right font-mono shrink-0">
                            <div className="font-semibold text-slate-900">{item.qty} clip</div>
                            <div className="text-2xs text-blue-700 font-semibold">{formatVndShort(item.totalBudget)}</div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <select
                            value={item.assignedStaff || planState.pic}
                            onChange={(e) => handleUpdateItemAssignee(item.id, e.target.value)}
                            className={`w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition ${
                              !isPicAssigned
                                ? 'bg-blue-50/70 border-blue-300 text-blue-900'
                                : 'bg-white border-slate-200 text-slate-800'
                            }`}
                          >
                            {PIC_OPTIONS.map(staff => (
                              <option key={staff} value={staff}>
                                {staff} {staff === planState.pic ? '(PIC Chủ Trì)' : ''}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="Ghi chú tác nghiệp (VD: KOC lên link bio, reup Shopee...)"
                            value={item.staffNotes || ''}
                            onChange={(e) => handleUpdateItemStaffNotes(item.id, e.target.value)}
                            className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition"
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* DESKTOP TABLE (>= 768px) */}
              <div className="hidden md:block overflow-x-auto max-h-[380px]">
                <table className="w-full min-w-[760px] text-left text-xs border-collapse">
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
                                  {item.tierCode === 'Video AI' ? 'Giọng máy' : item.tierCode}
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
      </Modal>

      {/* MODAL: XÁC NHẬN GỬI DUYỆT QUẢN LÝ */}
      <Modal
        open={isSubmitToManagerModalOpen}
        onClose={() => setIsSubmitToManagerModalOpen(false)}
        title="Gửi kế hoạch lên Quản lý duyệt"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
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
              className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-xl font-semibold text-xs text-white shadow-xs transition-colors ${
                growthAlignedConfirm
                  ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                  : 'bg-slate-300 cursor-not-allowed'
              }`}
            >
              <SendHorizonal className="w-4 h-4" />
              <span>Xác nhận &amp; Gửi duyệt</span>
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-1.5 text-xs">
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

          <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={growthAlignedConfirm}
                onChange={(e) => setGrowthAlignedConfirm(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
              <span className="text-xs text-blue-950 font-medium leading-relaxed">
                Tôi xác nhận <strong>ĐÃ TRAO ĐỔI VÀ THỐNG NHẤT</strong> các chỉ số mục tiêu (ngân sách, GMV, số lượng KOC) với Growth Lead <strong>(Growth Team)</strong>.
              </span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Ghi chú trình Quản lý phê duyệt:
            </label>
            <textarea
              rows={3}
              value={submissionNote}
              onChange={(e) => setSubmissionNote(e.target.value)}
              placeholder="Nhập ghi chú hoặc căn cứ chốt số với Growth..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </Modal>

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

      <OperationalReportDrawer
        isOpen={isPlanReportOpen}
        onClose={() => setIsPlanReportOpen(false)}
        purposeId="PLAN_ADS_ANALYSIS"
        moduleTitle={`Thẩm Định Kế Hoạch Tháng: ${planState.brandName} (${planState.month})`}
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
