'use client';

import React, { useRef } from 'react';
import {
  CheckSquare,
  BarChart3,
  LayoutDashboard,
  Layers,
  FileText,
  Users,
  FileCheck,
  TrendingUp,
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
  Compass,
  KeyRound,
  Film,
  Store,
  type LucideIcon,
} from 'lucide-react';
import { UserProfile, TabKey } from '../lib/types';
import { Avatar, BrandLogo, Presence, SlidingIndicator, useActiveBox } from './ui';
export type { TabKey };

interface NavItem {
  key: TabKey;
  label: string;
  icon: LucideIcon;
}

interface NavSection {
  title?: string;
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

// Danh mục điều hướng theo vai trò — gọn trên một màn hình, không cần cuộn chuột
function getNavSectionsForUserRole(role: UserProfile['role']): NavSection[] {
  switch (role) {
    case 'ADMIN':
    case 'MANAGER':
      return [
        {
          items: [
            { key: 'cockpit', label: 'Việc của tôi', icon: CheckSquare },
          ],
        },
        {
          title: 'Kế hoạch & Phân bổ',
          items: [
            { key: 'input-plan', label: 'Kế hoạch tháng', icon: Calendar },
            { key: 'brand-knowledge', label: 'Hồ sơ thương hiệu', icon: BookOpen },
            { key: 'stores', label: 'Hồ sơ gian hàng', icon: Store },
            { key: 'manager', label: 'Điều phối & Quản lý', icon: Split },
          ],
        },
        {
          title: 'Vận hành Booking & KOC',
          items: [
            { key: 'booking', label: 'Quản lý Booking', icon: Users },
            { key: 'content', label: 'Kịch bản & Video', icon: FileText },
            { key: 'koc-master', label: 'Danh bạ KOC', icon: Users },
            { key: 'ctv-master', label: 'Danh bạ CTV / VJ', icon: Video },
          ],
        },
        {
          title: 'Hợp đồng & Hàng mẫu',
          items: [
            { key: 'contracts', label: 'Hợp đồng', icon: FileCheck },
            { key: 'sample-tracker', label: 'Hàng mẫu & Spark Ads', icon: Package },
          ],
        },
        {
          title: 'Báo cáo & Dữ liệu',
          items: [
            { key: 'dashboard-bi', label: 'Báo cáo hiệu suất', icon: LayoutDashboard },
            { key: 'master-data', label: 'Dữ liệu gốc', icon: Database },
            { key: 'partner-access', label: 'Phân quyền & Tài khoản', icon: KeyRound },
          ],
        },
      ];

    case 'GROWTH_MANAGER':
      return [
        {
          items: [
            { key: 'cockpit', label: 'Việc của tôi', icon: CheckSquare },
          ],
        },
        {
          title: 'Quản trị Khối Growth',
          items: [
            { key: 'manager', label: 'Quản lý Nhân sự Growth', icon: Split },
            { key: 'input-plan', label: 'Kế hoạch tháng (Plan 4.1)', icon: Calendar },
            { key: 'stores', label: 'Hồ sơ gian hàng', icon: Store },
            { key: 'brand-knowledge', label: 'Hồ sơ thương hiệu', icon: BookOpen },
          ],
        },
        {
          title: 'Chiến dịch & Hiệu suất',
          items: [
            { key: 'campaigns', label: 'Chiến dịch Brand', icon: Layers },
            { key: 'dashboard-bi', label: 'Báo cáo hiệu suất GMV', icon: LayoutDashboard },
            { key: 'ads-report', label: 'Báo cáo Ads TikTok', icon: BarChart3 },
            { key: 'performance-p3', label: 'Đánh giá 4P & thưởng', icon: Coins },
          ],
        },
        {
          title: 'Hệ thống & Phân quyền',
          items: [
            { key: 'master-data', label: 'Dữ liệu gốc', icon: Database },
            { key: 'partner-access', label: 'Phân quyền & Nhân sự', icon: KeyRound },
          ],
        },
      ];

    case 'MEDIA_MANAGER':
      return [
        {
          items: [
            { key: 'cockpit', label: 'Việc của tôi', icon: CheckSquare },
          ],
        },
        {
          title: 'Quản trị Khối Media',
          items: [
            { key: 'manager', label: 'Quản lý Nhân sự Media', icon: Split },
            { key: 'input-plan', label: 'Kế hoạch tháng & Ngân sách', icon: Calendar },
            { key: 'ads-report', label: 'Báo cáo Ads TikTok', icon: BarChart3 },
            { key: 'sample-tracker', label: 'Mã Spark Ads & Hàng mẫu', icon: Package },
          ],
        },
        {
          title: 'Gian hàng & Hiệu suất',
          items: [
            { key: 'stores', label: 'Hồ sơ gian hàng', icon: Store },
            { key: 'campaigns', label: 'Chiến dịch Brand', icon: Layers },
            { key: 'dashboard-bi', label: 'Báo cáo hiệu suất', icon: LayoutDashboard },
            { key: 'performance-p3', label: 'Đánh giá 4P & thưởng', icon: Coins },
          ],
        },
        {
          title: 'Hệ thống & Phân quyền',
          items: [
            { key: 'master-data', label: 'Dữ liệu gốc', icon: Database },
            { key: 'partner-access', label: 'Phân quyền & Nhân sự', icon: KeyRound },
          ],
        },
      ];

    case 'LEADER':
      return [
        {
          items: [
            { key: 'cockpit', label: 'Việc của tôi', icon: CheckSquare },
          ],
        },
        {
          title: 'Kế hoạch & Phân bổ',
          items: [
            { key: 'input-plan', label: 'Kế hoạch tháng', icon: Calendar },
            { key: 'brand-knowledge', label: 'Hồ sơ thương hiệu', icon: BookOpen },
            { key: 'stores', label: 'Hồ sơ gian hàng', icon: Store },
            { key: 'manager', label: 'Điều phối & Quản lý', icon: Split },
          ],
        },
        {
          title: 'Vận hành Booking & KOC',
          items: [
            { key: 'booking', label: 'Quản lý Booking', icon: Users },
            { key: 'content', label: 'Kịch bản & Video', icon: FileText },
            { key: 'koc-master', label: 'Danh bạ KOC', icon: Users },
            { key: 'ctv-master', label: 'Danh bạ CTV / VJ', icon: Video },
          ],
        },
        {
          title: 'Hợp đồng & Hàng mẫu',
          items: [
            { key: 'contracts', label: 'Hợp đồng', icon: FileCheck },
            { key: 'sample-tracker', label: 'Hàng mẫu & Spark Ads', icon: Package },
          ],
        },
        {
          title: 'Báo cáo & Dữ liệu',
          items: [
            { key: 'dashboard-bi', label: 'Báo cáo hiệu suất', icon: LayoutDashboard },
            { key: 'master-data', label: 'Dữ liệu gốc', icon: Database },
          ],
        },
      ];

    case 'BOOKING_MEMBER':
      return [
        {
          items: [
            { key: 'cockpit', label: 'Việc của tôi', icon: CheckSquare },
          ],
        },
        {
          title: 'Kế hoạch & Đợt chạy',
          items: [
            { key: 'input-plan', label: 'Kế hoạch tháng', icon: Calendar },
            { key: 'brand-knowledge', label: 'Hồ sơ thương hiệu', icon: BookOpen },
            { key: 'stores', label: 'Hồ sơ gian hàng', icon: Store },
            { key: 'koc-listing', label: 'Listing & Air Video', icon: Film },
          ],
        },
        {
          title: 'Vận hành Booking & KOC',
          items: [
            { key: 'booking', label: 'Quản lý Booking', icon: Users },
            { key: 'koc-master', label: 'Danh bạ KOC', icon: Users },
            { key: 'ctv-master', label: 'Danh bạ CTV / VJ', icon: Video },
          ],
        },
        {
          title: 'Hợp đồng & Hàng mẫu',
          items: [
            { key: 'contracts', label: 'Hợp đồng', icon: FileCheck },
            { key: 'sample-tracker', label: 'Hàng mẫu & Spark Ads', icon: Package },
          ],
        },
      ];

    case 'CONTENT_MEMBER':
      return [
        {
          items: [
            { key: 'cockpit', label: 'Việc của tôi', icon: CheckSquare },
          ],
        },
        {
          title: 'Sáng tạo & Kịch bản',
          items: [
            { key: 'content', label: 'Kịch bản & Video', icon: FileText },
            { key: 'content-angles', label: 'Góc nội dung', icon: Compass },
            { key: 'ctv-master', label: 'Danh bạ CTV / VJ', icon: Video },
            { key: 'self-channel-hub', label: 'Video kênh Brand', icon: Film },
          ],
        },
        {
          title: 'Làm việc với Brand',
          items: [
            { key: 'campaigns', label: 'Chiến dịch Brand', icon: Layers },
            { key: 'brand-knowledge', label: 'Hồ sơ thương hiệu', icon: BookOpen },
            { key: 'push-products', label: 'Sản phẩm đẩy', icon: TrendingUp },
          ],
        },
        {
          title: 'Vận hành & Đánh giá',
          items: [
            { key: 'sample-tracker', label: 'Hàng mẫu & Spark Ads', icon: Package },
            { key: 'performance-p3', label: 'Đánh giá 4P & thưởng', icon: Coins },
          ],
        },
      ];

    case 'BRAND_MEMBER':
      return [
        {
          items: [
            { key: 'cockpit', label: 'Việc của tôi', icon: CheckSquare },
          ],
        },
        {
          title: 'Kế hoạch & Brand',
          items: [
            { key: 'input-plan', label: 'Kế hoạch tháng', icon: Calendar },
            { key: 'campaigns', label: 'Chiến dịch Brand', icon: Layers },
            { key: 'brand-knowledge', label: 'Hồ sơ thương hiệu', icon: BookOpen },
          ],
        },
        {
          title: 'Vận hành & Sản phẩm',
          items: [
            { key: 'content', label: 'Kịch bản & Video', icon: FileText },
            { key: 'sample-tracker', label: 'Hàng mẫu & Spark Ads', icon: Package },
            { key: 'push-products', label: 'Sản phẩm đẩy', icon: TrendingUp },
          ],
        },
        {
          title: 'Báo cáo hiệu suất',
          items: [
            { key: 'ads-report', label: 'Báo cáo Ads TikTok', icon: BarChart3 },
            { key: 'performance-p3', label: 'Đánh giá 4P & thưởng', icon: Coins },
          ],
        },
      ];

    case 'GROWTH_MEMBER':
      return [
        {
          items: [
            { key: 'cockpit', label: 'Việc của tôi', icon: CheckSquare },
          ],
        },
        {
          title: 'Kế hoạch & Doanh số',
          items: [
            { key: 'input-plan', label: 'Kế hoạch tháng', icon: Calendar },
            { key: 'brand-knowledge', label: 'Hồ sơ thương hiệu', icon: BookOpen },
            { key: 'dashboard-bi', label: 'Báo cáo hiệu suất', icon: BarChart3 },
            { key: 'stores', label: 'Hồ sơ gian hàng', icon: Store },
          ],
        },
        {
          title: 'Chiến dịch & Báo cáo',
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
          items: [
            { key: 'cockpit', label: 'Việc của tôi', icon: CheckSquare },
          ],
        },
        {
          title: 'Kế hoạch & Ads',
          items: [
            { key: 'input-plan', label: 'Kế hoạch tháng', icon: Calendar },
            { key: 'ads-report', label: 'Báo cáo Ads TikTok', icon: BarChart3 },
          ],
        },
        {
          title: 'Báo cáo & Hiệu suất',
          items: [
            { key: 'dashboard-bi', label: 'Báo cáo hiệu suất', icon: BarChart3 },
            { key: 'campaigns', label: 'Chiến dịch Brand', icon: Layers },
            { key: 'performance-p3', label: 'Đánh giá 4P & thưởng', icon: Coins },
          ],
        },
      ];

    case 'MEMBER':
      return [
        {
          items: [
            { key: 'cockpit', label: 'Việc của tôi', icon: CheckSquare },
          ],
        },
        {
          title: 'Kế hoạch',
          items: [
            { key: 'input-plan', label: 'Kế hoạch tháng', icon: Calendar },
          ],
        },
        {
          title: 'Vận hành Booking & KOC',
          items: [
            { key: 'booking', label: 'Quản lý Booking', icon: Users },
            { key: 'content', label: 'Kịch bản & Video', icon: FileText },
            { key: 'koc-master', label: 'Danh bạ KOC', icon: Users },
            { key: 'ctv-master', label: 'Danh bạ CTV / VJ', icon: Video },
          ],
        },
        {
          title: 'Hàng mẫu & Đánh giá',
          items: [
            { key: 'sample-tracker', label: 'Hàng mẫu & Spark Ads', icon: Package },
            { key: 'performance-p3', label: 'Đánh giá 4P & thưởng', icon: Coins },
            { key: 'brand-knowledge', label: 'Hồ sơ thương hiệu', icon: BookOpen },
          ],
        },
      ];

    case 'BRAND_PARTNER':
      return [
        {
          title: 'Cổng thương hiệu',
          items: [
            { key: 'brand-hub', label: 'Cổng đối tác Brand', icon: ExternalLink },
            { key: 'koc-listing', label: 'Listing & Air Video', icon: Film },
            { key: 'push-products', label: 'Sản phẩm đẩy', icon: TrendingUp },
            { key: 'content', label: 'Kịch bản & Video', icon: FileText },
          ],
        },
      ];

    case 'KOC_PARTNER':
      return [
        {
          title: 'Không gian KOC / KOL',
          items: [
            { key: 'koc-hub', label: 'Cổng đối tác KOC / KOL', icon: Users },
          ],
        },
      ];

    case 'CTV_PARTNER':
      return [
        {
          title: 'Không gian CTV video',
          items: [
            { key: 'self-channel-hub', label: 'Cộng tác viên video', icon: Video },
          ],
        },
      ];

    default:
      return [
        {
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
  const navSections = getNavSectionsForUserRole(currentUser.role);
  // Nền + vạch của mục đang mở là một phần tử, trượt sang mục mới khi chuyển màn.
  const navRef = useRef<HTMLElement>(null);
  const { box, ready } = useActiveBox(navRef, activeTab);

  const handleItemClick = (key: TabKey) => {
    onTabSelect(key);
    onCloseMobile?.();
  };

  return (
    <>
      <Presence show={isMobileOpen}>
        {isMobileOpen && (
          <div
            className="fixed inset-0 bg-ink/40 z-40 lg:hidden animate-in fade-in duration-(--motion-base)"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
        )}
      </Presence>

      <aside
        className={`app-sidebar w-60 bg-surface border-r border-line flex flex-col justify-between shrink-0 h-dvh select-none transition-transform duration-(--motion-base) ease-move fixed inset-y-0 left-0 z-30 ${
          isMobileOpen
            ? 'translate-x-0 shadow-2xl z-50'
            : '-translate-x-full lg:translate-x-0'
        }`}
        aria-label="Điều hướng chính"
      >
        <div className="flex flex-col min-h-0">
          <div className="h-14 px-4 flex items-center justify-between border-b border-line shrink-0">
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

          <nav ref={navRef} className="relative px-2.5 py-2.5 space-y-2.5">
            <SlidingIndicator box={box} ready={ready} className="sidebar-indicator rounded-md bg-accent-soft" />
            {navSections.map((section, idx) => (
              <div key={section.title || `sec-${idx}`}>
                {section.title && (
                  <div className="px-2.5 pb-1 text-2xs font-medium text-ink-3">
                    {section.title}
                  </div>
                )}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => handleItemClick(item.key)}
                        aria-current={isActive ? 'page' : undefined}
                        data-active={isActive}
                        className={`sidebar-item w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left text-[13px] leading-5 transition-colors ${
                          isActive
                            ? 'text-accent font-semibold'
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
        </div>

        <div className="shrink-0 px-3 py-2.5 border-t border-line">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar name={currentUser.name} src={currentUser.larkAvatarUrl} size={28} />
              <div className="min-w-0 leading-tight">
                <span className="block text-[13px] font-medium text-ink truncate">{currentUser.name}</span>
                <span className="block text-2xs text-ink-3 truncate mt-0.5">{currentUser.roleTitle}</span>
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

