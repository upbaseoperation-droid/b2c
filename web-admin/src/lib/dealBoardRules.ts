import type { KocListingItem } from './types';
import { columnOf, itemFee, itemGrade, type QuotaLine } from './listingBoardRules';

/**
 * Mô hình Quản lý theo Deal → Job:
 * - 1 KOC có 1 Hợp đồng nguyên tắc (HĐNT - FrameworkContract).
 * - 1 Deal chứa nhiều Job (`jobs: DealJob[]`).
 * - 1 Job tương ứng 1 Video chính và các Dịch vụ gia tăng đi kèm (`addons: JobAddonItem[]`).
 * - Ký phụ lục SOW theo từng Job, vận hành & nghiệm thu theo từng Job, và đẩy về Lark theo từng Job để Kế toán thanh toán.
 */

export interface FrameworkContract {
  /** Mã kênh đã chuẩn hóa (không @, chữ thường), dùng làm id. */
  id: string;
  handle: string;
  contractNo: string;
  signedAt: string; // yyyy-mm-dd
  validTo: string; // yyyy-mm-dd, có thể trống
  fileUrl: string;
  note: string;
  updatedBy: string;
  updatedAt: string;
  /** Mở rộng theo `Quy trình Quản lý hợp đồng Booking.md`: loại pháp nhân, bản cứng nộp Kế toán trước ngày 15 tháng T+1 */
  entityType?: 'INDIVIDUAL' | 'HOUSEHOLD' | 'COMPANY';
  legalName?: string;
  taxOrCccd?: string;
  bankName?: string;
  bankAccount?: string;
  bankHolder?: string;
  authorizationUrl?: string;
  hardcopyStatus?: 'ESIGN_VERIFIED' | 'HARDCOPY_PENDING' | 'HARDCOPY_SENT_TO_KOC' | 'HARDCOPY_RETURNED_TO_ACCOUNTING';
  hardcopyDueAt?: string;
}

