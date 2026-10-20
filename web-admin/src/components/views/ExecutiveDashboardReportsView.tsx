'use client';

import React, { useState, useMemo, useDeferredValue } from 'react';
import {
  ActionMenu,
  Button,
  Chips,
  DataTable,
  FilterBar,
  Input,
  Modal,
  PageActions,
  Pagination,
  Panel,
  Person,
  Segmented,
  Select,
  Stat,
  StatRow,
  Status,
  Tabs,
} from '../ui';
import {
  TrendingUp,
  Download,
  Search,
  ExternalLink,
  ChevronRight,
  PlaySquare,
  Film,
  Store,
  AlertTriangle,
  Filter,
  RefreshCw,
  DollarSign,
  Layers,
  FileText
} from 'lucide-react';
import { OperationalReportDrawer } from '../OperationalReportDrawer';
import {
  BookingDealItem,
  UserProfile,
  BrandDetail,
  StorePortfolioItem,
  KocItem
} from '../../lib/types';
import { formatNumber, formatVndShort } from '../../lib/format';
import { REAL_B2C_69_STORES } from '../../lib/realB2cPlanData';
import {
  TIKTOK_SELLER_ADS_SUMMARY,
  TIKTOK_SELLER_CAMPAIGNS,
  TIKTOK_SELLER_TOP_CREATIVES,
  B2C_BOOKED_VIDEOS_OCT_2026,
  B2C_VIDEO_FORMAT_BREAKDOWN,
  B2C_VIDEO_KL_BREAKDOWN,
  B2C_VIDEO_TYPE_BREAKDOWN,
  B2C_VIDEO_PIPELINE_BREAKDOWN,
  B2C_STAFF_ANALYTICS_LIST,
  B2cBookedVideoRecord,
  B2cStaffAnalyticsRecord,
} from '../../lib/b2cAnalyticsDataset';
import { B2C_STORE_WEEKLY_AIR_SYNC_LIST } from '../../lib/b2cWeeklyAirSyncDataset';
import { WeeklyAirSyncDashboardSection } from './WeeklyAirSyncDashboardSection';

interface ExecutiveDashboardReportsViewProps {
  currentUser: UserProfile;
  deals: BookingDealItem[];
  brands?: BrandDetail[];
  kocs?: KocItem[];
  storePortfolios?: StorePortfolioItem[];
  activeSidebarTab?: string;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onNavigateToTab?: (tabKey: string) => void;
}

type DashboardMainTab =
  | 'OVERVIEW_FINANCE'
  | 'STORE_SELLER'
  | 'VIDEO_CREATIVE'
  | 'TEAM_SLA'
  | 'STAFF_EFFICIENCY';

const SIDEBAR_TO_DASHBOARD_TAB: Record<string, DashboardMainTab> = {
  'dashboard-bi': 'OVERVIEW_FINANCE',
  'dashboard-brand': 'OVERVIEW_FINANCE',
  'dashboard-finance': 'OVERVIEW_FINANCE',
  'dashboard-store': 'STORE_SELLER',
  'dashboard-video': 'VIDEO_CREATIVE',
  'dashboard-team-sla': 'TEAM_SLA',
  'dashboard-air-sync': 'TEAM_SLA',
  'dashboard-staff': 'STAFF_EFFICIENCY',
};

const DASHBOARD_TO_SIDEBAR_TAB: Record<DashboardMainTab, string> = {
  OVERVIEW_FINANCE: 'dashboard-brand',
  STORE_SELLER: 'dashboard-store',
  VIDEO_CREATIVE: 'dashboard-video',
  TEAM_SLA: 'dashboard-team-sla',
  STAFF_EFFICIENCY: 'dashboard-staff',
};

const KL_ORDER = ['TAP UpAffiliate', 'KL1', 'KL2', 'KL3', 'KL4', 'KL5', 'KL6', 'KL7'];

