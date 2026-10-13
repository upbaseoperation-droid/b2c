/**
 * Lưu trữ tệp thương hiệu trên Cloudflare R2 (tương thích S3 API, ký xác thực AWS Signature V4).
 * Khi môi trường phát triển chưa cấu hình biến môi trường R2, tự động lưu vào thư mục cục bộ `.brand-data/files`.
 */

import { createHash, createHmac, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
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

export interface StoredBrandFile {
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storage: 'R2' | 'LOCAL';
  url: string;
}

export function getR2Config(): R2Config | null {
  const accountId = (process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || '').trim();
  const bucket = (process.env.R2_BUCKET_NAME || '').trim();
  if (!accessKeyId || !secretAccessKey || !bucket) return null;

  const rawEndpoint = (process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '')).trim().replace(/\/+$/, '');
  if (!rawEndpoint) return null;

  const publicUrl = (process.env.R2_PUBLIC_URL || '').trim().replace(/\/+$/, '') || undefined;
  return { accountId, accessKeyId, secretAccessKey, bucket, endpoint: rawEndpoint, publicUrl };
}

export function r2Configured(): boolean {
  return getR2Config() !== null;
}

export function brandFileStorageMode(): 'CLOUDFLARE_R2' | 'LOCAL_STORAGE' {
  return r2Configured() ? 'CLOUDFLARE_R2' : 'LOCAL_STORAGE';
}

const localFilesDir = () =>
  path.resolve(/*turbopackIgnore: true*/ process.env.BRAND_DATA_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), '.brand-data'), 'files');

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
    .replace(/đ/gi, 'd')
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
  body?: Buffer;
  contentType?: string;
  now?: Date;
}): { url: string; headers: Record<string, string> } {
  const { method, config, key, body, contentType, now = new Date() } = params;
  const endpointUrl = new URL(config.endpoint);
  const host = endpointUrl.host;
  const basePath = endpointUrl.pathname.replace(/\/+$/, '');
  const encodedKey = key.split('/').map(rfc3986).join('/');
  const canonicalUri = `${basePath}/${rfc3986(config.bucket)}/${encodedKey}`;

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
    '',
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

  return {
    url: `${endpointUrl.origin}${canonicalUri}`,
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
      throw new BrandError('Không tìm thấy tệp trên Cloudflare R2.', 404);
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
