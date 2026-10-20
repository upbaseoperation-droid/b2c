/**
 * Logic dùng chung cho danh bạ KOC và hồ sơ KOC: loại hồ sơ pháp lý, che số nhạy cảm,
 * phát hiện hồ sơ trùng, quyền xem số đầy đủ, trạng thái booking.
 */

import type { BookingDealItem, KocItem, UserProfile } from '../../lib/types';
import type { StatusTone } from '../ui';

/* ------------------------------------------------------------- Pháp lý */

export type LegalType = 'INDIVIDUAL' | 'HOUSEHOLD' | 'COMPANY';

export const LEGAL_TYPE_LABEL: Record<LegalType, string> = {
  INDIVIDUAL: 'Cá nhân',
  HOUSEHOLD: 'Hộ kinh doanh',
  COMPANY: 'Công ty',
};

export function legalTypeOf(k: KocItem): LegalType {
  if (k.ocrDocumentType === 'BUSINESS_LICENSE') return 'COMPANY';
  if (k.ocrDocumentType === 'BUSINESS_HOUSEHOLD') return 'HOUSEHOLD';
  if (k.taxAccountType?.toLowerCase().includes('doanh nghiệp') || /CONG TY|CTY|TNHH|CO PHAN/i.test(k.companyName || k.realName || '')) {
    return 'COMPANY';
  }
  if (k.taxAccountType?.toLowerCase().includes('hộ kinh doanh')) {
    return 'HOUSEHOLD';
  }
  return 'INDIVIDUAL';
}

/** Số định danh dùng để ký hợp đồng: MST cho hộ kinh doanh / công ty, CCCD cho cá nhân. */
export function legalIdOf(k: KocItem): string {
  const digits = (s?: string) => (s || '').replace(/\D/g, '');
  if (legalTypeOf(k) !== 'INDIVIDUAL' && digits(k.taxCode).length >= 7) return k.taxCode!.trim();
  const cccd = digits(k.cccd);
  if (cccd.length >= 9 && !/^0+$/.test(cccd)) return (k.cccd || '').trim();
  if (digits(k.taxCode).length >= 7 && !/^0+$/.test(digits(k.taxCode))) return k.taxCode!.trim();
  return '';
}

export const hasLegalId = (k: KocItem) => legalIdOf(k) !== '';

/** Che số nhạy cảm, chỉ giữ 4 số cuối: 8549302194 → •••• 2194 */
export function mask(value?: string): string {
  const v = (value || '').replace(/\s/g, '');
  if (!v) return '';
  return `•••• ${v.slice(-4)}`;
}

/**
 * Ai được xem số CCCD / MST / tài khoản đầy đủ: quản trị, trưởng phòng, trưởng nhóm,
 * pháp chế, kế toán, quản trị ký số và PIC đang phụ trách hoặc từng làm việc với KOC đó.
 */
export function canRevealSensitive(user: UserProfile | undefined, k: KocItem): boolean {
  if (!user) return false;
  if (
    user.role === 'ADMIN' ||
    user.role === 'MANAGER' ||
    user.role === 'LEADER' ||
    user.role === 'FINANCE' ||
    user.role === 'LEGAL' ||
    user.role === 'SIGN_ADMIN'
  ) {
    return true;
  }
  const uName = user.name.trim().toLowerCase();
  if (!uName) return false;
  const picRaw = (k.bookingPic || '').toLowerCase();
  const workedRaw = (k.workedPicsList || '').toLowerCase();
  return picRaw.includes(uName) || workedRaw.includes(uName);
}

/* ---------------------------------------------------------- Trùng lặp */

export type DuplicateField = 'kênh' | 'SĐT' | 'Email' | 'CCCD' | 'MST';
export interface DuplicateMatch {
  kocId: string;
  stageName: string;
  fields: DuplicateField[];
}

