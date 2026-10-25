import type { ContentSlot } from './contentPlanRules';
import type { StorePosition } from './storePositions';
import { DealGuardError } from './dealBoardGuard';

const stable = (v: unknown) => JSON.stringify(v ?? null);

/** Trường của ô content mà từng nhóm được sửa (Booking chính / Giám đốc sửa tất cả). */
const BOOKING_FIELDS = new Set(['kocHandle', 'kocHandles', 'rejectedKoc', 'updatedAt']);
const COMMENT_FIELDS = new Set(['note', 'updatedAt']);

function changedFields(a: ContentSlot, b: ContentSlot): string[] {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].filter(k => stable((a as unknown as Record<string, unknown>)[k]) !== stable((b as unknown as Record<string, unknown>)[k]));
}

/**
 * Kế hoạch content của gian:
 * - Booking chính (quyết định pillar, content chi tiết) và Giám đốc: sửa tất cả.
 * - PIC Kênh tự sở hữu: chỉ các dòng kênh tự sở hữu (SELF), thêm / bớt được dòng SELF.
 * - Booking cùng làm / Dự phòng: chỉ gán KOC vào ô (không đổi nội dung).
 * - PIC Plan / KV, Leader: chỉ góp ý ở ô Ghi chú, không đổi nội dung.
 */
export function guardContentPlanSave(prev: ContentSlot[], next: ContentSlot[], c: { global: boolean; positions: Set<StorePosition> }) {
  if (c.global || c.positions.has('BOOKING_MAIN')) return;
  const selfOwner = c.positions.has('SELF_CHANNEL');
  const booking = c.positions.has('BOOKING_CO') || c.positions.has('BACKUP');
  const commenter = c.positions.has('PLAN_STRATEGY') || c.positions.has('KEY_VISUAL') || c.positions.has('LEADER');
  const before = new Map(prev.map(s => [s.id, s]));
  const after = new Set(next.map(s => s.id));

  for (const old of prev) {
    if (after.has(old.id)) continue;
    if (!(selfOwner && old.row === 'SELF')) throw new DealGuardError(`Không xóa được content ${old.briefCode || old.id}: chỉ Booking chính sửa nội dung kế hoạch content.`);
  }
  for (const s of next) {
    const old = before.get(s.id);
    if (!old) {
      if (selfOwner && s.row === 'SELF') continue;
      throw new DealGuardError('Chỉ Booking chính thêm được content (PIC Kênh tự sở hữu thêm được dòng kênh tự sở hữu).');
    }
    const changed = changedFields(old, s);
    if (!changed.length) continue;
    if (selfOwner && old.row === 'SELF' && s.row === 'SELF') continue;
    const allowed = new Set<string>([...(booking ? BOOKING_FIELDS : []), ...(commenter || booking || selfOwner ? COMMENT_FIELDS : [])]);
    const outside = changed.filter(k => !allowed.has(k));
    if (outside.length) {
      throw new DealGuardError(`Content ${s.briefCode || s.id}: bạn không sửa được ${outside.slice(0, 3).join(', ')} (Booking chính quyết định nội dung).`);
    }
  }
}
