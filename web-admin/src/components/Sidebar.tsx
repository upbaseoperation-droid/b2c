'use client';

import React from 'react';
import {
  CheckSquare,
  BarChart2,
  Store,
  Layers,
  FileText,
  Users,
  FileCheck,
  TrendingUp,
  Award,
  ShieldCheck,
  Package,
  Coins,
  BookOpen,
  Calculator,
  Calendar,
  X
} from 'lucide-react';
import { UserProfile } from '../lib/types';

export type TabKey =
  | 'cockpit'
  | 'overview'
  | 'input-plan'
  | 'stores'
  | 'campaigns'
  | 'brand-knowledge'
  | 'content'
  | 'booking'
  | 'contracts'
  | 'manager'
  | 'sample-tracker'
  | 'performance-p3'
  | 'leaderboard'
  | 'brand-hub';

interface NavItem {
  key: TabKey;
  label: string;
  icon: any;
  badge?: string;
  badgeType?: 'lead' | 'team' | 'portal';
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
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabSelect,
  currentUser,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const isManager = currentUser.role === 'MANAGER';

  const navSections: NavSection[] = [
    {
      title: 'TỔNG QUAN & CÁ NHÂN',
      items: [
        {
          key: 'cockpit',
          label: 'Công Việc Của Tôi',
          icon: CheckSquare,
        },
        {
          key: 'overview',
          label: 'Tổng Quan Vận Hành',
          icon: BarChart2,
        },
      ]
    },
    {
      title: 'TÁC NGHIỆP PHÂN HỆ',
      items: [
        {
          key: 'input-plan',
          label: 'Kế Hoạch Tháng (Monthly Plan)',
          icon: Calendar,
          badge: 'Tháng 10',
          badgeType: 'team'
        },
        {
          key: 'booking',
          label: 'Quản Lý Booking',
          icon: Users,
          badge: currentUser.role === 'BOOKING_MEMBER' ? 'Của Tôi' : undefined,
          badgeType: 'team'
        },
        {
          key: 'content',
          label: 'Kịch Bản & Content',
          icon: FileText,
          badge: currentUser.role === 'CONTENT_MEMBER' ? 'Của Tôi' : undefined,
          badgeType: 'team'
        },
        {
          key: 'campaigns',
          label: 'Brand Team (Chiến Lược & Brief)',
          icon: Layers,
          badge: currentUser.role === 'BRAND_MEMBER' ? 'Của Tôi' : undefined,
          badgeType: 'team'
        },
        {
          key: 'brand-knowledge',
          label: 'Bách Khoa Brand Guideline',
          icon: BookOpen,
        },
        {
          key: 'stores',
          label: 'Gian Hàng & Nhãn Hàng',
          icon: Store,
        },
        {
          key: 'contracts',
          label: 'Hợp Đồng & Thanh Toán',
          icon: FileCheck,
        },
        {
          key: 'sample-tracker',
          label: 'Giám Sát Mẫu & Bùng KOC',
          icon: Package,
        },
      ]
    },
    {
      title: 'QUẢN TRỊ & ĐIỀU HÀNH',
      items: [
        {
          key: 'manager',
          label: isManager ? 'Phân Bổ & Điều Phối' : 'Kế Hoạch & Báo Cáo',
          icon: TrendingUp,
          badge: isManager ? 'Trưởng Phòng' : 'Lead',
          badgeType: 'lead'
        },
        {
          key: 'performance-p3',
          label: 'Đánh Giá 4P & Thưởng P3',
          icon: Coins,
        },
        {
          key: 'leaderboard',
          label: 'Hiệu Suất Nhân Sự',
          icon: Award,
        },
      ]
    },
    {
      title: 'CỔNG NGOÀI (CLIENT)',
      items: [
        {
          key: 'brand-hub',
          label: 'Brand Client Portal',
          icon: ShieldCheck,
          badge: 'Khách',
          badgeType: 'portal'
        },
      ]
    }
  ];

  const handleItemClick = (key: TabKey) => {
    onTabSelect(key);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden animate-in fade-in duration-150"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Element */}
      <aside
        className={`w-64 lg:w-72 xl:w-[300px] bg-white border-r border-slate-200 flex flex-col shrink-0 h-screen select-none transition-transform duration-200 ease-in-out ${
          isMobileOpen
            ? 'fixed inset-y-0 left-0 z-50 translate-x-0 shadow-2xl'
            : 'fixed inset-y-0 left-0 -translate-x-full lg:sticky lg:top-0 lg:translate-x-0 z-30'
        }`}
        aria-label="Thanh điều hướng chính"
      >
        {/* Brand Header: Fixed h-14 to perfectly match TopHeader horizontal border */}
        <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-xs shadow-xs shrink-0">
              UB
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-900 tracking-tight block truncate leading-tight">
                Upbase Ops
              </span>
              <span className="text-[11px] text-slate-500 block truncate font-normal leading-tight">
                Marketing B2C
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide ${
              isManager 
                ? 'bg-purple-50 text-purple-700 border-purple-200' 
                : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              {currentUser.role === 'MANAGER' ? 'LEAD' : currentUser.role === 'BOOKING_MEMBER' ? 'BOOKING' : currentUser.role === 'CONTENT_MEMBER' ? 'CONTENT' : 'BRAND'}
            </span>

            {/* Close button for Mobile Drawer only */}
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="lg:hidden p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                aria-label="Đóng thanh điều hướng"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Categorized Navigation Menu: Independent scroll with slim scrollbar */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4 sidebar-scrollbar">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              <div className="px-3 pt-1 pb-1 text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                {section.title}
              </div>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleItemClick(item.key)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors duration-100 group ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200/90 shadow-2xs'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate min-w-0 pr-1">
                      <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-700'}`} strokeWidth={isActive ? 2 : 1.75} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                        item.badgeType === 'lead'
                          ? isManager
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                          : item.badgeType === 'portal'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Footer: Fixed shrink-0 with 24px icon alignment */}
        <div className="shrink-0 p-3 border-t border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-200 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
              {currentUser.avatar}
            </div>
            <div className="truncate min-w-0">
              <span className="text-xs font-bold text-slate-900 block truncate leading-tight">
                {currentUser.name}
              </span>
              <span className="text-[11px] text-slate-500 block truncate leading-tight mt-0.5">
                {currentUser.roleTitle}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
