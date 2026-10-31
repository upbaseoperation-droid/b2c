/**
 * Script nạp và chuyển đổi toàn diện dữ liệu sang Supabase PostgreSQL thực tế:
 * 1. Gian hàng B2C (StorePortfolio)
 * 2. Master Catalog & Access Policy RBAC (AppSharedRecord)
 * 3. Hồ sơ 42 Thương hiệu B2C (BrandProfileRecord)
 * 4. Hồ sơ hợp đồng & Chụp mẫu Word pháp chế (ContractHubRecord & ContractTemplateSnapshot)
 * 5. KOC Profiles & Lịch sử hợp tác (KocProfile & AppSharedRecord)
 */

import { PrismaClient, ServiceModel, AccountStatus, SalaryGrade, CreatorSegment, KocCategory } from '@prisma/client';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { DEFAULT_MASTER_CATALOG } from '../src/lib/masterCatalog';
import { defaultPolicy } from '../src/lib/server/accessPolicy';
import { getFallbackProfiles } from '../src/lib/brands/store';
import { REAL_B2C_69_STORES } from '../src/lib/realB2cPlanData';
import { INITIAL_KOCS, INITIAL_DEALS as SAMPLE_DEALS, INITIAL_STORE_PORTFOLIOS } from '../src/lib/mockData';
import { REAL_KOC_COOPERATION_DEALS } from '../src/lib/realKocDealsData';
import { REAL_LARK_LISTINGS_BY_BOARD_KEY, REAL_LARK_LISTINGS_SYNC_VERSION } from '../src/lib/realLarkListings2026';
import { loadStaffSheetCollection } from '../src/lib/staffBrandListingSheet';
import { loadApprovedBookingList } from '../src/lib/approvedBookingList';

