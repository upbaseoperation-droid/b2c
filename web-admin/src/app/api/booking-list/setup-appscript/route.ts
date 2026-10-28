import { NextRequest, NextResponse } from 'next/server';
import { parseSpreadsheetId } from '@/lib/server/googleSheets';
import { readRecord, upsertRecord } from '@/lib/server/sharedRecords';
import { assertStoreBookingAccess } from '@/lib/server/monthlyPlanStore';
import { isStaffGlobalAdminOrManager } from '@/lib/rbacScope';
import { getPlanActor, handlePlanError, unauthorized } from '../../monthly-plans/_shared';

const forbidden = (error: string) => NextResponse.json({ ok: false, code: 'FORBIDDEN', error }, { status: 403 });

export const dynamic = 'force-dynamic';

const OAUTH_CONFIG_RECORD_KEY = 'google-appscript-oauth-config-v1';
const INSTALLED_MAP_RECORD_KEY = 'google-appscript-installed-map-v1';

export interface AppsScriptModuleItem {
  id: string;
  name: string;
  triggerType: 'onEdit' | 'onOpen';
  targetColumns: string;
  purpose: string;
  enabled: boolean;
  codeBody: string;
  isBuiltIn?: boolean;
}

export interface StoreAppsScriptMatrixConfig {
  applyAppsScript: boolean;
  enabledModuleIds: string[];
}

export interface StoredAppsScriptOAuthConfig {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  modules?: AppsScriptModuleItem[];
  storeMatrix?: Record<string, StoreAppsScriptMatrixConfig>;
  customScriptCode?: string;
  useCustomRawCode?: boolean;
  updatedAt?: string;
}

export interface InstalledScriptMeta {
  spreadsheetId: string;
  scriptId: string;
  storeName?: string;
  sheetUrl?: string;
  enabledModuleIds?: string[];
  installedAt: string;
}

