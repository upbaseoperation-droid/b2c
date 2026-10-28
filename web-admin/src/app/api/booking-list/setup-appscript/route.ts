import { NextRequest, NextResponse } from 'next/server';
import { parseSpreadsheetId } from '@/lib/server/googleSheets';
import { readRecord, upsertRecord } from '@/lib/server/sharedRecords';

export const dynamic = 'force-dynamic';

const OAUTH_CONFIG_RECORD_KEY = 'google-appscript-oauth-config-v1';
const INSTALLED_MAP_RECORD_KEY = 'google-appscript-installed-map-v1';

export interface StoredAppsScriptOAuthConfig {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  customScriptCode?: string;
  updatedAt?: string;
}

export interface InstalledScriptMeta {
  spreadsheetId: string;
  scriptId: string;
  storeName?: string;
  sheetUrl?: string;
  installedAt: string;
}

let memoryOAuthConfig: StoredAppsScriptOAuthConfig = {};
let memoryInstalledMap: Record<string, InstalledScriptMeta> = {};

const DEFAULT_UPBASE_BRAND_TIMESTAMP_APPS_SCRIPT = `/**
 * UpBase B2C - Tự động đóng dấu Thời gian Brand duyệt (TG Brand duyệt)
 * Khi Brand chọn Yes / No / Cân nhắc tại cột "Brand chọn", hệ thống tự động
 * ghi ngày giờ thực tế (dd/MM/yyyy HH:mm - GMT+7) vào cột "TG Brand duyệt".
 */
function onEdit(e) {
  if (!e || !e.range) return;
  var sheet = e.range.getSheet();
  var row = e.range.getRow();
  var col = e.range.getColumn();

  // Bỏ qua các dòng tiêu đề (dòng 1 -> dòng 3 theo mẫu chuẩn UpBase)
  if (row <= 3) return;

  var lastCol = Math.max(sheet.getLastColumn(), col);
  var row3Values = sheet.getRange(3, 1, 1, lastCol).getValues()[0];
  var row1Values = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  function normalizeHeader(text) {
    return String(text || '')
      .replace(/[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]/g, '')
      .replace(/\\s*\\(bổ sung thêm\\)/gi, '')
      .trim()
      .toLowerCase();
  }

  var headerRowIndex = 3;
  var headers = row3Values.map(normalizeHeader);
  var hasBrandColInRow3 = headers.some(function (h) {
    return h === 'brand chọn' || h === 'brand chon' || h === 'brand duyệt' || h === 'kết quả brand';
  });

  if (!hasBrandColInRow3) {
    headerRowIndex = 1;
    headers = row1Values.map(normalizeHeader);
  }

  var brandColIdx = -1;
  for (var i = 0; i < headers.length; i++) {
    var h = headers[i];
    if (h === 'brand chọn' || h === 'brand chon' || h === 'brand duyệt' || h === 'kết quả brand') {
      brandColIdx = i + 1;
      break;
    }
  }

  if (brandColIdx === -1 || col !== brandColIdx) return;

  // Tìm cột "TG Brand duyệt" (nếu chưa có thì tự động tạo ở cột trống cuối bảng)
  var timeColIdx = -1;
  for (var j = 0; j < headers.length; j++) {
    var th = headers[j];
    if (
      th === 'tg brand duyệt' ||
      th === 'thời gian brand duyệt' ||
      th === 'ngày brand duyệt' ||
      th === 'ngay brand duyet'
    ) {
      timeColIdx = j + 1;
      break;
    }
  }

  if (timeColIdx === -1) {
    timeColIdx = lastCol + 1;
    sheet.getRange(headerRowIndex, timeColIdx).setValue('TG Brand duyệt');
  }

  var rawVal = String(e.range.getValue() || '').trim().toLowerCase();
  var isReviewed =
    rawVal === 'yes' ||
    rawVal === 'no' ||
    rawVal === 'cân nhắc' ||
    rawVal === 'can nhac' ||
    rawVal === 'duyệt' ||
    rawVal === 'từ chối' ||
    rawVal === 'đồng ý';

  var timeCell = sheet.getRange(row, timeColIdx);
  if (isReviewed) {
    var nowStr = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm');
    timeCell.setValue(nowStr);
  } else if (!rawVal || rawVal === 'chờ duyệt' || rawVal === 'cho duyet') {
    timeCell.setValue('');
  }
}
`;

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

