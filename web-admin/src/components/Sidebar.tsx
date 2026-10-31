'use client';

import React, { useRef } from 'react';
import {
  CheckSquare,
  LayoutDashboard,
  Layers,
  FileText,
  Users,
  FileCheck,
  BookOpen,
  Calendar,
  Database,
  Video,
  X,
  LogOut,
  Loader2,
  KeyRound,
  Film,
  PanelLeftClose,
  ChevronDown,
  ChevronRight,
  Sliders,
  ClipboardList,
  Search,
  Clapperboard,
  Contact,
  Radio,
  Send,
  BarChart3,
  Package,
  Sparkles,
  Scale,
  Receipt,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { UserProfile, TabKey } from '../lib/types';
import { getAllowedTabsForRole } from '../lib/rbacData';
import { NAV_GROUPS, DASHBOARD_EXEC_TAB_KEYS } from '../lib/navGroups';
import { Avatar, BrandLogo, Presence, SlidingIndicator, useActiveBox } from './ui';
export type { TabKey };

export interface SidebarSubViewEventDetail {
  tab: TabKey;
  subView?: string;
  navId?: string;
}

interface NavItem {
  id?: string;
  key: TabKey;
  label: string;
  icon: LucideIcon;
  badge?: string;
  subView?: string;
  children?: NavItem[];
  /** Mục đại diện cho một nhóm màn hình (NAV_GROUPS); chuyển màn con bằng thanh Tabs đầu trang. */
  group?: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

interface SidebarProps {
  activeTab: TabKey;
  onTabSelect: (tab: TabKey) => void;
  onTabHover?: (tab: TabKey) => void;
  currentUser: UserProfile;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onLogout?: () => void;
  isLoggingOut?: boolean;
  badgeCounts?: Partial<Record<TabKey, number | string>>;
  onOpenProfile?: () => void;
}

export const DASHBOARD_TAB_KEYS: TabKey[] = [
  ...DASHBOARD_EXEC_TAB_KEYS,
  'ads-report',
];

const GROUP_TABS: Record<string, TabKey[]> = Object.fromEntries(
  NAV_GROUPS.map((g) => [
    g.id,
    g.id === 'dashboard' ? DASHBOARD_TAB_KEYS : g.tabs.map((t) => t.key),
  ])
);

// Lưu nhãn sub-menu vừa chọn theo từng TabKey để TopHeader hiển thị đúng tiêu đề mục con đang mở
const activeSubLabelByTab: Partial<Record<TabKey, string>> = {};
const activeNavIdByTab: Partial<Record<TabKey, string>> = {};

// Cấu trúc Menu 3 Tầng chuẩn nghiệp vụ B2C: Level 1 (Section) -> Level 2 (Menu cha) -> Level 3 (Sub-menu xổ ra)
const NAV = {
  // 1. Tổng quan & Báo cáo
  cockpit: {
    id: 'nav-cockpit',
    key: 'cockpit' as TabKey,
    label: 'Việc của tôi',
    icon: CheckSquare,
  },
  dashboardGroup: {
    id: 'group-dashboard',
    key: 'dashboard-brand' as TabKey,
    label: 'Báo cáo & Dashboard',
    icon: LayoutDashboard,
    children: [
      {
        id: 'sub-dash-pnl',
        key: 'dashboard-brand' as TabKey,
        subView: 'OVERVIEW_FINANCE',
        label: 'Tổng quan & Ngân sách PnL',
        icon: BarChart3,
      },
      {
        id: 'sub-dash-sla',
        key: 'dashboard-team-sla' as TabKey,
        subView: 'PLAN_ACTUAL',
        label: 'Kế hoạch & Thực thi tuần',
        icon: Calendar,
      },
      {
        id: 'sub-dash-ads',
        key: 'ads-report' as TabKey,
        subView: 'ADS_REPORT',
        label: 'Hiệu quả Video & Ads',
        icon: Video,
      },
      {
        id: 'sub-dash-staff',
        key: 'dashboard-staff' as TabKey,
        subView: 'STAFF_EFFICIENCY',
        label: 'Hiệu suất nhân sự',
        icon: Users,
      },
    ],
  },

  // 2. Hồ sơ thương hiệu (4 mục phẳng gọn)
  brandInfo: {
    id: 'nav-brand-info',
    key: 'brand-knowledge' as TabKey,
    subView: 'OVERVIEW',
    label: 'Thông tin thương hiệu',
    icon: BookOpen,
  },
  brandProducts: {
    id: 'nav-brand-products',
    key: 'brand-knowledge' as TabKey,
    subView: 'PRODUCTS',
    label: 'Sản phẩm trọng tâm',
    icon: Package,
  },
  brandContent: {
    id: 'nav-brand-content',
    key: 'content' as TabKey,
    subView: 'SCRIPTS',
    label: 'Quản trị Content',
    icon: FileText,
  },
  brandResearch: {
    id: 'nav-brand-research',
    key: 'market-research' as TabKey,
    label: 'Nghiên cứu Brand & Đối thủ',
    icon: Search,
  },

  // 3. Kế hoạch
  planGroup: {
    id: 'group-plan',
    key: 'input-plan' as TabKey,
    label: 'Kế hoạch tháng',
    icon: Calendar,
    children: [
      {
        id: 'sub-plan-brand',
        key: 'input-plan' as TabKey,
        subView: 'BRAND_PLANS',
        label: 'Tổng hợp Kế hoạch Thương hiệu',
        icon: Layers,
      },
      {
        id: 'sub-plan-store',
        key: 'input-plan' as TabKey,
        subView: 'STORE_GOVERNANCE',
        label: 'Kế hoạch 69 Gian hàng & Tuần',
        icon: Calendar,
      },
      {
        id: 'sub-plan-content',
        key: 'content' as TabKey,
        subView: 'CONTENT_PLAN',
        label: 'Kế hoạch Content',
        icon: FileText,
      },
    ],
  },
  delegationGroup: {
    id: 'group-delegation',
    key: 'manager' as TabKey,
    label: 'Điều phối & Giao việc',
    icon: ClipboardList,
    children: [
      {
        id: 'sub-del-alloc',
        key: 'manager' as TabKey,
        label: 'Phân bổ gian hàng & Nhân sự',
        icon: Users,
      },
      {
        id: 'sub-del-task',
        key: 'task-delegation' as TabKey,
        subView: 'ASSIGNMENTS',
        label: 'Giao việc & Theo dõi SLA',
        icon: ClipboardList,
      },
    ],
  },

  // 4. Booking (4.1 Tìm kiếm & Gợi ý KOC -> 4.2 Triển khai Booking)
  kocDiscoveryGroup: {
    id: 'group-koc-discovery',
    key: 'tiktok-crawler' as TabKey,
    label: 'Tìm kiếm & Gợi ý KOC',
    icon: Search,
    children: [
      {
        id: 'sub-disc-crawler',
        key: 'tiktok-crawler' as TabKey,
        label: 'Dò tìm KOC xu hướng',
        icon: Search,
      },
      {
        id: 'sub-disc-matching',
        key: 'koc-listing' as TabKey,
        subView: 'CREATOR_MATCHING',
        label: 'Gợi ý & Khớp KOC',
        icon: Sparkles,
      },
    ],
  },
  bookingGroup: {
    id: 'group-booking',
    key: 'koc-listing' as TabKey,
    label: 'Triển khai Booking',
    icon: Film,
    children: [
      {
        id: 'sub-book-tiktok',
        key: 'koc-listing' as TabKey,
        subView: 'STAFF_BRAND_SHEET',
        label: 'Booking TikTok',
        icon: Video,
      },
      {
        id: 'sub-book-multi',
        key: 'multi-platform-booking' as TabKey,
        label: 'Booking đa sàn',
        icon: Layers,
      },
      {
        id: 'sub-book-live',
        key: 'livestream-booking' as TabKey,
        label: 'Livestream Affiliate',
        icon: Radio,
      },
      {
        id: 'sub-book-self',
        key: 'self-channel-hub' as TabKey,
        subView: 'WORK',
        label: 'Video Self-channel',
        icon: Clapperboard,
      },
    ],
  },

  // 5. Hợp đồng, phụ lục
  contractsGroup: {
    id: 'group-contracts',
    key: 'contracts' as TabKey,
    label: 'Quản lý Hợp đồng',
    icon: FileCheck,
    children: [
      {
        id: 'sub-con-hdnt',
        key: 'contracts' as TabKey,
        subView: 'RECORDS',
        label: 'Hợp đồng nguyên tắc',
        icon: FileCheck,
      },
      {
        id: 'sub-con-sow',
        key: 'contracts' as TabKey,
        subView: 'DEAL_DOCS',
        label: 'Phụ lục (SOW)',
        icon: FileText,
      },
      {
        id: 'sub-con-bbnt',
        key: 'contracts' as TabKey,
        subView: 'BBNT',
        label: 'Biên bản nghiệm thu',
        icon: CheckSquare,
      },
      {
        id: 'sub-con-portal',
        key: 'contracts' as TabKey,
        subView: 'APPROVAL_PORTAL',
        label: 'Pháp chế & Kế toán duyệt',
        icon: Scale,
      },
    ],
  },
  larkSettlementGroup: {
    id: 'group-lark-settlement',
    key: 'lark-settlement' as TabKey,
    label: 'Nghiệm thu & Đẩy ĐNTT Lark',
    icon: Send,
    children: [
      {
        id: 'sub-lark-queue',
        key: 'lark-settlement' as TabKey,
        subView: 'UNIFIED_QUEUE',
        label: 'Sổ nghiệm thu & Đẩy ĐNTT',
        icon: Send,
      },
      {
        id: 'sub-lark-slips',
        key: 'lark-settlement' as TabKey,
        subView: 'LARK_SLIPS',
        label: 'Phiếu ĐNTT & Luồng duyệt Lark',
        icon: Receipt,
      },
      {
        id: 'sub-lark-recon',
        key: 'lark-settlement' as TabKey,
        subView: 'FINANCE_RECON',
        label: 'Khóa sổ S40 & Đối soát Nhãn hàng',
        icon: ShieldCheck,
      },
    ],
  },

  // 6. Danh bạ (Đã bỏ Cổng đối tác KOC / KOL, giữ Danh bạ KOC và Danh bạ VJ / CTV + Cổng CTV)
  kocMaster: {
    id: 'nav-koc-master',
    key: 'koc-master' as TabKey,
    label: 'Danh bạ KOC / KOL',
    icon: Contact,
  },
  ctvDirectoryGroup: {
    id: 'group-ctv-directory',
    key: 'self-channel-hub' as TabKey,
    label: 'Danh bạ VJ / CTV',
    icon: Users,
    children: [
      {
        id: 'sub-ctv-list',
        key: 'self-channel-hub' as TabKey,
        subView: 'CONTRIBUTORS',
        label: 'Hồ sơ VJ / CTV',
        icon: Contact,
      },
      {
        id: 'sub-ctv-portal',
        key: 'self-channel-hub' as TabKey,
        subView: 'DISCUSSION',
        label: 'Cổng cộng tác viên (CTV)',
        icon: Users,
      },
    ],
  },

  // 7. Hệ thống
  masterDataGroup: {
    id: 'group-master-data',
    key: 'master-data' as TabKey,
    label: 'Dữ liệu gốc',
    icon: Database,
    children: [
      {
        id: 'sub-md-stores',
        key: 'master-data' as TabKey,
        subView: 'stores',
        label: 'Thương hiệu & 69 Gian hàng',
        icon: Database,
      },
      {
        id: 'sub-md-catalog',
        key: 'master-data' as TabKey,
        subView: 'cast-tiers',
        label: 'Bậc cast, Tệp kênh, Định dạng',
        icon: Layers,
      },
      {
        id: 'sub-md-staff',
        key: 'master-data' as TabKey,
        subView: 'staff',
        label: 'Nhân sự & Chuẩn SLA',
        icon: Users,
      },
    ],
  },
  rbacGroup: {
    id: 'group-rbac',
    key: 'partner-access' as TabKey,
    label: 'Phân quyền & Định mức',
    icon: KeyRound,
    children: [
      {
        id: 'sub-rbac-roles',
        key: 'partner-access' as TabKey,
        subView: 'roles',
        label: 'Vai trò & Ma trận phân quyền',
        icon: KeyRound,
      },
      {
        id: 'sub-rbac-internal',
        key: 'partner-access' as TabKey,
        subView: 'internal',
        label: 'Phân quyền & Bàn giao gian hàng',
        icon: Users,
      },
      {
        id: 'sub-rbac-policy',
        key: 'task-delegation' as TabKey,
        subView: 'POLICY',
        label: 'Chính sách định mức công việc',
        icon: Sliders,
      },
    ],
  },

  // Mục dùng riêng cho đối tác bên ngoài
  kocHubPartnerOnly: {
    id: 'nav-koc-hub-partner',
    key: 'koc-hub' as TabKey,
    label: 'Không gian KOC / KOL',
    icon: Users,
  },
} satisfies Record<string, NavItem>;

/** Cụm icon nhỏ ở chân menu (cạnh tài khoản): Icon quyển sách (Học tập, Sổ tay & Kiểm tra) + Icon cấu hình API. */
const FOOTER_ITEMS: NavItem[] = [
  {
    id: 'footer-knowledge-qa',
    key: 'knowledge-qa',
    label: 'Học tập, Sổ tay & Kiểm tra',
    icon: BookOpen,
  },
  {
    id: 'footer-api-settings',
    key: 'api-settings',
    label: 'Tích hợp & Cấu hình API',
    icon: Sliders,
  },
];

// Danh mục điều hướng 3 tầng chuẩn — mục hiển thị thực tế được lọc động theo phân quyền (getAllowedTabsForRole).
function getNavSectionsForUserRole(role: UserProfile['role']): NavSection[] {
  if (role === 'BRAND_PARTNER') {
    return [
      {
        title: 'Thương hiệu & Google Sheet',
        items: [
          {
            id: 'brand-partner-booking',
            key: 'koc-listing',
            label: 'Booking TikTok',
            icon: Video,
          },
          NAV.brandContent,
          NAV.brandInfo,
          NAV.dashboardGroup,
        ],
      },
    ];
  }

  if (role === 'KOC_PARTNER') {
    return [
      {
        title: 'Không gian KOC / KOL',
        items: [NAV.kocHubPartnerOnly],
      },
    ];
  }

  if (role === 'CTV_PARTNER') {
    return [
      {
        title: 'Không gian CTV video',
        items: [
          {
            id: 'ctv-partner-portal',
            key: 'self-channel-hub',
            label: 'Cổng cộng tác viên (CTV)',
            icon: Video,
          },
        ],
      },
    ];
  }

  return [
    {
      title: '1. Tổng quan & Báo cáo',
      items: [NAV.cockpit, NAV.dashboardGroup],
    },
    {
      title: '2. Hồ sơ thương hiệu',
      items: [
        NAV.brandInfo,
        NAV.brandProducts,
        NAV.brandContent,
        NAV.brandResearch,
      ],
    },
    {
      title: '3. Kế hoạch',
      items: [NAV.planGroup, NAV.delegationGroup],
    },
    {
      title: '4. Booking',
      items: [NAV.kocDiscoveryGroup, NAV.bookingGroup],
    },
    {
      title: '5. Hợp đồng, phụ lục',
      items: [NAV.contractsGroup, NAV.larkSettlementGroup],
    },
    {
      title: '6. Danh bạ',
      items: [NAV.kocMaster, NAV.ctvDirectoryGroup],
    },
    {
      title: '7. Hệ thống',
      items: [NAV.masterDataGroup, NAV.rbacGroup],
    },
  ];
}

/** Nhãn của màn hình trên menu trái của vai trò này. Dùng làm tiêu đề trang trên TopHeader. */
export function getNavLabelForRole(role: UserProfile['role'], tab: TabKey): string | undefined {
  const rememberedLabel = activeSubLabelByTab[tab];
  if (rememberedLabel) return rememberedLabel;

  for (const sec of getNavSectionsForUserRole(role)) {
    for (const item of sec.items) {
      const child = item.children?.find((c) => c.key === tab);
      if (child) return child.label;
      if (item.group && GROUP_TABS[item.group]?.includes(tab)) return item.label;
      if (!item.children && item.key === tab) return item.label;
    }
  }
  return FOOTER_ITEMS.find((f) => f.key === tab)?.label;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabSelect,
  onTabHover,
  currentUser,
  isMobileOpen = false,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
  onLogout,
  isLoggingOut,
  badgeCounts,
  onOpenProfile,
}) => {
  const [rbacTick, setRbacTick] = React.useState(0);
  const [activeNavId, setActiveNavId] = React.useState<string | undefined>(
    () => activeNavIdByTab[activeTab]
  );

  React.useEffect(() => {
    const onRbacChange = () => setRbacTick((t) => t + 1);
    window.addEventListener('upbase-rbac-updated', onRbacChange);
    return () => window.removeEventListener('upbase-rbac-updated', onRbacChange);
  }, []);

  const allowedSet = React.useMemo(() => {
    void rbacTick;
    return new Set(getAllowedTabsForRole(currentUser.role));
  }, [currentUser.role, rbacTick]);

  const [lastGroupTabs, setLastGroupTabs] = React.useState<Record<string, TabKey>>({});
  for (const [groupId, tabs] of Object.entries(GROUP_TABS)) {
    if (tabs.includes(activeTab) && allowedSet.has(activeTab) && lastGroupTabs[groupId] !== activeTab) {
      setLastGroupTabs((prev) => ({ ...prev, [groupId]: activeTab }));
    }
  }

  const navSections = React.useMemo(() => {
    const baseSections = getNavSectionsForUserRole(currentUser.role);
    const badgeOf = (key: TabKey, fallback?: string) =>
      badgeCounts?.[key] !== undefined ? String(badgeCounts[key]) : fallback;

    const filtered: NavSection[] = [];
    for (const sec of baseSections) {
      const items: NavItem[] = [];
      for (const item of sec.items) {
        if (item.children && item.children.length > 0) {
          const allowedChildren = item.children.filter((c) => allowedSet.has(c.key));
          if (allowedChildren.length > 0) {
            items.push({
              ...item,
              badge: badgeOf(item.key, item.badge),
              key: allowedChildren[0].key,
              children: allowedChildren.map((c) => ({ ...c, badge: badgeOf(c.key, c.badge) })),
            });
          }
        } else if (item.group) {
          const allowedInGroup = (GROUP_TABS[item.group] ?? []).filter((k) => allowedSet.has(k));
          const remembered = allowedInGroup.includes(activeTab)
            ? activeTab
            : lastGroupTabs[item.group];
          const targetTab = remembered && allowedInGroup.includes(remembered) ? remembered : allowedInGroup[0];
          if (targetTab) items.push({ ...item, key: targetTab, badge: badgeOf(targetTab, item.badge) });
        } else if (allowedSet.has(item.key)) {
          items.push({ ...item, badge: badgeOf(item.key, item.badge) });
        }
      }
      if (items.length > 0) {
        filtered.push({ ...sec, items });
      }
    }

    return filtered;
  }, [currentUser.role, allowedSet, badgeCounts, activeTab, lastGroupTabs]);

  const footerItems = FOOTER_ITEMS.filter((f) => allowedSet.has(f.key));

  // Quản lý trạng thái đóng/mở độc lập cho từng Menu Level 2 có chứa Sub-menu Level 3
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({
    'group-dashboard': false,
    'group-plan': true,
    'group-delegation': false,
    'group-koc-discovery': false,
    'group-booking': true,
    'group-contracts': true,
    'group-lark-settlement': false,
    'group-ctv-directory': false,
    'group-master-data': false,
    'group-rbac': false,
  });

  const [prevActiveRouteKey, setPrevActiveRouteKey] = React.useState<string>('');
  const currentRouteKey = `${activeTab}:${activeNavId || ''}`;
  if (currentRouteKey !== prevActiveRouteKey) {
    setPrevActiveRouteKey(currentRouteKey);
    for (const sec of navSections) {
      for (const item of sec.items) {
        if (!item.children || item.children.length === 0) continue;
        const groupId = item.id || item.label;
        const matchesChild = item.children.some((c) =>
          activeNavId ? c.id === activeNavId : c.key === activeTab
        );
        if (matchesChild && !openGroups[groupId]) {
          setOpenGroups((prev) => ({ ...prev, [groupId]: true }));
        }
      }
    }
  }

  const navRef = useRef<HTMLElement>(null);
  const { box, ready } = useActiveBox(navRef, `${activeTab}-${activeNavId || ''}`);

  React.useEffect(() => {
    if (!isMobileOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseMobile?.();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isMobileOpen, onCloseMobile]);

  const handleSelectNavItem = (target: NavItem) => {
    activeSubLabelByTab[target.key] = target.label;
    if (target.id) {
      activeNavIdByTab[target.key] = target.id;
      setActiveNavId(target.id);
    }
    onTabSelect(target.key);
    if (typeof window !== 'undefined' && target.subView) {
      const detail: SidebarSubViewEventDetail = {
        tab: target.key,
        subView: target.subView,
        navId: target.id,
      };
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent<SidebarSubViewEventDetail>('upbase-sidebar-subview', { detail }));
      }, 0);
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent<SidebarSubViewEventDetail>('upbase-sidebar-subview', { detail }));
      }, 150);
    }
    onCloseMobile?.();
  };

  const isLeafItemActive = (item: NavItem): boolean => {
    if (activeTab !== item.key) return false;
    const savedId = activeNavId || activeNavIdByTab[activeTab];
    if (savedId && item.id) {
      return savedId === item.id;
    }
    // Mặc định chọn mục đầu tiên trùng TabKey nếu người dùng chưa bấm mục cụ thể
    if (item.key === 'brand-knowledge') return item.id === 'nav-brand-info';
    if (item.key === 'content') return item.id === 'nav-brand-content';
    if (item.key === 'koc-listing') return item.id === 'sub-book-tiktok';
    if (item.key === 'self-channel-hub') return item.id === 'sub-book-self';
    if (item.key === 'task-delegation') return item.id === 'sub-del-task';
    if (item.key === 'input-plan') return item.id === 'sub-plan-store';
    if (item.key === 'contracts') return item.id === 'sub-con-hdnt';
    if (item.key === 'lark-settlement') return item.id === 'sub-lark-queue';
    if (item.key === 'master-data') return item.id === 'sub-md-stores';
    if (item.key === 'partner-access') return item.id === 'sub-rbac-roles';
    return true;
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
        className={`app-sidebar w-64 sm:w-60 max-w-[85vw] bg-surface border-r border-line flex flex-col justify-between shrink-0 h-dvh select-none transition-transform duration-(--motion-base) ease-move fixed inset-y-0 left-0 z-50 lg:z-30 ${
          isMobileOpen
            ? 'translate-x-0 shadow-2xl'
            : isCollapsed
            ? '-translate-x-full'
            : '-translate-x-full lg:translate-x-0'
        }`}
        aria-label="Điều hướng chính"
      >
        <div className="flex flex-col min-h-0 flex-1 overflow-y-auto overscroll-contain sidebar-scrollbar">
          <div className="h-14 px-4 flex items-center justify-between border-b border-line shrink-0">
            <BrandLogo height={22} />

            <div className="flex items-center gap-1">
              {onToggleCollapse && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="hidden lg:inline-flex p-2 rounded-md text-ink-3 hover:text-ink hover:bg-sunken transition-colors cursor-pointer"
                  title="Ẩn thanh menu bên trái để mở rộng không gian làm việc"
                  aria-label="Ẩn thanh menu bên trái"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              )}

              {onCloseMobile && (
                <button
                  type="button"
                  onClick={onCloseMobile}
                  className="lg:hidden h-8 w-8 inline-flex items-center justify-center rounded-md text-ink-3 hover:text-ink hover:bg-sunken transition-colors"
                  aria-label="Đóng menu"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <nav ref={navRef} className="relative px-3 py-3 space-y-3">
            <SlidingIndicator box={box} ready={ready} className="sidebar-indicator rounded-md bg-accent-soft" />
            {navSections.map((section, idx) => (
              <div key={section.title || `sec-${idx}`}>
                {section.title && (
                  <div className="px-3 pb-1 text-2xs font-medium text-ink-3">
                    {section.title}
                  </div>
                )}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const hasChildren = Boolean(item.children && item.children.length > 0);

                    if (hasChildren && item.children) {
                      const groupId = item.id || item.label;
                      const isGroupActive = item.children.some((c) => isLeafItemActive(c));
                      const isGroupOpen = Boolean(openGroups[groupId]);
                      const submenuId = `sidebar-submenu-${groupId}`;

                      return (
                        <div key={`group-${groupId}`} className="space-y-0.5">
                          <button
                            type="button"
                            aria-expanded={isGroupOpen}
                            aria-controls={submenuId}
                            onMouseEnter={() => {
                              if (item.children?.[0]?.key) onTabHover?.(item.children[0].key);
                            }}
                            onClick={() => {
                              setOpenGroups((prev) => ({
                                ...prev,
                                [groupId]: !prev[groupId],
                              }));
                            }}
                            className={`sidebar-item w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-left text-xs leading-5 transition-colors cursor-pointer ${
                              isGroupActive
                                ? 'bg-accent-soft/60 text-accent font-semibold'
                                : 'text-ink-2 hover:text-ink hover:bg-sunken'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Icon
                                className={`w-4 h-4 shrink-0 ${
                                  isGroupActive ? 'text-accent' : 'text-ink-3'
                                }`}
                                strokeWidth={1.75}
                              />
                              <span className="truncate">{item.label}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {isGroupOpen ? (
                                <ChevronDown className="w-3.5 h-3.5 text-ink-3" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-ink-3" />
                              )}
                            </div>
                          </button>

                          {isGroupOpen && (
                            <div id={submenuId} className="ml-4 pl-3 border-l border-line space-y-0.5 py-0.5">
                              {item.children.map((child) => {
                                const ChildIcon = child.icon;
                                const isChildActive =
                                  isLeafItemActive(child) ||
                                  (activeTab === 'dashboard-bi' && child.id === 'sub-dash-pnl') ||
                                  (activeTab === 'dashboard-air-sync' && child.id === 'sub-dash-sla');
                                return (
                                  <button
                                    key={child.id || `${child.key}-${child.label}`}
                                    type="button"
                                    onMouseEnter={() => onTabHover?.(child.key)}
                                    onClick={() => handleSelectNavItem(child)}
                                    aria-current={isChildActive ? 'page' : undefined}
                                    data-active={isChildActive}
                                    className={`sidebar-item w-full flex items-center justify-between gap-2 px-2 py-1.25 rounded-md text-left text-2xs leading-4 transition-colors cursor-pointer ${
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
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }

                    const isActive = isLeafItemActive(item);
                    return (
                      <button
                        key={item.id ?? item.key}
                        type="button"
                        onMouseEnter={() => onTabHover?.(item.key)}
                        onClick={() => handleSelectNavItem(item)}
                        aria-current={isActive ? 'page' : undefined}
                        data-active={isActive}
                        className={`sidebar-item w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-left text-xs leading-5 transition-colors cursor-pointer ${
                          isActive
                            ? 'text-accent font-semibold'
                            : 'text-ink-2 hover:text-ink hover:bg-sunken'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-accent' : 'text-ink-3'}`} strokeWidth={1.75} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className={`px-2 py-0.25 rounded text-2xs font-medium tabular-nums ${
                            isActive ? 'bg-accent/15 text-accent' : 'bg-sunken text-ink-3'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="shrink-0 px-3 pt-2 pb-[max(0.625rem,env(safe-area-inset-bottom))] border-t border-line space-y-2">
          {/* Hàng công cụ tiện ích (Icon quyển sách Học tập/Kiểm tra & Icon Cấu hình API) + Đăng xuất */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-0.5">
              {footerItems.map((f) => {
                const FooterIcon = f.icon;
                const isActive = activeTab === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onMouseEnter={() => onTabHover?.(f.key)}
                    onClick={() => handleSelectNavItem(f)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`h-7 w-7 inline-flex items-center justify-center rounded-md transition-colors cursor-pointer ${
                      isActive ? 'text-accent bg-accent-soft' : 'text-ink-3 hover:text-ink hover:bg-sunken'
                    }`}
                    title={f.label}
                    aria-label={f.label}
                  >
                    <FooterIcon className="w-4 h-4" strokeWidth={1.75} />
                  </button>
                );
              })}
            </div>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                disabled={isLoggingOut}
                className="h-7 w-7 inline-flex items-center justify-center rounded-md text-ink-3 hover:text-critical hover:bg-critical-soft/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                title="Đăng xuất"
                aria-label="Đăng xuất"
              >
                {isLoggingOut ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
                ) : (
                  <LogOut className="w-4 h-4" strokeWidth={1.75} />
                )}
              </button>
            )}
          </div>

          {/* Thẻ định danh người dùng */}
          <button
            type="button"
            onClick={onOpenProfile}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-sunken transition-colors text-left group cursor-pointer"
            title="Xem hồ sơ và thiết lập cá nhân"
          >
            <Avatar name={currentUser.name} src={currentUser.larkAvatarUrl} size={32} />
            <div className="min-w-0 flex-1 leading-tight">
              <span className="block text-xs font-semibold text-ink truncate group-hover:text-accent">
                {currentUser.name}
              </span>
              <span className="block text-2xs text-ink-3 truncate mt-0.5">
                {currentUser.roleTitle}
              </span>
            </div>
          </button>
        </div>
      </aside>
    </>
  );
};
