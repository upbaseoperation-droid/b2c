/**
 * Lưu trữ tệp thương hiệu trên Cloudflare R2 (tương thích S3 API, ký xác thực AWS Signature V4).
 * Khi môi trường phát triển chưa cấu hình biến môi trường R2, tự động lưu vào thư mục cục bộ `.brand-data/files`.
 */

import { createHash, createHmac, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { BrandError, requireBrand } from './domain';
import { brandKey } from './types';

export const MAX_BRAND_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.ppt', '.pptx',
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.zip', '.txt',
]);

const EXTENSION_MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.csv': 'text/csv',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.zip': 'application/zip',
  '.txt': 'text/plain; charset=utf-8',
};

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
  publicUrl?: string;
}

export type R2ConfigSource = 'UI_CONFIG' | 'ENV' | 'NONE';

export interface R2ConnectionTestResult {
  ok: boolean;
  status: number;
  latencyMs: number;
  testedAt: string;
  message: string;
  bucket: string;
  endpoint: string;
  writeVerified: boolean;
  readVerified: boolean;
  deleteVerified: boolean;
}

export interface PersistedR2ConfigRecord {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
  publicUrl?: string;
  updatedAt: string;
  updatedBy?: string;
  lastTest?: R2ConnectionTestResult;
}

export interface StoredBrandFile {
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storage: 'R2' | 'LOCAL';
  url: string;
}

const brandDataBaseDir = () =>
  path.resolve(/*turbopackIgnore: true*/ process.env.BRAND_DATA_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), '.brand-data'));

const localFilesDir = () => path.join(brandDataBaseDir(), 'files');
const r2ConfigFilePath = () => path.join(brandDataBaseDir(), 'r2-config.json');

let runtimeConfigCache: { dir: string; record: PersistedR2ConfigRecord | null } | null = null;

/**
 * Chuẩn hóa Account ID, S3 Endpoint và Bucket Name (tự động xử lý trường hợp người dùng
 * dán nguyên URL có đuôi `/<bucket>` từ trang Cloudflare Dashboard).
 */
export function normalizeR2ConnectionInput(input: {
  accountId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucket?: string;
  endpoint?: string;
  publicUrl?: string;
}): R2Config | null {
  let accountId = (input.accountId || '').trim();
  const accessKeyId = (input.accessKeyId || '').trim();
  const secretAccessKey = (input.secretAccessKey || '').trim();
  let bucket = (input.bucket || '').trim();
  let rawEndpoint = (input.endpoint || '').trim().replace(/\/+$/, '');

  if (rawEndpoint) {
    try {
      const parsed = new URL(/^https?:\/\//i.test(rawEndpoint) ? rawEndpoint : `https://${rawEndpoint}`);
      const hostMatch = parsed.hostname.match(/^([a-z0-9]+)(?:\.[a-z0-9-]+)?\.r2\.cloudflarestorage\.com$/i);
      if (hostMatch && !accountId) {
        accountId = hostMatch[1];
      }
      const pathSegments = parsed.pathname.split('/').filter(Boolean);
      if (pathSegments.length === 1 && (!bucket || pathSegments[0] === bucket)) {
        if (!bucket) bucket = pathSegments[0];
        rawEndpoint = parsed.origin;
      } else {
        rawEndpoint = `${parsed.origin}${parsed.pathname.replace(/\/+$/, '')}`;
      }
    } catch {
      return null;
    }
  } else if (accountId) {
    rawEndpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  }

  if (!accessKeyId || !secretAccessKey || !bucket || !rawEndpoint) {
    return null;
  }

  const publicUrl = (input.publicUrl || '').trim().replace(/\/+$/, '') || undefined;
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    endpoint: rawEndpoint,
    publicUrl,
  };
}

function loadPersistedR2Record(): PersistedR2ConfigRecord | null {
  const currentDir = brandDataBaseDir();
  if (runtimeConfigCache && runtimeConfigCache.dir === currentDir) {
    return runtimeConfigCache.record;
  }
  const filePath = r2ConfigFilePath();
  if (!existsSync(filePath)) {
    runtimeConfigCache = { dir: currentDir, record: null };
    return null;
  }
  try {
    const raw = readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as PersistedR2ConfigRecord;
    const valid = normalizeR2ConnectionInput(parsed);
    if (!valid) {
      runtimeConfigCache = { dir: currentDir, record: null };
      return null;
    }
    const record: PersistedR2ConfigRecord = {
      ...valid,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      updatedBy: parsed.updatedBy,
      lastTest: parsed.lastTest,
    };
    runtimeConfigCache = { dir: currentDir, record };
    return record;
  } catch {
    runtimeConfigCache = { dir: currentDir, record: null };
    return null;
  }
}

