import type { UserProfile } from './types';

/** Nhân sự tối thiểu để tra mã: danh bạ UPBASE_STAFF_MASTER (id = mã nhân sự) hoặc nhân sự trong Phân quyền. */
export interface StaffLike {
  id: string;
  name: string;
  staffCode?: string;
}

export interface StaffIndex {
  byCode: Map<string, StaffLike>;
  byName: Map<string, string[]>;
}

const norm = (v?: string | null) => (v || '').trim().toLowerCase();

/** Mã nhân sự của một bản ghi danh bạ: ưu tiên staffCode, nếu không có thì id (bỏ tiền tố staff-). */
export function staffCodeOf(s: StaffLike): string {
  return (s.staffCode || s.id || '').trim().replace(/^staff-/i, '');
}

/** Mã nhân sự của người đang đăng nhập. */
export function userStaffCode(user: Pick<UserProfile, 'id' | 'staffCode'> | null | undefined): string {
  if (!user) return '';
  return (user.staffCode || (user.id?.startsWith('staff-') ? user.id.slice(6) : '') || '').trim();
}

/**
 * Lập chỉ mục tra cứu. Danh sách đầu (preferred) là nhân sự được đăng nhập hệ thống:
 * khi tên trùng, chỉ những người trong danh sách này được tính trước khi xét toàn bộ danh bạ.
 */
export function buildStaffIndex(preferred: StaffLike[], all: StaffLike[] = []): StaffIndex & { preferredByName: Map<string, string[]> } {
  const byCode = new Map<string, StaffLike>();
  const byName = new Map<string, string[]>();
  const preferredByName = new Map<string, string[]>();
  const add = (map: Map<string, string[]>, s: StaffLike) => {
    const code = staffCodeOf(s);
    const key = norm(s.name);
    if (!code || !key) return;
    const list = map.get(key) || [];
    if (!list.some(c => norm(c) === norm(code))) list.push(code);
    map.set(key, list);
  };
  for (const s of [...preferred, ...all]) {
    const code = staffCodeOf(s);
    if (code && !byCode.has(norm(code))) byCode.set(norm(code), s);
    add(byName, s);
  }
  for (const s of preferred) add(preferredByName, s);
  return { byCode, byName, preferredByName };
}

export type StaffCodeResolution =
  | { status: 'OK'; code: string }
  | { status: 'AMBIGUOUS'; candidates: string[] }
  | { status: 'NOT_FOUND' };

/** Đổi tên hiển thị sang mã nhân sự. Tên trùng nhiều người thì không tự chọn. */
export function resolveStaffCode(name: string | undefined | null, index: ReturnType<typeof buildStaffIndex>): StaffCodeResolution {
  const key = norm(name);
  if (!key) return { status: 'NOT_FOUND' };
  const preferred = index.preferredByName.get(key) || [];
  if (preferred.length === 1) return { status: 'OK', code: preferred[0] };
  if (preferred.length > 1) return { status: 'AMBIGUOUS', candidates: preferred };
  const all = index.byName.get(key) || [];
  if (all.length === 1) return { status: 'OK', code: all[0] };
  if (all.length > 1) return { status: 'AMBIGUOUS', candidates: all };
  return { status: 'NOT_FOUND' };
}

/** Tách ô tên có thể chứa nhiều người ("A, B; C"). */
export function splitPeople(raw?: string | null): string[] {
  return (raw || '')
    .split(/[,;|]/)
    .map(s => s.trim())
    .filter(s => s && !['chưa phân công', 'chưa giao', 'chưa gán', '—', '-'].includes(s.toLowerCase()));
}

/**
 * Người dùng có phải là người được ghi ở ô này không.
 * Có mã thì chỉ so mã (tránh trùng tên); chưa có mã thì so tên như trước.
 */
export function isSamePerson(
  user: Pick<UserProfile, 'id' | 'staffCode' | 'name'> | null | undefined,
  code?: string | null,
  name?: string | null
): boolean {
  if (!user) return false;
  const myCode = norm(userStaffCode(user));
  const theirCode = norm((code || '').replace(/^staff-/i, ''));
  if (theirCode && myCode) return theirCode === myCode;
  const me = norm(user.name);
  if (!me) return false;
  return splitPeople(name).some(n => norm(n) === me);
}

/** Bảng tên → mã nhân sự lưu kèm gian / nhãn (khóa là tên viết thường). */
export type StaffCodeMap = Record<string, string>;

export function codeForName(map: StaffCodeMap | undefined | null, name?: string | null): string {
  return (map && map[norm(name)]) || '';
}

/** Người dùng có được ghi ở ô tên này không, tra mã qua bảng tên → mã của bản ghi. */
export function isPersonInField(
  user: Pick<UserProfile, 'id' | 'staffCode' | 'name'> | null | undefined,
  raw: string | undefined | null,
  map?: StaffCodeMap | null
): boolean {
  if (!user) return false;
  return splitPeople(raw).some(n => isSamePerson(user, codeForName(map, n), n));
}

/** Ghi mã của một người được chọn từ danh bạ vào bảng tên → mã. */
export function withStaffCode(map: StaffCodeMap | undefined | null, name: string, code?: string): StaffCodeMap {
  const next = { ...(map || {}) };
  const key = norm(name);
  if (key && code) next[key] = code.replace(/^staff-/i, '');
  return next;
}
