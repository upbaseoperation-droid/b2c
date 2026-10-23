// Kế hoạch content theo tháng: mỗi content là một ô (slot), xếp vào tuần × bậc của bảng phân rã 4.1.1.
import type { InputPlanBreakdownState } from './types';
import { FOC_TYPES, SELF_TYPES, resolveWeekRows } from './planBreakdownRules';
import { KL_TIERS, type KlCode } from './klTiers';
import { CONTENT_PILLARS, pillarGroupOf } from './contentPillars';
import type { BrandPlanPillar, BrandPlanRow, PlanChannel } from './brandPlanRules';

export type ContentRowKey = KlCode | 'FOC' | 'SELF';

export const CONTENT_ROWS: { key: ContentRowKey; label: string }[] = [
  ...KL_TIERS.map(t => ({ key: t.code as ContentRowKey, label: t.label })),
  { key: 'FOC', label: 'FOC (0đ)' },
  { key: 'SELF', label: 'Self channel' },
];

export interface ContentSlot {
  id: string;
  pillar: string;
  angle: string;
  product: string;
  /** Tuần đã xếp, null nếu chưa xếp. */
  week: string | null;
  /** Hàng đã xếp (bậc KL, FOC hoặc self channel). */
  row: ContentRowKey | null;
  note?: string;
  /** Gán ở bước creator matching. */
  kocHandle?: string;
  /** KOC Brand đã từ chối cho content này; nếu Brand duyệt lại thì KOC được gán lại. */
  rejectedKoc?: { handle: string; reason?: string; at: string };
  /** PIC phụ trách content này (lấy từ plan tháng của Brand). */
  pic?: string;
  /** Nhóm sản phẩm (danh mục sản phẩm của Brand) của content này. */
  productGroupId?: string;
  /** Dòng Chi tiết Content của plan tháng của Brand đã sinh ra content này, và thứ tự trong dòng đó. */
  planRowId?: string;
  planRowIndex?: number;
  /** Tuần và hàng plan đã đặt lần đồng bộ gần nhất, để biết nhân viên có kéo content sang chỗ khác không. */
  planWeek?: string;
  planRow?: ContentRowKey;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentPlanData {
  slots: ContentSlot[];
  /** Link Google Sheet gửi Brand (mặc định lấy từ danh mục file Brand). */
  sheetUrl?: string;
  tabName?: string;
  lastPush?: { at: string; by: string; rows: number; added: number; url: string };
}

export const isPlaced = (s: ContentSlot): boolean => Boolean(s.week && s.row);

let seq = 0;
export function newSlot(input: { pillar: string; angle?: string; product?: string; week?: string | null; row?: ContentRowKey | null; createdBy: string }): ContentSlot {
  const now = new Date().toISOString();
  seq += 1;
  return {
    id: `CS-${Date.now().toString(36)}-${seq}-${Math.random().toString(36).slice(2, 6)}`,
    pillar: input.pillar,
    angle: input.angle?.trim() || '',
    product: input.product?.trim() || '',
    week: input.week ?? null,
    row: input.row ?? null,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  };
}

/** Số content cần theo từng tuần × hàng, lấy từ bảng phân rã tuần của kế hoạch. */
export function requiredGrid(plan: InputPlanBreakdownState): { weeks: string[]; grid: Record<string, Partial<Record<ContentRowKey, number>>>; hasData: boolean } {
  const rows = resolveWeekRows(plan);
  const grid: Record<string, Partial<Record<ContentRowKey, number>>> = {};
  let hasData = false;
  for (const r of rows) {
    const cell: Partial<Record<ContentRowKey, number>> = {};
    for (const t of KL_TIERS) {
      const q = r.tiers?.[t.code]?.qty || 0;
      if (q > 0) cell[t.code] = q;
    }
    const foc = FOC_TYPES.reduce((s, f) => s + (r.foc?.[f.key] || 0), 0);
    if (foc > 0) cell.FOC = foc;
    const self = SELF_TYPES.reduce((s, t) => s + (r.self?.[t.key] || 0), 0);
    if (self > 0) cell.SELF = self;
    if (Object.keys(cell).length > 0) hasData = true;
    grid[r.week] = cell;
  }
  return { weeks: rows.map(r => r.week), grid, hasData };
}

export interface ContentDiagnostics {
  totalRequired: number;
  totalSlots: number;
  placed: number;
  unplaced: number;
  byPillarGroup: { group: string; count: number; share: number }[];
  issues: { severity: 'warning' | 'info'; message: string }[];
}

export function diagnoseContentPlan(plan: InputPlanBreakdownState, slots: ContentSlot[]): ContentDiagnostics {
  const { weeks, grid } = requiredGrid(plan);
  const totalRequired = weeks.reduce((s, w) => s + Object.values(grid[w] || {}).reduce((a, b) => a + (b || 0), 0), 0);
  const placed = slots.filter(isPlaced);
  const issues: ContentDiagnostics['issues'] = [];

  for (const w of weeks) {
    for (const row of CONTENT_ROWS) {
      const need = grid[w]?.[row.key] || 0;
      const have = placed.filter(s => s.week === w && s.row === row.key).length;
      if (have > need) issues.push({ severity: 'warning', message: `${w.split(' ')[0]} ${row.key}: đã xếp ${have} content, bảng phân rã chỉ cần ${need}` });
      else if (have < need) issues.push({ severity: 'info', message: `${w.split(' ')[0]} ${row.key}: còn thiếu ${need - have} content` });
    }
  }
  // content xếp vào tuần/hàng không còn trong bảng phân rã
  for (const s of placed) {
    if (!weeks.includes(s.week as string)) issues.push({ severity: 'warning', message: `Content "${s.pillar}" đang xếp vào tuần không có trong kế hoạch (${s.week})` });
  }
  const noInfo = slots.filter(s => !s.product.trim()).length;
  if (noInfo > 0) issues.push({ severity: 'info', message: `${noInfo} content chưa ghi sản phẩm` });

  const counts = new Map<string, number>();
  for (const s of slots) counts.set(pillarGroupOf(s.pillar), (counts.get(pillarGroupOf(s.pillar)) || 0) + 1);
  const byPillarGroup = Array.from(counts.entries())
    .map(([group, count]) => ({ group, count, share: slots.length ? count / slots.length : 0 }))
    .sort((a, b) => b.count - a.count);
  if (slots.length >= 5 && byPillarGroup[0] && byPillarGroup[0].share > 0.6) {
    issues.push({ severity: 'warning', message: `Nhóm pillar "${byPillarGroup[0].group}" chiếm ${Math.round(byPillarGroup[0].share * 100)}% content, nội dung dễ bị lặp` });
  }
  const order = { warning: 0, info: 1 } as const;
  issues.sort((a, b) => order[a.severity] - order[b.severity]);

  return { totalRequired, totalSlots: slots.length, placed: placed.length, unplaced: slots.length - placed.length, byPillarGroup, issues };
}

export const pillarNames = CONTENT_PILLARS.map(p => p.name);

/* ------------------------------------------- Đồng bộ từ plan tháng của Brand */

export interface BrandPlanSlotSpec {
  planRowId: string;
  planRowIndex: number;
  week: string;
  row: ContentRowKey;
  pillar: string;
  angle: string;
  product: string;
  productGroupId?: string;
  pic: string;
}

const KL_CODES = new Set<string>(KL_TIERS.map(t => t.code));

/**
 * Mỗi dòng Chi tiết Content của sàn đang xét sinh ra đúng "số lượng" content.
 * Video affiliate theo bậc KL, TAP vào hàng FOC; video self vào hàng Self channel. Livestream không có trong lưới này.
 */
export function slotSpecsFromBrandPlan(rows: BrandPlanRow[], pillars: BrandPlanPillar[], channel: PlanChannel, groups: { id: string; name: string }[] = []): { specs: BrandPlanSlotSpec[]; skipped: { live: number; noWeek: number; noTier: number } } {
  const specs: BrandPlanSlotSpec[] = [];
  const skipped = { live: 0, noWeek: 0, noTier: 0 };
  const pillarName = (id: string) => pillars.find(p => p.id === id)?.name || '';
  const groupName = (id: string) => groups.find(g => g.id === id)?.name || '';
  for (const r of rows) {
    if (r.channel !== channel) continue;
    const qty = Math.floor(r.qty || 0);
    if (qty <= 0) continue;
    if (r.source === 'LIVE_AFF' || r.source === 'LIVE_SELF') {
      skipped.live += qty;
      continue;
    }
    if (!r.week) {
      skipped.noWeek += qty;
      continue;
    }
    let row: ContentRowKey | null = null;
    if (r.source === 'SELF') row = 'SELF';
    else if (r.kl === 'TAP') row = 'FOC';
    else if (KL_CODES.has(r.kl)) row = r.kl as ContentRowKey;
    if (!row) {
      skipped.noTier += qty;
      continue;
    }
    for (let i = 0; i < qty; i++) {
      specs.push({ planRowId: r.id, planRowIndex: i, week: r.week, row, pillar: pillarName(r.pillarId), angle: r.angle.trim(), product: [groupName(r.productGroupId), r.sku.trim()].filter(Boolean).join(' · '), productGroupId: r.productGroupId || undefined, pic: r.pic.trim() });
    }
  }
  return { specs, skipped };
}

export interface BrandPlanSyncResult {
  slots: ContentSlot[];
  added: number;
  updated: number;
  removed: number;
  /** Content đã gán KOC nhưng dòng plan không còn: giữ lại để nhân viên tự xử lý. */
  keptOrphans: number;
  /** Content nhân viên đã kéo sang tuần hoặc hàng khác: giữ nguyên chỗ nhân viên chọn. */
  manualKept: number;
}

/**
 * Đồng bộ content từ plan tháng của Brand. Plan là nguồn của tuần, hàng, sản phẩm, pillar, angle và PIC.
 * Không bao giờ đụng tới KOC đã gán. Content không còn trong plan chỉ bị xóa khi chưa gán KOC.
 */
export function syncSlotsFromBrandPlan(slots: ContentSlot[], specs: BrandPlanSlotSpec[], actor: string): BrandPlanSyncResult {
  const now = new Date().toISOString();
  const keyOf = (id: string, i: number) => `${id}#${i}`;
  const specByKey = new Map(specs.map(s => [keyOf(s.planRowId, s.planRowIndex), s]));
  const seen = new Set<string>();
  let updated = 0;
  let removed = 0;
  let keptOrphans = 0;
  let manualKept = 0;
  const next: ContentSlot[] = [];
  for (const s of slots) {
    if (!s.planRowId || s.planRowIndex === undefined) {
      next.push(s);
      continue;
    }
    const k = keyOf(s.planRowId, s.planRowIndex);
    const spec = specByKey.get(k);
    if (!spec) {
      if (s.kocHandle) {
        keptOrphans++;
        next.push(s);
      } else removed++;
      continue;
    }
    seen.add(k);
    const movedManually = s.planWeek !== undefined && (s.week !== s.planWeek || s.row !== s.planRow);
    if (movedManually) manualKept++;
    const merged: ContentSlot = {
      ...s,
      week: movedManually ? s.week : spec.week,
      row: movedManually ? s.row : spec.row,
      planWeek: spec.week,
      planRow: spec.row,
      product: spec.product || s.product,
      angle: spec.angle || s.angle,
      pillar: spec.pillar || s.pillar,
      pic: spec.pic || s.pic,
      productGroupId: spec.productGroupId || s.productGroupId,
    };
    const changed = merged.week !== s.week || merged.row !== s.row || merged.product !== s.product || merged.angle !== s.angle || merged.pillar !== s.pillar || merged.pic !== s.pic || merged.productGroupId !== s.productGroupId;
    if (changed) {
      updated++;
      merged.updatedAt = now;
    }
    next.push(merged);
  }
  let added = 0;
  for (const spec of specs) {
    if (seen.has(keyOf(spec.planRowId, spec.planRowIndex))) continue;
    const slot = newSlot({ pillar: spec.pillar, angle: spec.angle, product: spec.product, week: spec.week, row: spec.row, createdBy: actor });
    slot.pic = spec.pic || undefined;
    slot.productGroupId = spec.productGroupId;
    slot.planRowId = spec.planRowId;
    slot.planRowIndex = spec.planRowIndex;
    slot.planWeek = spec.week;
    slot.planRow = spec.row;
    next.push(slot);
    added++;
  }
  return { slots: next, added, updated, removed, keptOrphans, manualKept };
}