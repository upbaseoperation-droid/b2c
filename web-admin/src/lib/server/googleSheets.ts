// Ghi dữ liệu lên Google Sheet bằng tài khoản dịch vụ (service account), không dùng thư viện ngoài.
// Cấu hình: GOOGLE_SERVICE_ACCOUNT_EMAIL và GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (khóa riêng, xuống dòng viết \n)
// hoặc khai báo trực tiếp qua giao diện (lưu vào bản ghi máy chủ google-sheets-config-v1).
import { createSign } from 'node:crypto';
import { STAFF_LISTING_COLUMNS } from '../staffBrandListingSheet';
import { readRecord, upsertRecord } from './sharedRecords';

export class GoogleSheetsError extends Error {
  constructor(
    message: string,
    public readonly code: 'NOT_CONFIGURED' | 'FORBIDDEN' | 'NOT_FOUND' | 'INVALID' | 'FAILED',
    public readonly status = 500
  ) {
    super(message);
  }
}

export const GOOGLE_SHEETS_CONFIG_KEY = 'google-sheets-config-v1';
export const ROW_ID_COLUMN_HEADER = 'Mã dòng (Row ID)';

interface StoredServiceAccountConfig {
  serviceAccountEmail?: string;
  privateKey?: string;
  updatedAt?: string;
  updatedBy?: string;
}

let runtimeServiceAccount: { email: string; key: string } | null = null;
let lastLoadedStoredAt = 0;

function normalizePrivateKey(raw: string): string {
  let k = String(raw || '').trim();
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1).trim();
  }
  return k.replace(/\\n/g, '\n').replace(/\r\n/g, '\n').trim();
}

function tryParseServiceAccountJson(raw: string): { email: string; key: string } | null {
  const s = String(raw || '').trim();
  if (!s.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(s) as {
      client_email?: string;
      serviceAccountEmail?: string;
      private_key?: string;
      privateKey?: string;
    };
    const email = String(parsed.client_email || parsed.serviceAccountEmail || '').trim();
    const key = normalizePrivateKey(parsed.private_key || parsed.privateKey || '');
    if (email && key) return { email, key };
  } catch {
    /* ignore */
  }
  return null;
}

export function getServiceAccount() {
  const envJsonRaw =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
    process.env.GOOGLE_CREDENTIALS ||
    '';
  const fromEnvJson =
    tryParseServiceAccountJson(envJsonRaw) ||
    tryParseServiceAccountJson(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '') ||
    tryParseServiceAccountJson(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '');
  if (fromEnvJson) {
    return { email: fromEnvJson.email, key: fromEnvJson.key, configured: true, source: 'env' as const };
  }

  const envEmail = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
  const envKey = normalizePrivateKey(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '');
  if (envEmail && envKey) {
    return { email: envEmail, key: envKey, configured: true, source: 'env' as const };
  }
  if (runtimeServiceAccount?.email && runtimeServiceAccount?.key) {
    return {
      email: runtimeServiceAccount.email,
      key: runtimeServiceAccount.key,
      configured: true,
      source: 'db' as const,
    };
  }
  return { email: '', key: '', configured: false, source: 'none' as const };
}

export async function ensureServiceAccountLoaded() {
  const current = getServiceAccount();
  if (current.source === 'env') return current;
  const now = Date.now();
  if (!runtimeServiceAccount || now - lastLoadedStoredAt > 10_000) {
    lastLoadedStoredAt = now;
    try {
      const rec = await readRecord<StoredServiceAccountConfig>(GOOGLE_SHEETS_CONFIG_KEY, {});
      let email = (rec.data?.serviceAccountEmail || '').trim();
      let key = normalizePrivateKey(rec.data?.privateKey || '');
      if (!email || !key) {
        const sharedState = await readRecord<Record<string, string>>('b2c-shared-state-v1', {});
        const fromShared = tryParseServiceAccountJson(
          sharedState.data?.['upbase_b2c_google_sa_config_v1'] || ''
        );
        if (fromShared) {
          email = fromShared.email;
          key = fromShared.key;
        }
      }
      if (email && key) {
        runtimeServiceAccount = { email, key };
      }
    } catch {
      /* giữ mặc định nếu chưa có bản ghi */
    }
  }
  return getServiceAccount();
}

export async function saveServiceAccountConfig(input: {
  serviceAccountEmail: string;
  privateKey: string;
  actorName?: string;
}) {
  const email = (input.serviceAccountEmail || '').trim();
  const key = normalizePrivateKey(input.privateKey || '');
  if (!email || !email.includes('@')) {
    throw new GoogleSheetsError('Email Service Account không hợp lệ.', 'INVALID', 400);
  }
  if (!key.includes('BEGIN PRIVATE KEY')) {
    throw new GoogleSheetsError('Private Key phải có định dạng-----BEGIN PRIVATE KEY-----.', 'INVALID', 400);
  }
  try {
    createSign('RSA-SHA256').update('upbase-verify').sign(key, 'base64url');
  } catch {
    throw new GoogleSheetsError('Private Key không hợp lệ (không thể ký RSA-SHA256).', 'INVALID', 400);
  }
  runtimeServiceAccount = { email, key };
  lastLoadedStoredAt = Date.now();
  cachedToken = null;
  try {
    await upsertRecord<StoredServiceAccountConfig>(GOOGLE_SHEETS_CONFIG_KEY, {}, () => ({
      serviceAccountEmail: email,
      privateKey: key,
      updatedAt: new Date().toISOString(),
      updatedBy: input.actorName || 'Admin',
    }));
  } catch {
    /* Vẫn giữ runtimeServiceAccount trong bộ nhớ nếu DB tạm thời gián đoạn */
  }
  return getServiceAccount();
}

export const isGoogleSheetsConfigured = () => getServiceAccount().configured;

export function parseSpreadsheetId(url: string): string | null {
  const trimmed = (url || '').trim();
  const m = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]{15,})/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{25,60}$/.test(trimmed)) return trimmed;
  return null;
}

