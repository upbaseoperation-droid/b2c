/**
 * Quy tắc nghiệp vụ hồ sơ thương hiệu: ai sửa mục nào, làm sạch dữ liệu gửi lên, ghi lịch sử.
 * Quyền lấy từ phiên đăng nhập trên máy chủ, không tin vai trò gửi từ giao diện.
 */

import { randomUUID } from 'node:crypto';
import type { UserProfile } from '../types';
import { configuredActors } from '../contracts/access';
import type {
  BrandContentRules, BrandDocCategory, BrandDocument, BrandEntity, BrandFaq, BrandLegalDoc, BrandPermissions,
  BrandPositioning, BrandProduct, BrandProfile, BrandRatecardRow, BrandSection, ToneTag,
} from './types';
import { SECTION_LABEL } from './types';

export class BrandError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function requireBrand(condition: unknown, message: string, status = 400): asserts condition {
  if (!condition) throw new BrandError(message, status);
}

const isLead = (u: UserProfile) => u.role === 'ADMIN' || u.role === 'MANAGER';
const sameName = (a?: string, b?: string) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
/** Người được cấp vai trò pháp chế trong phân hệ Hợp đồng (CONTRACT_ACCESS_JSON). */
function isLegal(u: UserProfile) {
  try {
    return configuredActors().some(a => a.roles.includes('LEGAL') && (a.id === u.larkOpenId || a.id === u.id));
  } catch {
    return false;
  }
}

/**
 * Trưởng phòng / quản trị: sửa mọi mục. Account PIC của nhãn: định vị, pháp nhân, sản phẩm,
 * quy chuẩn nội dung, câu hỏi khó, tài liệu. Pháp chế: mục pháp lý. Trần thù lao: chỉ trưởng phòng.
 */
export function permissionsFor(user: UserProfile | null, accountPic?: string): BrandPermissions {
  const lead = !!user && isLead(user);
  const pic = !!user && sameName(user.name, accountPic);
  const legal = !!user && isLegal(user);
  const content = lead || pic;
  return {
    POSITIONING: content, ENTITY: content, PRODUCTS: content, CONTENT_RULES: content, FAQS: content, DOCUMENTS: content,
    LEGAL: lead || legal,
    RATECARD: lead,
  };
}

export function requireReader(user: UserProfile | null): asserts user is UserProfile {
  requireBrand(user, 'Đăng nhập để xem hồ sơ thương hiệu.', 401);
  requireBrand(!user.partnerType, 'Tài khoản đối tác không xem được hồ sơ nội bộ.', 403);
}

/* ------------------------------------------------------- Làm sạch dữ liệu */

const text = (v: unknown, max = 2000) => (typeof v === 'string' ? v.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim().slice(0, max) : '');
const lines = (v: unknown, maxItems = 30, max = 300) =>
  (Array.isArray(v) ? v : typeof v === 'string' ? v.split('\n') : []).map(x => text(x, max)).filter(Boolean).slice(0, maxItems);
const money = (v: unknown) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(/\D/g, '')) : NaN;
  return Number.isFinite(n) && n > 0 && n < 1e13 ? Math.round(n) : undefined;
};
const list = <T>(v: unknown, maxItems: number, fn: (x: Record<string, unknown>) => T | null): T[] =>
  (Array.isArray(v) ? v : []).slice(0, maxItems).map(x => (x && typeof x === 'object' ? fn(x as Record<string, unknown>) : null)).filter((x): x is T => x !== null);
const id = (v: unknown) => (typeof v === 'string' && /^[\w-]{1,64}$/.test(v) ? v : randomUUID());
const url = (v: unknown) => {
  const s = text(v, 1000);
  return /^https?:\/\/\S+$/i.test(s) ? s : '';
};
const TONES: ToneTag[] = ['EXPERT', 'MOM', 'GENZ', 'PREMIUM'];
const DOC_CATEGORIES: BrandDocCategory[] = ['GUIDELINE', 'LEGAL', 'PRODUCT', 'BRIEF', 'ASSET', 'OTHER'];
export const GRADES = ['KL1', 'KL2', 'KL3', 'KL4', 'KL5', 'KL6', 'KL7'];

type SectionData = Partial<Pick<BrandProfile, 'positioning' | 'entity' | 'products' | 'contentRules' | 'faqs' | 'legal' | 'ratecard' | 'documents'>>;

