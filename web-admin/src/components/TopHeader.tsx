'use client';

import React from 'react';
import { Menu, Building2, PanelLeftOpen, PanelLeftClose, LogOut, Loader2 } from 'lucide-react';
import { UserProfile } from '../lib/types';
import type { TabKey } from './Sidebar';
import { resolveNavGroupTabKey } from '../lib/navGroups';
import { PageActionsSlot, PageHeaderNavSlot, Segmented } from './ui';
import type { UserScopeSummary } from '../lib/rbacScope';

interface TopHeaderProps {
  currentUser: UserProfile;
  onUserChange?: (user: UserProfile) => void;
  onOpenQuickBook?: () => void;
  onOpenImport?: () => void;
  title: string;
  activeTab?: TabKey;
  groupTabs?: { key: TabKey; label: string }[];
  selectedBrand?: string;
  onBrandChange?: (brand: string) => void;
  onNavigateTab?: (tab: TabKey) => void;
  onToggleMobileSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
  onLogout?: () => void;
  isLoggingOut?: boolean;
  userScopeSummary?: UserScopeSummary;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentUser,
  title,
  activeTab,
  groupTabs,
  onNavigateTab,
  onToggleMobileSidebar,
  isSidebarCollapsed = false,
  onToggleSidebarCollapse,
  onLogout,
  isLoggingOut,
  userScopeSummary,
}) => {
  return (
    <header className="app-header sticky top-0 z-20 min-h-12 bg-surface border-b border-line px-3 sm:px-6 lg:px-8 py-1.5 sm:py-2 flex flex-wrap items-center justify-between gap-1.5 sm:gap-3 shrink-0">
      {/* Khối 1: Nút menu di động / ẩn menu desktop & Tiêu đề trang */}
      <div className="order-1 flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="lg:hidden h-8 w-8 -ml-1 inline-flex items-center justify-center rounded-md text-ink-2 hover:text-ink hover:bg-sunken transition-colors shrink-0"
            aria-label="Mở menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {onToggleSidebarCollapse && (
          <button
            type="button"
            onClick={onToggleSidebarCollapse}
            className={`hidden lg:inline-flex items-center gap-1.5 rounded-lg border transition-colors shrink-0 cursor-pointer ${
              isSidebarCollapsed
                ? 'px-2.5 py-1 bg-accent-soft text-accent border-accent/30 hover:bg-accent-soft/80 text-xs font-semibold'
                : 'p-1.5 -ml-1.5 text-ink-3 hover:text-ink hover:bg-sunken border-transparent'
            }`}
            title={isSidebarCollapsed ? 'Mở lại thanh menu bên trái' : 'Ẩn thanh menu bên trái để mở rộng không gian làm việc'}
            aria-label={isSidebarCollapsed ? 'Mở lại thanh menu bên trái' : 'Ẩn thanh menu bên trái'}
          >
            {isSidebarCollapsed ? (
              <>
                <PanelLeftOpen className="w-4 h-4" />
                <span>Menu</span>
              </>
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        )}

        <h1 className="text-base sm:text-lg font-semibold text-ink leading-6 tracking-tight min-w-0 truncate">{title}</h1>
      </div>

      {/* Khối 2: Cụm thao tác trang & Đăng xuất (Mobile: cạnh tiêu đề; Desktop: phía cuối thanh) */}
      <div className="order-2 sm:order-3 flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
        {activeTab !== 'tiktok-crawler' && (
          currentUser.role === 'BRAND_PARTNER' ? (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-positive-soft text-positive text-xs font-medium border border-positive/20">
              <span className="w-1.5 h-1.5 rounded-full bg-positive shrink-0" aria-hidden="true" />
              <Building2 className="w-3.5 h-3.5 text-positive shrink-0" />
              <span className="truncate max-w-[180px]">{currentUser.assignedBrands?.[0] || currentUser.linkedEntityName || 'Kutieskin'}</span>
            </div>
          ) : userScopeSummary && !userScopeSummary.isGlobal ? (
            <div
              title={userScopeSummary.scopeTooltip}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent-soft text-accent text-xs font-medium border border-accent/25"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" aria-hidden="true" />
              <Building2 className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="truncate max-w-[220px]">{userScopeSummary.scopeBadgeText}</span>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sunken text-ink-2 text-xs font-medium border border-line">
              <span className="w-1.5 h-1.5 rounded-full bg-positive shrink-0" aria-hidden="true" />
              <Building2 className="w-3.5 h-3.5 text-ink-3 shrink-0" />
              <span>Toàn hệ thống (69 gian hàng)</span>
            </div>
          )
        )}

        <PageActionsSlot />

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            disabled={isLoggingOut}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-ink-3 hover:text-ink hover:bg-sunken transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            title="Đăng xuất"
            aria-label="Đăng xuất"
          >
            {isLoggingOut ? (
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
            ) : (
              <LogOut className="w-4 h-4" strokeWidth={1.75} />
            )}
          </button>
        )}
      </div>

      {/* Khối 3: Tabs nhóm & Điều hướng con (Mobile: dòng riêng cuộn ngang; Desktop: nằm giữa cạnh tiêu đề) */}
      <div className="order-3 sm:order-2 w-full sm:w-auto sm:flex-1 flex items-center gap-2 sm:gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pt-1 sm:pt-0 border-t border-line/60 sm:border-t-0 empty:hidden">
        {groupTabs && groupTabs.length > 1 && activeTab && onNavigateTab && (
          <Segmented<TabKey>
            items={groupTabs}
            value={resolveNavGroupTabKey(activeTab)}
            onChange={onNavigateTab}
          />
        )}
        <PageHeaderNavSlot />
      </div>
    </header>
  );
};
