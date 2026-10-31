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

import type { ApprovedBookingListItem } from '../approvedBookingList';
import type { MultiPlatformListingItem } from '../multiPlatformListing';

const APPROVED_BOOKING_LIST_SERVER_KEY = 'approved-booking-list-v2';
const MULTI_PLATFORM_LISTINGS_SERVER_KEY = 'multi-platform-listings-v1';

/**
 * Đồng bộ trạng thái phiếu Lark về danh sách Booking Đa nền tảng (multi-platform-listings-v1)
 */
async function applySlipToMultiPlatformListings(slip: LarkPaymentRequestSlip): Promise<number> {
  const lineByDealCode = new Map<string, LarkPaymentRequestSlip['lineItems'][number]>();
  for (const li of slip.lineItems || []) {
    if (li.dealCode) lineByDealCode.set(li.dealCode.trim().toUpperCase(), li);
    if (li.dealId) lineByDealCode.set(li.dealId.trim().toUpperCase(), li);
  }
  if (lineByDealCode.size === 0) return 0;

  const status = slip.larkSync.approvalStatus;
  let touched = 0;

  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await readRecord<MultiPlatformListingItem[]>(
      MULTI_PLATFORM_LISTINGS_SERVER_KEY,
      [],
    );
    if (!Array.isArray(current.data) || current.data.length === 0) return 0;
    try {
      await updateRecord<MultiPlatformListingItem[]>(
        MULTI_PLATFORM_LISTINGS_SERVER_KEY,
        [],
        current.revision,
        (prev) => {
          if (!Array.isArray(prev)) return [];
          return prev.map((row) => {
            const codeKey = (row.boCode || `MP-DEAL-${row.id}`).trim().toUpperCase();
            const mpFallbackKey = `MP-DEAL-${row.id}`.trim().toUpperCase();
            const idKey = (row.id || '').trim().toUpperCase();
            const matchedLine =
              lineByDealCode.get(codeKey) ||
              lineByDealCode.get(mpFallbackKey) ||
              lineByDealCode.get(idKey);
            if (!matchedLine) return row;

            touched++;
            const isPaid = Boolean(slip.larkSync.daDiTien || status === 'PAID');
            const isRejected = status === 'REJECTED';
            return {
              ...row,
              paymentStatus: isRejected
                ? 'Đủ điều kiện ĐNTT'
                : isPaid
                  ? 'Đã thanh toán'
                  : 'Đã lập ĐNTT',
              stage: isRejected
                ? 'ACCEPTED'
                : isPaid
                  ? 'PAID'
                  : 'PAYMENT_READY',
              updatedAt: new Date().toISOString(),
            };
          });
        },
      );
      break;
    } catch (e) {
      if (!(e instanceof RecordError) || e.status !== 409 || attempt === 2) throw e;
    }
  }
  return touched;
}

/**
 * Đồng bộ trạng thái phiếu Tạm ứng / Tất toán trên Lark về List Duyệt Book (approved-booking-list-v2)
 * đảm bảo RULE-SYNC-01: khi Kế toán / Giám đốc MKT / Leader duyệt hoặc chi tiền từ bất kỳ màn hình nào,
 * dữ liệu trên Bảng 3.2 (ApprovedBookingListView) và Sổ Đối Soát (FinanceAdvancePaymentReportView) khớp 100%.
 */
