/**
 * Kịch bản kiểm tra và đồng bộ toàn diện dữ liệu B2C (69 gian hàng, Kế hoạch tháng 10-11,
 * Danh bạ KOC, Hợp đồng, Hồ sơ thương hiệu và toàn bộ kho .shared-data) lên Supabase PostgreSQL.
 * Sử dụng Bulk Upsert qua jsonb_populate_recordset / UNNEST giúp hoàn tất trong vài giây.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { PrismaClient, Prisma } from '@prisma/client';
import { INITIAL_STORE_PORTFOLIOS, INITIAL_KOCS } from '../src/lib/mockData';
import { REAL_POTENTIAL_NEW_KOCS } from '../src/lib/realPotentialKocData';
import { INITIAL_MONTHLY_PLANS } from '../src/lib/monthlyPlanData';
import { REAL_MONTHLY_PLANS_OCT_2026, REAL_LARKBASE_RECORDS_OCT_2026 } from '../src/lib/realLarkPlans202610';
import { REAL_MONTHLY_PLANS_NOV_2026 } from '../src/lib/realLarkPlans202611';
import { DEMO_SEED_RECORDS } from '../src/lib/contracts/demoSeedRecords';
import { listProfiles } from '../src/lib/brands/store';
import type { InputPlanBreakdownState, KocItem, StorePortfolioItem } from '../src/lib/types';
import type { ContractRecord } from '../src/lib/contracts/types';

// Ưu tiên DIRECT_URL (port 5432 session mode) khi chạy script đồng bộ hàng loạt để tránh nghẽn pgbouncer
const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient(
  dbUrl ? { datasources: { db: { url: dbUrl } } } : undefined
);

export interface SupabaseSyncSummary {
  connected: boolean;
  timestamp: string;
  tables: Record<string, number>;
  synced: {
    stores: number;
    kocs: number;
    monthlyPlans: number;
    larkbaseRecords: number;
    sharedRecords: number;
    contracts: number;
    brandProfiles: number;
  };
}

async function inspectTables(): Promise<Record<string, number>> {
  const rows = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
  );
  const counts: Record<string, number> = {};
  for (const r of rows) {
    try {
      const c = await prisma.$queryRawUnsafe<Array<{ c: number }>>(
        `SELECT COUNT(*)::int as c FROM "${r.tablename}"`
      );
      counts[r.tablename] = c[0]?.c ?? 0;
    } catch {
      counts[r.tablename] = -1;
    }
  }
  return counts;
}

async function ensureCoreTablesExist(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AppSharedRecord" (
      "key" TEXT NOT NULL PRIMARY KEY,
      "revision" INTEGER NOT NULL DEFAULT 0,
      "data" JSONB NOT NULL
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "BrandProfileRecord" (
      "key" TEXT NOT NULL PRIMARY KEY,
      "revision" INTEGER NOT NULL DEFAULT 1,
      "data" JSONB NOT NULL,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ContractHubRecord" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "revision" INTEGER NOT NULL DEFAULT 1,
      "data" JSONB NOT NULL,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ContractWeSignBinding" (
      "documentId" TEXT NOT NULL PRIMARY KEY,
      "contractId" TEXT NOT NULL
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PartnerHubThread" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "data" JSONB NOT NULL,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function mapServiceModel(val?: string): 'FULL_SERVICE' | 'AFFILIATE_ONLY' | 'LIVESTREAM_DEDICATED' {
  if (val === 'AFFILIATE_ONLY' || val === 'LIVESTREAM_DEDICATED') return val;
  return 'FULL_SERVICE';
}

function mapAccountStatus(val?: string): 'ONBOARDING' | 'ACTIVE' | 'MAINTENANCE' | 'OFFBOARDED' {
  if (val === 'ONBOARDING' || val === 'MAINTENANCE' || val === 'OFFBOARDED') return val;
  return 'ACTIVE';
}

async function syncStoresToSupabase(stores: StorePortfolioItem[]): Promise<number> {
  let count = 0;
  const chunkSize = 10;
  for (let i = 0; i < stores.length; i += chunkSize) {
    const chunk = stores.slice(i, i + chunkSize).filter((s) => Boolean(s?.storeName));
    await prisma.$transaction(
      chunk.map((s) =>
        prisma.storePortfolio.upsert({
          where: { storeName: s.storeName },
          update: {
            brandName: s.brandName || s.storeName,
            platform: s.platform || 'TikTok Shop',
            storeUrl: s.storeUrl || null,
            serviceModel: mapServiceModel(s.serviceModel),
            difficultyTier: s.difficultyTier || 'Tiêu chuẩn',
            difficultyMultiplier: typeof s.difficultyMultiplier === 'number' ? s.difficultyMultiplier : 1.2,
            accountStatus: mapAccountStatus(s.accountStatus),
            category: s.category || 'Mỹ phẩm & Chăm sóc cá nhân',
            monthlyTargetGmv: new Prisma.Decimal(s.monthlyTargetGmv || 0),
            monthlyBudget: new Prisma.Decimal(s.monthlyBudget || 0),
            isB2cManaged: s.isB2cManaged !== false,
            hasBookingLeader: Boolean(s.hasBookingLeader || s.bookingLeader),
            bookingLeader: s.bookingLeader || null,
            budgetGross: new Prisma.Decimal(s.budgetGross || 0),
            budgetNet: new Prisma.Decimal(s.budgetNet || 0),
            budgetAffiliateGross: new Prisma.Decimal(s.budgetAffiliateGross || 0),
            budgetAffiliateNet: new Prisma.Decimal(s.budgetAffiliateNet || 0),
            budgetSelfChannelGross: new Prisma.Decimal(s.budgetSelfChannelGross || 0),
            budgetSelfChannelNet: new Prisma.Decimal(s.budgetSelfChannelNet || 0),
            budgetLive: new Prisma.Decimal(s.budgetLive || 0),
            targetPaidVideos: Math.round(s.targetPaidVideos || 0),
            targetFocVideos: Math.round(s.targetFocVideos || 0),
            targetSelfChannelContents: Math.round(s.targetSelfChannelContents || 0),
            targetLiveSessions: Math.round(s.targetLiveSessions || 0),
            actualSpentNet: new Prisma.Decimal(s.actualSpentNet || 0),
            actualAiredVideos: Math.round(s.actualAiredVideos || 0),
            financialRiskStatus: s.financialRiskStatus || 'NORMAL',
            financialRiskNotes: s.financialRiskNotes || null,
            accountOwnerName: s.accountOwnerName || 'Đặng Thị Yến Nhi',
            b2cOwnerName: s.b2cOwnerName || s.primaryPic || 'Đặng Thị Yến Nhi',
          },
          create: {
            storeOperationId: s.storeOperationId || null,
            brandName: s.brandName || s.storeName,
            storeName: s.storeName,
            platform: s.platform || 'TikTok Shop',
            storeUrl: s.storeUrl || null,
            serviceModel: mapServiceModel(s.serviceModel),
            difficultyTier: s.difficultyTier || 'Tiêu chuẩn',
            difficultyMultiplier: typeof s.difficultyMultiplier === 'number' ? s.difficultyMultiplier : 1.2,
            accountStatus: mapAccountStatus(s.accountStatus),
            category: s.category || 'Mỹ phẩm & Chăm sóc cá nhân',
            monthlyTargetGmv: new Prisma.Decimal(s.monthlyTargetGmv || 0),
            monthlyBudget: new Prisma.Decimal(s.monthlyBudget || 0),
            isB2cManaged: s.isB2cManaged !== false,
            hasBookingLeader: Boolean(s.hasBookingLeader || s.bookingLeader),
            bookingLeader: s.bookingLeader || null,
            budgetGross: new Prisma.Decimal(s.budgetGross || 0),
            budgetNet: new Prisma.Decimal(s.budgetNet || 0),
            budgetAffiliateGross: new Prisma.Decimal(s.budgetAffiliateGross || 0),
            budgetAffiliateNet: new Prisma.Decimal(s.budgetAffiliateNet || 0),
            budgetSelfChannelGross: new Prisma.Decimal(s.budgetSelfChannelGross || 0),
            budgetSelfChannelNet: new Prisma.Decimal(s.budgetSelfChannelNet || 0),
            budgetLive: new Prisma.Decimal(s.budgetLive || 0),
            targetPaidVideos: Math.round(s.targetPaidVideos || 0),
            targetFocVideos: Math.round(s.targetFocVideos || 0),
            targetSelfChannelContents: Math.round(s.targetSelfChannelContents || 0),
            targetLiveSessions: Math.round(s.targetLiveSessions || 0),
            actualSpentNet: new Prisma.Decimal(s.actualSpentNet || 0),
            actualAiredVideos: Math.round(s.actualAiredVideos || 0),
            financialRiskStatus: s.financialRiskStatus || 'NORMAL',
            financialRiskNotes: s.financialRiskNotes || null,
            accountOwnerName: s.accountOwnerName || 'Đặng Thị Yến Nhi',
            b2cOwnerName: s.b2cOwnerName || s.primaryPic || 'Đặng Thị Yến Nhi',
          },
        })
      )
    );
    count += chunk.length;
  }
  return count;
}

async function syncKocsToSupabase(kocs: KocItem[]): Promise<number> {
  const byChannel = new Map<string, KocItem>();
  for (const k of kocs) {
    if (!k?.channelId) continue;
    const cid = k.channelId.trim().startsWith('@') ? k.channelId.trim() : `@${k.channelId.trim()}`;
    byChannel.set(cid.toLowerCase(), { ...k, channelId: cid });
  }

  const items = Array.from(byChannel.values());
  const chunkSize = 150;
  let count = 0;

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize).map((raw) => {
      const k = raw as KocItem & { followersCount?: number; channelUrl?: string };
      return {
        id: randomUUID(),
        channelId: k.channelId,
        stageName: k.stageName || k.channelId,
        realName: k.realName || null,
        channelUrl: k.channelUrl || `https://www.tiktok.com/${k.channelId}`,
        followersCount: Math.max(0, Math.round(k.followersCount || k.followers || 0)),
        avgViews: Math.max(0, Math.round(k.avgViews || 0)),
        niche: k.niche || null,
        phone: k.phone || null,
        zalo: k.zalo || null,
        email: k.email || null,
        cccd: k.cccd || null,
        taxCode: k.taxCode || null,
        bankName: k.bankName || null,
        bankAccount: k.bankAccount || null,
        rateCardVideo: Number(k.rateCardVideo) || 0,
        reliabilityScore: typeof k.reliabilityScore === 'number' ? k.reliabilityScore : 10.0,
      };
    });

    const payloadJson = JSON.stringify(chunk);
    await prisma.$executeRaw`
      INSERT INTO "KocProfile" (
        "id", "channelId", "stageName", "realName", "channelUrl",
        "followersCount", "avgViews", "niche", "phone", "zalo", "email",
        "cccd", "taxCode", "bankName", "bankAccount", "rateCardVideo",
        "reliabilityScore", "updatedAt"
      )
      SELECT
        r."id", r."channelId", r."stageName", r."realName", r."channelUrl",
        r."followersCount", r."avgViews", r."niche", r."phone", r."zalo", r."email",
        r."cccd", r."taxCode", r."bankName", r."bankAccount", r."rateCardVideo",
        r."reliabilityScore", NOW()
      FROM jsonb_to_recordset(${payloadJson}::jsonb) AS r(
        "id" text,
        "channelId" text,
        "stageName" text,
        "realName" text,
        "channelUrl" text,
        "followersCount" int,
        "avgViews" int,
        "niche" text,
        "phone" text,
        "zalo" text,
        "email" text,
        "cccd" text,
        "taxCode" text,
        "bankName" text,
        "bankAccount" text,
        "rateCardVideo" numeric,
        "reliabilityScore" float8
      )
      ON CONFLICT ("channelId") DO UPDATE
      SET
        "stageName" = EXCLUDED."stageName",
        "realName" = COALESCE(EXCLUDED."realName", "KocProfile"."realName"),
        "channelUrl" = EXCLUDED."channelUrl",
        "followersCount" = GREATEST(EXCLUDED."followersCount", "KocProfile"."followersCount"),
        "avgViews" = GREATEST(EXCLUDED."avgViews", "KocProfile"."avgViews"),
        "niche" = COALESCE(EXCLUDED."niche", "KocProfile"."niche"),
        "phone" = COALESCE(EXCLUDED."phone", "KocProfile"."phone"),
        "zalo" = COALESCE(EXCLUDED."zalo", "KocProfile"."zalo"),
        "email" = COALESCE(EXCLUDED."email", "KocProfile"."email"),
        "cccd" = COALESCE(EXCLUDED."cccd", "KocProfile"."cccd"),
        "taxCode" = COALESCE(EXCLUDED."taxCode", "KocProfile"."taxCode"),
        "bankName" = COALESCE(EXCLUDED."bankName", "KocProfile"."bankName"),
        "bankAccount" = COALESCE(EXCLUDED."bankAccount", "KocProfile"."bankAccount"),
        "rateCardVideo" = COALESCE(NULLIF(EXCLUDED."rateCardVideo", 0), "KocProfile"."rateCardVideo"),
        "updatedAt" = NOW()
    `;
    count += chunk.length;
  }

  return count;
}

const DEPRECATED_MOCK_PLAN_IDS = new Set([
  'PLAN-2026-09-CLIO',
  'PLAN-2026-09-LEMONADE',
  'PLAN-2026-09-SENKA',
  'PLAN-2026-08-TMCLEAN',
  'PLAN-2026-08-FRESH',
]);

async function syncMonthlyPlansToSupabase(): Promise<{ plans: number; larkRecords: number }> {
  const allPlans: InputPlanBreakdownState[] = [
    ...INITIAL_MONTHLY_PLANS,
    ...REAL_MONTHLY_PLANS_OCT_2026,
    ...REAL_MONTHLY_PLANS_NOV_2026,
  ].filter((p) => p?.id && !DEPRECATED_MOCK_PLAN_IDS.has(p.id) && !p.id.startsWith('PLAN-AUDIT-G3-'));

  const seenPlanIds = new Set<string>();
  const seenLarkIds = new Set<string>();
  const existingLarkRows = await prisma.monthlyPlan.findMany({
    where: { larkRecordId: { not: null } },
    select: { id: true, larkRecordId: true },
  });
  const ownerByLarkId = new Map<string, string>();
  for (const r of existingLarkRows) {
    if (r.larkRecordId) ownerByLarkId.set(r.larkRecordId, r.id);
  }

  const dedupedPlans: InputPlanBreakdownState[] = [];
  for (const p of allPlans) {
    if (seenPlanIds.has(p.id)) continue;
    seenPlanIds.add(p.id);
    let safeLarkId = p.larkRecordId || undefined;
    if (safeLarkId) {
      const existingOwner = ownerByLarkId.get(safeLarkId);
      if (seenLarkIds.has(safeLarkId) || (existingOwner && existingOwner !== p.id)) {
        safeLarkId = undefined;
      } else {
        seenLarkIds.add(safeLarkId);
      }
    }
    dedupedPlans.push({ ...p, larkRecordId: safeLarkId });
  }

  let planCount = 0;
  const chunkSize = 15;
  for (let i = 0; i < dedupedPlans.length; i += chunkSize) {
    const chunk = dedupedPlans.slice(i, i + chunkSize);
    await prisma.$transaction(
      chunk.map((plan) => {
        const { versionSnapshots = [], discussions = [], ...working } = plan;
        return prisma.monthlyPlan.upsert({
          where: { id: plan.id },
          update: {
            title: plan.title || 'Kế hoạch tháng',
            brandName: plan.brandName || '',
            storeId: plan.storeId ?? null,
            month: plan.month || '2026/10',
            week: plan.week ?? null,
            pic: plan.pic ?? null,
            bookingLeader: plan.bookingLeader ?? null,
            status: plan.status || 'DRAFT',
            currentVersionCode: plan.currentVersionCode || 'v1.0',
            isVersionLocked: Boolean(plan.isVersionLocked),
            totalTargetBudget: new Prisma.Decimal(plan.totalTargetBudget || 0),
            budgetAdsTotal: new Prisma.Decimal(plan.budgetAdsTotal || 0),
            targetGmv: new Prisma.Decimal(plan.targetGmv || 0),
            totalTargetContents: Math.round(plan.totalTargetContents || 0),
            sourceSystem: plan.sourceSystem || 'LARKBASE',
            larkRecordId: plan.larkRecordId || null,
            data: working as unknown as Prisma.InputJsonValue,
          },
          create: {
            id: plan.id,
            title: plan.title || 'Kế hoạch tháng',
            brandName: plan.brandName || '',
            storeId: plan.storeId ?? null,
            month: plan.month || '2026/10',
            week: plan.week ?? null,
            pic: plan.pic ?? null,
            bookingLeader: plan.bookingLeader ?? null,
            status: plan.status || 'DRAFT',
            currentVersionCode: plan.currentVersionCode || 'v1.0',
            isVersionLocked: Boolean(plan.isVersionLocked),
            totalTargetBudget: new Prisma.Decimal(plan.totalTargetBudget || 0),
            budgetAdsTotal: new Prisma.Decimal(plan.budgetAdsTotal || 0),
            targetGmv: new Prisma.Decimal(plan.targetGmv || 0),
            totalTargetContents: Math.round(plan.totalTargetContents || 0),
            sourceSystem: plan.sourceSystem || 'LARKBASE',
            larkRecordId: plan.larkRecordId || null,
            data: working as unknown as Prisma.InputJsonValue,
            revision: 1,
          },
        });
      })
    );
    planCount += chunk.length;
  }

  const larkCount = await prisma.larkbaseBookingPlanRecord.count().catch(() => REAL_LARKBASE_RECORDS_OCT_2026.length);
  return { plans: planCount, larkRecords: larkCount };
}

async function syncLocalSharedDataDirToSupabase(): Promise<number> {
  const sharedDir = path.join(process.cwd(), '.shared-data');
  let files: string[] = [];
  try {
    files = (await fs.readdir(sharedDir)).filter((f) => f.endsWith('.json'));
  } catch {
    return 0;
  }

  let count = 0;
  const chunkSize = 10;
  for (let i = 0; i < files.length; i += chunkSize) {
    const chunk = files.slice(i, i + chunkSize);
    for (const f of chunk) {
      const key = f.replace(/\.json$/, '');
      try {
        const raw = await fs.readFile(path.join(sharedDir, f), 'utf8');
        const parsed = JSON.parse(raw) as { revision?: number; data?: unknown };
        const revision = typeof parsed.revision === 'number' && parsed.revision > 0 ? parsed.revision : 1;
        const dataPayload = parsed.data !== undefined ? parsed.data : parsed;
        const serialized = JSON.stringify(dataPayload);

        await prisma.$executeRaw`
          INSERT INTO "AppSharedRecord" (key, revision, data)
          VALUES (${key}, ${revision}, ${serialized}::jsonb)
          ON CONFLICT (key) DO UPDATE
          SET
            revision = GREATEST("AppSharedRecord".revision, EXCLUDED.revision),
            data = CASE
              WHEN EXCLUDED.revision >= "AppSharedRecord".revision THEN EXCLUDED.data
              ELSE "AppSharedRecord".data
            END
        `;
        count++;
      } catch (err) {
        console.warn(`[supabase-sync] Bỏ qua file .shared-data/${f}:`, (err as Error).message);
      }
    }
  }
  return count;
}

async function syncContractsToSupabase(): Promise<number> {
  const contractFile = path.join(process.cwd(), '.contract-data', 'records.json');
  let localList: ContractRecord[] = [];
  try {
    const raw = await fs.readFile(contractFile, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) localList = parsed;
  } catch {
    // ignore if file does not exist
  }

  const byId = new Map<string, ContractRecord>();
  for (const seed of DEMO_SEED_RECORDS) {
    if (seed?.id) byId.set(seed.id, seed);
  }
  for (const r of localList) {
    if (r?.id) byId.set(r.id, r);
  }

  let count = 0;
  for (const rec of byId.values()) {
    const rev = typeof rec.revision === 'number' && rec.revision > 0 ? rec.revision : 1;
    const serialized = JSON.stringify(rec);
    await prisma.$executeRaw`
      INSERT INTO "ContractHubRecord" (id, revision, data, "updatedAt")
      VALUES (${rec.id}, ${rev}, ${serialized}::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE
      SET
        revision = GREATEST("ContractHubRecord".revision, EXCLUDED.revision),
        data = CASE
          WHEN EXCLUDED.revision >= "ContractHubRecord".revision THEN EXCLUDED.data
          ELSE "ContractHubRecord".data
        END,
        "updatedAt" = NOW()
    `;
    count++;
  }
  return count;
}

async function syncBrandsToSupabase(): Promise<number> {
  const profiles = await listProfiles();
  let count = 0;
  for (const p of profiles) {
    if (!p?.key) continue;
    const rev = typeof p.revision === 'number' && p.revision > 0 ? p.revision : 1;
    const serialized = JSON.stringify(p);
    await prisma.$executeRaw`
      INSERT INTO "BrandProfileRecord" (key, revision, data, "updatedAt")
      VALUES (${p.key}, ${rev}, ${serialized}::jsonb, NOW())
      ON CONFLICT (key) DO UPDATE
      SET
        revision = GREATEST("BrandProfileRecord".revision, EXCLUDED.revision),
        data = CASE
          WHEN EXCLUDED.revision >= "BrandProfileRecord".revision THEN EXCLUDED.data
          ELSE "BrandProfileRecord".data
        END,
        "updatedAt" = NOW()
    `;
    count++;
  }
  return count;
}

export async function runFullSupabaseSync(options?: { inspectOnly?: boolean }): Promise<SupabaseSyncSummary> {
  await ensureCoreTablesExist();

  if (options?.inspectOnly) {
    const tables = await inspectTables();
    return {
      connected: true,
      timestamp: new Date().toISOString(),
      tables,
      synced: {
        stores: 0,
        kocs: 0,
        monthlyPlans: 0,
        larkbaseRecords: 0,
        sharedRecords: 0,
        contracts: 0,
        brandProfiles: 0,
      },
    };
  }

  console.log('1/5 Đồng bộ 69 Gian hàng B2C (StorePortfolio)...');
  const storesCount = await syncStoresToSupabase(INITIAL_STORE_PORTFOLIOS);

  console.log('2/5 Đồng bộ Danh bạ KOC (KocProfile - Bulk SQL)...');
  const kocsCount = await syncKocsToSupabase([...INITIAL_KOCS, ...(REAL_POTENTIAL_NEW_KOCS as KocItem[])]);

  console.log('3/5 Đồng bộ Kế hoạch Tháng 10 & 11/2026 (MonthlyPlan)...');
  const { plans: monthlyPlansCount, larkRecords: larkbaseRecordsCount } = await syncMonthlyPlansToSupabase();

  console.log('4/5 Đồng bộ toàn bộ .shared-data/*.json lên bảng AppSharedRecord...');
  const sharedCount = await syncLocalSharedDataDirToSupabase();

  console.log('5/5 Đồng bộ Hợp đồng (ContractHubRecord) & Hồ sơ Thương hiệu (BrandProfileRecord)...');
  const contractsCount = await syncContractsToSupabase();
  const brandProfilesCount = await syncBrandsToSupabase();

  const tables = await inspectTables();
  return {
    connected: true,
    timestamp: new Date().toISOString(),
    tables,
    synced: {
      stores: storesCount,
      kocs: kocsCount,
      monthlyPlans: monthlyPlansCount,
      larkbaseRecords: larkbaseRecordsCount,
      sharedRecords: sharedCount,
      contracts: contractsCount,
      brandProfiles: brandProfilesCount,
    },
  };
}

if (require.main === module || process.argv[1]?.includes('supabase-sync-all')) {
  const inspectOnly = process.argv.includes('--inspect');
  runFullSupabaseSync({ inspectOnly })
    .then((summary) => {
      console.log('\n=== KẾT QUẢ ĐỒNG BỘ SUPABASE POSTGRESQL ===');
      console.log(JSON.stringify(summary, null, 2));
    })
    .catch((err) => {
      console.error('Lỗi đồng bộ Supabase:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
