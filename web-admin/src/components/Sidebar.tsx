'use client';

import React, { useState } from 'react';
import {
  CheckSquare,
  BarChart2,
  BarChart3,
  LayoutDashboard,
  Layers,
  FileText,
  Building2,
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
  Sparkles,
  KeyRound,
  Film,
  Store,
  Search,
  type LucideIcon,
} from 'lucide-react';
import { UserProfile, TabKey } from '../lib/types';
import { Avatar, BrandLogo } from './ui';
export type { TabKey };

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

// Hàm phân quyền danh mục điều hướng theo vai trò (Bảo mật 100% dữ liệu nội bộ UpBase)
function getNavSectionsForUserRole(role: UserProfile['role']): NavSection[] {
  switch (role) {
    case 'ADMIN':
    case 'MANAGER':
      return [
        {
          title: 'Cá nhân',
          items: [
            { key: 'cockpit', label: 'Việc của tôi', icon: CheckSquare },
          ],
        },
        {
          title: '1. Kế hoạch & Phân bổ',
          items: [
            { key: 'input-plan', label: 'Kế hoạch tháng', icon: Calendar },
            { key: 'brand-knowledge', label: 'Hồ sơ thương hiệu', icon: BookOpen },
            { key: 'stores', label: 'Hồ sơ gian hàng', icon: Store },
            { key: 'manager', label: 'Điều phối & Quản lý', icon: Split },
          ],
        },
        {
          title: '2. Vận hành Booking & KOC',
          items: [
            { key: 'booking', label: 'Quản lý Booking', icon: Users },
            { key: 'content', label: 'Kịch bản & Video', icon: FileText },
            { key: 'koc-master', label: 'Danh bạ KOC', icon: Users },
          ],
        },
        {
          title: '3. Hợp đồng & Hàng mẫu',
          items: [
            { key: 'contracts', label: 'Hợp đồng', icon: FileCheck },
            { key: 'sample-tracker', label: 'Hàng mẫu & Spark Ads', icon: Package },
          ],
        },
        {
          title: '4. Báo cáo & Dữ liệu',
          items: [
            { key: 'dashboard-bi', label: 'Báo cáo hiệu suất & GMV', icon: LayoutDashboard },
            { key: 'master-data', label: 'Dữ liệu gốc', icon: Database },
            { key: 'partner-access', label: 'Phân quyền & Tài khoản', icon: KeyRound },
          ],
        },
      ];

    case 'LEADER':
      return [
        {
          title: 'Cá nhân',
          items: [
            { key: 'cockpit', label: 'Việc của tôi', icon: CheckSquare },
          ],
        },
        {
          title: '1. Kế hoạch & Phân bổ',
          items: [
            { key: 'input-plan', label: 'Kế hoạch tháng', icon: Calendar },
            { key: 'brand-knowledge', label: 'Hồ sơ thương hiệu', icon: BookOpen },
            { key: 'stores', label: 'Hồ sơ gian hàng', icon: Store },
            { key: 'manager', label: 'Điều phối nhóm', icon: Split },
          ],
        },
        {
          title: '2. Vận hành Booking & KOC',
          items: [
            { key: 'booking', label: 'Quản lý Booking', icon: Users },
            { key: 'content', label: 'Kịch bản & Video', icon: FileText },
            { key: 'koc-master', label: 'Danh bạ KOC', icon: Users },
          ],
        },
        {
          title: '3. Hợp đồng & Hàng mẫu',
          items: [
            { key: 'contracts', label: 'Hợp đồng', icon: FileCheck },
            { key: 'sample-tracker', label: 'Hàng mẫu & Spark Ads', icon: Package },
          ],
        },
        {
          title: '4. Báo cáo & Dữ liệu',
          items: [
            { key: 'dashboard-bi', label: 'Báo cáo hiệu suất', icon: LayoutDashboard },
            { key: 'master-data', label: 'Dữ liệu gốc', icon: Database },
          ],
        },
      ];

    case 'BOOKING_MEMBER':
      return [
        {
          title: 'Cá nhân',
          items: [
            { key: 'cockpit', label: 'Việc của tôi', icon: CheckSquare },
          ],
        },
        {
          title: '1. Kế hoạch & Đợt chạy',
          items: [
            { key: 'input-plan', label: 'Kế hoạch tháng', icon: Calendar },
            { key: 'brand-knowledge', label: 'Hồ sơ thương hiệu', icon: BookOpen },
            { key: 'stores', label: 'Hồ sơ gian hàng', icon: Store },
            { key: 'koc-listing', label: 'Listing & Air Video', icon: Film },
          ],
        },
        {
          title: '2. Vận hành Booking & KOC',
          items: [
            { key: 'booking', label: 'Quản lý Booking', icon: Users },
            { key: 'koc-master', label: 'Danh bạ KOC', icon: Users },
          ],
        },
        {
          title: '3. Hợp đồng & Hàng mẫu',
          items: [
            { key: 'contracts', label: 'Hợp đồng', icon: FileCheck },
            { key: 'sample-tracker', label: 'Hàng mẫu', icon: Package },
          ],
        },
      ];

    case 'CONTENT_MEMBER':
      return [
        {
          title: 'Cá nhân',
          items: [
            { key: 'cockpit', label: 'Việc của tôi', icon: CheckSquare },
          ],
        },
        {
          title: '1. Sáng tạo & Kịch bản',
          items: [
            { key: 'content', label: 'Kịch bản video', icon: FileText },
            { key: 'content-angles', label: 'Góc nội dung (Angles)', icon: Sparkles },
          ],
        },
        {
          title: '2. Làm việc với Brand',
          items: [
            { key: 'campaigns', label: 'Chiến dịch Brand', icon: Layers },
            { key: 'brand-knowledge', label: 'Hồ sơ thương hiệu', icon: BookOpen },
            { key: 'push-products', label: 'Sản phẩm đẩy', icon: TrendingUp },
          ],
        },
        {
          title: '3. Vận hành & Đánh giá',
          items: [
            { key: 'sample-tracker', label: 'Hàng mẫu', icon: Package },
            { key: 'performance-p3', label: 'Đánh giá 4P & thưởng', icon: Coins },
          ],
        },
      ];

    case 'BRAND_MEMBER':
      return [
        {
          title: 'Cá nhân',
          items: [
            { key: 'cockpit', label: 'Việc của tôi', icon: CheckSquare },
          ],
        },
        {
          title: '1. Kế hoạch & Brand',
          items: [
            { key: 'input-plan', label: 'Kế hoạch tháng', icon: Calendar },
            { key: 'campaigns', label: 'Chiến dịch Brand', icon: Layers },
            { key: 'brand-knowledge', label: 'Hồ sơ thương hiệu', icon: BookOpen },
          ],
        },
        {
          title: '2. Vận hành & Sản phẩm',
          items: [
            { key: 'content', label: 'Kịch bản video', icon: FileText },
            { key: 'sample-tracker', label: 'Hàng mẫu', icon: Package },
            { key: 'push-products', label: 'Sản phẩm đẩy', icon: TrendingUp },
          ],
        },
        {
          title: '3. Báo cáo hiệu suất',
          items: [
            { key: 'ads-report', label: 'Báo cáo Ads TikTok', icon: BarChart3 },
            { key: 'performance-p3', label: 'Đánh giá 4P & thưởng', icon: Coins },
          ],
        },
      ];

    case 'GROWTH_MEMBER':
      return [
        {
          title: 'Cá nhân',
          items: [
            { key: 'cockpit', label: 'Việc của tôi', icon: CheckSquare },
          ],
        },
        {
          title: '1. Kế hoạch & Doanh số',
          items: [
            { key: 'input-plan', label: 'Kế hoạch tháng', icon: Calendar },
            { key: 'brand-knowledge', label: 'Hồ sơ thương hiệu', icon: BookOpen },
            { key: 'dashboard-bi', label: 'Dashboard điều hành', icon: BarChart3 },
            { key: 'stores', label: 'Hồ sơ gian hàng', icon: Store },
          ],
        },
        {
          title: '2. Chiến dịch & Báo cáo',
          items: [
            { key: 'campaigns', label: 'Chiến dịch Brand', icon: Layers },
            { key: 'ads-report', label: 'Báo cáo Ads TikTok', icon: BarChart3 },
            { key: 'performance-p3', label: 'Đánh giá 4P & thưởng', icon: Coins },
          ],
        },
      ];

    case 'MEDIA_MEMBER':
      return [
        {
          title: 'Cá nhân',
          items: [
            { key: 'cockpit', label: 'Việc của tôi', icon: CheckSquare },
          ],
        },
        {
          title: '1. Kế hoạch & Ads',
          items: [
            { key: 'input-plan', label: 'Kế hoạch tháng', icon: Calendar },
            { key: 'ads-report', label: 'Báo cáo Ads TikTok', icon: BarChart3 },
          ],
        },
        {
          title: '2. Báo cáo & Hiệu suất',
          items: [
            { key: 'dashboard-bi', label: 'Dashboard điều hành', icon: BarChart3 },
            { key: 'campaigns', label: 'Chiến dịch Brand', icon: Layers },
            { key: 'performance-p3', label: 'Đánh giá 4P & thưởng', icon: Coins },
          ],
        },
      ];

    case 'MEMBER':
      return [
        {
          title: 'Cá nhân',
          items: [
            { key: 'cockpit', label: 'Việc của tôi', icon: CheckSquare },
          ],
        },
        {
          title: '1. Kế hoạch',
          items: [
            { key: 'input-plan', label: 'Kế hoạch tháng', icon: Calendar },
          ],
        },
        {
          title: '2. Vận hành Booking & KOC',
          items: [
            { key: 'booking', label: 'Quản lý Booking', icon: Users },
            { key: 'content', label: 'Kịch bản video', icon: FileText },
            { key: 'koc-master', label: 'Danh bạ KOC', icon: Users },
          ],
        },
        {
          title: '3. Hàng mẫu & Đánh giá',
          items: [
            { key: 'sample-tracker', label: 'Hàng mẫu', icon: Package },
            { key: 'performance-p3', label: 'Đánh giá 4P & thưởng', icon: Coins },
            { key: 'brand-knowledge', label: 'Hướng dẫn nhãn hàng', icon: BookOpen },
          ],
        },
      ];

    case 'BRAND_PARTNER':
      return [
        {
          title: 'Cổng Thương Hiệu',
          items: [
            { key: 'brand-hub', label: 'Cổng đối tác Brand', icon: ExternalLink },
            { key: 'koc-listing', label: 'Duyệt Listing KOC', icon: Film },
            { key: 'push-products', label: 'Sản phẩm đẩy', icon: TrendingUp },
            { key: 'content', label: 'Kịch bản video', icon: FileText },
          ],
        },
      ];

    case 'KOC_PARTNER':
      return [
        {
          title: 'Không Gian KOC / KOL',
          items: [
            { key: 'koc-hub', label: 'Hub đối tác KOC / KOL', icon: Users },
          ],
        },
      ];

    case 'CTV_PARTNER':
      return [
        {
          title: 'Không Gian CTV Video',
          items: [
            { key: 'self-channel-hub', label: 'Hub CTV Video', icon: Video },
          ],
        },
      ];

    default:
      return [
        {
          title: 'Cá nhân',
          items: [
            { key: 'cockpit', label: 'Việc của tôi', icon: CheckSquare },
          ],
        },
      ];
  }
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabSelect,
  currentUser,
  isMobileOpen = false,
  onCloseMobile,
  onLogout,
}) => {
  // Phân quyền menu hiển thị theo vai trò (Bảo mật 100% dữ liệu nội bộ UpBase)
  const navSections = getNavSectionsForUserRole(currentUser.role);
  const [query, setQuery] = useState('');
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const visibleSections = navSections.map(section => ({
    ...section,
    items: section.items.filter(item => normalize(item.label).includes(normalize(query.trim()))),
  })).filter(section => section.items.length > 0);

  const handleItemClick = (key: TabKey) => {
    onTabSelect(key);
    setQuery('');
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
        className={`app-sidebar w-60 bg-surface border-r border-line flex flex-col shrink-0 h-dvh select-none transition-transform duration-200 ease-in-out fixed inset-y-0 left-0 z-30 overscroll-contain ${
          isMobileOpen
            ? 'translate-x-0 shadow-2xl z-50'
            : '-translate-x-full lg:translate-x-0'
        }`}
        aria-label="Điều hướng chính"
      >
        <div className="h-20 px-5 flex items-center justify-between shrink-0">
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

        <div className="px-3 pb-4">
          <label className="relative block">
            <Search className="absolute left-3 top-3 w-4 h-4 text-ink-3 pointer-events-none" aria-hidden="true" />
            <input type="search" value={query} onChange={event => setQuery(event.target.value)} aria-label="Tìm trang trong menu" placeholder="Tìm trang…" className="w-full h-10 pl-9 pr-3 rounded-lg border border-line text-xs" />
          </label>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pt-2 pb-4 space-y-5 sidebar-scrollbar overscroll-contain">
          {visibleSections.length === 0 && <p role="status" className="px-2 text-xs text-ink-3">Không tìm thấy trang. Thử từ khóa khác.</p>}
          {visibleSections.map((section) => (
            <div key={section.title}>
              <div className="px-3 pb-2 text-2xs font-medium text-ink-3">{section.title.replace(/^\d+\.\s*/, '')}</div>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => handleItemClick(item.key)}
                      aria-current={isActive ? 'page' : undefined}
                      title={item.label}
                      className={`sidebar-item w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-[13.5px] transition-colors ${
                        isActive
                          ? 'bg-accent-soft text-accent font-semibold'
                          : 'text-ink-2 hover:text-ink hover:bg-sunken'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-accent' : 'text-ink-3'}`} strokeWidth={1.75} />
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
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[9.5px] font-bold tracking-wider uppercase shrink-0 ${
                    currentUser.role === 'ADMIN' ? 'bg-red-100 text-red-700' :
                    currentUser.role === 'MANAGER' ? 'bg-purple-100 text-purple-700' :
                    currentUser.role === 'LEADER' ? 'bg-blue-100 text-blue-700' :
                    currentUser.role === 'BOOKING_MEMBER' ? 'bg-cyan-100 text-cyan-800' :
                    currentUser.role === 'GROWTH_MEMBER' ? 'bg-amber-100 text-amber-900 border border-amber-300 font-black' :
                    currentUser.role === 'MEDIA_MEMBER' ? 'bg-blue-100 text-blue-900 border border-blue-300 font-black' :
                    currentUser.role === 'CONTENT_MEMBER' ? 'bg-amber-100 text-amber-800' :
                    currentUser.role === 'BRAND_MEMBER' ? 'bg-emerald-100 text-emerald-800' :
                    currentUser.role === 'BRAND_PARTNER' ? 'bg-purple-100 text-purple-800' :
                    currentUser.role === 'KOC_PARTNER' ? 'bg-amber-100 text-amber-800' :
                    currentUser.role === 'CTV_PARTNER' ? 'bg-emerald-100 text-emerald-800' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {currentUser.role.replace('_PARTNER', ' (Đối tác)').replace('_MEMBER', '')}
                  </span>
                  <span className="text-2xs text-ink-3 truncate">{currentUser.roleTitle}</span>
                </div>
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
