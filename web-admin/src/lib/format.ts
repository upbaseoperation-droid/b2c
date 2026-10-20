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

export const formatMoney = formatVndShort;

/** 76,5% */
export const formatPercent = (ratio: number, digits = 1) => `${nf(digits).format((ratio || 0) * 100)}%`;

/** 08/10/2026 */
export const formatDate = (d: Date | string) =>
  new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(d));

/**
 * Định dạng thời gian chuẩn múi giờ Việt Nam (GMT+7): "16:25:41 · 20/10/2026"
 * Xử lý chính xác cả chuỗi ISO UTC (đuôi Z) lẫn chuỗi thời gian nội bộ.
 */
export function formatDateTimeVn(d?: Date | string | number): string {
  if (!d) return '—';
  if (typeof d === 'string') {
    const trimmed = d.trim();
    if (!trimmed) return '—';
    // Nếu chuỗi đã ở định dạng "HH:mm:ss · DD/MM/YYYY" hoặc "DD/MM/YYYY HH:mm:ss" thì giữ nguyên
    if (/^\d{2}:\d{2}(:\d{2})?\s*[·-]\s*\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      return trimmed;
    }
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      return trimmed;
    }
    d = parsed;
  } else if (typeof d === 'number') {
    d = new Date(d);
  }

  if (Number.isNaN(d.getTime())) return '—';

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d);

  const get = (type: string) => parts.find(p => p.type === type)?.value || '00';
  return `${get('hour')}:${get('minute')}:${get('second')} · ${get('day')}/${get('month')}/${get('year')}`;
}

/**
 * Chuỗi ngày YYYY-MM-DD theo đúng múi giờ Việt Nam (Asia/Ho_Chi_Minh, GMT+7),
 * khắc phục lỗi lệch lùi 1 ngày khi gọi toISOString().slice(0, 10) vào sáng sớm (00:00 - 06:59).
 */
export function getVietnamDateYmd(d: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '01';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/**
 * Chuỗi ngày giờ rút gọn "YYYY-MM-DD HH:mm" theo đúng múi giờ Việt Nam (GMT+7),
 * thay thế cho new Date().toISOString().slice(0, 16).replace('T', ' ') bị lệch -7 tiếng.
 */
export function getVietnamDateTimeShort(d: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
}

/**
 * Chuỗi ISO 8601 có gắn múi giờ Việt Nam "+07:00" (VD: "2026-10-20T16:25:41+07:00")
 * thay vì trả về giờ UTC gốc đuôi "Z" bị lùi 7 tiếng.
 */
export function getVietnamIsoString(d: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}+07:00`;
}

