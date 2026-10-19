'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { Sidebar, TabKey } from '../components/Sidebar';
import { TopHeader } from '../components/TopHeader';
import { QuickBookModal } from '../components/QuickBookModal';
import { ImportExcelModal } from '../components/ImportExcelModal';
import { ErrorBoundary } from '../components/ErrorBoundary';

import dynamic from 'next/dynamic';
import type { ContractIntent } from '../components/views/ContractManagementView';
import type { ListingPlanContext } from '../components/views/KocListingBatchHubView';

/** Khung giữ chỗ khi màn đang tải gói: đúng hình dạng màn (thanh lọc → hàng chỉ số → bảng), DESIGN_SYSTEM.md §9. */
function ViewLoading() {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <span className="sr-only">Đang chuẩn bị không gian làm việc…</span>
      <div aria-hidden="true" className="flex items-center gap-3">
        <Skeleton className="h-8 w-56 rounded-md" />
        <Skeleton className="h-8 w-32 rounded-md" />
      </div>
      <div aria-hidden="true" className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-line border border-line rounded-xl overflow-hidden">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="bg-surface px-4 pt-3.5 pb-4 grid gap-2.5">
            <Skeleton className="w-24" />
            <Skeleton className="h-7 w-32 rounded-md" />
            <Skeleton className="w-20" />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="bg-surface border border-line rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-line"><Skeleton className="h-8 w-72 rounded-md" /></div>
        <table className="w-full"><tbody><SkeletonRows rows={7} columns={5} /></tbody></table>
      </div>
    </div>
  );
}

const CockpitView = dynamic(() => import('../components/views/CockpitView').then(m => m.CockpitView), { loading: ViewLoading });
const OverviewView = dynamic(() => import('../components/views/OverviewView').then(m => m.OverviewView), { loading: ViewLoading });
const BrandView = dynamic(() => import('../components/views/BrandView').then(m => m.BrandView), { loading: ViewLoading });
const BrandProfilesView = dynamic(() => import('../components/views/BrandProfilesView').then(m => m.BrandProfilesView), { loading: ViewLoading });
const ContentView = dynamic(() => import('../components/views/ContentView').then(m => m.ContentView), { loading: ViewLoading });
const BookingView = dynamic(() => import('../components/views/BookingView').then(m => m.BookingView), { loading: ViewLoading });
const ManagerView = dynamic(() => import('../components/views/ManagerView').then(m => m.ManagerView), { loading: ViewLoading });
const LeaderboardView = dynamic(() => import('../components/views/LeaderboardView').then(m => m.LeaderboardView), { loading: ViewLoading });
const BrandHubView = dynamic(() => import('../components/views/BrandHubView').then(m => m.BrandHubView), { loading: ViewLoading });
const InputPlanBreakdownView = dynamic(() => import('../components/views/InputPlanBreakdownView').then(m => m.InputPlanBreakdownView), { loading: ViewLoading });
const SampleTrackerView = dynamic(() => import('../components/views/SampleTrackerView'), { loading: ViewLoading });
const PerformanceP3View = dynamic(() => import('../components/views/PerformanceP3View'), { loading: ViewLoading });
const PushProductsView = dynamic(() => import('../components/views/PushProductsView').then(m => m.PushProductsView), { loading: ViewLoading });
const SelfChannelCtvHubView = dynamic(() => import('../components/views/SelfChannelCtvHubView').then(m => m.SelfChannelCtvHubView), { loading: ViewLoading });
const StoreManagementView = dynamic(() => import('../components/views/StoreManagementView').then(m => m.StoreManagementView), { loading: ViewLoading });
const KocKolHubView = dynamic(() => import('../components/views/KocKolHubView').then(m => m.KocKolHubView), { loading: ViewLoading });
const ContentAngleSetupView = dynamic(() => import('../components/views/ContentAngleSetupView').then(m => m.ContentAngleSetupView), { loading: ViewLoading });
const CentralizedRbacHubView = dynamic(() => import('../components/views/CentralizedRbacHubView').then(m => m.CentralizedRbacHubView), { loading: ViewLoading });
const MasterDataHubView = dynamic(() => import('../components/views/MasterDataHubView').then(m => m.MasterDataHubView), { loading: ViewLoading });
const KocListingBatchHubView = dynamic(() => import('../components/views/KocListingBatchHubView').then(m => m.KocListingBatchHubView), { loading: ViewLoading });
const KocMasterDataView = dynamic(() => import('../components/views/KocMasterDataView').then(m => m.KocMasterDataView), { loading: ViewLoading });
const CtvManagementView = dynamic(() => import('../components/views/CtvManagementView').then(m => m.CtvManagementView), { loading: ViewLoading });
const ContractManagementView = dynamic(() => import('../components/views/ContractManagementView').then(m => m.ContractManagementView), { loading: ViewLoading });
const WeeklyAdsReportHubView = dynamic(() => import('../components/views/WeeklyAdsReportHubView').then(m => m.WeeklyAdsReportHubView), { loading: ViewLoading });
const ExecutiveDashboardReportsView = dynamic(() => import('../components/views/ExecutiveDashboardReportsView').then(m => m.ExecutiveDashboardReportsView), { loading: ViewLoading });
const ApiKeySetupView = dynamic(() => import('../components/views/ApiKeySetupView').then(m => m.ApiKeySetupView), { loading: ViewLoading });
const MarketingKnowledgeQaView = dynamic(() => import('../components/views/MarketingKnowledgeQaView').then(m => m.MarketingKnowledgeQaView), { loading: ViewLoading });
const TaskDelegationView = dynamic(() => import('../components/views/TaskDelegationView').then(m => m.TaskDelegationView), { loading: ViewLoading });
const Workload3dMapView = dynamic(() => import('../components/views/Workload3dMapView').then(m => m.Workload3dMapView), { loading: ViewLoading });
const AuditTrailView = dynamic(() => import('../components/views/AuditTrailView').then(m => m.AuditTrailView), { loading: ViewLoading });
const TikTokCrawlerHubView = dynamic(() => import('../components/views/TikTokCrawlerHubView').then(m => m.TikTokCrawlerHubView), { loading: ViewLoading });
const BrandMarketResearchHubView = dynamic(() => import('../components/views/BrandMarketResearchHubView').then(m => m.BrandMarketResearchHubView), { loading: ViewLoading });

import { isThirdPartyPartner } from '../lib/thirdPartyAccessData';
import { loadAccessPolicy } from '../lib/policyClient';
import { isTabAllowedForRole, getAllowedTabsForRole, getDefaultLandingTabForRole, getSavedInternalStaffList } from '../lib/rbacData';
import { 
  filterScopedStores, 
  filterScopedBrands, 
  filterScopedPlans, 
  filterScopedDeals, 
  getUserScopeSummary, 
  isStaffGlobalAdminOrManager 
} from '../lib/rbacScope';
import { Button, PageActiveContext, Skeleton, SkeletonRows, ToastStack, useToastQueue } from '../components/ui';