const DEFAULT_APPS_SCRIPT_MODULES: AppsScriptModuleItem[] = [
  {
    id: 'AUTO_BRAND_TIMESTAMP',
    name: 'Tự động ghi Thời gian Brand duyệt (SLA 48h)',
    triggerType: 'onEdit',
    targetColumns: 'Brand chọn → TG Brand duyệt',
    purpose:
      'Khi Brand chọn Yes / No / Cân nhắc tại cột "Brand chọn", tự động ghi ngày giờ thực tế (dd/MM/yyyy HH:mm - GMT+7) vào cột "TG Brand duyệt" để đo SLA.',
    enabled: true,
    isBuiltIn: true,
    codeBody: `function runModule_AUTO_BRAND_TIMESTAMP(ctx) {
  if (ctx.brandColIdx === -1 || ctx.col !== ctx.brandColIdx) return;
  var timeColIdx = ctx.findCol(['tg brand duyệt', 'thời gian brand duyệt', 'ngày brand duyệt', 'ngay brand duyet']);
  if (timeColIdx === -1) {
    timeColIdx = ctx.lastCol + 1;
    ctx.sheet.getRange(ctx.headerRowIndex, timeColIdx).setValue('TG Brand duyệt');
  }
  var rawVal = ctx.rawValLower;
  var isReviewed = ['yes', 'y', 'ok', 'duyệt', 'đã duyệt', 'đồng ý', 'dong y', 'no', 'n', 'từ chối', 'không', 'cân nhắc', 'can nhac', 'maybe'].indexOf(rawVal) !== -1;
  var timeCell = ctx.sheet.getRange(ctx.row, timeColIdx);
  if (isReviewed) {
    var nowStr = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm');
    timeCell.setValue(nowStr);
  } else if (!rawVal || rawVal === 'chờ duyệt' || rawVal === 'cho duyet') {
    timeCell.setValue('');
  }
}`,
  },
  {
    id: 'REJECT_REASON_REMINDER_AND_COLOR',
    name: 'Nhắc điền Lý do từ chối & Tô màu dòng theo kết quả duyệt',
    triggerType: 'onEdit',
    targetColumns: 'Brand chọn → Lý do từ chối',
    purpose:
      'Khi Brand chọn "No" nhưng để trống cột "Lý do từ chối", tự động bật thông báo nhắc trên góc Sheet, di chuyển con trỏ sang ô Lý do và đổi màu nền dòng (Yes: xanh nhạt, No: xám nhạt, Cân nhắc: vàng nhạt).',
    enabled: true,
    isBuiltIn: true,
    codeBody: `function runModule_REJECT_REASON_REMINDER_AND_COLOR(ctx) {
  if (ctx.brandColIdx === -1 || ctx.col !== ctx.brandColIdx) return;
  var rawVal = ctx.rawValLower;
  var rowRange = ctx.sheet.getRange(ctx.row, 1, 1, Math.min(ctx.lastCol, 22));
  if (rawVal === 'yes' || rawVal === 'duyệt' || rawVal === 'đồng ý') {
    rowRange.setBackground('#ECFDF5');
  } else if (rawVal === 'no' || rawVal === 'từ chối') {
    rowRange.setBackground('#F8FAFC');
    var reasonColIdx = ctx.findCol(['lý do từ chối', 'ly do tu choi', 'lý do brand từ chối', 'phản hồi brand']);
    if (reasonColIdx !== -1) {
      var reasonCell = ctx.sheet.getRange(ctx.row, reasonColIdx);
      var currentReason = String(reasonCell.getValue() || '').trim();
      if (!currentReason) {
        reasonCell.setBackground('#FEF2F2');
        ctx.sheet.setActiveSelection(reasonCell);
        SpreadsheetApp.getActiveSpreadsheet().toast(
          'Vui lòng ghi ngắn gọn Lý do từ chối để UpBase lọc KOC thay thế sát yêu cầu hơn.',
          'Nhắc điền Lý do từ chối (Dòng ' + ctx.row + ')',
          6
        );
      }
    }
  } else if (rawVal === 'cân nhắc' || rawVal === 'can nhac') {
    rowRange.setBackground('#FFFBEB');
  } else {
    rowRange.setBackground(null);
  }
}`,
  },
  {
    id: 'LOCK_APPROVED_ROW_FIELDS',
    name: 'Khóa bảo vệ Giá Net & Sản phẩm sau khi Brand chọn Yes',
    triggerType: 'onEdit',
    targetColumns: 'ID kênh, Sản phẩm, Giá Net video',
    purpose:
      'Khi Brand đã chọn "Yes", tự động gắn cảnh báo bảo vệ lên ô ID kênh, Sản phẩm và Giá Net của dòng đó để tránh nhân sự hoặc đối tác vô tình gõ đè làm lệch số liệu đối soát.',
    enabled: false,
    isBuiltIn: true,
    codeBody: `function runModule_LOCK_APPROVED_ROW_FIELDS(ctx) {
  if (ctx.brandColIdx === -1 || ctx.col !== ctx.brandColIdx) return;
  var rawVal = ctx.rawValLower;
  var feeColIdx = ctx.findCol(['giá net video', 'gia net video', 'chi phí chốt cuối']);
  if (feeColIdx === -1) return;
  var feeCell = ctx.sheet.getRange(ctx.row, feeColIdx);
  if (rawVal === 'yes' || rawVal === 'duyệt') {
    var prot = feeCell.protect().setDescription('UpBase: Khóa Giá Net sau khi Brand duyệt Dòng ' + ctx.row);
    prot.setWarningOnly(true);
  }
}`,
  },
  {
    id: 'STAGE2_SCRIPT_DEMO_TIMESTAMP',
    name: 'Đóng dấu thời gian Gửi & Duyệt Kịch bản / Video Demo',
    triggerType: 'onEdit',
    targetColumns: 'Link Kịch bản, Duyệt Kịch bản, Link Video Demo, Duyệt Demo',
    purpose:
      'Tự động ghi chú mốc ngày giờ khi nhân sự dán Link Kịch bản / Link Video Demo và khi Brand chọn kết quả duyệt Kịch bản / Demo để đo SLA sản xuất.',
    enabled: true,
    isBuiltIn: true,
    codeBody: `function runModule_STAGE2_SCRIPT_DEMO_TIMESTAMP(ctx) {
  var scriptDecisionCol = ctx.findCol(['brand duyệt kịch bản', 'duyệt kịch bản', 'trạng thái kịch bản']);
  var demoDecisionCol = ctx.findCol(['brand duyệt demo', 'duyệt video demo', 'duyệt demo']);
  if (ctx.col === scriptDecisionCol || ctx.col === demoDecisionCol) {
    var val = String(ctx.e.range.getValue() || '').trim();
    if (val) {
      var stamp = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm');
      ctx.e.range.setNote('Cập nhật lúc: ' + stamp);
    }
  }
}`,
  },
  {
    id: 'CLEAN_TIKTOK_HANDLE_AND_LINK',
    name: 'Chuẩn hóa ID kênh & Tự tạo Link TikTok khi nhập mới trên Sheet',
    triggerType: 'onEdit',
    targetColumns: 'ID kênh → Link kênh, Ngày điền',
    purpose:
      'Khi nhân sự hoặc Brand dán link TikTok hoặc gõ @handle vào cột "ID kênh", tự động làm sạch ID kênh, điền công thức Link kênh (https://www.tiktok.com/@...) và điền Ngày điền.',
    enabled: true,
    isBuiltIn: true,
    codeBody: `function runModule_CLEAN_TIKTOK_HANDLE_AND_LINK(ctx) {
  var idColIdx = ctx.findCol(['id kênh', 'id kenh', 'mã koc']);
  if (idColIdx === -1 || ctx.col !== idColIdx) return;
  var rawId = String(ctx.e.range.getValue() || '').trim();
  if (!rawId) return;
  var cleanId = rawId
    .replace(/^https?:\\/\\/(www\\.)?tiktok\\.com\\/@/i, '')
    .replace(/[/?#].*$/, '')
    .replace(/^@/, '')
    .trim();
  if (cleanId && cleanId !== rawId) {
    ctx.e.range.setValue(cleanId);
  }
  var linkColIdx = ctx.findCol(['link kênh', 'link kenh']);
  if (linkColIdx !== -1 && cleanId) {
    ctx.sheet.getRange(ctx.row, linkColIdx).setValue('https://www.tiktok.com/@' + cleanId);
  }
  var ngayDienColIdx = ctx.findCol(['ngay_dien', 'ngày điền', 'tg listing']);
  if (ngayDienColIdx !== -1) {
    var ngayCell = ctx.sheet.getRange(ctx.row, ngayDienColIdx);
    if (!String(ngayCell.getValue() || '').trim()) {
      ngayCell.setValue(Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm'));
    }
  }
}`,
  },
  {
    id: 'LOCK_CLOSED_MONTH_ROWS',
    name: 'Tự động khóa sổ các dòng KOC thuộc Tháng cũ sau nghiệm thu',
    triggerType: 'onEdit',
    targetColumns: 'Cột Tháng (YYYY/MM) → Toàn bộ dòng tháng cũ',
    purpose:
      'Chặn tự ý sửa dữ liệu các dòng KOC thuộc những tháng đã qua (nhỏ hơn tháng hiện tại YYYY/MM). Nếu ai đó sửa nhầm vào dòng của tháng cũ đã chốt sổ, hệ thống tự động khôi phục giá trị cũ (oldValue) và hiển thị thông báo.',
    enabled: true,
    isBuiltIn: true,
    codeBody: `function runModule_LOCK_CLOSED_MONTH_ROWS(ctx) {
  var monthColIdx = ctx.findCol(['tháng', 'thang', 'đợt', 'dot', 'tháng booking']);
  if (monthColIdx === -1) return;
  var rawMonth = String(ctx.sheet.getRange(ctx.row, monthColIdx).getDisplayValue() || '').trim();
  var match = rawMonth.match(/(20\\d{2})[\\/-](\\d{1,2})/);
  if (!match) return;
  var rowYearMonth = match[1] + '/' + ('0' + match[2]).slice(-2);
  var nowYearMonth = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy/MM');
  if (rowYearMonth < nowYearMonth) {
    if (typeof ctx.e.oldValue !== 'undefined') {
      ctx.e.range.setValue(ctx.e.oldValue);
    }
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Dòng KOC thuộc tháng cũ (' + rowYearMonth + ') đã chốt sổ nghiệm thu — không thể chỉnh sửa.',
      'Đã khóa sổ tháng cũ',
      6
    );
  }
}`,
  },
  {
    id: 'UPBASE_SHEET_MENU',
    name: 'Thanh Menu tiện ích "UpBase B2C" trên Google Sheet',
    triggerType: 'onOpen',
    targetColumns: 'Thanh công cụ Google Sheet',
    purpose:
      'Tạo menu "UpBase B2C" trên thanh công cụ Google Sheet để Brand và Quản lý bấm nhanh: Xem tổng hợp số KOC & ngân sách đã duyệt (Yes), hoặc Khóa bảo vệ (Sheet Protection) toàn bộ dòng của các tháng cũ.',
    enabled: true,
    isBuiltIn: true,
    codeBody: `function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('UpBase B2C')
      .addItem('Xem tổng hợp KOC đã duyệt (Yes)', 'upbaseShowApprovalSummary')
      .addSeparator()
      .addItem('Khóa bảo vệ các dòng Tháng cũ (Chốt sổ)', 'upbaseProtectClosedMonthRows')
      .addToUi();
  } catch (err) {}
}

function upbaseProtectClosedMonthRows() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 3) {
    SpreadsheetApp.getUi().alert('Bảng hiện chưa có dữ liệu KOC.');
    return;
  }
  var data = sheet.getRange(1, 1, lastRow, lastCol).getDisplayValues();
  var headerRowIdx = data[2] && data[2].some(Boolean) ? 2 : 0;
  var headers = data[headerRowIdx].map(function (h) {
    return String(h || '').trim().toLowerCase();
  });
  var monthIdx = headers.indexOf('tháng');
  if (monthIdx === -1) monthIdx = headers.indexOf('thang');
  if (monthIdx === -1) {
    SpreadsheetApp.getUi().alert('Không tìm thấy cột "Tháng" trên bảng này.');
    return;
  }
  var nowYearMonth = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy/MM');
  var lockedCount = 0;
  for (var r = headerRowIdx + 1; r < data.length; r++) {
    var rawMonth = String(data[r][monthIdx] || '').trim();
    var m = rawMonth.match(/(20\\d{2})[\\/-](\\d{1,2})/);
    if (!m) continue;
    var ym = m[1] + '/' + ('0' + m[2]).slice(-2);
    if (ym < nowYearMonth) {
      var rowNum = r + 1;
      var range = sheet.getRange(rowNum, 1, 1, lastCol);
      var protection = range.protect().setDescription('UpBase Lock Month ' + ym + ' Row ' + rowNum);
      protection.setWarningOnly(true);
      lockedCount++;
    }
  }
  SpreadsheetApp.getUi().alert(
    'Đã thiết lập khóa bảo vệ cho ' + lockedCount + ' dòng KOC thuộc các tháng trước (' + nowYearMonth + ').'
  );
}

function upbaseShowApprovalSummary() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 3) {
    SpreadsheetApp.getUi().alert('Bảng hiện chưa có dữ liệu KOC.');
    return;
  }
  var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headerRowIdx = data[2] && data[2].some(Boolean) ? 2 : 0;
  var headers = data[headerRowIdx].map(function (h) {
    return String(h || '').trim().toLowerCase();
  });
  var brandIdx = headers.indexOf('brand chọn');
  var netIdx = headers.indexOf('giá net video');
  var totalRows = 0;
  var approvedCount = 0;
  var rejectedCount = 0;
  var waitingCount = 0;
  var approvedNet = 0;

  for (var r = headerRowIdx + 1; r < data.length; r++) {
    var row = data[r];
    if (!row.some(Boolean)) continue;
    totalRows++;
    var decision = brandIdx !== -1 ? String(row[brandIdx] || '').trim().toLowerCase() : '';
    var netVal = netIdx !== -1 ? Number(String(row[netIdx] || '').replace(/[^0-9]/g, '')) || 0 : 0;
    if (decision === 'yes' || decision === 'duyệt') {
      approvedCount++;
      approvedNet += netVal;
    } else if (decision === 'no' || decision === 'từ chối') {
      rejectedCount++;
    } else {
      waitingCount++;
    }
  }

  SpreadsheetApp.getUi().alert(
    'Tổng hợp Listing KOC (' + sheet.getName() + ')',
    '• Tổng số dòng KOC: ' + totalRows + '\\n' +
      '• Brand đã duyệt (Yes): ' + approvedCount + ' KOC\\n' +
      '• Brand từ chối (No): ' + rejectedCount + ' KOC\\n' +
      '• Đang chờ phản hồi: ' + waitingCount + ' KOC\\n' +
      '• Tổng Giá Net đã duyệt: ' + approvedNet.toLocaleString('vi-VN') + ' VNĐ',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}`,
  },
];

