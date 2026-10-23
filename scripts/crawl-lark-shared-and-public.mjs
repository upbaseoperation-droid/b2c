#!/usr/bin/env node
/**
 * Cào toàn bộ các file Công khai (Public) và Được chia sẻ (Shared with me / My Drive)
 * trên Lark của tài khoản thông qua `lark-cli`:
 * 1. Quét toàn bộ thư mục Drive cá nhân & thư mục được chia sẻ (`Marketing B2C`, `G4fUfZs...`, v.v.)
 * 2. Quét toàn bộ kết quả `drive +search` (theo `open_time`, `edit_time`, `create_time` + bộ từ khóa nghiệp vụ)
 * 3. Quét nốt 8 Wiki Spaces còn lại + `my_library`
 * 4. Tải toàn văn các tài liệu Docx/Wiki mới phát hiện và ghi nhận metadata của Sheet/Bitable/File/Slides.
 */

import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const LARK_CLI_RUN_JS = 'C:\\Users\\Chienth\\AppData\\Roaming\\npm\\node_modules\\@larksuite\\cli\\scripts\\run.js';

const BASE_KNOWLEDGE_DIR = path.join(ROOT_DIR, 'Knowledge - MD', 'upbase-knowledge');
const SHARED_OUT_DIR = path.join(BASE_KNOWLEDGE_DIR, 'lark-shared-public');

// 8 Wiki Spaces còn lại + my_library
const REMAINING_WIKI_SPACES = [
  { id: 'my_library', slug: 'my-library', name: 'Thư viện Wiki Cá nhân (My Library)' },
  { id: '7420256400535765023', slug: 'operation-work', name: 'Operation Work' },
  { id: '7428424131135176736', slug: 'upbase-collaboration', name: 'UpBase Collaboration' },
  { id: '7420584946231689247', slug: 'upbase-crm', name: 'UpBase CRM' },
  { id: '7401537977735905312', slug: 'design-department', name: 'Design Department' },
  { id: '7441478226540691487', slug: 'customer-success-ups', name: 'Customer Success UpS (US)' },
  { id: '7518946516384350247', slug: 'tai-lieu-lam-viec-ups', name: 'Tài liệu làm việc - UpS' },
  { id: '7566566019750203102', slug: 'action-chi-tiet-don-hang', name: 'Các Action trong màn Chi tiết đơn hàng' },
  { id: '7587228558028771035', slug: 'project-management-lark', name: 'Project Management_Lark' },
];

const SEARCH_KEYWORDS = [
  '', // Browse all accessible/recently opened/shared
  'UpBase',
  'B2C',
  'Booking',
  'Quy trình',
  'Kế hoạch',
  'Strategy',
  'SLA',
  'KOC',
  'Livestream',
  'Fulfillment',
  'Growth',
  'Media',
  'Account',
  'Hợp đồng',
  'UpS',
  'MCN',
  'Social Commerce',
  'Outright',
  'E2E',
  'Content',
  'Brand',
  'Báo cáo',
  'Nhân sự',
  '4P',
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
      .slice(0, 75) || 'untitled'
  );
}

async function runLarkCli(args) {
  try {
    const { stdout } = await execFileAsync(process.execPath, [LARK_CLI_RUN_JS, ...args], {
      maxBuffer: 50 * 1024 * 1024,
      timeout: 45000,
    });
    return JSON.parse(stdout);
  } catch (err) {
    if (err.stdout) {
      try {
        return JSON.parse(err.stdout);
      } catch {
        // ignore
      }
    }
    return { ok: false, error: err.message };
  }
}

async function listDriveFolderRecursive(folderToken = '', folderPath = 'My Drive', depth = 0, maxDepth = 3) {
  const params = { page_size: 50 };
  if (folderToken) params.folder_token = folderToken;
  const res = await runLarkCli(['drive', 'files', 'list', '--params', JSON.stringify(params)]);
  const files = res?.data?.files || [];
  const collected = [];

  for (const f of files) {
    const itemPath = `${folderPath}/${f.name || f.token}`;
    collected.push({ ...f, folderPath: itemPath });
    if (f.type === 'folder' && depth < maxDepth) {
      const sub = await listDriveFolderRecursive(f.token, itemPath, depth + 1, maxDepth);
      collected.push(...sub);
    }
  }
  return collected;
}