/** Với mỗi KOC: danh sách hồ sơ khác trùng kênh, SĐT, Email, CCCD hoặc MST. */
export function findDuplicates(kocs: KocItem[]): Map<string, DuplicateMatch[]> {
  const keyers: Array<[DuplicateField, (k: KocItem) => string]> = [
    ['kênh', (k) => { const v = (k.channelId || '').trim().toLowerCase().replace(/^@/, ''); return v.length > 2 ? v : ''; }],
    ['SĐT', (k) => { const v = (k.phone || '').replace(/\D/g, ''); return v.length >= 9 ? v : ''; }],
    ['Email', (k) => { const v = (k.email || '').trim().toLowerCase(); return v.includes('@') && v.length >= 5 ? v : ''; }],
    ['CCCD', (k) => { const v = (k.cccd || '').replace(/\D/g, ''); return v.length >= 9 && !/^0+$/.test(v) ? v : ''; }],
    ['MST', (k) => { const v = (k.taxCode || '').trim(); return v.length >= 7 && !/^chưa/i.test(v) ? v : ''; }],
  ];
  const byId = new Map(kocs.map((k) => [k.id, k]));
  const result = new Map<string, Map<string, DuplicateMatch>>();

  for (const [field, keyOf] of keyers) {
    const groups = new Map<string, string[]>();
    for (const k of kocs) {
      const key = keyOf(k);
      if (!key) continue;
      let list = groups.get(key);
      if (!list) {
        list = [];
        groups.set(key, list);
      }
      list.push(k.id);
    }
    for (const ids of groups.values()) {
      if (ids.length < 2) continue;
      const sampleOthers = ids.slice(0, 15);
      for (const id of ids) {
        let matches = result.get(id);
        if (!matches) {
          matches = new Map<string, DuplicateMatch>();
          result.set(id, matches);
        }
        for (const other of sampleOthers) {
          if (other === id) continue;
          let m = matches.get(other);
          if (!m) {
            const otherKoc = byId.get(other);
            if (!otherKoc) continue;
            m = { kocId: other, stageName: otherKoc.stageName, fields: [] };
            matches.set(other, m);
          }
          if (!m.fields.includes(field)) m.fields.push(field);
        }
      }
    }
  }
  return new Map([...result].map(([id, m]) => [id, [...m.values()]]));
}

/* ------------------------------------------------------------- Booking */

const normHandle = (s?: string) => (s || '').trim().toLowerCase().replace(/^@/, '');
const normStage = (s?: string) => (s || '').trim().toLowerCase();

interface KocDealIndex {
  byId: Map<string, BookingDealItem[]>;
  byHandle: Map<string, BookingDealItem[]>;
  byStage: Map<string, BookingDealItem[]>;
}

const kocDealIndexCache = new WeakMap<BookingDealItem[], KocDealIndex>();

function getKocDealIndex(deals: BookingDealItem[]): KocDealIndex {
  let cached = kocDealIndexCache.get(deals);
  if (cached) return cached;

  const byId = new Map<string, BookingDealItem[]>();
  const byHandle = new Map<string, BookingDealItem[]>();
  const byStage = new Map<string, BookingDealItem[]>();

  for (const d of deals) {
    if (d.kocId) {
      let arr = byId.get(d.kocId);
      if (!arr) { arr = []; byId.set(d.kocId, arr); }
      arr.push(d);
    }
    if (d.kocChannelId) {
      const h = normHandle(d.kocChannelId);
      if (h) {
        let arr = byHandle.get(h);
        if (!arr) { arr = []; byHandle.set(h, arr); }
        arr.push(d);
      }
    }
    if (d.kocStageName) {
      const s = normStage(d.kocStageName);
      if (s) {
        let arr = byStage.get(s);
        if (!arr) { arr = []; byStage.set(s, arr); }
        arr.push(d);
      }
    }
  }

  cached = { byId, byHandle, byStage };
  kocDealIndexCache.set(deals, cached);
  return cached;
}

/** Các booking của một KOC, khớp theo id, rồi tới tên kênh / handle. */
export function dealsOfKoc(deals: BookingDealItem[] | undefined, k: KocItem): BookingDealItem[] {
  if (!deals || deals.length === 0) return [];
  const idx = getKocDealIndex(deals);
  const byIdList = idx.byId.get(k.id);
  const h = normHandle(k.channelId);
  const byHandleList = h ? idx.byHandle.get(h) : undefined;
  const s = normStage(k.stageName);
  const byStageList = s ? idx.byStage.get(s) : undefined;

  if (!byIdList && !byHandleList && !byStageList) return [];

  const seen = new Set<BookingDealItem>();
  const out: BookingDealItem[] = [];
  const addAll = (list?: BookingDealItem[]) => {
    if (!list) return;
    for (const d of list) {
      if (!seen.has(d)) {
        seen.add(d);
        out.push(d);
      }
    }
  };
  addAll(byIdList);
  addAll(byHandleList);
  addAll(byStageList);
  return out;
}

