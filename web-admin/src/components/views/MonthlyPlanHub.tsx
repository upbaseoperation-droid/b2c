'use client';

import React, { useState, useMemo, useRef } from 'react';
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
  PageActions,
  Status,
  useFlipList
} from '../ui';
import { formatVndShort } from '../../lib/format';
import {
  Plus,
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
  Layers,
  Store as StoreIcon,
  RefreshCw,
  Database,
  CheckCircle2
} from 'lucide-react';
import {
  InputPlanBreakdownState,
  LarkbaseBookingPlanRecordItem,
  MonthlyPlanStatus,
  PlanDiscussionMessage,
  UserProfile,
  StorePortfolioItem
} from '../../lib/types';

type StrategyPreset = 'BALANCED' | 'GMV_MAX' | 'BRAND_PUSH' | 'COST_SAVER' | 'MEGA_SALE';
import { AVAILABLE_MONTHS, getPlanVersionSnapshots } from '../../lib/monthlyPlanData';
import { autoBalancePlanItems, INITIAL_INPUT_PLAN_ITEMS } from '../../lib/inputPlanDefaults';
import { INITIAL_STORE_PORTFOLIOS } from '../../lib/mockData';
import { PlanHistoryModal } from './PlanHistoryModal';

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

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

interface B2cWorkloadBreakdown {
  totalBudget: number;
  allocatedBudget: number;
  totalVideos: number;
  affPaidQty: number;
  affPaidBudget: number;
  focQty: number;
  selfQty: number;
  selfBudget: number;
  otherQty: number;
  otherBudget: number;
}

function getB2cPlanBreakdown(plan: InputPlanBreakdownState | null, store?: StorePortfolioItem): B2cWorkloadBreakdown {
  const items = plan?.items || [];
  const isShopeeStore = (store?.platform || plan?.storeName || '').toLowerCase().includes('shopee');

  // 1. Video Affiliate trả phí (KOC trả phí KL1 -> KL7)
  const affPaidItems = items.filter(
    it => it.channel === 'TIKTOK' && !it.tierCode.includes('TAP') && it.id !== 'row-tt-tap' && (it.totalBudget > 0 || (plan?.budgetAffiliate || 0) > 0)
  );
  // 2. FOC (Gửi mẫu miễn phí 0đ / TAP)
  const focItems = items.filter(
    it => it.tierCode.includes('TAP') || it.id === 'row-tt-tap' || (it.channel === 'TIKTOK' && it.totalBudget === 0 && (plan?.budgetAffiliate || 0) === 0)
  );
  // 3. Self-channel (Kênh Brand tự xây)
  const selfItems = items.filter(it => it.channel === 'SELF_CHANNEL');
  // 4. Các kênh khác (Shopee, Facebook, Instagram, Threads...)
  const otherItems = items.filter(it => ['SHOPEE', 'FACEBOOK', 'INSTAGRAM', 'THREADS'].includes(it.channel));

  const affPaidItemsQty = affPaidItems.reduce((s, i) => s + (i.qty || 0), 0);
  const affPaidItemsBudget = affPaidItems.reduce((s, i) => s + (i.totalBudget || 0), 0);
  const focItemsQty = focItems.reduce((s, i) => s + (i.qty || 0), 0);
  const selfItemsQty = selfItems.reduce((s, i) => s + (i.qty || 0), 0);
  const selfItemsBudget = selfItems.reduce((s, i) => s + (i.totalBudget || 0), 0);
  const otherItemsQty = otherItems.reduce((s, i) => s + (i.qty || 0), 0);
  const otherItemsBudget = otherItems.reduce((s, i) => s + (i.totalBudget || 0), 0);

  const affPaidBudget = !isShopeeStore
    ? (plan?.budgetAffiliate || affPaidItemsBudget || store?.budgetAffiliate || 0)
    : affPaidItemsBudget;
  const affPaidQty = affPaidItemsQty || (!isShopeeStore && affPaidBudget > 0 ? (plan?.targetAffiliateContents || store?.targetAffiliateContents || 0) : 0);

  const inferredFoc = (!isShopeeStore && affPaidBudget === 0 && focItemsQty === 0)
    ? (plan?.targetAffiliateContents || store?.targetFocVideos || 0)
    : 0;
  const focQty = focItemsQty + inferredFoc;

  const selfBudget = plan?.budgetSelfChannel || selfItemsBudget || store?.budgetSelfChannel || 0;
  const selfQty = selfItemsQty || plan?.targetSelfChannelContents || store?.targetSelfChannelContents || 0;

  const otherBudget = otherItemsBudget || (isShopeeStore ? (plan?.budgetAffiliate || plan?.totalTargetBudget || store?.monthlyBudget || 0) : 0);
  const otherQty = otherItemsQty || (isShopeeStore ? (plan?.targetAffiliateContents || plan?.totalTargetContents || 0) : 0);

  const totalBudget = plan?.totalTargetBudget ?? store?.monthlyBudget ?? (affPaidBudget + selfBudget + otherBudget);
  const allocatedBudget = (affPaidItemsBudget || affPaidBudget) + (selfItemsBudget || selfBudget) + (otherItemsBudget || otherBudget);
  const sumVideos = affPaidQty + focQty + selfQty + otherQty;
  const totalVideos = sumVideos > 0 ? sumVideos : (plan?.totalTargetContents || 0);

  return {
    totalBudget,
    allocatedBudget,
    totalVideos,
    affPaidQty,
    affPaidBudget,
    focQty,
    selfQty,
    selfBudget,
    otherQty,
    otherBudget,
  };
}

interface StoreGovernanceItem {
  store: StorePortfolioItem;
  isB2c: boolean;
  plan: InputPlanBreakdownState | null;
  hasPlan: boolean;
  status: MonthlyPlanStatus | 'MISSING';
  breakdown: B2cWorkloadBreakdown;
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
  onImportLarkbasePlans?: (importedPlans: InputPlanBreakdownState[]) => void;
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
  onImportLarkbasePlans,
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
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('TABLE');

  // Tab chuyển góc nhìn: Ma trận gian hàng vs Danh mục kế hoạch
  const [activeHubTab, setActiveHubTab] = useState<'STORE_GOVERNANCE' | 'PLAN_CATALOG'>('STORE_GOVERNANCE');

