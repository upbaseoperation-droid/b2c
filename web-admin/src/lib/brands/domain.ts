/**
 * Quy tắc nghiệp vụ hồ sơ thương hiệu: ai sửa mục nào, làm sạch dữ liệu gửi lên, ghi lịch sử.
 * Quyền lấy từ phiên đăng nhập trên máy chủ, không tin vai trò gửi từ giao diện.
 */

import { randomUUID } from 'node:crypto';
import type { UserProfile } from '../types';
import { configuredActors } from '../contracts/access';
import type {
  BrandContentRules,
  BrandDocCategory,
  BrandDocument,
  BrandEntity,
  BrandFaq,
  BrandFileStorage,
  BrandLegalDoc,
  BrandOperatingModel,
  BrandPermissions,
  BrandPositioning,
  BrandProduct,
  BrandProfile,
  BrandProjectTier,
  BrandRatecardRow,
  BrandSection,
  BrandWorkflowRules,
  KocApprovalMode,
  SampleReturnRule,
  SampleSenderType,
  SampleStockStatus,
  StrategyOwnerTeam,
  ToneTag,
} from './types';
import { brandKey, SECTION_LABEL } from './types';

export class BrandError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function requireBrand(condition: unknown, message: string, status = 400): asserts condition {
  if (!condition) throw new BrandError(message, status);
}

const isLead = (u: UserProfile) => u.role === 'ADMIN' || u.role === 'MANAGER';
const sameName = (a?: string, b?: string) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/** Kiểm tra tài khoản Đối tác Nhãn hàng (BRAND_PARTNER) có thuộc thương hiệu đang truy cập không. */
export function isBrandPartnerForBrand(user: UserProfile | null | undefined, brandName?: string): boolean {
  if (!user) return false;
  if (user.role !== 'BRAND_PARTNER' && user.partnerType !== 'BRAND') return false;
  if (!brandName) return false;
  const targetKey = brandKey(brandName);
  if (!targetKey) return false;

  const candidates = [
    user.linkedEntityName,
    ...(user.assignedBrands || []),
  ].filter((x): x is string => Boolean(x && x.trim()));

  for (const c of candidates) {
    const ck = brandKey(c);
    if (ck && (ck === targetKey || ck.includes(targetKey) || targetKey.includes(ck))) {
      return true;
    }
  }
  return false;
}

/** Người được cấp vai trò pháp chế trong phân hệ Hợp đồng (CONTRACT_ACCESS_JSON). */
export function isLegalActor(u: UserProfile) {
  try {
    return configuredActors().some(a => a.roles.includes('LEGAL') && (a.id === u.larkOpenId || a.id === u.id));
  } catch {
    return false;
  }
}

/**
 * Trưởng phòng / quản trị: sửa mọi mục. Account PIC của nhãn: định vị, pháp nhân, quy tắc vận hành, sản phẩm,
 * quy chuẩn nội dung, câu hỏi khó, tài liệu. Đại diện nhãn hàng (BRAND_PARTNER) của đúng thương hiệu: sửa định vị,
 * pháp nhân, quy tắc vận hành/phê duyệt, sản phẩm & tồn kho mẫu, quy chuẩn nội dung, câu hỏi khó, tài liệu, pháp lý.
 * Pháp chế: mục pháp lý. Trần thù lao nội bộ (RATECARD): chỉ trưởng phòng B2C.
 */
export function permissionsFor(user: UserProfile | null, accountPic?: string, brandName?: string): BrandPermissions {
  const lead = !!user && isLead(user);
  const pic = !!user && sameName(user.name, accountPic);
  const legal = !!user && isLegalActor(user);
  const brandPartner = isBrandPartnerForBrand(user, brandName);
  const content = lead || pic || brandPartner;
  return {
    POSITIONING: content,
    ENTITY: content,
    WORKFLOW_RULES: content,
    PRODUCTS: content,
    CONTENT_RULES: content,
    FAQS: content,
    DOCUMENTS: content,
    LEGAL: lead || legal || brandPartner,
    RATECARD: lead,
  };
}

export function requireReader(user: UserProfile | null): asserts user is UserProfile {
  requireBrand(user, 'Đăng nhập để xem hồ sơ thương hiệu.', 401);
  const isAllowedPartner = user.role === 'BRAND_PARTNER' || user.partnerType === 'BRAND';
  requireBrand(!user.partnerType || isAllowedPartner, 'Tài khoản đối tác KOC/CTV không xem được hồ sơ thương hiệu.', 403);
}

/* ------------------------------------------------------- Làm sạch dữ liệu */

