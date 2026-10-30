import type { LarkPaymentRequestSlip } from '../larkPaymentRequestEngine';
import { EMPTY_DEAL_BOARD, sanitizeDealBoard, type DealBoardData } from '../dealBoardRules';
import { getVietnamDateYmd } from '../format';
import { EMPTY_SELF_CHANNEL_BOARD, sanitizeSelfChannelBoard, type SelfChannelBoardData } from '../selfChannelBoardRules';
import { dealBoardKey, selfChannelBoardKey } from './boardKeys';
import { readRecord, RecordError, updateRecord } from './sharedRecords';

/**
 * Đưa trạng thái phiếu Lark về các Job của phiếu (máy chủ ghi, không qua quyền người dùng):
 * - Phiếu tất toán: ghi bước duyệt; Kế toán xác nhận chi (PAID) thì Job chuyển Đã thanh toán; nếu REJECTED thì mở khóa Job để lập lại.
 * - Phiếu tạm ứng: duyệt xong thì tạm ứng Đã duyệt; chi xong thì Đã chi; nếu REJECTED thì trả về REQUIRED để sửa và gửi lại.
 */
/**
 * Phiếu Content kênh Brand (mỗi phiếu một video): trạng thái phiếu về việc trên bảng Self-channel.
 * Đã lập / đang duyệt / đã duyệt → "Đã lập ĐNTT"; Kế toán đã chi (đã đi tiền + UNC) → "Đã thanh toán"; Lark từ chối hoặc hủy → mở khóa để sửa hồ sơ rồi lập lại.
 */
async function applySlipToSelfBoards(slip: LarkPaymentRequestSlip): Promise<number> {
  const refs = slip.selfJobRefs || [];
  if (refs.length === 0) return 0;
  const byPlan = new Map<string, Set<string>>();
  for (const r of refs) byPlan.set(r.planId, new Set([...(byPlan.get(r.planId) || []), r.jobId]));
  const status = slip.larkSync.approvalStatus;
  const line = slip.lineItems[0];
  const today = getVietnamDateYmd();
  let touched = 0;
  for (const [planId, jobIds] of byPlan) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const current = await readRecord<SelfChannelBoardData>(selfChannelBoardKey(planId), EMPTY_SELF_CHANNEL_BOARD);
      try {
        await updateRecord<SelfChannelBoardData>(selfChannelBoardKey(planId), EMPTY_SELF_CHANNEL_BOARD, current.revision, prev => {
          const board = sanitizeSelfChannelBoard(prev);
          return {
            ...board,
            jobs: board.jobs.map(j => {
              if (!jobIds.has(j.id)) return j;
              // Chỉ đụng việc thuộc đúng phiếu này (hoặc việc chưa gắn phiếu nào)
              if (j.dnttSlipCode && j.dnttSlipCode !== slip.slipCode) return j;
              touched++;
              const stamp = { updatedAt: new Date().toISOString() };
              if (status === 'REJECTED') {
                return { ...j, ...stamp, paymentStatus: 'NONE' as const, dnttSlipCode: undefined, requestedAt: undefined, requestedBy: undefined, paidAt: undefined, uncRef: undefined, paymentNote: slip.larkSync.rejectedReason || 'Phiếu bị từ chối trên Lark' };
              }
              const pit = line?.pitDeductionAmount ?? j.pitTaxAmount;
              const base = {
                ...j,
                ...stamp,
                dnttSlipCode: slip.slipCode,
                requestedAt: j.requestedAt || slip.createdAt,
                requestedBy: j.requestedBy || slip.createdBy,
                withholdPit10: pit > 0,
                pitTaxAmount: pit,
                netPayout: line?.netTransferAmount ?? j.netPayout,
              };
              return status === 'PAID'
                ? { ...base, paymentStatus: 'PAID' as const, paidAt: j.paidAt || today, uncRef: slip.larkSync.uncBillCode || j.uncRef }
                : { ...base, paymentStatus: 'REQUESTED' as const };
            }),
          };
        });
        break;
      } catch (e) {
        if (!(e instanceof RecordError) || e.status !== 409 || attempt === 2) throw e;
      }
    }
  }
  return touched;
}

export async function applySlipStatusToJobs(slip: LarkPaymentRequestSlip): Promise<number> {
  const selfTouched = await applySlipToSelfBoards(slip);
  const refs = slip.planJobRefs || [];
  const byPlan = new Map<string, Set<string>>();
  for (const r of refs) byPlan.set(r.planId, new Set([...(byPlan.get(r.planId) || []), r.jobId]));
  const status = slip.larkSync.approvalStatus;
  const today = getVietnamDateYmd();
  let touched = 0;
  for (const [planId, jobIds] of byPlan) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const current = await readRecord<DealBoardData>(dealBoardKey(planId), EMPTY_DEAL_BOARD);
      try {
        await updateRecord<DealBoardData>(dealBoardKey(planId), EMPTY_DEAL_BOARD, current.revision, prev => {
          const board = sanitizeDealBoard(prev);
          return {
            ...board,
            deals: board.deals.map(d => ({
              ...d,
              jobs: (d.jobs || []).map(j => {
                if (!jobIds.has(j.id)) return j;
                touched++;
                if (slip.requestType === 'ADVANCE') {
                  const adv = j.advancePayment || { status: 'REQUESTED' as const, amount: null };
                  const next =
                    status === 'PAID'
                      ? 'PAID'
                      : status === 'APPROVED'
                      ? 'APPROVED'
                      : status === 'REJECTED'
                      ? 'REQUIRED'
                      : adv.status;
                  return {
                    ...j,
                    advancePayment: {
                      ...adv,
                      status: next,
                      larkSlipCode: adv.larkSlipCode || slip.slipCode,
                      paidAt: next === 'PAID' ? adv.paidAt || today : adv.paidAt,
                      note:
                        status === 'REJECTED'
                          ? slip.larkSync.rejectedReason || 'Phiếu tạm ứng bị từ chối trên Lark'
                          : adv.note,
                    },
                  };
                }
                const paid = status === 'PAID';
                const rejected = status === 'REJECTED';
                return {
                  ...j,
                  payment: {
                    ...j.payment,
                    larkApprovalStatus: status,
                    larkSlipCode: j.payment.larkSlipCode || slip.slipCode,
                    status: paid ? 'PAID' : rejected ? 'NONE' : j.payment.status,
                    paidAt: paid ? j.payment.paidAt || today : j.payment.paidAt,
                  },
                };
              }),
            })),
          };
        });
        break;
      } catch (e) {
        if (!(e instanceof RecordError) || e.status !== 409 || attempt === 2) throw e;
      }
    }
  }
  return touched + selfTouched;
}