export function parseSpreadsheetGid(url: string): number | null {
  const trimmed = (url || '').trim();
  const m = trimmed.match(/[?#&]gid=(\d+)/i);
  if (!m) return null;
  const num = Number(m[1]);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

const b64url = (v: string | Buffer) => Buffer.from(v).toString('base64url');

async function getAccessToken(): Promise<string> {
  const sa = await ensureServiceAccountLoaded();
  if (!sa.configured) throw new GoogleSheetsError('Chưa cấu hình tài khoản dịch vụ Google.', 'NOT_CONFIGURED', 503);
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 60 > now) return cachedToken.token;
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(
    JSON.stringify({
      iss: sa.email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  );
  const unsigned = `${header}.${claim}`;
  let signature: string;
  try {
    signature = createSign('RSA-SHA256').update(unsigned).sign(sa.key, 'base64url');
  } catch {
    throw new GoogleSheetsError('Khóa riêng của tài khoản dịch vụ Google không hợp lệ.', 'NOT_CONFIGURED', 503);
  }
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
  });
  const body = (await res.json().catch(() => null)) as { access_token?: string; expires_in?: number } | null;
  if (!res.ok || !body?.access_token) throw new GoogleSheetsError('Google từ chối tài khoản dịch vụ. Kiểm tra lại email và khóa riêng.', 'NOT_CONFIGURED', 503);
  cachedToken = { token: body.access_token, expiresAt: now + (body.expires_in || 3600) };
  return body.access_token;
}

async function sheetsFetch(path: string, init?: RequestInit) {
  const token = await getAccessToken();
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (res.ok) return res.json();
  const sa = getServiceAccount();
  if (res.status === 403) throw new GoogleSheetsError(`Sheet chưa chia sẻ quyền chỉnh sửa cho ${sa.email}.`, 'FORBIDDEN', 403);
  if (res.status === 404) throw new GoogleSheetsError('Không tìm thấy Google Sheet. Kiểm tra lại link.', 'NOT_FOUND', 404);
  const text = await res.text().catch(() => '');
  throw new GoogleSheetsError(`Google Sheets báo lỗi ${res.status}: ${text.slice(0, 200)}`, 'FAILED', 502);
}

/** Khóa so khớp ID kênh: bỏ @, link TikTok, khác hoa thường. */
const keyOf = (v: unknown) =>
  String(v ?? '')
    .trim()
    .replace(/^https?:\/\/(www\.)?tiktok\.com\/@/i, '')
    .replace(/[/?#].*$/, '')
    .replace(/^@/, '')
    .toLowerCase();

const quoteTab = (tab: string) => `'${tab.replace(/'/g, "''")}'`;

const HEADER_CANONICAL_ALIASES: Record<string, string> = {
  ngay_dien: 'ngay dien',
  'tg listing (ngay gio)': 'ngay dien',
  'dot listing': 'dot',
  nhan_su_dien: 'nhan su dien',
  'ten kenh koc': 'ten kenh',
  'ten nguoi anh huong (ten kenh)': 'ten kenh',
  'gia da hop tac truoc do (gia du kien)': 'gia da hop tac truoc do',
  'loai gia (booking, code ads, reup gan gio, sdha)': 'loai gia',
  'phi kem thue tncn': 'phi booking kem thue tncn',
  'trang thai quy trinh booking - tech': 'trang thai',
  'ly do tu choi - brand note': 'ly do tu choi',
  'thanh qua hop tac voi ub': 'thanh qua hop tac',
  'doanh so 30d': 'doanh so',
  'doanh so (neu co)': 'doanh so',
  'gmv tu moi khach hang/ aov': 'aov',
  'view tb video': 'view trung binh video',
  'view trung binh video/ trung vi video': 'view trung binh video',
  'ti trong gmv tu video': 'gmv tu video',
  'ti trong gmv tu live': 'gmv tu live',
  'ti trong gmv tu the san pham': 'gmv tu the san pham',
  'ti trong nam': 'nam',
  'ti trong nu': 'nu',
  'ti trong 18-24': '18-24',
  'ti trong 25-34': '25-34',
  'ngay air (plan)': 'ngay air plan',
  'tg brand duyet': 'thoi gian brand duyet',
  'ngay brand duyet': 'thoi gian brand duyet',
  'ghi chu leader': 'growth/ account/leader note',
};

const normHeaderToken = (v: string) => {
  const cleaned = String(v || '')
    .replace(/[\u{1F383}\u{1F338}]/gu, '')
    .replace(/\s*\(bổ sung thêm\)/gi, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return HEADER_CANONICAL_ALIASES[cleaned] || cleaned;
};

export interface PushFieldChange {
  column: string;
  sheetValue: string;
  appValue: string;
}

export interface PushRowDiff {
  rowId?: string;
  handle: string;
  kocName: string;
  briefCode?: string;
  action: 'ADD' | 'UPDATE' | 'SKIP';
  sheetRowNum?: number;
  matchedBy?: 'ROW_ID' | 'COMPOSITE' | 'HANDLE';
  brandDecisionOnSheet?: string;
  fieldChanges: PushFieldChange[];
}

export interface AppendResult {
  added: number;
  skipped: number;
  updated?: number;
  createdTab: boolean;
  writtenHeader: boolean;
  dryRun?: boolean;
  diffs?: PushRowDiff[];
  existingTotalRows?: number;
}

const colLetter = (idx: number): string => {
  let n = idx + 1;
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

const UPDATABLE_COLUMNS = new Set([
  ROW_ID_COLUMN_HEADER,
  'Ngày điền',
  'Tháng',
  'Đợt',
  'Store',
  'Nhân sự điền',
  'Mã Brief',
  'Sản phẩm',
  'Tên kênh',
  'Link kênh',
  'Follower',
  'Tệp kênh',
  'Content tag',
  'Tệp Booking',
  'Giá đã hợp tác trước đó',
  'Loại giá',
  'Giá net video',
  'Phí kèm thuế TNCN',
  'Phí booking kèm thuế TNCN',
  'Trạng thái',
  'Đề xuất từ UpBase',
  'Content note',
  'Thành quả hợp tác',
  'Thành quả hợp tác với brand ngoài',
  'Doanh số (nếu có)',
  'Doanh số ước tính trong 30 ngày',
  'Số món bán ra',
  'GPM',
  'AOV',
  'View trung bình video',
  'Cost per view',
  'Tỉ trọng GMV từ video',
  'Tỉ trọng GMV từ Live',
  'Tỉ trọng GMV từ thẻ sản phẩm',
  'Tỉ trọng ngành hàng',
  'Tỉ trọng Nam',
  'Tỉ trọng Nữ',
  'Tỉ trọng 18-24',
  'Tỉ trọng 25-34',
  'Other',
  'Location',
  'Ngày air plan',
  'GMV Target',
  'View trung vị',
  'CTR',
  'CR',
  'View Target',
  'Tỷ lệ tương tác',
  'Email',
  'Zalo',
  'Người nhận hàng',
  'SĐT nhận hàng',
  'Địa chỉ nhận hàng',
  'Link kịch bản',
  'Link video demo',
  'Link Air',
  'Link nghiệm thu',
  'Link air nghiệm thu',
  'Ngày air thực tế',
  'Views 30 ngày',
  'GMV 30 ngày',
  'Đơn hàng 30 ngày',
  'ROI 30 ngày',
]);

/** Cột giấy tờ / tài khoản ngân hàng của KOC: chỉ lưu trong app, không ghi lên Google Sheet. */
const BRAND_SHEET_BLOCKED_TOKENS = new Set(['so cccd', 'cccd', 'ten tai khoan ngan hang', 'so tai khoan', 'ngan hang']);

/**
 * Thêm các dòng mới hoặc cập nhật dòng hiện có vào một tab, giữ nguyên những gì Brand đã điền (Brand chọn, Lý do từ chối).
 * Thứ tự ưu tiên nhận diện dòng (1-1):
 *   1. `Mã dòng (Row ID)` — đảm bảo nhận diện đúng dòng 100% kể cả khi file Google Sheet bị Sort theo Sản phẩm / Nhân sự hoặc 1 KOC book nhiều sản phẩm.
 *   2. Tổ hợp `(ID kênh + Mã Brief)` hoặc `(ID kênh + Sản phẩm + Đợt)`.
 *   3. `ID kênh` đơn lẻ (và tự động gắn bổ sung `Row ID` vào dòng đó trên Sheet).
 */
export async function appendNewRows(opts: {
  spreadsheetId: string;
  tab: string;
  sheetGid?: number | null;
  columns: string[];
  rows: (string | number)[][];
  keyColumn: string;
  dryRun?: boolean;
}): Promise<AppendResult> {
  const { spreadsheetId, sheetGid, keyColumn, dryRun = false } = opts;
  // CCCD / tài khoản ngân hàng không bao giờ lên Sheet của Brand (ẩn cột vẫn mở lại hoặc tải file được)
  const keptIdx = opts.columns.map((c, i) => (BRAND_SHEET_BLOCKED_TOKENS.has(normHeaderToken(c)) ? -1 : i)).filter(i => i >= 0);
  const columns = keptIdx.map(i => opts.columns[i]);
  const rows = opts.rows.map(r => keptIdx.map(i => r[i]));
  let tab = opts.tab;
  if (!tab.trim() || tab.length > 100) throw new GoogleSheetsError('Tên tab không hợp lệ.', 'INVALID', 400);
  const keyIdx = columns.indexOf(keyColumn);
  if (keyIdx < 0) throw new GoogleSheetsError('Thiếu cột khóa ID kênh.', 'INVALID', 400);
  const rowIdIdx = columns.findIndex(c => normHeaderToken(c) === normHeaderToken(ROW_ID_COLUMN_HEADER) || normHeaderToken(c) === 'rowid');
  const briefIdx = columns.indexOf('Mã Brief');
  const prodIdx = columns.findIndex(c => normHeaderToken(c) === 'san pham');
  const dotIdx = columns.findIndex(c => normHeaderToken(c) === 'dot');
  const nameIdx = columns.findIndex(c => /tên kênh|tên người ảnh hưởng/i.test(c));

  const meta = (await sheetsFetch(
    `${spreadsheetId}?fields=sheets.properties(sheetId,title,gridProperties)`
  )) as {
    sheets?: {
      properties: {
        sheetId: number;
        title: string;
        gridProperties?: { rowCount?: number; columnCount?: number };
      };
    }[];
  };
  let targetSheetProp = (meta.sheets || []).find(s => s.properties.title === tab)?.properties;
  if (!targetSheetProp && sheetGid !== undefined && sheetGid !== null) {
    const byGid = (meta.sheets || []).find(s => s.properties.sheetId === sheetGid)?.properties;
    if (byGid?.title) {
      targetSheetProp = byGid;
      tab = byGid.title;
    }
  }
  const exists = Boolean(targetSheetProp);
  if (!exists && !dryRun) {
    const addRes = (await sheetsFetch(`${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: tab } } }] }),
    })) as {
      replies?: {
        addSheet?: {
          properties?: {
            sheetId: number;
            title: string;
            gridProperties?: { rowCount?: number; columnCount?: number };
          };
        };
      }[];
    };
    targetSheetProp = addRes.replies?.[0]?.addSheet?.properties;
  }

  const range = encodeURIComponent(`${quoteTab(tab)}!A1:ZZ`);
  const current = exists
    ? ((await sheetsFetch(`${spreadsheetId}/values/${range}`)) as { values?: string[][] })
    : { values: [] };
  const values = current.values || [];

  let headerRowIdx = 0;
  for (let idx = 0; idx < Math.min(15, values.length); idx++) {
    const rowCells = (values[idx] || []).map(c => String(c || '').trim().toLowerCase());
    if (rowCells.some(c => c.includes('id kênh') || c.includes('id kenh') || c === keyColumn.toLowerCase())) {
      headerRowIdx = idx;
      break;
    }
  }

  const sheetHeader = (values[headerRowIdx] || []).map(h => String(h).trim());
  const hasHeader = sheetHeader.length > 0;

  const header = hasHeader ? [...sheetHeader] : [...columns];
  let headerExtended = false;
  if (hasHeader) {
    for (const c of columns) {
      const targetNorm = normHeaderToken(c);
      if (!header.some(h => normHeaderToken(h) === targetNorm)) {
        header.push(c);
        headerExtended = true;
      }
    }
  }

  const findHeaderIndex = (colName: string) => {
    const exact = header.indexOf(colName);
    if (exact >= 0) return exact;
    const cleanTarget = normHeaderToken(colName);
    return header.findIndex(h => normHeaderToken(h) === cleanTarget);
  };

  const sheetKeyIdx = findHeaderIndex(keyColumn);
  const sheetRowIdIdx = findHeaderIndex(ROW_ID_COLUMN_HEADER);
  const sheetBriefIdx = findHeaderIndex('Mã Brief');
  const sheetProdIdx = findHeaderIndex('Sản phẩm');
  const sheetDotIdx = findHeaderIndex('Đợt');
  const sheetBrandDecisionIdx = header.findIndex(h => /brand chọn|brand duyệt/i.test(h));

  const existingRowByRowId = new Map<string, { rowNum: number; rowVals: string[] }>();
  const existingRowByComposite = new Map<string, { rowNum: number; rowVals: string[] }>();
  const existingRowByProdDot = new Map<string, { rowNum: number; rowVals: string[] }>();
  const existingRowByHandle = new Map<string, { rowNum: number; rowVals: string[] }>();
  let lastValidDataRowNum = hasHeader ? headerRowIdx + 1 : 0;

  if (hasHeader && sheetKeyIdx >= 0) {
    values.slice(headerRowIdx + 1).forEach((r, idx) => {
      const rowNum = headerRowIdx + idx + 2;
      const rId = sheetRowIdIdx >= 0 ? String(r[sheetRowIdIdx] ?? '').trim() : '';
      if (rId) {
        existingRowByRowId.set(rId, { rowNum, rowVals: r });
        lastValidDataRowNum = Math.max(lastValidDataRowNum, rowNum);
      }
      const k = keyOf(r[sheetKeyIdx]);
      if (!k) return;
      lastValidDataRowNum = Math.max(lastValidDataRowNum, rowNum);
      const b = sheetBriefIdx >= 0 ? String(r[sheetBriefIdx] ?? '').trim().toUpperCase() : '';
      const prod = sheetProdIdx >= 0 ? normHeaderToken(String(r[sheetProdIdx] ?? '')) : '';
      const dot = sheetDotIdx >= 0 ? normHeaderToken(String(r[sheetDotIdx] ?? '')) : '';
      if (b) existingRowByComposite.set(`${k}::${b}`, { rowNum, rowVals: r });
      if (prod || dot) existingRowByProdDot.set(`${k}::${prod}::${dot}`, { rowNum, rowVals: r });
      if (!existingRowByHandle.has(k)) existingRowByHandle.set(k, { rowNum, rowVals: r });
    });
  }

  const fresh: (string | number)[][] = [];
  const updateRequests: { range: string; values: (string | number)[][] }[] = [];
  const diffs: PushRowDiff[] = [];
  let updatedCount = 0;

  if (headerExtended) {
    updateRequests.push({
      range: `${quoteTab(tab)}!A${headerRowIdx + 1}:${colLetter(header.length - 1)}${headerRowIdx + 1}`,
      values: [header],
    });
  }

  const matchedSheetRowNums = new Set<number>();

  for (const r of rows) {
    const k = keyOf(r[keyIdx]);
    if (!k) continue;
    const appRowId = rowIdIdx >= 0 ? String(r[rowIdIdx] ?? '').trim() : '';
    const kocName = nameIdx >= 0 ? String(r[nameIdx] ?? '').trim() : k;
    const b = briefIdx >= 0 ? String(r[briefIdx] ?? '').trim().toUpperCase() : '';
    const prod = prodIdx >= 0 ? normHeaderToken(String(r[prodIdx] ?? '')) : '';
    const dot = dotIdx >= 0 ? normHeaderToken(String(r[dotIdx] ?? '')) : '';

    // 1. Ưu tiên khớp theo Row ID (chống lệch khi Sheet bị Sort hoặc 1 KOC làm nhiều SP)
    let match = appRowId ? existingRowByRowId.get(appRowId) : undefined;
    let matchedBy: 'ROW_ID' | 'COMPOSITE' | 'HANDLE' = 'ROW_ID';

    // 2. Nếu trên Sheet chưa có Row ID đó, thử khớp theo (ID kênh + Mã Brief) hoặc (ID kênh + Sản phẩm + Đợt)
    if (!match && b) {
      const cand = existingRowByComposite.get(`${k}::${b}`);
      if (cand && !matchedSheetRowNums.has(cand.rowNum)) {
        match = cand;
        matchedBy = 'COMPOSITE';
      }
    }
    if (!match && (prod || dot)) {
      const cand = existingRowByProdDot.get(`${k}::${prod}::${dot}`);
      if (cand && !matchedSheetRowNums.has(cand.rowNum)) {
        match = cand;
        matchedBy = 'COMPOSITE';
      }
    }
    // 3. Cuối cùng khớp theo ID kênh nếu dòng đó trên Sheet chưa có Row ID khác
    if (!match) {
      const cand = existingRowByHandle.get(k);
      if (cand && !matchedSheetRowNums.has(cand.rowNum)) {
        const candRowId = sheetRowIdIdx >= 0 ? String(cand.rowVals[sheetRowIdIdx] ?? '').trim() : '';
        if (!candRowId || !appRowId || candRowId === appRowId) {
          match = cand;
          matchedBy = 'HANDLE';
        }
      }
    }

    if (!match) {
      fresh.push(r);
      const previewCols = ['Sản phẩm', 'Nhân sự điền', 'Tệp Booking', 'Giá net video', 'Đề xuất từ UpBase']
        .map(colName => {
          const targetNorm = normHeaderToken(colName);
          const i = columns.findIndex(c => normHeaderToken(c) === targetNorm);
          return i >= 0 && r[i] !== '' && r[i] !== undefined
            ? { column: colName, sheetValue: '(Chưa có trên Sheet)', appValue: String(r[i]) }
            : null;
        })
        .filter((x): x is PushFieldChange => Boolean(x));
      diffs.push({
        rowId: appRowId || undefined,
        handle: k,
        kocName: kocName || k,
        briefCode: b || undefined,
        action: 'ADD',
        fieldChanges: previewCols,
      });
      continue;
    }

    matchedSheetRowNums.add(match.rowNum);

    const brandDecisionOnSheet =
      sheetBrandDecisionIdx >= 0 ? String(match.rowVals[sheetBrandDecisionIdx] ?? '').trim() : '';

    let rowTouched = false;
    const fieldChanges: PushFieldChange[] = [];
    for (const colName of UPDATABLE_COLUMNS) {
      const targetNorm = normHeaderToken(colName);
      const srcIdx = columns.findIndex(c => normHeaderToken(c) === targetNorm);
      const dstIdx = findHeaderIndex(colName);
      if (srcIdx < 0 || dstIdx < 0) continue;
      const newVal = String(r[srcIdx] ?? '').trim();
      const oldVal = String(match.rowVals[dstIdx] ?? '').trim();
      if (newVal && newVal !== oldVal) {
        updateRequests.push({
          range: `${quoteTab(tab)}!${colLetter(dstIdx)}${match.rowNum}`,
          values: [[r[srcIdx]]],
        });
        // Không đưa cột kỹ thuật Row ID vào danh sách thay đổi hiển thị nếu chỉ là gán mã lần đầu, trừ khi dòng không có thay đổi nào khác
        if (targetNorm !== normHeaderToken(ROW_ID_COLUMN_HEADER)) {
          fieldChanges.push({
            column: colName,
            sheetValue: oldVal || '—',
            appValue: newVal,
          });
          rowTouched = true;
        }
      }
    }
    if (rowTouched) {
      updatedCount += 1;
      diffs.push({
        rowId: appRowId || undefined,
        handle: k,
        kocName: kocName || k,
        briefCode: b || undefined,
        action: 'UPDATE',
        sheetRowNum: match.rowNum,
        matchedBy,
        brandDecisionOnSheet: brandDecisionOnSheet || undefined,
        fieldChanges,
      });
    } else {
      diffs.push({
        rowId: appRowId || undefined,
        handle: k,
        kocName: kocName || k,
        briefCode: b || undefined,
        action: 'SKIP',
        sheetRowNum: match.rowNum,
        matchedBy,
        brandDecisionOnSheet: brandDecisionOnSheet || undefined,
        fieldChanges: [],
      });
    }
  }

  if (!dryRun) {
    const aligned = fresh.map(r =>
      header.map(h => {
        const cleanH = normHeaderToken(h);
        const i = columns.findIndex(c => normHeaderToken(c) === cleanH);
        return i >= 0 ? r[i] : '';
      })
    );

    const payload: (string | number)[][] = hasHeader ? aligned : [header, ...aligned];
    const writeStartRow = hasHeader ? Math.max(headerRowIdx + 2, lastValidDataRowNum + 1) : 1;
    const writeEndRow = payload.length > 0 ? writeStartRow + payload.length - 1 : Math.max(1, lastValidDataRowNum);
    const currentRowCount = targetSheetProp?.gridProperties?.rowCount ?? 1000;
    const currentColCount = targetSheetProp?.gridProperties?.columnCount ?? 26;

    if (targetSheetProp?.sheetId !== undefined) {
      const dimRequests: Record<string, unknown>[] = [];
      if (writeEndRow > currentRowCount) {
        dimRequests.push({
          appendDimension: {
            sheetId: targetSheetProp.sheetId,
            dimension: 'ROWS',
            length: Math.max(50, writeEndRow - currentRowCount + 20),
          },
        });
      }
      if (header.length > currentColCount) {
        dimRequests.push({
          appendDimension: {
            sheetId: targetSheetProp.sheetId,
            dimension: 'COLUMNS',
            length: header.length - currentColCount + 5,
          },
        });
      }
      if (dimRequests.length > 0) {
        await sheetsFetch(`${spreadsheetId}:batchUpdate`, {
          method: 'POST',
          body: JSON.stringify({ requests: dimRequests }),
        }).catch(() => {});
      }
    }

    if (updateRequests.length > 0) {
      await sheetsFetch(`${spreadsheetId}/values:batchUpdate`, {
        method: 'POST',
        body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data: updateRequests }),
      });
    }

    if (payload.length > 0) {
      await sheetsFetch(`${spreadsheetId}/values:batchUpdate`, {
        method: 'POST',
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: [
            {
              range: `${quoteTab(tab)}!A${writeStartRow}:${colLetter(header.length - 1)}${writeEndRow}`,
              values: payload,
            },
          ],
        }),
      });
    }

    // Tự động ẩn cột kỹ thuật "Mã dòng (Row ID)" trên Google Sheet để Brand không nhìn thấy mã hệ thống
    const finalRowIdColIdx = header.findIndex(
      h => normHeaderToken(h) === normHeaderToken(ROW_ID_COLUMN_HEADER)
    );
    if (finalRowIdColIdx >= 0 && targetSheetProp?.sheetId !== undefined) {
      await sheetsFetch(`${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        body: JSON.stringify({
          requests: [
            {
              updateDimensionProperties: {
                range: {
                  sheetId: targetSheetProp.sheetId,
                  dimension: 'COLUMNS',
                  startIndex: finalRowIdColIdx,
                  endIndex: finalRowIdColIdx + 1,
                },
                properties: { hiddenByUser: true },
                fields: 'hiddenByUser',
              },
            },
          ],
        }),
      }).catch(() => {});
    }
  }

  return {
    added: fresh.length,
    skipped: rows.length - fresh.length - updatedCount,
    updated: updatedCount,
    createdTab: !exists,
    writtenHeader: !hasHeader,
    dryRun,
    diffs,
    existingTotalRows: Math.max(0, values.length - (hasHeader ? headerRowIdx + 1 : 0)),
  };
}

export interface SpreadsheetTabDetail {
  sheetId: number;
  title: string;
  hidden: boolean;
  index: number;
  rowCount: number;
  columnCount: number;
}

/** Lấy danh sách tên và trạng thái ẩn/hiện của các Tab (Sheet) hiện có trong một file Google Spreadsheet. */
export async function listSpreadsheetTabs(spreadsheetId: string): Promise<{
  spreadsheetTitle: string;
  tabs: string[];
  tabsDetail: SpreadsheetTabDetail[];
}> {
  const meta = (await sheetsFetch(
    `${spreadsheetId}?fields=properties.title,sheets.properties(sheetId,title,hidden,index,gridProperties)`
  )) as {
    properties?: { title?: string };
    sheets?: {
      properties?: {
        sheetId?: number;
        title?: string;
        hidden?: boolean;
        index?: number;
        gridProperties?: { rowCount?: number; columnCount?: number };
      };
    }[];
  };
  const tabsDetail: SpreadsheetTabDetail[] = (meta.sheets || [])
    .map((s, idx) => ({
      sheetId: s.properties?.sheetId ?? idx,
      title: (s.properties?.title || '').trim(),
      hidden: Boolean(s.properties?.hidden),
      index: s.properties?.index ?? idx,
      rowCount: s.properties?.gridProperties?.rowCount ?? 1000,
      columnCount: s.properties?.gridProperties?.columnCount ?? 50,
    }))
    .filter(t => Boolean(t.title));

  return {
    spreadsheetTitle: (meta.properties?.title || '').trim(),
    tabs: tabsDetail.map(t => t.title),
    tabsDetail,
  };
}

/**
 * Đọc toàn bộ một tab: tự động dò dòng tiêu đề cột trong 10 dòng đầu tiên.
 * Trả về mảng đối tượng theo tên cột (bao gồm cả cột ẩn `Mã dòng (Row ID)` nếu có).
 */
export async function readTab(opts: { spreadsheetId: string; tab: string; sheetGid?: number | null }): Promise<{ header: string[]; rows: Record<string, string>[] }> {
  const { spreadsheetId, sheetGid } = opts;
  let tab = opts.tab;
  if (!tab.trim() || tab.length > 100) throw new GoogleSheetsError('Tên tab không hợp lệ.', 'INVALID', 400);
  const meta = (await sheetsFetch(`${spreadsheetId}?fields=sheets.properties(sheetId,title)`)) as {
    sheets?: { properties: { sheetId?: number; title: string } }[];
  };
  const sheetsList = meta.sheets || [];
  if (!sheetsList.some(s => s.properties.title === tab)) {
    const byGid =
      sheetGid !== undefined && sheetGid !== null
        ? sheetsList.find(s => s.properties.sheetId === sheetGid)
        : undefined;
    if (byGid?.properties?.title) {
      tab = byGid.properties.title;
    } else if (sheetsList.length === 1 && sheetsList[0].properties.title) {
      tab = sheetsList[0].properties.title;
    } else {
      throw new GoogleSheetsError(`Sheet chưa có tab "${tab}".`, 'NOT_FOUND', 404);
    }
  }
  const range = encodeURIComponent(`${quoteTab(tab)}!A1:ZZ`);
  const res = (await sheetsFetch(`${spreadsheetId}/values/${range}`)) as { values?: string[][] };
  const values = res.values || [];
  if (values.length === 0) return { header: [], rows: [] };

  let headerRowIdx = 0;
  const knownKeyTokens = new Set(['id kenh', 'id kenh tiktok', 'tiktok id', 'handle', 'kenh koc']);
  for (let idx = 0; idx < Math.min(15, values.length); idx++) {
    const rowTokens = (values[idx] || []).map(normHeaderToken);
    if (rowTokens.some(t => knownKeyTokens.has(t))) {
      headerRowIdx = idx;
      break;
    }
  }

  const header = (values[headerRowIdx] || []).map(h => String(h).trim());
  const rows = values.slice(headerRowIdx + 1).map(r => {
    const o: Record<string, string> = {};
    header.forEach((h, i) => {
      if (h) o[h] = String(r[i] ?? '').trim();
    });
    return o;
  });
  return { header, rows };
}

// Các cột nội bộ / nhạy cảm được gắn nhãn "Nội bộ / Ẩn cột đi" trên Template List KOC_TikTok - đã chốt (A..E, N, AW..BE)
const INTERNAL_SENSITIVE_HEADER_TOKENS = new Set([
  normHeaderToken(ROW_ID_COLUMN_HEADER),
  'rowid',
  'ma dong',
  'ngay dien',
  'thang',
  'nhan su dien',
  'dot',
  'store',
  'gia da hop tac truoc do',
  'email',
  'zalo',
  'nguoi nhan hang',
  'sdt nhan hang',
  'dia chi nhan hang',
  'ten tai khoan ngan hang',
  'so tai khoan',
  'ngan hang',
  'so cccd',
  'cccd',
]);

// Các cột thuộc giai đoạn Đi Air & Nghiệm thu 30 ngày
const ACCEPTANCE_STAGE_HEADER_TOKENS = new Set([
  'chi phi chot cuoi',
  'gia chot cuoi',
  'ngay air chot',
  'link nghiem thu',
  'link air nghiem thu',
  'ngay air thuc te',
  'ngay air (real)',
  'views 30 ngay',
  'views nghiem thu',
  'gmv 30 ngay',
  'gmv nghiem thu',
  'don hang 30 ngay',
  'don hang nghiem thu',
  'roi 30 ngay',
  'roi nghiem thu',
  'phi chiet khau san',
]);

export type SheetColumnPresetMode =
  | 'BRAND_REVIEW'     // Chế độ Gửi Brand duyệt Listing: Ẩn cột nội bộ/CCCD/STK + Ẩn cột Nghiệm thu + Ẩn RowID
  | 'AIR_ACCEPTANCE'   // Chế độ Theo dõi Đi Air & Nghiệm thu: Hiện cột Air/Nghiệm thu, vẫn ẩn cột nội bộ/CCCD/STK + RowID
  | 'FULL_TEMPLATE';   // Hiện toàn bộ các cột trên Sheet (chỉ ẩn cột kỹ thuật RowID)

export type SheetSortMode =
  | 'PRODUCT'          // Sắp xếp theo Sản phẩm (A -> Z), phụ theo Nhân sự điền
  | 'STAFF'            // Sắp xếp theo Nhân sự điền (A -> Z), phụ theo Sản phẩm
  | 'BATCH'            // Sắp xếp theo Đợt Listing (Đợt 1 -> Đợt 3), phụ theo Sản phẩm
  | 'BRAND_DECISION';  // Sắp xếp gom các dòng Brand chọn (Yes) lên đầu

export interface SheetMonthColumnStat {
  month: string;
  rowCount: number;
  collapsed: boolean;
}

function normalizeSheetMonthToken(raw: string): string {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  const mYyyyMm = s.match(/(20\d{2})\s*[\/\-_.]\s*(0?[1-9]|1[0-2])/);
  if (mYyyyMm) {
    return `${mYyyyMm[1]}/${mYyyyMm[2].padStart(2, '0')}`;
  }
  const mMmYyyy = s.match(/(0?[1-9]|1[0-2])\s*[\/\-_.]\s*(20\d{2})/);
  if (mMmYyyy) {
    return `${mMmYyyy[2]}/${mMmYyyy[1].padStart(2, '0')}`;
  }
  return s;
}

/**
 * Điều khiển trực tiếp bố cục & sắp xếp trên file Google Sheet (Template chung):
 * 1. Thu gọn / Mở rộng các dòng Tháng cũ theo Cột Tháng (Cột B) (`collapsedMonths`, `collapseOldMonthsBefore`, `expandAllMonths`).
 * 2. Ẩn / Hiện các nhóm cột trên Tab đang thao tác (`columnPreset` hoặc `customHiddenColumns`).
 * 3. Sắp xếp trực tiếp dữ liệu trên Google Sheet theo Sản phẩm / Nhân sự điền / Đợt (`sortBy`).
 * 4. Gắn sẵn nút Lọc (`Basic Filter`) ở hàng tiêu đề và tạo sẵn 4 `Filter Views` trên Google Sheet
 *    để người dùng mở file Google Sheet có thể bấm chọn xem/sắp xếp theo Sản phẩm hoặc Nhân sự ngay trên Sheet.
 */
export async function configureSpreadsheetTemplate(opts: {
  spreadsheetId: string;
  activeTab?: string;
  tabVisibility?: { title: string; hidden: boolean }[];
  collapsedMonths?: string[];
  collapseOldMonthsBefore?: string;
  expandAllMonths?: boolean;
  columnPreset?: SheetColumnPresetMode;
  customHiddenColumns?: string[];
  sortBy?: SheetSortMode;
  installFilterViews?: boolean;
}): Promise<{
  ok: boolean;
  updatedTabsCount: number;
  hiddenColumnsCount: number;
  collapsedRowsCount: number;
  monthColumnStats: SheetMonthColumnStat[];
  sortedBy?: SheetSortMode;
  filterViewsInstalled?: boolean;
  tabsDetail: SpreadsheetTabDetail[];
}> {
  const {
    spreadsheetId,
    activeTab,
    tabVisibility,
    collapsedMonths,
    collapseOldMonthsBefore,
    expandAllMonths,
    columnPreset,
    customHiddenColumns,
    sortBy,
    installFilterViews,
  } = opts;

  const meta = (await sheetsFetch(
    `${spreadsheetId}?fields=properties.title,sheets(properties(sheetId,title,hidden,index,gridProperties),filterViews,rowGroups)`
  )) as {
    properties?: { title?: string };
    sheets?: {
      properties?: {
        sheetId?: number;
        title?: string;
        hidden?: boolean;
        index?: number;
        gridProperties?: { rowCount?: number; columnCount?: number };
      };
      filterViews?: { filterViewId?: number; title?: string }[];
      rowGroups?: {
        range?: {
          sheetId?: number;
          dimension?: string;
          startIndex?: number;
          endIndex?: number;
        };
        depth?: number;
        collapsed?: boolean;
      }[];
    }[];
  };

  const sheets = meta.sheets || [];
  const requests: Record<string, unknown>[] = [];
  let updatedTabsCount = 0;
  let hiddenColumnsCount = 0;
  let collapsedRowsCount = 0;
  let filterViewsInstalled = false;
  const monthColumnStats: SheetMonthColumnStat[] = [];

  // 1. Ẩn / Hiện các Tab Tháng trên file Google Sheet
  if (Array.isArray(tabVisibility) && tabVisibility.length > 0) {
    const desiredMap = new Map(tabVisibility.map(t => [t.title.trim(), Boolean(t.hidden)]));
    // Đảm bảo luôn còn ít nhất 1 tab hiển thị (Google Sheets không cho phép ẩn 100% tab)
    const visibleRemainCount = sheets.filter(s => {
      const title = (s.properties?.title || '').trim();
      const nextHidden = desiredMap.has(title) ? desiredMap.get(title)! : Boolean(s.properties?.hidden);
      return !nextHidden;
    }).length;

    if (visibleRemainCount === 0) {
      throw new GoogleSheetsError('File Google Sheet phải giữ lại ít nhất 1 Tab hiển thị.', 'INVALID', 400);
    }

    for (const s of sheets) {
      const title = (s.properties?.title || '').trim();
      const sheetId = s.properties?.sheetId;
      if (!title || sheetId === undefined || !desiredMap.has(title)) continue;
      const nextHidden = desiredMap.get(title)!;
      if (Boolean(s.properties?.hidden) !== nextHidden) {
        requests.push({
          updateSheetProperties: {
            properties: { sheetId, hidden: nextHidden },
            fields: 'hidden',
          },
        });
        updatedTabsCount++;
      }
    }
  }

  // Nếu có thao tác trên activeTab (Thu gọn dòng theo Cột Tháng, Ẩn/Hiện cột, Sort theo Sản phẩm/Nhân sự, hoặc Cài đặt Filter Views)
  const resolvedTabName = (activeTab || sheets[0]?.properties?.title || '').trim();
  const hasMonthRowAction =
    Array.isArray(collapsedMonths) ||
    Boolean(collapseOldMonthsBefore) ||
    expandAllMonths === true;

  if (
    resolvedTabName &&
    (hasMonthRowAction || columnPreset || customHiddenColumns || sortBy || installFilterViews)
  ) {
    const targetSheet =
      sheets.find(s => (s.properties?.title || '').trim() === resolvedTabName) || sheets[0];
    const sheetId = targetSheet?.properties?.sheetId;
    const sheetTitle = (targetSheet?.properties?.title || resolvedTabName).trim();
    if (targetSheet && sheetId !== undefined && sheetTitle) {
      const range = encodeURIComponent(
        `${quoteTab(sheetTitle)}!A1:ZZ${hasMonthRowAction ? 2000 : 20}`
      );
      const res = (await sheetsFetch(`${spreadsheetId}/values/${range}`)) as { values?: string[][] };
      const values = res.values || [];

      let headerRowIdx = 0;
      const knownKeyTokens = new Set(['id kenh', 'id kenh tiktok', 'tiktok id', 'handle', 'kenh koc']);
      for (let idx = 0; idx < Math.min(15, values.length); idx++) {
        const rowTokens = (values[idx] || []).map(normHeaderToken);
        if (rowTokens.some(t => knownKeyTokens.has(t))) {
          headerRowIdx = idx;
          break;
        }
      }
      let header = (values[headerRowIdx] || []).map(h => String(h).trim()).filter(Boolean);

      // Nếu Tab trên Google Sheet đang trống (chưa có hàng tiêu đề), tự động khởi tạo chuẩn 57 cột Template (A -> BE + Row ID)
      if (header.length === 0) {
        header = [
          ...STAFF_LISTING_COLUMNS.filter(c => c.index <= 57).map(c => c.header),
          ROW_ID_COLUMN_HEADER,
        ];
        const currentColCount = targetSheet.properties?.gridProperties?.columnCount ?? 26;
        if (header.length > currentColCount) {
          await sheetsFetch(`${spreadsheetId}:batchUpdate`, {
            method: 'POST',
            body: JSON.stringify({
              requests: [
                {
                  appendDimension: {
                    sheetId,
                    dimension: 'COLUMNS',
                    length: header.length - currentColCount + 5,
                  },
                },
              ],
            }),
          }).catch(() => {});
        }
        await sheetsFetch(`${spreadsheetId}/values:batchUpdate`, {
          method: 'POST',
          body: JSON.stringify({
            valueInputOption: 'USER_ENTERED',
            data: [
              {
                range: `${quoteTab(sheetTitle)}!A1:${colLetter(header.length - 1)}1`,
                values: [header],
              },
            ],
          }),
        }).catch(() => {});
      }

      const findColIdx = (...candidates: string[]) => {
        for (const c of candidates) {
          const target = normHeaderToken(c);
          const found = header.findIndex(h => normHeaderToken(h) === target);
          if (found >= 0) return found;
        }
        return -1;
      };

      const monthColIdx = (() => {
        const found = findColIdx('Tháng', 'Thang', 'Month', 'Kỳ tháng');
        return found >= 0 ? found : 1; // Mặc định Cột B (index 1) là cột Tháng trên Template
      })();

      // 1b. Thu gọn / Mở rộng các dòng Tháng cũ dựa trên Cột Tháng (Cột B) trên Google Sheet
      if (hasMonthRowAction && values.length > headerRowIdx + 1) {
        const collapsedNormSet = new Set(
          (collapsedMonths || []).map(m => normalizeSheetMonthToken(m)).filter(Boolean)
        );
        const cutoffNorm = collapseOldMonthsBefore
          ? normalizeSheetMonthToken(collapseOldMonthsBefore)
          : '';

        // Xóa các nhóm dòng (Row Dimension Groups) cũ nếu có để tạo lại gọn gàng
        for (const rg of targetSheet.rowGroups || []) {
          if (rg.range && rg.range.startIndex !== undefined && rg.range.endIndex !== undefined) {
            requests.push({
              deleteDimensionGroup: {
                range: {
                  sheetId,
                  dimension: 'ROWS',
                  startIndex: rg.range.startIndex,
                  endIndex: rg.range.endIndex,
                },
              },
            });
          }
        }

        const monthCountMap = new Map<string, { count: number; collapsed: boolean }>();
        const rowDecision: { rowIdx: number; month: string; collapse: boolean }[] = [];

        for (let rIdx = headerRowIdx + 1; rIdx < values.length; rIdx++) {
          const rowArr = values[rIdx] || [];
          const hasAnyContent = rowArr.some(cell => String(cell ?? '').trim() !== '');
          if (!hasAnyContent) continue;

          const rawMonth = String(rowArr[monthColIdx] ?? '').trim();
          const normMonth = normalizeSheetMonthToken(rawMonth) || rawMonth;

          let shouldCollapse = false;
          if (expandAllMonths === true) {
            shouldCollapse = false;
          } else if (collapsedNormSet.size > 0) {
            shouldCollapse = Boolean(normMonth && collapsedNormSet.has(normMonth));
          } else if (cutoffNorm) {
            shouldCollapse = Boolean(normMonth && normMonth < cutoffNorm);
          }

          if (shouldCollapse) collapsedRowsCount++;
          rowDecision.push({ rowIdx: rIdx, month: normMonth, collapse: shouldCollapse });

          if (normMonth) {
            const prev = monthCountMap.get(normMonth) || { count: 0, collapsed: shouldCollapse };
            monthCountMap.set(normMonth, {
              count: prev.count + 1,
              collapsed: shouldCollapse,
            });
          }
        }

        Array.from(monthCountMap.entries())
          .sort((a, b) => b[0].localeCompare(a[0]))
          .forEach(([m, info]) => {
            monthColumnStats.push({
              month: m,
              rowCount: info.count,
              collapsed: info.collapsed,
            });
          });

        // Gom các dòng liên tiếp có cùng trạng thái collapse để gửi updateDimensionProperties + addDimensionGroup
        let i = 0;
        while (i < rowDecision.length) {
          const startRow = rowDecision[i].rowIdx;
          const collapseVal = rowDecision[i].collapse;
          let endRow = startRow + 1;
          while (
            i + 1 < rowDecision.length &&
            rowDecision[i + 1].rowIdx === endRow &&
            rowDecision[i + 1].collapse === collapseVal
          ) {
            endRow++;
            i++;
          }

          requests.push({
            updateDimensionProperties: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: startRow,
                endIndex: endRow,
              },
              properties: { hiddenByUser: collapseVal },
              fields: 'hiddenByUser',
            },
          });

          if (collapseVal) {
            requests.push({
              addDimensionGroup: {
                range: {
                  sheetId,
                  dimension: 'ROWS',
                  startIndex: startRow,
                  endIndex: endRow,
                },
              },
            });
          }
          i++;
        }
      }

      // 2. Ẩn / Hiện cột trên Google Sheet theo chế độ Template
      if (columnPreset || Array.isArray(customHiddenColumns)) {
        const customHiddenNorms = new Set((customHiddenColumns || []).map(normHeaderToken));
        header.forEach((colName, colIdx) => {
          const norm = normHeaderToken(colName);
          let shouldHide = false;
          if (Array.isArray(customHiddenColumns)) {
            shouldHide =
              customHiddenNorms.has(norm) ||
              norm === normHeaderToken(ROW_ID_COLUMN_HEADER) ||
              norm === 'rowid';
          } else if (columnPreset === 'BRAND_REVIEW') {
            shouldHide =
              INTERNAL_SENSITIVE_HEADER_TOKENS.has(norm) ||
              ACCEPTANCE_STAGE_HEADER_TOKENS.has(norm);
          } else if (columnPreset === 'AIR_ACCEPTANCE') {
            shouldHide = INTERNAL_SENSITIVE_HEADER_TOKENS.has(norm);
          } else if (columnPreset === 'FULL_TEMPLATE') {
            shouldHide = norm === normHeaderToken(ROW_ID_COLUMN_HEADER) || norm === 'rowid';
          }
          if (shouldHide) hiddenColumnsCount++;
          requests.push({
            updateDimensionProperties: {
              range: {
                sheetId,
                dimension: 'COLUMNS',
                startIndex: colIdx,
                endIndex: colIdx + 1,
              },
              properties: { hiddenByUser: shouldHide },
              fields: 'hiddenByUser',
            },
          });
        });
      }

      const productColIdx = findColIdx('Sản phẩm', 'Tên sản phẩm');
      const staffColIdx = findColIdx('Nhân sự điền', 'PIC', 'Nhân sự phụ trách');
      const dotColIdx = findColIdx('Đợt', 'Đợt Listing');
      const brandColIdx = findColIdx('Brand chọn', 'Brand duyệt', 'Kết quả Brand');

      // 3. Sắp xếp (Sort) trực tiếp các dòng trên File Google Sheet
      if (sortBy && header.length > 0) {
        const sortSpecs: { dimensionIndex: number; sortOrder: 'ASCENDING' | 'DESCENDING' }[] = [];
        if (sortBy === 'PRODUCT' && productColIdx >= 0) {
          sortSpecs.push({ dimensionIndex: productColIdx, sortOrder: 'ASCENDING' });
          if (staffColIdx >= 0) sortSpecs.push({ dimensionIndex: staffColIdx, sortOrder: 'ASCENDING' });
        } else if (sortBy === 'STAFF' && staffColIdx >= 0) {
          sortSpecs.push({ dimensionIndex: staffColIdx, sortOrder: 'ASCENDING' });
          if (productColIdx >= 0) sortSpecs.push({ dimensionIndex: productColIdx, sortOrder: 'ASCENDING' });
        } else if (sortBy === 'BATCH' && dotColIdx >= 0) {
          sortSpecs.push({ dimensionIndex: dotColIdx, sortOrder: 'ASCENDING' });
          if (productColIdx >= 0) sortSpecs.push({ dimensionIndex: productColIdx, sortOrder: 'ASCENDING' });
        } else if (sortBy === 'BRAND_DECISION' && brandColIdx >= 0) {
          sortSpecs.push({ dimensionIndex: brandColIdx, sortOrder: 'DESCENDING' });
          if (productColIdx >= 0) sortSpecs.push({ dimensionIndex: productColIdx, sortOrder: 'ASCENDING' });
        }

        if (sortSpecs.length > 0) {
          requests.push({
            sortRange: {
              range: {
                sheetId,
                startRowIndex: headerRowIdx + 1,
                startColumnIndex: 0,
                endColumnIndex: Math.max(header.length, 1),
              },
              sortSpecs,
            },
          });
        }
      }

      // 4. Gắn nút Lọc (Basic Filter) + Tạo sẵn các Filter Views trên Google Sheet
      if (installFilterViews && header.length > 0) {
        // Cố định dòng tiêu đề (Freeze header row) + bật Basic Filter trên dòng tiêu đề
        requests.push({
          updateSheetProperties: {
            properties: {
              sheetId,
              gridProperties: {
                frozenRowCount: headerRowIdx + 1,
              },
            },
            fields: 'gridProperties.frozenRowCount',
          },
        });

        requests.push({
          setBasicFilter: {
            filter: {
              range: {
                sheetId,
                startRowIndex: headerRowIdx,
                startColumnIndex: 0,
                endColumnIndex: header.length,
              },
            },
          },
        });

        // Xóa các Filter View [UpBase] cũ nếu đã tạo trước đó để tránh trùng tên
        for (const fv of targetSheet.filterViews || []) {
          if (fv.filterViewId !== undefined && (fv.title || '').startsWith('[UpBase]')) {
            requests.push({
              deleteFilterView: {
                filterId: fv.filterViewId,
              },
            });
          }
        }

        const baseFilterRange = {
          sheetId,
          startRowIndex: headerRowIdx,
          startColumnIndex: 0,
          endColumnIndex: header.length,
        };

        if (productColIdx >= 0) {
          requests.push({
            addFilterView: {
              filter: {
                title: '[UpBase] 1. Sắp xếp theo Sản phẩm (A -> Z)',
                range: baseFilterRange,
                sortSpecs: [
                  { dimensionIndex: productColIdx, sortOrder: 'ASCENDING' },
                  ...(staffColIdx >= 0 ? [{ dimensionIndex: staffColIdx, sortOrder: 'ASCENDING' }] : []),
                ],
              },
            },
          });
        }

        if (staffColIdx >= 0) {
          requests.push({
            addFilterView: {
              filter: {
                title: '[UpBase] 2. Sắp xếp theo Nhân sự điền (A -> Z)',
                range: baseFilterRange,
                sortSpecs: [
                  { dimensionIndex: staffColIdx, sortOrder: 'ASCENDING' },
                  ...(productColIdx >= 0 ? [{ dimensionIndex: productColIdx, sortOrder: 'ASCENDING' }] : []),
                ],
              },
            },
          });
        }

        if (dotColIdx >= 0) {
          requests.push({
            addFilterView: {
              filter: {
                title: '[UpBase] 3. Sắp xếp theo Đợt Listing',
                range: baseFilterRange,
                sortSpecs: [{ dimensionIndex: dotColIdx, sortOrder: 'ASCENDING' }],
              },
            },
          });
        }

        if (brandColIdx >= 0) {
          requests.push({
            addFilterView: {
              filter: {
                title: '[UpBase] 4. Chỉ hiện KOC Brand đã chọn (Yes)',
                range: baseFilterRange,
                criteria: {
                  [brandColIdx]: {
                    condition: {
                      type: 'TEXT_EQ',
                      values: [{ userEnteredValue: 'Yes' }],
                    },
                  },
                },
              },
            },
          });
        }

        filterViewsInstalled = true;
      }
    }
  }

  if (requests.length > 0) {
    await sheetsFetch(`${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ requests }),
    });
  }

  const updatedMeta = await listSpreadsheetTabs(spreadsheetId);
  return {
    ok: true,
    updatedTabsCount,
    hiddenColumnsCount,
    collapsedRowsCount,
    monthColumnStats,
    sortedBy: sortBy,
    filterViewsInstalled,
    tabsDetail: updatedMeta.tabsDetail,
  };
}
