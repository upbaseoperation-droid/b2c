/**
 * Ghép nhãn hàng trong Dữ liệu gốc với hồ sơ đã lưu, tính mức hoàn thiện và quyền hiển thị.
 * Bỏ qua chữ giữ chỗ của Dữ liệu gốc (“Bộ quy chuẩn nội dung…”, “Đại diện Nhãn hàng”).
 */

import type { BrandDetail, KeyVisualAssetCategory, KeyVisualAssetItem } from '../../lib/types';
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
import { brandKey, emptyProfile, type BrandProduct } from '../../lib/brands/types';
import { INITIAL_MASTER_PRODUCTS } from '../../lib/masterCatalog';

export interface BrandAccess {
  name: string;
  lead: boolean;
  legal: boolean;
  brandPartner?: boolean;
  linkedBrand?: string;
  assignedBrands?: string[];
}

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
  TIER_A_STRATEGIC: 'Nhóm A — Nhãn trọng điểm (Ngân sách lớn)',
  TIER_B_GROWTH: 'Nhóm B — Nhãn tăng trưởng',
  TIER_C_FULLSTACK: 'Nhóm C — Gian hàng nhỏ',
};

export const OPERATING_MODEL_LABEL: Record<BrandOperatingModel, string> = {
  SPLIT_RESOURCE: 'Tách chuyên viên Content & Booking',
  FULLSTACK_CONTENT_BOOKING: 'Một chuyên viên phụ trách trọn gói',
};

export const STRATEGY_OWNER_LABEL: Record<StrategyOwnerTeam, string> = {
  BRAND_TEAM: 'Nhóm Brand',
  CONTENT_TEAM: 'Nhóm Content',
};

