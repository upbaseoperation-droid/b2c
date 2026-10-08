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
    showToast(`Đã thêm KOC ${newItem.kocStageName} (${newItem.brandName}) vào Kế hoạch tuần ${newItem.targetWeek}!`);
  };

  const handleUpdatePlanItem = (updated: StaffDetailedPlanItem) => {
    setDetailedPlans(prev => prev.map(i => i.id === updated.id ? updated : i));
  };

  const handleDeletePlanItem = (itemId: string) => {
    setDetailedPlans(prev => prev.filter(i => i.id !== itemId));
    showToast('Đã xóa slot KOC khỏi kế hoạch.');
  };

  const handleSubmitPlanToLead = (staffName: string) => {
    setDetailedPlans(prev => prev.map(i => i.staffName === staffName && i.status === 'DRAFT' ? {
      ...i,
      status: 'SUBMITTED',
      leadNotes: 'Đã gửi trình duyệt lên Trưởng phòng'
    } : i));
    showToast(`Đã gửi trình duyệt toàn bộ Kế hoạch của ${staffName} lên Trưởng Phòng!`);
  };

  const handleApproveEntirePlanFromLead = (staffName: string, managerFeedback: string) => {
    setDetailedPlans(prev => prev.map(item => item.staffName === staffName ? {
      ...item,
      status: 'APPROVED',
      leadNotes: managerFeedback || 'Trưởng phòng đã phê duyệt toàn bộ kế hoạch'
    } : item));
    showToast(`Trưởng phòng đã phê duyệt Kế hoạch của ${staffName}! Kích hoạt chuyển giao sang Booking Execution.`);
  };

  const handleRequestPlanRevisionFromLead = (staffName: string, managerFeedback: string) => {
    setDetailedPlans(prev => prev.map(item => item.staffName === staffName && item.status !== 'CONVERTED' ? {
      ...item,
      status: 'REVISION_REQUESTED',
      leadNotes: managerFeedback || 'Trưởng phòng yêu cầu điều chỉnh danh sách KOC'
    } : item));
    showToast(`[Yêu Cầu Sửa] Đã gửi yêu cầu điều chỉnh Kế hoạch đến chuyên viên ${staffName}.`, 'warning');
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
    showToast(`Đã chuyển đổi KOC ${item.kocStageName} (${item.brandName}) sang Deal Booking ${newDeal.dealCode}! Kích hoạt khâu Hợp đồng & Cọc.`);
  };

  const handleBatchConvertPlanToDeals = (staffName: string) => {
    const approvedItems = detailedPlans.filter(p => p.staffName === staffName && p.status === 'APPROVED');
    if (approvedItems.length === 0) {
      showToast(`Không có KOC nào ở trạng thái ĐÃ DUYỆT để chuyển đổi cho ${staffName}!`, 'warning');
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

    showToast(`Trưởng phòng đã chuyển đổi thành công ${approvedItems.length} KOC của ${staffName} sang Booking Deals tác nghiệp!`);
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
      showToast(`Đã tự động khởi tạo ${newDealsGenerated.length} vị trí Deal Booking từ Kế Hoạch ${demand.code}! Bàn giao nhân sự Booking tác nghiệp.`);
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
    showToast(`Đã tạo thành công Deal ${newDeal.dealCode} cho KOC ${newDeal.kocStageName}! Kích hoạt SLA 24h duyệt kịch bản.`);
  };

  const handleCompleteTask = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, urgency: 'done', remainingText: 'Đạt SLA 100%' } : t));
    showToast('Đã hoàn thành đầu việc! Ghi nhận +5 điểm Kỷ luật SLA vào Bảng Vàng.');
  };

  const handleAddTask = (newTask: SlaTask) => {
    setTasks(prev => [newTask, ...prev]);
    showToast(`Trưởng phòng đã giao nhiệm vụ: "${newTask.title}" tới ${newTask.pic}!`);
  };

  const handleUpdateBrand = (updatedBrand: BrandDetail) => {
    setBrands(prev => prev.map(b => b.id === updatedBrand.id ? updatedBrand : b));
    showToast(`Đã cập nhật phân bổ Brand: ${updatedBrand.name} (PIC: ${updatedBrand.bookingPicLead || updatedBrand.brandPicName || 'Chưa gán'})`);
  };

  const handleAddBrand = (newBrand: BrandDetail) => {
    setBrands(prev => [newBrand, ...prev]);
    showToast(`Đã thêm mới nhãn hàng: ${newBrand.name} (Phụ trách: ${newBrand.bookingPicLead || newBrand.brandPicName || 'Chưa gán'})`);
  };

  const handleUpdateStore = (updatedStore: StorePortfolioItem) => {
    setStorePortfolios(prev => prev.map(s => s.id === updatedStore.id ? updatedStore : s));
    showToast(`Đã cập nhật phân bổ gian hàng ${updatedStore.storeName} -> Phụ trách: ${updatedStore.b2cOwnerName || updatedStore.assignedStaff}`);
  };

  const handleApproveAdvance = (dealId: string) => {
    setDeals(prev => prev.map(d => d.id === dealId ? {
      ...d,
      status: 'ADVANCE_PAID',
      statusLabel: 'Đã Chi Cọc (Được Gửi Mẫu)'
    } : d));
    showToast('Đã duyệt chi tạm ứng qua Lark Approval! Trạng thái chuyển sang: Đã kích hoạt xuất kho gửi sample.');
  };

  const handleApproveFinal = (dealId: string) => {
    setDeals(prev => prev.map(d => d.id === dealId ? {
      ...d,
      status: 'FINAL_PAID',
      statusLabel: 'Đã Tất Toán (Hoàn Tất HĐ)'
    } : d));
    showToast('Đã tất toán đợt 2 qua Lark Approval! Hợp đồng hoàn tất 100%, ghi nhận doanh số và cộng điểm Bảng Vàng.');
  };

  const handleImportSuccess = (result: { updatedDeals: number; totalGmvAdded: number }) => {
    showToast(`Đã đồng bộ thành công ${result.updatedDeals} deals KOC, ghi nhận +${result.totalGmvAdded.toLocaleString('vi-VN')} đ GMV!`);
  };

  const handleOpenQuickBookWithKoc = (koc: KocItem) => {
    setPreselectedKoc(koc);
    setIsQuickBookOpen(true);
  };

  const handleCampaignCreatedNotification = (camp: CampaignItem) => {
    showToast(`Brand đã khởi tạo Chiến Dịch ${camp.code}: ${camp.title} và bàn giao Brief sang Content!`);
  };

  const handleTriggerHandoffNotification = (title: string) => {
    showToast(`Đã kích hoạt Handoff: Bàn giao toàn bộ tài liệu chiến dịch "${title}" sang Content Team!`);
  };

  const handleScriptApprovedNotification = (dealCode: string) => {
    setDeals(prev => prev.map(d => d.dealCode === dealCode ? {
      ...d,
      status: 'SCRIPT_APPROVED',
      statusLabel: 'Đã Duyệt Kịch Bản (Cần Trình Ký HĐ)'
    } : d));
    showToast(`Content Team đã phê duyệt kịch bản ${dealCode}! Kích hoạt khâu Ký Hợp Đồng & Tạm Ứng.`);
  };

  const handlePingStaffNotification = (staffName: string, taskTitle: string) => {
    showToast(`[Manager Tower] Đã gửi ping cảnh báo khẩn đến ${staffName}: "${taskTitle}"`, 'warning');
  };

  const handleUpdateDeal = (updatedDeal: BookingDealItem) => {
    setDeals(prev => prev.map(d => d.id === updatedDeal.id ? updatedDeal : d));
    showToast(`Đã cập nhật deal ${updatedDeal.dealCode}: Video lên sóng, GMV 30 đạt ${updatedDeal.gmv30.toLocaleString('vi-VN')} đ (ROI ${updatedDeal.roi.toFixed(2)})!`);
  };

  const handleKocCreated = (newKoc: KocItem) => {
    setKocs(prev => [newKoc, ...prev]);
    showToast(`Đã thêm thành công KOC ${newKoc.stageName} (${newKoc.channelId}) vào Khung Lương ${newKoc.salaryGrade}!`);
  };

  const handleKocUpdated = (updatedKoc: KocItem) => {
    setKocs(prev => prev.map(k => k.id === updatedKoc.id ? updatedKoc : k));
    showToast(`Đã cập nhật hồ sơ pháp lý KOC ${updatedKoc.stageName} (Định danh OCR)!`);
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
      showToast('Đã chuyển sang Phân hệ Content Studio — Hàng Chờ Duyệt Kịch Bản!', 'info');
    } else if (task.type === 'CONTRACT_APPROVAL') {
      setActiveTab('contracts');
    } else if (task.type === 'CAMPAIGN_BRIEF') {
      setActiveTab('campaigns');
    } else {
      handleCompleteTask(task.id);
    }
  };

  // Titles mapping (clean & professional)
  const titles: Record<TabKey, { title: string; subtitle: string }> = {
    cockpit: {
      title: 'Công Việc Của Tôi',
      subtitle: ''
    },
    overview: {
      title: 'Tổng Quan Vận Hành',
      subtitle: ''
    },
    'input-plan': {
      title: 'Quản Lý Kế Hoạch Theo Tháng (Monthly Plan Hub)',
      subtitle: 'Hoạch định ngân sách theo chu kỳ tháng, phân rã đa kênh (TikTok Shop, Shopee, Live, Tự xây) và điều phối nhân sự Booking'
    },
    'master-data': {
      title: 'Dữ liệu gốc',
      subtitle: ''
    },
    'push-products': {
      title: 'Sản phẩm',
      subtitle: ''
    },
    stores: {
      title: 'Gian Hàng & Nhãn Hàng',
      subtitle: ''
    },
    campaigns: {
      title: 'Không Gian Chiến Lược & Vận Hành Nhãn Hàng (Brand Team Workspace)',
      subtitle: 'Soạn thảo & bàn giao brief SLA 24h, Brand Guideline & Blacklist từ khóa, Cổng thẩm định KOC và Sức khỏe Retainer P&L'
    },
    'brand-knowledge': {
      title: 'Bách Khoa Toàn Thư Brand Guideline (Brand Knowledge Base)',
      subtitle: 'Trung tâm tri thức chuẩn hóa: Brand DNA, Hồ sơ pháp lý & bằng chứng lâm sàng, Hero SKUs, Blacklist/Whitelist & FAQ phản biện KOC'
    },
    content: {
      title: 'Kịch Bản & Content',
      subtitle: ''
    },
    booking: {
      title: 'Quản Lý Booking',
      subtitle: ''
    },
    'koc-master': {
      title: 'Danh Bạ Master KOC & Định Danh Pháp Lý OCR',
      subtitle: 'Quản trị hồ sơ KOC toàn hệ thống, tự động bóc tách CCCD/ĐKKD bằng AI Vision và chuẩn hóa mẫu hợp đồng'
    },
    contracts: {
      title: 'Hợp Đồng & Thanh Toán',
      subtitle: ''
    },
    manager: {
      title: 'Trung Tâm Phân Bổ & Điều Phối',
      subtitle: 'Phân chia Brand, gán gian hàng, cân bằng tải nhân sự và giám sát SLA'
    },
    'sample-tracker': {
      title: 'Giám Sát Vận Đơn Mẫu & Chống Bùng KOC',
      subtitle: 'Theo dõi vận chuyển hàng mẫu, đếm ngược SLA 5 ngày nộp kịch bản và thu thập mã TikTok Spark Ads'
    },
    'performance-p3': {
      title: 'Đánh Giá Hiệu Suất 4P & Tính Thưởng P3',
      subtitle: 'Quy đổi điểm Workload theo hệ số độ khó Store, chất lượng và SLA để tính thưởng minh bạch'
    },
    leaderboard: {
      title: 'Hiệu Suất Nhân Sự',
      subtitle: ''
    },
    'brand-hub': {
      title: 'Cổng Khách Hàng (Brand Client Portal)',
      subtitle: 'Quy trình 4 chặng: Duyệt Kế hoạch ➔ Duyệt KOC ➔ Duyệt Kịch bản ➔ Nghiệm thu Video'
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Toast Notification (Enterprise Multi-Type) */}
      {/* Toast Notification (Enterprise Multi-Type with Clean Lucide SVGs) */}
      {toastData && (
        <div 
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-xs font-medium shadow-2xl animate-in slide-in-from-bottom-3 duration-200 flex items-center gap-2.5 border ${
            toastData.type === 'success' ? 'bg-slate-900 text-white border-slate-700' :
            toastData.type === 'warning' ? 'bg-amber-950 text-amber-100 border-amber-800' :
            toastData.type === 'error' ? 'bg-rose-950 text-rose-100 border-rose-800' :
            'bg-slate-900 text-slate-100 border-slate-700'
          }`}
          role="status"
          aria-live="polite"
        >
          {toastData.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toastData.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />}
          {toastData.type === 'error' && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          {toastData.type === 'info' && <Info className="w-4 h-4 text-blue-400 shrink-0" />}
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
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
          onLogout={handleLogout}
        />

        <main className="p-6 lg:p-8 w-full max-w-[1600px] space-y-6">
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

          {activeTab === 'input-plan' && (
            <InputPlanBreakdownView
              currentUser={currentUser}
              onNotify={showToast}
              onGenerateDealsFromPlan={(newSlots) => {
                setDetailedPlans(prev => [...newSlots, ...prev]);
                showToast(`Đã sinh ${newSlots.length} slot KOC tác nghiệp và tự động chuyển giao sang Quản Lý Booking!`);
                setActiveTab('booking');
              }}
              onApplyPlanToWeeklyStore={(weeklyPlan) => {
                showToast(`Đã lưu và đồng bộ kế hoạch ${weeklyPlan.storeName} (${weeklyPlan.week}) vào Sổ Kế Hoạch Tuần Thực Tế!`);
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
                showToast(`Đã lưu điều chỉnh Ma Trận Phân Bổ tháng ${month}!`);
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
            <BrandHubView onNotify={showToast} />
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
