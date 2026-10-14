import prisma from '../src/lib/prisma';
import { readMasterCatalog } from '../src/lib/server/masterCatalogStore';
import { listProfiles } from '../src/lib/brands/store';
import { listContracts } from '../src/lib/contracts/store';

async function main() {
  const cat = await readMasterCatalog();
  const profs = await listProfiles();
  const contracts = await listContracts();
  const users = await prisma.user.findMany({ select: { name: true, role: true } });
  const stores = await prisma.storePortfolio.count();
  const monthlyPlans = await prisma.monthlyPlan.count();
  const snapshots = await prisma.contractTemplateSnapshot.count();
  const kocs = await prisma.kocProfile.count();

  console.log('\n============================================================');
  console.log('📊 ĐỐI SOÁT TRẠNG THÁI CƠ SỞ DỮ LIỆU THỰC TẾ (SUPABASE POSTGRESQL)');
  console.log('============================================================');
  console.log(`👤 Users (Nhân sự & Lãnh đạo B2C): ${users.length} tài khoản`);
  console.log(`🏬 Stores (StorePortfolio 69 gian hàng): ${stores} gian hàng`);
  console.log(`📁 Master Catalog Brands/Stores: ${cat.data.brands.length} brands / ${cat.data.stores.length} stores (Revision: ${cat.revision})`);
  console.log(`🏢 Brand Profiles (Hồ sơ thương hiệu): ${profs.length} hồ sơ`);
  console.log(`📑 Contracts (Hợp đồng đã tạo/ký): ${contracts.length} hợp đồng`);
  console.log(`📄 Contract Templates Snapshot (Mẫu Word gốc): ${snapshots}/8 mẫu pháp chế`);
  console.log(`📅 Monthly Plans (Kế hoạch tháng B2C): ${monthlyPlans} kế hoạch`);
  console.log(`🌟 KOC Profiles (Hồ sơ Creator): ${kocs} creators`);
  console.log('============================================================\n');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
