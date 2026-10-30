// Máy chủ: chuẩn bị phiếu ĐNTT cho một video Content kênh Brand trên sổ phiếu chung với Booking video.
import type { NextRequest } from 'next/server';
import { getPlanActor } from '@/app/api/monthly-plans/_shared';
import { EMPTY_CTV_DIRECTORY, isPartnershipStaff, type CtvDirectoryData } from '../ctvDirectory';
import type { LarkPaymentRequestSlip } from '../larkPaymentRequestEngine';
import { EMPTY_SELF_CHANNEL_BOARD, sanitizeSelfChannelBoard, type SelfChannelBoardData } from '../selfChannelBoardRules';
import { buildSelfChannelPaymentSlip, selfSlipDealCode, type BuiltSelfSlip } from '../selfChannelPaymentSlip';
import { selfChannelBoardKey } from './boardKeys';
import { resolvePlanContext } from './monthlyPlanStore';
import { ledgerByDealCode } from './paymentSlipStore';
import { readRecord, RecordError } from './sharedRecords';

export type PreparedSelfSlip =
  | { ok: true; built: BuiltSelfSlip; ref: { planId: string; jobId: string }; month: string }
  | { ok: false; status: number; error: string; message: string; issues?: BuiltSelfSlip['allIssues'] };

const fail = (status: number, error: string, message: string, issues?: BuiltSelfSlip['allIssues']): PreparedSelfSlip => ({ ok: false, status, error, message, issues });

/**
 * Dựng phiếu từ việc thật trên bảng Self-channel (không tin dữ liệu trình duyệt gửi lên).
 * Người lập: PIC Self-channel / Booking chính / Leader của gian, Partnership, Giám đốc / Admin.
 */
export async function prepareSelfChannelSlip(
  request: NextRequest,
  input: { planId?: string; jobId?: string },
  existingSlips: LarkPaymentRequestSlip[]
): Promise<PreparedSelfSlip> {
  if (!input.planId || !input.jobId) return fail(400, 'MISSING_REFS', 'Thiếu kế hoạch hoặc việc cần lập phiếu.');
  const actor = await getPlanActor(request);
  if (!actor) return fail(401, 'UNAUTHORIZED', 'Phiên đăng nhập hết hạn.');

  const directory: CtvDirectoryData = { ...EMPTY_CTV_DIRECTORY, ...(await readRecord<CtvDirectoryData>('ctv-directory-v1', EMPTY_CTV_DIRECTORY)).data };
  let ctx;
  try {
    ctx = await resolvePlanContext(input.planId, actor);
  } catch (e) {
    if (e instanceof RecordError) return fail(e.status, 'FORBIDDEN', e.message);
    throw e;
  }
  const allowed =
    ctx.global ||
    isPartnershipStaff(actor, directory.partnershipStaff || []) ||
    ['SELF_CHANNEL', 'BOOKING_MAIN', 'LEADER'].some(p => ctx.positions.has(p as never));
  if (!allowed) return fail(403, 'FORBIDDEN', 'Chỉ PIC Content kênh, Leader của gian, Partnership hoặc Giám đốc / Admin được lập phiếu thanh toán.');

  const board = sanitizeSelfChannelBoard((await readRecord<SelfChannelBoardData>(selfChannelBoardKey(input.planId), EMPTY_SELF_CHANNEL_BOARD)).data);
  const job = board.jobs.find(j => j.id === input.jobId);
  if (!job) return fail(404, 'JOB_NOT_FOUND', 'Không tìm thấy việc trên bảng Content kênh (có thể chưa lưu).');
  if (job.lifecycleStatus === 'CANCELLED') return fail(409, 'JOB_CANCELLED', `Việc ${job.code} đã hủy.`);
  if (job.paymentStatus !== 'NONE') return fail(409, 'ALREADY_REQUESTED', `Việc ${job.code} đã có đề nghị thanh toán.`);

  const plan = { id: ctx.plan.id, storeName: ctx.plan.storeName || ctx.plan.title, brandName: ctx.plan.brandName, month: ctx.plan.month };
  const ctv = job.contributorId ? directory.contributors.find(c => c.id === job.contributorId) : undefined;
  const ledger = ledgerByDealCode(existingSlips)[selfSlipDealCode(plan, job)];
  const built = buildSelfChannelPaymentSlip({ job, plan, ctv, ledger });
  if (!built.canSubmit) {
    return fail(422, 'HARD_BLOCK_VALIDATION_FAILED', `Không thể lập phiếu cho ${job.code}: còn ${built.allIssues.length} điều kiện chưa đạt.`, built.allIssues);
  }
  return { ok: true, built, ref: { planId: input.planId, jobId: input.jobId }, month: plan.month };
}
