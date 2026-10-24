// Logic bảng điều phối listing: đối chiếu số lượng và ngân sách đã list với kế hoạch đã duyệt (bảng 4.1.1),
// chuyển trạng thái, và xuất đúng cột bảng 3.1 Listing KOCs của Lark.
import type { InputPlanBreakdownState, KocItem, KocListingItem, ListingBatchCycle, SalaryGrade } from './types';
import { KL_TIERS, klBaseCost, klFromFee, klLabel, klTier, type KlCode } from './klTiers';

export const LISTABLE_STATUSES = ['LEAD_APPROVED', 'BRAND_APPROVED', 'APPROVED', 'LOCKED', 'IN_EXECUTION', 'COMPLETED'];

/** Kiểm tra kế hoạch đã được Giám đốc duyệt chính thức hay chưa. */
export const isPlanOfficiallyApproved = (plan: InputPlanBreakdownState): boolean =>
  LISTABLE_STATUSES.includes(plan.status || '') || Boolean(plan.isVersionLocked);

/**
 * Cho phép lập nháp Kế hoạch Content & Listing KOC Đợt 1 ngay từ ngày 10..20/T-1
 * kể cả khi Plan 4.1/4.1.1 đang ở trạng thái Nháp hoặc Chờ duyệt (giải quyết nghịch lý thời gian UPA:OI-020).
 */
export const isPlanListable = (plan: InputPlanBreakdownState): boolean =>
  Boolean(plan && plan.id && String(plan.status) !== 'ARCHIVED');

export type BoardColumn = 'DRAFT' | 'WAIT_BRAND' | 'NEGOTIATING' | 'CONFIRMED' | 'DROPPED';

export const BOARD_COLUMNS: { key: BoardColumn; label: string }[] = [
  { key: 'DRAFT', label: 'Nháp (Pipeline 1–4)' },
  { key: 'WAIT_BRAND', label: 'Chờ Brand duyệt (Pipeline 5)' },
  { key: 'NEGOTIATING', label: 'Thương lượng KOC (Pipeline 4/6)' },
  { key: 'CONFIRMED', label: 'Đã chốt Deal (Pipeline 6)' },
  { key: 'DROPPED', label: 'Tạm dừng / Rớt (Pipeline 19)' },
];

