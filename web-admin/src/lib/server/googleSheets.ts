// Ghi dữ liệu lên Google Sheet bằng tài khoản dịch vụ (service account), không dùng thư viện ngoài.
// Cấu hình: GOOGLE_SERVICE_ACCOUNT_EMAIL và GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (khóa riêng, xuống dòng viết \n).
import { createSign } from 'node:crypto';

export class GoogleSheetsError extends Error {
  constructor(
    message: string,
    public readonly code: 'NOT_CONFIGURED' | 'FORBIDDEN' | 'NOT_FOUND' | 'INVALID' | 'FAILED',
    public readonly status = 500
  ) {
    super(message);
  }
}

export function getServiceAccount() {
  const email = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
  const key = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim();
  return { email, key, configured: Boolean(email && key) };
}

export const isGoogleSheetsConfigured = () => getServiceAccount().configured;

export function parseSpreadsheetId(url: string): string | null {
  const m = url.match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/);
  return m ? m[1] : null;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

const b64url = (v: string | Buffer) => Buffer.from(v).toString('base64url');

async function getAccessToken(): Promise<string> {
  const sa = getServiceAccount();
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

export interface AppendResult {
  added: number;
  skipped: number;
  createdTab: boolean;
  writtenHeader: boolean;
}

/**
 * Thêm các dòng mới vào một tab, giữ nguyên những gì Brand đã điền.
 * Dòng đã có (trùng cột khóa) bị bỏ qua. Cột của sheet được căn theo tên cột, cột lạ để trống.
 */
export async function appendNewRows(opts: {
  spreadsheetId: string;
  tab: string;
  columns: string[];
  rows: (string | number)[][];
  keyColumn: string;
}): Promise<AppendResult> {
  const { spreadsheetId, tab, columns, rows, keyColumn } = opts;
  if (!tab.trim() || tab.length > 100) throw new GoogleSheetsError('Tên tab không hợp lệ.', 'INVALID', 400);
  const keyIdx = columns.indexOf(keyColumn);
  if (keyIdx < 0) throw new GoogleSheetsError('Thiếu cột khóa.', 'INVALID', 400);

  const meta = (await sheetsFetch(`${spreadsheetId}?fields=sheets.properties.title`)) as { sheets?: { properties: { title: string } }[] };
  const exists = (meta.sheets || []).some(s => s.properties.title === tab);
  if (!exists) {
    await sheetsFetch(`${spreadsheetId}:batchUpdate`, { method: 'POST', body: JSON.stringify({ requests: [{ addSheet: { properties: { title: tab } } }] }) });
  }

  const range = encodeURIComponent(`${quoteTab(tab)}!A1:ZZ`);
  const current = exists ? ((await sheetsFetch(`${spreadsheetId}/values/${range}`)) as { values?: string[][] }) : { values: [] };
  const values = current.values || [];
  const sheetHeader = (values[0] || []).map(h => String(h).trim());
  const hasHeader = sheetHeader.length > 0;

  const header = hasHeader ? sheetHeader : columns;
  const sheetKeyIdx = header.indexOf(keyColumn);
  const existingKeys = new Set<string>();
  if (hasHeader && sheetKeyIdx >= 0) {
    for (const r of values.slice(1)) {
      const k = keyOf(r[sheetKeyIdx]);
      if (k) existingKeys.add(k);
    }
  }

  const fresh = rows.filter(r => !existingKeys.has(keyOf(r[keyIdx])));
  const aligned = fresh.map(r => header.map(h => {
    const i = columns.indexOf(h);
    return i >= 0 ? r[i] : '';
  }));

  const payload: (string | number)[][] = hasHeader ? aligned : [columns, ...aligned];
  if (payload.length > 0) {
    await sheetsFetch(`${spreadsheetId}/values/${encodeURIComponent(`${quoteTab(tab)}!A1`)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
      method: 'POST',
      body: JSON.stringify({ values: payload }),
    });
  }
  return { added: fresh.length, skipped: rows.length - fresh.length, createdTab: !exists, writtenHeader: !hasHeader };
}

/** Đọc toàn bộ một tab: dòng đầu là tên cột. Trả về mảng đối tượng theo tên cột. */
export async function readTab(opts: { spreadsheetId: string; tab: string }): Promise<{ header: string[]; rows: Record<string, string>[] }> {
  const { spreadsheetId, tab } = opts;
  if (!tab.trim() || tab.length > 100) throw new GoogleSheetsError('Tên tab không hợp lệ.', 'INVALID', 400);
  const meta = (await sheetsFetch(`${spreadsheetId}?fields=sheets.properties.title`)) as { sheets?: { properties: { title: string } }[] };
  if (!(meta.sheets || []).some(s => s.properties.title === tab)) throw new GoogleSheetsError(`Sheet chưa có tab "${tab}".`, 'NOT_FOUND', 404);
  const range = encodeURIComponent(`${quoteTab(tab)}!A1:ZZ`);
  const res = (await sheetsFetch(`${spreadsheetId}/values/${range}`)) as { values?: string[][] };
  const values = res.values || [];
  const header = (values[0] || []).map(h => String(h).trim());
  const rows = values.slice(1).map(r => {
    const o: Record<string, string> = {};
    header.forEach((h, i) => {
      if (h) o[h] = String(r[i] ?? '').trim();
    });
    return o;
  });
  return { header, rows };
}
