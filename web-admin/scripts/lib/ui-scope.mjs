/**
 * Phạm vi quét giao diện, dùng chung cho ui-codemod.mjs và ui-check.mjs.
 * Danh sách màn ẩn theo UI_SYNC_PLAN.md §2.2. Khi một màn ẩn được đưa lại lên menu, xóa nó khỏi danh sách này.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SRC = path.join(ROOT, 'src');

export const HIDDEN_SCREENS = new Set([
  // Bị chuyển hướng (TAB_ALIASES trong lib/navGroups.ts)
  'BrandView', 'PushProductsView', 'Workload3dMapView', 'PerformanceP3View', 'AuditTrailView',
  'CloudflareAdminView', 'AirBookingReportHubView', 'BrandHubView',
  // Không màn nào hiển thị
  'OverviewView', 'LeaderboardView', 'KocPipelineMonitorView', 'MasterDataMindmapView', 'PlanDealBoard',
  // Không có trên menu, còn nút dẫn vào
  'BookingView', 'SampleTrackerView', 'StoreManagementView',
  // Văn bản pháp lý in: giữ nguyên định dạng
  'ContractModal',
]);

export function isSkipped(file) {
  const rel = path.relative(SRC, file).split(path.sep).join('/');
  if (rel.startsWith('components/ui/')) return true;
  return HIDDEN_SCREENS.has(path.basename(file, '.tsx'));
}

export function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.tsx')) out.push(p);
  }
  return out;
}

export function defaultFiles() {
  return [path.join(SRC, 'components'), path.join(SRC, 'app')].flatMap((d) => walk(d));
}