export const KOC_APPROVAL_MODE_LABEL: Record<KocApprovalMode, string> = {
  ALL: 'Nhãn hàng duyệt toàn bộ danh sách KOC',
  KL4_PLUS_ONLY: 'Tự duyệt KL1–KL3 · Nhãn chỉ duyệt từ KL4 trở lên',
  NONE_AUTO: 'Phòng B2C tự duyệt danh sách KOC',
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
function completenessChecks(p: BrandProfile): Array<[label: string, ok: boolean]> {
  return [
    ['định vị', !!p.positioning?.slogan && !!p.positioning?.toneOfVoice],
    ['pháp nhân, MST', !!p.entity?.companyName && !!p.entity?.taxCode],
    ['quy tắc duyệt', !!p.workflowRules?.projectTier && !!p.workflowRules?.kocApprovalMode],
    ['SKU', p.products.length > 0],
    ['từ cấm', (p.contentRules?.banned.length || 0) > 0],
    ['FAQ', p.faqs.length > 0],
    ['pháp lý', p.legal.length > 0],
    ['khung giá KOC', p.ratecard.some(r => r.maxBudget)],
  ];
}

export function completeness(p: BrandProfile) {
  const checks = completenessChecks(p);
  return { done: checks.filter(([, ok]) => ok).length, total: checks.length };
}

/** Tên các mục hồ sơ còn thiếu, theo thứ tự trên. */
export function missingSections(p: BrandProfile): string[] {
  return completenessChecks(p).filter(([, ok]) => !ok).map(([label]) => label);
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

/** Quyền hiển thị nút “Sửa”. Máy chủ vẫn kiểm tra lại khi lưu. storePic: người xem là PIC gian hàng của nhãn. */
export function permissionsOf(access: BrandAccess | undefined, accountPic?: string, brandName?: string, storePic = false): BrandPermissions {
  if (!access) {
    return {
      POSITIONING: true,
      ENTITY: true,
      WORKFLOW_RULES: true,
      PRODUCTS: true,
      CONTENT_RULES: true,
      FAQS: true,
      DOCUMENTS: true,
      LEGAL: true,
      RATECARD: true,
    };
  }
  const pic = !!access && !!accountPic && access.name.trim().toLowerCase() === accountPic.trim().toLowerCase();
  let partnerMatch = false;
  if (access?.brandPartner && brandName) {
    const targetKey = brandKey(brandName);
    const candidates = [access.linkedBrand, ...(access.assignedBrands || [])].filter((x): x is string => Boolean(x && x.trim()));
    partnerMatch = candidates.some(c => {
      const ck = brandKey(c);
      return ck && (ck === targetKey);
    });
  }
  const internalStaff = !access.brandPartner;
  const content = Boolean(access.lead || pic || internalStaff || partnerMatch);
  return {
    POSITIONING: content,
    ENTITY: content,
    WORKFLOW_RULES: content,
    PRODUCTS: content,
    CONTENT_RULES: content,
    FAQS: content,
    DOCUMENTS: content,
    LEGAL: Boolean(access.lead || access.legal || storePic || partnerMatch),
    RATECARD: Boolean(access.lead || storePic),
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

export const KEY_VISUAL_CATEGORY_LABEL: Record<KeyVisualAssetCategory, string> = {
  MASTER_KV: 'Master KV',
  SIS_BANNER: 'SIS / Banner',
  PDP_FRAME: 'Khung PDP / SEO',
  MOODBOARD: 'Moodboard / Ref',
};

async function readAndCompressImageDataUrl(file: File, maxDim = 1280): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không đọc được tệp ảnh.'));
    reader.onload = () => {
      const rawUrl = String(reader.result || '');
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        resolve(rawUrl);
        return;
      }
      const img = new Image();
      img.onerror = () => resolve(rawUrl);
      img.onload = () => {
        try {
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          if (!w || !h || (w <= maxDim && h <= maxDim && file.size <= 350_000)) {
            resolve(rawUrl);
            return;
          }
          const scale = Math.min(1, maxDim / Math.max(w, h));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(w * scale));
          canvas.height = Math.max(1, Math.round(h * scale));
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const outMime = file.type === 'image/png' ? 'image/webp' : 'image/jpeg';
          const compressed = canvas.toDataURL(outMime, 0.84);
          resolve(compressed || rawUrl);
        } catch {
          resolve(rawUrl);
        }
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadKeyVisualImageClient(params: {
  file: File;
  brandName: string;
  category?: KeyVisualAssetCategory;
  note?: string;
}): Promise<KeyVisualAssetItem> {
  const { file, brandName, category = 'MASTER_KV', note = '' } = params;
  const inlineDataUrl = await readAndCompressImageDataUrl(file);
  try {
    const stored = await uploadBrandFileClient({
      file,
      brandName: brandName || 'Brand',
      section: 'DOCUMENTS',
    });
    return {
      id: `kv-img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      url: stored.storage === 'R2' ? stored.url : inlineDataUrl,
      fileName: stored.fileName || file.name,
      fileKey: stored.fileKey,
      fileSize: stored.fileSize || file.size,
      mimeType: stored.mimeType || file.type,
      storage: stored.storage,
      category,
      note,
      uploadedAt: new Date().toISOString(),
    };
  } catch {
    return {
      id: `kv-img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      url: inlineDataUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'image/jpeg',
      storage: 'INLINE',
      category,
      note,
      uploadedAt: new Date().toISOString(),
    };
  }
}


let masterProductsByBrandKeyCache: Map<string, BrandProduct[]> | null = null;

function getMasterProductsByBrandKey(): Map<string, BrandProduct[]> {
  if (!masterProductsByBrandKeyCache) {
    const map = new Map<string, BrandProduct[]>();
    for (const mp of INITIAL_MASTER_PRODUCTS) {
      const k = brandKey(mp.brandName || '');
      if (!k) continue;
      let list = map.get(k);
      if (!list) {
        list = [];
        map.set(k, list);
      }
      list.push({
        id: mp.id,
        skuCode: mp.sku || mp.id,
        name: mp.productName,
        size: '',
        priceVnd: mp.originalPrice,
        commissionOrganicPct: mp.commissionRate,
        sampleStockStatus: (mp.sampleAvailableCount ?? 0) > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
        pdpUrl: mp.pdpUrl || '',
        usps: mp.usp ? [mp.usp] : [],
        mechanism: '',
        ingredients: [],
        usageInstruction: '',
        targetUser: '',
        contraindications: '',
      });
    }
    masterProductsByBrandKeyCache = map;
  }
  return masterProductsByBrandKeyCache;
}

/**
 * Hợp nhất danh sách sản phẩm của thương hiệu từ `BrandProfile.products` và `INITIAL_MASTER_PRODUCTS`
 * theo chuẩn RULE-SYNC-01 & RULE-PERF-01 (O(1) Map lookup).
 */
export function resolveEffectiveBrandProducts(profile: BrandProfile, brandName: string): BrandProduct[] {
  const fromMaster = getMasterProductsByBrandKey().get(brandKey(brandName)) || [];
  if (profile.products.length === 0) return fromMaster;
  if (fromMaster.length === 0) return profile.products;

  const merged: BrandProduct[] = [...profile.products];
  const known = new Set<string>();
  for (const bp of profile.products) {
    if (bp.skuCode?.trim()) known.add(`sku:${bp.skuCode.trim().toLowerCase()}`);
    if (bp.name?.trim()) known.add(`name:${bp.name.trim().toLowerCase()}`);
  }
  for (const mp of fromMaster) {
    const skuKey = mp.skuCode?.trim() ? `sku:${mp.skuCode.trim().toLowerCase()}` : '';
    const nameKey = mp.name?.trim() ? `name:${mp.name.trim().toLowerCase()}` : '';
    if ((skuKey && known.has(skuKey)) || (nameKey && known.has(nameKey))) continue;
    if (skuKey) known.add(skuKey);
    if (nameKey) known.add(nameKey);
    merged.push(mp);
  }
  return merged;
}
