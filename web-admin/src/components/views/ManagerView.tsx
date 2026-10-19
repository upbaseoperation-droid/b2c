'use client';

import React, { useState, useMemo } from 'react';
import { formatVndShort } from '../../lib/format';
import { 
  ShieldAlert, 
  AlertCircle, 
  Users, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown,
  Sparkles, 
  BarChart2, 
  BellRing, 
  RefreshCw, 
  Calendar, 
  Target, 
  DollarSign, 
  Video, 
  Flame, 
  Layers, 
  CheckSquare,
  ArrowUpRight,
  Filter,
  AlertTriangle,
  HelpCircle,
  Package,
  FileSpreadsheet,
  Zap,
  Timer,
  FileCheck,
  Lock,
  Unlock,
  MessageSquare,
  Send,
  CheckCircle,
  Clock,
  GitFork
} from 'lucide-react';
import { 
  BookingDealItem, 
  MonthlyStaffAllocation, 
  MasterTierQuota, 
  MonthlyMasterQuotaPlan,
  ControlTowerSummary,
  StaffDetailedPlanItem,
  StaffPlanStatus,
  KocTier,
  UserProfile,
  StaffSlaReportItem,
  SlaBreachItem,
  E2EReconciliationWindow,
  BrandDetail,
  StorePortfolioItem,
  StaffMasterMember,
  SlaTask,
  GrowthDemandItem
} from '../../lib/types';
import { 
  MONTHLY_PLAN_DATA, 
  KL_PERFORMANCE_DATA, 
  PILLAR_PERFORMANCE_DATA, 
  CREATOR_NICHE_PERFORMANCE_DATA,
  STAFF_PERFORMANCE_DATA,
  BOOKING_STAFF_PROGRESS_26,
  BOOKING_STAFF_REVENUE_26,
  PLAN_GAP_DATA,
  SELF_CHANNEL_SUMMARY,
  INITIAL_STAFF_ALLOCATIONS_26,
  MONTHLY_MASTER_QUOTA_PLANS,
  INITIAL_CONTROL_TOWER,
  INITIAL_DETAILED_STAFF_PLANS,
  INITIAL_SLA_BREACHES,
  INITIAL_STAFF_SLA_REPORTS,
  INITIAL_RECONCILIATION_WINDOW,
  INITIAL_BRANDS,
  INITIAL_STORE_PORTFOLIOS,
  INITIAL_TASKS,
  STAFF_MASTER_DIRECTORY
} from '../../lib/mockData';
import { 
  Sliders, 
  Edit3, 
  Save, 
  X, 
  Search, 
  Briefcase, 
  Check, 
  Award, 
  Crown, 
  SlidersHorizontal, 
  Plus, 
  Copy, 
  Layers as LayersIcon,
  Eye,
  Table,
  CalendarDays,
  Store,
  ShieldCheck,
  Database
} from 'lucide-react';
import { UPBASE_BRANDS_MASTER } from '../../lib/importedMasterData';
import { GrowthPlanBreakdownView } from './GrowthPlanBreakdownView';
import { Button, Presence, Segmented, Select, Tabs } from '../ui';
import { EmployeePlanInspectorModal } from '../EmployeePlanInspectorModal';
import { AiStaffReviewModal } from '../AiStaffReviewModal';
import { ManagerDelegationHub } from './ManagerDelegationHub';
import { MasterDataMindmapView } from './MasterDataMindmapView';

interface ManagerViewProps {
  deals: BookingDealItem[];
  currentUser?: UserProfile;
  onPingStaffNotification?: (staffName: string, taskTitle: string) => void;
  planItems?: StaffDetailedPlanItem[];
  onUpdatePlanItemStatus?: (itemId: string, newStatus: StaffPlanStatus, leadNotes?: string) => void;
  onApproveEntirePlan?: (staffName: string, managerFeedback: string) => void;
  onRequestPlanRevision?: (staffName: string, managerFeedback: string) => void;
  onGenerateDealsFromPlan?: (demand: GrowthDemandItem) => void;
  onConvertPlanToDeals?: (staffName: string) => void;
  staffAllocationsByMonth?: Record<string, MonthlyStaffAllocation[]>;
  onUpdateStaffAllocation?: (month: string, updatedList: MonthlyStaffAllocation[]) => void;
  onOpenInputPlan?: () => void;
  brands?: BrandDetail[];
  onUpdateBrand?: (brand: BrandDetail) => void;
  onAddBrand?: (brand: BrandDetail) => void;
  storePortfolios?: StorePortfolioItem[];
  onUpdateStore?: (store: StorePortfolioItem) => void;
  tasks?: SlaTask[];
  onAddTask?: (task: SlaTask) => void;
  onNavigateToTab?: (tabKey: string) => void;
}

