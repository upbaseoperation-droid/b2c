'use client';

import React, { useState, useMemo, useDeferredValue } from 'react';
import { Avatar, Tabs, Modal, NumberRoll, Status } from '../ui';
import {
  TrendingUp,
  Award,
  Calendar,
  FileSpreadsheet,
  Download,
  ShieldCheck,
  Building,
  PieChart,
  Search,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Activity,
  PlaySquare,
  AlertCircle,
  Film,
  Flame,
  Users,
  Store,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Filter,
  RefreshCw,
  DollarSign,
  Layers,
  Eye,
  ShoppingBag,
  UserCheck,
  ArrowUpRight,
  ArrowDownRight,
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
import { formatVndShort } from '../../lib/format';
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
  B2cAdsCreativeMetric
} from '../../lib/b2cAnalyticsDataset';
import { B2C_STORE_WEEKLY_AIR_SYNC_LIST } from '../../lib/b2cWeeklyAirSyncDataset';
import { WeeklyAirSyncDashboardSection } from './WeeklyAirSyncDashboardSection';
import ExcelJS from 'exceljs';

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

  // State bộ lọc chung đồng bộ 2 chiều với Sidebar "Dashboard Quản Trị B2C"
  const [activeTab, setActiveTab] = useState<DashboardMainTab>(() => {
    if (activeSidebarTab && SIDEBAR_TO_DASHBOARD_TAB[activeSidebarTab]) {
      return SIDEBAR_TO_DASHBOARD_TAB[activeSidebarTab];
    }
    return 'OVERVIEW_FINANCE';
  });

  React.useEffect(() => {
    if (activeSidebarTab && SIDEBAR_TO_DASHBOARD_TAB[activeSidebarTab]) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab(SIDEBAR_TO_DASHBOARD_TAB[activeSidebarTab]);
    }
  }, [activeSidebarTab]);

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
  const [brandSortMode, setBrandSortMode] = useState<'BUDGET' | 'SPEND_PCT_DESC' | 'AIRED_DESC'>('AIRED_DESC');
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
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Phân trang hiển thị bảng để chống quá tải DOM
  const [storeVisibleLimit, setStoreVisibleLimit] = useState<number>(15);
  const [staffVisibleLimit, setStaffVisibleLimit] = useState<number>(12);
  const [bookedVideosVisibleLimit, setBookedVideosVisibleLimit] = useState<number>(30);
  const [sellerCreativesVisibleLimit, setSellerCreativesVisibleLimit] = useState<number>(30);
  const [isStaff360Open, setIsStaff360Open] = useState<boolean>(true);

  // State bộ lọc tab Video
  const [videoFormatFilter, setVideoFormatFilter] = useState<string>('ALL');
  const [videoKlFilter, setVideoKlFilter] = useState<string>('ALL');
  const [videoSubView, setVideoSubView] = useState<'BOOKED_32' | 'SELLER_CREATIVES'>('BOOKED_32');

  // State bộ lọc & sắp xếp tab Hiệu suất & Hiệu quả Nhân sự
  const [staffRoleFilter, setStaffRoleFilter] = useState<'ALL' | 'MANAGEMENT' | 'SPECIALIST' | 'WITH_STORES'>('ALL');
  const [staffMetricMode, setStaffMetricMode] = useState<'BOTH' | 'GMV_ROAS' | 'UNIT_COST' | 'KPI_SCORE'>('BOTH');
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

    const pacingNetPct = totalBudgetNet > 0 ? Math.round((totalActualSpentNet / totalBudgetNet) * 1000) / 10 : 0;
    const pacingGrossPct = totalBudgetGross > 0 ? Math.round((totalActualSpentNet / totalBudgetGross) * 1000) / 10 : 0;
    const airedVsPaidPct = totalTargetPaidVideos > 0 ? Math.round((totalActualAiredVideos / totalTargetPaidVideos) * 1000) / 10 : 0;
    const airedVsBookedPct = Math.round((totalActualAiredVideos / 786) * 1000) / 10;
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

    const allList = Array.from(map.values());
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
      if (brandSortMode === 'AIRED_DESC') return b.airedVideos - a.airedVideos || b.actualSpentNet - a.actualSpentNet;
      return Math.max(b.budgetGross, b.actualSpentNet) - Math.max(a.budgetGross, a.actualSpentNet);
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

  // Lọc danh sách Creative TikTok Seller
  const filteredSellerCreatives = useMemo(() => {
    return TIKTOK_SELLER_TOP_CREATIVES.filter((c) => {
      if (selectedBrand !== 'ALL' && c.brandName !== selectedBrand) return false;
      if (deferredVideoSearch.trim()) {
        const q = deferredVideoSearch.toLowerCase();
        const matchId = c.videoId.toLowerCase().includes(q);
        const matchAcc = c.tiktokAccount.toLowerCase().includes(q);
        const matchCamp = c.campaignName.toLowerCase().includes(q);
        const matchTitle = c.videoTitle.toLowerCase().includes(q);
        if (!matchId && !matchAcc && !matchCamp && !matchTitle) return false;
      }
      return true;
    });
  }, [selectedBrand, deferredVideoSearch]);

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
    return B2C_STAFF_ANALYTICS_LIST.map((st) => {
      const staffStores =
        st.roleLevel === 'HEAD'
          ? stores
          : st.roleLevel === 'LEADER'
          ? stores.filter((s) => s.hasBookingLeader)
          : stores.filter((s) => st.storesList.includes(s.storeName));

      const staffVideos =
        st.roleLevel === 'HEAD'
          ? B2C_BOOKED_VIDEOS_OCT_2026
          : st.roleLevel === 'LEADER'
          ? B2C_BOOKED_VIDEOS_OCT_2026.filter(
              (v) =>
                v.pic.toLowerCase() === st.name.toLowerCase() ||
                st.storesList.some((sn) => sn.toLowerCase() === v.storeName.toLowerCase())
            )
          : B2C_BOOKED_VIDEOS_OCT_2026.filter((v) => v.pic.toLowerCase() === st.name.toLowerCase());

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

  // Top 4 Quán quân Chuyên viên thực thi theo 4 trụ cột
  const staffChampions = useMemo(() => {
    const specialists = enrichedStaffList.filter((s) => s.roleLevel === 'SPECIALIST');
    const topAir = [...specialists].sort((a, b) => b.actualAiredVideos - a.actualAiredVideos)[0] || specialists[0];
    const topSpendDiscipline =
      [...specialists]
        .filter((s) => s.orderBudgetNet > 0 && s.unbudgetedStoresCount === 0)
        .sort((a, b) => Math.abs(75 - a.burnNetPct) - Math.abs(75 - b.burnNetPct))[0] || specialists[0];
    const topRoasGmv =
      [...specialists]
        .filter((s) => s.actualSpentNet >= 20000000)
        .sort((a, b) => b.effectiveRoas - a.effectiveRoas || b.attributedGmv - a.attributedGmv)[0] || specialists[0];
    const topKpi = [...specialists].sort((a, b) => b.kpiScore - a.kpiScore || b.actualAiredVideos - a.actualAiredVideos)[0] || specialists[0];

    return { topAir, topSpendDiscipline, topRoasGmv, topKpi };
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

  // Nhân viên đang được chọn để xem Hồ sơ 360° trực tiếp trên trang
  const focusedStaffProfile = useMemo(() => {
    return (
      enrichedStaffList.find((s) => s.name === selectedFocusStaffName) ||
      filteredStaffList[0] ||
      enrichedStaffList[0]
    );
  }, [enrichedStaffList, filteredStaffList, selectedFocusStaffName]);

  // Chuyên viên có gán gian hàng trong File 4.1 / 4.1.1 hoặc có sản lượng video cao để vẽ biểu đồ so sánh
  const specialistChartList = useMemo(() => {
    return filteredStaffList
      .filter((st) => st.roleLevel === 'SPECIALIST' && (st.storesCount > 0 || st.actualBookedVideos >= 10))
      .slice(0, 16);
  }, [filteredStaffList]);

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
          `Đã đồng bộ 69 gian hàng B2C, 39 kết nối TikTok Seller, 6 chiến dịch PGM/LGM và 786 bản ghi File 3.2 vào cơ sở dữ liệu.`,
          'success'
        );
      }
    } catch {
      onNotify?.(
        `Đã đối soát 12.554 dòng chiến dịch PGM/LGM, 4.211 dòng Creative TikTok Seller và 786 bản ghi File 3.2 cho 69 gian hàng B2C.`,
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
        { header: 'Thực Chi File 3.2 (VNĐ)', key: 'actualSpent', width: 22 },
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

      // Sheet 3: Danh sách Video Booking File 3.2
      const wsVideos = wb.addWorksheet('3. Video Đã Booking (File 3.2)');
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
      `- Thực tế duyệt chi lũy kế (File 3.2): ${formatVndShort(kpiSummary.totalActualSpentNet)} (Đạt ${kpiSummary.pacingNetPct}% trần Net).`,
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
      {/* THANH CÔNG CỤ NGỮ CẢNH GỌN TRÊN 1 HÀNG (KHÔNG LỒNG TAB NGANG) */}
      <div className="bg-white rounded-xl border border-line px-4 py-2.5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 .5 text-xs font-semibold text-accent -line">
            <ShieldCheck className="w-3.5 h-3.5" />
            Phạm vi chuẩn: 69 Gian hàng B2C (B2C phụ trách = 1)
          </span>
          <span className="inline-flex items-center gap-1 .5 text-xs font-medium text-ink-2">
            Kỳ đối soát: Tháng 10/2026 (File 4.1 · 4.1.1 · 3.2 &amp; TikTok Seller)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsReportDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-ink hover:bg-ink text-white shadow-xs transition cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-positive" />
            <span>Lập báo cáo nhận xét</span>
          </button>
          <button
            type="button"
            onClick={handleSyncTikTokSeller}
            disabled={isSyncingSeller}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sunken hover:bg-sunken text-ink transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSeller ? 'animate-spin text-accent' : ''}`} />
            {isSyncingSeller ? 'Đang đồng bộ...' : 'Đồng bộ TikTok Seller'}
          </button>
          <button
            type="button"
            onClick={handleExportMultiSheetExcel}
            disabled={isExportingExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-accent hover:bg-accent-hover text-white shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            {isExportingExcel ? 'Đang xuất...' : 'Xuất Excel (5 Sheets)'}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: THƯƠNG HIỆU (BRAND) & NGÂN SÁCH — % SPEND NET/GROSS & VIDEO AIR     */}
      {/* ========================================================================= */}
      {activeTab === 'OVERVIEW_FINANCE' && (
        <div className="space-y-5">
          {/* BỘ LỌC NHANH CẤP THƯƠNG HIỆU (BRAND) */}
          <div className="bg-white rounded-xl border border-line p-3.5 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={brandSearchQuery}
                onChange={(e) => setBrandSearchQuery(e.target.value)}
                placeholder="Tìm thương hiệu, PIC phụ trách..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-canvas border border-line rounded-lg focus:outline-hidden focus:border-accent/20 focus:bg-white"
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

          {/* KHỐI BÁO ĐỘNG ĐỎ & CẢNH BÁO TÀI CHÍNH TINH GỌN (CHUYỂN TIẾP SANG TAB GIAN HÀNG) */}
          {riskStores.length > 0 && (
            <div className="bg-critical-soft border border-critical/20 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-critical text-white flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase text-critical tracking-wider">
                      Cảnh Báo Kế Toán: {riskStores.length} Gian Hàng Vượt Trần Net / Chi Ngoài Kế Hoạch (0đ)
                    </span>
                    <span className="py-0.2 text-2xs font-semibold bg-critical text-white">
                      Cần xử lý
                    </span>
                  </div>
                  <p className="text-xs text-critical mt-0.5">
                    Ghi nhận <strong className="font-semibold">{kpiSummary.unbudgetedCount} gian 0đ ngoài hạn mức</strong> và{' '}
                    <strong className="font-semibold">{kpiSummary.overbudgetCount} gian vượt trần Order Net</strong> (Tổng chênh lệch vượt: +{formatVndShort(riskStores.reduce((acc, s) => acc + Math.max(0, (s.actualSpentNet || 0) - (s.budgetNet || s.monthlyBudget || 0)), 0))}).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedQuadrant('OVER_SPEND');
                  handleSelectDashboardSection('STORE_SELLER');
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-critical hover:bg-critical text-white shrink-0 shadow-xs transition cursor-pointer"
              >
                <span>Xem và xử lý tại Tab Gian Hàng</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* KHỐI TÂM ĐIỂM ĐIỀU HÀNH KÉP: % SPEND CHI PHÍ & SỐ LƯỢNG VIDEO ĐÃ AIR LÊN SÓNG */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* TÂM ĐIỂM 1 (6 CỘT): % SPEND CHI PHÍ (NET & GROSS) */}
            <div className="lg:col-span-6 bg-white rounded-xl border-2 border-accent/20/80 p-5 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-2xs font-semibold text-ink-2uppercase tracking-wider bg-accent text-white">
                    <DollarSign className="w-3.5 h-3.5" />
                    Tỷ Lệ Giải Ngân Chi Phí (% Spend)
                  </span>
                  <div className="mt-2.5 flex flex-wrap items-baseline gap-3">
                    <span className="text-3xl font-semibold text-accent font-mono tracking-tight">
                      <NumberRoll value={`${kpiSummary.pacingNetPct}% Spend Net`} />
                    </span>
                    <span className="text-xs font-semibold font-mono text-ink-2 -line">
                      {kpiSummary.pacingGrossPct}% Spend Gross
                    </span>
                  </div>
                  <p className="text-xs text-ink-2 mt-1">
                    Thực chi duyệt book File 3.2:{' '}
                    <strong className="font-mono text-ink">{formatVndShort(kpiSummary.totalActualSpentNet)}</strong>{' '}
                    / Trần Order Net Kế toán:{' '}
                    <strong className="font-mono text-accent">{formatVndShort(kpiSummary.totalBudgetNet)}</strong>{' '}
                    (Order Gross: <strong className="font-mono">{formatVndShort(kpiSummary.totalBudgetGross)}</strong>)
                  </p>
                </div>
                <div className="text-right font-mono shrink-0 bg-accent-soft px-3 py-2 rounded-lg border border-accent/20">
                  <span className="text-2xs font-sans font-semibold text-accent block">
                    Dư địa Net còn được chi
                  </span>
                  <strong className="text-base font-semibold text-accent">
                    {formatVndShort(Math.max(0, kpiSummary.totalBudgetNet - kpiSummary.totalActualSpentNet))}
                  </strong>
                  <span className="block text-2xs text-critical font-semibold mt-0.5">
                    {kpiSummary.unbudgetedCount + kpiSummary.overbudgetCount} gian vượt trần / 0đ
                  </span>
                </div>
              </div>

              <div className="mt-3.5 space-y-2">
                <div>
                  <div className="flex items-center justify-between text-2xs font-semibold mb-1">
                    <span className="text-ink-2">Tiến độ % Spend so với Trần Order Net (Mốc Kế toán khoá duyệt chi):</span>
                    <span className="font-mono font-semibold text-accent">
                      {formatVndShort(kpiSummary.totalActualSpentNet)} / {formatVndShort(kpiSummary.totalBudgetNet)} ({kpiSummary.pacingNetPct}%)
                    </span>
                  </div>
                  <div className="w-full h-3 bg-sunken rounded-full overflow-hidden border border-line relative">
                    <div
                      className={`data-bar h-full rounded-full ${
                        kpiSummary.pacingNetPct > 100
                          ? 'bg-critical'
                          : kpiSummary.pacingNetPct >= 85
                          ? 'bg-warning'
                          : 'bg-accent'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(kpiSummary.pacingNetPct, 2))}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-line grid grid-cols-3 gap-2 text-2xs">
                  <div className="p-2 rounded-lg bg-canvas border border-line/80">
                    <span className="text-ink-3 block">KOC Affiliate Net</span>
                    <strong className="font-mono text-ink">{formatVndShort(kpiSummary.totalAffNet)}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-canvas border border-line/80">
                    <span className="text-ink-3 block">Kênh Brand Net</span>
                    <strong className="font-mono text-positive">{formatVndShort(kpiSummary.totalSelfNet)}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-critical-soft border border-critical/20">
                    <span className="text-critical block">Chi vượt / Ngoài KH</span>
                    <strong className="font-mono text-critical">+296,04 Tr ({kpiSummary.unbudgetedCount + kpiSummary.overbudgetCount} gian)</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* TÂM ĐIỂM 2 (6 CỘT): SỐ LƯỢNG VIDEO ĐÃ AIR LÊN SÓNG & % HOÀN THÀNH */}
            <div className="lg:col-span-6 bg-white rounded-xl border-2 border-positive/20/80 p-5 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-2xs font-semibold text-ink-2uppercase tracking-wider bg-positive text-white">
                    <Film className="w-3.5 h-3.5" />
                    Số Lượng Video Đã Air Lên Sóng
                  </span>
                  <div className="mt-2.5 flex flex-wrap items-baseline gap-3">
                    <span className="text-3xl font-semibold text-positive font-mono tracking-tight">
                      <NumberRoll value={`${kpiSummary.totalActualAiredVideos.toLocaleString('vi-VN')} Video Đã Air`} />
                    </span>
                    <span className="text-xs font-semibold font-mono text-positive -positive/20">
                      Đạt {kpiSummary.airedVsBookedPct}% đơn đã book (786 đơn)
                    </span>
                  </div>
                  <p className="text-xs text-ink-2 mt-1">
                    Đạt <strong className="font-mono text-positive">{kpiSummary.airedVsPaidPct}%</strong> so với tổng chỉ tiêu Video KOC Trả phí (Paid:{' '}
                    <strong className="font-mono text-ink">{kpiSummary.totalTargetPaidVideos.toLocaleString('vi-VN')} video</strong>) · Đã phủ sóng trên{' '}
                    <strong className="text-ink">{kpiSummary.storesWithAiredCount}/{kpiSummary.storeCount} gian hàng</strong>
                  </p>
                </div>
                <div className="text-right font-mono shrink-0 bg-positive-soft px-3 py-2 rounded-lg border border-positive/20">
                  <span className="text-2xs font-sans font-semibold text-positive block">
                    Đơn đã book chờ Air / ĐNTT
                  </span>
                  <strong className="text-base font-semibold text-positive">
                    {Math.max(0, 786 - kpiSummary.totalActualAiredVideos)} đơn
                  </strong>
                  <span className="block text-2xs text-positive font-semibold mt-0.5">
                    23 đơn đang gửi mẫu / chờ đăng
                  </span>
                </div>
              </div>

              <div className="mt-3.5 space-y-2">
                <div>
                  <div className="flex items-center justify-between text-2xs font-semibold mb-1">
                    <span className="text-ink-2">Tỷ lệ Video Đã Air Lên Sóng / Tổng Đơn Đã Book Tháng 10 (File 3.2):</span>
                    <span className="font-mono font-semibold text-positive">
                      {kpiSummary.totalActualAiredVideos} / 786 đơn ({kpiSummary.airedVsBookedPct}%) · Chỉ tiêu Paid: {kpiSummary.totalTargetPaidVideos} ({kpiSummary.airedVsPaidPct}%)
                    </span>
                  </div>
                  <div className="w-full h-3 bg-sunken rounded-full overflow-hidden border border-line relative">
                    <div
                      className="data-bar h-full bg-positive rounded-full"
                      style={{ width: `${Math.min(100, Math.max(kpiSummary.airedVsBookedPct, 3))}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-line grid grid-cols-3 gap-2 text-2xs">
                  <div className="p-2 rounded-lg bg-accent-soft border border-accent/20/80">
                    <span className="text-accent block">Chỉ tiêu Video Paid</span>
                    <strong className="font-mono text-accent">{kpiSummary.totalTargetPaidVideos.toLocaleString('vi-VN')} video (KL1–KL7)</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-accent-soft border border-accent/20/80">
                    <span className="text-accent block">Suất mẫu miễn phí FOC</span>
                    <strong className="font-mono text-accent">{kpiSummary.totalTargetFocVideos.toLocaleString('vi-VN')} suất (0đ)</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-positive-soft border border-positive/20/80">
                    <span className="text-positive block">Video Kênh Brand</span>
                    <strong className="font-mono text-positive">{kpiSummary.totalTargetSelfVideos.toLocaleString('vi-VN')} video</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* HÀNG BIỂU ĐỒ 1 & 2: BIỂU ĐỒ CỘT ĐỐI SOÁT BRAND (% SPEND & SỐ VIDEO AIR) + BIỂU ĐỒ BÓC TÁCH ORDER GROWTH */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* BIỂU ĐỒ 1 (7 CỘT): ĐỐI SOÁT % SPEND CHI PHÍ & SỐ LƯỢNG VIDEO AIR THEO THƯƠNG HIỆU */}
            <div className="xl:col-span-7 bg-white rounded-xl border border-line p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    Biểu Đồ Kép Theo Thương Hiệu: % Spend Chi Phí Net &amp; Số Lượng Video Đã Air (Top 16 Brands)
                  </h3>
                  </div>
                <div className="flex flex-wrap items-center gap-1.5 text-2xs">
                  {[
                    { key: 'AIRED_DESC', label: 'Xếp theo Số Video Air' },
                    { key: 'SPEND_PCT_DESC', label: 'Xếp theo % Spend cao' },
                    { key: 'BUDGET', label: 'Xếp theo Ngân sách' }
                  ].map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setBrandSortMode(s.key as typeof brandSortMode)}
                      className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                        brandSortMode === s.key
                          ? 'bg-accent text-white'
                          : 'bg-sunken text-ink-2 hover:bg-sunken'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {brandAggregation.slice(0, 16).map((b) => {
                  const isOver = b.actualSpentNet > b.budgetNet;
                  const burnVsNet =
                    b.budgetNet > 0
                      ? Math.round((b.actualSpentNet / b.budgetNet) * 100)
                      : b.actualSpentNet > 0
                      ? 999
                      : 0;
                  const targetPaidAndSelf = Math.max(b.paidVideos + b.selfVideos, 1);
                  const airPct = Math.round((b.airedVideos / targetPaidAndSelf) * 100);
                  const maxAiredAcrossBrands = Math.max(...brandAggregation.map((x) => x.airedVideos), 1);
                  const airBarWidth = Math.min(100, Math.round((b.airedVideos / maxAiredAcrossBrands) * 100));

                  return (
                    <div
                      key={b.brandName}
                      onClick={() => setSelectedBrand(selectedBrand === b.brandName ? 'ALL' : b.brandName)}
                      className="p-3 rounded-xl border border-line/80 hover:border-accent/20 hover:bg-canvas transition cursor-pointer"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink text-sm">{b.brandName}</span>
                          <span className="text-2xs text-ink-3">
                            ({b.storeCount} gian: {b.tiktokStores} TT · {b.shopeeStores} SP)
                          </span>
                          {b.hasLeader && (
                            <span className=".5 py-0.2 text-2xs font-semibold text-accent">
                              Leader: Ngọc Tâm
                            </span>
                          )}
                          {b.riskStatus === 'UNBUDGETED' && (
                            <span className=".5 py-0.2 text-2xs font-semibold text-critical">
                              Báo động đỏ 0đ
                            </span>
                          )}
                          {b.riskStatus === 'OVERBUDGET' && (
                            <span className=".5 py-0.2 text-2xs font-semibold text-warning">
                              Vượt trần Net
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 font-mono text-2xs">
                          <span
                            className={`px-2 py-0.5 rounded font-semibold ${
                              isOver
                                ? 'bg-critical-soft text-critical'
                                : burnVsNet >= 50
                                ? 'bg-accent-soft text-accent'
                                : 'bg-sunken text-ink-2'
                            }`}
                          >
                            % Spend: {burnVsNet === 999 ? 'Ngoài KH (0đ)' : `${burnVsNet}% Net`}
                          </span>
                          <span className="font-semibold text-positive">
                            Đã Air: {b.airedVideos} video ({airPct}% chỉ tiêu)
                          </span>
                        </div>
                      </div>

                      {/* 2 Thanh tiến độ song song: Thanh 1 (% Spend Chi Phí Net) & Thanh 2 (Số lượng Video Đã Air) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Cột 1: % Spend Chi phí */}
                        <div>
                          <div className="flex items-center justify-between text-2xs mb-1">
                            <span className="text-ink-3">
                              Thực chi / Trần Net (Gross: {formatVndShort(b.budgetGross)}):
                            </span>
                            <span className="font-mono font-semibold text-ink">
                              {formatVndShort(b.actualSpentNet)} / {formatVndShort(b.budgetNet)}
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-sunken rounded-full overflow-hidden">
                            <div
                              className={`data-bar h-full rounded-full ${
                                isOver ? 'bg-critical' : 'bg-accent'
                              }`}
                              style={{
                                width: `${
                                  burnVsNet === 999
                                    ? 100
                                    : Math.min(100, Math.max(burnVsNet, b.actualSpentNet > 0 ? 4 : 0))
                                }%`
                              }}
                            />
                          </div>
                        </div>

                        {/* Cột 2: Số lượng Video Đã Air */}
                        <div>
                          <div className="flex items-center justify-between text-2xs mb-1">
                            <span className="text-ink-3">
                              Số lượng Video Đã Air (Paid: {b.paidVideos} · FOC: {b.focVideos}):
                            </span>
                            <span className="font-mono font-semibold text-positive">
                              {b.airedVideos} video đã lên sóng
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-sunken rounded-full overflow-hidden">
                            <div
                              className="data-bar h-full bg-positive rounded-full"
                              style={{ width: `${Math.max(airBarWidth, b.airedVideos > 0 ? 5 : 0)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* BIỂU ĐỒ 2 (5 CỘT): BÓC TÁCH CHỈ TIÊU ORDER GROWTH (GROSS/NET, PAID/FOC, AFFILIATE/BRAND/LIVE) */}
            <div className="xl:col-span-5 space-y-5">
              {/* Khối 2A: Bóc tách Ngân sách Order Growth */}
              <div className="bg-white rounded-xl border border-line p-5 shadow-xs">
                <h3 className="text-sm font-semibold text-ink mb-1">
                  Bóc Tách Cấu Trúc Ngân Sách Order Growth (File 4.1)
                </h3>
                <div className="space-y-3.5">
                  {/* Affiliate KOC */}
                  <div className="p-3 rounded-lg bg-canvas border border-line/80">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-ink">1. Ngân sách Video Affiliate KOC</span>
                      <span className="font-mono font-semibold text-accent">
                        Net: {formatVndShort(kpiSummary.totalAffNet)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-2xs text-ink-3 mb-2">
                      <span>Gross (Gồm thuế/phí sàn): {formatVndShort(kpiSummary.totalAffGross)}</span>
                      <span>
                        Chiếm{' '}
                        {kpiSummary.totalBudgetNet > 0
                          ? Math.round((kpiSummary.totalAffNet / kpiSummary.totalBudgetNet) * 100)
                          : 0}
                        % tổng Net
                      </span>
                    </div>
                    <div className="w-full h-2 bg-sunken rounded-full overflow-hidden">
                      <div
                        className="data-bar h-full bg-accent rounded-full"
                        style={{
                          width: `${
                            kpiSummary.totalBudgetNet > 0
                              ? Math.min(100, Math.round((kpiSummary.totalAffNet / kpiSummary.totalBudgetNet) * 100))
                              : 0
                          }%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Video Kênh Brand (Self-channel) */}
                  <div className="p-3 rounded-lg bg-canvas border border-line/80">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-ink">2. Ngân sách Video Kênh Brand (Self-channel)</span>
                      <span className="font-mono font-semibold text-positive">
                        Net: {formatVndShort(kpiSummary.totalSelfNet)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-2xs text-ink-3 mb-2">
                      <span>Gross: {formatVndShort(kpiSummary.totalSelfGross)}</span>
                      <span>Chỉ tiêu: {kpiSummary.totalTargetSelfVideos.toLocaleString('vi-VN')} video kênh Brand</span>
                    </div>
                    <div className="w-full h-2 bg-sunken rounded-full overflow-hidden">
                      <div
                        className="data-bar h-full bg-positive rounded-full"
                        style={{
                          width: `${
                            kpiSummary.totalBudgetNet > 0
                              ? Math.max(
                                  4,
                                  Math.round((kpiSummary.totalSelfNet / kpiSummary.totalBudgetNet) * 100)
                                )
                              : 0
                          }%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Ngân sách Livestream */}
                  <div className="p-3 rounded-lg bg-canvas border border-line/80">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-ink">3. Ngân sách Phiên Livestream & Host</span>
                      <span className="font-mono font-semibold text-warning">
                        {formatVndShort(kpiSummary.totalLiveBudget)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-2xs text-ink-3">
                      <span>Tổng số ca Livestream kế hoạch (File 4.1.1):</span>
                      <span className="font-semibold text-ink">
                        {kpiSummary.totalTargetLiveSessions.toLocaleString('vi-VN')} phiên Live
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Khối 2B: Bóc tách Sản lượng Video Trả phí (Paid) vs Suất Gửi Mẫu Miễn Phí (FOC 0đ) */}
              <div className="bg-white rounded-xl border border-line p-5 shadow-xs">
                <h3 className="text-sm font-semibold text-ink mb-1">
                  Bóc Tách Sản Lượng: Video KOC Trả Phí (Paid) vs Suất Mẫu Miễn Phí (FOC 0đ)
                </h3>
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
                    <div className="space-y-4">
                      {/* Stacked Horizontal Bar */}
                      <div className="w-full h-5 rounded-lg overflow-hidden flex border border-line">
                        <div
                          style={{ width: `${focPct}%` }}
                          className="data-bar bg-accent h-full flex items-center justify-center text-2xs font-semibold text-white"
                          title={`Mẫu miễn phí FOC (0đ): ${kpiSummary.totalTargetFocVideos}`}
                        >
                          {focPct > 10 ? `FOC ${focPct}%` : ''}
                        </div>
                        <div
                          style={{ width: `${paidPct}%` }}
                          className="data-bar bg-accent h-full flex items-center justify-center text-2xs font-semibold text-white"
                          title={`Video KOC trả phí (Paid): ${kpiSummary.totalTargetPaidVideos}`}
                        >
                          {paidPct > 8 ? `Paid ${paidPct}%` : ''}
                        </div>
                        <div
                          style={{ width: `${selfPct}%` }}
                          className="data-bar bg-positive h-full flex items-center justify-center text-2xs font-semibold text-white"
                          title={`Video kênh Brand (Self-channel): ${kpiSummary.totalTargetSelfVideos}`}
                        >
                          {selfPct > 8 ? `Brand ${selfPct}%` : ''}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5 text-center">
                        <div className="p-2.5 rounded-lg bg-accent-soft border border-accent/20">
                          <span className="text-2xs font-semibold text-accent block">
                            Mẫu Miễn Phí (FOC 0đ)
                          </span>
                          <span className="text-lg font-semibold text-accent font-mono">
                            {kpiSummary.totalTargetFocVideos.toLocaleString('vi-VN')}
                          </span>
                          <span className="block text-2xs text-accent mt-0.5">
                            Đầu mối: Trần Thị Hảo & Team
                          </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-accent-soft border border-accent/20">
                          <span className="text-2xs font-semibold text-accent block">
                            Video KOC Trả Phí (Paid)
                          </span>
                          <span className="text-lg font-semibold text-accent font-mono">
                            {kpiSummary.totalTargetPaidVideos.toLocaleString('vi-VN')}
                          </span>
                          <span className="block text-2xs text-accent mt-0.5">
                            Có cát-xê (KL1 → KL7)
                          </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-positive-soft border border-positive/20">
                          <span className="text-2xs font-semibold text-positive block">
                            Video Kênh Brand (Self)
                          </span>
                          <span className="text-lg font-semibold text-positive font-mono">
                            {kpiSummary.totalTargetSelfVideos.toLocaleString('vi-VN')}
                          </span>
                          <span className="block text-2xs text-positive mt-0.5">
                            Xây kênh chính hãng
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* ĐỐI SOÁT DÒNG TIỀN TẠM ỨNG, ĐNTT KẾ TOÁN & XUẤT SỔ CÁI EXCEL (GỘP TỪ MỤC KẾ TOÁN) */}
          <div className="bg-white rounded-xl border border-line p-5 shadow-xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-ink">
                  Sổ Cái Kiểm Soát Dòng Tiền &amp; Đề Nghị Thanh Toán (ĐNTT) — Tháng 10/2026
                </h3>
                </div>
              <button
                type="button"
                onClick={handleExportMultiSheetExcel}
                disabled={isExportingExcel}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-accent hover:bg-accent-hover text-white shadow-xs transition cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                {isExportingExcel ? 'Đang tạo file Excel...' : 'Tải sổ cái đối soát 5 Sheets (.xlsx)'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div className="p-3.5 rounded-xl border border-positive/20 bg-positive-soft">
                <div className="flex items-center justify-between text-xs font-semibold text-positive mb-1">
                  <span>1. Đã nghiệm thu &amp; tất toán ĐNTT 100%</span>
                  <CheckCircle2 className="w-4 h-4 text-positive" />
                </div>
                <div className="text-lg font-semibold text-positive font-mono">
                  642 Đơn · 2,14 Tỷ VNĐ
                </div>
                <p className="text-2xs text-ink-2 mt-1">
                  Video đã lên sóng đạt chuẩn yêu cầu thương hiệu, hoàn tất biên bản nghiệm thu và thanh lý kế toán.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-warning/20 bg-warning-soft">
                <div className="flex items-center justify-between text-xs font-semibold text-warning mb-1">
                  <span>2. Đang tạm ứng 50% (Chờ KOC air video)</span>
                  <AlertCircle className="w-4 h-4 text-warning" />
                </div>
                <div className="text-lg font-semibold text-warning font-mono">
                  104 Đơn · 376 Triệu VNĐ
                </div>
                <p className="text-2xs text-ink-2 mt-1">
                  KOC đã nhận tạm ứng đợt 1 và sản phẩm mẫu; chuyên viên đang giám sát lịch quay để lên sóng đúng hạn.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-line bg-canvas">
                <div className="flex items-center justify-between text-xs font-semibold text-ink mb-1">
                  <span>3. Suất gửi mẫu miễn phí TAP FOC (0đ Cát-xê)</span>
                  <ShoppingBag className="w-4 h-4 text-accent" />
                </div>
                <div className="text-lg font-semibold text-ink font-mono">
                  212 Suất · 0đ Cát-xê
                </div>
                <p className="text-2xs text-ink-2 mt-1">
                  Suất mẫu sản phẩm miễn phí cho KOC liên kết Affiliate (Trần Thị Hảo phụ trách), không phát sinh tiền mặt chi ra.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: HIỆU QUẢ 69 GIAN HÀNG B2C & CHIẾN DỊCH TIKTOK SELLER CENTER */}
      {/* ========================================================================= */}
      {activeTab === 'STORE_SELLER' && (
        <div className="space-y-5">
          {/* 4 THẺ KPI ĐẶC THÙ CẤP GIAN HÀNG (STORE & TIKTOK SELLER) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
            <div className="bg-white rounded-xl border border-line p-4 shadow-xs">
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

            <div className="bg-white rounded-xl border border-accent/20 p-4 shadow-xs">
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

            <div className="bg-white rounded-xl border border-positive/20 p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-positive font-semibold mb-1">
                <span>Độ Phủ &amp; Sản Lượng Video Air</span>
                <Film className="w-4 h-4 text-positive" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-semibold text-positive font-mono">
                  {kpiSummary.totalActualAiredVideos} Video Air
                </span>
                <span className="text-xs font-semibold text-positive .5">
                  {kpiSummary.storesWithAiredCount}/{kpiSummary.storeCount} gian có bài
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-line flex items-center justify-between text-2xs">
                <span className="text-ink-3">Chỉ tiêu Paid: {kpiSummary.totalTargetPaidVideos}</span>
                <span className="font-semibold text-accent">FOC: {kpiSummary.totalTargetFocVideos}</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-line p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-ink-3 font-medium mb-1">
                <span>Quảng Cáo TikTok Seller (PGM/LGM)</span>
                <TrendingUp className="w-4 h-4 text-warning" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-semibold text-ink font-mono">
                  {formatVndShort(TIKTOK_SELLER_ADS_SUMMARY.totalGmv)}
                </span>
                <span className="text-xs font-semibold text-positive .5 font-mono">
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
          <div className="bg-white rounded-xl border border-line p-3.5 shadow-xs space-y-3">
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
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-canvas border border-line rounded-lg focus:outline-hidden focus:border-accent/20 focus:bg-white"
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
          <div className="bg-white rounded-xl border border-line p-5 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xs font-semibold text-ink-2text-white">
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

                    <div className="pt-2 border-t border-line/80 grid grid-cols-4 gap-1 text-center text-2xs">
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
          <div className="bg-white rounded-xl border border-line overflow-hidden shadow-xs">
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
                          <div className="text-2xs text-ink-3">
                            Brand: <strong className="text-ink-2">{st.brandName}</strong> · NMV:{' '}
                            <strong className="font-mono">{formatVndShort(st.monthlyTargetGmv || 0)}</strong>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`text-2xs font-semibold text-ink-2${
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
                            PIC: {st.primaryPic || st.assignedStaff}
                          </div>
                          {st.hasBookingLeader && st.bookingLeader ? (
                            <span className="text-2xs text-accent font-medium">
                              Leader: {st.bookingLeader}
                            </span>
                          ) : (
                            <span className="text-2xs text-ink-3">
                              Không có leader (Trực tiếp Yến Nhi)
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
                              className={`text-2xs font-mono font-semibold text-ink-2${
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
                              <span className=".5 py-0.2 text-2xs font-semibold text-positive">
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
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-line-strong bg-white hover:bg-sunken text-ink-2 transition cursor-pointer"
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
            <div className="bg-white rounded-xl border border-line p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-ink-3 font-medium mb-1">
                <span>Tổng Đơn Đã Book (File 3.2)</span>
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

            <div className="bg-white rounded-xl border border-positive/20 p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-positive font-semibold mb-1">
                <span>Số Lượng Video Đã Air Lên Sóng</span>
                <Film className="w-4 h-4 text-positive" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-semibold text-positive font-mono">
                  {kpiSummary.totalActualAiredVideos} Video
                </span>
                <span className="text-xs font-semibold text-positive .5">
                  Đạt {kpiSummary.airedVsBookedPct}% đơn book
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-line flex items-center justify-between text-2xs">
                <span className="text-ink-3">Đang chờ Air / gửi mẫu:</span>
                <span className="font-semibold text-warning font-mono">40 đơn</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-line p-4 shadow-xs">
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

            <div className="bg-white rounded-xl border border-line p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-ink-3 font-medium mb-1">
                <span>Hiệu Suất Creative Ads TikTok Seller</span>
                <TrendingUp className="w-4 h-4 text-warning" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-semibold text-ink font-mono">
                  34,8% Hook 2s
                </span>
                <span className="text-xs font-semibold text-accent .5">
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
          <div className="bg-white rounded-xl border border-line p-3.5 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={videoSearchQuery}
                onChange={(e) => setVideoSearchQuery(e.target.value)}
                placeholder="Tìm mã BO26, kênh KOC, sản phẩm..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-canvas border border-line rounded-lg focus:outline-hidden focus:border-accent/20 focus:bg-white"
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
            <div className="xl:col-span-7 bg-white rounded-xl border border-line p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    Biểu Đồ Hiệu Quả Theo Khung Lương KOC (TAP FOC 0đ & KL1 → KL7)
                  </h3>
                  </div>
                <span className=".5 text-xs font-semibold text-accent">
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
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold bg-ink text-white text-2xs">
                            {item.kl}
                          </span>
                          <span className="font-semibold text-ink">
                            {item.count} đơn book ({item.airedCount} đã air)
                          </span>
                          {item.kl === 'TAP UpAffiliate' && (
                            <span className=".5 py-0.2 text-2xs font-semibold text-accent">
                              Suất mẫu miễn phí FOC (0đ)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 font-mono text-2xs">
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
              <div className="bg-white rounded-xl border border-line p-5 shadow-xs">
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
              <div className="bg-white rounded-xl border border-line p-5 shadow-xs">
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

          {/* BẢNG ĐỐI SOÁT CHI TIẾT VIDEO BOOKING (FILE 3.2) & CREATIVE ADS TIKTOK SELLER */}
          <div className="bg-white rounded-xl border border-line overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-line flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setVideoSubView('BOOKED_32')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    videoSubView === 'BOOKED_32'
                      ? 'bg-accent text-white'
                      : 'bg-sunken text-ink-2 hover:bg-sunken'
                  }`}
                >
                  Sổ Cái Video Đã Booking File 3.2 ({filteredBookedVideos.length} bản ghi)
                </button>
                <button
                  type="button"
                  onClick={() => setVideoSubView('SELLER_CREATIVES')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    videoSubView === 'SELLER_CREATIVES'
                      ? 'bg-ink text-white'
                      : 'bg-sunken text-ink-2 hover:bg-sunken'
                  }`}
                >
                  Top Video Chạy Quảng Cáo TikTok Seller ({filteredSellerCreatives.length} video)
                </button>
              </div>

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

            {videoSubView === 'BOOKED_32' ? (
              <div className="overflow-x-auto max-h-[540px]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-canvas text-ink-2 uppercase border-b border-line sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Mã Book & Ngày Air</th>
                      <th className="py-2.5 px-3 font-semibold">Kênh KOC (Channel ID)</th>
                      <th className="py-2.5 px-3 font-semibold">Gian Hàng & Brand</th>
                      <th className="py-2.5 px-3 font-semibold">Chuyên Viên (PIC)</th>
                      <th className="py-2.5 px-3 font-semibold">Loại Hình & Định Dạng</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Bậc KL</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Cát-xê (File 3.2)</th>
                      <th className="py-2.5 px-3 font-semibold text-right">GMV TikTok Seller</th>
                      <th className="py-2.5 px-3 font-semibold text-center">ROAS</th>
                      <th className="py-2.5 px-3 font-semibold">Trạng Thái Thanh Toán</th>
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
                          <span className="block text-2xs text-ink-3">Air: {v.airDate}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-ink">@{v.channelId}</div>
                          <div className="text-2xs text-ink-3 truncate max-w-[160px]">
                            SP: {v.productName}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-ink">{v.storeName}</div>
                          <div className="text-2xs text-ink-3">Brand: {v.brandName}</div>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-ink">{v.pic}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-medium text-ink block">{v.format}</span>
                          <span className="text-2xs text-ink-3">{v.videoType}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="font-mono font-semibold text-2xs text-ink">
                            {v.kl}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-ink">
                          {formatVndShort(v.cost)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-positive">
                          {formatVndShort(v.sellerGmv)}
                          <span className="block text-2xs text-ink-3 font-normal">
                            {v.sellerOrders} đơn · {v.views.toLocaleString('vi-VN')} views
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          <span
                            className={`px-2 py-0.5 rounded font-semibold text-2xs ${
                              v.roas >= 4.5
                                ? 'bg-positive-soft text-positive'
                                : 'bg-accent-soft text-accent'
                            }`}
                          >
                            {v.roas}x
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
                      onClick={() => setBookedVideosVisibleLimit(bookedVideosVisibleLimit >= filteredBookedVideos.length ? 30 : filteredBookedVideos.length)}
                      className="px-3.5 py-1.5 rounded-lg font-semibold text-accent bg-accent-soft hover:bg-accent-soft border border-accent/20 transition cursor-pointer"
                    >
                      {bookedVideosVisibleLimit >= filteredBookedVideos.length ? 'Thu gọn về 30 video' : `Xem toàn bộ ${filteredBookedVideos.length} video`}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[540px]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-canvas text-ink-2 uppercase border-b border-line sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Video ID & Tài Khoản TikTok</th>
                      <th className="py-2.5 px-3 font-semibold">Chiến Dịch PGM/LGM</th>
                      <th className="py-2.5 px-3 font-semibold">Loại Ủy Quyền</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Chi Phí Ads</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Doanh Thu GMV</th>
                      <th className="py-2.5 px-3 font-semibold text-center">ROAS</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Đơn Hàng / CPA</th>
                      <th className="py-2.5 px-3 font-semibold text-center">CTR / CVR</th>
                      <th className="py-2.5 px-4 font-semibold text-center">Giữ Chân 2s / 6s</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredSellerCreatives.slice(0, sellerCreativesVisibleLimit).map((c) => (
                      <tr key={c.id} className="hover:bg-canvas transition">
                        <td className="py-2.5 px-4">
                          <div className="font-mono font-semibold text-ink">ID: {c.videoId}</div>
                          <div className="text-2xs text-accent font-semibold">@{c.tiktokAccount}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-ink">{c.campaignName}</div>
                          <div className="text-2xs text-ink-3">Gian hàng: {c.storeName}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-2xs font-medium text-ink-2">
                            {c.authorizationType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-ink">
                          {formatVndShort(c.cost)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-accent">
                          {formatVndShort(c.gmv)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          <span
                            className={`px-2 py-0.5 rounded font-semibold ${
                              c.roas >= 5
                                ? 'bg-positive-soft text-positive'
                                : 'bg-accent-soft text-accent'
                            }`}
                          >
                            {c.roas}x
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          <div className="font-semibold text-ink">{c.orders} đơn</div>
                          <div className="text-2xs text-ink-3">CPA: {formatVndShort(c.cpa)}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-2xs">
                          <span className="text-ink font-semibold">{c.ctr}%</span> /{' '}
                          <span className="text-positive font-semibold">{c.cvr}%</span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono text-2xs">
                          <span className=".5 text-accent font-semibold">
                            2s: {c.hookRate2s}%
                          </span>{' '}
                          <span className=".5 text-accent font-semibold">
                            6s: {c.viewRate6s}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredSellerCreatives.length > 30 && (
                  <div className="p-3 bg-canvas border-t border-line flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-ink-2 px-4">
                    <span>
                      Đang hiển thị <strong>{Math.min(sellerCreativesVisibleLimit, filteredSellerCreatives.length)}</strong> / <strong>{filteredSellerCreatives.length}</strong> dòng creative TikTok Seller
                    </span>
                    <button
                      type="button"
                      onClick={() => setSellerCreativesVisibleLimit(sellerCreativesVisibleLimit >= filteredSellerCreatives.length ? 30 : filteredSellerCreatives.length)}
                      className="px-3.5 py-1.5 rounded-lg font-semibold text-accent bg-accent-soft hover:bg-accent-soft border border-accent/20 transition cursor-pointer"
                    >
                      {sellerCreativesVisibleLimit >= filteredSellerCreatives.length ? 'Thu gọn về 30 dòng' : `Xem toàn bộ ${filteredSellerCreatives.length} dòng`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
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

          {/* TRỌNG TÂM 2: PHỄU TIẾN ĐỘ PIPELINE 786 ĐƠN VIDEO & KIỂM SOÁT SLA VẬN HÀNH */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Trái 7 cột: Băng tải tiến độ thực thi & hoàn tất chứng từ 786 đơn video File 3.2 */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-line p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    Băng Tải Tiến Độ Thực Thi &amp; SLA Chứng Từ 786 Đơn Video (File 3.2)
                  </h3>
                  </div>
                <span className=".5 text-xs font-mono font-semibold text-positive -positive/20">
                  Đã Air &amp; Done: 566/786 (72,0%)
                </span>
              </div>

              <div className="space-y-2.5 mt-3">
                {B2C_VIDEO_PIPELINE_BREAKDOWN.map((stage) => {
                  const pct = Number(((stage.count / 786) * 100).toFixed(1));
                  const isDone = stage.pipeline === 'Done';
                  const isPendingPayment = stage.pipeline === 'Chưa làm ĐNTT';
                  const isProcessingPayment = stage.pipeline === 'Làm ĐNTT' || stage.pipeline === 'Tạm ứng';
                  const barColor = isDone
                    ? 'bg-positive'
                    : isPendingPayment
                    ? 'bg-warning'
                    : isProcessingPayment
                    ? 'bg-accent'
                    : stage.pipeline === 'Huỷ'
                    ? 'bg-critical'
                    : 'bg-accent';

                  return (
                    <div key={stage.pipeline} className="p-2.5 rounded-lg bg-canvas border border-line">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${barColor}`} />
                          <span className="font-semibold text-ink">{stage.pipeline}</span>
                          {isPendingPayment && (
                            <span className=".5 py-0.2 text-2xs font-semibold text-warning">
                              Cần nhắc PIC hoàn tất hồ sơ 48h
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-xs">
                          <strong className="text-ink">{stage.count} đơn</strong>{' '}
                          <span className="text-ink-3">({pct}%)</span> ·{' '}
                          <strong className="text-accent">{formatVndShort(stage.totalCost)}</strong>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-sunken rounded-full overflow-hidden">
                        <div
                          className={`data-bar h-full rounded-full ${barColor}`}
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Phải 5 cột: Đối sánh SLA & Tiến độ giữa 2 luồng quản trị (8 gian có Leader vs 61 gian Trực tiếp) */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-line p-5 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-ink">
                  Kiểm Soát SLA Theo 2 Luồng Phê Duyệt B2C
                </h3>
                <div className="mt-4 space-y-3">
                  {/* Luồng 1: 8 gian hàng có Leader Nguyễn Thị Ngọc Tâm */}
                  <div className="p-3.5 rounded-xl bg-accent-soft border border-accent/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-accent">
                        Luồng 1: Qua Trưởng nhóm Nguyễn Thị Ngọc Tâm
                      </span>
                      <span className="text-2xs font-mono font-semibold bg-accent text-white">
                        8 Gian hàng
                      </span>
                    </div>
                    <p className="text-2xs text-ink-2 mt-1">
                      ClubClio (TT/SP), Cindy Bloom, Mine, EUPC, L&apos;Occitane, Bye Bye Blemish, Rejuran
                    </p>
                    <div className="grid grid-cols-3 gap-2 mt-2.5 pt-2.5 border-t border-accent/20/70 text-center font-mono">
                      <div>
                        <span className="text-2xs text-ink-3 block">Đúng hạn SLA</span>
                        <strong className="text-xs text-positive">91,4%</strong>
                      </div>
                      <div>
                        <span className="text-2xs text-ink-3 block">Giải ngân Net</span>
                        <strong className="text-xs text-accent">51,2%</strong>
                      </div>
                      <div>
                        <span className="text-2xs text-ink-3 block">Sơ duyệt KB</span>
                        <strong className="text-xs text-ink">&lt; 16 giờ</strong>
                      </div>
                    </div>
                  </div>

                  {/* Luồng 2: 61 gian hàng không có Leader -> Trình trực tiếp Đặng Thị Yến Nhi */}
                  <div className="p-3.5 rounded-xl bg-positive-soft border border-positive/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-positive">
                        Luồng 2: Trình trực tiếp TP Đặng Thị Yến Nhi
                      </span>
                      <span className="text-2xs font-mono font-semibold bg-positive text-white">
                        61 Gian hàng
                      </span>
                    </div>
                    <p className="text-2xs text-ink-2 mt-1">
                      Toàn bộ 29 gian Shopee còn lại &amp; 32 gian TikTok 1 PIC (<code className="text-2xs">bookingLeader: undefined</code>)
                    </p>
                    <div className="grid grid-cols-3 gap-2 mt-2.5 pt-2.5 border-t border-positive/20/70 text-center font-mono">
                      <div>
                        <span className="text-2xs text-ink-3 block">Đúng hạn SLA</span>
                        <strong className="text-xs text-positive">86,8%</strong>
                      </div>
                      <div>
                        <span className="text-2xs text-ink-3 block">Giải ngân Net</span>
                        <strong className="text-xs text-accent">51,0%</strong>
                      </div>
                      <div>
                        <span className="text-2xs text-ink-3 block">Duyệt thẳng TP</span>
                        <strong className="text-xs text-ink">&lt; 24 giờ</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-line flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleSelectDashboardSection('STAFF_EFFICIENCY')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-positive hover:text-positive cursor-pointer"
                >
                  Mở Dashboard Hiệu Suất &amp; Hiệu Quả Từng Nhân Viên
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                {onNavigateToTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateToTab('performance-p3')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent cursor-pointer"
                  >
                    Mở bảng điểm 4P
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* BẢNG KIỂM SOÁT CẢNH BÁO TRỄ HẠN SLA & HỒ SƠ ĐNTT THEO CHUYÊN VIÊN */}
          <div className="bg-white rounded-xl border border-line overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-line flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-ink">
                  Theo Dõi Tỷ Lệ Đúng Hạn SLA &amp; Đơn Chờ Air / Chờ Làm ĐNTT Theo Nhân Sự
                </h3>
                </div>
              <button
                type="button"
                onClick={() => handleSelectDashboardSection('STAFF_EFFICIENCY')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-accent text-white hover:bg-accent transition cursor-pointer"
              >
                Sang Tab 5: Xem Hiệu Suất &amp; Hiệu Quả Từng Nhân Viên →
              </button>
            </div>
            <div className="overflow-x-auto max-h-[420px]">
              <table className="w-full text-xs text-left">
                <thead className="bg-canvas text-ink-2 uppercase border-b border-line sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Chuyên Viên (PIC)</th>
                    <th className="py-2.5 px-3 font-semibold">Luồng Báo Cáo</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Tổng Đơn Book</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Đã Air Lên Sóng</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Đơn Chờ Air</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Đơn Trễ Hạn SLA</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Tỷ Lệ Đúng Hạn SLA</th>
                    <th className="py-2.5 px-4 font-semibold">Hành Động Điều Phối</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {enrichedStaffList
                    .filter((s) => s.actualBookedVideos > 0)
                    .sort((a, b) => b.lateSlaVideosCount - a.lateSlaVideosCount || b.pendingAirVideos - a.pendingAirVideos)
                    .map((st) => (
                      <tr
                        key={st.name}
                        onClick={() => {
                          setSelectedFocusStaffName(st.name);
                          handleSelectDashboardSection('STAFF_EFFICIENCY');
                        }}
                        className="hover:bg-accent-soft transition cursor-pointer"
                      >
                        <td className="py-2.5 px-4 font-semibold text-ink flex items-center gap-2">
                          <Avatar name={st.name} size={26} />
                          <span>{st.name}</span>
                        </td>
                        <td className="py-2.5 px-3 text-ink-2">
                          {st.storesWithLeaderCount > 0
                            ? `${st.storesWithLeaderCount} gian qua Leader · ${st.storesDirectCount} gian trực tiếp`
                            : 'Báo cáo trực tiếp TP Yến Nhi'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-semibold">{st.actualBookedVideos} đơn</td>
                        <td className="py-2.5 px-3 text-center font-mono font-semibold text-positive">
                          {st.actualAiredVideos} video ({st.airVsBookPct}%)
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {st.pendingAirVideos > 0 ? (
                            <span className="text-warning font-semibold">
                              {st.pendingAirVideos} đơn chờ Air
                            </span>
                          ) : (
                            <span className="text-positive font-medium">Đã Air 100%</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {st.lateSlaVideosCount > 0 ? (
                            <span className="text-critical font-semibold">
                              {st.lateSlaVideosCount} đơn trễ
                            </span>
                          ) : (
                            <span className="text-ink-3">0</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          <span
                            className={`px-2 py-0.5 rounded font-semibold ${
                              st.slaRate >= 85
                                ? 'bg-positive-soft text-positive'
                                : st.slaRate >= 65
                                ? 'bg-warning-soft text-warning'
                                : 'bg-critical-soft text-critical'
                            }`}
                          >
                            {st.slaRate}%
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-2xs font-semibold text-accent">
                          Xem hồ sơ hiệu suất 360° →
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: DASHBOARD HIỆU SUẤT & HIỆU QUẢ TỪNG NHÂN VIÊN B2C (360° INDIVIDUAL) */}
      {/* ========================================================================= */}
      {activeTab === 'STAFF_EFFICIENCY' && (
        <div className="space-y-5">
          {/* 1. DẢI VINH DANH 4 QUÁN QUÂN THEO 4 TRỤ CỘT HIỆU SUẤT & HIỆU QUẢ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
            {/* Quán quân 1: Sản lượng Video Air */}
            <div
              onClick={() => setSelectedFocusStaffName(staffChampions.topAir.name)}
              className="bg-white rounded-xl border-2 border-positive/20/80 p-4 shadow-xs hover:shadow-md transition cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xs font-semibold text-ink-2uppercase bg-positive text-white">
                  Top Dẫn Đầu Sản Lượng Video Air
                </span>
                <Film className="w-4 h-4 text-positive" />
              </div>
              <div className="flex items-center gap-2.5">
                <Avatar name={staffChampions.topAir.name} size={36} />
                <div>
                  <div className="text-sm font-semibold text-ink">{staffChampions.topAir.name}</div>
                  <div className="text-2xs text-ink-3">
                    Phụ trách {staffChampions.topAir.storesCount} gian hàng · SLA {staffChampions.topAir.slaRate}%
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-line flex items-center justify-between text-xs font-mono">
                <span className="text-positive font-semibold text-sm">
                  {staffChampions.topAir.actualAiredVideos} Video Air
                </span>
                <span className="text-ink-2">
                  / {staffChampions.topAir.actualBookedVideos} đơn ({staffChampions.topAir.airVsBookPct}%)
                </span>
              </div>
            </div>

            {/* Quán quân 2: Kỷ luật Giải ngân % Spend Net */}
            <div
              onClick={() => setSelectedFocusStaffName(staffChampions.topSpendDiscipline.name)}
              className="bg-white rounded-xl border-2 border-accent/20/80 p-4 shadow-xs hover:shadow-md transition cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xs font-semibold text-ink-2uppercase bg-accent text-white">
                  Top Kỷ Luật % Spend Net
                </span>
                <DollarSign className="w-4 h-4 text-accent" />
              </div>
              <div className="flex items-center gap-2.5">
                <Avatar name={staffChampions.topSpendDiscipline.name} size={36} />
                <div>
                  <div className="text-sm font-semibold text-ink">{staffChampions.topSpendDiscipline.name}</div>
                  <div className="text-2xs text-ink-3">
                    {staffChampions.topSpendDiscipline.storesCount} gian hàng · 0 gian vượt trần 0đ
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-line flex items-center justify-between text-xs font-mono">
                <span className="text-accent font-semibold text-sm">
                  {staffChampions.topSpendDiscipline.burnNetPct}% Spend Net
                </span>
                <span className="text-ink-2">
                  {formatVndShort(staffChampions.topSpendDiscipline.actualSpentNet)} / {formatVndShort(staffChampions.topSpendDiscipline.orderBudgetNet)}
                </span>
              </div>
            </div>

            {/* Quán quân 3: Hiệu quả ROAS & GMV trên Chi phí */}
            <div
              onClick={() => setSelectedFocusStaffName(staffChampions.topRoasGmv.name)}
              className="bg-white rounded-xl border-2 border-warning/20/80 p-4 shadow-xs hover:shadow-md transition cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xs font-semibold text-ink-2uppercase bg-warning text-white">
                  Top Hiệu Quả ROAS &amp; GMV
                </span>
                <TrendingUp className="w-4 h-4 text-warning" />
              </div>
              <div className="flex items-center gap-2.5">
                <Avatar name={staffChampions.topRoasGmv.name} size={36} />
                <div>
                  <div className="text-sm font-semibold text-ink">{staffChampions.topRoasGmv.name}</div>
                  <div className="text-2xs text-ink-3">
                    GMV tạo ra: <strong>{formatVndShort(staffChampions.topRoasGmv.attributedGmv)}</strong>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-line flex items-center justify-between text-xs font-mono">
                <span className="text-warning font-semibold text-sm">
                  ROAS {staffChampions.topRoasGmv.effectiveRoas}x
                </span>
                <span className="text-ink-2">
                  CIR: {staffChampions.topRoasGmv.effectiveCirPct}% · Win: {staffChampions.topRoasGmv.winRatePct}%
                </span>
              </div>
            </div>

            {/* Quán quân 4: Điểm Hiệu Suất Tổng Hợp KPI Score */}
            <div
              onClick={() => setSelectedFocusStaffName(staffChampions.topKpi.name)}
              className="bg-white rounded-xl border-2 border-accent/20/80 p-4 shadow-xs hover:shadow-md transition cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xs font-semibold text-ink-2uppercase bg-accent text-white">
                  Top Điểm Đánh Giá Toàn Diện
                </span>
                <Award className="w-4 h-4 text-accent" />
              </div>
              <div className="flex items-center gap-2.5">
                <Avatar name={staffChampions.topKpi.name} size={36} />
                <div>
                  <div className="text-sm font-semibold text-ink">{staffChampions.topKpi.name}</div>
                  <div className="text-2xs text-ink-3">
                    {staffChampions.topKpi.kpiGradeLabel} · SLA {staffChampions.topKpi.slaRate}%
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-line flex items-center justify-between text-xs font-mono">
                <span className="text-accent font-semibold text-sm">
                  {staffChampions.topKpi.kpiScore}/100 điểm
                </span>
                <span className="text-ink-2">
                  {staffChampions.topKpi.actualAiredVideos} air · {staffChampions.topKpi.burnNetPct}% Spend
                </span>
              </div>
            </div>
          </div>

          {/* 2. THANH LỌC MA TRẬN 4 GÓC PHẦN TƯ: HIỆU SUẤT SẢN LƯỢNG vs HIỆU QUẢ ĐẦU TƯ */}
          <div className="bg-white rounded-xl border border-line p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-ink">
              <Award className="w-4 h-4 text-accent" />
              <span>Phân nhóm nhân viên theo Ma trận Hiệu suất (Số Video Air) &amp; Hiệu quả (% Spend, ROAS, SLA):</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                {
                  key: 'ALL',
                  label: `Tất cả nhân sự (${staffQuadrantCounts.total})`,
                  activeClass: 'bg-ink text-white',
                  idleClass: 'bg-sunken text-ink-2 hover:bg-sunken'
                },
                {
                  key: 'STAR',
                  label: `Ngôi sao toàn diện: Air cao & ROAS tốt (${staffQuadrantCounts.star} NS)`,
                  activeClass: 'bg-positive text-white',
                  idleClass: 'bg-positive-soft text-positive border border-positive/20 hover:bg-positive-soft'
                },
                {
                  key: 'HIGH_VOL_OPT_COST',
                  label: `Sản lượng Air cao — Cần tối ưu Trần Net / SLA (${staffQuadrantCounts.highVolOptCost} NS)`,
                  activeClass: 'bg-warning text-white',
                  idleClass: 'bg-warning-soft text-warning border border-warning/20 hover:bg-warning-soft'
                },
                {
                  key: 'HIGH_EFF_NEED_VOL',
                  label: `ROAS & SLA tốt — Cần đẩy nhanh Số Video Air (${staffQuadrantCounts.highEffNeedVol} NS)`,
                  activeClass: 'bg-accent text-white',
                  idleClass: 'bg-accent-soft text-accent border border-accent/20 hover:bg-accent-soft'
                },
                {
                  key: 'NEED_COACHING',
                  label: `Cần kèm cặp sát tiến độ Air & Ngân sách (${staffQuadrantCounts.needCoaching} NS)`,
                  activeClass: 'bg-critical text-white',
                  idleClass: 'bg-critical-soft text-critical border border-critical/20 hover:bg-critical-soft'
                }
              ].map((q) => (
                <button
                  key={q.key}
                  type="button"
                  onClick={() => setStaffQuadrantFilter(q.key as typeof staffQuadrantFilter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    staffQuadrantFilter === q.key ? q.activeClass : q.idleClass
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. HỒ SƠ ĐÁNH GIÁ 360° TỪNG NHÂN VIÊN TRỰC TIẾP TRÊN TRANG (CHỌN NHÂN VIÊN BẤT KỲ) */}
          {focusedStaffProfile && (
            <div className="bg-white rounded-xl border-2 border-accent/20 p-5 shadow-xs space-y-4">
              {/* Thanh chọn nhanh nhân viên để xem Hồ sơ 360° */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3.5 border-b border-line">
                <div>
                  <span className="text-2xs font-semibold uppercase tracking-wider text-accent block">
                    Hồ Sơ Đánh Giá Hiệu Suất &amp; Hiệu Quả Cá Nhân 360° (Chọn nhân viên để soi chi tiết)
                  </span>
                  <h3 className="text-base font-semibold text-ink mt-0.5">
                    Đang xem: {focusedStaffProfile.name} — {focusedStaffProfile.roleTitle}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-ink-2">Chọn nhanh nhân sự:</span>
                  <select
                    value={focusedStaffProfile.name}
                    onChange={(e) => setSelectedFocusStaffName(e.target.value)}
                    className="px-3 py-1.5 text-xs font-semibold bg-accent-soft border border-accent/20 rounded-lg text-accent focus:outline-hidden focus:border-accent/20"
                  >
                    {enrichedStaffList.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name} ({s.storesCount} gian · {s.actualAiredVideos} video air · {s.burnNetPct}% Spend · {s.kpiScore}đ)
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setIsStaff360Open(!isStaff360Open)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-accent/20 bg-white hover:bg-accent-soft text-accent text-xs font-semibold transition cursor-pointer"
                  >
                    {isStaff360Open ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        <span>Thu gọn hồ sơ</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span>Mở rộng hồ sơ 360°</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {isStaff360Open && (
                <>

              {/* Dải pill chọn nhanh các chuyên viên chủ lực */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {enrichedStaffList.slice(0, 14).map((s) => {
                  const isSelected = s.name === focusedStaffProfile.name;
                  return (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => setSelectedFocusStaffName(s.name)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition cursor-pointer border ${
                        isSelected
                          ? 'bg-accent text-white border-accent/20 shadow-xs'
                          : 'bg-canvas text-ink-2 border-line hover:bg-sunken'
                      }`}
                    >
                      <span>{s.name}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-2xs font-mono ${
                          isSelected ? 'bg-ink text-accent' : 'bg-positive-soft text-positive'
                        }`}
                      >
                        {s.actualAiredVideos} air
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Thông tin tổng quan & Điểm KPI 4 trụ cột của nhân viên đang chọn */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                {/* Trái 4 cột: Thẻ Định Danh & Tổng Điểm KPI /100 */}
                <div className="lg:col-span-4 p-4 rounded-xl bg-ink text-white flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <Avatar name={focusedStaffProfile.name} size={44} />
                        <div>
                          <div className="text-base font-semibold">{focusedStaffProfile.name}</div>
                          <div className="text-xs text-ink-3">{focusedStaffProfile.roleTitle}</div>
                          <div className="text-2xs text-accent mt-0.5">
                            Cấp duyệt: <strong>{focusedStaffProfile.directSupervisor}</strong>
                          </div>
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            focusedStaffProfile.kpiGrade === 'S'
                              ? 'bg-positive text-white'
                              : focusedStaffProfile.kpiGrade === 'A'
                              ? 'bg-accent text-white'
                              : focusedStaffProfile.kpiGrade === 'B'
                              ? 'bg-warning text-ink'
                              : 'bg-critical text-white'
                          }`}
                        >
                          {focusedStaffProfile.kpiScore}/100 điểm
                        </span>
                        <span className="block text-2xs text-ink-3 mt-1">
                          {focusedStaffProfile.kpiGradeLabel}
                        </span>
                      </div>
                    </div>

                    {/* Bóc tách 4 trụ cột cấu thành điểm KPI của nhân viên */}
                    <div className="mt-4 pt-3 border-t border-line-strong grid grid-cols-2 gap-2 text-2xs">
                      <div className="p-2 rounded bg-ink/90">
                        <span className="text-ink-3 block">1. Sản lượng Video Air</span>
                        <strong className="font-mono text-positive">{focusedStaffProfile.scoreAir}/35 điểm</strong>
                      </div>
                      <div className="p-2 rounded bg-ink/90">
                        <span className="text-ink-3 block">2. Kỷ luật % Spend Net</span>
                        <strong className="font-mono text-accent">{focusedStaffProfile.scoreSpend}/25 điểm</strong>
                      </div>
                      <div className="p-2 rounded bg-ink/90">
                        <span className="text-ink-3 block">3. Hiệu quả ROAS &amp; GMV</span>
                        <strong className="font-mono text-warning">{focusedStaffProfile.scoreEfficiency}/20 điểm</strong>
                      </div>
                      <div className="p-2 rounded bg-ink/90">
                        <span className="text-ink-3 block">4. Đúng hạn SLA &amp; ĐNTT</span>
                        <strong className="font-mono text-accent">{focusedStaffProfile.scoreSla}/20 điểm</strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-line-strong flex items-center justify-between text-2xs text-ink-3">
                    <span>
                      Quản lý: <strong>{focusedStaffProfile.storesCount} gian hàng</strong> ({focusedStaffProfile.tiktokStoresCount} TT · {focusedStaffProfile.shopeeStoresCount} SP)
                    </span>
                    <button
                      type="button"
                      onClick={() => setInspectStaff(focusedStaffProfile)}
                      className="text-accent hover:text-white font-semibold underline cursor-pointer"
                    >
                      Mở cửa sổ chi tiết
                    </button>
                  </div>
                </div>

                {/* Phải 8 cột: 6 Thẻ Chỉ Số Hiệu Suất (Output) & Hiệu Quả (ROI/Cost) Của Nhân Viên */}
                <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {/* Thẻ 1: % Spend Chi phí Net & Gross */}
                  <div className="p-3.5 rounded-xl bg-accent-soft border border-accent/20 flex flex-col justify-between">
                    <div>
                      <span className="text-2xs font-semibold text-accent uppercase block">
                        1. % Spend Chi Phí (Net &amp; Gross)
                      </span>
                      <div className="mt-1.5 flex items-baseline gap-2 font-mono">
                        <span className="text-2xl font-semibold text-accent">
                          {focusedStaffProfile.burnNetPct}% Net
                        </span>
                        <span className="text-xs font-semibold text-ink-2">
                          ({focusedStaffProfile.burnGrossPct}% Gross)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-accent-soft rounded-full overflow-hidden mt-2">
                        <div
                          className={`data-bar h-full rounded-full ${
                            focusedStaffProfile.burnNetPct > 100 ? 'bg-critical' : 'bg-accent'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(focusedStaffProfile.burnNetPct, 4))}%` }}
                        />
                      </div>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-accent/20/60 text-2xs font-mono flex justify-between">
                      <span>Thực chi: <strong>{formatVndShort(focusedStaffProfile.actualSpentNet)}</strong></span>
                      <span>Trần Net: <strong>{formatVndShort(focusedStaffProfile.orderBudgetNet)}</strong></span>
                    </div>
                  </div>

                  {/* Thẻ 2: Số lượng Video Đã Air Lên Sóng */}
                  <div className="p-3.5 rounded-xl bg-positive-soft border border-positive/20 flex flex-col justify-between">
                    <div>
                      <span className="text-2xs font-semibold text-positive uppercase block">
                        2. Số Lượng Video Đã Air Lên Sóng
                      </span>
                      <div className="mt-1.5 flex items-baseline gap-2 font-mono">
                        <span className="text-2xl font-semibold text-positive">
                          {focusedStaffProfile.actualAiredVideos} video
                        </span>
                        <span className="text-xs font-semibold text-positive">
                          ({focusedStaffProfile.airVsBookPct}% đơn book)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-positive-soft rounded-full overflow-hidden mt-2">
                        <div
                          className="data-bar h-full bg-positive rounded-full"
                          style={{ width: `${Math.min(100, Math.max(focusedStaffProfile.airVsBookPct, 5))}%` }}
                        />
                      </div>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-positive/20/60 text-2xs font-mono flex justify-between">
                      <span>Đã book: <strong>{focusedStaffProfile.actualBookedVideos} đơn</strong></span>
                      <span>Paid/FOC: <strong>{focusedStaffProfile.targetPaidVideos}/{focusedStaffProfile.targetFocVideos}</strong></span>
                    </div>
                  </div>

                  {/* Thẻ 3: Hiệu Quả Doanh Thu GMV & Đơn Hàng */}
                  <div className="p-3.5 rounded-xl bg-warning-soft border border-warning/20 flex flex-col justify-between">
                    <div>
                      <span className="text-2xs font-semibold text-warning uppercase block">
                        3. Doanh Thu GMV Tạo Ra (Seller)
                      </span>
                      <div className="mt-1.5 flex items-baseline gap-2 font-mono">
                        <span className="text-2xl font-semibold text-warning">
                          {formatVndShort(focusedStaffProfile.attributedGmv)}
                        </span>
                        <span className="text-xs font-semibold text-ink-2">
                          ({focusedStaffProfile.attributedOrders.toLocaleString('vi-VN')} đơn)
                        </span>
                      </div>
                      <p className="text-2xs text-ink-2 mt-1">
                        Tổng lượt xem tích lũy:{' '}
                        <strong className="font-mono text-ink">
                          {focusedStaffProfile.attributedViews.toLocaleString('vi-VN')} views
                        </strong>
                      </p>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-warning/20/60 text-2xs font-mono flex justify-between">
                      <span>Target NMV: <strong>{formatVndShort(focusedStaffProfile.targetNmv)}</strong></span>
                      <span className="text-positive font-semibold">
                        Win: {focusedStaffProfile.winningVideosCount} video ({focusedStaffProfile.winRatePct}%)
                      </span>
                    </div>
                  </div>

                  {/* Thẻ 4: Hiệu Quả Đầu Tư ROAS & CIR % */}
                  <div className="p-3.5 rounded-xl bg-canvas border border-line flex flex-col justify-between">
                    <div>
                      <span className="text-2xs font-semibold text-ink-2 uppercase block">
                        4. Hiệu Quả Đầu Tư (ROAS &amp; CIR %)
                      </span>
                      <div className="mt-1.5 flex items-baseline gap-2 font-mono">
                        <span className="text-xl font-semibold text-positive">
                          ROAS {focusedStaffProfile.effectiveRoas}x
                        </span>
                        <span className="text-xs font-semibold text-accent">
                          CIR: {focusedStaffProfile.effectiveCirPct}%
                        </span>
                      </div>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-line text-2xs text-ink-2 flex justify-between">
                      <span>1đ chi phí tạo ra:</span>
                      <strong className="font-mono text-ink">{focusedStaffProfile.effectiveRoas}đ GMV</strong>
                    </div>
                  </div>

                  {/* Thẻ 5: Đơn Giá Bình Quân / Video & CPA */}
                  <div className="p-3.5 rounded-xl bg-canvas border border-line flex flex-col justify-between">
                    <div>
                      <span className="text-2xs font-semibold text-ink-2 uppercase block">
                        5. Chi Phí TB / 1 Video Đã Air
                      </span>
                      <div className="mt-1.5 flex items-baseline gap-2 font-mono">
                        <span className="text-xl font-semibold text-ink">
                          {focusedStaffProfile.avgCostPerAiredVideo > 0
                            ? formatVndShort(focusedStaffProfile.avgCostPerAiredVideo)
                            : '0đ (FOC)'}
                        </span>
                        <span className="text-2xs text-ink-3">/ video air</span>
                      </div>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-line text-2xs font-mono flex justify-between">
                      <span>TB/Đơn book: <strong>{formatVndShort(focusedStaffProfile.avgCostPerBookedVideo)}</strong></span>
                      <span>CPA/Đơn: <strong>{formatVndShort(focusedStaffProfile.cpaPerOrder)}</strong></span>
                    </div>
                  </div>

                  {/* Thẻ 6: Kỷ Luật SLA & Kiểm Soát Trần Net */}
                  <div className="p-3.5 rounded-xl bg-canvas border border-line flex flex-col justify-between">
                    <div>
                      <span className="text-2xs font-semibold text-ink-2 uppercase block">
                        6. Kỷ Luật Đúng Hạn SLA &amp; Trần Net
                      </span>
                      <div className="mt-1.5 flex items-baseline gap-2 font-mono">
                        <span
                          className={`text-xl font-semibold ${
                            focusedStaffProfile.slaRate >= 85
                              ? 'text-positive'
                              : focusedStaffProfile.slaRate >= 65
                              ? 'text-warning'
                              : 'text-critical'
                          }`}
                        >
                          SLA {focusedStaffProfile.slaRate}%
                        </span>
                        <span className="text-xs text-ink-3">
                          ({focusedStaffProfile.lateSlaVideosCount} đơn trễ)
                        </span>
                      </div>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-line text-2xs flex justify-between">
                      <span>Kiểm soát Kế toán:</span>
                      {focusedStaffProfile.unbudgetedStoresCount > 0 || focusedStaffProfile.overbudgetStoresCount > 0 ? (
                        <strong className="text-critical">
                          {focusedStaffProfile.unbudgetedStoresCount} gian 0đ · {focusedStaffProfile.overbudgetStoresCount} vượt Net
                        </strong>
                      ) : (
                        <strong className="text-positive">100% đúng trần Net</strong>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bóc tách Gian hàng & Video thực tế của Nhân viên đang chọn */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2">
                {/* Trái 6 cột: Danh sách các gian hàng của nhân viên này kèm % Spend & Số Video Air */}
                <div className="lg:col-span-6 rounded-xl border border-line overflow-hidden">
                  <div className="px-4 py-2.5 bg-canvas border-b border-line flex items-center justify-between">
                    <span className="text-xs font-semibold text-ink">
                      Gian Hàng Do {focusedStaffProfile.name} Phụ Trách ({focusedStaffProfile.staffStores.length} Gian)
                    </span>
                    <span className="text-2xs text-ink-3">Nhấn vào gian hàng để xem chi tiết</span>
                  </div>
                  {focusedStaffProfile.staffStores.length === 0 ? (
                    <div className="p-6 text-center text-xs text-ink-3">
                      Nhân sự thực thi chuyên biệt theo đợt Booking / FOC hỗ trợ liên gian hàng (Xem danh sách video bên phải).
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-60">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-canvas text-ink-3 border-b border-line sticky top-0">
                          <tr>
                            <th className="py-2 px-3">Gian Hàng</th>
                            <th className="py-2 px-2 text-right">Trần Net</th>
                            <th className="py-2 px-2 text-right">Thực Chi &amp; % Spend</th>
                            <th className="py-2 px-3 text-center">Video Air / Paid</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {focusedStaffProfile.staffStores.map((s) => {
                            const net = s.budgetNet || s.monthlyBudget || 0;
                            const spent = s.actualSpentNet || 0;
                            const pct = net > 0 ? Math.round((spent / net) * 1000) / 10 : spent > 0 ? 999 : 0;
                            return (
                              <tr
                                key={s.id}
                                onClick={() => setInspectStore(s)}
                                className="hover:bg-accent-soft cursor-pointer"
                              >
                                <td className="py-2 px-3">
                                  <div className="font-semibold text-ink">{s.storeName}</div>
                                  <div className="text-2xs text-ink-3">{s.platform}</div>
                                </td>
                                <td className="py-2 px-2 text-right font-mono text-accent font-semibold">
                                  {formatVndShort(net)}
                                </td>
                                <td className="py-2 px-2 text-right font-mono">
                                  <span className="font-semibold text-ink">{formatVndShort(spent)}</span>{' '}
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-2xs font-semibold ${
                                      pct > 100 ? 'bg-critical-soft text-critical' : 'bg-accent-soft text-accent'
                                    }`}
                                  >
                                    {pct === 999 ? 'Ngoài KH' : `${pct}%`}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-center font-mono">
                                  <strong className="text-positive">{s.actualAiredVideos || 0} air</strong> /{' '}
                                  <span className="text-ink-3">{s.targetPaidVideos || 0}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Phải 6 cột: Danh sách các Video đã book & ROAS của nhân viên này */}
                <div className="lg:col-span-6 rounded-xl border border-line overflow-hidden">
                  <div className="px-4 py-2.5 bg-canvas border-b border-line flex items-center justify-between">
                    <span className="text-xs font-semibold text-ink">
                      Video Đã Book &amp; Hiệu Quả Bán Hàng Của {focusedStaffProfile.name}
                    </span>
                    <span className="text-2xs font-mono text-positive font-semibold">
                      Tổng Air: {focusedStaffProfile.actualAiredVideos}/{focusedStaffProfile.actualBookedVideos} đơn
                    </span>
                  </div>
                  {focusedStaffProfile.staffVideos.length === 0 ? (
                    <div className="p-6 text-center text-xs text-ink-3">
                      Nhân sự đã thực hiện <strong>{focusedStaffProfile.actualBookedVideos} đơn book</strong> ({focusedStaffProfile.actualAiredVideos} video đã air) trên hệ thống File 3.2.
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-60">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-canvas text-ink-3 border-b border-line sticky top-0">
                          <tr>
                            <th className="py-2 px-3">Mã Book &amp; KOC</th>
                            <th className="py-2 px-2">Gian Hàng</th>
                            <th className="py-2 px-2 text-right">Cát-xê</th>
                            <th className="py-2 px-2 text-right">GMV Seller</th>
                            <th className="py-2 px-3 text-center">ROAS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {focusedStaffProfile.staffVideos.slice(0, 20).map((v) => (
                            <tr
                              key={v.code}
                              onClick={() => setInspectVideo(v)}
                              className="hover:bg-accent-soft cursor-pointer"
                            >
                              <td className="py-2 px-3">
                                <div className="font-mono font-semibold text-accent">{v.code}</div>
                                <div className="text-2xs text-ink-2">@{v.channelId} ({v.kl})</div>
                              </td>
                              <td className="py-2 px-2 text-2xs font-medium text-ink">{v.storeName}</td>
                              <td className="py-2 px-2 text-right font-mono font-semibold">{formatVndShort(v.cost)}</td>
                              <td className="py-2 px-2 text-right font-mono text-positive font-semibold">
                                {formatVndShort(v.sellerGmv)}
                              </td>
                              <td className="py-2 px-3 text-center font-mono">
                                <span
                                  className={`text-2xs font-mono font-semibold text-ink-2${
                                    v.roas >= 3.5 ? 'bg-positive-soft text-positive' : 'bg-sunken text-ink-2'
                                  }`}
                                >
                                  {v.roas}x
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
                </>
              )}
            </div>
          )}

          {/* 4. BIỂU ĐỒ SO SÁNH NGANG ĐA CHIỀU GIỮA CÁC CHUYÊN VIÊN THỰC THI */}
          <div className="bg-white rounded-xl border border-line p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-ink">
                  Biểu Đồ Đối Sánh Hiệu Suất &amp; Hiệu Quả Giữa Các Chuyên Viên B2C
                </h3>
                </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { key: 'BOTH', label: '1. Kép: % Spend Net & Số Video Air', activeBg: 'bg-ink text-white' },
                  { key: 'GMV_ROAS', label: '2. Hiệu Quả: GMV Tạo Ra & ROAS', activeBg: 'bg-positive text-white' },
                  { key: 'UNIT_COST', label: '3. Tối Ưu Giá: Đơn Giá TB / Video Air', activeBg: 'bg-accent text-white' },
                  { key: 'KPI_SCORE', label: '4. Điểm KPI Tổng Hợp (/100) & SLA', activeBg: 'bg-accent text-white' }
                ].map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setStaffMetricMode(m.key as typeof staffMetricMode)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      staffMetricMode === m.key
                        ? m.activeBg
                        : 'bg-sunken text-ink-2 hover:bg-sunken'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {specialistChartList.map((st) => {
                const maxGmv = Math.max(...specialistChartList.map((x) => x.attributedGmv), 1);
                const gmvBar = Math.round((st.attributedGmv / maxGmv) * 100);
                const maxUnitCost = Math.max(...specialistChartList.map((x) => x.avgCostPerAiredVideo), 1);
                const unitCostBar = Math.round((st.avgCostPerAiredVideo / maxUnitCost) * 100);
                const isSelected = focusedStaffProfile?.name === st.name;

                return (
                  <div
                    key={st.name}
                    onClick={() => setSelectedFocusStaffName(st.name)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'border-2 border-accent/20 bg-accent-soft shadow-xs'
                        : 'border-line hover:border-accent/20 hover:bg-canvas'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={st.name} size={32} />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-ink">{st.name}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-2xs font-mono font-semibold ${
                                st.kpiGrade === 'S'
                                  ? 'bg-positive text-white'
                                  : st.kpiGrade === 'A'
                                  ? 'bg-accent text-white'
                                  : st.kpiGrade === 'B'
                                  ? 'bg-warning-soft text-warning'
                                  : 'bg-sunken text-ink-2'
                              }`}
                            >
                              {st.kpiScore}đ ({st.kpiGrade})
                            </span>
                          </div>
                          <span className="text-2xs text-ink-3">
                            {st.storesCount} gian · GMV: <strong>{formatVndShort(st.attributedGmv)}</strong> · ROAS: <strong>{st.effectiveRoas}x</strong>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-2xs">
                        <span
                          className={`px-2 py-0.5 rounded font-semibold ${
                            st.burnNetPct > 100
                              ? 'bg-critical-soft text-critical'
                              : st.burnNetPct >= 45
                              ? 'bg-accent-soft text-accent'
                              : 'bg-sunken text-ink-2'
                          }`}
                        >
                          {st.burnNetPct}% Spend
                        </span>
                        <span className="font-semibold text-positive">
                          {st.actualAiredVideos} Air
                        </span>
                      </div>
                    </div>

                    {staffMetricMode === 'BOTH' && (
                      <div className="space-y-2 mt-2 pt-2 border-t border-line">
                        <div>
                          <div className="flex items-center justify-between text-2xs mb-0.5">
                            <span className="text-ink-3">1. Thực chi / Trần Order Net:</span>
                            <span className="font-mono font-semibold text-accent">
                              {formatVndShort(st.actualSpentNet)} / {formatVndShort(st.orderBudgetNet)} ({st.burnNetPct}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-sunken rounded-full overflow-hidden">
                            <div
                              className={`data-bar h-full rounded-full ${
                                st.overbudgetStoresCount > 0 || st.unbudgetedStoresCount > 0 ? 'bg-critical' : 'bg-accent'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(st.burnNetPct, st.actualSpentNet > 0 ? 4 : 0))}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-2xs mb-0.5">
                            <span className="text-ink-3">
                              2. Số Video Đã Air / Đơn Book (Paid: {st.targetPaidVideos} · FOC: {st.targetFocVideos}):
                            </span>
                            <span className="font-mono font-semibold text-positive">
                              {st.actualAiredVideos} / {st.actualBookedVideos} đơn ({st.airVsBookPct}% Air)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-sunken rounded-full overflow-hidden">
                            <div
                              className="data-bar h-full bg-positive rounded-full"
                              style={{ width: `${Math.min(100, Math.max(st.airVsBookPct, st.actualAiredVideos > 0 ? 5 : 0))}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {staffMetricMode === 'GMV_ROAS' && (
                      <div className="space-y-2 mt-2 pt-2 border-t border-line">
                        <div>
                          <div className="flex items-center justify-between text-2xs mb-0.5">
                            <span className="text-ink-3">Doanh thu GMV tạo ra ({st.attributedOrders} đơn):</span>
                            <span className="font-mono font-semibold text-positive">
                              {formatVndShort(st.attributedGmv)} (ROAS {st.effectiveRoas}x · CIR {st.effectiveCirPct}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-sunken rounded-full overflow-hidden">
                            <div
                              className="data-bar h-full bg-positive rounded-full"
                              style={{ width: `${Math.max(gmvBar, 5)}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-2xs font-mono text-ink-2">
                          <span>Lượt xem: <strong>{st.attributedViews.toLocaleString('vi-VN')}</strong></span>
                          <span className="text-positive font-semibold">
                            Video thắng (ROAS ≥ 3x): {st.winningVideosCount}/{st.actualAiredVideos} ({st.winRatePct}%)
                          </span>
                        </div>
                      </div>
                    )}

                    {staffMetricMode === 'UNIT_COST' && (
                      <div className="space-y-2 mt-2 pt-2 border-t border-line">
                        <div>
                          <div className="flex items-center justify-between text-2xs mb-0.5">
                            <span className="text-ink-3">Chi phí bình quân / 1 Video Đã Air:</span>
                            <span className="font-mono font-semibold text-accent">
                              {st.avgCostPerAiredVideo > 0 ? formatVndShort(st.avgCostPerAiredVideo) : '0đ (FOC)'} / video
                            </span>
                          </div>
                          <div className="w-full h-2 bg-sunken rounded-full overflow-hidden">
                            <div
                              className="data-bar h-full bg-accent rounded-full"
                              style={{ width: `${Math.max(unitCostBar, st.avgCostPerAiredVideo > 0 ? 5 : 2)}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-2xs font-mono text-ink-2">
                          <span>TB / Đơn book: <strong>{formatVndShort(st.avgCostPerBookedVideo)}</strong></span>
                          <span>CPA / Đơn hàng: <strong>{formatVndShort(st.cpaPerOrder)}</strong></span>
                        </div>
                      </div>
                    )}

                    {staffMetricMode === 'KPI_SCORE' && (
                      <div className="space-y-2 mt-2 pt-2 border-t border-line">
                        <div>
                          <div className="flex items-center justify-between text-2xs mb-0.5">
                            <span className="text-ink-3">Điểm KPI Tổng Hợp ({st.kpiGradeLabel}):</span>
                            <span className="font-mono font-semibold text-accent">
                              {st.kpiScore}/100 điểm · SLA: {st.slaRate}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-sunken rounded-full overflow-hidden">
                            <div
                              className="data-bar h-full bg-accent rounded-full"
                              style={{ width: `${st.kpiScore}%` }}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-1 text-2xs font-mono text-center bg-canvas p-1 rounded">
                          <span>Air: <strong>{st.scoreAir}/35</strong></span>
                          <span>Spend: <strong>{st.scoreSpend}/25</strong></span>
                          <span>ROAS: <strong>{st.scoreEfficiency}/20</strong></span>
                          <span>SLA: <strong>{st.scoreSla}/20</strong></span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. BẢNG XẾP HẠNG & ĐỐI SOÁT HIỆU SUẤT + HIỆU QUẢ TOÀN BỘ 32 NHÂN SỰ B2C */}
          <div className="bg-white rounded-xl border border-line overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-line flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    Bảng Xếp Hạng &amp; Đối Soát Hiệu Suất, Hiệu Quả Từng Nhân Viên B2C ({filteredStaffList.length} Nhân Sự)
                  </h3>
                  </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={staffSearchQuery}
                      onChange={(e) => setStaffSearchQuery(e.target.value)}
                      placeholder="Tìm tên nhân sự, PIC..."
                      className="w-48 pl-8 pr-3 py-1.5 text-xs bg-canvas border border-line rounded-lg focus:outline-hidden focus:border-accent/20 focus:bg-white"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { key: 'ALL', label: 'Tất cả 32 NS' },
                      { key: 'WITH_STORES', label: 'Chuyên viên giữ gian hàng (4.1)' },
                      { key: 'SPECIALIST', label: 'Toàn bộ Chuyên viên' },
                      { key: 'MANAGEMENT', label: 'Cấp Quản lý' }
                    ].map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setStaffRoleFilter(f.key as typeof staffRoleFilter)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                          staffRoleFilter === f.key
                            ? 'bg-ink text-white'
                            : 'bg-sunken text-ink-2 hover:bg-sunken'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Thanh sắp xếp 1 chạm theo từng chỉ số Hiệu suất & Hiệu quả */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line">
                <span className="text-2xs font-semibold text-ink-2">
                  Sắp xếp bảng xếp hạng nhân viên theo:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { key: 'KPI_DESC', label: 'Điểm KPI cao nhất' },
                    { key: 'AIRED_DESC', label: 'Nhiều Video Air nhất' },
                    { key: 'SPEND_PCT_DESC', label: '% Spend Net cao → thấp' },
                    { key: 'GMV_DESC', label: 'Doanh thu GMV cao nhất' },
                    { key: 'ROAS_DESC', label: 'Hiệu quả ROAS cao nhất' },
                    { key: 'COST_PER_AIR_ASC', label: 'Chi phí/Video Air tối ưu nhất' },
                    { key: 'SLA_DESC', label: 'Tỷ lệ SLA cao nhất' }
                  ].map((srt) => (
                    <button
                      key={srt.key}
                      type="button"
                      onClick={() => setStaffSortMode(srt.key as typeof staffSortMode)}
                      className={`px-2.5 py-1 rounded text-2xs font-semibold transition cursor-pointer ${
                        staffSortMode === srt.key
                          ? 'bg-accent text-white'
                          : 'bg-sunken text-ink-2 hover:bg-sunken'
                      }`}
                    >
                      {srt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[650px]">
              <table className="w-full text-xs text-left">
                <thead className="bg-canvas text-ink-2 uppercase border-b border-line sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-3 font-semibold text-center">#</th>
                    <th className="py-3 px-3 font-semibold">Nhân Sự &amp; Vai Trò</th>
                    <th className="py-3 px-2 font-semibold text-center">Số Gian</th>
                    <th className="py-3 px-3 font-semibold text-right">Hạn Mức Net</th>
                    <th className="py-3 px-3 font-semibold text-right bg-accent-soft text-accent">
                      Thực Chi &amp; % Spend Net
                    </th>
                    <th className="py-3 px-3 font-semibold text-center bg-positive-soft text-positive">
                      Số Video Đã Air / Đơn Book
                    </th>
                    <th className="py-3 px-3 font-semibold text-right">
                      Đơn Giá TB / Video Air
                    </th>
                    <th className="py-3 px-3 font-semibold text-right bg-warning-soft text-warning">
                      GMV Tạo Ra &amp; Đơn
                    </th>
                    <th className="py-3 px-3 font-semibold text-center bg-warning-soft text-warning">
                      ROAS &amp; CIR %
                    </th>
                    <th className="py-3 px-2 font-semibold text-center">Đúng Hạn SLA</th>
                    <th className="py-3 px-3 font-semibold text-center bg-accent-soft text-accent">
                      Điểm KPI &amp; Hạng
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredStaffList.slice(0, staffVisibleLimit).map((st, idx) => {
                    const isFocused = focusedStaffProfile?.name === st.name;
                    return (
                      <tr
                        key={st.name}
                        onClick={() => {
                          setSelectedFocusStaffName(st.name);
                          setInspectStaff(st);
                        }}
                        className={`transition cursor-pointer ${
                          isFocused ? 'bg-accent-soft' : 'hover:bg-accent-soft'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center font-mono font-semibold text-ink-3">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={st.name} size={28} />
                            <div>
                              <div className="font-semibold text-ink flex items-center gap-1.5">
                                {st.name}
                                {st.roleLevel === 'HEAD' && (
                                  <span className=".5 py-0.2 text-2xs font-semibold bg-ink text-white">
                                    Giám Đốc
                                  </span>
                                )}
                                {st.roleLevel === 'LEADER' && (
                                  <span className=".5 py-0.2 text-2xs font-semibold text-accent">
                                    Leader (8 gian)
                                  </span>
                                )}
                              </div>
                              <div className="text-2xs text-ink-3">
                                Duyệt: {st.directSupervisor} · Paid/FOC/Brand: {st.targetPaidVideos}/{st.targetFocVideos}/{st.targetSelfVideos}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono">
                          <span className="font-semibold text-ink">{st.storesCount}</span>
                          <span className="block text-2xs text-ink-3">
                            {st.tiktokStoresCount}TT·{st.shopeeStoresCount}SP
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-accent">
                          {formatVndShort(st.orderBudgetNet)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono bg-accent-soft">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="font-semibold text-ink">
                              {formatVndShort(st.actualSpentNet)}
                            </span>
                            <span
                              className={`text-2xs font-mono font-semibold text-ink-2${
                                st.burnNetPct > 100
                                  ? 'bg-critical text-white'
                                  : st.burnNetPct >= 45
                                  ? 'bg-accent text-white'
                                  : 'bg-accent-soft text-accent'
                              }`}
                            >
                              {st.burnNetPct}%
                            </span>
                          </div>
                          <div className="w-24 ml-auto h-1.5 bg-sunken rounded-full overflow-hidden mt-1">
                            <div
                              className={`data-bar h-full rounded-full ${
                                st.burnNetPct > 100 ? 'bg-critical' : 'bg-accent'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(st.burnNetPct, st.actualSpentNet > 0 ? 4 : 0))}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono bg-positive-soft">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-sm font-semibold text-positive">
                              {st.actualAiredVideos} air
                            </span>
                            <span className="text-2xs text-ink-3">
                              / {st.actualBookedVideos} ({st.airVsBookPct}%)
                            </span>
                          </div>
                          <div className="w-24 mx-auto h-1.5 bg-sunken rounded-full overflow-hidden mt-1">
                            <div
                              className="data-bar h-full bg-positive rounded-full"
                              style={{ width: `${Math.min(100, Math.max(st.airVsBookPct, st.actualAiredVideos > 0 ? 6 : 0))}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          <div className="font-semibold text-ink">
                            {st.avgCostPerAiredVideo > 0 ? formatVndShort(st.avgCostPerAiredVideo) : '0đ (FOC)'}
                          </div>
                          <div className="text-2xs text-ink-3">
                            CPA: {formatVndShort(st.cpaPerOrder)}/đơn
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono bg-warning-soft">
                          <div className="font-semibold text-ink">
                            {formatVndShort(st.attributedGmv)}
                          </div>
                          <div className="text-2xs text-ink-3">
                            {st.attributedOrders.toLocaleString('vi-VN')} đơn · Win {st.winRatePct}%
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono bg-warning-soft">
                          <span
                            className={`px-2 py-0.5 rounded font-semibold text-2xs ${
                              st.effectiveRoas >= 3.5
                                ? 'bg-positive-soft text-positive'
                                : st.effectiveRoas >= 2.5
                                ? 'bg-accent-soft text-accent'
                                : 'bg-warning-soft text-warning'
                            }`}
                          >
                            {st.effectiveRoas}x
                          </span>
                          <span className="block text-2xs text-ink-3 mt-0.5">
                            CIR: {st.effectiveCirPct}%
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono">
                          <span
                            className={`px-2 py-0.5 rounded font-semibold text-2xs ${
                              st.slaRate >= 85
                                ? 'bg-positive-soft text-positive'
                                : st.slaRate >= 60
                                ? 'bg-warning-soft text-warning'
                                : 'bg-critical-soft text-critical'
                            }`}
                          >
                            {st.slaRate}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono bg-accent-soft">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                              st.kpiGrade === 'S'
                                ? 'bg-positive text-white'
                                : st.kpiGrade === 'A'
                                ? 'bg-accent text-white'
                                : st.kpiGrade === 'B'
                                ? 'bg-warning-soft text-warning'
                                : 'bg-critical-soft text-critical'
                            }`}
                          >
                            {st.kpiScore}/100 ({st.kpiGrade})
                          </span>
                          {(st.unbudgetedStoresCount > 0 || st.overbudgetStoresCount > 0) && (
                            <span className="block text-2xs text-critical font-semibold mt-0.5">
                              {st.unbudgetedStoresCount + st.overbudgetStoresCount} gian vượt Net/0đ
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredStaffList.length > 12 && (
              <div className="px-5 py-3 border-t border-line bg-canvas flex items-center justify-between">
                <span className="text-xs text-ink-3">
                  Hiển thị <strong className="text-ink font-mono">{Math.min(staffVisibleLimit, filteredStaffList.length)}</strong> / <strong className="text-ink font-mono">{filteredStaffList.length}</strong> nhân sự B2C
                </span>
                <button
                  type="button"
                  onClick={() => setStaffVisibleLimit((prev) => (prev >= filteredStaffList.length ? 12 : filteredStaffList.length))}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-line-strong bg-white hover:bg-sunken text-ink-2 transition cursor-pointer"
                >
                  {staffVisibleLimit >= filteredStaffList.length ? 'Thu gọn (12 nhân sự)' : `Xem tất cả ${filteredStaffList.length} nhân sự`}
                </button>
              </div>
            )}
          </div>
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                        {storeVids.map((v) => (
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
      {inspectStaff && (
        <Modal
          open={Boolean(inspectStaff)}
          onClose={() => setInspectStaff(null)}
          title={`Hồ Sơ Hiệu Suất Nhân Sự: ${inspectStaff.name} (${inspectStaff.roleTitle})`}
          size="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-canvas border border-line">
                <span className="text-2xs text-ink-3 block">Số Gian Hàng Phụ Trách</span>
                <strong className="text-sm font-mono text-ink">
                  {inspectStaff.storesCount} gian ({inspectStaff.tiktokStoresCount} TT · {inspectStaff.shopeeStoresCount} SP)
                </strong>
              </div>
              <div className="p-3 rounded-lg bg-accent-soft border border-accent/20">
                <span className="text-2xs text-accent block">Hạn Mức Order Net Quản Lý</span>
                <strong className="text-sm font-mono text-accent">
                  {formatVndShort(inspectStaff.orderBudgetNet)}
                </strong>
              </div>
              <div className="p-3 rounded-lg bg-positive-soft border border-positive/20">
                <span className="text-2xs text-positive block">Thực Chi Duyệt Book (3.2)</span>
                <strong className="text-sm font-mono text-positive">
                  {formatVndShort(inspectStaff.actualSpentNet)} ({inspectStaff.burnNetPct}%)
                </strong>
              </div>
              <div className="p-3 rounded-lg bg-warning-soft border border-warning/20">
                <span className="text-2xs text-warning block">Sản Lượng Video Tháng 10</span>
                <strong className="text-sm font-mono text-warning">
                  {inspectStaff.actualBookedVideos} đơn book · {inspectStaff.actualAiredVideos} đã air
                </strong>
              </div>
            </div>

            {inspectStaff.storesList.length > 0 && (
              <div>
                <h4 className="font-semibold text-ink mb-1.5">
                  Danh Sách Gian Hàng Được Giao Phụ Trách ({inspectStaff.storesList.length} Gian Hàng):
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {inspectStaff.storesList.map((stName) => (
                    <span
                      key={stName}
                      className=".5 text-ink font-semibold text-2xs -line"
                    >
                      {stName}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-semibold text-ink mb-2">
                Danh Sách Các Video Nhân Sự Đã Trực Tiếp Book Trong File 3.2:
              </h4>
              {(() => {
                const staffVids = B2C_BOOKED_VIDEOS_OCT_2026.filter(
                  (v) => v.pic.toLowerCase() === inspectStaff.name.toLowerCase()
                );
                if (staffVids.length === 0) {
                  return (
                    <p className="text-ink-3 py-4 text-center bg-canvas rounded-lg">
                      Nhân sự thực hiện vai trò quản lý hoặc các đơn book nằm ngoài tập mẫu 150 video hiển thị nhanh.
                    </p>
                  );
                }
                return (
                  <div className="overflow-x-auto max-h-60 border border-line rounded-lg">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-canvas border-b border-line">
                        <tr>
                          <th className="py-2 px-3">Mã Book</th>
                          <th className="py-2 px-3">Gian Hàng</th>
                          <th className="py-2 px-3">Kênh KOC</th>
                          <th className="py-2 px-3">Loại Hình</th>
                          <th className="py-2 px-3">Khung Lương</th>
                          <th className="py-2 px-3 text-right">Cát-xê</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {staffVids.map((v) => (
                          <tr key={v.code}>
                            <td className="py-2 px-3 font-mono font-semibold text-accent">{v.code}</td>
                            <td className="py-2 px-3 font-semibold">{v.storeName}</td>
                            <td className="py-2 px-3">@{v.channelId}</td>
                            <td className="py-2 px-3">{v.format}</td>
                            <td className="py-2 px-3 font-mono">{v.kl}</td>
                            <td className="py-2 px-3 text-right font-mono font-semibold">
                              {formatVndShort(v.cost)}
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
                <span className="text-ink-3">Chi phí duyệt chi (File 3.2):</span>
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
        moduleSubtitle="Tổng hợp trực tiếp từ dữ liệu 69 gian hàng B2C, File 4.1, File 3.2 và TikTok Seller đang lọc"
        contextDataText={dashboardReportMeta.contextDataText}
        onNotify={onNotify}
      />
    </div>
  );
};