export function getR2ConfigWithSource(): {
  config: R2Config | null;
  source: R2ConfigSource;
  updatedAt?: string;
  updatedBy?: string;
  lastTest?: R2ConnectionTestResult;
} {
  const persisted = loadPersistedR2Record();
  if (persisted) {
    return {
      config: {
        accountId: persisted.accountId,
        accessKeyId: persisted.accessKeyId,
        secretAccessKey: persisted.secretAccessKey,
        bucket: persisted.bucket,
        endpoint: persisted.endpoint,
        publicUrl: persisted.publicUrl,
      },
      source: 'UI_CONFIG',
      updatedAt: persisted.updatedAt,
      updatedBy: persisted.updatedBy,
      lastTest: persisted.lastTest,
    };
  }

  const envConfig = normalizeR2ConnectionInput({
    accountId: process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucket: process.env.R2_BUCKET_NAME || '',
    endpoint: process.env.R2_ENDPOINT || '',
    publicUrl: process.env.R2_PUBLIC_URL || '',
  });

  if (envConfig) {
    return { config: envConfig, source: 'ENV' };
  }

  return { config: null, source: 'NONE' };
}

export function getR2Config(): R2Config | null {
  return getR2ConfigWithSource().config;
}

export function r2Configured(): boolean {
  return getR2Config() !== null;
}

export function brandFileStorageMode(): 'CLOUDFLARE_R2' | 'LOCAL_STORAGE' {
  return r2Configured() ? 'CLOUDFLARE_R2' : 'LOCAL_STORAGE';
}

export async function saveRuntimeR2Config(
  input: {
    accountId?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    bucket?: string;
    endpoint?: string;
    publicUrl?: string;
    updatedBy?: string;
    lastTest?: R2ConnectionTestResult;
  },
): Promise<PersistedR2ConfigRecord> {
  const existing = loadPersistedR2Record() || getR2ConfigWithSource().config;
  const secretToUse = (input.secretAccessKey || '').trim() || existing?.secretAccessKey || '';
  const normalized = normalizeR2ConnectionInput({
    accountId: input.accountId ?? existing?.accountId,
    accessKeyId: input.accessKeyId ?? existing?.accessKeyId,
    secretAccessKey: secretToUse,
    bucket: input.bucket ?? existing?.bucket ?? 'upbase-b2c-brands',
    endpoint: input.endpoint ?? existing?.endpoint,
    publicUrl: input.publicUrl !== undefined ? input.publicUrl : existing?.publicUrl,
  });

  requireBrand(
    normalized !== null,
    'Vui lòng điền đầy đủ Account ID (hoặc S3 Endpoint), Tên Bucket, Access Key ID và Secret Access Key.',
    400,
  );

  const record: PersistedR2ConfigRecord = {
    ...normalized!,
    updatedAt: new Date().toISOString(),
    updatedBy: input.updatedBy || 'Quản trị viên',
    lastTest: input.lastTest ?? loadPersistedR2Record()?.lastTest,
  };

  const baseDir = brandDataBaseDir();
  await mkdir(baseDir, { recursive: true });
  await writeFile(r2ConfigFilePath(), JSON.stringify(record, null, 2), { mode: 0o600 });
  runtimeConfigCache = { dir: baseDir, record };
  return record;
}

export async function clearRuntimeR2Config(): Promise<void> {
  const baseDir = brandDataBaseDir();
  runtimeConfigCache = { dir: baseDir, record: null };
  await unlink(r2ConfigFilePath()).catch(() => undefined);
}

