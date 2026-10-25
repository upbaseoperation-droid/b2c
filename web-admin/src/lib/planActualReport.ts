// Báo cáo Kế hoạch vs Thực tế của một gian hàng trong tháng.
// Kế hoạch: Kế hoạch tháng 4.1.1 (chỉ tiêu theo KL, phân rã tuần). Thực tế: Listing (đã list / đã chốt) và Deal board (job, air, nghiệm thu, cam kết, đã chi).
import type { InputPlanBreakdownState, KocListingItem } from './types';
import { BATCH_CYCLE_SPECS, computeBatchProgress, computeProgress, type QuotaKey } from './listingBoardRules';
import { resolveWeekRows, SELF_TYPES, TIER_KEYS } from './planBreakdownRules';
import { isJobAcceptanceCleared, jobTotalFee, type DealBoardData, type DealJob } from './dealBoardRules';
import {
  computeSelfPlanTarget,
  type SelfChannelBoardData,
} from './selfChannelBoardRules';
import { KL_TIERS } from './klTiers';

/** done: đạt · running: đang trong kỳ · overdue: đã qua hạn mà chưa đạt · upcoming: chưa tới · none: kỳ này không có chỉ tiêu */
export type ProgressState = 'done' | 'running' | 'overdue' | 'upcoming' | 'none';

export interface TierActualRow {
  key: QuotaKey;
  label: string;
  planQty: number;
  planBudget: number;
  listed: number;
  confirmed: number;
  jobs: number;
  aired: number;
  accepted: number;
  committed: number;
  paid: number;
}

export interface BatchActualRow {
  key: string;
  label: string;
  dueDate: string;
  targetQty: number;
  targetBudget: number;
  listed: number;
  confirmed: number;
  committed: number;
  state: ProgressState;
}

export interface WeekActualRow {
  week: string;
  start: string;
  end: string;
  planQty: number;
  planBudget: number;
  /** Job có hạn air trong tuần */
  scheduled: number;
  aired: number;
  state: ProgressState;
}

export interface PlanActualStoreReport {
  planId: string;
  month: string;
  storeName: string;
  brandName: string;
  pic: string;
  planStatus: string;
  tiers: TierActualRow[];
  total: TierActualRow;
  batches: BatchActualRow[];
  weeks: WeekActualRow[];
  /** Kế hoạch đã nhập phân rã tuần (có ít nhất một tuần có video) */
  hasWeeklyPlan: boolean;
  /** Video kế hoạch của các tuần đã kết thúc và số đã air trong các tuần đó */
  dueToDate: { planQty: number; aired: number; lastEndedWeekEnd: string };
  budget: { plan: number; committed: number; paid: number; isOver: boolean; isUnbudgeted: boolean };
  state: ProgressState;
  /** Job chưa lên sóng chuyển sang tháng sau (không tính thực tế tháng này) và Job nhận từ tháng trước (tính ở tháng này) */
  carryOver: { movedOut: number; movedOutFee: number; carriedIn: number; carriedInFee: number };
}

const pad = (n: number) => String(n).padStart(2, '0');
const lastDayOfMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

function planYearMonth(month: string): { y: number; m: number } | null {
  const match = /^(\d{4})\/(\d{1,2})$/.exec(month || '');
  return match ? { y: Number(match[1]), m: Number(match[2]) } : null;
}

/** Ngày bắt đầu / kết thúc của nhãn tuần 'W43 [19.10 - 25.10]' theo năm của tháng kế hoạch (xử lý tuần vắt năm). */
export function weekRange(label: string, month: string): { start: string; end: string } | null {
  const ym = planYearMonth(month);
  const m = /\[(\d{1,2})\.(\d{1,2})\s*-\s*(\d{1,2})\.(\d{1,2})\]/.exec(label);
  if (!ym || !m) return null;
  const [sd, sm, ed, em] = m.slice(1).map(Number);
  const startYear = sm === 12 && ym.m === 1 ? ym.y - 1 : ym.y;
  const endYear = em < sm ? startYear + 1 : startYear;
  return { start: `${startYear}-${pad(sm)}-${pad(sd)}`, end: `${endYear}-${pad(em)}-${pad(ed)}` };
}

/** Hạn đợt listing: ngày 10 / 20 / 30 của tháng kế hoạch (tháng ngắn thì lấy ngày cuối tháng). */
export function batchDueDate(month: string, day: number): string {
  const ym = planYearMonth(month);
  if (!ym) return '';
  return `${ym.y}-${pad(ym.m)}-${pad(Math.min(day, lastDayOfMonth(ym.y, ym.m)))}`;
}

function dealGradeKey(grade: string): QuotaKey | null {
  if (/TAP|FOC/i.test(grade)) return 'FOC';
  return KL_TIERS.some(t => t.code === grade) ? (grade as QuotaKey) : null;
}

const isActiveJob = (j: DealJob, currentMonth?: string) =>
  (!j.lifecycleStatus || j.lifecycleStatus === 'ACTIVE') &&
  (!j.sourcePlanMonth || !currentMonth || j.sourcePlanMonth === currentMonth);
