'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Store,
  Layers,
  Filter,
  Search,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  DollarSign,
  Film,
  Users,
  ShieldAlert,
  ArrowRight,
  Calendar,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import {
  StorePortfolioItem,
  BookingDealItem,
  KocItem,
  UserProfile,
  InputPlanBreakdownState,
} from '../../lib/types';
import { REAL_B2C_69_STORES } from '../../lib/realB2cPlanData';
import { formatNumber, formatVndShort } from '../../lib/format';
import { Modal, Button, Status } from '../ui';

type FinancialRiskStatus = 'NORMAL' | 'UNBUDGETED' | 'OVERBUDGET' | 'SLOW_BURN';

interface StorePipelineFunnelOverviewProps {
  currentUser?: UserProfile;
  storePortfolios?: StorePortfolioItem[];
  deals?: BookingDealItem[];
  kocs?: KocItem[];
  onNavigateToTab?: (tabKey: string, context?: Record<string, unknown>) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

type PipelineFilterKey =
  | 'ALL'
  | 'MISSING_PLAN_411'
  | 'PLAN_411_PENDING'
  | 'BRAND_PLAN_PENDING'
  | 'LISTING_INCOMPLETE'
  | 'CONTRACT_PENDING'
  | 'AIR_PENDING_ACCEPTANCE'
  | 'FINANCIAL_ALERT';

interface StoreFunnelProgress {
  store: StorePortfolioItem;
  plan411: InputPlanBreakdownState | null;
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

export const StorePipelineFunnelOverview: React.FC<StorePipelineFunnelOverviewProps> = ({
  currentUser,
  storePortfolios,
  deals = [],
  kocs = [],
  onNavigateToTab,
  onNotify,
}) => {
  const stores = useMemo<StorePortfolioItem[]>(() => {
    if (storePortfolios && storePortfolios.length >= 69) return storePortfolios;
    return REAL_B2C_69_STORES;
  }, [storePortfolios]);

  // Tải danh sách kế hoạch 4.1.1 từ server
  const [plans, setPlans] = useState<InputPlanBreakdownState[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/monthly-plans', { cache: 'no-store' });
        const body = await res.json().catch(() => null);
        if (!res.ok || cancelled) return;
        if (Array.isArray(body?.plans)) {
          setPlans(body.plans.map((p: { plan: InputPlanBreakdownState }) => p.plan));
        }
      } catch {
        /* Bỏ qua nếu lỗi mạng, hệ thống dùng fallback */
      } finally {
        if (!cancelled) setLoadingPlans(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Bộ lọc
  const [filterKey, setFilterKey] = useState<PipelineFilterKey>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'ALL' | 'TikTok Shop' | 'Shopee Mall'>('ALL');
  const [governanceFilter, setGovernanceFilter] = useState<'ALL' | 'WITH_LEADER' | 'DIRECT_HEAD'>('ALL');

  // Modal chi tiết tiến trình phễu của 1 gian hàng
  const [selectedProgress, setSelectedProgress] = useState<StoreFunnelProgress | null>(null);

  // Tính toán tiến độ từng gian hàng
  const funnelProgressList = useMemo<StoreFunnelProgress[]>(() => {
    return stores.map((st) => {
      const storeSlug = normalize(st.storeName);
      const brandSlug = normalize(st.brandName);

      // 1. Tìm Kế hoạch 4.1.1
      const plan =
        plans.find(
          (p) =>
            (p.storeId && p.storeId === st.id) ||
            (p.storeName && normalize(p.storeName) === storeSlug)
        ) || null;

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

      // 3. Tương quan Booking Deals
      const storeDeals = deals.filter((d) => {
        const dStore = normalize(d.storeName || '');
        const dBrand = normalize(d.brandName || '');
        return (dStore && dStore === storeSlug) || (!dStore && dBrand === brandSlug);
      });

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
      } else if (plan411Status === 'NONE' || plan411Status === 'DRAFT') {
        bottleneckStep = 2;
        bottleneckLabel = 'Bước 2: Chưa lập Plan 4.1.1';
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
  }, [stores, plans, deals]);

  // Bộ đếm phễu tổng hợp
  const metrics = useMemo(() => {
    const totalStores = funnelProgressList.length;
    const hasPlan411 = funnelProgressList.filter((p) => p.plan411Status !== 'NONE').length;
    const approvedPlan411 = funnelProgressList.filter((p) => p.plan411Status === 'APPROVED').length;
    const pendingPlan411 = funnelProgressList.filter((p) => p.plan411Status === 'PENDING').length;
    const missingPlan411 = funnelProgressList.filter(
      (p) => p.plan411Status === 'NONE' || p.plan411Status === 'DRAFT'
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

  // Lọc danh sách hiển thị
  const filteredList = useMemo(() => {
    return funnelProgressList.filter((item) => {
      // 1. Lọc theo phễu
      if (filterKey === 'MISSING_PLAN_411' && item.plan411Status !== 'NONE' && item.plan411Status !== 'DRAFT') {
        return false;
      }
      if (filterKey === 'PLAN_411_PENDING' && item.plan411Status !== 'PENDING') {
        return false;
      }
      if (filterKey === 'BRAND_PLAN_PENDING' && item.brandPlanStatus !== 'PENDING') {
        return false;
      }
      if (filterKey === 'LISTING_INCOMPLETE' && (item.listingPct >= 100 || item.targetVideos === 0)) {
        return false;
      }
      if (
        filterKey === 'CONTRACT_PENDING' &&
        (item.dealCount === 0 || item.dealsWithSowSigned >= item.dealCount)
      ) {
        return false;
      }
      if (
        filterKey === 'AIR_PENDING_ACCEPTANCE' &&
        (item.airedVideos === 0 || item.acceptedVideos >= item.airedVideos)
      ) {
        return false;
      }
      if (
        filterKey === 'FINANCIAL_ALERT' &&
        item.financialRisk !== 'UNBUDGETED' &&
        item.financialRisk !== 'OVERBUDGET'
      ) {
        return false;
      }

      // 2. Lọc theo sàn
      if (platformFilter !== 'ALL' && item.store.platform !== platformFilter) {
        return false;
      }

      // 3. Lọc theo cơ cấu duyệt
      if (governanceFilter === 'WITH_LEADER' && !item.store.hasBookingLeader) {
        return false;
      }
      if (governanceFilter === 'DIRECT_HEAD' && item.store.hasBookingLeader) {
        return false;
      }

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
  }, [funnelProgressList, filterKey, platformFilter, governanceFilter, searchQuery]);

  return (
    <div className="space-y-5">
      {/* 4 THẺ CHỈ SỐ PHỄU TỔNG QUAN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <div className="bg-surface rounded-xl border border-line p-4">
          <div className="flex items-center justify-between text-xs text-ink-3 font-medium mb-1">
            <span>Mốc 0-3: Kế Hoạch 4.1.1</span>
            <FileText className="w-4 h-4 text-accent" />
          </div>
          <div className="text-xl font-semibold text-ink font-mono">
            {metrics.approvedPlan411} / {metrics.totalStores} Đã Duyệt
          </div>
          <div className="mt-2 pt-2 border-t border-line flex items-center justify-between text-2xs">
            <span className="text-warning font-semibold">{metrics.pendingPlan411} chờ duyệt</span>
            <span className="text-critical font-semibold">{metrics.missingPlan411} chưa lập/nháp</span>
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-line p-4">
          <div className="flex items-center justify-between text-xs text-accent font-semibold mb-1">
            <span>Mốc 5-9: Listing KOC Theo Quota</span>
            <Users className="w-4 h-4 text-accent" />
          </div>
          <div className="text-xl font-semibold text-accent font-mono">
            {metrics.fullListingStores} / {metrics.totalStores} Đủ Quota
          </div>
          <div className="mt-2 pt-2 border-t border-line flex items-center justify-between text-2xs">
            <span className="text-ink-3">Tỷ lệ phủ toàn bộ</span>
            <span className="text-ink font-semibold font-mono">
              {metrics.incompleteListing} gian cần bổ sung
            </span>
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-line p-4">
          <div className="flex items-center justify-between text-xs text-positive font-semibold mb-1">
            <span>Mốc 10-11: Hợp Đồng &amp; Phụ Lục SOW</span>
            <CheckCircle2 className="w-4 h-4 text-positive" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold text-positive font-mono">
              {metrics.totalSowSigned} / {metrics.totalDeals} SOW Ký
            </span>
            <span className="text-xs text-ink-3 font-mono">
              ({metrics.totalHdntSigned} HĐNT)
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-line flex items-center justify-between text-2xs">
            <span className="text-ink-3">Đã ký đầy đủ pháp chế</span>
            <span className="text-positive font-semibold font-mono">
              {metrics.totalDeals > 0
                ? Math.round((metrics.totalSowSigned / metrics.totalDeals) * 100)
                : 0}
              %
            </span>
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-line p-4">
          <div className="flex items-center justify-between text-xs text-ink-3 font-medium mb-1">
            <span>Mốc 14-18: Air, Nghiệm Thu &amp; PnL</span>
            <Film className="w-4 h-4 text-warning" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold text-ink font-mono">
              {metrics.totalAired} Video Air
            </span>
            <span className="text-xs font-semibold text-positive px-1.5 py-0.5 rounded bg-positive-soft">
              {metrics.totalAccepted} Nghiệm thu
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-line flex items-center justify-between text-2xs">
            <span className="text-ink-3">Kiểm soát ngân sách</span>
            <span className="font-semibold text-critical">
              {metrics.alertStores} gian vượt/0đ
            </span>
          </div>
        </div>
      </div>

      {/* THANH LỌC NHANH ĐIỂM NGHẼN PHỄU (0 → 18) */}
      <div className="bg-surface rounded-xl border border-line p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink">
            <Filter className="w-4 h-4 text-accent" />
            <span>Lọc nhanh các gian hàng theo điểm nghẽn tiến độ:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              {
                key: 'ALL',
                label: `Tất cả (${funnelProgressList.length} gian)`,
                activeClass: 'bg-ink text-white',
                idleClass: 'bg-sunken text-ink-2 hover:bg-sunken',
              },
              {
                key: 'MISSING_PLAN_411',
                label: `Chưa có Plan 4.1.1 (${metrics.missingPlan411} gian)`,
                activeClass: 'bg-critical text-white',
                idleClass: 'bg-critical-soft text-critical border border-critical/20 hover:bg-critical-soft',
              },
              {
                key: 'PLAN_411_PENDING',
                label: `Chờ duyệt 4.1.1 (${metrics.pendingPlan411} gian)`,
                activeClass: 'bg-warning text-white',
                idleClass: 'bg-warning-soft text-warning border border-warning/20 hover:bg-warning-soft',
              },
              {
                key: 'LISTING_INCOMPLETE',
                label: `Thiếu Listing KOC (${metrics.incompleteListing} gian)`,
                activeClass: 'bg-accent text-white',
                idleClass: 'bg-accent-soft text-accent border border-accent/20 hover:bg-accent-soft',
              },
              {
                key: 'FINANCIAL_ALERT',
                label: `Báo động ngân sách (${metrics.alertStores} gian)`,
                activeClass: 'bg-critical text-white',
                idleClass: 'bg-critical-soft text-critical border border-critical/20 hover:bg-critical-soft',
              },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilterKey(f.key as PipelineFilterKey)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filterKey === f.key ? f.activeClass : f.idleClass
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* CÁC BỘ LỌC CHI TIẾT */}
        <div className="pt-3 border-t border-line grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên gian hàng, PIC, Brand..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-canvas border border-line rounded-lg focus:outline-hidden focus:border-accent/20"
            />
          </div>

          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value as typeof platformFilter)}
            className="px-3 py-1.5 text-xs bg-canvas border border-line rounded-lg font-medium text-ink-2 focus:outline-hidden"
          >
            <option value="ALL">Tất cả Sàn (39 TikTok · 30 Shopee)</option>
            <option value="TikTok Shop">TikTok Shop (39 gian hàng)</option>
            <option value="Shopee Mall">Shopee Mall (30 gian hàng)</option>
          </select>

          <select
            value={governanceFilter}
            onChange={(e) => setGovernanceFilter(e.target.value as typeof governanceFilter)}
            className="px-3 py-1.5 text-xs bg-canvas border border-line rounded-lg font-medium text-ink-2 focus:outline-hidden"
          >
            <option value="ALL">Cơ cấu duyệt: Tất cả 69 gian hàng</option>
            <option value="WITH_LEADER">Nhóm có Leader Nguyễn Thị Ngọc Tâm (8 gian)</option>
            <option value="DIRECT_HEAD">Không có Leader — Trình trực tiếp Yến Nhi (61 gian)</option>
          </select>
        </div>
      </div>

      {/* BẢNG TIẾN ĐỘ PHỄU 69 GIAN HÀNG (0 → 18) */}
      <div className="bg-surface rounded-xl border border-line overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-sm font-semibold text-ink">
            Bảng Theo Dõi Phễu Vận Hành {filteredList.length} / 69 Gian Hàng B2C (Quy Trình 0 → 18)
          </h3>
          <span className="text-2xs text-ink-3">
            Bấm vào dòng bất kỳ để xem chi tiết tiến trình phễu và hồ sơ chứng từ của gian hàng.
          </span>
        </div>

        <div className="overflow-x-auto max-h-[660px]">
          <table className="w-full text-xs text-left">
            <thead className="bg-canvas text-ink-2 uppercase border-b border-line sticky top-0 z-10">
              <tr>
                <th className="py-3 px-4 font-semibold">Gian Hàng &amp; Brand</th>
                <th className="py-3 px-3 font-semibold">Phụ Trách (PIC &amp; Leader)</th>
                <th className="py-3 px-3 font-semibold text-center">Plan 4.1.1 (Mốc 1-3)</th>
                <th className="py-3 px-3 font-semibold text-center">Plan Brand (Mốc 4)</th>
                <th className="py-3 px-3 font-semibold text-center">Listing KOC (Mốc 5-9)</th>
                <th className="py-3 px-3 font-semibold text-center">Hợp Đồng &amp; SOW (Mốc 10-11)</th>
                <th className="py-3 px-3 font-semibold text-center">Air Video (Mốc 14)</th>
                <th className="py-3 px-3 font-semibold text-center">Nghiệm Thu (Mốc 15-16)</th>
                <th className="py-3 px-3 font-semibold text-right">Chi Phí Net / Hạn Mức</th>
                <th className="py-3 px-4 font-semibold">Điểm Nghẽn Tiến Độ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredList.map((item) => {
                const st = item.store;

                return (
                  <tr
                    key={st.id}
                    onClick={() => setSelectedProgress(item)}
                    className="hover:bg-canvas transition cursor-pointer"
                  >
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-ink flex items-center gap-1.5">
                        <span>{st.storeName}</span>
                        <span
                          className={`text-2xs font-semibold px-1 py-0.2 rounded ${
                            st.platform === 'TikTok Shop'
                              ? 'bg-ink text-white'
                              : 'bg-warning-soft text-warning'
                          }`}
                        >
                          {st.platform === 'TikTok Shop' ? 'TikTok' : 'Shopee'}
                        </span>
                      </div>
                      <div className="text-2xs text-ink-3">{st.brandName}</div>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-ink">
                        {st.primaryPic || st.assignedStaff || 'Chưa gán'}
                      </div>
                      <div className="text-2xs text-ink-3">
                        {st.hasBookingLeader && st.bookingLeader ? (
                          <span className="text-accent font-medium">Leader: {st.bookingLeader}</span>
                        ) : (
                          <span>Trình GĐ Yến Nhi</span>
                        )}
                      </div>
                    </td>

                    {/* Mốc 1-3: Plan 4.1.1 */}
                    <td className="py-2.5 px-3 text-center">
                      {item.plan411Status === 'APPROVED' && (
                        <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-positive-soft text-positive">
                          Đã duyệt
                        </span>
                      )}
                      {item.plan411Status === 'PENDING' && (
                        <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-warning-soft text-warning">
                          Chờ duyệt
                        </span>
                      )}
                      {item.plan411Status === 'DRAFT' && (
                        <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-sunken text-ink-2">
                          Bản nháp
                        </span>
                      )}
                      {item.plan411Status === 'CHANGES' && (
                        <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-critical-soft text-critical">
                          Cần sửa
                        </span>
                      )}
                      {item.plan411Status === 'NONE' && (
                        <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-critical-soft text-critical">
                          Chưa lập
                        </span>
                      )}
                    </td>

                    {/* Mốc 4: Plan Brand */}
                    <td className="py-2.5 px-3 text-center">
                      {item.brandPlanStatus === 'APPROVED' && (
                        <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-positive-soft text-positive">
                          Đã duyệt
                        </span>
                      )}
                      {item.brandPlanStatus === 'PENDING' && (
                        <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-warning-soft text-warning">
                          Chờ duyệt
                        </span>
                      )}
                      {(item.brandPlanStatus === 'DRAFT' || item.brandPlanStatus === 'NONE') && (
                        <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-sunken text-ink-3">
                          Chưa chốt
                        </span>
                      )}
                    </td>

                    {/* Mốc 5-9: Listing KOC */}
                    <td className="py-2.5 px-3 text-center font-mono">
                      <div className="flex items-center justify-center gap-1">
                        <span
                          className={`font-semibold ${
                            item.listingPct >= 100 ? 'text-positive' : 'text-accent'
                          }`}
                        >
                          {item.listingCount}/{item.listingQuota}
                        </span>
                        <span className="text-2xs text-ink-3">({item.listingPct}%)</span>
                      </div>
                    </td>

                    {/* Mốc 10-11: HĐNT & SOW */}
                    <td className="py-2.5 px-3 text-center font-mono">
                      {item.dealCount > 0 ? (
                        <div className="text-2xs">
                          <span className="text-ink font-semibold">{item.dealCount} Deal</span>
                          <span className="text-ink-3 mx-1">·</span>
                          <span
                            className={
                              item.dealsWithSowSigned >= item.dealCount
                                ? 'text-positive font-semibold'
                                : 'text-warning'
                            }
                          >
                            {item.dealsWithSowSigned} SOW ký
                          </span>
                        </div>
                      ) : (
                        <span className="text-ink-3 text-2xs">—</span>
                      )}
                    </td>

                    {/* Mốc 14: Air Video */}
                    <td className="py-2.5 px-3 text-center font-mono">
                      <div className="font-semibold text-positive">
                        {item.airedVideos}{' '}
                        <span className="text-2xs font-normal text-ink-3">
                          / {st.targetPaidVideos || 0}
                        </span>
                      </div>
                    </td>

                    {/* Mốc 15-16: Nghiệm thu */}
                    <td className="py-2.5 px-3 text-center font-mono">
                      {item.airedVideos > 0 ? (
                        <div className="text-2xs">
                          <span
                            className={`font-semibold ${
                              item.acceptedVideos >= item.airedVideos
                                ? 'text-positive'
                                : 'text-accent'
                            }`}
                          >
                            {item.acceptedVideos} / {item.airedVideos}
                          </span>
                        </div>
                      ) : (
                        <span className="text-ink-3 text-2xs">—</span>
                      )}
                    </td>

                    {/* Mốc 17-18: Chi phí Net */}
                    <td className="py-2.5 px-3 text-right font-mono">
                      <div className="font-semibold text-ink">
                        {formatVndShort(item.spentNet)}
                      </div>
                      <div className="text-2xs text-ink-3">
                        {item.budgetNet > 0 ? `${item.spendPct}% Net` : 'Net 0đ'}
                      </div>
                    </td>

                    {/* Điểm nghẽn tiến độ */}
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-2xs font-semibold px-2 py-0.5 rounded truncate max-w-[200px] ${
                            item.currentBottleneckStep === 18
                              ? 'bg-critical-soft text-critical'
                              : item.currentBottleneckStep >= 14
                              ? 'bg-positive-soft text-positive'
                              : item.currentBottleneckStep >= 10
                              ? 'bg-accent-soft text-accent'
                              : 'bg-warning-soft text-warning'
                          }`}
                        >
                          {item.currentBottleneckLabel}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-ink-3 shrink-0" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CHI TIẾT PHỄU 1 GIAN HÀNG (0 → 18) */}
      <Modal
        open={Boolean(selectedProgress)}
        onClose={() => setSelectedProgress(null)}
        title={selectedProgress ? `Tiến Trình Phễu Vận Hành 0 → 18: ${selectedProgress.store.storeName}` : 'Chi Tiết Gian Hàng'}
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
              <div className="text-xs font-semibold text-ink">Bảng Kiểm Tra 7 Cột Mốc Nghiệp Vụ:</div>

              <div className="space-y-2">
                {[
                  {
                    step: 'Mốc 0-3',
                    title: 'Phân quyền & Lập Kế hoạch 4.1.1',
                    status: selectedProgress.plan411Status === 'APPROVED' ? 'DONE' : selectedProgress.plan411Status === 'PENDING' ? 'PENDING' : 'TODO',
                    detail:
                      selectedProgress.plan411Status === 'APPROVED'
                        ? 'Kế hoạch phân rã 4 trụ cột đã được phê duyệt hợp lệ.'
                        : selectedProgress.plan411Status === 'PENDING'
                        ? 'Kế hoạch đã nộp, đang chờ cấp duyệt xử lý.'
                        : 'Chưa lập hoặc đang là bản nháp nội bộ.',
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
                    title: 'Listing KOC & Phê duyệt Danh sách',
                    status: selectedProgress.listingPct >= 100 ? 'DONE' : 'PENDING',
                    detail: `Đã lên danh sách ${selectedProgress.listingCount} / ${selectedProgress.listingQuota} KOC theo quota các bậc KL (${selectedProgress.listingPct}%).`,
                    actionTab: 'koc-listing',
                    actionLabel: 'Mở Điều phối Listing',
                  },
                  {
                    step: 'Mốc 10-11',
                    title: 'Hợp Đồng Nguyên Tắc & Phụ Lục SOW',
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
                    title: 'Sản Xuất, Video Nháp & Air Video',
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
                    title: 'Nghiệm Thu Kỹ Thuật & Duyệt Chi',
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
                    title: 'Hiệu Suất PnL & Kiểm Soát Ngân Sách',
                    status:
                      selectedProgress.financialRisk === 'UNBUDGETED' || selectedProgress.financialRisk === 'OVERBUDGET'
                        ? 'ALERT'
                        : 'DONE',
                    detail:
                      selectedProgress.financialRisk === 'UNBUDGETED'
                        ? 'CẢNH BÁO ĐỎ: Phát sinh chi phí ngoài kế hoạch (Hạn mức Net = 0đ).'
                        : selectedProgress.financialRisk === 'OVERBUDGET'
                        ? 'CẢNH BÁO: Thực chi vượt hạn mức Net được giao.'
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
                          <span className="text-2xs text-ink-3 uppercase font-mono">{item.step}</span>
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
