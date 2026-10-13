'use client';

import React, { useState, useMemo } from 'react';
import {
  Stat,
  StatRow,
  ChannelBar,
  Progress,
  Person,
  ChannelTag,
  ConfirmDialog,
  Tabs,
  Segmented,
  Button,
  FilterBar,
  Chips,
  Panel,
  Modal,
  Field,
  Input,
  Select,
  Textarea,
  Pagination,
  Status
} from '../ui';
import { formatVndShort } from '../../lib/format';
import {
  Plus,
  Dices,
  ChevronDown,
  ShieldCheck,
  AlertCircle,
  Copy,
  ArrowRight,
  Bell,
  ToggleLeft,
  ToggleRight,
  BarChart3,
  MessageSquare,
  Store as StoreIcon
} from 'lucide-react';
import {
  InputPlanBreakdownState,
  MonthlyPlanStatus,
  PlanDiscussionMessage,
  UserProfile,
  StorePortfolioItem
} from '../../lib/types';

type StrategyPreset = 'BALANCED' | 'GMV_MAX' | 'BRAND_PUSH' | 'COST_SAVER' | 'MEGA_SALE';
import { AVAILABLE_MONTHS } from '../../lib/monthlyPlanData';
import { autoBalancePlanItems, INITIAL_INPUT_PLAN_ITEMS } from '../../lib/inputPlanDefaults';
import { INITIAL_STORE_PORTFOLIOS } from '../../lib/mockData';
import { PlanHistoryModal } from './PlanHistoryModal';

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

let sampleCounter = 0;
function getNextSampleBrand(): string {
  const brands = ['Cocoon', 'Fresh_TikTok_E2E-C', 'Senka_TikTok_E2E-C', 'Lemonade', 'Cỏ Mềm'];
  const brand = brands[sampleCounter % brands.length];
  sampleCounter += 1;
  return brand;
}

function generatePlanId(month: string): string {
  const m = month === 'ALL' ? '2026/10' : month;
  return `PLAN-${m.replace('/', '-')}-${Date.now().toString().slice(-4)}`;
}

function generateDiscussionId(): string {
  return `DISC-${Date.now()}`;
}

