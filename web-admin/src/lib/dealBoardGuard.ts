import type { UserProfile } from './types';
import type { StorePosition } from './storePositions';
import { isPersonInField, type StaffCodeMap } from './staffIdentity';
import {
  getMonthlyClosingStatus,
  isAirLinkLocked,
  type DealBoardData,
  type DealJob,
  type PlanDeal,
} from './dealBoardRules';

/**
 * Kiểm quyền lưu bảng Deal ở máy chủ: so bản cũ với bản gửi lên, chặn theo
 * (1) trạng thái (khóa sổ tháng, khóa link Air), (2) người sở hữu deal, (3) vai trò cho các bước duyệt.
 * Một lỗi là chặn cả lần lưu, kèm lý do để người dùng biết phải nhờ ai.
 */
export class DealGuardError extends Error {
  constructor(message: string, public readonly status: number = 403) {
    super(message);
  }
}

export interface DealGuardContext {
  actor: Pick<UserProfile, 'id' | 'name' | 'staffCode' | 'role' | 'permissions'>;
  /** Admin / Giám đốc */
  global: boolean;
  positions: Set<StorePosition>;
  /** Account PIC của gian (đối soát số liệu Brand) */
  isAccountPic: boolean;
  storeCodes?: StaffCodeMap;
  planMonth: string;
  /** Brand đã đồng ý cơ chế tự Air */
  selfAirAllowed: boolean;
  now?: Date;
}

const same = (a: unknown, b: unknown) => stable(a) === stable(b);
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function stable(v: unknown): string {
  if (v === undefined || v === null) return 'null';
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  if (typeof v === 'object') {
    return `{${Object.entries(v as Record<string, unknown>)
      .filter(([, x]) => x !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([k, x]) => `${k}:${stable(x)}`)
      .join(',')}}`;
  }
  return JSON.stringify(v);
}

function changedKeys<T extends object>(a: T | undefined, b: T): string[] {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b)]);
  return [...keys].filter(k => !same((a as Record<string, unknown> | undefined)?.[k], (b as Record<string, unknown>)[k]));
}

const isFinance = (c: DealGuardContext) => c.global || c.actor.role === 'FINANCE' || Boolean(c.actor.permissions?.includes('canApprovePayment'));
const isLegal = (c: DealGuardContext) => c.global || c.actor.role === 'LEGAL';
const isStoreOwner = (c: DealGuardContext) => c.global || c.positions.has('BOOKING_MAIN') || c.positions.has('LEADER');
const isExecutor = (c: DealGuardContext) => c.positions.has('BOOKING_CO') || c.positions.has('BACKUP');

function ownsDeal(c: DealGuardContext, deal: PlanDeal | undefined): boolean {
  if (!deal) return false;
  return isPersonInField(c.actor, deal.pic, c.storeCodes) || (deal.jobs || []).some(j => isPersonInField(c.actor, j.pic, c.storeCodes));
}

/** Trường của Job mà người giữ vai trò (không phụ trách deal) được sửa. */
function roleFields(c: DealGuardContext): Set<string> {
  const out = new Set<string>();
  if (isLegal(c)) out.add('legalReviewStatus');
  if (isFinance(c)) ['financeReviewStatus', 'payment', 'advancePayment', 'invoiceCheck', 'closingAudit'].forEach(f => out.add(f));
  if (c.isAccountPic) out.add('closingAudit');
  return out;
}

function hasPaymentActivity(j: DealJob): boolean {
  return j.payment.status !== 'NONE' || ['REQUESTED', 'APPROVED', 'PAID'].includes(j.advancePayment?.status || 'NONE');
}

function leadConfirmed(j?: DealJob): boolean {
  return Boolean(j?.lateSigningExplanation?.leadConfirmed || j?.lateSigningExplanation?.confirmedByLead?.trim() || j?.lateSigningExplanation?.leadConfirmedBy?.trim());
}