const text = (v: unknown, max = 2000) => (typeof v === 'string' ? v.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim().slice(0, max) : '');
const lines = (v: unknown, maxItems = 30, max = 300) =>
  (Array.isArray(v) ? v : typeof v === 'string' ? v.split('\n') : []).map(x => text(x, max)).filter(Boolean).slice(0, maxItems);
const money = (v: unknown) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(/\D/g, '')) : NaN;
  return Number.isFinite(n) && n > 0 && n < 1e13 ? Math.round(n) : undefined;
};
const percent = (v: unknown) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(/[^\d.]/g, '')) : NaN;
  return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n * 10) / 10 : undefined;
};
const intRange = (v: unknown, min: number, max: number, fallback: number) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(/\D/g, '')) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
};
const bool = (v: unknown, fallback = false) => (typeof v === 'boolean' ? v : v === 'true' ? true : v === 'false' ? false : fallback);
const list = <T>(v: unknown, maxItems: number, fn: (x: Record<string, unknown>) => T | null): T[] =>
  (Array.isArray(v) ? v : []).slice(0, maxItems).map(x => (x && typeof x === 'object' ? fn(x as Record<string, unknown>) : null)).filter((x): x is T => x !== null);
const id = (v: unknown) => (typeof v === 'string' && /^[\w-]{1,64}$/.test(v) ? v : randomUUID());
const url = (v: unknown) => {
  const s = text(v, 1000);
  if (/^https?:\/\/\S+$/i.test(s)) return s;
  if (/^\/api\/brands\/files\?key=[a-zA-Z0-9._~%\-/]+$/.test(s)) return s;
  return '';
};
const fileKeyField = (v: unknown) => {
  const s = text(v, 300);
  return /^brands\/[a-z0-9-]+\/\d{4}-\d{2}\/[a-zA-Z0-9._-]+$/.test(s) && !s.includes('..') ? s : undefined;
};
const fileSizeField = (v: unknown) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 && n <= 100 * 1024 * 1024 ? Math.round(n) : undefined;
};
const storageField = (v: unknown, hasFileKey: boolean): BrandFileStorage | undefined => {
  if (v === 'R2' || v === 'LOCAL' || v === 'LINK') return v;
  return hasFileKey ? 'R2' : undefined;
};
const TONES: ToneTag[] = ['EXPERT', 'MOM', 'GENZ', 'PREMIUM'];
const DOC_CATEGORIES: BrandDocCategory[] = ['GUIDELINE', 'LEGAL', 'PRODUCT', 'BRIEF', 'ASSET', 'OTHER'];
const STOCK_STATUSES: SampleStockStatus[] = ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'PRE_ORDER'];
const SAMPLE_RETURN_RULES: SampleReturnRule[] = ['GIFT', 'LOAN_RETURN'];
const PROJECT_TIERS: BrandProjectTier[] = ['TIER_A_STRATEGIC', 'TIER_B_GROWTH', 'TIER_C_FULLSTACK'];
const OPERATING_MODELS: BrandOperatingModel[] = ['SPLIT_RESOURCE', 'FULLSTACK_CONTENT_BOOKING'];
const STRATEGY_OWNERS: StrategyOwnerTeam[] = ['BRAND_TEAM', 'CONTENT_TEAM'];
const KOC_APPROVAL_MODES: KocApprovalMode[] = ['ALL', 'KL4_PLUS_ONLY', 'NONE_AUTO'];
const SAMPLE_SENDERS: SampleSenderType[] = ['UPBASE_WAREHOUSE', 'BRAND_DIRECT'];
export const GRADES = ['KL1', 'KL2', 'KL3', 'KL4', 'KL5', 'KL6', 'KL7'];

type SectionData = Partial<
  Pick<BrandProfile, 'positioning' | 'entity' | 'workflowRules' | 'products' | 'contentRules' | 'faqs' | 'legal' | 'ratecard' | 'documents'>
>;

