import type { LarkPaymentRequestSlip } from '../larkPaymentRequestEngine';
import { EMPTY_DEAL_BOARD, sanitizeDealBoard, type DealBoardData } from '../dealBoardRules';
import { getVietnamDateYmd } from '../format';
import { dealBoardKey } from './boardKeys';
import { readRecord, RecordError, updateRecord } from './sharedRecords';

/**
 * Đưa trạng thái phiếu Lark về các Job của phiếu (máy chủ ghi, không qua quyền người dùng):
 * - Phiếu tất toán: ghi bước duyệt; Kế toán xác nhận chi (PAID) thì Job chuyển Đã thanh toán.
 * - Phiếu tạm ứng: duyệt xong thì tạm ứng Đã duyệt; chi xong thì Đã chi.
 */
export async function applySlipStatusToJobs(slip: LarkPaymentRequestSlip): Promise<number> {
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
                  const next = status === 'PAID' ? 'PAID' : status === 'APPROVED' ? 'APPROVED' : adv.status;
                  return { ...j, advancePayment: { ...adv, status: next, larkSlipCode: adv.larkSlipCode || slip.slipCode, paidAt: next === 'PAID' ? adv.paidAt || today : adv.paidAt } };
                }
                const paid = status === 'PAID';
                return {
                  ...j,
                  payment: {
                    ...j.payment,
                    larkApprovalStatus: status,
                    larkSlipCode: j.payment.larkSlipCode || slip.slipCode,
                    status: paid ? 'PAID' : j.payment.status,
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
  return touched;
}
