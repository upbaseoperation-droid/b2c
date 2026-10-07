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
  Calculator
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
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabSelect,
  currentUser,
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
          label: 'Phân Rã Kế Hoạch (Input Plan)',
          icon: Calculator,
          badge: 'Tốc Độ',
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
          label: 'Kế Hoạch & Báo Cáo',
          icon: TrendingUp,
          badge: 'Lead',
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

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 h-screen sticky top-0 z-40 select-none overflow-y-auto">
      {/* Brand Header */}
      <div>
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center font-bold text-white text-sm shadow-sm">
              UB
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900 tracking-tight block">
                Upbase Ops
              </span>
              <span className="text-[11px] text-slate-500 block font-normal">
                Marketing B2C
              </span>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${
            isManager 
              ? 'bg-purple-50 text-purple-700 border-purple-200' 
              : 'bg-blue-50 text-blue-700 border-blue-200'
          }`}>
            {currentUser.role === 'MANAGER' ? 'LEAD' : currentUser.role === 'BOOKING_MEMBER' ? 'BOOKING' : currentUser.role === 'CONTENT_MEMBER' ? 'CONTENT' : 'BRAND'}
          </span>
        </div>

        {/* Categorized Navigation Menu */}
        <nav className="p-3 space-y-4">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              <div className="px-3 pt-1 pb-1 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                {section.title}
              </div>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => onTabSelect(item.key)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-left text-xs transition-colors duration-100 ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200/80 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} strokeWidth={1.75} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border shrink-0 ${
                        item.badgeType === 'lead'
                          ? isManager
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
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
      </div>

      {/* User Footer with Role Indicator */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/70">
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-md bg-white border border-slate-200 shadow-xs">
          <div className="w-7 h-7 rounded-md bg-blue-100 border border-blue-200 text-blue-700 font-bold flex items-center justify-center text-[11px] shrink-0">
            {currentUser.avatar}
          </div>
          <div className="truncate min-w-0">
            <span className="text-xs font-semibold text-slate-900 block truncate">
              {currentUser.name}
            </span>
            <span className="text-[10px] text-slate-500 block truncate">
              {currentUser.roleTitle}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
