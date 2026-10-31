'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { Sidebar, TabKey, getNavLabelForRole } from '../components/Sidebar';
import { TAB_LABELS, getNavGroupForTab, DASHBOARD_EXEC_TAB_KEYS, TAB_ALIASES } from '../lib/navGroups';
import { TopHeader } from '../components/TopHeader';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { QuickBookModal } from '../components/QuickBookModal';
import { ImportExcelModal } from '../components/ImportExcelModal';
import { UserProfileModal } from '../components/UserProfileModal';
import { WorkspaceViewRouter, ViewLoading, prefetchViewTab } from '../components/WorkspaceViewRouter';
import type { StoreSheetSetupTabKey } from '../components/views/StoreStaffSheetSetupView';
import { loadAccessPolicy } from '../lib/policyClient';
import { isTabAllowedForRole, getAllowedTabsForRole, getDefaultLandingTabForRole } from '../lib/rbacData';
import { Button, Skeleton, ToastStack, useToastQueue } from '../components/ui';
import { USERS } from '../lib/mockData';
import { INITIAL_THIRD_PARTY_ACCOUNTS, convertPartnerAccountToUserProfile } from '../lib/thirdPartyAccessData';
import { UserProfile } from '../lib/types';
import { useWorkspaceAppState } from '../hooks/useWorkspaceAppState';

const ACTIVE_TAB_SESSION_KEY = 'upbase_active_tab';

function resolveUserById(id: string): UserProfile | null {
  const inUsers = USERS.find(u => u.id === id);
  if (inUsers) return inUsers;
  const inPartners = INITIAL_THIRD_PARTY_ACCOUNTS.find(p => p.id === id);
  if (inPartners) return convertPartnerAccountToUserProfile(inPartners);
  return null;
}

function resolveInitialTab(user: UserProfile | null): TabKey {
  if (!user) return 'cockpit';
  if (user.id.startsWith('contract-demo-')) {
    return 'contracts';
  }
  if (typeof window !== 'undefined') {
    const savedUserLanding = localStorage.getItem(`upbase_user_landing_${user.id}`) as TabKey | null;
    if (savedUserLanding && isTabAllowedForRole(user.role, savedUserLanding)) {
      return savedUserLanding;
    }
  }
  if (user.customLandingTab && isTabAllowedForRole(user.role, user.customLandingTab)) {
    return user.customLandingTab;
  }
  return getDefaultLandingTabForRole(user.role);
}

function getInitialAuthState(): {
  user: UserProfile | null;
  isLoading: boolean;
  tab: TabKey;
} {
  if (typeof window === 'undefined') {
    return { user: null, isLoading: true, tab: 'cockpit' };
  }
  try {
    const savedUserId = localStorage.getItem('upbase_selected_user_id');
    if (savedUserId) {
      const matched = resolveUserById(savedUserId);
      if (matched) {
        const savedTab = sessionStorage.getItem(ACTIVE_TAB_SESSION_KEY) as TabKey | null;
        const targetTab = (savedTab && isTabAllowedForRole(matched.role, savedTab))
          ? savedTab
          : resolveInitialTab(matched);
        return { user: matched, isLoading: false, tab: targetTab };
      }
    }
  } catch {
    // bỏ qua lỗi storage
  }
  // Giữ trạng thái chờ tải để nạp chuẩn vai trò từ máy chủ (/api/auth/me)
  return { user: null, isLoading: true, tab: 'cockpit' };
}

