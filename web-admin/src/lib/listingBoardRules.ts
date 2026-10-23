// Logic bảng điều phối listing: đối chiếu số lượng và ngân sách đã list với kế hoạch đã duyệt (bảng 4.1.1),
// chuyển trạng thái, và xuất đúng cột bảng 3.1 Listing KOCs của Lark.
import type { InputPlanBreakdownState, KocItem, KocListingItem, ListingBatchCycle, SalaryGrade } from './types';
import { KL_TIERS, klBaseCost, klFromFee, klLabel, klTier, type KlCode } from './klTiers';

export const LISTABLE_STATUSES = ['LEAD_APPROVED', 'BRAND_APPROVED', 'APPROVED', 'LOCKED', 'IN_EXECUTION', 'COMPLETED'];

/** Chỉ kế hoạch đã được Giám đốc duyệt mới bắt đầu listing. */
export const isPlanListable = (plan: InputPlanBreakdownState): boolean =>
  LISTABLE_STATUSES.includes(plan.status || '') || Boolean(plan.isVersionLocked);

export type BoardColumn = 'DRAFT' | 'WAIT_BRAND' | 'NEGOTIATING' | 'CONFIRMED' | 'DROPPED';

export const BOARD_COLUMNS: { key: BoardColumn; label: string }[] = [
  { key: 'DRAFT', label: 'Nháp' },
  { key: 'WAIT_BRAND', label: 'Chờ Brand duyệt' },
  { key: 'NEGOTIATING', label: 'Thương lượng KOC' },
  { key: 'CONFIRMED', label: 'Đã chốt' },
  { key: 'DROPPED', label: 'Rớt' },
];

const ALLOWED_MOVES: Record<BoardColumn, BoardColumn[]> = {
  DRAFT: ['WAIT_BRAND', 'DROPPED'],
  WAIT_BRAND: ['DRAFT', 'NEGOTIATING', 'DROPPED'],
  NEGOTIATING: ['WAIT_BRAND', 'CONFIRMED', 'DROPPED'],
  CONFIRMED: ['NEGOTIATING'],
  DROPPED: ['DRAFT'],
};

export const canMove = (from: BoardColumn, to: BoardColumn) => ALLOWED_MOVES[from].includes(to);

export function columnOf(item: KocListingItem): BoardColumn {
  if (item.overallStatus === 'DROPPED' || item.brandApprovalStatus === 'BRAND_REJECTED') return 'DROPPED';
  if (item.overallStatus === 'FINAL_APPROVED') return 'CONFIRMED';
  if (item.overallStatus === 'DRAFT') return 'DRAFT';
  return item.brandApprovalStatus === 'BRAND_APPROVED' ? 'NEGOTIATING' : 'WAIT_BRAND';
}

export const itemFee = (item: KocListingItem): number => item.finalFee ?? item.proposedFee ?? 0;

export const itemGrade = (item: KocListingItem): KlCode | 'TAP UpAffiliate' => {
  const g = item.salaryGrade;
  if (g && (g === 'TAP UpAffiliate' || KL_TIERS.some(t => t.code === g))) return g as KlCode | 'TAP UpAffiliate';
  return klFromFee(itemFee(item));
};

export interface MoveResult {
  item?: KocListingItem;
  error?: string;
}

export function moveItem(item: KocListingItem, to: BoardColumn, actor: string, reason?: string): MoveResult {
  const from = columnOf(item);
  if (from === to) return { item };
  if (!canMove(from, to)) return { error: 'Không chuyển trực tiếp được sang cột này.' };
  const now = new Date().toISOString();
  const base: KocListingItem = { ...item, updatedAt: now };
  switch (to) {
    case 'DRAFT':
      return { item: { ...base, overallStatus: 'DRAFT', brandApprovalStatus: 'BRAND_PENDING', kocNegotiationStatus: 'NOT_CONTACTED', dropReason: undefined } };
    case 'WAIT_BRAND':
      return { item: { ...base, overallStatus: 'SUBMITTED', brandApprovalStatus: 'BRAND_PENDING', brandApprovedAt: undefined, brandApprovedBy: undefined } };
    case 'NEGOTIATING':
      return {
        item: {
          ...base,
          overallStatus: 'SUBMITTED',
          brandApprovalStatus: 'BRAND_APPROVED',
          brandApprovedAt: item.brandApprovedAt || now,
          brandApprovedBy: item.brandApprovedBy || actor,
          kocNegotiationStatus: item.kocNegotiationStatus === 'TERMS_AGREED' ? 'CONTACTING' : item.kocNegotiationStatus === 'NOT_CONTACTED' ? 'CONTACTING' : item.kocNegotiationStatus,
        },
      };
    case 'CONFIRMED':
      return {
        item: {
          ...base,
          overallStatus: 'FINAL_APPROVED',
          brandApprovalStatus: 'BRAND_APPROVED',
          kocNegotiationStatus: 'TERMS_AGREED',
          finalFee: item.finalFee ?? item.proposedFee,
          negotiatedAt: now,
        },
      };
    case 'DROPPED':
      if (!reason || !reason.trim()) return { error: 'Cần ghi lý do khi cho rớt.' };
      return { item: { ...base, overallStatus: 'DROPPED', dropReason: reason.trim() } };
  }
}

