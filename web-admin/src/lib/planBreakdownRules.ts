// Quy tắc kiểm soát bảng phân rã tuần. Chỉ kiểm tra và cộng số, không gợi ý số.
// Khoảng giá từng bậc: bảng 5.6 Tệp cast. Công thức Net: bảng 4.1 (Gross ÷ 1,08 ÷ 1,10).
import type { InputPlanBreakdownState, InputPlanRowItem, PlanTierKey, PlanWeekRow } from './types';
import { KL_TIERS } from './klTiers';
import { getWeeksForMonth } from './monthlyPlanData';

export const GROSS_FACTOR = 1.08 * 1.1;
export const TIER_KEYS: PlanTierKey[] = ['KL1', 'KL2', 'KL3', 'KL4', 'KL5', 'KL6', 'KL7'];

export const TIER_RANGE = Object.fromEntries(
  KL_TIERS.map(t => [t.code, { label: t.label, min: t.min, max: t.max, base: t.base }])
) as Record<PlanTierKey, { label: string; min: number; max: number | null; base: number }>;

export const SELF_TYPES: { key: keyof PlanWeekRow['self']; label: string }[] = [
  { key: 'reviewVoice', label: 'Review voice' },
  { key: 'videoAi', label: 'Video AI' },
  { key: 'videoRemix', label: 'Video remix' },
  { key: 'videoToLive', label: 'Video to live' },
  { key: 'nhacText', label: 'Nhạc text' },
];

export const FOC_TYPES: { key: keyof PlanWeekRow['foc']; label: string }[] = [
  { key: 'tapBrand', label: 'TAP Brand' },
  { key: 'tap', label: 'TAP' },
  { key: 'tapUp', label: 'TAP UpAffiliate' },
];

export const netFromGross = (gross: number) => Math.round(gross / GROSS_FACTOR);
export const grossFromNet = (net: number) => Math.round(net * GROSS_FACTOR);

export type WeeklyDistributionMode = 'EVEN' | 'CAMPAIGN_PEAK' | 'FRONT_LOAD';

/** Lấy đơn giá Net mặc định cho bậc KL từ dòng hiện có ở Bước 2 hoặc định mức chuẩn. */
export function getTierDefaultUnitCost(plan: Pick<InputPlanBreakdownState, 'items'>, tier: PlanTierKey): number {
  const matched = (plan.items || []).filter(
    it => it.channel === 'TIKTOK' && it.tierCode.toUpperCase() === tier && it.unitCost > 0
  );
  if (matched.length > 0) {
    const totalQty = matched.reduce((s, it) => s + (it.qty || 0), 0);
    const totalBudget = matched.reduce((s, it) => s + (it.totalBudget || 0), 0);
    if (totalQty > 0 && totalBudget > 0) return Math.round(totalBudget / totalQty);
    return matched[0].unitCost;
  }
  return TIER_RANGE[tier].base;
}

/** Lấy đơn giá Net mặc định cho phiên Livestream từ dòng hiện có ở Bước 2. */
export function getLiveDefaultUnitCost(plan: Pick<InputPlanBreakdownState, 'items'>): number {
  const matched = (plan.items || []).filter(it => it.channel === 'LIVESTREAM' && it.unitCost > 0);
  if (matched.length > 0) {
    const totalQty = matched.reduce((s, it) => s + (it.qty || 0), 0);
    const totalBudget = matched.reduce((s, it) => s + (it.totalBudget || 0), 0);
    if (totalQty > 0 && totalBudget > 0) return Math.round(totalBudget / totalQty);
    return matched[0].unitCost;
  }
  return 1200000;
}

export function emptyWeekRow(week: string): PlanWeekRow {
  return {
    week,
    tiers: {},
    foc: { tapBrand: 0, tap: 0, tapUp: 0 },
    self: { reviewVoice: 0, videoAi: 0, videoRemix: 0, videoToLive: 0, nhacText: 0, budgetNet: 0 },
    live: { sessions: 0, budgetNet: 0 },
  };
}

/** Các tuần của tháng (không gồm dòng "Cả tháng"). */
export function weekLabelsForMonth(month: string): string[] {
  return getWeeksForMonth(month || '').filter(w => !w.isFullMonth).map(w => w.value);
}

/** Danh sách tuần để hiển thị: giữ dữ liệu đã nhập, bổ sung tuần còn thiếu của tháng. */
export function resolveWeekRows(plan: Pick<InputPlanBreakdownState, 'month' | 'weeklyBreakdown'>): PlanWeekRow[] {
  const saved = plan.weeklyBreakdown || [];
  const weekCode = (w: string) => (w || '').trim().split(/\s+/)[0].toUpperCase();
  const byWeek = new Map(saved.map(r => [r.week, r]));
  const byCode = new Map(saved.map(r => [weekCode(r.week), r]));
  const labels = weekLabelsForMonth(plan.month);
  const matchedSaved = new Set<PlanWeekRow>();
  const rows = labels.map(w => {
    const exact = byWeek.get(w);
    if (exact) {
      matchedSaved.add(exact);
      return exact;
    }
    const prefixMatch = byCode.get(weekCode(w));
    if (prefixMatch) {
      matchedSaved.add(prefixMatch);
      return { ...prefixMatch, week: w };
    }
    return emptyWeekRow(w);
  });
  saved.forEach(r => {
    if (!matchedSaved.has(r)) rows.push(r);
  });
  return rows;
}

