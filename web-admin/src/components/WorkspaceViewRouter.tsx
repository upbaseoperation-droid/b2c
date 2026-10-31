'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { ErrorBoundary } from './ErrorBoundary';
import { CockpitView } from './views/CockpitView';
import { DASHBOARD_EXEC_TAB_KEYS } from '../lib/navGroups';
import { PageActiveContext } from './ui';
import {
  getKocLegalProfiles,
  mergeLegalDocAttachments,
  saveSyncedKocLegalAttachments,
} from './koc/kocUtils';
import type { TabKey } from './Sidebar';
import type { ContractIntent } from './views/ContractManagementView';
import type { ContractDocument } from '../lib/planDealLink';
import type { ListingPlanContext } from './views/KocListingBatchHubView';
import type { StoreSheetSetupTabKey } from './views/StoreStaffSheetSetupView';
import type {
  UserProfile,
  BookingDealItem,
  SlaTask,
  KocItem,
  Contributor,
  CampaignItem,
  StaffDetailedPlanItem,
  MonthlyStaffAllocation,
  StaffPlanStatus,
  BrandDetail,
  StorePortfolioItem,
  KocListingItem,
  SalaryGrade,
  InputPlanBreakdownState,
  WeeklyStorePlan411,
  GrowthDemandItem,
} from '../lib/types';
import type { useCtvDirectory } from '../lib/useCtvDirectory';
import { Skeleton } from './ui';

