/**
 * Logic dùng chung cho danh bạ KOC và hồ sơ KOC: loại hồ sơ pháp lý, che số nhạy cảm,
 * phát hiện hồ sơ trùng, quyền xem số đầy đủ, trạng thái booking.
 */

import type { BookingDealItem, KocItem, UserProfile } from '../../lib/types';
import type { StatusTone } from '../ui';

/* ------------------------------------------------------------- Pháp lý */

export type LegalType = 'INDIVIDUAL' | 'HOUSEHOLD' | 'COMPANY';

export const LEGAL_TYPE_LABEL: Record<LegalType, string> = {
  INDIVIDUAL: 'Cá nhân',
  HOUSEHOLD: 'Hộ kinh doanh',
  COMPANY: 'Công ty',
};

export function legalTypeOf(k: KocItem): LegalType {
  if (k.ocrDocumentType === 'BUSINESS_LICENSE') return 'COMPANY';
  if (k.ocrDocumentType === 'BUSINESS_HOUSEHOLD') return 'HOUSEHOLD';
  return 'INDIVIDUAL';
}

/** Số định danh dùng để ký hợp đồng: MST cho hộ kinh doanh / công ty, CCCD cho cá nhân. */
export function legalIdOf(k: KocItem): string {
  const digits = (s?: string) => (s || '').replace(/\D/g, '');
  if (legalTypeOf(k) !== 'INDIVIDUAL' && digits(k.taxCode).length >= 7) return k.taxCode!.trim();
  const cccd = digits(k.cccd);
  if (cccd.length >= 9 && !/^0+$/.test(cccd)) return k.cccd.trim();
  return '';
}

export const hasLegalId = (k: KocItem) => legalIdOf(k) !== '';

/** Che số nhạy cảm, chỉ giữ 4 số cuối: 8549302194 → •••• 2194 */
export function mask(value?: string): string {
  const v = (value || '').replace(/\s/g, '');
  if (!v) return '';
  return `•••• ${v.slice(-4)}`;
}

/**
 * Ai được xem số CCCD / MST / tài khoản đầy đủ: quản trị, trưởng phòng, trưởng nhóm
 * và PIC đang phụ trách chính KOC đó.
 */
export function canRevealSensitive(user: UserProfile | undefined, k: KocItem): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN' || user.role === 'MANAGER' || user.role === 'LEADER') return true;
  return !!k.bookingPic && k.bookingPic.trim().toLowerCase() === user.name.trim().toLowerCase();
}

/* ---------------------------------------------------------- Trùng lặp */

export type DuplicateField = 'kênh' | 'SĐT' | 'CCCD' | 'MST';
export interface DuplicateMatch {
  kocId: string;
  stageName: string;
  fields: DuplicateField[];
}

/** Với mỗi KOC: danh sách hồ sơ khác trùng kênh, SĐT, CCCD hoặc MST. */
export function findDuplicates(kocs: KocItem[]): Map<string, DuplicateMatch[]> {
  const keyers: Array<[DuplicateField, (k: KocItem) => string]> = [
    ['kênh', (k) => { const v = (k.channelId || '').trim().toLowerCase().replace(/^@/, ''); return v.length > 2 ? v : ''; }],
    ['SĐT', (k) => { const v = (k.phone || '').replace(/\D/g, ''); return v.length >= 9 ? v : ''; }],
    ['CCCD', (k) => { const v = (k.cccd || '').replace(/\D/g, ''); return v.length >= 9 && !/^0+$/.test(v) ? v : ''; }],
    ['MST', (k) => { const v = (k.taxCode || '').trim(); return v.length >= 7 ? v : ''; }],
  ];
  const byId = new Map(kocs.map((k) => [k.id, k]));
  const result = new Map<string, Map<string, DuplicateMatch>>();

  for (const [field, keyOf] of keyers) {
    const groups = new Map<string, string[]>();
    for (const k of kocs) {
      const key = keyOf(k);
      if (!key) continue;
      groups.set(key, [...(groups.get(key) || []), k.id]);
    }
    for (const ids of groups.values()) {
      if (ids.length < 2) continue;
      for (const id of ids) {
        const matches = result.get(id) || new Map<string, DuplicateMatch>();
        for (const other of ids) {
          if (other === id) continue;
          const m = matches.get(other) || { kocId: other, stageName: byId.get(other)!.stageName, fields: [] };
          if (!m.fields.includes(field)) m.fields.push(field);
          matches.set(other, m);
        }
        result.set(id, matches);
      }
    }
  }
  return new Map([...result].map(([id, m]) => [id, [...m.values()]]));
}

/* ------------------------------------------------------------- Booking */

const normHandle = (s?: string) => (s || '').trim().toLowerCase().replace(/^@/, '');

/** Các booking của một KOC, khớp theo id, rồi tới tên kênh / handle. */
export function dealsOfKoc(deals: BookingDealItem[] | undefined, k: KocItem): BookingDealItem[] {
  return (deals || []).filter(
    (d) =>
      d.kocId === k.id ||
      (!!d.kocChannelId && normHandle(d.kocChannelId) === normHandle(k.channelId)) ||
      (!!d.kocStageName && d.kocStageName.trim().toLowerCase() === k.stageName.trim().toLowerCase()),
  );
}

export const isDealOpen = (d: BookingDealItem) => d.status !== 'COMPLETED' && d.status !== 'CANCELLED' && d.status !== 'FINAL_PAID';

/** Đổi trạng thái deal về bộ 8 nhãn chuẩn của design system. */
export function dealStatusOf(d: BookingDealItem): { label: string; tone: StatusTone } {
  if (d.status === 'CANCELLED') return { label: 'Đã hủy', tone: 'neutral' };
  if (d.status === 'COMPLETED' || d.status === 'FINAL_PAID') return { label: 'Hoàn tất', tone: 'positive' };
  if (d.slaStatus === 'OVERDUE') return { label: 'Quá hạn', tone: 'critical' };
  if (d.status === 'DRAFT') return { label: 'Nháp', tone: 'neutral' };
  return { label: 'Đang chạy', tone: 'info' };
}

/** Bước hiện tại của deal, viết theo cách team gọi. */
export function dealStepOf(d: BookingDealItem): string {
  switch (d.status) {
    case 'DRAFT':
    case 'CONTACTING': return 'Đang liên hệ';
    case 'TERMS_AGREED':
    case 'CONTRACT_GENERATED':
    case 'ADVANCE_PAID': return 'Hợp đồng & tạm ứng';
    case 'SCRIPT_PENDING':
    case 'SCRIPT_APPROVED': return 'Kịch bản';
    case 'SAMPLE_SHIPPED': return 'Đang gửi mẫu';
    case 'SAMPLE_RECEIVED': return 'Đã nhận mẫu';
    case 'VIDEO_SUBMITTED':
    case 'VIDEO_VERIFIED': return 'Đã lên video';
    default: return '';
  }
}

export const picOfDeal = (d: BookingDealItem) => d.bookingPic || d.assignedStaff || '';

/** Số follower dạng ngắn: 680k · 1,2M */
export function formatFollowers(n?: number): string {
  if (!n) return '—';
  if (n >= 1e6) return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(n / 1e6)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}k`;
  return String(n);
}
