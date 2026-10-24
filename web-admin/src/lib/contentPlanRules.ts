// Kế hoạch content theo tháng: mỗi video trong kế hoạch (4.1.1) tương ứng 1 Brief Content (ContentSlot), xếp vào tuần × bậc.
import type { InputPlanBreakdownState } from './types';
import { FOC_TYPES, SELF_TYPES, resolveWeekRows } from './planBreakdownRules';
import { KL_TIERS, type KlCode } from './klTiers';
import { CONTENT_PILLARS, pillarGroupOf } from './contentPillars';
import type { BrandPlanPillar, BrandPlanRow, PlanChannel } from './brandPlanRules';

export type ContentRowKey = KlCode | 'FOC' | 'SELF' | 'LIVE_AFF';
export type ContentBriefStatus = 'DRAFT' | 'READY';

export const CONTENT_ROWS: { key: ContentRowKey; label: string }[] = [
  ...KL_TIERS.map(t => ({ key: t.code as ContentRowKey, label: t.label })),
  { key: 'FOC', label: 'FOC (0đ)' },
  { key: 'SELF', label: 'Self channel' },
  { key: 'LIVE_AFF', label: 'Livestream Affiliate' },
];

export const BRIEF_FORMAT_OPTIONS = [
  'Talking Head + B-roll',
  'Voiceover B-roll',
  'POV Tình huống trước/sau',
  'Mở hộp & trải nghiệm thực tế',
  'So sánh trực quan',
] as const;

export interface ContentSlot {
  id: string;
  /** Mã định danh dòng Định hướng / Brief mẫu trong kế hoạch (VD: BR-01 .. BR-10). */
  briefCode?: string;
  /** Số lượng video mục tiêu của dòng Brief / Góc nội dung này (VD: 10 dòng Brief × 10 video = 100 video). */
  targetQty?: number;
  pillar: string;
  angle: string;
  product: string;
  productName?: string;
  kocFee?: number;
  /** Câu mở đầu 3 giây đầu (Hook 3s) trong Brief gửi KOC. */
  hook?: string;
  /** Điểm nhấn sản phẩm / Thông điệp USP bắt buộc trong video. */
  usp?: string;
  /** Claim cấm / Từ khóa cấm (Do & Don't) kế thừa từ Nhóm sản phẩm thúc đẩy. */
  forbiddenClaims?: string;
  /** Lời kêu gọi hành động (CTA) & hướng dẫn gắn giỏ hàng. */
  cta?: string;
  /** Định dạng sản xuất video. */
  format?: string;
  /** Link tài liệu Brief chi tiết gửi KOC (Docs / Drive / Canva). */
  briefUrl?: string;
  /** Trạng thái hoàn thiện Brief Content. */
  briefStatus?: ContentBriefStatus;
  /** Tuần đã xếp, null nếu chưa xếp. */
  week: string | null;
  /** Hàng đã xếp (bậc KL, FOC, self channel hoặc livestream affiliate). */
  row: ContentRowKey | null;
  note?: string;
  /** KOC đầu tiên / chính (giữ tương thích ngược). */
  kocHandle?: string;
  /** Danh sách nhiều KOC được gán vào cùng 1 dòng Brief (1 Brief BR-xx có targetQty = N video chứa được N+ KOC). */
  kocHandles?: string[];
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

/** Số lượng video mục tiêu của 1 dòng Brief / Angle (mặc định = 1 nếu chưa khai báo). */
export const slotTargetQty = (s: ContentSlot): number => Math.max(1, Math.floor(s.targetQty || 1));

const cleanHandleStr = (h: string) => h.replace(/^@/, '').trim();

/** Lấy danh sách toàn bộ KOC handles đã gán vào dòng Brief này (hỗ trợ cả `kocHandles[]` và `kocHandle` đơn). */
export function slotKocHandles(s: ContentSlot): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (raw?: string) => {
    if (!raw) return;
    for (const part of raw.split(/[,;\n]+/)) {
      const h = cleanHandleStr(part);
      if (!h) continue;
      const k = h.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(h);
    }
  };
  if (Array.isArray(s.kocHandles)) {
    for (const h of s.kocHandles) push(h);
  }
  push(s.kocHandle);
  return out;
}