const INITIAL_DEALS = [...SAMPLE_DEALS, ...REAL_KOC_COOPERATION_DEALS];

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Bắt đầu chuyển đổi dữ liệu sang Supabase PostgreSQL...');

  // =========================================================================
  // 1. STORE PORTFOLIO (69 Gian hàng B2C)
  // =========================================================================
  console.log('\n--- 1. Cập nhật 69 Gian hàng B2C (StorePortfolio table) ---');
  for (const store of REAL_B2C_69_STORES) {
    await prisma.storePortfolio.upsert({
      where: { storeName: store.storeName },
      update: {
        brandName: store.brandName,
        platform: store.platform,
        serviceModel: store.serviceModel as ServiceModel,
        difficultyTier: store.difficultyTier,
        difficultyMultiplier: store.difficultyMultiplier,
        category: store.category,
        accountStatus: AccountStatus.ACTIVE,
        isB2cManaged: true,
        hasBookingLeader: store.hasBookingLeader,
        bookingLeader: store.bookingLeader,
        accountOwnerName: store.accountOwnerName,
        b2cOwnerName: store.b2cOwnerName,
        budgetGross: store.budgetGross,
        budgetNet: store.budgetNet,
        budgetAffiliateGross: store.budgetAffiliateGross,
        budgetAffiliateNet: store.budgetAffiliateNet,
        budgetSelfChannelGross: store.budgetSelfChannelGross,
        budgetSelfChannelNet: store.budgetSelfChannelNet,
        budgetLive: store.budgetLive,
        targetPaidVideos: store.targetPaidVideos,
        targetFocVideos: store.targetFocVideos,
        targetSelfChannelContents: store.targetSelfChannelContents,
        targetLiveSessions: store.targetLiveSessions,
        actualSpentNet: store.actualSpentNet,
        actualAiredVideos: store.actualAiredVideos,
        financialRiskStatus: store.financialRiskStatus,
        financialRiskNotes: store.financialRiskNotes,
      },
      create: {
        storeName: store.storeName,
        brandName: store.brandName,
        platform: store.platform,
        serviceModel: store.serviceModel as ServiceModel,
        difficultyTier: store.difficultyTier,
        difficultyMultiplier: store.difficultyMultiplier,
        category: store.category,
        accountStatus: AccountStatus.ACTIVE,
        isB2cManaged: true,
        hasBookingLeader: store.hasBookingLeader,
        bookingLeader: store.bookingLeader,
        accountOwnerName: store.accountOwnerName,
        b2cOwnerName: store.b2cOwnerName,
        budgetGross: store.budgetGross,
        budgetNet: store.budgetNet,
        budgetAffiliateGross: store.budgetAffiliateGross,
        budgetAffiliateNet: store.budgetAffiliateNet,
        budgetSelfChannelGross: store.budgetSelfChannelGross,
        budgetSelfChannelNet: store.budgetSelfChannelNet,
        budgetLive: store.budgetLive,
        targetPaidVideos: store.targetPaidVideos,
        targetFocVideos: store.targetFocVideos,
        targetSelfChannelContents: store.targetSelfChannelContents,
        targetLiveSessions: store.targetLiveSessions,
        actualSpentNet: store.actualSpentNet,
        actualAiredVideos: store.actualAiredVideos,
        financialRiskStatus: store.financialRiskStatus,
        financialRiskNotes: store.financialRiskNotes,
      },
    });
  }
  console.log(`✅ Đã đồng bộ toàn bộ 69 gian hàng B2C vào StorePortfolio.`);

  // =========================================================================
  // 2. MASTER CATALOG & ACCESS POLICY (AppSharedRecord)
  // =========================================================================
  console.log('\n--- 2. Đồng bộ Master Catalog & Access Policy vào AppSharedRecord ---');

  await prisma.$executeRaw`
    INSERT INTO "AppSharedRecord" (key, revision, data)
    VALUES ('master-catalog', 1, ${JSON.stringify(DEFAULT_MASTER_CATALOG)}::jsonb)
    ON CONFLICT (key) DO UPDATE SET data = ${JSON.stringify(DEFAULT_MASTER_CATALOG)}::jsonb, revision = "AppSharedRecord".revision + 1
  `;

  await prisma.$executeRaw`
    INSERT INTO "AppSharedRecord" (key, revision, data)
    VALUES ('access-policy', 1, ${JSON.stringify(defaultPolicy)}::jsonb)
    ON CONFLICT (key) DO UPDATE SET data = ${JSON.stringify(defaultPolicy)}::jsonb, revision = "AppSharedRecord".revision + 1
  `;
  console.log('✅ Đã lưu trữ master-catalog và access-policy vào PostgreSQL.');

  // =========================================================================
  // 3. BRAND PROFILES (BrandProfileRecord)
  // =========================================================================
  console.log('\n--- 3. Kiểm tra và bổ sung BrandProfileRecord (42 Brands) ---');
  const profiles = getFallbackProfiles();
  const existingRecords = await prisma.brandProfileRecord.findMany({ select: { key: true } });
  const existingKeys = new Set(existingRecords.map(r => r.key));
  const missing = profiles.filter(p => !existingKeys.has(p.key));
  if (missing.length > 0) {
    await prisma.brandProfileRecord.createMany({
      data: missing.map(p => ({
        key: p.key,
        revision: 1,
        data: p as unknown as object,
      })),
      skipDuplicates: true,
    });
  }
  const totalBrandProfiles = await prisma.brandProfileRecord.count();
  console.log(`✅ Tổng BrandProfileRecord trong DB: ${totalBrandProfiles} (${missing.length} bản ghi mới thêm).`);

  // =========================================================================
  // 4. CONTRACT HUB & TEMPLATE SNAPSHOTS
  // =========================================================================
  console.log('\n--- 4. Chuyển đổi Hợp đồng & Snapshot mẫu Word sang PostgreSQL ---');

  const contractJsonPath = path.resolve(process.cwd(), '.contract-data/records.json');
  if (existsSync(contractJsonPath)) {
    const contracts = JSON.parse(readFileSync(contractJsonPath, 'utf8'));
    for (const c of contracts) {
      await prisma.$executeRaw`
        INSERT INTO "ContractHubRecord" (id, revision, data, "updatedAt")
        VALUES (${c.id}, ${c.revision || 1}, ${JSON.stringify(c)}::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE SET data = ${JSON.stringify(c)}::jsonb, revision = ${c.revision || 1}
      `;
      if (Array.isArray(c.signing)) {
        for (const s of c.signing) {
          if (s.documentId) {
            await prisma.$executeRaw`
              INSERT INTO "ContractWeSignBinding" ("documentId", "contractId")
              VALUES (${s.documentId}, ${c.id})
              ON CONFLICT ("documentId") DO NOTHING
            `;
          }
        }
      }
    }
    console.log(`✅ Đã nạp ${contracts.length} hồ sơ hợp đồng vào ContractHubRecord.`);
  }

  const templateDir = path.resolve(process.cwd(), '..', 'Quản lý hợp đồng');
  const SOURCES = [
    ['IND-HD', '1.1.1. BM.HĐ.VID.IND.Ver052026 booking Video.docx'],
    ['IND-BBNT', '1.1.2. BM.BBNT.VID.IND.Ver052026 booking Video.docx'],
    ['HKD-HD', '2.1.1. BM.HĐ.VID.HKD.Ver052026 booking Video.docx'],
    ['HKD-BBNT', '2.1.2. BM.BBNT.VID.HKD.Ver052026 booking Video.docx'],
    ['COM-HD', '3.1.1. BM.HĐ.VID.COM.Ver052026 booking video.docx'],
    ['COM-BBNT', '3.1.2. BM.BBNT.VID.COM.Ver052026 boooking video.docx'],
    ['CTV-HD', '4.1. BM.HĐVID.CTV.Ver052026 Upbase HĐNT booking CTV Video tháng.docx'],
    ['CTV-BBNT', '4.2. BM.BBNTVID.CTV.Ver052026 Upbase BBNT booking Video tháng.docx'],
  ] as const;

  let snapCount = 0;
  for (const [id, filename] of SOURCES) {
    const fullPath = path.join(templateDir, filename);
    if (existsSync(fullPath)) {
      const buffer = readFileSync(fullPath);
      const hash = createHash('sha256').update(buffer).digest('hex');
      await prisma.$executeRaw`
        INSERT INTO "ContractTemplateSnapshot" (hash, "templateId", file)
        VALUES (${hash}, ${id}, ${buffer})
        ON CONFLICT (hash) DO NOTHING
      `;
      snapCount++;
    }
  }
  console.log(`✅ Đã lưu ${snapCount}/8 bản mẫu Word gốc vào ContractTemplateSnapshot trong DB.`);

  // =========================================================================
  // 5. KOC PROFILES & LỊCH SỬ HỢP TÁC
  // =========================================================================
  console.log('\n--- 5. Đồng bộ Danh bạ KOC Chủ lực & Lịch sử hợp tác vào PostgreSQL ---');
  let kocCount = 0;
  for (const koc of INITIAL_KOCS) {
    const anyKoc = koc as any;
    const channelId = anyKoc.channelId || anyKoc.channel || `@koc_${koc.id}`;
    const stageName = anyKoc.stageName || anyKoc.name || anyKoc.kocName || 'Creator';
    const segmentRaw = String(anyKoc.segment || '');
    const segment: CreatorSegment = /top|celeb/i.test(segmentRaw)
      ? CreatorSegment.TOP_CREATOR
      : /key/i.test(segmentRaw)
        ? CreatorSegment.KEY_CREATOR
        : /mid/i.test(segmentRaw)
          ? CreatorSegment.MID_CREATOR
          : CreatorSegment.MASSIVE_CREATOR;

    const catRaw = String(anyKoc.category || anyKoc.kocCategory || '');
    const kocCategory: KocCategory = /mẹ|bé|mom/i.test(catRaw)
      ? KocCategory.MOM_AND_BABY
      : /fashion|thời trang/i.test(catRaw)
        ? KocCategory.FASHION
        : /fb|ẩm thực|ăn|f&b/i.test(catRaw)
          ? KocCategory.FB
          : /lifestyle|đời sống/i.test(catRaw)
            ? KocCategory.LIFESTYLE
            : /reviewer/i.test(catRaw)
              ? KocCategory.REVIEWER
              : KocCategory.PERSONAL_CARE;

    const salaryRaw = String(anyKoc.salaryGrade || '');
    const salaryGrade: SalaryGrade = /kl1/i.test(salaryRaw) ? SalaryGrade.KL1
      : /kl2/i.test(salaryRaw) ? SalaryGrade.KL2
      : /kl3/i.test(salaryRaw) ? SalaryGrade.KL3
      : /kl4/i.test(salaryRaw) ? SalaryGrade.KL4
      : /kl5/i.test(salaryRaw) ? SalaryGrade.KL5
      : /kl6/i.test(salaryRaw) ? SalaryGrade.KL6
      : /kl7/i.test(salaryRaw) ? SalaryGrade.KL7
      : /ngoài/i.test(salaryRaw) ? SalaryGrade.TAP_EXTERNAL
      : SalaryGrade.TAP_UPAFFILIATE;

    await prisma.kocProfile.upsert({
      where: { channelId },
      update: {
        stageName,
        realName: anyKoc.realName || stageName,
        tier: (anyKoc.tier as any) || 'TIER_3_MICRO',
        salaryGrade,
        segment,
        tepKenh: anyKoc.tepKenh || 'Review Nữ',
        kocCategory,
        channelUrl: anyKoc.channelLink || anyKoc.channelUrl || `https://www.tiktok.com/@${channelId.replace('@', '')}`,
        followersCount: anyKoc.followers || anyKoc.followersCount || 50000,
        avgViews: anyKoc.avgViews || 15000,
        rateCardVideo: anyKoc.rateCardVideo || 0,
        phone: anyKoc.phone || null,
        zalo: anyKoc.zalo || anyKoc.phone || null,
        email: anyKoc.email || null,
        cccd: anyKoc.cccd || null,
        taxCode: anyKoc.taxCode || null,
        bankName: anyKoc.bankName || null,
        bankAccount: anyKoc.bankAccount || null,
        reliabilityScore: anyKoc.reliabilityScore || 9.0,
      },
      create: {
        channelId,
        stageName,
        realName: anyKoc.realName || stageName,
        tier: (anyKoc.tier as any) || 'TIER_3_MICRO',
        salaryGrade,
        segment,
        tepKenh: anyKoc.tepKenh || 'Review Nữ',
        kocCategory,
        mainChannel: anyKoc.platform || anyKoc.mainChannel || 'TIKTOK',
        channelUrl: anyKoc.channelLink || anyKoc.channelUrl || `https://www.tiktok.com/@${channelId.replace('@', '')}`,
        followersCount: anyKoc.followers || anyKoc.followersCount || 50000,
        avgViews: anyKoc.avgViews || 15000,
        rateCardVideo: anyKoc.rateCardVideo || 0,
        phone: anyKoc.phone || null,
        zalo: anyKoc.zalo || anyKoc.phone || null,
        email: anyKoc.email || null,
        cccd: anyKoc.cccd || null,
        taxCode: anyKoc.taxCode || null,
        bankName: anyKoc.bankName || null,
        bankAccount: anyKoc.bankAccount || null,
        reliabilityScore: anyKoc.reliabilityScore || 9.0,
      },
    });
    kocCount++;
  }
  console.log(`✅ Đã đồng bộ ${kocCount} hồ sơ KOC chủ lực vào bảng KocProfile.`);

  await prisma.$executeRaw`
    INSERT INTO "AppSharedRecord" (key, revision, data)
    VALUES ('koc-master-dataset', 1, ${JSON.stringify({ totalKocs: INITIAL_KOCS.length, totalDeals: INITIAL_DEALS.length, updatedAt: new Date().toISOString() })}::jsonb)
    ON CONFLICT (key) DO UPDATE SET data = ${JSON.stringify({ totalKocs: INITIAL_KOCS.length, totalDeals: INITIAL_DEALS.length, updatedAt: new Date().toISOString() })}::jsonb, revision = "AppSharedRecord".revision + 1
  `;
  console.log(`✅ Đã đồng bộ metadata KOC (${INITIAL_KOCS.length} KOC & ${INITIAL_DEALS.length} Deal lịch sử hợp tác) vào PostgreSQL.`);

  // =========================================================================
  // 6. LARK BASE 3.1 LISTING KOC, STAFF SHEETS & APPROVED BOOKING LIST
  // =========================================================================
  console.log('\n--- 6. Đồng bộ Bảng 3.1 Listing KOC (59 Kế hoạch / 2.561 KOC) vào AppSharedRecord PostgreSQL ---');
  let boardCount = 0;
  let listingItemCount = 0;
  for (const [boardKey, items] of Object.entries(REAL_LARK_LISTINGS_BY_BOARD_KEY)) {
    const serialized = JSON.stringify({ items });
    await prisma.$executeRaw`
      INSERT INTO "AppSharedRecord" (key, revision, data)
      VALUES (${boardKey}, 1, ${serialized}::jsonb)
      ON CONFLICT (key) DO UPDATE SET data = ${serialized}::jsonb, revision = "AppSharedRecord".revision + 1
    `;
    boardCount++;
    listingItemCount += items.length;
  }
  console.log(`✅ Đã đồng bộ ${boardCount} bảng Listing (${listingItemCount} KOC) vào AppSharedRecord.`);

  const staffSheets = loadStaffSheetCollection(INITIAL_KOCS, INITIAL_STORE_PORTFOLIOS, INITIAL_DEALS);
  const serializedSheets = JSON.stringify(staffSheets);
  await prisma.$executeRaw`
    INSERT INTO "AppSharedRecord" (key, revision, data)
    VALUES ('staff-brand-listing-sheets-v1', 1, ${serializedSheets}::jsonb)
    ON CONFLICT (key) DO UPDATE SET data = ${serializedSheets}::jsonb, revision = "AppSharedRecord".revision + 1
  `;
  console.log(`✅ Đã đồng bộ ${Object.keys(staffSheets.sheets).length} Sheet Listing Brand vào AppSharedRecord.`);

  const approvedBookings = loadApprovedBookingList(INITIAL_KOCS, INITIAL_STORE_PORTFOLIOS, INITIAL_DEALS);
  const serializedApproved = JSON.stringify(approvedBookings);
  await prisma.$executeRaw`
    INSERT INTO "AppSharedRecord" (key, revision, data)
    VALUES ('approved-booking-list-v2', 1, ${serializedApproved}::jsonb)
    ON CONFLICT (key) DO UPDATE SET data = ${serializedApproved}::jsonb, revision = "AppSharedRecord".revision + 1
  `;
  console.log(`✅ Đã đồng bộ ${approvedBookings.length} bản ghi Quản lý Deal & Booking vào AppSharedRecord.`);

  const syncMeta = JSON.stringify({
    version: REAL_LARK_LISTINGS_SYNC_VERSION,
    syncedAt: new Date().toISOString(),
    totalBoards: boardCount,
    totalListingItems: listingItemCount,
    totalStaffSheets: Object.keys(staffSheets.sheets).length,
    totalApprovedBookings: approvedBookings.length,
  });
  await prisma.$executeRaw`
    INSERT INTO "AppSharedRecord" (key, revision, data)
    VALUES ('lark-31-listing-sync-meta', 1, ${syncMeta}::jsonb)
    ON CONFLICT (key) DO UPDATE SET data = ${syncMeta}::jsonb, revision = "AppSharedRecord".revision + 1
  `;

  console.log('\n=============================================');
  console.log('🎉 CHUYỂN ĐỔI SANG SUPABASE POSTGRESQL HOÀN TẤT!');
  console.log('=============================================');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi chuyển đổi DB:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
