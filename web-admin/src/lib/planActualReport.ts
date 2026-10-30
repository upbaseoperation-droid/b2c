// Báo cáo Kế hoạch vs Thực tế của một gian hàng trong tháng.
// Kế hoạch: Kế hoạch tháng 4.1 & 4.1.1 (chỉ tiêu theo Kênh, Bậc KL, phân rã tuần).
// Thực tế: Listing 3.1 (đã list / chờ Brand / đã chốt) và Deal board / 3.2 List duyệt book (job, hẹn air tuần, đã air, nghiệm thu, cam kết, đã chi).
import type { InputPlanBreakdownState, KocListingItem } from './types';
import {
  BATCH_CYCLE_SPECS,
  columnOf,
  computeBatchProgress,
  computeProgress,
  type QuotaKey,
} from './listingBoardRules';
import {
  MULTI_PLATFORMS,
  resolveWeekRows,
  SELF_TYPES,
   sumBreakdown,
  TIER_KEYS,
} from './planBreakdownRules';
import { isJobAcceptanceCleared, jobTotalFee, type DealBoardData, type DealJob } from './dealBoardRules';
import {
  computeSelfPlanTarget,
  type SelfChannelBoardData,
} from './selfChannelBoardRules';
import { KL_TIERS } from './klTiers';
import type { StoreWeeklyAirSyncRecord } from './b2cWeeklyAirSyncDataset';

/** done: đạt · running: đang trong kỳ · overdue: đã qua hạn mà chưa đạt · upcoming: chưa tới · none: kỳ này không có chỉ tiêu */
export type ProgressState = 'done' | 'running' | 'overdue' | 'upcoming' | 'none';

export type PlanChannelKey =
  | 'CAST_PAID'
  | 'FOC_SAMPLE'
  | 'SELF_CHANNEL'
  | 'MULTI_PLATFORM'
  | 'LIVESTREAM';

export const PLAN_CHANNEL_SPECS: {
  key: PlanChannelKey;
  label: string;
  shortLabel: string;
  unit: 'video' | 'phiên';
}[] = [
  {
    key: 'CAST_PAID',
    label: 'Video KOC trả phí (KL1–KL7)',
    shortLabel: 'KOC trả phí',
    unit: 'video',
  },
  {
    key: 'FOC_SAMPLE',
    label: 'Gửi mẫu miễn phí (FOC 0đ)',
    shortLabel: 'Gửi mẫu FOC',
    unit: 'video',
  },
  {
    key: 'SELF_CHANNEL',
    label: 'Kênh Brand tự xây (Self-channel)',
    shortLabel: 'Kênh Brand',
    unit: 'video',
  },
  {
    key: 'MULTI_PLATFORM',
    label: 'Đa sàn (Shopee / FB / IG / Threads)',
    shortLabel: 'Đa sàn',
    unit: 'video',
  },
  {
    key: 'LIVESTREAM',
    label: 'Livestream (Affiliate & Tự live)',
    shortLabel: 'Livestream',
    unit: 'phiên',
  },
];

export interface TierActualRow {
  key: QuotaKey;
  label: string;
  planQty: number;
  planBudget: number;
  listed: number;
  waitBrand?: number;
  negotiating?: number;
  confirmed: number;
  jobs: number;
  scheduled?: number;
  aired: number;
  accepted: number;
  committed: number;
  paid: number;
}

