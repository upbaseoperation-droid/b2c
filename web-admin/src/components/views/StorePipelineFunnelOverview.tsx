'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Filter, CheckCircle2, Clock, AlertTriangle, Users, XCircle } from 'lucide-react';
import {
  StorePortfolioItem,
  BookingDealItem,
  KocItem,
  UserProfile,
  InputPlanBreakdownState,
} from '../../lib/types';
import { REAL_B2C_69_STORES } from '../../lib/realB2cPlanData';
import { filterScopedStores } from '../../lib/rbacScope';
import { REAL_MONTHLY_PLANS_OCT_2026 } from '../../lib/realLarkPlans202610';
import {
  evaluatePlanValiditySummary,
  type PlanValidityEvaluation,
} from '../../lib/planBreakdownRules';
import { fetchClientMonthlyPlans, getCachedClientMonthlyPlans } from '../../lib/useMonthlyPlanSync';
import { formatNumber, formatVndShort } from '../../lib/format';
import {
  BarList,
  Button,
  ChannelTag,
  DataTable,
  FilterBar,
  Modal,
  Panel,
  Person,
  Progress,
  Segmented,
  Select,
  Stat,
  StatRow,
  Status,
} from '../ui';
import type { Column, StatusTone } from '../ui';

type FinancialRiskStatus = 'NORMAL' | 'UNBUDGETED' | 'OVERBUDGET' | 'SLOW_BURN';

