// Hằng số & tiện ích dùng chung (server + giao diện) cho khung trao đổi kế hoạch tháng.
import type { PlanDiscussionMessage, PlanDiscussionRole, PlanDiscussionType, UserProfile } from './types';

/** Tin trao đổi kèm thông tin phụ phía giao diện (trạng thái gửi, mã người gửi). */
export interface PlanChatMessage extends PlanDiscussionMessage {
  /** Mã người dùng gửi tin (server tự gắn từ phiên đăng nhập). Tin cũ có thể không có. */
  authorId?: string;
  /** Chỉ có ở phía giao diện: tin đang gửi hoặc gửi lỗi. */
  status?: 'sending' | 'failed';
}

/** Loại tin người dùng được phép gửi qua API trao đổi. Các loại còn lại do hệ thống sinh ra. */
export const USER_MESSAGE_TYPES = ['COMMENT', 'REVISION_REQUEST', 'BUDGET_ADJUST'] as const satisfies ReadonlyArray<PlanDiscussionType>;
export type UserMessageType = (typeof USER_MESSAGE_TYPES)[number];

/** Loại tin hiển thị thành dòng hệ thống nhỏ ở giữa. */
export const SYSTEM_MESSAGE_TYPES: ReadonlyArray<PlanDiscussionType> = [
  'STATUS_CHANGE',
  'PRE_APPROVAL_PASS',
  'FINAL_APPROVAL_PASS',
  'VERSION_CREATED',
  'VERSION_LOCKED'
];

export const CHAT_ROLES: ReadonlyArray<Exclude<PlanDiscussionRole, 'SYSTEM'>> = ['GROWTH', 'BOOKING', 'MEDIA', 'LEAD'];

export const MAX_MESSAGE_LENGTH = 4000;

/** Kênh Supabase Realtime (công khai) của một kế hoạch. Tín hiệu không chứa nội dung tin. */
export function planChannelName(planId: string) {
  return `monthly-plan:${planId}`;
}

export const ROLE_LABELS: Record<PlanDiscussionRole, string> = {
  GROWTH: 'Growth',
  BOOKING: 'Booking',
  MEDIA: 'Media',
  LEAD: 'Trưởng phòng',
  SYSTEM: 'Hệ thống'
};

export const TYPE_LABELS: Record<PlanDiscussionType, string> = {
  COMMENT: 'Trao đổi',
  REVISION_REQUEST: 'Yêu cầu sửa',
  BUDGET_ADJUST: 'Góp ý ngân sách',
  PRE_APPROVAL_PASS: 'Sơ duyệt',
  FINAL_APPROVAL_PASS: 'Duyệt chính thức',
  STATUS_CHANGE: 'Đổi trạng thái',
  VERSION_CREATED: 'Mở phiên bản',
  VERSION_LOCKED: 'Chốt phiên bản'
};

/** Map vai trò tài khoản sang vai trò trong biên bản trao đổi. */
export function chatRoleFromUser(user: Pick<UserProfile, 'role'>): Exclude<PlanDiscussionRole, 'SYSTEM'> {
  switch (user.role) {
    case 'GROWTH_MANAGER':
    case 'GROWTH_MEMBER':
      return 'GROWTH';
    case 'MEDIA_MANAGER':
    case 'MEDIA_MEMBER':
      return 'MEDIA';
    case 'ADMIN':
    case 'MANAGER':
      return 'LEAD';
    default:
      return 'BOOKING';
  }
}

/** Chức danh hiển thị trong biên bản. */
export function chatTitleFor(role: PlanDiscussionRole, user?: Pick<UserProfile, 'role'>): string {
  switch (role) {
    case 'GROWTH':
      return user?.role === 'GROWTH_MANAGER' ? 'Trưởng phòng Growth' : 'Growth PIC';
    case 'MEDIA':
      return user?.role === 'MEDIA_MANAGER' ? 'Trưởng phòng Media' : 'Chuyên viên Media';
    case 'LEAD':
      return user?.role === 'ADMIN' ? 'Quản trị hệ thống' : 'Trưởng phòng B2C';
    case 'SYSTEM':
      return 'Hệ thống';
    default:
      return user?.role === 'LEADER' ? 'Trưởng nhóm Booking' : 'Chuyên viên Booking';
  }
}

export function isSystemMessage(m: Pick<PlanDiscussionMessage, 'authorRole' | 'type'>) {
  return m.authorRole === 'SYSTEM' || SYSTEM_MESSAGE_TYPES.includes(m.type);
}
