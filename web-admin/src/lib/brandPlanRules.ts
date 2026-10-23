import type { InputPlanBreakdownState, PlanTierKey, PlanWeekRow } from './types';
import { SELF_TYPES, TIER_KEYS, resolveWeekRows, weekLabelsForMonth } from './planBreakdownRules';

/**
 * Plan thÃ¡ng cá»§a Brand (file "Monthly Content & Key Visual Plan"):
 * 01 Äá»‹nh hÆ°á»›ng Â· 02 KPI Â· 03 Key Visual Â· 04 TikTok Shop Â· 05 Shopee Â· Pillar.
 * Báº£ng sá»‘ lÆ°á»£ng / ngÃ¢n sÃ¡ch theo tuáº§n khÃ´ng nháº­p tay mÃ  cá»™ng tá»« cÃ¡c dÃ²ng Chi tiáº¿t Content.
 */

export type PlanChannel = 'TIKTOK' | 'SHOPEE';
export const CHANNEL_LABEL: Record<PlanChannel, string> = { TIKTOK: 'TikTok Shop', SHOPEE: 'Shopee' };

export type ContentSource = 'AFFILIATE' | 'SELF' | 'LIVE_AFF' | 'LIVE_SELF';
export const SOURCE_LABEL: Record<ContentSource, string> = {
  AFFILIATE: 'Video affiliate',
  SELF: 'Video self',
  LIVE_AFF: 'Livestream affiliate',
  LIVE_SELF: 'Livestream self',
};
export const SOURCES = Object.keys(SOURCE_LABEL) as ContentSource[];

export const KL_OPTIONS = ['TAP', ...TIER_KEYS] as const;

export const DIRECTION_FIELDS: { key: string; label: string }[] = [
  { key: 'role', label: 'Vai trÃ² trong plan nÄƒm' },
  { key: 'goal', label: 'Má»¥c tiÃªu & rÃ o cáº£n cáº§n xá»­ lÃ½' },
  { key: 'heroSku', label: 'Hero SKU / USP / RTB' },
  { key: 'seasonal', label: 'Seasonal opportunity' },
  { key: 'bigIdea', label: 'Big idea / monthly theme' },
  { key: 'review', label: 'Review / bÃ i há»c thÃ¡ng trÆ°á»›c' },
  { key: 'audience', label: 'Tá»‡p khÃ¡ch hÃ ng & insight' },
  { key: 'offer', label: 'Combo / deal / quÃ  táº·ng' },
  { key: 'campaign', label: 'Campaign / má»‘c sale' },
  { key: 'keyMessage', label: 'Key message' },
];

export const KEY_VISUAL_FIELDS: { key: string; label: string; long?: boolean }[] = [
  { key: 'theme', label: 'Chá»§ Ä‘á»' },
  { key: 'font', label: 'Font' },
  { key: 'moodboard', label: 'Moodboard', long: true },
  { key: 'proposalLink', label: 'Link proposal' },
  { key: 'promo', label: 'CTKM', long: true },
];

/* ------------------------------------------------------------------ KPI */

/** Mốc Key Visual theo từng phiên bản (Master, Adapt 11.11, Black Friday...). Ngày dạng yyyy-mm-dd. */
export interface KeyVisualMilestone {
  id: string;
  name: string;
  refDate: string;
  orderDate: string;
  draftDate: string;
  approveDate: string;
  hangDate: string;
  note: string;
}

export const MILESTONE_DATES: { key: 'refDate' | 'orderDate' | 'draftDate' | 'approveDate' | 'hangDate'; label: string }[] = [
  { key: 'refDate', label: 'Lên Ref' },
  { key: 'orderDate', label: 'Order' },
  { key: 'draftDate', label: 'Draft' },
  { key: 'approveDate', label: 'Duyệt' },
  { key: 'hangDate', label: 'Treo' },
];

export function newMilestone(name = ''): KeyVisualMilestone {
  return { id: newId('KV'), name, refDate: '', orderDate: '', draftDate: '', approveDate: '', hangDate: '', note: '' };
}

const isoDay = (s: string): number | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const t = Date.parse(`${s}T00:00:00Z`);
  return Number.isFinite(t) ? Math.round(t / 86400000) : null;
};
/** Số ngày từ mốc a đến mốc b; null nếu thiếu ngày. */
export function daysBetween(a: string, b: string): number | null {
  const x = isoDay(a);
  const y = isoDay(b);
  return x === null || y === null ? null : y - x;
}
export type KpiUnit = 'vnd' | 'int' | 'pct' | 'ratio';
export interface KpiRowDef {
  key: string;
  group: string;
  label: string;
  unit: KpiUnit;
  /** input: nháº­p tay Â· derived: tÃ­nh tá»« cÃ¡c dÃ²ng khÃ¡c */
  kind: 'input' | 'derived';
}

