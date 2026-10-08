'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, XCircle, Info, X } from 'lucide-react';
import { Sidebar, TabKey } from '../components/Sidebar';
import { TopHeader } from '../components/TopHeader';
import { QuickBookModal } from '../components/QuickBookModal';
import { ImportExcelModal } from '../components/ImportExcelModal';
import { ContractModal } from '../components/ContractModal';

import { CockpitView } from '../components/views/CockpitView';
import { OverviewView } from '../components/views/OverviewView';
import { StoresView } from '../components/views/StoresView';
import { BrandView } from '../components/views/BrandView';
import { BrandKnowledgeView } from '../components/views/BrandKnowledgeView';
import { ContentView } from '../components/views/ContentView';
import { BookingView } from '../components/views/BookingView';
import { KocMasterDataView } from '../components/views/KocMasterDataView';
import { ContractView } from '../components/views/ContractView';
import { ManagerView } from '../components/views/ManagerView';
import { LeaderboardView } from '../components/views/LeaderboardView';
import { BrandHubView } from '../components/views/BrandHubView';
import { InputPlanBreakdownView } from '../components/views/InputPlanBreakdownView';
import SampleTrackerView from '../components/views/SampleTrackerView';
import PerformanceP3View from '../components/views/PerformanceP3View';
import { PushProductsView } from '../components/views/PushProductsView';
import { MasterDataHubView } from '../components/views/MasterDataHubView';
import { SelfChannelCtvHubView } from '../components/views/SelfChannelCtvHubView';
import { KocKolHubView } from '../components/views/KocKolHubView';
import { WeeklyAdsReportHubView } from '../components/views/WeeklyAdsReportHubView';
import { ExecutiveDashboardReportsView } from '../components/views/ExecutiveDashboardReportsView';