import { 
  USERS, 
  INITIAL_DEALS, 
  INITIAL_TASKS, 
  INITIAL_KOCS, 
  INITIAL_DETAILED_STAFF_PLANS, 
  INITIAL_STAFF_ALLOCATIONS_26,
  INITIAL_BRANDS,
  INITIAL_STORE_PORTFOLIOS,
  INITIAL_KOC_LISTINGS,
  INITIAL_CAMPAIGNS
} from '../lib/mockData';
import { INITIAL_CONTRIBUTORS, INITIAL_SELF_CHANNEL_TASKS } from '../lib/selfChannelData';
import { INITIAL_MONTHLY_PLANS } from '../lib/monthlyPlanData';
import { 
  UserProfile, 
  BookingDealItem, 
  DealStatus,
  SlaTask, 
  KocItem, 
  Contributor,
  SelfChannelVideoTask,
  CampaignItem, 
  StaffDetailedPlanItem, 
  MonthlyStaffAllocation,
  StaffPlanStatus,
  ContentPillarType,
  BrandDetail,
  StorePortfolioItem,
  KocListingItem,
  GrowthDemandItem,
  GrowthDemandBreakdownTier,
  SalaryGrade,
  KocCategory,
  InputPlanBreakdownState
} from '../lib/types';

function KeepAliveTab({
  tabKey,
  currentTab,
  children,
}: {
  tabKey: TabKey;
  currentTab: TabKey;
  children: React.ReactNode;
}) {
  const [hasMounted, setHasMounted] = useState(tabKey === currentTab);
  if (tabKey === currentTab && !hasMounted) {
    setHasMounted(true);
  }

  if (!hasMounted) return null;
  return (
    <div
      style={{ display: tabKey === currentTab ? 'block' : 'none' }}
      className="workspace-view space-y-6"
    >
      <PageActiveContext.Provider value={tabKey === currentTab}>
        <ErrorBoundary fallbackTitle={`Lỗi tải màn hình (${tabKey})`}>
          {children}
        </ErrorBoundary>
      </PageActiveContext.Provider>
    </div>
  );
}

