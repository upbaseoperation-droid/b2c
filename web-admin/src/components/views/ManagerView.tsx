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
  Calculator
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
  SlaTask
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
import { Button, Segmented, Tabs } from '../ui';
import { EmployeePlanInspectorModal } from '../EmployeePlanInspectorModal';
import { AiStaffReviewModal } from '../AiStaffReviewModal';
import { ManagerDelegationHub } from './ManagerDelegationHub';

interface ManagerViewProps {
  deals: BookingDealItem[];
  currentUser?: UserProfile;
  onPingStaffNotification?: (staffName: string, taskTitle: string) => void;
  planItems?: StaffDetailedPlanItem[];
  onUpdatePlanItemStatus?: (itemId: string, newStatus: StaffPlanStatus, leadNotes?: string) => void;
  onApproveEntirePlan?: (staffName: string, managerFeedback: string) => void;
  onRequestPlanRevision?: (staffName: string, managerFeedback: string) => void;
  onGenerateDealsFromPlan?: (demand: any) => void;
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
  onAddTask: externalOnAddTask
}) => {
  const isManager = currentUser ? currentUser.role === 'MANAGER' : true;
  const [activeTab, setActiveTab] = useState<'DELEGATION_HUB' | 'CONTROL_TOWER' | 'GROWTH_BREAKDOWN' | 'ALLOCATION' | 'MONTHLY_PLAN' | 'STAFF_AIR_PROGRESS' | 'STAFF_REVENUE_GMV' | 'PLAN_GAP_466M' | 'DEEP_ANALYTICS' | 'SLA_MANAGEMENT'>('DELEGATION_HUB');
  
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
      setLocalPlanItems(externalPlanItems);
    }
  }, [externalPlanItems]);

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

  
  // Master Plans state (Quản lý chỉ tiêu theo tháng & theo 4 Tier KOC/KOL)
  const [masterPlans, setMasterPlans] = useState<MonthlyMasterQuotaPlan[]>(MONTHLY_MASTER_QUOTA_PLANS);
  const [selectedMonth, setSelectedMonth] = useState<string>('2026/08');
  
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
    <div className="space-y-6">
      {/* Thanh điều khiển: chọn tháng, thao tác phụ, tab */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented
            items={masterPlans.map(plan => ({
              key: plan.month,
              label: `${plan.monthLabel}${plan.status === 'COMPLETED' ? ' · Đã chốt' : plan.status === 'ACTIVE' ? ' · Đang chạy' : ' · Nháp'}`,
            }))}
            value={selectedMonth}
            onChange={setSelectedMonth}
          />
          <div className="flex items-center gap-2">
            {onOpenInputPlan && (
              <Button icon={Calculator} onClick={onOpenInputPlan}>Kế hoạch đầu vào</Button>
            )}
            <Button icon={Sparkles} onClick={() => setAiReviewTargetStaff('Khánh Vy')} title="Tạo bản nhận xét gợi ý cho nhân viên">
              Gợi ý nhận xét
            </Button>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'DELEGATION_HUB', label: 'Phân bổ & giao việc' },
            { key: 'CONTROL_TOWER', label: 'Giám sát' },
            { key: 'GROWTH_BREAKDOWN', label: 'KOC từ Growth' },
            { key: 'ALLOCATION', label: 'Phân bổ kế hoạch' },
            { key: 'MONTHLY_PLAN', label: 'Kế hoạch & thực đạt' },
            { key: 'STAFF_AIR_PROGRESS', label: 'Tiến độ air' },
            { key: 'STAFF_REVENUE_GMV', label: 'GMV theo nhân sự' },
            { key: 'PLAN_GAP_466M', label: 'Khoảng trống ngân sách' },
            { key: 'DEEP_ANALYTICS', label: 'Phân tích' },
            { key: 'SLA_MANAGEMENT', label: 'SLA', count: slaBreaches.filter(b => b.status !== 'RESOLVED').length, tone: 'critical' },
          ]}
        />
      </div>

      {/* ========================================================================= */}
      {/* TAB MỚI: TRUNG TÂM PHÂN BỔ & ĐIỀU PHỐI (MANAGER DELEGATION HUB)           */}
      {/* ========================================================================= */}
      {activeTab === 'DELEGATION_HUB' && (
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
          onNotify={(msg) => {
            if (onPingStaffNotification) {
              onPingStaffNotification('Trưởng Phòng', msg);
            }
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODULE 6: CONTROL TOWER (HEAD/LEAD ZERO INPUT - STRICTLY MONITORING ONLY) */}
      {/* ========================================================================= */}
      {activeTab === 'CONTROL_TOWER' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Executive Read-Only Header */}
          <div className="card-enterprise p-4 bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">Tháp điều khiển Trung tâm</h3>
                  <span className="badge-emerald px-2 py-0.5 rounded-full text-2xs font-semibold">
                    ● Hệ thống vận hành ổn định
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dành riêng cho Head / Lead: <strong className="text-slate-700">Không nhập liệu thủ công</strong>. Giám sát tự động Plan vs Actual, SLA, điểm nghẽn, cân bằng tải & cảnh báo ngoại lệ.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600">
                Chu kỳ: <strong className="text-blue-600 font-mono font-semibold">{selectedMonth}</strong>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600">
                SLA toàn phòng: <strong className="text-emerald-600 font-mono font-semibold">{controlTower.slaOnTimeRate}%</strong>
              </div>
            </div>
          </div>

          {/* 1. Plan vs Actual Cockpit Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="card-enterprise p-4 bg-white border border-emerald-200/80 shadow-2xs space-y-1">
              <span className="text-2xs text-slate-500 font-medium">GMV Plan vs Actual (MTD)</span>
              <div className="text-xl font-semibold text-emerald-600 font-mono">
                {(controlTower.actualGmv / 1000000000).toFixed(2)}B / {(controlTower.planGmv / 1000000000).toFixed(2)}B
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${controlTower.gmvAchievementRate}%` }} />
              </div>
              <span className="text-2xs text-emerald-600 font-semibold block pt-0.5">
                Đạt {controlTower.gmvAchievementRate}% kế hoạch
              </span>
            </div>

            <div className="card-enterprise p-4 bg-white border border-amber-200/80 shadow-2xs space-y-1">
              <span className="text-2xs text-slate-500 font-medium">Ngân sách giải ngân</span>
              <div className="text-xl font-semibold text-amber-600 font-mono">
                {(controlTower.actualSpentBudget / 1000000).toLocaleString('vi-VN')}M / {(controlTower.planBudget / 1000000).toLocaleString('vi-VN')}M
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: `${controlTower.budgetBurnRate}%` }} />
              </div>
              <span className="text-2xs text-slate-500 block pt-0.5">
                Đã tiêu {controlTower.budgetBurnRate}% • CIR: <strong className="text-blue-600">{controlTower.cirCurrent}%</strong>
              </span>
            </div>

            <div className="card-enterprise p-4 bg-white border border-rose-200/80 shadow-2xs space-y-1">
              <span className="text-2xs text-slate-500 font-medium">Radar tắc nghẽn & Backlog</span>
              <div className="text-xl font-semibold text-rose-600">{controlTower.pendingBacklogCases} Cases Tồn Đọng</div>
              <div className="text-2xs text-amber-700 font-semibold truncate">
                Điểm nghẽn: {controlTower.bottleneckTeam}
              </div>
              <span className="text-2xs text-slate-500 block pt-0.5">
                4 ca trễ SLA &gt;24h ở khâu kịch bản
              </span>
            </div>

            <div className="card-enterprise p-4 bg-white border border-purple-200/80 shadow-2xs space-y-1">
              <span className="text-2xs text-slate-500 font-medium">Cân bằng tải</span>
              <div className="text-xl font-semibold text-purple-600">26 nhân sự</div>
              <div className="text-2xs text-slate-700 font-medium">
                1 Quá tải (&gt;115%) • 3 Non tải (&lt;75%)
              </div>
              <span className="text-2xs text-purple-600 font-semibold block pt-0.5">
                Tỷ lệ pass kịch bản Vòng 1: {controlTower.firstTimePassRate}%
              </span>
            </div>
          </div>

          {/* 2. Bottleneck & Exceptions Radar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bottlenecks by Stage */}
            <div className="card-enterprise p-5 bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span>Điểm nghẽn quy trình tác nghiệp</span>
                </h4>
                <span className="badge-slate text-2xs font-mono px-2 py-0.5 rounded">14 Cases</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-200 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-amber-900">Khâu 3: Thẩm định kịch bản 4 phần</span>
                    <p className="text-2xs text-slate-500">Thời gian duyệt trung bình: 28.4h (vượt chuẩn SLA 24h)</p>
                  </div>
                  <span className="badge-amber px-2 py-0.5 rounded text-2xs font-semibold">4 Cases Trễ</span>
                </div>

                <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-900">Khâu 2: Đàm phán hợp đồng & chi tạm ứng Lark</span>
                    <p className="text-2xs text-slate-500">Phê duyệt API tạm ứng 2M qua Lark: Trung bình 3.2h (rất tốt)</p>
                  </div>
                  <span className="badge-emerald px-2 py-0.5 rounded text-2xs font-semibold">Thông suốt</span>
                </div>

                <div className="p-3 rounded-lg bg-rose-50/50 border border-rose-200 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-rose-700">Khâu 5: Thu hồi mã Spark Ads sau khi video lên sóng</span>
                    <p className="text-2xs text-slate-500">2 KOC đã lên video nhưng chưa cung cấp mã ủy quyền Ads</p>
                  </div>
                  <span className="badge-rose px-2 py-0.5 rounded text-2xs font-semibold">2 Cases cần đốc thúc</span>
                </div>
              </div>
            </div>

            {/* Quality & Exception Alerts */}
            <div className="card-enterprise p-5 bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span>Cảnh báo ngoại lệ & rủi Ro dự án</span>
                </h4>
                <span className="badge-rose px-2 py-0.5 rounded text-2xs font-semibold">3 cảnh báo</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-lg bg-rose-50/60 border border-rose-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-rose-800">Cảnh báo bùng mẫu</span>
                    <span className="text-2xs font-mono font-semibold text-rose-600">SLA &gt; 5 Ngày</span>
                  </div>
                  <p className="text-2xs text-slate-600">
                    KOC <strong className="text-slate-900">@thuydung_review</strong> đã nhận mẫu Kutieskin Mama 6 ngày trước nhưng chưa gửi video nháp demo.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-800">Lệch tiến độ Air cụm gian hàng FMCG</span>
                    <span className="text-2xs font-mono font-semibold text-amber-600">Gap 42M GMV</span>
                  </div>
                  <p className="text-2xs text-slate-600">
                    Cụm gian hàng Bio-Essence mới đạt 68% sản lượng video cam kết tuần W39, cần tăng tốc book KL3-KL4.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-800">Top Winner Video bứt phá doanh số</span>
                    <span className="text-2xs font-mono font-semibold text-emerald-600">ROI 18.2x</span>
                  </div>
                  <p className="text-2xs text-slate-600">
                    Video của Mega Uri Review đạt 182M GMV sau 3 ngày lên sóng, kích hoạt mở ngân sách Spark Ads quy mô lớn.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB MỚI: PHÂN BỔ KOC / KOL TỪ YÊU CẦU GROWTH                             */}
      {/* ========================================================================= */}
      {activeTab === 'GROWTH_BREAKDOWN' && (
        <GrowthPlanBreakdownView
          onNotify={(msg) => {
            if (onPingStaffNotification) {
              onPingStaffNotification('Booking Lead', msg);
            }
          }}
          onGenerateDealsFromPlan={onGenerateDealsFromPlan}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 0: TWO-LEVEL TOP-DOWN ALLOCATION (QUẢN LÝ CHỈ TIÊU TRƯỞNG PHÒNG)     */}
      {/* ========================================================================= */}
      {activeTab === 'ALLOCATION' && (
        <div className="space-y-6">
          {/* Supervisor / Read-Only Notice if not Manager */}
          {!isManager && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs">
              <div className="flex items-center gap-3 text-amber-900">
                <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold flex items-center gap-2 text-slate-900">
                    <span>Chế độ giám sát kế hoạch</span>
                    <span className="px-2 py-0.2 rounded-full text-2xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                      Vai trò: {currentUser?.roleTitle || 'Thành viên'}
                    </span>
                  </div>
                  <p className="text-2xs text-slate-600 mt-0.5">
                    Bạn có quyền xem tiến độ &amp; soi chi tiết kế hoạch các chuyên viên. Quyền thiết lập trần định mức 4 Tier, cân bằng tải và duyệt kế hoạch được bảo lưu cho Trưởng Phòng.
                  </p>
                </div>
              </div>
              <div className="px-3 py-1 rounded bg-amber-100 border border-amber-200 text-amber-800 text-2xs font-semibold shrink-0 self-end sm:self-auto flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>CHỈ XEM (READ-ONLY)</span>
              </div>
            </div>
          )}

          {/* CẤP 1: QUẢN LÝ TỔNG HẠN MỨC THEO 4 TIER KOC / KOL */}
          <div className="card-enterprise p-5 bg-white border border-slate-200 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm" />
                  <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                    CẤP 1: QUẢN LÝ HẠN MỨC 4 TIER KOC / KOL TOÀN PHÒNG — {currentPlan.monthLabel}
                  </h3>
                  <span className={`text-2xs px-2 py-0.5 rounded-full font-semibold border ${
                    currentPlan.status === 'COMPLETED' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                    currentPlan.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {currentPlan.status === 'COMPLETED' ? 'Đã Chốt Số Liệu' : currentPlan.status === 'ACTIVE' ? 'Đang Thực Hiện' : 'Dự Thảo Q4'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Mô hình Top-Down: Quản lý trần video, ngân sách và đơn giá theo 4 Tier KOC/KOL trước khi phân bổ chi tiết cho 26 chuyên viên
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isManager ? (
                  <>
                    <button
                      onClick={handleOpenEditTierQuota}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Cấu hình hạn mức 4 Tier</span>
                    </button>
                    <button
                      onClick={handleRebalanceCapacity}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs"
                    >
                      <Sliders className="w-3.5 h-3.5 text-slate-500" />
                      <span>Cân bằng tải tự động</span>
                    </button>
                  </>
                ) : (
                  <span className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-not-allowed">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                    <span>Hạn mức định mức (khóa bởi Lead)</span>
                  </span>
                )}
              </div>
            </div>

            {/* Ceiling Metrics Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-b border-slate-200">
              <div>
                <span className="text-2xs text-slate-500 font-medium block">Trần Ngân Sách {currentPlan.monthLabel}</span>
                <div className="text-xl font-semibold text-slate-900 mt-0.5">{TOTAL_CEILING_BUDGET.toLocaleString('vi-VN')} đ</div>
                <div className="flex items-center justify-between text-2xs text-slate-500 mt-1">
                  <span>Đã giao: <strong className="text-blue-700 font-semibold">{totalAllocatedBudget.toLocaleString('vi-VN')} đ</strong></span>
                  <span className={remainingBudget === 0 ? 'text-emerald-700 font-semibold' : remainingBudget < 0 ? 'text-rose-700 font-semibold' : 'text-amber-700 font-semibold'}>
                    {remainingBudget === 0 ? 'Cân đối 100%' : remainingBudget < 0 ? `Vượt: ${Math.abs(remainingBudget).toLocaleString('vi-VN')} đ` : `Còn: ${remainingBudget.toLocaleString('vi-VN')} đ`}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${totalAllocatedBudget > TOTAL_CEILING_BUDGET ? 'bg-rose-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min(100, (totalAllocatedBudget / TOTAL_CEILING_BUDGET) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <span className="text-2xs text-slate-500 font-medium block">Chỉ tiêu video toàn phòng</span>
                <div className="text-xl font-semibold text-slate-900 mt-0.5">{TOTAL_TARGET_VIDEOS.toLocaleString('vi-VN')} Video</div>
                <div className="flex items-center justify-between text-2xs text-slate-500 mt-1">
                  <span>Đã giao: <strong className="text-purple-700 font-semibold">{totalAllocatedVideos.toLocaleString('vi-VN')}</strong></span>
                  <span className={remainingVideos === 0 ? 'text-emerald-700 font-semibold' : remainingVideos < 0 ? 'text-rose-700 font-semibold' : 'text-slate-600'}>
                    {remainingVideos === 0 ? '100% Cân đối' : remainingVideos < 0 ? `Vượt +${Math.abs(remainingVideos)}` : `Còn ${remainingVideos}`}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${totalAllocatedVideos > TOTAL_TARGET_VIDEOS ? 'bg-rose-500' : 'bg-purple-500'}`}
                    style={{ width: `${Math.min(100, (totalAllocatedVideos / TOTAL_TARGET_VIDEOS) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <span className="text-2xs text-slate-500 font-medium block">Mục tiêu doanh số (GMV)</span>
                <div className="text-xl font-semibold text-emerald-700 mt-0.5">{totalTargetGmv.toLocaleString('vi-VN')} đ</div>
                <div className="flex items-center justify-between text-2xs text-slate-500 mt-1">
                  <span>Thực đạt: <strong className="text-slate-900 font-semibold">{(allocations.reduce((sum, a) => sum + (a.actualGmv || 0), 0) / 1000000000).toFixed(2)} B</strong></span>
                  <span className="text-emerald-700 font-semibold">
                    {totalTargetGmv > 0 ? Math.round((allocations.reduce((sum, a) => sum + (a.actualGmv || 0), 0) / totalTargetGmv) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full" 
                    style={{ width: `${totalTargetGmv > 0 ? Math.min(100, (allocations.reduce((sum, a) => sum + (a.actualGmv || 0), 0) / totalTargetGmv) * 100) : 0}%` }} 
                  />
                </div>
              </div>

              <div>
                <span className="text-2xs text-slate-500 font-medium block">Quy mô & tải nhân sự</span>
                <div className="text-xl font-semibold text-slate-900 mt-0.5">{allocations.length} Chuyên Viên</div>
                <div className="flex items-center justify-between text-2xs text-slate-500 mt-1">
                  <span>{allocations.filter(a => !a.isLagging).length} Đạt tiến độ</span>
                  <span className="text-rose-700 font-semibold">{allocations.filter(a => a.isLagging).length} Cần hỗ trợ</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="h-full bg-rose-500 rounded-full" 
                    style={{ width: `${(allocations.filter(a => a.isLagging).length / allocations.length) * 100}%` }} 
                  />
                </div>
              </div>
            </div>

            {/* 4 TIER MASTER QUOTA CARDS */}
            <div className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <LayersIcon className="w-3.5 h-3.5 text-blue-400" />
                  Hạn Mức Chi tiết Theo 4 Tier KOC / KOL ({currentPlan.tierQuotas.length} Tiers)
                </span>
                <span className="text-2xs text-slate-400">
                  Tổng 4 Tier = 100% trần ngân sách & số lượng video toàn phòng
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
                      badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
                      borderAccent: 'border-l-rose-500',
                      barColor: 'bg-rose-500',
                      icon: Crown
                    },
                    TIER_2_MACRO: {
                      badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
                      borderAccent: 'border-l-blue-500',
                      barColor: 'bg-blue-500',
                      icon: Award
                    },
                    TIER_3_MICRO: {
                      badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                      borderAccent: 'border-l-emerald-500',
                      barColor: 'bg-emerald-500',
                      icon: Target
                    },
                    TIER_4_AFFILIATE: {
                      badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
                      borderAccent: 'border-l-purple-500',
                      barColor: 'bg-purple-500',
                      icon: Package
                    }
                  }[tier.tierId] || {
                    badgeBg: 'bg-slate-800 text-slate-300 border-slate-700',
                    borderAccent: 'border-l-slate-500',
                    barColor: 'bg-slate-500',
                    icon: Video
                  };

                  const IconComp = tierMeta.icon;

                  return (
                    <div 
                      key={tier.tierId}
                      className={`bg-white border border-slate-200 border-l-4 ${tierMeta.borderAccent} rounded-xl p-4 flex flex-col justify-between hover:border-slate-300 shadow-2xs transition`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5 truncate">
                            <IconComp className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                            <span className="truncate">{tier.tierName.split('—')[1]?.trim() || tier.tierName}</span>
                          </span>
                          <span className={`text-2xs font-mono px-2 py-0.5 rounded border shrink-0 ${tierMeta.badgeBg}`}>
                            {tier.klRange}
                          </span>
                        </div>

                        {/* Ceiling Videos & Budget */}
                        <div className="space-y-1.5 mt-3">
                          <div className="flex items-baseline justify-between">
                            <span className="text-2xs text-slate-500">Trần số lượng:</span>
                            <span className="text-sm font-semibold text-slate-900 font-mono">{tier.targetVideos.toLocaleString('vi-VN')} clips</span>
                          </div>

                          <div className="flex items-baseline justify-between">
                            <span className="text-2xs text-slate-500">Trần ngân sách:</span>
                            <span className="text-xs font-semibold text-slate-700 font-mono">
                              {(tier.totalBudget / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}M đ ({budgetShare}%)
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between text-2xs text-slate-500">
                            <span>Đơn giá TB:</span>
                            <span className="font-mono text-slate-700">
                              ~{(tier.avgCostPerVideo / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}M / clip
                            </span>
                          </div>
                        </div>

                        <p className="text-2xs text-slate-500 mt-2.5 line-clamp-2 leading-relaxed">
                          {tier.description}
                        </p>
                      </div>

                      {/* Allocation Balance Tracker */}
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between text-2xs mb-1">
                          <span className="text-slate-500">Đã giao cho NV:</span>
                          <span className="font-mono font-semibold text-slate-900">
                            {allocatedVideos} / {tier.targetVideos}
                          </span>
                        </div>

                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${isOver ? 'bg-rose-500' : isBalanced ? 'bg-emerald-500' : tierMeta.barColor}`}
                            style={{ width: `${Math.min(100, pctAllocated)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between mt-2 text-2xs">
                          <span className="text-slate-500 font-mono">{pctAllocated}% trần</span>
                          {isBalanced ? (
                            <span className="text-emerald-400 font-medium flex items-center gap-1">
                              <Check className="w-3 h-3" /> Cân đối 100%
                            </span>
                          ) : isOver ? (
                            <span className="text-rose-400 font-semibold flex items-center gap-0.5">
                              <AlertTriangle className="w-3 h-3" /> Vượt trần +{diff}
                            </span>
                          ) : (
                            <span className="text-blue-400 font-medium">
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
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Tìm theo tên nhân sự hoặc nhãn hàng phụ trách..."
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => setAllocationFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  allocationFilter === 'ALL' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Tất Cả ({allocations.length})
              </button>
              <button
                onClick={() => setAllocationFilter('LAGGING')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  allocationFilter === 'LAGGING' ? 'bg-rose-600 text-white' : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Chậm Tiến Độ (&lt;50%)
              </button>
              <button
                onClick={() => setAllocationFilter('GOOD')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  allocationFilter === 'GOOD' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Tiến Độ Tốt (&gt;=80%)
              </button>
            </div>
          </div>

          {/* CẤP 2: BẢNG MA TRẬN PHÂN BỔ ĐA CHIỀU XUỐNG 26 NHÂN SỰ & GIÁM SÁT PLAN */}
          <div className="card-enterprise overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                  <Table className="w-4 h-4 text-blue-500" />
                  <span>Bảng ma trận phân bổ chỉ tiêu & giám sát plan nhân viên</span>
                  <span className="text-2xs font-normal text-slate-500 font-mono">({currentPlan.monthLabel})</span>
                </h4>
                <p className="text-2xs text-slate-500 mt-0.5">
                  Chuyển đổi linh hoạt giữa 3 Ma trận: 4 Tier KOC, nhãn hàng, hoặc tuần lên sóng • Bấm "Soi Plan" để xem và duyệt danh sách KOC chi tiết do nhân viên lập
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
                {/* Matrix Mode Switcher */}
                <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-lg p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setMatrixViewMode('4_TIER')}
                    className={`px-2.5 py-1 rounded font-semibold text-2xs transition flex items-center gap-1.5 ${
                      matrixViewMode === '4_TIER' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LayersIcon className="w-3.5 h-3.5" />
                    <span>Ma Trận 4 Tier</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatrixViewMode('BRANDS')}
                    className={`px-2.5 py-1 rounded font-semibold text-2xs transition flex items-center gap-1.5 ${
                      matrixViewMode === 'BRANDS' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>Ma trận nhãn hàng</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatrixViewMode('WEEKS')}
                    className={`px-2.5 py-1 rounded font-semibold text-2xs transition flex items-center gap-1.5 ${
                      matrixViewMode === 'WEEKS' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>Ma trận tuần (W1-W4)</span>
                  </button>
                </div>

                <span className="badge-blue px-2.5 py-1 rounded-full text-2xs font-semibold">
                  {allocations.filter((staff) => {
                    const matchesSearch = staffSearch === '' || 
                      staff.staffName.toLowerCase().includes(staffSearch.toLowerCase()) ||
                      staff.assignedBrands.some(b => b.toLowerCase().includes(staffSearch.toLowerCase()));
                    if (!matchesSearch) return false;
                    if (allocationFilter === 'LAGGING') return staff.isLagging || staff.airProgress < 50;
                    if (allocationFilter === 'GOOD') return staff.airProgress >= 80;
                    return true;
                  }).length} Nhân sự
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="table-header-enterprise bg-slate-50">
                    <th className="p-3 pl-5 text-slate-700 font-semibold min-w-[170px] sticky left-0 z-20 bg-slate-50 border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.04)]">
                      Nhân sự & vị trí
                    </th>
                    {matrixViewMode !== 'BRANDS' && (
                      <th className="p-3 text-slate-700 font-semibold min-w-[140px]">Nhãn hàng phụ trách</th>
                    )}
                    
                    {/* DYNAMIC MATRIX COLUMNS */}
                    {matrixViewMode === '4_TIER' && (
                      <>
                        <th className="p-3 text-center text-rose-700 font-semibold">T1 Celeb (KL7)</th>
                        <th className="p-3 text-center text-blue-700 font-semibold">T2 Macro (KL6)</th>
                        <th className="p-3 text-center text-emerald-700 font-semibold">T3 Micro (KL4-5)</th>
                        <th className="p-3 text-center text-purple-700 font-semibold">T4 Nano (KL1-3)</th>
                      </>
                    )}

                    {matrixViewMode === 'BRANDS' && (
                      MATRIX_BRANDS.map(brand => (
                        <th key={brand} className="p-3 text-center text-slate-700 font-semibold">
                          {brand}
                        </th>
                      ))
                    )}

                    {matrixViewMode === 'WEEKS' && (
                      MATRIX_WEEKS.map(week => (
                        <th key={week} className="p-3 text-center text-slate-700 font-semibold">
                          Tuần {week}
                        </th>
                      ))
                    )}

                    <th className="p-3 text-right text-slate-700 font-semibold">Tổng Video</th>
                    <th className="p-3 text-right text-slate-700 font-semibold">Ngân sách giao</th>
                    <th className="p-3 text-right text-slate-700 font-semibold">Target GMV</th>
                    <th className="p-3 text-center text-slate-700 font-semibold min-w-[150px]">
                      <span>Plan nhân viên</span>
                      <span className="block text-2xs text-slate-500 font-normal">Độ lấp đầy & duyệt</span>
                    </th>
                    <th className="p-3 pr-5 text-right text-slate-700 font-semibold min-w-[130px]">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
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
                      <tr key={staff.id} className="table-row-enterprise hover:bg-slate-50 transition-colors group">
                        {/* Name & Title */}
                        <td className="p-3 pl-5 sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.04)] transition-colors">
                          <div className="font-semibold text-slate-900 text-xs">{staff.staffName}</div>
                          <div className="text-2xs text-slate-500 mt-0.5">{staff.roleTitle}</div>
                          {staff.isLagging && (
                            <span className="inline-block mt-1 px-1.5 py-0.2 bg-rose-50 border border-rose-200 text-rose-700 text-2xs rounded font-medium">
                              Chậm tiến độ
                            </span>
                          )}
                        </td>

                        {/* Brands (if not BRANDS matrix) */}
                        {matrixViewMode !== 'BRANDS' && (
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1 max-w-[170px]">
                              {staff.assignedBrands.map(b => (
                                <span key={b} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-2xs font-medium border border-slate-700/60">
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
                              <span className={`px-2 py-0.5 rounded text-2xs font-semibold ${
                                (staff.tier1Videos || 0) > 0 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-slate-600 bg-slate-900/50'
                              }`}>
                                {staff.tier1Videos || 0}
                              </span>
                            </td>
                            <td className="p-3 text-center font-mono">
                              <span className={`px-2 py-0.5 rounded text-2xs font-semibold ${
                                (staff.tier2Videos || 0) > 0 ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'text-slate-600 bg-slate-900/50'
                              }`}>
                                {staff.tier2Videos || 0}
                              </span>
                            </td>
                            <td className="p-3 text-center font-mono">
                              <span className={`px-2 py-0.5 rounded text-2xs font-semibold ${
                                (staff.tier3Videos || 0) > 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-600 bg-slate-900/50'
                              }`}>
                                {staff.tier3Videos || 0}
                              </span>
                            </td>
                            <td className="p-3 text-center font-mono">
                              <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
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
                                  <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                    {brandItemsCount > 0 ? `${brandItemsCount} clips` : 'Phụ trách'}
                                  </span>
                                ) : (
                                  <span className="text-slate-600 text-2xs">—</span>
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
                                <span className={`px-2 py-0.5 rounded text-2xs font-semibold ${
                                  weekCount > 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-600 bg-slate-900/50'
                                }`}>
                                  {weekCount} clips
                                </span>
                              </td>
                            );
                          })
                        )}

                        {/* Tổng Video */}
                        <td className="p-3 text-right">
                          <div className="font-semibold text-white font-mono">{staff.reportVideos} / {staff.planVideos}</div>
                          <div className="text-2xs text-slate-400 mt-0.5">
                            Đạt <strong className={staff.airProgress >= 80 ? 'text-emerald-400' : staff.airProgress < 50 ? 'text-rose-400' : 'text-amber-400'}>
                              {staff.airProgress}%
                            </strong>
                          </div>
                        </td>

                        {/* Ngân Sách */}
                        <td className="p-3 text-right">
                          <div className="font-semibold text-blue-400 font-mono">
                            {staff.planBudget.toLocaleString('vi-VN')} đ
                          </div>
                          <div className="text-2xs text-slate-400 mt-0.5">
                            Đã chi: {formatVndShort(staff.reportBudget)}
                          </div>
                        </td>

                        {/* GMV */}
                        <td className="p-3 text-right">
                          <div className="font-semibold text-emerald-400 font-mono">
                            {staff.targetGmv.toLocaleString('vi-VN')} đ
                          </div>
                          <div className="text-2xs text-slate-400 mt-0.5">
                            Đạt: {formatVndShort(staff.actualGmv)}
                          </div>
                        </td>

                        {/* Plan Nhân Viên (Fill Rate) */}
                        <td className="p-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-semibold text-white font-mono text-2xs">
                              {plannedCount}/{staff.planVideos} clips ({fillPct}%)
                            </span>
                            <div className="w-20 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${fillPct >= 90 ? 'bg-emerald-500' : fillPct > 50 ? 'bg-amber-500' : 'bg-slate-600'}`}
                                style={{ width: `${Math.min(100, fillPct)}%` }}
                              />
                            </div>
                            <span className={`text-2xs font-semibold px-1.5 py-0.2 rounded border ${
                              hasSubmitted ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' :
                              isFullyApproved ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' :
                              hasRevision ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' :
                              'bg-slate-800 text-slate-400 border-slate-700'
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
                              className="px-2 py-1 bg-blue-950/60 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-800/80 hover:border-blue-500 rounded text-xs font-semibold transition flex items-center gap-1 shadow-sm"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Soi Plan</span>
                            </button>
                            {isManager && (
                              <button
                                onClick={() => handleOpenEditAlloc(staff)}
                                title="Chỉnh sửa hạn mức phân bổ theo Tier"
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded text-xs font-medium transition flex items-center gap-1"
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
                <tfoot className="border-t-2 border-slate-300 font-mono text-xs">
                  {/* Row 1: Tổng Phân Bổ Toàn Bộ Nhân Sự */}
                  <tr className="bg-slate-100 font-semibold text-slate-900">
                    <td className="p-3 pl-5 sticky left-0 z-10 bg-slate-100 border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.04)]">
                      <span className="text-slate-900 text-2xs">Tổng phân bổ (26 nhân sự)</span>
                    </td>
                    {matrixViewMode !== 'BRANDS' && <td className="p-3 text-slate-600">Toàn bộ Brands</td>}

                    {matrixViewMode === '4_TIER' && (
                      <>
                        <td className="p-3 text-center text-rose-700 font-semibold">{teamTierAllocated.TIER_1_CELEB} clips</td>
                        <td className="p-3 text-center text-blue-700 font-semibold">{teamTierAllocated.TIER_2_MACRO} clips</td>
                        <td className="p-3 text-center text-emerald-700 font-semibold">{teamTierAllocated.TIER_3_MICRO} clips</td>
                        <td className="p-3 text-center text-purple-700 font-semibold">{teamTierAllocated.TIER_4_AFFILIATE} clips</td>
                      </>
                    )}

                    {matrixViewMode === 'BRANDS' && (
                      MATRIX_BRANDS.map(b => (
                        <td key={b} className="p-3 text-center text-slate-700">
                          {allocations.filter(s => s.assignedBrands.some(ab => ab.toLowerCase().includes(b.toLowerCase()))).length} P.Trách
                        </td>
                      ))
                    )}

                    {matrixViewMode === 'WEEKS' && (
                      MATRIX_WEEKS.map(w => (
                        <td key={w} className="p-3 text-center text-emerald-700 font-semibold">
                          {localPlanItems.filter(p => p.targetWeek === w).length} clips
                        </td>
                      ))
                    )}

                    <td className="p-3 text-right text-slate-900 font-semibold">{totalAllocatedVideos} clips</td>
                    <td className="p-3 text-right text-blue-700 font-semibold">{formatVndShort(totalAllocatedBudget)}</td>
                    <td className="p-3 text-right text-emerald-700 font-semibold">{formatVndShort(totalTargetGmv)}</td>
                    <td className="p-3 text-center text-slate-700">{localPlanItems.length} clips đã lập</td>
                    <td className="p-3 pr-5 text-right text-slate-400">—</td>
                  </tr>

                  {/* Row 2: Trần Kế Hoạch Tổng Của Trưởng Phòng */}
                  <tr className="bg-slate-50 text-slate-700">
                    <td className="p-3 pl-5 font-semibold text-slate-700 sticky left-0 z-10 bg-slate-50 border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.04)]">
                      TRẦN PLAN TỔNG (TRƯỞNG PHÒNG)
                    </td>
                    {matrixViewMode !== 'BRANDS' && <td className="p-3 text-slate-500">Định mức chốt</td>}

                    {matrixViewMode === '4_TIER' && (
                      <>
                        <td className="p-3 text-center text-rose-600 font-medium">{currentPlan.tierQuotas.find(t => t.tierId === 'TIER_1_CELEB')?.targetVideos || 0} trần</td>
                        <td className="p-3 text-center text-blue-600 font-medium">{currentPlan.tierQuotas.find(t => t.tierId === 'TIER_2_MACRO')?.targetVideos || 0} trần</td>
                        <td className="p-3 text-center text-emerald-600 font-medium">{currentPlan.tierQuotas.find(t => t.tierId === 'TIER_3_MICRO')?.targetVideos || 0} trần</td>
                        <td className="p-3 text-center text-purple-600 font-medium">{currentPlan.tierQuotas.find(t => t.tierId === 'TIER_4_AFFILIATE')?.targetVideos || 0} trần</td>
                      </>
                    )}

                    {matrixViewMode === 'BRANDS' && (
                      MATRIX_BRANDS.map(b => (
                        <td key={b} className="p-3 text-center text-slate-500">Chỉ tiêu</td>
                      ))
                    )}

                    {matrixViewMode === 'WEEKS' && (
                      MATRIX_WEEKS.map(w => (
                        <td key={w} className="p-3 text-center text-slate-500">Kế hoạch tuần</td>
                      ))
                    )}

                    <td className="p-3 text-right text-slate-700">{TOTAL_TARGET_VIDEOS} clips</td>
                    <td className="p-3 text-right text-blue-600">{formatVndShort(TOTAL_CEILING_BUDGET)}</td>
                    <td className="p-3 text-right text-emerald-600">{formatVndShort(currentPlan.totalTargetGmv)}</td>
                    <td className="p-3 text-center text-slate-600">100% mục tiêu</td>
                    <td className="p-3 pr-5 text-right text-slate-400">—</td>
                  </tr>

                  {/* Row 3: Gap Đối Soát (Headroom) */}
                  <tr className="bg-white font-semibold text-slate-900 border-t border-slate-200">
                    <td className="p-3 pl-5 text-slate-800 sticky left-0 z-10 bg-white border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.04)]">
                      Gap đối soát (headroom)
                    </td>
                    {matrixViewMode !== 'BRANDS' && <td className="p-3 text-slate-500">—</td>}

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
                                diff === 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                                diff > 0 ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                                'bg-amber-500/10 text-amber-400 border-amber-500/30'
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
                            <span className="px-2 py-0.5 rounded text-2xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30 inline-block">
                              ✓ {count} NV
                            </span>
                          </td>
                        );
                      })
                    )}

                    {matrixViewMode === 'WEEKS' && (
                      MATRIX_WEEKS.map(w => {
                        const count = localPlanItems.filter(p => p.targetWeek === w).length;
                        const phaseLabel = w === 'W1' ? 'Khởi động' : w === 'W2' ? 'Tăng tốc' : w === 'W3' ? 'Mega Peak' : 'Về đích';
                        return (
                          <td key={w} className="p-3 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="px-1.5 py-0.2 rounded text-2xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                                {phaseLabel}
                              </span>
                              <span className="text-2xs text-slate-300 font-mono">{count} clips</span>
                            </div>
                          </td>
                        );
                      })
                    )}

                    <td className={`p-3 text-right ${remainingVideos === 0 ? 'text-emerald-400' : remainingVideos > 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {remainingVideos === 0 ? '✓ Khớp trần' : remainingVideos > 0 ? `Còn ${remainingVideos} clips` : `Vượt ${Math.abs(remainingVideos)}`}
                    </td>
                    <td className={`p-3 text-right ${remainingBudget === 0 ? 'text-emerald-400' : remainingBudget > 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {remainingBudget === 0 ? '✓ Khớp trần' : remainingBudget > 0 ? `Còn ${formatVndShort(remainingBudget)}` : `Vượt ${formatVndShort(Math.abs(remainingBudget))}`}
                    </td>
                    <td className="p-3 text-right text-emerald-400">
                      {totalTargetGmv >= currentPlan.totalTargetGmv ? '✓ Đạt chỉ tiêu' : `Hụt ${formatVndShort((currentPlan.totalTargetGmv - totalTargetGmv))}`}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-2xs font-semibold px-2 py-0.5 rounded border inline-block ${
                        remainingBudget >= 0 && remainingVideos >= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}>
                        {remainingBudget >= 0 && remainingVideos >= 0 ? 'HỢP LỆ TRẦN' : 'VƯỢT ĐỊNH MỨC'}
                      </span>
                    </td>
                    <td className="p-3 pr-5 text-right text-slate-500">—</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}

      {/* TAB 1: MONTHLY PLAN VS REVISE VS ACTUAL & SELF CHANNEL (IMAGES 1, 2, 8) */}
      {/* ========================================================================= */}
      {activeTab === 'MONTHLY_PLAN' && (
        <div className="space-y-6">
          {/* Executive Summary 4 Cards (From Image 1) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card-enterprise p-5 bg-white border-blue-200 shadow-2xs text-center">
              <span className="text-xs text-blue-700 font-semibold block">AFFILIATE GMV</span>
              <div className="text-2xl font-semibold text-slate-900 mt-1">84,0%</div>
              <span className="text-xs text-slate-600 mt-1 block">
                <strong className="text-emerald-700">24,15 B</strong> / 28,74 B plan
              </span>
            </div>

            <div className="card-enterprise p-5 bg-white border-purple-200 shadow-2xs text-center">
              <span className="text-xs text-purple-700 font-semibold block">AFFILIATE BUDGET</span>
              <div className="text-2xl font-semibold text-slate-900 mt-1">90,4%</div>
              <span className="text-xs text-slate-600 mt-1 block">
                Gross <strong className="text-purple-700">3,05 B</strong> / 3,37 B
              </span>
            </div>

            <div className="card-enterprise p-5 bg-white border-emerald-200 shadow-2xs text-center">
              <span className="text-xs text-emerald-700 font-semibold block">VIDEO CÓ CAST BOOKING</span>
              <div className="text-2xl font-semibold text-slate-900 mt-1">622 Video</div>
              <span className="text-xs text-slate-600 mt-1 block">
                GMV30 ~ <strong className="text-emerald-700">1,27 B</strong>
              </span>
            </div>

            <div className="card-enterprise p-5 bg-white border-amber-200 shadow-2xs text-center">
              <span className="text-xs text-amber-700 font-semibold block">SELF CHANNEL GMV</span>
              <div className="text-2xl font-semibold text-slate-900 mt-1">63,4%</div>
              <span className="text-xs text-slate-600 mt-1 block">
                <strong className="text-amber-700">1,19 B</strong> / 1,88 B plan
              </span>
            </div>
          </div>

          {/* Master Table: Overall Marketing B2C T8 (From Image 2) */}
          <div className="card-enterprise overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                  Bảng theo dõi kế hoạch & thực đạt
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đối chiếu chỉ số Plan T8 vs Revise T8 vs Actual T8 và tỷ lệ % hoàn thành
                </p>
              </div>
              <span className="badge-emerald px-2.5 py-1 rounded-full text-xs font-semibold">
                Cập nhật: Cuối kỳ T8
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200">
                    <th className="p-3.5 pl-6 font-semibold text-slate-600">Workstream (hạng mục)</th>
                    <th className="p-3.5 font-semibold text-slate-600">Metric (chỉ số)</th>
                    <th className="p-3.5 font-semibold text-slate-600">Plan T8</th>
                    <th className="p-3.5 font-semibold text-slate-600">Revise T8</th>
                    <th className="p-3.5 font-semibold text-slate-600">Actual T8</th>
                    <th className="p-3.5 pr-6 font-semibold text-slate-600 text-right">% Đạt kế hoạch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {MONTHLY_PLAN_DATA.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 pl-6 font-semibold text-slate-900">{row.workstream}</td>
                      <td className="p-3.5 font-medium text-slate-700">{row.metric}</td>
                      <td className="p-3.5 text-slate-500 font-mono">{row.planT8}</td>
                      <td className="p-3.5 text-slate-500 font-mono">{row.reviseT8}</td>
                      <td className="p-3.5 font-semibold text-slate-900 font-mono">{row.actualT8}</td>
                      <td className="p-3.5 pr-6 text-right">
                        <span className={`px-2.5 py-1 rounded-full text-2xs font-semibold inline-block ${
                          row.pctAchieved === '100%' || Number(row.pctAchieved.replace('%','').replace(',','.')) >= 90
                            ? 'badge-emerald'
                            : Number(row.pctAchieved.replace('%','').replace(',','.')) >= 80
                            ? 'badge-blue'
                            : 'badge-amber'
                        }`}>
                          {row.pctAchieved}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Section: VI. Self Channel (From Image 8) */}
          <div className="card-enterprise p-5 bg-amber-50/40 border border-amber-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-amber-200/80">
              <div>
                <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                  <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
                  VI. Chi tiết phân hệ kênh tự vận hành
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Đánh giá chỉ tiêu GMV, Budget Gross và 853 Video thực tế lên sóng từ hệ thống kênh In-House
                </p>
              </div>
              <span className="badge-amber px-2.5 py-1 rounded-full text-xs font-semibold">
                883 Video Pillar / 72,6M GMV30
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-slate-500 block mb-1">GMV Self Channel:</span>
                <div className="text-lg font-semibold text-slate-900">
                  {SELF_CHANNEL_SUMMARY.gmvActual} <span className="text-xs text-slate-400 font-normal">/ {SELF_CHANNEL_SUMMARY.gmvPlan} plan</span>
                </div>
                <span className="text-amber-700 font-semibold mt-1 block">Đạt {SELF_CHANNEL_SUMMARY.gmvPct}</span>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-slate-500 block mb-1">Budget Gross:</span>
                <div className="text-lg font-semibold text-purple-700">
                  {SELF_CHANNEL_SUMMARY.budgetActual} <span className="text-xs text-slate-400 font-normal">/ {SELF_CHANNEL_SUMMARY.budgetPlan} plan</span>
                </div>
                <span className="text-emerald-700 font-semibold mt-1 block">Giải ngân {SELF_CHANNEL_SUMMARY.budgetPct}</span>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-slate-500 block mb-1">Sản lượng video Air:</span>
                <div className="text-lg font-semibold text-blue-700">
                  {SELF_CHANNEL_SUMMARY.videoActual} <span className="text-xs text-slate-400 font-normal">/ {SELF_CHANNEL_SUMMARY.videoPlan} plan</span>
                </div>
                <span className="text-emerald-700 font-semibold mt-1 block">Đạt {SELF_CHANNEL_SUMMARY.videoPct}</span>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-slate-500 block mb-1">Bảng Pillar kênh In-House:</span>
                <div className="text-lg font-semibold text-emerald-700">
                  {SELF_CHANNEL_SUMMARY.pillarVideoCount} Video
                </div>
                <span className="text-slate-600 mt-1 block font-mono">GMV 30: {SELF_CHANNEL_SUMMARY.pillarGmv30}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: STAFF AIR PROGRESS & BUDGET TRACKING (IMAGE 6: 26 NHÂN SỰ) */}
      {/* ========================================================================= */}
      {activeTab === 'STAFF_AIR_PROGRESS' && (
        <div className="space-y-6">
          {/* Action Header & Quick Filters */}
          <div className="card-enterprise p-5 bg-white border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Video className="w-4 h-4 text-blue-600" />
                Chi tiết chỉ tiêu ngân sách & tiến độ Air theo 26 nhân sự booking (tháng 8/2026)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tổng Plan 5.648 video vs Report 1.407 video (TB 65%) • Plan ngân sách 3,681B vs Report 2,849B (TB 74%)
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Quick Filter buttons */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                <button
                  onClick={() => setAirFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    airFilter === 'ALL' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả (26)
                </button>
                <button
                  onClick={() => setAirFilter('LAGGING')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
                    airFilter === 'LAGGING' ? 'bg-rose-600 text-white shadow-2xs' : 'text-rose-700 hover:text-rose-900'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>Tụt Air &lt;50% (5)</span>
                </button>
                <button
                  onClick={() => setAirFilter('OVER_BUDGET')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    airFilter === 'OVER_BUDGET' ? 'bg-purple-600 text-white shadow-2xs' : 'text-purple-700 hover:text-purple-900'
                  }`}
                >
                  Vượt Ngân Sách &gt;100%
                </button>
                <button
                  onClick={() => setAirFilter('GOOD')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    airFilter === 'GOOD' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-700 hover:text-emerald-900'
                  }`}
                >
                  Tiến Độ Tốt (&gt;=80%)
                </button>
              </div>

              {/* Bulk Ping Button */}
              <button
                onClick={handlePingAllLagging}
                disabled={isAllLaggingPinged}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-xs cursor-pointer ${
                  isAllLaggingPinged
                    ? 'bg-slate-100 text-slate-400 border border-slate-200'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }`}
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>{isAllLaggingPinged ? 'Đã Nhắc Nhở Toàn Bộ' : 'Đốc Thúc 5 Bạn Tụt Air'}</span>
              </button>
            </div>
          </div>

          {/* 26 Staff Progress Table */}
          <div className="card-enterprise overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200">
                    <th className="p-3 pl-6 font-semibold text-slate-600">Tháng</th>
                    <th className="p-3 font-semibold text-slate-600">Nhân sự booking</th>
                    <th className="p-3 font-semibold text-slate-600 text-right">Plan Số Video</th>
                    <th className="p-3 font-semibold text-slate-600 text-right">Report Số Video</th>
                    <th className="p-3 font-semibold text-slate-600 text-center">Tiến độ Air</th>
                    <th className="p-3 font-semibold text-slate-600 text-right">Plan Ngân Sách</th>
                    <th className="p-3 font-semibold text-slate-600 text-right">Report ngân sách</th>
                    <th className="p-3 font-semibold text-slate-600 text-center">Tiến độ ngân sách</th>
                    <th className="p-3 pr-6 font-semibold text-slate-600 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStaffProgress.map((staff, idx) => (
                    <tr 
                      key={staff.id} 
                      className={`transition-colors ${
                        staff.isLagging || staff.airProgress < 50 
                          ? 'bg-rose-50/60 hover:bg-rose-100/50' 
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="p-3 pl-6 text-slate-500 font-mono">{staff.month}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 text-sm">{staff.staffName}</span>
                          {(staff.isLagging || staff.airProgress < 50) && (
                            <span className="badge-rose px-1.5 py-0.2 rounded text-2xs font-semibold">
                              Chậm Tiến Độ
                            </span>
                          )}
                          {staff.budgetProgress > 100 && (
                            <span className="badge-purple px-1.5 py-0.2 rounded text-2xs font-semibold">
                              Vượt Plan
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600">{staff.planVideos}</td>
                      <td className="p-3 text-right font-mono font-semibold text-slate-900">{staff.reportVideos}</td>
                      <td className="p-3 text-center">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-16 bg-slate-200 rounded-full h-1.5 hidden sm:block">
                            <div 
                              className={`h-1.5 rounded-full ${
                                staff.airProgress < 50 ? 'bg-rose-500' :
                                staff.airProgress >= 80 ? 'bg-emerald-500' : 'bg-blue-500'
                              }`} 
                              style={{ width: `${Math.min(staff.airProgress, 100)}%` }}
                            />
                          </div>
                          <span className={`px-2 py-0.5 rounded font-semibold text-2xs ${
                            staff.airProgress < 50 ? 'badge-rose' :
                            staff.airProgress >= 80 ? 'badge-emerald' : 'badge-blue'
                          }`}>
                            {staff.airProgress}%
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-500">
                        {staff.planBudget.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-blue-700">
                        {staff.reportBudget.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded font-semibold text-2xs ${
                          staff.budgetProgress >= 100 ? 'badge-purple' :
                          staff.budgetProgress >= 80 ? 'badge-emerald' : 'badge-amber'
                        }`}>
                          {staff.budgetProgress}%
                        </span>
                      </td>
                      <td className="p-3 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setAiReviewTargetStaff(staff.staffName)}
                            className="px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-semibold text-2xs transition flex items-center gap-1 shadow-2xs cursor-pointer"
                            title={`Khởi chạy AI nhận xét tiến độ của ${staff.staffName}`}
                          >
                            <Sparkles className="w-3 h-3 text-purple-600" />
                            <span>AI Review</span>
                          </button>
                          <button
                            onClick={() => handlePing(staff.id, staff.staffName, 'Đốc thúc trả link video TikTok lên sóng')}
                            disabled={pingedStaff[staff.id]}
                            className={`px-2.5 py-1 rounded-lg font-semibold text-xs flex items-center gap-1 transition cursor-pointer ${
                              pingedStaff[staff.id]
                                ? 'bg-slate-100 text-slate-400 border border-slate-200'
                                : (staff.isLagging || staff.airProgress < 50)
                                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                            }`}
                          >
                            <BellRing className="w-3 h-3" />
                            <span>{pingedStaff[staff.id] ? 'Đã Nhắc' : 'Đốc Thúc'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Total Footer Row */}
                <tfoot>
                  <tr className="bg-slate-100/90 border-t-2 border-blue-500 font-semibold text-slate-900">
                    <td className="p-3.5 pl-6" colSpan={2}>
                      Tổng cộng (26 bản ghi toàn bộ b2c)
                    </td>
                    <td className="p-3.5 text-right font-mono text-blue-700">5.648</td>
                    <td className="p-3.5 text-right font-mono text-emerald-700">1.407</td>
                    <td className="p-3.5 text-center">
                      <span className="badge-emerald px-2 py-0.5 rounded text-2xs">
                        Trung Bình 65%
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-700">3.681.480.001 đ</td>
                    <td className="p-3.5 text-right font-mono text-blue-700">2.849.289.000 đ</td>
                    <td className="p-3.5 text-center">
                      <span className="badge-blue px-2 py-0.5 rounded text-2xs">
                        Trung Bình 74%
                      </span>
                    </td>
                    <td className="p-3.5 pr-6 text-right text-slate-500 text-2xs">
                      Kiểm duyệt 100%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: STAFF REVENUE & GMV GROWTH (IMAGE 7: REPORT THEO HIỆU QUẢ) */}
      {/* ========================================================================= */}
      {activeTab === 'STAFF_REVENUE_GMV' && (
        <div className="space-y-6">
          {/* Caveat Banner from Image 7 */}
          <div className="p-4 bg-blue-50/80 rounded-xl border border-blue-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="font-semibold text-blue-900 text-sm">
                  Ghi chú đánh giá hiệu quả: Dữ liệu kéo thiếu kênh tự vận hành
                </span>
                <p className="text-slate-600 mt-0.5">
                  Một số nhân sự làm thuần Self Channel nhìn hiệu quả doanh thu affiliate trên bảng này sẽ bị thấp hơn đóng góp thực tế. Quản lý cần đối chiếu thêm với phân hệ Self Channel tại Tab 1.
                </p>
              </div>
            </div>
            <span className="badge-blue px-3 py-1.5 rounded-lg font-semibold shrink-0">
              Tổng KOC Book mới: 243 KOCs
            </span>
          </div>

          {/* Revenue Table from Image 7 */}
          <div className="card-enterprise overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Báo cáo hiệu quả doanh thu & tăng trưởng GMV 30 ngày từng nhân sự
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  So sánh GMV tháng này vs GMV tháng trước, tỷ lệ tăng trưởng và số KOC book mới phát triển
                </p>
              </div>
              <span className="badge-emerald px-2.5 py-1 rounded-full text-xs font-semibold">
                Tổng GMV: 1,36 tỷ đ
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200">
                    <th className="p-3 pl-6 font-semibold text-slate-600">#</th>
                    <th className="p-3 font-semibold text-slate-600">Nhân sự booking</th>
                    <th className="p-3 font-semibold text-slate-600 text-center">Tiến độ ngân sách</th>
                    <th className="p-3 font-semibold text-slate-600 text-center">KOC Book Mới</th>
                    <th className="p-3 font-semibold text-slate-600 text-right">GMV tháng này (30 ngày)</th>
                    <th className="p-3 font-semibold text-slate-600 text-right">GMV tháng trước</th>
                    <th className="p-3 font-semibold text-slate-600 text-right">Tăng trưởng GMV</th>
                    <th className="p-3 pr-6 font-semibold text-slate-600 text-center">ROI 14 Ngày</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {BOOKING_STAFF_REVENUE_26.map((staff, idx) => (
                    <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 pl-6 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-900 text-sm">{staff.staffName}</span>
                        {idx === 0 && (
                          <span className="badge-amber ml-2 px-1.5 py-0.2 rounded text-2xs font-semibold">
                            Dẫn đầu doanh thu
                          </span>
                        )}
                        {staff.newKocsBooked >= 30 && (
                          <span className="badge-cyan ml-2 px-1.5 py-0.2 rounded text-2xs font-semibold">
                            Tuyển Mới Tốt ({staff.newKocsBooked})
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded font-semibold text-2xs ${
                          staff.budgetProgress >= 100 ? 'badge-purple' :
                          staff.budgetProgress >= 80 ? 'badge-emerald' : 'badge-amber'
                        }`}>
                          {staff.budgetProgress}%
                        </span>
                      </td>
                      <td className="p-3 text-center font-semibold text-blue-700 font-mono">
                        {staff.newKocsBooked}
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-emerald-700">
                        {staff.gmvThisMonth > 0 ? `${staff.gmvThisMonth.toLocaleString('vi-VN')} đ` : '0 đ'}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-500">
                        {staff.gmvLastMonth > 0 ? `${staff.gmvLastMonth.toLocaleString('vi-VN')} đ` : '0 đ'}
                      </td>
                      <td className="p-3 text-right">
                        <span className={`font-mono font-semibold text-2xs flex items-center justify-end gap-0.5 ${
                          staff.growthRate > 0 ? 'text-emerald-700' :
                          staff.growthRate < 0 ? 'text-rose-700' : 'text-slate-500'
                        }`}>
                          {staff.growthRate > 0 ? '+' : ''}{staff.growthRate.toFixed(2)}%
                        </span>
                      </td>
                      <td className="p-3 pr-6 text-center font-mono text-slate-600">
                        {staff.roi14Days.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100/90 border-t-2 border-emerald-600 font-semibold text-slate-900">
                    <td className="p-3.5 pl-6" colSpan={3}>
                      Tổng cộng thực tế
                    </td>
                    <td className="p-3.5 text-center font-mono text-blue-700">243 KOC</td>
                    <td className="p-3.5 text-right font-mono text-emerald-700">1.361.919.883 đ</td>
                    <td className="p-3.5 text-right font-mono text-slate-700">2.395.027.916 đ</td>
                    <td className="p-3.5 text-right font-mono text-emerald-700">+22.51% (TB)</td>
                    <td className="p-3.5 pr-6 text-center font-mono text-slate-600">0.00</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PLAN GAP ANALYSIS (IMAGE 8: HỤT 466 TRIỆU THEO 5 NHÓM NGUYÊN NHÂN) */}
      {/* ========================================================================= */}
      {activeTab === 'PLAN_GAP_466M' && (
        <div className="space-y-6">
          {/* Executive Overview Banner of the 466M Gap */}
          <div className="card-enterprise p-6 bg-rose-50/50 border border-rose-200 shadow-2xs">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="badge-rose px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    V. Chi tiêu ngân sách booking tháng 8 — Phân tích Plan Gap
                  </span>
                  <span className="text-xs text-slate-500">Báo cáo trực quan theo nguyên nhân gốc rễ</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-900">
                  Phân tích hụt 466 triệu ngân sách theo 5 cụm gian hàng thực tế
                </h3>
                <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  Lý do gap 466M: Xảy ra cục bộ tại một số cụm gian hàng do thiếu capacity, vận hành nội bộ, thay đổi plan, và chưa nghiệm thu chi phí mã Ads. Toàn bộ B2C vẫn đạt 90,4% ngân sách nhờ bù đắp từ các gian tiêu vượt như Babe.
                </p>
              </div>

              <div className="text-right bg-white p-4 rounded-xl border border-rose-200 shadow-2xs shrink-0">
                <span className="text-xs text-rose-700 font-semibold block">Tổng ngân sách gap</span>
                <div className="text-2xl font-semibold text-rose-700 mt-1">466.809.172 đ</div>
                <span className="text-2xs text-slate-500">Phân bổ trên 5 nhóm nguyên nhân</span>
              </div>
            </div>
          </div>

          {/* Master Table of 5 Cause Groups (Direct from Image 8) */}
          <div className="card-enterprise overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Bảng phân tích 5 nhóm nguyên nhân & cụm gian hàng bị Gap</h4>
                <p className="text-xs text-slate-500 mt-0.5">Xác định giải pháp khắc phục cụ thể cho từng nhãn hàng trong tháng 9</p>
              </div>
              <span className="badge-rose px-2.5 py-1 rounded-full text-xs font-semibold">
                5 nhóm nguyên nhân
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200">
                    <th className="p-3.5 pl-6 font-semibold text-slate-600">Nhóm nguyên nhân</th>
                    <th className="p-3.5 font-semibold text-slate-600">Cụm gian hàng / Brand</th>
                    <th className="p-3.5 font-semibold text-slate-600 text-right">Ngân sách Gap</th>
                    <th className="p-3.5 font-semibold text-slate-600 text-center">Tỷ trọng Gap</th>
                    <th className="p-3.5 pr-6 font-semibold text-slate-600 text-right">Giải pháp khắc phục</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {PLAN_GAP_DATA.map((gap, idx) => (
                    <tr key={gap.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 pl-6 font-semibold text-slate-900">{gap.causeGroup}</td>
                      <td className="p-3.5 font-semibold text-blue-700">{gap.brandCluster}</td>
                      <td className="p-3.5 text-right font-mono font-semibold text-rose-700">
                        {gap.gapAmount.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="badge-rose px-2 py-0.5 rounded font-semibold text-2xs">
                          {((gap.gapAmount / 466809172) * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-3.5 pr-6 text-right">
                        {gap.brandCluster.includes('pHCare') ? (
                          <button
                            onClick={handleResolveAdsCode}
                            disabled={isAdsCodeResolved}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1 cursor-pointer ${
                              isAdsCodeResolved
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs'
                                : 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                            }`}
                          >
                            <Zap className="w-3 h-3" />
                            <span>{isAdsCodeResolved ? 'Đã Giải Tỏa 50M' : 'Duyệt Nghiệm Thu Mã Ads'}</span>
                          </button>
                        ) : gap.brandCluster.includes('EUPC') ? (
                          <button
                            onClick={handleRebalanceCapacity}
                            disabled={isCapacityRebalanced}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1 cursor-pointer ${
                              isCapacityRebalanced
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs'
                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                            }`}
                          >
                            <Users className="w-3 h-3" />
                            <span>{isCapacityRebalanced ? 'Đã Điều Phối Nhân Sự' : 'Bổ Sung Capacity Booking'}</span>
                          </button>
                        ) : (
                          <span className="text-slate-500 italic text-2xs">{gap.note}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100/90 border-t-2 border-rose-500 font-semibold text-slate-900">
                    <td className="p-3.5 pl-6" colSpan={2}>
                      Tổng ngân sách gap 5 nhóm
                    </td>
                    <td className="p-3.5 text-right font-mono text-rose-700 text-sm">
                      466.809.172 đ
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="badge-rose px-2 py-0.5 rounded text-2xs">100.0%</span>
                    </td>
                    <td className="p-3.5 pr-6 text-right text-slate-600 text-2xs">
                      Bù đắp bởi các gian tiêu vượt như Babe
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: DEEP ANALYTICS: KL1-KL7, CONTENT PILLAR, CREATOR NICHE */}
      {/* ========================================================================= */}
      {activeTab === 'DEEP_ANALYTICS' && (
        <div className="space-y-6">
          {/* Sub-navigation between 3 Analysis Dimensions */}
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setAnalyticsSubTab('KL')}
              className={`px-3.5 py-2 rounded-xl font-semibold transition ${
                analyticsSubTab === 'KL'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              2.2 hiệu quả theo khung lương (KL1 → KL7)
            </button>
            <button
              onClick={() => setAnalyticsSubTab('PILLAR')}
              className={`px-3.5 py-2 rounded-xl font-semibold transition ${
                analyticsSubTab === 'PILLAR'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              2.3 hiệu quả theo Content Pillar (6 trụ cột)
            </button>
            <button
              onClick={() => setAnalyticsSubTab('CREATOR_NICHE')}
              className={`px-3.5 py-2 rounded-xl font-semibold transition ${
                analyticsSubTab === 'CREATOR_NICHE'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              2.4 báo cáo theo tệp Creator (Review nữ, mẹ bé...)
            </button>
          </div>

          {/* Dimension 1: Khung Lương KL1 -> KL7 (Table 2.2 from Image 4) */}
          {analyticsSubTab === 'KL' && (
            <div className="card-enterprise overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">2.2 báo cáo hiệu quả theo khung lương KOC (KL)</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Đánh giá sản lượng video, chi phí bỏ ra, GMV30 và tỷ suất hoàn vốn ROI từng khung</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200">
                      <th className="p-3.5 pl-6 font-semibold text-slate-600">Khung Lương (KL)</th>
                      <th className="p-3.5 font-semibold text-slate-600">Số Video</th>
                      <th className="p-3.5 font-semibold text-slate-600">% Video</th>
                      <th className="p-3.5 font-semibold text-slate-600">Chi Phí (CP)</th>
                      <th className="p-3.5 font-semibold text-slate-600">% CP</th>
                      <th className="p-3.5 font-semibold text-slate-600">GMV 30 Ngày</th>
                      <th className="p-3.5 font-semibold text-slate-600">% GMV</th>
                      <th className="p-3.5 pr-6 font-semibold text-slate-600 text-right">ROI thực đạt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {KL_PERFORMANCE_DATA.map((r) => (
                      <tr key={r.kl} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 pl-6 font-semibold text-slate-900 font-mono">{r.kl}</td>
                        <td className="p-3.5 font-semibold text-slate-800">{r.videoCount}</td>
                        <td className="p-3.5 text-slate-500">{r.pctVideo}</td>
                        <td className="p-3.5 font-mono text-slate-700">{r.cost}</td>
                        <td className="p-3.5 text-slate-500">{r.pctCost}</td>
                        <td className="p-3.5 font-mono font-semibold text-emerald-700">{r.gmv30}</td>
                        <td className="p-3.5 text-slate-500">{r.pctGmv}</td>
                        <td className="p-3.5 pr-6 text-right">
                          <span className={`px-2 py-0.5 rounded font-semibold text-2xs ${
                            r.roi >= 0.8 ? 'badge-emerald' : r.roi >= 0.5 ? 'badge-blue' : 'badge-amber'
                          }`}>
                            ROI {r.roi.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Dimension 2: Content Pillar (Table 2.3 from Image 4) */}
          {analyticsSubTab === 'PILLAR' && (
            <div className="card-enterprise overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">2.3 báo cáo hiệu quả theo Content Pillar</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Xác định trụ cột nội dung nào mang lại ROI cao nhất để tập trung nguồn lực</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200">
                      <th className="p-3.5 pl-6 font-semibold text-slate-600">Content Pillar</th>
                      <th className="p-3.5 font-semibold text-slate-600">Số Video</th>
                      <th className="p-3.5 font-semibold text-slate-600">% Video</th>
                      <th className="p-3.5 font-semibold text-slate-600">Chi Phí</th>
                      <th className="p-3.5 font-semibold text-slate-600">% CP</th>
                      <th className="p-3.5 font-semibold text-slate-600">GMV 30 Ngày</th>
                      <th className="p-3.5 font-semibold text-slate-600">% GMV</th>
                      <th className="p-3.5 pr-6 font-semibold text-slate-600 text-right">ROI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {PILLAR_PERFORMANCE_DATA.map((p) => (
                      <tr key={p.pillar} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 pl-6 font-semibold text-slate-900">{p.pillar}</td>
                        <td className="p-3.5 font-semibold text-slate-800">{p.videoCount}</td>
                        <td className="p-3.5 text-slate-500">{p.pctVideo}</td>
                        <td className="p-3.5 font-mono text-slate-700">{p.cost}</td>
                        <td className="p-3.5 text-slate-500">{p.pctCost}</td>
                        <td className="p-3.5 font-mono font-semibold text-emerald-700">{p.gmv30}</td>
                        <td className="p-3.5 text-slate-500">{p.pctGmv}</td>
                        <td className="p-3.5 pr-6 text-right">
                          <span className={`px-2 py-0.5 rounded font-semibold text-2xs ${
                            p.roi >= 0.8 ? 'badge-emerald' : p.roi >= 0.4 ? 'badge-blue' : 'badge-amber'
                          }`}>
                            ROI {p.roi.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Dimension 3: Creator Niche (Table 2.4 from Image 5) */}
          {analyticsSubTab === 'CREATOR_NICHE' && (
            <div className="card-enterprise overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">2.4 Report hiệu quả theo tệp Creator</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Phân tích hiệu suất theo từng nhóm đối tượng Creator booking</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200">
                      <th className="p-3.5 pl-6 font-semibold text-slate-600">Tệp Creator</th>
                      <th className="p-3.5 font-semibold text-slate-600">Số Video</th>
                      <th className="p-3.5 font-semibold text-slate-600">% Video</th>
                      <th className="p-3.5 font-semibold text-slate-600">Chi Phí</th>
                      <th className="p-3.5 font-semibold text-slate-600">% CP</th>
                      <th className="p-3.5 font-semibold text-slate-200">GMV 30 Ngày</th>
                      <th className="p-3.5 font-semibold text-slate-200">% GMV</th>
                      <th className="p-3.5 pr-6 font-semibold text-slate-200 text-right">ROI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {CREATOR_NICHE_PERFORMANCE_DATA.map((c) => (
                      <tr key={c.niche} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 pl-6 font-semibold text-slate-900">{c.niche}</td>
                        <td className="p-3.5 font-semibold text-slate-800">{c.videoCount}</td>
                        <td className="p-3.5 text-slate-500">{c.pctVideo}</td>
                        <td className="p-3.5 font-mono text-slate-700">{c.cost}</td>
                        <td className="p-3.5 text-slate-500">{c.pctCost}</td>
                        <td className="p-3.5 font-mono font-semibold text-emerald-700">{c.gmv30}</td>
                        <td className="p-3.5 text-slate-500">{c.pctGmv}</td>
                        <td className="p-3.5 pr-6 text-right">
                          <span className={`px-2 py-0.5 rounded font-semibold text-2xs ${
                            c.roi >= 0.8 ? 'badge-emerald' : c.roi >= 0.4 ? 'badge-blue' : 'badge-amber'
                          }`}>
                            ROI {c.roi.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Strategic Action Insight from Real Data */}
          <div className="card-enterprise p-5 bg-white border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Check className="w-4 h-4 text-blue-600" />
              Định hướng điều phối kế hoạch cho quản lý:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-700">
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
                <strong className="text-emerald-800 block mb-1">1. Đẩy mạnh KL1 & Unboxing (ROI &gt; 0.85):</strong>
                Unboxing chi phí chỉ chiếm 0,52% nhưng đạt ROI 1.01 (hoàn vốn 100%). Cần tăng tỷ trọng video Unboxing và KL1 trong tháng 9.
              </div>
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80">
                <strong className="text-amber-800 block mb-1">2. Tái ký KOC Gia Đình & Bác Sĩ (ROI 0.96 &amp; 0.86):</strong>
                Nhóm bác sĩ và gia đình có độ tin cậy vượt trội và tỷ lệ chuyển đổi đơn hàng rất cao so với nhóm Review nữ phổ thông.
              </div>
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/80">
                <strong className="text-blue-800 block mb-1">3. Kiểm soát ngân sách KL6 &amp; KL7:</strong>
                KL6 và KL7 chiếm tới 67,6% ngân sách (hơn 1,9 tỷ đ) nhưng ROI chỉ đạt 0.30 - 0.62. Cần đàm phán gắt gao điều khoản cam kết view/GMV.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: QUẢN TRỊ TUÂN THỦ SLA B2C & BÁO CÁO NHÂN SỰ & CỬA SỔ NGHIỆM THU E2E */}
      {activeTab === 'SLA_MANAGEMENT' && (
        <div className="space-y-6">
          {/* Notification Toast Banner when pinging */}
          {pingSuccessStaff && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between shadow-xs animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{pingSuccessStaff}</span>
              </div>
              <button onClick={() => setPingSuccessStaff(null)} className="text-emerald-600 hover:text-emerald-800">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Banner 1: Cửa Sổ Nghiệm Thu E2E & Quy Chuẩn Khóa Sổ */}
          <div className="card-enterprise p-5 bg-amber-500/10 border-amber-300/80 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-semibold shadow-xs">
                    <Timer className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                      Cửa Sổ Nghiệm Thu Đối Soát E2E B2C — Tháng {currentPlan.monthLabel}
                      <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                        ● {reconWindow.phaseLabel}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Quy chế đối soát: Khung giờ mở sửa <strong className="text-slate-800">{reconWindow.windowOpenTime} - {reconWindow.windowCloseTime}</strong>.
                      Sau mốc giờ quy định, hệ thống tự động khóa sổ vĩnh viễn mọi bản ghi.
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <div className="text-xs text-slate-500">Tiến độ sửa sai lệch Round 1</div>
                  <div className="text-sm font-semibold text-amber-700">
                    {reconWindow.resolvedErrorsCount} / {reconWindow.totalErrorsReportedRound1} lỗi đã fix ({Math.round((reconWindow.resolvedErrorsCount / reconWindow.totalErrorsReportedRound1) * 100)}%)
                  </div>
                </div>
                <span className="px-3 py-1.5 rounded-xl font-semibold text-xs bg-amber-600 text-white shadow-2xs">
                  Còn {reconWindow.pendingErrorsCount} lỗi cần xử lý
                </span>
              </div>
            </div>

            {/* 5-Step Visual E2E Reconciliation Roadmap */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-200/80 text-xs">
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-emerald-800 text-2xs">1. MÙNG 2</span>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <p className="text-2xs text-emerald-700">Chốt số & đóng băng số liệu tạm tính</p>
                <span className="text-2xs text-emerald-600 font-semibold mt-1">Đã hoàn thành</span>
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-emerald-800 text-2xs">2. WD04</span>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <p className="text-2xs text-emerald-700">Kế toán gửi báo cáo Sai lệch Round 1 (14 lỗi)</p>
                <span className="text-2xs text-emerald-600 font-semibold mt-1">Đã gửi báo cáo</span>
              </div>

              <div className="p-2.5 rounded-lg bg-amber-100 border-2 border-amber-400 shadow-xs flex flex-col justify-between relative overflow-hidden">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-amber-900 text-2xs">3. WD05 (HÔM NAY)</span>
                  <span className="w-2 h-2 rounded-full bg-amber-600" />
                </div>
                <p className="text-2xs text-amber-900 font-medium">Mở sửa (09:00 - 17:00), khóa cứng 17:30</p>
                <span className="text-2xs text-amber-800 font-semibold mt-1">Đang mở cửa sổ</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between opacity-80">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-700 text-2xs">4. WD10</span>
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <p className="text-2xs text-slate-600">Kế toán đối soát & báo cáo Sai lệch Round 2</p>
                <span className="text-2xs text-slate-400 font-medium mt-1">Dự kiến: 29/09</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between opacity-80">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-700 text-2xs">5. WD11</span>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <p className="text-2xs text-slate-600">Mở sửa cuối (09:00 - 17:00), khóa vĩnh viễn 17:30</p>
                <span className="text-2xs text-slate-400 font-medium mt-1">Chốt nghiệm thu cuối</span>
              </div>
            </div>
          </div>

          {/* 4 Executive KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* KPI 1 */}
            <div className="card-enterprise p-4 bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Tỷ lệ đúng hạn SLA</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-semibold text-slate-900 mt-1">91.8%</div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: '91.8%' }} />
              </div>
              <div className="flex items-center justify-between text-2xs text-slate-500 mt-1.5">
                <span>Mục tiêu: &gt;= 90%</span>
                <span className="text-emerald-700 font-semibold">80 / 87 Jobs</span>
              </div>
            </div>

            {/* KPI 2 */}
            <div className="card-enterprise p-4 bg-white border border-rose-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-700">Vi phạm đang kích hoạt</span>
                <ShieldAlert className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-2xl font-semibold text-rose-600 mt-1">
                {slaBreaches.filter(b => b.status !== 'RESOLVED').length} <span className="text-xs font-medium text-slate-500">vụ việc</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="px-1.5 py-0.5 rounded text-2xs font-semibold bg-rose-100 text-rose-800">
                  2 Khẩn cấp
                </span>
                <span className="px-1.5 py-0.5 rounded text-2xs font-semibold bg-amber-100 text-amber-800">
                  3 Cảnh báo
                </span>
                <span className="px-1.5 py-0.5 rounded text-2xs font-medium bg-slate-100 text-slate-700">
                  1 Info
                </span>
              </div>
              <div className="text-2xs text-slate-400 mt-1.5">
                Cần can thiệp trước 17:00
              </div>
            </div>

            {/* KPI 3 */}
            <div className="card-enterprise p-4 bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Điểm trừ phạt SLA tháng</span>
                <TrendingDown className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-semibold text-amber-600 mt-1">-35 <span className="text-xs font-medium text-slate-500">điểm</span></div>
              <p className="text-2xs text-slate-500 mt-2">
                Áp dụng quy chế trừ điểm vi phạm SLA đối với 4 nhân sự Booking, Content & Logistics.
              </p>
            </div>

            {/* KPI 4 */}
            <div className="card-enterprise p-4 bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Khóa Data & trễ DNTT</span>
                <Lock className="w-4 h-4 text-slate-700" />
              </div>
              <div className="text-2xl font-semibold text-slate-900 mt-1">2 <span className="text-xs font-medium text-slate-500">deal</span></div>
              <div className="space-y-0.5 mt-2 text-2xs text-slate-600">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span>1 deal trễ DNTT 10:00 sáng</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                  <span>1 deal tự khóa data (&gt;7 ngày)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Bảng Đánh Giá Tuân Thủ SLA Từng Nhân Viên */}
          <div className="card-enterprise overflow-hidden bg-white border border-slate-200 shadow-xs">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Bảng đánh giá hiệu suất & tuân thủ SLA nhân sự
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Theo dõi tỷ lệ hoàn thành đúng hạn, điểm phạt, và gửi cảnh báo trực tiếp qua Lark tới nhân sự vi phạm
                </p>
              </div>

              {/* Department Filter Pills */}
              <div className="flex items-center gap-1.5 text-xs">
                {['ALL', 'Booking', 'Content', 'Account'].map(dept => (
                  <button
                    key={dept}
                    onClick={() => setSlaStaffFilter(dept)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                      slaStaffFilter === dept
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    {dept === 'ALL' ? 'Tất cả Bộ phận' : dept}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[950px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <tr>
                    <th className="py-3 px-4 w-[240px]">Nhân sự & đội ngũ</th>
                    <th className="py-3 px-3 w-[220px]">Nhãn hàng phụ trách</th>
                    <th className="py-3 px-3 text-center w-[120px]">Tổng Jobs</th>
                    <th className="py-3 px-3 w-[160px]">Tỷ lệ đúng hạn</th>
                    <th className="py-3 px-3 text-center w-[110px]">Điểm SLA</th>
                    <th className="py-3 px-3 text-center w-[110px]">Vi phạm mở</th>
                    <th className="py-3 px-3 text-center w-[130px]">Xếp loại</th>
                    <th className="py-3 px-4 pr-5 text-right w-[180px] sticky right-0 bg-slate-50 border-l border-slate-200">
                      Thao tác quản lý
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffSlaReports
                    .filter(s => slaStaffFilter === 'ALL' || s.role.toLowerCase().includes(slaStaffFilter.toLowerCase()) || s.team.toLowerCase().includes(slaStaffFilter.toLowerCase()))
                    .map(staff => {
                      const isNeedImprovement = staff.rating === 'Cần cải thiện';
                      return (
                        <tr key={staff.id} className={`hover:bg-slate-50/70 transition ${isNeedImprovement ? 'bg-rose-50/20' : ''}`}>
                          {/* Col 1: Staff Info */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-blue-500 text-white font-semibold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                {staff.avatar}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900 text-xs">{staff.staffName}</div>
                                <div className="text-2xs text-slate-500">{staff.role} • {staff.team}</div>
                              </div>
                            </div>
                          </td>

                          {/* Col 2: Assigned Brands */}
                          <td className="py-3.5 px-3">
                            <div className="flex flex-wrap gap-1">
                              {staff.assignedBrands.map(b => (
                                <span key={b} className="px-1.5 py-0.5 rounded text-2xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                  {b}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Col 3: Total Jobs */}
                          <td className="py-3.5 px-3 text-center">
                            <div className="font-semibold text-slate-900 text-xs">{staff.totalJobs}</div>
                            <div className="text-2xs text-slate-400">
                              {staff.onTimeJobs} đúng / {staff.breachedJobs} trễ
                            </div>
                          </td>

                          {/* Col 4: On-time Rate */}
                          <td className="py-3.5 px-3">
                            <div className="flex items-center justify-between text-xs font-semibold mb-1">
                              <span className={staff.onTimeRate >= 90 ? 'text-emerald-700' : 'text-rose-700'}>
                                {staff.onTimeRate}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${staff.onTimeRate >= 90 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                style={{ width: `${staff.onTimeRate}%` }}
                              />
                            </div>
                          </td>

                          {/* Col 5: SLA Score */}
                          <td className="py-3.5 px-3 text-center">
                            <span className="font-semibold text-slate-900 text-xs">{staff.currentScore}/100</span>
                            {staff.penaltyPoints < 0 && (
                              <span className="block text-2xs text-rose-600 font-semibold">
                                {staff.penaltyPoints}đ
                              </span>
                            )}
                          </td>

                          {/* Col 6: Active Violations */}
                          <td className="py-3.5 px-3 text-center">
                            {staff.activeViolationsCount > 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                                {staff.activeViolationsCount} vi phạm
                              </span>
                            ) : (
                              <span className="text-2xs text-emerald-600 font-medium">✓ Không</span>
                            )}
                          </td>

                          {/* Col 7: Rating */}
                          <td className="py-3.5 px-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-2xs font-semibold inline-block ${
                              staff.rating === 'Xuất sắc'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : staff.rating === 'Đạt chuẩn'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {staff.rating}
                            </span>
                          </td>

                          {/* Col 8: Actions */}
                          <td className="py-3.5 px-4 pr-5 text-right sticky right-0 bg-white/95 group-hover:bg-slate-50/95 transition border-l border-slate-200 shadow-[-3px_0_6px_rgba(0,0,0,0.03)]">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handlePingStaff(staff.staffName, 'Nhắc nhở xử lý vi phạm SLA B2C')}
                                className="px-2.5 py-1 text-2xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition flex items-center gap-1 shadow-2xs"
                                title="Gửi cảnh báo SLA qua Lark"
                              >
                                <Send className="w-3 h-3" />
                                <span>Ping cảnh báo</span>
                              </button>
                              <button
                                onClick={() => setInspectStaffModal(staff)}
                                className="px-2.5 py-1 text-2xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg transition flex items-center gap-1"
                                title="Xem chi tiết vi phạm"
                              >
                                <Eye className="w-3 h-3 text-blue-600" />
                                <span>Chi tiết</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Queue Vi Phạm SLA Cần Xử Lý & Leo Thang (Active Breaches Queue) */}
          <div className="card-enterprise overflow-hidden bg-white border border-slate-200 shadow-xs">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  Danh sách vi phạm SLA đang kích hoạt & cần Leo Thang
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tự động phát hiện vi phạm dựa trên 8 điểm SLA B2C • Kích hoạt cơ chế báo cáo Leader B2C / Growth / Account
                </p>
              </div>

              {/* Severity & Category Filters */}
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <select
                  value={slaSeverityFilter}
                  onChange={(e) => setSlaSeverityFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 text-xs focus:outline-none"
                >
                  <option value="ALL">Tất cả mức độ</option>
                  <option value="CRITICAL">Khẩn cấp (CRITICAL)</option>
                  <option value="HIGH">Nghiêm trọng (HIGH)</option>
                  <option value="WARNING">Cảnh báo (WARNING)</option>
                </select>

                <select
                  value={slaBreachCategoryFilter}
                  onChange={(e) => setSlaBreachCategoryFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 text-xs focus:outline-none max-w-[200px]"
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

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[1100px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <tr>
                    <th className="py-3 px-4 w-[180px]">Mã Deal & KOC</th>
                    <th className="py-3 px-3 w-[150px]">Nhãn hàng</th>
                    <th className="py-3 px-3 w-[260px]">Quy chuẩn vi phạm</th>
                    <th className="py-3 px-3 text-center w-[110px]">Mức độ</th>
                    <th className="py-3 px-3 w-[150px]">PIC & Vai Trò</th>
                    <th className="py-3 px-3 w-[170px]">Hạn SLA & quá hạn</th>
                    <th className="py-3 px-3 w-[170px]">Leo Thang (Escalation)</th>
                    <th className="py-3 px-4 pr-5 text-right w-[150px] sticky right-0 bg-slate-50 border-l border-slate-200">
                      Hành động xử lý
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {slaBreaches
                    .filter(b => {
                      const matchSeverity = slaSeverityFilter === 'ALL' || b.severity === slaSeverityFilter;
                      const matchCategory = slaBreachCategoryFilter === 'ALL' || b.category === slaBreachCategoryFilter;
                      return matchSeverity && matchCategory;
                    })
                    .map(breach => {
                      const isCritical = breach.severity === 'CRITICAL';
                      return (
                        <tr key={breach.id} className={`hover:bg-slate-50/70 transition ${isCritical ? 'bg-rose-50/30' : ''}`}>
                          {/* Col 1: Deal & KOC */}
                          <td className="py-3.5 px-4 font-medium">
                            <div className="font-semibold text-slate-900 text-xs">{breach.kocName}</div>
                            <div className="font-mono text-slate-500 text-2xs mt-0.5">{breach.dealCode}</div>
                          </td>

                          {/* Col 2: Brand */}
                          <td className="py-3.5 px-3">
                            <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                              {breach.brandName}
                            </span>
                          </td>

                          {/* Col 3: Category Label */}
                          <td className="py-3.5 px-3">
                            <div className="font-semibold text-slate-800 line-clamp-1" title={breach.categoryLabel}>
                              {breach.categoryLabel}
                            </div>
                            <div className="text-2xs text-slate-500 mt-0.5 line-clamp-1" title={breach.resolutionNotes}>
                              {breach.resolutionNotes || 'Đang theo dõi tự động trên hệ thống'}
                            </div>
                          </td>

                          {/* Col 4: Severity */}
                          <td className="py-3.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-2xs font-semibold inline-block ${
                              breach.severity === 'CRITICAL'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : breach.severity === 'HIGH'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-slate-100 text-slate-700 border border-slate-300'
                            }`}>
                              {breach.severity === 'CRITICAL' ? '● KHẨN CẤP' : breach.severity === 'HIGH' ? '▲ NGHIÊM TRỌNG' : '■ CẢNH BÁO'}
                            </span>
                          </td>

                          {/* Col 5: PIC */}
                          <td className="py-3.5 px-3">
                            <div className="font-semibold text-slate-900 text-xs">{breach.picName}</div>
                            <div className="text-2xs text-slate-500">{breach.picRole}</div>
                          </td>

                          {/* Col 6: SLA Deadline & Overdue Hours */}
                          <td className="py-3.5 px-3">
                            <div className="text-2xs text-slate-700 font-medium">{breach.slaDeadline}</div>
                            <div className="text-2xs text-rose-600 font-semibold mt-0.5 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                              <span>Quá hạn: {breach.hoursOverdue} giờ</span>
                            </div>
                          </td>

                          {/* Col 7: Escalation */}
                          <td className="py-3.5 px-3">
                            {breach.escalatedTo ? (
                              <div className="text-slate-800 font-semibold text-2xs flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                <span>{breach.escalatedTo}</span>
                              </div>
                            ) : (
                              <span className="text-2xs text-slate-400 italic">Nội bộ team</span>
                            )}
                          </td>

                          {/* Col 8: Actions */}
                          <td className="py-3.5 px-4 pr-5 text-right sticky right-0 bg-white/95 group-hover:bg-slate-50/95 transition border-l border-slate-200 shadow-[-3px_0_6px_rgba(0,0,0,0.03)]">
                            <button
                              onClick={() => setBreachActionModal(breach)}
                              className="px-2.5 py-1 text-2xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition shadow-2xs"
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
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span>
                Hiển thị <strong className="text-slate-800">{slaBreaches.length}</strong> cảnh báo vi phạm SLA
              </span>
              <div className="text-2xs text-slate-400">
                Cơ chế tự động đối soát SLA Upbase B2C • Cập nhật mỗi 15 phút
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Chỉnh Sửa Phân Bổ Chỉ Tiêu Theo 4 Tier Cho Nhân Sự */}
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 overflow-y-auto"
            onClick={() => setEditingAllocation(null)}
            role="dialog"
            aria-modal="true"
          >
            <div 
              className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-semibold border border-blue-200">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Phân Bổ Kế Hoạch 4 Tier — {currentPlan.monthLabel}</h3>
                    <p className="text-xs text-slate-500">{editingAllocation.staffName} • {editingAllocation.roleTitle}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingAllocation(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                  aria-label="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
                {/* Tier Quotas Grid inputs */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <LayersIcon className="w-3.5 h-3.5 text-blue-600" />
                      Phân bổ số video theo 4 Tier KOC / KOL
                    </span>
                    <span className="text-2xs text-blue-600 font-mono font-semibold">
                      Tổng: {calculatedVideos} clips
                    </span>
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Tier 1 */}
                    <div className="p-2.5 bg-rose-50/50 border border-rose-200 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-2xs font-semibold text-rose-800">Tier 1: Celeb / Mega</span>
                        <span className="text-2xs text-rose-600 font-mono">KL7 (&gt;25M)</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={editAllocForm.tier1Videos}
                        onChange={(e) => setEditAllocForm(prev => ({ ...prev, tier1Videos: Math.max(0, Number(e.target.value)) }))}
                        className="w-full bg-white border border-rose-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      />
                      <div className="flex items-center justify-between text-2xs text-slate-500 mt-1">
                        <span>Đã air: {editingAllocation.tier1Videos || 0}</span>
                        <span className={newTeamT1 > t1Ceiling ? 'text-rose-600 font-semibold' : 'text-slate-500'}>
                          Toàn phòng: {newTeamT1}/{t1Ceiling}
                        </span>
                      </div>
                    </div>

                    {/* Tier 2 */}
                    <div className="p-2.5 bg-blue-50/50 border border-blue-200 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-2xs font-semibold text-blue-800">Tier 2: Macro Creator</span>
                        <span className="text-2xs text-blue-600 font-mono">KL6 (10-25M)</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={editAllocForm.tier2Videos}
                        onChange={(e) => setEditAllocForm(prev => ({ ...prev, tier2Videos: Math.max(0, Number(e.target.value)) }))}
                        className="w-full bg-white border border-blue-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                      <div className="flex items-center justify-between text-2xs text-slate-500 mt-1">
                        <span>Đã air: {editingAllocation.tier2Videos || 0}</span>
                        <span className={newTeamT2 > t2Ceiling ? 'text-rose-600 font-semibold' : 'text-slate-500'}>
                          Toàn phòng: {newTeamT2}/{t2Ceiling}
                        </span>
                      </div>
                    </div>

                    {/* Tier 3 */}
                    <div className="p-2.5 bg-emerald-50/50 border border-emerald-200 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-2xs font-semibold text-emerald-800">Tier 3: Micro Creator</span>
                        <span className="text-2xs text-emerald-600 font-mono">KL4-KL5 (2.5-10M)</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={editAllocForm.tier3Videos}
                        onChange={(e) => setEditAllocForm(prev => ({ ...prev, tier3Videos: Math.max(0, Number(e.target.value)) }))}
                        className="w-full bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                      <div className="flex items-center justify-between text-2xs text-slate-500 mt-1">
                        <span>Đã air: {editingAllocation.tier3Videos || 0}</span>
                        <span className={newTeamT3 > t3Ceiling ? 'text-rose-600 font-semibold' : 'text-slate-500'}>
                          Toàn phòng: {newTeamT3}/{t3Ceiling}
                        </span>
                      </div>
                    </div>

                    {/* Tier 4 */}
                    <div className="p-2.5 bg-purple-50/50 border border-purple-200 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-2xs font-semibold text-purple-800">Tier 4: Nano & Affiliate</span>
                        <span className="text-2xs text-purple-600 font-mono">KL1-KL3 (&lt;2.5M)</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={editAllocForm.tier4Videos}
                        onChange={(e) => setEditAllocForm(prev => ({ ...prev, tier4Videos: Math.max(0, Number(e.target.value)) }))}
                        className="w-full bg-white border border-purple-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      />
                      <div className="flex items-center justify-between text-2xs text-slate-500 mt-1">
                        <span>Đã air: {editingAllocation.tier4Videos ?? editingAllocation.reportVideos}</span>
                        <span className={newTeamT4 > t4Ceiling ? 'text-rose-600 font-semibold' : 'text-slate-500'}>
                          Toàn phòng: {newTeamT4}/{t4Ceiling}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Warning banner if exceeding any tier ceiling */}
                  {(newTeamT1 > t1Ceiling || newTeamT2 > t2Ceiling || newTeamT3 > t3Ceiling || newTeamT4 > t4Ceiling) && (
                    <div className="mt-2.5 p-2 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-2xs">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
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
                    <label className="text-slate-700 font-semibold">Ngân sách phân bổ (VND)</label>
                    <button
                      type="button"
                      onClick={() => setEditAllocForm(prev => ({ ...prev, planBudget: suggestedBudget }))}
                      className="text-2xs text-blue-600 hover:text-blue-700 font-medium underline transition flex items-center gap-1"
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
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <div className="flex items-center justify-between text-2xs text-slate-500 mt-1">
                    <span>Đã giải ngân thực tế: {editingAllocation.reportBudget.toLocaleString('vi-VN')} đ</span>
                    <span className="text-slate-500">Đơn giá TB ước tính: {calculatedVideos > 0 ? Math.round(editAllocForm.planBudget / calculatedVideos).toLocaleString('vi-VN') : 0} đ/clip</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Target GMV (VND)</label>
                    <input
                      type="number"
                      step="1000000"
                      value={editAllocForm.targetGmv}
                      onChange={(e) => setEditAllocForm(prev => ({ ...prev, targetGmv: Number(e.target.value) }))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Chỉ tiêu tuyển KOC mới</label>
                    <input
                      type="number"
                      value={editAllocForm.targetNewKocs}
                      onChange={(e) => setEditAllocForm(prev => ({ ...prev, targetNewKocs: Number(e.target.value) }))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-slate-700 font-semibold">
                      Nhãn hàng / Brand phụ trách
                    </label>
                    <span className="text-2xs text-slate-500 font-medium">
                      Đã gán {(editAllocForm.assignedBrands || '').split(',').map(b => b.trim()).filter(Boolean).length} nhãn hàng
                    </span>
                  </div>

                  {/* Active selected brand tags */}
                  <div className="flex flex-wrap gap-1.5 min-h-[38px] p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    {(() => {
                      const list = (editAllocForm.assignedBrands || '').split(',').map(b => b.trim()).filter(Boolean);
                      if (list.length === 0) {
                        return (
                          <span className="text-slate-400 text-xs italic py-1 px-1">
                            Chưa gán nhãn hàng nào. Hãy chọn từ danh mục Master Data bên dưới.
                          </span>
                        );
                      }
                      return list.map(brandName => (
                        <span
                          key={brandName}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-100/80 text-blue-900 border border-blue-200 text-xs font-semibold shadow-2xs"
                        >
                          <span>{brandName}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = list.filter(b => b !== brandName);
                              setEditAllocForm(prev => ({ ...prev, assignedBrands: updated.join(', ') }));
                            }}
                            className="w-4 h-4 rounded hover:bg-blue-200 text-blue-700 flex items-center justify-center transition cursor-pointer"
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
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                  <label className="block text-slate-700 font-semibold mb-1">Ghi chú chỉ đạo nghiệp vụ của trưởng phòng</label>
                  <textarea
                    rows={2}
                    value={editAllocForm.managerNote}
                    onChange={(e) => setEditAllocForm(prev => ({ ...prev, managerNote: e.target.value }))}
                    placeholder="Ghi chú điều phối tiến độ, ưu tiên nhóm Tier hoặc nhắc nhở deadline..."
                    className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200 bg-slate-50">
                <button
                  onClick={() => setEditingAllocation(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleSaveAlloc}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu phân bổ</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: Cấu Hình Hạn Mức 4 Tier Toàn Phòng (Top-Down Quota Configuration) */}
      {isTierQuotaModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 overflow-y-auto"
          onClick={() => setIsTierQuotaModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div 
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-semibold border border-blue-200">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Cấu Hình Hạn Mức 4 Tier KOC / KOL — {currentPlan.monthLabel}</h3>
                  <p className="text-xs text-slate-500">Thiết lập trần video & ngân sách toàn phòng trước khi phân bổ cho nhân viên</p>
                </div>
              </div>
              <button 
                onClick={() => setIsTierQuotaModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs">
                <strong>Nguyên tắc quản trị Top-Down:</strong> Trưởng phòng chốt tổng ngân sách và trần video cho 4 Tier. Sau đó hệ thống sẽ dùng các mốc này để kiểm soát cân đối khi phân bổ xuống 26 nhân sự.
              </div>

              <div className="space-y-3">
                {editTierForm.map((tier, idx) => {
                  const calculatedAvg = tier.targetVideos > 0 ? Math.round(tier.totalBudget / tier.targetVideos) : 0;
                  return (
                    <div key={tier.tierId} className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-600" />
                          <span className="font-semibold text-slate-900 text-xs">{tier.tierName}</span>
                          <span className="px-2 py-0.5 rounded text-2xs bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                            {tier.klRange}
                          </span>
                        </div>
                        <span className="text-2xs text-slate-500">
                          Đơn giá TB: <strong className="text-slate-900 font-mono">{(calculatedAvg / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}M đ/clip</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-2xs text-slate-600 mb-1 font-medium">Trần số video</label>
                          <input
                            type="number"
                            min="0"
                            value={tier.targetVideos}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value));
                              setEditTierForm(prev => prev.map((t, i) => i === idx ? { ...t, targetVideos: val } : t));
                            }}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-2xs text-slate-600 mb-1 font-medium">Trần ngân sách (VND)</label>
                          <input
                            type="number"
                            min="0"
                            step="10000000"
                            value={tier.totalBudget}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value));
                              setEditTierForm(prev => prev.map((t, i) => i === idx ? { ...t, totalBudget: val } : t));
                            }}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-2xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Total Summary */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-600">Tổng trần video tháng:</span>
                  <span className="ml-2 font-semibold text-slate-900 font-mono">
                    {editTierForm.reduce((sum, t) => sum + (t.targetVideos || 0), 0).toLocaleString('vi-VN')} clips
                  </span>
                </div>
                <div>
                  <span className="text-slate-600">Tổng trần ngân sách:</span>
                  <span className="ml-2 font-semibold text-blue-700 font-mono">
                    {editTierForm.reduce((sum, t) => sum + (t.totalBudget || 0), 0).toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setIsTierQuotaModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 transition"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveTierQuota}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu hạn mức tháng</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
      {inspectStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-semibold flex items-center justify-center text-sm shadow-xs">
                  {inspectStaffModal.avatar}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">
                    Báo Cáo Chi tiết SLA — {inspectStaffModal.staffName}
                  </h3>
                  <p className="text-xs text-slate-500">{inspectStaffModal.role} • {inspectStaffModal.team}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectStaffModal(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs">
              {/* Scorecard row */}
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-2xs text-slate-500 block">Tổng Jobs</span>
                  <span className="text-lg font-semibold text-slate-900">{inspectStaffModal.totalJobs}</span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-2xs text-emerald-700 block">Đúng hạn</span>
                  <span className="text-lg font-semibold text-emerald-700">{inspectStaffModal.onTimeJobs}</span>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                  <span className="text-2xs text-rose-700 block">Vi phạm trễ</span>
                  <span className="text-lg font-semibold text-rose-700">{inspectStaffModal.breachedJobs}</span>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <span className="text-2xs text-blue-700 block">Điểm KPI SLA</span>
                  <span className="text-lg font-semibold text-blue-700">{inspectStaffModal.currentScore}/100</span>
                </div>
              </div>

              {/* Vi Phạm Chi tiết */}
              <div>
                <h4 className="font-semibold text-slate-800 text-xs mb-2 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  Danh sách vi phạm quy chuẩn đang ghi nhận:
                </h4>
                {inspectStaffModal.violations.length === 0 ? (
                  <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-center font-medium border border-emerald-200">
                    ✓ Nhân sự hoàn thành 100% công việc đúng hạn, không có vi phạm nào.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {inspectStaffModal.violations.map((v, i) => (
                      <div key={i} className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-rose-900 text-xs">{v.categoryLabel}</span>
                          <span className="text-2xs font-semibold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                            Quá hạn {v.hoursOverdue}h
                          </span>
                        </div>
                        <div className="text-2xs text-slate-600 flex items-center gap-2">
                          <span>Deal: <strong>{v.dealCode}</strong></span>
                          <span>•</span>
                          <span>KOC: <strong>{v.kocName}</strong></span>
                          <span>•</span>
                          <span>Brand: <strong>{v.brandName}</strong></span>
                        </div>
                        <p className="text-2xs text-rose-700 italic">
                          {v.resolutionNotes}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => {
                  handlePingStaff(inspectStaffModal.staffName, 'Yêu cầu giải trình vi phạm SLA B2C');
                  setInspectStaffModal(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-xl transition flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gửi Ping nhắc nhở Qua Lark</span>
              </button>
              <button
                onClick={() => setInspectStaffModal(null)}
                className="px-5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Xử Lý Vi Phạm SLA */}
      {breachActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">Xử lý & Leo Thang vi phạm SLA</h3>
                  <p className="text-2xs text-rose-700 font-semibold">{breachActionModal.dealCode} • {breachActionModal.kocName}</p>
                </div>
              </div>
              <button onClick={() => setBreachActionModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-semibold text-slate-800">{breachActionModal.categoryLabel}</div>
                <div className="text-slate-600">Hạn chót: <strong>{breachActionModal.slaDeadline}</strong></div>
                <div className="text-rose-600 font-semibold">Số giờ quá hạn: {breachActionModal.hoursOverdue} giờ</div>
                <div className="text-slate-500">PIC chịu trách nhiệm: <strong>{breachActionModal.picName} ({breachActionModal.picRole})</strong></div>
                {breachActionModal.escalatedTo && (
                  <div className="text-indigo-600 font-semibold">Đã leo thang tới: <strong>{breachActionModal.escalatedTo}</strong></div>
                )}
              </div>

              {/* Action Buttons depending on Category */}
              <div className="space-y-2">
                <span className="font-semibold text-slate-700 block">Thao tác can thiệp của Quản lý:</span>
                
                {breachActionModal.category === 'BRAND_ORIENTATION_AUTO_AIR' && (
                  <button
                    onClick={() => handleResolveBreach(breachActionModal.id, 'Quản lý đã phê duyệt Tự Air do Brand quá hạn 3 ngày theo quy chế SLA B2C.')}
                    className="w-full p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Phê duyệt đề xuất tự Air</span>
                  </button>
                )}

                {breachActionModal.category === 'CONTRACT_OVER_9M_INVALID' && (
                  <button
                    onClick={() => handleResolveBreach(breachActionModal.id, 'Đã yêu cầu chuyên viên nộp bổ sung bản Scan HĐ và CCCD trước 17:00.')}
                    className="w-full p-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <FileCheck className="w-4 h-4" />
                    <span>Yêu cầu bổ Sung bản Scan ký 2 bên & CCCD</span>
                  </button>
                )}

                {breachActionModal.category === 'DATA_LOCKED_7_WORKING_DAYS' && (
                  <button
                    onClick={() => handleResolveBreach(breachActionModal.id, 'Leader đã xác nhận giải trình và mở khóa tạm 24h để chuyên viên điền link.')}
                    className="w-full p-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
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
                  className="w-full p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl transition flex items-center justify-center gap-2 border border-slate-300"
                >
                  <Send className="w-4 h-4 text-blue-600" />
                  <span>Ping Lark nhắc PIC xử lý ngay</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Staff Review Modal (API Powered) */}
      {aiReviewTargetStaff && (
        <AiStaffReviewModal
          isOpen={Boolean(aiReviewTargetStaff)}
          onClose={() => setAiReviewTargetStaff(null)}
          initialStaffName={aiReviewTargetStaff === 'ALL' ? undefined : aiReviewTargetStaff}
          onPingStaffNotification={handlePingStaff}
        />
      )}

    </div>
  );
};

