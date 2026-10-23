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
  const byWeek = new Map(saved.map(r => [r.week, r]));
  const labels = weekLabelsForMonth(plan.month);
  const rows = labels.map(w => byWeek.get(w) || emptyWeekRow(w));
  saved.forEach(r => {
    if (!labels.includes(r.week)) rows.push(r);
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

/** Items của kế hoạch sau khi áp bảng phân rã: giữ items không do bảng phân rã sinh ra. */
export function mergeBreakdownItems(plan: InputPlanBreakdownState, rows: PlanWeekRow[]): InputPlanRowItem[] {
  return [...(plan.items || []).filter(i => !i.id.startsWith('WB-')), ...deriveBreakdownItems(plan, rows)];
}
