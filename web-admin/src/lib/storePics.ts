/**
 * Danh sách PIC theo gian — nguồn duy nhất trả lời "ai được xem dữ liệu gian X".
 *
 * Quy tắc:
 * - Mỗi gian có một danh sách PIC hiện tại. PIC hiện tại xem và làm việc trên toàn bộ dữ liệu của gian.
 * - Trưởng phòng chỉ thêm / bớt người; hệ thống tự ghi ngày nhận (since) và ngày rời (until).
 * - PIC cũ (đã rời) vẫn CHỈ XEM được dữ liệu các tháng mình phụ trách; không sửa, không xem tháng của người sau.
 * - Việc cụ thể từng tháng do kế hoạch tháng phân chia (plan.pic / growthPic / mediaPic), không quản lý ở đây.
 * - Gian chưa có danh sách vẫn dùng các trường PIC cũ trên hồ sơ gian (giai đoạn chuyển đổi).
 *
 * Định danh: đăng nhập Lark được đối soát về danh bạ nhân sự đã chuẩn hóa; khóa chính là MÃ NHÂN SỰ (staffId),
 * email chỉ là khóa phụ.
 */

export interface StorePic {
  staffId?: string; // mã nhân sự trong danh bạ (HN782...), khóa chính
  email?: string; // khóa phụ, luôn chữ thường
  name: string; // chỉ để hiển thị
  since?: string; // YYYY-MM-DD, ngày được gắn vào gian (hệ thống tự ghi)
}

export interface FormerStorePic extends StorePic {
  until: string; // YYYY-MM-DD, ngày bị gỡ khỏi gian (tính cả ngày này)
}

export interface StorePicEntry {
  pics: StorePic[];
  former?: FormerStorePic[];
  updatedBy: string;
  updatedAt: string;
}

/** storeId -> danh sách PIC */
export type StorePicData = Record<string, StorePicEntry>;

export const EMPTY_STORE_PICS: StorePicData = {};

export class StorePicRuleError extends Error {}

export const normEmail = (email: string | null | undefined) => (email || '').trim().toLowerCase();
export const normStaffId = (id: string | null | undefined) => (id || '').trim().toUpperCase();

/** Ngày hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD. */
export function todayVN(now: Date = new Date()): string {
  return new Date(now.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

/** Chuẩn hóa tháng từ các biến thể đang có trong dữ liệu: 2026/10, 2026-10, 10/2026 → { start, end }. */
export function monthBounds(raw: string | null | undefined): { start: string; end: string } | null {
  const s = (raw || '').trim();
  let y: number, m: number;
  let match = s.match(/^(\d{4})[/-](\d{1,2})$/);
  if (match) { y = +match[1]; m = +match[2]; }
  else if ((match = s.match(/^(\d{1,2})[/-](\d{4})$/))) { y = +match[2]; m = +match[1]; }
  else return null;
  if (m < 1 || m > 12) return null;
  const mm = String(m).padStart(2, '0');
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { start: `${y}-${mm}-01`, end: `${y}-${mm}-${String(last).padStart(2, '0')}` };
}

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

const samePerson = (p: StorePic, who: PersonIdentity) =>
  !!((p.staffId && who.staffIds.has(p.staffId)) || (p.email && who.email && p.email === who.email));

const picKey = (p: StorePic) => p.staffId || p.email || '';

/** Gian có danh sách PIC (kể cả rỗng sau khi gỡ hết) thì danh sách quyết định, bỏ qua các trường PIC theo tên. */
export const hasPicList = (pics: StorePic[] | undefined): pics is StorePic[] => Array.isArray(pics);

/** Đang là PIC của gian: được xem và sửa. */
export const isStorePic = (pics: StorePic[] | undefined, who: PersonIdentity) => !!pics?.some(p => samePerson(p, who));

/** Từng là PIC của gian (đã rời): chỉ được xem dữ liệu trong thời gian mình phụ trách. */
export const isFormerStorePic = (former: FormerStorePic[] | undefined, who: PersonIdentity) => !!former?.some(p => samePerson(p, who));

/**
 * Được xem dữ liệu của gian thuộc tháng `month` không: PIC hiện tại xem mọi tháng;
 * PIC cũ chỉ xem các tháng có giao với thời gian mình phụ trách.
 */
export function canReadStoreMonth(
  pics: StorePic[] | undefined,
  former: FormerStorePic[] | undefined,
  who: PersonIdentity,
  month: string | null | undefined
): boolean {
  if (isStorePic(pics, who)) return true;
  const bounds = monthBounds(month);
  if (!bounds) return false;
  return !!former?.some(p => samePerson(p, who) && (p.since || '0000-01-01') <= bounds.end && p.until >= bounds.start);
}

/**
 * Thay danh sách PIC hiện tại của một gian. Người mới được ghi ngày nhận là hôm nay;
 * người bị gỡ chuyển sang danh sách PIC cũ với ngày rời là hôm nay.
 */
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
  const today = todayVN(now);
  const prev = data[storeId];
  const prevByKey = new Map((prev?.pics || []).map(p => [picKey(p), p]));

  const seen = new Set<string>();
  const clean: StorePic[] = [];
  for (const p of pics) {
    const staffId = normStaffId(p?.staffId);
    const email = normEmail(p?.email);
    if (!staffId && !email.includes('@')) throw new StorePicRuleError(`Thiếu mã nhân sự hoặc email cho PIC ${p?.name || ''}.`.trim());
    const key = staffId || email;
    if (seen.has(key)) continue;
    seen.add(key);
    clean.push({
      ...(staffId ? { staffId } : {}),
      ...(email ? { email } : {}),
      name: (p.name || '').trim() || staffId || email,
      since: prevByKey.get(key)?.since || today, // ngày nhận do hệ thống quản lý, không lấy từ client
    });
  }

  const removed: FormerStorePic[] = (prev?.pics || [])
    .filter(p => !seen.has(picKey(p)))
    .map(p => ({ ...p, until: today }));

  return {
    ...data,
    [storeId]: {
      pics: clean,
      former: [...(prev?.former || []), ...removed],
      updatedBy: actor.name,
      updatedAt: now.toISOString(),
    },
  };
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
