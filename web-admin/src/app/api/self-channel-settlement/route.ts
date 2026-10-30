import { NextRequest, NextResponse } from 'next/server';
import { readRecord, readRecordsBatch, updateRecord, RecordError } from '@/lib/server/sharedRecords';
import { selfChannelBoardKey } from '@/lib/server/boardKeys';
import { listPlansOfMonth } from '@/lib/server/monthlyPlanStore';
import { isStaffGlobalAdminOrManager } from '@/lib/rbacScope';
import { EMPTY_CTV_DIRECTORY, isPartnershipStaff, type CtvDirectoryData } from '@/lib/ctvDirectory';
import { EMPTY_SELF_CHANNEL_BOARD, sanitizeSelfChannelBoard, type SelfChannelBoardData, type SelfChannelJob } from '@/lib/selfChannelBoardRules';
import {
  EMPTY_SETTLEMENT_MONTH,
  isOpenSettlement,
  monthlyPitOf,
  requiresSelfContract,
  selfBbntCodeOf,
  SELF_PIT_RATE,
  type SelfMonthlySettlement,
  type SelfSettlementCandidate,
  type SelfSettlementJobRef,
  type SelfSettlementMonthData,
} from '@/lib/selfChannelSettlement';
import { fetchLarkApprovalStatus, hasLiveLarkApproval, submitLarkPaymentApproval } from '@/lib/server/larkPaymentApproval';
import { getVietnamDateYmd } from '@/lib/format';
import type { UserProfile } from '@/lib/types';
import { getPlanActor, handlePlanError, unauthorized } from '../monthly-plans/_shared';

export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'no-store' };
const monthKey = (month: string) => `self-channel-settlement-${month.replace(/\D/g, '').slice(0, 6)}`;
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers });
const isValidMonth = (m: string) => /^\d{4}\/\d{2}$/.test(m);

async function readDirectory(): Promise<CtvDirectoryData> {
  return { ...EMPTY_CTV_DIRECTORY, ...(await readRecord<CtvDirectoryData>('ctv-directory-v1', EMPTY_CTV_DIRECTORY)).data };
}

/** Partnership / Giám đốc lập và hủy; Kế toán xác nhận đã chi; cả hai được xem. */
function accessOf(user: UserProfile, directory: CtvDirectoryData) {
  const global = isStaffGlobalAdminOrManager(user);
  const finance = user.role === 'FINANCE' || Boolean(user.permissions?.includes('canApprovePayment'));
  const manage = global || isPartnershipStaff(user, directory.partnershipStaff || []);
  return { manage, finance, view: manage || finance };
}

/** Việc của tháng trên mọi gian, kèm thông tin gian. */
async function loadMonthJobs(month: string) {
  const plans = await listPlansOfMonth(month);
  const recs = await readRecordsBatch<SelfChannelBoardData>(plans.map(p => selfChannelBoardKey(p.id)), EMPTY_SELF_CHANNEL_BOARD, { clone: false });
  const out: { planId: string; storeName: string; brandName: string; job: SelfChannelJob }[] = [];
  for (const p of plans) {
    const data = recs.get(selfChannelBoardKey(p.id))?.data;
    if (!data?.jobs?.length) continue;
    for (const job of sanitizeSelfChannelBoard(data).jobs) out.push({ planId: p.id, storeName: p.storeName || p.title, brandName: p.brandName, job });
  }
  return out;
}

function buildCandidates(
  jobs: Awaited<ReturnType<typeof loadMonthJobs>>,
  directory: CtvDirectoryData,
  settlements: SelfMonthlySettlement[]
): SelfSettlementCandidate[] {
  const held = new Set(settlements.filter(isOpenSettlement).flatMap(s => s.jobs.map(j => `${j.planId}::${j.jobId}`)));
  const groups = new Map<string, SelfSettlementJobRef[]>();
  const monthGrossByCtv = new Map<string, number>();
  const names = new Map<string, string>();
  for (const { planId, storeName, brandName, job } of jobs) {
    if (job.productionMode !== 'CTV_OUTSOURCE' || job.lifecycleStatus === 'CANCELLED') continue;
    const key = job.contributorId || '';
    if (job.acceptanceStatus === 'PASSED' && job.feeGross > 0) {
      monthGrossByCtv.set(key, (monthGrossByCtv.get(key) || 0) + job.feeGross);
    }
    if (job.acceptanceStatus !== 'PASSED' || job.paymentStatus !== 'NONE' || job.feeGross <= 0) continue;
    if (held.has(`${planId}::${job.id}`)) continue;
    groups.set(key, [
      ...(groups.get(key) || []),
      { planId, jobId: job.id, jobCode: job.code, storeName, brandName, formatKey: job.formatKey, feeGross: job.feeGross, airLink: job.airLink, airedAt: job.airedAt },
    ]);
    if (!names.has(key)) names.set(key, job.contributorName);
  }
  const today = getVietnamDateYmd();
  return Array.from(groups.entries()).map(([contributorId, refs]) => {
    const ctv = contributorId ? directory.contributors.find(c => c.id === contributorId) : undefined;
    const grossTotal = refs.reduce((s, r) => s + r.feeGross, 0);
    const cumulativeMonthGross = Math.max(grossTotal, monthGrossByCtv.get(contributorId) || 0);
    const contractRequired = requiresSelfContract(cumulativeMonthGross);
    const blockers: string[] = [];
    if (!contributorId) blockers.push('Các việc này chưa gắn CTV từ danh bạ (chọn lại CTV trên việc).');
    else if (!ctv) blockers.push('CTV không còn trong danh bạ.');
    if (ctv) {
      if (contractRequired) {
        if (!ctv.contractCode?.trim() || ctv.contractStatus !== 'ACTIVE') {
          blockers.push('Tổng thù lao tháng từ 10.000.000đ trở lên bắt buộc có Hợp đồng khung đang hiệu lực.');
        } else if (ctv.contractExpiryDate && ctv.contractExpiryDate < today) {
          blockers.push(`Hợp đồng khung hết hạn ${ctv.contractExpiryDate}.`);
        }
      }
      if (!(ctv.cccd || ctv.taxCode)?.trim()) blockers.push('Thiếu CCCD / MST.');
      if (!ctv.bankName?.trim() || !ctv.bankAccount?.trim() || !ctv.bankAccountName?.trim()) blockers.push('Thiếu thông tin ngân hàng.');
    }
    const pitTax = monthlyPitOf(grossTotal);
    return {
      contributorId,
      contributorName: ctv?.name || names.get(contributorId) || '(Chưa gắn CTV)',
      contributorCode: ctv?.code || '',
      jobs: refs,
      grossTotal,
      pitTax,
      netTotal: grossTotal - pitTax,
      blockers,
    };
  });
}