export const KPI_ROWS: KpiRowDef[] = [
  { key: 'gmv', group: 'Chá»‰ sá»‘ chÃ­nh', label: 'GMV nhÃ  bÃ¡n', unit: 'vnd', kind: 'input' },
  { key: 'nmv', group: 'Chá»‰ sá»‘ chÃ­nh', label: 'NMV nhÃ  bÃ¡n', unit: 'vnd', kind: 'input' },
  { key: 'orders', group: 'Chá»‰ sá»‘ chÃ­nh', label: 'ÄÆ¡n hÃ ng', unit: 'int', kind: 'input' },
  { key: 'traffic', group: 'Chá»‰ sá»‘ chÃ­nh', label: 'LÆ°á»£t truy cáº­p', unit: 'int', kind: 'input' },
  { key: 'cr', group: 'Chá»‰ sá»‘ chÃ­nh', label: 'Tá»· lá»‡ chuyá»ƒn Ä‘á»•i (CR)', unit: 'pct', kind: 'derived' },
  { key: 'aov', group: 'Chá»‰ sá»‘ chÃ­nh', label: 'GiÃ¡ trung bÃ¬nh/Ä‘Æ¡n hÃ ng (AOV)', unit: 'vnd', kind: 'derived' },
  { key: 'cancelRate', group: 'Chá»‰ sá»‘ chÃ­nh', label: 'Tá»· lá»‡ há»§y', unit: 'pct', kind: 'input' },
  { key: 'promoCost', group: 'Chá»‰ sá»‘ chÃ­nh', label: 'Tá»•ng chi phÃ­ thÃºc Ä‘áº©y (-VAT)', unit: 'vnd', kind: 'derived' },
  { key: 'promoPct', group: 'Chá»‰ sá»‘ chÃ­nh', label: '% Chi phÃ­ thÃºc Ä‘áº©y / NMV', unit: 'pct', kind: 'derived' },
  { key: 'gmvActivities', group: 'Doanh thu cÃ¡c hoáº¡t Ä‘á»™ng', label: 'GMV tá»« cÃ¡c hoáº¡t Ä‘á»™ng', unit: 'vnd', kind: 'derived' },
  { key: 'gmvVideo', group: 'Doanh thu cÃ¡c hoáº¡t Ä‘á»™ng', label: 'GMV video', unit: 'vnd', kind: 'input' },
  { key: 'gmvLive', group: 'Doanh thu cÃ¡c hoáº¡t Ä‘á»™ng', label: 'GMV Livestream', unit: 'vnd', kind: 'input' },
  { key: 'gmvCard', group: 'Doanh thu cÃ¡c hoáº¡t Ä‘á»™ng', label: 'GMV Tháº» sáº£n pháº©m', unit: 'vnd', kind: 'input' },
  { key: 'mktTotal', group: 'Chi phÃ­ Marketing thÃºc Ä‘áº©y', label: 'Tá»•ng chi phÃ­ Marketing (-VAT)', unit: 'vnd', kind: 'derived' },
  { key: 'costBookingVideo', group: 'Chi phÃ­ Marketing thÃºc Ä‘áº©y', label: 'Chi phÃ­ booking video affiliate', unit: 'vnd', kind: 'input' },
  { key: 'costSelfVideo', group: 'Chi phÃ­ Marketing thÃºc Ä‘áº©y', label: 'Chi phÃ­ video self channel', unit: 'vnd', kind: 'input' },
  { key: 'costAds', group: 'Chi phÃ­ Marketing thÃºc Ä‘áº©y', label: 'Chi phÃ­ ads', unit: 'vnd', kind: 'input' },
  { key: 'costBookingLive', group: 'Chi phÃ­ Marketing thÃºc Ä‘áº©y', label: 'Chi phÃ­ booking livestream affiliate', unit: 'vnd', kind: 'input' },
  { key: 'costSelfLive', group: 'Chi phÃ­ Marketing thÃºc Ä‘áº©y', label: 'Chi phÃ­ livestream self channel', unit: 'vnd', kind: 'input' },
  { key: 'costDisplay', group: 'Chi phÃ­ Marketing thÃºc Ä‘áº©y', label: 'Chi phÃ­ gÃ³i dá»‹ch vá»¥ hiá»ƒn thá»‹', unit: 'vnd', kind: 'input' },
  { key: 'costOther', group: 'Chi phÃ­ Marketing thÃºc Ä‘áº©y', label: 'Chi phÃ­ khÃ¡c (net)', unit: 'vnd', kind: 'input' },
  { key: 'otherTotal', group: 'Chi phÃ­ khÃ¡c (ghi nháº­n chung vá»›i phÃ­ sÃ n)', label: 'Tá»•ng chi phÃ­ khÃ¡c', unit: 'vnd', kind: 'derived' },
  { key: 'affFee', group: 'Chi phÃ­ khÃ¡c (ghi nháº­n chung vá»›i phÃ­ sÃ n)', label: 'Chi phÃ­ tiáº¿p thá»‹ liÃªn káº¿t', unit: 'vnd', kind: 'input' },
  { key: 'affFeeAds', group: 'Chi phÃ­ khÃ¡c (ghi nháº­n chung vá»›i phÃ­ sÃ n)', label: 'Chi phÃ­ tiáº¿p thá»‹ liÃªn káº¿t (cÃ³ cháº¡y ads)', unit: 'vnd', kind: 'input' },
];

export type KpiColumn = 'shopee' | 'tiktok';
export type KpiInputs = Record<string, Partial<Record<KpiColumn, number | null>>>;
export type KpiCell = number | null;
export type KpiTable = Record<string, { shopee: KpiCell; tiktok: KpiCell; total: KpiCell }>;

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const sumKnown = (vals: KpiCell[]): KpiCell => {
  const known = vals.filter((v): v is number => v !== null);
  return known.length ? known.reduce((s, v) => s + v, 0) : null;
};
const div = (a: KpiCell, b: KpiCell): KpiCell => (a !== null && b !== null && b !== 0 ? a / b : null);