interface StorePipelineFunnelOverviewProps {
  currentUser?: UserProfile;
  storePortfolios?: StorePortfolioItem[];
  deals?: BookingDealItem[];
  kocs?: KocItem[];
  onNavigateToTab?: (tabKey: string, context?: Record<string, unknown>) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

interface StoreFunnelProgress {
  store: StorePortfolioItem;
  plan411: InputPlanBreakdownState | null;
  planValidity: PlanValidityEvaluation;
  plan411Status: 'NONE' | 'DRAFT' | 'PENDING' | 'APPROVED' | 'CHANGES';
  brandPlanStatus: 'NONE' | 'DRAFT' | 'PENDING' | 'APPROVED';
  listingCount: number;
  listingQuota: number;
  listingPct: number;
  dealCount: number;
  dealsWithHdntSigned: number;
  dealsWithSowSigned: number;
  targetVideos: number;
  airedVideos: number;
  acceptedVideos: number;
  paidVideos: number;
  spentNet: number;
  budgetNet: number;
  spendPct: number;
  financialRisk: FinancialRiskStatus;
  currentBottleneckStep: number;
  currentBottleneckLabel: string;
}

const normalize = (v: string) =>
  (v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();

// Các mốc quy trình theo thứ tự; mỗi gian dừng ở mốc đầu tiên chưa xong (currentBottleneckStep).
type FunnelStage = 'PIC' | 'PLAN' | 'BRAND' | 'LISTING' | 'CONTRACT' | 'AIR' | 'ACCEPT';
type StageKey = FunnelStage | 'BUDGET' | 'DONE';
type ProgressFilter = 'ALL' | 'BLOCKED' | 'DONE';

const FUNNEL_STAGES: { key: FunnelStage; label: string }[] = [
  { key: 'PIC', label: 'Phân công PIC' },
  { key: 'PLAN', label: 'Kế hoạch 4.1.1' },
  { key: 'BRAND', label: 'Plan Brand' },
  { key: 'LISTING', label: 'Listing KOC' },
  { key: 'CONTRACT', label: 'Hợp đồng & SOW' },
  { key: 'AIR', label: 'Air video' },
  { key: 'ACCEPT', label: 'Nghiệm thu & duyệt chi' },
];

const STAGE_META: Record<StageKey, { label: string; tone: StatusTone }> = {
  PIC: { label: 'Chưa phân công PIC', tone: 'critical' },
  PLAN: { label: 'Kế hoạch 4.1.1', tone: 'warning' },
  BRAND: { label: 'Plan Brand', tone: 'warning' },
  LISTING: { label: 'Listing KOC', tone: 'info' },
  CONTRACT: { label: 'Hợp đồng & SOW', tone: 'info' },
  AIR: { label: 'Air video', tone: 'info' },
  ACCEPT: { label: 'Nghiệm thu & duyệt chi', tone: 'info' },
  BUDGET: { label: 'Cảnh báo ngân sách', tone: 'critical' },
  DONE: { label: 'Hoàn tất', tone: 'positive' },
};

function stageOf(p: StoreFunnelProgress): StageKey {
  if (p.currentBottleneckLabel === 'Hoàn tất phễu') return 'DONE';
  const s = p.currentBottleneckStep;
  if (s === 0) return 'PIC';
  if (s <= 3) return 'PLAN';
  if (s === 4) return 'BRAND';
  if (s <= 9) return 'LISTING';
  if (s <= 11) return 'CONTRACT';
  if (s <= 14) return 'AIR';
  if (s <= 16) return 'ACCEPT';
  return 'BUDGET';
}

/** Số mốc quy trình đã xong (BUDGET/DONE = qua hết các mốc). */
const stageIndex = (k: StageKey) => {
  const i = FUNNEL_STAGES.findIndex((s) => s.key === k);
  return i === -1 ? FUNNEL_STAGES.length : i;
};

/** Nguyên nhân nghẽn: nhãn bước, bỏ tiền tố "Bước N:" và phần đếm trong ngoặc. */
const causeOf = (p: StoreFunnelProgress) =>
  p.currentBottleneckLabel.replace(/^Bước \d+:\s*/, '').replace(/\s*\([^)]*\)\s*$/, '');

const picOf = (p: StoreFunnelProgress) =>
  p.store.primaryPic || p.store.b2cOwners?.[0] || p.store.b2cOwnerName || 'Chưa phân công';

export const StorePipelineFunnelOverview: React.FC<StorePipelineFunnelOverviewProps> = ({
  currentUser,
  storePortfolios,
  deals = [],
  onNavigateToTab,
}) => {
  const stores = useMemo<StorePortfolioItem[]>(() => {
    const baseStores =
      storePortfolios && storePortfolios.length > 0 ? storePortfolios : REAL_B2C_69_STORES;
    return filterScopedStores(baseStores, currentUser);
  }, [storePortfolios, currentUser]);

  const totalTiktokCount = useMemo(
    () => stores.filter((s) => s.platform === 'TikTok Shop').length,
    [stores]
  );
  const totalShopeeCount = useMemo(
    () => stores.filter((s) => s.platform !== 'TikTok Shop').length,
    [stores]
  );
  const totalLeaderCount = useMemo(
    () => stores.filter((s) => s.hasBookingLeader).length,
    [stores]
  );
  const totalDirectCount = useMemo(
    () => stores.filter((s) => !s.hasBookingLeader).length,
    [stores]
  );

  // Tải danh sách kế hoạch 4.1.1 từ server (fallback dữ liệu gốc tháng 10/2026)
  const [plans, setPlans] = useState<InputPlanBreakdownState[]>(
    () => getCachedClientMonthlyPlans() || REAL_MONTHLY_PLANS_OCT_2026
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await fetchClientMonthlyPlans();
        if (cancelled) return;
        if (stored.length > 0) {
          setPlans(stored.map(p => p.plan));
        }
      } catch {
        /* Bỏ qua nếu lỗi mạng, hệ thống dùng fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Bộ lọc
  const [stageFilter, setStageFilter] = useState<StageKey | 'ALL'>('ALL');
  const [causeFilter, setCauseFilter] = useState<string>('ALL');
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'ALL' | 'TikTok Shop' | 'Shopee Mall'>('ALL');
  const [governanceFilter, setGovernanceFilter] = useState<'ALL' | 'WITH_LEADER' | 'DIRECT_HEAD'>('ALL');
  const [picFilter, setPicFilter] = useState<string>('ALL');

  // Modal chi tiết tiến trình phễu của 1 gian hàng
  const [selectedProgress, setSelectedProgress] = useState<StoreFunnelProgress | null>(null);

  // Chỉ mục O(1) cho Kế hoạch và Booking Deals theo gian hàng / thương hiệu (tránh quét 69 × 16.000 dòng)
  const plansLookup = useMemo(() => {
    const byStoreId = new Map<string, InputPlanBreakdownState>();
    const byStoreSlug = new Map<string, InputPlanBreakdownState>();
    for (const p of plans) {
      if (p.storeId && !byStoreId.has(p.storeId)) byStoreId.set(p.storeId, p);
      if (p.storeName) {
        const slug = normalize(p.storeName);
        if (slug && !byStoreSlug.has(slug)) byStoreSlug.set(slug, p);
      }
    }
    return { byStoreId, byStoreSlug };
  }, [plans]);

  const dealsLookup = useMemo(() => {
    const byStoreSlug = new Map<string, BookingDealItem[]>();
    const byBrandOnlySlug = new Map<string, BookingDealItem[]>();
    for (const d of deals) {
      const dStore = d.storeName ? normalize(d.storeName) : '';
      if (dStore) {
        let arr = byStoreSlug.get(dStore);
        if (!arr) {
          arr = [];
          byStoreSlug.set(dStore, arr);
        }
        arr.push(d);
      } else if (d.brandName) {
        const dBrand = normalize(d.brandName);
        if (dBrand) {
          let arr = byBrandOnlySlug.get(dBrand);
          if (!arr) {
            arr = [];
            byBrandOnlySlug.set(dBrand, arr);
          }
          arr.push(d);
        }
      }
    }
    return { byStoreSlug, byBrandOnlySlug };
  }, [deals]);

  // Tính toán tiến độ từng gian hàng
  const funnelProgressList = useMemo<StoreFunnelProgress[]>(() => {
    return stores.map((st) => {
      const storeSlug = normalize(st.storeName);
      const brandSlug = normalize(st.brandName);

      // 1. Tìm Kế hoạch 4.1.1 & thẩm định tính hợp lệ dùng chung nguồn (RULE-SYNC-01)
      const plan =
        (st.id ? plansLookup.byStoreId.get(st.id) : undefined) ||
        (storeSlug ? plansLookup.byStoreSlug.get(storeSlug) : undefined) ||
        null;
      const planValidity = evaluatePlanValiditySummary(plan);

      let plan411Status: StoreFunnelProgress['plan411Status'] = 'NONE';
      if (plan) {
        const pStatus = (plan.status as string) || '';
        if (pStatus === 'APPROVED' || pStatus === 'LEAD_APPROVED' || pStatus === 'BRAND_APPROVED') plan411Status = 'APPROVED';
        else if (pStatus.includes('PENDING') || pStatus === 'PRE_APPROVED') plan411Status = 'PENDING';
        else if (pStatus === 'CHANGES_REQUESTED' || pStatus === 'REVISION_REQUESTED') plan411Status = 'CHANGES';
        else plan411Status = 'DRAFT';
      }

      // 2. Trạng thái Plan Brand (nếu plan đã duyệt thì bước Brand Plan được đánh giá)
      let brandPlanStatus: StoreFunnelProgress['brandPlanStatus'] = 'NONE';
      if (plan411Status === 'APPROVED') {
        brandPlanStatus = 'APPROVED';
      } else if (plan411Status === 'PENDING') {
        brandPlanStatus = 'PENDING';
      } else if (plan411Status === 'DRAFT') {
        brandPlanStatus = 'DRAFT';
      }

      // 3. Tương quan Booking Deals (tra cứu O(1) qua chỉ mục)
      const byStore = storeSlug ? dealsLookup.byStoreSlug.get(storeSlug) : undefined;
      const byBrand = brandSlug ? dealsLookup.byBrandOnlySlug.get(brandSlug) : undefined;
      const storeDeals =
        byStore && byBrand ? [...byStore, ...byBrand] : byStore || byBrand || [];

      const rawDeal = (d: BookingDealItem) => d as unknown as Record<string, unknown>;
      const isDealHdntSigned = (d: BookingDealItem) => {
        const raw = rawDeal(d);
        return Boolean(d.contractCreatedAt || d.contractScanUrl || raw.contractSigned || d.pipelineText === 'Hợp đồng' || (d.status as string) === 'CONTRACT_SIGNED');
      };
      const isDealSowSigned = (d: BookingDealItem) => {
        const raw = rawDeal(d);
        return isDealHdntSigned(d) && Boolean(d.dealCode || d.productName || raw.sowSigned);
      };
      const isDealAired = (d: BookingDealItem) => {
        const raw = rawDeal(d);
        return Boolean(d.videoUrl || d.postedDate || raw.airDate || raw.airLink);
      };
      const isDealAccepted = (d: BookingDealItem) => {
        const raw = rawDeal(d);
        return isDealAired(d) && (d.adsCodeStatus === 'ĐÃ_NGHIỆM_THU' || d.pipelineText === 'Nghiệm thu' || raw.acceptanceStatus === 'ACCEPTED' || raw.acceptanceStatus === 'PASSED');
      };
      const isDealPaid = (d: BookingDealItem) => {
        const raw = rawDeal(d);
        return d.pipelineText === 'Đã thanh toán' || Boolean(d.billSentToKocDate) || raw.paymentStatus === 'PAID';
      };

      const dealCount = storeDeals.length;
      const dealsWithHdntSigned = storeDeals.filter(isDealHdntSigned).length;
      const dealsWithSowSigned = storeDeals.filter(isDealSowSigned).length;

      // 4. Sản lượng & Air Video
      const targetVideos = (st.targetPaidVideos || 0) + (st.targetSelfChannelContents || 0);
      const airedVideos = Math.max(st.actualAiredVideos || 0, storeDeals.filter(isDealAired).length);
      const acceptedVideos = storeDeals.filter(isDealAccepted).length;
      const paidVideos = storeDeals.filter(isDealPaid).length;

      // 5. Quota & Listing
      const listingQuota = Math.max(st.targetPaidVideos || 0, 1);
      const listingCount = Math.max(dealCount, st.actualAiredVideos || 0);
      const listingPct = Math.min(Math.round((listingCount / listingQuota) * 100), 100);

      // 6. Ngân sách & Tài chính
      const budgetNet = st.budgetNet || st.monthlyBudget || 0;
      const spentNet = st.actualSpentNet || 0;
      const spendPct = budgetNet > 0 ? Math.round((spentNet / budgetNet) * 100) : spentNet > 0 ? 999 : 0;
      const financialRisk = st.financialRiskStatus || 'NORMAL';

      // 7. Xác định bước nghẽn hiện tại (Bottleneck Step 0 → 18)
      let bottleneckStep = 0;
      let bottleneckLabel = 'Hoàn tất phễu';

      if (!st.primaryPic || st.primaryPic === 'Chưa phân công') {
        bottleneckStep = 0;
        bottleneckLabel = 'Bước 0: Chưa phân công PIC';
      } else if (!planValidity.hasWeeklyBreakdown) {
        bottleneckStep = 2;
        bottleneckLabel = `Bước 2: ${planValidity.badgeLabel}`;
      } else if (!planValidity.isValidForSubmit) {
        bottleneckStep = 2;
        bottleneckLabel = `Bước 2: ${planValidity.badgeLabel}`;
      } else if (plan411Status === 'NONE' || plan411Status === 'DRAFT' || plan411Status === 'CHANGES') {
        bottleneckStep = 2;
        bottleneckLabel = 'Bước 2: Nháp 4.1.1 (chưa gửi duyệt)';
      } else if (plan411Status === 'PENDING') {
        bottleneckStep = 3;
        bottleneckLabel = 'Bước 3: Chờ duyệt Plan 4.1.1';
      } else if (brandPlanStatus !== 'APPROVED') {
        bottleneckStep = 4;
        bottleneckLabel = 'Bước 4: Chờ chốt Plan Brand';
      } else if (listingPct < 100 && targetVideos > 0) {
        bottleneckStep = 9;
        bottleneckLabel = `Bước 9: Thiếu Listing (${listingCount}/${listingQuota})`;
      } else if (dealCount > 0 && dealsWithHdntSigned < dealCount) {
        bottleneckStep = 10;
        bottleneckLabel = `Bước 10: Chờ ký HĐNT (${dealsWithHdntSigned}/${dealCount})`;
      } else if (dealCount > 0 && dealsWithSowSigned < dealCount) {
        bottleneckStep = 11;
        bottleneckLabel = `Bước 11: Chờ ký Phụ lục SOW (${dealsWithSowSigned}/${dealCount})`;
      } else if (airedVideos < targetVideos && targetVideos > 0) {
        bottleneckStep = 14;
        bottleneckLabel = `Bước 14: Chờ Air Video (${airedVideos}/${targetVideos})`;
      } else if (airedVideos > 0 && acceptedVideos < airedVideos) {
        bottleneckStep = 15;
        bottleneckLabel = `Bước 15: Chờ nghiệm thu video (${acceptedVideos}/${airedVideos})`;
      } else if (acceptedVideos > 0 && paidVideos < acceptedVideos) {
        bottleneckStep = 16;
        bottleneckLabel = `Bước 16: Chờ duyệt chi thanh toán`;
      } else if (financialRisk === 'UNBUDGETED' || financialRisk === 'OVERBUDGET') {
        bottleneckStep = 18;
        bottleneckLabel = `Bước 18: Cảnh báo ngân sách`;
      }

      return {
        store: st,
        plan411: plan,
        planValidity,
        plan411Status,
        brandPlanStatus,
        listingCount,
        listingQuota,
        listingPct,
        dealCount,
        dealsWithHdntSigned,
        dealsWithSowSigned,
        targetVideos,
        airedVideos,
        acceptedVideos,
        paidVideos,
        spentNet,
        budgetNet,
        spendPct,
        financialRisk,
        currentBottleneckStep: bottleneckStep,
        currentBottleneckLabel: bottleneckLabel,
      };
    });
  }, [stores, dealsLookup, plansLookup]);

  // Bộ đếm phễu tổng hợp
  const metrics = useMemo(() => {
    const totalStores = funnelProgressList.length;
    const hasPlan411 = funnelProgressList.filter((p) => p.planValidity.hasWeeklyBreakdown).length;
    const validPlan411 = funnelProgressList.filter((p) => p.planValidity.isValidForSubmit).length;
    const invalidOrEmptyPlan411 = funnelProgressList.filter((p) => !p.planValidity.isValidForSubmit).length;
    const approvedPlan411 = funnelProgressList.filter((p) => p.plan411Status === 'APPROVED').length;
    const pendingPlan411 = funnelProgressList.filter((p) => p.plan411Status === 'PENDING').length;
    const missingPlan411 = funnelProgressList.filter(
      (p) => !p.planValidity.hasWeeklyBreakdown
    ).length;

    const approvedBrandPlan = funnelProgressList.filter((p) => p.brandPlanStatus === 'APPROVED').length;
    const pendingBrandPlan = funnelProgressList.filter((p) => p.brandPlanStatus === 'PENDING').length;

    const fullListingStores = funnelProgressList.filter((p) => p.listingPct >= 100).length;
    const incompleteListing = funnelProgressList.filter((p) => p.listingPct < 100 && p.targetVideos > 0).length;

    const totalDeals = funnelProgressList.reduce((s, p) => s + p.dealCount, 0);
    const totalHdntSigned = funnelProgressList.reduce((s, p) => s + p.dealsWithHdntSigned, 0);
    const totalSowSigned = funnelProgressList.reduce((s, p) => s + p.dealsWithSowSigned, 0);

    const totalAired = funnelProgressList.reduce((s, p) => s + p.airedVideos, 0);
    const totalAccepted = funnelProgressList.reduce((s, p) => s + p.acceptedVideos, 0);

    const alertStores = funnelProgressList.filter(
      (p) => p.financialRisk === 'UNBUDGETED' || p.financialRisk === 'OVERBUDGET'
    ).length;

    return {
      totalStores,
      hasPlan411,
      validPlan411,
      invalidOrEmptyPlan411,
      approvedPlan411,
      pendingPlan411,
      missingPlan411,
      approvedBrandPlan,
      pendingBrandPlan,
      fullListingStores,
      incompleteListing,
      totalDeals,
      totalHdntSigned,
      totalSowSigned,
      totalAired,
      totalAccepted,
      alertStores,
    };
  }, [funnelProgressList]);

  // Tổng hợp tiến độ & điểm nghẽn theo từng Chuyên viên PIC
  const picSummaryList = useMemo(() => {
    const byPic = new Map<
      string,
      {
        name: string;
        total: number;
        valid411: number;
        invalid411: number;
        approved: number;
      }
    >();
    for (const item of funnelProgressList) {
      const pic = item.store.primaryPic || item.store.b2cOwners?.[0] || item.store.b2cOwnerName || 'Chưa phân công';
      const cur = byPic.get(pic) || {
        name: pic,
        total: 0,
        valid411: 0,
        invalid411: 0,
        approved: 0,
      };
      cur.total += 1;
      if (item.planValidity.isValidForSubmit) cur.valid411 += 1;
      else cur.invalid411 += 1;
      if (item.plan411Status === 'APPROVED') cur.approved += 1;
      byPic.set(pic, cur);
    }
    return Array.from(byPic.values()).sort((a, b) => b.invalid411 - a.invalid411 || b.total - a.total);
  }, [funnelProgressList]);

  // Lọc danh sách hiển thị
  const filteredList = useMemo(() => {
    return funnelProgressList.filter((item) => {
      const stage = stageOf(item);
      // 1. Lọc theo mốc / nguyên nhân nghẽn / trạng thái
      if (stageFilter !== 'ALL' && stage !== stageFilter) return false;
      if (causeFilter !== 'ALL' && causeOf(item) !== causeFilter) return false;
      if (progressFilter === 'BLOCKED' && stage === 'DONE') return false;
      if (progressFilter === 'DONE' && stage !== 'DONE') return false;

      // 2. Lọc theo sàn
      if (platformFilter !== 'ALL' && item.store.platform !== platformFilter) return false;

      // 3. Lọc theo cơ cấu duyệt
      if (governanceFilter === 'WITH_LEADER' && !item.store.hasBookingLeader) return false;
      if (governanceFilter === 'DIRECT_HEAD' && item.store.hasBookingLeader) return false;

      // 3b. Lọc theo Chuyên viên PIC
      if (picFilter !== 'ALL' && picOf(item) !== picFilter) return false;

      // 4. Tìm kiếm từ khóa
      if (searchQuery.trim()) {
        const q = normalize(searchQuery);
        const nameMatch = normalize(item.store.storeName).includes(q);
        const brandMatch = normalize(item.store.brandName).includes(q);
        const picMatch = normalize(item.store.primaryPic || '').includes(q);
        const leaderMatch = normalize(item.store.bookingLeader || '').includes(q);
        if (!nameMatch && !brandMatch && !picMatch && !leaderMatch) return false;
      }

      return true;
    });
  }, [funnelProgressList, stageFilter, causeFilter, progressFilter, platformFilter, governanceFilter, picFilter, searchQuery]);

  // Phễu: số gian đã qua từng mốc (mốc nghẽn đầu tiên của gian nằm sau mốc đó)
  const funnelBars = useMemo(() => {
    const idx = funnelProgressList.map((p) => stageIndex(stageOf(p)));
    return FUNNEL_STAGES.map((s, i) => {
      const passed = idx.filter((k) => k > i).length;
      return { ...s, passed, stuck: idx.filter((k) => k === i).length };
    });
  }, [funnelProgressList]);

  // Điểm nghẽn: số gian theo từng nguyên nhân cụ thể
  const causeBars = useMemo(() => {
    const byCause = new Map<string, number>();
    for (const p of funnelProgressList) {
      if (stageOf(p) === 'DONE') continue;
      const c = causeOf(p);
      byCause.set(c, (byCause.get(c) || 0) + 1);
    }
    return Array.from(byCause.entries()).sort((a, b) => b[1] - a[1]);
  }, [funnelProgressList]);

  const doneCount = useMemo(() => funnelProgressList.filter((p) => stageOf(p) === 'DONE').length, [funnelProgressList]);
  const totalStages = FUNNEL_STAGES.length;
  const hasFilter =
    stageFilter !== 'ALL' ||
    causeFilter !== 'ALL' ||
    progressFilter !== 'ALL' ||
    platformFilter !== 'ALL' ||
    governanceFilter !== 'ALL' ||
    picFilter !== 'ALL' ||
    searchQuery.trim() !== '';

  const columns: Column<StoreFunnelProgress>[] = [
    {
      key: 'store',
      header: 'Gian hàng',
      render: (item) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate font-medium text-ink">{item.store.storeName}</span>
            <ChannelTag channel={item.store.platform} iconOnly />
          </div>
          <div className="text-2xs text-ink-3 truncate">{item.store.brandName}</div>
        </div>
      ),
    },
    {
      key: 'pic',
      header: 'Phụ trách',
      render: (item) => {
        const pic = item.store.primaryPic || item.store.assignedStaff;
        return pic ? (
          <Person
            name={pic}
            sub={item.store.hasBookingLeader && item.store.bookingLeader ? `Leader ${item.store.bookingLeader}` : 'Trình GĐ trực tiếp'}
          />
        ) : (
          <span className="text-ink-3">—</span>
        );
      },
    },
    {
      key: 'stage',
      header: 'Mốc hiện tại',
      render: (item) => {
        const stage = stageOf(item);
        const meta = STAGE_META[stage];
        return <Status tone={meta.tone}>{meta.label}</Status>;
      },
    },
    {
      key: 'progress',
      header: 'Tiến độ',
      width: 120,
      render: (item) => {
        const done = Math.min(stageIndex(stageOf(item)), totalStages);
        return (
          <div className="flex items-center gap-2">
            <Progress value={done} max={totalStages} className="w-16" label="Số mốc đã xong" />
            <span className="text-2xs tabular-nums text-ink-3">{done}/{totalStages}</span>
          </div>
        );
      },
    },
    {
      key: 'spend',
      header: 'Chi phí Net / hạn mức',
      align: 'right',
      width: 150,
      render: (item) => (
        <div className="space-y-1">
          <div className="tabular-nums text-ink">
            {formatVndShort(item.spentNet)}
            <span className="text-ink-3"> / {item.budgetNet > 0 ? formatVndShort(item.budgetNet) : '0 đ'}</span>
          </div>
          {item.budgetNet > 0 && <Progress value={item.spentNet} max={item.budgetNet} invert label="Đã chi so với hạn mức Net" />}
        </div>
      ),
    },
    {
      key: 'cause',
      header: 'Điểm nghẽn',
      render: (item) =>
        stageOf(item) === 'DONE' ? (
          <span className="text-ink-3">—</span>
        ) : (
          <span className="block max-w-[240px] truncate text-ink-2" title={item.currentBottleneckLabel}>
            {item.currentBottleneckLabel.replace(/^Bước \d+:\s*/, '')}
          </span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <StatRow size="sm">
        <Stat
          label="Kế hoạch 4.1.1 hợp lệ"
          value={`${metrics.validPlan411}/${metrics.totalStores}`}
          progress={{ value: metrics.validPlan411, max: Math.max(1, metrics.totalStores) }}
          note={`${metrics.approvedPlan411} đã duyệt · ${metrics.pendingPlan411} chờ duyệt · ${metrics.missingPlan411} chưa chia tuần`}
        />
        <Stat
          label="Gian đủ listing KOC"
          value={`${metrics.fullListingStores}/${metrics.totalStores}`}
          progress={{ value: metrics.fullListingStores, max: Math.max(1, metrics.totalStores) }}
          note={`${metrics.incompleteListing} gian còn thiếu`}
        />
        <Stat
          label="Deal đã ký SOW"
          value={`${formatNumber(metrics.totalSowSigned)}/${formatNumber(metrics.totalDeals)}`}
          progress={{ value: metrics.totalSowSigned, max: Math.max(1, metrics.totalDeals) }}
          note={`${formatNumber(metrics.totalHdntSigned)} deal đã ký HĐNT`}
        />
        <Stat
          label="Video đã air"
          value={formatNumber(metrics.totalAired)}
          note={`${formatNumber(metrics.totalAccepted)} đã nghiệm thu · ${metrics.alertStores} gian vượt trần / hạn mức 0đ`}
          tone={metrics.alertStores > 0 ? 'critical' : undefined}
        />
      </StatRow>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        <Panel
          title={
            <span className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-critical" strokeWidth={1.75} />
              Phễu quy trình
            </span>
          }
        >
          <BarList
            max={Math.max(1, metrics.totalStores)}
            items={funnelBars.map((s) => ({
              key: s.key,
              label: s.label,
              value: s.passed,
              display: `${s.passed}/${metrics.totalStores}`,
              color:
                stageFilter === s.key
                  ? 'var(--color-critical)'
                  : 'color-mix(in srgb, var(--color-critical) 55%, var(--color-surface))',
              onClick: () => {
                setStageFilter(stageFilter === s.key ? 'ALL' : s.key);
                setCauseFilter('ALL');
              },
            }))}
          />
          <p className="mt-3 text-2xs text-ink-3">
            Thanh = số gian đã qua mốc. Bấm một mốc để xem các gian đang dừng ở mốc đó. {doneCount}/{metrics.totalStores} gian đã qua hết các mốc.
          </p>
        </Panel>

