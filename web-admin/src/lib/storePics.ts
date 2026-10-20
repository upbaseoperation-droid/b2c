/**
 * Danh sách PIC theo gian — nguồn duy nhất trả lời "ai đang phụ trách gian X".
 *
 * Phân quyền 2 nấc:
 * 1. PIC gian (danh sách này): xem và làm việc trên toàn bộ dữ liệu của gian.
 * 2. Người được phân việc trong kế hoạch tháng của gian (plan.pic, primaryPic, growthPic, mediaPic,
 *    assignedMembers, người nhận từng dòng việc): là PIC tham gia gian trong tháng đó, xem được kế hoạch ấy —
 *    kể cả sau khi đã rời danh sách PIC gian. Kế hoạch tháng chính là lịch sử ai làm gian nào, tháng nào.
 * Gian chưa có danh sách vẫn dùng các trường PIC cũ trên hồ sơ gian (giai đoạn chuyển đổi).
 *
 * Định danh: đăng nhập Lark được đối soát về danh bạ nhân sự đã chuẩn hóa; khóa chính là MÃ NHÂN SỰ (staffId),
 * email chỉ là khóa phụ.
 */

export interface StorePic {
  staffId?: string; // mã nhân sự trong danh bạ (HN782...), khóa chính
  email?: string; // khóa phụ, luôn chữ thường
  name: string; // chỉ để hiển thị
}

export interface StorePicEntry {
  pics: StorePic[];
  updatedBy: string;
  updatedAt: string;
}

/** storeId -> danh sách PIC */
export type StorePicData = Record<string, StorePicEntry>;

export const EMPTY_STORE_PICS: StorePicData = {};

export class StorePicRuleError extends Error {}

export const normEmail = (email: string | null | undefined) => (email || '').trim().toLowerCase();
export const normStaffId = (id: string | null | undefined) => (id || '').trim().toUpperCase();

/** Các định danh của người đang đăng nhập dùng để so với danh sách PIC. */
export interface PersonIdentity {
  staffIds: Set<string>;
  email: string;
}

/** Tài khoản từ danh bạ có id dạng `staff-<mã>`; tài khoản cốt lõi có thể mang staffCode. */
export function personIdentity(user: { id?: string; email?: string; staffCode?: string } | null | undefined): PersonIdentity {
  const staffIds = new Set<string>();
  if (user?.staffCode) staffIds.add(normStaffId(user.staffCode));
  if (user?.id?.startsWith('staff-')) staffIds.add(normStaffId(user.id.slice('staff-'.length)));
  staffIds.delete('');
  return { staffIds, email: normEmail(user?.email) };
}

/** Gian có danh sách PIC (kể cả rỗng sau khi gỡ hết) thì danh sách quyết định, bỏ qua các trường PIC theo tên. */
export const hasPicList = (pics: StorePic[] | undefined): pics is StorePic[] => Array.isArray(pics);

export const isStorePic = (pics: StorePic[] | undefined, who: PersonIdentity) =>
  !!pics?.some(p => (p.staffId && who.staffIds.has(p.staffId)) || (p.email && who.email && p.email === who.email));

/** Tất cả người được phân việc trong một kế hoạch tháng (theo tên, như kế hoạch đang lưu). */
export function planParticipantNames(plan: {
  pic?: string; primaryPic?: string; growthPic?: string; mediaPic?: string; submittedBy?: string;
  assignedMembers?: string[]; items?: { assignedStaff?: string }[];
}): string[] {
  return [
    plan.pic, plan.primaryPic, plan.growthPic, plan.mediaPic, plan.submittedBy,
    ...(plan.assignedMembers || []),
    ...(plan.items || []).map(i => i.assignedStaff),
  ].filter((n): n is string => !!n && !!n.trim());
}

export function setStorePics(
  data: StorePicData,
  storeId: string,
  pics: StorePic[],
  actor: { name: string },
  storeIds: Set<string>,
  now: Date = new Date()
): StorePicData {
  if (!storeIds.has(storeId)) throw new StorePicRuleError(`Gian hàng ${storeId} không tồn tại.`);
  if (!Array.isArray(pics) || pics.length > 50) throw new StorePicRuleError('Danh sách PIC không hợp lệ.');
  const seen = new Set<string>();
  const clean: StorePic[] = [];
  for (const p of pics) {
    const staffId = normStaffId(p?.staffId);
    const email = normEmail(p?.email);
    if (!staffId && !email.includes('@')) throw new StorePicRuleError(`Thiếu mã nhân sự hoặc email cho PIC ${p?.name || ''}.`.trim());
    const key = staffId || email;
    if (seen.has(key)) continue;
    seen.add(key);
    clean.push({ ...(staffId ? { staffId } : {}), ...(email ? { email } : {}), name: (p.name || '').trim() || staffId || email });
  }
  return { ...data, [storeId]: { pics: clean, updatedBy: actor.name, updatedAt: now.toISOString() } };
}

/** Gợi ý danh sách PIC ban đầu từ các trường PIC theo tên đang có trên hồ sơ gian. */
export function suggestPicsFromLegacy(
  store: { b2cOwnerName?: string; primaryPic?: string; assignedStaff?: string; b2cOwners?: string[]; accountOwnerName?: string; growthPic?: string; bookingLeader?: string; contentPic?: string; mediaPic?: string; backupOwnerName?: string },
  staffByName: (name: string) => { staffId?: string; email?: string; name: string } | undefined
): StorePic[] {
  const raw = [store.b2cOwnerName, store.primaryPic, store.assignedStaff, ...(store.b2cOwners || []), store.accountOwnerName, store.growthPic, store.bookingLeader, store.contentPic, store.mediaPic, store.backupOwnerName];
  const out: StorePic[] = [];
  const seen = new Set<string>();
  for (const field of raw) {
    for (const name of (field || '').split(/[,;|]/).map(s => s.trim()).filter(Boolean)) {
      const staff = staffByName(name);
      if (!staff) continue;
      const staffId = normStaffId(staff.staffId);
      const email = normEmail(staff.email);
      const key = staffId || email;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({ ...(staffId ? { staffId } : {}), ...(email ? { email } : {}), name: staff.name });
    }
  }
  return out;
}