const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export interface BreakdownTotals {
  tiers: Record<PlanTierKey, { qty: number; budget: number }>;
  castQty: number;
  castBudget: number;
  focQty: number;
  selfQty: number;
  selfBudget: number;
  liveSessions: number;
  liveBudget: number;
  totalBudget: number;
}

export function sumBreakdown(rows: PlanWeekRow[]): BreakdownTotals {
  const tiers = Object.fromEntries(TIER_KEYS.map(k => [k, { qty: 0, budget: 0 }])) as BreakdownTotals['tiers'];
  let focQty = 0;
  let selfQty = 0;
  let selfBudget = 0;
  let liveSessions = 0;
  let liveBudget = 0;
  for (const r of rows) {
    for (const k of TIER_KEYS) {
      tiers[k].qty += n(r.tiers?.[k]?.qty);
      tiers[k].budget += n(r.tiers?.[k]?.budgetNet);
    }
    focQty += n(r.foc?.tapBrand) + n(r.foc?.tap) + n(r.foc?.tapUp);
    selfQty += SELF_TYPES.reduce((s, t) => s + n(r.self?.[t.key]), 0);
    selfBudget += n(r.self?.budgetNet);
    liveSessions += n(r.live?.sessions);
    liveBudget += n(r.live?.budgetNet);
  }
  const castQty = TIER_KEYS.reduce((s, k) => s + tiers[k].qty, 0);
  const castBudget = TIER_KEYS.reduce((s, k) => s + tiers[k].budget, 0);
  return { tiers, castQty, castBudget, focQty, selfQty, selfBudget, liveSessions, liveBudget, totalBudget: castBudget + selfBudget + liveBudget };
}

export type BreakdownIssueSeverity = 'error' | 'warning';

export interface BreakdownIssue {
  severity: BreakdownIssueSeverity;
  code: string;
  message: string;
  week?: string;
  /** Lệch số 4.1: phải ghi giải trình mới được gửi duyệt. */
  needsNote?: boolean;
}

export interface BreakdownComparisonRow {
  key: string;
  label: string;
  planned: number;
  reference: number;
  diff: number;
  unit: 'count' | 'money';
  matched: boolean;
}

const fmt = (v: number) => Math.round(v).toLocaleString('vi-VN');
const shortWeek = (w: string) => w.split(' ')[0];

function moneyTolerance(reference: number) {
  return Math.max(1000, Math.abs(reference) * 0.005);
}

export function compareWith41(plan: InputPlanBreakdownState, rows: PlanWeekRow[]): BreakdownComparisonRow[] {
  const ref = plan.reference41;
  if (!ref) return [];
  const t = sumBreakdown(rows);
  const mk = (key: string, label: string, planned: number, reference: number, unit: 'count' | 'money'): BreakdownComparisonRow => {
    const diff = planned - reference;
    const matched = unit === 'count' ? diff === 0 : Math.abs(diff) <= moneyTolerance(reference);
    return { key, label, planned, reference, diff, unit, matched };
  };
  return [
    mk('cast', 'Video Cast trả phí', t.castQty, ref.cast, 'count'),
    mk('affBudget', 'Ngân sách Cast (Net)', t.castBudget, ref.affCostNet, 'money'),
    mk('foc', 'Suất FOC', t.focQty, ref.foc, 'count'),
    mk('selfQty', 'Video self channel', t.selfQty, ref.selfVideos, 'count'),
    mk('selfBudget', 'Ngân sách self channel (Net)', t.selfBudget, ref.selfCostNet, 'money'),
    mk('live', 'Phiên livestream affiliate', t.liveSessions, ref.liveSessions, 'count'),
    mk('liveBudget', 'Ngân sách livestream affiliate (Net)', t.liveBudget, ref.liveCostNet, 'money'),
  ];
}

