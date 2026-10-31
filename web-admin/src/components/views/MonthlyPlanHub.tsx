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
  PeriodPicker,
  Stat,
  StatRow,
  ActionMenu,
  Status,
  Avatar,
  BrandAvatar,
  useFlipList
} from '../ui';
import type { ActionMenuItem } from '../ui';
import { formatNumber, formatVndShort, getVietnamDateYmd } from '../../lib/format';
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
  getPlanVersionSnapshots,
  getStorePlanWorkstreamSummary,
  buildPersonalWorkPackages,
  INITIAL_BRAND_MONTHLY_PLANS,
  isSyntheticBrandMonthlyPlanItem,
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
import { buildFinalApproval, canFinalApprovePlan } from '../../lib/planApproval';

import {
  BrandMonthlyPlanEditorView,
  PlanCreateEditModal,
} from '../planning/PlanCreateEditModal';
import { PlanDiscussionDrawer } from '../planning/PlanDiscussionDrawer';
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

const b2cPlanBreakdownCache = new WeakMap<InputPlanBreakdownState, B2cWorkloadBreakdown>();

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

  const cached = b2cPlanBreakdownCache.get(plan);
  if (cached) return cached;

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
    const totalBudget = plan.totalTargetBudget || (ref.affCostNet + ref.selfCostNet + ref.liveCostNet + refOtherBudget);
    const allocatedBudget = affPaidBudget + selfBudget + otherBudget + (ref.liveCostNet || 0);
    const totalVideos = plan.totalTargetContents || (affPaidQty + focQty + selfQty + otherQty + (ref.liveSessions || 0));

    const res: B2cWorkloadBreakdown = {
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
    b2cPlanBreakdownCache.set(plan, res);
    return res;
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

  const res: B2cWorkloadBreakdown = {
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
  b2cPlanBreakdownCache.set(plan, res);
  return res;
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
  searchKey?: string;
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
  onUpdatePlanStatus?: (planId: string, newStatus: MonthlyPlanStatus, logMessage?: string, note?: string, patch?: Partial<InputPlanBreakdownState>) => void;
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

const getShortStaffName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/);
  return parts.length >= 2 ? parts.slice(-2).join(' ') : fullName;
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

/** Gian cần xử lý: chưa lập kế hoạch, chưa chia 4.1.1 hoặc lệch 4.1. */
const isNeedsAction = (item: StoreGovernanceItem): boolean =>
  item.isB2c && (!item.hasPlan || !item.validity.hasWeeklyBreakdown || !item.validity.isValidForSubmit);

const STATUS_TEXT: Partial<Record<MonthlyPlanStatus, string>> = {
  PENDING_PRE_APPROVAL: 'Chờ sơ duyệt',
  PRE_APPROVED: 'Sơ duyệt đạt',
  REVISION_REQUESTED: 'Cần sửa',
  PENDING_APPROVAL: 'Chờ duyệt',
  LEAD_APPROVED: 'Đã duyệt',
  BRAND_APPROVED: 'Đã duyệt',
  APPROVED: 'Đã duyệt',
  IN_EXECUTION: 'Đang chạy',
  COMPLETED: 'Hoàn tất',
  DRAFT: 'Nháp',
};

/** Một nhãn trạng thái duy nhất cho mỗi dòng; chi tiết kiểm định 4.1 nằm ở tooltip. */
function RowStatus({ item }: { item: StoreGovernanceItem }) {
  const { plan, isB2c, validity } = item;
  if (!isB2c) return <Status tone="neutral">Ngoài B2C</Status>;
  if (!plan) return <Status tone="neutral">Chưa lập</Status>;
  const st: MonthlyPlanStatus = plan.status || 'DRAFT';
  const approvalText = STATUS_TEXT[st] || 'Nháp';
  const detail = `${approvalText} · Kiểm định 4.1: ${validity.badgeLabel}${validity.shortDetail ? ` (${validity.shortDetail})` : ''}`;
  let badge: React.ReactNode;
  if (plan.pendingReference41) badge = <Status tone="critical">Có 4.1 mới</Status>;
  else if (st === 'DRAFT' && !validity.isValidForSubmit) badge = <Status tone={validity.badgeTone}>{validity.badgeLabel}</Status>;
  else badge = getStatusBadge(st);
  return <span title={detail} className="inline-flex">{badge}</span>;
}

/** Dòng phụ ghi PIC chính của một đầu việc (+N người khác); đủ danh sách ở tooltip. */
function PicLine({ staff, onOpen }: { staff: Array<{ staffName: string; qty: number }>; onOpen: (staffName: string) => void }) {
  if (staff.length === 0) return null;
  const all = staff.map((x) => `${x.staffName} (${x.qty})`).join(', ');
  return (
    <div className="mt-0.5 flex items-center justify-end gap-1 text-2xs text-ink-3" title={all} onClick={(e) => e.stopPropagation()}>
      <Button variant="ghost" size="sm" className="h-5 px-1 text-2xs font-normal" onClick={() => onOpen(staff[0].staffName)}>
        {getShortStaffName(staff[0].staffName)}
      </Button>
      {staff.length > 1 && <span>+{staff.length - 1}</span>}
    </div>
  );
}

interface StoreGovernanceTableRowProps {
  item: StoreGovernanceItem;
  isCampaignActive: boolean;
  onSelectPlan: (plan: InputPlanBreakdownState, options?: { focusStaffName?: string; focusWorkstream?: B2cWorkstreamType }) => void;
  openVersionModal: (planId: string, tab?: 'VERSION_HISTORY' | 'APPROVAL_FLOW' | 'DISCUSSION') => void;
  currentUser?: UserProfile;
  onUpdatePlan?: (planId: string, updated: Partial<InputPlanBreakdownState>) => void;
  onOpenListingForPlan?: (plan: InputPlanBreakdownState) => void;
  handleCreatePlanForStore: (store: StorePortfolioItem, e: React.MouseEvent) => void;
  /** Mở hộp thoại thẩm định và duyệt nhanh của gian hàng. */
  onInspect: (storeId: string) => void;
  notify: (msg: string) => void;
}

const StoreGovernanceTableRow = React.memo(function StoreGovernanceTableRow({
  item,
  isCampaignActive,
  onSelectPlan,
  openVersionModal,
  currentUser,
  onUpdatePlan,
  onOpenListingForPlan,
  handleCreatePlanForStore,
  onInspect,
  notify,
}: StoreGovernanceTableRowProps) {
  const store = item.store;
  const plan = item.plan;
  const isB2c = item.isB2c;
  const bd = item.breakdown;
  const ws = item.workstreamSummary;
  const versionSnapshots = plan ? getPlanVersionSnapshots(plan) : [];
  const versionCount = versionSnapshots.length;
  const activeVersionCode = plan?.currentVersionCode || 'v1.0';
  const baselineSnapshot = versionSnapshots[0];
  const budgetDelta =
    plan && baselineSnapshot && versionCount > 1
      ? (plan.totalTargetBudget || bd.totalBudget) - (baselineSnapshot.totalTargetBudget || 0)
      : 0;
  const hasLeader = Boolean(plan?.hasBookingLeader ?? store.hasBookingLeader);
  const isManager = Boolean(currentUser && isStaffGlobalAdminOrManager(currentUser));
  const canReview = Boolean(currentUser && (isManager || currentUser.role === 'LEADER'));
  const awaitingReview = Boolean(
    isB2c && plan && canReview && (plan.status === 'PENDING_APPROVAL' || plan.status === 'PENDING_PRE_APPROVAL')
  );
  const openFocus = (workstream: B2cWorkstreamType) => (staffName: string) => {
    if (plan) onSelectPlan(plan, { focusStaffName: staffName, focusWorkstream: workstream });
  };

  // Mở khóa kế hoạch đã duyệt để áp dụng số liệu 4.1 mới
  const handleUnlock41 = () => {
    if (!plan || !plan.pendingReference41 || !currentUser || !onUpdatePlan) return;
        const nextRef = plan.pendingReference41!;
        const nextBudget = nextRef.affCostNet + nextRef.selfCostNet + nextRef.liveCostNet;
        const nextContents = nextRef.cast + nextRef.foc + nextRef.selfVideos + nextRef.liveSessions;
        const actorName = currentUser.name || 'Giám đốc Marketing B2C';
        const unlockMsg: PlanDiscussionMessage = {
          id: `DISC-UNLOCK41-${Date.now()}`,
          authorName: actorName,
          authorRole: 'LEAD',
          authorTitle: 'Quản lý B2C',
          content: `Quản lý (${actorName}) đã mở khóa kế hoạch đã duyệt và cập nhật theo số liệu Bảng 4.1 mới (Tổng Net: ${formatVndShort(
            nextBudget
          )}, Tổng nội dung: ${nextContents} video). Chuyển về trạng thái Cần sửa để chuyên viên điều chỉnh phân rã tuần.`,
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
  };

  const menuItems: ActionMenuItem[] = [];
  if (plan) {
    menuItems.push({ label: 'Mở kế hoạch', onSelect: () => onSelectPlan(plan) });
    if (isB2c) menuItems.push({ label: 'Thẩm định 4.1', onSelect: () => onInspect(store.id) });
    if (onOpenListingForPlan && (bd.affPaidQty > 0 || bd.focQty > 0)) {
      menuItems.push({ label: 'Listing KOC', onSelect: () => onOpenListingForPlan(plan) });
    }
    if (plan.pendingReference41 && isManager && onUpdatePlan) {
      menuItems.push({ label: 'Mở khóa 4.1', danger: true, onSelect: handleUnlock41 });
    }
    menuItems.push({ label: 'Lịch sử phiên bản', onSelect: () => openVersionModal(plan.id, 'VERSION_HISTORY') });
  }

  const otherStaff = [...ws.selfChannel.assignees, ...ws.multiPlatform.assignees];
  const otherTitle = otherStaff.length > 0 ? otherStaff.map((x) => `${x.staffName} (${x.qty})`).join(', ') : undefined;
  const picName = store.b2cOwners?.[0] || store.b2cOwnerName || 'Chưa gán';

  return (
    <tr
      data-flip={store.id}
      onClick={() => plan && onSelectPlan(plan)}
      className={cx(
        'group hover:bg-canvas transition-colors',
        plan && 'cursor-pointer',
        !isB2c && 'bg-sunken/30 text-ink-3'
      )}
    >
      {/* Gian hàng: tên, sàn, thương hiệu; phiên bản và chênh lệch ngân sách ở tooltip */}
      <td className="py-3 px-3 align-middle">
        <div
          className="font-medium text-ink text-xs truncate"
          title={`${store.storeName}${plan ? ` · Phiên bản ${activeVersionCode}${versionCount > 1 ? ` (${versionCount} bản)` : ''}` : ''}${
            budgetDelta !== 0 ? ` · Chênh so với bản gốc: ${budgetDelta > 0 ? '+' : ''}${formatVndShort(budgetDelta)}` : ''
          }`}
        >
          {store.storeName}
        </div>
        <div
          className="flex items-center gap-2 mt-1 text-2xs text-ink-3 min-w-0"
          title={`${store.storeName} (${store.brandName}) · ${
            isCampaignActive ? `Campaign: ${plan?.campaignCode || 'Có'}` : 'Duy trì'
          } · Hệ số: ${normalizeStoreCoefficient(store.difficultyTier, store.difficultyMultiplier).label}`}
        >
          <ChannelTag channel={store.platform} className="text-2xs px-1 py-0" />
          <span className="truncate">{store.brandName}</span>
        </div>
      </td>

      {/* Phụ trách: PIC chính và luồng duyệt */}
      <td className="py-3 px-3 align-middle">
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-ink text-xs truncate" title={picName}>{picName}</span>
          {ws.allStaffNames.length > 1 && (
            <span className="text-2xs text-ink-3 shrink-0" title={`Gian hàng có ${ws.allStaffNames.length} nhân sự phối hợp: ${ws.allStaffNames.join(', ')}`}>
              +{ws.allStaffNames.length - 1}
            </span>
          )}
        </div>
        <div className="mt-0.5 text-2xs text-ink-3">{hasLeader ? 'Qua Trưởng nhóm' : 'Trực tiếp'}</div>
      </td>

      {/* Ngân sách Net */}
      <td className="py-3 px-2 text-right tabular-nums align-middle">
        <div className="text-ink text-xs">{formatVndShort(bd.totalBudget)}</div>
        <div className="text-2xs text-ink-3">{bd.totalVideos} video</div>
      </td>

      {/* KOC trả phí */}
      <td className="py-2 px-2 text-right tabular-nums align-middle">
        {bd.affPaidQty > 0 || bd.affPaidBudget > 0 ? (
          <>
            <div className="text-ink text-xs">{bd.affPaidQty} video · {formatVndShort(bd.affPaidBudget)}</div>
            <PicLine staff={ws.affiliatePaid.assignees} onOpen={openFocus('AFFILIATE_PAID')} />
          </>
        ) : (
          <span className="text-ink-3 text-2xs">—</span>
        )}
      </td>

      {/* FOC (0đ) */}
      <td className="py-2 px-2 text-right tabular-nums align-middle">
        {bd.focQty > 0 ? (
          <>
            <div className="text-ink text-xs">{bd.focQty} mẫu</div>
            <PicLine staff={ws.focSample.assignees} onOpen={openFocus('FOC_SAMPLE')} />
          </>
        ) : (
          <span className="text-ink-3 text-2xs">—</span>
        )}
      </td>

      {/* Kênh Brand và Đa sàn (gộp); tách đôi và danh sách PIC ở tooltip */}
      <td className="py-2 px-2 text-right tabular-nums align-middle" title={otherTitle}>
        {bd.selfQty + bd.otherQty > 0 || bd.selfBudget + bd.otherBudget > 0 ? (
          <>
            <div className="text-ink text-xs">{bd.selfQty + bd.otherQty} video · {formatVndShort(bd.selfBudget + bd.otherBudget)}</div>
            <div className="mt-0.5 text-2xs text-ink-3">Brand {bd.selfQty} · Đa sàn {bd.otherQty}</div>
          </>
        ) : (
          <span className="text-ink-3 text-2xs">—</span>
        )}
      </td>

      {/* Trạng thái (một nhãn) và thao tác (một nút hiện sẵn, còn lại trong menu) */}
      <td className="py-2 px-3 text-right align-middle">
        <div className="flex flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
          <RowStatus item={item} />
          <div className="flex items-center justify-end gap-1">
            {isB2c && !plan && (
              <Button size="sm" variant="secondary" icon={Plus} onClick={(e) => handleCreatePlanForStore(store, e)}>
                Lập plan
              </Button>
            )}
            {awaitingReview && (
              <Button size="sm" variant="primary" onClick={() => onInspect(store.id)}>
                Duyệt
              </Button>
            )}
            {menuItems.length > 0 && <ActionMenu items={menuItems} label={`Thao tác của ${store.storeName}`} />}
          </div>
        </div>
      </td>
    </tr>
  );
});

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

  // Bộ lọc tháng: các kỳ có kế hoạch, mới nhất trước. Mặc định mở kỳ đang lập (muộn nhất là tháng sau).
  const planMonths = useMemo(
    () => Array.from(new Set(scopedPlans.map(p => p.month).filter(Boolean))).sort().reverse(),
    [scopedPlans]
  );
  const defaultMonth = useMemo(() => {
    const [y, m] = getVietnamDateYmd().split('-').map(Number);
    const nextMonth = m === 12 ? `${y + 1}/01` : `${y}/${String(m + 1).padStart(2, '0')}`;
    return planMonths.find(month => month <= nextMonth) || planMonths[0] || 'ALL';
  }, [planMonths]);
  const [pickedMonth, setSelectedMonth] = useState<string | null>(null);
  const selectedMonth = pickedMonth ?? defaultMonth;

  // Cache danh sách brand có campaign active trong tháng để O(1) lookup trên bảng gian hàng
  const activeCampaignBrandNames = useMemo(() => {
    const targetMonth = selectedMonth === 'ALL' ? '2026/10' : selectedMonth;
    const set = new Set<string>();
    for (const c of effectiveCampaigns) {
      if (isCampaignActiveInMonth(c, targetMonth)) {
        set.add((c.brand || '').toLowerCase().trim());
      }
    }
    return set;
  }, [effectiveCampaigns, selectedMonth]);
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

  // Tab chuyển góc nhìn: Ma trận gian hàng vs Kế hoạch theo Brand (3 vị trí)
  const [activeHubTab, setActiveHubTab] = useState<'STORE_GOVERNANCE' | 'BRAND_PLANS'>('STORE_GOVERNANCE');
  const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null);

  useEffect(() => {
    const onSubView = (e: Event) => {
      const detail = (e as CustomEvent<{ tab?: string; subView?: string }>).detail;
      if (detail?.tab !== 'input-plan') return;
      if (detail.subView === 'BRAND_PLANS' || detail.subView === 'STORE_GOVERNANCE') {
        setEditingBrandPlan(null);
        setActiveHubTab(detail.subView);
      }
    };
    window.addEventListener('upbase-sidebar-subview', onSubView);
    return () => window.removeEventListener('upbase-sidebar-subview', onSubView);
  }, []);

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
        if (!Array.isArray(list)) return;
        const cleanList = list.filter(item => !isSyntheticBrandMonthlyPlanItem(item));
        const savedMap = new Map(cleanList.map(item => [item.id, item]));
        setBrandMonthlyPlans(prev => {
          if (prev.length === 0) return cleanList;
          return prev.map(item => savedMap.get(item.id) || item);
        });
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

  // Lọc cho Ma trận gian hàng (mặc định lọc gian B2C làm kế hoạch)
  const [storeGovernanceFilter, setStoreGovernanceFilter] = useState<
    | 'ALL'
    | 'NEEDS_ACTION'
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
  const [storeSearchInput, setStoreSearchInput] = useState<string>('');
  const [storeSearchQuery, setStoreSearchQuery] = useState<string>('');
  const [governancePage, setGovernancePage] = useState<number>(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStoreSearchQuery(storeSearchInput);
      setGovernancePage(1);
    }, 200);
    return () => clearTimeout(timer);
  }, [storeSearchInput]);
  const [governanceRouteFilter, setGovernanceRouteFilter] = useState<'ALL' | 'WITH_LEADER' | 'DIRECT_HEAD'>('ALL');
  const [governancePlatformFilter, setGovernancePlatformFilter] = useState<'ALL' | 'TikTok Shop' | 'Shopee Mall'>('ALL');
  const [governancePicFilter, setGovernancePicFilter] = useState<string>('ALL');
  const GOVERNANCE_PAGE_SIZE = 15;
  const [isGovernanceOverviewModalOpen, setIsGovernanceOverviewModalOpen] = useState<boolean>(false);
  const [revisionTarget, setRevisionTarget] = useState<{ planId: string; storeName: string } | null>(null);
  const [inspectingStoreId, setInspectingStoreId] = useState<string | null>(null);
  const [auditNoteDraft, setAuditNoteDraft] = useState<string>('');

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
        const sNameLower = (store.storeName || '').toLowerCase();
        const bNameLower = (store.brandName || '').toLowerCase();
        const pOwnerLower = (store.b2cOwners?.[0] || store.b2cOwnerName || store.primaryPic || plan?.pic || '').toLowerCase();
        const pPlatformLower = (store.platform || '').toLowerCase();
        const searchKey = `${sNameLower} ${bNameLower} ${pOwnerLower} ${pPlatformLower}`;
        return {
          store,
          isB2c: true,
          plan,
          hasPlan: true,
          status: (plan.status || 'DRAFT') as MonthlyPlanStatus,
          breakdown: getB2cPlanBreakdown(plan, store),
          workstreamSummary: getStorePlanWorkstreamSummary(plan),
          validity: evaluatePlanValiditySummary(plan),
          searchKey,
        };
      });
    }

    const lookupPlan = buildPlanLookupMap(scopedPlans, selectedMonth);
    return activeStores.map((store: StorePortfolioItem) => {
      const isB2c = store.isB2cManaged !== false && store.requiresB2cPlan !== false;
      const plan = lookupPlan(store);
      const sNameLower = (store.storeName || '').toLowerCase();
      const bNameLower = (store.brandName || '').toLowerCase();
      const pOwnerLower = (store.b2cOwners?.[0] || store.b2cOwnerName || store.primaryPic || plan?.pic || '').toLowerCase();
      const pPlatformLower = (store.platform || '').toLowerCase();
      const searchKey = `${sNameLower} ${bNameLower} ${pOwnerLower} ${pPlatformLower}`;
      return {
        store,
        isB2c,
        plan,
        hasPlan: !!plan,
        status: (plan?.status || 'MISSING') as MonthlyPlanStatus | 'MISSING',
        breakdown: getB2cPlanBreakdown(plan, store),
        workstreamSummary: getStorePlanWorkstreamSummary(plan),
        validity: evaluatePlanValiditySummary(plan),
        searchKey,
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

  // Bộ chỉ số quản trị duyệt kế hoạch & tổng hợp 4 đầu việc B2C theo tháng (Single-pass O(N))
  const governanceStats = useMemo(() => {
    const totalActive = activeStores.length;
    let totalB2cManaged = 0;
    let totalExempt = 0;
    let countWithLeader = 0;
    let countDirectHead = 0;
    let countWithPlan = 0;
    let countMissingPlan = 0;
    let countConfirmed41 = 0;
    let countPending41Diff = 0;
    let countUnconfirmed41 = 0;
    let countHasWeekly411 = 0;
    const emptyWeekly411List: StoreGovernanceItem[] = [];
    let countValidMatched = 0;
    let countValidWithNote = 0;
    let countValidTotal = 0;
    let countInvalid411 = 0;
    let countUnexplainedMismatch = 0;
    let countHasErrors = 0;
    let countPriceWarnings = 0;
    let countApproved = 0;
    let countPendingApproval = 0;
    let countPendingPreApproval = 0;
    let countRevisionRequested = 0;
    let countDraft = 0;
    let countMultiVersion = 0;
    const readyToBatchApproveList: StoreGovernanceItem[] = [];

    // Tổng hợp thông số 4 đầu việc B2C
    let totalBudget = 0;
    let totalVideos = 0;
    let affPaidQty = 0;
    let affPaidBudget = 0;
    let focQty = 0;
    let selfQty = 0;
    let selfBudget = 0;
    let otherQty = 0;
    let otherBudget = 0;

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

    for (let i = 0; i < storeGovernanceList.length; i++) {
      const item = storeGovernanceList[i];
      if (!item.isB2c) {
        totalExempt++;
        continue;
      }

      totalB2cManaged++;

      const hasLeader = Boolean(item.plan?.hasBookingLeader ?? item.store.hasBookingLeader);
      if (hasLeader) {
        countWithLeader++;
      } else {
        countDirectHead++;
      }

      if (item.hasPlan) {
        countWithPlan++;
        if (item.validity.is41Confirmed && !item.validity.hasPending41Diff) {
          countConfirmed41++;
        }
        if (item.validity.hasWeeklyBreakdown) {
          countHasWeekly411++;
        } else {
          emptyWeekly411List.push(item);
        }
        if (!item.validity.isValidForSubmit) {
          countInvalid411++;
        }
      } else {
        countMissingPlan++;
      }

      if (item.plan?.pendingReference41) {
        countPending41Diff++;
      }
      if (item.plan?.reference41?.isGrowthLocked === false) {
        countUnconfirmed41++;
      }

      if (item.validity.state === 'VALID_MATCHED') countValidMatched++;
      if (item.validity.state === 'VALID_WITH_NOTE') countValidWithNote++;
      if (item.validity.isValidForSubmit) countValidTotal++;
      if (item.validity.state === 'UNEXPLAINED_MISMATCH') countUnexplainedMismatch++;
      if (item.validity.state === 'HAS_ERRORS') countHasErrors++;
      if (item.validity.priceWarningCount > 0) countPriceWarnings++;

      const planStatus = item.plan?.status || '';
      const isApproved = Boolean(
        item.plan && ['LEAD_APPROVED', 'BRAND_APPROVED', 'APPROVED', 'IN_EXECUTION', 'COMPLETED'].includes(planStatus)
      );
      if (isApproved) countApproved++;
      if (item.plan && planStatus === 'PENDING_APPROVAL') countPendingApproval++;
      if (item.plan && (planStatus === 'PENDING_PRE_APPROVAL' || planStatus === 'PRE_APPROVED')) countPendingPreApproval++;
      if (item.plan && planStatus === 'REVISION_REQUESTED') countRevisionRequested++;
      if (item.plan && (planStatus === 'DRAFT' || !planStatus)) countDraft++;
      if (item.plan && getPlanVersionSnapshots(item.plan).length > 1) countMultiVersion++;
      if (
        item.plan &&
        item.validity.isValidForSubmit &&
        ['PENDING_APPROVAL', 'PRE_APPROVED', 'PENDING_PRE_APPROVAL'].includes(planStatus)
      ) {
        readyToBatchApproveList.push(item);
      }

      const picName = item.store.b2cOwners?.[0] || item.store.b2cOwnerName || item.plan?.pic || 'Chưa phân công';
      let entry = picMap.get(picName);
      if (!entry) {
        entry = {
          picName,
          totalStores: 0,
          approvedCount: 0,
          validCount: 0,
          emptyWeeklyCount: 0,
          invalidCount: 0,
          missingCount: 0,
          bottleneckCount: 0,
        };
        picMap.set(picName, entry);
      }
      entry.totalStores += 1;
      if (isApproved) entry.approvedCount += 1;
      if (item.validity.isValidForSubmit) entry.validCount += 1;
      if (!item.hasPlan) entry.missingCount += 1;
      else if (!item.validity.hasWeeklyBreakdown) entry.emptyWeeklyCount += 1;
      else if (!item.validity.isValidForSubmit) entry.invalidCount += 1;

      if (!item.hasPlan || !item.validity.isValidForSubmit || item.plan?.status === 'REVISION_REQUESTED') {
        entry.bottleneckCount += 1;
      }

      totalBudget += item.breakdown.totalBudget;
      totalVideos += item.breakdown.totalVideos;
      affPaidQty += item.breakdown.affPaidQty;
      affPaidBudget += item.breakdown.affPaidBudget;
      focQty += item.breakdown.focQty;
      selfQty += item.breakdown.selfQty;
      selfBudget += item.breakdown.selfBudget;
      otherQty += item.breakdown.otherQty;
      otherBudget += item.breakdown.otherBudget;
    }

    const picBottleneckSummary = Array.from(picMap.values()).sort(
      (a, b) => b.bottleneckCount - a.bottleneckCount || b.totalStores - a.totalStores
    );

    const weekly411Pct = totalB2cManaged > 0 ? Math.round((countHasWeekly411 / totalB2cManaged) * 100) : 0;
    const validPct = countWithPlan > 0 ? Math.round((countValidTotal / countWithPlan) * 100) : 0;
    const coveragePct = totalB2cManaged > 0 ? Math.round((countWithPlan / totalB2cManaged) * 100) : 0;
    const approvedPct = totalB2cManaged > 0 ? Math.round((countApproved / totalB2cManaged) * 100) : 0;

    return {
      totalActive,
      totalB2cManaged,
      totalExempt,
      countWithLeader,
      countDirectHead,
      countWithPlan,
      countMissingPlan,
      countConfirmed41,
      countPending41Diff,
      countUnconfirmed41,
      countHasWeekly411,
      countEmptyWeekly411: emptyWeekly411List.length,
      emptyWeekly411List,
      weekly411Pct,
      countValidMatched,
      countValidWithNote,
      countValidTotal,
      countInvalid411,
      countUnexplainedMismatch,
      countHasErrors,
      countPriceWarnings,
      validPct,
      countApproved,
      countPendingApproval,
      countPendingPreApproval,
      countRevisionRequested,
      countDraft,
      countMultiVersion,
      countReadyToBatchApprove: readyToBatchApproveList.length,
      countNeedsAction: storeGovernanceList.filter(isNeedsAction).length,
      readyToBatchApproveList,
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
      if (storeGovernanceFilter === 'NEEDS_ACTION' && !isNeedsAction(item)) return false;
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
        const q = storeSearchQuery.trim().toLowerCase();
        if (item.searchKey) {
          if (!item.searchKey.includes(q)) return false;
        } else {
          const sName = (item.store.storeName || '').toLowerCase();
          const bName = (item.store.brandName || '').toLowerCase();
          const pOwner = (item.store.b2cOwnerName || '').toLowerCase();
          const pPlatform = (item.store.platform || '').toLowerCase();
          if (!sName.includes(q) && !bName.includes(q) && !pOwner.includes(q) && !pPlatform.includes(q)) return false;
        }
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

  // Duyệt chốt: cùng một đường với Studio (lib/planApproval.ts): khóa phiên bản, chụp bản lưu, chữ ký đủ các bên.
  // Chưa đủ các bên thì không duyệt, chỉ báo đang chờ bên nào.
  const approvePlanFinal = (plan: InputPlanBreakdownState, storeName: string, silent = false): boolean => {
    const gate = canFinalApprovePlan(plan);
    if (!gate.ok) {
      if (!silent) notify(`${storeName}: ${gate.reason}`);
      return false;
    }
    if (!onUpdatePlanStatus) return false;
    const { patch, log } = buildFinalApproval({ plan, author: currentUser?.name || 'Giám đốc MKT' });
    onUpdatePlanStatus(plan.id, 'IN_EXECUTION', log, undefined, patch);
    return true;
  };

  // Các kế hoạch hợp lệ 4.1 vs 4.1.1 và đủ các bên để duyệt hàng loạt.
  const batchApprovableList = useMemo(
    () => governanceStats.readyToBatchApproveList.filter((i) => i.plan && canFinalApprovePlan(i.plan).ok),
    [governanceStats]
  );

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

  // RULE-PERF-01: Index O(1) tra cứu gian hàng theo id hoặc normStoreSlug
  const effectiveStoreByIdOrSlugMap = useMemo(() => {
    const map = new Map<string, StorePortfolioItem>();
    for (const s of effectiveStores) {
      if (s.id) map.set(s.id, s);
      if (s.storeName) map.set(`slug:${normStoreSlug(s.storeName)}`, s);
    }
    return map;
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
      items: [],
      discussions: []
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
    return (
      <BrandMonthlyPlanEditorView
        editingBrandPlan={editingBrandPlan}
        setEditingBrandPlan={setEditingBrandPlan}
        brandStoreRollupMap={brandStoreRollupMap}
        selectedMonth={selectedMonth}
        monthScopedBrandMonthlyPlans={monthScopedBrandMonthlyPlans}
        persistBrandMonthlyPlan={persistBrandMonthlyPlan}
        syncBadge={syncBadge}
        handleApproveBrandPlan={handleApproveBrandPlan}
        handleSaveBrandPlan={handleSaveBrandPlan}
        onSelectPlan={onSelectPlan}
        brandModalTab={brandModalTab}
        setBrandModalTab={setBrandModalTab}
        plans={plans}
        storePortfolios={storePortfolios}
        effectiveCampaigns={effectiveCampaigns}
        currentUser={currentUser}
        onNotify={onNotify}
        brandPositionStaffList={brandPositionStaffList}
        posKvFileInputRef={posKvFileInputRef}
        handleUploadPosKvFiles={handleUploadPosKvFiles}
        posKvUploadCategory={posKvUploadCategory}
        setPosKvUploadCategory={setPosKvUploadCategory}
        uploadingPosKv={uploadingPosKv}
        previewPosKvImg={previewPosKvImg}
        setPreviewPosKvImg={setPreviewPosKvImg}
      />
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
            {
              label: 'Tiến độ & Kiểm định 4 chặng',
              icon: Target,
              onSelect: () => {
                if (onOpenGovernanceDashboard) onOpenGovernanceDashboard();
                else setIsGovernanceOverviewModalOpen(true);
              },
            },
            ...(onOpenPlanReport
              ? [{ label: 'Báo cáo thẩm định kế hoạch', icon: FileText, onSelect: onOpenPlanReport }]
              : []),
          ]}
        />
        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={handleOpenCreateModal}
        >
          Tạo kế hoạch
        </Button>
      </PageActions>

      <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex items-center gap-2 text-xs text-ink-2">
          <span className="font-medium">Kỳ kế hoạch:</span>
          <PeriodPicker
            value={selectedMonth === 'ALL' ? '' : selectedMonth}
            onChange={(v) => {
              setSelectedMonth(v || 'ALL');
              setGovernancePage(1);
            }}
            options={planMonths.map((m) => ({ value: m, hint: String(scopedPlans.filter((p) => p.month === m).length) }))}
            allLabel="Tất cả tháng"
            label="Chọn tháng kế hoạch"
          />
        </div>
      </div>

      {activeHubTab === 'STORE_GOVERNANCE' ? (
        /* ========================================================================= */
        /* TAB 1: MA TRẬN QUẢN TRỊ GIAN HÀNG VÀ TRẠNG THÁI GỬI DUYỆT PLAN            */
        /* ========================================================================= */
        <div className="space-y-4">
          {/* 4 ô chỉ số của kỳ đang chọn. Tiến độ lập/chia/duyệt đã nằm trong số đếm của các chip bên dưới */}
          <StatRow size="sm">
            <Stat
              label="Tổng hạn mức Net B2C"
              value={formatVndShort(governanceStats.totalBudget)}
              note={`${formatNumber(governanceStats.totalVideos)} video`}
            />
            <Stat
              label="KOC trả phí"
              value={`${formatNumber(governanceStats.affPaidQty)} video`}
              note={`KL1–KL7 · ${formatVndShort(governanceStats.affPaidBudget)}`}
            />
            <Stat label="FOC (0đ)" value={`${formatNumber(governanceStats.focQty)} video`} note="Gửi mẫu, không cast" />
            <Stat
              label="Kênh Brand & Đa sàn"
              value={`${formatNumber(governanceStats.selfQty + governanceStats.otherQty)} video`}
              note={`Brand ${formatNumber(governanceStats.selfQty)} · Đa sàn ${formatNumber(governanceStats.otherQty)} · ${formatVndShort(governanceStats.selfBudget + governanceStats.otherBudget)}`}
            />
          </StatRow>

          {/* BẢNG MA TRẬN GIAN HÀNG & PHÂN RÃ 4 ĐẦU VIỆC */}
          <Panel flush>
            <div className="p-3 border-b border-line space-y-3">
              <FilterBar
                search={{
                  value: storeSearchInput,
                  onChange: (v) => {
                    setStoreSearchInput(v);
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
                      <option value="WITH_LEADER">Qua Trưởng nhóm ({governanceStats.countWithLeader} gian)</option>
                      <option value="DIRECT_HEAD">Trình trực tiếp ({governanceStats.countDirectHead} gian)</option>
                    </Select>

                    <Select
                      value={governancePlatformFilter}
                      onChange={(e) => {
                        setGovernancePlatformFilter(e.target.value as 'ALL' | 'TikTok Shop' | 'Shopee Mall');
                        setGovernancePage(1);
                      }}
                      aria-label="Lọc theo sàn"
                    >
                      <option value="ALL">Tất cả sàn</option>
                      <option value="TikTok Shop">TikTok</option>
                      <option value="Shopee Mall">Shopee</option>
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
                    {(storeGovernanceFilter !== 'B2C_ONLY' ||
                      governanceRouteFilter !== 'ALL' ||
                      governancePlatformFilter !== 'ALL' ||
                      governancePicFilter !== 'ALL') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setStoreGovernanceFilter('B2C_ONLY');
                          setGovernanceRouteFilter('ALL');
                          setGovernancePlatformFilter('ALL');
                          setGovernancePicFilter('ALL');
                          setGovernancePage(1);
                        }}
                      >
                        Đặt lại bộ lọc
                      </Button>
                    )}
                  </>
                }
                resultCount={filteredStoreGovernance.length}
              />

              <Chips
                items={[
                  { key: 'B2C_ONLY', label: 'Tất cả', count: governanceStats.totalB2cManaged },
                  { key: 'NEEDS_ACTION', label: 'Cần xử lý', count: governanceStats.countNeedsAction },
                  { key: 'VALID_MATCHED', label: 'Khớp 4.1', count: governanceStats.countValidTotal },
                  { key: 'PENDING_APPROVAL', label: 'Chờ duyệt', count: governanceStats.countPendingApproval + governanceStats.countPendingPreApproval },
                  { key: 'APPROVED', label: 'Đã duyệt', count: governanceStats.countApproved },
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-ink text-xs truncate" title={store.storeName}>{store.storeName}</span>
                            {plan && (
                              <span className="text-2xs font-mono px-2 py-0.5 rounded bg-sunken text-ink-2">
                                {activeVersionCode}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-2xs text-ink-3 flex-wrap">
                            <ChannelTag channel={store.platform} className="text-2xs px-1 py-0" />
                            <span>{store.brandName}</span>
                            <span>·</span>
                            <span>PIC: <strong className="text-ink-2">{store.b2cOwners?.[0] || store.b2cOwnerName || 'Chưa gán'}</strong></span>
                            <span>·</span>
                            <span>{hasLeader ? 'Qua Trưởng nhóm' : 'Trực tiếp'}</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <RowStatus item={item} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-2xs tabular-nums">
                        <div className="rounded-lg bg-sunken/50 border border-line px-3 py-2 flex flex-col gap-0.5">
                          <span className="text-ink-3">Ngân sách Net</span>
                          <strong className="text-ink font-semibold">{formatVndShort(bd.totalBudget)} ({bd.totalVideos} vid)</strong>
                        </div>
                        <div className="rounded-lg bg-surface border border-line px-3 py-2 flex flex-col gap-0.5">
                          <span className="text-ink-3">KOC trả phí</span>
                          <strong className="text-ink font-semibold">{bd.affPaidQty} vid · {formatVndShort(bd.affPaidBudget)}</strong>
                        </div>
                        <div className="rounded-lg bg-surface border border-line px-3 py-2 flex flex-col gap-0.5">
                          <span className="text-ink-3">Mẫu FOC (0đ)</span>
                          <strong className="text-positive font-semibold">{bd.focQty} mẫu</strong>
                        </div>
                        <div className="rounded-lg bg-surface border border-line px-3 py-2 flex flex-col gap-0.5">
                          <span className="text-ink-3">Brand / Đa sàn</span>
                          <strong className="text-ink font-semibold">{bd.selfQty + bd.otherQty} vid · {formatVndShort(bd.selfBudget + bd.otherBudget)}</strong>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-0.5 flex-wrap">
                        {plan ? (
                          <>
                            {onOpenListingForPlan && (bd.affPaidQty > 0 || bd.focQty > 0) && (
                              <button
                                type="button"
                                onClick={() => onOpenListingForPlan(plan)}
                                className="h-7 px-3 rounded-lg bg-accent-soft text-accent-hover border border-accent/30 text-2xs font-semibold cursor-pointer"
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
                    <th className="py-3 px-3 w-[22%]">Gian hàng</th>
                    <th className="py-3 px-3 w-[13%]">Phụ trách</th>
                    <th className="py-3 px-2 text-right w-[11%]">Ngân sách Net</th>
                    <th className="py-3 px-2 text-right w-[15%]">KOC trả phí</th>
                    <th className="py-3 px-2 text-right w-[9%]">FOC (0đ)</th>
                    <th className="py-3 px-2 text-right w-[15%]">Kênh Brand &amp; Đa sàn</th>
                    <th className="py-3 px-3 text-right w-[15%]">Trạng thái</th>
                  </tr>
                </thead>
                <tbody ref={governanceBodyRef} className="divide-y divide-line">
                  {filteredStoreGovernance.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-ink-3">
                        <StoreIcon className="w-8 h-8 mx-auto mb-2 text-line-strong" />
                        <p className="font-medium text-ink">Không tìm thấy gian hàng phù hợp</p>
                        <p className="text-2xs text-ink-3 mt-0.5">Thử chọn bộ lọc khác hoặc nhập từ khóa tìm kiếm</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedStoreGovernance.map((item: StoreGovernanceItem) => {
                      const brandLower = (item.store.brandName || '').toLowerCase().trim();
                      const isCampaignActive = Boolean(item.plan?.hasCampaign ?? (brandLower && activeCampaignBrandNames.has(brandLower)));
                      return (
                        <StoreGovernanceTableRow
                          key={item.store.id}
                          item={item}
                          isCampaignActive={isCampaignActive}
                          onSelectPlan={onSelectPlan}
                          openVersionModal={openVersionModal}
                          currentUser={currentUser}
                          onUpdatePlan={onUpdatePlan}
                          onOpenListingForPlan={onOpenListingForPlan}
                          handleCreatePlanForStore={handleCreatePlanForStore}
                          onInspect={setInspectingStoreId}
                          notify={notify}
                        />
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
        /* TAB: KẾ HOẠCH THÁNG THEO BRAND (3 VỊ TRÍ GẮN THEO BRAND)                 */
        /* ========================================================================= */
        <div key="brand-monthly-plans-root-view" className="space-y-4">
          {/* 1. KHỐI THỐNG KÊ NHANH (KPI STRIP) CẤP BRAND */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-surface border border-line rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-2xs text-ink-3">Thương hiệu B2C</div>
                <div className="text-lg font-semibold text-ink leading-tight tabular-nums">
                  {brandPlanKpis.total} nhãn hàng
                </div>
              </div>
            </div>

            <div className="bg-surface border border-line rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-positive-soft text-positive flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-2xs text-ink-3">Ngân sách Brand ({selectedMonth})</div>
                <div className="text-lg font-semibold text-ink leading-tight tabular-nums">
                  {formatVndShort(brandPlanKpis.totalBudget)}
                </div>
              </div>
            </div>

            <div className="bg-surface border border-line rounded-xl p-4 flex items-center gap-3">
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

            <div className="bg-surface border border-line rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning-soft text-warning flex items-center justify-center shrink-0">
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
              <div className="flex items-center gap-2 flex-wrap">
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
                        'px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer border',
                        active
                          ? 'bg-primary text-white border-primary shadow-2xs font-semibold'
                          : 'bg-surface border-line text-ink-2 hover:bg-sunken hover:text-ink'
                      )}
                    >
                      <span>{pos.label}</span>
                      {pos.badge !== undefined && (
                        <span className={cx('ml-2 text-2xs tabular-nums', active ? 'text-white/80' : 'text-ink-3')}>
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
                    'inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer',
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
                    'inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer',
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
                      <th className="py-3 px-3 w-[22%] sticky left-0 z-10 bg-sunken/95">Thương hiệu &amp; Gian hàng</th>
                      <th className="py-3 px-3 w-[15%] text-right">Tổng hợp từ Gian</th>
                      <th className="py-3 px-3 w-[17%]">Content / Brand main</th>
                      <th className="py-3 px-3 w-[18%]">Plan / Strategy</th>
                      <th className="py-3 px-3 w-[16%]">Key Visual / SIS</th>
                      <th className="py-3 px-3 w-[12%] text-right">Trạng thái &amp; Plan</th>
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
                            <td className="py-3 px-3 align-middle sticky left-0 z-10 bg-surface group-hover:bg-canvas transition-colors">
                              <div className="flex items-center gap-3 min-w-0">
                                <BrandAvatar brandName={bp.brandName} code={bp.brandCode} size={32} rounded="md" />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-semibold text-ink text-xs group-hover:text-accent transition-colors truncate" title={bp.brandName}>
                                      {bp.brandName}
                                    </span>
                                    {bp.hasCampaign ? (
                                      <span
                                        className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold bg-accent-soft text-accent-hover border border-accent/30 shrink-0"
                                        title={bp.campaignTitle || 'Có Chiến dịch'}
                                      >
                                        {bp.campaignCode || 'Campaign'}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-medium bg-sunken text-ink-3 shrink-0">
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
                                          const st = (sp.storeId && effectiveStoreByIdOrSlugMap.get(sp.storeId)) || (sp.storeName ? effectiveStoreByIdOrSlugMap.get(`slug:${normStoreSlug(sp.storeName)}`) : undefined);
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
                            <td className="py-3 px-3 align-middle text-right tabular-nums">
                              <div className="font-semibold text-ink text-xs">
                                {budget > 0 ? formatVndShort(budget) : <span className="text-ink-3 font-normal">Chưa cấp</span>}
                              </div>
                              <div className="text-2xs text-ink-3 mt-0.5 truncate">
                                GMV: <span className="font-medium text-ink-2">{targetGmv > 0 ? formatVndShort(targetGmv) : '—'}</span>
                                {totalVideos > 0 && <span> · {totalVideos} vid</span>}
                              </div>
                            </td>

                            {/* Cột 3: 1. Content / Brand main */}
                            <td className="py-3 px-3 align-middle">
                              <div className="flex items-center gap-2 min-w-0">
                                <Avatar name={bp.contentBrandMainPic} size={18} />
                                <span className="font-medium text-ink text-xs truncate">{bp.contentBrandMainPic}</span>
                              </div>
                              <div className="text-2xs text-ink-3 mt-0.5 truncate" title={contentP.focusPillars}>
                                <span className="font-medium text-ink-2">{contentP.contentPillarsCount} Pillar · {contentP.heroScriptsTarget} kịch bản</span>
                              </div>
                            </td>

                            {/* Cột 4: 2. Plan / Strategy */}
                            <td className="py-3 px-3 align-middle">
                              <div className="flex items-center gap-2 min-w-0">
                                <Avatar name={bp.planStrategyPic} size={18} />
                                <span className="font-medium text-ink text-xs truncate">{bp.planStrategyPic}</span>
                              </div>
                              <div className="text-2xs text-ink-3 mt-0.5 truncate" title={strategyP.bigIdeaAndKeyMessage}>
                                {strategyP.bigIdeaAndKeyMessage}
                              </div>
                            </td>

                            {/* Cột 5: 3. Key Visual / SIS */}
                            <td className="py-3 px-3 align-middle">
                              <div className="flex items-center gap-2 min-w-0">
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
                            <td className="py-3 px-3 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                              <div className="flex flex-col items-end gap-1">
                                {getStatusBadge(bp.status)}
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => {
                                    setBrandModalTab('ONE_SHEET');
                                    setEditingBrandPlan(bp);
                                  }}
                                  className="h-6 px-3 text-2xs font-medium"
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
                            <div className="flex items-center gap-3 min-w-0">
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
                            <div className="flex items-center gap-2 min-w-0">
                              {bp.hasCampaign ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-accent-hover truncate" title={bp.campaignTitle}>
                                  <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
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
                                <span className="text-ink-3 ml-2">· GMV {formatVndShort(targetGmv)}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 text-2xs">
                          <div className="p-2 rounded-lg border border-line/60 bg-surface space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-ink-3 font-medium">1. Content / Brand main</span>
                              <span className="text-2xs text-ink-2 font-medium">
                                {contentP.contentPillarsCount} Pillar · {contentP.heroScriptsTarget} kịch bản
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-ink">
                              <Avatar name={bp.contentBrandMainPic} size={16} />
                              <span className="font-semibold truncate">{bp.contentBrandMainPic}</span>
                            </div>
                            <div className="text-2xs text-ink-3 line-clamp-1" title={contentP.focusPillars}>
                              {contentP.focusPillars}
                            </div>
                          </div>

                          <div className="p-2 rounded-lg border border-line/60 bg-surface space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-ink-3 font-medium">2. Plan / Strategy</span>
                              <span className="text-2xs text-ink-2 font-medium">
                                {strategyP.campaignStrategyCount} Strategy · {strategyP.brandAuditCount} Audit
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-ink">
                              <Avatar name={bp.planStrategyPic} size={16} />
                              <span className="font-semibold truncate">{bp.planStrategyPic}</span>
                            </div>
                            <div className="text-2xs text-ink-3 line-clamp-1" title={strategyP.bigIdeaAndKeyMessage}>
                              {strategyP.bigIdeaAndKeyMessage}
                            </div>
                          </div>

                          <div className="p-2 rounded-lg border border-line/60 bg-surface space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-ink-3 font-medium">3. Key Visual / SIS</span>
                              <span className="text-2xs text-ink-2 font-medium">
                                {kvP.kvDirectionCount} KV · {kvP.sisBannerPackageCount} SIS · {kvP.pdpSeoProductCount} PDP
                                {((bp.oneSheetPlanData?.keyVisual?.kvImages ?? kvP.kvImages ?? []).length > 0) && (
                                  <span className="text-accent font-semibold">
                                    {' '}· {(bp.oneSheetPlanData?.keyVisual?.kvImages ?? kvP.kvImages ?? []).length} ảnh
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-ink">
                              <Avatar name={bp.keyVisualSisPic} size={16} />
                              <span className="font-semibold truncate">{bp.keyVisualSisPic}</span>
                            </div>
                            <div className="text-2xs text-ink-3 line-clamp-1" title={kvP.designTheme}>
                              {kvP.designTheme}
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-line flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            {(rollup?.storePlans || []).map(sp => {
                              const st = (sp.storeId && effectiveStoreByIdOrSlugMap.get(sp.storeId)) || (sp.storeName ? effectiveStoreByIdOrSlugMap.get(`slug:${normStoreSlug(sp.storeName)}`) : undefined);
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
      )}

      <PlanCreateEditModal
        isCreateModalOpen={isCreateModalOpen}
        setIsCreateModalOpen={setIsCreateModalOpen}
        handleCreateSubmit={handleCreateSubmit}
        newPlanMonth={newPlanMonth}
        handleMonthChange={handleMonthChange}
        newPlanWeek={newPlanWeek}
        setNewPlanWeek={setNewPlanWeek}
        availableWeeks={availableWeeks}
        newPlanBrand={newPlanBrand}
        handleBrandChange={handleBrandChange}
        availableBrands={availableBrands}
        newPlanStoreId={newPlanStoreId}
        handleStoreChange={handleStoreChange}
        brandStoresForNewPlan={brandStoresForNewPlan}
        newPlanPic={newPlanPic}
        setNewPlanPic={setNewPlanPic}
        availablePics={availablePics}
        newPlanTitle={newPlanTitle}
        setNewPlanTitle={setNewPlanTitle}
        newPlanStoreName={newPlanStoreName}
        newPlanBudget={newPlanBudget}
        setNewPlanBudget={setNewPlanBudget}
        newPlanQty={newPlanQty}
        setNewPlanQty={setNewPlanQty}
        newPlanGmv={newPlanGmv}
        setNewPlanGmv={setNewPlanGmv}
        newPlanPreset={newPlanPreset}
        setNewPlanPreset={setNewPlanPreset}
        newPlanNotes={newPlanNotes}
        setNewPlanNotes={setNewPlanNotes}
        cloningPlan={cloningPlan}
        setCloningPlan={setCloningPlan}
        cloneTargetMonth={cloneTargetMonth}
        setCloneTargetMonth={setCloneTargetMonth}
        handleCloneSubmit={handleCloneSubmit}
        viewingHistoryPlan={viewingHistoryPlan}
        historyModalTab={historyModalTab}
        currentUser={currentUser}
        setHistoryPlanId={setHistoryPlanId}
        onSendMessage={onSendMessage}
        onUpdatePlanStatus={onUpdatePlanStatus}
        onUpdatePlan={onUpdatePlan}
        onSelectPlan={onSelectPlan}
        notify={notify}
        revisionTarget={revisionTarget}
        setRevisionTarget={setRevisionTarget}
        setInspectingStoreId={setInspectingStoreId}
        onPlanOrderUploaded={onPlanOrderUploaded}
        isPlanOrderUploadOpen={isPlanOrderUploadOpen}
        setIsPlanOrderUploadOpen={setIsPlanOrderUploadOpen}
        onNotify={onNotify}
        isLarkbaseModalOpen={isLarkbaseModalOpen}
        setIsLarkbaseModalOpen={setIsLarkbaseModalOpen}
        isPullingLarkbase={isPullingLarkbase}
        handlePullApprovedFromLarkbase={handlePullApprovedFromLarkbase}
        hasLiveLarkCredentials={hasLiveLarkCredentials}
        larkbaseAppToken={larkbaseAppToken}
        setLarkbaseAppToken={setLarkbaseAppToken}
        larkbaseTableId={larkbaseTableId}
        setLarkbaseTableId={setLarkbaseTableId}
        larkbaseRecords={larkbaseRecords}
        isLoadingLarkbase={isLoadingLarkbase}
        selectedMonth={selectedMonth}
        larkbaseConvertedPlans={larkbaseConvertedPlans}
        onImportLarkbasePlans={onImportLarkbasePlans}
      />
      <PlanDiscussionDrawer
        inspectingStoreId={inspectingStoreId}
        setInspectingStoreId={setInspectingStoreId}
        storeGovernanceList={storeGovernanceList}
        currentUser={currentUser}
        onOpenListingForPlan={onOpenListingForPlan}
        onSelectPlan={onSelectPlan}
        onUpdatePlan={onUpdatePlan}
        onUpdatePlanStatus={onUpdatePlanStatus}
        setRevisionTarget={setRevisionTarget}
        approvePlanFinal={approvePlanFinal}
        notify={notify}
        auditNoteDraft={auditNoteDraft}
        setAuditNoteDraft={setAuditNoteDraft}
        isGovernanceOverviewModalOpen={isGovernanceOverviewModalOpen}
        setIsGovernanceOverviewModalOpen={setIsGovernanceOverviewModalOpen}
        selectedMonth={selectedMonth}
        governanceStats={governanceStats}
        batchApprovableList={batchApprovableList}
        onOpenPlanReport={onOpenPlanReport}
        storeGovernanceFilter={storeGovernanceFilter}
        setStoreGovernanceFilter={setStoreGovernanceFilter}
        setGovernancePage={setGovernancePage}
        brandPlanKpis={brandPlanKpis}
        setActiveHubTab={setActiveHubTab}
        allPersonalPackages={allPersonalPackages}
        governancePicFilter={governancePicFilter}
        setGovernancePicFilter={setGovernancePicFilter}
      />
    </div>
  );
};


