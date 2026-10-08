/**
 * Định dạng số liệu thống nhất — xem DESIGN_SYSTEM.md, mục Số liệu.
 * Bảng: số đầy đủ, dấu chấm ngăn nghìn. Tóm tắt: "tr", "tỷ", dấu phẩy thập phân.
 */

const nf = (digits: number) =>
  new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: digits });

/** 10.000.000 */
export const formatNumber = (n: number) => nf(0).format(Math.round(n || 0));

/** 10.000.000 đ */
export const formatVnd = (n: number) => `${formatNumber(n)} đ`;

/** 280 tr · 1,75 tỷ · 950.000 đ */
export function formatVndShort(n: number): string {
  const v = n || 0;
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${nf(2).format(v / 1e9)} tỷ`;
  if (abs >= 1e6) return `${nf(abs >= 1e8 ? 0 : 1).format(v / 1e6)} tr`;
  return formatVnd(v);
}

/** 76,5% */
export const formatPercent = (ratio: number, digits = 1) => `${nf(digits).format((ratio || 0) * 100)}%`;

/** 08/10/2026 */
export const formatDate = (d: Date | string) =>
  new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d));