export function validateBreakdown(plan: InputPlanBreakdownState): { issues: BreakdownIssue[]; comparison: BreakdownComparisonRow[]; rows: PlanWeekRow[] } {
  const rows = resolveWeekRows(plan);
  const issues: BreakdownIssue[] = [];

  for (const r of rows) {
    const w = shortWeek(r.week);
    const check = (value: number, label: string) => {
      if (value < 0) issues.push({ severity: 'error', code: 'NEGATIVE', week: r.week, message: `${w}: ${label} không được âm` });
    };
    const checkInt = (value: number, label: string) => {
      if (value !== 0 && !Number.isInteger(value)) {
        issues.push({ severity: 'error', code: 'NOT_INTEGER', week: r.week, message: `${w}: ${label} phải là số nguyên` });
      }
    };

    for (const k of TIER_KEYS) {
      const qty = n(r.tiers?.[k]?.qty);
      const budget = n(r.tiers?.[k]?.budgetNet);
      check(qty, `Số video ${k}`);
      check(budget, `Ngân sách ${k}`);
      checkInt(qty, `Số video ${k}`);
      if (qty > 0 && budget === 0) {
        issues.push({ severity: 'error', code: 'TIER_NO_BUDGET', week: r.week, message: `${w}: ${k} có ${qty} video nhưng chưa có ngân sách` });
      } else if (qty === 0 && budget > 0) {
        issues.push({ severity: 'error', code: 'TIER_NO_QTY', week: r.week, message: `${w}: ${k} có ngân sách ${fmt(budget)}đ nhưng chưa có số video` });
      } else if (qty > 0 && budget > 0) {
        const unit = budget / qty;
        const range = TIER_RANGE[k];
        if (unit < range.min || (range.max !== null && unit > range.max)) {
          issues.push({
            severity: 'warning',
            code: 'TIER_PRICE_RANGE',
            week: r.week,
            message: `${w}: ${k} đơn giá ${fmt(unit)}đ/video ngoài khoảng ${fmt(range.min)}${range.max === null ? '+' : ` - ${fmt(range.max)}`}đ`,
          });
        }
      }
    }

    for (const f of FOC_TYPES) {
      check(n(r.foc?.[f.key]), `Suất ${f.label}`);
      checkInt(n(r.foc?.[f.key]), `Suất ${f.label}`);
    }

    const selfQty = SELF_TYPES.reduce((s, t) => s + n(r.self?.[t.key]), 0);
    SELF_TYPES.forEach(t => {
      check(n(r.self?.[t.key]), `Video ${t.label}`);
      checkInt(n(r.self?.[t.key]), `Video ${t.label}`);
    });
    check(n(r.self?.budgetNet), 'Ngân sách self channel');
    if (selfQty === 0 && n(r.self?.budgetNet) > 0) {
      issues.push({ severity: 'error', code: 'SELF_NO_QTY', week: r.week, message: `${w}: self channel có ngân sách nhưng chưa có số video` });
    } else if (selfQty > 0 && n(r.self?.budgetNet) === 0) {
      issues.push({ severity: 'warning', code: 'SELF_NO_BUDGET', week: r.week, message: `${w}: self channel có ${selfQty} video nhưng chưa có ngân sách` });
    }

    check(n(r.live?.sessions), 'Số phiên livestream');
    check(n(r.live?.budgetNet), 'Ngân sách livestream');
    checkInt(n(r.live?.sessions), 'Số phiên livestream');
    if (n(r.live?.sessions) === 0 && n(r.live?.budgetNet) > 0) {
      issues.push({ severity: 'error', code: 'LIVE_NO_QTY', week: r.week, message: `${w}: livestream có ngân sách nhưng chưa có số phiên` });
    }
  }

  const comparison = compareWith41(plan, rows);
  for (const c of comparison) {
    if (c.matched) continue;
    const over = c.diff > 0;
    const amount = c.unit === 'money' ? `${fmt(Math.abs(c.diff))}đ` : `${fmt(Math.abs(c.diff))}`;
    issues.push({
      severity: 'warning',
      code: `MISMATCH_${c.key}`,
      needsNote: true,
      message: `${c.label}: phân rã ${c.unit === 'money' ? `${fmt(c.planned)}đ` : fmt(c.planned)}, bảng 4.1 là ${c.unit === 'money' ? `${fmt(c.reference)}đ` : fmt(c.reference)} (${over ? 'thừa' : 'thiếu'} ${amount})`,
    });
  }

  return { issues, comparison, rows };
}

export function hasBreakdownData(rows: PlanWeekRow[]): boolean {
  const t = sumBreakdown(rows);
  return t.castQty + t.castBudget + t.focQty + t.selfQty + t.selfBudget + t.liveSessions + t.liveBudget > 0;
}

/** Kế hoạch có số 4.1 hoặc có bảng phân rã thì phải qua kiểm soát trước khi gửi duyệt. */
export function checkBreakdownForSubmit(plan: InputPlanBreakdownState): { canSubmit: boolean; reason?: string } {
  const governed = Boolean(plan.reference41) || Boolean(plan.weeklyBreakdown && plan.weeklyBreakdown.length > 0);
  if (!governed) return { canSubmit: true };
  const { issues, rows } = validateBreakdown(plan);
  if (!hasBreakdownData(rows)) return { canSubmit: false, reason: 'Chưa phân rã theo tuần.' };
  const errors = issues.filter(i => i.severity === 'error');
  if (errors.length > 0) return { canSubmit: false, reason: `Còn ${errors.length} lỗi trong bảng phân rã: ${errors[0].message}.` };
  const needNote = issues.filter(i => i.needsNote);
  if (needNote.length > 0 && !(plan.breakdownNote || '').trim()) {
    return { canSubmit: false, reason: `Phân rã lệch bảng 4.1 ở ${needNote.length} chỉ tiêu, cần ghi giải trình.` };
  }
  return { canSubmit: true };
}

/** Tóm tắt trạng thái để hiện trên danh sách kế hoạch. */
export function getBreakdownHealth(plan: InputPlanBreakdownState): { errors: number; mismatches: number; empty: boolean } | null {
  const governed = Boolean(plan.reference41) || Boolean(plan.weeklyBreakdown && plan.weeklyBreakdown.length > 0);
  if (!governed) return null;
  const { issues, rows } = validateBreakdown(plan);
  return {
    errors: issues.filter(i => i.severity === 'error').length,
    mismatches: issues.filter(i => i.needsNote).length,
    empty: !hasBreakdownData(rows),
  };
}

