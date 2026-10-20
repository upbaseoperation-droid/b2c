/**
 * Phân công gian hàng có thời hạn hiệu lực — nguồn duy nhất trả lời "ai phụ trách gian X vào ngày D".
 *
 * Quy tắc nghiệp vụ (chốt với Trưởng phòng 2026-10-20):
 * - Phân công tháng M được lập dạng nháp và CHỐT trước ngày 01 của tháng M; khi chốt mới sinh dòng hiệu lực từ ngày 01.
 * - Bàn giao giữa tháng: đóng dòng cũ ở ngày trước ngày hiệu lực, mở dòng mới từ ngày hiệu lực. Không cho lùi ngày.
 * - Quyền xem: PIC hiện tại / sắp nhận xem toàn bộ gian; PIC cũ vẫn xem (chỉ đọc) dữ liệu các tháng mình từng phụ trách.
 * - Quyền ghi: chỉ PIC chưa bàn giao (dòng còn hiệu lực hôm nay hoặc bắt đầu trong tương lai).
 * - Gian chưa có dòng phân công nào vẫn dùng các trường PIC cũ trên hồ sơ gian (giai đoạn chuyển đổi).
 */

export type AssignmentRole = 'B2C_OWNER' | 'GROWTH' | 'BOOKING' | 'CONTENT' | 'MEDIA' | 'BACKUP';

export const ASSIGNMENT_ROLES: { key: AssignmentRole; label: string }[] = [
  { key: 'B2C_OWNER', label: 'PIC B2C' },
  { key: 'GROWTH', label: 'Growth / Account' },
  { key: 'BOOKING', label: 'Lead Booking' },
  { key: 'CONTENT', label: 'Content' },
  { key: 'MEDIA', label: 'Media' },
  { key: 'BACKUP', label: 'Dự phòng' },
];

export interface StoreAssignment {
  id: string;
  storeId: string;
  role: AssignmentRole;
  staffEmail: string; // khóa định danh, luôn chữ thường
  staffName: string; // chỉ để hiển thị
  validFrom: string; // YYYY-MM-DD
  validTo: string | null; // YYYY-MM-DD, null = chưa kết thúc
  source: 'MONTH_LOCK' | 'HANDOVER';
  createdBy: string;
  createdAt: string;
  note?: string;
}

export interface MonthAssignmentRow {
  storeId: string;
  role: AssignmentRole;
  staffEmail: string;
  staffName: string;
}

export interface MonthAssignmentPlan {
  month: string; // YYYY/MM
  status: 'DRAFT' | 'LOCKED';
  rows: MonthAssignmentRow[];
  updatedBy: string;
  updatedAt: string;
  lockedBy?: string;
  lockedAt?: string;
}

export interface StoreAssignmentData {
  assignments: StoreAssignment[];
  months: Record<string, MonthAssignmentPlan>;
}

export const EMPTY_STORE_ASSIGNMENTS: StoreAssignmentData = { assignments: [], months: {} };

export class AssignmentRuleError extends Error {}

const MONTH_RE = /^(\d{4})\/(0[1-9]|1[0-2])$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const normEmail = (email: string | null | undefined) => (email || '').trim().toLowerCase();

