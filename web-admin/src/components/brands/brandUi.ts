/**
 * Ghép nhãn hàng trong Dữ liệu gốc với hồ sơ đã lưu, tính mức hoàn thiện và quyền hiển thị.
 * Bỏ qua chữ giữ chỗ của Dữ liệu gốc (“Bộ quy chuẩn nội dung…”, “Đại diện Nhãn hàng”).
 */

import type { BrandDetail } from '../../lib/types';
import type { BrandDocCategory, BrandPermissions, BrandProfile, ToneTag } from '../../lib/brands/types';
import { brandKey, emptyProfile } from '../../lib/brands/types';

export interface BrandAccess { name: string; lead: boolean; legal: boolean }

export interface BrandRow {
  key: string;
  name: string;
  master?: BrandDetail;
  profile: BrandProfile;
  saved: boolean;
  done: number;
  total: number;
}

export const TONE_LABEL: Record<ToneTag, string> = {
  EXPERT: 'Chuyên gia, bác sĩ',
  MOM: 'Mẹ bỉm chân thực',
  GENZ: 'Gen Z, bắt trend',
  PREMIUM: 'Sang trọng, cao cấp',
};

export const DOC_CATEGORY_LABEL: Record<BrandDocCategory, string> = {
  GUIDELINE: 'Quy chuẩn thương hiệu',
  LEGAL: 'Pháp lý, công bố',
  PRODUCT: 'Thông tin sản phẩm',
  BRIEF: 'Brief chiến dịch',
  ASSET: 'Logo, hình ảnh',
  OTHER: 'Khác',
};

const PLACEHOLDER = /^(Bộ quy chuẩn nội dung|Đại diện Nhãn hàng|Chưa phân công|KOC phù hợp tệp)/i;
/** Giá trị thật từ Dữ liệu gốc, chữ giữ chỗ trả về rỗng. */
export const real = (v?: string) => (v && !PLACEHOLDER.test(v.trim()) ? v.trim() : '');

/** 7 mục làm nên một hồ sơ đủ để KOC và người duyệt dùng được. */
export function completeness(p: BrandProfile) {
  const checks = [
    !!p.positioning?.slogan && !!p.positioning?.toneOfVoice,
    !!p.entity?.companyName && !!p.entity?.taxCode,
    p.products.length > 0,
    (p.contentRules?.banned.length || 0) > 0,
    p.faqs.length > 0,
    p.legal.length > 0,
    p.ratecard.some(r => r.maxBudget),
  ];
  return { done: checks.filter(Boolean).length, total: checks.length };
}

export function buildRows(masters: BrandDetail[], profiles: BrandProfile[]): BrandRow[] {
  const byKey = new Map(profiles.map(p => [p.key, p]));
  const rows: BrandRow[] = masters.map(m => {
    const key = brandKey(m.name); const saved = byKey.get(key);
    const profile = saved || emptyProfile(m.name);
    return { key, name: m.name, master: m, profile, saved: !!saved, ...completeness(profile) };
  });
  // Hồ sơ đã lưu cho nhãn không còn trong Dữ liệu gốc vẫn hiện để không mất dữ liệu.
  for (const p of profiles) if (!rows.some(r => r.key === p.key)) rows.push({ key: p.key, name: p.brandName, profile: p, saved: true, ...completeness(p) });
  return rows.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

/** Quyền hiển thị nút “Sửa”. Máy chủ vẫn kiểm tra lại khi lưu. */
export function permissionsOf(access: BrandAccess | undefined, accountPic?: string): BrandPermissions {
  const pic = !!access && !!accountPic && access.name.trim().toLowerCase() === accountPic.trim().toLowerCase();
  const content = !!access && (access.lead || pic);
  return {
    POSITIONING: content, ENTITY: content, PRODUCTS: content, CONTENT_RULES: content, FAQS: content, DOCUMENTS: content,
    LEGAL: !!access && (access.lead || access.legal),
    RATECARD: !!access && access.lead,
  };
}

export const dateTime = (iso?: string) =>
  iso ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) : '';

/** Ngày hết hạn đã qua chưa (nhận dd/mm/yyyy hoặc yyyy-mm-dd). */
export function isExpired(value: string, today = new Date()) {
  const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/) || value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return false;
  const d = value.includes('/') ? new Date(+m[3], +m[2] - 1, +m[1]) : new Date(+m[1], +m[2] - 1, +m[3]);
  return d.getTime() < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
}