/** Sinh các dòng items (id bắt đầu bằng 'WB-') từ bảng phân rã để các màn khác tiếp tục dùng. */
export function deriveBreakdownItems(plan: InputPlanBreakdownState, rows: PlanWeekRow[]): InputPlanRowItem[] {
  const t = sumBreakdown(rows);
  const staff = plan.pic || undefined;
  const items: InputPlanRowItem[] = [];
  for (const k of TIER_KEYS) {
    const { qty, budget } = t.tiers[k];
    if (qty <= 0 && budget <= 0) continue;
    items.push({
      id: `WB-AFF-${k}`,
      channel: 'TIKTOK',
      platform: 'TikTok Affiliate (Paid KOC)',
      category: 'KOC_TIER',
      tierCode: k,
      tierLabel: TIER_RANGE[k].label,
      salaryGrade: k,
      contentFormat: 'Review trực tiếp / Gắn giỏ hàng',
      qty,
      unitCost: qty > 0 ? Math.round(budget / qty) : 0,
      benchmarkCost: TIER_RANGE[k].base,
      totalBudget: budget,
      expectedRoiMultiplier: 0,
      targetGmv: 0,
      assignedStaff: staff,
    });
  }
  if (t.focQty > 0) {
    items.push({
      id: 'WB-FOC',
      channel: 'TIKTOK',
      platform: 'TikTok Affiliate (FOC 0đ)',
      category: 'KOC_TIER',
      tierCode: 'TAP UpAffiliate',
      tierLabel: 'Suất gửi mẫu miễn phí (FOC 0đ)',
      salaryGrade: 'TAP UpAffiliate',
      contentFormat: 'Unboxing / Trải nghiệm mẫu FOC',
      qty: t.focQty,
      unitCost: 0,
      benchmarkCost: 0,
      totalBudget: 0,
      expectedRoiMultiplier: 0,
      targetGmv: 0,
      assignedStaff: staff,
    });
  }
  if (t.selfQty > 0 || t.selfBudget > 0) {
    items.push({
      id: 'WB-SELF',
      channel: 'SELF_CHANNEL',
      platform: 'Kênh Brand (Self-channel)',
      category: 'SELF_CHANNEL',
      tierCode: 'Review voice',
      tierLabel: 'Video kênh Brand',
      contentFormat: 'Review voice',
      qty: t.selfQty,
      unitCost: t.selfQty > 0 ? Math.round(t.selfBudget / t.selfQty) : 0,
      benchmarkCost: 0,
      totalBudget: t.selfBudget,
      expectedRoiMultiplier: 0,
      targetGmv: 0,
      assignedStaff: staff,
    });
  }
  if (t.liveSessions > 0 || t.liveBudget > 0) {
    items.push({
      id: 'WB-LIVE',
      channel: 'LIVESTREAM',
      platform: 'TikTok Shop Livestream',
      category: 'LIVESTREAM',
      tierCode: 'Daily',
      tierLabel: `Phiên livestream (${t.liveSessions} phiên)`,
      contentFormat: 'Livestream',
      qty: t.liveSessions,
      unitCost: t.liveSessions > 0 ? Math.round(t.liveBudget / t.liveSessions) : 0,
      benchmarkCost: 0,
      totalBudget: t.liveBudget,
      expectedRoiMultiplier: 0,
      targetGmv: 0,
      assignedStaff: staff,
    });
  }
  return items;
}

/** Phân bổ số lượng nguyên và ngân sách vào nhóm dòng sẵn có (giữ nguyên người phụ trách & dòng tách +Chia). */
function scaleExistingRowsInPlace(
  matching: InputPlanRowItem[],
  targetQty: number,
  targetBudget: number,
  fallbackUnitCost: number
) {
  if (matching.length === 0) return;
  if (targetQty <= 0 && targetBudget <= 0) {
    matching.forEach(r => {
      r.qty = 0;
      r.totalBudget = 0;
      r.targetGmv = 0;
    });
    return;
  }

  const curQtySum = matching.reduce((s, r) => s + Math.max(0, r.qty || 0), 0);
  let remQty = Math.max(0, Math.round(targetQty));

  matching.forEach((r, idx) => {
    if (idx === matching.length - 1) {
      r.qty = Math.max(0, remQty);
    } else {
      const share = curQtySum > 0 ? Math.max(0, r.qty || 0) / curQtySum : 1 / matching.length;
      const q = Math.min(remQty, Math.max(0, Math.round(targetQty * share)));
      r.qty = q;
      remQty -= q;
    }
  });

  const effectiveTotalQty = matching.reduce((s, r) => s + r.qty, 0);
  let remBud = Math.max(0, Math.round(targetBudget));

  const activeRows = matching.filter(r => r.qty > 0);
  if (activeRows.length === 0) {
    matching[0].totalBudget = remBud;
    matching[0].unitCost = fallbackUnitCost;
    matching[0].targetGmv = Math.round(remBud * (matching[0].expectedRoiMultiplier || 5));
    for (let i = 1; i < matching.length; i++) {
      matching[i].totalBudget = 0;
      matching[i].targetGmv = 0;
    }
    return;
  }

  activeRows.forEach((r, idx) => {
    if (idx === activeRows.length - 1) {
      r.totalBudget = Math.max(0, remBud);
    } else {
      const share = effectiveTotalQty > 0 ? r.qty / effectiveTotalQty : 1 / activeRows.length;
      const b = Math.min(remBud, Math.max(0, Math.round(targetBudget * share)));
      r.totalBudget = b;
      remBud -= b;
    }
    r.unitCost = r.qty > 0 ? Math.round(r.totalBudget / r.qty) : fallbackUnitCost;
    r.targetGmv = Math.round(r.totalBudget * (r.expectedRoiMultiplier || 5));
  });

  matching
    .filter(r => r.qty === 0)
    .forEach(r => {
      r.totalBudget = 0;
      r.targetGmv = 0;
    });
}

/**
 * Đồng bộ 2 chiều từ Bảng phân rã tuần (Bước 3) ngược về danh sách hạng mục (Bước 2):
 * - Cập nhật trực tiếp trên các dòng gốc (KL1–KL7, FOC, Self-channel, Livestream) thay vì sinh dòng WB-* trùng lặp.
 * - Giữ nguyên nhân sự phụ trách (`assignedStaff`), ghi chú và tỷ lệ tách dòng (`+Chia`).
 */