/** Kiểm từng bước duyệt nhạy cảm của Job (áp cho mọi người, kể cả người phụ trách deal). */
function guardJobSteps(c: DealGuardContext, d: PlanDeal, j: DealJob, old: DealJob | undefined, prev: DealBoardData) {
  const tag = `Job ${j.code}`;
  if (j.legalReviewStatus !== (old?.legalReviewStatus ?? 'NONE') && ['APPROVED', 'REJECTED', 'CHANGES'].includes(j.legalReviewStatus || '') && !isLegal(c)) {
    throw new DealGuardError(`${tag}: chỉ Pháp chế hoặc Giám đốc được duyệt thẩm định Pháp chế.`);
  }
  if (j.financeReviewStatus !== (old?.financeReviewStatus ?? 'NONE') && ['APPROVED', 'REJECTED', 'CHANGES'].includes(j.financeReviewStatus || '') && !isFinance(c)) {
    throw new DealGuardError(`${tag}: chỉ Kế toán hoặc Giám đốc được duyệt thẩm định Tài chính.`);
  }
  if (j.payment.status === 'PAID' && old?.payment.status !== 'PAID' && !isFinance(c)) {
    throw new DealGuardError(`${tag}: chỉ Kế toán hoặc Giám đốc được xác nhận Đã thanh toán.`);
  }
  const adv = j.advancePayment?.status || 'NONE';
  const oldAdv = old?.advancePayment?.status || 'NONE';
  if (adv !== oldAdv && ['APPROVED', 'PAID'].includes(adv) && !isFinance(c)) {
    throw new DealGuardError(`${tag}: chỉ Kế toán hoặc Giám đốc được duyệt / xác nhận chi tạm ứng.`);
  }
  const draft = j.invoiceCheck?.draftInvoiceStatus || 'NONE';
  const oldDraft = old?.invoiceCheck?.draftInvoiceStatus || 'NONE';
  if (draft !== oldDraft && ['APPROVED', 'REJECTED', 'CHANGES'].includes(draft) && !isFinance(c)) {
    throw new DealGuardError(`${tag}: chỉ Kế toán được duyệt Hóa đơn nháp.`);
  }
  if ((j.closingAudit?.accountStatus || 'PENDING') !== (old?.closingAudit?.accountStatus || 'PENDING') && !(c.global || c.isAccountPic)) {
    throw new DealGuardError(`${tag}: chỉ Account PIC của gian được đối soát số liệu Brand.`);
  }
  if ((j.closingAudit?.financeStatus || 'PENDING') !== (old?.closingAudit?.financeStatus || 'PENDING') && !isFinance(c)) {
    throw new DealGuardError(`${tag}: chỉ Kế toán được đối soát chứng từ.`);
  }
  if (leadConfirmed(j) && !leadConfirmed(old) && !(c.global || c.positions.has('LEADER'))) {
    throw new DealGuardError(`${tag}: chỉ Leader của gian hoặc Giám đốc được xác nhận giải trình ký muộn.`);
  }

  // Kịch bản / Demo: chỉ gửi Brand (vòng 2) khi B2C đã duyệt nội bộ (vòng 1)
  if (j.script.status === 'SUBMITTED' && old?.script.status !== 'SUBMITTED' && j.script.scriptUrl?.trim() && j.script.internalScriptAuditStatus !== 'PASSED') {
    throw new DealGuardError(`${tag}: kịch bản chưa đạt duyệt nội bộ vòng 1, chưa gửi Brand được.`, 400);
  }
  if (j.script.demoStatus === 'SUBMITTED' && old?.script.demoStatus !== 'SUBMITTED' && j.script.demoUrl?.trim() && j.script.internalDemoAuditStatus !== 'PASSED') {
    throw new DealGuardError(`${tag}: video demo chưa đạt duyệt nội bộ vòng 1, chưa gửi Brand được.`, 400);
  }

  // Tự Air: chỉ với Brand đã đồng ý, kịch bản đã gửi Brand quá 72 giờ
  if (j.selfAirProposed && !old?.selfAirProposed) {
    if (!c.selfAirAllowed) throw new DealGuardError(`${tag}: Brand chưa đồng ý cơ chế tự Air (Dữ liệu gốc › Thương hiệu).`, 400);
    const sentAt = Date.parse(j.script.at || '');
    const hours = Number.isFinite(sentAt) ? ((c.now || new Date()).getTime() - sentAt) / 3_600_000 : 0;
    if (j.script.status !== 'SUBMITTED' || hours < 72) {
      throw new DealGuardError(`${tag}: chỉ đề xuất tự Air khi kịch bản đã gửi Brand quá 72 giờ chưa được duyệt.`, 400);
    }
  }

  // Link Air: khóa sau 7 ngày làm việc (trừ Kế toán mở cửa sổ); đổi link thì phải nghiệm thu lại
  if (old && j.airLink.trim() !== old.airLink.trim() && isAirLinkLocked(old, prev.closingState, c.now ? ymd(c.now) : undefined) && !isFinance(c)) {
    throw new DealGuardError(`${tag}: link Air đã khóa sau 7 ngày làm việc. Nhờ Kế toán mở cửa sổ chỉnh sửa.`);
  }

  // Nghiệm thu dù chưa đạt: phải có lý do
  const confirming = Boolean(j.acceptance.confirmedBy) && !old?.acceptance.confirmedBy;
  if (confirming && j.acceptance.status !== 'PASSED' && !j.acceptance.confirmNote.trim()) {
    throw new DealGuardError(`${tag}: xác nhận nghiệm thu khi video chưa đạt phải ghi lý do.`, 400);
  }
  // Đạt nghiệm thu phải có kết quả soát video
  if (j.acceptance.status === 'PASSED' && old?.acceptance.status !== 'PASSED' && !(j.acceptance.checks || []).length && !j.acceptance.confirmedBy) {
    throw new DealGuardError(`${tag}: chưa có kết quả soát video, bấm "Nghiệm thu video" trước khi chọn Đạt.`, 400);
  }
  void d;
}

