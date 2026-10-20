'use client';

import React from 'react';
import { Menu, Building2, PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import { UserProfile } from '../lib/types';
import type { TabKey } from './Sidebar';
import { PageActionsSlot, PageHeaderNavSlot } from './ui';
import type { UserScopeSummary } from '../lib/rbacScope';

interface TopHeaderProps {
  currentUser: UserProfile;
  onUserChange?: (user: UserProfile) => void;
  onOpenQuickBook?: () => void;
  onOpenImport?: () => void;
  title: string;
  activeTab?: TabKey;
  selectedBrand?: string;
  onBrandChange?: (brand: string) => void;
  onNavigateTab?: (tab: TabKey) => void;
  onToggleMobileSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
  onLogout?: () => void;
  userScopeSummary?: UserScopeSummary;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentUser,
  title,
  activeTab,
  onToggleMobileSidebar,
  isSidebarCollapsed = false,
  onToggleSidebarCollapse,
  userScopeSummary,
}) => {
  return (
    <header className="app-header sticky top-0 z-20 min-h-12 bg-surface/95 backdrop-blur border-b border-line px-3 sm:px-6 lg:px-8 py-1.5 sm:py-2 flex flex-wrap items-center justify-between gap-2 sm:gap-3 shrink-0">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
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

        <div className="min-w-0 flex-1 flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <h1 className="text-base sm:text-lg font-semibold text-ink leading-6 tracking-tight min-w-0 max-w-full truncate sm:shrink-0">{title}</h1>
          <PageHeaderNavSlot />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 min-w-0 max-w-full">
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
      </div>
    </header>
  );
};