/** Đọc dữ liệu một mục từ yêu cầu; bỏ trường lạ, cắt độ dài, bỏ dòng trống. */
export function parseSection(section: BrandSection, raw: unknown, actorName: string, previous: BrandProfile): SectionData {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  switch (section) {
    case 'POSITIONING': {
      const tone = TONES.includes(d.toneTag as ToneTag) ? (d.toneTag as ToneTag) : undefined;
      const p: BrandPositioning = { slogan: text(d.slogan, 200), story: text(d.story, 3000), toneTag: tone, toneOfVoice: text(d.toneOfVoice, 1000), targetAudience: text(d.targetAudience, 1500) };
      return { positioning: p };
    }
    case 'ENTITY': {
      const taxCode = text(d.taxCode, 20);
      requireBrand(!taxCode || /^\d{10}(-\d{3})?$/.test(taxCode), 'Mã số thuế gồm 10 chữ số, hoặc 10 số kèm “-” và 3 số chi nhánh.');
      const e: BrandEntity = { companyName: text(d.companyName, 200), taxCode, contactPerson: text(d.contactPerson, 200), originCountry: text(d.originCountry, 100) };
      return { entity: e };
    }
    case 'PRODUCTS':
      return {
        products: list<BrandProduct>(d.products, 50, p => {
          const name = text(p.name, 200); if (!name) return null;
          return { id: id(p.id), name, skuCode: text(p.skuCode, 80), size: text(p.size, 80), priceVnd: money(p.priceVnd), pdpUrl: url(p.pdpUrl), usps: lines(p.usps, 8), mechanism: text(p.mechanism, 2000), ingredients: lines(p.ingredients, 20), targetUser: text(p.targetUser, 500), contraindications: text(p.contraindications, 500) };
        }),
      };
    case 'CONTENT_RULES': {
      const r: BrandContentRules = {
        banned: list(d.banned, 300, b => { const phrase = text(b.phrase, 120); return phrase ? { id: id(b.id), phrase, reason: text(b.reason, 300), replacement: text(b.replacement, 200) } : null; }),
        preferred: list(d.preferred, 200, b => { const phrase = text(b.phrase, 200); return phrase ? { id: id(b.id), phrase, note: text(b.note, 300) } : null; }),
        visualDo: lines(d.visualDo, 30), visualDont: lines(d.visualDont, 30),
      };
      return { contentRules: r };
    }
    case 'FAQS':
      return {
        faqs: list<BrandFaq>(d.faqs, 100, f => {
          const question = text(f.question, 300); const answer = text(f.answer, 2000);
          return question && answer ? { id: id(f.id), question, answer, mention: lines(f.mention, 10, 200), avoid: lines(f.avoid, 10, 120) } : null;
        }),
      };
    case 'LEGAL':
      return {
        legal: list<BrandLegalDoc>(d.legal, 100, l => {
          const title = text(l.title, 300); if (!title) return null;
          return { id: id(l.id), title, docNumber: text(l.docNumber, 100), authority: text(l.authority, 200), issueDate: text(l.issueDate, 20), validUntil: text(l.validUntil, 20), disclaimer: text(l.disclaimer, 1000), url: url(l.url) };
        }),
      };
    case 'RATECARD':
      return { ratecard: GRADES.map(grade => ({ grade, maxBudget: money((list(d.ratecard, 10, r => r).find(r => r.grade === grade) as BrandRatecardRow | undefined)?.maxBudget) })) };
    case 'DOCUMENTS': {
      const known = new Map(previous.documents.map(x => [x.id, x]));
      return {
        documents: list<BrandDocument>(d.documents, 200, x => {
          const title = text(x.title, 200); const link = url(x.url);
          if (!title || !link) return null;
          const old = typeof x.id === 'string' ? known.get(x.id) : undefined;
          const category = DOC_CATEGORIES.includes(x.category as BrandDocCategory) ? (x.category as BrandDocCategory) : 'OTHER';
          return { id: old?.id || randomUUID(), title, category, url: link, note: text(x.note, 500), addedBy: old?.addedBy || actorName, addedAt: old?.addedAt || new Date().toISOString() };
        }),
      };
    }
  }
}

/** Áp dữ liệu mục mới vào hồ sơ, ghi một dòng lịch sử. */
export function applySection(profile: BrandProfile, section: BrandSection, data: SectionData, actorName: string, summary?: string): BrandProfile {
  const at = new Date().toISOString();
  return {
    ...profile,
    ...data,
    updatedAt: at,
    updatedBy: actorName,
    history: [{ at, actorName, section, summary: summary || `Cập nhật ${SECTION_LABEL[section].toLowerCase()}` }, ...profile.history].slice(0, 200),
  };
}
