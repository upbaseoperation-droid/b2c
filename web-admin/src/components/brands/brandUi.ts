/**
 * Ghép nhãn hàng trong Dữ liệu gốc với hồ sơ đã lưu, tính mức hoàn thiện và quyền hiển thị.
 * Bỏ qua chữ giữ chỗ của Dữ liệu gốc (“Bộ quy chuẩn nội dung…”, “Đại diện Nhãn hàng”).
 */

import type { BrandDetail } from '../../lib/types';
import type {
  BrandDocCategory,
  BrandOperatingModel,
  BrandPermissions,
  BrandProfile,
  BrandProjectTier,
  KocApprovalMode,
  SampleReturnRule,
  SampleSenderType,
  SampleStockStatus,
  StrategyOwnerTeam,
  ToneTag,
} from '../../lib/brands/types';
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

export const PROJECT_TIER_LABEL: Record<BrandProjectTier, string> = {
  TIER_A_STRATEGIC: 'Tier A — Nhãn chiến lược (Ngân sách & quy mô lớn)',
  TIER_B_GROWTH: 'Tier B — Tăng trưởng qua nội dung (Content-driven)',
  TIER_C_FULLSTACK: 'Tier C — Gian hàng nhỏ (Full-stack tự triển khai)',
};

export const OPERATING_MODEL_LABEL: Record<BrandOperatingModel, string> = {
  SPLIT_RESOURCE: 'Tách nguồn lực (Content & Booking chuyên biệt)',
  FULLSTACK_CONTENT_BOOKING: 'Full-stack Content × Booking',
};

export const STRATEGY_OWNER_LABEL: Record<StrategyOwnerTeam, string> = {
  BRAND_TEAM: 'Brand Team (Chịu trách nhiệm chiến lược tổng)',
  CONTENT_TEAM: 'Content Team (Chịu trách nhiệm định hướng nội dung)',
};

export const KOC_APPROVAL_MODE_LABEL: Record<KocApprovalMode, string> = {
  ALL: 'Nhãn hàng duyệt toàn bộ danh sách KOC',
  KL4_PLUS_ONLY: 'Tự duyệt KL1–KL3 · Nhãn chỉ duyệt từ KL4 trở lên',
  NONE_AUTO: 'Phòng B2C tự chủ duyệt danh sách KOC (Luồng tự động / FOC)',
};

export const SAMPLE_SENDER_LABEL: Record<SampleSenderType, string> = {
  UPBASE_WAREHOUSE: 'Kho UpBase xuất hàng (Tạo đơn trên hệ thống UpS)',
  BRAND_DIRECT: 'Kho Nhãn hàng tự gửi trực tiếp cho KOC',
};

export const SAMPLE_RETURN_LABEL: Record<SampleReturnRule, string> = {
  GIFT: 'Tặng luôn hàng mẫu cho KOC (FOC)',
  LOAN_RETURN: 'Cho mượn hàng mẫu — Bắt buộc thu hồi sau nghiệm thu',
};

export const SAMPLE_STOCK_LABEL: Record<SampleStockStatus, { label: string; tone: 'positive' | 'warning' | 'critical' | 'info' }> = {
  IN_STOCK: { label: 'Sẵn hàng mẫu', tone: 'positive' },
  LOW_STOCK: { label: 'Sắp hết hàng mẫu', tone: 'warning' },
  OUT_OF_STOCK: { label: 'Hết hàng mẫu — Tạm ngừng book', tone: 'critical' },
  PRE_ORDER: { label: 'Hàng Pre-order (Đợi nhập kho)', tone: 'info' },
};

const PLACEHOLDER = /^(Bộ quy chuẩn nội dung|Đại diện Nhãn hàng|Chưa phân công|KOC phù hợp tệp)/i;
/** Giá trị thật từ Dữ liệu gốc, chữ giữ chỗ trả về rỗng. */
export const real = (v?: string) => (v && !PLACEHOLDER.test(v.trim()) ? v.trim() : '');

/** 8 mục làm nên một hồ sơ đủ để KOC và người duyệt dùng được. */
export function completeness(p: BrandProfile) {
  const checks = [
    !!p.positioning?.slogan && !!p.positioning?.toneOfVoice,
    !!p.entity?.companyName && !!p.entity?.taxCode,
    !!p.workflowRules?.projectTier && !!p.workflowRules?.kocApprovalMode,
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
    POSITIONING: content,
    ENTITY: content,
    WORKFLOW_RULES: content,
    PRODUCTS: content,
    CONTENT_RULES: content,
    FAQS: content,
    DOCUMENTS: content,
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

export function legalState(expiryDate?: string): { label: string; tone: 'positive' | 'warning' | 'danger' | 'neutral' } {
  if (!expiryDate || !expiryDate.trim()) return { label: 'Vô thời hạn', tone: 'neutral' };
  if (isExpired(expiryDate)) return { label: 'Đã hết hạn', tone: 'danger' };
  return { label: 'Còn hiệu lực', tone: 'positive' };
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileExtLabel(fileNameOrUrl?: string): string {
  if (!fileNameOrUrl) return '';
  const clean = fileNameOrUrl.split('?')[0].split('#')[0];
  const m = clean.match(/\.([a-zA-Z0-9]{2,5})$/);
  return m ? m[1].toUpperCase() : '';
}

export interface UploadedBrandFileResult {
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storage: 'R2' | 'LOCAL';
  url: string;
}

export async function uploadBrandFileClient(params: {
  file: File;
  brandName: string;
  section: 'DOCUMENTS' | 'LEGAL';
}): Promise<UploadedBrandFileResult> {
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('brandName', params.brandName);
  formData.append('section', params.section);

  const res = await fetch('/api/brands/files', {
    method: 'POST',
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.file) {
    throw new Error(data.error || 'Không tải được tệp lên hệ thống.');
  }
  return data.file as UploadedBrandFileResult;
}
