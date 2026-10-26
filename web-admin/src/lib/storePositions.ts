import type { BrandDetail, InputPlanBreakdownState, StorePortfolioItem, UserProfile } from './types';
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

/**
 * Hợp nhất vị trí của nhân sự trên Gian hàng (từ Dữ liệu gốc) và trên Kế hoạch tháng (4.1 & 4.1.1).
 * Đảm bảo:
 * - Người đứng tên `primaryPic` / `Booking PIC` trên 4.1 của kỳ đó được nhận diện là `BOOKING_MAIN`.
 * - Nhân sự phụ chia tải trên `4.1.1` (`staffWeeklySlices`, `assignedMembers`, `FOC PIC`, `Live PIC`) được nhận diện là `BOOKING_CO`.
 * - Nhân sự phụ trách kênh Brand (`contentPic` trên 4.1 hoặc `Phụ trách Self` trên 4.1.1) được nhận diện là `SELF_CHANNEL`.
 * - Kể cả các gian hàng mới phát sinh trong tháng chưa kịp tạo bản ghi trong 69 gian gốc vẫn phân quyền chính xác theo `plan`.
 */
export function planPositionsOf(
  user: Person | null | undefined,
  plan: Pick<
    InputPlanBreakdownState,
    | 'pic'
    | 'primaryPic'
    | 'bookingLeader'
    | 'hasBookingLeader'
    | 'assignedMembers'
    | 'staffWeeklySlices'
    | 'reference41'
    | 'items'
  > | null | undefined,
  store?: StoreLike | null,
  brand?: BrandLike | null,
  today: Date = new Date()
): Set<StorePosition> {
  const out = store ? storePositionsOf(user, store, brand, today) : new Set<StorePosition>();
  if (!user) return out;
  const codes = { ...(store?.staffCodes || {}), ...(brand?.staffCodes || {}) };

  if (!store && brand) {
    if (isPersonInField(user, brand.planStrategyPic, codes)) out.add('PLAN_STRATEGY');
    if (isPersonInField(user, brand.keyVisualSisPic, codes)) out.add('KEY_VISUAL');
  }

  if (!plan) return out;

  // 1. Leader trên kế hoạch (nếu gian chưa có trong catalog)
  if (!store && plan.hasBookingLeader !== false && isPersonInField(user, plan.bookingLeader, codes)) {
    out.add('LEADER');
  }

  // 2. PIC chính của kế hoạch tháng (4.1 Booking PIC đầu tiên hoặc primaryPic)
  const ref = plan.reference41;
  const rolePics = ref?.rolePics;
  const planMainCandidates = [
    ...splitPeople(plan.primaryPic),
    ...splitPeople(plan.pic),
    ...(rolePics?.bookingPics || []).flatMap(splitPeople),
  ];
  const planMain = planMainCandidates[0] || '';
  if (planMain && isPersonInField(user, planMain, codes)) {
    out.add('BOOKING_MAIN');
  }

  // 3. Các lát cắt nhập liệu 4.1.1 theo nhân sự (staffWeeklySlices)
  for (const slice of plan.staffWeeklySlices || []) {
    if (!isPersonInField(user, slice.staffName, codes)) continue;
    const roleLbl = (slice.roleLabel || '').toLowerCase();
    if (roleLbl.startsWith('pic chính')) {
      out.add('BOOKING_MAIN');
    } else if (roleLbl.includes('self')) {
      out.add('SELF_CHANNEL');
      out.add('BOOKING_CO');
    } else {
      out.add('BOOKING_CO');
    }
  }

  // 4. Nhân sự cùng làm / chuyên trách FOC / Live trên kế hoạch tháng
  const coCandidates = [
    ...planMainCandidates.slice(1),
    ...(plan.assignedMembers || []).flatMap(splitPeople),
    ...splitPeople(ref?.focPic),
    ...(rolePics?.focPics || []).flatMap(splitPeople),
    ...splitPeople(ref?.livePic),
    ...(rolePics?.livePics || []).flatMap(splitPeople),
    ...(plan.items || []).flatMap(it => splitPeople(it.assignedStaff)),
  ];
  for (const cand of coCandidates) {
    if (isPersonInField(user, cand, codes)) {
      out.add('BOOKING_CO');
      break;
    }
  }

  // 5. Nhân sự phụ trách Content / Self-channel trên Bảng 4.1
  const selfCandidates = [
    ...splitPeople(ref?.contentPic),
    ...(rolePics?.contentPics || []).flatMap(splitPeople),
  ];
  for (const cand of selfCandidates) {
    if (isPersonInField(user, cand, codes)) {
      out.add('SELF_CHANNEL');
      break;
    }
  }

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

/**
 * Kiểm tra quyền sửa nội dung kế hoạch tháng (4.1.1):
 * Cho phép PIC chính (`BOOKING_MAIN`), nhân sự phụ cùng chia tải / FOC (`BOOKING_CO`),
 * nhân sự dự phòng đang hiệu lực (`BACKUP`), nhân sự phụ trách Self-channel (`SELF_CHANNEL`) hoặc Quản lý toàn cục.
 */
export function canEditPlanContent(positions: Set<StorePosition>, isGlobal: boolean): boolean {
  return (
    isGlobal ||
    positions.has('BOOKING_MAIN') ||
    positions.has('BOOKING_CO') ||
    positions.has('BACKUP') ||
    positions.has('SELF_CHANNEL')
  );
}

/**
 * Kiểm tra quyền bấm chốt gửi duyệt kế hoạch tháng lên cấp trên:
 * Chỉ PIC chính (`BOOKING_MAIN`), nhân sự dự phòng đang hiệu lực (`BACKUP`), Trưởng nhóm (`LEADER`) hoặc Quản lý toàn cục.
 */
export function canSubmitPlanForApproval(positions: Set<StorePosition>, isGlobal: boolean): boolean {
  return (
    isGlobal ||
    positions.has('BOOKING_MAIN') ||
    positions.has('BACKUP') ||
    positions.has('LEADER')
  );
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