export const ManagerView: React.FC<ManagerViewProps> = ({ 
  deals, 
  currentUser,
  onPingStaffNotification,
  planItems: externalPlanItems,
  onUpdatePlanItemStatus: externalOnUpdatePlanItemStatus,
  onApproveEntirePlan: externalOnApproveEntirePlan,
  onRequestPlanRevision: externalOnRequestPlanRevision,
  onGenerateDealsFromPlan,
  onConvertPlanToDeals: externalOnConvertPlanToDeals,
  staffAllocationsByMonth: externalStaffAllocationsByMonth,
  onUpdateStaffAllocation: externalOnUpdateStaffAllocation,
  onOpenInputPlan,
  brands: externalBrands,
  onUpdateBrand: externalOnUpdateBrand,
  onAddBrand: externalOnAddBrand,
  storePortfolios: externalStorePortfolios,
  onUpdateStore: externalOnUpdateStore,
  tasks: externalTasks,
  onAddTask: externalOnAddTask,
  onNavigateToTab
}) => {
  const isManager = currentUser
    ? ['MANAGER', 'GROWTH_MANAGER', 'MEDIA_MANAGER', 'ADMIN'].includes(currentUser.role)
    : true;
  const [activeTab, setActiveTab] = useState<'DELEGATION' | 'ALLOCATION' | 'SLA_MANAGEMENT' | 'MINDMAP' | 'MONITORING'>('DELEGATION');
  const [monitoringSubTab, setMonitoringSubTab] = useState<'CONTROL_TOWER' | 'AIR_PROGRESS' | 'STAFF_GMV' | 'MONTHLY_PLAN' | 'PLAN_GAP'>('CONTROL_TOWER');
  const [slaSubTab, setSlaSubTab] = useState<'BREACHES' | 'ANALYTICS'>('BREACHES');
  const [allocationSubTab, setAllocationSubTab] = useState<'4_TIER' | 'GROWTH'>(
    currentUser?.role === 'GROWTH_MANAGER' ? 'GROWTH' : '4_TIER'
  );
  
  // State phân quyền Brand, Gian Hàng, Giao Việc của Trưởng Phòng
  const [internalBrands, setInternalBrands] = useState<BrandDetail[]>(externalBrands || INITIAL_BRANDS);
  const [internalStores, setInternalStores] = useState<StorePortfolioItem[]>(externalStorePortfolios || INITIAL_STORE_PORTFOLIOS);
  const [internalTasks, setInternalTasks] = useState<SlaTask[]>(externalTasks || INITIAL_TASKS);

  const currentBrands = externalBrands || internalBrands;
  const currentStores = externalStorePortfolios || internalStores;
  const currentTasks = externalTasks || internalTasks;

  const handleUpdateBrand = (b: BrandDetail) => {
    setInternalBrands(prev => prev.map(item => item.id === b.id ? b : item));
    if (externalOnUpdateBrand) externalOnUpdateBrand(b);
  };

  const handleAddBrand = (b: BrandDetail) => {
    setInternalBrands(prev => [b, ...prev]);
    if (externalOnAddBrand) externalOnAddBrand(b);
  };

  const handleUpdateStore = (s: StorePortfolioItem) => {
    setInternalStores(prev => prev.map(item => item.id === s.id ? s : item));
    if (externalOnUpdateStore) externalOnUpdateStore(s);
  };

  const handleAddTask = (t: SlaTask) => {
    setInternalTasks(prev => [t, ...prev]);
    if (externalOnAddTask) externalOnAddTask(t);
  };

  // SLA B2C & E2E Reconciliation Window States
  const [slaBreaches, setSlaBreaches] = useState<SlaBreachItem[]>(INITIAL_SLA_BREACHES);
  const [staffSlaReports, setStaffSlaReports] = useState<StaffSlaReportItem[]>(INITIAL_STAFF_SLA_REPORTS);
  const [reconWindow, setReconWindow] = useState<E2EReconciliationWindow>(INITIAL_RECONCILIATION_WINDOW);
  const [slaStaffFilter, setSlaStaffFilter] = useState<string>('ALL');
  const [slaBreachCategoryFilter, setSlaBreachCategoryFilter] = useState<string>('ALL');
  const [slaSeverityFilter, setSlaSeverityFilter] = useState<string>('ALL');
  const [pingSuccessStaff, setPingSuccessStaff] = useState<string | null>(null);
  const [inspectStaffModal, setInspectStaffModal] = useState<StaffSlaReportItem | null>(null);
  const [breachActionModal, setBreachActionModal] = useState<SlaBreachItem | null>(null);
  const [aiReviewTargetStaff, setAiReviewTargetStaff] = useState<string | null>(null);

  const handlePingStaff = (staffName: string, message: string) => {
    if (onPingStaffNotification) {
      onPingStaffNotification(staffName, message);
    }
    setPingSuccessStaff(`Đã gửi cảnh báo SLA tới chuyên viên ${staffName} qua Lark Bot thành công!`);
    setTimeout(() => {
      setPingSuccessStaff(null);
    }, 4000);
  };

  const handleResolveBreach = (breachId: string, notes: string) => {
    setSlaBreaches(prev => prev.map(b => {
      if (b.id === breachId) {
        return {
          ...b,
          status: 'RESOLVED' as const,
          resolutionNotes: notes
        };
      }
      return b;
    }));
    setBreachActionModal(null);
  };

  const [controlTower, setControlTower] = useState<ControlTowerSummary>(INITIAL_CONTROL_TOWER);
  const [analyticsSubTab, setAnalyticsSubTab] = useState<'KL' | 'PILLAR' | 'CREATOR_NICHE'>('KL');
  
  // Matrix View Mode: 4 Tier, Brands, Weeks
  const [matrixViewMode, setMatrixViewMode] = useState<'4_TIER' | 'BRANDS' | 'WEEKS'>('4_TIER');
  const [inspectingStaffAllocation, setInspectingStaffAllocation] = useState<MonthlyStaffAllocation | null>(null);

  // Detailed Plan Items State (for employee plans)
  const [localPlanItems, setLocalPlanItems] = useState<StaffDetailedPlanItem[]>(externalPlanItems || INITIAL_DETAILED_STAFF_PLANS);

  React.useEffect(() => {
    if (externalPlanItems) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalPlanItems(externalPlanItems);
    }
  }, [externalPlanItems]);


  
  // Master Plans state (Quản lý chỉ tiêu theo tháng & theo 4 Tier KOC/KOL)
  const [masterPlans, setMasterPlans] = useState<MonthlyMasterQuotaPlan[]>(MONTHLY_MASTER_QUOTA_PLANS);
  const [selectedMonth, setSelectedMonth] = useState<string>('2026/09');
  
  // Interactive Staff Allocation State across months (26 nhân sự thực tế)
  const [staffAllocationsByMonth, setStaffAllocationsByMonth] = useState<Record<string, MonthlyStaffAllocation[]>>({
    '2026/08': INITIAL_STAFF_ALLOCATIONS_26,
    '2026/09': INITIAL_STAFF_ALLOCATIONS_26.map(a => ({
      ...a,
      id: `${a.id}-t9`,
      month: '2026/09',
      planVideos: Math.round(a.planVideos * 1.03),
      tier1Videos: a.tier1Videos ? Math.max(0, Math.round(a.tier1Videos * 0.8)) : 0,
      tier2Videos: a.tier2Videos ? Math.max(0, Math.round(a.tier2Videos * 0.95)) : 0,
      tier3Videos: a.tier3Videos ? Math.round(a.tier3Videos * 1.4) : 0,
      tier4Videos: a.tier4Videos ? Math.round(a.tier4Videos * 1.02) : 0,
      planBudget: Math.round(a.planBudget * 0.95),
      reportVideos: Math.round(a.reportVideos * 0.45),
      reportBudget: Math.round(a.reportBudget * 0.42),
      airProgress: 45,
      budgetProgress: 42,
      actualGmv: Math.round(a.actualGmv * 0.4),
      targetGmv: Math.round(a.targetGmv * 1.1),
    })),
    '2026/10': INITIAL_STAFF_ALLOCATIONS_26.map(a => ({
      ...a,
      id: `${a.id}-t10`,
      month: '2026/10',
      planVideos: Math.round(a.planVideos * 1.15),
      tier1Videos: a.tier1Videos ? Math.round(a.tier1Videos * 1.2) : 0,
      tier2Videos: a.tier2Videos ? Math.round(a.tier2Videos * 1.2) : 0,
      tier3Videos: a.tier3Videos ? Math.round(a.tier3Videos * 1.3) : 0,
      tier4Videos: a.tier4Videos ? Math.round(a.tier4Videos * 1.15) : 0,
      planBudget: Math.round(a.planBudget * 1.14),
      reportVideos: 0,
      reportBudget: 0,
      airProgress: 0,
      budgetProgress: 0,
      actualGmv: 0,
      targetGmv: Math.round(a.targetGmv * 1.3),
    }))
  });

  const currentPlan = masterPlans.find(p => p.month === selectedMonth) || masterPlans[0];
  const allocations = staffAllocationsByMonth[selectedMonth] || staffAllocationsByMonth['2026/08'] || [];

  const [staffSearch, setStaffSearch] = useState('');
  const [allocationFilter, setAllocationFilter] = useState<'ALL' | 'LAGGING' | 'GOOD'>('ALL');
  
  // Modal State for Staff Tier Allocation
  const [editingAllocation, setEditingAllocation] = useState<MonthlyStaffAllocation | null>(null);
  const [editAllocForm, setEditAllocForm] = useState({
    tier1Videos: 0,
    tier2Videos: 0,
    tier3Videos: 0,
    tier4Videos: 0,
    planVideos: 0,
    planBudget: 0,
    targetGmv: 0,
    targetNewKocs: 0,
    assignedBrands: '',
    managerNote: ''
  });

  // Modal State for Master Tier Quota Configuration
  const [isTierQuotaModalOpen, setIsTierQuotaModalOpen] = useState(false);
  const [editTierForm, setEditTierForm] = useState<MasterTierQuota[]>([]);

  // Global Escape key dismiss for open modals
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditingAllocation(null);
        setIsTierQuotaModalOpen(false);
        setInspectStaffModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);


  // Ceiling metrics from active monthly plan
  const TOTAL_CEILING_BUDGET = currentPlan.totalCeilingBudget;
  const TOTAL_TARGET_VIDEOS = currentPlan.totalTargetVideos;

  const totalAllocatedBudget = allocations.reduce((sum, a) => sum + (a.planBudget || 0), 0);
  const totalAllocatedVideos = allocations.reduce((sum, a) => sum + (a.planVideos || 0), 0);
  const totalTargetGmv = allocations.reduce((sum, a) => sum + (a.targetGmv || 0), 0);
  const remainingBudget = TOTAL_CEILING_BUDGET - totalAllocatedBudget;
  const remainingVideos = TOTAL_TARGET_VIDEOS - totalAllocatedVideos;

  // Calculate sum of tier allocations across all staff
  const teamTierAllocated = {
    TIER_1_CELEB: allocations.reduce((sum, a) => sum + (a.tier1Videos || 0), 0),
    TIER_2_MACRO: allocations.reduce((sum, a) => sum + (a.tier2Videos || 0), 0),
    TIER_3_MICRO: allocations.reduce((sum, a) => sum + (a.tier3Videos || 0), 0),
    TIER_4_AFFILIATE: allocations.reduce((sum, a) => sum + (a.tier4Videos ?? a.planVideos ?? 0), 0),
  };

  const handleOpenEditAlloc = (alloc: MonthlyStaffAllocation) => {
    setEditingAllocation(alloc);
    setEditAllocForm({
      tier1Videos: alloc.tier1Videos ?? 0,
      tier2Videos: alloc.tier2Videos ?? 0,
      tier3Videos: alloc.tier3Videos ?? 0,
      tier4Videos: alloc.tier4Videos ?? alloc.planVideos,
      planVideos: alloc.planVideos,
      planBudget: alloc.planBudget,
      targetGmv: alloc.targetGmv,
      targetNewKocs: alloc.targetNewKocs,
      assignedBrands: alloc.assignedBrands.join(', '),
      managerNote: alloc.managerNote || ''
    });
  };

  const handleSaveAlloc = () => {
    if (!editingAllocation) return;
    const brandsArray = editAllocForm.assignedBrands
      .split(',')
      .map(b => b.trim())
      .filter(Boolean);

    const calculatedVideos = Number(editAllocForm.tier1Videos) + 
      Number(editAllocForm.tier2Videos) + 
      Number(editAllocForm.tier3Videos) + 
      Number(editAllocForm.tier4Videos);

    const finalPlanVideos = calculatedVideos > 0 ? calculatedVideos : Number(editAllocForm.planVideos);

    setStaffAllocationsByMonth(prev => ({
      ...prev,
      [selectedMonth]: (prev[selectedMonth] || []).map(item => {
        if (item.id === editingAllocation.id) {
          return {
            ...item,
            tier1Videos: Number(editAllocForm.tier1Videos),
            tier2Videos: Number(editAllocForm.tier2Videos),
            tier3Videos: Number(editAllocForm.tier3Videos),
            tier4Videos: Number(editAllocForm.tier4Videos),
            planVideos: finalPlanVideos,
            planBudget: Number(editAllocForm.planBudget),
            targetGmv: Number(editAllocForm.targetGmv),
            targetNewKocs: Number(editAllocForm.targetNewKocs),
            assignedBrands: brandsArray.length > 0 ? brandsArray : item.assignedBrands,
            managerNote: editAllocForm.managerNote,
            airProgress: finalPlanVideos > 0 ? Math.round((item.reportVideos / finalPlanVideos) * 100) : 0,
            budgetProgress: Number(editAllocForm.planBudget) > 0 ? Math.round((item.reportBudget / Number(editAllocForm.planBudget)) * 100) : 0,
          };
        }
        return item;
      })
    }));

    if (onPingStaffNotification) {
      onPingStaffNotification(
        editingAllocation.staffName,
        `Đã lưu phân bổ ${currentPlan.monthLabel}: ${finalPlanVideos} video (T1: ${editAllocForm.tier1Videos}, T2: ${editAllocForm.tier2Videos}, T3: ${editAllocForm.tier3Videos}, T4: ${editAllocForm.tier4Videos}), ${formatVndShort(Number(editAllocForm.planBudget))} ngân sách`
      );
    }
    setEditingAllocation(null);
  };

  const handleOpenEditTierQuota = () => {
    setEditTierForm(JSON.parse(JSON.stringify(currentPlan.tierQuotas)));
    setIsTierQuotaModalOpen(true);
  };

  const handleSaveTierQuota = () => {
    const updatedTierQuotas = editTierForm.map(tier => ({
      ...tier,
      avgCostPerVideo: tier.targetVideos > 0 ? Math.round(tier.totalBudget / tier.targetVideos) : 0
    }));
    const newTotalBudget = updatedTierQuotas.reduce((sum, t) => sum + t.totalBudget, 0);
    const newTotalVideos = updatedTierQuotas.reduce((sum, t) => sum + t.targetVideos, 0);

    setMasterPlans(prev => prev.map(p => {
      if (p.month === selectedMonth) {
        return {
          ...p,
          totalCeilingBudget: newTotalBudget,
          totalTargetVideos: newTotalVideos,
          tierQuotas: updatedTierQuotas
        };
      }
      return p;
    }));

    if (onPingStaffNotification) {
      onPingStaffNotification(
        'Ban Quản Trị Marketing B2C',
        `Đã cập nhật hạn mức 4 Tier KOC cho ${currentPlan.monthLabel}: ${newTotalVideos} clips, ${(newTotalBudget / 1000000000).toFixed(2)}B đ trần ngân sách`
      );
    }
    setIsTierQuotaModalOpen(false);
  };

  // Matrix Constants
  const MATRIX_BRANDS: string[] = useMemo(() => {
    const list = currentBrands.map(b => b.name);
    return list.length > 0 ? Array.from(new Set<string>(list)) : ['Senka', 'Cure Natural', 'Bio-Essence', 'Peripera', 'Kutieskin', 'Royal Ausnz'];
  }, [currentBrands]);
  const MATRIX_WEEKS = ['W1', 'W2', 'W3', 'W4'] as const;

  // Handlers for Employee Plan Inspector
  const handleApproveEntirePlan = (staffName: string, managerFeedback: string) => {
    setLocalPlanItems(prev => prev.map(item => item.staffName === staffName ? {
      ...item,
      status: 'APPROVED',
      leadNotes: managerFeedback || 'Trưởng phòng đã phê duyệt toàn bộ kế hoạch'
    } : item));

    if (externalOnApproveEntirePlan) {
      externalOnApproveEntirePlan(staffName, managerFeedback);
    }
    if (onPingStaffNotification) {
      onPingStaffNotification(staffName, `Trưởng phòng đã phê duyệt toàn bộ Kế hoạch tháng! Bạn có thể bắt đầu chuyển deal tác nghiệp.`);
    }
    setInspectingStaffAllocation(null);
  };

  const handleRequestPlanRevision = (staffName: string, managerFeedback: string) => {
    setLocalPlanItems(prev => prev.map(item => item.staffName === staffName && item.status !== 'CONVERTED' ? {
      ...item,
      status: 'REVISION_REQUESTED',
      leadNotes: managerFeedback || 'Trưởng phòng yêu cầu điều chỉnh lại danh sách KOC'
    } : item));

    if (externalOnRequestPlanRevision) {
      externalOnRequestPlanRevision(staffName, managerFeedback);
    }
    if (onPingStaffNotification) {
      onPingStaffNotification(staffName, `[Yêu Cầu Sửa Plan] Trưởng phòng gửi góp ý: "${managerFeedback || 'Vui lòng bổ sung thêm KOC'}"`);
    }
    setInspectingStaffAllocation(null);
  };

  const handleUpdatePlanItemStatus = (itemId: string, newStatus: StaffPlanStatus, leadNotes?: string) => {
    setLocalPlanItems(prev => prev.map(item => item.id === itemId ? {
      ...item,
      status: newStatus,
      leadNotes: leadNotes || item.leadNotes
    } : item));

    if (externalOnUpdatePlanItemStatus) {
      externalOnUpdatePlanItemStatus(itemId, newStatus, leadNotes);
    }
  };

  const handleConvertPlanToDeals = (staffName: string) => {
    setLocalPlanItems(prev => prev.map(item => (item.staffName === staffName && item.status === 'APPROVED') ? {
      ...item,
      status: 'CONVERTED',
      dealCode: item.dealCode || `BO26_${Date.now().toString().slice(-6)}`
    } : item));

    if (externalOnConvertPlanToDeals) {
      externalOnConvertPlanToDeals(staffName);
    }
    if (onPingStaffNotification) {
      onPingStaffNotification(staffName, `Đã chuyển đổi thành công các slot KOC đã duyệt sang Deal Booking tác nghiệp.`);
    }
    setInspectingStaffAllocation(null);
  };


  
  // Filter for Staff Air Progress
  const [airFilter, setAirFilter] = useState<'ALL' | 'LAGGING' | 'OVER_BUDGET' | 'GOOD'>('ALL');
  
  // State for pings and actions
  const [pingedStaff, setPingedStaff] = useState<Record<string, boolean>>({});
  const [isAllLaggingPinged, setIsAllLaggingPinged] = useState(false);
  const [isAdsCodeResolved, setIsAdsCodeResolved] = useState(false);
  const [isCapacityRebalanced, setIsCapacityRebalanced] = useState(false);

  const handlePing = (id: string, staffName: string, task: string) => {
    setPingedStaff(prev => ({ ...prev, [id]: true }));
    if (onPingStaffNotification) {
      onPingStaffNotification(staffName, task);
    }
  };

  const handlePingAllLagging = () => {
    setIsAllLaggingPinged(true);
    if (onPingStaffNotification) {
      onPingStaffNotification(
        '5 Nhân sự tụt tiến độ (<50%): Vũ Hoài Lâm, Ôn Ngọc Hà, Lê Thanh Hải, Dương Thị Hồng Nhung, Hoàng Hải Long',
        '[Khẩn cấp] Đốc thúc hoàn tất nghiệm thu link video TikTok trước 18:00 để kéo tiến độ air tháng 8!'
      );
    }
  };

  const handleResolveAdsCode = () => {
    setIsAdsCodeResolved(true);
    if (onPingStaffNotification) {
      onPingStaffNotification(
        'Kế toán & Booking pHCare',
        'Đã phê duyệt đối soát tự động mã Spark Ads TikTok — Giải tỏa 50.000.000 đ ngân sách gap!'
      );
    }
  };

  const handleRebalanceCapacity = () => {
    setIsCapacityRebalanced(true);
    if (onPingStaffNotification) {
      onPingStaffNotification(
        'Team Lead Booking',
        'Đã điều phối 3 nhân sự hỗ trợ cho cụm gian hàng EUPC, Natural Care, Keyshu, Lipit để bù đắp 203M gap capacity!'
      );
    }
  };

  // Filter 26 staff list
  const filteredStaffProgress = BOOKING_STAFF_PROGRESS_26.filter((staff) => {
    if (airFilter === 'LAGGING') return staff.isLagging || staff.airProgress < 50;
    if (airFilter === 'OVER_BUDGET') return staff.budgetProgress > 100;
    if (airFilter === 'GOOD') return staff.airProgress >= 80;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* 4 phân khu điều phối (tách biệt với các báo cáo); chọn kỳ nằm cùng hàng khi ở tab hạn mức */}
      <Tabs
        value={activeTab}
        onChange={(k) => setActiveTab(k as typeof activeTab)}
        items={[
          { key: 'DELEGATION', label: 'Phân công gian hàng' },
          { key: 'ALLOCATION', label: 'Hạn mức & duyệt Plan' },
          { key: 'SLA_MANAGEMENT', label: 'Vi phạm SLA', count: slaBreaches.filter(b => b.status !== 'RESOLVED').length, tone: 'critical' },
          { key: 'MINDMAP', label: 'Sơ đồ phụ trách' },
        ]}
        actions={
          activeTab === 'ALLOCATION' ? (
            <Select
              aria-label="Kỳ kế hoạch"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-auto"
            >
              {masterPlans.map(plan => (
                <option key={plan.month} value={plan.month}>{plan.monthLabel}</option>
              ))}
            </Select>
          ) : undefined
        }
      />

      {/* ========================================================================= */}
      {/* TAB 4: SƠ ĐỒ TỔ CHỨC & LUỒNG PHỤ TRÁCH (MASTER DATA MINDMAP VIEW)          */}
      {/* ========================================================================= */}
      {activeTab === 'MINDMAP' && (
        <div className="animate-in fade-in duration-150">
          <MasterDataMindmapView
            currentUser={currentUser || {
              id: 'user-van-ngoc',
              name: 'Vân Ngọc',
              email: 'vanngoc@upbase.vn',
              role: 'MANAGER',
              roleTitle: 'Operations & Division Head',
              avatar: 'VN'
            }}
            brands={currentBrands}
            storePortfolios={currentStores}
            onNotify={(msg) => {
              if (onPingStaffNotification) {
                onPingStaffNotification('Trưởng Phòng', msg);
              }
            }}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: TRUNG TÂM PHÂN CÔNG & GIAO VIỆC (MANAGER DELEGATION HUB)           */}
      {/* ========================================================================= */}
      {activeTab === 'DELEGATION' && (
        <ManagerDelegationHub
          currentUser={currentUser || {
            id: 'user-van-ngoc',
            name: 'Vân Ngọc',
            email: 'vanngoc@upbase.vn',
            role: 'MANAGER',
            roleTitle: 'Operations & Division Head',
            avatar: 'VN'
          }}
          brands={currentBrands}
          onUpdateBrand={handleUpdateBrand}
          onAddBrand={handleAddBrand}
          storePortfolios={currentStores}
          onUpdateStore={handleUpdateStore}
          staffList={STAFF_MASTER_DIRECTORY}
          tasks={currentTasks}
          onAddTask={handleAddTask}
          onPingStaff={onPingStaffNotification}
          onNavigateToDashboard={onNavigateToTab}
          onNotify={(msg) => {
            if (onPingStaffNotification) {
              onPingStaffNotification('Trưởng Phòng', msg);
            }
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 0: TWO-LEVEL TOP-DOWN ALLOCATION (QUẢN LÝ CHỈ TIÊU TRƯỞNG PHÒNG)     */}
      {/* ========================================================================= */}
      {activeTab === 'ALLOCATION' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented
              value={allocationSubTab}
              onChange={setAllocationSubTab}
              items={[
                { key: '4_TIER', label: 'Hạn mức 4 bậc & Phân bổ 26 chuyên viên' },
                { key: 'GROWTH', label: 'Nhu cầu KOC từ team Growth' },
              ]}
            />
            {currentPlan.status === 'COMPLETED' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sunken border border-line text-xs text-ink-2">
                <ShieldAlert className="w-3.5 h-3.5 text-ink-3 shrink-0" />
                <span>Kỳ lịch sử <strong>{currentPlan.monthLabel}</strong> đã khóa sổ đối soát — Dữ liệu được bảo toàn (Chỉ xem)</span>
              </div>
            )}
          </div>

          {allocationSubTab === 'GROWTH' && (
            <div className="space-y-4">
              <GrowthPlanBreakdownView
                onNotify={(msg) => {
                  if (onPingStaffNotification) {
                    onPingStaffNotification('Booking Lead', msg);
                  }
                }}
                onGenerateDealsFromPlan={onGenerateDealsFromPlan}
              />
            </div>
          )}

          {allocationSubTab === '4_TIER' && (
            <div className="space-y-5">
          {/* Supervisor / Read-Only Notice if not Manager */}
          {!isManager && (
            <div className="p-2.5 bg-warning-soft border border-warning/20 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-warning">
                <ShieldAlert className="w-4 h-4 text-warning shrink-0" />
                <span className="font-medium text-ink">
                  Chế độ giám sát: Bạn có quyền xem tiến độ và chi tiết kế hoạch các chuyên viên.
                </span>
              </div>
              <span className="-warning/20 text-warning text-2xs font-semibold shrink-0">
                Chỉ xem
              </span>
            </div>
          )}

          {/* CẤP 1: QUẢN LÝ TỔNG HẠN MỨC THEO 4 TIER KOC / KOL */}
          <div className="card-enterprise p-5 bg-white border border-line shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-line">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-2 h-2 rounded-full bg-accent" />
                  <h3 className="text-sm font-semibold text-ink tracking-tight">
                    Cấp 1: Hạn mức 4 bậc KOC / KOL toàn phòng — {currentPlan.monthLabel}
                  </h3>
                  <span className={`text-2xs px-2 py-0.5 rounded-full font-semibold border ${
                    currentPlan.status === 'COMPLETED' ? 'bg-sunken text-ink-2 border-line-strong' :
                    currentPlan.status === 'ACTIVE' ? 'bg-positive-soft text-positive border-positive/20' :
                    'bg-warning-soft text-warning border-warning/20'
                  }`}>
                    {currentPlan.status === 'COMPLETED' ? 'Đã khóa sổ lịch sử' : currentPlan.status === 'ACTIVE' ? 'Đang thực hiện' : 'Dự thảo Q4'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {currentPlan.status === 'COMPLETED' ? (
                  <span className=".5 -line text-ink-2 text-xs font-medium flex items-center gap-1.5 cursor-not-allowed">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-ink-3" />
                    <span>Đã chốt sổ (Chỉ xem)</span>
                  </span>
                ) : isManager ? (
                  <button
                    onClick={handleOpenEditTierQuota}
                    className="px-3 py-1.5 bg-accent-soft hover:bg-accent-soft text-accent border border-accent/20 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Cấu hình hạn mức 4 bậc</span>
                  </button>
                ) : (
                  <span className=".5 -line text-ink-3 text-xs font-medium flex items-center gap-1.5 cursor-not-allowed">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-ink-3" />
                    <span>Hạn mức định mức (khóa bởi Lead)</span>
                  </span>
                )}
              </div>
            </div>

            {/* Ceiling Metrics Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-b border-line">
              <div>
                <span className="text-2xs text-ink-3 font-medium block">Trần ngân sách {currentPlan.monthLabel}</span>
                <div className="text-xl font-semibold text-ink mt-0.5 font-mono">{TOTAL_CEILING_BUDGET.toLocaleString('vi-VN')} đ</div>
                <div className="flex items-center justify-between text-2xs text-ink-3 mt-1">
                  <span>Đã giao: <strong className="text-accent font-semibold font-mono">{totalAllocatedBudget.toLocaleString('vi-VN')} đ</strong></span>
                  <span className={remainingBudget === 0 ? 'text-positive font-semibold' : remainingBudget < 0 ? 'text-critical font-semibold' : 'text-warning font-semibold'}>
                    {remainingBudget === 0 ? 'Cân đối 100%' : remainingBudget < 0 ? `Vượt: ${Math.abs(remainingBudget).toLocaleString('vi-VN')} đ` : `Còn: ${remainingBudget.toLocaleString('vi-VN')} đ`}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-sunken rounded-full mt-2 overflow-hidden">
                  <div 
                    className={`data-bar h-full rounded-full ${totalAllocatedBudget > TOTAL_CEILING_BUDGET ? 'bg-critical' : 'bg-accent'}`}
                    style={{ width: `${Math.min(100, (totalAllocatedBudget / TOTAL_CEILING_BUDGET) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <span className="text-2xs text-ink-3 font-medium block">Chỉ tiêu video toàn phòng</span>
                <div className="text-xl font-semibold text-ink mt-0.5 font-mono">{TOTAL_TARGET_VIDEOS.toLocaleString('vi-VN')} video</div>
                <div className="flex items-center justify-between text-2xs text-ink-3 mt-1">
                  <span>Đã giao: <strong className="text-ink-2 font-semibold font-mono">{totalAllocatedVideos.toLocaleString('vi-VN')}</strong></span>
                  <span className={remainingVideos === 0 ? 'text-positive font-semibold' : remainingVideos < 0 ? 'text-critical font-semibold' : 'text-ink-2'}>
                    {remainingVideos === 0 ? '100% cân đối' : remainingVideos < 0 ? `Vượt +${Math.abs(remainingVideos)}` : `Còn ${remainingVideos}`}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-sunken rounded-full mt-2 overflow-hidden">
                  <div 
                    className={`data-bar h-full rounded-full ${totalAllocatedVideos > TOTAL_TARGET_VIDEOS ? 'bg-critical' : 'bg-sunken'}`}
                    style={{ width: `${Math.min(100, (totalAllocatedVideos / TOTAL_TARGET_VIDEOS) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <span className="text-2xs text-ink-3 font-medium block">Mục tiêu doanh số (GMV)</span>
                <div className="text-xl font-semibold text-positive mt-0.5 font-mono">{totalTargetGmv.toLocaleString('vi-VN')} đ</div>
                <div className="flex items-center justify-between text-2xs text-ink-3 mt-1">
                  <span>Thực đạt: <strong className="text-ink font-semibold font-mono">{(allocations.reduce((sum, a) => sum + (a.actualGmv || 0), 0) / 1000000000).toFixed(2)} tỷ</strong></span>
                  <span className="text-positive font-semibold font-mono">
                    {totalTargetGmv > 0 ? Math.round((allocations.reduce((sum, a) => sum + (a.actualGmv || 0), 0) / totalTargetGmv) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-sunken rounded-full mt-2 overflow-hidden">
                  <div 
                    className="data-bar h-full bg-positive rounded-full" 
                    style={{ width: `${totalTargetGmv > 0 ? Math.min(100, (allocations.reduce((sum, a) => sum + (a.actualGmv || 0), 0) / totalTargetGmv) * 100) : 0}%` }} 
                  />
                </div>
              </div>

              <div>
                <span className="text-2xs text-ink-3 font-medium block">Quy mô & tải nhân sự</span>
                <div className="text-xl font-semibold text-ink mt-0.5 font-mono">{allocations.length} chuyên viên</div>
                <div className="flex items-center justify-between text-2xs text-ink-3 mt-1">
                  <span>{allocations.filter(a => !a.isLagging).length} đạt tiến độ</span>
                  <span className="text-critical font-semibold">{allocations.filter(a => a.isLagging).length} cần hỗ trợ</span>
                </div>
                <div className="w-full h-1.5 bg-sunken rounded-full mt-2 overflow-hidden">
                  <div 
                    className="data-bar h-full bg-critical rounded-full" 
                    style={{ width: `${(allocations.filter(a => a.isLagging).length / allocations.length) * 100}%` }} 
                  />
                </div>
              </div>
            </div>

            {/* 4 TIER MASTER QUOTA CARDS */}
            <div className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                  <LayersIcon className="w-3.5 h-3.5 text-accent" />
                  Hạn mức chi tiết theo 4 bậc KOC / KOL ({currentPlan.tierQuotas.length} bậc)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {currentPlan.tierQuotas.map((tier) => {
                  const allocatedVideos = teamTierAllocated[tier.tierId] || 0;
                  const diff = allocatedVideos - tier.targetVideos;
                  const isBalanced = diff === 0;
                  const isOver = diff > 0;
                  const pctAllocated = tier.targetVideos > 0 ? Math.round((allocatedVideos / tier.targetVideos) * 100) : 0;
                  const budgetShare = TOTAL_CEILING_BUDGET > 0 ? ((tier.totalBudget / TOTAL_CEILING_BUDGET) * 100).toFixed(1) : 0;

                  const tierMeta = {
                    TIER_1_CELEB: {
                      badgeBg: 'bg-critical-soft text-critical border-critical/20',
                      borderAccent: 'border-l-rose-500',
                      barColor: 'bg-critical',
                      icon: Crown
                    },
                    TIER_2_MACRO: {
                      badgeBg: 'bg-accent-soft text-accent border-accent/20',
                      borderAccent: 'border-l-blue-500',
                      barColor: 'bg-accent',
                      icon: Award
                    },
                    TIER_3_MICRO: {
                      badgeBg: 'bg-positive-soft text-positive border-positive/20',
                      borderAccent: 'border-l-emerald-500',
                      barColor: 'bg-positive',
                      icon: Target
                    },
                    TIER_4_AFFILIATE: {
                      badgeBg: 'bg-sunken text-ink-2 border-line',
                      borderAccent: 'border-l-slate-500',
                      barColor: 'bg-sunken',
                      icon: Package
                    }
                  }[tier.tierId] || {
                    badgeBg: 'bg-sunken text-ink-2 border-line',
                    borderAccent: 'border-l-slate-500',
                    barColor: 'bg-sunken',
                    icon: Video
                  };

                  const IconComp = tierMeta.icon;

                  return (
                    <div 
                      key={tier.tierId}
                      className={`bg-white border border-line border-l-4 ${tierMeta.borderAccent} rounded-xl p-4 flex flex-col justify-between hover:border-line-strong shadow-2xs transition`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <span className="text-xs font-semibold text-ink flex items-center gap-1.5 truncate">
                            <IconComp className="w-3.5 h-3.5 shrink-0 text-ink-3" />
                            <span className="truncate">{tier.tierName.split('—')[1]?.trim() || tier.tierName}</span>
                          </span>
                          <span className={`text-2xs font-mono px-2 py-0.5 rounded border shrink-0 font-semibold ${tierMeta.badgeBg}`}>
                            {tier.klRange}
                          </span>
                        </div>

                        {/* Ceiling Videos & Budget */}
                        <div className="space-y-1.5 mt-3">
                          <div className="flex items-baseline justify-between">
                            <span className="text-2xs text-ink-3">Trần số lượng:</span>
                            <span className="text-sm font-semibold text-ink font-mono">{tier.targetVideos.toLocaleString('vi-VN')} clips</span>
                          </div>

                          <div className="flex items-baseline justify-between">
                            <span className="text-2xs text-ink-3">Trần ngân sách:</span>
                            <span className="text-xs font-semibold text-ink-2 font-mono">
                              {(tier.totalBudget / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}M đ ({budgetShare}%)
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between text-2xs text-ink-3">
                            <span>Đơn giá TB:</span>
                            <span className="font-mono text-ink-2">
                              ~{(tier.avgCostPerVideo / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}M / clip
                            </span>
                          </div>
                        </div>

                        <p className="text-2xs text-ink-3 mt-2.5 line-clamp-2 leading-relaxed">
                          {tier.description}
                        </p>
                      </div>

                      {/* Allocation Balance Tracker */}
                      <div className="mt-4 pt-3 border-t border-line">
                        <div className="flex items-center justify-between text-2xs mb-1">
                          <span className="text-ink-3">Đã giao cho NV:</span>
                          <span className="font-mono font-semibold text-ink">
                            {allocatedVideos} / {tier.targetVideos}
                          </span>
                        </div>

                        <div className="w-full h-1.5 bg-sunken rounded-full overflow-hidden">
                          <div 
                            className={`data-bar h-full rounded-full ${isOver ? 'bg-critical' : isBalanced ? 'bg-positive' : tierMeta.barColor}`}
                            style={{ width: `${Math.min(100, pctAllocated)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between mt-2 text-2xs">
                          <span className="text-ink-3 font-mono">{pctAllocated}% trần</span>
                          {isBalanced ? (
                            <span className="text-positive font-semibold flex items-center gap-1">
                              <Check className="w-3 h-3" /> Cân đối 100%
                            </span>
                          ) : isOver ? (
                            <span className="text-critical font-semibold flex items-center gap-0.5">
                              <AlertTriangle className="w-3 h-3" /> Vượt trần +{diff}
                            </span>
                          ) : (
                            <span className="text-accent font-medium">
                              Còn trống {Math.abs(diff)} clips
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search className="w-4 h-4 text-ink-3 shrink-0" />
              <input
                type="text"
                placeholder="Tìm nhân sự, nhãn hàng..."
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                className="w-full bg-white border border-line rounded-lg px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-accent/20 shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => setAllocationFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  allocationFilter === 'ALL' ? 'bg-accent text-white' : 'bg-white text-ink-2 hover:text-ink border border-line hover:bg-canvas'
                }`}
              >
                Tất cả ({allocations.length})
              </button>
              <button
                onClick={() => setAllocationFilter('LAGGING')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  allocationFilter === 'LAGGING' ? 'bg-critical text-white' : 'bg-white text-ink-2 hover:text-ink border border-line hover:bg-canvas'
                }`}
              >
                Chậm tiến độ (&lt;50%)
              </button>
              <button
                onClick={() => setAllocationFilter('GOOD')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  allocationFilter === 'GOOD' ? 'bg-positive text-white' : 'bg-white text-ink-2 hover:text-ink border border-line hover:bg-canvas'
                }`}
              >
                Tiến độ tốt (&gt;=80%)
              </button>
            </div>
          </div>

          {/* CẤP 2: BẢNG MA TRẬN PHÂN BỔ ĐA CHIỀU XUỐNG 26 NHÂN SỰ & GIÁM SÁT PLAN */}
          <div className="card-enterprise overflow-hidden">
            <div className="px-5 py-3 border-b border-line bg-canvas flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-semibold text-ink flex items-center gap-2">
                  <Table className="w-4 h-4 text-accent" />
                  <span>Cấp 2: Ma trận phân bổ chỉ tiêu & giám sát plan 26 chuyên viên</span>
                  <span className="text-2xs font-normal text-ink-3 font-mono">({currentPlan.monthLabel})</span>
                </h4>
                
              </div>

              <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
                {/* Matrix Mode Switcher */}
                <div className="flex items-center gap-1 bg-sunken border border-line rounded-lg p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setMatrixViewMode('4_TIER')}
                    className={`px-2.5 py-1 rounded font-semibold text-2xs transition flex items-center gap-1.5 ${
                      matrixViewMode === '4_TIER' ? 'bg-accent text-white shadow-sm' : 'text-ink-2 hover:text-ink'
                    }`}
                  >
                    <LayersIcon className="w-3.5 h-3.5" />
                    <span>Ma trận 4 bậc</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatrixViewMode('BRANDS')}
                    className={`px-2.5 py-1 rounded font-semibold text-2xs transition flex items-center gap-1.5 ${
                      matrixViewMode === 'BRANDS' ? 'bg-accent text-white shadow-sm' : 'text-ink-2 hover:text-ink'
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>Ma trận nhãn hàng</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatrixViewMode('WEEKS')}
                    className={`px-2.5 py-1 rounded font-semibold text-2xs transition flex items-center gap-1.5 ${
                      matrixViewMode === 'WEEKS' ? 'bg-accent text-white shadow-sm' : 'text-ink-2 hover:text-ink'
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>Ma trận tuần (W1-W4)</span>
                  </button>
                </div>

                <span className="badge-blue .5 text-2xs font-semibold">
                  {allocations.filter((staff) => {
                    const matchesSearch = staffSearch === '' || 
                      staff.staffName.toLowerCase().includes(staffSearch.toLowerCase()) ||
                      staff.assignedBrands.some(b => b.toLowerCase().includes(staffSearch.toLowerCase()));
                    if (!matchesSearch) return false;
                    if (allocationFilter === 'LAGGING') return staff.isLagging || staff.airProgress < 50;
                    if (allocationFilter === 'GOOD') return staff.airProgress >= 80;
                    return true;
                  }).length} nhân sự
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="table-header-enterprise bg-canvas">
                    <th className="p-3 pl-5 text-ink-2 font-semibold min-w-[170px] sticky left-0 z-20 bg-canvas border-r border-line shadow-[2px_0_5px_rgba(0,0,0,0.04)]">
                      Nhân sự & vị trí
                    </th>
                    {matrixViewMode !== 'BRANDS' && (
                      <th className="p-3 text-ink-2 font-semibold min-w-[140px]">Nhãn hàng phụ trách</th>
                    )}
                    
                    {/* DYNAMIC MATRIX COLUMNS */}
                    {matrixViewMode === '4_TIER' && (
                      <>
                        <th className="p-3 text-center text-critical font-semibold">T1 Celeb (KL7)</th>
                        <th className="p-3 text-center text-accent font-semibold">T2 Macro (KL6)</th>
                        <th className="p-3 text-center text-positive font-semibold">T3 Micro (KL4-5)</th>
                        <th className="p-3 text-center text-ink-2 font-semibold">T4 Nano (KL1-3)</th>
                      </>
                    )}

                    {matrixViewMode === 'BRANDS' && (
                      MATRIX_BRANDS.map(brand => (
                        <th key={brand} className="p-3 text-center text-ink-2 font-semibold">
                          {brand}
                        </th>
                      ))
                    )}

                    {matrixViewMode === 'WEEKS' && (
                      MATRIX_WEEKS.map(week => (
                        <th key={week} className="p-3 text-center text-ink-2 font-semibold">
                          Tuần {week}
                        </th>
                      ))
                    )}

                    <th className="p-3 text-right text-ink-2 font-semibold">Tổng video</th>
                    <th className="p-3 text-right text-ink-2 font-semibold">Ngân sách giao</th>
                    <th className="p-3 text-right text-ink-2 font-semibold">Mục tiêu GMV</th>
                    <th className="p-3 text-center text-ink-2 font-semibold min-w-[150px]">
                      <span>Plan nhân viên</span>
                      <span className="block text-2xs text-ink-3 font-normal">Độ lấp đầy & duyệt</span>
                    </th>
                    <th className="p-3 pr-5 text-right text-ink-2 font-semibold min-w-[130px]">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {allocations.filter((staff) => {
                    const matchesSearch = staffSearch === '' || 
                      staff.staffName.toLowerCase().includes(staffSearch.toLowerCase()) ||
                      staff.assignedBrands.some(b => b.toLowerCase().includes(staffSearch.toLowerCase()));
                    if (!matchesSearch) return false;
                    if (allocationFilter === 'LAGGING') return staff.isLagging || staff.airProgress < 50;
                    if (allocationFilter === 'GOOD') return staff.airProgress >= 80;
                    return true;
                  }).map((staff) => {
                    const staffPlanItems = localPlanItems.filter(p => p.staffName === staff.staffName);
                    const plannedCount = staffPlanItems.length;
                    const fillPct = Math.round((plannedCount / (staff.planVideos || 1)) * 100);
                    const hasSubmitted = staffPlanItems.some(p => p.status === 'SUBMITTED');
                    const hasRevision = staffPlanItems.some(p => p.status === 'REVISION_REQUESTED');
                    const isFullyApproved = staffPlanItems.length > 0 && staffPlanItems.every(p => p.status === 'APPROVED' || p.status === 'CONVERTED');

                    return (
                      <tr key={staff.id} className="table-row-enterprise hover:bg-canvas transition-colors group">
                        {/* Name & Title */}
                        <td className="p-3 pl-5 sticky left-0 z-10 bg-white group-hover:bg-canvas border-r border-line shadow-[2px_0_5px_rgba(0,0,0,0.04)] transition-colors">
                          <div className="font-semibold text-ink text-xs">{staff.staffName}</div>
                          <div className="text-2xs text-ink-3 mt-0.5">{staff.roleTitle}</div>
                          {staff.isLagging && (
                            <span className="inline-block mt-1 .5 py-0.2 -critical/20 text-critical text-2xs font-medium">
                              Chậm tiến độ
                            </span>
                          )}
                        </td>

                        {/* Brands (if not BRANDS matrix) */}
                        {matrixViewMode !== 'BRANDS' && (
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1 max-w-[170px]">
                              {staff.assignedBrands.map(b => (
                                <span key={b} className=".5 text-ink-2 text-2xs font-medium -line">
                                  {b}
                                </span>
                              ))}
                            </div>
                          </td>
                        )}

                        {/* DYNAMIC CELL CONTENT BASED ON MATRIX VIEW MODE */}
                        {matrixViewMode === '4_TIER' && (
                          <>
                            <td className="p-3 text-center font-mono">
                              <span className={`px-2 py-0.5 rounded text-2xs font-semibold border ${
                                (staff.tier1Videos || 0) > 0 ? 'bg-critical-soft text-critical border-critical/20' : 'text-ink-3 bg-canvas border-line'
                              }`}>
                                {staff.tier1Videos || 0}
                              </span>
                            </td>
                            <td className="p-3 text-center font-mono">
                              <span className={`px-2 py-0.5 rounded text-2xs font-semibold border ${
                                (staff.tier2Videos || 0) > 0 ? 'bg-accent-soft text-accent border-accent/20' : 'text-ink-3 bg-canvas border-line'
                              }`}>
                                {staff.tier2Videos || 0}
                              </span>
                            </td>
                            <td className="p-3 text-center font-mono">
                              <span className={`px-2 py-0.5 rounded text-2xs font-semibold border ${
                                (staff.tier3Videos || 0) > 0 ? 'bg-positive-soft text-positive border-positive/20' : 'text-ink-3 bg-canvas border-line'
                              }`}>
                                {staff.tier3Videos || 0}
                              </span>
                            </td>
                            <td className="p-3 text-center font-mono">
                              <span className="text-2xs font-semibold text-ink-2 -line">
                                {staff.tier4Videos ?? staff.planVideos}
                              </span>
                            </td>
                          </>
                        )}

                        {matrixViewMode === 'BRANDS' && (
                          MATRIX_BRANDS.map(brand => {
                            const isAssigned = staff.assignedBrands.some(b => b.toLowerCase().includes(brand.toLowerCase()));
                            const brandItemsCount = staffPlanItems.filter(p => p.brandName.toLowerCase().includes(brand.toLowerCase())).length;
                            return (
                              <td key={brand} className="p-3 text-center font-mono">
                                {isAssigned ? (
                                  <span className="text-2xs font-semibold text-accent -accent/20">
                                    {brandItemsCount > 0 ? `${brandItemsCount} clips` : 'Phụ trách'}
                                  </span>
                                ) : (
                                  <span className="text-ink-3 text-2xs">—</span>
                                )}
                              </td>
                            );
                          })
                        )}

                        {matrixViewMode === 'WEEKS' && (
                          MATRIX_WEEKS.map(week => {
                            const weekCount = staffPlanItems.filter(p => p.targetWeek === week).length;
                            return (
                              <td key={week} className="p-3 text-center font-mono">
                                <span className={`px-2 py-0.5 rounded text-2xs font-semibold border ${
                                  weekCount > 0 ? 'bg-positive-soft text-positive border-positive/20' : 'text-ink-3 bg-canvas border-line'
                                }`}>
                                  {weekCount} clips
                                </span>
                              </td>
                            );
                          })
                        )}

                        {/* Tổng Video */}
                        <td className="p-3 text-right">
                          <div className="font-semibold text-ink font-mono">{staff.reportVideos} / {staff.planVideos}</div>
                          <div className="text-2xs text-ink-3 mt-0.5">
                            Đạt <strong className={staff.airProgress >= 80 ? 'text-positive' : staff.airProgress < 50 ? 'text-critical' : 'text-warning'}>
                              {staff.airProgress}%
                            </strong>
                          </div>
                        </td>

                        {/* Ngân Sách */}
                        <td className="p-3 text-right">
                          <div className="font-semibold text-accent font-mono">
                            {staff.planBudget.toLocaleString('vi-VN')} đ
                          </div>
                          <div className="text-2xs text-ink-3 mt-0.5">
                            Đã chi: {formatVndShort(staff.reportBudget)}
                          </div>
                        </td>

                        {/* GMV */}
                        <td className="p-3 text-right">
                          <div className="font-semibold text-positive font-mono">
                            {staff.targetGmv.toLocaleString('vi-VN')} đ
                          </div>
                          <div className="text-2xs text-ink-3 mt-0.5">
                            Đạt: {formatVndShort(staff.actualGmv)}
                          </div>
                        </td>

                        {/* Plan Nhân Viên (Fill Rate) */}
                        <td className="p-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-semibold text-ink font-mono text-2xs">
                              {plannedCount}/{staff.planVideos} clips ({fillPct}%)
                            </span>
                            <div className="w-20 bg-sunken h-1.5 rounded-full overflow-hidden">
                              <div 
                                className={`data-bar h-full ${fillPct >= 90 ? 'bg-positive' : fillPct > 50 ? 'bg-warning' : 'bg-sunken'}`}
                                style={{ width: `${Math.min(100, fillPct)}%` }}
                              />
                            </div>
                            <span className={`text-2xs font-semibold px-1.5 py-0.2 rounded border ${
                              hasSubmitted ? 'bg-warning-soft text-warning border-warning/20' :
                              isFullyApproved ? 'bg-positive-soft text-positive border-positive/20' :
                              hasRevision ? 'bg-critical-soft text-critical border-critical/20' :
                              'bg-sunken text-ink-2 border-line'
                            }`}>
                              {hasSubmitted ? 'Chờ duyệt' :
                               isFullyApproved ? 'Đã duyệt' :
                               hasRevision ? 'Cần sửa' : 'Đang lập plan'}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="p-3 pr-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setInspectingStaffAllocation(staff)}
                              title="Soi chi tiết toàn bộ danh sách KOC do nhân viên này lập và duyệt plan"
                              className="px-2.5 py-1 bg-accent-soft hover:bg-accent-soft text-accent border border-accent/20 rounded text-xs font-semibold transition flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Soi Plan</span>
                            </button>
                            {isManager && currentPlan.status !== 'COMPLETED' && (
                              <button
                                onClick={() => handleOpenEditAlloc(staff)}
                                title="Chỉnh sửa hạn mức phân bổ theo bậc"
                                className="px-2 py-1 bg-white hover:bg-sunken text-ink-2 border border-line rounded text-xs font-medium transition flex items-center gap-1"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Sửa</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* ========================================================================= */}
                {/* FOOTER: BẢNG ĐỐI SOÁT MA TRẬN VÀ TRẦN PLAN TỔNG                          */}
                {/* ========================================================================= */}
                <tfoot className="border-t-2 border-line-strong font-mono text-xs">
                  {/* Row 1: Tổng Phân Bổ Toàn Bộ Nhân Sự */}
                  <tr className="bg-sunken font-semibold text-ink">
                    <td className="p-3 pl-5 sticky left-0 z-10 bg-sunken border-r border-line shadow-[2px_0_5px_rgba(0,0,0,0.04)]">
                      <span className="text-ink text-2xs">Tổng phân bổ (26 nhân sự)</span>
                    </td>
                    {matrixViewMode !== 'BRANDS' && <td className="p-3 text-ink-2">Toàn bộ nhãn hàng</td>}

                    {matrixViewMode === '4_TIER' && (
                      <>
                        <td className="p-3 text-center text-critical font-semibold">{teamTierAllocated.TIER_1_CELEB} clips</td>
                        <td className="p-3 text-center text-accent font-semibold">{teamTierAllocated.TIER_2_MACRO} clips</td>
                        <td className="p-3 text-center text-positive font-semibold">{teamTierAllocated.TIER_3_MICRO} clips</td>
                        <td className="p-3 text-center text-ink-2 font-semibold">{teamTierAllocated.TIER_4_AFFILIATE} clips</td>
                      </>
                    )}

                    {matrixViewMode === 'BRANDS' && (
                      MATRIX_BRANDS.map(b => (
                        <td key={b} className="p-3 text-center text-ink-2">
                          {allocations.filter(s => s.assignedBrands.some(ab => ab.toLowerCase().includes(b.toLowerCase()))).length} P.Trách
                        </td>
                      ))
                    )}

                    {matrixViewMode === 'WEEKS' && (
                      MATRIX_WEEKS.map(w => (
                        <td key={w} className="p-3 text-center text-positive font-semibold">
                          {localPlanItems.filter(p => p.targetWeek === w).length} clips
                        </td>
                      ))
                    )}

                    <td className="p-3 text-right text-ink font-semibold">{totalAllocatedVideos} clips</td>
                    <td className="p-3 text-right text-accent font-semibold">{formatVndShort(totalAllocatedBudget)}</td>
                    <td className="p-3 text-right text-positive font-semibold">{formatVndShort(totalTargetGmv)}</td>
                    <td className="p-3 text-center text-ink-2">{localPlanItems.length} clips đã lập</td>
                    <td className="p-3 pr-5 text-right text-ink-3">—</td>
                  </tr>

                  {/* Row 2: Trần Kế Hoạch Tổng Của Trưởng Phòng */}
                  <tr className="bg-canvas text-ink-2">
                    <td className="p-3 pl-5 font-semibold text-ink-2 sticky left-0 z-10 bg-canvas border-r border-line shadow-[2px_0_5px_rgba(0,0,0,0.04)]">
                      Trần kế hoạch tổng (Trưởng phòng)
                    </td>
                    {matrixViewMode !== 'BRANDS' && <td className="p-3 text-ink-3">Định mức chốt</td>}

                    {matrixViewMode === '4_TIER' && (
                      <>
                        <td className="p-3 text-center text-critical font-medium">{currentPlan.tierQuotas.find(t => t.tierId === 'TIER_1_CELEB')?.targetVideos || 0} trần</td>
                        <td className="p-3 text-center text-accent font-medium">{currentPlan.tierQuotas.find(t => t.tierId === 'TIER_2_MACRO')?.targetVideos || 0} trần</td>
                        <td className="p-3 text-center text-positive font-medium">{currentPlan.tierQuotas.find(t => t.tierId === 'TIER_3_MICRO')?.targetVideos || 0} trần</td>
                        <td className="p-3 text-center text-ink-2 font-medium">{currentPlan.tierQuotas.find(t => t.tierId === 'TIER_4_AFFILIATE')?.targetVideos || 0} trần</td>
                      </>
                    )}

                    {matrixViewMode === 'BRANDS' && (
                      MATRIX_BRANDS.map(b => (
                        <td key={b} className="p-3 text-center text-ink-3">Chỉ tiêu</td>
                      ))
                    )}

                    {matrixViewMode === 'WEEKS' && (
                      MATRIX_WEEKS.map(w => (
                        <td key={w} className="p-3 text-center text-ink-3">Kế hoạch tuần</td>
                      ))
                    )}

                    <td className="p-3 text-right text-ink-2">{TOTAL_TARGET_VIDEOS} clips</td>
                    <td className="p-3 text-right text-accent">{formatVndShort(TOTAL_CEILING_BUDGET)}</td>
                    <td className="p-3 text-right text-positive">{formatVndShort(currentPlan.totalTargetGmv)}</td>
                    <td className="p-3 text-center text-ink-2">100% mục tiêu</td>
                    <td className="p-3 pr-5 text-right text-ink-3">—</td>
                  </tr>

                  {/* Row 3: Chênh lệch đối soát */}
                  <tr className="bg-white font-semibold text-ink border-t border-line">
                    <td className="p-3 pl-5 text-ink sticky left-0 z-10 bg-white border-r border-line shadow-[2px_0_5px_rgba(0,0,0,0.04)]">
                      Chênh lệch đối soát
                    </td>
                    {matrixViewMode !== 'BRANDS' && <td className="p-3 text-ink-3">—</td>}

                    {matrixViewMode === '4_TIER' && (
                      <>
                        {[
                          { key: 'TIER_1_CELEB' as const, val: teamTierAllocated.TIER_1_CELEB, target: currentPlan.tierQuotas.find(t => t.tierId === 'TIER_1_CELEB')?.targetVideos || 0 },
                          { key: 'TIER_2_MACRO' as const, val: teamTierAllocated.TIER_2_MACRO, target: currentPlan.tierQuotas.find(t => t.tierId === 'TIER_2_MACRO')?.targetVideos || 0 },
                          { key: 'TIER_3_MICRO' as const, val: teamTierAllocated.TIER_3_MICRO, target: currentPlan.tierQuotas.find(t => t.tierId === 'TIER_3_MICRO')?.targetVideos || 0 },
                          { key: 'TIER_4_AFFILIATE' as const, val: teamTierAllocated.TIER_4_AFFILIATE, target: currentPlan.tierQuotas.find(t => t.tierId === 'TIER_4_AFFILIATE')?.targetVideos || 0 }
                        ].map(t => {
                          const diff = t.val - t.target;
                          return (
                            <td key={t.key} className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-2xs font-semibold inline-block border ${
                                diff === 0 ? 'bg-positive-soft text-positive border-positive/20' :
                                diff > 0 ? 'bg-critical-soft text-critical border-critical/20' :
                                'bg-warning-soft text-warning border-warning/20'
                              }`}>
                                {diff === 0 ? '✓ Khớp' : diff > 0 ? `Vượt +${diff}` : `Trống ${Math.abs(diff)}`}
                              </span>
                            </td>
                          );
                        })}
                      </>
                    )}

                    {matrixViewMode === 'BRANDS' && (
                      MATRIX_BRANDS.map(b => {
                        const count = allocations.filter(s => s.assignedBrands.some(ab => ab.toLowerCase().includes(b.toLowerCase()))).length;
                        return (
                          <td key={b} className="p-3 text-center">
                            <span className="text-2xs font-medium text-accent -accent/20 inline-block">
                              ✓ {count} NV
                            </span>
                          </td>
                        );
                      })
                    )}

                    {matrixViewMode === 'WEEKS' && (
                      MATRIX_WEEKS.map(w => {
                        const count = localPlanItems.filter(p => p.targetWeek === w).length;
                        const phaseLabel = w === 'W1' ? 'Khởi động' : w === 'W2' ? 'Tăng tốc' : w === 'W3' ? 'Cao điểm' : 'Về đích';
                        return (
                          <td key={w} className="p-3 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className=".5 py-0.2 text-2xs font-semibold text-ink-2 -line">
                                {phaseLabel}
                              </span>
                              <span className="text-2xs text-ink-2 font-mono">{count} clips</span>
                            </div>
                          </td>
                        );
                      })
                    )}

                    <td className={`p-3 text-right ${remainingVideos === 0 ? 'text-positive' : remainingVideos > 0 ? 'text-warning' : 'text-critical'}`}>
                      {remainingVideos === 0 ? '✓ Khớp trần' : remainingVideos > 0 ? `Còn ${remainingVideos} clips` : `Vượt ${Math.abs(remainingVideos)}`}
                    </td>
                    <td className={`p-3 text-right ${remainingBudget === 0 ? 'text-positive' : remainingBudget > 0 ? 'text-warning' : 'text-critical'}`}>
                      {remainingBudget === 0 ? '✓ Khớp trần' : remainingBudget > 0 ? `Còn ${formatVndShort(remainingBudget)}` : `Vượt ${formatVndShort(Math.abs(remainingBudget))}`}
                    </td>
                    <td className="p-3 text-right text-positive">
                      {totalTargetGmv >= currentPlan.totalTargetGmv ? '✓ Đạt chỉ tiêu' : `Hụt ${formatVndShort((currentPlan.totalTargetGmv - totalTargetGmv))}`}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-2xs font-semibold px-2 py-0.5 rounded border inline-block ${
                        remainingBudget >= 0 && remainingVideos >= 0 ? 'bg-positive-soft text-positive border-positive/20' : 'bg-critical-soft text-critical border-critical/20'
                      }`}>
                        {remainingBudget >= 0 && remainingVideos >= 0 ? 'Hợp lệ trần' : 'Vượt định mức'}
                      </span>
                    </td>
                    <td className="p-3 pr-5 text-right text-ink-3">—</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
          )}
        </div>
      )}



      {/* ========================================================================= */}
      {/* KHÔNG GIAN 3: XỬ LÝ VI PHẠM SLA, THÁO GỠ ĐIỂM NGHẼN & KHÓA SỔ ĐỐI SOÁT    */}
      {/* ========================================================================= */}
      {activeTab === 'SLA_MANAGEMENT' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {slaSubTab === 'BREACHES' && (
        <div className="space-y-5">
          {/* Notification Toast Banner when pinging */}
          {pingSuccessStaff && (
            <div className="p-3.5 bg-positive-soft border border-positive/20 text-positive text-xs rounded-xl flex items-center justify-between shadow-xs animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle className="w-4 h-4 text-positive shrink-0" />
                <span>{pingSuccessStaff}</span>
              </div>
              <button onClick={() => setPingSuccessStaff(null)} className="text-positive hover:text-positive cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Banner 1: Cửa Sổ Nghiệm Thu E2E & Quy Chuẩn Khóa Sổ */}
          <div className="card-enterprise p-5 bg-warning/10 border-warning/20/80 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-warning text-white flex items-center justify-center font-semibold shadow-xs">
                    <Timer className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-ink text-sm flex items-center gap-2">
                      Cửa Sổ Nghiệm Thu Đối Soát E2E B2C — Tháng {currentPlan.monthLabel}
                      <span className="text-2xs font-semibold text-warning -warning/20">
                        ● {reconWindow.phaseLabel}
                      </span>
                    </h3>
                    
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <div className="text-xs text-ink-3">Tiến độ sửa sai lệch Round 1</div>
                  <div className="text-sm font-semibold text-warning">
                    {reconWindow.resolvedErrorsCount} / {reconWindow.totalErrorsReportedRound1} lỗi đã fix ({Math.round((reconWindow.resolvedErrorsCount / reconWindow.totalErrorsReportedRound1) * 100)}%)
                  </div>
                </div>
                <span className=".5 -xl font-semibold text-xs bg-warning text-white shadow-2xs">
                  Còn {reconWindow.pendingErrorsCount} lỗi cần xử lý
                </span>
              </div>
            </div>

            {/* 5-Step Visual E2E Reconciliation Roadmap */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-2 border-t border-line/80 text-xs">
              <div className="p-2.5 rounded-lg bg-positive-soft border border-positive/20 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-positive text-2xs">1. MÙNG 2</span>
                  <CheckCircle className="w-3.5 h-3.5 text-positive" />
                </div>
                <p className="text-2xs text-positive">Chốt số & đóng băng số liệu tạm tính</p>
                <span className="text-2xs text-positive font-semibold mt-1">Đã hoàn thành</span>
              </div>

              <div className="p-2.5 rounded-lg bg-positive-soft border border-positive/20 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-positive text-2xs">2. WD04</span>
                  <CheckCircle className="w-3.5 h-3.5 text-positive" />
                </div>
                <p className="text-2xs text-positive">Kế toán gửi báo cáo Sai lệch Round 1 (14 lỗi)</p>
                <span className="text-2xs text-positive font-semibold mt-1">Đã gửi báo cáo</span>
              </div>

              <div className="p-2.5 rounded-lg bg-warning-soft border-2 border-warning/20 shadow-xs flex flex-col justify-between relative overflow-hidden">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-warning text-2xs">3. WD05 (HÔM NAY)</span>
                  <span className="w-2 h-2 rounded-full bg-warning" />
                </div>
                <p className="text-2xs text-warning font-medium">Mở sửa (09:00 - 17:00), khóa cứng 17:30</p>
                <span className="text-2xs text-warning font-semibold mt-1">Đang mở cửa sổ</span>
              </div>

              <div className="p-2.5 rounded-lg bg-canvas border border-line flex flex-col justify-between opacity-80">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-ink-2 text-2xs">4. WD10</span>
                  <Clock className="w-3.5 h-3.5 text-ink-3" />
                </div>
                <p className="text-2xs text-ink-2">Kế toán đối soát & báo cáo Sai lệch Round 2</p>
                <span className="text-2xs text-ink-3 font-medium mt-1">Dự kiến: 29/09</span>
              </div>

              <div className="p-2.5 rounded-lg bg-canvas border border-line flex flex-col justify-between opacity-80">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-ink-2 text-2xs">5. WD11</span>
                  <Lock className="w-3.5 h-3.5 text-ink-3" />
                </div>
                <p className="text-2xs text-ink-2">Mở sửa cuối (09:00 - 17:00), khóa vĩnh viễn 17:30</p>
                <span className="text-2xs text-ink-3 font-medium mt-1">Chốt nghiệm thu cuối</span>
              </div>
            </div>
          </div>

          {/* Banner 2: Quyết định Điều phối & Giải tỏa Điểm nghẽn Vận hành (Operational Unblocking) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card-enterprise p-4 bg-white border border-line shadow-xs flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xs font-semibold text-warning -warning/20">
                    Nghẽn nghiệm thu mã Spark Ads
                  </span>
                  <span className="text-xs font-semibold text-ink">Cụm gian pHCare (50.000.000 đ)</span>
                </div>
                <p className="text-xs text-ink-2">
                  KOC đã lên video nhưng treo nghiệm thu do thiếu xác nhận mã ủy quyền Spark Ads từ Trưởng phòng.
                </p>
              </div>
              <button
                onClick={handleResolveAdsCode}
                disabled={isAdsCodeResolved}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isAdsCodeResolved
                    ? 'bg-positive-soft text-positive border border-positive/20'
                    : 'bg-warning hover:bg-warning text-white shadow-xs'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{isAdsCodeResolved ? 'Đã giải tỏa 50M' : 'Duyệt nghiệm thu mã Ads'}</span>
              </button>
            </div>

            <div className="card-enterprise p-4 bg-white border border-line shadow-xs flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xs font-semibold text-accent -accent/20">
                    Thiếu tải nhân sự Booking
                  </span>
                  <span className="text-xs font-semibold text-ink">Cụm EUPC / G.G.G / Rejuran (164.6M)</span>
                </div>
                <p className="text-xs text-ink-2">
                  Cụm gian hàng hụt tiến độ trả video do thiếu nhân sự hỗ trợ săn KOC và gửi mẫu gấp trong tuần.
                </p>
              </div>
              <button
                onClick={handleRebalanceCapacity}
                disabled={isCapacityRebalanced}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isCapacityRebalanced
                    ? 'bg-positive-soft text-positive border border-positive/20'
                    : 'bg-accent hover:bg-accent text-white shadow-xs'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>{isCapacityRebalanced ? 'Đã điều phối nhân sự' : 'Điều động nhân sự hỗ trợ'}</span>
              </button>
            </div>
          </div>

          {/* Section 1: Nhân sự đang có Vi phạm SLA Mở cần Đốc thúc / Lập biên bản */}
          <div className="card-enterprise p-4 bg-white border border-line shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-semibold text-ink uppercase tracking-wider flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-critical" />
                  Nhân sự có vi phạm SLA đang mở cần đốc thúc ({staffSlaReports.filter(s => s.activeViolationsCount > 0).length} nhân sự)
                </h3>
                
              </div>
              {onNavigateToTab && (
                <button
                  onClick={() => onNavigateToTab('dashboard-sla')}
                  className="px-2.5 py-1.5 rounded-lg text-2xs font-semibold text-accent bg-accent-soft hover:bg-accent-soft border border-accent/20 transition cursor-pointer"
                >
                  Mở Dashboard SLA & Phễu vận hành →
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {staffSlaReports
                .filter(s => s.activeViolationsCount > 0)
                .map(staff => (
                  <div key={staff.id} className="p-3 rounded-xl bg-critical-soft border border-critical/20/80 flex flex-col justify-between gap-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-critical text-white font-semibold text-2xs flex items-center justify-center shrink-0">
                          {staff.avatar}
                        </div>
                        <div>
                          <div className="font-semibold text-ink text-xs">{staff.staffName}</div>
                          <div className="text-2xs text-ink-3">{staff.role} • {staff.onTimeRate}% đúng hạn</div>
                        </div>
                      </div>
                      <span className="text-2xs font-semibold text-critical -critical/20">
                        {staff.activeViolationsCount} lỗi mở ({staff.penaltyPoints}đ)
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-critical/20/60">
                      <button
                        onClick={() => handlePingStaff(staff.staffName, 'Nhắc nhở xử lý vi phạm SLA B2C trước 17:00')}
                        className="flex-1 px-2 py-1 text-2xs font-semibold bg-critical hover:bg-critical text-white rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>Ping Lark</span>
                      </button>
                      <button
                        onClick={() => setAiReviewTargetStaff(staff.staffName)}
                        className="px-2 py-1 text-2xs font-semibold bg-white hover:bg-canvas text-ink-2 border border-line rounded-lg transition cursor-pointer"
                        title="Soạn nhận xét & nhắc nhở"
                      >
                        Nhận xét
                      </button>
                      <button
                        onClick={() => setInspectStaffModal(staff)}
                        className="px-2 py-1 text-2xs font-semibold bg-white hover:bg-canvas text-accent border border-line rounded-lg transition flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Hồ sơ</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Section 2: Queue Vi Phạm SLA Cần Xử Lý & Leo Thang (Active Breaches Queue) */}
          <div className="card-enterprise overflow-hidden bg-white border border-line shadow-xs">
            <div className="px-6 py-4 border-b border-line flex flex-col md:flex-row md:items-center justify-between gap-3 bg-canvas">
              <div>
                <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-critical" />
                  Danh sách vi phạm SLA đang kích hoạt & cần Leo Thang
                </h3>
                
              </div>

              {/* Severity & Category Filters */}
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <select
                  value={slaSeverityFilter}
                  onChange={(e) => setSlaSeverityFilter(e.target.value)}
                  className="bg-white border border-line rounded-lg px-2.5 py-1 text-ink-2 text-xs focus:outline-none"
                >
                  <option value="ALL">Tất cả mức độ</option>
                  <option value="CRITICAL">Khẩn cấp (CRITICAL)</option>
                  <option value="HIGH">Nghiêm trọng (HIGH)</option>
                  <option value="WARNING">Cảnh báo (WARNING)</option>
                </select>

                <select
                  value={slaBreachCategoryFilter}
                  onChange={(e) => setSlaBreachCategoryFilter(e.target.value)}
                  className="bg-white border border-line rounded-lg px-2.5 py-1 text-ink-2 text-xs focus:outline-none max-w-[200px]"
                >
                  <option value="ALL">Tất cả nhóm SLA</option>
                  <option value="CONTRACT_OVER_9M_INVALID">HĐ &gt; 9M thiếu scan/CCCD</option>
                  <option value="SAMPLE_NOT_SHIPPED_2D">Mẫu &gt; 2 ngày chưa xuất kho</option>
                  <option value="NO_TRACKING_CODE_3D">Quá 3 ngày thiếu mã vận đơn</option>
                  <option value="BRAND_ORIENTATION_AUTO_AIR">Brand &gt; 3 ngày không duyệt (Tự Air)</option>
                  <option value="DNTT_OVERDUE_10AM">DNTT trễ sau 10:00 sáng</option>
                  <option value="DATA_LOCKED_7_WORKING_DAYS">Tự khóa do thiếu link &gt; 7 ngày</option>
                </select>
              </div>
            </div>

            <div className="w-full">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-canvas border-b border-line text-ink-2 font-semibold text-2xs">
                  <tr>
                    <th className="py-2 px-2.5 w-[14%]">Mã Deal &amp; KOC</th>
                    <th className="py-2 px-2 w-[12%]">Nhãn hàng</th>
                    <th className="py-2 px-2 w-[22%]">Quy chuẩn vi phạm</th>
                    <th className="py-2 px-1.5 text-center w-[9%]">Mức độ</th>
                    <th className="py-2 px-2 w-[12%]">PIC &amp; Vai Trò</th>
                    <th className="py-2 px-2 w-[12%]">Hạn SLA</th>
                    <th className="py-2 px-2 w-[10%]">Leo Thang</th>
                    <th className="py-2 px-2 pr-3 text-right w-[9%]">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {slaBreaches
                    .filter(b => {
                      const matchSeverity = slaSeverityFilter === 'ALL' || b.severity === slaSeverityFilter;
                      const matchCategory = slaBreachCategoryFilter === 'ALL' || b.category === slaBreachCategoryFilter;
                      return matchSeverity && matchCategory;
                    })
                    .map(breach => {
                      const isCritical = breach.severity === 'CRITICAL';
                      return (
                        <tr key={breach.id} className={`hover:bg-canvas transition ${isCritical ? 'bg-critical-soft' : ''}`}>
                          {/* Col 1: Deal & KOC */}
                          <td className="py-2 px-2.5 font-medium">
                            <div className="font-semibold text-ink text-xs">{breach.kocName}</div>
                            <div className="font-mono text-ink-3 text-2xs mt-0.5">{breach.dealCode}</div>
                          </td>

                          {/* Col 2: Brand */}
                          <td className="py-2 px-2">
                            <span className="text-2xs font-semibold text-ink -line">
                              {breach.brandName}
                            </span>
                          </td>

                          {/* Col 3: Category Label */}
                          <td className="py-2 px-2">
                            <div className="font-semibold text-ink line-clamp-1" title={breach.categoryLabel}>
                              {breach.categoryLabel}
                            </div>
                            <div className="text-2xs text-ink-3 mt-0.5 line-clamp-1" title={breach.resolutionNotes}>
                              {breach.resolutionNotes || 'Đang theo dõi tự động trên hệ thống'}
                            </div>
                          </td>

                          {/* Col 4: Severity */}
                          <td className="py-2 px-2 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-2xs font-semibold inline-block ${
                              breach.severity === 'CRITICAL'
                                ? 'bg-critical-soft text-critical border border-critical/20'
                                : breach.severity === 'HIGH'
                                ? 'bg-warning-soft text-warning border border-warning/20'
                                : 'bg-sunken text-ink-2 border border-line-strong'
                            }`}>
                              {breach.severity === 'CRITICAL' ? '● KHẨN CẤP' : breach.severity === 'HIGH' ? '▲ NGHIÊM TRỌNG' : '■ CẢNH BÁO'}
                            </span>
                          </td>

                          {/* Col 5: PIC */}
                          <td className="py-2 px-2">
                            <div className="font-semibold text-ink text-xs">{breach.picName}</div>
                            <div className="text-2xs text-ink-3">{breach.picRole}</div>
                          </td>

                          {/* Col 6: SLA Deadline & Overdue Hours */}
                          <td className="py-2 px-2">
                            <div className="text-2xs text-ink-2 font-medium">{breach.slaDeadline}</div>
                            <div className="text-2xs text-critical font-semibold mt-0.5 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-critical shrink-0" />
                              <span>Quá hạn: {breach.hoursOverdue} giờ</span>
                            </div>
                          </td>

                          {/* Col 7: Escalation */}
                          <td className="py-2 px-2">
                            {breach.escalatedTo ? (
                              <div className="text-ink font-semibold text-2xs flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-critical" />
                                <span>{breach.escalatedTo}</span>
                              </div>
                            ) : (
                              <span className="text-2xs text-ink-3 italic">Nội bộ team</span>
                            )}
                          </td>

                          {/* Col 8: Actions */}
                          <td className="py-2 px-2.5 text-right">
                            <button
                              onClick={() => setBreachActionModal(breach)}
                              className="px-2 py-0.5 text-2xs font-semibold bg-ink hover:bg-ink text-white rounded transition shadow-2xs"
                            >
                              Xử lý
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="px-5 py-3 border-t border-line bg-canvas flex items-center justify-between text-xs text-ink-3">
              <span>
                Hiển thị <strong className="text-ink">{slaBreaches.length}</strong> cảnh báo vi phạm SLA
              </span>
              <div className="text-2xs text-ink-3">
                Cập nhật mỗi 15 phút
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Chỉnh Sửa Phân Bổ Chỉ Tiêu Theo 4 Tier Cho Nhân Sự */}
      <Presence show={!!editingAllocation}>
      {editingAllocation && (() => {
        const t1Avg = currentPlan.tierQuotas.find(t => t.tierId === 'TIER_1_CELEB')?.avgCostPerVideo || 41258000;
        const t2Avg = currentPlan.tierQuotas.find(t => t.tierId === 'TIER_2_MACRO')?.avgCostPerVideo || 14703000;
        const t3Avg = currentPlan.tierQuotas.find(t => t.tierId === 'TIER_3_MICRO')?.avgCostPerVideo || 5018000;
        const t4Avg = currentPlan.tierQuotas.find(t => t.tierId === 'TIER_4_AFFILIATE')?.avgCostPerVideo || 207000;

        const calculatedVideos = Number(editAllocForm.tier1Videos || 0) + 
          Number(editAllocForm.tier2Videos || 0) + 
          Number(editAllocForm.tier3Videos || 0) + 
          Number(editAllocForm.tier4Videos || 0);

        const suggestedBudget = (Number(editAllocForm.tier1Videos || 0) * t1Avg) +
          (Number(editAllocForm.tier2Videos || 0) * t2Avg) +
          (Number(editAllocForm.tier3Videos || 0) * t3Avg) +
          (Number(editAllocForm.tier4Videos || 0) * t4Avg);

        // Check if any tier exceeds quota
        const t1Ceiling = currentPlan.tierQuotas.find(t => t.tierId === 'TIER_1_CELEB')?.targetVideos || 24;
        const t2Ceiling = currentPlan.tierQuotas.find(t => t.tierId === 'TIER_2_MACRO')?.targetVideos || 63;
        const t3Ceiling = currentPlan.tierQuotas.find(t => t.tierId === 'TIER_3_MICRO')?.targetVideos || 127;
        const t4Ceiling = currentPlan.tierQuotas.find(t => t.tierId === 'TIER_4_AFFILIATE')?.targetVideos || 5434;

        const otherAllocatedT1 = (teamTierAllocated.TIER_1_CELEB || 0) - (editingAllocation.tier1Videos || 0);
        const otherAllocatedT2 = (teamTierAllocated.TIER_2_MACRO || 0) - (editingAllocation.tier2Videos || 0);
        const otherAllocatedT3 = (teamTierAllocated.TIER_3_MICRO || 0) - (editingAllocation.tier3Videos || 0);
        const otherAllocatedT4 = (teamTierAllocated.TIER_4_AFFILIATE || 0) - (editingAllocation.tier4Videos ?? editingAllocation.planVideos ?? 0);

        const newTeamT1 = otherAllocatedT1 + Number(editAllocForm.tier1Videos || 0);
        const newTeamT2 = otherAllocatedT2 + Number(editAllocForm.tier2Videos || 0);
        const newTeamT3 = otherAllocatedT3 + Number(editAllocForm.tier3Videos || 0);
        const newTeamT4 = otherAllocatedT4 + Number(editAllocForm.tier4Videos || 0);

        return (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto animate-in fade-in duration-(--motion-base)"
            onClick={() => setEditingAllocation(null)}
            role="dialog"
            aria-modal="true"
          >
            <div data-motion-panel
              className="bg-white border border-line rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-canvas">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent flex items-center justify-center font-semibold border border-accent/20">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-ink">Phân Bổ Kế Hoạch 4 Tier — {currentPlan.monthLabel}</h3>
                    <p className="text-xs text-ink-3">{editingAllocation.staffName} • {editingAllocation.roleTitle}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingAllocation(null)}
                  className="p-1.5 rounded-lg text-ink-3 hover:text-ink-2 hover:bg-sunken transition"
                  aria-label="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
                {/* Tier Quotas Grid inputs */}
                <div>
                  <label className="block text-ink-2 font-semibold mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <LayersIcon className="w-3.5 h-3.5 text-accent" />
                      Phân bổ số video theo 4 Tier KOC / KOL
                    </span>
                    <span className="text-2xs text-accent font-mono font-semibold">
                      Tổng: {calculatedVideos} clips
                    </span>
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Tier 1 */}
                    <div className="p-2.5 bg-critical-soft border border-critical/20 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-2xs font-semibold text-critical">Tier 1: Celeb / Mega</span>
                        <span className="text-2xs text-critical font-mono">KL7 (&gt;25M)</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={editAllocForm.tier1Videos}
                        onChange={(e) => setEditAllocForm(prev => ({ ...prev, tier1Videos: Math.max(0, Number(e.target.value)) }))}
                        className="w-full bg-white border border-critical/20 rounded-lg px-2.5 py-1.5 text-ink font-mono text-xs focus:outline-none focus:ring-2 focus:ring-critical/20 focus:border-critical/20"
                      />
                      <div className="flex items-center justify-between text-2xs text-ink-3 mt-1">
                        <span>Đã air: {editingAllocation.tier1Videos || 0}</span>
                        <span className={newTeamT1 > t1Ceiling ? 'text-critical font-semibold' : 'text-ink-3'}>
                          Toàn phòng: {newTeamT1}/{t1Ceiling}
                        </span>
                      </div>
                    </div>

                    {/* Tier 2 */}
                    <div className="p-2.5 bg-accent-soft border border-accent/20 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-2xs font-semibold text-accent">Tier 2: Macro Creator</span>
                        <span className="text-2xs text-accent font-mono">KL6 (10-25M)</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={editAllocForm.tier2Videos}
                        onChange={(e) => setEditAllocForm(prev => ({ ...prev, tier2Videos: Math.max(0, Number(e.target.value)) }))}
                        className="w-full bg-white border border-accent/20 rounded-lg px-2.5 py-1.5 text-ink font-mono text-xs focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/20"
                      />
                      <div className="flex items-center justify-between text-2xs text-ink-3 mt-1">
                        <span>Đã air: {editingAllocation.tier2Videos || 0}</span>
                        <span className={newTeamT2 > t2Ceiling ? 'text-critical font-semibold' : 'text-ink-3'}>
                          Toàn phòng: {newTeamT2}/{t2Ceiling}
                        </span>
                      </div>
                    </div>

                    {/* Tier 3 */}
                    <div className="p-2.5 bg-positive-soft border border-positive/20 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-2xs font-semibold text-positive">Tier 3: Micro Creator</span>
                        <span className="text-2xs text-positive font-mono">KL4-KL5 (2.5-10M)</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={editAllocForm.tier3Videos}
                        onChange={(e) => setEditAllocForm(prev => ({ ...prev, tier3Videos: Math.max(0, Number(e.target.value)) }))}
                        className="w-full bg-white border border-positive/20 rounded-lg px-2.5 py-1.5 text-ink font-mono text-xs focus:outline-none focus:ring-2 focus:ring-positive/20 focus:border-positive/20"
                      />
                      <div className="flex items-center justify-between text-2xs text-ink-3 mt-1">
                        <span>Đã air: {editingAllocation.tier3Videos || 0}</span>
                        <span className={newTeamT3 > t3Ceiling ? 'text-critical font-semibold' : 'text-ink-3'}>
                          Toàn phòng: {newTeamT3}/{t3Ceiling}
                        </span>
                      </div>
                    </div>

                    {/* Tier 4 */}
                    <div className="p-2.5 bg-canvas border border-line rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-2xs font-semibold text-ink">Tier 4: Nano & Affiliate</span>
                        <span className="text-2xs text-ink-2 font-mono">KL1-KL3 (&lt;2.5M)</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={editAllocForm.tier4Videos}
                        onChange={(e) => setEditAllocForm(prev => ({ ...prev, tier4Videos: Math.max(0, Number(e.target.value)) }))}
                        className="w-full bg-white border border-line-strong rounded-lg px-2.5 py-1.5 text-ink font-mono text-xs focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-line-strong"
                      />
                      <div className="flex items-center justify-between text-2xs text-ink-3 mt-1">
                        <span>Đã air: {editingAllocation.tier4Videos ?? editingAllocation.reportVideos}</span>
                        <span className={newTeamT4 > t4Ceiling ? 'text-critical font-semibold' : 'text-ink-3'}>
                          Toàn phòng: {newTeamT4}/{t4Ceiling}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Warning banner if exceeding any tier ceiling */}
                  {(newTeamT1 > t1Ceiling || newTeamT2 > t2Ceiling || newTeamT3 > t3Ceiling || newTeamT4 > t4Ceiling) && (
                    <div className="mt-2.5 p-2 bg-critical-soft border border-critical/20 rounded-lg flex items-center gap-2 text-critical text-2xs">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-critical" />
                      <span>
                        Cảnh báo: Phân bổ này sẽ khiến trần của phòng bị vượt ({[
                          newTeamT1 > t1Ceiling && `Tier 1 (+${newTeamT1 - t1Ceiling})`,
                          newTeamT2 > t2Ceiling && `Tier 2 (+${newTeamT2 - t2Ceiling})`,
                          newTeamT3 > t3Ceiling && `Tier 3 (+${newTeamT3 - t3Ceiling})`,
                          newTeamT4 > t4Ceiling && `Tier 4 (+${newTeamT4 - t4Ceiling})`,
                        ].filter(Boolean).join(', ')}). Vui lòng cân đối lại hạn mức.
                      </span>
                    </div>
                  )}
                </div>

                {/* Budget input & Auto Calculation */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-ink-2 font-semibold">Ngân sách phân bổ (VND)</label>
                    <button
                      type="button"
                      onClick={() => setEditAllocForm(prev => ({ ...prev, planBudget: suggestedBudget }))}
                      className="text-2xs text-accent hover:text-accent font-medium underline transition flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      Áp dụng gợi ý 4 Tier: {(suggestedBudget / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}M đ
                    </button>
                  </div>
                  <input
                    type="number"
                    step="1000000"
                    value={editAllocForm.planBudget}
                    onChange={(e) => setEditAllocForm(prev => ({ ...prev, planBudget: Number(e.target.value) }))}
                    className="w-full bg-white border border-line-strong rounded-lg px-3 py-2 text-ink font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/20"
                  />
                  <div className="flex items-center justify-between text-2xs text-ink-3 mt-1">
                    <span>Đã giải ngân thực tế: {editingAllocation.reportBudget.toLocaleString('vi-VN')} đ</span>
                    <span className="text-ink-3">Đơn giá TB ước tính: {calculatedVideos > 0 ? Math.round(editAllocForm.planBudget / calculatedVideos).toLocaleString('vi-VN') : 0} đ/clip</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-ink-2 font-semibold mb-1">Target GMV (VND)</label>
                    <input
                      type="number"
                      step="1000000"
                      value={editAllocForm.targetGmv}
                      onChange={(e) => setEditAllocForm(prev => ({ ...prev, targetGmv: Number(e.target.value) }))}
                      className="w-full bg-white border border-line-strong rounded-lg px-3 py-2 text-ink font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/20"
                    />
                  </div>

                  <div>
                    <label className="block text-ink-2 font-semibold mb-1">Chỉ tiêu tuyển KOC mới</label>
                    <input
                      type="number"
                      value={editAllocForm.targetNewKocs}
                      onChange={(e) => setEditAllocForm(prev => ({ ...prev, targetNewKocs: Number(e.target.value) }))}
                      className="w-full bg-white border border-line-strong rounded-lg px-3 py-2 text-ink font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-ink-2 font-semibold">
                      Nhãn hàng / Brand phụ trách
                    </label>
                    <span className="text-2xs text-ink-3 font-medium">
                      Đã gán {(editAllocForm.assignedBrands || '').split(',').map(b => b.trim()).filter(Boolean).length} nhãn hàng
                    </span>
                  </div>

                  {/* Active selected brand tags */}
                  <div className="flex flex-wrap gap-1.5 min-h-[38px] p-2 bg-canvas border border-line rounded-lg">
                    {(() => {
                      const list = (editAllocForm.assignedBrands || '').split(',').map(b => b.trim()).filter(Boolean);
                      if (list.length === 0) {
                        return (
                          <span className="text-ink-3 text-xs italic">
                            Chưa gán nhãn hàng nào. Hãy chọn từ danh mục Master Data bên dưới.
                          </span>
                        );
                      }
                      return list.map(brandName => (
                        <span
                          key={brandName}
                          className="inline-flex items-center gap-1.5 .5 text-accent -accent/20 text-xs font-semibold shadow-2xs"
                        >
                          <span>{brandName}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = list.filter(b => b !== brandName);
                              setEditAllocForm(prev => ({ ...prev, assignedBrands: updated.join(', ') }));
                            }}
                            className="w-4 h-4 rounded hover:bg-accent-soft text-accent flex items-center justify-center transition cursor-pointer"
                            title="Xóa nhãn hàng này"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ));
                    })()}
                  </div>

                  {/* Master Data Selector Dropdown */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <select
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          if (val) {
                            const list = (editAllocForm.assignedBrands || '').split(',').map(b => b.trim()).filter(Boolean);
                            if (!list.includes(val)) {
                              const updated = [...list, val];
                              setEditAllocForm(prev => ({ ...prev, assignedBrands: updated.join(', ') }));
                            }
                            e.target.value = '';
                          }
                        }}
                        defaultValue=""
                        className="w-full bg-white border border-line-strong rounded-lg px-3 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/20"
                      >
                        <option value="" disabled>
                          + Chọn nhãn hàng từ Master Data ({UPBASE_BRANDS_MASTER.length} Brands)...
                        </option>
                        <optgroup label="Nhãn hàng đang vận hành">
                          {currentBrands.map(b => {
                            const list = (editAllocForm.assignedBrands || '').split(',').map(item => item.trim()).filter(Boolean);
                            const isSelected = list.includes(b.name);
                            return (
                              <option
                                key={b.id}
                                value={b.name}
                                disabled={isSelected}
                              >
                                {b.name} {isSelected ? '(Đã chọn)' : ''}
                              </option>
                            );
                          })}
                        </optgroup>
                        <optgroup label="Tất cả Master Data Brands (192 Brands)">
                          {UPBASE_BRANDS_MASTER.map(mb => {
                            const list = (editAllocForm.assignedBrands || '').split(',').map(item => item.trim()).filter(Boolean);
                            const isSelected = list.includes(mb.name);
                            return (
                              <option
                                key={mb.id}
                                value={mb.name}
                                disabled={isSelected}
                              >
                                {mb.name} - {mb.category} {isSelected ? '(Đã chọn)' : ''}
                              </option>
                            );
                          })}
                        </optgroup>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-ink-2 font-semibold mb-1">Ghi chú chỉ đạo nghiệp vụ của trưởng phòng</label>
                  <textarea
                    rows={2}
                    value={editAllocForm.managerNote}
                    onChange={(e) => setEditAllocForm(prev => ({ ...prev, managerNote: e.target.value }))}
                    placeholder="Ghi chú điều phối tiến độ, ưu tiên nhóm Tier hoặc nhắc nhở deadline..."
                    className="w-full bg-white border border-line-strong rounded-lg p-3 text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/20 resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-line bg-canvas">
                <button
                  onClick={() => setEditingAllocation(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-ink-2 hover:text-ink hover:bg-sunken transition"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleSaveAlloc}
                  className="px-5 py-2 bg-accent hover:bg-accent text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu phân bổ</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      </Presence>

      {/* Modal: Cấu Hình Hạn Mức 4 Tier Toàn Phòng (Top-Down Quota Configuration) */}
      <Presence show={!!isTierQuotaModalOpen}>
      {isTierQuotaModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto animate-in fade-in duration-(--motion-base)"
          onClick={() => setIsTierQuotaModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div data-motion-panel
            className="bg-white border border-line rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-canvas">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent flex items-center justify-center font-semibold border border-accent/20">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink">Cấu Hình Hạn Mức 4 Tier KOC / KOL — {currentPlan.monthLabel}</h3>
                  
                </div>
              </div>
              <button 
                onClick={() => setIsTierQuotaModalOpen(false)}
                className="p-1.5 rounded-lg text-ink-3 hover:text-ink-2 hover:bg-sunken transition"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">


              <div className="space-y-3">
                {editTierForm.map((tier, idx) => {
                  const calculatedAvg = tier.targetVideos > 0 ? Math.round(tier.totalBudget / tier.targetVideos) : 0;
                  return (
                    <div key={tier.tierId} className="p-4 bg-canvas border border-line rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-accent" />
                          <span className="font-semibold text-ink text-xs">{tier.tierName}</span>
                          <span className="text-2xs text-ink-2 -line font-mono">
                            {tier.klRange}
                          </span>
                        </div>
                        <span className="text-2xs text-ink-3">
                          Đơn giá TB: <strong className="text-ink font-mono">{(calculatedAvg / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}M đ/clip</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-2xs text-ink-2 mb-1 font-medium">Trần số video</label>
                          <input
                            type="number"
                            min="0"
                            value={tier.targetVideos}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value));
                              setEditTierForm(prev => prev.map((t, i) => i === idx ? { ...t, targetVideos: val } : t));
                            }}
                            className="w-full bg-white border border-line-strong rounded-lg px-3 py-1.5 text-ink font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/20"
                          />
                        </div>

                        <div>
                          <label className="block text-2xs text-ink-2 mb-1 font-medium">Trần ngân sách (VND)</label>
                          <input
                            type="number"
                            min="0"
                            step="10000000"
                            value={tier.totalBudget}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value));
                              setEditTierForm(prev => prev.map((t, i) => i === idx ? { ...t, totalBudget: val } : t));
                            }}
                            className="w-full bg-white border border-line-strong rounded-lg px-3 py-1.5 text-ink font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/20"
                          />
                        </div>
                      </div>

                      <input
                        type="text"
                        value={tier.description}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditTierForm(prev => prev.map((t, i) => i === idx ? { ...t, description: val } : t));
                        }}
                        placeholder="Mô tả chiến lược và vai trò của Tier này trong tháng..."
                        className="w-full bg-white border border-line-strong rounded-lg px-3 py-1.5 text-2xs text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/20"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Total Summary */}
              <div className="p-3.5 bg-canvas border border-line rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-ink-2">Tổng trần video tháng:</span>
                  <span className="ml-2 font-semibold text-ink font-mono">
                    {editTierForm.reduce((sum, t) => sum + (t.targetVideos || 0), 0).toLocaleString('vi-VN')} clips
                  </span>
                </div>
                <div>
                  <span className="text-ink-2">Tổng trần ngân sách:</span>
                  <span className="ml-2 font-semibold text-accent font-mono">
                    {editTierForm.reduce((sum, t) => sum + (t.totalBudget || 0), 0).toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-line bg-canvas">
              <button
                onClick={() => setIsTierQuotaModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-ink-2 hover:text-ink hover:bg-sunken transition"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveTierQuota}
                className="px-5 py-2 bg-accent hover:bg-accent text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu hạn mức tháng</span>
              </button>
            </div>
          </div>
        </div>
      )}
      </Presence>

      {/* Modal: Soi Kế Hoạch Triển Khai Chi tiết Của Nhân Viên (Employee Plan Inspector) */}
      <EmployeePlanInspectorModal
        isOpen={!!inspectingStaffAllocation}
        onClose={() => setInspectingStaffAllocation(null)}
        staffAllocation={inspectingStaffAllocation}
        planItems={localPlanItems}
        onApproveEntirePlan={handleApproveEntirePlan}
        onRequestPlanRevision={handleRequestPlanRevision}
        onUpdatePlanItemStatus={handleUpdatePlanItemStatus}
        onConvertPlanToDeals={handleConvertPlanToDeals}
        currentUser={currentUser}
      />

      {/* Modal: Chi tiết Tuân Thủ SLA Nhân Viên */}
      <Presence show={!!inspectStaffModal}>
      {inspectStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-white border border-line rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            {/* Header */}
            <div className="px-6 py-4 bg-canvas border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent text-white font-semibold flex items-center justify-center text-sm shadow-xs">
                  {inspectStaffModal.avatar}
                </div>
                <div>
                  <h3 className="font-semibold text-ink text-sm">
                    Báo Cáo Chi tiết SLA — {inspectStaffModal.staffName}
                  </h3>
                  <p className="text-xs text-ink-3">{inspectStaffModal.role} • {inspectStaffModal.team}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectStaffModal(null)}
                className="w-8 h-8 rounded-lg text-ink-3 hover:text-ink-2 hover:bg-sunken flex items-center justify-center transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs">
              {/* Scorecard row */}
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-canvas rounded-xl border border-line">
                  <span className="text-2xs text-ink-3 block">Tổng Jobs</span>
                  <span className="text-lg font-semibold text-ink">{inspectStaffModal.totalJobs}</span>
                </div>
                <div className="p-3 bg-positive-soft rounded-xl border border-positive/20">
                  <span className="text-2xs text-positive block">Đúng hạn</span>
                  <span className="text-lg font-semibold text-positive">{inspectStaffModal.onTimeJobs}</span>
                </div>
                <div className="p-3 bg-critical-soft rounded-xl border border-critical/20">
                  <span className="text-2xs text-critical block">Vi phạm trễ</span>
                  <span className="text-lg font-semibold text-critical">{inspectStaffModal.breachedJobs}</span>
                </div>
                <div className="p-3 bg-accent-soft rounded-xl border border-accent/20">
                  <span className="text-2xs text-accent block">Điểm KPI SLA</span>
                  <span className="text-lg font-semibold text-accent">{inspectStaffModal.currentScore}/100</span>
                </div>
              </div>

              {/* Vi Phạm Chi tiết */}
              <div>
                <h4 className="font-semibold text-ink text-xs mb-2 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-critical" />
                  Danh sách vi phạm quy chuẩn đang ghi nhận:
                </h4>
                {inspectStaffModal.violations.length === 0 ? (
                  <div className="p-4 bg-positive-soft text-positive rounded-xl text-center font-medium border border-positive/20">
                    ✓ Nhân sự hoàn thành 100% công việc đúng hạn, không có vi phạm nào.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {inspectStaffModal.violations.map((v, i) => (
                      <div key={i} className="p-3 rounded-xl bg-critical-soft border border-critical/20 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-critical text-xs">{v.categoryLabel}</span>
                          <span className="text-2xs font-semibold text-critical">
                            Quá hạn {v.hoursOverdue}h
                          </span>
                        </div>
                        <div className="text-2xs text-ink-2 flex items-center gap-2">
                          <span>Deal: <strong>{v.dealCode}</strong></span>
                          <span>•</span>
                          <span>KOC: <strong>{v.kocName}</strong></span>
                          <span>•</span>
                          <span>Brand: <strong>{v.brandName}</strong></span>
                        </div>
                        <p className="text-2xs text-critical italic">
                          {v.resolutionNotes}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-canvas border-t border-line flex items-center justify-between">
              <button
                onClick={() => {
                  handlePingStaff(inspectStaffModal.staffName, 'Yêu cầu giải trình vi phạm SLA B2C');
                  setInspectStaffModal(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-critical bg-critical-soft hover:bg-critical-soft rounded-xl transition flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gửi Ping nhắc nhở Qua Lark</span>
              </button>
              <button
                onClick={() => setInspectStaffModal(null)}
                className="px-5 py-2 text-xs font-semibold text-ink-2 bg-white hover:bg-sunken border border-line-strong rounded-xl transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      </Presence>

      {/* Modal: Xử Lý Vi Phạm SLA */}
      <Presence show={!!breachActionModal}>
      {breachActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-white border border-line rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="px-6 py-4 bg-critical-soft border-b border-critical/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-critical" />
                <div>
                  <h3 className="font-semibold text-ink text-sm">Xử lý & Leo Thang vi phạm SLA</h3>
                  <p className="text-2xs text-critical font-semibold">{breachActionModal.dealCode} • {breachActionModal.kocName}</p>
                </div>
              </div>
              <button onClick={() => setBreachActionModal(null)} className="text-ink-3 hover:text-ink-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3.5 text-xs">
              <div className="p-3 bg-canvas rounded-xl border border-line space-y-1">
                <div className="font-semibold text-ink">{breachActionModal.categoryLabel}</div>
                <div className="text-ink-2">Hạn chót: <strong>{breachActionModal.slaDeadline}</strong></div>
                <div className="text-critical font-semibold">Số giờ quá hạn: {breachActionModal.hoursOverdue} giờ</div>
                <div className="text-ink-3">PIC chịu trách nhiệm: <strong>{breachActionModal.picName} ({breachActionModal.picRole})</strong></div>
                {breachActionModal.escalatedTo && (
                  <div className="text-accent font-semibold">Đã leo thang tới: <strong>{breachActionModal.escalatedTo}</strong></div>
                )}
              </div>

              {/* Action Buttons depending on Category */}
              <div className="space-y-2">
                <span className="font-semibold text-ink-2 block">Thao tác can thiệp của Quản lý:</span>
                
                {breachActionModal.category === 'BRAND_ORIENTATION_AUTO_AIR' && (
                  <button
                    onClick={() => handleResolveBreach(breachActionModal.id, 'Quản lý đã phê duyệt Tự Air do Brand quá hạn 3 ngày theo quy chế SLA B2C.')}
                    className="w-full p-2.5 bg-positive hover:bg-positive text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Phê duyệt đề xuất tự Air</span>
                  </button>
                )}

                {breachActionModal.category === 'CONTRACT_OVER_9M_INVALID' && (
                  <button
                    onClick={() => handleResolveBreach(breachActionModal.id, 'Đã yêu cầu chuyên viên nộp bổ sung bản Scan HĐ và CCCD trước 17:00.')}
                    className="w-full p-2.5 bg-accent hover:bg-accent text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <FileCheck className="w-4 h-4" />
                    <span>Yêu cầu bổ Sung bản Scan ký 2 bên & CCCD</span>
                  </button>
                )}

                {breachActionModal.category === 'DATA_LOCKED_7_WORKING_DAYS' && (
                  <button
                    onClick={() => handleResolveBreach(breachActionModal.id, 'Leader đã xác nhận giải trình và mở khóa tạm 24h để chuyên viên điền link.')}
                    className="w-full p-2.5 bg-warning hover:bg-warning text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>Xác nhận mở khóa tạm 24h để điền link</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    handlePingStaff(breachActionModal.picName, `Yêu cầu xử lý gấp vi phạm SLA: ${breachActionModal.categoryLabel}`);
                    handleResolveBreach(breachActionModal.id, `Quản lý đã gửi Ping qua Lark nhắc nhở chuyên viên ${breachActionModal.picName}.`);
                  }}
                  className="w-full p-2.5 bg-sunken hover:bg-sunken text-ink font-semibold rounded-xl transition flex items-center justify-center gap-2 border border-line-strong"
                >
                  <Send className="w-4 h-4 text-accent" />
                  <span>Ping Lark nhắc PIC xử lý ngay</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </Presence>

        </div>
      )}


      {/* AI Staff Review Modal (API Powered) */}
      <Presence show={!!aiReviewTargetStaff}>
      {aiReviewTargetStaff && (
        <AiStaffReviewModal
          isOpen={Boolean(aiReviewTargetStaff)}
          onClose={() => setAiReviewTargetStaff(null)}
          initialStaffName={aiReviewTargetStaff === 'ALL' ? undefined : aiReviewTargetStaff}
          onPingStaffNotification={handlePingStaff}
        />
      )}
      </Presence>

    </div>
  );
};

