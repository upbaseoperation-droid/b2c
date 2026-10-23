'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  Progress,
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
  Avatar,
  BrandAvatar,
  useFlipList
} from '../ui';
import { formatVndShort } from '../../lib/format';
import { PlanOrderUploadModal } from './PlanOrderUploadModal';
import { getBreakdownHealth } from '../../lib/planBreakdownRules';
import {
  Plus,
  AlertCircle,
  Copy,
  ArrowRight,
  MessageSquare,
  Layers,
  Store as StoreIcon,
  RefreshCw,
  Database,
  Upload,
  FileText,
  Building2,
  Sparkles,
  Users,
  Target,
  TrendingUp,
  LayoutGrid,
  LayoutList,
  SlidersHorizontal,
  CheckCircle2
} from 'lucide-react';
import {
  InputPlanBreakdownState,
  LarkbaseBookingPlanRecordItem,
  MonthlyPlanStatus,
  PlanDiscussionMessage,
  UserProfile,
  StorePortfolioItem,
  BrandMonthlyPlanItem,
  CampaignItem,
  isCampaignActiveInMonth,
  getCampaignPhaseForMonth,
  normalizeStoreCoefficient
} from '../../lib/types';

type StrategyPreset = 'BALANCED' | 'GMV_MAX' | 'BRAND_PUSH' | 'COST_SAVER' | 'MEGA_SALE';
import {
  AVAILABLE_MONTHS,
  getPlanVersionSnapshots,
  getStorePlanWorkstreamSummary,
  buildPersonalWorkPackages,
  INITIAL_BRAND_MONTHLY_PLANS,
  getWeeksForMonth,
  type B2cWorkstreamType,
  type StorePlanWorkstreamSummary,
  type PersonalWorkPackageItem,
} from '../../lib/monthlyPlanData';
import { B2C_BRAND_POSITION_STAFF_POOL, REAL_B2C_42_BRANDS } from '../../lib/realB2cBrandsData';
import { autoBalancePlanItems, INITIAL_INPUT_PLAN_ITEMS } from '../../lib/inputPlanDefaults';
import { INITIAL_STORE_PORTFOLIOS, INITIAL_CAMPAIGNS, STAFF_MASTER_DIRECTORY } from '../../lib/mockData';
import { PlanHistoryModal } from './PlanHistoryModal';
import { StoreCoefficientHubSection } from '../stores/StoreCoefficientHubSection';
import { BrandOneSheetPlanView } from './BrandOneSheetPlanView';
import { filterScopedPlans, isBrandManagedByUser, isStaffGlobalAdminOrManager } from '../../lib/rbacScope';

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

function generatePlanId(month: string): string {
  const m = month === 'ALL' ? '2026/10' : month;
  return `PLAN-${m.replace('/', '-')}-${Date.now().toString().slice(-4)}`;
}

function generateDiscussionId(): string {
  return `DISC-${Date.now()}`;
}

function buildPlanLookupMap(plans: InputPlanBreakdownState[], month: string) {
  const byStoreId = new Map<string, InputPlanBreakdownState>();
  const byStoreName = new Map<string, InputPlanBreakdownState>();
  const byBrandName = new Map<string, InputPlanBreakdownState>();
  const brandPrefixList: Array<{ prefix: string; brandName: string; plan: InputPlanBreakdownState }> = [];

  for (const p of plans) {
    if (month !== 'ALL' && p.month !== month) continue;
    if (p.storeId) byStoreId.set(p.storeId, p);
    if (p.storeName) byStoreName.set(p.storeName.trim().toLowerCase(), p);
    if (p.brandName) {
      const b = p.brandName.trim().toLowerCase();
      byBrandName.set(b, p);
      const prefix = b.split('_')[0].trim();
      if (prefix.length >= 2) {
        brandPrefixList.push({ prefix, brandName: b, plan: p });
      }
    }
  }

  return (store: StorePortfolioItem): InputPlanBreakdownState | null => {
    if (store.id && byStoreId.has(store.id)) return byStoreId.get(store.id)!;
    const sName = (store.storeName || '').trim().toLowerCase();
    if (sName && byStoreName.has(sName)) return byStoreName.get(sName)!;
    const bName = (store.brandName || '').trim().toLowerCase();
    if (bName && byBrandName.has(bName)) return byBrandName.get(bName)!;

    for (const item of brandPrefixList) {
      if (bName.length >= 2 && item.brandName.length >= 2 && (item.brandName.includes(bName) || bName.includes(item.brandName))) {
        return item.plan;
      }
      if (item.prefix.length >= 2 && sName.includes(item.prefix)) {
        return item.plan;
      }
    }
    return null;
  };
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
  workstreamSummary: StorePlanWorkstreamSummary;
}

/** Tình trạng bảng phân rã tuần của kế hoạch so với số bảng 4.1. */
function BreakdownHealthText({ plan }: { plan: InputPlanBreakdownState }) {
  const h = getBreakdownHealth(plan);
  if (!h) return null;
  let tone = 'text-positive';
  let label = plan.reference41 ? 'Khớp 4.1' : 'Đã phân rã';
  if (h.empty) {
    tone = 'text-warning';
    label = 'Chưa phân rã';
  } else if (h.errors > 0) {
    tone = 'text-critical';
    label = 'Lỗi phân rã: ' + h.errors;
  } else if (h.mismatches > 0) {
    tone = 'text-warning';
    label = 'Lệch 4.1: ' + h.mismatches + ' chỉ tiêu';
  }
  return <span className={'font-medium ' + tone}>{label}</span>;
}

interface MonthlyPlanHubProps {
  plans: InputPlanBreakdownState[];
  storePortfolios?: StorePortfolioItem[];
  campaigns?: CampaignItem[];
  onCampaignsChange?: React.Dispatch<React.SetStateAction<CampaignItem[]>>;
  onSelectPlan: (plan: InputPlanBreakdownState, options?: { focusStaffName?: string; focusWorkstream?: B2cWorkstreamType }) => void;
  onCreatePlan: (newPlan: InputPlanBreakdownState) => void;
  onClonePlan: (sourcePlan: InputPlanBreakdownState, targetMonth: string) => void;
  onUpdatePlanStatus?: (planId: string, newStatus: MonthlyPlanStatus, logMessage?: string, note?: string) => void;
  onUpdatePlan?: (planId: string, updated: Partial<InputPlanBreakdownState>) => void;
  onSendMessage?: (planId: string, msg: Omit<PlanDiscussionMessage, 'id' | 'timestamp'>) => void;
  onImportLarkbasePlans?: (importedPlans: InputPlanBreakdownState[]) => void;
  onUpdateStore?: (store: StorePortfolioItem) => void;
  currentUser?: UserProfile;
  onNotify?: (msg: string) => void;
  onOpenPlanReport?: () => void;
  onOpenListingForPlan?: (plan: InputPlanBreakdownState) => void;
  syncBadge?: React.ReactNode;
  /** Gọi sau khi tải Plan order tổng xong để tải lại danh sách kế hoạch. */
  onPlanOrderUploaded?: () => void;
}

