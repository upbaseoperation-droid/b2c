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
  ExternalLink,
  Video,
  X,
  LogOut,
  KeyRound,
  Film,
  Store,
  PanelLeftClose,
  Building2,
  FileSpreadsheet,
  ChevronDown,
  ChevronRight,
  Sliders,
  HelpCircle,
  ClipboardList,
  ShieldCheck,
  Search,
  Clapperboard,
  Contact,
  Cloud,
  type LucideIcon,
} from 'lucide-react';
import { UserProfile, TabKey } from '../lib/types';
import { getAllowedTabsForRole } from '../lib/rbacData';
import { NAV_GROUPS, DASHBOARD_EXEC_TAB_KEYS } from '../lib/navGroups';
import { Avatar, BrandLogo, Presence, SlidingIndicator, useActiveBox } from './ui';
export type { TabKey };

interface NavItem {
  key: TabKey;
  label: string;
  icon: LucideIcon;
  badge?: string;
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
  currentUser: UserProfile;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onLogout?: () => void;
  badgeCounts?: Partial<Record<TabKey, number | string>>;
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
const groupLabel = (id: string) => NAV_GROUPS.find((g) => g.id === id)?.label ?? id;

// Mục menu dùng chung cho mọi vai trò: đổi nhãn/icon/gộp nhóm chỉ sửa một chỗ.
const NAV = {
  cockpit: { key: 'cockpit', label: 'Việc của tôi', icon: CheckSquare },
  dashboard: { key: 'dashboard-bi', label: groupLabel('dashboard'), icon: LayoutDashboard, group: 'dashboard' },
  inputPlan: { key: 'input-plan', label: 'Kế hoạch tháng', icon: Calendar },
  delegation: { key: 'task-delegation', label: groupLabel('delegation'), icon: ClipboardList, group: 'delegation' },
  brand: { key: 'brand-knowledge', label: groupLabel('brand'), icon: BookOpen, group: 'brand' },
  research: { key: 'market-research', label: groupLabel('research'), icon: Search, group: 'research' },
  campaigns: { key: 'campaigns', label: 'Chiến dịch Brand', icon: Layers },
  pushProducts: { key: 'push-products', label: 'Sản phẩm trọng tâm', icon: TrendingUp },
  booking: { key: 'booking', label: 'Quản lý Booking', icon: Users },
  content: { key: 'content', label: 'Kịch bản & Video', icon: FileText },
  kocListing: { key: 'koc-listing', label: 'Listing & Air Video', icon: Film },
  selfChannel: { key: 'self-channel-hub', label: 'Video kênh Brand', icon: Clapperboard },
  kocMaster: { key: 'koc-master', label: 'Danh bạ KOC', icon: Contact },
  ctvMaster: { key: 'ctv-master', label: 'Danh bạ CTV / VJ', icon: Video },
  contracts: { key: 'contracts', label: 'Hợp đồng', icon: FileCheck },
  samples: { key: 'sample-tracker', label: 'Hàng mẫu & Ads', icon: Package },
  performance: { key: 'performance-p3', label: 'Đánh giá 4P & thưởng', icon: Coins },
  masterData: { key: 'master-data', label: 'Dữ liệu gốc', icon: Database },
  partnerAccess: { key: 'partner-access', label: 'Phân quyền & Nhân sự', icon: KeyRound },
  cloudflareAdmin: { key: 'cloudflare-admin', label: 'Quản lý Cloudflare R2', icon: Cloud },
  audit: { key: 'audit-trail', label: 'Nhật ký kiểm toán', icon: ShieldCheck },
} satisfies Record<string, NavItem>;

/** Màn đặt ở chân menu (cạnh tài khoản) thay vì chiếm một dòng trong danh sách. */
const FOOTER_ITEMS: NavItem[] = [
  { key: 'knowledge-qa', label: 'Sổ tay & Hỏi đáp', icon: HelpCircle },
  { key: 'api-settings', label: 'Cấu hình API', icon: Sliders },
];

// Danh mục điều hướng chuẩn — mục hiển thị thực tế được lọc động theo phân quyền (getAllowedTabsForRole).
function getNavSectionsForUserRole(role: UserProfile['role']): NavSection[] {
  if (role === 'BRAND_PARTNER') {
    return [
      {
        title: 'Cổng thương hiệu',
        items: [
          { key: 'brand-hub', label: 'Cổng đối tác Brand', icon: ExternalLink },
          NAV.kocListing,
          NAV.pushProducts,
          NAV.content,
          NAV.campaigns,
          NAV.samples,
          NAV.dashboard,
        ],
      },
    ];
  }

  if (role === 'KOC_PARTNER') {
    return [
      {
        title: 'Không gian KOC / KOL',
        items: [
          { key: 'koc-hub', label: 'Cổng đối tác KOC / KOL', icon: Users },
          NAV.content,
          NAV.contracts,
          NAV.samples,
        ],
      },
    ];
  }

  if (role === 'CTV_PARTNER') {
    return [
      {
        title: 'Không gian CTV video',
        items: [
          { ...NAV.selfChannel, label: 'Cộng tác viên video', icon: Video },
          NAV.content,
          NAV.samples,
          NAV.pushProducts,
        ],
      },
    ];
  }

  const contractsNav: NavItem =
    role === 'LEGAL'
      ? { ...NAV.contracts, label: 'Hợp đồng & Biểu mẫu' }
      : role === 'FINANCE'
      ? { ...NAV.contracts, label: 'Hợp đồng & Duyệt chi' }
      : role === 'SIGN_ADMIN'
      ? { ...NAV.contracts, label: 'Hợp đồng & Trình ký' }
      : NAV.contracts;

  return [
    { items: [NAV.cockpit, NAV.dashboard] },
    {
      title: 'Kế hoạch & Phân bổ',
      items: [NAV.inputPlan, NAV.delegation, NAV.campaigns, NAV.brand, NAV.research],
    },
    {
      title: 'Booking & Nội dung',
      items: [NAV.booking, NAV.content, NAV.kocListing, NAV.selfChannel, NAV.ctvMaster],
    },
    {
      title: 'Hợp đồng & Hiệu suất',
      items: [contractsNav, NAV.samples, NAV.pushProducts, NAV.performance],
    },
    {
      title: 'Hệ thống',
      items: [NAV.masterData, NAV.partnerAccess, NAV.cloudflareAdmin, NAV.audit],
    },
  ];
}

/** Nhãn của màn hình trên menu trái của vai trò này (mục con ưu tiên hơn mục cha, màn trong nhóm lấy nhãn nhóm). Dùng làm tiêu đề trang. */
export function getNavLabelForRole(role: UserProfile['role'], tab: TabKey): string | undefined {
  for (const sec of getNavSectionsForUserRole(role)) {
    for (const item of sec.items) {
      const child = item.children?.find(c => c.key === tab);
      if (child) return child.label;
      if (item.group && GROUP_TABS[item.group]?.includes(tab)) return item.label;
      if (!item.children && item.key === tab) return item.label;
    }
  }
  return FOOTER_ITEMS.find(f => f.key === tab)?.label;
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
  badgeCounts,
}) => {
  const [rbacTick, setRbacTick] = React.useState(0);
  React.useEffect(() => {
    const onRbacChange = () => setRbacTick(t => t + 1);
    window.addEventListener('upbase-rbac-updated', onRbacChange);
    return () => window.removeEventListener('upbase-rbac-updated', onRbacChange);
  }, []);

  const allowedSet = React.useMemo(() => {
    void rbacTick;
    return new Set(getAllowedTabsForRole(currentUser.role));
  }, [currentUser.role, rbacTick]);

  const lastGroupTabRef = useRef<Record<string, TabKey>>({});
  for (const [groupId, tabs] of Object.entries(GROUP_TABS)) {
    if (tabs.includes(activeTab) && allowedSet.has(activeTab)) {
      lastGroupTabRef.current[groupId] = activeTab;
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
          const allowedChildren = item.children.filter(c => allowedSet.has(c.key));
          if (allowedChildren.length > 0) {
            items.push({
              ...item,
              badge: badgeOf(item.key, item.badge),
              key: allowedChildren[0].key,
              children: allowedChildren.map(c => ({ ...c, badge: badgeOf(c.key, c.badge) })),
            });
          }
        } else if (item.group) {
          // Mục nhóm: hiện khi vai trò mở được ít nhất một màn trong nhóm, bấm vào mở lại màn gần nhất trong nhóm.
          const allowedInGroup = (GROUP_TABS[item.group] ?? []).filter(k => allowedSet.has(k));
          const remembered = lastGroupTabRef.current[item.group];
          const targetTab = (remembered && allowedInGroup.includes(remembered)) ? remembered : allowedInGroup[0];
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
  }, [currentUser.role, allowedSet, badgeCounts, activeTab]);

  const footerItems = FOOTER_ITEMS.filter(f => allowedSet.has(f.key));

  const isAnyDashboardActive = DASHBOARD_TAB_KEYS.includes(activeTab);
  const [isDashboardMenuOpen, setIsDashboardMenuOpen] = React.useState<boolean>(false);

  // Nền + vạch của mục đang mở là một phần tử, trượt sang mục mới khi chuyển màn.
  const navRef = useRef<HTMLElement>(null);
  const { box, ready } = useActiveBox(navRef, activeTab);

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
                  className="hidden lg:inline-flex p-1.5 rounded-md text-ink-3 hover:text-ink hover:bg-sunken transition-colors cursor-pointer"
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
                                ? 'bg-accent-soft/60 text-accent font-semibold'
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
                                  (activeTab === 'dashboard-bi' && child.key === 'dashboard-brand') ||
                                  (activeTab === 'dashboard-air-sync' && child.key === 'dashboard-team-sla');
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
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }

                    const groupTabs = item.group ? GROUP_TABS[item.group] : undefined;
                    const isActive = groupTabs ? groupTabs.includes(activeTab) : activeTab === item.key;
                    return (
                      <button
                        key={item.group ?? item.key}
                        onClick={() => {
                          // Đang ở một màn trong nhóm thì giữ nguyên màn đó, chỉ đóng menu trên mobile.
                          if (isActive && groupTabs) onCloseMobile?.();
                          else handleItemClick(item.key);
                        }}
                        aria-current={isActive ? 'page' : undefined}
                        data-active={isActive}
                        className={`sidebar-item w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-left text-[13px] leading-5 transition-colors cursor-pointer ${
                          isActive
                            ? 'text-accent font-semibold'
                            : 'text-ink-2 hover:text-ink hover:bg-sunken'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-accent' : 'text-ink-3'}`} strokeWidth={1.75} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className={`px-1.5 py-0.25 rounded text-3xs font-medium tabular-nums ${
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

        <div className="shrink-0 px-3 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] border-t border-line">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar name={currentUser.name} src={currentUser.larkAvatarUrl} size={28} />
              <div className="min-w-0 leading-tight">
                <span className="block text-[13px] font-medium text-ink truncate">{currentUser.name}</span>
                <span className="block text-2xs text-ink-3 truncate mt-0.5">{currentUser.roleTitle}</span>
              </div>
            </div>

            <div className="flex items-center shrink-0">
              {footerItems.map((f) => {
                const FooterIcon = f.icon;
                const isActive = activeTab === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => handleItemClick(f.key)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors ${
                      isActive ? 'text-accent bg-accent-soft' : 'text-ink-3 hover:text-ink hover:bg-sunken'
                    }`}
                    title={f.label}
                    aria-label={f.label}
                  >
                    <FooterIcon className="w-4 h-4" strokeWidth={1.75} />
                  </button>
                );
              })}
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md text-ink-3 hover:text-ink hover:bg-sunken transition-colors"
                  title="Đăng xuất"
                  aria-label="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" strokeWidth={1.75} />
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
