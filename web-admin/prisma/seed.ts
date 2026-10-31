import { runFullSupabaseSync } from '../scripts/supabase-sync-all';

async function main() {
  console.log('🌱 Bắt đầu đồng bộ dữ liệu hạt nhân Upbase B2C lên Supabase PostgreSQL...');
  const summary = await runFullSupabaseSync();
  console.log('✅ Đồng bộ hoàn tất:', JSON.stringify(summary.synced, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
