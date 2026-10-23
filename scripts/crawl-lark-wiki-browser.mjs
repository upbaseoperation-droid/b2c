#!/usr/bin/env node
/**
 * Trình cào tự động Lark Wiki & Lark Docs bằng Playwright (Persistent Browser Session).
 * - Tự động mở cửa sổ trình duyệt tới Lark Wiki UpBase.
 * - Ngay khi phát hiện đã đăng nhập (quét QR qua app Lark chỉ mất 3 giây),
 *   script tự động duyệt toàn bộ danh sách SEED Wiki/Docx + tự động khám phá
 *   toàn bộ cây thư mục Wiki (Sidebar Tree) để cào toàn bộ nội dung về
 *   `Knowledge - MD/upbase-knowledge/lark-wiki-live/`.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { chromium } = require('../tutorial-video/node_modules/playwright');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PROFILE_DIR = path.join(ROOT_DIR, '.lark-browser-profile');
const LIVE_OUT_DIR = path.join(ROOT_DIR, 'Knowledge - MD', 'upbase-knowledge', 'lark-wiki-live');

const INITIAL_WIKI_AND_DOC_URLS = [
  'https://upbasevn.sg.larksuite.com/wiki/MWDawxMC6icJ6qkxpS5llQ5lgP8',
  'https://upbasevn.sg.larksuite.com/wiki/K8olwuIBCiur2bkNFmzlGqjTgdb',
  'https://upbasevn.sg.larksuite.com/wiki/ReccwFGwIiPZdikVRJnlo2SXgbh',
  'https://upbasevn.sg.larksuite.com/wiki/VYLPwxMNti41qEkm04olgcqugse',
  'https://upbasevn.sg.larksuite.com/wiki/B0M4wXywNiUEkckZNSFlDqFqgRg',
  'https://upbasevn.sg.larksuite.com/wiki/HoE1w7nvciiXFzkClP5lh8ysgvc',
  'https://upbasevn.sg.larksuite.com/wiki/F9oWwAwQdifE0Ak59oclhjjWgKc',
  'https://upbasevn.sg.larksuite.com/wiki/VcsNwnovaiRWNYk6Sjrl102VgOf',
  'https://upbasevn.sg.larksuite.com/docx/LtgKdulUaoucvNx1XmNlThbVgvd',
  'https://upbasevn.sg.larksuite.com/docx/VXsjd3shdoSc4lxJSvYlbvOjg7d',
  'https://upbasevn.sg.larksuite.com/docx/YmOSdFv7zoNHpYxwau5lDerFgcc',
  'https://upbasevn.sg.larksuite.com/drive/folder/G4fUfZs69ljWhHdFlz9lH1nTgyd',
];

function slugify(str) {
  return (
    String(str || 'untitled')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
      .slice(0, 80) || 'untitled'
  );
}

function normalizeLarkUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    if (!u.hostname.includes('larksuite.com')) return null;
    if (
      u.pathname.startsWith('/wiki/') ||
      u.pathname.startsWith('/docx/') ||
      u.pathname.startsWith('/docs/')
    ) {
      return `${u.origin}${u.pathname}`;
    }
    return null;
  } catch {
    return null;
  }
}

async function waitForUserLogin(page) {
  console.log('[Lark Browser] Đang kiểm tra trạng thái đăng nhập...');
  await page.goto(INITIAL_WIKI_AND_DOC_URLS[0], { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);

  if (page.url().includes('accounts.larksuite.com') || page.url().includes('/login')) {
    console.log('================================================================');
    console.log('VUI LÒNG QUÉT MÃ QR HOẶC ĐĂNG NHẬP LARK TRÊN CỬA SỔ TRÌNH DUYỆT VỪA MỞ.');
    console.log('Ngay khi đăng nhập xong, hệ thống sẽ TỰ ĐỘNG cào toàn bộ Lark Wiki!');
    console.log('================================================================');

    // Chờ tối đa 5 phút để người dùng quét QR
    const start = Date.now();
    while (Date.now() - start < 300_000) {
      const currentUrl = page.url();
      if (
        currentUrl.includes('upbasevn.sg.larksuite.com') &&
        !currentUrl.includes('accounts.larksuite.com') &&
        !currentUrl.includes('/login')
      ) {
        console.log('[Lark Browser] Đã phát hiện đăng nhập thành công! Bắt đầu cào dữ liệu...');
        await page.waitForTimeout(4000);
        return true;
      }
      await page.waitForTimeout(1500);
    }
    throw new Error('Hết thời gian chờ đăng nhập Lark (5 phút).');
  }

  console.log('[Lark Browser] Phiên đăng nhập đã sẵn sàng!');
  return true;
}

async function expandSidebarAndCollectLinks(page) {
  // Mở rộng các nút mũi tên trên cây thư mục Wiki bên trái nếu có
  try {
    const expandButtons = await page
      .locator('[class*="tree"] [class*="expand"], [class*="wiki-tree"] [class*="arrow"]')
      .all();
    for (const btn of expandButtons.slice(0, 30)) {
      await btn.click({ timeout: 500 }).catch(() => {});
    }
    await page.waitForTimeout(1000);
  } catch {
    // ignore
  }

  const hrefs = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href]')).map((a) => a.href);
    return links;
  });

  const discovered = [];
  for (const h of hrefs) {
    const clean = normalizeLarkUrl(h);
    if (clean) discovered.push(clean);
  }
  return [...new Set(discovered)];
}

async function extractPageContentAsMarkdown(page, url) {
  // Chờ trang render nội dung chính của Lark Wiki / Docx
  await page.waitForTimeout(3500);

  // Cuộn trang từ từ để Lark lazy-load toàn bộ các block trong tài liệu dài
  await page.evaluate(async () => {
    const scrollContainers = [
      document.querySelector('.bear-web-x-container'),
      document.querySelector('.docx-editor-container'),
      document.querySelector('[class*="suite-markdown"]'),
      document.querySelector('[class*="wiki-content"]'),
      document.scrollingElement,
    ].filter(Boolean);

    const target = scrollContainers[0] || window;
    for (let i = 0; i < 12; i++) {
      if (target === window) {
        window.scrollBy(0, 900);
      } else {
        target.scrollTop += 900;
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    if (target === window) window.scrollTo(0, 0);
    else target.scrollTop = 0;
  });

  await page.waitForTimeout(1000);

  const data = await page.evaluate(() => {
    const pageTitle =
      document.querySelector('.doc-title, [class*="title-input"], h1')?.innerText?.trim() ||
      document.title.replace(/\s*-\s*Lark.*$/i, '').trim();

    // Tìm vùng nội dung chính của tài liệu (bỏ qua sidebar trái & header trên)
    const mainContainer =
      document.querySelector('.bear-web-x-container') ||
      document.querySelector('[class*="docx-container"]') ||
      document.querySelector('[class*="etherpad-container"]') ||
      document.querySelector('main') ||
      document.body;

    // Trích xuất có cấu trúc: headings, paragraphs, list items, tables
    const lines = [];
    const tables = mainContainer.querySelectorAll('table');
    const rawText = mainContainer.innerText || '';

    const tableMdList = [];
    tables.forEach((tbl, idx) => {
      const trs = Array.from(tbl.querySelectorAll('tr'));
      if (trs.length === 0) return;
      const rows = trs.map((tr) =>
        Array.from(tr.querySelectorAll('th, td')).map((td) =>
          (td.innerText || '').replace(/\r?\n+/g, '<br>').replace(/\|/g, '\\|').trim()
        )
      );
      const maxCols = Math.max(...rows.map((r) => r.length), 0);
      if (maxCols === 0) return;
      const header = Array.from({ length: maxCols }, (_, i) => rows[0][i] || `Col ${i + 1}`);
      const md = [
        `| ${header.join(' | ')} |`,
        `| ${header.map(() => '---').join(' | ')} |`,
        ...rows.slice(1).map((r) => `| ${Array.from({ length: maxCols }, (_, i) => r[i] || '').join(' | ')} |`),
      ].join('\n');
      tableMdList.push(`### Bảng dữ liệu ${idx + 1}\n\n${md}`);
    });

    return {
      title: pageTitle || 'Untitled Lark Page',
      rawText: rawText.trim(),
      tableMdList,
    };
  });

  const md = [
    `# ${data.title}`,
    ``,
    `- **Nguồn Lark:** ${url}`,
    `- **Thời gian cào:** ${new Date().toISOString()}`,
    ``,
    `---`,
    ``,
    data.rawText,
    ``,
    ...(data.tableMdList.length > 0 ? [`\n---\n## Các Bảng Dữ Liệu Trích Xuất\n`, ...data.tableMdList] : []),
  ].join('\n');

  return { title: data.title, markdown: md, length: data.rawText.length };
}

async function main() {
  fs.mkdirSync(LIVE_OUT_DIR, { recursive: true });

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: { width: 1400, height: 900 },
    args: ['--start-maximized'],
  });

  const page = context.pages()[0] || (await context.newPage());
  await waitForUserLogin(page);

  // Mở thêm trang Wiki Home để lấy danh sách tất cả Wiki Spaces của UpBase
  const queue = [...INITIAL_WIKI_AND_DOC_URLS];
  const visited = new Set();
  const crawledSummary = [];

  try {
    await page.goto('https://upbasevn.sg.larksuite.com/wiki/', {
      waitUntil: 'domcontentloaded',
      timeout: 25000,
    });
    await page.waitForTimeout(3500);
    const spaceLinks = await expandSidebarAndCollectLinks(page);
    for (const l of spaceLinks) {
      if (!queue.includes(l)) queue.push(l);
    }
    console.log(`[Wiki Home] Phát hiện thêm ${spaceLinks.length} đường dẫn từ trang chủ Wiki.`);
  } catch (e) {
    console.log('[Wiki Home] Bỏ qua trang chủ Wiki:', e.message);
  }

  const MAX_PAGES = 60;
  while (queue.length > 0 && visited.size < MAX_PAGES) {
    const url = queue.shift();
    const cleanUrl = normalizeLarkUrl(url) || url;
    if (visited.has(cleanUrl)) continue;
    visited.add(cleanUrl);

    console.log(`\n[${visited.size}/${ Math.min(queue.length + visited.size, MAX_PAGES) }] Đang cào: ${cleanUrl}`);
    try {
      await page.goto(cleanUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const newLinks = await expandSidebarAndCollectLinks(page);
      for (const l of newLinks) {
        if (!visited.has(l) && !queue.includes(l)) {
          queue.push(l);
        }
      }

      const extracted = await extractPageContentAsMarkdown(page, cleanUrl);
      const tokenPart = cleanUrl.split('/').pop().slice(0, 8);
      const fileName = `${String(crawledSummary.length + 1).padStart(2, '0')}-${slugify(extracted.title)}-${tokenPart}.md`;
      const outPath = path.join(LIVE_OUT_DIR, fileName);
      fs.writeFileSync(outPath, extracted.markdown, 'utf8');

      crawledSummary.push({
        index: crawledSummary.length + 1,
        title: extracted.title,
        url: cleanUrl,
        fileName,
        chars: extracted.length,
      });
      console.log(`  -> Đã lưu: ${fileName} (${extracted.length} ký tự) | Hàng đợi còn: ${queue.length}`);
    } catch (err) {
      console.log(`  ! Lỗi khi cào ${cleanUrl}: ${err.message}`);
    }
  }

  // Ghi file tổng hợp kết quả cào trực tiếp từ Lark Wiki
  const indexMd = [
    `# DANH SÁCH TÀI LIỆU CÀO TRỰC TIẾP TỪ LARK WIKI UPBASE`,
    ``,
    `- **Tổng số trang đã cào:** ${crawledSummary.length}`,
    `- **Thời điểm cập nhật:** ${new Date().toISOString()}`,
    ``,
    `| STT | Tiêu đề trang Wiki / Docx | Dung lượng (ký tự) | File lưu trữ | Link Lark gốc |`,
    `| --- | --- | --- | --- | --- |`,
    ...crawledSummary.map(
      (item) =>
        `| ${item.index} | **${item.title.replace(/\|/g, '\\|')}** | ${item.chars.toLocaleString('vi-VN')} | [${item.fileName}](./${item.fileName}) | [Mở Lark](${item.url}) |`
    ),
  ].join('\n');

  fs.writeFileSync(path.join(LIVE_OUT_DIR, '00_LARK_WIKI_LIVE_INDEX.md'), indexMd, 'utf8');
  console.log(`\n=== HOÀN TẤT CÀO ${crawledSummary.length} TRANG TỪ LARK WIKI ===`);
  console.log(`Thư mục lưu trữ: ${LIVE_OUT_DIR}`);
  await context.close();
}

main().catch((err) => {
  console.error('Lỗi:', err.message);
  process.exit(1);
});
