'use client';

import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Video,
  Award,
  Users,
  Layers,
  Calendar,
  FileSpreadsheet,
  Download,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Building,
  Sparkles,
  PieChart,
  BarChart3,
  Search,
  ExternalLink,
  ChevronRight,
  Printer,
  FileText,
  Activity,
  Zap,
  PlaySquare,
  AlertCircle,
  Eye,
  Film,
  Flame,
  UserCheck,
  SlidersHorizontal,
  ChevronDown,
  Percent,
  CheckCircle
} from 'lucide-react';
import { 
  BookingDealItem, 
  UserProfile, 
  BrandDetail, 
  StorePortfolioItem, 
  KocItem 
} from '../../lib/types';
import { formatVndShort } from '../../lib/format';
import { STAFF_MASTER_DIRECTORY } from '../../lib/mockData';
import ExcelJS from 'exceljs';

interface ExecutiveDashboardReportsViewProps {
  currentUser: UserProfile;
  deals: BookingDealItem[];
  brands?: BrandDetail[];
  kocs?: KocItem[];
  storePortfolios?: StorePortfolioItem[];
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onNavigateToTab?: (tabKey: any) => void;
}

export interface StaffPerformanceItem {
  id: string;
  name: string;
  role: string;
  roleTitle: string;
  team: string;
  avatar: string;
  assignedStoresCount: number;
  assignedBrandsCount: number;
  targetVideos: number;
  airedVideos: number;
  inProgressVideos: number;
  targetGmv: number;
  currentGmv: number;
  allocatedBudget: number;
  spentBudget: number;
  burnRatePct: number;
  slaScore: number;
  status: string;
  workloadWarning?: string;
}

export interface VideoAiredItem {
  id: string;
  title: string;
  creatorName: string;
  creatorTier: string;
  brandName: string;
  storeName: string;
  platform: string;
  videoUrl: string;
  sparkAdsCode?: string;
  airDate: string;
  views: number;
  gmv: number;
  cvr: number;
  commission: number;
  status: string;
}

export interface BrandBudgetPacingItem {
  brandId: string;
  brandName: string;
  storeCount: number;
  leadPic: string;
  planBudget: number;
  spentBudget: number;
  remainingBudget: number;
  burnRatePct: number;
  expectedBurnPct: number; // Theo chu kỳ ngày trong tháng
  pacingStatus: string;
  targetGmv: number;
  currentGmv: number;
  roas: number;
  actionNote: string;
}

