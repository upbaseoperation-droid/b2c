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
import { compareDocWithTemplate, compareInitialAndFinalDoc, extractGoogleDocId, parseClausesFromParagraphs } from './googleDocsService';
import { decodeXml, renderTemplate } from './templates';
import type {
  GoogleDocClauseDiff,
  GoogleDocCommentItem,
  GoogleDocRevisionItem,
  GoogleDocSnapshot,
  GoogleDocsNegotiationReport,
  GoogleDocsReviewRouting,
} from './googleDocsTypes';
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
  const parseAuthorName = (rawName?: string, text?: string) => {
    const bracketMatch = (text || '').match(/^\[([^\]]{2,60})\]:\s*/);
    if (bracketMatch && (!rawName || rawName.includes('gserviceaccount.com') || rawName === 'Ẩn danh')) {
      return bracketMatch[1].trim();
    }
    return rawName || 'Ẩn danh';
  };
  return {
    simulated: false,
    comments: all.map(c => ({
      id: c.id,
      author: parseAuthorName(c.author?.displayName, c.content),
      authorEmail: c.author?.emailAddress,
      avatar: c.author?.photoLink,
      content: c.content || '',
      quotedText: c.quotedFileContent?.value ? decodeXml(c.quotedFileContent.value) : undefined,
      createdAt: c.createdTime || now,
      resolved: Boolean(c.resolved),
      removedFromSourceAt: c.deleted ? now : undefined,
      replies: (c.replies || [])
        .filter(r => !r.deleted)
        .map(r => ({
          id: r.id,
          author: parseAuthorName(r.author?.displayName, r.content),
          content: r.content || '',
          createdAt: r.createdTime || now,
        })),
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
      author: c.author && c.author !== 'Ẩn danh' ? c.author : prev?.author || c.author,
      authorEmail: c.authorEmail || prev?.authorEmail,
      avatar: c.avatar || prev?.avatar,
      content: c.content || prev?.content || (c.removedFromSourceAt ? '(Bình luận đã bị xóa trên Google Docs)' : ''),
      quotedText: c.quotedText || prev?.quotedText,
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
 * Chụp lại Google Doc của hồ sơ: nội dung, bình luận (gộp với bản đã lưu), lịch sử phiên bản,
 * đồng thời giữ lại Bản chụp ban đầu (`initialSnapshot`) và tính toán độ lệch giữa Bản đầu vs Bản hiện tại (`initialToFinalDiffs`).
 */
export async function captureGoogleDocForRecord(record: ContractRecord, actorName: string): Promise<{
  snapshot: GoogleDocSnapshot;
  initialSnapshot: GoogleDocSnapshot;
  initialToFinalDiffs: GoogleDocClauseDiff[];
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

  const snapshot: GoogleDocSnapshot = {
    at: new Date().toISOString(),
    by: actorName,
    title: content.title,
    hash: content.hash,
    paragraphs: content.paragraphs,
    commentsCount: comments.length,
    revisionCount: revisions.length,
    lastRevisionId: revisions.at(-1)?.id,
    simulated: simulated || undefined,
  };

  const initialSnapshot = record.googleDocsAuditTrail?.initialSnapshot || snapshot;
  const initialToFinalDiffs = compareInitialAndFinalDoc(snapshot.paragraphs, initialSnapshot.paragraphs);

  return {
    snapshot,
    initialSnapshot,
    initialToFinalDiffs,
    comments,
    revisions,
    routing,
    simulated,
  };
}

/**
 * Tổng hợp và lưu vết Báo cáo đàm phán & chỉnh sửa của riêng hợp đồng (`GoogleDocsNegotiationReport`)
 * dựa trên: (1) Bản đẩy lên ban đầu (`initialSnapshot`), (2) Toàn bộ bình luận & phiên bản sửa theo từng tài khoản,
 * và (3) Bản chốt cuối (`approvedSnapshot` hoặc `finalSnapshot`).
 */
export async function buildContractNegotiationReport(
  record: ContractRecord,
  actorName: string,
): Promise<GoogleDocsNegotiationReport> {
  const trail = record.googleDocsAuditTrail;
  const initialSnap = trail?.initialSnapshot || trail?.finalSnapshot;
  const finalSnap = trail?.approvedSnapshot || trail?.finalSnapshot || trail?.initialSnapshot;
  const comments = record.googleDocsComments || [];
  const revisions = trail?.revisions || [];
  const templateDiffs = record.googleDocsReviewRouting?.clauseDiffs || [];
  const initialToFinalDiffs =
    trail?.initialToFinalDiffs ||
    (initialSnap && finalSnap ? compareInitialAndFinalDoc(finalSnap.paragraphs, initialSnap.paragraphs) : []);

  // Gom nhóm hoạt động theo tài khoản
  const accMap = new Map<
    string,
    {
      account: string;
      email?: string;
      editCount: number;
      commentCount: number;
      replyCount: number;
      commentSnippets: string[];
    }
  >();

  const getAcc = (nameRaw?: string, emailRaw?: string) => {
    const account = (nameRaw || emailRaw || 'Ẩn danh').trim();
    const email = emailRaw?.trim();
    const key = (email || account).toLowerCase();
    let entry = accMap.get(key);
    if (!entry) {
      entry = {
        account,
        email: email && email !== account ? email : undefined,
        editCount: 0,
        commentCount: 0,
        replyCount: 0,
        commentSnippets: [],
      };
      accMap.set(key, entry);
    }
    return entry;
  };

  for (const rev of revisions) {
    const acc = getAcc(rev.author, rev.authorEmail);
    acc.editCount += 1;
  }

  for (const c of comments) {
    const acc = getAcc(c.author, c.authorEmail);
    acc.commentCount += 1;
    if (c.content) {
      acc.commentSnippets.push(
        `${c.quotedText ? `[Đoạn: "${c.quotedText.slice(0, 60)}"] ` : ''}${c.content}${c.removedFromSourceAt ? ' (đã xóa trên file)' : c.resolved ? ' (đã giải quyết)' : ''}`,
      );
    }
    for (const r of c.replies || []) {
      const rAcc = getAcc(r.author);
      rAcc.replyCount += 1;
      if (r.content) {
        rAcc.commentSnippets.push(`Phản hồi: ${r.content}`);
      }
    }
  }

  const accountContributionsSummary = [...accMap.values()].map(a => {
    const lower = `${a.account} ${a.email || ''}`.toLowerCase();
    const roleHint = lower.includes('serviceaccount')
      ? 'Tài khoản hệ thống / Đồng bộ Google Drive'
      : lower.includes('pháp chế') || lower.includes('legal') || lower.includes('hương')
      ? 'Pháp chế'
      : lower.includes('kế toán') || lower.includes('finance') || lower.includes('trang')
      ? 'Kế toán (TCKT)'
      : 'Nhân sự B2C / Đại diện KOC';

    const summaryParts: string[] = [];
    if (a.editCount > 0) summaryParts.push(`Thực hiện ${a.editCount} phiên bản chỉnh sửa văn bản trực tiếp.`);
    if (a.commentCount > 0) summaryParts.push(`Tạo ${a.commentCount} bình luận/đề xuất điều khoản.`);
    if (a.replyCount > 0) summaryParts.push(`Có ${a.replyCount} phản hồi trao đổi.`);
    if (a.commentSnippets.length > 0) {
      summaryParts.push(`Nội dung chính: ${a.commentSnippets.slice(0, 3).join(' | ')}`);
    }

    return {
      account: a.account,
      email: a.email,
      roleHint,
      editCount: a.editCount,
      commentCount: a.commentCount,
      replyCount: a.replyCount,
      summary: summaryParts.join(' ') || 'Tham gia xem và lưu vết phiên bản.',
    };
  });

  // Tổng hợp biến đổi điều khoản
  const clauseEvolutionSummary: string[] = [];
  if (initialToFinalDiffs.length > 0) {
    for (const d of initialToFinalDiffs) {
      clauseEvolutionSummary.push(
        `[So với Bản đẩy lên ban đầu] ${d.clauseNumber} (${d.title}): ${d.changeType === 'ADDED' ? 'Bổ sung mới' : d.changeType === 'REMOVED' ? 'Đã lược bỏ' : 'Điều chỉnh nội dung'} — Phân luồng ${d.targetRole === 'FINANCE' ? 'Kế toán' : d.targetRole === 'LEGAL' ? 'Pháp chế' : 'Pháp chế & Kế toán'}.`,
      );
    }
  } else if (initialSnap && finalSnap && initialSnap.hash === finalSnap.hash) {
    clauseEvolutionSummary.push(
      `Nội dung Bản chốt cuối khớp 100% với Bản đẩy lên ban đầu (SHA-256: ${finalSnap.hash.slice(0, 12)}…); các trao đổi bình luận đã được giải quyết mà không làm thay đổi cấu trúc điều khoản so với bản đầu.`,
    );
  }

  if (record.googleDocsSource !== 'KOC_CUSTOM_DOC' && templateDiffs.length > 0) {
    for (const d of templateDiffs) {
      clauseEvolutionSummary.push(
        `[So với Mẫu chuẩn UpBase ${record.templateId}] ${d.clauseNumber} (${d.title}): ${d.explanation}`,
      );
    }
  } else if (record.googleDocsSource === 'KOC_CUSTOM_DOC' && finalSnap) {
    const clauses = parseClausesFromParagraphs(finalSnap.paragraphs).filter(c => c.clauseNumber !== 'MỞ ĐẦU');
    clauseEvolutionSummary.push(
      `Hợp đồng theo mẫu riêng của KOC gồm ${clauses.length} điều khoản (${clauses.map(c => c.clauseNumber).join(', ')}). Pháp chế và Kế toán thẩm định toàn văn.`,
    );
  }

  // Tổng hợp lưu ý tài chính & pháp lý
  const riskAndFinanceNotes: string[] = [];
  for (const c of comments) {
    riskAndFinanceNotes.push(
      `Góp ý từ ${c.author}${c.quotedText ? ` tại "${c.quotedText.slice(0, 50)}"` : ''}: ${c.content}${c.resolved ? ' (Đã giải quyết)' : ' (Cần lưu ý khi nghiệm thu/thanh toán)'}`,
    );
  }
  for (const step of record.steps) {
    if (step.note) {
      riskAndFinanceNotes.push(
        `Ý kiến phê duyệt ${step.role === 'LEGAL' ? 'Pháp chế' : step.role === 'FINANCE' ? 'Kế toán' : 'Trưởng bộ phận'} (${step.reviewerName}): ${step.note}`,
      );
    }
  }
  if (record.customTermsSummary) {
    riskAndFinanceNotes.push(`Tóm tắt điều khoản đặc thù của hồ sơ: ${record.customTermsSummary}`);
  }

  const isSameHash = initialSnap && finalSnap && initialSnap.hash === finalSnap.hash;
  let executiveSummary =
    `Hồ sơ "${record.title}" (${record.partner} · ${record.brand}) theo luồng ${
      record.googleDocsSource === 'KOC_CUSTOM_DOC' ? 'Mẫu riêng của KOC' : `Mẫu chuẩn UpBase (${record.templateId}) có chỉnh sửa`
    }. ` +
    `Hệ thống đã lưu vết Bản ban đầu (${initialSnap ? `${initialSnap.paragraphs.length} đoạn văn, mã băm ${initialSnap.hash.slice(0, 10)}…` : 'chưa chụp'}), ` +
    `ghi nhận ${comments.length} bình luận và ${revisions.length} phiên bản chỉnh sửa từ ${accountContributionsSummary.length} tài khoản, ` +
    `đến Bản chốt cuối (${finalSnap ? `${finalSnap.paragraphs.length} đoạn văn, mã băm ${finalSnap.hash.slice(0, 10)}…` : 'đang đàm phán'}). ` +
    (isSameHash
      ? 'Bản chốt cuối giữ nguyên nội dung so với bản đẩy lên ban đầu sau khi làm rõ các bình luận.'
      : `Phát hiện ${initialToFinalDiffs.length} điều khoản biến đổi từ bản ban đầu đến bản chốt cuối.`);

  let providerUsed = 'INTERNAL';
  let modelUsed = 'upbase-contract-audit-v1';

  // Nếu có cấu hình khóa Gemini trên máy chủ, gọi tóm tắt bổ sung nhưng luôn bảo toàn fallback INTERNAL
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (geminiKey) {
    try {
      const prompt = [
        `Hãy viết đoạn tóm tắt điều hành (3-4 câu ngắn gọn, chuẩn nghiệp vụ Pháp chế & Kế toán Việt Nam, không dùng từ ngữ quảng cáo) cho báo cáo lưu vết đàm phán hợp đồng sau:`,
        `- Hợp đồng: ${record.title} (Đối tác KOC: ${record.partner}, Nhãn hàng: ${record.brand})`,
        `- Phân loại: ${record.googleDocsSource === 'KOC_CUSTOM_DOC' ? 'Form riêng của KOC' : 'Mẫu UpBase có sửa đổi điều khoản'}`,
        `- Số điều khoản thay đổi giữa bản đầu và bản cuối: ${initialToFinalDiffs.length}`,
        `- Số điều khoản khác mẫu chuẩn UpBase: ${templateDiffs.length}`,
        `- Biến đổi chi tiết: ${clauseEvolutionSummary.join('; ')}`,
        `- Bình luận & đóng góp theo tài khoản: ${accountContributionsSummary.map(a => `${a.account}: ${a.summary}`).join('; ')}`,
      ].join('\n');

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2 },
          }),
        },
      );
      if (res.ok) {
        const data = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n').trim();
        if (text) {
          executiveSummary = text;
          providerUsed = 'GEMINI';
          modelUsed = 'gemini-2.5-flash';
        }
      }
    } catch {
      // Giữ nguyên kết quả tổng hợp chuẩn từ INTERNAL khi mạng hoặc khóa gặp lỗi
    }
  }

  const rawReportLines = [
    `BÁO CÁO LƯU VẾT ĐÀM PHÁN & CHỈNH SỬA HỢP ĐỒNG`,
    `Hồ sơ: ${record.title} (${record.id})`,
    `Đối tác: ${record.partner} | Nhãn hàng: ${record.brand}`,
    `Thời điểm xuất báo cáo: ${new Date().toISOString()} bởi ${actorName}`,
    ``,
    `1. TÓM TẮT ĐIỀU HÀNH`,
    executiveSummary,
    ``,
    `2. ĐỐI CHIẾU BẢN ĐẦU & BẢN CHỐT CUỐI`,
    `- Bản đẩy lên ban đầu: ${initialSnap ? `${initialSnap.at} (${initialSnap.by}) · SHA-256: ${initialSnap.hash}` : 'Chưa ghi nhận'}`,
    `- Bản chốt cuối: ${finalSnap ? `${finalSnap.at} (${finalSnap.by}) · SHA-256: ${finalSnap.hash}` : 'Chưa ghi nhận'}`,
    ...clauseEvolutionSummary.map(item => `  • ${item}`),
    ``,
    `3. ĐÓNG GÓP & BÌNH LUẬN THEO TÀI KHOẢN (${accountContributionsSummary.length} tài khoản)`,
    ...accountContributionsSummary.map(
      a => `  • ${a.account}${a.email ? ` (${a.email})` : ''} [${a.roleHint}]: ${a.summary}`,
    ),
    ``,
    `4. LƯU Ý TÀI CHÍNH & PHÁP LÝ KHI THỰC THI`,
    ...riskAndFinanceNotes.map(n => `  • ${n}`),
  ];

  return {
    generatedAt: new Date().toISOString(),
    generatedBy: actorName,
    providerUsed,
    modelUsed,
    initialHash: initialSnap?.hash,
    finalHash: finalSnap?.hash,
    executiveSummary,
    clauseEvolutionSummary,
    accountContributionsSummary,
    riskAndFinanceNotes,
    rawReportText: rawReportLines.join('\n'),
  };
}
