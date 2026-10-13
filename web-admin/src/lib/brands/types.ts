/**
 * Hồ sơ thương hiệu lưu trên hệ thống. Chỉ chứa thông tin do phòng B2C quản lý cho nhãn
 * (định vị, sản phẩm, quy chuẩn nội dung, pháp lý, trần thù lao, tài liệu).
 * Ngành, sàn, PIC và ngân sách thuộc Dữ liệu gốc, không lưu lặp ở đây.
 */

export type ToneTag = 'EXPERT' | 'MOM' | 'GENZ' | 'PREMIUM';

export interface BrandPositioning {
  slogan: string;
  story: string;
  toneTag?: ToneTag;
  toneOfVoice: string;
  targetAudience: string;
}

export interface BrandEntity {
  companyName: string;
  taxCode: string;
  contactPerson: string;
  originCountry: string;
}

export interface BrandProduct {
  id: string;
  name: string;
  skuCode: string;
  size: string;
  priceVnd?: number;
  pdpUrl: string;
  usps: string[];
  mechanism: string;
  ingredients: string[];
  targetUser: string;
  contraindications: string;
}

export interface BannedPhrase { id: string; phrase: string; reason: string; replacement: string }
export interface PreferredPhrase { id: string; phrase: string; note: string }

export interface BrandContentRules {
  banned: BannedPhrase[];
  preferred: PreferredPhrase[];
  visualDo: string[];
  visualDont: string[];
}

export interface BrandFaq { id: string; question: string; answer: string; mention: string[]; avoid: string[] }

export interface BrandLegalDoc {
  id: string;
  title: string;
  docNumber: string;
  authority: string;
  issueDate: string;
  validUntil: string;
  disclaimer: string;
  url: string;
}

export interface BrandRatecardRow { grade: string; maxBudget?: number }

export type BrandDocCategory = 'GUIDELINE' | 'LEGAL' | 'PRODUCT' | 'BRIEF' | 'ASSET' | 'OTHER';
export interface BrandDocument { id: string; title: string; category: BrandDocCategory; url: string; note: string; addedBy: string; addedAt: string }

export interface BrandHistoryEntry { at: string; actorName: string; section: BrandSection; summary: string }

export interface BrandProfile {
  key: string;
  brandName: string;
  revision: number;
  updatedAt: string;
  updatedBy: string;
  positioning?: BrandPositioning;
  entity?: BrandEntity;
  products: BrandProduct[];
  contentRules?: BrandContentRules;
  faqs: BrandFaq[];
  legal: BrandLegalDoc[];
  ratecard: BrandRatecardRow[];
  documents: BrandDocument[];
  history: BrandHistoryEntry[];
}

export type BrandSection = 'POSITIONING' | 'ENTITY' | 'PRODUCTS' | 'CONTENT_RULES' | 'FAQS' | 'LEGAL' | 'RATECARD' | 'DOCUMENTS';

export const SECTION_LABEL: Record<BrandSection, string> = {
  POSITIONING: 'Định vị & thông điệp',
  ENTITY: 'Pháp nhân',
  PRODUCTS: 'Sản phẩm chủ lực',
  CONTENT_RULES: 'Quy chuẩn nội dung',
  FAQS: 'Câu hỏi khó',
  LEGAL: 'Pháp lý',
  RATECARD: 'Trần thù lao',
  DOCUMENTS: 'Tài liệu',
};

/** Quyền sửa từng mục của người đang xem, do máy chủ tính. */
export type BrandPermissions = Record<BrandSection, boolean>;

/** Khóa nhãn từ tên: bỏ dấu, viết thường, nối bằng gạch ngang. */
export function brandKey(name: string): string {
  return name.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function emptyProfile(brandName: string): BrandProfile {
  return { key: brandKey(brandName), brandName, revision: 0, updatedAt: '', updatedBy: '', products: [], faqs: [], legal: [], ratecard: [], documents: [], history: [] };
}
