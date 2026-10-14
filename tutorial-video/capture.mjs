// Chụp màn hình luồng "Dữ liệu gốc" từ web-admin (localhost:3000) cho video Remotion.
// Mỗi bước: ảnh full 1920x1080 + toạ độ các phần tử để animate (target, dòng đầu bảng, modal...).
import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = 'public/shots';
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForTimeout(2500);

const shots = {};
const box = async (loc) => {
  if (!(await loc.count())) return null;
  const b = await loc.first().boundingBox();
  return b ? { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) } : null;
};
// các dòng bảng đang hiển thị trong khung hình (để làm hiệu ứng "nhấc" dòng lên)
const rows = async () => {
  const all = await page.locator('main table tbody tr').all();
  const out = [];
  for (const r of all.slice(0, 6)) {
    const b = await r.boundingBox();
    if (b && b.y > 0 && b.y + b.height < 1080 && b.height > 20) out.push({ x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) });
  }
  return out;
};
const shot = async (id, extra = {}) => {
  // ẩn badge dev của Next.js
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${id}.png` });
  shots[id] = { rows: await rows(), ...extra };
  console.log('shot', id);
};

const sidebar = page.getByText('Dữ liệu gốc', { exact: true });
await shot('home', { target: await box(sidebar) });
await sidebar.first().click();
await page.waitForTimeout(2500);

const tab = (label) => page.getByRole('tab', { name: new RegExp('^' + label.replace(/[/&]/g, '.')) });
const search = page.getByPlaceholder('Tìm thương hiệu, mã, ngành hàng, PIC...');
const addBtn = page.locator('button', { hasText: 'Thêm thương hiệu' });
await shot('brands', {
  target: await box(tab('Thương hiệu')),
  search: await box(search),
  addBtn: await box(addBtn),
  tabs: await box(page.getByRole('tablist')),
});

await search.click();
await search.pressSequentially('Kutie', { delay: 60 });
await shot('brand-search', { target: await box(search) });
await search.fill('');
await page.waitForTimeout(600);

await addBtn.first().click();
await page.waitForTimeout(800);
const dialog = page.getByRole('dialog');
await dialog.first().screenshot({ path: `${OUT}/modal.png` });
await shot('brand-modal', {
  dialog: await box(dialog),
  nameInput: await box(page.getByPlaceholder("Ví dụ: L'Oréal, Senka, Kutieskin, Torriden...")),
  createBtn: await box(page.locator('button', { hasText: 'Tạo thương hiệu' })),
});
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
const cancel = page.locator('[role=dialog] button', { hasText: /^Hủy|^Huỷ/ });
if (await cancel.count()) await cancel.first().click().catch(() => {});

for (const [id, label] of [
  ['stores', 'Gian hàng'],
  ['mindmap', 'Sơ đồ phân cấp'],
  ['products', 'Sản phẩm'],
  ['pillars', 'Trụ cột nội dung'],
  ['kocs', 'Danh bạ KOC'],
  ['staff', 'Nhân sự Booking'],
  ['sla', 'Chuẩn SLA & KPI'],
  ['audit', 'Nhật ký kiểm toán'],
]) {
  const t = tab(label);
  await t.first().click();
  await page.waitForTimeout(1800);
  // đo sau khi click vì thanh tab có thể cuộn ngang
  await shot(id, { target: await box(t) });
}

fs.writeFileSync('src/shots.json', JSON.stringify(shots, null, 2));
await browser.close();