/** Ghi trạng thái thanh toán của đợt quyết toán vào từng việc trên bảng của từng gian. */
async function applyToBoards(refs: SelfSettlementJobRef[], patch: (job: SelfChannelJob) => SelfChannelJob | null): Promise<string[]> {
  const warnings: string[] = [];
  const byPlan = new Map<string, Set<string>>();
  for (const r of refs) byPlan.set(r.planId, new Set([...(byPlan.get(r.planId) || []), r.jobId]));
  for (const [planId, ids] of byPlan) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const rec = await readRecord<SelfChannelBoardData>(selfChannelBoardKey(planId), EMPTY_SELF_CHANNEL_BOARD);
      try {
        await updateRecord<SelfChannelBoardData>(selfChannelBoardKey(planId), EMPTY_SELF_CHANNEL_BOARD, rec.revision, prev => {
          const board = sanitizeSelfChannelBoard(prev);
          return {
            ...board,
            jobs: board.jobs.map(j => {
              if (!ids.has(j.id)) return j;
              const next = patch(j);
              if (!next) {
                warnings.push(`Việc ${j.code} đã đổi trạng thái thanh toán trước đó, giữ nguyên.`);
                return j;
              }
              return { ...next, updatedAt: new Date().toISOString() };
            }),
          };
        });
        break;
      } catch (err) {
        if (!(err instanceof RecordError && err.status === 409) || attempt === 2) throw err;
      }
    }
  }
  return warnings;
}

const releaseJob = (slipCode: string) => (j: SelfChannelJob): SelfChannelJob | null =>
  j.dnttSlipCode === slipCode && j.paymentStatus === 'REQUESTED'
    ? { ...j, paymentStatus: 'NONE', dnttSlipCode: undefined, bbntCode: undefined, requestedAt: undefined, requestedBy: undefined }
    : null;

async function mutateMonth(month: string, fn: (data: SelfSettlementMonthData) => SelfSettlementMonthData) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const rec = await readRecord<SelfSettlementMonthData>(monthKey(month), EMPTY_SETTLEMENT_MONTH);
    try {
      return await updateRecord<SelfSettlementMonthData>(monthKey(month), EMPTY_SETTLEMENT_MONTH, rec.revision, prev => fn({ ...EMPTY_SETTLEMENT_MONTH, ...prev }));
    } catch (err) {
      if (!(err instanceof RecordError && err.status === 409) || attempt === 2) throw err;
    }
  }
  throw new RecordError('Nhiều người đang lưu cùng lúc, vui lòng thử lại.', 409);
}

// GET /api/self-channel-settlement?month=2026/10 — CTV cần quyết toán (gộp mọi gian) và các đợt đã lập trong tháng
export async function GET(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  try {
    const month = request.nextUrl.searchParams.get('month') || '';
    if (!isValidMonth(month)) return fail('Tháng không hợp lệ (YYYY/MM).', 400);
    const directory = await readDirectory();
    const access = accessOf(actor, directory);
    if (!access.view) return fail('Chỉ Partnership, Giám đốc / Admin hoặc Kế toán xem quyết toán CTV.', 403);
    const [jobs, monthRec] = await Promise.all([loadMonthJobs(month), readRecord<SelfSettlementMonthData>(monthKey(month), EMPTY_SETTLEMENT_MONTH)]);
    const settlements = monthRec.data.settlements || [];
    return NextResponse.json(
      { candidates: buildCandidates(jobs, directory, settlements), settlements, access, larkLive: hasLiveLarkApproval() },
      { headers }
    );
  } catch (err) {
    if (err instanceof RecordError) return fail(err.message, err.status);
    return handlePlanError(err);
  }
}