/** TÃ­nh toÃ n bá»™ báº£ng KPI. Ã” thiáº¿u dá»¯ liá»‡u giá»¯ null (hiá»ƒn thá»‹ "â€”"), khÃ´ng tá»± Ä‘iá»n sá»‘. */
export function computeKpi(inputs: KpiInputs): KpiTable {
  const table: KpiTable = {};
  const get = (key: string, col: KpiColumn): KpiCell => num(inputs[key]?.[col]);
  for (const col of ['shopee', 'tiktok'] as KpiColumn[]) {
    const v: Record<string, KpiCell> = {};
    for (const r of KPI_ROWS) if (r.kind === 'input') v[r.key] = get(r.key, col);
    v.cr = div(v.orders, v.traffic);
    v.aov = div(v.gmv, v.orders);
    v.mktTotal = sumKnown(['costBookingVideo', 'costSelfVideo', 'costAds', 'costBookingLive', 'costSelfLive', 'costDisplay', 'costOther'].map(k => v[k]));
    v.promoCost = v.mktTotal;
    v.promoPct = div(v.promoCost, v.nmv);
    v.gmvActivities = sumKnown([v.gmvVideo, v.gmvLive, v.gmvCard]);
    v.otherTotal = sumKnown([v.affFee, v.affFeeAds]);
    for (const r of KPI_ROWS) {
      table[r.key] = table[r.key] || { shopee: null, tiktok: null, total: null };
      table[r.key][col] = v[r.key];
    }
  }
  const totals: Record<string, KpiCell> = {};
  const additive = KPI_ROWS.filter(r => r.kind === 'input' && r.unit !== 'pct').map(r => r.key);
  for (const k of additive) totals[k] = sumKnown([table[k].shopee, table[k].tiktok]);
  totals.cr = div(totals.orders, totals.traffic);
  totals.aov = div(totals.gmv, totals.orders);
  totals.mktTotal = sumKnown(['costBookingVideo', 'costSelfVideo', 'costAds', 'costBookingLive', 'costSelfLive', 'costDisplay', 'costOther'].map(k => totals[k]));
  totals.promoCost = totals.mktTotal;
  totals.promoPct = div(totals.promoCost, totals.nmv);
  totals.gmvActivities = sumKnown([totals.gmvVideo, totals.gmvLive, totals.gmvCard]);
  totals.otherTotal = sumKnown([totals.affFee, totals.affFeeAds]);
  // Tá»· lá»‡ há»§y tá»•ng: bÃ¬nh quÃ¢n theo sá»‘ Ä‘Æ¡n cá»§a tá»«ng sÃ n
  const o1 = table.orders.shopee;
  const o2 = table.orders.tiktok;
  const c1 = table.cancelRate.shopee;
  const c2 = table.cancelRate.tiktok;
  if (c1 !== null && c2 !== null && o1 !== null && o2 !== null && o1 + o2 > 0) totals.cancelRate = (c1 * o1 + c2 * o2) / (o1 + o2);
  else totals.cancelRate = null;
  for (const r of KPI_ROWS) table[r.key].total = totals[r.key] ?? null;
  return table;
}

/* ------------------------------------------------- Tá»•ng quan TikTok Shop */

export interface OverviewMetricDef {
  key: string;
  group: string;
  label: string;
  unit: KpiUnit;
  kind: 'input' | 'derived';
}

export const OVERVIEW_GROUPS = ['Video self channel', 'Video affiliate', 'Livestream self channel', 'Livestream affiliate'] as const;

export const OVERVIEW_METRICS: OverviewMetricDef[] = [
  { key: 'self_rev', group: 'Video self channel', label: 'Doanh thu video self channel', unit: 'vnd', kind: 'input' },
  { key: 'self_count', group: 'Video self channel', label: 'Sá»‘ ná»™i dung self (áº£nh trÆ°á»£t)', unit: 'int', kind: 'input' },
  { key: 'self_cost', group: 'Video self channel', label: 'Chi phÃ­ video self channel', unit: 'vnd', kind: 'input' },
  { key: 'self_ratio', group: 'Video self channel', label: 'GMV / chi phÃ­ (há»‡ sá»‘, khÃ´ng pháº£i lá»£i nhuáº­n)', unit: 'ratio', kind: 'derived' },
  { key: 'aff_rev', group: 'Video affiliate', label: 'Doanh thu video affiliate', unit: 'vnd', kind: 'input' },
  { key: 'aff_total', group: 'Video affiliate', label: 'Tá»•ng video AFF (booking + TAP)', unit: 'int', kind: 'input' },
  { key: 'aff_koc', group: 'Video affiliate', label: 'KOC: KL1â€“KL5', unit: 'int', kind: 'input' },
  { key: 'aff_kol', group: 'Video affiliate', label: 'KOL: KL6â€“KL7', unit: 'int', kind: 'input' },
  { key: 'aff_tap', group: 'Video affiliate', label: 'TAP', unit: 'int', kind: 'input' },
  { key: 'aff_aware', group: 'Video affiliate', label: 'Awareness + Engagement (nhÃ£n má»¥c tiÃªu)', unit: 'int', kind: 'input' },
  { key: 'aff_brand', group: 'Video affiliate', label: 'Branding (nhÃ£n má»¥c tiÃªu)', unit: 'int', kind: 'input' },
  { key: 'aff_cost', group: 'Video affiliate', label: 'Chi phÃ­ booking video affiliate', unit: 'vnd', kind: 'input' },
  { key: 'aff_ratio', group: 'Video affiliate', label: 'GMV / chi phÃ­ (há»‡ sá»‘, khÃ´ng pháº£i lá»£i nhuáº­n)', unit: 'ratio', kind: 'derived' },
  { key: 'live_rev', group: 'Livestream self channel', label: 'Doanh thu livestream self channel', unit: 'vnd', kind: 'input' },
  { key: 'live_orders', group: 'Livestream self channel', label: 'Sá»‘ Ä‘Æ¡n hÃ ng livestream self channel', unit: 'int', kind: 'input' },
  { key: 'live_aov', group: 'Livestream self channel', label: 'AOV livestream self channel', unit: 'vnd', kind: 'derived' },
  { key: 'live_avg', group: 'Livestream self channel', label: 'GMV trung bÃ¬nh/phiÃªn live', unit: 'vnd', kind: 'derived' },
  { key: 'live_sessions', group: 'Livestream self channel', label: 'Sá»‘ phiÃªn livestream self channel (2h)', unit: 'int', kind: 'input' },
  { key: 'live_cost', group: 'Livestream self channel', label: 'Chi phÃ­ livestream self channel', unit: 'vnd', kind: 'input' },
  { key: 'live_ratio', group: 'Livestream self channel', label: 'GMV / chi phÃ­ (há»‡ sá»‘, khÃ´ng pháº£i lá»£i nhuáº­n)', unit: 'ratio', kind: 'derived' },
  { key: 'laff_rev', group: 'Livestream affiliate', label: 'Doanh thu livestream affiliate', unit: 'vnd', kind: 'input' },
  { key: 'laff_orders', group: 'Livestream affiliate', label: 'Sá»‘ Ä‘Æ¡n hÃ ng livestream affiliate', unit: 'int', kind: 'input' },
  { key: 'laff_aov', group: 'Livestream affiliate', label: 'AOV livestream affiliate', unit: 'vnd', kind: 'derived' },
  { key: 'laff_sessions', group: 'Livestream affiliate', label: 'Sá»‘ phiÃªn livestream affiliate', unit: 'int', kind: 'input' },
  { key: 'laff_cost', group: 'Livestream affiliate', label: 'Chi phÃ­ booking livestream affiliate', unit: 'vnd', kind: 'input' },
  { key: 'laff_ratio', group: 'Livestream affiliate', label: 'GMV / chi phÃ­ (há»‡ sá»‘, khÃ´ng pháº£i lá»£i nhuáº­n)', unit: 'ratio', kind: 'derived' },
];

