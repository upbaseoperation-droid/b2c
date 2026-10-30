// Việc Self-channel của một CTV (gộp các gian, tháng này và tháng trước) và các bước CTV tự nộp:
// kịch bản, video nháp, link đăng. Dùng chung cho Cổng CTV và Zalo bot.
import { readRecord, readRecordsBatch, updateRecord, RecordError } from './sharedRecords';
import { selfChannelBoardKey } from './boardKeys';
import { listPlansOfMonth, planStoreOf } from './monthlyPlanStore';
import { readMasterCatalog } from './masterCatalogStore';
import { checkSingleLinkServerless } from '../linkAirCheckServer';
import type { LinkAirPlatform } from '../linkAirCheck';
import { EMPTY_CTV_DIRECTORY, type CtvDirectoryData } from '../ctvDirectory';
import {
  EMPTY_SELF_CHANNEL_BOARD,
  isSelfScriptReady,
  sanitizeSelfChannelBoard,
  selfCtvConfirmBlocker,
  type SelfContentCheck,
  type SelfContentCheckItem,
  type SelfAirCheck,
  type SelfChannelBoardData,
  type SelfChannelJob,
  type SelfPublishPlatform,
} from '../selfChannelBoardRules';
import {
  buildSelfContentRuleItems,
  combineContentVerdict,
  type SelfContentEvidence,
} from '../selfChannelContentCheck';
import type { Contributor, InputPlanBreakdownState } from '../types';

export type CtvSubmissionKind = 'SCRIPT' | 'DRAFT' | 'AIR';
export type CtvNextKind = CtvSubmissionKind | 'CONFIRM';

export interface CtvJobRow {
  plan: InputPlanBreakdownState;
  job: SelfChannelJob;
}

const PLATFORM_OF = {
  TIKTOK_BRAND: 'tiktok',
  SHOPEE_VIDEO: 'shopee',
  FACEBOOK_PAGE: 'facebook',
  INSTAGRAM: 'instagram',
  YOUTUBE_SHORTS: 'youtube',
} as const satisfies Record<SelfPublishPlatform, LinkAirPlatform>;

export async function readCtvDirectory(): Promise<CtvDirectoryData> {
  return { ...EMPTY_CTV_DIRECTORY, ...(await readRecord<CtvDirectoryData>('ctv-directory-v1', EMPTY_CTV_DIRECTORY)).data };
}

/** CTV theo tài khoản đối tác (linkedEntityId là mã hoặc id CTV) hoặc theo Zalo ID. */
export function findContributor(directory: CtvDirectoryData, by: { linkedEntityId?: string; zaloUserId?: string }): Contributor | undefined {
  if (by.linkedEntityId) return directory.contributors.find(c => c.id === by.linkedEntityId || c.code === by.linkedEntityId);
  if (by.zaloUserId) return directory.contributors.find(c => c.zaloUserId?.trim() === by.zaloUserId);
  return undefined;
}

/** Tháng hiện tại và tháng trước (giờ Việt Nam), dạng YYYY/MM. */
export function activeMonths(now = Date.now()): string[] {
  const d = new Date(now + 7 * 3_600_000);
  const cur = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const prev = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
  const fmt = (x: Date) => `${x.getUTCFullYear()}/${String(x.getUTCMonth() + 1).padStart(2, '0')}`;
  return [fmt(cur), fmt(prev)];
}

export async function findCtvJobs(contributorId: string, months = activeMonths()): Promise<CtvJobRow[]> {
  const plans = (await Promise.all(months.map(m => listPlansOfMonth(m)))).flat();
  const recs = await readRecordsBatch<SelfChannelBoardData>(plans.map(p => selfChannelBoardKey(p.id)), EMPTY_SELF_CHANNEL_BOARD, { clone: false });
  const rows: CtvJobRow[] = [];
  for (const plan of plans) {
    const data = recs.get(selfChannelBoardKey(plan.id))?.data;
    if (!data?.jobs?.length) continue;
    for (const job of sanitizeSelfChannelBoard(data).jobs) {
      if (job.contributorId === contributorId && job.lifecycleStatus !== 'CANCELLED') rows.push({ plan, job });
    }
  }
  return rows.sort((a, b) => (a.job.deadline || '9').localeCompare(b.job.deadline || '9'));
}

