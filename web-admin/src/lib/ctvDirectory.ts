// Danh bạ CTV / VJ dùng chung mọi gian (Self-channel) và danh sách nhân sự Partnership quản lý danh bạ.
// Dùng được ở cả máy chủ và trình duyệt.
import type { Contributor, UserProfile } from './types';
import { isSamePerson } from './staffIdentity';

/** Nhân sự Partnership: khóa theo mã nhân sự (đăng nhập Lark), tên chỉ để hiển thị. */
export interface PartnershipStaffEntry {
  name: string;
  staffCode?: string;
}

export interface CtvDirectoryData {
  contributors: Contributor[];
  partnershipStaff: PartnershipStaffEntry[];
}

export const EMPTY_CTV_DIRECTORY: CtvDirectoryData = { contributors: [], partnershipStaff: [] };

export function isPartnershipStaff(
  user: Pick<UserProfile, 'id' | 'staffCode' | 'name'> | null | undefined,
  staff: PartnershipStaffEntry[]
): boolean {
  return staff.some(p => isSamePerson(user, p.staffCode, p.name));
}

/** Giấy tờ, ngân hàng: chỉ Partnership, Giám đốc / Admin, Kế toán xem. */
export function maskContributor(c: Contributor): Contributor {
  return {
    ...c,
    cccd: undefined,
    dob: undefined,
    issueDate: undefined,
    issuePlace: undefined,
    permanentAddress: undefined,
    taxCode: undefined,
    bankName: '',
    bankAccount: '',
    bankAccountName: '',
  };
}

/** Quyền của người xem trên danh bạ CTV (máy chủ trả kèm để giao diện ẩn / hiện nút). */
export interface CtvDirectoryAccess {
  canEdit: boolean;
  canManagePartnership: boolean;
  canSeeSensitive: boolean;
}