export function guardDealBoardSave(prev: DealBoardData, next: DealBoardData, c: DealGuardContext): DealBoardData {
  const closing = getMonthlyClosingStatus(c.planMonth, prev.closingState, c.now);
  if (!same(prev.closingState, next.closingState) && !isFinance(c)) {
    throw new DealGuardError('Chỉ Kế toán hoặc Giám đốc được mở / khóa sổ nghiệm thu tháng.');
  }

  const before = new Map(prev.deals.map(d => [d.id, d]));
  const after = new Set(next.deals.map(d => d.id));
  const listingOwner = new Map<string, string>();

  // Xóa deal
  for (const old of prev.deals) {
    if (after.has(old.id)) continue;
    if ((old.jobs || []).some(hasPaymentActivity)) {
      throw new DealGuardError(`Deal ${old.code} đã có tạm ứng / đề nghị thanh toán, không xóa được.`, 400);
    }
    if (!(isStoreOwner(c) || (isExecutor(c) && ownsDeal(c, old)))) {
      throw new DealGuardError(`Deal ${old.code} do ${old.pic || 'người khác'} phụ trách, bạn không xóa được.`);
    }
    if (closing.locked && !isFinance(c)) throw new DealGuardError(`Tháng đã khóa sổ, không xóa được deal ${old.code}.`, 423);
  }

  const deals = next.deals.map(d => {
    if (d.listingItemId) {
      const dup = listingOwner.get(d.listingItemId);
      if (dup) throw new DealGuardError(`KOC trên List đã có Deal ${dup}; không tạo trùng Deal ${d.code}.`, 409);
      listingOwner.set(d.listingItemId, d.code);
    }
    const old = before.get(d.id);
    const ownerScope = isStoreOwner(c) || (isExecutor(c) && (old ? ownsDeal(c, old) : true));

    // Deal mới
    if (!old) {
      if (closing.locked && !isFinance(c)) throw new DealGuardError(`Tháng đã khóa sổ, không tạo được deal ${d.code}.`, 423);
      if (!isStoreOwner(c) && !isExecutor(c)) throw new DealGuardError(`Bạn không thuộc nhóm Booking của gian, không tạo được deal ${d.code}.`);
      if (!isStoreOwner(c)) {
        // Booking cùng làm chỉ tạo deal của chính mình
        const pic = d.pic?.trim() ? d.pic : c.actor.name;
        if (!isPersonInField(c.actor, pic, c.storeCodes)) throw new DealGuardError(`Booking cùng làm chỉ tạo deal do chính mình phụ trách (${d.code}).`);
        d = { ...d, pic, jobs: (d.jobs || []).map(j => ({ ...j, pic: j.pic?.trim() ? j.pic : pic })) };
        if ((d.jobs || []).some(j => !isPersonInField(c.actor, j.pic, c.storeCodes))) {
          throw new DealGuardError(`Booking cùng làm chỉ tạo Job do chính mình phụ trách (${d.code}).`);
        }
      }
      for (const j of d.jobs || []) guardJobSteps(c, d, j, undefined, prev);
      return d;
    }

    // Deal đã có: phần thông tin deal (không tính Job)
    const { jobs: _nj, ...dealHead } = d;
    const { jobs: _oj, ...oldHead } = old;
    const headChanged = changedKeys(oldHead, dealHead);
    if (headChanged.length) {
      if (!ownerScope) throw new DealGuardError(`Deal ${d.code} do ${old.pic || 'người khác'} phụ trách, bạn không sửa được.`);
      if (headChanged.includes('pic') && !isStoreOwner(c)) throw new DealGuardError(`Chỉ Booking chính / Leader được đổi người phụ trách deal ${d.code}.`);
      if (closing.locked && !isFinance(c) && headChanged.some(k => !['history', 'updatedAt'].includes(k))) {
        throw new DealGuardError(`Tháng đã khóa sổ, chỉ xem được deal ${d.code}.`, 423);
      }
    }

    const oldJobs = new Map((old.jobs || []).map(j => [j.id, j]));
    const newIds = new Set((d.jobs || []).map(j => j.id));
    for (const oj of old.jobs || []) {
      if (newIds.has(oj.id)) continue;
      if (hasPaymentActivity(oj)) throw new DealGuardError(`Job ${oj.code} đã có tạm ứng / đề nghị thanh toán, không xóa được.`, 400);
      if (!ownerScope) throw new DealGuardError(`Job ${oj.code} do ${oj.pic || old.pic || 'người khác'} phụ trách, bạn không xóa được.`);
    }

    const allowedByRole = roleFields(c);
    for (const j of d.jobs || []) {
      const oj = oldJobs.get(j.id);
      const changed = changedKeys(oj, j);
      if (!changed.length) continue;
      if (!oj && closing.locked && !isFinance(c)) throw new DealGuardError(`Tháng đã khóa sổ, không thêm được Job ${j.code}.`, 423);
      if (!ownerScope) {
        const outside = changed.filter(k => !allowedByRole.has(k));
        if (outside.length) throw new DealGuardError(`Job ${j.code} do ${oj?.pic || old.pic || 'người khác'} phụ trách, bạn không sửa được (${outside.slice(0, 3).join(', ')}).`);
      }
      if (changed.includes('pic') && oj && !isStoreOwner(c)) throw new DealGuardError(`Chỉ Booking chính / Leader được đổi người phụ trách Job ${j.code}.`);
      // Khóa sổ: chỉ làm nốt Job đã lên sóng (nghiệm thu, hóa đơn, thanh toán); Kế toán sửa được trong cửa sổ mở
      if (closing.locked && !isFinance(c) && oj && !oj.airLink.trim()) {
        throw new DealGuardError(`Tháng đã khóa sổ: Job ${j.code} chưa lên sóng chỉ xem được (chuyển sang tháng sau nếu còn làm).`, 423);
      }
      guardJobSteps(c, d, j, oj, prev);
    }
    return d;
  });

  return { ...next, deals };
}
