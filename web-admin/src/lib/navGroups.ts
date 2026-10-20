import { TabKey } from './types';

/** Tên màn hình mặc định, khớp menu của quản trị. Tiêu đề trang ưu tiên nhãn trên menu của vai trò đang đăng nhập (getNavLabelForRole). */
export const TAB_LABELS: Record<TabKey, string> = {
  cockpit: 'Việc của tôi',
  overview: 'Tổng quan',
  'dashboard-bi': 'Báo cáo tổng hợp',
  'dashboard-brand': 'Ngân sách & PnL',
  'dashboard-air-sync': 'Lịch đăng video',
  'dashboard-store': 'Gian hàng & Sàn',
  'dashboard-video': 'Hiệu quả video',
  'dashboard-team-sla': 'Lịch đăng video',
  'dashboard-staff': 'Hiệu suất nhân sự',
  'dashboard-finance': 'Đối soát & xuất file',
  'input-plan': 'Kế hoạch tháng',
  'koc-listing': 'Listing & Air Video',
  'self-channel-hub': 'Video kênh Brand',
  'master-data': 'Dữ liệu gốc',
  'push-products': 'Sản phẩm trọng tâm',
  stores: 'Hồ sơ gian hàng',
  campaigns: 'Chiến dịch Brand',
  'brand-knowledge': 'Hồ sơ thương hiệu',
  content: 'Kịch bản & Video',
  'content-angles': 'Góc nội dung',
  'partner-access': 'Phân quyền & Nhân sự',
  booking: 'Quản lý Booking',
  'koc-master': 'Danh bạ KOC',
  'ctv-master': 'Danh bạ CTV / VJ',
  contracts: 'Hợp đồng',
  manager: 'Điều phối nhân sự',
  'task-delegation': 'Giao việc & định mức',
  'workload-3d': 'Bản đồ 3D & Workload',
  'sample-tracker': 'Hàng mẫu & Ads',
  'performance-p3': 'Đánh giá 4P & thưởng',
  leaderboard: 'Bảng xếp hạng',
  'brand-hub': 'Cổng đối tác Brand',
  'koc-hub': 'Cổng đối tác KOC / KOL',
  'ads-report': 'Báo cáo Ads TikTok',
  'api-settings': 'Cấu hình API',
  'cloudflare-admin': 'Quản lý Cloudflare R2',
  'knowledge-qa': 'Sổ tay & Hỏi đáp',
  'audit-trail': 'Nhật ký kiểm toán',
  'tiktok-crawler': 'Crawler KOC & Đối thủ',
  'market-research': 'Nghiên cứu Brand & Đối thủ',
};

export interface NavGroupTabItem {
  key: TabKey;
  label: string;
}

export interface NavGroupDefinition {
  id: string;
  label: string;
  tabs: NavGroupTabItem[];
}

export const NAV_GROUPS: NavGroupDefinition[] = [
  {
    id: 'dashboard',
    label: 'Báo cáo & Dashboard',
    tabs: [
      { key: 'dashboard-bi', label: TAB_LABELS['dashboard-bi'] },
      { key: 'ads-report', label: TAB_LABELS['ads-report'] },
    ],
  },
  {
    id: 'delegation',
    label: 'Điều phối & Giao việc',
    tabs: [
      { key: 'task-delegation', label: TAB_LABELS['task-delegation'] },
      { key: 'workload-3d', label: TAB_LABELS['workload-3d'] },
      { key: 'manager', label: TAB_LABELS.manager },
    ],
  },
  {
    id: 'brand',
    label: 'Brand & Gian hàng',
    tabs: [
      { key: 'brand-knowledge', label: TAB_LABELS['brand-knowledge'] },
      { key: 'stores', label: TAB_LABELS.stores },
    ],
  },
  {
    id: 'research',
    label: 'Nghiên cứu & Crawler',
    tabs: [
      { key: 'market-research', label: TAB_LABELS['market-research'] },
      { key: 'tiktok-crawler', label: TAB_LABELS['tiktok-crawler'] },
      { key: 'koc-master', label: TAB_LABELS['koc-master'] },
    ],
  },
];

export const DASHBOARD_EXEC_TAB_KEYS: TabKey[] = [
  'overview',
  'dashboard-bi',
  'dashboard-brand',
  'dashboard-air-sync',
  'dashboard-store',
  'dashboard-video',
  'dashboard-team-sla',
  'dashboard-staff',
  'dashboard-finance',
];

export const TAB_ALIASES: Partial<Record<TabKey, TabKey>> = {
  overview: 'dashboard-brand',
  'dashboard-bi': 'dashboard-brand',
  'dashboard-air-sync': 'dashboard-team-sla',
  leaderboard: 'dashboard-staff',
  'content-angles': 'brand-knowledge',
};

export function resolveNavGroupTabKey(tab: TabKey): TabKey {
  if (DASHBOARD_EXEC_TAB_KEYS.includes(tab)) {
    return 'dashboard-bi';
  }
  return tab;
}

export function getNavGroupForTab(tab: TabKey): NavGroupDefinition | null {
  const resolved = resolveNavGroupTabKey(tab);
  return NAV_GROUPS.find((g) => g.tabs.some((t) => t.key === resolved)) ?? null;
}