async function searchAllSharedAndPublic() {
  const itemMap = new Map(); // token -> meta

  // 1. Quét theo các chế độ sort không từ khóa (lấy tối đa 15 trang = 300 kết quả mỗi sort)
  for (const sortMode of ['open_time', 'edit_time', 'create_time']) {
    console.log(`[Drive Search] Đang quét danh sách file theo sort=${sortMode}...`);
    let pageToken = '';
    for (let page = 0; page < 15; page++) {
      const args = ['drive', '+search', '--sort', sortMode, '--page-size', '20'];
      if (pageToken) args.push('--page-token', pageToken);
      const res = await runLarkCli(args);
      const results = res?.data?.results || [];
      if (results.length === 0) break;

      for (const r of results) {
        const meta = r.result_meta || {};
        if (!meta.token) continue;
        const cleanTitle = (r.title_highlighted || '')
          .replace(/<\/?h>/g, '')
          .replace(/&amp;/g, '&')
          .trim();
        if (!itemMap.has(meta.token)) {
          itemMap.set(meta.token, {
            token: meta.token,
            title: cleanTitle || meta.token,
            entityType: r.entity_type,
            docType: meta.doc_types || '',
            ownerName: meta.owner_name || '',
            editUserName: meta.edit_user_name || '',
            updateTimeIso: meta.update_time_iso || '',
            lastOpenTimeIso: meta.last_open_time_iso || '',
            url: meta.url || '',
            isCrossTenant: Boolean(meta.is_cross_tenant),
          });
        }
      }
      if (!res?.data?.has_more || !res?.data?.page_token) break;
      pageToken = res.data.page_token;
    }
    console.log(`  -> Tổng số file độc nhất phát hiện tới hiện tại: ${itemMap.size}`);
  }

  // 2. Quét theo bộ từ khóa nghiệp vụ để bắt trọn các file công khai trong tổ chức
  for (const kw of SEARCH_KEYWORDS.filter(Boolean)) {
    let pageToken = '';
    for (let page = 0; page < 4; page++) {
      const args = ['drive', '+search', '--query', kw, '--page-size', '20'];
      if (pageToken) args.push('--page-token', pageToken);
      const res = await runLarkCli(args);
      const results = res?.data?.results || [];
      if (results.length === 0) break;

      for (const r of results) {
        const meta = r.result_meta || {};
        if (!meta.token) continue;
        const cleanTitle = (r.title_highlighted || '')
          .replace(/<\/?h>/g, '')
          .replace(/&amp;/g, '&')
          .trim();
        if (!itemMap.has(meta.token)) {
          itemMap.set(meta.token, {
            token: meta.token,
            title: cleanTitle || meta.token,
            entityType: r.entity_type,
            docType: meta.doc_types || '',
            ownerName: meta.owner_name || '',
            editUserName: meta.edit_user_name || '',
            updateTimeIso: meta.update_time_iso || '',
            lastOpenTimeIso: meta.last_open_time_iso || '',
            url: meta.url || '',
            isCrossTenant: Boolean(meta.is_cross_tenant),
          });
        }
      }
      if (!res?.data?.has_more || !res?.data?.page_token) break;
      pageToken = res.data.page_token;
    }
  }

  console.log(`[Drive Search] Hoàn tất quét: tìm thấy tổng cộng ${itemMap.size} file công khai & được chia sẻ!`);
  return [...itemMap.values()];
}

async function fetchDocxContent(docOrWikiUrlOrToken) {
  const res = await runLarkCli(['docs', '+fetch', '--doc', docOrWikiUrlOrToken, '--doc-format', 'markdown']);
  if (!res?.ok) return null;
  return res?.data?.document?.content || '';
}

