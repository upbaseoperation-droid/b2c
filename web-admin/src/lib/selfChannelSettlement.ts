// Quyết toán CTV Self-channel theo tháng: gom việc đã nghiệm thu của 1 CTV qua mọi gian, BBNT sản lượng tháng,
// thuế TNCN tính trên tổng thu nhập tháng, một phiếu ĐNTT Lark cho mỗi CTV mỗi tháng.
import type { SelfFormatKey } from './selfChannelBoardRules';

/** Tổng thu nhập tháng của CTV từ mức này trở lên thì khấu trừ 10% TNCN (theo tổng tháng, không theo từng việc). */
export const SELF_PIT_MONTHLY_THRESHOLD = 2_000_000;
export const SELF_PIT_RATE = 0.1;

/** Ngưỡng bắt buộc ký Hợp đồng đối với Cá nhân / CTV theo quy định BR-03 §2 (từ 10.000.000đ trở lên). Dưới ngưỡng này không bắt buộc HĐ, chỉ cần CCCD/MST + TK ngân hàng. */
export const SELF_CONTRACT_MONTHLY_THRESHOLD = 10_000_000;

export function requiresSelfContract(grossTotal: number): boolean {
  return grossTotal >= SELF_CONTRACT_MONTHLY_THRESHOLD;
}

export function monthlyPitOf(grossTotal: number): number {
  return grossTotal >= SELF_PIT_MONTHLY_THRESHOLD ? Math.round(grossTotal * SELF_PIT_RATE) : 0;
}

/** Mã BBNT sản lượng tháng: BBNT-SC-YYYYMM-<mã CTV>. */
export function selfBbntCodeOf(month: string, ctvCode: string): string {
  return `BBNT-SC-${month.replace(/\D/g, '').slice(0, 6)}-${ctvCode.replace(/[^A-Za-z0-9-]/g, '').toUpperCase()}`;
}

export interface SelfSettlementJobRef {
  planId: string;
  jobId: string;
  jobCode: string;
  storeName: string;
  brandName: string;
  formatKey: SelfFormatKey;
  feeGross: number;
  airLink: string;
  airedAt: string;
}

export type SelfMonthlySettlementStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'PAID' | 'CANCELLED';

export const SELF_SETTLEMENT_STATUS_LABEL: Record<SelfMonthlySettlementStatus, string> = {
  REQUESTED: 'Đã gửi duyệt',
  APPROVED: 'Lark đã duyệt, chờ chi',
  REJECTED: 'Lark từ chối / hủy',
  PAID: 'Kế toán đã chi',
  CANCELLED: 'Đã hủy',
};

export interface SelfMonthlySettlement {
  id: string;
  month: string;
  contributorId: string;
  contributorName: string;
  contributorCode: string;
  contractCode: string;
  bbntCode: string;
  slipCode: string;
  jobs: SelfSettlementJobRef[];
  grossTotal: number;
  pitTax: number;
  netTotal: number;
  payee: { legalId: string; bankName: string; bankAccount: string; bankHolder: string };
  status: SelfMonthlySettlementStatus;
  /** LIVE: đã tạo phiếu duyệt thật trên Lark; SANDBOX: môi trường thử, chưa gửi Lark */
  larkMode: 'LIVE' | 'SANDBOX';
  larkInstanceCode?: string;
  larkStatus?: string;
  larkWarning?: string;
  requestedAt: string;
  requestedBy: string;
  paidAt?: string;
  paidBy?: string;
  uncRef?: string;
  cancelledAt?: string;
  cancelledBy?: string;
}

export interface SelfSettlementMonthData {
  settlements: SelfMonthlySettlement[];
}

export const EMPTY_SETTLEMENT_MONTH: SelfSettlementMonthData = { settlements: [] };

/** CTV có việc đã nghiệm thu, chưa lập ĐNTT trong tháng (kèm lý do chưa lập được). */
export interface SelfSettlementCandidate {
  contributorId: string;
  contributorName: string;
  contributorCode: string;
  jobs: SelfSettlementJobRef[];
  grossTotal: number;
  pitTax: number;
  netTotal: number;
  blockers: string[];
}

/** Settlement còn hiệu lực (giữ việc, không cho lập phiếu trùng). */
export const isOpenSettlement = (s: SelfMonthlySettlement) => s.status !== 'CANCELLED' && s.status !== 'REJECTED';
