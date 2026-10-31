/**
 * Đọc Google Doc hợp đồng bằng tài khoản dịch vụ Google (chỉ chạy trên máy chủ):
 * nội dung, bình luận (kể cả đã xóa), lịch sử phiên bản và xuất file DOCX/PDF để đẩy WeSign.
 *
 * Khi máy chưa cấu hình tài khoản dịch vụ, các hàm trả về dữ liệu giả lập và đánh dấu `simulated`
 * để giao diện báo rõ. Khi đã cấu hình mà Google từ chối, hàm báo lỗi thay vì trả dữ liệu giả.
 */

import { createHash, createSign } from 'node:crypto';
import { ensureServiceAccountLoaded } from '@/lib/server/googleSheets';
import { ContractError, requireCondition } from './domain';
import { compareDocWithTemplate, extractGoogleDocId } from './googleDocsService';
import { renderTemplate } from './templates';
import type { GoogleDocCommentItem, GoogleDocRevisionItem, GoogleDocSnapshot, GoogleDocsReviewRouting } from './googleDocsTypes';
import type { ContractRecord } from './types';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

let cachedToken: { token: string; expiresAt: number } | null = null;

const b64url = (v: string | Buffer) => Buffer.from(v).toString('base64url');

/** Email tài khoản dịch vụ mà người dùng cần chia sẻ file Google Doc. Rỗng khi chưa cấu hình. */
export async function googleDocsShareEmail(): Promise<string> {
  const sa = await ensureServiceAccountLoaded();
  return sa.configured ? sa.email : '';
}