/** Thêm 1 hoặc nhiều KOC (phân tách bằng dấu phẩy/xuống dòng) vào dòng Brief `ContentSlot`. */
export function addKocToSlot(s: ContentSlot, rawHandle: string): ContentSlot {
  const current = slotKocHandles(s);
  const seen = new Set(current.map(h => h.toLowerCase()));
  for (const part of rawHandle.split(/[,;\n]+/)) {
    const h = cleanHandleStr(part);
    if (!h || seen.has(h.toLowerCase())) continue;
    seen.add(h.toLowerCase());
    current.push(h);
  }
  return {
    ...s,
    kocHandle: current[0] || undefined,
    kocHandles: current,
    updatedAt: new Date().toISOString(),
  };
}

/** Gỡ 1 KOC khỏi dòng Brief `ContentSlot`. */
export function removeKocFromSlot(s: ContentSlot, handleToRemove: string): ContentSlot {
  const target = cleanHandleStr(handleToRemove).toLowerCase();
  const next = slotKocHandles(s).filter(h => h.toLowerCase() !== target);
  return {
    ...s,
    kocHandle: next[0] || undefined,
    kocHandles: next,
    updatedAt: new Date().toISOString(),
  };
}

/** Kiểm tra 1 dòng Brief Content đã có đủ thông tin cốt lõi (Sản phẩm + Góc nội dung Angle) để giao cho Job/KOC chưa. */
export const isBriefReady = (s: ContentSlot): boolean =>
  s.briefStatus === 'READY' || Boolean(s.product.trim() && (s.angle.trim() || (s.hook || '').trim() || (s.usp || '').trim()));

/** Lấy mã hiển thị chuẩn của dòng Brief Content (VD: BR-01 .. BR-10). */
export const formatBriefCode = (s: ContentSlot, indexZeroBased?: number): string => {
  if (s.briefCode && s.briefCode.trim()) return s.briefCode.trim();
  if (typeof indexZeroBased === 'number' && indexZeroBased >= 0) {
    return `BR-${String(indexZeroBased + 1).padStart(2, '0')}`;
  }
  return `BR-${s.id.slice(-4).toUpperCase()}`;
};

/** Đánh lại mã `briefCode` tuần tự (`BR-01` .. `BR-N`) cho các dòng Brief chưa có mã. */
export function ensureSequentialBriefCodes(slots: ContentSlot[]): ContentSlot[] {
  const used = new Set<string>();
  for (const s of slots) {
    if (s.briefCode && s.briefCode.trim()) used.add(s.briefCode.trim().toUpperCase());
  }
  let counter = 1;
  return slots.map(s => {
    if (s.briefCode && s.briefCode.trim()) return s;
    let candidate = `BR-${String(counter).padStart(2, '0')}`;
    while (used.has(candidate)) {
      counter += 1;
      candidate = `BR-${String(counter).padStart(2, '0')}`;
    }
    used.add(candidate);
    counter += 1;
    return { ...s, briefCode: candidate };
  });
}

