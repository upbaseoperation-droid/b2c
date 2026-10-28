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
  'dashboard-team-sla': 'Tiến độ & SLA vận hành',
  'dashboard-staff': 'Hiệu suất nhân sự',
  'dashboard-finance': 'Đối soát & xuất file',
  'input-plan': 'Kế hoạch tháng',
  'koc-listing': 'Quản lý Deal & Booking',
  'approved-booking-list': 'List duyệt book',
  'self-channel-hub': 'Video kênh Brand & CTV',
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
  'store-air-plan-report': 'Báo cáo Kế hoạch & Air Video',
  'work-toolkit': 'Bộ công cụ tiện ích',
  'zalo-bot': 'Quản lý Zalo Bot',
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
      { key: 'manager', label: TAB_LABELS.manager },
      { key: 'task-delegation', label: TAB_LABELS['task-delegation'] },
    ],
  },
  {
    id: 'research',
    label: 'Nghiên cứu & Đối thủ',
    tabs: [
      { key: 'market-research', label: TAB_LABELS['market-research'] },
      { key: 'tiktok-crawler', label: TAB_LABELS['tiktok-crawler'] },
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
  booking: 'koc-listing',
  'approved-booking-list': 'koc-listing',
  'sample-tracker': 'koc-listing',
  'store-air-plan-report': 'dashboard-bi',
  'push-products': 'brand-knowledge',
  stores: 'master-data',
  'ctv-master': 'self-channel-hub',
  'workload-3d': 'manager',
  'performance-p3': 'manager',
  'audit-trail': 'partner-access',
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