/** Khung giữ chỗ khi màn đang tải gói: đúng hình dạng màn (thanh lọc → hàng chỉ số → bảng), DESIGN_SYSTEM.md §9. */
export function ViewLoading() {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <span className="sr-only">Đang chuẩn bị không gian làm việc…</span>
      <div aria-hidden="true" className="flex items-center gap-3">
        <Skeleton className="h-8 w-56 rounded-md" />
        <Skeleton className="h-8 w-32 rounded-md" />
      </div>
      <div aria-hidden="true" className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-line border border-line rounded-xl overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-surface px-4 pt-4 pb-4 grid gap-3">
            <Skeleton className="w-24" />
            <Skeleton className="h-7 w-32 rounded-md" />
            <Skeleton className="w-20" />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="bg-surface border border-line rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-line">
          <Skeleton className="h-8 w-full max-w-[18rem] rounded-md" />
        </div>
        <div className="divide-y divide-line p-4 space-y-3">
          {[0, 1, 2, 3, 4, 5].map((r) => (
            <div key={r} className="grid grid-cols-5 gap-4 pt-3 first:pt-0">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-full rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const ExecutiveDashboardReportsView = dynamic(
  () => import('./views/ExecutiveDashboardReportsView').then((m) => m.ExecutiveDashboardReportsView),
  { loading: ViewLoading }
);
const BrandProfilesView = dynamic(
  () => import('./views/BrandProfilesView').then((m) => m.BrandProfilesView),
  { loading: ViewLoading }
);
const ContentView = dynamic(
  () => import('./views/ContentView').then((m) => m.ContentView),
  { loading: ViewLoading }
);
const ManagerView = dynamic(
  () => import('./views/ManagerView').then((m) => m.ManagerView),
  { loading: ViewLoading }
);
const InputPlanBreakdownView = dynamic(
  () => import('./views/InputPlanBreakdownView').then((m) => m.InputPlanBreakdownView),
  { loading: ViewLoading }
);
const SelfChannelCtvHubView = dynamic(
  () => import('./views/SelfChannelCtvHubView').then((m) => m.SelfChannelCtvHubView),
  { loading: ViewLoading }
);
const KocKolHubView = dynamic(
  () => import('./views/KocKolHubView').then((m) => m.KocKolHubView),
  { loading: ViewLoading }
);
const CentralizedRbacHubView = dynamic(
  () => import('./views/CentralizedRbacHubView').then((m) => m.CentralizedRbacHubView),
  { loading: ViewLoading }
);
const MasterDataHubView = dynamic(
  () => import('./views/MasterDataHubView').then((m) => m.MasterDataHubView),
  { loading: ViewLoading }
);
const KocListingBatchHubView = dynamic(
  () => import('./views/KocListingBatchHubView').then((m) => m.KocListingBatchHubView),
  { loading: ViewLoading }
);
const KocMasterDataView = dynamic(
  () => import('./views/KocMasterDataView').then((m) => m.KocMasterDataView),
  { loading: ViewLoading }
);
const ContractManagementView = dynamic(
  () => import('./views/ContractManagementView').then((m) => m.ContractManagementView),
  { loading: ViewLoading }
);
const WeeklyAdsReportHubView = dynamic(
  () => import('./views/WeeklyAdsReportHubView').then((m) => m.WeeklyAdsReportHubView),
  { loading: ViewLoading }
);
const ApiKeySetupView = dynamic(
  () => import('./views/ApiKeySetupView').then((m) => m.ApiKeySetupView),
  { loading: ViewLoading }
);
const MarketingKnowledgeQaView = dynamic(
  () => import('./views/MarketingKnowledgeQaView').then((m) => m.MarketingKnowledgeQaView),
  { loading: ViewLoading }
);
const TaskDelegationView = dynamic(
  () => import('./views/TaskDelegationView').then((m) => m.TaskDelegationView),
  { loading: ViewLoading }
);
const TikTokCrawlerHubView = dynamic(
  () => import('./views/TikTokCrawlerHubView').then((m) => m.TikTokCrawlerHubView),
  { loading: ViewLoading }
);
const BrandMarketResearchHubView = dynamic(
  () => import('./views/BrandMarketResearchHubView').then((m) => m.BrandMarketResearchHubView),
  { loading: ViewLoading }
);
const LarkAcceptancePaymentHubView = dynamic(
  () => import('./views/LarkAcceptancePaymentHubView').then((m) => m.LarkAcceptancePaymentHubView),
  { loading: ViewLoading }
);

export function prefetchViewTab(tab: TabKey) {
  switch (tab) {
    case 'dashboard-bi':
    case 'dashboard-brand':
    case 'overview':
    case 'dashboard-video':
    case 'dashboard-team-sla':
    case 'dashboard-staff':
      void import('./views/ExecutiveDashboardReportsView');
      break;
    case 'input-plan':
      void import('./views/InputPlanBreakdownView');
      break;
    case 'koc-listing':
    case 'multi-platform-booking':
    case 'livestream-booking':
      void import('./views/KocListingBatchHubView');
      break;
    case 'contracts':
      void import('./views/ContractManagementView');
      break;
    case 'brand-knowledge':
      void import('./views/BrandProfilesView');
      break;
    case 'master-data':
      void import('./views/MasterDataHubView');
      break;
    case 'koc-master':
      void import('./views/KocMasterDataView');
      break;
    case 'tiktok-crawler':
      void import('./views/TikTokCrawlerHubView');
      break;
    case 'market-research':
      void import('./views/BrandMarketResearchHubView');
      break;
    case 'task-delegation':
      void import('./views/TaskDelegationView');
      break;
    case 'content':
      void import('./views/ContentView');
      break;
    case 'self-channel-hub':
      void import('./views/SelfChannelCtvHubView');
      break;
    case 'lark-settlement':
      void import('./views/LarkAcceptancePaymentHubView');
      break;
    case 'manager':
      void import('./views/ManagerView');
      break;
    case 'ads-report':
      void import('./views/WeeklyAdsReportHubView');
      break;
    case 'knowledge-qa':
      void import('./views/MarketingKnowledgeQaView');
      break;
    case 'partner-access':
      void import('./views/CentralizedRbacHubView');
      break;
    case 'api-settings':
      void import('./views/ApiKeySetupView');
      break;
    case 'koc-hub':
      void import('./views/KocKolHubView');
      break;
  }
}

const FrozenTabBody = React.memo(
  function FrozenTabBody({
    tabKey,
    children,
  }: {
    isActive: boolean;
    tabKey: TabKey;
    children: React.ReactNode;
  }) {
    return (
      <ErrorBoundary fallbackTitle={`Lỗi tải màn hình (${tabKey})`}>
        {children}
      </ErrorBoundary>
    );
  },
  (_prev, next) => !next.isActive
);

function KeepAliveTab({
  tabKey,
  currentTab,
  children,
}: {
  tabKey: TabKey;
  currentTab: TabKey;
  children: React.ReactNode;
}) {
  const isActive = tabKey === currentTab;
  const [hasMounted, setHasMounted] = useState(isActive);
  if (isActive && !hasMounted) {
    setHasMounted(true);
  }

  if (!hasMounted) return null;
  return (
    <div
      style={{ display: isActive ? 'block' : 'none' }}
      className="workspace-view space-y-6"
    >
      <PageActiveContext.Provider value={isActive}>
        <FrozenTabBody isActive={isActive} tabKey={tabKey}>
          {children}
        </FrozenTabBody>
      </PageActiveContext.Provider>
    </div>
  );
}

export interface WorkspaceViewRouterProps {
  activeTab: TabKey;
  currentUser: UserProfile;
  tasks: SlaTask[];
  deals: BookingDealItem[];
  scopedDeals: BookingDealItem[];
  brands: BrandDetail[];
  scopedBrands: BrandDetail[];
  storePortfolios: StorePortfolioItem[];
  scopedStores: StorePortfolioItem[];
  kocs: KocItem[];
  kocListings: KocListingItem[];
  scopedMonthlyPlans: InputPlanBreakdownState[];
  campaigns: CampaignItem[];
  detailedPlans: StaffDetailedPlanItem[];
  staffAllocations: Record<string, MonthlyStaffAllocation[]>;
  contributors: Contributor[];
  ctvAccess: ReturnType<typeof useCtvDirectory>['access'];
  partnershipStaff: ReturnType<typeof useCtvDirectory>['partnershipStaff'];
  onSavePartnershipStaff: ReturnType<typeof useCtvDirectory>['savePartnershipStaff'];
  selectedBrandContext: string;
  selectedCtvContext: string | null;
  selectedKocContext: string | null;
  brandInitialDetailTab?: 'PRODUCTS';
  kocMasterReturnTab: 'tiktok-crawler' | 'koc-hub' | null;
  kocMasterOpenTrigger: number;
  apiSettingsSheetSubTab: StoreSheetSetupTabKey;
  planDrilldownIntent: {
    planId?: string;
    storeId?: string;
    storeName?: string;
    brandName?: string;
    month?: string;
    nonce: number;
  } | null;
  listingPlanContext: ListingPlanContext | null;
  bookingNavFocus: {
    tab: string;
    storeName?: string;
    monthKey?: string;
    dealCode?: string;
    planId?: string;
    nonce: number;
  } | null;
  contractIntent: ContractIntent | null;
  setActiveTab: React.Dispatch<React.SetStateAction<TabKey>>;
  handleSelectTab: (tab: TabKey, options?: { keepReturnContext?: boolean }) => void;
  setSelectedBrandContext: React.Dispatch<React.SetStateAction<string>>;
  setSelectedStoreContext: React.Dispatch<React.SetStateAction<string>>;
  setSelectedCtvContext: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedKocContext: React.Dispatch<React.SetStateAction<string | null>>;
  setBrandInitialDetailTab: React.Dispatch<React.SetStateAction<'PRODUCTS' | undefined>>;
  setKocMasterReturnTab: React.Dispatch<React.SetStateAction<'tiktok-crawler' | 'koc-hub' | null>>;
  setKocMasterOpenTrigger: React.Dispatch<React.SetStateAction<number>>;
  setApiSettingsSheetSubTab: React.Dispatch<React.SetStateAction<StoreSheetSetupTabKey>>;
  setListingPlanContext: React.Dispatch<React.SetStateAction<ListingPlanContext | null>>;
  setBookingNavFocus: React.Dispatch<
    React.SetStateAction<{
      tab: string;
      storeName?: string;
      monthKey?: string;
      dealCode?: string;
      planId?: string;
      nonce: number;
    } | null>
  >;
  setDeals: React.Dispatch<React.SetStateAction<BookingDealItem[]>>;
  setKocs: React.Dispatch<React.SetStateAction<KocItem[]>>;
  setKocListings: React.Dispatch<React.SetStateAction<KocListingItem[]>>;
  setCampaigns: React.Dispatch<React.SetStateAction<CampaignItem[]>>;
  setDetailedPlans: React.Dispatch<React.SetStateAction<StaffDetailedPlanItem[]>>;
  setStaffAllocations: React.Dispatch<React.SetStateAction<Record<string, MonthlyStaffAllocation[]>>>;
  setSharedMonthlyPlans: React.Dispatch<React.SetStateAction<InputPlanBreakdownState[]>>;
  setPreselectedKoc: React.Dispatch<React.SetStateAction<KocItem | null>>;
  setIsQuickBookOpen: React.Dispatch<React.SetStateAction<boolean>>;
  showToast: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  handleCompleteTask: (id: string) => void;
  handleAddTask: (newTask: SlaTask) => void;
  handleUpdateTask: (updated: SlaTask) => void;
  handleTaskActionClick: (task: SlaTask) => void;
  handlePingStaffNotification: (staffName: string, taskTitle: string) => void;
  handleScriptApprovedNotification: (dealCode: string) => void;
  handleDrilldownToPlan: (params: {
    planId?: string;
    storeId?: string;
    storeName?: string;
    brandName?: string;
    month: string;
  }) => void;
  handleDrilldownToListing: (params: {
    planId?: string;
    storeName?: string;
    brandName?: string;
    month: string;
  }) => void;
  handleDrilldownToBooking: (params: {
    storeName?: string;
    brandName?: string;
    dealCode?: string;
    month: string;
  }) => void;
  handleGenerateDealFromListing: (item: KocListingItem) => void;
  handleOpenQuickBookWithKoc: (koc: KocItem, defaultBrand?: string) => void;
  handleKocCreated: (newKoc: KocItem) => void;
  handleKocUpdated: (updatedKoc: KocItem) => void;
  handleContributorCreated: (newCtv: Contributor) => void;
  handleContributorUpdated: (updatedCtv: Contributor) => void;
  handleContributorDeleted: (ctvId: string) => void;
  handleUpdateStore: (updatedStore: StorePortfolioItem) => void;
  handleUpdateBrand: (updatedBrand: BrandDetail) => void;
  handleAddBrand: (newBrand: BrandDetail) => void;
  handleUpdateDeal: (updatedDeal: BookingDealItem) => void;
  handleUpdatePlanItemStatusFromLead: (id: string, newStatus: StaffPlanStatus, reason?: string) => void;
  handleApproveEntirePlanFromLead: (staffName: string, managerFeedback: string) => void;
  handleRequestPlanRevisionFromLead: (staffName: string, managerFeedback: string) => void;
  handleGenerateDealsFromGrowthDemand: (demand: GrowthDemandItem) => void;
  handleBatchConvertPlanToDeals: (staffName: string) => void;
  openContractForDeal: (deal: BookingDealItem, document?: 'HDNT' | 'SOW' | 'BBNT') => void;
  openContractForPlanDeal: (deal: BookingDealItem, document: ContractDocument) => void;
  openContractForKoc: (koc: KocItem, legalProfileId?: string) => void;
  syncCustomKocsIntoState: (items: KocItem[]) => void;
  persistKocsToDatabase: (payload: { created?: KocItem[]; updated?: KocItem[] }) => Promise<void>;
}

export function WorkspaceViewRouter(props: WorkspaceViewRouterProps) {
  const {
    activeTab,
    currentUser,
    tasks,
    deals,
    scopedDeals,
    brands,
    scopedBrands,
    storePortfolios,
    scopedStores,
    kocs,
    kocListings,
    scopedMonthlyPlans,
    campaigns,
    detailedPlans,
    staffAllocations,
    contributors,
    ctvAccess,
    partnershipStaff,
    onSavePartnershipStaff,
    selectedBrandContext,
    selectedCtvContext,
    selectedKocContext,
    brandInitialDetailTab,
    kocMasterReturnTab,
    kocMasterOpenTrigger,
    apiSettingsSheetSubTab,
    planDrilldownIntent,
    listingPlanContext,
    bookingNavFocus,
    contractIntent,
    setActiveTab,
    handleSelectTab,
    setSelectedBrandContext,
    setSelectedStoreContext,
    setSelectedCtvContext,
    setSelectedKocContext,
    setBrandInitialDetailTab,
    setKocMasterReturnTab,
    setKocMasterOpenTrigger,
    setApiSettingsSheetSubTab,
    setListingPlanContext,
    setBookingNavFocus,
    setDeals,
    setKocs,
    setKocListings,
    setCampaigns,
    setDetailedPlans,
    setStaffAllocations,
    setSharedMonthlyPlans,
    setPreselectedKoc,
    setIsQuickBookOpen,
    showToast,
    handleCompleteTask,
    handleAddTask,
    handleUpdateTask,
    handleTaskActionClick,
    handlePingStaffNotification,
    handleScriptApprovedNotification,
    handleDrilldownToPlan,
    handleDrilldownToListing,
    handleDrilldownToBooking,
    handleGenerateDealFromListing,
    handleOpenQuickBookWithKoc,
    handleKocCreated,
    handleKocUpdated,
    handleContributorCreated,
    handleContributorUpdated,
    handleContributorDeleted,
    handleUpdateStore,
    handleUpdateBrand,
    handleAddBrand,
    handleUpdateDeal,
    handleUpdatePlanItemStatusFromLead,
    handleApproveEntirePlanFromLead,
    handleRequestPlanRevisionFromLead,
    handleGenerateDealsFromGrowthDemand,
    handleBatchConvertPlanToDeals,
    openContractForDeal,
    openContractForPlanDeal,
    openContractForKoc,
    syncCustomKocsIntoState,
    persistKocsToDatabase,
  } = props;

  const mergeUpdatedDeals = (newOrUpdatedDeals: BookingDealItem[]) => {
    setDeals((prev) => {
      const byCode = new Map(newOrUpdatedDeals.map((d) => [d.dealCode, d]));
      const existingCodes = new Set(prev.map((d) => d.dealCode));
      const updatedExisting = prev.map((d) => byCode.get(d.dealCode) || d);
      const brandNew = newOrUpdatedDeals.filter((d) => !existingCodes.has(d.dealCode));
      return [...brandNew, ...updatedExisting];
    });
  };

  const handleListingNavigateTab = (
    tab: string,
    ctx?: { subTab?: string; sheetTab?: StoreSheetSetupTabKey; storeName?: string; monthKey?: string }
  ) => {
    if (tab === 'api-settings') {
      if (ctx?.sheetTab) {
        setApiSettingsSheetSubTab(ctx.sheetTab);
      }
      setActiveTab('api-settings');
    } else if (tab === 'lark-settlement') {
      setActiveTab('lark-settlement');
    }
  };

  return (
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
          onNavigateToInputPlan={() => handleSelectTab('input-plan')}
          onNavigateToAirSync={() => handleSelectTab('dashboard-air-sync')}
          onNavigateToTaskDelegation={() => handleSelectTab('task-delegation')}
        />
      </KeepAliveTab>

      <KeepAliveTab
        tabKey="dashboard-bi"
        currentTab={DASHBOARD_EXEC_TAB_KEYS.includes(activeTab) ? 'dashboard-bi' : activeTab}
      >
        <ExecutiveDashboardReportsView
          currentUser={currentUser}
          deals={scopedDeals}
          brands={scopedBrands}
          kocs={kocs}
          storePortfolios={scopedStores}
          activeSidebarTab={activeTab}
          onNotify={showToast}
          onNavigateToTab={(tabKey) => handleSelectTab(tabKey as TabKey)}
          onOpenPlanForStore={handleDrilldownToPlan}
          onOpenListingForStore={handleDrilldownToListing}
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
          onOpenGovernanceDashboard={() => handleSelectTab('overview')}
          onGenerateDealsFromPlan={(newSlots) => {
            setDetailedPlans((prev) => [...newSlots, ...prev]);
            showToast(`Đã tạo ${newSlots.length} slot KOC trong Booking`);
            setActiveTab('koc-listing');
          }}
          onApplyPlanToWeeklyStore={(weeklyPlan: WeeklyStorePlan411) => {
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

      {(['koc-listing', 'multi-platform-booking', 'livestream-booking'] as const).map((tabKey) => {
        const mode =
          tabKey === 'multi-platform-booking'
            ? 'MULTI_PLATFORM'
            : tabKey === 'livestream-booking'
              ? 'LIVESTREAM'
              : 'TIKTOK';
        return (
          <KeepAliveTab key={tabKey} tabKey={tabKey} currentTab={activeTab}>
            <KocListingBatchHubView
              bookingMode={mode}
              listings={kocListings}
              onUpdateListings={setKocListings}
              onGenerateDeal={handleGenerateDealFromListing}
              onCreateOrUpdateDeals={mergeUpdatedDeals}
              onOpenContractForDeal={openContractForDeal}
              currentUser={currentUser}
              currentRole={currentUser.role}
              currentUserName={currentUser.name}
              monthlyPlans={scopedMonthlyPlans}
              stores={scopedStores}
              kocs={kocs}
              deals={scopedDeals}
              activePlanContext={listingPlanContext}
              navFocus={bookingNavFocus}
              onOpenPlanStudio={() => setActiveTab('input-plan')}
              onOpenContractForPlanDeal={openContractForPlanDeal}
              onNavigateTab={handleListingNavigateTab}
              onNotify={showToast}
            />
          </KeepAliveTab>
        );
      })}

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
            setActiveTab('master-data');
          }}
          onNavigateToCtvProfile={(ctvId) => {
            setSelectedCtvContext(ctvId || null);
            setActiveTab('self-channel-hub');
          }}
          onOpenKocDirectory={() => setActiveTab('koc-master')}
          ctvAccess={ctvAccess}
          partnershipStaff={partnershipStaff}
          onSavePartnershipStaff={onSavePartnershipStaff}
          onNavigateToKocPortal={(kocId) => {
            setSelectedKocContext(kocId);
            setActiveTab('koc-hub');
          }}
          onSelectDealForContract={openContractForDeal}
        />
      </KeepAliveTab>

      <KeepAliveTab tabKey="self-channel-hub" currentTab={activeTab}>
        <SelfChannelCtvHubView
          currentUser={currentUser}
          brands={scopedBrands}
          contributors={contributors}
          onContributorCreated={handleContributorCreated}
          onContributorUpdated={handleContributorUpdated}
          ctvAccess={ctvAccess}
          focusCtvId={selectedCtvContext}
          navFocus={bookingNavFocus}
          onOpenLarkSettlement={() => setActiveTab('lark-settlement')}
          onNotify={showToast}
        />
      </KeepAliveTab>

      <KeepAliveTab tabKey="lark-settlement" currentTab={activeTab}>
        <LarkAcceptancePaymentHubView
          currentUser={currentUser}
          currentRole={currentUser.role}
          currentUserName={currentUser.name}
          kocs={kocs}
          stores={scopedStores}
          deals={scopedDeals}
          monthlyPlans={scopedMonthlyPlans}
          contributors={contributors}
          onCreateOrUpdateDeals={mergeUpdatedDeals}
          onOpenContractForDeal={openContractForDeal}
          onNavigateSourceModule={(module, ctx) => {
            const nonce = Date.now();
            if (module === 'TIKTOK_KOC_32') {
              setBookingNavFocus({
                tab: 'approved-booking-list',
                storeName: ctx?.storeName,
                monthKey: ctx?.monthKey,
                dealCode: ctx?.dealCode,
                nonce,
              });
              setActiveTab('koc-listing');
            } else if (module === 'MULTI_PLATFORM') {
              setBookingNavFocus({
                tab: 'multi-platform-booking',
                storeName: ctx?.storeName,
                monthKey: ctx?.monthKey,
                dealCode: ctx?.dealCode,
                nonce,
              });
              setActiveTab('multi-platform-booking');
            } else if (module === 'LIVESTREAM_DEAL') {
              setBookingNavFocus({
                tab: 'livestream-booking',
                storeName: ctx?.storeName,
                monthKey: ctx?.monthKey,
                dealCode: ctx?.dealCode,
                nonce,
              });
              setActiveTab('livestream-booking');
            } else if (module === 'SELF_CHANNEL_CTV') {
              setBookingNavFocus({
                tab: 'self-channel-hub',
                storeName: ctx?.storeName,
                monthKey: ctx?.monthKey,
                dealCode: ctx?.dealCode,
                planId: ctx?.planId,
                nonce,
              });
              setActiveTab('self-channel-hub');
            }
          }}
          onNotify={showToast}
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
          initialDetailTab={brandInitialDetailTab}
          onNotify={showToast}
          onOpenBooking={() => setActiveTab('koc-listing')}
          onUpdateStore={handleUpdateStore}
          onDrilldownToPlan={handleDrilldownToPlan}
          onDrilldownToListing={handleDrilldownToListing}
          onDrilldownToBooking={handleDrilldownToBooking}
          onSelectDealForContract={openContractForDeal}
          onNavigateToStoreProfile={(storeName) => {
            if (storeName) {
              setSelectedStoreContext(storeName);
            }
            setActiveTab('master-data');
          }}
        />
      </KeepAliveTab>

      <KeepAliveTab tabKey="content" currentTab={activeTab}>
        <ContentView
          kocs={kocs}
          deals={scopedDeals}
          currentUserName={currentUser.name}
          currentUserRole={currentUser.role}
          onNotify={showToast}
          onScriptApprovedNotification={handleScriptApprovedNotification}
          onNavigateToAngles={() => {
            setBrandInitialDetailTab('PRODUCTS');
            setActiveTab('brand-knowledge');
          }}
        />
      </KeepAliveTab>

      <KeepAliveTab tabKey="partner-access" currentTab={activeTab}>
        <CentralizedRbacHubView
          currentUser={currentUser}
          brands={brands}
          kocs={kocs}
          onNotify={showToast}
        />
      </KeepAliveTab>

      <KeepAliveTab tabKey="koc-master" currentTab={activeTab}>
        <KocMasterDataView
          kocs={kocs}
          allDeals={scopedDeals}
          stores={scopedStores}
          currentUser={currentUser}
          selectedBrand={selectedBrandContext}
          selectedKocId={selectedKocContext}
          externalOpenTrigger={kocMasterOpenTrigger}
          returnToSourceLabel={
            kocMasterReturnTab === 'tiktok-crawler'
              ? 'Quay lại Crawl KOC Xu hướng'
              : kocMasterReturnTab === 'koc-hub'
                ? 'Quay lại Cổng KOC'
                : undefined
          }
          onReturnToSource={
            kocMasterReturnTab
              ? () => {
                  const target = kocMasterReturnTab;
                  setKocMasterReturnTab(null);
                  handleSelectTab(target);
                }
              : undefined
          }
          onSelectKocId={setSelectedKocContext}
          onOpenQuickBookWithKoc={handleOpenQuickBookWithKoc}
          onOpenStaffBrandSheet={({ monthKey, storeName }) => {
            setListingPlanContext({
              storeName,
              monthKey,
              openStaffSheet: true,
              nonce: Date.now(),
            });
            handleSelectTab('koc-listing');
          }}
          onKocCreated={handleKocCreated}
          onKocUpdated={handleKocUpdated}
          onOpenKocPortal={(kocId: string | null) => {
            setSelectedKocContext(kocId);
            handleSelectTab('koc-hub');
          }}
          onSelectDealForContract={openContractForDeal}
          onCreateContractForKoc={openContractForKoc}
          onNotify={showToast}
        />
      </KeepAliveTab>

      <KeepAliveTab tabKey="contracts" currentTab={activeTab}>
        <ContractManagementView
          key={currentUser?.id || 'contracts-root'}
          deals={scopedDeals}
          kocs={kocs}
          intent={contractIntent}
          onNotify={showToast}
          onSyncDealContractStatus={(dealId, patch) => {
            setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, ...patch } : d)));
          }}
          onSyncKocLegalProfileContract={(kocId, legalProfileId, frameworkData) => {
            if (frameworkData.legalAttachments && frameworkData.legalAttachments.length > 0) {
              saveSyncedKocLegalAttachments(kocId, legalProfileId, frameworkData.legalAttachments);
            }
            setKocs((prev) => {
              const updated = prev.map((k) => {
                if (k.id !== kocId) return k;
                const profiles = getKocLegalProfiles(k);
                const updatedProfiles = profiles.map((p) => {
                  if (p.id === legalProfileId || (!legalProfileId && (p.isDefault || profiles.length === 1))) {
                    const nextAttachments =
                      frameworkData.legalAttachments && frameworkData.legalAttachments.length > 0
                        ? mergeLegalDocAttachments(p.legalAttachments, frameworkData.legalAttachments)
                        : p.legalAttachments;
                    return {
                      ...p,
                      frameworkContractCode: frameworkData.contractCode || p.frameworkContractCode,
                      frameworkContractStatus: frameworkData.status || p.frameworkContractStatus,
                      frameworkContractSignedAt: frameworkData.signedAt || p.frameworkContractSignedAt,
                      frameworkContractDriveUrl: frameworkData.driveUrl || p.frameworkContractDriveUrl,
                      legalAttachments: nextAttachments,
                      isOcrVerified: Boolean(
                        p.isOcrVerified || (nextAttachments && nextAttachments.length > 0)
                      ),
                    };
                  }
                  return p;
                });
                return {
                  ...k,
                  legalProfiles: updatedProfiles,
                  isOcrVerified: Boolean(
                    k.isOcrVerified ||
                      (frameworkData.legalAttachments && frameworkData.legalAttachments.length > 0)
                  ),
                  contractDriveUrl: frameworkData.driveUrl || k.contractDriveUrl,
                };
              });
              const matched = updated.filter((k) => k.id === kocId);
              if (matched.length > 0) {
                syncCustomKocsIntoState(matched);
                void persistKocsToDatabase({ updated: matched });
              }
              return updated;
            });

            if (frameworkData.status) {
              setDeals((prev) =>
                prev.map((d) => {
                  if (d.kocId === kocId && (!d.legalProfileId || !legalProfileId || d.legalProfileId === legalProfileId)) {
                    return {
                      ...d,
                      masterContractCode: frameworkData.contractCode || d.masterContractCode,
                      masterContractStatus: frameworkData.status === 'ĐÃ_KÝ' ? 'ĐÃ_KÝ' : 'CHỜ_KÝ',
                      masterContractGoogleDocsUrl: frameworkData.googleDocsUrl || d.masterContractGoogleDocsUrl,
                      masterContractSignedUrl: frameworkData.driveUrl || d.masterContractSignedUrl,
                    };
                  }
                  return d;
                })
              );
            }
          }}
          currentUserId={currentUser.id}
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
            setStaffAllocations((prev) => ({ ...prev, [month]: updatedList }));
            showToast(`Đã lưu phân bổ tháng ${month}`);
          }}
          brands={scopedBrands}
          onUpdateBrand={handleUpdateBrand}
          onAddBrand={handleAddBrand}
          storePortfolios={scopedStores}
          onUpdateStore={handleUpdateStore}
          tasks={tasks}
          onAddTask={handleAddTask}
          onNavigateToTab={(tabKey) => handleSelectTab(tabKey as TabKey)}
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
          onOpenContractForKoc={openContractForKoc}
          onOpenKocMaster={(kocId: string | null) => {
            setSelectedKocContext(kocId);
            setKocMasterReturnTab('koc-hub');
            setKocMasterOpenTrigger((v) => v + 1);
            handleSelectTab('koc-master', { keepReturnContext: true });
          }}
          onNotify={showToast}
          onNavigateToCtvHub={
            ['ADMIN', 'MANAGER'].includes(currentUser.role)
              ? () => setActiveTab('self-channel-hub')
              : undefined
          }
        />
      </KeepAliveTab>

      <KeepAliveTab tabKey="ads-report" currentTab={activeTab}>
        <WeeklyAdsReportHubView
          currentUser={currentUser}
          kocs={kocs}
          deals={scopedDeals}
          onNotify={showToast}
          onUpdateKocsWithAdsData={(updated) => {
            setKocs(updated);
            void persistKocsToDatabase({ updated });
          }}
          onUpdateDealsWithAdsData={(updated) => setDeals(updated)}
        />
      </KeepAliveTab>

      <KeepAliveTab tabKey="api-settings" currentTab={activeTab}>
        <ApiKeySetupView
          currentUser={currentUser}
          stores={scopedStores}
          initialSheetSubTab={apiSettingsSheetSubTab}
          onNotify={showToast}
          onSelectStoreForListing={(storeName) => {
            setSelectedStoreContext(storeName);
            setActiveTab('koc-listing');
          }}
        />
      </KeepAliveTab>

      <KeepAliveTab tabKey="knowledge-qa" currentTab={activeTab}>
        <MarketingKnowledgeQaView
          currentUser={currentUser}
          brands={brands}
          stores={storePortfolios}
          kocs={kocs}
          onNotify={showToast}
          onNavigateToTab={(tab) => handleSelectTab(tab)}
        />
      </KeepAliveTab>

      <KeepAliveTab tabKey="tiktok-crawler" currentTab={activeTab}>
        <TikTokCrawlerHubView
          currentUser={currentUser}
          kocs={kocs}
          stores={scopedStores}
          deals={scopedDeals}
          onSaveScrapedKocs={({ created, updated }) => {
            if (created.length > 0 || updated.length > 0) {
              void persistKocsToDatabase({ created, updated });
              showToast(
                `Đã lưu vào CSDL Danh bạ KOC: ${created.length} kênh mới, ${updated.length} kênh cập nhật`,
                'success'
              );
            }
          }}
          onNotify={showToast}
          onNavigateToKocMaster={(kocId?: string) => {
            if (kocId) {
              setSelectedKocContext(kocId);
            }
            setKocMasterReturnTab('tiktok-crawler');
            setKocMasterOpenTrigger((v) => v + 1);
            handleSelectTab('koc-master', { keepReturnContext: true });
          }}
          onOpenStaffBrandSheet={({ monthKey, storeName }) => {
            setListingPlanContext({
              storeName,
              monthKey,
              openStaffSheet: true,
              nonce: Date.now(),
            });
            handleSelectTab('koc-listing');
          }}
        />
      </KeepAliveTab>

      <KeepAliveTab tabKey="market-research" currentTab={activeTab}>
        <BrandMarketResearchHubView
          brands={scopedBrands}
          kocs={kocs}
          selectedBrand={selectedBrandContext}
          onSaveScrapedKocs={({ created, updated }) => {
            if (created.length > 0 || updated.length > 0) {
              void persistKocsToDatabase({ created, updated });
              showToast(
                `Đã lưu vào CSDL Danh bạ KOC: ${created.length} kênh mới, ${updated.length} kênh cập nhật`,
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
          onNavigateToContentAngles={() => {
            setBrandInitialDetailTab('PRODUCTS');
            setActiveTab('brand-knowledge');
          }}
          onNotify={showToast}
        />
      </KeepAliveTab>
    </>
  );
}
