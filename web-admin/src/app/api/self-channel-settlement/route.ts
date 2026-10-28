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
  const names = new Map<string, string>();
  for (const { planId, storeName, brandName, job } of jobs) {
    if (job.productionMode !== 'CTV_OUTSOURCE' || job.lifecycleStatus === 'CANCELLED') continue;
    if (job.acceptanceStatus !== 'PASSED' || job.paymentStatus !== 'NONE' || job.feeGross <= 0) continue;
    if (held.has(`${planId}::${job.id}`)) continue;
    const key = job.contributorId || '';
    groups.set(key, [
      ...(groups.get(key) || []),
      { planId, jobId: job.id, jobCode: job.code, storeName, brandName, formatKey: job.formatKey, feeGross: job.feeGross, airLink: job.airLink, airedAt: job.airedAt },
    ]);
    if (!names.has(key)) names.set(key, job.contributorName);
  }
  const today = getVietnamDateYmd();
  return Array.from(groups.entries()).map(([contributorId, refs]) => {
    const ctv = contributorId ? directory.contributors.find(c => c.id === contributorId) : undefined;
    const blockers: string[] = [];
    if (!contributorId) blockers.push('Các việc này chưa gắn CTV từ danh bạ (chọn lại CTV trên việc).');
    else if (!ctv) blockers.push('CTV không còn trong danh bạ.');
    if (ctv) {
      if (!ctv.contractCode?.trim() || ctv.contractStatus !== 'ACTIVE') blockers.push('Chưa có Hợp đồng khung đang hiệu lực.');
      else if (ctv.contractExpiryDate && ctv.contractExpiryDate < today) blockers.push(`Hợp đồng khung hết hạn ${ctv.contractExpiryDate}.`);
      if (!(ctv.cccd || ctv.taxCode)?.trim()) blockers.push('Thiếu CCCD / MST.');
      if (!ctv.bankName?.trim() || !ctv.bankAccount?.trim() || !ctv.bankAccountName?.trim()) blockers.push('Thiếu thông tin ngân hàng.');
    }
    const grossTotal = refs.reduce((s, r) => s + r.feeGross, 0);
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
      if (!access.manage) return fail('Chỉ Partnership hoặc Giám đốc / Admin lập quyết toán CTV.', 403);
      const monthRec = await readRecord<SelfSettlementMonthData>(monthKey(body.month), EMPTY_SETTLEMENT_MONTH);
      const candidate = buildCandidates(await loadMonthJobs(body.month), directory, monthRec.data.settlements || []).find(
        c => c.contributorId === body.contributorId
      );
      if (!candidate || !candidate.contributorId) return fail('CTV này không có việc đã nghiệm thu chờ quyết toán trong tháng.', 404);
      if (candidate.blockers.length) return fail(`Chưa lập được: ${candidate.blockers.join(' ')}`, 422);
      const ctv = directory.contributors.find(c => c.id === candidate.contributorId)!;
      const ctvCode = ctv.code || ctv.id;
      const seq = (monthRec.data.settlements || []).filter(s => s.contributorId === ctv.id).length + 1;
      const slipCode = `DNTT-SC-${body.month.replace(/\D/g, '')}-${ctvCode}-${seq}`;
      const bbntCode = selfBbntCodeOf(body.month, ctvCode);
      const payee = { legalId: (ctv.cccd || ctv.taxCode || '').trim(), bankName: ctv.bankName, bankAccount: ctv.bankAccount, bankHolder: ctv.bankAccountName };

      // Gửi Lark trước; production thiếu cấu hình thì dừng, không ghi nhận gì (không "thành công giả")
      let larkMode: SelfMonthlySettlement['larkMode'] = 'SANDBOX';
      let larkInstanceCode: string | undefined;
      let larkWarning: string | undefined;
      if (hasLiveLarkApproval()) {
        try {
          const r = await submitLarkPaymentApproval({
            form: [
              { id: 'slip_code', type: 'input', value: slipCode },
              { id: 'request_type', type: 'input', value: 'Quyết toán CTV video kênh Brand (tháng)' },
              { id: 'deal_codes', type: 'input', value: candidate.jobs.map(j => j.jobCode).join(', ') },
              { id: 'master_contract_codes', type: 'input', value: ctv.contractCode || '' },
              { id: 'appendix_codes', type: 'input', value: bbntCode },
              { id: 'video_asset_net_amount', type: 'amount', value: String(candidate.grossTotal) },
              { id: 'addon_services_net_amount', type: 'amount', value: '0' },
              { id: 'dropped_deduction_amount', type: 'amount', value: '0' },
              { id: 'koc_name', type: 'input', value: ctv.name },
              { id: 'payee_holder', type: 'input', value: payee.bankHolder },
              { id: 'bank_info', type: 'input', value: `${payee.bankName} - ${payee.bankAccount}` },
              { id: 'legal_id', type: 'input', value: payee.legalId },
              { id: 'net_transfer_amount', type: 'amount', value: String(candidate.netTotal) },
              { id: 'gross_contract_amount', type: 'amount', value: String(candidate.grossTotal) },
              { id: 'tax_amount', type: 'amount', value: String(candidate.pitTax) },
            ],
            bitableFields: {
              'Mã phiếu ĐNTT': slipCode,
              'Loại thanh toán': 'Quyết toán CTV Self-channel (tháng)',
              'Danh sách Mã BO': candidate.jobs.map(j => j.jobCode).join(', '),
              'Thương hiệu': Array.from(new Set(candidate.jobs.map(j => j.brandName))).join(', '),
              'Gian hàng': Array.from(new Set(candidate.jobs.map(j => j.storeName))).join(', '),
              KOC: ctv.name,
              'Chủ thể thuế': 'Cá nhân (CTV)',
              'CCCD / MST': payee.legalId,
              'Ngân hàng': payee.bankName,
              'Số tài khoản': payee.bankAccount,
              'Chủ tài khoản': payee.bankHolder,
              'Thuế TNCN 10%': candidate.pitTax,
              'Tổng Gross hợp đồng': candidate.grossTotal,
              'Số tiền thực chuyển': candidate.netTotal,
              'Link Air nghiệm thu': candidate.jobs.map(j => j.airLink).filter(Boolean).join('\n'),
              'Biên bản nghiệm thu': bbntCode,
              'Người tạo phiếu': actor.name,
            },
          });
          larkMode = 'LIVE';
          larkInstanceCode = r.instanceCode;
          larkWarning = r.warning;
        } catch (err) {
          return fail(`Không gửi được phiếu sang Lark: ${err instanceof Error ? err.message : 'lỗi kết nối'}. Chưa ghi nhận gì, có thể thử lại.`, 502);
        }
      } else if (process.env.NODE_ENV === 'production') {
        return fail('Chưa cấu hình Lark Approval (LARK_APPROVAL_DEFINITION_CODE, LARK_BASE_APP_TOKEN). Phiếu chưa được gửi.', 503);
      }

      const settlement: SelfMonthlySettlement = {
        id: `scs-${Date.now()}`,
        month: body.month,
        contributorId: ctv.id,
        contributorName: ctv.name,
        contributorCode: ctvCode,
        contractCode: ctv.contractCode || '',
        bbntCode,
        slipCode,
        jobs: candidate.jobs,
        grossTotal: candidate.grossTotal,
        pitTax: candidate.pitTax,
        netTotal: candidate.netTotal,
        payee,
        status: 'REQUESTED',
        larkMode,
        larkInstanceCode,
        larkWarning,
        requestedAt: nowIso,
        requestedBy: actor.name,
      };
      await mutateMonth(body.month, data => {
        const held = new Set(data.settlements.filter(isOpenSettlement).flatMap(s => s.jobs.map(j => `${j.planId}::${j.jobId}`)));
        if (settlement.jobs.some(j => held.has(`${j.planId}::${j.jobId}`))) throw new RecordError('Một số việc vừa được người khác lập quyết toán. Tải lại để xem.', 409);
        return { ...data, settlements: [settlement, ...data.settlements] };
      });
      // Thuế TNCN theo tổng tháng: có khấu trừ thì mọi việc trong đợt đều trừ 10%
      const withhold = settlement.pitTax > 0;
      const warnings = await applyToBoards(settlement.jobs, j =>
        j.paymentStatus !== 'NONE'
          ? null
          : {
              ...j,
              paymentStatus: 'REQUESTED',
              dnttSlipCode: slipCode,
              bbntCode,
              requestedAt: nowIso,
              requestedBy: actor.name,
              withholdPit10: withhold,
              pitTaxAmount: withhold ? Math.round(j.feeGross * SELF_PIT_RATE) : 0,
              netPayout: j.feeGross - (withhold ? Math.round(j.feeGross * SELF_PIT_RATE) : 0),
            }
      );
      return NextResponse.json({ settlement, warnings: [...(larkWarning ? [larkWarning] : []), ...warnings] }, { headers });
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
