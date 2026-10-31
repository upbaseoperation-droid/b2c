import type { TabKey } from './types';

/**
 * Đăng ký màn: mỗi màn khai báo thuộc khuôn trang nào (UI_SYNC_PLAN.md §4.5), hoặc "riêng" kèm lý do.
 * `npm run ui:check` kiểm tra file này, nên đây là nơi duy nhất phải sửa khi thêm hoặc đổi một màn:
 *
 *  - Mọi khóa trong `TabKey` phải có mặt ở đây. Tab mới chưa khai báo thì ui:check báo lỗi.
 *  - Màn hiển thị phải có `template`. `own` bắt buộc có `reason` nói rõ vì sao không theo khuôn.
 *  - `status: 'done'` chỉ được đặt khi file màn thật sự dùng thành phần khuôn (TEMPLATE_COMPONENT);
 *    ui:check đọc file và báo lỗi nếu khai báo mà không dùng.
 *  - Khóa bị ẩn khai báo `hidden` thay cho `template`: `alias` phải có trong TAB_ALIASES (lib/navGroups.ts),
 *    `merged` phải có trong DASHBOARD_EXEC_TAB_KEYS.
 */

export type ScreenTemplate = 'list-profile' | 'report' | 'config' | 'own';

/** Thành phần khuôn mà màn `done` phải dùng. Chưa có thành phần nào: tạo ở bước 3 của kế hoạch. */
export const TEMPLATE_COMPONENT: Record<Exclude<ScreenTemplate, 'own'>, string> = {
  'list-profile': 'ListProfilePage',
  report: 'ReportPage',
  config: 'ConfigPage',
};

export interface ScreenPart {
  /** Phần của màn có bố cục riêng dù màn thuộc khuôn khác. */
  name: string;
  /** Tệp (tính từ src/) chứa phần đó. */
  file: string;
  reason: string;
}

export type ScreenEntry =
  | {
      tab: TabKey;
      /** Tệp màn chính (tính từ src/). */
      file: string;
      template: ScreenTemplate;
      /** Bắt buộc khi `template` là `own`. */
      reason?: string;
      status: 'todo' | 'done';
      parts?: ScreenPart[];
    }
  | { tab: TabKey; hidden: 'alias' | 'merged' };

