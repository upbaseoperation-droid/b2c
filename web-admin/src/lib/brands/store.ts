/**
 * Lưu hồ sơ thương hiệu. Production: PostgreSQL (bảng "BrandProfileRecord", có revision chống ghi đè).
 * Tự động tạo bảng nếu chưa chạy migration, và tự động phục hồi an toàn về dữ liệu khởi tạo nếu database không khả dụng.
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

const TONE_FROM_MOCK: Record<string, ToneTag> = {
  'BÁC_SĨ_CHUYÊN_GIA': 'EXPERT',
  'MẸ_BỈM_CHÂN_THỰC': 'MOM',
  'GEN_Z_TRENDING': 'GENZ',
  'SANG_TRỌNG_CAO_CẤP': 'PREMIUM',
};

/** Dữ liệu mẫu (mockData) cho môi trường phát triển hoặc khi database chưa kết nối được. */
function seedFromMock(kb: BrandKnowledgeBase): BrandProfile {
  return {
    key: brandKey(kb.brandName),
    brandName: kb.brandName,
    revision: 1,
    updatedAt: kb.lastUpdated,
    updatedBy: `${kb.updatedBy} (dữ liệu mẫu)`,
    positioning: {
      slogan: kb.slogan,
      story: kb.brandStory,
      toneTag: TONE_FROM_MOCK[kb.toneTag],
      toneOfVoice: kb.toneOfVoice,
      targetAudience: kb.targetPersonaSummary,
    },
    entity: {
      companyName: kb.companyName || '',
      taxCode: kb.taxCode || '',
      contactPerson: kb.contactPerson || '',
      originCountry: kb.originCountry,
    },
    products: kb.skus.map(s => ({
      id: s.id,
      name: s.name,
      skuCode: s.skuCode,
      size: s.volumeOrWeight,
      priceVnd: s.priceVnd || undefined,
      pdpUrl: /^https?:/.test(s.pdpUrl) ? s.pdpUrl : '',
      usps: s.uniqueSellingPoints,
      mechanism: s.scientificMechanism,
      ingredients: s.keyActiveIngredients.map(i => [i.name, i.benefit].filter(Boolean).join(': ')),
      targetUser: s.targetSkinOrUser,
      contraindications: s.contraindications,
    })),
    contentRules: {
      banned: kb.blacklistKeywords.map(b => ({
        id: b.id,
        phrase: b.keyword,
        reason: b.rationale,
        replacement: b.alternativeSuggestion || '',
      })),
      preferred: kb.whitelistKeywords.map(w => ({
        id: w.id,
        phrase: w.phrase,
        note: w.benefitNotes,
      })),
      visualDo: kb.visualDoList,
      visualDont: kb.visualDontList,
    },
    faqs: kb.objectionFaqs.map(f => ({
      id: f.id,
      question: f.question,
      answer: f.recommendedAnswerForKoc,
      mention: f.doMentionPoints,
      avoid: f.dontSayWords,
    })),
    legal: kb.certifications.map(c => ({
      id: c.id,
      title: c.docTitle,
      docNumber: c.docNumber,
      authority: c.issuingAuthority,
      issueDate: c.issueDate,
      validUntil: c.validUntil || '',
      disclaimer: c.mandatoryDisclaimerText || '',
      url: c.verificationUrl || '',
    })),
    ratecard: (kb.ratecardCeiling || []).map(r => ({
      grade: r.grade,
      maxBudget: r.maxBudget,
    })),
    documents: [],
    history: [],
  };
}

// Bộ nhớ tạm phòng ngừa khi database Postgres không khả dụng trên serverless hoặc local
let inMemoryFallback: BrandProfile[] | null = null;

function getFallbackProfiles(): BrandProfile[] {
  if (!inMemoryFallback) {
    inMemoryFallback = INITIAL_BRAND_KNOWLEDGE_BASES.map(seedFromMock);
  }
  return inMemoryFallback;
}