/** Làm sạch tên tệp và kiểm tra định dạng được phép tải lên. */
export function validateAndSanitizeFile(originalName: string, byteLength: number, mimeType?: string): { safeName: string; ext: string; contentType: string } {
  requireBrand(byteLength > 0, 'Tệp tải lên đang trống.');
  requireBrand(byteLength <= MAX_BRAND_FILE_BYTES, 'Dung lượng tệp vượt mức tối đa 25 MB.', 413);

  const trimmed = (originalName || '').trim();
  requireBrand(trimmed.length > 0, 'Thiếu tên tệp tải lên.');

  const ext = path.extname(trimmed).toLowerCase();
  requireBrand(
    ALLOWED_EXTENSIONS.has(ext),
    `Định dạng tệp "${ext || 'không rõ'}" không được hỗ trợ. Chỉ nhận PDF, Word, Excel, PowerPoint, ảnh, ZIP, TXT.`,
  );

  const baseName = path.basename(trimmed, path.extname(trimmed))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'tai-lieu';

  const safeName = `${baseName}${ext}`;
  const contentType = EXTENSION_MIME[ext] || (mimeType && /^[\w.+-]+\/[\w.+-]+$/.test(mimeType) ? mimeType : 'application/octet-stream');
  return { safeName, ext, contentType };
}

/** Tạo khóa lưu trữ chuẩn `brands/<brandKey>/<yyyy-mm>/<uuid>-<safeName>`. */
export function buildBrandFileKey(brandName: string, safeName: string, now = new Date()): string {
  const bKey = brandKey(brandName);
  requireBrand(bKey.length > 0, 'Tên thương hiệu không hợp lệ.');
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  return `brands/${bKey}/${month}/${randomUUID().slice(0, 8)}-${safeName}`;
}

/** Kiểm tra khóa tệp hợp lệ, chặn truy cập vượt thư mục (`..`). */
export function assertValidBrandFileKey(key: string): string {
  const cleaned = (key || '').trim().replace(/^\/+/, '');
  requireBrand(
    /^brands\/[a-z0-9-]+\/\d{4}-\d{2}\/[a-zA-Z0-9._-]+$/.test(cleaned) && !cleaned.includes('..'),
    'Đường dẫn tệp thương hiệu không hợp lệ.',
    400,
  );
  return cleaned;
}

/* ------------------------------------------------------- Ký xác thực AWS Signature V4 cho Cloudflare R2 */

