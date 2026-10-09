/**
 * Tiện ích xử lý và làm sạch URL an toàn
 * Ngăn chặn lỗi Open Redirect (protocol-relative //, schemes, path tricks)
 */
export function sanitizeReturnTo(url: string | null | undefined): string {
  if (!url) return '/';
  const trimmed = url.trim();
  // Chỉ chấp nhận đường dẫn bắt đầu bằng đúng 1 dấu '/' và tiếp theo là chữ cái, số, gạch ngang, query string
  // Từ chối '//' (protocol-relative), '/\' (Windows backslash), hoặc absolute URL schemes
  if (/^\/[a-zA-Z0-9_\-?&=%.]/.test(trimmed) && !trimmed.startsWith('//') && !trimmed.startsWith('/\\')) {
    return trimmed;
  }
  if (trimmed === '/') return '/';
  return '/';
}