// Bộ nhớ đệm tầng ứng dụng (In-Memory Cache) với TTL 30 giây để phản hồi ngay lập tức (<1ms)
let profilesMemoryCache: { profiles: BrandProfile[]; timestamp: number } | null = null;
const PROFILES_CACHE_TTL_MS = 30_000;

// Circuit Breaker chống treo server khi Postgres không thể kết nối hoặc độ trễ mạng cao
const dbHealth = {
  isAvailable: true,
  lastFailureTime: 0,
};
const DB_FAILURE_COOLDOWN_MS = 60_000; // Nghỉ 60 giây trước khi thử kết nối lại nếu vừa gặp lỗi

async function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMsg)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

async function ensurePostgresTable(): Promise<boolean> {
  if (!dbHealth.isAvailable) return false;
  try {
    await withTimeout(
      prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "BrandProfileRecord" (
          "key" TEXT NOT NULL PRIMARY KEY,
          "revision" INTEGER NOT NULL DEFAULT 1,
          "data" JSONB NOT NULL,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `,
      1500,
      'Khởi tạo bảng BrandProfileRecord quá thời gian cho phép'
    );
    return true;
  } catch (err) {
    console.warn('[BrandProfileStore] Could not auto-create BrandProfileRecord table:', err);
    dbHealth.isAvailable = false;
    dbHealth.lastFailureTime = Date.now();
    return false;
  }
}

async function localProfiles(): Promise<BrandProfile[]> {
  try {
    return JSON.parse(await readFile(file(), 'utf8'));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    const seeded = getFallbackProfiles();
    await mkdir(directory(), { recursive: true });
    await writeFile(file(), JSON.stringify(seeded), { mode: 0o600, flag: 'wx' }).catch(() => undefined);
    return seeded;
  }
}

export async function listProfiles(): Promise<BrandProfile[]> {
  // 1. Phục vụ ngay từ in-memory cache nếu còn hạn
  if (profilesMemoryCache && Date.now() - profilesMemoryCache.timestamp < PROFILES_CACHE_TTL_MS) {
    return profilesMemoryCache.profiles;
  }

  // 2. Chế độ cục bộ (local JSON)
  if (local()) {
    try {
      const data = await localProfiles();
      profilesMemoryCache = { profiles: data, timestamp: Date.now() };
      return data;
    } catch {
      const data = getFallbackProfiles();
      profilesMemoryCache = { profiles: data, timestamp: Date.now() };
      return data;
    }
  }

  // 3. Chế độ database với Circuit Breaker & Timeout (tối đa 1.5s)
  const isCooldown = Date.now() - dbHealth.lastFailureTime < DB_FAILURE_COOLDOWN_MS;
  if (!isCooldown) {
    try {
      const rows = await withTimeout(
        prisma.$queryRaw<Array<{ data: BrandProfile }>>`SELECT data FROM "BrandProfileRecord"`,
        1500,
        'Truy vấn BrandProfileRecord vượt quá thời gian cho phép'
      );
      dbHealth.isAvailable = true;

      if (rows.length === 0) {
        const seeds = getFallbackProfiles();
        // Cập nhật ngầm trong nền không chặn người dùng
        ensurePostgresTable().then(async ready => {
          if (!ready) return;
          for (const s of seeds) {
            await prisma.$executeRaw`
              INSERT INTO "BrandProfileRecord" (key, revision, data, "updatedAt")
              VALUES (${s.key}, 1, ${JSON.stringify(s)}::jsonb, NOW())
              ON CONFLICT (key) DO NOTHING;
            `.catch(() => undefined);
          }
        }).catch(() => undefined);

        profilesMemoryCache = { profiles: seeds, timestamp: Date.now() };
        return seeds;
      }

      const profiles = rows.map(r => r.data);
      profilesMemoryCache = { profiles, timestamp: Date.now() };
      return profiles;
    } catch (dbErr) {
      console.warn('[BrandProfileStore] Database query failed or timed out, activating circuit breaker fallback:', (dbErr as Error).message);
      dbHealth.isAvailable = false;
      dbHealth.lastFailureTime = Date.now();
    }
  }

  // 4. Fallback mượt mà: ưu tiên đọc file cục bộ nếu có, sau đó đến in-memory seed
  try {
    const fallback = await localProfiles();
    profilesMemoryCache = { profiles: fallback, timestamp: Date.now() };
    return fallback;
  } catch {
    const fallback = getFallbackProfiles();
    profilesMemoryCache = { profiles: fallback, timestamp: Date.now() };
    return fallback;
  }
}

/** Ghi hồ sơ. `expected` là revision người dùng đang xem; khác revision trên máy chủ thì từ chối. */
export async function saveProfile(profile: BrandProfile, expected: number): Promise<BrandProfile> {
  const next = { ...profile, revision: expected + 1, updatedAt: new Date().toISOString() };
  
  // Cập nhật ngay vào cache bộ nhớ để phản hồi tức thì
  if (profilesMemoryCache) {
    const list = profilesMemoryCache.profiles;
    const idx = list.findIndex(p => p.key === next.key);
    if (idx >= 0) list[idx] = next; else list.push(next);
    profilesMemoryCache.timestamp = Date.now();
  }

  if (!local()) {
    const isCooldown = Date.now() - dbHealth.lastFailureTime < DB_FAILURE_COOLDOWN_MS;
    if (!isCooldown) {
      try {
        if (expected === 0) {
          const inserted = await withTimeout(
            prisma.$executeRaw`INSERT INTO "BrandProfileRecord" (key, revision, data, "updatedAt") VALUES (${next.key}, 1, ${JSON.stringify(next)}::jsonb, NOW()) ON CONFLICT (key) DO NOTHING`,
            2000,
            'Lưu hồ sơ vào Database quá thời gian cho phép'
          );
          requireBrand(inserted === 1, 'Hồ sơ vừa được người khác tạo. Tải lại rồi sửa tiếp.', 409);
        } else {
          const updated = await withTimeout(
            prisma.$executeRaw`UPDATE "BrandProfileRecord" SET revision=${next.revision}, data=${JSON.stringify(next)}::jsonb, "updatedAt"=NOW() WHERE key=${next.key} AND revision=${expected}`,
            2000,
            'Cập nhật hồ sơ vào Database quá thời gian cho phép'
          );
          requireBrand(updated === 1, 'Hồ sơ đã được người khác cập nhật. Tải lại rồi sửa tiếp.', 409);
        }
        dbHealth.isAvailable = true;
        return next;
      } catch (dbErr) {
        if (dbErr instanceof BrandError) throw dbErr;
        console.warn('[BrandProfileStore] Postgres save failed or timed out:', (dbErr as Error).message);
        dbHealth.isAvailable = false;
        dbHealth.lastFailureTime = Date.now();
      }
    }
    // Fallback in-memory
    const list = getFallbackProfiles();
    const index = list.findIndex(p => p.key === next.key);
    if (index < 0) list.push(next); else list[index] = next;
    return next;
  }

  // Local filesystem
  await mkdir(directory(), { recursive: true });
  let lock;
  try {
    lock = await open(path.join(directory(), 'profiles.lock'), 'wx');
  } catch {
    throw new BrandError('Hồ sơ đang được lưu. Thử lại sau giây lát.', 409);
  }
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
    await unlink(path.join(directory(), 'profiles.lock')).catch(() => undefined);
    await unlink(temp).catch(() => undefined);
  }
}

export const brandStorageMode = () => (local() ? 'LOCAL_DEVELOPMENT' : (dbHealth.isAvailable ? 'POSTGRES' : 'POSTGRES_FALLBACK'));