let seq = 0;
export function newSlot(input: {
  briefCode?: string;
  targetQty?: number;
  pillar: string;
  angle?: string;
  product?: string;
  hook?: string;
  usp?: string;
  forbiddenClaims?: string;
  cta?: string;
  format?: string;
  briefUrl?: string;
  note?: string;
  week?: string | null;
  row?: ContentRowKey | null;
  pic?: string;
  productGroupId?: string;
  createdBy: string;
}): ContentSlot {
  const now = new Date().toISOString();
  seq += 1;
  const angle = input.angle?.trim() || '';
  const product = input.product?.trim() || '';
  const hook = input.hook?.trim() || '';
  const usp = input.usp?.trim() || '';
  const forbiddenClaims = input.forbiddenClaims?.trim() || '';
  const targetQty = Math.max(1, Math.floor(input.targetQty || 1));
  return {
    id: `CS-${Date.now().toString(36)}-${seq}-${Math.random().toString(36).slice(2, 6)}`,
    briefCode: input.briefCode?.trim() || undefined,
    targetQty,
    pillar: input.pillar,
    angle,
    product,
    hook: hook || undefined,
    usp: usp || undefined,
    forbiddenClaims: forbiddenClaims || undefined,
    cta: input.cta?.trim() || undefined,
    format: input.format?.trim() || undefined,
    briefUrl: input.briefUrl?.trim() || undefined,
    briefStatus: product && (angle || hook || usp) ? 'READY' : 'DRAFT',
    note: input.note?.trim() || undefined,
    week: input.week ?? null,
    row: input.row ?? null,
    pic: input.pic?.trim() || undefined,
    productGroupId: input.productGroupId?.trim() || undefined,
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
    const liveAff = r.live?.sessions || 0;
    if (liveAff > 0) cell.LIVE_AFF = liveAff;
    if (Object.keys(cell).length > 0) hasData = true;
    grid[r.week] = cell;
  }
  return { weeks: rows.map(r => r.week), grid, hasData };
}

/**
 * Khởi tạo các dòng Định hướng / Brief mẫu theo khung tuần × bậc KL của Kế hoạch (bảng phân rã 4.1.1).
 * Mỗi ô (tuần × bậc) đang thiếu N video sẽ chỉ tạo 1 dòng Brief mẫu duy nhất có `targetQty = N` video
 * (VD: 10 dòng Brief × 10 video = 100 video), không sinh 100 thẻ rời.
 */
export function generateMissingSlotsFromBreakdown(
  plan: InputPlanBreakdownState,
  existingSlots: ContentSlot[],
  actor: string,
  defaultProduct = ''
): { slots: ContentSlot[]; addedCount: number; addedVideos: number } {
  const { weeks, grid } = requiredGrid(plan);
  const next = [...existingSlots];
  let addedCount = 0;
  let addedVideos = 0;
  let pillarIdx = 0;

  for (const w of weeks) {
    for (const row of CONTENT_ROWS) {
      const need = grid[w]?.[row.key] || 0;
      if (need <= 0) continue;
      const haveVideos = next
        .filter(s => s.week === w && s.row === row.key)
        .reduce((sum, s) => sum + slotTargetQty(s), 0);
      const missingVideos = Math.max(0, need - haveVideos);
      if (missingVideos <= 0) continue;
      const pillar = CONTENT_PILLARS[pillarIdx % CONTENT_PILLARS.length]?.name || CONTENT_PILLARS[0].name;
      pillarIdx += 1;
      next.push(
        newSlot({
          targetQty: missingVideos,
          pillar,
          product: defaultProduct,
          week: w,
          row: row.key,
          pic: plan.pic || actor,
          createdBy: actor,
        })
      );
      addedCount += 1;
      addedVideos += missingVideos;
    }
  }
  return { slots: ensureSequentialBriefCodes(next), addedCount, addedVideos };
}

export interface ContentDiagnostics {
  totalRequired: number;
  /** Số dòng Định hướng / Brief mẫu (VD: 10 dòng Brief). */
  totalSlots: number;
  /** Tổng số lượng video mục tiêu của các dòng Brief (VD: 10 dòng × 10 video = 100 video). */
  totalBriefVideos: number;
  placed: number;
  placedVideos: number;
  unplaced: number;
  readyBriefs: number;
  byPillarGroup: { group: string; count: number; share: number }[];
  issues: { severity: 'warning' | 'info'; message: string }[];
}