function buildCombinedAppsScriptCode(modules: AppsScriptModuleItem[]): string {
  const activeModules = modules.filter((m) => m && m.enabled);
  const onEditModules = activeModules.filter((m) => m.triggerType === 'onEdit');
  const onOpenModules = activeModules.filter((m) => m.triggerType === 'onOpen');

  const lines: string[] = [
    '/**',
    ' * Bộ tiện ích Google Apps Script chuẩn UpBase B2C (Tự động sinh từ Web Admin)',
    ` * Số tác vụ đang kích hoạt: ${activeModules.length}/${modules.length}`,
    ...activeModules.map((m, idx) => ` * ${idx + 1}. [${m.triggerType}] ${m.name} (${m.targetColumns})`),
    ' */',
    '',
    'function onEdit(e) {',
    '  if (!e || !e.range) return;',
    '  var sheet = e.range.getSheet();',
    '  var row = e.range.getRow();',
    '  var col = e.range.getColumn();',
    '  if (row <= 3) return;',
    '',
    '  var lastCol = Math.max(sheet.getLastColumn(), col);',
    '  var row3Values = sheet.getRange(3, 1, 1, lastCol).getValues()[0];',
    '  var row1Values = sheet.getRange(1, 1, 1, lastCol).getValues()[0];',
    '',
    '  function normalizeHeader(text) {',
    "    return String(text || '')",
    "      .replace(/[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]/g, '')",
    "      .replace(/\\s*\\(bổ sung thêm\\)/gi, '')",
    '      .trim()',
    '      .toLowerCase();',
    '  }',
    '',
    '  var headerRowIndex = 3;',
    '  var headers = row3Values.map(normalizeHeader);',
    '  var hasBrandColInRow3 = headers.some(function (h) {',
    "    return h === 'brand chọn' || h === 'brand chon' || h === 'brand duyệt' || h === 'kết quả brand';",
    '  });',
    '  if (!hasBrandColInRow3) {',
    '    headerRowIndex = 1;',
    '    headers = row1Values.map(normalizeHeader);',
    '  }',
    '',
    '  function findCol(candidates) {',
    '    for (var i = 0; i < headers.length; i++) {',
    '      if (candidates.indexOf(headers[i]) !== -1) return i + 1;',
    '    }',
    '    return -1;',
    '  }',
    '',
    "  var brandColIdx = findCol(['brand chọn', 'brand chon', 'brand duyệt', 'kết quả brand']);",
    "  var rawValLower = String(e.range.getValue() || '').trim().toLowerCase();",
    '',
    '  var ctx = {',
    '    e: e,',
    '    sheet: sheet,',
    '    row: row,',
    '    col: col,',
    '    lastCol: lastCol,',
    '    headerRowIndex: headerRowIndex,',
    '    headers: headers,',
    '    brandColIdx: brandColIdx,',
    '    rawValLower: rawValLower,',
    '    findCol: findCol',
    '  };',
    '',
  ];

  for (const m of onEditModules) {
    const fnMatch = m.codeBody.match(/function\s+([a-zA-Z0-9_]+)\s*\(/);
    const fnName = fnMatch ? fnMatch[1] : `runModule_${m.id}`;
    lines.push(`  try { ${fnName}(ctx); } catch (err) {}`);
  }

  lines.push('}', '');

  for (const m of onEditModules) {
    lines.push(`// --- [${m.id}] ${m.name} ---`);
    lines.push(m.codeBody.trim(), '');
  }

  for (const m of onOpenModules) {
    lines.push(`// --- [${m.id}] ${m.name} ---`);
    lines.push(m.codeBody.trim(), '');
  }

  return lines.join('\n');
}

const DEFAULT_MANIFEST_JSON = JSON.stringify(
  {
    timeZone: 'Asia/Ho_Chi_Minh',
    dependencies: {},
    exceptionLogging: 'STACKDRIVER',
    runtimeVersion: 'V8',
  },
  null,
  2
);

let memoryOAuthConfig: StoredAppsScriptOAuthConfig = {};
let memoryInstalledMap: Record<string, InstalledScriptMeta> = {};

function mergeModulesWithDefaults(saved?: AppsScriptModuleItem[]): AppsScriptModuleItem[] {
  if (!Array.isArray(saved) || saved.length === 0) {
    return DEFAULT_APPS_SCRIPT_MODULES;
  }
  const savedById = new Map(saved.map((m) => [m.id, m]));
  const merged: AppsScriptModuleItem[] = DEFAULT_APPS_SCRIPT_MODULES.map((def) => {
    const ov = savedById.get(def.id);
    if (!ov) return def;
    return {
      ...def,
      name: ov.name || def.name,
      targetColumns: ov.targetColumns || def.targetColumns,
      purpose: ov.purpose || def.purpose,
      enabled: typeof ov.enabled === 'boolean' ? ov.enabled : def.enabled,
      codeBody: ov.codeBody || def.codeBody,
      isBuiltIn: true,
    };
  });

  // Giữ lại các Script tự thêm mới của người dùng
  for (const item of saved) {
    if (item && item.id && !DEFAULT_APPS_SCRIPT_MODULES.some((d) => d.id === item.id)) {
      merged.push({
        ...item,
        isBuiltIn: false,
      });
    }
  }
  return merged;
}

async function loadOAuthConfig(): Promise<{
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  modules: AppsScriptModuleItem[];
  storeMatrix: Record<string, StoreAppsScriptMatrixConfig>;
  scriptCode: string;
  configured: boolean;
  source: 'env' | 'db' | 'none';
}> {
  const envClientId = (process.env.GOOGLE_OAUTH_CLIENT_ID || '').trim();
  const envClientSecret = (process.env.GOOGLE_OAUTH_CLIENT_SECRET || '').trim();
  const envRefreshToken = (process.env.GOOGLE_OAUTH_REFRESH_TOKEN || '').trim();

  try {
    const rec = await readRecord<StoredAppsScriptOAuthConfig>(OAUTH_CONFIG_RECORD_KEY, {});
    if (rec.data && typeof rec.data === 'object') {
      memoryOAuthConfig = {
        ...memoryOAuthConfig,
        ...rec.data,
      };
    }
  } catch {
    /* fallback to memoryOAuthConfig */
  }

  const clientId = (memoryOAuthConfig.clientId || envClientId || '').trim();
  const clientSecret = (memoryOAuthConfig.clientSecret || envClientSecret || '').trim();
  const refreshToken = (memoryOAuthConfig.refreshToken || envRefreshToken || '').trim();
  const modules = mergeModulesWithDefaults(memoryOAuthConfig.modules);
  const storeMatrix =
    memoryOAuthConfig.storeMatrix && typeof memoryOAuthConfig.storeMatrix === 'object'
      ? memoryOAuthConfig.storeMatrix
      : {};
  const scriptCode =
    memoryOAuthConfig.useCustomRawCode && memoryOAuthConfig.customScriptCode?.trim()
      ? memoryOAuthConfig.customScriptCode.trim()
      : buildCombinedAppsScriptCode(modules);

  return {
    clientId,
    clientSecret,
    refreshToken,
    modules,
    storeMatrix,
    scriptCode,
    configured: Boolean(clientId && clientSecret && refreshToken),
    source:
      envClientId && envClientSecret && envRefreshToken
        ? 'env'
        : clientId && clientSecret && refreshToken
          ? 'db'
          : 'none',
  };
}

async function loadInstalledMap(): Promise<Record<string, InstalledScriptMeta>> {
  try {
    const rec = await readRecord<Record<string, InstalledScriptMeta>>(INSTALLED_MAP_RECORD_KEY, {});
    if (rec.data && typeof rec.data === 'object') {
      memoryInstalledMap = {
        ...memoryInstalledMap,
        ...rec.data,
      };
    }
  } catch {
    /* fallback to memoryInstalledMap */
  }
  return memoryInstalledMap;
}

async function saveInstalledMap(nextMap: Record<string, InstalledScriptMeta>): Promise<void> {
  memoryInstalledMap = nextMap;
  try {
    await upsertRecord<Record<string, InstalledScriptMeta>>(
      INSTALLED_MAP_RECORD_KEY,
      {},
      () => nextMap
    );
  } catch {
    /* keep in memory */
  }
}

async function exchangeRefreshTokenForAccessToken(params: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<string> {
  const body = new URLSearchParams({
    client_id: params.clientId.trim(),
    client_secret: params.clientSecret.trim(),
    refresh_token: params.refreshToken.trim(),
    grant_type: 'refresh_token',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = (await res.json().catch(() => null)) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  } | null;

  if (!res.ok || !data?.access_token) {
    throw new Error(
      data?.error_description ||
        data?.error ||
        `Không lấy được Access Token từ Google OAuth2 (HTTP ${res.status}). Hãy kiểm tra lại Client ID, Client Secret và Refresh Token.`
    );
  }

  return data.access_token;
}

async function deployBoundAppsScriptToSpreadsheet(params: {
  accessToken: string;
  spreadsheetId: string;
  existingScriptId?: string;
  scriptCode: string;
  projectTitle: string;
}): Promise<{ scriptId: string; mode: 'UPDATED' | 'CREATED' }> {
  const headers = {
    Authorization: `Bearer ${params.accessToken}`,
    'Content-Type': 'application/json',
  };

  const filesPayload = {
    files: [
      {
        name: 'appsscript',
        type: 'JSON',
        source: DEFAULT_MANIFEST_JSON,
      },
      {
        name: 'Code',
        type: 'SERVER_JS',
        source: params.scriptCode,
      },
    ],
  };

  if (params.existingScriptId) {
    const updateExistingRes = await fetch(
      `https://script.googleapis.com/v1/projects/${encodeURIComponent(params.existingScriptId)}/content`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify(filesPayload),
      }
    );
    if (updateExistingRes.ok) {
      return { scriptId: params.existingScriptId, mode: 'UPDATED' };
    }
  }

  const createRes = await fetch('https://script.googleapis.com/v1/projects', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: params.projectTitle,
      parentId: params.spreadsheetId,
    }),
  });

  const createData = (await createRes.json().catch(() => null)) as {
    scriptId?: string;
    error?: { message?: string; status?: string; code?: number };
  } | null;

  if (!createRes.ok || !createData?.scriptId) {
    const rawMsg = createData?.error?.message || `HTTP ${createRes.status}`;
    if (rawMsg.includes('Apps Script API has not been used') || rawMsg.includes('disabled')) {
      throw new Error(
        `Google Apps Script API chưa được bật trên Google Cloud Project hoặc trong https://script.google.com/home/usersettings. Chi tiết: ${rawMsg}`
      );
    }
    throw new Error(`Không tạo được project Apps Script trên file Sheet: ${rawMsg}`);
  }

  const newScriptId = createData.scriptId;

  const putContentRes = await fetch(
    `https://script.googleapis.com/v1/projects/${encodeURIComponent(newScriptId)}/content`,
    {
      method: 'PUT',
      headers,
      body: JSON.stringify(filesPayload),
    }
  );

  const putContentData = (await putContentRes.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;

  if (!putContentRes.ok) {
    throw new Error(
      `Đã tạo project (${newScriptId}) nhưng lỗi khi ghi mã Code.gs: ${
        putContentData?.error?.message || `HTTP ${putContentRes.status}`
      }`
    );
  }

  return { scriptId: newScriptId, mode: 'CREATED' };
}

