// Creator matching: chấm điểm KOC cho một content (pillar × bậc × sản phẩm) bằng quy tắc cố định.
// Mỗi điểm đều có lý do; thiếu dữ liệu thì tính 0 điểm và nói rõ thiếu gì, không đoán.
import type { BookingDealItem, InputPlanBreakdownState, KocItem } from './types';
import { KL_TIERS, klTier, type KlCode } from './klTiers';
import { pillarGroupOf } from './contentPillars';
import type { ContentRowKey, ContentSlot } from './contentPlanRules';

export interface MatchScorePart {
  key: 'GRADE' | 'PRICE' | 'PILLAR' | 'PRODUCT' | 'HISTORY' | 'PERFORMANCE';
  label: string;
  score: number;
  max: number;
  reason: string;
}

export interface MatchResult {
  koc: KocItem;
  total: number;
  parts: MatchScorePart[];
  warnings: string[];
}

export interface MatchContext {
  slot: ContentSlot;
  plan: InputPlanBreakdownState;
  deals: BookingDealItem[];
  /** ID kênh đã được gán cho content khác trong cùng kế hoạch. */
  usedHandles: Set<string>;
}

const norm = (v: string | undefined | null) =>
  (v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();

const cleanHandle = (h: string | undefined) => (h || '').replace(/^@/, '').trim().toLowerCase();

const GRADE_ORDER = ['TAP UpAffiliate', ...KL_TIERS.map(t => t.code)];

const PILLAR_AFFINITY: Record<string, { categories: string[]; tep: string[] }> = {
  'Review trực tiếp': { categories: ['Reviewer', 'Personal care'], tep: ['review', 'unboxing', 'beauty', 'health', 'makeup'] },
  'Content gây tranh cãi': { categories: ['Social / Comedian'], tep: ['couple', 'gia dinh'] },
  Storytelling: { categories: ['Lifestyle', 'Mom and baby', 'Travel/Hospitality'], tep: ['me be', 'gia dinh', 'couple'] },
  Educate: { categories: ['Reviewer', 'Personal care'], tep: ['health', 'makeup artist', 'toc', 'review'] },
  Feedback: { categories: ['Reviewer'], tep: ['review', 'unboxing'] },
  'Promotion/Teasing': { categories: ['Lifestyle', 'Social / Comedian'], tep: ['seller'] },
  Entertainment: { categories: ['Social / Comedian', 'Lifestyle'], tep: ['couple', 'gia dinh'] },
};

/** Đơn giá kế hoạch cho một hàng (ngân sách Net chia số video). */
export function planUnitBudget(plan: InputPlanBreakdownState, row: ContentRowKey | null): number | undefined {
  if (!row || row === 'FOC' || row === 'SELF') return undefined;
  const items = (plan.items || []).filter(i => i.category === 'KOC_TIER' && i.tierCode === row);
  const qty = items.reduce((s, i) => s + (i.qty || 0), 0);
  const budget = items.reduce((s, i) => s + (i.totalBudget || 0), 0);
  return qty > 0 && budget > 0 ? budget / qty : undefined;
}

const fmt = (v: number) => Math.round(v).toLocaleString('vi-VN');

function scoreGrade(koc: KocItem, row: ContentRowKey | null): MatchScorePart {
  const max = 25;
  const label = 'Khung lương';
  if (!row || row === 'SELF') return { key: 'GRADE', label, max, score: 12, reason: 'Content chưa xếp bậc nên chấm trung bình' };
  if (row === 'FOC') {
    const isFoc = koc.salaryGrade === 'TAP UpAffiliate' || (koc.rateCardVideo || 0) === 0 || (koc.totalFocVideos || 0) > 0;
    return { key: 'GRADE', label, max, score: isFoc ? max : 0, reason: isFoc ? 'KOC nhận sản phẩm không phí (FOC)' : 'KOC đang có giá, không phải kênh FOC' };
  }
  const want = GRADE_ORDER.indexOf(row);
  const have = GRADE_ORDER.indexOf(koc.salaryGrade);
  if (have < 0) return { key: 'GRADE', label, max, score: 0, reason: `Bậc ${koc.salaryGrade} không thuộc KL1–KL7` };
  const diff = Math.abs(want - have);
  if (diff === 0) return { key: 'GRADE', label, max, score: max, reason: `Đúng bậc ${row}` };
  if (diff === 1) return { key: 'GRADE', label, max, score: 12, reason: `Lệch 1 bậc (${koc.salaryGrade} so với ${row})` };
  return { key: 'GRADE', label, max, score: 0, reason: `Lệch ${diff} bậc (${koc.salaryGrade} so với ${row})` };
}

function scorePrice(koc: KocItem, ctx: MatchContext, warnings: string[]): MatchScorePart {
  const max = 10;
  const label = 'Giá';
  const fee = koc.rateCardVideo || 0;
  const row = ctx.slot.row;
  if (row === 'FOC') return { key: 'PRICE', label, max, score: fee === 0 ? max : 0, reason: fee === 0 ? 'Không phí' : `Giá ${fmt(fee)}đ, kế hoạch dành cho FOC` };
  if (fee <= 0) return { key: 'PRICE', label, max, score: 0, reason: 'Chưa có giá net trong hồ sơ' };
  const unit = planUnitBudget(ctx.plan, row);
  if (unit) {
    if (fee <= unit) return { key: 'PRICE', label, max, score: max, reason: `Giá ${fmt(fee)}đ trong đơn giá kế hoạch ${fmt(unit)}đ` };
    if (fee <= unit * 1.2) return { key: 'PRICE', label, max, score: 5, reason: `Giá ${fmt(fee)}đ cao hơn đơn giá kế hoạch ${fmt(unit)}đ (không quá 20%)` };
    warnings.push(`Giá ${fmt(fee)}đ vượt đơn giá kế hoạch ${fmt(unit)}đ trên 20%`);
    return { key: 'PRICE', label, max, score: 0, reason: `Giá ${fmt(fee)}đ vượt đơn giá kế hoạch ${fmt(unit)}đ trên 20%` };
  }
  if (row && row !== 'SELF') {
    const t = klTier(row as KlCode);
    const inside = fee >= t.min && (t.max === null || fee <= t.max);
    return { key: 'PRICE', label, max, score: inside ? max : 0, reason: inside ? `Giá ${fmt(fee)}đ nằm trong khoảng ${row}` : `Giá ${fmt(fee)}đ ngoài khoảng ${row}` };
  }
  return { key: 'PRICE', label, max, score: 5, reason: `Giá ${fmt(fee)}đ, chưa có đơn giá kế hoạch để so` };
}

function scorePillar(koc: KocItem, ctx: MatchContext): MatchScorePart {
  const max = 15;
  const label = 'Tệp kênh theo pillar';
  const group = pillarGroupOf(ctx.slot.pillar);
  const aff = PILLAR_AFFINITY[group];
  if (!aff) return { key: 'PILLAR', label, max, score: 0, reason: `Nhóm pillar "${group}" chưa có quy tắc tệp kênh` };
  let score = 0;
  const reasons: string[] = [];
  if (aff.categories.includes(koc.kocCategory)) {
    score += 8;
    reasons.push(`nhóm ${koc.kocCategory}`);
  }
  const tep = norm(koc.tepKenh);
  const tepHit = aff.tep.find(k => tep.includes(k));
  if (tepHit) {
    score += 7;
    reasons.push(`tệp ${koc.tepKenh}`);
  }
  return { key: 'PILLAR', label, max, score, reason: score > 0 ? `Phù hợp pillar ${ctx.slot.pillar}: ${reasons.join(', ')}` : `Chưa thấy nhóm hoặc tệp kênh phù hợp pillar ${ctx.slot.pillar}` };
}

function scoreProduct(koc: KocItem, ctx: MatchContext): MatchScorePart {
  const max = 15;
  const label = 'Ngành hàng / sản phẩm';
  const tokens = Array.from(new Set(norm(`${ctx.slot.product} ${ctx.slot.angle}`).split(/[^a-z0-9]+/).filter(t => t.length >= 4)));
  const captions = (koc.recentVideos || []).map(v => `${v.caption} ${(v.hashtags || []).join(' ')}`).join(' ');
  const evidence = norm(`${koc.bio || ''} ${captions}`);
  const field = norm(`${koc.niche || ''} ${(koc.tiktokTopCategories || []).join(' ')} ${koc.kocCategory || ''}`);
  if (!evidence.trim() && !field.trim()) return { key: 'PRODUCT', label, max, score: 0, reason: 'Chưa có dữ liệu kênh, cần Phân tích kênh' };
  if (tokens.length === 0) return { key: 'PRODUCT', label, max, score: 0, reason: 'Content chưa ghi sản phẩm hoặc góc nội dung để đối chiếu' };
  let score = 0;
  const reasons: string[] = [];
  const evHit = tokens.filter(t => evidence.includes(t));
  if (evHit.length > 0) {
    score += 8;
    reasons.push(`video và mô tả kênh nhắc "${evHit.slice(0, 3).join(', ')}"`);
  }
  const fieldHit = tokens.filter(t => field.includes(t));
  if (fieldHit.length > 0) {
    score += 7;
    reasons.push(`ngành kênh trùng "${fieldHit.slice(0, 3).join(', ')}"`);
  }
  return { key: 'PRODUCT', label, max, score, reason: score > 0 ? reasons.join('; ') : 'Chưa thấy nội dung kênh nhắc tới sản phẩm này' };
}

function scoreHistory(koc: KocItem, ctx: MatchContext, warnings: string[]): MatchScorePart {
  const max = 20;
  const label = 'Lịch sử hợp tác';
  const brand = norm(ctx.plan.brandName);
  const mine = ctx.deals.filter(d => d.kocId === koc.id);
  const sameBrand = mine.filter(d => norm(d.brandName) === brand);
  const rejected = sameBrand.filter(d => d.brandApprovalStatus === 'TỪ_CHỐI');
  const approved = sameBrand.filter(d => d.brandApprovalStatus === 'ĐÃ_DUYỆT');
  if (rejected.length > 0 && approved.length === 0) {
    warnings.push(`Brand ${ctx.plan.brandName} từng từ chối KOC này`);
    return { key: 'HISTORY', label, max, score: 0, reason: `Brand từng từ chối ${rejected.length} lần${rejected[0].brandRejectReason ? `: ${rejected[0].brandRejectReason}` : ''}` };
  }
  let score = 0;
  const reasons: string[] = [];
  if (approved.length > 0) {
    score += Math.min(10, 5 * approved.length);
    reasons.push(`${approved.length} lần Brand đã duyệt`);
  }
  if ((koc.totalPastDeals || 0) >= 3) {
    score += 4;
    reasons.push(`${koc.totalPastDeals} deal tại Upbase`);
  }
  if ((koc.historicalRoi || 0) >= 1) {
    score += 3;
    reasons.push(`ROI lịch sử ${koc.historicalRoi!.toFixed(1)}`);
  }
  if (koc.isWinnerTop20) {
    score += 3;
    reasons.push('nằm trong top 20 hiệu quả');
  }
  if ((koc.reliabilityScore || 0) > 0 && koc.reliabilityScore < 50) warnings.push(`Điểm tin cậy thấp (${koc.reliabilityScore})`);
  return { key: 'HISTORY', label, max, score: Math.min(max, score), reason: reasons.length > 0 ? reasons.join('; ') : 'Chưa có lịch sử hợp tác ghi nhận' };
}

function scorePerformance(koc: KocItem, warnings: string[]): MatchScorePart {
  const max = 15;
  const label = 'Hiệu quả kênh';
  if (koc.tiktokAccountHealth === 'VI_PHẠM') {
    warnings.push('Tài khoản TikTok đang vi phạm');
    return { key: 'PERFORMANCE', label, max, score: 0, reason: 'Tài khoản TikTok đang vi phạm' };
  }
  let score = 0;
  const reasons: string[] = [];
  const er = koc.engagementRate;
  if (er !== undefined && er >= 3) {
    score += 4;
    reasons.push(`tương tác ${er.toFixed(1)}%`);
  }
  if (koc.followers > 0 && koc.avgViews > 0 && koc.avgViews / koc.followers >= 0.05) {
    score += 3;
    reasons.push(`view trung bình ${Math.round((koc.avgViews / koc.followers) * 100)}% follower`);
  }
  if ((koc.gpm || 0) > 0) {
    score += 3;
    reasons.push(`GPM ${fmt(koc.gpm!)}`);
  }
  if ((koc.gmvBestCase || 0) > 0) {
    score += 3;
    reasons.push(`GMV tốt nhất ${fmt(koc.gmvBestCase!)}`);
  }
  if (koc.tiktokAccountHealth === 'TỐT') {
    score += 2;
    reasons.push('tài khoản ổn định');
  }
  if ((koc.cancellationRatePct ?? koc.tiktokCancellationRate ?? 0) > 10) warnings.push('Tỷ lệ hủy/hoàn đơn trên 10%');
  return { key: 'PERFORMANCE', label, max, score: Math.min(max, score), reason: reasons.length > 0 ? reasons.join('; ') : 'Chưa có chỉ số kênh (cần đồng bộ TikTok hoặc Phân tích kênh)' };
}

export function scoreCreator(koc: KocItem, ctx: MatchContext): MatchResult {
  const warnings: string[] = [];
  const parts = [scoreGrade(koc, ctx.slot.row), scorePrice(koc, ctx, warnings), scorePillar(koc, ctx), scoreProduct(koc, ctx), scoreHistory(koc, ctx, warnings), scorePerformance(koc, warnings)];
  let total = parts.reduce((s, p) => s + p.score, 0);
  if (ctx.usedHandles.has(cleanHandle(koc.channelId))) {
    warnings.push('Đã gán cho content khác trong kế hoạch này');
    total = Math.max(0, total - 10);
  }
  if (koc.statusKoc === 'TỪ_CHỐI') {
    warnings.push('KOC đã từ chối hợp tác');
    total = Math.max(0, total - 20);
  }
  return { koc, total, parts, warnings };
}

export function rankCreators(kocs: KocItem[], ctx: MatchContext, limit = 12): MatchResult[] {
  return kocs
    .filter(k => (k.channelId || '').trim())
    .map(k => scoreCreator(k, ctx))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}
