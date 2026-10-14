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
  PanelLeftClose,
  Building2,
  Activity,
  FileSpreadsheet,
  ChevronDown,
  ChevronRight,
  Sliders,
  HelpCircle,
  ClipboardList,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { UserProfile, TabKey } from '../lib/types';
import { getAllowedTabsForRole, ALL_SYSTEM_SCREENS } from '../lib/rbacData';
import { Avatar, BrandLogo, Presence, SlidingIndicator, useActiveBox } from './ui';
export type { TabKey };

interface NavItem {
  key: TabKey;
  label: string;
  icon: LucideIcon;
  badge?: string;
  children?: NavItem[];
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
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onLogout?: () => void;
}

const B2C_DASHBOARD_SUB_ITEMS: NavItem[] = [
  { key: 'dashboard-brand', label: 'Ngân sách & PnL', icon: Building2 },
  { key: 'dashboard-store', label: 'Gian hàng & Sàn', icon: Store },
  { key: 'dashboard-team-sla', label: 'Lịch đăng video', icon: Calendar },
  { key: 'dashboard-video', label: 'Hiệu quả video', icon: Film },
  { key: 'dashboard-staff', label: 'Hiệu suất nhân sự', icon: Users },
  { key: 'dashboard-finance', label: 'Đối soát & xuất file', icon: FileSpreadsheet },
];

export const DASHBOARD_TAB_KEYS: TabKey[] = [
  'dashboard-bi',
  'dashboard-brand',
  'dashboard-air-sync',
  'dashboard-store',
  'dashboard-video',
  'dashboard-team-sla',
  'dashboard-staff',
  'dashboard-finance',
];

