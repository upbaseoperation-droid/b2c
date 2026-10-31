#!/usr/bin/env node
/**
 * Chạy probe.js trên từng màn ở 1440x900 và 375px (UI_SYNC_PLAN.md §6, lớp 3).
 *
 *   npm run dev                       (terminal khác, cổng 3000)
 *   npm run ui:audit                  mở trình duyệt thật, đăng nhập vai trò demo đầu tiên, đo 13 màn x 2 cỡ
 *   npm run ui:audit -- --url=http://localhost:3000 --role=Quản trị
 *
 * Cần Playwright (chưa là dependency của dự án): npm i -D playwright && npx playwright install chromium
 * Chỉ dùng với máy dev (localhost); không bao giờ trỏ vào môi trường thật.
 *
 * Mã thoát 1 nếu có lỗi nghiêm trọng: trang tràn ngang, ô hẹp, ô lệch hàng. Chữ nhỏ, chữ bị cắt, nhãn đánh số
 * và chú thích chỉ được báo cáo (ui:check giữ phần mã nguồn).
 *
 * Đã chạy thử trên localhost với Playwright 1.64 (13 màn x 2 cỡ, khoảng 2 phút).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const URL_ = arg('url', 'http://localhost:3000');
const ROLE = arg('role', '');
const SEVERE = new Set(['tran-ngang', 'o-hep', 'lech-hang']);
// Các mục menu chính theo UI_SYNC_PLAN.md §2.1 (vai trò Quản trị thấy đủ). Mục không có ở vai trò đang dùng thì bỏ qua.
const MENU = [
  'Việc của tôi', 'Báo cáo & Dashboard', 'Kế hoạch tháng', 'Kịch bản & Video', 'Điều phối & Giao việc',
  'Quản lý Deal & Booking', 'Video kênh Brand & CTV', 'Hợp đồng', 'Danh bạ KOC', 'Hồ sơ thương hiệu',
  'Nghiên cứu & Đối thủ', 'Dữ liệu gốc', 'Phân quyền & Nhân sự',
];
const SIZES =[{ w: 1440, h: 900 }, { w: 375, h: 812 }];

if (!/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?/.test(URL_)) {
  console.error('ui:audit chỉ chạy trên localhost.');
  process.exit(2);
}

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('Chưa cài Playwright. Chạy: npm i -D playwright && npx playwright install chromium');
  process.exit(2);
}

const probe = fs.readFileSync(path.join(HERE, 'probe.js'), 'utf8');
const browser = await chromium.launch();
let severe = 0;
const report = [];

for (const size of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h } });
  const page = await ctx.newPage();
  await page.goto(`${URL_}/login`);
  if (ROLE) await page.getByRole('radio', { name: new RegExp(ROLE) }).first().click();
  await page.getByRole('button', { name: /vai trò đã chọn/ }).click();
  // Ở 375px thanh menu là ngăn kéo ẩn: chờ nút có trong DOM, không chờ hiển thị.
  await page.waitForSelector('aside button', { state: 'attached', timeout: 30000 });

  const present = await page.$$eval('aside button', (bs) => bs.map((b) => b.innerText.trim().split('\n')[0].trim()));
  for (const label of MENU.filter((m) => present.includes(m))) {
    await page.locator('aside button', { hasText: label }).first().evaluate((el) => el.click());
    await page.waitForTimeout(2500);
    const result = await page.evaluate(probe);
    report.push({ screen: label, viewport: `${size.w}x${size.h}`, counts: result.counts, issues: result.issues });
    for (const [rule, n] of Object.entries(result.counts)) if (SEVERE.has(rule)) severe += n;
  }
  await ctx.close();
}
await browser.close();

const out = path.join(HERE, 'last-report.json');
fs.writeFileSync(out, JSON.stringify(report, null, 2));
for (const r of report) {
  const parts = Object.entries(r.counts).map(([k, n]) => `${k}=${n}`).join(' ');
  console.log(`${r.viewport.padEnd(9)} ${r.screen.padEnd(28)} ${parts || 'sạch'}`);
}
console.log(`\nBáo cáo chi tiết: ${path.relative(process.cwd(), out)}`);
if (severe) { console.error(`ui:audit: ${severe} lỗi nghiêm trọng (tràn ngang, ô hẹp, ô lệch hàng).`); process.exit(1); }