export function mergeBreakdownItems(plan: InputPlanBreakdownState, rows: PlanWeekRow[]): InputPlanRowItem[] {
  const t = sumBreakdown(rows);
  const staff = plan.pic || undefined;
  // Loại bỏ các dòng WB-* dư thừa nếu trước đây từng sinh ra
  const nextItems: InputPlanRowItem[] = (plan.items || [])
    .filter(i => !i.id.startsWith('WB-'))
    .map(i => ({ ...i }));

  // 1. Đồng bộ KOC trả phí KL1 -> KL7
  for (const k of TIER_KEYS) {
    const { qty, budget } = t.tiers[k];
    const matching = nextItems.filter(it => it.channel === 'TIKTOK' && it.tierCode.toUpperCase() === k);
    if (matching.length > 0) {
      scaleExistingRowsInPlace(matching, qty, budget, TIER_RANGE[k].base);
    } else if (qty > 0 || budget > 0) {
      const unitCost = qty > 0 ? Math.round(budget / qty) : TIER_RANGE[k].base;
      nextItems.push({
        id: `row-tt-${k.toLowerCase()}`,
        channel: 'TIKTOK',
        platform: 'TikTok',
        category: 'KOC_TIER',
        tierCode: k,
        tierLabel: TIER_RANGE[k].label,
        salaryGrade: k,
        contentFormat: 'Review trực tiếp (Direct Review / Swatch)',
        qty,
        unitCost,
        benchmarkCost: TIER_RANGE[k].base,
        totalBudget: budget,
        expectedRoiMultiplier: 5.5,
        targetGmv: Math.round(budget * 5.5),
        assignedStaff: staff,
      });
    }
  }

  // 2. Đồng bộ FOC 0đ
  const focMatching = nextItems.filter(
    it =>
      it.tierCode.includes('TAP') ||
      it.id === 'row-tt-tap' ||
      (it.channel === 'TIKTOK' && it.unitCost === 0 && !TIER_KEYS.includes(it.tierCode.toUpperCase() as PlanTierKey))
  );
  if (focMatching.length > 0) {
    scaleExistingRowsInPlace(focMatching, t.focQty, 0, 0);
  } else if (t.focQty > 0) {
    nextItems.push({
      id: 'row-tt-tap',
      channel: 'TIKTOK',
      platform: 'TikTok',
      category: 'KOC_TIER',
      tierCode: 'TAP UpAffiliate',
      tierLabel: 'TAP UpAffiliate (Mạng lưới tự do)',
      salaryGrade: 'TAP UpAffiliate',
      contentFormat: 'Unboxing / Đập hộp & Trải nghiệm thực tế',
      qty: t.focQty,
      unitCost: 0,
      benchmarkCost: 0,
      totalBudget: 0,
      expectedRoiMultiplier: 6.5,
      targetGmv: 0,
      assignedStaff: staff,
    });
  }

  // 3. Đồng bộ Video kênh Brand (Self-channel) theo từng định dạng
  const selfMatching = nextItems.filter(it => it.channel === 'SELF_CHANNEL');
  const selfFormatSums: Record<keyof PlanWeekRow['self'], number> = {
    reviewVoice: rows.reduce((s, r) => s + n(r.self?.reviewVoice), 0),
    nhacText: rows.reduce((s, r) => s + n(r.self?.nhacText), 0),
    videoRemix: rows.reduce((s, r) => s + n(r.self?.videoRemix), 0),
    videoAi: rows.reduce((s, r) => s + n(r.self?.videoAi), 0),
    videoToLive: rows.reduce((s, r) => s + n(r.self?.videoToLive), 0),
    budgetNet: t.selfBudget,
  };
  if (selfMatching.length > 0) {
    const formatMap: Array<{ key: keyof PlanWeekRow['self']; match: (it: InputPlanRowItem) => boolean }> = [
      { key: 'reviewVoice', match: it => it.tierCode.toLowerCase().includes('voice') || it.id.includes('voice') },
      { key: 'nhacText', match: it => it.tierCode.toLowerCase().includes('nhạc') || it.id.includes('music') },
      { key: 'videoRemix', match: it => it.tierCode.toLowerCase().includes('remix') || it.id.includes('remix') },
      { key: 'videoAi', match: it => it.tierCode.toLowerCase().includes('ai') || it.id.includes('ai') },
      { key: 'videoToLive', match: it => it.tierCode.toLowerCase().includes('pov') || it.tierCode.toLowerCase().includes('live') || it.id.includes('pov') },
    ];
    const handledIds = new Set<string>();
    for (const fm of formatMap) {
      const group = selfMatching.filter(it => !handledIds.has(it.id) && fm.match(it));
      if (group.length > 0) {
        group.forEach(g => handledIds.add(g.id));
        const targetGroupQty = selfFormatSums[fm.key];
        scaleExistingRowsInPlace(group, targetGroupQty, 0, group[0].unitCost || 150000);
      }
    }
    // Phân bổ tổng ngân sách selfBudget theo tỷ trọng qty × benchmarkCost của các dòng self
    const activeSelf = selfMatching.filter(it => it.qty > 0);
    if (activeSelf.length > 0) {
      const weightedSum = activeSelf.reduce((s, it) => s + it.qty * (it.benchmarkCost || it.unitCost || 150000), 0);
      let remSelfBud = Math.max(0, Math.round(t.selfBudget));
      activeSelf.forEach((it, idx) => {
        if (idx === activeSelf.length - 1) {
          it.totalBudget = Math.max(0, remSelfBud);
        } else {
          const share = weightedSum > 0 ? (it.qty * (it.benchmarkCost || it.unitCost || 150000)) / weightedSum : it.qty / Math.max(1, t.selfQty);
          const b = Math.min(remSelfBud, Math.max(0, Math.round(t.selfBudget * share)));
          it.totalBudget = b;
          remSelfBud -= b;
        }
        it.unitCost = it.qty > 0 ? Math.round(it.totalBudget / it.qty) : it.benchmarkCost || 150000;
        it.targetGmv = Math.round(it.totalBudget * (it.expectedRoiMultiplier || 5.5));
      });
    } else if (t.selfBudget > 0) {
      selfMatching[0].totalBudget = t.selfBudget;
    }
  } else if (t.selfQty > 0 || t.selfBudget > 0) {
    nextItems.push({
      id: 'row-self-voice',
      channel: 'SELF_CHANNEL',
      platform: 'Kênh Tự Xây',
      category: 'SELF_CHANNEL',
      tierCode: 'Review voice',
      tierLabel: 'Review voice (Thu âm giọng đọc thật)',
      contentFormat: 'Review voice (Thu âm giọng đọc thật)',
      qty: t.selfQty,
      unitCost: t.selfQty > 0 ? Math.round(t.selfBudget / t.selfQty) : 250000,
      benchmarkCost: 250000,
      totalBudget: t.selfBudget,
      expectedRoiMultiplier: 6.0,
      targetGmv: Math.round(t.selfBudget * 6.0),
      assignedStaff: staff,
    });
  }

  // 4. Đồng bộ Livestream
  const liveMatching = nextItems.filter(it => it.channel === 'LIVESTREAM');
  if (liveMatching.length > 0) {
    scaleExistingRowsInPlace(liveMatching, t.liveSessions, t.liveBudget, 1200000);
  } else if (t.liveSessions > 0 || t.liveBudget > 0) {
    nextItems.push({
      id: 'row-live-daily',
      channel: 'LIVESTREAM',
      platform: 'Livestream',
      category: 'LIVESTREAM',
      tierCode: 'Daily',
      tierLabel: `Phiên livestream (${t.liveSessions} phiên)`,
      contentFormat: 'Livestream Daily (Ca live thường nhật)',
      qty: t.liveSessions,
      unitCost: t.liveSessions > 0 ? Math.round(t.liveBudget / t.liveSessions) : 1200000,
      benchmarkCost: 1200000,
      totalBudget: t.liveBudget,
      expectedRoiMultiplier: 5.0,
      targetGmv: Math.round(t.liveBudget * 5.0),
      assignedStaff: staff,
    });
  }

  return nextItems;
}