// Danh mục điều hướng theo vai trò — cấu trúc theo luồng công việc rõ ràng, nhãn súc tích
function getNavSectionsForUserRole(role: UserProfile['role']): NavSection[] {
  switch (role) {
    case 'ADMIN':
    case 'MANAGER':
      return [
        {
          items: [
            { key: 'cockpit', label: 'Việc của tôi', icon: CheckSquare },
            {
              key: 'dashboard-brand',
              label: 'Báo cáo & Dashboard',
              icon: LayoutDashboard,
              children: B2C_DASHBOARD_SUB_ITEMS,
            },
          ],
        },
        {
          title: 'Kế hoạch & Phân bổ',
          items: [
            { key: 'input-plan', label: 'Kế hoạch tháng', icon: Calendar },
            { key: 'task-delegation', label: 'Giao việc & định mức', icon: ClipboardList },
            { key: 'campaigns', label: 'Chiến dịch Brand', icon: Layers },
            { key: 'brand-knowledge', label: 'Hồ sơ thương hiệu', icon: BookOpen },
            { key: 'stores', label: 'Hồ sơ gian hàng', icon: Store },
            { key: 'manager', label: 'Điều phối nhân sự', icon: Split },
          ],
        },
        {
          title: 'Booking & Nội dung',
          items: [
            { key: 'booking', label: 'Quản lý Booking', icon: Users },
            { key: 'content', label: 'Kịch bản & Video', icon: FileText },
            { key: 'content-angles', label: 'Góc nội dung', icon: Compass },
            { key: 'koc-listing', label: 'Listing & Air Video', icon: Film },
            { key: 'koc-master', label: 'Danh bạ KOC', icon: Users },
            { key: 'ctv-master', label: 'Danh bạ CTV / VJ', icon: Video },
            { key: 'self-channel-hub', label: 'Video kênh Brand', icon: Film },
          ],
        },
        {
          title: 'Hợp đồng & Hàng mẫu',
          items: [
            { key: 'contracts', label: 'Hợp đồng', icon: FileCheck },
            { key: 'sample-tracker', label: 'Hàng mẫu & Ads', icon: Package },
            { key: 'push-products', label: 'Sản phẩm trọng tâm', icon: TrendingUp },
          ],
        },
        {
          title: 'Hiệu suất & Ads',
          items: [
            { key: 'ads-report', label: 'Báo cáo Ads TikTok', icon: BarChart3 },
            { key: 'performance-p3', label: 'Đánh giá 4P & thưởng', icon: Coins },
            { key: 'leaderboard', label: 'Bảng xếp hạng', icon: Activity },
          ],
        },
        {
          title: 'Hệ thống & Kiểm toán',
          items: [
            { key: 'master-data', label: 'Dữ liệu gốc', icon: Database },
            { key: 'partner-access', label: 'Phân quyền & Nhân sự', icon: KeyRound },
            { key: 'audit-trail', label: 'Nhật ký kiểm toán', icon: ShieldCheck },
            { key: 'knowledge-qa', label: 'Sổ tay & Hỏi đáp', icon: HelpCircle },
            { key: 'api-settings', label: 'Cấu hình API', icon: Sliders },
          ],
        },
      ];

    case 'GROWTH_MANAGER':
      return [
        {
          items: [
            { key: 'cockpit', label: 'Việc của tôi', icon: CheckSquare },
            {
              key: 'dashboard-brand',
              label: 'Báo cáo & Dashboard',
              icon: LayoutDashboard,
              children: B2C_DASHBOARD_SUB_ITEMS,
            },
          ],
        },
        {
          title: 'Quản trị Khối Growth',
          items: [
            { key: 'manager', label: 'Quản lý Nhân sự Growth', icon: Split },
            { key: 'task-delegation', label: 'Giao việc & định mức', icon: ClipboardList },
            { key: 'input-plan', label: 'Kế hoạch tháng', icon: Calendar },
            { key: 'stores', label: 'Hồ sơ gian hàng', icon: Store },
            { key: 'brand-knowledge', label: 'Hồ sơ thương hiệu', icon: BookOpen },
          ],
        },
        {
          title: 'Chiến dịch & Hiệu suất',
          items: [
            { key: 'campaigns', label: 'Chiến dịch Brand', icon: Layers },
            { key: 'ads-report', label: 'Báo cáo Ads TikTok', icon: BarChart3 },
            { key: 'performance-p3', label: 'Đánh giá 4P & thưởng', icon: Coins },
            { key: 'leaderboard', label: 'Bảng xếp hạng', icon: Activity },
          ],
        },
        {
          title: 'Hệ thống & Kiểm toán',
          items: [
            { key: 'master-data', label: 'Dữ liệu gốc', icon: Database },
            { key: 'partner-access', label: 'Phân quyền & Nhân sự', icon: KeyRound },
            { key: 'audit-trail', label: 'Nhật ký kiểm toán', icon: ShieldCheck },
            { key: 'knowledge-qa', label: 'Sổ tay & Hỏi đáp', icon: HelpCircle },
            { key: 'api-settings', label: 'Cấu hình API', icon: Sliders },
          ],
        },
      ];

    case 'MEDIA_MANAGER':
      return [
        {
          items: [
            { key: 'cockpit', label: 'Việc của tôi', icon: CheckSquare },
            {
              key: 'dashboard-brand',
              label: 'Báo cáo & Dashboard',
              icon: LayoutDashboard,
              children: B2C_DASHBOARD_SUB_ITEMS,
            },
          ],
        },
        {
          title: 'Quản trị Khối Media',
          items: [
            { key: 'manager', label: 'Quản lý Nhân sự Media', icon: Split },
            { key: 'task-delegation', label: 'Giao việc & định mức', icon: ClipboardList },
            { key: 'input-plan', label: 'Kế hoạch tháng', icon: Calendar },
            { key: 'ads-report', label: 'Báo cáo Ads TikTok', icon: BarChart3 },
            { key: 'sample-tracker', label: 'Hàng mẫu & Ads', icon: Package },
          ],
        },
        {
          title: 'Gian hàng & Hiệu suất',
          items: [
            { key: 'stores', label: 'Hồ sơ gian hàng', icon: Store },
            { key: 'campaigns', label: 'Chiến dịch Brand', icon: Layers },
            { key: 'performance-p3', label: 'Đánh giá 4P & thưởng', icon: Coins },
            { key: 'leaderboard', label: 'Bảng xếp hạng', icon: Activity },
          ],
        },
        {
          title: 'Hệ thống & Kiểm toán',
          items: [
            { key: 'master-data', label: 'Dữ liệu gốc', icon: Database },
            { key: 'partner-access', label: 'Phân quyền & Nhân sự', icon: KeyRound },
            { key: 'audit-trail', label: 'Nhật ký kiểm toán', icon: ShieldCheck },
            { key: 'knowledge-qa', label: 'Sổ tay & Hỏi đáp', icon: HelpCircle },
            { key: 'api-settings', label: 'Cấu hình API', icon: Sliders },
          ],
        },
      ];

    case 'LEADER':
      return [
        {
          items: [
            { key: 'cockpit', label: 'Việc của tôi', icon: CheckSquare },
            {
              key: 'dashboard-brand',
              label: 'Báo cáo & Dashboard',
              icon: LayoutDashboard,
              children: B2C_DASHBOARD_SUB_ITEMS,
            },
          ],
        },
        {
          title: 'Kế hoạch & Phân bổ',
          items: [
            { key: 'input-plan', label: 'Kế hoạch tháng', icon: Calendar },
            { key: 'task-delegation', label: 'Giao việc & định mức', icon: ClipboardList },
            { key: 'brand-knowledge', label: 'Hồ sơ thương hiệu', icon: BookOpen },
            { key: 'stores', label: 'Hồ sơ gian hàng', icon: Store },
            { key: 'manager', label: 'Điều phối & Quản lý', icon: Split },
          ],
        },
        {
          title: 'Booking & KOC',
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
            { key: 'sample-tracker', label: 'Hàng mẫu & Ads', icon: Package },
          ],
        },
        {
          title: 'Hệ thống & Dữ liệu gốc',
          items: [
            { key: 'master-data', label: 'Dữ liệu gốc', icon: Database },
            { key: 'knowledge-qa', label: 'Sổ tay & Hỏi đáp', icon: HelpCircle },
            { key: 'api-settings', label: 'Cấu hình API', icon: Sliders },
          ],
        },
      ];

    case 'BOOKING_MEMBER':
      return [
        {
          items: [
            { key: 'cockpit', label: 'Việc của tôi', icon: CheckSquare },
            {
              key: 'dashboard-store',
              label: 'Báo cáo & Dashboard',
              icon: LayoutDashboard,
              children: [
                { key: 'dashboard-store', label: 'Gian hàng & Sàn', icon: Store },
                { key: 'dashboard-team-sla', label: 'Lịch đăng video', icon: Calendar },
                { key: 'dashboard-video', label: 'Hiệu quả video', icon: Film },
                { key: 'dashboard-staff', label: 'Hiệu suất nhân sự', icon: Users },
              ],
            },
          ],
        },
        {
          title: 'Kế hoạch & Đợt chạy',
          items: [
            { key: 'input-plan', label: 'Kế hoạch tháng', icon: Calendar },
            { key: 'task-delegation', label: 'Giao việc & định mức', icon: ClipboardList },
            { key: 'brand-knowledge', label: 'Hồ sơ thương hiệu', icon: BookOpen },
            { key: 'stores', label: 'Hồ sơ gian hàng', icon: Store },
            { key: 'koc-listing', label: 'Listing & Air Video', icon: Film },
          ],
        },
        {
          title: 'Booking & KOC',
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
            { key: 'sample-tracker', label: 'Hàng mẫu & Ads', icon: Package },
            { key: 'knowledge-qa', label: 'Sổ tay & Hỏi đáp', icon: HelpCircle },
            { key: 'api-settings', label: 'Cấu hình API', icon: Sliders },
          ],
        },
      ];

    case 'CONTENT_MEMBER':
      return [
        {
          items: [
            { key: 'cockpit', label: 'Việc của tôi', icon: CheckSquare },
            {
              key: 'dashboard-video',
              label: 'Báo cáo & Dashboard',
              icon: LayoutDashboard,
              children: [
                { key: 'dashboard-team-sla', label: 'Lịch đăng video', icon: Calendar },
                { key: 'dashboard-video', label: 'Hiệu quả video', icon: Film },
                { key: 'dashboard-staff', label: 'Hiệu suất nhân sự', icon: Users },
              ],
            },
          ],
        },
        {
          title: 'Sáng tạo & Kịch bản',
          items: [
            { key: 'task-delegation', label: 'Giao việc & định mức', icon: ClipboardList },
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
            { key: 'push-products', label: 'Sản phẩm trọng tâm', icon: TrendingUp },
          ],
        },
        {
          title: 'Vận hành & Công cụ',
          items: [
            { key: 'sample-tracker', label: 'Hàng mẫu & Ads', icon: Package },
            { key: 'performance-p3', label: 'Đánh giá 4P & thưởng', icon: Coins },
            { key: 'knowledge-qa', label: 'Sổ tay & Hỏi đáp', icon: HelpCircle },
            { key: 'api-settings', label: 'Cấu hình API', icon: Sliders },
          ],
        },
      ];

    case 'BRAND_MEMBER':
      return [
        {
          items: [
            { key: 'cockpit', label: 'Việc của tôi', icon: CheckSquare },
            {
              key: 'dashboard-brand',
              label: 'Báo cáo & Dashboard',
              icon: LayoutDashboard,
              children: [
                { key: 'dashboard-brand', label: 'Ngân sách & PnL', icon: Building2 },
                { key: 'dashboard-store', label: 'Gian hàng & Sàn', icon: Store },
                { key: 'dashboard-team-sla', label: 'Lịch đăng video', icon: Calendar },
                { key: 'dashboard-video', label: 'Hiệu quả video', icon: Film },
              ],
            },
          ],
        },
        {
          title: 'Kế hoạch & Brand',
          items: [
            { key: 'input-plan', label: 'Kế hoạch tháng', icon: Calendar },
            { key: 'task-delegation', label: 'Giao việc & định mức', icon: ClipboardList },
            { key: 'campaigns', label: 'Chiến dịch Brand', icon: Layers },
            { key: 'brand-knowledge', label: 'Hồ sơ thương hiệu', icon: BookOpen },
          ],
        },
        {
          title: 'Vận hành & Sản phẩm',
          items: [
            { key: 'content', label: 'Kịch bản & Video', icon: FileText },
            { key: 'sample-tracker', label: 'Hàng mẫu & Ads', icon: Package },
            { key: 'push-products', label: 'Sản phẩm trọng tâm', icon: TrendingUp },
          ],
        },
        {
          title: 'Báo cáo & Công cụ',
          items: [
            { key: 'ads-report', label: 'Báo cáo Ads TikTok', icon: BarChart3 },
            { key: 'performance-p3', label: 'Đánh giá 4P & thưởng', icon: Coins },
            { key: 'knowledge-qa', label: 'Sổ tay & Hỏi đáp', icon: HelpCircle },
            { key: 'api-settings', label: 'Cấu hình API', icon: Sliders },
          ],
        },
      ];

    case 'GROWTH_MEMBER':
      return [
        {
          items: [
            { key: 'cockpit', label: 'Việc của tôi', icon: CheckSquare },
            {
              key: 'dashboard-brand',
              label: 'Báo cáo & Dashboard',
              icon: LayoutDashboard,
              children: [
                { key: 'dashboard-brand', label: 'Ngân sách & PnL', icon: Building2 },
                { key: 'dashboard-store', label: 'Gian hàng & Sàn', icon: Store },
                { key: 'dashboard-team-sla', label: 'Lịch đăng video', icon: Calendar },
                { key: 'dashboard-video', label: 'Hiệu quả video', icon: Film },
                { key: 'dashboard-staff', label: 'Hiệu suất nhân sự', icon: Users },
              ],
            },
          ],
        },
        {
          title: 'Kế hoạch & Doanh số',
          items: [
            { key: 'input-plan', label: 'Kế hoạch tháng', icon: Calendar },
            { key: 'task-delegation', label: 'Giao việc & định mức', icon: ClipboardList },
            { key: 'brand-knowledge', label: 'Hồ sơ thương hiệu', icon: BookOpen },
            { key: 'stores', label: 'Hồ sơ gian hàng', icon: Store },
          ],
        },
        {
          title: 'Chiến dịch & Công cụ',
          items: [
            { key: 'campaigns', label: 'Chiến dịch Brand', icon: Layers },
            { key: 'ads-report', label: 'Báo cáo Ads TikTok', icon: BarChart3 },
            { key: 'performance-p3', label: 'Đánh giá 4P & thưởng', icon: Coins },
            { key: 'knowledge-qa', label: 'Sổ tay & Hỏi đáp', icon: HelpCircle },
            { key: 'api-settings', label: 'Cấu hình API', icon: Sliders },
          ],
        },
      ];

    case 'MEDIA_MEMBER':
      return [
        {
          items: [
            { key: 'cockpit', label: 'Việc của tôi', icon: CheckSquare },
            {
              key: 'dashboard-brand',
              label: 'Báo cáo & Dashboard',
              icon: LayoutDashboard,
              children: [
                { key: 'dashboard-brand', label: 'Ngân sách & PnL', icon: Building2 },
                { key: 'dashboard-store', label: 'Gian hàng & Sàn', icon: Store },
                { key: 'dashboard-team-sla', label: 'Lịch đăng video', icon: Calendar },
                { key: 'dashboard-video', label: 'Hiệu quả video', icon: Film },
                { key: 'dashboard-staff', label: 'Hiệu suất nhân sự', icon: Users },
              ],
            },
          ],
        },
        {
          title: 'Kế hoạch & Ads',
          items: [
            { key: 'input-plan', label: 'Kế hoạch tháng', icon: Calendar },
            { key: 'task-delegation', label: 'Giao việc & định mức', icon: ClipboardList },
            { key: 'ads-report', label: 'Báo cáo Ads TikTok', icon: BarChart3 },
          ],
        },
        {
          title: 'Chiến dịch & Công cụ',
          items: [
            { key: 'campaigns', label: 'Chiến dịch Brand', icon: Layers },
            { key: 'performance-p3', label: 'Đánh giá 4P & thưởng', icon: Coins },
            { key: 'knowledge-qa', label: 'Sổ tay & Hỏi đáp', icon: HelpCircle },
            { key: 'api-settings', label: 'Cấu hình API', icon: Sliders },
          ],
        },
      ];

    case 'MEMBER':
      return [
        {
          items: [
            { key: 'cockpit', label: 'Việc của tôi', icon: CheckSquare },
            {
              key: 'dashboard-store',
              label: 'Báo cáo & Dashboard',
              icon: LayoutDashboard,
              children: [
                { key: 'dashboard-store', label: 'Gian hàng & Sàn', icon: Store },
                { key: 'dashboard-team-sla', label: 'Lịch đăng video', icon: Calendar },
                { key: 'dashboard-video', label: 'Hiệu quả video', icon: Film },
                { key: 'dashboard-staff', label: 'Hiệu suất nhân sự', icon: Users },
              ],
            },
          ],
        },
        {
          title: 'Kế hoạch',
          items: [
            { key: 'input-plan', label: 'Kế hoạch tháng', icon: Calendar },
            { key: 'task-delegation', label: 'Giao việc & định mức', icon: ClipboardList },
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
          title: 'Hàng mẫu & Công cụ',
          items: [
            { key: 'sample-tracker', label: 'Hàng mẫu & Ads', icon: Package },
            { key: 'performance-p3', label: 'Đánh giá 4P & thưởng', icon: Coins },
            { key: 'brand-knowledge', label: 'Hồ sơ thương hiệu', icon: BookOpen },
            { key: 'knowledge-qa', label: 'Sổ tay & Hỏi đáp', icon: HelpCircle },
            { key: 'api-settings', label: 'Cấu hình API', icon: Sliders },
          ],
        },
      ];

    case 'LEGAL':
      return [
        {
          title: 'Pháp chế & Hợp đồng',
          items: [
            { key: 'contracts', label: 'Hợp đồng & Biểu mẫu', icon: FileCheck },
            { key: 'audit-trail', label: 'Nhật ký kiểm toán', icon: ShieldCheck },
          ],
        },
      ];

    case 'FINANCE':
      return [
        {
          title: 'Tài chính & Kế toán',
          items: [
            { key: 'contracts', label: 'Hợp đồng & Duyệt chi', icon: FileCheck },
            { key: 'dashboard-finance', label: 'Đối soát & xuất file', icon: FileSpreadsheet },
            { key: 'audit-trail', label: 'Nhật ký kiểm toán', icon: ShieldCheck },
          ],
        },
      ];

    case 'SIGN_ADMIN':
      return [
        {
          title: 'Hành chính & Ký số',
          items: [
            { key: 'contracts', label: 'Hợp đồng & Trình ký', icon: FileCheck },
            { key: 'audit-trail', label: 'Nhật ký kiểm toán', icon: ShieldCheck },
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
            { key: 'push-products', label: 'Sản phẩm trọng tâm', icon: TrendingUp },
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
  isCollapsed = false,
  onToggleCollapse,
  onLogout,
}) => {
  const [rbacTick, setRbacTick] = React.useState(0);
  React.useEffect(() => {
    const onRbacChange = () => setRbacTick(t => t + 1);
    window.addEventListener('upbase-rbac-updated', onRbacChange);
    return () => window.removeEventListener('upbase-rbac-updated', onRbacChange);
  }, []);

  const navSections = React.useMemo(() => {
    void rbacTick;
    const baseSections = getNavSectionsForUserRole(currentUser.role);
    const allowedSet = new Set(getAllowedTabsForRole(currentUser.role));

    const filtered: NavSection[] = [];
    for (const sec of baseSections) {
      const items: NavItem[] = [];
      for (const item of sec.items) {
        if (item.children && item.children.length > 0) {
          const allowedChildren = item.children.filter(c => allowedSet.has(c.key));
          if (allowedChildren.length > 0) {
            items.push({
              ...item,
              key: allowedChildren[0].key,
              children: allowedChildren,
            });
          }
        } else if (allowedSet.has(item.key)) {
          items.push(item);
        }
      }
      if (items.length > 0) {
        filtered.push({ ...sec, items });
      }
    }

    return filtered;
  }, [currentUser.role, rbacTick]);

  const isAnyDashboardActive = DASHBOARD_TAB_KEYS.includes(activeTab);
  const [isDashboardMenuOpen, setIsDashboardMenuOpen] = React.useState<boolean>(true);

  React.useEffect(() => {
    if (isAnyDashboardActive) {
      setIsDashboardMenuOpen(true);
    }
  }, [isAnyDashboardActive]);

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
            : isCollapsed
            ? '-translate-x-full'
            : '-translate-x-full lg:translate-x-0'
        }`}
        aria-label="Điều hướng chính"
      >
        <div className="flex flex-col min-h-0 overflow-y-auto">
          <div className="h-14 px-4 flex items-center justify-between border-b border-line shrink-0">
            <BrandLogo height={22} />

            <div className="flex items-center gap-1">
              {onToggleCollapse && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="hidden lg:inline-flex p-1.5 rounded-md text-ink-3 hover:text-ink hover:bg-sunken transition-colors cursor-pointer"
                  title="Ẩn thanh menu bên trái để mở rộng không gian làm việc"
                  aria-label="Ẩn thanh menu bên trái"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              )}

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
                    const hasChildren = Boolean(item.children && item.children.length > 0);

                    if (hasChildren && item.children) {
                      const isGroupActive =
                        isAnyDashboardActive ||
                        item.children.some((c) => c.key === activeTab);

                      return (
                        <div key={`group-${item.key}-${item.label}`} className="space-y-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (!isDashboardMenuOpen) {
                                setIsDashboardMenuOpen(true);
                                if (!isGroupActive) {
                                  handleItemClick(item.children![0].key);
                                }
                              } else if (!isGroupActive) {
                                handleItemClick(item.children![0].key);
                              } else {
                                setIsDashboardMenuOpen((prev) => !prev);
                              }
                            }}
                            className={`sidebar-item w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-left text-[13px] leading-5 transition-colors cursor-pointer ${
                              isGroupActive
                                ? 'bg-indigo-50/70 text-accent font-semibold border border-indigo-200/70'
                                : 'text-ink-2 hover:text-ink hover:bg-sunken'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Icon
                                className={`w-4 h-4 shrink-0 ${
                                  isGroupActive ? 'text-accent' : 'text-ink-3'
                                }`}
                                strokeWidth={1.75}
                              />
                              <span className="truncate">{item.label}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {item.badge && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                                  {item.badge}
                                </span>
                              )}
                              {isDashboardMenuOpen ? (
                                <ChevronDown className="w-3.5 h-3.5 text-ink-3" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-ink-3" />
                              )}
                            </div>
                          </button>

                          {isDashboardMenuOpen && (
                            <div className="ml-3.5 pl-2.5 border-l border-line space-y-0.5 py-0.5">
                              {item.children.map((child) => {
                                const ChildIcon = child.icon;
                                const isChildActive =
                                  activeTab === child.key ||
                                  (activeTab === 'dashboard-bi' && child.key === 'dashboard-brand');
                                return (
                                  <button
                                    key={child.key}
                                    type="button"
                                    onClick={() => handleItemClick(child.key)}
                                    aria-current={isChildActive ? 'page' : undefined}
                                    data-active={isChildActive}
                                    className={`sidebar-item w-full flex items-center justify-between gap-1.5 px-2 py-1.25 rounded-md text-left text-[12px] leading-4 transition-colors cursor-pointer ${
                                      isChildActive
                                        ? 'text-accent font-semibold bg-accent-soft/60'
                                        : 'text-ink-2 hover:text-ink hover:bg-sunken'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <ChildIcon
                                        className={`w-3.5 h-3.5 shrink-0 ${
                                          isChildActive ? 'text-accent' : 'text-ink-3'
                                        }`}
                                        strokeWidth={1.75}
                                      />
                                      <span className="truncate">{child.label}</span>
                                    </div>
                                    {child.badge && (
                                      <span
                                        className={`px-1 py-0.2 rounded text-[9px] font-mono shrink-0 ${
                                          isChildActive
                                            ? 'bg-indigo-600 text-white font-bold'
                                            : 'bg-slate-100 text-slate-600'
                                        }`}
                                      >
                                        {child.badge}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }

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