const isAired = (j: DealJob) => Boolean(j.airedAt || j.airLink.trim());

/** Đã chi của 1 job = tạm ứng đã chi + tất toán đã chi, không vượt tổng phí (tránh cộng trùng khi phiếu tất toán ghi cả phần đã ứng). */
export function jobPaidAmount(j: DealJob): number {
  const fee = jobTotalFee(j);
  const advance = j.advancePayment?.status === 'PAID' ? j.advancePayment.amount ?? 0 : 0;
  const settle = j.payment.status === 'PAID' ? j.payment.amount ?? Math.max(0, fee - advance) : 0;
  return Math.min(fee, Math.max(0, advance) + Math.max(0, settle));
}

const emptyTier = (key: QuotaKey, label: string): TierActualRow => ({
  key, label, planQty: 0, planBudget: 0, listed: 0, confirmed: 0, jobs: 0, aired: 0, accepted: 0, committed: 0, paid: 0,
});

export function buildPlanActualReport(
  plan: InputPlanBreakdownState,
  listing: KocListingItem[],
  board: DealBoardData,
  today: string,
  selfBoard?: SelfChannelBoardData
): PlanActualStoreReport {
  // Theo KL: chỉ tiêu + listing lấy từ cùng hàm của bảng Listing để hai màn khớp số
  const progress = computeProgress(plan, listing);
  const tiers = new Map<QuotaKey, TierActualRow>();
  for (const t of progress.tiers) {
    tiers.set(t.key, { ...emptyTier(t.key, t.label), planQty: t.requiredQty, planBudget: t.requiredBudget, listed: t.listed, confirmed: t.confirmed });
  }
  const jobs: { job: DealJob; key: QuotaKey | null }[] = [];
  for (const d of board.deals || []) {
    const key = dealGradeKey(d.grade);
    for (const j of d.jobs || []) {
      if (!isActiveJob(j, plan.month)) continue;
      jobs.push({ job: j, key });
      if (!key) continue;
      if (!tiers.has(key)) tiers.set(key, emptyTier(key, key === 'FOC' ? 'FOC (0đ)' : key));
      const row = tiers.get(key)!;
      row.jobs += 1;
      if (isAired(j)) row.aired += 1;
      if (isJobAcceptanceCleared(j)) row.accepted += 1;
      row.committed += jobTotalFee(j);
      row.paid += jobPaidAmount(j);
    }
  }

  // Tích hợp Self-channel (Kênh Brand) nếu có chỉ tiêu hoặc có video thực tế
  const selfTarget = computeSelfPlanTarget(plan);
  const activeSelfJobs = (selfBoard?.jobs || []).filter(
    j => !j.lifecycleStatus || j.lifecycleStatus === 'ACTIVE'
  );
  if (selfTarget.totalQty > 0 || selfTarget.totalBudgetNet > 0 || activeSelfJobs.length > 0) {
    const selfRow: TierActualRow = {
      key: 'SELF',
      label: 'Self-channel (Kênh Brand)',
      planQty: selfTarget.totalQty,
      planBudget: selfTarget.totalBudgetNet,
      listed: activeSelfJobs.length,
      confirmed: activeSelfJobs.filter(
        j => j.videoQaStatus === 'INTERNAL_QA_PASSED' || j.videoQaStatus === 'BRAND_APPROVED'
      ).length,
      jobs: activeSelfJobs.length,
      aired: activeSelfJobs.filter(j => Boolean(j.airedAt || j.airLink.trim())).length,
      accepted: activeSelfJobs.filter(j => j.acceptanceStatus === 'PASSED').length,
      committed: activeSelfJobs.reduce((s, j) => s + (j.feeGross || 0), 0),
      paid: activeSelfJobs
        .filter(j => j.paymentStatus === 'PAID')
        .reduce((s, j) => s + (j.feeGross || 0), 0),
    };
    tiers.set('SELF', selfRow);
  }

  const order: QuotaKey[] = [...TIER_KEYS, 'FOC', 'SELF'];
  const tierRows = order.filter(k => tiers.has(k)).map(k => tiers.get(k)!);
  const total = emptyTier('FOC', 'Tổng');
  for (const r of tierRows) {
    (['planQty', 'planBudget', 'listed', 'confirmed', 'jobs', 'aired', 'accepted', 'committed', 'paid'] as const).forEach(f => {
      total[f] += r[f];
    });
  }
  // Job có bậc không nhận ra vẫn tính vào tổng để không mất tiền
  for (const { job, key } of jobs) {
    if (key) continue;
    total.jobs += 1;
    if (isAired(job)) total.aired += 1;
    if (isJobAcceptanceCleared(job)) total.accepted += 1;
    total.committed += jobTotalFee(job);
    total.paid += jobPaidAmount(job);
  }

  // Theo đợt 10/20/30
  const batchProgress = computeBatchProgress(plan, listing);
  const batches: BatchActualRow[] = batchProgress.map(b => {
    const dueDate = batchDueDate(plan.month, b.dueDayOfMonth);
    const state: ProgressState =
      b.targetQty <= 0 ? 'none' : b.listedQty >= b.targetQty ? 'done' : dueDate && today > dueDate ? 'overdue' : 'running';
    return {
      key: b.key,
      label: BATCH_CYCLE_SPECS.find(s => s.key === b.key)?.shortLabel || b.label,
      dueDate,
      targetQty: b.targetQty,
      targetBudget: b.targetBudget,
      listed: b.listedQty,
      confirmed: b.confirmedQty,
      committed: b.committedBudget,
      state,
    };
  });

  // Theo tuần: video KOC (KL + FOC + Self-channel) trong phân rã tuần so với job có hạn air / đã air trong tuần
  const weeks: WeekActualRow[] = [];
  for (const r of resolveWeekRows(plan)) {
    const range = weekRange(r.week, plan.month);
    if (!range) continue;
    const selfWeekQty = SELF_TYPES.reduce((s, st) => s + (r.self?.[st.key] || 0), 0);
    const selfWeekBudget = r.self?.budgetNet || 0;
    const planQty =
      TIER_KEYS.reduce((s, k) => s + (r.tiers?.[k]?.qty || 0), 0) +
      (r.foc?.tapBrand || 0) +
      (r.foc?.tap || 0) +
      (r.foc?.tapUp || 0) +
      selfWeekQty;
    const planBudget =
      TIER_KEYS.reduce((s, k) => s + (r.tiers?.[k]?.budgetNet || 0), 0) +
      selfWeekBudget;
    const inRange = (day: string) => Boolean(day) && day.slice(0, 10) >= range.start && day.slice(0, 10) <= range.end;
    const scheduled =
      jobs.filter(x => inRange(x.job.deadline)).length +
      activeSelfJobs.filter(j => inRange(j.deadline)).length;
    const aired =
      jobs.filter(x => inRange(x.job.airedAt)).length +
      activeSelfJobs.filter(j => inRange(j.airedAt)).length;
    let state: ProgressState;
    if (planQty === 0) state = 'none';
    else if (range.end < today) state = aired >= planQty ? 'done' : 'overdue';
    else if (range.start <= today) state = planQty > 0 && aired >= planQty ? 'done' : 'running';
    else state = 'upcoming';
    weeks.push({ week: r.week, start: range.start, end: range.end, planQty, planBudget, scheduled, aired, state });
  }
  const ended = weeks.filter(w => w.end < today);
  const lastEndedWeekEnd = ended.length ? ended[ended.length - 1].end : '';
  const airedToDate = lastEndedWeekEnd
    ? jobs.filter(x => x.job.airedAt && x.job.airedAt.slice(0, 10) <= lastEndedWeekEnd).length +
      activeSelfJobs.filter(j => j.airedAt && j.airedAt.slice(0, 10) <= lastEndedWeekEnd).length
    : 0;
  const dueToDate = {
    planQty: ended.reduce((s, w) => s + w.planQty, 0),
    aired: airedToDate,
    lastEndedWeekEnd,
  };

  const planBudget = total.planBudget;
  const budget = {
    plan: planBudget,
    committed: total.committed,
    paid: total.paid,
    isOver: planBudget > 0 && total.committed > planBudget,
    isUnbudgeted: planBudget <= 0 && total.committed > 0,
  };

  const anyOverdue = batches.some(b => b.state === 'overdue') || weeks.some(w => w.state === 'overdue');
  const finished = total.planQty > 0 && total.accepted >= total.planQty;
  const noTarget = total.planQty === 0 && total.committed === 0;
  const state: ProgressState = noTarget
    ? 'none'
    : finished
      ? 'done'
      : anyOverdue
        ? 'overdue'
        : weeks.some(w => w.start <= today)
          ? 'running'
          : 'upcoming';

  return {
    planId: plan.id,
    month: plan.month,
    storeName: plan.storeName || plan.title,
    brandName: plan.brandName,
    pic: plan.pic || '',
    planStatus: plan.statusLabel || plan.status || '',
    tiers: tierRows,
    total,
    batches,
    weeks,
    hasWeeklyPlan: weeks.some(w => w.planQty > 0),
    dueToDate,
    budget,
    state,
    carryOver: board.deals.reduce(
      (acc, d) => {
        for (const j of d.jobs || []) {
          if (j.lifecycleStatus === 'ROLLED_OVER_NEXT_MONTH') {
            acc.movedOut += 1;
            acc.movedOutFee += jobTotalFee(j);
          } else if (j.carriedFromMonth && (!j.lifecycleStatus || j.lifecycleStatus === 'ACTIVE')) {
            acc.carriedIn += 1;
            acc.carriedInFee += jobTotalFee(j);
          }
        }
        return acc;
      },
      { movedOut: 0, movedOutFee: 0, carriedIn: 0, carriedInFee: 0 }
    ),
  };
}