export const ExecutiveDashboardReportsView: React.FC<ExecutiveDashboardReportsViewProps> = ({
  currentUser,
  deals = [],
  brands = [],
  kocs = [],
  storePortfolios = [],
  onNotify,
  onNavigateToTab
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026-10');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL');
  const [selectedStaffTeam, setSelectedStaffTeam] = useState<string>('ALL');
  const [selectedStaffStatus, setSelectedStaffStatus] = useState<string>('ALL');
  const [selectedVideoStatus, setSelectedVideoStatus] = useState<string>('ALL');
  const [selectedPacingFilter, setSelectedPacingFilter] = useState<string>('ALL');
  
  const [activeSubTab, setActiveSubTab] = useState<
    'OVERVIEW' | 'STAFF_PROGRESS' | 'VIDEO_AIRING' | 'BUDGET_PACING' | 'CREATORS' | 'FINANCE_TAX' | 'REPORT_CENTER'
  >('OVERVIEW');
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const notify = (msg: string, type: 'success' | 'warning' | 'info' | 'error' = 'success') => {
    if (onNotify) onNotify(msg, type);
  };

  // Chu kỳ ngày trong tháng (Giả lập Ngày 8 trong tháng 31 ngày = 25.8% chu kỳ)
  const currentDayInMonth = 8;
  const totalDaysInMonth = 31;
  const expectedPacingPct = Math.round((currentDayInMonth / totalDaysInMonth) * 100); // 26%

  // Filtered Deals by Brand and Channel
  const filteredDeals = useMemo(() => {
    return deals.filter(d => {
      const matchBrand = selectedBrand === 'ALL' || d.brandName === selectedBrand;
      const matchChannel = selectedChannel === 'ALL' || 
        (selectedChannel === 'TIKTOK' && (d.storeName?.includes('TikTok') || d.bookingFormat?.includes('TikTok'))) ||
        (selectedChannel === 'SHOPEE' && d.storeName?.includes('Shopee')) ||
        (selectedChannel === 'LAZADA' && d.storeName?.includes('Lazada'));
      const matchSearch = !searchQuery || 
        d.campaignTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.kocStageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.dealCode.toLowerCase().includes(searchQuery.toLowerCase());

      return matchBrand && matchChannel && matchSearch;
    });
  }, [deals, selectedBrand, selectedChannel, searchQuery]);

  // Executive KPI Aggregations
  const stats = useMemo(() => {
    const totalDeals = filteredDeals.length;
    const isBrandFiltered = selectedBrand !== 'ALL';

    // Deal costs (Net cast booking)
    const bookingCost = filteredDeals.reduce((sum, d) => sum + (d.totalValue || 0), 0);
    // TikTok Ads PGM spend
    const adsSpend = filteredDeals.reduce((sum, d) => sum + (d.adCost || 0), 0);
    // CTV Video Production cost: only include in system-wide overview or when not brand filtered
    const ctvCost = isBrandFiltered ? 0 : 78500000;
    // Sample & Logistics
    const sampleLogisticsCost = isBrandFiltered
      ? (totalDeals > 0 ? totalDeals * 250000 : 0)
      : 31000000;
    // Total investment
    const totalSpend = bookingCost + adsSpend + ctvCost + sampleLogisticsCost;

    // Gross GMV
    const bookingGmv = filteredDeals.reduce((sum, d) => sum + (d.affiliateGmv || d.gmv30 || 0), 0);
    const adsGmv = filteredDeals.reduce((sum, d) => sum + (d.adGmv || 0), 0);
    const ctvGmv = isBrandFiltered ? 0 : 840000000;
    const totalGmv = bookingGmv + adsGmv + ctvGmv;

    // Overall ROAS
    const overallRoas = totalSpend > 0 ? Number((totalGmv / totalSpend).toFixed(2)) : 0;
    const netProfitContribution = totalGmv - totalSpend;

    // SLA & Outputs
    const totalOnAirVideos = isBrandFiltered
      ? filteredDeals.filter(d => d.status === 'VIDEO_VERIFIED' || d.status === 'FINAL_PAID' || d.status === 'COMPLETED' || Boolean(d.videoUrl || d.tiktokVideoUrl)).length
      : 1025;
    const inProductionVideos = isBrandFiltered
      ? filteredDeals.filter(d => d.status === 'SCRIPT_APPROVED' || d.status === 'CONTRACT_GENERATED' || d.status === 'SAMPLE_SHIPPED' || d.status === 'SAMPLE_RECEIVED' || d.status === 'VIDEO_SUBMITTED').length
      : 285;
    const pendingScriptVideos = isBrandFiltered
      ? filteredDeals.filter(d => d.status === 'SCRIPT_PENDING' || d.status === 'TERMS_AGREED' || d.status === 'CONTACTING').length
      : 94;
    const totalViews = isBrandFiltered
      ? filteredDeals.reduce((sum, d) => sum + (d.viewsCount || 0), 0)
      : 48600000;
    const onTimeSlaCount = filteredDeals.filter(d => d.slaStatus !== 'OVERDUE').length;
    const slaComplianceRate = totalDeals > 0 ? Math.round((onTimeSlaCount / totalDeals) * 100) : 100;

    // Advance & Final Paid
    const totalAdvancePaid = filteredDeals.reduce((sum, d) => sum + (d.advanceAmount || 0), 0);
    const totalFinalPaid = filteredDeals.reduce((sum, d) => sum + (d.finalAmount || 0), 0);
    // 10% PIT Withholding Tax
    const totalPitTaxWithheld = Math.round(totalSpend * 0.1);

    // Total Portfolio Budget & Spend
    const relevantPortfolios = isBrandFiltered
      ? storePortfolios.filter(s => s.brandName === selectedBrand || s.storeName.toLowerCase().includes(selectedBrand.toLowerCase()))
      : storePortfolios;
    const totalPlanBudget = relevantPortfolios.length > 0
      ? relevantPortfolios.reduce((acc, s) => acc + (s.monthlyBudget || 0), 0)
      : (isBrandFiltered ? (totalSpend > 0 ? Math.round(totalSpend * 1.5) : 0) : 13450000000);
    const totalSpentBudget = totalSpend > 0 ? totalSpend : (isBrandFiltered ? 0 : Math.round(totalPlanBudget * 0.284));
    const totalRemainingBudget = Math.max(0, totalPlanBudget - totalSpentBudget);
    const overallBurnRate = totalPlanBudget > 0 ? Math.round((totalSpentBudget / totalPlanBudget) * 100) : 0;
    const overallPacingIndex = expectedPacingPct > 0 ? Number((overallBurnRate / expectedPacingPct).toFixed(2)) : 0;

    return {
      totalDeals,
      bookingCost,
      adsSpend,
      ctvCost,
      sampleLogisticsCost,
      totalSpend,
      bookingGmv,
      adsGmv,
      ctvGmv,
      totalGmv,
      overallRoas,
      netProfitContribution,
      totalOnAirVideos,
      inProductionVideos,
      pendingScriptVideos,
      totalViews,
      slaComplianceRate,
      totalAdvancePaid,
      totalFinalPaid,
      totalPitTaxWithheld,
      totalPlanBudget,
      totalSpentBudget,
      totalRemainingBudget,
      overallBurnRate,
      overallPacingIndex
    };
  }, [filteredDeals, storePortfolios, expectedPacingPct, selectedBrand]);

  // =========================================================================
  // 1. DATA: TIẾN ĐỘ NHÂN VIÊN & SQUAD PICS
  // =========================================================================
  const staffScorecards: StaffPerformanceItem[] = useMemo(() => {
    const list: StaffPerformanceItem[] = [
      {
        id: 'st-vn',
        name: 'Vân Ngọc',
        role: 'BOOKING',
        roleTitle: 'Booking Operations Lead',
        team: 'Booking Squad 1',
        avatar: 'VN',
        assignedStoresCount: 62,
        assignedBrandsCount: 42,
        targetVideos: 380,
        airedVideos: 342,
        inProgressVideos: 52,
        targetGmv: 4200000000,
        currentGmv: 3950000000,
        allocatedBudget: 1200000000,
        spentBudget: 980000000,
        burnRatePct: 81.7,
        slaScore: 94,
        status: 'ON_TRACK',
        workloadWarning: 'Gánh tải 62 gian hàng (vượt định mức 25 gian), cần bổ sung 2 CTV phụ tá outreach.'
      },
      {
        id: 'st-dpa',
        name: 'Đào Phương Anh',
        role: 'ACCOUNT',
        roleTitle: 'Senior Account Manager',
        team: 'Account Management',
        avatar: 'PA',
        assignedStoresCount: 16,
        assignedBrandsCount: 8,
        targetVideos: 160,
        airedVideos: 168,
        inProgressVideos: 14,
        targetGmv: 2100000000,
        currentGmv: 2280000000,
        allocatedBudget: 450000000,
        spentBudget: 410000000,
        burnRatePct: 91.1,
        slaScore: 98,
        status: 'AHEAD_OF_SCHEDULE',
        workloadWarning: 'Hiệu suất vượt 108% KPI, giữ vai trò lead các nhãn dược mỹ phẩm chủ lực.'
      },
      {
        id: 'st-pbt',
        name: 'Phan Bạch Tuyết',
        role: 'ACCOUNT',
        roleTitle: 'Senior Account Manager',
        team: 'Account Management',
        avatar: 'BT',
        assignedStoresCount: 10,
        assignedBrandsCount: 6,
        targetVideos: 120,
        airedVideos: 126,
        inProgressVideos: 16,
        targetGmv: 1600000000,
        currentGmv: 1720000000,
        allocatedBudget: 380000000,
        spentBudget: 355000000,
        burnRatePct: 93.4,
        slaScore: 97,
        status: 'AHEAD_OF_SCHEDULE'
      },
      {
        id: 'st-ptn',
        name: 'Phạm Thị Nhài',
        role: 'ACCOUNT',
        roleTitle: 'Senior Account Manager',
        team: 'Account Management',
        avatar: 'TN',
        assignedStoresCount: 13,
        assignedBrandsCount: 11,
        targetVideos: 150,
        airedVideos: 156,
        inProgressVideos: 18,
        targetGmv: 1950000000,
        currentGmv: 2050000000,
        allocatedBudget: 420000000,
        spentBudget: 390000000,
        burnRatePct: 92.8,
        slaScore: 97,
        status: 'AHEAD_OF_SCHEDULE'
      },
      {
        id: 'st-nxq',
        name: 'Ngô Xuân Quý',
        role: 'GROWTH',
        roleTitle: 'Senior Growth & Media Lead',
        team: 'Growth Operations',
        avatar: 'XQ',
        assignedStoresCount: 18,
        assignedBrandsCount: 12,
        targetVideos: 220,
        airedVideos: 195,
        inProgressVideos: 35,
        targetGmv: 2800000000,
        currentGmv: 2650000000,
        allocatedBudget: 750000000,
        spentBudget: 680000000,
        burnRatePct: 90.7,
        slaScore: 96,
        status: 'ON_TRACK',
        workloadWarning: 'Tập trung tối ưu chi phí Ads GMV Max cho các gian Shopee Mall & TikTok Shop.'
      },
      {
        id: 'st-lpt',
        name: 'Lê Phương Thảo',
        role: 'CONTENT',
        roleTitle: 'Content Creative Lead',
        team: 'Content Studio',
        avatar: 'PT',
        assignedStoresCount: 14,
        assignedBrandsCount: 4,
        targetVideos: 140,
        airedVideos: 128,
        inProgressVideos: 26,
        targetGmv: 1800000000,
        currentGmv: 1650000000,
        allocatedBudget: 380000000,
        spentBudget: 320000000,
        burnRatePct: 84.2,
        slaScore: 92,
        status: 'ON_TRACK'
      },
      {
        id: 'st-kv',
        name: 'Khánh Vy',
        role: 'BOOKING',
        roleTitle: 'Senior Booking Specialist',
        team: 'Booking Squad 1',
        avatar: 'KV',
        assignedStoresCount: 8,
        assignedBrandsCount: 5,
        targetVideos: 95,
        airedVideos: 102,
        inProgressVideos: 12,
        targetGmv: 1350000000,
        currentGmv: 1480000000,
        allocatedBudget: 310000000,
        spentBudget: 295000000,
        burnRatePct: 95.2,
        slaScore: 99,
        status: 'AHEAD_OF_SCHEDULE'
      },
      {
        id: 'st-tmd',
        name: 'Trần Minh Đức',
        role: 'BOOKING',
        roleTitle: 'Junior Booking Specialist',
        team: 'Booking Squad 1',
        avatar: 'MĐ',
        assignedStoresCount: 7,
        assignedBrandsCount: 4,
        targetVideos: 80,
        airedVideos: 68,
        inProgressVideos: 15,
        targetGmv: 950000000,
        currentGmv: 830000000,
        allocatedBudget: 220000000,
        spentBudget: 180000000,
        burnRatePct: 81.8,
        slaScore: 94,
        status: 'ON_TRACK'
      },
      {
        id: 'st-ckd',
        name: 'Chu Khánh Duy',
        role: 'MEDIA',
        roleTitle: 'Media & Livestream Lead',
        team: 'Media Production',
        avatar: 'KD',
        assignedStoresCount: 11,
        assignedBrandsCount: 9,
        targetVideos: 110,
        airedVideos: 92,
        inProgressVideos: 22,
        targetGmv: 1100000000,
        currentGmv: 950000000,
        allocatedBudget: 250000000,
        spentBudget: 195000000,
        burnRatePct: 78.0,
        slaScore: 91,
        status: 'ON_TRACK'
      },
      {
        id: 'st-dkl',
        name: 'Đoàn Khánh Linh',
        role: 'MEDIA',
        roleTitle: 'Livestream Specialist',
        team: 'Media Production',
        avatar: 'KL',
        assignedStoresCount: 11,
        assignedBrandsCount: 9,
        targetVideos: 110,
        airedVideos: 90,
        inProgressVideos: 24,
        targetGmv: 1050000000,
        currentGmv: 910000000,
        allocatedBudget: 240000000,
        spentBudget: 185000000,
        burnRatePct: 77.1,
        slaScore: 90,
        status: 'ON_TRACK'
      },
      {
        id: 'st-dmhl',
        name: 'Đặng Mai Hà Linh',
        role: 'BOOKING',
        roleTitle: 'Junior Booking Specialist',
        team: 'Booking Squad 2',
        avatar: 'HL',
        assignedStoresCount: 8,
        assignedBrandsCount: 4,
        targetVideos: 85,
        airedVideos: 62,
        inProgressVideos: 28,
        targetGmv: 880000000,
        currentGmv: 670000000,
        allocatedBudget: 200000000,
        spentBudget: 145000000,
        burnRatePct: 72.5,
        slaScore: 86,
        status: 'AT_RISK',
        workloadWarning: 'Tỷ lệ video on air đạt 72.9%, cần hỗ trợ chốt deal creator gấp trong đợt Mega 10.10.'
      },
      {
        id: 'st-nnh',
        name: 'Nguyễn Ngọc Huyền',
        role: 'BOOKING',
        roleTitle: 'Junior Booking Specialist',
        team: 'Booking Squad 2',
        avatar: 'NH',
        assignedStoresCount: 6,
        assignedBrandsCount: 3,
        targetVideos: 70,
        airedVideos: 48,
        inProgressVideos: 24,
        targetGmv: 750000000,
        currentGmv: 540000000,
        allocatedBudget: 180000000,
        spentBudget: 120000000,
        burnRatePct: 66.7,
        slaScore: 88,
        status: 'AT_RISK',
        workloadWarning: 'Thiếu hụt mẫu gửi KOC cho nhóm store mẹ bé, tiến độ chậm 2 tuần so với target.'
      }
    ];

    return list.filter(item => {
      const matchTeam = selectedStaffTeam === 'ALL' || item.role === selectedStaffTeam;
      const matchStatus = selectedStaffStatus === 'ALL' || item.status === selectedStaffStatus;
      const matchSearch = !searchQuery || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.roleTitle.toLowerCase().includes(searchQuery.toLowerCase());
      return matchTeam && matchStatus && matchSearch;
    });
  }, [selectedStaffTeam, selectedStaffStatus, searchQuery]);

  // =========================================================================
  // 2. DATA: TIẾN ĐỘ AIR VIDEO & KÊNH NỘI DUNG
  // =========================================================================
  const airedVideosList: VideoAiredItem[] = useMemo(() => {
    return [
      {
        id: 'vid-1',
        title: 'Review Combo Sữa Rửa Mặt Cica pH 5.5 Face Republic',
        creatorName: 'Kim Chung Phan',
        creatorTier: 'Macro',
        brandName: 'Face Republic',
        storeName: 'Face Republic Official Shop',
        platform: 'TikTok Shop',
        videoUrl: 'https://www.tiktok.com/@kimchungphan/video/739182910291',
        sparkAdsCode: 'SPARK-FR-83912',
        airDate: '05/10/2026',
        views: 2450000,
        gmv: 166050000,
        cvr: 4.8,
        commission: 24900000,
        status: 'RUNNING_ADS'
      },
      {
        id: 'vid-2',
        title: 'Test Khả Năng Kiềm Dầu & Kháng Nước Kem Chống Nắng',
        creatorName: 'Sandy',
        creatorTier: 'Micro',
        brandName: 'Face Republic',
        storeName: 'Face Republic Official Shop',
        platform: 'TikTok Shop',
        videoUrl: 'https://www.tiktok.com/@sandy_beauty/video/739182910292',
        sparkAdsCode: 'SPARK-FR-83913',
        airDate: '06/10/2026',
        views: 890000,
        gmv: 54880000,
        cvr: 3.9,
        commission: 8232000,
        status: 'RUNNING_ADS'
      },
      {
        id: 'vid-3',
        title: 'Mẹ Bỉm Trị Hăm Tã Khẩn Cấp Cho Bé 3 Tháng Tuổi',
        creatorName: 'Heda',
        creatorTier: 'Micro',
        brandName: 'Kutieskin',
        storeName: 'Kutieskin Official Store',
        platform: 'TikTok Shop',
        videoUrl: 'https://www.tiktok.com/@heda_mama/video/739182910293',
        sparkAdsCode: 'SPARK-KUTI-19284',
        airDate: '04/10/2026',
        views: 620000,
        gmv: 43610000,
        cvr: 3.5,
        commission: 6540000,
        status: 'AIRED_VERIFIED'
      },
      {
        id: 'vid-4',
        title: 'Thử Thách Makeup Căng Bóng Hàn Quốc Với Phấn Nước Clio',
        creatorName: 'Ngọc Matcha',
        creatorTier: 'Key',
        brandName: 'Clio',
        storeName: 'Clio Vietnam Official TikTok Shop',
        platform: 'TikTok Shop',
        videoUrl: 'https://www.tiktok.com/@ngocmatcha/video/739182910294',
        sparkAdsCode: 'SPARK-CLIO-99214',
        airDate: '03/10/2026',
        views: 1820000,
        gmv: 146000000,
        cvr: 4.2,
        commission: 29200000,
        status: 'RUNNING_ADS'
      },
      {
        id: 'vid-5',
        title: 'Swatch Full Bảng Màu Son Kem Lì Chiffon Blur Tint',
        creatorName: 'bui_imeo',
        creatorTier: 'Micro',
        brandName: 'Clio',
        storeName: 'Clio Vietnam Official TikTok Shop',
        platform: 'TikTok Shop',
        videoUrl: 'https://www.tiktok.com/@bui_imeo/video/739182910295',
        sparkAdsCode: 'SPARK-CLIO-99215',
        airDate: '07/10/2026',
        views: 940000,
        gmv: 61800000,
        cvr: 3.6,
        commission: 11124000,
        status: 'AIRED_VERIFIED'
      },
      {
        id: 'vid-6',
        title: 'Bí Quyết Kẻ Mắt Siêu Mảnh Không Trôi Suốt 24 Giờ',
        creatorName: 'Lương Thục Hiền',
        creatorTier: 'Macro',
        brandName: 'Clio',
        storeName: 'Clio Vietnam Official TikTok Shop',
        platform: 'TikTok Shop',
        videoUrl: 'https://www.tiktok.com/@thuchien_makeup/video/739182910296',
        sparkAdsCode: 'SPARK-CLIO-99216',
        airDate: '02/10/2026',
        views: 1150000,
        gmv: 89460000,
        cvr: 3.8,
        commission: 16100000,
        status: 'RUNNING_ADS'
      },
      {
        id: 'vid-7',
        title: 'Nước Uống Collagen 82x Sakura Có Thực Sự Chống Lão Hóa?',
        creatorName: 'Hoàng Kim Chi',
        creatorTier: 'Key',
        brandName: '82x',
        storeName: '82x_TikTok_SoCom',
        platform: 'TikTok Shop',
        videoUrl: 'https://www.tiktok.com/@hoangkimchi/video/739182910297',
        sparkAdsCode: 'SPARK-82X-00192',
        airDate: '06/10/2026',
        views: 1350000,
        gmv: 112000000,
        cvr: 3.2,
        commission: 16800000,
        status: 'AIRED_VERIFIED'
      },
      {
        id: 'vid-8',
        title: 'Dưỡng Ẩm Chống Nẻ Mùa Thu Đông Dành Cho Trẻ Sơ Sinh',
        creatorName: 'Mẹ Bơ Review',
        creatorTier: 'Nano',
        brandName: 'Kutieskin',
        storeName: 'Shopee Mall Kutieskin Chính Hãng',
        platform: 'Shopee Video',
        videoUrl: 'https://shopee.vn/universal-link/feed/video/8391829',
        airDate: '07/10/2026',
        views: 310000,
        gmv: 28400000,
        cvr: 4.1,
        commission: 3976000,
        status: 'AIRED_VERIFIED'
      },
      {
        id: 'vid-9',
        title: 'Bộ Đôi Trị Mụn & Mờ Thâm Derma Forte Chính Hãng',
        creatorName: 'Cô Học Chăm Da',
        creatorTier: 'Key',
        brandName: 'Derma Forte',
        storeName: 'Derma Forte Vietnam Mall',
        platform: 'TikTok Shop',
        videoUrl: 'https://www.tiktok.com/@co_hoc_cham_da/video/739182910299',
        airDate: '08/10/2026',
        views: 950000,
        gmv: 83200000,
        cvr: 3.7,
        commission: 12480000,
        status: 'PENDING_APPROVAL'
      }
    ].filter(v => {
      const matchBrand = selectedBrand === 'ALL' || v.brandName === selectedBrand;
      const matchStatus = selectedVideoStatus === 'ALL' || v.status === selectedVideoStatus;
      const matchSearch = !searchQuery ||
        v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.creatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.brandName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchBrand && matchStatus && matchSearch;
    });
  }, [selectedBrand, selectedVideoStatus, searchQuery]);

  // =========================================================================
  // 3. DATA: CHI TIÊU NGÂN SÁCH & BURN RATE PACING
  // =========================================================================
  const brandPacingList: BrandBudgetPacingItem[] = useMemo(() => {
    const list: BrandBudgetPacingItem[] = [
      {
        brandId: 'brand-82x',
        brandName: '82x Collagen',
        storeCount: 2,
        leadPic: 'Phan Bạch Tuyết',
        planBudget: 340000000,
        spentBudget: 98000000,
        remainingBudget: 242000000,
        burnRatePct: 28.8,
        expectedBurnPct: expectedPacingPct,
        pacingStatus: 'ON_TRACK',
        targetGmv: 1440000000,
        currentGmv: 420000000,
        roas: 4.29,
        actionNote: 'Pacing 28.8% bám sát chu kỳ ngày 8, chuẩn bị tăng tốc ngân sách Ads ngày Mega 10.10.'
      },
      {
        brandId: 'brand-aqua',
        brandName: 'AQUA VIETNAM',
        storeCount: 2,
        leadPic: 'Nguyễn Thị Bảo Ngân',
        planBudget: 315000000,
        spentBudget: 84000000,
        remainingBudget: 231000000,
        burnRatePct: 26.7,
        expectedBurnPct: expectedPacingPct,
        pacingStatus: 'ON_TRACK',
        targetGmv: 965000000,
        currentGmv: 285000000,
        roas: 3.39,
        actionNote: 'Pacing chuẩn 26.7%, kiểm soát chặt tỷ lệ cast video review gia dụng.'
      },
      {
        brandId: 'brand-kutieskin',
        brandName: 'Kutieskin Mama & Baby',
        storeCount: 3,
        leadPic: 'Khánh Vy',
        planBudget: 420000000,
        spentBudget: 135000000,
        remainingBudget: 285000000,
        burnRatePct: 32.1,
        expectedBurnPct: expectedPacingPct,
        pacingStatus: 'OVER_PACING',
        targetGmv: 1250000000,
        currentGmv: 480000000,
        roas: 3.56,
        actionNote: 'Đốt ngân sách nhanh 32.1% do mở rộng booking 15 KOC mẹ bé sớm, ROAS tốt đạt 3.56x.'
      },
      {
        brandId: 'brand-facerepublic',
        brandName: 'Face Republic Korea',
        storeCount: 3,
        leadPic: 'Đặng Mai Hà Linh',
        planBudget: 380000000,
        spentBudget: 115000000,
        remainingBudget: 265000000,
        burnRatePct: 30.3,
        expectedBurnPct: expectedPacingPct,
        pacingStatus: 'ON_TRACK',
        targetGmv: 1450000000,
        currentGmv: 520000000,
        roas: 4.52,
        actionNote: 'Đạt hiệu quả cao nhờ Spark Ads video Kim Chung Phan, tiếp tục duy trì ngân sách đẩy mạnh.'
      },
      {
        brandId: 'brand-clio',
        brandName: 'Clio Cosmetics',
        storeCount: 2,
        leadPic: 'Phạm Thị Thu Hằng',
        planBudget: 550000000,
        spentBudget: 175000000,
        remainingBudget: 375000000,
        burnRatePct: 31.8,
        expectedBurnPct: expectedPacingPct,
        pacingStatus: 'ON_TRACK',
        targetGmv: 1850000000,
        currentGmv: 680000000,
        roas: 3.89,
        actionNote: 'Ngân sách lớn tập trung cho dòng phấn nước Kill Cover mới ra mắt.'
      },
      {
        brandId: 'brand-dermaforte',
        brandName: 'Derma Forte Vietnam',
        storeCount: 2,
        leadPic: 'Đào Phương Anh',
        planBudget: 250000000,
        spentBudget: 48000000,
        remainingBudget: 202000000,
        burnRatePct: 19.2,
        expectedBurnPct: expectedPacingPct,
        pacingStatus: 'UNDER_PACING',
        targetGmv: 850000000,
        currentGmv: 180000000,
        roas: 3.75,
        actionNote: 'Giải ngân chậm 19.2% (dưới chuẩn 26%), cần duyệt nhanh hợp đồng đợt 2 để kịp tiến độ.'
      },
      {
        brandId: 'brand-senka',
        brandName: 'Senka Shiseido',
        storeCount: 2,
        leadPic: 'Phạm Thị Hồng Yến',
        planBudget: 320000000,
        spentBudget: 90000000,
        remainingBudget: 230000000,
        burnRatePct: 28.1,
        expectedBurnPct: expectedPacingPct,
        pacingStatus: 'ON_TRACK',
        targetGmv: 1100000000,
        currentGmv: 340000000,
        roas: 3.78,
        actionNote: 'Bám sát kế hoạch, chuẩn bị phiên Livestream Brand Day ngày 12/10.'
      }
    ];

    return list.filter(item => {
      const matchBrand = selectedBrand === 'ALL' || item.brandName.toLowerCase().includes(selectedBrand.toLowerCase());
      const matchPacing = selectedPacingFilter === 'ALL' || item.pacingStatus === selectedPacingFilter;
      const matchSearch = !searchQuery || 
        item.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.leadPic.toLowerCase().includes(searchQuery.toLowerCase());
      return matchBrand && matchPacing && matchSearch;
    });
  }, [selectedBrand, selectedPacingFilter, searchQuery, expectedPacingPct]);

  // Brand-level performance scorecard (Overview)
  const brandScorecard = useMemo(() => {
    return [
      { brandName: 'Kutieskin Mama & Baby', dealsCount: 14, cost: 42000000, gmv: 265000000, roas: 6.31, onAirCount: 12 },
      { brandName: 'Face Republic Korea', dealsCount: 28, cost: 68500000, gmv: 420000000, roas: 6.13, onAirCount: 26 },
      { brandName: 'Clio Cosmetics Vietnam', dealsCount: 18, cost: 54000000, gmv: 348000000, roas: 6.44, onAirCount: 16 },
      { brandName: '82x Collagen Sakura', dealsCount: 12, cost: 36000000, gmv: 215000000, roas: 5.97, onAirCount: 10 },
      { brandName: 'AQUA VIETNAM Official', dealsCount: 10, cost: 30000000, gmv: 180000000, roas: 6.00, onAirCount: 9 },
      { brandName: 'Derma Forte Vietnam', dealsCount: 11, cost: 28000000, gmv: 195000000, roas: 6.96, onAirCount: 11 },
      { brandName: 'Senka Shiseido Cleanse', dealsCount: 16, cost: 45000000, gmv: 310000000, roas: 6.89, onAirCount: 15 }
    ];
  }, []);

  // Export Executive Excel Report with Multiple Detailed Sheets
  const handleExportExcel = async (reportType: string) => {
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Upbase Executive BI';
      workbook.created = new Date();

      // ================= SHEET 1: TỔNG QUAN KPI =================
      const wsOverview = workbook.addWorksheet('1. Tong Quan KPI', { views: [{ showGridLines: true }] });
      wsOverview.mergeCells('B2:H2');
      const titleCell = wsOverview.getCell('B2');
      titleCell.value = `UPBASE B2C - ${reportType.toUpperCase()}`;
      titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: '0F172A' } };
      wsOverview.getRow(2).height = 25;

      wsOverview.mergeCells('B3:H3');
      const subCell = wsOverview.getCell('B3');
      subCell.value = `Kỳ: ${selectedPeriod} | Xuất ngày: ${new Date().toLocaleDateString('vi-VN')} | Người xuất: ${currentUser.name} (${currentUser.role})`;
      subCell.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: '64748B' } };

      const kpiRows = [
        ['Tổng Doanh Thu GMV Toàn Sàn', `${stats.totalGmv.toLocaleString('vi-VN')} đ`],
        ['Tổng Chi Phí Đã Giải Ngân', `${stats.totalSpentBudget.toLocaleString('vi-VN')} đ`],
        ['Tỷ Suất Sinh Lời ROAS Toàn Kênh', `${stats.overallRoas}x`],
        ['Sản Lượng Video Đã On Air', `${stats.totalOnAirVideos} video`],
        ['Chỉ Số Pacing Ngân Sách Ngày 8/31', `${stats.overallBurnRate}% (Pacing: ${stats.overallPacingIndex}x)`],
        ['Tỷ Lệ Tuân Thủ SLA Bàn Giao', `${stats.slaComplianceRate}%`]
      ];

      kpiRows.forEach((row, i) => {
        const r = wsOverview.getRow(5 + i);
        r.getCell(2).value = row[0];
        r.getCell(3).value = row[1];
        r.getCell(2).font = { name: 'Segoe UI', size: 9 };
        r.getCell(3).font = { name: 'Segoe UI', size: 9, bold: true };
      });

      // ================= SHEET 2: TIẾN ĐỘ NHÂN VIÊN =================
      const wsStaff = workbook.addWorksheet('2. Tien Do Nhan Vien', { views: [{ showGridLines: true }] });
      wsStaff.mergeCells('B2:I2');
      wsStaff.getCell('B2').value = 'BÁO CÁO TIẾN ĐỘ VÀ NĂNG SUẤT NHÂN SỰ (SQUAD PICS)';
      wsStaff.getCell('B2').font = { name: 'Segoe UI', size: 12, bold: true };

      const staffHeaders = ['Họ Tên', 'Chức Danh', 'Team', 'Số Shop', 'Video Đã Air/Target', 'GMV Đạt/Target', 'Ngân Sách Đã Chi', 'SLA', 'Đánh Giá'];
      const staffHeaderRow = wsStaff.getRow(4);
      staffHeaders.forEach((h, idx) => {
        const c = staffHeaderRow.getCell(idx + 2);
        c.value = h;
        c.font = { name: 'Segoe UI', size: 9, bold: true };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E0E7FF' } };
      });

      staffScorecards.forEach((s, idx) => {
        const r = wsStaff.getRow(5 + idx);
        r.getCell(2).value = s.name;
        r.getCell(3).value = s.roleTitle;
        r.getCell(4).value = s.team;
        r.getCell(5).value = s.assignedStoresCount;
        r.getCell(6).value = `${s.airedVideos}/${s.targetVideos} (${Math.round((s.airedVideos / s.targetVideos) * 100)}%)`;
        r.getCell(7).value = `${formatVndShort(s.currentGmv)} / ${formatVndShort(s.targetGmv)}`;
        r.getCell(8).value = `${formatVndShort(s.spentBudget)} (${s.burnRatePct}%)`;
        r.getCell(9).value = `${s.slaScore}%`;
        r.getCell(10).value = s.status === 'AHEAD_OF_SCHEDULE' ? 'Vượt Tiến Độ' : s.status === 'ON_TRACK' ? 'Đúng Kế Hoạch' : 'Rủi Ro Chậm';
      });

      // ================= SHEET 3: AIR VIDEO PIPELINE =================
      const wsVideos = workbook.addWorksheet('3. Air Video Tracking', { views: [{ showGridLines: true }] });
      wsVideos.mergeCells('B2:I2');
      wsVideos.getCell('B2').value = 'DANH SÁCH CHI TIẾT VIDEO ON-AIR & HIỆU SUẤT CONVERSION';
      wsVideos.getCell('B2').font = { name: 'Segoe UI', size: 12, bold: true };

      const videoHeaders = ['Tiêu Đề Video', 'Creator', 'Nhãn Hàng', 'Sàn', 'Ngày Air', 'Lượt Xem (Views)', 'GMV Sinh Ra', 'Mã Spark Ads', 'Trạng Thái'];
      const videoHeaderRow = wsVideos.getRow(4);
      videoHeaders.forEach((h, idx) => {
        const c = videoHeaderRow.getCell(idx + 2);
        c.value = h;
        c.font = { name: 'Segoe UI', size: 9, bold: true };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DCFCE7' } };
      });

      airedVideosList.forEach((v, idx) => {
        const r = wsVideos.getRow(5 + idx);
        r.getCell(2).value = v.title;
        r.getCell(3).value = v.creatorName;
        r.getCell(4).value = v.brandName;
        r.getCell(5).value = v.platform;
        r.getCell(6).value = v.airDate;
        r.getCell(7).value = v.views.toLocaleString('vi-VN');
        r.getCell(8).value = `${v.gmv.toLocaleString('vi-VN')} đ`;
        r.getCell(9).value = v.sparkAdsCode || 'N/A';
        r.getCell(10).value = v.status;
      });

      // ================= SHEET 4: CHI TIÊU NGÂN SÁCH =================
      const wsPacing = workbook.addWorksheet('4. Ngan Sach Pacing', { views: [{ showGridLines: true }] });
      wsPacing.mergeCells('B2:I2');
      wsPacing.getCell('B2').value = 'BÁO CÁO GIẢI NGÂN NGÂN SÁCH & BURN RATE PACING THEO BRAND';
      wsPacing.getCell('B2').font = { name: 'Segoe UI', size: 12, bold: true };

      const pacingHeaders = ['Nhãn Hàng', 'PIC Lead', 'Kế Hoạch Ngân Sách', 'Đã Giải Ngân', 'Còn Lại', 'Tỷ Lệ Burn %', 'Pacing Status', 'Doanh Thu GMV', 'ROAS'];
      const pacingHeaderRow = wsPacing.getRow(4);
      pacingHeaders.forEach((h, idx) => {
        const c = pacingHeaderRow.getCell(idx + 2);
        c.value = h;
        c.font = { name: 'Segoe UI', size: 9, bold: true };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } };
      });

      brandPacingList.forEach((p, idx) => {
        const r = wsPacing.getRow(5 + idx);
        r.getCell(2).value = p.brandName;
        r.getCell(3).value = p.leadPic;
        r.getCell(4).value = `${p.planBudget.toLocaleString('vi-VN')} đ`;
        r.getCell(5).value = `${p.spentBudget.toLocaleString('vi-VN')} đ`;
        r.getCell(6).value = `${p.remainingBudget.toLocaleString('vi-VN')} đ`;
        r.getCell(7).value = `${p.burnRatePct}%`;
        r.getCell(8).value = p.pacingStatus === 'ON_TRACK' ? 'Đúng Tiến Độ' : p.pacingStatus === 'OVER_PACING' ? 'Đốt Nhanh' : 'Giải Ngân Chậm';
        r.getCell(9).value = `${p.currentGmv.toLocaleString('vi-VN')} đ`;
        r.getCell(10).value = `${p.roas}x`;
      });

      // Save & trigger download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Upbase_B2C_${reportType.replace(/\s+/g, '_')}_${selectedPeriod}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      notify(`Đã xuất thành công file Excel đa sheet: ${reportType}!`);
    } catch (err) {
      console.error(err);
      notify('Lỗi khi xuất file Excel', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* HEADER & PERIOD FILTER BAR                                                */}
      {/* THANH ĐIỀU KHIỂN & BỘ LỌC BÁO CÁO TINH GỌN */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-800">Tiến độ tháng:</span>
            <span className="text-xs text-slate-500 font-mono">
              Ngày {currentDayInMonth}/{totalDaysInMonth} (Pacing chuẩn: {expectedPacingPct}%)
            </span>
          </div>

          {/* Bộ chọn kỳ & bộ lọc */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedPeriod}
                onChange={e => setSelectedPeriod(e.target.value)}
                className="bg-transparent font-medium text-slate-800 focus:outline-none pr-1 cursor-pointer"
              >
                <option value="2026-10">Tháng 10/2026 (Ngày 8/31)</option>
                <option value="2026-09">Tháng 09/2026 (Đã chốt)</option>
                <option value="2026-Q4">Quý 4/2026 (Mega)</option>
              </select>
            </div>

            <select
              value={selectedBrand}
              onChange={e => setSelectedBrand(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả Nhãn Hàng ({brands.length || 7})</option>
              {brands.map(b => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
            </select>

            <select
              value={selectedChannel}
              onChange={e => setSelectedChannel(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả Sàn</option>
              <option value="TIKTOK">TikTok Shop</option>
              <option value="SHOPEE">Shopee Mall</option>
              <option value="LAZADA">Lazada</option>
            </select>

            <button
              type="button"
              disabled={isExporting}
              onClick={() => handleExportExcel('Bao_Cao_Tong_Hop_Executive_Full')}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-rose-300" />
              <span>{isExporting ? 'Đang xuất...' : 'Xuất Excel'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TOP TIER KPI METRIC CARDS                                                 */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: GMV */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs relative overflow-hidden">
          <div className="text-3xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Doanh Thu GMV</span>
            <span className="text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded font-bold">+18.4%</span>
          </div>
          <div className="text-lg font-extrabold font-mono text-emerald-600 mt-1">
            {formatVndShort(stats.totalGmv)}
          </div>
          <div className="text-3xs text-slate-500 mt-1 flex items-center justify-between">
            <span>Mục tiêu: 4.5 Tỷ</span>
            <span className="font-semibold text-emerald-700">85.6%</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: '85.6%' }} />
          </div>
        </div>

        {/* Card 2: Chi phí & Pacing */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs relative overflow-hidden">
          <div className="text-3xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Ngân Sách Đã Chi</span>
            <span className="text-indigo-600 bg-indigo-50 px-1 py-0.2 rounded font-bold">{stats.overallBurnRate}% Burn</span>
          </div>
          <div className="text-lg font-extrabold font-mono text-slate-900 mt-1">
            {formatVndShort(stats.totalSpentBudget)}
          </div>
          <div className="text-3xs text-slate-500 mt-1 flex items-center justify-between">
            <span>Còn lại: {formatVndShort(stats.totalRemainingBudget)}</span>
            <span className="font-semibold text-indigo-700">Pacing: {stats.overallPacingIndex}x</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
            <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${stats.overallBurnRate}%` }} />
          </div>
        </div>

        {/* Card 3: ROAS */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs relative overflow-hidden">
          <div className="text-3xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>ROAS Toàn Kênh</span>
            <span className="text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded font-bold">Vượt KPI</span>
          </div>
          <div className="text-lg font-extrabold font-mono text-indigo-600 mt-1">
            {stats.overallRoas}x
          </div>
          <div className="text-3xs text-slate-500 mt-1 truncate">
            Net Margin: <strong className="text-slate-800 font-mono">+{formatVndShort(stats.netProfitContribution)}</strong>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
            <div className="bg-indigo-600 h-full rounded-full" style={{ width: '100%' }} />
          </div>
        </div>

        {/* Card 4: Video On-Air */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs relative overflow-hidden">
          <div className="text-3xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Video Đã On Air</span>
            <span className="text-emerald-600 text-3xs font-semibold">87.2% KPI</span>
          </div>
          <div className="text-lg font-extrabold font-mono text-slate-900 mt-1">
            {stats.totalOnAirVideos} <span className="text-xs font-normal text-slate-500">video</span>
          </div>
          <div className="text-3xs text-slate-500 mt-1 flex items-center justify-between">
            <span>Quay: {stats.inProductionVideos}</span>
            <span>Kịch bản: {stats.pendingScriptVideos}</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
            <div className="bg-emerald-600 h-full rounded-full" style={{ width: '87.2%' }} />
          </div>
        </div>

        {/* Card 5: Lượt Views */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs relative overflow-hidden">
          <div className="text-3xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Tổng Lượt Views</span>
            <span className="text-purple-600 text-3xs font-semibold">Traffic Hot</span>
          </div>
          <div className="text-lg font-extrabold font-mono text-purple-700 mt-1">
            {(stats.totalViews / 1000000).toFixed(1)}M <span className="text-xs font-normal text-slate-500">views</span>
          </div>
          <div className="text-3xs text-slate-500 mt-1">
            Tỷ lệ CVR giỏ hàng: <strong className="text-slate-800">3.8%</strong>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
            <div className="bg-purple-600 h-full rounded-full" style={{ width: '92%' }} />
          </div>
        </div>

        {/* Card 6: Tuân Thủ SLA */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs relative overflow-hidden">
          <div className="text-3xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>SLA Bàn Giao</span>
            <span className="text-blue-600 text-3xs font-semibold">Chuẩn 8 bước</span>
          </div>
          <div className="text-lg font-extrabold font-mono text-blue-600 mt-1">
            {stats.slaComplianceRate}%
          </div>
          <div className="text-3xs text-slate-500 mt-1 flex items-center justify-between">
            <span>Duyệt kịch bản: 92%</span>
            <span>Air video: 4.1d</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
            <div className="bg-blue-600 h-full rounded-full" style={{ width: `${stats.slaComplianceRate}%` }} />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* NAVIGATION TABS EXPANDED TO 7 DETAILED AREAS                              */}
      {/* ========================================================================= */}
      <div className="border-b border-slate-200 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 -mb-px overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('OVERVIEW')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
              activeSubTab === 'OVERVIEW'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/30'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <span>1. Dashboard Tổng Quan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('STAFF_PROGRESS')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
              activeSubTab === 'STAFF_PROGRESS'
                ? 'border-blue-600 text-blue-700 bg-blue-50/30'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4 text-blue-600" />
            <span>2. Tiến Độ Nhân Viên & Squad ({staffScorecards.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('VIDEO_AIRING')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
              activeSubTab === 'VIDEO_AIRING'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/30'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Film className="w-4 h-4 text-emerald-600" />
            <span>3. Tiến Độ Air Video & Pipeline</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('BUDGET_PACING')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
              activeSubTab === 'BUDGET_PACING'
                ? 'border-amber-600 text-amber-700 bg-amber-50/30'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-600" />
            <span>4. Chi Tiêu Ngân Sách & Burn Rate</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('CREATORS')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
              activeSubTab === 'CREATORS'
                ? 'border-slate-900 text-slate-900 bg-slate-50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Award className="w-4 h-4 text-amber-500" />
            <span>5. Xếp Hạng KOC ROI</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('FINANCE_TAX')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
              activeSubTab === 'FINANCE_TAX'
                ? 'border-slate-900 text-slate-900 bg-slate-50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>6. Thuế & Đối Soát</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('REPORT_CENTER')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
              activeSubTab === 'REPORT_CENTER'
                ? 'border-slate-900 text-slate-900 bg-slate-50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-rose-500" />
            <span>7. Xuất Báo Cáo (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: DASHBOARD ĐIỀU HÀNH ĐA CHIỀU (OVERVIEW)                        */}
      {/* ========================================================================= */}
      {activeSubTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Quick Deep-Dive Shortcut Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              onClick={() => setActiveSubTab('STAFF_PROGRESS')}
              className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 cursor-pointer hover:shadow-sm transition flex items-center justify-between"
            >
              <div>
                <span className="text-2xs font-bold text-blue-700 uppercase tracking-wide">Tiến Độ Nhân Viên</span>
                <h4 className="text-sm font-bold text-slate-900 mt-0.5">85% Nhân sự đạt và vượt KPI</h4>
                <p className="text-2xs text-slate-600 mt-1">Cảnh báo: 2 nhân sự cần phân bổ bớt gian hàng</p>
              </div>
              <ChevronRight className="w-5 h-5 text-blue-600 shrink-0" />
            </div>

            <div 
              onClick={() => setActiveSubTab('VIDEO_AIRING')}
              className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 cursor-pointer hover:shadow-sm transition flex items-center justify-between"
            >
              <div>
                <span className="text-2xs font-bold text-emerald-700 uppercase tracking-wide">Tiến Độ Air Video</span>
                <h4 className="text-sm font-bold text-slate-900 mt-0.5">1,025 / 1,250 Videos Đã On-Air</h4>
                <p className="text-2xs text-slate-600 mt-1">285 video đang quay dựng chuẩn bị cho Mega 10.10</p>
              </div>
              <ChevronRight className="w-5 h-5 text-emerald-600 shrink-0" />
            </div>

            <div 
              onClick={() => setActiveSubTab('BUDGET_PACING')}
              className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 cursor-pointer hover:shadow-sm transition flex items-center justify-between"
            >
              <div>
                <span className="text-2xs font-bold text-amber-700 uppercase tracking-wide">Burn Rate Pacing (Ngày 8/31)</span>
                <h4 className="text-sm font-bold text-slate-900 mt-0.5">Đã giải ngân 28.4% (Pacing 1.10x)</h4>
                <p className="text-2xs text-slate-600 mt-1">Đúng tiến độ an toàn, sẵn sàng dồn ngân sách Mega</p>
              </div>
              <ChevronRight className="w-5 h-5 text-amber-600 shrink-0" />
            </div>
          </div>

          {/* Row 1: Weekly Growth & Revenue Channels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Weekly GMV Trend Visualizer */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Tiến Độ Tăng Trưởng GMV Theo Tuần
                  </h3>
                  <p className="text-xs text-slate-500">So sánh GMV thực đạt và Chi phí đầu tư qua 4 tuần của Tháng 10/2026</p>
                </div>
                <span className="text-2xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                  Tăng trưởng liên tục
                </span>
              </div>

              {/* Simulated Chart Bars */}
              <div className="grid grid-cols-4 gap-3 pt-3">
                {[
                  { week: 'Tuần 40 (01-07/10)', ratioGmv: 0.20, ratioSpend: 0.21, pct: 68 },
                  { week: 'Tuần 41 (08-14/10)', ratioGmv: 0.23, ratioSpend: 0.23, pct: 75 },
                  { week: 'Tuần 42 (15-21/10)', ratioGmv: 0.27, ratioSpend: 0.27, pct: 88 },
                  { week: 'Tuần 43 (22-28/10)', ratioGmv: 0.30, ratioSpend: 0.29, pct: 100 }
                ].map((item, idx) => {
                  const wGmv = Math.round(stats.totalGmv * item.ratioGmv);
                  const wSpend = Math.round(stats.totalSpend * item.ratioSpend);
                  const wRoas = wSpend > 0 ? (wGmv / wSpend).toFixed(1) + 'x' : '0.0x';
                  const wPct = stats.totalGmv > 0 ? item.pct : 0;
                  return (
                    <div key={idx} className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 flex flex-col justify-between space-y-2">
                      <div className="text-2xs font-semibold text-slate-600 truncate">{item.week}</div>
                      <div>
                        <div className="text-base font-extrabold font-mono text-emerald-600">
                          {formatVndShort(wGmv)}
                        </div>
                        <div className="text-3xs text-slate-500 font-mono">
                          Chi phí: {formatVndShort(wSpend)}
                        </div>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${wPct}%` }} />
                      </div>
                      <div className="text-3xs font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded w-fit">
                        ROAS: {wRoas}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Revenue Distribution By Channel */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-indigo-600" />
                  Cơ Cấu Doanh Thu 3 Nguồn Lực
                </h3>
                <p className="text-xs text-slate-500">Tỷ trọng đóng góp GMV toàn hệ thống</p>
              </div>

              <div className="space-y-3.5 pt-1">
                {(() => {
                  const bPct = stats.totalGmv > 0 ? Math.round((stats.bookingGmv / stats.totalGmv) * 100) : 0;
                  const aPct = stats.totalGmv > 0 ? Math.round((stats.adsGmv / stats.totalGmv) * 100) : 0;
                  const cPct = stats.totalGmv > 0 ? Math.max(0, 100 - bPct - aPct) : 0;
                  return (
                    <>
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="flex items-center gap-1.5 text-slate-800">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                            1. KOC Booking Ngoài (Affiliate + Cast)
                          </span>
                          <span className="font-mono text-indigo-600">{bPct}% ({formatVndShort(stats.bookingGmv)})</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${bPct}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="flex items-center gap-1.5 text-slate-800">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                            2. TikTok Seller Ads PGM
                          </span>
                          <span className="font-mono text-rose-600">{aPct}% ({formatVndShort(stats.adsGmv)})</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-rose-500 h-full rounded-full" style={{ width: `${aPct}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="flex items-center gap-1.5 text-slate-800">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            3. Kênh Sở Hữu & CTV Nội Bộ
                          </span>
                          <span className="font-mono text-emerald-600">{cPct}% ({formatVndShort(stats.ctvGmv)})</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${cPct}%` }} />
                        </div>
                      </div>
                    </>
                  );
                })()}

                <div className="pt-2 border-t border-slate-100 text-2xs text-slate-500">
                  Mô hình kiềng 3 chân giúp tối ưu hóa biên độ lợi nhuận và giảm thiểu phụ thuộc vào một nguồn traffic duy nhất.
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Brand Performance Scorecard */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building className="w-4 h-4 text-blue-600" />
                  Ma Trận Hiệu Suất Theo Nhãn Hàng (Brand Scorecard)
                </h3>
                <p className="text-xs text-slate-500">So sánh chi phí đầu tư, doanh thu gộp đem lại và ROAS của từng Brand đang quản lý</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateToTab?.('brand-hub')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>Xem Cổng Brand</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-3xs">
                  <tr>
                    <th className="py-3 px-4">Tên Nhãn Hàng</th>
                    <th className="py-3 px-3 text-center">Số Deal</th>
                    <th className="py-3 px-3 text-right">Chi Phí (Cast + Ads)</th>
                    <th className="py-3 px-3 text-right">Doanh Thu GMV</th>
                    <th className="py-3 px-3 text-center">ROAS Thực Tế</th>
                    <th className="py-3 px-3 text-center">Video On Air</th>
                    <th className="py-3 px-4 text-center">Tình Trạng Nghiệm Thu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {brandScorecard.map((b, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-xs flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                        <span>{b.brandName}</span>
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono text-slate-700">
                        {b.dealsCount}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-semibold text-slate-800">
                        {b.cost.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-600">
                        {b.gmv.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                          b.roas >= 6.0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {b.roas}x
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono text-slate-700">
                        {b.onAirCount} video
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-3xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Đã nghiệm thu 100%
                        </span>
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
      {/* SUB-TAB 2: TIẾN ĐỘ NHÂN VIÊN & SQUAD PICS (NEW DEEP DIVE)                  */}
      {/* ========================================================================= */}
      {activeSubTab === 'STAFF_PROGRESS' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="text-2xs font-semibold text-slate-500 uppercase">Tổng Nhân Sự Quản Lý</div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1 flex items-baseline gap-2">
                <span>{staffScorecards.length} Chuyên viên</span>
                <span className="text-2xs text-blue-600 font-semibold">(110 PICs toàn sàn)</span>
              </div>
              <div className="text-3xs text-slate-500 mt-1">Bao gồm Account, Growth, Content, Booking & Media</div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="text-2xs font-semibold text-slate-500 uppercase">Tỷ Lệ Đạt KPI Video</div>
              <div className="text-xl font-bold font-mono text-emerald-600 mt-1">91.4%</div>
              <div className="text-3xs text-slate-500 mt-1">10/12 Chuyên viên hoàn thành trên 85% target</div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="text-2xs font-semibold text-slate-500 uppercase">Tỷ Lệ Đạt Doanh Số GMV</div>
              <div className="text-xl font-bold font-mono text-indigo-600 mt-1">88.6%</div>
              <div className="text-3xs text-slate-500 mt-1">Tổng GMV đóng góp: {formatVndShort(stats.totalGmv)}</div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="text-2xs font-semibold text-slate-500 uppercase">Cảnh Báo Quá Tải & Rủi Ro</div>
              <div className="text-xl font-bold font-mono text-amber-600 mt-1">2 Nhân Sự</div>
              <div className="text-3xs text-slate-500 mt-1">Vân Ngọc (62 shops), Hà Linh (chậm KPI KOC)</div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm nhân sự, chức danh..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <select
                value={selectedStaffTeam}
                onChange={e => setSelectedStaffTeam(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
              >
                <option value="ALL">Tất cả Team / Chức vụ</option>
                <option value="ACCOUNT">Account Management</option>
                <option value="GROWTH">Growth Operations</option>
                <option value="CONTENT">Content Studio</option>
                <option value="BOOKING">Booking Squad</option>
                <option value="MEDIA">Media & Live</option>
              </select>

              <select
                value={selectedStaffStatus}
                onChange={e => setSelectedStaffStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="AHEAD_OF_SCHEDULE">Vượt tiến độ</option>
                <option value="ON_TRACK">Đúng kế hoạch</option>
                <option value="AT_RISK">Rủi ro chậm</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => handleExportExcel('Bao_Cao_Tien_Do_Nhan_Vien_Squad')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Báo Cáo Nhân Sự (.xlsx)</span>
            </button>
          </div>

          {/* Detailed Staff Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-3xs">
                  <tr>
                    <th className="py-3 px-4">Nhân Sự & Squad</th>
                    <th className="py-3 px-3 text-center">Shop / Brand</th>
                    <th className="py-3 px-3 text-center">Tiến Độ Air Video</th>
                    <th className="py-3 px-3 text-right">Doanh Số GMV Thực Đạt</th>
                    <th className="py-3 px-3 text-right">Ngân Sách Đã Chi</th>
                    <th className="py-3 px-3 text-center">SLA Đúng Hạn</th>
                    <th className="py-3 px-3 text-center">Trạng Thái KPI</th>
                    <th className="py-3 px-4">Cảnh Báo & Ghi Chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffScorecards.map(s => {
                    const videoPct = Math.round((s.airedVideos / s.targetVideos) * 100);
                    const gmvPct = Math.round((s.currentGmv / s.targetGmv) * 100);

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                              {s.avatar}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                {s.name}
                                <span className="text-3xs font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                  {s.role}
                                </span>
                              </div>
                              <div className="text-2xs text-slate-500">{s.roleTitle} • {s.team}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          <div className="font-bold text-slate-900">{s.assignedStoresCount} shops</div>
                          <div className="text-3xs text-slate-500">{s.assignedBrandsCount} brands</div>
                        </td>

                        <td className="py-3.5 px-3 text-center min-w-[130px]">
                          <div className="flex items-center justify-between text-2xs mb-0.5">
                            <span className="font-bold text-slate-900">{s.airedVideos} / {s.targetVideos}</span>
                            <span className={`font-semibold ${videoPct >= 100 ? 'text-emerald-700' : 'text-slate-600'}`}>
                              {videoPct}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${videoPct >= 100 ? 'bg-emerald-500' : videoPct >= 80 ? 'bg-blue-500' : 'bg-amber-500'}`}
                              style={{ width: `${Math.min(100, videoPct)}%` }}
                            />
                          </div>
                          <div className="text-3xs text-slate-400 mt-0.5">+{s.inProgressVideos} đang quay/dựng</div>
                        </td>

                        <td className="py-3.5 px-3 text-right">
                          <div className="font-bold font-mono text-emerald-600">{formatVndShort(s.currentGmv)}</div>
                          <div className="text-3xs text-slate-500 font-mono">KPI: {formatVndShort(s.targetGmv)} ({gmvPct}%)</div>
                        </td>

                        <td className="py-3.5 px-3 text-right">
                          <div className="font-bold font-mono text-slate-800">{formatVndShort(s.spentBudget)}</div>
                          <div className="text-3xs text-slate-500 font-mono">Burn: {s.burnRatePct}%</div>
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                            s.slaScore >= 95 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700'
                          }`}>
                            {s.slaScore}%
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          {s.status === 'AHEAD_OF_SCHEDULE' && (
                            <span className="px-2 py-0.5 rounded-full text-3xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Vượt tiến độ
                            </span>
                          )}
                          {s.status === 'ON_TRACK' && (
                            <span className="px-2 py-0.5 rounded-full text-3xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              Đúng kế hoạch
                            </span>
                          )}
                          {s.status === 'AT_RISK' && (
                            <span className="px-2 py-0.5 rounded-full text-3xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Cần đẩy nhanh
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {s.workloadWarning ? (
                            <div className="p-1.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-3xs leading-relaxed flex items-start gap-1">
                              <AlertCircle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                              <span>{s.workloadWarning}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-3xs italic">Tiến độ ổn định, bám sát timeline</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: TIẾN ĐỘ AIR VIDEO & KÊNH NỘI DUNG (NEW DEEP DIVE)               */}
      {/* ========================================================================= */}
      {activeSubTab === 'VIDEO_AIRING' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Top Video Pipeline Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="text-2xs font-semibold text-slate-500 uppercase">Video Đã Lên Sóng</div>
              <div className="text-2xl font-extrabold font-mono text-emerald-600 mt-1">1,025</div>
              <div className="text-3xs text-emerald-700 mt-1 flex items-center justify-between">
                <span>KPI: 1,250</span>
                <span className="font-bold">82.0%</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="text-2xs font-semibold text-slate-500 uppercase">Đang Quay & Dựng</div>
              <div className="text-2xl font-extrabold font-mono text-blue-600 mt-1">285</div>
              <div className="text-3xs text-blue-700 mt-1">Chuẩn bị air đợt Mega 10.10</div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="text-2xs font-semibold text-slate-500 uppercase">Chờ Duyệt Kịch Bản</div>
              <div className="text-2xl font-extrabold font-mono text-amber-600 mt-1">94</div>
              <div className="text-3xs text-amber-700 mt-1">Thời gian duyệt trung bình 4.2h</div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="text-2xs font-semibold text-slate-500 uppercase">Tổng Lượt Views</div>
              <div className="text-2xl font-extrabold font-mono text-purple-700 mt-1">48.6M</div>
              <div className="text-3xs text-purple-700 mt-1">Trung bình 47.4k views/video</div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="text-2xs font-semibold text-slate-500 uppercase">GMV Giỏ Hàng Video</div>
              <div className="text-2xl font-extrabold font-mono text-slate-900 mt-1">3.85 Tỷ</div>
              <div className="text-3xs text-slate-600 mt-1">Tỷ lệ CVR chuyển đổi: 3.8%</div>
            </div>
          </div>

          {/* Weekly Airing Velocity Tracker */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  Tiến Độ & Tốc Độ On-Air Video Theo Tuần (Weekly Velocity)
                </h3>
                <p className="text-xs text-slate-500">Kế hoạch sản xuất và phát hành video liên tục để giữ nhiệt traffic sàn</p>
              </div>
              <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Nhịp phát hành: ~35-45 video / ngày
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
              {[
                { week: 'Tuần 1 (01-07/10)', aired: 265, target: 280, pct: 94.6, views: '12.8M', gmv: '1.15 Tỷ', status: 'Hoàn tất' },
                { week: 'Tuần 2 (08-14/10)', aired: 298, target: 320, pct: 93.1, views: '15.2M', gmv: '1.38 Tỷ', status: 'Đang triển khai' },
                { week: 'Tuần 3 (15-21/10)', aired: 242, target: 350, pct: 69.1, views: '9.6M', gmv: '820 Triệu', status: 'Đang dựng' },
                { week: 'Tuần 4 (22-28/10)', aired: 220, target: 450, pct: 48.9, views: '11.0M', gmv: '950 Triệu', status: 'Dự kiến Mega Sale' }
              ].map((w, idx) => (
                <div key={idx} className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{w.week}</span>
                    <span className="text-3xs font-semibold px-1.5 py-0.2 rounded bg-white text-slate-700 border border-slate-200">{w.status}</span>
                  </div>
                  <div>
                    <div className="text-lg font-bold font-mono text-emerald-600">
                      {w.aired} / {w.target} <span className="text-xs font-normal text-slate-500">videos</span>
                    </div>
                    <div className="text-3xs text-slate-500">Đạt {w.pct}% chỉ tiêu tuần</div>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, w.pct)}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-3xs text-slate-500 pt-1 border-t border-slate-200/60 font-mono">
                    <span>Views: {w.views}</span>
                    <span className="font-semibold text-slate-800">GMV: {w.gmv}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Aired Videos Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Film className="w-4 h-4 text-purple-600" />
                  Danh Sách Video Đã Lên Sóng & Chỉ Số Hiệu Quả
                </h3>
                <p className="text-xs text-slate-500">Theo dõi link video, mã Spark Ads, views và doanh thu trực tiếp từ giỏ hàng sàn</p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedVideoStatus}
                  onChange={e => setSelectedVideoStatus(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium"
                >
                  <option value="ALL">Tất cả trạng thái video</option>
                  <option value="AIRED_VERIFIED">Đã lên sóng</option>
                  <option value="RUNNING_ADS">Đang chạy Ads Spark</option>
                  <option value="PENDING_APPROVAL">Chờ duyệt kịch bản</option>
                </select>

                <button
                  type="button"
                  onClick={() => handleExportExcel('Bao_Cao_Air_Video_Chi_Tiet')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Xuất Video (.xlsx)</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-3xs">
                  <tr>
                    <th className="py-3 px-4">Tiêu Đề Video / Kịch Bản</th>
                    <th className="py-3 px-3">KOC Creator</th>
                    <th className="py-3 px-3">Thương Hiệu & Shop</th>
                    <th className="py-3 px-3 text-center">Kênh / Sàn</th>
                    <th className="py-3 px-3 text-center">Ngày Air</th>
                    <th className="py-3 px-3 text-right">Lượt Xem (Views)</th>
                    <th className="py-3 px-3 text-right">GMV Giỏ Hàng</th>
                    <th className="py-3 px-3 text-center">Mã Spark Ads</th>
                    <th className="py-3 px-4 text-center">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {airedVideosList.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 max-w-[240px]">
                        <div className="font-bold text-slate-900 text-xs truncate flex items-center gap-1.5">
                          <PlaySquare className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="truncate">{v.title}</span>
                        </div>
                        <a
                          href={v.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-3xs text-blue-600 hover:underline flex items-center gap-0.5 mt-0.5"
                        >
                          <span>Xem video trên sàn</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900">{v.creatorName}</div>
                        <span className="text-3xs px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                          {v.creatorTier} Tier
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-900">{v.brandName}</div>
                        <div className="text-3xs text-slate-500 truncate">{v.storeName}</div>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-3xs font-semibold bg-slate-100 text-slate-700">
                          {v.platform}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center font-mono text-slate-600">
                        {v.airDate}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-bold text-purple-700">
                        {v.views.toLocaleString('vi-VN')}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-600">
                        {v.gmv.toLocaleString('vi-VN')} đ
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        {v.sparkAdsCode ? (
                          <span className="font-mono text-3xs bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-200">
                            {v.sparkAdsCode}
                          </span>
                        ) : (
                          <span className="text-3xs text-slate-400">Chưa gắn</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {v.status === 'RUNNING_ADS' && (
                          <span className="px-2 py-0.5 rounded-full text-3xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center gap-1">
                            <Flame className="w-3 h-3 text-rose-600" /> Đang Chạy Ads
                          </span>
                        )}
                        {v.status === 'AIRED_VERIFIED' && (
                          <span className="px-2 py-0.5 rounded-full text-3xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Đã Nghiệm Thu
                          </span>
                        )}
                        {v.status === 'PENDING_APPROVAL' && (
                          <span className="px-2 py-0.5 rounded-full text-3xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Chờ Duyệt
                          </span>
                        )}
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
      {/* SUB-TAB 4: CHI TIÊU NGÂN SÁCH & BURN RATE PACING (NEW DEEP DIVE)           */}
      {/* ========================================================================= */}
      {activeSubTab === 'BUDGET_PACING' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Pacing Overview Banner */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-3xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    CHU KỲ THÁNG 10/2026: NGÀY {currentDayInMonth}/{totalDaysInMonth} (25.8% THỜI GIAN)
                  </span>
                  <span className="text-xs text-slate-300">Pacing Index: <strong>{stats.overallPacingIndex}x (An toàn)</strong></span>
                </div>
                <h2 className="text-lg font-bold mt-1.5">
                  Quản Trị Tốc Độ Đốt Ngân Sách (Burn Rate Pacing) & Hiệu Quả Đầu Tư
                </h2>
                <p className="text-xs text-slate-300 max-w-2xl mt-0.5">
                  Giám sát chặt chẽ ngân sách kế hoạch, thực tế giải ngân và doanh thu đem lại theo từng ngày để đảm bảo không bị vượt ngân sách hoặc bị nghẽn giải ngân trước đợt Mega Sale.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="text-3xs text-slate-400">Tổng Ngân Sách Tháng</div>
                  <div className="text-xl font-bold font-mono text-emerald-400">{formatVndShort(stats.totalPlanBudget)}</div>
                </div>
                <div className="h-8 w-px bg-slate-700" />
                <div>
                  <div className="text-3xs text-slate-400">Đã Chi Tiêu ({stats.overallBurnRate}%)</div>
                  <div className="text-xl font-bold font-mono text-white">{formatVndShort(stats.totalSpentBudget)}</div>
                </div>
              </div>
            </div>

            {/* Pacing Visualizer Bar */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <div className="flex justify-between text-2xs text-slate-300">
                <span>Tiến độ thời gian: <strong>{expectedPacingPct}%</strong> (Ngày 8/31)</span>
                <span>Tiến độ đốt ngân sách: <strong>{stats.overallBurnRate}%</strong> (Tốc độ tiêu: 1.10x Chuẩn)</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
                <div className="bg-indigo-500 h-full transition-all" style={{ width: `${stats.overallBurnRate}%` }} />
              </div>
            </div>
          </div>

          {/* Cost Structure Breakdown (5 Khoản Mục Chi Phí) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-indigo-600" />
              Cơ Cấu 5 Khoản Mục Chi Phí Đã Giải Ngân ({formatVndShort(stats.totalSpentBudget)})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-1">
              {[
                { name: '1. Cast Booking KOC', pct: 46, amount: '1.75 Tỷ', color: 'bg-indigo-600', desc: 'Thỏa thuận net theo deal' },
                { name: '2. TikTok Seller Ads', pct: 28, amount: '1.07 Tỷ', color: 'bg-rose-500', desc: 'GMV Max & Spark Ads PGM' },
                { name: '3. CTV & Ekip Live', pct: 14, amount: '535 Triệu', color: 'bg-emerald-600', desc: 'Phí kịch bản & phòng live' },
                { name: '4. Mẫu Thử & Logistics', pct: 7, amount: '267 Triệu', color: 'bg-amber-500', desc: 'Gửi hàng nhận mẫu KOC' },
                { name: '5. Thuế 10% & Dự Phòng', pct: 5, amount: '191 Triệu', color: 'bg-slate-700', desc: 'Trích giữ thuế TNCN NSNN' },
              ].map((c, idx) => (
                <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                  <div className="text-2xs font-semibold text-slate-700 truncate">{c.name}</div>
                  <div className="text-base font-extrabold font-mono text-slate-900">{c.amount}</div>
                  <div className="flex items-center justify-between text-3xs text-slate-500">
                    <span>{c.pct}% ngân sách</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                    <div className={`${c.color} h-full`} style={{ width: `${c.pct}%` }} />
                  </div>
                  <div className="text-3xs text-slate-400 truncate pt-0.5">{c.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Brand & Store Pacing Matrix Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-500" />
                  Ma Trận Pacing Ngân Sách Theo Thương Hiệu & Gian Hàng
                </h3>
                <p className="text-xs text-slate-500">Đối chiếu tỷ lệ giải ngân so với tiến độ ngày trong tháng (Chuẩn ngày 8/31: ~26%)</p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedPacingFilter}
                  onChange={e => setSelectedPacingFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium"
                >
                  <option value="ALL">Tất cả tình trạng Pacing</option>
                  <option value="ON_TRACK">Đúng tiến độ an toàn</option>
                  <option value="OVER_PACING">Đốt nhanh (&gt;30%)</option>
                  <option value="UNDER_PACING">Giải ngân chậm (&lt;20%)</option>
                </select>

                <button
                  type="button"
                  onClick={() => handleExportExcel('Bao_Cao_Ngan_Sach_Burn_Rate_Pacing')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Xuất Pacing (.xlsx)</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-3xs">
                  <tr>
                    <th className="py-3 px-4">Thương Hiệu / Brand</th>
                    <th className="py-3 px-3">PIC Lead Shop</th>
                    <th className="py-3 px-3 text-right">Kế Hoạch Ngân Sách</th>
                    <th className="py-3 px-3 text-right">Đã Giải Ngân</th>
                    <th className="py-3 px-3 text-right">Ngân Sách Còn Lại</th>
                    <th className="py-3 px-3 text-center">Tốc Độ Đốt (% Burn)</th>
                    <th className="py-3 px-3 text-center">Tình Trạng Pacing</th>
                    <th className="py-3 px-3 text-right">Doanh Thu GMV</th>
                    <th className="py-3 px-3 text-center">ROAS</th>
                    <th className="py-3 px-4">Khuyến Nghị Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {brandPacingList.map(p => (
                    <tr key={p.brandId} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {p.brandName}
                        <div className="text-3xs text-slate-500 font-normal">{p.storeCount} gian hàng live</div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-semibold text-slate-800">{p.leadPic}</span>
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-semibold text-slate-700">
                        {p.planBudget.toLocaleString('vi-VN')} đ
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">
                        {p.spentBudget.toLocaleString('vi-VN')} đ
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono text-emerald-600">
                        {p.remainingBudget.toLocaleString('vi-VN')} đ
                      </td>

                      <td className="py-3.5 px-3 text-center min-w-[100px]">
                        <span className="font-bold font-mono text-slate-900">{p.burnRatePct}%</span>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                          <div 
                            className={`h-full rounded-full ${
                              p.burnRatePct > 30 ? 'bg-amber-500' : p.burnRatePct < 20 ? 'bg-blue-400' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${p.burnRatePct}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        {p.pacingStatus === 'ON_TRACK' && (
                          <span className="px-2 py-0.5 rounded-full text-3xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Đúng Tiến Độ
                          </span>
                        )}
                        {p.pacingStatus === 'OVER_PACING' && (
                          <span className="px-2 py-0.5 rounded-full text-3xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Đốt Nhanh
                          </span>
                        )}
                        {p.pacingStatus === 'UNDER_PACING' && (
                          <span className="px-2 py-0.5 rounded-full text-3xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Chậm Giải Ngân
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-600">
                        {p.currentGmv.toLocaleString('vi-VN')} đ
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {p.roas}x
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-3xs text-slate-600 max-w-[200px]">
                        {p.actionNote}
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
      {/* SUB-TAB 5: BÁO CÁO KOC & CREATOR ROI RANKING                              */}
      {/* ========================================================================= */}
      {activeSubTab === 'CREATORS' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                Bảng Xếp Hạng KOC Winner & Creator ROI
              </h3>
              <p className="text-xs text-slate-500">Phân tích hiệu quả từng KOC: Giá cast thỏa thuận vs GMV thật từ Affiliate và Ads PGM</p>
            </div>
            <button
              type="button"
              onClick={() => handleExportExcel('Bao_Cao_KOC_Winner_ROI')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Xuất Báo Cáo KOC (.xlsx)</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-3xs">
                  <tr>
                    <th className="py-3 px-4">Tên KOC / Kênh Creator</th>
                    <th className="py-3 px-3">Phân Nhóm / Tệp</th>
                    <th className="py-3 px-3 text-right">Chi Phí Cast Net</th>
                    <th className="py-3 px-3 text-right">Doanh Thu GMV</th>
                    <th className="py-3 px-3 text-center">ROAS Thực Tế</th>
                    <th className="py-3 px-3 text-center">Hook 2 Giây</th>
                    <th className="py-3 px-3 text-center">Mã Spark Ads</th>
                    <th className="py-3 px-4 text-center">Phân Loại Winner</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { name: 'Kim Chung Phan', tier: 'Macro', niche: 'Review Nữ', cost: 15000000, gmv: 166050000, roas: 11.07, hook2s: '36.8%', ads: 'Đang chạy', winner: 'Top 1 Winner' },
                    { name: 'Sandy', tier: 'Micro', niche: 'Chăm sóc da', cost: 8000000, gmv: 54880000, roas: 6.86, hook2s: '32.1%', ads: 'Đang chạy', winner: 'Top 2 Winner' },
                    { name: 'Heda', tier: 'Micro', niche: 'Lifestyle', cost: 7000000, gmv: 43610000, roas: 6.23, hook2s: '29.5%', ads: 'Đang chạy', winner: 'Winner Đạt KPI' },
                    { name: 'Ngọc Matcha', tier: 'Key', niche: 'Beauty & Vlog', cost: 25000000, gmv: 146000000, roas: 5.84, hook2s: '34.2%', ads: 'Đang chạy', winner: 'Winner Đạt KPI' },
                    { name: 'bui_imeo', tier: 'Micro', niche: 'Makeup Hàn', cost: 12000000, gmv: 61800000, roas: 5.15, hook2s: '31.0%', ads: 'Đang chạy', winner: 'Winner Đạt KPI' },
                    { name: 'Lương Thục Hiền', tier: 'Macro', niche: 'Chuyên gia Kẻ mắt', cost: 18000000, gmv: 89460000, roas: 4.97, hook2s: '28.3%', ads: 'Đang chạy', winner: 'Winner Đạt KPI' },
                    { name: 'Cô Học Chăm Da', tier: 'Key', niche: 'Skincare Khoa học', cost: 20000000, gmv: 83200000, roas: 4.16, hook2s: '27.4%', ads: 'Cần cấp lại mã', winner: 'Tiềm Năng' },
                  ].map((k, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-bold text-slate-900 text-xs">
                        {k.name}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        <span className="px-2 py-0.5 rounded text-3xs font-medium bg-slate-100 text-slate-700">
                          {k.tier} - {k.niche}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        {k.cost.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                        {k.gmv.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                          k.roas >= 6.0
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {k.roas}x
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-indigo-600 font-semibold">
                        {k.hook2s}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-3xs font-semibold ${
                          k.ads === 'Đang chạy' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {k.ads}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-3xs font-bold ${
                          k.roas >= 6.0 
                            ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {k.winner}
                        </span>
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
      {/* SUB-TAB 6: TÀI CHÍNH, DÒNG TIỀN & THUẾ TNCN                               */}
      {/* ========================================================================= */}
      {activeSubTab === 'FINANCE_TAX' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">Tạm Ứng Đã Chi (Advance)</div>
              <div className="text-xl font-extrabold font-mono text-slate-900 mt-1">
                {formatVndShort(stats.totalAdvancePaid)}
              </div>
              <div className="text-3xs text-slate-500 mt-1">
                Định mức 2.000.000đ/deal sau khi ký HĐ & CCCD hợp lệ
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">Quyết Toán Đã Chi (Final Paid)</div>
              <div className="text-xl font-extrabold font-mono text-emerald-600 mt-1">
                {formatVndShort(stats.totalFinalPaid)}
              </div>
              <div className="text-3xs text-emerald-700 mt-1">
                Chi trả sau khi video on air và nghiệm thu mã Spark Ads
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">Thuế TNCN 10% Khấu Trừ</div>
              <div className="text-xl font-extrabold font-mono text-rose-600 mt-1">
                {formatVndShort(stats.totalPitTaxWithheld)}
              </div>
              <div className="text-3xs text-slate-500 mt-1">
                Khấu trừ nộp Ngân sách Nhà nước theo mẫu TT80/2021/TT-BTC
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Nguyên Tắc Pháp Chế & Dòng Tiền Đang Áp Dụng
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-slate-800 block">Quy định Hợp đồng trên 9.000.000 VNĐ:</span>
                <p>Bắt buộc có file scan hợp đồng có chữ ký tươi/chữ ký số và ảnh CCCD 2 mặt rõ nét trước ngày làm Đề nghị thanh toán (DNTT) ít nhất 2 ngày.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-slate-800 block">Khấu trừ Thuế TNCN 10% vãng lai:</span>
                <p>Mọi hợp đồng dịch vụ cá nhân từ 2.000.000 VNĐ trở lên bắt buộc khấu trừ 10% tại nguồn và xuất chứng từ khấu trừ thuế điện tử cho KOC.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 7: TRUNG TÂM XUẤT BÁO CÁO (REPORT CENTER)                         */}
      {/* ========================================================================= */}
      {activeSubTab === 'REPORT_CENTER' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-rose-600" />
              Trung Tâm Tạo & Xuất Báo Cáo Định Kỳ Chuẩn Enterprise
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Chọn mẫu báo cáo phù hợp để hệ thống tự động bóc tách dữ liệu và xuất file Excel (.xlsx) chuẩn hóa để gửi Nhãn hàng hoặc lưu trữ nội bộ.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Staff Progress Report */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-2xs font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                    Báo Cáo Nhân Sự & Squad
                  </span>
                  <span className="text-2xs text-slate-400">Định dạng .XLSX</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">Báo Cáo Tiến Độ Nhân Viên & Quản Lý Gian Hàng</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Bóc tách KPI từng nhân viên: Số gian hàng phụ trách, tiến độ air video, doanh thu GMV thực đạt, ngân sách quản lý và cảnh báo quá tải công việc.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleExportExcel('Bao_Cao_Tien_Do_Nhan_Vien_Squad')}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải Báo Cáo Nhân Sự (.xlsx)</span>
              </button>
            </div>

            {/* Card 2: Air Video Tracking Report */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-2xs font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Kênh Nội Dung & Sàn
                  </span>
                  <span className="text-2xs text-slate-400">Định dạng .XLSX</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">Báo Cáo Tiến Độ Air Video & Conversion Sàn</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Bảng kê chi tiết toàn bộ video on-air theo tuần, link TikTok/Shopee, lượt xem, GMV tạo ra từ giỏ hàng video, mã Spark Ads và trạng thái nghiệm thu.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleExportExcel('Bao_Cao_Air_Video_Chi_Tiet')}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải Báo Cáo Air Video (.xlsx)</span>
              </button>
            </div>

            {/* Card 3: Budget Pacing & Burn Rate */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-2xs font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                    Tài Chính & Kế Hoạch
                  </span>
                  <span className="text-2xs text-slate-400">Định dạng .XLSX</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">Báo Cáo Giải Ngân Ngân Sách & Burn Rate Pacing</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Đối chiếu tốc độ tiêu tiền theo chu kỳ ngày trong tháng cho từng Thương hiệu và Gian hàng sàn, phân bổ 5 khoản mục chi phí và cảnh báo over-pacing.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleExportExcel('Bao_Cao_Ngan_Sach_Burn_Rate_Pacing')}
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải Báo Cáo Ngân Sách (.xlsx)</span>
              </button>
            </div>

            {/* Card 4: Executive Full Multi-sheet */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-2xs font-bold uppercase bg-slate-900 text-white">
                    Gói Báo Cáo Ban Giám Đốc
                  </span>
                  <span className="text-2xs text-slate-400">File Đa Sheet (.XLSX)</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">Báo Cáo Tổng Hợp Điều Hành B2C (Full Sheets)</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  File Excel đồng bộ hợp nhất cả 5 bảng biểu: Tổng quan KPI, Tiến độ nhân viên Squad, Danh sách video on air, Burn rate ngân sách và Xếp hạng KOC.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleExportExcel('Bao_Cao_Tong_Hop_Executive_Full')}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải Báo Cáo Full Sheets (.xlsx)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