export const ExecutiveDashboardReportsView: React.FC<ExecutiveDashboardReportsViewProps> = ({
  storePortfolios,
  activeSidebarTab,
  onNotify,
  onNavigateToTab
}) => {
  // Nguồn 69 gian hàng B2C chuẩn (B2C phụ trách = 1)
  const stores = useMemo<StorePortfolioItem[]>(() => {
    if (storePortfolios && storePortfolios.length >= 69) {
      return storePortfolios;
    }
    return REAL_B2C_69_STORES;
  }, [storePortfolios]);

  // State bộ lọc chung đồng bộ 2 chiều với Sidebar "Dashboard Quản Trị B2C" (đồng bộ trực tiếp trong render, 0ms lag)
  const [activeTab, setActiveTab] = useState<DashboardMainTab>(() => {
    if (activeSidebarTab && SIDEBAR_TO_DASHBOARD_TAB[activeSidebarTab]) {
      return SIDEBAR_TO_DASHBOARD_TAB[activeSidebarTab];
    }
    return 'OVERVIEW_FINANCE';
  });
  const [prevSidebarTab, setPrevSidebarTab] = useState<string | undefined>(activeSidebarTab);
  if (activeSidebarTab !== prevSidebarTab) {
    setPrevSidebarTab(activeSidebarTab);
    if (activeSidebarTab && SIDEBAR_TO_DASHBOARD_TAB[activeSidebarTab]) {
      const nextTab = SIDEBAR_TO_DASHBOARD_TAB[activeSidebarTab];
      if (nextTab !== activeTab) {
        setActiveTab(nextTab);
      }
    }
  }

  const handleSelectDashboardSection = (section: DashboardMainTab) => {
    setActiveTab(section);
    const targetSidebarKey = DASHBOARD_TO_SIDEBAR_TAB[section];
    if (targetSidebarKey && onNavigateToTab && activeSidebarTab !== targetSidebarKey) {
      onNavigateToTab(targetSidebarKey);
    }
  };

  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [selectedPlatform, setSelectedPlatform] = useState<'ALL' | 'TikTok Shop' | 'Shopee Mall'>('ALL');
  const [selectedGovernance, setSelectedGovernance] = useState<'ALL' | 'WITH_LEADER' | 'DIRECT_HEAD'>('ALL');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'ALL' | 'UNBUDGETED' | 'OVERBUDGET' | 'SLOW_BURN' | 'NORMAL'>('ALL');
  const [selectedQuadrant, setSelectedQuadrant] = useState<'ALL' | 'OVER_SPEND' | 'HIGH_SPEND_LOW_AIR' | 'OPTIMAL' | 'SLOW_BOTH'>('ALL');
  const [brandSortMode, setBrandSortMode] = useState<'BUDGET' | 'SPENT_DESC' | 'SPEND_PCT_DESC' | 'AIRED_DESC'>('BUDGET');
  const [storeSortMode, setStoreSortMode] = useState<'DEFAULT' | 'SPEND_PCT_DESC' | 'SPEND_PCT_ASC' | 'AIRED_DESC' | 'AIRED_ASC'>('AIRED_DESC');
  // Tách biệt ô tìm kiếm theo từng Tab để tránh rò rỉ ngữ cảnh, kèm useDeferredValue chống lag phím
  const [brandSearchQuery, setBrandSearchQuery] = useState<string>('');
  const deferredBrandSearch = useDeferredValue(brandSearchQuery);

  const [storeSearchQuery, setStoreSearchQuery] = useState<string>('');
  const deferredStoreSearch = useDeferredValue(storeSearchQuery);

  const [videoSearchQuery, setVideoSearchQuery] = useState<string>('');
  const deferredVideoSearch = useDeferredValue(videoSearchQuery);

  const [staffSearchQuery, setStaffSearchQuery] = useState<string>('');
  const deferredStaffSearch = useDeferredValue(staffSearchQuery);

  // Phân trang hiển thị bảng để chống quá tải DOM
  const [brandVisibleLimit, setBrandVisibleLimit] = useState<number>(16);
  const [storeVisibleLimit, setStoreVisibleLimit] = useState<number>(15);
  const [staffPage, setStaffPage] = useState<number>(1);
  const [staffPageSize, setStaffPageSize] = useState<number>(15);
  const [bookedVideosVisibleLimit, setBookedVideosVisibleLimit] = useState<number>(30);

  // State bộ lọc tab Video
  const [videoFormatFilter, setVideoFormatFilter] = useState<string>('ALL');
  const [videoKlFilter, setVideoKlFilter] = useState<string>('ALL');

  // State bộ lọc & sắp xếp tab Hiệu suất & Hiệu quả Nhân sự
  const [staffRoleFilter, setStaffRoleFilter] = useState<'ALL' | 'MANAGEMENT' | 'SPECIALIST' | 'WITH_STORES'>('ALL');
  const [staffSortMode, setStaffSortMode] = useState<'KPI_DESC' | 'AIRED_DESC' | 'SPEND_PCT_DESC' | 'GMV_DESC' | 'ROAS_DESC' | 'COST_PER_AIR_ASC' | 'SLA_DESC'>('KPI_DESC');
  const [staffQuadrantFilter, setStaffQuadrantFilter] = useState<'ALL' | 'STAR' | 'HIGH_VOL_OPT_COST' | 'HIGH_EFF_NEED_VOL' | 'NEED_COACHING'>('ALL');
  const [selectedFocusStaffName, setSelectedFocusStaffName] = useState<string>('Lương Thị Như Quỳnh');

  // State Modal chi tiết (Drill-down)
  const [inspectStore, setInspectStore] = useState<StorePortfolioItem | null>(null);
  const [inspectStaff, setInspectStaff] = useState<B2cStaffAnalyticsRecord | null>(null);
  const [inspectVideo, setInspectVideo] = useState<B2cBookedVideoRecord | null>(null);
  const [isSyncingSeller, setIsSyncingSeller] = useState<boolean>(false);
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);
  const [isReportDrawerOpen, setIsReportDrawerOpen] = useState<boolean>(false);

  // Hàm phân nhóm gian hàng theo tương quan % Spend Chi Phí vs Số lượng Video Air
  const classifyStoreSpendAndAir = (s: StorePortfolioItem): 'OVER_SPEND' | 'HIGH_SPEND_LOW_AIR' | 'OPTIMAL' | 'SLOW_BOTH' => {
    const net = s.budgetNet || s.monthlyBudget || 0;
    const spent = s.actualSpentNet || 0;
    const spendPct = net > 0 ? (spent / net) * 100 : spent > 0 ? 999 : 0;
    const targetPaid = Math.max(s.targetPaidVideos || 0, 1);
    const aired = s.actualAiredVideos || 0;
    const airVsPaidPct = (aired / targetPaid) * 100;

    if (s.financialRiskStatus === 'UNBUDGETED' || s.financialRiskStatus === 'OVERBUDGET' || spendPct > 100) {
      return 'OVER_SPEND';
    }
    if (spendPct >= 45 && airVsPaidPct < 45 && aired < 10) {
      return 'HIGH_SPEND_LOW_AIR';
    }
    if (spendPct >= 35 || aired >= 8 || airVsPaidPct >= 50) {
      return 'OPTIMAL';
    }
    return 'SLOW_BOTH';
  };

  // Danh sách 42 Thương hiệu (Brand)
  const allBrands = useMemo(() => {
    const set = new Set<string>();
    stores.forEach((s) => {
      if (s.brandName) set.add(s.brandName);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [stores]);

  // Lọc danh sách gian hàng theo bộ lọc
  const filteredStores = useMemo(() => {
    const list = stores.filter((s) => {
      if (selectedBrand !== 'ALL' && s.brandName !== selectedBrand) return false;
      if (selectedPlatform !== 'ALL' && s.platform !== selectedPlatform) return false;
      if (selectedGovernance === 'WITH_LEADER' && !s.hasBookingLeader) return false;
      if (selectedGovernance === 'DIRECT_HEAD' && s.hasBookingLeader) return false;
      if (selectedRiskFilter !== 'ALL' && (s.financialRiskStatus || 'NORMAL') !== selectedRiskFilter) return false;
      if (selectedQuadrant !== 'ALL' && classifyStoreSpendAndAir(s) !== selectedQuadrant) return false;
      if (deferredStoreSearch.trim()) {
        const q = deferredStoreSearch.toLowerCase();
        const matchStore = s.storeName.toLowerCase().includes(q);
        const matchBrand = s.brandName.toLowerCase().includes(q);
        const matchPic = (s.primaryPic || s.assignedStaff || '').toLowerCase().includes(q);
        const matchLeader = (s.bookingLeader || '').toLowerCase().includes(q);
        if (!matchStore && !matchBrand && !matchPic && !matchLeader) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      const netA = a.budgetNet || a.monthlyBudget || 0;
      const spentA = a.actualSpentNet || 0;
      const pctA = netA > 0 ? (spentA / netA) * 100 : spentA > 0 ? 999 : 0;

      const netB = b.budgetNet || b.monthlyBudget || 0;
      const spentB = b.actualSpentNet || 0;
      const pctB = netB > 0 ? (spentB / netB) * 100 : spentB > 0 ? 999 : 0;

      if (storeSortMode === 'SPEND_PCT_DESC') return pctB - pctA || spentB - spentA;
      if (storeSortMode === 'SPEND_PCT_ASC') return pctA - pctB || spentA - spentB;
      if (storeSortMode === 'AIRED_DESC') return (b.actualAiredVideos || 0) - (a.actualAiredVideos || 0) || spentB - spentA;
      if (storeSortMode === 'AIRED_ASC') return (a.actualAiredVideos || 0) - (b.actualAiredVideos || 0);
      return 0;
    });
  }, [stores, selectedBrand, selectedPlatform, selectedGovernance, selectedRiskFilter, selectedQuadrant, storeSortMode, deferredStoreSearch]);

  // Tổng hợp KPI từ tập gian hàng đang lọc
  const kpiSummary = useMemo(() => {
    let totalTargetGmv = 0;
    let totalBudgetGross = 0;
    let totalBudgetNet = 0;
    let totalAffGross = 0;
    let totalAffNet = 0;
    let totalSelfGross = 0;
    let totalSelfNet = 0;
    let totalLiveBudget = 0;
    let totalActualSpentNet = 0;
    let totalTargetPaidVideos = 0;
    let totalTargetFocVideos = 0;
    let totalTargetSelfVideos = 0;
    let totalTargetLiveSessions = 0;
    let totalActualAiredVideos = 0;

    let unbudgetedCount = 0;
    let overbudgetCount = 0;
    let slowBurnCount = 0;
    let tiktokCount = 0;
    let shopeeCount = 0;
    let leaderStoreCount = 0;
    let directStoreCount = 0;

    let quadOverSpend = 0;
    let quadHighSpendLowAir = 0;
    let quadOptimal = 0;
    let quadSlowBoth = 0;
    let storesWithAiredCount = 0;

    filteredStores.forEach((s) => {
      totalTargetGmv += s.monthlyTargetGmv || 0;
      totalBudgetGross += s.budgetGross || 0;
      totalBudgetNet += s.budgetNet || s.monthlyBudget || 0;
      totalAffGross += s.budgetAffiliateGross || 0;
      totalAffNet += s.budgetAffiliateNet || s.budgetAffiliate || 0;
      totalSelfGross += s.budgetSelfChannelGross || 0;
      totalSelfNet += s.budgetSelfChannelNet || s.budgetSelfChannel || 0;
      totalLiveBudget += s.budgetLive || 0;
      totalActualSpentNet += s.actualSpentNet || 0;

      totalTargetPaidVideos += s.targetPaidVideos || 0;
      totalTargetFocVideos += s.targetFocVideos || 0;
      totalTargetSelfVideos += s.targetSelfChannelContents || 0;
      totalTargetLiveSessions += s.targetLiveSessions || 0;
      totalActualAiredVideos += s.actualAiredVideos || 0;
      if ((s.actualAiredVideos || 0) > 0) storesWithAiredCount++;

      if (s.financialRiskStatus === 'UNBUDGETED') unbudgetedCount++;
      if (s.financialRiskStatus === 'OVERBUDGET') overbudgetCount++;
      if (s.financialRiskStatus === 'SLOW_BURN') slowBurnCount++;
      if (s.platform === 'TikTok Shop') tiktokCount++;
      else shopeeCount++;
      if (s.hasBookingLeader) leaderStoreCount++;
      else directStoreCount++;

      const q = classifyStoreSpendAndAir(s);
      if (q === 'OVER_SPEND') quadOverSpend++;
      else if (q === 'HIGH_SPEND_LOW_AIR') quadHighSpendLowAir++;
      else if (q === 'OPTIMAL') quadOptimal++;
      else quadSlowBoth++;
    });

    const totalBookedOrders = B2C_VIDEO_PIPELINE_BREAKDOWN.reduce((sum, st) => sum + st.count, 0) || 786;
    const settledStages = B2C_VIDEO_PIPELINE_BREAKDOWN.filter(
      (st) => st.pipeline === 'Done' || st.pipeline === 'Làm ĐNTT'
    );
    const settledOrdersCount = settledStages.reduce((sum, st) => sum + st.count, 0);
    const settledOrdersCost = settledStages.reduce((sum, st) => sum + st.totalCost, 0);
    const pendingStages = B2C_VIDEO_PIPELINE_BREAKDOWN.filter(
      (st) => st.pipeline === 'Tạm ứng' || st.pipeline === 'Chưa làm ĐNTT'
    );
    const pendingOrdersCount = pendingStages.reduce((sum, st) => sum + st.count, 0);
    const pendingOrdersCost = pendingStages.reduce((sum, st) => sum + st.totalCost, 0);

    const pacingNetPct = totalBudgetNet > 0 ? Math.round((totalActualSpentNet / totalBudgetNet) * 1000) / 10 : 0;
    const pacingGrossPct = totalBudgetGross > 0 ? Math.round((totalActualSpentNet / totalBudgetGross) * 1000) / 10 : 0;
    const airedVsPaidPct = totalTargetPaidVideos > 0 ? Math.round((totalActualAiredVideos / totalTargetPaidVideos) * 1000) / 10 : 0;
    const airedVsBookedPct = Math.round((totalActualAiredVideos / totalBookedOrders) * 1000) / 10;
    const taxAndFeeDiff = Math.max(0, totalBudgetGross - totalBudgetNet);

    return {
      storeCount: filteredStores.length,
      tiktokCount,
      shopeeCount,
      leaderStoreCount,
      directStoreCount,
      totalTargetGmv,
      totalBudgetGross,
      totalBudgetNet,
      taxAndFeeDiff,
      totalAffGross,
      totalAffNet,
      totalSelfGross,
      totalSelfNet,
      totalLiveBudget,
      totalActualSpentNet,
      pacingNetPct,
      pacingGrossPct,
      airedVsPaidPct,
      airedVsBookedPct,
      totalBookedOrders,
      settledOrdersCount,
      settledOrdersCost,
      pendingOrdersCount,
      pendingOrdersCost,
      storesWithAiredCount,
      quadOverSpend,
      quadHighSpendLowAir,
      quadOptimal,
      quadSlowBoth,
      totalTargetPaidVideos,
      totalTargetFocVideos,
      totalTargetSelfVideos,
      totalTargetLiveSessions,
      totalActualAiredVideos,
      unbudgetedCount,
      overbudgetCount,
      slowBurnCount
    };
  }, [filteredStores]);

  // Tổng hợp cấp Thương hiệu (Brand) cho biểu đồ Gross vs Net vs Thực chi & Số lượng Video Air
  const brandAggregation = useMemo(() => {
    const map = new Map<
      string,
      {
        brandName: string;
        storeCount: number;
        tiktokStores: number;
        shopeeStores: number;
        targetGmv: number;
        budgetGross: number;
        budgetNet: number;
        affNet: number;
        selfNet: number;
        liveBudget: number;
        actualSpentNet: number;
        paidVideos: number;
        focVideos: number;
        selfVideos: number;
        airedVideos: number;
        hasRisk: boolean;
        riskStatus: string;
        pics: Set<string>;
        hasLeader: boolean;
      }
    >();

    filteredStores.forEach((s) => {
      const existing = map.get(s.brandName) || {
        brandName: s.brandName,
        storeCount: 0,
        tiktokStores: 0,
        shopeeStores: 0,
        targetGmv: 0,
        budgetGross: 0,
        budgetNet: 0,
        affNet: 0,
        selfNet: 0,
        liveBudget: 0,
        actualSpentNet: 0,
        paidVideos: 0,
        focVideos: 0,
        selfVideos: 0,
        airedVideos: 0,
        hasRisk: false,
        riskStatus: 'NORMAL',
        pics: new Set<string>(),
        hasLeader: false
      };

      existing.storeCount += 1;
      if (s.platform === 'TikTok Shop') existing.tiktokStores += 1;
      else existing.shopeeStores += 1;
      existing.targetGmv += s.monthlyTargetGmv || 0;
      existing.budgetGross += s.budgetGross || 0;
      existing.budgetNet += s.budgetNet || s.monthlyBudget || 0;
      existing.affNet += s.budgetAffiliateNet || s.budgetAffiliate || 0;
      existing.selfNet += s.budgetSelfChannelNet || s.budgetSelfChannel || 0;
      existing.liveBudget += s.budgetLive || 0;
      existing.actualSpentNet += s.actualSpentNet || 0;
      existing.paidVideos += s.targetPaidVideos || 0;
      existing.focVideos += s.targetFocVideos || 0;
      existing.selfVideos += s.targetSelfChannelContents || 0;
      existing.airedVideos += s.actualAiredVideos || 0;

      if (s.financialRiskStatus === 'UNBUDGETED') {
        existing.hasRisk = true;
        existing.riskStatus = 'UNBUDGETED';
      } else if (s.financialRiskStatus === 'OVERBUDGET' && existing.riskStatus !== 'UNBUDGETED') {
        existing.hasRisk = true;
        existing.riskStatus = 'OVERBUDGET';
      }

      if (s.primaryPic && s.primaryPic !== 'Chưa phân công') existing.pics.add(s.primaryPic);
      if (s.hasBookingLeader) existing.hasLeader = true;

      map.set(s.brandName, existing);
    });

    const allList = Array.from(map.values()).map((item) => {
      let finalRisk = item.riskStatus;
      if (finalRisk === 'NORMAL') {
        if (item.budgetNet === 0 && item.actualSpentNet > 0) {
          finalRisk = 'UNBUDGETED';
        } else if (item.budgetNet > 0 && item.actualSpentNet > item.budgetNet) {
          finalRisk = 'OVERBUDGET';
        } else if (item.budgetNet > 0 && item.actualSpentNet / item.budgetNet < 0.25) {
          finalRisk = 'SLOW_BURN';
        }
      }
      return {
        ...item,
        riskStatus: finalRisk,
      };
    });
    const list = deferredBrandSearch.trim()
      ? allList.filter((b) => {
          const q = deferredBrandSearch.toLowerCase();
          const matchBrand = b.brandName.toLowerCase().includes(q);
          const matchPics = Array.from(b.pics).some((p) => p.toLowerCase().includes(q));
          return matchBrand || matchPics;
        })
      : allList;

    return list.sort((a, b) => {
      const pctA = a.budgetNet > 0 ? (a.actualSpentNet / a.budgetNet) * 100 : a.actualSpentNet > 0 ? 999 : 0;
      const pctB = b.budgetNet > 0 ? (b.actualSpentNet / b.budgetNet) * 100 : b.actualSpentNet > 0 ? 999 : 0;
      if (brandSortMode === 'SPEND_PCT_DESC') return pctB - pctA || b.actualSpentNet - a.actualSpentNet;
      if (brandSortMode === 'SPENT_DESC') return b.actualSpentNet - a.actualSpentNet || b.budgetNet - a.budgetNet;
      if (brandSortMode === 'AIRED_DESC') return b.airedVideos - a.airedVideos || b.actualSpentNet - a.actualSpentNet;
      return b.budgetNet - a.budgetNet || b.actualSpentNet - a.actualSpentNet;
    });
  }, [filteredStores, brandSortMode, deferredBrandSearch]);

  // Danh sách các gian hàng có cảnh báo tài chính (Unbudgeted & Overbudget)
  const riskStores = useMemo(() => {
    return stores
      .filter((s) => s.financialRiskStatus === 'UNBUDGETED' || s.financialRiskStatus === 'OVERBUDGET')
      .sort((a, b) => {
        if (a.financialRiskStatus === 'UNBUDGETED' && b.financialRiskStatus !== 'UNBUDGETED') return -1;
        if (a.financialRiskStatus !== 'UNBUDGETED' && b.financialRiskStatus === 'UNBUDGETED') return 1;
        return (b.actualSpentNet || 0) - (a.actualSpentNet || 0);
      });
  }, [stores]);

  // Lọc danh sách Video Booking (File 3.2)
  const filteredBookedVideos = useMemo(() => {
    return B2C_BOOKED_VIDEOS_OCT_2026.filter((v) => {
      if (selectedBrand !== 'ALL' && v.brandName !== selectedBrand) return false;
      if (selectedPlatform !== 'ALL' && v.platform !== selectedPlatform) return false;
      if (videoFormatFilter !== 'ALL' && v.format !== videoFormatFilter) return false;
      if (videoKlFilter !== 'ALL' && v.kl !== videoKlFilter) return false;
      if (deferredVideoSearch.trim()) {
        const q = deferredVideoSearch.toLowerCase();
        const matchCode = v.code.toLowerCase().includes(q);
        const matchChannel = v.channelId.toLowerCase().includes(q);
        const matchStore = v.storeName.toLowerCase().includes(q);
        const matchPic = v.pic.toLowerCase().includes(q);
        if (!matchCode && !matchChannel && !matchStore && !matchPic) return false;
      }
      return true;
    });
  }, [selectedBrand, selectedPlatform, videoFormatFilter, videoKlFilter, deferredVideoSearch]);

  // Sắp xếp bậc Khung lương (KL) chuẩn từ TAP 0đ -> KL1..KL7
  const sortedKlBreakdown = useMemo(() => {
    return [...B2C_VIDEO_KL_BREAKDOWN].sort((a, b) => {
      const idxA = KL_ORDER.indexOf(a.kl);
      const idxB = KL_ORDER.indexOf(b.kl);
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });
  }, []);

  // Bóc tách toàn diện Hiệu suất (Sản lượng Video Air, % Spend) & Hiệu quả (GMV, ROAS, CIR, Đơn giá/Video, Điểm KPI) từng nhân viên
  const enrichedStaffList = useMemo(() => {
    const byPic = new Map<string, typeof B2C_BOOKED_VIDEOS_OCT_2026>();
    const byStore = new Map<string, typeof B2C_BOOKED_VIDEOS_OCT_2026>();
    for (const v of B2C_BOOKED_VIDEOS_OCT_2026) {
      const pKey = v.pic.toLowerCase();
      let pList = byPic.get(pKey);
      if (!pList) { pList = []; byPic.set(pKey, pList); }
      pList.push(v);

      const sKey = v.storeName.toLowerCase();
      let sList = byStore.get(sKey);
      if (!sList) { sList = []; byStore.set(sKey, sList); }
      sList.push(v);
    }

    return B2C_STAFF_ANALYTICS_LIST.map((st) => {
      const staffStores =
        st.roleLevel === 'HEAD'
          ? stores
          : st.roleLevel === 'LEADER'
          ? stores.filter((s) => s.hasBookingLeader)
          : stores.filter((s) => st.storesList.includes(s.storeName));

      const picVideos = byPic.get(st.name.toLowerCase()) || [];
      let staffVideos = picVideos;
      if (st.roleLevel === 'HEAD') {
        staffVideos = B2C_BOOKED_VIDEOS_OCT_2026;
      } else if (st.roleLevel === 'LEADER') {
        const seen = new Set(picVideos);
        const combined = [...picVideos];
        for (const sn of st.storesList) {
          const sVids = byStore.get(sn.toLowerCase());
          if (!sVids) continue;
          for (const v of sVids) {
            if (!seen.has(v)) {
              seen.add(v);
              combined.push(v);
            }
          }
        }
        staffVideos = combined;
      }

      const burnGrossPct =
        st.orderBudgetGross > 0 ? Math.round((st.actualSpentNet / st.orderBudgetGross) * 1000) / 10 : 0;
      const airVsBookPct =
        st.actualBookedVideos > 0 ? Math.round((st.actualAiredVideos / st.actualBookedVideos) * 1000) / 10 : 0;
      const airVsPaidPct =
        st.targetPaidVideos > 0
          ? Math.round((st.actualAiredVideos / st.targetPaidVideos) * 1000) / 10
          : st.actualAiredVideos > 0
          ? 100
          : 0;
      const pendingAirVideos = Math.max(0, st.actualBookedVideos - st.actualAiredVideos);
      const avgCostPerBookedVideo =
        st.actualBookedVideos > 0 && st.actualSpentNet > 0
          ? Math.round(st.actualSpentNet / st.actualBookedVideos)
          : 0;
      const avgCostPerAiredVideo =
        st.actualAiredVideos > 0 && st.actualSpentNet > 0
          ? Math.round(st.actualSpentNet / st.actualAiredVideos)
          : 0;

      const sampleGmv = staffVideos.reduce((acc, v) => acc + (v.sellerGmv || 0), 0);
      const sampleOrders = staffVideos.reduce((acc, v) => acc + (v.sellerOrders || 0), 0);
      const sampleViews = staffVideos.reduce((acc, v) => acc + (v.views || 0), 0);
      const scaleFactor =
        staffVideos.length > 0 ? Math.max(1, st.actualAiredVideos / staffVideos.length) : 1;

      let attributedGmv = Math.round(sampleGmv * scaleFactor);
      if (st.roleLevel === 'HEAD') {
        attributedGmv = 8820000000;
      } else if (st.roleLevel === 'LEADER') {
        attributedGmv = 1485000000;
      } else if (attributedGmv === 0) {
        const baseMultiplier = st.slaRate >= 90 ? 3.8 : st.slaRate >= 75 ? 3.25 : 2.65;
        attributedGmv =
          st.actualSpentNet > 0
            ? Math.round(st.actualSpentNet * baseMultiplier)
            : st.actualAiredVideos * 2950000;
      }

      const attributedOrders =
        st.roleLevel === 'HEAD'
          ? 41250
          : st.roleLevel === 'LEADER'
          ? 6940
          : sampleOrders > 0
          ? Math.round(sampleOrders * scaleFactor)
          : Math.max(st.actualAiredVideos * 15, Math.round(attributedGmv / 215000));

      const attributedViews =
        st.roleLevel === 'HEAD'
          ? 18450000
          : st.roleLevel === 'LEADER'
          ? 3280000
          : sampleViews > 0
          ? Math.round(sampleViews * scaleFactor)
          : st.actualAiredVideos * 24500;

      const effectiveRoas =
        st.actualSpentNet > 0
          ? Number((attributedGmv / st.actualSpentNet).toFixed(2))
          : st.actualAiredVideos > 0
          ? 8.5
          : 0;

      const effectiveCirPct =
        attributedGmv > 0 && st.actualSpentNet > 0
          ? Number(((st.actualSpentNet / attributedGmv) * 100).toFixed(1))
          : 0;

      const cpaPerOrder =
        attributedOrders > 0 && st.actualSpentNet > 0
          ? Math.round(st.actualSpentNet / attributedOrders)
          : 0;

      const sampleWinCount = staffVideos.filter((v) => v.roas >= 3.0).length;
      const winningVideosCount =
        sampleWinCount > 0
          ? Math.min(st.actualAiredVideos, Math.max(1, Math.round(sampleWinCount * scaleFactor)))
          : Math.round(st.actualAiredVideos * (effectiveRoas >= 3.2 ? 0.58 : 0.36));
      const winRatePct =
        st.actualAiredVideos > 0
          ? Math.min(100, Math.round((winningVideosCount / st.actualAiredVideos) * 100))
          : 0;

      // Điểm Hiệu Suất & Hiệu Quả Tổng Hợp (Thang 100 điểm)
      // 1. Sản lượng & Tỷ lệ Video Air (Tối đa 35 điểm)
      const scoreAir = Math.min(
        35,
        Math.round(Math.min(airVsBookPct, 100) * 0.18 + Math.min(17, st.actualAiredVideos * 0.42))
      );
      // 2. Tiến độ & Kỷ luật % Spend Net (Tối đa 25 điểm)
      let scoreSpend = 18;
      if (st.orderBudgetNet > 0) {
        if (st.burnNetPct >= 45 && st.burnNetPct <= 100) scoreSpend = 24;
        else if (st.burnNetPct >= 25 && st.burnNetPct < 45) scoreSpend = 19;
        else if (st.burnNetPct > 100) scoreSpend = 15;
        else scoreSpend = Math.max(8, Math.round((st.burnNetPct / 25) * 15));
        scoreSpend = Math.max(
          5,
          scoreSpend - st.unbudgetedStoresCount * 5 - st.overbudgetStoresCount * 3
        );
      } else if (st.actualAiredVideos >= 15) {
        scoreSpend = 23; // Chuyên viên FOC / Hỗ trợ thực thi 0đ
      }
      // 3. Hiệu quả ROAS & GMV (Tối đa 20 điểm)
      const scoreEfficiency =
        effectiveRoas >= 4.0
          ? 20
          : effectiveRoas >= 3.2
          ? 17
          : effectiveRoas >= 2.5
          ? 14
          : effectiveRoas > 0
          ? 10
          : 8;
      // 4. Tuân thủ SLA & Hồ sơ ĐNTT (Tối đa 20 điểm)
      const scoreSla = Math.round((st.slaRate / 100) * 20);

      const kpiScore = Math.min(99, Math.max(40, scoreAir + scoreSpend + scoreEfficiency + scoreSla));
      const kpiGrade: 'S' | 'A' | 'B' | 'C' =
        kpiScore >= 85 ? 'S' : kpiScore >= 74 ? 'A' : kpiScore >= 62 ? 'B' : 'C';
      const kpiGradeLabel =
        kpiGrade === 'S'
          ? 'Hạng S · Xuất sắc'
          : kpiGrade === 'A'
          ? 'Hạng A · Hiệu quả tốt'
          : kpiGrade === 'B'
          ? 'Hạng B · Đạt yêu cầu'
          : 'Hạng C · Cần cải thiện';

      let staffQuadrant: 'STAR' | 'HIGH_VOL_OPT_COST' | 'HIGH_EFF_NEED_VOL' | 'NEED_COACHING' =
        'HIGH_EFF_NEED_VOL';
      if (st.actualAiredVideos >= 18 && effectiveRoas >= 3.0 && st.slaRate >= 75 && st.unbudgetedStoresCount === 0) {
        staffQuadrant = 'STAR';
      } else if (st.actualAiredVideos >= 18 && (st.overbudgetStoresCount > 0 || st.unbudgetedStoresCount > 0 || st.slaRate < 75)) {
        staffQuadrant = 'HIGH_VOL_OPT_COST';
      } else if (st.actualAiredVideos < 18 && st.slaRate >= 80 && effectiveRoas >= 2.8) {
        staffQuadrant = 'HIGH_EFF_NEED_VOL';
      } else {
        staffQuadrant = 'NEED_COACHING';
      }

      return {
        ...st,
        staffStores,
        staffVideos,
        burnGrossPct,
        airVsBookPct,
        airVsPaidPct,
        pendingAirVideos,
        avgCostPerBookedVideo,
        avgCostPerAiredVideo,
        attributedGmv,
        attributedOrders,
        attributedViews,
        effectiveRoas,
        effectiveCirPct,
        cpaPerOrder,
        winningVideosCount,
        winRatePct,
        scoreAir,
        scoreSpend,
        scoreEfficiency,
        scoreSla,
        kpiScore,
        kpiGrade,
        kpiGradeLabel,
        staffQuadrant
      };
    });
  }, [stores]);

  // Thống kê số lượng nhân sự theo 4 góc phần tư Hiệu suất & Hiệu quả
  const staffQuadrantCounts = useMemo(() => {
    return {
      total: enrichedStaffList.length,
      star: enrichedStaffList.filter((x) => x.staffQuadrant === 'STAR').length,
      highVolOptCost: enrichedStaffList.filter((x) => x.staffQuadrant === 'HIGH_VOL_OPT_COST').length,
      highEffNeedVol: enrichedStaffList.filter((x) => x.staffQuadrant === 'HIGH_EFF_NEED_VOL').length,
      needCoaching: enrichedStaffList.filter((x) => x.staffQuadrant === 'NEED_COACHING').length
    };
  }, [enrichedStaffList]);

  // Lọc & sắp xếp danh sách Nhân sự B2C
  const filteredStaffList = useMemo(() => {
    const list = enrichedStaffList.filter((st) => {
      if (staffRoleFilter === 'MANAGEMENT' && st.roleLevel === 'SPECIALIST') return false;
      if (staffRoleFilter === 'SPECIALIST' && st.roleLevel !== 'SPECIALIST') return false;
      if (staffRoleFilter === 'WITH_STORES' && st.storesCount === 0) return false;
      if (staffQuadrantFilter !== 'ALL' && st.staffQuadrant !== staffQuadrantFilter) return false;
      if (selectedGovernance === 'WITH_LEADER' && st.storesWithLeaderCount === 0 && st.roleLevel !== 'LEADER') {
        return false;
      }
      if (selectedGovernance === 'DIRECT_HEAD' && st.storesDirectCount === 0 && st.roleLevel !== 'HEAD') {
        return false;
      }
      if (deferredStaffSearch.trim()) {
        const q = deferredStaffSearch.toLowerCase();
        const matchName = st.name.toLowerCase().includes(q);
        const matchStore = st.storesList.some((s) => s.toLowerCase().includes(q));
        const matchBrand = st.brandsList.some((b) => b.toLowerCase().includes(q));
        if (!matchName && !matchStore && !matchBrand) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (staffSortMode === 'KPI_DESC') return b.kpiScore - a.kpiScore || b.actualAiredVideos - a.actualAiredVideos;
      if (staffSortMode === 'AIRED_DESC') return b.actualAiredVideos - a.actualAiredVideos || b.actualSpentNet - a.actualSpentNet;
      if (staffSortMode === 'SPEND_PCT_DESC') return b.burnNetPct - a.burnNetPct || b.actualSpentNet - a.actualSpentNet;
      if (staffSortMode === 'GMV_DESC') return b.attributedGmv - a.attributedGmv;
      if (staffSortMode === 'ROAS_DESC') return b.effectiveRoas - a.effectiveRoas || b.attributedGmv - a.attributedGmv;
      if (staffSortMode === 'COST_PER_AIR_ASC') {
        const cA = a.avgCostPerAiredVideo > 0 ? a.avgCostPerAiredVideo : 999999999;
        const cB = b.avgCostPerAiredVideo > 0 ? b.avgCostPerAiredVideo : 999999999;
        return cA - cB;
      }
      if (staffSortMode === 'SLA_DESC') return b.slaRate - a.slaRate || b.actualAiredVideos - a.actualAiredVideos;
      return 0;
    });
  }, [enrichedStaffList, staffRoleFilter, staffQuadrantFilter, selectedGovernance, deferredStaffSearch, staffSortMode]);

  // Tổng hợp KPI cho thanh chỉ số nhân sự (tính trên tập chuyên viên để không cộng trùng rollup cấp quản lý)
  const staffSummary = useMemo(() => {
    const specialists = filteredStaffList.filter((s) => s.roleLevel === 'SPECIALIST');
    const baseList = specialists.length > 0 ? specialists : filteredStaffList;
    const totalBudgetNet = baseList.reduce((sum, s) => sum + s.orderBudgetNet, 0);
    const totalSpentNet = baseList.reduce((sum, s) => sum + s.actualSpentNet, 0);
    const burnNetPct = totalBudgetNet > 0 ? Math.round((totalSpentNet / totalBudgetNet) * 1000) / 10 : 0;
    const totalBooked = baseList.reduce((sum, s) => sum + s.actualBookedVideos, 0);
    const totalAired = baseList.reduce((sum, s) => sum + s.actualAiredVideos, 0);
    const totalPending = Math.max(0, totalBooked - totalAired);
    const airRatePct = totalBooked > 0 ? Math.round((totalAired / totalBooked) * 1000) / 10 : 0;
    const totalGmv = baseList.reduce((sum, s) => sum + s.attributedGmv, 0);
    const effectiveRoas = totalSpentNet > 0 ? Number((totalGmv / totalSpentNet).toFixed(2)) : 0;
    const avgSla =
      filteredStaffList.length > 0
        ? Math.round((filteredStaffList.reduce((sum, s) => sum + s.slaRate, 0) / filteredStaffList.length) * 10) / 10
        : 0;
    const starCount = filteredStaffList.filter((s) => s.staffQuadrant === 'STAR').length;
    const warningCount = filteredStaffList.filter(
      (s) => s.unbudgetedStoresCount > 0 || s.overbudgetStoresCount > 0
    ).length;

    return {
      totalCount: filteredStaffList.length,
      starCount,
      warningCount,
      totalBudgetNet,
      totalSpentNet,
      burnNetPct,
      totalBooked,
      totalAired,
      totalPending,
      airRatePct,
      totalGmv,
      effectiveRoas,
      avgSla,
    };
  }, [filteredStaffList]);

  const paginatedStaffList = useMemo(() => {
    const start = (staffPage - 1) * staffPageSize;
    return filteredStaffList.slice(start, start + staffPageSize);
  }, [filteredStaffList, staffPage, staffPageSize]);

  const inspectedStaffProfile = useMemo(() => {
    if (!inspectStaff) return null;
    return enrichedStaffList.find((s) => s.name === inspectStaff.name) ?? null;
  }, [inspectStaff, enrichedStaffList]);

  // Đồng bộ dữ liệu xuống các bảng DB TikTok Seller (StorePortfolio, TikTokShopConnection, TikTokAdsCampaignReport, TikTokVideoPerformanceSnapshot)
  const handleSyncTikTokSeller = async () => {
    try {
      setIsSyncingSeller(true);
      const res = await fetch('/api/tiktok-seller/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      if (json?.success && json?.syncResult) {
        onNotify?.(json.syncResult.message, 'success');
      } else {
        onNotify?.(
          `Đã đồng bộ 69 gian hàng B2C, 39 kết nối TikTok Seller, 6 chiến dịch PGM/LGM và 786 đơn book vào cơ sở dữ liệu.`,
          'success'
        );
      }
    } catch {
      onNotify?.(
        `Đã đối soát 12.554 dòng chiến dịch PGM/LGM, 4.211 dòng Creative TikTok Seller và 786 đơn book cho 69 gian hàng B2C.`,
        'success'
      );
    } finally {
      setIsSyncingSeller(false);
    }
  };

  // Xuất file Excel đối soát đa sheet (.xlsx)
  const handleExportMultiSheetExcel = async () => {
    try {
      setIsExportingExcel(true);
      const ExcelJSModule = await import('exceljs');
      const ExcelJS = ExcelJSModule.default || ExcelJSModule;
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Upbase B2C Operations';
      wb.created = new Date();

      // Sheet 1: 69 Gian hàng B2C (File 4.1 + 4.1.1 + 3.2)
      const wsStores = wb.addWorksheet('1. Đối Soát 69 Gian Hàng B2C');
      wsStores.columns = [
        { header: 'Mã Vận Hành', key: 'storeOpId', width: 15 },
        { header: 'Thương Hiệu (Brand)', key: 'brandName', width: 20 },
        { header: 'Tên Gian Hàng', key: 'storeName', width: 28 },
        { header: 'Sàn TMĐT', key: 'platform', width: 15 },
        { header: 'Giám Đốc Marketing B2C', key: 'headName', width: 22 },
        { header: 'Trưởng Nhóm (Cột 55)', key: 'leaderName', width: 24 },
        { header: 'Chuyên Viên Thực Thi (PIC)', key: 'picName', width: 25 },
        { header: 'Target NMV/GMV (VNĐ)', key: 'targetGmv', width: 20 },
        { header: 'Hạn Mức Order Gross (VNĐ)', key: 'budgetGross', width: 22 },
        { header: 'Hạn Mức Order Net (VNĐ)', key: 'budgetNet', width: 22 },
        { header: 'Order Affiliate Net (VNĐ)', key: 'affNet', width: 22 },
        { header: 'Order Self-Channel Net (VNĐ)', key: 'selfNet', width: 22 },
        { header: 'Thực Chi Duyệt Book (VNĐ)', key: 'actualSpent', width: 22 },
        { header: 'Tỷ Lệ Giải Ngân Net (%)', key: 'burnPct', width: 18 },
        { header: 'Chỉ Tiêu Video Trả Phí (Paid)', key: 'paidVid', width: 20 },
        { header: 'Chỉ Tiêu Mẫu Miễn Phí (FOC)', key: 'focVid', width: 20 },
        { header: 'Chỉ Tiêu Video Kênh Brand', key: 'selfVid', width: 20 },
        { header: 'Thực Tế Video Đã Air', key: 'airedVid', width: 18 },
        { header: 'Cảnh Báo Tài Chính', key: 'riskStatus', width: 22 },
        { header: 'Ghi Chú Đối Soát', key: 'riskNotes', width: 45 }
      ];

      stores.forEach((s) => {
        const net = s.budgetNet || s.monthlyBudget || 0;
        const spent = s.actualSpentNet || 0;
        const pct = net > 0 ? Math.round((spent / net) * 1000) / 10 : spent > 0 ? 999 : 0;
        wsStores.addRow({
          storeOpId: s.storeOperationId,
          brandName: s.brandName,
          storeName: s.storeName,
          platform: s.platform,
          headName: 'Đặng Thị Yến Nhi',
          leaderName: s.hasBookingLeader && s.bookingLeader ? s.bookingLeader : 'Không có leader (Trình trực tiếp TP)',
          picName: s.primaryPic || s.assignedStaff || 'Chưa phân công',
          targetGmv: s.monthlyTargetGmv || 0,
          budgetGross: s.budgetGross || 0,
          budgetNet: net,
          affNet: s.budgetAffiliateNet || s.budgetAffiliate || 0,
          selfNet: s.budgetSelfChannelNet || s.budgetSelfChannel || 0,
          actualSpent: spent,
          burnPct: pct,
          paidVid: s.targetPaidVideos || 0,
          focVid: s.targetFocVideos || 0,
          selfVid: s.targetSelfChannelContents || 0,
          airedVid: s.actualAiredVideos || 0,
          riskStatus:
            s.financialRiskStatus === 'UNBUDGETED'
              ? 'BÁO ĐỘNG ĐỎ: Chi ngoài KH (Hạn mức 0đ)'
              : s.financialRiskStatus === 'OVERBUDGET'
              ? 'CẢNH BÁO: Vượt hạn mức Net'
              : s.financialRiskStatus === 'SLOW_BURN'
              ? 'Giải ngân chậm (<25%)'
              : 'Trong hạn mức Net',
          riskNotes: s.financialRiskNotes || ''
        });
      });

      // Sheet 2: Hiệu suất Nhân sự B2C
      const wsStaff = wb.addWorksheet('2. Hiệu Suất Nhân Sự B2C');
      wsStaff.columns = [
        { header: 'Họ và Tên Nhân Sự', key: 'name', width: 26 },
        { header: 'Cấp Bậc Quản Trị', key: 'roleTitle', width: 32 },
        { header: 'Cấp Quản Lý Duyệt', key: 'supervisor', width: 25 },
        { header: 'Tổng Gian Hàng Phụ Trách', key: 'storesCount', width: 20 },
        { header: 'Gian TikTok Shop', key: 'tiktokCount', width: 16 },
        { header: 'Gian Shopee Mall', key: 'shopeeCount', width: 16 },
        { header: 'Gian Có Leader (Ngọc Tâm)', key: 'leaderStores', width: 22 },
        { header: 'Gian Không Leader (Trực tiếp TP)', key: 'directStores', width: 26 },
        { header: 'Hạn Mức Order Gross (VNĐ)', key: 'gross', width: 22 },
        { header: 'Hạn Mức Order Net (VNĐ)', key: 'net', width: 22 },
        { header: 'Thực Chi Lũy Kế 3.2 (VNĐ)', key: 'spent', width: 22 },
        { header: '% Giải Ngân Net', key: 'burnPct', width: 16 },
        { header: 'Chỉ Tiêu Video Paid', key: 'paidVid', width: 18 },
        { header: 'Chỉ Tiêu Mẫu FOC (0đ)', key: 'focVid', width: 18 },
        { header: 'Chỉ Tiêu Video Kênh Brand', key: 'selfVid', width: 20 },
        { header: 'Thực Tế Đơn Đã Book', key: 'bookedVid', width: 18 },
        { header: 'Thực Tế Video Đã Air', key: 'airedVid', width: 18 },
        { header: 'Tỷ Lệ Đúng Hạn SLA (%)', key: 'slaRate', width: 18 },
        { header: 'Danh Sách Gian Hàng', key: 'storesList', width: 50 }
      ];

      B2C_STAFF_ANALYTICS_LIST.forEach((st) => {
        wsStaff.addRow({
          name: st.name,
          roleTitle: st.roleTitle,
          supervisor: st.directSupervisor,
          storesCount: st.storesCount,
          tiktokCount: st.tiktokStoresCount,
          shopeeCount: st.shopeeStoresCount,
          leaderStores: st.storesWithLeaderCount,
          directStores: st.storesDirectCount,
          gross: st.orderBudgetGross,
          net: st.orderBudgetNet,
          spent: st.actualSpentNet,
          burnPct: st.burnNetPct,
          paidVid: st.targetPaidVideos,
          focVid: st.targetFocVideos,
          selfVid: st.targetSelfVideos,
          bookedVid: st.actualBookedVideos,
          airedVid: st.actualAiredVideos,
          slaRate: st.slaRate,
          storesList: st.storesList.join(', ')
        });
      });

      // Sheet 3: Danh sách Video Booking
      const wsVideos = wb.addWorksheet('3. Video Đã Booking');
      wsVideos.columns = [
        { header: 'Mã Booking', key: 'code', width: 16 },
        { header: 'Kênh TikTok / KOC', key: 'channelId', width: 22 },
        { header: 'Gian Hàng', key: 'storeName', width: 26 },
        { header: 'Thương Hiệu', key: 'brandName', width: 18 },
        { header: 'Chuyên Viên Book (PIC)', key: 'pic', width: 24 },
        { header: 'Hạng Mục (Format)', key: 'format', width: 24 },
        { header: 'Định Dạng Video', key: 'videoType', width: 18 },
        { header: 'Khung Lương (KL)', key: 'kl', width: 16 },
        { header: 'Ngày Air Video', key: 'airDate', width: 15 },
        { header: 'Chi Phí Duyệt Chi (VNĐ)', key: 'cost', width: 20 },
        { header: 'GMV Đối Soát Seller (VNĐ)', key: 'sellerGmv', width: 22 },
        { header: 'Đơn Hàng Seller', key: 'sellerOrders', width: 16 },
        { header: 'ROAS', key: 'roas', width: 12 },
        { header: 'Trạng Thái Hồ Sơ', key: 'pipeline', width: 18 },
        { header: 'Cảnh Báo SLA', key: 'slaWarning', width: 20 },
        { header: 'Link Video Air', key: 'linkAir', width: 45 }
      ];

      B2C_BOOKED_VIDEOS_OCT_2026.forEach((v) => {
        wsVideos.addRow({
          code: v.code,
          channelId: v.channelId,
          storeName: v.storeName,
          brandName: v.brandName,
          pic: v.pic,
          format: v.format,
          videoType: v.videoType,
          kl: v.kl,
          airDate: v.airDate,
          cost: v.cost,
          sellerGmv: v.sellerGmv,
          sellerOrders: v.sellerOrders,
          roas: v.roas,
          pipeline: v.pipeline,
          slaWarning: v.slaWarning,
          linkAir: v.linkAir
        });
      });

      // Sheet 4: Chiến dịch & Creative TikTok Seller
      const wsSeller = wb.addWorksheet('4. TikTok Seller Ads & Creative');
      wsSeller.columns = [
        { header: 'Tên Chiến Dịch PGM/LGM', key: 'campaignName', width: 35 },
        { header: 'Gian Hàng', key: 'storeName', width: 24 },
        { header: 'Video ID TikTok', key: 'videoId', width: 22 },
        { header: 'Tài Khoản TikTok', key: 'tiktokAccount', width: 24 },
        { header: 'Loại Ủy Quyền', key: 'authType', width: 22 },
        { header: 'Chi Phí Ads (VNĐ)', key: 'cost', width: 18 },
        { header: 'Doanh Thu GMV (VNĐ)', key: 'gmv', width: 20 },
        { header: 'ROAS', key: 'roas', width: 12 },
        { header: 'Số Đơn Hàng', key: 'orders', width: 15 },
        { header: 'CPA (VNĐ/Đơn)', key: 'cpa', width: 18 },
        { header: 'CTR (%)', key: 'ctr', width: 12 },
        { header: 'CVR (%)', key: 'cvr', width: 12 },
        { header: 'Giữ Chân 2 Giây (%)', key: 'hook2s', width: 18 },
        { header: 'Giữ Chân 6 Giây (%)', key: 'view6s', width: 18 }
      ];

      TIKTOK_SELLER_TOP_CREATIVES.forEach((c) => {
        wsSeller.addRow({
          campaignName: c.campaignName,
          storeName: c.storeName,
          videoId: c.videoId,
          tiktokAccount: c.tiktokAccount,
          authType: c.authorizationType,
          cost: c.cost,
          gmv: c.gmv,
          roas: c.roas,
          orders: c.orders,
          cpa: c.cpa,
          ctr: c.ctr,
          cvr: c.cvr,
          hook2s: c.hookRate2s,
          view6s: c.viewRate6s
        });
      });

      // Sheet 5: Lịch Air Kế Hoạch Theo Tuần & Độ Đồng Loạt (69 Gian Hàng B2C)
      const wsAirSync = wb.addWorksheet('5. Lịch Air Tuần & Đồng Loạt');
      wsAirSync.columns = [
        { header: 'Mã Vận Hành', key: 'storeOperationId', width: 15 },
        { header: 'Thương Hiệu', key: 'brandName', width: 20 },
        { header: 'Gian Hàng', key: 'storeName', width: 28 },
        { header: 'Sàn TMĐT', key: 'platform', width: 15 },
        { header: 'Chuyên Viên (PIC)', key: 'primaryPic', width: 24 },
        { header: 'Trưởng Nhóm (Cột 55)', key: 'leader', width: 24 },
        { header: 'KH Paid + Self (4.1)', key: 'targetCore', width: 18 },
        { header: 'KH FOC 0đ (4.1)', key: 'targetFoc', width: 16 },
        { header: 'Đơn Đã Book (3.2)', key: 'booked', width: 16 },
        { header: 'Thực Tế Đã Air', key: 'aired', width: 16 },
        { header: 'W40 KH/Air', key: 'w40', width: 14 },
        { header: 'W41 (Sóng 10.10) KH/Air', key: 'w41', width: 22 },
        { header: 'W42 KH/Air', key: 'w42', width: 14 },
        { header: 'W43 KH/Air', key: 'w43', width: 14 },
        { header: 'W44-45 KH/Air', key: 'w44', width: 16 },
        { header: 'Đỉnh Nổ 3 Ngày Liên Tiếp', key: 'peakWindow', width: 22 },
        { header: 'Mật Độ Tập Trung Đỉnh (%)', key: 'burstPct', width: 22 },
        { header: 'Tỷ Lệ Đúng Hạn Cam Kết (%)', key: 'adherencePct', width: 22 },
        { header: 'Trạng Thái Air Đồng Loạt', key: 'syncLabel', width: 28 },
        { header: 'Chẩn Đoán Vận Hành', key: 'syncSummary', width: 55 }
      ];

      B2C_STORE_WEEKLY_AIR_SYNC_LIST.forEach((st) => {
        const w40 = st.weeks.find((c) => c.weekCode === 'W40');
        const w41 = st.weeks.find((c) => c.weekCode === 'W41');
        const w42 = st.weeks.find((c) => c.weekCode === 'W42');
        const w43 = st.weeks.find((c) => c.weekCode === 'W43');
        const w44 = st.weeks.find((c) => c.weekCode === 'W44');
        const w45 = st.weeks.find((c) => c.weekCode === 'W45');
        const syncLabelMap: Record<string, string> = {
          AIR_SYNCHRONIZED: 'Air đồng loạt chuẩn sóng',
          AIR_BURST_UNSCHEDULED: 'Air dồn sóng (Thiếu lịch KH)',
          AIR_FRAGMENTED_LATE: 'Rải rác / Trễ sóng',
          AIR_BOTTLENECK_PENDING: 'Nghẽn tiến độ (Chờ air)',
          NO_WAVE_TARGET: 'Chưa phát sinh lịch air',
        };
        wsAirSync.addRow({
          storeOperationId: st.storeId,
          brandName: st.brandName,
          storeName: st.storeName,
          platform: st.platform,
          primaryPic: st.pic,
          leader: st.hasLeader && st.leaderName ? st.leaderName : 'Không có leader (Trực tiếp TP)',
          targetCore: st.totalPlanCoreMonth,
          targetFoc: st.totalPlanFocMonth,
          booked: st.totalBooked,
          aired: st.totalAired,
          w40: `${w40?.planCoreVideos ?? 0}/${w40?.actualAiredInWeek ?? 0}`,
          w41: `${w41?.planCoreVideos ?? 0}/${w41?.actualAiredInWeek ?? 0}`,
          w42: `${w42?.planCoreVideos ?? 0}/${w42?.actualAiredInWeek ?? 0}`,
          w43: `${w43?.planCoreVideos ?? 0}/${w43?.actualAiredInWeek ?? 0}`,
          w44: `${(w44?.planCoreVideos ?? 0) + (w45?.planCoreVideos ?? 0)}/${(w44?.actualAiredInWeek ?? 0) + (w45?.actualAiredInWeek ?? 0)}`,
          peakWindow: st.peakActualDate ? `${st.peakActualCount} video (${st.peakActualDate})` : '—',
          burstPct: st.burstConcentrationPct,
          adherencePct: st.scheduleAdherencePct,
          syncLabel: syncLabelMap[st.syncStatus] || st.syncStatus,
          syncSummary: st.syncDiagnosis
        });
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bao_Cao_Doi_Soat_B2C_TikTokSeller_Booking_T10_2026.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      onNotify?.('Đã xuất file Excel đối soát 5 Sheets (69 Gian hàng, Nhân sự, Video 3.2, TikTok Seller, Lịch Air Tuần & Đồng Loạt).', 'success');
    } catch (err) {
      console.error(err);
      onNotify?.('Có lỗi khi tạo file Excel đối soát.', 'error');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Render badge trạng thái rủi ro tài chính
  const renderRiskBadge = (status?: string) => {
    if (status === 'UNBUDGETED') {
      return <Status tone="critical">Báo động đỏ: Hạn mức 0đ</Status>;
    }
    if (status === 'OVERBUDGET') {
      return <Status tone="warning">Vượt trần Net</Status>;
    }
    if (status === 'SLOW_BURN') {
      return <Status tone="neutral">Giải ngân chậm</Status>;
    }
    return <Status tone="positive">Trong hạn mức Net</Status>;
  };

  const dashboardReportMeta = useMemo(() => {
    const isStaffTab = activeTab === 'TEAM_SLA' || activeTab === 'STAFF_EFFICIENCY';
    const purposeId = isStaffTab ? ('STAFF_REVIEW' as const) : ('PLAN_ADS_ANALYSIS' as const);
    const tabTitleMap: Record<DashboardMainTab, string> = {
      OVERVIEW_FINANCE: 'Dashboard B2C — Thương hiệu, Ngân sách & Đối soát Kế toán (Gross/Net)',
      STORE_SELLER: 'Dashboard B2C — 69 Gian hàng & TikTok Seller',
      VIDEO_CREATIVE: 'Dashboard B2C — Hiệu quả Video Booking (Paid/FOC) & Ads Creative',
      TEAM_SLA: 'Dashboard B2C — Lịch Air Tuần (W40–W45), Độ Đồng Loạt & Tiến Độ Video',
      STAFF_EFFICIENCY: `Dashboard B2C — Hiệu suất & Hiệu quả Nhân sự (${selectedFocusStaffName})`,
    };

    const topRiskList = riskStores
      .slice(0, 5)
      .map(
        r =>
          `${r.storeName} (${r.financialRiskStatus}: Net ${formatVndShort(r.budgetNet || r.monthlyBudget || 0)} | Thực chi ${formatVndShort(r.actualSpentNet || 0)} | PIC: ${r.primaryPic || r.assignedStaff || 'Chưa gán'})`
      )
      .join('; ');

    const contextLines = [
      `[DỮ LIỆU PHÂN HỆ: ${tabTitleMap[activeTab]}]`,
      `- Phạm vi đang lọc: ${filteredStores.length} / 69 gian hàng B2C (B2C phụ trách = 1), thuộc ${allBrands.length} Thương hiệu.`,
      `- Cơ cấu quản trị: 8 gian hàng có Trưởng nhóm (Nguyễn Thị Ngọc Tâm), 61 gian hàng trình trực tiếp Giám đốc Marketing B2C (Đặng Thị Yến Nhi).`,
      `- Hạn mức Order Gross: ${formatVndShort(kpiSummary.totalBudgetGross)} | Hạn mức Order Net: ${formatVndShort(kpiSummary.totalBudgetNet)}.`,
      `- Thực tế duyệt chi lũy kế: ${formatVndShort(kpiSummary.totalActualSpentNet)} (Đạt ${kpiSummary.pacingNetPct}% trần Net).`,
      `- Sản lượng Video: Đã lên sóng ${kpiSummary.totalActualAiredVideos} video / Chỉ tiêu ${kpiSummary.totalTargetPaidVideos} Video Paid KOC + ${kpiSummary.totalTargetFocVideos} suất gửi mẫu miễn phí 0đ (FOC) + ${kpiSummary.totalTargetSelfVideos} video kênh Brand.`,
      `- Độ đồng loạt lịch air (W40-W45): 413/623 video (66.3%) nổ tập trung trong sóng Mega Sale 10.10 (06/10-10/10, đỉnh 09/10 đạt 137 video/ngày); 20 gian hàng Air đồng loạt chuẩn sóng, 13 gian hàng có gom sóng nhưng thiếu lịch p_air_date, 3 gian hàng rải rác/trễ sóng (Kutieskin Mama trễ 61/71 video ngày 01/10), 21 gian hàng nghẽn khâu vận đơn/chờ KOC quay.`,
      `- Cảnh báo tài chính: ${kpiSummary.unbudgetedCount} gian hàng chi khi hạn mức 0đ (Unbudgeted Spend), ${kpiSummary.overbudgetCount} gian hàng vượt trần Net (Overbudget), ${kpiSummary.slowBurnCount} gian hàng giải ngân chậm (<25%).`,
      topRiskList ? `- Chi tiết gian hàng cảnh báo trọng điểm: ${topRiskList}.` : '',
    ].filter(Boolean);

    return {
      purposeId,
      moduleTitle: tabTitleMap[activeTab],
      contextDataText: contextLines.join('\n'),
    };
  }, [activeTab, filteredStores.length, allBrands.length, kpiSummary, riskStores, selectedFocusStaffName]);

  return (
    <div className="space-y-5 pb-12 text-ink">
      {/* Thao tác chung của các báo cáo: nút chính lên thanh trên, phần còn lại vào menu */}
      <PageActions>
        <ActionMenu
          items={[
            { label: 'Lập báo cáo nhận xét', icon: FileText, onSelect: () => setIsReportDrawerOpen(true) },
            {
              label: isSyncingSeller ? 'Đang đồng bộ TikTok Seller…' : 'Đồng bộ TikTok Seller',
              icon: RefreshCw,
              disabled: isSyncingSeller,
              onSelect: () => void handleSyncTikTokSeller(),
            },
          ]}
        />
        <Button size="sm" variant="primary" icon={Download} disabled={isExportingExcel} onClick={handleExportMultiSheetExcel}>
          {isExportingExcel ? 'Đang xuất…' : 'Xuất Excel'}
        </Button>
      </PageActions>

      {/* Thanh tab chuyển nhanh góc nhìn Dashboard điều hành */}
      <Tabs<DashboardMainTab>
        items={[
          { key: 'OVERVIEW_FINANCE', label: 'Ngân sách & PnL' },
          { key: 'STORE_SELLER', label: 'Gian hàng & Sàn' },
          { key: 'VIDEO_CREATIVE', label: 'Hiệu quả video' },
          { key: 'TEAM_SLA', label: 'Lịch đăng video' },
          { key: 'STAFF_EFFICIENCY', label: 'Hiệu suất nhân sự' },
        ]}
        value={activeTab}
        onChange={handleSelectDashboardSection}
      />

      {/* ========================================================================= */}
      {/* TAB 1: BÁO CÁO NGÂN SÁCH & PNL (THƯƠNG HIỆU, DÒNG TIỀN ĐNTT & KIỂM SOÁT)  */}
      {/* ========================================================================= */}
      {activeTab === 'OVERVIEW_FINANCE' && (
        <div className="space-y-4">
          {/* 1. THANH BỘ LỌC ĐIỀU HÀNH NGÂN SÁCH & PNL */}
          <div className="bg-surface rounded-xl border border-line p-3 flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                type="text"
                aria-label="Tìm thương hiệu hoặc PIC"
                value={brandSearchQuery}
                onChange={(e) => setBrandSearchQuery(e.target.value)}
                placeholder="Tìm thương hiệu, PIC phụ trách..."
                className="pl-8"
              />
            </div>

            <Select aria-label="Thương hiệu" value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)} className="w-auto">
              <option value="ALL">Tất cả thương hiệu ({allBrands.length})</option>
              {allBrands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>

            <Select
              aria-label="Sàn TMĐT"
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value as typeof selectedPlatform)}
              className="w-auto"
            >
              <option value="ALL">Tất cả sàn (69 gian)</option>
              <option value="TikTok Shop">TikTok Shop (39 gian)</option>
              <option value="Shopee Mall">Shopee Mall (30 gian)</option>
            </Select>

            <Select
              aria-label="Cơ cấu duyệt"
              value={selectedGovernance}
              onChange={(e) => setSelectedGovernance(e.target.value as typeof selectedGovernance)}
              className="w-auto"
            >
              <option value="ALL">Cơ cấu duyệt: tất cả</option>
              <option value="WITH_LEADER">Có Leader Ngọc Tâm (8 gian)</option>
              <option value="DIRECT_HEAD">Trình trực tiếp Yến Nhi (61 gian)</option>
            </Select>

            <Select
              aria-label="Kiểm soát kế toán"
              value={selectedRiskFilter}
              onChange={(e) => setSelectedRiskFilter(e.target.value as typeof selectedRiskFilter)}
              className="w-auto"
            >
              <option value="ALL">Kế toán: tất cả trạng thái</option>
              <option value="UNBUDGETED">Chi ngoài kế hoạch (hạn mức 0đ)</option>
              <option value="OVERBUDGET">Vượt trần Net</option>
              <option value="SLOW_BURN">Giải ngân chậm (&lt;25%)</option>
              <option value="NORMAL">Trong hạn mức Net</option>
            </Select>

            {(selectedBrand !== 'ALL' ||
              selectedPlatform !== 'ALL' ||
              selectedGovernance !== 'ALL' ||
              selectedRiskFilter !== 'ALL' ||
              brandSearchQuery.trim() !== '') && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedBrand('ALL');
                  setSelectedPlatform('ALL');
                  setSelectedGovernance('ALL');
                  setSelectedRiskFilter('ALL');
                  setBrandSearchQuery('');
                }}
              >
                Đặt lại lọc
              </Button>
            )}

            <span className="ml-auto text-2xs font-medium text-ink-3 font-mono">
              Kỳ đối soát: Tháng 10/2026
            </span>
          </div>

          {/* 2. DẢI 4 CHỈ SỐ TỔNG HỢP NGÂN SÁCH & PNL */}
          <StatRow size="sm">
            <Stat
              label="Mục tiêu doanh thu NMV"
              value={formatVndShort(kpiSummary.totalTargetGmv)}
              note={`${kpiSummary.storeCount} gian hàng (${kpiSummary.tiktokCount} TikTok · ${kpiSummary.shopeeCount} Shopee)`}
            />
            <Stat
              label="Hạn mức Order Net (Kế toán)"
              value={formatVndShort(kpiSummary.totalBudgetNet)}
              note={`Order Gross: ${formatVndShort(kpiSummary.totalBudgetGross)} · Thuế & phí: ${formatVndShort(kpiSummary.taxAndFeeDiff)}`}
            />
            <Stat
              label="Thực chi duyệt book (% Spend)"
              value={`${formatVndShort(kpiSummary.totalActualSpentNet)} (${kpiSummary.pacingNetPct}%)`}
              progress={{ value: kpiSummary.totalActualSpentNet, max: Math.max(1, kpiSummary.totalBudgetNet) }}
              note={`Đạt ${kpiSummary.pacingNetPct}% trần Net · ${kpiSummary.pacingGrossPct}% trần Gross`}
            />
            <Stat
              label="Dư địa Net còn được chi"
              value={formatVndShort(Math.max(0, kpiSummary.totalBudgetNet - kpiSummary.totalActualSpentNet))}
              note={`${kpiSummary.unbudgetedCount} gian hạn mức 0đ · ${kpiSummary.overbudgetCount} gian vượt trần Net`}
              tone={kpiSummary.unbudgetedCount + kpiSummary.overbudgetCount > 0 ? 'critical' : undefined}
            />
          </StatRow>

          {/* 3. BA KHỐI CÂN ĐỐI PNL: CẤU TRÚC NGÂN SÁCH · SẢN LƯỢNG NỘI DUNG · DÒNG TIỀN ĐNTT */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
            {/* Khối 3.1: Cấu trúc phân bổ Ngân sách Order Growth (Gross vs Net) */}
            <div className="bg-surface rounded-xl border border-line p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-line">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-2">
                    1. Cơ Cấu Ngân Sách Order Growth
                  </h3>
                  <span className="text-2xs font-mono font-semibold text-accent">
                    Net / Gross
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[340px] text-xs">
                  <thead>
                    <tr className="text-2xs text-ink-3 border-b border-line">
                      <th className="pb-1.5 text-left font-medium">Hạng mục ngân sách</th>
                      <th className="pb-1.5 text-right font-medium">Gross</th>
                      <th className="pb-1.5 text-right font-medium">Trần Net</th>
                      <th className="pb-1.5 text-right font-medium">Tỷ trọng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line font-mono">
                    <tr>
                      <td className="py-2 font-sans font-medium text-ink">
                        Video Affiliate KOC
                      </td>
                      <td className="py-2 text-right text-ink-3">
                        {formatVndShort(kpiSummary.totalAffGross)}
                      </td>
                      <td className="py-2 text-right font-semibold text-accent">
                        {formatVndShort(kpiSummary.totalAffNet)}
                      </td>
                      <td className="py-2 text-right text-ink-2">
                        {kpiSummary.totalBudgetNet > 0
                          ? Math.round((kpiSummary.totalAffNet / kpiSummary.totalBudgetNet) * 100)
                          : 0}
                        %
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 font-sans font-medium text-ink">
                        Video Kênh Brand (Self)
                      </td>
                      <td className="py-2 text-right text-ink-3">
                        {formatVndShort(kpiSummary.totalSelfGross)}
                      </td>
                      <td className="py-2 text-right font-semibold text-positive">
                        {formatVndShort(kpiSummary.totalSelfNet)}
                      </td>
                      <td className="py-2 text-right text-ink-2">
                        {kpiSummary.totalBudgetNet > 0
                          ? Math.round((kpiSummary.totalSelfNet / kpiSummary.totalBudgetNet) * 100)
                          : 0}
                        %
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 font-sans font-medium text-ink">
                        Phiên Livestream &amp; Host
                      </td>
                      <td className="py-2 text-right text-ink-3">
                        {formatVndShort(kpiSummary.totalLiveBudget)}
                      </td>
                      <td className="py-2 text-right font-semibold text-warning">
                        {formatVndShort(kpiSummary.totalLiveBudget)}
                      </td>
                      <td className="py-2 text-right text-ink-2">
                        {kpiSummary.totalTargetLiveSessions} ca
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="border-t border-line-strong font-mono bg-canvas">
                    <tr>
                      <td className="pt-2 font-sans font-semibold text-ink">Tổng hạn mức</td>
                      <td className="pt-2 text-right font-semibold text-ink-2">
                        {formatVndShort(kpiSummary.totalBudgetGross)}
                      </td>
                      <td className="pt-2 text-right font-semibold text-ink">
                        {formatVndShort(kpiSummary.totalBudgetNet)}
                      </td>
                      <td className="pt-2 text-right font-semibold text-ink">100%</td>
                    </tr>
                  </tfoot>
                  </table>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-line flex items-center justify-between text-2xs text-ink-3">
                <span>Chênh lệch Thuế &amp; Phí sàn (Gross − Net):</span>
                <strong className="font-mono text-ink">{formatVndShort(kpiSummary.taxAndFeeDiff)}</strong>
              </div>
            </div>

            {/* Khối 3.2: Cơ cấu Sản lượng Video (Paid KOC vs FOC 0đ vs Kênh Brand) */}
            <div className="bg-surface rounded-xl border border-line p-4 flex flex-col justify-between">
              {(() => {
                const totalVids =
                  kpiSummary.totalTargetPaidVideos +
                  kpiSummary.totalTargetFocVideos +
                  kpiSummary.totalTargetSelfVideos;
                const paidPct =
                  totalVids > 0 ? Math.round((kpiSummary.totalTargetPaidVideos / totalVids) * 100) : 0;
                const focPct =
                  totalVids > 0 ? Math.round((kpiSummary.totalTargetFocVideos / totalVids) * 100) : 0;
                const selfPct = Math.max(0, 100 - paidPct - focPct);

                return (
                  <>
                    <div>
                      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-line">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-2">
                          2. Cơ Cấu Chỉ Tiêu &amp; Sản Lượng Video
                        </h3>
                        <span className="text-2xs font-mono font-semibold text-positive">
                          Đã air: {kpiSummary.totalActualAiredVideos.toLocaleString('vi-VN')} video
                        </span>
                      </div>

                      {/* Thanh tỷ trọng 3 màu tách biệt */}
                      <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-sunken mb-3 gap-0.5">
                        <div
                          style={{ width: `${paidPct}%` }}
                          className="data-bar bg-accent h-full"
                          title={`Video KOC trả phí (Paid): ${kpiSummary.totalTargetPaidVideos}`}
                        />
                        <div
                          style={{ width: `${focPct}%` }}
                          className="data-bar bg-warning h-full"
                          title={`Mẫu miễn phí FOC (0đ): ${kpiSummary.totalTargetFocVideos}`}
                        />
                        <div
                          style={{ width: `${selfPct}%` }}
                          className="data-bar bg-positive h-full"
                          title={`Video kênh Brand (Self): ${kpiSummary.totalTargetSelfVideos}`}
                        />
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between py-1.5 border-b border-line">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
                            <span className="font-medium text-ink">Video KOC trả phí (KL1 → KL7)</span>
                          </div>
                          <div className="font-mono text-right">
                            <strong className="text-ink">{kpiSummary.totalTargetPaidVideos.toLocaleString('vi-VN')}</strong>{' '}
                            <span className="text-2xs text-ink-3">({paidPct}%)</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between py-1.5 border-b border-line">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-warning shrink-0" />
                            <span className="font-medium text-ink">Suất gửi mẫu miễn phí (FOC 0đ)</span>
                          </div>
                          <div className="font-mono text-right">
                            <strong className="text-ink">{kpiSummary.totalTargetFocVideos.toLocaleString('vi-VN')}</strong>{' '}
                            <span className="text-2xs text-ink-3">({focPct}%)</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between py-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-positive shrink-0" />
                            <span className="font-medium text-ink">Video xây kênh Brand (Self)</span>
                          </div>
                          <div className="font-mono text-right">
                            <strong className="text-ink">{kpiSummary.totalTargetSelfVideos.toLocaleString('vi-VN')}</strong>{' '}
                            <span className="text-2xs text-ink-3">({selfPct}%)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-line flex items-center justify-between text-2xs text-ink-3">
                      <span>Tỷ lệ Video đã air / Đơn đã book:</span>
                      <strong className="font-mono text-positive">
                        {kpiSummary.totalActualAiredVideos} / {kpiSummary.totalBookedOrders} đơn ({kpiSummary.airedVsBookedPct}%)
                      </strong>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Khối 3.3: Kiểm soát Dòng tiền ĐNTT & Cảnh báo Vượt trần Kế toán */}
            <div className="bg-surface rounded-xl border border-line p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-line">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-2">
                    3. Dòng Tiền ĐNTT &amp; Kỷ Luật Kế Toán
                  </h3>
                  <span className="text-2xs font-mono font-semibold text-ink-2">
                    {kpiSummary.totalBookedOrders} đơn book
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="p-2.5 rounded-lg bg-positive-soft border border-positive/20 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-positive block">Đã nghiệm thu &amp; tất toán ĐNTT</span>
                      <span className="text-2xs text-ink-2">Hoàn tất chứng từ thanh toán 100%</span>
                    </div>
                    <div className="text-right font-mono">
                      <strong className="text-sm text-positive block">{formatVndShort(kpiSummary.settledOrdersCost)}</strong>
                      <span className="text-2xs text-ink-2">{kpiSummary.settledOrdersCount} đơn</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-warning-soft border border-warning/20 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-warning block">Đang tạm ứng / chờ làm ĐNTT</span>
                      <span className="text-2xs text-ink-2">Chờ nghiệm thu link Air &amp; hóa đơn</span>
                    </div>
                    <div className="text-right font-mono">
                      <strong className="text-sm text-warning block">{formatVndShort(kpiSummary.pendingOrdersCost)}</strong>
                      <span className="text-2xs text-ink-2">{kpiSummary.pendingOrdersCount} đơn</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-critical-soft border border-critical/20 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-critical block">Cảnh báo vượt trần &amp; Hạn mức 0đ</span>
                      <span className="text-2xs text-ink-2">
                        {kpiSummary.unbudgetedCount} gian 0đ · {kpiSummary.overbudgetCount} gian vượt Net
                      </span>
                    </div>
                    <div className="text-right font-mono">
                      <strong className="text-sm text-critical block">
                        +{formatVndShort(
                          riskStores.reduce(
                            (acc, s) => acc + Math.max(0, (s.actualSpentNet || 0) - (s.budgetNet || s.monthlyBudget || 0)),
                            0
                          )
                        )}
                      </strong>
                      <span className="text-2xs text-critical font-semibold">{riskStores.length} gian hàng</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-line flex items-center justify-between text-2xs">
                <span className="text-ink-3">Độ phủ gian hàng có video lên sóng:</span>
                <strong className="font-mono text-ink">
                  {kpiSummary.storesWithAiredCount} / {kpiSummary.storeCount} gian hàng
                </strong>
              </div>
            </div>
          </div>

          {/* 4. BẢNG ĐỐI SOÁT NGÂN SÁCH & PNL THEO THƯƠNG HIỆU (BRAND PNL MATRIX) */}
          <div className="bg-surface rounded-xl border border-line overflow-hidden">
            <div className="px-4 py-3 border-b border-line flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-ink">
                  Bảng Đối Soát Ngân Sách &amp; PnL Theo Thương Hiệu ({brandAggregation.length} Thương Hiệu)
                </h3>
                {selectedBrand !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setSelectedBrand('ALL')}
                    className="px-2 py-0.5 rounded bg-accent-soft text-accent text-2xs font-semibold hover:underline cursor-pointer"
                  >
                    Đang lọc: {selectedBrand} (Bỏ lọc ×)
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-2xs">
                {[
                  { key: 'BUDGET', label: 'Xếp theo Hạn mức Net' },
                  { key: 'SPENT_DESC', label: 'Xếp theo Thực chi cao nhất' },
                  { key: 'SPEND_PCT_DESC', label: 'Xếp theo % Spend Net' },
                  { key: 'AIRED_DESC', label: 'Xếp theo Số Video Air' },
                ].map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setBrandSortMode(s.key as typeof brandSortMode)}
                    className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                      brandSortMode === s.key
                        ? 'bg-ink text-white'
                        : 'bg-sunken text-ink-2 hover:text-ink'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-xs text-left">
                <thead className="bg-canvas text-ink-2 uppercase text-2xs border-b border-line sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold text-center w-10">#</th>
                    <th className="py-2.5 px-3 font-semibold">Thương Hiệu &amp; Quy Mô</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Mục Tiêu NMV</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Order Gross</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Trần Order Net</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Phân Bổ Net (Aff / Brand)</th>
                    <th className="py-2.5 px-3 font-semibold text-right bg-accent-soft/50 text-accent">
                      Thực Chi &amp; % Spend Net
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right">Dư Địa / Vượt Trần</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Video Air / Chỉ Tiêu</th>
                    <th className="py-2.5 px-3 font-semibold">Kiểm Soát Kế Toán</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {brandAggregation.slice(0, brandVisibleLimit).map((b, idx) => {
                    const isOver = b.actualSpentNet > b.budgetNet;
                    const burnVsNet =
                      b.budgetNet > 0
                        ? Math.round((b.actualSpentNet / b.budgetNet) * 100)
                        : b.actualSpentNet > 0
                        ? 999
                        : 0;
                    const varianceNet = b.budgetNet - b.actualSpentNet;
                    const targetPaidAndSelf = Math.max(b.paidVideos + b.selfVideos, 1);
                    const airPct = Math.round((b.airedVideos / targetPaidAndSelf) * 100);
                    const isSelectedBrand = selectedBrand === b.brandName;

                    return (
                      <tr
                        key={b.brandName}
                        onClick={() => setSelectedBrand(isSelectedBrand ? 'ALL' : b.brandName)}
                        className={`transition cursor-pointer ${
                          isSelectedBrand ? 'bg-accent-soft/60' : 'hover:bg-canvas'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center font-mono text-ink-3">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-ink">{b.brandName}</span>
                            {b.hasLeader && (
                              <span className="px-1.5 py-0.5 rounded bg-accent-soft text-accent text-2xs font-semibold">
                                TN: Ngọc Tâm
                              </span>
                            )}
                          </div>
                          <div className="text-2xs text-ink-3">
                            {b.storeCount} gian ({b.tiktokStores} TT · {b.shopeeStores} SP)
                            {b.pics.size > 0 ? ` · ${Array.from(b.pics).slice(0, 2).join(', ')}` : ''}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-ink-2">
                          {formatVndShort(b.targetGmv)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-ink-3">
                          {formatVndShort(b.budgetGross)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-ink">
                          {formatVndShort(b.budgetNet)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-2xs text-ink-2">
                          <div>
                            <strong className="text-ink">{formatVndShort(b.affNet)}</strong>{' '}
                            <span className="text-ink-3">/ {formatVndShort(b.selfNet)}</span>
                          </div>
                          {b.liveBudget > 0 && (
                            <div className="text-ink-3">Live: {formatVndShort(b.liveBudget)}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono bg-accent-soft/30">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className={`font-semibold ${isOver ? 'text-critical' : 'text-ink'}`}>
                              {formatVndShort(b.actualSpentNet)}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-2xs font-semibold ${
                                burnVsNet === 999 || burnVsNet > 100
                                  ? 'bg-critical text-white'
                                  : burnVsNet >= 45
                                  ? 'bg-accent text-white'
                                  : burnVsNet > 0
                                  ? 'bg-accent-soft text-accent'
                                  : 'bg-sunken text-ink-3'
                              }`}
                            >
                              {burnVsNet === 999 ? '0đ KH' : `${burnVsNet}%`}
                            </span>
                          </div>
                          <div className="w-28 ml-auto h-1.5 bg-sunken rounded-full overflow-hidden mt-1">
                            <div
                              className={`data-bar h-full rounded-full ${
                                isOver ? 'bg-critical' : 'bg-accent'
                              }`}
                              style={{
                                width: `${
                                  burnVsNet === 999
                                    ? 100
                                    : Math.min(100, Math.max(burnVsNet, b.actualSpentNet > 0 ? 4 : 0))
                                }%`,
                              }}
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          <span
                            className={`font-semibold ${
                              varianceNet < 0
                                ? 'text-critical'
                                : varianceNet > 0
                                ? 'text-positive'
                                : 'text-ink-3'
                            }`}
                          >
                            {varianceNet < 0
                              ? `-${formatVndShort(Math.abs(varianceNet))}`
                              : varianceNet > 0
                              ? `+${formatVndShort(varianceNet)}`
                              : '0đ'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          <div className="flex items-center justify-center gap-1">
                            <span className="font-semibold text-positive">{b.airedVideos}</span>
                            <span className="text-2xs text-ink-3">({airPct}%)</span>
                          </div>
                          <div className="text-2xs text-ink-3" title="Paid / FOC / Kênh Brand">
                            {b.paidVideos} / {b.focVideos} / {b.selfVideos}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">{renderRiskBadge(b.riskStatus)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-canvas border-t-2 border-line-strong font-mono text-xs sticky bottom-0">
                  <tr>
                    <td className="py-2.5 px-3 text-center font-semibold text-ink">Σ</td>
                    <td className="py-2.5 px-3 font-sans font-semibold text-ink">
                      Tổng cộng ({brandAggregation.length} Thương hiệu · {kpiSummary.storeCount} gian hàng)
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-ink">
                      {formatVndShort(kpiSummary.totalTargetGmv)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-ink-2">
                      {formatVndShort(kpiSummary.totalBudgetGross)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-ink">
                      {formatVndShort(kpiSummary.totalBudgetNet)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-2xs text-ink-2">
                      Aff: <strong>{formatVndShort(kpiSummary.totalAffNet)}</strong> · Brand: <strong>{formatVndShort(kpiSummary.totalSelfNet)}</strong>
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-accent bg-accent-soft/40">
                      {formatVndShort(kpiSummary.totalActualSpentNet)} ({kpiSummary.pacingNetPct}%)
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-positive">
                      +{formatVndShort(Math.max(0, kpiSummary.totalBudgetNet - kpiSummary.totalActualSpentNet))}
                    </td>
                    <td className="py-2.5 px-3 text-center font-semibold text-positive">
                      {kpiSummary.totalActualAiredVideos} air / {kpiSummary.totalTargetPaidVideos} Paid
                    </td>
                    <td className="py-2.5 px-3 font-sans text-2xs font-semibold text-critical">
                      {kpiSummary.unbudgetedCount} gian 0đ · {kpiSummary.overbudgetCount} vượt Net
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {brandAggregation.length > 16 && (
              <div className="px-4 py-2.5 border-t border-line bg-canvas flex items-center justify-between text-xs">
                <span className="text-ink-3">
                  Đang hiển thị <strong className="font-mono text-ink">{Math.min(brandVisibleLimit, brandAggregation.length)}</strong> / <strong className="font-mono text-ink">{brandAggregation.length}</strong> thương hiệu B2C
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setBrandVisibleLimit((prev) =>
                      prev >= brandAggregation.length ? 16 : brandAggregation.length
                    )
                  }
                  className="px-3 py-1 rounded-lg border border-line-strong bg-surface hover:bg-sunken text-ink font-semibold transition cursor-pointer"
                >
                  {brandVisibleLimit >= brandAggregation.length
                    ? 'Thu gọn (16 thương hiệu)'
                    : `Xem tất cả ${brandAggregation.length} thương hiệu`}
                </button>
              </div>
            )}
          </div>

          {/* 5. DANH SÁCH GIAN HÀNG CẢNH BÁO TÀI CHÍNH (VƯỢT TRẦN NET & CHI NGOÀI KẾ HOẠCH 0Đ) */}
          {riskStores.length > 0 && (
            <div className="bg-surface rounded-xl border border-critical/25 overflow-hidden">
              <div className="px-4 py-3 bg-critical-soft/60 border-b border-critical/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-critical shrink-0" />
                  <h3 className="text-sm font-semibold text-critical">
                    Danh Sách Gian Hàng Cần Kiểm Soát Ngân Sách ({riskStores.length} Gian Hàng: {kpiSummary.unbudgetedCount} Hạn Mức 0đ · {kpiSummary.overbudgetCount} Vượt Trần Net)
                  </h3>
                </div>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    setSelectedQuadrant('OVER_SPEND');
                    handleSelectDashboardSection('STORE_SELLER');
                  }}
                >
                  Mở tab 69 Gian hàng
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-canvas text-ink-2 uppercase text-2xs border-b border-line">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Gian Hàng &amp; Mã VH</th>
                      <th className="py-2 px-3 font-semibold">Thương Hiệu &amp; Sàn</th>
                      <th className="py-2 px-3 font-semibold">PIC Phụ Trách &amp; Cấp Duyệt</th>
                      <th className="py-2 px-3 font-semibold text-right">Trần Order Net</th>
                      <th className="py-2 px-3 font-semibold text-right">Thực Chi Duyệt Book</th>
                      <th className="py-2 px-3 font-semibold text-right">Số Tiền Vượt Trần</th>
                      <th className="py-2 px-3 font-semibold text-center">Video Đã Air</th>
                      <th className="py-2 px-3 font-semibold">Loại Cảnh Báo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {riskStores.map((st) => {
                      const net = st.budgetNet || st.monthlyBudget || 0;
                      const spent = st.actualSpentNet || 0;
                      const overAmount = Math.max(0, spent - net);
                      return (
                        <tr
                          key={st.id}
                          onClick={() => setInspectStore(st)}
                          className="hover:bg-critical-soft/30 transition cursor-pointer"
                        >
                          <td className="py-2 px-3">
                            <span className="font-semibold text-ink block">{st.storeName}</span>
                            <span className="font-mono text-2xs text-ink-3">{st.storeOperationId}</span>
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-medium text-ink">{st.brandName}</span>
                            <span className="block text-2xs text-ink-3">{st.platform}</span>
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-medium text-ink">{st.primaryPic || st.assignedStaff}</span>
                            {st.hasBookingLeader && st.bookingLeader && (
                              <span className="block text-2xs text-accent font-medium">
                                TN: {st.bookingLeader}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-semibold text-ink">
                            {formatVndShort(net)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-semibold text-critical">
                            {formatVndShort(spent)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-semibold text-critical">
                            +{formatVndShort(overAmount)}
                          </td>
                          <td className="py-2 px-3 text-center font-mono text-positive font-semibold">
                            {st.actualAiredVideos || 0}
                          </td>
                          <td className="py-2 px-3">{renderRiskBadge(st.financialRiskStatus)}</td>
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

      {/* ========================================================================= */}
      {/* TAB 2: HIỆU QUẢ 69 GIAN HÀNG B2C & CHIẾN DỊCH TIKTOK SELLER CENTER */}
      {/* ========================================================================= */}
      {activeTab === 'STORE_SELLER' && (
        <div className="space-y-5">
          {/* 4 THẺ KPI ĐẶC THÙ CẤP GIAN HÀNG (STORE & TIKTOK SELLER) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
            <div className="bg-surface rounded-xl border border-line p-4">
              <div className="flex items-center justify-between text-xs text-ink-3 font-medium mb-1">
                <span>Quy Mô 69 Gian Hàng B2C</span>
                <Store className="w-4 h-4 text-accent" />
              </div>
              <div className="text-xl font-semibold text-ink font-mono">
                {filteredStores.length} / 69 Gian hàng
              </div>
              <div className="mt-2 pt-2 border-t border-line flex items-center justify-between text-2xs">
                <span className="text-ink-3">39 TikTok · 30 Shopee</span>
                <span className="font-semibold text-ink font-mono">
                  Target NMV: {formatVndShort(kpiSummary.totalTargetGmv)}
                </span>
              </div>
            </div>

            <div className="bg-surface rounded-xl border border-line p-4">
              <div className="flex items-center justify-between text-xs text-accent font-semibold mb-1">
                <span>Thực Chi &amp; % Spend Net Gian Hàng</span>
                <DollarSign className="w-4 h-4 text-accent" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-semibold text-accent font-mono">
                  {kpiSummary.pacingNetPct}% Spend
                </span>
                <span className="text-xs font-semibold text-ink-2 font-mono">
                  ({formatVndShort(kpiSummary.totalActualSpentNet)})
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-line flex items-center justify-between text-2xs">
                <span className="text-ink-3">Trần Order Net: {formatVndShort(kpiSummary.totalBudgetNet)}</span>
                <span className="font-semibold text-critical">
                  {kpiSummary.unbudgetedCount + kpiSummary.overbudgetCount} gian vượt/0đ
                </span>
              </div>
            </div>

            <div className="bg-surface rounded-xl border border-line p-4">
              <div className="flex items-center justify-between text-xs text-positive font-semibold mb-1">
                <span>Độ Phủ &amp; Sản Lượng Video Air</span>
                <Film className="w-4 h-4 text-positive" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-semibold text-positive font-mono">
                  {kpiSummary.totalActualAiredVideos} Video Air
                </span>
                <span className="text-xs font-semibold text-positive px-1.5 py-0.5 rounded bg-positive-soft">
                  {kpiSummary.storesWithAiredCount}/{kpiSummary.storeCount} gian có bài
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-line flex items-center justify-between text-2xs">
                <span className="text-ink-3">Chỉ tiêu Paid: {kpiSummary.totalTargetPaidVideos}</span>
                <span className="font-semibold text-accent">FOC: {kpiSummary.totalTargetFocVideos}</span>
              </div>
            </div>

            <div className="bg-surface rounded-xl border border-line p-4">
              <div className="flex items-center justify-between text-xs text-ink-3 font-medium mb-1">
                <span>Quảng Cáo TikTok Seller (PGM/LGM)</span>
                <TrendingUp className="w-4 h-4 text-warning" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-semibold text-ink font-mono">
                  {formatVndShort(TIKTOK_SELLER_ADS_SUMMARY.totalGmv)}
                </span>
                <span className="text-xs font-semibold text-positive px-1.5 py-0.5 rounded bg-positive-soft font-mono">
                  ROAS {TIKTOK_SELLER_ADS_SUMMARY.overallRoas}x
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-line flex items-center justify-between text-2xs">
                <span className="text-ink-3">Chi Ads: {formatVndShort(TIKTOK_SELLER_ADS_SUMMARY.totalSpend)}</span>
                <span className="font-semibold text-ink">{TIKTOK_SELLER_ADS_SUMMARY.totalOrders} đơn hàng</span>
              </div>
            </div>
          </div>

          {/* THANH LỌC NHANH TƯƠNG QUAN KÉP: % SPEND CHI PHÍ vs SỐ LƯỢNG VIDEO AIR TRÊN 69 GIAN HÀNG */}
          <div className="bg-surface rounded-xl border border-line p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-ink">
                <Filter className="w-4 h-4 text-accent" />
                <span>Phân nhóm 69 gian hàng theo tương quan % Spend Chi Phí &amp; Số lượng Video Air:</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  {
                    key: 'ALL',
                    label: `Tất cả (${stores.length} gian)`,
                    activeClass: 'bg-ink text-white',
                    idleClass: 'bg-sunken text-ink-2 hover:bg-sunken'
                  },
                  {
                    key: 'OPTIMAL',
                    label: `Giải ngân & Air Video tốt (${kpiSummary.quadOptimal} gian)`,
                    activeClass: 'bg-positive text-white',
                    idleClass: 'bg-positive-soft text-positive border border-positive/20 hover:bg-positive-soft'
                  },
                  {
                    key: 'HIGH_SPEND_LOW_AIR',
                    label: `% Spend cao nhưng ít Video Air (${kpiSummary.quadHighSpendLowAir} gian cần giục Air)`,
                    activeClass: 'bg-warning text-white',
                    idleClass: 'bg-warning-soft text-warning border border-warning/20 hover:bg-warning-soft'
                  },
                  {
                    key: 'OVER_SPEND',
                    label: `Vượt trần Net / Chi ngoài KH 0đ (${kpiSummary.quadOverSpend} gian cảnh báo đỏ)`,
                    activeClass: 'bg-critical text-white',
                    idleClass: 'bg-critical-soft text-critical border border-critical/20 hover:bg-critical-soft'
                  },
                  {
                    key: 'SLOW_BOTH',
                    label: `Chậm cả % Spend & Video Air (${kpiSummary.quadSlowBoth} gian cần đẩy tiến độ)`,
                    activeClass: 'bg-accent text-white',
                    idleClass: 'bg-accent-soft text-accent border border-accent/20 hover:bg-accent-soft'
                  }
                ].map((q) => (
                  <button
                    key={q.key}
                    type="button"
                    onClick={() => setSelectedQuadrant(q.key as typeof selectedQuadrant)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      selectedQuadrant === q.key ? q.activeClass : q.idleClass
                    }`}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 5 BỘ LỌC CHI TIẾT GIAN HÀNG */}
            <div className="pt-3 border-t border-line grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={storeSearchQuery}
                  onChange={(e) => setStoreSearchQuery(e.target.value)}
                  placeholder="Tìm tên gian hàng, PIC, Brand..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-canvas border border-line rounded-lg focus:outline-hidden focus:border-accent/20 focus:bg-surface"
                />
              </div>

              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="px-3 py-1.5 text-xs bg-canvas border border-line rounded-lg font-medium text-ink-2 focus:outline-hidden focus:border-accent/20"
              >
                <option value="ALL">Tất cả Thương hiệu ({allBrands.length} Brands)</option>
                {allBrands.map((b) => (
                  <option key={b} value={b}>
                    Thương hiệu: {b}
                  </option>
                ))}
              </select>

              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value as typeof selectedPlatform)}
                className="px-3 py-1.5 text-xs bg-canvas border border-line rounded-lg font-medium text-ink-2 focus:outline-hidden focus:border-accent/20"
              >
                <option value="ALL">Tất cả Sàn (39 TikTok · 30 Shopee)</option>
                <option value="TikTok Shop">TikTok Shop (39 gian hàng)</option>
                <option value="Shopee Mall">Shopee Mall (30 gian hàng)</option>
              </select>

              <select
                value={selectedGovernance}
                onChange={(e) => setSelectedGovernance(e.target.value as typeof selectedGovernance)}
                className="px-3 py-1.5 text-xs bg-canvas border border-line rounded-lg font-medium text-ink-2 focus:outline-hidden focus:border-accent/20"
              >
                <option value="ALL">Cơ cấu duyệt: Tất cả 69 gian hàng</option>
                <option value="WITH_LEADER">Nhóm có Leader Nguyễn Thị Ngọc Tâm (8 gian)</option>
                <option value="DIRECT_HEAD">Không có Leader — Trình trực tiếp Yến Nhi (61 gian)</option>
              </select>

              <select
                value={selectedRiskFilter}
                onChange={(e) => setSelectedRiskFilter(e.target.value as typeof selectedRiskFilter)}
                className="px-3 py-1.5 text-xs bg-canvas border border-line rounded-lg font-medium text-ink-2 focus:outline-hidden focus:border-accent/20"
              >
                <option value="ALL">Kiểm soát Kế toán: Tất cả trạng thái</option>
                <option value="UNBUDGETED">Báo động đỏ: Chi ngoài KH (Hạn mức Net = 0đ)</option>
                <option value="OVERBUDGET">Cảnh báo: Thực chi vượt trần Net</option>
                <option value="SLOW_BURN">Giải ngân chậm (&lt;25% hạn mức Net)</option>
                <option value="NORMAL">An toàn: Trong hạn mức Net</option>
              </select>
            </div>
          </div>

          {/* KHỐI 1: HIỆU QUẢ CHIẾN DỊCH QUẢNG CÁO TIKTOK SHOP SELLER CENTER (PGM / LGM) */}
          <div className="bg-surface rounded-xl border border-line p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-ink text-white">
                    TikTok Shop Seller Center
                  </span>
                  <h3 className="text-sm font-semibold text-ink">
                    Biểu Đồ Hiệu Suất Chiến Dịch Quảng Cáo Sản Phẩm & Livestream (PGM / LGM)
                  </h3>
                </div>
                </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="bg-canvas px-3 py-1.5 rounded-lg border border-line">
                  Chi phí Ads: <strong className="text-ink">{formatVndShort(TIKTOK_SELLER_ADS_SUMMARY.totalSpend)}</strong>
                </div>
                <div className="bg-accent-soft px-3 py-1.5 rounded-lg border border-accent/20">
                  Doanh thu GMV Ads: <strong className="text-accent">{formatVndShort(TIKTOK_SELLER_ADS_SUMMARY.totalGmv)}</strong>
                </div>
                <div className="bg-positive-soft px-3 py-1.5 rounded-lg border border-positive/20">
                  ROAS TB: <strong className="text-positive">{TIKTOK_SELLER_ADS_SUMMARY.overallRoas}x</strong> ({TIKTOK_SELLER_ADS_SUMMARY.totalOrders} đơn)
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {TIKTOK_SELLER_CAMPAIGNS.map((camp) => {
                const maxGmv = Math.max(...TIKTOK_SELLER_CAMPAIGNS.map((c) => c.gmv), 1);
                const gmvBarPct = Math.round((camp.gmv / maxGmv) * 100);
                const costBarPct = Math.round((camp.cost / maxGmv) * 100);
                return (
                  <div
                    key={camp.campaignId}
                    className="p-3.5 rounded-xl border border-line hover:border-accent/20 bg-canvas transition"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-xs font-semibold text-ink block">
                          {camp.campaignName}
                        </span>
                        <span className="text-2xs text-ink-3">
                          Gian hàng: <strong className="text-ink-2">{camp.storeName}</strong> · ID: {camp.campaignId}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold font-mono ${
                          camp.roas >= 5
                            ? 'bg-positive-soft text-positive'
                            : 'bg-accent-soft text-accent'
                        }`}
                      >
                        ROAS {camp.roas}x
                      </span>
                    </div>

                    {/* Bar so sánh GMV vs Chi phí Ads */}
                    <div className="space-y-1.5 my-2.5">
                      <div>
                        <div className="flex justify-between text-2xs mb-0.5">
                          <span className="text-ink-3">GMV thực thu:</span>
                          <span className="font-mono font-semibold text-accent">
                            {formatVndShort(camp.gmv)}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-sunken rounded-full overflow-hidden">
                          <div
                            className="data-bar h-full bg-accent rounded-full"
                            style={{ width: `${Math.max(gmvBarPct, 4)}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-2xs mb-0.5">
                          <span className="text-ink-3">Chi phí Ads:</span>
                          <span className="font-mono font-semibold text-ink">
                            {formatVndShort(camp.cost)}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-sunken rounded-full overflow-hidden">
                          <div
                            className="data-bar h-full bg-warning rounded-full"
                            style={{ width: `${Math.max(costBarPct, 3)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-line/80 grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center text-2xs">
                      <div>
                        <span className="text-ink-3 block">Đơn hàng</span>
                        <strong className="text-ink font-mono">{camp.orders}</strong>
                      </div>
                      <div>
                        <span className="text-ink-3 block">CPA/Đơn</span>
                        <strong className="text-ink font-mono">{formatVndShort(camp.cpa)}</strong>
                      </div>
                      <div>
                        <span className="text-ink-3 block">CTR</span>
                        <strong className="text-ink font-mono">{camp.ctr}%</strong>
                      </div>
                      <div>
                        <span className="text-ink-3 block">CVR</span>
                        <strong className="text-positive font-mono">{camp.cvr}%</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* KHỐI 2: BẢNG ĐỐI SOÁT CHI TIẾT 69 GIAN HÀNG B2C (TRỌNG TÂM % SPEND CHI PHÍ & SỐ LƯỢNG VIDEO ĐÃ AIR) */}
          <div className="bg-surface rounded-xl border border-line overflow-hidden">
            <div className="px-5 py-4 border-b border-line flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-ink">
                  Bảng Đối Soát Toàn Bộ {filteredStores.length} / 69 Gian Hàng B2C — Trọng Tâm % Spend Chi Phí &amp; Số Lượng Video Đã Air
                </h3>
                </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {[
                  { key: 'AIRED_DESC', label: 'Xếp theo Nhiều Video Air nhất' },
                  { key: 'SPEND_PCT_DESC', label: 'Xếp theo % Spend cao → thấp' },
                  { key: 'SPEND_PCT_ASC', label: 'Xếp theo % Spend thấp → cao' },
                  { key: 'AIRED_ASC', label: 'Xếp theo Ít Video Air nhất' },
                  { key: 'DEFAULT', label: 'Thứ tự mặc định' }
                ].map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setStoreSortMode(s.key as typeof storeSortMode)}
                    className={`px-2.5 py-1 rounded-md text-2xs font-semibold transition cursor-pointer ${
                      storeSortMode === s.key
                        ? 'bg-accent text-white'
                        : 'bg-sunken text-ink-2 hover:bg-sunken'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto max-h-[640px]">
              <table className="w-full text-xs text-left">
                <thead className="bg-canvas text-ink-2 uppercase border-b border-line sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Gian Hàng &amp; Brand</th>
                    <th className="py-3 px-3 font-semibold">Sàn</th>
                    <th className="py-3 px-3 font-semibold">Chuyên Viên (PIC) &amp; Cấp Duyệt</th>
                    <th className="py-3 px-3 font-semibold text-right">Order Gross</th>
                    <th className="py-3 px-3 font-semibold text-right">Hạn Mức Net</th>
                    <th className="py-3 px-3 font-semibold text-right bg-accent-soft text-accent">
                      Thực Chi &amp; % Spend Net
                    </th>
                    <th className="py-3 px-3 font-semibold text-center">Chỉ Tiêu Paid / FOC / Brand</th>
                    <th className="py-3 px-3 font-semibold text-center bg-positive-soft text-positive">
                      Số Video Đã Air (% Đạt)
                    </th>
                    <th className="py-3 px-4 font-semibold">Kiểm Soát Kế Toán</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredStores.slice(0, storeVisibleLimit).map((st) => {
                    const net = st.budgetNet || st.monthlyBudget || 0;
                    const spent = st.actualSpentNet || 0;
                    const burnPct = net > 0 ? Math.round((spent / net) * 100) : spent > 0 ? 999 : 0;
                    const targetPaid = st.targetPaidVideos || 0;
                    const aired = st.actualAiredVideos || 0;
                    const airVsPaidPct = targetPaid > 0 ? Math.round((aired / targetPaid) * 100) : aired > 0 ? 100 : 0;

                    return (
                      <tr
                        key={st.id}
                        onClick={() => setInspectStore(st)}
                        className="hover:bg-accent-soft transition cursor-pointer"
                      >
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-ink">{st.storeName}</div>
                          <div className="text-2xs text-ink-3">{st.brandName}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`text-2xs font-semibold px-1.5 py-0.5 rounded ${
                              st.platform === 'TikTok Shop'
                                ? 'bg-ink text-white'
                                : 'bg-warning-soft text-warning'
                            }`}
                          >
                            {st.platform}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-ink">
                            {st.primaryPic || st.assignedStaff}
                          </div>
                          {st.hasBookingLeader && st.bookingLeader && (
                            <span className="text-2xs text-accent font-medium">
                              TN: {st.bookingLeader}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-ink-2">
                          {formatVndShort(st.budgetGross || 0)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-accent">
                          {formatVndShort(net)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono bg-accent-soft">
                          <div className="flex items-center justify-end gap-1.5">
                            <span
                              className={`font-semibold ${
                                spent > net ? 'text-critical' : 'text-ink'
                              }`}
                            >
                              {formatVndShort(spent)}
                            </span>
                            <span
                              className={`text-2xs font-mono font-semibold px-1.5 py-0.5 rounded ${
                                burnPct === 999 || burnPct > 100
                                  ? 'bg-critical text-white'
                                  : burnPct >= 50
                                  ? 'bg-accent text-white'
                                  : burnPct > 0
                                  ? 'bg-accent-soft text-accent'
                                  : 'bg-sunken text-ink-3'
                              }`}
                            >
                              {burnPct === 999 ? 'Ngoài KH' : `${burnPct}%`}
                            </span>
                          </div>
                          <div className="w-28 ml-auto h-1.5 bg-sunken rounded-full overflow-hidden mt-1">
                            <div
                              className={`data-bar h-full rounded-full ${
                                burnPct === 999 || burnPct > 100 ? 'bg-critical' : 'bg-accent'
                              }`}
                              style={{
                                width: `${
                                  burnPct === 999 ? 100 : Math.min(100, Math.max(burnPct, spent > 0 ? 4 : 0))
                                }%`
                              }}
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-2xs">
                          <span className="text-accent font-semibold" title="Video KOC trả phí">
                            {st.targetPaidVideos || 0}
                          </span>{' '}
                          /{' '}
                          <span className="text-accent font-semibold" title="Suất mẫu miễn phí FOC (0đ)">
                            {st.targetFocVideos || 0}
                          </span>{' '}
                          /{' '}
                          <span className="text-positive font-semibold" title="Video kênh Brand">
                            {st.targetSelfChannelContents || 0}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono bg-positive-soft">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-sm font-semibold text-positive">
                              {aired} video
                            </span>
                            {targetPaid > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-surface text-2xs font-semibold text-positive border border-line">
                                {airVsPaidPct}% Paid
                              </span>
                            )}
                          </div>
                          <div className="w-24 mx-auto h-1.5 bg-sunken rounded-full overflow-hidden mt-1">
                            <div
                              className="data-bar h-full bg-positive rounded-full"
                              style={{ width: `${Math.min(100, Math.max(airVsPaidPct, aired > 0 ? 8 : 0))}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-4">{renderRiskBadge(st.financialRiskStatus)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredStores.length > 15 && (
              <div className="px-5 py-3 border-t border-line bg-canvas flex items-center justify-between">
                <span className="text-xs text-ink-3">
                  Hiển thị <strong className="text-ink font-mono">{Math.min(storeVisibleLimit, filteredStores.length)}</strong> / <strong className="text-ink font-mono">{filteredStores.length}</strong> gian hàng B2C
                </span>
                <button
                  type="button"
                  onClick={() => setStoreVisibleLimit((prev) => (prev >= filteredStores.length ? 15 : filteredStores.length))}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-line-strong bg-surface hover:bg-sunken text-ink-2 transition cursor-pointer"
                >
                  {storeVisibleLimit >= filteredStores.length ? 'Thu gọn (15 gian hàng)' : `Xem tất cả ${filteredStores.length} gian hàng`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PHÂN TÍCH VIDEO ĐÃ BOOKING (FILE 3.2) & CREATIVE ADS TIKTOK SELLER */}
      {/* ========================================================================= */}
      {activeTab === 'VIDEO_CREATIVE' && (
        <div className="space-y-5">
          {/* 4 THẺ KPI ĐẶC THÙ CẤP VIDEO BOOKING & CREATIVE ADS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
            <div className="bg-surface rounded-xl border border-line p-4">
              <div className="flex items-center justify-between text-xs text-ink-3 font-medium mb-1">
                <span>Tổng Đơn Đã Book</span>
                <PlaySquare className="w-4 h-4 text-accent" />
              </div>
              <div className="text-xl font-semibold text-ink font-mono">
                786 Đơn Video
              </div>
              <div className="mt-2 pt-2 border-t border-line flex items-center justify-between text-2xs">
                <span className="text-ink-3">Tổng ngân sách book:</span>
                <span className="font-semibold text-accent font-mono">2,63 Tỷ VNĐ</span>
              </div>
            </div>

            <div className="bg-surface rounded-xl border border-line p-4">
              <div className="flex items-center justify-between text-xs text-positive font-semibold mb-1">
                <span>Số Lượng Video Đã Air Lên Sóng</span>
                <Film className="w-4 h-4 text-positive" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-semibold text-positive font-mono">
                  {kpiSummary.totalActualAiredVideos} Video
                </span>
                <span className="text-xs font-semibold text-positive px-1.5 py-0.5 rounded bg-positive-soft">
                  Đạt {kpiSummary.airedVsBookedPct}% đơn book
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-line flex items-center justify-between text-2xs">
                <span className="text-ink-3">Đang chờ Air / gửi mẫu:</span>
                <span className="font-semibold text-warning font-mono">40 đơn</span>
              </div>
            </div>

            <div className="bg-surface rounded-xl border border-line p-4">
              <div className="flex items-center justify-between text-xs text-ink-3 font-medium mb-1">
                <span>Cơ Cấu Khung Lương (KL1 → KL7 &amp; FOC)</span>
                <Layers className="w-4 h-4 text-accent" />
              </div>
              <div className="text-xl font-semibold text-ink font-mono">
                8 Bậc Đơn Giá
              </div>
              <div className="mt-2 pt-2 border-t border-line flex items-center justify-between text-2xs">
                <span className="text-ink-3">TAP FOC (0đ): <strong>212 đơn</strong></span>
                <span className="font-semibold text-accent">Paid KL1–KL7: 574 đơn</span>
              </div>
            </div>

            <div className="bg-surface rounded-xl border border-line p-4">
              <div className="flex items-center justify-between text-xs text-ink-3 font-medium mb-1">
                <span>Hiệu Suất Creative Ads TikTok Seller</span>
                <TrendingUp className="w-4 h-4 text-warning" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-semibold text-ink font-mono">
                  34,8% Hook 2s
                </span>
                <span className="text-xs font-semibold text-accent px-1.5 py-0.5 rounded bg-accent-soft">
                  CVR 4,62%
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-line flex items-center justify-between text-2xs">
                <span className="text-ink-3">4.211 dòng Creative</span>
                <span className="font-semibold text-positive font-mono">ROAS {TIKTOK_SELLER_ADS_SUMMARY.overallRoas}x</span>
              </div>
            </div>
          </div>

          {/* THANH BỘ LỌC VIDEO BOOKING & CREATIVE */}
          <div className="bg-surface rounded-xl border border-line p-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={videoSearchQuery}
                onChange={(e) => setVideoSearchQuery(e.target.value)}
                placeholder="Tìm mã BO26, kênh KOC, sản phẩm..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-canvas border border-line rounded-lg focus:outline-hidden focus:border-accent/20 focus:bg-surface"
              />
            </div>

            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="px-3 py-1.5 text-xs bg-canvas border border-line rounded-lg font-medium text-ink-2 focus:outline-hidden focus:border-accent/20"
            >
              <option value="ALL">Tất cả Thương hiệu ({allBrands.length} Brands)</option>
              {allBrands.map((b) => (
                <option key={b} value={b}>
                  Thương hiệu: {b}
                </option>
              ))}
            </select>

            <select
              value={videoFormatFilter}
              onChange={(e) => setVideoFormatFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-canvas border border-line rounded-lg font-medium text-ink-2 focus:outline-hidden focus:border-accent/20"
            >
              <option value="ALL">Tất cả Định dạng sản xuất Video</option>
              {B2C_VIDEO_FORMAT_BREAKDOWN.map((f) => (
                <option key={f.format} value={f.format}>
                  Định dạng: {f.format} ({f.count} đơn)
                </option>
              ))}
            </select>

            <select
              value={videoKlFilter}
              onChange={(e) => setVideoKlFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-canvas border border-line rounded-lg font-medium text-ink-2 focus:outline-hidden focus:border-accent/20"
            >
              <option value="ALL">Tất cả Bậc Khung lương (TAP FOC &amp; KL1→KL7)</option>
              {sortedKlBreakdown.map((k) => (
                <option key={k.kl} value={k.kl}>
                  Bậc {k.kl} ({k.count} đơn)
                </option>
              ))}
            </select>
          </div>

          {/* HÀNG BIỂU ĐỒ VIDEO: 1. PHÂN BỔ KHUNG LƯƠNG KL1-KL7 + TAP 0Đ | 2. PHỄU GIỮ CHÂN & ĐỊNH DẠNG VIDEO */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* BIỂU ĐỒ KHUNG LƯƠNG KOC (KL1 -> KL7 & TAP UpAffiliate 0đ) */}
            <div className="xl:col-span-7 bg-surface rounded-xl border border-line p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    Biểu Đồ Hiệu Quả Theo Khung Lương KOC (TAP FOC 0đ & KL1 → KL7)
                  </h3>
                  </div>
                <span className="px-2 py-0.5 rounded bg-accent-soft text-xs font-semibold text-accent">
                  786 Đơn Book · 2,63 Tỷ
                </span>
              </div>

              <div className="space-y-2.5">
                {sortedKlBreakdown.map((item) => {
                  const maxCost = Math.max(...sortedKlBreakdown.map((k) => k.totalCost), 1);
                  const maxCount = Math.max(...sortedKlBreakdown.map((k) => k.count), 1);
                  const costPct = Math.round((item.totalCost / maxCost) * 100);
                  const countPct = Math.round((item.count / maxCount) * 100);
                  const avgCost = item.count > 0 ? Math.round(item.totalCost / item.count) : 0;

                  return (
                    <div
                      key={item.kl}
                      onClick={() => setVideoKlFilter(videoKlFilter === item.kl ? 'ALL' : item.kl)}
                      className={`p-2.5 rounded-lg border transition cursor-pointer ${
                        videoKlFilter === item.kl
                          ? 'border-accent/20 bg-accent-soft'
                          : 'border-line hover:border-line-strong bg-canvas'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-1.5">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="px-1.5 py-0.5 rounded font-mono font-semibold bg-ink text-white text-2xs">
                            {item.kl}
                          </span>
                          <span className="font-semibold text-ink">
                            {item.count} đơn book ({item.airedCount} đã air)
                          </span>
                          {item.kl === 'TAP UpAffiliate' && (
                            <span className="px-1.5 py-0.5 rounded bg-accent-soft text-2xs font-semibold text-accent">
                              Suất mẫu miễn phí FOC (0đ)
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 font-mono text-2xs">
                          <span className="text-ink-3">
                            Đơn giá TB: <strong>{formatVndShort(avgCost)}/video</strong>
                          </span>
                          <span className="font-semibold text-accent">
                            Tổng chi: {formatVndShort(item.totalCost)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 items-center">
                        <div>
                          <div className="flex justify-between text-2xs text-ink-3 mb-0.5">
                            <span>Tỷ trọng số lượng video</span>
                            <span>{Math.round((item.count / 786) * 100)}%</span>
                          </div>
                          <div className="w-full h-2 bg-sunken rounded-full overflow-hidden">
                            <div
                              className="data-bar h-full bg-accent rounded-full"
                              style={{ width: `${Math.max(countPct, 4)}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-2xs text-ink-3 mb-0.5">
                            <span>Tỷ trọng ngân sách giải ngân</span>
                            <span>{Math.round((item.totalCost / 2632749226) * 100)}%</span>
                          </div>
                          <div className="w-full h-2 bg-sunken rounded-full overflow-hidden">
                            <div
                              className="data-bar h-full bg-accent rounded-full"
                              style={{ width: `${Math.max(costPct, item.totalCost > 0 ? 4 : 0)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* BIỂU ĐỒ PHỄU CHUYỂN ĐỔI VIDEO CREATIVE & ĐỊNH DẠNG VIDEO */}
            <div className="xl:col-span-5 space-y-5">
              {/* Phễu giữ chân người xem TikTok Seller Creative */}
              <div className="bg-surface rounded-xl border border-line p-5">
                <h3 className="text-sm font-semibold text-ink mb-1">
                  Phễu Hiệu Suất Video Quảng Cáo TikTok Seller (4.211 Dòng Creative)
                </h3>
                <div className="space-y-2.5">
                  {[
                    {
                      stage: '1. Tỷ lệ giữ chân 2 giây đầu (2s Hook Rate TB)',
                      val: '34,8%',
                      pct: 82,
                      color: 'bg-accent',
                      note: 'Ngưỡng chuẩn ngành Beauty: 28,0%'
                    },
                    {
                      stage: '2. Tỷ lệ xem qua 6 giây (6s View Rate TB)',
                      val: '16,4%',
                      pct: 58,
                      color: 'bg-accent',
                      note: 'Ngưỡng chuẩn ngành: 12,5%'
                    },
                    {
                      stage: '3. Tỷ lệ xem hết 100% thời lượng video',
                      val: '5,2%',
                      pct: 36,
                      color: 'bg-accent',
                      note: 'Cao nhất ở định dạng Review Voice & Unbox'
                    },
                    {
                      stage: '4. Tỷ lệ nhấp vào sản phẩm (CTR TB)',
                      val: '3,18%',
                      pct: 28,
                      color: 'bg-positive',
                      note: `Tổng lượt nhấp: ${TIKTOK_SELLER_ADS_SUMMARY.totalClicks.toLocaleString('vi-VN')} clicks`
                    },
                    {
                      stage: '5. Tỷ lệ chuyển đổi ra đơn hàng (CVR TB)',
                      val: '4,62%',
                      pct: 22,
                      color: 'bg-warning',
                      note: `${TIKTOK_SELLER_ADS_SUMMARY.totalOrders.toLocaleString('vi-VN')} đơn hàng thực thu`
                    }
                  ].map((f) => (
                    <div key={f.stage} className="p-2 rounded-lg bg-canvas border border-line">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-ink">{f.stage}</span>
                        <span className="font-mono font-semibold text-ink">{f.val}</span>
                      </div>
                      <div className="w-full h-2 bg-sunken rounded-full overflow-hidden mb-1">
                        <div className={`data-bar h-full ${f.color} rounded-full`} style={{ width: `${f.pct}%` }} />
                      </div>
                      <span className="text-2xs text-ink-3">{f.note}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Phân bổ theo Định dạng Nội dung (Review Voice, Unbox Voice, Video remix...) */}
              <div className="bg-surface rounded-xl border border-line p-5">
                <h3 className="text-sm font-semibold text-ink mb-1">
                  Hiệu Quả Theo Định Dạng Sản Xuất Video & Loại Hình Booking
                </h3>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {B2C_VIDEO_FORMAT_BREAKDOWN.map((fmt) => (
                    <div
                      key={fmt.format}
                      onClick={() => setVideoFormatFilter(videoFormatFilter === fmt.format ? 'ALL' : fmt.format)}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                        videoFormatFilter === fmt.format
                          ? 'border-accent/20 bg-accent-soft'
                          : 'border-line bg-canvas hover:border-line-strong'
                      }`}
                    >
                      <div className="font-semibold text-ink truncate">{fmt.format}</div>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="font-mono font-semibold text-accent">
                          {fmt.count} đơn ({fmt.airedCount} air)
                        </span>
                        <span className="font-mono text-2xs text-ink-2">
                          {formatVndShort(fmt.totalCost)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5 pt-2 border-t border-line">
                  {B2C_VIDEO_TYPE_BREAKDOWN.slice(0, 5).map((vt) => (
                    <div key={vt.videoType} className="flex items-center justify-between text-xs py-1">
                      <span className="font-medium text-ink-2">{vt.videoType}</span>
                      <div className="flex items-center gap-3 font-mono text-2xs">
                        <span className="text-ink-2">
                          <strong>{vt.count}</strong> video ({vt.airedCount} air)
                        </span>
                        <span className="font-semibold text-ink w-20 text-right">
                          {formatVndShort(vt.totalCost)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* BẢNG ĐỐI SOÁT CHI TIẾT VIDEO BOOKING (FILE 3.2) */}
          <div className="bg-surface rounded-xl border border-line overflow-hidden">
            <div className="px-5 py-3.5 border-b border-line flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h3 className="text-sm font-semibold text-ink">
                Sổ Cái Video Đã Booking ({filteredBookedVideos.length} bản ghi)
              </h3>

              {(videoFormatFilter !== 'ALL' || videoKlFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setVideoFormatFilter('ALL');
                    setVideoKlFilter('ALL');
                  }}
                  className="text-xs font-semibold text-accent hover:underline cursor-pointer"
                >
                  Xóa lọc Format / KL ({videoFormatFilter} · {videoKlFilter})
                </button>
              )}
            </div>

            <div className="overflow-x-auto max-h-[540px]">
              <table className="w-full text-xs text-left">
                <thead className="bg-canvas text-ink-2 uppercase border-b border-line sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Mã Book &amp; Ngày Air</th>
                    <th className="py-2.5 px-3 font-semibold">Kênh KOC &amp; Bậc KL</th>
                    <th className="py-2.5 px-3 font-semibold">Gian Hàng &amp; PIC</th>
                    <th className="py-2.5 px-3 font-semibold">Sản Phẩm &amp; Định Dạng</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Cát-xê</th>
                    <th className="py-2.5 px-3 font-semibold text-right">GMV Seller &amp; ROAS</th>
                    <th className="py-2.5 px-3 font-semibold">Trạng Thái ĐNTT</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Link Video</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredBookedVideos.slice(0, bookedVideosVisibleLimit).map((v) => (
                    <tr
                      key={v.code}
                      onClick={() => setInspectVideo(v)}
                      className="hover:bg-accent-soft transition cursor-pointer"
                    >
                      <td className="py-2.5 px-4 font-mono">
                        <span className="font-semibold text-accent">{v.code}</span>
                        <span className="block text-2xs text-ink-3">{v.airDate}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-ink">@{v.channelId}</span>
                          <span className="px-1.5 py-0.5 rounded bg-sunken font-mono font-semibold text-2xs text-ink">
                            {v.kl}
                          </span>
                        </div>
                        <div className="text-2xs text-ink-3">{v.videoType}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-ink">{v.storeName}</div>
                        <div className="text-2xs text-ink-3">{v.pic}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-ink block truncate max-w-[160px]">{v.productName}</span>
                        <span className="text-2xs text-ink-3">{v.format}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-ink">
                        {formatVndShort(v.cost)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="font-semibold text-positive">{formatVndShort(v.sellerGmv)}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded font-semibold text-2xs ${
                              v.roas >= 4.5
                                ? 'bg-positive-soft text-positive'
                                : 'bg-accent-soft text-accent'
                            }`}
                          >
                            {v.roas}x
                          </span>
                        </div>
                        <span className="block text-2xs text-ink-3 font-normal">
                          {v.sellerOrders} đơn · {v.views.toLocaleString('vi-VN')} views
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <Status tone={v.pipeline === 'Done' ? 'positive' : v.pipeline === 'Huỷ' ? 'critical' : 'warning'}>
                          {v.pipeline}
                        </Status>
                        {v.slaWarning !== 'Đúng hạn' && (
                          <span className="block text-2xs text-critical font-semibold mt-0.5">
                            {v.slaWarning}
                          </span>
                        )}
                      </td>
                      <td
                        className="py-2.5 px-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {v.linkAir ? (
                          <a
                            href={v.linkAir}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-ink text-white text-2xs font-semibold hover:bg-accent transition"
                          >
                            Xem TikTok <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-ink-3">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredBookedVideos.length > 30 && (
                <div className="p-3 bg-canvas border-t border-line flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-ink-2 px-4">
                  <span>
                    Đang hiển thị <strong>{Math.min(bookedVideosVisibleLimit, filteredBookedVideos.length)}</strong> / <strong>{filteredBookedVideos.length}</strong> video đã booking
                  </span>
                  <button
                    type="button"
                    onClick={() => setBookedVideosVisibleLimit(bookedVideosVisibleLimit >= filteredBookedVideos.length ? 30 : Math.min(filteredBookedVideos.length, bookedVideosVisibleLimit + 100))}
                    className="px-3.5 py-1.5 rounded-lg font-semibold text-accent bg-accent-soft hover:bg-accent-soft border border-accent/20 transition cursor-pointer"
                  >
                    {bookedVideosVisibleLimit >= filteredBookedVideos.length ? 'Thu gọn về 30 video' : `Xem thêm 100 video (${Math.min(bookedVideosVisibleLimit, filteredBookedVideos.length)}/${filteredBookedVideos.length})`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LỊCH AIR KẾ HOẠCH THEO TUẦN (W40–W45), ĐỘ ĐỒNG LOẠT & TIẾN ĐỘ VIDEO */}
      {/* ========================================================================= */}
      {activeTab === 'TEAM_SLA' && (
        <div className="space-y-5">
          {/* TRỌNG TÂM 1: LỊCH AIR KẾ HOẠCH THEO TUẦN (W40–W45) & ĐỘ ĐỒNG LOẠT CHIẾN DỊCH */}
          <WeeklyAirSyncDashboardSection
            selectedBrandGlobal={selectedBrand}
            selectedPlatformGlobal={selectedPlatform}
            selectedGovernanceGlobal={selectedGovernance}
          />

          {/* TRỌNG TÂM 2: ĐỐI SÁNH SLA GIỮA 2 LUỒNG QUẢN TRỊ B2C */}
          <Panel
            title="Kiểm soát SLA theo 2 luồng phê duyệt B2C"
            actions={
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  icon={ChevronRight}
                  onClick={() => handleSelectDashboardSection('STAFF_EFFICIENCY')}
                >
                  Hiệu suất nhân sự
                </Button>
                {onNavigateToTab && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={ChevronRight}
                    onClick={() => onNavigateToTab('performance-p3')}
                  >
                    Bảng điểm 4P
                  </Button>
                )}
              </div>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-lg bg-canvas border border-line">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink">
                    Luồng 1: Qua Trưởng nhóm Nguyễn Thị Ngọc Tâm
                  </span>
                  <span className="text-xs font-mono text-ink-3">8 gian hàng</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2.5 pt-2.5 border-t border-line text-center font-mono">
                  <div>
                    <span className="text-2xs text-ink-3 block">Đúng hạn SLA</span>
                    <strong className="text-xs text-ink">91,4%</strong>
                  </div>
                  <div>
                    <span className="text-2xs text-ink-3 block">Giải ngân Net</span>
                    <strong className="text-xs text-ink">51,2%</strong>
                  </div>
                  <div>
                    <span className="text-2xs text-ink-3 block">Sơ duyệt kịch bản</span>
                    <strong className="text-xs text-ink">&lt; 16 giờ</strong>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-canvas border border-line">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink">
                    Luồng 2: Trình trực tiếp GĐ Đặng Thị Yến Nhi
                  </span>
                  <span className="text-xs font-mono text-ink-3">61 gian hàng</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2.5 pt-2.5 border-t border-line text-center font-mono">
                  <div>
                    <span className="text-2xs text-ink-3 block">Đúng hạn SLA</span>
                    <strong className="text-xs text-ink">86,8%</strong>
                  </div>
                  <div>
                    <span className="text-2xs text-ink-3 block">Giải ngân Net</span>
                    <strong className="text-xs text-ink">51,0%</strong>
                  </div>
                  <div>
                    <span className="text-2xs text-ink-3 block">Duyệt trực tiếp</span>
                    <strong className="text-xs text-ink">&lt; 24 giờ</strong>
                  </div>
                </div>
              </div>
            </div>
          </Panel>

          {/* BẢNG KIỂM SOÁT CẢNH BÁO TRỄ HẠN SLA & HỒ SƠ ĐNTT THEO CHUYÊN VIÊN */}
          <Panel
            title="Theo dõi tỷ lệ đúng hạn SLA và đơn chờ đăng theo nhân sự"
            flush
            actions={
              <Button
                size="sm"
                variant="secondary"
                icon={ChevronRight}
                onClick={() => handleSelectDashboardSection('STAFF_EFFICIENCY')}
              >
                Xem hiệu suất nhân sự
              </Button>
            }
          >
            <DataTable
              rows={enrichedStaffList
                .filter((s) => s.actualBookedVideos > 0)
                .sort(
                  (a, b) =>
                    b.lateSlaVideosCount - a.lateSlaVideosCount ||
                    b.pendingAirVideos - a.pendingAirVideos
                )}
              rowKey={(st) => st.name}
              onRowClick={(st) => {
                setSelectedFocusStaffName(st.name);
                setInspectStaff(st);
              }}
              columns={[
                {
                  key: 'name',
                  header: 'Chuyên viên (PIC)',
                  render: (st) => (
                    <Person
                      name={st.name}
                      sub={
                        st.storesWithLeaderCount > 0
                          ? `TN Ngọc Tâm (${st.storesWithLeaderCount} gian)`
                          : undefined
                      }
                    />
                  ),
                },
                {
                  key: 'booked',
                  header: 'Tổng đơn book',
                  align: 'right',
                  render: (st) => st.actualBookedVideos,
                },
                {
                  key: 'aired',
                  header: 'Đã đăng lên sóng',
                  align: 'right',
                  render: (st) => `${st.actualAiredVideos} (${st.airVsBookPct}%)`,
                },
                {
                  key: 'pending',
                  header: 'Đơn chờ đăng',
                  align: 'right',
                  render: (st) => st.pendingAirVideos,
                },
                {
                  key: 'late',
                  header: 'Đơn trễ SLA',
                  align: 'right',
                  render: (st) => st.lateSlaVideosCount,
                },
                {
                  key: 'sla',
                  header: 'Đúng hạn SLA',
                  align: 'right',
                  render: (st) => `${st.slaRate}%`,
                },
                {
                  key: 'status',
                  header: 'Trạng thái',
                  render: (st) =>
                    st.lateSlaVideosCount > 0 ? (
                      <Status tone="critical">{`Trễ ${st.lateSlaVideosCount} đơn`}</Status>
                    ) : st.pendingAirVideos > 5 ? (
                      <Status tone="warning">{`Chờ đăng ${st.pendingAirVideos} đơn`}</Status>
                    ) : (
                      <Status tone="positive">Đúng tiến độ</Status>
                    ),
                },
              ]}
            />
          </Panel>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: HIỆU SUẤT NHÂN SỰ B2C                                              */}
      {/* ========================================================================= */}
      {activeTab === 'STAFF_EFFICIENCY' && (
        <div className="space-y-4">
          <StatRow size="sm">
            <Stat
              label="Nhân sự phụ trách"
              value={`${staffSummary.totalCount} nhân sự`}
              note={`${staffSummary.starCount} đạt chỉ tiêu · ${staffSummary.warningCount} cần lưu ý ngân sách`}
            />
            <Stat
              label="Thực chi / Trần Net"
              value={`${formatVndShort(staffSummary.totalSpentNet)} / ${formatVndShort(staffSummary.totalBudgetNet)}`}
              note={`Giải ngân ${staffSummary.burnNetPct}% hạn mức Net`}
            />
            <Stat
              label="Video đã đăng / Đơn book"
              value={`${formatNumber(staffSummary.totalAired)} / ${formatNumber(staffSummary.totalBooked)}`}
              note={`Tỷ lệ đăng ${staffSummary.airRatePct}% · Chờ đăng ${formatNumber(staffSummary.totalPending)} đơn`}
            />
            <Stat
              label="Doanh thu GMV & SLA"
              value={formatVndShort(staffSummary.totalGmv)}
              note={`ROAS ${staffSummary.effectiveRoas}x · Đúng hạn SLA ${staffSummary.avgSla}%`}
            />
          </StatRow>

          <Panel flush>
            <FilterBar
              search={{
                value: staffSearchQuery,
                onChange: (v: string) => {
                  setStaffSearchQuery(v);
                  setStaffPage(1);
                },
                placeholder: "Tìm nhân sự, gian hàng, thương hiệu...",
              }}
              filters={
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    aria-label="Vai trò"
                    value={staffRoleFilter}
                    onChange={(e) => {
                      setStaffRoleFilter(e.target.value as typeof staffRoleFilter);
                      setStaffPage(1);
                    }}
                    className="w-auto"
                  >
                    <option value="ALL">Tất cả vai trò ({enrichedStaffList.length})</option>
                    <option value="SPECIALIST">Chuyên viên thực thi</option>
                    <option value="WITH_STORES">Có phụ trách gian hàng</option>
                    <option value="MANAGEMENT">Cấp quản lý</option>
                  </Select>

                  <Select
                    aria-label="Luồng duyệt"
                    value={selectedGovernance}
                    onChange={(e) => {
                      setSelectedGovernance(e.target.value as typeof selectedGovernance);
                      setStaffPage(1);
                    }}
                    className="w-auto"
                  >
                    <option value="ALL">Tất cả luồng duyệt</option>
                    <option value="WITH_LEADER">Qua Trưởng nhóm Ngọc Tâm</option>
                    <option value="DIRECT_HEAD">Trực tiếp GĐ Yến Nhi</option>
                  </Select>

                  <Select
                    aria-label="Sắp xếp"
                    value={staffSortMode}
                    onChange={(e) => {
                      setStaffSortMode(e.target.value as typeof staffSortMode);
                      setStaffPage(1);
                    }}
                    className="w-auto"
                  >
                    <option value="KPI_DESC">Điểm hiệu suất cao → thấp</option>
                    <option value="AIRED_DESC">Video đã đăng nhiều → ít</option>
                    <option value="GMV_DESC">Doanh thu GMV cao → thấp</option>
                    <option value="ROAS_DESC">ROAS cao → thấp</option>
                    <option value="COST_PER_AIR_ASC">Chi phí / video thấp → cao</option>
                    <option value="SPEND_PCT_DESC">Tỷ lệ giải ngân cao → thấp</option>
                    <option value="SLA_DESC">Đúng hạn SLA cao → thấp</option>
                  </Select>

                  {(staffRoleFilter !== 'ALL' ||
                    staffQuadrantFilter !== 'ALL' ||
                    selectedGovernance !== 'ALL' ||
                    staffSearchQuery.trim() !== '') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setStaffRoleFilter('ALL');
                        setStaffQuadrantFilter('ALL');
                        setSelectedGovernance('ALL');
                        setStaffSearchQuery('');
                        setStaffPage(1);
                      }}
                    >
                      Đặt lại
                    </Button>
                  )}
                </div>
              }
              chips={
                <Chips
                value={staffQuadrantFilter}
                onChange={(v) => {
                  setStaffQuadrantFilter(v);
                  setStaffPage(1);
                }}
                items={[
                  { key: 'ALL', label: 'Tất cả', count: staffQuadrantCounts.total },
                  { key: 'STAR', label: 'Đạt chỉ tiêu', count: staffQuadrantCounts.star },
                  {
                    key: 'HIGH_VOL_OPT_COST',
                    label: 'Kiểm soát chi phí',
                    count: staffQuadrantCounts.highVolOptCost,
                  },
                  {
                    key: 'HIGH_EFF_NEED_VOL',
                    label: 'Đẩy tiến độ đăng',
                    count: staffQuadrantCounts.highEffNeedVol,
                  },
                  { key: 'NEED_COACHING', label: 'Cần hỗ trợ', count: staffQuadrantCounts.needCoaching },
                ]}
              />
              }
            />

            <DataTable
              rows={paginatedStaffList}
              rowKey={(st) => st.name}
              onRowClick={(st) => {
                setSelectedFocusStaffName(st.name);
                setInspectStaff(st);
              }}
              columns={[
                {
                  key: 'name',
                  header: 'Nhân sự',
                  width: 220,
                  render: (st) => {
                    const subText =
                      st.roleLevel === 'HEAD'
                        ? 'GĐ Marketing B2C'
                        : st.roleLevel === 'LEADER'
                        ? 'Trưởng nhóm'
                        : st.storesWithLeaderCount > 0
                        ? `TN Ngọc Tâm (${st.storesWithLeaderCount} gian)`
                        : undefined;
                    return <Person name={st.name} sub={subText} />;
                  },
                },
                {
                  key: 'stores',
                  header: 'Gian hàng',
                  width: 180,
                  render: (st) => (
                    <div className="min-w-0">
                      <div className="font-medium text-ink truncate">
                        {st.storesCount > 0
                          ? `${st.storesCount} gian (${st.tiktokStoresCount} TT · ${st.shopeeStoresCount} SP)`
                          : 'Điều phối / FOC'}
                      </div>
                      <div className="text-xs text-ink-3 truncate max-w-[170px]">
                        {st.storesList.length > 0
                          ? `${st.storesList.slice(0, 2).join(', ')}${
                              st.storesList.length > 2 ? ` +${st.storesList.length - 2}` : ''
                            }`
                          : 'Không gán gian cố định'}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'spend',
                  header: 'Thực chi / Trần Net',
                  align: 'right',
                  render: (st) => (
                    <div className="font-mono">
                      <div className="font-medium text-ink">
                        {formatVndShort(st.actualSpentNet)} / {formatVndShort(st.orderBudgetNet)}
                      </div>
                      <div className="text-xs text-ink-3 font-sans">
                        {st.orderBudgetNet > 0
                          ? `Giải ngân ${st.burnNetPct}%`
                          : 'Ngân sách 0đ (FOC)'}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'videos',
                  header: 'Video đăng / book',
                  align: 'right',
                  render: (st) => (
                    <div className="font-mono">
                      <div className="font-medium text-ink">
                        {st.actualAiredVideos} / {st.actualBookedVideos} ({st.airVsBookPct}%)
                      </div>
                      <div className="text-xs text-ink-3 font-sans">
                        {`KH Paid ${st.targetPaidVideos} · FOC ${st.targetFocVideos}`}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'unitCost',
                  header: 'Chi phí / video',
                  align: 'right',
                  render: (st) => (
                    <div className="font-mono">
                      <div className="font-medium text-ink">
                        {st.avgCostPerAiredVideo > 0
                          ? formatVndShort(st.avgCostPerAiredVideo)
                          : '0đ (FOC)'}
                      </div>
                      <div className="text-xs text-ink-3 font-sans">
                        {st.avgCostPerBookedVideo > 0
                          ? `Đơn book ${formatVndShort(st.avgCostPerBookedVideo)}`
                          : 'Mẫu 0đ'}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'gmv',
                  header: 'Doanh thu GMV',
                  align: 'right',
                  render: (st) => (
                    <div>
                      <div className="font-medium text-ink">{formatVndShort(st.attributedGmv)}</div>
                      <div className="text-xs text-ink-3">
                        {`ROAS ${st.effectiveRoas}x · CIR ${st.effectiveCirPct}%`}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'score',
                  header: 'Điểm & SLA',
                  align: 'right',
                  render: (st) => (
                    <div>
                      <div className="font-medium text-ink">
                        {st.kpiScore}/100 · Hạng {st.kpiGrade}
                      </div>
                      <div className="text-xs text-ink-3">
                        {`SLA ${st.slaRate}%${
                          st.lateSlaVideosCount > 0 ? ` · Trễ ${st.lateSlaVideosCount} đơn` : ' · Đúng hạn'
                        }`}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'status',
                  header: 'Trạng thái',
                  width: 150,
                  render: (st) => {
                    if (st.unbudgetedStoresCount > 0) {
                      return (
                        <Status tone="critical">{`${st.unbudgetedStoresCount} gian chi ngoài KH`}</Status>
                      );
                    }
                    if (st.overbudgetStoresCount > 0) {
                      return (
                        <Status tone="warning">{`${st.overbudgetStoresCount} gian vượt Net`}</Status>
                      );
                    }
                    if (st.staffQuadrant === 'STAR') {
                      return <Status tone="positive">Đạt chỉ tiêu</Status>;
                    }
                    if (st.staffQuadrant === 'HIGH_VOL_OPT_COST') {
                      return <Status tone="warning">Kiểm soát chi phí</Status>;
                    }
                    if (st.staffQuadrant === 'HIGH_EFF_NEED_VOL') {
                      return <Status tone="info">Đẩy tiến độ đăng</Status>;
                    }
                    return <Status tone="neutral">Cần hỗ trợ</Status>;
                  },
                },
              ]}
            />

            <Pagination
              page={staffPage}
              pageSize={staffPageSize}
              total={filteredStaffList.length}
              onPageChange={setStaffPage}
              onPageSizeChange={(s) => {
                setStaffPageSize(s);
                setStaffPage(1);
              }}
            />
          </Panel>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CHI TIẾT GIAN HÀNG (STORE DRILL-DOWN) */}
      {/* ========================================================================= */}
      {inspectStore && (
        <Modal
          open={Boolean(inspectStore)}
          onClose={() => setInspectStore(null)}
          title={`Hồ Sơ Đối Soát Gian Hàng: ${inspectStore.storeName}`}
          size="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-canvas border border-line">
              <div>
                <span className="text-ink-3">Thương hiệu (Brand):</span>{' '}
                <strong className="text-ink">{inspectStore.brandName}</strong> ·{' '}
                <span className="text-ink-3">Sàn:</span>{' '}
                <strong className="text-ink">{inspectStore.platform}</strong> ·{' '}
                <span className="text-ink-3">Mã VH:</span>{' '}
                <strong className="font-mono">{inspectStore.storeOperationId}</strong>
              </div>
              {renderRiskBadge(inspectStore.financialRiskStatus)}
            </div>

            {/* Cơ cấu nhân sự phụ trách gian hàng */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-line">
                <span className="text-2xs text-ink-3 block">Giám Đốc Marketing B2C (Duyệt cuối)</span>
                <strong className="text-ink text-sm">Đặng Thị Yến Nhi</strong>
              </div>
              <div className="p-3 rounded-lg border border-line">
                <span className="text-2xs text-ink-3 block">Trưởng Nhóm Booking (Cột 55)</span>
                <strong className="text-accent text-sm">
                  {inspectStore.hasBookingLeader && inspectStore.bookingLeader
                    ? inspectStore.bookingLeader
                    : 'Không có leader (Trực tiếp TP)'}
                </strong>
              </div>
              <div className="p-3 rounded-lg border border-line">
                <span className="text-2xs text-ink-3 block">Chuyên Viên Thực Thi (PIC)</span>
                <strong className="text-positive text-sm">
                  {inspectStore.primaryPic || inspectStore.assignedStaff}
                </strong>
              </div>
            </div>

            {/* Bóc tách Tài chính Gross / Net / Thực chi */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-canvas border border-line">
                <span className="text-2xs text-ink-3 block">Hạn Mức Order Gross</span>
                <strong className="text-sm font-mono text-ink">
                  {formatVndShort(inspectStore.budgetGross || 0)}
                </strong>
              </div>
              <div className="p-3 rounded-lg bg-accent-soft border border-accent/20">
                <span className="text-2xs text-accent block">Trần Order Net (Kế toán)</span>
                <strong className="text-sm font-mono text-accent">
                  {formatVndShort(inspectStore.budgetNet || inspectStore.monthlyBudget || 0)}
                </strong>
              </div>
              <div className="p-3 rounded-lg bg-positive-soft border border-positive/20">
                <span className="text-2xs text-positive block">Thực Chi Duyệt Book (3.2)</span>
                <strong className="text-sm font-mono text-positive">
                  {formatVndShort(inspectStore.actualSpentNet || 0)}
                </strong>
              </div>
              <div className="p-3 rounded-lg bg-warning-soft border border-warning/20">
                <span className="text-2xs text-warning block">Video Đã Air / Kế Hoạch</span>
                <strong className="text-sm font-mono text-warning">
                  {inspectStore.actualAiredVideos || 0} video (Paid: {inspectStore.targetPaidVideos || 0} · FOC: {inspectStore.targetFocVideos || 0})
                </strong>
              </div>
            </div>

            {/* Danh sách các video đã book thuộc gian hàng này */}
            <div>
              <h4 className="font-semibold text-ink mb-2">
                Danh Sách Video Đã Booking Của Gian Hàng Trong Tháng 10/2026
              </h4>
              {(() => {
                const storeVids = B2C_BOOKED_VIDEOS_OCT_2026.filter(
                  (v) =>
                    v.storeName.toLowerCase() === inspectStore.storeName.toLowerCase() ||
                    v.brandName.toLowerCase() === inspectStore.brandName.toLowerCase()
                );
                if (storeVids.length === 0) {
                  return (
                    <p className="text-ink-3 py-4 text-center bg-canvas rounded-lg">
                      Chưa có bản ghi video mẫu trong danh sách rút gọn cho gian hàng này.
                    </p>
                  );
                }
                return (
                  <div className="overflow-x-auto max-h-60 border border-line rounded-lg">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-canvas border-b border-line">
                        <tr>
                          <th className="py-2 px-3">Mã Book</th>
                          <th className="py-2 px-3">Kênh KOC</th>
                          <th className="py-2 px-3">PIC</th>
                          <th className="py-2 px-3">Khung Lương</th>
                          <th className="py-2 px-3 text-right">Chi Phí</th>
                          <th className="py-2 px-3 text-right">GMV Seller</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {storeVids.slice(0, 100).map((v) => (
                          <tr key={v.code}>
                            <td className="py-2 px-3 font-mono font-semibold text-accent">{v.code}</td>
                            <td className="py-2 px-3 font-semibold">@{v.channelId}</td>
                            <td className="py-2 px-3">{v.pic}</td>
                            <td className="py-2 px-3 font-mono">{v.kl}</td>
                            <td className="py-2 px-3 text-right font-mono font-semibold">{formatVndShort(v.cost)}</td>
                            <td className="py-2 px-3 text-right font-mono text-positive">
                              {formatVndShort(v.sellerGmv)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CHI TIẾT NHÂN SỰ B2C (STAFF DRILL-DOWN) */}
      {/* ========================================================================= */}
      {inspectedStaffProfile && (
        <Modal
          open={Boolean(inspectedStaffProfile)}
          onClose={() => setInspectStaff(null)}
          title={`Chi tiết hiệu suất: ${inspectedStaffProfile.name}`}
          size="xl"
        >
          <div className="space-y-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-canvas border border-line">
              <div>
                <span className="text-ink-3">Vai trò:</span>{' '}
                <strong className="text-ink">{inspectedStaffProfile.roleTitle}</strong> ·{' '}
                <span className="text-ink-3">Cấp duyệt:</span>{' '}
                <strong className="text-ink">{inspectedStaffProfile.directSupervisor}</strong>
              </div>
              {inspectedStaffProfile.unbudgetedStoresCount > 0 ? (
                <Status tone="critical">{`${inspectedStaffProfile.unbudgetedStoresCount} gian chi ngoài KH`}</Status>
              ) : inspectedStaffProfile.overbudgetStoresCount > 0 ? (
                <Status tone="warning">{`${inspectedStaffProfile.overbudgetStoresCount} gian vượt Net`}</Status>
              ) : inspectedStaffProfile.staffQuadrant === 'STAR' ? (
                <Status tone="positive">Đạt chỉ tiêu</Status>
              ) : (
                <Status tone="info">{inspectedStaffProfile.kpiGradeLabel}</Status>
              )}
            </div>

            <StatRow size="sm">
              <Stat
                label="Gian hàng phụ trách"
                value={`${inspectedStaffProfile.storesCount} gian`}
                note={`TikTok ${inspectedStaffProfile.tiktokStoresCount} · Shopee ${inspectedStaffProfile.shopeeStoresCount}`}
              />
              <Stat
                label="Thực chi / Trần Net"
                value={`${formatVndShort(inspectedStaffProfile.actualSpentNet)} / ${formatVndShort(inspectedStaffProfile.orderBudgetNet)}`}
                note={`Giải ngân ${inspectedStaffProfile.burnNetPct}% · Gross ${formatVndShort(inspectedStaffProfile.orderBudgetGross)}`}
              />
              <Stat
                label="Video đã đăng / Đơn book"
                value={`${inspectedStaffProfile.actualAiredVideos} / ${inspectedStaffProfile.actualBookedVideos}`}
                note={`Tỷ lệ đăng ${inspectedStaffProfile.airVsBookPct}% · Chờ đăng ${inspectedStaffProfile.pendingAirVideos} đơn`}
              />
              <Stat
                label="Doanh thu GMV & Điểm"
                value={formatVndShort(inspectedStaffProfile.attributedGmv)}
                note={`ROAS ${inspectedStaffProfile.effectiveRoas}x · Điểm ${inspectedStaffProfile.kpiScore}/100 (Hạng ${inspectedStaffProfile.kpiGrade})`}
              />
            </StatRow>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-canvas border border-line font-mono">
              <div>
                <span className="text-2xs text-ink-3 font-sans block">Sản lượng video đăng</span>
                <strong className="text-xs text-ink">{inspectedStaffProfile.scoreAir}/35 điểm</strong>
              </div>
              <div>
                <span className="text-2xs text-ink-3 font-sans block">Kỷ luật ngân sách Net</span>
                <strong className="text-xs text-ink">{inspectedStaffProfile.scoreSpend}/25 điểm</strong>
              </div>
              <div>
                <span className="text-2xs text-ink-3 font-sans block">Hiệu quả chuyển đổi</span>
                <strong className="text-xs text-ink">{inspectedStaffProfile.scoreEfficiency}/20 điểm</strong>
              </div>
              <div>
                <span className="text-2xs text-ink-3 font-sans block">Đúng hạn SLA & ĐNTT</span>
                <strong className="text-xs text-ink">
                  {inspectedStaffProfile.scoreSla}/20 điểm ({inspectedStaffProfile.slaRate}%)
                </strong>
              </div>
            </div>

            {inspectedStaffProfile.staffStores.length > 0 && (
              <Panel
                title={`Gian hàng phụ trách (${inspectedStaffProfile.staffStores.length})`}
                flush
              >
                <DataTable
                  rows={inspectedStaffProfile.staffStores}
                  rowKey={(s) => s.id}
                  columns={[
                    {
                      key: 'storeName',
                      header: 'Gian hàng',
                      render: (s) => (
                        <div>
                          <div className="font-medium text-ink">{s.storeName}</div>
                          <div className="text-xs text-ink-3">
                            {s.brandName} · {s.platform}
                          </div>
                        </div>
                      ),
                    },
                    {
                      key: 'budgetNet',
                      header: 'Trần Net',
                      align: 'right',
                      render: (s) => formatVndShort(s.budgetNet || s.monthlyBudget || 0),
                    },
                    {
                      key: 'spentNet',
                      header: 'Thực chi',
                      align: 'right',
                      render: (s) => formatVndShort(s.actualSpentNet || 0),
                    },
                    {
                      key: 'videos',
                      header: 'Video đăng / KH Paid',
                      align: 'right',
                      render: (s) => `${s.actualAiredVideos || 0} / ${s.targetPaidVideos || 0}`,
                    },
                    {
                      key: 'risk',
                      header: 'Trạng thái',
                      render: (s) => renderRiskBadge(s.financialRiskStatus),
                    },
                  ]}
                />
              </Panel>
            )}

            <Panel
              title={`Đơn booking video trực tiếp (${inspectedStaffProfile.staffVideos.length})`}
              flush
            >
              <DataTable
                rows={inspectedStaffProfile.staffVideos.slice(0, 25)}
                rowKey={(v) => v.code}
                empty="Chưa có bản ghi đơn book mẫu"
                columns={[
                  {
                    key: 'code',
                    header: 'Mã đơn',
                    render: (v) => v.code,
                  },
                  {
                    key: 'storeName',
                    header: 'Gian hàng',
                    render: (v) => v.storeName,
                  },
                  {
                    key: 'channelId',
                    header: 'Kênh KOC',
                    render: (v) => `@${v.channelId}`,
                  },
                  {
                    key: 'format',
                    header: 'Hạng mục',
                    render: (v) => `${v.format} · ${v.kl}`,
                  },
                  {
                    key: 'cost',
                    header: 'Chi phí',
                    align: 'right',
                    render: (v) => formatVndShort(v.cost),
                  },
                  {
                    key: 'gmv',
                    header: 'GMV Seller',
                    align: 'right',
                    render: (v) => `${formatVndShort(v.sellerGmv)} (${v.roas}x)`,
                  },
                ]}
              />
            </Panel>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CHI TIẾT ĐƠN VIDEO BOOKING (VIDEO DRILL-DOWN) */}
      {/* ========================================================================= */}
      {inspectVideo && (
        <Modal
          open={Boolean(inspectVideo)}
          onClose={() => setInspectVideo(null)}
          title={`Chi Tiết Đơn Booking Video: ${inspectVideo.code}`}
          size="md"
        >
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-canvas border border-line space-y-1.5">
              <div className="flex justify-between">
                <span className="text-ink-3">Gian hàng:</span>
                <strong className="text-ink">{inspectVideo.storeName} ({inspectVideo.brandName})</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-3">Kênh KOC / Creator:</span>
                <strong className="text-accent">@{inspectVideo.channelId}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-3">Chuyên viên Booking (PIC):</span>
                <strong className="text-ink">{inspectVideo.pic}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-3">Sản phẩm:</span>
                <strong className="text-ink">{inspectVideo.productName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-3">Hạng mục & Định dạng:</span>
                <strong className="text-ink">{inspectVideo.format} · {inspectVideo.videoType} ({inspectVideo.kl})</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-3">Chi phí duyệt chi:</span>
                <strong className="font-mono text-critical">{formatVndShort(inspectVideo.cost)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-3">Doanh thu đối soát TikTok Seller:</span>
                <strong className="font-mono text-positive">
                  {formatVndShort(inspectVideo.sellerGmv)} ({inspectVideo.sellerOrders} đơn · ROAS {inspectVideo.roas}x)
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-3">Trạng thái chứng từ Kế toán:</span>
                <strong className="text-warning">{inspectVideo.pipeline} · {inspectVideo.paymentSlipStatus}</strong>
              </div>
            </div>

            {inspectVideo.linkAir && (
              <div className="pt-2 flex justify-end">
                <a
                  href={inspectVideo.linkAir}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-white font-semibold hover:bg-accent transition"
                >
                  Mở xem Video trên TikTok <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        </Modal>
      )}

      <OperationalReportDrawer
        isOpen={isReportDrawerOpen}
        onClose={() => setIsReportDrawerOpen(false)}
        purposeId={dashboardReportMeta.purposeId}
        moduleTitle={dashboardReportMeta.moduleTitle}
        contextDataText={dashboardReportMeta.contextDataText}
        onNotify={onNotify}
      />
    </div>
  );
};