export type OverviewInputs = Record<string, number | null | undefined>;

export function computeOverview(inputs: OverviewInputs): Record<string, KpiCell> {
  const g = (k: string): KpiCell => num(inputs[k]);
  return {
    ...Object.fromEntries(OVERVIEW_METRICS.filter(m => m.kind === 'input').map(m => [m.key, g(m.key)])),
    self_ratio: div(g('self_rev'), g('self_cost')),
    aff_ratio: div(g('aff_rev'), g('aff_cost')),
    live_aov: div(g('live_rev'), g('live_orders')),
    live_avg: div(g('live_rev'), g('live_sessions')),
    live_ratio: div(g('live_rev'), g('live_cost')),
    laff_aov: div(g('laff_rev'), g('laff_orders')),
    laff_ratio: div(g('laff_rev'), g('laff_cost')),
  };
}

/* ------------------------------------------------------------- Dá»¯ liá»‡u */

export interface BrandPlanPillar {
  id: string;
  name: string;
  goal: string;
  insight: string;
  message: string;
  angle: string;
  format: string;
  /** Tá»· trá»ng video dá»± kiáº¿n (0â€“100) */
  sharePct: number | null;
}

export interface BrandPlanRow {
  id: string;
  channel: PlanChannel;
  week: string;
  airDate: string;
  sku: string;
  /** Nhóm sản phẩm trong danh mục sản phẩm của Brand. */
  productGroupId: string;
  source: ContentSource;
  /** Báº­c KL hoáº·c TAP (chá»‰ dÃ¹ng cho Video affiliate) */
  kl: string;
  kocCriteria: string;
  pillarId: string;
  goal: string;
  angle: string;
  type: string;
  production: string;
  qty: number | null;
  /** NgÃ¢n sÃ¡ch Net (chÆ°a VAT) */
  budget: number | null;
  pic: string;
  note: string;
}