async function applySlipToApprovedBookingList(slip: LarkPaymentRequestSlip): Promise<number> {
  const lineByDealCode = new Map<string, LarkPaymentRequestSlip['lineItems'][number]>();
  for (const li of slip.lineItems || []) {
    if (li.dealCode) lineByDealCode.set(li.dealCode.trim().toUpperCase(), li);
    if (li.dealId) lineByDealCode.set(li.dealId.trim().toUpperCase(), li);
  }
  if (lineByDealCode.size === 0) return 0;

  const status = slip.larkSync.approvalStatus;
  let touched = 0;

  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await readRecord<ApprovedBookingListItem[]>(
      APPROVED_BOOKING_LIST_SERVER_KEY,
      [],
    );
    if (!Array.isArray(current.data) || current.data.length === 0) return 0;
    try {
      await updateRecord<ApprovedBookingListItem[]>(
        APPROVED_BOOKING_LIST_SERVER_KEY,
        [],
        current.revision,
        (prev) => {
          if (!Array.isArray(prev)) return [];
          return prev.map((row) => {
            const codeKey = (row.maBooking || '').trim().toUpperCase();
            const idKey = (row.id || '').trim().toUpperCase();
            const matchedLine = lineByDealCode.get(codeKey) || lineByDealCode.get(idKey);
            if (!matchedLine) return row;

            touched++;
            const isPaid = Boolean(slip.larkSync.daDiTien || status === 'PAID');
            const isRejected = status === 'REJECTED';
            const isApproved = status === 'APPROVED' || isPaid;

            if (slip.requestType === 'ADVANCE') {
              const nextAdvanceStatus: ApprovedBookingListItem['larkAdvanceStatus'] = isRejected
                ? 'TỪ_CHỐI_TẠM_ỨNG'
                : isPaid
                  ? 'ĐÃ_CHI_TẠM_ỨNG'
                  : isApproved
                    ? 'ĐÃ_DUYỆT_TẠM_ỨNG'
                    : 'CHỜ_DUYỆT_TẠM_ỨNG';
              const nextPaymentStatus: ApprovedBookingListItem['trangThaiPhieuThanhToan'] = isRejected
                ? 'Từ chối duyệt'
                : isPaid || isApproved
                  ? 'Đã tạm ứng'
                  : 'Đang duyệt Lark';
              const paidAdvAmount = isPaid
                ? Math.max(
                    row.soTienDaThanhToan || 0,
                    matchedLine.netTransferAmount || row.soTienTamUngTruoc || 0,
                  )
                : row.soTienDaThanhToan;
              return {
                ...row,
                larkAdvanceSlipCode: slip.slipCode,
                larkAdvanceInstanceCode: slip.larkSync.approvalInstanceCode,
                larkAdvanceStatus: nextAdvanceStatus,
                larkApprovalStatus: status,
                larkApprovalRouteSummary:
                  slip.approvalRoute?.routeSummary || row.larkApprovalRouteSummary,
                larkSyncedAt: slip.larkSync.syncedAt,
                trangThaiPhieuThanhToan: nextPaymentStatus,
                soTienDaThanhToan: paidAdvAmount,
                uncBillCode: slip.larkSync.uncBillCode || row.uncBillCode,
                uncSentToKocAt: slip.larkSync.uncSentToKocAt || row.uncSentToKocAt,
              };
            }

            // SETTLEMENT (Tất toán ĐNTT)
            const nextSettlementStatus: ApprovedBookingListItem['trangThaiPhieuThanhToan'] =
              isRejected
                ? 'Từ chối duyệt'
                : isPaid
                  ? 'Đã thanh toán'
                  : isApproved
                    ? 'Đã duyệt chờ chi'
                    : 'Đang duyệt Lark';
            return {
              ...row,
              larkSlipCode: slip.slipCode,
              larkApprovalInstanceCode: slip.larkSync.approvalInstanceCode,
              larkApprovalStatus: status,
              larkApprovalRouteSummary:
                slip.approvalRoute?.routeSummary || row.larkApprovalRouteSummary,
              larkSyncedAt: slip.larkSync.syncedAt,
              trangThaiPhieuThanhToan: nextSettlementStatus,
              chotData: isRejected ? row.chotData : true,
              unlockRequestBatch: isRejected ? row.unlockRequestBatch : 'NONE',
              daDiTien: isPaid ? true : isRejected ? false : row.daDiTien,
              soTienDaThanhToan: isPaid
                ? row.chiPhiBookingNetCuoi - (row.khauTruHangMucHuy || 0)
                : row.soTienDaThanhToan,
              soTienCanThanhToan: isPaid ? 0 : row.soTienCanThanhToan,
              uncBillCode: slip.larkSync.uncBillCode || row.uncBillCode,
              uncSentToKocAt: slip.larkSync.uncSentToKocAt || row.uncSentToKocAt,
            };
          });
        },
      );
      break;
    } catch (e) {
      if (!(e instanceof RecordError) || e.status !== 409 || attempt === 2) throw e;
    }
  }
  return touched;
}

export async function applySlipStatusToJobs(slip: LarkPaymentRequestSlip): Promise<number> {
  const selfTouched = await applySlipToSelfBoards(slip);
  const approvedTouched = await applySlipToApprovedBookingList(slip).catch(() => 0);
  const mpTouched = await applySlipToMultiPlatformListings(slip).catch(() => 0);
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
  return touched + selfTouched + approvedTouched + mpTouched;
}