/** Đọc dữ liệu một mục từ yêu cầu; bỏ trường lạ, cắt độ dài, bỏ dòng trống. */
export function parseSection(section: BrandSection, raw: unknown, actorName: string, previous: BrandProfile): SectionData {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  switch (section) {
    case 'POSITIONING': {
      const tone = TONES.includes(d.toneTag as ToneTag) ? (d.toneTag as ToneTag) : undefined;
      const p: BrandPositioning = {
        slogan: text(d.slogan, 200),
        story: text(d.story, 3000),
        toneTag: tone,
        toneOfVoice: text(d.toneOfVoice, 1000),
        targetAudience: text(d.targetAudience, 1500),
        painPoints: lines(d.painPoints, 20, 300),
        barriersToTrial: lines(d.barriersToTrial, 20, 300),
        rtbs: lines(d.rtbs, 20, 300),
        contentPillars: lines(d.contentPillars, 20, 300),
        competitors: lines(d.competitors, 20, 200),
      };
      return { positioning: p };
    }
    case 'ENTITY': {
      const taxCode = text(d.taxCode, 20);
      requireBrand(!taxCode || /^\d{10}(-\d{3})?$/.test(taxCode), 'Mã số thuế gồm 10 chữ số, hoặc 10 số kèm “-” và 3 số chi nhánh.');
      const e: BrandEntity = { companyName: text(d.companyName, 200), taxCode, contactPerson: text(d.contactPerson, 200), originCountry: text(d.originCountry, 100) };
      return { entity: e };
    }
    case 'WORKFLOW_RULES': {
      const prev = previous.workflowRules;
      const w: BrandWorkflowRules = {
        projectTier: PROJECT_TIERS.includes(d.projectTier as BrandProjectTier)
          ? (d.projectTier as BrandProjectTier)
          : (prev?.projectTier || 'TIER_B_GROWTH'),
        operatingModel: OPERATING_MODELS.includes(d.operatingModel as BrandOperatingModel)
          ? (d.operatingModel as BrandOperatingModel)
          : (prev?.operatingModel || 'FULLSTACK_CONTENT_BOOKING'),
        strategyOwnerTeam: STRATEGY_OWNERS.includes(d.strategyOwnerTeam as StrategyOwnerTeam)
          ? (d.strategyOwnerTeam as StrategyOwnerTeam)
          : (prev?.strategyOwnerTeam || 'CONTENT_TEAM'),
        brandApproverName: text(d.brandApproverName, 200) || prev?.brandApproverName || 'Đại diện nhãn hàng',
        kocApprovalMode: KOC_APPROVAL_MODES.includes(d.kocApprovalMode as KocApprovalMode)
          ? (d.kocApprovalMode as KocApprovalMode)
          : (prev?.kocApprovalMode || 'ALL'),
        requireScriptApproval: bool(d.requireScriptApproval, prev?.requireScriptApproval ?? true),
        requireDemoApproval: bool(d.requireDemoApproval, prev?.requireDemoApproval ?? true),
        autoAirAfterHours: intRange(d.autoAirAfterHours, 0, 720, prev?.autoAirAfterHours ?? 72),
        maxFreeRevisions: intRange(d.maxFreeRevisions, 0, 10, prev?.maxFreeRevisions ?? 2),
        sampleSender: SAMPLE_SENDERS.includes(d.sampleSender as SampleSenderType)
          ? (d.sampleSender as SampleSenderType)
          : (prev?.sampleSender || 'UPBASE_WAREHOUSE'),
        samplePrepSlaHours: intRange(d.samplePrepSlaHours, 4, 240, prev?.samplePrepSlaHours ?? 48),
        defaultSamplePolicy: SAMPLE_RETURN_RULES.includes(d.defaultSamplePolicy as SampleReturnRule)
          ? (d.defaultSamplePolicy as SampleReturnRule)
          : (prev?.defaultSamplePolicy || 'GIFT'),
        requiresAdsCode: bool(d.requiresAdsCode, prev?.requiresAdsCode ?? true),
        adsCodeDurationDays: intRange(d.adsCodeDurationDays, 0, 3650, prev?.adsCodeDurationDays ?? 60),
        requireRawVideoHandover: bool(d.requireRawVideoHandover, prev?.requireRawVideoHandover ?? false),
        repostAllowedChannels: lines(d.repostAllowedChannels, 15, 150),
        minVideoRetentionDays: intRange(d.minVideoRetentionDays, 7, 3650, prev?.minVideoRetentionDays ?? 90),
        exclusivityDays: intRange(d.exclusivityDays, 0, 365, prev?.exclusivityDays ?? 0),
        allowExtraFeeForAdsOrCrosspost: bool(d.allowExtraFeeForAdsOrCrosspost, prev?.allowExtraFeeForAdsOrCrosspost ?? false),
        preferredKocNiches: lines(d.preferredKocNiches, 15, 150),
        kocSelectionCriteria: text(d.kocSelectionCriteria, 1500),
        handoverFrom: text(d.handoverFrom, 150) || undefined,
        handoverTo: text(d.handoverTo, 150) || undefined,
        handoverFileUrl: url(d.handoverFileUrl) || undefined,
        bookingSheetUrl: url(d.bookingSheetUrl) || undefined,
        operationFileUrl: url(d.operationFileUrl) || undefined,
        canvaBriefUrl: url(d.canvaBriefUrl) || undefined,
      };
      return { workflowRules: w };
    }
    case 'PRODUCTS':
      return {
        products: list<BrandProduct>(d.products, 50, p => {
          const name = text(p.name, 200); if (!name) return null;
          const stockStatus = STOCK_STATUSES.includes(p.sampleStockStatus as SampleStockStatus)
            ? (p.sampleStockStatus as SampleStockStatus)
            : 'IN_STOCK';
          const returnRule = SAMPLE_RETURN_RULES.includes(p.sampleReturnRule as SampleReturnRule)
            ? (p.sampleReturnRule as SampleReturnRule)
            : 'GIFT';
          return {
            id: id(p.id),
            name,
            skuCode: text(p.skuCode, 80),
            size: text(p.size, 80),
            priceVnd: money(p.priceVnd),
            dealPriceVnd: money(p.dealPriceVnd),
            commissionOrganicPct: percent(p.commissionOrganicPct),
            commissionAdsPct: percent(p.commissionAdsPct),
            sampleStockStatus: stockStatus,
            sampleReturnRule: returnRule,
            pdpUrl: url(p.pdpUrl),
            usps: lines(p.usps, 8),
            mechanism: text(p.mechanism, 2000),
            ingredients: lines(p.ingredients, 20),
            targetUser: text(p.targetUser, 500),
            contraindications: text(p.contraindications, 500),
          };
        }),
      };
    case 'CONTENT_RULES': {
      const r: BrandContentRules = {
        banned: list(d.banned, 300, b => { const phrase = text(b.phrase, 120); return phrase ? { id: id(b.id), phrase, reason: text(b.reason, 300), replacement: text(b.replacement, 200) } : null; }),
        preferred: list(d.preferred, 200, b => { const phrase = text(b.phrase, 200); return phrase ? { id: id(b.id), phrase, note: text(b.note, 300) } : null; }),
        visualDo: lines(d.visualDo, 30),
        visualDont: lines(d.visualDont, 30),
        mandatoryHashtags: lines(d.mandatoryHashtags, 20, 100),
        mandatoryMentions: lines(d.mandatoryMentions, 15, 100),
        defaultCta: text(d.defaultCta, 400),
        videoDurationRule: text(d.videoDurationRule, 400),
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
          const fileKey = fileKeyField(l.fileKey);
          const link = url(l.url) || (fileKey ? `/api/brands/files?key=${encodeURIComponent(fileKey)}` : '');
          return {
            id: id(l.id),
            title,
            docNumber: text(l.docNumber, 100),
            authority: text(l.authority, 200),
            issueDate: text(l.issueDate, 20),
            validUntil: text(l.validUntil, 20),
            disclaimer: text(l.disclaimer, 1000),
            url: link,
            ...(fileKey ? {
              fileKey,
              fileName: text(l.fileName, 200) || undefined,
              fileSize: fileSizeField(l.fileSize),
              mimeType: text(l.mimeType, 120) || undefined,
              storage: storageField(l.storage, true),
            } : {}),
          };
        }),
      };
    case 'RATECARD':
      return { ratecard: GRADES.map(grade => ({ grade, maxBudget: money((list(d.ratecard, 10, r => r).find(r => r.grade === grade) as BrandRatecardRow | undefined)?.maxBudget) })) };
    case 'DOCUMENTS': {
      const known = new Map(previous.documents.map(x => [x.id, x]));
      return {
        documents: list<BrandDocument>(d.documents, 200, x => {
          const title = text(x.title, 200);
          const fileKey = fileKeyField(x.fileKey);
          const link = url(x.url) || (fileKey ? `/api/brands/files?key=${encodeURIComponent(fileKey)}` : '');
          if (!title || !link) return null;
          const old = typeof x.id === 'string' ? known.get(x.id) : undefined;
          const category = DOC_CATEGORIES.includes(x.category as BrandDocCategory) ? (x.category as BrandDocCategory) : 'OTHER';
          return {
            id: old?.id || randomUUID(),
            title,
            category,
            url: link,
            note: text(x.note, 500),
            addedBy: old?.addedBy || actorName,
            addedAt: old?.addedAt || new Date().toISOString(),
            ...(fileKey ? {
              fileKey,
              fileName: text(x.fileName, 200) || old?.fileName || undefined,
              fileSize: fileSizeField(x.fileSize) ?? old?.fileSize,
              mimeType: text(x.mimeType, 120) || old?.mimeType || undefined,
              storage: storageField(x.storage, true) || old?.storage,
            } : { storage: 'LINK' as const }),
          };
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
