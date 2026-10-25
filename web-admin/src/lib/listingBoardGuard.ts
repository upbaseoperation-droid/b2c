import type { KocListingItem } from './types';
import type { StorePosition } from './storePositions';
import { isPersonInField, type StaffCodeMap } from './staffIdentity';
import { columnOf, itemFee } from './listingBoardRules';
import { DealGuardError } from './dealBoardGuard';

export interface ListingGuardContext {
  actor: { id: string; name: string; staffCode?: string };
  global: boolean;
  positions: Set<StorePosition>;
  storeCodes?: StaffCodeMap;
  /** listingItemId của các KOC đã có Deal trên bảng Deal */
  itemsWithDeal: Set<string>;
}

const stable = (v: unknown) => JSON.stringify(v ?? null);
const isOwnerLevel = (c: ListingGuardContext) => c.global || c.positions.has('BOOKING_MAIN') || c.positions.has('LEADER');
const isExecutor = (c: ListingGuardContext) => c.positions.has('BOOKING_CO') || c.positions.has('BACKUP');
const owns = (c: ListingGuardContext, i?: KocListingItem) => Boolean(i && isPersonInField(c.actor, i.assignedStaffName, c.storeCodes));

const isFocItem = (i: KocListingItem) => itemFee(i) <= 0 || i.salaryGrade === 'TAP UpAffiliate';

/**
 * Brand đã duyệt có căn cứ: kết quả lấy từ Sheet (máy chủ ghi), bằng chứng đính kèm, hoặc KOC FOC 0đ.
 * KOL "Brand chỉ định" cũng phải có bằng chứng (ghi chú tự gõ không đủ).
 */
export function hasBrandApprovalBasis(i: KocListingItem): boolean {
  return i.lastSheetDecision === 'APPROVED' || Boolean((i.brandApprovalEvidence || '').trim()) || isFocItem(i);
}

/**
 * Kiểm lưu bảng Listing:
 * - Booking chính / Leader / Giám đốc sửa mọi KOC; Booking cùng làm chỉ KOC do mình phụ trách.
 * - Kết quả kéo từ Sheet do máy chủ ghi, không nhận từ trình duyệt.
 * - Không đánh "Brand duyệt" / chốt khi không có căn cứ.
 * - KOC đã có Deal không bị xóa hay kéo khỏi cột Đã chốt.
 */
export function guardListingSave(prev: KocListingItem[], next: KocListingItem[], c: ListingGuardContext): KocListingItem[] {
  if (!isOwnerLevel(c) && !isExecutor(c)) {
    if (stable(prev) !== stable(next)) throw new DealGuardError('Bạn không thuộc nhóm Booking của gian, không sửa được Listing.');
    return next;
  }
  const before = new Map(prev.map(i => [i.id, i]));
  const kept = new Set(next.map(i => i.id));
  for (const old of prev) {
    if (kept.has(old.id)) continue;
    if (c.itemsWithDeal.has(old.id)) throw new DealGuardError(`KOC ${old.kocHandle || old.kocName} đã có Deal, không xóa khỏi Listing được.`, 409);
    if (!isOwnerLevel(c) && !owns(c, old)) throw new DealGuardError(`KOC ${old.kocHandle || old.kocName} do ${old.assignedStaffName || 'Booking chính'} phụ trách, bạn không xóa được.`);
  }

  return next.map(raw => {
    const old = before.get(raw.id);
    // Kết quả Brand trên Sheet chỉ máy chủ ghi khi kéo Sheet
    // (Giám đốc / Admin được ghi thẳng khi nhập / sửa dữ liệu)
    let i: KocListingItem = c.global ? { ...raw } : { ...raw, lastSheetDecision: old?.lastSheetDecision, lastSheetDecisionAt: old?.lastSheetDecisionAt };
    if (!old) {
      if (!isOwnerLevel(c)) {
        const pic = i.assignedStaffName?.trim() ? i.assignedStaffName : c.actor.name;
        if (!isPersonInField(c.actor, pic, c.storeCodes)) throw new DealGuardError('Booking cùng làm chỉ thêm KOC do chính mình phụ trách.');
        i = { ...i, assignedStaffName: pic };
      }
    } else if (stable(old) !== stable(i)) {
      if (!isOwnerLevel(c) && !owns(c, old)) {
        throw new DealGuardError(`KOC ${old.kocHandle || old.kocName} do ${old.assignedStaffName || 'Booking chính'} phụ trách, bạn không sửa được.`);
      }
      if ((old.assignedStaffName || '') !== (i.assignedStaffName || '') && !isOwnerLevel(c)) {
        throw new DealGuardError('Chỉ Booking chính / Leader được đổi người phụ trách KOC.');
      }
      if (c.itemsWithDeal.has(i.id) && columnOf(old) === 'CONFIRMED' && columnOf(i) !== 'CONFIRMED') {
        throw new DealGuardError(`KOC ${i.kocHandle || i.kocName} đã có Deal; muốn rớt / đổi KOC thì xử lý trên Deal (vòng đời Job).`, 409);
      }
    }
    const becameApproved = i.brandApprovalStatus === 'BRAND_APPROVED' && old?.brandApprovalStatus !== 'BRAND_APPROVED';
    const toCol = columnOf(i);
    const enteringNegotiation = (toCol === 'NEGOTIATING' || toCol === 'CONFIRMED') && (!old || !['NEGOTIATING', 'CONFIRMED'].includes(columnOf(old)));
    if (!c.global && (becameApproved || enteringNegotiation) && !old?.brandApprovedAt && !hasBrandApprovalBasis(i)) {
      throw new DealGuardError(`KOC ${i.kocHandle || i.kocName}: chưa có kết quả Brand duyệt (kéo từ Sheet) hoặc bằng chứng Brand duyệt.`, 400);
    }
    if (toCol === 'CONFIRMED' && (!old || columnOf(old) !== 'CONFIRMED') && !isFocItem(i) && !(i.finalFee ?? i.proposedFee)) {
      throw new DealGuardError(`KOC ${i.kocHandle || i.kocName}: chưa có giá chốt.`, 400);
    }
    return i;
  });
}