export type BrandPlanApprovalStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'CHANGES';
export const APPROVAL_LABEL: Record<BrandPlanApprovalStatus, string> = { DRAFT: 'Nháp', PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', CHANGES: 'Cần sửa' };

export interface BrandPlanApproval {
  status: BrandPlanApprovalStatus;
  submittedBy: string;
  submittedAt: string;
  decidedBy: string;
  decidedAt: string;
  note: string;
}

export const EMPTY_APPROVAL: BrandPlanApproval = { status: 'DRAFT', submittedBy: '', submittedAt: '', decidedBy: '', decidedAt: '', note: '' };
export interface BrandPlanData {
  approval: BrandPlanApproval;
  planner: string;
  statusNote: string;
  direction: Record<string, string>;
  kpi: KpiInputs;
  kpiNote: string;
  keyVisual: Record<string, string>;
  milestones: KeyVisualMilestone[];
  overview: OverviewInputs;
  overviewNotes: Record<string, string>;
  pillars: BrandPlanPillar[];
  weekTargets: Record<PlanChannel, Record<string, { gmv?: number | null; views?: number | null }>>;
  rows: BrandPlanRow[];
}

export const EMPTY_BRAND_PLAN: BrandPlanData = {
  approval: EMPTY_APPROVAL,
  planner: '',
  statusNote: '',
  direction: {},
  kpi: {},
  kpiNote: '',
  keyVisual: {},
  milestones: [],
  overview: {},
  overviewNotes: {},
  pillars: [],
  weekTargets: { TIKTOK: {}, SHOPEE: {} },
  rows: [],
};

export const newId = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function newPillar(): BrandPlanPillar {
  return { id: '', name: '', goal: '', insight: '', message: '', angle: '', format: '', sharePct: null };
}

export function newRow(channel: PlanChannel, week: string, source: ContentSource = 'AFFILIATE'): BrandPlanRow {
  return {
    id: newId('PR'),
    channel,
    week,
    airDate: '',
    sku: '',
    productGroupId: '',
    source,
    kl: '',
    kocCriteria: '',
    pillarId: '',
    goal: '',
    angle: '',
    type: source === 'AFFILIATE' || source === 'SELF' ? 'Video' : 'Livestream',
    production: '',
    qty: null,
    budget: null,
    pic: '',
    note: '',
  };
}

/** LÃ m sáº¡ch dá»¯ liá»‡u nháº­n tá»« mÃ¡y khÃ¡ch (giá»›i háº¡n Ä‘á»™ dÃ i, kiá»ƒu dá»¯ liá»‡u). */
export function sanitizeBrandPlan(input: Partial<BrandPlanData> | undefined): BrandPlanData {
  const s = (v: unknown, max = 2000) => (typeof v === 'string' ? v.slice(0, max) : '');
  const n = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const rec = (v: unknown, max = 2000): Record<string, string> => {
    const out: Record<string, string> = {};
    if (v && typeof v === 'object') for (const [k, val] of Object.entries(v as Record<string, unknown>).slice(0, 60)) out[k.slice(0, 40)] = s(val, max);
    return out;
  };
  const dateStr = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
  const milestones: KeyVisualMilestone[] = (Array.isArray(input?.milestones) ? input!.milestones! : []).slice(0, 20).map(m => ({
    id: s(m?.id, 40) || newId('KV'),
    name: s(m?.name, 120),
    refDate: dateStr(m?.refDate),
    orderDate: dateStr(m?.orderDate),
    draftDate: dateStr(m?.draftDate),
    approveDate: dateStr(m?.approveDate),
    hangDate: dateStr(m?.hangDate),
    note: s(m?.note, 500),
  }));
  const approvalIn = input?.approval;
  const approval: BrandPlanApproval = {
    status: (['DRAFT', 'PENDING', 'APPROVED', 'CHANGES'] as const).includes(approvalIn?.status as BrandPlanApprovalStatus) ? (approvalIn!.status as BrandPlanApprovalStatus) : 'DRAFT',
    submittedBy: s(approvalIn?.submittedBy, 120),
    submittedAt: s(approvalIn?.submittedAt, 40),
    decidedBy: s(approvalIn?.decidedBy, 120),
    decidedAt: s(approvalIn?.decidedAt, 40),
    note: s(approvalIn?.note, 500),
  };
  const kpi: KpiInputs = {};
  if (input?.kpi && typeof input.kpi === 'object') {
    for (const [k, val] of Object.entries(input.kpi).slice(0, 60)) {
      kpi[k.slice(0, 40)] = { shopee: n((val as { shopee?: unknown })?.shopee), tiktok: n((val as { tiktok?: unknown })?.tiktok) };
    }
  }
  const overview: OverviewInputs = {};
  if (input?.overview && typeof input.overview === 'object') for (const [k, val] of Object.entries(input.overview).slice(0, 60)) overview[k.slice(0, 40)] = n(val);
  const weekTargets: BrandPlanData['weekTargets'] = { TIKTOK: {}, SHOPEE: {} };
  for (const ch of ['TIKTOK', 'SHOPEE'] as PlanChannel[]) {
    const src = input?.weekTargets?.[ch];
    if (src && typeof src === 'object') for (const [w, val] of Object.entries(src).slice(0, 12)) weekTargets[ch][w.slice(0, 40)] = { gmv: n(val?.gmv), views: n(val?.views) };
  }
  const pillars = (Array.isArray(input?.pillars) ? input!.pillars! : []).slice(0, 40).map(p => ({
    id: s(p?.id, 20),
    name: s(p?.name, 120),
    goal: s(p?.goal, 500),
    insight: s(p?.insight, 500),
    message: s(p?.message, 500),
    angle: s(p?.angle, 500),
    format: s(p?.format, 200),
    sharePct: n(p?.sharePct),
  }));
  const rows = (Array.isArray(input?.rows) ? input!.rows! : []).slice(0, 1500).map(r => ({
    id: s(r?.id, 40) || newId('PR'),
    channel: (r?.channel === 'SHOPEE' ? 'SHOPEE' : 'TIKTOK') as PlanChannel,
    week: s(r?.week, 60),
    airDate: s(r?.airDate, 60),
    sku: s(r?.sku, 300),
    productGroupId: s(r?.productGroupId, 40),
    source: (SOURCES.includes(r?.source as ContentSource) ? r.source : 'AFFILIATE') as ContentSource,
    kl: s(r?.kl, 10),
    kocCriteria: s(r?.kocCriteria, 500),
    pillarId: s(r?.pillarId, 20),
    goal: s(r?.goal, 200),
    angle: s(r?.angle, 1000),
    type: s(r?.type, 60),
    production: s(r?.production, 60),
    qty: n(r?.qty),
    budget: n(r?.budget),
    pic: s(r?.pic, 120),
    note: s(r?.note, 500),
  }));
  return {
    approval,
    planner: s(input?.planner, 200),
    statusNote: s(input?.statusNote, 300),
    direction: rec(input?.direction),
    kpi,
    kpiNote: s(input?.kpiNote),
    keyVisual: rec(input?.keyVisual),
    milestones,
    overview,
    overviewNotes: rec(input?.overviewNotes),
    pillars,
    weekTargets,
    rows,
  };
}

/* ------------------------------------------------- Cá»™ng theo tuáº§n */

export interface WeekAggregate {
  week: string;
  /** Video affiliate theo báº­c (gá»“m TAP) */
  affByKl: Record<string, { qty: number; budget: number }>;
  affQty: number;
  affBudget: number;
  selfQty: number;
  selfBudget: number;
  liveAffQty: number;
  liveAffBudget: number;
  liveSelfQty: number;
  liveSelfBudget: number;
  totalQty: number;
  totalBudget: number;
}

const n0 = (v: number | null | undefined) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export function aggregateWeeks(rows: BrandPlanRow[], channel: PlanChannel, weeks: string[]): WeekAggregate[] {
  const labels = [...weeks];
  for (const r of rows) if (r.channel === channel && r.week && !labels.includes(r.week)) labels.push(r.week);
  return labels.map(week => {
    const a: WeekAggregate = {
      week,
      affByKl: Object.fromEntries(KL_OPTIONS.map(k => [k, { qty: 0, budget: 0 }])),
      affQty: 0,
      affBudget: 0,
      selfQty: 0,
      selfBudget: 0,
      liveAffQty: 0,
      liveAffBudget: 0,
      liveSelfQty: 0,
      liveSelfBudget: 0,
      totalQty: 0,
      totalBudget: 0,
    };
    for (const r of rows) {
      if (r.channel !== channel || r.week !== week) continue;
      const q = n0(r.qty);
      const b = n0(r.budget);
      if (r.source === 'AFFILIATE') {
        a.affQty += q;
        a.affBudget += b;
        if (a.affByKl[r.kl]) {
          a.affByKl[r.kl].qty += q;
          a.affByKl[r.kl].budget += b;
        }
      } else if (r.source === 'SELF') {
        a.selfQty += q;
        a.selfBudget += b;
      } else if (r.source === 'LIVE_AFF') {
        a.liveAffQty += q;
        a.liveAffBudget += b;
      } else {
        a.liveSelfQty += q;
        a.liveSelfBudget += b;
      }
    }
    a.totalQty = a.affQty + a.selfQty + a.liveAffQty + a.liveSelfQty;
    a.totalBudget = a.affBudget + a.selfBudget + a.liveAffBudget + a.liveSelfBudget;
    return a;
  });
}

export interface ChannelTotals {
  affQty: number;
  affBudget: number;
  selfQty: number;
  selfBudget: number;
  liveAffQty: number;
  liveAffBudget: number;
  liveSelfQty: number;
  liveSelfBudget: number;
  totalQty: number;
  totalBudget: number;
}

export function sumWeeks(weeks: WeekAggregate[]): ChannelTotals {
  const t: ChannelTotals = { affQty: 0, affBudget: 0, selfQty: 0, selfBudget: 0, liveAffQty: 0, liveAffBudget: 0, liveSelfQty: 0, liveSelfBudget: 0, totalQty: 0, totalBudget: 0 };
  for (const w of weeks) {
    t.affQty += w.affQty;
    t.affBudget += w.affBudget;
    t.selfQty += w.selfQty;
    t.selfBudget += w.selfBudget;
    t.liveAffQty += w.liveAffQty;
    t.liveAffBudget += w.liveAffBudget;
    t.liveSelfQty += w.liveSelfQty;
    t.liveSelfBudget += w.liveSelfBudget;
    t.totalQty += w.totalQty;
    t.totalBudget += w.totalBudget;
  }
  return t;
}

/** Nháº­n ra sÃ n cá»§a gian hÃ ng tá»« tÃªn gian hÃ ng; khÃ´ng nháº­n ra thÃ¬ tráº£ null. */
export function detectChannel(plan: Pick<InputPlanBreakdownState, 'storeName' | 'title' | 'storeId'>): PlanChannel | null {
  const text = `${plan.storeName || ''} ${plan.title || ''} ${plan.storeId || ''}`.toLowerCase();
  if (/tiktok|tts|\bttshop\b/.test(text)) return 'TIKTOK';
  if (/shopee|\bshp\b/.test(text)) return 'SHOPEE';
  return null;
}

/* --------------------------------------------------------- Kiá»ƒm tra */

export interface BrandPlanIssue {
  level: 'error' | 'warning';
  scope: string;
  text: string;
}

const fmtN = (v: number) => Math.round(v).toLocaleString('vi-VN');

function weekRowOf(rows: PlanWeekRow[], week: string): PlanWeekRow | undefined {
  return rows.find(r => r.week === week);
}

export function diagnoseBrandPlan(plan: InputPlanBreakdownState, data: BrandPlanData, members: string[] = [], channelHint: PlanChannel | null = null, productGroups: { id: string; name: string }[] | null = null): BrandPlanIssue[] {
  const issues: BrandPlanIssue[] = [];
  const weeks = weekLabelsForMonth(plan.month);
  const pillarIds = new Set(data.pillars.map(p => p.id).filter(Boolean));

  // Pillar
  const ids = data.pillars.map(p => p.id.trim()).filter(Boolean);
  if (new Set(ids).size !== ids.length) issues.push({ level: 'error', scope: 'Pillar', text: 'CÃ³ mÃ£ pillar bá»‹ trÃ¹ng.' });
  data.pillars.forEach((p, i) => {
    if (!p.id.trim() || !p.name.trim()) issues.push({ level: 'error', scope: 'Pillar', text: `DÃ²ng pillar ${i + 1} chÆ°a cÃ³ mÃ£ hoáº·c tÃªn.` });
  });
  const shareKnown = data.pillars.filter(p => p.sharePct !== null);
  if (shareKnown.length > 0) {
    const sum = shareKnown.reduce((s, p) => s + (p.sharePct as number), 0);
    if (Math.abs(sum - 100) > 0.5) issues.push({ level: 'warning', scope: 'Pillar', text: `Tá»•ng tá»· trá»ng pillar lÃ  ${fmtN(sum)}%, cáº§n báº±ng 100%.` });
  }

  const missing = { sku: 0, pillar: 0, pic: 0, qty: 0, kl: 0, week: 0, badWeek: 0, badPillar: 0 };
  for (const r of data.rows) {
    if (!r.week) missing.week++;
    else if (weeks.length && !weeks.includes(r.week)) missing.badWeek++;
    if (!r.sku.trim()) missing.sku++;
    if (!r.pillarId) missing.pillar++;
    else if (!pillarIds.has(r.pillarId)) missing.badPillar++;
    if (!r.pic.trim()) missing.pic++;
    if (!(n0(r.qty) > 0)) missing.qty++;
    if (r.source === 'AFFILIATE' && !r.kl) missing.kl++;
  }
  if (missing.week) issues.push({ level: 'error', scope: 'Chi tiáº¿t Content', text: `${missing.week} dÃ²ng chÆ°a chá»n tuáº§n.` });
  if (missing.badWeek) issues.push({ level: 'error', scope: 'Chi tiáº¿t Content', text: `${missing.badWeek} dÃ²ng cÃ³ tuáº§n khÃ´ng thuá»™c thÃ¡ng ${plan.month}.` });
  if (missing.kl) issues.push({ level: 'error', scope: 'Chi tiáº¿t Content', text: `${missing.kl} dÃ²ng Video affiliate chÆ°a chá»n báº­c KL / TAP.` });
  if (missing.qty) issues.push({ level: 'error', scope: 'Chi tiáº¿t Content', text: `${missing.qty} dÃ²ng chÆ°a cÃ³ sá»‘ lÆ°á»£ng.` });
  if (missing.badPillar) issues.push({ level: 'error', scope: 'Chi tiáº¿t Content', text: `${missing.badPillar} dÃ²ng dÃ¹ng pillar Ä‘Ã£ bá»‹ xÃ³a khá»i danh sÃ¡ch.` });
  if (missing.sku) issues.push({ level: 'warning', scope: 'Chi tiáº¿t Content', text: `${missing.sku} dÃ²ng chÆ°a nháº­p SKU / combo.` });
  if (missing.pillar) issues.push({ level: 'warning', scope: 'Chi tiáº¿t Content', text: `${missing.pillar} dÃ²ng chÆ°a chá»n pillar.` });
  if (missing.pic) issues.push({ level: 'warning', scope: 'Chi tiáº¿t Content', text: `${missing.pic} dÃ²ng chÆ°a gÃ¡n PIC.` });

  // Mốc Key Visual: thứ tự Ref → Order → Draft → Duyệt → Treo
  data.milestones.forEach(m => {
    const label = m.name.trim() || 'Phiên bản chưa đặt tên';
    const filled = MILESTONE_DATES.filter(d => m[d.key]);
    if (filled.length === 0) return;
    if (!m.name.trim()) issues.push({ level: 'warning', scope: 'Key Visual', text: 'Có mốc đã nhập ngày nhưng chưa đặt tên phiên bản.' });
    for (let i = 1; i < filled.length; i++) {
      const prev = filled[i - 1];
      const cur = filled[i];
      const d = daysBetween(m[prev.key], m[cur.key]);
      if (d !== null && d < 0) issues.push({ level: 'error', scope: 'Key Visual', text: `${label}: ngày ${cur.label} đứng trước ngày ${prev.label}.` });
    }
    if (filled.length < MILESTONE_DATES.length) {
      issues.push({ level: 'warning', scope: 'Key Visual', text: `${label}: thiếu ngày ${MILESTONE_DATES.filter(d => !m[d.key]).map(d => d.label).join(', ')}.` });
    }
  });
  // PIC phải thuộc nhóm phụ trách gian hàng (chỉ kiểm khi biết danh sách nhóm)
  if (members.length > 0) {
    const norm = (v: string) => v.trim().toLowerCase();
    const allowed = new Set(members.map(norm));
    const outside = Array.from(new Set(data.rows.map(r => r.pic.trim()).filter(p => p && !allowed.has(norm(p)))));
    if (outside.length) issues.push({ level: 'warning', scope: 'Chi tiết Content', text: `PIC không thuộc nhóm phụ trách gian hàng: ${outside.join(', ')}.` });
  }
  // Nhóm sản phẩm: chỉ kiểm khi đã tải được danh mục của Brand
  if (productGroups !== null) {
    const groupIds = new Set(productGroups.map(g => g.id));
    const noGroup = data.rows.filter(r => !r.productGroupId).length;
    const badGroup = data.rows.filter(r => r.productGroupId && !groupIds.has(r.productGroupId)).length;
    if (productGroups.length === 0 && data.rows.length > 0) issues.push({ level: 'warning', scope: 'Chi tiết Content', text: 'Brand chưa có nhóm sản phẩm trong Dữ liệu gốc › Danh mục sản phẩm.' });
    if (productGroups.length > 0 && noGroup) issues.push({ level: 'warning', scope: 'Chi tiết Content', text: `${noGroup} dòng chưa chọn nhóm sản phẩm.` });
    if (badGroup) issues.push({ level: 'error', scope: 'Chi tiết Content', text: `${badGroup} dòng dùng nhóm sản phẩm đã bị xóa khỏi danh mục.` });
  }
  const kpi = computeKpi(data.kpi);
  const tikTotals = sumWeeks(aggregateWeeks(data.rows, 'TIKTOK', weeks));
  const shpTotals = sumWeeks(aggregateWeeks(data.rows, 'SHOPEE', weeks));
  const costChecks: { col: KpiColumn; label: string; key: string; actual: number; has: boolean }[] = [];
  for (const [col, t, has] of [
    ['tiktok', tikTotals, data.rows.some(r => r.channel === 'TIKTOK')],
    ['shopee', shpTotals, data.rows.some(r => r.channel === 'SHOPEE')],
  ] as [KpiColumn, ChannelTotals, boolean][]) {
    costChecks.push(
      { col, label: 'booking video affiliate', key: 'costBookingVideo', actual: t.affBudget, has },
      { col, label: 'video self channel', key: 'costSelfVideo', actual: t.selfBudget, has },
      { col, label: 'booking livestream affiliate', key: 'costBookingLive', actual: t.liveAffBudget, has },
      { col, label: 'livestream self channel', key: 'costSelfLive', actual: t.liveSelfBudget, has }
    );
  }
  for (const c of costChecks) {
    const planned = kpi[c.key]?.[c.col] ?? null;
    if (!c.has && planned === null) continue;
    const scope = `KPI Â· ${c.col === 'tiktok' ? 'TikTok Shop' : 'Shopee'}`;
    if (planned === null) {
      if (c.actual > 0) issues.push({ level: 'warning', scope, text: `ChÆ°a nháº­p chi phÃ­ ${c.label} trong KPI, trong khi dÃ²ng Chi tiáº¿t Content Ä‘Ã£ cÃ³ ${fmtN(c.actual)}Ä‘.` });
    } else if (Math.round(planned) !== Math.round(c.actual)) {
      issues.push({ level: 'warning', scope, text: `Chi phÃ­ ${c.label}: KPI ${fmtN(planned)}Ä‘, cá»™ng tá»« Chi tiáº¿t Content ${fmtN(c.actual)}Ä‘ (lá»‡ch ${fmtN(planned - c.actual)}Ä‘).` });
    }
  }
  for (const col of ['tiktok', 'shopee'] as KpiColumn[]) {
    const gmv = kpi.gmv[col];
    const act = kpi.gmvActivities[col];
    if (gmv !== null && act !== null && Math.round(gmv) < Math.round(act)) {
      issues.push({ level: 'warning', scope: `KPI Â· ${col === 'tiktok' ? 'TikTok Shop' : 'Shopee'}`, text: `GMV cÃ¡c hoáº¡t Ä‘á»™ng (${fmtN(act)}Ä‘) lá»›n hÆ¡n GMV nhÃ  bÃ¡n (${fmtN(gmv)}Ä‘).` });
    }
    const nmv = kpi.nmv[col];
    if (gmv !== null && nmv !== null && nmv > gmv) issues.push({ level: 'error', scope: `KPI Â· ${col === 'tiktok' ? 'TikTok Shop' : 'Shopee'}`, text: 'NMV lá»›n hÆ¡n GMV nhÃ  bÃ¡n.' });
  }

  // Tá»•ng quan TikTok Shop
  const ov = computeOverview(data.overview);
  const hasTik = data.rows.some(r => r.channel === 'TIKTOK');
  const ovChecks: [string, string, number][] = [
    ['aff_total', 'Tá»•ng video AFF', tikTotals.affQty],
    ['aff_cost', 'Chi phÃ­ booking video affiliate', tikTotals.affBudget],
    ['self_count', 'Sá»‘ ná»™i dung self', tikTotals.selfQty],
    ['self_cost', 'Chi phÃ­ video self channel', tikTotals.selfBudget],
    ['live_sessions', 'Sá»‘ phiÃªn livestream self', tikTotals.liveSelfQty],
    ['live_cost', 'Chi phÃ­ livestream self', tikTotals.liveSelfBudget],
    ['laff_sessions', 'Sá»‘ phiÃªn livestream affiliate', tikTotals.liveAffQty],
    ['laff_cost', 'Chi phÃ­ booking livestream affiliate', tikTotals.liveAffBudget],
  ];
  for (const [key, label, actual] of ovChecks) {
    const planned = ov[key];
    if (planned === null || planned === undefined) continue;
    if (Math.round(planned) !== Math.round(actual) && (hasTik || planned > 0)) {
      issues.push({ level: 'warning', scope: 'TikTok Shop Â· Tá»•ng quan', text: `${label}: tá»•ng quan ${fmtN(planned)}, cá»™ng tá»« Chi tiáº¿t Content ${fmtN(actual)}.` });
    }
  }
  const affParts = [ov.aff_koc, ov.aff_kol, ov.aff_tap];
  if (ov.aff_total !== null && affParts.every(v => v !== null)) {
    const sum = (affParts as number[]).reduce((s, v) => s + v, 0);
    if (sum !== ov.aff_total) issues.push({ level: 'error', scope: 'TikTok Shop Â· Tá»•ng quan', text: `KOC + KOL + TAP = ${fmtN(sum)} khÃ¡c Tá»•ng video AFF ${fmtN(ov.aff_total as number)}.` });
  }
  const videoGmv = kpi.gmvVideo.tiktok;
  if (videoGmv !== null && ov.self_rev !== null && ov.aff_rev !== null && Math.round(videoGmv) !== Math.round((ov.self_rev as number) + (ov.aff_rev as number))) {
    issues.push({ level: 'warning', scope: 'TikTok Shop Â· Tá»•ng quan', text: `GMV video á»Ÿ KPI (${fmtN(videoGmv)}Ä‘) khÃ¡c doanh thu video self + affiliate (${fmtN((ov.self_rev as number) + (ov.aff_rev as number))}Ä‘).` });
  }

  // Äá»‘i chiáº¿u vá»›i phÃ¢n rÃ£ 4.1.1: chá»‰ khi nháº­n ra sÃ n cá»§a gian hÃ ng
  const channel = channelHint ?? detectChannel(plan);
  const breakdown = resolveWeekRows(plan);
  const hasBreakdown = breakdown.some(r => Object.values(r.tiers || {}).some(t => n0(t?.qty) > 0));
  if (!channel) {
    if (data.rows.length > 0) issues.push({ level: 'warning', scope: 'Äá»‘i chiáº¿u 4.1.1', text: 'ChÆ°a nháº­n ra sÃ n cá»§a gian hÃ ng nÃ y (TikTok Shop hay Shopee) nÃªn chÆ°a Ä‘á»‘i chiáº¿u vá»›i phÃ¢n rÃ£ 4.1.1.' });
  } else if (!hasBreakdown) {
    if (data.rows.some(r => r.channel === channel)) issues.push({ level: 'warning', scope: 'Äá»‘i chiáº¿u 4.1.1', text: 'Káº¿ hoáº¡ch chÆ°a cÃ³ sá»‘ phÃ¢n rÃ£ 4.1.1 Ä‘á»ƒ Ä‘á»‘i chiáº¿u.' });
  } else {
    const label = CHANNEL_LABEL[channel];
    const agg = aggregateWeeks(data.rows, channel, weeks);
    for (const w of agg) {
      const b = weekRowOf(breakdown, w.week);
      if (!b) continue;
      const diffs: string[] = [];
      for (const k of TIER_KEYS as PlanTierKey[]) {
        const want = n0(b.tiers?.[k]?.qty);
        if (want !== w.affByKl[k].qty) diffs.push(`${k} cáº§n ${fmtN(want)}, plan ${fmtN(w.affByKl[k].qty)}`);
      }
      const tapWant = n0(b.foc?.tapBrand) + n0(b.foc?.tap) + n0(b.foc?.tapUp);
      if (tapWant !== w.affByKl.TAP.qty) diffs.push(`TAP cáº§n ${fmtN(tapWant)}, plan ${fmtN(w.affByKl.TAP.qty)}`);
      const castBudget = TIER_KEYS.reduce((s, k) => s + n0(b.tiers?.[k]?.budgetNet), 0);
      if (Math.round(castBudget) !== Math.round(w.affBudget)) diffs.push(`ngÃ¢n sÃ¡ch booking cáº§n ${fmtN(castBudget)}Ä‘, plan ${fmtN(w.affBudget)}Ä‘`);
      const selfWant = SELF_TYPES.reduce((s, t) => s + n0(b.self?.[t.key]), 0);
      if (selfWant !== w.selfQty) diffs.push(`video self cáº§n ${fmtN(selfWant)}, plan ${fmtN(w.selfQty)}`);
      if (Math.round(n0(b.self?.budgetNet)) !== Math.round(w.selfBudget)) diffs.push(`ngÃ¢n sÃ¡ch self cáº§n ${fmtN(n0(b.self?.budgetNet))}Ä‘, plan ${fmtN(w.selfBudget)}Ä‘`);
      const liveQty = w.liveAffQty + w.liveSelfQty;
      if (n0(b.live?.sessions) !== liveQty) diffs.push(`phiÃªn live cáº§n ${fmtN(n0(b.live?.sessions))}, plan ${fmtN(liveQty)}`);
      if (diffs.length) issues.push({ level: 'error', scope: `Äá»‘i chiáº¿u 4.1.1 Â· ${label}`, text: `${w.week}: ${diffs.join('; ')}.` });
    }
  }
  return issues;
}
