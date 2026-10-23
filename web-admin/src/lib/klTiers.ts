// Nguồn duy nhất cho khung lương KOC theo bảng 5.6 Tệp cast của Lark Base (giá Net mỗi video).
export type KlCode = 'KL1' | 'KL2' | 'KL3' | 'KL4' | 'KL5' | 'KL6' | 'KL7';

export interface KlTier {
  code: KlCode;
  /** Nhãn hiển thị, có khoảng giá. */
  label: string;
  /** Giá thấp nhất của bậc (đồng). */
  min: number;
  /** Giá cao nhất của bậc; null = không giới hạn. */
  max: number | null;
  /** Giá cơ sở trung bình của bậc. */
  base: number;
}

export const KL_TIERS: KlTier[] = [
  { code: 'KL1', label: 'KL1 (0 - 500k)', min: 0, max: 500000, base: 250000 },
  { code: 'KL2', label: 'KL2 (500k - 1,5M)', min: 500000, max: 1499999, base: 1000000 },
  { code: 'KL3', label: 'KL3 (1,5M - 3M)', min: 1500000, max: 2999999, base: 2000000 },
  { code: 'KL4', label: 'KL4 (3M - 5M)', min: 3000000, max: 4999999, base: 4000000 },
  { code: 'KL5', label: 'KL5 (5M - 10M)', min: 5000000, max: 9999999, base: 7500000 },
  { code: 'KL6', label: 'KL6 (10M - 30M)', min: 10000000, max: 29999999, base: 18000000 },
  { code: 'KL7', label: 'KL7 (> 30M)', min: 30000000, max: null, base: 45000000 },
];

const BY_CODE = new Map<KlCode, KlTier>(KL_TIERS.map(t => [t.code, t]));

export const klTier = (code: KlCode): KlTier => BY_CODE.get(code)!;
export const klLabel = (code: KlCode): string => klTier(code).label;
export const klBaseCost = (code: KlCode): number => klTier(code).base;

/** Bậc KL theo giá net mỗi video (đồng). Giá 0 là suất FOC. */
export function klFromFee(fee: number): KlCode | 'TAP UpAffiliate' {
  if (!fee || fee <= 0) return 'TAP UpAffiliate';
  for (const t of KL_TIERS) {
    if (t.max === null || fee <= t.max) return t.code;
  }
  return 'KL7';
}
