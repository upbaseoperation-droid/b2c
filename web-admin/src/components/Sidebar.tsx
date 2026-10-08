'use client';

import React from 'react';
import {
  CheckSquare,
  BarChart2,
  BarChart3,
  Layers,
  FileText,
  Users,
  FileCheck,
  TrendingUp,
  Award,
  Package,
  Coins,
  BookOpen,
  Calendar,
  Database,
  Split,
  ExternalLink,
  Video,
  X,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { UserProfile } from '../lib/types';
import { Avatar, BrandLogo } from './ui';

export type TabKey =
  | 'cockpit'
  | 'overview'
  | 'input-plan'
  | 'self-channel-hub'
  | 'master-data'
  | 'push-products'
  | 'stores'
  | 'campaigns'
  | 'brand-knowledge'
  | 'content'
  | 'booking'
  | 'koc-master'
  | 'contracts'
  | 'manager'
  | 'sample-tracker'
  | 'performance-p3'
  | 'leaderboard'
  | 'brand-hub'
  | 'koc-hub'
  | 'ads-report';

interface NavItem {
  key: TabKey;
  label: string;
  icon: LucideIcon;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  activeTab: TabKey;
  onTabSelect: (tab: TabKey) => void;
  currentUser: UserProfile;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabSelect,
  currentUser,
  isMobileOpen = false,
  onCloseMobile,
  onLogout,
}) => {
  const isManager = currentUser.role === 'MANAGER';

  const navSections: NavSection[] = [
    {
      title: 'Của tôi',
      items: [
        { key: 'cockpit', label: 'Việc của tôi', icon: CheckSquare },
        { key: 'overview', label: 'Tổng quan', icon: BarChart2 },
      ],
    },
    {
      title: 'Vận hành nội bộ',
      items: [
        { key: 'input-plan', label: 'Kế hoạch tháng', icon: Calendar },
        { key: 'push-products', label: 'Sản phẩm đẩy', icon: TrendingUp },
        { key: 'campaigns', label: 'Làm việc với Brand', icon: Layers },
        { key: 'booking', label: 'Booking', icon: Users },
        { key: 'content', label: 'Kịch bản', icon: FileText },
        { key: 'contracts', label: 'Hợp đồng & thanh toán', icon: FileCheck },
        { key: 'ads-report', label: 'Báo cáo Ads TikTok', icon: BarChart3 },
        { key: 'sample-tracker', label: 'Hàng mẫu', icon: Package },
        { key: 'brand-knowledge', label: 'Hướng dẫn nhãn hàng', icon: BookOpen },
      ],
    },
    {
      title: 'Dữ liệu',
      items: [{ key: 'master-data', label: 'Dữ liệu gốc', icon: Database }],
    },
    {
      title: 'Quản lý',
      items: [
        { key: 'manager', label: isManager ? 'Phân bổ & điều phối' : 'Kế hoạch & báo cáo', icon: Split },
        { key: 'performance-p3', label: 'Đánh giá 4P & thưởng', icon: Coins },
        { key: 'leaderboard', label: 'Hiệu suất nhân sự', icon: Award },
      ],
    },
    {
      title: 'Cổng đối tác ngoài (3 Hubs)',
      items: [
        { key: 'brand-hub', label: 'Cổng đối tác Brand', icon: ExternalLink },
        { key: 'self-channel-hub', label: 'Hub Cộng tác viên (CTV)', icon: Video },
        { key: 'koc-hub', label: 'Hub đối tác KOC / KOL', icon: Users },
      ],
    },
  ];

  const handleItemClick = (key: TabKey) => {
    onTabSelect(key);
    onCloseMobile?.();
  };

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden animate-in fade-in duration-150"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`w-60 bg-surface border-r border-line flex flex-col shrink-0 h-screen select-none transition-transform duration-200 ease-in-out ${
          isMobileOpen
            ? 'fixed inset-y-0 left-0 z-50 translate-x-0 shadow-2xl'
            : 'fixed inset-y-0 left-0 -translate-x-full lg:sticky lg:top-0 lg:translate-x-0 z-30'
        }`}
        aria-label="Điều hướng chính"
      >
        <div className="h-14 px-4 flex items-center justify-between shrink-0">
          <BrandLogo height={22} />

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-md text-ink-3 hover:text-ink hover:bg-sunken transition-colors"
              aria-label="Đóng menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pt-2 pb-4 space-y-5 sidebar-scrollbar">
          {navSections.map((section) => (
            <div key={section.title}>
              <div className="px-2 pb-1 text-2xs font-medium text-ink-3">{section.title}</div>
              <div className="space-y-px">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => handleItemClick(item.key)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left text-[13.5px] transition-colors ${
                        isActive
                          ? 'bg-sunken text-ink font-medium'
                          : 'text-ink-2 hover:text-ink hover:bg-sunken'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-ink' : 'text-ink-3'}`} strokeWidth={1.75} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 px-3 py-3 border-t border-line">
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar name={currentUser.name} src={currentUser.larkAvatarUrl} size={28} />
              <div className="min-w-0 leading-tight">
                <span className="block text-[13px] font-medium text-ink truncate">{currentUser.name}</span>
                <span className="block text-2xs text-ink-3 truncate">{currentUser.roleTitle}</span>
              </div>
            </div>

            {onLogout && (
              <button
                onClick={onLogout}
                className="p-1.5 rounded-md text-ink-3 hover:text-ink hover:bg-sunken transition-colors shrink-0"
                title="Đăng xuất"
                aria-label="Đăng xuất"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.75} />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