export const isDealOpen = (d: BookingDealItem) => d.status !== 'COMPLETED' && d.status !== 'CANCELLED' && d.status !== 'FINAL_PAID';

/** Đổi trạng thái deal về bộ 8 nhãn chuẩn của design system. */
export function dealStatusOf(d: BookingDealItem): { label: string; tone: StatusTone } {
  if (d.status === 'CANCELLED') return { label: 'Đã hủy', tone: 'neutral' };
  if (d.status === 'COMPLETED' || d.status === 'FINAL_PAID') return { label: 'Hoàn tất', tone: 'positive' };
  if (d.slaStatus === 'OVERDUE') return { label: 'Quá hạn', tone: 'critical' };
  if (d.status === 'DRAFT') return { label: 'Nháp', tone: 'neutral' };
  return { label: 'Đang chạy', tone: 'info' };
}

/** Bước hiện tại của deal, viết theo cách team gọi. */
export function dealStepOf(d: BookingDealItem): string {
  switch (d.status) {
    case 'DRAFT':
    case 'CONTACTING': return 'Đang liên hệ';
    case 'TERMS_AGREED':
    case 'CONTRACT_GENERATED':
    case 'ADVANCE_PAID': return 'Hợp đồng & tạm ứng';
    case 'SCRIPT_PENDING':
    case 'SCRIPT_APPROVED': return 'Kịch bản';
    case 'SAMPLE_SHIPPED': return 'Đang gửi mẫu';
    case 'SAMPLE_RECEIVED': return 'Đã nhận mẫu';
    case 'VIDEO_SUBMITTED':
    case 'VIDEO_VERIFIED': return 'Đã lên video';
    default: return '';
  }
}

export const picOfDeal = (d: BookingDealItem) => d.bookingPic || d.assignedStaff || '';

