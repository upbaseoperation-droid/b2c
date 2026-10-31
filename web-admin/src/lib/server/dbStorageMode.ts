/**
 * Kiểm tra tập trung trạng thái kết nối Supabase PostgreSQL cho toàn bộ tầng Server.
 * Mặc định: Ngay khi có `DATABASE_URL` hợp lệ (và không bị ép `STORAGE_MODE="local"`),
 * toàn bộ kho dữ liệu (AppSharedRecord, MonthlyPlan, ContractHubRecord, BrandProfileRecord)
 * đều đọc/ghi trực tiếp trên Supabase PostgreSQL, kèm cơ chế tự động fallback về ổ cứng
 * (.shared-data / .contract-data / .brand-data) nếu mạng gián đoạn (Zero-Crash Standalone).
 */
export function isPostgresStorageEnabled(overrideEnvVar?: string): boolean {
  const globalMode = (process.env.STORAGE_MODE || '').trim().toLowerCase();
  if (globalMode === 'local') return false;

  if (overrideEnvVar) {
    const specificVal = (process.env[overrideEnvVar] || '').trim().toLowerCase();
    if (specificVal === 'local') return false;
    if (specificVal === 'postgres') {
      return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
    }
  }

  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
}

export function getStorageModeLabel(overrideEnvVar?: string): 'POSTGRES' | 'LOCAL_FALLBACK' {
  return isPostgresStorageEnabled(overrideEnvVar) ? 'POSTGRES' : 'LOCAL_FALLBACK';
}
