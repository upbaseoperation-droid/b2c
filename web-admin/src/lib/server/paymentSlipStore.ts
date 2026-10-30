import type { DealPaymentLedgerEntry, LarkPaymentRequestSlip } from '../larkPaymentRequestEngine';
import { readRecord, RecordError, updateRecord } from './sharedRecords';

/** Phiếu Tạm ứng / ĐNTT đã đẩy sang Lark: lưu bền (không mất khi khởi động lại máy chủ) và làm sổ chống lập trùng. */
const KEY = 'lark-payment-slips';
type SlipBook = { slips: LarkPaymentRequestSlip[] };
const EMPTY: SlipBook = { slips: [] };

export async function listPaymentSlips(): Promise<LarkPaymentRequestSlip[]> {
  const rec = await readRecord<SlipBook>(KEY, EMPTY);
  return Array.isArray(rec.data.slips) ? rec.data.slips : [];
}

/** Sổ theo mã đơn: đã tạm ứng bao nhiêu, đã lập tất toán chưa (bỏ qua phiếu bị từ chối trên Lark). */
export function ledgerByDealCode(slips: LarkPaymentRequestSlip[]): Record<string, DealPaymentLedgerEntry> {
  const ledger: Record<string, DealPaymentLedgerEntry> = {};
  for (const slip of slips) {
    if (slip.larkSync?.approvalStatus === 'REJECTED') continue;
    for (const item of slip.lineItems) {
      const entry = (ledger[item.dealCode] ??= { advanceRequestedAmount: 0, settlementRequested: false });
      if (slip.requestType === 'ADVANCE') entry.advanceRequestedAmount += item.requestBaseNetAmount;
      else entry.settlementRequested = true;
    }
  }
  return ledger;
}

/**
 * Ghi phiếu theo kiểu đọc-sửa-ghi có kiểm phiên bản; thử lại khi người khác vừa ghi.
 * `mutate` nhận danh sách mới nhất, trả danh sách cần lưu; ném lỗi để chặn (ví dụ trùng phiếu).
 */
export async function mutatePaymentSlips(
  mutate: (slips: LarkPaymentRequestSlip[]) => LarkPaymentRequestSlip[]
): Promise<LarkPaymentRequestSlip[]> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const current = await readRecord<SlipBook>(KEY, EMPTY);
    try {
      const saved = await updateRecord<SlipBook>(KEY, EMPTY, current.revision, prev => ({
        slips: mutate(Array.isArray(prev.slips) ? prev.slips : []),
      }));
      return saved.data.slips;
    } catch (e) {
      if (!(e instanceof RecordError) || e.status !== 409 || attempt === 3) throw e;
    }
  }
  throw new RecordError('Không lưu được phiếu, thử lại.', 409);
}
