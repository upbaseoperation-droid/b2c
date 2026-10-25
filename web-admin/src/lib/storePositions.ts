import type { BrandDetail, StorePortfolioItem, UserProfile } from './types';
import { isPersonInField, splitPeople } from './staffIdentity';

/**
 * Vị trí của một người trên gian hàng, lấy từ Dữ liệu gốc (nguồn duy nhất).
 * Một người có thể giữ nhiều vị trí; quyền là tổng quyền của các vị trí.
 */
export type StorePosition =
  | 'LEADER' // Trưởng nhóm Booking của gian
  | 'BOOKING_MAIN' // Booking chính (kiêm quyết định content), 1 người
  | 'BOOKING_CO' // Booking cùng làm
  | 'BACKUP' // Dự phòng, chỉ trong thời gian hiệu lực
  | 'SELF_CHANNEL' // PIC Kênh tự sở hữu
  | 'PLAN_STRATEGY' // PIC Plan / Strategy (cấp nhãn)
  | 'KEY_VISUAL'; // PIC Key Visual / SIS (cấp nhãn)

type StoreLike = Pick<
  StorePortfolioItem,
  | 'primaryPic'
  | 'b2cOwnerName'
  | 'b2cOwners'
  | 'assignedMembers'
  | 'assignedStaff'
  | 'assignedPic'
  | 'bookingLeader'
  | 'hasBookingLeader'
  | 'contentPic'
  | 'backupOwnerName'
  | 'isBackupActive'
  | 'backupFrom'
  | 'backupTo'
  | 'planStrategyPic'
  | 'keyVisualSisPic'
  | 'staffCodes'
>;
type BrandLike = Pick<BrandDetail, 'planStrategyPic' | 'keyVisualSisPic' | 'staffCodes'>;
type Person = Pick<UserProfile, 'id' | 'staffCode' | 'name'>;

const lower = (v?: string) => (v || '').trim().toLowerCase();

/** Booking chính: người đầu tiên trong danh sách Booking của gian. */
export function storeMainBooking(store: StoreLike): string {
  return (
    splitPeople(store.primaryPic)[0] ||
    (store.b2cOwners || []).flatMap(splitPeople)[0] ||
    splitPeople(store.b2cOwnerName)[0] ||
    splitPeople(store.assignedStaff)[0] ||
    splitPeople(store.assignedPic)[0] ||
    ''
  );
}

/** Booking cùng làm: các Booking còn lại của gian, không gồm người dự phòng. */
export function storeCoBookings(store: StoreLike): string[] {
  const main = lower(storeMainBooking(store));
  const backup = lower(store.backupOwnerName);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of [
    ...(store.b2cOwners || []).flatMap(splitPeople),
    ...splitPeople(store.b2cOwnerName),
    ...(store.assignedMembers || []).flatMap(splitPeople),
  ]) {
    const k = lower(n);
    if (!k || k === main || k === backup || seen.has(k)) continue;
    seen.add(k);
    out.push(n);
  }
  return out;
}

/** Leader của gian: đọc từ Dữ liệu gốc lúc cần dùng (không dùng bản chụp trên kế hoạch). */
export function storeLeader(store: StoreLike): string {
  if (store.hasBookingLeader === false) return '';
  return splitPeople(store.bookingLeader)[0] || '';
}

/** Dự phòng chỉ có hiệu lực khi đang bật và hôm nay nằm trong khoảng ngày (nếu có ghi ngày). */
export function isBackupEffective(store: StoreLike, today: Date = new Date()): boolean {
  if (!store.backupOwnerName || !store.isBackupActive) return false;
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  if (store.backupFrom && day < store.backupFrom) return false;
  if (store.backupTo && day > store.backupTo) return false;
  return true;
}

export function storePositionsOf(
  user: Person | null | undefined,
  store: StoreLike | null | undefined,
  brand?: BrandLike | null,
  today: Date = new Date()
): Set<StorePosition> {
  const out = new Set<StorePosition>();
  if (!user || !store) return out;
  const codes = store.staffCodes;
  const brandCodes = { ...(codes || {}), ...(brand?.staffCodes || {}) };
  if (isPersonInField(user, storeLeader(store), codes)) out.add('LEADER');
  if (isPersonInField(user, storeMainBooking(store), codes)) out.add('BOOKING_MAIN');
  if (storeCoBookings(store).some(n => isPersonInField(user, n, codes))) out.add('BOOKING_CO');
  if (isBackupEffective(store, today) && isPersonInField(user, store.backupOwnerName, codes)) out.add('BACKUP');
  if (isPersonInField(user, store.contentPic, codes)) out.add('SELF_CHANNEL');
  // Plan / KV gán theo nhãn; gian chỉ dùng giá trị cũ khi nhãn chưa đặt người
  const plan = brand?.planStrategyPic || store.planStrategyPic;
  const kv = brand?.keyVisualSisPic || store.keyVisualSisPic;
  if (isPersonInField(user, plan, brandCodes)) out.add('PLAN_STRATEGY');
  if (isPersonInField(user, kv, brandCodes)) out.add('KEY_VISUAL');
  return out;
}

/** Người thực thi Booking của gian (chính, cùng làm, dự phòng đang hiệu lực). */
export function isBookingExecutor(positions: Set<StorePosition>): boolean {
  return positions.has('BOOKING_MAIN') || positions.has('BOOKING_CO') || positions.has('BACKUP');
}

/** Người được sửa toàn bộ deal / listing của gian và quyết định ở cấp gian. */
export function isStoreBookingOwner(positions: Set<StorePosition>): boolean {
  return positions.has('BOOKING_MAIN') || positions.has('LEADER');
}

export const STORE_POSITION_LABEL: Record<StorePosition, string> = {
  LEADER: 'Leader Booking',
  BOOKING_MAIN: 'Booking chính',
  BOOKING_CO: 'Booking cùng làm',
  BACKUP: 'Dự phòng',
  SELF_CHANNEL: 'PIC Kênh tự sở hữu',
  PLAN_STRATEGY: 'PIC Plan / Strategy',
  KEY_VISUAL: 'PIC Key Visual / SIS',
};