// ---------------------------------------------------------------------------------------------
// Chỉ tiêu và tiến độ
// ---------------------------------------------------------------------------------------------

export type QuotaKey = KlCode | 'FOC';

export interface QuotaLine {
  key: QuotaKey;
  label: string;
  requiredQty: number;
  requiredBudget: number;
}

/** Chỉ tiêu cần list lấy từ bảng phân rã đã duyệt (items của kế hoạch). */
export function planQuota(plan: InputPlanBreakdownState): QuotaLine[] {
  const lines: QuotaLine[] = KL_TIERS.map(t => ({ key: t.code, label: t.label, requiredQty: 0, requiredBudget: 0 }));
  const foc: QuotaLine = { key: 'FOC', label: 'FOC (0đ)', requiredQty: 0, requiredBudget: 0 };
  for (const it of plan.items || []) {
    if (it.category !== 'KOC_TIER') continue;
    if (it.tierCode === 'TAP UpAffiliate') {
      foc.requiredQty += it.qty || 0;
      continue;
    }
    const line = lines.find(l => l.key === it.tierCode);
    if (line) {
      line.requiredQty += it.qty || 0;
      line.requiredBudget += it.totalBudget || 0;
    }
  }
  return [...lines.filter(l => l.requiredQty > 0 || l.requiredBudget > 0), ...(foc.requiredQty > 0 ? [foc] : [])];
}

export interface TierProgress extends QuotaLine {
  listed: number; // không tính rớt
  waitBrand: number;
  negotiating: number;
  confirmed: number;
  dropped: number;
  committedBudget: number; // tổng giá của KOC chưa rớt
  confirmedBudget: number;
  gap: number; // còn thiếu so với chỉ tiêu
  extra: number; // dư so với chỉ tiêu
  budgetLeft: number;
}

const quotaKeyOfItem = (item: KocListingItem): QuotaKey => {
  const g = itemGrade(item);
  return g === 'TAP UpAffiliate' ? 'FOC' : g;
};

export function computeProgress(plan: InputPlanBreakdownState, items: KocListingItem[]): { tiers: TierProgress[]; total: TierProgress } {
  const quota = planQuota(plan);
  const keys = new Set<QuotaKey>(quota.map(q => q.key));
  // KOC được list ở bậc không có trong chỉ tiêu vẫn phải hiện để người dùng thấy
  for (const it of items) keys.add(quotaKeyOfItem(it));
  const order: QuotaKey[] = [...KL_TIERS.map(t => t.code as QuotaKey), 'FOC'];
  const tiers: TierProgress[] = order
    .filter(k => keys.has(k))
    .map(k => {
      const q = quota.find(x => x.key === k);
      const mine = items.filter(i => quotaKeyOfItem(i) === k);
      const alive = mine.filter(i => columnOf(i) !== 'DROPPED');
      const count = (col: BoardColumn) => mine.filter(i => columnOf(i) === col).length;
      const committed = alive.reduce((s, i) => s + itemFee(i), 0);
      const confirmed = mine.filter(i => columnOf(i) === 'CONFIRMED');
      const requiredQty = q?.requiredQty ?? 0;
      const requiredBudget = q?.requiredBudget ?? 0;
      return {
        key: k,
        label: q?.label ?? (k === 'FOC' ? 'FOC (0đ)' : klLabel(k)),
        requiredQty,
        requiredBudget,
        listed: alive.length,
        waitBrand: count('WAIT_BRAND'),
        negotiating: count('NEGOTIATING'),
        confirmed: confirmed.length,
        dropped: count('DROPPED'),
        committedBudget: committed,
        confirmedBudget: confirmed.reduce((s, i) => s + itemFee(i), 0),
        gap: Math.max(0, requiredQty - alive.length),
        extra: Math.max(0, alive.length - requiredQty),
        budgetLeft: requiredBudget - committed,
      };
    });
  const sum = (f: (t: TierProgress) => number) => tiers.reduce((s, t) => s + f(t), 0);
  const total: TierProgress = {
    key: 'FOC',
    label: 'Tổng',
    requiredQty: sum(t => t.requiredQty),
    requiredBudget: sum(t => t.requiredBudget),
    listed: sum(t => t.listed),
    waitBrand: sum(t => t.waitBrand),
    negotiating: sum(t => t.negotiating),
    confirmed: sum(t => t.confirmed),
    dropped: sum(t => t.dropped),
    committedBudget: sum(t => t.committedBudget),
    confirmedBudget: sum(t => t.confirmedBudget),
    gap: sum(t => t.gap),
    extra: sum(t => t.extra),
    budgetLeft: sum(t => t.requiredBudget) - sum(t => t.committedBudget),
  };
  return { tiers, total };
}