type SettlementOp =
  | { op: 'create'; month: string; contributorId: string }
  | { op: 'syncLark'; month: string; id: string }
  | { op: 'markPaid'; month: string; id: string; uncRef: string }
  | { op: 'cancel'; month: string; id: string };

// POST /api/self-channel-settlement — lập BBNT + ĐNTT (Partnership), đồng bộ trạng thái Lark, Kế toán xác nhận đã chi, hủy đợt
export async function POST(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  try {
    const body = (await request.json().catch(() => null)) as SettlementOp | null;
    if (!body || !isValidMonth(body.month || '')) return fail('Dữ liệu gửi lên không hợp lệ.', 400);
    const directory = await readDirectory();
    const access = accessOf(actor, directory);
    const nowIso = new Date().toISOString();

    if (body.op === 'create') {
      // Đã chuyển sang phiếu từng video dùng chung sổ phiếu và kết nối Lark với Booking video
      return fail('Không lập đợt quyết toán tháng nữa. Lập phiếu thanh toán từng video ở tab Thanh toán (POST /api/integrations/larkbase/payment-requests, source SELF_CHANNEL).', 410);
    }

    const monthRec = await readRecord<SelfSettlementMonthData>(monthKey(body.month), EMPTY_SETTLEMENT_MONTH);
    const current = (monthRec.data.settlements || []).find(s => s.id === body.id);
    if (!current) return fail('Không tìm thấy đợt quyết toán.', 404);
    const update = (patch: Partial<SelfMonthlySettlement>) =>
      mutateMonth(body.month, data => ({ ...data, settlements: data.settlements.map(s => (s.id === current.id ? { ...s, ...patch } : s)) }));

    if (body.op === 'syncLark') {
      if (!access.view) return fail('Không có quyền.', 403);
      if (current.larkMode !== 'LIVE' || !current.larkInstanceCode) return fail('Đợt này chưa gửi Lark (môi trường thử).', 400);
      if (current.status === 'PAID' || current.status === 'CANCELLED') return NextResponse.json({ settlement: current }, { headers });
      let larkStatus: string;
      try {
        larkStatus = await fetchLarkApprovalStatus(current.larkInstanceCode);
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Không hỏi được trạng thái Lark.', 502);
      }
      const rejected = ['REJECTED', 'CANCELED', 'DELETED'].includes(larkStatus);
      const status: SelfMonthlySettlement['status'] = rejected ? 'REJECTED' : larkStatus === 'APPROVED' ? 'APPROVED' : 'REQUESTED';
      await update({ status, larkStatus });
      // Lark từ chối / hủy: trả việc về chưa lập ĐNTT để sửa hồ sơ rồi lập đợt mới
      const warnings = rejected ? await applyToBoards(current.jobs, releaseJob(current.slipCode)) : [];
      return NextResponse.json({ settlement: { ...current, status, larkStatus }, warnings }, { headers });
    }

    if (body.op === 'markPaid') {
      if (!access.finance) return fail('Chỉ Kế toán được xác nhận đã chi.', 403);
      const uncRef = String(body.uncRef || '').trim();
      if (!uncRef) return fail('Nhập mã lệnh chi / UNC.', 400);
      const ready = current.status === 'APPROVED' || (current.larkMode === 'SANDBOX' && current.status === 'REQUESTED');
      if (!ready) return fail('Chỉ xác nhận chi khi phiếu đã được duyệt trên Lark (bấm Đồng bộ Lark trước).', 400);
      await update({ status: 'PAID', paidAt: nowIso, paidBy: actor.name, uncRef });
      const warnings = await applyToBoards(current.jobs, j =>
        j.dnttSlipCode !== current.slipCode ? null : { ...j, paymentStatus: 'PAID', paidAt: getVietnamDateYmd(), uncRef }
      );
      return NextResponse.json({ settlement: { ...current, status: 'PAID', uncRef }, warnings }, { headers });
    }

    if (body.op === 'cancel') {
      if (!access.manage) return fail('Chỉ Partnership hoặc Giám đốc / Admin hủy đợt quyết toán.', 403);
      if (current.status !== 'REQUESTED') return fail('Chỉ hủy được đợt đang chờ duyệt (chưa duyệt / chưa chi).', 400);
      await update({ status: 'CANCELLED', cancelledAt: nowIso, cancelledBy: actor.name });
      const warnings = await applyToBoards(current.jobs, releaseJob(current.slipCode));
      if (current.larkMode === 'LIVE') warnings.unshift(`Nhớ rút phiếu ${current.slipCode} trên Lark Approval.`);
      return NextResponse.json({ settlement: { ...current, status: 'CANCELLED' }, warnings }, { headers });
    }

    return fail('Thao tác không hợp lệ.', 400);
  } catch (err) {
    if (err instanceof RecordError) return fail(err.message, err.status);
    return handlePlanError(err);
  }
}
