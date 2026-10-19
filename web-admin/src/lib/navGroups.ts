import { TabKey } from './types';

export const TAB_LABELS: Record<TabKey, string> = {
  cockpit: 'Việc của tôi',
  overview: 'Tổng quan',
  'dashboard-bi': 'Báo cáo điều hành',
  'dashboard-brand': 'Ngân sách & đối soát',
  'dashboard-air-sync': 'Lịch air tuần',
  'dashboard-store': 'Gian hàng & TikTok Seller',
  'dashboard-video': 'Video & KOC / Ads',
  'dashboard-team-sla': 'Lịch air & tiến độ',
  'dashboard-staff': 'Nhân sự & xếp hạng',
  'dashboard-finance': 'Sổ cái & thanh toán',
  'input-plan': 'Kế hoạch tháng',
  'koc-listing': 'Đề xuất KOC',
  'self-channel-hub': 'Kênh tự xây & CTV',
  'master-data': 'Dữ liệu gốc',
  'push-products': 'Sản phẩm đẩy',
  stores: 'Hồ sơ gian hàng',
  campaigns: 'Chiến dịch & duyệt Brand',
  'brand-knowledge': 'Hồ sơ thương hiệu',
  content: 'Kịch bản & video',
  'content-angles': 'Trụ cột nội dung',
  'partner-access': 'Phân quyền',
  booking: 'Booking',
  'koc-master': 'Danh bạ KOC',
  'ctv-master': 'Danh bạ CTV',
  contracts: 'Hợp đồng & thanh toán',
  manager: 'Phân bổ & định mức',
  'task-delegation': 'Giao việc & điểm số',
  'workload-3d': 'Bản đồ tải việc 3D',
  'sample-tracker': 'Hàng mẫu & mã Ads',
  'performance-p3': 'Đánh giá 4P',
  leaderboard: 'Bảng xếp hạng',
  'brand-hub': 'Cổng thương hiệu',
  'koc-hub': 'Cổng KOC',
  'ads-report': 'Báo cáo Ads tuần',
  'api-settings': 'Cấu hình tích hợp',
  'knowledge-qa': 'Hỏi đáp nghiệp vụ',
  'audit-trail': 'Nhật ký kiểm toán',
  'tiktok-crawler': 'Quét kênh & đối thủ',
  'market-research': 'Nghiên cứu thị trường',
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
    id: 'delegation',
    label: 'Phân việc & điều phối',
    tabs: [
      { key: 'task-delegation', label: TAB_LABELS['task-delegation'] },
      { key: 'workload-3d', label: TAB_LABELS['workload-3d'] },
      { key: 'manager', label: TAB_LABELS.manager },
    ],
  },
  {
    id: 'brand',
    label: 'Thương hiệu & chiến dịch',
    tabs: [
      { key: 'brand-knowledge', label: TAB_LABELS['brand-knowledge'] },
      { key: 'campaigns', label: TAB_LABELS.campaigns },
      { key: 'push-products', label: TAB_LABELS['push-products'] },
    ],
  },
  {
    id: 'research',
    label: 'Nghiên cứu đối thủ',
    tabs: [
      { key: 'market-research', label: TAB_LABELS['market-research'] },
      { key: 'tiktok-crawler', label: TAB_LABELS['tiktok-crawler'] },
    ],
  },
];

export const TAB_ALIASES: Partial<Record<TabKey, TabKey>> = {
  overview: 'dashboard-brand',
  'dashboard-bi': 'dashboard-brand',
  'dashboard-air-sync': 'dashboard-team-sla',
  leaderboard: 'dashboard-staff',
};

export function getNavGroupForTab(tab: TabKey): NavGroupDefinition | null {
  return NAV_GROUPS.find((g) => g.tabs.some((t) => t.key === tab)) ?? null;
}
