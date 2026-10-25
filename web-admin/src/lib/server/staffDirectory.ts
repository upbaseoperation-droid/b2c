import { UPBASE_STAFF_MASTER } from '../importedMasterData';
import { buildStaffIndex } from '../staffIdentity';
import { readPolicy } from './accessPolicy';

let cached: { revision: number; index: ReturnType<typeof buildStaffIndex> } | null = null;

/**
 * Chỉ mục tra mã nhân sự: ưu tiên nhân sự được đăng nhập (Phân quyền & Nhân sự),
 * sau đó mới xét toàn bộ danh bạ công ty.
 */
export async function staffIndex() {
  const { data: policy, revision } = await readPolicy();
  if (cached && cached.revision === revision) return cached.index;
  const preferred = policy.internalStaff
    .filter(s => s.canLogin !== false && s.status !== 'SUSPENDED')
    .map(s => ({ id: s.id, name: s.name, staffCode: s.staffCode }));
  const index = buildStaffIndex(preferred, UPBASE_STAFF_MASTER);
  cached = { revision, index };
  return index;
}