function rfc3986(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function sha256Hex(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}

export function signR2Request(params: {
  method: 'PUT' | 'GET' | 'DELETE';
  config: R2Config;
  key: string;
  query?: Record<string, string>;
  body?: Buffer;
  contentType?: string;
  now?: Date;
}): { url: string; headers: Record<string, string> } {
  const { method, config, key, query, body, contentType, now = new Date() } = params;
  const endpointUrl = new URL(config.endpoint);
  const host = endpointUrl.host;
  const basePath = endpointUrl.pathname.replace(/\/+$/, '');
  const encodedKey = key ? key.split('/').map(rfc3986).join('/') : '';
  const canonicalUri = encodedKey
    ? `${basePath}/${rfc3986(config.bucket)}/${encodedKey}`
    : `${basePath}/${rfc3986(config.bucket)}`;
  const canonicalQueryString = query
    ? Object.keys(query)
        .sort()
        .map(k => `${rfc3986(k)}=${rfc3986(query[k])}`)
        .join('&')
    : '';

  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const region = 'auto';
  const service = 's3';
  const payloadHash = sha256Hex(body || Buffer.alloc(0));

  const headerMap: Record<string, string> = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  if (contentType) {
    headerMap['content-type'] = contentType;
  }

  const sortedHeaderKeys = Object.keys(headerMap).sort();
  const canonicalHeaders = sortedHeaderKeys.map(k => `${k}:${headerMap[k].trim()}\n`).join('');
  const signedHeaders = sortedHeaderKeys.join(';');

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const kDate = hmacSha256(`AWS4${config.secretAccessKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  const kSigning = hmacSha256(kService, 'aws4_request');
  const signature = createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');

  const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const requestHeaders: Record<string, string> = {
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    Authorization: authorization,
  };
  if (contentType) {
    requestHeaders['Content-Type'] = contentType;
  }

  const fullUrl = canonicalQueryString
    ? `${endpointUrl.origin}${canonicalUri}?${canonicalQueryString}`
    : `${endpointUrl.origin}${canonicalUri}`;

  return {
    url: fullUrl,
    headers: requestHeaders,
  };
}

/* ------------------------------------------------------- Thao tác tải lên / đọc / xóa tệp */

export async function uploadBrandFile(params: {
  brandName: string;
  originalName: string;
  mimeType?: string;
  buffer: Buffer;
}): Promise<StoredBrandFile> {
  const { safeName, contentType } = validateAndSanitizeFile(params.originalName, params.buffer.byteLength, params.mimeType);
  const fileKey = buildBrandFileKey(params.brandName, safeName);
  const displayFileName = params.originalName.trim().slice(0, 200);
  const internalUrl = `/api/brands/files?key=${encodeURIComponent(fileKey)}`;

  const cfg = getR2Config();
  if (cfg) {
    const signed = signR2Request({
      method: 'PUT',
      config: cfg,
      key: fileKey,
      body: params.buffer,
      contentType,
    });
    const res = await fetch(signed.url, {
      method: 'PUT',
      headers: signed.headers,
      body: new Uint8Array(params.buffer),
      cache: 'no-store',
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[Cloudflare R2 PUT error]:', res.status, errText.slice(0, 300));
      throw new BrandError(`Không tải được tệp lên Cloudflare R2 (mã ${res.status}). Kiểm tra cấu hình R2.`, 502);
    }
    return {
      fileKey,
      fileName: displayFileName,
      fileSize: params.buffer.byteLength,
      mimeType: contentType,
      storage: 'R2',
      url: cfg.publicUrl ? `${cfg.publicUrl}/${fileKey}` : internalUrl,
    };
  }

  // Fallback lưu tệp cục bộ khi chưa cấu hình R2
  const targetPath = path.join(localFilesDir(), ...fileKey.split('/'));
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, params.buffer, { mode: 0o600 });

  return {
    fileKey,
    fileName: displayFileName,
    fileSize: params.buffer.byteLength,
    mimeType: contentType,
    storage: 'LOCAL',
    url: internalUrl,
  };
}

export async function readBrandFile(rawKey: string): Promise<{ buffer: Buffer; contentType: string; fileName: string }> {
  const fileKey = assertValidBrandFileKey(rawKey);
  const ext = path.extname(fileKey).toLowerCase();
  const contentType = EXTENSION_MIME[ext] || 'application/octet-stream';
  const fileName = path.basename(fileKey).replace(/^[0-9a-f]{8}-/, '');

  const cfg = getR2Config();
  if (cfg) {
    const signed = signR2Request({
      method: 'GET',
      config: cfg,
      key: fileKey,
    });
    const res = await fetch(signed.url, {
      method: 'GET',
      headers: signed.headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
    });
    if (res.status === 404) {
      // Kiểm tra dự phòng kho cục bộ nếu tệp được tải lên trước khi bật R2
      const localFallbackPath = path.join(localFilesDir(), ...fileKey.split('/'));
      try {
        const localBuf = await readFile(localFallbackPath);
        return { buffer: localBuf, contentType, fileName };
      } catch {
        throw new BrandError('Không tìm thấy tệp trên Cloudflare R2.', 404);
      }
    }
    if (!res.ok) {
      throw new BrandError(`Không đọc được tệp từ Cloudflare R2 (mã ${res.status}).`, 502);
    }
    const arrayBuf = await res.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuf),
      contentType: res.headers.get('content-type') || contentType,
      fileName,
    };
  }

  const targetPath = path.join(localFilesDir(), ...fileKey.split('/'));
  try {
    const buffer = await readFile(targetPath);
    return { buffer, contentType, fileName };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new BrandError('Không tìm thấy tệp lưu trữ.', 404);
    }
    throw e;
  }
}

export async function deleteBrandFile(rawKey: string): Promise<void> {
  const fileKey = assertValidBrandFileKey(rawKey);
  const cfg = getR2Config();
  if (cfg) {
    const signed = signR2Request({
      method: 'DELETE',
      config: cfg,
      key: fileKey,
    });
    const res = await fetch(signed.url, {
      method: 'DELETE',
      headers: signed.headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok && res.status !== 404) {
      throw new BrandError(`Không xóa được tệp trên Cloudflare R2 (mã ${res.status}).`, 502);
    }
    return;
  }

  const targetPath = path.join(localFilesDir(), ...fileKey.split('/'));
  await unlink(targetPath).catch(() => undefined);
}

/* ------------------------------------------------------- Kiểm tra kết nối & Đồng bộ tệp cục bộ lên R2 */

function parseR2XmlError(xmlText: string, status: number): string {
  const codeMatch = xmlText.match(/<Code>([^<]+)<\/Code>/i);
  const msgMatch = xmlText.match(/<Message>([^<]+)<\/Message>/i);
  const code = codeMatch?.[1] || '';
  const msg = msgMatch?.[1] || '';

  if (code === 'NoSuchBucket' || status === 404) {
    return 'Không tìm thấy Bucket trên Cloudflare R2 (NoSuchBucket). Hãy tạo đúng tên Bucket trong Cloudflare Dashboard → R2.';
  }
  if (code === 'InvalidAccessKeyId') {
    return 'Access Key ID không tồn tại hoặc không đúng định dạng S3 Token của Cloudflare R2.';
  }
  if (code === 'SignatureDoesNotMatch') {
    return 'Secret Access Key không khớp (SignatureDoesNotMatch). Hãy kiểm tra lại mã khóa bí mật.';
  }
  if (code === 'AccessDenied' || status === 403) {
    return 'Từ chối truy cập (403 AccessDenied). Hãy đảm bảo API Token có quyền "Object Read & Write" trên Bucket này.';
  }
  if (code || msg) {
    return `Lỗi R2 (${code || status}): ${msg || 'Yêu cầu bị từ chối'}`;
  }
  return `Máy chủ R2 phản hồi mã lỗi HTTP ${status}.`;
}

/**
 * Kiểm tra thực tế kết nối Cloudflare R2 qua 3 bước:
 * 1. PUT ghi thử 1 tệp kiểm tra (`brands/_r2-probe/...`)
 * 2. GET đọc lại nội dung tệp vừa ghi
 * 3. DELETE dọn dẹp tệp kiểm tra
 */
export async function testR2Connection(config: R2Config): Promise<R2ConnectionTestResult> {
  const startedAt = Date.now();
  const testedAt = new Date().toISOString();
  const probeKey = `brands/r2-probe/${testedAt.slice(0, 7)}/${randomUUID().slice(0, 8)}-healthcheck.txt`;
  const probeContent = `UpBase B2C R2 Connection Probe @ ${testedAt}`;
  const probeBuffer = Buffer.from(probeContent, 'utf8');

  let writeVerified = false;
  let readVerified = false;
  let deleteVerified = false;

  try {
    // 1. Kiểm tra quyền GHI (PUT)
    const putSigned = signR2Request({
      method: 'PUT',
      config,
      key: probeKey,
      body: probeBuffer,
      contentType: 'text/plain; charset=utf-8',
    });

    const putRes = await fetch(putSigned.url, {
      method: 'PUT',
      headers: putSigned.headers,
      body: new Uint8Array(probeBuffer),
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    });

    if (!putRes.ok) {
      const errBody = await putRes.text().catch(() => '');
      return {
        ok: false,
        status: putRes.status,
        latencyMs: Date.now() - startedAt,
        testedAt,
        message: parseR2XmlError(errBody, putRes.status),
        bucket: config.bucket,
        endpoint: config.endpoint,
        writeVerified: false,
        readVerified: false,
        deleteVerified: false,
      };
    }
    writeVerified = true;

    // 2. Kiểm tra quyền ĐỌC (GET)
    const getSigned = signR2Request({
      method: 'GET',
      config,
      key: probeKey,
    });
    const getRes = await fetch(getSigned.url, {
      method: 'GET',
      headers: getSigned.headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });

    if (!getRes.ok) {
      const errBody = await getRes.text().catch(() => '');
      return {
        ok: false,
        status: getRes.status,
        latencyMs: Date.now() - startedAt,
        testedAt,
        message: `Ghi tệp thành công nhưng không đọc lại được: ${parseR2XmlError(errBody, getRes.status)}`,
        bucket: config.bucket,
        endpoint: config.endpoint,
        writeVerified: true,
        readVerified: false,
        deleteVerified: false,
      };
    }
    const readText = await getRes.text();
    readVerified = readText === probeContent;

    // 3. Kiểm tra quyền XÓA dọn dẹp (DELETE)
    const delSigned = signR2Request({
      method: 'DELETE',
      config,
      key: probeKey,
    });
    const delRes = await fetch(delSigned.url, {
      method: 'DELETE',
      headers: delSigned.headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    deleteVerified = delRes.ok || delRes.status === 204 || delRes.status === 404;

    const latencyMs = Date.now() - startedAt;
    return {
      ok: true,
      status: 200,
      latencyMs,
      testedAt,
      message: `Kết nối Cloudflare R2 bucket "${config.bucket}" thành công (${latencyMs}ms). Đã xác thực đủ quyền Ghi, Đọc và Xóa tệp.`,
      bucket: config.bucket,
      endpoint: config.endpoint,
      writeVerified,
      readVerified,
      deleteVerified,
    };
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : 'Lỗi kết nối mạng';
    const isDnsOrNetwork = /fetch failed|ENOTFOUND|ECONNREFUSED|timeout/i.test(rawMsg);
    return {
      ok: false,
      status: 0,
      latencyMs: Date.now() - startedAt,
      testedAt,
      message: isDnsOrNetwork
        ? `Không thể kết nối tới máy chủ "${config.endpoint}". Hãy kiểm tra lại Cloudflare Account ID hoặc đường dẫn S3 Endpoint.`
        : `Lỗi khi kiểm tra kết nối R2: ${rawMsg}`,
      bucket: config.bucket,
      endpoint: config.endpoint,
      writeVerified,
      readVerified,
      deleteVerified,
    };
  }
}

/** Quét danh sách tệp đang lưu cục bộ trong `.brand-data/files`. */
export async function inspectLocalBrandFiles(): Promise<{
  count: number;
  totalBytes: number;
  files: Array<{ key: string; size: number; fullPath: string }>;
}> {
  const root = localFilesDir();
  const files: Array<{ key: string; size: number; fullPath: string }> = [];

  async function walk(currentDir: string) {
    let entries;
    try {
      entries = await readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const rel = path.relative(root, fullPath).split(path.sep).join('/');
        if (/^brands\/[a-z0-9-]+\/\d{4}-\d{2}\/[a-zA-Z0-9._-]+$/.test(rel)) {
          const st = await stat(fullPath).catch(() => null);
          if (st) {
            files.push({ key: rel, size: st.size, fullPath });
          }
        }
      }
    }
  }

  await walk(root);
  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  return { count: files.length, totalBytes, files };
}

/** Đồng bộ toàn bộ tệp cục bộ trong `.brand-data/files` lên Cloudflare R2 bucket hiện hành. */
export async function migrateLocalFilesToR2(customConfig?: R2Config): Promise<{
  migratedCount: number;
  failedCount: number;
  totalBytes: number;
  errors: string[];
}> {
  const cfg = customConfig || getR2Config();
  requireBrand(cfg !== null, 'Chưa cấu hình Cloudflare R2 để đồng bộ tệp.', 400);

  const localInfo = await inspectLocalBrandFiles();
  let migratedCount = 0;
  let failedCount = 0;
  let migratedBytes = 0;
  const errors: string[] = [];

  for (const item of localInfo.files) {
    try {
      const buffer = await readFile(item.fullPath);
      const ext = path.extname(item.key).toLowerCase();
      const contentType = EXTENSION_MIME[ext] || 'application/octet-stream';
      const signed = signR2Request({
        method: 'PUT',
        config: cfg!,
        key: item.key,
        body: buffer,
        contentType,
      });
      const res = await fetch(signed.url, {
        method: 'PUT',
        headers: signed.headers,
        body: new Uint8Array(buffer),
        cache: 'no-store',
        signal: AbortSignal.timeout(25_000),
      });
      if (!res.ok) {
        failedCount += 1;
        errors.push(`${item.key}: HTTP ${res.status}`);
      } else {
        migratedCount += 1;
        migratedBytes += item.size;
      }
    } catch (e) {
      failedCount += 1;
      errors.push(`${item.key}: ${(e as Error).message}`);
    }
  }

  return {
    migratedCount,
    failedCount,
    totalBytes: migratedBytes,
    errors,
  };
}

export function buildR2EnvSnippet(cfg: Partial<R2Config>): string {
  const accountId = (cfg.accountId || '').trim();
  const bucket = (cfg.bucket || 'upbase-b2c-brands').trim();
  const endpoint = (cfg.endpoint || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '')).trim();
  const publicUrl = (cfg.publicUrl || '').trim();
  return [
    '# LƯU TRỮ TỆP THƯƠNG HIỆU (CLOUDFLARE R2 OBJECT STORAGE)',
    `R2_ACCOUNT_ID="${accountId}"`,
    `R2_ACCESS_KEY_ID="${(cfg.accessKeyId || '').trim()}"`,
    `R2_SECRET_ACCESS_KEY="${(cfg.secretAccessKey || '').trim()}"`,
    `R2_BUCKET_NAME="${bucket}"`,
    `R2_ENDPOINT="${endpoint}"`,
    `R2_PUBLIC_URL="${publicUrl}"`,
  ].join('\n');
}

export interface R2ObjectSummary {
  key: string;
  size: number;
  lastModified: string;
  etag?: string;
  storage: 'R2' | 'LOCAL';
  brandSlug: string;
  month: string;
  fileName: string;
  url: string;
}

/**
 * Liệt kê danh sách Object thực tế trên Cloudflare R2 Bucket (qua S3 ListObjectsV2)
 * kết hợp với các tệp đang lưu cục bộ trong `.brand-data/files`.
 */
export async function listStoredObjects(prefix = 'brands/'): Promise<{
  objects: R2ObjectSummary[];
  r2ObjectCount: number;
  r2TotalBytes: number;
  localObjectCount: number;
  localTotalBytes: number;
  r2Error?: string;
}> {
  const byKey = new Map<string, R2ObjectSummary>();
  let r2ObjectCount = 0;
  let r2TotalBytes = 0;
  let r2Error: string | undefined;

  const cfg = getR2Config();
  if (cfg) {
    try {
      const signed = signR2Request({
        method: 'GET',
        config: cfg,
        key: '',
        query: {
          'list-type': '2',
          'max-keys': '500',
          prefix,
        },
      });
      const res = await fetch(signed.url, {
        method: 'GET',
        headers: signed.headers,
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
      });
      const xml = await res.text().catch(() => '');
      if (!res.ok) {
        r2Error = parseR2XmlError(xml, res.status);
      } else {
        const contentBlocks = xml.match(/<Contents>[\s\S]*?<\/Contents>/gi) || [];
        for (const block of contentBlocks) {
          const keyMatch = block.match(/<Key>([^<]+)<\/Key>/i);
          const sizeMatch = block.match(/<Size>(\d+)<\/Size>/i);
          const lastModMatch = block.match(/<LastModified>([^<]+)<\/LastModified>/i);
          const etagMatch = block.match(/<ETag>([^<]+)<\/ETag>/i);
          const objKey = (keyMatch?.[1] || '').trim();
          if (!objKey || objKey.includes('/r2-probe/')) continue;

          const size = Number(sizeMatch?.[1] || 0);
          const parts = objKey.split('/');
          const brandSlug = parts[1] || 'unknown';
          const month = parts[2] || '';
          const rawBase = parts.slice(3).join('/') || path.basename(objKey);
          const fileName = rawBase.replace(/^[0-9a-f]{8}-/, '');

          r2ObjectCount += 1;
          r2TotalBytes += size;
          byKey.set(objKey, {
            key: objKey,
            size,
            lastModified: lastModMatch?.[1] || new Date().toISOString(),
            etag: etagMatch?.[1]?.replace(/&quot;|"/g, ''),
            storage: 'R2',
            brandSlug,
            month,
            fileName,
            url: cfg.publicUrl ? `${cfg.publicUrl}/${objKey}` : `/api/brands/files?key=${encodeURIComponent(objKey)}`,
          });
        }
      }
    } catch (e) {
      r2Error = (e as Error).message || 'Không liệt kê được danh sách object từ R2.';
    }
  }

  const localInfo = await inspectLocalBrandFiles();
  for (const lf of localInfo.files) {
    if (byKey.has(lf.key)) continue;
    const st = await stat(lf.fullPath).catch(() => null);
    const parts = lf.key.split('/');
    const brandSlug = parts[1] || 'unknown';
    const month = parts[2] || '';
    const rawBase = parts.slice(3).join('/') || path.basename(lf.key);
    const fileName = rawBase.replace(/^[0-9a-f]{8}-/, '');
    byKey.set(lf.key, {
      key: lf.key,
      size: lf.size,
      lastModified: st ? st.mtime.toISOString() : new Date().toISOString(),
      storage: 'LOCAL',
      brandSlug,
      month,
      fileName,
      url: `/api/brands/files?key=${encodeURIComponent(lf.key)}`,
    });
  }

  const objects = Array.from(byKey.values()).sort((a, b) => b.lastModified.localeCompare(a.lastModified));
  return {
    objects,
    r2ObjectCount,
    r2TotalBytes,
    localObjectCount: localInfo.count,
    localTotalBytes: localInfo.totalBytes,
    r2Error,
  };
}