async function driveToken(): Promise<{ token: string; email: string } | null> {
  const sa = await ensureServiceAccountLoaded();
  if (!sa.configured) return null;
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 60 > now) return { token: cachedToken.token, email: sa.email };
  const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(
    JSON.stringify({ iss: sa.email, scope: DRIVE_SCOPE, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }),
  )}`;
  let signature: string;
  try {
    signature = createSign('RSA-SHA256').update(unsigned).sign(sa.key, 'base64url');
  } catch {
    throw new ContractError('Khóa riêng của tài khoản dịch vụ Google không hợp lệ.', 503);
  }
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
  });
  const body = (await res.json().catch(() => null)) as { access_token?: string; expires_in?: number } | null;
  if (!res.ok || !body?.access_token) throw new ContractError('Google từ chối tài khoản dịch vụ. Kiểm tra lại email và khóa riêng.', 503);
  cachedToken = { token: body.access_token, expiresAt: now + (body.expires_in || 3600) };
  return { token: body.access_token, email: sa.email };
}

async function driveGet(path: string, auth: { token: string; email: string }): Promise<Response> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    headers: { Authorization: `Bearer ${auth.token}` },
    cache: 'no-store',
  });
  if (res.ok) return res;
  if (res.status === 403 || res.status === 404) {
    throw new ContractError(`Chưa đọc được Google Doc. Chia sẻ file cho ${auth.email} (quyền Người nhận xét) rồi thử lại.`, 422);
  }
  throw new ContractError(`Google Drive trả lỗi ${res.status} khi đọc file hợp đồng. Thử lại sau.`, 502);
}

export interface GoogleDocContent {
  title: string;
  paragraphs: string[];
  /** Mã băm SHA-256 của nội dung, dùng để biết file có bị sửa sau khi trình final hay không. */
  hash: string;
  simulated: boolean;
}

const hashParagraphs = (paragraphs: string[]) => createHash('sha256').update(paragraphs.join('\n')).digest('hex');

/** Nội dung chữ hiện tại của Google Doc (xuất dạng văn bản thuần). */
export async function readGoogleDocContent(docId: string, simulatedParagraphs: () => string[]): Promise<GoogleDocContent> {
  const auth = await driveToken();
  if (!auth) {
    const paragraphs = simulatedParagraphs();
    return { title: `Hợp đồng Google Doc (${docId.slice(0, 8)})`, paragraphs, hash: hashParagraphs(paragraphs), simulated: true };
  }
  const meta = (await (await driveGet(`files/${encodeURIComponent(docId)}?fields=name,mimeType&supportsAllDrives=true`, auth)).json()) as { name?: string; mimeType?: string };
  if (meta.mimeType && meta.mimeType !== 'application/vnd.google-apps.document') {
    throw new ContractError('Link không phải Google Doc. Mở file bằng Google Docs (Tệp → Lưu dưới dạng Google Docs) rồi dán link mới.', 422);
  }
  const text = await (await driveGet(`files/${encodeURIComponent(docId)}/export?mimeType=text/plain`, auth)).text();
  const paragraphs = text.replace(/^﻿/, '').split(/\r?\n/).map(p => p.trim()).filter(Boolean);
  return { title: meta.name || `Hợp đồng Google Doc (${docId.slice(0, 8)})`, paragraphs, hash: hashParagraphs(paragraphs), simulated: false };
}

interface DriveUser { displayName?: string; emailAddress?: string; photoLink?: string }
interface DriveReply { id: string; author?: DriveUser; content?: string; createdTime?: string; deleted?: boolean }
interface DriveComment {
  id: string;
  author?: DriveUser;
  content?: string;
  quotedFileContent?: { value?: string };
  createdTime?: string;
  resolved?: boolean;
  deleted?: boolean;
  replies?: DriveReply[];
}

/** Toàn bộ bình luận và trả lời trên file, kể cả bình luận đã bị xóa (Google vẫn giữ dấu). */
export async function fetchGoogleDocComments(docId: string): Promise<{ comments: GoogleDocCommentItem[]; simulated: boolean }> {
  const auth = await driveToken();
  if (!auth) {
    return {
      simulated: true,
      comments: [
        {
          id: `demo-${docId.slice(0, 6)}-1`,
          author: 'Pháp chế (giả lập)',
          content: 'Điều 3: cần bổ sung thời hạn sử dụng hình ảnh KOC.',
          createdAt: new Date().toISOString(),
          resolved: false,
        },
      ],
    };
  }
  const fields = 'nextPageToken,comments(id,author(displayName,emailAddress,photoLink),content,quotedFileContent,createdTime,resolved,deleted,replies(id,author(displayName),content,createdTime,deleted))';
  const all: DriveComment[] = [];
  let pageToken = '';
  for (let page = 0; page < 20; page++) {
    const res = await driveGet(
      `files/${encodeURIComponent(docId)}/comments?includeDeleted=true&pageSize=100&fields=${encodeURIComponent(fields)}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`,
      auth,
    );
    const data = (await res.json()) as { comments?: DriveComment[]; nextPageToken?: string };
    all.push(...(data.comments || []));
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  const now = new Date().toISOString();
  return {
    simulated: false,
    comments: all.map(c => ({
      id: c.id,
      author: c.author?.displayName || 'Ẩn danh',
      authorEmail: c.author?.emailAddress,
      avatar: c.author?.photoLink,
      content: c.content || '',
      quotedText: c.quotedFileContent?.value,
      createdAt: c.createdTime || now,
      resolved: Boolean(c.resolved),
      removedFromSourceAt: c.deleted ? now : undefined,
      replies: (c.replies || [])
        .filter(r => !r.deleted)
        .map(r => ({ id: r.id, author: r.author?.displayName || 'Ẩn danh', content: r.content || '', createdAt: r.createdTime || now })),
    })),
  };
}

/** Lịch sử phiên bản của file: ai sửa, lúc nào. */
export async function fetchGoogleDocRevisions(docId: string): Promise<GoogleDocRevisionItem[]> {
  const auth = await driveToken();
  if (!auth) return [];
  // Google chỉ cho xem lịch sử phiên bản khi được chia sẻ quyền Người chỉnh sửa; thiếu quyền thì bỏ qua, không chặn trình final.
  const res = await driveGet(
    `files/${encodeURIComponent(docId)}/revisions?pageSize=200&fields=${encodeURIComponent('revisions(id,modifiedTime,lastModifyingUser(displayName,emailAddress))')}`,
    auth,
  ).catch(() => null);
  if (!res) return [];
  const data = (await res.json()) as { revisions?: Array<{ id: string; modifiedTime?: string; lastModifyingUser?: DriveUser }> };
  return (data.revisions || []).map(r => ({
    id: r.id,
    modifiedTime: r.modifiedTime || '',
    author: r.lastModifyingUser?.displayName,
    authorEmail: r.lastModifyingUser?.emailAddress,
  }));
}

/**
 * Gộp bình luận mới đọc từ Google vào danh sách đã lưu. Bình luận đã lưu mà không còn trên file
 * (bị xóa hẳn) vẫn được giữ lại, đánh dấu thời điểm biến mất, để phục vụ audit.
 */
export function mergeGoogleDocComments(previous: GoogleDocCommentItem[] = [], latest: GoogleDocCommentItem[]): GoogleDocCommentItem[] {
  const now = new Date().toISOString();
  const latestIds = new Set(latest.map(c => c.id));
  const prevById = new Map(previous.map(c => [c.id, c]));
  const merged: GoogleDocCommentItem[] = latest.map(c => {
    const prev = prevById.get(c.id);
    const replies = [...(c.replies || [])];
    for (const r of prev?.replies || []) if (!replies.some(x => x.id === r.id)) replies.push(r);
    return {
      ...c,
      removedFromSourceAt: c.removedFromSourceAt ? prev?.removedFromSourceAt || c.removedFromSourceAt : undefined,
      replies,
    };
  });
  for (const prev of previous) {
    if (!latestIds.has(prev.id)) merged.push({ ...prev, removedFromSourceAt: prev.removedFromSourceAt || now });
  }
  return merged.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Xuất Google Doc thành DOCX hoặc PDF. Trả null khi chưa cấu hình Google (bản giả lập). */
export async function exportGoogleDocFile(docId: string, format: 'docx' | 'pdf'): Promise<Buffer | null> {
  const auth = await driveToken();
  if (!auth) return null;
  const mime = format === 'docx' ? DOCX_MIME : 'application/pdf';
  const res = await driveGet(`files/${encodeURIComponent(docId)}/export?mimeType=${encodeURIComponent(mime)}`, auth);
  return Buffer.from(await res.arrayBuffer());
}

/** Phân luồng cố định cho mẫu riêng của KOC: không so với mẫu Upbase, Pháp chế và Kế toán rà toàn văn. */
const kocCustomRouting = (): GoogleDocsReviewRouting => ({
  requiresLegal: true,
  requiresFinance: true,
  legalClauses: [],
  financeClauses: [],
  clauseDiffs: [],
  summary: 'Mẫu riêng của KOC: không so với mẫu Upbase. Pháp chế và Kế toán rà toàn bộ văn bản.',
  analyzedAt: new Date().toISOString(),
});

/**
 * Chụp lại Google Doc của hồ sơ: nội dung, bình luận (gộp với bản đã lưu), lịch sử phiên bản.
 * Với mẫu Upbase có chỉnh sửa, so nội dung với mẫu đã điền giá trị của hồ sơ để chỉ ra điều khoản bị sửa.
 */
export async function captureGoogleDocForRecord(record: ContractRecord, actorName: string): Promise<{
  snapshot: GoogleDocSnapshot;
  comments: GoogleDocCommentItem[];
  revisions: GoogleDocRevisionItem[];
  routing: GoogleDocsReviewRouting;
  simulated: boolean;
}> {
  const docId = record.googleDocsId || extractGoogleDocId(record.googleDocsUrl || '');
  requireCondition(docId, 'Hồ sơ chưa có link Google Doc hợp lệ.');
  const isKocDoc = record.googleDocsSource === 'KOC_CUSTOM_DOC';
  const templateParagraphs = isKocDoc
    ? []
    : (await renderTemplate(record.templateId, record.templateHash, record.values)).paragraphs.map(p => p.trim()).filter(Boolean);

  const content = await readGoogleDocContent(docId, () =>
    isKocDoc
      ? ['HỢP ĐỒNG DỊCH VỤ (mẫu của KOC, giả lập)', 'Điều 1. Phạm vi công việc', 'Điều 2. Giá trị và thanh toán']
      : templateParagraphs.map(p => (/^Điều\s+3/iu.test(p) ? `${p} (đã chỉnh sửa – giả lập)` : p)),
  );
  const latest = await fetchGoogleDocComments(docId);
  const comments = mergeGoogleDocComments(record.googleDocsComments, latest.comments);
  const revisions = await fetchGoogleDocRevisions(docId);
  const routing = isKocDoc ? kocCustomRouting() : compareDocWithTemplate(content.paragraphs, templateParagraphs).reviewRouting;
  const simulated = content.simulated || latest.simulated;

  return {
    snapshot: {
      at: new Date().toISOString(),
      by: actorName,
      title: content.title,
      hash: content.hash,
      paragraphs: content.paragraphs,
      commentsCount: comments.length,
      revisionCount: revisions.length,
      lastRevisionId: revisions.at(-1)?.id,
      simulated: simulated || undefined,
    },
    comments,
    revisions,
    routing,
    simulated,
  };
}
