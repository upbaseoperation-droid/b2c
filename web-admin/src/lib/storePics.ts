/**
 * Danh sách PIC theo gian — nguồn duy nhất trả lời "ai được xem dữ liệu gian X".
 *
 * Quy tắc:
 * - Mỗi gian có một danh sách PIC (khóa theo email). Có tên trong danh sách thì được xem và làm việc trên gian.
 * - Việc cụ thể từng tháng do kế hoạch tháng phân chia (plan.pic / growthPic / mediaPic), không quản lý ở đây.
 * - Gỡ khỏi danh sách thì mất quyền vào gian, nhưng vẫn xem được các kế hoạch tháng có tên mình.
 * - Gian chưa có danh sách vẫn dùng các trường PIC cũ trên hồ sơ gian (giai đoạn chuyển đổi).
 */

export interface StorePic {
  email: string; // khóa định danh, luôn chữ thường
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

/** Gian có danh sách PIC (kể cả rỗng sau khi gỡ hết) thì danh sách quyết định, bỏ qua các trường PIC theo tên. */
export const hasPicList = (pics: StorePic[] | undefined): pics is StorePic[] => Array.isArray(pics);

export const isStorePic = (pics: StorePic[] | undefined, email: string | null | undefined) => {
  const me = normEmail(email);
  return !!me && !!pics?.some(p => p.email === me);
};

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
    const email = normEmail(p?.email);
    if (!email.includes('@')) throw new StorePicRuleError(`Thiếu email cho PIC ${p?.name || ''}.`.trim());
    if (seen.has(email)) continue;
    seen.add(email);
    clean.push({ email, name: (p.name || '').trim() || email });
  }
  return { ...data, [storeId]: { pics: clean, updatedBy: actor.name, updatedAt: now.toISOString() } };
}

/** Gợi ý danh sách PIC ban đầu từ các trường PIC theo tên đang có trên hồ sơ gian. */
export function suggestPicsFromLegacy(
  store: { b2cOwnerName?: string; primaryPic?: string; assignedStaff?: string; b2cOwners?: string[]; accountOwnerName?: string; growthPic?: string; bookingLeader?: string; contentPic?: string; mediaPic?: string; backupOwnerName?: string },
  staffByName: (name: string) => { email: string; name: string } | undefined
): StorePic[] {
  const raw = [store.b2cOwnerName, store.primaryPic, store.assignedStaff, ...(store.b2cOwners || []), store.accountOwnerName, store.growthPic, store.bookingLeader, store.contentPic, store.mediaPic, store.backupOwnerName];
  const out: StorePic[] = [];
  const seen = new Set<string>();
  for (const field of raw) {
    for (const name of (field || '').split(/[,;|]/).map(s => s.trim()).filter(Boolean)) {
      const staff = staffByName(name);
      const email = normEmail(staff?.email);
      if (staff && email && !seen.has(email)) {
        seen.add(email);
        out.push({ email, name: staff.name });
      }
    }
  }
  return out;
}
