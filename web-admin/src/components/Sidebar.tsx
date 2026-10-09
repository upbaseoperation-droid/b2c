'use client';

import React from 'react';
import {
  CheckSquare,
  BarChart2,
  BarChart3,
  LayoutDashboard,
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
  Sparkles,
  KeyRound,
  type LucideIcon,
} from 'lucide-react';
import { UserProfile } from '../lib/types';
import { Avatar, BrandLogo } from './ui';

export type TabKey =
  | 'cockpit'
  | 'overview'
  | 'dashboard-bi'
  | 'input-plan'
  | 'self-channel-hub'
  | 'master-data'
  | 'push-products'
  | 'stores'
  | 'campaigns'
  | 'brand-knowledge'
  | 'content'
  | 'content-angles'
  | 'partner-access'
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
          title: 'Dashboard & Báo cáo',
          items: [
            { key: 'dashboard-bi', label: 'Dashboard điều hành BI', icon: LayoutDashboard },
            { key: 'ads-report', label: 'Báo cáo Ads TikTok', icon: BarChart3 },
            { key: 'performance-p3', label: 'Đánh giá 4P & thưởng', icon: Coins },
            { key: 'overview', label: 'Tổng quan vận hành', icon: BarChart2 },
          ],
        },
        {
          title: 'Kế hoạch & Điều phối',
          items: [
            { key: 'manager', label: 'Phân bổ & điều phối', icon: Split },
            { key: 'input-plan', label: 'Kế hoạch tháng', icon: Calendar },
            { key: 'push-products', label: 'Sản phẩm đẩy', icon: TrendingUp },
          ],
        },
        {
          title: 'Vận hành tác nghiệp',
          items: [
            { key: 'booking', label: 'Booking KOC', icon: Users },
            { key: 'koc-master', label: 'Danh bạ KOC Master', icon: Users },
            { key: 'content', label: 'Kịch bản video', icon: FileText },
            { key: 'content-angles', label: 'Góc nội dung (Angles)', icon: Sparkles },
            { key: 'campaigns', label: 'Làm việc với Brand', icon: Layers },
            { key: 'contracts', label: 'Hợp đồng & thanh toán', icon: FileCheck },
            { key: 'sample-tracker', label: 'Hàng mẫu', icon: Package },
          ],
        },
        {
          title: 'Dữ liệu & Quản trị',
          items: [
            { key: 'master-data', label: 'Dữ liệu gốc (Master Data)', icon: Database },
            { key: 'partner-access', label: 'Phân quyền & RBAC tập trung', icon: KeyRound },
          ],
        },
        {
          title: 'Cổng đối tác ngoài (Giám sát)',
          items: [
            { key: 'brand-hub', label: 'Cổng đối tác Brand', icon: ExternalLink },
            { key: 'self-channel-hub', label: 'Hub Cộng tác viên (CTV)', icon: Video },
            { key: 'koc-hub', label: 'Hub đối tác KOC / KOL', icon: Users },
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
          title: 'Báo cáo & Giám sát',
          items: [
            { key: 'ads-report', label: 'Báo cáo Ads TikTok', icon: BarChart3 },
            { key: 'performance-p3', label: 'Đánh giá 4P & thưởng', icon: Coins },
            { key: 'overview', label: 'Tổng quan vận hành', icon: BarChart2 },
          ],
        },
        {
          title: 'Kế hoạch & Vận hành',
          items: [
            { key: 'input-plan', label: 'Kế hoạch tháng (Duyệt slot)', icon: Calendar },
            { key: 'push-products', label: 'Sản phẩm đẩy', icon: TrendingUp },
            { key: 'booking', label: 'Booking KOC (Duyệt deal)', icon: Users },
            { key: 'koc-master', label: 'Danh bạ KOC Master', icon: Users },
            { key: 'content', label: 'Kịch bản video (Duyệt sơ bộ)', icon: FileText },
            { key: 'content-angles', label: 'Góc nội dung (Angles)', icon: Sparkles },
            { key: 'campaigns', label: 'Làm việc với Brand', icon: Layers },
            { key: 'contracts', label: 'Hợp đồng & thanh toán', icon: FileCheck },
            { key: 'sample-tracker', label: 'Hàng mẫu', icon: Package },
          ],
        },
        {
          title: 'Dữ liệu tham chiếu',
          items: [
            { key: 'master-data', label: 'Dữ liệu gốc (Tra cứu)', icon: Database },
            { key: 'brand-knowledge', label: 'Hướng dẫn nhãn hàng', icon: BookOpen },
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
          title: 'Tác nghiệp Booking',
          items: [
            { key: 'booking', label: 'Booking KOC (Tạo & chăm sóc deal)', icon: Users },
            { key: 'koc-master', label: 'Danh bạ KOC Master', icon: Users },
            { key: 'input-plan', label: 'Kế hoạch tháng (Slot cá nhân)', icon: Calendar },
            { key: 'contracts', label: 'Hợp đồng & thanh toán', icon: FileCheck },
            { key: 'sample-tracker', label: 'Theo dõi hàng mẫu', icon: Package },
            { key: 'push-products', label: 'Sản phẩm đẩy', icon: TrendingUp },
          ],
        },
        {
          title: 'Hiệu suất & Tham chiếu',
          items: [
            { key: 'performance-p3', label: 'Đánh giá 4P & thưởng cá nhân', icon: Coins },
            { key: 'brand-knowledge', label: 'Hướng dẫn nhãn hàng & Hero SKU', icon: BookOpen },
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
          title: 'Sáng tạo & Kịch bản',
          items: [
            { key: 'content', label: 'Quản lý kịch bản video', icon: FileText },
            { key: 'content-angles', label: 'Góc nội dung & Hook 3s theo SP', icon: Sparkles },
            { key: 'campaigns', label: 'Làm việc với Brand & Brief', icon: Layers },
            { key: 'brand-knowledge', label: 'Hướng dẫn nhãn & Từ khóa cấm', icon: BookOpen },
          ],
        },
        {
          title: 'Vận hành liên quan',
          items: [
            { key: 'sample-tracker', label: 'Theo dõi hàng mẫu', icon: Package },
            { key: 'push-products', label: 'Sản phẩm đẩy & USP', icon: TrendingUp },
            { key: 'performance-p3', label: 'Đánh giá 4P & thưởng cá nhân', icon: Coins },
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
          title: 'Chiến dịch & Nhãn hàng',
          items: [
            { key: 'campaigns', label: 'Làm việc với Brand & Brief', icon: Layers },
            { key: 'push-products', label: 'Sản phẩm đẩy của nhãn', icon: TrendingUp },
            { key: 'brand-knowledge', label: 'Hướng dẫn nhãn hàng & Hero SKU', icon: BookOpen },
            { key: 'content', label: 'Kịch bản video theo guideline', icon: FileText },
          ],
        },
        {
          title: 'Kế hoạch & Báo cáo',
          items: [
            { key: 'input-plan', label: 'Kế hoạch tháng nhãn hàng', icon: Calendar },
            { key: 'ads-report', label: 'Báo cáo Ads TikTok', icon: BarChart3 },
            { key: 'overview', label: 'Tổng quan vận hành', icon: BarChart2 },
            { key: 'sample-tracker', label: 'Theo dõi hàng mẫu', icon: Package },
            { key: 'performance-p3', label: 'Đánh giá 4P & thưởng cá nhân', icon: Coins },
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
          title: 'Vận hành tác nghiệp',
          items: [
            { key: 'booking', label: 'Booking KOC', icon: Users },
            { key: 'koc-master', label: 'Danh bạ KOC Master', icon: Users },
            { key: 'content', label: 'Kịch bản video', icon: FileText },
            { key: 'input-plan', label: 'Kế hoạch tháng', icon: Calendar },
            { key: 'sample-tracker', label: 'Hàng mẫu', icon: Package },
            { key: 'push-products', label: 'Sản phẩm đẩy', icon: TrendingUp },
          ],
        },
        {
          title: 'Hiệu suất & Tham chiếu',
          items: [
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
            { key: 'brand-hub', label: 'Cổng đối tác Brand (Duyệt KOC & Video)', icon: ExternalLink },
            { key: 'push-products', label: 'Sản phẩm đẩy của nhãn', icon: TrendingUp },
            { key: 'content', label: 'Kịch bản video của nhãn', icon: FileText },
          ],
        },
      ];

    case 'KOC_PARTNER':
      return [
        {
          title: 'Không Gian KOC / KOL',
          items: [
            { key: 'koc-hub', label: 'Hub đối tác KOC / KOL (Việc của tôi)', icon: Users },
          ],
        },
      ];

    case 'CTV_PARTNER':
      return [
        {
          title: 'Không Gian Cộng Tác Viên',
          items: [
            { key: 'self-channel-hub', label: 'Hub Cộng tác viên (CTV Video)', icon: Video },
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
        className={`w-60 bg-surface border-r border-line flex flex-col shrink-0 h-screen select-none transition-transform duration-200 ease-in-out fixed inset-y-0 left-0 z-30 overscroll-contain ${
          isMobileOpen
            ? 'translate-x-0 shadow-2xl z-50'
            : '-translate-x-full lg:translate-x-0'
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

        <nav className="flex-1 overflow-y-auto px-3 pt-2 pb-4 space-y-5 sidebar-scrollbar overscroll-contain">
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
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[9.5px] font-bold tracking-wider uppercase shrink-0 ${
                    currentUser.role === 'ADMIN' ? 'bg-red-100 text-red-700' :
                    currentUser.role === 'MANAGER' ? 'bg-purple-100 text-purple-700' :
                    currentUser.role === 'LEADER' ? 'bg-blue-100 text-blue-700' :
                    currentUser.role === 'BOOKING_MEMBER' ? 'bg-cyan-100 text-cyan-800' :
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
