import prisma from '../src/lib/prisma';
import { readMasterCatalog } from '../src/lib/server/masterCatalogStore';
import { readPolicy } from '../src/lib/server/accessPolicy';
import { listProfiles } from '../src/lib/brands/store';
import { listContracts } from '../src/lib/contracts/store';
import { REAL_B2C_69_STORES } from '../src/lib/realB2cPlanData';
import { INITIAL_KOCS } from '../src/lib/mockData';
import { OFFICIAL_TEMPLATES_SNAPSHOT } from '../src/lib/contracts/templateSnapshots';

async function main() {
  const cat = await readMasterCatalog();
  const policy = await readPolicy();
  const profs = await listProfiles();
  const contracts = await listContracts();

  let stores = REAL_B2C_69_STORES.length;
  let monthlyPlans = 0;
  let snapshots = Object.keys(OFFICIAL_TEMPLATES_SNAPSHOT).length;
  let kocs = INITIAL_KOCS.length;
  let dbMode = 'FALLBACK (Standalone)';

  if (process.env.DATABASE_URL) {
    try {
      stores = await prisma.storePortfolio.count();
      monthlyPlans = await prisma.monthlyPlan.count();
      snapshots = await prisma.contractTemplateSnapshot.count();
      kocs = await prisma.kocProfile.count();
      dbMode = 'POSTGRESQL (Connected)';
    } catch (err) {
      console.warn('[verify-db] Không kết nối được PostgreSQL, sử dụng số liệu Fallback:', (err as Error).message);
    }
  }

  console.log('\n============================================================');
  console.log(`📊 ĐỐI SOÁT TRẠNG THÁI CƠ SỞ DỮ LIỆU (${dbMode})`);
  console.log('============================================================');
  console.log(`👤 Nhân sự & Phân quyền (access-policy): ${policy.data.internalStaff.length} tài khoản`);
  console.log(`🏬 Stores (StorePortfolio 69 gian hàng): ${stores} gian hàng`);
  console.log(`📁 Master Catalog Brands/Stores: ${cat.data.brands.length} brands / ${cat.data.stores.length} stores (Revision: ${cat.revision})`);
  console.log(`🏢 Brand Profiles (Hồ sơ thương hiệu): ${profs.length} hồ sơ`);
  console.log(`📑 Contracts (Hợp đồng đã tạo/ký): ${contracts.length} hợp đồng`);
  console.log(`📄 Contract Templates Snapshot (Mẫu Word gốc): ${snapshots} mẫu pháp chế`);
  console.log(`📅 Monthly Plans (Kế hoạch tháng B2C): ${monthlyPlans} kế hoạch`);
  console.log(`🌟 KOC Profiles (Hồ sơ Creator): ${kocs} creators`);
  console.log('============================================================\n');
}

main()
  .catch(console.error)
  .finally(async () => {
    if (process.env.DATABASE_URL) {
      await prisma.$disconnect().catch(() => {});
    }
  });
