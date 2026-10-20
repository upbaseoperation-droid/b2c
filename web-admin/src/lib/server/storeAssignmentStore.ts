/** Kho phân công gian hàng có hiệu lực (bản ghi dùng chung 'store-assignments'). */
import type { UserProfile } from '../types';
import type { MasterCatalog } from '../masterCatalog';
import { readRecord, updateRecord, RecordError, type SharedRecord } from './sharedRecords';
import { readMasterCatalog } from './masterCatalogStore';
import { actionAllowed } from './accessPolicy';
import {
  AssignmentRuleError,
  EMPTY_STORE_ASSIGNMENTS,
  handover,
  lockMonth,
  normEmail,
  saveMonthDraft,
  type HandoverInput,
  type MonthAssignmentRow,
  type StoreAssignmentData,
} from '../storeAssignments';

const KEY = 'store-assignments';

export const readStoreAssignments = () => readRecord<StoreAssignmentData>(KEY, EMPTY_STORE_ASSIGNMENTS);

/** Danh mục gốc kèm phân công của từng gian — dùng cho mọi chỗ xét quyền theo gian. */
export async function readCatalogWithAssignments(): Promise<SharedRecord<MasterCatalog>> {
  const [catalog, assignments] = await Promise.all([readMasterCatalog(), readStoreAssignments()]);
  const byStore = new Map<string, StoreAssignmentData['assignments']>();
  for (const a of assignments.data.assignments) {
    if (!byStore.has(a.storeId)) byStore.set(a.storeId, []);
    byStore.get(a.storeId)!.push(a);
  }
  return {
    ...catalog,
    data: { ...catalog.data, stores: catalog.data.stores.map(s => (byStore.has(s.id) ? { ...s, assignments: byStore.get(s.id) } : s)) },
  };
}

/** Chỉ Trưởng phòng / Admin (mức ALL trên "Phân bổ tải & Giao việc PIC") được lập, chốt và bàn giao. */
export async function canManageAssignments(user: UserProfile) {
  if (user.partnerType) return false;
  return actionAllowed(user, 'delegation_pic_assignment', 'approve');
}

/** Người không có quyền quản lý chỉ thấy các dòng của chính mình. */
export function visibleAssignments(data: StoreAssignmentData, user: UserProfile, manager: boolean): StoreAssignmentData {
  if (manager) return data;
  const me = normEmail(user.email);
  return { assignments: data.assignments.filter(a => a.staffEmail === me), months: {} };
}

export type AssignmentCommand =
  | { action: 'saveDraft'; month: string; rows: MonthAssignmentRow[] }
  | { action: 'lock'; month: string }
  | { action: 'handover'; input: HandoverInput };

export async function applyAssignmentCommand(user: UserProfile, revision: number, command: AssignmentCommand) {
  if (!await canManageAssignments(user)) throw new RecordError('Chỉ Trưởng phòng được phân công và bàn giao gian hàng.', 403);
  const { data: catalog } = await readMasterCatalog();
  const storeIds = new Set(catalog.stores.map(s => s.id));
  const actor = { email: normEmail(user.email), name: user.name };
  try {
    return await updateRecord<StoreAssignmentData>(KEY, EMPTY_STORE_ASSIGNMENTS, revision, data => {
      switch (command.action) {
        case 'saveDraft': {
          if (!Array.isArray(command.rows) || command.rows.length > 5000) throw new AssignmentRuleError('Danh sách phân công không hợp lệ.');
          return saveMonthDraft(data, command.month, command.rows, actor, storeIds);
        }
        case 'lock':
          return lockMonth(data, command.month, actor);
        case 'handover':
          return handover(data, command.input, actor, storeIds);
        default:
          throw new AssignmentRuleError('Thao tác không hợp lệ.');
      }
    });
  } catch (e) {
    if (e instanceof AssignmentRuleError) throw new RecordError(e.message, 422);
    throw e;
  }
}