function collectAlreadyCrawledTokens() {
  const existing = new Set();
  const wikiRoot = path.join(BASE_KNOWLEDGE_DIR, 'lark-wiki');
  if (!fs.existsSync(wikiRoot)) return existing;
  for (const sub of fs.readdirSync(wikiRoot)) {
    const subDir = path.join(wikiRoot, sub);
    if (!fs.statSync(subDir).isDirectory()) continue;
    for (const f of fs.readdirSync(subDir)) {
      if (!f.endsWith('.md')) continue;
      const head = fs.readFileSync(path.join(subDir, f), 'utf8').slice(0, 600);
      const tokens = head.match(/`([a-zA-Z0-9]{20,35})`/g) || [];
      tokens.forEach((t) => existing.add(t.replace(/`/g, '')));
    }
  }
  return existing;
}

async function main() {
  fs.mkdirSync(SHARED_OUT_DIR, { recursive: true });
  const existingTokens = collectAlreadyCrawledTokens();
  console.log(`Đã nhận diện ${existingTokens.size} token đã cào trước đó trong lark-wiki/.`);

  // 1. Quét Drive Folders cá nhân & chia sẻ trực tiếp
  console.log(`\n=== 1. Quét Thư mục Drive cá nhân & Thư mục chia sẻ ===`);
  const myDriveFiles = await listDriveFolderRecursive('', 'My Drive', 0, 3);
  const sharedFolderG4 = await listDriveFolderRecursive('G4fUfZs69ljWhHdFlz9lH1nTgyd', 'Shared Folder G4fUfZ', 0, 3);
  const allDriveFolderFiles = [...myDriveFiles, ...sharedFolderG4];
  console.log(`  -> Tìm thấy ${allDriveFolderFiles.length} mục trong các thư mục Drive.`);

  // 2. Quét toàn bộ kết quả Search (file công khai + được share)
  console.log(`\n=== 2. Quét toàn bộ File Công khai & Được Share qua Search v2 ===`);
  const searchItems = await searchAllSharedAndPublic();

  // 3. Quét nốt 8 Wiki Spaces còn lại + my_library
  console.log(`\n=== 3. Quét 8 Wiki Spaces còn lại + My Library ===`);
  const remainingWikiNodes = [];
  for (const sp of REMAINING_WIKI_SPACES) {
    const res = await runLarkCli(['wiki', '+node-list', '--space-id', sp.id, '--page-all', '--page-limit', '3']);
    const nodes = res?.data?.nodes || [];
    console.log(`  -> Space ${sp.name}: ${nodes.length} nodes`);
    for (const n of nodes) {
      remainingWikiNodes.push({ ...n, spaceName: sp.name, spaceSlug: sp.slug });
    }
  }

  // 4. Tải toàn văn các file DOCX / DOC / WIKI mới phát hiện (chưa có trong 706 bài trước)
  console.log(`\n=== 4. Tải nội dung các tài liệu Docx/Wiki Công khai & Được Share mới ===`);
  const newlyDownloadedDocs = [];

  // 4a. Từ Drive Folders
  for (const df of allDriveFolderFiles) {
    if ((df.type === 'docx' || df.type === 'doc') && !existingTokens.has(df.token)) {
      existingTokens.add(df.token);
      const content = await fetchDocxContent(df.token);
      if (content && content.trim().length > 0) {
        const fileName = `drive-${String(newlyDownloadedDocs.length + 1).padStart(3, '0')}-${slugify(df.name)}.md`;
        const md = [
          `# ${df.name || df.token}`,
          ``,
          `- **Vị trí Drive:** \`${df.folderPath}\``,
          `- **URL:** ${df.url}`,
          `- **Token:** \`${df.token}\``,
          ``,
          `---`,
          ``,
          content,
        ].join('\n');
        fs.writeFileSync(path.join(SHARED_OUT_DIR, fileName), md, 'utf8');
        newlyDownloadedDocs.push({
          title: df.name || df.token,
          source: `Drive (${df.folderPath})`,
          owner: 'Trần Hữu Chiến / Shared',
          docType: df.type.toUpperCase(),
          url: df.url,
          fileName,
          chars: content.length,
        });
        console.log(`  + [Drive] Đã tải: ${df.name} (${(content.length / 1024).toFixed(1)} KB)`);
      }
    }
  }

  // 4b. Từ 8 Wiki Spaces còn lại
  for (const wn of remainingWikiNodes) {
    if (wn.obj_type === 'docx' && wn.obj_token && !existingTokens.has(wn.obj_token) && !existingTokens.has(wn.node_token)) {
      existingTokens.add(wn.obj_token);
      existingTokens.add(wn.node_token);
      const content = await fetchDocxContent(wn.obj_token);
      if (content && content.trim().length > 0) {
        const title = wn.title || wn.node_token;
        const fileName = `wiki-extra-${String(newlyDownloadedDocs.length + 1).padStart(3, '0')}-${slugify(title)}.md`;
        const url = `https://upbasevn.sg.larksuite.com/wiki/${wn.node_token}`;
        const md = [
          `# ${title}`,
          ``,
          `- **Wiki Space:** ${wn.spaceName}`,
          `- **URL:** ${url}`,
          `- **Node Token:** \`${wn.node_token}\` | **Doc Token:** \`${wn.obj_token}\``,
          ``,
          `---`,
          ``,
          content,
        ].join('\n');
        fs.writeFileSync(path.join(SHARED_OUT_DIR, fileName), md, 'utf8');
        newlyDownloadedDocs.push({
          title,
          source: `Wiki: ${wn.spaceName}`,
          owner: wn.spaceName,
          docType: 'WIKI_DOCX',
          url,
          fileName,
          chars: content.length,
        });
        console.log(`  + [Wiki ${wn.spaceName}] Đã tải: ${title} (${(content.length / 1024).toFixed(1)} KB)`);
      }
    }
  }

  // 4c. Từ Search (File được share / công khai thuộc loại DOCX hoặc WIKI)
  for (const item of searchItems) {
    if (existingTokens.has(item.token)) continue;
    if (item.docType === 'DOCX' || item.docType === 'DOC') {
      existingTokens.add(item.token);
      const target = item.url || item.token;
      const content = await fetchDocxContent(target);
      if (content && content.trim().length > 0) {
        const fileName = `shared-${String(newlyDownloadedDocs.length + 1).padStart(3, '0')}-${slugify(item.title)}.md`;
        const md = [
          `# ${item.title}`,
          ``,
          `- **Phân loại:** ${item.entityType} (${item.docType})`,
          `- **Người sở hữu (Owner):** ${item.ownerName || 'N/A'}`,
          `- **Người chỉnh sửa cuối:** ${item.editUserName || 'N/A'} (${item.updateTimeIso || ''})`,
          `- **URL:** ${item.url}`,
          `- **Token:** \`${item.token}\``,
          ``,
          `---`,
          ``,
          content,
        ].join('\n');
        fs.writeFileSync(path.join(SHARED_OUT_DIR, fileName), md, 'utf8');
        newlyDownloadedDocs.push({
          title: item.title,
          source: item.isCrossTenant ? 'Shared (Cross-Tenant)' : `Shared / Public (${item.entityType})`,
          owner: item.ownerName || 'UpBase',
          docType: item.docType,
          url: item.url,
          fileName,
          chars: content.length,
        });
        console.log(`  + [Shared/Public] Đã tải: ${item.title} (${(content.length / 1024).toFixed(1)} KB) — Owner: ${item.ownerName}`);
      }
    }
  }

  // 5. Phân loại toàn bộ danh sách file công khai & được share (bao gồm cả Sheet, Bitable, Slides, Mindnote, File)
  const byType = new Map();
  for (const it of searchItems) {
    const key = `${it.entityType}:${it.docType}`;
    byType.set(key, (byType.get(key) || 0) + 1);
  }

  const sheetsAndBitables = searchItems.filter((i) =>
    ['SHEET', 'BITABLE', 'SLIDES', 'MINDNOTE', 'FILE', 'FOLDER'].includes(i.docType)
  );

  const md11Lines = [
    `# 11. TỔNG HỢP CÁC FILE CÔNG KHAI (PUBLIC), ĐƯỢC CHIA SẺ (SHARED WITH ME) & DRIVE CÁ NHÂN`,
    ``,
    `> **Kết quả quét toàn diện qua \`lark-cli\`:**`,
    `> - **Tổng số tài liệu Công khai & Được chia sẻ phát hiện qua Search v2:** **${searchItems.length} tài liệu**`,
    `> - **Số mục trong Drive cá nhân & Folder \`Marketing B2C\`:** **${allDriveFolderFiles.length} mục**`,
    `> - **Số mục trong 8 Wiki Spaces bổ sung & \`My Library\`:** **${remainingWikiNodes.length} mục**`,
    `> - **Số tài liệu Docx/Wiki mới tải thêm toàn văn (ngoài 706 bài trước):** **${newlyDownloadedDocs.length} bài** (lưu tại [\`lark-shared-public/\`](./lark-shared-public/))`,
    ``,
    `---`,
    ``,
    `## 1. Thống kê theo Loại Tài liệu Công khai & Được chia sẻ (${searchItems.length} files)`,
    ``,
    `| Phân loại (Entity : DocType) | Số lượng |`,
    `| --- | --- |`,
    ...[...byType.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `| \`${k}\` | **${v}** |`),
    ``,
    `---`,
    ``,
    `## 2. Danh sách Các Mục Trong Drive Cá Nhân & Folder \`Marketing B2C\` (${allDriveFolderFiles.length} mục)`,
    ``,
    `| STT | Đường dẫn trên Drive | Loại | Token | Link mở trên Lark |`,
    `| --- | --- | --- | --- | --- |`,
    ...allDriveFolderFiles.map(
      (f, idx) =>
        `| ${idx + 1} | \`${f.folderPath.replace(/\|/g, '\\|')}\` | \`${f.type}\` | \`${f.token}\` | [Mở Lark](${f.url}) |`
    ),
    ``,
    `---`,
    ``,
    `## 3. Danh sách Tài liệu Docx/Wiki Được Share & Công Khai Mới Tải Toàn Văn (${newlyDownloadedDocs.length} bài)`,
    ``,
    `| STT | Tiêu đề tài liệu | Nguồn | Người sở hữu (Owner) | Dung lượng | File Markdown cục bộ |`,
    `| --- | --- | --- | --- | --- | --- |`,
    ...newlyDownloadedDocs.map(
      (d, idx) =>
        `| ${idx + 1} | **[${d.title.replace(/\|/g, '\\|')}](${d.url})** | ${d.source} | ${d.owner} | ${(d.chars / 1024).toFixed(1)} KB | [${d.fileName}](./lark-shared-public/${d.fileName}) |`
    ),
    ``,
    `---`,
    ``,
    `## 4. Danh mục Toàn bộ Bảng Tính (Lark Sheets), Bảng Cơ Sở Dữ Liệu (Lark Base / Bitable), Slides & Mindnotes Được Share / Công Khai (${sheetsAndBitables.length} files)`,
    ``,
    `| STT | Tên Bảng / File | Loại | Người sở hữu (Owner) | Cập nhật cuối | Link Lark gốc |`,
    `| --- | --- | --- | --- | --- | --- |`,
    ...sheetsAndBitables.map(
      (s, idx) =>
        `| ${idx + 1} | **${s.title.replace(/\|/g, '\\|')}** | \`${s.entityType}:${s.docType}\` | ${s.ownerName || '—'} | ${s.updateTimeIso ? s.updateTimeIso.slice(0, 10) : '—'} | [Mở trên Lark](${s.url}) |`
    ),
  ];

  const out11Path = path.join(BASE_KNOWLEDGE_DIR, '11_TONG_HOP_FILE_CONG_KHAI_VA_DUOC_SHARE.md');
  fs.writeFileSync(out11Path, md11Lines.join('\n'), 'utf8');
  console.log(`\n=== HOÀN TẤT! Đã lưu báo cáo tổng hợp tại: ${out11Path} ===`);
}

main().catch((err) => {
  console.error('Lỗi thực thi:', err);
  process.exit(1);
});
