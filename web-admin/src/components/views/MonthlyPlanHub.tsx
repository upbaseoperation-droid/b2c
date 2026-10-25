'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  PageHeaderNav,
  ActionMenu,
  Status,
  Avatar,
  BrandAvatar,
  useFlipList
} from '../ui';
import { formatVndShort } from '../../lib/format';
import { pushSharedStateToDb } from '../../lib/sharedStateClient';
import { KEY_VISUAL_CATEGORY_LABEL, uploadKeyVisualImageClient } from '../brands/brandUi';
import { PlanOrderUploadModal } from './PlanOrderUploadModal';
import { PlanWeeklyBreakdown } from './PlanWeeklyBreakdown';
import {
  getBreakdownHealth,
  evaluatePlanValiditySummary,
  distributeReference41ToWeeks,
  comparePlanWithNewReference41,
  type PlanValidityEvaluation,
} from '../../lib/planBreakdownRules';
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
  CheckCircle2,
  ChevronLeft,
  Save,
  Trash2,
  Image as ImageIcon,
  Loader2,
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
  KeyVisualAssetCategory,
  KeyVisualAssetItem,
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

function normStoreSlug(value?: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
}

function buildPlanLookupMap(plans: InputPlanBreakdownState[], month: string) {
  const byStoreId = new Map<string, InputPlanBreakdownState>();
  const byStoreSlug = new Map<string, InputPlanBreakdownState>();
  const byBrandName = new Map<string, InputPlanBreakdownState>();
  const brandPrefixList: Array<{ prefix: string; brandName: string; plan: InputPlanBreakdownState }> = [];

  for (const p of plans) {
    if (month !== 'ALL' && p.month !== month) continue;
    if (p.storeId) byStoreId.set(p.storeId, p);
    if (p.storeName) byStoreSlug.set(normStoreSlug(p.storeName), p);
    // Chỉ dùng brandName fallback khi kế hoạch chưa gắn storeId/storeName cụ thể
    if (!p.storeId && !p.storeName && p.brandName) {
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
    const sSlug = normStoreSlug(store.storeName);
    if (sSlug && byStoreSlug.has(sSlug)) return byStoreSlug.get(sSlug)!;
    const sName = (store.storeName || '').trim().toLowerCase();
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
  if (!plan) {
    return {
      totalBudget: 0,
      allocatedBudget: 0,
      totalVideos: 0,
      affPaidQty: 0,
      affPaidBudget: 0,
      focQty: 0,
      selfQty: 0,
      selfBudget: 0,
      otherQty: 0,
      otherBudget: 0,
    };
  }

  if (plan.reference41) {
    const ref = plan.reference41;
    const items = plan.items || [];
    const affPaidItems = items.filter(it => it.channel === 'TIKTOK' && !it.tierCode.includes('TAP') && it.totalBudget > 0);
    const focItems = items.filter(it => it.tierCode.includes('TAP') || (it.channel === 'TIKTOK' && it.totalBudget === 0));
    const selfItems = items.filter(it => it.channel === 'SELF_CHANNEL');
    const otherItems = items.filter(it => ['SHOPEE', 'SHOPEE_LAZADA', 'FACEBOOK', 'INSTAGRAM', 'THREADS'].includes(it.channel));

    const mp = ref.multiPlatform;
    const refOtherQty = mp
      ? (mp.shopee?.affQty || 0) + (mp.shopee?.reupQty || 0) +
        (mp.threads?.affQty || 0) + (mp.threads?.reupQty || 0) +
        (mp.facebook?.affQty || 0) + (mp.facebook?.reupQty || 0) +
        (mp.instagram?.affQty || 0) + (mp.instagram?.reupQty || 0)
      : 0;
    const refOtherBudget = mp
      ? (mp.shopee?.costNet || 0) + (mp.threads?.costNet || 0) + (mp.facebook?.costNet || 0) + (mp.instagram?.costNet || 0)
      : 0;

    const affPaidQty = affPaidItems.reduce((s, i) => s + (i.qty || 0), 0) || ref.cast || 0;
    const affPaidBudget = affPaidItems.reduce((s, i) => s + (i.totalBudget || 0), 0) || ref.affCostNet || 0;
    const focQty = focItems.reduce((s, i) => s + (i.qty || 0), 0) || ref.foc || 0;
    const selfQty = selfItems.reduce((s, i) => s + (i.qty || 0), 0) || ref.selfVideos || 0;
    const selfBudget = selfItems.reduce((s, i) => s + (i.totalBudget || 0), 0) || ref.selfCostNet || 0;
    const otherQty = otherItems.reduce((s, i) => s + (i.qty || 0), 0) || refOtherQty;
    const otherBudget = otherItems.reduce((s, i) => s + (i.totalBudget || 0), 0) || refOtherBudget;
    const totalBudget = plan.totalTargetBudget ?? (ref.affCostNet + ref.selfCostNet + ref.liveCostNet + refOtherBudget);
    const allocatedBudget = affPaidBudget + selfBudget + otherBudget + (ref.liveCostNet || 0);
    const totalVideos = plan.totalTargetContents || (affPaidQty + focQty + selfQty + otherQty + (ref.liveSessions || 0));

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
  const otherItems = items.filter(it => ['SHOPEE', 'SHOPEE_LAZADA', 'FACEBOOK', 'INSTAGRAM', 'THREADS'].includes(it.channel));

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
  validity: PlanValidityEvaluation;
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
  onOpenGovernanceDashboard?: () => void;
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
  onOpenGovernanceDashboard,
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
      ['ADMIN', 'MANAGER', 'LEADER'].includes(currentUser.role)
  );

  // Tab chuyển góc nhìn: Ma trận gian hàng vs Kế hoạch theo Brand (3 vị trí) vs Hệ số gian hàng (Bảng 2) vs Kế hoạch theo nhân sự vs Danh mục kế hoạch
  const [rawActiveHubTab, setActiveHubTab] = useState<'STORE_GOVERNANCE' | 'BRAND_PLANS' | 'STORE_COEFFICIENTS' | 'PERSONAL_PLANS' | 'PLAN_CATALOG'>('STORE_GOVERNANCE');
  const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null);
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
  const [brandModalTab, setBrandModalTab] = useState<'ONE_SHEET' | 'POSITIONS'>('ONE_SHEET');
  const posKvFileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingPosKv, setUploadingPosKv] = useState<boolean>(false);
  const [posKvUploadCategory, setPosKvUploadCategory] = useState<KeyVisualAssetCategory>('MASTER_KV');
  const [previewPosKvImg, setPreviewPosKvImg] = useState<KeyVisualAssetItem | null>(null);

  // Khôi phục Kế hoạch tháng theo Brand đã lưu từ localStorage (nếu có) và lắng nghe đồng bộ từ DB
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const applySavedPlans = (savedList?: BrandMonthlyPlanItem[]) => {
      try {
        let list = savedList;
        if (!list) {
          const raw = window.localStorage.getItem('b2c_brand_monthly_plans_v1');
          if (!raw) return;
          list = JSON.parse(raw) as BrandMonthlyPlanItem[];
        }
        if (!Array.isArray(list) || list.length === 0) return;
        const savedMap = new Map(list.map(item => [item.id, item]));
        setBrandMonthlyPlans(prev => prev.map(item => savedMap.get(item.id) || item));
      } catch {
        /* bỏ qua lỗi đọc localStorage */
      }
    };

    applySavedPlans();

    const handleUpdated = (evt: Event) => {
      const customEvt = evt as CustomEvent<BrandMonthlyPlanItem[]>;
      applySavedPlans(customEvt.detail);
    };

    window.addEventListener('upbase:brand-monthly-plans-updated', handleUpdated);
    return () => window.removeEventListener('upbase:brand-monthly-plans-updated', handleUpdated);
  }, []);

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

  // Tự động cộng gộp số liệu từ Kế hoạch các Gian hàng thuộc từng Brand trong kỳ
  const brandStoreRollupMap = useMemo(() => {
    const map = new Map<
      string,
      {
        stores: StorePortfolioItem[];
        storePlans: InputPlanBreakdownState[];
        storeBudget: number;
        storeGmv: number;
        storeVideos: number;
        affPaidQty: number;
        focQty: number;
        selfQty: number;
      }
    >();
    const lookupStorePlan = selectedMonth === 'ALL' ? null : buildPlanLookupMap(scopedPlans, selectedMonth);

    // Pre-index stores and plans by normalized brand name / slug for O(1) lookup
    const storesByBrandNorm = new Map<string, StorePortfolioItem[]>();
    const storesByBrandSlug = new Map<string, StorePortfolioItem[]>();
    const storeBySlug = new Map<string, StorePortfolioItem>();
    for (const s of effectiveStores) {
      const sBrand = (s.brandName || '').trim().toLowerCase();
      if (sBrand) {
        const list = storesByBrandNorm.get(sBrand) || [];
        list.push(s);
        storesByBrandNorm.set(sBrand, list);
      }
      const sSlug = normStoreSlug(s.brandName);
      if (sSlug.length >= 2) {
        const list = storesByBrandSlug.get(sSlug) || [];
        list.push(s);
        storesByBrandSlug.set(sSlug, list);
      }
      const nameSlug = normStoreSlug(s.storeName);
      if (nameSlug) storeBySlug.set(nameSlug, s);
    }

    const plansByBrandNorm = new Map<string, InputPlanBreakdownState[]>();
    const plansByBrandSlug = new Map<string, InputPlanBreakdownState[]>();
    for (const p of scopedPlans) {
      if (selectedMonth !== 'ALL' && p.month !== selectedMonth) continue;
      const pBrand = (p.parentBrand || p.brandName.split('_')[0] || '').trim().toLowerCase();
      if (pBrand) {
        const list = plansByBrandNorm.get(pBrand) || [];
        list.push(p);
        plansByBrandNorm.set(pBrand, list);
      }
      const pSlug = normStoreSlug(pBrand);
      if (pSlug) {
        const list = plansByBrandSlug.get(pSlug) || [];
        list.push(p);
        plansByBrandSlug.set(pSlug, list);
      }
    }

    for (const bp of brandMonthlyPlans) {
      const bNorm = (bp.brandName || '').trim().toLowerCase();
      const bSlug = normStoreSlug(bp.brandName);
      const storesSet = new Set<StorePortfolioItem>(storesByBrandNorm.get(bNorm) || []);
      if (bSlug.length >= 2) {
        for (const s of storesByBrandSlug.get(bSlug) || []) storesSet.add(s);
      }
      const stores = Array.from(storesSet);

      const matchedPlansMap = new Map<string, InputPlanBreakdownState>();
      if (lookupStorePlan) {
        for (const st of stores) {
          const p = lookupStorePlan(st);
          if (p) matchedPlansMap.set(p.id, p);
        }
      }
      for (const p of plansByBrandNorm.get(bNorm) || []) {
        matchedPlansMap.set(p.id, p);
      }
      if (bSlug) {
        for (const p of plansByBrandSlug.get(bSlug) || []) {
          matchedPlansMap.set(p.id, p);
        }
      }

      const storePlans = Array.from(matchedPlansMap.values());
      let storeBudget = 0;
      let storeGmv = 0;
      let storeVideos = 0;
      let affPaidQty = 0;
      let focQty = 0;
      let selfQty = 0;

      if (storePlans.length > 0) {
        for (const p of storePlans) {
          const st =
            stores.find(s => s.id === p.storeId) ||
            (p.storeName ? storeBySlug.get(normStoreSlug(p.storeName)) : undefined);
          const bd = getB2cPlanBreakdown(p, st);
          storeBudget += bd.totalBudget;
          storeGmv += p.targetGmv || st?.monthlyTargetGmv || 0;
          storeVideos += bd.totalVideos;
          affPaidQty += bd.affPaidQty;
          focQty += bd.focQty;
          selfQty += bd.selfQty;
        }
      } else if (selectedMonth === '2026/10') {
        for (const st of stores) {
          storeBudget += st.monthlyBudget || st.budgetNet || 0;
          storeGmv += st.monthlyTargetGmv || 0;
        }
      }

      map.set(bp.id, {
        stores,
        storePlans,
        storeBudget,
        storeGmv,
        storeVideos,
        affPaidQty,
        focQty,
        selfQty,
      });
    }
    return map;
  }, [brandMonthlyPlans, effectiveStores, scopedPlans, selectedMonth]);

  // Lưu Kế hoạch tháng theo Brand vào state + localStorage + đồng bộ sang các Plan Gian hàng thuộc Brand
  const persistBrandMonthlyPlan = (updatedRaw: BrandMonthlyPlanItem) => {
    const os = updatedRaw.oneSheetPlanData;
    const syncedContentPlan = os
      ? {
          ...updatedRaw.contentBrandMainPlan,
          contentPillarsCount: os.contentPillars?.length || updatedRaw.contentBrandMainPlan.contentPillarsCount,
          heroScriptsTarget:
            (os.tiktokContentRows?.length || 0) + (os.shopeeContentRows?.length || 0) ||
            updatedRaw.contentBrandMainPlan.heroScriptsTarget,
          focusPillars:
            os.contentPillars?.map(p => p.pillarName).join(' • ') ||
            updatedRaw.contentBrandMainPlan.focusPillars,
        }
      : updatedRaw.contentBrandMainPlan;

    const syncedStrategyPlan = os
      ? {
          ...updatedRaw.planStrategyPlan,
          bigIdeaAndKeyMessage:
            os.orientation?.bigIdeaMonthlyTheme || updatedRaw.planStrategyPlan.bigIdeaAndKeyMessage,
        }
      : updatedRaw.planStrategyPlan;

    const mergedKvImages =
      os?.keyVisual?.kvImages !== undefined
        ? os.keyVisual.kvImages
        : updatedRaw.keyVisualSisPlan.kvImages;

    const syncedKvPlan = {
      ...updatedRaw.keyVisualSisPlan,
      designTheme: os?.keyVisual?.theme || updatedRaw.keyVisualSisPlan.designTheme,
      kvImages: mergedKvImages,
    };

    const syncedOneSheet = os
      ? {
          ...os,
          keyVisual: {
            ...os.keyVisual,
            kvImages: mergedKvImages,
          },
        }
      : undefined;

    const updated: BrandMonthlyPlanItem = {
      ...updatedRaw,
      contentBrandMainPlan: syncedContentPlan,
      planStrategyPlan: syncedStrategyPlan,
      keyVisualSisPlan: syncedKvPlan,
      oneSheetPlanData: syncedOneSheet,
    };

    setBrandMonthlyPlans(prev => {
      const next = prev.map(item => (item.id === updated.id ? updated : item));
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('b2c_brand_monthly_plans_v1', JSON.stringify(next));
          pushSharedStateToDb('brand-monthly-plans-v1', next);
        } catch {
          /* bỏ qua lỗi lưu localStorage */
        }
      }
      return next;
    });

    if (os && onUpdatePlan) {
      const rollup = brandStoreRollupMap.get(updated.id);
      for (const sp of rollup?.storePlans || []) {
        onUpdatePlan(sp.id, { oneSheetPlanData: os });
      }
    }
  };

  const monthScopedBrandMonthlyPlans = useMemo<BrandMonthlyPlanItem[]>(() => {
    if (selectedMonth === 'ALL' || selectedMonth === '2026/10') {
      return brandMonthlyPlans;
    }
    return brandMonthlyPlans
      .filter(bp => {
        if (bp.month === selectedMonth) return true;
        const rollup = brandStoreRollupMap.get(bp.id);
        return Boolean(rollup && rollup.storePlans.length > 0);
      })
      .map(bp => ({
        ...bp,
        month: selectedMonth,
      }));
  }, [brandMonthlyPlans, brandStoreRollupMap, selectedMonth]);

  const brandPlanKpis = useMemo(() => {
    const list = monthScopedBrandMonthlyPlans;
    const total = list.length;
    const totalBudget = list.reduce((s, b) => {
      const rollup = brandStoreRollupMap.get(b.id);
      const bgt = (rollup && rollup.storeBudget > 0) ? rollup.storeBudget : (selectedMonth === '2026/10' ? (b.planStrategyPlan.targetBrandBudget || 0) : 0);
      return s + bgt;
    }, 0);
    const totalGmv = list.reduce((s, b) => {
      const rollup = brandStoreRollupMap.get(b.id);
      const gmv = (rollup && rollup.storeGmv > 0) ? rollup.storeGmv : (selectedMonth === '2026/10' ? (b.planStrategyPlan.targetBrandGmv || 0) : 0);
      return s + gmv;
    }, 0);
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
  }, [monthScopedBrandMonthlyPlans, brandStoreRollupMap, selectedMonth]);

  const filteredBrandMonthlyPlans = useMemo(() => {
    const q = brandPlanSearch.trim().toLowerCase();
    return monthScopedBrandMonthlyPlans.filter(bp => {
      if (!isStaffGlobalAdminOrManager(currentUser) && !isBrandManagedByUser(bp.brandName, currentUser, effectiveStores)) {
        return false;
      }
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
  }, [monthScopedBrandMonthlyPlans, brandPlanCampaignFilter, brandPlanStatusFilter, brandPlanStaffFilter, brandPlanPositionFilter, brandPlanSearch, currentUser, effectiveStores]);

  // Bộ lọc cho Tab Kế hoạch của riêng từng nhân sự
  const [personalRoleFilter, setPersonalRoleFilter] = useState<
    'ALL' | 'BOOKING' | 'CONTENT_SELF_CHANNEL' | 'FOC' | 'MULTI_PLATFORM' | 'CONTENT_BRAND_MAIN' | 'PLAN_STRATEGY' | 'KEY_VISUAL_SIS'
  >('ALL');
  const [personalSelectedStaff, setPersonalSelectedStaff] = useState<string>('ALL');
  const [personalWorkstreamFilter, setPersonalWorkstreamFilter] = useState<'ALL' | B2cWorkstreamType>('ALL');
  const [personalSearchQuery, setPersonalSearchQuery] = useState<string>('');

  // Lọc cho Ma trận gian hàng (mặc định lọc gian B2C làm kế hoạch)
  const [storeGovernanceFilter, setStoreGovernanceFilter] = useState<
    | 'ALL'
    | 'B2C_ONLY'
    | 'MULTI_VERSION'
    | 'MISSING_PLAN'
    | 'PENDING_APPROVAL'
    | 'PENDING_PRE_APPROVAL'
    | 'REVISION_REQUESTED'
    | 'DRAFT'
    | 'APPROVED'
    | 'EXEMPT'
    | 'PENDING_41_DIFF'
    | 'UNCONFIRMED_41'
    | 'CONFIRMED_41'
    | 'HAS_WEEKLY_411'
    | 'EMPTY_WEEKLY'
    | 'VALID_MATCHED'
    | 'VALID_WITH_NOTE'
    | 'INVALID_411'
    | 'UNEXPLAINED_MISMATCH'
    | 'HAS_ERRORS'
    | 'PRICE_WARNING'
  >('B2C_ONLY');
  const [storeSearchQuery, setStoreSearchQuery] = useState<string>('');
  const [governanceRouteFilter, setGovernanceRouteFilter] = useState<'ALL' | 'WITH_LEADER' | 'DIRECT_HEAD'>('ALL');
  const [governancePlatformFilter, setGovernancePlatformFilter] = useState<'ALL' | 'TikTok Shop' | 'Shopee Mall'>('ALL');
  const [governancePicFilter, setGovernancePicFilter] = useState<string>('ALL');
  const [governancePage, setGovernancePage] = useState<number>(1);
  const GOVERNANCE_PAGE_SIZE = 15;
  const [isGovernanceOverviewModalOpen, setIsGovernanceOverviewModalOpen] = useState<boolean>(false);
  const [approvingQuickPlan, setApprovingQuickPlan] = useState<{ planId: string; storeName: string } | null>(null);
  const [inspectingStoreId, setInspectingStoreId] = useState<string | null>(null);
  const [auditNoteDraft, setAuditNoteDraft] = useState<string>('');
  const [revisionReasonDraft, setRevisionReasonDraft] = useState<string>('');

  // Bảng hứng kế hoạch B2C Booking từ Larkbase (API / Webhook)
  const [isLarkbaseModalOpen, setIsLarkbaseModalOpen] = useState<boolean>(false);
  const [larkbaseRecords, setLarkbaseRecords] = useState<LarkbaseBookingPlanRecordItem[]>([]);
  const [larkbaseConvertedPlans, setLarkbaseConvertedPlans] = useState<InputPlanBreakdownState[]>([]);
  const [larkbaseAppToken, setLarkbaseAppToken] = useState<string>('W6vRbbuOVar3qtsV18dlan1xgXb');
  const [larkbaseTableId, setLarkbaseTableId] = useState<string>('tblvgyOkneDKOVsB');
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
    const monthPlans = selectedMonth === 'ALL' ? scopedPlans : scopedPlans.filter(p => p.month === selectedMonth);
    const hasFullMonth41Batch = monthPlans.filter(p => Boolean(p.reference41)).length >= 50;

    if (hasFullMonth41Batch) {
      const storeById = new Map(activeStores.map(s => [s.id, s]));
      const storeBySlug = new Map(activeStores.map(s => [normStoreSlug(s.storeName), s]));
      return monthPlans.map(plan => {
        const matched =
          (plan.storeId ? storeById.get(plan.storeId) : undefined) ||
          (plan.storeName ? storeBySlug.get(normStoreSlug(plan.storeName)) : undefined);
        const sName = plan.storeName || matched?.storeName || plan.brandName;
        const rowId = selectedMonth === 'ALL' ? `${matched?.id || plan.id}-${plan.month}` : (matched?.id || plan.storeId || `store-b2c-${normStoreSlug(sName).toLowerCase()}`);
        const store: StorePortfolioItem = matched
          ? {
              ...matched,
              id: rowId,
              storeName: selectedMonth === 'ALL' ? `${sName} (${plan.month})` : sName,
              primaryPic: plan.primaryPic || plan.pic || matched.primaryPic,
              assignedStaff: plan.primaryPic || plan.pic || matched.assignedStaff,
              hasBookingLeader: Boolean(plan.bookingLeader),
              bookingLeader: plan.bookingLeader,
            }
          : {
              id: rowId,
              storeOperationId: `SO-${normStoreSlug(sName).slice(0, 8)}`,
              brandName: plan.brandName,
              storeName: selectedMonth === 'ALL' ? `${sName} (${plan.month})` : sName,
              platform: sName.toLowerCase().includes('shopee') ? 'Shopee Mall' : 'TikTok Shop',
              serviceModel: 'FULL_SERVICE',
              difficultyTier: 'Tiêu chuẩn',
              difficultyMultiplier: 1.2,
              accountStatus: 'ACTIVE',
              category: 'Tiêu dùng & Bán lẻ',
              monthlyTargetGmv: plan.targetGmv || 0,
              monthlyBudget: plan.totalTargetBudget || 0,
              budgetNet: plan.totalTargetBudget || 0,
              accountOwnerName: 'Đào Phương Anh',
              b2cOwnerName: plan.primaryPic || plan.pic || 'Chưa phân công',
              primaryPic: plan.primaryPic || plan.pic || 'Chưa phân công',
              assignedStaff: plan.primaryPic || plan.pic || 'Chưa phân công',
              hasBookingLeader: Boolean(plan.bookingLeader),
              bookingLeader: plan.bookingLeader,
              isB2cManaged: true,
              requiresB2cPlan: true,
            };
        return {
          store,
          isB2c: true,
          plan,
          hasPlan: true,
          status: (plan.status || 'DRAFT') as MonthlyPlanStatus,
          breakdown: getB2cPlanBreakdown(plan, store),
          workstreamSummary: getStorePlanWorkstreamSummary(plan),
          validity: evaluatePlanValiditySummary(plan),
        };
      });
    }

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
        validity: evaluatePlanValiditySummary(plan),
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
    if (activeHubTab !== 'PERSONAL_PLANS') return [];
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
  }, [activeHubTab, allPersonalPackages, personalRoleFilter]);

  const filteredPersonalPackages = useMemo(() => {
    if (activeHubTab !== 'PERSONAL_PLANS') return [];
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
  }, [activeHubTab, allPersonalPackages, personalRoleFilter, personalSelectedStaff, personalWorkstreamFilter, personalSearchQuery]);

  // Bộ chỉ số quản trị duyệt kế hoạch & tổng hợp 4 đầu việc B2C theo tháng
  const governanceStats = useMemo(() => {
    const totalActive = activeStores.length;
    const b2cList = storeGovernanceList.filter((item: StoreGovernanceItem) => item.isB2c);
    const exemptList = storeGovernanceList.filter((item: StoreGovernanceItem) => !item.isB2c);

    const totalB2cManaged = b2cList.length;
    const totalExempt = exemptList.length;

    const withPlan = b2cList.filter((item: StoreGovernanceItem) => item.hasPlan);
    const missingPlan = b2cList.filter((item: StoreGovernanceItem) => !item.hasPlan);

    // Chặng 1: Tiến độ Plan Tổng 4.1
    const confirmed41 = b2cList.filter(
      (item: StoreGovernanceItem) => item.hasPlan && item.validity.is41Confirmed && !item.validity.hasPending41Diff
    );
    const pending41Diff = b2cList.filter((item: StoreGovernanceItem) => Boolean(item.plan?.pendingReference41));
    const unconfirmed41 = b2cList.filter((item: StoreGovernanceItem) => item.plan?.reference41?.isGrowthLocked === false);

    // Chặng 2: Tiến độ Plan Chi tiết 4.1.1 (Phân rã tuần)
    const hasWeekly411 = b2cList.filter((item: StoreGovernanceItem) => item.hasPlan && item.validity.hasWeeklyBreakdown);
    const emptyWeekly411 = b2cList.filter((item: StoreGovernanceItem) => item.hasPlan && !item.validity.hasWeeklyBreakdown);
    const weekly411Pct = totalB2cManaged > 0 ? Math.round((hasWeekly411.length / totalB2cManaged) * 100) : 0;

    // Chặng 3: Tính hợp lệ 4.1 vs 4.1.1
    const validMatched = b2cList.filter((item: StoreGovernanceItem) => item.validity.state === 'VALID_MATCHED');
    const validWithNote = b2cList.filter((item: StoreGovernanceItem) => item.validity.state === 'VALID_WITH_NOTE');
    const validTotal = b2cList.filter((item: StoreGovernanceItem) => item.validity.isValidForSubmit);
    const invalid411 = b2cList.filter((item: StoreGovernanceItem) => item.hasPlan && !item.validity.isValidForSubmit);
    const unexplainedMismatch = b2cList.filter((item: StoreGovernanceItem) => item.validity.state === 'UNEXPLAINED_MISMATCH');
    const hasErrors = b2cList.filter((item: StoreGovernanceItem) => item.validity.state === 'HAS_ERRORS');
    const priceWarnings = b2cList.filter((item: StoreGovernanceItem) => item.validity.priceWarningCount > 0);
    const validPct = withPlan.length > 0 ? Math.round((validTotal.length / withPlan.length) * 100) : 0;

    // Chặng 4: Tiến độ Phê duyệt & Thực thi
    const approved = b2cList.filter((item: StoreGovernanceItem) => item.plan && ['LEAD_APPROVED', 'BRAND_APPROVED', 'APPROVED', 'IN_EXECUTION', 'COMPLETED'].includes(item.plan.status || ''));
    const pendingApproval = b2cList.filter((item: StoreGovernanceItem) => item.plan && item.plan.status === 'PENDING_APPROVAL');
    const pendingPreApproval = b2cList.filter((item: StoreGovernanceItem) => item.plan && (item.plan.status === 'PENDING_PRE_APPROVAL' || item.plan.status === 'PRE_APPROVED'));
    const revisionRequested = b2cList.filter((item: StoreGovernanceItem) => item.plan && item.plan.status === 'REVISION_REQUESTED');
    const draft = b2cList.filter((item: StoreGovernanceItem) => item.plan && (item.plan.status === 'DRAFT' || !item.plan.status));
    const multiVersion = b2cList.filter((item: StoreGovernanceItem) => item.plan && getPlanVersionSnapshots(item.plan).length > 1);
    const readyToBatchApprove = b2cList.filter(
      (item: StoreGovernanceItem) =>
        item.plan &&
        item.validity.isValidForSubmit &&
        ['PENDING_APPROVAL', 'PRE_APPROVED', 'PENDING_PRE_APPROVAL'].includes(item.plan.status || '')
    );

    const withLeaderList = b2cList.filter((item: StoreGovernanceItem) => Boolean(item.plan?.hasBookingLeader ?? item.store.hasBookingLeader));
    const directHeadList = b2cList.filter((item: StoreGovernanceItem) => !Boolean(item.plan?.hasBookingLeader ?? item.store.hasBookingLeader));

    // Ma trận điểm nghẽn theo từng Chuyên viên phụ trách (PIC)
    const picMap = new Map<
      string,
      {
        picName: string;
        totalStores: number;
        approvedCount: number;
        validCount: number;
        emptyWeeklyCount: number;
        invalidCount: number;
        missingCount: number;
        bottleneckCount: number;
      }
    >();
    for (const item of b2cList) {
      const picName = item.store.b2cOwners?.[0] || item.store.b2cOwnerName || item.plan?.pic || 'Chưa phân công';
      const entry = picMap.get(picName) || {
        picName,
        totalStores: 0,
        approvedCount: 0,
        validCount: 0,
        emptyWeeklyCount: 0,
        invalidCount: 0,
        missingCount: 0,
        bottleneckCount: 0,
      };
      entry.totalStores += 1;
      const isApproved = Boolean(
        item.plan && ['LEAD_APPROVED', 'BRAND_APPROVED', 'APPROVED', 'IN_EXECUTION', 'COMPLETED'].includes(item.plan.status || '')
      );
      if (isApproved) entry.approvedCount += 1;
      if (item.validity.isValidForSubmit) entry.validCount += 1;
      if (!item.hasPlan) entry.missingCount += 1;
      else if (!item.validity.hasWeeklyBreakdown) entry.emptyWeeklyCount += 1;
      else if (!item.validity.isValidForSubmit) entry.invalidCount += 1;

      if (!item.hasPlan || !item.validity.isValidForSubmit || item.plan?.status === 'REVISION_REQUESTED') {
        entry.bottleneckCount += 1;
      }
      picMap.set(picName, entry);
    }
    const picBottleneckSummary = Array.from(picMap.values()).sort(
      (a, b) => b.bottleneckCount - a.bottleneckCount || b.totalStores - a.totalStores
    );

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
      countWithLeader: withLeaderList.length,
      countDirectHead: directHeadList.length,
      countWithPlan: withPlan.length,
      countMissingPlan: missingPlan.length,
      countConfirmed41: confirmed41.length,
      countPending41Diff: pending41Diff.length,
      countUnconfirmed41: unconfirmed41.length,
      countHasWeekly411: hasWeekly411.length,
      countEmptyWeekly411: emptyWeekly411.length,
      emptyWeekly411List: emptyWeekly411,
      weekly411Pct,
      countValidMatched: validMatched.length,
      countValidWithNote: validWithNote.length,
      countValidTotal: validTotal.length,
      countInvalid411: invalid411.length,
      countUnexplainedMismatch: unexplainedMismatch.length,
      countHasErrors: hasErrors.length,
      countPriceWarnings: priceWarnings.length,
      validPct,
      countApproved: approved.length,
      countPendingApproval: pendingApproval.length,
      countPendingPreApproval: pendingPreApproval.length,
      countRevisionRequested: revisionRequested.length,
      countDraft: draft.length,
      countMultiVersion: multiVersion.length,
      countReadyToBatchApprove: readyToBatchApprove.length,
      readyToBatchApproveList: readyToBatchApprove,
      picBottleneckSummary,
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
      if (storeGovernanceFilter === 'CONFIRMED_41' && (!item.isB2c || !item.hasPlan || !item.validity.is41Confirmed || item.validity.hasPending41Diff)) return false;
      if (storeGovernanceFilter === 'PENDING_41_DIFF' && !item.plan?.pendingReference41) return false;
      if (storeGovernanceFilter === 'UNCONFIRMED_41' && item.plan?.reference41?.isGrowthLocked !== false) return false;
      if (storeGovernanceFilter === 'HAS_WEEKLY_411' && (!item.isB2c || !item.hasPlan || !item.validity.hasWeeklyBreakdown)) return false;
      if (storeGovernanceFilter === 'EMPTY_WEEKLY' && (!item.isB2c || !item.hasPlan || item.validity.hasWeeklyBreakdown)) return false;
      if (storeGovernanceFilter === 'VALID_MATCHED' && item.validity.state !== 'VALID_MATCHED') return false;
      if (storeGovernanceFilter === 'VALID_WITH_NOTE' && item.validity.state !== 'VALID_WITH_NOTE') return false;
      if (storeGovernanceFilter === 'INVALID_411' && (!item.isB2c || !item.hasPlan || item.validity.isValidForSubmit)) return false;
      if (storeGovernanceFilter === 'UNEXPLAINED_MISMATCH' && item.validity.state !== 'UNEXPLAINED_MISMATCH') return false;
      if (storeGovernanceFilter === 'HAS_ERRORS' && item.validity.state !== 'HAS_ERRORS') return false;
      if (storeGovernanceFilter === 'PRICE_WARNING' && item.validity.priceWarningCount === 0) return false;
      if (storeGovernanceFilter === 'PENDING_PRE_APPROVAL' && (!item.plan || (item.plan.status !== 'PENDING_PRE_APPROVAL' && item.plan.status !== 'PRE_APPROVED'))) return false;
      if (storeGovernanceFilter === 'PENDING_APPROVAL' && (!item.plan || item.plan.status !== 'PENDING_APPROVAL')) return false;
      if (storeGovernanceFilter === 'REVISION_REQUESTED' && (!item.plan || item.plan.status !== 'REVISION_REQUESTED')) return false;
      if (storeGovernanceFilter === 'DRAFT' && (!item.plan || (item.plan.status && item.plan.status !== 'DRAFT'))) return false;
      if (storeGovernanceFilter === 'APPROVED' && (!item.plan || !['LEAD_APPROVED', 'BRAND_APPROVED', 'APPROVED', 'IN_EXECUTION', 'COMPLETED'].includes(item.plan.status || ''))) return false;

      const hasLeader = Boolean(item.plan?.hasBookingLeader ?? item.store.hasBookingLeader);
      if (governanceRouteFilter === 'WITH_LEADER' && !hasLeader) return false;
      if (governanceRouteFilter === 'DIRECT_HEAD' && hasLeader) return false;

      if (governancePlatformFilter !== 'ALL' && item.store.platform !== governancePlatformFilter) return false;

      if (governancePicFilter !== 'ALL') {
        const picName = item.store.b2cOwners?.[0] || item.store.b2cOwnerName || item.plan?.pic || 'Chưa phân công';
        if (picName !== governancePicFilter) return false;
      }

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
  }, [storeGovernanceList, storeGovernanceFilter, governanceRouteFilter, governancePlatformFilter, governancePicFilter, storeSearchQuery]);

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

  const handleSaveBrandPlan = (closeAfter = false) => {
    if (!editingBrandPlan) return;
    const updated: BrandMonthlyPlanItem = {
      ...editingBrandPlan,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.name || editingBrandPlan.planStrategyPic,
    };
    persistBrandMonthlyPlan(updated);
    if (closeAfter) {
      setEditingBrandPlan(null);
    } else {
      setEditingBrandPlan(updated);
    }
    notify(`Đã lưu và đồng bộ kế hoạch tháng cấp Brand của ${updated.brandName}!`);
  };

  const handleApproveBrandPlan = () => {
    if (!editingBrandPlan) return;
    const updated: BrandMonthlyPlanItem = {
      ...editingBrandPlan,
      status: 'APPROVED',
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.name || editingBrandPlan.planStrategyPic,
      approvedBy: currentUser?.name || 'Đặng Thị Yến Nhi',
      approvedAt: new Date().toISOString(),
    };
    persistBrandMonthlyPlan(updated);
    setEditingBrandPlan(updated);
    notify(`Đã duyệt và đồng bộ kế hoạch tháng cấp Brand cho ${updated.brandName} (${updated.month})!`);
  };

  const handleUploadPosKvFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || !editingBrandPlan) return;
    const files = Array.from(fileList);
    setUploadingPosKv(true);
    try {
      const uploadedItems: KeyVisualAssetItem[] = [];
      for (const file of files) {
        const item = await uploadKeyVisualImageClient({
          file,
          brandName: editingBrandPlan.brandName,
          category: posKvUploadCategory,
        });
        uploadedItems.push(item);
      }
      setEditingBrandPlan(prev => {
        if (!prev) return prev;
        const currentImgs = prev.oneSheetPlanData?.keyVisual?.kvImages ?? prev.keyVisualSisPlan.kvImages ?? [];
        const nextImgs = [...currentImgs, ...uploadedItems];
        const nextItem: BrandMonthlyPlanItem = {
          ...prev,
          keyVisualSisPlan: {
            ...prev.keyVisualSisPlan,
            kvImages: nextImgs,
          },
          oneSheetPlanData: prev.oneSheetPlanData
            ? {
                ...prev.oneSheetPlanData,
                keyVisual: {
                  ...prev.oneSheetPlanData.keyVisual,
                  kvImages: nextImgs,
                },
              }
            : undefined,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser?.name || prev.keyVisualSisPic,
        };
        persistBrandMonthlyPlan(nextItem);
        return nextItem;
      });
      notify(`Đã tải lên ${uploadedItems.length} ảnh Key Visual cho ${editingBrandPlan.brandName}.`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Không tải được ảnh Key Visual lên.');
    } finally {
      setUploadingPosKv(false);
      if (posKvFileInputRef.current) {
        posKvFileInputRef.current.value = '';
      }
    }
  };

  if (editingBrandPlan) {
    const rollup = brandStoreRollupMap.get(editingBrandPlan.id);
    const rollupBudget =
      rollup && rollup.storeBudget > 0
        ? rollup.storeBudget
        : editingBrandPlan.planStrategyPlan.targetBrandBudget || 0;
    const rollupGmv =
      rollup && rollup.storeGmv > 0
        ? rollup.storeGmv
        : editingBrandPlan.planStrategyPlan.targetBrandGmv || 0;
    const currentKvImages =
      editingBrandPlan.oneSheetPlanData?.keyVisual?.kvImages ??
      editingBrandPlan.keyVisualSisPlan.kvImages ??
      [];
    const activeBrandMonth = selectedMonth === 'ALL' ? editingBrandPlan.month : selectedMonth;

    return (
      <div className="space-y-4 animate-in fade-in duration-200 pb-6">
        <PageHeaderNav>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span className="text-slate-300 hidden sm:inline">|</span>
            <button
              type="button"
              onClick={() => {
                persistBrandMonthlyPlan(editingBrandPlan);
                setEditingBrandPlan(null);
              }}
              className="h-8 px-2.5 shrink-0 inline-flex items-center gap-1 rounded-lg bg-surface hover:bg-sunken border border-line text-ink text-xs font-semibold transition cursor-pointer"
              title="Quay lại danh sách Kế hoạch theo Brand"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Danh sách Brand</span>
            </button>

            <select
              value={editingBrandPlan.id}
              onChange={(e) => {
                const nextBrand = monthScopedBrandMonthlyPlans.find(bp => bp.id === e.target.value);
                if (nextBrand) {
                  persistBrandMonthlyPlan(editingBrandPlan);
                  setEditingBrandPlan(nextBrand);
                }
              }}
              className="h-8 px-2.5 rounded-lg bg-surface hover:bg-sunken border border-line font-semibold text-xs text-ink focus:outline-none cursor-pointer max-w-[160px] sm:max-w-[220px] truncate"
              title="Chuyển nhanh sang thương hiệu khác"
            >
              {monthScopedBrandMonthlyPlans.map(bp => (
                <option key={bp.id} value={bp.id}>
                  {bp.brandName} · {activeBrandMonth}
                </option>
              ))}
            </select>

            <div className="hidden sm:inline-flex">{getStatusBadge(editingBrandPlan.status)}</div>
          </div>
        </PageHeaderNav>

        <PageActions>
          <div className="hidden xl:block">{syncBadge}</div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleApproveBrandPlan}
          >
            Duyệt kế hoạch Brand
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Save}
            onClick={() => handleSaveBrandPlan(false)}
          >
            Lưu kế hoạch Brand
          </Button>
        </PageActions>

        {/* Thanh tổng hợp Brand & chuyển góc nhìn Chi tiết */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-surface border border-line shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => {
                  persistBrandMonthlyPlan(editingBrandPlan);
                  setEditingBrandPlan(null);
                }}
                className="h-9 px-2.5 rounded-lg bg-canvas hover:bg-sunken border border-line text-ink text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Quay lại</span>
              </button>
              <BrandAvatar brandName={editingBrandPlan.brandName} code={editingBrandPlan.brandCode} size={38} rounded="lg" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-sm sm:text-base font-bold text-ink truncate">
                    Kế hoạch Tháng theo Brand — {editingBrandPlan.brandName}
                  </h1>
                  <span className="px-2 py-0.5 rounded bg-sunken text-ink-2 text-2xs font-semibold">
                    Kỳ {activeBrandMonth}
                  </span>
                  {getStatusBadge(editingBrandPlan.status)}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-ink-2 mt-1">
                  <span className="inline-flex items-center gap-1.5 flex-wrap">
                    <span className="text-ink-3">Gian hàng:</span>
                    <strong className="text-ink font-semibold">{rollup?.stores.length || 1} gian</strong>
                    {(rollup?.storePlans || []).map(sp => {
                      const st = rollup?.stores.find(
                        s => s.id === sp.storeId || normStoreSlug(s.storeName) === normStoreSlug(sp.storeName)
                      );
                      const label = st?.platform || sp.storeName || 'Gian hàng';
                      return (
                        <button
                          key={sp.id}
                          type="button"
                          onClick={() => {
                            persistBrandMonthlyPlan(editingBrandPlan);
                            setEditingBrandPlan(null);
                            onSelectPlan(sp);
                          }}
                          className="px-2 py-0.5 rounded bg-canvas hover:bg-accent-soft text-accent border border-line text-2xs font-semibold transition cursor-pointer"
                          title={`Mở bảng phân rã 4.1.1 của gian hàng ${sp.storeName || editingBrandPlan.brandName}`}
                        >
                          {label} (4.1.1) ↗
                        </button>
                      );
                    })}
                  </span>
                  <span>·</span>
                  <span>
                    <span className="text-ink-3 mr-1">Ngân sách Net:</span>
                    <strong className="text-ink font-semibold tabular-nums">
                      {rollupBudget > 0 ? formatVndShort(rollupBudget) : 'Chưa cấp'}
                    </strong>
                  </span>
                  <span>·</span>
                  <span>
                    <span className="text-ink-3 mr-1">GMV mục tiêu:</span>
                    <strong className="text-ink font-semibold tabular-nums">
                      {rollupGmv > 0 ? formatVndShort(rollupGmv) : '—'}
                    </strong>
                  </span>
                  {(rollup?.storeVideos || 0) > 0 && (
                    <>
                      <span>·</span>
                      <span>
                        <span className="text-ink-3 mr-1">Sản lượng gian:</span>
                        <strong className="text-accent font-semibold tabular-nums">
                          {rollup?.storeVideos} video
                        </strong>
                        <span className="text-ink-3 ml-1">
                          ({rollup?.affPaidQty} KOC · {rollup?.focQty} FOC · {rollup?.selfQty} Kênh Brand)
                        </span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="grid grid-cols-2 sm:inline-flex w-full sm:w-auto rounded-lg border border-line bg-canvas p-0.5">
                <button
                  type="button"
                  onClick={() => setBrandModalTab('ONE_SHEET')}
                  className={cx(
                    'px-3 py-1.5 rounded-md text-xs font-semibold text-center transition cursor-pointer',
                    brandModalTab === 'ONE_SHEET'
                      ? 'bg-primary text-white'
                      : 'text-ink-2 hover:text-ink'
                  )}
                >
                  <span>1. Biểu mẫu Plan Brand (01 → 05)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBrandModalTab('POSITIONS')}
                  className={cx(
                    'px-3 py-1.5 rounded-md text-xs font-semibold text-center transition cursor-pointer',
                    brandModalTab === 'POSITIONS'
                      ? 'bg-primary text-white'
                      : 'text-ink-2 hover:text-ink'
                  )}
                >
                  <span>2. Phân công 3 vị trí &amp; Chiến dịch</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {brandModalTab === 'ONE_SHEET' ? (
          <BrandOneSheetPlanView
            brandName={editingBrandPlan.brandName}
            month={activeBrandMonth}
            brandPlan={editingBrandPlan}
            storePlans={plans}
            storePortfolios={storePortfolios}
            campaigns={effectiveCampaigns}
            defaultEditMode={true}
            onChangeOneSheetData={(draftData) => {
              setEditingBrandPlan(prev =>
                prev
                  ? {
                      ...prev,
                      oneSheetPlanData: draftData,
                      keyVisualSisPlan: {
                        ...prev.keyVisualSisPlan,
                        kvImages: draftData.keyVisual?.kvImages ?? prev.keyVisualSisPlan.kvImages,
                      },
                    }
                  : null
              );
            }}
            onSaveOneSheetData={(newData) => {
              const nextItem: BrandMonthlyPlanItem = {
                ...editingBrandPlan,
                oneSheetPlanData: newData,
                keyVisualSisPlan: {
                  ...editingBrandPlan.keyVisualSisPlan,
                  kvImages: newData.keyVisual?.kvImages ?? editingBrandPlan.keyVisualSisPlan.kvImages,
                },
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser?.name || editingBrandPlan.planStrategyPic,
              };
              persistBrandMonthlyPlan(nextItem);
              setEditingBrandPlan(nextItem);
              if (onNotify) {
                onNotify(`Đã lưu Biểu mẫu Plan Brand cho ${editingBrandPlan.brandName} (${editingBrandPlan.month}).`);
              }
            }}
            onNotify={onNotify}
          />
        ) : (
          <div className="space-y-4 text-xs">
            {/* 0. Liên kết Thực thể Chiến dịch (Campaign) trong kỳ */}
            <div className="p-4 rounded-xl bg-surface border border-line space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-ink text-xs block">
                    Chế độ Chiến dịch (Campaign) của Brand {editingBrandPlan.brandName} kỳ {editingBrandPlan.month}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:inline-flex w-full sm:w-auto rounded-lg border border-line bg-canvas p-0.5">
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
                        ? 'bg-ink text-white'
                        : 'text-ink-2 hover:text-ink'
                    )}
                  >
                    Không có Campaign (Duy trì)
                  </button>
                </div>
              </div>

              {editingBrandPlan.hasCampaign && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
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
            <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-amber-950 text-xs">
                  Phân bổ nhân sự phụ trách 3 vị trí gắn theo Brand ({editingBrandPlan.brandName})
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-ink block mb-1">
                    1. Content / Brand main
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
                    2. Plan / Strategy
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
                    3. Key Visual / SIS
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

            {/* 2. Nhập chỉ tiêu đầu việc cho từng vị trí */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-amber-200 bg-surface space-y-3">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <span className="font-semibold text-amber-950">1. Content / Brand main</span>
                  <span className="text-2xs text-ink-3">PIC: {editingBrandPlan.contentBrandMainPic}</span>
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

                <Field label="Tuyến nội dung & Góc tiếp cận chủ đạo">
                  <Textarea
                    rows={3}
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
                    rows={3}
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

              <div className="p-4 rounded-xl border border-blue-200 bg-surface space-y-3">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <span className="font-semibold text-blue-950">2. Plan / Strategy</span>
                  <span className="text-2xs text-ink-3">PIC: {editingBrandPlan.planStrategyPic}</span>
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
                    rows={3}
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
                    rows={3}
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

              <div className="p-4 rounded-xl border border-line bg-surface space-y-3">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <span className="font-semibold text-ink">3. Key Visual / SIS</span>
                  <span className="text-2xs text-ink-3">PIC: {editingBrandPlan.keyVisualSisPic}</span>
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

                {/* Tải ảnh Key Visual / SIS trực tiếp tại thẻ vị trí số 3 */}
                <div className="pt-2 border-t border-line space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-ink text-xs inline-flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-accent" />
                      <span>Ảnh Key Visual ({currentKvImages.length})</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <input
                        ref={posKvFileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        multiple
                        className="hidden"
                        onChange={(e) => void handleUploadPosKvFiles(e.target.files)}
                      />
                      <select
                        value={posKvUploadCategory}
                        onChange={(e) => setPosKvUploadCategory(e.target.value as KeyVisualAssetCategory)}
                        className="h-7 px-2 rounded-lg border border-line bg-canvas text-ink text-2xs font-medium"
                      >
                        <option value="MASTER_KV">Master KV</option>
                        <option value="SIS_BANNER">SIS / Banner</option>
                        <option value="PDP_FRAME">Khung PDP / SEO</option>
                        <option value="MOODBOARD">Moodboard / Ref</option>
                      </select>
                      <button
                        type="button"
                        disabled={uploadingPosKv}
                        onClick={() => posKvFileInputRef.current?.click()}
                        className="h-7 px-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-2xs font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-60"
                      >
                        {uploadingPosKv ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        <span>Tải ảnh lên</span>
                      </button>
                    </div>
                  </div>

                  {currentKvImages.length === 0 ? (
                    <div
                      onClick={() => !uploadingPosKv && posKvFileInputRef.current?.click()}
                      className="border border-dashed border-line hover:border-accent rounded-lg p-3 text-center cursor-pointer bg-canvas/50 text-2xs text-ink-3"
                    >
                      Chưa có ảnh KV — Bấm để tải ảnh Master KV, Banner SIS, Khung PDP lên
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {currentKvImages.map((imgItem, imgIdx) => (
                        <div
                          key={imgItem.id}
                          className="rounded-lg border border-line bg-canvas overflow-hidden flex flex-col justify-between"
                        >
                          <div
                            onClick={() => setPreviewPosKvImg(imgItem)}
                            className="relative aspect-[16/10] bg-sunken cursor-pointer overflow-hidden"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={imgItem.url}
                              alt={imgItem.fileName}
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-slate-900/75 text-white text-3xs font-semibold">
                              {KEY_VISUAL_CATEGORY_LABEL[imgItem.category || 'MASTER_KV']}
                            </span>
                          </div>
                          <div className="p-1.5 flex items-center justify-between gap-1 text-3xs">
                            <span className="truncate font-medium text-ink" title={imgItem.fileName}>
                              {imgItem.fileName}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBrandPlan(prev => {
                                  if (!prev) return prev;
                                  const nextImgs = currentKvImages.filter((_, i) => i !== imgIdx);
                                  const nextItem: BrandMonthlyPlanItem = {
                                    ...prev,
                                    keyVisualSisPlan: {
                                      ...prev.keyVisualSisPlan,
                                      kvImages: nextImgs,
                                    },
                                    oneSheetPlanData: prev.oneSheetPlanData
                                      ? {
                                          ...prev.oneSheetPlanData,
                                          keyVisual: {
                                            ...prev.oneSheetPlanData.keyVisual,
                                            kvImages: nextImgs,
                                          },
                                        }
                                      : undefined,
                                  };
                                  persistBrandMonthlyPlan(nextItem);
                                  return nextItem;
                                });
                              }}
                              className="text-rose-600 hover:text-rose-700 shrink-0 cursor-pointer"
                              title="Xóa ảnh"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Thanh thao tác cuối màn hình chi tiết */}
        <div className="p-3.5 rounded-xl bg-surface border border-line flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <Button
            variant="ghost"
            onClick={() => {
              persistBrandMonthlyPlan(editingBrandPlan);
              setEditingBrandPlan(null);
            }}
          >
            Quay lại danh sách Brand
          </Button>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="secondary" onClick={handleApproveBrandPlan}>
              Duyệt kế hoạch Brand
            </Button>
            <Button variant="primary" icon={Save} onClick={() => handleSaveBrandPlan(false)}>
              Lưu kế hoạch Brand
            </Button>
          </div>
        </div>

        <Modal
          open={!!previewPosKvImg}
          onClose={() => setPreviewPosKvImg(null)}
          title={previewPosKvImg ? `${KEY_VISUAL_CATEGORY_LABEL[previewPosKvImg.category || 'MASTER_KV']} — ${previewPosKvImg.fileName}` : 'Xem ảnh Key Visual'}
          size="lg"
        >
          {previewPosKvImg && (
            <div className="rounded-xl overflow-hidden bg-slate-950/5 border border-line flex items-center justify-center max-h-[75vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewPosKvImg.url}
                alt={previewPosKvImg.fileName}
                className="max-w-full max-h-[72vh] object-contain"
              />
            </div>
          )}
        </Modal>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageActions>
        <div className="hidden xl:block">{syncBadge}</div>
        <ActionMenu
          label="Tác vụ kế hoạch"
          items={[
            ...(onPlanOrderUploaded && currentUser && isStaffGlobalAdminOrManager(currentUser)
              ? [{ label: 'Tải Plan order tổng (4.1)', icon: Upload, onSelect: () => setIsPlanOrderUploadOpen(true) }]
              : []),
            { label: 'Đồng bộ Larkbase', icon: Database, onSelect: () => setIsLarkbaseModalOpen(true) },
            ...(onOpenPlanReport
              ? [{ label: 'Báo cáo thẩm định kế hoạch', icon: FileText, onSelect: onOpenPlanReport }]
              : []),
          ]}
        />
        {onPlanOrderUploaded && currentUser && isStaffGlobalAdminOrManager(currentUser) && (
          <Button variant="secondary" size="sm" icon={Upload} onClick={() => setIsPlanOrderUploadOpen(true)} className="hidden md:inline-flex">
            Tải Plan 4.1
          </Button>
        )}
        <Button
          variant="primary"
          size="sm"
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
            { key: 'STORE_GOVERNANCE', label: 'Ma trận gian hàng', count: governanceStats.totalB2cManaged },
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
          {/* TỔNG HỢP GỌN 1 KHỐI: THANH TÓM TẮT 1 DÒNG + 5 Ô KPI ĐẦU VIỆC B2C */}
          <section className="bg-surface border border-line rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5 border-b border-line bg-sunken/30 text-xs">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <span className="font-semibold text-ink">
                  Kỳ {selectedMonth === 'ALL' ? 'Tất cả các tháng' : selectedMonth}
                </span>
                <span className="text-ink-3">•</span>
                <span className="text-ink-2 tabular-nums">
                  Đã lập 4.1: <strong className="text-ink">{governanceStats.countWithPlan}/{governanceStats.totalB2cManaged}</strong>
                </span>
                <span className="text-ink-3">•</span>
                <span className="text-ink-2 tabular-nums">
                  Đã chia 4.1.1: <strong className="text-blue-700">{governanceStats.countHasWeekly411}/{governanceStats.countWithPlan || 1} ({governanceStats.weekly411Pct}%)</strong>
                </span>
                <span className="text-ink-3">•</span>
                <span className="text-ink-2 tabular-nums">
                  Hợp lệ: <strong className="text-emerald-700">{governanceStats.countValidTotal}/{governanceStats.countWithPlan || 1} ({governanceStats.validPct}%)</strong>
                </span>
                <span className="text-ink-3">•</span>
                <span className="text-ink-2 tabular-nums">
                  Đã duyệt: <strong className="text-accent">{governanceStats.countApproved}/{governanceStats.totalB2cManaged} ({governanceStats.approvedPct}%)</strong>
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Target}
                  onClick={() => {
                    if (onOpenGovernanceDashboard) {
                      onOpenGovernanceDashboard();
                    } else {
                      setIsGovernanceOverviewModalOpen(true);
                    }
                  }}
                >
                  Tiến độ &amp; Kiểm định 4 chặng
                </Button>
                {(storeGovernanceFilter !== 'B2C_ONLY' ||
                  governanceRouteFilter !== 'ALL' ||
                  governancePlatformFilter !== 'ALL' ||
                  governancePicFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setStoreGovernanceFilter('B2C_ONLY');
                      setGovernanceRouteFilter('ALL');
                      setGovernancePlatformFilter('ALL');
                      setGovernancePicFilter('ALL');
                      setGovernancePage(1);
                    }}
                    className="h-7 px-2.5 rounded-lg border border-line bg-surface hover:bg-sunken text-2xs font-semibold text-ink-2 cursor-pointer"
                  >
                    Đặt lại bộ lọc
                  </button>
                )}
              </div>
            </div>

            {/* 5 Ô THÔNG SỐ TỔNG & 4 ĐẦU VIỆC B2C THEO THÁNG ĐANG CHỌN */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 divide-y lg:divide-y-0 sm:divide-x divide-line bg-surface">
              <div className="col-span-2 sm:col-span-1 px-3.5 py-2.5">
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
            <div className="p-3 border-b border-line space-y-2.5">
              <FilterBar
                search={{
                  value: storeSearchQuery,
                  onChange: (v) => {
                    setStoreSearchQuery(v);
                    setGovernancePage(1);
                  },
                  placeholder: 'Tìm gian hàng, thương hiệu, PIC B2C...',
                }}
                filters={
                  <>
                    <Select
                      value={governanceRouteFilter}
                      onChange={(e) => {
                        setGovernanceRouteFilter(e.target.value as 'ALL' | 'WITH_LEADER' | 'DIRECT_HEAD');
                        setGovernancePage(1);
                      }}
                      aria-label="Lọc theo luồng duyệt"
                    >
                      <option value="ALL">Luồng duyệt: Tất cả ({governanceStats.totalB2cManaged} gian)</option>
                      <option value="WITH_LEADER">Qua Leader Nguyễn Thị Ngọc Tâm ({governanceStats.countWithLeader} gian)</option>
                      <option value="DIRECT_HEAD">Trình trực tiếp GĐ Yến Nhi ({governanceStats.countDirectHead} gian)</option>
                    </Select>

                    <Select
                      value={governancePlatformFilter}
                      onChange={(e) => {
                        setGovernancePlatformFilter(e.target.value as 'ALL' | 'TikTok Shop' | 'Shopee Mall');
                        setGovernancePage(1);
                      }}
                      aria-label="Lọc theo sàn"
                    >
                      <option value="ALL">Tất cả Sàn (TikTok &amp; Shopee)</option>
                      <option value="TikTok Shop">TikTok Shop</option>
                      <option value="Shopee Mall">Shopee Mall</option>
                    </Select>

                    <Select
                      value={governancePicFilter}
                      onChange={(e) => {
                        setGovernancePicFilter(e.target.value);
                        setGovernancePage(1);
                      }}
                      aria-label="Lọc theo chuyên viên PIC"
                    >
                      <option value="ALL">Chuyên viên PIC: Tất cả ({governanceStats.picBottleneckSummary.length})</option>
                      {governanceStats.picBottleneckSummary.map((p) => (
                        <option key={p.picName} value={p.picName}>
                          {p.picName} ({p.totalStores} gian{p.bottleneckCount > 0 ? ` · ${p.bottleneckCount} cần xử lý` : ' · Đủ'})
                        </option>
                      ))}
                    </Select>
                  </>
                }
                resultCount={filteredStoreGovernance.length}
              />

              <Chips
                items={[
                  { key: 'B2C_ONLY', label: 'B2C phụ trách', count: governanceStats.totalB2cManaged },
                  { key: 'VALID_MATCHED', label: 'Khớp 4.1', count: governanceStats.countValidTotal },
                  { key: 'INVALID_411', label: 'Cần xử lý / Lệch 4.1', count: governanceStats.countInvalid411 },
                  { key: 'EMPTY_WEEKLY', label: 'Chưa chia 4.1.1', count: governanceStats.countEmptyWeekly411 },
                  { key: 'PENDING_APPROVAL', label: 'Chờ duyệt', count: governanceStats.countPendingApproval + governanceStats.countPendingPreApproval },
                  { key: 'APPROVED', label: 'Đã duyệt', count: governanceStats.countApproved },
                  ...(governanceStats.countMissingPlan > 0
                    ? [{ key: 'MISSING_PLAN' as const, label: 'Chưa lập', count: governanceStats.countMissingPlan }]
                    : []),
                  { key: 'ALL', label: 'Tất cả', count: storeGovernanceList.length },
                ]}
                value={storeGovernanceFilter}
                onChange={(k) => {
                  setStoreGovernanceFilter(k as typeof storeGovernanceFilter);
                  setGovernancePage(1);
                }}
              />
            </div>

            {/* MOBILE (< 768px): DẠNG THẺ GIAN HÀNG (KHÔNG CẦN KÉO NGANG) */}
            <div className="md:hidden divide-y divide-line">
              {filteredStoreGovernance.length === 0 ? (
                <div className="py-10 px-4 text-center text-ink-3 text-xs">
                  Không tìm thấy gian hàng phù hợp
                </div>
              ) : (
                paginatedStoreGovernance.map((item: StoreGovernanceItem) => {
                  const store = item.store;
                  const plan = item.plan;
                  const isB2c = item.isB2c;
                  const bd = item.breakdown;
                  const activeVersionCode = plan?.currentVersionCode || 'v1.0';
                  const hasLeader = Boolean(plan?.hasBookingLeader ?? store.hasBookingLeader);

                  return (
                    <div key={`mob-store-${store.id}`} className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-ink text-xs truncate">{store.storeName}</span>
                            {plan && (
                              <span className="text-2xs font-mono px-1.5 py-0.5 rounded bg-sunken text-ink-2">
                                {activeVersionCode}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-2xs text-ink-3 flex-wrap">
                            <ChannelTag channel={store.platform} className="text-2xs px-1 py-0" />
                            <span>{store.brandName}</span>
                            <span>·</span>
                            <span>PIC: <strong className="text-ink-2">{store.b2cOwners?.[0] || store.b2cOwnerName || 'Chưa gán'}</strong></span>
                            <span>·</span>
                            <span>{hasLeader ? 'Leader: Ngọc Tâm' : 'Duyệt trực tiếp'}</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {!isB2c ? (
                            <Status tone="neutral">Miễn trừ</Status>
                          ) : plan ? (
                            <>
                              {getStatusBadge(plan.status)}
                              <span title={item.validity.shortDetail}>
                                <Status tone={item.validity.badgeTone}>{item.validity.badgeLabel}</Status>
                              </span>
                            </>
                          ) : (
                            <Status tone="neutral">Chưa lập</Status>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-2xs tabular-nums">
                        <div className="rounded-lg bg-sunken/50 border border-line px-2.5 py-1.5 flex flex-col gap-0.5">
                          <span className="text-ink-3">Ngân sách Net</span>
                          <strong className="text-ink font-semibold">{formatVndShort(bd.totalBudget)} ({bd.totalVideos} vid)</strong>
                        </div>
                        <div className="rounded-lg bg-surface border border-line px-2.5 py-1.5 flex flex-col gap-0.5">
                          <span className="text-ink-3">1. KOC trả phí</span>
                          <strong className="text-ink font-semibold">{bd.affPaidQty} vid · {formatVndShort(bd.affPaidBudget)}</strong>
                        </div>
                        <div className="rounded-lg bg-surface border border-line px-2.5 py-1.5 flex flex-col gap-0.5">
                          <span className="text-ink-3">2. Mẫu FOC (0đ)</span>
                          <strong className="text-positive font-semibold">{bd.focQty} mẫu</strong>
                        </div>
                        <div className="rounded-lg bg-surface border border-line px-2.5 py-1.5 flex flex-col gap-0.5">
                          <span className="text-ink-3">3. Brand / Đa sàn</span>
                          <strong className="text-ink font-semibold">{bd.selfQty + bd.otherQty} vid · {formatVndShort(bd.selfBudget + bd.otherBudget)}</strong>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-0.5 flex-wrap">
                        {plan ? (
                          <>
                            {onOpenListingForPlan && (bd.affPaidQty > 0 || bd.focQty > 0) && (
                              <button
                                type="button"
                                onClick={() => onOpenListingForPlan(plan)}
                                className="h-7 px-2.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-2xs font-semibold cursor-pointer"
                              >
                                Listing KOC
                              </button>
                            )}
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => onSelectPlan(plan)}
                              className="h-7 px-3 text-2xs font-semibold"
                            >
                              {plan.status === 'PENDING_APPROVAL' ? 'Vào duyệt' : 'Mở chi tiết →'}
                            </Button>
                          </>
                        ) : isB2c ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={Plus}
                            onClick={(e) => handleCreatePlanForStore(store, e)}
                            className="h-7 px-3 text-2xs font-medium"
                          >
                            Lập plan
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* DESKTOP/TABLET (>= 768px): BẢNG MA TRẬN GIAN HÀNG */}
            <div className="hidden md:block w-full overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-sunken/70 border-b border-line text-ink-2 font-semibold text-2xs">
                    <th className="py-2.5 px-3 w-[18%]">Gian hàng</th>
                    <th className="py-2.5 px-2 w-[12%]">Phụ trách</th>
                    <th className="py-2.5 px-2 text-right w-[9%] bg-sunken">Ngân sách Net</th>
                    <th className="py-2.5 px-2 text-right w-[12%]">1. KOC trả phí</th>
                    <th className="py-2.5 px-2 text-center w-[7%]">2. FOC (0đ)</th>
                    <th className="py-2.5 px-2 text-right w-[10%]">3. Kênh Brand</th>
                    <th className="py-2.5 px-2 text-right w-[8%]">4. Đa sàn</th>
                    <th className="py-2.5 px-2.5 text-center w-[12%]">Kiểm định 4.1 vs 4.1.1</th>
                    <th className="py-2.5 px-3 text-right w-[12%]">Duyệt &amp; Thực thi</th>
                  </tr>
                </thead>
                <tbody ref={governanceBodyRef} className="divide-y divide-line">
                  {filteredStoreGovernance.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-ink-3">
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
                        <React.Fragment key={store.id}>
                        <tr
                          data-flip={store.id}
                          className={cx(
                            'group hover:bg-canvas transition-colors',
                            !isB2c && 'bg-sunken/30 text-ink-3'
                          )}
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

                          {/* 8. KIỂM ĐỊNH 4.1 VS 4.1.1 */}
                          <td className="py-2 px-2.5 text-center align-middle">
                            {!isB2c ? (
                              <span className="text-2xs text-ink-3">—</span>
                            ) : plan ? (
                              <span className="inline-flex justify-center" title={item.validity.shortDetail}>
                                <Status tone={item.validity.badgeTone}>{item.validity.badgeLabel}</Status>
                              </span>
                            ) : (
                              <span className="text-2xs text-ink-3">Chưa có 4.1</span>
                            )}
                          </td>

                          {/* 9. TRẠNG THÁI DUYỆT & THAO TÁC */}
                          <td className="py-2 px-3 text-right align-middle">
                            <div className="flex flex-col items-end gap-1">
                              {!isB2c ? (
                                <Status tone="neutral">Miễn trừ</Status>
                              ) : plan ? (
                                <>
                                  <div className="flex items-center justify-end gap-1 flex-wrap">
                                    {getStatusBadge(plan.status)}
                                  </div>
                                  <div className="flex items-center justify-end gap-1 flex-wrap">
                                    {plan.pendingReference41 &&
                                      currentUser &&
                                      isStaffGlobalAdminOrManager(currentUser) &&
                                      onUpdatePlan && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const nextRef = plan.pendingReference41!;
                                            const nextBudget = nextRef.affCostNet + nextRef.selfCostNet + nextRef.liveCostNet;
                                            const nextContents = nextRef.cast + nextRef.foc + nextRef.selfVideos + nextRef.liveSessions;
                                            const actorName = currentUser.name || 'Giám đốc Marketing B2C';
                                            const unlockMsg: PlanDiscussionMessage = {
                                              id: `DISC-UNLOCK41-${Date.now()}`,
                                              authorName: actorName,
                                              authorRole: 'LEAD',
                                              authorTitle: 'Quản lý B2C',
                                              content: `Quản lý (${actorName}) đã mở khóa kế hoạch đã duyệt và cập nhật theo số liệu Bảng 4.1 mới (Tổng Net: ${formatVndShort(nextBudget)}, Tổng nội dung: ${nextContents} video). Chuyển về trạng thái Cần sửa để chuyên viên điều chỉnh phân rã tuần.`,
                                              type: 'REVISION_REQUEST',
                                              timestamp: new Date().toISOString(),
                                              tags: ['Cập nhật 4.1 mới', 'Mở khóa'],
                                            };
                                            onUpdatePlan(plan.id, {
                                              reference41: nextRef,
                                              pendingReference41: undefined,
                                              totalTargetBudget: nextBudget,
                                              totalTargetContents: nextContents,
                                              budgetAffiliate: nextRef.affCostNet,
                                              budgetSelfChannel: nextRef.selfCostNet,
                                              isVersionLocked: false,
                                              status: 'REVISION_REQUESTED',
                                              revisionNotes: 'Mở khóa cập nhật theo Bảng 4.1 Plan order tổng mới',
                                              discussions: [unlockMsg, ...(plan.discussions || [])],
                                            });
                                            notify(`Đã mở khóa và cập nhật mốc 4.1 mới cho gian hàng "${store.storeName}".`);
                                          }}
                                          className="h-6 px-2 rounded bg-rose-600 hover:bg-rose-700 text-white text-2xs font-semibold shrink-0 whitespace-nowrap transition cursor-pointer"
                                          title="Mở khóa kế hoạch đã duyệt và áp dụng số liệu 4.1 mới"
                                        >
                                          Mở khóa 4.1
                                        </button>
                                      )}
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
                                        variant="secondary"
                                        onClick={() => onSelectPlan(plan)}
                                        className="h-6 px-2 text-2xs font-medium shrink-0"
                                      >
                                        Mở
                                      </Button>
                                    )}
                                  </div>
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
                        </React.Fragment>
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

              {/* Chuyển đổi Dạng Bảng / Dạng Thẻ (Ẩn trên mobile vì mobile luôn hiển thị dạng thẻ chuẩn) */}
              <div className="hidden md:flex items-center gap-1 bg-surface border border-line rounded-lg p-0.5">
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

            {/* 3. NỘI DUNG CHÍNH: DẠNG BẢNG (>= 768px khi chọn TABLE) & DẠNG THẺ (< 768px hoặc khi chọn CARDS) */}
            {brandViewMode === 'TABLE' && (
              /* ================= DẠNG BẢNG (TABLE VIEW — GỌN VỪA KHUNG NHÌN TRÊN DESKTOP) ================= */
              <div className="hidden md:block w-full overflow-x-auto">
                <table key="brand-monthly-plans-table" className="w-full min-w-[780px] md:table-fixed text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-sunken/60 border-b border-line text-ink-2 font-semibold text-2xs">
                      <th className="py-2.5 px-3 w-[22%] sticky left-0 z-10 bg-sunken/95">Thương hiệu &amp; Gian hàng</th>
                      <th className="py-2.5 px-2.5 w-[15%] text-right">Tổng hợp từ Gian</th>
                      <th className="py-2.5 px-2.5 w-[17%]">1. Content / Brand main</th>
                      <th className="py-2.5 px-2.5 w-[18%]">2. Plan / Strategy</th>
                      <th className="py-2.5 px-2.5 w-[16%]">3. Key Visual / SIS</th>
                      <th className="py-2.5 px-3 w-[12%] text-right">Trạng thái &amp; Plan</th>
                    </tr>
                  </thead>
                  <tbody key="brand-monthly-plans-tbody" className="divide-y divide-line">
                    {filteredBrandMonthlyPlans.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-ink-3">
                          Không tìm thấy kế hoạch Brand nào khớp với bộ lọc hiện tại.
                        </td>
                      </tr>
                    ) : (
                      filteredBrandMonthlyPlans.map(bp => {
                        const rollup = brandStoreRollupMap.get(bp.id);
                        const stores = rollup?.stores || [];
                        const storePlansCount = rollup?.storePlans.length || 0;
                        const budget = (rollup && rollup.storeBudget > 0)
                          ? rollup.storeBudget
                          : (bp.planStrategyPlan?.targetBrandBudget || 0);
                        const targetGmv = (rollup && rollup.storeGmv > 0)
                          ? rollup.storeGmv
                          : (bp.planStrategyPlan?.targetBrandGmv || 0);
                        const totalVideos = rollup?.storeVideos || 0;
                        const contentP = bp.contentBrandMainPlan;
                        const strategyP = bp.planStrategyPlan;
                        const kvP = bp.keyVisualSisPlan;

                        return (
                          <tr
                            key={`bp-row-${bp.id}`}
                            onClick={() => {
                              setBrandModalTab('ONE_SHEET');
                              setEditingBrandPlan(bp);
                            }}
                            className="hover:bg-canvas transition-colors cursor-pointer group"
                          >
                            {/* Cột 1: Thương hiệu (Ghim cố định bên trái) */}
                            <td className="py-2.5 px-3 align-middle sticky left-0 z-10 bg-surface group-hover:bg-canvas transition-colors">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <BrandAvatar brandName={bp.brandName} code={bp.brandCode} size={32} rounded="md" />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="font-semibold text-ink text-xs group-hover:text-accent transition-colors truncate" title={bp.brandName}>
                                      {bp.brandName}
                                    </span>
                                    {bp.hasCampaign ? (
                                      <span
                                        className="inline-flex items-center px-1.5 py-0.5 rounded text-3xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shrink-0"
                                        title={bp.campaignTitle || 'Có Chiến dịch'}
                                      >
                                        {bp.campaignCode || 'Campaign'}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-3xs font-medium bg-sunken text-ink-3 shrink-0">
                                        Duy trì
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-2xs text-ink-3 mt-0.5 flex items-center gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
                                    <span>{stores.length > 0 ? `${stores.length} gian` : '1 gian'}</span>
                                    {(rollup?.storePlans || []).length > 0 && (
                                      <>
                                        <span>·</span>
                                        {(rollup?.storePlans || []).map(sp => {
                                          const st = stores.find(s => s.id === sp.storeId || normStoreSlug(s.storeName) === normStoreSlug(sp.storeName));
                                          const platShort = st?.platform === 'TikTok Shop' ? 'TikTok' : st?.platform === 'Shopee Mall' ? 'Shopee' : (sp.storeName || 'Gian');
                                          return (
                                            <button
                                              key={sp.id}
                                              type="button"
                                              onClick={() => onSelectPlan(sp)}
                                              className="text-2xs font-medium text-accent hover:underline cursor-pointer"
                                              title={`Mở phân rã 4.1.1 của gian hàng ${sp.storeName || bp.brandName}`}
                                            >
                                              {platShort} ↗
                                            </button>
                                          );
                                        })}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Cột 2: Tổng hợp từ Gian hàng */}
                            <td className="py-2.5 px-2.5 align-middle text-right tabular-nums">
                              <div className="font-semibold text-ink text-xs">
                                {budget > 0 ? formatVndShort(budget) : <span className="text-ink-3 font-normal">Chưa cấp</span>}
                              </div>
                              <div className="text-2xs text-ink-3 mt-0.5 truncate">
                                GMV: <span className="font-medium text-ink-2">{targetGmv > 0 ? formatVndShort(targetGmv) : '—'}</span>
                                {totalVideos > 0 && <span> · {totalVideos} vid</span>}
                              </div>
                            </td>

                            {/* Cột 3: 1. Content / Brand main */}
                            <td className="py-2.5 px-2.5 align-middle">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Avatar name={bp.contentBrandMainPic} size={18} />
                                <span className="font-medium text-ink text-xs truncate">{bp.contentBrandMainPic}</span>
                              </div>
                              <div className="text-2xs text-ink-3 mt-0.5 truncate" title={contentP.focusPillars}>
                                <span className="font-medium text-ink-2">{contentP.contentPillarsCount} Pillar · {contentP.heroScriptsTarget} kịch bản</span>
                              </div>
                            </td>

                            {/* Cột 4: 2. Plan / Strategy */}
                            <td className="py-2.5 px-2.5 align-middle">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Avatar name={bp.planStrategyPic} size={18} />
                                <span className="font-medium text-ink text-xs truncate">{bp.planStrategyPic}</span>
                              </div>
                              <div className="text-2xs text-ink-3 mt-0.5 truncate" title={strategyP.bigIdeaAndKeyMessage}>
                                {strategyP.bigIdeaAndKeyMessage}
                              </div>
                            </td>

                            {/* Cột 5: 3. Key Visual / SIS */}
                            <td className="py-2.5 px-2.5 align-middle">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Avatar name={bp.keyVisualSisPic} size={18} />
                                <span className="font-medium text-ink text-xs truncate">{bp.keyVisualSisPic}</span>
                              </div>
                              <div className="text-2xs text-ink-3 mt-0.5 truncate" title={kvP.designTheme}>
                                <span className="font-medium text-ink-2">
                                  {kvP.kvDirectionCount} KV · {kvP.sisBannerPackageCount} SIS · {kvP.pdpSeoProductCount} PDP
                                  {((bp.oneSheetPlanData?.keyVisual?.kvImages ?? kvP.kvImages ?? []).length > 0) && (
                                    <span className="text-accent font-semibold">
                                      {' '}· {(bp.oneSheetPlanData?.keyVisual?.kvImages ?? kvP.kvImages ?? []).length} ảnh
                                    </span>
                                  )}
                                </span>
                              </div>
                            </td>

                            {/* Cột 6: Trạng thái & Nút Nhập Plan duy nhất */}
                            <td className="py-2.5 px-3 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                              <div className="flex flex-col items-end gap-1">
                                {getStatusBadge(bp.status)}
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => {
                                    setBrandModalTab('ONE_SHEET');
                                    setEditingBrandPlan(bp);
                                  }}
                                  className="h-6 px-2.5 text-2xs font-medium"
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
            )}

            {/* ================= DẠNG THẺ (LUÔN HIỆN TRÊN MOBILE < 768px HOẶC KHI CHỌN CHẾ ĐỘ CARDS) ================= */}
            <div className={cx('p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4', brandViewMode === 'CARDS' ? 'grid' : 'grid md:hidden')}>
                {filteredBrandMonthlyPlans.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-ink-3">
                    Không tìm thấy kế hoạch Brand nào khớp với bộ lọc hiện tại.
                  </div>
                ) : (
                  filteredBrandMonthlyPlans.map(bp => {
                    const rollup = brandStoreRollupMap.get(bp.id);
                    const stores = rollup?.stores || [];
                    const budget = (rollup && rollup.storeBudget > 0)
                      ? rollup.storeBudget
                      : (bp.planStrategyPlan?.targetBrandBudget || 0);
                    const targetGmv = (rollup && rollup.storeGmv > 0)
                      ? rollup.storeGmv
                      : (bp.planStrategyPlan?.targetBrandGmv || 0);
                    const contentP = bp.contentBrandMainPlan;
                    const strategyP = bp.planStrategyPlan;
                    const kvP = bp.keyVisualSisPlan;

                    return (
                      <div
                        key={`bp-card-${bp.id}`}
                        className="bg-surface border border-line rounded-xl p-4 space-y-3 hover:border-line-strong transition shadow-2xs flex flex-col justify-between"
                      >
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
                              <span className="text-ink-3 mr-1">Ngân sách:</span>
                              <strong className="text-ink font-semibold tabular-nums">
                                {budget > 0 ? formatVndShort(budget) : 'Chưa cấp'}
                              </strong>
                              {targetGmv > 0 && (
                                <span className="text-ink-3 ml-1.5">· GMV {formatVndShort(targetGmv)}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 text-2xs">
                          <div className="p-2 rounded-lg border border-line/60 bg-surface space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-ink-3 font-medium">1. Content / Brand main</span>
                              <span className="text-3xs text-ink-2 font-medium">
                                {contentP.contentPillarsCount} Pillar · {contentP.heroScriptsTarget} kịch bản
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-ink">
                              <Avatar name={bp.contentBrandMainPic} size={16} />
                              <span className="font-semibold truncate">{bp.contentBrandMainPic}</span>
                            </div>
                            <div className="text-3xs text-ink-3 line-clamp-1" title={contentP.focusPillars}>
                              {contentP.focusPillars}
                            </div>
                          </div>

                          <div className="p-2 rounded-lg border border-line/60 bg-surface space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-ink-3 font-medium">2. Plan / Strategy</span>
                              <span className="text-3xs text-ink-2 font-medium">
                                {strategyP.campaignStrategyCount} Strategy · {strategyP.brandAuditCount} Audit
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-ink">
                              <Avatar name={bp.planStrategyPic} size={16} />
                              <span className="font-semibold truncate">{bp.planStrategyPic}</span>
                            </div>
                            <div className="text-3xs text-ink-3 line-clamp-1" title={strategyP.bigIdeaAndKeyMessage}>
                              {strategyP.bigIdeaAndKeyMessage}
                            </div>
                          </div>

                          <div className="p-2 rounded-lg border border-line/60 bg-surface space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-ink-3 font-medium">3. Key Visual / SIS</span>
                              <span className="text-3xs text-ink-2 font-medium">
                                {kvP.kvDirectionCount} KV · {kvP.sisBannerPackageCount} SIS · {kvP.pdpSeoProductCount} PDP
                                {((bp.oneSheetPlanData?.keyVisual?.kvImages ?? kvP.kvImages ?? []).length > 0) && (
                                  <span className="text-accent font-semibold">
                                    {' '}· {(bp.oneSheetPlanData?.keyVisual?.kvImages ?? kvP.kvImages ?? []).length} ảnh
                                  </span>
                                )}
                              </span>
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

                        <div className="pt-2 border-t border-line flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(rollup?.storePlans || []).map(sp => {
                              const st = stores.find(s => s.id === sp.storeId || normStoreSlug(s.storeName) === normStoreSlug(sp.storeName));
                              const platShort = st?.platform === 'TikTok Shop' ? 'TikTok' : st?.platform === 'Shopee Mall' ? 'Shopee' : (sp.storeName || 'Gian');
                              return (
                                <button
                                  key={`card-sp-${sp.id}`}
                                  type="button"
                                  onClick={() => onSelectPlan(sp)}
                                  className="px-2 py-0.5 rounded bg-accent/10 text-accent text-2xs font-medium hover:underline cursor-pointer"
                                  title={`Mở phân rã 4.1.1 của gian hàng ${sp.storeName || bp.brandName}`}
                                >
                                  {platShort} ↗
                                </button>
                              );
                            })}
                          </div>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              setBrandModalTab('ONE_SHEET');
                              setEditingBrandPlan(bp);
                            }}
                            className="h-7 px-3 text-2xs font-medium ml-auto"
                          >
                            Nhập Plan Brand
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
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
                        'text-left p-3 rounded-xl border transition-colors cursor-pointer flex flex-col justify-between gap-2',
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

            {/* MOBILE CARD VIEW (< 768px): Hiển thị dọc các gói công việc cá nhân không cần vuốt ngang */}
            <div className="md:hidden divide-y divide-line">
              {filteredPersonalPackages.length === 0 ? (
                <div className="py-10 px-4 text-center text-xs text-ink-3">
                  Không có gói công việc cá nhân nào khớp với bộ lọc hiện tại.
                </div>
              ) : (
                filteredPersonalPackages.map((pkg: PersonalWorkPackageItem) => {
                  const sourcePlan = plans.find(p => p.id === pkg.planId);
                  const matchedBrandPlan = pkg.isBrandPosition
                    ? brandMonthlyPlans.find(bp => bp.brandId === pkg.brandId || bp.brandName === pkg.brandName)
                    : undefined;
                  const tiersSummary = pkg.tierOrFormatLabels.join(', ');

                  return (
                    <div key={`m-pkg-${pkg.id}`} className="p-3 bg-surface space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-xs text-ink">{pkg.staffName}</span>
                            <span className="px-1.5 py-0.5 rounded bg-canvas border border-line text-[10px] font-medium text-ink-2">
                              {pkg.workstreamLabel}
                            </span>
                          </div>
                          <div className="text-[11px] text-ink-3 mt-0.5 flex items-center gap-1.5 flex-wrap">
                            {!pkg.isBrandPosition && (
                              <ChannelTag channel={pkg.platform} className="text-2xs px-1 py-0" />
                            )}
                            <span className="font-semibold text-ink-2">{pkg.storeName}</span>
                            <span>• Leader: {pkg.leaderName || 'Đặng Thị Yến Nhi'}</span>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {getStatusBadge(pkg.planStatus)}
                        </div>
                      </div>

                      <div className="p-2 rounded-lg bg-canvas/70 border border-line/70 flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] text-ink truncate" title={tiersSummary}>{tiersSummary}</div>
                          <div className="text-[10px] text-ink-3">
                            {pkg.isBrandPosition ? 'Đầu việc cấp Brand' : `${pkg.rowIds.length} hạng mục giao riêng`}
                          </div>
                        </div>
                        <div className="text-right tabular-nums shrink-0">
                          <div className="font-semibold text-accent text-xs">
                            {pkg.myQty} {pkg.isBrandPosition ? 'đầu mục' : 'video'}
                          </div>
                          <div className="font-semibold text-ink text-[11px]">
                            {pkg.myBudget > 0 ? formatVndShort(pkg.myBudget) : 'Theo Brand'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-0.5">
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
                    </div>
                  );
                })
              )}
            </div>

            <div className="hidden md:block w-full overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-xs border-collapse">
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
                          <span>Growth: <strong className="text-ink-2 font-medium">{'B2C'}</strong></span>
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
                                <span className="text-ink-2 truncate">{'B2C'}</span>
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
              <>
                <div className="md:hidden divide-y divide-line">
                  {larkbaseRecords.map((rec, idx) => {
                    const convertedPlan = larkbaseConvertedPlans[idx];
                    return (
                      <div key={`m-lark-${rec.larkRecordId}`} className="p-3 space-y-2 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold text-ink">{rec.storeName}</div>
                            <div className="text-2xs text-ink-3">
                              {rec.brandName} • {rec.platform} • {rec.versionCode} ({rec.month})
                            </div>
                          </div>
                          <Status tone="positive">Đã duyệt</Status>
                        </div>
                        <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-canvas border border-line text-2xs">
                          <div>
                            <span className="text-ink-3 block">PIC / Cấp duyệt</span>
                            <span className="font-semibold text-ink">{rec.b2cPic}</span>
                          </div>
                          <div className="text-right tabular-nums">
                            <span className="text-ink-3 block">Net / GMV</span>
                            <span className="font-semibold text-emerald-700">{formatVndShort(rec.budgetNet)}</span>
                            <span className="text-ink-3"> / {formatVndShort(rec.targetGmv)}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <span className="text-2xs text-ink-3">
                            KOC: {rec.affiliatePaidVideos} • FOC: {rec.focFreeVideos} • Self: {rec.selfChannelVideos}
                          </span>
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
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[820px] text-left border-collapse text-xs">
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
              </>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal: Thẩm định & Đối soát Nhanh Tính Hợp Lệ Plan 4.1 vs 4.1.1 & Xử lý Duyệt */}
      {(() => {
        const inspectingItem = inspectingStoreId
          ? storeGovernanceList.find(it => it.store.id === inspectingStoreId) || null
          : null;
        const iStore = inspectingItem?.store;
        const iPlan = inspectingItem?.plan;
        const iVal = inspectingItem?.validity;
        const hasLeader = Boolean(iPlan?.hasBookingLeader ?? iStore?.hasBookingLeader);
        const canManageApproval = Boolean(
          currentUser && (isStaffGlobalAdminOrManager(currentUser) || currentUser.role === 'LEADER')
        );

        return (
          <Modal
            open={Boolean(inspectingItem && iPlan && iVal)}
            onClose={() => setInspectingStoreId(null)}
            title={
              iStore && iPlan
                ? `Thẩm định Kế hoạch 4.1 vs 4.1.1 — ${iStore.storeName} (${iPlan.month})`
                : 'Thẩm định Kế hoạch'
            }
            size="lg"
            footer={
              iStore && iPlan && iVal ? (
                <div className="flex flex-wrap items-center justify-between gap-2 w-full">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="ghost" size="sm" onClick={() => setInspectingStoreId(null)}>
                      Đóng
                    </Button>
                    {onOpenListingForPlan && (inspectingItem.breakdown.affPaidQty > 0 || inspectingItem.breakdown.focQty > 0) && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setInspectingStoreId(null);
                          onOpenListingForPlan(iPlan);
                        }}
                      >
                        Chuyển sang Listing KOC
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setInspectingStoreId(null);
                        onSelectPlan(iPlan);
                      }}
                    >
                      Mở chi tiết 5 bước →
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {onUpdatePlan && iPlan.reference41 && (!iVal.hasWeeklyBreakdown || iVal.mismatchCount > 0 || iVal.errorCount > 0) && !iPlan.isVersionLocked && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const synced = distributeReference41ToWeeks(iPlan, 'EVEN');
                          onUpdatePlan(iPlan.id, {
                            weeklyBreakdown: synced.weeklyBreakdown,
                            items: synced.items,
                            updatedAt: new Date().toISOString(),
                          });
                          notify(`Đã tự động phân bổ tuần 4.1.1 khớp 100% với Bảng 4.1 cho "${iStore.storeName}".`);
                        }}
                      >
                        Khớp 4.1 &amp; Chia đều tuần
                      </Button>
                    )}
                    {canManageApproval && onUpdatePlanStatus && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            const reason = revisionReasonDraft.trim() || 'Yêu cầu rà soát lại số liệu phân rã tuần 4.1.1 khớp với Bảng 4.1.';
                            onUpdatePlanStatus(
                              iPlan.id,
                              'REVISION_REQUESTED',
                              `Quản lý (${currentUser?.name || 'Lead'}) yêu cầu chỉnh sửa kế hoạch ${iStore.storeName}: ${reason}`,
                              reason
                            );
                            if (onUpdatePlan) {
                              onUpdatePlan(iPlan.id, { isVersionLocked: false, revisionNotes: reason });
                            }
                            notify(`Đã chuyển kế hoạch "${iStore.storeName}" sang trạng thái Cần sửa.`);
                            setInspectingStoreId(null);
                          }}
                        >
                          Yêu cầu sửa lại
                        </Button>
                        {currentUser?.role === 'LEADER' && hasLeader && iPlan.status === 'PENDING_PRE_APPROVAL' ? (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={CheckCircle2}
                            onClick={() => {
                              onUpdatePlanStatus(
                                iPlan.id,
                                'PENDING_APPROVAL',
                                `Trưởng nhóm (${currentUser.name}) đã sơ duyệt đạt kế hoạch ${iStore.storeName}, chuyển Giám đốc Marketing phê duyệt.`,
                                'Sơ duyệt đạt chuẩn 4.1.1'
                              );
                              if (onUpdatePlan) {
                                onUpdatePlan(iPlan.id, { leaderApprovalStatus: 'ĐÃ_SƠ_DUYỆT' });
                              }
                              notify(`Đã sơ duyệt đạt cho "${iStore.storeName}", chuyển trình Giám đốc Marketing.`);
                              setInspectingStoreId(null);
                            }}
                          >
                            Sơ duyệt đạt (Chuyển GĐ)
                          </Button>
                        ) : isStaffGlobalAdminOrManager(currentUser) ? (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={CheckCircle2}
                            onClick={() => {
                              handleQuickApprovePlan(iPlan.id, iStore.storeName);
                              setInspectingStoreId(null);
                            }}
                          >
                            Phê duyệt kế hoạch
                          </Button>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              ) : undefined
            }
          >
            {iStore && iPlan && iVal && (
              <div className="space-y-4 text-xs">
                {/* 1. Tóm tắt 4 chặng của gian hàng */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-sunken/50 border border-line">
                  <div>
                    <div className="text-2xs text-ink-3">1. Plan Tổng (4.1)</div>
                    <div className="mt-1 font-semibold text-ink">
                      {iPlan.pendingReference41
                        ? 'Lệch 4.1 mới'
                        : iPlan.reference41?.isGrowthLocked === false
                          ? '4.1 Chưa chốt (Tạm tính)'
                          : iPlan.reference41
                            ? '4.1 Đã chốt'
                            : 'Khởi tạo trực tiếp'}
                    </div>
                  </div>
                  <div>
                    <div className="text-2xs text-ink-3">2. Plan Chi tiết (4.1.1)</div>
                    <div className="mt-1 font-semibold text-ink">
                      {iVal.hasWeeklyBreakdown ? 'Đã chia lịch tuần W1–W5' : 'Chưa nhập lịch tuần'}
                    </div>
                  </div>
                  <div>
                    <div className="text-2xs text-ink-3">3. Tính hợp lệ</div>
                    <div className="mt-1">
                      <Status tone={iVal.badgeTone}>{iVal.badgeLabel}</Status>
                    </div>
                  </div>
                  <div>
                    <div className="text-2xs text-ink-3">4. Luồng phê duyệt</div>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      {getStatusBadge(iPlan.status)}
                      <span className="text-2xs text-ink-3">
                        ({hasLeader ? 'Qua Leader Ngọc Tâm' : 'Trình thẳng GĐ'})
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Kết luận thẩm định nhanh */}
                <div
                  className={cx(
                    'p-3 rounded-xl border',
                    iVal.badgeTone === 'positive'
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                      : iVal.badgeTone === 'info'
                        ? 'bg-blue-50/70 border-blue-200 text-blue-950'
                        : iVal.badgeTone === 'critical'
                          ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                          : 'bg-amber-50/80 border-amber-200 text-amber-950'
                  )}
                >
                  <div className="font-semibold">
                    Kết luận kiểm định: {iVal.shortDetail}
                  </div>
                  <div className="mt-1 text-2xs opacity-90">
                    PIC phụ trách: <strong>{iStore.b2cOwners?.[0] || iStore.b2cOwnerName || iPlan.pic || 'Chưa gán'}</strong>
                    {' · '}
                    Phiên bản hiện hành: <strong>{iPlan.currentVersionCode || 'v1.0'}</strong>
                  </div>
                </div>

                {/* 3. Bảng đối soát 7 chỉ tiêu cốt lõi: Bảng 4.1 (Plan Tổng) vs Bảng 4.1.1 (Phân rã Tuần) */}
                {iVal.comparison.length > 0 && (
                  <div className="rounded-xl border border-line overflow-hidden">
                    <div className="px-3.5 py-2 bg-sunken/70 border-b border-line font-semibold text-ink flex items-center justify-between">
                      <span>Bảng đối soát 7 chỉ tiêu: Plan Tổng (4.1) vs Phân rã Tuần (4.1.1)</span>
                      <span className="text-2xs text-ink-3 font-normal">Đơn vị tiền: Net (VNĐ)</span>
                    </div>
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-line bg-surface text-2xs text-ink-3">
                          <th className="py-2 px-3">Chỉ tiêu</th>
                          <th className="py-2 px-3 text-right">Plan Tổng (4.1)</th>
                          <th className="py-2 px-3 text-right">Phân rã Tuần (4.1.1)</th>
                          <th className="py-2 px-3 text-right">Chênh lệch</th>
                          <th className="py-2 px-3 text-center">Kết quả</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {iVal.comparison.map(row => {
                          const fmtVal = (v: number) =>
                            row.unit === 'money' ? formatVndShort(v) : v.toLocaleString('vi-VN');
                          return (
                            <tr key={row.key} className={row.matched ? '' : 'bg-amber-50/40'}>
                              <td className="py-2 px-3 font-medium text-ink">{row.label}</td>
                              <td className="py-2 px-3 text-right tabular-nums text-ink-2">{fmtVal(row.reference)}</td>
                              <td className="py-2 px-3 text-right tabular-nums font-semibold text-ink">{fmtVal(row.planned)}</td>
                              <td
                                className={cx(
                                  'py-2 px-3 text-right tabular-nums font-semibold',
                                  row.matched ? 'text-ink-3' : row.diff > 0 ? 'text-amber-700' : 'text-rose-700'
                                )}
                              >
                                {row.matched
                                  ? '0'
                                  : `${row.diff > 0 ? '+' : ''}${fmtVal(row.diff)}`}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {row.matched ? (
                                  <Status tone="positive">Khớp</Status>
                                ) : (
                                  <Status tone="warning">{row.diff > 0 ? 'Thừa' : 'Thiếu'}</Status>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 4. Danh sách lỗi logic hoặc cảnh báo đơn giá Ratecard Bảng 5.6 */}
                {iVal.issues.length > 0 && (
                  <div className="rounded-xl border border-line p-3 space-y-1.5 bg-surface">
                    <div className="font-semibold text-ink">
                      Chi tiết cảnh báo &amp; lỗi kiểm định ({iVal.issues.length} mục)
                    </div>
                    <ul className="space-y-1 max-h-36 overflow-y-auto text-2xs">
                      {iVal.issues.map((iss, idx) => (
                        <li
                          key={`${iss.code}-${idx}`}
                          className={cx(
                            'px-2.5 py-1.5 rounded-lg border flex items-center justify-between gap-2',
                            iss.severity === 'error'
                              ? 'bg-rose-50 border-rose-200 text-rose-900 font-medium'
                              : 'bg-amber-50/70 border-amber-200 text-amber-900'
                          )}
                        >
                          <span>{iss.message}</span>
                          <span className="shrink-0 font-mono text-[10px] uppercase">
                            {iss.severity === 'error' ? 'Lỗi chặn gửi' : iss.needsNote ? 'Cần giải trình' : 'Lưu ý giá'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 5. Giải trình của chuyên viên (breakdownNote) & Ghi chú yêu cầu sửa của Quản lý */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-ink block">
                      Giải trình chênh lệch 4.1 vs 4.1.1 của PIC
                    </label>
                    <Textarea
                      rows={2}
                      placeholder="Nhập lý do nếu phân rã 4.1.1 điều chỉnh khác Bảng 4.1..."
                      value={auditNoteDraft}
                      onChange={e => setAuditNoteDraft(e.target.value)}
                    />
                    {onUpdatePlan && auditNoteDraft !== (iPlan.breakdownNote || '') && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          onUpdatePlan(iPlan.id, {
                            breakdownNote: auditNoteDraft.trim(),
                            updatedAt: new Date().toISOString(),
                          });
                          notify(`Đã lưu giải trình đối soát 4.1 cho "${iStore.storeName}".`);
                        }}
                      >
                        Lưu giải trình
                      </Button>
                    )}
                  </div>

                  {canManageApproval && (
                    <div className="space-y-1.5">
                      <label className="font-semibold text-ink block">
                        Ghi chú phản hồi của Quản lý (khi duyệt / yêu cầu sửa)
                      </label>
                      <Textarea
                        rows={2}
                        placeholder="Nhập chỉ đạo hoặc lý do yêu cầu sửa kế hoạch..."
                        value={revisionReasonDraft}
                        onChange={e => setRevisionReasonDraft(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </Modal>
        );
      })()}

      {/* MODAL TỔNG QUAN TIẾN ĐỘ & KIỂM ĐỊNH 4 CHẶNG */}
      <Modal
        open={isGovernanceOverviewModalOpen}
        onClose={() => setIsGovernanceOverviewModalOpen(false)}
        title={`Tiến độ & Kiểm định kế hoạch kỳ ${selectedMonth === 'ALL' ? 'Tất cả các tháng' : selectedMonth}`}
        size="xl"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-2 flex-wrap">
              {governanceStats.countEmptyWeekly411 > 0 &&
                currentUser &&
                isStaffGlobalAdminOrManager(currentUser) &&
                onUpdatePlan && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      let updatedCount = 0;
                      for (const item of governanceStats.emptyWeekly411List) {
                        if (!item.plan || !item.plan.reference41) continue;
                        const synced = distributeReference41ToWeeks(item.plan);
                        if (!synced) continue;
                        onUpdatePlan(item.plan.id, {
                          weeklyBreakdown: synced.weeklyBreakdown,
                          items: synced.items,
                        });
                        updatedCount += 1;
                      }
                      notify(
                        `Đã tự động chia đều 4 tuần (4.1.1) từ số chuẩn Bảng 4.1 cho ${updatedCount} gian hàng chưa chia.`
                      );
                    }}
                  >
                    Chia tuần 4.1.1 chuẩn ({governanceStats.countEmptyWeekly411} gian chưa chia)
                  </Button>
                )}
              {governanceStats.countReadyToBatchApprove > 0 &&
                currentUser &&
                isStaffGlobalAdminOrManager(currentUser) &&
                onUpdatePlanStatus && (
                  <Button
                    size="sm"
                    variant="primary"
                    icon={CheckCircle2}
                    onClick={() => {
                      for (const item of governanceStats.readyToBatchApproveList) {
                        if (!item.plan) continue;
                        onUpdatePlanStatus(
                          item.plan.id,
                          'LEAD_APPROVED',
                          `Quản lý (${currentUser.name || 'Giám đốc MKT'}) đã phê duyệt hàng loạt kế hoạch hợp lệ cho gian hàng ${item.store.storeName}.`,
                          'Phê duyệt nhanh kế hoạch đã đạt kiểm định 4.1 vs 4.1.1.'
                        );
                      }
                      notify(
                        `Đã phê duyệt hàng loạt ${governanceStats.countReadyToBatchApprove} kế hoạch hợp lệ đang chờ duyệt.`
                      );
                    }}
                  >
                    Duyệt nhanh {governanceStats.countReadyToBatchApprove} plan hợp lệ
                  </Button>
                )}
            </div>
            <div className="flex items-center gap-2">
              {onOpenPlanReport && (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={FileText}
                  onClick={() => {
                    setIsGovernanceOverviewModalOpen(false);
                    onOpenPlanReport();
                  }}
                >
                  Báo cáo thẩm định kế hoạch
                </Button>
              )}
              <Button size="sm" variant="primary" onClick={() => setIsGovernanceOverviewModalOpen(false)}>
                Đóng
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {/* 4 CỘT SCORECARD QUẢN TRỊ: 1. PLAN TỔNG -> 2. PLAN CHI TIẾT -> 3. TÍNH HỢP LỆ -> 4. DUYỆT & THỰC THI */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-line border border-line rounded-xl overflow-hidden bg-surface">
            {/* CHẶNG 1 */}
            <div className="p-3.5 flex flex-col justify-between gap-2.5">
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-ink">1. Plan Tổng (4.1 &amp; Brand)</span>
                  <span className="text-sm font-bold font-mono text-emerald-700 tabular-nums">
                    {governanceStats.countConfirmed41}/{governanceStats.totalB2cManaged}{' '}
                    <span className="text-2xs font-semibold">({governanceStats.coveragePct}%)</span>
                  </span>
                </div>
                <Progress
                  value={governanceStats.countConfirmed41}
                  max={governanceStats.totalB2cManaged || 1}
                  label="Tiến độ chốt Plan Tổng 4.1"
                />
                <div className="space-y-1 pt-0.5 text-2xs">
                  {[
                    {
                      key: 'CONFIRMED_41' as const,
                      label: 'Đã chốt Bảng 4.1',
                      count: governanceStats.countConfirmed41,
                      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                    },
                    {
                      key: 'UNCONFIRMED_41' as const,
                      label: '4.1 Chưa chốt (Tạm)',
                      count: governanceStats.countUnconfirmed41,
                      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
                    },
                    ...(governanceStats.countPending41Diff > 0
                      ? [
                          {
                            key: 'PENDING_41_DIFF' as const,
                            label: 'Có 4.1 mới lệch bản duyệt',
                            count: governanceStats.countPending41Diff,
                            badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
                          },
                        ]
                      : []),
                    {
                      key: 'MISSING_PLAN' as const,
                      label: 'Chưa khởi tạo 4.1',
                      count: governanceStats.countMissingPlan,
                      badgeClass: 'bg-sunken text-ink-2 border-line',
                    },
                  ].map((row) => (
                    <button
                      key={row.key}
                      type="button"
                      onClick={() => {
                        setStoreGovernanceFilter(row.key);
                        setGovernancePage(1);
                        setIsGovernanceOverviewModalOpen(false);
                      }}
                      className={cx(
                        'w-full flex items-center justify-between px-2 py-1 rounded-md border transition cursor-pointer',
                        storeGovernanceFilter === row.key
                          ? 'bg-ink text-white border-ink font-semibold'
                          : 'bg-canvas/50 hover:bg-sunken text-ink-2 border-line/70'
                      )}
                    >
                      <span>{row.label}</span>
                      <span
                        className={cx(
                          'px-1.5 py-0.2 rounded font-mono font-semibold border text-2xs tabular-nums',
                          storeGovernanceFilter === row.key ? 'bg-white/20 text-white border-white/30' : row.badgeClass
                        )}
                      >
                        {row.count} gian
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-1.5 border-t border-line/70 flex items-center justify-between text-2xs">
                <span className="text-ink-3">
                  Plan Brand: <strong className="text-ink">{brandPlanKpis.completeCoverageCount}/{brandPlanKpis.total} nhãn</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsGovernanceOverviewModalOpen(false);
                    setActiveHubTab('BRAND_PLANS');
                  }}
                  className="text-accent hover:underline font-semibold cursor-pointer"
                >
                  Xem Plan Brand →
                </button>
              </div>
            </div>

            {/* CHẶNG 2 */}
            <div className="p-3.5 flex flex-col justify-between gap-2.5">
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-ink">2. Plan Chi Tiết (4.1.1 Tuần)</span>
                  <span className="text-sm font-bold font-mono text-blue-700 tabular-nums">
                    {governanceStats.countHasWeekly411}/{governanceStats.totalB2cManaged}{' '}
                    <span className="text-2xs font-semibold">({governanceStats.weekly411Pct}%)</span>
                  </span>
                </div>
                <Progress
                  value={governanceStats.countHasWeekly411}
                  max={governanceStats.totalB2cManaged || 1}
                  label="Tiến độ phân rã lịch tuần 4.1.1"
                />
                <div className="space-y-1 pt-0.5 text-2xs">
                  {[
                    {
                      key: 'HAS_WEEKLY_411' as const,
                      label: 'Đã chia lịch tuần 4.1.1 (W1–W4)',
                      count: governanceStats.countHasWeekly411,
                      badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
                    },
                    {
                      key: 'EMPTY_WEEKLY' as const,
                      label: 'Có 4.1 nhưng chưa chia 4.1.1',
                      count: governanceStats.countEmptyWeekly411,
                      badgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
                    },
                    {
                      key: 'MISSING_PLAN' as const,
                      label: 'Chưa có cả 4.1 & 4.1.1',
                      count: governanceStats.countMissingPlan,
                      badgeClass: 'bg-sunken text-ink-2 border-line',
                    },
                  ].map((row, idx) => (
                    <button
                      key={`${row.key}-${idx}`}
                      type="button"
                      onClick={() => {
                        setStoreGovernanceFilter(row.key);
                        setGovernancePage(1);
                        setIsGovernanceOverviewModalOpen(false);
                      }}
                      className={cx(
                        'w-full flex items-center justify-between px-2 py-1 rounded-md border transition cursor-pointer',
                        storeGovernanceFilter === row.key
                          ? 'bg-ink text-white border-ink font-semibold'
                          : 'bg-canvas/50 hover:bg-sunken text-ink-2 border-line/70'
                      )}
                    >
                      <span>{row.label}</span>
                      <span
                        className={cx(
                          'px-1.5 py-0.2 rounded font-mono font-semibold border text-2xs tabular-nums',
                          storeGovernanceFilter === row.key ? 'bg-white/20 text-white border-white/30' : row.badgeClass
                        )}
                      >
                        {row.count} gian
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-1.5 border-t border-line/70 flex items-center justify-between text-2xs">
                <span className="text-ink-3">
                  Gói việc nhân sự: <strong className="text-ink">{allPersonalPackages.length} đầu mục</strong>
                </span>
                {canViewTeamPlansAndCoefficients && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsGovernanceOverviewModalOpen(false);
                      setActiveHubTab('PERSONAL_PLANS');
                    }}
                    className="text-accent hover:underline font-semibold cursor-pointer"
                  >
                    Theo nhân sự →
                  </button>
                )}
              </div>
            </div>

            {/* CHẶNG 3 */}
            <div className="p-3.5 flex flex-col justify-between gap-2.5">
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-ink">3. Kiểm Định Hợp Lệ (4.1 vs 4.1.1)</span>
                  <span className="text-sm font-bold font-mono text-emerald-700 tabular-nums">
                    {governanceStats.countValidTotal}/{governanceStats.countWithPlan || 1}{' '}
                    <span className="text-2xs font-semibold">({governanceStats.validPct}%)</span>
                  </span>
                </div>
                <Progress
                  value={governanceStats.countValidTotal}
                  max={governanceStats.countWithPlan || 1}
                  label="Tỷ lệ kế hoạch đạt kiểm định hợp lệ"
                />
                <div className="space-y-1 pt-0.5 text-2xs">
                  {[
                    {
                      key: 'VALID_MATCHED' as const,
                      label: '✓ Khớp 100% Bảng 4.1',
                      count: governanceStats.countValidMatched,
                      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                    },
                    ...(governanceStats.countValidWithNote > 0
                      ? [
                          {
                            key: 'VALID_WITH_NOTE' as const,
                            label: '✓ Lệch 4.1 đã có giải trình',
                            count: governanceStats.countValidWithNote,
                            badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
                          },
                        ]
                      : []),
                    {
                      key: 'UNEXPLAINED_MISMATCH' as const,
                      label: '⚠ Lệch 4.1 chưa giải trình',
                      count: governanceStats.countUnexplainedMismatch,
                      badgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
                    },
                    {
                      key: 'HAS_ERRORS' as const,
                      label: '✕ Lỗi cấu trúc 4.1.1 (SL/Tiền)',
                      count: governanceStats.countHasErrors,
                      badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
                    },
                  ].map((row) => (
                    <button
                      key={row.key}
                      type="button"
                      onClick={() => {
                        setStoreGovernanceFilter(row.key);
                        setGovernancePage(1);
                        setIsGovernanceOverviewModalOpen(false);
                      }}
                      className={cx(
                        'w-full flex items-center justify-between px-2 py-1 rounded-md border transition cursor-pointer',
                        storeGovernanceFilter === row.key
                          ? 'bg-ink text-white border-ink font-semibold'
                          : 'bg-canvas/50 hover:bg-sunken text-ink-2 border-line/70'
                      )}
                    >
                      <span>{row.label}</span>
                      <span
                        className={cx(
                          'px-1.5 py-0.2 rounded font-mono font-semibold border text-2xs tabular-nums',
                          storeGovernanceFilter === row.key ? 'bg-white/20 text-white border-white/30' : row.badgeClass
                        )}
                      >
                        {row.count} gian
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-1.5 border-t border-line/70 flex items-center justify-between text-2xs">
                <button
                  type="button"
                  onClick={() => {
                    setStoreGovernanceFilter('PRICE_WARNING');
                    setGovernancePage(1);
                    setIsGovernanceOverviewModalOpen(false);
                  }}
                  className="text-ink-3 hover:text-ink cursor-pointer"
                >
                  Đơn giá vượt khung 5.6: <strong className="text-ink-2">{governanceStats.countPriceWarnings} gian</strong>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStoreGovernanceFilter('INVALID_411');
                    setGovernancePage(1);
                    setIsGovernanceOverviewModalOpen(false);
                  }}
                  className="text-amber-800 hover:underline font-semibold cursor-pointer"
                >
                  Lọc cần xử lý ({governanceStats.countInvalid411}) →
                </button>
              </div>
            </div>

            {/* CHẶNG 4 */}
            <div className="p-3.5 flex flex-col justify-between gap-2.5">
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-ink">4. Phê Duyệt &amp; Triển Khai</span>
                  <span className="text-sm font-bold font-mono text-accent tabular-nums">
                    {governanceStats.countApproved}/{governanceStats.totalB2cManaged}{' '}
                    <span className="text-2xs font-semibold">({governanceStats.approvedPct}%)</span>
                  </span>
                </div>
                <Progress
                  value={governanceStats.countApproved}
                  max={governanceStats.totalB2cManaged || 1}
                  label="Tiến độ phê duyệt chính thức"
                />
                <div className="space-y-1 pt-0.5 text-2xs">
                  {[
                    {
                      key: 'APPROVED' as const,
                      label: 'Đã duyệt (Triển khai Listing)',
                      count: governanceStats.countApproved,
                      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                    },
                    {
                      key: 'PENDING_APPROVAL' as const,
                      label: 'Chờ Giám đốc duyệt',
                      count: governanceStats.countPendingApproval,
                      badgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
                    },
                    {
                      key: 'PENDING_PRE_APPROVAL' as const,
                      label: 'Chờ Leader Ngọc Tâm sơ duyệt',
                      count: governanceStats.countPendingPreApproval,
                      badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
                    },
                    {
                      key: 'DRAFT' as const,
                      label: 'Bản nháp / Cần sửa lại',
                      count: governanceStats.countDraft + governanceStats.countRevisionRequested,
                      badgeClass: 'bg-sunken text-ink-2 border-line',
                    },
                  ].map((row) => (
                    <button
                      key={row.key}
                      type="button"
                      onClick={() => {
                        setStoreGovernanceFilter(row.key);
                        setGovernancePage(1);
                        setIsGovernanceOverviewModalOpen(false);
                      }}
                      className={cx(
                        'w-full flex items-center justify-between px-2 py-1 rounded-md border transition cursor-pointer',
                        storeGovernanceFilter === row.key
                          ? 'bg-ink text-white border-ink font-semibold'
                          : 'bg-canvas/50 hover:bg-sunken text-ink-2 border-line/70'
                      )}
                    >
                      <span>{row.label}</span>
                      <span
                        className={cx(
                          'px-1.5 py-0.2 rounded font-mono font-semibold border text-2xs tabular-nums',
                          storeGovernanceFilter === row.key ? 'bg-white/20 text-white border-white/30' : row.badgeClass
                        )}
                      >
                        {row.count} gian
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-1.5 border-t border-line/70 flex items-center justify-between text-2xs">
                <span className="text-ink-3">Sau duyệt: Listing KOC · HĐ · Air</span>
                <span className="text-ink-2 font-medium tabular-nums">
                  {governanceStats.countWithLeader} qua Leader · {governanceStats.countDirectHead} trình thẳng
                </span>
              </div>
            </div>
          </div>

          {/* TIẾN ĐỘ & ĐIỂM NGHẼN THEO CHUYÊN VIÊN PHỤ TRÁCH (PIC) */}
          {governanceStats.picBottleneckSummary.length > 0 && (
            <div className="rounded-xl border border-line overflow-hidden bg-surface">
              <div className="px-3.5 py-2 bg-sunken/60 border-b border-line font-semibold text-ink flex items-center justify-between">
                <span>Tiến độ &amp; Điểm nghẽn theo Chuyên viên phụ trách (Bấm tên PIC để lọc trên bảng)</span>
                {governancePicFilter !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setGovernancePicFilter('ALL')}
                    className="text-2xs text-accent hover:underline font-semibold cursor-pointer"
                  >
                    Bỏ lọc PIC ({governancePicFilter})
                  </button>
                )}
              </div>
              <div className="p-3 flex flex-wrap gap-2">
                {governanceStats.picBottleneckSummary.map((p) => {
                  const isSelected = governancePicFilter === p.picName;
                  return (
                    <button
                      key={p.picName}
                      type="button"
                      onClick={() => {
                        setGovernancePicFilter(isSelected ? 'ALL' : p.picName);
                        setGovernancePage(1);
                        setIsGovernanceOverviewModalOpen(false);
                      }}
                      className={cx(
                        'px-2.5 py-1.5 rounded-lg border text-2xs transition cursor-pointer flex items-center gap-2',
                        isSelected
                          ? 'bg-ink text-white border-ink font-semibold'
                          : p.bottleneckCount > 0
                            ? 'bg-amber-50/50 hover:bg-amber-100/70 text-ink border-amber-200'
                            : 'bg-emerald-50/50 hover:bg-emerald-100/70 text-ink border-emerald-200'
                      )}
                      title={`Tổng ${p.totalStores} gian: ${p.emptyWeeklyCount} chưa chia 4.1.1, ${p.invalidCount} lệch/lỗi, ${p.missingCount} chưa lập`}
                    >
                      <span className="font-medium">{p.picName}</span>
                      <span
                        className={cx(
                          'font-mono font-semibold px-1.5 py-0.5 rounded',
                          isSelected
                            ? 'bg-white/20 text-white'
                            : p.bottleneckCount > 0
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-emerald-100 text-emerald-900'
                        )}
                      >
                        {p.bottleneckCount > 0 ? `${p.bottleneckCount}/${p.totalStores} cần xử lý` : `${p.totalStores}/${p.totalStores} đạt`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};