export const SCREEN_REGISTRY: ScreenEntry[] = [
  /* --- Khuôn Danh sách + Hồ sơ (mẫu: Danh bạ KOC) --- */
  { tab: 'koc-master', file: 'components/views/KocMasterDataView.tsx', template: 'list-profile', status: 'todo' },
  { tab: 'brand-knowledge', file: 'components/views/BrandProfilesView.tsx', template: 'list-profile', status: 'todo' },
  { tab: 'contracts', file: 'components/views/ContractManagementView.tsx', template: 'list-profile', status: 'todo' },
  { tab: 'task-delegation', file: 'components/views/TaskDelegationView.tsx', template: 'list-profile', status: 'todo' },
  {
    tab: 'input-plan',
    file: 'components/views/MonthlyPlanHub.tsx',
    template: 'list-profile',
    status: 'todo',
    parts: [
      { name: 'Studio kế hoạch tháng', file: 'components/views/InputPlanBreakdownView.tsx', reason: 'Vỏ theo kiểu hồ sơ (quay lại, trạng thái, nút duyệt); thân là lưới nhiều bước' },
      { name: 'Bản 1-Sheet trình Brand', file: 'components/views/BrandOneSheetPlanView.tsx', reason: 'Văn bản bám đúng bố cục file Excel gửi Brand' },
    ],
  },
  {
    tab: 'koc-listing',
    file: 'components/views/KocListingBatchHubView.tsx',
    template: 'list-profile',
    status: 'todo',
    parts: [
      { name: 'Đề xuất KOC', file: 'components/shortlist/StaffBrandListingSheetWorkspace.tsx', reason: 'Bản sao Google Sheet 57 cột: sửa ô, ẩn/hiện cột, khớp cột với Sheet' },
    ],
  },

  /* --- Khuôn Báo cáo (mẫu: Báo cáo điều hành) --- */
  { tab: 'dashboard-bi', file: 'components/views/ExecutiveDashboardReportsView.tsx', template: 'report', status: 'todo' },
  { tab: 'ads-report', file: 'components/views/WeeklyAdsReportHubView.tsx', template: 'report', status: 'todo' },

  /* --- Khuôn Cấu hình (mẫu: Phân quyền) --- */
  { tab: 'partner-access', file: 'components/views/CentralizedRbacHubView.tsx', template: 'config', status: 'todo' },
  { tab: 'api-settings', file: 'components/views/ApiKeySetupView.tsx', template: 'config', status: 'todo' },
  { tab: 'master-data', file: 'components/views/MasterDataHubView.tsx', template: 'config', status: 'todo' },
  { tab: 'manager', file: 'components/views/ManagerView.tsx', template: 'config', status: 'todo' },

  /* --- Bố cục riêng (vẫn theo UI_SYNC_PLAN.md §4.1 đến §4.4) --- */
  {
    tab: 'cockpit',
    file: 'components/views/CockpitView.tsx',
    template: 'own',
    reason: 'Chỉ có một màn việc của tôi; phần nhân viên của Giao việc là chế độ xem của nó, không làm khuôn riêng.',
    status: 'todo',
  },
  {
    tab: 'content',
    file: 'components/views/ContentView.tsx',
    template: 'own',
    reason: 'Chưa xếp khuôn trong kế hoạch (bước 3 mục 5): luồng viết và duyệt kịch bản, video; quyết khi dọn màn này.',
    status: 'todo',
    parts: [
      { name: 'Kế hoạch content', file: 'components/views/ContentPlanBoard.tsx', reason: 'Kéo thả brief vào lưới Tuần × Bậc' },
    ],
  },
  {
    tab: 'self-channel-hub',
    file: 'components/views/SelfChannelCtvHubView.tsx',
    template: 'own',
    reason: 'Khung chứa 9 tab (Video kênh Brand & CTV); từng tab con theo khuôn tương ứng.',
    status: 'todo',
  },
  {
    tab: 'koc-hub',
    file: 'components/views/KocKolHubView.tsx',
    template: 'own',
    reason: 'Cổng đối tác KOC/KOL cố ý đơn giản hơn màn nội bộ: ít cột, chữ dễ hiểu với người ngoài, không có menu thao tác nội bộ.',
    status: 'todo',
  },
  {
    tab: 'tiktok-crawler',
    file: 'components/views/TikTokCrawlerHubView.tsx',
    template: 'own',
    reason: 'Luồng chạy công cụ (nhập, chạy, kết quả, lưu), dùng RunPanel.',
    status: 'todo',
  },
  {
    tab: 'market-research',
    file: 'components/views/BrandMarketResearchHubView.tsx',
    template: 'own',
    reason: 'Luồng chạy công cụ (nhập, chạy, kết quả, lưu), dùng RunPanel.',
    status: 'todo',
  },
  {
    tab: 'knowledge-qa',
    file: 'components/views/MarketingKnowledgeQaView.tsx',
    template: 'own',
    reason: 'Thư viện tài liệu và hỏi đáp, không phải danh sách bản ghi hay báo cáo.',
    status: 'todo',
  },

  /* --- Khóa bị ẩn: chuyển hướng sang màn khác (TAB_ALIASES) --- */
  { tab: 'campaigns', hidden: 'alias' },
  { tab: 'overview', hidden: 'alias' },
  { tab: 'dashboard-air-sync', hidden: 'alias' },
  { tab: 'leaderboard', hidden: 'alias' },
  { tab: 'content-angles', hidden: 'alias' },
  { tab: 'booking', hidden: 'alias' },
  { tab: 'approved-booking-list', hidden: 'alias' },
  { tab: 'sample-tracker', hidden: 'alias' },
  { tab: 'store-air-plan-report', hidden: 'alias' },
  { tab: 'push-products', hidden: 'alias' },
  { tab: 'stores', hidden: 'alias' },
  { tab: 'ctv-master', hidden: 'alias' },
  { tab: 'workload-3d', hidden: 'alias' },
  { tab: 'performance-p3', hidden: 'alias' },
  { tab: 'audit-trail', hidden: 'alias' },
  { tab: 'cloudflare-admin', hidden: 'alias' },
  { tab: 'zalo-bot', hidden: 'alias' },
  { tab: 'brand-hub', hidden: 'alias' },

  /* --- Khóa gộp vào Báo cáo tổng hợp (DASHBOARD_EXEC_TAB_KEYS) --- */
  { tab: 'dashboard-brand', hidden: 'merged' },
  { tab: 'dashboard-store', hidden: 'merged' },
  { tab: 'dashboard-video', hidden: 'merged' },
  { tab: 'dashboard-team-sla', hidden: 'merged' },
  { tab: 'dashboard-staff', hidden: 'merged' },
  { tab: 'dashboard-finance', hidden: 'merged' },
];
