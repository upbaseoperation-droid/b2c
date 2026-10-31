'use client';

import React from 'react';
import { Menu, Building2, PanelLeftOpen } from 'lucide-react';
import { UserProfile } from '../lib/types';
import type { TabKey } from './Sidebar';
import { PageActionsSlot } from './ui';
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
  onToggleMobileSidebar,
  isSidebarCollapsed = false,
  onToggleSidebarCollapse,
  userScopeSummary,
}) => {
  return (
    <header className="app-header sticky top-0 z-20 min-h-12 bg-surface border-b border-line px-3 sm:px-5 lg:px-6 py-2 flex flex-wrap lg:flex-nowrap items-center justify-between gap-2 shrink-0">
      {/* Khối trái: Nút menu và Tiêu đề trang */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

        {onToggleSidebarCollapse && isSidebarCollapsed && (
          <button
            type="button"
            onClick={onToggleSidebarCollapse}
            className="hidden lg:inline-flex items-center gap-2 rounded-lg border px-3 py-1 bg-accent-soft text-accent border-accent/30 hover:bg-accent-soft/80 text-xs font-semibold transition-colors shrink-0 cursor-pointer"
            title="Mở lại thanh menu bên trái"
            aria-label="Mở lại thanh menu bên trái"
          >
            <PanelLeftOpen className="w-4 h-4" />
            <span>Menu</span>
          </button>
        )}

        <h1 className="text-sm sm:text-base font-semibold text-ink leading-6 tracking-tight whitespace-nowrap shrink-0">{title}</h1>
      </div>

      {/* Khối phải: Phạm vi phân quyền (khi giới hạn phạm vi) & Thao tác trang */}
      <div className="flex items-center justify-end gap-2 shrink-0 ml-auto empty:hidden">
        {activeTab !== 'tiktok-crawler' && activeTab !== 'input-plan' && (!groupTabs || groupTabs.length <= 1) && (
          currentUser.role === 'BRAND_PARTNER' ? (
            <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-md bg-positive-soft text-positive text-xs font-medium border border-positive/20 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-positive shrink-0" aria-hidden="true" />
              <Building2 className="w-3.5 h-3.5 text-positive shrink-0" />
              <span className="truncate max-w-[160px]">{currentUser.assignedBrands?.[0] || currentUser.linkedEntityName || 'Kutieskin'}</span>
            </div>
          ) : userScopeSummary && !userScopeSummary.isGlobal ? (
            <div
              title={userScopeSummary.scopeTooltip}
              className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-md bg-accent-soft text-accent text-xs font-medium border border-accent/25 shrink-0"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" aria-hidden="true" />
              <Building2 className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="truncate max-w-[180px]">{userScopeSummary.scopeBadgeText}</span>
            </div>
          ) : null
        )}

        <PageActionsSlot />
      </div>
    </header>
  );
};
