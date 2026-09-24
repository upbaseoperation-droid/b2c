import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Upbase B2C Database Seed...');

  // 1. Seed Users
  const userManager = await prisma.user.upsert({
    where: { email: 'vanngoc@upbase.vn' },
    update: {},
    create: {
      email: 'vanngoc@upbase.vn',
      name: 'Vân Ngọc',
      role: 'MANAGER',
    },
  });

  const userBooking = await prisma.user.upsert({
    where: { email: 'khanhvy@upbase.vn' },
    update: {},
    create: {
      email: 'khanhvy@upbase.vn',
      name: 'Khánh Vy',
      role: 'BOOKING_MEMBER',
    },
  });

  const userContent = await prisma.user.upsert({
    where: { email: 'quynhnhu@upbase.vn' },
    update: {},
    create: {
      email: 'quynhnhu@upbase.vn',
      name: 'Quỳnh Như',
      role: 'CONTENT_MEMBER',
    },
  });

  console.log('✅ Users seeded: Vân Ngọc, Khánh Vy, Quỳnh Như');

  // 2. Seed Campaign
  const campaign = await prisma.campaign.upsert({
    where: { code: 'CAMP-1010' },
    update: {},
    create: {
      code: 'CAMP-1010',
      name: 'Chiến Dịch Mega Sale 10.10 — Kháng Nắng Đa Tầng',
      brandName: 'UpBeauty E2E-T',
      bigIdea: 'Lá Chắn Đa Tầng — Bảo Vệ Toàn Diện Cả Ngày Dài',
      budgetTotal: 250000000,
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-10-15'),
    },
  });

  console.log('✅ Campaign seeded: Mega Sale 10.10');

  // 3. Seed Sample KOCs
  const sampleKocs = [
    {
      channelId: '@megauriviu',
      stageName: 'Mega Uri Review',
      realName: 'Phạm Ngọc Hiếu An',
      tier: 'TIER_2_MACRO' as const,
      channelUrl: 'https://www.tiktok.com/@megauriviu',
      followersCount: 680000,
      avgViews: 95000,
      niche: 'Mỹ phẩm & Review Da Liễu',
      rateCardVideo: 15000000,
      phone: '0399675534',
      bankName: 'Techcombank',
      bankAccount: '1903456789012',
    },
    {
      channelId: '@chanhbeauty',
      stageName: 'Chanh Beauty Review',
      realName: 'Lê Thị Bích Chanh',
      tier: 'TIER_3_MICRO' as const,
      channelUrl: 'https://www.tiktok.com/@chanhbeauty',
      followersCount: 320000,
      avgViews: 48000,
      niche: 'Skincare HSSV & Trị Mụn',
      rateCardVideo: 10000000,
      phone: '0987654321',
      bankName: 'MB Bank',
      bankAccount: '0987654321999',
    },
  ];

  for (const koc of sampleKocs) {
    await prisma.kocProfile.upsert({
      where: { channelId: koc.channelId },
      update: {},
      create: koc,
    });
  }

  console.log('✅ KOCs seeded successfully into Supabase PostgreSQL');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