/** Số follower dạng ngắn: 680k · 1,2M */
export function formatFollowers(n?: number): string {
  if (!n) return '—';
  if (n >= 1e6) return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(n / 1e6)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}k`;
  return String(n);
}

/* ------------------------------------------------ Hiệu quả hợp tác chi tiết */

export interface KocPerformanceSummary {
  totalDeals: number;
  completedDeals: number;
  runningDeals: number;
  cancelledDeals: number;
  paidDealsCount: number;
  focDealsCount: number;
  totalSpentNet: number;
  totalFocCost: number;
  totalAdsBudget: number;
  totalInvestment: number;
  totalGmv: number;
  avgGmvPerVideo?: number;
  overallRoi: number;
  totalOrders: number;
  avgCpo: number;
  totalCollabViews: number;
  avgViewsPerCollab: number;
  avgCtr: number;
  avgCvr: number;
  onTimeScriptRate: number;
  onTimePostRate: number;
  sparkComplianceRate: number;
  avgRatingScore: number;
  uniqueBrands: string[];
  uniqueStores: string[];
}

export function calculateKocPerformanceStats(deals: BookingDealItem[], koc: KocItem): KocPerformanceSummary {
  const kocDeals = dealsOfKoc(deals, koc);
  const validDeals = kocDeals.filter((d) => d.status !== 'CANCELLED');
  const completedDeals = kocDeals.filter((d) => d.status === 'COMPLETED' || d.status === 'FINAL_PAID');
  const runningDeals = kocDeals.filter(isDealOpen);
  const cancelledDeals = kocDeals.filter((d) => d.status === 'CANCELLED');

  const dealsPaidCount = validDeals.filter((d) => (d.totalValue || 0) > 0).length;
  const dealsFocCount = validDeals.filter((d) => (d.totalValue || 0) === 0).length;
  const paidDealsCount = Math.max(dealsPaidCount, koc.totalPaidVideos || 0);
  const focDealsCount = Math.max(dealsFocCount, koc.totalFocVideos || 0);

  const dealsSpentNet = validDeals.reduce((s, d) => s + (d.totalValue || 0), 0);
  const totalSpentNet = Math.max(dealsSpentNet, koc.totalPastCost || 0);
  const totalFocCost = validDeals.reduce((s, d) => s + (d.focSampleCost || 0), 0);
  const totalAdsBudget = validDeals.reduce((s, d) => s + (d.sparkAdsBudget || 0), 0);
  const totalInvestment = totalSpentNet + totalFocCost + totalAdsBudget;

  const dealsGmv = validDeals.reduce((s, d) => s + (d.gmv30 || d.affiliateGmv || 0), 0);
  const totalGmv = Math.max(dealsGmv, koc.totalPastGmv || 0);
  const overallRoi = totalSpentNet > 0 ? totalGmv / totalSpentNet : (koc.historicalRoi || 0);

  const dealsOrders = validDeals.reduce((s, d) => s + (d.ordersCount || (d.gmv30 ? Math.round(d.gmv30 / (koc.aov || 250000)) : 0)), 0);
  const totalOrders = Math.max(dealsOrders, koc.itemsSold || 0);
  const avgCpo = totalOrders > 0 ? Math.round(totalSpentNet / totalOrders) : 0;

  const totalCollabViews = validDeals.reduce((s, d) => s + (d.viewsCount || 0), 0);
  const avgViewsPerCollab = validDeals.length > 0 ? Math.round(totalCollabViews / validDeals.length) : (koc.avgViews || 0);

  // Tỷ lệ CTR / CVR trung bình
  const dealsWithCtr = validDeals.filter((d) => typeof d.ctr === 'number');
  const avgCtr = dealsWithCtr.length > 0 ? dealsWithCtr.reduce((s, d) => s + (d.ctr || 0), 0) / dealsWithCtr.length : (koc.tiktokAvgCtr || 0);

  const dealsWithCvr = validDeals.filter((d) => typeof d.cvr === 'number');
  const avgCvr = dealsWithCvr.length > 0 ? dealsWithCvr.reduce((s, d) => s + (d.cvr || 0), 0) / dealsWithCvr.length : (koc.tiktokAvgCvr || 0);

  // Tiến độ & Tuân thủ (RULE-DATA-01: Không sinh chỉ số giả khi chưa có deal thực tế)
  const dealsWithScriptStatus = validDeals.filter((d) => typeof d.isScriptOnTime === 'boolean');
  const onTimeScriptRate = dealsWithScriptStatus.length > 0
    ? Math.round((dealsWithScriptStatus.filter((d) => d.isScriptOnTime).length / dealsWithScriptStatus.length) * 100)
    : 0;

  const dealsWithPostStatus = validDeals.filter((d) => typeof d.isPostOnTime === 'boolean');
  const onTimePostRate = dealsWithPostStatus.length > 0
    ? Math.round((dealsWithPostStatus.filter((d) => d.isPostOnTime).length / dealsWithPostStatus.length) * 100)
    : 0;

  const sparkComplianceRate = validDeals.length > 0
    ? Math.round((validDeals.filter((d) => d.adsCodeStatus === 'ĐÃ_NGHIỆM_THU').length / validDeals.length) * 100)
    : 0;

  const dealsWithRating = validDeals.filter((d) => typeof d.ratingScore === 'number' && d.ratingScore > 0);
  const avgRatingScore = dealsWithRating.length > 0
    ? Number((dealsWithRating.reduce((s, d) => s + (d.ratingScore || 0), 0) / dealsWithRating.length).toFixed(1))
    : 0;

  const uniqueBrands = Array.from(new Set([...validDeals.map((d) => d.brandName), koc.brandName].filter((x): x is string => Boolean(x))));
  const uniqueStores = Array.from(new Set(validDeals.map((d) => d.storeName).filter(Boolean) as string[]));

  const totalDealsCount = Math.max(kocDeals.length, koc.totalPastDeals || 0);
  const completedDealsCount = Math.max(completedDeals.length, Math.max(0, totalDealsCount - runningDeals.length - cancelledDeals.length));

  return {
    totalDeals: totalDealsCount,
    completedDeals: completedDealsCount,
    runningDeals: runningDeals.length,
    cancelledDeals: cancelledDeals.length,
    paidDealsCount,
    focDealsCount,
    totalSpentNet,
    totalFocCost,
    totalAdsBudget,
    totalInvestment,
    totalGmv,
    overallRoi,
    totalOrders,
    avgCpo,
    totalCollabViews,
    avgViewsPerCollab,
    avgCtr,
    avgCvr,
    onTimeScriptRate,
    onTimePostRate,
    sparkComplianceRate,
    avgRatingScore,
    uniqueBrands,
    uniqueStores,
  };
}