        <Panel
          title={
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-critical" strokeWidth={1.75} />
              Điểm nghẽn
            </span>
          }
        >
          {causeBars.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-3">Không có gian hàng nào đang nghẽn.</p>
          ) : (
            <BarList
              items={causeBars.slice(0, 8).map(([cause, count]) => ({
                key: cause,
                label: <span title={cause}>{cause}</span>,
                value: count,
                display: `${count} gian`,
                color:
                  causeFilter === cause
                    ? 'var(--color-critical)'
                    : 'color-mix(in srgb, var(--color-critical) 55%, var(--color-surface))',
                onClick: () => {
                  setCauseFilter(causeFilter === cause ? 'ALL' : cause);
                  setStageFilter('ALL');
                },
              }))}
            />
          )}
          <p className="mt-3 text-2xs text-ink-3">
            Mỗi gian tính một lần, ở mốc đầu tiên chưa xong. Nguồn: kế hoạch 4.1.1, deal booking và hạn mức Net tháng 10/2026.
          </p>
        </Panel>
      </div>

      <Panel
        flush
        title={
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4 text-critical" strokeWidth={1.75} />
            Tiến độ từng gian hàng
          </span>
        }
        actions={
          <Segmented<ProgressFilter>
            items={[
              { key: 'ALL', label: 'Tất cả' },
              { key: 'BLOCKED', label: 'Đang nghẽn' },
              { key: 'DONE', label: 'Xong' },
            ]}
            value={progressFilter}
            onChange={setProgressFilter}
          />
        }
      >
        <div className="px-4 sm:px-4 py-3 border-b border-line">
          <FilterBar
            search={{ value: searchQuery, onChange: setSearchQuery, placeholder: 'Tìm gian hàng, thương hiệu, PIC' }}
            resultCount={filteredList.length}
            filters={
              <>
                <Select
                  aria-label="Sàn"
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value as typeof platformFilter)}
                  className="w-auto"
                >
                  <option value="ALL">Tất cả sàn</option>
                  <option value="TikTok Shop">TikTok Shop ({totalTiktokCount})</option>
                  <option value="Shopee Mall">Shopee Mall ({totalShopeeCount})</option>
                </Select>
                <Select
                  aria-label="Cơ cấu duyệt"
                  value={governanceFilter}
                  onChange={(e) => setGovernanceFilter(e.target.value as typeof governanceFilter)}
                  className="w-auto"
                >
                  <option value="ALL">Mọi cơ cấu duyệt</option>
                  <option value="WITH_LEADER">Có Leader ({totalLeaderCount})</option>
                  <option value="DIRECT_HEAD">Trình GĐ trực tiếp ({totalDirectCount})</option>
                </Select>
                {picSummaryList.length > 1 && (
                  <Select aria-label="Chuyên viên PIC" value={picFilter} onChange={(e) => setPicFilter(e.target.value)} className="w-auto">
                    <option value="ALL">Mọi PIC</option>
                    {picSummaryList.map((pic) => (
                      <option key={pic.name} value={pic.name}>
                        {pic.name} ({pic.valid411}/{pic.total} hợp lệ)
                      </option>
                    ))}
                  </Select>
                )}
                {hasFilter && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setStageFilter('ALL');
                      setCauseFilter('ALL');
                      setProgressFilter('ALL');
                      setPlatformFilter('ALL');
                      setGovernanceFilter('ALL');
                      setPicFilter('ALL');
                      setSearchQuery('');
                    }}
                  >
                    Đặt lại lọc
                  </Button>
                )}
              </>
            }
            chips={
              stageFilter !== 'ALL' || causeFilter !== 'ALL' ? (
                <div className="flex items-center gap-2 text-2xs text-ink-3">
                  Đang xem gian dừng ở:
                  <Status tone="critical">{stageFilter !== 'ALL' ? STAGE_META[stageFilter].label : causeFilter}</Status>
                </div>
              ) : undefined
            }
          />
        </div>
        <DataTable
          columns={columns}
          rows={filteredList}
          rowKey={(item) => item.store.id}
          onRowClick={setSelectedProgress}
          empty={<p className="py-6 text-center text-sm text-ink-3">Không có gian hàng khớp bộ lọc.</p>}
        />
      </Panel>

      {/* MODAL CHI TIẾT PHỄU 1 GIAN HÀNG (0 → 18) */}
      <Modal
        open={Boolean(selectedProgress)}
        onClose={() => setSelectedProgress(null)}
        title={selectedProgress ? `Tiến độ quy trình: ${selectedProgress.store.storeName}` : 'Chi tiết gian hàng'}
        size="xl"
      >
        {selectedProgress && (
          <div className="space-y-5">
            {/* THÔNG TIN CHUNG GIAN HÀNG */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-canvas p-3 rounded-xl border border-line text-xs">
              <div>
                <span className="text-ink-3 block">Thương hiệu:</span>
                <strong className="text-ink">{selectedProgress.store.brandName}</strong>
              </div>
              <div>
                <span className="text-ink-3 block">Sàn:</span>
                <strong className="text-ink">{selectedProgress.store.platform}</strong>
              </div>
              <div>
                <span className="text-ink-3 block">Chuyên viên phụ trách:</span>
                <strong className="text-ink">
                  {selectedProgress.store.primaryPic || selectedProgress.store.assignedStaff || 'Chưa gán'}
                </strong>
              </div>
              <div>
                <span className="text-ink-3 block">Cấp duyệt Leader:</span>
                <strong className="text-ink">
                  {selectedProgress.store.hasBookingLeader && selectedProgress.store.bookingLeader
                    ? selectedProgress.store.bookingLeader
                    : 'Trình duyệt trực tiếp GĐ Yến Nhi'}
                </strong>
              </div>
            </div>

            {/* SƠ ĐỒ CÁC MỐC TIẾN ĐỘ 0 → 18 */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-ink">Các mốc quy trình</h4>

              <div className="space-y-2">
                {[
                  {
                    step: 'Mốc 0-3',
                    title: 'Phân quyền & đối soát Plan 4.1 vs 4.1.1',
                    status:
                      selectedProgress.plan411Status === 'APPROVED' && selectedProgress.planValidity.isValidForSubmit
                        ? 'DONE'
                        : !selectedProgress.planValidity.isValidForSubmit
                        ? 'ALERT'
                        : selectedProgress.plan411Status === 'PENDING'
                        ? 'PENDING'
                        : 'TODO',
                    detail: `${selectedProgress.planValidity.badgeLabel}: ${selectedProgress.planValidity.shortDetail}`,
                    actionTab: 'input-plan',
                    actionLabel: 'Mở Kế hoạch 4.1.1',
                  },
                  {
                    step: 'Mốc 4',
                    title: 'Định hướng & Key Visual Plan Brand',
                    status: selectedProgress.brandPlanStatus === 'APPROVED' ? 'DONE' : selectedProgress.brandPlanStatus === 'PENDING' ? 'PENDING' : 'TODO',
                    detail:
                      selectedProgress.brandPlanStatus === 'APPROVED'
                        ? 'Đã duyệt định hướng, mốc Key Visual và phân bổ pillar.'
                        : 'Cần hoàn thiện bảng Key Visual và gửi phê duyệt Brand Plan.',
                    actionTab: 'content',
                    actionLabel: 'Mở Brand Plan',
                  },
                  {
                    step: 'Mốc 5-9',
                    title: 'Listing KOC & phê duyệt danh sách',
                    status: selectedProgress.listingPct >= 100 ? 'DONE' : 'PENDING',
                    detail: `Đã lên danh sách ${selectedProgress.listingCount} / ${selectedProgress.listingQuota} KOC theo quota các bậc KL (${selectedProgress.listingPct}%).`,
                    actionTab: 'koc-listing',
                    actionLabel: 'Mở Điều phối Listing',
                  },
                  {
                    step: 'Mốc 10-11',
                    title: 'Hợp đồng nguyên tắc & phụ lục SOW',
                    status:
                      selectedProgress.dealCount > 0 && selectedProgress.dealsWithSowSigned >= selectedProgress.dealCount
                        ? 'DONE'
                        : selectedProgress.dealCount > 0
                        ? 'PENDING'
                        : 'TODO',
                    detail: `Đã tạo ${selectedProgress.dealCount} Deal. Ký ${selectedProgress.dealsWithHdntSigned} HĐNT, ${selectedProgress.dealsWithSowSigned} Phụ lục SOW.`,
                    actionTab: 'contracts',
                    actionLabel: 'Mở Hồ sơ Hợp đồng',
                  },
                  {
                    step: 'Mốc 12-14',
                    title: 'Sản xuất, video nháp & air video',
                    status:
                      selectedProgress.targetVideos > 0 && selectedProgress.airedVideos >= selectedProgress.targetVideos
                        ? 'DONE'
                        : selectedProgress.airedVideos > 0
                        ? 'PENDING'
                        : 'TODO',
                    detail: `Đã lên sóng ${selectedProgress.airedVideos} / ${selectedProgress.targetVideos} video theo kế hoạch.`,
                    actionTab: 'koc-listing',
                    actionLabel: 'Mở Bảng Air Video',
                  },
                  {
                    step: 'Mốc 15-16',
                    title: 'Nghiệm thu kỹ thuật & duyệt chi',
                    status:
                      selectedProgress.airedVideos > 0 && selectedProgress.acceptedVideos >= selectedProgress.airedVideos
                        ? 'DONE'
                        : selectedProgress.acceptedVideos > 0
                        ? 'PENDING'
                        : 'TODO',
                    detail: `Đã nghiệm thu đạt chuẩn ${selectedProgress.acceptedVideos} / ${selectedProgress.airedVideos} video. Đã duyệt chi ${selectedProgress.paidVideos} đơn.`,
                    actionTab: 'contracts',
                    actionLabel: 'Mở Nghiệm thu & Duyệt chi',
                  },
                  {
                    step: 'Mốc 17-18',
                    title: 'Hiệu suất PnL & kiểm soát ngân sách',
                    status:
                      selectedProgress.financialRisk === 'UNBUDGETED' || selectedProgress.financialRisk === 'OVERBUDGET'
                        ? 'ALERT'
                        : 'DONE',
                    detail:
                      selectedProgress.financialRisk === 'UNBUDGETED'
                        ? 'Phát sinh chi phí ngoài kế hoạch (hạn mức Net = 0đ).'
                        : selectedProgress.financialRisk === 'OVERBUDGET'
                        ? 'Thực chi vượt hạn mức Net được giao.'
                        : `Thực chi ${formatVndShort(selectedProgress.spentNet)} / Hạn mức ${formatVndShort(selectedProgress.budgetNet)} (${selectedProgress.spendPct}%). An toàn.`,
                    actionTab: 'dashboard-brand',
                    actionLabel: 'Mở Báo cáo Ngân sách',
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-line bg-surface flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {item.status === 'DONE' && <CheckCircle2 className="w-4 h-4 text-positive" />}
                        {item.status === 'PENDING' && <Clock className="w-4 h-4 text-warning" />}
                        {item.status === 'ALERT' && <AlertTriangle className="w-4 h-4 text-critical" />}
                        {item.status === 'TODO' && <XCircle className="w-4 h-4 text-ink-4" />}
                      </div>
                      <div>
                        <div className="font-semibold text-ink flex items-center gap-2">
                          <span className="text-2xs text-ink-3 tabular-nums">{item.step}</span>
                          <span>{item.title}</span>
                        </div>
                        <div className="text-ink-2 text-2xs mt-0.5">{item.detail}</div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setSelectedProgress(null);
                        onNavigateToTab?.(item.actionTab, { storeName: selectedProgress.store.storeName });
                      }}
                    >
                      {item.actionLabel}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
