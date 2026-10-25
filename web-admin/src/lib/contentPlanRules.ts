// Kế hoạch content theo tháng: mỗi video trong kế hoạch (4.1.1) tương ứng 1 Brief Content (ContentSlot), xếp vào tuần × bậc.
import type { BrandOneSheetPlanData, InputPlanBreakdownState } from './types';
import { FOC_TYPES, SELF_TYPES, resolveWeekRows } from './planBreakdownRules';
import { KL_TIERS, type KlCode } from './klTiers';
import { CONTENT_PILLARS, pillarGroupOf } from './contentPillars';
import type { BrandPlanPillar, BrandPlanRow, PlanChannel } from './brandPlanRules';
import {
  findCatalogProduct,
  listAllCatalogProducts,
  resolveEffectiveProductGuidelines,
  resolveEffectiveProductLinks,
  resolveEffectiveSampleQuota,
  type BrandProductCatalog,
  type ProductGroup,
} from './productCatalog';

export type ContentRowKey = KlCode | 'FOC' | 'SELF' | 'LIVE_AFF';
export type ContentBriefStatus = 'DRAFT' | 'READY';
/**
 * Chế độ làm việc với KOC theo phân khúc:
 * - DIRECTIVE: Định hướng kịch bản chi tiết (Pillar + Angle + Hook 3s + Format) cho FOC, SELF, KL1..KL5.
 * - VETTING_GUARDRAILS: Chỉ giao Bộ tham số kiểm duyệt & Ranh giới Brand (USP cốt lõi + Từ cấm + Yêu cầu hiện diện sản phẩm + Điều khoản bản quyền) cho KL6 (10M-30M) & KL7 (>30M).
 */
export type ContentBriefMode = 'DIRECTIVE' | 'VETTING_GUARDRAILS';

export const VETTING_GUARDRAIL_ROWS: ContentRowKey[] = ['KL6', 'KL7'];

export const isVettingGuardrailRow = (row?: ContentRowKey | null | string): boolean =>
  row === 'KL6' || row === 'KL7';

export const DEFAULT_KL67_MANDATORY_SHOTS =
  'Lộ diện rõ bao bì sản phẩm tối thiểu 5 giây đầu/giữa video; quay cận kết cấu thực tế khi sử dụng; phát âm đúng tên thương hiệu';

export const DEFAULT_KL67_RIGHTS_GUARDRAILS =
  'Cấp mã Spark Ads tối thiểu 30 ngày từ ngày nghiệm thu; giữ video công khai tối thiểu 60 ngày; không nhắc tên đối thủ trực tiếp trong video';

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
  /** Chế độ Brief: Định hướng kịch bản (DIRECTIVE) hoặc Khung tham số kiểm duyệt cho KL6/KL7 (VETTING_GUARDRAILS). */
  briefMode?: ContentBriefMode;
  /** Yêu cầu khung hình & hiện diện sản phẩm bắt buộc (dùng cho KL6/KL7 hoặc quy chuẩn quay). */
  mandatoryShots?: string;
  /** Điều khoản bản quyền, mã Spark Ads, thời hạn giữ video & độc quyền (dùng cho KL6/KL7). */
  rightsGuardrails?: string;
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
  /** Nhóm sản phẩm Tầng 1 (danh mục sản phẩm của Brand) của content này. */
  productGroupId?: string;
  /** ID sản phẩm / SKU cụ thể Tầng 2 trong danh mục sản phẩm. */
  productId?: string;
  /** Mã SKU hoặc tên Combo cụ thể Tầng 2. */
  sku?: string;
  /** Link giỏ hàng (PDP) đúng theo Sàn/Gian hàng để KOC gắn giỏ. */
  cartUrl?: string;
  /** Link hoa hồng Affiliate (Open/Designated) để KOC lấy link gắn giỏ. */
  affiliateUrl?: string;
  /** % Hoa hồng Affiliate áp dụng cho SKU/Combo này. */
  commissionPct?: number | null;
  /** Từ khóa nhận diện tự động sản phẩm khi đối soát BBNT. */
  detectKeywords?: string;
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

/** Xác định chế độ làm việc thực tế của 1 dòng ContentSlot (`DIRECTIVE` cho KL1-KL5/FOC/SELF, `VETTING_GUARDRAILS` cho KL6-KL7). */
export const resolveBriefMode = (s: Pick<ContentSlot, 'briefMode' | 'row'>): ContentBriefMode =>
  s.briefMode || (isVettingGuardrailRow(s.row) ? 'VETTING_GUARDRAILS' : 'DIRECTIVE');