export async function GET(request: NextRequest) {
  if (!(await getPlanActor(request))) return unauthorized();
  const cfg = await loadOAuthConfig();
  const installedMap = await loadInstalledMap();
  const maskedClientId = cfg.clientId
    ? cfg.clientId.length > 16
      ? `${cfg.clientId.slice(0, 10)}...${cfg.clientId.slice(-12)}`
      : cfg.clientId
    : null;

  return NextResponse.json({
    ok: true,
    configured: cfg.configured,
    source: cfg.source,
    clientIdMasked: maskedClientId,
    hasRefreshToken: Boolean(cfg.refreshToken),
    modules: cfg.modules,
    defaultModules: DEFAULT_APPS_SCRIPT_MODULES,
    storeMatrix: cfg.storeMatrix,
    scriptCode: cfg.scriptCode,
    installedMap,
  });
}

// PUT — cấu hình OAuth, bộ module và code Apps Script: chỉ Giám đốc / Admin (code này chạy trên Sheet của mọi Brand)
export async function PUT(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  if (!isStaffGlobalAdminOrManager(actor)) return forbidden('Chỉ Giám đốc / Admin được cấu hình Apps Script.');
  try {
    const body = (await request.json().catch(() => ({}))) as {
      clientId?: string;
      clientSecret?: string;
      refreshToken?: string;
      modules?: AppsScriptModuleItem[];
      storeMatrix?: Record<string, StoreAppsScriptMatrixConfig>;
      customScriptCode?: string;
      useCustomRawCode?: boolean;
      verifyToken?: boolean;
    };

    const current = await loadOAuthConfig();
    const nextClientId =
      body.clientId !== undefined ? body.clientId.trim() : current.clientId;
    const nextClientSecret =
      body.clientSecret !== undefined ? body.clientSecret.trim() : current.clientSecret;
    const nextRefreshToken =
      body.refreshToken !== undefined ? body.refreshToken.trim() : current.refreshToken;
    const nextModules = Array.isArray(body.modules)
      ? body.modules
      : current.modules;
    const nextStoreMatrix =
      body.storeMatrix && typeof body.storeMatrix === 'object'
        ? body.storeMatrix
        : current.storeMatrix;
    const nextScriptCode = buildCombinedAppsScriptCode(nextModules);

    if (body.verifyToken !== false && (body.clientId || body.clientSecret || body.refreshToken)) {
      if (!nextClientId || !nextClientSecret || !nextRefreshToken) {
        return NextResponse.json(
          {
            ok: false,
            error:
              'Vui lòng nhập đủ cả 3 thông tin: OAuth Client ID, Client Secret và Refresh Token.',
          },
          { status: 400 }
        );
      }
      await exchangeRefreshTokenForAccessToken({
        clientId: nextClientId,
        clientSecret: nextClientSecret,
        refreshToken: nextRefreshToken,
      });
    }

    const updatedRecord: StoredAppsScriptOAuthConfig = {
      clientId: nextClientId,
      clientSecret: nextClientSecret,
      refreshToken: nextRefreshToken,
      modules: nextModules,
      storeMatrix: nextStoreMatrix,
      customScriptCode: nextScriptCode,
      useCustomRawCode: Boolean(body.useCustomRawCode),
      updatedAt: new Date().toISOString(),
    };

    memoryOAuthConfig = updatedRecord;
    try {
      await upsertRecord<StoredAppsScriptOAuthConfig>(
        OAUTH_CONFIG_RECORD_KEY,
        {},
        () => updatedRecord
      );
    } catch {
      /* keep in memory if DB unavailable */
    }

    return NextResponse.json({
      ok: true,
      configured: Boolean(nextClientId && nextClientSecret && nextRefreshToken),
      clientIdMasked:
        nextClientId.length > 16
          ? `${nextClientId.slice(0, 10)}...${nextClientId.slice(-12)}`
          : nextClientId,
      hasRefreshToken: Boolean(nextRefreshToken),
      modules: nextModules,
      storeMatrix: nextStoreMatrix,
      scriptCode: nextScriptCode,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Không lưu được cấu hình Google Apps Script.',
      },
      { status: 400 }
    );
  }
}

