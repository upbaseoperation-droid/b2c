'use client';

import React from 'react';
import { Menu, ArrowRight, Building2, PanelLeftOpen, PanelLeftClose } from 'lucide-react';
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
  subtitle?: string;
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
  subtitle,
  activeTab,
  onNavigateTab,
  onToggleMobileSidebar,
  isSidebarCollapsed = false,
  onToggleSidebarCollapse,
  userScopeSummary,
}) => {
  return (
    <header className="app-header sticky top-0 z-20 min-h-14 bg-surface/95 backdrop-blur border-b border-line px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-1.5 -ml-1.5 rounded-md text-ink-2 hover:text-ink hover:bg-sunken transition-colors shrink-0"
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
                ? 'px-2.5 py-1.5 bg-accent-soft text-accent border-accent/30 hover:bg-accent-soft/80 text-xs font-semibold'
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

        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-ink leading-7 tracking-tight">{title}</h1>
          {subtitle && <p className="text-2xs text-ink-3 truncate hidden md:block">{subtitle}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
        {currentUser.role === 'BRAND_PARTNER' ? (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-positive-soft text-positive text-xs font-medium">
            <Building2 className="w-3.5 h-3.5 text-positive" />
            <span>{currentUser.assignedBrands?.[0] || currentUser.linkedEntityName || 'Kutieskin'}</span>
          </div>
        ) : userScopeSummary && !userScopeSummary.isGlobal ? (
          <div 
            title={userScopeSummary.scopeTooltip}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent-soft text-accent text-xs font-medium border border-line"
          >
            <Building2 className="w-3.5 h-3.5 text-accent shrink-0" />
            <span className="truncate max-w-[260px]">{userScopeSummary.scopeBadgeText}</span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sunken text-ink-2 text-xs font-medium border border-line">
            <Building2 className="w-3.5 h-3.5 text-ink-3 shrink-0" />
            <span>Toàn quyền ({userScopeSummary?.totalBrandCount || 42} thương hiệu / {userScopeSummary?.totalStoreCount || 69} gian hàng B2C)</span>
          </div>
        )}

        {activeTab === 'content' && onNavigateTab && (
          <button
            onClick={() => onNavigateTab('content-angles')}
            className="h-[34px] px-3 rounded-md bg-accent-soft hover:bg-sunken text-accent border border-line text-[13px] font-medium transition-colors flex items-center gap-1.5"
          >
            <span className="hidden sm:inline">Góc nội dung</span>
            <ArrowRight className="w-3.5 h-3.5 text-accent" />
          </button>
        )}

        <PageActionsSlot />
      </div>
    </header>
  );
};

