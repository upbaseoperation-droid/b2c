'use client';

import React from 'react';
import { Menu, Building2, PanelLeftOpen, PanelLeftClose, LogOut, Loader2, ChevronDown } from 'lucide-react';
import { UserProfile } from '../lib/types';
import { USERS } from '../lib/mockData';
import type { TabKey } from './Sidebar';
import { resolveNavGroupTabKey } from '../lib/navGroups';
import { PageActionsSlot, PageHeaderNavSlot, Segmented } from './ui';
import type { UserScopeSummary } from '../lib/rbacScope';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Quản trị',
  MANAGER: 'Trưởng phòng B2C',
  LEADER: 'Trưởng nhóm',
  MEMBER: 'Chuyên viên',
  BRAND_MEMBER: 'Brand PIC',
  CONTENT_MEMBER: 'Content',
  BOOKING_MEMBER: 'Booking B2C',
  BRAND_PARTNER: 'Đối tác Brand',
  KOC_PARTNER: 'KOC / KOL',
  CTV_PARTNER: 'Cộng tác viên',
};

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
  onUserChange,
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
    <header className="app-header sticky top-0 z-20 min-h-12 bg-surface border-b border-line px-3 sm:px-5 lg:px-6 py-1.5 flex flex-wrap items-center justify-start gap-1.5 sm:gap-2 shrink-0">
      {/* Khối 1: Nút menu di động / ẩn menu desktop & Tiêu đề trang */}
      <div className="order-1 flex items-center gap-2 min-w-0 shrink-0">
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

        <h1 className="text-sm sm:text-lg font-semibold text-ink leading-6 tracking-tight truncate max-w-[180px] sm:max-w-none">{title}</h1>
      </div>

      {/* Khối 2: Cụm thao tác trang & Đăng xuất (Mobile: cạnh tiêu đề; Desktop: phía cuối thanh) */}
      <div className="order-2 sm:order-3 ml-auto flex flex-wrap items-center justify-end gap-1.5 shrink-0 max-w-full">
        {activeTab !== 'tiktok-crawler' && activeTab !== 'input-plan' && (
          currentUser.role === 'BRAND_PARTNER' ? (
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-positive-soft text-positive text-xs font-medium border border-positive/20 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-positive shrink-0" aria-hidden="true" />
              <Building2 className="w-3.5 h-3.5 text-positive shrink-0" />
              <span className="truncate max-w-[160px]">{currentUser.assignedBrands?.[0] || currentUser.linkedEntityName || 'Kutieskin'}</span>
            </div>
          ) : userScopeSummary && !userScopeSummary.isGlobal ? (
            <div
              title={userScopeSummary.scopeTooltip}
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent-soft text-accent text-xs font-medium border border-accent/25 shrink-0"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" aria-hidden="true" />
              <Building2 className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="truncate max-w-[180px]">{userScopeSummary.scopeBadgeText}</span>
            </div>
          ) : (
            <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sunken text-ink-2 text-xs font-medium border border-line shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-positive shrink-0" aria-hidden="true" />
              <Building2 className="w-3.5 h-3.5 text-ink-3 shrink-0" />
              <span>Toàn hệ thống (69 gian hàng)</span>
            </div>
          )
        )}

        <PageActionsSlot />

        {onUserChange && (
          <label className="hidden sm:inline-flex relative items-center h-8 pl-2 pr-6 rounded-md border border-line bg-surface hover:bg-sunken transition-colors text-xs text-ink cursor-pointer shrink-0">
            <select
              value={USERS.some(u => u.id === currentUser.id) ? currentUser.id : ''}
              onChange={(e) => {
                const u = USERS.find((item) => item.id === e.target.value);
                if (u) onUserChange(u);
              }}
              className="appearance-none bg-transparent font-medium text-ink focus:outline-none cursor-pointer pr-1 max-w-[150px] xl:max-w-[185px] truncate"
              aria-label="Chuyển tài khoản giả lập"
            >
              {!USERS.some(u => u.id === currentUser.id) && (
                <option value="">
                  {currentUser.name} · {ROLE_LABEL[currentUser.role] ?? currentUser.role}
                </option>
              )}
              <optgroup label="Ban Điều Hành & Quản Trị">
                {USERS.filter(u => ['ADMIN', 'MANAGER'].includes(u.role)).map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} · {ROLE_LABEL[user.role] ?? user.role}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Trưởng Nhóm & Chuyên Viên Nội Bộ">
                {USERS.filter(u => ['LEADER', 'BOOKING_MEMBER', 'CONTENT_MEMBER', 'BRAND_MEMBER', 'MEMBER'].includes(u.role)).map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} · {user.id.startsWith('contract-demo-') ? user.roleTitle : (ROLE_LABEL[user.role] ?? user.role)}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Đối Tác Bên Thứ 3">
                {USERS.filter(u => ['BRAND_PARTNER', 'KOC_PARTNER', 'CTV_PARTNER'].includes(u.role)).map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} · {ROLE_LABEL[user.role] ?? user.role}
                  </option>
                ))}
              </optgroup>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-ink-3 absolute right-2 pointer-events-none" />
          </label>
        )}

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

      {/* Khối 3: Tabs nhóm & Điều hướng con (Mobile: dòng riêng cuộn ngang; Desktop: nằm cạnh tiêu đề, giữ nguyên kích thước tự nhiên) */}
      <div className="order-3 sm:order-2 w-full sm:w-auto flex items-center gap-2 sm:gap-2.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pt-1 sm:pt-0 border-t border-line/60 sm:border-t-0 empty:hidden shrink-0 max-w-full">
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