async function patchJob(planId: string, jobId: string, patch: (job: SelfChannelJob) => SelfChannelJob): Promise<SelfChannelJob | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const rec = await readRecord<SelfChannelBoardData>(selfChannelBoardKey(planId), EMPTY_SELF_CHANNEL_BOARD);
    let result: SelfChannelJob | null = null;
    try {
      await updateRecord<SelfChannelBoardData>(selfChannelBoardKey(planId), EMPTY_SELF_CHANNEL_BOARD, rec.revision, prev => {
        const b = sanitizeSelfChannelBoard(prev);
        return {
          ...b,
          jobs: b.jobs.map(j => {
            if (j.id !== jobId) return j;
            result = { ...patch(j), updatedAt: new Date().toISOString() };
            return result;
          }),
        };
      });
      return result;
    } catch (err) {
      if (!(err instanceof RecordError && err.status === 409) || attempt === 2) throw err;
    }
  }
  return null;
}

const isVideoLink = (v: string) => /^https?:\/\/\S+$/i.test(v.trim());

/** Kiểm link đăng của việc: đúng kênh Brand của gian, bài còn hiển thị; ghi kết quả vào việc. */
export async function runSelfAirCheck(plan: InputPlanBreakdownState, jobId: string, actorName: string): Promise<SelfAirCheck> {
  const board = sanitizeSelfChannelBoard((await readRecord<SelfChannelBoardData>(selfChannelBoardKey(plan.id), EMPTY_SELF_CHANNEL_BOARD)).data);
  const job = board.jobs.find(j => j.id === jobId);
  if (!job) throw new RecordError('Không tìm thấy việc (có thể chưa lưu).', 404);
  const link = job.airLink.trim();
  if (!link) throw new RecordError('Việc chưa có link đăng.', 400);

  const { data: catalog } = await readMasterCatalog();
  const store = planStoreOf(plan, catalog);
  const platform = PLATFORM_OF[job.publishPlatform];
  const rawHandle = (store?.selfChannelHandles?.[platform] || '').trim();
  const expectedHandle = rawHandle ? decodeURIComponent(rawHandle.match(/\/@([^/?#]+)/)?.[1] || rawHandle).replace(/^@+/, '').toLowerCase() : null;
  const result = await checkSingleLinkServerless(link, { handle: expectedHandle || undefined });

  const issues = result.checks.filter(c => c.status !== 'PASS').map(c => `${c.label}: ${c.detail}`);
  let verdict = result.verdict;
  if (result.platform && result.platform !== platform) {
    issues.unshift(`Link là bài ${result.platform}, việc ghi đăng trên ${platform}.`);
    verdict = 'FAIL';
  }
  if (!expectedHandle) {
    issues.unshift('Gian chưa khai báo kênh Brand cho nền tảng này nên chưa kiểm được đúng kênh.');
    if (verdict === 'PASS') verdict = 'REVIEW';
  }
  const airCheck: SelfAirCheck = {
    verdict,
    checkedAt: new Date().toISOString(),
    checkedBy: actorName,
    checkedLink: link,
    platform: result.platform,
    authorHandle: result.author.handle,
    expectedHandle,
    publishedAt: result.publishedAt,
    views: result.metrics.views,
    coverUrl: result.coverUrl || null,
    issues,
  };
  // Chỉ ghi khi link chưa bị đổi trong lúc kiểm; điền lượt xem / ngày đăng nếu đang trống
  await patchJob(plan.id, job.id, j =>
    j.airLink.trim() !== link
      ? j
      : {
          ...j,
          airCheck,
          views: typeof airCheck.views === 'number' ? airCheck.views : j.views,
          airedAt: j.airedAt || (airCheck.publishedAt ? new Date(Date.parse(airCheck.publishedAt) + 7 * 3_600_000).toISOString().slice(0, 10) : ''),
        }
  );
  return airCheck;
}

/**
 * Đối chiếu nội dung bài đăng với brief của việc. Máy chỉ đề xuất; kết quả ghi vào việc để người nghiệm thu xem.
 * - Không có modelPatch: đọc lại link, chạy luật từ khóa (luôn chạy được, không cần khóa mô hình).
 * - Có modelPatch: gộp kết quả mô hình (client gọi theo cấu hình mục đích) vào kết quả luật của đúng link đó.
 */
export async function runSelfContentCheck(
  plan: InputPlanBreakdownState,
  jobId: string,
  actorName: string,
  modelPatch?: { items: SelfContentCheckItem[]; suggestion?: string }
): Promise<{ contentCheck: SelfContentCheck; evidence: SelfContentEvidence | null }> {
  const board = sanitizeSelfChannelBoard((await readRecord<SelfChannelBoardData>(selfChannelBoardKey(plan.id), EMPTY_SELF_CHANNEL_BOARD)).data);
  const job = board.jobs.find(j => j.id === jobId);
  if (!job) throw new RecordError('Không tìm thấy việc (có thể chưa lưu).', 404);
  const link = job.airLink.trim();
  if (!link) throw new RecordError('Việc chưa có link đăng.', 400);

  if (modelPatch) {
    const base = job.contentCheck;
    if (!base || base.checkedLink !== link) throw new RecordError('Cần chạy đối chiếu từ khóa trên link hiện tại trước.', 409);
    const items = [...base.items.filter(i => !i.key.startsWith('model-')), ...modelPatch.items];
    const merged: SelfContentCheck = {
      ...base,
      verdict: combineContentVerdict(items),
      source: 'MODEL',
      items,
      suggestion: modelPatch.suggestion || base.suggestion,
      checkedAt: new Date().toISOString(),
      checkedBy: actorName,
    };
    await patchJob(plan.id, job.id, j => (j.airLink.trim() !== link ? j : { ...j, contentCheck: merged }));
    return { contentCheck: merged, evidence: null };
  }

  const result = await checkSingleLinkServerless(link, {});
  if (result.status !== 'LIVE') throw new RecordError(`Không đọc được bài đăng (${result.statusDetail || result.status}). Kiểm tra lại link.`, 422);
  const evidence: SelfContentEvidence = {
    caption: result.caption || '',
    hashtags: result.hashtags || [],
    transcript: result.transcriptText || '',
    hasProductLink: result.hasProductLink,
    productMentions: result.productMentionMoments?.length || 0,
    policyViolations: result.policyViolations || [],
    durationSeconds: result.durationSeconds,
  };
  const items = buildSelfContentRuleItems(job, evidence);
  const contentCheck: SelfContentCheck = {
    verdict: combineContentVerdict(items),
    checkedAt: new Date().toISOString(),
    checkedBy: actorName,
    checkedLink: link,
    source: 'RULES',
    items,
  };
  await patchJob(plan.id, job.id, j => (j.airLink.trim() !== link ? j : { ...j, contentCheck }));
  return { contentCheck, evidence };
}

/** CTV nhận hoặc từ chối việc được giao. */
export async function respondCtvJob(params: {
  contributor: Contributor;
  jobCode: string;
  planId?: string;
  decision: 'CONFIRM' | 'DECLINE';
  reason?: string;
}): Promise<{ ok: boolean; message: string }> {
  const code = params.jobCode.trim().toUpperCase();
  const rows = (await findCtvJobs(params.contributor.id)).filter(r => r.job.code.toUpperCase() === code && (!params.planId || r.plan.id === params.planId));
  if (rows.length === 0) return { ok: false, message: `Không thấy việc ${code} được giao cho bạn.` };
  if (rows.length > 1) return { ok: false, message: `Có ${rows.length} việc cùng mã ${code} ở nhiều gian. Chọn đúng việc trong Cổng CTV.` };
  const { plan, job } = rows[0];
  if (job.ctvConfirmStatus && job.ctvConfirmStatus !== 'ASSIGNED') {
    return { ok: false, message: `Việc ${code} đã được phản hồi, không đổi lại được. Liên hệ người phụ trách nếu cần.` };
  }
  if (job.paymentStatus === 'REQUESTED' || job.paymentStatus === 'PAID' || job.acceptanceStatus === 'PASSED') {
    return { ok: false, message: `Việc ${code} đã nghiệm thu / quyết toán.` };
  }
  if (params.decision === 'DECLINE' && !params.reason?.trim()) return { ok: false, message: 'Ghi lý do từ chối việc.' };
  const nowIso = new Date().toISOString();
  await patchJob(plan.id, job.id, j =>
    params.decision === 'CONFIRM'
      ? { ...j, ctvConfirmStatus: 'CONFIRMED', ctvConfirmedAt: nowIso, ctvDeclineReason: undefined }
      : { ...j, ctvConfirmStatus: 'DECLINED', ctvConfirmedAt: nowIso, ctvDeclineReason: params.reason!.trim().slice(0, 300) }
  );
  return {
    ok: true,
    message: params.decision === 'CONFIRM' ? `Đã nhận việc ${code} (${plan.storeName || plan.title}).` : `Đã từ chối việc ${code}. Người phụ trách sẽ giao lại.`,
  };
}

/**
 * CTV nộp bài vào đúng việc của mình:
 * - SCRIPT: link kịch bản → "Đã nộp kịch bản" (chưa được Brand duyệt).
 * - DRAFT: link video nháp → "Đã nộp video nháp" (kịch bản phải được Brand duyệt).
 * - AIR: link đăng trên kênh Brand (video đã qua QA) → máy chủ kiểm link ngay.
 */
export async function submitCtvWork(params: {
  contributor: Contributor;
  jobCode: string;
  /** Cổng CTV gửi kèm kế hoạch để chọn đúng việc khi trùng mã giữa các gian */
  planId?: string;
  kind: CtvSubmissionKind;
  link: string;
  actorName: string;
}): Promise<{ ok: boolean; message: string; job?: SelfChannelJob; airCheck?: SelfAirCheck }> {
  const link = params.link.trim();
  if (!isVideoLink(link)) return { ok: false, message: 'Link không hợp lệ (cần bắt đầu bằng http).' };
  const code = params.jobCode.trim().toUpperCase();
  const rows = (await findCtvJobs(params.contributor.id)).filter(r => r.job.code.toUpperCase() === code && (!params.planId || r.plan.id === params.planId));
  if (rows.length === 0) return { ok: false, message: `Không thấy việc ${code} được giao cho bạn (tháng này hoặc tháng trước).` };
  if (rows.length > 1) return { ok: false, message: `Có ${rows.length} việc cùng mã ${code} ở nhiều gian. Nộp qua Cổng CTV để chọn đúng việc.` };
  const { plan, job } = rows[0];
  if (job.paymentStatus === 'REQUESTED' || job.paymentStatus === 'PAID' || job.acceptanceStatus === 'PASSED') {
    return { ok: false, message: `Việc ${code} đã nghiệm thu / quyết toán, không nộp lại được.` };
  }

  const confirmBlocker = selfCtvConfirmBlocker(job);
  if (confirmBlocker) return { ok: false, message: confirmBlocker };

  if (params.kind === 'SCRIPT') {
    if (job.scriptStatus === 'NOT_NEEDED') return { ok: false, message: `Việc ${code} không cần kịch bản.` };
    if (job.brandScriptStatus === 'APPROVED' || job.brandScriptStatus === 'PENDING') {
      return { ok: false, message: `Kịch bản việc ${code} đang chờ / đã được Brand duyệt, không nộp đè.` };
    }
    const saved = await patchJob(plan.id, job.id, j => ({ ...j, scriptUrl: link, scriptStatus: 'SUBMITTED' }));
    return { ok: true, message: `Đã nhận kịch bản việc ${code} (${plan.storeName || plan.title}). Content sẽ duyệt rồi gửi Brand.`, job: saved || undefined };
  }

  if (params.kind === 'DRAFT') {
    if (!isSelfScriptReady(job)) return { ok: false, message: `Kịch bản việc ${code} chưa được Brand duyệt, chưa nộp video nháp được.` };
    if (job.videoQaStatus === 'INTERNAL_QA_PASSED' || job.videoQaStatus === 'BRAND_APPROVED') {
      return { ok: false, message: `Video nháp việc ${code} đã được duyệt.` };
    }
    const saved = await patchJob(plan.id, job.id, j => ({ ...j, draftVideoUrl: link, videoQaStatus: 'DRAFT_SUBMITTED' }));
    return { ok: true, message: `Đã nhận video nháp việc ${code}. Content sẽ QA.`, job: saved || undefined };
  }

  if (job.videoQaStatus !== 'INTERNAL_QA_PASSED' && job.videoQaStatus !== 'BRAND_APPROVED') {
    return { ok: false, message: `Video việc ${code} chưa qua QA, chưa đăng được.` };
  }
  const saved = await patchJob(plan.id, job.id, j => ({ ...j, airLink: link }));
  const airCheck = await runSelfAirCheck(plan, job.id, params.actorName).catch(() => undefined);
  const verdictText = !airCheck
    ? 'chưa kiểm được link, Content sẽ kiểm lại'
    : airCheck.verdict === 'PASS'
    ? 'link đạt (đúng kênh Brand, bài đang hiển thị)'
    : `cần xem lại: ${airCheck.issues[0] || ''}`;
  return { ok: true, message: `Đã nhận link đăng việc ${code}: ${verdictText}.`, job: saved || undefined, airCheck };
}

/** Bước tiếp theo của việc, nhìn từ phía CTV. */
export function ctvNextStep(job: SelfChannelJob): { label: string; waitingOnCtv: boolean; kind?: CtvNextKind } {
  if (job.ctvConfirmStatus === 'DECLINED') return { label: 'Bạn đã từ chối việc này', waitingOnCtv: false };
  if (job.ctvConfirmStatus === 'ASSIGNED') return { label: 'Xác nhận nhận việc', waitingOnCtv: true, kind: 'CONFIRM' };
  if (job.paymentStatus === 'PAID') return { label: 'Đã thanh toán', waitingOnCtv: false };
  if (job.paymentStatus === 'REQUESTED') return { label: 'Đã lập đề nghị thanh toán', waitingOnCtv: false };
  if (job.acceptanceStatus === 'PASSED') return { label: 'Đã nghiệm thu, chờ quyết toán cuối tháng', waitingOnCtv: false };
  if (job.scriptStatus !== 'NOT_NEEDED' && !isSelfScriptReady(job)) {
    if (job.brandScriptStatus === 'REVISION') return { label: `Sửa kịch bản theo Brand: ${job.brandScriptNote || ''}`.trim(), waitingOnCtv: true, kind: 'SCRIPT' };
    if (job.scriptStatus === 'REVISION') return { label: `Sửa kịch bản: ${job.scriptNote || ''}`.trim(), waitingOnCtv: true, kind: 'SCRIPT' };
    if (job.scriptStatus === 'DRAFT') return { label: 'Nộp kịch bản', waitingOnCtv: true, kind: 'SCRIPT' };
    if (job.scriptStatus === 'SUBMITTED') return { label: 'Chờ Content duyệt kịch bản', waitingOnCtv: false };
    return { label: 'Chờ Brand duyệt kịch bản', waitingOnCtv: false };
  }
  if (job.videoQaStatus === 'WAITING_DRAFT') return { label: 'Quay và nộp video nháp', waitingOnCtv: true, kind: 'DRAFT' };
  if (job.videoQaStatus === 'REVISION') return { label: `Dựng lại video: ${job.qaNote || ''}`.trim(), waitingOnCtv: true, kind: 'DRAFT' };
  if (job.videoQaStatus === 'DRAFT_SUBMITTED') return { label: 'Chờ Content QA video nháp', waitingOnCtv: false };
  if (!job.airLink.trim()) return { label: 'Đăng lên kênh Brand và gửi link', waitingOnCtv: true, kind: 'AIR' };
  if (job.airCheck?.verdict === 'FAIL' && job.airCheck.checkedLink === job.airLink.trim()) {
    return { label: `Link đăng chưa đạt: ${job.airCheck.issues[0] || ''}`.trim(), waitingOnCtv: true, kind: 'AIR' };
  }
  return { label: 'Chờ nghiệm thu', waitingOnCtv: false };
}
