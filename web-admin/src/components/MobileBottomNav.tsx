'use client';

import React from 'react';
import {
  CheckSquare,
  Calendar,
  Users,
  FileText,
  Menu,
  ExternalLink,
  Film,
  Layers,
  FileCheck,
  Package,
  Video,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { UserProfile, TabKey } from '../lib/types';
import { getAllowedTabsForRole } from '../lib/rbacData';
import { resolveNavGroupTabKey } from '../lib/navGroups';

interface MobileBottomNavProps {
  activeTab: TabKey;
  onTabSelect: (tab: TabKey) => void;
  currentUser: UserProfile;
  onOpenMenu: () => void;
  pendingTasksCount?: number;
}

interface NavButtonConfig {
  key: TabKey;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabSelect,
  currentUser,
  onOpenMenu,
  pendingTasksCount = 0,
}) => {
  const allowedTabs = React.useMemo<TabKey[]>(
    () => getAllowedTabsForRole(currentUser.role),
    [currentUser.role]
  );

  // Chọn 4 mục điều hướng cốt lõi theo vai trò
  const quickItems = React.useMemo<NavButtonConfig[]>(() => {
    if (currentUser.role === 'BRAND_PARTNER') {
      const brandItems: NavButtonConfig[] = [
        { key: 'brand-hub', label: 'Cổng Brand', icon: ExternalLink },
        { key: 'koc-listing', label: 'Listing & Air', icon: Film },
        { key: 'content', label: 'Kịch bản', icon: FileText },
        { key: 'campaigns', label: 'Chiến dịch', icon: Layers },
      ];
      return brandItems;
    }

    if (currentUser.role === 'KOC_PARTNER') {
      const kocItems: NavButtonConfig[] = [
        { key: 'koc-hub', label: 'Cổng KOC', icon: Users },
        { key: 'content', label: 'Kịch bản', icon: FileText },
        { key: 'contracts', label: 'Hợp đồng', icon: FileCheck },
        { key: 'sample-tracker', label: 'Hàng mẫu', icon: Package },
      ];
      return kocItems;
    }

    if (currentUser.role === 'CTV_PARTNER') {
      const ctvItems: NavButtonConfig[] = [
        { key: 'self-channel-hub', label: 'CTV Video', icon: Video },
        { key: 'content', label: 'Kịch bản', icon: FileText },
        { key: 'sample-tracker', label: 'Hàng mẫu', icon: Package },
        { key: 'push-products', label: 'Sản phẩm', icon: TrendingUp },
      ];
      return ctvItems;
    }

    // Nhân viên nội bộ (Specialist, Leader, Manager, Admin)
    const internalItems: NavButtonConfig[] = [
      {
        key: 'cockpit',
        label: 'Việc của tôi',
        icon: CheckSquare,
        badge: pendingTasksCount > 0 ? pendingTasksCount : undefined,
      },
      { key: 'input-plan', label: 'Kế hoạch', icon: Calendar },
      { key: 'booking', label: 'Booking', icon: Users },
      { key: 'content', label: 'Kịch bản & Air', icon: FileText },
    ];
    return internalItems.filter(item => allowedTabs.includes(item.key));
  }, [currentUser.role, pendingTasksCount, allowedTabs]);

  const activeGroupResolved = resolveNavGroupTabKey(activeTab);

  return (
    <nav
      aria-label="Thanh điều hướng nhanh trên di động"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur border-t border-line pb-[env(safe-area-inset-bottom)] select-none shadow-[0_-2px_10px_rgb(22_23_26/0.05)]"
    >
      <div className="h-14 flex items-center justify-around px-1 max-w-lg mx-auto">
        {quickItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeTab === item.key || activeGroupResolved === item.key;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onTabSelect(item.key)}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors relative cursor-pointer ${
                isActive
                  ? 'text-accent font-semibold'
                  : 'text-ink-3 hover:text-ink'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 text-accent' : ''
                  }`}
                  strokeWidth={isActive ? 2.25 : 1.75}
                />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 px-1 min-w-[15px] h-[15px] rounded-full bg-critical text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] leading-tight mt-1 truncate max-w-full px-0.5">
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Nút mở Menu đầy đủ (Sidebar Drawer) */}
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center text-ink-3 hover:text-ink transition-colors cursor-pointer"
          aria-label="Mở tất cả tính năng"
        >
          <Menu className="w-5 h-5" strokeWidth={1.75} />
          <span className="text-[10px] leading-tight mt-1 truncate max-w-full px-0.5">
            Tất cả
          </span>
        </button>
      </div>
    </nav>
  );
};
