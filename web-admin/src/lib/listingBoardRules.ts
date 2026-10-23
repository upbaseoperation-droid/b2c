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
      return {
        item: {
          ...base,
          overallStatus: 'SUBMITTED',
          brandApprovalStatus: 'BRAND_PENDING',
          sentToBrandAt: item.sentToBrandAt || now,
          brandApprovedAt: undefined,
          brandApprovedBy: undefined,
          brandDecidedAt: undefined,
        },
      };
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
// Tạo mục listing & Theo dõi 3 Đợt Listing (Ngày 10: 60% — Ngày 20: 30% — Ngày 30: 10%)
// ---------------------------------------------------------------------------------------------

export const BATCH_CYCLES: ListingBatchCycle[] = ['BATCH_10', 'BATCH_20', 'BATCH_30'];

export interface BatchCycleSpec {
  key: ListingBatchCycle;
  label: string;
  shortLabel: string;
  dueDayOfMonth: 10 | 20 | 30;
  ratio: number; // 0.6 | 0.3 | 0.1
  priorityNote: string;
}

export const BATCH_CYCLE_SPECS: BatchCycleSpec[] = [
  {
    key: 'BATCH_10',
    label: 'Đợt 1 · Hạn ngày 10 (60% chỉ tiêu)',
    shortLabel: 'Đợt 1 (Ngày 10 · 60%)',
    dueDayOfMonth: 10,
    ratio: 0.6,
    priorityNote: 'Ít nhất 60% số lượng & ngân sách, ưu tiên KL cao nhất (KL7 → KL3) về thấp',
  },
  {
    key: 'BATCH_20',
    label: 'Đợt 2 · Hạn ngày 20 (30% chỉ tiêu)',
    shortLabel: 'Đợt 2 (Ngày 20 · 30%)',
    dueDayOfMonth: 20,
    ratio: 0.3,
    priorityNote: '30% số lượng & ngân sách tiếp theo + bù các kênh rớt Đợt 1',
  },
  {
    key: 'BATCH_30',
    label: 'Đợt 3 · Hạn ngày 30 (10% chỉ tiêu)',
    shortLabel: 'Đợt 3 (Ngày 30 · 10%)',
    dueDayOfMonth: 30,
    ratio: 0.1,
    priorityNote: '10% số lượng & ngân sách còn lại + chốt bù toàn bộ phát sinh trong tháng',
  },
];

export interface BatchCycleProgress extends BatchCycleSpec {
  targetQty: number;
  targetBudget: number;
  listedQty: number;
  confirmedQty: number;
  committedBudget: number;
  highKlListedCount: number; // KL3-KL7
}

export function computeBatchProgress(plan: InputPlanBreakdownState, items: KocListingItem[]): BatchCycleProgress[] {
  const { total } = computeProgress(plan, items);
  const q1 = Math.ceil(total.requiredQty * 0.6);
  const q2 = Math.ceil(total.requiredQty * 0.3);
  const q3 = Math.max(0, total.requiredQty - q1 - q2);

  const b1 = Math.round(total.requiredBudget * 0.6);
  const b2 = Math.round(total.requiredBudget * 0.3);
  const b3 = Math.max(0, total.requiredBudget - b1 - b2);

  const targets: Record<ListingBatchCycle, { qty: number; budget: number }> = {
    BATCH_10: { qty: q1, budget: b1 },
    BATCH_20: { qty: q2, budget: b2 },
    BATCH_30: { qty: q3, budget: b3 },
  };

  return BATCH_CYCLE_SPECS.map(spec => {
    const batchItems = items.filter(i => (i.batchCycle || 'BATCH_10') === spec.key && columnOf(i) !== 'DROPPED');
    const confirmedItems = batchItems.filter(i => columnOf(i) === 'CONFIRMED');
    const committedBudget = batchItems.reduce((s, i) => s + itemFee(i), 0);
    const highKlListedCount = batchItems.filter(i => {
      const g = itemGrade(i);
      return ['KL3', 'KL4', 'KL5', 'KL6', 'KL7'].includes(g);
    }).length;

    return {
      ...spec,
      targetQty: targets[spec.key].qty,
      targetBudget: targets[spec.key].budget,
      listedQty: batchItems.length,
      confirmedQty: confirmedItems.length,
      committedBudget,
      highKlListedCount,
    };
  });
}

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
    next = {
      ...next,
      brandApprovalStatus: 'BRAND_APPROVED',
      brandApprovedAt: next.brandApprovedAt || now,
      brandApprovedBy: next.brandApprovedBy || actor,
      brandDecidedAt: next.brandDecidedAt || now,
    };
    changed = next !== item;
  } else if (decision === 'REJECTED') {
    if (col !== 'DROPPED' && col !== 'CONFIRMED') {
      const dropped = moveItem(next, 'DROPPED', actor, reason || 'Brand từ chối').item;
      if (dropped) {
        next = { ...dropped, brandApprovalStatus: 'BRAND_REJECTED', brandDecidedAt: now };
        changed = true;
      }
    }
  } else if (decision === 'CONSIDER') {
    next = { ...next, brandFeedbackNote: `Brand cân nhắc${note ? `: ${note}` : ''}`, brandDecidedAt: now, updatedAt: now };
    changed = true;
  }
  if (note && decision !== 'CONSIDER' && decision !== 'NONE' && next.brandFeedbackNote !== note && !restored) {
    next = { ...next, brandFeedbackNote: note };
  }
  // Luôn ghi nhớ giá trị sheet đã đọc để lần sau chỉ xử lý khi có thay đổi
  next = { ...next, lastSheetDecision: decision, lastSheetDecisionAt: now };
  return { item: next, changed, restored };
}

