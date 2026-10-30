import { KocItem } from './types';
import { REAL_FLAGSHIP_KOCS } from './realKocMasterData';
import { REAL_POTENTIAL_NEW_KOCS } from './realPotentialKocData';

// Danh bạ KOC / KOL chuẩn hóa từ Danh_Ba_Chuan_Hoa_Master_KOC_KOL_B2C_2026.xlsx & File 3.4 / 3.2 (RULE-DATA-01: Zero fabricated demo KOCs)
export const UPBASE_FULL_KOC_MASTER: KocItem[] = [
  // --- 4.800 KOC CHỦ LỰC CHUẨN HÓA TỪ DANH BẠ MASTER KOC B2C 2026 & FILE 3.4 / 3.2 ---
  ...REAL_FLAGSHIP_KOCS,

  // --- KOC MỚI / TIỀM NĂNG CHƯA HỢP TÁC (BẢNG 2 - SHEET KOC_Tiem_Nang ERD) ---
  ...REAL_POTENTIAL_NEW_KOCS,
];