export default function App() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined') {
      const savedUserId = localStorage.getItem('upbase_selected_user_id');
      if (savedUserId) {
        return USERS.find(u => u.id === savedUserId) || USERS[0];
      }
    }
    return null;
  });
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const savedUserId = localStorage.getItem('upbase_selected_user_id');
      if (savedUserId && USERS.some(u => u.id === savedUserId)) {
        return false;
      }
    }
    return true;
  });
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard-bi');
  const [crawlerResetKey, setCrawlerResetKey] = useState<number>(0);
  const handleSelectTab = (tab: TabKey) => {
    if (tab === 'tiktok-crawler') {
      setCrawlerResetKey((prev) => prev + 1);
    }
    setActiveTab(tab);
  };
  const [selectedBrandContext, setSelectedBrandContext] = useState<string>('ALL');
  const [selectedStoreContext, setSelectedStoreContext] = useState<string>('');
  const [selectedCtvContext, setSelectedCtvContext] = useState<string | null>(null);
  const [selectedKocContext, setSelectedKocContext] = useState<string | null>(null);

  // Notifications Toast (Enhanced with Type & Dismiss)
  // Thông báo xếp chồng: nhiều thông báo liên tiếp không đè nhau, rê chuột để xem và dừng đếm giờ.
  const toastQueue = useToastQueue();
  const showToast = toastQueue.show;

  const [, setRbacVersion] = useState(0);
  useEffect(() => {
    const onRbacUpdated = (event: Event) => {
      setRbacVersion(v => v + 1);
      const actor = (event as CustomEvent<UserProfile | undefined>).detail;
      if (actor) setCurrentUser(prev => prev?.id === actor.id && JSON.stringify(prev) !== JSON.stringify(actor) ? actor : prev);
    };
    window.addEventListener('upbase-rbac-updated', onRbacUpdated);
    return () => window.removeEventListener('upbase-rbac-updated', onRbacUpdated);
  }, []);

  // Đảm bảo activeTab luôn hợp lệ theo phân quyền của vai trò hiện tại
  if (currentUser) {
    const allowed = getAllowedTabsForRole(currentUser.role);
    if (!allowed.includes(activeTab)) {
      const defaultTab = getDefaultLandingTabForRole(currentUser.role);
      setActiveTab(defaultTab);
    }
  }

  const handleUserChange = useCallback(async (newUser: UserProfile, isSilent: boolean = false) => {
    if (!isSilent) {
      setIsLoadingAuth(true);
      try {
        if (!newUser.id.startsWith('contract-demo-')) {
          const partner = !!newUser.partnerType || newUser.role.endsWith('_PARTNER');
          const known = USERS.some(u => u.id === newUser.id);
          const res = await fetch(partner ? '/api/auth/partner/login' : '/api/auth/lark/sandbox', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(partner ? { email: newUser.email } : known ? { userId: newUser.id } : { staffIdentifier: newUser.email || newUser.staffCode }),
          });
          const body = await res.json(); if (!res.ok) throw new Error(body.error || 'Không chuyển được tài khoản.');
        }
        const policy = await loadAccessPolicy();
        newUser = policy.user;
      } catch (error) { showToast((error as Error).message, 'error'); setIsLoadingAuth(false); return; }
      setIsLoadingAuth(false);
    }
    setCurrentUser(newUser);
    if (typeof window !== 'undefined') localStorage.setItem('upbase_selected_user_id', newUser.id);

    if (newUser.role === 'BRAND_PARTNER') {
      const userBrand = newUser.assignedBrands?.[0] || newUser.linkedEntityName || 'Kutieskin';
      setSelectedBrandContext(userBrand);
    } else {
      setSelectedBrandContext('ALL');
    }

    const defaultTab: TabKey = newUser.id.startsWith('contract-demo-')
      ? 'contracts'
      : getDefaultLandingTabForRole(newUser.role);
    setActiveTab(prevTab => {
      const allowed = getAllowedTabsForRole(newUser.role);
      const isPartnerRole = ['BRAND_PARTNER', 'KOC_PARTNER', 'CTV_PARTNER'].includes(newUser.role);
      if (!allowed.includes(prevTab) || isPartnerRole || !isSilent || newUser.id.startsWith('contract-demo-')) {
        return defaultTab;
      }
      return prevTab;
    });

    if (!isSilent) {
      showToast(`Đang xem với vai trò: ${newUser.name} (${newUser.roleTitle})`, 'info');
    }
  }, [showToast]);

  // Tải phiên đăng nhập từ cookie hoặc vai trò đã chọn ở trang /login
  useEffect(() => {
    async function loadUser() {
      try {
        const savedUserId = typeof window !== 'undefined' ? localStorage.getItem('upbase_selected_user_id') : null;
        const res = await fetch('/api/auth/me');

        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            let resolvedUser: UserProfile = data.user;
            if (savedUserId && savedUserId !== data.user.id) {
              const matched = USERS.find(u => u.id === savedUserId);
              if (matched) {
                resolvedUser = matched;
                await fetch('/api/auth/lark/sandbox', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: matched.id }),
                }).catch(() => undefined);
              }
            } else {
              // Quyền hiệu lực lấy từ máy chủ, không ghi đè bằng dữ liệu mẫu.
            }
            const policy = await loadAccessPolicy();
            resolvedUser = policy.user;
            handleUserChange(resolvedUser, true);
            setActiveTab(getDefaultLandingTabForRole(resolvedUser.role));
            setIsLoadingAuth(false);
            return;
          }
        }

        const fallbackUser = (savedUserId && USERS.find(u => u.id === savedUserId)) || USERS[0];
        handleUserChange(fallbackUser, true);
        setActiveTab(fallbackUser.id.startsWith('contract-demo-') ? 'contracts' : getDefaultLandingTabForRole(fallbackUser.role));
        setIsLoadingAuth(false);
      } catch (err) {
        console.warn('Could not fetch user session, using fallback user:', err);
        const savedUserId = typeof window !== 'undefined' ? localStorage.getItem('upbase_selected_user_id') : null;
        const fallbackUser = (savedUserId && USERS.find(u => u.id === savedUserId)) || USERS[0];
        handleUserChange(fallbackUser, true);
        setActiveTab(fallbackUser.id.startsWith('contract-demo-') ? 'contracts' : getDefaultLandingTabForRole(fallbackUser.role));
        setIsLoadingAuth(false);
      }
    }
    loadUser();
  }, [handleUserChange]);

  useEffect(() => {
    if (!currentUser || isLoadingAuth) return;
    const refresh = () => { void loadAccessPolicy().catch(error => showToast(error.message, 'error')); };
    window.addEventListener('focus', refresh);
    const timer = window.setInterval(refresh, 30000);
    return () => { window.removeEventListener('focus', refresh); window.clearInterval(timer); };
  }, [currentUser?.id, isLoadingAuth, showToast]);

  const handleLogout = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('upbase_selected_user_id');
      }
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
    }
  };

  const [kocs, setKocs] = useState<KocItem[]>(INITIAL_KOCS);
  const [contributors, setContributors] = useState<Contributor[]>(INITIAL_CONTRIBUTORS);
  const [selfChannelTasks, setSelfChannelTasks] = useState<SelfChannelVideoTask[]>(INITIAL_SELF_CHANNEL_TASKS);
  const [deals, setDeals] = useState<BookingDealItem[]>(INITIAL_DEALS);
  const [tasks, setTasks] = useState<SlaTask[]>(INITIAL_TASKS);
  const [brands, setBrands] = useState<BrandDetail[]>([]);
  const [storePortfolios, setStorePortfolios] = useState<StorePortfolioItem[]>([]);
  useEffect(() => {
    let cancelled = false;
    const reload = () => fetch('/api/master-data', { cache: 'no-store' }).then(async res => {
      const body = await res.json(); if (!res.ok) throw new Error(body.error);
      if (!cancelled) { setBrands(body.data.brands); setStorePortfolios(body.data.stores); }
    }).catch(e => { if (!cancelled) showToast(e.message, 'error'); });
    setBrands([]); setStorePortfolios([]);
    if (currentUser && !isLoadingAuth) void reload();
    window.addEventListener('upbase-master-data-updated', reload);
    return () => { cancelled = true; window.removeEventListener('upbase-master-data-updated', reload); };
  }, [currentUser, isLoadingAuth, showToast]);
  const [campaigns, setCampaigns] = useState<CampaignItem[]>(INITIAL_CAMPAIGNS);

  // Shared Plan State between Manager & Employees
  const [detailedPlans, setDetailedPlans] = useState<StaffDetailedPlanItem[]>(INITIAL_DETAILED_STAFF_PLANS);
  const [staffAllocations, setStaffAllocations] = useState<Record<string, MonthlyStaffAllocation[]>>({
    '2026/08': INITIAL_STAFF_ALLOCATIONS_26,
    '2026/09': INITIAL_STAFF_ALLOCATIONS_26,
    '2026/10': INITIAL_STAFF_ALLOCATIONS_26
  });

  // Monthly KOC Listings (Batch 10, 20, 30 with parallel Brand/KOC approval and Air Video tracking)
  const [kocListings, setKocListings] = useState<KocListingItem[]>(INITIAL_KOC_LISTINGS);
  const [sharedMonthlyPlans, setSharedMonthlyPlans] = useState<InputPlanBreakdownState[]>(INITIAL_MONTHLY_PLANS);

  // Phân quyền dữ liệu theo phạm vi quản lý của nhân sự Growth và B2C (chỉ cho xem các gian hàng, brand thuộc quản lý)
  const scopedStores = useMemo(() => filterScopedStores(storePortfolios, currentUser), [storePortfolios, currentUser]);
  const scopedBrands = useMemo(() => filterScopedBrands(brands, currentUser, storePortfolios), [brands, currentUser, storePortfolios]);
  const scopedDeals = useMemo(() => filterScopedDeals(deals, currentUser, storePortfolios), [deals, currentUser, storePortfolios]);
  const scopedMonthlyPlans = useMemo(() => filterScopedPlans(sharedMonthlyPlans, currentUser, storePortfolios), [sharedMonthlyPlans, currentUser, storePortfolios]);
  const userScopeSummary = useMemo(() => getUserScopeSummary(currentUser, brands, storePortfolios), [currentUser, brands, storePortfolios]);
  const pendingTasksCount = useMemo(() => tasks.filter(t => t.urgency !== 'done').length, [tasks]);

  const [listingPlanContext, setListingPlanContext] = useState<ListingPlanContext | null>(null);
  const [planDrilldownIntent, setPlanDrilldownIntent] = useState<{
    planId?: string;
    storeId?: string;
    storeName?: string;
    brandName?: string;
    month?: string;
    nonce: number;
  } | null>(null);
  const [bookingDrilldownIntent, setBookingDrilldownIntent] = useState<{
    storeName?: string;
    brandName?: string;
    dealCode?: string;
    month?: string;
    nonce: number;
  } | null>(null);

  const handleDrilldownToPlan = useCallback(
    (params: { planId?: string; storeId?: string; storeName?: string; brandName?: string; month: string }) => {
      setPlanDrilldownIntent({
        ...params,
        nonce: Date.now(),
      });
      setActiveTab('input-plan');
      showToast(
        `Đang mở Kế hoạch tháng ${params.month} của "${params.storeName || params.brandName || 'gian hàng'}"`,
        'info',
      );
    },
    [showToast],
  );

  const handleDrilldownToListing = useCallback(
    (params: { storeName?: string; brandName?: string; month: string }) => {
      const targetName = params.storeName || params.brandName || '';
      const matchedPlan = sharedMonthlyPlans.find(
        p =>
          p.brandName.trim().toLowerCase() === targetName.trim().toLowerCase() ||
          (p.parentBrand && p.parentBrand.trim().toLowerCase() === targetName.trim().toLowerCase()),
      );
      setListingPlanContext({
        planId: matchedPlan?.id || `plan-${targetName}`,
        storeName: targetName,
        monthKey: params.month,
        nonce: Date.now(),
      });
      setActiveTab('koc-listing');
      showToast(`Đang mở Đề xuất KOC kỳ ${params.month} cho "${targetName}"`, 'info');
    },
    [sharedMonthlyPlans, showToast],
  );

  const handleDrilldownToBooking = useCallback(
    (params: { storeName?: string; brandName?: string; dealCode?: string; month: string }) => {
      if (params.brandName && params.brandName !== 'ALL') {
        setSelectedBrandContext(params.brandName);
      }
      setBookingDrilldownIntent({
        ...params,
        nonce: Date.now(),
      });
      setActiveTab('booking');
      showToast(
        `Đang mở Quản lý Booking kỳ ${params.month} ${params.dealCode ? `(Mã deal ${params.dealCode})` : `cho "${params.storeName || params.brandName || ''}"`}`,
        'info',
      );
    },
    [showToast],
  );

  const handleGenerateDealFromListing = (listingItem: KocListingItem) => {
    const existing = deals.find(d => d.dealCode === listingItem.generatedDealId);
    if (!existing) {
      const fee = listingItem.finalFee || listingItem.proposedFee;
      const newDeal: BookingDealItem = {
        id: `DEAL-${Date.now().toString().slice(-4)}`,
        dealCode: listingItem.generatedDealId || `DEAL-AUTO-${Date.now().toString().slice(-4)}`,
        campaignCode: 'CAMP-202610',
        campaignTitle: 'Chiến Dịch Tháng 10/2026',
        brandName: listingItem.brandName,
        storeId: listingItem.storeId,
        storeName: listingItem.storeName,
        productName: listingItem.pillarName,
        bookingBatch: listingItem.batchCycle === 'BATCH_10' ? 'Đợt 1' : listingItem.batchCycle === 'BATCH_20' ? 'Đợt 2' : 'Đợt 3',
        kocId: listingItem.kocId,
        kocStageName: listingItem.kocName,
        kocTier: listingItem.tier === 'NANO' ? 'TIER_4_AFFILIATE' : listingItem.tier === 'MICRO' ? 'TIER_3_MICRO' : listingItem.tier === 'MACRO' ? 'TIER_2_MACRO' : 'TIER_1_CELEB',
        salaryGrade: listingItem.salaryGrade || 'KL3',
        segment: 'Mid Creator',
        tepKenh: 'Mẹ bé (bé)',
        kocCategory: 'Mom and baby',
        contentPillar: 'Review trực tiếp',
        brandApprovalStatus: 'ĐÃ_DUYỆT',
        pipelineText: 'Chờ lên sóng bài review',
        status: 'TERMS_AGREED',
        statusLabel: 'Đã chốt điều khoản',
        currentStage: '4_AIR_GROWTH',
        holdingTeam: 'BOOKING',
        adsCodeStatus: listingItem.sparkAdsCode ? 'ĐÃ_NGHIỆM_THU' : 'CHƯA_CẤP',
        sparkAdsCode: listingItem.sparkAdsCode,
        assignedStaff: listingItem.assignedStaffName,
        totalValue: fee,
        advanceAmount: Math.round(fee * 0.5),
        finalAmount: Math.round(fee * 0.5),
        deadlinePost: listingItem.expectedAirDate || '2026-10-15',
        viewsCount: 0,
        affiliateGmv: 0,
        gmv30: 0,
        roi: 0,
        publishedDays: 0,
        remainingSlaHours: 48,
        isSlaWarning: false,
        accountComment: `Tự động sinh từ Đợt Listing ${listingItem.batchCycle} tháng ${listingItem.monthKey} (${listingItem.salaryGrade || 'KL3'} · Plan ${listingItem.sourcePlanVersion || 'v1.0'})`
      };
      setDeals(prev => [newDeal, ...prev]);
      showToast(`Đã tự động tạo Deal ${newDeal.dealCode} (${newDeal.salaryGrade}) cho KOC ${newDeal.kocStageName}`, 'success');
    }
  };

  // Modals
  const [isQuickBookOpen, setIsQuickBookOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  // Mở hồ sơ hợp đồng của một deal (từ Booking, Tổng quan, Việc của tôi).
  const [contractIntent, setContractIntent] = useState<ContractIntent | null>(null);
  const openContractForDeal = (deal: BookingDealItem) => {
    setContractIntent({ dealId: deal.id, nonce: Date.now() });
    setActiveTab('contracts');
  };
  const [preselectedKoc, setPreselectedKoc] = useState<KocItem | null>(null);
  const [preselectedBrand, setPreselectedBrand] = useState<string | null>(null);

  // Mobile Drawer & Desktop Sidebar Collapse State
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('upbase_sidebar_collapsed') === 'true';
    }
    return false;
  });

  const handleToggleSidebarCollapse = useCallback(() => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('upbase_sidebar_collapsed', String(next));
      }
      return next;
    });
  }, []);

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
        storeName: item.storeName || `${item.brandName} Official Store`,
        productName: item.productName || `Combo Sản Phẩm Chủ Lực ${item.brandName}`,
        totalValue: item.budgetEstimated || 5000000,
        advanceAmount: Math.round((item.budgetEstimated || 5000000) * 0.2),
        finalAmount: Math.round((item.budgetEstimated || 5000000) * 0.8),
        salaryGrade: item.salaryGrade,
        segment: item.tier === 'TIER_1_CELEB' ? 'Top Creator' : item.tier === 'TIER_2_MACRO' ? 'Key Creator' : item.tier === 'TIER_3_MICRO' ? 'Mid Creator' : 'Massive Creator',
        tepKenh: item.tepKenh || 'Beauty',
        kocCategory: 'Personal care',
        contentPillar: (item.contentPillar as ContentPillarType) || 'Review trực tiếp',
        contentAngleId: item.contentAngleId,
        contentAngleName: item.contentAngleName,
        contentHook: item.contentHook,
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

  const handleGenerateDealsFromGrowthDemand = (demand: GrowthDemandItem) => {
    const newDealsGenerated: BookingDealItem[] = (demand.breakdown || []).flatMap((tierItem: GrowthDemandBreakdownTier, tIdx: number) => {
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
        salaryGrade: (tierItem.salaryGradeLabel?.split(' ')[0] as SalaryGrade) || 'KL4',
        segment: tierItem.tier === 'TIER_1_CELEB' ? 'Top Creator' : tierItem.tier === 'TIER_2_MACRO' ? 'Key Creator' : tierItem.tier === 'TIER_3_MICRO' ? 'Mid Creator' : 'Massive Creator',
        tepKenh: 'Beauty',
        kocCategory: (demand.brandCategory?.split('/')[0]?.trim() as KocCategory) || 'Personal care',
        contentPillar: 'Review trực tiếp',
        status: 'DRAFT' as DealStatus,
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

  const handleUpdateTask = (updatedTask: SlaTask) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
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

  const handleContributorCreated = (newCtv: Contributor) => {
    setContributors(prev => [newCtv, ...prev]);
    showToast(`Đã thêm CTV / VJ ${newCtv.name} vào danh bạ`);
  };

  const handleContributorUpdated = (updatedCtv: Contributor) => {
    setContributors(prev => prev.map(c => c.id === updatedCtv.id ? updatedCtv : c));
    showToast(`Đã cập nhật hồ sơ CTV / VJ ${updatedCtv.name}`);
  };

  const handleContributorDeleted = (ctvId: string) => {
    setContributors(prev => prev.filter(c => c.id !== ctvId));
    showToast('Đã xóa CTV / VJ khỏi danh sách');
  };

  const handleTaskActionClick = (task: SlaTask) => {
    if (task.dealCode) {
      const matched = deals.find(d => d.dealCode === task.dealCode);
      if (matched) {
        openContractForDeal(matched);
        return;
      }
    }
    if (task.type === 'RESEARCH_TASK' || task.taskCategory) {
      setActiveTab('task-delegation');
      return;
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

  // Tiêu đề trang: khớp 100% tên trên menu trái (DESIGN_SYSTEM.md §7 Quy tắc 1)
  const titles: Record<TabKey, { title: string; subtitle: string }> = {
    cockpit: { title: 'Việc của tôi', subtitle: '' },
    overview: { title: 'Tổng quan', subtitle: '' },
    'input-plan': { title: 'Kế hoạch tháng', subtitle: '' },
    'koc-listing': { title: 'Đề xuất KOC', subtitle: '' },
    'self-channel-hub': { title: 'Cổng cộng tác viên', subtitle: '' },
    'ctv-master': { title: 'Danh bạ CTV / VJ', subtitle: '' },
    'master-data': { title: 'Dữ liệu gốc', subtitle: '' },
    'push-products': { title: 'Sản phẩm đẩy', subtitle: '' },
    stores: { title: 'Hồ sơ gian hàng', subtitle: '' },
    campaigns: { title: 'Duyệt với nhãn hàng', subtitle: '' },
    'brand-knowledge': { title: 'Hồ sơ thương hiệu', subtitle: '' },
    content: { title: 'Kịch bản & video', subtitle: '' },
    'content-angles': { title: 'Góc tiếp cận', subtitle: '' },
    'partner-access': { title: 'Phân quyền', subtitle: '' },
    booking: { title: 'Booking', subtitle: '' },
    'koc-master': { title: 'Danh bạ KOC', subtitle: '' },
    contracts: { title: 'Hợp đồng & thanh toán', subtitle: '' },
    manager: { title: 'Phân bổ & điều phối', subtitle: '' },
    'task-delegation': { title: 'Giao việc & định mức', subtitle: '' },
    'workload-3d': { title: 'Bản đồ 3D & Workload', subtitle: '' },
    'sample-tracker': { title: 'Hàng mẫu & Ads', subtitle: '' },
    'performance-p3': { title: 'Đánh giá 4P', subtitle: '' },
    leaderboard: { title: 'Bảng xếp hạng', subtitle: '' },
    'brand-hub': { title: 'Cổng nhãn hàng', subtitle: '' },
    'koc-hub': { title: 'Cổng KOC', subtitle: '' },
    'ads-report': { title: 'Báo cáo Ads TikTok', subtitle: '' },
    'dashboard-bi': { title: 'Báo cáo tổng hợp', subtitle: '' },
    'dashboard-brand': { title: 'Ngân sách & PnL', subtitle: '' },
    'dashboard-store': { title: 'Gian hàng & Sàn', subtitle: '' },
    'dashboard-video': { title: 'Hiệu quả video', subtitle: '' },
    'dashboard-team-sla': { title: 'Lịch đăng video', subtitle: '' },
    'dashboard-staff': { title: 'Hiệu suất nhân sự', subtitle: '' },
    'dashboard-finance': { title: 'Đối soát & xuất file', subtitle: '' },
    'dashboard-air-sync': { title: 'Lịch đăng video', subtitle: '' },
    'api-settings': { title: 'Cấu hình API', subtitle: '' },
    'knowledge-qa': { title: 'Sổ tay & Hỏi đáp', subtitle: '' },
    'audit-trail': { title: 'Nhật ký kiểm toán', subtitle: '' },
    'tiktok-crawler': { title: 'Crawler KOC & Đối thủ', subtitle: '' },
    'market-research': { title: 'Nghiên cứu Brand & Đối thủ', subtitle: '' },
  };

  if (isLoadingAuth || !currentUser) {
    return (
      // Khung ứng dụng giữ chỗ (menu trái + thanh trên + nội dung) thay cho vòng xoay toàn trang.
      <div role="status" aria-live="polite" className="min-h-screen bg-canvas flex">
        <span className="sr-only">Đang xác minh phiên làm việc…</span>
        <div aria-hidden="true" className="hidden lg:flex w-60 shrink-0 h-dvh flex-col bg-surface border-r border-line">
          <div className="h-14 px-4 flex items-center border-b border-line"><Skeleton className="h-6 w-32 rounded-md" /></div>
          <div className="p-3 grid gap-3">
            {Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="h-5" style={{ width: `${55 + ((i * 17) % 35)}%` }} />)}
          </div>
        </div>
        <div aria-hidden="true" className="flex-1 min-w-0">
          <div className="h-14 px-6 flex items-center bg-surface border-b border-line"><Skeleton className="h-6 w-48 rounded-md" /></div>
          <div className="px-4 sm:px-6 lg:px-8 py-6"><ViewLoading /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-canvas text-ink">
      <ToastStack
        toasts={toastQueue.toasts}
        onDismiss={toastQueue.dismiss}
        onPause={toastQueue.pause}
        onResume={toastQueue.resume}
      />

      {/* Sidebar Navigation (with Mobile Drawer & Desktop Collapse Support) */}
      <Sidebar
        activeTab={activeTab}
        onTabSelect={handleSelectTab}
        currentUser={currentUser}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebarCollapse}
        onLogout={handleLogout}
        badgeCounts={pendingTasksCount > 0 ? { cockpit: pendingTasksCount } : undefined}
      />

      {/* Main Content Space */}
      <div className={`flex-1 flex flex-col min-w-0 transition-[padding] duration-200 ${isSidebarCollapsed ? 'lg:pl-0' : 'lg:pl-60'}`}>
        <TopHeader
          currentUser={currentUser}
          onUserChange={handleUserChange}
          selectedBrand={selectedBrandContext}
          onBrandChange={setSelectedBrandContext}
          onOpenQuickBook={() => {
            setPreselectedKoc(null);
            setIsQuickBookOpen(true);
          }}
          onOpenImport={() => setIsImportOpen(true)}
          title={titles[activeTab]?.title ?? 'Bàn điều phối vận hành'}
          subtitle={titles[activeTab]?.subtitle ?? ''}
          activeTab={activeTab}
          onNavigateTab={handleSelectTab}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={handleToggleSidebarCollapse}
          onLogout={handleLogout}
          userScopeSummary={userScopeSummary}
        />

        {isThirdPartyPartner(currentUser) && (
          <div className="bg-accent-soft text-ink px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs border-b border-line">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-surface text-accent font-medium text-2xs border border-line">
                Đối tác: {currentUser.roleTitle}
              </span>
              <span className="text-ink-2">
                Đang xem với tư cách: <strong className="text-ink font-semibold">{currentUser.name}</strong> ({currentUser.email})
                {currentUser.linkedEntityName && (
                  <span className="text-accent font-medium"> · Phạm vi: {currentUser.linkedEntityName}</span>
                )}
              </span>
            </div>
            <button
              onClick={() => {
                handleUserChange(USERS[0]);
                setActiveTab('partner-access');
                showToast('Đã quay lại tài khoản quản trị', 'info');
              }}
              className="h-7 px-2.5 rounded-md bg-surface hover:bg-sunken text-ink border border-line-strong font-medium transition text-2xs"
            >
              Thoát chế độ đối tác
            </button>
          </div>
        )}

        <main id="workspace" className={`px-3 sm:px-4 lg:px-6 py-4 sm:py-5 w-full mx-auto space-y-5 ${isSidebarCollapsed ? 'max-w-[1800px]' : 'max-w-[1600px]'}`}>
          {!isTabAllowedForRole(currentUser.role, activeTab) ? (
            <div className="p-8 sm:p-12 rounded-2xl bg-surface border border-line text-center max-w-lg mx-auto my-12 space-y-4 animate-in fade-in">
              <div className="w-14 h-14 rounded-2xl bg-critical-soft text-critical flex items-center justify-center mx-auto border border-line">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-semibold text-ink">Không có quyền truy cập màn hình này</h2>
                <p className="text-xs text-ink-2 leading-relaxed">
                  Tài khoản hiện tại <strong className="text-ink font-semibold">{currentUser.name}</strong> ({currentUser.roleTitle}) không có thẩm quyền truy cập màn hình <strong className="text-critical font-semibold">{titles[activeTab]?.title || activeTab}</strong>.
                </p>
                <div className="p-2.5 rounded-lg bg-sunken border border-line text-2xs text-ink-3">
                  Quy định bảo mật theo <strong className="font-medium">Ma trận phân quyền Upbase</strong>
                </div>
              </div>
              <div className="pt-2">
                <Button
                  variant="primary"
                  onClick={() => setActiveTab(getDefaultLandingTabForRole(currentUser.role))}
                >
                  Quay về màn hình chính ({titles[getDefaultLandingTabForRole(currentUser.role)]?.title || 'Trang chủ'})
                </Button>
              </div>
            </div>
          ) : (
            <>
          <KeepAliveTab tabKey="cockpit" currentTab={activeTab}>
            <CockpitView
              currentUser={currentUser}
              tasks={tasks}
              onCompleteTask={handleCompleteTask}
              onOpenQuickBook={() => {
                setPreselectedKoc(null);
                setIsQuickBookOpen(true);
              }}
              onSelectDeal={openContractForDeal}
              deals={deals}
              onTaskActionClick={handleTaskActionClick}
              onNavigateToInputPlan={() => setActiveTab('input-plan')}
              onNavigateToAirSync={() => setActiveTab('dashboard-air-sync')}
              onNavigateToTaskDelegation={() => setActiveTab('task-delegation')}
            />
          </KeepAliveTab>

          <KeepAliveTab tabKey="overview" currentTab={activeTab}>
            <OverviewView
              deals={deals}
              onOpenQuickBook={() => {
                setPreselectedKoc(null);
                setIsQuickBookOpen(true);
              }}
              onSelectDeal={openContractForDeal}
            />
          </KeepAliveTab>

          <KeepAliveTab
            tabKey="dashboard-bi"
            currentTab={
              [
                'dashboard-bi',
                'dashboard-brand',
                'dashboard-air-sync',
                'dashboard-store',
                'dashboard-video',
                'dashboard-team-sla',
                'dashboard-staff',
                'dashboard-finance'
              ].includes(activeTab)
                ? 'dashboard-bi'
                : activeTab
            }
          >
            <ExecutiveDashboardReportsView
              currentUser={currentUser}
              deals={scopedDeals}
              brands={scopedBrands}
              kocs={kocs}
              storePortfolios={scopedStores}
              activeSidebarTab={activeTab}
              onNotify={showToast}
              onNavigateToTab={(tabKey) => setActiveTab(tabKey as TabKey)}
            />
          </KeepAliveTab>

          <KeepAliveTab tabKey="input-plan" currentTab={activeTab}>
            <InputPlanBreakdownView
              currentUser={currentUser}
              storePortfolios={scopedStores}
              onUpdateStore={handleUpdateStore}
              campaigns={campaigns}
              onCampaignsChange={setCampaigns}
              onNotify={showToast}
              planDrilldownIntent={planDrilldownIntent}
              onGenerateDealsFromPlan={(newSlots) => {
                setDetailedPlans(prev => [...newSlots, ...prev]);
                showToast(`Đã tạo ${newSlots.length} slot KOC trong Booking`);
                setActiveTab('booking');
              }}
              onApplyPlanToWeeklyStore={(weeklyPlan) => {
                showToast(`Đã lưu kế hoạch ${weeklyPlan.storeName}, ${weeklyPlan.week}`);
              }}
              onOpenListingForPlan={(plan, grade) => {
                setListingPlanContext({
                  planId: plan.id,
                  storeName: plan.storeName || plan.brandName,
                  monthKey: plan.month,
                  salaryGrade: grade,
                  nonce: Date.now(),
                });
                setActiveTab('koc-listing');
                showToast(
                  `Đang mở bảng Listing KOC cho kế hoạch "${plan.storeName || plan.brandName}"${grade ? ` (Khung ${grade})` : ''}`
                );
              }}
              onPlansChange={setSharedMonthlyPlans}
            />
          </KeepAliveTab>

          <KeepAliveTab tabKey="koc-listing" currentTab={activeTab}>
            <KocListingBatchHubView
              listings={kocListings}
              onUpdateListings={setKocListings}
              onGenerateDeal={handleGenerateDealFromListing}
              currentRole={currentUser.role}
              currentUserName={currentUser.name}
              monthlyPlans={scopedMonthlyPlans}
              stores={scopedStores}
              kocs={kocs}
              deals={scopedDeals}
              activePlanContext={listingPlanContext}
              onOpenPlanStudio={() => setActiveTab('input-plan')}
            />
          </KeepAliveTab>

          <KeepAliveTab tabKey="master-data" currentTab={activeTab}>
            <MasterDataHubView
              currentUser={currentUser}
              brands={scopedBrands}
              stores={scopedStores}
              kocs={kocs}
              deals={scopedDeals}
              contributors={contributors}
              onNotify={showToast}
              onOpenQuickBookWithKoc={handleOpenQuickBookWithKoc}
              onKocCreated={handleKocCreated}
              onKocUpdated={handleKocUpdated}
              onContributorCreated={handleContributorCreated}
              onContributorUpdated={handleContributorUpdated}
              onContributorDeleted={handleContributorDeleted}
              onUpdateStore={handleUpdateStore}
              onNavigateToBrandProfile={(brandName) => {
                if (brandName && brandName !== 'ALL') {
                  setSelectedBrandContext(brandName);
                }
                setActiveTab('brand-knowledge');
              }}
              onNavigateToStoreProfile={(storeName) => {
                if (storeName) {
                  setSelectedStoreContext(storeName);
                }
                setActiveTab('stores');
              }}
              onNavigateToCtvProfile={(ctvId) => {
                setSelectedCtvContext(ctvId || null);
                setActiveTab('ctv-master');
              }}
              onNavigateToKocPortal={(kocId) => {
                setSelectedKocContext(kocId);
                setActiveTab('koc-hub');
              }}
              onSelectDealForContract={openContractForDeal}
            />
          </KeepAliveTab>

          <KeepAliveTab tabKey="push-products" currentTab={activeTab}>
            <PushProductsView
              currentUser={currentUser}
              brands={scopedBrands}
              onNotify={showToast}
            />
          </KeepAliveTab>

          <KeepAliveTab tabKey="self-channel-hub" currentTab={activeTab}>
            <SelfChannelCtvHubView
              currentUser={currentUser}
              brands={scopedBrands}
              contributors={contributors}
              tasks={selfChannelTasks}
              onTasksChange={setSelfChannelTasks}
              onContributorCreated={handleContributorCreated}
              onContributorUpdated={handleContributorUpdated}
              onOpenCtvProfile={(ctvId) => {
                setSelectedCtvContext(ctvId || null);
                setActiveTab('ctv-master');
              }}
              onOpenInputPlan={() => setActiveTab('input-plan')}
              onNotify={showToast}
              onOpenPushProducts={() => setActiveTab('push-products')}
              onNavigateToBrand={['ADMIN', 'MANAGER'].includes(currentUser.role) ? () => setActiveTab('campaigns') : undefined}
            />
          </KeepAliveTab>

          <KeepAliveTab tabKey="ctv-master" currentTab={activeTab}>
            <CtvManagementView
              contributors={contributors}
              tasks={selfChannelTasks}
              currentUser={currentUser}
              selectedCtvId={selectedCtvContext}
              onContributorCreated={handleContributorCreated}
              onContributorUpdated={handleContributorUpdated}
              onOpenSelfChannelHub={() => setActiveTab('self-channel-hub')}
              onNavigateBackToMaster={() => setActiveTab('master-data')}
              onNotify={showToast}
            />
          </KeepAliveTab>

          <KeepAliveTab tabKey="stores" currentTab={activeTab}>
            <StoreManagementView
              currentUser={currentUser}
              selectedStore={selectedStoreContext}
              stores={scopedStores}
              brands={scopedBrands}
              deals={scopedDeals}
              monthlyPlans={scopedMonthlyPlans}
              onNotify={showToast}
              onUpdateStore={handleUpdateStore}
              onDrilldownToPlan={handleDrilldownToPlan}
              onDrilldownToListing={handleDrilldownToListing}
              onDrilldownToBooking={handleDrilldownToBooking}
              onSelectDealForContract={openContractForDeal}
              onNavigateToBrandProfile={(brandName) => {
                if (brandName && brandName !== 'ALL') {
                  setSelectedBrandContext(brandName);
                }
                setActiveTab('brand-knowledge');
              }}
              onNavigateBackToMaster={() => {
                setActiveTab('master-data');
              }}
            />
          </KeepAliveTab>

          <KeepAliveTab tabKey="campaigns" currentTab={activeTab}>
            <BrandView
              campaigns={campaigns}
              onCampaignsChange={setCampaigns}
              onCampaignCreatedNotification={handleCampaignCreatedNotification}
              onTriggerHandoffNotification={handleTriggerHandoffNotification}
              onNavigateToCtvHub={() => setActiveTab('self-channel-hub')}
              onNavigateToBrandKnowledge={(brandName) => {
                if (brandName) {
                  setSelectedBrandContext(brandName);
                }
                setActiveTab('brand-knowledge');
              }}
            />
          </KeepAliveTab>

          <KeepAliveTab tabKey="brand-knowledge" currentTab={activeTab}>
            <BrandProfilesView
              currentUser={currentUser}
              selectedBrand={selectedBrandContext}
              brands={scopedBrands}
              stores={scopedStores}
              deals={scopedDeals}
              monthlyPlans={scopedMonthlyPlans}
              onNotify={showToast}
              onOpenBooking={() => setActiveTab('booking')}
              onUpdateStore={handleUpdateStore}
              onDrilldownToPlan={handleDrilldownToPlan}
              onDrilldownToListing={handleDrilldownToListing}
              onDrilldownToBooking={handleDrilldownToBooking}
              onSelectDealForContract={openContractForDeal}
              onNavigateToStoreProfile={(storeName) => {
                if (storeName) {
                  setSelectedStoreContext(storeName);
                }
                setActiveTab('stores');
              }}
            />
          </KeepAliveTab>

          <KeepAliveTab tabKey="content" currentTab={activeTab}>
            <ContentView
              onScriptApprovedNotification={handleScriptApprovedNotification}
              onNavigateToAngles={() => setActiveTab('content-angles')}
            />
          </KeepAliveTab>

          <KeepAliveTab tabKey="content-angles" currentTab={activeTab}>
            <ContentAngleSetupView
              currentUser={currentUser}
              onNotify={showToast}
              onSelectAngleForBooking={(angle) => {
                setActiveTab('booking');
                showToast(`Đã chọn góc kịch bản "${angle.name}" cho Booking`);
              }}
            />
          </KeepAliveTab>

          <KeepAliveTab tabKey="partner-access" currentTab={activeTab}>
            <CentralizedRbacHubView
              currentUser={currentUser}
              brands={brands}
              kocs={kocs}
              onNotify={showToast}
              onImpersonateUser={(user) => {
                handleUserChange(user);
              }}
              onImpersonatePartner={(partnerUser) => {
                handleUserChange(partnerUser);
              }}
            />
          </KeepAliveTab>

          <KeepAliveTab tabKey="booking" currentTab={activeTab}>
            <BookingView 
              deals={scopedDeals}
              kocs={kocs}
              currentUser={currentUser}
              selectedBrand={selectedBrandContext}
              bookingDrilldownIntent={bookingDrilldownIntent}
              onOpenQuickBookWithKoc={handleOpenQuickBookWithKoc}
              onOpenQuickBook={() => {
                setPreselectedKoc(null);
                setIsQuickBookOpen(true);
              }}
              onOpenImport={() => setIsImportOpen(true)}
              onSelectDealForContract={openContractForDeal}
              onUpdateDeal={handleUpdateDeal}
              onKocCreated={handleKocCreated}
              planItems={detailedPlans}
              onAddPlanItem={handleAddPlanItem}
              onUpdatePlanItem={handleUpdatePlanItem}
              onDeletePlanItem={handleDeletePlanItem}
              onSubmitPlanToLead={handleSubmitPlanToLead}
              onConvertPlanItemToDeal={handleConvertPlanItemToDeal}
              staffAllocations={staffAllocations['2026/10'] || staffAllocations['2026/09']}
              currentUserName={currentUser.name}
              onOpenInputPlan={() => setActiveTab('input-plan')}
            />
          </KeepAliveTab>

          <KeepAliveTab tabKey="koc-master" currentTab={activeTab}>
            <KocMasterDataView
              kocs={kocs}
              allDeals={scopedDeals}
              currentUser={currentUser}
              selectedBrand={selectedBrandContext}
              selectedKocId={selectedKocContext}
              onOpenQuickBookWithKoc={handleOpenQuickBookWithKoc}
              onKocCreated={handleKocCreated}
              onKocUpdated={handleKocUpdated}
              onOpenKocPortal={(kocId: string | null) => {
                setSelectedKocContext(kocId);
                setActiveTab('koc-hub');
              }}
              onSelectDealForContract={openContractForDeal}
              onNotify={showToast}
            />
          </KeepAliveTab>

          <KeepAliveTab tabKey="contracts" currentTab={activeTab}>
            <ContractManagementView deals={scopedDeals} kocs={kocs} intent={contractIntent} onNotify={showToast} currentUserId={currentUser.id} />
          </KeepAliveTab>

          <KeepAliveTab tabKey="sample-tracker" currentTab={activeTab}>
            <SampleTrackerView
              deals={scopedDeals}
              currentUser={currentUser}
              onNotify={showToast}
              onUpdateDealWithSparkAds={(dealCode, sparkCode) => {
                setDeals(prev => prev.map(d => d.dealCode === dealCode ? {
                  ...d,
                  adsCodeStatus: 'ĐÃ_NGHIỆM_THU',
                  sparkAdsCode: sparkCode,
                  pipelineText: 'Đã có Spark Ads'
                } : d));
              }}
            />
          </KeepAliveTab>

          <KeepAliveTab tabKey="manager" currentTab={activeTab}>
            <ManagerView
              currentUser={currentUser}
              deals={scopedDeals}
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
              brands={scopedBrands}
              onUpdateBrand={handleUpdateBrand}
              onAddBrand={handleAddBrand}
              storePortfolios={scopedStores}
              onUpdateStore={handleUpdateStore}
              tasks={tasks}
              onAddTask={handleAddTask}
              onNavigateToTab={(tabKey) => setActiveTab(tabKey as TabKey)}
            />
          </KeepAliveTab>

          <KeepAliveTab tabKey="task-delegation" currentTab={activeTab}>
            <TaskDelegationView
              currentUser={currentUser}
              tasks={tasks}
              brands={scopedBrands}
              storePortfolios={scopedStores}
              onAddTask={handleAddTask}
              onCompleteTask={handleCompleteTask}
              onUpdateTask={handleUpdateTask}
              onPingStaff={handlePingStaffNotification}
              onNotify={showToast}
            />
          </KeepAliveTab>

          <KeepAliveTab tabKey="workload-3d" currentTab={activeTab}>
            <Workload3dMapView
              currentUser={currentUser}
              brands={scopedBrands}
              storePortfolios={scopedStores}
              tasks={tasks}
              deals={scopedDeals}
              onUpdateBrand={handleUpdateBrand}
              onUpdateStore={handleUpdateStore}
              onAddTask={handleAddTask}
              onPingStaff={handlePingStaffNotification}
              onNotify={showToast}
              onNavigateToTab={(tabKey) => setActiveTab(tabKey)}
              onNavigateToBrandProfile={(brandName) => {
                if (brandName && brandName !== 'ALL') {
                  setSelectedBrandContext(brandName);
                }
                setActiveTab('brand-knowledge');
              }}
              onNavigateToStoreProfile={(storeName) => {
                if (storeName) {
                  setSelectedStoreContext(storeName);
                }
                setActiveTab('stores');
              }}
            />
          </KeepAliveTab>

          <KeepAliveTab tabKey="performance-p3" currentTab={activeTab}>
            <PerformanceP3View
              storePortfolios={scopedStores}
              deals={scopedDeals}
              currentUser={currentUser}
              onNotify={showToast}
              onUpdateStoreDifficulty={(storeId, multiplier, tier) => {
                setStorePortfolios(prev => prev.map(s => s.id === storeId ? {
                  ...s,
                  difficultyMultiplier: multiplier,
                  difficultyTier: tier
                } : s));
              }}
            />
          </KeepAliveTab>

          <KeepAliveTab tabKey="leaderboard" currentTab={activeTab}>
            <LeaderboardView />
          </KeepAliveTab>

          <KeepAliveTab tabKey="brand-hub" currentTab={activeTab}>
            <BrandHubView
              currentUser={currentUser}
              deals={scopedDeals}
              brands={scopedBrands}
              stores={scopedStores}
              onUpdateStore={handleUpdateStore}
              onOpenBooking={() => setActiveTab('booking')}
              onNavigateToBrandProfile={(brandName: string) => {
                if (brandName && brandName !== 'ALL') {
                  setSelectedBrandContext(brandName);
                }
                setActiveTab('brand-knowledge');
              }}
              onNavigateToStoreProfile={(storeName: string) => {
                if (storeName) {
                  setSelectedStoreContext(storeName);
                }
                setActiveTab('stores');
              }}
              selectedBrand={selectedBrandContext}
              onNotify={showToast}
              onNavigateToCtvHub={['ADMIN', 'MANAGER'].includes(currentUser.role) ? () => setActiveTab('self-channel-hub') : undefined}
              onNavigateToKocHub={['ADMIN', 'MANAGER'].includes(currentUser.role) ? () => setActiveTab('koc-hub') : undefined}
              onBrandApproveDeal={(kocOrDeal) => {
                setDeals(prev => prev.map(d => 
                  (d.kocStageName.toLowerCase().includes(kocOrDeal.toLowerCase()) || d.dealCode === kocOrDeal)
                    ? { ...d, brandApprovalStatus: 'ĐÃ_DUYỆT' }
                    : d
                ));
              }}
              onBrandRejectDeal={(kocOrDeal) => {
                setDeals(prev => prev.map(d => 
                  (d.kocStageName.toLowerCase().includes(kocOrDeal.toLowerCase()) || d.dealCode === kocOrDeal)
                    ? { ...d, brandApprovalStatus: 'TỪ_CHỐI' }
                    : d
                ));
              }}
            />
          </KeepAliveTab>

          <KeepAliveTab tabKey="koc-hub" currentTab={activeTab}>
            <KocKolHubView
              currentUser={currentUser}
              brands={scopedBrands}
              initialKocs={kocs}
              initialDeals={scopedDeals}
              selectedKocId={selectedKocContext}
              onKocUpdated={handleKocUpdated}
              onUpdateDeal={handleUpdateDeal}
              onOpenContractForDeal={openContractForDeal}
              onOpenKocMaster={(kocId: string | null) => {
                setSelectedKocContext(kocId);
                setActiveTab('koc-master');
              }}
              onNotify={showToast}
              onNavigateToBrandHub={['ADMIN', 'MANAGER'].includes(currentUser.role) ? () => setActiveTab('brand-hub') : undefined}
              onNavigateToCtvHub={['ADMIN', 'MANAGER'].includes(currentUser.role) ? () => setActiveTab('self-channel-hub') : undefined}
            />
          </KeepAliveTab>

          <KeepAliveTab tabKey="ads-report" currentTab={activeTab}>
            <WeeklyAdsReportHubView
              currentUser={currentUser}
              kocs={kocs}
              deals={scopedDeals}
              onNotify={showToast}
              onUpdateKocsWithAdsData={(updated) => setKocs(updated)}
              onUpdateDealsWithAdsData={(updated) => setDeals(updated)}
            />
          </KeepAliveTab>

          <KeepAliveTab tabKey="api-settings" currentTab={activeTab}>
            <ApiKeySetupView
              currentUser={currentUser}
              onNotify={showToast}
            />
          </KeepAliveTab>

          <KeepAliveTab tabKey="knowledge-qa" currentTab={activeTab}>
            <MarketingKnowledgeQaView
              currentUser={currentUser}
              brands={brands}
              stores={storePortfolios}
              kocs={kocs}
              onNotify={showToast}
              onNavigateToTab={(tab) => setActiveTab(tab)}
            />
          </KeepAliveTab>

          <KeepAliveTab tabKey="audit-trail" currentTab={activeTab}>
            <AuditTrailView
              currentUser={currentUser}
              onNotify={showToast}
            />
          </KeepAliveTab>

          {activeTab === 'tiktok-crawler' && (
            <div className="workspace-view space-y-6">
              <PageActiveContext.Provider value={true}>
                <ErrorBoundary fallbackTitle="Lỗi tải màn hình (tiktok-crawler)">
                  <TikTokCrawlerHubView
                    key={crawlerResetKey}
                    kocs={kocs}
                    onSaveScrapedKocs={({ created, updated }) => {
                      if (created.length > 0 || updated.length > 0) {
                        setKocs((prev) => {
                          const updatedMap = new Map(updated.map((u) => [u.id, u]));
                          const next = prev.map((item) => updatedMap.get(item.id) || item);
                          return [...created, ...next];
                        });
                        showToast(
                          `Đã lưu vào Danh bạ KOC: ${created.length} kênh mới, ${updated.length} kênh cập nhật`,
                          'success'
                        );
                      }
                    }}
                    onNotify={showToast}
                    onNavigateToKocMaster={() => handleSelectTab('koc-master')}
                  />
                </ErrorBoundary>
              </PageActiveContext.Provider>
            </div>
          )}

          <KeepAliveTab tabKey="market-research" currentTab={activeTab}>
            <BrandMarketResearchHubView
              brands={scopedBrands}
              kocs={kocs}
              selectedBrand={selectedBrandContext}
              onSaveScrapedKocs={({ created, updated }) => {
                if (created.length > 0 || updated.length > 0) {
                  setKocs((prev) => {
                    const updatedMap = new Map(updated.map((u) => [u.id, u]));
                    const next = prev.map((item) => updatedMap.get(item.id) || item);
                    return [...created, ...next];
                  });
                  showToast(
                    `Đã lưu vào Danh bạ KOC: ${created.length} kênh mới, ${updated.length} kênh cập nhật`,
                    'success'
                  );
                }
              }}
              onNavigateToBrandProfile={(brandName) => {
                if (brandName && brandName !== 'ALL') {
                  setSelectedBrandContext(brandName);
                }
                setActiveTab('brand-knowledge');
              }}
              onNavigateToContentAngles={() => setActiveTab('content-angles')}
              onNotify={showToast}
            />
          </KeepAliveTab>
            </>
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

    </div>
  );
}
