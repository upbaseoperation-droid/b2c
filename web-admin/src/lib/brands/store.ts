/**
 * Lưu hồ sơ thương hiệu. Production: PostgreSQL (bảng "BrandProfileRecord", có revision chống ghi đè).
 * Phát triển: file JSON cục bộ `.brand-data/profiles.json`, nạp dữ liệu mẫu lần đầu để thử giao diện.
 */

import { mkdir, readFile, writeFile, rename, open, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import prisma from '../prisma';
import { INITIAL_BRAND_KNOWLEDGE_BASES } from '../mockData';
import type { BrandKnowledgeBase } from '../types';
import { BrandError, requireBrand } from './domain';
import type { BrandProfile, ToneTag } from './types';
import { brandKey } from './types';

const local = () => process.env.NODE_ENV !== 'production' && process.env.BRAND_STORAGE !== 'postgres';
const directory = () => path.resolve(/*turbopackIgnore: true*/ process.env.BRAND_DATA_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), '.brand-data'));
const file = () => path.join(directory(), 'profiles.json');

const TONE_FROM_MOCK: Record<string, ToneTag> = { 'BÁC_SĨ_CHUYÊN_GIA': 'EXPERT', 'MẸ_BỈM_CHÂN_THỰC': 'MOM', 'GEN_Z_TRENDING': 'GENZ', 'SANG_TRỌNG_CAO_CẤP': 'PREMIUM' };

/** Dữ liệu mẫu (mockData) cho môi trường phát triển. Không dùng ở production. */
function seedFromMock(kb: BrandKnowledgeBase): BrandProfile {
  return {
    key: brandKey(kb.brandName), brandName: kb.brandName, revision: 1, updatedAt: kb.lastUpdated, updatedBy: `${kb.updatedBy} (dữ liệu mẫu)`,
    positioning: { slogan: kb.slogan, story: kb.brandStory, toneTag: TONE_FROM_MOCK[kb.toneTag], toneOfVoice: kb.toneOfVoice, targetAudience: kb.targetPersonaSummary },
    entity: { companyName: kb.companyName || '', taxCode: kb.taxCode || '', contactPerson: kb.contactPerson || '', originCountry: kb.originCountry },
    products: kb.skus.map(s => ({ id: s.id, name: s.name, skuCode: s.skuCode, size: s.volumeOrWeight, priceVnd: s.priceVnd || undefined, pdpUrl: /^https?:/.test(s.pdpUrl) ? s.pdpUrl : '', usps: s.uniqueSellingPoints, mechanism: s.scientificMechanism, ingredients: s.keyActiveIngredients.map(i => [i.name, i.benefit].filter(Boolean).join(': ')), targetUser: s.targetSkinOrUser, contraindications: s.contraindications })),
    contentRules: {
      banned: kb.blacklistKeywords.map(b => ({ id: b.id, phrase: b.keyword, reason: b.rationale, replacement: b.alternativeSuggestion || '' })),
      preferred: kb.whitelistKeywords.map(w => ({ id: w.id, phrase: w.phrase, note: w.benefitNotes })),
      visualDo: kb.visualDoList, visualDont: kb.visualDontList,
    },
    faqs: kb.objectionFaqs.map(f => ({ id: f.id, question: f.question, answer: f.recommendedAnswerForKoc, mention: f.doMentionPoints, avoid: f.dontSayWords })),
    legal: kb.certifications.map(c => ({ id: c.id, title: c.docTitle, docNumber: c.docNumber, authority: c.issuingAuthority, issueDate: c.issueDate, validUntil: c.validUntil || '', disclaimer: c.mandatoryDisclaimerText || '', url: c.verificationUrl || '' })),
    ratecard: (kb.ratecardCeiling || []).map(r => ({ grade: r.grade, maxBudget: r.maxBudget })),
    documents: [],
    history: [],
  };
}

async function localProfiles(): Promise<BrandProfile[]> {
  try {
    return JSON.parse(await readFile(file(), 'utf8'));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    const seeded = INITIAL_BRAND_KNOWLEDGE_BASES.map(seedFromMock);
    await mkdir(directory(), { recursive: true });
    await writeFile(file(), JSON.stringify(seeded), { mode: 0o600, flag: 'wx' }).catch(() => undefined);
    return seeded;
  }
}

export async function listProfiles(): Promise<BrandProfile[]> {
  if (local()) return localProfiles();
  const rows = await prisma.$queryRaw<Array<{ data: BrandProfile }>>`SELECT data FROM "BrandProfileRecord"`;
  return rows.map(r => r.data);
}

/** Ghi hồ sơ. `expected` là revision người dùng đang xem; khác revision trên máy chủ thì từ chối. */
export async function saveProfile(profile: BrandProfile, expected: number): Promise<BrandProfile> {
  const next = { ...profile, revision: expected + 1 };
  if (!local()) {
    if (expected === 0) {
      const inserted = await prisma.$executeRaw`INSERT INTO "BrandProfileRecord" (key, revision, data, "updatedAt") VALUES (${next.key}, 1, ${JSON.stringify(next)}::jsonb, NOW()) ON CONFLICT (key) DO NOTHING`;
      requireBrand(inserted === 1, 'Hồ sơ vừa được người khác tạo. Tải lại rồi sửa tiếp.', 409);
    } else {
      const updated = await prisma.$executeRaw`UPDATE "BrandProfileRecord" SET revision=${next.revision}, data=${JSON.stringify(next)}::jsonb, "updatedAt"=NOW() WHERE key=${next.key} AND revision=${expected}`;
      requireBrand(updated === 1, 'Hồ sơ đã được người khác cập nhật. Tải lại rồi sửa tiếp.', 409);
    }
    return next;
  }
  await mkdir(directory(), { recursive: true });
  let lock;
  try { lock = await open(path.join(directory(), 'profiles.lock'), 'wx'); }
  catch { throw new BrandError('Hồ sơ đang được lưu. Thử lại sau giây lát.', 409); }
  const temp = path.join(directory(), `${randomUUID()}.tmp`);
  try {
    const all = await localProfiles();
    const index = all.findIndex(p => p.key === next.key);
    requireBrand(index < 0 ? expected === 0 : all[index].revision === expected, 'Hồ sơ đã được người khác cập nhật. Tải lại rồi sửa tiếp.', 409);
    if (index < 0) all.push(next); else all[index] = next;
    await writeFile(temp, JSON.stringify(all), { mode: 0o600 });
    await rename(temp, file());
    return next;
  } finally {
    await lock.close();
    await unlink(path.join(directory(), 'profiles.lock'));
    await unlink(temp).catch(() => undefined);
  }
}

export const brandStorageMode = () => (local() ? 'LOCAL_DEVELOPMENT' : 'POSTGRES');