import { 
  USERS, 
  INITIAL_DEALS, 
  INITIAL_TASKS, 
  INITIAL_KOCS, 
  INITIAL_DETAILED_STAFF_PLANS, 
  INITIAL_STAFF_ALLOCATIONS_26,
  INITIAL_BRANDS,
  INITIAL_STORE_PORTFOLIOS
} from '../lib/mockData';
import { 
  UserProfile, 
  BookingDealItem, 
  SlaTask, 
  KocItem, 
  CampaignItem, 
  StaffDetailedPlanItem, 
  MonthlyStaffAllocation,
  StaffPlanStatus,
  ContentPillarType,
  BrandDetail,
  StorePortfolioItem
} from '../lib/types';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile>(USERS[0]); // Default Vân Ngọc (Trưởng phòng)
  const [activeTab, setActiveTab] = useState<TabKey>('manager');

  // Load Lark Auth session on mount
  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setCurrentUser(data.user);
          }
        }
      } catch (err) {
        console.warn('Could not fetch user session:', err);
      }
    }
    loadUser();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.href = '/login';
    }
  };

  const [kocs, setKocs] = useState<KocItem[]>(INITIAL_KOCS);
  const [deals, setDeals] = useState<BookingDealItem[]>(INITIAL_DEALS);
  const [tasks, setTasks] = useState<SlaTask[]>(INITIAL_TASKS);
  const [brands, setBrands] = useState<BrandDetail[]>(INITIAL_BRANDS);
  const [storePortfolios, setStorePortfolios] = useState<StorePortfolioItem[]>(INITIAL_STORE_PORTFOLIOS);

  // Shared Plan State between Manager & Employees
  const [detailedPlans, setDetailedPlans] = useState<StaffDetailedPlanItem[]>(INITIAL_DETAILED_STAFF_PLANS);
  const [staffAllocations, setStaffAllocations] = useState<Record<string, MonthlyStaffAllocation[]>>({
    '2026/08': INITIAL_STAFF_ALLOCATIONS_26,
    '2026/09': INITIAL_STAFF_ALLOCATIONS_26,
    '2026/10': INITIAL_STAFF_ALLOCATIONS_26
  });

  // Modals
  const [isQuickBookOpen, setIsQuickBookOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedDealForContract, setSelectedDealForContract] = useState<BookingDealItem | null>(null);
  const [preselectedKoc, setPreselectedKoc] = useState<KocItem | null>(null);
  const [preselectedBrand, setPreselectedBrand] = useState<string | null>(null);

  // Mobile Drawer State
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Notifications Toast (Enhanced with Type & Dismiss)
  const [toastData, setToastData] = useState<{ message: string; type: 'success' | 'warning' | 'info' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'warning' | 'info' | 'error' = 'success') => {
    setToastData({ message: msg, type });
    setTimeout(() => {
      setToastData(null);
    }, 4500);
  };

  // Plan Handlers
  const handleAddPlanItem = (newItem: StaffDetailedPlanItem) => {
    setDetailedPlans(prev => [newItem, ...prev]);
    showToast(`Đã thêm ${newItem.kocStageName} vào kế hoạch tuần ${newItem.targetWeek}`);
  };

  const handleUpdatePlanItem = (updated: StaffDetailedPlanItem) => {
    setDetailedPlans(prev => prev.map(i => i.id === updated.id ? updated : i));
  };

  const handleDeletePlanItem = (itemId: string) => {
    setDetailedPlans(prev => prev.filter(i => i.id !== itemId));
    showToast('Đã xóa slot khỏi kế hoạch');
  };

  const handleSubmitPlanToLead = (staffName: string) => {
    setDetailedPlans(prev => prev.map(i => i.staffName === staffName && i.status === 'DRAFT' ? {
      ...i,
      status: 'SUBMITTED',
      leadNotes: 'Đã gửi trình duyệt lên Trưởng phòng'
    } : i));
    showToast(`Đã gửi duyệt kế hoạch của ${staffName}`);
  };

  const handleApproveEntirePlanFromLead = (staffName: string, managerFeedback: string) => {
    setDetailedPlans(prev => prev.map(item => item.staffName === staffName ? {
      ...item,
      status: 'APPROVED',
      leadNotes: managerFeedback || 'Trưởng phòng đã phê duyệt toàn bộ kế hoạch'
    } : item));
    showToast(`Đã duyệt kế hoạch của ${staffName}`);
  };

  const handleRequestPlanRevisionFromLead = (staffName: string, managerFeedback: string) => {
    setDetailedPlans(prev => prev.map(item => item.staffName === staffName && item.status !== 'CONVERTED' ? {
      ...item,
      status: 'REVISION_REQUESTED',
      leadNotes: managerFeedback || 'Trưởng phòng yêu cầu điều chỉnh danh sách KOC'
    } : item));
    showToast(`Đã trả kế hoạch về cho ${staffName} để sửa`, 'warning');
  };

  const handleUpdatePlanItemStatusFromLead = (itemId: string, newStatus: StaffPlanStatus, leadNotes?: string) => {
    setDetailedPlans(prev => prev.map(item => item.id === itemId ? {
      ...item,
      status: newStatus,
      leadNotes: leadNotes || item.leadNotes
    } : item));
  };

  const handleConvertPlanItemToDeal = (item: StaffDetailedPlanItem) => {
    const newDeal: BookingDealItem = {
      id: `deal-${Date.now()}`,
      dealCode: item.dealCode || `BO26_${Date.now().toString().slice(-6)}`,
      kocId: `koc-${item.kocStageName.replace(/\s+/g, '-').toLowerCase()}`,
      kocStageName: item.kocStageName,
      kocChannelId: item.channelId || '@tiktok',
      kocTier: item.tier,
      campaignCode: `CAMP-${item.brandName.toUpperCase().replace(/\s+/g, '')}`,
      campaignTitle: `Chiến Dịch Tháng 9 - ${item.brandName}`,
      brandName: item.brandName,
      productName: `Combo Sản Phẩm Chủ Lực ${item.brandName}`,
      totalValue: item.budgetEstimated || 5000000,
      advanceAmount: Math.round((item.budgetEstimated || 5000000) * 0.2),
      finalAmount: Math.round((item.budgetEstimated || 5000000) * 0.8),
      salaryGrade: item.salaryGrade,
      segment: item.tier === 'TIER_1_CELEB' ? 'Top Creator' : item.tier === 'TIER_2_MACRO' ? 'Key Creator' : item.tier === 'TIER_3_MICRO' ? 'Mid Creator' : 'Massive Creator',
      tepKenh: item.tepKenh || 'Beauty',
      kocCategory: 'Personal care',
      contentPillar: (item.contentPillar as ContentPillarType) || 'Review trực tiếp',
      status: 'CONTRACT_GENERATED',
      statusLabel: 'Đã Ký HĐ (Cần Duyệt Cọc)',
      pipelineText: 'Chờ chi cọc',
      brandApprovalStatus: 'ĐÃ_DUYỆT',
      sampleStatus: 'CHƯA_GỬI',
      adsCodeStatus: 'CHƯA_CẤP',
      gmv30: item.targetGmv,
      affiliateGmv: item.targetGmv,
      roi: item.budgetEstimated > 0 ? Number((item.targetGmv / item.budgetEstimated).toFixed(2)) : 5.0,
      assignedStaff: item.staffName,
      deadlinePost: '2026-10-15',
      viewsCount: 0,
      publishedDays: 0,
      remainingSlaHours: 24,
      isSlaWarning: false
    };

    setDeals(prev => [newDeal, ...prev]);
    // Mark item as CONVERTED in detailedPlans so MyPlan and ManagerView reflect updated status
    setDetailedPlans(prev => prev.map(p => p.id === item.id ? {
      ...p,
      status: 'CONVERTED',
      dealCode: newDeal.dealCode,
      leadNotes: 'Đã kích hoạt chuyển đổi sang Deal Booking chính thức'
    } : p));
    showToast(`Đã tạo deal ${newDeal.dealCode} cho ${item.kocStageName}`);
  };

  const handleBatchConvertPlanToDeals = (staffName: string) => {
    const approvedItems = detailedPlans.filter(p => p.staffName === staffName && p.status === 'APPROVED');
    if (approvedItems.length === 0) {
      showToast(`Kế hoạch của ${staffName} chưa có KOC nào được duyệt. Duyệt ít nhất một KOC rồi thử lại.`, 'warning');
      return;
    }

    const createdDeals: BookingDealItem[] = approvedItems.map((item, idx) => {
      const code = item.dealCode || `BO26_${Date.now().toString().slice(-4)}${idx}`;
      return {
        id: `deal-batch-${Date.now()}-${idx}`,
        dealCode: code,
        kocId: `koc-${item.kocStageName.replace(/\s+/g, '-').toLowerCase()}`,
        kocStageName: item.kocStageName,
        kocChannelId: item.channelId || '@tiktok',
        kocTier: item.tier,
        campaignCode: `CAMP-${item.brandName.toUpperCase().replace(/\s+/g, '')}`,
        campaignTitle: `Chiến Dịch Tháng 9 - ${item.brandName}`,
        brandName: item.brandName,
        productName: `Combo Sản Phẩm Chủ Lực ${item.brandName}`,
        totalValue: item.budgetEstimated || 5000000,
        advanceAmount: Math.round((item.budgetEstimated || 5000000) * 0.2),
        finalAmount: Math.round((item.budgetEstimated || 5000000) * 0.8),
        salaryGrade: item.salaryGrade,
        segment: item.tier === 'TIER_1_CELEB' ? 'Top Creator' : item.tier === 'TIER_2_MACRO' ? 'Key Creator' : item.tier === 'TIER_3_MICRO' ? 'Mid Creator' : 'Massive Creator',
        tepKenh: item.tepKenh || 'Beauty',
        kocCategory: 'Personal care',
        contentPillar: (item.contentPillar as ContentPillarType) || 'Review trực tiếp',
        status: 'CONTRACT_GENERATED',
        statusLabel: 'Đã Ký HĐ (Cần Duyệt Cọc)',
        pipelineText: 'Chờ chi cọc',
        brandApprovalStatus: 'ĐÃ_DUYỆT',
        sampleStatus: 'CHƯA_GỬI',
        adsCodeStatus: 'CHƯA_CẤP',
        gmv30: item.targetGmv,
        affiliateGmv: item.targetGmv,
        roi: item.budgetEstimated > 0 ? Number((item.targetGmv / item.budgetEstimated).toFixed(2)) : 5.0,
        assignedStaff: item.staffName,
        deadlinePost: '2026-10-15',
        viewsCount: 0,
        publishedDays: 0,
        remainingSlaHours: 24,
        isSlaWarning: false
      };
    });

    setDeals(prev => [...createdDeals, ...prev]);

    setDetailedPlans(prev => prev.map(p => {
      const match = approvedItems.find(a => a.id === p.id);
      if (match) {
        const correspondingDeal = createdDeals.find(d => d.kocStageName === match.kocStageName);
        return {
          ...p,
          status: 'CONVERTED',
          dealCode: correspondingDeal ? correspondingDeal.dealCode : p.dealCode,
          leadNotes: 'Trưởng phòng đã chuyển đổi hàng loạt sang Booking Deals'
        };
      }
      return p;
    }));

    showToast(`Đã tạo ${approvedItems.length} deal từ kế hoạch của ${staffName}`);
  };

  const handleGenerateDealsFromGrowthDemand = (demand: any) => {
    const newDealsGenerated: BookingDealItem[] = (demand.breakdown || []).flatMap((tierItem: any, tIdx: number) => {
      return Array.from({ length: Math.min(tierItem.targetCount, 4) }).map((_, i) => ({
        id: `deal-gen-${Date.now()}-${tIdx}-${i}`,
        dealCode: `BO26_${Date.now().toString().slice(-4)}${tIdx}${i}`,
        kocId: `koc-pending-${tIdx}-${i}`,
        kocStageName: `[Slot ${tierItem.tierLabel.split(':')[1]?.trim() || 'KOC'}] #${i + 1}`,
        kocChannelId: '@chua_gan',
        kocTier: tierItem.tier,
        campaignCode: demand.code,
        campaignTitle: demand.title,
        brandName: demand.brandName,
        productName: `Sản Phẩm Chiến Dịch ${demand.brandName}`,
        totalValue: tierItem.estimatedAvgCost,
        advanceAmount: Math.round(tierItem.estimatedAvgCost * 0.2),
        finalAmount: Math.round(tierItem.estimatedAvgCost * 0.8),
        salaryGrade: tierItem.salaryGradeLabel?.split(' ')[0] || 'KL4',
        segment: tierItem.tier === 'TIER_1_CELEB' ? 'Top Creator' : tierItem.tier === 'TIER_2_MACRO' ? 'Key Creator' : tierItem.tier === 'TIER_3_MICRO' ? 'Mid Creator' : 'Massive Creator',
        tepKenh: 'Beauty',
        kocCategory: demand.brandCategory?.split('/')[0]?.trim() || 'Personal care',
        contentPillar: 'Review trực tiếp',
        status: 'BRAND_PENDING' as any,
        statusLabel: 'Chờ Tuyển KOC & Trình Brand',
        pipelineText: 'Sàng lọc',
        brandApprovalStatus: 'CHỜ_DUYỆT',
        sampleStatus: 'CHƯA_GỬI',
        adsCodeStatus: 'CHƯA_CẤP',
        gmv30: tierItem.estimatedGmvPerKoc,
        affiliateGmv: tierItem.estimatedGmvPerKoc,
        roi: tierItem.historicalRoiBenchmark || 4.5,
        assignedStaff: 'Chưa phân bổ',
        deadlinePost: '2026-10-15',
        viewsCount: 0,
        publishedDays: 0,
        remainingSlaHours: 24,
        isSlaWarning: false
      }));
    });

    if (newDealsGenerated.length > 0) {
      setDeals(prev => [...newDealsGenerated, ...prev]);
      showToast(`Đã tạo ${newDealsGenerated.length} deal từ kế hoạch ${demand.code}`);
    }
  };

  const handleDealCreated = (newDeal: BookingDealItem) => {
    setDeals(prev => [newDeal, ...prev]);
    const newTask: SlaTask = {
      id: `task-${Date.now()}`,
      title: `Thẩm định kịch bản KOC ${newDeal.kocStageName} (${newDeal.campaignCode})`,
      type: 'SCRIPT_REVIEW',
      team: 'Content Team',
      pic: 'Quỳnh Như',
      targetRole: 'CONTENT_MEMBER',
      deadline: 'Trong vòng 24h',
      remainingText: 'Còn 24 giờ',
      urgency: 'warning',
      dealCode: newDeal.dealCode
    };
    setTasks(prev => [newTask, ...prev]);
    showToast(`Đã tạo deal ${newDeal.dealCode} cho ${newDeal.kocStageName}. Hạn duyệt kịch bản: 24 giờ.`);
  };

  const handleCompleteTask = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, urgency: 'done', remainingText: 'Đạt SLA 100%' } : t));
    showToast('Đã hoàn thành việc. +5 điểm SLA');
  };

  const handleAddTask = (newTask: SlaTask) => {
    setTasks(prev => [newTask, ...prev]);
    showToast(`Đã giao việc cho ${newTask.pic}`);
  };

  const handleUpdateBrand = (updatedBrand: BrandDetail) => {
    setBrands(prev => prev.map(b => b.id === updatedBrand.id ? updatedBrand : b));
    showToast(`Đã cập nhật phân bổ ${updatedBrand.name}`);
  };

  const handleAddBrand = (newBrand: BrandDetail) => {
    setBrands(prev => [newBrand, ...prev]);
    showToast(`Đã thêm nhãn hàng ${newBrand.name}`);
  };

  const handleUpdateStore = (updatedStore: StorePortfolioItem) => {
    setStorePortfolios(prev => prev.map(s => s.id === updatedStore.id ? updatedStore : s));
    showToast(`Đã giao gian hàng ${updatedStore.storeName} cho ${updatedStore.b2cOwnerName || updatedStore.assignedStaff}`);
  };

  const handleApproveAdvance = (dealId: string) => {
    setDeals(prev => prev.map(d => d.id === dealId ? {
      ...d,
      status: 'ADVANCE_PAID',
      statusLabel: 'Đã Chi Cọc (Được Gửi Mẫu)'
    } : d));
    showToast('Đã duyệt tạm ứng. Có thể gửi hàng mẫu.');
  };

  const handleApproveFinal = (dealId: string) => {
    setDeals(prev => prev.map(d => d.id === dealId ? {
      ...d,
      status: 'FINAL_PAID',
      statusLabel: 'Đã Tất Toán (Hoàn Tất HĐ)'
    } : d));
    showToast('Đã thanh toán đợt 2. Hợp đồng hoàn tất.');
  };

  const handleImportSuccess = (result: { updatedDeals: number; totalGmvAdded: number }) => {
    showToast(`Đã cập nhật ${result.updatedDeals} deal, GMV +${result.totalGmvAdded.toLocaleString('vi-VN')} đ`);
  };

  const handleOpenQuickBookWithKoc = (koc: KocItem) => {
    setPreselectedKoc(koc);
    setIsQuickBookOpen(true);
  };

  const handleCampaignCreatedNotification = (camp: CampaignItem) => {
    showToast(`Đã tạo chiến dịch ${camp.code} và gửi brief cho team Content`);
  };

  const handleTriggerHandoffNotification = (title: string) => {
    showToast(`Đã bàn giao tài liệu chiến dịch ${title} cho team Content`);
  };

  const handleScriptApprovedNotification = (dealCode: string) => {
    setDeals(prev => prev.map(d => d.dealCode === dealCode ? {
      ...d,
      status: 'SCRIPT_APPROVED',
      statusLabel: 'Đã Duyệt Kịch Bản (Cần Trình Ký HĐ)'
    } : d));
    showToast(`Đã duyệt kịch bản ${dealCode}. Bước tiếp theo: ký hợp đồng.`);
  };

  const handlePingStaffNotification = (staffName: string, taskTitle: string) => {
    showToast(`Đã nhắc ${staffName}: ${taskTitle}`, 'warning');
  };

  const handleUpdateDeal = (updatedDeal: BookingDealItem) => {
    setDeals(prev => prev.map(d => d.id === updatedDeal.id ? updatedDeal : d));
    showToast(`Đã cập nhật deal ${updatedDeal.dealCode}. GMV 30 ngày: ${updatedDeal.gmv30.toLocaleString('vi-VN')} đ (ROI ${updatedDeal.roi.toFixed(2)})`);
  };

  const handleKocCreated = (newKoc: KocItem) => {
    setKocs(prev => [newKoc, ...prev]);
    showToast(`Đã thêm ${newKoc.stageName} vào danh bạ (${newKoc.salaryGrade})`);
  };

  const handleKocUpdated = (updatedKoc: KocItem) => {
    setKocs(prev => prev.map(k => k.id === updatedKoc.id ? updatedKoc : k));
    showToast(`Đã cập nhật hồ sơ pháp lý của ${updatedKoc.stageName}`);
  };

  const handleTaskActionClick = (task: SlaTask) => {
    if (task.dealCode) {
      const matched = deals.find(d => d.dealCode === task.dealCode);
      if (matched) {
        setSelectedDealForContract(matched);
        return;
      }
    }
    if (task.type === 'SCRIPT_REVIEW') {
      setActiveTab('content');
      showToast('Kịch bản chờ duyệt', 'info');
    } else if (task.type === 'CONTRACT_APPROVAL') {
      setActiveTab('contracts');
    } else if (task.type === 'CAMPAIGN_BRIEF') {
      setActiveTab('campaigns');
    } else {
      handleCompleteTask(task.id);
    }
  };

  // Tiêu đề trang: khớp tên trên menu, mô tả chỉ khi thêm thông tin
  const titles: Record<TabKey, { title: string; subtitle: string }> = {
    cockpit: { title: 'Việc của tôi', subtitle: '' },
    overview: { title: 'Tổng quan', subtitle: '' },
    'input-plan': { title: 'Kế hoạch tháng', subtitle: 'Ngân sách, kênh và nhân sự booking theo từng tháng' },
    'self-channel-hub': { title: 'Hub làm việc với Cộng tác viên (CTV)', subtitle: 'Sản xuất video kênh thương hiệu theo Content Pillar và quản lý Cộng Tác Viên' },
    'master-data': { title: 'Dữ liệu gốc', subtitle: '' },
    'push-products': { title: 'Sản phẩm đẩy', subtitle: '' },
    stores: { title: 'Gian hàng & nhãn hàng', subtitle: '' },
    campaigns: { title: 'Làm việc với Brand', subtitle: 'Brief chiến dịch, Brand Guideline, Blacklist từ khóa và duyệt KOC của team Brand' },
    'brand-knowledge': { title: 'Hướng dẫn nhãn hàng', subtitle: 'Thông tin thương hiệu, hồ sơ pháp lý, Hero SKU và từ khóa cần tránh' },
    content: { title: 'Kịch bản', subtitle: '' },
    booking: { title: 'Booking', subtitle: '' },
    'koc-master': { title: 'Danh bạ KOC', subtitle: 'Hồ sơ KOC, giấy tờ pháp lý và mẫu hợp đồng' },
    contracts: { title: 'Hợp đồng & thanh toán', subtitle: '' },
    manager: { title: 'Phân bổ & điều phối', subtitle: 'Gán nhãn hàng, gian hàng và cân bằng khối lượng việc' },
    'sample-tracker': { title: 'Hàng mẫu', subtitle: 'Vận đơn mẫu, hạn nộp kịch bản 5 ngày và mã Spark Ads' },
    'performance-p3': { title: 'Đánh giá 4P & thưởng P3', subtitle: 'Điểm khối lượng việc theo độ khó gian hàng, chất lượng và SLA' },
    leaderboard: { title: 'Hiệu suất nhân sự', subtitle: '' },
    'brand-hub': { title: 'Cổng đối tác Brand', subtitle: 'Duyệt kế hoạch → Duyệt KOC → Duyệt kịch bản → Nghiệm thu video' },
    'koc-hub': { title: 'Hub đối tác KOC / KOL', subtitle: 'Xem lời mời booking, xác nhận nhận hàng mẫu, nộp link video review & mã Spark Ads' },
    'ads-report': { title: 'Báo cáo Ads TikTok & Mapping Tuần', subtitle: 'Tự động đọc file báo cáo xuất từ TikTok Shop Seller, đối soát mã Spark Ads và đồng bộ ROAS thực tế' },
    'dashboard-bi': { title: 'Dashboard Điều Hành & Báo Cáo Tổng Hợp', subtitle: 'Bức tranh đa chiều về GMV toàn sàn, PnL vận hành, ROAS chiến dịch và đối soát tài chính 3 bên' },
  };

  return (
    <div className="flex min-h-screen bg-canvas text-ink">
      {/* Toast Notification (Enterprise Multi-Type) */}
      {/* Toast Notification (Enterprise Multi-Type with Clean Lucide SVGs) */}
      {toastData && (
        <div 
          className={`fixed bottom-6 right-6 z-50 max-w-sm pl-4 pr-2 py-2.5 rounded-md text-sm shadow-xl animate-in slide-in-from-bottom-3 duration-200 flex items-center gap-3 bg-slate-900 text-white`}
          role="status"
          aria-live="polite"
        >
          {toastData.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />}
          {toastData.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-300 shrink-0" />}
          {toastData.type === 'error' && <XCircle className="w-4 h-4 text-rose-300 shrink-0" />}
          {toastData.type === 'info' && <Info className="w-4 h-4 text-blue-300 shrink-0" />}
          <span>{toastData.message}</span>
          <button 
            onClick={() => setToastData(null)}
            className="p-1 rounded-md hover:bg-white/20 transition text-slate-400 hover:text-white ml-2"
            aria-label="Đóng thông báo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sidebar Navigation (with Mobile Drawer Support) */}
      <Sidebar
        activeTab={activeTab}
        onTabSelect={setActiveTab}
        currentUser={currentUser}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onLogout={handleLogout}
      />

      {/* Main Content Space */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader
          currentUser={currentUser}
          onUserChange={setCurrentUser}
          onOpenQuickBook={() => {
            setPreselectedKoc(null);
            setIsQuickBookOpen(true);
          }}
          onOpenImport={() => setIsImportOpen(true)}
          title={titles[activeTab].title}
          subtitle={titles[activeTab].subtitle}
          onNavigateTab={setActiveTab}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
          onLogout={handleLogout}
        />

        <main className="px-4 py-6 sm:px-6 lg:px-8 w-full max-w-[1600px] space-y-6">
          {activeTab === 'cockpit' && (
            <CockpitView
              currentUser={currentUser}
              tasks={tasks}
              onCompleteTask={handleCompleteTask}
              onOpenQuickBook={() => {
                setPreselectedKoc(null);
                setIsQuickBookOpen(true);
              }}
              onSelectDeal={setSelectedDealForContract}
              deals={deals}
              onTaskActionClick={handleTaskActionClick}
              onNavigateToInputPlan={() => setActiveTab('input-plan')}
            />
          )}

          {activeTab === 'overview' && (
            <OverviewView
              deals={deals}
              onOpenQuickBook={() => {
                setPreselectedKoc(null);
                setIsQuickBookOpen(true);
              }}
              onSelectDeal={setSelectedDealForContract}
            />
          )}

          {activeTab === 'dashboard-bi' && (
            <ExecutiveDashboardReportsView
              currentUser={currentUser}
              deals={deals}
              brands={brands}
              kocs={kocs}
              storePortfolios={storePortfolios}
              onNotify={showToast}
              onNavigateToTab={setActiveTab}
            />
          )}

          {activeTab === 'input-plan' && (
            <InputPlanBreakdownView
              currentUser={currentUser}
              onNotify={showToast}
              onGenerateDealsFromPlan={(newSlots) => {
                setDetailedPlans(prev => [...newSlots, ...prev]);
                showToast(`Đã tạo ${newSlots.length} slot KOC trong Booking`);
                setActiveTab('booking');
              }}
              onApplyPlanToWeeklyStore={(weeklyPlan) => {
                showToast(`Đã lưu kế hoạch ${weeklyPlan.storeName}, ${weeklyPlan.week}`);
              }}
            />
          )}

          {activeTab === 'master-data' && (
            <MasterDataHubView
              currentUser={currentUser}
              brands={brands}
              kocs={kocs}
              onNotify={showToast}
              onOpenQuickBookWithKoc={handleOpenQuickBookWithKoc}
              onKocCreated={handleKocCreated}
              onKocUpdated={handleKocUpdated}
            />
          )}

          {activeTab === 'push-products' && (
            <PushProductsView
              currentUser={currentUser}
              brands={brands}
              onNotify={showToast}
            />
          )}

          {activeTab === 'self-channel-hub' && (
            <SelfChannelCtvHubView
              currentUser={currentUser}
              brands={brands}
              onNotify={showToast}
              onOpenPushProducts={() => setActiveTab('push-products')}
              onNavigateToBrand={() => setActiveTab('campaigns')}
            />
          )}

          {activeTab === 'stores' && (
            <MasterDataHubView
              initialSubTab="stores"
              currentUser={currentUser}
              brands={brands}
              kocs={kocs}
              onNotify={showToast}
            />
          )}

          {activeTab === 'campaigns' && (
            <BrandView
              onCampaignCreatedNotification={handleCampaignCreatedNotification}
              onTriggerHandoffNotification={handleTriggerHandoffNotification}
              onNavigateToCtvHub={() => setActiveTab('self-channel-hub')}
            />
          )}

          {activeTab === 'brand-knowledge' && (
            <BrandKnowledgeView />
          )}

          {activeTab === 'content' && (
            <ContentView
              onScriptApprovedNotification={handleScriptApprovedNotification}
            />
          )}

          {activeTab === 'booking' && (
            <BookingView 
              deals={deals}
              kocs={kocs}
              currentUser={currentUser}
              onOpenQuickBookWithKoc={handleOpenQuickBookWithKoc}
              onSelectDealForContract={setSelectedDealForContract}
              onUpdateDeal={handleUpdateDeal}
              onKocCreated={handleKocCreated}
              planItems={detailedPlans}
              onAddPlanItem={handleAddPlanItem}
              onUpdatePlanItem={handleUpdatePlanItem}
              onDeletePlanItem={handleDeletePlanItem}
              onSubmitPlanToLead={handleSubmitPlanToLead}
              onConvertPlanItemToDeal={handleConvertPlanItemToDeal}
              staffAllocations={staffAllocations['2026/09']}
              currentUserName={currentUser.name}
              onOpenInputPlan={() => setActiveTab('input-plan')}
            />
          )}

          {activeTab === 'koc-master' && (
            <MasterDataHubView
              initialSubTab="kocs"
              currentUser={currentUser}
              brands={brands}
              kocs={kocs}
              onNotify={showToast}
              onOpenQuickBookWithKoc={handleOpenQuickBookWithKoc}
              onKocCreated={handleKocCreated}
              onKocUpdated={handleKocUpdated}
            />
          )}

          {activeTab === 'contracts' && (
            <ContractView
              deals={deals}
              onSelectDeal={setSelectedDealForContract}
              onApproveAdvance={handleApproveAdvance}
              onApproveFinal={handleApproveFinal}
            />
          )}

          {activeTab === 'sample-tracker' && (
            <SampleTrackerView />
          )}

          {activeTab === 'manager' && (
            <ManagerView
              currentUser={currentUser}
              deals={deals}
              onPingStaffNotification={handlePingStaffNotification}
              planItems={detailedPlans}
              onUpdatePlanItemStatus={handleUpdatePlanItemStatusFromLead}
              onApproveEntirePlan={handleApproveEntirePlanFromLead}
              onRequestPlanRevision={handleRequestPlanRevisionFromLead}
              onGenerateDealsFromPlan={handleGenerateDealsFromGrowthDemand}
              onConvertPlanToDeals={handleBatchConvertPlanToDeals}
              staffAllocationsByMonth={staffAllocations}
              onOpenInputPlan={() => setActiveTab('input-plan')}
              onUpdateStaffAllocation={(month, updatedList) => {
                setStaffAllocations(prev => ({ ...prev, [month]: updatedList }));
                showToast(`Đã lưu phân bổ tháng ${month}`);
              }}
              brands={brands}
              onUpdateBrand={handleUpdateBrand}
              onAddBrand={handleAddBrand}
              storePortfolios={storePortfolios}
              onUpdateStore={handleUpdateStore}
              tasks={tasks}
              onAddTask={handleAddTask}
            />
          )}

          {activeTab === 'performance-p3' && (
            <PerformanceP3View />
          )}

          {activeTab === 'leaderboard' && <LeaderboardView />}

          {activeTab === 'brand-hub' && (
            <BrandHubView
              onNotify={showToast}
              onNavigateToCtvHub={() => setActiveTab('self-channel-hub')}
              onNavigateToKocHub={() => setActiveTab('koc-hub')}
            />
          )}

          {activeTab === 'koc-hub' && (
            <KocKolHubView
              currentUser={currentUser}
              brands={brands}
              initialKocs={kocs}
              initialDeals={deals}
              onNotify={showToast}
              onNavigateToBrandHub={() => setActiveTab('brand-hub')}
              onNavigateToCtvHub={() => setActiveTab('self-channel-hub')}
            />
          )}

          {activeTab === 'ads-report' && (
            <WeeklyAdsReportHubView
              currentUser={currentUser}
              kocs={kocs}
              deals={deals}
              onNotify={showToast}
              onUpdateKocsWithAdsData={(updated) => setKocs(updated)}
              onUpdateDealsWithAdsData={(updated) => setDeals(updated)}
            />
          )}
        </main>
      </div>

      {/* Quick Book Modal */}
      <QuickBookModal
        isOpen={isQuickBookOpen}
        onClose={() => {
          setIsQuickBookOpen(false);
          setPreselectedBrand(null);
        }}
        onDealCreated={handleDealCreated}
        preselectedKoc={preselectedKoc}
        preselectedBrand={preselectedBrand}
      />

      {/* Import Excel Modal */}
      <ImportExcelModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={handleImportSuccess}
      />

      {/* Contract Preview Modal */}
      <ContractModal
        isOpen={!!selectedDealForContract}
        onClose={() => setSelectedDealForContract(null)}
        deal={selectedDealForContract}
        onApproveAdvance={handleApproveAdvance}
        onApproveFinal={handleApproveFinal}
      />
    </div>
  );
}