// ---------------------------------------------------------------------------------------------
// Đo lường SLA Brand duyệt
// ---------------------------------------------------------------------------------------------

export interface BrandSlaSummary {
  totalPending: number;
  pendingOverdue: number;
  pendingOnTime: number;
  totalDecided: number;
  decidedOnTime: number;
  decidedOverdue: number;
  onTimeRatePct: number;
  avgResponseHours: number;
  overdueHandles: string[];
}

export function computeBrandSlaMetrics(items: KocListingItem[], thresholdHours = 48): BrandSlaSummary {
  const now = Date.now();
  let totalPending = 0;
  let pendingOverdue = 0;
  let pendingOnTime = 0;
  let totalDecided = 0;
  let decidedOnTime = 0;
  let decidedOverdue = 0;
  let totalDurationHours = 0;
  const overdueHandles: string[] = [];

  for (const it of items) {
    if (it.overallStatus === 'DROPPED' && it.brandApprovalStatus !== 'BRAND_REJECTED') continue;
    const sentTime = it.sentToBrandAt ? new Date(it.sentToBrandAt).getTime() : (it.createdAt ? new Date(it.createdAt).getTime() : 0);
    const isPending = it.overallStatus === 'SUBMITTED' && it.brandApprovalStatus === 'BRAND_PENDING';
    const isDecided = it.brandApprovalStatus === 'BRAND_APPROVED' || it.brandApprovalStatus === 'BRAND_REJECTED' || it.lastSheetDecision === 'APPROVED' || it.lastSheetDecision === 'REJECTED';

    if (isPending) {
      totalPending++;
      const elapsedHours = sentTime ? (now - sentTime) / (1000 * 3600) : 0;
      if (elapsedHours > thresholdHours) {
        pendingOverdue++;
        if (it.kocHandle) overdueHandles.push(it.kocHandle);
      } else {
        pendingOnTime++;
      }
    } else if (isDecided && sentTime) {
      totalDecided++;
      const decidedTime = it.brandDecidedAt ? new Date(it.brandDecidedAt).getTime() : (it.brandApprovedAt ? new Date(it.brandApprovedAt).getTime() : (it.lastSheetDecisionAt ? new Date(it.lastSheetDecisionAt).getTime() : (it.updatedAt ? new Date(it.updatedAt).getTime() : now)));
      const durationHours = Math.max(0, (decidedTime - sentTime) / (1000 * 3600));
      totalDurationHours += durationHours;
      if (durationHours <= thresholdHours) {
        decidedOnTime++;
      } else {
        decidedOverdue++;
      }
    }
  }

  const onTimeRatePct = totalDecided > 0 ? Math.round((decidedOnTime / totalDecided) * 100) : (totalPending > 0 ? Math.round((pendingOnTime / totalPending) * 100) : 100);
  const avgResponseHours = totalDecided > 0 ? Math.round((totalDurationHours / totalDecided) * 10) / 10 : 0;

  return {
    totalPending,
    pendingOverdue,
    pendingOnTime,
    totalDecided,
    decidedOnTime,
    decidedOverdue,
    onTimeRatePct,
    avgResponseHours,
    overdueHandles,
  };
}

export function getItemSlaBadge(item: KocListingItem, thresholdHours = 48): {
  label: string;
  variant: 'success' | 'warning' | 'critical' | 'neutral';
  hours: number;
  isOverdue: boolean;
} | null {
  const sentTime = item.sentToBrandAt ? new Date(item.sentToBrandAt).getTime() : (item.createdAt ? new Date(item.createdAt).getTime() : 0);
  if (!sentTime || isNaN(sentTime)) return null;

  const isPending = item.overallStatus === 'SUBMITTED' && item.brandApprovalStatus === 'BRAND_PENDING';
  const isDecided = item.brandApprovalStatus === 'BRAND_APPROVED' || item.brandApprovalStatus === 'BRAND_REJECTED' || item.lastSheetDecision === 'APPROVED' || item.lastSheetDecision === 'REJECTED';

  if (isPending) {
    const hours = Math.max(0, Math.round((Date.now() - sentTime) / (1000 * 3600)));
    const isOverdue = hours > thresholdHours;
    return {
      label: isOverdue ? `Chờ ${hours}h (Quá hạn SLA)` : `Chờ ${hours}h`,
      variant: isOverdue ? 'critical' : 'warning',
      hours,
      isOverdue,
    };
  }

  if (isDecided) {
    const decidedTime = item.brandDecidedAt ? new Date(item.brandDecidedAt).getTime() : (item.brandApprovedAt ? new Date(item.brandApprovedAt).getTime() : (item.lastSheetDecisionAt ? new Date(item.lastSheetDecisionAt).getTime() : 0));
    if (!decidedTime) return null;
    const hours = Math.max(0, Math.round((decidedTime - sentTime) / (1000 * 3600)));
    const isOverdue = hours > thresholdHours;
    return {
      label: isOverdue ? `Duyệt sau ${hours}h (Trễ SLA)` : `Duyệt sau ${hours}h (Đúng hạn)`,
      variant: isOverdue ? 'warning' : 'success',
      hours,
      isOverdue,
    };
  }

  return null;
}
