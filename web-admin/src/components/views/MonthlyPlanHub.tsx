'use client';

import React, { useState, useMemo } from 'react';
import { Stat, StatRow, ChannelBar, Progress, Avatar } from '../ui';
import { formatVndShort } from '../../lib/format';
import {
  Calendar,
  Layers,
  Calculator,
  DollarSign,
  Video,
  TrendingUp,
  Plus,
  Search,
  Filter,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  ChevronRight,
  BarChart3,
  Users,
  Building2,
  Sparkles,
  Dices,
  Eye,
  SlidersHorizontal,
  Table as TableIcon,
  LayoutGrid,
  Send,
  X,
  Check,
  RefreshCw,
  MessageSquare,
  ShieldCheck,
  BadgeCheck,
  AlertTriangle,
  Store,
  CheckSquare,
  Square,
  ToggleLeft,
  ToggleRight,
  FileText,
  FileCheck,
  SendHorizonal,
  Clock3,
  Bell,
  Zap,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { 
  InputPlanBreakdownState, 
  MonthlyPlanStatus, 
  PlanDiscussionMessage,
  UserProfile,
  StorePortfolioItem 
} from '../../lib/types';
import { AVAILABLE_MONTHS } from '../../lib/monthlyPlanData';
import { autoBalancePlanItems, INITIAL_INPUT_PLAN_ITEMS } from '../../lib/inputPlanDefaults';
import { INITIAL_STORE_PORTFOLIOS } from '../../lib/mockData';
import { PlanHistoryModal } from './PlanHistoryModal';

interface StoreGovernanceItem {
  store: StorePortfolioItem;
  isB2c: boolean;
  plan: InputPlanBreakdownState | null;
  hasPlan: boolean;
  status: MonthlyPlanStatus | 'MISSING';
}

interface MonthlyPlanHubProps {
  plans: InputPlanBreakdownState[];
  storePortfolios?: StorePortfolioItem[];
  onSelectPlan: (plan: InputPlanBreakdownState) => void;
  onCreatePlan: (newPlan: InputPlanBreakdownState) => void;
  onClonePlan: (sourcePlan: InputPlanBreakdownState, targetMonth: string) => void;
  onUpdatePlanStatus?: (planId: string, newStatus: MonthlyPlanStatus, logMessage?: string, note?: string) => void;
  onSendMessage?: (planId: string, msg: Omit<PlanDiscussionMessage, 'id' | 'timestamp'>) => void;
  onUpdateStore?: (store: StorePortfolioItem) => void;
  currentUser?: UserProfile;
  onNotify?: (msg: string) => void;
}

export const MonthlyPlanHub: React.FC<MonthlyPlanHubProps> = ({
  plans,
  storePortfolios,
  onSelectPlan,
  onCreatePlan,
  onClonePlan,
  onUpdatePlanStatus,
  onSendMessage,
  onUpdateStore,
  currentUser,
  onNotify
}) => {
  // Selected Month filter
  const [selectedMonth, setSelectedMonth] = useState<string>('2026/10');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPic, setSelectedPic] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  // Hub View Mode: 'STORE_GOVERNANCE' (Quản trị trạng thái gửi duyệt plan theo tháng trên gian hàng active) vs 'PLAN_CATALOG' (Danh sách plan)
  const [activeHubTab, setActiveHubTab] = useState<'STORE_GOVERNANCE' | 'PLAN_CATALOG'>('STORE_GOVERNANCE');

  // Lọc cho Ma Trận Gian Hàng
  const [storeGovernanceFilter, setStoreGovernanceFilter] = useState<'ALL' | 'B2C_ONLY' | 'MISSING_PLAN' | 'PENDING_APPROVAL' | 'APPROVED' | 'EXEMPT'>('ALL');
  const [storeSearchQuery, setStoreSearchQuery] = useState<string>('');

  // Danh bạ gian hàng có hiệu lực
  const effectiveStores = useMemo<StorePortfolioItem[]>(() => {
    return (storePortfolios && storePortfolios.length > 0) ? storePortfolios : INITIAL_STORE_PORTFOLIOS;
  }, [storePortfolios]);

  // Các gian hàng Active
  const activeStores = useMemo<StorePortfolioItem[]>(() => {
    return effectiveStores.filter((s: StorePortfolioItem) => s.accountStatus === 'ACTIVE');
  }, [effectiveStores]);

  // Helper matching store và plan
  const findPlanForStore = (store: StorePortfolioItem, month: string): InputPlanBreakdownState | null => {
    return plans.find(p => {
      const matchMonth = month === 'ALL' || p.month === month;
      if (!matchMonth) return false;
      if (p.storeId && p.storeId === store.id) return true;
      if (p.storeName && p.storeName.trim().toLowerCase() === store.storeName.trim().toLowerCase()) return true;
      
      const b1 = (p.brandName || '').toLowerCase();
      const b2 = (store.brandName || '').toLowerCase();
      return b1.length >= 2 && b2.length >= 2 && (b1.includes(b2) || b2.includes(b1));
    }) || null;
  };

  // Ma trận từng gian hàng và plan trong tháng
  const storeGovernanceList = useMemo<StoreGovernanceItem[]>(() => {
    return activeStores.map((store: StorePortfolioItem) => {
      const isB2c = store.isB2cManaged !== false && store.requiresB2cPlan !== false;
      const plan = findPlanForStore(store, selectedMonth);
      return {
        store,
        isB2c,
        plan,
        hasPlan: !!plan,
        status: (plan?.status || 'MISSING') as MonthlyPlanStatus | 'MISSING',
      };
    });
  }, [activeStores, selectedMonth, plans]);

  // Bộ chỉ số KPI Quản Trị Gửi Duyệt Plan Theo Tháng
  const governanceStats = useMemo(() => {
    const totalActive = activeStores.length;
    const b2cList = storeGovernanceList.filter((item: StoreGovernanceItem) => item.isB2c);
    const exemptList = storeGovernanceList.filter((item: StoreGovernanceItem) => !item.isB2c);

    const totalB2cManaged = b2cList.length;
    const totalExempt = exemptList.length;

    const withPlan = b2cList.filter((item: StoreGovernanceItem) => item.hasPlan);
    const missingPlan = b2cList.filter((item: StoreGovernanceItem) => !item.hasPlan);

    const approved = b2cList.filter((item: StoreGovernanceItem) => item.plan && ['LEAD_APPROVED', 'BRAND_APPROVED', 'APPROVED', 'IN_EXECUTION', 'COMPLETED'].includes(item.plan.status || ''));
    const pendingApproval = b2cList.filter((item: StoreGovernanceItem) => item.plan && item.plan.status === 'PENDING_APPROVAL');
    const pendingPreApproval = b2cList.filter((item: StoreGovernanceItem) => item.plan && (item.plan.status === 'PENDING_PRE_APPROVAL' || item.plan.status === 'PRE_APPROVED'));
    const revisionRequested = b2cList.filter((item: StoreGovernanceItem) => item.plan && item.plan.status === 'REVISION_REQUESTED');
    const draft = b2cList.filter((item: StoreGovernanceItem) => item.plan && (item.plan.status === 'DRAFT' || !item.plan.status));

    const coveragePct = totalB2cManaged > 0 ? Math.round((withPlan.length / totalB2cManaged) * 100) : 0;
    const approvedPct = totalB2cManaged > 0 ? Math.round((approved.length / totalB2cManaged) * 100) : 0;

    return {
      totalActive,
      totalB2cManaged,
      totalExempt,
      countWithPlan: withPlan.length,
      countMissingPlan: missingPlan.length,
      countApproved: approved.length,
      countPendingApproval: pendingApproval.length,
      countPendingPreApproval: pendingPreApproval.length,
      countRevisionRequested: revisionRequested.length,
      countDraft: draft.length,
      coveragePct,
      approvedPct
    };
  }, [activeStores, storeGovernanceList]);

  // Lọc danh sách ma trận gian hàng
  const filteredStoreGovernance = useMemo<StoreGovernanceItem[]>(() => {
    return storeGovernanceList.filter((item: StoreGovernanceItem) => {
      // Filter scope
      if (storeGovernanceFilter === 'B2C_ONLY' && !item.isB2c) return false;
      if (storeGovernanceFilter === 'EXEMPT' && item.isB2c) return false;
      if (storeGovernanceFilter === 'MISSING_PLAN' && (!item.isB2c || item.hasPlan)) return false;
      if (storeGovernanceFilter === 'PENDING_APPROVAL' && (!item.plan || item.plan.status !== 'PENDING_APPROVAL')) return false;
      if (storeGovernanceFilter === 'APPROVED' && (!item.plan || !['LEAD_APPROVED', 'BRAND_APPROVED', 'APPROVED', 'IN_EXECUTION', 'COMPLETED'].includes(item.plan.status || ''))) return false;

      // Search query
      if (storeSearchQuery.trim()) {
        const q = storeSearchQuery.toLowerCase();
        const sName = (item.store.storeName || '').toLowerCase();
        const bName = (item.store.brandName || '').toLowerCase();
        const pOwner = (item.store.b2cOwnerName || '').toLowerCase();
        const pPlatform = (item.store.platform || '').toLowerCase();
        if (!sName.includes(q) && !bName.includes(q) && !pOwner.includes(q) && !pPlatform.includes(q)) return false;
      }
      return true;
    });
  }, [storeGovernanceList, storeGovernanceFilter, storeSearchQuery]);

  // Xử lý Toggle "Marketing B2C Phụ Trách & Cần Làm Plan"
  const handleToggleB2cManaged = (store: StorePortfolioItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentVal = store.isB2cManaged !== false && store.requiresB2cPlan !== false;
    const nextVal = !currentVal;
    const updatedStore: StorePortfolioItem = {
      ...store,
      isB2cManaged: nextVal,
      requiresB2cPlan: nextVal
    };
    if (onUpdateStore) {
      onUpdateStore(updatedStore);
    }
    notify(
      nextVal
        ? `Đã BẬT: Gian hàng "${store.storeName}" thuộc diện Marketing B2C phụ trách & CẦN LÀM PLAN!`
        : `Đã TẮT: Gian hàng "${store.storeName}" chuyển sang diện MIỄN TRỪ Plan B2C (Brand tự vận hành/Ads nội sàn).`
    );
  };

  // Quản lý phê duyệt nhanh 1 click
  const handleQuickApprovePlan = (planId: string, storeName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUpdatePlanStatus) {
      onUpdatePlanStatus(
        planId,
        'LEAD_APPROVED',
        `Quản lý / Trưởng phòng (${currentUser?.name || 'Lead'}) đã DUYỆT NHANH Kế hoạch gian hàng ${storeName} trên Dashboard Quản trị.`,
        'Phê duyệt nhanh trên Dashboard Quản trị Gửi duyệt theo tháng.'
      );
    }
    notify(`Đã phê duyệt thành công Kế hoạch cho gian hàng "${storeName}"!`);
  };

  // Tạo nhanh kế hoạch cho gian hàng
  const handleCreatePlanForStore = (store: StorePortfolioItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setNewPlanMonth(selectedMonth === 'ALL' ? '2026/10' : selectedMonth);
    setNewPlanBrand(store.brandName);
    setNewPlanTitle(`Kế Hoạch B2C ${selectedMonth === 'ALL' ? '2026/10' : selectedMonth} - ${store.storeName}`);
    setNewPlanPic(store.b2cOwners?.[0] || store.b2cOwnerName || currentUser?.name || 'Khánh Vy');
    setNewPlanBudget(store.monthlyBudget || 120000000);
    setNewPlanGmv(store.monthlyTargetGmv || 800000000);
    setIsCreateModalOpen(true);
  };

  // Nhắc nhở nộp plan
  const handleRemindSubmission = (store: StorePortfolioItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const pic = store.b2cOwners?.[0] || store.b2cOwnerName || 'Chuyên viên phụ trách B2C';
    notify(`Đã gửi thông báo tự động đôn đốc gửi duyệt Plan tháng ${selectedMonth} tới ${pic} (Gian hàng: ${store.storeName}) qua Lark!`);
  };

  // Modal State for New Plan
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPlanMonth, setNewPlanMonth] = useState('2026/10');
  const [newPlanWeek, setNewPlanWeek] = useState('W42 [12.10 - 18.10]');
  const [newPlanBrand, setNewPlanBrand] = useState('Cỏ Mềm');
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [newPlanPic, setNewPlanPic] = useState(currentUser?.name || 'Đặng Mai Hà Linh');
  const [newPlanBudget, setNewPlanBudget] = useState(150000000);
  const [newPlanQty, setNewPlanQty] = useState(75);
  const [newPlanGmv, setNewPlanGmv] = useState(900000000);
  const [newPlanPreset, setNewPlanPreset] = useState<'BALANCED' | 'GMV_MAX' | 'BRAND_PUSH' | 'COST_SAVER' | 'MEGA_SALE'>('BALANCED');
  const [newPlanNotes, setNewPlanNotes] = useState('');

  // Modal State for Clone Plan
  const [cloningPlan, setCloningPlan] = useState<InputPlanBreakdownState | null>(null);
  const [cloneTargetMonth, setCloneTargetMonth] = useState('2026/11');

  // Modal State for History & Discussions
  const [historyPlanId, setHistoryPlanId] = useState<string | null>(null);
  const viewingHistoryPlan = plans.find(p => p.id === historyPlanId) || null;

  const notify = (msg: string) => {
    if (onNotify) onNotify(msg);
  };

  // Distinct Brands & PICs for filters
  const brandList = useMemo(() => {
    const set = new Set<string>();
    plans.forEach(p => set.add(p.brandName));
    return Array.from(set);
  }, [plans]);

  const picList = useMemo(() => {
    const set = new Set<string>();
    plans.forEach(p => set.add(p.pic));
    return Array.from(set);
  }, [plans]);

  // Filtered Plans
  const filteredPlans = useMemo(() => {
    return plans.filter(p => {
      // Month
      if (selectedMonth !== 'ALL' && p.month !== selectedMonth) return false;
      // Brand
      if (selectedBrand !== 'ALL' && p.brandName !== selectedBrand) return false;
      // Status
      if (selectedStatus !== 'ALL' && p.status !== selectedStatus) return false;
      // PIC
      if (selectedPic !== 'ALL' && p.pic !== selectedPic) return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchBrand = p.brandName.toLowerCase().includes(q);
        const matchPic = p.pic.toLowerCase().includes(q);
        const matchId = p.id.toLowerCase().includes(q);
        if (!matchTitle && !matchBrand && !matchPic && !matchId) return false;
      }
      return true;
    });
  }, [plans, selectedMonth, selectedBrand, selectedStatus, selectedPic, searchQuery]);

  // Monthly KPI Aggregates for current selected month
  const monthlyMetrics = useMemo(() => {
    const targetPool = selectedMonth === 'ALL' 
      ? plans 
      : plans.filter(p => p.month === selectedMonth);

    const totalBudget = targetPool.reduce((acc, p) => acc + (p.totalTargetBudget || 0), 0);
    const totalGmv = targetPool.reduce((acc, p) => acc + (p.targetGmv || 0), 0);
    const totalContents = targetPool.reduce((acc, p) => acc + (p.totalTargetContents || 0), 0);
    const avgRoi = totalBudget > 0 ? (totalGmv / totalBudget).toFixed(1) : '0';

    const countExecuting = targetPool.filter(p => p.status === 'IN_EXECUTION').length;
    const countApproved = targetPool.filter(p => ['LEAD_APPROVED', 'BRAND_APPROVED', 'APPROVED'].includes(p.status || '')).length;
    const countPreApproval = targetPool.filter(p => p.status === 'PENDING_PRE_APPROVAL').length;
    const countPreApproved = targetPool.filter(p => p.status === 'PRE_APPROVED').length;
    const countRevision = targetPool.filter(p => p.status === 'REVISION_REQUESTED').length;
    const countPending = targetPool.filter(p => p.status === 'PENDING_APPROVAL').length;
    const countDraft = targetPool.filter(p => p.status === 'DRAFT' || !p.status).length;
    const countCompleted = targetPool.filter(p => p.status === 'COMPLETED').length;

    return {
      planCount: targetPool.length,
      totalBudget,
      totalGmv,
      totalContents,
      avgRoi,
      countExecuting,
      countApproved,
      countPreApproval,
      countPreApproved,
      countRevision,
      countPending,
      countDraft,
      countCompleted
    };
  }, [plans, selectedMonth]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const balancedItems = autoBalancePlanItems(
      INITIAL_INPUT_PLAN_ITEMS,
      newPlanBudget,
      newPlanQty,
      newPlanPreset
    );

    const createdPlan: InputPlanBreakdownState = {
      id: `PLAN-${newPlanMonth.replace('/', '-')}-${Date.now().toString().slice(-4)}`,
      title: newPlanTitle || `Kế Hoạch B2C ${newPlanMonth} - ${newPlanBrand} (${newPlanPreset})`,
      brandName: newPlanBrand,
      month: newPlanMonth,
      week: newPlanWeek,
      pic: newPlanPic,
      growthPic: 'Trần Thị Ánh (Growth Manager)',
      totalTargetBudget: newPlanBudget,
      totalTargetContents: newPlanQty,
      targetGmv: newPlanGmv,
      cancellationRate: 0.08,
      strategyPreset: newPlanPreset,
      status: 'DRAFT',
      statusLabel: 'Bản Nháp (Đang Lập)',
      spentBudget: 0,
      deliveredContents: 0,
      actualGmv: 0,
      notes: newPlanNotes || `Kế hoạch khởi tạo cho chu kỳ ${newPlanMonth}.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: balancedItems,
      discussions: [
        {
          id: `DISC-${Date.now()}`,
          authorName: newPlanPic,
          authorRole: 'BOOKING',
          authorTitle: 'Booking Specialist PIC',
          content: `Khởi tạo kế hoạch tháng ${newPlanMonth} với ngân sách trần ${(newPlanBudget / 1000000).toLocaleString('vi-VN')} Tr đ, dự kiến ${newPlanQty} nội dung. Đang tiến hành phân rã 4 kênh.`,
          type: 'COMMENT',
          timestamp: new Date().toISOString(),
          tags: ['Khởi Tạo', 'Ngân Sách']
        }
      ]
    };

    onCreatePlan(createdPlan);
    notify(`Đã khởi tạo Kế hoạch mới "${createdPlan.title}" cho chu kỳ ${newPlanMonth}!`);
    setIsCreateModalOpen(false);
    // Optionally open the studio right away
    onSelectPlan(createdPlan);
  };

  const handleCloneSubmit = () => {
    if (!cloningPlan) return;
    onClonePlan(cloningPlan, cloneTargetMonth);
    notify(`Đã nhân bản thành công Kế hoạch "${cloningPlan.title}" sang chu kỳ ${cloneTargetMonth}!`);
    setCloningPlan(null);
  };

  const getStatusBadge = (status?: MonthlyPlanStatus) => {
    switch (status) {
      case 'PENDING_PRE_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Chờ sơ duyệt
          </span>
        );
      case 'PRE_APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
            <BadgeCheck className="w-3.5 h-3.5 text-teal-600" />
            Sơ Duyệt Đạt
          </span>
        );
      case 'REVISION_REQUESTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            Cần hiệu chỉnh
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            Chờ duyệt Lead
          </span>
        );
      case 'LEAD_APPROVED':
      case 'BRAND_APPROVED':
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Đã Phê Duyệt
          </span>
        );
      case 'IN_EXECUTION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Đang Thực Thi
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Check className="w-3.5 h-3.5 text-purple-600" />
            Đã nghiệm thu
          </span>
        );
      case 'DRAFT':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Bản Nháp
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Thao tác chính */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-ink-3">Chọn một kế hoạch để mở bảng phân rã chi tiết.</p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-md bg-primary hover:bg-primary-hover text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
              Tạo kế hoạch
            </button>
            <button
              onClick={() => {
                const brands = ['Cocoon', 'Fresh_TikTok_E2E-C', 'Senka_TikTok_E2E-C', 'Lemonade', 'Cỏ Mềm'];
                const b = brands[Math.floor(Math.random() * brands.length)];
                const newPlan: InputPlanBreakdownState = {
                  id: `PLAN-${selectedMonth === 'ALL' ? '2026-10' : selectedMonth.replace('/', '-')}-${Date.now().toString().slice(-4)}`,
                  title: `Kế Hoạch Test Nhanh - ${b} (${selectedMonth === 'ALL' ? '2026/10' : selectedMonth})`,
                  brandName: b,
                  month: selectedMonth === 'ALL' ? '2026/10' : selectedMonth,
                  week: 'W42 [12.10 - 18.10]',
                  pic: currentUser?.name || 'Đặng Mai Hà Linh',
                  totalTargetBudget: 120000000,
                  totalTargetContents: 65,
                  targetGmv: 780000000,
                  cancellationRate: 0.08,
                  strategyPreset: 'BALANCED',
                  status: 'DRAFT',
                  statusLabel: 'Bản Nháp (Đang Lập)',
                  spentBudget: 0,
                  deliveredContents: 0,
                  actualGmv: 0,
                  notes: 'Kế hoạch sinh ngẫu nhiên để kiểm thử.',
                  createdAt: new Date().toISOString(),
                  items: autoBalancePlanItems(INITIAL_INPUT_PLAN_ITEMS, 120000000, 65, 'BALANCED')
                };
                onCreatePlan(newPlan);
                notify(`Đã tạo nhanh kế hoạch mẫu "${newPlan.title}"!`);
              }}
              className="btn-md text-ink-2 hover:bg-sunken hover:text-ink transition-colors"
              title="Tạo một kế hoạch mẫu ngẫu nhiên để thử"
            >
              <Dices className="w-4 h-4 text-ink-3" />
              Tạo kế hoạch mẫu
            </button>
          </div>
      </div>

      {/* 2. BỘ CHỌN CHU KỲ THÁNG (MONTH TABS) */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {AVAILABLE_MONTHS.map(m => {
            const isSelected = selectedMonth === m.value;
            const countInMonth = m.value === 'ALL' 
              ? plans.length 
              : plans.filter(p => p.month === m.value).length;

            return (
              <button
                key={m.value}
                onClick={() => setSelectedMonth(m.value)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md '
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Calendar className={`w-4 h-4 ${isSelected ? 'text-amber-300' : 'text-slate-400'}`} />
                <span>{m.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {countInMonth}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-500">
          <span>Chu kỳ:</span>
          <span className="font-semibold text-slate-800">
            {selectedMonth === 'ALL' ? 'Toàn bộ các tháng' : selectedMonth}
          </span>
        </div>
      </div>

      {/* 3. EXECUTIVE PLAN SUBMISSION GOVERNANCE DASHBOARD */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-semibold shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Dashboard Quản Trị Gửi Duyệt Kế Hoạch B2C</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Chu kỳ: {selectedMonth === 'ALL' ? 'Toàn bộ các tháng' : selectedMonth}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Giám sát tiến độ lập & gửi duyệt plan trên toàn bộ các gian hàng Active. Gian hàng được tích chọn "Marketing B2C phụ trách" là đối tượng bắt buộc phải có plan được duyệt trước khi giải ngân.
                </p>
              </div>
            </div>
          </div>

          {/* Quick status counters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Đã duyệt: {governanceStats.countApproved}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Chờ quản lý duyệt: {governanceStats.countPendingApproval}</span>
            </span>
            {governanceStats.countMissingPlan > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Chưa có plan: {governanceStats.countMissingPlan}</span>
              </span>
            )}
          </div>
        </div>

        {/* 6 KPI CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* KPI 1: Tổng gian hàng Active */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Gian Hàng Active</span>
              <Store className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight">{governanceStats.totalActive}</span>
              <span className="text-xs text-slate-400 ml-1">shop</span>
            </div>
            <div className="text-2xs text-slate-500 mt-1 font-medium">
              Toàn hệ sinh thái UpBase
            </div>
          </div>

          {/* KPI 2: B2C Phụ Trách & Cần Làm Plan */}
          <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 flex flex-col justify-between">
            <div className="flex items-center justify-between text-indigo-700 text-xs font-semibold">
              <span>B2C Cần Làm Plan</span>
              <CheckSquare className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-indigo-900 tracking-tight">{governanceStats.totalB2cManaged}</span>
              <span className="text-xs text-indigo-500 ml-1">/ {governanceStats.totalActive}</span>
            </div>
            <div className="text-2xs text-indigo-600/80 mt-1">
              {governanceStats.totalExempt} shop miễn trừ plan
            </div>
          </div>

          {/* KPI 3: Đã Có Plan Tháng */}
          <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 flex flex-col justify-between">
            <div className="flex items-center justify-between text-blue-700 text-xs font-semibold">
              <span>Đã Có Plan Tháng</span>
              <FileCheck className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-blue-900 tracking-tight">{governanceStats.countWithPlan}</span>
              <span className="text-xs text-blue-500 ml-1">gian hàng</span>
            </div>
            <div className="text-2xs text-blue-600/80 mt-1">
              Tỷ lệ nộp đạt {governanceStats.coveragePct}%
            </div>
          </div>

          {/* KPI 4: Chưa Có Plan Tháng */}
          <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
            governanceStats.countMissingPlan > 0
              ? 'bg-amber-50/70 border-amber-200'
              : 'bg-emerald-50/50 border-emerald-100'
          }`}>
            <div className={`flex items-center justify-between text-xs font-semibold ${
              governanceStats.countMissingPlan > 0 ? 'text-amber-800' : 'text-emerald-700'
            }`}>
              <span>Chưa Có Plan</span>
              <AlertCircle className={`w-4 h-4 ${governanceStats.countMissingPlan > 0 ? 'text-amber-600' : 'text-emerald-600'}`} />
            </div>
            <div className="mt-2">
              <span className={`text-2xl font-black tracking-tight ${
                governanceStats.countMissingPlan > 0 ? 'text-amber-900' : 'text-emerald-900'
              }`}>{governanceStats.countMissingPlan}</span>
              <span className="text-xs text-slate-400 ml-1">gian hàng</span>
            </div>
            <div className={`text-2xs font-semibold mt-1 ${
              governanceStats.countMissingPlan > 0 ? 'text-amber-700' : 'text-emerald-600'
            }`}>
              {governanceStats.countMissingPlan > 0 ? 'Cần đôn đốc gửi duyệt' : 'Đã phủ 100% gian hàng'}
            </div>
          </div>

          {/* KPI 5: Tỷ Lệ Phủ Plan (% Coverage) */}
          <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-100 flex flex-col justify-between">
            <div className="flex items-center justify-between text-purple-700 text-xs font-semibold">
              <span>Tỷ Lệ Phủ Plan</span>
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-purple-900 tracking-tight">{governanceStats.coveragePct}%</span>
            </div>
            <div className="text-2xs text-purple-600/80 mt-1">
              {governanceStats.countWithPlan}/{governanceStats.totalB2cManaged} shop cần plan
            </div>
          </div>

          {/* KPI 6: Tỷ Lệ Đã Duyệt (% Approved) */}
          <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold">
              <span>Tỷ Lệ Đã Duyệt</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-emerald-900 tracking-tight">{governanceStats.approvedPct}%</span>
              <span className="text-xs text-emerald-600 ml-1">({governanceStats.countApproved} shop)</span>
            </div>
            <div className="text-2xs text-emerald-700 font-medium mt-1">
              Đủ điều kiện triển khai
            </div>
          </div>
        </div>

        {/* TIẾN TRÌNH GỬI DUYỆT PHÂN ĐOẠN ĐA NĂNG */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1.5">
              <span>Tiến độ phê duyệt & phân bổ kế hoạch tháng {selectedMonth}:</span>
              <span className="text-emerald-700 font-bold">{governanceStats.approvedPct}% hoàn tất</span>
            </span>
            <span className="text-slate-400 font-normal">
              Mẫu số tính: {governanceStats.totalB2cManaged} gian hàng B2C phụ trách
            </span>
          </div>

          {/* Segmented bar */}
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
            {governanceStats.countApproved > 0 && (
              <div 
                style={{ width: `${(governanceStats.countApproved / Math.max(governanceStats.totalB2cManaged, 1)) * 100}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`Đã duyệt: ${governanceStats.countApproved} gian hàng`}
              />
            )}
            {governanceStats.countPendingApproval > 0 && (
              <div 
                style={{ width: `${(governanceStats.countPendingApproval / Math.max(governanceStats.totalB2cManaged, 1)) * 100}%` }}
                className="bg-blue-500 h-full transition-all"
                title={`Chờ duyệt: ${governanceStats.countPendingApproval} gian hàng`}
              />
            )}
            {governanceStats.countPendingPreApproval > 0 && (
              <div 
                style={{ width: `${(governanceStats.countPendingPreApproval / Math.max(governanceStats.totalB2cManaged, 1)) * 100}%` }}
                className="bg-teal-400 h-full transition-all"
                title={`Sơ duyệt / Trao đổi: ${governanceStats.countPendingPreApproval} gian hàng`}
              />
            )}
            {governanceStats.countRevisionRequested > 0 && (
              <div 
                style={{ width: `${(governanceStats.countRevisionRequested / Math.max(governanceStats.totalB2cManaged, 1)) * 100}%` }}
                className="bg-rose-500 h-full transition-all"
                title={`Cần hiệu chỉnh: ${governanceStats.countRevisionRequested} gian hàng`}
              />
            )}
            {governanceStats.countDraft > 0 && (
              <div 
                style={{ width: `${(governanceStats.countDraft / Math.max(governanceStats.totalB2cManaged, 1)) * 100}%` }}
                className="bg-slate-300 h-full transition-all"
                title={`Bản nháp: ${governanceStats.countDraft} gian hàng`}
              />
            )}
            {governanceStats.countMissingPlan > 0 && (
              <div 
                style={{ width: `${(governanceStats.countMissingPlan / Math.max(governanceStats.totalB2cManaged, 1)) * 100}%` }}
                className="bg-amber-400 h-full transition-all"
                title={`Chưa có plan: ${governanceStats.countMissingPlan} gian hàng`}
              />
            )}
          </div>

          {/* Chú thích màu sắc */}
          <div className="flex flex-wrap items-center gap-4 text-2xs pt-1 text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Đã duyệt ({governanceStats.countApproved})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>Chờ duyệt Lead ({governanceStats.countPendingApproval})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
              <span>Thống nhất Growth ({governanceStats.countPendingPreApproval})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Cần hiệu chỉnh ({governanceStats.countRevisionRequested})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span>Bản nháp ({governanceStats.countDraft})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Chưa có plan ({governanceStats.countMissingPlan})</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. CHUYỂN ĐỔI GÓC NHÌN: MA TRẬN GIAN HÀNG vs DANH MỤC PLAN */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveHubTab('STORE_GOVERNANCE')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeHubTab === 'STORE_GOVERNANCE'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Ma Trận Quản Trị Gian Hàng & Gửi Duyệt Plan</span>
            <span className={`px-2 py-0.5 rounded-full text-2xs ${
              activeHubTab === 'STORE_GOVERNANCE' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {governanceStats.totalActive} gian hàng
            </span>
          </button>

          <button
            onClick={() => setActiveHubTab('PLAN_CATALOG')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeHubTab === 'PLAN_CATALOG'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Danh Mục Kế Hoạch Đã Phân Rã</span>
            <span className={`px-2 py-0.5 rounded-full text-2xs ${
              activeHubTab === 'PLAN_CATALOG' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {monthlyMetrics.planCount} kế hoạch
            </span>
          </button>
        </div>

        <div className="text-2xs text-slate-500 font-medium px-2">
          {activeHubTab === 'STORE_GOVERNANCE'
            ? 'Tích chọn để thiết lập Marketing B2C phụ trách & theo dõi trạng thái gửi duyệt từng gian hàng'
            : 'Xem chi tiết cơ cấu ngân sách & phân rã các dòng KOC'}
        </div>
      </div>

      {activeHubTab === 'STORE_GOVERNANCE' ? (
        /* ========================================================================= */
        /* TAB 1: MA TRẬN QUẢN TRỊ GIAN HÀNG ACTIVE & TRẠNG THÁI GỬI DUYỆT PLAN     */
        /* ========================================================================= */
        <div className="space-y-4">
          {/* THANH BỘ LỌC VÀ TÌM KIẾM MA TRẬN GIAN HÀNG */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Bộ lọc Scope */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setStoreGovernanceFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  storeGovernanceFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả ({governanceStats.totalActive})
              </button>
              <button
                onClick={() => setStoreGovernanceFilter('B2C_ONLY')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  storeGovernanceFilter === 'B2C_ONLY'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100'
                }`}
              >
                B2C Cần Plan ({governanceStats.totalB2cManaged})
              </button>
              <button
                onClick={() => setStoreGovernanceFilter('MISSING_PLAN')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  storeGovernanceFilter === 'MISSING_PLAN'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Chưa Có Plan ({governanceStats.countMissingPlan})</span>
              </button>
              <button
                onClick={() => setStoreGovernanceFilter('PENDING_APPROVAL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  storeGovernanceFilter === 'PENDING_APPROVAL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Chờ Duyệt ({governanceStats.countPendingApproval})</span>
              </button>
              <button
                onClick={() => setStoreGovernanceFilter('APPROVED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  storeGovernanceFilter === 'APPROVED'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Đã Duyệt ({governanceStats.countApproved})</span>
              </button>
              <button
                onClick={() => setStoreGovernanceFilter('EXEMPT')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  storeGovernanceFilter === 'EXEMPT'
                    ? 'bg-slate-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                Miễn trừ ({governanceStats.totalExempt})
              </button>
            </div>

            {/* Ô tìm kiếm */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm gian hàng, brand, PIC..."
                value={storeSearchQuery}
                onChange={(e) => setStoreSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* BẢNG MA TRẬN GIAN HÀNG */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-2xs">
                    <th className="py-3.5 px-4 text-center">B2C Phụ Trách & Cần Làm Plan</th>
                    <th className="py-3.5 px-4">Gian Hàng & Kênh Bán</th>
                    <th className="py-3.5 px-4">Thương Hiệu & Ngành</th>
                    <th className="py-3.5 px-4">Nhân Sự Phụ Trách</th>
                    <th className="py-3.5 px-4 text-center">Trao Đổi Với Growth</th>
                    <th className="py-3.5 px-4 text-center">Trạng Thái Plan Tháng {selectedMonth}</th>
                    <th className="py-3.5 px-4 text-right">Ngân Sách / GMV</th>
                    <th className="py-3.5 px-4 text-center">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStoreGovernance.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Store className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-600">Không tìm thấy gian hàng nào phù hợp bộ lọc</p>
                        <p className="text-2xs text-slate-400 mt-0.5">Thử chọn bộ lọc khác hoặc nhập từ khóa tìm kiếm</p>
                      </td>
                    </tr>
                  ) : (
                    filteredStoreGovernance.map((item: StoreGovernanceItem) => {
                      const store = item.store;
                      const plan = item.plan;
                      const isB2c = item.isB2c;

                      return (
                        <tr 
                          key={store.id}
                          className={`hover:bg-indigo-50/30 transition-colors ${
                            !isB2c ? 'bg-slate-50/40 opacity-75' : ''
                          }`}
                        >
                          {/* 1. TÍCH CHỌN MARKETING B2C PHỤ TRÁCH & CẦN LÀM PLAN */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={(e) => handleToggleB2cManaged(store, e)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                isB2c
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-2xs'
                                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                              }`}
                              title={isB2c ? "Click để chuyển sang MIỄN TRỪ không làm plan B2C" : "Click để đưa vào diện B2C PHỤ TRÁCH & CẦN LÀM PLAN"}
                            >
                              {isB2c ? (
                                <>
                                  <ToggleRight className="w-5 h-5 text-emerald-600 shrink-0" />
                                  <span>B2C Cần Plan</span>
                                </>
                              ) : (
                                <>
                                  <ToggleLeft className="w-5 h-5 text-slate-400 shrink-0" />
                                  <span className="text-slate-400">Miễn trừ Plan</span>
                                </>
                              )}
                            </button>
                          </td>

                          {/* 2. GIAN HÀNG & KÊNH */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                              <span>{store.storeName}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className={`px-2 py-0.5 rounded text-3xs font-semibold ${
                                store.platform?.includes('TikTok')
                                  ? 'bg-slate-900 text-white'
                                  : store.platform?.includes('Shopee')
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-blue-600 text-white'
                              }`}>
                                {store.platform || 'E-Commerce'}
                              </span>
                              <span className="text-2xs text-slate-400 font-mono">
                                {store.serviceModel || 'Full Service'}
                              </span>
                            </div>
                          </td>

                          {/* 3. BRAND & NGÀNH */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              <Building2 className="w-3 h-3 text-indigo-500" />
                              {store.brandName}
                            </span>
                            <div className="text-2xs text-slate-400 mt-1 line-clamp-1">
                              {store.category || 'Mỹ phẩm & Chăm sóc'}
                            </div>
                          </td>

                          {/* 4. NHÂN SỰ PHỤ TRÁCH */}
                          <td className="py-3.5 px-4">
                            <div className="text-xs">
                              <span className="text-slate-400 font-medium">B2C PIC: </span>
                              <strong className="text-slate-800">
                                {store.b2cOwners?.join(', ') || store.b2cOwnerName || 'Chưa gán'}
                              </strong>
                            </div>
                            <div className="text-2xs text-amber-700 mt-0.5">
                              <span>Growth: </span>
                              <span className="font-medium">{store.growthPic || 'Trần Thị Ánh'}</span>
                            </div>
                          </td>

                          {/* 5. TRAO ĐỔI VỚI GROWTH */}
                          <td className="py-3.5 px-4 text-center">
                            {plan ? (
                              plan.growthAlignmentStatus === 'ĐÃ_THỐNG_NHẤT' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Đã Thống Nhất</span>
                                </span>
                              ) : plan.growthAlignmentStatus === 'ĐANG_TRAO_ĐỔI' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Đang Trao Đổi</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                  <span>Đã Khởi Tạo</span>
                                </span>
                              )
                            ) : (
                              <span className="text-2xs text-slate-400 italic">
                                Chưa lập plan
                              </span>
                            )}
                          </td>

                          {/* 6. TRẠNG THÁI PLAN THÁNG */}
                          <td className="py-3.5 px-4 text-center">
                            {!isB2c ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                <span>Miễn trừ Plan B2C</span>
                              </span>
                            ) : plan ? (
                              <div className="space-y-1">
                                {getStatusBadge(plan.status)}
                                {plan.status === 'PENDING_APPROVAL' && (
                                  <div className="text-3xs text-blue-600 font-semibold">
                                    Đã nộp lên Quản lý
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                <span>Chưa Có Plan</span>
                              </span>
                            )}
                          </td>

                          {/* 7. NGÂN SÁCH / GMV */}
                          <td className="py-3.5 px-4 text-right">
                            {plan ? (
                              <div>
                                <div className="font-bold text-slate-900">
                                  {formatVndShort(plan.totalTargetBudget)}
                                </div>
                                <div className="text-2xs text-emerald-600 font-semibold">
                                  GMV: {formatVndShort(plan.targetGmv)}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="font-semibold text-slate-400">
                                  {formatVndShort(store.monthlyBudget || 0)}
                                </div>
                                <div className="text-2xs text-slate-400">
                                  Target: {formatVndShort(store.monthlyTargetGmv || 0)}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* 8. HÀNH ĐỘNG */}
                          <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              {plan ? (
                                <>
                                  {plan.status === 'PENDING_APPROVAL' && (
                                    <button
                                      onClick={(e) => handleQuickApprovePlan(plan.id, store.storeName, e)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
                                      title="Quản lý phê duyệt nhanh kế hoạch này"
                                    >
                                      <ShieldCheck className="w-3.5 h-3.5" />
                                      <span>Duyệt Nhanh</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => onSelectPlan(plan)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition"
                                    title="Mở bảng phân rã chi tiết trong Studio"
                                  >
                                    <span>Xem Studio</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                </>
                              ) : isB2c ? (
                                <>
                                  <button
                                    onClick={(e) => handleCreatePlanForStore(store, e)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold text-xs transition"
                                    title="Tạo kế hoạch mới cho gian hàng này trong tháng"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Tạo Plan</span>
                                  </button>
                                  <button
                                    onClick={(e) => handleRemindSubmission(store, e)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-medium text-xs transition"
                                    title="Gửi thông báo nhắc nhở nộp plan cho PIC"
                                  >
                                    <Bell className="w-3 h-3 text-amber-600" />
                                    <span>Nhắc Nộp</span>
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={(e) => handleToggleB2cManaged(store, e)}
                                  className="text-2xs text-slate-400 hover:text-slate-700 hover:underline cursor-pointer"
                                >
                                  Bật làm plan
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* TAB 2: DANH MỤC KẾ HOẠCH ĐÃ PHÂN RÃ (GRID / TABLE)                        */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Chỉ số tháng, kèm xu hướng qua các tháng */}
      {(() => {
        const months = [...new Set(plans.map(p => p.month))].sort();
        const series = (pick: (p: InputPlanBreakdownState) => number) =>
          months.map(m => plans.filter(p => p.month === m).reduce((acc, p) => acc + (pick(p) || 0), 0));
        const pool = selectedMonth === 'ALL' ? plans : plans.filter(p => p.month === selectedMonth);
        return (
          <div className="space-y-4">
            <StatRow>
              <Stat
                label="Ngân sách"
                value={formatVndShort(monthlyMetrics.totalBudget)}
                trend={series(p => p.totalTargetBudget)}
                note={`Trung bình ${formatVndShort(monthlyMetrics.planCount > 0 ? monthlyMetrics.totalBudget / monthlyMetrics.planCount : 0)} / kế hoạch`}
              />
              <Stat
                label="GMV mục tiêu"
                value={formatVndShort(monthlyMetrics.totalGmv)}
                trend={series(p => p.targetGmv)}
                note={`Gấp ${String(monthlyMetrics.avgRoi).replace('.', ',')} lần ngân sách`}
              />
              <Stat
                label="Chỉ tiêu nội dung"
                value={monthlyMetrics.totalContents.toLocaleString('vi-VN')}
                trend={series(p => p.totalTargetContents)}
                note="Video, livestream và kênh tự xây"
              />
              <Stat
                label="Kế hoạch"
                value={monthlyMetrics.planCount}
                note={[
                  monthlyMetrics.countExecuting && `${monthlyMetrics.countExecuting} đang chạy`,
                  monthlyMetrics.countApproved && `${monthlyMetrics.countApproved} đã duyệt`,
                  (monthlyMetrics.countPreApproval + monthlyMetrics.countPending) && `${monthlyMetrics.countPreApproval + monthlyMetrics.countPending} chờ duyệt`,
                  monthlyMetrics.countRevision && `${monthlyMetrics.countRevision} cần sửa`,
                ].filter(Boolean).join(' · ')}
                tone={monthlyMetrics.countRevision > 0 ? 'warning' : undefined}
              />
            </StatRow>
            <div className="bg-surface border border-line rounded-xl px-4 py-3.5 grid gap-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] font-medium text-ink">Ngân sách theo kênh</span>
                <span className="text-2xs text-ink-3">{months.length > 1 ? `Xu hướng: ${months[0]} → ${months[months.length - 1]}` : ''}</span>
              </div>
              <ChannelBar
                format={formatVndShort}
                values={pool.flatMap(p => (p.items || []).map(it => ({ channel: it.channel, value: it.totalBudget || 0 })))}
              />
            </div>
          </div>
        );
      })()}

      {/* 4. THANH BỘ LỌC & TÌM KIẾM */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Ô Tìm Kiếm */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên kế hoạch, brand, PIC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          {/* Lọc Nhãn Hàng */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Brand:</span>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="bg-transparent font-semibold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả ({brandList.length})</option>
              {brandList.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Lọc Trạng Thái */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Trạng thái:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent font-semibold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING_PRE_APPROVAL">Chờ sơ duyệt</option>
              <option value="PRE_APPROVED">Sơ Duyệt Đạt</option>
              <option value="REVISION_REQUESTED">Cần hiệu chỉnh</option>
              <option value="PENDING_APPROVAL">Chờ duyệt Lead</option>
              <option value="IN_EXECUTION">Đang Thực Thi</option>
              <option value="LEAD_APPROVED">Đã Phê Duyệt</option>
              <option value="DRAFT">Bản Nháp</option>
              <option value="COMPLETED">Đã nghiệm thu</option>
            </select>
          </div>

          {/* Lọc PIC */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>PIC:</span>
            <select
              value={selectedPic}
              onChange={(e) => setSelectedPic(e.target.value)}
              className="bg-transparent font-semibold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả PIC ({picList.length})</option>
              {picList.map(pic => (
                <option key={pic} value={pic}>{pic}</option>
              ))}
            </select>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('GRID')}
            className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'GRID'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Xem dạng thẻ card"
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Dạng thẻ</span>
          </button>
          <button
            onClick={() => setViewMode('TABLE')}
            className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'TABLE'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Xem dạng bảng tổng hợp"
          >
            <TableIcon className="w-4 h-4" />
            <span>Dạng bảng</span>
          </button>
        </div>
      </div>

      {/* 5. DANH SÁCH KẾ HOẠCH (GRID VIEW HOẶC TABLE VIEW) */}
      {filteredPlans.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Calendar className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900">Không tìm thấy kế hoạch nào</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Không có kế hoạch nào khớp với bộ lọc tháng "{selectedMonth}" hoặc từ khóa tìm kiếm. Vui lòng thử chọn tháng khác hoặc bấm lập kế hoạch mới.
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md"
          >
            <Plus className="w-4 h-4" />
            Lập kế hoạch cho tháng này
          </button>
        </div>
      ) : viewMode === 'GRID' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPlans.map(plan => {
            const currentItemsCount = plan.items?.length || 0;
            const currentTotalBudget = (plan.items || []).reduce((acc, it) => acc + (it.totalBudget || 0), 0);
            const currentTotalQty = (plan.items || []).reduce((acc, it) => acc + (it.qty || 0), 0);
            const budgetMatchPct = plan.totalTargetBudget > 0 
              ? Math.min(Math.round((currentTotalBudget / plan.totalTargetBudget) * 100), 100) 
              : 100;
            const qtyMatchPct = plan.totalTargetContents > 0 
              ? Math.min(Math.round((currentTotalQty / plan.totalTargetContents) * 100), 100) 
              : 100;

            const tiktokQty = (plan.items || []).filter(i => i.channel === 'TIKTOK').reduce((a, b) => a + b.qty, 0);
            const multiQty = (plan.items || []).filter(i => ['SHOPEE', 'FACEBOOK', 'INSTAGRAM', 'THREADS'].includes(i.channel)).reduce((a, b) => a + b.qty, 0);
            const liveQty = (plan.items || []).filter(i => i.channel === 'LIVESTREAM').reduce((a, b) => a + b.qty, 0);
            const selfQty = (plan.items || []).filter(i => i.channel === 'SELF_CHANNEL').reduce((a, b) => a + b.qty, 0);

            return (
              <div
                key={plan.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Header */}
                <div className="p-5 border-b border-slate-100 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                      {plan.brandName}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600">
                        {plan.month}
                      </span>
                      {getStatusBadge(plan.status)}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-base text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                      {plan.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Avatar name={plan.pic || 'PIC'} size={20} />
                        <span>Booking: <strong className="text-slate-800 font-medium">{plan.pic}</strong></span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">Growth:</span>
                        <strong className="text-amber-800">{plan.growthPic?.split(' ')[0] || 'Team'}</strong>
                      </div>
                      <span>•</span>
                      <span className="text-slate-400">{plan.week}</span>
                    </div>
                  </div>
                </div>

                {/* Card Body: Các chỉ số KPI */}
                <div className="p-5 space-y-4 bg-slate-50/50">
                  {/* Ngân sách */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Ngân sách kế hoạch:</span>
                      <span className="font-semibold text-slate-900">
                        {formatVndShort(plan.totalTargetBudget)}
                      </span>
                    </div>
                    <Progress value={currentTotalBudget} max={plan.totalTargetBudget || 1} target={0.95} label="Ngân sách đã phân rã" />
                    {plan.budgetAffiliate && plan.budgetSelfChannel && (
                      <div className="p-2 rounded-lg bg-indigo-50/70 border border-indigo-100 text-2xs space-y-0.5 mt-1">
                        <div className="flex items-center justify-between text-indigo-900 font-semibold">
                          <span>Phân bổ 2 kênh:</span>
                          <span className="font-mono">{formatVndShort(plan.totalTargetBudget)}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Affiliate: <strong className="text-blue-700">{formatVndShort(plan.budgetAffiliate)}</strong></span>
                          <span>Self: <strong className="text-indigo-700">{formatVndShort(plan.budgetSelfChannel)}</strong></span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-2xs text-slate-400">
                      <span>Đã phân rã {formatVndShort(currentTotalBudget)}</span>
                      <span className="font-semibold text-slate-600">{budgetMatchPct}%</span>
                    </div>
                  </div>

                  {/* Số lượng nội dung & Doanh thu */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                      <span className="text-slate-400 block text-2xs">Chỉ tiêu video</span>
                      <span className="text-sm font-semibold text-slate-800">
                        {currentTotalQty} / {plan.totalTargetContents}
                      </span>
                      <span className="block text-2xs text-slate-400 mt-0.5">Khớp {qtyMatchPct}%</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                      <span className="text-slate-400 block text-2xs">Mục tiêu GMV</span>
                      <span className="text-sm font-semibold text-emerald-600">
                        {formatVndShort(plan.targetGmv)}
                      </span>
                      <span className="block text-2xs text-emerald-500 font-semibold mt-0.5">
                        ROI: {(plan.targetGmv / (plan.totalTargetBudget || 1)).toFixed(1)}x
                      </span>
                    </div>
                  </div>

                  {/* Số nội dung theo kênh */}
                  <div className="pt-1">
                    <ChannelBar values={(plan.items || []).map(it => ({ channel: it.channel, value: it.qty || 0 }))} height={6} />
                  </div>
                </div>

                {/* Card Footer: Action Buttons */}
                <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setCloningPlan(plan);
                      setCloneTargetMonth(plan.month === '2026/10' ? '2026/11' : '2026/10');
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    title="Nhân bản sang tháng sau"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setHistoryPlanId(plan.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 text-xs font-semibold transition-all"
                    title="Xem lịch sử Trao đổi booking & Growth & luồng phê duyệt"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Trao Đổi ({plan.discussions?.length || 0})</span>
                  </button>

                  <button
                    onClick={() => onSelectPlan(plan)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 hover: text-white font-semibold text-xs shadow-md group-hover: transition-all transform active:scale-95"
                  >
                    <span>Vào phân rã</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-2xs">
                <tr>
                  <th className="py-3.5 px-4">Tháng / kế hoạch</th>
                  <th className="py-3.5 px-4">Nhãn hàng</th>
                  <th className="py-3.5 px-4">Brand PIC</th>
                  <th className="py-3.5 px-4 text-right">Ngân sách trần</th>
                  <th className="py-3.5 px-4 text-right">Đã phân rã</th>
                  <th className="py-3.5 px-4 text-center">Chỉ tiêu video</th>
                  <th className="py-3.5 px-4 text-right">GMV dự phóng</th>
                  <th className="py-3.5 px-4 text-center">Trạng Thái</th>
                  <th className="py-3.5 px-4 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPlans.map(plan => {
                  const currentTotalBudget = (plan.items || []).reduce((acc, it) => acc + (it.totalBudget || 0), 0);
                  const currentTotalQty = (plan.items || []).reduce((acc, it) => acc + (it.qty || 0), 0);

                  return (
                    <tr 
                      key={plan.id}
                      className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                      onClick={() => onSelectPlan(plan)}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 group-hover:text-indigo-600 text-sm">
                          {plan.title}
                        </div>
                        <div className="text-2xs text-slate-400 mt-0.5">
                          Mã: {plan.id} • {plan.week}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {plan.brandName}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{plan.pic}</div>
                        <div className="text-2xs text-amber-700 font-medium">Growth: {plan.growthPic?.split(' ')[0] || 'Team'}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                        {formatVndShort(plan.totalTargetBudget)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-indigo-600">
                        {(currentTotalBudget / 1000000).toLocaleString('vi-VN')} Tr đ
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-semibold text-slate-800">{currentTotalQty}</span>
                        <span className="text-slate-400"> / {plan.totalTargetContents}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-emerald-600">
                        {(plan.targetGmv / 1000000000).toFixed(2)} Tỷ
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(plan.status)}
                      </td>
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setHistoryPlanId(plan.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-xs font-semibold transition-colors"
                            title="Xem lịch sử Trao đổi booking & Growth & luồng phê duyệt"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                            <span>({plan.discussions?.length || 0})</span>
                          </button>
                          <button
                            onClick={() => onSelectPlan(plan)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs"
                          >
                            <span>Xem Studio</span>
                            <ArrowRight className="w-3 h-3" />
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
      )}
        </div>
      )}

      {/* 6. MODAL: LẬP KẾ HOẠCH THÁNG MỚI */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-semibold">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">Lập kế hoạch B2C tháng mới</h3>
                  <p className="text-xs text-slate-500">Thiết lập ngân sách trần và mục tiêu cho chu kỳ tháng</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chu kỳ tháng:
                  </label>
                  <select
                    value={newPlanMonth}
                    onChange={(e) => setNewPlanMonth(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="2026/10">Tháng 10/2026 (Hiện tại)</option>
                    <option value="2026/11">Tháng 11/2026 (Sắp tới)</option>
                    <option value="2026/12">Tháng 12/2026</option>
                    <option value="2027/01">Tháng 01/2027</option>
                    <option value="2026/09">Tháng 09/2026</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tuần áp dụng:
                  </label>
                  <input
                    type="text"
                    value={newPlanWeek}
                    onChange={(e) => setNewPlanWeek(e.target.value)}
                    placeholder="VD: W42 [12.10 - 18.10]"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nhãn hàng:
                  </label>
                  <select
                    value={newPlanBrand}
                    onChange={(e) => setNewPlanBrand(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Cỏ Mềm">Cỏ Mềm</option>
                    <option value="Cocoon">Cocoon</option>
                    <option value="Fresh_TikTok_E2E-C">Fresh</option>
                    <option value="Face Republic_TikTok_E2E-O">Face Republic</option>
                    <option value="Senka_TikTok_E2E-C">Senka</option>
                    <option value="Clio_TikTok_E2E-C">Clio Cosmetics</option>
                    <option value="Lemonade">Lemonade</option>
                    <option value="Sunplay">Sunplay</option>
                    <option value="TM Clean_TikTok_E2E-C">TM Clean</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Brand PIC phụ trách:
                  </label>
                  <select
                    value={newPlanPic}
                    onChange={(e) => setNewPlanPic(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Đặng Mai Hà Linh">Đặng Mai Hà Linh</option>
                    <option value="Phương Thảo">Phương Thảo</option>
                    <option value="Khánh Vy">Khánh Vy (Senior Booking)</option>
                    <option value="Nguyễn Thu Trang">Nguyễn Thu Trang</option>
                    <option value="Trần Minh Đức">Trần Minh Đức</option>
                    <option value="Vân Ngọc">Vân Ngọc (trưởng phòng)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tiêu đề kế hoạch:
                </label>
                <input
                  type="text"
                  value={newPlanTitle}
                  onChange={(e) => setNewPlanTitle(e.target.value)}
                  placeholder={`VD: Chiến dịch ${newPlanMonth} - ${newPlanBrand} Bứt phá doanh số`}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngân sách (VNĐ):
                  </label>
                  <input
                    type="number"
                    step="5000000"
                    value={newPlanBudget}
                    onChange={(e) => setNewPlanBudget(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-2xs text-slate-400 mt-0.5 block">
                    {(newPlanBudget / 1000000).toLocaleString('vi-VN')} Tr đ
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số lượng video:
                  </label>
                  <input
                    type="number"
                    value={newPlanQty}
                    onChange={(e) => setNewPlanQty(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-2xs text-slate-400 mt-0.5 block">Nội dung/ca</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mục tiêu GMV:
                  </label>
                  <input
                    type="number"
                    step="10000000"
                    value={newPlanGmv}
                    onChange={(e) => setNewPlanGmv(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-emerald-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-2xs text-emerald-600 font-semibold mt-0.5 block">
                    ROI: {(newPlanGmv / (newPlanBudget || 1)).toFixed(1)}x
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chiến lược tự động cân đối:
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { id: 'BALANCED', label: 'Cân bằng toàn diện' },
                    { id: 'GMV_MAX', label: 'Tối đa GMV' },
                    { id: 'MEGA_SALE', label: 'Siêu Sale & Live' },
                    { id: 'BRAND_PUSH', label: 'Phủ thương hiệu' },
                    { id: 'COST_SAVER', label: 'Tiết kiệm chi phí' }
                  ].map(p => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setNewPlanPreset(p.id as any)}
                      className={`p-2 rounded-xl text-center border font-semibold transition-all ${
                        newPlanPreset === p.id 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú định hướng:
                </label>
                <textarea
                  rows={2}
                  value={newPlanNotes}
                  onChange={(e) => setNewPlanNotes(e.target.value)}
                  placeholder="Ghi chú trọng tâm sản phẩm hoặc chiến lược..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 hover: text-white font-semibold text-sm shadow-lg"
                >
                  Tạo & mở Studio phân rã
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: NHÂN BẢN KẾ HOẠCH SANG THÁNG TIẾP THEO */}
      {cloningPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Copy className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-base text-slate-900">Nhân bản kế hoạch</h3>
              </div>
              <button onClick={() => setCloningPlan(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600">
              Bạn đang nhân bản kế hoạch <strong>"{cloningPlan.title}"</strong> ({cloningPlan.brandName}). Toàn bộ danh mục kênh và định mức sẽ được kế thừa sang tháng mới.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Chọn Chu kỳ tháng đích:
              </label>
              <select
                value={cloneTargetMonth}
                onChange={(e) => setCloneTargetMonth(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="2026/11">Tháng 11/2026 (Sắp tới)</option>
                <option value="2026/12">Tháng 12/2026 (cuối năm)</option>
                <option value="2027/01">Tháng 01/2027 (Tết nguyên đán)</option>
                <option value="2026/10">Tháng 10/2026</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCloningPlan(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCloneSubmit}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md"
              >
                Xác nhận nhân bản
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL XEM LỊCH SỬ TRAO ĐỔI & TIẾN TRÌNH DUYỆT */}
      {viewingHistoryPlan && (
        <PlanHistoryModal
          plan={viewingHistoryPlan}
          isOpen={!!viewingHistoryPlan}
          onClose={() => setHistoryPlanId(null)}
          onSendMessage={(planId, msg) => {
            if (onSendMessage) {
              onSendMessage(planId, msg);
            }
          }}
          onStatusChange={(planId, newStatus, log, note) => {
            if (onUpdatePlanStatus) {
              onUpdatePlanStatus(planId, newStatus, log, note);
            }
          }}
          onNotify={notify}
        />
      )}
    </div>
  );
};