/** Tỷ trọng tuần chuẩn theo kịch bản phân bổ. */
function getWeeklyWeights(weekCount: number, mode: WeeklyDistributionMode): number[] {
  if (weekCount <= 0) return [];
  if (weekCount === 1) return [1];
  if (mode === 'CAMPAIGN_PEAK') {
    const raw = weekCount === 4 ? [0.20, 0.35, 0.30, 0.15] : Array.from({ length: weekCount }, (_, i) => (i === 1 || i === 2 ? 0.32 : 0.36 / Math.max(1, weekCount - 2)));
    const sum = raw.reduce((s, v) => s + v, 0);
    return raw.map(v => v / sum);
  }
  if (mode === 'FRONT_LOAD') {
    const raw = weekCount === 4 ? [0.35, 0.35, 0.20, 0.10] : Array.from({ length: weekCount }, (_, i) => Math.max(0.1, (weekCount - i) / ((weekCount * (weekCount + 1)) / 2)));
    const sum = raw.reduce((s, v) => s + v, 0);
    return raw.map(v => v / sum);
  }
  return Array.from({ length: weekCount }, () => 1 / weekCount);
}

/** Chia một số nguyên `total` vào các tuần theo `weights` sao cho tổng bằng đúng `total` (Hamilton method). */
function splitIntByWeights(total: number, weights: number[]): number[] {
  const cleanTotal = Math.max(0, Math.round(total));
  if (weights.length === 0) return [];
  if (cleanTotal === 0) return weights.map(() => 0);

  const exact = weights.map(w => cleanTotal * w);
  const floored = exact.map(v => Math.floor(v));
  let remainder = cleanTotal - floored.reduce((s, v) => s + v, 0);

  const order = exact
    .map((v, idx) => ({ idx, frac: v - floored[idx] }))
    .sort((a, b) => b.frac - a.frac || a.idx - b.idx);

  for (let i = 0; i < remainder; i++) {
    floored[order[i % order.length].idx] += 1;
  }
  return floored;
}