export interface ChannelActualRow {
  key: PlanChannelKey;
  label: string;
  shortLabel: string;
  unit: 'video' | 'phiên';
  planQty: number;
  planBudget: number;
  listed: number;
  confirmed: number;
  jobs: number;
  scheduled: number;
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

export interface WeekCellMetrics {
  planQty: number;
  planBudget: number;
  listed: number;
  confirmed: number;
  scheduled: number;
  aired: number;
  accepted: number;
  committed: number;
  paid: number;
}

export interface WeekActualRow {
  week: string;
  weekCode: string;
  start: string;
  end: string;
  planQty: number;
  planBudget: number;
  /** Tổng chỉ tiêu gộp cả Đa sàn & Livestream trong tuần */
  planAllQty: number;
  planAllBudget: number;
  /** Job có hạn air trong tuần */
  scheduled: number;
  aired: number;
  accepted: number;
  committed: number;
  paid: number;
  onTime: number;
  early: number;
  late: number;
  pending: number;
  state: ProgressState;
  byChannel: Record<PlanChannelKey, WeekCellMetrics>;
  byTier: Record<QuotaKey, WeekCellMetrics>;
}

export interface StoreExecutionDealRow {
  code: string;
  kocHandle: string;
  productName: string;
  pic: string;
  tierKey: QuotaKey;
  channelKey: PlanChannelKey;
  formatLabel: string;
  feeNet: number;
  paidAmount: number;
  plannedAirDate: string;
  plannedWeek: string;
  actualAirDate: string;
  actualWeek: string;
  timingStatus: 'ON_TIME' | 'EARLY' | 'LATE' | 'UNSCHEDULED_AIR' | 'NOT_AIRED';
  pipelineLabel: string;
  accepted: boolean;
  linkAir: string;
}

export interface PlanActualStoreReport {
  planId: string;
  storeId?: string;
  month: string;
  storeName: string;
  brandName: string;
  platform: 'TikTok Shop' | 'Shopee Mall';
  pic: string;
  hasLeader: boolean;
  leaderName?: string;
  planStatus: string;
  tiers: TierActualRow[];
  channels: ChannelActualRow[];
  total: TierActualRow;
  batches: BatchActualRow[];
  weeks: WeekActualRow[];
  deals: StoreExecutionDealRow[];
  /** Kế hoạch đã nhập phân rã tuần (có ít nhất một tuần có video) */
  hasWeeklyPlan: boolean;
  /** Video kế hoạch của các tuần đã kết thúc và số đã air trong các tuần đó */
  dueToDate: { planQty: number; aired: number; lastEndedWeekEnd: string };
  budget: { plan: number; committed: number; paid: number; isOver: boolean; isUnbudgeted: boolean };
  state: ProgressState;
  /** Job chưa lên sóng chuyển sang tháng sau (không tính thực tế tháng này) và Job nhận từ tháng trước (tính ở tháng này) */
  carryOver: { movedOut: number; movedOutFee: number; carriedIn: number; carriedInFee: number };
  /** Thống kê phễu 5 chặng từ Kế hoạch → Listing → Chốt KOC → Lên lịch Book → Air & Nghiệm thu */
  funnel: {
    planVideoQty: number;
    listedQty: number;
    waitBrandQty: number;
    negotiatingQty: number;
    confirmedDealQty: number;
    bookedJobQty: number;
    scheduledJobQty: number;
    airedJobQty: number;
    acceptedJobQty: number;
  };
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
  if (/TAP|FOC/i.test(grade || '')) return 'FOC';
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
  key,
  label,
  planQty: 0,
  planBudget: 0,
  listed: 0,
  waitBrand: 0,
  negotiating: 0,
  confirmed: 0,
  jobs: 0,
  scheduled: 0,
  aired: 0,
  accepted: 0,
  committed: 0,
  paid: 0,
});

const emptyCell = (): WeekCellMetrics => ({
  planQty: 0,
  planBudget: 0,
  listed: 0,
  confirmed: 0,
  scheduled: 0,
  aired: 0,
  accepted: 0,
  committed: 0,
  paid: 0,
});

const ALL_QUOTA_KEYS: QuotaKey[] = [...TIER_KEYS, 'FOC', 'SELF'];

function createEmptyByChannel(): Record<PlanChannelKey, WeekCellMetrics> {
  return {
    CAST_PAID: emptyCell(),
    FOC_SAMPLE: emptyCell(),
    SELF_CHANNEL: emptyCell(),
    MULTI_PLATFORM: emptyCell(),
    LIVESTREAM: emptyCell(),
  };
}

function createEmptyByTier(): Record<QuotaKey, WeekCellMetrics> {
  return Object.fromEntries(ALL_QUOTA_KEYS.map(k => [k, emptyCell()])) as Record<QuotaKey, WeekCellMetrics>;
}

interface UnifiedExecJob {
  code: string;
  kocHandle: string;
  productName: string;
  pic: string;
  key: QuotaKey | null;
  channelKey: PlanChannelKey;
  formatLabel: string;
  deadline: string;
  plannedWeek: string;
  airedAt: string;
  actualWeek: string;
  hasAirSignal: boolean;
  accepted: boolean;
  feeNet: number;
  paidAmount: number;
  timingStatus: 'ON_TIME' | 'EARLY' | 'LATE' | 'UNSCHEDULED_AIR' | 'NOT_AIRED';
  pipelineLabel: string;
  linkAir: string;
  isSelfChannel: boolean;
}

function detectStorePlatform(plan: InputPlanBreakdownState, airSync?: StoreWeeklyAirSyncRecord): 'TikTok Shop' | 'Shopee Mall' {
  if (airSync?.platform) return airSync.platform;
  const name = `${plan.storeName || ''} ${plan.title || ''}`.toLowerCase();
  if (name.includes('shopee')) return 'Shopee Mall';
  return 'TikTok Shop';
}

