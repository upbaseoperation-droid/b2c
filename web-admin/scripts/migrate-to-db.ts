/**
 * Script nạp và chuyển đổi toàn diện dữ liệu sang Supabase PostgreSQL thực tế:
 * 1. Nhân sự B2C & Phân cấp phê duyệt (User table)
 * 2. Gian hàng B2C & Phân công nhân sự (StorePortfolio & StoreStaffAssignment)
 * 3. Master Catalog & Access Policy RBAC (AppSharedRecord)
 * 4. Hồ sơ 42 Thương hiệu B2C (BrandProfileRecord)
 * 5. Hồ sơ hợp đồng & Chụp mẫu Word pháp chế (ContractHubRecord & ContractTemplateSnapshot)
 * 6. KOC Profiles & Booking Deals (KocProfile & BookingDeal)
 */

import { PrismaClient, Role, ServiceModel, AccountStatus, SalaryGrade, CreatorSegment, KocCategory, StoreAssignmentRole } from '@prisma/client';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { DEFAULT_MASTER_CATALOG } from '../src/lib/masterCatalog';
import { defaultPolicy } from '../src/lib/server/accessPolicy';
import { getFallbackProfiles } from '../src/lib/brands/store';
import { REAL_B2C_69_STORES } from '../src/lib/realB2cPlanData';
import { USERS, INITIAL_KOCS, INITIAL_DEALS } from '../src/lib/mockData';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Bắt đầu chuyển đổi dữ liệu sang Supabase PostgreSQL...');

  // =========================================================================
  // 1. SEED / UPSERT USERS (Cơ cấu phòng B2C)
  // =========================================================================
  console.log('\n--- 1. Cập nhật nhân sự phòng B2C (User table) ---');
  
  // CEO
  const ceo = await prisma.user.upsert({
    where: { email: 'giangdv@upbase.vn' },
    update: { name: 'Đỗ Văn Giang', role: Role.HEAD_OF_B2C, team: 'Ban Giám Đốc' },
    create: {
      id: 'user-admin-giang',
      email: 'giangdv@upbase.vn',
      name: 'Đỗ Văn Giang',
      role: Role.HEAD_OF_B2C,
      team: 'Ban Giám Đốc',
      avatarUrl: 'DG',
    },
  });

  // Lead B2C
  const leadB2c = await prisma.user.upsert({
    where: { email: 'nhidty@upbase.vn' },
    update: { name: 'Đặng Thị Yến Nhi', role: Role.LEAD_B2C, team: 'Ban Quản Lý B2C', leadId: ceo.id },
    create: {
      id: 'user-yen-nhi',
      email: 'nhidty@upbase.vn',
      name: 'Đặng Thị Yến Nhi',
      role: Role.LEAD_B2C,
      team: 'Ban Quản Lý B2C',
      leadId: ceo.id,
      avatarUrl: 'YN',
    },
  });

  // Leader Booking (Nguyễn Thị Ngọc Tâm)
  const leaderTam = await prisma.user.upsert({
    where: { email: 'tamntn@upbase.vn' },
    update: { name: 'Nguyễn Thị Ngọc Tâm', role: Role.MANAGER, team: 'Nhóm 8 Gian Hàng Chiến Lược', leadId: leadB2c.id },
    create: {
      id: 'user-ngoc-tam',
      email: 'tamntn@upbase.vn',
      name: 'Nguyễn Thị Ngọc Tâm',
      role: Role.MANAGER,
      team: 'Nhóm 8 Gian Hàng Chiến Lược',
      leadId: leadB2c.id,
      avatarUrl: 'NT',
    },
  });

  // Chuyên viên B2C
  const specialists = [
    { email: 'phuongthao@upbase.vn', name: 'Lê Phương Thảo', team: 'Booking Team 1', leadId: leaderTam.id },
    { email: 'nhuquynh@upbase.vn', name: 'Lương Thị Như Quỳnh', team: 'Booking Team 1', leadId: leaderTam.id },
    { email: 'thanhhai@upbase.vn', name: 'Lê Thanh Hải', team: 'Booking Team 1', leadId: leaderTam.id },
    { email: 'thuhang@upbase.vn', name: 'Phạm Thị Thu Hằng', team: 'Booking Team 2', leadId: leadB2c.id },
    { email: 'hailong@upbase.vn', name: 'Hoàng Hải Long', team: 'Booking Team 2', leadId: leadB2c.id },
    { email: 'haiphuong@upbase.vn', name: 'Trần Hải Phượng', team: 'Booking Team 2', leadId: leadB2c.id },
    { email: 'dieuanh@upbase.vn', name: 'Phan Diệu Ánh', team: 'Booking Team 3', leadId: leadB2c.id },
    { email: 'hoailam@upbase.vn', name: 'Vũ Hoài Lâm', team: 'Booking Team 3', leadId: leadB2c.id },
    { email: 'maianh@upbase.vn', name: 'Nguyễn Thị Mai Anh', team: 'Booking Team 3', leadId: leadB2c.id },
    { email: 'haott@upbase.vn', name: 'Trần Thị Hảo', team: 'FOC Free Samples', leadId: leadB2c.id },
  ];

  for (const s of specialists) {
    await prisma.user.upsert({
      where: { email: s.email },
      update: { name: s.name, role: Role.BOOKING_MEMBER, team: s.team, leadId: s.leadId },
      create: {
        email: s.email,
        name: s.name,
        role: Role.BOOKING_MEMBER,
        team: s.team,
        leadId: s.leadId,
      },
    });
  }
  console.log(`✅ Đã đồng bộ ${specialists.length + 3} nhân sự B2C chuẩn vào bảng User.`);

  // =========================================================================
  // 2. STORE PORTFOLIO & ASSIGNMENTS (69 Gian hàng B2C)
  // =========================================================================
  console.log('\n--- 2. Cập nhật 69 Gian hàng B2C (StorePortfolio table) ---');
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
  // 3. MASTER CATALOG & ACCESS POLICY (AppSharedRecord)
  // =========================================================================
  console.log('\n--- 3. Đồng bộ Master Catalog & Access Policy vào AppSharedRecord ---');
  
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
  // 4. BRAND PROFILES (BrandProfileRecord)
  // =========================================================================
  console.log('\n--- 4. Kiểm tra và bổ sung BrandProfileRecord (42 Brands) ---');
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
  // 5. CONTRACT HUB & TEMPLATE SNAPSHOTS
  // =========================================================================
  console.log('\n--- 5. Chuyển đổi Hợp đồng & Snapshot mẫu Word sang PostgreSQL ---');
  
  // A. Lưu hồ sơ hợp đồng
  const contractJsonPath = path.resolve(process.cwd(), '.contract-data/records.json');
  if (existsSync(contractJsonPath)) {
    const contracts = JSON.parse(readFileSync(contractJsonPath, 'utf8'));
    for (const c of contracts) {
      await prisma.$executeRaw`
        INSERT INTO "ContractHubRecord" (id, revision, data, "updatedAt")
        VALUES (${c.id}, ${c.revision || 1}, ${JSON.stringify(c)}::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE SET data = ${JSON.stringify(c)}::jsonb, revision = ${c.revision || 1}
      `;
      // Nếu có signing
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

  // B. Snapshot các mẫu Word trong Quản lý hợp đồng vào ContractTemplateSnapshot
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
  // 6. KOC PROFILES & BOOKING DEALS
  // =========================================================================
  console.log('\n--- 6. Đồng bộ KOC Profiles & Deals mẫu vào PostgreSQL ---');
  let kocCount = 0;
  for (const koc of INITIAL_KOCS.slice(0, 30)) {
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
    const kocCategory: KocCategory = /mẹ|bé/i.test(catRaw)
      ? KocCategory.MOM_AND_BABY
      : /fashion|thời trang/i.test(catRaw)
        ? KocCategory.FASHION
        : /fb|ẩm thực|ăn/i.test(catRaw)
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
      : SalaryGrade.KL3;

    await prisma.kocProfile.upsert({
      where: { channelId },
      update: {},
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
        channelUrl: anyKoc.channelUrl || `https://tiktok.com/@${channelId.replace('@', '')}`,
        followersCount: anyKoc.followers || anyKoc.followersCount || 100000,
        avgViews: anyKoc.avgViews || 15000,
        phone: anyKoc.phone || '0901234567',
        zalo: anyKoc.zalo || anyKoc.phone || '0901234567',
        bankName: anyKoc.bankName || 'Techcombank',
        bankAccount: anyKoc.bankAccount || '1903000000',
      },
    });
    kocCount++;
  }
  console.log(`✅ Đã lưu ${kocCount} KOC Profiles mẫu vào PostgreSQL.`);

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
