/** Kho danh sách PIC theo gian (bản ghi dùng chung 'store-pics'). */
import type { UserProfile } from '../types';
import type { MasterCatalog } from '../masterCatalog';
import { readRecord, updateRecord, RecordError, type SharedRecord } from './sharedRecords';
import { readMasterCatalog } from './masterCatalogStore';
import { actionAllowed } from './accessPolicy';
import { EMPTY_STORE_PICS, StorePicRuleError, normEmail, setStorePics, type StorePic, type StorePicData } from '../storePics';

const KEY = 'store-pics';

export const readStorePics = () => readRecord<StorePicData>(KEY, EMPTY_STORE_PICS);

/** Danh mục gốc kèm danh sách PIC của từng gian — dùng cho mọi chỗ xét quyền theo gian. */
export async function readCatalogWithPics(): Promise<SharedRecord<MasterCatalog>> {
  const [catalog, pics] = await Promise.all([readMasterCatalog(), readStorePics()]);
  return {
    ...catalog,
    data: { ...catalog.data, stores: catalog.data.stores.map(s => (pics.data[s.id] ? { ...s, pics: pics.data[s.id].pics } : s)) },
  };
}

/** Chỉ Trưởng phòng / Admin (mức ALL trên "Phân bổ tải & Giao việc PIC") được gắn PIC cho gian. */
export async function canManageStorePics(user: UserProfile) {
  if (user.partnerType) return false;
  return actionAllowed(user, 'delegation_pic_assignment', 'approve');
}

/** Người không có quyền quản lý chỉ thấy các gian mình được gắn. */
export function visibleStorePics(data: StorePicData, user: UserProfile, manager: boolean): StorePicData {
  if (manager) return data;
  const me = normEmail(user.email);
  return Object.fromEntries(Object.entries(data).filter(([, entry]) => entry.pics.some(p => p.email === me)));
}

export async function saveStorePics(user: UserProfile, revision: number, storeId: string, pics: StorePic[]) {
  if (!await canManageStorePics(user)) throw new RecordError('Chỉ Trưởng phòng được gắn PIC cho gian hàng.', 403);
  const { data: catalog } = await readMasterCatalog();
  const storeIds = new Set(catalog.stores.map(s => s.id));
  try {
    return await updateRecord<StorePicData>(KEY, EMPTY_STORE_PICS, revision, data => setStorePics(data, storeId, pics, user, storeIds));
  } catch (e) {
    if (e instanceof StorePicRuleError) throw new RecordError(e.message, 422);
    throw e;
  }
}
