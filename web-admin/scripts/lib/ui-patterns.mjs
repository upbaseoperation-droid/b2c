/**
 * Mẫu nhận dạng class giao diện cũ cho `ui-check.mjs`, tách riêng để dùng lại được (ví dụ cho luật ESLint
 * nếu sau này nối vào; hiện chỉ `ui:check` chặn, xem UI_SYNC_PLAN.md §6).
 * Mỗi `re` có cờ g; khi dùng lại nhiều lần phải đặt lastIndex = 0 hoặc tạo bản sao.
 */

export const FAMILIES = 'slate|gray|zinc|neutral|stone|blue|indigo|violet|purple|fuchsia|sky|cyan|pink|emerald|green|teal|lime|amber|yellow|orange|red|rose';
export const BOUND = '(?<=^|[\\s"\'`{(])';

export const CLASS_RULES = {
  'mau-cu': {
    desc: 'Màu Tailwind cũ (slate, blue, emerald…), dùng token ngữ nghĩa',
    re: new RegExp(`${BOUND}(?:[a-z0-9\\[\\]_-]+:)*(?:text|bg|border(?:-[trblxy])?|divide|ring|fill|stroke|placeholder|from|via|to|shadow)-(?:${FAMILIES})-\\d{2,3}(?:\\/\\d+)?(?![\\w-])`, 'g'),
  },
  'chu-nho': {
    desc: 'Chữ dưới 12px (text-3xs, text-[Npx])',
    re: new RegExp(`${BOUND}(?:[a-z0-9\\[\\]_-]+:)*text-(?:3xs|\\[\\d+(?:\\.\\d+)?px\\])(?![\\w-])`, 'g'),
  },
  'viet-hoa-gian-chu': {
    desc: 'uppercase, tracking-wide*',
    re: new RegExp(`${BOUND}(?:[a-z0-9\\[\\]_-]+:)*(?:uppercase|tracking-(?:wide|wider|widest))(?![\\w-])`, 'g'),
  },
  'khoang-cach-nua-bac': {
    desc: 'Khoảng cách nửa bậc (gap-1.5, p-2.5…), dùng bội số 4px',
    re: new RegExp(`${BOUND}(?:[a-z0-9\\[\\]_-]+:)*-?(?:px|py|pt|pb|pl|pr|ps|pe|p|mx|my|mt|mb|ml|mr|ms|me|m|gap-x|gap-y|gap|space-x|space-y)-(?:1\\.5|2\\.5|3\\.5)(?![\\d.])`, 'g'),
  },
  'font-mono': {
    desc: 'font-mono (chỉ cho mã, dùng font-code)',
    re: new RegExp(`${BOUND}(?:[a-z0-9\\[\\]_-]+:)*font-mono(?![\\w-])`, 'g'),
  },
};

/** Icon 12px: chỉ tính trên thành phần viết hoa (icon lucide), không tính chấm trang trí trên <span>/<div>. */
export const ICON_12_RE = /(?<![\w.:-])(?:w-3 h-3|h-3 w-3)(?![\d.\w-])/g;