/**
 * Kiểm tra 1 dòng Brief Content đã có đủ thông tin cốt lõi để giao cho Job/KOC chưa:
 * - Nhóm KL6/KL7 (`VETTING_GUARDRAILS`): Chỉ cần có Sản phẩm + ít nhất 1 tham số kiểm duyệt (USP bắt buộc / Từ cấm / Yêu cầu hiện diện sản phẩm), KHÔNG bắt buộc Angle/Hook 3s.
 * - Nhóm KL1-KL5, FOC, SELF (`DIRECTIVE`): Cần có Sản phẩm + (Angle hoặc Hook 3s hoặc USP).
 */
export const isBriefReady = (s: ContentSlot): boolean => {
  if (s.briefStatus === 'READY') return true;
  if (!s.product.trim()) return false;
  if (resolveBriefMode(s) === 'VETTING_GUARDRAILS') {
    return Boolean((s.usp || '').trim() || (s.forbiddenClaims || '').trim() || (s.mandatoryShots || '').trim());
  }
  return Boolean(s.angle.trim() || (s.hook || '').trim() || (s.usp || '').trim());
};

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
  briefMode?: ContentBriefMode;
  mandatoryShots?: string;
  rightsGuardrails?: string;
  note?: string;
  week?: string | null;
  row?: ContentRowKey | null;
  pic?: string;
  productGroupId?: string;
  productId?: string;
  sku?: string;
  cartUrl?: string;
  affiliateUrl?: string;
  commissionPct?: number | null;
  detectKeywords?: string;
  createdBy: string;
}): ContentSlot {
  const now = new Date().toISOString();
  seq += 1;
  const angle = input.angle?.trim() || '';
  const product = input.product?.trim() || '';
  const hook = input.hook?.trim() || '';
  const usp = input.usp?.trim() || '';
  const forbiddenClaims = input.forbiddenClaims?.trim() || '';
  const isVetting = input.briefMode === 'VETTING_GUARDRAILS' || (!input.briefMode && isVettingGuardrailRow(input.row));
  const briefMode: ContentBriefMode = isVetting ? 'VETTING_GUARDRAILS' : 'DIRECTIVE';
  const mandatoryShots =
    input.mandatoryShots?.trim() || (isVetting ? DEFAULT_KL67_MANDATORY_SHOTS : '');
  const rightsGuardrails =
    input.rightsGuardrails?.trim() || (isVetting ? DEFAULT_KL67_RIGHTS_GUARDRAILS : '');
  const targetQty = Math.max(1, Math.floor(input.targetQty || 1));
  const ready = isVetting
    ? Boolean(product && (usp || forbiddenClaims || mandatoryShots))
    : Boolean(product && (angle || hook || usp));
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
    briefMode,
    mandatoryShots: mandatoryShots || undefined,
    rightsGuardrails: rightsGuardrails || undefined,
    briefStatus: ready ? 'READY' : 'DRAFT',
    note: input.note?.trim() || undefined,
    week: input.week ?? null,
    row: input.row ?? null,
    pic: input.pic?.trim() || undefined,
    productGroupId: input.productGroupId?.trim() || undefined,
    productId: input.productId?.trim() || undefined,
    sku: input.sku?.trim() || undefined,
    cartUrl: input.cartUrl?.trim() || undefined,
    affiliateUrl: input.affiliateUrl?.trim() || undefined,
    commissionPct: typeof input.commissionPct === 'number' ? input.commissionPct : undefined,
    detectKeywords: input.detectKeywords?.trim() || undefined,
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

export interface ProductAllocationSummary {
  key: string;
  groupName: string;
  productName: string;
  sku: string;
  role: string;
  status: 'ACTIVE' | 'OUT_OF_STOCK' | 'STOPPED';
  plannedVideos: number;
  focVideos: number;
  assignedKocs: number;
  sampleQuota: number | null;
  sampleRemaining: number | null;
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
  byProduct: ProductAllocationSummary[];
  issues: { severity: 'warning' | 'info'; message: string }[];
}

export function diagnoseContentPlan(
  plan: InputPlanBreakdownState,
  slots: ContentSlot[],
  catalog?: BrandProductCatalog
): ContentDiagnostics {
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
  const directiveSlots = slots.filter(s => resolveBriefMode(s) === 'DIRECTIVE');
  const vettingSlots = slots.filter(s => resolveBriefMode(s) === 'VETTING_GUARDRAILS');
  const noAngle = directiveSlots.filter(s => !s.angle.trim() && !(s.hook || '').trim()).length;
  if (noAngle > 0) issues.push({ severity: 'info', message: `${noAngle} dòng Brief định hướng (KL1–KL5/FOC/Self) chưa có góc tiếp cận (Angle / Hook 3s)` });
  const noGuardrails = vettingSlots.filter(
    s => !(s.usp || '').trim() && !(s.forbiddenClaims || '').trim() && !(s.mandatoryShots || '').trim()
  ).length;
  if (noGuardrails > 0) {
    issues.push({
      severity: 'info',
      message: `${noGuardrails} dòng KL6/KL7 chưa khai báo tham số kiểm duyệt (Key USP / Từ cấm / Yêu cầu hiện diện sản phẩm)`,
    });
  }

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

  // Phân bổ theo Sản phẩm đẩy & Hạn mức mẫu FOC
  const prodMap = new Map<string, ProductAllocationSummary>();
  if (catalog) {
    for (const { group, product } of listAllCatalogProducts(catalog)) {
      const sampleRes = resolveEffectiveSampleQuota(catalog, product);
      prodMap.set(`prd:${product.id}`, {
        key: `prd:${product.id}`,
        groupName: group.name,
        productName: product.name,
        sku: product.sku || '',
        role: product.productType === 'HARD_BUNDLE' || product.productType === 'ROUTINE_COMBO' ? 'COMBO' : product.role || 'HERO',
        status: product.status || 'ACTIVE',
        plannedVideos: 0,
        focVideos: 0,
        assignedKocs: 0,
        sampleQuota: sampleRes.remaining,
        sampleRemaining: sampleRes.remaining,
      });
    }
  }

  for (const s of slots) {
    const qty = slotTargetQty(s);
    const isFoc = s.row === 'FOC';
    const kocsCount = slotKocHandles(s).length;
    const matched = catalog ? findCatalogProduct(catalog, s.productId || s.sku || s.product, s.productGroupId) : null;
    if (matched) {
      const k = `prd:${matched.product.id}`;
      const existing = prodMap.get(k);
      if (existing) {
        existing.plannedVideos += qty;
        if (isFoc) existing.focVideos += qty;
        existing.assignedKocs += kocsCount;
        if (existing.sampleQuota !== null) {
          existing.sampleRemaining = Math.max(0, existing.sampleQuota - existing.focVideos);
        }
      }
    } else if (s.product.trim()) {
      const k = `raw:${s.product.trim().toLowerCase()}`;
      const existing = prodMap.get(k) || {
        key: k,
        groupName: '',
        productName: s.product.trim(),
        sku: s.sku || '',
        role: 'HERO',
        status: 'ACTIVE' as const,
        plannedVideos: 0,
        focVideos: 0,
        assignedKocs: 0,
        sampleQuota: null,
        sampleRemaining: null,
      };
      existing.plannedVideos += qty;
      if (isFoc) existing.focVideos += qty;
      existing.assignedKocs += kocsCount;
      prodMap.set(k, existing);
    }
  }

  const byProduct = Array.from(prodMap.values())
    .filter(p => p.plannedVideos > 0 || p.role === 'HERO' || p.role === 'COMBO')
    .sort((a, b) => b.plannedVideos - a.plannedVideos);

  for (const p of byProduct) {
    if (p.plannedVideos > 0 && (p.status === 'OUT_OF_STOCK' || p.status === 'STOPPED')) {
      issues.push({
        severity: 'warning',
        message: `Sản phẩm "${p.productName}" đang ${p.status === 'OUT_OF_STOCK' ? 'tạm hết hàng' : 'ngừng bán'} nhưng vẫn xếp ${p.plannedVideos} video trong kế hoạch.`,
      });
    }
    if (p.sampleQuota !== null && p.focVideos > p.sampleQuota) {
      issues.push({
        severity: 'warning',
        message: `Sản phẩm "${p.productName}" xếp ${p.focVideos} suất FOC vượt hạn mức mẫu tháng (${p.sampleQuota} mẫu).`,
      });
    }
    if (slots.length > 0 && p.plannedVideos === 0 && p.role === 'HERO' && p.status === 'ACTIVE') {
      issues.push({
        severity: 'info',
        message: `Sản phẩm chủ lực [HERO] "${p.productName}" chưa được phân bổ dòng Brief nào trong tháng.`,
      });
    }
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
    byProduct,
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
  productId?: string;
  sku?: string;
  cartUrl?: string;
  affiliateUrl?: string;
  commissionPct?: number | null;
  detectKeywords?: string;
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
  groups: (ProductGroup | { id: string; name: string; usp?: string; forbiddenClaims?: string; products?: ProductGroup['products'] })[] = []
): { specs: BrandPlanSlotSpec[]; skipped: { live: number; noWeek: number; noTier: number } } {
  const specs: BrandPlanSlotSpec[] = [];
  const skipped = { live: 0, noWeek: 0, noTier: 0 };
  const pillarName = (id: string) => pillars.find(p => p.id === id)?.name || '';
  const groupObj = (id: string) => groups.find(g => g.id === id);
  const catalogForLookup: BrandProductCatalog = {
    groups: groups.map(g => ({
      id: g.id,
      name: g.name,
      usp: g.usp || '',
      forbiddenClaims: g.forbiddenClaims || '',
      products: Array.isArray(g.products) ? g.products : [],
    })),
  };
  const targetPlatform = channel === 'SHOPEE' ? 'Shopee' : 'TikTok Shop';
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
    const matched = findCatalogProduct(catalogForLookup, r.sku, r.productGroupId);
    const effGuide = resolveEffectiveProductGuidelines(catalogForLookup, r.productGroupId, matched?.product);
    const effLinks = resolveEffectiveProductLinks(catalogForLookup, matched?.product);
    const matchedCart = effLinks.cartLinks.find(l => l.platform === targetPlatform) || effLinks.cartLinks[0];
    const matchedAff = effLinks.affiliateLinks.find(l => l.platform === targetPlatform) || effLinks.affiliateLinks[0];
    specs.push({
      planRowId: r.id,
      planRowIndex: 0,
      targetQty: qty,
      week: r.week,
      row,
      pillar: pillarName(r.pillarId),
      angle: r.angle.trim(),
      product: [grp?.name || '', r.sku.trim()].filter(Boolean).join(' · '),
      productGroupId: r.productGroupId || matched?.group.id || undefined,
      productId: matched?.product.id || undefined,
      sku: matched?.product.sku || r.sku.trim() || undefined,
      cartUrl: matchedCart?.url || undefined,
      affiliateUrl: matchedAff?.url || undefined,
      commissionPct: matchedAff?.commissionPct ?? null,
      detectKeywords: effGuide.detectKeywords || undefined,
      usp: effGuide.usp || grp?.usp?.trim() || undefined,
      forbiddenClaims: effGuide.forbiddenClaims || grp?.forbiddenClaims?.trim() || undefined,
      pic: r.pic.trim(),
    });
  }
  return { specs, skipped };
}

/**
 * Chuyển đổi dữ liệu Biểu mẫu 1-Sheet Trình Brand (`BrandOneSheetPlanData` — Mục 04.3 TikTok & 05.3 Shopee)
 * sang danh sách `BrandPlanSlotSpec` để đồng bộ trực tiếp vào bảng `Kế hoạch Content`.
 */
export function slotSpecsFromOneSheetPlan(
  oneSheet: BrandOneSheetPlanData,
  plan: InputPlanBreakdownState,
  channel: PlanChannel,
  catalog?: BrandProductCatalog
): { specs: BrandPlanSlotSpec[]; skipped: { live: number; noWeek: number; noTier: number } } {
  const specs: BrandPlanSlotSpec[] = [];
  const skipped = { live: 0, noWeek: 0, noTier: 0 };
  const { weeks, grid } = requiredGrid(plan);
  const targetPlatform = channel === 'SHOPEE' ? 'Shopee' : 'TikTok Shop';
  const buildProductFields = (rawSkuOrCombo: string) => {
    const trimmed = (rawSkuOrCombo || '').trim();
    if (!catalog || !trimmed) return { product: trimmed };
    const matched = findCatalogProduct(catalog, trimmed);
    if (!matched) return { product: trimmed };
    const effGuide = resolveEffectiveProductGuidelines(catalog, matched.group.id, matched.product);
    const effLinks = resolveEffectiveProductLinks(catalog, matched.product);
    const matchedCart = effLinks.cartLinks.find(l => l.platform === targetPlatform) || effLinks.cartLinks[0];
    const matchedAff = effLinks.affiliateLinks.find(l => l.platform === targetPlatform) || effLinks.affiliateLinks[0];
    return {
      product: trimmed,
      productGroupId: matched.group.id,
      productId: matched.product.id,
      sku: matched.product.sku || matched.product.name,
      cartUrl: matchedCart?.url || undefined,
      affiliateUrl: matchedAff?.url || undefined,
      commissionPct: matchedAff?.commissionPct ?? null,
      detectKeywords: effGuide.detectKeywords || undefined,
      usp: effGuide.usp || undefined,
      forbiddenClaims: effGuide.forbiddenClaims || undefined,
    };
  };

  const resolvePlanWeek = (rawWeek: string): string => {
    const m = rawWeek.match(/W[1-5]/i);
    const code = m ? m[0].toUpperCase() : 'W1';
    return weeks.find(w => w.toUpperCase().startsWith(code)) || weeks[0] || code;
  };

  const resolveDefaultTierForWeek = (weekKey: string): ContentRowKey => {
    const cell = grid[weekKey] || {};
    for (const t of KL_TIERS) {
      if ((cell[t.code] || 0) > 0) return t.code;
    }
    if ((cell.FOC || 0) > 0) return 'FOC';
    return 'KL2';
  };

  if (channel === 'TIKTOK') {
    for (const r of oneSheet.tiktokContentRows || []) {
      const qty = Math.floor(r.qty || 0);
      if (qty <= 0) continue;
      const week = resolvePlanWeek(r.weekAndAirDate || 'W1');
      let row: ContentRowKey = 'KL2';
      if (r.touchpointSource === 'Video self' || r.contentType === 'Ảnh trượt') {
        row = 'SELF';
      } else if (r.touchpointSource === 'Livestream' || r.contentType === 'Livestream') {
        row = 'LIVE_AFF';
      } else {
        const klMatch = (r.klGroup || '').toUpperCase().match(/KL[1-7]/);
        if (klMatch && KL_CODES.has(klMatch[0])) {
          row = klMatch[0] as ContentRowKey;
        } else if (/^TAP|FOC/i.test((r.klGroup || '').trim())) {
          row = 'FOC';
        } else {
          row = resolveDefaultTierForWeek(week);
        }
      }
      specs.push({
        planRowId: r.id,
        planRowIndex: 0,
        targetQty: qty,
        week,
        row,
        pillar: (r.pillar || CONTENT_PILLARS[0].name).trim(),
        angle: (r.angleAndBrief || '').trim(),
        ...buildProductFields(r.skuOrCombo || ''),
        pic: (r.pic || oneSheet.preparedBy || plan.pic || '').trim(),
      });
    }
  } else {
    const pillarMap = new Map(
      (oneSheet.contentPillars || []).map(p => [p.pillarId, p.pillarName])
    );
    for (const r of oneSheet.shopeeContentRows || []) {
      const qty = Math.floor(r.qty || 0);
      if (qty <= 0) continue;
      const week = resolvePlanWeek(r.week || 'W1');
      let row: ContentRowKey = 'SELF';
      if (/aff|koc/i.test(`${r.touchpointSource} ${r.productionMethod}`)) {
        row = resolveDefaultTierForWeek(week);
      } else if (/live/i.test(r.touchpointSource)) {
        row = 'LIVE_AFF';
      }
      specs.push({
        planRowId: r.id,
        planRowIndex: 0,
        targetQty: qty,
        week,
        row,
        pillar: (pillarMap.get(r.pillarId) || r.pillarId || CONTENT_PILLARS[0].name).trim(),
        angle: (r.angleAndBrief || '').trim(),
        ...buildProductFields(r.skuOrCombo || ''),
        pic: (oneSheet.preparedBy || plan.pic || '').trim(),
      });
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
      productId: spec.productId || s.productId,
      sku: spec.sku || s.sku,
      cartUrl: s.cartUrl || spec.cartUrl,
      affiliateUrl: s.affiliateUrl || spec.affiliateUrl,
      commissionPct: s.commissionPct ?? spec.commissionPct,
      detectKeywords: s.detectKeywords || spec.detectKeywords,
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
      merged.productId !== s.productId ||
      merged.sku !== s.sku ||
      merged.cartUrl !== s.cartUrl ||
      merged.commissionPct !== s.commissionPct ||
      merged.detectKeywords !== s.detectKeywords ||
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
      productId: spec.productId,
      sku: spec.sku,
      cartUrl: spec.cartUrl,
      affiliateUrl: spec.affiliateUrl,
      commissionPct: spec.commissionPct,
      detectKeywords: spec.detectKeywords,
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