async function loadOAuthConfig(): Promise<{
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  customScriptCode: string;
  configured: boolean;
  source: 'env' | 'db' | 'none';
}> {
  const envClientId = (process.env.GOOGLE_OAUTH_CLIENT_ID || '').trim();
  const envClientSecret = (process.env.GOOGLE_OAUTH_CLIENT_SECRET || '').trim();
  const envRefreshToken = (process.env.GOOGLE_OAUTH_REFRESH_TOKEN || '').trim();

  if (envClientId && envClientSecret && envRefreshToken) {
    return {
      clientId: envClientId,
      clientSecret: envClientSecret,
      refreshToken: envRefreshToken,
      customScriptCode: memoryOAuthConfig.customScriptCode || DEFAULT_UPBASE_BRAND_TIMESTAMP_APPS_SCRIPT,
      configured: true,
      source: 'env',
    };
  }

  try {
    const rec = await readRecord<StoredAppsScriptOAuthConfig>(OAUTH_CONFIG_RECORD_KEY, {});
    if (rec.data && (rec.data.clientId || rec.data.refreshToken || rec.data.customScriptCode)) {
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
  const customScriptCode = (
    memoryOAuthConfig.customScriptCode || DEFAULT_UPBASE_BRAND_TIMESTAMP_APPS_SCRIPT
  ).trim();

  return {
    clientId,
    clientSecret,
    refreshToken,
    customScriptCode,
    configured: Boolean(clientId && clientSecret && refreshToken),
    source: clientId && clientSecret && refreshToken ? 'db' : 'none',
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

  // 1. Nếu đã có scriptId trước đó, thử cập nhật nội dung trực tiếp
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

  // 2. Tạo mới Container-bound Apps Script Project gắn trực tiếp vào parentId = spreadsheetId
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

  // 3. Đẩy nội dung Code.gs (onEdit) + appsscript.json vào project vừa tạo
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

export async function GET() {
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
    scriptCode: cfg.customScriptCode || DEFAULT_UPBASE_BRAND_TIMESTAMP_APPS_SCRIPT,
    defaultScriptCode: DEFAULT_UPBASE_BRAND_TIMESTAMP_APPS_SCRIPT,
    installedMap,
  });
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      clientId?: string;
      clientSecret?: string;
      refreshToken?: string;
      customScriptCode?: string;
      verifyToken?: boolean;
    };

    const current = await loadOAuthConfig();
    const nextClientId =
      body.clientId !== undefined ? body.clientId.trim() : current.clientId;
    const nextClientSecret =
      body.clientSecret !== undefined ? body.clientSecret.trim() : current.clientSecret;
    const nextRefreshToken =
      body.refreshToken !== undefined ? body.refreshToken.trim() : current.refreshToken;
    const nextScriptCode =
      body.customScriptCode !== undefined && body.customScriptCode.trim()
        ? body.customScriptCode.trim()
        : current.customScriptCode || DEFAULT_UPBASE_BRAND_TIMESTAMP_APPS_SCRIPT;

    if (body.verifyToken !== false && (nextClientId || nextClientSecret || nextRefreshToken)) {
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
      customScriptCode: nextScriptCode,
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
      scriptCode: nextScriptCode,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Không lưu được cấu hình Google Apps Script API.',
      },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      targets?: Array<{ storeName?: string; sheetUrl: string }>;
      sheetUrl?: string;
      storeName?: string;
      scriptCode?: string;
    };

    const rawTargets = Array.isArray(body.targets)
      ? body.targets
      : body.sheetUrl
        ? [{ storeName: body.storeName || 'Gian hàng', sheetUrl: body.sheetUrl }]
        : [];

    if (rawTargets.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Chưa có link Google Sheet nào được chọn để cài đặt Apps Script.' },
        { status: 400 }
      );
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

    const scriptCodeToPush =
      (body.scriptCode || '').trim() ||
      cfg.customScriptCode ||
      DEFAULT_UPBASE_BRAND_TIMESTAMP_APPS_SCRIPT;

    const installedMap = await loadInstalledMap();
    const results: Array<{
      storeName: string;
      sheetUrl: string;
      spreadsheetId: string;
      ok: boolean;
      scriptId?: string;
      mode?: 'CREATED' | 'UPDATED';
      error?: string;
    }> = [];

    // Khử trùng lặp theo spreadsheetId để 1 file Google Sheet dùng chung cho nhiều gian không bị tạo 2 project
    const seenSpreadsheetIds = new Map<string, { scriptId: string; mode: 'CREATED' | 'UPDATED' }>();

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

      const cachedInBatch = seenSpreadsheetIds.get(spreadsheetId);
      if (cachedInBatch) {
        results.push({
          storeName: storeLabel,
          sheetUrl: url,
          spreadsheetId,
          ok: true,
          scriptId: cachedInBatch.scriptId,
          mode: cachedInBatch.mode,
        });
        continue;
      }

      try {
        const existingMeta = installedMap[spreadsheetId];
        const deployed = await deployBoundAppsScriptToSpreadsheet({
          accessToken,
          spreadsheetId,
          existingScriptId: existingMeta?.scriptId,
          scriptCode: scriptCodeToPush,
          projectTitle: `UpBase_AutoBrandTimestamp_${storeLabel.slice(0, 32)}`,
        });

        seenSpreadsheetIds.set(spreadsheetId, deployed);
        installedMap[spreadsheetId] = {
          spreadsheetId,
          scriptId: deployed.scriptId,
          storeName: storeLabel,
          sheetUrl: url,
          installedAt: new Date().toISOString(),
        };

        results.push({
          storeName: storeLabel,
          sheetUrl: url,
          spreadsheetId,
          ok: true,
          scriptId: deployed.scriptId,
          mode: deployed.mode,
        });
      } catch (err) {
        results.push({
          storeName: storeLabel,
          sheetUrl: url,
          spreadsheetId,
          ok: false,
          error: err instanceof Error ? err.message : 'Lỗi khi đẩy Apps Script',
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
        error: err instanceof Error ? err.message : 'Không thể đẩy Apps Script lên Google Sheet.',
      },
      { status: 500 }
    );
  }
}
