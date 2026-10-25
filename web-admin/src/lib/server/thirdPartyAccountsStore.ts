import { INITIAL_THIRD_PARTY_ACCOUNTS } from '@/lib/thirdPartyAccessData';
import type { ThirdPartyAccessAccount } from '@/lib/types';
import { readRecord, upsertRecord } from './sharedRecords';

export const THIRD_PARTY_ACCOUNTS_KEY = 'third-party-accounts-v1';

/**
 * Đọc danh sách tài khoản đối tác bên thứ ba từ cơ sở dữ liệu (AppSharedRecord)
 * Nếu chưa từng lưu trên DB (revision === 0), trả về INITIAL_THIRD_PARTY_ACCOUNTS mặc định.
 * Khi đã lưu trên DB (revision > 0), tôn trọng dữ liệu DB (bao gồm cả chỉnh sửa và xóa tài khoản).
 */
export async function getThirdPartyAccountsFromDb(): Promise<ThirdPartyAccessAccount[]> {
  const rec = await readRecord<ThirdPartyAccessAccount[]>(
    THIRD_PARTY_ACCOUNTS_KEY,
    INITIAL_THIRD_PARTY_ACCOUNTS
  );

  if (rec.revision === 0 || !Array.isArray(rec.data)) {
    return INITIAL_THIRD_PARTY_ACCOUNTS;
  }

  return rec.data;
}

/**
 * Lưu danh sách tài khoản đối tác bên thứ ba vào cơ sở dữ liệu
 */
export async function saveThirdPartyAccountsToDb(
  accounts: ThirdPartyAccessAccount[]
): Promise<ThirdPartyAccessAccount[]> {
  const saved = await upsertRecord<ThirdPartyAccessAccount[]>(
    THIRD_PARTY_ACCOUNTS_KEY,
    INITIAL_THIRD_PARTY_ACCOUNTS,
    () => accounts
  );
  return saved.data;
}
