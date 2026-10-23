import type { KocListingItem } from './types';
import { columnOf, itemFee, itemGrade, type QuotaLine } from './listingBoardRules';

/**
 * Deal theo kế hoạch: từ KOC đã chốt trên bảng điều phối đến phụ lục, hàng mẫu, kịch bản, air,
 * nghiệm thu, thanh toán và hiệu suất. Mỗi deal đúng một phụ lục; trước khi tạo deal KOC phải có hợp đồng nguyên tắc.
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
  /** Thù lao Net đã chốt với KOC. */
  fee: number;
  // Sản phẩm: lưu bản chụp tại thời điểm tạo deal, sửa danh mục sau này không làm đổi deal đã ký
  productGroupId: string;
  productGroupName: string;
  productName: string;
  cartUrl: string;
  affiliateUrl: string;
  commissionPct: number | null;
  // Phụ lục
  appendixNo: string;
  appendixDate: string;
  appendixUrl: string;
  sample: { status: SampleStatus; trackingNo: string; at: string };
  script: { status: ScriptStatus; note: string; at: string };
  deadline: string;
  airLink: string;
  airedAt: string;
  acceptance: {
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
  };
  payment: { status: PaymentStatus; amount: number | null; requestedAt: string; paidAt: string; note: string };
  performance: { d14: DealPerformance; d30: DealPerformance; d60: DealPerformance };
  createdAt: string;
  createdBy: string;
  history: DealEvent[];
}

export interface DealBoardData {
  deals: PlanDeal[];
}

export const EMPTY_DEAL_BOARD: DealBoardData = { deals: [] };

const emptyPerf = (): DealPerformance => ({ views: null, orders: null, gmv: null });

