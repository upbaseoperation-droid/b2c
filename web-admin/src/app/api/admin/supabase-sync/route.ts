import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requestActor } from '@/lib/server/requestActor';
import { USERS } from '@/lib/mockData';
import { getStorageModeLabel, isPostgresStorageEnabled } from '@/lib/server/dbStorageMode';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };

async function resolveAdminActor(req: NextRequest) {
  const actor = await requestActor(req).catch(() => null);
  if (actor) return actor;
  if (process.env.NODE_ENV !== 'production') {
    return USERS[0];
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const actor = await resolveAdminActor(req);
    if (!actor) {
      return NextResponse.json({ error: 'Phiên đăng nhập không hợp lệ.' }, { status: 401, headers: noStore });
    }
    if (!['ADMIN', 'MANAGER'].includes(actor.role)) {
      return NextResponse.json({ error: 'Không có quyền truy cập cấu hình hệ thống.' }, { status: 403, headers: noStore });
    }

    const enabled = isPostgresStorageEnabled();
    if (!enabled) {
      return NextResponse.json(
        {
          connected: false,
          storageMode: getStorageModeLabel(),
          counts: {},
        },
        { headers: noStore }
      );
    }

    await prisma.$queryRaw`SELECT 1`;

    const [
      sharedRecords,
      monthlyPlans,
      larkbasePlans,
      stores,
      kocs,
      contracts,
      brands,
    ] = await Promise.all([
      prisma.appSharedRecord.count().catch(() => 0),
      prisma.monthlyPlan.count().catch(() => 0),
      prisma.larkbaseBookingPlanRecord.count().catch(() => 0),
      prisma.storePortfolio.count().catch(() => 0),
      prisma.kocProfile.count().catch(() => 0),
      prisma.contractHubRecord.count().catch(() => 0),
      prisma.brandProfileRecord.count().catch(() => 0),
    ]);

    return NextResponse.json(
      {
        connected: true,
        storageMode: getStorageModeLabel(),
        counts: {
          AppSharedRecord: sharedRecords,
          MonthlyPlan: monthlyPlans,
          LarkbaseBookingPlanRecord: larkbasePlans,
          StorePortfolio: stores,
          KocProfile: kocs,
          ContractHubRecord: contracts,
          BrandProfileRecord: brands,
        },
      },
      { headers: noStore }
    );
  } catch (err) {
    return NextResponse.json(
      {
        connected: false,
        storageMode: getStorageModeLabel(),
        error: err instanceof Error ? err.message : 'Không thể kiểm tra trạng thái kết nối Supabase.',
      },
      { status: 500, headers: noStore }
    );
  }
}
