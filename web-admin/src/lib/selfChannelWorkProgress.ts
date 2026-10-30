// Tiến độ làm việc Content kênh Brand: mỗi gian, mỗi nhân sự, mỗi CTV đang ở bước nào so với chỉ tiêu,
// và việc nào đang kẹt (quá hạn đăng, Brand chưa duyệt kịch bản quá 72h, video nháp chờ QA, CTV chưa nhận việc).
import {
  BRAND_SCRIPT_SLA_HOURS,
  brandScriptWaitingHours,
  selfJobStageOf,
  type SelfChannelJob,
  type SelfJobStage,
} from './selfChannelBoardRules';
import { isSelfAired, type SelfAirPlanInput } from './selfChannelAirPlanReport';

export type SelfProgressJob = SelfChannelJob & { planId: string; storeName: string; brandName?: string; month: string };

export const SELF_STAGE_ORDER: SelfJobStage[] = ['BRIEF', 'SCRIPT', 'PRODUCTION', 'BRAND_AIR', 'ACCEPTANCE', 'SETTLEMENT'];

export interface SelfProgressCounts {
  jobs: number;
  /** Số video ở từng bước hiện tại (đã hủy không tính) */
  byStage: Record<SelfJobStage, number>;
  aired: number;
  accepted: number;
  paid: number;
  overdue: number;
  brandLate: number;
  qaWaiting: number;
  ctvPending: number;
  ctvDeclined: number;
}

export interface SelfStoreProgress extends SelfProgressCounts {
  planId: string;
  storeName: string;
  pic: string;
  planQty: number;
  /** Chỉ tiêu chưa được giao việc */
  notAssigned: number;
  /** % đã đăng so với chỉ tiêu (hoặc so số việc nếu không có chỉ tiêu) */
  airRate: number;
  acceptedRate: number;
}

export interface SelfPersonProgress extends SelfProgressCounts {
  key: string;
  name: string;
  stores: number;
}

export interface SelfWorkProgress {
  stores: SelfStoreProgress[];
  pics: SelfPersonProgress[];
  ctvs: SelfPersonProgress[];
  totals: SelfProgressCounts & { planQty: number; notAssigned: number; airRate: number; acceptedRate: number };
}

const ymd = (s: string) => (s || '').slice(0, 10);
const rate = (n: number, d: number) => (d === 0 ? 0 : (n / d) * 100);

const emptyCounts = (): SelfProgressCounts => ({
  jobs: 0,
  byStage: { BRIEF: 0, SCRIPT: 0, PRODUCTION: 0, BRAND_AIR: 0, ACCEPTANCE: 0, SETTLEMENT: 0 },
  aired: 0,
  accepted: 0,
  paid: 0,
  overdue: 0,
  brandLate: 0,
  qaWaiting: 0,
  ctvPending: 0,
  ctvDeclined: 0,
});

function add(c: SelfProgressCounts, j: SelfProgressJob, today: string, nowMs: number) {
  c.jobs += 1;
  c.byStage[selfJobStageOf(j)] += 1;
  const aired = isSelfAired(j);
  if (aired) c.aired += 1;
  if (j.acceptanceStatus === 'PASSED') c.accepted += 1;
  if (j.paymentStatus === 'PAID') c.paid += 1;
  if (!aired && j.deadline && ymd(j.deadline) < today) c.overdue += 1;
  const wait = brandScriptWaitingHours(j, nowMs);
  if (wait !== null && wait > BRAND_SCRIPT_SLA_HOURS) c.brandLate += 1;
  if (j.videoQaStatus === 'DRAFT_SUBMITTED') c.qaWaiting += 1;
  if (j.ctvConfirmStatus === 'ASSIGNED') c.ctvPending += 1;
  if (j.ctvConfirmStatus === 'DECLINED') c.ctvDeclined += 1;
}