export function diagnoseContentPlan(plan: InputPlanBreakdownState, slots: ContentSlot[]): ContentDiagnostics {
  const { weeks, grid } = requiredGrid(plan);
  const totalRequired = weeks.reduce((s, w) => s + Object.values(grid[w] || {}).reduce((a, b) => a + (b || 0), 0), 0);
  const totalBriefVideos = slots.reduce((sum, s) => sum + slotTargetQty(s), 0);
  const placed = slots.filter(isPlaced);
  const placedVideos = placed.reduce((sum, s) => sum + slotTargetQty(s), 0);
  const readyBriefs = slots.filter(isBriefReady).length;
  const issues: ContentDiagnostics['issues'] = [];

  for (const w of weeks) {
    for (const row of CONTENT_ROWS) {
      const need = grid[w]?.[row.key] || 0;
      const have = placed.filter(s => s.week === w && s.row === row.key).reduce((sum, s) => sum + slotTargetQty(s), 0);
      if (have > need) issues.push({ severity: 'warning', message: `${w.split(' ')[0]} ${row.key}: đã phân bổ ${have} video trong các dòng Brief, bảng phân rã chỉ cần ${need}` });
      else if (have < need) issues.push({ severity: 'info', message: `${w.split(' ')[0]} ${row.key}: còn thiếu ${need - have} video trong các dòng Brief theo kế hoạch` });
    }
  }
  // content xếp vào tuần/hàng không còn trong bảng phân rã
  for (const s of placed) {
    if (!weeks.includes(s.week as string)) issues.push({ severity: 'warning', message: `Brief "${s.briefCode || s.pillar}" đang xếp vào tuần không có trong kế hoạch (${s.week})` });
  }
  const noInfo = slots.filter(s => !s.product.trim()).length;
  if (noInfo > 0) issues.push({ severity: 'info', message: `${noInfo} dòng Brief chưa ghi sản phẩm` });
  const noAngle = slots.filter(s => !s.angle.trim() && !(s.hook || '').trim()).length;
  if (noAngle > 0) issues.push({ severity: 'info', message: `${noAngle} dòng Brief chưa có góc tiếp cận (Angle / Hook 3s)` });

  const counts = new Map<string, number>();
  for (const s of slots) {
    const qty = slotTargetQty(s);
    counts.set(pillarGroupOf(s.pillar), (counts.get(pillarGroupOf(s.pillar)) || 0) + qty);
  }
  const byPillarGroup = Array.from(counts.entries())
    .map(([group, count]) => ({ group, count, share: totalBriefVideos ? count / totalBriefVideos : 0 }))
    .sort((a, b) => b.count - a.count);
  if (slots.length >= 3 && byPillarGroup[0] && byPillarGroup[0].share > 0.6) {
    issues.push({ severity: 'warning', message: `Nhóm pillar "${byPillarGroup[0].group}" chiếm ${Math.round(byPillarGroup[0].share * 100)}% tổng số video, nội dung dễ bị lặp` });
  }
  const order = { warning: 0, info: 1 } as const;
  issues.sort((a, b) => order[a.severity] - order[b.severity]);

  return {
    totalRequired,
    totalSlots: slots.length,
    totalBriefVideos,
    placed: placed.length,
    placedVideos,
    unplaced: slots.length - placed.length,
    readyBriefs,
    byPillarGroup,
    issues,
  };
}

export const pillarNames = CONTENT_PILLARS.map(p => p.name);

/* ------------------------------------------- Đồng bộ từ plan tháng của Brand */

export interface BrandPlanSlotSpec {
  planRowId: string;
  planRowIndex: number;
  targetQty: number;
  week: string;
  row: ContentRowKey;
  pillar: string;
  angle: string;
  product: string;
  productGroupId?: string;
  usp?: string;
  forbiddenClaims?: string;
  pic: string;
}

const KL_CODES = new Set<string>(KL_TIERS.map(t => t.code));

/**
 * Mỗi dòng Chi tiết Content của sàn đang xét tương ứng 1 dòng Định hướng / Brief mẫu có `targetQty = qty` (số lượng video/phiên live mục tiêu).
 * Video affiliate theo bậc KL, TAP vào hàng FOC; video self vào hàng Self channel; livestream affiliate vào hàng LIVE_AFF.
 * Chỉ bỏ qua Livestream self-channel (Inhouse/CTV theo ca quản lý ngoài Ops Hub).
 */
