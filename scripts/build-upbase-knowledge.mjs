#!/usr/bin/env node
/**
 * Trình biên dịch & tổng hợp tự động toàn bộ dữ liệu Lark của UpBase
 * (Bao gồm: Lark Base exports .xlsx, Lark Wiki/Docx exports .md/.zip, Tài liệu quy trình .pdf)
 * thành Bộ Knowledge UpBase chuẩn hóa tại `Knowledge - MD/upbase-knowledge/`.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ExcelJS = require('../web-admin/node_modules/exceljs');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT_DIR, 'Knowledge - MD', 'upbase-knowledge');

function cellToString(cellVal) {
  if (cellVal === null || cellVal === undefined) return '';
  if (typeof cellVal === 'object') {
    if (cellVal.result !== undefined) return cellToString(cellVal.result);
    if (Array.isArray(cellVal.richText)) {
      return cellVal.richText.map((t) => t.text || '').join('');
    }
    if (cellVal.text !== undefined) return String(cellVal.text);
    if (cellVal instanceof Date) return cellVal.toISOString().slice(0, 10);
    return JSON.stringify(cellVal);
  }
  return String(cellVal);
}

function cleanMdCell(str) {
  return String(str || '')
    .replace(/\r?\n+/g, '<br>')
    .replace(/\|/g, '\\|')
    .trim();
}

async function readWorksheetRows(filePath, sheetIndexOrName = 1, maxRows = 500) {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(ROOT_DIR, filePath);
  if (!fs.existsSync(fullPath)) return { sheetName: '', rows: [] };
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(fullPath);
  const ws =
    typeof sheetIndexOrName === 'string'
      ? wb.getWorksheet(sheetIndexOrName) || wb.worksheets[0]
      : wb.worksheets[sheetIndexOrName - 1] || wb.worksheets[0];
  if (!ws) return { sheetName: '', rows: [] };

  const rows = [];
  const limit = Math.min(ws.rowCount, maxRows);
  for (let r = 1; r <= limit; r++) {
    const row = ws.getRow(r);
    const vals = [];
    let hasValue = false;
    for (let c = 1; c <= Math.min(ws.columnCount || 20, 25); c++) {
      const v = cellToString(row.getCell(c).value).trim();
      if (v !== '') hasValue = true;
      vals.push(v);
    }
    if (hasValue) rows.push(vals);
  }
  return { sheetName: ws.name, rows };
}

async function readAllWorksheets(filePath, maxRowsPerSheet = 300) {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(ROOT_DIR, filePath);
  if (!fs.existsSync(fullPath)) return [];
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(fullPath);
  const result = [];
  for (const ws of wb.worksheets) {
    const rows = [];
    const limit = Math.min(ws.rowCount, maxRowsPerSheet);
    for (let r = 1; r <= limit; r++) {
      const row = ws.getRow(r);
      const vals = [];
      let hasValue = false;
      for (let c = 1; c <= Math.min(ws.columnCount || 20, 25); c++) {
        const v = cellToString(row.getCell(c).value).trim();
        if (v !== '') hasValue = true;
        vals.push(v);
      }
      if (hasValue) rows.push(vals);
    }
    if (rows.length > 0) {
      result.push({ sheetName: ws.name, rows });
    }
  }
  return result;
}

function rowsToMarkdownTable(rows, maxCols = 10) {
  if (!rows || rows.length === 0) return '';
  // Trim trailing empty columns across all rows
  let effectiveCols = 0;
  for (const r of rows) {
    for (let c = 0; c < Math.min(r.length, maxCols); c++) {
      if (r[c] && String(r[c]).trim() !== '') {
        effectiveCols = Math.max(effectiveCols, c + 1);
      }
    }
  }
  if (effectiveCols === 0) return '';

  const header = Array.from({ length: effectiveCols }, (_, i) => cleanMdCell(rows[0][i]) || `Cột ${i + 1}`);
  const lines = [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
  ];
  for (const r of rows.slice(1)) {
    const cells = Array.from({ length: effectiveCols }, (_, i) => cleanMdCell(r[i]));
    if (cells.every((c) => !c)) continue;
    lines.push(`| ${cells.join(' | ')} |`);
  }
  return lines.join('\n');
}

function readTextSafe(relPath) {
  const full = path.join(ROOT_DIR, relPath);
  if (!fs.existsSync(full)) return '';
  return fs.readFileSync(full, 'utf8');
}

async function buildKnowledgeBase() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const generatedFiles = [];

  // =========================================================================
  // 01. TỔ CHỨC, NHÂN SỰ UPBASE & ĐÁNH GIÁ NĂNG LỰC 4P
  // =========================================================================
  console.log('Đang biên dịch 01_TO_CHUC_NHAN_SU_VA_DANH_GIA_4P.md...');
  const staffData = await readWorksheetRows('Master data/B2C_Quản lý Booking_6.2 Nhân sự Booking.xlsx', 1, 1500);
  const deptCounts = new Map();
  const branchCounts = new Map();
  const statusCounts = new Map();
  for (const r of staffData.rows.slice(1)) {
    const branch = r[7] || 'Khác';
    const status = r[8] || 'Khác';
    const dept = r[11] || r[9] || 'Chưa phân phòng';
    branchCounts.set(branch, (branchCounts.get(branch) || 0) + 1);
    statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    deptCounts.set(dept, (deptCounts.get(dept) || 0) + 1);
  }
  const sortedDepts = [...deptCounts.entries()].sort((a, b) => b[1] - a[1]);

  const sheets4P = await readAllWorksheets('4P Marketing B2C.xlsx', 200);
  const teamOrgMd = readTextSafe('Quy trình - MD/Định hướng Marketing B2C _ Cơ cấu team.md');

  const md01 = [
    `# 01. CƠ CẤU TỔ CHỨC, NHÂN SỰ UPBASE & KHUNG ĐÁNH GIÁ 4P`,
    ``,
    `> **Nguồn dữ liệu Lark:**`,
    `> - Bảng Lark Base \`6.2 Nhân sự Booking\` (${staffData.rows.length - 1} nhân sự toàn hệ thống UpBase)`,
    `> - Bảng Lark Sheet \`4P Marketing B2C.xlsx\` (${sheets4P.map((s) => s.sheetName).join(', ')})`,
    `> - Tài liệu Lark Wiki \`Định hướng Marketing B2C / Cơ cấu team\``,
    ``,
    `## 1. Tổng quan Nhân sự & Phòng ban toàn UpBase`,
    ``,
    `- **Tổng số nhân sự ghi nhận trên Lark Base (\`6.2 Nhân sự\`):** **${staffData.rows.length - 1} nhân sự**`,
    `- **Phân bổ theo chi nhánh:** ${[...branchCounts.entries()].map(([k, v]) => `${k}: ${v}`).join(' | ')}`,
    `- **Phân bổ theo hình thức hợp đồng/trạng thái:** ${[...statusCounts.entries()].map(([k, v]) => `${k}: ${v}`).join(' | ')}`,
    ``,
    `### Thống kê quy mô nhân sự theo Phòng ban / Bộ phận`,
    ``,
    `| STT | Phòng ban / Bộ phận | Số lượng nhân sự |`,
    `| --- | --- | --- |`,
    ...sortedDepts.map(([dept, count], idx) => `| ${idx + 1} | ${cleanMdCell(dept)} | ${count} |`),
    ``,
    `## 2. Cơ cấu Quản trị & Phân cấp Phòng Marketing B2C`,
    ``,
    `| Cấp bậc | Nhân sự chủ chốt | Vai trò & Trách nhiệm cốt lõi |`,
    `| --- | --- | --- |`,
    `| **Tổng Giám Đốc (CEO)** | **Đỗ Văn Giang** | Định hướng chiến lược toàn doanh nghiệp, bảo trợ nguồn lực, phê duyệt chiến lược và ký duyệt cấp cao nhất. |`,
    `| **Giám Đốc Marketing B2C** | **Đặng Thị Yến Nhi** | Phụ trách chung toàn khối Marketing B2C, quản lý trần PnL/ngân sách toàn bộ 69 gian hàng B2C, ký duyệt kế hoạch tháng và đại diện ký biên bản phối hợp. |`,
    `| **Trưởng Nhóm Booking (Leader)** | **Nguyễn Thị Ngọc Tâm** | Sơ duyệt phân rã kế hoạch và danh sách KOC cho cụm 8 gian hàng: ClubClio (TikTok/Shopee), Cindy Bloom, Mine, EUPC, L'Occitane, Bye Bye Blemish, Rejuran. |`,
    `| **Chuyên Viên Thực Thi (PIC)** | Lê Phương Thảo, Lương Thị Như Quỳnh, Lê Thanh Hải, Phạm Thị Thu Hằng, Hoàng Hải Long, Trần Hải Phượng, Phan Diệu Ánh, Vũ Hoài Lâm, Nguyễn Thị Mai Anh, Trần Thị Hảo (FOC)... | Trực tiếp lập kế hoạch phân rã, tìm kiếm & đàm phán KOC, duyệt kịch bản/demo vòng 1, theo dõi link air và lập hồ sơ nghiệm thu/thanh toán. Với gian hàng không có Leader trung gian, Chuyên viên trình duyệt trực tiếp lên Giám Đốc Marketing (**Đặng Thị Yến Nhi**). |`,
    ``,
    `## 3. Định hướng Mô hình Vận hành Đa kênh & Vai trò các Team (Lark Wiki)`,
    ``,
    teamOrgMd,
    ``,
    `## 4. Khung Năng Lực, Mô Tả Công Việc (JD) & Đánh Giá 4P Phòng Marketing B2C`,
    ``,
    ...sheets4P.map((sh) => `### Bảng: ${sh.sheetName}\n\n${rowsToMarkdownTable(sh.rows, 10)}\n`),
  ].join('\n');

  fs.writeFileSync(path.join(OUT_DIR, '01_TO_CHUC_NHAN_SU_VA_DANH_GIA_4P.md'), md01, 'utf8');
  generatedFiles.push('01_TO_CHUC_NHAN_SU_VA_DANH_GIA_4P.md');

  // =========================================================================
  // 02. QUY TRÌNH LẬP KẾ HOẠCH TỔNG THỂ DỊCH VỤ E2E & NGÂN SÁCH 4.1
  // =========================================================================
  console.log('Đang biên dịch 02_QUY_TRINH_LAP_KE_HOACH_E2E_VA_NGAN_SACH.md...');
  const e2ePlanningMd = readTextSafe(
    'Quy trình - MD/Quy trình lập kế hoạch tổng thể dịch vụ E2E (bản rút gọn) version 1.0.0.md'
  );
  const lark41SpecMd = readTextSafe('blueprint/1-requirements/1.9_DATA_SOURCE_LARK_4.1_PLAN_ORDER.md');

  const md02 = [
    `# 02. QUY TRÌNH LẬP KẾ HOẠCH TỔNG THỂ DỊCH VỤ E2E & ĐỐI SOÁT NGÂN SÁCH LARK 4.1`,
    ``,
    `> **Nguồn dữ liệu Lark:**`,
    `> - Tài liệu Lark Wiki \`Quy trình lập kế hoạch tổng thể dịch vụ E2E (bản rút gọn) version 1.0.0\``,
    `> - Bảng Lark Base \`B2C_Quản lý Booking — 4.1 Plan order tổng\` & \`4.1.1 Input plan\``,
    `> - Hệ thống 12 Template Lark Sheet & Lark Docx chiến lược E2E của UpBase`,
    ``,
    `## 1. Danh mục 12 Template & Hướng dẫn Lập kế hoạch trên Lark Cloud`,
    ``,
    `| STT | Tên tài liệu / Biểu mẫu chuẩn | Loại | Đường dẫn Lark gốc |`,
    `| --- | --- | --- | --- |`,
    `| 1 | [Template] Market Research Version 1.0.0 | Lark Sheet | https://upbasevn.sg.larksuite.com/sheets/LDyZsfF4kh5Go7tlhtMlQ2oDgag |`,
    `| 2 | [Template] Target Audience & Value Proposition Version 1.0.0 | Lark Sheet | https://upbasevn.sg.larksuite.com/sheets/Vj8TsyJWyhkanptLioclAMa0g0f?sheet=0WvOFN |`,
    `| 3 | JBP, Brand Strategy, Ecom Strategy, ECOM Guidelines | Lark Sheet | https://upbasevn.sg.larksuite.com/sheets/ISlzsdhTHhkaTutPrGSlqtHgg7g?sheet=02EFMu&302from=wiki |`,
    `| 4 | [Template] Brand Strategy Version 1.0.0 | Lark Sheet | https://upbasevn.sg.larksuite.com/sheets/FTlVsMO31hx35UtcmDMlHuLog3f |`,
    `| 5 | [Template] ECOM Strategy Implementation Guidelines Version 1.0.0 | Lark Sheet | https://upbasevn.sg.larksuite.com/sheets/YMgjsA3xOhTyhNtPotilLAo0gIK |`,
    `| 6 | [Hướng dẫn] Điền ECOM Strategy Implementation Guidelines Version 1.0.0 | Lark Docx | https://upbasevn.sg.larksuite.com/docx/LtgKdulUaoucvNx1XmNlThbVgvd |`,
    `| 7 | [Template] Joint Business Plan (JBP) Version 1.0.0 | Lark Sheet | https://upbasevn.sg.larksuite.com/sheets/SMHusSgEbh6NQxtbyxllm7G3gjg |`,
    `| 8 | [Hướng dẫn] Joint Business Plan Version 1.0.0 | Lark Docx | https://upbasevn.sg.larksuite.com/docx/VXsjd3shdoSc4lxJSvYlbvOjg7d |`,
    `| 9 | [Template] Monthly Plan Version 1.0.0 | Lark Sheet | https://upbasevn.sg.larksuite.com/sheets/KmRCsEIw1h4aJytsbZgl4347gZb |`,
    `| 10 | [Template] Content Tactics Template - Ver 1.0.0 | Lark Sheet | https://upbasevn.sg.larksuite.com/sheets/Vasys8Ll7hdH5Xt7gvqlll6ZgTs |`,
    `| 11 | [Hướng dẫn] Content Tactics Template Version 1.0.0 | Lark Docx | https://upbasevn.sg.larksuite.com/docx/YmOSdFv7zoNHpYxwau5lDerFgcc |`,
    `| 12 | [Template] Content Monthly Plan Template - Ver 1.0.0 | Lark Sheet | https://upbasevn.sg.larksuite.com/sheets/Gsr1sxmpDh8J2jtzSg9lSW4ugZc?sheet=laU0pT |`,
    ``,
    `## 2. Chi tiết Quy trình Lập kế hoạch E2E (Yearly / Quarterly / Monthly)`,
    ``,
    e2ePlanningMd,
    ``,
    `---`,
    ``,
    `## 3. Cấu trúc & Quy tắc Nghiệp vụ Bảng Lark Base 4.1 Plan Order Tổng`,
    ``,
    lark41SpecMd,
  ].join('\n');

  fs.writeFileSync(path.join(OUT_DIR, '02_QUY_TRINH_LAP_KE_HOACH_E2E_VA_NGAN_SACH.md'), md02, 'utf8');
  generatedFiles.push('02_QUY_TRINH_LAP_KE_HOACH_E2E_VA_NGAN_SACH.md');

  // =========================================================================
  // 03. QUY TRÌNH BOOKING VIDEO, LIVESTREAM AFFILIATE & BOOKING ĐA SÀN
  // =========================================================================
  console.log('Đang biên dịch 03_QUY_TRINH_BOOKING_KOC_LIVESTREAM_DA_SAN.md...');
  const bookingTechMd = readTextSafe('Quy trình Booking - Tech.md');
  const multiPlatformMd = readTextSafe('Quy trình - MD/Booking đa sàn.md');
  const toBeKocMd = readTextSafe('Quy trình - MD/Quy trinh Van hanh va Quan ly KOC B2C (To-Be).md');

  const md03 = [
    `# 03. QUY TRÌNH BOOKING VIDEO, LIVESTREAM AFFILIATE & BOOKING ĐA SÀN`,
    ``,
    `> **Nguồn dữ liệu Lark:**`,
    `> - Tài liệu Lark Wiki \`Quy trình Booking - Tech\` (66 bước Video Booking, 28 bước Live Affiliate, Pipeline 19 trạng thái & Kịch bản xử lý từ chối)`,
    `> - Tài liệu Lark Wiki \`Booking đa sàn\` (TikTok, Shopee, Lazada, Facebook, Instagram, Threads, YouTube)`,
    `> - Tài liệu \`Quy trình Vận hành và Quản lý KOC B2C (To-Be)\``,
    ``,
    `## 1. Quy trình Booking Đa Sàn (TikTok, Shopee, Lazada & Nền tảng MXH)`,
    ``,
    multiPlatformMd,
    ``,
    `---`,
    ``,
    `## 2. Quy trình Vận hành & Quản lý KOC B2C Chuẩn hóa (To-Be)`,
    ``,
    toBeKocMd,
    ``,
    `---`,
    ``,
    `## 3. Quy trình Chi tiết Booking Video, Livestream Affiliate & Kịch bản Đàm phán`,
    ``,
    bookingTechMd,
  ].join('\n');

  fs.writeFileSync(path.join(OUT_DIR, '03_QUY_TRINH_BOOKING_KOC_LIVESTREAM_DA_SAN.md'), md03, 'utf8');
  generatedFiles.push('03_QUY_TRINH_BOOKING_KOC_LIVESTREAM_DA_SAN.md');

  // =========================================================================
  // 04. CHIẾN LƯỢC CONTENT TACTICS, PILLAR CONTENT & KÊNH SELF-CHANNEL
  // =========================================================================
  console.log('Đang biên dịch 04_CHIEN_LUOC_CONTENT_TACTICS_VA_KENH_BRAND.md...');
  const contentTacticsMd = readTextSafe(
    'Knowledge - MD/unzipped/[Hướng dẫn] Content Tactics Template Version 1.0.0.md'
  );
  const selfChannelMd = readTextSafe('Quy trình - MD/Quy trình làm Content kênh.md');
  const videoTypesSheet = await readWorksheetRows('Master data/B2C_Quản lý Booking_5.3 Phân loại video.xlsx', 1, 100);
  const pillarsSheet = await readWorksheetRows('Master data/B2C_Quản lý Booking_5.5 Pillar content.xlsx', 1, 100);

  const md04 = [
    `# 04. CHIẾN LƯỢC CONTENT TACTICS, PILLAR CONTENT & VẬN HÀNH KÊNH BRAND (SELF-CHANNEL)`,
    ``,
    `> **Nguồn dữ liệu Lark:**`,
    `> - Tài liệu Lark Docx \`[Hướng dẫn] Content Tactics Template Version 1.0.0\` (\`YmOSdFv7zoNHpYxwau5lDerFgcc\`)`,
    `> - Tài liệu Lark Wiki \`Quy trình làm Content kênh\` (\`ReccwFGwIiPZdikVRJnlo2SXgbh\`)`,
    `> - Bảng Lark Base \`5.3 Phân loại video\` & \`5.5 Pillar content\``,
    ``,
    `## 1. Danh mục Chuẩn hóa Trụ cột Nội dung (5.5 Pillar Content - Lark Base)`,
    ``,
    rowsToMarkdownTable(pillarsSheet.rows, 8),
    ``,
    `## 2. Danh mục Phân loại Định dạng Video (5.3 Phân loại Video - Lark Base)`,
    ``,
    rowsToMarkdownTable(videoTypesSheet.rows, 8),
    ``,
    `---`,
    ``,
    `## 3. Hướng dẫn Sử dụng Brand Marketing Tactics Master Framework`,
    ``,
    contentTacticsMd,
    ``,
    `---`,
    ``,
    `## 4. Quy trình Vận hành Content Kênh Brand (Self-Channel) & Tư duy Sáng tạo`,
    ``,
    selfChannelMd,
  ].join('\n');

  fs.writeFileSync(path.join(OUT_DIR, '04_CHIEN_LUOC_CONTENT_TACTICS_VA_KENH_BRAND.md'), md04, 'utf8');
  generatedFiles.push('04_CHIEN_LUOC_CONTENT_TACTICS_VA_KENH_BRAND.md');

  // =========================================================================
  // 05. CẨM NANG DUYỆT KỊCH BẢN & ĐÁNH GIÁ NỘI DUNG VIDEO KOC (191 TIÊU CHÍ)
  // =========================================================================
  console.log('Đang biên dịch 05_CAM_NANG_DUYET_KICH_BAN_VA_VIDEO_KOC.md...');
  const knowledgeSheets = await readAllWorksheets('KNOWLEADGE MARKETING B2C.xlsx', 300);
  const scriptAuditRows = knowledgeSheets[0]?.rows || [];

  // Nhóm theo Bước (Cột 1)
  const stepGroups = new Map();
  for (const r of scriptAuditRows.slice(1)) {
    const stepName = r[0] || 'Khác';
    if (!stepGroups.has(stepName)) stepGroups.set(stepName, []);
    stepGroups.get(stepName).push(r);
  }

  const md05Parts = [
    `# 05. CẨM NANG DUYỆT KỊCH BẢN & KIỂM ĐỊNH CHẤT LƯỢNG NỘI DUNG VIDEO KOC`,
    ``,
    `> **Nguồn dữ liệu Lark:**`,
    `> - Bảng tri thức chuyên sâu \`KNOWLEADGE MARKETING B2C.xlsx\` (${scriptAuditRows.length - 1} quy tắc & tình huống duyệt kịch bản thực chiến)`,
    ``,
    `## Tổng quan Khung Kiểm định Kịch bản (${stepGroups.size} Chặng Duyệt)`,
    ``,
    `| STT | Chặng kiểm định kịch bản | Số lượng tình huống / Quy tắc xử lý |`,
    `| --- | --- | --- |`,
    ...[...stepGroups.entries()].map(([step, items], i) => `| ${i + 1} | **${cleanMdCell(step)}** | ${items.length} quy tắc |`),
    ``,
  ];

  for (const [stepName, items] of stepGroups.entries()) {
    md05Parts.push(`\n## ${stepName}\n`);
    md05Parts.push(
      `| Nhóm kiến thức | Tiêu chí / Cụm | Trường hợp xảy ra | Câu hỏi kiểm tra (Góc nhìn duyệt kịch bản) | Hành động & Quy tắc xử lý |`
    );
    md05Parts.push(`| --- | --- | --- | --- | --- |`);
    for (const item of items) {
      md05Parts.push(
        `| ${cleanMdCell(item[1])} | ${cleanMdCell(item[2])} | ${cleanMdCell(item[3])} | ${cleanMdCell(item[4])} | ${cleanMdCell(item[5])} |`
      );
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, '05_CAM_NANG_DUYET_KICH_BAN_VA_VIDEO_KOC.md'), md05Parts.join('\n'), 'utf8');
  generatedFiles.push('05_CAM_NANG_DUYET_KICH_BAN_VA_VIDEO_KOC.md');

  // =========================================================================
  // 06. SLA CAM KẾT, QUY TRÌNH HỢP ĐỒNG BOOKING, PHÁP CHẾ & KẾ TOÁN
  // =========================================================================
  console.log('Đang biên dịch 06_SLA_HOP_DONG_PHAP_CHE_VA_KE_TOAN.md...');
  const slaMd = readTextSafe('Quy trình - MD/Các SLA B2C.md');
  const contractMd = readTextSafe('Quy trình - MD/Quy trình Quản lý hợp đồng Booking.md');
  const contractClassSheets = await readAllWorksheets('Quy trình - MD/Phân loại Hợp đồng Booking.xlsx', 150);

  const md06 = [
    `# 06. CÁC MỐC SLA B2C, QUY TRÌNH QUẢN LÝ HỢP ĐỒNG BOOKING, THUẾ & KẾ TOÁN`,
    ``,
    `> **Nguồn dữ liệu Lark:**`,
    `> - Tài liệu Lark Wiki \`Các SLA B2C\``,
    `> - Tài liệu Lark Wiki \`Quy trình Quản lý hợp đồng Booking\``,
    `> - Bảng \`Phân loại Hợp đồng Booking.xlsx\` & Bộ 8 biểu mẫu Hợp đồng/BBNT Ver052026`,
    ``,
    `## 1. Quy định về các mốc SLA Vận hành & Thanh toán B2C`,
    ``,
    slaMd,
    ``,
    `---`,
    ``,
    `## 2. Quy trình Quản lý Hợp đồng Booking & Ký số`,
    ``,
    contractMd,
    ``,
    `---`,
    ``,
    `## 3. Ma trận Phân loại Hợp đồng Booking & Biểu mẫu Pháp chế`,
    ``,
    ...contractClassSheets.map((sh) => `### Sheet: ${sh.sheetName}\n\n${rowsToMarkdownTable(sh.rows, 10)}\n`),
    ``,
    `### Danh mục 8 Biểu mẫu Hợp đồng & Biên bản Nghiệm thu chuẩn (Ver052026)`,
    ``,
    `| Mã biểu mẫu | Tên file chuẩn trong kho Pháp chế | Đối tượng áp dụng | Quy định Thuế & Chứng từ |`,
    `| --- | --- | --- | --- |`,
    `| \`BM.HĐ.VID.IND\` | \`1.1.1. BM.HĐ.VID.IND.Ver052026 booking Video.docx\` | Cá nhân KOC/KOL | Khấu trừ 10% thuế TNCN tại nguồn (từ 2.000.000đ trở lên). Bắt buộc HĐ khi giá trị > 9.000.000đ (chưa thuế). |`,
    `| \`BM.BBNT.VID.IND\` | \`1.1.2. BM.BBNT.VID.IND.Ver052026 booking Video.docx\` | Cá nhân KOC/KOL | Biên bản nghiệm thu cá nhân (bắt buộc với khoản chi > 20.000.000đ, không cần xuất hóa đơn). |`,
    `| \`BM.HĐ.VID.HKD\` | \`2.1.1. BM.HĐ.VID.HKD.Ver052026 booking Video.docx\` | Hộ kinh doanh (HKD) | Thuế HKD 7% (5% GTGT + 2% TNCN), bắt buộc có Giấy ĐKKD HKD và Hóa đơn bán hàng từ cơ quan thuế. |`,
    `| \`BM.BBNT.VID.HKD\` | \`2.1.2. BM.BBNT.VID.HKD.Ver052026 booking Video.docx\` | Hộ kinh doanh (HKD) | Ngày ký BBNT phải trùng khớp với ngày xuất hóa đơn. |`,
    `| \`BM.HĐ.VID.COM\` | \`3.1.1. BM.HĐ.VID.COM.Ver052026 booking video.docx\` | Công ty / MCN / Agency | Xuất Hóa đơn GTGT (VAT 8% hoặc 10% tùy ngành hàng/thời điểm). |`,
    `| \`BM.BBNT.VID.COM\` | \`3.1.2. BM.BBNT.VID.COM.Ver052026 boooking video.docx\` | Công ty / MCN / Agency | Biên bản nghiệm thu 2 bên ký số trước khi xuất hóa đơn chính thức. |`,
    `| \`BM.HĐVID.CTV\` | \`4.1. BM.HĐVID.CTV.Ver052026 Upbase HĐNT booking CTV Video tháng.docx\` | Cộng tác viên / VJ kênh | Hợp đồng nguyên tắc theo tháng cho CTV/VJ sản xuất video kênh Brand. |`,
    `| \`BM.BBNTVID.CTV\` | \`4.2. BM.BBNTVID.CTV.Ver052026 Upbase BBNT booking Video tháng.docx\` | Cộng tác viên / VJ kênh | Chốt tổng số lượng video nghiệm thu cuối tháng để thanh toán gộp. |`,
  ].join('\n');

  fs.writeFileSync(path.join(OUT_DIR, '06_SLA_HOP_DONG_PHAP_CHE_VA_KE_TOAN.md'), md06, 'utf8');
  generatedFiles.push('06_SLA_HOP_DONG_PHAP_CHE_VA_KE_TOAN.md');

  // =========================================================================
  // 07. DANH MỤC GIAN HÀNG (5.1 STORES), KHUNG LƯƠNG KOC (5.6) & TỆP KOC (5.4)
  // =========================================================================
  console.log('Đang biên dịch 07_DANH_MUC_GIAN_HANG_BRAND_VA_KHUNG_LUONG_KOC.md...');
  const storesSheet = await readWorksheetRows('Master data/B2C_Quản lý Booking_5.1 Stores.xlsx', 1, 400);
  const castTierSheet = await readWorksheetRows('Master data/B2C_Quản lý Booking_5.6 Tệp cast.xlsx', 1, 50);
  const kocSegmentSheet = await readWorksheetRows('Master data/B2C_Quản lý Booking_5.4 Tệp KOCs.xlsx', 1, 100);
  const brandFilesSheet = await readWorksheetRows('B2C_Quản lý Booking_3.5 Danh sách file brand.xlsx', 1, 200);

  const md07 = [
    `# 07. DANH MỤC GIAN HÀNG, THƯƠNG HIỆU UPBASE & KHUNG LƯƠNG KOC (KL1–KL7)`,
    ``,
    `> **Nguồn dữ liệu Lark:**`,
    `> - Bảng Lark Base \`5.1 Stores\` (${storesSheet.rows.length - 1} gian hàng toàn hệ thống)`,
    `> - Bảng Lark Base \`5.6 Tệp cast\` (Phân bậc khung lương KL1–KL7 & TAP)`,
    `> - Bảng Lark Base \`5.4 Tệp KOCs\` (Phân nhóm chân dung Creator)`,
    `> - Bảng Lark Base \`3.5 Danh sách file brand\``,
    ``,
    `## 1. Bảng Phân bậc Khung Lương KOC (\`5.6 Tệp cast\`)`,
    ``,
    rowsToMarkdownTable(castTierSheet.rows, 8),
    ``,
    `## 2. Phân nhóm Tệp KOC / Creator (\`5.4 Tệp KOCs\`)`,
    ``,
    rowsToMarkdownTable(kocSegmentSheet.rows, 8),
    ``,
    `## 3. Danh sách File Làm Việc Theo Nhãn Hàng (\`3.5 Danh sách file brand\`)`,
    ``,
    rowsToMarkdownTable(brandFilesSheet.rows, 8),
    ``,
    `## 4. Danh mục Gian hàng & Thương hiệu trên Lark Base (\`5.1 Stores\` - ${storesSheet.rows.length - 1} bản ghi)`,
    ``,
    rowsToMarkdownTable(storesSheet.rows, 10),
  ].join('\n');

  fs.writeFileSync(path.join(OUT_DIR, '07_DANH_MUC_GIAN_HANG_BRAND_VA_KHUNG_LUONG_KOC.md'), md07, 'utf8');
  generatedFiles.push('07_DANH_MUC_GIAN_HANG_BRAND_VA_KHUNG_LUONG_KOC.md');

  // =========================================================================
  // 08. QUY TRÌNH PHỐI HỢP CHUYỂN ĐỔI SỐ (DX - DATA - NGHIỆP VỤ) & TÍCH HỢP LARK API
  // =========================================================================
  console.log('Đang biên dịch 08_QUY_TRINH_PHOI_HOP_DX_DATA_VA_TICH_HOP_LARK.md...');
  const portfolioMd = readTextSafe('Quy trình - MD/Portfolio đề xuất AI - MARKETING B2C.md');
  const projectSheets = await readAllWorksheets('Dự án B2C.xlsx', 100);
  const painPointSheets = await readAllWorksheets('Pain point Marketing B2C.xlsx', 100);

  const md08 = [
    `# 08. QUY TRÌNH PHỐI HỢP DỰ ÁN CHUYỂN ĐỔI SỐ UPBASE & TÍCH HỢP API LARK BASE`,
    ``,
    `> **Nguồn dữ liệu Lark:**`,
    `> - Tài liệu \`[UpAI] Quy trình làm việc phối hợp.pdf\` (Ban hành 15/10/2026 — 6 giai đoạn, 5 cổng duyệt G0–G4, quy trình Change Request CR-01..CR-09 & 12 dự án chuyển đổi số)`,
    `> - Tài liệu \`Tài liệu hướng dẫn Tích hợp API Lark Base.pdf\` (\`app_token: FvINwwSnJi53UekXC3Mj5E88piQ\`)`,
    `> - Bảng \`Dự án B2C.xlsx\` & \`Pain point Marketing B2C.xlsx\``,
    ``,
    `## 1. Khung Chuẩn Vận Hành Dự Án Chuyển Đổi Số UpBase (6 Giai Đoạn - 5 Cổng Duyệt)`,
    ``,
    `| Giai đoạn | Mục đích | Cổng kiểm soát cuối giai đoạn | Kết quả phê duyệt của PM |`,
    `| --- | --- | --- | --- |`,
    `| **1. Lên kế hoạch** | Nắm nhu cầu và hiện trạng, chốt mục tiêu và bộ KPI, lấy số liệu baseline | **G0 · Đáng làm?** (Có KPI, baseline, giá trị rõ, có plan và nhân sự) | Đạt / Sửa / Dừng |`,
    `| **2. Đánh giá & Chuẩn hóa** | Rà soát & chuẩn hóa quy trình SOP, chuẩn hóa nguồn dữ liệu, dựng prototype và ước chi phí | **G1 · Khả thi?** (Quy trình đã chuẩn, dữ liệu sẵn sàng, chi phí trong ngân sách) | Đạt / Sửa / Dừng |`,
    `| **3. Xây dựng** | Thiết kế luồng giải pháp, phát triển hệ thống bằng code, tích hợp dữ liệu production, kiểm thử UAT | **G2 · Sẵn sàng chạy thử?** (UAT đạt; đã chốt phạm vi, thời gian và ngưỡng đánh giá) | Đạt / Sửa / Dừng |`,
    `| **4. Thử nghiệm** | Chạy thử ở phạm vi giới hạn (1 nhóm, 1 store hoặc 1 kho), sửa lỗi, đánh giá theo ngưỡng đã chốt ở G2 | **G3 · Go-live, sửa hay dừng?** (Không đổi ngưỡng sau khi đã thấy số; hạn chế vòng lặp sửa) | Đạt / Sửa / Dừng |`,
    `| **5. Bàn giao** | Go-live, hoàn thành tài liệu ban hành, kiểm thử số liệu và bàn giao cho PIC phòng ban | **G4 · Bàn giao được chưa?** (KPI giữ được sau 2–4 tuần, chi phí ổn định, có người vận hành) | Đạt / Sửa / Dừng |`,
    `| **6. Vận hành / Tối ưu** | Theo dõi chất lượng & KPI định kỳ, xử lý lỗi trong phạm vi (6.4) hoặc mở Change Request (6.5) | Không có cổng; PM review định kỳ 1–2 tuần: Giữ, Nâng cấp hay Ngừng | — |`,
    ``,
    `### Phân vai Trách nhiệm trong Dự án`,
    `- **PM:** Chốt kế hoạch, điều phối nhân sự giữa các dự án, phê duyệt tại 5 cổng (G0–G4), kiểm soát Change Request (CR log).`,
    `- **DX (Business Analyst):** Khảo sát hiện trạng phòng ban, chuẩn hóa SOP, viết đặc tả yêu cầu giải pháp, dẫn dắt UAT và bàn giao.`,
    `- **Kỹ thuật / Tự động hóa:** Tiếp nhận đặc tả từ DX, xây dựng hệ thống phần mềm, kết nối dữ liệu và luồng xử lý.`,
    `- **Data:** Nhận việc qua thẻ *Data request* (ghi rõ dữ liệu cần, nơi nhận, hạn cần); truy hồi, làm sạch và nối dữ liệu vào hệ thống.`,
    `- **Nghiệp vụ (PIC phòng ban):** Cung cấp nhu cầu, xác nhận bộ KPI, tham gia UAT (CR-07) và nhận bàn giao vận hành.`,
    ``,
    `### Quy trình Kiểm soát Thay đổi (Change Request: CR-01 → CR-09)`,
    `- **Khi nào kích hoạt CR:** Mọi thay đổi phát sinh từ sau cổng G1 (Giai đoạn 3–5) hoặc yêu cầu ngoài phạm vi sau Go-live (Bước 6.5) làm ảnh hưởng tới phạm vi, giải pháp, KPI, tiêu chí nghiệm thu hoặc timeline.`,
    `- **Phân cấp phê duyệt tại cổng \`CR-G\`:**`,
    `  - **Case A (PM duyệt):** Không lùi mốc cổng/go-live, đủ nhân sự nội tại, tự xây dựng được, chi phí nằm trong ngân sách đã duyệt, DX và Nghiệp vụ thống nhất.`,
    `  - **Case B (Trình Lead duyệt):** Lùi mốc cổng hoặc go-live, cần thêm người từ dự án khác, phải giao Tech/thuê ngoài, vượt ngân sách hoặc có tranh chấp phạm vi.`,
    ``,
    `## 2. Danh mục 12 Dự án Chuyển đổi số & Vận hành toàn UpBase`,
    ``,
    `| Mã dự án | Tên dự án | Nhóm | Đầu mối (PIC / DX) | Ghi chú triển khai & Phụ thuộc |`,
    `| --- | --- | --- | --- | --- |`,
    `| **P01** | Growth Report & Analytics | Chuyển đổi số | Nằm trong \`Ops4\` (DX: Kha) | Tự động hóa báo cáo và phân tích chỉ số tăng trưởng. |`,
    `| **P02** | Fulfillment & Điều phối đóng gói | Chuyển đổi số | PIC: Nguyễn Trọng Nghĩa (Owner kho: Mạc Sơn Trường) | Liên quan 3 bài toán kho: SLA Risk & Capacity Alert, Workforce Planning, Daily Warehouse Control Tower. |`,
    `| **P03** | Creator Matching | Chuyển đổi số | Nằm trong \`Ops1\` (DX: Kha) | Đề xuất & chấm điểm mức độ phù hợp của KOC/Creator theo gian hàng. |`,
    `| **P04** | Content Copilot | Chuyển đổi số | PIC: Đặng Thị Yến Nhi | Mục tiêu giảm 50% khối lượng công việc xây dựng kịch bản & kiểm duyệt nội dung; phụ thuộc guideline thương hiệu tại \`UAI02\`. |`,
    `| **P05** | Livestream Operations | Chuyển đổi số | Nằm trong \`Ops2\` (DX: Mai) | Hỗ trợ vận hành kịch bản, lịch phát sóng và đối soát phiên live. |`,
    `| **P06** | Livestream | Chuyển đổi số | Độc lập | Phụ thuộc dữ liệu vận hành livestream từ \`Ops2\`. |`,
    `| **Ops1** | MCN – Quản lý mạng lưới Creator Affiliate | Hệ thống Vận hành | DX: Kha | Quản trị mạng lưới KOC/Creator, theo dõi 9 KPI định lượng. |`,
    `| **Ops2** | Livestream – Quản lý Host & Live | Hệ thống Vận hành | DX: Mai | Quản lý lịch Host, ca live và 9 KPI định lượng. |`,
    `| **Ops3** | UpBase HRM | Hệ thống Vận hành | DX: Mai | Quản trị nhân sự nội bộ, theo dõi 5 KPI định lượng. |`,
    `| **Ops4** | Growth OS | Hệ thống Vận hành | DX: Kha | Hệ điều hành tăng trưởng gian hàng, theo dõi 8 KPI định lượng. |`,
    `| **UAI01** | Nền tảng Kết nối Dữ liệu dùng chung | Nền tảng | PIC: Đặng Tố Hải | Dùng chung cho mọi dự án để kết nối dữ liệu, phân quyền truy cập và theo dõi chi phí API. |`,
    `| **UAI02** | UpBase KnowledgeBase | Nền tảng | PIC: Đặng Tố Hải | Kho tri thức tập trung lưu trữ SOP, Brand Guideline, lịch sử chiến dịch và quy chuẩn nghiệp vụ toàn UpBase. |`,
    ``,
    `## 3. Đặc tả Kỹ thuật Tích hợp API Lark Base Doanh thu & Ngành hàng`,
    ``,
    `- **Endpoint Xác thực Nội bộ:** \`POST https://open.larksuite.com/open-apis/auth/v3/app_access_token/internal\``,
    `- **Lark Base App Token Doanh thu & Danh mục:** \`FvINwwSnJi53UekXC3Mj5E88piQ\``,
    `  - Bảng **Doanh thu theo Nhân sự theo ngày:** \`tblOYj3Sc0jP0GtK\` (Các trường: \`Ngày phát sinh doanh thu\`, \`Mã nhân viên\`, \`Số lượng sản phẩm bán ra\`, \`Doanh thu trước thuế\`, \`Thuế bán hàng\`, \`Tổng doanh số\`, \`Hàng bán bị trả lại\`, \`Thuế hàng bán bị trả lại\`, \`Tổng doanh số thuần\`, \`Mã cửa hàng\`)`,
    `  - Bảng **Doanh thu theo Ngành hàng theo ngày:** \`tblbuLygaQVrO0PG\` (Các trường: \`Ngày phát sinh doanh thu\`, \`Mã ngành\`, \`Số lượng sản phẩm bán ra\`, \`Doanh thu trước thuế\`, \`Thuế bán hàng\`, \`Tổng doanh số\`, \`Hàng bán bị trả lại\`, \`Thuế hàng bán bị trả lại\`, \`Tổng doanh số thuần\`)`,
    `  - Bảng **01. Chủng loại:** \`tblxgd9P5ejFbxn4\` (\`Loại nhóm\` = 1, \`Mã nhóm\`, \`Tên nhóm\`)`,
    `  - Bảng **02. Hãng sản xuất:** \`tbl4jlJ9sKohwoYx\` (\`Loại nhóm\` = 2, \`Mã nhóm\`, \`Tên nhóm\`)`,
    `  - Bảng **05. Chi tiết ngành hàng:** \`tbloSrvHb9znlwkB\` (\`Mã ngành\`, \`Tên ngành\`, \`Mã nhân viên\`)`,
    ``,
    `## 4. Tổng hợp Hiện trạng, Vấn đề Cốt lõi (Pain Points) & Lộ trình Dự án B2C`,
    ``,
    ...projectSheets.map((sh) => `### Dự án B2C — Sheet: ${sh.sheetName}\n\n${rowsToMarkdownTable(sh.rows, 10)}\n`),
    ...painPointSheets.map((sh) => `### Pain Points B2C — Sheet: ${sh.sheetName}\n\n${rowsToMarkdownTable(sh.rows, 10)}\n`),
    ``,
    portfolioMd,
  ].join('\n');

  fs.writeFileSync(path.join(OUT_DIR, '08_QUY_TRINH_PHOI_HOP_DX_DATA_VA_TICH_HOP_LARK.md'), md08, 'utf8');
  generatedFiles.push('08_QUY_TRINH_PHOI_HOP_DX_DATA_VA_TICH_HOP_LARK.md');

  // =========================================================================
  // 00. CHỈ MỤC TỔNG HỢP TRI THỨC UPBASE (MASTER INDEX)
  // =========================================================================
  console.log('Đang biên dịch 00_UPBASE_KNOWLEDGE_INDEX.md...');
  const md00 = [
    `# KHO TRI THỨC TẬP TRUNG UPBASE (UPBASE KNOWLEDGE BASE)`,
    ``,
    `| Thuộc tính | Giá trị |`,
    `| --- | --- |`,
    `| Mã kho tri thức | \`UAI02 — UpBase KnowledgeBase\` |`,
    `| Nguồn tổng hợp | Toàn bộ Lark Base, Lark Wiki, Lark Docx, Lark Sheets & Biểu mẫu Pháp chế UpBase |`,
    `| Ngày cập nhật | 22/10/2026 |`,
    `| Số lượng phân hệ | **8 chuyên đề Markdown chuẩn hóa** |`,
    ``,
    `---`,
    ``,
    `## 1. Danh mục 8 Chuyên đề Tri thức UpBase`,
    ``,
    `| Mã | Tệp tài liệu | Nội dung cốt lõi | Nguồn Lark gốc |`,
    `| --- | --- | --- | --- |`,
    `| **01** | [01_TO_CHUC_NHAN_SU_VA_DANH_GIA_4P.md](./01_TO_CHUC_NHAN_SU_VA_DANH_GIA_4P.md) | Cơ cấu tổ chức toàn UpBase (**${staffData.rows.length - 1} nhân sự**), phân cấp phòng Marketing B2C, mô hình Brand/Content/Booking/Livestream, khung năng lực JD L1–L5 & đánh giá 4P/P3 | Base \`6.2 Nhân sự Booking\`, Sheet \`4P Marketing B2C\`, Wiki \`Cơ cấu team\` |`,
    `| **02** | [02_QUY_TRINH_LAP_KE_HOACH_E2E_VA_NGAN_SACH.md](./02_QUY_TRINH_LAP_KE_HOACH_E2E_VA_NGAN_SACH.md) | Quy trình lập kế hoạch Yearly / Quarterly / Monthly dịch vụ E2E, ma trận RACI 7 bộ phận, 12 template Lark chuẩn, quy tắc đối soát Lark Base \`4.1 Plan order tổng\` (Gross/Net, Paid/FOC) | Wiki \`Quy trình E2E v1.0.0\`, Base \`4.1 Plan order tổng\`, \`4.1.1 Input plan\` |`,
    `| **03** | [03_QUY_TRINH_BOOKING_KOC_LIVESTREAM_DA_SAN.md](./03_QUY_TRINH_BOOKING_KOC_LIVESTREAM_DA_SAN.md) | Quy trình 66 bước Video Booking, 28 bước Livestream Affiliate, Booking đa sàn (TikTok, Shopee, Lazada, FB, IG, Threads, YouTube), 19 trạng thái Pipeline & kịch bản đàm phán KOC/Brand | Wiki \`Quy trình Booking - Tech\`, Wiki \`Booking đa sàn\`, \`To-Be KOC Flow\` |`,
    `| **04** | [04_CHIEN_LUOC_CONTENT_TACTICS_VA_KENH_BRAND.md](./04_CHIEN_LUOC_CONTENT_TACTICS_VA_KENH_BRAND.md) | Brand Marketing Tactics Master Framework (Brand Guideline → Funnel → Big Idea → Key Message → Key Visual), quy trình 12 bước làm Content kênh Self-channel, 15 Pillar Content & 14 Định dạng Video | Docx \`Content Tactics v1.0.0\`, Wiki \`Quy trình Content kênh\`, Base \`5.3\`, \`5.5\` |`,
    `| **05** | [05_CAM_NANG_DUYET_KICH_BAN_VA_VIDEO_KOC.md](./05_CAM_NANG_DUYET_KICH_BAN_VA_VIDEO_KOC.md) | **${scriptAuditRows.length - 1} quy tắc & tình huống kiểm duyệt kịch bản KOC** theo từng bước: Mục tiêu & Funnel (Awareness/Consideration/Conversion), Duyệt Hook 3–5 giây, Duyệt Thân bài & Insight, Duyệt CTA & Pháp lý | Sheet \`KNOWLEADGE MARKETING B2C.xlsx\` |`,
    `| **06** | [06_SLA_HOP_DONG_PHAP_CHE_VA_KE_TOAN.md](./06_SLA_HOP_DONG_PHAP_CHE_VA_KE_TOAN.md) | Các mốc SLA Affiliate (10-20-30), SLA Self-channel (15-25-05), SLA gửi hàng 48h, quy trình quản lý hợp đồng, 8 biểu mẫu Hợp đồng/BBNT (\`IND\`, \`HKD\`, \`COM\`, \`CTV\`), thuế & khóa sổ kế toán | Wiki \`Các SLA B2C\`, Wiki \`Quản lý hợp đồng\`, \`Phân loại HĐ Booking\` |`,
    `| **07** | [07_DANH_MUC_GIAN_HANG_BRAND_VA_KHUNG_LUONG_KOC.md](./07_DANH_MUC_GIAN_HANG_BRAND_VA_KHUNG_LUONG_KOC.md) | Danh mục **${storesSheet.rows.length - 1} gian hàng** trên Lark Base (\`5.1 Stores\`), khung lương KOC 9 bậc (\`5.6 Tệp cast\` KL1–KL7 & TAP), phân nhóm Creator (\`5.4 Tệp KOCs\`) & danh sách file nhãn hàng (\`3.5\`) | Base \`5.1 Stores\`, \`5.4 Tệp KOCs\`, \`5.6 Tệp cast\`, \`3.5 File brand\` |`,
    `| **08** | [08_QUY_TRINH_PHOI_HOP_DX_DATA_VA_TICH_HOP_LARK.md](./08_QUY_TRINH_PHOI_HOP_DX_DATA_VA_TICH_HOP_LARK.md) | Quy trình làm việc phối hợp 6 giai đoạn & 5 cổng duyệt (G0–G4), quy trình Change Request (CR-01..CR-09), danh mục 12 dự án (\`P01\`–\`P06\`, \`Ops1\`–\`Ops4\`, \`UAI01\`–\`UAI02\`) & đặc tả API Lark Base | Doc \`[UpAI] Quy trình phối hợp\`, \`Hướng dẫn API Lark Base\`, \`Dự án B2C\` |`,
    ``,
    `---`,
    ``,
    `## 2. Bản đồ 24 Tài nguyên Lark Cloud (\`upbasevn.sg.larksuite.com\`)`,
    ``,
    `Công cụ đồng bộ trực tiếp [\`scripts/crawl-lark-knowledge.mjs\`](../../scripts/crawl-lark-knowledge.mjs) đã được cấu hình sẵn để đọc tự động danh sách 24 tài nguyên Lark Cloud dưới đây khi App \`cli_aa45bfd4edf85f05\` được cấp quyền \`readonly\`:`,
    ``,
    `| Phân loại | Tên / Mã định danh tài nguyên | URL trên Lark Cloud |`,
    `| --- | --- | --- |`,
    `| **Lark Drive Folder** | Thư mục lưu trữ tài liệu chung | \`https://upbasevn.sg.larksuite.com/drive/folder/G4fUfZs69ljWhHdFlz9lH1nTgyd\` |`,
    `| **Lark Wiki** | Tiêu chuẩn xây dựng Brief Team Marketing B2C | \`https://upbasevn.sg.larksuite.com/wiki/MWDawxMC6icJ6qkxpS5llQ5lgP8\` |`,
    `| **Lark Wiki** | Quy trình hợp tác KOL / KOC | \`https://upbasevn.sg.larksuite.com/wiki/K8olwuIBCiur2bkNFmzlGqjTgdb\` |`,
    `| **Lark Wiki** | Quy trình làm Content kênh Self-channel | \`https://upbasevn.sg.larksuite.com/wiki/ReccwFGwIiPZdikVRJnlo2SXgbh\` |`,
    `| **Lark Wiki** | Tài liệu đào tạo: Xây dựng Hook giữ chân người xem trên TikTok | \`https://upbasevn.sg.larksuite.com/wiki/VYLPwxMNti41qEkm04olgcqugse\` |`,
    `| **Lark Wiki** | Outline Self Channel Service Catalog | \`https://upbasevn.sg.larksuite.com/wiki/B0M4wXywNiUEkckZNSFlDqFqgRg\` |`,
    `| **Lark Wiki** | Quy trình & Hướng dẫn vận hành nội bộ (\`HoE1w7...\`) | \`https://upbasevn.sg.larksuite.com/wiki/HoE1w7nvciiXFzkClP5lh8ysgvc\` |`,
    `| **Lark Wiki (Base)** | Wiki Bitable Quản lý dữ liệu (\`F9oWwA...\`) | \`https://upbasevn.sg.larksuite.com/wiki/F9oWwAwQdifE0Ak59oclhjjWgKc\` |`,
    `| **Lark Wiki (Sheet)** | Wiki Bảng tính mẫu (\`VcsNwn...\`) | \`https://upbasevn.sg.larksuite.com/wiki/VcsNwnovaiRWNYk6Sjrl102VgOf?sheet=3VVzjc\` |`,
    `| **Lark Docx** | Hướng dẫn điền ECOM Strategy Implementation Guidelines v1.0.0 | \`https://upbasevn.sg.larksuite.com/docx/LtgKdulUaoucvNx1XmNlThbVgvd\` |`,
    `| **Lark Docx** | Hướng dẫn Joint Business Plan (JBP) v1.0.0 | \`https://upbasevn.sg.larksuite.com/docx/VXsjd3shdoSc4lxJSvYlbvOjg7d\` |`,
    `| **Lark Docx** | Hướng dẫn Content Tactics Template v1.0.0 | \`https://upbasevn.sg.larksuite.com/docx/YmOSdFv7zoNHpYxwau5lDerFgcc\` |`,
    `| **Lark Sheet** | Template Market Research v1.0.0 | \`https://upbasevn.sg.larksuite.com/sheets/LDyZsfF4kh5Go7tlhtMlQ2oDgag\` |`,
    `| **Lark Sheet** | Template Target Audience & Value Proposition v1.0.0 | \`https://upbasevn.sg.larksuite.com/sheets/Vj8TsyJWyhkanptLioclAMa0g0f?sheet=0WvOFN\` |`,
    `| **Lark Sheet** | JBP, Brand Strategy, Ecom Strategy, ECOM Guidelines | \`https://upbasevn.sg.larksuite.com/sheets/ISlzsdhTHhkaTutPrGSlqtHgg7g?sheet=02EFMu\` |`,
    `| **Lark Sheet** | Template Brand Strategy v1.0.0 | \`https://upbasevn.sg.larksuite.com/sheets/FTlVsMO31hx35UtcmDMlHuLog3f\` |`,
    `| **Lark Sheet** | Template ECOM Strategy Implementation Guidelines v1.0.0 | \`https://upbasevn.sg.larksuite.com/sheets/YMgjsA3xOhTyhNtPotilLAo0gIK\` |`,
    `| **Lark Sheet** | Template Joint Business Plan v1.0.0 | \`https://upbasevn.sg.larksuite.com/sheets/SMHusSgEbh6NQxtbyxllm7G3gjg\` |`,
    `| **Lark Sheet** | Template Monthly Plan v1.0.0 | \`https://upbasevn.sg.larksuite.com/sheets/KmRCsEIw1h4aJytsbZgl4347gZb\` |`,
    `| **Lark Sheet** | Template Content Tactics v1.0.0 | \`https://upbasevn.sg.larksuite.com/sheets/Vasys8Ll7hdH5Xt7gvqlll6ZgTs\` |`,
    `| **Lark Sheet** | Template Content Monthly Plan v1.0.0 | \`https://upbasevn.sg.larksuite.com/sheets/Gsr1sxmpDh8J2jtzSg9lSW4ugZc?sheet=laU0pT\` |`,
    `| **Lark Sheet** | Bảng dữ liệu vận hành (\`E4cIsx...\`) | \`https://upbasevn.sg.larksuite.com/sheets/E4cIsxFeBhjO07to8rQlb9xjgrb?sheet=dhDZ7d\` |`,
    `| **Lark Sheet** | Bảng dữ liệu vận hành (\`Qr7mso...\`) | \`https://upbasevn.sg.larksuite.com/sheets/Qr7msoNoDhL5hktJcV2l7htrgfd?sheet=JX9m5C\` |`,
    `| **Lark Base** | Base Doanh thu & Danh mục ngành hàng | \`FvINwwSnJi53UekXC3Mj5E88piQ\` (\`tblOYj3Sc0jP0GtK\`, \`tblbuLygaQVrO0PG\`, \`tblxgd9P5ejFbxn4\`, \`tbl4jlJ9sKohwoYx\`, \`tbloSrvHb9znlwkB\`) |`,
  ].join('\n');

  fs.writeFileSync(path.join(OUT_DIR, '00_UPBASE_KNOWLEDGE_INDEX.md'), md00, 'utf8');
  generatedFiles.unshift('00_UPBASE_KNOWLEDGE_INDEX.md');

  console.log('\nHoàn tất tạo Bộ Knowledge UpBase tại:', OUT_DIR);
  for (const f of generatedFiles) {
    const stat = fs.statSync(path.join(OUT_DIR, f));
    console.log(` - ${f} (${(stat.size / 1024).toFixed(1)} KB)`);
  }
}

buildKnowledgeBase().catch((err) => {
  console.error('Lỗi khi tạo Knowledge Base:', err);
  process.exit(1);
});