export type BoardAlertSeverity = 'critical' | 'warning' | 'info';

export interface BoardAlert {
  severity: BoardAlertSeverity;
  message: string;
  tier?: QuotaKey;
  itemId?: string;
}

const fmt = (v: number) => Math.round(v).toLocaleString('vi-VN');

export function computeAlerts(plan: InputPlanBreakdownState, items: KocListingItem[]): BoardAlert[] {
  const alerts: BoardAlert[] = [];
  const { tiers, total } = computeProgress(plan, items);

  for (const t of tiers) {
    if (t.requiredBudget > 0 && t.committedBudget > t.requiredBudget) {
      alerts.push({ severity: 'critical', tier: t.key, message: `${t.key} vượt ngân sách ${fmt(t.committedBudget - t.requiredBudget)}đ (cam kết ${fmt(t.committedBudget)}đ trên ${fmt(t.requiredBudget)}đ)` });
    }
    if (t.requiredQty === 0 && t.listed > 0) {
      alerts.push({ severity: 'warning', tier: t.key, message: `${t.key} không có chỉ tiêu trong kế hoạch nhưng đã list ${t.listed} KOC` });
    } else if (t.gap > 0) {
      alerts.push({ severity: 'info', tier: t.key, message: `${t.key} còn thiếu ${t.gap} KOC` });
    }
  }
  if (total.requiredBudget > 0 && total.committedBudget > total.requiredBudget) {
    alerts.unshift({ severity: 'critical', message: `Tổng cam kết vượt ngân sách Net ${fmt(total.committedBudget - total.requiredBudget)}đ` });
  }

  const seen = new Map<string, number>();
  for (const it of items) {
    if (columnOf(it) === 'DROPPED') continue;
    const handle = (it.kocHandle || '').replace(/^@/, '').toLowerCase();
    if (handle) seen.set(handle, (seen.get(handle) || 0) + 1);
    const grade = itemGrade(it);
    const fee = itemFee(it);
    if (grade !== 'TAP UpAffiliate') {
      const range = klTier(grade as KlCode);
      if (fee <= 0) {
        alerts.push({ severity: 'warning', itemId: it.id, message: `@${handle || it.kocName}: chưa có giá net` });
      } else if (fee < range.min || (range.max !== null && fee > range.max)) {
        alerts.push({ severity: 'warning', itemId: it.id, message: `@${handle || it.kocName}: giá ${fmt(fee)}đ ngoài khoảng ${grade}` });
      }
    }
  }
  seen.forEach((n, h) => {
    if (n > 1) alerts.push({ severity: 'warning', message: `@${h} xuất hiện ${n} lần trong kế hoạch này` });
  });
  const order: Record<BoardAlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}

// ---------------------------------------------------------------------------------------------
// Tạo mục listing
// ---------------------------------------------------------------------------------------------

const BATCH_CYCLES: ListingBatchCycle[] = ['BATCH_10', 'BATCH_20', 'BATCH_30'];

const tierFromFollowers = (followers: number): KocListingItem['tier'] =>
  followers >= 1_000_000 ? 'CELEB' : followers >= 500_000 ? 'MEGA' : followers >= 100_000 ? 'MACRO' : followers >= 10_000 ? 'MICRO' : 'NANO';

export interface NewListingInput {
  plan: InputPlanBreakdownState;
  grade: KlCode | 'TAP UpAffiliate';
  handle: string;
  koc?: KocItem;
  fee?: number;
  followers?: number;
  kocName?: string;
  actorId: string;
  actorName: string;
  batchCycle?: ListingBatchCycle;
}