// POST — cài Apps Script lên Sheet. Giám đốc / Admin: mọi gian, được gửi kèm bộ module riêng.
// Booking / Leader: chỉ gian mình, luôn dùng bộ module đã lưu (không nhận code từ trình duyệt).
export async function POST(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  const isAdmin = isStaffGlobalAdminOrManager(actor);
  try {
    const body = (await request.json().catch(() => ({}))) as {
      targets?: Array<{
        storeId?: string;
        storeName?: string;
        sheetUrl: string;
        applyAppsScript?: boolean;
        moduleIds?: string[];
      }>;
      sheetUrl?: string;
      storeName?: string;
      storeId?: string;
      modules?: AppsScriptModuleItem[];
      storeMatrix?: Record<string, StoreAppsScriptMatrixConfig>;
      scriptCode?: string;
    };

    const rawTargets = Array.isArray(body.targets)
      ? body.targets
      : body.sheetUrl
        ? [
            {
              storeId: body.storeId,
              storeName: body.storeName || 'Gian hàng',
              sheetUrl: body.sheetUrl,
            },
          ]
        : [];

    if (rawTargets.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Chưa có link Google Sheet nào được chọn để cài đặt Apps Script.' },
        { status: 400 }
      );
    }
    if (!isAdmin) {
      if (body.modules || body.storeMatrix || body.scriptCode || rawTargets.some(t => t.moduleIds || t.applyAppsScript !== undefined)) {
        return forbidden('Chỉ Giám đốc / Admin được đổi bộ module Apps Script khi cài.');
      }
      try {
        for (const t of rawTargets) await assertStoreBookingAccess(t.storeId || t.storeName || '', actor);
      } catch (err) {
        return handlePlanError(err);
      }
    }

    const cfg = await loadOAuthConfig();
    if (!cfg.configured) {
      return NextResponse.json(
        {
          ok: false,
          code: 'OAUTH_NOT_CONFIGURED',
          error:
            'Chưa cấu hình Google OAuth2 (Client ID, Client Secret, Refresh Token) để gọi Google Apps Script API.',
        },
        { status: 400 }
      );
    }

    const accessToken = await exchangeRefreshTokenForAccessToken({
      clientId: cfg.clientId,
      clientSecret: cfg.clientSecret,
      refreshToken: cfg.refreshToken,
    });

    const catalogModules = Array.isArray(body.modules) ? body.modules : cfg.modules;
    const matrixMap =
      body.storeMatrix && typeof body.storeMatrix === 'object'
        ? body.storeMatrix
        : cfg.storeMatrix;

    const installedMap = await loadInstalledMap();
    const results: Array<{
      storeName: string;
      sheetUrl: string;
      spreadsheetId: string;
      ok: boolean;
      scriptId?: string;
      mode?: 'CREATED' | 'UPDATED';
      enabledCount?: number;
      error?: string;
    }> = [];

    const seenSpreadsheetSignatures = new Map<
      string,
      { scriptId: string; mode: 'CREATED' | 'UPDATED'; enabledCount: number }
    >();

    for (const item of rawTargets) {
      const storeLabel = item.storeName || 'Gian hàng';
      const url = (item.sheetUrl || '').trim();
      const spreadsheetId = parseSpreadsheetId(url);
      if (!spreadsheetId) {
        results.push({
          storeName: storeLabel,
          sheetUrl: url,
          spreadsheetId: '',
          ok: false,
          error: 'Link Google Sheet không hợp lệ.',
        });
        continue;
      }

      const matrixEntry = item.storeId ? matrixMap[item.storeId] : undefined;
      const shouldApply =
        item.applyAppsScript !== undefined
          ? item.applyAppsScript
          : matrixEntry
            ? matrixEntry.applyAppsScript
            : true;

      const resolvedModuleIds: string[] = !shouldApply
        ? []
        : Array.isArray(item.moduleIds)
          ? item.moduleIds
          : matrixEntry && Array.isArray(matrixEntry.enabledModuleIds)
            ? matrixEntry.enabledModuleIds
            : catalogModules.filter((m) => m.enabled).map((m) => m.id);

      const tailoredModules = catalogModules.map((m) => ({
        ...m,
        enabled: shouldApply && resolvedModuleIds.includes(m.id),
      }));

      const tailoredCode = !shouldApply
        ? '// Đã tắt Tiện ích Tự động hóa Apps Script cho gian hàng này từ UpBase Web Admin.\nfunction onEdit(e) {}\n'
        : buildCombinedAppsScriptCode(tailoredModules);

      const cacheKey = `${spreadsheetId}::${resolvedModuleIds.slice().sort().join(',')}`;
      const cachedInBatch = seenSpreadsheetSignatures.get(cacheKey);
      if (cachedInBatch) {
        results.push({
          storeName: storeLabel,
          sheetUrl: url,
          spreadsheetId,
          ok: true,
          scriptId: cachedInBatch.scriptId,
          mode: cachedInBatch.mode,
          enabledCount: cachedInBatch.enabledCount,
        });
        continue;
      }

      try {
        const existingMeta = installedMap[spreadsheetId];
        const deployed = await deployBoundAppsScriptToSpreadsheet({
          accessToken,
          spreadsheetId,
          existingScriptId: existingMeta?.scriptId,
          scriptCode: tailoredCode,
          projectTitle: `UpBase_Sheet_Automation_${storeLabel.slice(0, 32)}`,
        });

        seenSpreadsheetSignatures.set(cacheKey, {
          ...deployed,
          enabledCount: resolvedModuleIds.length,
        });

        installedMap[spreadsheetId] = {
          spreadsheetId,
          scriptId: deployed.scriptId,
          storeName: storeLabel,
          sheetUrl: url,
          enabledModuleIds: resolvedModuleIds,
          installedAt: new Date().toISOString(),
        };

        results.push({
          storeName: storeLabel,
          sheetUrl: url,
          spreadsheetId,
          ok: true,
          scriptId: deployed.scriptId,
          mode: deployed.mode,
          enabledCount: resolvedModuleIds.length,
        });
      } catch (err) {
        results.push({
          storeName: storeLabel,
          sheetUrl: url,
          spreadsheetId,
          ok: false,
          error: err instanceof Error ? err.message : 'Lỗi khi cài đặt Apps Script',
        });
      }
    }

    await saveInstalledMap(installedMap);

    const successCount = results.filter((r) => r.ok).length;
    const failCount = results.length - successCount;

    return NextResponse.json({
      ok: successCount > 0,
      successCount,
      failCount,
      results,
      installedMap,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Không thể cài đặt Apps Script lên Google Sheet.',
      },
      { status: 500 }
    );
  }
}