export default function App() {
  const router = useRouter();
  const [initialAuthState] = useState(getInitialAuthState);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(initialAuthState.user);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(initialAuthState.isLoading);
  const [activeTab, setActiveTab] = useState<TabKey>(initialAuthState.tab);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const hasUserNavigatedRef = useRef<boolean>(false);
  const [brandInitialDetailTab, setBrandInitialDetailTab] = useState<'PRODUCTS' | undefined>(undefined);
  const [kocMasterReturnTab, setKocMasterReturnTab] = useState<'tiktok-crawler' | 'koc-hub' | null>(null);
  const [kocMasterOpenTrigger, setKocMasterOpenTrigger] = useState<number>(0);
  const isPopStateNavigatingRef = useRef<boolean>(false);

  const handleSaveUserProfile = useCallback((updated: UserProfile) => {
    setCurrentUser(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`upbase_user_profile_${updated.id}`, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
  }, []);


  const handleSelectTab = useCallback((tab: TabKey, options?: { keepReturnContext?: boolean }) => {
    hasUserNavigatedRef.current = true;
    const mapped = TAB_ALIASES[tab] ?? tab;
    const resolvedTab: TabKey =
      mapped === 'content-angles'
        ? 'brand-knowledge'
        : mapped === 'workload-3d' || mapped === 'performance-p3'
          ? 'manager'
          : mapped === 'audit-trail'
            ? 'partner-access'
            : mapped;
    if (tab === 'content-angles') {
      setBrandInitialDetailTab('PRODUCTS');
    }
    if (!options?.keepReturnContext) {
      setKocMasterReturnTab(null);
    }
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(ACTIVE_TAB_SESSION_KEY, resolvedTab);
      if (!isPopStateNavigatingRef.current) {
        const currentState = window.history.state as { upbaseTab?: TabKey } | null;
        if (currentState?.upbaseTab !== resolvedTab) {
          window.history.pushState({ ...currentState, upbaseTab: resolvedTab }, '');
        }
      }
    }
    setActiveTab(resolvedTab);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const currentState = window.history.state as { upbaseTab?: TabKey } | null;
    if (!currentState?.upbaseTab) {
      window.history.replaceState({ ...currentState, upbaseTab: activeTab }, '');
    }
    const onPopState = (event: PopStateEvent) => {
      const targetTab = (event.state as { upbaseTab?: TabKey } | null)?.upbaseTab;
      if (targetTab) {
        isPopStateNavigatingRef.current = true;
        handleSelectTab(targetTab);
        isPopStateNavigatingRef.current = false;
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleSelectTab]);
  const [, setSidebarSubViewTick] = useState<number>(0);
  useEffect(() => {
    const onSubView = (e: Event) => {
      const detail = (e as CustomEvent<{ tab?: string; subView?: string }>).detail;
      if (detail?.tab === 'brand-knowledge') {
        setBrandInitialDetailTab(detail.subView === 'PRODUCTS' ? 'PRODUCTS' : undefined);
      }
      setSidebarSubViewTick((n) => n + 1);
    };
    window.addEventListener('upbase-sidebar-subview', onSubView);
    return () => window.removeEventListener('upbase-sidebar-subview', onSubView);
  }, []);
  const [selectedBrandContext, setSelectedBrandContext] = useState<string>('ALL');
  const [selectedStoreContext, setSelectedStoreContext] = useState<string>('');
  const [selectedCtvContext, setSelectedCtvContext] = useState<string | null>(null);
  const [selectedKocContext, setSelectedKocContext] = useState<string | null>(null);
  const [apiSettingsSheetSubTab, setApiSettingsSheetSubTab] = useState<StoreSheetSetupTabKey>('TABLE');

  // Notifications Toast (Enhanced with Type & Dismiss)
  // Thông báo xếp chồng: nhiều thông báo liên tiếp không đè nhau, rê chuột để xem và dừng đếm giờ.
  const toastQueue = useToastQueue();
  const showToast = toastQueue.show;

  const [bookingNavFocus, setBookingNavFocus] = useState<{
    tab: string;
    storeName?: string;
    monthKey?: string;
    dealCode?: string;
    planId?: string;
    nonce: number;
  } | null>(null);

  const [, setRbacVersion] = useState(0);
  useEffect(() => {
    const onRbacUpdated = (event: Event) => {
      setRbacVersion(v => v + 1);
      const actor = (event as CustomEvent<UserProfile | undefined>).detail;
      if (actor) setCurrentUser(prev => prev?.id === actor.id && JSON.stringify(prev) !== JSON.stringify(actor) ? actor : prev);
    };
    const onNavigateTab = (event: Event) => {
      const detail = (
        event as CustomEvent<
          | TabKey
          | {
              tab: TabKey;
              storeName?: string;
              monthKey?: string;
              dealCode?: string;
              planId?: string;
            }
        >
      ).detail;
      if (!detail) return;
      if (typeof detail === 'string') {
        handleSelectTab(detail);
        return;
      }
      if (detail.tab) {
        setBookingNavFocus({
          tab: detail.tab,
          storeName: detail.storeName,
          monthKey: detail.monthKey,
          dealCode: detail.dealCode,
          planId: detail.planId,
          nonce: Date.now(),
        });
        handleSelectTab(detail.tab);
      }
    };
    window.addEventListener('upbase-rbac-updated', onRbacUpdated);
    window.addEventListener('upbase-navigate-tab', onNavigateTab);
    return () => {
      window.removeEventListener('upbase-rbac-updated', onRbacUpdated);
      window.removeEventListener('upbase-navigate-tab', onNavigateTab);
    };
  }, [handleSelectTab]);

  useEffect(() => {
    if (typeof window !== 'undefined' && currentUser && !isLoadingAuth) {
      sessionStorage.setItem(ACTIVE_TAB_SESSION_KEY, activeTab);
    }
  }, [activeTab, currentUser, isLoadingAuth]);

  // Nạp sẵn tối đa 2 màn thường dùng khi trình duyệt thực sự rảnh rỗi (idle) để không chiếm dụng băng thông / CPU lúc vào trang
  useEffect(() => {
    if (isLoadingAuth) return;
    const idleCallback = typeof window !== 'undefined'
      ? (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback
      : undefined;
    let cancelId: number | undefined;
    let timerId: number | undefined;
    const prefetchIdle = () => {
      void import('../components/views/InputPlanBreakdownView');
      void import('../components/views/KocListingBatchHubView');
    };
    if (typeof idleCallback === 'function') {
      cancelId = idleCallback(prefetchIdle, { timeout: 3500 });
    } else if (typeof window !== 'undefined') {
      timerId = window.setTimeout(prefetchIdle, 3500);
    }
    return () => {
      if (typeof window !== 'undefined') {
        const cancelIdle = (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
        if (cancelIdle && cancelId !== undefined) cancelIdle(cancelId);
        if (timerId !== undefined) window.clearTimeout(timerId);
      }
    };
  }, [isLoadingAuth]);

  // Đảm bảo activeTab luôn hợp lệ theo phân quyền của vai trò hiện tại
  if (currentUser) {
    const allowed = getAllowedTabsForRole(currentUser.role);
    if (!allowed.includes(activeTab)) {
      const defaultTab = getDefaultLandingTabForRole(currentUser.role);
      setActiveTab(defaultTab);
    }
  }

  const handleUserChange = useCallback(async (newUser: UserProfile, isSilent: boolean = false) => {
    // 1. Cập nhật ngay lập tức trạng thái giao diện (optimistic) để chuyển vai trò / tab 0ms không hiện màn chờ
    setCurrentUser(prev => (prev && JSON.stringify(prev) === JSON.stringify(newUser) ? prev : newUser));
    if (typeof window !== 'undefined') localStorage.setItem('upbase_selected_user_id', newUser.id);

    if (newUser.role === 'BRAND_PARTNER') {
      const userBrand = newUser.assignedBrands?.[0] || newUser.linkedEntityName || 'Kutieskin';
      setSelectedBrandContext(prev => (prev === userBrand ? prev : userBrand));
    } else {
      setSelectedBrandContext(prev => (prev === 'ALL' ? prev : 'ALL'));
    }

    const defaultTab: TabKey = newUser.id.startsWith('contract-demo-')
      ? 'contracts'
      : getDefaultLandingTabForRole(newUser.role);
    setActiveTab(prevTab => {
      const allowed = getAllowedTabsForRole(newUser.role);
      const isPartnerRole = ['BRAND_PARTNER', 'KOC_PARTNER', 'CTV_PARTNER'].includes(newUser.role);
      if (!allowed.includes(prevTab) || isPartnerRole || !isSilent || newUser.id.startsWith('contract-demo-')) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(ACTIVE_TAB_SESSION_KEY, defaultTab);
        }
        return defaultTab;
      }
      return prevTab;
    });

    if (!isSilent) {
      showToast(`Đang xem với vai trò: ${newUser.name} (${newUser.roleTitle})`, 'info');
    }

    // 2. Đồng bộ phiên máy chủ ở nền (không chặn thao tác chuyển tab)
    if (!isSilent) {
      try {
        const isLocalPreview =
          newUser.id.startsWith('contract-demo-') ||
          newUser.id.startsWith('preview-role-') ||
          newUser.id.startsWith('tpa-');
        if (newUser.id.startsWith('contract-demo-')) {
          await fetch('/api/contracts/demo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: newUser.id }),
          }).catch(() => undefined);
        } else if (!isLocalPreview) {
          const partner = !!newUser.partnerType || newUser.role.endsWith('_PARTNER');
          const known = USERS.some(u => u.id === newUser.id);
          const res = await fetch(partner ? '/api/auth/partner/login' : '/api/auth/lark/sandbox', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(partner ? { email: newUser.email } : known ? { userId: newUser.id } : { staffIdentifier: newUser.email || newUser.staffCode || newUser.name }),
          });
          const body = await res.json();
          if (!res.ok) throw new Error(body.error || 'Không chuyển được tài khoản.');
          const policy = await loadAccessPolicy();
          if (policy?.user) {
            setCurrentUser(prev => (prev && JSON.stringify(prev) === JSON.stringify(policy.user) ? prev : policy.user));
          }
        }
      } catch (error) {
        showToast((error as Error).message, 'error');
      }
    }
  }, [showToast]);

  // Tải phiên đăng nhập từ cookie hoặc vai trò đã chọn ở trang /login (song song hóa auth + access-policy)
  useEffect(() => {
    async function loadUser() {
      const savedTab = typeof window !== 'undefined' ? (sessionStorage.getItem(ACTIVE_TAB_SESSION_KEY) as TabKey | null) : null;
      try {
        const savedUserId = typeof window !== 'undefined' ? localStorage.getItem('upbase_selected_user_id') : null;
        const [res, initialPolicy] = await Promise.all([
          fetch('/api/auth/me'),
          loadAccessPolicy().catch(() => null),
        ]);

        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            let resolvedUser: UserProfile = initialPolicy?.user || data.user;
            const isAutoFallbackSession = Boolean(
              data.isAutoLogin || (!data.user.larkOpenId && data.user.loginProvider !== 'GMAIL')
            );
            if (isAutoFallbackSession && savedUserId && savedUserId !== data.user.id) {
              const matched = resolveUserById(savedUserId);
              if (matched) {
                resolvedUser = matched;
                await fetch('/api/auth/lark/sandbox', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: matched.id }),
                }).catch(() => undefined);
                const updatedPolicy = await loadAccessPolicy().catch(() => null);
                if (updatedPolicy?.user) resolvedUser = updatedPolicy.user;
              }
            } else if (!initialPolicy) {
              const retryPolicy = await loadAccessPolicy().catch(() => null);
              if (retryPolicy?.user) resolvedUser = retryPolicy.user;
            }
            await handleUserChange(resolvedUser, true);
            if (!hasUserNavigatedRef.current) {
              const targetLandingTab = (savedTab && isTabAllowedForRole(resolvedUser.role, savedTab))
                ? savedTab
                : getDefaultLandingTabForRole(resolvedUser.role);
              setActiveTab(prev => (prev === targetLandingTab ? prev : targetLandingTab));
            }
            setIsLoadingAuth(false);
            return;
          }
        }

        const fallbackUser = (savedUserId && resolveUserById(savedUserId)) || USERS[0];
        await handleUserChange(fallbackUser, true);
        if (!hasUserNavigatedRef.current) {
          const nextDefaultTab = (savedTab && isTabAllowedForRole(fallbackUser.role, savedTab))
            ? savedTab
            : (fallbackUser.id.startsWith('contract-demo-') ? 'contracts' : getDefaultLandingTabForRole(fallbackUser.role));
          setActiveTab(prev => (prev === nextDefaultTab ? prev : nextDefaultTab));
        }
        setIsLoadingAuth(false);
      } catch (err) {
        console.warn('Could not fetch user session, using fallback user:', err);
        const savedUserId = typeof window !== 'undefined' ? localStorage.getItem('upbase_selected_user_id') : null;
        const fallbackUser = (savedUserId && resolveUserById(savedUserId)) || USERS[0];
        await handleUserChange(fallbackUser, true);
        if (!hasUserNavigatedRef.current) {
          const nextDefaultTab = (savedTab && isTabAllowedForRole(fallbackUser.role, savedTab))
            ? savedTab
            : (fallbackUser.id.startsWith('contract-demo-') ? 'contracts' : getDefaultLandingTabForRole(fallbackUser.role));
          setActiveTab(prev => (prev === nextDefaultTab ? prev : nextDefaultTab));
        }
        setIsLoadingAuth(false);
      }
    }
    loadUser();
  }, [handleUserChange]);

  const activePolicyUserId = currentUser?.id;
  useEffect(() => {
    if (!activePolicyUserId || isLoadingAuth) return;
    let lastRefreshAt = Date.now();
    const refresh = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastRefreshAt < 60_000) return;
      lastRefreshAt = now;
      void loadAccessPolicy().catch(error => showToast(error.message, 'error'));
    };
    window.addEventListener('focus', refresh);
    const timer = window.setInterval(refresh, 180000);
    return () => { window.removeEventListener('focus', refresh); window.clearInterval(timer); };
  }, [activePolicyUserId, isLoadingAuth, showToast]);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = useCallback(() => {
    setIsLoggingOut(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('upbase_selected_user_id');
        sessionStorage.removeItem(ACTIVE_TAB_SESSION_KEY);
      }
    } catch {
      // bỏ qua lỗi storage
    }
    if (typeof window !== 'undefined') {
      window.location.replace('/api/auth/logout');
    } else {
      router.push('/login');
    }
  }, [router]);


  const {
    kocs,
    setKocs,
    ctvDirectory,
    contributors,
    deals,
    setDeals,
    tasks,
    brands,
    storePortfolios,
    campaigns,
    setCampaigns,
    detailedPlans,
    setDetailedPlans,
    staffAllocations,
    setStaffAllocations,
    kocListings,
    setKocListings,
    setSharedMonthlyPlans,
    scopedStores,
    scopedBrands,
    scopedDeals,
    scopedMonthlyPlans,
    userScopeSummary,
    pendingTasksCount,
    listingPlanContext,
    setListingPlanContext,
    planDrilldownIntent,
    isQuickBookOpen,
    setIsQuickBookOpen,
    isImportOpen,
    setIsImportOpen,
    contractIntent,
    preselectedKoc,
    setPreselectedKoc,
    preselectedBrand,
    setPreselectedBrand,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    isSidebarCollapsed,
    handleToggleSidebarCollapse,
    syncCustomKocsIntoState,
    persistKocsToDatabase,
    handleDrilldownToPlan,
    handleDrilldownToListing,
    handleDrilldownToBooking,
    handleGenerateDealFromListing,
    openContractForDeal,
    openContractForKoc,
    openContractForPlanDeal,
    handleApproveEntirePlanFromLead,
    handleRequestPlanRevisionFromLead,
    handleUpdatePlanItemStatusFromLead,
    handleBatchConvertPlanToDeals,
    handleGenerateDealsFromGrowthDemand,
    handleDealCreated,
    handleCompleteTask,
    handleAddTask,
    handleUpdateTask,
    handleUpdateBrand,
    handleAddBrand,
    handleUpdateStore,
    handleImportSuccess,
    handleOpenQuickBookWithKoc,
    handleScriptApprovedNotification,
    handlePingStaffNotification,
    handleUpdateDeal,
    handleKocCreated,
    handleKocUpdated,
    handleContributorCreated,
    handleContributorUpdated,
    handleContributorDeleted,
    handleTaskActionClick,
  } = useWorkspaceAppState({
    currentUser,
    isLoadingAuth,
    setActiveTab,
    setSelectedBrandContext,
    showToast,
  });

  // Tiêu đề trang: khớp 100% tên trên menu trái của vai trò đang đăng nhập (DESIGN_SYSTEM.md §7 Quy tắc 1)
  const pageTitleOf = (tab: TabKey) => (currentUser && getNavLabelForRole(currentUser.role, tab)) || TAB_LABELS[tab] || tab;

  // Màn thuộc nhóm (NAV_GROUPS): menu trái giữ 1 mục, các màn con chuyển qua thanh Tabs đầu trang.
  const activeGroupTabs = currentUser
    ? (getNavGroupForTab(activeTab)?.tabs ?? []).filter(
        (t) =>
          isTabAllowedForRole(currentUser.role, t.key) ||
          (t.key === 'dashboard-bi' &&
            DASHBOARD_EXEC_TAB_KEYS.some((k) => isTabAllowedForRole(currentUser.role, k)))
      )
    : [];


  if (isLoadingAuth || !currentUser) {
    return (
      // Khung ứng dụng giữ chỗ (menu trái + thanh trên + nội dung) thay cho vòng xoay toàn trang.
      <div role="status" aria-live="polite" className="min-h-dvh bg-canvas flex">
        <span className="sr-only">Đang xác minh phiên làm việc…</span>
        <div aria-hidden="true" className="hidden lg:flex w-60 shrink-0 h-dvh flex-col bg-surface border-r border-line">
          <div className="h-14 px-4 flex items-center border-b border-line"><Skeleton className="h-6 w-32 rounded-md" /></div>
          <div className="p-3 grid gap-3">
            {Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="h-5" style={{ width: `${55 + ((i * 17) % 35)}%` }} />)}
          </div>
        </div>
        <div aria-hidden="true" className="flex-1 min-w-0">
          <div className="h-14 px-4 sm:px-6 flex items-center bg-surface border-b border-line"><Skeleton className="h-6 w-48 rounded-md" /></div>
          <div className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6"><ViewLoading /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-canvas text-ink">
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
        onTabHover={prefetchViewTab}
        currentUser={currentUser}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebarCollapse}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
        badgeCounts={pendingTasksCount > 0 ? { cockpit: pendingTasksCount } : undefined}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* Main Content Space */}
      <div className={`flex-1 flex flex-col min-w-0 transition-[padding] duration-200 ${isSidebarCollapsed ? 'lg:pl-0' : 'lg:pl-60'}`}>
        <TopHeader
          currentUser={currentUser}
          selectedBrand={selectedBrandContext}
          onBrandChange={setSelectedBrandContext}
          onOpenQuickBook={() => {
            setPreselectedKoc(null);
            setIsQuickBookOpen(true);
          }}
          onOpenImport={() => setIsImportOpen(true)}
          title={pageTitleOf(activeTab)}
          activeTab={activeTab}
          groupTabs={activeGroupTabs}
          onNavigateTab={handleSelectTab}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={handleToggleSidebarCollapse}
          userScopeSummary={userScopeSummary}
        />

        <main id="workspace" className={`px-3 sm:px-4 lg:px-6 py-4 sm:py-5 w-full mx-auto space-y-5 pb-20 lg:pb-5 min-w-0 max-w-full ${isSidebarCollapsed ? 'max-w-[1800px]' : 'max-w-[1600px]'}`}>
          {!isTabAllowedForRole(currentUser.role, activeTab) ? (
            <div className="p-8 sm:p-12 rounded-xl bg-surface border border-line text-center max-w-lg mx-auto my-12 space-y-4 animate-in fade-in">
              <div className="w-14 h-14 rounded-xl bg-critical-soft text-critical flex items-center justify-center mx-auto border border-line">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <div className="text-lg font-semibold text-ink">Không có quyền truy cập màn hình này</div>
                <p className="text-xs text-ink-2 leading-relaxed">
                  Tài khoản hiện tại <strong className="text-ink font-semibold">{currentUser.name}</strong> ({currentUser.roleTitle}) không có thẩm quyền truy cập màn hình <strong className="text-critical font-semibold">{pageTitleOf(activeTab)}</strong>.
                </p>
                <div className="p-3 rounded-lg bg-sunken border border-line text-2xs text-ink-3">
                  Quy định bảo mật theo <strong className="font-medium">Ma trận phân quyền Upbase</strong>
                </div>
              </div>
              <div className="pt-2">
                <Button
                  variant="primary"
                  onClick={() => handleSelectTab(getDefaultLandingTabForRole(currentUser.role))}
                >
                  Quay về màn hình chính ({pageTitleOf(getDefaultLandingTabForRole(currentUser.role))})
                </Button>
              </div>
            </div>
          ) : (
            <WorkspaceViewRouter
              activeTab={activeTab}
              currentUser={currentUser}
              tasks={tasks}
              deals={deals}
              scopedDeals={scopedDeals}
              brands={brands}
              scopedBrands={scopedBrands}
              storePortfolios={storePortfolios}
              scopedStores={scopedStores}
              kocs={kocs}
              kocListings={kocListings}
              scopedMonthlyPlans={scopedMonthlyPlans}
              campaigns={campaigns}
              detailedPlans={detailedPlans}
              staffAllocations={staffAllocations}
              contributors={contributors}
              ctvAccess={ctvDirectory.access}
              partnershipStaff={ctvDirectory.partnershipStaff}
              onSavePartnershipStaff={ctvDirectory.savePartnershipStaff}
              selectedBrandContext={selectedBrandContext}
              selectedCtvContext={selectedCtvContext}
              selectedKocContext={selectedKocContext}
              brandInitialDetailTab={brandInitialDetailTab}
              kocMasterReturnTab={kocMasterReturnTab}
              kocMasterOpenTrigger={kocMasterOpenTrigger}
              apiSettingsSheetSubTab={apiSettingsSheetSubTab}
              planDrilldownIntent={planDrilldownIntent}
              listingPlanContext={listingPlanContext}
              bookingNavFocus={bookingNavFocus}
              contractIntent={contractIntent}
              setActiveTab={setActiveTab}
              handleSelectTab={handleSelectTab}
              setSelectedBrandContext={setSelectedBrandContext}
              setSelectedStoreContext={setSelectedStoreContext}
              setSelectedCtvContext={setSelectedCtvContext}
              setSelectedKocContext={setSelectedKocContext}
              setBrandInitialDetailTab={setBrandInitialDetailTab}
              setKocMasterReturnTab={setKocMasterReturnTab}
              setKocMasterOpenTrigger={setKocMasterOpenTrigger}
              setApiSettingsSheetSubTab={setApiSettingsSheetSubTab}
              setListingPlanContext={setListingPlanContext}
              setBookingNavFocus={setBookingNavFocus}
              setDeals={setDeals}
              setKocs={setKocs}
              setKocListings={setKocListings}
              setCampaigns={setCampaigns}
              setDetailedPlans={setDetailedPlans}
              setStaffAllocations={setStaffAllocations}
              setSharedMonthlyPlans={setSharedMonthlyPlans}
              setPreselectedKoc={setPreselectedKoc}
              setIsQuickBookOpen={setIsQuickBookOpen}
              showToast={showToast}
              handleCompleteTask={handleCompleteTask}
              handleAddTask={handleAddTask}
              handleUpdateTask={handleUpdateTask}
              handleTaskActionClick={handleTaskActionClick}
              handlePingStaffNotification={handlePingStaffNotification}
              handleScriptApprovedNotification={handleScriptApprovedNotification}
              handleDrilldownToPlan={handleDrilldownToPlan}
              handleDrilldownToListing={handleDrilldownToListing}
              handleDrilldownToBooking={handleDrilldownToBooking}
              handleGenerateDealFromListing={handleGenerateDealFromListing}
              handleOpenQuickBookWithKoc={handleOpenQuickBookWithKoc}
              handleKocCreated={handleKocCreated}
              handleKocUpdated={handleKocUpdated}
              handleContributorCreated={handleContributorCreated}
              handleContributorUpdated={handleContributorUpdated}
              handleContributorDeleted={handleContributorDeleted}
              handleUpdateStore={handleUpdateStore}
              handleUpdateBrand={handleUpdateBrand}
              handleAddBrand={handleAddBrand}
              handleUpdateDeal={handleUpdateDeal}
              handleUpdatePlanItemStatusFromLead={handleUpdatePlanItemStatusFromLead}
              handleApproveEntirePlanFromLead={handleApproveEntirePlanFromLead}
              handleRequestPlanRevisionFromLead={handleRequestPlanRevisionFromLead}
              handleGenerateDealsFromGrowthDemand={handleGenerateDealsFromGrowthDemand}
              handleBatchConvertPlanToDeals={handleBatchConvertPlanToDeals}
              openContractForDeal={openContractForDeal}
              openContractForPlanDeal={openContractForPlanDeal}
              openContractForKoc={openContractForKoc}
              syncCustomKocsIntoState={syncCustomKocsIntoState}
              persistKocsToDatabase={persistKocsToDatabase}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Dành riêng cho màn hình di động) */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabSelect={handleSelectTab}
        currentUser={currentUser}
        onOpenMenu={() => setIsMobileSidebarOpen(true)}
        pendingTasksCount={pendingTasksCount}
      />

      {/* Quick Book Modal */}
      <QuickBookModal
        isOpen={isQuickBookOpen}
        onClose={() => {
          setIsQuickBookOpen(false);
          setPreselectedBrand(null);
        }}
        onDealCreated={handleDealCreated}
        kocs={kocs}
        preselectedKoc={preselectedKoc}
        preselectedBrand={preselectedBrand}
      />

      {/* Import Excel Modal */}
      <ImportExcelModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={handleImportSuccess}
      />

      {currentUser && (
        <UserProfileModal
          open={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          currentUser={currentUser}
          onSaveUser={handleSaveUserProfile}
          onSwitchUser={handleUserChange}
          onLogout={handleLogout}
          onNotify={showToast}
        />
      )}

    </div>
  );
}