export const newDealId = () => `DL-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export interface NewDealInput {
  item: KocListingItem;
  planId: string;
  month: string;
  actor: string;
  existingCodes: string[];
  week?: string;
  pic?: string;
  slotId?: string;
  productGroupId?: string;
  productGroupName?: string;
}

/** Mã deal dạng BO-<tháng>-<số thứ tự>, không trùng mã đã có. */
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
  return {
    id: newDealId(),
    code: nextDealCode(input.month, input.existingCodes),
    listingItemId: item.id,
    slotId: input.slotId || item.planSlotId || '',
    kocHandle: item.kocHandle.replace(/^@/, ''),
    kocName: item.kocName,
    grade: String(itemGrade(item)),
    week: input.week || '',
    pic: input.pic || item.assignedStaffName || actor,
    fee: itemFee(item),
    productGroupId: input.productGroupId || '',
    productGroupName: input.productGroupName || '',
    productName: '',
    cartUrl: '',
    affiliateUrl: '',
    commissionPct: null,
    appendixNo: '',
    appendixDate: '',
    appendixUrl: '',
    sample: { status: 'NONE', trackingNo: '', at: '' },
    script: { status: 'NONE', note: '', at: '' },
    deadline: '',
    airLink: '',
    airedAt: '',
    acceptance: { status: 'PENDING', checks: [], summary: '', views: null, isOnTime: null, daysDelayed: null, checkedAt: '', confirmedBy: '', confirmedAt: '', confirmNote: '' },
    payment: { status: 'NONE', amount: null, requestedAt: '', paidAt: '', note: '' },
    performance: { d14: emptyPerf(), d30: emptyPerf(), d60: emptyPerf() },
    createdAt: now,
    createdBy: actor,
    history: [{ at: now, actor, text: `Tạo deal ${input.month}` }],
  };
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

export const isAcceptanceCleared = (d: PlanDeal): boolean => d.acceptance.status === 'PASSED' || Boolean(d.acceptance.confirmedBy);

/** Bước hiện tại của deal: bước đầu tiên chưa xong. */
export function stageOf(d: PlanDeal): DealStage {
  if (!d.appendixNo.trim() || !d.appendixDate) return 'APPENDIX';
  if (d.sample.status !== 'RECEIVED' && d.sample.status !== 'NOT_NEEDED') return 'SAMPLE';
  if (d.script.status !== 'APPROVED' && d.script.status !== 'NOT_NEEDED') return 'SCRIPT';
  if (!d.airLink.trim()) return 'AIR';
  if (!isAcceptanceCleared(d)) return 'ACCEPTANCE';
  if (d.payment.status !== 'PAID') return 'PAYMENT';
  return 'TRACKING';
}

/** Lý do không cho tạo deal từ thẻ KOC; chuỗi rỗng nghĩa là được tạo. */
export function createDealBlocker(item: KocListingItem, framework: FrameworkContract | undefined, deals: PlanDeal[]): string {
  if (columnOf(item) !== 'CONFIRMED') return 'KOC chưa ở cột Đã chốt.';
  if (deals.some(d => d.listingItemId === item.id)) return 'KOC này đã có deal.';
  const g = itemGrade(item);
  if (g !== 'TAP UpAffiliate' && !(itemFee(item) > 0)) return 'Chưa có giá chốt.';
  const st = frameworkState(framework);
  if (st !== 'VALID') return FRAMEWORK_STATE_LABEL[st];
  return '';
}

/** Lý do không cho đề nghị thanh toán; chuỗi rỗng nghĩa là được. */
export function paymentBlocker(d: PlanDeal): string {
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
    if (d.deadline && !d.airLink.trim() && d.deadline < now) out.push({ level: 'error', dealCode: d.code, text: `Quá hạn air ${dayDiff(d.deadline, now)} ngày, chưa có link air.` });
    if (d.airedAt && d.deadline && d.airedAt > d.deadline) out.push({ level: 'warning', dealCode: d.code, text: `Air trễ ${dayDiff(d.deadline, d.airedAt)} ngày.` });
    if (d.payment.amount !== null && d.payment.amount > d.fee && d.fee > 0) out.push({ level: 'error', dealCode: d.code, text: `Số tiền thanh toán ${Math.round(d.payment.amount).toLocaleString('vi-VN')}đ vượt thù lao chốt ${Math.round(d.fee).toLocaleString('vi-VN')}đ.` });
    if (d.payment.status !== 'NONE' && !isAcceptanceCleared(d)) out.push({ level: 'error', dealCode: d.code, text: 'Đã đề nghị thanh toán khi chưa nghiệm thu.' });
    if (d.sample.status === 'SENT' && d.sample.at && dayDiff(d.sample.at, now) > 7) out.push({ level: 'warning', dealCode: d.code, text: `Hàng mẫu gửi ${dayDiff(d.sample.at, now)} ngày chưa xác nhận nhận.` });
    if (d.acceptance.status === 'FAILED' && !d.acceptance.confirmedBy) out.push({ level: 'warning', dealCode: d.code, text: 'Video không đạt, chưa xử lý.' });
    if (d.commissionPct === null && d.affiliateUrl) out.push({ level: 'warning', dealCode: d.code, text: 'Link affiliate chưa có hoa hồng.' });
  }
  return out;
}

/**
 * Đối soát chi phí các deal với hạn mức Net của từng bậc trong kế hoạch đã duyệt:
 * vượt hạn mức thì cảnh báo, phát sinh chi phí khi hạn mức bằng 0đ thì báo đỏ (cần bổ sung phê duyệt).
 */
export function budgetIssues(deals: PlanDeal[], quota: QuotaLine[]): DealIssue[] {
  const out: DealIssue[] = [];
  const spent = new Map<string, number>();
  for (const d of deals) {
    const key = d.grade === 'TAP UpAffiliate' ? 'FOC' : d.grade;
    spent.set(key, (spent.get(key) || 0) + d.fee);
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
  totalFee: number;
  paid: number;
  byStage: Record<DealStage, number>;
  gmv30: number;
}

export function summarizeDeals(deals: PlanDeal[]): DealSummary {
  const byStage = Object.fromEntries(STAGES.map(s => [s.key, 0])) as Record<DealStage, number>;
  let totalFee = 0;
  let paid = 0;
  let gmv30 = 0;
  for (const d of deals) {
    byStage[stageOf(d)]++;
    totalFee += d.fee;
    if (d.payment.status === 'PAID') paid += d.payment.amount || 0;
    gmv30 += d.performance.d30.gmv || 0;
  }
  return { count: deals.length, totalFee, paid, byStage, gmv30 };
}

export function pushEvent(d: PlanDeal, actor: string, text: string): PlanDeal {
  return { ...d, history: [...d.history, { at: new Date().toISOString(), actor, text }].slice(-60) };
}

/** Làm sạch dữ liệu nhận từ máy khách. */
export function sanitizeDealBoard(input: Partial<DealBoardData> | undefined): DealBoardData {
  const s = (v: unknown, max = 500) => (typeof v === 'string' ? v.slice(0, max) : '');
  const n = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const day = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : '');
  const oneOf = <T extends string>(v: unknown, list: readonly T[], fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);
  const perf = (p: Partial<DealPerformance> | undefined): DealPerformance => ({ views: n(p?.views), orders: n(p?.orders), gmv: n(p?.gmv) });
  const deals = (Array.isArray(input?.deals) ? input!.deals! : []).slice(0, 3000).map((d): PlanDeal => ({
    id: s(d?.id, 40) || newDealId(),
    code: s(d?.code, 40),
    listingItemId: s(d?.listingItemId, 60),
    slotId: s(d?.slotId, 60),
    kocHandle: s(d?.kocHandle, 120),
    kocName: s(d?.kocName, 160),
    grade: s(d?.grade, 30),
    week: s(d?.week, 60),
    pic: s(d?.pic, 120),
    fee: n(d?.fee) ?? 0,
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
    acceptance: {
      status: oneOf(d?.acceptance?.status, ['PENDING', 'PASSED', 'REVIEW', 'FAILED'] as const, 'PENDING'),
      checks: (Array.isArray(d?.acceptance?.checks) ? d.acceptance.checks : []).slice(0, 30).map(c => ({ key: s(c?.key, 60), label: s(c?.label, 160), passed: Boolean(c?.passed), detail: s(c?.detail, 400) })),
      summary: s(d?.acceptance?.summary, 600),
      views: n(d?.acceptance?.views),
      isOnTime: typeof d?.acceptance?.isOnTime === 'boolean' ? d.acceptance.isOnTime : null,
      daysDelayed: n(d?.acceptance?.daysDelayed),
      checkedAt: s(d?.acceptance?.checkedAt, 40),
      confirmedBy: s(d?.acceptance?.confirmedBy, 120),
      confirmedAt: s(d?.acceptance?.confirmedAt, 40),
      confirmNote: s(d?.acceptance?.confirmNote, 500),
    },
    payment: { status: oneOf(d?.payment?.status, ['NONE', 'REQUESTED', 'PAID'] as const, 'NONE'), amount: n(d?.payment?.amount), requestedAt: day(d?.payment?.requestedAt), paidAt: day(d?.payment?.paidAt), note: s(d?.payment?.note, 500) },
    performance: { d14: perf(d?.performance?.d14), d30: perf(d?.performance?.d30), d60: perf(d?.performance?.d60) },
    createdAt: s(d?.createdAt, 40),
    createdBy: s(d?.createdBy, 120),
    history: (Array.isArray(d?.history) ? d.history : []).slice(-60).map(h => ({ at: s(h?.at, 40), actor: s(h?.actor, 120), text: s(h?.text, 300) })),
  }));
  return { deals };
}