export function createListingItem(input: NewListingInput): KocListingItem {
  const { plan, grade, koc, actorId, actorName } = input;
  const handle = input.handle.replace(/^@/, '').trim();
  const now = new Date().toISOString();
  const fee = input.fee ?? (grade === 'TAP UpAffiliate' ? 0 : koc?.rateCardVideo && koc.rateCardVideo > 0 ? koc.rateCardVideo : klBaseCost(grade as KlCode));
  const followers = koc?.followers ?? input.followers ?? 0;
  const cycle = input.batchCycle ?? BATCH_CYCLES[0];
  const stamp = Date.now().toString(36);
  return {
    id: `LB-${plan.id}-${handle.toLowerCase()}-${stamp}`,
    batchId: `BATCH-${plan.month.replace('/', '')}-${cycle.replace('BATCH_', 'B')}`,
    batchCycle: cycle,
    monthKey: plan.month,
    storeId: plan.storeId || '',
    storeName: plan.storeName || plan.title,
    brandName: plan.brandName,
    sourcePlanId: plan.id,
    sourcePlanVersion: plan.currentVersionCode || 'v1.0',
    salaryGrade: grade as SalaryGrade,
    kocId: koc?.id || `KOC-${handle.toLowerCase()}`,
    kocName: koc?.stageName || input.kocName || handle,
    kocHandle: `@${handle}`,
    channel: 'TikTok Shop',
    followersCount: followers,
    tier: tierFromFollowers(followers),
    niche: koc?.niche || '',
    videoFormat: 'Review trực tiếp',
    pillarName: '',
    proposedFee: fee,
    brandApprovalStatus: 'BRAND_PENDING',
    kocNegotiationStatus: 'NOT_CONTACTED',
    overallStatus: 'DRAFT',
    assignedStaffId: actorId,
    assignedStaffName: actorName,
    createdAt: now,
    updatedAt: now,
  };
}