function findPlanForStore(plans: InputPlanBreakdownState[], store: StorePortfolioItem, month: string): InputPlanBreakdownState | null {
  return plans.find(p => {
    const matchMonth = month === 'ALL' || p.month === month;
    if (!matchMonth) return false;
    if (p.storeId && p.storeId === store.id) return true;
    if (p.storeName && p.storeName.trim().toLowerCase() === store.storeName.trim().toLowerCase()) return true;

    const b1 = (p.brandName || '').toLowerCase();
    const b2 = (store.brandName || '').toLowerCase();
    const sName = (store.storeName || '').toLowerCase();
    return (b1.length >= 2 && b2.length >= 2 && (b1.includes(b2) || b2.includes(b1))) ||
           (b1.length >= 2 && sName.includes(b1.split('_')[0].trim()));
  }) || null;
}

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
  onUpdatePlan?: (planId: string, updated: Partial<InputPlanBreakdownState>) => void;
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
  onUpdatePlan,
  onSendMessage,
  onUpdateStore,
  currentUser,
  onNotify
}) => {
  // Bộ lọc tháng
  const [selectedMonth, setSelectedMonth] = useState<string>('2026/10');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPic, setSelectedPic] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  // Tab chuyển góc nhìn: Ma trận gian hàng vs Danh mục kế hoạch
  const [activeHubTab, setActiveHubTab] = useState<'STORE_GOVERNANCE' | 'PLAN_CATALOG'>('STORE_GOVERNANCE');

  // Lọc cho Ma trận gian hàng (mặc định lọc gian B2C làm kế hoạch)
  const [storeGovernanceFilter, setStoreGovernanceFilter] = useState<'ALL' | 'B2C_ONLY' | 'MISSING_PLAN' | 'PENDING_APPROVAL' | 'APPROVED' | 'EXEMPT'>('B2C_ONLY');
  const [storeSearchQuery, setStoreSearchQuery] = useState<string>('');
  const [governancePage, setGovernancePage] = useState<number>(1);
  const GOVERNANCE_PAGE_SIZE = 15;
  const [approvingQuickPlan, setApprovingQuickPlan] = useState<{ planId: string; storeName: string } | null>(null);

  // Thu gọn / mở rộng bảng chỉ số
  const [isGovernanceExpanded, setIsGovernanceExpanded] = useState<boolean>(false);
  const [isCatalogStatsExpanded, setIsCatalogStatsExpanded] = useState<boolean>(false);

  // Danh bạ gian hàng có hiệu lực
  const effectiveStores = useMemo<StorePortfolioItem[]>(() => {
    return (storePortfolios && storePortfolios.length > 0) ? storePortfolios : INITIAL_STORE_PORTFOLIOS;
  }, [storePortfolios]);

  // Các gian hàng active
  const activeStores = useMemo<StorePortfolioItem[]>(() => {
    return effectiveStores.filter((s: StorePortfolioItem) => s.accountStatus === 'ACTIVE');
  }, [effectiveStores]);

  // Ma trận từng gian hàng và kế hoạch trong tháng
  const storeGovernanceList = useMemo<StoreGovernanceItem[]>(() => {
    return activeStores.map((store: StorePortfolioItem) => {
      const isB2c = store.isB2cManaged !== false && store.requiresB2cPlan !== false;
      const plan = findPlanForStore(plans, store, selectedMonth);
      return {
        store,
        isB2c,
        plan,
        hasPlan: !!plan,
        status: (plan?.status || 'MISSING') as MonthlyPlanStatus | 'MISSING',
      };
    });
  }, [activeStores, selectedMonth, plans]);

  // Bộ chỉ số quản trị duyệt kế hoạch theo tháng
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
      if (storeGovernanceFilter === 'B2C_ONLY' && !item.isB2c) return false;
      if (storeGovernanceFilter === 'EXEMPT' && item.isB2c) return false;
      if (storeGovernanceFilter === 'MISSING_PLAN' && (!item.isB2c || item.hasPlan)) return false;
      if (storeGovernanceFilter === 'PENDING_APPROVAL' && (!item.plan || item.plan.status !== 'PENDING_APPROVAL')) return false;
      if (storeGovernanceFilter === 'APPROVED' && (!item.plan || !['LEAD_APPROVED', 'BRAND_APPROVED', 'APPROVED', 'IN_EXECUTION', 'COMPLETED'].includes(item.plan.status || ''))) return false;

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

  // Phân trang
  const paginatedStoreGovernance = useMemo(() => {
    const start = (governancePage - 1) * GOVERNANCE_PAGE_SIZE;
    return filteredStoreGovernance.slice(start, start + GOVERNANCE_PAGE_SIZE);
  }, [filteredStoreGovernance, governancePage]);

  // Bật/tắt B2C phụ trách
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
        ? `Đã chuyển gian hàng "${store.storeName}" sang diện Marketing B2C phụ trách & cần làm kế hoạch.`
        : `Đã chuyển gian hàng "${store.storeName}" sang diện miễn trừ kế hoạch B2C.`
    );
  };

  // Phê duyệt nhanh
  const handleQuickApprovePlan = (planId: string, storeName: string) => {
    if (onUpdatePlanStatus) {
      onUpdatePlanStatus(
        planId,
        'LEAD_APPROVED',
        `Trưởng phòng (${currentUser?.name || 'Lead'}) đã duyệt nhanh kế hoạch gian hàng ${storeName}.`,
        'Phê duyệt nhanh trên bảng quản trị kế hoạch tháng.'
      );
    }
    notify(`Đã phê duyệt kế hoạch cho gian hàng "${storeName}".`);
  };

  // Tạo kế hoạch cho gian hàng
  const handleCreatePlanForStore = (store: StorePortfolioItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setNewPlanMonth(selectedMonth === 'ALL' ? '2026/10' : selectedMonth);
    setNewPlanBrand(store.brandName);
    setNewPlanTitle(`Kế hoạch B2C ${selectedMonth === 'ALL' ? '2026/10' : selectedMonth} - ${store.storeName}`);
    setNewPlanPic(store.b2cOwners?.[0] || store.b2cOwnerName || currentUser?.name || 'Khánh Vy');
    setNewPlanBudget(store.monthlyBudget || 120000000);
    setNewPlanGmv(store.monthlyTargetGmv || 800000000);
    setIsCreateModalOpen(true);
  };

  // Nhắc nhở nộp kế hoạch
  const handleRemindSubmission = (store: StorePortfolioItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const pic = store.b2cOwners?.[0] || store.b2cOwnerName || 'Chuyên viên phụ trách B2C';
    notify(`Đã gửi thông báo nhắc nộp kế hoạch tháng ${selectedMonth} tới ${pic} (gian hàng: ${store.storeName}).`);
  };

  // Tạo mẫu thử
  const handleQuickSample = () => {
    const b = getNextSampleBrand();
    const m = selectedMonth === 'ALL' ? '2026/10' : selectedMonth;
    const newPlan: InputPlanBreakdownState = {
      id: generatePlanId(m),
      title: `Kế hoạch thử nghiệm - ${b} (${m})`,
      brandName: b,
      month: m,
      week: 'W42 [12.10 - 18.10]',
      pic: currentUser?.name || 'Đặng Mai Hà Linh',
      totalTargetBudget: 120000000,
      totalTargetContents: 65,
      targetGmv: 780000000,
      cancellationRate: 0.08,
      strategyPreset: 'BALANCED',
      status: 'DRAFT',
      statusLabel: 'Bản nháp',
      spentBudget: 0,
      deliveredContents: 0,
      actualGmv: 0,
      notes: 'Kế hoạch mẫu khởi tạo để kiểm tra số liệu.',
      createdAt: new Date().toISOString(),
      items: autoBalancePlanItems(INITIAL_INPUT_PLAN_ITEMS, 120000000, 65, 'BALANCED')
    };
    onCreatePlan(newPlan);
    notify(`Đã tạo kế hoạch mẫu "${newPlan.title}".`);
  };

  // Modal lập kế hoạch mới
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPlanMonth, setNewPlanMonth] = useState('2026/10');
  const [newPlanWeek, setNewPlanWeek] = useState('W42 [12.10 - 18.10]');
  const [newPlanBrand, setNewPlanBrand] = useState('Cỏ Mềm');
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [newPlanPic, setNewPlanPic] = useState(currentUser?.name || 'Đặng Mai Hà Linh');
  const [newPlanBudget, setNewPlanBudget] = useState(150000000);
  const [newPlanQty, setNewPlanQty] = useState(75);
  const [newPlanGmv, setNewPlanGmv] = useState(900000000);
  const [newPlanPreset, setNewPlanPreset] = useState<StrategyPreset>('BALANCED');
  const [newPlanNotes, setNewPlanNotes] = useState('');

  // Modal nhân bản kế hoạch
  const [cloningPlan, setCloningPlan] = useState<InputPlanBreakdownState | null>(null);
  const [cloneTargetMonth, setCloneTargetMonth] = useState('2026/11');

  // Modal lịch sử & trao đổi
  const [historyPlanId, setHistoryPlanId] = useState<string | null>(null);
  const viewingHistoryPlan = plans.find(p => p.id === historyPlanId) || null;

  const notify = (msg: string) => {
    if (onNotify) onNotify(msg);
  };

  // Danh sách thương hiệu và PIC cho bộ lọc danh mục
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

  // Danh mục kế hoạch đã lọc
  const filteredPlans = useMemo(() => {
    return plans.filter(p => {
      if (selectedMonth !== 'ALL' && p.month !== selectedMonth) return false;
      if (selectedBrand !== 'ALL' && p.brandName !== selectedBrand) return false;
      if (selectedStatus !== 'ALL' && p.status !== selectedStatus) return false;
      if (selectedPic !== 'ALL' && p.pic !== selectedPic) return false;

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

  // Chỉ số tổng hợp của danh mục theo tháng
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
      id: generatePlanId(newPlanMonth),
      title: newPlanTitle || `Kế hoạch B2C ${newPlanMonth} - ${newPlanBrand}`,
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
      statusLabel: 'Bản nháp',
      spentBudget: 0,
      deliveredContents: 0,
      actualGmv: 0,
      notes: newPlanNotes || `Kế hoạch khởi tạo cho chu kỳ ${newPlanMonth}.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: balancedItems,
      discussions: [
        {
          id: generateDiscussionId(),
          authorName: newPlanPic,
          authorRole: 'BOOKING',
          authorTitle: 'Booking Specialist PIC',
          content: `Khởi tạo kế hoạch tháng ${newPlanMonth} với ngân sách trần ${formatVndShort(newPlanBudget)}, dự kiến ${newPlanQty} nội dung.`,
          type: 'COMMENT',
          timestamp: new Date().toISOString(),
          tags: ['Khởi tạo', 'Ngân sách']
        }
      ]
    };

    onCreatePlan(createdPlan);
    notify(`Đã tạo kế hoạch mới "${createdPlan.title}".`);
    setIsCreateModalOpen(false);
    onSelectPlan(createdPlan);
  };

  const handleCloneSubmit = () => {
    if (!cloningPlan) return;
    onClonePlan(cloningPlan, cloneTargetMonth);
    notify(`Đã nhân bản kế hoạch "${cloningPlan.title}" sang tháng ${cloneTargetMonth}.`);
    setCloningPlan(null);
  };

  const getStatusBadge = (status?: MonthlyPlanStatus) => {
    switch (status) {
      case 'PENDING_PRE_APPROVAL':
        return <Status tone="warning">Chờ sơ duyệt</Status>;
      case 'PRE_APPROVED':
        return <Status tone="positive">Sơ duyệt đạt</Status>;
      case 'REVISION_REQUESTED':
        return <Status tone="critical">Cần sửa</Status>;
      case 'PENDING_APPROVAL':
        return <Status tone="warning">Chờ duyệt Lead</Status>;
      case 'LEAD_APPROVED':
      case 'BRAND_APPROVED':
      case 'APPROVED':
        return <Status tone="positive">Đã duyệt</Status>;
      case 'IN_EXECUTION':
        return <Status tone="info">Đang chạy</Status>;
      case 'COMPLETED':
        return <Status tone="positive">Hoàn tất</Status>;
      case 'DRAFT':
      default:
        return <Status tone="neutral">Nháp</Status>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. THANH CÔNG CỤ TRÊN: BỘ CHỌN KỲ & THAO TÁC CHÍNH */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Bộ chọn tháng */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-0.5 rounded-lg bg-sunken">
          {AVAILABLE_MONTHS.map(m => {
            const isSelected = selectedMonth === m.value;
            const countInMonth = m.value === 'ALL'
              ? plans.length
              : plans.filter(p => p.month === m.value).length;
            const label = m.value === 'ALL' ? 'Tất cả' : m.value;

            return (
              <button
                key={m.value}
                type="button"
                onClick={() => {
                  setSelectedMonth(m.value);
                  setGovernancePage(1);
                }}
                className={cx(
                  'h-7 px-3 rounded-[5px] text-[13px] whitespace-nowrap transition-colors flex items-center gap-1.5',
                  isSelected
                    ? 'bg-surface text-ink font-medium shadow-[0_1px_2px_rgb(22_23_26/0.08)]'
                    : 'text-ink-3 hover:text-ink'
                )}
              >
                <span>{label}</span>
                <span className={cx('text-2xs tabular-nums', isSelected ? 'text-ink' : 'text-ink-3')}>
                  {countInMonth}
                </span>
              </button>
            );
          })}
        </div>

        {/* Nút thao tác */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="md"
            icon={Dices}
            onClick={handleQuickSample}
            title="Tạo nhanh kế hoạch mẫu để thử nghiệm"
          >
            Mẫu
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={Plus}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Tạo kế hoạch
          </Button>
        </div>
      </div>

      {/* 2. CHUYỂN TAB: MA TRẬN GIAN HÀNG vs DANH MỤC KẾ HOẠCH */}
      <Tabs
        items={[
          { key: 'STORE_GOVERNANCE', label: 'Ma trận gian hàng', count: governanceStats.totalActive },
          { key: 'PLAN_CATALOG', label: 'Danh mục kế hoạch', count: monthlyMetrics.planCount },
        ]}
        value={activeHubTab}
        onChange={setActiveHubTab}
      />

      {activeHubTab === 'STORE_GOVERNANCE' ? (
        /* ========================================================================= */
        /* TAB 1: MA TRẬN QUẢN TRỊ GIAN HÀNG VÀ TRẠNG THÁI GỬI DUYỆT PLAN            */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* TÓM TẮT TIẾN ĐỘ DUYỆT */}
          <section className="bg-surface border border-line rounded-xl overflow-hidden">
            <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-wrap">
                <span className="text-[13px] font-medium text-ink">
                  Tiến độ duyệt kế hoạch {selectedMonth === 'ALL' ? 'toàn kỳ' : selectedMonth}:
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-positive tabular-nums">
                    {governanceStats.approvedPct}%
                  </span>
                  <span className="text-2xs text-ink-3 tabular-nums">
                    ({governanceStats.countApproved}/{governanceStats.totalB2cManaged} gian B2C)
                  </span>
                </div>
                <div className="w-32 sm:w-44">
                  <Progress
                    value={governanceStats.countApproved}
                    max={governanceStats.totalB2cManaged || 1}
                    label="Tiến độ duyệt kế hoạch"
                  />
                </div>
              </div>

              {/* Tóm tắt nhanh */}
              <div className="flex items-center gap-3 text-2xs text-ink-3 flex-wrap">
                <span><strong className="text-ink font-medium">{governanceStats.totalActive}</strong> gian hàng active</span>
                <span>•</span>
                <span><strong className="text-ink font-medium">{governanceStats.totalB2cManaged}</strong> B2C phụ trách</span>
                <span>•</span>
                <span><strong className="text-ink font-medium">{governanceStats.countWithPlan}</strong> đã có kế hoạch</span>
                {governanceStats.countMissingPlan > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-warning font-medium inline-flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {governanceStats.countMissingPlan} chưa có kế hoạch
                    </span>
                  </>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsGovernanceExpanded(prev => !prev)}
                >
                  {isGovernanceExpanded ? 'Thu gọn' : 'Chi tiết chỉ số'}
                  <ChevronDown className={cx('w-3.5 h-3.5 ml-1 transition-transform', isGovernanceExpanded && 'rotate-180')} />
                </Button>
              </div>
            </div>

            {/* Chi tiết chỉ số mở rộng */}
            {isGovernanceExpanded && (
              <div className="p-4 border-t border-line bg-canvas/40 space-y-3">
                <StatRow>
                  <Stat
                    label="Gian hàng active"
                    value={governanceStats.totalActive}
                    note="Toàn bộ hệ thống gian hàng"
                  />
                  <Stat
                    label="B2C cần kế hoạch"
                    value={`${governanceStats.totalB2cManaged} / ${governanceStats.totalActive}`}
                    note={`${governanceStats.totalExempt} gian hàng miễn trừ`}
                  />
                  <Stat
                    label="Đã có kế hoạch"
                    value={governanceStats.countWithPlan}
                    note={`Tỷ lệ nộp ${governanceStats.coveragePct}%`}
                  />
                  <Stat
                    label="Đã duyệt"
                    value={`${governanceStats.countApproved} / ${governanceStats.totalB2cManaged}`}
                    progress={{ value: governanceStats.countApproved, max: governanceStats.totalB2cManaged || 1 }}
                    note={governanceStats.countMissingPlan > 0 ? `${governanceStats.countMissingPlan} gian hàng chưa nộp` : 'Đã duyệt toàn bộ'}
                    tone={governanceStats.countMissingPlan > 0 ? 'warning' : 'positive'}
                  />
                </StatRow>
              </div>
            )}
          </section>

          {/* BẢNG MA TRẬN GIAN HÀNG */}
          <Panel flush>
            {/* Bộ lọc bảng */}
            <div className="p-4 border-b border-line">
              <FilterBar
                search={{
                  value: storeSearchQuery,
                  onChange: (v) => {
                    setStoreSearchQuery(v);
                    setGovernancePage(1);
                  },
                  placeholder: 'Tìm gian hàng, thương hiệu, nhân sự...',
                }}
                chips={
                  <Chips
                    items={[
                      { key: 'ALL', label: 'Tất cả', count: governanceStats.totalActive },
                      { key: 'B2C_ONLY', label: 'B2C cần kế hoạch', count: governanceStats.totalB2cManaged },
                      { key: 'MISSING_PLAN', label: 'Chưa có kế hoạch', count: governanceStats.countMissingPlan },
                      { key: 'PENDING_APPROVAL', label: 'Chờ duyệt', count: governanceStats.countPendingApproval },
                      { key: 'APPROVED', label: 'Đã duyệt', count: governanceStats.countApproved },
                      { key: 'EXEMPT', label: 'Miễn trừ', count: governanceStats.totalExempt },
                    ]}
                    value={storeGovernanceFilter}
                    onChange={(k) => {
                      setStoreGovernanceFilter(k);
                      setGovernancePage(1);
                    }}
                  />
                }
                resultCount={filteredStoreGovernance.length}
              />
            </div>

            {/* Nội dung bảng */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface border-b border-line text-ink-3 font-medium text-[12.5px]">
                    <th className="py-2.5 px-4 text-center">B2C phụ trách &amp; cần làm kế hoạch</th>
                    <th className="py-2.5 px-4">Gian hàng &amp; kênh bán</th>
                    <th className="py-2.5 px-4">Thương hiệu &amp; ngành</th>
                    <th className="py-2.5 px-4">Nhân sự phụ trách</th>
                    <th className="py-2.5 px-4 text-center">Trao đổi với Growth</th>
                    <th className="py-2.5 px-4 text-center">Trạng thái kế hoạch tháng {selectedMonth}</th>
                    <th className="py-2.5 px-4 text-right">Ngân sách / GMV</th>
                    <th className="py-2.5 px-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredStoreGovernance.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-ink-3">
                        <StoreIcon className="w-8 h-8 mx-auto mb-2 text-line-strong" />
                        <p className="font-medium text-ink">Không tìm thấy gian hàng phù hợp</p>
                        <p className="text-2xs text-ink-3 mt-0.5">Thử chọn bộ lọc khác hoặc nhập từ khóa tìm kiếm</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedStoreGovernance.map((item: StoreGovernanceItem) => {
                      const store = item.store;
                      const plan = item.plan;
                      const isB2c = item.isB2c;

                      return (
                        <tr
                          key={store.id}
                          className={cx(
                            'hover:bg-canvas transition-colors',
                            !isB2c && 'bg-sunken/40'
                          )}
                        >
                          {/* 1. B2C PHỤ TRÁCH */}
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={(e) => handleToggleB2cManaged(store, e)}
                              className={cx(
                                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-2xs font-medium transition-colors cursor-pointer border',
                                isB2c
                                  ? 'bg-positive-soft text-positive border-positive/30 hover:bg-positive-soft/80'
                                  : 'bg-sunken text-ink-3 border-line hover:bg-sunken/80 hover:text-ink'
                              )}
                              title={isB2c ? 'Bấm để chuyển sang miễn trừ không làm kế hoạch B2C' : 'Bấm để đưa vào diện B2C phụ trách & cần làm kế hoạch'}
                            >
                              {isB2c ? (
                                <>
                                  <ToggleRight className="w-4 h-4 text-positive shrink-0" />
                                  <span>B2C cần kế hoạch</span>
                                </>
                              ) : (
                                <>
                                  <ToggleLeft className="w-4 h-4 text-ink-3 shrink-0" />
                                  <span>Miễn trừ kế hoạch</span>
                                </>
                              )}
                            </button>
                          </td>

                          {/* 2. GIAN HÀNG & KÊNH BÁN */}
                          <td className="py-3 px-4">
                            <div className="font-medium text-ink text-[13px]">
                              {store.storeName}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <ChannelTag channel={store.platform} />
                              <span className="text-2xs text-ink-3 font-code">
                                {store.serviceModel || 'Full Service'}
                              </span>
                            </div>
                          </td>

                          {/* 3. THƯƠNG HIỆU & NGÀNH */}
                          <td className="py-3 px-4">
                            <div className="font-medium text-ink text-[13px]">
                              {store.brandName}
                            </div>
                            <div className="text-2xs text-ink-3 mt-0.5">
                              {store.category || 'Mỹ phẩm & Chăm sóc'}
                            </div>
                          </td>

                          {/* 4. NHÂN SỰ PHỤ TRÁCH */}
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-xs text-ink">
                                <span className="text-ink-3">B2C:</span>
                                <Person name={store.b2cOwners?.[0] || store.b2cOwnerName || 'Chưa phân công'} sub="PIC" />
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-ink">
                                <span className="text-ink-3">Growth:</span>
                                <Person name={store.growthPic || 'Chưa gán'} />
                              </div>
                              <div className="flex items-center gap-1.5 mt-1">
                                {plan?.hasBookingLeader ?? store.hasBookingLeader ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium bg-sunken text-ink-2">
                                    Trưởng nhóm: {plan?.bookingLeader?.split(' (')[0] || store.bookingLeader || 'Nguyễn Thị Ngọc Tâm'}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium bg-sunken text-ink-3">
                                    Duyệt trực tiếp
                                  </span>
                                )}
                                {(currentUser?.role === 'MANAGER' || currentUser?.role === 'ADMIN') && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const currentHas = Boolean(plan?.hasBookingLeader ?? store.hasBookingLeader);
                                      const nextHas = !currentHas;
                                      const newLeader = nextHas ? (plan?.bookingLeader || store.bookingLeader || 'Nguyễn Thị Ngọc Tâm') : undefined;

                                      if (plan && onUpdatePlan) {
                                        onUpdatePlan(plan.id, {
                                          hasBookingLeader: nextHas,
                                          bookingLeader: newLeader,
                                          leaderApprovalStatus: nextHas ? 'CHƯA_DUYỆT' : 'KHÔNG_ÁP_DỤNG'
                                        });
                                      }
                                      if (onUpdateStore) {
                                        onUpdateStore({
                                          ...store,
                                          hasBookingLeader: nextHas,
                                          bookingLeader: newLeader
                                        });
                                      }
                                      if (onNotify) {
                                        onNotify(nextHas
                                          ? `Đã bật yêu cầu Trưởng nhóm sơ duyệt cho ${store.storeName} (${selectedMonth}).`
                                          : `Đã chuyển ${store.storeName} sang duyệt trực tiếp (${selectedMonth}).`);
                                      }
                                    }}
                                    className="text-2xs text-accent hover:underline font-medium cursor-pointer"
                                    title="Đổi mô hình duyệt"
                                  >
                                    {plan?.hasBookingLeader ?? store.hasBookingLeader ? 'Bỏ trưởng nhóm' : 'Gán trưởng nhóm'}
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 5. TRAO ĐỔI VỚI GROWTH */}
                          <td className="py-3 px-4 text-center">
                            {plan ? (
                              plan.growthAlignmentStatus === 'ĐÃ_THỐNG_NHẤT' ? (
                                <Status tone="positive">Đã thống nhất</Status>
                              ) : plan.growthAlignmentStatus === 'ĐANG_TRAO_ĐỔI' ? (
                                <Status tone="warning">Đang trao đổi</Status>
                              ) : (
                                <Status tone="neutral">Đã khởi tạo</Status>
                              )
                            ) : (
                              <span className="text-2xs text-ink-3">Chưa lập</span>
                            )}
                          </td>

                          {/* 6. TRẠNG THÁI KẾ HOẠCH */}
                          <td className="py-3 px-4 text-center">
                            {!isB2c ? (
                              <Status tone="neutral">Miễn trừ</Status>
                            ) : plan ? (
                              <div className="space-y-1">
                                {getStatusBadge(plan.status)}
                                {plan.status === 'PENDING_APPROVAL' && (
                                  <div className="text-2xs text-accent font-medium">Đã gửi duyệt</div>
                                )}
                              </div>
                            ) : (
                              <Status tone="critical">Chưa có kế hoạch</Status>
                            )}
                          </td>

                          {/* 7. NGÂN SÁCH / GMV */}
                          <td className="py-3 px-4 text-right tabular-nums">
                            {plan ? (
                              <div>
                                <div className="font-medium text-ink text-[13px]">
                                  {formatVndShort(plan.totalTargetBudget)}
                                </div>
                                <div className="text-2xs text-positive">
                                  GMV: {formatVndShort(plan.targetGmv)}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="text-ink-3 text-[13px]">
                                  {formatVndShort(store.monthlyBudget || 0)}
                                </div>
                                <div className="text-2xs text-ink-3">
                                  Mục tiêu: {formatVndShort(store.monthlyTargetGmv || 0)}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* 8. THAO TÁC */}
                          <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              {plan ? (
                                <>
                                  {plan.status === 'PENDING_APPROVAL' && (
                                    <Button
                                      size="sm"
                                      variant="primary"
                                      icon={ShieldCheck}
                                      onClick={() => onSelectPlan(plan)}
                                      title="Mở kế hoạch để xem và duyệt"
                                    >
                                      Xem và duyệt
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    icon={ArrowRight}
                                    onClick={() => onSelectPlan(plan)}
                                    title="Mở bảng phân rã chi tiết"
                                  >
                                    Mở kế hoạch
                                  </Button>
                                </>
                              ) : isB2c ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    icon={Plus}
                                    onClick={(e) => handleCreatePlanForStore(store, e)}
                                    title="Tạo kế hoạch mới cho gian hàng này trong tháng"
                                  >
                                    Tạo kế hoạch
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    icon={Bell}
                                    onClick={(e) => handleRemindSubmission(store, e)}
                                    title="Gửi thông báo nhắc nhở nộp kế hoạch cho PIC"
                                  >
                                    Nhắc nộp
                                  </Button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleB2cManaged(store, e)}
                                  className="text-2xs text-ink-3 hover:text-ink hover:underline cursor-pointer"
                                >
                                  Bật làm kế hoạch
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

            {/* Phân trang */}
            <Pagination
              page={governancePage}
              pageSize={GOVERNANCE_PAGE_SIZE}
              total={filteredStoreGovernance.length}
              onPageChange={setGovernancePage}
            />
          </Panel>
        </div>
      ) : (
        /* ========================================================================= */
        /* TAB 2: DANH MỤC KẾ HOẠCH ĐÃ PHÂN RÃ (GRID / TABLE)                        */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* CHỈ SỐ TÀI CHÍNH KẾ HOẠCH */}
          {(() => {
            const months = [...new Set(plans.map(p => p.month))].sort();
            const series = (pick: (p: InputPlanBreakdownState) => number) =>
              months.map(m => plans.filter(p => p.month === m).reduce((acc, p) => acc + (pick(p) || 0), 0));
            const pool = selectedMonth === 'ALL' ? plans : plans.filter(p => p.month === selectedMonth);

            return (
              <section className="bg-surface border border-line rounded-xl overflow-hidden">
                <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-ink-3" />
                    <span className="text-[13px] font-medium text-ink">
                      Chỉ số tài chính kế hoạch {selectedMonth === 'ALL' ? 'toàn kỳ' : selectedMonth}
                    </span>
                    <span className="text-2xs text-ink-3">({pool.length} kế hoạch)</span>
                  </div>

                  <div className="flex items-center gap-3 text-2xs text-ink-3 flex-wrap">
                    <span>Ngân sách: <strong className="text-ink font-medium">{formatVndShort(monthlyMetrics.totalBudget)}</strong></span>
                    <span>•</span>
                    <span>GMV: <strong className="text-positive font-medium">{formatVndShort(monthlyMetrics.totalGmv)}</strong></span>
                    <span>•</span>
                    <span>ROI: <strong className="text-ink font-medium">{String(monthlyMetrics.avgRoi).replace('.', ',')}x</strong></span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsCatalogStatsExpanded(prev => !prev)}
                    >
                      {isCatalogStatsExpanded ? 'Thu gọn' : 'Chi tiết chỉ số'}
                      <ChevronDown className={cx('w-3.5 h-3.5 ml-1 transition-transform', isCatalogStatsExpanded && 'rotate-180')} />
                    </Button>
                  </div>
                </div>

                {isCatalogStatsExpanded && (
                  <div className="p-4 border-t border-line bg-canvas/40 space-y-4">
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

                    <div className="bg-surface border border-line rounded-xl px-4 py-3 grid gap-2">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-xs font-medium text-ink">Ngân sách theo kênh</span>
                        <span className="text-2xs text-ink-3">{months.length > 1 ? `Xu hướng: ${months[0]} → ${months[months.length - 1]}` : ''}</span>
                      </div>
                      <ChannelBar
                        format={formatVndShort}
                        values={pool.flatMap(p => (p.items || []).map(it => ({ channel: it.channel, value: it.totalBudget || 0 })))}
                      />
                    </div>
                  </div>
                )}
              </section>
            );
          })()}

          {/* BỘ LỌC VÀ CHUYỂN ĐỔI CHẾ ĐỘ XEM */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
              <FilterBar
                search={{
                  value: searchQuery,
                  onChange: setSearchQuery,
                  placeholder: 'Tìm theo tên kế hoạch, thương hiệu, PIC...',
                }}
                filters={
                  <>
                    <Select
                      value={selectedBrand}
                      onChange={(e) => setSelectedBrand(e.target.value)}
                      aria-label="Lọc theo thương hiệu"
                    >
                      <option value="ALL">Tất cả thương hiệu ({brandList.length})</option>
                      {brandList.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </Select>

                    <Select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      aria-label="Lọc theo trạng thái"
                    >
                      <option value="ALL">Tất cả trạng thái</option>
                      <option value="PENDING_PRE_APPROVAL">Chờ sơ duyệt</option>
                      <option value="PRE_APPROVED">Sơ duyệt đạt</option>
                      <option value="REVISION_REQUESTED">Cần sửa</option>
                      <option value="PENDING_APPROVAL">Chờ duyệt Lead</option>
                      <option value="IN_EXECUTION">Đang chạy</option>
                      <option value="LEAD_APPROVED">Đã duyệt</option>
                      <option value="DRAFT">Bản nháp</option>
                      <option value="COMPLETED">Hoàn tất</option>
                    </Select>

                    <Select
                      value={selectedPic}
                      onChange={(e) => setSelectedPic(e.target.value)}
                      aria-label="Lọc theo PIC"
                    >
                      <option value="ALL">Tất cả PIC ({picList.length})</option>
                      {picList.map(pic => (
                        <option key={pic} value={pic}>{pic}</option>
                      ))}
                    </Select>
                  </>
                }
              />
            </div>

            <Segmented
              items={[
                { key: 'GRID', label: 'Thẻ' },
                { key: 'TABLE', label: 'Bảng' }
              ]}
              value={viewMode}
              onChange={setViewMode}
            />
          </div>

          {/* DANH SÁCH KẾ HOẠCH */}
          {filteredPlans.length === 0 ? (
            <div className="bg-surface rounded-xl p-12 text-center border border-line space-y-3">
              <div className="w-12 h-12 rounded-xl bg-sunken text-ink-3 flex items-center justify-center mx-auto">
                <StoreIcon className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-ink">Không tìm thấy kế hoạch phù hợp</p>
                <p className="text-xs text-ink-3 max-w-md mx-auto">
                  Không có kế hoạch nào khớp với bộ lọc tháng &quot;{selectedMonth}&quot; hoặc từ khóa tìm kiếm.
                </p>
              </div>
              <div className="pt-2">
                <Button variant="primary" icon={Plus} onClick={() => setIsCreateModalOpen(true)}>
                  Lập kế hoạch tháng này
                </Button>
              </div>
            </div>
          ) : viewMode === 'GRID' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlans.map(plan => {
                const currentTotalBudget = (plan.items || []).reduce((acc, it) => acc + (it.totalBudget || 0), 0);
                const currentTotalQty = (plan.items || []).reduce((acc, it) => acc + (it.qty || 0), 0);
                const budgetMatchPct = plan.totalTargetBudget > 0
                  ? Math.min(Math.round((currentTotalBudget / plan.totalTargetBudget) * 100), 100)
                  : 100;
                const qtyMatchPct = plan.totalTargetContents > 0
                  ? Math.min(Math.round((currentTotalQty / plan.totalTargetContents) * 100), 100)
                  : 100;

                return (
                  <div
                    key={plan.id}
                    className="bg-surface rounded-xl border border-line hover:border-line-strong transition-colors flex flex-col justify-between overflow-hidden"
                  >
                    {/* Header thẻ */}
                    <div className="p-4 border-b border-line space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-ink">
                          {plan.brandName}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded text-2xs font-medium bg-sunken text-ink-3">
                            {plan.month}
                          </span>
                          {getStatusBadge(plan.status)}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-ink line-clamp-1">
                          {plan.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5 text-2xs text-ink-3 flex-wrap">
                          <div className="flex items-center gap-1">
                            <span>PIC:</span>
                            <Person name={plan.pic || 'PIC'} />
                          </div>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <span>Growth:</span>
                            <Person name={plan.growthPic?.split(' ')[0] || 'Team'} />
                          </div>
                          <span>•</span>
                          <span>{plan.week}</span>
                        </div>
                      </div>
                    </div>

                    {/* Thân thẻ: Chỉ số */}
                    <div className="p-4 space-y-3 bg-canvas/30">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-ink-3">Ngân sách kế hoạch:</span>
                          <span className="font-semibold text-ink tabular-nums">
                            {formatVndShort(plan.totalTargetBudget)}
                          </span>
                        </div>
                        <Progress value={currentTotalBudget} max={plan.totalTargetBudget || 1} target={0.95} label="Ngân sách đã phân rã" />
                        <div className="flex items-center justify-between text-2xs text-ink-3 tabular-nums">
                          <span>Đã phân rã {formatVndShort(currentTotalBudget)}</span>
                          <span className="font-medium text-ink">{budgetMatchPct}%</span>
                        </div>
                      </div>

                      {/* Số lượng nội dung & GMV */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="bg-surface p-2.5 rounded-lg border border-line text-xs">
                          <span className="text-ink-3 block text-2xs">Chỉ tiêu video</span>
                          <span className="text-[13px] font-semibold text-ink tabular-nums">
                            {currentTotalQty} / {plan.totalTargetContents}
                          </span>
                          <span className="block text-2xs text-ink-3 mt-0.5 tabular-nums">Khớp {qtyMatchPct}%</span>
                        </div>
                        <div className="bg-surface p-2.5 rounded-lg border border-line text-xs">
                          <span className="text-ink-3 block text-2xs">Mục tiêu GMV</span>
                          <span className="text-[13px] font-semibold text-positive tabular-nums">
                            {formatVndShort(plan.targetGmv)}
                          </span>
                          <span className="block text-2xs text-positive mt-0.5 tabular-nums">
                            ROI: {(plan.targetGmv / (plan.totalTargetBudget || 1)).toFixed(1)}x
                          </span>
                        </div>
                      </div>

                      {/* Phân bổ kênh */}
                      <div className="pt-1">
                        <ChannelBar values={(plan.items || []).map(it => ({ channel: it.channel, value: it.qty || 0 }))} height={6} />
                      </div>
                    </div>

                    {/* Chân thẻ: Thao tác */}
                    <div className="p-3 bg-surface border-t border-line flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Copy}
                          onClick={() => {
                            setCloningPlan(plan);
                            setCloneTargetMonth(plan.month === '2026/10' ? '2026/11' : '2026/10');
                          }}
                          title="Nhân bản sang tháng sau"
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={MessageSquare}
                          onClick={() => setHistoryPlanId(plan.id)}
                          title="Xem lịch sử trao đổi & duyệt"
                        >
                          Trao đổi ({plan.discussions?.length || 0})
                        </Button>
                      </div>

                      <Button
                        size="sm"
                        variant="primary"
                        icon={ArrowRight}
                        onClick={() => onSelectPlan(plan)}
                      >
                        Vào phân rã
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* DẠNG BẢNG */
            <Panel flush>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface text-ink-3 border-b border-line font-medium text-[12.5px]">
                      <th className="py-2.5 px-4">Tháng / kế hoạch</th>
                      <th className="py-2.5 px-4">Thương hiệu</th>
                      <th className="py-2.5 px-4">Nhân sự</th>
                      <th className="py-2.5 px-4 text-right">Ngân sách trần</th>
                      <th className="py-2.5 px-4 text-right">Đã phân rã</th>
                      <th className="py-2.5 px-4 text-center">Chỉ tiêu video</th>
                      <th className="py-2.5 px-4 text-right">GMV mục tiêu</th>
                      <th className="py-2.5 px-4 text-center">Trạng thái</th>
                      <th className="py-2.5 px-4 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredPlans.map(plan => {
                      const currentTotalBudget = (plan.items || []).reduce((acc, it) => acc + (it.totalBudget || 0), 0);
                      const currentTotalQty = (plan.items || []).reduce((acc, it) => acc + (it.qty || 0), 0);

                      return (
                        <tr
                          key={plan.id}
                          className="hover:bg-canvas transition-colors cursor-pointer"
                          onClick={() => onSelectPlan(plan)}
                        >
                          <td className="py-3 px-4">
                            <div className="font-medium text-ink text-[13px]">
                              {plan.title}
                            </div>
                            <div className="text-2xs text-ink-3 mt-0.5 font-code">
                              {plan.id} • {plan.week}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium text-ink">
                            {plan.brandName}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="text-ink-3">PIC:</span>
                              <Person name={plan.pic} />
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-ink-3">Growth:</span>
                              <Person name={plan.growthPic?.split(' ')[0] || 'Team'} />
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-ink tabular-nums">
                            {formatVndShort(plan.totalTargetBudget)}
                          </td>
                          <td className="py-3 px-4 text-right text-ink tabular-nums">
                            {formatVndShort(currentTotalBudget)}
                          </td>
                          <td className="py-3 px-4 text-center tabular-nums">
                            <span className="font-medium text-ink">{currentTotalQty}</span>
                            <span className="text-ink-3"> / {plan.totalTargetContents}</span>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-positive tabular-nums">
                            {formatVndShort(plan.targetGmv)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {getStatusBadge(plan.status)}
                          </td>
                          <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                icon={MessageSquare}
                                onClick={() => setHistoryPlanId(plan.id)}
                                title="Xem lịch sử trao đổi"
                              >
                                ({plan.discussions?.length || 0})
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                icon={ArrowRight}
                                onClick={() => onSelectPlan(plan)}
                              >
                                Mở kế hoạch
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </div>
      )}

      {/* 3. MODAL: LẬP KẾ HOẠCH THÁNG MỚI */}
      <Modal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Lập kế hoạch tháng mới"
        description="Thiết lập ngân sách trần và mục tiêu cho chu kỳ tháng"
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleCreateSubmit}>
              Tạo và mở phân rã
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateSubmit} className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Chu kỳ tháng:">
              <Select
                value={newPlanMonth}
                onChange={(e) => setNewPlanMonth(e.target.value)}
              >
                <option value="2026/10">Tháng 10/2026 (Hiện tại)</option>
                <option value="2026/11">Tháng 11/2026 (Sắp tới)</option>
                <option value="2026/12">Tháng 12/2026</option>
                <option value="2027/01">Tháng 01/2027</option>
                <option value="2026/09">Tháng 09/2026</option>
              </Select>
            </Field>

            <Field label="Tuần áp dụng:">
              <Input
                type="text"
                value={newPlanWeek}
                onChange={(e) => setNewPlanWeek(e.target.value)}
                placeholder="VD: W42 [12.10 - 18.10]"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Thương hiệu:">
              <Select
                value={newPlanBrand}
                onChange={(e) => setNewPlanBrand(e.target.value)}
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
              </Select>
            </Field>

            <Field label="Chuyên viên B2C phụ trách:">
              <Select
                value={newPlanPic}
                onChange={(e) => setNewPlanPic(e.target.value)}
              >
                <option value="Đặng Mai Hà Linh">Đặng Mai Hà Linh</option>
                <option value="Phương Thảo">Phương Thảo</option>
                <option value="Khánh Vy">Khánh Vy</option>
                <option value="Nguyễn Thu Trang">Nguyễn Thu Trang</option>
                <option value="Trần Minh Đức">Trần Minh Đức</option>
                <option value="Đặng Thị Yến Nhi">Đặng Thị Yến Nhi (Trưởng phòng)</option>
              </Select>
            </Field>
          </div>

          <Field label="Tiêu đề kế hoạch:">
            <Input
              type="text"
              value={newPlanTitle}
              onChange={(e) => setNewPlanTitle(e.target.value)}
              placeholder={`VD: Kế hoạch B2C ${newPlanMonth} - ${newPlanBrand}`}
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Ngân sách (VNĐ):" hint={formatVndShort(newPlanBudget)}>
              <Input
                type="number"
                step="5000000"
                value={newPlanBudget}
                onChange={(e) => setNewPlanBudget(Number(e.target.value))}
              />
            </Field>

            <Field label="Số lượng video:" hint="Nội dung">
              <Input
                type="number"
                value={newPlanQty}
                onChange={(e) => setNewPlanQty(Number(e.target.value))}
              />
            </Field>

            <Field label="Mục tiêu GMV:" hint={`ROI: ${(newPlanGmv / (newPlanBudget || 1)).toFixed(1)}x`}>
              <Input
                type="number"
                step="10000000"
                value={newPlanGmv}
                onChange={(e) => setNewPlanGmv(Number(e.target.value))}
              />
            </Field>
          </div>

          <Field label="Định hướng phân bổ ngân sách:">
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'BALANCED', label: 'Cân bằng các kênh' },
                { id: 'GMV_MAX', label: 'Tối đa GMV' },
                { id: 'MEGA_SALE', label: 'Siêu sale & Live' },
                { id: 'BRAND_PUSH', label: 'Phủ thương hiệu' },
                { id: 'COST_SAVER', label: 'Tiết kiệm chi phí' }
              ].map(p => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setNewPlanPreset(p.id as StrategyPreset)}
                  className={cx(
                    'h-8 px-2.5 rounded-md text-[13px] border transition-colors text-center font-medium',
                    newPlanPreset === p.id
                      ? 'bg-primary text-white border-primary'
                      : 'bg-surface border-line text-ink-2 hover:bg-sunken'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Ghi chú định hướng:">
            <Textarea
              rows={2}
              value={newPlanNotes}
              onChange={(e) => setNewPlanNotes(e.target.value)}
              placeholder="Ghi chú trọng tâm sản phẩm hoặc chiến lược..."
            />
          </Field>
        </form>
      </Modal>

      {/* 4. MODAL: NHÂN BẢN KẾ HOẠCH SANG THÁNG TIẾP THEO */}
      {cloningPlan && (
        <Modal
          open={!!cloningPlan}
          onClose={() => setCloningPlan(null)}
          title="Nhân bản kế hoạch"
          description={`Nhân bản kế hoạch "${cloningPlan.title}" (${cloningPlan.brandName}) sang tháng mới.`}
          size="md"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="ghost" onClick={() => setCloningPlan(null)}>
                Hủy
              </Button>
              <Button variant="primary" onClick={handleCloneSubmit}>
                Xác nhận nhân bản
              </Button>
            </div>
          }
        >
          <Field label="Chọn chu kỳ tháng đích:">
            <Select
              value={cloneTargetMonth}
              onChange={(e) => setCloneTargetMonth(e.target.value)}
            >
              <option value="2026/11">Tháng 11/2026 (Sắp tới)</option>
              <option value="2026/12">Tháng 12/2026 (Cuối năm)</option>
              <option value="2027/01">Tháng 01/2027 (Tết Nguyên Đán)</option>
              <option value="2026/10">Tháng 10/2026</option>
            </Select>
          </Field>
        </Modal>
      )}

      {/* 5. MODAL XEM LỊCH SỬ TRAO ĐỔI & TIẾN TRÌNH DUYỆT */}
      {viewingHistoryPlan && (
        <PlanHistoryModal
          plan={viewingHistoryPlan}
          isOpen={!!viewingHistoryPlan}
          currentUser={currentUser}
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
          onUpdatePlan={(updated) => {
            if (onUpdatePlan) {
              onUpdatePlan(viewingHistoryPlan.id, updated);
            }
          }}
          onNotify={notify}
        />
      )}

      {/* 6. MODAL XÁC NHẬN DUYỆT NHANH */}
      <ConfirmDialog
        open={!!approvingQuickPlan}
        title="Xác nhận phê duyệt nhanh kế hoạch"
        message={`Bạn có chắc chắn muốn phê duyệt nhanh kế hoạch của gian hàng "${approvingQuickPlan?.storeName}"?`}
        confirmLabel="Xác nhận duyệt nhanh"
        onConfirm={() => {
          if (approvingQuickPlan) {
            handleQuickApprovePlan(approvingQuickPlan.planId, approvingQuickPlan.storeName);
            setApprovingQuickPlan(null);
          }
        }}
        onCancel={() => setApprovingQuickPlan(null)}
      />
    </div>
  );
};