  // Lọc cho Ma trận gian hàng (mặc định lọc gian B2C làm kế hoạch)
  const [storeGovernanceFilter, setStoreGovernanceFilter] = useState<'ALL' | 'B2C_ONLY' | 'MULTI_VERSION' | 'MISSING_PLAN' | 'PENDING_APPROVAL' | 'APPROVED' | 'EXEMPT'>('B2C_ONLY');
  const [storeSearchQuery, setStoreSearchQuery] = useState<string>('');
  const [governancePage, setGovernancePage] = useState<number>(1);
  const GOVERNANCE_PAGE_SIZE = 15;
  const [approvingQuickPlan, setApprovingQuickPlan] = useState<{ planId: string; storeName: string } | null>(null);

  // Bảng hứng kế hoạch B2C Booking từ Larkbase (API / Webhook)
  const [isLarkbaseModalOpen, setIsLarkbaseModalOpen] = useState<boolean>(false);
  const [larkbaseRecords, setLarkbaseRecords] = useState<LarkbaseBookingPlanRecordItem[]>([]);
  const [larkbaseConvertedPlans, setLarkbaseConvertedPlans] = useState<InputPlanBreakdownState[]>([]);
  const [larkbaseAppToken, setLarkbaseAppToken] = useState<string>('bascnUpbaseB2CPlan41');
  const [larkbaseTableId, setLarkbaseTableId] = useState<string>('tblBookingInputPlan411');
  const [larkbaseViewId, setLarkbaseViewId] = useState<string>('');
  const [hasLiveLarkCredentials, setHasLiveLarkCredentials] = useState<boolean>(false);
  const [isLoadingLarkbase, setIsLoadingLarkbase] = useState<boolean>(false);
  const [isPullingLarkbase, setIsPullingLarkbase] = useState<boolean>(false);

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
        breakdown: getB2cPlanBreakdown(plan, store),
      };
    });
  }, [activeStores, selectedMonth, plans]);

  // Bộ chỉ số quản trị duyệt kế hoạch & tổng hợp 4 đầu việc B2C theo tháng
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
    const multiVersion = b2cList.filter((item: StoreGovernanceItem) => item.plan && getPlanVersionSnapshots(item.plan).length > 1);

    const coveragePct = totalB2cManaged > 0 ? Math.round((withPlan.length / totalB2cManaged) * 100) : 0;
    const approvedPct = totalB2cManaged > 0 ? Math.round((approved.length / totalB2cManaged) * 100) : 0;

    // Tổng hợp thông số 4 đầu việc B2C
    const totalBudget = b2cList.reduce((s, it) => s + it.breakdown.totalBudget, 0);
    const totalVideos = b2cList.reduce((s, it) => s + it.breakdown.totalVideos, 0);
    const affPaidQty = b2cList.reduce((s, it) => s + it.breakdown.affPaidQty, 0);
    const affPaidBudget = b2cList.reduce((s, it) => s + it.breakdown.affPaidBudget, 0);
    const focQty = b2cList.reduce((s, it) => s + it.breakdown.focQty, 0);
    const selfQty = b2cList.reduce((s, it) => s + it.breakdown.selfQty, 0);
    const selfBudget = b2cList.reduce((s, it) => s + it.breakdown.selfBudget, 0);
    const otherQty = b2cList.reduce((s, it) => s + it.breakdown.otherQty, 0);
    const otherBudget = b2cList.reduce((s, it) => s + it.breakdown.otherBudget, 0);

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
      countMultiVersion: multiVersion.length,
      coveragePct,
      approvedPct,
      totalBudget,
      totalVideos,
      affPaidQty,
      affPaidBudget,
      focQty,
      selfQty,
      selfBudget,
      otherQty,
      otherBudget,
    };
  }, [activeStores, storeGovernanceList]);

  // Lọc danh sách ma trận gian hàng
  const filteredStoreGovernance = useMemo<StoreGovernanceItem[]>(() => {
    return storeGovernanceList.filter((item: StoreGovernanceItem) => {
      if (storeGovernanceFilter === 'B2C_ONLY' && !item.isB2c) return false;
      if (storeGovernanceFilter === 'EXEMPT' && item.isB2c) return false;
      if (storeGovernanceFilter === 'MULTI_VERSION' && (!item.plan || getPlanVersionSnapshots(item.plan).length <= 1)) return false;
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
  const governanceBodyRef = useRef<HTMLTableSectionElement>(null);
  useFlipList(governanceBodyRef, paginatedStoreGovernance.map(i => i.store.id).join('|'));

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

  // Modal lịch sử phiên bản & trao đổi
  const [historyPlanId, setHistoryPlanId] = useState<string | null>(null);
  const [historyModalTab, setHistoryModalTab] = useState<'VERSION_HISTORY' | 'APPROVAL_FLOW' | 'DISCUSSION'>('VERSION_HISTORY');
  const viewingHistoryPlan = plans.find(p => p.id === historyPlanId) || null;

  const openVersionModal = (planId: string, tab: 'VERSION_HISTORY' | 'APPROVAL_FLOW' | 'DISCUSSION' = 'VERSION_HISTORY') => {
    setHistoryModalTab(tab);
    setHistoryPlanId(planId);
  };

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
  const plansBodyRef = useRef<HTMLTableSectionElement>(null);
  useFlipList(plansBodyRef, filteredPlans.map(p => p.id).join('|'));

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

  // Tải danh sách bản ghi trong Bảng hứng Kế hoạch B2C Booking từ Larkbase
  const openLarkbaseIngestionModal = async () => {
    setIsLarkbaseModalOpen(true);
    setIsLoadingLarkbase(true);
    try {
      const res = await fetch(`/api/integrations/larkbase/booking-plans?month=${encodeURIComponent(selectedMonth)}`);
      const data = await res.json();
      if (res.ok && data) {
        if (data.config) {
          setLarkbaseAppToken(data.config.appToken || 'bascnUpbaseB2CPlan41');
          setLarkbaseTableId(data.config.tableId || 'tblBookingInputPlan411');
          setLarkbaseViewId(data.config.viewId || '');
          setHasLiveLarkCredentials(Boolean(data.config.hasLarkCredentials));
        }
        setLarkbaseRecords(Array.isArray(data.records) ? data.records : []);
        setLarkbaseConvertedPlans(Array.isArray(data.convertedPlans) ? data.convertedPlans : []);
      }
    } catch {
      notify('Không thể tải bảng hứng kế hoạch Larkbase.');
    } finally {
      setIsLoadingLarkbase(false);
    }
  };

  // Kéo toàn bộ kế hoạch B2C Booking đã duyệt từ Larkbase về hệ thống
  const handlePullApprovedFromLarkbase = async () => {
    setIsPullingLarkbase(true);
    try {
      const res = await fetch('/api/integrations/larkbase/booking-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'PULL',
          appToken: larkbaseAppToken,
          tableId: larkbaseTableId,
          viewId: larkbaseViewId,
          month: selectedMonth,
          actorName: currentUser?.name || 'Đặng Thị Yến Nhi'
        })
      });
      const data = await res.json();
      if (res.ok && data) {
        const nextRecords: LarkbaseBookingPlanRecordItem[] = Array.isArray(data.records) ? data.records : [];
        const nextPlans: InputPlanBreakdownState[] = Array.isArray(data.plans) ? data.plans : [];
        setLarkbaseRecords(nextRecords);
        setLarkbaseConvertedPlans(nextPlans);
        if (onImportLarkbasePlans && nextPlans.length > 0) {
          onImportLarkbasePlans(nextPlans);
        }
        notify(
          data.message ||
            `Đã kéo ${nextPlans.length} kế hoạch B2C Booking đã duyệt từ Larkbase về danh sách kế hoạch tháng.`
        );
      } else {
        notify(data?.error || 'Lỗi khi đồng bộ kế hoạch từ Larkbase.');
      }
    } catch {
      notify('Lỗi kết nối khi kéo kế hoạch từ Larkbase.');
    } finally {
      setIsPullingLarkbase(false);
    }
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
      <PageActions>
        <Button
          variant="secondary"
          size="md"
          icon={Database}
          onClick={() => void openLarkbaseIngestionModal()}
        >
          Bảng hứng Larkbase
        </Button>
        <Button
          variant="primary"
          size="md"
          icon={Plus}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Tạo kế hoạch
        </Button>
      </PageActions>

      {/* 1. THANH ĐIỀU HƯỚNG GỘP 1 DÒNG: CHUYỂN TAB + CHỌN THÁNG */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-2.5">
        <Tabs
          items={[
            { key: 'STORE_GOVERNANCE', label: 'Ma trận gian hàng', count: governanceStats.totalActive },
            { key: 'PLAN_CATALOG', label: 'Danh mục kế hoạch', count: monthlyMetrics.planCount },
          ]}
          value={activeHubTab}
          onChange={setActiveHubTab}
        />

        {/* Bộ chọn tháng */}
        <div className="flex items-center gap-1 overflow-x-auto p-0.5 rounded-lg bg-sunken">
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
                  'h-7 px-2.5 rounded-[5px] text-xs whitespace-nowrap transition-colors flex items-center gap-1.5',
                  isSelected
                    ? 'bg-surface text-ink font-semibold shadow-[0_1px_2px_rgb(22_23_26/0.08)]'
                    : 'text-ink-3 hover:text-ink'
                )}
              >
                <span>{label}</span>
                <span className={cx('text-2xs tabular-nums', isSelected ? 'text-ink-2' : 'text-ink-3')}>
                  {countInMonth}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeHubTab === 'STORE_GOVERNANCE' ? (
        /* ========================================================================= */
        /* TAB 1: MA TRẬN QUẢN TRỊ GIAN HÀNG VÀ TRẠNG THÁI GỬI DUYỆT PLAN            */
        /* ========================================================================= */
        <div className="space-y-4">
          {/* TỔNG HỢP ĐỀ BÀI B2C & 4 ĐẦU VIỆC THỰC THI (GỌN 1 KHỐI) */}
          <section className="bg-surface border border-line rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-sunken/30 text-xs">
              <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                <span className="font-semibold text-ink">
                  Tổng hợp kế hoạch B2C kỳ {selectedMonth === 'ALL' ? 'Toàn bộ' : selectedMonth}
                </span>
                <span className="text-ink-3">•</span>
                <span className="font-semibold text-positive tabular-nums">
                  Đã duyệt {governanceStats.countApproved}/{governanceStats.totalB2cManaged} gian ({governanceStats.approvedPct}%)
                </span>
                {governanceStats.countMissingPlan > 0 && (
                  <span className="text-warning font-medium inline-flex items-center gap-1">
                    • <AlertCircle className="w-3 h-3" /> {governanceStats.countMissingPlan} chưa lập
                  </span>
                )}
              </div>
              <div className="w-32 sm:w-40">
                <Progress
                  value={governanceStats.countApproved}
                  max={governanceStats.totalB2cManaged || 1}
                  label="Tiến độ duyệt kế hoạch"
                />
              </div>
            </div>

            {/* 5 Ô THÔNG SỐ TỔNG & 4 ĐẦU VIỆC B2C (BỎ CHỮ PHỤ RƯỜM RÀ) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-line bg-surface">
              <div className="px-3.5 py-2.5">
                <div className="text-2xs text-ink-3 font-medium">Tổng hạn mức Net B2C</div>
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-ink tabular-nums">{formatVndShort(governanceStats.totalBudget)}</span>
                  <span className="text-xs font-semibold text-accent tabular-nums">{governanceStats.totalVideos.toLocaleString('vi-VN')} video</span>
                </div>
              </div>

              <div className="px-3.5 py-2.5">
                <div className="text-2xs text-ink-3 font-medium flex items-center justify-between">
                  <span>1. KOC trả phí</span>
                  <span className="text-accent font-semibold">KL1–KL7</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-ink tabular-nums">{governanceStats.affPaidQty.toLocaleString('vi-VN')} video</span>
                  <span className="text-xs font-semibold text-ink-2 tabular-nums">{formatVndShort(governanceStats.affPaidBudget)}</span>
                </div>
              </div>

              <div className="px-3.5 py-2.5">
                <div className="text-2xs text-ink-3 font-medium flex items-center justify-between">
                  <span>2. Gửi mẫu FOC</span>
                  <span className="text-positive font-semibold">0đ Cast</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-positive tabular-nums">{governanceStats.focQty.toLocaleString('vi-VN')} video</span>
                  <span className="text-xs font-medium text-ink-3 tabular-nums">0 đ</span>
                </div>
              </div>

              <div className="px-3.5 py-2.5">
                <div className="text-2xs text-ink-3 font-medium flex items-center justify-between">
                  <span>3. Kênh Brand</span>
                  <span className="text-ink-3">Self-channel</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-ink tabular-nums">{governanceStats.selfQty.toLocaleString('vi-VN')} video</span>
                  <span className="text-xs font-semibold text-ink-2 tabular-nums">{formatVndShort(governanceStats.selfBudget)}</span>
                </div>
              </div>

              <div className="px-3.5 py-2.5">
                <div className="text-2xs text-ink-3 font-medium flex items-center justify-between">
                  <span>4. Đa sàn khác</span>
                  <span className="text-ink-3">SP/FB/IG</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-ink tabular-nums">{governanceStats.otherQty.toLocaleString('vi-VN')} video</span>
                  <span className="text-xs font-semibold text-ink-2 tabular-nums">{formatVndShort(governanceStats.otherBudget)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* BẢNG MA TRẬN GIAN HÀNG & PHÂN RÃ 4 ĐẦU VIỆC */}
          <Panel flush>
            {/* Bộ lọc bảng */}
            <div className="p-3 border-b border-line">
              <FilterBar
                search={{
                  value: storeSearchQuery,
                  onChange: (v) => {
                    setStoreSearchQuery(v);
                    setGovernancePage(1);
                  },
                  placeholder: 'Tìm gian hàng, thương hiệu, PIC B2C...',
                }}
                chips={
                  <Chips
                    items={[
                      { key: 'B2C_ONLY', label: 'B2C phụ trách', count: governanceStats.totalB2cManaged },
                      { key: 'MULTI_VERSION', label: 'Nhiều phiên bản', count: governanceStats.countMultiVersion },
                      { key: 'PENDING_APPROVAL', label: 'Chờ duyệt', count: governanceStats.countPendingApproval },
                      { key: 'APPROVED', label: 'Đã duyệt', count: governanceStats.countApproved },
                      { key: 'MISSING_PLAN', label: 'Chưa lập', count: governanceStats.countMissingPlan },
                      { key: 'EXEMPT', label: 'Miễn trừ', count: governanceStats.totalExempt },
                      { key: 'ALL', label: 'Tất cả', count: governanceStats.totalActive },
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

            {/* Nội dung bảng gọn gàng, chỉ 2 dòng mỗi ô */}
            <div className="w-full">
              <table className="w-full table-fixed text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-sunken/70 border-b border-line text-ink-2 font-semibold text-2xs">
                    <th className="py-2.5 px-3 w-[23%]">Gian hàng &amp; Phiên bản</th>
                    <th className="py-2.5 px-2.5 w-[15%]">Chuyên viên / Luồng duyệt</th>
                    <th className="py-2.5 px-2 text-right w-[11%] bg-sunken">Hạn mức Net</th>
                    <th className="py-2.5 px-2 text-right w-[11%]">1. KOC trả phí</th>
                    <th className="py-2.5 px-2 text-center w-[8%]">2. FOC (0đ)</th>
                    <th className="py-2.5 px-2 text-right w-[10%]">3. Kênh Brand</th>
                    <th className="py-2.5 px-2 text-right w-[9%]">4. Đa sàn</th>
                    <th className="py-2.5 px-3 text-right w-[13%]">Trạng thái</th>
                  </tr>
                </thead>
                <tbody ref={governanceBodyRef} className="divide-y divide-line">
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
                      const bd = item.breakdown;
                      const versionSnapshots = plan ? getPlanVersionSnapshots(plan) : [];
                      const versionCount = versionSnapshots.length;
                      const activeVersionCode = plan?.currentVersionCode || 'v1.0';
                      const baselineSnapshot = versionSnapshots[0];
                      const budgetDelta = plan && baselineSnapshot && versionCount > 1
                        ? (plan.totalTargetBudget || bd.totalBudget) - (baselineSnapshot.totalTargetBudget || 0)
                        : 0;
                      const hasLeader = Boolean(plan?.hasBookingLeader ?? store.hasBookingLeader);

                      return (
                        <tr
                          key={store.id}
                          data-flip={store.id}
                          className={cx(
                            'group hover:bg-canvas transition-colors',
                            plan && 'cursor-pointer',
                            !isB2c && 'bg-sunken/30 text-ink-3'
                          )}
                          onClick={() => {
                            if (plan) onSelectPlan(plan);
                          }}
                        >
                          {/* 1. GIAN HÀNG & PHIÊN BẢN (GỌN 2 DÒNG) */}
                          <td className="py-2.5 px-3 align-middle">
                            <div className="flex items-center justify-between gap-1.5 min-w-0">
                              <span className="font-semibold text-ink text-xs truncate" title={store.storeName}>
                                {store.storeName}
                              </span>
                              {plan && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openVersionModal(plan.id, 'VERSION_HISTORY');
                                  }}
                                  className={cx(
                                    'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-semibold border transition-colors shrink-0 cursor-pointer',
                                    versionCount > 1
                                      ? 'bg-accent-soft text-accent border-accent/30 hover:bg-accent-soft/80'
                                      : 'bg-sunken text-ink-2 border-line hover:bg-sunken/80'
                                  )}
                                  title="Quản lý & so sánh các phiên bản kế hoạch trong tháng"
                                >
                                  <Layers className="w-2.5 h-2.5" />
                                  <span>{activeVersionCode}</span>
                                  {versionCount > 1 && <span>({versionCount})</span>}
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 text-2xs text-ink-3 min-w-0">
                              <ChannelTag channel={store.platform} className="text-2xs px-1 py-0" />
                              <span className="truncate">{store.brandName}</span>
                              {budgetDelta !== 0 && (
                                <span
                                  className={cx(
                                    'text-2xs font-semibold px-1 py-0 rounded tabular-nums shrink-0',
                                    budgetDelta > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                  )}
                                >
                                  {budgetDelta > 0 ? `+${formatVndShort(budgetDelta)}` : formatVndShort(budgetDelta)}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleB2cManaged(store, e);
                                }}
                                className={cx(
                                  'ml-auto px-1 py-0 rounded text-[10px] font-medium border transition-opacity shrink-0 cursor-pointer',
                                  isB2c
                                    ? 'opacity-0 group-hover:opacity-100 bg-sunken text-ink-3 border-line hover:text-ink'
                                    : 'opacity-100 bg-sunken text-ink-3 border-line hover:text-ink'
                                )}
                                title={isB2c ? 'Bấm để chuyển sang miễn trừ B2C' : 'Đang miễn trừ. Bấm để bật B2C phụ trách'}
                              >
                                {isB2c ? 'Miễn trừ?' : 'Miễn trừ'}
                              </button>
                            </div>
                          </td>

                          {/* 2. CHUYÊN VIÊN B2C & LUỒNG DUYỆT (GỌN 2 DÒNG) */}
                          <td className="py-2.5 px-2.5 align-middle">
                            <div className="font-medium text-ink text-xs truncate" title={store.b2cOwners?.[0] || store.b2cOwnerName || 'Chưa phân công'}>
                              {store.b2cOwners?.[0] || store.b2cOwnerName || 'Chưa gán'}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5 text-2xs text-ink-3" onClick={(e) => e.stopPropagation()}>
                              <span className="truncate">
                                {hasLeader ? 'Leader: Ngọc Tâm' : 'Duyệt trực tiếp'}
                              </span>
                              {(currentUser?.role === 'MANAGER' || currentUser?.role === 'ADMIN') && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const nextHas = !hasLeader;
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
                                        ? `Đã bật yêu cầu Trưởng nhóm sơ duyệt cho ${store.storeName}.`
                                        : `Đã chuyển ${store.storeName} sang duyệt trực tiếp.`);
                                    }
                                  }}
                                  className="opacity-0 group-hover:opacity-100 text-2xs text-accent hover:underline font-medium cursor-pointer shrink-0"
                                >
                                  Đổi
                                </button>
                              )}
                            </div>
                          </td>

                          {/* 3. HẠN MỨC NET B2C */}
                          <td className="py-2.5 px-2 text-right tabular-nums align-middle bg-sunken/25">
                            <div className="font-semibold text-ink text-xs">
                              {formatVndShort(bd.totalBudget)}
                            </div>
                            <div className="text-2xs font-medium text-accent">
                              {bd.totalVideos} video
                            </div>
                          </td>

                          {/* 4. ĐẦU VIỆC 1: VIDEO AFFILIATE TRẢ PHÍ */}
                          <td className="py-2.5 px-2 text-right tabular-nums align-middle">
                            {bd.affPaidQty > 0 || bd.affPaidBudget > 0 ? (
                              <div>
                                <div className="font-semibold text-ink text-xs">
                                  {bd.affPaidQty} video
                                </div>
                                <div className="text-2xs text-ink-3">
                                  {formatVndShort(bd.affPaidBudget)}
                                </div>
                              </div>
                            ) : (
                              <span className="text-ink-3 text-2xs">—</span>
                            )}
                          </td>

                          {/* 5. ĐẦU VIỆC 2: FOC (0Đ) */}
                          <td className="py-2.5 px-2 text-center tabular-nums align-middle">
                            {bd.focQty > 0 ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-positive-soft text-positive font-semibold text-2xs">
                                {bd.focQty} mẫu
                              </span>
                            ) : (
                              <span className="text-ink-3 text-2xs">—</span>
                            )}
                          </td>

                          {/* 6. ĐẦU VIỆC 3: SELF-CHANNEL */}
                          <td className="py-2.5 px-2 text-right tabular-nums align-middle">
                            {bd.selfQty > 0 || bd.selfBudget > 0 ? (
                              <div>
                                <div className="font-semibold text-ink text-xs">
                                  {bd.selfQty} video
                                </div>
                                <div className="text-2xs text-ink-3">
                                  {formatVndShort(bd.selfBudget)}
                                </div>
                              </div>
                            ) : (
                              <span className="text-ink-3 text-2xs">—</span>
                            )}
                          </td>

                          {/* 7. ĐẦU VIỆC 4: KÊNH KHÁC */}
                          <td className="py-2.5 px-2 text-right tabular-nums align-middle">
                            {bd.otherQty > 0 || bd.otherBudget > 0 ? (
                              <div>
                                <div className="font-semibold text-ink text-xs">
                                  {bd.otherQty} video
                                </div>
                                <div className="text-2xs text-ink-3">
                                  {formatVndShort(bd.otherBudget)}
                                </div>
                              </div>
                            ) : (
                              <span className="text-ink-3 text-2xs">—</span>
                            )}
                          </td>

                          {/* 8. TRẠNG THÁI & THAO TÁC (GỌN 1 DÒNG, KHÔNG LẶP NÚT PHIÊN BẢN) */}
                          <td className="py-2.5 px-3 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {!isB2c ? (
                                <Status tone="neutral">Miễn trừ</Status>
                              ) : plan ? (
                                <>
                                  {getStatusBadge(plan.status)}
                                  {plan.status === 'PENDING_APPROVAL' ? (
                                    <Button
                                      size="sm"
                                      variant="primary"
                                      onClick={() => onSelectPlan(plan)}
                                      className="h-6 px-2 text-2xs font-medium shrink-0"
                                    >
                                      Duyệt
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => onSelectPlan(plan)}
                                      className="h-6 px-2 text-2xs font-medium shrink-0 opacity-0 group-hover:opacity-100"
                                    >
                                      Mở
                                    </Button>
                                  )}
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  icon={Plus}
                                  onClick={(e) => handleCreatePlanForStore(store, e)}
                                  className="h-6 px-2 text-2xs font-medium"
                                >
                                  Lập plan
                                </Button>
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
        /* TAB 2: DANH MỤC KẾ HOẠCH ĐÃ PHÂN RÃ (TABLE / GRID)                        */
        /* ========================================================================= */
        <div className="space-y-4">
          {/* BỘ LỌC VÀ CHUYỂN ĐỔI CHẾ ĐỘ XEM */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-3.5 rounded-xl border border-line">
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
                { key: 'TABLE', label: 'Bảng' },
                { key: 'GRID', label: 'Thẻ' }
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
                const bd = getB2cPlanBreakdown(plan);
                const versionSnapshots = getPlanVersionSnapshots(plan);
                const versionCount = versionSnapshots.length;
                const activeVersionCode = plan.currentVersionCode || 'v1.0';
                const baselineSnapshot = versionSnapshots[0];
                const budgetDelta = baselineSnapshot && versionCount > 1
                  ? (plan.totalTargetBudget || bd.totalBudget) - (baselineSnapshot.totalTargetBudget || 0)
                  : 0;

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
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          <span className="px-1.5 py-0.5 rounded text-2xs font-medium bg-sunken text-ink-3">
                            {plan.month}
                          </span>
                          <button
                            type="button"
                            onClick={() => openVersionModal(plan.id, 'VERSION_HISTORY')}
                            className={cx(
                              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-semibold border transition-colors cursor-pointer',
                              versionCount > 1
                                ? 'bg-accent-soft text-accent border-accent/30 hover:bg-accent-soft/80'
                                : 'bg-sunken text-ink-2 border-line hover:bg-sunken/80'
                            )}
                            title="Quản lý các phiên bản kế hoạch trong tháng"
                          >
                            <Layers className="w-2.5 h-2.5" />
                            <span>{activeVersionCode} ({versionCount})</span>
                          </button>
                          {getStatusBadge(plan.status)}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-ink line-clamp-1">
                          {plan.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5 text-2xs text-ink-3 flex-wrap">
                          <span>B2C: <strong className="text-ink font-medium">{plan.pic}</strong></span>
                          <span>•</span>
                          <span>Growth: <strong className="text-ink-2 font-medium">{plan.growthPic?.split(' (')[0] || 'Team'}</strong></span>
                          {budgetDelta !== 0 && (
                            <>
                              <span>•</span>
                              <span
                                className={cx(
                                  'font-semibold px-1 py-0.2 rounded tabular-nums',
                                  budgetDelta > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                )}
                              >
                                {budgetDelta > 0 ? `+${formatVndShort(budgetDelta)}` : formatVndShort(budgetDelta)} vs v1.0
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Thân thẻ: 4 đầu việc B2C */}
                    <div className="p-4 space-y-3 bg-canvas/30 text-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-line">
                        <span className="text-ink-3">Tổng đề bài B2C:</span>
                        <span className="font-semibold text-ink tabular-nums">
                          {formatVndShort(bd.totalBudget)} · <span className="text-accent">{bd.totalVideos} video</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-surface p-2 rounded-lg border border-line">
                          <span className="text-ink-3 block text-2xs">1. Affiliate (Trả phí)</span>
                          <span className="font-semibold text-ink tabular-nums">{bd.affPaidQty} video</span>
                          <span className="block text-2xs text-ink-3 tabular-nums">{formatVndShort(bd.affPaidBudget)}</span>
                        </div>
                        <div className="bg-surface p-2 rounded-lg border border-line">
                          <span className="text-ink-3 block text-2xs">2. FOC (Mẫu 0đ)</span>
                          <span className="font-semibold text-positive tabular-nums">{bd.focQty} video</span>
                          <span className="block text-2xs text-ink-3 tabular-nums">0 đ</span>
                        </div>
                        <div className="bg-surface p-2 rounded-lg border border-line">
                          <span className="text-ink-3 block text-2xs">3. Self-channel</span>
                          <span className="font-semibold text-ink tabular-nums">{bd.selfQty} video</span>
                          <span className="block text-2xs text-ink-3 tabular-nums">{formatVndShort(bd.selfBudget)}</span>
                        </div>
                        <div className="bg-surface p-2 rounded-lg border border-line">
                          <span className="text-ink-3 block text-2xs">4. Kênh khác</span>
                          <span className="font-semibold text-ink tabular-nums">{bd.otherQty} video</span>
                          <span className="block text-2xs text-ink-3 tabular-nums">{formatVndShort(bd.otherBudget)}</span>
                        </div>
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
                          icon={Layers}
                          onClick={() => openVersionModal(plan.id, 'VERSION_HISTORY')}
                          title="Quản lý các phiên bản kế hoạch trong tháng"
                        >
                          Phiên bản ({versionCount})
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={MessageSquare}
                          onClick={() => openVersionModal(plan.id, 'DISCUSSION')}
                          title="Xem lịch sử trao đổi & duyệt"
                        >
                          {plan.discussions?.length || 0}
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
            /* DẠNG BẢNG GỌN GÀNG KHÔNG CUỘN NGANG */
            <Panel flush>
              <div className="w-full">
                <table className="w-full table-fixed text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-sunken/70 text-ink-2 border-b border-line font-semibold text-2xs">
                      <th className="py-2.5 px-2.5 w-[21%]">Kế hoạch &amp; Phiên bản</th>
                      <th className="py-2.5 px-2 w-[15%]">Nhân sự</th>
                      <th className="py-2.5 px-2 text-right w-[12%] bg-sunken">Tổng đề bài B2C</th>
                      <th className="py-2.5 px-2 text-right w-[11%]">1. Affiliate (Trả phí)</th>
                      <th className="py-2.5 px-2 text-center w-[9%]">2. FOC (0đ)</th>
                      <th className="py-2.5 px-2 text-right w-[10%]">3. Self-channel</th>
                      <th className="py-2.5 px-2 text-right w-[10%]">4. Kênh khác</th>
                      <th className="py-2.5 px-2.5 text-center w-[12%]">Trạng thái &amp; Mở</th>
                    </tr>
                  </thead>
                  <tbody ref={plansBodyRef} className="divide-y divide-line">
                    {filteredPlans.map(plan => {
                      const bd = getB2cPlanBreakdown(plan);
                      const versionSnapshots = getPlanVersionSnapshots(plan);
                      const versionCount = versionSnapshots.length;
                      const activeVersionCode = plan.currentVersionCode || 'v1.0';
                      const baselineSnapshot = versionSnapshots[0];
                      const budgetDelta = baselineSnapshot && versionCount > 1
                        ? (plan.totalTargetBudget || bd.totalBudget) - (baselineSnapshot.totalTargetBudget || 0)
                        : 0;

                      return (
                        <tr
                          key={plan.id}
                          data-flip={plan.id}
                          className="hover:bg-canvas transition-colors cursor-pointer"
                          onClick={() => onSelectPlan(plan)}
                        >
                          <td className="py-2 px-2.5 align-middle">
                            <div className="font-semibold text-ink text-[12px] truncate" title={plan.title}>
                              {plan.title}
                            </div>
                            <div className="text-2xs text-ink-3 mt-0.5 truncate">
                              <span className="font-medium text-ink-2">{plan.brandName}</span> • {plan.month}
                            </div>
                            <div className="flex items-center gap-1 mt-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => openVersionModal(plan.id, 'VERSION_HISTORY')}
                                className={cx(
                                  'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-semibold border transition-colors cursor-pointer',
                                  versionCount > 1
                                    ? 'bg-accent-soft text-accent border-accent/30 hover:bg-accent-soft/80'
                                    : 'bg-sunken text-ink-2 border-line hover:bg-sunken/80'
                                )}
                                title="Quản lý & so sánh các phiên bản kế hoạch trong tháng"
                              >
                                <Layers className="w-2.5 h-2.5" />
                                <span>{activeVersionCode} • {versionCount} bản</span>
                              </button>
                              {budgetDelta !== 0 && (
                                <span
                                  className={cx(
                                    'text-2xs font-semibold px-1 py-0.5 rounded tabular-nums',
                                    budgetDelta > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                  )}
                                >
                                  {budgetDelta > 0 ? `+${formatVndShort(budgetDelta)}` : formatVndShort(budgetDelta)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-2 align-middle">
                            <div className="space-y-0.5 text-2xs leading-tight">
                              <div className="flex items-center gap-1 min-w-0">
                                <span className="text-ink-3 w-10 shrink-0">B2C:</span>
                                <span className="font-medium text-ink truncate">{plan.pic}</span>
                              </div>
                              <div className="flex items-center gap-1 min-w-0">
                                <span className="text-ink-3 w-10 shrink-0">Growth:</span>
                                <span className="text-ink-2 truncate">{plan.growthPic?.split(' (')[0] || 'Team'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums align-middle bg-sunken/25">
                            <div className="font-semibold text-ink text-[12px]">
                              {formatVndShort(bd.totalBudget)}
                            </div>
                            <div className="text-2xs font-medium text-accent">
                              {bd.totalVideos} video
                            </div>
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums align-middle">
                            {bd.affPaidQty > 0 || bd.affPaidBudget > 0 ? (
                              <div>
                                <div className="font-semibold text-ink text-[12px]">{bd.affPaidQty} video</div>
                                <div className="text-2xs text-ink-3">{formatVndShort(bd.affPaidBudget)}</div>
                              </div>
                            ) : (
                              <span className="text-ink-3 text-2xs">—</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center tabular-nums align-middle">
                            {bd.focQty > 0 ? (
                              <div>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-positive-soft text-positive font-semibold text-2xs">
                                  {bd.focQty} video
                                </span>
                                <div className="text-2xs text-ink-3 mt-0.5">0 đ</div>
                              </div>
                            ) : (
                              <span className="text-ink-3 text-2xs">—</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums align-middle">
                            {bd.selfQty > 0 || bd.selfBudget > 0 ? (
                              <div>
                                <div className="font-semibold text-ink text-[12px]">{bd.selfQty} video</div>
                                <div className="text-2xs text-ink-3">{formatVndShort(bd.selfBudget)}</div>
                              </div>
                            ) : (
                              <span className="text-ink-3 text-2xs">—</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums align-middle">
                            {bd.otherQty > 0 || bd.otherBudget > 0 ? (
                              <div>
                                <div className="font-semibold text-ink text-[12px]">{bd.otherQty} video</div>
                                <div className="text-2xs text-ink-3">{formatVndShort(bd.otherBudget)}</div>
                              </div>
                            ) : (
                              <span className="text-ink-3 text-2xs">—</span>
                            )}
                          </td>
                          <td className="py-2 px-2.5 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-col items-center gap-1">
                              {getStatusBadge(plan.status)}
                              <div className="flex items-center justify-center gap-1 w-full">
                                <button
                                  type="button"
                                  onClick={() => openVersionModal(plan.id, 'VERSION_HISTORY')}
                                  title={`Quản lý ${versionCount} phiên bản kế hoạch trong tháng`}
                                  className="h-6 px-1.5 rounded border border-line bg-surface hover:bg-sunken text-ink-2 text-2xs font-semibold inline-flex items-center gap-0.5 shrink-0 cursor-pointer"
                                >
                                  <Layers className="w-3 h-3 text-accent" />
                                  <span>{versionCount}</span>
                                </button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => onSelectPlan(plan)}
                                  className="h-6 px-2 text-2xs font-medium flex-1 justify-center"
                                >
                                  Phân rã
                                </Button>
                              </div>
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

      {/* 5. MODAL QUẢN LÝ PHIÊN BẢN TRONG THÁNG, TIẾN TRÌNH DUYỆT & TRAO ĐỔI */}
      {viewingHistoryPlan && (
        <PlanHistoryModal
          plan={viewingHistoryPlan}
          isOpen={!!viewingHistoryPlan}
          initialTab={historyModalTab}
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
          onOpenPlanInStudio={(targetPlan) => {
            setHistoryPlanId(null);
            onSelectPlan(targetPlan);
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

      {/* 7. MODAL BẢNG HỨNG KẾ HOẠCH B2C BOOKING ĐÃ DUYỆT TỪ LARKBASE */}
      <Modal
        open={isLarkbaseModalOpen}
        onClose={() => setIsLarkbaseModalOpen(false)}
        title="Bảng hứng Kế hoạch B2C Booking từ Larkbase (API / Webhook)"
        description="Hứng các dòng kế hoạch B2C Booking đã được duyệt trên Larkbase (File 4.1 & 4.1.1, lọc B2C phụ trách = 1) và đồng bộ về danh sách Kế hoạch tháng."
        size="xl"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2 w-full">
            <div className="text-2xs text-ink-3">
              Bảng dữ liệu: <code className="px-1.5 py-0.5 rounded bg-sunken text-ink font-mono">LarkbaseBookingPlanRecord</code> → Đồng bộ sang <code className="px-1.5 py-0.5 rounded bg-sunken text-ink font-mono">MonthlyPlan</code> &amp; <code className="px-1.5 py-0.5 rounded bg-sunken text-ink font-mono">MonthlyPlanVersionSnapshot</code>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setIsLarkbaseModalOpen(false)}>
                Đóng
              </Button>
              <Button
                variant="primary"
                icon={RefreshCw}
                disabled={isPullingLarkbase}
                onClick={() => void handlePullApprovedFromLarkbase()}
              >
                {isPullingLarkbase ? 'Đang kéo kế hoạch từ Larkbase...' : 'Kéo kế hoạch đã duyệt về hệ thống'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Khối 1: Cấu hình kết nối API Bitable & Webhook Larkbase Automation */}
          <div className="rounded-lg border border-line bg-sunken/50 p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-semibold text-ink">
                  Cấu hình kết nối Larkbase Bitable API &amp; Webhook tự động
                </span>
                <span
                  className={cx(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium',
                    hasLiveLarkCredentials
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  )}
                >
                  {hasLiveLarkCredentials
                    ? 'Đã cấu hình LARK_APP_ID / SECRET'
                    : 'Đang dùng bộ dữ liệu chuẩn File 4.1.1 (Chờ cấu hình .env)'}
                </span>
              </div>
              <span className="text-2xs text-ink-3">
                Điều kiện lọc: <strong>B2C phụ trách = 1</strong> &amp; <strong>Trạng thái = Đã duyệt</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Larkbase App Token (LARKBASE_PLAN_APP_TOKEN)">
                <Input
                  value={larkbaseAppToken}
                  onChange={e => setLarkbaseAppToken(e.target.value)}
                  placeholder="VD: bascnUpbaseB2CPlan41"
                />
              </Field>
              <Field label="Table ID Kế hoạch 4.1.1 (LARKBASE_PLAN_TABLE_ID)">
                <Input
                  value={larkbaseTableId}
                  onChange={e => setLarkbaseTableId(e.target.value)}
                  placeholder="VD: tblBookingInputPlan411"
                />
              </Field>
              <Field label="Webhook nhận tự động khi duyệt trên Larkbase">
                <Input
                  readOnly
                  value="POST /api/integrations/larkbase/booking-plans"
                />
              </Field>
            </div>
          </div>

          {/* Khối 2: Bảng hứng kế hoạch B2C Booking đã duyệt */}
          <div className="rounded-lg border border-line overflow-hidden bg-surface">
            <div className="px-3.5 py-2.5 border-b border-line bg-sunken/40 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold text-ink">
                Danh sách bản ghi trong Bảng hứng Kế hoạch B2C Booking ({larkbaseRecords.length} bản ghi đã duyệt)
              </div>
              <div className="text-2xs text-ink-3">
                Tách bạch Hạn mức Gross / Net và 4 đầu việc: KOC trả phí (KL1–KL7) • FOC 0đ • Kênh Brand • Đa kênh &amp; Live
              </div>
            </div>

            {isLoadingLarkbase ? (
              <div className="p-8 text-center text-xs text-ink-3">
                Đang tải dữ liệu bảng hứng kế hoạch từ Larkbase...
              </div>
            ) : larkbaseRecords.length === 0 ? (
              <div className="p-8 text-center text-xs text-ink-3">
                Chưa có bản ghi kế hoạch nào cho kỳ {selectedMonth}. Nhấn <strong>&ldquo;Kéo kế hoạch đã duyệt về hệ thống&rdquo;</strong> để đồng bộ từ Larkbase.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-line bg-sunken/60 text-2xs font-semibold text-ink-3 uppercase">
                      <th className="py-2.5 px-3">Record Larkbase &amp; Phiên bản</th>
                      <th className="py-2.5 px-3">Gian hàng &amp; Brand</th>
                      <th className="py-2.5 px-3">Nhân sự B2C &amp; Cấp duyệt</th>
                      <th className="py-2.5 px-3 text-right">Hạn mức Net / Gross</th>
                      <th className="py-2.5 px-3">4 Đầu việc B2C (File 4.1.1)</th>
                      <th className="py-2.5 px-3">Thông tin duyệt Lark</th>
                      <th className="py-2.5 px-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {larkbaseRecords.map((rec, idx) => {
                      const convertedPlan = larkbaseConvertedPlans[idx];
                      const tierSummary = Object.entries(rec.kocTierBreakdown || {})
                        .filter(([, count]) => count > 0)
                        .map(([k, count]) => `${k.toUpperCase()}: ${count}`)
                        .join(' • ');

                      return (
                        <tr key={rec.larkRecordId} className="hover:bg-sunken/30 transition-colors">
                          <td className="py-2.5 px-3 align-top">
                            <div className="font-mono text-2xs text-indigo-700 font-semibold">
                              {rec.larkRecordId}
                            </div>
                            <div className="mt-1 flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 text-2xs font-semibold">
                                {rec.versionCode}
                              </span>
                              <span className="text-2xs text-ink-2 font-medium">{rec.month}</span>
                            </div>
                            <div className="mt-0.5 text-2xs text-ink-3 line-clamp-1" title={rec.versionName}>
                              {rec.versionName}
                            </div>
                          </td>

                          <td className="py-2.5 px-3 align-top">
                            <div className="font-semibold text-ink">{rec.storeName}</div>
                            <div className="text-2xs text-ink-3 mt-0.5">
                              Brand: <span className="text-ink-2 font-medium">{rec.brandName}</span> • {rec.platform}
                            </div>
                            <span className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-medium">
                              B2C phụ trách = 1
                            </span>
                          </td>

                          <td className="py-2.5 px-3 align-top">
                            <div className="text-xs font-medium text-ink">
                              PIC: {rec.b2cPic}
                            </div>
                            <div className="text-2xs text-ink-3 mt-0.5">
                              {rec.bookingLeader ? (
                                <span>
                                  Leader sơ duyệt: <strong className="text-ink-2">{rec.bookingLeader}</strong>
                                </span>
                              ) : (
                                <span className="text-amber-700 font-medium">
                                  Không qua Leader (Trình trực tiếp Lead B2C)
                                </span>
                              )}
                            </div>
                            {rec.focPic && (
                              <div className="text-2xs text-ink-3 mt-0.5">
                                PIC FOC 0đ: {rec.focPic}
                              </div>
                            )}
                          </td>

                          <td className="py-2.5 px-3 align-top text-right tabular-nums">
                            <div className="font-semibold text-emerald-700">
                              Net: {formatVndShort(rec.budgetNet)}
                            </div>
                            <div className="text-2xs text-ink-3 mt-0.5">
                              Gross: {formatVndShort(rec.budgetGross)}
                            </div>
                            <div className="text-2xs text-ink-2 mt-0.5">
                              GMV: {formatVndShort(rec.targetGmv)}
                            </div>
                          </td>

                          <td className="py-2.5 px-3 align-top">
                            <div className="space-y-1 text-2xs">
                              <div>
                                <span className="font-semibold text-ink">1. KOC trả phí:</span>{' '}
                                <span className="text-indigo-700 font-semibold">{rec.affiliatePaidVideos} video</span>{' '}
                                ({formatVndShort(rec.affiliatePaidBudgetNet)})
                                {tierSummary && (
                                  <div className="text-[10px] text-ink-3 font-mono mt-0.5">{tierSummary}</div>
                                )}
                              </div>
                              <div>
                                <span className="font-semibold text-ink">2. Suất FOC 0đ:</span>{' '}
                                <span className="text-emerald-700 font-semibold">{rec.focFreeVideos} video</span> (0đ)
                              </div>
                              <div>
                                <span className="font-semibold text-ink">3. Kênh Brand:</span>{' '}
                                <span className="font-medium text-ink-2">{rec.selfChannelVideos} video</span>{' '}
                                ({formatVndShort(rec.selfChannelBudgetNet)})
                              </div>
                              <div>
                                <span className="font-semibold text-ink">4. Đa kênh &amp; Live:</span>{' '}
                                <span className="font-medium text-ink-2">
                                  {rec.multiPlatformVideos} video • {rec.liveSessions} phiên live
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-2.5 px-3 align-top">
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-2xs font-medium">
                              <CheckCircle2 className="w-3 h-3" />
                              Đã duyệt
                            </div>
                            <div className="text-2xs text-ink-2 font-medium mt-1">
                              {rec.approvedBy}
                            </div>
                            <div className="text-[10px] text-ink-3">
                              {new Date(rec.approvedAt).toLocaleString('vi-VN')}
                            </div>
                          </td>

                          <td className="py-2.5 px-3 align-top text-right">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                if (convertedPlan) {
                                  if (onImportLarkbasePlans) {
                                    onImportLarkbasePlans([convertedPlan]);
                                  }
                                  setIsLarkbaseModalOpen(false);
                                  onSelectPlan(convertedPlan);
                                  notify(`Đã nạp kế hoạch "${convertedPlan.storeName}" (${rec.versionCode}) từ bảng hứng Larkbase.`);
                                }
                              }}
                            >
                              Nạp &amp; Mở phân rã
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