export function slotSpecsFromBrandPlan(
  rows: BrandPlanRow[],
  pillars: BrandPlanPillar[],
  channel: PlanChannel,
  groups: { id: string; name: string; usp?: string; forbiddenClaims?: string }[] = []
): { specs: BrandPlanSlotSpec[]; skipped: { live: number; noWeek: number; noTier: number } } {
  const specs: BrandPlanSlotSpec[] = [];
  const skipped = { live: 0, noWeek: 0, noTier: 0 };
  const pillarName = (id: string) => pillars.find(p => p.id === id)?.name || '';
  const groupObj = (id: string) => groups.find(g => g.id === id);
  for (const r of rows) {
    if (r.channel !== channel) continue;
    const qty = Math.floor(r.qty || 0);
    if (qty <= 0) continue;
    if (r.source === 'LIVE_SELF') {
      skipped.live += qty;
      continue;
    }
    if (!r.week) {
      skipped.noWeek += qty;
      continue;
    }
    let row: ContentRowKey | null = null;
    if (r.source === 'SELF') row = 'SELF';
    else if (r.source === 'LIVE_AFF') row = 'LIVE_AFF';
    else if (r.kl === 'TAP') row = 'FOC';
    else if (KL_CODES.has(r.kl)) row = r.kl as ContentRowKey;
    if (!row) {
      skipped.noTier += qty;
      continue;
    }
    const grp = groupObj(r.productGroupId);
    specs.push({
      planRowId: r.id,
      planRowIndex: 0,
      targetQty: qty,
      week: r.week,
      row,
      pillar: pillarName(r.pillarId),
      angle: r.angle.trim(),
      product: [grp?.name || '', r.sku.trim()].filter(Boolean).join(' · '),
      productGroupId: r.productGroupId || undefined,
      usp: grp?.usp?.trim() || undefined,
      forbiddenClaims: grp?.forbiddenClaims?.trim() || undefined,
      pic: r.pic.trim(),
    });
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
 * Đồng bộ các dòng Brief mẫu từ plan tháng của Brand. Plan là nguồn của tuần, hàng, số lượng video mục tiêu, sản phẩm, pillar, angle và PIC.
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
      if (slotKocHandles(s).length > 0) {
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
      targetQty: spec.targetQty,
      week: movedManually ? s.week : spec.week,
      row: movedManually ? s.row : spec.row,
      planWeek: spec.week,
      planRow: spec.row,
      product: spec.product || s.product,
      angle: spec.angle || s.angle,
      pillar: spec.pillar || s.pillar,
      pic: spec.pic || s.pic,
      productGroupId: spec.productGroupId || s.productGroupId,
      usp: s.usp || spec.usp,
      forbiddenClaims: s.forbiddenClaims || spec.forbiddenClaims,
    };
    const changed =
      merged.targetQty !== s.targetQty ||
      merged.week !== s.week ||
      merged.row !== s.row ||
      merged.product !== s.product ||
      merged.angle !== s.angle ||
      merged.pillar !== s.pillar ||
      merged.pic !== s.pic ||
      merged.productGroupId !== s.productGroupId ||
      merged.usp !== s.usp ||
      merged.forbiddenClaims !== s.forbiddenClaims;
    if (changed) {
      updated++;
      merged.updatedAt = now;
    }
    next.push(merged);
  }
  let added = 0;
  for (const spec of specs) {
    if (seen.has(keyOf(spec.planRowId, spec.planRowIndex))) continue;
    const slot = newSlot({
      targetQty: spec.targetQty,
      pillar: spec.pillar,
      angle: spec.angle,
      product: spec.product,
      usp: spec.usp,
      forbiddenClaims: spec.forbiddenClaims,
      week: spec.week,
      row: spec.row,
      createdBy: actor,
    });
    slot.pic = spec.pic || undefined;
    slot.productGroupId = spec.productGroupId;
    slot.planRowId = spec.planRowId;
    slot.planRowIndex = spec.planRowIndex;
    slot.planWeek = spec.week;
    slot.planRow = spec.row;
    next.push(slot);
    added++;
  }
  return { slots: ensureSequentialBriefCodes(next), added, updated, removed, keptOrphans, manualKept };
}