export const normHandle = (h: string) =>
  (h || '')
    .trim()
    .replace(/^https?:\/\/(www\.)?tiktok\.com\/@?/i, '')
    .replace(/[/?#].*$/, '')
    .replace(/^@/, '')
    .toLowerCase();

const today = () => new Date().toISOString().slice(0, 10);

export type FrameworkState = 'NONE' | 'INCOMPLETE' | 'EXPIRED' | 'VALID';

/** Hợp đồng nguyên tắc chỉ tính là có khi đã có số hợp đồng và ngày ký, và chưa quá hạn hiệu lực. */
export function frameworkState(c: FrameworkContract | undefined, now = today()): FrameworkState {
  if (!c) return 'NONE';
  if (!c.contractNo.trim() || !c.signedAt) return 'INCOMPLETE';
  if (c.validTo && c.validTo < now) return 'EXPIRED';
  return 'VALID';
}

export const FRAMEWORK_STATE_LABEL: Record<FrameworkState, string> = {
  NONE: 'Chưa có hợp đồng nguyên tắc',
  INCOMPLETE: 'Hợp đồng nguyên tắc thiếu số hoặc ngày ký',
  EXPIRED: 'Hợp đồng nguyên tắc đã hết hiệu lực',
  VALID: 'Đã có hợp đồng nguyên tắc',
};

export type SampleStatus = 'NONE' | 'NOT_NEEDED' | 'SENT' | 'RECEIVED';
export type ScriptStatus = 'NONE' | 'NOT_NEEDED' | 'SUBMITTED' | 'CHANGES' | 'APPROVED';
export type AcceptanceStatus = 'PENDING' | 'PASSED' | 'REVIEW' | 'FAILED';
export type PaymentStatus = 'NONE' | 'REQUESTED' | 'PAID';

/** Loại pháp nhân ký hợp đồng & hạch toán thuế theo `Booking đa sàn.md` */
export type LegalEntityType = 'INDIVIDUAL' | 'HOUSEHOLD' | 'COMPANY';

export const LEGAL_ENTITY_LABEL: Record<LegalEntityType, string> = {
  INDIVIDUAL: 'Cá nhân (HĐ ghi giá Net · Khấu trừ 10% TNCN)',
  HOUSEHOLD: 'Hộ kinh doanh (HĐ ghi tổng giá trị)',
  COMPANY: 'Công ty / Agency (HĐ ghi tổng gồm VAT)',
};

/** Trạng thái thu hồi bản cứng Hợp đồng nguyên tắc về Kế toán trước ngày 15 tháng T+1 */
export type HardcopyStatus = 'ESIGN_VERIFIED' | 'HARDCOPY_PENDING' | 'HARDCOPY_SENT_TO_KOC' | 'HARDCOPY_RETURNED_TO_ACCOUNTING';

export const HARDCOPY_STATUS_LABEL: Record<HardcopyStatus, string> = {
  ESIGN_VERIFIED: 'Đã ký điện tử (E-sign hợp lệ)',
  HARDCOPY_PENDING: 'Chờ in / trình ký bản cứng',
  HARDCOPY_SENT_TO_KOC: 'Đã gửi CPN cho KOC ký',
  HARDCOPY_RETURNED_TO_ACCOUNTING: 'Đã nộp bản gốc cho Kế toán',
};

/** Kênh truyền thông đăng tải nội dung (Publish Platform) */
export type PublishPlatform = 'TIKTOK' | 'FACEBOOK' | 'INSTAGRAM' | 'SHOPEE_VIDEO' | 'YOUTUBE' | 'THREADS';

export const PUBLISH_PLATFORM_LABEL: Record<PublishPlatform, string> = {
  TIKTOK: 'TikTok',
  FACEBOOK: 'Facebook (Reels / Page)',
  INSTAGRAM: 'Instagram (Reels)',
  SHOPEE_VIDEO: 'Shopee Video',
  YOUTUBE: 'YouTube Shorts',
  THREADS: 'Threads',
};

/** Kênh gắn giỏ hàng / link Affiliate (Commerce Platform) */
export type CommercePlatform = 'TIKTOK_SHOP' | 'SHOPEE' | 'LAZADA' | 'NONE';

export const COMMERCE_PLATFORM_LABEL: Record<CommercePlatform, string> = {
  TIKTOK_SHOP: 'TikTok Shop',
  SHOPEE: 'Shopee Affiliate',
  LAZADA: 'Lazada Affiliate',
  NONE: 'Không gắn giỏ hàng (Branding)',
};

/** 6 hình thức sản xuất nội dung theo `Luồng quản lý job có cast` */
export type ContentProductionMode = 'ORIGINAL' | 'ADAPT' | 'CROSS_POST' | 'POST_ONLY' | 'PRODUCTION_ONLY' | 'CUT_DOWN';

export const PRODUCTION_MODE_LABEL: Record<ContentProductionMode, string> = {
  ORIGINAL: '1. Làm mới (Original)',
  ADAPT: '2. Adapt đa nền tảng',
  CROSS_POST: '3. Cross-post / Đăng chéo',
  POST_ONLY: '4. Post-only (Nhận video có sẵn đăng kênh)',
  PRODUCTION_ONLY: '5. Production-only (Chỉ quay dựng trả source)',
  CUT_DOWN: '6. Cut-down / Re-edit',
};

/** Chế độ hiển thị đơn giá trên Phụ lục SOW: KOC nhỏ (gộp trọn gói tránh đòi thêm phí) vs KOL lớn (bóc tách từng hạng mục) */
export type PricingDisplayMode = 'PACKAGE_ALL_IN' | 'ITEMIZED_SOW';

export const PRICING_DISPLAY_MODE_LABEL: Record<PricingDisplayMode, string> = {
  PACKAGE_ALL_IN: 'Trọn gói 1 cục (KOC nhỏ KL1–KL4: ẩn giá lẻ SOW)',
  ITEMIZED_SOW: 'Bóc tách từng SOW (KOL lớn KL5–KL7: hiện giá lẻ)',
};

export type JobAddonType = 'ADS_CODE' | 'CROSS_POST' | 'IMAGE_USAGE' | 'EXCLUSIVITY' | 'LINK_BIO_CART' | 'OTHER';
export type JobAddonStatus = 'PENDING' | 'VERIFIED' | 'DROPPED';

export const ADDON_TYPE_LABEL: Record<JobAddonType, string> = {
  ADS_CODE: 'Mã quảng cáo Spark Ads (60 ngày)',
  CROSS_POST: 'Đăng chéo / Reup đa kênh (FB, Shopee Video, IG)',
  IMAGE_USAGE: 'Bản quyền sử dụng hình ảnh / cắt ghép',
  EXCLUSIVITY: 'Độc quyền ngành hàng theo thời hạn',
  LINK_BIO_CART: 'Gắn giỏ hàng / Link Bio duy trì',
  OTHER: 'Dịch vụ gia tăng khác',
};

export const ADDON_STATUS_LABEL: Record<JobAddonStatus, string> = {
  PENDING: 'Chờ nghiệm thu',
  VERIFIED: 'Đã nghiệm thu',
  DROPPED: 'Hủy / Khấu trừ',
};

export interface JobAddonItem {
  id: string;
  type: JobAddonType;
  label: string;
  /** Phí Net của dịch vụ gia tăng (0đ nếu đi kèm gói, >0đ nếu tính phí riêng). */
  fee: number;
  status: JobAddonStatus;
  /** Mã Spark Ads, link bài reup hoặc link bàn giao chứng từ nghiệm thu. */
  evidence: string;
}

export interface AcceptanceCheck {
  key: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface DealPerformance {
  views: number | null;
  orders: number | null;
  gmv: number | null;
}

export interface DealEvent {
  at: string;
  actor: string;
  text: string;
}

export interface DealJobAcceptance {
  status: AcceptanceStatus;
  checks: AcceptanceCheck[];
  summary: string;
  views: number | null;
  isOnTime: boolean | null;
  daysDelayed: number | null;
  checkedAt: string;
  confirmedBy: string;
  confirmedAt: string;
  confirmNote: string;
}

export interface DealJobPayment {
  status: PaymentStatus;
  amount: number | null;
  requestedAt: string;
  paidAt: string;
  note: string;
  /** Thông tin phiếu thanh toán đã đẩy sang Lark cho Kế toán theo từng Job */
  larkSlipCode: string;
  larkApprovalCode: string;
  larkRecordId: string;
  larkSyncedAt: string;
  /** Ảnh chụp Bill chuyển khoản (UNC) gửi lại cho KOC trong 7 ngày sau khi thanh toán (`Các SLA B2C.md` dòng 86) */
  uncBillUrl?: string;
  uncSentToKocAt?: string;
}

/**
 * 1 Job trong Deal = 1 Video chính + các Dịch vụ gia tăng đi kèm.
 * Ký phụ lục theo từng Job, vận hành & nghiệm thu theo Job, và đẩy về Lark theo Job để kế toán thanh toán.
 */
export interface DealJob {
  id: string;
  code: string;
  title: string;
  listingItemId: string;
  /** Liên kết 1-1 tới ô Brief Content (`ContentSlot.id`) thuộc Kế hoạch (VD: 100 video Plan = 100 Brief Content). */
  slotId: string;
  briefCode: string;
  pillar: string;
  angle: string;
  hook: string;
  usp: string;
  cta: string;
  briefUrl: string;
  week: string;
  pic: string;
  /** Kênh truyền thông đăng tải (TikTok / Facebook / IG / Shopee Video / YouTube / Threads) */
  publishPlatform?: PublishPlatform;
  /** Kênh gắn link giỏ hàng Affiliate (TikTok Shop / Shopee / Lazada / Không gắn giỏ) */
  commercePlatform?: CommercePlatform;
  /** 6 hình thức sản xuất nội dung theo `Luồng quản lý job có cast` */
  productionMode?: ContentProductionMode;
  /** Chế độ hiển thị đơn giá trên Phụ lục SOW: KOC nhỏ (`PACKAGE_ALL_IN`) vs KOL lớn (`ITEMIZED_SOW`) */
  pricingDisplayMode?: PricingDisplayMode;
  /** Mã Job video gốc nếu Job này là Cross-post / Adapt / Cut-down hoặc Phụ lục SOW phát sinh sau Air */
  dependsOnJobCode?: string;
  /** Đánh dấu Phụ lục SOW phát sinh mua thêm sau khi video gốc đã lên sóng (Post-Air Upsell) */
  isPostAirUpsell?: boolean;
  /** Hồ sơ pháp lý (`KocLegalProfile.id`) của KOC được chọn cho Job này (hỗ trợ 1 KOC — N Hồ sơ pháp lý) */
  legalProfileId?: string;
  /** Loại pháp nhân áp dụng quy tắc ghi giá Hợp đồng & Thuế (`INDIVIDUAL` | `HOUSEHOLD` | `COMPANY`) */
  entityType?: LegalEntityType;
  /** Thuế suất VAT (%) áp dụng khi `entityType === 'COMPANY'` (mặc định 8% hoặc 10%) */
  vatPct?: number;
  /** Thông tin thụ hưởng & pháp nhân chụp trên Job để đối soát chính danh chủ TK */
  payeeLegalName?: string;
  payeeTaxOrCccd?: string;
  payeeBankName?: string;
  payeeBankAccount?: string;
  payeeBankHolder?: string;
  /** Link Giấy ủy quyền hợp lệ nếu Tên chủ TK ngân hàng khác Tên pháp nhân đứng tên trên Hợp đồng nguyên tắc */
  authorizationUrl?: string;
  /** Cờ xác nhận KOC đã cầm sẵn sản phẩm trên tay (cho phép nhận Job gấp dưới 5 ngày trước ngày Air theo `Các SLA B2C.md`) */
  hasSampleOnHand?: boolean;
  /** Đề xuất tự sản xuất / tự Air khi Brand quá hạn SLA 3 ngày chưa duyệt định hướng/kịch bản */
  selfAirProposed?: boolean;
  /** Thù lao Net của riêng 1 video chính trong Job. */
  videoFee: number;
  /** Các dịch vụ gia tăng đi kèm video trong Job này. */
  addons: JobAddonItem[];
  // Sản phẩm của Job (bản chụp tại thời điểm tạo/chốt Job)
  productGroupId: string;
  productGroupName: string;
  productName: string;
  cartUrl: string;
  affiliateUrl: string;
  commissionPct: number | null;
  // Phụ lục ký theo từng Job
  appendixNo: string;
  appendixDate: string;
  appendixUrl: string;
  // Vận hành theo Job
  sample: { status: SampleStatus; trackingNo: string; at: string };
  script: {
    status: ScriptStatus;
    note: string;
    at: string;
    scriptUrl?: string;
    demoStatus?: ScriptStatus;
    demoUrl?: string;
  };
  deadline: string;
  airLink: string;
  airedAt: string;
  sparkAdsCode: string;
  // Nghiệm thu & Thanh toán theo Job
  acceptance: DealJobAcceptance;
  payment: DealJobPayment;
  performance: { d14: DealPerformance; d30: DealPerformance; d60: DealPerformance };
}

export interface PlanDeal {
  id: string;
  code: string;
  listingItemId: string;
  slotId: string;
  kocHandle: string;
  kocName: string;
  grade: string;
  week: string;
  pic: string;
  /** Tổng thù lao Net của toàn bộ các Job trong Deal. */
  fee: number;
  /** Danh sách các Job thuộc Deal (1 Deal chứa nhiều Job; mỗi Job = 1 Video + Dịch vụ gia tăng). */
  jobs: DealJob[];
  // Các trường tóm tắt đồng bộ từ Job đầu tiên để tương thích ngược
  productGroupId: string;
  productGroupName: string;
  productName: string;
  cartUrl: string;
  affiliateUrl: string;
  commissionPct: number | null;
  appendixNo: string;
  appendixDate: string;
  appendixUrl: string;
  sample: { status: SampleStatus; trackingNo: string; at: string };
  script: { status: ScriptStatus; note: string; at: string };
  deadline: string;
  airLink: string;
  airedAt: string;
  acceptance: DealJobAcceptance;
  payment: DealJobPayment;
  performance: { d14: DealPerformance; d30: DealPerformance; d60: DealPerformance };
  createdAt: string;
  createdBy: string;
  history: DealEvent[];
}

/**
 * Trạng thái Khóa sổ & Mở cửa sổ chỉnh sửa nghiệm thu cuối tháng E2E (`Các SLA B2C.md` Mục V):
 * - Ngày mùng 2 hàng tháng: Khóa sổ nghiệm thu tháng trước.
 * - Ngày làm việc thứ 4: Gửi bảng tổng hợp lỗi Lần 1.
 * - Ngày làm việc thứ 5 (09:00 – 17:30): Kế toán mở cửa sổ chỉnh sửa thông tin Lần 1.
 * - Ngày làm việc thứ 10: Gửi bảng tổng hợp lỗi Lần 2 (kèm lỗi Brand phát hiện).
 * - Ngày làm việc thứ 11 (09:00 – 17:30): Kế toán mở cửa sổ chỉnh sửa thông tin Lần 2; sau 17:30 khóa sổ vĩnh viễn.
 */
export type ClosingWindowMode = 'AUTO' | 'OPEN_ROUND_1' | 'OPEN_ROUND_2' | 'LOCKED';

export interface MonthlyClosingState {
  mode: ClosingWindowMode;
  round1ErrorLog: string;
  round2ErrorLog: string;
  updatedBy: string;
  updatedAt: string;
}

export interface DealBoardData {
  deals: PlanDeal[];
  closingState?: MonthlyClosingState;
}

export const EMPTY_DEAL_BOARD: DealBoardData = { deals: [] };

const emptyPerf = (): DealPerformance => ({ views: null, orders: null, gmv: null });

export const newDealId = () => `DL-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
export const newJobId = () => `JB-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
export const newAddonId = () => `AD-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Tổng phí Net của các dịch vụ gia tăng đang hoạt động (không tính mục đã Hủy/Khấu trừ DROPPED) trong Job. */
export function jobAddonsFee(job: DealJob): number {
  return (job.addons || []).filter(a => a.status !== 'DROPPED').reduce((sum, a) => sum + Math.max(0, Math.round(a.fee || 0)), 0);
}

/** Tổng phí Net bị khấu trừ do hủy dịch vụ gia tăng trong Job. */
export function jobDroppedFee(job: DealJob): number {
  return (job.addons || []).filter(a => a.status === 'DROPPED').reduce((sum, a) => sum + Math.max(0, Math.round(a.fee || 0)), 0);
}

/** Tổng thù lao Net thực tế của 1 Job = Giá Video chính + Phí Dịch vụ gia tăng còn hiệu lực. */
export function jobTotalFee(job: DealJob): number {
  return Math.max(0, Math.round(job.videoFee || 0)) + jobAddonsFee(job);
}

/** Tổng thù lao Net của cả Deal = Tổng `jobTotalFee` của tất cả các Job trong Deal. */
export function dealTotalFee(deal: PlanDeal): number {
  if (!deal.jobs || deal.jobs.length === 0) return Math.max(0, Math.round(deal.fee || 0));
  return deal.jobs.reduce((sum, j) => sum + jobTotalFee(j), 0);
}

/**
 * Tính giá trị hợp đồng & thuế theo loại pháp nhân (`Booking đa sàn.md` dòng 24–29):
 * - Cá nhân (`INDIVIDUAL`): Hợp đồng/Lark ghi giá trị Net (chưa gồm 10% TNCN); Gross = Net / 0.9; Thuế TNCN = Gross - Net.
 * - Hộ kinh doanh (`HOUSEHOLD`): Hợp đồng/Lark ghi tổng giá trị hợp đồng.
 * - Công ty (`COMPANY`): Hợp đồng/Lark ghi tổng giá trị đã bao gồm thuế VAT (mặc định 8% hoặc 10%).
 */
export interface JobContractAmountBreakdown {
  entityType: LegalEntityType;
  netAmount: number;
  pitTaxAmount: number;
  vatPct: number;
  vatAmount: number;
  grossPayoutOrInvoice: number;
  /** Giá trị bắt buộc điền trên Hợp đồng / Phụ lục / Lark theo quy ước `Booking đa sàn.md` */
  contractDisplayValue: number;
  ruleSummary: string;
}

export function computeJobContractAmounts(job: DealJob): JobContractAmountBreakdown {
  const netAmount = jobTotalFee(job);
  const entityType: LegalEntityType = job.entityType || 'INDIVIDUAL';
  if (entityType === 'COMPANY') {
    const vatPct = typeof job.vatPct === 'number' && job.vatPct >= 0 ? job.vatPct : 8;
    const vatAmount = Math.round((netAmount * vatPct) / 100);
    const totalWithVat = netAmount + vatAmount;
    return {
      entityType,
      netAmount,
      pitTaxAmount: 0,
      vatPct,
      vatAmount,
      grossPayoutOrInvoice: totalWithVat,
      contractDisplayValue: totalWithVat,
      ruleSummary: `Công ty: Điền tổng giá trị đã gồm VAT ${vatPct}% (${totalWithVat.toLocaleString('vi-VN')}đ = Net ${netAmount.toLocaleString('vi-VN')}đ + VAT ${vatAmount.toLocaleString('vi-VN')}đ)`,
    };
  }
  if (entityType === 'HOUSEHOLD') {
    return {
      entityType,
      netAmount,
      pitTaxAmount: 0,
      vatPct: 0,
      vatAmount: 0,
      grossPayoutOrInvoice: netAmount,
      contractDisplayValue: netAmount,
      ruleSummary: `Hộ kinh doanh: Điền tổng giá trị hợp đồng (${netAmount.toLocaleString('vi-VN')}đ)`,
    };
  }
  // INDIVIDUAL (Mặc định)
  const grossFromNet = netAmount > 0 ? Math.round(netAmount / 0.9) : 0;
  const pitTaxAmount = Math.max(0, grossFromNet - netAmount);
  return {
    entityType: 'INDIVIDUAL',
    netAmount,
    pitTaxAmount,
    vatPct: 0,
    vatAmount: 0,
    grossPayoutOrInvoice: grossFromNet,
    contractDisplayValue: netAmount,
    ruleSummary: `Cá nhân: Điền giá trị Net (${netAmount.toLocaleString('vi-VN')}đ · Chưa gồm 10% TNCN ${pitTaxAmount.toLocaleString('vi-VN')}đ · Tổng chi Gross ${grossFromNet.toLocaleString('vi-VN')}đ)`,
  };
}

const normalizePersonName = (v: string) =>
  (v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();

/** Kiểm tra Chủ tài khoản ngân hàng có trùng khớp với Tên pháp nhân đứng tên trên Hợp đồng nguyên tắc hay không (`Quy trình Quản lý hợp đồng Booking.md`). */
export function isAccountHolderMatched(job: DealJob): boolean {
  const holder = normalizePersonName(job.payeeBankHolder || '');
  const legal = normalizePersonName(job.payeeLegalName || '');
  if (!holder || !legal) return true;
  return holder === legal || holder.includes(legal) || legal.includes(holder);
}

/** Đếm số ngày làm việc (không tính Thứ 7, Chủ nhật) giữa 2 mốc ngày `yyyy-mm-dd`. */
export function workingDaysBetween(startIso: string, endIso: string): number {
  if (!/^\d{4}-\d{2}-\d{2}/.test(startIso) || !/^\d{4}-\d{2}-\d{2}/.test(endIso)) return 0;
  const start = new Date(`${startIso.slice(0, 10)}T00:00:00Z`);
  const end = new Date(`${endIso.slice(0, 10)}T00:00:00Z`);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return 0;
  let count = 0;
  const cur = new Date(start);
  while (cur < end) {
    cur.setUTCDate(cur.getUTCDate() + 1);
    const dow = cur.getUTCDay();
    if (dow !== 0 && dow !== 6) count += 1;
  }
  return count;
}

/** Kiểm tra Link Air đã quá 7 ngày làm việc và bị khóa chỉnh sửa theo `Các SLA B2C.md` dòng 63 hay chưa. */
export function isAirLinkLocked(job: DealJob, closingState?: MonthlyClosingState, now = today()): boolean {
  if (closingState?.mode === 'OPEN_ROUND_1' || closingState?.mode === 'OPEN_ROUND_2') return false;
  if (!job.airLink.trim() || !job.airedAt) return false;
  return workingDaysBetween(job.airedAt, now) > 7;
}

/** Tính trạng thái Khóa sổ nghiệm thu cuối tháng E2E (Mùng 2 — Ngày 4 — Ngày 5 — Ngày 10 — Ngày 11). */
export function getMonthlyClosingStatus(
  planMonth: string,
  closingState?: MonthlyClosingState,
  nowDate = new Date()
): {
  locked: boolean;
  phaseLabel: string;
  canAccountingEdit: boolean;
} {
  const mode = closingState?.mode || 'AUTO';
  if (mode === 'OPEN_ROUND_1') {
    return {
      locked: false,
      phaseLabel: 'Kế toán đang mở cửa sổ chỉnh sửa Lần 1 (Ngày làm việc thứ 5 · 09:00–17:30)',
      canAccountingEdit: true,
    };
  }
  if (mode === 'OPEN_ROUND_2') {
    return {
      locked: false,
      phaseLabel: 'Kế toán đang mở cửa sổ chỉnh sửa Lần 2 (Ngày làm việc thứ 11 · 09:00–17:30)',
      canAccountingEdit: true,
    };
  }
  if (mode === 'LOCKED') {
    return {
      locked: true,
      phaseLabel: 'Đã khóa sổ nghiệm thu tháng (Chỉ mở vào Ngày làm việc thứ 5 & 11 từ 09:00–17:30)',
      canAccountingEdit: false,
    };
  }
  // AUTO: Kiểm tra nếu đã sang ngày mùng 2 của tháng kế tiếp
  const m = planMonth.match(/^(\d{1,2})\/(\d{4})$/) || planMonth.match(/^(\d{4})-(\d{1,2})$/);
  if (!m) return { locked: false, phaseLabel: 'Đang trong kỳ vận hành tháng', canAccountingEdit: true };
  const monthNum = planMonth.includes('/') ? Number(m[1]) : Number(m[2]);
  const yearNum = planMonth.includes('/') ? Number(m[2]) : Number(m[1]);
  const nextMonthYear = monthNum === 12 ? yearNum + 1 : yearNum;
  const nextMonth = monthNum === 12 ? 1 : monthNum + 1;
  const lockDate = new Date(Date.UTC(nextMonthYear, nextMonth - 1, 2, 0, 0, 0));
  if (nowDate.getTime() < lockDate.getTime()) {
    return { locked: false, phaseLabel: `Đang mở (Tự động khóa sổ vào 02/${String(nextMonth).padStart(2, '0')}/${nextMonthYear})`, canAccountingEdit: true };
  }
  return {
    locked: true,
    phaseLabel: `Đã qua mùng 02/${String(nextMonth).padStart(2, '0')} — Khóa sổ tự động (Kế toán mở cửa sổ sửa Ngày LV thứ 5 & 11)`,
    canAccountingEdit: false,
  };
}

/** Sinh mã Job không trùng trong Deal (VD: DL2610-001-J01, DL2610-001-J02). */
export function nextJobCode(dealCode: string, existingJobs: DealJob[]): string {
  const existingCodes = new Set(existingJobs.map(j => j.code));
  let n = existingJobs.length + 1;
  let code = `${dealCode}-J${String(n).padStart(2, '0')}`;
  while (existingCodes.has(code)) {
    n += 1;
    code = `${dealCode}-J${String(n).padStart(2, '0')}`;
  }
  return code;
}

export interface NewJobInput {
  dealCode: string;
  existingJobs: DealJob[];
  title?: string;
  listingItemId?: string;
  slotId?: string;
  briefCode?: string;
  pillar?: string;
  angle?: string;
  hook?: string;
  usp?: string;
  cta?: string;
  briefUrl?: string;
  week?: string;
  pic?: string;
  publishPlatform?: PublishPlatform;
  commercePlatform?: CommercePlatform;
  productionMode?: ContentProductionMode;
  pricingDisplayMode?: PricingDisplayMode;
  dependsOnJobCode?: string;
  isPostAirUpsell?: boolean;
  legalProfileId?: string;
  entityType?: LegalEntityType;
  vatPct?: number;
  payeeLegalName?: string;
  payeeTaxOrCccd?: string;
  payeeBankName?: string;
  payeeBankAccount?: string;
  payeeBankHolder?: string;
  authorizationUrl?: string;
  hasSampleOnHand?: boolean;
  videoFee: number;
  addons?: JobAddonItem[];
  productGroupId?: string;
  productGroupName?: string;
  productName?: string;
}

export function createDealJob(input: NewJobInput): DealJob {
  const code = nextJobCode(input.dealCode, input.existingJobs);
  const idx = input.existingJobs.length + 1;
  return {
    id: newJobId(),
    code,
    title: input.title || `Job ${idx} · Video ${idx}`,
    listingItemId: input.listingItemId || '',
    slotId: input.slotId || '',
    briefCode: input.briefCode || '',
    pillar: input.pillar || '',
    angle: input.angle || '',
    hook: input.hook || '',
    usp: input.usp || '',
    cta: input.cta || '',
    briefUrl: input.briefUrl || '',
    week: input.week || '',
    pic: input.pic || '',
    publishPlatform: input.publishPlatform || 'TIKTOK',
    commercePlatform: input.commercePlatform || 'TIKTOK_SHOP',
    productionMode: input.productionMode || 'ORIGINAL',
    pricingDisplayMode: input.pricingDisplayMode || 'PACKAGE_ALL_IN',
    dependsOnJobCode: input.dependsOnJobCode || '',
    isPostAirUpsell: Boolean(input.isPostAirUpsell),
    legalProfileId: input.legalProfileId || '',
    entityType: input.entityType || 'INDIVIDUAL',
    vatPct: typeof input.vatPct === 'number' ? input.vatPct : 8,
    payeeLegalName: input.payeeLegalName || '',
    payeeTaxOrCccd: input.payeeTaxOrCccd || '',
    payeeBankName: input.payeeBankName || '',
    payeeBankAccount: input.payeeBankAccount || '',
    payeeBankHolder: input.payeeBankHolder || '',
    authorizationUrl: input.authorizationUrl || '',
    hasSampleOnHand: Boolean(input.hasSampleOnHand),
    selfAirProposed: false,
    videoFee: Math.max(0, Math.round(input.videoFee || 0)),
    addons: input.addons ? [...input.addons] : [],
    productGroupId: input.productGroupId || '',
    productGroupName: input.productGroupName || '',
    productName: input.productName || '',
    cartUrl: '',
    affiliateUrl: '',
    commissionPct: null,
    appendixNo: '',
    appendixDate: '',
    appendixUrl: '',
    sample: { status: 'NONE', trackingNo: '', at: '' },
    script: { status: 'NONE', note: '', at: '', scriptUrl: '', demoStatus: 'NONE', demoUrl: '' },
    deadline: '',
    airLink: '',
    airedAt: '',
    sparkAdsCode: '',
    acceptance: {
      status: 'PENDING',
      checks: [],
      summary: '',
      views: null,
      isOnTime: null,
      daysDelayed: null,
      checkedAt: '',
      confirmedBy: '',
      confirmedAt: '',
      confirmNote: '',
    },
    payment: {
      status: 'NONE',
      amount: null,
      requestedAt: '',
      paidAt: '',
      note: '',
      larkSlipCode: '',
      larkApprovalCode: '',
      larkRecordId: '',
      larkSyncedAt: '',
      uncBillUrl: '',
      uncSentToKocAt: '',
    },
    performance: { d14: emptyPerf(), d30: emptyPerf(), d60: emptyPerf() },
  };
}

/**
 * Tạo Phụ lục SOW phát sinh sau khi Video đã lên sóng (Post-Air Upsell — VD: mua thêm mã Spark Ads lần 2,
 * mua thêm quyền Reup / Cross-post sau khi thấy video gốc hiệu quả).
 * Kế thừa toàn bộ Link Air, Sản phẩm, Pháp nhân nhận tiền từ Job gốc, chỉ tính phí dịch vụ gia tăng mới.
 */
export function createPostAirUpsellJob(deal: PlanDeal, sourceJob: DealJob, actor: string): DealJob {
  const base = createDealJob({
    dealCode: deal.code,
    existingJobs: deal.jobs || [],
    title: `SOW phát sinh sau Air (từ ${sourceJob.code})`,
    listingItemId: sourceJob.listingItemId,
    slotId: sourceJob.slotId,
    briefCode: sourceJob.briefCode,
    pillar: sourceJob.pillar,
    angle: sourceJob.angle,
    hook: sourceJob.hook,
    usp: sourceJob.usp,
    cta: sourceJob.cta,
    briefUrl: sourceJob.briefUrl,
    week: sourceJob.week,
    pic: sourceJob.pic || actor,
    publishPlatform: sourceJob.publishPlatform || 'TIKTOK',
    commercePlatform: sourceJob.commercePlatform || 'TIKTOK_SHOP',
    productionMode: sourceJob.productionMode || 'ORIGINAL',
    pricingDisplayMode: 'ITEMIZED_SOW',
    dependsOnJobCode: sourceJob.code,
    isPostAirUpsell: true,
    legalProfileId: sourceJob.legalProfileId,
    entityType: sourceJob.entityType,
    vatPct: sourceJob.vatPct,
    payeeLegalName: sourceJob.payeeLegalName,
    payeeTaxOrCccd: sourceJob.payeeTaxOrCccd,
    payeeBankName: sourceJob.payeeBankName,
    payeeBankAccount: sourceJob.payeeBankAccount,
    payeeBankHolder: sourceJob.payeeBankHolder,
    authorizationUrl: sourceJob.authorizationUrl,
    hasSampleOnHand: true,
    videoFee: 0,
    addons: [
      {
        id: newAddonId(),
        type: 'ADS_CODE',
        label: 'Mua thêm Mã quảng cáo Spark Ads phát sinh sau Air',
        fee: 300000,
        status: 'PENDING',
        evidence: '',
      },
    ],
    productGroupId: sourceJob.productGroupId,
    productGroupName: sourceJob.productGroupName,
    productName: sourceJob.productName,
  });
  return {
    ...base,
    cartUrl: sourceJob.cartUrl,
    affiliateUrl: sourceJob.affiliateUrl,
    commissionPct: sourceJob.commissionPct,
    sample: { status: 'NOT_NEEDED', trackingNo: sourceJob.sample.trackingNo, at: sourceJob.sample.at },
    script: { status: 'NOT_NEEDED', note: `Phát sinh trên video đã air của ${sourceJob.code}`, at: today(), demoStatus: 'NOT_NEEDED' },
    deadline: sourceJob.airedAt || sourceJob.deadline,
    airLink: sourceJob.airLink,
    airedAt: sourceJob.airedAt,
    acceptance: {
      ...base.acceptance,
      status: 'PASSED',
      summary: `Kế thừa video đã nghiệm thu từ ${sourceJob.code}. Chỉ cần nghiệm thu dịch vụ gia tăng phát sinh.`,
      views: sourceJob.acceptance.views,
      isOnTime: true,
      daysDelayed: 0,
      checkedAt: new Date().toISOString(),
    },
  };
}

/** Đồng bộ các trường tóm tắt cấp Deal từ danh sách `jobs` để tương thích với các màn hình/API dùng chung. */
export function syncDealSummaryFields(deal: PlanDeal): PlanDeal {
  const jobs = deal.jobs || [];
  if (jobs.length === 0) return deal;
  const first = jobs[0];
  const totalFee = jobs.reduce((sum, j) => sum + jobTotalFee(j), 0);
  const sumPerf = (key: 'd14' | 'd30' | 'd60'): DealPerformance => {
    const views = jobs.some(j => j.performance[key].views !== null) ? jobs.reduce((s, j) => s + (j.performance[key].views || 0), 0) : null;
    const orders = jobs.some(j => j.performance[key].orders !== null) ? jobs.reduce((s, j) => s + (j.performance[key].orders || 0), 0) : null;
    const gmv = jobs.some(j => j.performance[key].gmv !== null) ? jobs.reduce((s, j) => s + (j.performance[key].gmv || 0), 0) : null;
    return { views, orders, gmv };
  };
  const allPaid = jobs.every(j => j.payment.status === 'PAID');
  const anyRequestedOrPaid = jobs.some(j => j.payment.status === 'REQUESTED' || j.payment.status === 'PAID');
  const paidSum = jobs.reduce((s, j) => s + (j.payment.status !== 'NONE' ? (j.payment.amount ?? jobTotalFee(j)) : 0), 0);

  return {
    ...deal,
    fee: totalFee,
    week: first.week || deal.week,
    pic: first.pic || deal.pic,
    productGroupId: first.productGroupId,
    productGroupName: first.productGroupName,
    productName: first.productName,
    cartUrl: first.cartUrl,
    affiliateUrl: first.affiliateUrl,
    commissionPct: first.commissionPct,
    appendixNo: first.appendixNo,
    appendixDate: first.appendixDate,
    appendixUrl: first.appendixUrl,
    sample: first.sample,
    script: first.script,
    deadline: first.deadline,
    airLink: first.airLink,
    airedAt: first.airedAt,
    acceptance: first.acceptance,
    payment: {
      ...first.payment,
      status: allPaid ? 'PAID' : anyRequestedOrPaid ? 'REQUESTED' : 'NONE',
      amount: paidSum > 0 ? paidSum : first.payment.amount,
    },
    performance: { d14: sumPerf('d14'), d30: sumPerf('d30'), d60: sumPerf('d60') },
  };
}

export interface NewDealInput {
  item: KocListingItem;
  planId: string;
  month: string;
  actor: string;
  existingCodes: string[];
  week?: string;
  pic?: string;
  slotId?: string;
  briefCode?: string;
  pillar?: string;
  angle?: string;
  hook?: string;
  usp?: string;
  cta?: string;
  briefUrl?: string;
  productGroupId?: string;
  productGroupName?: string;
  productName?: string;
  legalProfileId?: string;
  entityType?: LegalEntityType;
  payeeLegalName?: string;
  payeeTaxOrCccd?: string;
  payeeBankName?: string;
  payeeBankAccount?: string;
  payeeBankHolder?: string;
}

/** Mã deal dạng DL<tháng>-<số thứ tự>, không trùng mã đã có. */
export function nextDealCode(month: string, existing: string[]): string {
  const m = month.replace(/[^0-9]/g, '').slice(2, 6) || 'XXXX';
  let n = existing.length + 1;
  let code = `DL${m}-${String(n).padStart(3, '0')}`;
  while (existing.includes(code)) {
    n += 1;
    code = `DL${m}-${String(n).padStart(3, '0')}`;
  }
  return code;
}

export function createDeal(input: NewDealInput): PlanDeal {
  const { item, actor } = input;
  const now = new Date().toISOString();
  const dealCode = nextDealCode(input.month, input.existingCodes);
  const gradeStr = String(itemGrade(item));
  const isHighKl = ['KL5', 'KL6', 'KL7'].includes(gradeStr);
  const initialJob = createDealJob({
    dealCode,
    existingJobs: [],
    title: input.briefCode ? `Job 1 · ${input.briefCode}` : 'Job 1 · Video 1',
    listingItemId: item.id,
    slotId: input.slotId || item.planSlotId || '',
    briefCode: input.briefCode || '',
    pillar: input.pillar || '',
    angle: input.angle || '',
    hook: input.hook || '',
    usp: input.usp || '',
    cta: input.cta || '',
    briefUrl: input.briefUrl || '',
    week: input.week || '',
    pic: input.pic || item.assignedStaffName || actor,
    pricingDisplayMode: isHighKl ? 'ITEMIZED_SOW' : 'PACKAGE_ALL_IN',
    legalProfileId: input.legalProfileId || '',
    entityType: input.entityType || 'INDIVIDUAL',
    payeeLegalName: input.payeeLegalName || '',
    payeeTaxOrCccd: input.payeeTaxOrCccd || '',
    payeeBankName: input.payeeBankName || '',
    payeeBankAccount: input.payeeBankAccount || '',
    payeeBankHolder: input.payeeBankHolder || '',
    videoFee: itemFee(item),
    productGroupId: input.productGroupId || '',
    productGroupName: input.productGroupName || '',
    productName: input.productName || '',
  });
  return syncDealSummaryFields({
    id: newDealId(),
    code: dealCode,
    listingItemId: item.id,
    slotId: initialJob.slotId,
    kocHandle: item.kocHandle.replace(/^@/, ''),
    kocName: item.kocName,
    grade: gradeStr,
    week: initialJob.week,
    pic: initialJob.pic,
    fee: jobTotalFee(initialJob),
    jobs: [initialJob],
    productGroupId: initialJob.productGroupId,
    productGroupName: initialJob.productGroupName,
    productName: initialJob.productName,
    cartUrl: '',
    affiliateUrl: '',
    commissionPct: null,
    appendixNo: '',
    appendixDate: '',
    appendixUrl: '',
    sample: initialJob.sample,
    script: initialJob.script,
    deadline: '',
    airLink: '',
    airedAt: '',
    acceptance: initialJob.acceptance,
    payment: initialJob.payment,
    performance: initialJob.performance,
    createdAt: now,
    createdBy: actor,
    history: [{ at: now, actor, text: `Tạo deal ${dealCode} kèm Job ${initialJob.code}${initialJob.briefCode ? ` (${initialJob.briefCode})` : ''} (${input.month})` }],
  });
}

export type DealStage = 'APPENDIX' | 'SAMPLE' | 'SCRIPT' | 'AIR' | 'ACCEPTANCE' | 'PAYMENT' | 'TRACKING';

export const STAGES: { key: DealStage; label: string }[] = [
  { key: 'APPENDIX', label: 'Phụ lục' },
  { key: 'SAMPLE', label: 'Hàng mẫu' },
  { key: 'SCRIPT', label: 'Kịch bản' },
  { key: 'AIR', label: 'Air' },
  { key: 'ACCEPTANCE', label: 'Nghiệm thu' },
  { key: 'PAYMENT', label: 'Thanh toán' },
  { key: 'TRACKING', label: 'Hiệu suất' },
];

/** Kiểm tra 1 Job đã hoàn tất nghiệm thu cả Video chính VÀ các Dịch vụ gia tăng đi kèm hay chưa. */
export const isJobAcceptanceCleared = (job: DealJob): boolean => {
  const videoCleared = job.acceptance.status === 'PASSED' || Boolean(job.acceptance.confirmedBy);
  if (!videoCleared) return false;
  const hasPendingAddons = (job.addons || []).some(a => a.status === 'PENDING');
  return !hasPendingAddons;
};

export const isAcceptanceCleared = (d: PlanDeal): boolean =>
  d.jobs && d.jobs.length > 0 ? d.jobs.every(isJobAcceptanceCleared) : d.acceptance.status === 'PASSED' || Boolean(d.acceptance.confirmedBy);

/** Bước hiện tại của 1 Job: bước đầu tiên chưa xong. */
export function jobStageOf(job: DealJob): DealStage {
  if (!job.appendixNo.trim() || !job.appendixDate) return 'APPENDIX';
  if (job.sample.status !== 'RECEIVED' && job.sample.status !== 'NOT_NEEDED') return 'SAMPLE';
  if (job.script.status !== 'APPROVED' && job.script.status !== 'NOT_NEEDED') return 'SCRIPT';
  if (!job.airLink.trim()) return 'AIR';
  if (!isJobAcceptanceCleared(job)) return 'ACCEPTANCE';
  if (job.payment.status !== 'PAID') return 'PAYMENT';
  return 'TRACKING';
}

/** Bước hiện tại của Deal: bước sớm nhất trong các Job thuộc Deal. */
export function stageOf(d: PlanDeal): DealStage {
  if (d.jobs && d.jobs.length > 0) {
    const order: DealStage[] = ['APPENDIX', 'SAMPLE', 'SCRIPT', 'AIR', 'ACCEPTANCE', 'PAYMENT', 'TRACKING'];
    let minIdx = order.length - 1;
    for (const j of d.jobs) {
      const idx = order.indexOf(jobStageOf(j));
      if (idx >= 0 && idx < minIdx) minIdx = idx;
    }
    return order[minIdx];
  }
  if (!d.appendixNo.trim() || !d.appendixDate) return 'APPENDIX';
  if (d.sample.status !== 'RECEIVED' && d.sample.status !== 'NOT_NEEDED') return 'SAMPLE';
  if (d.script.status !== 'APPROVED' && d.script.status !== 'NOT_NEEDED') return 'SCRIPT';
  if (!d.airLink.trim()) return 'AIR';
  if (!isAcceptanceCleared(d)) return 'ACCEPTANCE';
  if (d.payment.status !== 'PAID') return 'PAYMENT';
  return 'TRACKING';
}

/**
 * Lý do không cho tạo deal/job từ thẻ KOC; chuỗi rỗng nghĩa là được tạo.
 * Hỗ trợ cả 2 nguồn: Hợp đồng nguyên tắc theo `@handle` HOẶC Hồ sơ pháp lý 1–N (`hasValidLegalProfile`) trong Dữ liệu KOC.
 */
export function createDealBlocker(
  item: KocListingItem,
  framework: FrameworkContract | undefined,
  deals: PlanDeal[],
  hasValidLegalProfile = false
): string {
  if (columnOf(item) !== 'CONFIRMED') return 'KOC chưa ở cột Đã chốt.';
  if (deals.some(d => d.listingItemId === item.id || (d.jobs || []).some(j => j.listingItemId === item.id))) return 'KOC này đã được tạo Deal/Job.';
  const g = itemGrade(item);
  if (g !== 'TAP UpAffiliate' && !(itemFee(item) > 0)) return 'Chưa có giá chốt.';
  if (hasValidLegalProfile) return '';
  const st = frameworkState(framework);
  if (st !== 'VALID') return FRAMEWORK_STATE_LABEL[st];
  return '';
}

/** Lý do không cho đề nghị thanh toán / đẩy Lark của 1 Job; chuỗi rỗng nghĩa là đủ điều kiện. */
export function jobPaymentBlocker(job: DealJob): string {
  if (!job.appendixNo.trim() || !job.appendixDate) return 'Job chưa ký phụ lục hợp đồng.';
  if (!job.airLink.trim() && job.productionMode !== 'PRODUCTION_ONLY') return 'Job chưa có link video lên sóng (link air).';
  const videoCleared = job.acceptance.status === 'PASSED' || Boolean(job.acceptance.confirmedBy);
  if (!videoCleared) return job.acceptance.status === 'PENDING' ? 'Chưa nghiệm thu video của Job.' : 'Video chưa đạt, cần người có quyền xác nhận nghiệm thu.';
  const pendingAddons = (job.addons || []).filter(a => a.status === 'PENDING');
  if (pendingAddons.length > 0) return `Còn ${pendingAddons.length} dịch vụ gia tăng chưa nghiệm thu (${pendingAddons.map(a => a.label).join(', ')}).`;
  if (!isAccountHolderMatched(job) && !(job.authorizationUrl || '').trim()) {
    return 'Tên chủ TK ngân hàng khác tên pháp nhân trên HĐNT — bắt buộc đính kèm link Giấy ủy quyền hợp lệ.';
  }
  const effectiveAmount = job.payment.amount ?? jobTotalFee(job);
  if (!(effectiveAmount >= 0)) return 'Chưa có số tiền thanh toán hợp lệ.';
  return '';
}

/** Lý do không cho đề nghị thanh toán ở cấp Deal (kiểm tra các Job có thay đổi thanh toán). */
export function paymentBlocker(d: PlanDeal): string {
  if (d.jobs && d.jobs.length > 0) {
    for (const j of d.jobs) {
      if (j.payment.status !== 'NONE') {
        const b = jobPaymentBlocker(j);
        if (b) return `${j.code}: ${b}`;
      }
    }
    return jobPaymentBlocker(d.jobs[0]);
  }
  if (!d.appendixNo.trim() || !d.appendixDate) return 'Deal chưa có phụ lục.';
  if (!d.airLink.trim()) return 'Chưa có link air.';
  if (!isAcceptanceCleared(d)) return d.acceptance.status === 'PENDING' ? 'Chưa nghiệm thu video.' : 'Video chưa đạt, cần người có quyền xác nhận nghiệm thu.';
  if (!(d.payment.amount !== null && d.payment.amount >= 0)) return 'Chưa nhập số tiền thanh toán.';
  return '';
}

export interface DealIssue {
  level: 'error' | 'warning';
  dealCode: string;
  text: string;
}

const dayDiff = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);

export function dealIssues(deals: PlanDeal[], now = today()): DealIssue[] {
  const out: DealIssue[] = [];
  for (const d of deals) {
    const dealCreatedDay = (d.createdAt || '').slice(0, 10);
    const jobs = d.jobs && d.jobs.length > 0 ? d.jobs : [];
    for (const j of jobs) {
      const total = jobTotalFee(j);
      if (!j.slotId && !j.briefCode && !j.angle?.trim()) {
        out.push({ level: 'warning', dealCode: j.code, text: 'Job chưa chọn dòng Định hướng / Brief từ Plan.' });
      }
      // SLA Nhận việc gấp dưới 5 ngày (`Các SLA B2C.md` dòng 120)
      if (
        j.productionMode === 'ORIGINAL' &&
        j.deadline &&
        dealCreatedDay &&
        dayDiff(dealCreatedDay, j.deadline) < 5 &&
        !j.hasSampleOnHand &&
        j.sample.status !== 'RECEIVED' &&
        j.sample.status !== 'NOT_NEEDED'
      ) {
        out.push({
          level: 'error',
          dealCode: j.code,
          text: `Vi phạm SLA 5 ngày: Video làm mới có hạn Air cách ngày tạo dưới 5 ngày (${dayDiff(dealCreatedDay, j.deadline)} ngày) nhưng KOC chưa cầm sẵn sản phẩm.`,
        });
      }
      // SLA Hàng mẫu 2 - 3 - 5 ngày (`Các SLA B2C.md` dòng 33–39)
      if (j.sample.status === 'NONE' && dealCreatedDay && dayDiff(dealCreatedDay, now) >= 2) {
        const elapsed = dayDiff(dealCreatedDay, now);
        if (elapsed >= 3) {
          out.push({
            level: 'error',
            dealCode: j.code,
            text: `SLA Hàng mẫu > 3 ngày (${elapsed} ngày chưa có mã vận đơn): Cần Raise ngay lên Leader B2C & Growth.`,
          });
        } else {
          out.push({
            level: 'warning',
            dealCode: j.code,
            text: `SLA Hàng mẫu > 2 ngày (${elapsed} ngày chưa gửi hàng): Cần nhắc Growth / Account kiểm tra đơn mẫu.`,
          });
        }
      }
      if (j.sample.status === 'SENT' && j.sample.at) {
        const sentDays = dayDiff(j.sample.at, now);
        if (!j.sample.trackingNo.trim() && sentDays >= 3) {
          out.push({
            level: 'error',
            dealCode: j.code,
            text: `Hàng mẫu đã báo gửi ${sentDays} ngày nhưng chưa điền Mã vận đơn — Cần Raise Leader B2C.`,
          });
        }
        if (sentDays >= 5) {
          out.push({
            level: 'warning',
            dealCode: j.code,
            text: `Hàng mẫu gửi ${sentDays} ngày chưa tới tay KOC (Quá SLA 5 ngày): Được phép đổi KOC hoặc dời lịch Air (miễn phạt trễ SLA).`,
          });
        }
      }
      // SLA Duyệt kịch bản / định hướng với Brand (2 ngày nhắc Growth/Account, 3 ngày đề xuất tự Air)
      if (j.script.status === 'SUBMITTED' && j.script.at) {
        const waitDays = dayDiff(j.script.at, now);
        if (waitDays >= 3 && !j.selfAirProposed) {
          out.push({
            level: 'error',
            dealCode: j.code,
            text: `Kịch bản chờ duyệt ${waitDays} ngày (Quá SLA 3 ngày): Có thể bấm "Đề xuất tự Air theo SLA 3 ngày".`,
          });
        } else if (waitDays >= 2) {
          out.push({
            level: 'warning',
            dealCode: j.code,
            text: `Kịch bản chờ duyệt ${waitDays} ngày (Quá SLA 2 ngày): Nhắc Growth / Account đôn đốc Brand.`,
          });
        }
      }
      if (j.deadline && !j.airLink.trim() && j.productionMode !== 'PRODUCTION_ONLY' && j.deadline < now) {
        out.push({ level: 'error', dealCode: j.code, text: `Quá hạn air ${dayDiff(j.deadline, now)} ngày, chưa có link air.` });
      }
      if (j.airedAt && j.deadline && j.airedAt > j.deadline) {
        out.push({ level: 'warning', dealCode: j.code, text: `Air trễ ${dayDiff(j.deadline, j.airedAt)} ngày.` });
      }
      if (j.payment.amount !== null && j.payment.amount > total && total > 0) {
        out.push({
          level: 'error',
          dealCode: j.code,
          text: `Số tiền thanh toán ${Math.round(j.payment.amount).toLocaleString('vi-VN')}đ vượt tổng thù lao Job ${Math.round(total).toLocaleString('vi-VN')}đ.`,
        });
      }
      if (j.payment.status !== 'NONE' && !isJobAcceptanceCleared(j)) {
        out.push({ level: 'error', dealCode: j.code, text: 'Đã đề nghị thanh toán khi chưa hoàn tất nghiệm thu Job.' });
      }
      // SLA Đính kèm Bill chuyển khoản (UNC) gửi lại cho KOC trong 7 ngày sau khi thanh toán (`Các SLA B2C.md` dòng 86)
      if (j.payment.status === 'PAID' && !(j.payment.uncBillUrl || '').trim()) {
        const paidDays = j.payment.paidAt ? dayDiff(j.payment.paidAt, now) : 0;
        out.push({
          level: paidDays > 7 ? 'error' : 'warning',
          dealCode: j.code,
          text:
            paidDays > 7
              ? `Quá hạn SLA 7 ngày sau thanh toán (${paidDays} ngày) chưa đính kèm ảnh Bill UNC gửi KOC — Job chưa được tính là Done.`
              : 'Đã thanh toán nhưng chưa đính kèm ảnh Bill chuyển khoản (UNC) gửi lại cho KOC (SLA trong 7 ngày).',
        });
      }
      // Kiểm tra chính danh chủ tài khoản ngân hàng
      if (!isAccountHolderMatched(j) && !(j.authorizationUrl || '').trim()) {
        out.push({
          level: 'error',
          dealCode: j.code,
          text: `Chủ TK (${j.payeeBankHolder}) khác tên pháp nhân (${j.payeeLegalName}) và chưa có Giấy ủy quyền.`,
        });
      }
      if (j.acceptance.status === 'FAILED' && !j.acceptance.confirmedBy) {
        out.push({ level: 'warning', dealCode: j.code, text: 'Video không đạt, chưa xử lý.' });
      }
      if (j.commissionPct === null && j.affiliateUrl) {
        out.push({ level: 'warning', dealCode: j.code, text: 'Link affiliate chưa có hoa hồng.' });
      }
    }
  }
  return out;
}

/**
 * Đối soát chi phí các deal (tổng các Job) với hạn mức Net của từng bậc trong kế hoạch đã duyệt:
 * vượt hạn mức thì cảnh báo, phát sinh chi phí khi hạn mức bằng 0đ thì báo đỏ (cần bổ sung phê duyệt).
 */
export function budgetIssues(deals: PlanDeal[], quota: QuotaLine[]): DealIssue[] {
  const out: DealIssue[] = [];
  const spent = new Map<string, number>();
  for (const d of deals) {
    const key = d.grade === 'TAP UpAffiliate' ? 'FOC' : d.grade;
    spent.set(key, (spent.get(key) || 0) + dealTotalFee(d));
  }
  const limit = new Map(quota.map(q => [String(q.key), q.requiredBudget]));
  spent.forEach((amount, key) => {
    if (key === 'FOC' || amount <= 0) return;
    const cap = limit.get(key) ?? 0;
    const label = `${key}: đã chốt ${Math.round(amount).toLocaleString('vi-VN')}đ`;
    if (cap <= 0) out.push({ level: 'error', dealCode: key, text: `${label} nhưng hạn mức Net của bậc này là 0đ, cần bổ sung phê duyệt.` });
    else if (amount > cap) out.push({ level: 'warning', dealCode: key, text: `${label} vượt hạn mức Net ${Math.round(cap).toLocaleString('vi-VN')}đ (vượt ${Math.round(amount - cap).toLocaleString('vi-VN')}đ).` });
  });
  return out;
}

export interface DealSummary {
  count: number;
  jobsCount: number;
  totalFee: number;
  paid: number;
  byStage: Record<DealStage, number>;
  gmv30: number;
}

export function summarizeDeals(deals: PlanDeal[]): DealSummary {
  const byStage = Object.fromEntries(STAGES.map(s => [s.key, 0])) as Record<DealStage, number>;
  let jobsCount = 0;
  let totalFee = 0;
  let paid = 0;
  let gmv30 = 0;
  for (const d of deals) {
    const jobs = d.jobs && d.jobs.length > 0 ? d.jobs : [];
    jobsCount += jobs.length;
    for (const j of jobs) {
      byStage[jobStageOf(j)]++;
      totalFee += jobTotalFee(j);
      if (j.payment.status === 'PAID') paid += j.payment.amount ?? jobTotalFee(j);
      gmv30 += j.performance.d30.gmv || 0;
    }
  }
  return { count: deals.length, jobsCount, totalFee, paid, byStage, gmv30 };
}

export function pushEvent(d: PlanDeal, actor: string, text: string): PlanDeal {
  return { ...d, history: [...d.history, { at: new Date().toISOString(), actor, text }].slice(-60) };
}

/** Làm sạch dữ liệu nhận từ máy khách, tự động nâng cấp các Deal cũ (1 video) sang cấu trúc `jobs: DealJob[]`. */
export function sanitizeDealBoard(input: Partial<DealBoardData> | undefined): DealBoardData {
  const s = (v: unknown, max = 500) => (typeof v === 'string' ? v.slice(0, max) : '');
  const n = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const day = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : '');
  const oneOf = <T extends string>(v: unknown, list: readonly T[], fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);
  const perf = (p: Partial<DealPerformance> | undefined): DealPerformance => ({ views: n(p?.views), orders: n(p?.orders), gmv: n(p?.gmv) });
  const sanitizeAcceptance = (acc: Partial<DealJobAcceptance> | undefined): DealJobAcceptance => ({
    status: oneOf(acc?.status, ['PENDING', 'PASSED', 'REVIEW', 'FAILED'] as const, 'PENDING'),
    checks: (Array.isArray(acc?.checks) ? acc!.checks! : []).slice(0, 30).map(c => ({ key: s(c?.key, 60), label: s(c?.label, 160), passed: Boolean(c?.passed), detail: s(c?.detail, 400) })),
    summary: s(acc?.summary, 600),
    views: n(acc?.views),
    isOnTime: typeof acc?.isOnTime === 'boolean' ? acc.isOnTime : null,
    daysDelayed: n(acc?.daysDelayed),
    checkedAt: s(acc?.checkedAt, 40),
    confirmedBy: s(acc?.confirmedBy, 120),
    confirmedAt: s(acc?.confirmedAt, 40),
    confirmNote: s(acc?.confirmNote, 500),
  });
  const sanitizePayment = (pay: Partial<DealJobPayment> | undefined): DealJobPayment => ({
    status: oneOf(pay?.status, ['NONE', 'REQUESTED', 'PAID'] as const, 'NONE'),
    amount: n(pay?.amount),
    requestedAt: day(pay?.requestedAt),
    paidAt: day(pay?.paidAt),
    note: s(pay?.note, 500),
    larkSlipCode: s(pay?.larkSlipCode, 80),
    larkApprovalCode: s(pay?.larkApprovalCode, 80),
    larkRecordId: s(pay?.larkRecordId, 80),
    larkSyncedAt: s(pay?.larkSyncedAt, 40),
    uncBillUrl: s(pay?.uncBillUrl, 1000),
    uncSentToKocAt: day(pay?.uncSentToKocAt),
  });

  const closingIn = input?.closingState;
  const closingState: MonthlyClosingState | undefined = closingIn
    ? {
        mode: oneOf(closingIn.mode, ['AUTO', 'OPEN_ROUND_1', 'OPEN_ROUND_2', 'LOCKED'] as const, 'AUTO'),
        round1ErrorLog: s(closingIn.round1ErrorLog, 2000),
        round2ErrorLog: s(closingIn.round2ErrorLog, 2000),
        updatedBy: s(closingIn.updatedBy, 120),
        updatedAt: s(closingIn.updatedAt, 40),
      }
    : undefined;

  const deals = (Array.isArray(input?.deals) ? input!.deals! : []).slice(0, 3000).map((d): PlanDeal => {
    const dealCode = s(d?.code, 40);
    const fallbackAcceptance = sanitizeAcceptance(d?.acceptance);
    const fallbackPayment = sanitizePayment(d?.payment);
    const rawJobs = Array.isArray(d?.jobs) && d!.jobs!.length > 0 ? d!.jobs! : null;

    const jobs: DealJob[] = rawJobs
      ? rawJobs.slice(0, 50).map((j, idx): DealJob => ({
          id: s(j?.id, 40) || newJobId(),
          code: s(j?.code, 50) || `${dealCode}-J${String(idx + 1).padStart(2, '0')}`,
          title: s(j?.title, 160) || `Job ${idx + 1} · Video ${idx + 1}`,
          listingItemId: s(j?.listingItemId, 60) || (idx === 0 ? s(d?.listingItemId, 60) : ''),
          slotId: s(j?.slotId, 60),
          briefCode: s(j?.briefCode, 40),
          pillar: s(j?.pillar, 120),
          angle: s(j?.angle, 240),
          hook: s(j?.hook, 300),
          usp: s(j?.usp, 300),
          cta: s(j?.cta, 240),
          briefUrl: s(j?.briefUrl, 1000),
          week: s(j?.week, 60),
          pic: s(j?.pic, 120) || s(d?.pic, 120),
          publishPlatform: oneOf(j?.publishPlatform, ['TIKTOK', 'FACEBOOK', 'INSTAGRAM', 'SHOPEE_VIDEO', 'YOUTUBE', 'THREADS'] as const, 'TIKTOK'),
          commercePlatform: oneOf(j?.commercePlatform, ['TIKTOK_SHOP', 'SHOPEE', 'LAZADA', 'NONE'] as const, 'TIKTOK_SHOP'),
          productionMode: oneOf(j?.productionMode, ['ORIGINAL', 'ADAPT', 'CROSS_POST', 'POST_ONLY', 'PRODUCTION_ONLY', 'CUT_DOWN'] as const, 'ORIGINAL'),
          pricingDisplayMode: oneOf(j?.pricingDisplayMode, ['PACKAGE_ALL_IN', 'ITEMIZED_SOW'] as const, 'PACKAGE_ALL_IN'),
          dependsOnJobCode: s(j?.dependsOnJobCode, 50),
          isPostAirUpsell: Boolean(j?.isPostAirUpsell),
          legalProfileId: s(j?.legalProfileId, 80),
          entityType: oneOf(j?.entityType, ['INDIVIDUAL', 'HOUSEHOLD', 'COMPANY'] as const, 'INDIVIDUAL'),
          vatPct: n(j?.vatPct) ?? 8,
          payeeLegalName: s(j?.payeeLegalName, 160),
          payeeTaxOrCccd: s(j?.payeeTaxOrCccd, 60),
          payeeBankName: s(j?.payeeBankName, 120),
          payeeBankAccount: s(j?.payeeBankAccount, 80),
          payeeBankHolder: s(j?.payeeBankHolder, 160),
          authorizationUrl: s(j?.authorizationUrl, 1000),
          hasSampleOnHand: Boolean(j?.hasSampleOnHand),
          selfAirProposed: Boolean(j?.selfAirProposed),
          videoFee: Math.max(0, n(j?.videoFee) ?? 0),
          addons: (Array.isArray(j?.addons) ? j.addons : []).slice(0, 20).map((a): JobAddonItem => ({
            id: s(a?.id, 40) || newAddonId(),
            type: oneOf(a?.type, ['ADS_CODE', 'CROSS_POST', 'IMAGE_USAGE', 'EXCLUSIVITY', 'LINK_BIO_CART', 'OTHER'] as const, 'ADS_CODE'),
            label: s(a?.label, 200) || ADDON_TYPE_LABEL[oneOf(a?.type, ['ADS_CODE', 'CROSS_POST', 'IMAGE_USAGE', 'EXCLUSIVITY', 'LINK_BIO_CART', 'OTHER'] as const, 'ADS_CODE')],
            fee: Math.max(0, n(a?.fee) ?? 0),
            status: oneOf(a?.status, ['PENDING', 'VERIFIED', 'DROPPED'] as const, 'PENDING'),
            evidence: s(a?.evidence, 500),
          })),
          productGroupId: s(j?.productGroupId, 40),
          productGroupName: s(j?.productGroupName, 160),
          productName: s(j?.productName, 200),
          cartUrl: s(j?.cartUrl, 1000),
          affiliateUrl: s(j?.affiliateUrl, 1000),
          commissionPct: n(j?.commissionPct),
          appendixNo: s(j?.appendixNo, 80),
          appendixDate: day(j?.appendixDate),
          appendixUrl: s(j?.appendixUrl, 1000),
          sample: { status: oneOf(j?.sample?.status, ['NONE', 'NOT_NEEDED', 'SENT', 'RECEIVED'] as const, 'NONE'), trackingNo: s(j?.sample?.trackingNo, 80), at: day(j?.sample?.at) },
          script: {
            status: oneOf(j?.script?.status, ['NONE', 'NOT_NEEDED', 'SUBMITTED', 'CHANGES', 'APPROVED'] as const, 'NONE'),
            scriptUrl: s(j?.script?.scriptUrl, 1000),
            demoStatus: oneOf(j?.script?.demoStatus, ['NONE', 'NOT_NEEDED', 'SUBMITTED', 'CHANGES', 'APPROVED'] as const, 'NONE'),
            demoUrl: s(j?.script?.demoUrl, 1000),
            note: s(j?.script?.note, 500),
            at: day(j?.script?.at),
          },
          deadline: day(j?.deadline),
          airLink: s(j?.airLink, 1000),
          airedAt: day(j?.airedAt),
          sparkAdsCode: s(j?.sparkAdsCode, 120),
          acceptance: sanitizeAcceptance(j?.acceptance),
          payment: sanitizePayment(j?.payment),
          performance: { d14: perf(j?.performance?.d14), d30: perf(j?.performance?.d30), d60: perf(j?.performance?.d60) },
        }))
      : [
          {
            id: `JB-${s(d?.id, 36) || newJobId()}`,
            code: `${dealCode || 'DL'}-J01`,
            title: 'Job 1 · Video 1',
            listingItemId: s(d?.listingItemId, 60),
            slotId: s(d?.slotId, 60),
            briefCode: '',
            pillar: '',
            angle: '',
            hook: '',
            usp: '',
            cta: '',
            briefUrl: '',
            week: s(d?.week, 60),
            pic: s(d?.pic, 120),
            publishPlatform: 'TIKTOK',
            commercePlatform: 'TIKTOK_SHOP',
            productionMode: 'ORIGINAL',
            pricingDisplayMode: 'PACKAGE_ALL_IN',
            dependsOnJobCode: '',
            isPostAirUpsell: false,
            legalProfileId: '',
            entityType: 'INDIVIDUAL',
            vatPct: 8,
            payeeLegalName: '',
            payeeTaxOrCccd: '',
            payeeBankName: '',
            payeeBankAccount: '',
            payeeBankHolder: '',
            authorizationUrl: '',
            hasSampleOnHand: false,
            selfAirProposed: false,
            videoFee: Math.max(0, n(d?.fee) ?? 0),
            addons: [],
            productGroupId: s(d?.productGroupId, 40),
            productGroupName: s(d?.productGroupName, 160),
            productName: s(d?.productName, 200),
            cartUrl: s(d?.cartUrl, 1000),
            affiliateUrl: s(d?.affiliateUrl, 1000),
            commissionPct: n(d?.commissionPct),
            appendixNo: s(d?.appendixNo, 80),
            appendixDate: day(d?.appendixDate),
            appendixUrl: s(d?.appendixUrl, 1000),
            sample: { status: oneOf(d?.sample?.status, ['NONE', 'NOT_NEEDED', 'SENT', 'RECEIVED'] as const, 'NONE'), trackingNo: s(d?.sample?.trackingNo, 80), at: day(d?.sample?.at) },
            script: {
              status: oneOf(d?.script?.status, ['NONE', 'NOT_NEEDED', 'SUBMITTED', 'CHANGES', 'APPROVED'] as const, 'NONE'),
              scriptUrl: '',
              demoStatus: 'NONE',
              demoUrl: '',
              note: s(d?.script?.note, 500),
              at: day(d?.script?.at),
            },
            deadline: day(d?.deadline),
            airLink: s(d?.airLink, 1000),
            airedAt: day(d?.airedAt),
            sparkAdsCode: '',
            acceptance: fallbackAcceptance,
            payment: fallbackPayment,
            performance: { d14: perf(d?.performance?.d14), d30: perf(d?.performance?.d30), d60: perf(d?.performance?.d60) },
          },
        ];

    return syncDealSummaryFields({
      id: s(d?.id, 40) || newDealId(),
      code: dealCode,
      listingItemId: s(d?.listingItemId, 60),
      slotId: s(d?.slotId, 60),
      kocHandle: s(d?.kocHandle, 120),
      kocName: s(d?.kocName, 160),
      grade: s(d?.grade, 30),
      week: s(d?.week, 60),
      pic: s(d?.pic, 120),
      fee: n(d?.fee) ?? 0,
      jobs,
      productGroupId: s(d?.productGroupId, 40),
      productGroupName: s(d?.productGroupName, 160),
      productName: s(d?.productName, 200),
      cartUrl: s(d?.cartUrl, 1000),
      affiliateUrl: s(d?.affiliateUrl, 1000),
      commissionPct: n(d?.commissionPct),
      appendixNo: s(d?.appendixNo, 80),
      appendixDate: day(d?.appendixDate),
      appendixUrl: s(d?.appendixUrl, 1000),
      sample: { status: oneOf(d?.sample?.status, ['NONE', 'NOT_NEEDED', 'SENT', 'RECEIVED'] as const, 'NONE'), trackingNo: s(d?.sample?.trackingNo, 80), at: day(d?.sample?.at) },
      script: { status: oneOf(d?.script?.status, ['NONE', 'NOT_NEEDED', 'SUBMITTED', 'CHANGES', 'APPROVED'] as const, 'NONE'), note: s(d?.script?.note, 500), at: day(d?.script?.at) },
      deadline: day(d?.deadline),
      airLink: s(d?.airLink, 1000),
      airedAt: day(d?.airedAt),
      acceptance: fallbackAcceptance,
      payment: fallbackPayment,
      performance: { d14: perf(d?.performance?.d14), d30: perf(d?.performance?.d30), d60: perf(d?.performance?.d60) },
      createdAt: s(d?.createdAt, 40),
      createdBy: s(d?.createdBy, 120),
      history: (Array.isArray(d?.history) ? d.history : []).slice(-60).map(h => ({ at: s(h?.at, 40), actor: s(h?.actor, 120), text: s(h?.text, 300) })),
    });
  });
  return { deals, closingState };
}
