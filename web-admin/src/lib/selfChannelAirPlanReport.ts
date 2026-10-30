// Kế hoạch so với video đã air của Content kênh Brand (Self-channel), theo gian hàng và tháng.
// Chỉ tiêu lấy từ kế hoạch tháng; số đã air lấy từ việc thật trên bảng Self-channel.
import type { SelfChannelJob } from './selfChannelBoardRules';

export interface SelfAirPlanInput {
  planId: string;
  storeName: string;
  brandName: string;
  month: string;
  pic: string;
  targetQty: number;
  targetBudgetNet: number;
}

export type SelfAirJobInput = Pick<
  SelfChannelJob,
  'id' | 'code' | 'airLink' | 'airedAt' | 'deadline' | 'acceptanceStatus' | 'lifecycleStatus' | 'contentPic' | 'feeGross' | 'paymentStatus'
> & { planId: string; storeName: string; month: string };

export interface SelfAirPlanRow {
  planId: string;
  storeName: string;
  brandName: string;
  pic: string;
  planQty: number;
  planBudgetNet: number;
  jobs: number;
  aired: number;
  airedOntime: number;
  airedLate: number;
  waitingAir: number;
  overdueNotAired: number;
  accepted: number;
  committed: number;
  paid: number;
  /** % đã air so với chỉ tiêu; chặn mẫu số 0 */
  airRate: number;
  /** Chỉ tiêu còn thiếu (chưa giao việc hoặc chưa air) */
  gapQty: number;
}

export interface SelfAirPlanSummary {
  rows: SelfAirPlanRow[];
  planQty: number;
  jobs: number;
  aired: number;
  airedLate: number;
  overdueNotAired: number;
  accepted: number;
  airRate: number;
}

const ymd = (s: string) => (s || '').slice(0, 10);
const norm = (s: string) => (s || '').trim().toLowerCase();
export const isSelfAired = (j: Pick<SelfChannelJob, 'airLink' | 'airedAt'>) => Boolean(j.airedAt?.trim() || j.airLink?.trim());

export function computeSelfAirPlanSummary(params: {
  plans: SelfAirPlanInput[];
  jobs: SelfAirJobInput[];
  month: string;
  store?: string;
  pic?: string;
  /** YYYY-MM-DD giờ Việt Nam */
  today: string;
}): SelfAirPlanSummary {
  const { plans, jobs, month, store, pic, today } = params;
  const jobsByPlan = new Map<string, SelfAirJobInput[]>();
  for (const j of jobs) {
    if (j.month !== month || j.lifecycleStatus === 'CANCELLED') continue;
    jobsByPlan.set(j.planId, [...(jobsByPlan.get(j.planId) || []), j]);
  }

  const rows: SelfAirPlanRow[] = [];
  for (const p of plans) {
    if (p.month !== month) continue;
    if (store && norm(p.storeName) !== norm(store)) continue;
    const pj = jobsByPlan.get(p.planId) || [];
    if (pic && norm(p.pic) !== norm(pic) && !pj.some(j => norm(j.contentPic) === norm(pic))) continue;
    if (p.targetQty === 0 && p.targetBudgetNet === 0 && pj.length === 0) continue;

    const airedJobs = pj.filter(isSelfAired);
    const airedLate = airedJobs.filter(j => j.deadline && j.airedAt && ymd(j.airedAt) > ymd(j.deadline)).length;
    const overdue = pj.filter(j => !isSelfAired(j) && j.deadline && ymd(j.deadline) < today).length;
    const aired = airedJobs.length;
    rows.push({
      planId: p.planId,
      storeName: p.storeName,
      brandName: p.brandName,
      pic: p.pic,
      planQty: p.targetQty,
      planBudgetNet: p.targetBudgetNet,
      jobs: pj.length,
      aired,
      airedOntime: aired - airedLate,
      airedLate,
      waitingAir: pj.length - aired,
      overdueNotAired: overdue,
      accepted: pj.filter(j => j.acceptanceStatus === 'PASSED').length,
      committed: pj.reduce((s, j) => s + (j.feeGross || 0), 0),
      paid: pj.filter(j => j.paymentStatus === 'PAID').reduce((s, j) => s + (j.feeGross || 0), 0),
      airRate: p.targetQty === 0 ? 0 : (aired / p.targetQty) * 100,
      gapQty: Math.max(0, p.targetQty - aired),
    });
  }
  rows.sort((a, b) => a.storeName.localeCompare(b.storeName, 'vi'));

  const sum = (f: (r: SelfAirPlanRow) => number) => rows.reduce((s, r) => s + f(r), 0);
  const planQty = sum(r => r.planQty);
  const aired = sum(r => r.aired);
  return {
    rows,
    planQty,
    jobs: sum(r => r.jobs),
    aired,
    airedLate: sum(r => r.airedLate),
    overdueNotAired: sum(r => r.overdueNotAired),
    accepted: sum(r => r.accepted),
    airRate: planQty === 0 ? 0 : (aired / planQty) * 100,
  };
}