export const MonthlyPlanHub: React.FC<MonthlyPlanHubProps> = ({
  plans,
  storePortfolios,
  campaigns,
  onSelectPlan,
  onCreatePlan,
  onClonePlan,
  onUpdatePlanStatus,
  onUpdatePlan,
  onSendMessage,
  onImportLarkbasePlans,
  onUpdateStore,
  currentUser,
  onNotify,
  onOpenPlanReport,
  onOpenListingForPlan,
  syncBadge,
  onPlanOrderUploaded
}) => {
  const [isPlanOrderUploadOpen, setIsPlanOrderUploadOpen] = useState(false);
  const effectiveCampaigns = useMemo<CampaignItem[]>(() => {
    return campaigns && campaigns.length > 0 ? campaigns : INITIAL_CAMPAIGNS;
  }, [campaigns]);

  // Phân quyền dữ liệu kế hoạch theo nhân sự (Specialist / PIC Growth / B2C)
  const scopedPlans = useMemo(() => {
    return filterScopedPlans(plans, currentUser, storePortfolios);
  }, [plans, currentUser, storePortfolios]);

  // Bộ lọc tháng
  const [selectedMonth, setSelectedMonth] = useState<string>('2026/10');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPic, setSelectedPic] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('TABLE');

  // Chỉ cấp Quản lý / Trưởng nhóm mới được xem Tab "Kế hoạch theo nhân sự" & "Hệ số gian hàng"
  const canViewTeamPlansAndCoefficients = Boolean(
    currentUser &&
      ['ADMIN', 'MANAGER', 'GROWTH_MANAGER', 'MEDIA_MANAGER', 'LEADER'].includes(currentUser.role)
  );

  // Tab chuyển góc nhìn: Ma trận gian hàng vs Kế hoạch theo Brand (3 vị trí) vs Hệ số gian hàng (Bảng 2) vs Kế hoạch theo nhân sự vs Danh mục kế hoạch
  const [rawActiveHubTab, setActiveHubTab] = useState<'STORE_GOVERNANCE' | 'BRAND_PLANS' | 'STORE_COEFFICIENTS' | 'PERSONAL_PLANS' | 'PLAN_CATALOG'>('STORE_GOVERNANCE');
  const activeHubTab =
    !canViewTeamPlansAndCoefficients && (rawActiveHubTab === 'PERSONAL_PLANS' || rawActiveHubTab === 'STORE_COEFFICIENTS')
      ? 'STORE_GOVERNANCE'
      : rawActiveHubTab;

  // State quản lý Kế hoạch tháng theo Brand (3 vị trí gắn theo Brand: Content / Brand main, Plan / Strategy, Key Visual / SIS)
  const [brandMonthlyPlans, setBrandMonthlyPlans] = useState<BrandMonthlyPlanItem[]>(INITIAL_BRAND_MONTHLY_PLANS);
  const [brandPlanSearch, setBrandPlanSearch] = useState<string>('');
  const [brandPlanPositionFilter, setBrandPlanPositionFilter] = useState<'ALL' | 'CONTENT_BRAND_MAIN' | 'PLAN_STRATEGY' | 'KEY_VISUAL_SIS'>('ALL');
  const [brandPlanStaffFilter, setBrandPlanStaffFilter] = useState<string>('ALL');
  const [brandPlanCampaignFilter, setBrandPlanCampaignFilter] = useState<'ALL' | 'HAS_CAMPAIGN' | 'NO_CAMPAIGN'>('ALL');
  const [brandPlanStatusFilter, setBrandPlanStatusFilter] = useState<string>('ALL');
  const [brandViewMode, setBrandViewMode] = useState<'TABLE' | 'CARDS'>('TABLE');
  const [editingBrandPlan, setEditingBrandPlan] = useState<BrandMonthlyPlanItem | null>(null);
  const [oneSheetBrandPlan, setOneSheetBrandPlan] = useState<BrandMonthlyPlanItem | null>(null);

  const brandPositionStaffList = useMemo(() => {
    const set = new Set<string>([
      ...B2C_BRAND_POSITION_STAFF_POOL.contentBrandMain,
      ...B2C_BRAND_POSITION_STAFF_POOL.planStrategy,
      ...B2C_BRAND_POSITION_STAFF_POOL.keyVisualSis,
    ]);
    brandMonthlyPlans.forEach(bp => {
      if (bp.contentBrandMainPic) set.add(bp.contentBrandMainPic);
      if (bp.planStrategyPic) set.add(bp.planStrategyPic);
      if (bp.keyVisualSisPic) set.add(bp.keyVisualSisPic);
    });
    return Array.from(set).sort();
  }, [brandMonthlyPlans]);

  // Danh bạ gian hàng có hiệu lực (kèm cập nhật tại chỗ khi đổi hệ số gian hàng Bảng 2)
  const [localStoreOverrides, setLocalStoreOverrides] = useState<Record<string, StorePortfolioItem>>({});
  const effectiveStores = useMemo<StorePortfolioItem[]>(() => {
    const base = storePortfolios !== undefined ? storePortfolios : INITIAL_STORE_PORTFOLIOS;
    return base.map(s => localStoreOverrides[s.id] || s);
  }, [storePortfolios, localStoreOverrides]);

  const brandPlanKpis = useMemo(() => {
    const list = brandMonthlyPlans.filter(bp => selectedMonth === 'ALL' || bp.month === selectedMonth);
    const total = list.length;
    const totalBudget = list.reduce((s, b) => s + (b.planStrategyPlan.targetBrandBudget || 0), 0);
    const totalGmv = list.reduce((s, b) => s + (b.planStrategyPlan.targetBrandGmv || 0), 0);
    const hasCampaignCount = list.filter(b => b.hasCampaign).length;
    const alwaysOnCount = total - hasCampaignCount;
    const completeCoverageCount = list.filter(
      b => b.contentBrandMainPic && b.planStrategyPic && b.keyVisualSisPic
    ).length;
    const inExecutionCount = list.filter(b => b.status === 'IN_EXECUTION' || b.status === 'APPROVED').length;
    return {
      total,
      totalBudget,
      totalGmv,
      hasCampaignCount,
      alwaysOnCount,
      completeCoverageCount,
      inExecutionCount
    };
  }, [brandMonthlyPlans, selectedMonth]);

  const filteredBrandMonthlyPlans = useMemo(() => {
    const q = brandPlanSearch.trim().toLowerCase();
    return brandMonthlyPlans.filter(bp => {
      if (!isStaffGlobalAdminOrManager(currentUser) && !isBrandManagedByUser(bp.brandName, currentUser, effectiveStores)) {
        return false;
      }
      if (selectedMonth !== 'ALL' && bp.month !== selectedMonth) return false;
      if (brandPlanCampaignFilter === 'HAS_CAMPAIGN' && !bp.hasCampaign) return false;
      if (brandPlanCampaignFilter === 'NO_CAMPAIGN' && bp.hasCampaign) return false;
      if (brandPlanStatusFilter !== 'ALL' && bp.status !== brandPlanStatusFilter) return false;
      if (brandPlanStaffFilter !== 'ALL') {
        if (brandPlanPositionFilter === 'CONTENT_BRAND_MAIN' && bp.contentBrandMainPic !== brandPlanStaffFilter) return false;
        if (brandPlanPositionFilter === 'PLAN_STRATEGY' && bp.planStrategyPic !== brandPlanStaffFilter) return false;
        if (brandPlanPositionFilter === 'KEY_VISUAL_SIS' && bp.keyVisualSisPic !== brandPlanStaffFilter) return false;
        if (
          brandPlanPositionFilter === 'ALL' &&
          bp.contentBrandMainPic !== brandPlanStaffFilter &&
          bp.planStrategyPic !== brandPlanStaffFilter &&
          bp.keyVisualSisPic !== brandPlanStaffFilter
        ) {
          return false;
        }
      }
      if (q) {
        const hay = `${bp.brandName} ${bp.brandCode} ${bp.category} ${bp.campaignCode || ''} ${bp.campaignTitle || ''} ${bp.contentBrandMainPic} ${bp.planStrategyPic} ${bp.keyVisualSisPic} ${bp.contentBrandMainPlan.focusPillars} ${bp.planStrategyPlan.bigIdeaAndKeyMessage} ${bp.keyVisualSisPlan.designTheme}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [brandMonthlyPlans, selectedMonth, brandPlanCampaignFilter, brandPlanStatusFilter, brandPlanStaffFilter, brandPlanPositionFilter, brandPlanSearch, currentUser, effectiveStores]);

  // Bộ lọc cho Tab Kế hoạch của riêng từng nhân sự
  const [personalRoleFilter, setPersonalRoleFilter] = useState<
    'ALL' | 'BOOKING' | 'CONTENT_SELF_CHANNEL' | 'FOC' | 'MULTI_PLATFORM' | 'CONTENT_BRAND_MAIN' | 'PLAN_STRATEGY' | 'KEY_VISUAL_SIS'
  >('ALL');
  const [personalSelectedStaff, setPersonalSelectedStaff] = useState<string>('ALL');
  const [personalWorkstreamFilter, setPersonalWorkstreamFilter] = useState<'ALL' | B2cWorkstreamType>('ALL');
  const [personalSearchQuery, setPersonalSearchQuery] = useState<string>('');

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
  const [larkbaseViewId] = useState<string>('');
  const hasLiveLarkCredentials = false;
  const isLoadingLarkbase = false;
  const [isPullingLarkbase, setIsPullingLarkbase] = useState<boolean>(false);

  // Các gian hàng active
  const activeStores = useMemo<StorePortfolioItem[]>(() => {
    return effectiveStores.filter((s: StorePortfolioItem) => s.accountStatus === 'ACTIVE');
  }, [effectiveStores]);

  // Ma trận từng gian hàng và kế hoạch trong tháng
  const storeGovernanceList = useMemo<StoreGovernanceItem[]>(() => {
    const lookupPlan = buildPlanLookupMap(scopedPlans, selectedMonth);
    return activeStores.map((store: StorePortfolioItem) => {
      const isB2c = store.isB2cManaged !== false && store.requiresB2cPlan !== false;
      const plan = lookupPlan(store);
      return {
        store,
        isB2c,
        plan,
        hasPlan: !!plan,
        status: (plan?.status || 'MISSING') as MonthlyPlanStatus | 'MISSING',
        breakdown: getB2cPlanBreakdown(plan, store),
        workstreamSummary: getStorePlanWorkstreamSummary(plan),
      };
    });
  }, [activeStores, selectedMonth, scopedPlans]);

  // Tổng hợp các Gói kế hoạch cá nhân (Personal Workpackages) của từng nhân sự trong tháng (gồm cả 4 đầu việc theo Gian hàng + 3 vị trí gắn theo Brand)
  const allPersonalPackages = useMemo<PersonalWorkPackageItem[]>(() => {
    const rawPackages = buildPersonalWorkPackages(scopedPlans, selectedMonth, filteredBrandMonthlyPlans);
    if (!canViewTeamPlansAndCoefficients) {
      const myName = (currentUser?.name || '').trim().toLowerCase();
      return rawPackages.filter(pkg => pkg.staffName.trim().toLowerCase() === myName);
    }
    if (currentUser?.role === 'LEADER') {
      const leaderName = (currentUser.name || '').trim().toLowerCase();
      return rawPackages.filter(
        pkg =>
          pkg.staffName.trim().toLowerCase() === leaderName ||
          (pkg.leaderName || '').trim().toLowerCase() === leaderName
      );
    }
    return rawPackages;
  }, [scopedPlans, selectedMonth, filteredBrandMonthlyPlans, canViewTeamPlansAndCoefficients, currentUser]);

  const personalStaffSummaryList = useMemo(() => {
    const map = new Map<string, {
      staffName: string;
      roleGroup: PersonalWorkPackageItem['roleGroup'];
      leaderName?: string;
      storeSet: Set<string>;
      brandPositionCount: number;
      packageCount: number;
      totalQty: number;
      totalBudget: number;
      approvedCount: number;
      workstreams: Set<B2cWorkstreamType>;
    }>();

    for (const pkg of allPersonalPackages) {
      if (personalRoleFilter !== 'ALL' && pkg.roleGroup !== personalRoleFilter) continue;
      const cur = map.get(pkg.staffName) || {
        staffName: pkg.staffName,
        roleGroup: pkg.roleGroup,
        leaderName: pkg.leaderName,
        storeSet: new Set<string>(),
        brandPositionCount: 0,
        packageCount: 0,
        totalQty: 0,
        totalBudget: 0,
        approvedCount: 0,
        workstreams: new Set<B2cWorkstreamType>()
      };
      cur.storeSet.add(pkg.storeName);
      if (pkg.isBrandPosition) {
        cur.brandPositionCount += 1;
      }
      cur.packageCount += 1;
      cur.totalQty += pkg.myQty;
      cur.totalBudget += pkg.myBudget;
      if (['LEAD_APPROVED', 'BRAND_APPROVED', 'APPROVED', 'IN_EXECUTION', 'COMPLETED', 'LOCKED'].includes(pkg.planStatus || '')) {
        cur.approvedCount += 1;
      }
      cur.workstreams.add(pkg.workstream);
      map.set(pkg.staffName, cur);
    }

    return Array.from(map.values())
      .sort((a, b) => b.totalBudget - a.totalBudget || b.totalQty - a.totalQty);
  }, [allPersonalPackages, personalRoleFilter]);

  const filteredPersonalPackages = useMemo(() => {
    const q = personalSearchQuery.trim().toLowerCase();
    return allPersonalPackages.filter(pkg => {
      if (personalRoleFilter !== 'ALL' && pkg.roleGroup !== personalRoleFilter) return false;
      if (personalSelectedStaff !== 'ALL' && pkg.staffName !== personalSelectedStaff) return false;
      if (personalWorkstreamFilter !== 'ALL' && pkg.workstream !== personalWorkstreamFilter) return false;
      if (q) {
        const hay = `${pkg.staffName} ${pkg.storeName} ${pkg.brandName} ${pkg.workstreamLabel} ${pkg.tierOrFormatLabels.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allPersonalPackages, personalRoleFilter, personalSelectedStaff, personalWorkstreamFilter, personalSearchQuery]);

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

  // Modal lập kế hoạch mới
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPlanMonth, setNewPlanMonth] = useState('2026/10');
  const [newPlanWeek, setNewPlanWeek] = useState('W41 [05.10 - 11.10]');
  const [newPlanBrand, setNewPlanBrand] = useState('4PM');
  const [newPlanStoreId, setNewPlanStoreId] = useState('');
  const [newPlanStoreName, setNewPlanStoreName] = useState('');
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [newPlanPic, setNewPlanPic] = useState('Lê Phương Thảo');
  const [newPlanBudget, setNewPlanBudget] = useState(150000000);
  const [newPlanQty, setNewPlanQty] = useState(75);
  const [newPlanGmv, setNewPlanGmv] = useState(900000000);
  const [newPlanPreset, setNewPlanPreset] = useState<StrategyPreset>('BALANCED');
  const [newPlanNotes, setNewPlanNotes] = useState('');

  // Danh sách tuần theo chu kỳ tháng đang chọn trong modal
  const availableWeeks = useMemo(() => {
    return getWeeksForMonth(newPlanMonth);
  }, [newPlanMonth]);

  // Danh mục 42 Thương hiệu chuẩn cho modal lập kế hoạch
  const availableBrands = useMemo(() => {
    const brandMap = new Map<string, { id: string; name: string }>();
    REAL_B2C_42_BRANDS.forEach(b => {
      if (b.name) {
        brandMap.set(b.name.trim(), { id: b.id, name: b.name.trim() });
      }
    });
    effectiveStores.forEach(s => {
      if (s.brandName && !brandMap.has(s.brandName.trim())) {
        brandMap.set(s.brandName.trim(), { id: s.brandId || s.brandName.trim(), name: s.brandName.trim() });
      }
    });
    return Array.from(brandMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [effectiveStores]);

  // Các gian hàng thuộc Thương hiệu đang chọn trong modal
  const brandStoresForNewPlan = useMemo(() => {
    if (!newPlanBrand) return [];
    return effectiveStores.filter(
      s => (s.brandName || '').trim().toLowerCase() === newPlanBrand.trim().toLowerCase()
    );
  }, [effectiveStores, newPlanBrand]);

  // Danh sách chuyên viên B2C chuẩn từ STAFF_MASTER_DIRECTORY
  const availablePics = useMemo(() => {
    const list: Array<{ name: string; title: string }> = [];
    const seen = new Set<string>();

    if (currentUser?.name && !seen.has(currentUser.name)) {
      seen.add(currentUser.name);
      list.push({ name: currentUser.name, title: `${currentUser.name} (${currentUser.role || 'Đang đăng nhập'})` });
    }

    STAFF_MASTER_DIRECTORY.forEach(st => {
      if (!seen.has(st.name)) {
        seen.add(st.name);
        list.push({ name: st.name, title: `${st.name} (${st.roleTitle})` });
      }
    });

    return list;
  }, [currentUser]);

  // Mở modal lập kế hoạch từ nút "+ Tạo kế hoạch" trên thanh công cụ
  const handleOpenCreateModal = () => {
    const targetMonth = selectedMonth === 'ALL' ? '2026/10' : selectedMonth;
    const weeks = getWeeksForMonth(targetMonth);
    const defaultWeek = weeks[1]?.value || weeks[0]?.value || '';
    const defaultBrand = (selectedBrand !== 'ALL' ? selectedBrand : availableBrands[0]?.name) || '4PM';

    setNewPlanMonth(targetMonth);
    setNewPlanWeek(defaultWeek);
    setNewPlanBrand(defaultBrand);

    const brandStores = effectiveStores.filter(
      s => (s.brandName || '').trim().toLowerCase() === defaultBrand.trim().toLowerCase()
    );
    if (brandStores.length === 1) {
      setNewPlanStoreId(brandStores[0].id);
      setNewPlanStoreName(brandStores[0].storeName);
      setNewPlanPic(brandStores[0].b2cOwners?.[0] || brandStores[0].b2cOwnerName || currentUser?.name || 'Lê Phương Thảo');
      setNewPlanTitle(`Kế hoạch B2C ${targetMonth} - ${brandStores[0].storeName}`);
      if (brandStores[0].monthlyBudget) setNewPlanBudget(brandStores[0].monthlyBudget);
      if (brandStores[0].monthlyTargetGmv) setNewPlanGmv(brandStores[0].monthlyTargetGmv);
    } else {
      setNewPlanStoreId('');
      setNewPlanStoreName('');
      setNewPlanPic(brandStores[0]?.b2cOwners?.[0] || brandStores[0]?.b2cOwnerName || currentUser?.name || 'Lê Phương Thảo');
      setNewPlanTitle(`Kế hoạch B2C ${targetMonth} - ${defaultBrand}`);
      setNewPlanBudget(150000000);
      setNewPlanGmv(900000000);
    }
    setNewPlanQty(75);
    setNewPlanNotes(`Kế hoạch khởi tạo cho chu kỳ ${targetMonth}.`);
    setIsCreateModalOpen(true);
  };

  // Tạo kế hoạch cho từng gian hàng cụ thể trong Ma trận gian hàng
  const handleCreatePlanForStore = (store: StorePortfolioItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetMonth = selectedMonth === 'ALL' ? '2026/10' : selectedMonth;
    const weeks = getWeeksForMonth(targetMonth);
    const defaultWeek = weeks[1]?.value || weeks[0]?.value || '';

    setNewPlanMonth(targetMonth);
    setNewPlanWeek(defaultWeek);
    setNewPlanBrand(store.brandName);
    setNewPlanStoreId(store.id);
    setNewPlanStoreName(store.storeName);
    setNewPlanTitle(`Kế hoạch B2C ${targetMonth} - ${store.storeName}`);
    setNewPlanPic(store.b2cOwners?.[0] || store.b2cOwnerName || currentUser?.name || 'Lê Phương Thảo');
    setNewPlanBudget(store.monthlyBudget || 120000000);
    setNewPlanGmv(store.monthlyTargetGmv || 800000000);
    setNewPlanQty(
      store.platform === 'Shopee Mall' || String(store.platform).toUpperCase().includes('SHOPEE')
        ? 40
        : 60
    );
    setNewPlanNotes(`Kế hoạch cho gian hàng ${store.storeName} (${store.platform}) chu kỳ ${targetMonth}.`);
    setIsCreateModalOpen(true);
  };

  const handleMonthChange = (month: string) => {
    setNewPlanMonth(month);
    const weeks = getWeeksForMonth(month);
    if (!weeks.some(w => w.value === newPlanWeek)) {
      setNewPlanWeek(weeks[1]?.value || weeks[0]?.value || '');
    }
    const subject = newPlanStoreName || newPlanBrand;
    setNewPlanTitle(`Kế hoạch B2C ${month} - ${subject}`);
  };

  const handleBrandChange = (brand: string) => {
    setNewPlanBrand(brand);
    const brandStores = effectiveStores.filter(
      s => (s.brandName || '').trim().toLowerCase() === brand.trim().toLowerCase()
    );
    setNewPlanStoreId('');
    setNewPlanStoreName('');
    const targetPic = brandStores[0]?.b2cOwners?.[0] || brandStores[0]?.b2cOwnerName || newPlanPic;
    setNewPlanPic(targetPic);
    if (brandStores[0]?.monthlyBudget) {
      setNewPlanBudget(brandStores[0].monthlyBudget);
    }
    if (brandStores[0]?.monthlyTargetGmv) {
      setNewPlanGmv(brandStores[0].monthlyTargetGmv);
    }
    setNewPlanTitle(`Kế hoạch B2C ${newPlanMonth} - ${brand}`);
  };

  const handleStoreChange = (storeId: string) => {
    setNewPlanStoreId(storeId);
    if (!storeId) {
      setNewPlanStoreName('');
      setNewPlanTitle(`Kế hoạch B2C ${newPlanMonth} - ${newPlanBrand}`);
      return;
    }
    const store = effectiveStores.find(s => s.id === storeId);
    if (store) {
      setNewPlanStoreName(store.storeName);
      setNewPlanTitle(`Kế hoạch B2C ${newPlanMonth} - ${store.storeName}`);
      if (store.b2cOwners?.[0] || store.b2cOwnerName) {
        setNewPlanPic(store.b2cOwners?.[0] || store.b2cOwnerName);
      }
      if (store.monthlyBudget) {
        setNewPlanBudget(store.monthlyBudget);
      }
      if (store.monthlyTargetGmv) {
        setNewPlanGmv(store.monthlyTargetGmv);
      }
    }
  };

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
    scopedPlans.forEach(p => { if (p.brandName) set.add(p.brandName); });
    effectiveStores.forEach(s => { if (s.brandName) set.add(s.brandName); });
    REAL_B2C_42_BRANDS.forEach(b => { if (b.name) set.add(b.name); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [scopedPlans, effectiveStores]);

  const picList = useMemo(() => {
    const set = new Set<string>();
    scopedPlans.forEach(p => { if (p.pic) set.add(p.pic); });
    return Array.from(set);
  }, [scopedPlans]);

  // Danh mục kế hoạch đã lọc
  const filteredPlans = useMemo(() => {
    return scopedPlans.filter(p => {
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
  }, [scopedPlans, selectedMonth, selectedBrand, selectedStatus, selectedPic, searchQuery]);
  const plansBodyRef = useRef<HTMLTableSectionElement>(null);
  useFlipList(plansBodyRef, filteredPlans.map(p => p.id).join('|'));

  // Chỉ số tổng hợp của danh mục theo tháng
  const monthlyMetrics = useMemo(() => {
    const targetPool = selectedMonth === 'ALL'
      ? scopedPlans
      : scopedPlans.filter(p => p.month === selectedMonth);

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
  }, [scopedPlans, selectedMonth]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const balancedItems = autoBalancePlanItems(
      INITIAL_INPUT_PLAN_ITEMS,
      newPlanBudget,
      newPlanQty,
      newPlanPreset
    );

    const subject = newPlanStoreName || newPlanBrand;
    const createdPlan: InputPlanBreakdownState = {
      id: generatePlanId(newPlanMonth),
      title: newPlanTitle || `Kế hoạch B2C ${newPlanMonth} - ${subject}`,
      brandName: newPlanBrand,
      storeId: newPlanStoreId || undefined,
      storeName: newPlanStoreName || undefined,
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
          content: `Khởi tạo kế hoạch tháng ${newPlanMonth} (${newPlanWeek}) cho ${subject} với ngân sách trần ${formatVndShort(newPlanBudget)}, dự kiến ${newPlanQty} nội dung.`,
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
        {syncBadge}
        {onPlanOrderUploaded && currentUser && isStaffGlobalAdminOrManager(currentUser) && (
          <Button variant="primary" size="md" icon={Upload} onClick={() => setIsPlanOrderUploadOpen(true)}>Tải Plan order tổng</Button>
        )}
        <Button variant="secondary" size="md" icon={Database} onClick={() => setIsLarkbaseModalOpen(true)}>Đồng bộ Larkbase</Button>
        {onOpenPlanReport && (
          <Button
            variant="secondary"
            size="md"
            icon={FileText}
            onClick={onOpenPlanReport}
          >
            Báo cáo thẩm định kế hoạch
          </Button>
        )}
        <Button
          variant="primary"
          size="md"
          icon={Plus}
          onClick={handleOpenCreateModal}
        >
          Tạo kế hoạch
        </Button>
      </PageActions>

      {/* 1. THANH ĐIỀU HƯỚNG GỘP 1 DÒNG: CHUYỂN TAB + CHỌN THÁNG */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-2.5">
        <Tabs
          items={[
            { key: 'STORE_GOVERNANCE', label: 'Ma trận gian hàng', count: governanceStats.totalActive },
            { key: 'BRAND_PLANS', label: 'Kế hoạch theo Brand', count: filteredBrandMonthlyPlans.length },
            ...(canViewTeamPlansAndCoefficients
              ? [
                  { key: 'PERSONAL_PLANS' as const, label: 'Kế hoạch theo nhân sự', count: allPersonalPackages.length },
                  { key: 'STORE_COEFFICIENTS' as const, label: 'Hệ số gian hàng', count: activeStores.length },
                ]
              : []),
          ]}
          value={activeHubTab}
          onChange={setActiveHubTab}
        />

        {/* Bộ chọn tháng */}
        <div className="flex items-center gap-1 overflow-x-auto p-0.5 rounded-lg bg-sunken">
          {AVAILABLE_MONTHS.map(m => {
            const isSelected = selectedMonth === m.value;
            const countInMonth = m.value === 'ALL'
              ? scopedPlans.length
              : scopedPlans.filter(p => p.month === m.value).length;
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 divide-y lg:divide-y-0 sm:divide-x divide-line bg-surface">
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
                      { key: 'PENDING_APPROVAL', label: 'Chờ duyệt', count: governanceStats.countPendingApproval },
                      { key: 'APPROVED', label: 'Đã duyệt', count: governanceStats.countApproved },
                      { key: 'MISSING_PLAN', label: 'Chưa lập', count: governanceStats.countMissingPlan },
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

            {/* Nội dung bảng gọn gàng, hiển thị cả người phụ trách từng mảng con */}
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-sunken/70 border-b border-line text-ink-2 font-semibold text-2xs">
                    <th className="py-2.5 px-3 w-[20%]">Gian hàng &amp; Phiên bản</th>
                    <th className="py-2.5 px-2.5 w-[14%]">Đầu mối &amp; Tổ đội</th>
                    <th className="py-2.5 px-2 text-right w-[9%] bg-sunken">Hạn mức Net</th>
                    <th className="py-2.5 px-2 text-right w-[13%]">1. KOC trả phí</th>
                    <th className="py-2.5 px-2 text-center w-[9%]">2. FOC (0đ)</th>
                    <th className="py-2.5 px-2 text-right w-[12%]">3. Kênh Brand</th>
                    <th className="py-2.5 px-2 text-right w-[10%]">4. Đa sàn</th>
                    <th className="py-2.5 px-3 text-right w-[14%]">Trạng thái</th>
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
                      const ws = item.workstreamSummary;
                      const versionSnapshots = plan ? getPlanVersionSnapshots(plan) : [];
                      const versionCount = versionSnapshots.length;
                      const activeVersionCode = plan?.currentVersionCode || 'v1.0';
                      const baselineSnapshot = versionSnapshots[0];
                      const budgetDelta = plan && baselineSnapshot && versionCount > 1
                        ? (plan.totalTargetBudget || bd.totalBudget) - (baselineSnapshot.totalTargetBudget || 0)
                        : 0;
                      const hasLeader = Boolean(plan?.hasBookingLeader ?? store.hasBookingLeader);
                      const shortName = (fullName: string) => {
                        const parts = fullName.trim().split(/\s+/);
                        return parts.length >= 2 ? parts.slice(-2).join(' ') : fullName;
                      };

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
                          {/* 1. GIAN HÀNG & PHIÊN BẢN */}
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
                                  className="inline-flex items-center gap-1 text-2xs font-mono text-ink-3 hover:text-accent hover:underline cursor-pointer shrink-0"
                                  title="Quản lý & so sánh các phiên bản kế hoạch trong tháng"
                                >
                                  <Layers className="w-2.5 h-2.5" />
                                  <span>{activeVersionCode}</span>
                                  {versionCount > 1 && <span>({versionCount})</span>}
                                </button>
                              )}
                            </div>
                            <div
                              className="flex items-center gap-1.5 mt-1 text-2xs text-ink-3 min-w-0"
                              title={`${store.storeName} (${store.brandName}) · ${
                                (plan?.hasCampaign ?? effectiveCampaigns.some(c => isCampaignActiveInMonth(c, selectedMonth === 'ALL' ? '2026/10' : selectedMonth) && c.brand.toLowerCase().includes((store.brandName || '').toLowerCase())))
                                  ? `Campaign: ${plan?.campaignCode || 'Có'}`
                                  : 'Duy trì'
                              } · Hệ số: ${normalizeStoreCoefficient(store.difficultyTier, store.difficultyMultiplier).label}`}
                            >
                              <ChannelTag channel={store.platform} className="text-2xs px-1 py-0" />
                              <span className="truncate">{store.brandName}</span>
                              {budgetDelta !== 0 && (
                                <span
                                  className={cx(
                                    'text-2xs font-semibold tabular-nums shrink-0',
                                    budgetDelta > 0 ? 'text-positive' : 'text-warning'
                                  )}
                                >
                                  · {budgetDelta > 0 ? `+${formatVndShort(budgetDelta)}` : formatVndShort(budgetDelta)}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleB2cManaged(store, e);
                                }}
                                className={cx(
                                  'ml-auto text-2xs text-ink-3 hover:text-ink hover:underline transition-opacity shrink-0 cursor-pointer',
                                  isB2c
                                    ? 'opacity-0 group-hover:opacity-100'
                                    : 'opacity-100'
                                )}
                                title={isB2c ? 'Bấm để chuyển sang miễn trừ B2C' : 'Đang miễn trừ. Bấm để bật B2C phụ trách'}
                              >
                                {isB2c ? 'Miễn trừ?' : 'Miễn trừ'}
                              </button>
                            </div>
                          </td>

                          {/* 2. ĐẦU MỐI GIAN HÀNG & TỔ ĐỘI PHỐI HỢP */}
                          <td className="py-2.5 px-2.5 align-middle">
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="font-medium text-ink text-xs truncate" title={store.b2cOwners?.[0] || store.b2cOwnerName || 'Chưa phân công'}>
                                {store.b2cOwners?.[0] || store.b2cOwnerName || 'Chưa gán'}
                              </span>
                              {ws.allStaffNames.length > 1 && (
                                <span
                                  className="text-2xs text-ink-3 shrink-0"
                                  title={`Gian hàng có ${ws.allStaffNames.length} nhân sự phối hợp: ${ws.allStaffNames.join(', ')}`}
                                >
                                  · {ws.allStaffNames.length} người
                                </span>
                              )}
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

                          {/* 4. ĐẦU VIỆC 1: VIDEO AFFILIATE TRẢ PHÍ (HIỂN THỊ 1–3 PIC BOOKING) */}
                          <td className="py-2 px-2 text-right tabular-nums align-middle">
                            {bd.affPaidQty > 0 || bd.affPaidBudget > 0 ? (
                              <div>
                                <div className="font-semibold text-ink text-xs">
                                  {bd.affPaidQty} video · <span className="text-ink-2 font-medium">{formatVndShort(bd.affPaidBudget)}</span>
                                </div>
                                {ws.affiliatePaid.assignees.length > 0 && (
                                  <div className="flex flex-wrap justify-end gap-1.5 mt-1" onClick={(e) => e.stopPropagation()}>
                                    {ws.affiliatePaid.assignees.map(s => (
                                      <button
                                        key={s.staffName}
                                        type="button"
                                        onClick={() => plan && onSelectPlan(plan, { focusStaffName: s.staffName, focusWorkstream: 'AFFILIATE_PAID' })}
                                        className="text-2xs text-ink-2 hover:text-accent hover:underline transition-colors cursor-pointer"
                                        title={`Mở phần việc KOC trả phí của ${s.staffName}: ${s.qty} video (${formatVndShort(s.budget)})`}
                                      >
                                        {shortName(s.staffName)} ({s.qty})
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-ink-3 text-2xs">—</span>
                            )}
                          </td>

                          {/* 5. ĐẦU VIỆC 2: FOC (0Đ) */}
                          <td className="py-2 px-2 text-center tabular-nums align-middle">
                            {bd.focQty > 0 ? (
                              <div>
                                <div className="font-medium text-ink text-xs">
                                  {bd.focQty} mẫu
                                </div>
                                {ws.focSample.assignees.length > 0 && (
                                  <div className="flex flex-wrap justify-center gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
                                    {ws.focSample.assignees.map(s => (
                                      <button
                                        key={s.staffName}
                                        type="button"
                                        onClick={() => plan && onSelectPlan(plan, { focusStaffName: s.staffName, focusWorkstream: 'FOC_SAMPLE' })}
                                        className="text-2xs text-ink-2 hover:text-accent hover:underline cursor-pointer"
                                        title={`Mở phần việc Gửi mẫu FOC của ${s.staffName}: ${s.qty} mẫu`}
                                      >
                                        {shortName(s.staffName)}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-ink-3 text-2xs">—</span>
                            )}
                          </td>

                          {/* 6. ĐẦU VIỆC 3: SELF-CHANNEL (HIỂN THỊ 1–2 PIC CONTENT DƯỚI VIỆT HOÀNG) */}
                          <td className="py-2 px-2 text-right tabular-nums align-middle">
                            {bd.selfQty > 0 || bd.selfBudget > 0 ? (
                              <div>
                                <div className="font-semibold text-ink text-xs">
                                  {bd.selfQty} video · <span className="text-ink-2 font-medium">{formatVndShort(bd.selfBudget)}</span>
                                </div>
                                {ws.selfChannel.assignees.length > 0 && (
                                  <div className="flex flex-wrap justify-end gap-1.5 mt-1" onClick={(e) => e.stopPropagation()}>
                                    {ws.selfChannel.assignees.map(s => (
                                      <button
                                        key={s.staffName}
                                        type="button"
                                        onClick={() => plan && onSelectPlan(plan, { focusStaffName: s.staffName, focusWorkstream: 'SELF_CHANNEL' })}
                                        className="text-2xs text-ink-2 hover:text-accent hover:underline transition-colors cursor-pointer"
                                        title={`Mở kế hoạch Self-Channel của ${s.staffName} (Leader Partnership: Việt Hoàng): ${s.qty} video`}
                                      >
                                        {shortName(s.staffName)} ({s.qty})
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-ink-3 text-2xs">—</span>
                            )}
                          </td>

                          {/* 7. ĐẦU VIỆC 4: KÊNH KHÁC */}
                          <td className="py-2 px-2 text-right tabular-nums align-middle">
                            {bd.otherQty > 0 || bd.otherBudget > 0 ? (
                              <div>
                                <div className="font-semibold text-ink text-xs">
                                  {bd.otherQty} video
                                </div>
                                <div className="text-2xs text-ink-3">
                                  {formatVndShort(bd.otherBudget)}
                                </div>
                                {ws.multiPlatform.assignees.length > 0 && (
                                  <div className="flex flex-wrap justify-end gap-1 mt-0.5" onClick={(e) => e.stopPropagation()}>
                                    {ws.multiPlatform.assignees.map(s => (
                                      <button
                                        key={s.staffName}
                                        type="button"
                                        onClick={() => plan && onSelectPlan(plan, { focusStaffName: s.staffName, focusWorkstream: 'MULTI_PLATFORM' })}
                                        className="text-2xs text-ink-2 hover:text-accent hover:underline cursor-pointer"
                                        title={`Mở phần việc Đa sàn của ${s.staffName}: ${s.qty} video`}
                                      >
                                        {shortName(s.staffName)} ({s.qty})
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-ink-3 text-2xs">—</span>
                            )}
                          </td>

                          {/* 8. TRẠNG THÁI & THAO TÁC */}
                          <td className="py-2.5 px-3 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {!isB2c ? (
                                <Status tone="neutral">Miễn trừ</Status>
                              ) : plan ? (
                                <>
                                  {getStatusBadge(plan.status)}
                                  {onOpenListingForPlan && (bd.affPaidQty > 0 || bd.focQty > 0) && (
                                    <button
                                      type="button"
                                      onClick={() => onOpenListingForPlan(plan)}
                                      className="h-6 px-2 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-2xs font-semibold shrink-0 whitespace-nowrap transition cursor-pointer"
                                      title="Triển khai Listing KOC theo Plan Final (KL1–KL7)"
                                    >
                                      Listing KOC
                                    </button>
                                  )}
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
                                      className="h-6 px-2 text-2xs font-medium shrink-0"
                                    >
                                      Phân rã
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
      ) : activeHubTab === 'BRAND_PLANS' ? (
        /* ========================================================================= */
        /* TAB: KẾ HOẠCH THÁNG THEO BRAND (3 VỊ TRÍ GẮN THEO BRAND)                 */
        /* ========================================================================= */
        <div key="brand-monthly-plans-root-view" className="space-y-4">
          {/* 1. KHỐI THỐNG KÊ NHANH (KPI STRIP) CẤP BRAND */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-surface border border-line rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-2xs text-ink-3">Thương hiệu B2C</div>
                <div className="text-lg font-semibold text-ink leading-tight tabular-nums">
                  {brandPlanKpis.total} nhãn hàng
                </div>
                <div className="text-3xs text-ink-3 truncate mt-0.5">
                  69 gian hàng phụ trách
                </div>
              </div>
            </div>

            <div className="bg-surface border border-line rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-2xs text-ink-3">Ngân sách Brand ({selectedMonth})</div>
                <div className="text-lg font-semibold text-ink leading-tight tabular-nums">
                  {formatVndShort(brandPlanKpis.totalBudget)}
                </div>
                <div className="text-3xs text-ink-3 truncate mt-0.5">
                  Hạn mức Net toàn khối
                </div>
              </div>
            </div>

            <div className="bg-surface border border-line rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-2xs text-ink-3">Chiến dịch trọng điểm</div>
                <div className="text-lg font-semibold text-ink leading-tight tabular-nums">
                  {brandPlanKpis.hasCampaignCount} có Campaign
                </div>
                <div className="text-3xs text-ink-3 truncate mt-0.5">
                  {brandPlanKpis.alwaysOnCount} nhãn Always-on duy trì
                </div>
              </div>
            </div>

            <div className="bg-surface border border-line rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-2xs text-ink-3">Phủ 3 vị trí nghiệp vụ</div>
                <div className="text-lg font-semibold text-ink leading-tight tabular-nums">
                  {brandPlanKpis.completeCoverageCount}/{brandPlanKpis.total} nhãn
                </div>
                <div className="text-3xs text-ink-3 truncate mt-0.5">
                  Content · Strategy · KV/SIS
                </div>
              </div>
            </div>
          </div>

          {/* 2. THANH ĐIỀU HƯỚNG & BỘ LỌC ĐA NĂNG */}
          <Panel flush>
            {/* Hàng 1: Phân loại vị trí & Chế độ xem */}
            <div className="p-3 border-b border-line flex flex-wrap items-center justify-between gap-3 bg-sunken/30">
              {/* Vị trí nghiệp vụ pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { key: 'ALL' as const, label: 'Tất cả 3 vị trí', badge: brandPlanKpis.total },
                  { key: 'CONTENT_BRAND_MAIN' as const, label: '1. Content / Brand main' },
                  { key: 'PLAN_STRATEGY' as const, label: '2. Plan / Strategy' },
                  { key: 'KEY_VISUAL_SIS' as const, label: '3. Key Visual / SIS' },
                ].map(pos => {
                  const active = brandPlanPositionFilter === pos.key;
                  return (
                    <button
                      key={pos.key}
                      type="button"
                      onClick={() => setBrandPlanPositionFilter(pos.key)}
                      className={cx(
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border',
                        active
                          ? 'bg-primary text-white border-primary shadow-2xs font-semibold'
                          : 'bg-surface border-line text-ink-2 hover:bg-sunken hover:text-ink'
                      )}
                    >
                      <span>{pos.label}</span>
                      {pos.badge !== undefined && (
                        <span className={cx('ml-1.5 text-2xs tabular-nums', active ? 'text-white/80' : 'text-ink-3')}>
                          ({pos.badge})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Chuyển đổi Dạng Bảng / Dạng Thẻ */}
              <div className="flex items-center gap-1 bg-surface border border-line rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setBrandViewMode('TABLE')}
                  className={cx(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer',
                    brandViewMode === 'TABLE'
                      ? 'bg-sunken text-ink font-semibold shadow-2xs'
                      : 'text-ink-3 hover:text-ink'
                  )}
                  title="Xem dạng Bảng đối soát"
                >
                  <LayoutList className="w-3.5 h-3.5" />
                  <span>Dạng bảng</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBrandViewMode('CARDS')}
                  className={cx(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer',
                    brandViewMode === 'CARDS'
                      ? 'bg-sunken text-ink font-semibold shadow-2xs'
                      : 'text-ink-3 hover:text-ink'
                  )}
                  title="Xem dạng Thẻ thương hiệu"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Dạng thẻ</span>
                </button>
              </div>
            </div>

            {/* Hàng 2: Ô tìm kiếm và các dropdown lọc */}
            <div className="p-3 flex flex-wrap items-center justify-between gap-3">
              <FilterBar
                search={{
                  value: brandPlanSearch,
                  onChange: setBrandPlanSearch,
                  placeholder: 'Tìm theo tên thương hiệu, mã, chuyên viên phụ trách...',
                }}
                filters={
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={brandPlanCampaignFilter}
                      onChange={(e) => setBrandPlanCampaignFilter(e.target.value as 'ALL' | 'HAS_CAMPAIGN' | 'NO_CAMPAIGN')}
                      aria-label="Lọc theo Chiến dịch"
                    >
                      <option value="ALL">Mọi chế độ Chiến dịch</option>
                      <option value="HAS_CAMPAIGN">Có Chiến dịch (Campaign)</option>
                      <option value="NO_CAMPAIGN">Always-on (Duy trì)</option>
                    </Select>

                    <Select
                      value={brandPlanStatusFilter}
                      onChange={(e) => setBrandPlanStatusFilter(e.target.value)}
                      aria-label="Lọc theo Trạng thái kế hoạch"
                    >
                      <option value="ALL">Tất cả trạng thái</option>
                      <option value="IN_EXECUTION">Đang chạy</option>
                      <option value="PENDING_APPROVAL">Chờ duyệt</option>
                      <option value="APPROVED">Đã duyệt</option>
                      <option value="DRAFT">Dự thảo</option>
                    </Select>

                    <Select
                      value={brandPlanStaffFilter}
                      onChange={(e) => setBrandPlanStaffFilter(e.target.value)}
                      aria-label="Lọc theo nhân sự phụ trách"
                    >
                      <option value="ALL">Tất cả nhân sự ({brandPositionStaffList.length})</option>
                      {brandPositionStaffList.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </Select>
                  </div>
                }
                resultCount={filteredBrandMonthlyPlans.length}
              />

              {currentUser?.name && brandPositionStaffList.includes(currentUser.name) && (
                <Button
                  size="sm"
                  variant={brandPlanStaffFilter === currentUser.name ? 'primary' : 'secondary'}
                  onClick={() => setBrandPlanStaffFilter(brandPlanStaffFilter === currentUser.name ? 'ALL' : currentUser.name)}
                >
                  {brandPlanStaffFilter === currentUser.name ? `Đang lọc: ${currentUser.name}` : `Brand tôi phụ trách (${currentUser.name})`}
                </Button>
              )}
            </div>

            {/* 3. NỘI DUNG CHÍNH: DẠNG BẢNG HOẶC DẠNG THẺ */}
            {brandViewMode === 'TABLE' ? (
              /* ================= DẠNG BẢNG (TABLE VIEW) ================= */
              <div className="w-full overflow-x-auto">
                <table key="brand-monthly-plans-table" className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-sunken/60 border-b border-line text-ink-2 font-semibold text-2xs uppercase tracking-wider">
                      <th className="py-2.5 px-3.5 min-w-[240px]">Thương hiệu (Brand)</th>
                      <th className="py-2.5 px-3 min-w-[130px] text-right">Ngân sách &amp; GMV</th>
                      <th className="py-2.5 px-3 min-w-[230px]">1. Content / Brand main</th>
                      <th className="py-2.5 px-3 min-w-[230px]">2. Plan / Strategy</th>
                      <th className="py-2.5 px-3 min-w-[230px]">3. Key Visual / SIS</th>
                      <th className="py-2.5 px-3 min-w-[110px] text-center">Trạng thái</th>
                      <th className="py-2.5 px-3.5 min-w-[150px] text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody key="brand-monthly-plans-tbody" className="divide-y divide-line">
                    {filteredBrandMonthlyPlans.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-ink-3">
                          Không tìm thấy kế hoạch Brand nào khớp với bộ lọc hiện tại.
                        </td>
                      </tr>
                    ) : (
                      filteredBrandMonthlyPlans.map(bp => {
                        const stores = effectiveStores.filter(
                          s => s.brandName?.toLowerCase() === bp.brandName?.toLowerCase()
                        );
                        const budget = bp.planStrategyPlan?.targetBrandBudget || 0;
                        const targetGmv = bp.planStrategyPlan?.targetBrandGmv || 0;
                        const contentP = bp.contentBrandMainPlan;
                        const strategyP = bp.planStrategyPlan;
                        const kvP = bp.keyVisualSisPlan;

                        return (
                          <tr
                            key={`bp-row-${bp.id}`}
                            onClick={() => setEditingBrandPlan(bp)}
                            className="hover:bg-canvas transition-colors cursor-pointer group"
                          >
                            {/* Cột 1: Thương hiệu */}
                            <td className="py-3 px-3.5 align-middle">
                              <div className="flex items-center gap-3">
                                <BrandAvatar brandName={bp.brandName} code={bp.brandCode} size={36} rounded="md" />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold text-ink text-sm group-hover:text-accent transition-colors truncate" title={bp.brandName}>
                                      {bp.brandName}
                                    </span>
                                    {bp.hasCampaign ? (
                                      <span
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-3xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shrink-0"
                                        title={bp.campaignTitle ? `${bp.campaignTitle}${bp.campaignPhaseName ? ` • ${bp.campaignPhaseName}` : ''}` : 'Có Chiến dịch'}
                                      >
                                        <Sparkles className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                                        <span>{bp.campaignCode || 'Campaign'}</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-3xs font-medium bg-sunken text-ink-3 shrink-0">
                                        Always-on
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-2xs text-ink-3 mt-0.5">
                                    <span className="truncate">{bp.category}</span>
                                    <span>•</span>
                                    <span className="font-medium text-ink-2 shrink-0">
                                      {stores.length > 0 ? `${stores.length} gian hàng` : '1 gian'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Cột 2: Ngân sách & GMV */}
                            <td className="py-3 px-3 align-middle text-right tabular-nums">
                              <div className="font-semibold text-ink text-xs">
                                {budget > 0 ? formatVndShort(budget) : <span className="text-ink-3 font-normal">Chưa cấp</span>}
                              </div>
                              <div className="text-2xs text-ink-3 mt-0.5">
                                Target: <span className="font-medium text-ink-2">{targetGmv > 0 ? formatVndShort(targetGmv) : '—'}</span>
                              </div>
                            </td>

                            {/* Cột 3: 1. Content / Brand main */}
                            <td className="py-3 px-3 align-middle">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <Avatar name={bp.contentBrandMainPic} size={18} />
                                    <span className="font-medium text-ink text-xs truncate">{bp.contentBrandMainPic}</span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0 font-mono text-3xs text-ink-2">
                                    <span className="bg-sunken border border-line px-1 rounded" title="Số Master Content Plan">
                                      {contentP.masterContentPlanCount}P
                                    </span>
                                    <span className="bg-sunken border border-line px-1 rounded" title="Số Content Pillars">
                                      {contentP.contentPillarsCount}Pil
                                    </span>
                                    <span className="bg-accent-soft text-accent border border-accent/20 px-1 rounded font-semibold" title="Chỉ tiêu kịch bản Hero/KOL/KOC">
                                      {contentP.heroScriptsTarget}Scr
                                    </span>
                                  </div>
                                </div>
                                <div className="text-2xs text-ink-3 line-clamp-1" title={contentP.focusPillars}>
                                  {contentP.focusPillars}
                                </div>
                              </div>
                            </td>

                            {/* Cột 4: 2. Plan / Strategy */}
                            <td className="py-3 px-3 align-middle">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <Avatar name={bp.planStrategyPic} size={18} />
                                    <span className="font-medium text-ink text-xs truncate">{bp.planStrategyPic}</span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0 font-mono text-3xs text-ink-2">
                                    <span className="bg-sunken border border-line px-1 rounded" title="Số Campaign Strategy Plan">
                                      {strategyP.campaignStrategyCount}Strat
                                    </span>
                                    <span className="bg-sunken border border-line px-1 rounded" title="Số Brand Audit">
                                      {strategyP.brandAuditCount}Audit
                                    </span>
                                  </div>
                                </div>
                                <div className="text-2xs text-ink-3 line-clamp-1" title={strategyP.bigIdeaAndKeyMessage}>
                                  {strategyP.bigIdeaAndKeyMessage}
                                </div>
                              </div>
                            </td>

                            {/* Cột 5: 3. Key Visual / SIS */}
                            <td className="py-3 px-3 align-middle">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <Avatar name={bp.keyVisualSisPic} size={18} />
                                    <span className="font-medium text-ink text-xs truncate">{bp.keyVisualSisPic}</span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0 font-mono text-3xs text-ink-2">
                                    <span className="bg-sunken border border-line px-1 rounded" title="Số định hướng Key Visual">
                                      {kvP.kvDirectionCount}KV
                                    </span>
                                    <span className="bg-sunken border border-line px-1 rounded" title="Gói Banner SIS">
                                      {kvP.sisBannerPackageCount}SIS
                                    </span>
                                    <span className="bg-sunken border border-line px-1 rounded" title="Khung ảnh PDP SEO">
                                      {kvP.pdpSeoProductCount}PDP
                                    </span>
                                  </div>
                                </div>
                                <div className="text-2xs text-ink-3 line-clamp-1" title={kvP.designTheme}>
                                  {kvP.designTheme}
                                </div>
                              </div>
                            </td>

                            {/* Cột 6: Trạng thái */}
                            <td className="py-3 px-3 text-center align-middle">
                              {getStatusBadge(bp.status)}
                            </td>

                            {/* Cột 7: Thao tác */}
                            <td className="py-3 px-3.5 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setOneSheetBrandPlan(bp)}
                                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-2xs font-semibold transition cursor-pointer"
                                  title="Mở biểu mẫu 1-Sheet Monthly Content & Key Visual Plan trình Brand"
                                >
                                  <FileText className="w-3 h-3 text-emerald-600" />
                                  <span>1-Sheet</span>
                                </button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setEditingBrandPlan(bp)}
                                  className="h-7 px-2.5 text-2xs font-medium"
                                >
                                  Nhập Plan
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* ================= DẠNG THẺ (CARD GRID VIEW) ================= */
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredBrandMonthlyPlans.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-ink-3">
                    Không tìm thấy kế hoạch Brand nào khớp với bộ lọc hiện tại.
                  </div>
                ) : (
                  filteredBrandMonthlyPlans.map(bp => {
                    const stores = effectiveStores.filter(
                      s => s.brandName?.toLowerCase() === bp.brandName?.toLowerCase()
                    );
                    const budget = bp.planStrategyPlan?.targetBrandBudget || 0;
                    const targetGmv = bp.planStrategyPlan?.targetBrandGmv || 0;
                    const contentP = bp.contentBrandMainPlan;
                    const strategyP = bp.planStrategyPlan;
                    const kvP = bp.keyVisualSisPlan;

                    return (
                      <div
                        key={`bp-card-${bp.id}`}
                        className="bg-surface border border-line rounded-xl p-4 space-y-3 hover:border-line-strong transition shadow-2xs flex flex-col justify-between"
                      >
                        {/* Header Thẻ: Logo + Tên + Badge trạng thái */}
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <BrandAvatar brandName={bp.brandName} code={bp.brandCode} size={40} rounded="lg" />
                              <div className="min-w-0">
                                <div className="font-semibold text-ink text-sm truncate" title={bp.brandName}>
                                  {bp.brandName}
                                </div>
                                <div className="text-2xs text-ink-3 truncate">
                                  {bp.category} · {stores.length > 0 ? `${stores.length} gian` : '1 gian'}
                                </div>
                              </div>
                            </div>
                            <div className="shrink-0 flex flex-col items-end gap-1">
                              {getStatusBadge(bp.status)}
                            </div>
                          </div>

                          {/* Dòng Campaign & Tài chính */}
                          <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-sunken/60 text-2xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {bp.hasCampaign ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-blue-700 truncate" title={bp.campaignTitle}>
                                  <Sparkles className="w-3 h-3 text-blue-600 shrink-0" />
                                  <span>{bp.campaignCode || 'Campaign'}</span>
                                </span>
                              ) : (
                                <span className="text-ink-3">Always-on (Duy trì)</span>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-ink-3 mr-1">Trần Net:</span>
                              <strong className="text-ink font-semibold tabular-nums">
                                {budget > 0 ? formatVndShort(budget) : 'Chưa cấp'}
                              </strong>
                            </div>
                          </div>
                        </div>

                        {/* Ma trận 3 vị trí nghiệp vụ */}
                        <div className="space-y-2 text-2xs">
                          {/* 1. Content */}
                          <div className="p-2 rounded-lg border border-line/60 bg-surface space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-ink-3 font-medium">1. Content / Brand main</span>
                              <div className="flex items-center gap-1 font-mono text-3xs text-ink-2">
                                <span className="bg-sunken px-1 rounded">{contentP.masterContentPlanCount}P</span>
                                <span className="bg-sunken px-1 rounded">{contentP.contentPillarsCount}Pil</span>
                                <span className="bg-accent-soft text-accent px-1 rounded font-semibold">{contentP.heroScriptsTarget}Scr</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-ink">
                              <Avatar name={bp.contentBrandMainPic} size={16} />
                              <span className="font-semibold truncate">{bp.contentBrandMainPic}</span>
                            </div>
                            <div className="text-3xs text-ink-3 line-clamp-1" title={contentP.focusPillars}>
                              {contentP.focusPillars}
                            </div>
                          </div>

                          {/* 2. Strategy */}
                          <div className="p-2 rounded-lg border border-line/60 bg-surface space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-ink-3 font-medium">2. Plan / Strategy</span>
                              <div className="flex items-center gap-1 font-mono text-3xs text-ink-2">
                                <span className="bg-sunken px-1 rounded">{strategyP.campaignStrategyCount}Strat</span>
                                <span className="bg-sunken px-1 rounded">{strategyP.brandAuditCount}Audit</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-ink">
                              <Avatar name={bp.planStrategyPic} size={16} />
                              <span className="font-semibold truncate">{bp.planStrategyPic}</span>
                            </div>
                            <div className="text-3xs text-ink-3 line-clamp-1" title={strategyP.bigIdeaAndKeyMessage}>
                              {strategyP.bigIdeaAndKeyMessage}
                            </div>
                          </div>

                          {/* 3. KV / SIS */}
                          <div className="p-2 rounded-lg border border-line/60 bg-surface space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-ink-3 font-medium">3. Key Visual / SIS</span>
                              <div className="flex items-center gap-1 font-mono text-3xs text-ink-2">
                                <span className="bg-sunken px-1 rounded">{kvP.kvDirectionCount}KV</span>
                                <span className="bg-sunken px-1 rounded">{kvP.sisBannerPackageCount}SIS</span>
                                <span className="bg-sunken px-1 rounded">{kvP.pdpSeoProductCount}PDP</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-ink">
                              <Avatar name={bp.keyVisualSisPic} size={16} />
                              <span className="font-semibold truncate">{bp.keyVisualSisPic}</span>
                            </div>
                            <div className="text-3xs text-ink-3 line-clamp-1" title={kvP.designTheme}>
                              {kvP.designTheme}
                            </div>
                          </div>
                        </div>

                        {/* Footer Thẻ: Thao tác */}
                        <div className="pt-2 border-t border-line flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setOneSheetBrandPlan(bp)}
                            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-2xs font-semibold transition cursor-pointer"
                          >
                            <FileText className="w-3 h-3 text-emerald-600" />
                            <span>1-Sheet Trình Brand</span>
                          </button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setEditingBrandPlan(bp)}
                            className="h-7 px-3 text-2xs font-medium"
                          >
                            Nhập Plan tháng
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </Panel>
        </div>
      ) : activeHubTab === 'STORE_COEFFICIENTS' ? (
        /* ========================================================================= */
        /* TAB: BẢNG 2. HỆ SỐ GIAN HÀNG (HS PHẠM VI CHO VIỆC CẤP SÀN VÀ CẤP BRAND)    */
        /* ========================================================================= */
        <StoreCoefficientHubSection
          stores={activeStores}
          plans={plans}
          selectedMonth={selectedMonth}
          currentUser={currentUser}
          onUpdateStore={(updatedStore) => {
            setLocalStoreOverrides(prev => ({ ...prev, [updatedStore.id]: updatedStore }));
            onUpdateStore?.(updatedStore);
          }}
          onNotify={(msg) => notify(msg)}
        />
      ) : activeHubTab === 'PERSONAL_PLANS' ? (
        /* ========================================================================= */
        /* TAB 2: KẾ HOẠCH THEO NHÂN SỰ (VIỆC CỦA TÔI) — FOCUS RIÊNG TỪNG NGƯỜI       */
        /* ========================================================================= */
        <div className="space-y-4">
          {/* 1. BỘ CHỌN VAI TRÒ & DANH SÁCH NHÂN SỰ NHẬN KẾ HOẠCH */}
          <section className="bg-surface border border-line rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-ink">
                  Kế hoạch cá nhân theo nhân sự
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {currentUser?.name && personalStaffSummaryList.some(s => s.staffName === currentUser.name) && (
                  <Button
                    size="sm"
                    variant={personalSelectedStaff === currentUser.name ? 'primary' : 'secondary'}
                    onClick={() => setPersonalSelectedStaff(personalSelectedStaff === currentUser.name ? 'ALL' : currentUser.name)}
                  >
                    {personalSelectedStaff === currentUser.name ? `Đang xem việc của: ${currentUser.name}` : `Chỉ xem việc của tôi (${currentUser.name})`}
                  </Button>
                )}
                {personalSelectedStaff !== 'ALL' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPersonalSelectedStaff('ALL')}
                  >
                    Xem toàn bộ đội ngũ ({personalStaffSummaryList.length} người)
                  </Button>
                )}
              </div>
            </div>

            {/* Thanh lọc Nhóm chuyên môn */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line">
              <Chips
                items={[
                  { key: 'ALL', label: 'Tất cả vị trí', count: allPersonalPackages.length },
                  { key: 'CONTENT_BRAND_MAIN', label: 'Content / Brand main [theo brand]', count: allPersonalPackages.filter(p => p.roleGroup === 'CONTENT_BRAND_MAIN').length },
                  { key: 'PLAN_STRATEGY', label: 'Plan / Strategy [theo brand]', count: allPersonalPackages.filter(p => p.roleGroup === 'PLAN_STRATEGY').length },
                  { key: 'KEY_VISUAL_SIS', label: 'Key Visual / SIS [theo brand]', count: allPersonalPackages.filter(p => p.roleGroup === 'KEY_VISUAL_SIS').length },
                  { key: 'BOOKING', label: 'Booking KOC Affiliate', count: allPersonalPackages.filter(p => p.roleGroup === 'BOOKING').length },
                  { key: 'CONTENT_SELF_CHANNEL', label: 'Content Self-Channel', count: allPersonalPackages.filter(p => p.roleGroup === 'CONTENT_SELF_CHANNEL').length },
                  { key: 'FOC', label: 'Gửi mẫu FOC 0đ', count: allPersonalPackages.filter(p => p.roleGroup === 'FOC').length },
                  { key: 'MULTI_PLATFORM', label: 'Đa sàn (Shopee/FB/IG)', count: allPersonalPackages.filter(p => p.roleGroup === 'MULTI_PLATFORM').length },
                ]}
                value={personalRoleFilter}
                onChange={(k) => {
                  setPersonalRoleFilter(
                    k as 'ALL' | 'BOOKING' | 'CONTENT_SELF_CHANNEL' | 'FOC' | 'MULTI_PLATFORM' | 'CONTENT_BRAND_MAIN' | 'PLAN_STRATEGY' | 'KEY_VISUAL_SIS'
                  );
                  setPersonalSelectedStaff('ALL');
                }}
              />

              <Chips
                items={[
                  { key: 'ALL', label: 'Mọi mảng việc' },
                  { key: 'CONTENT_BRAND_MAIN', label: 'Content / Brand main [theo brand]' },
                  { key: 'PLAN_STRATEGY', label: 'Plan / Strategy [theo brand]' },
                  { key: 'KEY_VISUAL_SIS', label: 'Key Visual / SIS [theo brand]' },
                  { key: 'AFFILIATE_PAID', label: '1. KOC trả phí' },
                  { key: 'FOC_SAMPLE', label: '2. Gửi mẫu FOC' },
                  { key: 'SELF_CHANNEL', label: '3. Video Self-Channel' },
                  { key: 'MULTI_PLATFORM', label: '4. Đa sàn' },
                ]}
                value={personalWorkstreamFilter}
                onChange={(k) => setPersonalWorkstreamFilter(k as 'ALL' | B2cWorkstreamType)}
              />
            </div>

            {/* Thẻ nhân sự (Staff Cards) để chọn 1 người và focus vào kế hoạch của riêng họ */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
              {personalStaffSummaryList
                .map(staff => {
                  const isFocused = personalSelectedStaff === staff.staffName;
                  const roleLabel =
                    staff.roleGroup === 'CONTENT_BRAND_MAIN'
                      ? 'Content / Brand main [theo brand]'
                      : staff.roleGroup === 'PLAN_STRATEGY'
                        ? 'Plan / Strategy [theo brand]'
                        : staff.roleGroup === 'KEY_VISUAL_SIS'
                          ? 'Key Visual / SIS [theo brand]'
                          : staff.roleGroup === 'CONTENT_SELF_CHANNEL'
                            ? 'Content Self-Channel'
                            : staff.roleGroup === 'BOOKING'
                              ? 'Booking Affiliate'
                              : staff.roleGroup === 'FOC'
                                ? 'Chuyên viên FOC'
                                : 'Chuyên viên Đa sàn';

                  return (
                    <button
                      key={staff.staffName}
                      type="button"
                      onClick={() => setPersonalSelectedStaff(isFocused ? 'ALL' : staff.staffName)}
                      className={cx(
                        'text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2',
                        isFocused
                          ? 'bg-accent-soft/60 border-accent ring-2 ring-accent/20 shadow-sm'
                          : 'bg-canvas/60 border-line hover:border-line-strong hover:bg-surface'
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-semibold text-xs text-ink truncate">{staff.staffName}</span>
                          <span className="text-2xs text-ink-3 tabular-nums shrink-0">
                            {staff.packageCount} đầu việc
                          </span>
                        </div>
                        <div className="text-2xs text-ink-3 mt-0.5 truncate">
                          {roleLabel} {staff.brandPositionCount > 0 ? `• ${staff.brandPositionCount} vị trí Brand` : ''}
                        </div>
                      </div>
                      <div className="flex items-baseline justify-between pt-1.5 border-t border-line/70 text-xs tabular-nums">
                        <span className="font-semibold text-accent">{staff.totalQty} hạng mục</span>
                        <span className="font-semibold text-ink">{formatVndShort(staff.totalBudget)}</span>
                      </div>
                    </button>
                  );
                })}
            </div>
          </section>

          {/* 2. BẢNG CHI TIẾT CÁC GÓI CÔNG VIỆC CÁ NHÂN (PERSONAL WORKPACKAGES) */}
          <Panel flush>
            <div className="p-3 border-b border-line flex flex-wrap items-center justify-between gap-3">
              <FilterBar
                search={{
                  value: personalSearchQuery,
                  onChange: setPersonalSearchQuery,
                  placeholder: 'Tìm nhân sự, gian hàng...',
                }}
                resultCount={filteredPersonalPackages.length}
              />
              {personalSelectedStaff !== 'ALL' && (
                <div className="flex items-center gap-2 text-xs bg-accent-soft text-accent px-3 py-1.5 rounded-lg font-medium">
                  <span>Đang lọc riêng kế hoạch của: <strong>{personalSelectedStaff}</strong></span>
                  <button
                    type="button"
                    onClick={() => setPersonalSelectedStaff('ALL')}
                    className="underline hover:no-underline ml-1 cursor-pointer"
                  >
                    Bỏ lọc
                  </button>
                </div>
              )}
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-sunken/70 border-b border-line text-ink-2 font-semibold text-2xs">
                    <th className="py-2.5 px-3">Nhân sự thực thi &amp; Leader</th>
                    <th className="py-2.5 px-3">Vị trí / Mảng kế hoạch</th>
                    <th className="py-2.5 px-3">Brand / Gian hàng &amp; Phối hợp</th>
                    <th className="py-2.5 px-3">Chi tiết đầu việc tháng</th>
                    <th className="py-2.5 px-3 text-right">Khối lượng</th>
                    <th className="py-2.5 px-3 text-right">Hạn mức Net</th>
                    <th className="py-2.5 px-3 text-center">Trạng thái Plan</th>
                    <th className="py-2.5 px-3 text-right">Vào làm việc</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredPersonalPackages.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-ink-3">
                        Không có gói công việc cá nhân nào khớp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    filteredPersonalPackages.map((pkg: PersonalWorkPackageItem) => {
                      const sourcePlan = plans.find(p => p.id === pkg.planId);
                      const matchedBrandPlan = pkg.isBrandPosition
                        ? brandMonthlyPlans.find(bp => bp.brandId === pkg.brandId || bp.brandName === pkg.brandName)
                        : undefined;
                      const tiersSummary = pkg.tierOrFormatLabels.join(', ');

                      return (
                        <tr
                          key={pkg.id}
                          className="hover:bg-canvas transition-colors"
                        >
                          {/* 1. Nhân sự & Leader */}
                          <td className="py-2.5 px-3 align-middle">
                            <div className="font-semibold text-ink text-xs">{pkg.staffName}</div>
                            <div className="text-2xs text-ink-3 mt-0.5">
                              Leader: <span className="font-medium text-ink-2">{pkg.leaderName || 'Đặng Thị Yến Nhi'}</span>
                            </div>
                          </td>

                          {/* 2. Mảng kế hoạch */}
                          <td className="py-2.5 px-3 align-middle">
                            <span className="text-xs font-medium text-ink">
                              {pkg.workstreamLabel}
                            </span>
                          </td>

                          {/* 3. Gian hàng & Đồng đội làm chung */}
                          <td className="py-2.5 px-3 align-middle">
                            <div className="flex items-center gap-1.5">
                              {!pkg.isBrandPosition && (
                                <ChannelTag channel={pkg.platform} className="text-2xs px-1 py-0" />
                              )}
                              <span className="font-semibold text-ink">{pkg.storeName}</span>
                              {pkg.isBrandPosition && (
                                <span className="text-2xs text-ink-3">
                                  · theo brand
                                </span>
                              )}
                            </div>
                            {pkg.allStoreContributors.length > 0 ? (
                              <div className="text-2xs text-ink-3 mt-0.5">
                                Phối hợp: <span className="text-ink-2 font-medium">{pkg.allStoreContributors.join(', ')}</span>
                              </div>
                            ) : (
                              <div className="text-2xs text-ink-3 mt-0.5">Độc lập phụ trách mảng này</div>
                            )}
                          </td>

                          {/* 4. Chi tiết phân khúc của riêng nhân sự */}
                          <td className="py-2.5 px-3 align-middle max-w-xs">
                            <div className="text-xs text-ink truncate" title={tiersSummary}>
                              {tiersSummary}
                            </div>
                            <div className="text-2xs text-ink-3 mt-0.5">
                              {pkg.isBrandPosition ? 'Đầu việc cấp Brand hàng tháng' : `${pkg.rowIds.length} dòng hạng mục được giao riêng`}
                            </div>
                          </td>

                          {/* 5. Số lượng */}
                          <td className="py-2.5 px-3 text-right tabular-nums align-middle">
                            <span className="font-semibold text-accent text-xs">
                              {pkg.myQty} {pkg.isBrandPosition ? 'đầu mục' : 'video'}
                            </span>
                          </td>

                          {/* 6. Ngân sách Net */}
                          <td className="py-2.5 px-3 text-right tabular-nums align-middle">
                            <span className="font-semibold text-ink text-xs">
                              {pkg.myBudget > 0 ? formatVndShort(pkg.myBudget) : 'Theo Brand'}
                            </span>
                          </td>

                          {/* 7. Trạng thái Plan */}
                          <td className="py-2.5 px-3 text-center align-middle">
                            {getStatusBadge(pkg.planStatus)}
                          </td>

                          {/* 8. Thao tác mở Focus Mode hoặc Nhập Plan Brand */}
                          <td className="py-2.5 px-3 text-right align-middle">
                            <div className="flex items-center justify-end gap-1.5">
                              {pkg.isBrandPosition && matchedBrandPlan ? (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setEditingBrandPlan(matchedBrandPlan)}
                                  className="h-7 px-2.5 text-2xs font-semibold"
                                >
                                  Nhập Plan Brand
                                </Button>
                              ) : (
                                <>
                                  {sourcePlan && onOpenListingForPlan && (pkg.workstream === 'AFFILIATE_PAID' || pkg.workstream === 'FOC_SAMPLE') && (
                                    <button
                                      type="button"
                                      onClick={() => onOpenListingForPlan(sourcePlan)}
                                      className="h-7 px-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-2xs font-semibold transition cursor-pointer"
                                      title="Mở bảng Listing KOC gắn với kế hoạch gian hàng này"
                                    >
                                      Listing KOC
                                    </button>
                                  )}
                                  {sourcePlan && (
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => onSelectPlan(sourcePlan, {
                                        focusStaffName: pkg.staffName,
                                        focusWorkstream: pkg.workstream
                                      })}
                                      className="h-7 px-2.5 text-2xs font-semibold"
                                    >
                                      Phân rã phần việc này
                                    </Button>
                                  )}
                                </>
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
          </Panel>
        </div>
      ) : (
        /* ========================================================================= */
        /* TAB 3: DANH MỤC KẾ HOẠCH ĐÃ PHÂN RÃ (TABLE / GRID)                        */
        /* ========================================================================= */
        <div className="space-y-4">
          {/* BỘ LỌC VÀ CHUYỂN ĐỔI CHẾ ĐỘ XEM */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-3.5 rounded-xl border border-line">
            <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
              <FilterBar
                search={{
                  value: searchQuery,
                  onChange: setSearchQuery,
                  placeholder: 'Tìm kế hoạch, thương hiệu...',
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
                <Button variant="primary" icon={Plus} onClick={handleOpenCreateModal}>
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
                          {plan.brandName} <span className="text-2xs font-normal text-ink-3">· {plan.month}</span>
                        </span>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          <button
                            type="button"
                            onClick={() => openVersionModal(plan.id, 'VERSION_HISTORY')}
                            className="inline-flex items-center gap-1 text-2xs font-mono text-ink-3 hover:text-accent hover:underline cursor-pointer"
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
                          <span>B2C: <strong className="text-ink font-medium">{plan.pic || 'Chưa giao'}</strong></span>
                          <span>•</span>
                          <span>Growth: <strong className="text-ink-2 font-medium">{plan.growthPic?.split(' (')[0] || 'Team'}</strong></span>
                          {getBreakdownHealth(plan) && <span>•</span>}
                          <BreakdownHealthText plan={plan} />
                          {budgetDelta !== 0 && (
                            <>
                              <span>•</span>
                              <span
                                className={cx(
                                  'font-semibold tabular-nums',
                                  budgetDelta > 0 ? 'text-positive' : 'text-warning'
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
                          <span className="font-semibold text-ink tabular-nums">{bd.focQty} video</span>
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
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-xs border-collapse">
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
                            <div className="font-semibold text-ink text-xs truncate" title={plan.title}>
                              {plan.title}
                            </div>
                            <div className="text-2xs text-ink-3 mt-0.5 truncate">
                              <span className="font-medium text-ink-2">{plan.brandName}</span> • {plan.month}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => openVersionModal(plan.id, 'VERSION_HISTORY')}
                                className="inline-flex items-center gap-1 text-2xs font-mono text-ink-3 hover:text-accent hover:underline cursor-pointer"
                                title="Quản lý & so sánh các phiên bản kế hoạch trong tháng"
                              >
                                <Layers className="w-2.5 h-2.5" />
                                <span>{activeVersionCode} · {versionCount} bản</span>
                              </button>
                              {budgetDelta !== 0 && (
                                <span
                                  className={cx(
                                    'text-2xs font-semibold tabular-nums',
                                    budgetDelta > 0 ? 'text-positive' : 'text-warning'
                                  )}
                                >
                                  · {budgetDelta > 0 ? `+${formatVndShort(budgetDelta)}` : formatVndShort(budgetDelta)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-2 align-middle">
                            <div className="space-y-0.5 text-2xs leading-tight">
                              <div className="flex items-center gap-1 min-w-0">
                                <span className="text-ink-3 w-10 shrink-0">B2C:</span>
                                <span className="font-medium text-ink truncate">{plan.pic || 'Chưa giao'}</span>
                              </div>
                              <div className="flex items-center gap-1 min-w-0">
                                <span className="text-ink-3 w-10 shrink-0">Growth:</span>
                                <span className="text-ink-2 truncate">{plan.growthPic?.split(' (')[0] || 'Team'}</span>
                              </div>
                              {getBreakdownHealth(plan) && (
                                <div className="min-w-0 truncate">
                                  <BreakdownHealthText plan={plan} />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums align-middle bg-sunken/25">
                            <div className="font-semibold text-ink text-xs">
                              {formatVndShort(bd.totalBudget)}
                            </div>
                            <div className="text-2xs font-medium text-accent">
                              {bd.totalVideos} video
                            </div>
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums align-middle">
                            {bd.affPaidQty > 0 || bd.affPaidBudget > 0 ? (
                              <div>
                                <div className="font-semibold text-ink text-xs">{bd.affPaidQty} video</div>
                                <div className="text-2xs text-ink-3">{formatVndShort(bd.affPaidBudget)}</div>
                              </div>
                            ) : (
                              <span className="text-ink-3 text-2xs">—</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center tabular-nums align-middle">
                            {bd.focQty > 0 ? (
                              <div>
                                <div className="font-medium text-ink text-xs">
                                  {bd.focQty} video
                                </div>
                                <div className="text-2xs text-ink-3 mt-0.5">0 đ</div>
                              </div>
                            ) : (
                              <span className="text-ink-3 text-2xs">—</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums align-middle">
                            {bd.selfQty > 0 || bd.selfBudget > 0 ? (
                              <div>
                                <div className="font-semibold text-ink text-xs">{bd.selfQty} video</div>
                                <div className="text-2xs text-ink-3">{formatVndShort(bd.selfBudget)}</div>
                              </div>
                            ) : (
                              <span className="text-ink-3 text-2xs">—</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums align-middle">
                            {bd.otherQty > 0 || bd.otherBudget > 0 ? (
                              <div>
                                <div className="font-semibold text-ink text-xs">{bd.otherQty} video</div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Chu kỳ tháng:">
              <Select
                value={newPlanMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
              >
                <option value="2026/10">Tháng 10/2026 (Hiện tại)</option>
                <option value="2026/11">Tháng 11/2026 (Sắp tới)</option>
                <option value="2026/12">Tháng 12/2026</option>
                <option value="2027/01">Tháng 01/2027</option>
                <option value="2026/09">Tháng 09/2026</option>
                <option value="2026/08">Tháng 08/2026</option>
              </Select>
            </Field>

            <Field label="Tuần áp dụng:">
              <Select
                value={newPlanWeek}
                onChange={(e) => setNewPlanWeek(e.target.value)}
              >
                {availableWeeks.map(w => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Thương hiệu:">
              <Select
                value={newPlanBrand}
                onChange={(e) => handleBrandChange(e.target.value)}
              >
                {availableBrands.map(b => (
                  <option key={b.name} value={b.name}>{b.name}</option>
                ))}
              </Select>
            </Field>

            <Field label="Gian hàng áp dụng:">
              <Select
                value={newPlanStoreId}
                onChange={(e) => handleStoreChange(e.target.value)}
              >
                <option value="">Tất cả gian / Kế hoạch cấp Brand</option>
                {brandStoresForNewPlan.map(st => (
                  <option key={st.id} value={st.id}>
                    {st.storeName} ({st.platform})
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Chuyên viên B2C phụ trách:">
              <Select
                value={newPlanPic}
                onChange={(e) => setNewPlanPic(e.target.value)}
              >
                {availablePics.map(p => (
                  <option key={p.name} value={p.name}>{p.title}</option>
                ))}
              </Select>
            </Field>

            <Field label="Tiêu đề kế hoạch:">
              <Input
                type="text"
                value={newPlanTitle}
                onChange={(e) => setNewPlanTitle(e.target.value)}
                placeholder={`VD: Kế hoạch B2C ${newPlanMonth} - ${newPlanStoreName || newPlanBrand}`}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label={`Ngân sách (${formatVndShort(newPlanBudget)}):`}>
              <Input
                type="number"
                step="5000000"
                value={newPlanBudget}
                onChange={(e) => setNewPlanBudget(Number(e.target.value))}
              />
            </Field>

            <Field label="Số lượng video:">
              <Input
                type="number"
                value={newPlanQty}
                onChange={(e) => setNewPlanQty(Number(e.target.value))}
              />
            </Field>

            <Field label={`Mục tiêu GMV (ROI ${(newPlanGmv / (newPlanBudget || 1)).toFixed(1)}x):`}>
              <Input
                type="number"
                step="10000000"
                value={newPlanGmv}
                onChange={(e) => setNewPlanGmv(Number(e.target.value))}
              />
            </Field>
          </div>

          <Field label="Định hướng phân bổ ngân sách:">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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

      {onPlanOrderUploaded && (
        <PlanOrderUploadModal
          open={isPlanOrderUploadOpen}
          onClose={() => setIsPlanOrderUploadOpen(false)}
          onUploaded={() => onPlanOrderUploaded()}
          onNotify={onNotify}
        />
      )}

      {/* 7. MODAL BẢNG HỨNG KẾ HOẠCH B2C BOOKING ĐÃ DUYỆT TỪ LARKBASE */}
      <Modal
        open={isLarkbaseModalOpen}
        onClose={() => setIsLarkbaseModalOpen(false)}
        title="Đồng bộ Kế hoạch B2C Booking từ Larkbase"
        size="xl"
        footer={
          <div className="flex flex-wrap items-center justify-end gap-2 w-full">
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
                <Database className="w-4 h-4 text-accent" />
                <span className="text-xs font-semibold text-ink">
                  Cấu hình kết nối Larkbase Bitable API &amp; Webhook tự động
                </span>
                <span className="text-2xs text-ink-3">
                  · {hasLiveLarkCredentials
                    ? 'Đã cấu hình LARK_APP_ID / SECRET'
                    : 'Đang dùng bộ dữ liệu chuẩn (Chờ cấu hình .env)'}
                </span>
              </div>
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
                      <th className="py-2.5 px-3">4 Đầu việc B2C</th>
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
                            <div className="font-mono text-2xs text-ink-2 font-semibold">
                              {rec.larkRecordId}
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 text-2xs text-ink-2">
                              <span className="font-mono font-semibold text-ink">
                                {rec.versionCode}
                              </span>
                              <span>·</span>
                              <span className="font-medium">{rec.month}</span>
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
                            <div className="mt-0.5 text-2xs text-ink-3">
                              B2C phụ trách = 1
                            </div>
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
                                <span className="text-accent font-semibold">{rec.affiliatePaidVideos} video</span>{' '}
                                ({formatVndShort(rec.affiliatePaidBudgetNet)})
                                {tierSummary && (
                                  <div className="text-2xs text-ink-3 font-mono mt-0.5">{tierSummary}</div>
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
                            <Status tone="positive">Đã duyệt</Status>
                            <div className="text-2xs text-ink-2 font-medium mt-1">
                              {rec.approvedBy}
                            </div>
                            <div className="text-2xs text-ink-3">
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

      {/* MODAL NHẬP KẾ HOẠCH THÁNG THEO BRAND (3 VỊ TRÍ GẮN THEO BRAND) */}
      <Modal
        open={!!editingBrandPlan}
        onClose={() => setEditingBrandPlan(null)}
        title={
          editingBrandPlan ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span>Nhập Kế hoạch Tháng theo Brand — {editingBrandPlan.brandName}</span>
              <span className="text-xs font-normal text-ink-3">
                · theo brand · {editingBrandPlan.month}
              </span>
            </div>
          ) : 'Nhập Kế hoạch Tháng theo Brand'
        }
        size="xl"
        footer={
          editingBrandPlan && (
            <>
              <Button variant="ghost" onClick={() => setEditingBrandPlan(null)}>
                Đóng
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  const nextStatus = 'APPROVED' as const;
                  const updated: BrandMonthlyPlanItem = {
                    ...editingBrandPlan,
                    status: nextStatus,
                    updatedAt: new Date().toISOString(),
                    updatedBy: currentUser?.name || editingBrandPlan.planStrategyPic,
                    approvedBy: currentUser?.name || 'Đặng Thị Yến Nhi',
                    approvedAt: new Date().toISOString(),
                  };
                  setBrandMonthlyPlans(prev => prev.map(item => (item.id === updated.id ? updated : item)));
                  setEditingBrandPlan(null);
                  notify(`Đã duyệt kế hoạch tháng cấp Brand cho ${updated.brandName} (${updated.month})!`);
                }}
              >
                Duyệt kế hoạch Brand
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const updated: BrandMonthlyPlanItem = {
                    ...editingBrandPlan,
                    updatedAt: new Date().toISOString(),
                    updatedBy: currentUser?.name || editingBrandPlan.planStrategyPic,
                  };
                  setBrandMonthlyPlans(prev => prev.map(item => (item.id === updated.id ? updated : item)));
                  setEditingBrandPlan(null);
                  notify(
                    `Đã lưu kế hoạch tháng theo Brand của ${updated.brandName}: Content/Brand main (${updated.contentBrandMainPic}), Plan/Strategy (${updated.planStrategyPic}), KV/SIS (${updated.keyVisualSisPic})!`
                  );
                }}
              >
                Lưu kế hoạch tháng
              </Button>
            </>
          )
        }
      >
        {editingBrandPlan && (
          <div className="space-y-4 text-xs">
            {/* 0. Liên kết Thực thể Chiến dịch (Campaign) trong kỳ */}
            <div className="p-3.5 rounded-xl bg-sunken/50 border border-line space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-ink text-xs block">
                    Chế độ Chiến dịch (Campaign) của Brand {editingBrandPlan.brandName} kỳ {editingBrandPlan.month}
                  </span>
                </div>
                <div className="inline-flex rounded-lg border border-line bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      const matched = effectiveCampaigns.find(
                        c =>
                          isCampaignActiveInMonth(c, editingBrandPlan.month) &&
                          c.brand.toLowerCase().includes(editingBrandPlan.brandName.toLowerCase())
                      );
                      const phase = matched ? getCampaignPhaseForMonth(matched, editingBrandPlan.month) : undefined;
                      setEditingBrandPlan(prev =>
                        prev
                          ? {
                              ...prev,
                              hasCampaign: true,
                              campaignId: matched?.id || prev.campaignId,
                              campaignCode: matched?.code || prev.campaignCode || `CAMP-${prev.brandCode}`,
                              campaignTitle: matched?.title || prev.campaignTitle || `Chiến dịch ${prev.brandName} kỳ ${prev.month}`,
                              campaignPhaseName: phase?.phaseName || prev.campaignPhaseName || `Giai đoạn thực thi ${prev.month}`,
                            }
                          : prev
                      );
                    }}
                    className={cx(
                      'px-2.5 py-1 rounded-md text-2xs font-semibold transition cursor-pointer',
                      editingBrandPlan.hasCampaign
                        ? 'bg-accent text-white'
                        : 'text-ink-2 hover:text-ink'
                    )}
                  >
                    Có Chiến dịch (Campaign)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingBrandPlan(prev =>
                        prev
                          ? {
                              ...prev,
                              hasCampaign: false,
                              campaignId: undefined,
                              campaignCode: undefined,
                              campaignTitle: undefined,
                              campaignPhaseName: undefined,
                            }
                          : prev
                      )
                    }
                    className={cx(
                      'px-2.5 py-1 rounded-md text-2xs font-semibold transition cursor-pointer',
                      !editingBrandPlan.hasCampaign
                        ? 'bg-slate-800 text-white'
                        : 'text-ink-2 hover:text-ink'
                    )}
                  >
                    Không có Campaign (Duy trì)
                  </button>
                </div>
              </div>

              {editingBrandPlan.hasCampaign && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <Field label="Chọn Chiến dịch (1–3 tháng)">
                    <Select
                      value={editingBrandPlan.campaignId || ''}
                      onChange={(e) => {
                        const camp = effectiveCampaigns.find(c => c.id === e.target.value);
                        if (!camp) return;
                        const phase = getCampaignPhaseForMonth(camp, editingBrandPlan.month);
                        setEditingBrandPlan(prev =>
                          prev
                            ? {
                                ...prev,
                                hasCampaign: true,
                                campaignId: camp.id,
                                campaignCode: camp.code,
                                campaignTitle: camp.title,
                                campaignPhaseName: phase?.phaseName || `Giai đoạn ${prev.month}`,
                                planStrategyPlan: {
                                  ...prev.planStrategyPlan,
                                  bigIdeaAndKeyMessage: `${camp.bigIdea} — ${camp.keyMessage}`,
                                  targetBrandBudget: phase?.allocatedBudget || camp.budget || prev.planStrategyPlan.targetBrandBudget,
                                },
                                keyVisualSisPlan: {
                                  ...prev.keyVisualSisPlan,
                                  designTheme: camp.keyVisualSpec
                                    ? `${camp.keyVisualSpec.theme} | Moodboard: ${camp.keyVisualSpec.moodboard}`
                                    : prev.keyVisualSisPlan.designTheme,
                                },
                              }
                            : prev
                        );
                      }}
                    >
                      <option value="">-- Chọn hoặc giữ nguyên Campaign --</option>
                      {effectiveCampaigns.map(c => (
                        <option key={c.id} value={c.id}>
                          [{c.code}] {c.brand} — {c.title} ({(c.coveredMonths || []).join(', ')})
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Tên Chiến dịch">
                    <Input
                      value={editingBrandPlan.campaignTitle || ''}
                      onChange={(e) =>
                        setEditingBrandPlan(prev => (prev ? { ...prev, campaignTitle: e.target.value } : prev))
                      }
                      placeholder="Tên chiến dịch..."
                    />
                  </Field>
                  <Field label="Giai đoạn (Phase) trong tháng">
                    <Input
                      value={editingBrandPlan.campaignPhaseName || ''}
                      onChange={(e) =>
                        setEditingBrandPlan(prev => (prev ? { ...prev, campaignPhaseName: e.target.value } : prev))
                      }
                      placeholder="VD: Giai đoạn 2 (10/2026): Tăng tốc..."
                    />
                  </Field>
                </div>
              )}
            </div>

            {/* 1. Phân bổ nhân sự cho 3 vị trí gắn theo Brand */}
            <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-amber-950 text-xs">
                  Phân bổ nhân sự phụ trách 3 vị trí gắn theo Brand ({editingBrandPlan.brandName})
                </span>
                <span className="text-2xs text-ink-3">
                  theo brand
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-ink block mb-1">
                    1. Content / Brand main <span className="text-amber-700">[theo brand]</span>
                  </label>
                  <Select
                    value={editingBrandPlan.contentBrandMainPic}
                    onChange={(e) =>
                      setEditingBrandPlan(prev => (prev ? { ...prev, contentBrandMainPic: e.target.value } : prev))
                    }
                  >
                    {brandPositionStaffList.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="font-semibold text-ink block mb-1">
                    2. Plan / Strategy <span className="text-amber-700">[theo brand]</span>
                  </label>
                  <Select
                    value={editingBrandPlan.planStrategyPic}
                    onChange={(e) =>
                      setEditingBrandPlan(prev => (prev ? { ...prev, planStrategyPic: e.target.value } : prev))
                    }
                  >
                    {brandPositionStaffList.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="font-semibold text-ink block mb-1">
                    3. Key Visual / SIS <span className="text-amber-700">[theo brand]</span>
                  </label>
                  <Select
                    value={editingBrandPlan.keyVisualSisPic}
                    onChange={(e) =>
                      setEditingBrandPlan(prev => (prev ? { ...prev, keyVisualSisPic: e.target.value } : prev))
                    }
                  >
                    {brandPositionStaffList.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>

            {/* 2. Nhập kế hoạch tháng cho từng vị trí */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
              {/* Khối 1: Content / Brand main [theo brand] */}
              <div className="p-3.5 rounded-xl border border-amber-200 bg-surface space-y-3">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <div>
                    <span className="font-semibold text-amber-950 block">1. Content / Brand main</span>
                    <span className="text-2xs text-ink-3">PIC: {editingBrandPlan.contentBrandMainPic}</span>
                  </div>
                  <span className="text-2xs text-ink-3">
                    theo brand
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Field label="Master Plan">
                    <Input
                      type="number"
                      min={0}
                      value={editingBrandPlan.contentBrandMainPlan.masterContentPlanCount}
                      onChange={(e) =>
                        setEditingBrandPlan(prev =>
                          prev
                            ? {
                                ...prev,
                                contentBrandMainPlan: {
                                  ...prev.contentBrandMainPlan,
                                  masterContentPlanCount: Number(e.target.value) || 0,
                                },
                              }
                            : prev
                        )
                      }
                    />
                  </Field>
                  <Field label="Số Pillars">
                    <Input
                      type="number"
                      min={0}
                      value={editingBrandPlan.contentBrandMainPlan.contentPillarsCount}
                      onChange={(e) =>
                        setEditingBrandPlan(prev =>
                          prev
                            ? {
                                ...prev,
                                contentBrandMainPlan: {
                                  ...prev.contentBrandMainPlan,
                                  contentPillarsCount: Number(e.target.value) || 0,
                                },
                              }
                            : prev
                        )
                      }
                    />
                  </Field>
                  <Field label="Kịch bản Hero">
                    <Input
                      type="number"
                      min={0}
                      value={editingBrandPlan.contentBrandMainPlan.heroScriptsTarget}
                      onChange={(e) =>
                        setEditingBrandPlan(prev =>
                          prev
                            ? {
                                ...prev,
                                contentBrandMainPlan: {
                                  ...prev.contentBrandMainPlan,
                                  heroScriptsTarget: Number(e.target.value) || 0,
                                },
                              }
                            : prev
                        )
                      }
                    />
                  </Field>
                </div>

                <Field label="Tuyến nội dung & Góc tiếp cận chủ đạo (Content Pillars / Angles)">
                  <Textarea
                    rows={2}
                    value={editingBrandPlan.contentBrandMainPlan.focusPillars}
                    onChange={(e) =>
                      setEditingBrandPlan(prev =>
                        prev
                          ? {
                              ...prev,
                              contentBrandMainPlan: {
                                ...prev.contentBrandMainPlan,
                                focusPillars: e.target.value,
                              },
                            }
                          : prev
                      )
                    }
                  />
                </Field>

                <Field label="Ghi chú thực thi Content / Brand main">
                  <Textarea
                    rows={2}
                    value={editingBrandPlan.contentBrandMainPlan.notes}
                    onChange={(e) =>
                      setEditingBrandPlan(prev =>
                        prev
                          ? {
                              ...prev,
                              contentBrandMainPlan: {
                                ...prev.contentBrandMainPlan,
                                notes: e.target.value,
                              },
                            }
                          : prev
                      )
                    }
                  />
                </Field>
              </div>

              {/* Khối 2: Plan / Strategy [theo brand] */}
              <div className="p-3.5 rounded-xl border border-blue-200 bg-surface space-y-3">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <div>
                    <span className="font-semibold text-blue-950 block">2. Plan / Strategy</span>
                    <span className="text-2xs text-ink-3">PIC: {editingBrandPlan.planStrategyPic}</span>
                  </div>
                  <span className="text-2xs text-ink-3">
                    theo brand
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Field label="Số bản Strategy">
                    <Input
                      type="number"
                      min={0}
                      value={editingBrandPlan.planStrategyPlan.campaignStrategyCount}
                      onChange={(e) =>
                        setEditingBrandPlan(prev =>
                          prev
                            ? {
                                ...prev,
                                planStrategyPlan: {
                                  ...prev.planStrategyPlan,
                                  campaignStrategyCount: Number(e.target.value) || 0,
                                },
                              }
                            : prev
                        )
                      }
                    />
                  </Field>
                  <Field label="Báo cáo Audit">
                    <Input
                      type="number"
                      min={0}
                      value={editingBrandPlan.planStrategyPlan.brandAuditCount}
                      onChange={(e) =>
                        setEditingBrandPlan(prev =>
                          prev
                            ? {
                                ...prev,
                                planStrategyPlan: {
                                  ...prev.planStrategyPlan,
                                  brandAuditCount: Number(e.target.value) || 0,
                                },
                              }
                            : prev
                        )
                      }
                    />
                  </Field>
                </div>

                <Field label="Big Idea & Thông điệp trọng tâm tháng">
                  <Textarea
                    rows={2}
                    value={editingBrandPlan.planStrategyPlan.bigIdeaAndKeyMessage}
                    onChange={(e) =>
                      setEditingBrandPlan(prev =>
                        prev
                          ? {
                              ...prev,
                              planStrategyPlan: {
                                ...prev.planStrategyPlan,
                                bigIdeaAndKeyMessage: e.target.value,
                              },
                            }
                          : prev
                      )
                    }
                  />
                </Field>

                <Field label="Ghi chú hoạch định Plan / Strategy">
                  <Textarea
                    rows={2}
                    value={editingBrandPlan.planStrategyPlan.notes}
                    onChange={(e) =>
                      setEditingBrandPlan(prev =>
                        prev
                          ? {
                              ...prev,
                              planStrategyPlan: {
                                ...prev.planStrategyPlan,
                                notes: e.target.value,
                              },
                            }
                          : prev
                      )
                    }
                  />
                </Field>
              </div>

              {/* Khối 3: Key Visual / SIS [theo brand] */}
              <div className="p-3.5 rounded-xl border border-line bg-surface space-y-3">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <div>
                    <span className="font-semibold text-ink block">3. Key Visual / SIS</span>
                    <span className="text-2xs text-ink-3">PIC: {editingBrandPlan.keyVisualSisPic}</span>
                  </div>
                  <span className="text-2xs text-ink-3">
                    theo brand
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Field label="Bộ Key Visual">
                    <Input
                      type="number"
                      min={0}
                      value={editingBrandPlan.keyVisualSisPlan.kvDirectionCount}
                      onChange={(e) =>
                        setEditingBrandPlan(prev =>
                          prev
                            ? {
                                ...prev,
                                keyVisualSisPlan: {
                                  ...prev.keyVisualSisPlan,
                                  kvDirectionCount: Number(e.target.value) || 0,
                                },
                              }
                            : prev
                        )
                      }
                    />
                  </Field>
                  <Field label="Bộ SIS/Banner">
                    <Input
                      type="number"
                      min={0}
                      value={editingBrandPlan.keyVisualSisPlan.sisBannerPackageCount}
                      onChange={(e) =>
                        setEditingBrandPlan(prev =>
                          prev
                            ? {
                                ...prev,
                                keyVisualSisPlan: {
                                  ...prev.keyVisualSisPlan,
                                  sisBannerPackageCount: Number(e.target.value) || 0,
                                },
                              }
                            : prev
                        )
                      }
                    />
                  </Field>
                  <Field label="Bộ PDP/SEO">
                    <Input
                      type="number"
                      min={0}
                      value={editingBrandPlan.keyVisualSisPlan.pdpSeoProductCount}
                      onChange={(e) =>
                        setEditingBrandPlan(prev =>
                          prev
                            ? {
                                ...prev,
                                keyVisualSisPlan: {
                                  ...prev.keyVisualSisPlan,
                                  pdpSeoProductCount: Number(e.target.value) || 0,
                                },
                              }
                            : prev
                        )
                      }
                    />
                  </Field>
                </div>

                <Field label="Chủ đề Key Visual & Trang trí SIS/PDP tháng">
                  <Textarea
                    rows={2}
                    value={editingBrandPlan.keyVisualSisPlan.designTheme}
                    onChange={(e) =>
                      setEditingBrandPlan(prev =>
                        prev
                          ? {
                              ...prev,
                              keyVisualSisPlan: {
                                ...prev.keyVisualSisPlan,
                                designTheme: e.target.value,
                              },
                            }
                          : prev
                      )
                    }
                  />
                </Field>

                <Field label="Ghi chú thực thi Key Visual / SIS">
                  <Textarea
                    rows={2}
                    value={editingBrandPlan.keyVisualSisPlan.notes}
                    onChange={(e) =>
                      setEditingBrandPlan(prev =>
                        prev
                          ? {
                              ...prev,
                              keyVisualSisPlan: {
                                ...prev.keyVisualSisPlan,
                                notes: e.target.value,
                              },
                            }
                          : prev
                      )
                    }
                  />
                </Field>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Biểu mẫu 1-Sheet Trình Brand (Monthly Content & Key Visual Plan — Template 1 Sheet) */}
      <Modal
        open={!!oneSheetBrandPlan}
        onClose={() => setOneSheetBrandPlan(null)}
        title={
          oneSheetBrandPlan
            ? `Biểu mẫu 1-Sheet Trình Brand — ${oneSheetBrandPlan.brandName} (${oneSheetBrandPlan.month})`
            : 'Biểu mẫu 1-Sheet Trình Brand'
        }
        size="xl"
      >
        {oneSheetBrandPlan && (
          <BrandOneSheetPlanView
            brandName={oneSheetBrandPlan.brandName}
            month={oneSheetBrandPlan.month}
            brandPlan={oneSheetBrandPlan}
            storePlans={plans}
            storePortfolios={storePortfolios}
            campaigns={effectiveCampaigns}
            onSaveOneSheetData={(newData) => {
              setBrandMonthlyPlans(prev =>
                prev.map(item =>
                  item.id === oneSheetBrandPlan.id
                    ? {
                        ...item,
                        oneSheetPlanData: newData,
                        updatedAt: new Date().toLocaleDateString('vi-VN'),
                      }
                    : item
                )
              );
              setOneSheetBrandPlan(prev => (prev ? { ...prev, oneSheetPlanData: newData } : null));
              if (onNotify) {
                onNotify(`Đã lưu Biểu mẫu 1-Sheet Trình Brand cho ${oneSheetBrandPlan.brandName} (${oneSheetBrandPlan.month}).`);
              }
            }}
            onNotify={onNotify}
          />
        )}
      </Modal>
    </div>
  );
};