/** Chia ngân sách theo số lượng video từng tuần sao cho tuần có qty=0 thì budget=0 và tổng khớp 100%. */
function splitBudgetByWeeklyQty(totalBudget: number, weeklyQtys: number[], weights: number[]): number[] {
  const cleanBudget = Math.max(0, Math.round(totalBudget));
  if (weeklyQtys.length === 0) return [];
  if (cleanBudget === 0) return weeklyQtys.map(() => 0);

  const totalQty = weeklyQtys.reduce((s, q) => s + q, 0);
  if (totalQty <= 0) {
    // Nếu không có số lượng mà có ngân sách (hiếm gặp), dồn theo weights
    return splitIntByWeights(cleanBudget, weights);
  }

  const result = weeklyQtys.map(() => 0);
  const activeIndices = weeklyQtys.map((q, idx) => (q > 0 ? idx : -1)).filter(idx => idx >= 0);
  let remBudget = cleanBudget;

  activeIndices.forEach((weekIdx, pos) => {
    if (pos === activeIndices.length - 1) {
      result[weekIdx] = Math.max(0, remBudget);
    } else {
      const share = weeklyQtys[weekIdx] / totalQty;
      const allocated = Math.min(remBudget, Math.max(0, Math.round(cleanBudget * share)));
      result[weekIdx] = allocated;
      remBudget -= allocated;
    }
  });

  return result;
}

/**
 * Tự động phân bổ dữ liệu từ Bước 2 (`plan.items`) xuống các tuần ở Bước 3 (`PlanWeekRow[]`):
 * - Khớp 100% số lượng và ngân sách từng bậc KL1–KL7, FOC, Self-channel và Livestream.
 * - Đảm bảo không phát sinh lỗi tuần có video nhưng thiếu ngân sách hoặc ngược lại.
 */
export function distributeItemsToWeeks(
  plan: InputPlanBreakdownState,
  mode: WeeklyDistributionMode = 'EVEN'
): PlanWeekRow[] {
  const baseRows = resolveWeekRows(plan).map(r => emptyWeekRow(r.week));
  const weekCount = baseRows.length;
  if (weekCount === 0) return baseRows;

  const weights = getWeeklyWeights(weekCount, mode);
  const items = (plan.items || []).filter(i => !i.id.startsWith('WB-'));

  // 1. Phân bổ từng bậc KL1 -> KL7
  for (const k of TIER_KEYS) {
    const matching = items.filter(it => it.channel === 'TIKTOK' && it.tierCode.toUpperCase() === k);
    const totalQty = matching.reduce((s, it) => s + Math.max(0, it.qty || 0), 0);
    const totalBudget = matching.reduce((s, it) => s + Math.max(0, it.totalBudget || 0), 0);
    const weeklyQtys = splitIntByWeights(totalQty, weights);
    const weeklyBudgets = splitBudgetByWeeklyQty(totalBudget, weeklyQtys, weights);

    baseRows.forEach((row, wi) => {
      if (weeklyQtys[wi] > 0 || weeklyBudgets[wi] > 0) {
        row.tiers[k] = { qty: weeklyQtys[wi], budgetNet: weeklyBudgets[wi] };
      }
    });
  }

  // 2. Phân bổ Suất FOC (0đ)
  const focItems = items.filter(
    it =>
      it.tierCode.includes('TAP') ||
      it.id === 'row-tt-tap' ||
      (it.channel === 'TIKTOK' && it.unitCost === 0 && !TIER_KEYS.includes(it.tierCode.toUpperCase() as PlanTierKey))
  );
  const totalFocQty = focItems.reduce((s, it) => s + Math.max(0, it.qty || 0), 0);
  const weeklyFoc = splitIntByWeights(totalFocQty, weights);
  baseRows.forEach((row, wi) => {
    row.foc.tapUp = weeklyFoc[wi];
  });

  // 3. Phân bổ Video kênh Brand (Self-channel)
  const selfItems = items.filter(it => it.channel === 'SELF_CHANNEL');
  const sumSelfByMatch = (predicate: (it: InputPlanRowItem) => boolean) =>
    selfItems.filter(predicate).reduce((s, it) => s + Math.max(0, it.qty || 0), 0);

  const voiceTotal = sumSelfByMatch(it => it.tierCode.toLowerCase().includes('voice') || it.id.includes('voice'));
  const musicTotal = sumSelfByMatch(it => it.tierCode.toLowerCase().includes('nhạc') || it.id.includes('music'));
  const remixTotal = sumSelfByMatch(it => it.tierCode.toLowerCase().includes('remix') || it.id.includes('remix'));
  const aiTotal = sumSelfByMatch(it => it.tierCode.toLowerCase().includes('ai') || it.id.includes('ai'));
  const mappedSum = voiceTotal + musicTotal + remixTotal + aiTotal;
  const totalSelfAll = selfItems.reduce((s, it) => s + Math.max(0, it.qty || 0), 0);
  const toLiveTotal = Math.max(0, totalSelfAll - mappedSum);

  const weeklyVoice = splitIntByWeights(voiceTotal, weights);
  const weeklyMusic = splitIntByWeights(musicTotal, weights);
  const weeklyRemix = splitIntByWeights(remixTotal, weights);
  const weeklyAi = splitIntByWeights(aiTotal, weights);
  const weeklyToLive = splitIntByWeights(toLiveTotal, weights);

  const weeklySelfTotalQty = baseRows.map(
    (_, wi) => weeklyVoice[wi] + weeklyMusic[wi] + weeklyRemix[wi] + weeklyAi[wi] + weeklyToLive[wi]
  );
  const totalSelfBudget = selfItems.reduce((s, it) => s + Math.max(0, it.totalBudget || 0), 0);
  const weeklySelfBudgets = splitBudgetByWeeklyQty(totalSelfBudget, weeklySelfTotalQty, weights);

  baseRows.forEach((row, wi) => {
    row.self.reviewVoice = weeklyVoice[wi];
    row.self.nhacText = weeklyMusic[wi];
    row.self.videoRemix = weeklyRemix[wi];
    row.self.videoAi = weeklyAi[wi];
    row.self.videoToLive = weeklyToLive[wi];
    row.self.budgetNet = weeklySelfBudgets[wi];
  });

  // 4. Phân bổ Livestream
  const liveItems = items.filter(it => it.channel === 'LIVESTREAM');
  const totalLiveSessions = liveItems.reduce((s, it) => s + Math.max(0, it.qty || 0), 0);
  const totalLiveBudget = liveItems.reduce((s, it) => s + Math.max(0, it.totalBudget || 0), 0);
  const weeklyLiveSessions = splitIntByWeights(totalLiveSessions, weights);
  const weeklyLiveBudgets = splitBudgetByWeeklyQty(totalLiveBudget, weeklyLiveSessions, weights);

  baseRows.forEach((row, wi) => {
    row.live.sessions = weeklyLiveSessions[wi];
    row.live.budgetNet = weeklyLiveBudgets[wi];
  });

  return baseRows;
}