/** Ngày hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD. */
export function todayVN(now: Date = new Date()): string {
  return new Date(now.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

export function assertMonth(month: string) {
  if (!MONTH_RE.test(month)) throw new AssignmentRuleError('Tháng không hợp lệ (định dạng YYYY/MM).');
}

export function assertDate(date: string) {
  if (!DATE_RE.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) throw new AssignmentRuleError('Ngày không hợp lệ (định dạng YYYY-MM-DD).');
}

export function monthRange(month: string): { start: string; end: string } {
  assertMonth(month);
  const [y, m] = month.split('/').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, '0');
  return { start: `${y}-${mm}-01`, end: `${y}-${mm}-${String(last).padStart(2, '0')}` };
}

export function monthOfDate(date: string): string {
  return `${date.slice(0, 4)}/${date.slice(5, 7)}`;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Chuẩn hóa tháng từ các biến thể đang có trong dữ liệu kế hoạch: 2026/10, 2026-10, 10/2026. */
export function normalizeMonth(raw: string | null | undefined): string | null {
  const s = (raw || '').trim();
  let m = s.match(/^(\d{4})[/-](\d{1,2})$/);
  if (m) return `${m[1]}/${m[2].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[2]}/${m[1].padStart(2, '0')}`;
  return null;
}

export const isActiveOn = (a: StoreAssignment, date: string) => a.validFrom <= date && (a.validTo === null || a.validTo >= date);

export function overlapsMonth(a: StoreAssignment, month: string): boolean {
  const { start, end } = monthRange(month);
  return a.validFrom <= end && (a.validTo === null || a.validTo >= start);
}

/** Dòng chưa bàn giao: còn hiệu lực hôm nay hoặc sẽ bắt đầu sau hôm nay. */
const notHandedOver = (a: StoreAssignment, today: string) => a.validTo === null || a.validTo >= today;

export interface StoreAccessDecision {
  /** Gian đã chuyển sang phân công có hiệu lực — các trường PIC cũ không còn cấp quyền. */
  managed: boolean;
  read: boolean;
  write: boolean;
}

/**
 * Quyết định quyền của một email trên một gian dựa vào các dòng phân công của chính gian đó.
 * `month` (YYYY/MM) giới hạn theo dữ liệu tháng: PIC cũ chỉ xem được tháng mình từng phụ trách.
 */
export function decideStoreAccess(
  rows: StoreAssignment[] | undefined,
  email: string,
  options: { month?: string | null; today?: string } = {}
): StoreAccessDecision {
  if (!rows || rows.length === 0) return { managed: false, read: false, write: false };
  const me = normEmail(email);
  const today = options.today || todayVN();
  const mine = me ? rows.filter(r => r.staffEmail === me) : [];
  if (mine.length === 0) return { managed: true, read: false, write: false };
  const month = options.month ? normalizeMonth(options.month) : null;
  const current = mine.filter(r => notHandedOver(r, today));
  if (!month) return { managed: true, read: true, write: current.length > 0 };
  const inMonth = mine.filter(r => overlapsMonth(r, month));
  return {
    managed: true,
    read: current.length > 0 || inMonth.length > 0,
    write: inMonth.some(r => notHandedOver(r, today)),
  };
}

export function rowsForStore(data: StoreAssignmentData, storeId: string): StoreAssignment[] {
  return data.assignments.filter(a => a.storeId === storeId);
}

/** Danh sách PIC đang hiệu lực vào một ngày, theo gian × vai trò. */
export function activeRowsOn(data: StoreAssignmentData, date: string): StoreAssignment[] {
  return data.assignments.filter(a => isActiveOn(a, date));
}

const keyOf = (storeId: string, role: AssignmentRole) => `${storeId}::${role}`;

function validateRows(rows: MonthAssignmentRow[], storeIds: Set<string>) {
  const roleKeys = new Set(ASSIGNMENT_ROLES.map(r => r.key));
  const seen = new Set<string>();
  for (const row of rows) {
    if (!storeIds.has(row.storeId)) throw new AssignmentRuleError(`Gian hàng ${row.storeId} không tồn tại.`);
    if (!roleKeys.has(row.role)) throw new AssignmentRuleError(`Vai trò ${row.role} không hợp lệ.`);
    const email = normEmail(row.staffEmail);
    if (!email.includes('@')) throw new AssignmentRuleError(`Thiếu email nhân sự cho gian ${row.storeId}.`);
    const k = `${keyOf(row.storeId, row.role)}::${email}`;
    if (seen.has(k)) throw new AssignmentRuleError(`Trùng nhân sự ${row.staffName || email} ở cùng vai trò của gian ${row.storeId}.`);
    seen.add(k);
  }
}

export interface Actor { email: string; name: string }

export function saveMonthDraft(
  data: StoreAssignmentData,
  month: string,
  rows: MonthAssignmentRow[],
  actor: Actor,
  storeIds: Set<string>,
  now: Date = new Date()
): StoreAssignmentData {
  assertMonth(month);
  const today = todayVN(now);
  if (data.months[month]?.status === 'LOCKED') throw new AssignmentRuleError(`Phân công tháng ${month} đã chốt. Thay đổi phải đi qua bàn giao.`);
  if (monthRange(month).start <= today) throw new AssignmentRuleError(`Tháng ${month} đã bắt đầu, không lập nháp được nữa. Dùng bàn giao để đổi PIC.`);
  const clean = rows.map(r => ({ ...r, staffEmail: normEmail(r.staffEmail), staffName: (r.staffName || '').trim() }));
  validateRows(clean, storeIds);
  return {
    ...data,
    months: { ...data.months, [month]: { month, status: 'DRAFT', rows: clean, updatedBy: actor.name, updatedAt: now.toISOString() } },
  };
}

/**
 * Chốt phân công tháng: chỉ trước ngày 01 của tháng; không chốt khi đã có tháng sau được chốt.
 * Với mỗi gian × vai trò: người giữ nguyên thì dòng cũ chạy tiếp, người thôi phụ trách thì đóng dòng ở ngày cuối tháng trước,
 * người mới nhận thì mở dòng từ ngày 01.
 */
export function lockMonth(data: StoreAssignmentData, month: string, actor: Actor, now: Date = new Date()): StoreAssignmentData {
  const plan = data.months[month];
  if (!plan) throw new AssignmentRuleError(`Chưa có bản nháp phân công tháng ${month}.`);
  if (plan.status === 'LOCKED') throw new AssignmentRuleError(`Phân công tháng ${month} đã chốt.`);
  const { start } = monthRange(month);
  const today = todayVN(now);
  if (start <= today) throw new AssignmentRuleError(`Phải chốt trước ngày ${start}. Tháng đã bắt đầu thì dùng bàn giao.`);
  const laterLocked = Object.values(data.months).find(m => m.status === 'LOCKED' && m.month > month);
  if (laterLocked) throw new AssignmentRuleError(`Tháng ${laterLocked.month} đã chốt; không chốt ngược tháng ${month}.`);
  if (data.assignments.some(a => a.validFrom > start)) throw new AssignmentRuleError(`Đã có bàn giao hẹn sau ngày ${start}; xử lý bàn giao đó trước khi chốt.`);

  const dayBefore = addDays(start, -1);
  const stamp = now.toISOString();
  const wanted = new Map<string, Map<string, MonthAssignmentRow>>();
  for (const row of plan.rows) {
    const k = keyOf(row.storeId, row.role);
    if (!wanted.has(k)) wanted.set(k, new Map());
    wanted.get(k)!.set(row.staffEmail, row);
  }

  const kept = new Set<string>();
  const assignments = data.assignments.map(a => {
    if (!isActiveOn(a, start)) return a;
    const k = keyOf(a.storeId, a.role);
    if (wanted.get(k)?.has(a.staffEmail)) {
      kept.add(`${k}::${a.staffEmail}`);
      return a;
    }
    // Dòng bắt đầu đúng ngày 01 (chưa có hiệu lực) bị thay thế thì bỏ hẳn, không để dòng rỗng.
    return a.validFrom === start ? null : { ...a, validTo: dayBefore };
  }).filter((a): a is StoreAssignment => a !== null);

  for (const row of plan.rows) {
    const k = keyOf(row.storeId, row.role);
    if (kept.has(`${k}::${row.staffEmail}`)) continue;
    assignments.push({
      id: `asg-${month.replace('/', '')}-${row.storeId}-${row.role}-${row.staffEmail}`,
      storeId: row.storeId,
      role: row.role,
      staffEmail: row.staffEmail,
      staffName: row.staffName,
      validFrom: start,
      validTo: null,
      source: 'MONTH_LOCK',
      createdBy: actor.name,
      createdAt: stamp,
    });
  }

  return {
    assignments,
    months: { ...data.months, [month]: { ...plan, status: 'LOCKED', lockedBy: actor.name, lockedAt: stamp } },
  };
}

export interface HandoverInput {
  storeId: string;
  role: AssignmentRole;
  fromEmail: string; // người bàn giao
  toEmail?: string | null; // để trống = chỉ kết thúc phân công
  toName?: string;
  effectiveDate: string; // YYYY-MM-DD, ngày người mới bắt đầu
  note?: string;
}

/** Bàn giao giữa kỳ. Không cho lùi ngày; người cũ giữ quyền xem các tháng đã phụ trách. */
export function handover(
  data: StoreAssignmentData,
  input: HandoverInput,
  actor: Actor,
  storeIds: Set<string>,
  now: Date = new Date()
): StoreAssignmentData {
  assertDate(input.effectiveDate);
  if (!storeIds.has(input.storeId)) throw new AssignmentRuleError(`Gian hàng ${input.storeId} không tồn tại.`);
  const today = todayVN(now);
  if (input.effectiveDate < today) throw new AssignmentRuleError('Không lùi ngày hiệu lực bàn giao về quá khứ.');
  const from = normEmail(input.fromEmail);
  const to = normEmail(input.toEmail);
  if (to && !to.includes('@')) throw new AssignmentRuleError('Email người nhận không hợp lệ.');
  if (to && to === from) throw new AssignmentRuleError('Người nhận trùng người bàn giao.');

  const current = data.assignments.find(a => a.storeId === input.storeId && a.role === input.role && a.staffEmail === from && isActiveOn(a, input.effectiveDate));
  if (!current) throw new AssignmentRuleError('Không tìm thấy phân công đang hiệu lực của người bàn giao vào ngày đó.');
  if (to && data.assignments.some(a => a.storeId === input.storeId && a.role === input.role && a.staffEmail === to && isActiveOn(a, input.effectiveDate))) {
    throw new AssignmentRuleError('Người nhận đã đang giữ vai trò này ở gian hàng.');
  }

  const stamp = now.toISOString();
  const assignments = data.assignments
    .map(a => {
      if (a !== current) return a;
      // Dòng chưa bắt đầu mà bị thay ngay từ ngày đầu thì bỏ hẳn.
      return a.validFrom >= input.effectiveDate ? null : { ...a, validTo: addDays(input.effectiveDate, -1) };
    })
    .filter((a): a is StoreAssignment => a !== null);

  if (to) {
    assignments.push({
      id: `asg-ho-${input.storeId}-${input.role}-${to}-${input.effectiveDate}`,
      storeId: input.storeId,
      role: input.role,
      staffEmail: to,
      staffName: (input.toName || '').trim() || to,
      validFrom: input.effectiveDate,
      validTo: current.validTo,
      source: 'HANDOVER',
      createdBy: actor.name,
      createdAt: stamp,
      note: input.note?.trim() || undefined,
    });
  }
  return { ...data, assignments };
}

/**
 * Gợi ý nháp cho tháng mới: lấy PIC đang hiệu lực ngày 01, gian nào chưa có thì đọc từ các trường PIC cũ của hồ sơ gian.
 */
export function suggestMonthRows(
  data: StoreAssignmentData,
  month: string,
  stores: { id: string; b2cOwnerName?: string; primaryPic?: string; b2cOwners?: string[]; accountOwnerName?: string; growthPic?: string; bookingLeader?: string; contentPic?: string; mediaPic?: string; backupOwnerName?: string }[],
  staffByName: (name: string) => { email: string; name: string } | undefined
): MonthAssignmentRow[] {
  const { start } = monthRange(month);
  const rows: MonthAssignmentRow[] = [];
  const seen = new Set<string>();
  const push = (storeId: string, role: AssignmentRole, email: string, name: string) => {
    const k = `${storeId}::${role}::${email}`;
    if (seen.has(k)) return;
    seen.add(k);
    rows.push({ storeId, role, staffEmail: email, staffName: name });
  };
  for (const store of stores) {
    const live = data.assignments.filter(a => a.storeId === store.id && isActiveOn(a, start));
    if (live.length > 0) {
      for (const a of live) push(store.id, a.role, a.staffEmail, a.staffName);
      continue;
    }
    const legacy: [AssignmentRole, (string | undefined)[]][] = [
      ['B2C_OWNER', [store.b2cOwnerName, store.primaryPic, ...(store.b2cOwners || [])]],
      ['GROWTH', [store.growthPic || store.accountOwnerName]],
      ['BOOKING', [store.bookingLeader]],
      ['CONTENT', [store.contentPic]],
      ['MEDIA', [store.mediaPic]],
      ['BACKUP', [store.backupOwnerName]],
    ];
    for (const [role, names] of legacy) {
      for (const raw of names) {
        for (const name of (raw || '').split(/[,;|]/).map(s => s.trim()).filter(Boolean)) {
          const staff = staffByName(name);
          if (staff) push(store.id, role, normEmail(staff.email), staff.name);
        }
      }
    }
  }
  return rows;
}