export function computeSelfWorkProgress(params: {
  plans: SelfAirPlanInput[];
  jobs: SelfProgressJob[];
  month: string;
  store?: string;
  pic?: string;
  /** YYYY-MM-DD giờ Việt Nam */
  today: string;
  nowMs: number;
}): SelfWorkProgress {
  const { plans, jobs, month, store, pic, today, nowMs } = params;
  const norm = (s: string) => (s || '').trim().toLowerCase();
  const active = jobs.filter(j => j.month === month && j.lifecycleStatus !== 'CANCELLED');

  const byPlan = new Map<string, SelfProgressJob[]>();
  for (const j of active) byPlan.set(j.planId, [...(byPlan.get(j.planId) || []), j]);

  const stores: SelfStoreProgress[] = [];
  for (const p of plans) {
    if (p.month !== month) continue;
    if (store && norm(p.storeName) !== norm(store)) continue;
    const pj = byPlan.get(p.planId) || [];
    if (pic && norm(p.pic) !== norm(pic) && !pj.some(j => norm(j.contentPic) === norm(pic))) continue;
    if (p.targetQty === 0 && pj.length === 0) continue;
    const c = emptyCounts();
    for (const j of pj) add(c, j, today, nowMs);
    const base = p.targetQty > 0 ? p.targetQty : c.jobs;
    stores.push({
      ...c,
      planId: p.planId,
      storeName: p.storeName,
      pic: p.pic,
      planQty: p.targetQty,
      notAssigned: Math.max(0, p.targetQty - c.jobs),
      airRate: rate(c.aired, base),
      acceptedRate: rate(c.accepted, base),
    });
  }
  stores.sort((a, b) => b.overdue - a.overdue || a.airRate - b.airRate || a.storeName.localeCompare(b.storeName, 'vi'));

  const visiblePlanIds = new Set(stores.map(s => s.planId));
  const scoped = active.filter(j => visiblePlanIds.has(j.planId) && (!pic || norm(j.contentPic) === norm(pic)));
  const group = (keyOf: (j: SelfProgressJob) => { key: string; name: string } | null): SelfPersonProgress[] => {
    const map = new Map<string, { name: string; c: SelfProgressCounts; plans: Set<string> }>();
    for (const j of scoped) {
      const k = keyOf(j);
      if (!k) continue;
      const cur = map.get(k.key) || { name: k.name, c: emptyCounts(), plans: new Set<string>() };
      add(cur.c, j, today, nowMs);
      cur.plans.add(j.planId);
      map.set(k.key, cur);
    }
    return Array.from(map.entries())
      .map(([key, v]) => ({ ...v.c, key, name: v.name, stores: v.plans.size }))
      .sort((a, b) => b.overdue - a.overdue || b.jobs - a.jobs);
  };

  const pics = group(j => {
    const name = (j.contentPic || '').trim();
    return name ? { key: norm(name), name } : { key: '(chưa gán)', name: 'Chưa gán PIC' };
  });
  const ctvs = group(j => {
    if (j.productionMode !== 'CTV_OUTSOURCE') return null;
    const name = j.contributorName.trim();
    return { key: j.contributorId || norm(name) || '(chưa gán)', name: name || 'Chưa gán CTV' };
  });

  const totalCounts = emptyCounts();
  let planQty = 0;
  let notAssigned = 0;
  for (const s of stores) {
    planQty += s.planQty;
    notAssigned += s.notAssigned;
    totalCounts.jobs += s.jobs;
    for (const st of SELF_STAGE_ORDER) totalCounts.byStage[st] += s.byStage[st];
    totalCounts.aired += s.aired;
    totalCounts.accepted += s.accepted;
    totalCounts.paid += s.paid;
    totalCounts.overdue += s.overdue;
    totalCounts.brandLate += s.brandLate;
    totalCounts.qaWaiting += s.qaWaiting;
    totalCounts.ctvPending += s.ctvPending;
    totalCounts.ctvDeclined += s.ctvDeclined;
  }
  const base = planQty > 0 ? planQty : totalCounts.jobs;
  return {
    stores,
    pics,
    ctvs,
    totals: { ...totalCounts, planQty, notAssigned, airRate: rate(totalCounts.aired, base), acceptedRate: rate(totalCounts.accepted, base) },
  };
}