/**
 * Khớp nhanh Bảng phân rã tuần & các dòng hạng mục theo số chuẩn Bảng 4.1 (`plan.reference41`).
 */
export function distributeReference41ToWeeks(
  plan: InputPlanBreakdownState,
  mode: WeeklyDistributionMode = 'EVEN'
): { weeklyBreakdown: PlanWeekRow[]; items: InputPlanRowItem[] } {
  const ref = plan.reference41;
  if (!ref) {
    const weeklyBreakdown = distributeItemsToWeeks(plan, mode);
    return { weeklyBreakdown, items: mergeBreakdownItems(plan, weeklyBreakdown) };
  }

  const baseRows = resolveWeekRows(plan).map(r => emptyWeekRow(r.week));
  const weekCount = baseRows.length;
  const weights = getWeeklyWeights(weekCount, mode);

  // Tỷ trọng các bậc KL1..KL7 dựa trên items hiện có hoặc tỷ lệ chuẩn B2C
  const currentAffRows = (plan.items || []).filter(
    it => it.channel === 'TIKTOK' && TIER_KEYS.includes(it.tierCode.toUpperCase() as PlanTierKey)
  );
  const curAffQty = currentAffRows.reduce((s, it) => s + Math.max(0, it.qty || 0), 0);

  const defaultTierShares: Record<PlanTierKey, number> = {
    KL1: 0.35,
    KL2: 0.30,
    KL3: 0.20,
    KL4: 0.10,
    KL5: 0.05,
    KL6: 0,
    KL7: 0,
  };

  const tierWeights = TIER_KEYS.map(k => {
    if (curAffQty > 0) {
      const kQty = currentAffRows
        .filter(it => it.tierCode.toUpperCase() === k)
        .reduce((s, it) => s + Math.max(0, it.qty || 0), 0);
      return kQty / curAffQty;
    }
    return defaultTierShares[k];
  });

  const tierQtys = splitIntByWeights(ref.cast, tierWeights);
  const weightedBaseCosts = TIER_KEYS.map((k, idx) => tierQtys[idx] * getTierDefaultUnitCost(plan, k));
  const totalWeightedBase = weightedBaseCosts.reduce((s, v) => s + v, 0);

  let remAffBudget = Math.max(0, Math.round(ref.affCostNet));
  const tierBudgets = TIER_KEYS.map((_, idx) => 0);
  const activeTierIndices = tierQtys.map((q, idx) => (q > 0 ? idx : -1)).filter(idx => idx >= 0);

  activeTierIndices.forEach((tIdx, pos) => {
    if (pos === activeTierIndices.length - 1) {
      tierBudgets[tIdx] = Math.max(0, remAffBudget);
    } else {
      const share = totalWeightedBase > 0 ? weightedBaseCosts[tIdx] / totalWeightedBase : tierQtys[tIdx] / Math.max(1, ref.cast);
      const b = Math.min(remAffBudget, Math.max(0, Math.round(ref.affCostNet * share)));
      tierBudgets[tIdx] = b;
      remAffBudget -= b;
    }
  });

  TIER_KEYS.forEach((k, tIdx) => {
    const wQtys = splitIntByWeights(tierQtys[tIdx], weights);
    const wBuds = splitBudgetByWeeklyQty(tierBudgets[tIdx], wQtys, weights);
    baseRows.forEach((row, wi) => {
      if (wQtys[wi] > 0 || wBuds[wi] > 0) {
        row.tiers[k] = { qty: wQtys[wi], budgetNet: wBuds[wi] };
      }
    });
  });

  // FOC
  const wFoc = splitIntByWeights(ref.foc, weights);
  baseRows.forEach((row, wi) => {
    row.foc.tapUp = wFoc[wi];
  });

  // Self-channel
  const wSelfQty = splitIntByWeights(ref.selfVideos, weights);
  const wSelfBud = splitBudgetByWeeklyQty(ref.selfCostNet, wSelfQty, weights);
  baseRows.forEach((row, wi) => {
    row.self.reviewVoice = wSelfQty[wi];
    row.self.budgetNet = wSelfBud[wi];
  });

  // Livestream
  const wLiveQty = splitIntByWeights(ref.liveSessions, weights);
  const wLiveBud = splitBudgetByWeeklyQty(ref.liveCostNet, wLiveQty, weights);
  baseRows.forEach((row, wi) => {
    row.live.sessions = wLiveQty[wi];
    row.live.budgetNet = wLiveBud[wi];
  });

  return {
    weeklyBreakdown: baseRows,
    items: mergeBreakdownItems(plan, baseRows),
  };
}