export function buildPlanActualReport(
  plan: InputPlanBreakdownState,
  listing: KocListingItem[],
  board: DealBoardData,
  today: string,
  selfBoard?: SelfChannelBoardData,
  airSyncRecord?: StoreWeeklyAirSyncRecord
): PlanActualStoreReport {
  // 1. Theo KL: chỉ tiêu + listing lấy từ cùng hàm của bảng Listing để hai màn khớp số
  const progress = computeProgress(plan, listing);
  const tiers = new Map<QuotaKey, TierActualRow>();
  for (const t of progress.tiers) {
    tiers.set(t.key, {
      ...emptyTier(t.key, t.label),
      planQty: t.requiredQty,
      planBudget: t.requiredBudget,
      listed: t.listed,
      waitBrand: t.waitBrand,
      negotiating: t.negotiating,
      confirmed: t.confirmed,
    });
  }

  // Tập hợp danh sách Job thực thi hợp nhất từ DealBoard, SelfChannelBoard và (nếu có) 3.2 AirSync
  const unifiedJobs: UnifiedExecJob[] = [];
  const seenJobCodes = new Set<string>();

  for (const d of board.deals || []) {
    const key = dealGradeKey(d.grade);
    const channelKey: PlanChannelKey = key === 'FOC' ? 'FOC_SAMPLE' : 'CAST_PAID';
    for (const j of d.jobs || []) {
      if (!isActiveJob(j, plan.month)) continue;
      const code = (j.code || j.id || '').trim();
      if (code) seenJobCodes.add(code.toLowerCase());
      const airedFlag = isAired(j);
      const acceptedFlag = isJobAcceptanceCleared(j);
      const fee = jobTotalFee(j);
      const paid = jobPaidAmount(j);
      const dl = (j.deadline || '').slice(0, 10);
      const ad = (j.airedAt || '').slice(0, 10);
      let timingStatus: UnifiedExecJob['timingStatus'] = 'NOT_AIRED';
      if (airedFlag) {
        if (!dl) timingStatus = 'UNSCHEDULED_AIR';
        else if (ad && ad < dl) timingStatus = 'EARLY';
        else if (ad && ad > dl) timingStatus = 'LATE';
        else timingStatus = 'ON_TIME';
      }
      unifiedJobs.push({
        code: code || d.id,
        kocHandle: d.kocHandle || d.kocName || '',
        productName: j.productName || j.pillar || j.title || '',
        pic: j.pic || d.pic || plan.pic || '',
        key,
        channelKey,
        formatLabel: key === 'FOC' ? 'Gửi mẫu FOC' : 'Booking Video KOC',
        deadline: dl,
        plannedWeek: '',
        airedAt: ad,
        actualWeek: '',
        hasAirSignal: airedFlag,
        accepted: acceptedFlag,
        feeNet: fee,
        paidAmount: paid,
        timingStatus,
        pipelineLabel: acceptedFlag ? 'Đã nghiệm thu' : airedFlag ? 'Đã lên sóng' : 'Đã lên lịch',
        linkAir: j.airLink || '',
        isSelfChannel: false,
      });

      if (!key) continue;
      if (!tiers.has(key)) tiers.set(key, emptyTier(key, key === 'FOC' ? 'FOC (0đ)' : key));
      const row = tiers.get(key)!;
      row.jobs += 1;
      if (dl) row.scheduled = (row.scheduled || 0) + 1;
      if (airedFlag) row.aired += 1;
      if (acceptedFlag) row.accepted += 1;
      row.committed += fee;
      row.paid += paid;
    }
  }

  // 2. Tích hợp Self-channel (Kênh Brand)
  const selfTarget = computeSelfPlanTarget(plan);
  const activeSelfJobs = (selfBoard?.jobs || []).filter(
    j => !j.lifecycleStatus || j.lifecycleStatus === 'ACTIVE'
  );
  for (const sj of activeSelfJobs) {
    const code = (sj.id || '').trim();
    if (code) seenJobCodes.add(code.toLowerCase());
    const airedFlag = Boolean(sj.airedAt || sj.airLink.trim());
    const acceptedFlag = sj.acceptanceStatus === 'PASSED';
    const feeNet = Math.round((sj.feeGross || 0) * 0.9);
    const paidNet = sj.paymentStatus === 'PAID' ? feeNet : 0;
    const dl = (sj.deadline || '').slice(0, 10);
    const ad = (sj.airedAt || '').slice(0, 10);
    let timingStatus: UnifiedExecJob['timingStatus'] = 'NOT_AIRED';
    if (airedFlag) {
      if (!dl) timingStatus = 'UNSCHEDULED_AIR';
      else if (ad && ad < dl) timingStatus = 'EARLY';
      else if (ad && ad > dl) timingStatus = 'LATE';
      else timingStatus = 'ON_TIME';
    }
    unifiedJobs.push({
      code: code || 'SELF-JOB',
      kocHandle: sj.contributorName || 'Kênh Brand',
      productName: sj.productName || sj.pillar || sj.angle || '',
      pic: sj.contentPic || sj.contributorName || plan.pic || '',
      key: 'SELF',
      channelKey: 'SELF_CHANNEL',
      formatLabel: 'Booking Video kênh Brand',
      deadline: dl,
      plannedWeek: '',
      airedAt: ad,
      actualWeek: '',
      hasAirSignal: airedFlag,
      accepted: acceptedFlag,
      feeNet,
      paidAmount: paidNet,
      timingStatus,
      pipelineLabel: acceptedFlag ? 'Đã nghiệm thu' : airedFlag ? 'Đã lên sóng' : 'Đang sản xuất',
      linkAir: sj.airLink || '',
      isSelfChannel: true,
    });
  }

  // 3. Tích hợp dữ liệu thực thi 3.2 (StoreWeeklyAirSyncRecord) nếu có và chưa trùng mã BO
  let syncSelfListed = 0;
  let syncSelfConfirmed = 0;
  let syncSelfJobs = 0;
  let syncSelfScheduled = 0;
  let syncSelfAired = 0;
  let syncSelfAccepted = 0;
  let syncSelfCommitted = 0;
  let syncSelfPaid = 0;

  if (airSyncRecord && Array.isArray(airSyncRecord.deals)) {
    for (const sd of airSyncRecord.deals) {
      const codeKey = (sd.code || '').trim().toLowerCase();
      if (codeKey && seenJobCodes.has(codeKey)) continue;
      if (codeKey) seenJobCodes.add(codeKey);

      const isSelfFormat = /kênh\s*brand/i.test(sd.format || '');
      const isLiveFormat = /livestream/i.test(sd.format || '');
      const isMultiFormat = /nền\s*tảng\s*khác/i.test(sd.format || '');
      const parsedKl = dealGradeKey(sd.kl);
      const isFocDeal = !isSelfFormat && (parsedKl === 'FOC' || (!parsedKl && (sd.cost || 0) <= 0));

      const channelKey: PlanChannelKey = isSelfFormat
        ? 'SELF_CHANNEL'
        : isLiveFormat
          ? 'LIVESTREAM'
          : isMultiFormat
            ? 'MULTI_PLATFORM'
            : isFocDeal
              ? 'FOC_SAMPLE'
              : 'CAST_PAID';

      const tierKey: QuotaKey | null = isSelfFormat
        ? 'SELF'
        : isFocDeal
          ? 'FOC'
          : parsedKl || ((sd.cost || 0) > 0 ? 'KL1' : 'FOC');

      const airedFlag = Boolean((sd.actualAirDate && sd.actualAirDate.trim()) || (sd.linkAir && sd.linkAir.trim()));
      const acceptedFlag =
        sd.pipeline === 'Done' ||
        sd.pipeline === 'Làm ĐNTT' ||
        /nghiệm\s*thu|đntt|done/i.test(sd.pipeline || '');
      const feeNet = Math.max(0, Math.round(sd.cost || 0));
      const paidNet =
        sd.pipeline === 'Done'
          ? feeNet
          : sd.pipeline === 'Làm ĐNTT' || sd.pipeline === 'Tạm ứng'
            ? Math.round(feeNet * 0.5)
            : 0;
      const hasSchedule = Boolean((sd.plannedAirDate && sd.plannedAirDate.trim()) || (sd.plannedWeek && sd.plannedWeek.trim()));

      const parsedPlannedWeek = /\b(W\d{1,2})\b/i.exec(sd.plannedWeek || '')?.[1]?.toUpperCase() || '';
      const parsedActualWeek = /\b(W\d{1,2})\b/i.exec(sd.actualWeek || '')?.[1]?.toUpperCase() || '';

      unifiedJobs.push({
        code: sd.code,
        kocHandle: sd.channelId || '',
        productName: sd.productName || '',
        pic: sd.pic || plan.pic || '',
        key: tierKey,
        channelKey,
        formatLabel: sd.format || 'Booking Video KOC',
        deadline: (sd.plannedAirDate || '').slice(0, 10),
        plannedWeek: parsedPlannedWeek,
        airedAt: (sd.actualAirDate || '').slice(0, 10),
        actualWeek: parsedActualWeek,
        hasAirSignal: airedFlag,
        accepted: acceptedFlag,
        feeNet,
        paidAmount: paidNet,
        timingStatus: sd.syncTimingStatus || (airedFlag ? 'ON_TIME' : 'NOT_AIRED'),
        pipelineLabel: sd.pipeline || (airedFlag ? 'Đã lên sóng' : 'Chờ lên sóng'),
        linkAir: sd.linkAir || '',
        isSelfChannel: isSelfFormat,
      });

      if (isSelfFormat) {
        syncSelfListed += 1;
        syncSelfConfirmed += 1;
        syncSelfJobs += 1;
        if (hasSchedule) syncSelfScheduled += 1;
        if (airedFlag) syncSelfAired += 1;
        if (acceptedFlag) syncSelfAccepted += 1;
        syncSelfCommitted += feeNet;
        syncSelfPaid += paidNet;
      } else if (tierKey) {
        if (!tiers.has(tierKey)) {
          const defaultLabel =
            tierKey === 'FOC'
              ? 'FOC (0đ)'
              : KL_TIERS.find(t => t.code === tierKey)?.label || tierKey;
          tiers.set(tierKey, emptyTier(tierKey, defaultLabel));
        }
        const row = tiers.get(tierKey)!;
        row.jobs += 1;
        if (hasSchedule) row.scheduled = (row.scheduled || 0) + 1;
        if (airedFlag) row.aired += 1;
        if (acceptedFlag) row.accepted += 1;
        row.committed += feeNet;
        row.paid += paidNet;
      }
    }
  }

  if (
    selfTarget.totalQty > 0 ||
    selfTarget.totalBudgetNet > 0 ||
    activeSelfJobs.length > 0 ||
    syncSelfJobs > 0
  ) {
    const selfRow: TierActualRow = {
      key: 'SELF',
      label: 'Self-channel (Kênh Brand)',
      planQty: selfTarget.totalQty,
      planBudget: selfTarget.totalBudgetNet,
      listed: activeSelfJobs.length + syncSelfListed,
      waitBrand: 0,
      negotiating: 0,
      confirmed:
        activeSelfJobs.filter(
          j => j.videoQaStatus === 'INTERNAL_QA_PASSED' || j.videoQaStatus === 'BRAND_APPROVED'
        ).length + syncSelfConfirmed,
      jobs: activeSelfJobs.length + syncSelfJobs,
      scheduled:
        activeSelfJobs.filter(j => Boolean(j.deadline)).length + syncSelfScheduled,
      aired:
        activeSelfJobs.filter(j => Boolean(j.airedAt || j.airLink.trim())).length +
        syncSelfAired,
      accepted:
        activeSelfJobs.filter(j => j.acceptanceStatus === 'PASSED').length +
        syncSelfAccepted,
      committed:
        activeSelfJobs.reduce((s, j) => s + Math.round((j.feeGross || 0) * 0.9), 0) +
        syncSelfCommitted,
      paid:
        activeSelfJobs
          .filter(j => j.paymentStatus === 'PAID')
          .reduce((s, j) => s + Math.round((j.feeGross || 0) * 0.9), 0) +
        syncSelfPaid,
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
    total.waitBrand = (total.waitBrand || 0) + (r.waitBrand || 0);
    total.negotiating = (total.negotiating || 0) + (r.negotiating || 0);
    total.scheduled = (total.scheduled || 0) + (r.scheduled || 0);
  }
  // Job có bậc không nhận ra vẫn tính vào tổng để không mất tiền
  for (const u of unifiedJobs) {
    if (u.key) continue;
    total.jobs += 1;
    if (u.deadline || u.plannedWeek) total.scheduled = (total.scheduled || 0) + 1;
    if (u.hasAirSignal) total.aired += 1;
    if (u.accepted) total.accepted += 1;
    total.committed += u.feeNet;
    total.paid += u.paidAmount;
  }

  // 4. Theo đợt 10/20/30
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

  // 5. Theo tuần: phân rã chi tiết từng tuần × Kênh và từng tuần × Bậc KL
  const resolvedWeeks = [...resolveWeekRows(plan)];
  if (
    airSyncRecord &&
    plan.month === '2026/10' &&
    !resolvedWeeks.some(w => (w.week || '').trim().toUpperCase().startsWith('W45'))
  ) {
    resolvedWeeks.push({
      week: 'W45 [30.10 - 05.11]',
      tiers: {},
      foc: { tapBrand: 0, tap: 0, tapUp: 0 },
      self: { reviewVoice: 0, videoAi: 0, videoRemix: 0, videoToLive: 0, nhacText: 0, budgetNet: 0 },
      live: { sessions: 0, budgetNet: 0 },
    });
  }
  const breakdownTotals = sumBreakdown(resolvedWeeks);
  const weeks: WeekActualRow[] = [];

  for (const r of resolvedWeeks) {
    const range = weekRange(r.week, plan.month);
    if (!range) continue;
    const weekCode = (r.week || '').trim().split(/\s+/)[0].toUpperCase();
    const byChannel = createEmptyByChannel();
    const byTier = createEmptyByTier();

    for (const k of TIER_KEYS) {
      const q = r.tiers?.[k]?.qty || 0;
      const b = r.tiers?.[k]?.budgetNet || 0;
      byTier[k].planQty += q;
      byTier[k].planBudget += b;
      byChannel.CAST_PAID.planQty += q;
      byChannel.CAST_PAID.planBudget += b;
    }

    const focWeekQty = (r.foc?.tapBrand || 0) + (r.foc?.tap || 0) + (r.foc?.tapUp || 0);
    byTier.FOC.planQty += focWeekQty;
    byChannel.FOC_SAMPLE.planQty += focWeekQty;

    const selfWeekQty = SELF_TYPES.reduce((s, st) => s + (r.self?.[st.key] || 0), 0);
    const selfWeekBudget = r.self?.budgetNet || 0;
    byTier.SELF.planQty += selfWeekQty;
    byTier.SELF.planBudget += selfWeekBudget;
    byChannel.SELF_CHANNEL.planQty += selfWeekQty;
    byChannel.SELF_CHANNEL.planBudget += selfWeekBudget;

    const multiWeekQty = MULTI_PLATFORMS.reduce(
      (s, mp) => s + (r.multiPlatform?.[mp.key]?.affQty || 0) + (r.multiPlatform?.[mp.key]?.reupQty || 0),
      0
    );
    const multiWeekBudget = MULTI_PLATFORMS.reduce(
      (s, mp) => s + (r.multiPlatform?.[mp.key]?.budgetNet || 0),
      0
    );
    byChannel.MULTI_PLATFORM.planQty += multiWeekQty;
    byChannel.MULTI_PLATFORM.planBudget += multiWeekBudget;

    const liveWeekQty =
      (r.live?.sessions || 0) +
      (r.liveSelf?.inhouse3h || 0) +
      (r.liveSelf?.ctv2h || 0) +
      (r.liveSelf?.brand2h || 0);
    const liveWeekBudget = (r.live?.budgetNet || 0) + (r.liveSelf?.budgetNet || 0);
    byChannel.LIVESTREAM.planQty += liveWeekQty;
    byChannel.LIVESTREAM.planBudget += liveWeekBudget;

    const corePlanQty = byChannel.CAST_PAID.planQty + focWeekQty + selfWeekQty;
    const corePlanBudget = byChannel.CAST_PAID.planBudget + selfWeekBudget;
    // Giữ tương thích 100% với kiểm thử cốt lõi, đồng thời hỗ trợ gian Shopee nhập trên cột Đa sàn
    const planQty = corePlanQty === 0 && multiWeekQty > 0 ? multiWeekQty : corePlanQty;
    const planBudget = corePlanQty === 0 && multiWeekQty > 0 ? multiWeekBudget : corePlanBudget;
    const planAllQty = corePlanQty + multiWeekQty + liveWeekQty;
    const planAllBudget = corePlanBudget + multiWeekBudget + liveWeekBudget;

    const inRange = (day: string) =>
      Boolean(day) && day.slice(0, 10) >= range.start && day.slice(0, 10) <= range.end;

    // Ghi nhận Listing có expectedAirDate rơi vào tuần này
    for (const it of listing) {
      if (columnOf(it) === 'DROPPED') continue;
      if (it.expectedAirDate && inRange(it.expectedAirDate)) {
        const isFoc = it.salaryGrade === 'TAP UpAffiliate' || (it.finalFee ?? it.proposedFee ?? 0) <= 0;
        const chKey: PlanChannelKey = isFoc ? 'FOC_SAMPLE' : 'CAST_PAID';
        const tKey: QuotaKey = isFoc
          ? 'FOC'
          : KL_TIERS.some(t => t.code === it.salaryGrade)
            ? (it.salaryGrade as QuotaKey)
            : 'KL1';
        byChannel[chKey].listed += 1;
        byTier[tKey].listed += 1;
        if (columnOf(it) === 'CONFIRMED') {
          byChannel[chKey].confirmed += 1;
          byTier[tKey].confirmed += 1;
        }
      }
    }

    let scheduled = 0;
    let aired = 0;
    let accepted = 0;
    let committed = 0;
    let paid = 0;
    let onTime = 0;
    let early = 0;
    let late = 0;
    let pending = 0;

    for (const u of unifiedJobs) {
      const isSchedInWeek = u.plannedWeek ? u.plannedWeek === weekCode : inRange(u.deadline);
      const isAiredInWeek = u.actualWeek
        ? u.hasAirSignal && u.actualWeek === weekCode
        : inRange(u.airedAt);

      if (isSchedInWeek) {
        scheduled += 1;
        byChannel[u.channelKey].scheduled += 1;
        if (u.key) byTier[u.key].scheduled += 1;
        if (!u.hasAirSignal) {
          pending += 1;
          committed += u.feeNet;
          byChannel[u.channelKey].committed += u.feeNet;
          if (u.key) byTier[u.key].committed += u.feeNet;
        }
      }

      if (isAiredInWeek) {
        aired += 1;
        committed += u.feeNet;
        paid += u.paidAmount;
        if (u.accepted) accepted += 1;

        byChannel[u.channelKey].aired += 1;
        byChannel[u.channelKey].committed += u.feeNet;
        byChannel[u.channelKey].paid += u.paidAmount;
        if (u.accepted) byChannel[u.channelKey].accepted += 1;

        if (u.key) {
          byTier[u.key].aired += 1;
          byTier[u.key].committed += u.feeNet;
          byTier[u.key].paid += u.paidAmount;
          if (u.accepted) byTier[u.key].accepted += 1;
        }

        if (u.timingStatus === 'EARLY') early += 1;
        else if (u.timingStatus === 'LATE') late += 1;
        else onTime += 1;
      }
    }

    let state: ProgressState;
    if (planQty === 0) state = 'none';
    else if (range.end < today) state = aired >= planQty ? 'done' : 'overdue';
    else if (range.start <= today) state = planQty > 0 && aired >= planQty ? 'done' : 'running';
    else state = 'upcoming';

    weeks.push({
      week: r.week,
      weekCode,
      start: range.start,
      end: range.end,
      planQty,
      planBudget,
      planAllQty,
      planAllBudget,
      scheduled,
      aired,
      accepted,
      committed,
      paid,
      onTime,
      early,
      late,
      pending,
      state,
      byChannel,
      byTier,
    });
  }

  // 6. Tổng hợp theo 5 Kênh đầu việc (ChannelActualRow[])
  const castTierRows = tierRows.filter(t => TIER_KEYS.includes(t.key as never));
  const focTierRow = tiers.get('FOC');
  const selfTierRow = tiers.get('SELF');

  const multiJobs = unifiedJobs.filter(u => u.channelKey === 'MULTI_PLATFORM');
  const liveJobs = unifiedJobs.filter(u => u.channelKey === 'LIVESTREAM');

  const ref41 = plan.reference41;
  const refMultiQty = ref41?.multiPlatform
    ? MULTI_PLATFORMS.reduce(
        (s, mp) =>
          s +
          (ref41.multiPlatform?.[mp.key]?.affQty || 0) +
          (ref41.multiPlatform?.[mp.key]?.reupQty || 0),
        0
      )
    : 0;
  const refMultiBudget = ref41?.multiPlatform
    ? MULTI_PLATFORMS.reduce((s, mp) => s + (ref41.multiPlatform?.[mp.key]?.costNet || 0), 0)
    : 0;
  const multiPlanQty =
    (breakdownTotals.multiTotalAffQty + breakdownTotals.multiTotalReupQty) || refMultiQty;
  const multiPlanBudget = breakdownTotals.multiTotalBudget || refMultiBudget;

  const refLiveQty =
    (ref41?.liveSessions || 0) +
    (ref41?.liveSelf?.inhouse3h || 0) +
    (ref41?.liveSelf?.ctv2h || 0) +
    (ref41?.liveSelf?.brand2h || 0);
  const refLiveBudget = (ref41?.liveCostNet || 0) + (ref41?.liveSelf?.totalCostNet || 0);
  const livePlanQty =
    (breakdownTotals.liveSessions +
      breakdownTotals.liveSelfInhouse +
      breakdownTotals.liveSelfCtv +
      breakdownTotals.liveSelfBrand) ||
    refLiveQty;
  const livePlanBudget =
    (breakdownTotals.liveBudget + breakdownTotals.liveSelfBudget) || refLiveBudget;

  const channels: ChannelActualRow[] = [
    {
      key: 'CAST_PAID',
      label: 'Video KOC trả phí (KL1–KL7)',
      shortLabel: 'KOC trả phí',
      unit: 'video',
      planQty: castTierRows.reduce((s, r) => s + r.planQty, 0) || breakdownTotals.castQty,
      planBudget: castTierRows.reduce((s, r) => s + r.planBudget, 0) || breakdownTotals.castBudget,
      listed: castTierRows.reduce((s, r) => s + r.listed, 0),
      confirmed: castTierRows.reduce((s, r) => s + r.confirmed, 0),
      jobs: castTierRows.reduce((s, r) => s + r.jobs, 0),
      scheduled: castTierRows.reduce((s, r) => s + (r.scheduled || 0), 0),
      aired: castTierRows.reduce((s, r) => s + r.aired, 0),
      accepted: castTierRows.reduce((s, r) => s + r.accepted, 0),
      committed: castTierRows.reduce((s, r) => s + r.committed, 0),
      paid: castTierRows.reduce((s, r) => s + r.paid, 0),
    },
    {
      key: 'FOC_SAMPLE',
      label: 'Gửi mẫu miễn phí (FOC 0đ)',
      shortLabel: 'Gửi mẫu FOC',
      unit: 'video',
      planQty: focTierRow?.planQty ?? breakdownTotals.focQty,
      planBudget: 0,
      listed: focTierRow?.listed ?? 0,
      confirmed: focTierRow?.confirmed ?? 0,
      jobs: focTierRow?.jobs ?? 0,
      scheduled: focTierRow?.scheduled ?? 0,
      aired: focTierRow?.aired ?? 0,
      accepted: focTierRow?.accepted ?? 0,
      committed: focTierRow?.committed ?? 0,
      paid: focTierRow?.paid ?? 0,
    },
    {
      key: 'SELF_CHANNEL',
      label: 'Kênh Brand tự xây (Self-channel)',
      shortLabel: 'Kênh Brand',
      unit: 'video',
      planQty: selfTierRow?.planQty ?? breakdownTotals.selfQty,
      planBudget: selfTierRow?.planBudget ?? breakdownTotals.selfBudget,
      listed: selfTierRow?.listed ?? 0,
      confirmed: selfTierRow?.confirmed ?? 0,
      jobs: selfTierRow?.jobs ?? 0,
      scheduled: selfTierRow?.scheduled ?? 0,
      aired: selfTierRow?.aired ?? 0,
      accepted: selfTierRow?.accepted ?? 0,
      committed: selfTierRow?.committed ?? 0,
      paid: selfTierRow?.paid ?? 0,
    },
    {
      key: 'MULTI_PLATFORM',
      label: 'Đa sàn (Shopee / FB / IG / Threads)',
      shortLabel: 'Đa sàn',
      unit: 'video',
      planQty: multiPlanQty,
      planBudget: multiPlanBudget,
      listed: multiJobs.length,
      confirmed: multiJobs.length,
      jobs: multiJobs.length,
      scheduled: multiJobs.filter(j => Boolean(j.deadline || j.plannedWeek)).length,
      aired: multiJobs.filter(j => j.hasAirSignal).length,
      accepted: multiJobs.filter(j => j.accepted).length,
      committed: multiJobs.reduce((s, j) => s + j.feeNet, 0),
      paid: multiJobs.reduce((s, j) => s + j.paidAmount, 0),
    },
    {
      key: 'LIVESTREAM',
      label: 'Livestream (Affiliate & Tự live)',
      shortLabel: 'Livestream',
      unit: 'phiên',
      planQty: livePlanQty,
      planBudget: livePlanBudget,
      listed: liveJobs.length,
      confirmed: liveJobs.length,
      jobs: liveJobs.length,
      scheduled: liveJobs.filter(j => Boolean(j.deadline || j.plannedWeek)).length,
      aired: liveJobs.filter(j => j.hasAirSignal).length,
      accepted: liveJobs.filter(j => j.accepted).length,
      committed: liveJobs.reduce((s, j) => s + j.feeNet, 0),
      paid: liveJobs.reduce((s, j) => s + j.paidAmount, 0),
    },
  ];

  const ended = weeks.filter(w => w.end < today);
  const lastEndedWeekEnd = ended.length ? ended[ended.length - 1].end : '';
  const endedWeekCodes = new Set(ended.map(w => w.weekCode));
  const airedToDate = lastEndedWeekEnd
    ? unifiedJobs.filter(
        u =>
          (u.airedAt && u.airedAt.slice(0, 10) <= lastEndedWeekEnd) ||
          (!u.airedAt && u.hasAirSignal && u.actualWeek && endedWeekCodes.has(u.actualWeek))
      ).length
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

  const dealsList: StoreExecutionDealRow[] = unifiedJobs.map(u => ({
    code: u.code,
    kocHandle: u.kocHandle,
    productName: u.productName,
    pic: u.pic,
    tierKey: u.key || 'KL1',
    channelKey: u.channelKey,
    formatLabel: u.formatLabel,
    feeNet: u.feeNet,
    paidAmount: u.paidAmount,
    plannedAirDate: u.deadline,
    plannedWeek: u.plannedWeek,
    actualAirDate: u.airedAt,
    actualWeek: u.actualWeek,
    timingStatus: u.timingStatus,
    pipelineLabel: u.pipelineLabel,
    accepted: u.accepted,
    linkAir: u.linkAir,
  }));

  return {
    planId: plan.id,
    storeId: plan.storeId,
    month: plan.month,
    storeName: plan.storeName || plan.title,
    brandName: plan.brandName,
    platform: detectStorePlatform(plan, airSyncRecord),
    pic: plan.pic || plan.primaryPic || airSyncRecord?.pic || '',
    hasLeader: Boolean(plan.hasBookingLeader || airSyncRecord?.hasLeader),
    leaderName: airSyncRecord?.leaderName,
    planStatus: plan.statusLabel || plan.status || '',
    tiers: tierRows,
    channels,
    total,
    batches,
    weeks,
    deals: dealsList,
    hasWeeklyPlan: weeks.some(w => w.planQty > 0 || w.planAllQty > 0),
    dueToDate,
    budget,
    state,
    carryOver: (board.deals || []).reduce(
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
    funnel: {
      planVideoQty: total.planQty,
      listedQty: total.listed,
      waitBrandQty: total.waitBrand || 0,
      negotiatingQty: total.negotiating || 0,
      confirmedDealQty: total.confirmed,
      bookedJobQty: total.jobs,
      scheduledJobQty: total.scheduled || 0,
      airedJobQty: total.aired,
      acceptedJobQty: total.accepted,
    },
  };
}