const ALLOWED_MOVES: Record<BoardColumn, BoardColumn[]> = {
  DRAFT: ['WAIT_BRAND', 'NEGOTIATING', 'CONFIRMED', 'DROPPED'],
  WAIT_BRAND: ['DRAFT', 'NEGOTIATING', 'CONFIRMED', 'DROPPED'],
  NEGOTIATING: ['WAIT_BRAND', 'CONFIRMED', 'DROPPED'],
  CONFIRMED: ['NEGOTIATING', 'WAIT_BRAND', 'DROPPED'],
  DROPPED: ['DRAFT', 'WAIT_BRAND', 'NEGOTIATING'],
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
      alerts.push({
        severity: 'warning',
        tier: t.key,
        message: `${t.key} dịch chuyển vượt định mức bậc ${fmt(t.committedBudget - t.requiredBudget)}đ (cam kết ${fmt(t.committedBudget)}đ / định mức bậc ${fmt(t.requiredBudget)}đ)`,
      });
    }
    if (t.requiredQty === 0 && t.listed > 0) {
      alerts.push({ severity: 'warning', tier: t.key, message: `${t.key} không có chỉ tiêu trong kế hoạch nhưng đã list ${t.listed} KOC` });
    } else if (t.gap > 0) {
      alerts.push({ severity: 'info', tier: t.key, message: `${t.key} còn thiếu ${t.gap} KOC` });
    }
  }
  const storeNetCap = plan.reference41?.affCostNet && plan.reference41.affCostNet > 0 ? plan.reference41.affCostNet : total.requiredBudget;
  if (storeNetCap > 0 && total.committedBudget > storeNetCap) {
    alerts.unshift({
      severity: 'critical',
      message: `Tổng cam kết toàn gian hàng vượt trần ngân sách Net ${fmt(total.committedBudget - storeNetCap)}đ (cam kết ${fmt(total.committedBudget)}đ / trần Net ${fmt(storeNetCap)}đ)`,
    });
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

// ---------------------------------------------------------------------------------------------
// Động cơ Tự động ghi nhận Pipeline 1 → 6 & 19 (Theo Mục 3.1 Quy trình Booking - Tech.md)
// ---------------------------------------------------------------------------------------------

export type BallInCourtActor = 'B2C' | 'BRAND' | 'KOC' | 'WAREHOUSE' | 'LEGAL_FINANCE' | 'DONE';

export const BALL_IN_COURT_LABEL: Record<BallInCourtActor, string> = {
  B2C: 'B2C đang cầm bóng',
  BRAND: 'Đang chờ Brand / Account',
  KOC: 'Đang chờ KOC phản hồi',
  WAREHOUSE: 'Đang chờ Kho / Vận chuyển',
  LEGAL_FINANCE: 'Đang chờ Pháp chế / Kế toán',
  DONE: 'Đã hoàn tất chặng',
};

export interface ListingPipelineInfo {
  stageNo: 1 | 2 | 3 | 4 | 5 | 6 | 19;
  code: string;
  stageTitle: string;
  detailStatus: string;
  subStatusLabel: string;
  ballInCourt: BallInCourtActor;
  ballLabel: string;
}

/**
 * Tự động suy diễn trạng thái Pipeline (1 → 6 & 19) từ hành động và dữ liệu thực tế của thẻ KOC,
 * không bắt nhân sự phải chọn tay từ 73 trạng thái.
 */
export function computeListingPipelineState(item: KocListingItem): ListingPipelineInfo {
  const col = columnOf(item);
  const mk = (
    stageNo: 1 | 2 | 3 | 4 | 5 | 6 | 19,
    code: string,
    stageTitle: string,
    detailStatus: string,
    ballInCourt: BallInCourtActor,
    ballLabel: string
  ): ListingPipelineInfo => ({
    stageNo,
    code,
    stageTitle,
    detailStatus,
    subStatusLabel: detailStatus,
    ballInCourt,
    ballLabel,
  });

  if (col === 'DROPPED') {
    const detail =
      item.brandApprovalStatus === 'BRAND_REJECTED'
        ? 'Brand từ chối'
        : item.dropReason?.trim() || 'KOC từ chối / Tạm dừng';
    return mk(19, '19.1', '19. Tạm dừng / Không thành công', detail, 'DONE', BALL_IN_COURT_LABEL.DONE);
  }

  if (col === 'CONFIRMED') {
    return mk(6, '6.2', '6. Chốt hợp tác', 'Đã xác nhận Deal', 'DONE', 'Đã chốt — Sẵn sàng chạy Job');
  }

  if (col === 'WAIT_BRAND') {
    const isResubmit = Boolean(item.brandApprovedAt && item.finalFee && item.proposedFee && item.finalFee !== item.proposedFee);
    return mk(
      5,
      isResubmit ? '5.4' : '5.1',
      '5. Chờ duyệt',
      isResubmit ? 'Yêu cầu thay thế/điều chỉnh' : 'Chờ Brand duyệt',
      'BRAND',
      BALL_IN_COURT_LABEL.BRAND
    );
  }

  if (col === 'NEGOTIATING') {
    if (String(item.kocNegotiationStatus) === 'PRICE_NEGOTIATING' || (item.finalFee && item.finalFee > 0 && item.finalFee !== item.proposedFee)) {
      return mk(4, '4.3', '4. Đang thương lượng', 'Đang thương lượng', 'KOC', BALL_IN_COURT_LABEL.KOC);
    }
    if (item.brandApprovalStatus === 'BRAND_APPROVED') {
      return mk(6, '6.1', '6. Chốt hợp tác', 'Brand đã duyệt · Chờ xác nhận Deal', 'B2C', 'B2C liên hệ chốt Deal với KOC');
    }
    return mk(4, '4.1', '4. Đang thương lượng', 'Chờ báo giá', 'KOC', BALL_IN_COURT_LABEL.KOC);
  }

  // Cột DRAFT (Pipeline 1 -> 4 trước khi gửi Brand)
  if (item.kocNegotiationStatus === 'CONTACTING') {
    const updatedHours = item.updatedAt ? (Date.now() - new Date(item.updatedAt).getTime()) / (1000 * 3600) : 0;
    return mk(
      2,
      updatedHours >= 24 ? '2.2' : '2.1',
      '2. Đã liên hệ',
      updatedHours >= 24 ? 'Đang follow-up' : 'Đã gửi lời mời',
      'KOC',
      BALL_IN_COURT_LABEL.KOC
    );
  }
  if (String(item.kocNegotiationStatus) === 'PRICE_NEGOTIATING') {
    return mk(4, '4.2', '4. Đang thương lượng', 'Đã nhận báo giá', 'B2C', BALL_IN_COURT_LABEL.B2C);
  }
  return mk(1, '1.1', '1. Chưa liên hệ', 'Mới thêm vào danh sách', 'B2C', 'B2C chuẩn bị đẩy Sheet / Liên hệ');
}

// ---------------------------------------------------------------------------------------------
// Bộ 21 Lý do KOC từ chối & Phương án xử lý chuẩn (Mục 3.2 Quy trình Booking - Tech.md)
// ---------------------------------------------------------------------------------------------

export interface KocRejectionReasonSpec {
  code: string;
  reason: string;
  label: string;
  group: string;
  pipelineDetail: string;
  followUpQuestion: string;
  negotiationPlaybook: string;
}

const RAW_KOC_REJECTION_REASONS: Omit<KocRejectionReasonSpec, 'label' | 'group'>[] = [
  {
    code: 'FEE_TOO_HIGH',
    reason: 'Chi phí KOC cao hơn ngân sách',
    pipelineDetail: 'Không thống nhất chi phí',
    followUpQuestion: 'Báo giá đã gồm những quyền lợi nào? KOC có thể linh hoạt ở mức nào?',
    negotiationPlaybook: 'Giảm phạm vi reup/mã ads/độc quyền; chuyển từ video riêng sang video ghép; đề xuất gói nhiều video; tăng commission để giảm phí cố định.',
  },
  {
    code: 'NEW_PRODUCT_NO_SALES',
    reason: 'Sản phẩm quá mới, chưa có lượt bán',
    pipelineDetail: 'KOC từ chối',
    followUpQuestion: 'KOC lo khó ra đơn, ảnh hưởng GMV hay chưa tin chất lượng sản phẩm?',
    negotiationPlaybook: 'Cung cấp thông tin thương hiệu, KOL đồng hành, ngân sách truyền thông, ưu đãi kéo traffic; đề xuất trải nghiệm trước; kết hợp phí hỗ trợ hoặc commission cao giai đoạn đầu.',
  },
  {
    code: 'UNKNOWN_BRAND',
    reason: 'Sản phẩm chưa có thương hiệu',
    pipelineDetail: 'KOC từ chối',
    followUpQuestion: 'KOC chưa biết Brand hay lo ảnh hưởng uy tín kênh?',
    negotiationPlaybook: 'Gửi hồ sơ Brand, giấy tờ công bố sản phẩm, điểm khác biệt, review thực tế; cho phép KOC kiểm tra sản phẩm trước khi nhận Deal.',
  },
  {
    code: 'LOW_COMMISSION',
    reason: 'Commission thấp',
    pipelineDetail: 'Không thống nhất chi phí',
    followUpQuestion: 'Mức commission kỳ vọng là bao nhiêu? So với sản phẩm nào?',
    negotiationPlaybook: 'Đề xuất commission riêng (link chỉ định); commission theo bậc GMV; thưởng nóng theo mốc đơn; thêm voucher riêng cho kênh.',
  },
  {
    code: 'HIGH_PRODUCT_PRICE',
    reason: 'Giá sản phẩm khó bán',
    pipelineDetail: 'Không phù hợp',
    followUpQuestion: 'KOC thấy giá cao so với ngành hàng hay không phù hợp tệp follower?',
    negotiationPlaybook: 'Bổ sung voucher, combo, quà tặng; chọn SKU phễu dễ vào hơn; đề xuất nội dung so sánh giá trị thay vì chỉ nói giá.',
  },
  {
    code: 'CHANNEL_MISMATCH',
    reason: 'Sản phẩm không phù hợp kênh',
    pipelineDetail: 'Không phù hợp',
    followUpQuestion: 'Không phù hợp về ngành hàng, tệp người xem hay hình ảnh cá nhân?',
    negotiationPlaybook: 'Đổi SKU hoặc góc nội dung; đề xuất format phù hợp với kênh; nếu lệch hoàn toàn thì không ép Deal.',
  },
  {
    code: 'DOUBT_CONVERSION',
    reason: 'KOC không tin sản phẩm có khả năng ra đơn',
    pipelineDetail: 'KOC từ chối',
    followUpQuestion: 'KOC dựa trên dữ liệu nào: lượt bán, review, giá hay landing page?',
    negotiationPlaybook: 'Cung cấp GMV, CR, case KOC tương đồng đã ra đơn; chạy thử 1 video trước khi mở rộng.',
  },
  {
    code: 'REPUTATION_CONCERN',
    reason: 'Sợ sản phẩm ảnh hưởng uy tín kênh',
    pipelineDetail: 'KOC từ chối',
    followUpQuestion: 'Lo về chất lượng, claim, nguồn gốc hay phản hồi tiêu cực?',
    negotiationPlaybook: 'Gửi giấy tờ thành phần, hướng dẫn claim chuẩn; cho trải nghiệm trước; cam kết không bắt KOC nói trái trải nghiệm thật.',
  },
  {
    code: 'COMPETITOR_EXCLUSIVITY',
    reason: 'Đã nhận booking của đối thủ',
    pipelineDetail: 'Không phù hợp lịch',
    followUpQuestion: 'Có điều khoản độc quyền không? Thời hạn bao lâu?',
    negotiationPlaybook: 'Lùi lịch đăng sang sau kỳ độc quyền; chọn SKU không cạnh tranh trực tiếp.',
  },
  {
    code: 'NO_FOC_ACCEPTANCE',
    reason: 'Không muốn nhận hàng mẫu/FOC',
    pipelineDetail: 'Không thống nhất chi phí',
    followUpQuestion: 'KOC chỉ nhận trả phí hay lo sản phẩm khó bán?',
    negotiationPlaybook: 'Chuyển sang hỗ trợ phí sản xuất nhỏ + commission cao; hoặc chuyển sang tệp KOC phù hợp FOC.',
  },
  {
    code: 'NO_TIME_TO_PRODUCE',
    reason: 'Không có thời gian sản xuất',
    pipelineDetail: 'Không phù hợp lịch',
    followUpQuestion: 'KOC bận trong khoảng nào? Có thể nhận lịch tuần sau không?',
    negotiationPlaybook: 'Lùi deadline sang tuần kế tiếp; cung cấp brief ngắn và tài nguyên sẵn; chuyển sang gắn sản phẩm trong nội dung có sẵn.',
  },
  {
    code: 'TIGHT_DEADLINE',
    reason: 'Deadline quá gấp',
    pipelineDetail: 'Không phù hợp lịch',
    followUpQuestion: 'Mốc sớm nhất KOC có thể hoàn thành là khi nào?',
    negotiationPlaybook: 'Điều chỉnh lịch; ưu tiên 1 đầu ra trước; dùng KOC backup nếu mốc Sale Day không thể lùi.',
  },
  {
    code: 'BRIEF_TOO_COMPLEX',
    reason: 'Brief quá khó hoặc quá nhiều yêu cầu',
    pipelineDetail: 'KOC từ chối',
    followUpQuestion: 'Phần nào trong Brief khiến KOC khó thực hiện?',
    negotiationPlaybook: 'Giảm key message chỉ giữ USP bắt buộc; cho KOC sáng tạo theo ngôn ngữ riêng của kênh.',
  },
  {
    code: 'NO_MULTIPLE_REVISIONS',
    reason: 'Không muốn chỉnh sửa nhiều vòng',
    pipelineDetail: 'KOC từ chối',
    followUpQuestion: 'KOC chấp nhận tối đa bao nhiêu vòng sửa?',
    negotiationPlaybook: 'Chốt rõ tối đa 1–2 vòng sửa; Brand duyệt kịch bản chữ trước khi quay; gom feedback 1 lần duy nhất.',
  },
  {
    code: 'NO_IMAGE_USAGE_RIGHTS',
    reason: 'Không đồng ý quyền sử dụng hình ảnh / Reup',
    pipelineDetail: 'KOC từ chối',
    followUpQuestion: 'KOC ngại reup, chạy ads hay thời hạn sử dụng quá dài?',
    negotiationPlaybook: 'Giới hạn thời hạn (30–90 ngày) và nền tảng sử dụng; hoặc tách quyền sử dụng báo giá riêng.',
  },
  {
    code: 'NO_ADS_CODE',
    reason: 'Không muốn cung cấp mã quảng cáo (Spark Ads)',
    pipelineDetail: 'KOC từ chối',
    followUpQuestion: 'Lo ảnh hưởng kênh hay chưa thống nhất phí cấp mã?',
    negotiationPlaybook: 'Làm rõ thời hạn chạy (30 ngày), trả thêm phí mã Ads, cam kết không chỉnh sửa nội dung gốc.',
  },
  {
    code: 'CONTRACT_TAX_DISPUTE',
    reason: 'Không đồng ý điều khoản hợp đồng / thuế / thanh toán',
    pipelineDetail: 'Hủy trước khi ký',
    followUpQuestion: 'Vướng ở tạm ứng, thời hạn thanh toán, khấu trừ thuế TNCN 10% hay chủ thể ký?',
    negotiationPlaybook: 'Giải thích rõ quy định thuế (Cá nhân TNCN 10% / HKD / Công ty VAT); hỗ trợ tạm ứng nếu đủ điều kiện; chuyển Pháp chế/Kế toán xử lý.',
  },
  {
    code: 'BAD_PAST_EXPERIENCE',
    reason: 'Từng có trải nghiệm không tốt với Brand/Agency',
    pipelineDetail: 'KOC từ chối',
    followUpQuestion: 'Vấn đề trước đây là duyệt chậm, thanh toán trễ hay sửa nhiều lần?',
    negotiationPlaybook: 'Cam kết SLA cụ thể và người phụ trách trực tiếp; xử lý dứt điểm tồn đọng cũ trước.',
  },
  {
    code: 'NO_RESPONSE',
    reason: 'KOC không phản hồi sau 2–3 lần liên hệ',
    pipelineDetail: 'Không phản hồi',
    followUpQuestion: 'Đã liên hệ qua cả Zalo, Email và kênh quản lý MCN chưa?',
    negotiationPlaybook: 'Follow-up tối đa 2–3 lần kèm thông tin deal rõ ràng; sau 48h đóng trạng thái và đẩy KOC dự phòng.',
  },
  {
    code: 'BRAND_REJECTED_DIRECT',
    reason: 'Brand từ chối KOC',
    pipelineDetail: 'Brand từ chối',
    followUpQuestion: 'Brand từ chối vì tệp người xem, hình ảnh hay chi phí?',
    negotiationPlaybook: 'Nếu KOC rất tiềm năng thì dùng dữ liệu GMV/ROI lịch sử để bảo vệ lại với Brand; nếu không phù hợp thì thay thế ngay.',
  },
  {
    code: 'CANCELED_AFTER_SAMPLE',
    reason: 'KOC hủy sau khi đã nhận hàng mẫu / đã ký',
    pipelineDetail: 'Hủy sau khi nhận mẫu',
    followUpQuestion: 'Lý do hủy là bất khả kháng hay vi phạm cam kết?',
    negotiationPlaybook: 'Yêu cầu hoàn trả hàng mẫu/tạm ứng theo điều khoản hợp đồng và thay thế KOC dự phòng vào ô Brief.',
  },
];

export const KOC_REJECTION_REASONS_CATALOG: KocRejectionReasonSpec[] = RAW_KOC_REJECTION_REASONS.map(r => ({
  ...r,
  label: r.reason,
  group: r.pipelineDetail,
}));

// ---------------------------------------------------------------------------------------------
// Mẫu tin nhắn thuyết phục Brand khi KOC tăng giá / đổi lịch (Mục 3.3) & Mở nhóm Zalo (Mục 3.4)
// ---------------------------------------------------------------------------------------------

export function buildBrandPriceChangeMessage(params: {
  templateType?: 1 | 2 | 3;
  brandName?: string;
  kocName?: string;
  kocHandle: string;
  oldFee: number;
  newFee: number;
  reason?: string;
  kpiCommitmentNote?: string;
  historicalGmv?: number;
  historicalRoi?: number;
  avgViews?: number;
  extraPerks?: string;
  replacementInfo?: string;
}): string {
  const tpl = params.templateType || 1;
  const kocDisplay = params.kocName || `@${params.kocHandle.replace(/^@/, '')}`;
  const reasonText = params.reason || params.kpiCommitmentNote || 'cập nhật bảng giá mới của kênh';
  const diff = Math.max(0, params.newFee - params.oldFee);
  const pct = params.oldFee > 0 ? Math.round((diff / params.oldFee) * 100) : 0;
  const oldStr = `${fmt(params.oldFee)}đ`;
  const newStr = `${fmt(params.newFee)}đ`;
  const diffStr = `${fmt(diff)}đ (${pct}%)`;
  const dataStr = [
    params.avgViews ? `view TB ${fmt(params.avgViews)}` : '',
    params.historicalGmv ? `GMV tốt nhất ${fmt(params.historicalGmv)}đ` : '',
    params.historicalRoi ? `ROI lịch sử ${params.historicalRoi.toFixed(1)}x` : '',
  ]
    .filter(Boolean)
    .join(', ') || 'tệp người xem phù hợp cao với ngành hàng';
  const perks = params.extraPerks?.trim() || params.kpiCommitmentNote?.trim() || 'cấp miễn phí mã quảng cáo Spark Ads 30 ngày và giữ link giỏ hàng';

  if (tpl === 1) {
    return `Brand ơi, team cập nhật về KOC ${kocDisplay} (@${params.kocHandle.replace(/^@/, '')}):\n\nKOC điều chỉnh mức phí từ ${oldStr} lên ${newStr}, tăng ${diffStr}. Lý do KOC đưa ra là: ${reasonText}.\n\nTeam đã kiểm tra lại và đánh giá:\n- Mức giá mới vẫn nằm trong mặt bằng của nhóm KOC cùng quy mô và chất lượng nội dung.\n- KOC có chỉ số thực tế tốt: ${dataStr}.\n- Team đã thương lượng để KOC hỗ trợ thêm: ${perks}.\n\nVới tiềm năng chuyển đổi hiện tại, team đề xuất giữ KOC ở mức ${newStr} (phần chênh ${fmt(diff)}đ vẫn cân đối được trong tổng trần ngân sách Net của gian hàng).\nNhờ Brand xác nhận phương án giúp team để giữ lịch KOC ạ.`;
  }
  if (tpl === 2) {
    return `Brand ơi, KOC ${kocDisplay} (@${params.kocHandle.replace(/^@/, '')}) vừa báo điều chỉnh phí từ ${oldStr} lên ${newStr} (tăng ${pct}%).\n\nSau khi đối chiếu, dữ liệu hiện tại (${dataStr}) chưa đủ cơ sở để chấp nhận mức tăng này.\nTeam đề xuất 2 phương án:\n1. Giữ KOC nếu đàm phán chốt về mức ${oldStr} kèm điều kiện hỗ trợ ${perks}.\n2. Thay bằng KOC dự phòng cùng phân khúc (${params.replacementInfo || 'đã có sẵn trong danh sách dự phòng cùng mức giá'}).\n\nKhuyến nghị của team là Phương án 2 nếu KOC không giảm giá trong hôm nay. Nhờ Brand xác nhận giúp team ạ.`;
  }
  return `Brand ơi, team cập nhật thay đổi chi phí của KOC chủ lực ${kocDisplay} (@${params.kocHandle.replace(/^@/, '')}):\n\nMức phí mới là ${newStr} (tăng ${diffStr} so với dự kiến ${oldStr}). Do KOC có dữ liệu nổi bật (${dataStr}) và giữ vai trò quan trọng trong đợt này, để KHÔNG vượt tổng ngân sách tháng, team đề xuất:\n- Giữ KOC ${kocDisplay} ở mức ${newStr} (kèm quyền lợi cộng thêm: ${perks}).\n- Điều chỉnh giảm tương ứng ở nhóm KOC nhỏ để tổng ngân sách Net toàn gian hàng giữ nguyên 100%.\n\nNhờ Brand xác nhận giúp team để khóa lịch sản xuất ạ.`;
}

export function buildZaloGroupDealConfirmMessage(params: {
  brandName: string;
  storeName: string;
  kocName: string;
  kocHandle: string;
  productName: string;
  feeNet?: number;
  finalFee?: number;
  isFoc?: boolean;
  deadline?: string;
  airDate?: string;
  sowSummary?: string;
  briefUrl?: string;
  usp?: string;
  forbiddenClaims?: string;
  cta?: string;
  bookingPic?: string;
  picName?: string;
}): string {
  const effectiveFee = params.finalFee ?? params.feeNet ?? 0;
  const isFoc = params.isFoc ?? effectiveFee <= 0;
  const feeText = isFoc ? '0đ (Hợp tác gửi mẫu FOC + Hoa hồng Affiliate)' : `${fmt(effectiveFee)}đ`;
  const picDisplay = params.bookingPic || params.picName || 'Team Booking B2C';
  const deadlineDisplay = params.deadline || params.airDate || 'Theo lịch tuần đã chốt';
  const sowDisplay = params.sowSummary || '01 Video TikTok gắn giỏ hàng';
  return `Chào bạn ${params.kocName} (@${params.kocHandle.replace(/^@/, '')}), để bảo đảm các bên thống nhất đầy đủ trước khi gửi sản phẩm và tạo hợp đồng, team UpBase (${picDisplay}) gửi lại nội dung xác nhận hợp tác cuối cùng như sau:\n\n1. THÔNG TIN DEAL\n- Thương hiệu / Gian hàng: ${params.brandName} (${params.storeName})\n- Sản phẩm thực hiện: ${params.productName || 'Theo định hướng chương trình'}\n- Hình thức hợp tác: ${isFoc ? 'FOC + Affiliate Commission' : 'Booking Fee + Affiliate Commission'}\n- Đầu ra cam kết: ${sowDisplay}\n- Phí hợp tác: ${feeText}\n\n2. TIMELINE THỰC HIỆN\n- Gửi kịch bản / demo: Trước ngày Air tối thiểu 02–03 ngày\n- Lịch On-air dự kiến: ${deadlineDisplay}\n\n3. YÊU CẦU NỘI DUNG\n- Điểm nhấn USP bắt buộc: ${params.usp || 'Theo Brief đính kèm'}\n- Lưu ý / Từ khóa cấm (Do & Don't): ${params.forbiddenClaims || 'Không nhắc đối thủ, tuân thủ chính sách TikTok Shop'}\n- CTA / Gắn giỏ hàng: ${params.cta || 'Gắn đúng link sản phẩm được cung cấp'}\n- Link Brief chi tiết: ${params.briefUrl || 'Gửi trực tiếp trong nhóm'}\n- Số vòng chỉnh sửa kịch bản/demo: Tối đa 01–02 vòng theo Brief\n\n4. QUYỀN SỬ DỤNG & DUY TRÌ\n- Duy trì video công khai và giữ link giỏ hàng theo thỏa thuận hợp đồng.\n- Cung cấp mã quảng cáo Spark Ads (nếu nằm trong gói thỏa thuận).\n\nNhờ bạn kiểm tra và phản hồi: "Tôi đã đọc, hiểu và đồng ý toàn bộ nội dung hợp tác trên" để team tiến hành gửi sản phẩm mẫu và hoàn tất hợp đồng nhé!`;
}

// ---------------------------------------------------------------------------------------------
// Kiểm tra Trùng KOC trong cùng gian hàng (tháng hiện tại & 30-60 ngày trước) + Cảnh báo Hớ giá
// ---------------------------------------------------------------------------------------------

export interface KocDuplicateAndPriceCheck {
  handle: string;
  matchedKoc?: KocItem;
  isDuplicateInCurrentPlan: boolean;
  duplicateCountInPlan: number;
  recentStoreCoopWarning: string | null;
  lastHistoricalFee: number | null;
  historicalRoi: number | null;
  totalPastDeals: number;
  isPriceHigherThanHistory: boolean;
  priceDiffPct: number;
  priceWarningText: string | null;
  priceHikeWarning: string | null;
}

export function checkKocDuplicateAndPriceWarning(
  paramsOrHandle:
    | {
        handle: string;
        proposedFee?: number;
        plan: InputPlanBreakdownState | null;
        currentItems: KocListingItem[];
        kocs: KocItem[];
        excludeItemId?: string;
      }
    | string,
  proposedFeeArg?: number,
  currentItemsArg?: KocListingItem[],
  kocsArg?: KocItem[],
  planArg?: InputPlanBreakdownState | null,
  excludeItemIdArg?: string
): KocDuplicateAndPriceCheck {
  const params =
    typeof paramsOrHandle === 'string'
      ? {
          handle: paramsOrHandle,
          proposedFee: proposedFeeArg,
          plan: planArg ?? null,
          currentItems: currentItemsArg || [],
          kocs: kocsArg || [],
          excludeItemId: excludeItemIdArg,
        }
      : paramsOrHandle;
  const clean = (params.handle || '').replace(/^@/, '').trim().toLowerCase();
  const matchedKoc = params.kocs.find(k => (k.channelId || '').replace(/^@/, '').trim().toLowerCase() === clean);
  const sameHandleItems = params.currentItems.filter(
    i =>
      i.id !== params.excludeItemId &&
      columnOf(i) !== 'DROPPED' &&
      (i.kocHandle || '').replace(/^@/, '').trim().toLowerCase() === clean
  );

  let recentStoreCoopWarning: string | null = null;
  if (matchedKoc && params.plan) {
    const brandNorm = (params.plan.brandName || '').trim().toLowerCase();
    const storeNorm = (params.plan.storeName || '').trim().toLowerCase();
    const kocBrandNorm = (matchedKoc.brandName || '').trim().toLowerCase();
    const worked = Boolean(
      kocBrandNorm && ((brandNorm && kocBrandNorm.includes(brandNorm)) || (storeNorm && kocBrandNorm.includes(storeNorm)))
    );
    if (worked && matchedKoc.latestBookMonth) {
      recentStoreCoopWarning = `KOC từng hợp tác với Brand/Gian hàng này gần đây (${matchedKoc.latestBookMonth})`;
    }
  }

  const lastHistoricalFee =
    matchedKoc && matchedKoc.rateCardVideo && matchedKoc.rateCardVideo > 0 ? matchedKoc.rateCardVideo : null;
  const historicalRoi = matchedKoc?.historicalRoi ?? null;
  const totalPastDeals = matchedKoc?.totalPastDeals ?? 0;

  const fee = params.proposedFee ?? 0;
  let isPriceHigherThanHistory = false;
  let priceDiffPct = 0;
  let priceWarningText: string | null = null;

  if (lastHistoricalFee && lastHistoricalFee > 0 && fee > lastHistoricalFee) {
    isPriceHigherThanHistory = true;
    priceDiffPct = Math.round(((fee - lastHistoricalFee) / lastHistoricalFee) * 100);
    priceWarningText = `Giá nhập (${fmt(fee)}đ) cao hơn ${priceDiffPct}% so với giá lịch sử tại Upbase (${fmt(lastHistoricalFee)}đ)`;
  }

  return {
    handle: clean,
    matchedKoc,
    isDuplicateInCurrentPlan: sameHandleItems.length > 0,
    duplicateCountInPlan: sameHandleItems.length,
    recentStoreCoopWarning,
    lastHistoricalFee,
    historicalRoi,
    totalPastDeals,
    isPriceHigherThanHistory,
    priceDiffPct,
    priceWarningText,
    priceHikeWarning: priceWarningText,
  };
}