/** Tách danh sách dán vào: mỗi dòng "idkenh" hoặc "idkenh; giá" (giá có thể ghi 1.500.000 hoặc 1500k). */
export function parsePastedKocs(text: string): { handle: string; fee?: number }[] {
  const out: { handle: string; fee?: number }[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const [first, second] = line.split(/[;\t,|]+/).map(s => s.trim());
    const handle = (first || '').replace(/^https?:\/\/(www\.)?tiktok\.com\/@/i, '').replace(/^@/, '').replace(/[/?#].*$/, '');
    if (!handle) continue;
    let fee: number | undefined;
    if (second) {
      const m = second.toLowerCase().replace(/\s/g, '').match(/^([\d.,]+)(k|tr|m)?$/);
      if (m) {
        let n = parseFloat(m[1].replace(/\./g, '').replace(/,/g, '.'));
        if (m[2] === 'k') n *= 1000;
        else if (m[2] === 'tr' || m[2] === 'm') n *= 1_000_000;
        fee = Math.round(n);
      }
    }
    out.push({ handle, fee });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Xuất file đúng cột bảng 3.1 Listing KOCs
// ---------------------------------------------------------------------------------------------

export const LARK_31_COLUMNS = [
  'ID kênh',
  'Ngày điền',
  'Đợt',
  'Brand duyệt',
  'Ngày Brand duyệt',
  'Trạng thái KOC',
  'Content note',
  'Giá net video',
  'KL',
  'Tháng',
  'Nhân sự điền',
  'Store',
  'Link kênh',
  'Follower',
  'Lý do Brand từ chối',
] as const;

const cycleToDot = (c: ListingBatchCycle) => (c === 'BATCH_10' ? 'Đợt 1' : c === 'BATCH_20' ? 'Đợt 2' : 'Đợt 3');

export function toLark31Rows(items: KocListingItem[]): (string | number)[][] {
  return items.map(it => {
    const handle = (it.kocHandle || '').replace(/^@/, '');
    const col = columnOf(it);
    const grade = itemGrade(it);
    const brand = it.brandApprovalStatus === 'BRAND_APPROVED' ? 'Yes' : it.brandApprovalStatus === 'BRAND_REJECTED' ? 'No' : '';
    const koc = it.kocNegotiationStatus === 'TERMS_AGREED' ? 'Yes' : it.kocNegotiationStatus === 'NEGOTIATION_FAILED' ? 'No' : it.kocNegotiationStatus === 'CONTACTING' ? 'Contact' : '';
    return [
      handle,
      it.createdAt ? it.createdAt.slice(0, 10) : '',
      cycleToDot(it.batchCycle),
      brand,
      it.brandApprovedAt ? it.brandApprovedAt.slice(0, 10) : '',
      koc,
      it.negotiationNote || '',
      itemFee(it),
      grade === 'TAP UpAffiliate' ? 'TAP UpAffiliate' : grade,
      it.monthKey,
      it.assignedStaffName,
      it.storeName,
      handle ? `https://www.tiktok.com/@${handle}` : '',
      it.followersCount || 0,
      col === 'DROPPED' ? it.dropReason || it.brandFeedbackNote || '' : '',
    ];
  });
}

// ---------------------------------------------------------------------------------------------
// Kết quả Brand duyệt đọc từ Google Sheet
// ---------------------------------------------------------------------------------------------

export type BrandDecision = 'APPROVED' | 'REJECTED' | 'CONSIDER' | 'NONE';

/** Đọc ô "Brand duyệt" theo quy ước bảng 3.1: Yes, No, Cân nhắc; để trống là chưa trả lời. */
export function parseBrandDecision(raw: string | undefined): BrandDecision {
  const v = (raw || '').trim().toLowerCase();
  if (!v) return 'NONE';
  if (['yes', 'y', 'duyệt', 'đã duyệt', 'ok'].includes(v)) return 'APPROVED';
  if (['no', 'n', 'từ chối', 'không'].includes(v)) return 'REJECTED';
  if (v.includes('cân nhắc') || v.includes('can nhac') || v === 'maybe') return 'CONSIDER';
  return 'NONE';
}

export interface BrandDecisionResult {
  item: KocListingItem;
  /** Trạng thái thật sự thay đổi (không tính việc ghi nhớ giá trị đã đọc). */
  changed: boolean;
  /** KOC từng bị Brand từ chối nay được duyệt lại. */
  restored: boolean;
}

/**
 * Áp kết quả Brand duyệt đọc từ Google Sheet.
 * Chỉ áp khi giá trị trên sheet ĐỔI so với lần đọc trước, nên không ghi đè thao tác tay của nhân viên:
 * nhân viên đã đưa KOC bị No về lại trong app thì lần đọc sau (sheet vẫn No) không cho rớt lại.
 * Brand đổi No thành Yes (nhân viên bảo vệ được KOC): khôi phục KOC rồi chuyển sang Thương lượng.
 */
export function applyBrandDecision(item: KocListingItem, decision: BrandDecision, opts: { reason?: string; note?: string; actor: string }): BrandDecisionResult {
  const { reason, note, actor } = opts;
  const prev: BrandDecision = item.lastSheetDecision ?? 'NONE';
  if (decision === prev) return { item, changed: false, restored: false };

  const now = new Date().toISOString();
  let next: KocListingItem = item;
  let changed = false;
  let restored = false;
  const col = columnOf(item);

  if (decision === 'APPROVED') {
    if (col === 'DROPPED') {
      // Brand đổi ý sau khi từ chối: khôi phục từng bước hợp lệ
      next = moveItem(next, 'DRAFT', actor).item || next;
      next = moveItem(next, 'WAIT_BRAND', actor).item || next;
      next = { ...next, brandFeedbackNote: 'Brand đã duyệt lại sau khi từ chối' };
      restored = true;
    } else if (col === 'DRAFT') {
      next = moveItem(next, 'WAIT_BRAND', actor).item || next;
    }
    if (columnOf(next) === 'WAIT_BRAND') next = moveItem(next, 'NEGOTIATING', actor).item || next;
    changed = next !== item;
  } else if (decision === 'REJECTED') {
    if (col !== 'DROPPED' && col !== 'CONFIRMED') {
      const dropped = moveItem(next, 'DROPPED', actor, reason || 'Brand từ chối').item;
      if (dropped) {
        next = { ...dropped, brandApprovalStatus: 'BRAND_REJECTED' };
        changed = true;
      }
    }
  } else if (decision === 'CONSIDER') {
    next = { ...next, brandFeedbackNote: `Brand cân nhắc${note ? `: ${note}` : ''}`, updatedAt: now };
    changed = true;
  }
  if (note && decision !== 'CONSIDER' && decision !== 'NONE' && next.brandFeedbackNote !== note && !restored) {
    next = { ...next, brandFeedbackNote: note };
  }
  // Luôn ghi nhớ giá trị sheet đã đọc để lần sau chỉ xử lý khi có thay đổi
  next = { ...next, lastSheetDecision: decision, lastSheetDecisionAt: now };
  return { item: next, changed, restored };
}